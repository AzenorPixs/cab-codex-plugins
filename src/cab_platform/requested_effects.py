"""Effets CAB ponctuels et reprises : autorité du RUN, CAS et reçus conservés."""
import copy
import threading
from django.db import connection,transaction,close_old_connections
from .core import commands as c
from .core.models import Event,Run,GitDelivery,GitDeliveryStep,GitSessionIndex,Operation,Lease,Maintenance
from . import session_delivery as delivery
from .preexisting_git import git_guard
from .git_commit_remove import context

KINDS={'commit','build:debian','build:docker','publish:FORGEJO','publish:GITHUB','publish:GITLAB','resume'}


def coding_authority(actor,run):
    c.require(actor.active and (actor.pk==run.actor_id or actor.role=='admin' or actor.pk==run.mandate.get('orchestrator_id')),'session-effect-authority-required',403)


def approval_authority(actor,run):
    coding_authority(actor,run)
    c.require(actor.role=='admin' or (run.mode=='direct' and actor.pk==run.actor_id) or actor.pk==run.mandate.get('orchestrator_id'),'session-effect-approval-required',403)


def authorize_text(value):
    c.require(isinstance(value,str) and 20<=len(value.strip())<=4000,'session-effect-developer-authorization-required',400)


def inactive_partial(row):
    states=dict(row.steps.values_list('key','state'))
    if row.state!='PARTIAL' or 'FAILED' not in states.values() or any(v in ('RUNNING','UNKNOWN') for v in states.values()):return False
    if states.get('commit')=='COMPLETED':return True
    # Un commit supplémentaire peut avoir échoué avant déplacement des refs.
    # L'ancien commit publié reste attesté dans l'événement de cette tentative.
    return bool(states.get('commit')=='FAILED' and getattr(row,'commit_oid','') and Event.objects.filter(run=row.run,kind='session-postcommit-recovery-started',data__original__commit=row.commit_oid,data__original__tag_oid=row.tag_oid).exists())


def editable_delivery(run):
    marker=run.configuration.get('delivery_recovery',{})
    if marker.get('phase')!='editing':return None
    admitted=Event.objects.filter(run=run,kind='session-recovery-edit-admitted',pk=marker.get('event_id')).first()
    if not admitted or admitted.data.get('delivery_id')!=marker.get('delivery_id'):return None
    row=GitDelivery.objects.filter(pk=marker.get('delivery_id'),run=run).first()
    return row.pk if row and inactive_partial(row) else None


def active_deliveries(run,index=None):
    rows=GitDelivery.objects.filter(run=run,state__in=['PENDING','RUNNING','UNKNOWN','PARTIAL'])
    if index is not None:rows=rows.filter(git_index=index)
    allowed=editable_delivery(run)
    return rows.exclude(pk=allowed) if allowed else rows


def pending(run):
    intents=Event.objects.filter(project_id=run.project_id,kind='session-effect-admitted')
    finished=set(Event.objects.filter(project_id=run.project_id,kind='session-effect-result',data__receipt__state__in=['COMPLETED','FAILED']).values_list('data__intent_id',flat=True))
    if any(row.pk not in finished for row in intents):return True
    prepared=set(Event.objects.filter(project_id=run.project_id,kind='package-version-prepared').values_list('run_id','data__request_id'))
    return any((row.run_id,row.data['request_id']) not in prepared for row in Event.objects.filter(project_id=run.project_id,kind='package-version-preparing'))


def base_guard(run):
    c.working(run)
    c.require(not run.suspension and not run.review and not run.mandate.get('native_frozen_at') and not run.mandate.get('legacy_snapshot_id'),'session-effect-run-protected')
    c.require(not Maintenance.objects.filter(state__in=['PREPARED','INSTALLING']).exists(),'maintenance-in-progress')
    c.require(not Lease.objects.filter(run__project_id=run.project_id,state='HELD').exists(),'session-effect-resource-held')
    c.require(not Operation.objects.filter(run__project_id=run.project_id).exclude(state__in=c.TERMINAL).exists(),'session-effect-operation-active')
    from .core.models import GitSessionEffect,ProjectArtifactBuild,ProjectForgeArtifactPublication
    c.require(not GitSessionEffect.objects.filter(git_index__change__project_id=run.project_id,state__in=['INTENT','RUNNING','UNKNOWN']).exists(),'session-git-effect-unresolved')
    c.require(not ProjectArtifactBuild.objects.filter(project_id=run.project_id,state__in=['PENDING','RUNNING','UNKNOWN']).exists() and not ProjectForgeArtifactPublication.objects.filter(project_id=run.project_id,state__in=['PENDING','RUNNING','UNKNOWN']).exists(),'session-effect-artifact-active')
    c.require(not pending(run),'session-effect-unresolved')


