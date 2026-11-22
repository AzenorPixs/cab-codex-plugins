"""Livraison d'une session : version locale et orchestration CAB."""
import base64
import hashlib
import re
from .core.commands import Refused, require
from .forge_settings import file_operation
from .versioning import NUMERIC_VERSION, VersionError, inferred_policy, numeric_parts, parse_policy, timestamp_tag, version_order_key

ASSIGNMENT = re.compile(r'''^([ \t]*PROJECT_VERSION[ \t]*=[ \t]*)(?:("[vV]?[0-9]+(?:\.[0-9]+){0,6}")|('[vV]?[0-9]+(?:\.[0-9]+){0,6}')|([vV]?[0-9]+(?:\.[0-9]+){0,6}))([ \t]*(?:[ \t]\#[^\r\n]*)?)(\r?\n)?$''')
KEY = re.compile(r'^[ \t]*(?:export[ \t]+)?PROJECT_VERSION[ \t]*=')


def version_tuple(value):
    from .versioning import canonical_version
    try:canonical_version(value)
    except VersionError as error:raise Refused(str(error),400) from None
    try:return numeric_parts(value)
    except VersionError:raise Refused('session-delivery-version-invalid',400) from None


def delivery_version_order(value):
    version_tuple(value)
    return version_order_key(value)



def version_authority(actor,run):
    """L'orchestrateur choisit en piloté, le codeur choisit en direct."""
    expected=run.mandate.get('orchestrator_id') if run.mode=='piloted' else run.actor_id
    require(actor.active and actor.pk==expected,'session-delivery-version-authority-required',403)
    return expected


def version_policy(run):
    from .project_metadata import read_metadata
    values=read_metadata(run.project.root).get('values',{})
    current=values.get('PROJECT_VERSION','')
    configured=values.get('PROJECT_VERSION_POLICY')
    try:
        components=parse_policy(configured) if configured is not None else inferred_policy(current)
    except VersionError as error:
        raise Refused(str(error),409) from None
    if current:
        require(len(version_tuple(current))==components,'version-policy-mismatch',409)
    return {'current_version':current,'numeric_components':components,'configured':configured is not None,'selected_by':'orchestrator' if run.mode=='piloted' else 'coding-agent','authority':run.mandate.get('orchestrator_id') if run.mode=='piloted' else run.actor_id,'developer_version_overrides':True,'ask_developer_when_missing':False,'prefix':''}


def select_delivery_version(actor,data):
    from django.db import transaction
    from .core import commands as c
    from .core.models import Event,GitDelivery
    require(set(data)=={'project_id','run_id','version'},'session-delivery-fields-invalid',400)
    version_tuple(data['version'])
    with transaction.atomic():
        run=c.run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False)
        authority=version_authority(actor,run)
        previous=Event.objects.filter(run=run,kind='delivery-version-selected').order_by('-pk').first()
        if run.cycle_steps==11 and previous and previous.data['version']==data['version']:return previous.data
        c.working(run)
        require(c.no_pending(run) and not GitDelivery.objects.filter(run=run).exists(),'session-delivery-version-selection-protected',409)
        policy=version_policy(run)
        proposal=None
        if run.cycle_steps == 12:
            from .version_skill import require_acknowledged
            require_acknowledged(run)
            proposal=Event.objects.filter(run=run,kind='version-proposed',data__version=data['version'],
                data__coder=run.actor_id,data__current_version=policy['current_version'],
                data__policy=policy['numeric_components'],data__generation=run.generation).order_by('-pk').first()
            require(proposal is not None,'version-coder-proposal-required',409)
        require(not policy['configured'] or len(version_tuple(data['version']))==policy['numeric_components'],'version-policy-mismatch',409)
        require(not policy['current_version'] or delivery_version_order(data['version'])>delivery_version_order(policy['current_version']),'session-delivery-version-not-new',409)
        receipt={'version':data['version'],'previous_version':policy['current_version'],'authority':authority,'selected_by':policy['selected_by'],'mode':run.mode}
        if proposal:
            receipt.update({'proposal':proposal.pk,'coder':run.actor_id,'policy':policy['numeric_components']})
        if previous and previous.data==receipt:return previous.data
        c.event(run,'delivery-version-selected',receipt)
        return receipt


def delivery_version_selection(actor,run,version):
    if run.mode=='direct':return select_delivery_version(actor,{'project_id':run.project_id,'run_id':run.run_id,'version':version})
    from .core.models import Event
    selected=Event.objects.filter(run=run,kind='delivery-version-selected').order_by('-pk').first()
    require(selected is not None and selected.data.get('version')==version and selected.data.get('authority')==run.mandate.get('orchestrator_id'),'session-delivery-orchestrator-version-required',403)
    return selected.data


def replace_version(raw, version):
    """Remplace seulement PROJECT_VERSION ; les autres octets sont conservés."""
    version_tuple(version)
    try:
        text = raw.decode('utf-8', 'strict')
    except UnicodeError as error:
        raise Refused('session-delivery-version-config-invalid', 409) from error
    lines = text.splitlines(keepends=True)
    matches = [(i, ASSIGNMENT.fullmatch(line)) for i, line in enumerate(lines) if KEY.match(line)]
    require(len(matches) <= 1 and all(match is not None for _, match in matches), 'session-delivery-version-config-invalid', 409)
    old = None
    if matches:
        position, match = matches[0]
        original = next(part for part in match.groups()[1:4] if part is not None)
        old = original.strip('\"\'')
        from .versioning import historical_version
        old=historical_version(old)
        require(delivery_version_order(version) > delivery_version_order(old), 'session-delivery-version-not-new', 409)
        quote = original[0] if original[0] in ('\"', "'") else ''
        lines[position] = match.group(1) + quote + version + quote + match.group(5) + (match.group(6) or '')
    else:
        if lines and not lines[-1].endswith(('\n','\r')):
            lines[-1] += '\n'
        lines.append('PROJECT_VERSION=' + version + '\n')
    return ''.join(lines).encode('utf-8'), old


def update_version(project, version, expected_digest):
    import os,stat
    from pathlib import Path
    try:
        info=os.stat(Path(project.root)/'project.env',follow_symlinks=False)
        require(stat.S_ISREG(info.st_mode) and info.st_uid==project.owner_uid and info.st_nlink==1,'session-delivery-version-config-invalid',409)
    except OSError as error:
        raise Refused('session-delivery-version-config-invalid',409) from error
    result = file_operation(project, {'op':'env-read'})
    require(result['digest']==expected_digest,'session-delivery-config-changed',409)
    raw = base64.b64decode(result['content'], validate=True)
    new, old = replace_version(raw, version)
    file_operation(project, {'op':'env-write', 'digest':result['digest'], 'content':base64.b64encode(new).decode('ascii')})
    return {'previous':old, 'version':version, 'before_sha256':result['digest'], 'after_sha256':hashlib.sha256(new).hexdigest()}


def _git(project, options, env, *args, data=None, timeout=30):
    import subprocess
    try:
        result = subprocess.run(['/usr/bin/git','-C',project.root,'-c','core.fsmonitor=false',*args], input=data, cwd='/', env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=timeout, **options)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise Refused('session-delivery-result-unknown', 409) from error
    return result


def _head(project, options, env):
    from .git_commit_remove import OID
    branch = _git(project, options, env, 'symbolic-ref','--quiet','HEAD')
    head = _git(project, options, env, 'rev-parse','--verify','HEAD^{commit}')
    require(branch.returncode == 0 and head.returncode == 0, 'session-delivery-head-invalid', 409)
    try:
        ref = branch.stdout.decode('utf-8','strict').strip()
        commit = head.stdout.decode('ascii','strict').strip()
    except UnicodeError as error:
        raise Refused('session-delivery-head-invalid', 409) from error
    require(ref.startswith('refs/heads/') and OID.fullmatch(commit), 'session-delivery-head-invalid', 409)
    return ref, commit


def _changed_paths(project, options, env, base):
    result = _git(project, options, env, 'diff','--cached','--no-ext-diff','--no-textconv','--no-renames','--name-only','-z',base,'--')
    require(result.returncode == 0 and len(result.stdout) <= 4194304, 'session-delivery-index-invalid', 409)
    try:
        return [part.decode('utf-8','strict') for part in result.stdout.split(b'\0') if part]
    except UnicodeError as error:
        raise Refused('session-delivery-index-invalid', 409) from error


def _temp_index(directory, project):
    import os,tempfile
    fd,path=tempfile.mkstemp(prefix='delivery-',suffix='.index',dir=directory)
    try:
        if os.geteuid()==0:
            os.fchown(fd,project.owner_uid,project.owner_gid if project.owner_gid is not None else -1)
    except OSError:
        os.unlink(path)
        raise
    finally:
        os.close(fd)
    return path


def _copy_session_index(source, target, uid):
    import os,stat
    src=os.open(source,os.O_RDONLY|os.O_NOFOLLOW)
    try:
        srcinfo=os.fstat(src)
        require(stat.S_ISREG(srcinfo.st_mode) and srcinfo.st_uid==uid and srcinfo.st_nlink==1 and srcinfo.st_size<=67108864,'session-delivery-index-invalid',409)
        dst=os.open(target,os.O_WRONLY|os.O_TRUNC|os.O_NOFOLLOW)
        try:
            dstinfo=os.fstat(dst)
            require(stat.S_ISREG(dstinfo.st_mode) and dstinfo.st_uid==uid and dstinfo.st_nlink==1,'session-delivery-index-invalid',409)
            with os.fdopen(src,'rb') as source_stream,os.fdopen(dst,'wb') as target_stream:
                src=None;dst=None
                while True:
                    chunk=source_stream.read(1048576)
                    if not chunk:break
                    target_stream.write(chunk)
                after=os.fstat(source_stream.fileno())
                require((srcinfo.st_dev,srcinfo.st_ino,srcinfo.st_size,srcinfo.st_mtime_ns,srcinfo.st_ctime_ns)==(after.st_dev,after.st_ino,after.st_size,after.st_mtime_ns,after.st_ctime_ns),'session-delivery-index-changed',409)
        finally:
            if dst is not None:os.close(dst)
    finally:
        if src is not None:os.close(src)


def _gitdir(project, options, env):
    from pathlib import Path
    result=_git(project,options,env,'rev-parse','--absolute-git-dir')
    require(result.returncode==0,'session-delivery-index-invalid',409)
    try:
        path=Path(result.stdout.decode('utf-8','strict').rstrip('\n'))
        require(path.is_absolute() and path.resolve()==path,'session-delivery-index-invalid',409)
        return path
    except UnicodeError as error:
        raise Refused('session-delivery-index-invalid',409) from error


