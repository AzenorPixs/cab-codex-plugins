"""Instantanés numériques natifs ; aucun message, outil brut ou secret exporté."""
from functools import lru_cache
import json
from collections import deque
import os
import re
from pathlib import Path
import stat
from datetime import datetime,timezone as datetime_timezone
from django.utils import timezone
from .native_sources import inspect,indexed_path,NativeSourceError

TOKEN_FIELDS={'input_tokens':'tokens_input','output_tokens':'tokens_output','cached_input_tokens':'tokens_cache_read','cache_write_input_tokens':'tokens_cache_write','reasoning_output_tokens':'tokens_reasoning','total_tokens':'tokens_total'}
USAGE_FIELDS=('input_tokens','output_tokens','cache_read_tokens','cache_write_tokens')
_CODEX_USAGE_FIELDS=('input_tokens','output_tokens','cached_input_tokens','cache_write_input_tokens')
_MAX_TOKEN_COUNT=2**63-1
_CODEX_LINE_LIMIT = 2 * 1024 * 1024
_CODEX_COMPACTION = re.compile(
    rb'\A\s*\{\s*"timestamp"\s*:\s*"[^"\\]{1,64}"\s*,\s*'
    rb'(?:"ordinal"\s*:\s*\d+\s*,\s*)?"type"\s*:\s*"compacted"\s*,\s*"payload"\s*:'
)


def _token_count(value):
    return value if type(value) is int and 0 <= value <= _MAX_TOKEN_COUNT else None


def _usage_counts(values, fields):
    return tuple(_token_count(values.get(field)) for field in fields)


def _codex_usage(payload, stamp, previous, usage):
    info = payload.get('info')
    if not isinstance(info, dict) or not isinstance(info.get('total_token_usage'), dict):
        return previous
    total = _usage_counts(info['total_token_usage'], _CODEX_USAGE_FIELDS)
    last = info.get('last_token_usage')
    if previous is None:
        last = _usage_counts(last if isinstance(last, dict) else {}, _CODEX_USAGE_FIELDS)
        delta = tuple(value if value == current else None for value, current in zip(last, total))
    else:
        delta = tuple(current - before if current is not None and before is not None and current >= before
                      else None for current, before in zip(total, previous))
    if total != previous and (any(delta) or previous is None and 0 in delta):
        # Keep the original key for events already collected with three counters.
        legacy_delta = delta[:-1]
        key_counts = total[:-1] if any(legacy_delta) or previous is None and 0 in legacy_delta else total
        usage.append((stamp, (stamp.isoformat(), key_counts), delta))
    return total

def native_time(value):
    try:
        if isinstance(value, str):
            timestamp = datetime.fromisoformat(value)
            return timestamp if timestamp.tzinfo else None
        if type(value) in (float, int):
            seconds = value / 1000 if abs(value) >= 100_000_000_000 else value
            return datetime.fromtimestamp(seconds, datetime_timezone.utc)
    except (ValueError, OverflowError, OSError):
        pass
    return None


def _agent_label(value, limit):
    return value if isinstance(value,str) and len(value)<=limit and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_./:+@ ()-]*',value) else ''


def _codex_lines(stream, size):
    offset = 0
    while offset < size:
        line = stream.readline(min(_CODEX_LINE_LIMIT, size - offset))
        if not line:
            return
        offset += len(line)
        if line.endswith(b'\n'):
            yield offset, line
            continue
        if offset == size:
            return
        if not _CODEX_COMPACTION.match(line):
            raise NativeSourceError('native-record-too-large')
        while offset < size:
            chunk = stream.readline(min(_CODEX_LINE_LIMIT, size - offset))
            if not chunk:
                return
            offset += len(chunk)
            if chunk.endswith(b'\n'):
                yield offset, None
                break