def identity(run):
    return {'project_id':run.project_id,'run_id':run.run_id,'session_id':run.session_id,'generation':run.generation,'actor_id':run.actor_id}


def diagnosis(run,row):
    from .package_versions import inspect as versions
    inspected=versions(run.project.root,row.version)
    failures=list(row.steps.filter(state='FAILED').values('key','receipt'))
    issues=[]
    if inspected['mismatches']:issues.append({'code':'package-source-version-not-aligned','paths':inspected['mismatches'],'remediation':'prepare-reserved-package-versions'})
    for failure in failures:
        if failure['key'].startswith('build:') and not issues:
            issues.append({'code':failure['receipt'].get('error','artifact-build-failed'),'remediation':'qualify-corrected-sources'})
    return {'delivery_id':row.pk,'version':row.version,'state':'REMEDIATION_REQUIRED' if failures else 'NO_FAILED_STEP','issues':issues,'failed_steps':[s['key'] for s in failures]}


def diagnose(actor,data):
    run=c.run_scope(actor,data['run_id'],data['project_id'],owner=False);coding_authority(actor,run)
    row=GitDelivery.objects.get(pk=data['delivery_id'],run=run)
    return diagnosis(run,row)


def remediate(actor,data):
    c.require(set(data)=={'project_id','run_id','delivery_id','request_id'},'session-effect-fields-invalid',400)
    key=c.identifier(data['request_id'])
    with git_guard():
        run=c.run_scope(actor,data['run_id'],data['project_id'],owner=False);coding_authority(actor,run)
        prior=Event.objects.filter(run=run,kind='session-remediation-prepared',data__request_id=key).first()
        if prior:
            c.require(prior.data['delivery_id']==data['delivery_id'],'session-effect-request-conflict');return prior.data['receipt']
        base_guard(run)
        row=GitDelivery.objects.get(pk=data['delivery_id'],run=run)
        c.require(editable_delivery(run)==row.pk,'session-effect-edit-admission-required')
        inspected=diagnosis(run,row)
        c.event(run,'session-remediation-started',{'request_id':key,'delivery_id':row.pk,'diagnosis':inspected,'authority':actor.pk,'source_before':c.revision(run)})
        from .package_versions import prepare,require_aligned
        prepared=prepare(run.actor,{'project_id':run.project_id,'run_id':run.run_id,'request_id':'REMEDIATE-'+c.digest([row.pk,key]),'version':row.version})
        require_aligned(run.project.root,row.version)
        receipt={'state':'SOURCE_QUALIFICATION_REQUIRED','delivery_id':row.pk,'version':row.version,'prepared':prepared,'new_qualification_required':True}
        c.event(run,'session-remediation-prepared',{'request_id':key,'delivery_id':row.pk,'receipt':receipt,'source_after':c.revision(Run.objects.get(pk=run.pk))})
        return receipt


def snapshot(row):
    return {'delivery_id':row.pk,'version':row.version,'state':row.state,'commit':row.commit_oid,'tag_oid':row.tag_oid,'plan':copy.deepcopy(row.plan),'steps':list(row.steps.order_by('key').values('key','state','receipt'))}


