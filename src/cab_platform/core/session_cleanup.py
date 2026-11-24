"""Retrait observé des anciens composants et suppression explicite du seul RUN."""
import os
from pathlib import Path
import pwd
import subprocess
from django.db import DatabaseError, connection, transaction
from django.db.models import Q
from django.utils import timezone
from cab_platform import bootstrap
from cab_platform.paths import STATE
from . import commands as c
from .models import Run,Event,Incident,Lease,Notice,Subscription,Operation,Metric,MeasurementPeriod,MeasurementAction,RunEvidence,FinalizationPlan,SessionArchive,SessionProjection,Workshop,CodingSession,Project
from .models import ChangeStageIteration, CycleTokenUsage, GitDelivery, GitFileReservation, GitSessionIndex, ResourceReservation, RunCycleIteration


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
    from .run_lifecycle import scoped,guard,require_closed_change
    from cab_platform.legacy_closure import binding_proof
    c.require(actor.role=='admin' and data.get('developer_authorized') is True,'technical-retirement-authorization-required',403)
    run=scoped(actor,data,lock=True);key=c.identifier(data['request_id']);fingerprint=c.digest(data)
    previous=Event.objects.filter(run=run,kind='legacy-technical-session-retired',data__request_id=key).first()
    if previous:
        c.require(previous.data.get('input_digest')==fingerprint,'technical-retirement-request-conflict')
        return retirement_proof(run)
    guard(run)
    require_closed_change(run)
    c.require(run.mode=='direct' and run.suspension=='IMPORT_PROTECTED' and not run.actor.active and run.state in ('UNKNOWN','WORKING','FINALIZATION_PENDING'),'technical-retirement-not-applicable')
    c.require(not run.operation_set.exists(),'technical-retirement-operations-present')
    c.require(not Run.objects.filter(session_id=run.session_id,suspension='',state__in=['WORKING','FINALIZATION_PENDING','REVIEW_PENDING']).exclude(pk=run.pk).exists(),'technical-retirement-active-session')
    c.require(data.get('expected_import_sha256')==run.mandate.get('import_sha256'),'legacy-snapshot-divergent')
    reason=data.get('reason');c.require(isinstance(reason,str) and 10<=len(reason.strip())<=4000,'technical-retirement-reason-required',400)
    authorization=data.get('authorization');c.require(isinstance(authorization,str) and 10<=len(authorization)<=4000,'technical-retirement-authorization-required',400)
    binding=binding_proof(run)
    receipt={'kind':'legacy-technical-retirement','classification':'technical-session-retired','receipt_id':'LEGACY-TECHNICAL-RETIRE-'+str(run.pk),'request_id':key,'input_digest':fingerprint,'identity':identity(run),'observed_at':timezone.now().isoformat(),'snapshot_sha256':run.mandate['import_sha256'],'binding':binding,'authority':actor.pk,'developer_authorized':True,'authorization':authorization,'reason':reason,'previous_state':run.state,'historical_end_unknown':True,'normal_acceptance':False,'work_replayed':False}
    run.review={**run.review,'closure':receipt};run.state='CLOSED';run.stage=run.cycle_steps;run.save(update_fields=['review','state','stage','updated'])
    c.event(run,'legacy-technical-session-retired',receipt)
    return retirement_proof(run)


@transaction.atomic
def retire(run,authority):
    run=Run.objects.select_for_update().select_related('project','actor').get(pk=run.pk)
    if run.state=='CLOSED':return retirement_proof(run)
    facts=retirement_facts(run)
    receipt={'kind':'legacy-service-retirement','receipt_id':'LEGACY-SERVICE-RETIRE-'+str(run.pk),'identity':identity(run),'observed_at':timezone.now().isoformat(),'snapshot_sha256':run.mandate['import_sha256'],'facts':facts,'authority':authority,'previous_state':run.state,'historical_end_unknown':True,'normal_acceptance':False,'work_replayed':False}
    run.review={**run.review,'closure':receipt};run.state='CLOSED';run.stage=run.cycle_steps;run.save(update_fields=['review','state','stage','updated'])
    c.event(run,'legacy-service-retired',receipt);c.projection(run)
    return retirement_proof(run)


def linked(query):return [{'run_id':row.run_id,'project':row.project.identifier or row.project_id} for row in query.select_related('project').order_by('pk')]


def stage_passages(run):
    return ChangeStageIteration.objects.filter(Q(run=run) | Q(run__isnull=True, cycle__run=run))


