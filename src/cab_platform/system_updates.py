"""Une mise à jour officielle, sérialisée et indépendante de cab.service."""
import hashlib
import json
import os
import re
import subprocess
from django.db import IntegrityError,transaction
from django.utils import timezone
from .core import commands as c
from .core.models import Maintenance,SystemUpdate,ConnectorReload
from .paths import STATE,atomic_json,read_json
from .client import ClientError

TERMINAL={'OK','FAILED','UNKNOWN','RELOAD_REQUIRED'}
UNIT='cab-update.service'

def data(job):
    from .cabu_recovery_policy import authorization
    return {'request_id':job.pk,'state':job.state,'target_version':job.target_version or None,**job.result,'recovery_authorization':authorization(job),'frontend_recovery_authorization':authorization(job,frontend=True)}

def receipt_path(job):return STATE/('system-update-'+hashlib.sha256(job.pk.encode()).hexdigest()+'.json')

def status(actor,request_id):
    try:job=SystemUpdate.objects.get(pk=request_id)
    except SystemUpdate.DoesNotExist:raise c.Refused('update-not-found',404) from None
    c.require(actor.active and (actor.pk==job.actor_id or actor.role=='admin'),'update-not-authorized',403)
    if ConnectorReload.objects.filter(update=job).exists() and job.state in ('OK','RECONNECTING','RELOAD_REQUIRED'):return refresh_connectors(job.pk)
    return data(job)

def release_obsolete_slot(actor, version, request_id, scope):
    """Libérer le créneau d'une version remplacée, en conservant son reçu."""
    from .frontend_recovery import observation
    from .cabu_recovery_policy import same_instance
    from .session_delivery import delivery_version_order
    active = SystemUpdate.objects.select_for_update().filter(active_slot=1).first()
    if active is None:
        return
    old = active.result.get('version')
    recovery = observation(active)
    settled_relaunch = recovery.get('state') == 'WAITING_MCP' and same_instance(
        recovery.get('replacement'), scope.get('frontend'))
    admissible = (version and old and active.actor_id == actor.pk
                  and active.state == 'RELOAD_REQUIRED' and active.result.get('verified') is True
                  and delivery_version_order(old) < delivery_version_order(version) and (not recovery or settled_relaunch)
                  and verified_local_installation(version) is not None)
    c.require(admissible, 'update-already-active')
    active.result = {**active.result, 'superseded_by': request_id}
    active.active_slot = None
    active.save(update_fields=['result', 'active_slot', 'updated'])

