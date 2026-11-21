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
        objects = subprocess.run(['/usr/bin/git', '-C', project.root, 'count-objects', '-v'], cwd='/', env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=20, **options)
        if objects.returncode:
            return None
        object_stats = {}
        for line in objects.stdout.splitlines():
            key, separator, value = line.partition(b': ')
            if separator and value.isdigit():
                object_stats[key.decode('ascii', 'replace')] = int(value)
        keys = ('count', 'size', 'in-pack', 'packs', 'size-pack', 'prune-packable', 'garbage', 'size-garbage')
        if not all(key in object_stats for key in keys):
            return None
        state['object_stats'] = {key: object_stats[key] * 1024 if key in ('size', 'size-pack', 'size-garbage') else object_stats[key] for key in keys}
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
        state['commit_count'] = 0
        if state['commit']:
            count = subprocess.run(['/usr/bin/git', '-C', project.root, 'rev-list', '--count', state['commit']], cwd='/', env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=20, **options)
            if count.returncode or not count.stdout.strip().isdigit():
                return None
            state['commit_count'] = int(count.stdout.strip())
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


def commit_progress(project_id, request_id, stage):
    if not request_id:
        return
    from .core.models import ProjectMetadataProjection
    with transaction.atomic():
        project = Project.objects.select_for_update().get(pk=project_id)
        snapshot = dict(project.public_metadata or {})
        snapshot['git_commit_progress'] = {'request_id': request_id, 'stage': stage}
        snapshot['revision'] = int(snapshot.get('revision', 0)) + 1
        project.public_metadata = snapshot
        project.save(update_fields=['public_metadata'])
        ProjectMetadataProjection.objects.update_or_create(pk=project.pk, defaults={'public_metadata': snapshot})