def _time_lines(stream, size, usage=None, models=None):
    """Ne garder que les bornes et identifiants des tours de cette session."""
    turns, pending, uncertain = [], {}, []
    covered_from = None
    previous_usage = None
    provider = ''
    last_model = ''
    progress = deque(maxlen=96)
    for _, line in _codex_lines(stream, size):
        if line is None:
            continue
        row = json.loads(line)
        if not isinstance(row, dict):
            raise NativeSourceError('native-record-invalid')
        stamp = native_time(row.get('timestamp'))
        payload = row.get('payload')
        if not isinstance(payload, dict) or stamp is None:
            continue
        if row.get('type') == 'session_meta':
            covered_from = covered_from or stamp
            provider = _agent_label(payload.get('model_provider'),160) or provider
        if models is not None and ('turn_context' == row.get('type') or 'thread_settings_applied' in (row.get('type'),payload.get('type'))):
            settings=payload.get('settings')
            settings=settings if isinstance(settings,dict) else payload
            model=_agent_label(settings.get('model'),255)
            effort=_agent_label(settings.get('reasoning_effort') or settings.get('effort'),80)
            provider=_agent_label(settings.get('model_provider') or settings.get('provider'),160) or provider
            if model or (effort and last_model):
                last_model=model or last_model
                models.append((stamp,last_model,provider,effort))
        if row.get('type') != 'event_msg':
            continue
        kind, key = payload.get('type'), payload.get('turn_id')
        if usage is not None and kind == 'token_count':
            previous_usage = _codex_usage(payload, stamp, previous_usage, usage)
        if kind == 'agent_message':
            progress.append((stamp,key,True))
        if not isinstance(key, str):
            continue
        if kind == 'task_started':
            pending[key] = stamp
            progress.append((stamp,key,False))
        elif kind in ('task_complete', 'turn_aborted'):
            start = pending.pop(key, None)
            elapsed = payload.get('duration_ms')
            if start is None and type(elapsed) in (int, float) and 0 <= elapsed <= 86_400_000:
                from datetime import timedelta
                start = stamp - timedelta(milliseconds=elapsed)
            if start is not None and start <= stamp:
                turns.append((start, stamp))
            else:
                uncertain.append((covered_from, stamp))
            progress.append((stamp,key,bool(payload.get('last_agent_message'))))
    return covered_from, tuple(turns), tuple(pending.values()), tuple(uncertain), tuple(progress)


@lru_cache(maxsize=12)
def _codex_time_file(path, uid, device, inode, size, modified):
    with os.fdopen(os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK), 'rb') as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_uid != uid or (
            info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns
        ) != (device, inode, size, modified) or size > 128 * 1024 * 1024:
            raise NativeSourceError('native-source-unavailable')
        usage = []
        models = []
        timing = _time_lines(stream, size, usage, models)
        return timing, tuple(usage), tuple(models)


def codex_work_time(run, *, actor=None, thread=None, tokens=False, models=False):
    """Lire les bornes du seul journal déjà authentifié, sans restituer son contenu."""
    actor = actor or run.actor
    if actor.agent not in ('codex', 'codex-cli'):
        return None
    source = run.mandate.get('native_source', {})
    path = source.get('source_file')
    from .core.native_access import root_for
    from .core.commands import Refused
    try:
        if thread is not None:
            path = indexed_path(actor.uid,thread,strict=False)
            if not path:
                return None
            source = inspect(actor.uid,thread,run.project.root,path)
        if not path:
            return None
        checked = inspect(actor.uid, thread or run.session_id, run.project.root if thread else root_for(run), path)
        if checked != source:
            return None
        info = os.stat(path, follow_symlinks=False)
        if (info.st_dev, info.st_ino) != (source['device'], source['inode']):
            return None
        timing, usage, observations = _codex_time_file(path, actor.uid, info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns)
        if models:
            return timing,usage,observations
        return (timing, usage) if tokens else timing
    except (NativeSourceError, Refused, KeyError, ValueError, OSError):
        return None


