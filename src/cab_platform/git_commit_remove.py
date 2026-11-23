"""Retrait protégé du dernier commit local d'un projet."""
import ast
import hashlib
import os
import pwd
import re
import subprocess
from django.db import connection
from .core.commands import Refused, require
from .core.models import Project
from .project_git import probe, _refresh_status

OID = re.compile(r'(?:[0-9a-f]{40}|[0-9a-f]{64})\Z')


def context(project):
    require(project.creation_state == 'READY' and probe(project) == 1, 'git-commit-remove-unavailable', 409)
    try:
        user = pwd.getpwuid(project.owner_uid)
        group = project.owner_gid if project.owner_gid is not None else user.pw_gid
        require(os.geteuid() in (0, project.owner_uid), 'git-commit-remove-unavailable', 409)
        options = {'user': project.owner_uid, 'group': group, 'extra_groups': os.getgrouplist(user.pw_name, group)} if os.geteuid() == 0 else {}
        env = {'PATH': '/usr/bin:/bin', 'HOME': user.pw_dir, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_OPTIONAL_LOCKS': '0', 'GIT_NO_LAZY_FETCH': '1', 'LANG': 'C', 'LC_ALL': 'C'}
        return options, env
    except (OSError, KeyError):
        raise Refused('git-commit-remove-unavailable', 409) from None


def run(project, options, env, *args):
    try:
        return subprocess.run(['/usr/bin/git', '-C', project.root, '-c', 'core.fsmonitor=false', *args], cwd='/', env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=30, **options)
    except (OSError, subprocess.TimeoutExpired):
        raise Refused('git-commit-remove-uncertain', 409) from None


def inspect(project):
    options, env = context(project)
    for marker in ('MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'REBASE_HEAD'):
        operation = run(project, options, env, 'rev-parse', '--verify', '--quiet', marker)
        require(operation.returncode == 1, 'git-commit-remove-operation-active', 409)
    branch = run(project, options, env, 'symbolic-ref', '--quiet', '--short', 'HEAD')
    require(branch.returncode == 0 and branch.stdout.strip(), 'git-commit-remove-unavailable', 409)
    history = run(project, options, env, 'rev-list', '--parents', '-n', '1', 'HEAD')
    fields = history.stdout.decode('ascii', 'strict').split()
    require(history.returncode == 0 and fields and all(OID.fullmatch(value) for value in fields), 'git-commit-remove-unavailable', 409)
    status = run(project, options, env, 'status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignore-submodules=none')
    require(status.returncode == 0, 'git-commit-remove-unavailable', 409)
    tags = run(project, options, env, 'tag', '--points-at', fields[0])
    require(tags.returncode == 0, 'git-commit-remove-unavailable', 409)
    return {'head': fields[0], 'parent': fields[1] if len(fields)>1 else None, 'merge': len(fields)>2, 'branch': branch.stdout.decode('utf-8', 'replace').strip(), 'dirty': bool(status.stdout), 'tags': bool(tags.stdout.strip())}


def restoration_plan(project, expected_head, expected_parent, expected_branch):
    latest = inspect(project)
    require(latest['head'] == expected_head and latest['parent'] == expected_parent and latest['branch'] == expected_branch, 'git-commit-remove-changed', 409)
    options, env = context(project)
    status = run(project, options, env, 'status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignore-submodules=none')
    diff = run(project, options, env, 'diff', '--name-status', '-z', '--no-renames', '--ignore-submodules=none', expected_parent, '--')
    clean = run(project, options, env, '-c', 'core.quotePath=false', 'clean', '-nd')
    others = run(project, options, env, 'ls-files', '--others', '--exclude-standard', '-z')
    require(all(item.returncode == 0 and len(item.stdout) <= 4194304 for item in (status, diff, clean, others)), 'git-commit-remove-preview-unavailable', 409)
    raw = diff.stdout.split(b'\0')
    if raw and raw[-1] == b'':raw.pop()
    require(len(raw) % 2 == 0 and len(raw) // 2 <= 10000, 'git-commit-remove-preview-unavailable', 409)
    files = []
    for index in range(0, len(raw), 2):
        code = raw[index].decode('ascii', 'replace')
        name = raw[index + 1].decode('utf-8', 'replace')
        require(code and name, 'git-commit-remove-preview-unavailable', 409)
        action = 'Supprimé' if code[0] == 'A' else 'Restauré'
        files.append({'path': name, 'action': action})
    candidates = [item for item in others.stdout.split(b'\0') if item]
    untracked = []
    for line in clean.stdout.splitlines():
        if line.startswith(b'Would skip repository '):
            continue
        require(line.startswith(b'Would remove '), 'git-commit-remove-preview-unavailable', 409)
        path = line[len(b'Would remove '):]
        if path.startswith(b'"'):
            try:
                quoted = ''.join(chr(c) if c < 128 else f'\\{c:03o}' for c in path)
                path = ast.literal_eval('b' + quoted)
            except (SyntaxError, ValueError):
                raise Refused('git-commit-remove-preview-unavailable', 409) from None
        matching = [item for item in candidates if item == path or (path.endswith(b'/') and item.startswith(path))]
        # Git represents nested repositories as directories; refuse an ambiguous preview.
        require(not any(item.endswith(b'/') for item in matching), 'git-commit-remove-preview-unavailable', 409)
        untracked.extend(matching or [path])
    require(len(untracked) <= 10000, 'git-commit-remove-preview-unavailable', 409)
    untracked = [item.decode('utf-8', 'replace') for item in sorted(set(untracked))]
    digest = hashlib.sha256(status.stdout + b'\0' + diff.stdout + b'\0' + clean.stdout + b'\0' + others.stdout).hexdigest()
    return {'files': files, 'untracked': untracked, 'status_digest': digest}


def remove(project_id, expected_head, expected_parent, expected_branch, mode, expected_status=''):
    require(mode in ('keep', 'discard') and isinstance(expected_head, str) and isinstance(expected_parent, str) and isinstance(expected_branch, str) and expected_branch and len(expected_branch) <= 255 and OID.fullmatch(expected_head) and OID.fullmatch(expected_parent), 'git-commit-remove-invalid', 400)
    project = Project.objects.get(pk=project_id)
    options, env = context(project)
    with connection.cursor() as cursor:
        cursor.execute('SELECT pg_advisory_lock(%s, %s)', [7348501, 7348502])
    moved = False
    try:
        latest = inspect(project)
        require(latest['head'] == expected_head and latest['parent'] == expected_parent and latest['branch'] == expected_branch, 'git-commit-remove-changed', 409)
        if mode == 'discard':
            require(isinstance(expected_status, str) and re.fullmatch(r'[0-9a-f]{64}', expected_status) is not None, 'git-commit-remove-preview-changed', 409)
            plan = restoration_plan(project, expected_head, expected_parent, expected_branch)
            require(plan['status_digest'] == expected_status, 'git-commit-remove-preview-changed', 409)
        changed = run(project, options, env, 'update-ref', '-m', 'CAB: retrait du dernier commit', 'refs/heads/' + expected_branch, expected_parent, expected_head)
        require(changed.returncode == 0, 'git-commit-remove-changed', 409)
        moved = True
        if mode == 'discard':
            branch = run(project, options, env, 'symbolic-ref', '--quiet', '--short', 'HEAD')
            require(branch.returncode == 0 and branch.stdout.decode('utf-8', 'replace').strip() == expected_branch, 'git-commit-remove-partial', 409)
            cleaned = run(project, options, env, 'clean', '-fd')
            require(cleaned.returncode == 0, 'git-commit-remove-partial', 409)
            restored = run(project, options, env, 'read-tree', '--reset', '-u', expected_parent)
            require(restored.returncode == 0, 'git-commit-remove-partial', 409)
        _refresh_status(project_id)
        return {'removed': True}
    except Refused as error:
        if moved:
            try:_refresh_status(project_id)
            except Exception:pass
            if error.code != 'git-commit-remove-partial':
                raise Refused('git-commit-remove-partial', 409) from None
        raise
    finally:
        with connection.cursor() as cursor:
            cursor.execute('SELECT pg_advisory_unlock(%s, %s)', [7348501, 7348502])
