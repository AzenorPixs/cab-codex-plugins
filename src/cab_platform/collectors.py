"""Mesures natives seulement ; sources inaccessibles explicitement inconnues."""
import hashlib
import json
from pathlib import Path
import os
import stat
import logging
from django.db import transaction
from .core.models import Actor,Metric,Run
from .core.commands import event
log=logging.getLogger('cab.collectors')

def opencode_metrics(actor):
    from .opencode import messages
    from .core.commands import Refused
    import httpx
    from decimal import Decimal,InvalidOperation
    for run in Run.objects.filter(actor=actor):
        if run.mandate.get('native_frozen_at'):continue
        try:rows=messages(run)
        except (Refused,httpx.HTTPError,OSError,ValueError,KeyError) as error:
            log.debug('native source unavailable',extra={'run_id':run.run_id,'code':type(error).__name__});continue
        for row in rows:
            if not isinstance(row.get('id'),str):continue
            tokens=row.get('tokens',{});values={'messages':'1'}
            for source,target in [('input','tokens_input'),('output','tokens_output'),('reasoning','tokens_reasoning'),('total','tokens_total')]:
                if type(tokens.get(source)) is int and tokens[source]>=0:values[target]=str(tokens[source])
            for source,target in [('read','tokens_cache_read'),('write','tokens_cache_write')]:
                if type(tokens.get('cache',{}).get(source)) is int and tokens['cache'][source]>=0:values[target]=str(tokens['cache'][source])
            if row.get('cost') is not None:
                try:
                    cost=Decimal(str(row['cost']))
                    if cost.is_finite() and cost>=0:values['cost_usd']=str(cost)
                except InvalidOperation:pass
            content=row.get('content',[])
            if isinstance(content,list):values['tools']=str(sum(part.get('type')=='tool' for part in content if isinstance(part,dict)))
            timestamp=row.get('time',{})
            sequence=max([v for v in timestamp.values() if type(v) is int and v>=0],default=0) if isinstance(timestamp,dict) else timestamp if type(timestamp) is int else 0
            with transaction.atomic():
                metric,created=Metric.objects.select_for_update().get_or_create(run=run,source='opencode-native',stream=row['id'][:200],defaults={'sequence':sequence})
                if not created and sequence<metric.sequence:continue
                metric.sequence=sequence;metric.values=values;metric.coverage={**{k:'native' for k in values},'_scope':'session-wide','_eligible_for_change':False};metric.model={k:str(v)[:160] for k,v in row.get('model',{}).items() if k in ('id','providerID','variant')};metric.save()

def codex_metrics(run):
    actor=run.actor
    source=run.mandate.get('native_source',actor.native)
    if run.mandate.get('native_frozen_at') or not source.get('source_file'):return
    path=Path(source['source_file'])
    try:
        fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
        with os.fdopen(fd,'r',encoding='utf-8') as stream:
            info=os.fstat(stream.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_uid!=actor.uid or info.st_nlink!=1 or info.st_size>128*1024*1024:return
            if 'inode' in source and (info.st_dev,info.st_ino)!=(source['device'],source['inode']):
                log.warning('native source replaced',extra={'run_id':run.run_id});return
            identity=None;last=None
            for line in stream:
                try:row=json.loads(line)
                except ValueError:continue
                if row.get('type')=='session_meta':identity=row.get('payload',{})
                if row.get('type')=='event_msg' and row.get('payload',{}).get('type')=='token_count':last=row['payload'].get('info',{}).get('total_token_usage')
        if not identity or not last or identity.get('id')!=run.session_id or identity.get('cwd')!=run.project.root:return
        metrics={key:str(last[name]) for name,key in [('input_tokens','tokens_input'),('output_tokens','tokens_output'),('cached_input_tokens','tokens_cache_read'),('reasoning_output_tokens','tokens_reasoning'),('total_tokens','tokens_total')] if type(last.get(name)) is int and last[name]>=0}
        sequence=info.st_mtime_ns//1000000
        with transaction.atomic():
            current,created=Metric.objects.select_for_update().get_or_create(run=run,source='codex-native',stream='native-tokens',defaults={'sequence':sequence})
            if not created and sequence<=current.sequence:return
            current.sequence=sequence;current.values=metrics;current.coverage={**{k:'native' for k in metrics},'_scope':'session-wide','_eligible_for_change':False};current.save()
    except (OSError,UnicodeError) as error:
        log.debug('native source unavailable',extra={'run_id':run.run_id,'code':type(error).__name__})

def collect():
    for actor in Actor.objects.filter(active=True):
        if actor.agent=='opencode' and actor.native.get('password_file'):
            opencode_metrics(actor)
        else:
            for run in Run.objects.filter(actor=actor).select_related('actor','project'):codex_metrics(run)
