"""Rattachement des mesures natives horodatées aux fenêtres du cycle."""
from bisect import bisect_left
from collections import defaultdict
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP, localcontext
from hashlib import sha256
import json

from django.db.models import Q, Sum
from django.utils import timezone

from .core.models import Actor, AgentModel, ChangeStageIteration, CycleTokenUsage, Event, SessionAgent
from .measurement_sources import CodexUsageProof, USAGE_FIELDS
from .model_policies import comparable_cost


RATE_FIELDS=('input_cost','output_cost','cache_read_cost','cache_write_cost')
NON_EXECUTED = ('SKIPPED', 'NOT_REQUESTED')


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


def _stage_requests(run, windows):
    by_attempt = {}
    requests = {}
    for row in windows:
        tracking = row.receipt.get('token_tracking')
        if row.run_id == run.pk and tracking:
            by_attempt[tracking['attempt']] = row
            requests[(run.project_id, run.run_id, tracking['request_id'])] = row
    for data in Event.objects.filter(run=run, kind='stage-agent-validated').values_list('data', flat=True):
        row = by_attempt.get(data['result']['attempt'])
        if row:
            requests[(run.project_id, run.run_id, data['request_id'])] = row
    return requests


def store_usage(run, sources):
    """Appel sous le verrou du RUN, avec insertion idempotente par événement."""
    if not sources:
        return False
    from .stage_telemetry import automatic

    tracked = automatic(run)
    passages = ChangeStageIteration.objects.filter(
        run__project_id=run.project_id, run__cycle_steps=12, cycle__isnull=False,
        parent__isnull=True, started_at__isnull=False,
    ).exclude(state__in=NON_EXECUTED)
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
        windows = list(passages.filter(own | parent).select_related('stage')
                       .only('run','asynchronous','started_at','ended_at','receipt','stage__key'))
        if not any(row.run_id == run.pk for row in windows):
            continue
        requests = _stage_requests(run, windows) if tracked else {}
        pending = {}
        for stamp, source_key, counts in usage:
            proof = source_key if isinstance(source_key, CodexUsageProof) else None
            if tracked and proof and proof.response_at is None:
                continue
            measured_at = proof.response_at if tracked and proof else stamp
            if tracked and proof and proof.requests:
                candidates = {requests.get(request) for request in proof.requests}
                if len(candidates) != 1 or None in candidates:
                    continue
                stage = candidates.pop()
            else:
                matches = [row for row in windows if _contains(row, measured_at)]
                primary = [row for row in matches if not row.asynchronous]
                candidates = primary or matches
                if len(candidates) != 1 or candidates[0].run_id != run.pk:
                    continue
                stage = candidates[0]
            if stage.stage.key == 'vacant':
                continue
            if proof:
                source_key = proof.key
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


def _executed_usage(query):
    """Garder les événements natifs et écarter leur projection hors exécution."""
    return query.exclude(Q(stage_passage__state__in=NON_EXECUTED) |
                         Q(stage_passage__stage__key='vacant'))


def run_totals(run):
    return token_totals(_executed_usage(CycleTokenUsage.objects.filter(run=run))).get((), {})


def _agent_catalog(identifiers):
    catalog=defaultdict(list)
    for identifier,provider_id,name,summary in AgentModel.objects.filter(identifier__in=identifiers).values_list(
        'identifier','provider_id','provider__name','details__summary',
    ):
        catalog[identifier].append((provider_id,name,summary))
    return catalog


def _catalog_model(candidates,native_provider,provider_id=None):
    if native_provider:
        matches=[entry for entry in candidates if entry[1].casefold()==native_provider.casefold()]
    elif provider_id is not None:
        matches=[entry for entry in candidates if entry[0]==provider_id]
    else:
        matches=candidates
    return matches[0] if len(matches)==1 else None


