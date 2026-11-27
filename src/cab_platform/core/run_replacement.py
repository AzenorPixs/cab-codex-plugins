"""Annulation traçable d’un cadrage direct resté avant l’exécution."""
from django.db import transaction

from . import commands as c
from .models import (
    Actor, FinalizationPlan, GitDelivery, GitSessionIndex, Lease, MeasurementAction,
    MeasurementPeriod, Run, SessionArchive, TerminalGitCommit,
)

CANCELLED = 'CANCELLED_BEFORE_START'
TERMINAL = {'CLOSED', 'CLOSURE_INVALID', 'BLOCKED', CANCELLED}


def require_unstarted(run):
    c.require(run.mode == 'direct' and run.stage is None and run.state in ('WORKING','FINALIZATION_PENDING')
              and run.suspension in ('','STOP') and not run.review and not run.mandate.get('native_source')
              and not run.mandate.get('legacy_snapshot_id'), 'run-replacement-already-started', 409)
    used = (run.operation_set.exists() or run.finalization_evidence.exists() or run.git_effects.exists()
            or GitSessionIndex.objects.filter(initial_run=run).exists()
            or GitDelivery.objects.filter(run=run).exists() or Lease.objects.filter(run=run).exists()
            or MeasurementPeriod.objects.filter(run=run).exists() or MeasurementAction.objects.filter(run=run).exists()
            or TerminalGitCommit.objects.filter(run=run).exists() or SessionArchive.objects.filter(run=run).exists()
            or FinalizationPlan.objects.filter(run=run).exclude(receipt={}).exists())
    c.require(not used, 'run-replacement-already-started', 409)


def cancelled(run, successor, actor, request):
    c.require(run.pk != successor.pk and run.project_id == successor.project_id and run.actor_id == successor.actor_id
              and run.session_id == successor.session_id and run.change == successor.change
              and successor.mode == 'direct' and successor.created >= run.created, 'run-replacement-divergent', 409)
    previous = run.configuration.get('replacement')
    if run.state == CANCELLED:
        c.require(previous and previous['run_id'] == successor.run_id and previous['request_id'] == request,
                  'run-replacement-conflict', 409)
        return previous
    require_unstarted(run)
    proof = {'run_id':successor.run_id,'project_id':successor.project_id,'request_id':request,
             'authority':actor.pk,'state':CANCELLED,'executed':False}
    run.configuration = {**run.configuration,'replacement':proof}
    run.state = CANCELLED
    run.suspension = ''
    run.save(update_fields=['state','suspension','configuration','updated'])
    SessionArchive.objects.create(run=run,actor=actor,request_id=request,evidence={'replacement':proof})
    c.event(run,'run-cancelled-before-start',proof)
    return proof


@transaction.atomic
def reconcile(actor, data):
    c.require(set(data)=={'project_id','run_id','replacement_run_id','request_id'},
              'run-replacement-fields-invalid',400)
    Actor.objects.select_for_update().get(pk=actor.pk)
    run=c.run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False)
    c.require(actor.role=='admin' or actor.pk==run.actor_id,'run-replacement-authority-required',403)
    successor=c.run_scope(actor,data['replacement_run_id'],data['project_id'],lock=True,owner=False)
    from .run_lifecycle import require_closed_change
    c.require(successor.state=='CLOSED' and not successor.suspension
              and GitDelivery.objects.filter(run=successor,state='COMPLETED').exists(),
              'run-replacement-not-delivered',409)
    require_closed_change(successor)
    return cancelled(run,successor,actor,c.identifier(data['request_id']))


