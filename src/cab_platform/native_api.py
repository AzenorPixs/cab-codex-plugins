"""Contrôles natifs bornés ; aucun prompt, commande métier ou rejeu."""
import json
import os
from pathlib import Path
import pwd
import select
import socket
import struct
import subprocess
import time
import uuid
import httpx
import base64
import hashlib
from .connector_process import identity

class NativeFailure(Exception):
    def __init__(self,code,state='UNAVAILABLE'):
        super().__init__(code);self.code=code;self.state=state

def instance_key(value):return {key:value.get(key) for key in ('pid','uid','start','boot')} if value else None

def same_instance(left,right):return bool(left and right) and instance_key(left)==instance_key(right)

def codex_frontends(owner,kind):
    """Preuve IPC de raccordement ; une seconde instance isolée ne suffit pas."""
    from .agent_runtime import processes,socket_peers
    def inodes(path):
        result=set()
        try:
            for fd in path.joinpath('fd').iterdir():
                try:value=os.readlink(fd)
                except OSError:continue
                if value.startswith('socket:['):result.add(int(value[8:-1]))
        except (OSError,ValueError):return set()
        return result
    try:peers=socket_peers()
    except OSError as error:raise NativeFailure('native-peer-observation-unavailable') from error
    server=inodes(Path('/proc')/str(owner['pid']));found=[]
    for row in processes({owner['uid']}):
        name=Path(row['exe']).name
        try:args=(row['proc']/'cmdline').read_bytes().split(b'\0')
        except OSError:continue
        administrative=len(args)>1 and args[1] in (b'mcp',b'plugin',b'login',b'logout',b'features',b'debug',b'doctor',b'queue',b'archive',b'delete',b'update',b'completion',b'apply')
        candidate=name in ('ChatGPT','Codex','codex-desktop') if kind=='codex' else name=='codex' and not administrative and not any(v in args for v in (b'app-server',b'proxy',b'exec-server',b'--help',b'--version'))
        if candidate and any(peers.get(item) in server for item in inodes(row['proc'])):
            saved=identity(row['pid'])
            if saved:found.append(saved)
    return found

def codex_peer(path,uid,expected=None):
    if not isinstance(path,str) or not Path(path).is_absolute():raise NativeFailure('native-socket-required')
    try:
        with socket.socket(socket.AF_UNIX) as stream:
            stream.settimeout(2);stream.connect(path)
            pid,peer_uid,gid=struct.unpack('3i',stream.getsockopt(socket.SOL_SOCKET,socket.SO_PEERCRED,12))
    except OSError as error:raise NativeFailure('native-socket-unavailable') from error
    saved=identity(pid)
    if peer_uid!=uid or not saved or expected and not same_instance(saved,expected):raise NativeFailure('native-instance-divergent')
    return saved

