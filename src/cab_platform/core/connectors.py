"""Registre authentifié et observations de rechargement CABU."""
import os
import re
import select
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from cab_platform.connector_process import identity,alive,cab_process,legacy_processes
from . import commands as c
from .models import Actor,McpConnector,ConnectorReload,SystemUpdate,McpConnectorProjection,McpStopAttempt

def observed_dead(saved):
    if not isinstance(saved,dict) or not all(key in saved for key in ('pid','uid','start','boot')):return False
    try:fd=os.pidfd_open(saved['pid'])
    except ProcessLookupError:return True
    except (OSError,ValueError,TypeError):return False
    try:
        current=identity(saved['pid'])
        if current is not None and current!=saved:return True
        return bool(select.select([fd],[],[],0)[0])
    finally:os.close(fd)

def worker_connector(actor,peer):
    """Identifie uniquement le relais parent du processus MCP appelant."""
    if not peer or peer.get('uid')!=actor.uid:
        return None
    worker=identity(peer.get('pid',0))
    if not worker or cab_process(worker['pid'],'mcp-worker')!=actor.agent:
        return None
    matches=[row for row in McpConnector.objects.filter(actor=actor).exclude(state='SUPERSEDED') if row.worker==worker and alive(row.process)]
    c.require(len(matches)<=1,'connector-worker-ambiguous',409)
    return matches[0] if matches else None


def observe_native_worker(actor,run,peer):
    """Observation kernel, sans inventer version, catalogue ou heartbeat."""
    if not peer or peer.get('uid')!=actor.uid or not actor.active:return None
    worker=identity(peer.get('pid',0))
    if not worker or worker['uid']!=actor.uid or cab_process(worker['pid'],'mcp-worker')!=actor.agent:return None
    parent=identity(worker['parent_pid'])
    if not parent or parent['uid']!=actor.uid or cab_process(parent['pid'],'mcp')!=actor.agent:return None
    from .run_lifecycle import guard
    guard(run,allow_measurement=True)
    c.require(not run.mandate.get('native_frozen_at') and not run.mandate.get('legacy_snapshot_id'),'native-worker-observation-protected',409)
    # Ce verrou sérialise aussi le premier heartbeat du relais réel.
    Actor.objects.select_for_update().get(pk=actor.pk)
    existing=worker_connector(actor,peer)
    if existing is not None:return existing
    c.require(not McpConnector.objects.filter(actor=actor,process=parent).exclude(state='SUPERSEDED').exists(),'connector-parent-observation-divergent',409)
    c.require(identity(worker['pid'])==worker and identity(parent['pid'])==parent,'connector-process-changed',409)
    key=c.digest({'actor':actor.pk,'parent':parent,'worker':worker})[:32]
    row=McpConnector.objects.create(pk=key,actor=actor,agent=actor.agent,process=parent,worker=worker,state='OBSERVED',uncertain=True,pending=0,error='native-worker-observed-without-heartbeat')
    project_connector(row)
    c.event(run,'native-worker-observed',{'connector_id':row.pk,'process':parent,'worker':worker,'loaded_version_observed':False,'catalog_observed':False})
    return row


def adopt_native_observation(actor,row):
    from .models import McpRunBinding,McpThreadBinding
    observed=McpConnector.objects.select_for_update().filter(actor=actor,process=row.process,worker=row.worker,state='OBSERVED').exclude(pk=row.pk)
    for previous in observed:
        binding=McpRunBinding.objects.select_for_update().filter(connector=previous).first()
        target=McpRunBinding.objects.select_for_update().filter(connector=row).first()
        if binding:
            c.require(target is None or target.run_id==binding.run_id,'connector-binding-adoption-conflict',409)
            if target is None:McpRunBinding.objects.filter(pk=binding.pk).update(connector=row)
            else:binding.delete()
            from .models import Event
            # Pas de FK RUN : aucun verrou RUN après les verrous de connecteur.
            Event.objects.create(project_id=binding.run.project_id,kind='native-worker-heartbeat-adopted',data={'project_id':binding.run.project_id,'run_pk':binding.run_id,'run_id':binding.run.run_id,'session_id':binding.run.session_id,'provenance':'authenticated-parent-heartbeat','previous_connector_id':previous.pk,'connector_id':row.pk,'worker':row.worker})
        for item in McpThreadBinding.objects.select_for_update().filter(connector=previous):
            other=McpThreadBinding.objects.filter(connector=row,thread=item.thread).first()
            c.require(other is None or other.run_id==item.run_id,'connector-binding-adoption-conflict',409)
            if other:item.delete()
            else:item.connector=row;item.save(update_fields=['connector'])
        previous.state='SUPERSEDED';previous.error='native-worker-observation-adopted';previous.save(update_fields=['state','error','seen']);project_connector(previous)


