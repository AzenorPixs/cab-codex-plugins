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
from .forge_repository import configured, identity
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
    require(configured(project, values, forge), 'forge-push-configuration-missing', 409)
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
            return subprocess.run(['/usr/bin/git', '-C', project.root, '-c', 'credential.helper=', '-c', 'http.extraHeader=', '-c', 'http.proxy=', '-c', 'http.sslVerify=false', '-c', 'http.followRedirects=false', *args], cwd='/', env=process_env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=timeout, pass_fds=(fd,), **options)
        except (OSError, subprocess.TimeoutExpired):
            raise Refused('forge-push-transport-unknown', 409) from None


def prepare(project_id, forge, actor):
    project = Project.objects.get(pk=project_id)
    values, owner, branch, url, group, options, env = context(project, forge)
    local_git(project, options, env, 'check-ref-format', '--branch', branch)
    head = local_git(project, options, env, 'rev-parse', '--verify', 'HEAD^{commit}').decode('ascii').strip()
    local_branch = local_git(project, options, env, 'symbolic-ref', '--quiet', '--short', 'HEAD').decode('utf-8', 'replace').strip()
    require(bool(OID.fullmatch(head)) and bool(local_branch), 'forge-push-local-unavailable', 409)
    dirty = bool(local_git(project, options, env, 'status', '--porcelain=v1', '--untracked-files=normal', '--ignore-submodules=all'))
    try:
        response = remote_git(project, forge, owner, group, options, env, 'ls-remote', '--heads', url, 'refs/heads/' + branch)
    except Refused:
        raise Refused('forge-push-preflight-unavailable', 409) from None
    require(response.returncode == 0 and len(response.stdout) <= 8192, 'forge-push-preflight-unavailable', 409)
    lines = response.stdout.decode('ascii', 'strict').splitlines()
    require(len(lines) <= 1, 'forge-push-preflight-unavailable', 409)
    remote = ''
    if lines:
        fields = lines[0].split('\t')
        require(len(fields) == 2 and OID.fullmatch(fields[0]) is not None and fields[1] == 'refs/heads/' + branch, 'forge-push-preflight-unavailable', 409)
        remote = fields[0]
    signature = identity(project, values, forge)
    nonce = secrets.token_urlsafe(24)
    with transaction.atomic():
        current = Project.objects.select_for_update().get(pk=project_id)
        require(current.root == project.root and identity(current, (current.public_metadata or {}).get('values', {}), forge) == signature, 'forge-push-configuration-changed', 409)
        config = dict(current.configuration or {})
        records = dict(config.get('forge_push') or {})
        require((config.get('forge_sync', {}).get(forge) or {}).get('state') not in ('RUNNING', 'UNKNOWN'), 'forge-push-pending', 409)
        require((records.get(forge) or {}).get('state') not in ('RUNNING', 'UNKNOWN'), 'forge-push-pending', 409)
        records[forge] = {'nonce': nonce, 'actor': str(actor), 'state': 'READY', 'head': head, 'remote': remote, 'branch': branch, 'signature': signature, 'expires': (timezone.now() + timedelta(minutes=5)).isoformat()}
        config['forge_push'] = records
        current.configuration = config
        current.save(update_fields=['configuration'])
    return {'nonce': nonce, 'branch': branch, 'local_branch': local_branch, 'head': head, 'remote': remote or None, 'dirty': dirty}


def execute(project_id, forge, actor, nonce):
    require(isinstance(nonce, str) and 16 <= len(nonce) <= 100, 'forge-push-preview-invalid', 409)
    project = Project.objects.get(pk=project_id)
    values, owner, branch, url, group, options, env = context(project, forge)
    head = local_git(project, options, env, 'rev-parse', '--verify', 'HEAD^{commit}').decode('ascii').strip()
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
        record['state'] = 'RUNNING'
        records[forge] = record
        config['forge_push'] = records
        current.configuration = config
        current.save(update_fields=['configuration'])
    try:
        result = remote_git(project, forge, owner, group, options, env, 'push', '--porcelain', '--no-follow-tags', '--force-with-lease=refs/heads/' + branch + ':' + expected, url, head + ':refs/heads/' + branch, timeout=120)
        success = result.returncode == 0
    except Exception:
        success = False
    with transaction.atomic():
        current = Project.objects.select_for_update().get(pk=project_id)
        config = dict(current.configuration or {})
        records = dict(config.get('forge_push') or {})
        current_record = dict(records.get(forge) or {})
        if current_record.get('nonce') == nonce and current_record.get('state') == 'RUNNING':
            current_record['state'] = 'COMPLETE' if success else 'UNKNOWN'
            records[forge] = current_record
            config['forge_push'] = records
            current.configuration = config
            current.save(update_fields=['configuration'])
    require(success, 'forge-push-result-unknown', 409)
    def refresh():
        from .forge_repository import refresh_one
        try:refresh_one(project_id, forge, wait=True, managed=False, automatic=False)
        except Exception:pass
    threading.Thread(target=refresh, daemon=True, name='cab-forge-push-refresh').start()
    return {'sent': True, 'head': head}
