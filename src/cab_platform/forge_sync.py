"""Synchronisation contrôlée d'une branche et de ses tags vers une forge."""
from datetime import timedelta
import hashlib
import secrets
import subprocess
import threading
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from .core.commands import Refused, require
from .core.models import Event, Project
from .forge_push import OID, context, identity, local_git, remote_git, remote_head, require_no_pending_transfer, transfer_receipts


def refs(project, forge, owner, group, options, env, url, branch):
    result = remote_git(project, forge, owner, group, options, env, 'ls-remote', url, 'refs/heads/' + branch, 'refs/tags/*')
    require(result.returncode == 0 and len(result.stdout) <= 4194304, 'forge-sync-preview-unavailable', 409)
    remote, tags, peeled = '', {}, {}
    try:
        for line in result.stdout.decode('utf-8', 'strict').splitlines():
            oid, ref = line.split('\t')
            require(OID.fullmatch(oid) is not None, 'forge-sync-preview-unavailable', 409)
            if ref == 'refs/heads/' + branch:
                require(not remote, 'forge-sync-preview-unavailable', 409)
                remote = oid
            elif ref.startswith('refs/tags/'):
                if ref.endswith('^{}'): peeled[ref[:-3]] = oid
                else: tags[ref] = oid
    except (ValueError, UnicodeError):
        raise Refused('forge-sync-preview-unavailable', 409) from None
    return remote, tags, peeled


def reconcile(project_id, forge, actor):
    project = Project.objects.get(pk=project_id)
    receipts = transfer_receipts(project, forge)
    require(all(receipt.get('state') != 'RUNNING' for receipt in receipts.values()), 'forge-reconcile-running', 409)
    uncertain = [key for key, receipt in receipts.items() if receipt.get('state') == 'UNKNOWN']
    require(bool(uncertain), 'forge-reconcile-not-pending', 409)
    require(len(uncertain) == 1, 'forge-reconcile-ambiguous', 409)

    kind = uncertain[0]
    receipt = receipts[kind]
    values, owner, branch, url, group, options, env = context(project, forge)
    signature = identity(project, values, forge)
    require(receipt.get('branch') == branch and receipt.get('signature') == signature, 'forge-push-configuration-changed', 409)
    expected = receipt.get('head')
    require(isinstance(expected, str) and OID.fullmatch(expected) is not None, 'forge-reconcile-receipt-invalid', 409)
    if kind == 'forge_sync':
        expected_tags = receipt.get('source_tags')
        require(isinstance(expected_tags, dict), 'forge-reconcile-receipt-invalid', 409)

    try:
        if kind == 'forge_sync':
            observed, tags, _ = refs(project, forge, owner, group, options, env, url, branch)
        else:
            observed = remote_head(project, forge, owner, group, options, env, url, branch)
    except Refused:
        raise Refused('forge-reconcile-observation-unavailable', 409) from None
    require(observed == expected, 'forge-reconcile-branch-diverged', 409)
    if kind == 'forge_sync':
        require(tags == expected_tags, 'forge-reconcile-tags-diverged', 409)

    with transaction.atomic():
        current = Project.objects.select_for_update().get(pk=project_id)
        current_values = (current.public_metadata or {}).get('values', {})
        require(current.root == project.root and identity(current, current_values, forge) == signature, 'forge-push-configuration-changed', 409)
        require(transfer_receipts(current, forge) == receipts, 'forge-reconcile-receipt-changed', 409)
        original = dict(receipt)
        nonce = original.pop('nonce', None)
        if isinstance(nonce, str):
            original['nonce_sha256'] = hashlib.sha256(nonce.encode()).hexdigest()
        observed_refs = {'branch': branch, 'head': observed}
        if kind == 'forge_sync':
            observed_refs['tags'] = tags
        proof = Event.objects.create(project=current, kind='forge-operation-reconciled', data={
            'forge': forge, 'operation': kind, 'actor': str(actor), 'receipt': original, 'observed': observed_refs,
        })
        configuration = dict(current.configuration or {})
        operation_records = dict(configuration.get(kind) or {})
        operation_records[forge] = {**receipt, 'state': 'RECONCILED', 'reconciliation_id': proof.pk}
        configuration[kind] = operation_records
        current.configuration = configuration
        current.save(update_fields=['configuration'])
    return {'reconciled': True, 'receipt_id': proof.pk}


def local_tags(project, options, env, head):
    raw = local_git(project, options, env, 'for-each-ref', '--format=%(refname)%00%(objectname)', 'refs/tags/')
    tags = {}
    try:
        for line in raw.splitlines():
            ref, oid = line.split(b'\0')
            name, value = ref.decode('utf-8', 'strict'), oid.decode('ascii', 'strict')
            require(name.startswith('refs/tags/') and OID.fullmatch(value), 'forge-sync-preview-unavailable', 409)
            tags[name] = value
    except (ValueError, UnicodeError):
        raise Refused('forge-sync-preview-unavailable', 409) from None
    return tags


