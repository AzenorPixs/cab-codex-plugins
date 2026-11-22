"""Autorité métier CAB. Les effets externes restent hors des transactions SQL."""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import pwd
import re
import secrets
import stat
from django.db import transaction,connection
from django.db.models import Q
from django.utils import timezone
from .models import Actor,Event,Incident,Lease,Maintenance,Metric,Notice,Operation,Project,Resource,Run,SessionProjection,Subscription

ID=re.compile(r'^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$')
TERMINAL={'COMPLETED','FAILED_TO_START','TIMED_OUT','CANCELLED','PREFLIGHT_FAILED'}
PROTECTED={'.git','.ssh','.gnupg','.opencode','.codex','.venv','venv','node_modules','logs'}
SECRET=re.compile(r'(^|/)(project\.env|.*\.env(?:\..*)?|id_rsa|id_ed25519|credentials\.(?:json|yaml)|secrets\.(?:json|yaml))$|\.(?:pem|key|p12|pfx|crt|cer|der)$')

class Refused(Exception):
    def __init__(self,code,status=409):super().__init__(code);self.code=code;self.status=status

def require(value,code,status=409):
    if not value:raise Refused(code,status)

def digest(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()

def identifier(value):
    require(isinstance(value,str) and ID.fullmatch(value) and value not in ('constructor','__proto__','prototype'),'identity-invalid',400)
    return value

def project_path(value):
    p=Path(value)
    require(p.is_absolute() and p!=Path('/') and p.resolve()==p and p.is_dir(),'project-root-invalid',400)
    return p

def writable(actor,p):
    from cab_platform.os_access import accessible
    return accessible(p,actor.uid,os.W_OK|os.X_OK)

def scope(actor,project):
    require(actor.active and (actor.role=='admin' or actor.projects.filter(pk=project.pk).exists()),'project-not-authorized',403)

def run_scope(actor,run_id,project_id,*,lock=False,owner=True):
    rows=Run.objects.select_for_update() if lock else Run.objects
    try:r=rows.get(project_id=project_id,run_id=run_id)
    except Run.DoesNotExist:raise Refused('run-not-found',404)
    scope(actor,r.project)
    require(not owner or r.actor_id==actor.pk,'run-owner-required',403)
    return r

def safe_path(root,value,*,exists=True):
    require(isinstance(value,str) and value and not Path(value).is_absolute(),'path-invalid',400)
    parts=Path(value).parts
    require(not any(p in ('.','..') or p in PROTECTED for p in parts) and not SECRET.search(value),'path-protected',403)
    p=root/value
    require(p.resolve()==p and p.is_relative_to(root),'path-unsafe',403)
    if exists:require(p.exists(),'path-missing',400)
    if p.exists():
        info=p.lstat();require(not p.is_symlink() and (stat.S_ISDIR(info.st_mode) or stat.S_ISREG(info.st_mode) and info.st_nlink==1),'path-unsafe',403)
    return p

def revision(run,relocations=None):
    roots=run.mandate.get('paths',[]);require(roots,'mandate-paths-required',400)
    entries=[];total=0
    for name in sorted(roots):
        start=len(entries)
        actual=name
        for old,new in (relocations or {}).items():
            if name==old or name.startswith(old+'/'):actual=new+name[len(old):]
        p=safe_path(Path(run.project.root),actual,exists=False)
        if not p.exists():
            entries.append([name,'missing']);continue
        files=sorted(p.rglob('*')) if p.is_dir() else [p]
        for f in files:
            rel=str(f.relative_to(run.project.root))
            if f.name in ('STATISTICS.md','BLOCKERS.md') and (rel=='STATISTICS.md' or rel.startswith('openspec/changes/')):continue
            if any(part in PROTECTED or part=='.cab-tests' for part in f.relative_to(run.project.root).parts):continue
            f=safe_path(Path(run.project.root),rel);info=f.stat()
            if f.is_file():
                total+=info.st_size;require(total<=512*1024*1024 and len(entries)<100000,'source-limit',400)
                for old,new in (relocations or {}).items():
                    if rel==new or rel.startswith(new+'/'):rel=old+rel[len(new):]
                entries.append([rel,hashlib.sha256(f.read_bytes()).hexdigest()])
        if relocations:entries[start:]=sorted(entries[start:],key=lambda entry:entry[0])
    return digest(entries)

def projection(run):
    from .monitor import ensure_records
    ensure_records(run)
    change=run.change_record if run.state!='CANCELLED_BEFORE_START' else None
    from .models import SessionArchive
    values={'project_id':run.project_id,'run_id':run.run_id,'session_id':run.session_id,'mode':run.mode,'state':run.state,'suspension':run.suspension,'archived':SessionArchive.objects.filter(run=run).exists(),'change':run.change,'generation':run.generation,'cycle_steps':run.cycle_steps,'cycle_profile':run.configuration.get('cycle_profile',''),'stage':run.stage,'phase':run.phase,'tasks_done':change.tasks_done if change else None,'tasks_total':change.tasks_total if change else None}
    existing=SessionProjection.objects.filter(binding=run).first()
    if existing and all(getattr(existing,key)==value for key,value in values.items()):return
    SessionProjection.objects.update_or_create(binding=run,defaults=values)

def event(run,kind,data):
    record=Event.objects.create(project=run.project if run else None,run=run,kind=kind,data=data)
    if run:
        projection(run)
        if run.cycle_steps == 12:
            from cab_platform.change_stage_metrics import STOP_STATES,TRANSITIONS,observe,finish_iteration
            if kind=='review-decided':
                from .models import ChangeStageIteration
                with transaction.atomic():
                    review=ChangeStageIteration.objects.select_for_update(of=('self',)).filter(run=run,stage__key='review',ended_at__isnull=True,parent__isnull=True).first()
                    if review:finish_iteration(review,record.created,kind)
            elif kind in TRANSITIONS or run.suspension or run.state in STOP_STATES:
                observe(run,record.created)
            from cab_platform.stage_actions import TRACKED, observe_event
            if kind in TRACKED:
                observe_event(record)
        Run.objects.filter(pk=run.pk).update(updated=timezone.now())

def no_pending(run,*,terminal_git=False):
    from .models import GitDelivery,GitSessionEffect,TerminalGitCommit
    if not terminal_git and TerminalGitCommit.objects.filter(run=run).exclude(state='COMPLETED').exists():return False
    from cab_platform.requested_effects import active_deliveries,pending
    return not pending(run) and not Operation.objects.filter(run=run).exclude(state__in=TERMINAL).exists() and not GitSessionEffect.objects.filter(run=run,state__in=['INTENT','RUNNING','UNKNOWN']).exists() and not active_deliveries(run).exists()

def resolve_native(actor,project,session_id,data,run=None):
    from cab_platform.native_sources import inspect,locate,NativeSourceError
    require(actor.agent in ('codex','codex-cli'),'native-source-agent-unsupported',400)
    require(isinstance(data.get('source_file',''),str) and isinstance(data.get('codex_home',''),str),'native-source-path-invalid',400)
    require(not data.get('codex_home') or Path(data['codex_home']).is_absolute() and '..' not in Path(data['codex_home']).parts,'native-source-path-invalid',400)
    from .native_access import root_for
    native_root=root_for(run) if run is not None else project.root
    try:
        return inspect(actor.uid,session_id,native_root,data['source_file']) if data.get('source_file') else locate(actor.uid,session_id,native_root,data.get('codex_home',''))
    except NativeSourceError as error:raise Refused(str(error),400) from None

def locate_native(actor,data):
    project=Project.objects.get(pk=data['project_id']);scope(actor,project)
    source=resolve_native(actor,project,identifier(data['session_id']),{**data,'source_file':''})
    return {'project_id':project.pk,'session_id':data['session_id'],**source}

def native_device_only(previous, current):
    fields = {'source_file', 'device', 'inode', 'uid'}
    return (
        isinstance(previous, dict) and isinstance(current, dict)
        and set(previous) == set(current) == fields
        and type(previous['device']) is type(current['device']) is int
        and previous['device'] != current['device']
        and all(previous[key] == current[key] for key in fields - {'device'})
    )


def record_native_device(run, source, authority):
    """Réconcilie le montage courant, sans remplacer le journal ni ses preuves."""
    from cab_platform.native_sources import NativeSourceError, indexed_path
    from .run_lifecycle import guard

    previous = run.mandate.get('native_source')
    require(native_device_only(previous, source), 'native-source-device-only-required')
    working(run)
    require(not run.mandate.get('native_frozen_at') and not run.review
            and not run.mandate.get('legacy_snapshot_id'), 'native-source-resume-state-invalid')
    guard(run, allow_measurement=True)
    try:
        indexed = indexed_path(run.actor.uid, run.session_id, run.mandate.get('native_source_home', ''))
    except NativeSourceError as error:
        raise Refused(str(error), 400) from None
    require(indexed == source['source_file'], 'native-source-index-authority-required')
    current = resolve_native(run.actor, run.project, run.session_id,
                             {'source_file': previous['source_file']}, run=run)
    require(current == source, 'native-source-device-changed')
    history = run.mandate.get('native_source_history', [])
    require(isinstance(history, list) and len(history) < 128, 'native-source-history-limit')
    entry = {'previous': previous, 'current': source, 'at': timezone.now().isoformat(),
             'authority': 'exact-native-index-device', 'actor': authority.pk}
    run.mandate = {**run.mandate, 'native_source': source, 'native_source_history': [*history, entry]}
    run.save(update_fields=['mandate', 'updated'])
    event(run, 'native-source-device-reconciled', entry)


@transaction.atomic
def reconcile_native_device(actor, data):
    require(actor.active and actor.role == 'admin', 'administrator-required', 403)
    require(set(data) == {'project_id', 'run_id', 'expected_device'}
            and type(data['expected_device']) is int, 'native-source-device-fields-invalid', 400)
    run = run_scope(actor, data['run_id'], data['project_id'], lock=True, owner=False)
    previous = run.mandate.get('native_source')
    require(previous and previous.get('device') == data['expected_device'], 'native-source-device-changed')
    source = resolve_native(run.actor, run.project, run.session_id,
                            {'source_file': previous['source_file']}, run=run)
    record_native_device(run, source, actor)
    return {'reconciled': True, 'run_id': run.run_id, 'session_id': run.session_id,
            'generation': run.generation, 'device': source['device']}


@transaction.atomic
def bind_native(actor,data):
    from .native_access import root_for
    r=run_scope(actor,data['run_id'],data['project_id'],lock=True)
    require(r.state!='CANCELLED_BEFORE_START','run-not-active',409)
    require(type(data.get('resume',False)) is bool,'native-source-resume-invalid',400)
    require(isinstance(data.get('codex_home',''),str),'native-source-path-invalid',400)
    if not data.get('codex_home') and r.mandate.get('native_source_home'):data={**data,'codex_home':r.mandate['native_source_home']}
    source=resolve_native(actor,r.project,r.session_id,data,run=r)
    previous=r.mandate.get('native_source')
    if data.get('resume') and native_device_only(previous,source):
        record_native_device(r, source, actor)
        previous=source
    if previous is not None and previous!=source:
        require(data.get('resume') is True,'native-source-replacement-refused')
        require(r.state=='WORKING' and not r.mandate.get('native_frozen_at'),'native-source-resume-state-invalid')
        require(no_pending(r),'native-source-effects-protected')
        from .models import MeasurementPeriod
        require(not MeasurementPeriod.objects.filter(session_id=r.coding_session_id,ended__isnull=True).exists(),'native-source-measurement-active')
        from cab_platform.native_sources import indexed_path,inspect,NativeSourceError
        try:
            indexed=indexed_path(actor.uid,r.session_id,data.get('codex_home',''))
            require(indexed==source['source_file'],'native-source-index-authority-required')
            require(inspect(actor.uid,r.session_id,root_for(r),previous['source_file'])==previous,'native-source-previous-divergent')
        except NativeSourceError as error:raise Refused(str(error),400) from None
        history=r.mandate.get('native_source_history',[]);require(isinstance(history,list) and len(history)<128,'native-source-history-limit')
        r.mandate['native_source_history']=[*history,{'previous':previous,'current':source,'at':timezone.now().isoformat(),'authority':'exact-native-index','actor':actor.pk}]
    if previous!=source:
        r.mandate['native_source']=source;r.save();event(r,'native-source-bound',{'agent':actor.agent})
    if data.get('codex_home') and r.mandate.get('native_source_home')!=data['codex_home']:
        require(r.state=='WORKING' and not r.mandate.get('native_frozen_at'),'native-source-resume-state-invalid')
        r.mandate['native_source_home']=data['codex_home'];r.save(update_fields=['mandate'])
    return {'bound':True,'run_id':r.run_id,'session_id':r.session_id}

def working(run):
    from .native_access import root_for
    root_for(run)
    require(run.state in ('WORKING','FINALIZATION_PENDING') and not run.suspension,'run-not-working')
    require(not Maintenance.objects.filter(state__in=['PREPARED','INSTALLING']).exists(),'maintenance-in-progress',503)
    from .models import NativeReload
    require(not NativeReload.objects.filter(actor=run.actor,state='DISPATCHED').exists(),'native-control-in-progress',503)

@transaction.atomic
def register_project(actor,root):
    p=project_path(root);require(writable(actor,p),'project-owner-required',403)
    key=hashlib.sha256(str(p).encode()).hexdigest()
    project,_=Project.objects.get_or_create(pk=key,defaults={'name':p.name[:120],'root':str(p),'owner_uid':p.stat().st_uid,'owner_gid':p.stat().st_gid})
    require(project.creation_state=='READY','project-creation-needs-reconciliation')
    if not project.identifier:
        from cab_platform.project_ids import identifier_for_root
        identifier=identifier_for_root(p)
        if identifier and not Project.objects.exclude(pk=project.pk).filter(Q(identifier=identifier)|Q(pk=identifier)).exists():
            project.identifier=identifier;project.save(update_fields=['identifier'])
    actor.projects.add(project);return project

@transaction.atomic
def begin_run(actor,data,*,stage_protocol=False):
    project=Project.objects.get(pk=data['project_id']);scope(actor,project)
    if 'mandates' in data:
        from cab_platform.stage_actions import normalize_mandates
        normalize_mandates(data['mandates'])
    with connection.cursor() as cursor:cursor.execute('SELECT id FROM projects WHERE id=%s FOR KEY SHARE',[project.pk])
    require(project.creation_state=='READY','project-creation-needs-reconciliation')
    from .models import VersionPolicyMigration
    require(not VersionPolicyMigration.objects.filter(project=project,state='PENDING').exists(),
            'version-policy-migration-pending',409)
    run_id=identifier(data['run_id']);sid=identifier(data['session_id']);mode=data['mode']
    require(mode in ('direct','piloted'),'run-mode-invalid',400)
    require(data.get('decisions_resolved') is True,'decisions-not-resolved',400)
    require(data.get('criteria') and all(isinstance(x,str) and x for x in data['criteria']),'criteria-required',400)
    require(data.get('paths') and len(data['paths'])<=128,'mandate-paths-required',400)
    for path in data['paths']:safe_path(Path(project.root),path)
    if mode=='piloted':
        require(actor.role in ('admin','orchestrator'),'framing-authority-required',403)
        require(data.get('orchestrator_id')==actor.pk,'orchestrator-required',400)
        actor=Actor.objects.get(pk=data['coder_id']);scope(actor,project)
    if mode=='direct':Actor.objects.select_for_update().get(pk=actor.pk)
    prior=Run.objects.filter(project=project,run_id=run_id).first()
    if prior:
        require(prior.actor_id==actor.pk and prior.session_id==sid and prior.mandate.get('framing_digest')==digest(data),'run-identity-conflict');return prior
    change=identifier(data['change'])
    replaced=None
    replacing=data.get('replaces_run_id')
    if mode=='direct':
        from .run_replacement import TERMINAL, require_unstarted
        active=Run.objects.select_for_update().filter(project=project,actor=actor,mode='direct',session_id=sid,change=change).exclude(state__in=TERMINAL)
        if replacing:
            replaced=active.filter(run_id=identifier(replacing)).first()
            require(replaced is not None,'run-replacement-divergent',409)
            require_unstarted(replaced)
            require(revision(replaced)==replaced.source_revision,'run-replacement-source-changed',409)
            active=active.exclude(pk=replaced.pk)
        require(not active.exists(),'direct-run-already-active',409)
    else:
        require(not replacing,'run-replacement-direct-only',400)
    configuration={'cycle_profile':'publication-12-v1'}
    if stage_protocol:
        from cab_platform.stage_protocol import KEY,VERSION
        configuration[KEY]={'version':VERSION,'active':{},'mandate_confirmation':True}
    r=Run.objects.create(project=project,run_id=run_id,session_id=sid,actor=actor,mode=mode,change=change,cycle_steps=12,stage=1,configuration=configuration,mandate={**data,'framing_digest':digest(data)})
    from .run_evidence import initialize
    initialize(r,data.get('finalization'))
    r.source_revision=revision(r);r.save();event(r,'run-created',{'mode':mode})
    r.refresh_from_db(fields=['change_record'])
    require(r.change_record_id is not None,'session-git-change-unavailable',409)
    from cab_platform.session_git import capture_initial
    capture_initial(r)
    r.configuration={**r.configuration,'terminal_git':{'required':True}};r.save(update_fields=['configuration'])
    if replaced is not None:
        from .run_replacement import cancelled
        cancelled(replaced,r,actor,'REPLACE-'+r.run_id)
    return r

@transaction.atomic
def progress(actor,data):
    r=run_scope(actor,data['run_id'],data['project_id'],lock=True)
    from cab_platform.stage_protocol import enabled
    require(not enabled(r),'stage-use-begin-and-validate')
    require(r.state in ('WORKING','FINALIZATION_PENDING','REVIEW_PENDING','ACCEPTED') and not r.suspension,'run-not-active')
    require(not Maintenance.objects.filter(state__in=['PREPARED','INSTALLING']).exists(),'maintenance-in-progress',503)
    stage=data.get('stage');phase=data.get('phase',r.phase)
    require(type(stage) is int and 1<=stage<=r.cycle_steps,'run-stage-invalid',400)
    require(isinstance(phase,str) and bool(re.fullmatch(r'[A-Z0-9_-]{0,32}',phase)),'run-phase-invalid',400)
    from cab_platform.change_stage_metrics import number_for
    if r.cycle_steps == 12 and stage > number_for(r,'version-skill'):
        from cab_platform.version_skill import require_acknowledged
        require_acknowledged(r)
    if r.stage!=stage or r.phase!=phase:
        r.stage=stage;r.phase=phase;r.save(update_fields=['stage','phase','updated']);event(r,'run-progress',{'stage':stage,'phase':phase})
    if data.get('description') is not None:
        from cab_platform.change_stage_metrics import describe
        describe(r,data['description'])
    return {'run_id':r.run_id,'stage':r.stage,'phase':r.phase,'generation':r.generation,'cycle_steps':r.cycle_steps}

@transaction.atomic
def reconcile_archive(actor,data):
    """Relocalisation du seul change archivé ; jamais un amendement libre."""
    from datetime import date
    from types import SimpleNamespace
    r=run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False)
    from cab_platform.stage_protocol import enabled,authority,KEY
    permitted=(enabled(r) and authority(actor,r)) or (r.mode=='direct' and actor.pk==r.actor_id)
    require(permitted,'archive-reconciliation-authority-required',403)
    require(not enabled(r) or r.configuration[KEY].get('current',{}).get('stage')==9,'stage-archival-not-started')
    require(r.state in ('WORKING','FINALIZATION_PENDING'),'archive-reconciliation-state-invalid')
    expected=data.get('expected_framing_digest');archive=data.get('archive_path')
    require(isinstance(expected,str) and re.fullmatch('[a-f0-9]{64}',expected),'framing-digest-invalid',400)
    require(isinstance(archive,str) and re.fullmatch(r'openspec/changes/archive/\d{4}-\d{2}-\d{2}-'+re.escape(r.change),archive),'archive-path-invalid',400)
    try:date.fromisoformat(Path(archive).name[:10])
    except ValueError:raise Refused('archive-path-invalid',400) from None
    prior=r.mandate.get('archive_reconciliations',[])
    for record in prior:
        if record['archive_path']==archive and record['previous_framing_digest']==expected:
            require(r.mandate.get('framing_digest')==record['framing_digest'],'framing-stale')
            return {'state':'ALREADY_RECONCILED','run_id':r.run_id,'session_id':r.session_id,'generation':r.generation,**record}
    require(r.mandate.get('framing_digest')==expected,'framing-stale')
    require(no_pending(r) and not Lease.objects.filter(run=r,state='HELD').exists(),'archive-effects-protected')
    working(r)
    root=Path(r.project.root);old='openspec/changes/'+r.change
    source=safe_path(root,old,exists=False)
    require(not source.exists(),'archive-source-still-present')
    target=safe_path(root,archive);require(target.is_dir(),'archive-path-invalid',400)
    for marker in ('proposal.md','tasks.md'):
        require(safe_path(root,archive+'/'+marker).is_file(),'archive-proof-required',400)
    paths=r.mandate['paths'];affected=[path for path in paths if path==old or path.startswith(old+'/')]
    covered=any(old.startswith(path+'/') and archive.startswith(path+'/') for path in paths)
    require((affected or covered) and not prior,'archive-source-not-framed')
    replacements={path:archive+path[len(old):] for path in affected}
    updated={**r.mandate,'paths':[replacements.get(path,path) for path in paths]}
    require(len(set(updated['paths']))==len(updated['paths']),'archive-path-conflict')
    current=revision(SimpleNamespace(project=r.project,mandate=updated))
    updated['framing_digest']=digest({key:value for key,value in updated.items() if key not in ('framing_digest','native_source','native_frozen_at','native_source_home','native_source_history')})
    record={'archive_path':archive,'previous_framing_digest':expected,'framing_digest':updated['framing_digest'],'source_revision':current,'paths':replacements,'at':timezone.now().isoformat()}
    updated['archive_reconciliations']=[record]
    from cab_platform.change_stage_metrics import number_for
    r.mandate=updated;r.source_revision=current;r.stage=number_for(r,'archival');r.save()
    event(r,'mandate-archive-reconciled',{'actor':actor.pk,**record})
    return {'state':'RECONCILED','run_id':r.run_id,'session_id':r.session_id,'generation':r.generation,**record}

