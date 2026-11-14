"""Admission durable des contrôles natifs, distincte des requêtes métier."""
import os
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from cab_platform import __version__
from cab_platform.connector_process import identity,alive
from cab_platform.native_api import NativeFailure,codex_peer,codex_frontends,instance_key,same_instance,reload_codex,reload_opencode
from . import commands as c
from .models import Actor,McpConnector,NativeReload,Operation,Lease,Maintenance

PENDING=('QUEUED','DISPATCHED','UNKNOWN')

def target_actor(caller,data):
    key=data.get('actor_id',caller.pk)
    c.require(key==caller.pk or caller.role=='admin','native-control-owner-required',403)
    actor=Actor.objects.get(pk=key)
    c.require(actor.active and actor.agent in ('codex','codex-cli','opencode'),'native-control-agent-invalid')
    return actor

def boundary(actor,owner):
    c.require(not Operation.objects.filter(run__actor=actor).exclude(state__in=c.TERMINAL).exists(),'native-control-effects-protected')
    c.require(not Lease.objects.filter(run__actor=actor,state='HELD').exists(),'native-control-effects-protected')
    c.require(not Maintenance.objects.filter(state__in=['PREPARED','INSTALLING']).exists(),'maintenance-in-progress')
    c.require(not any(r.pending or r.uncertain for r in McpConnector.objects.filter(actor=actor,seen__gte=timezone.now()-timedelta(seconds=15)) if r.process.get('parent_pid')==owner.get('pid')),'native-control-client-busy')

def endpoint(actor,expected=None):
    native=actor.native
    if actor.agent in ('codex','codex-cli'):
        owner=codex_peer(native.get('control_socket'),actor.uid)
        if expected and not same_instance(owner,expected):raise NativeFailure('native-instance-divergent')
        frontends=codex_frontends(owner,actor.agent)
        if not frontends:raise NativeFailure('native-client-socket-attachment-required')
        return owner
    owner=identity(native.get('pid',0))
    if not owner or owner['uid']!=actor.uid or str(owner['start'])!=str(native.get('start_time')) or expected and not same_instance(expected,owner):
        raise NativeFailure('native-instance-divergent')
    return owner

def public(row):return {'request_id':row.pk,'actor_id':row.actor_id,'state':row.state,'target_version':row.target_version,**row.result}

@transaction.atomic
def configure(caller,data):
    actor=target_actor(caller,data)
    allowed={'actor_id','control_socket','control_binary','pid','url','password_file','username'}
    c.require(not set(data)-allowed,'native-control-fields-invalid',400)
    native={**actor.native,**{key:value for key,value in data.items() if key!='actor_id'}}
    if actor.agent=='opencode':
        owner=identity(native.get('pid',0));c.require(owner and owner['uid']==actor.uid,'native-instance-divergent')
        native['start_time']=owner['start'];actor.native=native
        from cab_platform.opencode import connection
        with connection(actor) as api:
            response=api.get('/api/info');c.require(response.status_code==200,'native-api-unavailable')
            c.require(response.json().get('pid')==owner['pid'],'native-instance-divergent')
    native['control_generation']=actor.native.get('control_generation',0)+1
    actor.native=native;actor.save(update_fields=['native'])
    try:owner=endpoint(actor);state='READY'
    except NativeFailure as error:owner={};state=error.code
    c.event(None,'native-control-configured',{'actor_id':actor.pk,'state':state,'owner':owner})
    return {'actor_id':actor.pk,'state':state,'owner':owner,'credentials_exposed':False}

@transaction.atomic
def request(caller,data,expected=None):
    actor=target_actor(caller,data);key=c.identifier(data['request_id']);version=data.get('version',__version__)
    c.require(version==__version__,'native-control-version-divergent',400)
    fingerprint=c.digest({'actor_id':actor.pk,'version':version,'expected_owner':instance_key(expected)})
    previous=NativeReload.objects.filter(pk=key).first()
    if previous:
        c.require(previous.actor_id==actor.pk and previous.input_digest==fingerprint,'native-control-request-conflict')
        return public(previous)
    # Le verrou du compte sérialise l'admission de contrôles concurrents.
    Actor.objects.select_for_update().get(pk=actor.pk)
    owner=endpoint(actor,expected)
    c.require(not NativeReload.objects.filter(actor=actor,owner__pid=owner['pid'],owner__uid=owner['uid'],owner__start=owner['start'],owner__boot=owner['boot'],state__in=PENDING).exists(),'native-control-pending')
    # L'admission peut être en attente ; la frontière est revérifiée au dispatch.
    before=[{'id':r.pk,'generation':r.generation,'worker':r.worker} for r in McpConnector.objects.filter(actor=actor) if r.process.get('parent_pid')==owner['pid'] and alive(r.process)]
    row=NativeReload.objects.create(pk=key,actor=actor,target_version=version,owner=owner,input_digest=fingerprint,result={'before':before})
    return public(row)

def status(caller,data):
    row=NativeReload.objects.get(pk=data['request_id']);c.require(row.actor_id==caller.pk or caller.role=='admin','native-control-owner-required',403)
    return public(row)