class CodexAPI:
    """Le proxy officiel parle au socket existant ; il ne démarre aucun serveur."""
    ALLOWED={'config/mcpServer/reload','thread/loaded/list','mcpServerStatus/list'}
    def __init__(self,path,binary,uid,expected=None,timeout=15):
        if not isinstance(binary,str) or not Path(binary).is_absolute():raise NativeFailure('native-binary-required')
        self.owner=codex_peer(path,uid,expected);self.buffer=b'';self.mutation_sent=False;self.confirmed_mutations=0;self.timeout=timeout;self.deadline=time.monotonic()+timeout
        user=pwd.getpwuid(uid)
        options={'user':uid,'group':user.pw_gid,'extra_groups':os.getgrouplist(user.pw_name,user.pw_gid)} if os.getuid()==0 else {}
        if os.getuid() not in (0,uid):raise NativeFailure('native-account-divergent')
        try:
            self.process=subprocess.Popen([binary,'app-server','proxy','--sock',path],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,bufsize=0,cwd=user.pw_dir,env={'HOME':user.pw_dir,'USER':user.pw_name,'LOGNAME':user.pw_name,'PATH':os.defpath},**options)
            self._upgrade()
            self._call('initialize',{'clientInfo':{'name':'cab_native_control','version':'1'},'capabilities':{'experimentalApi':True}})
            self._send({'method':'initialized'})
        except (OSError,NativeFailure) as error:
            self.close()
            if isinstance(error,NativeFailure):raise
            raise NativeFailure('native-proxy-unavailable') from error
    def _write(self,raw):
        view=memoryview(raw)
        while view:
            count=self.process.stdin.write(view)
            if not count:raise OSError('native-proxy-closed')
            view=view[count:]
        self.process.stdin.flush()
    def _read(self,count,deadline):
        while len(self.buffer)<count:
            remaining=deadline-time.monotonic()
            if remaining<=0:raise NativeFailure('native-api-timeout','UNKNOWN' if self.mutation_sent else 'UNAVAILABLE')
            if not select.select([self.process.stdout],[],[],min(remaining,.5))[0]:continue
            raw=os.read(self.process.stdout.fileno(),65536)
            if not raw:raise NativeFailure('native-api-closed','UNKNOWN' if self.mutation_sent else 'UNAVAILABLE')
            self.buffer+=raw
            if len(self.buffer)>8*1024*1024:raise NativeFailure('native-response-too-large','UNKNOWN' if self.mutation_sent else 'UNAVAILABLE')
        raw,self.buffer=self.buffer[:count],self.buffer[count:]
        return raw
    def _upgrade(self):
        # Le proxy officiel est un flux brut vers le WebSocket Unix /rpc.
        key=base64.b64encode(os.urandom(16)).decode()
        self._write(('GET /rpc HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: '+key+'\r\n\r\n').encode())
        header=b''
        while not header.endswith(b'\r\n\r\n'):
            header+=self._read(1,self.deadline)
            if len(header)>16384:raise NativeFailure('native-websocket-header-invalid')
        lines=header.decode('ascii').split('\r\n');fields={line.split(':',1)[0].lower():line.split(':',1)[1].strip() for line in lines[1:] if ':' in line}
        expected=base64.b64encode(hashlib.sha1((key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').encode()).digest()).decode()
        if ' 101 ' not in lines[0] or fields.get('sec-websocket-accept')!=expected or fields.get('upgrade','').lower()!='websocket' or fields.get('sec-websocket-extensions'):
            raise NativeFailure('native-websocket-upgrade-refused')
    def _frame(self,opcode,raw):
        mask=os.urandom(4);size=len(raw)
        header=bytes([0x80|opcode,0x80|size]) if size<126 else bytes([0x80|opcode,0xfe])+struct.pack('!H',size) if size<65536 else bytes([0x80|opcode,0xff])+struct.pack('!Q',size)
        self._write(header+mask+bytes(value^mask[i%4] for i,value in enumerate(raw)))
    def _send(self,packet):self._frame(1,json.dumps(packet,separators=(',',':')).encode())
    def _line(self,deadline):
        message=bytearray();started=False
        while True:
            first,second=self._read(2,deadline);final=bool(first&0x80);opcode=first&15;size=second&127
            if first&0x70 or second&0x80:raise NativeFailure('native-websocket-frame-invalid','UNKNOWN' if self.mutation_sent else 'UNAVAILABLE')
            if size==126:size=struct.unpack('!H',self._read(2,deadline))[0]
            elif size==127:size=struct.unpack('!Q',self._read(8,deadline))[0]
            if size>8*1024*1024 or len(message)+size>8*1024*1024:raise NativeFailure('native-response-too-large','UNKNOWN' if self.mutation_sent else 'UNAVAILABLE')
            raw=self._read(size,deadline)
            if opcode>=8:
                if not final or size>125:raise NativeFailure('native-websocket-control-invalid','UNKNOWN' if self.mutation_sent else 'UNAVAILABLE')
                if opcode==9:self._frame(10,raw);continue
                if opcode==10:continue
                raise NativeFailure('native-api-closed','UNKNOWN' if self.mutation_sent else 'UNAVAILABLE')
            if opcode in (1,2) and not started:started=True
            elif opcode!=0 or not started:raise NativeFailure('native-websocket-fragment-invalid','UNKNOWN' if self.mutation_sent else 'UNAVAILABLE')
            message.extend(raw)
            if final:
                try:
                    packet=json.loads(message)
                    if not isinstance(packet,dict):raise ValueError('object-required')
                    return packet
                except (ValueError,UnicodeError) as error:raise NativeFailure('native-response-invalid','UNKNOWN' if self.mutation_sent else 'UNAVAILABLE') from error
    def _call(self,method,params=None):
        key='cab-'+uuid.uuid4().hex
        mutator=method in ('config/mcpServer/reload','config/batchWrite')
        if mutator:self.mutation_sent=True
        try:self._send({'id':key,'method':method,**({'params':params} if params is not None else {})})
        except OSError as error:raise NativeFailure('native-write-unconfirmed','UNKNOWN' if self.mutation_sent else 'UNAVAILABLE') from error
        deadline=min(self.deadline,time.monotonic()+self.timeout)
        while True:
            packet=self._line(deadline)
            if packet.get('id')!=key or 'method' in packet:continue
            if 'error' in packet:
                code=packet['error'].get('code')
                # Une erreur métier de reload peut avoir appliqué certains threads.
                unavailable=code==-32601 and not self.confirmed_mutations
                raise NativeFailure('native-method-unsupported' if code==-32601 else 'native-api-refused','UNAVAILABLE' if unavailable or not self.mutation_sent else 'UNKNOWN')
            if mutator:self.confirmed_mutations+=1
            return packet.get('result',{})
    def call(self,method,params=None):
        if method not in self.ALLOWED:raise NativeFailure('native-method-not-allowed')
        return self._call(method,params)
    def mark_reload(self,request_id):
        # Seul ce marqueur CAB change : pas les autres serveurs ni leurs secrets.
        if not isinstance(request_id,str) or not 1<=len(request_id)<=200:raise NativeFailure('native-request-id-invalid')
        return self._call('config/batchWrite',{'edits':[{'keyPath':'mcp_servers.cab.env.CAB_MCP_RELOAD_ID','value':request_id,'mergeStrategy':'upsert'}],'reloadUserConfig':True})
    def close(self):
        process=getattr(self,'process',None)
        if process is None:return
        if process.stdin:process.stdin.close()
        try:process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            process.terminate()
            try:process.wait(timeout=2)
            except subprocess.TimeoutExpired:process.kill();process.wait(timeout=2)
        if process.stdout:process.stdout.close()
    def __enter__(self):return self
    def __exit__(self,*args):self.close()

def reload_codex(native,uid,request_id):
    with CodexAPI(native.get('control_socket'),native.get('control_binary'),uid,native.get('control_process')) as api:
        api.mark_reload(request_id)
        api.call('config/mcpServer/reload')
        loaded=api.call('thread/loaded/list',{'limit':100})
        threads=loaded.get('data',[])
        if not isinstance(threads,list) or len(threads)>100:raise NativeFailure('native-thread-inventory-invalid','UNKNOWN')
        for sid in threads:
            if not isinstance(sid,str):raise NativeFailure('native-thread-identity-invalid','UNKNOWN')
            api.call('mcpServerStatus/list',{'threadId':sid,'serverName':'cab','detail':'toolsAndAuthOnly'})
        return {'method':'config/mcpServer/reload','owner':api.owner,'threads_checked':len(threads),'catalogue_confirmation':'CAB-heartbeat-required'}

def reload_opencode(actor):
    from .opencode import connection
    from urllib.parse import quote
    mutated=False
    try:
        with connection(actor) as api:
            response=api.get('/api/info');response.raise_for_status();info=response.json()
            if info.get('pid')!=actor.native.get('pid'):raise NativeFailure('native-instance-divergent')
            if not str(info.get('version','')).startswith('2.'):raise NativeFailure('native-opencode-api-unsupported')
            response=api.get('/api/location');response.raise_for_status();directory=response.json().get('directory')
            if not isinstance(directory,str) or not Path(directory).is_absolute():raise NativeFailure('native-directory-invalid')
            params={'directory':directory};headers={'x-opencode-directory':directory}
            response=api.get('/api/mcp',params=params,headers=headers);response.raise_for_status();inventory=response.json()
            if inventory.get('location',{}).get('directory')!=directory:raise NativeFailure('native-directory-divergent')
            row=next((row for row in inventory.get('data',[]) if row.get('name')=='cab'),None)
            if row is None:raise NativeFailure('native-cab-server-not-configured')
            if row.get('status',{}).get('status')=='connected':
                mutated=True
                response=api.post('/api/experimental/mcp/cab/disconnect',params=params,headers=headers);response.raise_for_status()
            mutated=True
            response=api.post('/api/experimental/mcp/cab/connect',params=params,headers=headers);response.raise_for_status()
            response=api.get('/api/mcp',params=params,headers=headers);response.raise_for_status();inventory=response.json()
            row=next((row for row in inventory.get('data',[]) if row.get('name')=='cab'),{})
            return {'method':'OpenCode-V2-MCP-disconnect-connect','owner':identity(actor.native['pid']),'native_status':row.get('status',{}).get('status'),'catalogue_confirmation':'CAB-heartbeat-required'}
    except NativeFailure:raise
    except (OSError,ValueError) as error:raise NativeFailure('native-opencode-unavailable','UNKNOWN' if mutated else 'UNAVAILABLE') from error
    except httpx.HTTPError as error:raise NativeFailure('native-opencode-http-unconfirmed','UNKNOWN' if mutated else 'UNAVAILABLE') from error
