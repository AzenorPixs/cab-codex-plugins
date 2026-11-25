"""Capture d'une livraison complète, sans écriture dans les index de travail."""
import hashlib
import os

from .core.commands import Refused, require
from .core.models import GitSessionEffect, GitSessionIndex
from .git_commit_remove import OID
from .session_git import _visible_entry, git_snapshot, shared_scope_digest


def index_entries(git, project, options, env, paths):
    selected = {}
    if not paths:
        return selected
    result = git(project, options, env, 'ls-files', '--stage', '-z')
    require(result.returncode == 0, 'session-delivery-index-invalid', 409)
    for record in result.stdout.split(b'\0'):
        if not record:
            continue
        metadata, name = record.split(b'\t', 1)
        path = name.decode('utf-8')
        if path not in paths:
            continue
        mode, oid, stage = metadata.decode('ascii').split()
        require(stage == '0' and mode in ('100644', '100755', '120000') and OID.fullmatch(oid),
                'session-delivery-full-index-conflict', 409)
        selected[path] = mode, oid
    return selected


def working_paths(snapshot):
    work, staged = set(), set()
    for entry in snapshot['entries']:
        status, path = entry['status'], entry['path']
        require('U' not in status and status not in ('AA', 'DD'), 'session-delivery-full-index-conflict', 409)
        names = {path}
        if 'previous' in entry:
            names.add(entry['previous'])
        if status == '??' or status[1] != '.':
            work.update(names)
        if status != '??' and status[0] != '.':
            staged.update(names)
    return work, staged


def write_entries(git, project, options, env, entries, oid_width):
    if not entries:
        return
    lines = []
    for path, value in sorted(entries.items()):
        metadata = '0 ' + '0' * oid_width if value is None else ' '.join(value)
        lines.append(metadata.encode('ascii') + b'\t' + path.encode('utf-8') + b'\0')
    result = git(project, options, env, 'update-index', '-z', '--index-info', data=b''.join(lines))
    require(result.returncode == 0, 'session-delivery-index-invalid', 409)


def publication_report(path):
    return path.rsplit('/',1)[-1] in ('STATISTICS.md','BLOCKERS.md')


def capture_full(project, own, options, env, head, gitdir,*,exclude_reports=False,reports_only=False):
    from .session_delivery import _changed_paths, _git, _index_digest, _temp_index

    require(not GitSessionEffect.objects.filter(run__project=project, state__in=('INTENT', 'RUNNING', 'UNKNOWN'))
            .exclude(git_index=own).exists(), 'session-delivery-full-effect-protected', 409)
    snapshot = git_snapshot(project)
    require(snapshot.get('head') == head, 'session-delivery-head-changed', 409)
    if reports_only:
        snapshot={**snapshot,'entries':[entry for entry in snapshot['entries']
                  if publication_report(entry['path']) or publication_report(entry.get('previous',''))]}
    work, staged = working_paths(snapshot)
    if reports_only:
        work={p for p in work if publication_report(p)};staged={p for p in staged if publication_report(p)}
    from .reports_git import report_path
    if exclude_reports:work={p for p in work if not report_path(p)};staged={p for p in staged if not report_path(p)}
    entries = index_entries(_git, project, options, env, staged - work)
    selected = {path: entries.get(path) for path in staged - work}
    current_head = {}
    tree_rows = _git(project, options, env, 'ls-tree', '-rz', head)
    require(tree_rows.returncode == 0, 'session-delivery-index-invalid', 409)
    for record in tree_rows.stdout.split(b'\0'):
        if record:
            fields, path = record.split(b'\t', 1)
            mode, _kind, oid = fields.decode('ascii').split()
            current_head[path] = mode, oid
    isolated = GitSessionIndex.objects.filter(change__project=project, state__in=('OPEN', 'COMMITTING'))
    for index in isolated.order_by('pk'):
        token = hashlib.sha256((str(index.change_id)+':'+str(index.session_id)).encode()).hexdigest()
        source = gitdir / 'cab-session-index' / (token + '.index')
        require(str(source) == index.index_path, 'session-delivery-index-invalid', 409)
        before = _index_digest(source, project.owner_uid)
        private = {**env, 'GIT_INDEX_FILE': str(source)}
        changed = {path for path in _changed_paths(project, options, private, index.base_head)
                   if _visible_entry('M.', path) is not None} - work
        if reports_only:changed={p for p in changed if publication_report(p)}
        if exclude_reports:changed={p for p in changed if not report_path(p)}
        blobs = index_entries(_git, project, options, private, changed)
        require(_index_digest(source, project.owner_uid) == before, 'session-delivery-index-changed', 409)
        for path in changed:
            value = blobs.get(path)
            if value == current_head.get(path.encode('utf-8')):
                continue
            if path in selected and selected[path] != value:
                raise Refused('session-delivery-full-index-conflict', 409)
            selected[path] = value
    names = sorted(work | set(selected))
    if reports_only and not names:
        return None
    require(names, 'session-delivery-full-empty', 409)
    temporary = _temp_index(str(gitdir / 'cab-session-index'), project)
    os.unlink(temporary)
    try:
        candidate = {**env, 'GIT_INDEX_FILE': temporary, 'GIT_LITERAL_PATHSPECS': '1'}
        require(_git(project, options, candidate, 'read-tree', head).returncode == 0,
                'session-delivery-index-invalid', 409)
        write_entries(_git, project, options, candidate, selected, len(head))
        work_entries = {path for path in work if path.encode('utf-8') in current_head
                        or os.path.lexists(os.path.join(project.root,path))}
        if reports_only:
            from pathlib import Path
            from .core.commands import safe_path
            for path in work_entries:
                safe_path(Path(project.root),path,exists=False)
        require(not any(os.path.isdir(os.path.join(project.root,path)) and
                        not os.path.islink(os.path.join(project.root,path)) for path in work_entries),
                'session-delivery-full-source-changed', 409)
        if work_entries:
            pathspec = b'\0'.join(path.encode('utf-8') for path in sorted(work_entries)) + b'\0'
            require(_git(project, options, candidate, 'add', '-A', '-f', '--pathspec-from-file=-',
                         '--pathspec-file-nul', data=pathspec).returncode == 0, 'session-delivery-index-invalid', 409)
        changed = _changed_paths(project, options, candidate, head)
        if reports_only and not changed:
            return None
        require(changed and set(changed).issubset(names), 'session-delivery-full-index-conflict', 409)
        captured=index_entries(_git, project, options, candidate, set(changed))
        if reports_only:
            require(all(mode in ('100644','100755') for mode,_ in captured.values()),
                    'session-delivery-report-type-invalid',409)
        tree = _git(project, options, candidate, 'write-tree')
        oid = tree.stdout.decode('ascii').strip()
        require(tree.returncode == 0 and OID.fullmatch(oid), 'session-delivery-index-invalid', 409)
        require(git_snapshot(project)['status_sha256'] == snapshot['status_sha256'],
                'session-delivery-full-source-changed', 409)
        paths = sorted(set(changed) | (staged & work))
        return {'head': head, 'tree': oid, 'paths': paths,
                'adoption': {'complete': True, 'paths': paths,
                             'shared_digest': shared_scope_digest(project, options, env, paths)}}
    finally:
        for file in (temporary, temporary + '.lock'):
            try:
                os.unlink(file)
            except FileNotFoundError:
                pass