def delete_stage_history(run):
    from cab_platform.change_stage_metrics import refresh_total

    passages = stage_passages(run)
    stage_ids = sorted(set(passages.values_list('stage_id', flat=True)))
    while passages.exists():
        # Les actions portent une référence protégée vers leur passage parent.
        deleted, _ = passages.filter(children__isnull=True).delete()
        c.require(deleted, 'session-shared-stage-protected')
    RunCycleIteration.objects.filter(run=run).delete()
    for stage_id in stage_ids:
        refresh_total(stage_id)


def deletion_preview(actor,data,lock=False,*,cleanup_terminal=False):
    from .run_lifecycle import scoped,guard,terminal_proof
    run=scoped(actor,data,lock=lock);shared=[];reasons=[]
    if lock and run.coding_session_id:
        CodingSession.objects.select_for_update().get(pk=run.coding_session_id)
    try:
        guard(run)
        c.require(not Incident.objects.filter(run=run).exclude(state='RESOLVED').exists(),'session-incident-unresolved')
        c.require(not Lease.objects.filter(operation__run=run).exclude(run=run).exists(),'session-shared-lease-protected')
        c.require(not any((STATE/'receipts'/(str(pk)+'.json')).exists() for pk in run.operation_set.values_list('pk',flat=True)),'session-receipt-pending')
        c.require(not ResourceReservation.objects.filter(run=run, expires__gt=timezone.now()).exists()
                  and not GitFileReservation.objects.filter(git_index__initial_run=run, active=True).exists(),
                  'session-reservation-protected')
        c.require(not GitDelivery.objects.filter(run=run,state__in=('PENDING','RUNNING','UNKNOWN','PARTIAL')).exists(),
                  'closure-effects-protected')
    except (c.Refused,OSError,ValueError) as error:reasons.append(getattr(error,'code','session-proof-unavailable'))
    closure_reason = None
    if not reasons:
        try:
            if cleanup_terminal:
                cleanup_terminal_proof(run)
            else:
                c.require(run.state=='CLOSED','session-not-closed')
                terminal_proof(run)
        except c.Refused as error:
            if error.code in ('maintenance-in-progress','closure-effects-protected','closure-measurement-open','closure-exception-unresolved'):
                reasons.append(error.code)
            else:
                closure_reason = error.code
        except (OSError, ValueError):
            closure_reason = 'session-proof-unavailable'
    if run.coding_session_id:
        peers=Run.objects.filter(coding_session_id=run.coding_session_id).exclude(pk=run.pk)
        if peers.exists():shared.append({'kind':'session','label':'Même SID de codage','runs':linked(peers),'preserved':True})
        elif GitSessionIndex.objects.filter(session_id=run.coding_session_id).exclude(state='RETIRED').exists():
            reasons.append('session-git-index-protected')
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
    passages = stage_passages(run)
    passage_ids = passages.values('pk')
    foreign_passages = ChangeStageIteration.objects.filter(
        Q(parent_id__in=passage_ids) | Q(cycle__run=run),
    ).exclude(pk__in=passage_ids)
    foreign_tokens = CycleTokenUsage.objects.filter(
        Q(stage_passage_id__in=passage_ids) | Q(action_id__in=passage_ids),
    ).exclude(run=run)
    if foreign_passages.exists() or foreign_tokens.exists():
        reasons.append('session-shared-stage-protected')
    counts={model._meta.model_name:model.objects.filter(run=run).count() for model in (Operation,Lease,Subscription,Event,Incident,Metric,MeasurementPeriod,MeasurementAction,RunEvidence,FinalizationPlan,SessionArchive,Workshop)}
    counts['notice']=len(notices);counts['projection']=SessionProjection.objects.filter(binding=run).count()
    counts.update(stage_passages=passages.count(), cycles=RunCycleIteration.objects.filter(run=run).count(),
                  token_usage=CycleTokenUsage.objects.filter(run=run).count())
    result={'project_id':run.project_id,'run_id':run.run_id,'identity':identity(run),
            'state':run.state,'suspension':run.suspension,'allowed':not reasons and not closure_reason,
            'allowed_without_closure':not reasons and closure_reason is not None and run.mode in ('direct','piloted'),
            'reasons':sorted(set(reasons + ([closure_reason] if closure_reason else []))),
            'shared':shared,'counts':counts,'files_deleted':False}
    result['deletion_digest']=c.digest(result);return result


