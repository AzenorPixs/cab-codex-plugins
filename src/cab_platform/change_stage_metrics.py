"""Chronologie de travail observée par CAB et cumul sous le change."""

from collections import defaultdict
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from .core.models import ChangeStage, ChangeStageIteration, Run, RunCycleIteration


LEGACY_KEYS = (
    'initialization', 'preflight', 'analysis', 'framing', 'specification',
    'implementation', 'verification', 'review', 'archival', 'statistics', 'closure',
)
STAGE_KEYS = LEGACY_KEYS[:5] + ('version-skill',) + LEGACY_KEYS[5:]
PROFILE='publication-12-v1'
PUBLICATION_KEYS=('initialization','analysis','framing','specification','version-skill','implementation','verification','review','archival','statistics','publication','closure')
LABELS={'initialization':'Initialisation et Prévol','analysis':'Analyse','framing':'Cadrage','specification':'Spécification','version-skill':'Versionning','implementation':'Implémentation','verification':'Vérifications','review':'Revue','archival':'Archivage','statistics':'Statistiques','publication':'Publication','closure':'Clôture'}
OLD_LABELS={**LABELS,'initialization':'Initialisation','preflight':'Prévol','version-skill':'Lecture du skill Version'}
STOP_STATES = frozenset({
    'BLOCKED', 'BLOCKING', 'CANCELLED_BEFORE_START', 'CLOSED', 'CLOSURE_INVALID',
})
AUTOMATIC_DESCRIPTIONS = {
    'initialization': 'RUN initialisé par CAB.',
    'preflight': 'Prévol du RUN.',
    'version-skill': 'Lecture du skill Version.',
    'verification': 'Contrôles du RUN.',
    'archival': 'Archivage OpenSpec.',
    'statistics': 'Finalisation des statistiques par CAB.',
    'closure': 'Clôture du RUN.',
}
AGENT_DESCRIPTION_STAGES = frozenset({'analysis','framing','specification','implementation','review'})
TRANSITIONS = frozenset({
    'run-created','run-progress','suspension','review-requested','finalization-started',
    'run-closed','mandate-archive-reconciled','version-skill-acknowledged',
    'publication-started','closure-started','cycle-profile-adopted',
})


def keys_for(run: Run) -> tuple[str, ...]:
    if run.configuration.get('cycle_profile')==PROFILE:return PUBLICATION_KEYS
    return STAGE_KEYS if run.cycle_steps == len(STAGE_KEYS) else LEGACY_KEYS


def number_for(run: Run, key: str) -> int:
    if key=='preflight' and run.configuration.get('cycle_profile')==PROFILE:key='initialization'
    return keys_for(run).index(key) + 1


def labels_for(run):return LABELS if run.configuration.get('cycle_profile')==PROFILE else OLD_LABELS


def stage_names(run):return [labels_for(run).get(key,key) for key in keys_for(run)]


def refresh_total(stage_id):
    from django.db.models import Sum
    stage=ChangeStage.objects.select_for_update().get(pk=stage_id)
    rows=stage.iterations.filter(started_at__isnull=False)
    stage.iteration_count=rows.count()
    stage.duration_seconds=rows.aggregate(value=Sum('duration_seconds'))['value']
    stage.save(update_fields=['iteration_count','duration_seconds','updated_at'])


def finish_iteration(record,at,reason,state='COMPLETED'):
    if record.ended_at is not None:return
    record.ended_at=max(record.started_at,at) if record.started_at else at
    record.end_reason=reason;record.state=state
    record.duration_seconds=Decimal(str((record.ended_at-record.started_at).total_seconds())) if record.started_at else None
    record.save(update_fields=['ended_at','end_reason','state','duration_seconds'])
    refresh_total(record.stage_id)


def finish_cycle(cycle,at,keys):
    cycle.ended_at=at
    cycle.duration_seconds=Decimal(str((at-cycle.started_at).total_seconds()))
    ended=cycle.stage_iterations.filter(parent__isnull=True,started_at__isnull=False,ended_at__isnull=False)
    cycle.complete=set(keys).issubset(ended.values_list('stage__key',flat=True))
    cycle.save(update_fields=['ended_at','duration_seconds','complete'])


