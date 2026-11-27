"""Instantané Git initial d'un change, conservé par CAB."""
import hashlib
import os
import re
import stat
import subprocess
from django.db import connection
from django.utils import timezone
from .core.commands import PROTECTED, SECRET, Refused, require
from .core.models import Change, GitChange
from .project_git import probe
from .git_commit_remove import context, run


def test_file(path):
    from pathlib import PurePosixPath
    parts=PurePosixPath(path).parts
    name=parts[-1] if parts else ''
    return (bool({'test','tests','__tests__','.cab-tests'}.intersection(parts))
            or name.startswith('test_') or name.endswith(('.test','.spec'))
            or '.test.' in name or '.spec.' in name or PurePosixPath(name).stem.endswith('_test'))


def delivery_files(index):
    paths=set(index.reservations.filter(active=True).values_list('path',flat=True))|set(index.origin.get('staged_sources',[]))
    return sorted(path for path in paths if not test_file(path))


def _written_fingerprint(project,path):
    from pathlib import Path
    from .core.commands import safe_path
    from .preexisting_git import fingerprint
    target=safe_path(Path(project.root),path,exists=False)
    return fingerprint(project.root,path) if target.exists() else None


def finish_writes(actor,data,connector_id=None):
    """Libère les baux d'écriture et conserve les octets à vérifier après les tests."""
    from django.db import transaction
    from .core import commands as c
    from .core.models import Event,GitFileReservation,GitSessionIndex,ResourceReservation
    from .preexisting_git import git_guard,validate_paths

    require(set(data)=={'project_id','run_id','request_id','paths'},'session-git-fields-invalid',400)
    paths=validate_paths(data['paths'])
    request_id=c.identifier(data['request_id'])
    with git_guard(),transaction.atomic():
        current=c.run_scope(actor,data['run_id'],data['project_id'],lock=True)
        if connector_id is not None:
            from .core.connectors import lock_worker_binding
            lock_worker_binding(actor,connector_id,current)
        prior=Event.objects.filter(run=current,kind='git-writes-finished',data__request_id=request_id).first()
        if prior:
            require(prior.data['paths']==paths,'session-git-request-conflict',409)
            return prior.data['receipt']
        c.working(current)
        require(c.no_pending(current),'session-git-effect-unresolved',409)
        index=GitSessionIndex.objects.select_for_update().filter(change_id=current.change_record_id,
            session_id=current.coding_session_id,state__in=('PENDING','OPEN')).first()
        require(index is not None,'session-git-index-unavailable',409)
        live=ResourceReservation.objects.filter(run=current,source='git',expires__gt=timezone.now())
        reservations=GitFileReservation.objects.filter(git_index=index,active=True,path__in=paths,
                                                         pk__in=live.values('source_id'))
        require(reservations.count()==len(paths),'session-git-reservation-required',409)
        snapshots={path:_written_fingerprint(current.project,path) for path in paths}
        index.origin={**index.origin,'finished_writes':{**index.origin.get('finished_writes',{}),**snapshots}}
        index.save(update_fields=['origin','updated'])
        reservations.update(active=False,released=timezone.now())
        receipt={'request_id':request_id,'state':'RELEASED','released_count':len(paths),'snapshot_digest':c.digest(snapshots)}
        c.event(current,'git-writes-finished',{'request_id':request_id,'paths':paths,'receipt':receipt})
        return receipt


def _visible_entry(status, path, previous=None):
    blocked = {'__pycache__', '.cache', '.npm', '.pytest_cache', '.mypy_cache', '.ruff_cache', '.cab-tests', 'tmp', 'output', 'reports'} | PROTECTED
    if SECRET.search(path) or any(part in blocked for part in path.split('/')):
        return None
    if previous and (SECRET.search(previous) or any(part in blocked for part in previous.split('/'))):
        return None
    item = {'status': status, 'path': path}
    if previous is not None:
        item['previous'] = previous
    return item


def git_snapshot(project, index_path=None):
    state = probe(project)
    require(state is not None, 'session-git-unavailable', 409)
    if state == 0:
        return {'available': False, 'reason': 'not-initialized', 'head': None, 'branch': None, 'entries': []}
    options, env = context(project)
    if index_path is not None:
        env = {**env, 'GIT_INDEX_FILE': index_path}
    result = run(project, options, env, 'status', '--porcelain=v2', '--branch', '--no-ahead-behind', '-z', '--untracked-files=all', '--ignore-submodules=none')
    require(result.returncode == 0 and len(result.stdout) <= 4194304, 'session-git-unavailable', 409)
    head, branch, entries, protected = None, None, [], 0
    items = iter(result.stdout.split(b'\0'))
    try:
        for item in items:
            if item.startswith(b'# branch.oid '):
                value = item[len(b'# branch.oid '):].decode('ascii', 'strict')
                head = None if value == '(initial)' else value
            elif item.startswith(b'# branch.head '):
                branch = item[len(b'# branch.head '):].decode('utf-8', 'strict')
            elif item.startswith(b'1 '):
                fields = item.split(b' ', 8)
                require(len(fields) == 9, 'session-git-unavailable', 409)
                entry = _visible_entry(fields[1].decode('ascii', 'strict'), fields[8].decode('utf-8', 'strict'))
                if entry is None: protected += 1
                else: entries.append(entry)
            elif item.startswith(b'2 '):
                fields = item.split(b' ', 9)
                require(len(fields) == 10, 'session-git-unavailable', 409)
                previous = next(items)
                entry = _visible_entry(fields[1].decode('ascii', 'strict'), fields[9].decode('utf-8', 'strict'), previous.decode('utf-8', 'strict'))
                if entry is None: protected += 1
                else: entries.append(entry)
            elif item.startswith(b'u '):
                fields = item.split(b' ', 10)
                require(len(fields) == 11, 'session-git-unavailable', 409)
                entry = _visible_entry(fields[1].decode('ascii', 'strict'), fields[10].decode('utf-8', 'strict'))
                if entry is None: protected += 1
                else: entries.append(entry)
            elif item.startswith(b'? '):
                entry = _visible_entry('??', item[2:].decode('utf-8', 'strict'))
                if entry is None: protected += 1
                else: entries.append(entry)
    except (StopIteration, UnicodeError) as error:
        raise Refused('session-git-unavailable', 409) from error
    require(branch is not None and len(entries) <= 10000, 'session-git-unavailable', 409)
    return {'available': True, 'head': head, 'branch': branch, 'entries': entries, 'protected_count': protected, 'status_sha256': hashlib.sha256(result.stdout).hexdigest()}