def _catalog_rates(summary):
    rates={}
    if not isinstance(summary,dict):
        return rates
    for field,rate in zip(USAGE_FIELDS,RATE_FIELDS):
        source=summary.get(rate)
        if type(source) not in (str,int,float) or len(str(source))>64:
            continue
        value=comparable_cost(source)
        if value is None or (value and not -24<=value.adjusted()<=14):
            continue
        text=format(value,'f') if value else '0'
        rates[field]=text.rstrip('0').rstrip('.') if '.' in text else text
    return rates


def _codex_billable_input(counts):
    entered, _, read, written = counts
    if entered is None or read is None or written is None or read + written > entered:
        return None
    return entered - read - written


def _cost_counts(run):
    query = _executed_usage(CycleTokenUsage.objects.filter(run=run))
    counts = token_totals(query, 'stage_passage_id')
    codex_roles = {role for role, actor, _ in native_sources(run) if actor.agent in ('codex', 'codex-cli')}
    if not codex_roles:
        return counts
    billable = defaultdict(lambda: 0)
    incomplete = set()
    for passage, role, *values in query.filter(role__in=codex_roles).values_list(
        'stage_passage_id', 'role', *USAGE_FIELDS,
    ).iterator():
        key = (passage, role)
        amount = _codex_billable_input(values)
        if amount is None:
            incomplete.add(key)
        else:
            billable[key] += amount
        entered, _, read, written = values
        if entered is not None:
            for field, value, other in (
                ('cache_read_tokens', read, written), ('cache_write_tokens', written, read),
            ):
                cache_key = (*key, field)
                if value is None or value + (other or 0) > entered:
                    incomplete.add(cache_key)
        else:
            for field, value in (('cache_read_tokens', read), ('cache_write_tokens', written)):
                if value is None:
                    incomplete.add((*key, field))
    for (passage,), roles in counts.items():
        for role in codex_roles.intersection(roles):
            key = (passage, role)
            roles[role]['input_tokens'] = None if key in incomplete else str(billable[key])
            for field in USAGE_FIELDS[2:]:
                if (*key, field) in incomplete:
                    roles[role][field] = None
    return counts


def store_session_agents(run, sources):
    """Conserve les réglages natifs applicables aux tours qui recoupent un passage."""
    if not sources or not run.coding_session_id:
        return False
    passages=ChangeStageIteration.objects.filter(run=run,parent__isnull=True,started_at__isnull=False).exclude(
        state__in=('SKIPPED','NOT_REQUESTED'))
    now=timezone.now()
    pending={}
    observed=set()
    for role, trace, observations in sources:
        _, turns, unfinished, _, _=trace
        history=sorted(observations,key=lambda item:item[0])
        stamps=[item[0] for item in history]
        intervals=[(start,end) for start,end in turns if end>run.created]
        intervals.extend((start,now) for start in unfinished)
        for passage in passages:
            candidates={}
            for start,end in intervals:
                beginning=max(start,passage.started_at)
                ending=min(end,passage.ended_at or now)
                if beginning>=ending:
                    continue
                left=bisect_left(stamps,beginning)
                if left and stamps[left-1]>=start:
                    left-=1
                for stamp,model,provider,reasoning in history[left:bisect_left(stamps,ending)]:
                    candidates[max(beginning,stamp)]=(model,reasoning,provider)
            if not candidates:
                continue
            observed.add((passage.pk,role))
            segments=[]
            for stamp,settings in sorted(candidates.items()):
                if not segments or settings!=segments[-1][1]:
                    segments.append((stamp,settings))
            for index,(stamp,settings) in enumerate(segments):
                beginning=stamp if index else passage.started_at
                ending=segments[index+1][0] if index+1<len(segments) else passage.ended_at
                pending[(passage.pk,role,*settings,beginning)]=ending
    if not pending:
        return False
    catalog=_agent_catalog({key[2] for key in pending})
    existing={(row.stage_passage_id,row.role,row.model,row.reasoning,row.native_provider,row.observed_at):row
              for row in SessionAgent.objects.filter(session_id=run.coding_session_id,stage_passage__run=run)}
    inserts=[]
    updates=[]
    for key,ending in pending.items():
        passage_id,role,model,reasoning,hint,stamp=key
        entry=_catalog_model(catalog[model],hint)
        provider=entry[0] if entry else None
        row=existing.pop(key,None)
        if row is None:
            inserts.append(SessionAgent(session_id=run.coding_session_id,stage_passage_id=passage_id,role=role,
                model=model,reasoning=reasoning,native_provider=hint,provider_id=provider,observed_at=stamp,ended_at=ending))
        elif row.provider_id!=provider or row.ended_at!=ending:
            row.provider_id=provider
            row.ended_at=ending
            updates.append(row)
    stale=[row.pk for key,row in existing.items() if key[:2] in observed]
    if stale:
        SessionAgent.objects.filter(pk__in=stale).delete()
    if inserts:
        SessionAgent.objects.bulk_create(inserts,ignore_conflicts=True)
    if updates:
        SessionAgent.objects.bulk_update(updates,['provider','ended_at'])
    return bool(inserts or updates or stale)