def project_source(run):
    from .session_git import git_snapshot,shared_scope_digest
    from pathlib import Path
    import hashlib,os,stat
    options,env=context(run.project);snap=git_snapshot(run.project)
    c.require(snap.get('available'),'session-git-unavailable')
    entries=[item for item in snap['entries'] if not delivery.managed_statistics_path(item['path'])]
    names=sorted({entry['path'] for entry in entries})
    working={}
    for name in names:
        relative=Path(name);parent=relative.parent
        directory=c.safe_path(Path(run.project.root),str(parent),exists=False) if str(parent)!='.' else Path(run.project.root)
        target=directory/relative.name
        try:info=target.lstat()
        except FileNotFoundError:working[name]=None;continue
        if stat.S_ISLNK(info.st_mode):raw=os.readlink(target).encode('utf-8')
        else:
            c.require(stat.S_ISREG(info.st_mode),'session-effect-source-invalid')
            raw=target.read_bytes()
        working[name]={'mode':stat.S_IMODE(info.st_mode),'sha256':hashlib.sha256(raw).hexdigest()}
    return c.digest({'head':snap['head'],'entries':entries,'content':shared_scope_digest(run.project,options,env,names),'working':working})


def refresh_full_statistics(run,row,git,intent_id):
    """Rafraîchit les seuls rapports CAB attestés ; l'arbre de code reste figé."""
    if 'full' not in git:return git
    from .core.models import StatisticsJob
    import hashlib
    options,env=context(run.project)
    index=GitSessionIndex.objects.get(pk=row.git_index_id)
    reservations=list(index.reservations.filter(active=True).values_list('path',flat=True))
    fresh=delivery.preflight_commit(run.project,index,row.version,reservations,complete=True,existing_tag=row.tag_oid)
    changed=delivery._git(run.project,options,env,'diff','--name-only','-z',git['full']['tree'],fresh['full']['tree'])
    c.require(changed.returncode==0,'session-effect-statistics-comparison-failed')
    paths=[p.decode('utf-8') for p in changed.stdout.split(b'\0') if p]
    c.require(all(delivery.managed_statistics_path(p) for p in paths),'session-effect-code-tree-changed')
    witnesses=[]
    for path in paths:
        blob=delivery._git(run.project,options,env,'show',fresh['full']['tree']+':'+path)
        c.require(blob.returncode==0,'session-effect-statistics-not-attested')
        sha=hashlib.sha256(blob.stdout).hexdigest()
        job=StatisticsJob.objects.filter(project=run.project,state='COMPLETED',result__indexed_documents__contains={path:{'state':'COMPLETED','sha256':sha}}).order_by('-updated').first()
        c.require(job is not None,'session-effect-statistics-not-attested')
        witnesses.append({'path':path,'sha256':sha,'job_id':job.pk})
    if fresh!=git:c.event(run,'session-effect-statistics-refreshed',{'intent_id':intent_id,'previous_tree':git['full']['tree'],'tree':fresh['full']['tree'],'witnesses':witnesses,'code_unchanged':True})
    return fresh


def open_recovery(actor,data):
    c.require(set(data)=={'project_id','run_id','delivery_id','request_id','authorization','scope'},'session-effect-fields-invalid',400)
    authorize_text(data['authorization']);c.require(data['scope'] in ('change','project'),'session-effect-scope-invalid',400)
    c.require(type(data['delivery_id']) is int,'session-effect-delivery-required',400)
    key=c.identifier(data['request_id']);fingerprint=c.digest(data)
    with git_guard(),transaction.atomic():
        run=c.run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False);approval_authority(actor,run)
        previous=Event.objects.filter(run=run,kind='session-recovery-edit-admitted',data__request_id=key).first()
        if previous:
            c.require(previous.data['fingerprint']==fingerprint,'session-effect-request-conflict');return previous.data['receipt']
        base_guard(run)
        row=GitDelivery.objects.select_for_update().get(pk=data['delivery_id'],run=run)
        c.require(inactive_partial(row),'session-effect-postcommit-not-recoverable')
        c.require(not GitDelivery.objects.filter(project=run.project,state__in=['PENDING','RUNNING','UNKNOWN','PARTIAL']).exclude(pk=row.pk).exists(),'session-delivery-active')
        options,env=context(run.project)
        head=delivery._head(run.project,options,env)[1]
        c.require(head==row.commit_oid or row.plan.get('separate_reports') and delivery.reports_only_between(run.project,options,env,row.commit_oid,head),'session-delivery-head-changed')
        c.require(delivery._git(run.project,options,env,'rev-parse','refs/tags/'+row.version).stdout.decode().strip()==row.tag_oid,'session-delivery-tag-changed')
        index=GitSessionIndex.objects.select_for_update().get(pk=row.git_index_id)
        c.require(index.state=='COMMITTED','session-effect-index-protected')
        receipt={'editing':True,'delivery_id':row.pk,'version':row.version,'scope':data['scope'],'index_preserved':True,'new_attempt_required':True}
        c.event(run,'session-recovery-edit-admitted',{'request_id':key,'fingerprint':fingerprint,'authority':actor.pk,'authorization':data['authorization'],'delivery_id':row.pk,'original':snapshot(row),'diagnosis':diagnosis(run,row),'receipt':receipt})
        event=Event.objects.filter(run=run,kind='session-recovery-edit-admitted',data__request_id=key).get()
        run.configuration={**run.configuration,'delivery_recovery':{'phase':'editing','delivery_id':row.pk,'event_id':event.pk,'scope':data['scope']}};run.save(update_fields=['configuration','updated'])
        index.state='OPEN';index.save(update_fields=['state','updated'])
        if row.plan.get('separate_reports'):
            from .publication_boundary import reopen_for_remediation
            issues=diagnosis(run,row)['issues']
            reopen_for_remediation(run,version=any(issue['code']=='package-source-version-not-aligned' for issue in issues))
        return receipt


