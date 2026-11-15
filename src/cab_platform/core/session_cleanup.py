"""Retrait observé des anciens composants et suppression explicite du seul RUN."""
import os
from pathlib import Path
import pwd
import subprocess
from django.db import transaction
from django.utils import timezone
from cab_platform import bootstrap
from cab_platform.paths import STATE
from . import commands as c
from .models import Run,Event,Incident,Lease,Notice,Subscription,Operation,Metric,MeasurementPeriod,MeasurementAction,RunEvidence,FinalizationPlan,SessionArchive,SessionProjection,Workshop,CodingSession


def identity(run):return {'project_id':run.project_id,'run_id':run.run_id,'session_id':run.session_id,'generation':run.generation,'change':run.change,'mode':run.mode}


def observe(argv,**options):
    try:return subprocess.run(argv,capture_output=True,timeout=5,**options)
    except (OSError,subprocess.SubprocessError):raise c.Refused('legacy-service-observation-unavailable') from None

def retirement_facts(run):
    from .run_lifecycle import guard
    from cab_platform.legacy_closure import binding_proof
    guard(run)
    c.require(run.mode=='service' and run.suspension=='IMPORT_PROTECTED' and run.actor.role=='component' and not run.actor.active and run.actor.agent in ('ccab','sgs') and run.run_id=='service-'+run.actor.agent,'legacy-service-retirement-not-applicable')
    binding=binding_proof(run)
    c.require(not run.operation_set.exists(),'legacy-service-operations-present')
    health=bootstrap.status();c.require(health.get('state')=='READY','replacement-service-not-ready')
    active=observe(['/usr/bin/systemctl','is-active','--quiet','cab.service'])
    c.require(active.returncode==0,'replacement-service-not-ready')
    component=run.actor.agent;names={'cgpt_approval_bridge_'+component,'cgpt_approval_bridge_'+component+'.py','cgpt_approval_bridge_'+component+'_service.py','cgpt-approval-bridge-'+component+'.mjs',component+'-service',component+'_service.py'}
    for proc in Path('/proc').iterdir():
        if not proc.name.isdigit():continue
        try:args=(proc/'cmdline').read_bytes().split(b'\0')
        except (FileNotFoundError,ProcessLookupError):continue
        except PermissionError:raise c.Refused('legacy-service-observation-unavailable') from None
        c.require(not any(os.path.basename(value.decode(errors='replace')) in names for value in args),'legacy-service-still-running')
    patterns=['*'+component+'*','*'+component.upper()+'*'];units=observe(['/usr/bin/systemctl','list-units','--type=service','--state=active,activating','--no-legend','--plain',*patterns],text=True)
    c.require(units.returncode==0 and not units.stdout.strip(),'legacy-service-still-running')
    bus=Path('/run/user')/str(run.actor.uid)/'bus'
    if bus.exists():
        user=pwd.getpwuid(run.actor.uid);options={'user':user.pw_uid,'group':user.pw_gid,'extra_groups':os.getgrouplist(user.pw_name,user.pw_gid)} if os.getuid()==0 else {}
        units=observe(['/usr/bin/systemctl','--user','list-units','--type=service','--state=active,activating','--no-legend','--plain',*patterns],text=True,env={'HOME':user.pw_dir,'XDG_RUNTIME_DIR':str(bus.parent),'DBUS_SESSION_BUS_ADDRESS':'unix:path='+str(bus),'PATH':os.defpath},**options)
        c.require(units.returncode==0 and not units.stdout.strip(),'legacy-service-still-running')
    return {'binding':binding,'component':component,'legacy_actor_inactive':True,'legacy_process_absent':True,'legacy_unit_absent':True,'replacement':'cab.service','replacement_state':'READY','replacement_version':health['version']}


def retirement_proof(run):
    receipt=run.review.get('closure',{})
    events={'legacy-service-retirement':'legacy-service-retired','legacy-technical-retirement':'legacy-technical-session-retired'}
    kind=receipt.get('kind')
    c.require(kind in events and receipt.get('identity')==identity(run) and receipt.get('snapshot_sha256')==run.mandate.get('import_sha256'),'legacy-service-retirement-proof-invalid')
    if kind=='legacy-technical-retirement':
        c.require(run.mode=='direct' and receipt.get('developer_authorized') is True and receipt.get('normal_acceptance') is False,'legacy-technical-retirement-proof-invalid')
    c.require(Event.objects.filter(run=run,kind=events[kind],data=receipt).exists(),'terminal-audit-missing')
    return {'kind':kind,'receipt':receipt}


