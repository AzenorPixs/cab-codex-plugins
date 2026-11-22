"""Un seul service systemd ; API, workers et Electric supervisés ensemble."""
import asyncio
import concurrent.futures
import logging
import multiprocessing
import os
from pathlib import Path
import signal
import socket
import struct
import subprocess
import sys
import threading
import time
import uvicorn
from uvicorn.protocols.http.h11_impl import H11Protocol
from .paths import CONFIG,RUNTIME,STATE,runtime_config as config,private_dir,read_json
from .logging import configure,redact
log=logging.getLogger('cab.service')

class PeerProtocol(H11Protocol):
    def connection_made(self,transport):
        super().connection_made(transport)
        sock=transport.get_extra_info('socket')
        if sock and sock.family==socket.AF_UNIX:
            pid,uid,gid=struct.unpack('3i',sock.getsockopt(socket.SOL_SOCKET,socket.SO_PEERCRED,12))
            app=self.app
            async def bound(scope,receive,send):
                scope={**scope,'cab.peer':{'pid':pid,'uid':uid,'gid':gid}}
                await app(scope,receive,send)
            self.app=bound

def api_process(port):
    from .asgi import application
    configure()
    runtime=RUNTIME;path=runtime/'cab.sock'
    if path.exists():
        info=path.lstat()
        if not __import__('stat').S_ISSOCK(info.st_mode) or info.st_uid!=os.getuid():raise RuntimeError('cab-socket-unsafe')
        path.unlink()
    unix=socket.socket(socket.AF_UNIX);unix.bind(str(path));os.chmod(path,0o666);unix.listen(128);unix.setblocking(False)
    tcp=socket.socket(socket.AF_INET);tcp.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1);tcp.bind(('127.0.0.1',port));tcp.listen(128);tcp.setblocking(False)
    cfg=uvicorn.Config(application,http=PeerProtocol,log_config=None,access_log=False,timeout_graceful_shutdown=15,server_header=False)
    server=uvicorn.Server(cfg)
    def reload_logging(*_):
        try:configure()
        except (OSError,ValueError,RuntimeError) as error:
            log.error('API configuration reload refused',extra={'code':type(error).__name__})
    signal.signal(signal.SIGHUP,reload_logging)
    asyncio.run(server.serve(sockets=[unix,tcp]))

def refresh_database():
    from django.conf import settings
    from django.db import connections
    cfg=config()
    db={'NAME':cfg['database'],'USER':cfg['database_user'],'PASSWORD':cfg['database_password'],'HOST':cfg['database_host'],'PORT':cfg['database_port']}
    connection=connections['default']
    if any(connection.settings_dict.get(k)!=v for k,v in db.items()):connection.close();connection.settings_dict.update(db);settings.DATABASES['default'].update(db)

def electric_command():
    cfg=config();directory=Path(os.environ.get('CAB_ELECTRIC_ROOT','/usr/lib/cab/electric'))
    from urllib.parse import quote
    url='postgresql://'+quote(cfg['electric_user'],safe='')+':'+quote(cfg['electric_password'],safe='')+'@'+cfg['database_host']+':'+str(cfg['database_port'])+'/'+cfg['database']+'?sslmode=disable'
    storage=private_dir(STATE/'electric')
    env={**os.environ,'ELECTRIC_DATABASE_URL':url,'DATABASE_URL':url,'ELECTRIC_SECRET':cfg['electric_secret'],'ELECTRIC_PORT':str(cfg.get('electric_port',8791)),'ELECTRIC_BIND_ADDRESS':'127.0.0.1','ELECTRIC_STORAGE_DIR':str(storage),'ELECTRIC_MANUAL_TABLE_PUBLISHING':'true','ELECTRIC_USAGE_REPORTING':'false','ELECTRIC_TELEMETRY':'disabled','LANG':'C.UTF-8','LC_ALL':'C.UTF-8'}
    return [str(directory/'bin/entrypoint'),'start'],env,directory

def relay(stream):
    for line in stream:
        log.info(redact(line.strip()),extra={'component':'electric'})

def background_metadata():
    from .finalization import finalize
    from .agent_releases import refresh
    if read_json(STATE/'last-finalization.json',{}).get('deferred') and config().get('initialized'):
        finalize()
    refresh()

