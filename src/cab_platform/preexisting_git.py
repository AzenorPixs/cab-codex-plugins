"""Admission explicite de fichiers préexistants, sans réécrire la baseline."""
from contextlib import contextmanager
import hashlib
import os
from pathlib import Path
import stat

from django.db import connection, transaction
from .core import commands as c
from .core.models import Event, GitChange, GitFileReservation, GitSessionIndex
from .git_commit_remove import context, run as git_run

MAX_BYTES = 64 * 1024 * 1024


@contextmanager
def git_guard():
    with connection.cursor() as cursor:
        cursor.execute('SELECT pg_advisory_lock(%s,%s)', [7348501, 7348502])
    try:
        yield
    finally:
        with connection.cursor() as cursor:
            cursor.execute('SELECT pg_advisory_unlock(%s,%s)', [7348501, 7348502])


def validate_paths(paths):
    from .session_git import _visible_entry
    c.require(isinstance(paths, list) and 0 < len(paths) <= 128 and all(isinstance(path, str) and path and '\0' not in path and len(path) <= 1500 for path in paths), 'session-git-paths-invalid', 400)
    c.require(len(set(paths)) == len(paths), 'session-git-paths-invalid', 400)
    for path in paths:
        try:
            path.encode('utf-8')
        except UnicodeError as error:
            raise c.Refused('session-git-path-invalid', 400) from error
        c.require(str(Path(path)) == path and path != 'STATISTICS.md' and _visible_entry('?', path) is not None, 'session-git-path-invalid', 400)
    return sorted(paths)


def fingerprint(root, path):
    target = c.safe_path(Path(root), path)
    try:
        fd = os.open(target, os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC | os.O_NONBLOCK)
    except OSError as error:
        raise c.Refused('session-git-preexisting-source-changed', 409) from error
    try:
        before = os.fstat(fd)
        c.require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1 and before.st_size <= MAX_BYTES, 'session-git-preexisting-file-unsafe', 409)
        digest = hashlib.sha256()
        total = 0
        while chunk := os.read(fd, 1024 * 1024):
            total += len(chunk)
            c.require(total <= MAX_BYTES, 'session-git-preexisting-file-unsafe', 409)
            digest.update(chunk)
        after = os.fstat(fd)
        names = ('st_dev', 'st_ino', 'st_mode', 'st_nlink', 'st_uid', 'st_gid', 'st_size', 'st_mtime_ns', 'st_ctime_ns')
        c.require(all(getattr(before, name) == getattr(after, name) for name in names), 'session-git-preexisting-source-changed', 409)
        current = target.lstat()
        c.require((current.st_dev, current.st_ino) == (after.st_dev, after.st_ino), 'session-git-preexisting-source-changed', 409)
        return {'sha256': digest.hexdigest(), 'mode': stat.S_IMODE(after.st_mode), 'uid': after.st_uid, 'gid': after.st_gid, 'size': after.st_size, 'device': after.st_dev, 'inode': after.st_ino, 'mtime_ns': after.st_mtime_ns, 'ctime_ns': after.st_ctime_ns}
    except OSError as error:
        raise c.Refused('session-git-preexisting-source-changed', 409) from error
    finally:
        os.close(fd)


def protected_boundary(current):
    from .core.run_lifecycle import guard
    c.working(current)
    guard(current, allow_measurement=True)
    c.require(current.actor.active and not current.suspension and not current.review and not current.mandate.get('native_frozen_at') and not current.mandate.get('legacy_snapshot_id'), 'session-git-preexisting-protected', 409)


def scoped_entries(snapshot, paths):
    return sorted((item for item in snapshot['entries'] if item['path'] in paths or item.get('previous') in paths), key=lambda item: item['path'])