@transaction.atomic
def start_operation(actor,data,*,host_authorized=False):
    require(host_authorized or 'host_authorization' not in data,'host-authorization-required',403)
    native=data.get('kind')=='native'
    r=run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=not native)
    if native:
        require(r.mode=='piloted' and actor.pk==r.mandate.get('orchestrator_id'),'native-orchestrator-required',403)
        require(data.get('native_action') in ('create','prompt','interrupt'),'native-action-invalid',400)
        if data['native_action']=='prompt':require(isinstance(data.get('text'),str) and 0<len(data['text'])<=200000,'native-prompt-invalid',400)
    require(data['session_id']==r.session_id and data['generation']==r.generation,'run-identity-divergent')
    request_id=identifier(data['request_id']);input_hash=digest(data)
    prior=Operation.objects.filter(run=r,request_id=request_id).first()
    if prior:
        require(prior.input_digest==input_hash,'operation-input-conflict');return prior,False
    working(r)
    require(data.get('kind') in ('local','external','native'),'operation-kind-invalid',400)
    argv=data.get('argv');require(native or isinstance(argv,list) and argv and len(argv)<=128 and all(isinstance(v,str) and '\0' not in v for v in argv),'command-invalid',400)
    require(type(data.get('timeout_ms',120000)) is int and 1<=data.get('timeout_ms',120000)<=2147483647,'timeout-invalid',400)
    if data['kind']=='external':require(data.get('adapter_id') in r.mandate.get('external_adapters',{}),'external-adapter-required',403)
    op=Operation.objects.create(run=r,request_id=request_id,input_digest=input_hash,request=data,source_revision=revision(r),dispatch_nonce=secrets.token_hex(32),state='WAITING')
    event(r,'operation-queued',{'request_id':request_id});return op,True