@transaction.atomic
def observe(run: Run, at=None) -> None:
    if run.cycle_steps!=12 or not run.change_record_id:return
    run=Run.objects.select_for_update().get(pk=run.pk)
    at=at if at is not None else timezone.now()
    current=ChangeStageIteration.objects.select_related('stage').filter(run=run,parent__isnull=True,asynchronous=False,ended_at__isnull=True).first()
    stopped=bool(run.suspension or run.state in STOP_STATES)
    key=keys_for(run)[run.stage-1] if not stopped and run.stage else None
    if current and current.stage.key==key:return
    if current:finish_iteration(current,at,(run.suspension or run.state) if stopped else 'transition')
    cycle=RunCycleIteration.objects.filter(run=run,ended_at__isnull=True).first()
    modern=run.configuration.get('cycle_profile')==PROFILE
    if cycle and ((key=='initialization' and cycle.visited!=['initialization']) or run.state in STOP_STATES):
        finish_cycle(cycle,at,keys_for(run));cycle=None
    if key is not None:
        if modern and cycle is None:
            number=(RunCycleIteration.objects.filter(run=run).order_by('-number').values_list('number',flat=True).first() or 0)+1
            cycle=RunCycleIteration.objects.create(run=run,number=number,started_at=at)
        if modern and cycle and key in ('archival','statistics','publication','closure') and 'review' not in cycle.visited:
            plan=getattr(run,'finalization_plan',None)
            if plan and plan.policy and plan.policy.get('review_required') is False:
                review,_=ChangeStage.objects.get_or_create(change_id=run.change_record_id,key='review',parent=None)
                number=review.iterations.filter(run=run,started_at__isnull=False).count()+1
                ChangeStageIteration.objects.create(stage=review,run=run,cycle=cycle,state='SKIPPED',
                    started_at=at,ended_at=at,duration_seconds=0,iteration_number=number,asynchronous=True,
                    description='Revue non requise par le parcours.',description_source='cab')
                cycle.visited=[*cycle.visited,'review'];cycle.save(update_fields=['visited'])
                refresh_total(review.pk)
        if cycle and key not in cycle.visited:
            cycle.visited=[*cycle.visited,key];cycle.save(update_fields=['visited'])
        stage,_=ChangeStage.objects.get_or_create(change_id=run.change_record_id,key=key,parent=None)
        count=stage.iterations.filter(run=run,parent__isnull=True,started_at__isnull=False).count()+1
        description=AUTOMATIC_DESCRIPTIONS.get(key,'')
        ChangeStageIteration.objects.create(stage=stage,run=run,cycle=cycle,started_at=at,state='RUNNING',iteration_number=count,description=description,description_source='cab' if description else '')
        refresh_total(stage.pk)


@transaction.atomic
def describe(run: Run, text: str) -> None:
    from .core.commands import require
    from .logging import redact
    require(isinstance(text,str) and 0 < len(text.strip()) <= 2000,
            'change-stage-description-invalid',400)
    require(run.cycle_steps == 12 and run.stage and keys_for(run)[run.stage-1] in AGENT_DESCRIPTION_STAGES,
            'change-stage-description-not-allowed',409)
    current = ChangeStageIteration.objects.filter(run=run,parent__isnull=True,asynchronous=False,ended_at__isnull=True)
    row=current.select_for_update().first()
    require(row is not None,'change-stage-iteration-not-open',409)
    row.description=redact(text.strip())
    row.description_source='agent'
    row.save(update_fields=['description','description_source'])
    refresh_total(row.stage_id)
    Run.objects.filter(pk=run.pk).update(updated=timezone.now())


def covered_seconds(intervals, start, end):
    """Durée de l’union des intervalles bornés par le passage."""
    clipped = sorted((max(left, start), min(right, end)) for left, right in intervals
                     if left < end and right > start and left < right)
    seconds = 0
    previous_end = start
    for left, right in clipped:
        if right > previous_end:
            seconds += (right - max(left, previous_end)).total_seconds()
            previous_end = right
    return seconds