def _hooks_supported(project, options, env, gitdir):
    import os
    require(not any(os.path.lexists(gitdir/name) for name in ('MERGE_HEAD','CHERRY_PICK_HEAD','REVERT_HEAD','rebase-merge','rebase-apply','sequencer','BISECT_START')),'session-delivery-repository-busy',409)
    configured=_git(project,options,env,'config','--local','--get','core.hooksPath')
    require(configured.returncode in (0,1),'session-delivery-hooks-unknown',409)
    require(configured.returncode==1,'session-delivery-hooks-unsupported',409)
    for key in ('commit.gpgsign','tag.gpgsign','tag.forcesignannotated'):
        sign=_git(project,options,env,'config','--local','--bool','--get',key)
        require(sign.returncode in (0,1),'session-delivery-signing-unknown',409)
        require(sign.returncode==1 or sign.stdout.strip()==b'false','session-delivery-signing-unsupported',409)
    from pathlib import Path
    resolved=_git(project,options,env,'rev-parse','--path-format=absolute','--git-path','hooks')
    require(resolved.returncode==0,'session-delivery-hooks-unknown',409)
    try: hooks=Path(resolved.stdout.decode('utf-8','strict').rstrip('\n'))
    except UnicodeError as error: raise Refused('session-delivery-hooks-unknown',409) from error
    require(hooks.is_absolute(),'session-delivery-hooks-unknown',409)
    for name in ('pre-commit','prepare-commit-msg','commit-msg','post-commit','reference-transaction'):
        require(not os.access(hooks/name,os.X_OK),'session-delivery-hooks-unsupported',409)


def _index_digest(path, uid):
    import os,stat
    try:
        fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
        with os.fdopen(fd,'rb') as stream:
            before=os.fstat(stream.fileno())
            require(stat.S_ISREG(before.st_mode) and before.st_uid==uid and before.st_nlink==1 and before.st_size<=67108864,'session-delivery-index-invalid',409)
            fingerprint=hashlib.sha256()
            while True:
                chunk=stream.read(1048576)
                if not chunk:break
                fingerprint.update(chunk)
            after=os.fstat(stream.fileno())
        require((before.st_dev,before.st_ino,before.st_size,before.st_mtime_ns,before.st_ctime_ns)==(after.st_dev,after.st_ino,after.st_size,after.st_mtime_ns,after.st_ctime_ns),'session-delivery-index-changed',409)
        return fingerprint.hexdigest()
    except OSError as error:
        raise Refused('session-delivery-index-invalid',409) from error


def managed_statistics_path(path):
    return path=='STATISTICS.md' or path.startswith('openspec/changes/') and path.rsplit('/',1)[-1]=='STATISTICS.md' or bool(re.fullmatch(r'statistics/runs/[a-f0-9]{64}/STATISTICS\.md',path))


def unstaged_code_paths(snapshot):
    return {entry['path'] for entry in snapshot['entries'] if not managed_statistics_path(entry['path']) and (entry['status']=='??' or len(entry['status'])>1 and entry['status'][1]!='.')}


def retired_statistics_snapshots(project,change_id,options,env):
    """Suppression du seul ancien rapport CAB lors d'un archivage."""
    from pathlib import Path
    from .core.models import Change,StatisticsJob
    from .session_git import shared_scope_digest
    change=Change.objects.get(pk=change_id,project=project)
    if not change.local_sources.filter(present=True,archived=True).exists():return []
    path='openspec/changes/'+change.identifier+'/STATISTICS.md'
    if (Path(project.root)/path).exists():return []
    previous=_git(project,options,env,'show',':'+path)
    if previous.returncode!=0:previous=_git(project,options,env,'show','HEAD:'+path)
    if previous.returncode!=0:return []
    sha=hashlib.sha256(previous.stdout).hexdigest()
    if not StatisticsJob.objects.filter(project=project,result__indexed_documents__contains={path:{'state':'COMPLETED','sha256':sha}}).exists():return []
    return [{'path':path,'sha256':None,'removed':True,'entry_digest':shared_scope_digest(project,options,env,[path])}]


def bundled_statistics_changes(project,index):
    """Le lot inclut seulement des archives validées de cette même session."""
    from .core.models import Run,ChangeSource
    from .core.run_lifecycle import archive_state
    from .git_commit_remove import context
    changes={index.change_id}
    if index.initial_run_id is None or index.session_id is None:return changes
    paths=set(index.reservations.filter(active=True).values_list('path',flat=True))
    candidates=Run.objects.filter(project=project,actor_id=index.initial_run.actor_id,coding_session_id=index.session_id,state='CLOSED',finalization_plan__isnull=False).exclude(finalization_plan__receipt={})
    options,env=context(project)
    for run in candidates:
        for source in ChangeSource.objects.filter(change_id=run.change_record_id,change__project=project,archived=True,present=True):
            documents=[source.path+'/proposal.md',source.path+'/tasks.md']
            if not set(documents).issubset(paths):continue
            archive,_=archive_state(run)
            require(archive==source.path,'session-delivery-bundled-archive-divergent',409)
            staged=_git(project,options,{**env,'GIT_INDEX_FILE':index.index_path},'ls-files','--error-unmatch','--',*documents)
            require(staged.returncode==0,'session-delivery-bundled-archive-not-staged',409)
            changes.add(source.change_id)
    return changes


def include_change_statistics(project,index,options,env,own_env):
    """Fige les rapports CAB du change sans absorber une réservation étrangère."""
    from pathlib import Path
    from .core.models import GitFileReservation,StatisticsDocument
    from .core.commands import safe_path
    from .statistics_documents import read_source
    from .git_commit_remove import OID
    reports=[];included=set();changes=bundled_statistics_changes(project,index)
    documents=StatisticsDocument.objects.filter(source__change_id__in=changes,source__present=True,status='ready',manual_override=False).exclude(generated_block_sha='').select_related('source')
    for document in documents:
        path=document.source.path+'/STATISTICS.md'
        if not path.startswith('openspec/changes/') or not managed_statistics_path(path):continue
        if GitFileReservation.objects.filter(project=project,active=True,path=path).exclude(git_index=index).exists():continue
        target=safe_path(Path(project.root),path,exists=False)
        try:raw,info=read_source(Path(project.root),target,64*1024*1024)
        except (OSError,ValueError):continue
        sha=hashlib.sha256(raw).hexdigest()
        if sha!=document.sha256:continue
        from .session_git import shared_scope_digest
        staged=_git(project,options,env,'show',':'+path)
        if staged.returncode==0:require(hashlib.sha256(staged.stdout).hexdigest()==sha,'session-delivery-shared-index-conflict',409)
        entry_digest=shared_scope_digest(project,options,env,[path])
        blob=_git(project,options,env,'hash-object','-w','--stdin',data=raw)
        require(blob.returncode==0,'session-delivery-statistics-unavailable',409)
        oid=blob.stdout.decode('ascii','strict').strip();require(OID.fullmatch(oid),'session-delivery-statistics-unavailable',409)
        mode='100755' if info.st_mode&0o111 else '100644'
        added=_git(project,options,own_env,'update-index','--add','--cacheinfo',mode+','+oid+','+path)
        require(added.returncode==0,'session-delivery-statistics-unavailable',409)
        reports.append({'path':path,'sha256':sha,'entry_digest':entry_digest});included.add(document.source.change_id)
    require((changes-{index.change_id}).issubset(included),'session-delivery-bundled-statistics-unavailable',409)
    for change_id in changes:
        for retired in retired_statistics_snapshots(project,change_id,options,env):
            require(_git(project,options,own_env,'update-index','--force-remove','--',retired['path']).returncode==0,'session-delivery-statistics-unavailable',409)
            reports.append(retired)
    return reports


def preflight_commit(project,index,version,reservations,*,complete=False,existing_tag=None,separate_reports=False):
    """Vérifications Git en lecture seule avant toute mutation de version."""
    import os,stat
    from pathlib import Path
    from .git_commit_remove import context
    from .session_git import git_snapshot
    version_tuple(version)
    require(index.state=='OPEN' and index.base_head,'session-delivery-index-invalid',409)
    options,env=context(project);gitdir=_gitdir(project,options,env);_hooks_supported(project,options,env,gitdir)
    token=hashlib.sha256((str(index.change_id)+':'+str(index.session_id)).encode()).hexdigest()
    expected=str(gitdir/'cab-session-index'/(token+'.index'))
    require(index.index_path==expected,'session-delivery-index-invalid',409)
    index_digest=_index_digest(expected,project.owner_uid)
    if complete:
        from .delivery_scope import capture_full
        branch,head=_head(project,options,env)
        selected=capture_full(project,index,options,env,head,gitdir,exclude_reports=separate_reports)
        tag=_git(project,options,env,'show-ref','--verify','--quiet','refs/tags/'+version)
        require(tag.returncode==1 if existing_tag is None else _git(project,options,env,'rev-parse','refs/tags/'+version).stdout.decode().strip()==existing_tag,'session-delivery-tag-exists',409)
        return {'head':head,'branch':branch,'index_digest':index_digest,'paths':selected['paths'],'full':selected}
    snap=git_snapshot(project,expected)
    dirty=unstaged_code_paths(snap)
    require(not (dirty & set(reservations)),'session-delivery-unstaged-session-files',409)
    branch,head=_head(project,options,env)
    names=_changed_paths(project,options,{**env,'GIT_INDEX_FILE':expected},index.base_head)
    require(names and set(names).issubset(set(reservations)),'session-delivery-index-invalid',409)
    if separate_reports:
        from .reports_git import report_path
        names=[path for path in names if not report_path(path)]
        require(names,'session-delivery-empty',409)
    staged=_changed_paths(project,options,env,head)
    from .session_git import shared_index_allowed
    require(shared_index_allowed(project,options,env,[path for path in names if not managed_statistics_path(path)],staged,index.origin.get('adoption')),'session-delivery-shared-index-conflict',409)
    unmerged=_git(project,options,env,'ls-files','--unmerged','-z')
    require(unmerged.returncode==0 and not unmerged.stdout,'session-delivery-shared-index-conflict',409)
    tag=_git(project,options,env,'show-ref','--verify','--quiet','refs/tags/'+version)
    require(tag.returncode in (0,1),'session-delivery-tag-invalid',409)
    require(tag.returncode==1 if existing_tag is None else _git(project,options,env,'rev-parse','refs/tags/'+version).stdout.decode().strip()==existing_tag,'session-delivery-tag-exists',409)
    require(_index_digest(expected,project.owner_uid)==index_digest,'session-delivery-index-changed',409)
    return {'head':head,'branch':branch,'index_digest':index_digest,'paths':names}


def include_global_statistics(project,options,env,own_env):
    """Inclut seulement un global indexé et confirmé par le service CAB."""
    from pathlib import Path
    from .core.models import StatisticsJob
    from .statistics_documents import read_source
    from .session_git import shared_scope_digest
    changed=_git(project,options,env,'diff','--cached','--name-only','-z','HEAD','--','STATISTICS.md')
    require(changed.returncode==0,'session-delivery-index-invalid',409)
    if not changed.stdout:return None
    listed=_git(project,options,env,'ls-files','--stage','-z','--','STATISTICS.md')
    require(listed.returncode==0,'session-delivery-index-invalid',409)
    entries=[item for item in listed.stdout.split(b'\0') if item]
    if len(entries)!=1:return None
    header,name=entries[0].split(b'\t',1);fields=header.split()
    from .git_commit_remove import OID
    if name!=b'STATISTICS.md' or len(fields)!=3 or fields[0] not in (b'100644',b'100755') or fields[2]!=b'0':return None
    oid=fields[1].decode('ascii','strict');require(OID.fullmatch(oid),'session-delivery-index-invalid',409)
    blob=_git(project,options,env,'show',':STATISTICS.md');require(blob.returncode==0,'session-delivery-index-invalid',409)
    sha=hashlib.sha256(blob.stdout).hexdigest()
    if not StatisticsJob.objects.filter(project=project,state='COMPLETED',result__global_index__state='COMPLETED',result__global_index__sha256=sha).exists():return None
    try:raw,_=read_source(Path(project.root),Path(project.root)/'STATISTICS.md',64*1024*1024)
    except (OSError,ValueError):return None
    if hashlib.sha256(raw).hexdigest()!=sha:return None
    snapshot=shared_scope_digest(project,options,env,['STATISTICS.md'])
    added=_git(project,options,own_env,'update-index','--add','--cacheinfo',fields[0].decode()+','+oid+',STATISTICS.md')
    require(added.returncode==0,'session-delivery-index-invalid',409)
    return {'sha256':sha,'entry_digest':snapshot}


