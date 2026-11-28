"""Chronologie de travail observée par CAB et cumul sous le change."""

from collections import defaultdict
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from .core.models import ChangeStage, ChangeStageIteration, Run, RunCycleIteration
from .cycle_attribution import FIELDS, WAIT_DETAILS, PROJECTION_SCHEMA, action_accounting, merged, microseconds, missing_intervals, native_complete, partition


LEGACY_KEYS = (
    'initialization', 'preflight', 'analysis', 'framing', 'specification',
    'implementation', 'verification', 'review', 'archival', 'statistics', 'closure',
)
STAGE_KEYS = LEGACY_KEYS[:5] + ('version-skill',) + LEGACY_KEYS[5:]
PROFILE='publication-12-v1'
PUBLICATION_KEYS=('initialization','analysis','framing','specification','version-skill','implementation','verification','review','archival','statistics','publication','closure')
LABELS={'initialization':'Initialisation et Prévol','analysis':'Analyse','framing':'Cadrage','specification':'Spécification','version-skill':'Versionning','implementation':'Implémentation','verification':'Vérifications','review':'Revue','archival':'Archivage','statistics':'Statistiques','publication':'Publication','closure':'Clôture'}
LABELS['vacant']='Vacante'
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


def statistics_at_closure(run: Run) -> bool:
    return run.configuration.get('statistics_at_closure') is True


def keys_for(run: Run) -> tuple[str, ...]:
    if statistics_at_closure(run):
        return (*PUBLICATION_KEYS[:9], 'vacant', *PUBLICATION_KEYS[10:])
    if run.configuration.get('cycle_profile')==PROFILE:return PUBLICATION_KEYS
    return STAGE_KEYS if run.cycle_steps == len(STAGE_KEYS) else LEGACY_KEYS


def number_for(run: Run, key: str) -> int:
    if key=='preflight' and run.configuration.get('cycle_profile')==PROFILE:key='initialization'
    if key=='statistics' and statistics_at_closure(run):key='closure'
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
    if record.started_at is None:
        record.started_at=at
    record.ended_at=max(record.started_at,at)
    record.end_reason=reason;record.state=state
    record.duration_seconds=Decimal(str((record.ended_at-record.started_at).total_seconds())) if record.started_at else None
    ending = ending_projection(record)
    if 'token_tracking' in record.time_projection:
        ending['token_tracking'] = record.time_projection['token_tracking']
    record.time_projection=ending
    record.save(update_fields=['started_at','ended_at','end_reason','state','duration_seconds','time_projection'])
    refresh_total(record.stage_id)


def finish_cycle(cycle,at,keys):
    cycle.ended_at=at
    cycle.duration_seconds=Decimal(str((at-cycle.started_at).total_seconds()))
    ended=cycle.stage_iterations.filter(parent__isnull=True,started_at__isnull=False,ended_at__isnull=False)
    cycle.complete=set(keys).issubset(ended.values_list('stage__key',flat=True))
    cycle.save(update_fields=['ended_at','duration_seconds','complete'])
    projections={'passes':{},'cycles':{}}
    summarize(cycle.run.change_record,cycle.run,projection=projections,local_only=True)
    cycle.time_projection=projections['cycles'][cycle.pk]
    cycle.save(update_fields=['time_projection'])
    save_cycle_summary(cycle.run)


def cycle_summary(cycles: list[dict], *, tokens=None) -> dict:
    """Cumuler les cycles mesurés, indépendamment de leur complétude métier."""
    if not cycles:
        return {}
    measured=[item for item in cycles if item['duration_seconds'] is not None]
    last=max(cycles,key=lambda item:item['number'])
    result={'iteration_count':len(cycles),'measured_count':len(measured),
            'duration_complete':len(measured)==len(cycles),
            'last_started_at':last['started_at'].isoformat() if last['started_at'] else None,
            'last_ended_at':last['ended_at'].isoformat() if last['ended_at'] else None,
            'last_duration_seconds':last['duration_seconds']}
    if tokens:
        result['tokens']=tokens
    for field in ('duration_seconds',*FIELDS):
        values=[Decimal(str(item[field])) for item in measured if item.get(field) is not None]
        result[field]=float(sum(values)) if values else None
        if field!='duration_seconds':
            result[field+'_complete']=bool(measured) and len(values)==len(cycles)
    return result