def split_time(start, end, native, operations, *, wait_only=False, work_from=None):
    if start is None or end is None:
        return None, None
    elapsed = max(0, (end - start).total_seconds())
    if not elapsed:
        return 0, 0
    if work_from is not None:
        work = (end - max(start, min(end, work_from))).total_seconds()
        return work, elapsed - work
    if wait_only:
        return 0, elapsed
    if native:
        covered_from, spans, open_turns, uncertain, _ = native
        complete = (covered_from is not None and covered_from <= start
                    and not any(stamp < end for stamp in open_turns)
                    and not any((left is None or left < end) and right > start for left, right in uncertain))
        work = covered_seconds([*spans, *operations], start, end)
        if complete or work:
            return work, max(0, elapsed - work) if complete else None
    work = covered_seconds(operations, start, end)
    return (work or None), None


def _timeline(run):
    from .core.models import Event, Operation
    from .measurement_sources import native_work_time, native_time
    events = list(Event.objects.filter(run=run, kind__in=(
        'review-requested', 'review-decided', 'closure-started', 'finalization-started', 'run-closed'
    )).order_by('pk').values('id', 'kind', 'created'))
    intervals = []
    for receipt in Operation.objects.filter(run=run, dispatched=True).values_list('receipt', flat=True):
        start, end = (native_time(receipt.get(key)) for key in ('started', 'finished'))
        if start and end and start <= end:
            intervals.append((start, end))
    return events, native_work_time(run), intervals


def _restore_stage_passages(run, events, present):
    """Projeter seulement les bornes présentes dans le journal historique."""
    opened = {}
    for event in events:
        kind, at = event['kind'], event['created']
        if kind == 'review-requested':
            opened['review'] = event
        elif kind in ('closure-started', 'finalization-started'):
            opened.setdefault('closure', event)
        elif kind in ('review-decided', 'run-closed'):
            key = 'review' if kind == 'review-decided' else 'closure'
            if key in present:
                continue
            beginning = opened.pop(key, None)
            if beginning or key == 'closure':
                yield key, beginning, event
    for key, beginning in opened.items():
        if key not in present:
            yield key, beginning, None


def _passage(run_id, identity, start, end, *, number=None, state=None, duration=None,
             native=None, intervals=(), wait_only=False, work_from=None, **fields):
    if duration is None and start is not None and end is not None:
        duration = (end - start).total_seconds()
    work, wait = split_time(start, end, native, intervals, wait_only=wait_only, work_from=work_from)
    return dict(id=identity, run_id=run_id, number=number, state=state, started_at=start, ended_at=end,
                duration_seconds=float(duration) if duration is not None else None,
                work_seconds=work, wait_seconds=wait, **fields)


def _stage_total(items, key):
    values = [item[key] for item in items]
    known = [value for value in values if value is not None]
    return sum(known) if known and (key != 'wait_seconds' or len(known) == len(values)) else None