def _origin_if_supported(model, run, *, session=False):
    if not any(field.name=='origin' for field in model._meta.fields):
        return {}
    value={'run_id':run.run_id,'session_id':run.session_id}
    if session:value.update(agent=run.actor.agent,uid=run.actor.uid)
    return {'origin':value}


def capture_initial(run):
    """Sérialise la capture d'un change ; une reprise ne la remplace jamais."""
    with connection.cursor() as cursor:
        cursor.execute('SELECT id FROM projects WHERE id=%s FOR KEY SHARE', [run.project_id])
    change = Change.objects.select_for_update().get(pk=run.change_record_id)
    existing = GitChange.objects.filter(change=change).first()
    if existing is not None:
        return existing
    baseline = {**git_snapshot(run.project),'capture_kind':'initial'}
    return GitChange.objects.create(change=change, project=run.project, initial_run=run, baseline=baseline, captured_at=timezone.now(), **_origin_if_supported(GitChange,run))


def reserve_files(actor,data,connector_id=None):
    """Sérialise les réservations avec les opérations Git du projet."""
    with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_lock(%s,%s)',[7348501,7348502])
    try:return _reserve_files_locked(actor,data,connector_id)
    finally:
        with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_unlock(%s,%s)',[7348501,7348502])


def _reserve_files_locked(actor, data, connector_id=None):
    """Réserve les fichiers propres du mandat avant leur modification."""
    from pathlib import Path
    from django.db import transaction
    from .core.commands import digest, event, identifier, run_scope, safe_path, working
    from .core.models import Event, GitDelivery, GitFileReservation, GitSessionIndex, Project

    require(set(data) == {'project_id', 'run_id', 'request_id', 'paths'}, 'session-git-fields-invalid', 400)
    request_id = identifier(data['request_id'])
    paths = data['paths']
    require(isinstance(paths, list) and 0 < len(paths) <= 256 and all(isinstance(path, str) and path and '\0' not in path and len(path) <= 1500 for path in paths) and len(paths) == len(set(paths)), 'session-git-paths-invalid', 400)
    fingerprint = digest({'paths': sorted(paths)})
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute('SELECT id FROM projects WHERE id=%s FOR KEY SHARE', [data['project_id']])
        current = run_scope(actor, data['run_id'], data['project_id'], lock=True)
        working(current)
        if connector_id is not None:
            from .core.connectors import lock_worker_binding
            lock_worker_binding(actor,connector_id,current)
        prior = Event.objects.filter(run=current, kind='git-files-reserved', data__request_id=request_id).first()
        if prior:
            require(prior.data.get('digest') == fingerprint, 'session-git-request-conflict', 409)
            return prior.data['receipt']
        require(current.change_record_id is not None and current.coding_session_id is not None, 'session-git-change-unavailable', 409)
        project = Project.objects.get(pk=current.project_id)
        change = Change.objects.select_for_update().get(pk=current.change_record_id)
        baseline = GitChange.objects.filter(change=change).first()
        require(baseline is not None and baseline.baseline.get('available') is True, 'session-git-baseline-unavailable', 409)
        framed = current.mandate.get('paths', [])
        root = Path(project.root)
        options, env = context(project)
        for path in paths:
            require(path!='STATISTICS.md','session-git-system-managed-path',409)
            require(not test_file(path),'session-git-test-file-excluded',409)
            require(str(Path(path)) == path, 'session-git-path-invalid', 400)
            require(any(path == scope or path.startswith(scope + '/') for scope in framed), 'session-git-outside-mandate', 403)
            target = safe_path(root, path, exists=False)
            require(not target.is_dir() and _visible_entry('?', path) is not None, 'session-git-path-invalid', 400)
            ignored = run(project, options, env, 'check-ignore', '--quiet', '--', './' + path)
            require(ignored.returncode in (0, 1), 'session-git-unavailable', 409)
            require(ignored.returncode == 1, 'session-git-ignored', 409)
        snapshot = git_snapshot(project)
        require(snapshot['available'] and snapshot['branch'] != '(detached)', 'session-git-unavailable', 409)
        index, created = GitSessionIndex.objects.get_or_create(change=change, session_id=current.coding_session_id, defaults={'initial_run': current, 'base_head': snapshot['head'] or '', 'index_path': '', 'state': 'PENDING', **_origin_if_supported(GitSessionIndex,current,session=True)})
        require(index.state in ('PENDING', 'OPEN', 'RELEASED'), 'session-git-index-unavailable', 409)
        reopening=index.state=='RELEASED'
        if reopening:
            previous_paths=list(GitFileReservation.objects.filter(git_index=index,active=False).values_list('path',flat=True).distinct())
            require(previous_paths and verify_releasable_index(project,index.index_path,previous_paths)==index.origin.get('release',{}).get('index_sha256'),'session-git-release-unstaged',409)
        from .requested_effects import active_deliveries,pending
        require(not pending(current),'session-effect-unresolved',409)
        require(not active_deliveries(current,index).exists(),'session-delivery-active',409)
        prior_dirty = {name for entry in baseline.baseline.get('entries', []) for name in (entry.get('path'), entry.get('previous')) if name}
        current_dirty = {name for entry in snapshot['entries'] for name in (entry.get('path'), entry.get('previous')) if name}
        relocated_paths=[];preexisting_authorizations=[];clean_initial_paths=[];direct_preexisting_paths=[]
        from .core.models import Lease
        from .resource_reservations import live, overlaps, renew_rows, resource_guard, return_idle_files
        now = timezone.now()
        resource_guard()
        return_idle_files(now, project, paths)
        other_effects = Lease.objects.filter(state='HELD', resource__key__startswith='file:').exclude(
            run=current,
        ).values_list('resource_id', flat=True)
        require(not any(overlaps('file:'+str(root/path), key) for key in other_effects for path in paths),
                'session-git-resource-protected', 409)
        for path in sorted(paths):
            key = hashlib.sha256(path.encode('utf-8')).hexdigest()
            existing = GitFileReservation.objects.select_for_update().filter(project=project, path_digest=key, active=True).first()
            if existing is not None:
                require(existing.path == path and existing.git_index_id == index.pk, 'session-git-reserved', 409)
                row = live('git', existing.pk).select_for_update().first()
                require(row is not None and row.run_id == current.pk, 'reservation-expired', 409)
                renew_rows([row], timezone.now())
                continue
            if path in prior_dirty or path in current_dirty:
                from .preexisting_git import clean_at_head,matching_authorization
                candidates=GitFileReservation.objects.filter(project=project,path_digest=key,active=False,git_index__state='RELEASED',git_index__session_id=current.coding_session_id,git_index__initial_run__actor_id=actor.pk).select_related('git_index').order_by('-released')[:10]
                relocated=reconciled_archive_owned(current,index,path)
                clean=path in prior_dirty and path not in current_dirty and clean_at_head(current,path,snapshot)
                granted=matching_authorization(current,index,path,snapshot) if not clean and not relocated else None
                direct=(
                    current.mode=='direct' and path in current_dirty
                    and not clean and not granted and not relocated
                )
                require(direct or clean or granted or relocated or any(item.path==path and released_index_matches(project,item.git_index,path) for item in candidates),'session-git-file-preexisting',409)
                if direct:direct_preexisting_paths.append(path)
                if relocated:relocated_paths.append(path)
                if granted:preexisting_authorizations.append(granted)
                if clean:clean_initial_paths.append(path)
            GitFileReservation.objects.create(project=project, git_index=index, path=path, path_digest=key)
        if reopening:
            index.state='OPEN';index.save(update_fields=['state','updated']);event(current,'git-index-reopened',{'request_id':request_id,'previous_release':index.origin.get('release',{})})
        from .core.models import ResourceReservation
        from .resource_reservations import public_row
        reserved = GitFileReservation.objects.filter(git_index=index, active=True, path__in=paths)
        rows = ResourceReservation.objects.filter(source='git', source_id__in=reserved.values('pk'))
        rows.exclude(run=current).update(run=current, session_id=current.session_id, change=current.change)
        receipt = {'reserved_count': len(paths), 'request_id': request_id, 'change': current.change,
                   'session_id': current.session_id, 'reservations': [public_row(row) for row in rows]}
        event(current, 'git-files-reserved', {'request_id': request_id, 'digest': fingerprint, 'receipt': receipt,'archive_reconciled_paths':relocated_paths,'preexisting_authorizations':preexisting_authorizations,'clean_initial_paths':clean_initial_paths,'direct_preexisting_paths':direct_preexisting_paths})
        return receipt