def prepare_commit(project, index, version, reservations, *, full=None,tag_mode='create',expected_tag='',message='Mise à jour du projet',separate_reports=False):
    """Construit le commit et l'index commun temporaire sans déplacer de référence."""
    import os,stat
    from pathlib import Path
    from .git_commit_remove import context
    from .session_git import _index_path,git_snapshot
    version_tuple(version)
    from .package_versions import require_aligned
    require_aligned(project.root,version)
    require(index.state in ('OPEN','COMMITTING') and index.base_head, 'session-delivery-index-invalid',409)
    options,env=context(project)
    expected=_index_path(project,index,options,env)
    require(index.index_path==expected,'session-delivery-index-invalid',409)
    info=os.lstat(expected)
    require(stat.S_ISREG(info.st_mode) and info.st_uid==project.owner_uid and info.st_nlink==1,'session-delivery-index-invalid',409)
    index_digest=_index_digest(expected,project.owner_uid)
    if full is None:
        dirty=unstaged_code_paths(git_snapshot(project,expected))
        require(not (dirty & set(reservations)),'session-delivery-unstaged-session-files',409)
    gitdir=_gitdir(project,options,env)
    _hooks_supported(project,options,env,gitdir)
    tagref='refs/tags/'+version
    tag=_git(project,options,env,'show-ref','--verify','--quiet',tagref)
    require(tag.returncode in (0,1),'session-delivery-tag-invalid',409)
    require(tag_mode in ('create','move','none'),'session-delivery-tag-mode-invalid')
    if tag_mode=='create':require(tag.returncode==1,'session-delivery-tag-exists',409)
    elif tag_mode=='move':require(tag.returncode==0 and _git(project,options,env,'rev-parse',tagref).stdout.decode().strip()==expected_tag,'session-delivery-tag-changed')
    branch,head=_head(project,options,env)
    source_env={**env,'GIT_INDEX_FILE':expected}
    if full is not None:
        require(head==full['head'] or separate_reports and reports_only_between(project,options,env,full['head'],head),'session-delivery-head-changed',409)
        require(re.fullmatch(r'[a-f0-9]{40}|[a-f0-9]{64}',full['tree']),'session-delivery-index-invalid',409)
        names=full['paths']
    else:
        names=_changed_paths(project,options,source_env,index.base_head)
        require(names and set(names).issubset(set(reservations)),'session-delivery-index-invalid',409)
    report_paths=[]
    if separate_reports and full is None:
        from .reports_git import report_path
        report_paths=[path for path in names if report_path(path)]
        names=[path for path in names if path not in report_paths]
        require(names,'session-delivery-empty',409)
    own_index=expected
    temporary=[]
    try:
        if full is not None:
            own_index=_temp_index(os.path.dirname(expected),project);temporary.append(own_index);os.unlink(own_index)
            own_env={**env,'GIT_INDEX_FILE':own_index}
            require(_git(project,options,own_env,'read-tree',full['tree']).returncode==0,
                    'session-delivery-index-invalid',409)
        elif head!=index.base_head:
            own_index=_temp_index(os.path.dirname(expected),project);temporary.append(own_index);os.unlink(own_index)
            own_env={**env,'GIT_INDEX_FILE':own_index}
            read=_git(project,options,own_env,'read-tree',head)
            require(read.returncode==0,'session-delivery-rebase-unavailable',409)
            from .delivery_recovery import rebase_index
            rebase_index(project,options,env,source_env,own_env,index.base_head,head,names,version)
        else:
            own_index=_temp_index(os.path.dirname(expected),project);temporary.append(own_index)
            _copy_session_index(expected,own_index,project.owner_uid)
            own_env={**env,'GIT_INDEX_FILE':own_index}
            if report_paths:
                restored=_git(project,options,{**own_env,'GIT_LITERAL_PATHSPECS':'1'},'reset','--quiet',head,'--',*report_paths)
                require(restored.returncode==0,'session-delivery-index-invalid',409)
        if full is not None and head!=full['head']:
            require(_git(project,options,own_env,'read-tree',head).returncode==0,'session-delivery-index-invalid')
            for path in full['paths']:
                row=_git(project,options,env,'ls-tree','-z',full['tree'],'--',path)
                if row.stdout:
                    header,_=row.stdout.rstrip(b'\0').split(b'\t',1);mode,kind,oid=header.decode().split()
                    added=_git(project,options,own_env,'update-index','--add','--cacheinfo',mode+','+oid+','+path)
                else:added=_git(project,options,own_env,'update-index','--force-remove','--',path)
                require(added.returncode==0,'session-delivery-index-invalid')
        system_reports=[] if separate_reports else include_change_statistics(project,index,options,env,own_env)
        names=list(dict.fromkeys([*names,*[report['path'] for report in system_reports]]))
        global_statistics=None if separate_reports else include_global_statistics(project,options,env,own_env)
        if global_statistics and 'STATISTICS.md' not in names:names=[*names,'STATISTICS.md']
        from .git_commit_remove import OID
        tree=_git(project,options,own_env,'write-tree')
        require(tree.returncode==0 and OID.fullmatch(tree.stdout.decode('ascii','strict').strip()),'session-delivery-index-invalid',409)
        values=(project.public_metadata or {}).get('values',{})
        name,email=values.get('GIT_USER_NAME',''),values.get('GIT_USER_EMAIL','')
        require(isinstance(name,str) and isinstance(email,str) and name and email and '\n' not in name+email and '\0' not in name+email,'project-git-identity-missing',409)
        identity={**own_env,'GIT_AUTHOR_NAME':name,'GIT_AUTHOR_EMAIL':email,'GIT_COMMITTER_NAME':name,'GIT_COMMITTER_EMAIL':email}
        commit=_git(project,options,identity,'commit-tree',tree.stdout.decode('ascii','strict').strip(),'-p',head,'-m',message)
        require(commit.returncode==0,'session-delivery-commit-unavailable',409)
        commit_id=commit.stdout.decode('ascii','strict').strip()
        require(OID.fullmatch(commit_id),'session-delivery-commit-unavailable',409)
        ident=_git(project,options,identity,'var','GIT_COMMITTER_IDENT')
        require(ident.returncode==0 and b'\n' not in ident.stdout.strip(),'session-delivery-tag-invalid',409)
        tag_body=b'object '+commit_id.encode('ascii')+b'\ntype commit\ntag '+version.encode('ascii')+b'\ntagger '+ident.stdout.strip()+b'\n\n'+version.encode('ascii')+b'\n'
        tag_obj=_git(project,options,identity,'mktag',data=tag_body)
        require(tag_obj.returncode==0,'session-delivery-tag-invalid',409)
        tag_id=tag_obj.stdout.decode('ascii','strict').strip()
        require(OID.fullmatch(tag_id),'session-delivery-tag-invalid',409)
        require(_index_digest(expected,project.owner_uid)==index_digest,'session-delivery-index-changed',409)
        return {'branch':branch,'head':head,'commit':commit_id,'tag':tag_id,'tagref':tagref,'paths':names,'gitdir':str(gitdir),'index_digest':index_digest,'temporary':temporary,'adoption':full['adoption'] if full is not None else index.origin.get('adoption'),'global_statistics':global_statistics,'system_reports':system_reports}
    except Exception:
        for path in temporary:
            try:os.unlink(path)
            except FileNotFoundError:pass
        raise


