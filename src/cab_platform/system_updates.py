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

def request(actor,request_id,version='',peer=None):
    c.require(actor.active,'update-not-authorized',403)
    c.identifier(request_id)
    c.require(isinstance(version,str) and (not version or bool(re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)',version))) and len(version)<=100,'update-version-invalid',400)
    try:
        with transaction.atomic():
            prior=SystemUpdate.objects.select_for_update().filter(pk=request_id).first()
            if prior:
                c.require(prior.actor_id==actor.pk,'update-not-authorized',403)
                c.require(prior.target_version==version,'update-request-conflict')
                return status(actor,request_id)
            c.require(not Maintenance.objects.filter(state__in=['PREPARED','INSTALLING']).exists(),'maintenance-in-progress',503)
            c.require(not SystemUpdate.objects.filter(active_slot=1).exists(),'update-already-active')
            c.require(not ConnectorReload.objects.exclude(state='OK').filter(update__state='OK').exists(),'connector-reload-pending')
            from .core.connectors import snapshot
            from .cabu_recovery_policy import capture
            job=SystemUpdate.objects.create(pk=request_id,actor=actor,target_version=version,result={'connector_targets':snapshot(),'recovery_context':capture(actor,peer,request_id,version)})
            ConnectorReload.objects.create(update=job,targets=job.result['connector_targets'],version=version)
            return data(job)
    except IntegrityError:raise c.Refused('update-admission-conflict') from None

def finish(job,state,result):
    public={key:value for key,value in result.items() if key in ('version','verified','package_sha256','error','finalization_id','previous_version')}
    receipt={'request_id':job.pk,'target_version':job.target_version,'state':state,**public}
    with transaction.atomic():
        current=SystemUpdate.objects.select_for_update().get(pk=job.pk)
        if current.state in ('OK','FAILED'):return data(current)
        if 'recovery_context' in current.result:public['recovery_context']=current.result['recovery_context']
        receipt.update(public)
        reload,_=ConnectorReload.objects.get_or_create(update=current,defaults={'targets':current.result.get('connector_targets',[]),'version':public.get('version','')})
        public['connector_targets']=reload.targets
        if state=='OK':
            from .core.connectors import assess
            public['package_state']='OK'
            state,outcomes=assess(public['connector_targets'],public['version'])
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
    from .core.native_control import ensure_update
    ensure_update(SystemUpdate.objects.get(pk=request_id))
    with transaction.atomic():
        job=SystemUpdate.objects.select_for_update().get(pk=request_id)
        if job.state not in ('OK','RECONNECTING','RELOAD_REQUIRED') or job.result.get('verified') is not True:return data(job)
        reload=ConnectorReload.objects.select_for_update().get(update=job)
        if job.state=='OK' and reload.state=='OK':return data(job)
        state,outcomes=assess(reload.targets,job.result['version'],job.result.get('confirmed_disconnected',[]))
        result={**job.result,'connector_targets':reload.targets,'package_state':'OK','connectors':outcomes}
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
        target=matches[0];row=McpConnector.objects.select_for_update().select_related('actor').get(pk=connector_id)
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
    for key in ConnectorReload.objects.exclude(state='OK').filter(update__state='OK').values_list('update_id',flat=True)[:20]:refresh_connectors(key)
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
        result=update(version=job.target_version or None,progress=progress)
        c.require(result.get('verified') is True and bool(result.get('version')) and (not job.target_version or result['version']==job.target_version),'update-verification-failed')
        return finish(job,'OK',result)
    except subprocess.TimeoutExpired:
        return finish(job,'UNKNOWN',{'error':'update-timeout-effect-unreconciled'})
    except (ClientError,c.Refused,OSError,ValueError,RuntimeError,subprocess.SubprocessError) as error:
        code=str(error) if isinstance(error,(ClientError,c.Refused)) else type(error).__name__
        return finish(job,'FAILED',{'error':code[:160]})