def administrative_run(actor,data,*,read_only=False):
    """Pont d'amorçage borné aux index adoptés et au relais natif vérifié."""
    from .core import commands as c
    from .core.models import GitSessionIndex,McpRunBinding,McpThreadBinding
    require(actor.active and actor.role=='admin','session-git-administrator-required',403)
    current=c.run_scope(actor,data['run_id'],data['project_id'],owner=False)
    if not read_only:c.working(current)
    index=GitSessionIndex.objects.filter(change_id=current.change_record_id,session_id=current.coding_session_id).first()
    require(index is not None and bool(index.origin.get('adoption')),'session-git-adoption-required',403)
    source=c.resolve_native(current.actor,current.project,current.session_id,{'source_file':current.mandate.get('native_source',{}).get('source_file','')},run=current)
    require(source==current.mandate.get('native_source'),'native-source-resume-required',409)
    binding=McpRunBinding.objects.select_related('connector').filter(run=current,connector__actor=current.actor).first()
    if binding is None:
        binding=McpThreadBinding.objects.select_related('connector').filter(run=current,thread=current.session_id,connector__actor=current.actor).first()
    require(binding is not None,'session-connector-unbound',409)
    from .connector_process import alive
    require(alive(binding.connector.process) and alive(binding.connector.worker),'session-connector-unbound',409)
    return current,binding.connector_id


