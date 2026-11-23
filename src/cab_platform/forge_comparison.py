"""Comparaison locale des commits observés sur les forges, sans fetch."""
from concurrent.futures import ThreadPoolExecutor
import os
import pwd
import re
import subprocess
import threading
from django.db import close_old_connections, transaction
from .core.commands import Refused, require
from .core.models import Project, ProjectMetadataProjection

FORGES = ('FORGEJO', 'GITHUB', 'GITLAB')
_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix='cab-forge-compare')
_lock = threading.Lock()
_running = set()
_pending = set()
_oid = re.compile(r'(?:[0-9a-f]{40}|[0-9a-f]{64})\Z')


def inputs(snapshot, forge):
    local = snapshot.get('git_status') or {}
    remote = (snapshot.get('forge_repositories') or {}).get(forge) or {}
    return (local.get('commit', '') if local.get('available') is True else '',
            remote.get('commit', '') if remote.get('available') is True else '')


def command(project, *args):
    user = pwd.getpwuid(project.owner_uid)
    group = project.owner_gid if project.owner_gid is not None else user.pw_gid
    if os.geteuid() not in (0, project.owner_uid):
        raise OSError('Compte du projet inaccessible')
    options = {'user': project.owner_uid, 'group': group, 'extra_groups': os.getgrouplist(user.pw_name, group)} if os.geteuid() == 0 else {}
    env = {'PATH': '/usr/bin:/bin', 'HOME': user.pw_dir, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_OPTIONAL_LOCKS': '0', 'GIT_NO_LAZY_FETCH': '1', 'PAGER': 'cat'}
    return subprocess.run(['/usr/bin/git', '-C', project.root, '-c', 'core.fsmonitor=false', *args], cwd='/', env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=20, **options)


def measure(project, local, remote):
    result = {'local': local, 'remote': remote, 'available': False}
    if not isinstance(local, str) or not isinstance(remote, str) or not _oid.fullmatch(local) or not _oid.fullmatch(remote):
        return result
    if local == remote:
        return {**result, 'available': True, 'ahead': 0, 'behind': 0}
    try:
        response = command(project, 'rev-list', '--left-right', '--count', local + '...' + remote)
        fields = response.stdout.split()
        if response.returncode or len(fields) != 2 or not all(value.isdigit() for value in fields):
            return result
        return {**result, 'available': True, 'behind': int(fields[0]), 'ahead': int(fields[1])}
    except (OSError, KeyError, subprocess.TimeoutExpired):
        return result


def refresh(project_id):
    try:
        project = Project.objects.get(pk=project_id)
        source = project.public_metadata or {}
        root = project.root
        compared = {forge: inputs(source, forge) for forge in FORGES}
        results = {forge: measure(project, *compared[forge]) for forge in FORGES if compared[forge][1]}
        with transaction.atomic():
            project = Project.objects.select_for_update().get(pk=project_id)
            snapshot = dict(project.public_metadata or {})
            if project.root != root or any(inputs(snapshot, forge) != compared[forge] for forge in FORGES):
                with _lock:
                    _pending.add(str(project_id))
                return
            if snapshot.get('forge_comparisons', {}) != results:
                snapshot['forge_comparisons'] = results
                snapshot['revision'] = int(snapshot.get('revision', 0)) + 1
                project.public_metadata = snapshot
                project.save(update_fields=['public_metadata'])
                ProjectMetadataProjection.objects.update_or_create(pk=project.pk, defaults={'public_metadata': snapshot})
    finally:
        close_old_connections()
        key = str(project_id)
        with _lock:
            if key in _pending:
                _pending.discard(key)
                try:
                    _pool.submit(refresh, project_id)
                except RuntimeError:
                    _running.discard(key)
            else:
                _running.discard(key)


def enqueue(project_id):
    key = str(project_id)
    with _lock:
        if key in _running:
            _pending.add(key)
            return
        _running.add(key)
        try:
            _pool.submit(refresh, project_id)
        except RuntimeError:
            _running.discard(key)


def details(project, forge):
    require(forge in FORGES, 'forge-comparison-unavailable', 404)
    snapshot = project.public_metadata or {}
    comparison = (snapshot.get('forge_comparisons') or {}).get(forge) or {}
    local, remote = inputs(snapshot, forge)
    if comparison.get('local') != local or comparison.get('remote') != remote or not comparison.get('available'):
        return {'available': False, 'local': local, 'remote': remote}
    result = {'available': True, 'local': local, 'remote': remote, 'ahead': comparison['ahead'], 'behind': comparison['behind'], 'local_commits': '', 'remote_commits': ''}
    if local == remote:
        return result
    try:
        for field, revision in (('local_commits', remote + '..' + local), ('remote_commits', local + '..' + remote)):
            output = command(project, 'log', '--no-color', '--max-count=100', '--format=%h %s', revision, '--')
            require(output.returncode == 0 and len(output.stdout) <= 262144, 'forge-comparison-unavailable', 409)
            result[field] = output.stdout.decode('utf-8', 'replace')
        return result
    except (OSError, KeyError, subprocess.TimeoutExpired):
        raise Refused('forge-comparison-unavailable', 409) from None