def store_cycle_costs(run, session):
    """Persiste les montants du RUN sous les verrous de la session et du RUN."""
    agents = list(SessionAgent.objects.filter(session=session, stage_passage__run=run)
                  .select_related('stage_passage').order_by('observed_at', 'pk'))
    catalog = _agent_catalog({agent.model for agent in agents})
    segments = defaultdict(list)
    now = timezone.now()
    microsecond = timedelta(microseconds=1)
    by_passage = defaultdict(list)
    for agent in agents:
        by_passage[agent.stage_passage_id, agent.role].append(agent)
    for key, rows in by_passage.items():
        passage = rows[0].stage_passage
        if (rows[0].observed_at != passage.started_at or rows[-1].ended_at != passage.ended_at
                or any(left.ended_at != right.observed_at for left, right in zip(rows, rows[1:]))):
            continue
        for agent in rows:
            end = agent.ended_at or now
            duration = (end - agent.observed_at) // microsecond
            if duration <= 0:
                continue
            entry = _catalog_model(catalog[agent.model], agent.native_provider, agent.provider_id)
            rates = _catalog_rates(entry[2]) if entry else {}
            segments[key].append((duration, rates))

    counts = _cost_counts(run)
    costs = defaultdict(dict)
    with localcontext() as context:
        context.prec = 80
        for (passage,), roles in counts.items():
            for role, totals in roles.items():
                weights = segments[passage, role]
                elapsed = sum(duration for duration, _ in weights)
                amounts = {}
                for field, count in totals.items():
                    if count is None:
                        continue
                    if int(count) == 0:
                        amount = Decimal(0)
                    else:
                        if not elapsed or any(field not in rates for _, rates in weights):
                            continue
                        weighted_rate = sum(duration * Decimal(rates[field]) for duration, rates in weights)
                        amount = int(count) * weighted_rate / (elapsed * 1_000_000)
                    amounts[field] = str(amount.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP))
                if amounts:
                    costs[str(passage)][role] = amounts
    key = str(run.pk)
    if session.token_costs.get(key, {}) == costs:
        return False
    session.token_costs = {**session.token_costs, key: dict(costs)}
    session.save(update_fields=['token_costs', 'updated'])
    return True


def stage_agents(run):
    agents=defaultdict(list)
    rows=list(SessionAgent.objects.filter(session_id=run.coding_session_id,stage_passage__run=run).select_related('provider','stage_passage')
              .order_by('role','observed_at','pk'))
    catalog=_agent_catalog({row.model for row in rows})
    for row in rows:
        entry=_catalog_model(catalog[row.model],row.native_provider,row.provider_id)
        costs=row.token_costs if isinstance(row.token_costs,dict) else {}
        agents[row.stage_passage_id].append({'id':row.pk,'role':row.role,'model':row.model,
            'reasoning':row.reasoning,'provider':entry[1] if entry else row.provider.name if row.provider else None,
            'started_at':row.observed_at.isoformat(),
            'ended_at':(row.ended_at or row.stage_passage.ended_at).isoformat()
                       if row.ended_at or row.stage_passage.ended_at else None,
            'rates':_catalog_rates(entry[2]) if entry else {},
            'costs':{field:costs[field] for field in USAGE_FIELDS if isinstance(costs.get(field),str)}})
    return agents