def administrative_stage(actor,data,*,reserve=False):
    require(set(data)=={'project_id','run_id','request_id','paths'},'session-git-fields-invalid',400)
    current,connector_id=administrative_run(actor,data)
    from .core import commands as c
    from .core.models import Event
    from django.db import transaction
    with transaction.atomic():
        locked=c.run_scope(actor,current.run_id,current.project_id,lock=True,owner=False)
        request_id=c.identifier(data['request_id']);kind='git-administrative-reserve' if reserve else 'git-administrative-stage'
        prior=Event.objects.filter(run=locked,kind=kind,data__request_id=request_id).first()
        fingerprint=c.digest(data)
        if prior:require(prior.data.get('request_digest')==fingerprint,'session-git-request-conflict',409)
        else:c.event(locked,kind,{'request_id':request_id,'request_digest':fingerprint,'authority':actor.pk,'owner':current.actor_id})
    return (reserve_files if reserve else stage_files)(current.actor,data,connector_id)


def shared_scope_digest(project,options,env,paths):
    selected=run(project,options,{**env,'GIT_LITERAL_PATHSPECS':'1'},'ls-files','--stage','-z','--',*sorted(paths))
    require(selected.returncode==0,'session-git-unavailable',409)
    require(all(part.split(b'\t',1)[0].endswith(b' 0') for part in selected.stdout.split(b'\0') if part),'session-git-unmerged',409)
    return hashlib.sha256(selected.stdout).hexdigest()


def shared_index_allowed(project,options,env,names,staged,adoption=None):
    overlap=set(names)&set(staged)
    if not overlap:return True
    if not isinstance(adoption,dict):return False
    paths=adoption.get('paths',[])
    if not isinstance(paths,list) or not paths or not overlap.issubset(set(paths)):return False
    return shared_scope_digest(project,options,env,paths)==adoption.get('shared_digest')


def adopt_files(actor,data):
    """Adoption administrative des seuls RUN antérieurs à la migration Git."""
    from pathlib import Path
    from django.db import transaction
    from django.db.migrations.recorder import MigrationRecorder
    from .core import commands as c
    from .core.models import Event,GitFileReservation,GitSessionIndex
    require(actor.active and actor.role=='admin','session-git-administrator-required',403)
    require(set(data)=={'project_id','run_id','request_id','paths','expected_snapshot','expected_revision','authorization'},'session-git-fields-invalid',400)
    request_id=c.identifier(data['request_id']);fingerprint=c.digest(data)
    require(isinstance(data['authorization'],str) and 0<len(data['authorization'])<=4000,'session-git-authorization-required',400)
    paths=data['paths']
    require(isinstance(paths,list) and 0<len(paths)<=256 and all(isinstance(path,str) and path and '\0' not in path and len(path)<=1500 for path in paths) and len(set(paths))==len(paths),'session-git-paths-invalid',400)
    with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_lock(%s,%s)',[7348501,7348502])
    try:
        with transaction.atomic():
            with connection.cursor() as cursor:cursor.execute('SELECT id FROM projects WHERE id=%s FOR KEY SHARE',[data['project_id']])
            current=c.run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False)
            previous=Event.objects.filter(run=current,kind='git-files-adopted',data__request_id=request_id).first()
            if previous:
                require(previous.data.get('request_digest')==fingerprint,'session-git-request-conflict',409)
                return previous.data['receipt']
            c.working(current)
            require(current.mode=='direct' and c.no_pending(current) and not current.review and not current.mandate.get('native_frozen_at'),'session-git-adoption-protected',409)
            native=c.resolve_native(current.actor,current.project,current.session_id,{'source_file':current.mandate.get('native_source',{}).get('source_file','')},run=current)
            require(native==current.mandate.get('native_source'),'native-source-resume-required',409)
            migration=MigrationRecorder.Migration.objects.filter(app='cab_core',name='0030_session_git').first()
            require(migration is not None and current.created<migration.applied,'session-git-adoption-not-legacy',409)
            require(current.change_record_id and current.coding_session_id,'session-git-change-unavailable',409)
            change=Change.objects.select_for_update().get(pk=current.change_record_id)
            require(not GitChange.objects.filter(change=change).exists() and not GitSessionIndex.objects.filter(change=change,session_id=current.coding_session_id).exists(),'session-git-adoption-already-initialized',409)
            require(c.revision(current)==data['expected_revision'],'session-git-adoption-source-changed',409)
            snapshot=git_snapshot(current.project)
            require(snapshot.get('available') and snapshot.get('status_sha256')==data['expected_snapshot'] and snapshot.get('head'),'session-git-adoption-source-changed',409)
            observed={entry['path'] for entry in snapshot['entries']}
            require(set(paths).issubset(observed),'session-git-adoption-path-invalid',409)
            framed=current.mandate.get('paths',[]);root=Path(current.project.root)
            options,env=context(current.project)
            for path in paths:
                require(path!='STATISTICS.md' and str(Path(path))==path and _visible_entry('?',path) is not None,'session-git-path-invalid',400)
                require(any(path==base or path.startswith(base+'/') for base in framed),'session-git-outside-mandate',403)
                target=c.safe_path(root,path,exists=False);require(not target.is_dir(),'session-git-path-invalid',400)
                ignored=run(current.project,options,env,'check-ignore','--quiet','--','./'+path)
                require(ignored.returncode==1,'session-git-ignored',409)
            require(not GitFileReservation.objects.filter(project=current.project,active=True,path__in=paths).exists(),'session-git-reserved',409)
            adoption={'paths':sorted(paths),'shared_digest':shared_scope_digest(current.project,options,env,paths),'request_id':request_id,'authorization':data['authorization']}
            origin=_origin_if_supported(GitSessionIndex,current,session=True).get('origin',{});origin['adoption']=adoption
            baseline={**snapshot,'capture_kind':'legacy-adoption','source_revision':data['expected_revision']}
            GitChange.objects.create(change=change,project=current.project,initial_run=current,baseline=baseline,captured_at=timezone.now(),**_origin_if_supported(GitChange,current))
            index=GitSessionIndex.objects.create(change=change,session_id=current.coding_session_id,initial_run=current,base_head=snapshot['head'],index_path='',state='PENDING',origin=origin)
            GitFileReservation.objects.bulk_create([GitFileReservation(project=current.project,git_index=index,path=path,path_digest=hashlib.sha256(path.encode()).hexdigest()) for path in paths])
            receipt={'adopted_count':len(paths),'request_id':request_id,'capture_kind':'legacy-adoption'}
            c.event(current,'git-files-adopted',{'request_id':request_id,'request_digest':fingerprint,'authority':actor.pk,'paths':paths,'receipt':receipt})
            return receipt
    finally:
        with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_unlock(%s,%s)',[7348501,7348502])


