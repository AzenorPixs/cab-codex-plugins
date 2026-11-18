"""Indexation confirmée des fichiers suivis modifiés."""
import hashlib
import re
import subprocess
from django.db import connection
from .core.commands import Refused, require
from .core.models import Project
from .git_commit_remove import context, run
from .project_git import _refresh_status


def preview(project):
    options, env = context(project)
    result = run(project, options, env, 'status', '--porcelain=v2', '-z', '--untracked-files=all', '--ignore-submodules=all')
    require(result.returncode == 0 and len(result.stdout) <= 4194304, 'git-stage-preview-unavailable', 409)
    entries = iter(result.stdout.split(b'\0'))
    paths = []
    try:
        for entry in entries:
            if entry.startswith(b'1 '):
                parts = entry.split(b' ', 8)
                require(len(parts) == 9, 'git-stage-preview-unavailable', 409)
                if parts[1][1:2] != b'.': paths.append((parts[8], parts[1][1:2]))
            elif entry.startswith(b'2 '):
                parts = entry.split(b' ', 9)
                require(len(parts) == 10, 'git-stage-preview-unavailable', 409)
                next(entries)
                if parts[1][1:2] != b'.': paths.append((parts[9], parts[1][1:2]))
    except StopIteration:
        raise Refused('git-stage-preview-unavailable', 409) from None
    require(len(paths) <= 10000 and all(path and b'\0' not in path for path, _ in paths), 'git-stage-preview-unavailable', 409)
    digest = hashlib.sha256(result.stdout).hexdigest()
    return paths, digest


def describe(project):
    paths, digest = preview(project)
    try:
        files = [{'path': path.decode('utf-8', 'strict'), 'status': status.decode('ascii', 'strict')} for path, status in paths]
    except UnicodeError:
        raise Refused('git-stage-preview-unavailable', 409) from None
    return {'files': files, 'digest': digest}


def stage(project_id, digest):
    require(isinstance(digest, str) and re.fullmatch(r'[0-9a-f]{64}', digest), 'git-stage-preview-changed', 409)
    project = Project.objects.get(pk=project_id)
    options, env = context(project)
    with connection.cursor() as cursor:
        cursor.execute('SELECT pg_advisory_lock(%s, %s)', [7348501, 7348502])
    try:
        paths, current = preview(project)
        require(paths and current == digest, 'git-stage-preview-changed', 409)
        from .core.models import GitFileReservation
        try:names=[path.decode('utf-8','strict') for path,_ in paths]
        except UnicodeError:raise Refused('git-stage-preview-unavailable',409) from None
        require(not GitFileReservation.objects.filter(project=project,active=True,path__in=names).exists(),'project-git-reservations-active',409)
        try:
            result = subprocess.run(['/usr/bin/git', '-C', project.root, '-c', 'core.fsmonitor=false', 'add', '--update', '--pathspec-from-file=-', '--pathspec-file-nul'], input=b'\0'.join(path for path, _ in paths) + b'\0', cwd='/', env={**env, 'GIT_LITERAL_PATHSPECS': '1'}, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=120, **options)
        except (OSError, subprocess.TimeoutExpired):
            raise Refused('git-stage-result-unknown', 409) from None
        if result.returncode != 0:
            try: _refresh_status(project_id)
            except Exception: pass
            raise Refused('git-stage-result-unknown', 409)
        try: _refresh_status(project_id)
        except Exception: raise Refused('git-stage-result-unknown', 409) from None
        return {'staged': len(paths)}
    finally:
        with connection.cursor() as cursor:
            cursor.execute('SELECT pg_advisory_unlock(%s, %s)', [7348501, 7348502])