def commit_local(project_id, tag=None, description="", expected_tag="", request_id="", console=None, *, author=None, email=None, date=None, tag_description=None):
    """Enregistre les modifications locales et, si demandé, un tag."""
    from django.db import connection
    project = Project.objects.get(pk=project_id)
    from .versioning import version_tag,validate_new_tag,VersionError
    try:
        if tag is None:tag=version_tag(project_version=(project.public_metadata or {}).get('values',{}).get('PROJECT_VERSION'))
        validate_new_tag(tag)
    except VersionError as error:raise Refused(str(error),400) from None
    require(isinstance(request_id, str) and len(request_id) <= 80 and all(c in '0123456789abcdef-' for c in request_id), 'project-git-commit-input-invalid', 400)
    require(project.creation_state == 'READY', 'project-git-unavailable', 409)
    require(isinstance(tag, str) and len(tag) <= 200 and not tag.startswith('-') and isinstance(description, str) and len(description) <= 2000 and '\0' not in description, 'project-git-commit-input-invalid', 400)
    require(isinstance(expected_tag, str) and (not expected_tag or len(expected_tag) in (40, 64) and all(c in '0123456789abcdef' for c in expected_tag)), 'project-git-tag-invalid', 400)
    tag, description = tag.strip(), description.strip()
    require(not tag.startswith('-'), 'project-git-tag-invalid', 400)
    message = description or 'Mise à jour du projet'
    values = (project.public_metadata or {}).get('values', {})
    name, configured_email = values.get('GIT_USER_NAME', ''), values.get('GIT_USER_EMAIL', '')
    require(bool(name and configured_email), 'project-git-identity-missing', 409)
    require(tag_description is None or isinstance(tag_description,str) and len(tag_description)<=16000 and '\0' not in tag_description,'git-tag-invalid',400)
    require(bool(tag) or not tag_description,'git-tag-invalid',400)
    tag_message=message if tag_description is None else tag_description
    metadata_env={}
    if author is not None or email is not None or date is not None:
        from datetime import datetime
        from .git_commit_metadata import author_line
        chosen_author=name if author is None else author
        chosen_email=configured_email if email is None else email
        raw=author_line(chosen_author,chosen_email,datetime.now().astimezone().replace(microsecond=0).isoformat() if date is None else date)
        metadata_env={'GIT_AUTHOR_NAME':chosen_author,'GIT_AUTHOR_EMAIL':chosen_email}
        if date is not None:
            stamp=raw.rsplit(b'> ',1)[1].decode('ascii')
            metadata_env.update(GIT_AUTHOR_DATE=stamp,GIT_COMMITTER_DATE=stamp)
    state = probe(project)
    require(state is not None, 'project-git-unavailable', 409)
    try:
        user = pwd.getpwuid(project.owner_uid)
        group = project.owner_gid if project.owner_gid is not None else user.pw_gid
        options = {'user': project.owner_uid, 'group': group, 'extra_groups': os.getgrouplist(user.pw_name, group)} if os.geteuid() == 0 else {}
        env = {'PATH': '/usr/bin:/bin', 'HOME': user.pw_dir, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_TERMINAL_PROMPT': '0', 'GIT_NO_LAZY_FETCH': '1', **metadata_env}
    except (OSError, KeyError):
        raise Refused('project-git-unavailable', 409) from None
    commit_progress(project_id, request_id, 'waiting')
    with connection.cursor() as cursor:
        cursor.execute('SELECT pg_advisory_lock(%s, %s)', [7348501, 7348502])
    try:
        def git(*args, timeout=30):
            command = ['/usr/bin/git', '-C', project.root, *args]
            if console is None:
                return subprocess.run(command, cwd='/', env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=timeout, **options).returncode
            import codecs
            import selectors
            import time
            console('$ git ' + args[0] + (' …' if len(args) > 1 else '') + '\n')
            process = subprocess.Popen(command, cwd='/', env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, **options)
            deadline = time.monotonic() + timeout
            decoder = codecs.getincrementaldecoder('utf-8')('replace')
            try:
                with selectors.DefaultSelector() as selector:
                    selector.register(process.stdout, selectors.EVENT_READ)
                    while True:
                        remaining = deadline - time.monotonic()
                        if remaining <= 0:
                            process.kill()
                            process.wait()
                            raise subprocess.TimeoutExpired(command, timeout)
                        if not selector.select(min(remaining, 1)):
                            continue
                        chunk = os.read(process.stdout.fileno(), 4096)
                        if not chunk:
                            break
                        console(decoder.decode(chunk))
                tail = decoder.decode(b'', final=True)
                if tail:
                    console(tail)
                return process.wait(timeout=max(0.01, deadline - time.monotonic()))
            finally:
                process.stdout.close()
                if process.poll() is None:
                    process.kill()
                    process.wait()
        def git_output(*args, input_data=None):
            return subprocess.run(['/usr/bin/git', '-C', project.root, *args], cwd='/', env=env, input=input_data, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=30, **options)
        created = False
        existing_tag = ''
        try:
            commit_progress(project_id, request_id, 'checking')
            if tag:
                require(git('check-ref-format', 'refs/tags/' + tag) == 0, 'project-git-tag-invalid', 400)
                if state == 1:
                    tag_exists = git('show-ref', '--verify', '--quiet', 'refs/tags/' + tag)
                    require(tag_exists in (0, 1), 'project-git-commit-failed', 409)
                    if tag_exists == 0:
                        current = git_output('rev-parse', '--verify', 'refs/tags/' + tag)
                        require(current.returncode == 0, 'project-git-commit-failed', 409)
                        existing_tag = current.stdout.decode('ascii').strip()
                        if not expected_tag:
                            commit_progress(project_id, request_id, 'confirmation')
                            return {'created': False, 'tag_conflict': existing_tag}
                        require(existing_tag == expected_tag, 'project-git-tag-changed', 409)
                    else:
                        require(not expected_tag, 'project-git-tag-changed', 409)
                else:
                    require(not expected_tag, 'project-git-tag-changed', 409)
            if state == 0:
                commit_progress(project_id, request_id, 'initializing')
                initialize(project_id)
            commit_progress(project_id, request_id, 'identity')
            require(git('config', '--local', 'user.name', name) == 0, 'project-git-commit-failed', 409)
            require(git('config', '--local', 'user.email', configured_email) == 0, 'project-git-commit-failed', 409)
            commit_progress(project_id, request_id, 'staging')
            require(git('add', '.') == 0, 'project-git-commit-failed', 409)
            difference = git('diff', '--cached', '--quiet')
            require(difference in (0, 1), 'project-git-commit-failed', 409)
            if difference == 1:
                commit_progress(project_id, request_id, 'committing')
                require(git('commit', '-m', message, timeout=120) == 0, 'project-git-commit-failed', 409)
                created = True
                if tag:
                    commit_progress(project_id, request_id, 'tagging')
                if tag and existing_tag:
                    head = git_output('rev-parse', '--verify', 'HEAD')
                    ident = git_output('var', 'GIT_COMMITTER_IDENT')
                    require(head.returncode == 0 and ident.returncode == 0, 'project-git-tag-create-failed', 409)
                    contents = b'object ' + head.stdout.strip() + b'\ntype commit\ntag ' + tag.encode('utf-8') + b'\ntagger ' + ident.stdout.strip() + b'\n\n' + tag_message.encode('utf-8') + b'\n'
                    tag_object = git_output('mktag', input_data=contents)
                    require(tag_object.returncode == 0, 'project-git-tag-create-failed', 409)
                    require(git('update-ref', 'refs/tags/' + tag, tag_object.stdout.decode('ascii').strip(), existing_tag) == 0, 'project-git-tag-move-failed', 409)
                elif tag:
                    require(git('tag', '-a', '-m', tag_message, '--', tag) == 0, 'project-git-tag-create-failed', 409)
        except (OSError, subprocess.TimeoutExpired):
            raise Refused('project-git-commit-uncertain', 409) from None
        finally:
            commit_progress(project_id, request_id, 'refreshing')
            _refresh_status(project_id)
    finally:
        with connection.cursor() as cursor:
            cursor.execute('SELECT pg_advisory_unlock(%s, %s)', [7348501, 7348502])
    commit_progress(project_id, request_id, 'completed' if created else 'unchanged')
    return {'created': created}


def clean_packed_objects(project_id):
    """Supprime les copies libres déjà présentes dans un pack, puis réconcilie."""
    from django.db import connection
    project = Project.objects.get(pk=project_id)
    require(probe(project) == 1, 'project-git-unavailable', 409)
    try:
        user = pwd.getpwuid(project.owner_uid)
        group = project.owner_gid if project.owner_gid is not None else user.pw_gid
        options = {'user': project.owner_uid, 'group': group, 'extra_groups': os.getgrouplist(user.pw_name, group)} if os.geteuid() == 0 else {}
        env = {'PATH': '/usr/bin:/bin', 'HOME': user.pw_dir, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_OPTIONAL_LOCKS': '0', 'GIT_NO_LAZY_FETCH': '1'}
    except (OSError, KeyError):
        raise Refused('project-git-clean-unavailable', 409) from None
    with connection.cursor() as cursor:
        cursor.execute('SELECT pg_advisory_lock(%s, %s)', [7348501, 7348502])
    try:
        try:
            result = subprocess.run(['/usr/bin/git', '-C', project.root, 'prune-packed'], cwd='/', env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=20, **options)
            cleaned = result.returncode == 0
        except (OSError, subprocess.TimeoutExpired):
            cleaned = False
        state = _refresh_status(project_id)
    finally:
        with connection.cursor() as cursor:
            cursor.execute('SELECT pg_advisory_unlock(%s, %s)', [7348501, 7348502])
    require(cleaned, 'project-git-clean-failed', 409)
    require(state is not None and state.get('available'), 'project-git-clean-status-unavailable', 409)
    return state


def refresh_status(project_id, manual=False):
    import time
    from django.db import connection
    from django.utils import timezone
    from .core.models import GitProject
    from .git_monitor_config import read
    requested_at = timezone.now()
    while True:
        with connection.cursor() as cursor:
            cursor.execute('SELECT pg_advisory_lock(%s, %s)', [7348501, 7348502])
        try:
            latest = GitProject.objects.filter(project_id=project_id).values('checked_at', 'state').first()
            last = latest['checked_at'] if latest else None
            if not manual and last and last >= requested_at:
                return latest['state']
            remaining = read()['interval_seconds'] - (timezone.now() - last).total_seconds() if last else 0
            if manual or remaining <= 0:
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
        from .forge_comparison import enqueue
        transaction.on_commit(lambda: enqueue(project_id))
        return state


def commit_overview(project, commit, history_head=None):
    import re
    require(isinstance(commit, str) and re.fullmatch(r'[0-9a-f]{40}|[0-9a-f]{64}', commit) is not None, 'project-git-commit-invalid', 400)
    from .core.models import GitProject
    if history_head is None:
        record = GitProject.objects.filter(project=project).first()
        require(record is not None and record.state.get('commit') == commit, 'project-git-commit-unavailable', 409)
    else:
        require(isinstance(history_head, str) and re.fullmatch(r'[0-9a-f]{40}|[0-9a-f]{64}', history_head) is not None, 'project-git-commit-invalid', 400)
    require(probe(project) == 1, 'project-git-commit-unavailable', 409)
    try:
        user = pwd.getpwuid(project.owner_uid)
        group = project.owner_gid if project.owner_gid is not None else user.pw_gid
        options = {'user': project.owner_uid, 'group': group, 'extra_groups': os.getgrouplist(user.pw_name, group)} if os.geteuid() == 0 else {}
        env = {'PATH': '/usr/bin:/bin', 'HOME': user.pw_dir, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_OPTIONAL_LOCKS': '0', 'GIT_NO_LAZY_FETCH': '1', 'PAGER': 'cat'}
        if history_head is not None:
            git = ['/usr/bin/git', '-C', project.root, '-c', 'core.fsmonitor=false']
            current = subprocess.run([*git, 'rev-parse', '--verify', 'HEAD^{commit}'], cwd='/', env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=20, **options)
            require(current.returncode == 0 and current.stdout.decode('ascii', 'strict').strip() == history_head, 'project-git-commit-unavailable', 409)
            ancestor = subprocess.run([*git, 'merge-base', '--is-ancestor', commit, history_head], cwd='/', env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=20, **options)
            require(ancestor.returncode == 0, 'project-git-commit-unavailable', 409)
        fmt = 'format:Commit           : %H%nAuteur           : %an <%ae>%nDate commit      : %cd%nRéférences       : %D%n'
        if history_head is not None:
            fmt += 'Message          : %s%n'
        result = subprocess.run(['/usr/bin/git', '-C', project.root, '-c', 'core.fsmonitor=false', 'show', '--no-color', '--no-ext-diff', '--no-renames', '--decorate=short', '--date=iso-local', '--stat=120,85', '--stat-count=1000', '--format='+fmt, commit, '--'], cwd='/', env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=20, **options)
        require(result.returncode == 0, 'project-git-commit-unavailable', 409)
        require(len(result.stdout) <= 1048576, 'project-git-commit-too-large', 409)
        return {'content': result.stdout.decode('utf-8', 'replace')}
    except (OSError, KeyError, UnicodeError, subprocess.TimeoutExpired):
        raise Refused('project-git-commit-unavailable', 409) from None



def commit_history(project, page=1, head='', search=''):
    import re
    require(isinstance(page, int) and 1 <= page <= 100000 and (not head or re.fullmatch(r'[0-9a-f]{40}|[0-9a-f]{64}', head)), 'project-git-history-invalid', 400)
    require(isinstance(search, str) and len(search) <= 200 and '\0' not in search, 'project-git-history-invalid', 400)
    require(probe(project) == 1, 'project-git-history-unavailable', 409)
    try:
        user = pwd.getpwuid(project.owner_uid)
        group = project.owner_gid if project.owner_gid is not None else user.pw_gid
        options = {'user': project.owner_uid, 'group': group, 'extra_groups': os.getgrouplist(user.pw_name, group)} if os.geteuid() == 0 else {}
        env = {'PATH': '/usr/bin:/bin', 'HOME': user.pw_dir, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_OPTIONAL_LOCKS': '0', 'GIT_NO_LAZY_FETCH': '1', 'PAGER': 'cat'}
        base = ['/usr/bin/git', '-C', project.root, '-c', 'core.fsmonitor=false']
        if not head:
            result = subprocess.run([*base, 'rev-parse', '--verify', 'HEAD^{commit}'], cwd='/', env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=20, **options)
            require(result.returncode == 0, 'project-git-history-unavailable', 409)
            head = result.stdout.decode('ascii', 'strict').strip()
            require(re.fullmatch(r'[0-9a-f]{40}|[0-9a-f]{64}', head) is not None, 'project-git-history-unavailable', 409)
        if not search:
            total_result = subprocess.run([*base, 'rev-list', '--count', head], cwd='/', env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=20, **options)
            require(total_result.returncode == 0 and total_result.stdout.strip().isdigit(), 'project-git-history-unavailable', 409)
            total_pages = max(1, (int(total_result.stdout.strip()) + 24) // 25)
        command = [*base, 'log', '-z', '--no-color', '--decorate=short', '--date=iso', '--format=%H%x00%cd%x00%an%x00%D%x00%s']
        if not search:
            command.extend(['--max-count=26', '--skip='+str((page-1)*25)])
        result = subprocess.run([*command, head, '--'], cwd='/', env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=20, **options)
        require(result.returncode == 0 and len(result.stdout) <= (16777216 if search else 1048576), 'project-git-history-unavailable', 409)
        fields = result.stdout.split(b'\0')
        if fields and not fields[-1]: fields.pop()
        require(len(fields) % 5 == 0, 'project-git-history-unavailable', 409)
        entries = [dict(zip(('commit','date','author','refs','subject'), (field.decode('utf-8', 'replace') for field in fields[i:i+5]))) for i in range(0, len(fields), 5)]
        if search:
            needle = search.casefold()
            entries = [entry for entry in entries if needle in ' | '.join(entry.values()).casefold()]
            total_pages = max(1, (len(entries) + 24) // 25)
            entries = entries[(page-1)*25:page*25+1]
        return {'head': head, 'page': page, 'total_pages': total_pages, 'entries': entries[:25], 'has_next': len(entries)>25}
    except (OSError, KeyError, UnicodeError, subprocess.TimeoutExpired):
        raise Refused('project-git-history-unavailable', 409) from None

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


def branches_overview(project):
    """Références locales uniquement ; aucune connexion aux dépôts distants."""
    import re
    from urllib.parse import urlsplit
    require(probe(project) == 1, 'project-git-branches-unavailable', 409)
    try:
        user = pwd.getpwuid(project.owner_uid)
        group = project.owner_gid if project.owner_gid is not None else user.pw_gid
        options = {'user': project.owner_uid, 'group': group, 'extra_groups': os.getgrouplist(user.pw_name, group)} if os.geteuid() == 0 else {}
        env = {'PATH': '/usr/bin:/bin', 'HOME': user.pw_dir, 'LANG': 'fr_FR.UTF-8', 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_OPTIONAL_LOCKS': '0', 'GIT_NO_LAZY_FETCH': '1', 'GIT_TERMINAL_PROMPT': '0', 'GIT_ALLOW_PROTOCOL': 'https:ssh:file:git', 'PAGER': 'cat'}

        def git(*args, required=True):
            result = subprocess.run(['/usr/bin/git', '-C', project.root, '-c', 'core.fsmonitor=false', '-c', 'color.ui=false', *args], cwd='/', env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=15, **options)
            if result.returncode:
                if required:raise Refused('project-git-branches-unavailable', 409)
                return ''
            require(len(result.stdout) <= 1048576, 'project-git-branches-too-large', 409)
            return result.stdout.decode('utf-8', 'replace').strip('\n')

        def safe_url(value):
            if not value or any(ord(c) < 32 for c in value):return '[adresse masquée]'
            try:
                parts = urlsplit(value)
                if parts.scheme not in ('http', 'https', 'git') or not parts.hostname or parts.username is not None or parts.password is not None or parts.query or parts.fragment:
                    return '[adresse masquée]'
                if re.search(r'(?i)(token|password|secret|credential|auth)[=/]', parts.path):return '[adresse masquée]'
                return value
            except ValueError:
                return '[adresse masquée]'

        local = git('branch', '--list', '-vv', '--no-abbrev') or 'Aucune branche locale.'
        remote = git('branch', '--remotes', '-v', '--no-abbrev') or 'Aucune branche distante connue localement.'
        upstream = git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}', required=False)
        counts = git('rev-list', '--left-right', '--count', 'HEAD...@{upstream}', required=False).split() if upstream else []
        ahead, behind = counts if len(counts) == 2 and all(part.isdigit() for part in counts) else ('—', '—')
        sections = ['### Branches locales ###\n\n' + local, '### Branches distantes ###\n\n' + remote, '### Synchronisation avec la branche distante ###\n\nBranche suivie     : ' + (upstream or 'Aucune') + '\nCommits en avance  : ' + ahead + '\nCommits en retard  : ' + behind]
        names = git('remote').splitlines()
        require(len(names) <= 64, 'project-git-branches-too-large', 409)
        remote_lines = []
        details = []
        for name in names:
            require(bool(re.fullmatch(r'[A-Za-z0-9._-]{1,200}', name)), 'project-git-branches-unavailable', 409)
            for direction, arguments in [('fetch', ()), ('push', ('--push',))]:
                for url in git('remote', 'get-url', '--all', *arguments, name, required=False).splitlines():
                    remote_lines.append(name + '  ' + safe_url(url) + ' (' + direction + ')')
            detail = git('remote', 'show', '-n', name, required=False)
            cleaned = []
            for line in detail.splitlines():
                if re.search(r'(?i)(url\s+(de\s+)?(rapatriement|récupération|push)|fetch url|push\s+url)', line):
                    prefix, separator, value = line.partition(':')
                    cleaned.append(prefix + separator + ' ' + safe_url(value.strip()) if separator else '[adresse masquée]')
                else:
                    cleaned.append(line)
            details.append('--- ' + name + ' ---\n' + ('\n'.join(cleaned) or 'Détails indisponibles.'))
        sections.append('### Dépôts distants ###\n\n' + ('\n'.join(remote_lines) or 'Aucun dépôt distant.'))
        if details:sections.append('Détails locaux des dépôts distants :\n\n' + '\n\n'.join(details))
        return {'content': '\n\n'.join(sections)}
    except (OSError, KeyError, subprocess.TimeoutExpired):
        raise Refused('project-git-branches-unavailable', 409) from None
