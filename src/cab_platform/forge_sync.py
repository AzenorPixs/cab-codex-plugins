"""Synchronisation contrôlée d’une branche et de ses tags dans les deux sens."""
from datetime import timedelta
import hashlib
from pathlib import Path
import secrets
from select import select
import subprocess
import threading
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from .core.commands import Refused, digest, require
from .core.models import Event, Project
from .forge_push import OID, context, identity, local_git, remote_git, remote_head, require_no_pending_transfer, transfer_receipts
from .preexisting_git import git_guard


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


def tag_changes(before, after):
    return [
        {'ref': ref, 'before': before.get(ref, ''), 'after': after.get(ref, ''),
         'action': 'supprimer' if ref not in after else 'modifier' if ref in before else 'créer'}
        for ref in sorted(before.keys() | after.keys()) if before.get(ref) != after.get(ref)
    ]


def reconcile(project_id, forge, actor, confirmation=None):
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
    reverse = kind == 'forge_sync' and receipt.get('source') == 'remote'
    expected = receipt.get('remote' if reverse else 'head')
    require(isinstance(expected, str) and OID.fullmatch(expected) is not None, 'forge-reconcile-receipt-invalid', 409)
    if kind == 'forge_sync':
        expected_tags = receipt.get('remote_tags' if reverse else 'source_tags')
        require(isinstance(expected_tags, dict), 'forge-reconcile-receipt-invalid', 409)

    try:
        if reverse:
            local_branch, observed = local_position(project, options, env)
            require(local_branch == receipt.get('local_branch'), 'forge-push-head-changed', 409)
            require_local_ready(project, options, env)
            tags = local_tags(project, options, env, observed)
        elif kind == 'forge_sync':
            observed, tags, _ = refs(project, forge, owner, group, options, env, url, branch)
        else:
            observed = remote_head(project, forge, owner, group, options, env, url, branch)
    except Refused:
        if reverse:
            raise
        raise Refused('forge-reconcile-observation-unavailable', 409) from None
    observed_refs = {'branch': receipt['local_branch'] if reverse else branch, 'head': observed}
    changes = []
    if kind == 'forge_sync':
        observed_refs['tags'] = tags
        changes = tag_changes(expected_tags, tags)
    diverged = observed != expected or bool(changes)
    fingerprint = digest([project_id, forge, str(actor), project.root, receipts, observed_refs])
    if confirmation is not None:
        require(confirmation == fingerprint, 'forge-reconcile-observation-changed', 409)
    elif diverged:
        return {'reconciled': False,
                'error': 'forge-reconcile-branch-diverged' if observed != expected else 'forge-reconcile-tags-diverged',
                'details': {'branch': observed_refs['branch'], 'expected': expected, 'observed': observed,
                            'tag_count': len(changes), 'tags': changes[:20], 'confirmation': fingerprint}}

    with transaction.atomic():
        current = Project.objects.select_for_update().get(pk=project_id)
        current_values = (current.public_metadata or {}).get('values', {})
        require(current.root == project.root and identity(current, current_values, forge) == signature, 'forge-push-configuration-changed', 409)
        require(transfer_receipts(current, forge) == receipts, 'forge-reconcile-receipt-changed', 409)
        original = dict(receipt)
        nonce = original.pop('nonce', None)
        if isinstance(nonce, str):
            original['nonce_sha256'] = hashlib.sha256(nonce.encode()).hexdigest()
        event_kind = 'forge-operation-closed-unconfirmed' if diverged else 'forge-operation-reconciled'
        proof = Event.objects.create(project=current, kind=event_kind, data={
            'forge': forge, 'operation': kind, 'actor': str(actor), 'receipt': original, 'observed': observed_refs,
        })
        configuration = dict(current.configuration or {})
        operation_records = dict(configuration.get(kind) or {})
        state = 'CLOSED_UNCONFIRMED' if diverged else 'RECONCILED'
        operation_records[forge] = {**receipt, 'state': state, 'reconciliation_id': proof.pk}
        configuration[kind] = operation_records
        current.configuration = configuration
        current.save(update_fields=['configuration'])
    return {'reconciled': True, 'receipt_id': proof.pk, **({'closed_unconfirmed': True} if diverged else {})}


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