@transaction.atomic
def bind_worker_run(actor,data,peer,*,native_thread=None):
    from .models import McpRunBinding,McpThreadBinding
    Actor.objects.select_for_update().get(pk=actor.pk)
    run=c.run_scope(actor,data['run_id'],data['project_id'],lock=True)
    c.require(bool(run.mandate.get('native_source')),'native-source-not-bound',409)
    connector=worker_connector(actor,peer)
    if connector is None:connector=observe_native_worker(actor,run,peer)
    if connector is None:return False
    connector=McpConnector.objects.select_for_update().get(pk=connector.pk)
    c.require(connector.state!='SUPERSEDED' and connector.actor_id==actor.pk and connector.worker==identity(peer['pid']) and alive(connector.process),'connector-owner-divergent',403)
    if native_thread is not None:
        c.require(actor.agent in ('codex','codex-cli') and native_thread==run.session_id,
                  'session-native-thread-divergent',403)
        previous=McpThreadBinding.objects.select_for_update().select_related('run').filter(connector=connector,thread=native_thread).first()
        if previous and previous.run_id!=run.pk:
            c.require(c.no_pending(previous.run),'session-connector-busy',409)
        McpThreadBinding.objects.update_or_create(connector=connector,thread=native_thread,defaults={'run':run})
        return True
    c.require(not McpThreadBinding.objects.filter(connector=connector).exists(),'session-native-thread-required',403)
    previous=McpRunBinding.objects.select_for_update().select_related('run').filter(connector=connector).first()
    if previous is not None and previous.run_id!=run.pk:
        c.require(c.no_pending(previous.run),'session-connector-busy',409)
        if previous.run.session_id!=run.session_id:
            c.require(previous.run.state=='CLOSED','session-connector-shared',409)
    McpRunBinding.objects.update_or_create(connector=connector,defaults={'run':run})
    return True


def lock_worker_binding(actor,connector_id,run):
    """Fige la liaison pendant l'admission d'un effet Git."""
    from .models import McpRunBinding,McpThreadBinding
    connector=McpConnector.objects.select_for_update().filter(pk=connector_id,actor=actor).exclude(state='SUPERSEDED').first()
    c.require(connector is not None and alive(connector.process) and alive(connector.worker),'session-connector-unbound',409)
    binding=McpRunBinding.objects.select_for_update().filter(connector=connector,run=run).first()
    if binding is None:
        binding=McpThreadBinding.objects.select_for_update().filter(connector=connector,run=run,thread=run.session_id).first()
    c.require(binding is not None,'session-connector-run-divergent',403)


def current_worker_run(actor,peer,*,read_only=False,native_thread=None):
    from .models import McpRunBinding,McpThreadBinding
    connector=worker_connector(actor,peer)
    c.require(connector is not None,'session-connector-unbound',409)
    if native_thread is None:
        c.require(not McpThreadBinding.objects.filter(connector=connector).exists(),'session-native-thread-required',403)
        binding=McpRunBinding.objects.select_related('run__project','run__actor').filter(connector=connector).first()
    else:
        c.require(bool(native_thread) and actor.agent in ('codex','codex-cli'),'session-native-thread-required',403)
        binding=McpThreadBinding.objects.select_related('run__project','run__actor').filter(connector=connector,thread=native_thread,run__session_id=native_thread).first()
    c.require(binding is not None and binding.run.actor_id==actor.pk,'session-connector-unbound',409)
    run=binding.run;c.scope(actor,run.project)
    if read_only:return run
    c.working(run)
    source=c.resolve_native(actor,run.project,run.session_id,{'codex_home':run.mandate.get('native_source_home','')},run=run)
    c.require(source==run.mandate.get('native_source'),'native-source-resume-required',409)
    return run