def file_state(current, path, snapshot, options, env):
    from .session_git import shared_scope_digest
    entries = scoped_entries(snapshot, {path})
    c.require(entries and not any(item.get('previous') or 'U' in item['status'] for item in entries), 'session-git-preexisting-status-unsupported', 409)
    literal = {**env, 'GIT_LITERAL_PATHSPECS': '1'}
    ignored = git_run(current.project, options, env, 'check-ignore', '--quiet', '--', './' + path)
    c.require(ignored.returncode == 1, 'session-git-ignored', 409)
    staged = git_run(current.project, options, literal, 'diff', '--cached', '--name-only', '-z', 'HEAD', '--', path)
    c.require(staged.returncode == 0 and not staged.stdout, 'session-git-preexisting-shared-index-conflict', 409)
    target=c.safe_path(Path(current.project.root),path,exists=False)
    if target.exists():
        observed=fingerprint(current.project.root,path)
    else:
        c.require(len(entries)==1 and entries[0]['status']=='.D','session-git-preexisting-status-unsupported',409)
        baseline=git_run(current.project, options, literal, 'ls-tree', '-z', snapshot['head'], '--', path)
        c.require(baseline.returncode==0,'session-git-unavailable',409)
        metadata,separator,name=baseline.stdout.rstrip(b'\0').partition(b'\t')
        fields=metadata.split()
        c.require(separator and name==path.encode('utf-8') and len(fields)==3
                  and fields[0] in (b'100644',b'100755') and fields[1]==b'blob',
                  'session-git-preexisting-status-unsupported',409)
        c.require(not target.exists(),'session-git-preexisting-source-changed',409)
        observed={'absent':True,'size':0,'mode':fields[0].decode(),'head_oid':fields[2].decode()}
    return {'file': observed, 'entries': entries, 'shared_index_digest': shared_scope_digest(current.project, options, env, [path])}


def observe(current, paths):
    from .session_git import git_snapshot
    protected_boundary(current)
    native = c.resolve_native(current.actor, current.project, current.session_id, {'codex_home': current.mandate.get('native_source_home', '')}, run=current)
    c.require(native == current.mandate.get('native_source') and native, 'native-source-resume-required', 409)
    baseline = GitChange.objects.select_for_update().filter(change_id=current.change_record_id).first()
    c.require(baseline is not None and baseline.baseline.get('available') is True, 'session-git-baseline-unavailable', 409)
    index = GitSessionIndex.objects.select_for_update().filter(change_id=current.change_record_id, session_id=current.coding_session_id).first()
    c.require(index is None or index.state in ('PENDING', 'OPEN'), 'session-git-preexisting-index-protected', 409)
    for path in paths:
        c.require(any(path == scope or path.startswith(scope + '/') for scope in current.mandate['paths']), 'session-git-outside-mandate', 403)
        c.safe_path(Path(current.project.root), path, exists=False)
    c.require(not GitFileReservation.objects.filter(project=current.project, active=True, path__in=paths).exists(), 'session-git-reserved', 409)
    snapshot = git_snapshot(current.project)
    c.require(snapshot['available'] and snapshot['head'] and snapshot['branch'] != '(detached)', 'session-git-unavailable', 409)
    options, env = context(current.project)
    files = {}
    total = 0
    for path in paths:
        files[path] = file_state(current, path, snapshot, options, env)
        total += files[path]['file']['size']
        c.require(total <= MAX_BYTES, 'session-git-preexisting-file-unsafe', 409)
    revision = c.revision(current)
    latest = git_snapshot(current.project)
    c.require(latest['head'] == snapshot['head'] and files == {path: file_state(current, path, latest, options, env) for path in paths} and revision == c.revision(current), 'session-git-preexisting-source-changed', 409)
    return {'scope': {'project_id': current.project_id, 'run_id': current.run_id, 'session_id': current.session_id, 'generation': current.generation, 'actor_id': current.actor_id, 'change': current.change}, 'framing_digest': current.mandate['framing_digest'], 'source_revision': revision, 'baseline_digest': c.digest(baseline.baseline), 'head': snapshot['head'], 'index_id': index.pk if index else None, 'files': files}


def inspect_preexisting(actor, data: dict) -> dict:
    c.require(actor.active and actor.role == 'admin', 'session-git-administrator-required', 403)
    c.require(set(data) == {'project_id', 'run_id', 'paths'}, 'session-git-fields-invalid', 400)
    paths = validate_paths(data['paths'])
    with git_guard(), transaction.atomic():
        current = c.run_scope(actor, data['run_id'], data['project_id'], lock=True, owner=False)
        return {'expected_state': observe(current, paths), 'effects_issued': False}


