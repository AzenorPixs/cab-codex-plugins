"""Réconciliation bornée du relais CAB déclaré connecté par OpenCode V2."""
import hashlib
import os
from pathlib import Path
import time
from datetime import timedelta
import httpx
from django.db import transaction,connection
from django.utils import timezone
from . import __version__
from .connector_process import identity,alive
from .core.commands import Refused
from .core.models import AgentUser,Actor,McpConnector,NativeReload
from .core.native_control import boundary,request as native_request
from .native_api import NativeFailure

_next_probe=0.0
_IN_PROGRESS=('QUEUED','DISPATCHED','UNKNOWN','AUTO_OC_DISPATCHED','AUTO_OC_WAITING','AUTO_OC_UNKNOWN')


def listeners(pid):
    sockets=set()
    try:
        for fd in (Path('/proc')/str(pid)/'fd').iterdir():
            try:
                target=os.readlink(fd)
                if target.startswith('socket:[') and target.endswith(']'):sockets.add(target[8:-1])
            except OSError:continue
        ports=[]
        for row in Path('/proc/net/tcp').read_text().splitlines()[1:]:
            fields=row.split();address,port=fields[1].split(':')
            if fields[3]=='0A' and address in ('0100007F','00000000') and fields[9] in sockets:ports.append(int(port,16))
        return sorted(set(ports))
    except (OSError,ValueError,IndexError):return []


def password(pid):
    try:
        raw=(Path('/proc')/str(pid)/'environ').read_bytes()
        if len(raw)>1048576:return None
        found=[item.split(b'=',1)[1] for item in raw.split(b'\0') if item.startswith(b'OPENCODE_PASSWORD=')]
        if len(found)!=1 or not found[0] or len(found[0])>65536:return None
        return found[0].decode('utf-8')
    except (OSError,UnicodeError):return None


def live_connector(actor_id,parent_pid):
    for row in McpConnector.objects.filter(actor_id=actor_id,seen__gte=timezone.now()-timedelta(seconds=15)):
        if row.process.get('parent_pid')==parent_pid and alive(row.process) and alive(row.worker):return True
    return False


def source_is_safe(row):
    if not row.actor.active or row.uncertain or row.pending or alive(row.process) or alive(row.worker):return None
    if row.seen>timezone.now()-timedelta(seconds=30):return None
    if not AgentUser.objects.filter(agent_id='opencode',uid=row.actor.uid).exists():return None
    owner=identity(row.process.get('parent_pid',0))
    if not owner or owner['uid']!=row.actor.uid or owner['boot']!=row.process.get('boot'):return None
    try:
        if int(owner['start'])>=int(row.process['start']):return None
        if Path(os.readlink('/proc/'+str(owner['pid'])+'/exe')).name!='opencode':return None
    except (OSError,ValueError,KeyError):return None
    return owner


def find_client(owner):
    secret=password(owner['pid'])
    if secret is None:return None
    for port in listeners(owner['pid']):
        client=httpx.Client(base_url='http://127.0.0.1:'+str(port),auth=('opencode',secret),timeout=5,follow_redirects=False,trust_env=False)
        try:
            r=client.get('/api/info');r.raise_for_status();info=r.json()
            if isinstance(info,dict) and info.get('pid')==owner['pid'] and str(info.get('version','')).startswith('2.') and identity(owner['pid'])==owner:return client
        except (httpx.HTTPError,ValueError,TypeError):pass
        client.close()
    return None


def directory_and_state(client):
    r=client.get('/api/location');r.raise_for_status();location=r.json()
    if not isinstance(location,dict):return None,None
    directory=location.get('directory')
    if not isinstance(directory,str) or not Path(directory).is_absolute():return None,None
    params={'directory':directory};headers={'x-opencode-directory':directory}
    r=client.get('/api/mcp',params=params,headers=headers);r.raise_for_status();data=r.json()
    if not isinstance(data,dict) or not isinstance(data.get('location'),dict) or data['location'].get('directory')!=directory or not isinstance(data.get('data'),list):return None,None
    cab=next((item for item in data['data'] if isinstance(item,dict) and item.get('name')=='cab'),None)
    if not isinstance(cab,dict) or not isinstance(cab.get('status'),dict):return None,None
    return directory,cab['status'].get('status')