@transaction.atomic
def heartbeat(actor,data,peer):
    c.require(actor.active and actor.agent in ('codex','codex-cli','opencode'),'connector-actor-invalid',403)
    c.require(peer and peer['uid']==actor.uid,'connector-peer-required',403)
    process=identity(peer['pid']);c.require(process and cab_process(peer['pid'],'mcp')==actor.agent,'connector-process-invalid',403)
    key=data.get('connector_id');c.require(isinstance(key,str) and re.fullmatch('[a-f0-9]{32}',key),'connector-id-invalid',400)
    worker=identity(data.get('worker_pid',0));c.require(worker and worker['parent_pid']==process['pid'] and worker['uid']==actor.uid and cab_process(worker['pid'],'mcp-worker')==actor.agent,'connector-worker-invalid',403)
    version=data.get('loaded_version');c.require(isinstance(version,str) and re.fullmatch(r'\d+\.\d+\.\d+',version),'connector-version-invalid',400)
    c.require(type(data.get('pending')) is int and 0<=data['pending']<=10000,'connector-pending-invalid',400)
    state=data.get('state');c.require(state in ('READY','BUSY','RELOADING','CATALOG_PENDING','FAILED'),'connector-state-invalid',400)
    Actor.objects.select_for_update().get(pk=actor.pk)
    others=McpConnector.objects.filter(actor=actor,process=process).exclude(pk=key).exclude(state='SUPERSEDED')
    c.require(not others.exclude(state='OBSERVED',worker=worker).exists(),'connector-process-already-registered',409)
    row,created=McpConnector.objects.select_for_update().get_or_create(pk=key,defaults={'actor':actor,'agent':actor.agent,'process':process})
    c.require(row.actor_id==actor.pk and row.process==process,'connector-owner-divergent',403)
    changed=row.worker!=worker
    if changed:row.generation+=1;row.catalog_version=''
    else:c.require(row.loaded_version in ('',version),'connector-version-without-restart')
    row.worker=worker;row.loaded_version=version;row.pending=data['pending'];row.state=state
    uncertain=data.get('uncertain',state=='FAILED');c.require(type(uncertain) is bool,'connector-uncertainty-invalid',400);row.uncertain=uncertain
    relay=data.get('relay_version','')
    c.require(relay=='' or isinstance(relay,str) and re.fullmatch(r'\d+\.\d+\.\d+',relay),'connector-relay-version-invalid',400)
    row.relay_version=relay
    if data.get('catalog_version')==version:row.catalog_version=version
    row.error=str(data.get('error',''))[:100];row.save()
    adopt_native_observation(actor,row)
    project_connector(row)
    return {'connector_id':row.pk,'generation':row.generation,'loaded_version':row.loaded_version,'catalog_version':row.catalog_version}

@transaction.atomic
def project_connector(row):
    from cab_platform.mcp_disconnect_recovery import capture_anchor,enqueue
    row=McpConnector.objects.select_for_update(of=('self',)).select_related('actor').get(pk=row.pk)
    connected=(row.seen>=timezone.now()-timedelta(seconds=15) and alive(row.process) and alive(row.worker)
               and row.state in ('READY','BUSY') and not row.uncertain
               and bool(row.loaded_version) and row.catalog_version==row.loaded_version)
    if connected:
        anchor=capture_anchor(row)
        if anchor and anchor!=row.recovery_anchor:
            row.recovery_anchor=anchor;row.save(update_fields=['recovery_anchor'])
    values={'agent':row.agent,'uid':row.actor.uid,'loaded_version':row.loaded_version,'catalog_version':row.catalog_version,'relay_version':row.relay_version,'state':row.state,'connected':connected}
    current=McpConnectorProjection.objects.filter(connector=row).first()
    if current and all(getattr(current,key)==value for key,value in values.items()):return
    if current and current.connected and not connected and row.state!='SUPERSEDED':
        enqueue(row)
    McpConnectorProjection.objects.update_or_create(connector=row,defaults=values)

def refresh_projection():
    from django.db.models import Q
    active=Q(seen__gte=timezone.now()-timedelta(seconds=15))|Q(public_projection__connected=True)|Q(public_projection__isnull=True)
    for row in McpConnector.objects.filter(active).select_related('actor').iterator():project_connector(row)

@transaction.atomic
def disconnected(actor,data,peer):
    row=McpConnector.objects.select_for_update().get(pk=data['connector_id'])
    c.require(peer and row.actor_id==actor.pk and row.process==identity(peer['pid']),'connector-owner-divergent',403)
    row.state='DISCONNECTED';row.save(update_fields=['state','seen']);project_connector(row)
    return {'state':'DISCONNECTED'}

