"""Repère les mesures manquantes sans confondre absence de preuve et zéro."""
from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .core.models import ChangeStageIteration, CycleTokenUsage, Event, Maintenance, Operation, Run, SessionAgent
from .cycle_attribution import elapsed
from .measurement_sources import USAGE_FIELDS


EVENT = 'stage-telemetry-reminder'
ACTIVE = ('WORKING', 'REVIEW_PENDING')
GRACE = timedelta(seconds=10)
EXPIRY = timedelta(minutes=5)
ROLE_LABELS = {'coder':'codeur', 'orchestrator':'orchestrateur'}


def _missing(diagnosis):
    if diagnosis.get('allocated_seconds',0) <= 0:
        return []
    return [label for key,label in (('model','modèle observé'),('tokens','compteurs de tokens natifs'))
            if diagnosis.get(key) != 'observed']


def diagnose(run, projections, sources, *, now=None):
    """Appelé sous le verrou du RUN, après les écritures de télémétrie."""
    from .cycle_tokens import token_totals
    if not projections:
        return False
    now = now or timezone.now()
    traces = {role:trace for role,trace,_ in sources}
    roles = ('coder','orchestrator') if run.mode == 'piloted' else ('coder',)
    agents = set(SessionAgent.objects.filter(stage_passage__run=run)
                 .values_list('stage_passage_id','role'))
    usage = token_totals(CycleTokenUsage.objects.filter(run=run),'stage_passage_id')
    prior = set(Event.objects.filter(run=run,kind=EVENT).values_list('data__passage','data__role'))
    queued = []
    rows = ChangeStageIteration.objects.filter(run=run,parent__isnull=True,pk__in=projections).select_related('stage')
    for row in rows:
        projection = projections[row.pk]
        diagnostics = projection['telemetry'] = {}
        for role in roles:
            counters = usage.get((row.pk,),{}).get(role,{})
            trace = traces.get(role)
            start, end = row.started_at, row.ended_at
            spans = trace[1] if trace else ()
            if trace and trace[2]:
                activity = [stamp for stamp,_,reply in trace[4] if reply]
                spans = (*spans,*((left,max(activity)) for left in trace[2] if activity and max(activity)>left))
            attested = bool(start and end and start<end and row.state not in ('SKIPPED','NOT_REQUESTED'))
            observed = elapsed(spans,start,end) / 1_000_000 if attested else 0
            if row.asynchronous:
                observed = min(observed,max(0,(projection.get('agent_seconds') or 0)
                                              -(projection.get('agent_assigned_seconds') or 0)))
            entry = {
                'native': 'available' if trace else 'unavailable',
                'attested_seconds': observed,
                'allocated_seconds': max(observed,projection.get('agent_seconds') or 0)
                                     if role == 'coder' and (run.mode == 'direct' or not traces) else observed,
                'model': 'observed' if (row.pk,role) in agents else 'missing',
                'tokens': 'observed' if any(int(n)>0 for n in counters.values() if n is not None)
                          else 'zero' if any(n is not None for n in counters.values()) else 'missing',
                'absent_counters': [field for field in USAGE_FIELDS if counters.get(field) is None],
            }
            diagnostics[role] = entry
            if not attested or not _missing(entry) or now<end+GRACE or (row.pk,role) in prior:
                continue
            queued.append(Event(project_id=run.project_id,run=run,kind=EVENT,data={
                'passage':row.pk,'stage_key':row.stage.key,'role':role,'state':'PENDING',
            }))
    if queued:
        Event.objects.bulk_create(queued)
    return bool(queued)


def _has_tokens(run, passage):
    positive = Q()
    for field in USAGE_FIELDS:
        positive |= Q(**{field+'__gt':0})
    return CycleTokenUsage.objects.filter(positive,run=run,stage_passage=passage).exists()


def require_implementation_tokens(run, passage, now):
    """La validation ne peut pas précéder une mesure native positive."""
    from copy import copy
    from .change_stage_metrics import ending_projection
    if _has_tokens(run,passage):
        return True
    window = copy(passage)
    window.ended_at = now
    if (ending_projection(window).get('agent_seconds') or 0) <= 0:
        return True
    events = Event.objects.filter(run=run,kind=EVENT,data__passage=passage.pk,data__role='coder')
    if not events.exists():
        Event.objects.create(project_id=run.project_id,run=run,kind=EVENT,data={
            'passage':passage.pk,'stage_key':'implementation','role':'coder',
            'state':'PENDING','validation_gate':True,
        })
    return False


def dispatch(now):
    """Remet une relance corrélée à une session disponible, sans rejeu incertain."""
    from .change_stage_metrics import keys_for, labels_for
    from .cycle_tokens import native_sources
    from .stage_reminders import _dispatch
    if Maintenance.objects.filter(state__in=('PREPARED','INSTALLING')).exists():
        return
    queue = Event.objects.filter(kind=EVENT,data__state='PENDING').filter(
        Q(data__next_at__isnull=True) | Q(data__next_at__lte=now.isoformat())
    ).select_related('run__actor','run__project').order_by('pk')
    for record in queue[:10]:
        run = record.run
        data = record.data
        role = data['role']
        passage = ChangeStageIteration.objects.filter(run=run,pk=data['passage']).first()
        projection = passage.time_projection if passage else {}
        missing = _missing(projection.get('telemetry',{}).get(role,{}))
        if passage and data.get('validation_gate') and not _has_tokens(run,passage):
            missing = ['compteurs de tokens natifs']
        if not missing:
            Event.objects.filter(pk=record.pk,data__state='PENDING').update(data={**data,'state':'RESOLVED'})
            continue
        label = labels_for(run).get(data['stage_key'],data['stage_key'])
        message = (f'CAB — {run.run_id}, étape {label}, {ROLE_LABELS[role]}. '
                   f'Temps agent alloué. Télémétrie à vérifier : {", ".join(missing)}. '
                   'Vérifier la collecte native de ce passage et signaler les données non fournies. '
                   'Conserver les compteurs observés et leurs bornes.')
        active = run.state in ACTIVE and not run.suspension and now-record.created<=EXPIRY
        active = active and bool(run.stage) and keys_for(run)[run.stage-1] not in ('publication','statistics','closure','vacant')
        busy = Operation.objects.filter(run=run,state__in=('INTENT','WAITING','RUNNING')).exists()
        if active and busy:
            continue
        with transaction.atomic():
            claimed = Event.objects.filter(pk=record.pk,data__state='PENDING').update(
                data={**data,'state':'INTENT','message':message})
            if not claimed:
                continue
        actor, thread = next(((actor,thread) for name,actor,thread in native_sources(run)
                              if name == role), (None,None))
        receipt = _dispatch(run,actor,thread,message) if active else {'state':'VISIBLE'}
        if receipt.get('reason') in ('reminder-native-thread-busy','reminder-native-idle-unconfirmed'):
            receipt = {**receipt, 'state':'PENDING','next_at':(now+GRACE).isoformat()}
        Event.objects.filter(pk=record.pk).update(data={**data,'message':message,**receipt})
        Run.objects.filter(pk=run.pk).update(updated=timezone.now())