def authorize_preexisting(actor, data: dict) -> dict:
    c.require(actor.active and actor.role == 'admin', 'session-git-administrator-required', 403)
    c.require(set(data) == {'project_id', 'run_id', 'request_id', 'paths', 'expected_state', 'authorization'}, 'session-git-fields-invalid', 400)
    paths = validate_paths(data['paths'])
    key = c.identifier(data['request_id'])
    c.require(isinstance(data['authorization'], str) and 20 <= len(data['authorization'].strip()) <= 4000 and isinstance(data['expected_state'], dict), 'session-git-authorization-required', 400)
    request_digest = c.digest({**data, 'paths': paths})
    with git_guard(), transaction.atomic():
        current = c.run_scope(actor, data['run_id'], data['project_id'], lock=True, owner=False)
        previous = Event.objects.filter(run=current, kind='git-preexisting-authorized', data__request_id=key).first()
        if previous:
            c.require(previous.data['request_digest'] == request_digest, 'session-git-request-conflict', 409)
            return previous.data['receipt']
        observed = observe(current, paths)
        c.require(c.digest(observed) == c.digest(data['expected_state']), 'session-git-preexisting-source-changed', 409)
        grant_id = c.digest([current.pk, key, observed])
        receipt = {'request_id': key, 'grant_id': grant_id, 'paths': paths, 'observation_digest': c.digest(observed), 'baseline_preserved': True, 'index_changed': False, 'effects_issued': False}
        c.event(current, 'git-preexisting-authorized', {'request_id': key, 'request_digest': request_digest, 'authority': actor.pk, 'authorization': data['authorization'], 'paths': paths, 'observation': observed, 'receipt': receipt})
        return receipt


def matching_authorization(current, index, path, snapshot):
    record = Event.objects.filter(run=current, kind='git-preexisting-authorized', data__paths__contains=[path]).order_by('-pk').first()
    if record is None:
        return None
    protected_boundary(current)
    observed = record.data['observation']
    scope = observed['scope']
    expected_scope = {'project_id': current.project_id, 'run_id': current.run_id, 'session_id': current.session_id, 'generation': current.generation, 'actor_id': current.actor_id, 'change': current.change}
    if scope != expected_scope or observed['framing_digest'] != current.mandate.get('framing_digest') or observed['head'] != snapshot['head']:
        return None
    baseline = GitChange.objects.get(change_id=current.change_record_id)
    if c.digest(baseline.baseline) != observed['baseline_digest']:
        return None
    if observed['index_id'] is None:
        if index.initial_run_id != current.pk or index.state != 'PENDING':
            return None
    elif observed['index_id'] != index.pk:
        return None
    options, env = context(current.project)
    if file_state(current, path, snapshot, options, env) != observed['files'].get(path):
        return None
    return {'path': path, 'grant_id': record.data['receipt']['grant_id'], 'observation_digest': record.data['receipt']['observation_digest']}


def clean_at_head(current, path, snapshot):
    """Un ancien statut dirty ne constitue pas une modification actuelle."""
    protected_boundary(current)
    target = c.safe_path(Path(current.project.root), path, exists=False)
    if not target.is_file():
        return False
    observed = fingerprint(current.project.root, path)
    options, env = context(current.project)
    listed = git_run(current.project, options, {**env, 'GIT_LITERAL_PATHSPECS': '1'}, 'ls-tree', '-z', snapshot['head'], '--', path)
    if listed.returncode != 0:
        return False
    entries = [entry for entry in listed.stdout.split(b'\0') if entry]
    if len(entries) != 1:
        return False
    header, name = entries[0].split(b'\t', 1)
    fields = header.split()
    mode = b'100755' if observed['mode'] & 0o111 else b'100644'
    filemode = git_run(current.project, options, env, 'config', '--type=bool', '--get', 'core.filemode')
    if filemode.returncode not in (0, 1) or (filemode.returncode == 0 and filemode.stdout.strip() not in (b'true', b'false')):
        return False
    tracks_mode = filemode.returncode != 0 or filemode.stdout.strip() != b'false'
    if len(fields) != 3 or fields[0] not in (b'100644', b'100755') or (tracks_mode and fields[0] != mode) or fields[1] != b'blob' or name.decode('utf-8', 'strict') != path:
        return False
    size = git_run(current.project, options, env, 'cat-file', '-s', fields[2].decode('ascii'))
    if size.returncode != 0 or size.stdout.strip() != str(observed['size']).encode('ascii'):
        return False
    blob = git_run(current.project, options, env, 'cat-file', 'blob', fields[2].decode('ascii'))
    final_filemode = git_run(current.project, options, env, 'config', '--type=bool', '--get', 'core.filemode')
    return blob.returncode == 0 and hashlib.sha256(blob.stdout).hexdigest() == observed['sha256'] and observed == fingerprint(current.project.root, path) and (filemode.returncode, filemode.stdout) == (final_filemode.returncode, final_filemode.stdout)