@transaction.atomic
def claim_operation(operation_id):
    try:op=Operation.objects.select_for_update().select_related('run__project','run__actor').get(pk=operation_id,state='WAITING')
    except Operation.DoesNotExist:return None
    r=Run.objects.select_for_update().get(pk=op.run_id)
    working(r)
    # Un effet incertain conserve sa ressource. Pas de blocage des autres RUN.
    file_keys=['file:'+r.project.root+'/'+p for p in r.mandate['paths']] if op.request['kind']=='local' else []
    keys=sorted(set(file_keys+op.request.get('resources',[])))
    with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_xact_lock(%s)',[300001])
    working(r)
    require(len(keys)<=128 and all(isinstance(k,str) and len(k)<=1800 for k in keys),'resources-invalid',400)
    allowed=r.mandate.get('resources',[])
    for key in keys:
        require(key in allowed or key.startswith('file:'+r.project.root+'/') and any(key=='file:'+r.project.root+'/'+p or key.startswith('file:'+r.project.root+'/'+p+'/') for p in r.mandate['paths']),'resource-outside-mandate',403)
        Resource.objects.get_or_create(pk=key)
    resources=list(Resource.objects.select_for_update().filter(pk__in=keys).order_by('pk'))
    for held in Lease.objects.filter(state='HELD').select_related('resource'):
        if held.run_id==r.pk and held.operation_id is None:continue
        for key in keys:
            if key==held.resource_id or key.startswith('file:') and held.resource_id.startswith('file:') and (key.startswith(held.resource_id+'/') or held.resource_id.startswith(key+'/')):return None
    if Lease.objects.filter(resource__in=resources,state='HELD').exclude(run=r).exists():return None
    if Lease.objects.filter(resource__in=resources,state='HELD',operation__isnull=False).exclude(operation=op).exists():return None
    for resource in resources:
        existing=Lease.objects.filter(resource=resource,run=r,state='HELD',operation__isnull=True).first()
        if not existing:resource.fencing+=1;resource.save()
        Lease.objects.create(resource=resource,run=r,operation=op,fencing=existing.fencing if existing else resource.fencing)
    op.state='INTENT';op.save();event(r,'operation-intent',{'request_id':op.request_id});return op