@transaction.atomic
def retire_technical(actor,data):
    from .run_lifecycle import scoped,guard
    from cab_platform.legacy_closure import binding_proof
    c.require(actor.role=='admin' and data.get('developer_authorized') is True,'technical-retirement-authorization-required',403)
    run=scoped(actor,data,lock=True);key=c.identifier(data['request_id']);fingerprint=c.digest(data)
    previous=Event.objects.filter(run=run,kind='legacy-technical-session-retired',data__request_id=key).first()
    if previous:
        c.require(previous.data.get('input_digest')==fingerprint,'technical-retirement-request-conflict')
        return retirement_proof(run)
    guard(run)
    c.require(run.mode=='direct' and run.suspension=='IMPORT_PROTECTED' and not run.actor.active and run.state in ('UNKNOWN','WORKING','FINALIZATION_PENDING'),'technical-retirement-not-applicable')
    c.require(not run.operation_set.exists(),'technical-retirement-operations-present')
    c.require(not Run.objects.filter(session_id=run.session_id,suspension='',state__in=['WORKING','FINALIZATION_PENDING','REVIEW_PENDING']).exclude(pk=run.pk).exists(),'technical-retirement-active-session')
    c.require(data.get('expected_import_sha256')==run.mandate.get('import_sha256'),'legacy-snapshot-divergent')
    reason=data.get('reason');c.require(isinstance(reason,str) and 10<=len(reason.strip())<=4000,'technical-retirement-reason-required',400)
    authorization=data.get('authorization');c.require(isinstance(authorization,str) and 10<=len(authorization)<=4000,'technical-retirement-authorization-required',400)
    binding=binding_proof(run)
    receipt={'kind':'legacy-technical-retirement','classification':'technical-session-retired','receipt_id':'LEGACY-TECHNICAL-RETIRE-'+str(run.pk),'request_id':key,'input_digest':fingerprint,'identity':identity(run),'observed_at':timezone.now().isoformat(),'snapshot_sha256':run.mandate['import_sha256'],'binding':binding,'authority':actor.pk,'developer_authorized':True,'authorization':authorization,'reason':reason,'previous_state':run.state,'historical_end_unknown':True,'normal_acceptance':False,'work_replayed':False}
    run.review={**run.review,'closure':receipt};run.state='CLOSED';run.stage=11;run.save(update_fields=['review','state','stage','updated'])
    c.event(run,'legacy-technical-session-retired',receipt)
    return retirement_proof(run)


@transaction.atomic
def retire(run,authority):
    run=Run.objects.select_for_update().select_related('project','actor').get(pk=run.pk)
    if run.state=='CLOSED':return retirement_proof(run)
    facts=retirement_facts(run)
    receipt={'kind':'legacy-service-retirement','receipt_id':'LEGACY-SERVICE-RETIRE-'+str(run.pk),'identity':identity(run),'observed_at':timezone.now().isoformat(),'snapshot_sha256':run.mandate['import_sha256'],'facts':facts,'authority':authority,'previous_state':run.state,'historical_end_unknown':True,'normal_acceptance':False,'work_replayed':False}
    run.review={**run.review,'closure':receipt};run.state='CLOSED';run.stage=11;run.save(update_fields=['review','state','stage','updated'])
    c.event(run,'legacy-service-retired',receipt);c.projection(run)
    return retirement_proof(run)


def linked(query):return [{'run_id':row.run_id,'project':row.project.identifier or row.project_id} for row in query.select_related('project').order_by('pk')]


