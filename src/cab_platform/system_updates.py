"""Une mise à jour officielle, sérialisée et indépendante de cab.service."""
import hashlib
import json
import os
import re
import subprocess
from django.db import IntegrityError,transaction
from django.utils import timezone
from .core import commands as c
from .core.models import Maintenance,SystemUpdate
from .paths import STATE,atomic_json,read_json
from .client import ClientError

TERMINAL={'OK','FAILED','UNKNOWN'}
UNIT='cab-update.service'

def data(job):
    return {'request_id':job.pk,'state':job.state,'target_version':job.target_version or None,**job.result}

def receipt_path(job):return STATE/('system-update-'+hashlib.sha256(job.pk.encode()).hexdigest()+'.json')

def status(actor,request_id):
    try:job=SystemUpdate.objects.get(pk=request_id)
    except SystemUpdate.DoesNotExist:raise c.Refused('update-not-found',404) from None
    c.require(actor.active and (actor.pk==job.actor_id or actor.role=='admin'),'update-not-authorized',403)
    return data(job)

def request(actor,request_id,version=''):
    c.require(actor.active,'update-not-authorized',403)
    c.identifier(request_id)
    c.require(isinstance(version,str) and (not version or bool(re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)',version))) and len(version)<=100,'update-version-invalid',400)
    try:
        with transaction.atomic():
            prior=SystemUpdate.objects.select_for_update().filter(pk=request_id).first()
            if prior:
                c.require(prior.actor_id==actor.pk,'update-not-authorized',403)
                c.require(prior.target_version==version,'update-request-conflict')
                return data(prior)
            c.require(not Maintenance.objects.filter(state__in=['PREPARED','INSTALLING']).exists(),'maintenance-in-progress',503)
            c.require(not SystemUpdate.objects.filter(active_slot=1).exists(),'update-already-active')
            job=SystemUpdate.objects.create(pk=request_id,actor=actor,target_version=version)
            return data(job)
    except IntegrityError:raise c.Refused('update-admission-conflict') from None

def finish(job,state,result):
    public={key:value for key,value in result.items() if key in ('version','verified','package_sha256','error','finalization_id','previous_version')}
    receipt={'request_id':job.pk,'target_version':job.target_version,'state':state,**public}
    with transaction.atomic():
        current=SystemUpdate.objects.select_for_update().get(pk=job.pk)
        if current.state in ('OK','FAILED'):return data(current)
        # Publication avant clôture SQL, sous le même verrou : une sonde tardive
        # ne remplace jamais le reçu terminal du worker.
        atomic_json(receipt_path(job),receipt)
        current.state=state;current.result=public
        current.active_slot=1 if state=='UNKNOWN' else None
        current.save(update_fields=['state','result','active_slot','updated'])
    return receipt

def dispatch():
    # Cette fonction est appelée par le superviseur, jamais par le client MCP.
    with transaction.atomic():
        job=SystemUpdate.objects.select_for_update().filter(active_slot=1).first()
        if not job:return
        recovered=read_json(receipt_path(job))
        if recovered and recovered.get('request_id')==job.pk and recovered.get('target_version')==job.target_version and recovered.get('state') in TERMINAL:
            job.state=recovered['state'];job.result={key:value for key,value in recovered.items() if key not in ('request_id','target_version','state')};job.active_slot=1 if job.state=='UNKNOWN' else None;job.save();return
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
