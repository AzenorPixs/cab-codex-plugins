"""Ventilation des intervalles observés sur le temps écoulé."""

FIELDS=('cab_seconds','agent_seconds','waiting_seconds')
WAIT_DETAILS=('wait_observed_seconds','agent_assigned_seconds')
PROJECTION_SCHEMA=3


def merged(intervals, start, end):
    result=[]
    for left,right in sorted((max(start,left),min(end,right)) for left,right in intervals
                             if left < end and right > start and left < right):
        if result and left <= result[-1][1]:
            result[-1]=(result[-1][0],max(right,result[-1][1]))
        else:
            result.append((left,right))
    return result


def missing_intervals(intervals,start,end):
    left=start
    for a,b in merged(intervals,start,end):
        if left < a:
            yield left,a
        left=b
    if left < end:
        yield left,end


def microseconds(delta):
    return (delta.days*86400+delta.seconds)*1000000+delta.microseconds


def elapsed(intervals,start,end):
    return sum(microseconds(right-left) for left,right in merged(intervals,start,end))


def display_parts(parts):
    """Distribuer les dixièmes résiduels pour préserver le total affiché."""
    units=[value//100000 for value in parts]
    rounded=(sum(parts)+50000)//100000
    remainder=rounded-sum(units)
    order=sorted(range(len(parts)),key=lambda i:(-(parts[i]%100000),i))
    for index in order[:remainder]:
        units[index]+=1
    return [value/10 for value in units]


def _action_microseconds(passage, actions):
    start, end = passage['started_at'], passage['ended_at']
    if start is None or end is None or passage['state'] in ('SKIPPED','NOT_REQUESTED'):
        return None
    bounded = [
        (max(start, row['started_at']), min(end, row['ended_at']), row['id'])
        for row in actions
        if row['started_at'] is not None and row['ended_at'] is not None
        and row['state'] not in ('SKIPPED','NOT_REQUESTED')
    ]
    cursor = start
    counted = {}
    for left, right, identity in sorted(bounded):
        counted[str(identity)] = max(0, microseconds(right-max(left,cursor)))
        if left < right:
            cursor = max(cursor,right)
    unrecorded = max(0,microseconds(end-start)-sum(counted.values()))
    return counted,unrecorded


def action_accounting(passages, actions_by_passage):
    """Arrondit ensemble les actions et les écarts d’une même étape."""
    breakdown = {}
    parts = []
    for passage in passages:
        values = _action_microseconds(passage,actions_by_passage.get(passage['id'],()))
        if values is None:
            continue
        amounts,gap = values
        breakdown[passage['id']] = list(amounts)
        parts.extend([*amounts.values(),gap])
    rounded = iter(display_parts(parts))
    for passage_id, identities in breakdown.items():
        amounts = {identity:next(rounded) for identity in identities}
        gap = next(rounded)
        yield passage_id,{'actions':amounts,'unrecorded_seconds':gap,
                          'display_seconds':round(sum(amounts.values())+gap,1)}


def partition(start,end,cab=(),agent=(),covered=(),*,display=False):
    blank={key:None for key in (*FIELDS,*WAIT_DETAILS)}
    if start is None or end is None or end < start:
        return {**blank,'attribution_complete':False}
    cab=list(cab);agent=list(agent)
    duration=microseconds(end-start)
    cab_time=elapsed(cab,start,end)
    total_work=elapsed([*cab,*agent],start,end)
    agent_time=total_work-cab_time
    coverage=[*covered,*cab,*agent]
    observed=elapsed(coverage,start,end)
    assigned=duration-observed
    parts=(cab_time,agent_time+assigned,observed-total_work)
    values=display_parts(parts) if display else [value/1000000 for value in parts]
    gaps=list(missing_intervals(coverage,start,end)) if assigned else []
    return {
        **dict(zip(FIELDS,values)),
        'wait_observed_seconds':(observed-total_work)/1000000,
        'agent_assigned_seconds':assigned/1000000,
        'agent_attribution_policy':'no-attested-work' if assigned else None,
        'agent_assigned_intervals':[[left.isoformat(),right.isoformat()] for left,right in gaps[:128]],
        'agent_assigned_interval_count':len(gaps),
        'attribution_complete':True,
    }


def native_complete(traces,start,end):
    if not traces or start is None or end is None:
        return False
    return all(trace and trace[0] is not None and trace[0]<=start
               and not any(at<end for at in trace[2])
               and not any((left is None or left<end) and right>start for left,right in trace[3])
               for trace in traces)