def deletion_preview(actor,data,lock=False):
    from .run_lifecycle import scoped,guard,terminal_proof
    run=scoped(actor,data,lock=lock);shared=[];reasons=[]
    try:
        guard(run);c.require(run.state=='CLOSED','session-not-closed');terminal_proof(run)
        c.require(not Incident.objects.filter(run=run).exclude(state='RESOLVED').exists(),'session-incident-unresolved')
        c.require(not Lease.objects.filter(operation__run=run).exclude(run=run).exists(),'session-shared-lease-protected')
        c.require(not any((STATE/'receipts'/(str(pk)+'.json')).exists() for pk in run.operation_set.values_list('pk',flat=True)),'session-receipt-pending')
    except (c.Refused,OSError,ValueError) as error:reasons.append(getattr(error,'code','session-proof-unavailable'))
    if run.coding_session_id:
        peers=Run.objects.filter(coding_session_id=run.coding_session_id).exclude(pk=run.pk)
        if peers.exists():shared.append({'kind':'session','label':'Même SID de codage','runs':linked(peers),'preserved':True})
    if run.change_record_id:
        peers=Run.objects.filter(change_record_id=run.change_record_id).exclude(pk=run.pk)
        if peers.exists():shared.append({'kind':'change','label':'Même change','runs':linked(peers),'preserved':True})
    if run.mandate.get('legacy_snapshot_id'):
        peers=Run.objects.filter(mandate__legacy_snapshot_id=run.mandate['legacy_snapshot_id']).exclude(pk=run.pk)
        shared.append({'kind':'import','label':'Source historique d’import conservée','runs':linked(peers),'preserved':True})
    notices=list(Notice.objects.filter(producer=run))
    external=[]
    for notice in notices:
        subscribers=Subscription.objects.filter(subject=notice.subject,run__project=run.project).exclude(run=run)
        external.extend([s.run_id for s in subscribers])
    if external:
        reasons.append('session-shared-coordination-protected');shared.append({'kind':'coordination','label':'Avis utilisés par d’autres sessions','runs':linked(Run.objects.filter(pk__in=external)),'preserved':True})
    counts={model._meta.model_name:model.objects.filter(run=run).count() for model in (Operation,Lease,Subscription,Event,Incident,Metric,MeasurementPeriod,MeasurementAction,RunEvidence,FinalizationPlan,SessionArchive,Workshop)}
    counts['notice']=len(notices);counts['projection']=SessionProjection.objects.filter(binding=run).count()
    result={'project_id':run.project_id,'run_id':run.run_id,'identity':identity(run),'allowed':not reasons,'reasons':sorted(set(reasons)),'shared':shared,'counts':counts,'files_deleted':False}
    result['deletion_digest']=c.digest(result);return result


@transaction.atomic
def delete(actor,data):
    key=c.identifier(data['request_id']);c.require(data.get('confirm_irreversible') is True,'session-delete-confirmation-required',400)
    previous=Event.objects.filter(project_id=data['project_id'],kind='session-deleted',data__request_id=key).first()
    if previous:
        c.require((actor.role=='admin' or previous.data['actor']==actor.pk) and previous.data['receipt']['run_id']==data['run_id'] and previous.data['input_digest']==c.digest(data),'session-delete-request-conflict')
        return previous.data['receipt']
    preview=deletion_preview(actor,data,lock=True);c.require(preview['allowed'],'session-delete-protected')
    c.require(preview['deletion_digest']==data.get('expected_deletion_digest'),'session-delete-preview-stale')
    c.require(not preview['shared'] or data.get('confirm_shared') is True,'session-delete-shared-confirmation-required',400)
    run=Run.objects.get(project_id=data['project_id'],run_id=data['run_id']);sid=run.coding_session_id;project=run.project
    if sid:CodingSession.objects.select_for_update().get(pk=sid)
    for model in (Lease,MeasurementAction,MeasurementPeriod,RunEvidence,FinalizationPlan,SessionArchive,Workshop,Metric,Incident,Subscription):model.objects.filter(run=run).delete()
    Notice.objects.filter(producer=run).delete();SessionProjection.objects.filter(binding=run).delete();Event.objects.filter(run=run).delete();Operation.objects.filter(run=run).delete();run.delete()
    removed_sid=False
    if sid and not Run.objects.filter(coding_session_id=sid).exists() and not MeasurementPeriod.objects.filter(session_id=sid).exists():CodingSession.objects.filter(pk=sid).delete();removed_sid=True
    receipt={'request_id':key,'run_id':data['run_id'],'deleted':True,'deleted_at':timezone.now().isoformat(),'coding_session_deleted':removed_sid,'shared_resources_preserved':True,'files_deleted':False}
    Event.objects.create(project=project,kind='session-deleted',data={'request_id':key,'input_digest':c.digest(data),'actor':actor.pk,'receipt':receipt})
    return receipt