@transaction.atomic
def dispatched(operation_id,nonce):
    op=Operation.objects.select_for_update().get(pk=operation_id)
    require(op.state=='INTENT' and not op.dispatched and secrets.compare_digest(op.dispatch_nonce,nonce),'dispatch-already-issued')
    op.dispatched=True;op.state='RUNNING';op.save();event(op.run,'operation-dispatched',{'request_id':op.request_id})

@transaction.atomic
def complete(operation_id,nonce,receipt):
    op=Operation.objects.select_for_update().select_related('run').get(pk=operation_id)
    require(secrets.compare_digest(op.dispatch_nonce,nonce),'receipt-owner-invalid',403)
    require(receipt.get('request_id')==op.request_id and receipt.get('input_digest')==op.input_digest and receipt.get('source_revision')==op.source_revision,'receipt-identity-invalid')
    state=receipt.get('state');require(state in TERMINAL|{'UNKNOWN'},'receipt-state-invalid',400)
    if op.state in TERMINAL:
        require(op.receipt_digest==digest(receipt),'terminal-receipt-conflict');return op
    require(op.state in ('INTENT','RUNNING','UNKNOWN'),'receipt-phase-invalid')
    if state=='COMPLETED':require(type(receipt.get('exit_code')) is int,'receipt-exit-required',400)
    op.state=state;op.receipt=receipt;op.receipt_digest=digest(receipt);op.save()
    if state in TERMINAL:
        Lease.objects.filter(operation=op,state='HELD').update(state='RELEASED')
        for lease in Lease.objects.filter(operation=op).select_related('resource'):
            if lease.resource.key.startswith('file:'):
                resource=Resource.objects.select_for_update().get(pk=lease.resource_id);resource.revision+=1;resource.save()
    if state in TERMINAL:
        from .run_evidence import operation_completed
        operation_completed(op)
    event(op.run,'operation-terminal',{'request_id':op.request_id,'state':state,'exit_code':receipt.get('exit_code')});return op

