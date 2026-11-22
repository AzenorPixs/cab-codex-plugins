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
    from django.db.models import Sum
    cycle.ended_at=at
    cycle.duration_seconds=Decimal(str((at-cycle.started_at).total_seconds()))
    cycle.complete=set(keys).issubset(cycle.visited)
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


def summarize(change,run=None) -> dict:
    """Détails observés, sans fabriquer une date ou une durée absente."""
    rows=ChangeStageIteration.objects.filter(stage__change=change).select_related('stage','run').order_by('started_at','pk')
    if run is not None:rows=rows.filter(run=run)
    grouped=defaultdict(list)
    for record in rows:
        duration=record.duration_seconds
        if duration is None and record.started_at and record.ended_at:duration=Decimal(str((record.ended_at-record.started_at).total_seconds()))
        grouped[record.stage.key].append({'id':record.pk,'run_id':record.run.run_id if record.run else None,'parent_id':record.parent_id,'cycle_id':record.cycle_id,'number':record.iteration_number,'reference':record.reference or None,'state':record.state or None,'started_at':record.started_at,'ended_at':record.ended_at,'duration_seconds':float(duration) if duration is not None else None,'description':record.description or None,'receipt':record.receipt or None})
    definitions=keys_for(run) if run is not None else tuple(dict.fromkeys([*STAGE_KEYS[:-1],'publication','closure']))
    stages=[]
    for key in definitions:
        iterations=grouped.get(key,[])
        children=[]
        for child_key,items in grouped.items():
            if child_key.startswith(key+'.'):
                measured=[i['duration_seconds'] for i in items if i['duration_seconds'] is not None]
                children.append({'key':child_key,'iterations':items,'iteration_count':sum(i['started_at'] is not None for i in items),'duration_seconds':sum(measured) if measured else None})
        measured=[i['duration_seconds'] for i in iterations if i['duration_seconds'] is not None]
        labels=labels_for(run) if run is not None else OLD_LABELS
        stages.append({'key':key,'label':labels.get(key,key),'iterations':iterations,'children':children,'observed':bool(iterations or children),'iteration_count':len(iterations) if iterations else None,'duration_seconds':sum(measured) if measured else None})
    cycles=RunCycleIteration.objects.filter(run=run) if run is not None else RunCycleIteration.objects.filter(run__change_record=change)
    cycle_data=[{'id':r.pk,'run_id':r.run.run_id,'number':r.number,'started_at':r.started_at,'ended_at':r.ended_at,'complete':r.complete,'duration_seconds':float(r.duration_seconds) if r.duration_seconds is not None else None} for r in cycles.select_related('run').order_by('pk')]
    complete=[r['duration_seconds'] for r in cycle_data if r['complete'] and r['duration_seconds'] is not None]
    measured=[r['duration_seconds'] for r in stages if r['duration_seconds'] is not None]
    return {'stages':stages,'cycles':cycle_data,'complete_cycle_duration_seconds':sum(complete) if complete else None,'duration_seconds':sum(measured) if measured else None}