def native_work_time(run, *, actor=None, thread=None, tokens=False, models=False):
    actor = actor or run.actor
    if actor.agent != 'opencode':
        return codex_work_time(run,actor=actor,thread=thread,tokens=tokens,models=models)
    import httpx
    from types import SimpleNamespace
    from .core.commands import Refused
    from .opencode import messages
    target = SimpleNamespace(actor=actor,session_id=thread or run.session_id,project=run.project)
    try:
        rows = messages(target)
    except (Refused,httpx.HTTPError,OSError,ValueError):
        return None
    covered, spans, unfinished, progress = [], [], [], []
    usage = []
    observations = []
    complete = True
    for row in rows:
        timing = row.get('time') if isinstance(row,dict) else None
        if not isinstance(timing,dict):
            complete = False
            continue
        role = row.get('role')
        if role not in ('assistant','user'):
            complete = False
        start,end = (native_time(timing.get(name)) for name in ('created','completed'))
        if start is None:
            continue
        covered.append(start)
        if role == 'assistant':
            if models:
                model=_agent_label(row.get('modelID'),255)
                if model:
                    observations.append((start,model,_agent_label(row.get('providerID'),160),
                                         _agent_label(row.get('reasoningEffort') or row.get('variant'),80)))
            if end and end >= start:
                spans.append((start,end))
                progress.append((end,row.get('id'),True))
                if tokens:
                    counts = _opencode_usage(row)
                    if counts is not None:
                        usage.append((end, row['id'], counts))
            else:
                unfinished.append(start)
    timing = (min(covered) if complete else None,spans,unfinished,(),progress) if covered else None
    if models:
        return timing,tuple(usage),tuple(observations)
    return (timing, tuple(usage)) if tokens else timing


def _opencode_usage(row):
    counters = row.get('tokens')
    if not isinstance(row.get('id'), str) or not row['id'] or not isinstance(counters, dict):
        return None
    cache = counters.get('cache')
    counts = (*_usage_counts(counters, ('input','output')),
              *_usage_counts(cache if isinstance(cache, dict) else {}, ('read','write')))
    return counts if any(value is not None for value in counts) else None


def codex_snapshot(run):
    source=run.mandate.get('native_source',{});path=source.get('source_file')
    if not path:return {'status':'unavailable','reason':'native-source-not-bound'}
    indexed=indexed_path(run.actor.uid,run.session_id,run.mandate.get('native_source_home',''),strict=False)
    if indexed and indexed!=path:raise NativeSourceError('native-source-resume-required')
    from .core.native_access import root_for
    checked=inspect(run.actor.uid,run.session_id,root_for(run),path)
    if checked!=source:raise NativeSourceError('native-source-replaced')
    fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
    counters={};native_at=None;offset=0
    with os.fdopen(fd,'rb') as stream:
        info=os.fstat(stream.fileno())
        captured_at=timezone.now().isoformat()
        if (info.st_dev,info.st_ino)!=(source['device'],source['inode']) or not stat.S_ISREG(info.st_mode) or info.st_size>128*1024*1024:
            raise NativeSourceError('native-source-unavailable')
        for offset, line in _codex_lines(stream, info.st_size):
            if line is None:
                continue
            try:row=json.loads(line)
            except (ValueError,UnicodeError):raise NativeSourceError('native-record-invalid') from None
            if not isinstance(row,dict):raise NativeSourceError('native-record-invalid')
            payload=row.get('payload',{})
            if row.get('type')=='event_msg' and isinstance(payload,dict) and payload.get('type')=='token_count':
                info_row=payload.get('info') or {}
                if not isinstance(info_row,dict):continue
                totals=info_row.get('total_token_usage',{})
                if not isinstance(totals,dict):continue
                counters={target:str(totals[key]) for key,target in TOKEN_FIELDS.items() if type(totals.get(key)) is int and totals[key]>=0}
                native_at=None
                try:
                    stamp=datetime.fromisoformat(row.get('timestamp',''))
                    if stamp.tzinfo is not None:native_at=stamp.isoformat()
                except (ValueError,TypeError):pass
    return {'status':'ok' if counters else 'unavailable','reason':None if counters else 'native-counters-absent','source':checked,'counters':counters,'native_at':native_at,'offset':offset,'size':info.st_size,'observed_at':captured_at}