def background_closure():
    from django.db import close_old_connections
    from .core.run_lifecycle import sweep
    from .core.operation_recovery import sweep as recover_stopped
    try:recover_stopped();sweep()
    finally:close_old_connections()

def background_native():
    from django.db import close_old_connections
    from .core.native_control import recover,queue_mismatched,work_one
    from .opencode_recovery import sweep as recover_opencode
    from .mcp_disconnect_recovery import sweep as recover_connections
    from .mcp_convergence import sweep as converge
    try:recover();converge();recover_connections();queue_mismatched();work_one();recover_opencode()
    finally:close_old_connections()

def background_agents():
    from django.db import close_old_connections,transaction
    from .agent_binaries import inventory
    from .core.models import Agent
    try:
        observed=inventory()['agents']
        with transaction.atomic():
            for item in observed:
                installed=item['state']=='available'
                values={'installed':installed,'running':bool(item['runtime']['running']),'local_version':item['version'] if installed else None}
                row=Agent.objects.select_for_update().get(pk=item['agent'])
                changed=[key for key,value in values.items() if getattr(row,key)!=value]
                if changed:
                    for key in changed:setattr(row,key,values[key])
                    row.save(update_fields=changed)
    finally:close_old_connections()

def update_agent_mcp():
    from django.db import transaction
    from .core.models import Agent,McpConnectorProjection
    mapping={'codex_desktop':'codex','codex':'codex-cli','opencode':'opencode'}
    rows=list(McpConnectorProjection.objects.filter(connected=True).values_list('agent','loaded_version'))
    with transaction.atomic():
        for row in Agent.objects.select_for_update().filter(pk__in=mapping):
            connections=[version for agent,version in rows if agent==mapping[row.pk]]
            connected=bool(connections)
            versions=sorted({version for version in connections if version}) if connected else row.mcp_versions
            changed=[]
            if row.mcp_connected!=connected:row.mcp_connected=connected;changed.append('mcp_connected')
            if row.mcp_versions!=versions:row.mcp_versions=versions;changed.append('mcp_versions')
            if changed:row.save(update_fields=changed)


def background_updates():
    from .system_updates import dispatch
    from .project_artifacts import dispatch as dispatch_artifact
    from .phase_statistics import dispatch as dispatch_statistics
    from .stage_reminders import launch as launch_reminders
    from .stage_protocol import dispatch as dispatch_stage_protocol
    from .time_projection import launch as launch_time_projection
    dispatch()
    dispatch_artifact()
    dispatch_statistics()
    launch_reminders()
    dispatch_stage_protocol()
    launch_time_projection()
    from .forge_publish_artifacts import dispatch as dispatch_publication
    dispatch_publication()


def background_forge_updates():
    from .forge_version import sweep as sweep_versions
    from .forge_repository import sweep as sweep_repositories
    try:
        sweep_versions()
    finally:
        sweep_repositories()
    from .project_artifacts import sweep as sweep_artifacts
    sweep_artifacts()


