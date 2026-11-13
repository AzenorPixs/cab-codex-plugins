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

    async def output(self,message):
        raw=(json.dumps(message,separators=(',',':'),ensure_ascii=False)+'\n').encode()
        async with self.output_lock:
            sys.stdout.buffer.write(raw);sys.stdout.buffer.flush()

    async def send(self,message):
        if self.child is None or self.child.returncode is not None:raise ConnectionError('mcp-worker-unavailable')
        self.child.stdin.write((json.dumps(message,separators=(',',':'))+'\n').encode());await self.child.stdin.drain()

    async def spawn(self):
        self.child=await asyncio.create_subprocess_exec('/usr/bin/cab','mcp-worker','--agent',self.agent,stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,stderr=None,limit=MAX_LINE+1)
        self.reader_task=asyncio.create_task(self.read_worker(self.child))

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
            if process is self.child and not self.stopped:
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
            if self.pending or self.server_pending or not self.initialized:return
            self.state='RELOADING';old=self.child;task=self.reader_task
            self.child=None
            if old and old.returncode is None:
                old.terminate()
                try:await asyncio.wait_for(old.wait(),10)
                except asyncio.TimeoutError:old.kill();await old.wait()
            if task:await task
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
        body={'connector_id':self.connector_id,'worker_pid':self.child.pid,'loaded_version':self.version,'catalog_version':self.catalog,'pending':len(self.pending)+len(self.server_pending),'state':state,'error':self.error}
        try:
            self.client=self.client_factory()
            await asyncio.to_thread(self.client.command,'connector.heartbeat',body);self.error=''
        except ClientError as error:
            code=str(error)[:100]
            if self.error!=code:sys.stderr.write(json.dumps({'component':'cab-mcp-bridge','code':code})+'\n');sys.stderr.flush()
            self.error=code

    async def watch(self):
        while not self.stopped:
            try:
                target=await asyncio.to_thread(installed_version)
                if self.initialized and not self.pending and not self.server_pending and (self.state=='FAILED' or self.child is None or self.child.returncode is not None or self.version!=target):
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
            self.stopped=True;watcher.cancel()
            await asyncio.gather(watcher,return_exceptions=True)
            for task in self.control.values():task.cancel()
            await asyncio.gather(*self.control.values(),return_exceptions=True)
            if self.child and self.child.returncode is None:
                self.child.terminate()
                try:await asyncio.wait_for(self.child.wait(),10)
                except asyncio.TimeoutError:self.child.kill();await self.child.wait()
            if self.reader_task:await self.reader_task

def run(agent):asyncio.run(Bridge(agent).serve())