def authorize(actor,data):
    c.require(set(data)=={'project_id','run_id','request_id','kind','authorization'},'session-effect-fields-invalid',400)
    c.require(data['kind'] in KINDS,'session-effect-kind-invalid',400);authorize_text(data['authorization'])
    with transaction.atomic():
        run=c.run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False);approval_authority(actor,run);c.working(run)
        key=c.identifier(data['request_id']);fingerprint=c.digest(data)
        prior=Event.objects.filter(run=run,kind='session-effect-authorized',data__request_id=key).first()
        if prior:c.require(prior.data['fingerprint']==fingerprint,'session-effect-request-conflict');return prior.data['receipt']
        receipt={'approval_id':key,'kind':data['kind'],'identity':identity(run)}
        c.event(run,'session-effect-authorized',{'request_id':key,'fingerprint':fingerprint,'authority':actor.pk,'authorization':data['authorization'],'receipt':receipt})
        return receipt


def validate_mode(run,data,row):
    kind=data['kind'];mode=data['mode']
    c.require(kind in KINDS and mode in ('recovery','requested'),'session-effect-kind-invalid',400)
    if mode=='requested':
        approved=Event.objects.filter(run=run,kind='session-effect-authorized',data__request_id=data.get('approval_id'),data__receipt__kind=kind).first()
        c.require(approved is not None and approved.data['receipt']['identity']==identity(run),'session-effect-approval-required',403)
    else:
        c.require(row is not None and row.run_id==run.pk,'session-effect-failed-step-required')
        if kind=='resume':
            c.require(editable_delivery(run)==row.pk and inactive_partial(row),'session-effect-edit-admission-required');return
        key='commit' if kind=='commit' else kind.replace('publish:','release:')
        c.require(kind!='resume' and row.steps.filter(key=key,state='FAILED').exists(),'session-effect-failed-step-required')