@transaction.atomic
def submit(actor,data):
    r=run_scope(actor,data['run_id'],data['project_id'],lock=True);working(r);require(no_pending(r),'effects-unresolved')
    from cab_platform.stage_protocol import enabled,KEY
    require(not enabled(r) or r.configuration[KEY].get('current',{}).get('stage')==8,'stage-review-not-started')
    from .models import FinalizationPlan
    require(not FinalizationPlan.objects.filter(run=r).exclude(policy={}).exists(),'finalization-submission-owned-by-cab')
    current=revision(r);tests=data.get('tests',[]);require(tests,'tests-required',400)
    for test in tests:
        require(test.get('outcome') in ('passed','failed','unavailable'),'outcome-invalid',400)
        op=Operation.objects.filter(run=r,request_id=test.get('request_id')).first();require(op and op.state in TERMINAL,'test-receipt-required')
        require(op.request.get('kind') in ('local','external'),'test-execution-required')
        require(test.get('criterion') in r.mandate['criteria'],'criterion-outside-mandate')
        if test['outcome']=='passed':require(op.state=='COMPLETED' and op.receipt.get('exit_code')==0 and op.source_revision==current,'test-not-passed')
        test['receipt_digest']=op.receipt_digest
    require(set(t['criterion'] for t in tests)==set(r.mandate['criteria']),'criteria-not-covered')
    submission={'id':identifier(data['submission_id']),'source_revision':current,'tests':tests,'limits':data.get('limits',[]),'summary':str(data.get('summary',''))[:4000]}
    submission['digest']=digest(submission)
    from cab_platform.change_stage_metrics import number_for
    r.review={'submission':submission};r.source_revision=current;r.state='REVIEW_PENDING';r.stage=number_for(r,'review');r.save();event(r,'review-requested',{'submission_digest':submission['digest']});return submission