@transaction.atomic
def link_recovery(actor, data):
    """Relie un blocage conservé à une reprise achevée sur preuves."""
    c.require(set(data) == {'project_id', 'run_id', 'recovery_run_id', 'request_id'},
              'run-recovery-fields-invalid', 400)
    request_id = c.identifier(data['request_id'])
    successor = c.run_scope(actor, data['recovery_run_id'], data['project_id'], lock=True, owner=False)
    run = c.run_scope(actor, data['run_id'], data['project_id'], lock=True, owner=False)
    c.require(actor.role == 'admin' or run.actor_id == actor.pk, 'run-recovery-authority-required', 403)
    return _link_closed_recovery(run, successor, actor.pk, request_id)


def _link_closed_recovery(run, successor, authority, request_id, *, automatic=False):
    blocked = run.review.get('closure', {})
    c.require(run.state == 'BLOCKED' and blocked.get('branch') == 'BLOQUÉ',
              'run-recovery-not-blocked')
    c.require(not run.suspension and c.no_pending(run)
              and not Lease.objects.filter(run=run, state='HELD').exists(),
              'closure-effects-protected')
    c.require(run.pk != successor.pk and run.mode == successor.mode == 'direct'
              and run.actor_id == successor.actor_id and run.session_id == successor.session_id
              and run.change_record_id is not None and run.change_record_id == successor.change_record_id
              and successor.created > run.created, 'run-recovery-divergent')
    from .run_lifecycle import archive_state, terminal_proof
    c.require(successor.state == 'CLOSED', 'run-recovery-not-closed')
    closure = terminal_proof(successor)['receipt']
    c.require(closure.get('branch') == 'TERMINÉ' and closure.get('delivered') is True
              and GitDelivery.objects.filter(run=successor, state='COMPLETED',
                   plan__source_revision=closure.get('source_revision')).exists(),
              'run-recovery-not-delivered')
    archive, _ = archive_state(successor)
    link = {'run_id': successor.run_id, 'request_id': request_id,
            'closure_receipt': closure['receipt_id'], 'archive_path': archive,
            'blocked_receipt': blocked['receipt_id']}
    previous = run.configuration.get('closed_recovery')
    if previous:
        c.require(previous == link, 'run-recovery-link-conflict')
        return previous
    run.configuration = {**run.configuration, 'closed_recovery': link}
    run.save(update_fields=['configuration'])
    audit = {**link, 'authority': authority}
    if automatic:
        audit['origin'] = 'cab-closure'
    c.event(run, 'run-recovery-linked', audit)
    return link


@transaction.atomic
def link_recovery_on_close(successor: Run) -> dict | None:
    """Associe une reprise directe livrée à son seul blocage compatible."""
    if successor.mode != 'direct' or successor.state != 'CLOSED' or not successor.change_record_id:
        return None
    if successor.review.get('closure', {}).get('delivered') is not True:
        return None
    successor = Run.objects.select_for_update().get(pk=successor.pk)
    candidates = Run.objects.filter(
        project_id=successor.project_id, change_record_id=successor.change_record_id,
        session_id=successor.session_id, actor_id=successor.actor_id,
        mode='direct', state='BLOCKED', created__lt=successor.created,
        review__closure__branch='BLOQUÉ',
    )
    if candidates.filter(configuration__closed_recovery__run_id=successor.run_id).exists():
        return None
    unlinked = list(candidates.filter(configuration__closed_recovery__isnull=True)
                    .select_for_update().order_by('pk')[:2])
    if len(unlinked) != 1:
        return None
    from .models import Event
    blocked = unlinked[0]
    if not Event.objects.filter(run=blocked, kind='run-closed',
                                data=blocked.review['closure'], created__lte=successor.created).exists():
        return None
    return _link_closed_recovery(blocked, successor, successor.actor_id,
                                 'AUTO-RUN-RECOVERY-'+str(successor.pk), automatic=True)


def closed_recovery(run):
    link = run.configuration.get('closed_recovery')
    if link and Run.objects.filter(project_id=run.project_id, run_id=link['run_id'],
                                  state='CLOSED', review__closure__receipt_id=link['closure_receipt']).exists():
        return {'run_id': link['run_id'], 'closure_receipt': link['closure_receipt']}
    return None
