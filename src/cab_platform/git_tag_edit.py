"""Lecture et modification protégée d'un tag du commit local courant."""
import os
import pwd
import re
import subprocess
from django.db import connection
from .core.commands import Refused, require
from .core.models import Project
from .project_git import probe, _refresh_status


def git_context(project):
    require(probe(project) == 1, 'git-tag-unavailable', 409)
    try:
        user = pwd.getpwuid(project.owner_uid)
        group = project.owner_gid if project.owner_gid is not None else user.pw_gid
        require(os.geteuid() in (0, project.owner_uid), 'git-tag-unavailable', 409)
        options = {'user': project.owner_uid, 'group': group, 'extra_groups': os.getgrouplist(user.pw_name, group)} if os.geteuid() == 0 else {}
        env = {'PATH': '/usr/bin:/bin', 'HOME': user.pw_dir, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_OPTIONAL_LOCKS': '0', 'GIT_NO_LAZY_FETCH': '1', 'LANG': 'C.UTF-8'}
        return options, env
    except (OSError, KeyError):
        raise Refused('git-tag-unavailable', 409) from None


def run(project, options, env, *args, data=None):
    try:
        return subprocess.run(['/usr/bin/git', '-C', project.root, *args], cwd='/', env=env, input=data, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=20, **options)
    except (OSError, subprocess.TimeoutExpired):
        raise Refused('git-tag-uncertain', 409) from None


def valid_name(project, options, env, name):
    require(isinstance(name, str) and 0 < len(name) <= 200 and not name.startswith('-') and name == name.strip(), 'git-tag-invalid', 400)
    require(run(project, options, env, 'check-ref-format', 'refs/tags/' + name).returncode == 0, 'git-tag-invalid', 400)


def read_tag(project, name):
    options, env = git_context(project)
    valid_name(project, options, env, name)
    ref = 'refs/tags/' + name
    head = run(project, options, env, 'rev-parse', '--verify', 'HEAD^{commit}')
    target = run(project, options, env, 'rev-parse', '--verify', ref + '^{commit}')
    oid = run(project, options, env, 'rev-parse', '--verify', ref)
    require(head.returncode == target.returncode == oid.returncode == 0 and head.stdout.strip() == target.stdout.strip(), 'git-tag-unavailable', 409)
    obj = oid.stdout.decode('ascii', 'strict').strip()
    kind = run(project, options, env, 'cat-file', '-t', obj)
    require(kind.returncode == 0 and kind.stdout.strip() in (b'tag', b'commit'), 'git-tag-unavailable', 409)
    annotated = kind.stdout.strip() == b'tag'
    description = ''
    if annotated:
        data = run(project, options, env, 'cat-file', '-p', obj)
        require(data.returncode == 0 and len(data.stdout) <= 65536 and b'\n\n' in data.stdout, 'git-tag-unavailable', 409)
        message = data.stdout.split(b'\n\n', 1)[1]
        require(b'-----BEGIN PGP SIGNATURE-----' not in message and b'-----BEGIN SSH SIGNATURE-----' not in message, 'git-tag-signed', 409)
        description = message.decode('utf-8', 'replace').rstrip('\n')
    return {'name': name, 'description': description, 'object_id': obj, 'commit': head.stdout.decode('ascii').strip(), 'annotated': annotated}


def valid_new_name(project,options,env,name):
    from .versioning import validate_new_tag,VersionError
    try:validate_new_tag(name)
    except VersionError as error:raise Refused(str(error),400) from None
    valid_name(project,options,env,name)


def create_tag(project_id, name, description, expected_commit):
    require(isinstance(description, str) and len(description) <= 16000 and '\0' not in description, 'git-tag-invalid', 400)
    require(isinstance(expected_commit, str) and re.fullmatch(r'[0-9a-f]{40}|[0-9a-f]{64}', expected_commit) is not None, 'git-tag-changed', 409)
    project = Project.objects.get(pk=project_id)
    options, env = git_context(project)
    valid_new_name(project, options, env, name)
    with connection.cursor() as cursor:
        cursor.execute('SELECT pg_advisory_lock(%s, %s)', [7348501, 7348502])
    try:
        head = run(project, options, env, 'rev-parse', '--verify', 'HEAD^{commit}')
        require(head.returncode == 0 and head.stdout.decode('ascii').strip() == expected_commit, 'git-tag-changed', 409)
        exists = run(project, options, env, 'show-ref', '--verify', '--quiet', 'refs/tags/' + name)
        require(exists.returncode in (0, 1), 'git-tag-unavailable', 409)
        require(exists.returncode == 1, 'git-tag-exists', 409)
        target_oid = expected_commit
        if description:
            values = (project.public_metadata or {}).get('values', {})
            user_name, user_email = values.get('GIT_USER_NAME', ''), values.get('GIT_USER_EMAIL', '')
            require(bool(user_name and user_email), 'project-git-identity-missing', 409)
            ident = run(project, options, env, '-c', 'user.name=' + user_name, '-c', 'user.email=' + user_email, 'var', 'GIT_COMMITTER_IDENT')
            require(ident.returncode == 0 and b'\n' not in ident.stdout.strip(), 'git-tag-unavailable', 409)
            content = b'object ' + target_oid.encode('ascii') + b'\ntype commit\ntag ' + name.encode('utf-8') + b'\ntagger ' + ident.stdout.strip() + b'\n\n' + description.encode('utf-8') + b'\n'
            obj = run(project, options, env, 'mktag', data=content)
            require(obj.returncode == 0, 'git-tag-unavailable', 409)
            target_oid = obj.stdout.decode('ascii').strip()
        result = run(project, options, env, 'update-ref', 'refs/tags/' + name, target_oid, '0' * len(expected_commit))
        require(result.returncode == 0, 'git-tag-changed', 409)
        _refresh_status(project_id)
        return {'saved': True}
    finally:
        with connection.cursor() as cursor:
            cursor.execute('SELECT pg_advisory_unlock(%s, %s)', [7348501, 7348502])


def edit_tag(project_id, name, new_name, description, expected_oid, expected_commit):
    require(isinstance(description, str) and len(description) <= 16000 and '\0' not in description, 'git-tag-invalid', 400)
    require(isinstance(expected_oid, str) and isinstance(expected_commit, str), 'git-tag-changed', 409)
    project = Project.objects.get(pk=project_id)
    options, env = git_context(project)
    valid_name(project, options, env, name)
    require(isinstance(new_name, str), 'git-tag-invalid', 400)
    if new_name:
        valid_new_name(project, options, env, new_name)
    with connection.cursor() as cursor:
        cursor.execute('SELECT pg_advisory_lock(%s, %s)', [7348501, 7348502])
    try:
        current = read_tag(project, name)
        require(current['object_id'] == expected_oid and current['commit'] == expected_commit, 'git-tag-changed', 409)
        if not new_name:
            result = run(project, options, env, 'update-ref', '-d', 'refs/tags/' + name, expected_oid)
            require(result.returncode == 0, 'git-tag-changed', 409)
            _refresh_status(project_id)
            return {'saved': True, 'deleted': True}
        if new_name != name:
            exists = run(project, options, env, 'show-ref', '--verify', '--quiet', 'refs/tags/' + new_name)
            require(exists.returncode in (0, 1), 'git-tag-unavailable', 409)
            require(exists.returncode == 1, 'git-tag-exists', 409)
        if new_name == name and description == current['description']:
            return {'saved': True}
        target_oid = current['commit']
        if current['annotated'] or description:
            values = (project.public_metadata or {}).get('values', {})
            user_name, user_email = values.get('GIT_USER_NAME', ''), values.get('GIT_USER_EMAIL', '')
            require(bool(user_name and user_email), 'project-git-identity-missing', 409)
            ident = run(project, options, env, '-c', 'user.name=' + user_name, '-c', 'user.email=' + user_email, 'var', 'GIT_COMMITTER_IDENT')
            require(ident.returncode == 0 and b'\n' not in ident.stdout.strip(), 'git-tag-unavailable', 409)
            content = b'object ' + target_oid.encode('ascii') + b'\ntype commit\ntag ' + new_name.encode('utf-8') + b'\ntagger ' + ident.stdout.strip() + b'\n\n' + description.encode('utf-8') + b'\n'
            obj = run(project, options, env, 'mktag', data=content)
            require(obj.returncode == 0, 'git-tag-unavailable', 409)
            target_oid = obj.stdout.decode('ascii').strip()
        if new_name == name:
            commands = f'start\nupdate refs/tags/{name} {target_oid} {expected_oid}\nprepare\ncommit\n'
        else:
            commands = f'start\ncreate refs/tags/{new_name} {target_oid}\ndelete refs/tags/{name} {expected_oid}\nprepare\ncommit\n'
        result = run(project, options, env, 'update-ref', '--stdin', data=commands.encode('utf-8'))
        require(result.returncode == 0, 'git-tag-changed', 409)
        _refresh_status(project_id)
        return {'saved': True}
    finally:
        with connection.cursor() as cursor:
            cursor.execute('SELECT pg_advisory_unlock(%s, %s)', [7348501, 7348502])