@transaction.atomic
def review(actor,data):
    r=run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False)
    require(r.mode=='direct' and r.actor_id==actor.pk or actor.role in ('admin','orchestrator') and actor.pk==r.mandate.get('orchestrator_id'),'review-authority-required',403)
    require(r.state=='REVIEW_PENDING' and no_pending(r),'review-not-ready')
    s=r.review['submission'];require(data['submission_digest']==s['digest'],'submission-stale')
    require(data['decision'] in ('accept','changes-requested'),'review-decision-invalid',400)
    if data['decision']=='accept':require(all(t['outcome']=='passed' for t in s['tests']) and revision(r)==s['source_revision'],'acceptance-not-proven')
    r.review['decision']={'actor':actor.pk,'decision':data['decision'],'reason':str(data.get('reason',''))[:4000],'at':timezone.now().isoformat()}
    r.state='ACCEPTED' if data['decision']=='accept' else 'WORKING';r.save();event(r,'review-decided',{'decision':data['decision']});return r.review

@transaction.atomic
def coordinate(actor,data):
    r=run_scope(actor,data['run_id'],data['project_id'],lock=True);action=data['action'];args=data.get('args',{})
    if action in ('inbox','outbox','status'):
        subjects=list(Subscription.objects.filter(run=r).values_list('subject',flat=True))
        notices=Notice.objects.filter(project=r.project,subject__in=subjects).exclude(producer=r).order_by('created')
        return {'items':[{'notice_id':n.notice_id,'producer':n.producer.run_id,'subject':n.subject,'stage':n.stage,'proof':n.proof} for n in notices[:100]],'notification':'durable-inbox'}
    working(r)
    if action=='subscribe':
        sub,created=Subscription.objects.get_or_create(run=r,dependency_id=identifier(args['dependency_id']),defaults={'subject':args['subject'],'criterion':args['criterion']})
        require(created or sub.subject==args['subject'] and sub.criterion==args['criterion'],'subscription-conflict');return {'registered':True}
    if action=='publish':
        require(args.get('stage') in ('candidate','tested'),'stage-authority-required',403)
        proof_path=safe_path(Path(r.project.root),args['proof']);sha=hashlib.sha256(proof_path.read_bytes()).hexdigest();require(sha==args.get('sha256'),'proof-stale')
        subject=args['subject'];require(subject==r.change or subject.startswith(r.change+'/'),'notice-outside-change',403)
        defaults={'producer':r,'subject':subject,'stage':args['stage'],'proof':{'path':args['proof'],'sha256':sha}}
        n,created=Notice.objects.get_or_create(project=r.project,notice_id=identifier(args['notice_id']),defaults=defaults)
        require(created or n.producer_id==r.pk and n.proof==defaults['proof'],'notice-conflict');event(r,'notice-published',{'notice_id':n.notice_id});return {'notice_id':n.notice_id}
    if action=='ack':
        sub=Subscription.objects.select_for_update().get(run=r,dependency_id=args['dependency_id']);n=Notice.objects.get(project=r.project,notice_id=args['notice_id'],subject=sub.subject)
        p=safe_path(Path(r.project.root),n.proof['path']);require(hashlib.sha256(p.read_bytes()).hexdigest()==n.proof['sha256'],'proof-stale')
        if n.notice_id not in sub.acknowledgements:sub.acknowledgements.append(n.notice_id);sub.save()
        return {'acknowledged':True,'dependency_verified':False}
    raise Refused('coordination-action-invalid',400)