def observe(run,data):
    base_guard(run)
    row=GitDelivery.objects.filter(pk=data.get('delivery_id'),run=run).first() if data.get('delivery_id') else None
    validate_mode(run,data,row)
    index=GitSessionIndex.objects.filter(change_id=run.change_record_id,session_id=run.coding_session_id).first()
    options,env=context(run.project);branch,head=delivery._head(run.project,options,env)
    result={'identity':identity(run),'kind':data['kind'],'mode':data['mode'],'source_revision':c.revision(run),'framing_digest':run.mandate.get('framing_digest'),'head':head,'branch':branch,'delivery':snapshot(row) if row else None,'project_source':project_source(run)}
    from .package_versions import require_aligned
    version=row.version if row else data.get('version')
    delivery.version_tuple(version);result['version']=version
    if data['kind'] in ('commit','resume'):
        c.require(index is not None and index.state=='OPEN','session-effect-index-protected')
        reservations=list(index.reservations.filter(active=True).values_list('path',flat=True))
        c.require(reservations or data['kind']=='resume','session-git-reservation-required')
        if data['kind']=='resume':
            c.require(row is not None and editable_delivery(run)==row.pk,'session-effect-edit-admission-required')
            c.require(Event.objects.filter(run=run,kind='session-remediation-prepared',data__delivery_id=row.pk).exists(),'session-remediation-required')
            require_aligned(run.project.root,version)
            separate=row.plan.get('separate_reports',False)
            c.require(head==row.commit_oid or separate and delivery.reports_only_between(run.project,options,env,row.commit_oid,head),'session-delivery-head-changed')
            marker=run.configuration['delivery_recovery'];complete=marker['scope']=='project'
            try:result['git']=delivery.preflight_commit(run.project,index,version,reservations,complete=complete,existing_tag=row.tag_oid,separate_reports=separate)
            except c.Refused as error:
                if not complete or error.code!='session-delivery-full-empty':raise
                result['git']={'head':head,'branch':branch,'index_digest':delivery._index_digest(index.index_path,run.project.owner_uid),'reuse_commit':True,'paths':[]}
            from .closure_git import remote_plan
            result['remotes']=remote_plan(run.project,head,version)
            c.require(all(t['previous_tag']==row.tag_oid for t in result['remotes']),'session-delivery-remote-changed')
        else:
            c.require(row is None or not row.commit_oid,'session-effect-use-resume-after-commit')
            active=GitDelivery.objects.filter(project=run.project,state__in=['PENDING','RUNNING','UNKNOWN','PARTIAL'])
            if row is not None and data['mode']=='recovery':
                c.require(not row.steps.filter(state__in=['RUNNING','UNKNOWN']).exists(),'session-effect-failed-step-required')
                c.require(head==row.plan['git']['head'],'session-delivery-head-changed')
                result['commit_recovery']=True
                result['git']=delivery.preflight_commit(run.project,index,version,reservations,complete=row.plan.get('scope')=='project')
                active=active.exclude(pk=row.pk)
            c.require(not active.exists(),'session-delivery-active')
            result['index_digest']=delivery._index_digest(index.index_path,run.project.owner_uid)
        validations=Operation.objects.filter(run=run,state='COMPLETED',source_revision=result['source_revision'])
        c.require(any(op.receipt.get('exit_code')==0 and (op.request.get('phase') in ('test','verify','verification') or op.request.get('host_authorization')) for op in validations),'session-git-validation-required')
        if data['kind']=='resume':result['remediation']={'state':'VERIFIED','qualification_revision':result['source_revision']}
    else:
        require_aligned(run.project.root,version)
        active=GitDelivery.objects.filter(project=run.project,state__in=['PENDING','RUNNING','UNKNOWN','PARTIAL'])
        if row is not None and data['mode']=='recovery' and editable_delivery(run)==row.pk:
            c.require(Event.objects.filter(run=run,kind='session-remediation-prepared',data__delivery_id=row.pk).exists(),'session-remediation-required')
            active=active.exclude(pk=row.pk)
        c.require(not active.exists(),'session-delivery-active')
        if data['kind'].startswith('publish:'):
            from .session_delivery import delivery_preflight
            result['publication_plan']=delivery_preflight(run.project,version)
    return result


def status(actor,data):
    run=c.run_scope(actor,data['run_id'],data['project_id'],owner=False);coding_authority(actor,run)
    intent=Event.objects.filter(run=run,kind='session-effect-admitted',data__request_id=data['request_id']).first()
    c.require(intent is not None,'session-effect-not-found',404)
    completed=Event.objects.filter(run=run,kind='session-effect-result',data__intent_id=intent.pk).first()
    if completed:return completed.data['receipt']
    executing=Event.objects.filter(run=run,kind='session-effect-executing',data__intent_id=intent.pk).first()
    from .connector_process import alive
    saved=executing.data.get('executor') if executing else intent.data.get('executor')
    if saved and not alive(saved):
        with transaction.atomic():
            Run.objects.select_for_update().get(pk=run.pk)
            completed=Event.objects.filter(run=run,kind='session-effect-result',data__intent_id=intent.pk).first()
            if completed:return completed.data['receipt']
            return result(intent,'UNKNOWN' if executing else 'FAILED',{'error':'session-effect-worker-stopped' if executing else 'session-effect-stopped-before-dispatch','replay':False})
    return {'state':'INTENT','request_id':data['request_id'],'replay':False}


def inspect(actor,data):
    with git_guard(),transaction.atomic():
        run=c.run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False);coding_authority(actor,run)
        return {'expected_state':observe(run,data),'effects_issued':False}