def save_cycle_summary(run: Run) -> None:
    from .cycle_tokens import run_totals

    rows=[{'number':item.number,'started_at':item.started_at,'ended_at':item.ended_at,
           'duration_seconds':float(item.duration_seconds) if item.duration_seconds is not None else None,
           **{field:item.time_projection.get(field) for field in FIELDS}}
          for item in RunCycleIteration.objects.filter(run=run)]
    Run.objects.filter(pk=run.pk).update(cycle_summary=cycle_summary(rows,tokens=run_totals(run)),updated=timezone.now())


@transaction.atomic
def observe(run: Run, at=None) -> None:
    if run.cycle_steps!=12 or not run.change_record_id:return
    run=Run.objects.select_for_update().get(pk=run.pk)
    from .stage_protocol import enabled
    governed=enabled(run)
    if governed and not run.configuration['stage_protocol'].get('current'):
        return
    at=at if at is not None else timezone.now()
    current=ChangeStageIteration.objects.select_related('stage').filter(run=run,parent__isnull=True,asynchronous=False,ended_at__isnull=True).first()
    stopped=bool(run.suspension or run.state in STOP_STATES)
    key=keys_for(run)[run.stage-1] if not stopped and run.stage else None
    if governed and key in ('statistics','publication'):
        key=None  # Le passage est ouvert par le travail CAB correspondant.
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
        save_cycle_summary(run)


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


def _timeline(run, *, local_only=False, usage=None, agent_observations=None):
    from .core.models import Event, Operation
    from .measurement_sources import native_work_time, native_time
    from .cycle_tokens import native_sources
    events = list(Event.objects.filter(run=run, kind__in=(
        'review-requested', 'review-decided', 'closure-started', 'finalization-started', 'run-closed'
    )).order_by('pk').values('id', 'kind', 'created'))
    intervals = []
    for receipt in Operation.objects.filter(run=run, dispatched=True).values_list('receipt', flat=True):
        start, end = (native_time(receipt.get(key)) for key in ('started', 'finished'))
        if start and end and start <= end:
            intervals.append((start, end))
    collect = usage is not None and run.cycle_steps == 12 and bool(run.coding_session_id)
    traces = []
    for role, actor, thread in native_sources(run):
        trace = None
        if not local_only or actor.agent in ('codex','codex-cli'):
            identity = {'actor': actor, 'thread': thread} if role == 'orchestrator' else {}
            if collect and agent_observations is not None:
                identity['models']=True
            trace = native_work_time(run, tokens=collect, **identity)
        if trace is not None and collect:
            trace, occurrences, *models = trace
            if occurrences:
                usage.append((role, actor.pk, thread, occurrences))
            if agent_observations is not None and trace:
                agent_observations.append((role,trace,models[0] if models else ()))
        traces.append(trace)
    return events, traces[0], intervals, traces


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
             native=None, intervals=(), wait_only=False, work_from=None, attribution=None, **fields):
    if duration is None and start is not None and end is not None:
        duration = (end - start).total_seconds()
    work, wait = split_time(start, end, native, intervals, wait_only=wait_only, work_from=work_from)
    return dict(id=identity, run_id=run_id, number=number, state=state, started_at=start, ended_at=end,
                duration_seconds=float(duration) if duration is not None else None,
                work_seconds=work, wait_seconds=wait, **(attribution or partition(start,end)), **fields)


def _stage_total(items, key):
    values = [item[key] for item in items]
    known = [value for value in values if value is not None]
    return sum(known) if known and (key != 'wait_seconds' or len(known) == len(values)) else None