def run(port=8790):
    os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
    configure();private_dir(STATE)
    from .postgresql import ensure as ensure_postgresql
    pg_qualification=ensure_postgresql()
    log.info('PostgreSQL qualification: %s',pg_qualification)
    # Le parent des sockets est traversable ; les requêtes exigent ensuite
    # l’identité du pair et son jeton. Les autres états restent0700.
    created=False
    try:RUNTIME.mkdir(mode=0o711,parents=True);created=True
    except FileExistsError:pass
    if created:os.chmod(RUNTIME,0o711)
    import django;django.setup();configure()
    from django.db import DatabaseError
    from . import process_registry
    registry_initialized=bool(config().get('initialized'))
    if registry_initialized:
        retained=process_registry.initialize()
        log.info('Inventaire des binaires : %s', 'conservé pour la mise à jour' if retained else 'réinitialisé')
    stop=threading.Event();reload_requested=threading.Event()
    signal.signal(signal.SIGTERM,lambda *_:stop.set());signal.signal(signal.SIGINT,lambda *_:stop.set());signal.signal(signal.SIGHUP,lambda *_:reload_requested.set())
    from .component_recovery import ChildRecovery, api_ready, electric_ready, observe_daemon
    context=multiprocessing.get_context('spawn')

    def spawn_api():
        child=context.Process(target=api_process,args=(port,))
        child.start()
        return child

    def spawn_electric():
        args,env,cwd=electric_command()
        child=subprocess.Popen(args,env=env,cwd=cwd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,start_new_session=True)
        threading.Thread(target=relay,args=(child.stdout,),daemon=True).start()
        return child

    api_recovery=ChildRecovery('cab-api','API CAB',spawn_api,lambda child:child.is_alive(),
                               lambda child:api_ready(pid=child.pid))
    electric_recovery=ChildRecovery('electric','Electric',spawn_electric,lambda child:child.poll() is None,electric_ready)
    api=api_recovery.tick()
    next_daemon_report=0
    from .service_recovery import InotifyMonitor,PostgresMonitor
    postgres_monitor=PostgresMonitor(was_ready=pg_qualification.get('state') in ('QUALIFIED','MIGRATED'))
    postgres_thread=threading.Thread(target=postgres_monitor.run,args=(stop,),name='cab-postgres-watch',daemon=True)
    postgres_thread.start()
    electric=None;tasks={};recovered=False;next_collect=0;next_metadata=0;metadata=None
    statistics_watcher=None;statistics_future=None;statistics_project=None
    closure_future=None;next_closure=0;next_update=0;next_connectors=0
    update_future=None;availability_future=None;native_future=None;next_native=0
    agents_future=None;next_agents=0
    catalog_future=None;next_catalog=0
    agent_config_future=None;next_agent_config=0
    forge_version_future=None;next_forge_version=0
    git_monitor_thread=None;next_git_monitor=0
    cab_version_signature=None;next_cab_version=0;next_cab_version_refresh=0;next_process_inventory=0
    from .core.models import Operation,Maintenance
    from .core import commands
    from .execution import execute_operation,recover_receipts
    pool=concurrent.futures.ThreadPoolExecutor(max_workers=4,thread_name_prefix='cab-worker')
    metadata_pool=concurrent.futures.ThreadPoolExecutor(max_workers=1,thread_name_prefix='cab-metadata')
    statistics_pool=concurrent.futures.ThreadPoolExecutor(max_workers=1,thread_name_prefix='cab-statistics')
    closure_pool=concurrent.futures.ThreadPoolExecutor(max_workers=1,thread_name_prefix='cab-closure')
    update_pool=concurrent.futures.ThreadPoolExecutor(max_workers=2,thread_name_prefix='cab-update')
    native_pool=concurrent.futures.ThreadPoolExecutor(max_workers=1,thread_name_prefix='cab-native')
    from .agent_catalog import refresh as refresh_agent_catalog
    catalog_pool=concurrent.futures.ThreadPoolExecutor(max_workers=1,thread_name_prefix='cab-agent-catalog')
    agents_pool=concurrent.futures.ThreadPoolExecutor(max_workers=1,thread_name_prefix='cab-agents')
    agent_config_pool=concurrent.futures.ThreadPoolExecutor(max_workers=1,thread_name_prefix='cab-agent-config')
    forge_version_pool=concurrent.futures.ThreadPoolExecutor(max_workers=1,thread_name_prefix='cab-forge-version')
    try:
        while not stop.wait(0.2):
            if native_future is not None and native_future.done():
                try:native_future.result()
                except Exception as error:log.warning('native control unavailable',extra={'code':type(error).__name__})
                native_future=None
            if native_future is None and time.monotonic()>=next_native:
                native_future=native_pool.submit(background_native);next_native=time.monotonic()+1
            if reload_requested.is_set():
                try:
                    level=configure()
                    if api_recovery.confirmed and api and api.is_alive():os.kill(api.pid,signal.SIGHUP)
                    log.info('configuration reloaded: %s',level)
                    log.debug('diagnostic logging enabled')
                except (OSError,ValueError,RuntimeError) as error:
                    log.error('configuration reload refused',extra={'code':type(error).__name__})
                finally:reload_requested.clear()
            api=api_recovery.tick()
            if not config().get('initialized'):continue
            electric=electric_recovery.tick()
            if catalog_future is not None and catalog_future.done():
                try:catalog_future.result()
                except Exception as error:log.warning('agent catalog unavailable',extra={'code':type(error).__name__})
                catalog_future=None
            if catalog_future is None and time.monotonic()>=next_catalog:
                catalog_future=catalog_pool.submit(refresh_agent_catalog);next_catalog=time.monotonic()+15
            if time.monotonic()>=next_daemon_report:
                next_daemon_report=time.monotonic()+5
                observe_daemon()
            if time.monotonic()>=next_process_inventory:
                try:
                    if not registry_initialized:
                        process_registry.initialize();registry_initialized=True
                    supervised={os.getpid():'cab'}
                    if api and api.is_alive():supervised[api.pid]='cab-api'
                    if (postgres_pid:=postgres_monitor.pid):supervised[postgres_pid]='postgresql'
                    if electric is not None and electric.poll() is None:supervised[electric.pid]='electric'
                    process_registry.refresh(supervised)
                except (DatabaseError,OSError,ValueError,RuntimeError) as error:
                    log.warning('inventaire des binaires indisponible',extra={'code':type(error).__name__})
                next_process_inventory=time.monotonic()+3
            if (git_monitor_thread is None or not git_monitor_thread.is_alive()) and time.monotonic()>=next_git_monitor:
                from .git_monitor import run as run_git_monitor
                git_monitor_thread=threading.Thread(target=run_git_monitor,args=(stop,),name='cab-git-watch',daemon=True)
                git_monitor_thread.start();next_git_monitor=time.monotonic()+10
            if agents_future is not None and agents_future.done():
                try:agents_future.result()
                except Exception as error:log.warning('agent observation unavailable',extra={'code':type(error).__name__})
                agents_future=None
            if agents_future is None and time.monotonic()>=next_agents:
                agents_future=agents_pool.submit(background_agents);next_agents=time.monotonic()+2
            try:
                refresh_database()
                if time.monotonic()>=next_cab_version:
                    next_cab_version=time.monotonic()+1
                    try:
                        info=CONFIG.stat();signature=(info.st_dev,info.st_ino,info.st_mtime_ns,info.st_size)
                        if signature!=cab_version_signature or time.monotonic()>=next_cab_version_refresh:
                            from .cab_version import sync
                            if sync():cab_version_signature=signature;next_cab_version_refresh=time.monotonic()+60
                    except (OSError,ValueError,RuntimeError) as error:
                        log.warning('CAB version observation unavailable',extra={'code':type(error).__name__})
                if forge_version_future is not None and forge_version_future.done():
                    try:forge_version_future.result()
                    except Exception as error:log.warning('forge version observation unavailable',extra={'code':type(error).__name__})
                    forge_version_future=None
                if forge_version_future is None and time.monotonic()>=next_forge_version:
                    forge_version_future=forge_version_pool.submit(background_forge_updates);next_forge_version=time.monotonic()+60
                if time.monotonic()>=next_connectors:
                    from .core.connectors import refresh_projection
                    refresh_projection();update_agent_mcp();next_connectors=time.monotonic()+1
                    from .resource_reservations import launch as launch_reservations
                    launch_reservations()
                if time.monotonic()>=next_update:
                    from .update_availability import check as check_update
                    for future in (update_future,availability_future):
                        if future is not None and future.done():
                            try:future.result()
                            except Exception as error:log.warning('update worker unavailable',extra={'code':type(error).__name__})
                    if update_future is None or update_future.done():update_future=update_pool.submit(background_updates)
                    if availability_future is None or availability_future.done():availability_future=update_pool.submit(check_update)
                    next_update=time.monotonic()+2
                recover_receipts()
                if not recovered:
                    configure()
                    # Les opérations engagées ne sont jamais réémises après crash.
                    for op in Operation.objects.filter(state__in=['INTENT','RUNNING']):
                        op.state='UNKNOWN';op.save(update_fields=['state','updated']);commands.event(op.run,'operation-recovery-protected',{'request_id':op.request_id})
                    from .agent_config_reconcile import recover_interrupted
                    recover_interrupted()
                    recovered=True
                for key,future in list(tasks.items()):
                    if future.done():
                        try:future.result()
                        except Exception as error:log.error('worker failed',extra={'code':type(error).__name__})
                        del tasks[key]
                if not Maintenance.objects.filter(state__in=['PREPARED','INSTALLING']).exists():
                    if agent_config_future is not None and agent_config_future.done():
                        try:agent_config_future.result()
                        except Exception as error:log.warning('agent configuration reconciliation unavailable',extra={'code':type(error).__name__})
                        agent_config_future=None
                    if agent_config_future is None and time.monotonic()>=next_agent_config:
                        from .agent_config_reconcile import work_one
                        agent_config_future=agent_config_pool.submit(work_one);next_agent_config=time.monotonic()+1
                    if closure_future is not None and closure_future.done():
                        try:closure_future.result()
                        except Exception as error:log.warning('closure evaluation unavailable',extra={'code':getattr(error,'code',type(error).__name__)})
                        closure_future=None
                    if closure_future is None and time.monotonic()>=next_closure:
                        closure_future=closure_pool.submit(background_closure);next_closure=time.monotonic()+5
                    from .statistics_watch import Watcher,synchronize
                    if statistics_watcher is None:
                        statistics_watcher=InotifyMonitor(Watcher,'inotify-statistics','Surveillance inotify Statistiques')
                    if statistics_future is not None and statistics_future.done():
                        try:statistics_future.result()
                        except Exception as error:log.warning('statistics synchronization unavailable',extra={'code':getattr(error,'code',type(error).__name__)})
                        statistics_future=None
                    due=statistics_watcher.tick()
                    observed=statistics_watcher.watcher
                    if due is not None and observed is not None:
                        env_due=[key for key,at in observed.env_dirty.items() if time.monotonic()-at>=.3]
                        if statistics_future is None and env_due:
                            from .project_metadata import synchronize as synchronize_metadata
                            project_id=env_due[0];observed.env_dirty.pop(project_id,None)
                            statistics_future=statistics_pool.submit(synchronize_metadata,project_id)
                        elif statistics_future is None and due:
                            statistics_project=due[0];observed.dirty.pop(statistics_project,None)
                            statistics_future=statistics_pool.submit(synchronize,statistics_project)
                    for op in Operation.objects.filter(state='WAITING').order_by('pk')[:4]:
                        if len(tasks)>=4:break
                        if op.pk not in tasks:tasks[op.pk]=pool.submit(execute_operation,op.pk)
                if metadata is not None and metadata.done():
                    try:metadata.result()
                    except Exception as error:log.warning('metadata refresh unavailable',extra={'code':type(error).__name__})
                    metadata=None
                if metadata is None and time.monotonic()>=next_metadata:
                    metadata=metadata_pool.submit(background_metadata);next_metadata=time.monotonic()+30
                if time.monotonic()>next_collect:
                    from .collectors import collect
                    from .core.monitor import refresh_changes
                    collect();refresh_changes();next_collect=time.monotonic()+5
            except Exception as error:
                # Une panneSQL n’est jamais une installation neuve ou une fin d’effet.
                log.warning('background unavailable',extra={'code':type(error).__name__});stop.wait(2)
    finally:
        stop.set()
        if git_monitor_thread is not None:git_monitor_thread.join(timeout=30)
        postgres_thread.join(timeout=10)
        forge_version_pool.shutdown(wait=True,cancel_futures=True)
        agent_config_pool.shutdown(wait=True,cancel_futures=True)
        catalog_pool.shutdown(wait=True,cancel_futures=True)
        agents_pool.shutdown(wait=True,cancel_futures=True)
        native_pool.shutdown(wait=True,cancel_futures=True)
        update_pool.shutdown(wait=True,cancel_futures=True)
        closure_pool.shutdown(wait=True,cancel_futures=True)
        statistics_pool.shutdown(wait=True,cancel_futures=True)
        if statistics_watcher is not None:statistics_watcher.close()
        pool.shutdown(wait=True,cancel_futures=True)
        metadata_pool.shutdown(wait=True,cancel_futures=True)
        if electric and electric.poll() is None:
            os.killpg(electric.pid,signal.SIGTERM)
            try:electric.wait(timeout=10)
            except subprocess.TimeoutExpired:os.killpg(electric.pid,signal.SIGKILL);electric.wait()
        if api and api.is_alive():api.terminate();api.join(20)
        if api and api.is_alive():api.kill();api.join()
        log.info('service stopped')