def request(actor,data):
    required={'project_id','run_id','request_id','kind','mode'}
    c.require(required<=set(data)<=required|{'approval_id','delivery_id','version','message','expected_state'},'session-effect-fields-invalid',400)
    if data['kind']=='resume':c.require(type(data.get('delivery_id')) is int,'session-effect-delivery-required',400)
    key=c.identifier(data['request_id']);fingerprint=c.digest(data)
    if data['kind']=='resume' and data['mode']=='recovery':
        current=c.run_scope(actor,data['run_id'],data['project_id'],owner=False);coding_authority(actor,current)
        if not Event.objects.filter(run=current,kind='session-remediation-prepared',data__delivery_id=data.get('delivery_id')).exists():
            repaired=remediate(actor,{'project_id':data['project_id'],'run_id':data['run_id'],'delivery_id':data.get('delivery_id'),'request_id':'AUTO-'+key})
            if repaired['prepared']['updated_paths']:return repaired
    with git_guard(),transaction.atomic():
        run=c.run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False);coding_authority(actor,run)
        previous=Event.objects.filter(run=run,kind='session-effect-admitted',data__request_id=key).first()
        if previous:
            c.require(previous.data['fingerprint']==fingerprint,'session-effect-request-conflict');return status(actor,data)
        observed=observe(run,data)
        if 'expected_state' in data:c.require(c.digest(observed)==c.digest(data['expected_state']),'session-effect-cas-changed')
        message=data.get('message','Commit explicitement demandé via CAB')
        c.require(isinstance(message,str) and 1<=len(message)<=4000 and '\0' not in message,'session-effect-message-invalid')
        from .connector_process import identity as process_identity
        c.event(run,'session-effect-admitted',{'request_id':key,'fingerprint':fingerprint,'authority':actor.pk,'request':data,'observed':observed,'message':message,'executor':process_identity(__import__('os').getpid())})
        intent=Event.objects.get(run=run,kind='session-effect-admitted',data__request_id=key)
        transaction.on_commit(lambda:launch(intent.pk))
        return {'state':'INTENT','request_id':key,'replay':False}


def result(intent,state,payload):
    receipt={'state':state,'request_id':intent.data['request_id'],**payload}
    c.event(intent.run,'session-effect-result',{'intent_id':intent.pk,'receipt':receipt})
    return receipt


