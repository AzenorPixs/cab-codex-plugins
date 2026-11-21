"""Chronologie de travail observée par CAB et cumul sous le change."""

from collections import defaultdict

from django.db import transaction
from django.utils import timezone

from .core.models import ChangeStage, ChangeStageIteration, Run


LEGACY_KEYS = (
    'initialization', 'preflight', 'analysis', 'framing', 'specification',
    'implementation', 'verification', 'review', 'archival', 'statistics', 'closure',
)
STAGE_KEYS = LEGACY_KEYS[:5] + ('version-skill',) + LEGACY_KEYS[5:]
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
})


def keys_for(run: Run) -> tuple[str, ...]:
    return STAGE_KEYS if run.cycle_steps == len(STAGE_KEYS) else LEGACY_KEYS


def number_for(run: Run, key: str) -> int:
    return keys_for(run).index(key) + 1


@transaction.atomic
def observe(run: Run, at=None) -> None:
    """Met à jour les intervalles à partir de l'état persistant du RUN."""
    if run.cycle_steps != len(STAGE_KEYS) or not run.change_record_id:
        return
    run = Run.objects.select_for_update().get(pk=run.pk)
    at = at if at is not None else timezone.now()
    current = (
        ChangeStageIteration.objects.select_related('stage')
        .filter(run=run, ended_at__isnull=True).first()
    )
    stopped = bool(run.suspension or run.state in STOP_STATES)
    key = keys_for(run)[run.stage - 1] if not stopped and run.stage else None
    if current and current.stage.key == key:
        return
    if current:
        current.ended_at = max(current.started_at, at)
        current.end_reason = (run.suspension or run.state) if stopped else 'transition'
        current.save(update_fields=['ended_at', 'end_reason'])
    if key is not None:
        stage, _ = ChangeStage.objects.get_or_create(change_id=run.change_record_id, key=key)
        description = AUTOMATIC_DESCRIPTIONS.get(key, '')
        ChangeStageIteration.objects.create(
            stage=stage, run=run, started_at=at, description=description,
            description_source='cab' if description else '',
        )


def describe(run: Run, text: str) -> None:
    from .core.commands import require
    from .logging import redact
    require(isinstance(text,str) and 0 < len(text.strip()) <= 2000,
            'change-stage-description-invalid',400)
    require(run.cycle_steps == 12 and run.stage and keys_for(run)[run.stage-1] in AGENT_DESCRIPTION_STAGES,
            'change-stage-description-not-allowed',409)
    current = ChangeStageIteration.objects.filter(run=run,ended_at__isnull=True)
    require(current.update(description=redact(text.strip()),description_source='agent') == 1,
            'change-stage-iteration-not-open',409)


def summarize(change) -> dict:
    """Additionne les intervalles terminés et expose les intervalles ouverts."""
    grouped = defaultdict(list)
    records = (
        ChangeStageIteration.objects.filter(stage__change=change)
        .select_related('stage', 'run')
    )
    for record in records:
        elapsed = (record.ended_at - record.started_at).total_seconds() if record.ended_at else None
        grouped[record.stage.key].append({
            'id': record.pk,
            'run_id': record.run.run_id if record.run else None,
            'started_at': record.started_at,
            'ended_at': record.ended_at,
            'duration_seconds': elapsed,
            'end_reason': record.end_reason or None,
            'description': record.description or None,
            'description_source': record.description_source or None,
        })
    stages = []
    for key in STAGE_KEYS:
        iterations = grouped.get(key, [])
        observed = [i['duration_seconds'] for i in iterations if i['duration_seconds'] is not None]
        stages.append({
            'key': key, 'iteration_count': len(iterations), 'iterations': iterations,
            'duration_seconds': sum(observed) if observed else None,
        })
    measured = [stage['duration_seconds'] for stage in stages if stage['duration_seconds'] is not None]
    return {'stages': stages, 'duration_seconds': sum(measured) if measured else None}