def local_position(project, options, env):
    branch = local_git(project, options, env, 'symbolic-ref', '--quiet', 'HEAD').decode('utf-8', 'strict').strip()
    head = local_git(project, options, env, 'rev-parse', '--verify', 'HEAD^{commit}').decode('ascii').strip()
    require(branch.startswith('refs/heads/') and OID.fullmatch(head) is not None, 'forge-sync-preview-unavailable', 409)
    return branch.removeprefix('refs/heads/'), head


def require_local_ready(project, options, env):
    status = local_git(project, options, env, 'status', '--porcelain=v1', '--untracked-files=all', '--ignore-submodules=none')
    require(not status, 'forge-sync-local-dirty', 409)
    for marker in ('MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'sequencer'):
        path = local_git(project, options, env, 'rev-parse', '--git-path', marker).decode('utf-8', 'strict').rstrip('\n')
        require(not (Path(project.root) / path).exists(), 'forge-sync-local-operation-active', 409)


def apply_local_refs(project, options, env, local_branch, head, remote, source_tags, target_tags):
    branch = 'refs/heads/' + local_branch
    changes = tag_changes(source_tags, target_tags)
    updates = [('update', branch, remote, head)]
    for change in changes:
        ref, before, after = change['ref'], change['before'], change['after']
        updates.append(('update', ref, after, before or '0' * len(after)) if after else ('delete', ref, before))
    require(all('\0' not in update[1] for update in updates), 'forge-sync-local-unconfirmed', 409)
    commands = ''.join(update[0] + ' ' + '\0'.join(update[1:]) + '\0' for update in updates)
    args = ['/usr/bin/git', '-C', project.root, 'update-ref', '--no-deref', '--stdin', '-z',
            '-m', 'CAB: synchronisation depuis la forge']
    with subprocess.Popen(args, cwd='/', env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                          stderr=subprocess.DEVNULL, **options) as process:
        def exchange(command, expected):
            process.stdin.write(command)
            process.stdin.flush()
            ready, _, _ = select([process.stdout], [], [], 20)
            require(bool(ready) and process.stdout.readline() == expected, 'forge-sync-local-unconfirmed', 409)

        try:
            exchange(b'start\0', b'start: ok\n')
            exchange(commands.encode('utf-8') + b'prepare\0', b'prepare: ok\n')
            require(local_position(project, options, env) == (local_branch, head), 'forge-push-head-changed', 409)
            require_local_ready(project, options, env)
            require(local_tags(project, options, env, head) == source_tags, 'forge-push-head-changed', 409)
            if head != remote:
                local_git(project, options, env, 'read-tree', '-m', '-u', head, remote)
            exchange(b'commit\0', b'commit: ok\n')
        finally:
            process.stdin.close()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
    require(process.returncode == 0, 'forge-sync-local-unconfirmed', 409)


def receive(project, forge, owner, group, options, env, url, branch, record):
    head, remote = record['head'], record['remote']
    local_branch, source_tags, target_tags = record['local_branch'], record['source_tags'], record['remote_tags']
    require_local_ready(project, options, env)
    changes = tag_changes(source_tags, target_tags)
    objects = list(dict.fromkeys([remote, *(change['after'] for change in changes if change['after'])]))
    fetched = remote_git(project, forge, owner, group, options, env, 'fetch', '--no-tags', '--no-write-fetch-head',
                         '--no-recurse-submodules', '--no-auto-maintenance', url, *objects, timeout=120)
    require(fetched.returncode == 0, 'forge-sync-local-fetch-failed', 409)
    observed, tags, _ = refs(project, forge, owner, group, options, env, url, branch)
    require(observed == remote and tags == target_tags, 'forge-sync-refs-changed', 409)
    require(local_git(project, options, env, 'cat-file', '-t', remote) == b'commit\n', 'forge-sync-local-fetch-failed', 409)
    apply_local_refs(project, options, env, local_branch, head, remote, source_tags, target_tags)
    require(local_position(project, options, env) == (local_branch, remote)
            and local_tags(project, options, env, remote) == target_tags, 'forge-sync-local-unconfirmed', 409)
    require_local_ready(project, options, env)


def prepare(project_id, forge, actor, *, source='local'):
    project = Project.objects.get(pk=project_id)
    require_no_pending_transfer(project, forge)
    values, owner, branch, url, group, options, env = context(project, forge)
    local_git(project, options, env, 'check-ref-format', '--branch', branch)
    current_branch, head = local_position(project, options, env)
    if source == 'remote':
        require_local_ready(project, options, env)
    dirty = bool(local_git(project, options, env, 'status', '--porcelain=v1', '--untracked-files=normal', '--ignore-submodules=all'))
    remote, remote_tags, peeled = refs(project, forge, owner, group, options, env, url, branch)
    source_tags = local_tags(project, options, env, head)
    if source == 'remote':
        require(bool(remote), 'forge-sync-remote-branch-missing', 409)
        changes = tag_changes(source_tags, remote_tags)
    else:
        changes = tag_changes(remote_tags, source_tags)
    require(len(changes) <= 1000, 'forge-sync-preview-unavailable', 409)
    nonce = secrets.token_urlsafe(24)
    signature = identity(project, values, forge)
    with transaction.atomic():
        current = Project.objects.select_for_update().get(pk=project_id)
        require(current.root == project.root and identity(current, (current.public_metadata or {}).get('values', {}), forge) == signature, 'forge-push-configuration-changed', 409)
        config = dict(current.configuration or {})
        records = dict(config.get('forge_sync') or {})
        require_no_pending_transfer(current, forge)
        records[forge] = {'nonce': nonce, 'actor': str(actor), 'state': 'READY', 'head': head, 'remote': remote, 'branch': branch, 'local_branch': current_branch, 'source': source, 'signature': signature, 'changes': changes, 'source_tags': source_tags, 'remote_tags': remote_tags, 'expires': (timezone.now() + timedelta(minutes=5)).isoformat()}
        config['forge_sync'] = records
        current.configuration = config
        current.save(update_fields=['configuration'])
    return {'nonce': nonce, 'branch': branch, 'local_branch': current_branch, 'source': source, 'head': head, 'remote': remote or None, 'dirty': dirty, 'changes': changes}


def execute(project_id, forge, actor, nonce):
    require(isinstance(nonce, str) and 16 <= len(nonce) <= 100, 'forge-push-preview-invalid', 409)
    project = Project.objects.get(pk=project_id)
    values, owner, branch, url, group, options, env = context(project, forge)
    current_branch, head = local_position(project, options, env)
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
        require(record.get('head') == head and record.get('source_tags') == source_tags
                and record.get('local_branch', current_branch) == current_branch, 'forge-push-head-changed', 409)
        require(record.get('remote') == observed_remote and record.get('remote_tags') == observed_tags, 'forge-sync-refs-changed', 409)
        require((config.get('forge_push', {}).get(forge) or {}).get('state') not in ('RUNNING', 'UNKNOWN'), 'forge-push-pending', 409)
        reverse = record.get('source') == 'remote'
        if reverse:
            require_local_ready(project, options, env)
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
        if reverse:
            with git_guard():
                receive(project, forge, owner, group, options, env, url, branch, record)
            success = True
        else:
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
    require(success, 'forge-sync-local-unconfirmed' if reverse else 'forge-push-result-unknown', 409)
    def refresh():
        from .forge_repository import refresh_one
        if reverse:
            from .project_git import refresh_status
            try: refresh_status(project_id, manual=True)
            except Exception: pass
        try: refresh_one(project_id, forge, wait=True, managed=False, automatic=False)
        except Exception: pass
    threading.Thread(target=refresh, daemon=True, name='cab-forge-sync-refresh').start()
    return {'synchronized': True, 'head': observed_remote if reverse else head}