@transaction.atomic
def delete(actor,data,*,cleanup_terminal=False):
    key=c.identifier(data['request_id']);c.require(data.get('confirm_irreversible') is True,'session-delete-confirmation-required',400)
    previous=Event.objects.filter(project_id=data['project_id'],kind='session-deleted',data__request_id=key).first()
    if previous:
        c.require((actor.role=='admin' or previous.data['actor']==actor.pk) and previous.data['receipt']['run_id']==data['run_id'] and previous.data['input_digest']==c.digest(data),'session-delete-request-conflict')
        return previous.data['receipt']
    preview=deletion_preview(actor,data,lock=True,cleanup_terminal=cleanup_terminal)
    c.require(preview['deletion_digest']==data.get('expected_deletion_digest'),'session-delete-preview-stale')
    without_closure = preview['allowed_without_closure'] and data.get('confirm_without_closure') is True
    c.require(preview['allowed'] or without_closure,'session-delete-protected')
    c.require(not preview['shared'] or data.get('confirm_shared') is True,'session-delete-shared-confirmation-required',400)
    run=Run.objects.get(project_id=data['project_id'],run_id=data['run_id']);sid=run.coding_session_id;project=run.project
    from .models import GitChange,GitSessionEffect
    terminal_identity = identity(run)
    origin={'run_id':run.run_id,'session_id':run.session_id}
    GitChange.objects.filter(initial_run=run,origin={}).update(origin=origin)
    for index in GitSessionIndex.objects.filter(initial_run=run,origin={}).select_related('session'):
        details={**origin}
        if index.session_id:details.update(agent=index.session.agent,uid=index.session.uid)
        index.origin=details;index.save(update_fields=['origin'])
    GitSessionEffect.objects.filter(run=run,origin={}).update(origin=origin)
    GitDelivery.objects.filter(run=run,origin={}).update(origin=origin)
    delete_stage_history(run)
    for model in (Lease,MeasurementAction,MeasurementPeriod,RunEvidence,FinalizationPlan,SessionArchive,Workshop,Metric,Incident,Subscription):model.objects.filter(run=run).delete()
    Notice.objects.filter(producer=run).delete();SessionProjection.objects.filter(binding=run).delete();Event.objects.filter(run=run).delete();Operation.objects.filter(run=run).delete();run.delete()
    removed_sid=False
    if sid and not Run.objects.filter(coding_session_id=sid).exists() and not MeasurementPeriod.objects.filter(session_id=sid).exists():CodingSession.objects.filter(pk=sid).delete();removed_sid=True
    receipt={'request_id':key,'run_id':data['run_id'],'deleted':True,'deleted_at':timezone.now().isoformat(),'coding_session_deleted':removed_sid,'shared_resources_preserved':True,'files_deleted':False,'closure_bypassed':without_closure}
    Event.objects.create(project=project,kind='session-deleted',data={'request_id':key,'input_digest':c.digest(data),'actor':actor.pk,'receipt':receipt,'terminal_identity':terminal_identity})
    return receipt


def legacy_run_deleted(project_id, run_id, session_id, change, generation, mode):
    target = dict(project_id=project_id, run_id=run_id, session_id=session_id,
                  change=change, generation=generation, mode=mode)
    return Event.objects.filter(project_id=project_id, kind='session-deleted',
                                data__terminal_identity=target).exists()


def cleanup_terminal_proof(run):
    from .run_lifecycle import guard, terminal_proof

    if run.state == 'BLOCKED':
        guard(run)
        closure = run.review.get('closure', {})
        c.require(not run.suspension and isinstance(closure, dict) and closure.get('branch') == 'BLOQUÉ' and
                  Event.objects.filter(run=run, kind='run-closed', data=closure).exists(),
                  'terminal-audit-missing')
        return
    c.require(run.state == 'CLOSED', 'session-not-closed')
    terminal_proof(run)


def cleanup_lock(scope):
    lock = int.from_bytes(bytes.fromhex(c.digest(scope))[:8], 'big', signed=True)
    if connection.vendor == 'postgresql':
        with connection.cursor() as cursor:
            cursor.execute('SELECT pg_advisory_xact_lock(%s)', [lock])


@transaction.atomic
def cleanup_admission(actor, data):
    from .run_lifecycle import scoped

    key = c.identifier(data['request_id'])
    project = Project.objects.get(pk=data['project_id'])
    c.scope(actor, project)
    stamp = c.digest(data)
    cleanup_lock(['session-cleanup', project.pk, key])
    prior = Event.objects.filter(project=project, kind='session-cleanup-admitted',
                                 data__request_id=key).first()
    if prior:
        c.require(prior.data['actor'] == actor.pk and prior.data['digest'] == stamp,
                  'session-cleanup-request-conflict')
        return prior

    selector = 'run_id' if 'run_id' in data else 'change'
    value = c.identifier(data[selector])
    run_ids = list(Run.objects.filter(project=project, **{selector: value})
                   .order_by('run_id').values_list('run_id', flat=True))
    c.require(run_ids, 'session-cleanup-target-not-found', 404)
    targets = []
    for run_id in run_ids:
        run = scoped(actor, {'project_id': project.pk, 'run_id': run_id}, lock=True)
        cleanup_terminal_proof(run)
        targets.append({'pk': run.pk, **identity(run)})
    return Event.objects.create(project=project, kind='session-cleanup-admitted',
                                data={'request_id': key, 'actor': actor.pk,
                                      'digest': stamp, 'targets': targets})


