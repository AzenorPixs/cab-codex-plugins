"""Workers d’exécution : intention durable, prévol, effet unique, reçu corrélé."""
import json
import logging
import os
from pathlib import Path
import pwd
import selectors
import signal
import subprocess
import sys
import time
import httpx
from django.db import connections
from django.utils import timezone
from .core import commands
from .core.models import Lease,Operation,Run
from .logging import redact
from .paths import STATE,atomic_json,private_dir,read_json
from .workshops import workshop
log=logging.getLogger('cab.execution')

class BeforeEffect(Exception):pass

def child(packet,uid,timeout=30):
    user=pwd.getpwuid(uid);env={**os.environ,'HOME':user.pw_dir,'USER':user.pw_name,'LOGNAME':user.pw_name,'PYTHONDONTWRITEBYTECODE':'1'}
    # Aucune variable de configuration privée du service n’est transmise.
    env={k:v for k,v in env.items() if not k.startswith(('CAB_DATABASE','CAB_POSTGRES','CAB_ADMIN','ELECTRIC_'))}
    options={}
    if os.getuid()==0:options={'user':uid,'group':user.pw_gid,'extra_groups':os.getgrouplist(user.pw_name,user.pw_gid)}
    p=subprocess.run([sys.executable,'-m','cab_platform.execution_child'],input=json.dumps(packet),env=env,text=True,capture_output=True,timeout=timeout,**options)
    try:result=json.loads(p.stdout)
    except ValueError:raise BeforeEffect('execution-helper-unavailable') from None
    if p.returncode or not result.get('ok'):raise BeforeEffect(result.get('error','execution-helper-failed'))
    return result['result']

def describe(run,profile):
    return child({'action':'describe','directory':run.project.root,'profile':profile},run.actor.uid)

def _local_prepare(op):
    r=op.run;p=workshop(r)
    args={'request_id':op.request_id,'run_id':r.run_id,'reservation_version':r.generation,'session_id':r.session_id,'change_id':r.change,'directory':r.project.root,'argv':op.request['argv'],'timeout_ms':op.request.get('timeout_ms',120000)}
    roots=r.mandate.get('runtime_roots',[])
    grant={'status':'AUTHORIZED_ATELIER','directory':r.project.root,'atelier':str(p),'runtimeRoots':roots,'autonomy':{'protocol':'autonomous-change-v1','mandateId':r.mandate.get('mandate_id',r.run_id),'paths':[str(Path(r.project.root)/v) for v in r.mandate['paths']]}}
    result=child({'action':'sandbox','args':args,'grant':grant},r.actor.uid)
    return result['argv'],p

def _bounded_process(argv,uid,timeout_ms):
    user=pwd.getpwuid(uid);options={}
    if os.getuid()==0:options={'user':uid,'group':user.pw_gid,'extra_groups':os.getgrouplist(user.pw_name,user.pw_gid)}
    env={'PATH':'/usr/bin:/bin','HOME':user.pw_dir,'LANG':'C.UTF-8','PYTHONDONTWRITEBYTECODE':'1'}
    process=subprocess.Popen(argv,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,env=env,start_new_session=True,**options)
    data=bytearray();deadline=time.monotonic()+timeout_ms/1000;state='COMPLETED';selector=selectors.DefaultSelector();selector.register(process.stdout,selectors.EVENT_READ)
    try:
        while selector.get_map():
            if time.monotonic()>deadline:state='TIMED_OUT';os.killpg(process.pid,signal.SIGKILL)
            for key,_ in selector.select(0.1):
                part=os.read(key.fd,65536)
                if not part:selector.unregister(key.fileobj);continue
                data.extend(part)
                if len(data)>1024*1024:state='TIMED_OUT';os.killpg(process.pid,signal.SIGKILL);del data[1024*1024:]
            if state=='TIMED_OUT':process.wait(timeout=5)
        return state,process.wait(timeout=5),redact(data.decode('utf-8',errors='replace'),limit=1024*1024)
    finally:selector.close();process.stdout.close()

def _external_prepare(op,status=False):
    r=op.run;profile=dict(r.mandate['external_adapters'][op.request['adapter_id']]);target=profile.pop('target_fingerprint',None)
    key=profile['resource_key']
    bank=Lease.objects.filter(run=r,resource_id=key,state='HELD',operation__isnull=True).first()
    commands.require(bank is not None,'external-bank-required')
    packet={'protocol':'cab-external-exec-v1','action':'status' if status else 'execute','job_id':commands.digest([r.run_id,op.request_id]),'input_digest':op.input_digest,'scope_digest':commands.digest([r.project.root,r.run_id]),'container':profile['container'],'target_fingerprint':target}
    if not status:packet.update(argv=op.request['argv'],timeout_ms=op.request.get('timeout_ms',120000))
    envelope={'action':'prepare-external','directory':r.project.root,'profile':profile,'packet':packet,'files':op.request.get('files',[]) if not status else [],'read_roots':[str(Path(r.project.root)/v) for v in r.mandate['paths']]}
    result=child(envelope,r.actor.uid)
    return {'action':'external','directory':r.project.root,'profile':profile,'packet':result['packet'],'timeout_ms':op.request.get('timeout_ms',120000)},bank

