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
