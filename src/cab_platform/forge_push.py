"""Envoi d'un commit local vers une forge avec lease explicite."""
from contextlib import contextmanager
from datetime import timedelta
import os
from pathlib import Path
import pwd
import re
import secrets
import subprocess
import tempfile
import threading
from urllib.parse import quote

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from .core.commands import Refused, require
from .core.models import Project
from .forge_repository import identity, missing_configuration
from .forge_settings import crypt
from .forge_version import base_for
from .project_git import probe

FORGES = ('FORGEJO', 'GITHUB', 'GITLAB')
OID = re.compile(r'(?:[0-9a-f]{40}|[0-9a-f]{64})\Z')
ASKPASS = b'''#!/bin/sh
case "$1" in
  *sername*) printf '%s\\n' "$CAB_FORGE_USER" ;;
  *) /bin/cat "/proc/self/fd/$CAB_FORGE_TOKEN_FD" ;;
esac
'''


def context(project, forge):
    require(forge in FORGES and project.creation_state == 'READY', 'forge-push-unavailable', 409)
    require(probe(project) == 1, 'forge-push-git-unavailable', 409)
    values = (project.public_metadata or {}).get('values', {})
    missing = missing_configuration(project, values, forge)
    require(not missing, 'forge-push-configuration-missing', 409, details={'missing': missing})
    prefix = 'REMOTE_' + forge + '_'
    owner, repo, branch = (values.get(prefix + key, '') for key in ('OWNER', 'REPOSITORY', 'BRANCH'))
    base = base_for(values, forge)
    require(isinstance(owner, str) and isinstance(repo, str) and isinstance(branch, str) and owner and repo and branch and '/' not in repo and repo not in ('.', '..') and all(part and part not in ('.', '..') for part in owner.split('/')), 'forge-push-configuration-missing', 409)
    user = pwd.getpwuid(project.owner_uid)
    group = project.owner_gid if project.owner_gid is not None else user.pw_gid
    require(os.geteuid() in (0, project.owner_uid), 'forge-push-git-unavailable', 409)
    options = {'user': project.owner_uid, 'group': group, 'extra_groups': os.getgrouplist(user.pw_name, group)} if os.geteuid() == 0 else {}
    env = {'PATH': '/usr/bin:/bin', 'HOME': user.pw_dir, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_TERMINAL_PROMPT': '0', 'GIT_NO_LAZY_FETCH': '1', 'GIT_OPTIONAL_LOCKS': '0', 'LANG': 'C'}
    try:
        unsafe = subprocess.run(['/usr/bin/git', '-C', project.root, 'config', '--local', '--name-only', '--get-regexp', r'^(url\..*\.(insteadof|pushinsteadof)|http\..*\.(extraheader|proxy|sslverify)|credential\..*\.helper)$'], cwd='/', env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10, **options)
    except (OSError, subprocess.TimeoutExpired):
        raise Refused('forge-push-local-unavailable', 409) from None
    require(unsafe.returncode == 1, 'forge-push-git-config-unsafe', 409)
    url = base + '/' + '/'.join(quote(part, safe='') for part in owner.split('/')) + '/' + quote(repo, safe='') + '.git'
    return values, owner, branch, url, group, options, env


def local_git(project, options, env, *args):
    try:
        result = subprocess.run(['/usr/bin/git', '-C', project.root, '-c', 'core.fsmonitor=false', *args], cwd='/', env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=20, **options)
    except (OSError, subprocess.TimeoutExpired):
        raise Refused('forge-push-local-unavailable', 409) from None
    require(result.returncode == 0 and len(result.stdout) <= 1048576, 'forge-push-local-unavailable', 409)
    return result.stdout


@contextmanager
def git_credentials(project, forge, owner, group):
    secret = crypt(project, forge, project.configuration['forge_tokens_tpm'][forge].encode(), True)
    require(bool(secret) and len(secret) <= 16384 and not any(c in secret for c in (b'\r', b'\n', b'\0')), 'forge-push-credentials-invalid', 409)
    fd = os.memfd_create('cab-forge-credential', flags=0)
    directory = None
    try:
        os.write(fd, secret)
        os.lseek(fd, 0, os.SEEK_SET)
        if os.geteuid() == 0:
            os.fchown(fd, project.owner_uid, group)
        os.fchmod(fd, 0o400)
        directory = tempfile.mkdtemp(prefix='cab-forge-askpass-', dir='/tmp')
        path = Path(directory) / 'askpass'
        path.write_bytes(ASKPASS)
        if os.geteuid() == 0:
            os.chown(path, project.owner_uid, group)
        os.chmod(path, 0o700)
        if os.geteuid() == 0:
            os.chown(directory, project.owner_uid, group)
        yield fd, str(path)
    finally:
        os.close(fd)
        if directory:
            try:(Path(directory) / 'askpass').unlink(missing_ok=True)
            finally:os.rmdir(directory)


def remote_git(project, forge, owner, group, options, env, *args, timeout=30):
    with git_credentials(project, forge, owner, group) as (fd, askpass):
        process_env = {**env, 'GIT_ASKPASS': askpass, 'CAB_FORGE_USER': owner, 'CAB_FORGE_TOKEN_FD': str(fd)}
        try:
            return subprocess.run(['/usr/bin/git', '-C', project.root, '-c', 'credential.helper=', '-c', 'http.extraHeader=', '-c', 'http.proxy=', '-c', 'http.sslVerify=false', '-c', 'http.followRedirects=false', *args], cwd='/', env=process_env, stdout=subprocess.PIPE, stderr=subprocess.PIPE if args[0]=='push' else subprocess.DEVNULL, timeout=timeout, pass_fds=(fd,), **options)
        except (OSError, subprocess.TimeoutExpired):
            raise Refused('forge-push-transport-unknown', 409) from None


def push_rejection(result, refs):
    """Return an allowlisted reason and whether Git reported a complete refusal."""
    stdout = result.stdout or b''
    stderr = (result.stderr or b'').lower()
    if len(stdout) > 4194304:
        return 'forge-push-transport-unknown', False
    if b'fatal: the receiving end does not support --atomic push' in stderr.splitlines():
        return 'forge-push-atomic-unsupported', not stdout
    flags = {}
    reasons = set()
    for line in stdout.splitlines():
        if line.startswith(b'To ') or line == b'Done':
            continue
        fields = line.split(b'\t')
        if len(fields) != 3:
            return 'forge-push-transport-unknown', False
        flag, refspec, summary = fields
        _, separator, ref = refspec.partition(b':')
        if not separator or ref in flags or flag not in (b'!', b'='):
            return 'forge-push-transport-unknown', False
        if flag == b'!':
            if summary.startswith(b'[remote rejected]'):
                reasons.add('forge-push-remote-rejected')
            elif summary == b'[rejected] (stale info)':
                reasons.add('forge-sync-refs-changed')
            elif summary == b'[rejected] (atomic push failed)':
                pass
            else:
                return 'forge-push-transport-unknown', False
        flags[ref] = flag
    if b'protected branch' in stderr:
        reason = 'forge-push-protected-branch'
    elif b'protected tag' in stderr:
        reason = 'forge-push-protected-tag'
    elif 'forge-push-remote-rejected' in reasons:
        reason = 'forge-push-remote-rejected'
    elif 'forge-sync-refs-changed' in reasons:
        reason = 'forge-sync-refs-changed'
    else:
        return 'forge-push-transport-unknown', False
    complete = flags.keys() == {ref.encode('utf-8') for ref in refs} and b'!' in flags.values()
    return reason, complete


def remote_refs(project, forge, owner, group, options, env, url, branch, tags=()):
    branch_ref = 'refs/heads/' + branch
    requested = {branch_ref, *tags}
    try:
        result = remote_git(project, forge, owner, group, options, env, 'ls-remote', '--refs', url, branch_ref, *tags)
        require(result.returncode == 0 and len(result.stdout) <= 1024 * 1024,
                'forge-push-preflight-unavailable', 409)
        found = {}
        for line in result.stdout.split(b'\n'):
            if not line:
                continue
            oid, ref = line.decode('utf-8', 'strict').split('\t')
            require(ref in requested and ref not in found and OID.fullmatch(oid),
                    'forge-push-preflight-unavailable', 409)
            found[ref] = oid
    except (Refused, ValueError):
        raise Refused('forge-push-preflight-unavailable', 409) from None
    return found.pop(branch_ref, ''), found


def remote_head(project, forge, owner, group, options, env, url, branch):
    return remote_refs(project, forge, owner, group, options, env, url, branch)[0]


def commit_tags(project, options, env, head):
    result = local_git(project, options, env, 'for-each-ref', '--points-at=' + head,
                       '--format=%(refname)%00%(objectname)', 'refs/tags/')
    try:
        tags = {}
        for line in result.split(b'\n'):
            if not line:
                continue
            ref, oid = line.decode('utf-8', 'strict').split('\0')
            require(ref.startswith('refs/tags/') and OID.fullmatch(oid), 'forge-push-local-unavailable', 409)
            tags[ref] = oid
        require(len(tags) <= 1000, 'forge-push-local-unavailable', 409)
        return tags
    except ValueError:
        raise Refused('forge-push-local-unavailable', 409) from None


def transfer_receipts(project, forge):
    configuration = project.configuration or {}
    return {key: dict((configuration.get(key) or {}).get(forge) or {}) for key in ('forge_push', 'forge_sync')}


def require_no_pending_transfer(project, forge):
    require(all(receipt.get('state') not in ('RUNNING', 'UNKNOWN') for receipt in transfer_receipts(project, forge).values()),
            'forge-push-pending', 409)


def prepare(project_id, forge, actor):
    project = Project.objects.get(pk=project_id)
    require_no_pending_transfer(project, forge)
    values, owner, branch, url, group, options, env = context(project, forge)
    local_git(project, options, env, 'check-ref-format', '--branch', branch)
    head = local_git(project, options, env, 'rev-parse', '--verify', 'HEAD^{commit}').decode('ascii').strip()
    local_branch = local_git(project, options, env, 'symbolic-ref', '--quiet', '--short', 'HEAD').decode('utf-8', 'replace').strip()
    require(bool(OID.fullmatch(head)) and bool(local_branch), 'forge-push-local-unavailable', 409)
    dirty = bool(local_git(project, options, env, 'status', '--porcelain=v1', '--untracked-files=normal', '--ignore-submodules=all'))
    tags = commit_tags(project, options, env, head)
    remote, remote_tags = remote_refs(project, forge, owner, group, options, env, url, branch, tags)
    require(all(tags[ref] == oid for ref, oid in remote_tags.items()), 'forge-push-tag-conflict', 409)
    signature = identity(project, values, forge)
    nonce = secrets.token_urlsafe(24)
    with transaction.atomic():
        current = Project.objects.select_for_update().get(pk=project_id)
        require(current.root == project.root and identity(current, (current.public_metadata or {}).get('values', {}), forge) == signature, 'forge-push-configuration-changed', 409)
        config = dict(current.configuration or {})
        records = dict(config.get('forge_push') or {})
        require_no_pending_transfer(current, forge)
        records[forge] = {'nonce': nonce, 'actor': str(actor), 'state': 'READY', 'head': head, 'remote': remote, 'branch': branch, 'tags': tags, 'remote_tags': remote_tags, 'signature': signature, 'expires': (timezone.now() + timedelta(minutes=5)).isoformat()}
        config['forge_push'] = records
        current.configuration = config
        current.save(update_fields=['configuration'])
    return {'nonce': nonce, 'branch': branch, 'local_branch': local_branch, 'head': head,
            'remote': remote or None, 'dirty': dirty,
            'tags': [{'name': ref.removeprefix('refs/tags/'), 'remote': ref in remote_tags} for ref in tags]}


def execute(project_id, forge, actor, nonce):
    require(isinstance(nonce, str) and 16 <= len(nonce) <= 100, 'forge-push-preview-invalid', 409)
    project = Project.objects.get(pk=project_id)
    values, owner, branch, url, group, options, env = context(project, forge)
    head = local_git(project, options, env, 'rev-parse', '--verify', 'HEAD^{commit}').decode('ascii').strip()
    tags = commit_tags(project, options, env, head)
    with transaction.atomic():
        current = Project.objects.select_for_update().get(pk=project_id)
        config = dict(current.configuration or {})
        records = dict(config.get('forge_push') or {})
        require((config.get('forge_sync', {}).get(forge) or {}).get('state') not in ('RUNNING', 'UNKNOWN'), 'forge-push-pending', 409)
        record = dict(records.get(forge) or {})
        expires = parse_datetime(record.get('expires', ''))
        require(record.get('state') == 'READY' and secrets.compare_digest(str(record.get('nonce', '')), nonce) and record.get('actor') == str(actor) and expires is not None and timezone.is_aware(expires) and expires > timezone.now(), 'forge-push-preview-invalid', 409)
        require(current.root == project.root and record.get('signature') == identity(current, (current.public_metadata or {}).get('values', {}), forge) and record.get('branch') == branch, 'forge-push-configuration-changed', 409)
        require(record.get('head') == head and bool(OID.fullmatch(head)), 'forge-push-head-changed', 409)
        expected = record.get('remote', '')
        require(isinstance(expected, str) and (not expected or OID.fullmatch(expected)), 'forge-push-preview-invalid', 409)
        require(isinstance(record.get('tags'), dict) and isinstance(record.get('remote_tags'), dict),
                'forge-push-preview-invalid', 409)
        require(record['tags'] == tags, 'forge-push-tags-changed', 409)
        expected_tags = record['remote_tags']
        require(all(tags.get(ref) == oid for ref, oid in expected_tags.items()),
                'forge-push-preview-invalid', 409)
        record['state'] = 'RUNNING'
        records[forge] = record
        config['forge_push'] = records
        current.configuration = config
        current.save(update_fields=['configuration'])
    diagnostic = None
    rejected = False
    success = False
    branch_ref = 'refs/heads/' + branch
    targets = {branch_ref: head, **tags}
    observed = {branch_ref: expected, **expected_tags}
    leases = [f'--force-with-lease={ref}:{observed.get(ref, "")}' for ref in targets]
    updates = [f'{oid}:{ref}' for ref, oid in targets.items()]
    issued = False
    try:
        actual = remote_refs(project, forge, owner, group, options, env, url, branch, tags)
        if actual != (expected, expected_tags):
            diagnostic, rejected = 'forge-push-remote-changed', True
        else:
            issued = True
            result = remote_git(project, forge, owner, group, options, env, 'push', '--atomic',
                                '--porcelain', '--no-follow-tags', *leases, url, *updates, timeout=120)
            if result.returncode == 0:
                success = remote_refs(project, forge, owner, group, options, env, url, branch, tags) == (head, tags)
            else:
                diagnostic, complete = push_rejection(result, set(targets))
                rejected = complete and remote_refs(project, forge, owner, group, options, env, url, branch, tags) == actual
    except (Refused, OSError, subprocess.SubprocessError) as error:
        if isinstance(error, Refused) and not diagnostic:
            diagnostic = error.code
        rejected = not issued
    with transaction.atomic():
        current = Project.objects.select_for_update().get(pk=project_id)
        config = dict(current.configuration or {})
        records = dict(config.get('forge_push') or {})
        current_record = dict(records.get(forge) or {})
        if current_record.get('nonce') == nonce and current_record.get('state') == 'RUNNING':
            current_record['state'] = 'COMPLETE' if success else 'FAILED' if rejected else 'UNKNOWN'
            if diagnostic:
                current_record['diagnostic'] = diagnostic
            records[forge] = current_record
            config['forge_push'] = records
            current.configuration = config
            current.save(update_fields=['configuration'])
    if not success:
        raise Refused((diagnostic or 'forge-push-preflight-unavailable') if rejected else 'forge-push-result-unknown',
                      details={'cause': diagnostic} if diagnostic and not rejected else None)
    def refresh():
        from .forge_repository import refresh_one
        try:refresh_one(project_id, forge, wait=True, managed=False, automatic=False)
        except Exception:pass
    threading.Thread(target=refresh, daemon=True, name='cab-forge-push-refresh').start()
    return {'sent': True, 'head': head}
