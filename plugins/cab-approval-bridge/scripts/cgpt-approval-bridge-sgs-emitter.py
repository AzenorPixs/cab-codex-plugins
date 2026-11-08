"""Émission technique vers SGS : outbox locale temporaire, aucune attente LLM."""
import hashlib
import http.client
import json
import os
from pathlib import Path
import socket
import tempfile
import threading
import time
from datetime import datetime,timezone

VERSION='2.4.29'


class Emitter:
    def __init__(self,directory,socket_path,producer,instance,started_at):
        self.directory=Path(directory);self.directory.mkdir(mode=0o700,exist_ok=True)
        self.socket_path=str(socket_path);self.producer=producer;self.instance=instance;self.started_at=started_at
        self.stop=threading.Event();self.wake=threading.Event();self.lock=threading.Lock();self.latest={};self.error=None
        self.thread=threading.Thread(target=self.work,daemon=True);self.thread.start()

    def request(self,path,body):
        connection=http.client.HTTPConnection('localhost',timeout=0.5)
        connection.sock=socket.socket(socket.AF_UNIX);connection.sock.settimeout(0.5);connection.sock.connect(self.socket_path)
        try:
            connection.request('POST',path,json.dumps(body).encode(),{'content-type':'application/json'})
            response=connection.getresponse();value=json.loads(response.read(1024*1024))
            if response.status!=200:raise ValueError('sgs-emission-refused')
            return value
        finally:connection.close()

    def emit(self,project,metrics):
        binding=self.producer+'-'+hashlib.sha256((self.instance+project).encode()).hexdigest()
        now=datetime.now(timezone.utc).isoformat();sequence=time.time_ns()//1000
        packet={'binding':{'binding':binding,'host':os.uname().nodename,'instance':self.instance,'project':project,
            'change':'component-'+self.producer,'run':'service-'+self.producer,'session':'service-'+self.producer,
            'role':'component','agent':self.producer,'mode':'service','started_at':self.started_at},
            'event':{'binding':binding,'event_id':self.producer+'-'+str(sequence),'source':'cab-component','stream':'queue-gauges','sequence':sequence,
                'at':now,'semantics':'cumulative','metrics':{key:str(value) for key,value in metrics.items()}}}
        with self.lock:self.latest[binding]=packet
        self.wake.set()

    def work(self):
        while not self.stop.is_set():
            self.wake.wait(5);self.wake.clear()
            with self.lock:pending=self.latest;self.latest={}
            try:
                for binding,packet in pending.items():
                    fd,candidate=tempfile.mkstemp(prefix='.candidate-',dir=self.directory)
                    with os.fdopen(fd,'w') as stream:json.dump(packet,stream);stream.flush();os.fsync(stream.fileno())
                    os.replace(candidate,self.directory/(hashlib.sha256(binding.encode()).hexdigest()+'.json'))
                for path in self.directory.glob('*.json'):
                    packet=json.loads(path.read_text());self.request('/bindings',packet['binding']);self.request('/events',packet['event']);path.unlink()
                self.error=None
            except (OSError,ValueError,http.client.HTTPException):self.error='sgs-emission-queued'

    def close(self):
        self.stop.set();self.wake.set();self.thread.join(timeout=2)