@transaction.atomic
def reserve_bank(actor,data):
    r=run_scope(actor,data['run_id'],data['project_id'],lock=True);working(r);key=data['resource'];require(key in r.mandate.get('resources',[]) and key.startswith(('lxc:','docker:','browser:')),'bank-outside-mandate',403)
    resource,_=Resource.objects.get_or_create(pk=key);resource=Resource.objects.select_for_update().get(pk=key)
    existing=Lease.objects.filter(resource=resource,state='HELD').first()
    if existing:require(existing.run_id==r.pk,'bank-held');return {'lease_id':existing.pk,'fencing':existing.fencing}
    resource.fencing+=1;resource.save();lease=Lease.objects.create(resource=resource,run=r,fencing=resource.fencing)
    event(r,'bank-held',{'resource':key,'fencing':lease.fencing});return {'lease_id':lease.pk,'fencing':lease.fencing}

@transaction.atomic
def exception(actor,data):
    r=run_scope(actor,data['run_id'],data['project_id'],lock=True);working(r)
    require(data['category'] in ('outside-change','outside-framing','missing-tool','web-consultation'),'exception-category-invalid',400)
    event(r,'exception-requested',{'id':identifier(data['request_id']),'category':data['category'],'summary':str(data['summary'])[:4000]})
    return {'state':'EXCEPTION_PENDING'}