@transaction.atomic
def stop_report(actor,data,peer):
    from cab_platform.worker_stop import policy
    c.require(peer and peer['uid']==actor.uid,'connector-peer-required',403)
    row=McpConnector.objects.select_for_update().get(pk=data['connector_id'])
    c.require(row.actor_id==actor.pk and row.process==identity(peer['pid']),'connector-owner-divergent',403)
    key=data.get('attempt_id');c.require(isinstance(key,str) and re.fullmatch('[a-f0-9]{32}',key),'connector-stop-id-invalid',400)
    report=data.get('report');c.require(isinstance(report,dict) and set(report)<={'worker','policy','state','stages','reason'},'connector-stop-report-invalid',400)
    digest=c.digest(report);previous=McpStopAttempt.objects.filter(pk=key).first()
    if previous:
        c.require(previous.connector_id==row.pk and previous.digest==digest,'connector-stop-receipt-conflict');return {'attempt_id':key,'digest':digest}
    c.require(report.get('worker')==row.worker and report.get('state') in ('STOPPED','DEFERRED','REFUSED'),'connector-stop-worker-divergent')
    c.require(isinstance(report.get('stages'),list) and len(report['stages'])<=3 and all(stage in ('stdin-eof','SIGTERM','SIGKILL') for stage in report['stages']),'connector-stop-stages-invalid',400)
    c.require(isinstance(report.get('reason'),str) and re.fullmatch('[A-Za-z0-9-]{1,100}',report['reason']),'connector-stop-reason-invalid',400)
    settings=policy(report['policy'])
    c.require('SIGKILL' not in report['stages'] or settings['allow_sigkill'],'connector-stop-sigkill-not-authorized')
    if report['state']=='STOPPED':c.require(not alive(row.worker),'connector-stop-not-observed')
    McpStopAttempt.objects.create(pk=key,connector=row,report=report,digest=digest)
    import logging
    logger=logging.getLogger('cab.connectors')
    logger.log(logging.WARNING if 'SIGKILL' in report['stages'] or report['state']!='STOPPED' else logging.INFO,'MCP worker stop %s: %s (%s)',row.pk,report['state'],','.join(report['stages']),extra={'code':report['reason']})
    return {'attempt_id':key,'digest':digest}

def snapshot():
    rows=[];managed=[]
    for row in McpConnector.objects.filter(seen__gte=timezone.now()-timedelta(seconds=15)).exclude(state='SUPERSEDED'):
        if not alive(row.process):continue
        managed.append(row.process);rows.append({'kind':'managed','connector_id':row.pk,'agent':row.agent,'process':row.process,'owner':identity(row.process['parent_pid']),'generation':row.generation,'loaded_version':row.loaded_version})
    allowed=set(Actor.objects.filter(active=True,agent__in=['codex','codex-cli','opencode']).values_list('uid','agent'))
    rows.extend(legacy_processes(allowed,managed))
    return rows

