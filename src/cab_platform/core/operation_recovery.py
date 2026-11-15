"""Arrêt constaté d'un test local sans résultat : reçu original immuable."""
import os
from pathlib import Path
from django.db import transaction,connection
from django.utils import timezone
from cab_platform.paths import STATE
from . import commands as c
from .models import Operation,Run,Workshop,Lease,Resource,Event,Maintenance


def stopped_facts(op):
    c.require(op.state=='UNKNOWN' and op.receipt.get('state')=='UNKNOWN' and op.receipt.get('error')=='ProcessLookupError','operation-recovery-not-applicable')
    c.require(op.request.get('kind')=='local' and op.request.get('phase')=='test' and not op.request.get('host_authorization'),'operation-recovery-sandbox-test-required')
    c.require(op.dispatched and op.receipt.get('dispatched') is True and op.receipt.get('finished'),'operation-recovery-receipt-incomplete')
    c.require(not (STATE/'receipts'/(str(op.pk)+'.json')).exists(),'operation-recovery-spool-pending')
    c.require(not Operation.objects.filter(run=op.run,state__in=['INTENT','RUNNING']).exclude(pk=op.pk).exists(),'operation-recovery-run-active')
    recorded=op.receipt.get('executor')
    if not recorded:
        started=Event.objects.filter(run=op.run,kind='operation-process-started',data__operation_id=op.pk).order_by('-pk').first()
        recorded=started.data.get('executor') if started else None
    if recorded and all(key in recorded for key in ('pid','uid','start','boot')):
        from cab_platform.connector_process import identity
        current=identity(recorded['pid'])
        c.require(not current or any(current[key]!=recorded[key] for key in ('pid','uid','start','boot')),'operation-executor-still-active')
    workshop=Workshop.objects.get(run=op.run);root=Path(workshop.path);info=root.lstat()
    c.require(root.resolve()==root and root.is_dir() and (info.st_dev,info.st_ino)==(workshop.device,workshop.inode),'workshop-identity-changed')
    c.require(root.is_relative_to(Path(op.run.project.root)/'.cab-tests') or root.is_relative_to(Path('/tmp/cab')),'workshop-identity-changed')
    scratch=root/'.tmp';scratch_info=scratch.stat();matches=[];observed=0
    for proc in Path('/proc').iterdir():
        if not proc.name.isdigit():continue
        try:
            if proc.stat().st_uid not in (0,op.run.actor.uid):continue
            observed+=1;args=(proc/'cmdline').read_bytes().split(b'\0')
            if any(str(root).encode() in arg for arg in args):matches.append(int(proc.name));continue
            try:mounted=(proc/'root/cab-tmp').stat()
            except FileNotFoundError:continue
            if (mounted.st_dev,mounted.st_ino)==(scratch_info.st_dev,scratch_info.st_ino):matches.append(int(proc.name))
        except (FileNotFoundError,ProcessLookupError):continue
        except PermissionError:raise c.Refused('operation-quiescence-unverifiable') from None
    c.require(not matches,'operation-workshop-still-active')
    held=list(Lease.objects.filter(operation=op,state='HELD').select_related('resource'))
    c.require(all(row.resource_id.startswith('file:'+op.run.project.root+'/') and row.fencing==row.resource.fencing for row in held),'operation-recovery-lease-divergent')
    return {'observed_at':timezone.now().isoformat(),'workshop':workshop.path,'workshop_device':workshop.device,'workshop_inode':workshop.inode,'processes_checked':observed,'matching_processes':[],'held_lease_ids':[row.pk for row in held],'source_changed_since_admission':c.revision(op.run)!=op.source_revision,'result_available':False,'historical_exit_code_reconstructed':False}


