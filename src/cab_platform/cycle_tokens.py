"""Rattachement des mesures natives horodatées aux fenêtres du cycle."""
from collections import defaultdict
from hashlib import sha256
import json

from django.db.models import Q, Sum

from .core.models import Actor, ChangeStageIteration, CycleTokenUsage
from .measurement_sources import USAGE_FIELDS


def native_sources(run):
    sources = [('coder', run.actor, run.session_id)]
    if run.mode == 'piloted':
        thread = run.configuration.get('reminder_orchestrator_thread')
        actor = Actor.objects.filter(pk=run.mandate.get('orchestrator_id')).first() if thread else None
        if actor and (actor.pk, thread) != (run.actor_id, run.session_id):
            sources.append(('orchestrator', actor, thread))
    return sources


def _contains(row, stamp):
    return row.started_at is not None and row.started_at <= stamp and (
        row.ended_at is None or stamp < row.ended_at)


def store_usage(run, sources):
    """Appel sous le verrou du RUN, avec insertion idempotente par événement."""
    if not sources:
        return False
    passages = ChangeStageIteration.objects.filter(
        run__project_id=run.project_id, run__cycle_steps=12, cycle__isnull=False,
        parent__isnull=True, started_at__isnull=False,
    ).exclude(state__in=('SKIPPED','NOT_REQUESTED'))
    children = defaultdict(list)
    for row in ChangeStageIteration.objects.filter(run=run, parent__isnull=False).exclude(
        state__in=('SKIPPED','NOT_REQUESTED'),
    ):
        children[row.parent_id].append(row)
    changed = False
    for role, actor_id, thread, usage in sources:
        own = Q(run__actor_id=actor_id, run__session_id=thread)
        parent = Q(run__mode='piloted', run__mandate__orchestrator_id=actor_id,
                   run__configuration__reminder_orchestrator_thread=thread)
        windows = list(passages.filter(own | parent).only('run','asynchronous','started_at','ended_at'))
        if not any(row.run_id == run.pk for row in windows):
            continue
        pending = {}
        for stamp, source_key, counts in usage:
            matches = [row for row in windows if _contains(row, stamp)]
            primary = [row for row in matches if not row.asynchronous]
            candidates = primary or matches
            if len(candidates) != 1 or candidates[0].run_id != run.pk:
                continue
            stage = candidates[0]
            actions = [row for row in children[stage.pk] if _contains(row, stamp)]
            key = sha256(json.dumps([actor_id, thread, source_key]).encode()).hexdigest()
            pending[key] = CycleTokenUsage(
                project_id=run.project_id, change_id=run.change_record_id,
                session_id=run.coding_session_id, run=run, stage_passage=stage,
                action=actions[0] if len(actions) == 1 else None, native_key=key,
                observed_at=stamp, role=role, **dict(zip(USAGE_FIELDS, counts)),
            )
        existing = CycleTokenUsage.objects.filter(project_id=run.project_id, native_key__in=pending)
        updates = []
        for current in existing:
            candidate = pending.pop(current.native_key)
            if current.run_id != run.pk:
                continue
            fields = ('action_id', *USAGE_FIELDS)
            if any(getattr(current, name) != getattr(candidate, name) for name in fields):
                for name in fields:
                    setattr(current, name, getattr(candidate, name))
                updates.append(current)
        if updates:
            CycleTokenUsage.objects.bulk_update(updates, ['action', *USAGE_FIELDS])
        if pending:
            CycleTokenUsage.objects.bulk_create(pending.values(), ignore_conflicts=True)
        changed |= bool(updates or pending)
    return changed


def token_totals(query, *dimensions):
    """Addition exacte en PostgreSQL, transport décimal sans perte en JavaScript."""
    grouped = defaultdict(dict)
    sums = {name: Sum(name) for name in USAGE_FIELDS}
    for row in query.order_by().values(*dimensions, 'role').annotate(**{
        field + '_sum': value for field, value in sums.items()
    }):
        key = tuple(row[field] for field in dimensions)
        grouped[key][row['role']] = {
            name: str(row[name + '_sum']) if row[name + '_sum'] is not None else None
            for name in USAGE_FIELDS
        }
    return grouped


def overview(change, run, records, cycles):
    query = CycleTokenUsage.objects.filter(change=change)
    if run is not None:
        query = query.filter(run=run)
    passes = token_totals(query, 'stage_passage_id')
    actions = token_totals(query.exclude(action__isnull=True), 'action_id')
    by_stage = token_totals(query, 'stage_passage__stage__key')
    by_cycle = token_totals(query, 'stage_passage__cycle_id')
    for record in records:
        source = passes if record.get('parent_id') is None else actions
        record['tokens'] = source.get((record['id'],), {})
    for cycle in cycles:
        cycle['tokens'] = by_cycle.get((cycle['id'],), {})
    total = token_totals(query).get((), {})
    session = {}
    if run is not None and run.coding_session_id:
        session = token_totals(CycleTokenUsage.objects.filter(
            project_id=run.project_id, session_id=run.coding_session_id)).get((), {})
    return by_stage, total, session