def _sum_costs(rows):
    amounts = defaultdict(dict)
    with localcontext() as context:
        context.prec = 80
        for tokens, costs in rows:
            for role in tokens.keys() | costs.keys():
                counters = tokens.get(role, {})
                prices = costs.get(role, {})
                for field in counters.keys() | prices.keys():
                    value = prices.get(field)
                    if value is None and counters.get(field) is None:
                        continue
                    previous = amounts[role].get(field, Decimal(0))
                    amounts[role][field] = None if value is None or previous is None else previous + Decimal(value)
    return {role: {field: str(value) if value is not None else None for field, value in values.items()}
            for role, values in amounts.items() if values}


def _total_cost(costs):
    values = [value for role in costs.values() for value in role.values()]
    if not values or None in values:
        return None
    with localcontext() as context:
        context.prec = 80
        return str(sum(map(Decimal, values)))


def passage_costs(passages):
    return _sum_costs((record['tokens'], record['token_costs']) for record in passages)


def _cycle_agents(rows):
    periods = {}
    for row in sorted(rows, key=lambda agent: (agent['started_at'], agent['id'])):
        key = (row['role'], row['model'], row['provider'], row['reasoning'],
               tuple(sorted(row['rates'].items())))
        period = periods.get(key)
        if period is None:
            periods[key] = row.copy()
        elif period['ended_at'] is None or row['ended_at'] is None:
            period['ended_at'] = None
        else:
            period['ended_at'] = max(period['ended_at'], row['ended_at'])
    return list(periods.values())


def overview(change, run, records, cycles):
    query = _executed_usage(CycleTokenUsage.objects.filter(change=change))
    if run is not None:
        query = query.filter(run=run)
    passes = token_totals(query, 'stage_passage_id')
    actions = token_totals(query.exclude(action__isnull=True), 'action_id')
    by_stage = token_totals(query, 'stage_passage__stage__key')
    by_cycle = token_totals(query, 'stage_passage__cycle_id')
    agents=stage_agents(run) if run is not None else {}
    stored_costs=run.coding_session.token_costs.get(str(run.pk),{}) if run is not None and run.coding_session_id else {}
    cycle_passages = defaultdict(list)
    for record in records:
        source = passes if record.get('parent_id') is None else actions
        record['tokens'] = source.get((record['id'],), {})
        if run is not None and record.get('parent_id') is None:
            record['agents']=agents.get(record['id'],[])
            record['token_costs']=stored_costs.get(str(record['id']),{}) if record['tokens'] else {}
            if record.get('cycle_id') is not None:
                cycle_passages[record['cycle_id']].append(record)
    for cycle in cycles:
        cycle['tokens'] = by_cycle.get((cycle['id'],), {})
        if run is not None:
            passages = cycle_passages[cycle['id']]
            costs = passage_costs(passages)
            cycle.update(token_costs=costs, total_cost=_total_cost(costs),
                         agents=_cycle_agents(agent for record in passages for agent in record['agents']))
    total = token_totals(query).get((), {})
    session = {}
    if run is not None and run.coding_session_id:
        session = token_totals(_executed_usage(CycleTokenUsage.objects.filter(
            project_id=run.project_id, session_id=run.coding_session_id))).get((), {})
    return by_stage, total, session


def cycle_cost_summary(cycles):
    costs = _sum_costs((cycle['tokens'], cycle['token_costs']) for cycle in cycles)
    return {'token_costs': costs, 'total_cost': _total_cost(costs)}