def summarize(change,run=None) -> dict:
    """Détails observés et travail attesté, distinct du temps mural."""
    rows=ChangeStageIteration.objects.filter(stage__change=change).select_related('stage','run').order_by('started_at','pk')
    if run is not None:rows=rows.filter(run=run)
    records = list(rows)
    runs = list(Run.objects.filter(change_record=change).select_related('actor', 'project', 'finalization_plan')) if run is None else [
        Run.objects.select_related('actor', 'project', 'finalization_plan').get(pk=run.pk)
    ]
    grouped=defaultdict(list)
    rows_by_run = defaultdict(list)
    for record in records:
        rows_by_run[record.run_id].append(record)
    review_required = False
    for current in runs:
        events, native, operations = _timeline(current)
        current_rows = rows_by_run[current.pk]
        present = {r.stage.key for r in current_rows if r.parent_id is None}
        plan = getattr(current, 'finalization_plan', None)
        review_required |= bool(not plan or plan.policy.get('review_required', True))
        for record in current_rows:
            key = record.stage.key
            start, end = record.started_at, record.ended_at
            work_from = None
            intervals = list(operations)
            if key == 'closure':
                work_from = next((e['created'] for e in events if e['kind'] == 'finalization-started'
                                  and start and e['created'] >= start and (end is None or e['created'] <= end)), None)
            direct_effect = record.description_source == 'cab' and (record.parent_id or record.asynchronous and key in ('statistics','publication'))
            native_evidence = native if key not in ('closure','statistics','publication','review') and not direct_effect else None
            if direct_effect and start and end:
                if record.parent_id:
                    intervals = [(start, end)]
                    work_from = start
                else:
                    intervals = [(r.started_at, r.ended_at) for r in current_rows
                                 if r.parent_id == record.pk and r.started_at and r.ended_at
                                 and r.description_source == 'cab']
                    if intervals and record.state in ('COMPLETED','FAILED'):
                        native_evidence = (start, (), (), (), ())
            waiting_review = key == 'review' and any(e['kind'] == 'review-requested' and start and e['created'] >= start
                                                    and (end is None or e['created'] <= end) for e in events)
            grouped[key].append(_passage(current.run_id, record.pk, start, end,
                number=record.iteration_number, state=record.state or None, duration=record.duration_seconds,
                native=native_evidence, intervals=intervals, wait_only=waiting_review, work_from=work_from,
                parent_id=record.parent_id, cycle_id=record.cycle_id, reference=record.reference or None,
                description=record.description or None, receipt=record.receipt or None))
        for key, beginning, ending in _restore_stage_passages(current, events, present):
            left = beginning['created'] if beginning else None
            right = ending['created'] if ending else None
            work_from = left if beginning and beginning['kind'] == 'finalization-started' and current.configuration.get('cycle_profile') == PROFILE else None
            grouped[key].append(_passage(current.run_id, 'event-'+str((beginning or ending)['id']), left, right,
                state='COMPLETED' if ending else 'RUNNING', wait_only=key=='review', work_from=work_from))
    for record in rows_by_run[None]:
        grouped[record.stage.key].append(_passage(None, record.pk, record.started_at, record.ended_at,
            number=record.iteration_number, state=record.state or None, duration=record.duration_seconds,
            description=record.description or None, receipt=record.receipt or None))
    definitions=keys_for(run) if run is not None else tuple(dict.fromkeys([*STAGE_KEYS[:-1],'publication','closure']))
    stages=[]
    for key in definitions:
        iterations=sorted(grouped.get(key,[]),key=lambda row: (row['started_at'] or row['ended_at'] or timezone.now(),str(row['id'])))
        children=[]
        for child_key,items in grouped.items():
            if child_key.startswith(key+'.'):
                children.append({'key':child_key,'iterations':items,'iteration_count':sum(i['started_at'] is not None for i in items),
                                 **{field:_stage_total(items,field) for field in ('duration_seconds','work_seconds','wait_seconds')}})
        labels=labels_for(run) if run is not None else OLD_LABELS
        stages.append({'key':key,'label':labels.get(key,key),'iterations':iterations,'children':children,
                       'observed':bool(iterations or children),'not_required':key=='review' and not iterations and not review_required,
                       'iteration_count':len(iterations) if iterations else None,
                       **{field:_stage_total(iterations,field) for field in ('duration_seconds','work_seconds','wait_seconds')}})
    cycles=RunCycleIteration.objects.filter(run=run) if run is not None else RunCycleIteration.objects.filter(run__change_record=change)
    cycle_data=[{'id':r.pk,'run_id':r.run.run_id,'number':r.number,'started_at':r.started_at,'ended_at':r.ended_at,'complete':r.complete,'duration_seconds':float(r.duration_seconds) if r.duration_seconds is not None else None} for r in cycles.select_related('run').order_by('pk')]
    complete=[r['duration_seconds'] for r in cycle_data if r['complete'] and r['duration_seconds'] is not None]
    measured=[r['duration_seconds'] for r in stages if r['duration_seconds'] is not None]
    return {'stages':stages,'cycles':cycle_data,'complete_cycle_duration_seconds':sum(complete) if complete else None,'duration_seconds':sum(measured) if measured else None}