def assess(targets,version,confirmed_disconnected=(),*,recovery=None,shared_owner=None):
    outcomes=[];current=list(McpConnector.objects.filter(seen__gte=timezone.now()-timedelta(seconds=15)).exclude(state='SUPERSEDED'))
    from cab_platform.cabu_recovery_policy import same_instance
    recovery = recovery or {}
    replacement = recovery.get('replacement')
    used = set()
    shared_groups={}
    if recovery.get('shared_stdio') and replacement and alive(replacement):
        active=[candidate for candidate in current
                if candidate.state not in ('OBSERVED','DISCONNECTED') and alive(candidate.process)]
        for candidate in active:
            owner=identity(candidate.process.get('parent_pid',0))
            if owner and owner['parent_pid']==replacement['pid'] and owner['uid']==replacement['uid'] and sum(
                    other.agent==candidate.agent for other in active)==1:
                shared_groups.setdefault(candidate.agent,[]).append(candidate)
    needs_share=shared_owner and sum(
        same_instance(target.get('owner'),shared_owner) and alive(target['process'])
        for target in targets
    )>1
    original_ids={target.get('connector_id') for target in targets if target.get('kind')=='managed'}
    for target in targets:
        state='RECONNECTING';detail='';row=None
        confirmed=next((item for item in confirmed_disconnected if item.get('connector_id')==target.get('connector_id') and item.get('process')==target.get('process')),None)
        if confirmed and observed_dead(target['process']) and observed_dead(confirmed.get('worker')):
            outcomes.append({'kind':target['kind'],'agent':target['agent'],'uid':target['process']['uid'],'original_pid':target['process']['pid'],'state':'DISCONNECTED','reason':'operator-confirmed-disconnected','connector_id':target.get('connector_id'),'loaded_version':None,'catalog_version':None,'generation':confirmed.get('generation')})
            continue
        if target['kind']=='managed':
            row=next((r for r in current if r.pk==target['connector_id'] and alive(r.process)),None)
            if row is None:
                if not alive(target['process']) and alive(target.get('owner')):
                    from cab_platform.native_api import same_instance
                    candidates=[r for r in current if r.pk not in original_ids and r.agent==target['agent'] and r.process['uid']==target['process']['uid'] and alive(r.process) and same_instance(identity(r.process['parent_pid']),target['owner'])]
                    row=next((r for r in candidates if r.loaded_version==version and r.catalog_version==version),candidates[0] if candidates else None)
                    state='RELOAD_REQUIRED' if row is None else 'RECONNECTING';detail='native-replacement-not-observed'
                else:state='DISCONNECTED' if not alive(target['process']) else 'RECONNECTING';detail='connector-heartbeat-missing'
        elif alive(target['process']):
            row=next((r for r in current if r.process==target['process'] and r.agent==target['agent']),None)
            if row is None:state='RELOAD_REQUIRED';detail='legacy-native-reload-required'
        else:
            candidates=[r for r in current if r.agent==target['agent'] and r.process['uid']==target['process']['uid'] and alive(r.process) and identity(r.process['parent_pid'])==target['owner']]
            ready=[r for r in candidates if r.loaded_version==version and r.catalog_version==version]
            row=ready[0] if ready else candidates[0] if candidates else None
            if row is None:state='DISCONNECTED' if not alive(target['owner']) else 'RELOAD_REQUIRED';detail='native-replacement-not-observed'
        if recovery and same_instance(target.get('owner'), recovery.get('backend')):
            row = None
            state = 'RELOAD_REQUIRED'
            detail = 'frontend-recovery-' + recovery['state'].lower().replace('_', '-')
            if recovery.get('shared_stdio'):
                group=shared_groups.get(target['agent'],[])
                if len(group)==1 and group[0].relay_version==version and not alive(target['process']):
                    row=group[0]
            elif replacement and alive(replacement):
                for candidate in current:
                    if (candidate.pk in used or candidate.pk in original_ids or candidate.agent != target['agent']
                        or candidate.process['uid'] != replacement['uid'] or not alive(candidate.process)):
                        continue
                    owner = identity(candidate.process['parent_pid'])
                    if owner and owner['uid'] == replacement['uid'] and owner['parent_pid'] == replacement['pid']:
                        if candidate.loaded_version == version and candidate.catalog_version == version and candidate.state in ('READY','BUSY') and not candidate.uncertain and alive(candidate.worker):
                            row = candidate
                            used.add(row.pk)
                            break
        if row:
            ready=row.loaded_version==version and row.catalog_version==version and row.state in ('READY','BUSY') and not row.uncertain and alive(row.worker)
            state='READY' if ready else 'RECONNECTING'
            detail='' if ready else row.error if row.state=='FAILED' and row.error else 'business-request-in-flight' if row.pending else 'catalog-refresh-required' if row.loaded_version==version else 'worker-reload-pending'
        if (not recovery and same_instance(target.get('owner'),shared_owner)
                and (needs_share or row and row.relay_version!=version)):
            state='RELOAD_REQUIRED';detail='shared-stdio-replacement-required'
        outcomes.append({'kind':target['kind'],'agent':target['agent'],'uid':target['process']['uid'],'original_pid':target['process']['pid'],'state':state,'reason':detail,'connector_id':row.pk if row else None,'loaded_version':row.loaded_version if row else None,'catalog_version':row.catalog_version if row else None,'generation':row.generation if row else None})
    state='RELOAD_REQUIRED' if any(r['state']=='RELOAD_REQUIRED' for r in outcomes) else 'RECONNECTING' if any(r['state']=='RECONNECTING' for r in outcomes) else 'OK'
    return state,outcomes

def attach_active_updates(version):
    for job in SystemUpdate.objects.filter(active_slot=1,state__in=['RUNNING','RESOLVING','DOWNLOADING','INSTALLING','VERIFYING']):
        if job.target_version and job.target_version!=version:continue
        ConnectorReload.objects.get_or_create(update=job,defaults={'targets':snapshot(),'version':version})
