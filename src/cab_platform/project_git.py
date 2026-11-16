"""Etat et initialisation du dépôt Git d'un projet."""
import os
from pathlib import Path
import pwd
import stat
import subprocess
from django.db import transaction
from .core.commands import Refused, require
from .core.models import Project


def git_version():
    try:
        result = subprocess.run(['/usr/bin/git', '--version'], cwd='/', env={'PATH': '/usr/bin:/bin', 'LANG': 'C'}, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=5)
        text = result.stdout.decode('ascii', 'replace').strip()
        if result.returncode == 0 and text.startswith('git version '):
            return text[len('git version '):][:100]
    except (OSError, subprocess.TimeoutExpired):
        pass
    return None


def probe(project):
    root = Path(project.root)
    try:
        if not root.is_absolute() or root.resolve() != root or not root.is_dir():
            return None
        target = root / '.git'
        try:
            info = target.lstat()
        except FileNotFoundError:
            return 0
        if not (stat.S_ISDIR(info.st_mode) or stat.S_ISREG(info.st_mode)):
            return None
        user = pwd.getpwuid(project.owner_uid)
        group = project.owner_gid if project.owner_gid is not None else user.pw_gid
        options = {'user': project.owner_uid, 'group': group, 'extra_groups': os.getgrouplist(user.pw_name, group)} if os.geteuid() == 0 else {}
        if os.geteuid() not in (0, project.owner_uid):
            return None
        result = subprocess.run(['/usr/bin/git', '-C', str(root), 'rev-parse', '--resolve-git-dir', str(target)], cwd='/', env={'PATH': '/usr/bin:/bin', 'HOME': user.pw_dir, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null'}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5, **options)
        return 1 if result.returncode == 0 else None
    except (OSError, KeyError, subprocess.TimeoutExpired):
        return None


def initialize(project_id):
    with transaction.atomic():
        project = Project.objects.select_for_update().get(pk=project_id)
        require(project.creation_state == 'READY', 'project-git-unavailable', 409)
        state = probe(project)
        require(state is not None, 'project-git-unavailable', 409)
        if state == 0:
            root = Path(project.root)
            require(not os.path.lexists(root / '.git'), 'project-git-unavailable', 409)
            user = pwd.getpwuid(project.owner_uid)
            group = project.owner_gid if project.owner_gid is not None else user.pw_gid
            options = {'user': project.owner_uid, 'group': group, 'extra_groups': os.getgrouplist(user.pw_name, group)} if os.geteuid() == 0 else {}
            try:
                result = subprocess.run(['/usr/bin/git', '-C', str(root), 'init', '--template='], cwd='/', env={'PATH': '/usr/bin:/bin', 'HOME': user.pw_dir, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null'}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15, **options)
            except (OSError, subprocess.TimeoutExpired):
                raise Refused('project-git-initialization-uncertain', 409) from None
            require(result.returncode == 0 and probe(project) == 1, 'project-git-initialization-uncertain', 409)
    from .project_metadata import synchronize
    return {'public_metadata': synchronize(project_id)}


def measure(project):
    """Mesure locale uniquement ; les noms des fichiers ne sont pas conservés."""
    if probe(project) != 1:
        return None
    try:
        user = pwd.getpwuid(project.owner_uid)
        group = project.owner_gid if project.owner_gid is not None else user.pw_gid
        options = {'user': project.owner_uid, 'group': group, 'extra_groups': os.getgrouplist(user.pw_name, group)} if os.geteuid() == 0 else {}
        env = {'PATH': '/usr/bin:/bin', 'HOME': user.pw_dir, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_OPTIONAL_LOCKS': '0', 'GIT_NO_LAZY_FETCH': '1'}
        result = subprocess.run(['/usr/bin/git', '-C', project.root, '-c', 'core.fsmonitor=false', 'status', '--porcelain=v2', '--branch', '--no-ahead-behind', '-z', '--untracked-files=all', '--ignore-submodules=all'], cwd='/', env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=20, **options)
        if result.returncode:
            return None
        counts = []
        for args in (['ls-files', '-z'], ['ls-files', '--others', '--ignored', '--exclude-standard', '-z']):
            listing = subprocess.run(['/usr/bin/git', '-C', project.root, '-c', 'core.fsmonitor=false', *args], cwd='/', env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=20, **options)
            if listing.returncode:
                return None
            counts.append(listing.stdout.count(b'\0'))
        state = {'available': True, 'branch': '', 'commit': '', 'tracked': counts[0], 'ignored': counts[1], 'modified': 0, 'staged': 0, 'untracked': 0, 'conflicts': 0}
        entries = iter(result.stdout.split(b'\0'))
        for item in entries:
            if item.startswith(b'# branch.head '):
                state['branch'] = item[14:].decode('utf-8', 'replace')[:255]
            elif item.startswith(b'# branch.oid '):
                oid = item[13:].decode('ascii', 'replace')
                state['commit'] = '' if oid == '(initial)' else oid[:64]
            elif item.startswith(b'? '):
                state['untracked'] += 1
            elif item.startswith(b'u '):
                state['conflicts'] += 1
            elif item.startswith((b'1 ', b'2 ')) and len(item) > 3:
                state['staged'] += item[2:3] != b'.'
                state['modified'] += item[3:4] != b'.'
                if item.startswith(b'2 '):
                    next(entries, None)
        if state['commit']:
            date = subprocess.run(['/usr/bin/git', '-C', project.root, 'show', '-s', '--format=%cI', state['commit']], cwd='/', env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=10, **options)
            if date.returncode:
                return None
            state['commit_time'] = date.stdout.decode('ascii', 'replace').strip()[:40]
            tags = subprocess.run(['/usr/bin/git', '-C', project.root, 'tag', '--points-at', state['commit'], '--sort=refname'], cwd='/', env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=10, **options)
            if tags.returncode:
                return None
            state['commit_tags'] = tags.stdout.decode('utf-8', 'replace').splitlines()
        else:
            state['commit_time'] = ''
            state['commit_tags'] = []
        return state
    except (OSError, KeyError, subprocess.TimeoutExpired):
        return None


def refresh_status(project_id):
    import time
    from django.db import connection
    from django.utils import timezone
    from .core.models import GitProject
    from .git_monitor_config import read
    while True:
        with connection.cursor() as cursor:
            cursor.execute('SELECT pg_advisory_lock(%s, %s)', [7348501, 7348502])
        try:
            last = GitProject.objects.filter(project_id=project_id).values_list('checked_at', flat=True).first()
            remaining = read()['interval_seconds'] - (timezone.now() - last).total_seconds() if last else 0
            if remaining <= 0:
                return _refresh_status(project_id)
        finally:
            with connection.cursor() as cursor:
                cursor.execute('SELECT pg_advisory_unlock(%s, %s)', [7348501, 7348502])
        time.sleep(min(remaining, 1))


def _refresh_status(project_id):
    from django.utils import timezone
    from .core.models import GitProject, ProjectMetadataProjection
    project = Project.objects.get(pk=project_id)
    root = project.root
    observed = measure(project)
    with transaction.atomic():
        project = Project.objects.select_for_update().get(pk=project_id)
        if project.root != root:
            return None
        row, _ = GitProject.objects.get_or_create(project=project)
        state = observed if observed is not None else {**row.state, 'available': False}
        row.state = state
        row.checked_at = timezone.now()
        row.save(update_fields=['state', 'checked_at'])
        snapshot = dict(project.public_metadata or {})
        if snapshot.get('git_status') != state:
            snapshot['git_status'] = state
            snapshot['revision'] = int(snapshot.get('revision', 0)) + 1
            project.public_metadata = snapshot
            project.save(update_fields=['public_metadata'])
            ProjectMetadataProjection.objects.update_or_create(pk=project.pk, defaults={'public_metadata': snapshot})
        return state


def commit_overview(project, commit):
    import re
    require(isinstance(commit, str) and re.fullmatch(r'[0-9a-f]{40}|[0-9a-f]{64}', commit) is not None, 'project-git-commit-invalid', 400)
    from .core.models import GitProject
    record = GitProject.objects.filter(project=project).first()
    require(record is not None and record.state.get('commit') == commit, 'project-git-commit-unavailable', 409)
    require(probe(project) == 1, 'project-git-commit-unavailable', 409)
    try:
        user = pwd.getpwuid(project.owner_uid)
        group = project.owner_gid if project.owner_gid is not None else user.pw_gid
        options = {'user': project.owner_uid, 'group': group, 'extra_groups': os.getgrouplist(user.pw_name, group)} if os.geteuid() == 0 else {}
        env = {'PATH': '/usr/bin:/bin', 'HOME': user.pw_dir, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_OPTIONAL_LOCKS': '0', 'GIT_NO_LAZY_FETCH': '1', 'PAGER': 'cat'}
        fmt = 'format:Commit           : %H%nAuteur           : %an <%ae>%nDate commit      : %cd%nRéférences       : %D%n'
        result = subprocess.run(['/usr/bin/git', '-C', project.root, '-c', 'core.fsmonitor=false', 'show', '--no-color', '--no-ext-diff', '--no-renames', '--decorate=short', '--date=iso-local', '--stat=120,85', '--stat-count=1000', '--format='+fmt, commit, '--'], cwd='/', env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=20, **options)
        require(result.returncode == 0, 'project-git-commit-unavailable', 409)
        require(len(result.stdout) <= 1048576, 'project-git-commit-too-large', 409)
        return {'content': result.stdout.decode('utf-8', 'replace')}
    except (OSError, KeyError, subprocess.TimeoutExpired):
        raise Refused('project-git-commit-unavailable', 409) from None


def changes_overview(project):
    require(probe(project) == 1, 'project-git-changes-unavailable', 409)
    try:
        user = pwd.getpwuid(project.owner_uid)
        group = project.owner_gid if project.owner_gid is not None else user.pw_gid
        options = {'user': project.owner_uid, 'group': group, 'extra_groups': os.getgrouplist(user.pw_name, group)} if os.geteuid() == 0 else {}
        env = {'PATH': '/usr/bin:/bin', 'HOME': user.pw_dir, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_OPTIONAL_LOCKS': '0', 'GIT_NO_LAZY_FETCH': '1', 'PAGER': 'cat'}
        outputs = []
        for mode in ('--stat=120,85', '--name-status'):
            result = subprocess.run(['/usr/bin/git', '-C', project.root, '-c', 'core.fsmonitor=false', 'diff', '--no-color', '--no-ext-diff', '--no-textconv', '--no-renames', mode, '--'], cwd='/', env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=20, **options)
            require(result.returncode == 0, 'project-git-changes-unavailable', 409)
            require(len(result.stdout) <= 1048576, 'project-git-changes-too-large', 409)
            outputs.append(result.stdout.decode('utf-8', 'replace').strip('\n'))
        content = '\n\n'.join(value for value in outputs if value) or 'Aucune modification non indexée.'
        return {'content': content}
    except (OSError, KeyError, subprocess.TimeoutExpired):
        raise Refused('project-git-changes-unavailable', 409) from None


def files_overview(project, kind):
    commands = {
        'tracked': ['ls-files'],
        'ignored': ['ls-files', '--others', '--ignored', '--exclude-standard'],
        'untracked': ['ls-files', '--others', '--exclude-standard'],
        'conflicts': ['diff', '--name-only', '--diff-filter=U', '--no-ext-diff', '--no-textconv'],
        'staged': ['diff', '--cached', '--name-status', '--no-ext-diff', '--no-textconv', '--no-renames'],
    }
    require(kind in commands, 'project-git-files-invalid', 400)
    require(probe(project) == 1, 'project-git-files-unavailable', 409)
    try:
        user = pwd.getpwuid(project.owner_uid)
        group = project.owner_gid if project.owner_gid is not None else user.pw_gid
        options = {'user': project.owner_uid, 'group': group, 'extra_groups': os.getgrouplist(user.pw_name, group)} if os.geteuid() == 0 else {}
        env = {'PATH': '/usr/bin:/bin', 'HOME': user.pw_dir, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_OPTIONAL_LOCKS': '0', 'GIT_NO_LAZY_FETCH': '1', 'PAGER': 'cat'}
        selections = [commands[kind]]
        if kind == 'staged':
            selections.insert(0, ['diff', '--cached', '--stat=120,85', '--no-ext-diff', '--no-textconv', '--no-renames'])
        outputs = []
        for selection in selections:
            result = subprocess.run(['/usr/bin/git', '-C', project.root, '-c', 'core.fsmonitor=false', '-c', 'color.ui=false', *selection, '--'], cwd='/', env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=30, **options)
            require(result.returncode == 0, 'project-git-files-unavailable', 409)
            outputs.append(result.stdout.decode('utf-8', 'replace').rstrip('\n'))
        content = '\n\n'.join(value for value in outputs if value)
        if len(content) > 12000000:
            content = content[:12000000] + '\n… Liste tronquée.'
        return {'content': content or 'Aucun fichier.'}
    except (OSError, KeyError, subprocess.TimeoutExpired):
        raise Refused('project-git-files-unavailable', 409) from None