def reconcile_waiting():
    for row in NativeReload.objects.filter(state__in=('AUTO_OC_DISPATCHED','AUTO_OC_WAITING','AUTO_OC_UNKNOWN')):
        if live_connector(row.actor_id,row.owner.get('pid')):
            row.state='AUTO_OC_COMPLETED';row.result={**row.result,'confirmation':'connector-heartbeat'};row.save(update_fields=['state','result','updated'])
        elif row.state!='AUTO_OC_UNKNOWN' and (row.state=='AUTO_OC_DISPATCHED' and not alive(row.dispatcher) or row.updated<timezone.now()-timedelta(seconds=60)):
            row.state='AUTO_OC_UNKNOWN';row.result={**row.result,'error':'reconnection-unconfirmed-no-replay'};row.save(update_fields=['state','result','updated'])


def attempt(row):
    owner=source_is_safe(row)
    if not owner or live_connector(row.actor_id,owner['pid']):return
    client=find_client(owner)
    if client is None:return
    try:
        directory,state=directory_and_state(client)
        if state!='connected' or identity(owner['pid'])!=owner:return
        key='AUTO-OC-'+hashlib.sha256((row.pk+':'+owner['boot']+':'+str(owner['start'])).encode()).hexdigest()
        with transaction.atomic():
            with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_xact_lock(%s)',[300001])
            actor=Actor.objects.select_for_update().get(pk=row.actor_id)
            if NativeReload.objects.filter(actor=actor,state__in=_IN_PROGRESS).exists():return
            if NativeReload.objects.filter(pk=key).exists() or live_connector(actor.pk,owner['pid']):return
            current=McpConnector.objects.filter(pk=row.pk).select_related('actor').first()
            if current is None or source_is_safe(current)!=owner:return
            try:boundary(actor,owner)
            except Refused:return
            NativeReload.objects.create(pk=key,actor=actor,target_version=__version__,owner=owner,input_digest=hashlib.sha256(key.encode()).hexdigest(),state='AUTO_OC_DISPATCHED',dispatcher=identity(os.getpid()) or {},result={'mutation_dispatched':True,'connector_id':row.pk})
        if live_connector(actor.pk,owner['pid']):
            NativeReload.objects.filter(pk=key,state='AUTO_OC_DISPATCHED').update(state='AUTO_OC_COMPLETED',result={'mutation_dispatched':False,'confirmation':'connector-heartbeat'});return
        params={'directory':directory};headers={'x-opencode-directory':directory}
        try:
            client.post('/api/experimental/mcp/cab/disconnect',params=params,headers=headers).raise_for_status()
            client.post('/api/experimental/mcp/cab/connect',params=params,headers=headers).raise_for_status()
        except (httpx.HTTPError,OSError,ValueError):
            NativeReload.objects.filter(pk=key,state='AUTO_OC_DISPATCHED').update(state='AUTO_OC_UNKNOWN',result={'mutation_dispatched':True,'error':'reconnection-unconfirmed-no-replay'});return
        NativeReload.objects.filter(pk=key,state='AUTO_OC_DISPATCHED').update(state='AUTO_OC_WAITING',result={'mutation_dispatched':True,'confirmation':'awaiting-connector-heartbeat'})
    except (httpx.HTTPError,OSError,ValueError,TypeError,KeyError):return
    finally:client.close()



def attempt_codex(row):
    if row.agent not in ('codex','codex-cli') or not row.actor.active or not row.actor.native or row.uncertain or row.pending:return
    if row.seen>timezone.now()-timedelta(seconds=30) or alive(row.process) or alive(row.worker):return
    owner=identity(row.process.get('parent_pid',0))
    if not owner or owner['uid']!=row.actor.uid or owner['boot']!=row.process.get('boot'):return
    try:
        if int(owner['start'])>=int(row.process['start']) or live_connector(row.actor_id,owner['pid']):return
        key='AUTO-MCP-'+hashlib.sha256((row.pk+':'+owner['boot']+':'+str(owner['start'])).encode()).hexdigest()
        if NativeReload.objects.filter(pk=key).exists():return
        native_request(row.actor,{'request_id':key,'version':__version__},expected=owner)
    except (Refused,NativeFailure,ValueError,KeyError):return


def sweep():
    global _next_probe
    if time.monotonic()<_next_probe:return
    _next_probe=time.monotonic()+15
    reconcile_waiting()
    seen=set()
    for row in McpConnector.objects.filter(agent__in=('opencode','codex','codex-cli')).select_related('actor').order_by('actor_id','-seen'):
        key=(row.actor_id,row.agent,row.process.get('parent_pid'))
        if key in seen:continue
        seen.add(key)
        if row.agent=='opencode':attempt(row)
        else:attempt_codex(row)