def execute_operation(operation_id):
    op=commands.claim_operation(operation_id)
    if op is None:return
    # Toujours recharger les relations dans ce thread.
    op=Operation.objects.select_related('run__project','run__actor').get(pk=op.pk)
    receipt={'request_id':op.request_id,'input_digest':op.input_digest,'source_revision':op.source_revision,'state':'FAILED_TO_START','exit_code':None,'output':'','started':timezone.now().isoformat(),'dispatched':False}
    issued=False
    try:
        if op.request['kind']=='local':prepared,_=_local_prepare(op)
        elif op.request['kind']=='external':prepared,bank=_external_prepare(op)
        elif op.request['kind']=='native':
            from .opencode import connection,session
            with connection(op.run.actor):pass
            if op.request['native_action']!='create':session(op.run)
        commands.require(commands.revision(op.run)==op.source_revision,'source-changed-before-effect')
        commands.dispatched(op.pk,op.dispatch_nonce);issued=True;receipt['dispatched']=True
        if op.request['kind']=='local':
            state,exit_code,output=_bounded_process(prepared,op.run.actor.uid,op.request.get('timeout_ms',120000));receipt.update(state=state,exit_code=exit_code,output=output)
        elif op.request['kind']=='native':
            from .opencode import control
            result=control(op.run,op.request);receipt.update(state='COMPLETED',exit_code=0,native=result)
        else:
            result=child(prepared,op.run.actor.uid,timeout=op.request.get('timeout_ms',120000)/1000+40)['remote']
            receipt.update(resource=bank.resource_id,fencing=bank.fencing,lease_id=bank.pk)
            if result.get('job_id')!=prepared['packet']['job_id'] or result.get('input_digest')!=op.input_digest:
                receipt.update(state='UNKNOWN',error='remote-receipt-unverified')
            elif result.get('status')=='REFUSED' and result.get('noEffect') is True:
                receipt.update(state='FAILED_TO_START',error=result.get('errorCode','remote-preflight-refused'))
            elif result.get('status') in ['COMPLETED','TIMED_OUT','FAILED_TO_START','OUTPUT_LIMIT']:
                receipt.update(state='TIMED_OUT' if result['status']=='OUTPUT_LIMIT' else result['status'],exit_code=result.get('exitCode'),output=result.get('output',''),target_fingerprint=result.get('target_fingerprint'),artifacts=result.get('artifacts',[]),workdir=result.get('workdir'))
                with __import__('django.db',fromlist=['transaction']).transaction.atomic():
                    r=Run.objects.select_for_update().get(pk=op.run_id);adapter=r.mandate['external_adapters'][op.request['adapter_id']]
                    old=adapter.get('target_fingerprint');commands.require(old in (None,result.get('target_fingerprint')),'external-target-divergent')
                    adapter['target_fingerprint']=result.get('target_fingerprint');r.save()
            else:receipt.update(state='UNKNOWN',error='remote-result-unavailable')
    except (BeforeEffect,commands.Refused,OSError,subprocess.SubprocessError,ValueError,httpx.HTTPError) as error:
        code=error.code if isinstance(error,commands.Refused) else str(error) if isinstance(error,BeforeEffect) else type(error).__name__
        receipt.update(state='UNKNOWN' if issued else 'FAILED_TO_START',error=code)
        log.warning('execution stopped',extra={'request_id':op.request_id,'run_id':op.run.run_id,'code':code})
    receipt['finished']=timezone.now().isoformat()
    spool=private_dir(STATE/'receipts')/(str(op.pk)+'.json')
    # Le reçu est d’abord fsync côté service ; une panne SQL après l’effet ne
    # perd pas sa preuve et ne déclenche jamais une seconde exécution.
    atomic_json(spool,{'operation_id':op.pk,'nonce':op.dispatch_nonce,'receipt':receipt})
    try:
        commands.complete(op.pk,op.dispatch_nonce,receipt);spool.unlink()
    finally:connections.close_all()

def recover_receipts():
    for path in sorted(private_dir(STATE/'receipts').glob('*.json')):
        saved=read_json(path)
        commands.require(path.name==str(saved['operation_id'])+'.json','receipt-spool-identity-invalid')
        commands.complete(saved['operation_id'],saved['nonce'],saved['receipt'])
        path.unlink()