def _index_path(project, index, options, env):
    """Répertoire réservé au propriétaire ou au groupe du projet."""
    from pathlib import Path
    result = run(project, options, env, 'rev-parse', '--absolute-git-dir')
    require(result.returncode == 0, 'session-git-index-unavailable', 409)
    try:
        gitdir = Path(result.stdout.decode('utf-8', 'strict').rstrip('\n'))
        require(gitdir.is_absolute() and gitdir.resolve() == gitdir, 'session-git-index-unavailable', 409)
        rootfd = os.open(gitdir, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        try:
            git_info = os.fstat(rootfd)
            require(git_info.st_uid == project.owner_uid, 'session-git-index-unavailable', 409)
            try:
                os.mkdir('cab-session-index', 0o700, dir_fd=rootfd)
                made = True
            except FileExistsError:
                made = False
            indexfd = os.open('cab-session-index', os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=rootfd)
            try:
                if made and os.geteuid() == 0:
                    os.fchown(indexfd, project.owner_uid, project.owner_gid if project.owner_gid is not None else -1)
                info = os.fstat(indexfd)
                mode = stat.S_IMODE(info.st_mode)
                project_group = project.owner_gid
                if project_group is None:
                    project_group = Path(project.root).stat().st_gid
                group_allowed = info.st_gid == git_info.st_gid == project_group
                require(
                    info.st_uid == project.owner_uid and mode & 0o007 == 0
                    and (mode & 0o070 == 0 or group_allowed),
                    'session-git-index-unavailable', 409,
                )
            finally:
                os.close(indexfd)
        finally:
            os.close(rootfd)
        token = hashlib.sha256((str(index.change_id) + ':' + str(index.session_id)).encode()).hexdigest()
        return str(gitdir / 'cab-session-index' / (token + '.index'))
    except (OSError, UnicodeError) as error:
        raise Refused('session-git-index-unavailable', 409) from error


def _reference_hook_safe(project, options, env):
    from pathlib import Path
    result=run(project,options,env,'rev-parse','--path-format=absolute','--git-path','hooks')
    require(result.returncode==0,'session-git-hook-unavailable',409)
    try:hooks=Path(result.stdout.decode('utf-8','strict').rstrip('\n'))
    except UnicodeError as error:raise Refused('session-git-hook-unavailable',409) from error
    require(hooks.is_absolute() and not os.access(hooks/'reference-transaction',os.X_OK),'session-git-reference-hook-active',409)


def stage_files(actor, data, connector_id=None):
    from .core.models import GitSessionIndex
    fields={field.name for field in GitSessionIndex._meta.fields}
    require({'keep_ref','keep_oid'}.issubset(fields),'session-git-upgrade-pending',409)
    require(not connection.in_atomic_block, 'session-git-transaction-invalid', 409)
    with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_lock(%s,%s)',[7348501,7348502])
    try:return _stage_files_locked(actor,data,connector_id)
    finally:
        with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_unlock(%s,%s)',[7348501,7348502])


def _stage_files_locked(actor, data, connector_id=None):
    """Indexe une étape validée dans l'index propre à sa session."""
    from django.db import transaction
    from .core.commands import digest, event, identifier, revision, run_scope, safe_path, working
    from .core.models import GitDelivery, GitFileReservation, GitSessionEffect, GitSessionIndex, Operation

    require(not connection.in_atomic_block, 'session-git-transaction-invalid', 409)
    require(set(data) == {'project_id', 'run_id', 'request_id', 'paths'}, 'session-git-fields-invalid', 400)
    request_id = identifier(data['request_id'])
    paths = data['paths']
    require(isinstance(paths, list) and 0 < len(paths) <= 256 and all(isinstance(path, str) and path and '\0' not in path and len(path) <= 1500 for path in paths) and len(paths) == len(set(paths)), 'session-git-paths-invalid', 400)
    fingerprint = digest({'paths': sorted(paths)})
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute('SELECT id FROM projects WHERE id=%s FOR KEY SHARE', [data['project_id']])
        current = run_scope(actor, data['run_id'], data['project_id'], lock=True)
        working(current)
        if connector_id is not None:
            from .core.connectors import lock_worker_binding
            lock_worker_binding(actor,connector_id,current)
        prior = GitSessionEffect.objects.filter(run=current, request_id=request_id).first()
        if prior:
            require(prior.request_digest == fingerprint, 'session-git-request-conflict', 409)
            require(prior.state == 'COMPLETED', 'session-git-effect-unresolved', 409)
            return prior.receipt
        index = GitSessionIndex.objects.select_for_update().filter(change_id=current.change_record_id, session_id=current.coding_session_id).first()
        require(index is not None and index.state in ('PENDING', 'OPEN'), 'session-git-index-unavailable', 409)
        from .requested_effects import active_deliveries,pending
        require(not pending(current),'session-effect-unresolved',409)
        require(not active_deliveries(current,index).exists(),'session-delivery-active',409)
        require(not index.effects.filter(state__in=('INTENT', 'RUNNING', 'UNKNOWN')).exists(), 'session-git-effect-unresolved', 409)
        from .core.models import ResourceReservation
        reservations = ResourceReservation.objects.filter(run=current, source='git', expires__gt=timezone.now())
        recorded = set(GitFileReservation.objects.filter(
            git_index=index, active=True, pk__in=reservations.values('source_id'),
        ).values_list('path', flat=True))
        require(not any(test_file(path) for path in paths),'session-git-test-file-excluded',409)
        completed=index.origin.get('finished_writes',{})
        finished=set(paths)-recorded
        require(finished.issubset(completed),'session-git-reservation-required',409)
        require(not GitFileReservation.objects.filter(project=current.project,path__in=finished,active=True).exists(),
                'session-git-reserved',409)
        require(all(_written_fingerprint(current.project,path)==completed[path] for path in finished),
                'session-git-finished-write-changed',409)
        for path in paths:
            safe_path(__import__('pathlib').Path(current.project.root), path, exists=False)
        current_revision = revision(current)
        validations = Operation.objects.filter(run=current, state='COMPLETED', source_revision=current_revision).order_by('-updated')[:50]
        require(any(op.receipt.get('exit_code') == 0 and (op.request.get('phase') in ('test', 'verify', 'verification') or isinstance(op.request.get('host_authorization'), dict)) for op in validations), 'session-git-validation-required', 409)
        initializing = index.state == 'PENDING'
        effect = GitSessionEffect.objects.create(run=current, git_index=index, request_id=request_id, request_digest=fingerprint, state='RUNNING', **_origin_if_supported(GitSessionEffect,current))
        index.state = 'INITIALIZING' if initializing else 'STAGING'
        index.save(update_fields=['state', 'updated'])
        project = current.project
        event(current, 'git-stage-started', {'request_id': request_id, 'count': len(paths)})
    mutated=False
    try:
        options, env = context(project)
        _reference_hook_safe(project,options,env)
        path = _index_path(project, index, options, env)
        if initializing:
            require(not os.path.lexists(path), 'session-git-index-unavailable', 409)
        else:
            require(index.index_path == path, 'session-git-index-unavailable', 409)
        token=__import__('pathlib').Path(path).stem
        require(re.fullmatch(r'[a-f0-9]{64}',token) is not None,'session-git-index-unavailable',409)
        keep_ref='refs/cab/session-index/'+token
        base_ref='refs/cab/session-base/'+token
        require(index.keep_ref in ('',keep_ref) and bool(index.keep_ref)==bool(index.keep_oid),'session-git-index-unavailable',409)
        with transaction.atomic():
            record=GitSessionEffect.objects.select_for_update().get(pk=effect.pk)
            require(record.state=='RUNNING','session-git-effect-unresolved',409)
            record.receipt={'index_path':path,'keep_ref':keep_ref,'previous_keep_oid':index.keep_oid,'base_ref':base_ref,'base_oid':index.base_head,'phase':'prepared'}
            record.save(update_fields=['receipt','updated'])
            if initializing:GitSessionIndex.objects.filter(pk=index.pk).update(index_path=path)
        if initializing:
            mutated=True
            init = run(project, options, {**env, 'GIT_INDEX_FILE': path}, 'read-tree', index.base_head if index.base_head else '--empty')
            require(init.returncode == 0, 'session-git-index-unavailable', 409)
        info = os.lstat(path)
        require(stat.S_ISREG(info.st_mode) and info.st_uid == project.owner_uid and info.st_nlink == 1, 'session-git-index-unavailable', 409)
        mutated=True
        staged = subprocess.run(['/usr/bin/git', '-C', project.root, '-c', 'core.fsmonitor=false', 'add', '--all', '--pathspec-from-file=-', '--pathspec-file-nul'], input=b'\0'.join(path.encode('utf-8') for path in paths) + b'\0', cwd='/', env={**env, 'GIT_INDEX_FILE':path, 'GIT_LITERAL_PATHSPECS':'1'}, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=120, **options)
        require(staged.returncode == 0, 'session-git-effect-unresolved', 409)
        require(all(_written_fingerprint(project,name)==completed[name] for name in finished),
                'session-git-finished-write-changed',409)
        tree=run(project,options,{**env,'GIT_INDEX_FILE':path},'write-tree')
        require(tree.returncode==0,'session-git-effect-unresolved',409)
        oid=tree.stdout.decode('ascii','strict').strip()
        from .git_commit_remove import OID
        require(OID.fullmatch(oid) is not None,'session-git-effect-unresolved',409)
        old=index.keep_oid or ('0'*len(oid))
        with transaction.atomic():
            effect=GitSessionEffect.objects.select_for_update().get(pk=effect.pk)
            require(effect.state=='RUNNING','session-git-effect-unresolved',409)
            effect.receipt={'index_path':path,'keep_ref':keep_ref,'previous_keep_oid':index.keep_oid,'keep_oid':oid,'base_ref':base_ref,'base_oid':index.base_head}
            effect.save(update_fields=['receipt','updated'])
        commands=['start',f'update {keep_ref} {oid} {old}']
        if index.base_head:
            commands.append(f'create {base_ref} {index.base_head}' if initializing else f'verify {base_ref} {index.base_head}')
        commands.extend(['prepare','commit'])
        updated=subprocess.run(['/usr/bin/git','-C',project.root,'update-ref','--stdin'],input=('\n'.join(commands)+'\n').encode('ascii'),cwd='/',env=env,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,timeout=120,**options)
        require(updated.returncode==0,'session-git-effect-unresolved',409)
    except Exception as error:
        with transaction.atomic():
            record=GitSessionEffect.objects.select_for_update().get(pk=effect.pk)
            if record.state=='RUNNING':
                record.state='UNKNOWN' if mutated else 'FAILED'
                record.receipt={**record.receipt,'error':'session-git-effect-unresolved' if mutated else getattr(error,'code','session-git-index-unavailable')}
                record.save(update_fields=['state','receipt','updated'])
            GitSessionIndex.objects.filter(pk=index.pk).update(state='UNKNOWN' if mutated else ('PENDING' if initializing else 'OPEN'))
        if mutated:raise Refused('session-git-effect-unresolved', 409) from error
        if isinstance(error,Refused):raise
        raise Refused('session-git-index-unavailable',409) from error
    with transaction.atomic():
        effect = GitSessionEffect.objects.select_for_update().get(pk=effect.pk)
        require(effect.state == 'RUNNING', 'session-git-effect-unresolved', 409)
        index = GitSessionIndex.objects.select_for_update().get(pk=index.pk)
        index.index_path = path
        index.keep_ref = keep_ref
        index.keep_oid = oid
        index.state = 'OPEN'
        index.origin={**index.origin,
                      'finished_writes':{name:value for name,value in index.origin.get('finished_writes',{}).items() if name not in paths},
                      'staged_sources':sorted(set(index.origin.get('staged_sources',[]))|set(paths))}
        index.save(update_fields=['index_path','keep_ref','keep_oid','state','origin','updated'])
        effect.state = 'COMPLETED'
        effect.receipt = {'request_id': request_id, 'staged_count': len(paths), 'state':'COMPLETED'}
        effect.save(update_fields=['state','receipt','updated'])
        event(current, 'git-stage-completed', {'request_id': request_id, 'count': len(paths)})
        return effect.receipt


def effect_status(actor, data):
    from .core.commands import identifier, run_scope
    from .core.models import GitSessionEffect
    require(set(data) == {'project_id','run_id','request_id'}, 'session-git-fields-invalid', 400)
    current = run_scope(actor, data['run_id'], data['project_id'])
    effect = GitSessionEffect.objects.filter(run=current, request_id=identifier(data['request_id'])).first()
    require(effect is not None, 'session-git-effect-not-found', 404)
    return {'request_id': effect.request_id, 'state': effect.state, 'receipt': effect.receipt}


def inspect_session(actor, data):
    """État compact du Git et des réservations de la session courante."""
    from .core.commands import run_scope
    from .core.models import GitFileReservation, GitSessionIndex
    require(set(data) <= {'project_id','run_id','include_paths'} and type(data.get('include_paths',False)) is bool, 'session-git-fields-invalid',400)
    current=run_scope(actor,data['run_id'],data['project_id'])
    index=GitSessionIndex.objects.filter(change_id=current.change_record_id,session_id=current.coding_session_id).first()
    paths=list(GitFileReservation.objects.filter(git_index=index,active=True).values_list('path',flat=True)) if index else []
    snap=git_snapshot(current.project,index.index_path if index and index.state=='OPEN' else None)
    owned=set(delivery_files(index)) if index else set()
    relevant=[entry for entry in snap['entries'] if entry['path'] in owned]
    staged=sum(entry['status']!='??' and entry['status'][0:1]!='.' for entry in relevant)
    baseline=GitChange.objects.filter(change_id=current.change_record_id).first()
    result={'capture_kind':baseline.baseline.get('capture_kind','initial') if baseline else None,'available':snap['available'],'head':snap['head'],'branch':snap['branch'],'baseline':GitChange.objects.filter(change_id=current.change_record_id).exists(),'index_state':index.state if index else 'ABSENT','reserved_count':len(paths),'staged_count':staged,'other_changes_count':len(snap['entries'])-len(relevant)}
    if data.get('include_paths'):
        result['reserved']=paths
        result['changes']=relevant
    return result


def verify_releasable_index(project,index_path,paths):
    """Chaque fichier libéré doit déjà correspondre à son index de session."""
    from pathlib import Path
    from .core.commands import safe_path
    from .session_delivery import _index_digest
    options,env=context(project);own={**env,'GIT_INDEX_FILE':index_path,'GIT_LITERAL_PATHSPECS':'1'}
    for name in paths:
        target=safe_path(Path(project.root),name,exists=False)
        tracked=run(project,options,own,'ls-files','--error-unmatch','--',name)
        require(tracked.returncode in (0,1),'session-git-unavailable',409)
        require(not target.exists() or tracked.returncode==0,'session-git-release-unstaged',409)
    same=run(project,options,own,'diff','--quiet','--no-ext-diff','--ignore-submodules=none','--',*paths)
    require(same.returncode==0,'session-git-release-unstaged',409)
    return _index_digest(index_path,project.owner_uid)


def release_files(actor,data,connector_id=None):
    """Rend les réservations validées sans commit, push ni destruction de l'index."""
    from django.db import transaction
    from .core import commands as c
    from .core.models import Event,GitDelivery,GitFileReservation,GitSessionIndex,Operation
    required={'project_id','run_id','request_id'}
    require(required<=set(data)<=required|{'paths'},'session-git-fields-invalid',400)
    requested=data.get('paths')
    require(requested is None or isinstance(requested,list) and 0<len(requested)<=256 and
            all(isinstance(path,str) and path for path in requested) and len(set(requested))==len(requested),
            'session-git-paths-invalid',400)
    request_id=c.identifier(data['request_id'])
    with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_lock(%s,%s)',[7348501,7348502])
    try:
        with transaction.atomic():
            current=c.run_scope(actor,data['run_id'],data['project_id'],lock=True)
            prior=Event.objects.filter(run=current,kind='git-files-released',data__request_id=request_id).first()
            if prior:
                require(prior.data.get('paths')==requested,'session-git-request-conflict',409)
                return prior.data['receipt']
            c.working(current);require(c.no_pending(current),'session-git-effect-unresolved',409)
            if connector_id is not None:
                from .core.connectors import lock_worker_binding
                lock_worker_binding(actor,connector_id,current)
            index=GitSessionIndex.objects.select_for_update().get(change_id=current.change_record_id,session_id=current.coding_session_id)
            require(index.state=='OPEN' and not GitDelivery.objects.filter(git_index=index).exists(),'session-git-release-protected',409)
            require(not index.effects.filter(state__in=['INTENT','RUNNING','UNKNOWN']).exists(),'session-git-effect-unresolved',409)
            revision=c.revision(current)
            validations=Operation.objects.filter(run=current,state='COMPLETED',source_revision=revision).order_by('-updated')[:50]
            require(any(op.receipt.get('exit_code')==0 and (op.request.get('phase') in ('test','verify','verification') or isinstance(op.request.get('host_authorization'),dict)) for op in validations),'session-git-validation-required',409)
            paths=list(GitFileReservation.objects.select_for_update().filter(git_index=index,active=True).values_list('path',flat=True))
            require(requested is None or set(requested)<=set(paths),'session-git-reservation-required',409)
            require(not index.origin.get('finished_writes'),'session-git-release-unstaged',409)
            releasing=delivery_files(index) if requested is None else requested
            require(releasing,'session-git-reservation-required',409)
            entire_index=set(paths).issubset(releasing)
            options,env=context(current.project)
            require(index.index_path==_index_path(current.project,index,options,env) and index.keep_ref and index.keep_oid,'session-git-index-unavailable',409)
            keep=run(current.project,options,env,'rev-parse','--verify',index.keep_ref)
            require(keep.returncode==0 and keep.stdout.decode('ascii').strip()==index.keep_oid,'session-git-index-unavailable',409)
            digest=verify_releasable_index(current.project,index.index_path,releasing)
            receipt={'request_id':request_id,'released_count':len(set(paths)&set(releasing)),'state':'RELEASED','source_revision':revision,'index_sha256':digest,'index_preserved':True,'delivered':False}
            GitFileReservation.objects.filter(git_index=index,active=True,path__in=releasing).update(active=False,released=timezone.now())
            if entire_index:
                index.state='RELEASED'
                index.origin={**index.origin,'release':receipt}
                index.save(update_fields=['state','origin','updated'])
            c.event(current,'git-files-released',{'request_id':request_id,'paths':requested,'receipt':receipt})
            return receipt
    finally:
        with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_unlock(%s,%s)',[7348501,7348502])


def reconciled_archive_owned(current,index,path):
    """Une archive vérifiée conserve l'attribution de ses fichiers réservés."""
    from pathlib import Path
    from .core.models import Event,GitFileReservation
    root=Path(current.project.root)
    if index.change_id!=current.change_record_id or index.session_id!=current.coding_session_id or index.initial_run.actor_id!=current.actor_id:return False
    if (root/'openspec/changes'/current.change).exists():return False
    for record in current.mandate.get('archive_reconciliations',[]):
        archive=record.get('archive_path','')
        if not archive or not path.startswith(archive+'/'):continue
        if not Event.objects.filter(run=current,kind='mandate-archive-reconciled',data__archive_path=archive,data__source_revision=record.get('source_revision')).exists():continue
        archives=list((root/'openspec/changes/archive').glob('????-??-??-'+current.change))
        if len(archives)!=1 or str(archives[0].relative_to(root))!=archive:continue
        previous='openspec/changes/'+current.change+path[len(archive):]
        target=root/path
        if (root/previous).exists() or not target.is_file() or target.resolve()!=target:continue
        if GitFileReservation.objects.filter(project=current.project,git_index=index,path=previous,active=True).exists():return True
    return False


def released_index_matches(project,index,path):
    """Reconnaît uniquement un snapshot libéré inchangé, jamais des travaux nouveaux."""
    expected=index.origin.get('release',{}).get('index_sha256')
    if index.state!='RELEASED' or not expected or not index.keep_ref or not index.keep_oid:return False
    try:
        if verify_releasable_index(project,index.index_path,[path])!=expected:return False
        options,env=context(project)
        kept=run(project,options,env,'rev-parse','--verify',index.keep_ref)
        return kept.returncode==0 and kept.stdout.decode('ascii').strip()==index.keep_oid
    except (Refused,OSError,UnicodeError):return False