@transaction.atomic
def exception_decision(actor,data,*,direct_connection=False):
    r=run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False)
    direct_owner=direct_connection and r.mode=='direct' and actor.pk==r.actor_id
    require(actor.role=='admin' or actor.role=='orchestrator' and actor.pk==r.mandate.get('orchestrator_id') or direct_owner,'exception-authority-required',403)
    require(data['decision'] in ('approved','rejected'),'decision-invalid',400)
    requested=Event.objects.filter(run=r,kind='exception-requested',data__id=data['request_id']).first()
    require(requested is not None,'exception-not-found',404)
    scope=data.get('scope',{});require(isinstance(scope,dict),'exception-scope-invalid',400)
    if direct_owner and actor.role!='admin':
        require(requested.data['category']=='outside-framing' and data['decision']=='approved'
                and set(scope)=={'paths','authorization'},'exception-authority-required',403)
        authorization=scope['authorization']
        require(isinstance(authorization,str) and 20<=len(authorization.strip())<=2000,
                'exception-developer-authorization-required',400)
    prior=Event.objects.filter(run=r,kind='exception-decided',data__id=data['request_id']).first()
    if prior:
        require(prior.data['decision']==data['decision'] and prior.data['scope']==scope,'exception-decision-conflict')
        return prior.data.get('receipt',{'decision':data['decision']})
    added=[];old_paths=list(r.mandate.get('paths',[]));old_digest=r.mandate.get('framing_digest')
    if data['decision']=='approved' and 'paths' in scope:
        require(requested.data['category']=='outside-framing','exception-paths-category-invalid',400)
        working(r);require(no_pending(r) and not r.review and not r.mandate.get('native_frozen_at') and not r.mandate.get('legacy_snapshot_id'),'exception-paths-protected')
        paths=scope['paths'];require(isinstance(paths,list) and paths and len(paths)<=128,'exception-paths-invalid',400)
        for path in paths:
            target=safe_path(Path(r.project.root),path,exists=False)
            if direct_owner and actor.role!='admin':
                require(str(Path(path))==path and not target.is_dir(),'exception-direct-file-required',400)
            if path not in old_paths and path not in added:added.append(path)
        require(len(old_paths)+len(added)<=128,'mandate-paths-required',400)
        r.mandate={**r.mandate,'paths':old_paths+added}
        r.mandate['framing_digest']=digest({key:value for key,value in r.mandate.items() if key not in ('framing_digest','native_source','native_frozen_at','native_source_home','native_source_history')})
        r.save(update_fields=['mandate','updated'])
    receipt={'decision':data['decision'],'added_paths':added,'framing_digest':r.mandate.get('framing_digest')}
    event(r,'exception-decided',{'id':data['request_id'],'decision':data['decision'],'scope':scope,'actor':actor.pk,'old_paths':old_paths,'previous_framing_digest':old_digest,'receipt':receipt})
    return receipt

@transaction.atomic
def suspend(actor,data):
    r=run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False)
    require(actor.role in ('admin','orchestrator') or r.mode=='direct' and r.actor_id==actor.pk,'suspension-authority-required',403)
    action=data['action'];require(action in ('PAUSE','RESUME','STOP'),'suspension-action-invalid',400)
    from .run_replacement import TERMINAL
    require(r.state not in TERMINAL,'run-not-active',409)
    require(action!='STOP' or r.mode!='direct','direct-run-stop-requires-terminal-path',409)
    if action=='RESUME':require(no_pending(r),'effects-unresolved')
    r.suspension='' if action=='RESUME' else action;r.save();event(r,'suspension',{'action':action});return {'state':r.state,'suspension':r.suspension}

@transaction.atomic
def release_bank(actor,data):
    r=run_scope(actor,data['run_id'],data['project_id'],lock=True)
    lease=Lease.objects.select_for_update().get(pk=data['lease_id'],run=r);require(lease.state=='HELD' and no_pending(r),'bank-release-not-ready')
    clean=Operation.objects.get(run=r,request_id=data['cleanup_request_id']);verify=Operation.objects.get(run=r,request_id=data['verification_request_id'])
    require(clean.request.get('phase')=='cleanup' and verify.request.get('phase')=='verify-cleanup' and clean.state==verify.state=='COMPLETED' and clean.receipt.get('exit_code')==verify.receipt.get('exit_code')==0 and clean.updated<verify.created,'cleanup-not-proven')
    require(lease.resource_id in clean.request.get('resources',[]) and lease.resource_id in verify.request.get('resources',[]),'cleanup-resource-divergent')
    lease.state='RELEASED';lease.evidence={'cleanup':clean.receipt_digest,'verification':verify.receipt_digest};lease.save();event(r,'bank-released',{'lease_id':lease.pk});return {'state':'RELEASED'}