def opencode_snapshot(run):
    from .opencode import messages
    rows=messages(run);totals={};pending=False;ids=set();latest=0;available=None
    for row in rows:
        if not isinstance(row,dict) or not isinstance(row.get('id'),str):continue
        if row['id'] in ids:continue
        timing=row.get('time',{})
        if not isinstance(timing,dict):continue
        if not isinstance(timing.get('completed'),(int,float)):
            if row.get('tokens'):pending=True
            continue
        tokens=row.get('tokens',{})
        if not isinstance(tokens,dict) or not tokens:continue
        latest=max(latest,timing['completed']);ids.add(row['id']);present=set()
        for key,target in [('input','tokens_input'),('output','tokens_output'),('reasoning','tokens_reasoning'),('total','tokens_total')]:
            if type(tokens.get(key)) is int and tokens[key]>=0:totals[target]=totals.get(target,0)+tokens[key];present.add(target)
        cache=tokens.get('cache',{})
        for key,target in [('read','tokens_cache_read'),('write','tokens_cache_write')]:
            if isinstance(cache,dict) and type(cache.get(key)) is int and cache[key]>=0:totals[target]=totals.get(target,0)+cache[key];present.add(target)
        available=present if available is None else available&present
    totals={key:value for key,value in totals.items() if key in (available or set())}
    profile=run.actor.native
    return {'status':'ok' if totals and not pending else 'unavailable','reason':'native-records-pending' if pending else None if totals else 'native-counters-absent','source':{'agent':'opencode','uid':run.actor.uid,'session_id':run.session_id,'pid':profile.get('pid'),'start_time':profile.get('start_time')},'counters':{key:str(value) for key,value in totals.items()},'native_at':str(latest) if latest else None,'records':len(ids)}

def snapshot(run):
    from .core.commands import Refused
    import httpx
    try:
        value=codex_snapshot(run) if run.actor.agent in ('codex','codex-cli') else opencode_snapshot(run) if run.actor.agent=='opencode' else {'status':'unavailable','reason':'native-agent-unsupported'}
    except (OSError,ValueError,KeyError,TypeError,Refused,httpx.HTTPError) as error:
        value={'status':'unavailable','reason':str(error) if isinstance(error,(NativeSourceError,Refused)) else type(error).__name__}
    return {'observed_at':timezone.now().isoformat(),**value}

def difference(start,end):
    if start.get('status')!='ok' or end.get('status')!='ok':return {},{'state':'unavailable','reason':start.get('reason') or end.get('reason') or 'native-snapshot-unavailable'}
    if start.get('source')!=end.get('source') or end.get('offset',0)<start.get('offset',0):return {},{'state':'unavailable','reason':'native-source-divergent'}
    if not start.get('observed_at') or not end.get('observed_at'):return {},{'state':'unavailable','reason':'native-time-unavailable'}
    try:
        if start.get('observed_at') and end.get('observed_at'):
            def timestamp(value):
                if not isinstance(value,str):raise ValueError('missing-time')
                result=datetime.fromtimestamp(float(value)/1000,datetime_timezone.utc) if value.replace('.', '',1).isdigit() else datetime.fromisoformat(value)
                if result.tzinfo is None:raise ValueError('missing-zone')
                return result
            native_end=timestamp(end.get('native_at'));left=timestamp(start['observed_at']);right=timestamp(end['observed_at'])
            if native_end<left:return {},{'state':'unavailable','reason':'native-counters-not-updated'}
            if native_end>right:return {},{'state':'unavailable','reason':'native-clock-divergent'}
    except (ValueError,TypeError,OverflowError,OSError):return {},{'state':'unavailable','reason':'native-time-unavailable'}
    values={};missing=[]
    for key in set(start.get('counters',{}))|set(end.get('counters',{})):
        if key not in start['counters'] or key not in end['counters']:missing.append(key);continue
        delta=int(end['counters'][key])-int(start['counters'][key])
        if delta<0:return {},{'state':'unavailable','reason':'native-counter-reset'}
        values[key]=str(delta)
    return values,{'state':'bounded','kind':'native-counter-window','missing':sorted(missing),'native_start':start.get('native_at'),'native_end':end.get('native_at'),'limitation':'Incréments natifs observés ; aucune ventilation à l’intérieur d’un événement natif ni attribution certaine des événements tardifs.'}