@transaction.atomic
def reconcile_stopped(actor,data,*,automatic=False):
    if automatic:
        c.require(actor is None and os.geteuid()==0,'operation-recovery-policy-required',403)
        run=Run.objects.select_related('project','actor').get(project_id=data['project_id'],run_id=data['run_id'])
        c.require(run.actor.active and run.mandate.get('decisions_resolved') is True,'operation-recovery-policy-protected')
    else:
        c.require(actor and actor.role=='admin' and data.get('developer_authorized') is True,'operation-recovery-authorization-required',403)
        run=c.run_scope(actor,data['run_id'],data['project_id'],owner=False)
    op=Operation.objects.select_for_update().select_related('run__project','run__actor').get(run=run,request_id=data['operation_request_id'])
    run=Run.objects.select_for_update().select_related('project','actor').get(pk=run.pk);op.run=run
    key=c.identifier(data['request_id']);fingerprint=c.digest(data)
    prior=Event.objects.filter(run=run,kind='operation-reconciled-stopped',data__request_id=key).first()
    if prior:
        c.require(prior.data['input_digest']==fingerprint,'operation-recovery-request-conflict');return prior.data['receipt']
    c.require(run.state in ('WORKING','FINALIZATION_PENDING') and not run.suspension,'run-not-working')
    c.require(not Maintenance.objects.filter(state__in=['PREPARED','INSTALLING']).exists(),'maintenance-in-progress')
    c.require(op.receipt_digest==data.get('expected_receipt_digest') and c.digest(op.receipt)==op.receipt_digest,'operation-recovery-receipt-divergent')
    reason=data.get('reason');c.require(isinstance(reason,str) and 10<=len(reason)<=4000,'operation-recovery-reason-required',400)
    with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_xact_lock(%s)',[300001])
    facts=stopped_facts(op);original=op.receipt.copy();digest=op.receipt_digest
    resources=list(Resource.objects.select_for_update().filter(pk__in=Lease.objects.filter(operation=op,state='HELD').values('resource_id')).order_by('pk'))
    receipt={'request_id':key,'operation_id':op.pk,'operation_request_id':op.request_id,'classification':'stopped-result-unavailable','effective_state':'CANCELLED','original_state':'UNKNOWN','original_receipt_digest':digest,'original_receipt_preserved':True,'facts':facts,'authority':'cab-policy' if automatic else actor.pk,'automatic':automatic,'authorization_kind':'service-policy' if automatic else 'developer-decision','reason':reason,'tests_passed':False,'work_replayed':False}
    if not automatic:receipt['developer_authorized']=True
    else:receipt['policy']='sandbox-test-stopped-v1'
    op.state='CANCELLED';op.save(update_fields=['state','updated'])
    Lease.objects.filter(operation=op,state='HELD').update(state='RELEASED')
    for resource in resources:resource.revision+=1;resource.save(update_fields=['revision'])
    c.event(run,'operation-reconciled-stopped',{'request_id':key,'input_digest':fingerprint,'operation_id':op.pk,'original_receipt':original,'receipt':receipt})
    return receipt


def recover_one(operation_id):
    """Même preuve que le parcours administratif, sans décision LLM par opération."""
    op=Operation.objects.select_related('run__project','run__actor').get(pk=operation_id)
    data={'project_id':op.run.project_id,'run_id':op.run.run_id,'operation_request_id':op.request_id,'request_id':'AUTO-STOPPED-'+str(op.pk)+'-'+op.receipt_digest,'expected_receipt_digest':op.receipt_digest,'reason':'Politique autonome : arrêt prouvé d’un test sandbox, résultat indisponible, aucune réussite ni réémission.'}
    try:return reconcile_stopped(None,data,automatic=True)
    except (c.Refused,OSError,ValueError,Workshop.DoesNotExist) as error:
        code=getattr(error,'code','operation-recovery-evidence-unavailable')
        if Operation.objects.filter(pk=op.pk,state='UNKNOWN').exists():
            last=Event.objects.filter(run=op.run,kind='operation-recovery-waiting',data__operation_id=op.pk).order_by('-pk').first()
            if not last or last.data.get('reason')!=code:
                Event.objects.create(project_id=op.run.project_id,run=op.run,kind='operation-recovery-waiting',data={'operation_id':op.pk,'reason':code,'automatic':True})
        return {'operation_id':op.pk,'protected':True,'reason':code,'work_replayed':False}


_cursor=0

def sweep(limit=10):
    global _cursor
    candidates=list(Operation.objects.filter(pk__gt=_cursor,state='UNKNOWN',request__kind='local',request__phase='test',receipt__error='ProcessLookupError',run__state__in=['WORKING','FINALIZATION_PENDING'],run__suspension='',run__actor__active=True).order_by('pk').values_list('pk',flat=True)[:limit])
    if not candidates:_cursor=0;return
    try:
        for pk in candidates:
            try:recover_one(pk)
            except Operation.DoesNotExist:continue
    finally:_cursor=candidates[-1]
