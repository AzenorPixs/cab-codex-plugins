"""Ventilation des intervalles observés sur le temps écoulé."""

FIELDS=('cab_seconds','agent_seconds','waiting_seconds')
WAIT_DETAILS=('wait_observed_seconds','wait_assigned_seconds')
PROJECTION_SCHEMA=2


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
    parts=(cab_time,agent_time,duration-total_work)
    values=display_parts(parts) if display else [value/1000000 for value in parts]
    assigned=duration-observed
    gaps=list(missing_intervals(coverage,start,end)) if assigned else []
    return {
        **dict(zip(FIELDS,values)),
        'wait_observed_seconds':(observed-total_work)/1000000,
        'wait_assigned_seconds':assigned/1000000,
        'waiting_policy':'no-attested-work' if assigned else None,
        'waiting_assigned_intervals':[[left.isoformat(),right.isoformat()] for left,right in gaps[:128]],
        'waiting_assigned_interval_count':len(gaps),
        'attribution_complete':True,
    }


def native_complete(traces,start,end):
    if not traces or start is None or end is None:
        return False
    return all(trace and trace[0] is not None and trace[0]<=start
               and not any(at<end for at in trace[2])
               and not any((left is None or left<end) and right>start for left,right in trace[3])
               for trace in traces)
