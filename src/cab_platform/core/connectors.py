"""Registre authentifié et observations de rechargement CABU."""
import re
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from cab_platform.connector_process import identity,alive,cab_process,legacy_processes
from . import commands as c
from .models import Actor,McpConnector,ConnectorReload,SystemUpdate

@transaction.atomic
def heartbeat(actor,data,peer):
    c.require(actor.active and actor.agent in ('codex','opencode'),'connector-actor-invalid',403)
    c.require(peer and peer['uid']==actor.uid,'connector-peer-required',403)
    process=identity(peer['pid']);c.require(process and cab_process(peer['pid'],'mcp')==actor.agent,'connector-process-invalid',403)
    key=data.get('connector_id');c.require(isinstance(key,str) and re.fullmatch('[a-f0-9]{32}',key),'connector-id-invalid',400)
    worker=identity(data.get('worker_pid',0));c.require(worker and worker['parent_pid']==process['pid'] and worker['uid']==actor.uid and cab_process(worker['pid'],'mcp-worker')==actor.agent,'connector-worker-invalid',403)
    version=data.get('loaded_version');c.require(isinstance(version,str) and re.fullmatch(r'\d+\.\d+\.\d+',version),'connector-version-invalid',400)
    c.require(type(data.get('pending')) is int and 0<=data['pending']<=10000,'connector-pending-invalid',400)
    state=data.get('state');c.require(state in ('READY','BUSY','RELOADING','CATALOG_PENDING','FAILED'),'connector-state-invalid',400)
    row,created=McpConnector.objects.select_for_update().get_or_create(pk=key,defaults={'actor':actor,'agent':actor.agent,'process':process})
    c.require(row.actor_id==actor.pk and row.process==process,'connector-owner-divergent',403)
    changed=row.worker!=worker
    if changed:row.generation+=1;row.catalog_version=''
    else:c.require(row.loaded_version in ('',version),'connector-version-without-restart')
    row.worker=worker;row.loaded_version=version;row.pending=data['pending'];row.state=state
    if data.get('catalog_version')==version:row.catalog_version=version
    row.error=str(data.get('error',''))[:100];row.save()
    return {'connector_id':row.pk,'generation':row.generation,'loaded_version':row.loaded_version,'catalog_version':row.catalog_version}

def snapshot():
    rows=[];managed=[]
    for row in McpConnector.objects.filter(seen__gte=timezone.now()-timedelta(seconds=15)):
        if not alive(row.process):continue
        managed.append(row.process);rows.append({'kind':'managed','connector_id':row.pk,'agent':row.agent,'process':row.process,'owner':identity(row.process['parent_pid']),'generation':row.generation,'loaded_version':row.loaded_version})
    allowed=set(Actor.objects.filter(active=True,agent__in=['codex','opencode']).values_list('uid','agent'))
    rows.extend(legacy_processes(allowed,managed))
    return rows

def assess(targets,version):
    outcomes=[];current=list(McpConnector.objects.filter(seen__gte=timezone.now()-timedelta(seconds=15)))
    for target in targets:
        state='RECONNECTING';detail='';row=None
        if target['kind']=='managed':
            row=next((r for r in current if r.pk==target['connector_id'] and alive(r.process)),None)
            if row is None:
                state='DISCONNECTED' if not alive(target['process']) else 'RECONNECTING';detail='connector-heartbeat-missing'
        elif alive(target['process']):
            row=next((r for r in current if r.process==target['process'] and r.agent==target['agent']),None)
            if row is None:state='RELOAD_REQUIRED';detail='legacy-native-reload-required'
        else:
            candidates=[r for r in current if r.agent==target['agent'] and r.process['uid']==target['process']['uid'] and alive(r.process) and identity(r.process['parent_pid'])==target['owner']]
            ready=[r for r in candidates if r.loaded_version==version and r.catalog_version==version]
            row=ready[0] if ready else candidates[0] if candidates else None
            if row is None:state='DISCONNECTED' if not alive(target['owner']) else 'RELOAD_REQUIRED';detail='native-replacement-not-observed'
        if row:
            state='READY' if row.loaded_version==version and row.catalog_version==version else 'RECONNECTING'
            detail='' if state=='READY' else 'business-request-in-flight' if row.pending else 'catalog-refresh-required' if row.loaded_version==version else 'worker-reload-pending'
        outcomes.append({'kind':target['kind'],'agent':target['agent'],'uid':target['process']['uid'],'original_pid':target['process']['pid'],'state':state,'reason':detail,'connector_id':row.pk if row else None,'loaded_version':row.loaded_version if row else None,'catalog_version':row.catalog_version if row else None,'generation':row.generation if row else None})
    state='RELOAD_REQUIRED' if any(r['state']=='RELOAD_REQUIRED' for r in outcomes) else 'RECONNECTING' if any(r['state']=='RECONNECTING' for r in outcomes) else 'OK'
    return state,outcomes

def attach_active_updates(version):
    for job in SystemUpdate.objects.filter(active_slot=1,state__in=['RUNNING','RESOLVING','DOWNLOADING','INSTALLING','VERIFYING']):
        if job.target_version and job.target_version!=version:continue
        ConnectorReload.objects.get_or_create(update=job,defaults={'targets':snapshot(),'version':version})