def _responsibility(record, rows, traces, operations, work_from, waiting_review, observed_end=None):
    start,end=record.started_at,record.ended_at or observed_end
    if start is None or end is None:
        return [],[],[]
    whole=[(start,end)]
    if record.state=='SKIPPED':
        return [],[],whole
    if record.parent_id:
        if record.receipt.get('time_role')=='wait':
            return [],[],whole
        cab=whole if record.description_source=='cab' else []
        agent=whole if record.description_source=='agent' else []
        return cab,agent,whole if cab or agent else []
    children=[child for child in rows if child.parent_id==record.pk and child.started_at and child.ended_at
              and child.started_at < child.ended_at and child.state!='SKIPPED']
    waiting=[(child.started_at,child.ended_at) for child in children if child.receipt.get('time_role')=='wait']
    cab=[(child.started_at,child.ended_at) for child in children
         if child.description_source=='cab' and child.receipt.get('time_role')!='wait']
    agent=[(child.started_at,child.ended_at) for child in children if child.description_source=='agent']
    autonomous=record.asynchronous and record.stage.key in ('statistics','publication')
    if autonomous:
        return cab,agent,whole if cab and record.state in ('COMPLETED','FAILED') else waiting
    cab.extend(operations)
    if work_from is not None:
        cab.append((max(start,work_from),end))
        return cab,agent,whole
    agent.extend(span for trace in traces if trace for span in trace[1])
    known=whole if waiting_review or native_complete(traces,start,end) else waiting
    return cab,agent,known


