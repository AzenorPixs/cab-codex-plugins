"""Relais stdio stable : remplacement du moteur sans rejeu d'appel métier."""
import ast
import asyncio
import copy
import json
import os
from pathlib import Path
import secrets
import sys
import time
from . import __version__
from .connector_process import identity
from .client import Client,ClientError

MAX_LINE=8*1024*1024

def installed_version():
    tree=ast.parse(Path(__file__).with_name('__init__.py').read_text())
    for node in tree.body:
        if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='__version__' for t in node.targets):
            value=ast.literal_eval(node.value)
            if isinstance(value,str):return value
    raise ValueError('connector-installed-version-invalid')

def key(value):return json.dumps(value,sort_keys=True,separators=(',',':'))

class Bridge:
    def __init__(self,agent):
        self.agent=agent;self.connector_id=secrets.token_hex(16);self.child=None;self.reader_task=None
        self.pending={};self.server_pending=set();self.control={};self.initial=None;self.initialized=False
        self.version='';self.catalog='';self.state='STARTING';self.error='';self.serial=0
        self.lock=asyncio.Lock();self.output_lock=asyncio.Lock();self.bootstrap=None;self.stopped=False
        self.client_factory=Client;self.client=self.client_factory()
        self.uncertain=False;self.client_closed=False;self.worker_identity=None;self.stop_reports=[];self.write_uncertain=set()

    async def output(self,message):
        if self.client_closed:return
        raw=(json.dumps(message,separators=(',',':'),ensure_ascii=False)+'\n').encode()
        async with self.output_lock:
            sys.stdout.buffer.write(raw);sys.stdout.buffer.flush()

    async def send(self,message):
        if self.child is None or self.child.returncode is not None:raise ConnectionError('mcp-worker-unavailable')
        try:
            self.child.stdin.write((json.dumps(message,separators=(',',':'))+'\n').encode());await self.child.stdin.drain()
        except (OSError,RuntimeError) as error:
            if 'id' in message:self.write_uncertain.add(key(message['id']))
            self.state='FAILED'
            raise ConnectionError('mcp-worker-write-outcome-unconfirmed') from error

    async def spawn(self):
        self.child=await asyncio.create_subprocess_exec('/usr/bin/cab','mcp-worker','--agent',self.agent,stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,stderr=None,limit=MAX_LINE+1)
        self.reader_task=asyncio.create_task(self.read_worker(self.child))
        self.worker_identity=identity(self.child.pid)

    def quiet(self):
        return not self.pending and not self.server_pending and not ((self.uncertain or self.write_uncertain) and self.child and identity(self.child.pid))

    async def stop_worker(self,process):
        import importlib
        from . import worker_stop
        importlib.reload(worker_stop)
        try:settings=(await asyncio.to_thread(self.client_factory().get,'connectors/policy'))['mcp_reload']
        except (ClientError,KeyError):settings={**worker_stop.DEFAULT,'allow_sigkill':False}
        async def boundary():
            if not self.quiet():return False
            try:allowed=(await asyncio.to_thread(self.client_factory().get,'connectors/policy')).get('stop_allowed') is True
            except ClientError:return False
            return allowed and self.quiet()
        report=await worker_stop.stop_child(process,self.agent,settings,boundary)
        if report['worker'] is None:report['worker']=self.worker_identity
        attempt=secrets.token_hex(16)
        sys.stderr.write(json.dumps({'component':'cab-mcp-stop','attempt_id':attempt,'state':report['state'],'stages':report['stages'],'reason':report['reason']})+'\n');sys.stderr.flush()
        self.stop_reports.append({'connector_id':self.connector_id,'attempt_id':attempt,'report':report})
        self.stop_reports=self.stop_reports[-128:]
        await self.flush_reports()
        return report

    async def flush_reports(self):
        for item in list(self.stop_reports):
            try:await asyncio.to_thread(self.client_factory().command,'connector.stop_report',item)
            except ClientError as error:
                if str(error) in ('not-found','connector-stop-worker-divergent'):self.stop_reports.remove(item)
                else:break
            else:self.stop_reports.remove(item)

    async def read_worker(self,process):
        try:
            while line:=await process.stdout.readline():
                if len(line)>MAX_LINE:raise ValueError('mcp-worker-frame-too-large')
                message=json.loads(line)
                if process is not self.child:return
                if self.bootstrap and message.get('id')==self.bootstrap[0]:
                    future=self.bootstrap[1];self.bootstrap=None
                    if not future.done():future.set_result(message)
                    continue
                if 'method' in message and 'id' in message:self.server_pending.add(key(message['id']))
                if 'id' in message and 'method' not in message:
                    if key(message['id']) in self.write_uncertain:
                        self.write_uncertain.discard(key(message['id']));continue
                    original=self.pending.pop(key(message['id']),None)
                    if original:
                        method=original.get('method')
                        if method=='initialize' and 'result' in message:
                            self.version=message['result'].get('serverInfo',{}).get('version','')
                            message['result'].setdefault('capabilities',{}).setdefault('tools',{})['listChanged']=True
                        if method=='tools/list' and 'result' in message and not message['result'].get('nextCursor'):
                            self.catalog=self.version
                await self.output(message)
        except (OSError,ValueError,asyncio.LimitOverrunError) as error:
            self.error=type(error).__name__
        finally:
            if process is self.child:
                if self.pending or self.server_pending:self.uncertain=True
                self.state='FAILED'
                if self.bootstrap:
                    future=self.bootstrap[1];self.bootstrap=None
                    if not future.done():future.set_exception(ConnectionError('mcp-worker-stopped'))
                # Les appels indécis reçoivent une erreur, jamais un rejeu.
                for original in list(self.pending.values()):
                    await self.output({'jsonrpc':'2.0','id':original['id'],'error':{'code':-32001,'message':'mcp-worker-stopped-outcome-unconfirmed; read the durable CAB receipt; do not replay'}})
                self.pending.clear();self.server_pending.clear()

    async def reload(self):
        async with self.lock:
            if not self.quiet() or not self.initialized:return
            self.state='RELOADING';old=self.child;task=self.reader_task
            if old:
                report=await self.stop_worker(old)
                if report['state']!='STOPPED':
                    self.state='FAILED';self.error=report['reason'];return
            if task:await task
            self.child=None;self.uncertain=False;self.write_uncertain.clear()
            self.catalog=''
            await self.spawn();self.serial+=1
            marker='cab-internal-'+self.connector_id+'-'+str(self.serial)
            future=asyncio.get_running_loop().create_future();self.bootstrap=(marker,future)
            await self.send({'jsonrpc':'2.0','id':marker,'method':'initialize','params':copy.deepcopy(self.initial)})
            reply=await asyncio.wait_for(future,20)
            if 'result' not in reply:raise ConnectionError('mcp-worker-handshake-failed')
            self.version=reply['result'].get('serverInfo',{}).get('version','')
            await self.send({'jsonrpc':'2.0','method':'notifications/initialized'})
            self.state='CATALOG_PENDING'
            await self.output({'jsonrpc':'2.0','method':'notifications/tools/list_changed'})

    async def heartbeat(self):
        if not self.child or not self.version or self.child.returncode is not None:return
        state='BUSY' if self.pending or self.server_pending else 'READY' if self.catalog==self.version else 'CATALOG_PENDING'
        if self.state=='FAILED':state='FAILED'
        body={'connector_id':self.connector_id,'worker_pid':self.child.pid,'loaded_version':self.version,'catalog_version':self.catalog,'relay_version':__version__,'pending':len(self.pending)+len(self.server_pending),'state':state,'error':self.error}
        try:
            self.client=self.client_factory()
            await self.flush_reports()
            await asyncio.to_thread(self.client.command,'connector.heartbeat',body);self.error=''
        except ClientError as error:
            code=str(error)[:100]
            if self.error!=code:sys.stderr.write(json.dumps({'component':'cab-mcp-bridge','code':code})+'\n');sys.stderr.flush()
            self.error=code

    async def watch(self):
        while not self.stopped:
            try:
                target=await asyncio.to_thread(installed_version)
                if self.initialized and self.quiet() and (self.state=='FAILED' or self.child is None or self.child.returncode is not None or self.version!=target):
                    try:health=await asyncio.to_thread(self.client.get,'health')
                    except ClientError:health={}
                    if health.get('version')==target and health.get('state') in ('READY','UNINITIALIZED'):await self.reload()
                await self.heartbeat()
            except (OSError,ValueError,ConnectionError,asyncio.TimeoutError):self.state='FAILED';self.error='connector-reload-failed'
            await asyncio.sleep(1)

    async def update(self,message):
        """Une admission puis lectures ; cette attente n'occupe pas le moteur."""
        params=message.get('params',{}).get('arguments',{});request_id=params.get('request_id');result=None
        try:
            self.client=self.client_factory()
            if set(params)-{'request_id','version','timeout_ms'} or not isinstance(request_id,str):raise ValueError('update-arguments-invalid')
            timeout=params.get('timeout_ms',1800000)
            if type(timeout) is not int or not 1000<=timeout<=1800000:raise ValueError('update-wait-invalid')
            try:result=await asyncio.to_thread(self.client.command,'system.update',{'request_id':request_id,'version':params.get('version','')})
            except ClientError as error:
                result={'request_id':request_id,'state':'ADMISSION_UNCONFIRMED','error':str(error),'retry_execution':False}
            deadline=time.monotonic()+timeout/1000
            while result['state'] not in ('OK','FAILED','UNKNOWN','RELOAD_REQUIRED','ADMISSION_UNCONFIRMED') and time.monotonic()<deadline:
                await asyncio.sleep(1)
                try:result=await asyncio.to_thread(self.client.command,'system.update.status',{'request_id':request_id})
                except ClientError as error:
                    if str(error)!='cab-unavailable':raise
            await self.output({'jsonrpc':'2.0','id':message['id'],'result':{'content':[{'type':'text','text':json.dumps(result)}],'structuredContent':result,'isError':False}})
        except (ValueError,ClientError) as error:
            await self.output({'jsonrpc':'2.0','id':message['id'],'result':{'content':[{'type':'text','text':str(error)}],'isError':True}})
        finally:self.control.pop(key(message['id']),None)

    async def serve(self):
        await self.spawn();watcher=asyncio.create_task(self.watch())
        reader=asyncio.StreamReader(limit=MAX_LINE+1);protocol=asyncio.StreamReaderProtocol(reader)
        await asyncio.get_running_loop().connect_read_pipe(lambda:protocol,sys.stdin.buffer)
        try:
            while line:=await reader.readline():
                if len(line)>MAX_LINE:raise ValueError('mcp-client-frame-too-large')
                message=json.loads(line)
                if not isinstance(message,dict):raise ValueError('mcp-client-frame-invalid')
                if message.get('method')=='initialize':self.initial=copy.deepcopy(message.get('params',{}))
                if message.get('method')=='notifications/initialized':self.initialized=True
                if message.get('method')=='notifications/cancelled':
                    task=self.control.get(key(message.get('params',{}).get('requestId')))
                    if task:task.cancel();continue
                if message.get('method')=='tools/call' and message.get('params',{}).get('name')=='cab_update' and 'id' in message:
                    marker=key(message['id'])
                    if marker in self.pending or marker in self.control:raise ValueError('mcp-request-id-in-use')
                    self.control[marker]=asyncio.create_task(self.update(message));continue
                async with self.lock:
                    marker=key(message.get('id'))
                    if 'id' in message and 'method' in message:
                        if marker in self.pending or marker in self.control:raise ValueError('mcp-request-id-in-use')
                        self.pending[marker]=message
                    elif 'id' in message:self.server_pending.discard(marker)
                    try:
                        if self.state=='FAILED':raise ConnectionError('mcp-worker-unavailable')
                        await self.send(message)
                    except ConnectionError:
                        if 'id' in message and 'method' in message:
                            self.pending.pop(marker,None)
                            await self.output({'jsonrpc':'2.0','id':message['id'],'error':{'code':-32001,'message':'mcp-worker-unavailable-no-replay'}})
        finally:
            self.stopped=True;self.client_closed=True;watcher.cancel()
            try:await asyncio.to_thread(self.client_factory().command,'connector.disconnected',{'connector_id':self.connector_id})
            except ClientError:pass
            await asyncio.gather(watcher,return_exceptions=True)
            for task in self.control.values():task.cancel()
            await asyncio.gather(*self.control.values(),return_exceptions=True)
            # Une disparition du client ne transforme pas une requête en autorisation de kill.
            while self.child and identity(self.child.pid) and not self.quiet():await asyncio.sleep(.2)
            if self.child:
                report=await self.stop_worker(self.child)
                if report['state']!='STOPPED':await self.child.wait()
            if self.reader_task:await self.reader_task

def run(agent):asyncio.run(Bridge(agent).serve())