def _prepare_shared_index(project, options, env, plan):
    """Construit sous index.lock un index ordinaire préservant les autres entrées."""
    import os,stat
    from pathlib import Path
    gitdir=Path(plan['gitdir'])
    located=_git(project,options,env,'rev-parse','--path-format=absolute','--git-path','index')
    require(located.returncode==0,'session-delivery-index-invalid',409)
    try: shared=Path(located.stdout.decode('utf-8','strict').rstrip('\n'))
    except UnicodeError as error: raise Refused('session-delivery-index-invalid',409) from error
    require(shared.is_absolute() and shared.parent==gitdir and shared.name=='index','session-delivery-index-invalid',409)
    lock=str(shared)+'.lock';fd=None;temp=None;owned_lock=False;owned_lock_identity=None;shared_digest=None;shared_identity=None
    try:
        fd=os.open(lock,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
        owned_lock=True
        created_lock=os.fstat(fd);owned_lock_identity=[created_lock.st_dev,created_lock.st_ino]
        require(_head(project,options,env)==(plan['branch'],plan['head']),'session-delivery-head-changed',409)
        if os.geteuid()==0:os.fchown(fd,project.owner_uid,project.owner_gid if project.owner_gid is not None else -1)
        report_only=plan.get('report_only') is True
        if report_only:
            from .reports_git import report_path
            require(all(report_path(path) for path in plan['paths']),'report-commit-path-invalid')
        unmerged=_git(project,options,env,'ls-files','--unmerged','-z',*(['--',*plan['paths']] if report_only else []))
        require(unmerged.returncode==0 and not unmerged.stdout,'session-delivery-shared-index-conflict',409)
        existing=_changed_paths(project,options,env,plan['head'])
        from .session_git import shared_index_allowed
        require(report_only or shared_index_allowed(project,options,env,[path for path in plan['paths'] if path!='STATISTICS.md' and path not in {report['path'] for report in plan.get('system_reports',[])}],existing,plan.get('adoption')),'session-delivery-shared-index-conflict',409)
        from .session_git import shared_scope_digest
        adoption=plan.get('adoption') or {}
        if adoption.get('complete'):
            require(shared_scope_digest(project,options,env,adoption['paths'])==adoption['shared_digest'],
                    'session-delivery-shared-index-conflict',409)
        for report in plan.get('system_reports',[]):
            require(shared_scope_digest(project,options,env,[report['path']])==report['entry_digest'],'session-delivery-shared-index-conflict',409)
        if plan.get('global_statistics'):
            from .session_git import shared_scope_digest
            require(shared_scope_digest(project,options,env,['STATISTICS.md'])==plan['global_statistics']['entry_digest'],'session-delivery-shared-index-conflict',409)
        temp=_temp_index(str(gitdir/'cab-session-index'),project)
        if os.path.lexists(shared):
            source=os.open(shared,os.O_RDONLY|os.O_NOFOLLOW)
            try:
                info=os.fstat(source)
                require(stat.S_ISREG(info.st_mode) and info.st_uid==project.owner_uid and info.st_nlink==1 and info.st_size<=67108864,'session-delivery-index-invalid',409)
                if os.geteuid()==0:os.fchown(fd,info.st_uid,info.st_gid)
                os.fchmod(fd,stat.S_IMODE(info.st_mode))
                for attribute in os.listxattr(source):os.setxattr(fd,attribute,os.getxattr(source,attribute))
                target=os.open(temp,os.O_WRONLY|os.O_TRUNC|os.O_NOFOLLOW)
                try:
                    target_info=os.fstat(target)
                    require(stat.S_ISREG(target_info.st_mode) and target_info.st_uid==project.owner_uid and target_info.st_nlink==1,'session-delivery-index-invalid',409)
                    with os.fdopen(source,'rb') as inp,os.fdopen(target,'wb') as out:
                        source=None;target=None
                        fingerprint=hashlib.sha256()
                        while True:
                            chunk=inp.read(1048576)
                            if not chunk:break
                            fingerprint.update(chunk);out.write(chunk)
                        after=os.fstat(inp.fileno())
                        require((info.st_dev,info.st_ino,info.st_size,info.st_mtime_ns,info.st_ctime_ns)==(after.st_dev,after.st_ino,after.st_size,after.st_mtime_ns,after.st_ctime_ns),'session-delivery-shared-index-conflict',409)
                        shared_digest=fingerprint.hexdigest()
                        shared_identity=[info.st_dev,info.st_ino,info.st_size,info.st_mtime_ns,info.st_ctime_ns]
                finally:
                    if target is not None:os.close(target)
            finally:
                if source is not None:os.close(source)
        else:
            os.unlink(temp)
            read=_git(project,options,{**env,'GIT_INDEX_FILE':temp},'read-tree',plan['head'])
            require(read.returncode==0,'session-delivery-index-invalid',409)
        temp_env={**env,'GIT_INDEX_FILE':temp,'GIT_LITERAL_PATHSPECS':'1'}
        paths=b'\0'.join(path.encode('utf-8') for path in plan['paths'])+b'\0'
        reset=_git(project,options,temp_env,'reset','--quiet',plan['commit'],'--pathspec-from-file=-','--pathspec-file-nul',data=paths)
        require(reset.returncode==0,'session-delivery-index-invalid',409)
        tempfd=os.open(temp,os.O_RDONLY|os.O_NOFOLLOW)
        tempinfo=os.fstat(tempfd)
        if not (stat.S_ISREG(tempinfo.st_mode) and tempinfo.st_uid==project.owner_uid and tempinfo.st_nlink==1):
            os.close(tempfd)
            raise Refused('session-delivery-index-invalid',409)
        prepared=hashlib.sha256()
        with os.fdopen(tempfd,'rb') as source:
            while True:
                chunk=source.read(1048576)
                if not chunk:break
                prepared.update(chunk)
                view=memoryview(chunk)
                while view:
                    written=os.write(fd,view)
                    require(written>0,'session-delivery-index-invalid',409)
                    view=view[written:]
        os.fsync(fd);lockinfo=os.fstat(fd);os.close(fd);fd=None
        return {'shared':str(shared),'lock':lock,'temp':temp,'shared_digest':shared_digest,'shared_identity':shared_identity,'lock_identity':[lockinfo.st_dev,lockinfo.st_ino],'lock_digest':prepared.hexdigest()}
    except (OSError,UnicodeError,Refused) as error:
        if fd is not None:os.close(fd)
        if temp:
            try:os.unlink(temp)
            except FileNotFoundError:pass
        if owned_lock:
            try:
                info=os.lstat(lock)
                if [info.st_dev,info.st_ino]==owned_lock_identity:os.unlink(lock)
            except FileNotFoundError:pass
        if isinstance(error,Refused):raise
        raise Refused('session-delivery-index-invalid',409) from error


def _verify_shared_index(shared):
    import os,stat
    try:
        lockfd=os.open(shared['lock'],os.O_RDONLY|os.O_NOFOLLOW)
        with os.fdopen(lockfd,'rb') as lockstream:
            lockinfo=os.fstat(lockstream.fileno());lockhash=hashlib.sha256()
            while True:
                chunk=lockstream.read(1048576)
                if not chunk:break
                lockhash.update(chunk)
            lockafter=os.fstat(lockstream.fileno())
        require(stat.S_ISREG(lockinfo.st_mode) and [lockinfo.st_dev,lockinfo.st_ino]==shared['lock_identity'] and (lockinfo.st_size,lockinfo.st_mtime_ns,lockinfo.st_ctime_ns)==(lockafter.st_size,lockafter.st_mtime_ns,lockafter.st_ctime_ns) and lockhash.hexdigest()==shared['lock_digest'],'session-delivery-shared-index-conflict',409)
        if shared['shared_digest'] is None:
            require(not os.path.lexists(shared['shared']),'session-delivery-shared-index-conflict',409)
            return
        fd=os.open(shared['shared'],os.O_RDONLY|os.O_NOFOLLOW)
        with os.fdopen(fd,'rb') as stream:
            before=os.fstat(stream.fileno());fingerprint=hashlib.sha256()
            while True:
                chunk=stream.read(1048576)
                if not chunk:break
                fingerprint.update(chunk)
            after=os.fstat(stream.fileno())
        identity=[before.st_dev,before.st_ino,before.st_size,before.st_mtime_ns,before.st_ctime_ns]
        require(identity==shared['shared_identity'] and identity==[after.st_dev,after.st_ino,after.st_size,after.st_mtime_ns,after.st_ctime_ns] and fingerprint.hexdigest()==shared['shared_digest'],'session-delivery-shared-index-conflict',409)
    except OSError as error:
        raise Refused('session-delivery-shared-index-conflict',409) from error


def _remove_own_lock(shared):
    import os
    try:
        info=os.lstat(shared['lock'])
        if [info.st_dev,info.st_ino]==shared['lock_identity']:
            os.unlink(shared['lock'])
    except FileNotFoundError:
        pass


def _finish_shared_index(shared):
    import os
    os.replace(shared['lock'],shared['shared'])
    fd=os.open(os.path.dirname(shared['shared']),os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
    try:os.fsync(fd)
    finally:os.close(fd)


def commit_session(actor, data, *, full=None,tag_mode='create',expected_tag='',message='Mise à jour du projet',separate_reports=False):
    """Crée commit et tag d'une session sans incorporer l'index des autres."""
    import os
    from django.db import DatabaseError,connection,transaction
    from .core.commands import digest,event,identifier,run_scope,working
    from .core.models import GitFileReservation,GitSessionEffect,GitSessionIndex
    from .git_commit_remove import context
    from .project_git import _refresh_status
    require(not connection.in_atomic_block,'session-delivery-transaction-invalid',409)
    require({'project_id','run_id','request_id','version'}<=set(data)<= {'project_id','run_id','request_id','version','expected_index_digest'},'session-git-fields-invalid',400)
    request_id=identifier(data['request_id']);version=data['version'];version_tuple(version)
    expected_digest=data.get('expected_index_digest','')
    require(isinstance(expected_digest,str) and (not expected_digest or re.fullmatch(r'[a-f0-9]{64}',expected_digest)),'session-delivery-index-invalid',400)
    fingerprint=digest({'operation':'commit','version':version,'expected_index_digest':expected_digest,**({'full':full} if full is not None else {}),**({'tag_mode':tag_mode,'expected_tag':expected_tag,'message':message} if tag_mode!='create' else {})})
    with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_lock(%s,%s)',[7348501,7348502])
    effect=None;plan=None;shared=None;dispatched=False
    try:
        with transaction.atomic():
            with connection.cursor() as cursor:cursor.execute('SELECT id FROM projects WHERE id=%s FOR KEY SHARE',[data['project_id']])
            current=run_scope(actor,data['run_id'],data['project_id'],lock=True);working(current)
            prior=GitSessionEffect.objects.filter(run=current,request_id=request_id).first()
            if prior:
                require(prior.request_digest==fingerprint,'session-git-request-conflict',409)
                require(prior.state=='COMPLETED','session-git-effect-unresolved',409)
                return prior.receipt
            index=GitSessionIndex.objects.select_for_update().filter(change_id=current.change_record_id,session_id=current.coding_session_id).first()
            require(index is not None and index.state=='OPEN','session-delivery-index-invalid',409)
            if expected_digest:require(_index_digest(index.index_path,current.project.owner_uid)==expected_digest,'session-delivery-index-changed',409)
            require(not index.effects.filter(state__in=('INTENT','RUNNING','UNKNOWN')).exists(),'session-git-effect-unresolved',409)
            reservations=list(GitFileReservation.objects.filter(git_index=index,active=True).values_list('path',flat=True))
            require(reservations or full is not None,'session-git-reservation-required',409)
            effect=GitSessionEffect.objects.create(run=current,git_index=index,origin={'run_id':current.run_id,'session_id':current.session_id},request_id=request_id,request_digest=fingerprint,state='RUNNING')
            index.state='COMMITTING';index.save(update_fields=['state','updated'])
            project=current.project
            event(current,'git-session-commit-started',{'request_id':request_id,'version':version})
        plan=prepare_commit(project,index,version,reservations,full=full,tag_mode=tag_mode,expected_tag=expected_tag,message=message,separate_reports=separate_reports)
        options,env=context(project)
        shared=_prepare_shared_index(project,options,env,plan)
        with transaction.atomic():
            effect=GitSessionEffect.objects.select_for_update().get(pk=effect.pk)
            require(effect.state=='RUNNING','session-git-effect-unresolved',409)
            effect.receipt={'branch':plan['branch'],'previous':plan['head'],'commit':plan['commit'],'tag':version,'tag_oid':plan['tag'],'index_lock':shared['lock'],'index_path':shared['shared'],'shared_digest':shared['shared_digest'],'shared_identity':shared['shared_identity'],'lock_identity':shared['lock_identity'],'lock_digest':shared['lock_digest'],'session_index_digest':plan['index_digest']}
            effect.save(update_fields=['receipt','updated'])
        tag_command=('create '+plan['tagref']+' '+plan['tag']+'\n' if tag_mode=='create' else 'update '+plan['tagref']+' '+plan['tag']+' '+expected_tag+'\n' if tag_mode=='move' else '')
        commands=('start\nupdate '+plan['branch']+' '+plan['commit']+' '+plan['head']+'\n'+tag_command+'prepare\ncommit\n').encode('utf-8')
        _verify_shared_index(shared)
        require(_index_digest(index.index_path,project.owner_uid)==plan['index_digest'],'session-delivery-index-changed',409)
        require(_head(project,options,env)==(plan['branch'],plan['head']),'session-delivery-head-changed',409)
        dispatched=True
        result=_git(project,options,env,'update-ref','--stdin',data=commands)
        require(result.returncode==0,'session-delivery-result-unknown',409)
        _verify_shared_index(shared)
        _finish_shared_index(shared)
        _refresh_status(project.pk)
        with transaction.atomic():
            effect=GitSessionEffect.objects.select_for_update().get(pk=effect.pk)
            index=GitSessionIndex.objects.select_for_update().get(pk=index.pk)
            require(effect.state=='RUNNING','session-git-effect-unresolved',409)
            index.state='COMMITTED';index.save(update_fields=['state','updated'])
            from django.utils import timezone
            GitFileReservation.objects.filter(git_index=index,active=True).update(active=False,released=timezone.now())
            effect.state='COMPLETED';effect.receipt={'request_id':request_id,'state':'COMPLETED','commit':plan['commit'],'tag':version if tag_mode!='none' else None,'tag_oid':plan['tag'] if tag_mode!='none' else None,'branch':plan['branch'],'session_index_digest':plan['index_digest'],'system_paths':([report['path'] for report in plan.get('system_reports',[])]+(['STATISTICS.md'] if plan.get('global_statistics') else []))};effect.save(update_fields=['state','receipt','updated'])
            event(current,'git-session-commit-completed',{'request_id':request_id,'commit':plan['commit'],'tag':version})
            return effect.receipt
    except (OSError,UnicodeError,Refused,DatabaseError) as error:
        if effect is not None:
            try:
                with transaction.atomic():
                    GitSessionEffect.objects.filter(pk=effect.pk,state='RUNNING').update(state='UNKNOWN' if dispatched else 'FAILED')
                    GitSessionIndex.objects.filter(pk=effect.git_index_id).update(state='UNKNOWN' if dispatched else 'OPEN')
            except DatabaseError:
                raise Refused('session-delivery-result-unknown',409) from error
        if dispatched:raise Refused('session-delivery-result-unknown',409) from error
        raise
    finally:
        try:
            if shared:
                try:os.unlink(shared['temp'])
                except FileNotFoundError:pass
                if not dispatched:_remove_own_lock(shared)
            if plan:
                for path in plan['temporary']:
                    try:os.unlink(path)
                    except FileNotFoundError:pass
        finally:
            with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_unlock(%s,%s)',[7348501,7348502])


def validate_remote_tags(version, tags):
    """Applique la priorité DIU sans supprimer ni modifier les autres tags."""
    requested=delivery_version_order(version)
    for ref in tags:
        require(ref.startswith('refs/tags/'),'session-delivery-remote-tags-invalid',409)
        name=ref[len('refs/tags/'):]
        value=name[1:] if name.startswith(('v','V')) and len(name)>1 and name[1].isdigit() else name
        if timestamp_tag(value):
            continue
        require(NUMERIC_VERSION.fullmatch(value) is not None,'session-delivery-remote-tag-incomparable',409)
        remote=delivery_version_order(value)
        require(remote<requested,'session-delivery-remote-tag-not-older',409)


def reports_only_between(project,options,env,older,newer):
    if older==newer:return True
    from .reports_git import report_path
    if _git(project,options,env,'merge-base','--is-ancestor',older,newer).returncode!=0:return False
    diff=_git(project,options,env,'diff','--name-only','-z',older,newer)
    return diff.returncode==0 and all(report_path(p.decode()) for p in diff.stdout.split(b'\0') if p)


def push_version(project, forge, version, expected_commit, expected_tag, before_push, expected_remote, expected_signature, expected_branch,*,allow_reports=False):
    """Envoie atomiquement la branche et son tag de version, avec leases explicites."""
    from .forge_push import context,local_git,remote_git
    from .forge_sync import refs
    from .forge_repository import identity
    from .project_metadata import read_metadata
    from .git_commit_remove import OID
    version_tuple(version)
    require(isinstance(expected_commit,str) and OID.fullmatch(expected_commit) and isinstance(expected_tag,str) and OID.fullmatch(expected_tag),'session-delivery-head-invalid',400)
    values,owner,branch,url,group,options,env=context(project,forge)
    metadata=read_metadata(project.root)
    require(metadata['state']=='ready' and branch==expected_branch and identity(project,metadata['values'],forge)==expected_signature and identity(project,values,forge)==expected_signature,'session-delivery-config-changed',409)
    local_git(project,options,env,'check-ref-format','--branch',branch)
    head=local_git(project,options,env,'rev-parse','--verify','HEAD^{commit}').decode('ascii','strict').strip()
    tag_ref='refs/tags/'+version
    tag=local_git(project,options,env,'rev-parse','--verify',tag_ref).decode('ascii','strict').strip()
    require((head==expected_commit or allow_reports and reports_only_between(project,options,env,expected_commit,head)) and tag==expected_tag,'session-delivery-head-changed',409)
    remote,tags,_=refs(project,forge,owner,group,options,env,url,branch)
    require(remote==expected_remote,'session-delivery-remote-changed',409)
    validate_remote_tags(version,tags)
    require(tag_ref not in tags,'session-delivery-remote-tag-not-older',409)
    branch_ref='refs/heads/'+branch
    before_push({'branch':branch,'previous':remote or None,'commit':expected_commit,'tag':version,'tag_oid':expected_tag})
    result=remote_git(project,forge,owner,group,options,env,'push','--atomic','--porcelain','--no-follow-tags','--force-with-lease='+branch_ref+':'+remote,'--force-with-lease='+tag_ref+':',url,expected_commit+':'+branch_ref,expected_tag+':'+tag_ref,timeout=120)
    require(result.returncode==0,'session-delivery-result-unknown',409)
    final_head,final_tags,_=refs(project,forge,owner,group,options,env,url,branch)
    require(final_head==expected_commit and final_tags.get(tag_ref)==expected_tag,'session-delivery-result-unknown',409)
    return {'branch':branch,'commit':expected_commit,'tag':version,'verified':True}


def execute_native_build(project,kind,version,before_execute,*,reference=None):
    import subprocess
    from .project_artifacts import BUILDERS, enabled, refresh
    from .project_metadata import read_metadata
    source=read_metadata(project.root)
    metadata=source['values']
    require(source['state']=='ready' and enabled(metadata,kind) and metadata.get('PROJECT_VERSION')==version,
            'session-delivery-build-config-changed',409)
    started=False
    receipt={'kind':kind,'source_mode':'frozen-tree' if reference else 'isolated-working-copy','version':version,'builder':'cab'}

    def mark(value):
        nonlocal started
        started=True
        before_execute({**receipt,'phase':'started',**value})

    try:
        from .build_workspace import REFERENCE
        token=REFERENCE.set(reference)
        try:code=BUILDERS[kind](project,metadata,mark)
        finally:REFERENCE.reset(token)
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        raise Refused('session-delivery-artifact-outcome-uncertain' if started else
                      'session-delivery-artifact-build-failed',409) from error
    if code==0:
        try:
            refresh(project,kind)
        except (OSError,ValueError,Refused):
            # Une lecture indisponible sera reprise par l'inventaire périodique.
            pass
    return {**receipt,'exit_code':code,'executed':started}


def execute_native_publication(project,target,version,plan,before_execute):
    import subprocess
    import httpx
    from .forge_publish_artifacts import PUBLISHERS,local_plan
    from .forge_repository import identity,refresh_one
    from .project_metadata import read_metadata
    source=read_metadata(project.root)
    values=source['values']
    forge=target['name']
    require(source['state']=='ready' and values.get('PROJECT_VERSION')==version and
            identity(project,values,forge)==target['signature'] and
            (forge!='GITLAB' or values.get('REMOTE_GITLAB_REGISTRY','')==target.get('registry','')),
            'session-delivery-config-changed',409)
    selected=local_plan(project,values,version=version)
    kinds={kind for kind in ('debian','docker') if plan[kind]}
    require(kinds.issubset(selected),
            'session-delivery-version-artifact-missing',409)
    selected={kind:selected[kind] for kind in sorted(kinds)}
    receipt={'publisher':'cab','version':version,'tag':version}
    issued=False

    def mark():
        nonlocal issued
        if not issued:
            before_execute({**receipt,'executed':True})
            issued=True

    try:
        PUBLISHERS[forge](project,values,selected,mark)
    except (Refused,httpx.HTTPError,OSError,ValueError,subprocess.SubprocessError) as error:
        if isinstance(error,Refused):
            raise
        raise Refused('session-delivery-artifact-publication-unconfirmed' if issued else
                      'session-delivery-artifact-publication-failed',409) from error
    try:
        refresh_one(project.pk,forge,wait=True,automatic=False)
    except (OSError,Refused):
        pass
    return {**receipt,'exit_code':0,'executed':issued}


def delivery_preflight(project, version, *, defer_releases=False):
    """Vérifie identité, version, forges et capacités sans publier ni écrire."""
    from pathlib import Path
    from .forge_push import FORGES,context
    from .forge_repository import identity
    from .forge_sync import refs
    from .project_metadata import read_metadata
    version_tuple(version)
    metadata=read_metadata(project.root)
    require(metadata['state']=='ready','session-delivery-config-invalid',409)
    values=metadata['values'];project_id=values.get('PROJECT_ID','')
    require(project_id and project_id==project.identifier and Path(project.root).name==project_id,'session-delivery-project-mismatch',409)
    flags={}
    for key in ('PROJECT_DEBIAN_PACKAGE','PROJECT_DOCKERED'):
        value=values.get(key,'').lower()
        require(value in ('yes','no','1','0'),'session-delivery-config-invalid',409)
        flags[key]=value in ('yes','1')
    original=file_operation(project,{'op':'env-read'})
    raw=base64.b64decode(original['content'],validate=True)
    replace_version(raw,version)
    forges=[]
    for forge in FORGES:
        prefix='REMOTE_'+forge+'_'
        keys=('OWNER','REPOSITORY','NAME','BRANCH')
        if any(values.get(prefix+key) for key in keys):
            require(all(values.get(prefix+key) for key in ('OWNER','REPOSITORY','BRANCH')),'session-delivery-forge-incomplete',409)
            signature=identity(project,values,forge)
            require(signature==identity(project,(project.public_metadata or {}).get('values',{}),forge),'session-delivery-config-changed',409)
            _,owner,branch,url,group,options,env=context(project,forge)
            remote,tags,_=refs(project,forge,owner,group,options,env,url,branch)
            validate_remote_tags(version,tags)
            forges.append({'name':forge,'branch':branch,'remote':remote,'signature':signature,
                           **({'registry':values.get('REMOTE_GITLAB_REGISTRY','')} if forge=='GITLAB' else {})})
    from .versioning import release_metadata
    return {'project_id':project_id,'forges':forges,'release_metadata':release_metadata(version),'debian':flags['PROJECT_DEBIAN_PACKAGE'],'docker':flags['PROJECT_DOCKERED'],'version':version,'env_sha256':original['digest'],'source_mode':'working-tree','builder':'cab','publisher':'cab','defer_releases':defer_releases}


def verify_version(project, forge, version, commit, tag_oid, expected_signature, expected_branch):
    """Relit la branche et le tag sans reproduire l'envoi."""
    from .forge_push import context
    from .forge_repository import identity
    from .forge_sync import refs
    from .project_metadata import read_metadata
    values,owner,branch,url,group,options,env=context(project,forge)
    metadata=read_metadata(project.root)
    require(metadata['state']=='ready' and branch==expected_branch and identity(project,metadata['values'],forge)==expected_signature and identity(project,values,forge)==expected_signature,'session-delivery-config-changed',409)
    remote,tags,_=refs(project,forge,owner,group,options,env,url,branch)
    require(remote==commit and tags.get('refs/tags/'+version)==tag_oid,'session-delivery-remote-changed',409)
    return {'branch':branch,'commit':commit,'tag':version,'verified':True}


def ensure_delivery_producer(project):
    """Identité interne non connectable ; le service seul produit les reçus."""
    import secrets
    from django.db import transaction
    from .core.models import Actor,EvidenceProducer
    with transaction.atomic():
        actor,_=Actor.objects.get_or_create(pk='cab-delivery-service',defaults={'uid':0,'agent':'cab-service','role':'collector','token_hash':hashlib.sha256(secrets.token_bytes(32)).hexdigest(),'native':{'component':'session-delivery'}})
        require(actor.active and actor.uid==0 and actor.role=='collector' and actor.native.get('component')=='session-delivery','session-delivery-producer-invalid',409)
        actor.projects.add(project)
        producer,_=EvidenceProducer.objects.get_or_create(pk='cab-delivery:'+project.pk,defaults={'project':project,'actor':actor,'kinds':['publication']})
        require(producer.active and producer.actor_id==actor.pk and producer.project_id==project.pk and producer.kinds==['publication'],'session-delivery-producer-invalid',409)
    return producer.pk


def attest_delivery(delivery_id):
    """Atteste le tag réellement envoyé ; les releases différées restent exclues."""
    from .core.models import EvidenceProducer,FinalizationPlan,GitDelivery
    from .core.run_evidence import attest,identity
    from .core.commands import digest
    from .git_commit_remove import context
    delivery=GitDelivery.objects.select_related('run__actor','project').get(pk=delivery_id)
    require(delivery.run_id is not None and delivery.plan.get('forges'),'session-delivery-publication-missing',409)
    require(not delivery.steps.exclude(state__in=['COMPLETED','SKIPPED']).exists(),'session-delivery-not-finished',409)
    producer=EvidenceProducer.objects.select_related('actor').filter(pk=delivery.plan.get('evidence_producer'),project=delivery.project,active=True,actor__active=True,actor__uid=0,actor__role='collector').first()
    require(producer is not None and 'publication' in producer.kinds,'session-delivery-producer-invalid',409)
    plan=FinalizationPlan.objects.get(run=delivery.run)
    rules=[rule for rule in plan.policy.get('requirements',[]) if rule.get('producer')==producer.pk and rule.get('kind')=='publication']
    require(rules,'session-delivery-producer-rule-missing',409)
    options,env=context(delivery.project)
    blob=_git(delivery.project,options,env,'cat-file','tag',delivery.tag_oid)
    require(blob.returncode==0 and blob.stdout.startswith(('object '+delivery.commit_oid+'\n').encode()),'session-delivery-tag-changed',409)
    artifact=hashlib.sha256(blob.stdout).hexdigest()
    package_step=delivery.steps.filter(key='verify:package',state='COMPLETED').first()
    if package_step:artifact=package_step.receipt['package_sha256']
    elif any(rule.get('producer')=='cab-update' for rule in plan.policy['requirements']) and delivery.plan.get('debian'):
        from .publication_identity import verified_package
        package,_=verified_package(delivery,before_retire=True);artifact=package['sha256']
    for rule in rules:
        attest(producer.actor,{**identity(delivery.run),'producer_id':producer.pk,'evidence_id':digest(['delivery',delivery.pk,rule['id'],artifact]),'rule_id':rule['id'],'kind':'publication','result':'passed','source_revision':delivery.plan['source_revision'],'artifact_sha256':artifact,'reference':'cab-delivery-'+str(delivery.pk)})


def configure_delivery_policy(actor,data):
    """Politique de publication et reprise administrative strictement bornée."""
    if isinstance(data,dict) and "action" in data:
        from .delivery_recovery import dispatch
        return dispatch(actor,data)
    from django.db import transaction
    from .core import commands as c
    from .core.models import Event,EvidenceProducer
    c.require(actor.role=='admin','session-delivery-admin-required',403)
    c.require({'project_id','run_id','version','defer_releases','request_id','authorization'}<=set(data)<={'project_id','run_id','version','defer_releases','request_id','authorization','evidence_producer','diu_release_version'},'session-delivery-fields-invalid',400)
    version_tuple(data['version']);request_id=c.identifier(data['request_id'])
    deferred=data['defer_releases']
    c.require(type(deferred) is bool,'session-delivery-release-policy-unavailable',409)
    c.require(isinstance(data['authorization'],str) and 0<len(data['authorization'])<=4000,'session-delivery-authorization-required',400)
    with transaction.atomic():
        run=c.run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False)
        previous=Event.objects.filter(run=run,kind='session-delivery-policy',data__request_id=request_id).first()
        fingerprint=c.digest(data)
        if previous:
            c.require(previous.data.get('request_digest')==fingerprint,'session-delivery-request-conflict',409)
            return {'configured':True,'version':data['version'],'defer_releases':deferred}
        c.working(run);c.require(c.no_pending(run),'session-git-effect-unresolved',409)
        producer_id=data.get('evidence_producer') or ensure_delivery_producer(run.project)
        c.require(EvidenceProducer.objects.filter(pk=producer_id,project=run.project,active=True,actor__active=True,actor__uid=0,actor__role='collector',kinds__contains=['publication']).exists(),'session-delivery-producer-invalid',409)
        c.event(run,'session-delivery-policy',{'request_id':request_id,'request_digest':fingerprint,'version':data['version'],'defer_releases':deferred,'evidence_producer':producer_id,'authorization':data['authorization'],'authority':actor.pk})
    return {'configured':True,'version':data['version'],'defer_releases':deferred}


BUILD_STRATEGY = 'working-tree'


def _delivery_keys(plan):
    forges=[item['name'] for item in plan['forges']]
    require(len(forges)==len(set(forges)) and all(name in ('FORGEJO','GITHUB','GITLAB') for name in forges),'session-delivery-plan-invalid',409)
    keys=['version','version-projection','commit']+['forge:'+name for name in forges]
    if plan['docker']:keys.append('build:docker')
    if plan['debian']:keys.append('build:debian')
    if plan['docker'] or plan['debian']:keys += ['release:'+name for name in forges]
    keys += ['verify:'+name for name in forges]
    if plan.get('package_identity'):keys.append('verify:package')
    return keys+['retire']


def _delivery_view(delivery):
    public={'error','commit','branch','tag','version','exit_code','verified','reason','source_mode','executed','kind','builder','publisher'}
    return {'version':delivery.version,'state':delivery.state,'scope':delivery.plan.get('scope','change'),'commit':delivery.commit_oid or None,'steps':[{'key':step.key,'state':step.state,'receipt':{key:value for key,value in step.receipt.items() if key in public}} for step in delivery.steps.order_by('pk')]}


def _publish_delivery(delivery_id):
    from django.db import transaction
    from .core.models import GitDelivery,Project,ProjectMetadataProjection
    project_id=GitDelivery.objects.values_list('project_id',flat=True).get(pk=delivery_id)
    with transaction.atomic():
        project=Project.objects.select_for_update().get(pk=project_id)
        delivery=GitDelivery.objects.get(pk=delivery_id)
        view=_delivery_view(delivery)
        from .notifications import delivery_notification
        delivery_notification(delivery,view)
        snapshot=dict(project.public_metadata or {})
        if snapshot.get('git_delivery')!=view:
            snapshot['git_delivery']=view
            snapshot['revision']=int(snapshot.get('revision',0))+1
            project.public_metadata=snapshot
            project.save(update_fields=['public_metadata'])
            ProjectMetadataProjection.objects.update_or_create(pk=project.pk,defaults={'public_metadata':snapshot})


def _set_step(delivery_id, key, state, receipt=None):
    from django.db import transaction
    from .core.models import GitDeliveryStep
    with transaction.atomic():
        step=GitDeliveryStep.objects.select_for_update().get(delivery_id=delivery_id,key=key)
        allowed={'PENDING':('RUNNING','SKIPPED'),'RUNNING':('COMPLETED','FAILED','UNKNOWN')}
        require(state in allowed.get(step.state,()),'session-delivery-step-state-invalid',409)
        step.state=state
        if receipt is not None:step.receipt={**step.receipt,**receipt}
        step.save(update_fields=['state','receipt','updated'])
        from .stage_substeps import delivery_step
        linked=delivery_step(step.delivery,key,state,step.receipt)
        if linked:step.stage_iteration=linked;step.save(update_fields=['stage_iteration'])
    _publish_delivery(delivery_id)


def _update_step_receipt(delivery_id,key,receipt):
    from django.db import transaction
    from .core.models import GitDeliveryStep
    with transaction.atomic():
        step=GitDeliveryStep.objects.select_for_update().get(delivery_id=delivery_id,key=key)
        require(step.state=='RUNNING','session-delivery-step-state-invalid',409)
        step.receipt=receipt;step.save(update_fields=['receipt','updated'])
        from .stage_substeps import delivery_step
        delivery_step(step.delivery,key,step.state,receipt)


def _set_delivery_state(delivery_id,state):
    from django.db import transaction
    from .core.models import GitDelivery
    with transaction.atomic():
        delivery=GitDelivery.objects.select_for_update().get(pk=delivery_id)
        if delivery.state=='COMPLETED' and state!='COMPLETED':return
        delivery.state=state;delivery.save(update_fields=['state','updated'])
    if state in ('COMPLETED','PARTIAL','FAILED','UNKNOWN'):
        from .stage_substeps import phase
        reference=delivery.plan.get('publication_ref')
        if reference:
            phase(delivery.run,'publication',reference,'COMPLETED' if state=='COMPLETED' else 'UNKNOWN' if state=='UNKNOWN' else 'FAILED',{'delivery_id':delivery.pk,'state':state})
    _publish_delivery(delivery_id)


def _launch_delivery(delivery_id):
    import threading
    try:
        threading.Thread(target=_delivery_worker,args=(delivery_id,),name='cab-session-delivery',daemon=True).start()
    except RuntimeError:
        _set_delivery_state(delivery_id,'UNKNOWN')


def start_delivery(actor, run, version, connector_id, *, complete=False):
    """Cadre une livraison ; aucune étape n'est rejouée pour une même version."""
    import os
    from django.db import IntegrityError,transaction
    from .connector_process import identity as process_identity
    from .core.commands import no_pending,revision,run_scope,working
    from .core.models import FinalizationPlan,GitDelivery,GitDeliveryStep,GitFileReservation,GitSessionIndex,Operation,Project
    from .project_metadata import synchronize

    version_tuple(version)
    existing=GitDelivery.objects.filter(run=run,version=version).first()
    if existing is not None:
        require((existing.plan.get('scope')=='project')==complete,'session-delivery-scope-conflict',409)
        return delivery_status(actor,run,version,connector_id)
    from .package_versions import require_aligned
    require_aligned(run.project.root,version)
    selection=delivery_version_selection(actor,run,version)
    if run.cycle_steps == 12:
        from .version_skill import require_acknowledged
        require_acknowledged(run)
        active_policy=version_policy(run)
        require(selection.get('previous_version')==active_policy['current_version']
                and selection.get('policy')==active_policy['numeric_components'],
                'session-delivery-version-selection-stale',409)
    working(run)
    require(no_pending(run),'session-git-effect-unresolved',409)
    contract=FinalizationPlan.objects.filter(run=run).first()
    require(contract is not None and contract.policy.get('nature')=='delivery','session-delivery-not-authorized',403)
    index=GitSessionIndex.objects.filter(change_id=run.change_record_id,session_id=run.coding_session_id).first()
    require(index is not None and index.state=='OPEN','session-delivery-index-invalid',409)
    reservations=list(GitFileReservation.objects.filter(git_index=index,active=True).values_list('path',flat=True))
    require(reservations,'session-git-reservation-required',409)
    modern=run.configuration.get('cycle_profile')=='publication-12-v1'
    if complete:
        from .preexisting_git import git_guard
        with git_guard():
            git_plan=preflight_commit(run.project,index,version,reservations,complete=True,separate_reports=modern)
    else:
        git_plan=preflight_commit(run.project,index,version,reservations,separate_reports=modern)
    current_revision=revision(run)
    validations=Operation.objects.filter(run=run,state='COMPLETED',source_revision=current_revision).order_by('-updated')[:50]
    require(any(op.receipt.get('exit_code')==0 and (op.request.get('phase') in ('test','verify','verification') or isinstance(op.request.get('host_authorization'),dict)) for op in validations),'session-git-validation-required',409)
    synchronize(run.project_id,include_forges=True,include_git=False)
    project=Project.objects.get(pk=run.project_id)
    from .core.models import Event
    policy=Event.objects.filter(run=run,kind='session-delivery-policy',data__version=version).order_by('-pk').first()
    plan=delivery_preflight(project,version,defer_releases=bool(policy and policy.data.get('defer_releases') is True))
    plan['evidence_producer']=(policy.data.get('evidence_producer') if policy else None) or ensure_delivery_producer(project)
    plan['package_identity']=bool(plan.get('debian') and any(rule.get('producer')=='cab-update' for rule in contract.policy['requirements']))
    from .core.models import EvidenceProducer
    require(EvidenceProducer.objects.filter(pk=plan['evidence_producer'],project=project,active=True,actor__active=True,actor__uid=0,actor__role='collector',kinds__contains=['publication']).exists(),'session-delivery-producer-invalid',409)
    require(any(rule.get('kind')=='publication' and rule.get('producer')==plan['evidence_producer'] for rule in contract.policy.get('requirements',[])),'session-delivery-producer-rule-missing',409)
    if plan['debian'] or plan['docker']:
        require(BUILD_STRATEGY=='working-tree','session-delivery-build-policy-unavailable',409)
    plan['version_selection']=selection
    plan['source_revision']=current_revision
    plan['git']=git_plan
    plan['scope']='project' if complete else 'change'
    if modern:
        from .publication_boundary import prepare
        def prepublication():
            receipt=update_version(project,version,plan['env_sha256'])
            synchronize(project.pk,include_forges=False,include_git=False)
            return {'version':receipt,'version-projection':{'verified':True}}
        boundary=prepare(run,commit_reports=True,before_freeze=prepublication)
        plan['prepublication']=boundary['preparation'];plan['statistics_job']=boundary['statistics_job'];plan['separate_reports']=True;plan['publication_ref']=boundary['publication_ref']
    executor=process_identity(os.getpid())
    require(executor is not None,'session-delivery-worker-unavailable',409)
    try:
        with transaction.atomic():
            Project.objects.select_for_update(no_key=True).get(pk=run.project_id)
            from .project_artifacts import require_available
            if plan['debian'] or plan['docker']:
                require_available(project)
            current=run_scope(actor,run.run_id,run.project_id,lock=True);working(current)
            from .core.connectors import lock_worker_binding
            lock_worker_binding(actor,connector_id,current)
            locked_index=GitSessionIndex.objects.select_for_update().get(pk=index.pk)
            require(locked_index.state=='OPEN' and not locked_index.effects.filter(state__in=['INTENT','RUNNING','UNKNOWN']).exists(),'session-git-effect-unresolved',409)
            require(_index_digest(locked_index.index_path,current.project.owner_uid)==git_plan['index_digest'],'session-delivery-index-changed',409)
            require(revision(current)==current_revision,'session-delivery-source-changed',409)
            delivery,created=GitDelivery.objects.get_or_create(project_id=current.project_id,run=current,version=version,defaults={'git_index':locked_index,'state':'PENDING','executor':executor,'plan':plan,'origin':{'run_id':current.run_id,'session_id':current.session_id}})
            if not created:
                return _delivery_view(delivery)
            keys=_delivery_keys(plan)
            GitDeliveryStep.objects.bulk_create([GitDeliveryStep(delivery=delivery,key=key,state='COMPLETED' if key in plan.get('prepublication',{}) else 'PENDING',receipt=plan.get('prepublication',{}).get(key,{})) for key in keys])
            transaction.on_commit(lambda:_launch_delivery(delivery.pk))
    except IntegrityError as error:
        raise Refused('session-delivery-active',409) from error
    _publish_delivery(delivery.pk)
    delivery.refresh_from_db()
    return _delivery_view(delivery)


def _retire_index(delivery_id):
    from django.db import connection
    require(not connection.in_atomic_block,'session-delivery-transaction-invalid',409)
    with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_lock(%s,%s)',[7348501,7348502])
    try:return _retire_index_locked(delivery_id)
    finally:
        with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_unlock(%s,%s)',[7348501,7348502])


def _retire_index_locked(delivery_id):
    """Conserve une copie de secours jusqu'au reçu durable de retrait."""
    import os,stat,subprocess
    from pathlib import Path
    from django.db import connection,transaction
    from .core.commands import digest,event
    from .core.models import GitDelivery,GitDeliveryStep,GitSessionEffect,GitSessionIndex
    from .git_commit_remove import context
    from .session_git import _index_path

    require(not connection.in_atomic_block,'session-delivery-transaction-invalid',409)
    with transaction.atomic():
        delivery=GitDelivery.objects.select_for_update(of=('self',)).select_related('run__actor','project').get(pk=delivery_id)
        require(delivery.state=='RUNNING' and delivery.run_id is not None,'session-delivery-step-state-invalid',409)
        version_tuple(delivery.version)
        require(set(delivery.steps.values_list('key',flat=True))==set(_delivery_keys(delivery.plan)),'session-delivery-plan-invalid',409)
        require(not delivery.steps.exclude(key='retire').exclude(state__in=['COMPLETED','SKIPPED']).exists(),'session-delivery-not-finished',409)
        index=GitSessionIndex.objects.select_for_update().get(pk=delivery.git_index_id)
        require(index.state=='COMMITTED' and not index.effects.filter(state__in=['INTENT','RUNNING','UNKNOWN']).exists(),'session-git-effect-unresolved',409)
        from .git_commit_remove import OID
        require(index.keep_ref=='refs/cab/session-index/'+Path(index.index_path).stem and isinstance(index.keep_oid,str) and OID.fullmatch(index.keep_oid),'session-delivery-index-invalid',409)
        expected=delivery.steps.get(key='commit').receipt.get('session_index_digest','')
        require(isinstance(expected,str) and re.fullmatch(r'[a-f0-9]{64}',expected),'session-delivery-index-invalid',409)
        step=GitDeliveryStep.objects.select_for_update().get(delivery=delivery,key='retire')
        require(step.state=='PENDING','session-delivery-step-state-invalid',409)
        request_id='delivery-'+str(delivery.pk)+'-retire'
        effect=GitSessionEffect.objects.create(run=delivery.run,git_index=index,origin={'run_id':delivery.run.run_id,'session_id':delivery.run.session_id},request_id=request_id,request_digest=digest({'operation':'retire','digest':expected}),state='RUNNING')
        backup_name=Path(index.index_path).name+'.retired-'+str(effect.pk)
        effect.receipt={'backup_name':backup_name,'index_digest':expected,'keep_ref':index.keep_ref,'keep_oid':index.keep_oid,'base_ref':'refs/cab/session-base/'+Path(index.index_path).stem,'base_oid':index.base_head,'cleanup_pending':True};effect.save(update_fields=['receipt','updated'])
        step.state='RUNNING';step.save(update_fields=['state','updated'])
        index.state='RETIRING';index.save(update_fields=['state','updated'])
    parent=None;backup_identity=None;mutated=False
    try:
        options,env=context(delivery.project)
        from .session_git import _reference_hook_safe
        _reference_hook_safe(delivery.project,options,env)
        tag=_git(delivery.project,options,env,'rev-parse','--verify','refs/tags/'+delivery.version)
        target=_git(delivery.project,options,env,'rev-parse','--verify','refs/tags/'+delivery.version+'^{commit}')
        require(tag.returncode==0 and target.returncode==0 and tag.stdout.decode('ascii','strict').strip()==delivery.tag_oid and target.stdout.decode('ascii','strict').strip()==delivery.commit_oid,'session-delivery-tag-changed',409)
        path=_index_path(delivery.project,index,options,env)
        require(path==index.index_path and _index_digest(path,delivery.project.owner_uid)==expected,'session-delivery-index-changed',409)
        parent=Path(path).parent;name=Path(path).name
        dirfd=os.open(parent,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
        try:
            info=os.stat(name,dir_fd=dirfd,follow_symlinks=False)
            require(stat.S_ISREG(info.st_mode) and info.st_uid==delivery.project.owner_uid and info.st_nlink==1,'session-delivery-index-invalid',409)
            require(_index_digest(path,delivery.project.owner_uid)==expected,'session-delivery-index-changed',409)
            again=os.stat(name,dir_fd=dirfd,follow_symlinks=False)
            require((info.st_dev,info.st_ino,info.st_size,info.st_mtime_ns,info.st_ctime_ns)==(again.st_dev,again.st_ino,again.st_size,again.st_mtime_ns,again.st_ctime_ns),'session-delivery-index-changed',409)
            mutated=True
            os.link(name,backup_name,src_dir_fd=dirfd,dst_dir_fd=dirfd,follow_symlinks=False)
            backup_identity=(info.st_dev,info.st_ino);os.fsync(dirfd)
            commands=['start',f'verify refs/tags/{delivery.version} {delivery.tag_oid}',f'delete {index.keep_ref} {index.keep_oid}']
            if index.base_head:commands.append(f'delete refs/cab/session-base/{Path(index.index_path).stem} {index.base_head}')
            commands.extend(['prepare','commit'])
            deleted=subprocess.run(['/usr/bin/git','-C',delivery.project.root,'update-ref','--stdin'],input=('\n'.join(commands)+'\n').encode('ascii'),cwd='/',env=env,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,timeout=120,**options)
            require(deleted.returncode==0,'session-git-effect-unresolved',409)
            os.unlink(name,dir_fd=dirfd);os.fsync(dirfd)
        finally:os.close(dirfd)
    except (OSError,UnicodeError,Refused) as error:
        code='session-git-effect-unresolved' if mutated else getattr(error,'code','session-delivery-index-invalid')
        with transaction.atomic():
            GitSessionEffect.objects.filter(pk=effect.pk,state='RUNNING').update(state='UNKNOWN' if mutated else 'FAILED')
            GitSessionIndex.objects.filter(pk=index.pk).update(state='UNKNOWN' if mutated else 'COMMITTED')
            GitDeliveryStep.objects.filter(pk=step.pk,state='RUNNING').update(state='UNKNOWN' if mutated else 'FAILED',receipt={'error':code})
        raise Refused(code,409) from error
    with transaction.atomic():
        index=GitSessionIndex.objects.select_for_update().get(pk=index.pk)
        index.state='RETIRED';index.save(update_fields=['state','updated'])
        effect=GitSessionEffect.objects.select_for_update().get(pk=effect.pk)
        effect.state='COMPLETED';effect.receipt={**effect.receipt,'state':'COMPLETED','request_id':request_id};effect.save(update_fields=['state','receipt','updated'])
        GitDeliveryStep.objects.filter(pk=step.pk,state='RUNNING').update(state='COMPLETED',receipt={'verified':True})
        event(delivery.run,'git-session-index-retired',{'request_id':request_id})
    try:
        backup=str(parent/backup_name)
        info=os.lstat(backup)
        require((info.st_dev,info.st_ino)==backup_identity and _index_digest(backup,delivery.project.owner_uid)==expected,'session-delivery-index-changed',409)
        os.unlink(backup)
        dirfd=os.open(parent,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
        try:os.fsync(dirfd)
        finally:os.close(dirfd)
        with transaction.atomic():
            effect=GitSessionEffect.objects.select_for_update().get(pk=effect.pk)
            effect.receipt={**effect.receipt,'cleanup_pending':False};effect.save(update_fields=['receipt','updated'])
    except (OSError,Refused) as error:
        raise Refused('session-delivery-index-cleanup-pending',409) from error
    _publish_delivery(delivery_id)


def _delivery_worker(delivery_id):
    """Exécute chaque effet au plus une fois ; UNKNOWN est conservé."""
    import logging
    from django.db import close_old_connections,transaction
    from .core.models import GitDelivery,Project
    from .project_metadata import synchronize
    log=logging.getLogger('cab.delivery')
    close_old_connections()
    try:
        with transaction.atomic():
            delivery=GitDelivery.objects.select_for_update(of=('self',)).select_related('run__actor','project').get(pk=delivery_id)
            if delivery.state!='PENDING':
                return
            delivery.state='RUNNING';delivery.save(update_fields=['state','updated'])
        _publish_delivery(delivery_id)
        plan=delivery.plan;version=delivery.version;project=delivery.project;run=delivery.run
        if not plan.get('prepublication'):
            _set_step(delivery_id,'version','RUNNING')
            try:
                receipt=update_version(project,version,plan['env_sha256'])
            except Refused as error:
                uncertain=error.code in ('forge-file-outcome-uncertain','session-delivery-result-unknown')
                _set_step(delivery_id,'version','UNKNOWN' if uncertain else 'FAILED',{'error':error.code})
                _set_delivery_state(delivery_id,'UNKNOWN' if uncertain else 'FAILED')
                return
            _set_step(delivery_id,'version','COMPLETED',receipt)
            _set_step(delivery_id,'version-projection','RUNNING')
            try:synchronize(project.pk,include_forges=False,include_git=False)
            except Exception as error:
                log.error('Projection de version indisponible',extra={'code':type(error).__name__})
                _set_step(delivery_id,'version-projection','FAILED',{'error':'version-projection-unavailable'})
                _set_delivery_state(delivery_id,'PARTIAL');return
            _set_step(delivery_id,'version-projection','COMPLETED',{'verified':True})
        _set_step(delivery_id,'commit','RUNNING')
        try:
            commit_request={'project_id':project.pk,'run_id':run.run_id,'request_id':'delivery-'+str(delivery_id)+'-commit','version':version,'expected_index_digest':plan['git']['index_digest']}
            if plan.get('scope')=='project':
                receipt=commit_session(run.actor,commit_request,full=plan['git']['full'],separate_reports=plan.get('separate_reports',False))
            else:
                receipt=commit_session(run.actor,commit_request,separate_reports=plan.get('separate_reports',False))
        except Refused as error:
            uncertain=error.code in ('session-delivery-result-unknown','session-git-effect-unresolved')
            _set_step(delivery_id,'commit','UNKNOWN' if uncertain else 'FAILED',{'error':error.code})
            _set_delivery_state(delivery_id,'UNKNOWN' if uncertain else 'PARTIAL')
            return
        with transaction.atomic():
            row=GitDelivery.objects.select_for_update().get(pk=delivery_id)
            row.commit_oid=receipt['commit'];row.tag_oid=receipt['tag_oid'];row.save(update_fields=['commit_oid','tag_oid','updated'])
        _set_step(delivery_id,'commit','COMPLETED',receipt)
        _continue_after_commit(delivery_id,receipt)
    except Exception as error:
        log.error('Livraison interrompue',extra={'code':type(error).__name__})
        try:_set_delivery_state(delivery_id,'UNKNOWN')
        except Exception:log.error('État de livraison non actualisé')
    finally:
        close_old_connections()


def delivery_status(actor, run, version, connector_id, *, administrator=None):
    """Lit le même reçu et protège un worker disparu sans rejouer ses effets."""
    from django.db import connection,transaction
    from .connector_process import alive
    from .core.commands import run_scope
    from .core.connectors import lock_worker_binding
    from .core.models import GitDelivery,GitDeliveryStep
    version_tuple(version)
    changed=False
    with transaction.atomic():
        with connection.cursor() as cursor:cursor.execute('SELECT id FROM projects WHERE id=%s FOR KEY SHARE',[run.project_id])
        if administrator is None:
            current=run_scope(actor,run.run_id,run.project_id,lock=True)
            lock_worker_binding(actor,connector_id,current)
        else:
            require(administrator.active and administrator.role=='admin','session-git-administrator-required',403)
            current=run_scope(administrator,run.run_id,run.project_id,lock=True,owner=False)
        delivery=GitDelivery.objects.select_for_update().filter(run=current,version=version).first()
        require(delivery is not None,'session-delivery-not-found',404)
        if administrator is not None:require(bool(delivery.git_index.origin.get('adoption')),'session-git-adoption-required',403)
        if delivery.state in ('PENDING','RUNNING') and not alive(delivery.executor):
            delivery.state='UNKNOWN';delivery.save(update_fields=['state','updated'])
            GitDeliveryStep.objects.filter(delivery=delivery,state='RUNNING').update(state='UNKNOWN',receipt={'error':'worker-disappeared'})
            changed=True
    _publish_delivery(delivery.pk)
    return _delivery_view(delivery)


def _continue_after_commit(delivery_id,receipt):
    from .core.models import GitDelivery,Project
    from django.db import transaction
    delivery=GitDelivery.objects.select_related('project','run').get(pk=delivery_id)
    project=delivery.project;run=delivery.run;version=delivery.version;plan=delivery.plan
    failures=[]
    for target in plan['forges']:
        key='forge:'+target['name']
        if delivery.steps.get(key=key).state=='COMPLETED':continue
        _set_step(delivery_id,key,'RUNNING');prepared=[]
        def before_push(value):
            _update_step_receipt(delivery_id,key,value)
            prepared.append(True)
        try:
            current=Project.objects.get(pk=project.pk)
            if 'previous_tag' in target:
                from .closure_git import send
                before_push({'commit':receipt['commit'],'previous':target['remote'],'previous_tag':target['previous_tag']})
                sent=send(current,{'forge':target['name'],'branch':target['branch'],'signature':target['signature'],'previous':target['remote'],'tag':version,'previous_tag':target['previous_tag']},receipt['commit'],receipt['tag_oid'])
            else:
                push_options={'allow_reports':True} if plan.get('separate_reports') else {}
                sent=push_version(current,target['name'],version,receipt['commit'],receipt['tag_oid'],before_push,target['remote'],target['signature'],target['branch'],**push_options)
        except Refused as error:
            state='UNKNOWN' if prepared else 'FAILED'
            _set_step(delivery_id,key,state,{'error':error.code});failures.append(state)
        else:
            _set_step(delivery_id,key,'COMPLETED',sent)
    if failures:
        _set_delivery_state(delivery_id,'UNKNOWN' if 'UNKNOWN' in failures else 'PARTIAL')
        return
    for kind in ('docker','debian'):
        if not plan[kind]:continue
        key='build:'+kind
        if delivery.steps.get(key=key).state=='COMPLETED':continue
        _set_step(delivery_id,key,'RUNNING')
        def before_build(value):
            _update_step_receipt(delivery_id,key,value)
        build_options={'reference':receipt['commit']} if plan.get('separate_reports') else {}
        try:built=execute_native_build(project,kind,version,before_build,**build_options)
        except Refused as error:
            uncertain=error.code=='session-delivery-artifact-outcome-uncertain'
            state='UNKNOWN' if uncertain else 'FAILED'
            _set_step(delivery_id,key,state,{'error':error.code})
            _set_delivery_state(delivery_id,'UNKNOWN' if uncertain else 'PARTIAL');return
        if built['exit_code']!=0:
            _set_step(delivery_id,key,'FAILED',built)
            _set_delivery_state(delivery_id,'PARTIAL');return
        _set_step(delivery_id,key,'COMPLETED',built)
    if plan['docker'] or plan['debian']:
        for target in plan['forges']:
            key='release:'+target['name']
            if delivery.steps.get(key=key).state in ('COMPLETED','SKIPPED'):continue
            if plan.get('defer_releases') is True:
                _set_step(delivery_id,key,'SKIPPED',{'reason':'developer-deferred','publisher':'cab','executed':False,'version':version,'tag':version})
                continue
            _set_step(delivery_id,key,'RUNNING');started=[]
            def mark_release(value):
                _update_step_receipt(delivery_id,key,value);started.append(True)
            try:published=execute_native_publication(Project.objects.get(pk=project.pk),target,version,plan,mark_release)
            except Refused as error:
                state='UNKNOWN' if started else 'FAILED'
                _set_step(delivery_id,key,state,{'publisher':'cab','error':error.code})
                _set_delivery_state(delivery_id,'UNKNOWN' if started else 'PARTIAL');return
            _set_step(delivery_id,key,'COMPLETED',published)
    for target in plan['forges']:
        key='verify:'+target['name']
        if delivery.steps.get(key=key).state=='COMPLETED':continue
        _set_step(delivery_id,key,'RUNNING')
        try:
            current=Project.objects.get(pk=project.pk)
            verified=verify_version(current,target['name'],version,receipt['commit'],receipt['tag_oid'],target['signature'],target['branch'])
        except Refused as error:
            state='FAILED' if error.code in ('session-delivery-remote-changed','session-delivery-config-changed') else 'UNKNOWN'
            _set_step(delivery_id,key,state,{'error':error.code});failures.append(state)
        else:
            _set_step(delivery_id,key,'COMPLETED',verified)
    if failures:
        _set_delivery_state(delivery_id,'UNKNOWN' if 'UNKNOWN' in failures else 'PARTIAL')
        return
    if plan.get('package_identity'):
        _set_step(delivery_id,'verify:package','RUNNING')
        try:
            from .publication_identity import verified_package,ProofError
            package,forges=verified_package(GitDelivery.objects.select_related('project').get(pk=delivery_id),before_retire=True)
            _set_step(delivery_id,'verify:package','COMPLETED',{'package_sha256':package['sha256'],'forges':forges,'verified':True})
        except (ProofError,OSError,ValueError) as error:
            _set_step(delivery_id,'verify:package','FAILED',{'error':str(error) if isinstance(error,ProofError) else 'publication-package-verification-failed'})
            _set_delivery_state(delivery_id,'PARTIAL');return
    _retire_index(delivery_id)
    attest_delivery(delivery_id)
    _set_delivery_state(delivery_id,'COMPLETED')