def work_one():
    with transaction.atomic():
        row=NativeReload.objects.select_for_update(skip_locked=True).filter(state='QUEUED').order_by('updated','created').first()
        if row is None:return
        from django.db import connection
        with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_xact_lock(%s)',[300001])
        try:
            owner=endpoint(row.actor,row.owner);boundary(row.actor,owner)
        except c.Refused as error:
            row.result={**row.result,'waiting_reason':error.code,'mutation_dispatched':False};row.save();return
        except NativeFailure as error:
            row.state='UNAVAILABLE';row.result={**row.result,'error':getattr(error,'code',str(error)),'mutation_dispatched':False};row.save();return
        row.state='DISPATCHED';row.dispatcher=identity(os.getpid());row.save()
    # L'intention est commitée avant le premier appel pouvant modifier le client.
    try:
        result=reload_opencode(row.actor) if row.actor.agent=='opencode' else reload_codex({**row.actor.native,'control_process':row.owner},row.actor.uid,row.pk)
        state='COMPLETED'
    except NativeFailure as error:state=error.state;result={'error':error.code}
    except Exception as error:state='UNKNOWN';result={'error':'native-control-unconfirmed','error_type':type(error).__name__}
    with transaction.atomic():
        current=NativeReload.objects.select_for_update().get(pk=row.pk)
        if current.state=='DISPATCHED':current.state=state;current.result={**current.result,**result};current.save()

def recover():
    for row in NativeReload.objects.filter(state='DISPATCHED'):
        if not alive(row.dispatcher):row.state='UNKNOWN';row.result={**row.result,'error':'native-control-worker-disappeared-no-replay'};row.save()
    for row in NativeReload.objects.filter(state='UNKNOWN'):
        old={r['id']:r for r in row.result.get('before',[])}
        current=[r for r in McpConnector.objects.filter(actor=row.actor,seen__gte=timezone.now()-timedelta(seconds=5)) if r.process.get('parent_pid')==row.owner.get('pid') and alive(r.process)]
        changed=any(r.pk not in old or r.generation>old[r.pk]['generation'] or r.worker!=old[r.pk]['worker'] for r in current)
        if current and changed and all(r.loaded_version==r.catalog_version==row.target_version and r.state=='READY' and not r.pending and not r.uncertain for r in current):
            try:endpoint(row.actor,row.owner);boundary(row.actor,row.owner)
            except (NativeFailure,c.Refused):continue
            row.state='COMPLETED';row.result={**row.result,'uncertainty_reconciled':True,'confirmation':'observed-new-native-MCP-catalogue','observed_connectors':[r.pk for r in current]};row.save()

def ensure_update(update):
    """Une admission par instance/version ; aucune répétition d'un contrôle."""
    from .models import ConnectorReload
    record=ConnectorReload.objects.filter(update=update).first()
    if not record:return
    for item in record.targets:
        connector=McpConnector.objects.filter(pk=item.get('connector_id')).select_related('actor').first()
        if not connector or not connector.actor.native:continue
        owner=item.get('owner');key=automatic_key(connector.actor,owner,record.version)
        try:request(connector.actor,{'request_id':key,'version':record.version},expected=owner)
        except (NativeFailure,c.Refused):continue

def automatic_key(actor,owner,version):return 'NATIVE-'+c.digest([actor.pk,instance_key(owner),version,actor.native.get('control_generation',0)])

def gate(actor,connector,version):
    """Le relais consulte l'API avant d'envisager son repli local."""
    expected=identity(connector.process.get('parent_pid',0))
    try:
        if expected:
            pending=NativeReload.objects.filter(actor=actor,owner__pid=expected['pid'],owner__uid=expected['uid'],owner__start=expected['start'],owner__boot=expected['boot'],state__in=PENDING).first()
            if pending:return {'mode':'wait-native','request_id':pending.pk,'state':pending.state}
        endpoint(actor,expected)
        key=automatic_key(actor,expected,version)
        row=NativeReload.objects.filter(pk=key,actor=actor).first()
        if row is None:return {'mode':'request-native','request_id':key}
        result=public(row)
        return {'mode':'fallback' if result['state']=='UNAVAILABLE' else 'wait-native','request_id':key,'state':result['state']}
    except NativeFailure as error:return {'mode':'fallback','reason':error.code}
    except c.Refused as error:return {'mode':'wait-native','reason':error.code}

def request_connector(actor,data,peer):
    connector=McpConnector.objects.get(pk=data['connector_id'])
    c.require(peer and connector.actor_id==actor.pk and connector.process==identity(peer['pid']),'connector-owner-divergent',403)
    state=gate(actor,connector,data['version'])
    if state['mode']=='request-native':
        return request(actor,{'request_id':state['request_id'],'version':data['version']},expected=identity(connector.process['parent_pid']))
    return state

def queue_mismatched():
    for connector in McpConnector.objects.filter(seen__gte=timezone.now()-timedelta(seconds=15)).select_related('actor'):
        if connector.loaded_version==__version__ and connector.catalog_version==__version__:continue
        if not alive(connector.process) or connector.pending or connector.uncertain:continue
        actor=connector.actor
        if not actor.native:continue
        try:
            state=gate(actor,connector,__version__)
            if state['mode']=='request-native':request(actor,{'request_id':state['request_id'],'version':__version__},expected=identity(connector.process['parent_pid']))
        except (NativeFailure,c.Refused):continue
