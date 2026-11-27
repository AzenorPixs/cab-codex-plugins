"""Recalcul borné des totaux PostgreSQL après évolution des preuves."""

from threading import Lock, Thread
from time import monotonic

from django.db import close_old_connections, transaction
from django.db.models import Exists, OuterRef, Q
from django.utils import timezone

from .core.models import ChangeStage, ChangeStageIteration, CodingSession, Run, RunCycleIteration
from .cycle_attribution import PROJECTION_SCHEMA

_guard=Lock()
_next=0.0
_cursor=0


def refresh(run_id):
    from .change_stage_metrics import cycle_summary, summarize
    from .cycle_tokens import run_totals, store_cycle_costs, store_session_agents, store_usage

    run=Run.objects.select_related('actor','project','change_record').filter(pk=run_id).first()
    if not run or not run.change_record_id:
        return False
    anchor=run.updated
    batch={'passes':{},'cycles':{}}
    usage=[]
    agents=[]
    overview=summarize(run.change_record,run,projection=batch,usage=usage,agent_observations=agents)
    with transaction.atomic():
        session = CodingSession.objects.select_for_update().get(pk=run.coding_session_id) if run.coding_session_id else None
        current=Run.objects.select_for_update().get(pk=run_id)
        if current.updated!=anchor or current.coding_session_id!=run.coding_session_id:
            return False
        changed=store_usage(run, usage)
        changed=store_session_agents(run,agents) or changed
        if session:
            changed=store_cycle_costs(run,session) or changed
        summary=cycle_summary(overview['cycles'],tokens=run_totals(run))
        for model,key in ((ChangeStageIteration,'passes'),(RunCycleIteration,'cycles')):
            rows=model.objects.filter(run_id=run_id,pk__in=batch[key]).only('time_projection')
            pending=[]
            for row in rows:
                value=batch[key][row.pk]
                if row.time_projection!=value:
                    row.time_projection=value
                    pending.append(row)
            if pending:
                model.objects.bulk_update(pending,['time_projection'])
                changed=True
        if changed:
            stamp=timezone.now()
            Run.objects.filter(pk=run_id).update(updated=stamp)
            stages=ChangeStageIteration.objects.filter(run_id=run_id).values('stage_id')
            ChangeStage.objects.filter(pk__in=stages).update(updated_at=stamp)
        if current.cycle_summary!=summary:
            Run.objects.filter(pk=run_id).update(cycle_summary=summary,updated=timezone.now())
            changed=True
        return changed


def sweep():
    global _cursor
    active=list(Run.objects.filter(state__in=('WORKING','FINALIZATION_PENDING','REVIEW_PENDING','ACCEPTED','FINALIZING'))
                .order_by('-updated').values_list('pk',flat=True)[:4])
    outdated=Q(time_projection={}) | (Q(time_projection__basis__schema__isnull=False) & ~Q(time_projection__basis__schema=PROJECTION_SCHEMA))
    newest=list(RunCycleIteration.objects.filter(ended_at__isnull=False).filter(outdated)
                .order_by('-ended_at').values_list('run_id',flat=True)[:4])
    # Le balayage inclut les archives afin de capter un journal natif terminé tard.
    archived=Run.objects.filter(pk__gt=_cursor).filter(
        Exists(ChangeStageIteration.objects.filter(run_id=OuterRef('pk'))))
    scanned=list(archived.order_by('pk').values_list('pk',flat=True)[:3])
    _cursor=scanned[-1] if scanned else 0
    for run_id in dict.fromkeys([*active,*newest,*scanned]):
        try:
            refresh(run_id)
        except Exception as error:
            import logging
            logging.getLogger(__name__).warning('Projection temporelle indisponible',extra={'code':type(error).__name__})


def launch():
    global _next
    if monotonic() < _next or not _guard.acquire(blocking=False):
        return
    _next=monotonic()+4

    def worker():
        try:
            close_old_connections()
            sweep()
        finally:
            close_old_connections()
            _guard.release()

    try:
        Thread(target=worker,name='cab-time-projection',daemon=True).start()
    except RuntimeError:
        _guard.release()
        raise
