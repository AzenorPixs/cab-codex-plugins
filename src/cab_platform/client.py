"""Client local commun CLI/MCP ; credentials traités hors du modèle."""
import http.client
import json
import os
from pathlib import Path
import socket
import stat
from urllib.parse import urlencode

class ClientError(Exception):pass
class UnixConnection(http.client.HTTPConnection):
    def __init__(self,path):super().__init__('localhost',timeout=75);self.path=path
    def connect(self):self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);self.sock.settimeout(self.timeout);self.sock.connect(self.path)

class Client:
    def __init__(self,admin=False):
        self.admin=admin;self.profile={}
        self.socket=os.environ.get('CAB_SOCKET','/run/cab/cab.sock')
        agent=os.environ.get('CAB_AGENT','codex')
        if not __import__('re').fullmatch('[A-Za-z0-9_-]{1,40}',agent):raise ClientError('client-agent-invalid')
        default=Path.home()/'.config/cab'/(agent+'.json')
        if agent=='codex' and not default.exists():default=Path.home()/'.config/cab/client.json'
        path=Path(os.environ.get('CAB_CLIENT_FILE',str(default)))
        try:
            fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
            with os.fdopen(fd,'r') as stream:
                info=os.fstat(stream.fileno())
                if not stat.S_ISREG(info.st_mode) or info.st_nlink!=1:raise ClientError('client-profile-unsafe')
                self.profile=json.load(stream)
        except FileNotFoundError:pass
    def call(self,path,body=None):
        headers={'content-type':'application/json'}
        if self.admin:
            if os.getuid()!=0:raise ClientError('root-administration-required')
            from .paths import secret
            headers['X-CAB-Admin']=secret('admin-token')
        elif self.profile.get('token'):headers['Authorization']='Bearer '+self.profile['token']
        conn=UnixConnection(self.socket)
        try:
            conn.request('POST' if body is not None else 'GET','/api/v1/'+path,json.dumps(body) if body is not None else None,headers)
            response=conn.getresponse();raw=response.read(2*1024*1024)
            try:data=json.loads(raw)
            except ValueError:raise ClientError('api-response-invalid') from None
            if response.status>=400:raise ClientError(str(data.get('error','api-request-failed')))
            return data
        except (OSError,http.client.HTTPException):raise ClientError('cab-unavailable') from None
        finally:conn.close()
    def command(self,name,data):return self.call('command',{'name':name,'data':data})
    def get(self,path,**query):return self.call(path+('?' +urlencode(query) if query else ''))