def cleanup_coordination(run):
    subjects = Subscription.objects.filter(run__project_id=run.project_id).exclude(run=run).values('subject')
    notices = Notice.objects.filter(producer=run)
    removed = Subscription.objects.filter(run=run).delete()[0]
    removed += notices.exclude(subject__in=subjects).delete()[0]
    if notices.exists():
        return {'status': 'PENDING', 'code': 'session-shared-coordination-protected'}
    return {'status': 'REMOVED' if removed else 'ABSENT'}


def cleanup_incidents(run):
    incidents = Incident.objects.filter(run=run, project_id=run.project_id)
    removed = incidents.filter(state='RESOLVED').delete()[0]
    if Incident.objects.filter(run=run).exists():
        return {'status': 'PENDING', 'code': 'session-incident-protected'}
    return {'status': 'REMOVED' if removed else 'ABSENT'}


def cleanup_statistics(run):
    run.mandate = {**run.mandate, 'terminal_cleanup_statistics': True}
    run.save(update_fields=['mandate'])
    removed = Metric.objects.filter(run=run).delete()[0]
    return {'status': 'REMOVED' if removed else 'ABSENT'}


def cleanup_session(actor, run, operation_id):
    preview = deletion_preview(actor, identity(run), cleanup_terminal=True)
    c.require(preview['allowed'], 'session-delete-protected', details=preview['reasons'])
    delete(actor, {
        'project_id': run.project_id, 'run_id': run.run_id,
        'request_id': operation_id, 'expected_deletion_digest': preview['deletion_digest'],
        'confirm_irreversible': True, 'confirm_shared': True,
    }, cleanup_terminal=True)
    return {'status': 'REMOVED'}


@transaction.atomic
def cleanup_component(actor, target, component, operation_id, handler):
    from .run_lifecycle import scoped

    cleanup_lock(['session-cleanup-component', operation_id])
    prior = Event.objects.filter(project_id=target['project_id'], kind='session-cleanup-component',
                                 data__operation_id=operation_id).first()
    if prior:
        return prior.data['result']
    run = scoped(actor, target, lock=True)
    c.require(target == {'pk': run.pk, **identity(run)}, 'session-cleanup-identity-divergent')
    cleanup_terminal_proof(run)
    result = {**handler(run, operation_id), 'component': component, 'operation_id': operation_id}
    if result['status'] != 'PENDING':
        Event.objects.create(project_id=target['project_id'], kind='session-cleanup-component',
                             data={'operation_id': operation_id, 'result': result})
    return result


def cleanup_component_result(actor, target, component, handler):
    operation_id = 'cleanup-' + c.digest([target, component])
    try:
        return cleanup_component(actor, target, component, operation_id, handler)
    except c.Refused as error:
        code = error.code
    except DatabaseError:
        code = 'session-cleanup-storage-unavailable'
    return {'component': component, 'operation_id': operation_id, 'status': 'PENDING', 'code': code}


def terminal_cleanup(actor, data):
    required = {'project_id', 'request_id', 'confirm_irreversible'}
    c.require(set(data) in (required | {'run_id'}, required | {'change'}),
              'session-cleanup-fields-invalid', 400)
    c.require(data['confirm_irreversible'] is True, 'session-delete-confirmation-required', 400)
    admission = cleanup_admission(actor, data)
    handlers = {
        'coordination': cleanup_coordination, 'statistics': cleanup_statistics, 'ccab': cleanup_incidents,
    }
    targets = []
    for target in admission.data['targets']:
        components = [cleanup_component_result(actor, target, component, lambda run, _key: handler(run))
                      for component, handler in handlers.items()]
        if all(item['status'] != 'PENDING' for item in components):
            components.append(cleanup_component_result(
                actor, target, 'session', lambda run, operation_id: cleanup_session(actor, run, operation_id)))
        else:
            components.append({'component': 'session', 'status': 'PENDING', 'code': 'session-cleanup-components-pending'})
        targets.append({'run_id': target['run_id'], 'generation': target['generation'], 'components': components})
    pending = any(item['status'] == 'PENDING' for target in targets for item in target['components'])
    return {'request_id': data['request_id'], 'status': 'PARTIAL' if pending else 'COMPLETE', 'targets': targets}
