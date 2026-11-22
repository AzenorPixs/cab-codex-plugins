"""Instantanés numériques natifs ; aucun message, outil brut ou secret exporté."""
from functools import lru_cache
import json
from collections import deque
import os
from pathlib import Path
import stat
from datetime import datetime,timezone as datetime_timezone
from django.utils import timezone
from .native_sources import inspect,indexed_path,NativeSourceError

TOKEN_FIELDS={'input_tokens':'tokens_input','output_tokens':'tokens_output','cached_input_tokens':'tokens_cache_read','cache_write_input_tokens':'tokens_cache_write','reasoning_output_tokens':'tokens_reasoning','total_tokens':'tokens_total'}

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


def _time_lines(stream, size):
    """Ne garder que les bornes et identifiants des tours de cette session."""
    turns, pending, uncertain = [], {}, []
    covered_from = None
    progress = deque(maxlen=96)
    remaining = size
    while remaining:
        line = stream.readline(min(remaining, 2 * 1024 * 1024))
        remaining -= len(line)
        if not line.endswith(b'\n'):
            if remaining:
                raise NativeSourceError('native-record-too-large')
            break
        row = json.loads(line)
        if not isinstance(row, dict):
            raise NativeSourceError('native-record-invalid')
        stamp = native_time(row.get('timestamp'))
        payload = row.get('payload')
        if not isinstance(payload, dict) or stamp is None:
            continue
        if row.get('type') == 'session_meta':
            covered_from = covered_from or stamp
        if row.get('type') != 'event_msg':
            continue
        kind, key = payload.get('type'), payload.get('turn_id')
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
        return _time_lines(stream, size)


def codex_work_time(run, *, actor=None, thread=None):
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
        return _codex_time_file(path, actor.uid, info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns)
    except (NativeSourceError, Refused, KeyError, ValueError, OSError):
        return None


def native_work_time(run, *, actor=None, thread=None):
    actor = actor or run.actor
    if actor.agent != 'opencode':
        return codex_work_time(run,actor=actor,thread=thread)
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
            if end and end >= start:
                spans.append((start,end))
                progress.append((end,row.get('id'),True))
            else:
                unfinished.append(start)
    return (min(covered) if complete else None,spans,unfinished,(),progress) if covered else None


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
        while offset<info.st_size:
            line=stream.readline(min(2*1024*1024,info.st_size-offset));offset+=len(line)
            if not line:break
            if not line.endswith(b'\n'):
                if offset<info.st_size:raise NativeSourceError('native-record-too-large')
                offset-=len(line);break
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