def prepare(project_id, forge, actor):
    project = Project.objects.get(pk=project_id)
    require_no_pending_transfer(project, forge)
    values, owner, branch, url, group, options, env = context(project, forge)
    local_git(project, options, env, 'check-ref-format', '--branch', branch)
    head = local_git(project, options, env, 'rev-parse', '--verify', 'HEAD^{commit}').decode('ascii').strip()
    current_branch = local_git(project, options, env, 'symbolic-ref', '--quiet', '--short', 'HEAD').decode('utf-8', 'strict').strip()
    require(OID.fullmatch(head) is not None, 'forge-sync-preview-unavailable', 409)
    dirty = bool(local_git(project, options, env, 'status', '--porcelain=v1', '--untracked-files=normal', '--ignore-submodules=all'))
    remote, remote_tags, peeled = refs(project, forge, owner, group, options, env, url, branch)
    source_tags = local_tags(project, options, env, head)
    changes = []
    for ref, value in sorted(source_tags.items()):
        expected = remote_tags.get(ref, '')
        if expected != value:
            changes.append({'ref': ref, 'before': expected, 'after': value, 'action': 'modifier' if expected else 'créer'})
    for ref, value in sorted(remote_tags.items()):
        if ref not in source_tags:
            changes.append({'ref': ref, 'before': value, 'after': '', 'action': 'supprimer'})
    require(len(changes) <= 1000, 'forge-sync-preview-unavailable', 409)
    nonce = secrets.token_urlsafe(24)
    signature = identity(project, values, forge)
    with transaction.atomic():
        current = Project.objects.select_for_update().get(pk=project_id)
        require(current.root == project.root and identity(current, (current.public_metadata or {}).get('values', {}), forge) == signature, 'forge-push-configuration-changed', 409)
        config = dict(current.configuration or {})
        records = dict(config.get('forge_sync') or {})
        require_no_pending_transfer(current, forge)
        records[forge] = {'nonce': nonce, 'actor': str(actor), 'state': 'READY', 'head': head, 'remote': remote, 'branch': branch, 'signature': signature, 'changes': changes, 'source_tags': source_tags, 'remote_tags': remote_tags, 'expires': (timezone.now() + timedelta(minutes=5)).isoformat()}
        config['forge_sync'] = records
        current.configuration = config
        current.save(update_fields=['configuration'])
    return {'nonce': nonce, 'branch': branch, 'local_branch': current_branch, 'head': head, 'remote': remote or None, 'dirty': dirty, 'changes': changes}


def execute(project_id, forge, actor, nonce):
    require(isinstance(nonce, str) and 16 <= len(nonce) <= 100, 'forge-push-preview-invalid', 409)
    project = Project.objects.get(pk=project_id)
    values, owner, branch, url, group, options, env = context(project, forge)
    head = local_git(project, options, env, 'rev-parse', '--verify', 'HEAD^{commit}').decode('ascii').strip()
    source_tags = local_tags(project, options, env, head)
    observed_remote, observed_tags, _ = refs(project, forge, owner, group, options, env, url, branch)
    with transaction.atomic():
        current = Project.objects.select_for_update().get(pk=project_id)
        config = dict(current.configuration or {})
        records = dict(config.get('forge_sync') or {})
        record = dict(records.get(forge) or {})
        expires = parse_datetime(record.get('expires', ''))
        require(record.get('state') == 'READY' and secrets.compare_digest(str(record.get('nonce', '')), nonce) and record.get('actor') == str(actor) and expires is not None and timezone.is_aware(expires) and expires > timezone.now(), 'forge-push-preview-invalid', 409)
        require(current.root == project.root and record.get('signature') == identity(current, (current.public_metadata or {}).get('values', {}), forge) and record.get('branch') == branch, 'forge-push-configuration-changed', 409)
        require(record.get('head') == head and record.get('source_tags') == source_tags, 'forge-push-head-changed', 409)
        require(record.get('remote') == observed_remote and record.get('remote_tags') == observed_tags, 'forge-sync-refs-changed', 409)
        require((config.get('forge_push', {}).get(forge) or {}).get('state') not in ('RUNNING', 'UNKNOWN'), 'forge-push-pending', 409)
        record['state'] = 'RUNNING'
        records[forge] = record
        config['forge_sync'] = records
        current.configuration = config
        current.save(update_fields=['configuration'])
    branch_ref = 'refs/heads/' + branch
    leases = ['--force-with-lease=' + branch_ref + ':' + record['remote']]
    updates = [head + ':' + branch_ref]
    for ref, oid in sorted(source_tags.items()):
        leases.append('--force-with-lease=' + ref + ':' + observed_tags.get(ref, ''))
        updates.append(oid + ':' + ref)
    for ref, oid in sorted(observed_tags.items()):
        if ref not in source_tags:
            leases.append('--force-with-lease=' + ref + ':' + oid)
            updates.append(':' + ref)
    try:
        result = remote_git(project, forge, owner, group, options, env, 'push', '--atomic', '--porcelain', '--no-follow-tags', *leases, url, *updates, timeout=120)
        success = result.returncode == 0
        if success:
            final_head, final_tags, _ = refs(project, forge, owner, group, options, env, url, branch)
            success = final_head == head and final_tags == source_tags
    except Exception:
        success = False
    with transaction.atomic():
        current = Project.objects.select_for_update().get(pk=project_id)
        config = dict(current.configuration or {})
        records = dict(config.get('forge_sync') or {})
        state = dict(records.get(forge) or {})
        if state.get('nonce') == nonce and state.get('state') == 'RUNNING':
            state['state'] = 'COMPLETE' if success else 'UNKNOWN'
            records[forge] = state
            config['forge_sync'] = records
            current.configuration = config
            current.save(update_fields=['configuration'])
    require(success, 'forge-push-result-unknown', 409)
    def refresh():
        from .forge_repository import refresh_one
        try: refresh_one(project_id, forge, wait=True, managed=False, automatic=False)
        except Exception: pass
    threading.Thread(target=refresh, daemon=True, name='cab-forge-sync-refresh').start()
    return {'synchronized': True, 'head': head}