def request(actor,request_id,version='',peer=None,*,delivery_proof=None):
    c.require(actor.active,'update-not-authorized',403)
    c.identifier(request_id)
    c.require(isinstance(version,str) and (not version or bool(re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)',version))) and len(version)<=100,'update-version-invalid',400)
    try:
        with transaction.atomic():
            prior=SystemUpdate.objects.select_for_update().filter(pk=request_id).first()
            if prior:
                c.require(prior.actor_id==actor.pk,'update-not-authorized',403)
                c.require(prior.target_version==version,'update-request-conflict')
                c.require(prior.result.get('delivery_proof')==delivery_proof,'update-request-conflict')
                return status(actor,request_id)
            c.require(not Maintenance.objects.filter(state__in=['PREPARED','INSTALLING']).exists(),'maintenance-in-progress',503)
            from .cabu_recovery_policy import capture
            scope=capture(actor,peer,request_id,version)
            if delivery_proof is not None:scope['provenance']='sealed-delivery'
            release_obsolete_slot(actor, version, request_id, scope)
            c.require(not ConnectorReload.objects.exclude(state='OK').filter(update__state='OK').exists(),'connector-reload-pending')
            from .core.connectors import snapshot
            context={'connector_targets':snapshot(),'recovery_context':scope}
            if delivery_proof is not None:context['delivery_proof']=delivery_proof
            job=SystemUpdate.objects.create(pk=request_id,actor=actor,target_version=version,result=context)
            ConnectorReload.objects.create(update=job,targets=job.result['connector_targets'],version=version)
            return data(job)
    except IntegrityError:raise c.Refused('update-admission-conflict') from None


@transaction.atomic
def enqueue_closed_delivery(run_id):
    """Le cycle est déjà scellé. Archive et demande système partagent la transaction."""
    from .core.models import GitDelivery,Run,SessionArchive
    from .core.run_lifecycle import archive_session,evaluate

    run=Run.objects.select_for_update(of=('self',)).select_related('actor','project','finalization_plan').get(pk=run_id)
    plan=run.finalization_plan
    if run.configuration.get('post_close_update') or run.state!='CLOSED' or plan.policy.get('post_close_cabu') is not True:
        return
    c.require(run.mode=='direct' and run.actor.active and not run.suspension and run.project.identifier=='cab',
              'post-close-cabu-authority-invalid')
    c.require(c.digest(plan.policy)==plan.digest and plan.policy['nature']=='delivery' and plan.phase=='CLOSED'
              and plan.receipt==run.review.get('closure') and plan.receipt.get('delivered') is True,
              'post-close-cabu-closure-unverified')
    publication=run.configuration.get('stage_protocol',{}).get('active',{}).get('11',{})
    version=publication.get('cab',{}).get('version')
    delivery=GitDelivery.objects.filter(run=run,version=version,state='COMPLETED').first()
    c.require(publication.get('validated') and delivery is not None and bool(delivery.commit_oid) and bool(delivery.tag_oid)
              and delivery.plan.get('source_revision')==plan.receipt['source_revision']
              and (not plan.policy.get('target_version') or plan.policy['target_version']==version),
              'post-close-cabu-publication-unverified')
    package=delivery.steps.filter(key='verify:package',state='COMPLETED').first()
    sha=package.receipt.get('package_sha256','') if package else ''
    c.require(package is not None and package.receipt.get('verified') is True and re.fullmatch('[a-f0-9]{64}',sha)
              and plan.receipt.get('artifact_groups',{}).get('package')==sha,'post-close-cabu-package-unverified')
    if not SessionArchive.objects.filter(run=run).exists():
        evaluation=evaluate(run)
        c.require(evaluation['archive_allowed'],'post-close-cabu-archive-unverified')
        archive_session(run.actor,{'project_id':run.project_id,'run_id':run.run_id,
            'request_id':f'AUTO-ARCHIVE-{run.pk}','evaluation_digest':evaluation['evaluation_digest']})
    request_id=f'AUTO-CABU-{run.pk}'
    proof={'delivery_id':delivery.pk,'closure_receipt':plan.receipt['receipt_id'],'package_sha256':sha}
    job=request(run.actor,request_id,version,delivery_proof=proof)
    queued={'request_id':request_id,'version':version,'admission':job['state'],**proof}
    run.configuration={**run.configuration,'post_close_update':queued}
    run.save(update_fields=['configuration','updated'])
    c.event(run,'post-close-cabu-queued',queued)
    return job


def enqueue_pending_deliveries():
    from .core.models import Run

    if SystemUpdate.objects.filter(active_slot=1).exists() or Maintenance.objects.filter(state__in=('PREPARED','INSTALLING')).exists():
        return
    pending=Run.objects.filter(state='CLOSED',finalization_plan__policy__post_close_cabu=True).exclude(
        configuration__post_close_update__isnull=False).order_by('pk')
    for run_id in pending.values_list('pk',flat=True)[:10]:
        try:
            if enqueue_closed_delivery(run_id):return
        except c.Refused as error:
            if error.code in ('maintenance-in-progress','connector-reload-pending','update-admission-conflict','update-already-active'):
                return
            with transaction.atomic():
                run=Run.objects.select_for_update().get(pk=run_id)
                if not run.configuration.get('post_close_update'):
                    blocked={'state':'BLOCKED','reason':error.code}
                    run.configuration={**run.configuration,'post_close_update':blocked}
                    run.save(update_fields=['configuration','updated'])
                    c.event(run,'post-close-cabu-blocked',blocked)

def shared_owner(job):
    scope=job.result.get('recovery_context',{})
    if scope.get('frontend') and scope.get('actor_id')==job.actor_id:
        from .frontend_recovery import shared_profile
        if shared_profile(job.actor.uid,job.actor.agent):
            return scope.get('instance')
    return None

def request_topology_recovery(row, owner, request_id):
    """Reprendre un bureau vérifié à partir du heartbeat, sans réinstaller CAB."""
    from . import __version__
    from .cabu_recovery_policy import capture, same_instance
    from .connector_process import identity
    from .core.connectors import snapshot
    from .frontend_recovery import shared_profile
    actor=row.actor
    if not same_instance(identity(row.process['pid']),row.process):
        return None
    scope=capture(actor,{'pid':row.process['pid'],'uid':actor.uid},request_id,__version__)
    if not (scope['frontend'] and same_instance(scope['instance'],owner)
            and shared_profile(actor.uid,actor.agent) and verified_local_installation(__version__)):
        return None
    targets=[target for target in snapshot() if target['agent']==actor.agent]
    if not targets or any(not same_instance(target.get('owner'),owner) for target in targets):
        return None
    scope['provenance']='authenticated-heartbeat'
    try:
        with transaction.atomic():
            if SystemUpdate.objects.filter(active_slot=1).exists():
                return None
            job=SystemUpdate.objects.create(pk=request_id,actor=actor,target_version=__version__,
                result={'connector_targets':targets,'recovery_context':scope,'topology_only':True})
            ConnectorReload.objects.create(update=job,targets=targets,version=__version__)
    except IntegrityError:
        return None
    return job.pk

def finish(job,state,result):
    public={key:value for key,value in result.items() if key in ('version','verified','package_sha256','error','finalization_id','previous_version')}
    receipt={'request_id':job.pk,'target_version':job.target_version,'state':state,**public}
    with transaction.atomic():
        current=SystemUpdate.objects.select_for_update().get(pk=job.pk)
        if current.state in ('OK','FAILED'):return data(current)
        if 'recovery_context' in current.result:public['recovery_context']=current.result['recovery_context']
        if 'delivery_proof' in current.result:public['delivery_proof']=current.result['delivery_proof']
        if current.result.get('topology_only'):public['topology_only']=True
        receipt.update(public)
        reload,_=ConnectorReload.objects.get_or_create(update=current,defaults={'targets':current.result.get('connector_targets',[]),'version':public.get('version','')})
        public['connector_targets']=reload.targets
        if state=='OK':
            from .core.connectors import assess
            public['package_state']='OK'
            state,outcomes=assess(public['connector_targets'],public['version'],shared_owner=shared_owner(current))
            public['connectors']=outcomes
            reload.version=public['version'];reload.state=state;reload.observations=outcomes;reload.save()
        # Publication avant clôture SQL, sous le même verrou : une sonde tardive
        # ne remplace jamais le reçu terminal du worker.
        atomic_json(receipt_path(job),receipt)
        current.state=state;current.result=public
        current.active_slot=1 if state in ('UNKNOWN','RECONNECTING','RELOAD_REQUIRED') else None
        current.save(update_fields=['state','result','active_slot','updated'])
    return receipt

def refresh_connectors(request_id):
    from .core.connectors import assess
    from .frontend_recovery import observation
    from .core.native_control import ensure_update
    existing=SystemUpdate.objects.get(pk=request_id)
    if existing.result.get('superseded_by'):return data(existing)
    ensure_update(existing)
    with transaction.atomic():
        job=SystemUpdate.objects.select_for_update().get(pk=request_id)
        if job.result.get('superseded_by'):return data(job)
        if job.state not in ('OK','RECONNECTING','RELOAD_REQUIRED') or job.result.get('verified') is not True:return data(job)
        reload=ConnectorReload.objects.select_for_update().get(update=job)
        if job.state=='OK' and reload.state=='OK':return data(job)
        recovery=observation(job)
        state,outcomes=assess(reload.targets,job.result['version'],job.result.get('confirmed_disconnected',[]),recovery=recovery,shared_owner=shared_owner(job))
        result={**job.result,'connector_targets':reload.targets,'package_state':'OK','connectors':outcomes}
        if recovery:result['frontend_recovery']=recovery
        reload.version=job.result['version'];reload.state=state;reload.observations=outcomes;reload.save()
        if state!=job.state or result!=job.result:
            job.state=state;job.result=result;job.active_slot=None if state=='OK' else 1
            atomic_json(receipt_path(job),data(job));job.save(update_fields=['state','result','active_slot','updated'])
        return data(job)

def confirm_disconnected(actor,data):
    """Constater une liaison MCP arrêtée et approuvée, sans la dire reconnectée."""
    from .core.models import McpConnector,Operation,Lease
    from .core.connectors import observed_dead
    c.require(actor.active and actor.role=='admin','administrator-required',403)
    c.require(set(data)=={'request_id','connector_id','confirmation_id','confirmed'} and data['confirmed'] is True,'update-confirmation-invalid',400)
    request_id=c.identifier(data['request_id']);confirmation_id=c.identifier(data['confirmation_id']);connector_id=data['connector_id']
    with transaction.atomic():
        job=SystemUpdate.objects.select_for_update().get(pk=request_id)
        previous=job.result.get('confirmed_disconnected',[])
        existing=next((item for item in previous if item.get('confirmation_id')==confirmation_id),None)
        if existing:
            c.require(existing['connector_id']==connector_id,'update-confirmation-conflict')
            return {'state':'ALREADY_CONFIRMED','request_id':request_id,'connector_id':connector_id}
        c.require(job.state=='RELOAD_REQUIRED' and job.result.get('verified') is True,'update-confirmation-state-invalid')
        reload=ConnectorReload.objects.select_for_update().get(update=job)
        matches=[item for item in reload.targets if item.get('kind')=='managed' and item.get('connector_id')==connector_id]
        c.require(len(matches)==1,'update-connector-not-targeted',404)
        target=matches[0];row=McpConnector.objects.select_for_update(of=('self',),no_key=True).select_related('actor').get(pk=connector_id)
        c.require(row.process==target['process'] and observed_dead(row.process) and observed_dead(row.worker),'update-connector-still-running')
        c.require(not row.pending and not row.uncertain,'update-connector-outcome-uncertain')
        c.require(not Operation.objects.filter(run__actor=row.actor).exclude(state__in=c.TERMINAL).exists() and not Lease.objects.filter(run__actor=row.actor,state='HELD').exists(),'native-control-effects-protected')
        c.require(not Maintenance.objects.filter(state__in=['PREPARED','INSTALLING']).exists(),'maintenance-in-progress')
        item={'confirmation_id':confirmation_id,'connector_id':connector_id,'process':row.process,'worker':row.worker,'generation':row.generation,'confirmed_by':actor.pk,'confirmed_at':timezone.now().isoformat(),'pending_evidence':'last-heartbeat','stop_evidence':'pidfd-observed'}
        row.state='DISCONNECTED';row.save(update_fields=['state','seen'])
        from .core.connectors import project_connector
        project_connector(row)
        job.result={**job.result,'confirmed_disconnected':[*previous,item]};job.save(update_fields=['result','updated'])
        c.event(None,'update-connector-disconnected',{'request_id':request_id,**item})
    return {'state':'CONFIRMED','request_id':request_id,'connector_id':connector_id}

def dispatch():
    # Cette fonction est appelée par le superviseur, jamais par le client MCP.
    enqueue_pending_deliveries()
    for key in ConnectorReload.objects.exclude(state='OK').filter(update__state='OK').values_list('update_id',flat=True)[:20]:refresh_connectors(key)
    pending=SystemUpdate.objects.filter(active_slot=1,state__in=['RECONNECTING','RELOAD_REQUIRED']).first()
    if pending:
        refresh_connectors(pending.pk)
        pending.refresh_from_db()
        if pending.state == 'RELOAD_REQUIRED':
            from .frontend_recovery import recover
            recover(pending)
        return
    with transaction.atomic():
        job=SystemUpdate.objects.select_for_update().filter(active_slot=1).first()
        if not job:return
        if job.state in ('RECONNECTING','RELOAD_REQUIRED'):
            refresh_connectors(job.pk);return
        recovered=read_json(receipt_path(job))
        if recovered and recovered.get('request_id')==job.pk and recovered.get('target_version')==job.target_version and recovered.get('state') in TERMINAL|{'RECONNECTING'}:
            job.state=recovered['state'];job.result={key:value for key,value in recovered.items() if key not in ('request_id','target_version','state')};job.active_slot=1 if job.state in ('UNKNOWN','RECONNECTING','RELOAD_REQUIRED') else None;job.save();return
        if job.state!='QUEUED':
            expired=(timezone.now()-job.updated).total_seconds()>120
            if not expired or job.state=='UNKNOWN':return
        else:
            if Maintenance.objects.filter(state__in=['PREPARED','INSTALLING']).exists():return
            job.state='DISPATCHED';job.save(update_fields=['state','updated']);expired=False
    if expired:
        active=subprocess.run(['/usr/bin/systemctl','show','--property=ActiveState','--value',UNIT],capture_output=True,text=True,timeout=10)
        if active.returncode!=0 or active.stdout.strip() not in ('active','activating','reloading'):finish(job,'UNKNOWN',{'error':'update-worker-disappeared-no-replay'})
        return
    try:
        result=subprocess.run(['/usr/bin/systemctl','start','--no-block',UNIT],capture_output=True,timeout=15)
    except (OSError,subprocess.SubprocessError):
        finish(job,'UNKNOWN',{'error':'update-dispatch-unconfirmed'});return
    if result.returncode:finish(job,'UNKNOWN',{'error':'update-worker-start-failed'})

def worker():
    c.require(os.getuid()==0,'root-administration-required',403)
    with transaction.atomic():
        job=SystemUpdate.objects.select_for_update().filter(state='DISPATCHED',active_slot=1).first()
        if not job:return {'state':'NO_PENDING_UPDATE'}
        job.state='RUNNING';job.save(update_fields=['state','updated'])
    def progress(state):
        SystemUpdate.objects.filter(pk=job.pk).update(state=state,updated=timezone.now())
    try:
        c.require(job.actor.active,'update-requester-inactive',403)
        from .update import update
        expected=job.result.get('delivery_proof',{}).get('package_sha256')
        result=verified_local_installation(job.target_version)
        if result is None:
            c.require(not job.result.get('topology_only'),'topology-installation-not-verified')
            options={'expected_package_sha256':expected} if expected is not None else {}
            result=update(version=job.target_version or None,progress=progress,**options)
        c.require(expected is None or result.get('package_sha256')==expected,'update-published-package-divergent')
        c.require(result.get('verified') is True and bool(result.get('version')) and (not job.target_version or result['version']==job.target_version),'update-verification-failed')
        return finish(job,'OK',result)
    except subprocess.TimeoutExpired:
        return finish(job,'UNKNOWN',{'error':'update-timeout-effect-unreconciled'})
    except (ClientError,c.Refused,OSError,ValueError,RuntimeError,subprocess.SubprocessError) as error:
        code=str(error) if isinstance(error,(ClientError,c.Refused)) else type(error).__name__
        return finish(job,'FAILED',{'error':code[:160]})


def verified_local_installation(version):
    """Rattacher une demande native explicite à une installation CABU déjà vérifiée."""
    from .client import Client
    if not version:
        return None
    prior = read_json(STATE / 'last-update.json', {})
    if (prior.get('version') != version or prior.get('verified') is not True
            or not re.fullmatch('[a-f0-9]{64}', prior.get('package_sha256', ''))):
        return None
    installed = subprocess.check_output(
        ['/usr/bin/dpkg-query', '-W', '-f=${Status}|${Version}', 'cab'], text=True, timeout=10
    ).strip()
    if installed != 'install ok installed|' + version:
        return None
    health = Client(admin=True).get('health')
    if health.get('state') == 'READY' and health.get('version') == version:
        return prior
    return None
