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
    try:sweep()
    finally:close_old_connections()


def run(port=8790):
    os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
    configure();private_dir(STATE)
    # Le parent des sockets est traversable ; les requêtes exigent ensuite
    # l’identité du pair et son jeton. Les autres états restent0700.
    RUNTIME.mkdir(mode=0o711,parents=True,exist_ok=True);os.chmod(RUNTIME,0o711)
    import django;django.setup();configure()
    stop=threading.Event();reload_requested=threading.Event()
    signal.signal(signal.SIGTERM,lambda *_:stop.set());signal.signal(signal.SIGINT,lambda *_:stop.set());signal.signal(signal.SIGHUP,lambda *_:reload_requested.set())
    context=multiprocessing.get_context('fork');api=context.Process(target=api_process,args=(port,));api.start()
    electric=None;tasks={};recovered=False;next_collect=0;next_electric_start=0;next_metadata=0;metadata=None
    statistics_watcher=None;statistics_future=None;statistics_project=None
    closure_future=None;next_closure=0
    from .core.models import Operation,Maintenance
    from .core import commands
    from .execution import execute_operation,recover_receipts
    pool=concurrent.futures.ThreadPoolExecutor(max_workers=4,thread_name_prefix='cab-worker')
    metadata_pool=concurrent.futures.ThreadPoolExecutor(max_workers=1,thread_name_prefix='cab-metadata')
    statistics_pool=concurrent.futures.ThreadPoolExecutor(max_workers=1,thread_name_prefix='cab-statistics')
    closure_pool=concurrent.futures.ThreadPoolExecutor(max_workers=1,thread_name_prefix='cab-closure')
    try:
        while not stop.wait(0.2):
            if reload_requested.is_set():
                try:
                    level=configure();os.kill(api.pid,signal.SIGHUP);log.info('configuration reloaded: %s',level)
                    log.debug('diagnostic logging enabled')
                except (OSError,ValueError,RuntimeError) as error:
                    log.error('configuration reload refused',extra={'code':type(error).__name__})
                finally:reload_requested.clear()
            if not api.is_alive():raise RuntimeError('cab-api-process-exited')
            if not config().get('initialized'):continue
            try:
                refresh_database()
                recover_receipts()
                if not recovered:
                    configure();os.kill(api.pid,signal.SIGHUP)
                    # Les opérations engagées ne sont jamais réémises après crash.
                    for op in Operation.objects.filter(state__in=['INTENT','RUNNING']):
                        op.state='UNKNOWN';op.save(update_fields=['state','updated']);commands.event(op.run,'operation-recovery-protected',{'request_id':op.request_id})
                    recovered=True
                for key,future in list(tasks.items()):
                    if future.done():
                        try:future.result()
                        except Exception as error:log.error('worker failed',extra={'code':type(error).__name__})
                        del tasks[key]
                if not Maintenance.objects.filter(state__in=['PREPARED','INSTALLING']).exists():
                    if closure_future is not None and closure_future.done():
                        try:closure_future.result()
                        except Exception as error:log.warning('closure evaluation unavailable',extra={'code':getattr(error,'code',type(error).__name__)})
                        closure_future=None
                    if closure_future is None and time.monotonic()>=next_closure:
                        closure_future=closure_pool.submit(background_closure);next_closure=time.monotonic()+5
                    from .statistics_watch import Watcher,synchronize
                    if statistics_watcher is None:statistics_watcher=Watcher()
                    if statistics_future is not None and statistics_future.done():
                        try:statistics_future.result()
                        except Exception as error:log.warning('statistics synchronization unavailable',extra={'code':getattr(error,'code',type(error).__name__)})
                        statistics_future=None
                    due=statistics_watcher.tick()
                    env_due=[key for key,at in statistics_watcher.env_dirty.items() if time.monotonic()-at>=.3]
                    if statistics_future is None and env_due:
                        from .project_metadata import synchronize as synchronize_metadata
                        project_id=env_due[0];statistics_watcher.env_dirty.pop(project_id,None)
                        statistics_future=statistics_pool.submit(synchronize_metadata,project_id)
                    elif statistics_future is None and due:
                        statistics_project=due[0];statistics_watcher.dirty.pop(statistics_project,None)
                        statistics_future=statistics_pool.submit(synchronize,statistics_project)
                    for op in Operation.objects.filter(state='WAITING').order_by('pk')[:4]:
                        if len(tasks)>=4:break
                        if op.pk not in tasks:tasks[op.pk]=pool.submit(execute_operation,op.pk)
                if (electric is None or electric.poll() is not None) and time.monotonic()>=next_electric_start:
                    next_electric_start=time.monotonic()+10
                    args,env,cwd=electric_command()
                    if Path(args[0]).is_file():
                        electric=subprocess.Popen(args,env=env,cwd=cwd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,start_new_session=True)
                        threading.Thread(target=relay,args=(electric.stdout,),daemon=True).start();log.info('Electric started')
                    else:log.error('Electric executable missing',extra={'code':'electric-unavailable'})
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
        closure_pool.shutdown(wait=True,cancel_futures=True)
        statistics_pool.shutdown(wait=True,cancel_futures=True)
        if statistics_watcher is not None:statistics_watcher.close()
        pool.shutdown(wait=True,cancel_futures=True)
        metadata_pool.shutdown(wait=True,cancel_futures=True)
        if electric and electric.poll() is None:
            os.killpg(electric.pid,signal.SIGTERM)
            try:electric.wait(timeout=10)
            except subprocess.TimeoutExpired:os.killpg(electric.pid,signal.SIGKILL);electric.wait()
        if api.is_alive():api.terminate();api.join(20)
        if api.is_alive():api.kill();api.join()
        log.info('service stopped')