def _cycle_attribution(cycle,evidence,traces):
    start,end=cycle.started_at,cycle.ended_at
    cab=[span for item in evidence for span in item[2]]
    agent=[span for item in evidence for span in item[3]]
    covered=[span for item in evidence for span in item[4]]
    if start and end and native_complete(traces,start,end):
        intervals=[(item[0],item[1]) for item in evidence]
        native=[span for trace in traces if trace for span in trace[1]]
        for left,right in missing_intervals(intervals,start,end):
            agent.extend(merged(native,left,right))
            covered.append((left,right))
    values=partition(start,end,cab,agent,covered,display=True)
    if values['attribution_complete']:
        values['display_duration_seconds']=((microseconds(end-start)+50000)//100000)/10
    return values


def _projection(row, values, target, kind, evidence, witnesses):
    if target is None:
        stored=row.time_projection
        return stored if stored.get('basis',{}).get('schema')==PROJECTION_SCHEMA else partition(None,None)
    from .core.commands import digest
    record = {**values,'basis':{'schema':PROJECTION_SCHEMA,'stage_iteration_ids':sorted(witnesses),
                                'interval_digest':digest(repr(evidence))}}
    target[kind][row.pk] = record
    return record


def _passage_projection(record, rows, traces, operations, work_from, waiting_review, observed_end, target):
    cab,agent,known=_responsibility(record,rows,traces,operations,work_from,waiting_review,observed_end)
    values=partition(record.started_at,observed_end,cab,agent,known)
    if not record.ended_at and observed_end:
        values.update(attribution_complete=False,measured_until=observed_end.isoformat())
    witnesses=[record.pk,*[row.pk for row in rows if row.parent_id==record.pk]]
    result=_projection(record,values,target,'passes',
                       [record.reference,record.started_at,observed_end,sorted(cab),sorted(agent),sorted(known)],witnesses)
    return result,cab,agent,known


def ending_projection(record):
    """Publier les valeurs et la terminaison dans la même écriture PostgreSQL."""
    rows=[]
    traces=[]
    operations=[]
    work_from=None
    waiting_review=False
    if not record.parent_id and record.run_id:
        rows=list(ChangeStageIteration.objects.filter(parent_id=record.pk).select_related('stage'))
        if not record.asynchronous:
            events,_,operations,traces=_timeline(record.run,local_only=True)
            work_from,waiting_review=_special_passage(record,events)
    result,_,_,_=_passage_projection(record,rows,traces,operations,work_from,waiting_review,
                                    record.ended_at,{'passes':{}})
    return result


def _special_passage(record, events):
    start,end=record.started_at,record.ended_at
    if not start:
        return None,False
    key=record.stage.key
    active_events=[event for event in events if event['created']>=start and (end is None or event['created']<=end)]
    work_from=next((event['created'] for event in active_events if event['kind']=='finalization-started'),None) if key=='closure' else None
    waiting_review=key=='review' and any(event['kind']=='review-requested' for event in active_events)
    return work_from,waiting_review


def _observed_end(record, rows, traces, operations):
    if record.ended_at or record.started_at is None or record.parent_id:
        return record.ended_at
    ends = [row.ended_at for row in rows if row.parent_id==record.pk and row.ended_at]
    if record.stage.key not in ('statistics','publication'):
        ends.extend(right for _,right in operations if right >= record.started_at)
        ends.extend(right for trace in traces if trace for _,right in trace[1] if right >= record.started_at)
    return max(ends,default=None)


HOST_UPDATE_ACTIONS=frozenset(('closure.action-installation','closure.action-availability'))


def visible_receipt(receipt):
    mandates=receipt.get('mandates')
    if isinstance(mandates,list):
        receipt={**receipt,'mandates':[name for name in mandates if isinstance(name,str) and name.casefold()!='cabu']}
    if isinstance(receipt.get('note'),str):
        receipt={**receipt,'note':visible_description(receipt['note'])}
    return receipt or None


def visible_description(description):
    """Les notes historiques restent brutes en base, séparées du détail d’étape."""
    import re
    sentences=re.split(r'(?<=[.!?])\s+|\n+',description or '')
    return ' '.join(sentence for sentence in sentences
                    if sentence and not re.search(r'\bcabu\b|\bcab\s+update(?:-status)?\b|par convention',
                                                 sentence,re.IGNORECASE)) or None


def summarize(change,run=None,*, projection=None,local_only=False,usage=None,agent_observations=None) -> dict:
    """Détails observés et travail attesté, distinct du temps mural."""
    from .stage_telemetry import tracking_view
    rows=ChangeStageIteration.objects.filter(stage__change=change).select_related('stage','run').order_by('started_at','pk')
    if run is not None:rows=rows.filter(run=run)
    records = list(rows.exclude(stage__key__in=HOST_UPDATE_ACTIONS))
    runs = list(Run.objects.filter(change_record=change).select_related('actor', 'project', 'finalization_plan')) if run is None else [
        Run.objects.select_related('actor', 'project', 'finalization_plan').get(pk=run.pk)
    ]
    grouped=defaultdict(list)
    rows_by_run = defaultdict(list)
    for record in records:
        rows_by_run[record.run_id].append(record)
    review_required = False
    cycle_evidence=defaultdict(list)
    run_traces={}
    for current in runs:
        events, native, operations, traces = _timeline(current,local_only=local_only,usage=usage,agent_observations=agent_observations)
        run_traces[current.pk]=traces
        current_rows = rows_by_run[current.pk]
        present = {r.stage.key for r in current_rows if r.parent_id is None}
        plan = getattr(current, 'finalization_plan', None)
        review_required |= bool(not plan or plan.policy.get('review_required', True))
        for record in current_rows:
            key = record.stage.key
            start, end = record.started_at, record.ended_at
            work_from,waiting_review=_special_passage(record,events)
            intervals=list(operations)
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
            observed_end=_observed_end(record,current_rows,traces,operations)
            attribution,cab_intervals,agent_intervals,known=_passage_projection(
                record,current_rows,traces,intervals,work_from,waiting_review,observed_end,projection)
            if record.cycle_id and record.parent_id is None and start and end:
                cycle_evidence[record.cycle_id].append((start,end,merged(cab_intervals,start,end),
                                                       merged(agent_intervals,start,end),known,record.pk))
            grouped[key].append(_passage(current.run_id, record.pk, start, end,
                number=record.iteration_number, state=record.state or None, duration=record.duration_seconds,
                native=native_evidence, intervals=intervals, wait_only=waiting_review, work_from=work_from, attribution=attribution,
                parent_id=record.parent_id, cycle_id=record.cycle_id, reference=record.reference or None,
                description=visible_description(record.description), source=record.description_source or None,
                token_tracking=tracking_view(record, attribution),
                receipt=visible_receipt(record.receipt)))
        for key, beginning, ending in _restore_stage_passages(current, events, present):
            left = beginning['created'] if beginning else None
            right = ending['created'] if ending else None
            work_from = left if beginning and beginning['kind'] == 'finalization-started' and current.configuration.get('cycle_profile') == PROFILE else None
            measured=[(left,right)] if left and right and (work_from or key=='review') else []
            grouped[key].append(_passage(current.run_id, 'event-'+str((beginning or ending)['id']), left, right,
                state='COMPLETED' if ending else 'RUNNING', wait_only=key=='review', work_from=work_from,
                attribution=partition(left,right,measured if work_from else [],covered=measured)))
    for record in rows_by_run[None]:
        grouped[record.stage.key].append(_passage(None, record.pk, record.started_at, record.ended_at,
            number=record.iteration_number, state=record.state or None, duration=record.duration_seconds,
            description=visible_description(record.description), receipt=visible_receipt(record.receipt)))
    definitions=keys_for(run) if run is not None else tuple(dict.fromkeys([*STAGE_KEYS[:-1],'publication','closure']))
    stages=[]
    for key in definitions:
        iterations=sorted(grouped.get(key,[]),key=lambda row: (row['started_at'] or row['ended_at'] or timezone.now(),str(row['id'])))
        children=[]
        for child_key,items in grouped.items():
            if child_key.startswith(key+'.'):
                children.append({'key':child_key,'iterations':items,'iteration_count':sum(i['started_at'] is not None for i in items),
                                 **{field:_stage_total(items,field) for field in ('duration_seconds','work_seconds','wait_seconds',*FIELDS,*WAIT_DETAILS)}})
        labels=labels_for(run) if run is not None else OLD_LABELS
        if run is not None:
            actions_by_passage=defaultdict(list)
            for child in children:
                for action in child['iterations']:
                    actions_by_passage[action['parent_id']].append(action)
            accounting=dict(action_accounting(iterations,actions_by_passage))
            for passage in iterations:
                passage['action_accounting']=accounting.get(passage['id'])
        stages.append({'key':key,'label':labels.get(key,key),'iterations':iterations,'children':children,
                       'observed':bool(iterations or children),'not_required':key=='review' and not iterations and not review_required,
                       'iteration_count':len(iterations) if iterations else None,
                       'attribution_complete':bool(iterations) and all(i['attribution_complete'] for i in iterations),
                       **{field:_stage_total(iterations,field) for field in ('duration_seconds','work_seconds','wait_seconds',*FIELDS,*WAIT_DETAILS)}})
    cycles=RunCycleIteration.objects.filter(run=run) if run is not None else RunCycleIteration.objects.filter(run__change_record=change)
    cycle_data=[]
    for item in cycles.select_related('run').order_by('pk'):
        evidence=cycle_evidence[item.pk]
        totals=_cycle_attribution(item,evidence,run_traces.get(item.run_id,[]))
        values=_projection(item,totals,projection,'cycles',[item.started_at,item.ended_at,evidence],[row[5] for row in evidence])
        cycle_data.append({'id':item.pk,'run_id':item.run.run_id,'number':item.number,
                           'started_at':item.started_at,'ended_at':item.ended_at,'complete':item.complete,
                           'duration_seconds':float(item.duration_seconds) if item.duration_seconds is not None else None,**values})
    complete=[r['duration_seconds'] for r in cycle_data if r['complete'] and r['duration_seconds'] is not None]
    measured=[r['duration_seconds'] for r in stages if r['duration_seconds'] is not None]
    result = {'stages':stages,'cycles':cycle_data,'complete_cycle_duration_seconds':sum(complete) if complete else None,'duration_seconds':sum(measured) if measured else None}
    if projection is None:
        from .cycle_tokens import cycle_cost_summary, overview
        by_stage, total, session = overview(change, run, (item for items in grouped.values() for item in items), cycle_data)
        for stage in stages:
            stage['tokens'] = by_stage.get((stage['key'],), {})
        result.update(tokens=total, session_tokens=session, piloted=any(item.mode == 'piloted' for item in runs))
        if run is not None:
            result['cycle_cost_summary'] = cycle_cost_summary(cycle_data)
    return result
