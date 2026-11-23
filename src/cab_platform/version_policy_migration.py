"""Aperçu, admission et réconciliation de l’adaptation locale."""

import base64
import hashlib
import json
import re

from django.db import transaction

from . import version_policy_git as git
from .core.commands import Refused, require
from .core.models import Project, Run, VersionPolicyMigration
from .forge_settings import file_operation
from .preexisting_git import git_guard
from .project_metadata import synchronize, version_configuration
from .versioning import VersionError, VersionTagCollision, convert_version, local_tag_conversions, parse_policy


def _sha(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def _id(plan: dict) -> str:
    return _sha(json.dumps(plan, sort_keys=True, ensure_ascii=True).encode('ascii'))


def _source(project):
    env = file_operation(project, {'op': 'env-read'})
    return base64.b64decode(env['content'], validate=True), env['digest']


def _render(raw: bytes, policy: int, version: str | None) -> bytes:
    policy_line = re.compile(rb'^([ \t]*PROJECT_VERSION_POLICY[ \t]*=[ \t]*)(["\']?)[1-7]\2([ \t]*(?:[ \t]\#.*)?)$')
    version_line = re.compile(rb'^([ \t]*PROJECT_VERSION[ \t]*=[ \t]*)(["\']?)[vV]?[0-9.]+\2([ \t]*(?:[ \t]\#.*)?)$')
    parts = []
    counts = [0, 0]
    for item in raw.splitlines(keepends=True):
        line = item.rstrip(b'\r\n')
        tail = item[len(line):]
        for index, (pattern, replacement) in enumerate(((policy_line, str(policy)), (version_line, version))):
            match = pattern.fullmatch(line) if replacement is not None else None
            if match:
                counts[index] += 1
                prefix, quote, rest = match.groups()
                item = prefix + quote + replacement.encode('ascii') + quote + rest + tail
                break
        parts.append(item)
    require(counts == [1, int(version is not None)], 'version-policy-config-uneditable', 409)
    return b''.join(parts)


def _plan(project, policy: int, side: str) -> dict:
    raw, digest = _source(project)
    try:
        values = version_configuration(raw)
        previous = parse_policy(values.get('PROJECT_VERSION_POLICY'))
        require(previous != policy, 'version-policy-unchanged', 409)
        version = values.get('PROJECT_VERSION') or None
        converted = convert_version(version.lstrip('vV'), previous, policy, side) if version else None
        tags = git.snapshot(project)
        moves, proposed = local_tag_conversions(tags or {}, previous, policy, side)
        after = _render(raw, policy, converted)
    except VersionTagCollision:
        raise
    except (VersionError, UnicodeError) as error:
        raise Refused(str(error) if isinstance(error, VersionError) else 'version-policy-config-uneditable', 409) from error
    return {'project_id': project.pk, 'root': project.root, 'side': side,
            'old_policy': previous, 'new_policy': policy, 'old_version': version,
            'new_version': converted, 'before_file': digest, 'after_file': _sha(after),
            'before_tags': tags, 'after_tags': proposed if tags is not None else None,
            'moves': moves}


def _public(plan: dict, preview_id: str, state: str) -> dict:
    return {key: plan[key] for key in ('old_policy', 'new_policy', 'old_version', 'new_version', 'side', 'moves')} | {
        'preview_id': preview_id, 'state': state,
        'local_repository': plan['before_tags'] is not None,
        'unchanged_tags': len(plan['before_tags'] or {}) - len(plan['moves']),
    }


def preview(project_id: str, policy: int, side: str) -> dict:
    require(type(policy) is int and 1 <= policy <= 7 and side in ('left', 'right'),
            'version-policy-input-invalid', 400)
    with git_guard(), transaction.atomic():
        project = Project.objects.select_for_update().get(pk=project_id)
        pending = VersionPolicyMigration.objects.filter(project=project,state='PENDING').first()
        if pending:
            require(pending.plan['new_policy'] == policy and pending.plan['side'] == side,
                    'version-policy-migration-pending', 409)
            return _public(pending.plan,pending.preview_id,pending.state)
        try:plan = _plan(project, policy, side)
        except VersionTagCollision as error:
            return {'state':'CONFLICT','reason':str(error),'tags':list(error.names)}
        return _public(plan, _id(plan), 'PREVIEW')


def apply(project_id: str, policy: int, side: str, preview_id: str) -> dict:
    require(type(policy) is int and 1 <= policy <= 7 and side in ('left', 'right')
            and bool(re.fullmatch('[0-9a-f]{64}', preview_id)), 'version-policy-input-invalid', 400)
    require(not transaction.get_connection().in_atomic_block, 'version-policy-transaction-invalid', 409)
    from .core.run_replacement import TERMINAL
    with git_guard():
        with transaction.atomic():
            project = Project.objects.select_for_update().get(pk=project_id)
            receipt = VersionPolicyMigration.objects.filter(project=project, preview_id=preview_id).first()
            if receipt is not None:
                plan = receipt.plan
                require(plan['new_policy'] == policy and plan['side'] == side,
                        'version-policy-preview-stale', 409)
                if receipt.state == 'COMPLETED':
                    return _public(plan, preview_id, receipt.state)
            else:
                require(not VersionPolicyMigration.objects.filter(project=project,state='PENDING').exists(),
                        'version-policy-migration-pending', 409)
                try:plan = _plan(project, policy, side)
                except VersionTagCollision as error:
                    raise Refused(str(error),409) from error
                require(_id(plan) == preview_id, 'version-policy-preview-stale', 409)
            require(not Run.objects.filter(project=project).exclude(state__in=TERMINAL).exists(),
                    'version-policy-project-busy', 409)
            if receipt is None:
                VersionPolicyMigration.objects.create(project=project,preview_id=preview_id,plan=plan)

        with transaction.atomic():
            project = Project.objects.select_for_update().get(pk=project_id)
            require(project.root == plan['root'], 'version-policy-migration-divergent', 409)
            require(not Run.objects.filter(project=project).exclude(state__in=TERMINAL).exists(),
                    'version-policy-project-busy', 409)
            raw, digest = _source(project)
            tags = git.snapshot(project)
            before_file, after_file = plan['before_file'], plan['after_file']
            before_tags, after_tags = plan['before_tags'], plan['after_tags']
            require(digest in (before_file,after_file) and tags in (before_tags,after_tags)
                    and (digest != after_file or tags == after_tags),
                    'version-policy-migration-divergent', 409)
            if digest == before_file:
                target = _render(raw, policy, plan['new_version'])
                require(_sha(target) == after_file, 'version-policy-migration-divergent', 409)
                if tags != after_tags:
                    git.apply(project, before_tags, after_tags)
                file_operation(project, {'op': 'env-write', 'digest': before_file,
                                         'content': base64.b64encode(target).decode('ascii')})
            require(_source(project)[1] == after_file and git.snapshot(project) == after_tags,
                    'version-policy-migration-divergent', 409)
            projected = synchronize(project.pk,include_forges=False,include_git=False)
            require(projected.get('values',{}).get('PROJECT_VERSION_POLICY') == str(policy),
                    'version-policy-projection-unconfirmed', 409)
            receipt = VersionPolicyMigration.objects.get(project=project, preview_id=preview_id)
            receipt.state = 'COMPLETED'
            receipt.save(update_fields=['state','updated_at'])
            return _public(plan, preview_id, receipt.state)