def execute(intent_id):
    """Un seul dispatch : une intention sans résultat n'est jamais rejouée."""
    intent=Event.objects.select_related('run__actor','run__project').get(pk=intent_id)
    run=intent.run;request=intent.data['request'];observed=intent.data['observed'];kind=request['kind']
    existing=Event.objects.filter(run=run,kind='session-effect-result',data__intent_id=intent.pk).first()
    if existing:return existing.data['receipt']
    dispatched=False;continuation=False;standalone_ref=None
    try:
        with git_guard():
            if Event.objects.filter(run=run,kind='session-effect-executing',data__intent_id=intent.pk).exists():
                return status(run.actor,{'project_id':run.project_id,'run_id':run.run_id,'request_id':intent.data['request_id']})
            from .connector_process import identity as process_identity
            c.event(run,'session-effect-executing',{'intent_id':intent.pk,'executor':process_identity(threading.get_native_id())})
            # Révérifier le CAS sans considérer la propre intention comme concurrente.
            from .core.models import GitSessionEffect,GitFileReservation
            options,env=context(run.project)
            c.require(c.revision(run)==observed['source_revision'] and delivery._head(run.project,options,env)==(observed['branch'],observed['head']),'session-effect-cas-changed')
            c.require(project_source(run)==observed['project_source'],'session-effect-cas-changed')
            c.require(not GitSessionEffect.objects.filter(git_index__change__project=run.project,state__in=['INTENT','RUNNING','UNKNOWN']).exists(),'session-git-effect-unresolved')
            modern=run.configuration.get('cycle_profile')=='publication-12-v1'
            if modern and kind!='resume' and not observed.get('commit_recovery'):
                from .publication_boundary import prepare,KEY
                from .stage_substeps import phase
                previous=run.configuration.get(KEY,{})
                boundary=prepare(run,partial=True,commit_reports=previous.get('commit_reports',kind=='commit'),publication=False)
                standalone_ref='requested-effect-'+str(intent.pk)
                phase(run,'publication',standalone_ref,'RUNNING',{'kind':kind,'statistics_job':boundary['statistics_job']})
            if kind=='resume':
                row=GitDelivery.objects.select_related('git_index','run').get(pk=request['delivery_id'],run=run)
                c.require(snapshot(row)==observed['delivery'] and inactive_partial(row),'session-effect-cas-changed')
                c.require(delivery._index_digest(row.git_index.index_path,run.project.owner_uid)==observed['git']['index_digest'],'session-delivery-index-changed')
                separate=row.plan.get('separate_reports',False)
                execution_git=observed['git'] if separate else refresh_full_statistics(run,row,observed['git'],intent.pk)
                boundary=None
                if separate:
                    from .publication_boundary import prepare
                    boundary=prepare(run,commit_reports=True)
                from .connector_process import identity as process_identity
                with transaction.atomic():
                    row=GitDelivery.objects.select_for_update().get(pk=row.pk)
                    c.event(run,'session-postcommit-recovery-started',{'intent_id':intent.pk,'original':snapshot(row)})
                    row.state='RUNNING';row.executor=process_identity(__import__('os').getpid());row.save(update_fields=['state','executor','updated'])
                    if not observed['git'].get('reuse_commit'):
                        step=row.steps.get(key='commit');step.state='RUNNING';step.receipt={'intent_id':intent.pk,'original_completed_receipt_preserved':True};step.save()
                dispatched=True
                reuse=observed['git'].get('reuse_commit')
                if reuse:
                    receipt=copy.deepcopy(row.steps.get(key='commit').receipt)
                    c.require(receipt.get('commit')==row.commit_oid and receipt.get('tag_oid')==row.tag_oid and receipt.get('session_index_digest')==observed['git']['index_digest'],'session-effect-commit-receipt-invalid')
                    GitSessionIndex.objects.filter(pk=row.git_index_id,state='OPEN').update(state='COMMITTED')
                else:receipt=delivery.commit_session(run.actor,{'project_id':run.project_id,'run_id':run.run_id,'request_id':'EFFECT-'+str(intent.pk),'version':row.version,'expected_index_digest':execution_git['index_digest']},full=execution_git.get('full'),tag_mode='move',expected_tag=observed['delivery']['tag_oid'],message=intent.data['message'],separate_reports=separate)
                with transaction.atomic():
                    row=GitDelivery.objects.select_for_update().get(pk=row.pk)
                    row.commit_oid=receipt['commit'];row.tag_oid=receipt['tag_oid']
                    plan=copy.deepcopy(row.plan)
                    if boundary:
                        plan.update(publication_ref=boundary['publication_ref'],statistics_job=boundary['statistics_job'],recovery_intent=intent.pk)
                    if not reuse:plan['git']=execution_git;plan['scope']='project' if 'full' in execution_git else 'change'
                    plan['source_revision']=observed['source_revision']
                    for target in ([] if reuse else plan['forges']):
                        before=next(t for t in observed['remotes'] if t['forge']==target['name'])
                        target['remote']=before['previous'];target['previous_tag']=before['previous_tag']
                    row.plan=plan;row.save(update_fields=['commit_oid','tag_oid','plan','updated'])
                    for step in row.steps.all():
                        if reuse and step.state in ('COMPLETED','SKIPPED'):continue
                        step.state='COMPLETED' if step.key=='commit' or step.key in ('version','version-projection') else 'PENDING'
                        if step.key=='commit':step.receipt={**receipt,'intent_id':intent.pk}
                        elif step.key not in ('version','version-projection'):step.receipt={'intent_id':intent.pk,'original_receipt_preserved':True}
                        step.save()
                    run.configuration={**run.configuration,'delivery_recovery':{**run.configuration['delivery_recovery'],'phase':'continuing'}};run.save(update_fields=['configuration','updated'])
                continuation=True
            elif kind=='commit':
                recovering=observed.get('commit_recovery')
                if recovering:
                    row=GitDelivery.objects.get(pk=request['delivery_id'],run=run)
                    c.require(snapshot(row)==observed['delivery'],'session-effect-cas-changed')
                    c.event(run,'session-commit-recovery-started',{'intent_id':intent.pk,'original':snapshot(row)})
                    if modern and row.plan.get('publication_ref'):
                        from .stage_substeps import phase as publication_phase
                        reference='commit-recovery-'+str(intent.pk)
                        publication_phase(run,'publication',reference,'RUNNING',{'delivery_id':row.pk})
                        row.plan={**row.plan,'publication_ref':reference,'recovery_intent':intent.pk}
                        row.save(update_fields=['plan','updated'])
                    from .connector_process import identity as process_identity
                    row.state='RUNNING';row.executor=process_identity(__import__('os').getpid());row.save(update_fields=['state','executor','updated'])
                    step=row.steps.get(key='commit');step.state='RUNNING';step.receipt={'intent_id':intent.pk};step.save()
                dispatched=True
                receipt=delivery.commit_session(run.actor,{'project_id':run.project_id,'run_id':run.run_id,'request_id':'EFFECT-'+str(intent.pk),'version':observed['version'],'expected_index_digest':observed['index_digest']},full=observed.get('git',{}).get('full'),tag_mode='create' if recovering else 'none',message=intent.data['message'],separate_reports=modern)
                if recovering:
                    row.commit_oid=receipt['commit'];row.tag_oid=receipt['tag_oid'];row.plan={**row.plan,'git':observed['git'],'source_revision':observed['source_revision']};row.save(update_fields=['commit_oid','tag_oid','plan','updated'])
                    delivery._set_step(row.pk,'commit','COMPLETED',{**receipt,'intent_id':intent.pk});continuation=True
            else:
                from .package_versions import require_aligned
                require_aligned(run.project.root,observed['version']);dispatched=True
                def mark(value):c.event(run,'session-effect-progress',{'intent_id':intent.pk,'detail':value})
                if kind.startswith('build:'):
                    receipt=delivery.execute_native_build(run.project,kind.split(':')[1],observed['version'],mark)
                    c.require(receipt.get('exit_code')==0,'session-effect-build-failed')
                else:
                    plan=observed['publication_plan'];target=next((t for t in plan['forges'] if t['name']==kind.split(':')[1]),None)
                    c.require(target is not None,'session-effect-forge-unavailable')
                    receipt=delivery.execute_native_publication(run.project,target,observed['version'],plan,mark)
        if continuation:
            # Le commit est fait ; les étapes déjà réussies ne sont pas rejouées.
            delivery._continue_after_commit(row.pk,receipt)
            row.refresh_from_db();receipt={'delivery_id':row.pk,'delivery':delivery._delivery_view(row)}
            c.require(row.state=='COMPLETED','session-effect-delivery-not-completed')
        if standalone_ref:
            phase(run,'publication',standalone_ref,'COMPLETED',receipt)
        return result(intent,'COMPLETED',receipt)
    except (c.Refused,OSError,ValueError,__import__('subprocess').SubprocessError) as error:
        code=getattr(error,'code',type(error).__name__)
        uncertain=code in ('session-delivery-artifact-outcome-uncertain','session-delivery-result-unknown','session-git-effect-unresolved','closure-git-push-unconfirmed') or not isinstance(error,c.Refused)
        state='UNKNOWN' if dispatched and uncertain else 'FAILED'
        if kind=='resume' or observed.get('commit_recovery'):
            row=GitDelivery.objects.get(pk=request['delivery_id'])
            if row.state=='RUNNING':
                delivery._set_delivery_state(row.pk,'UNKNOWN' if state=='UNKNOWN' else 'PARTIAL')
                step=row.steps.get(key='commit')
                if step.state=='RUNNING':delivery._set_step(row.pk,'commit',state,{'intent_id':intent.pk,'error':code})
        if standalone_ref:
            from .stage_substeps import phase
            phase(run,'publication',standalone_ref,state,{'error':code})
        return result(intent,state,{'error':code,'replay':False})


def launch(intent_id):
    def worker():
        close_old_connections()
        try:execute(intent_id)
        finally:close_old_connections()
    try:threading.Thread(target=worker,name='cab-session-effect',daemon=True).start()
    except RuntimeError:
        intent=Event.objects.select_related('run').get(pk=intent_id)
        result(intent,'FAILED',{'error':'session-effect-not-dispatched','replay':False})
