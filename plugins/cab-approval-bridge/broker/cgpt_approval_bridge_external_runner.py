"""Fixed remote RPC runner. Stdin is data; the host never executes a caller shell."""
from __future__ import annotations
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import selectors
import signal
import socket
import stat
import subprocess
import sys
import time
from datetime import datetime,timezone

VERSION='2.7.4'
PROTOCOL='cab-external-exec-v1'
LIMIT=1024*1024


def digest(value):return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
def scrub(value):
    value=re.sub(r'-----BEGIN [^-]*PRIVATE KEY-----.*?-----END [^-]*PRIVATE KEY-----','[REDACTED]',value,flags=re.S)
    value=re.sub(r'(?i)((?:password|api[_-]?key|access[_-]?token|refresh[_-]?token|token|secret)\s*[=:]\s*)[^\s,;]+',r'\1[REDACTED]',value)
    return re.sub(r'(?:gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{24,})','[REDACTED]',value)
def target_identity():
    kind='docker' if Path('/.dockerenv').is_file() else ''
    try:
        declared=Path('/run/systemd/container').read_text().strip()
        if declared:kind=declared
    except FileNotFoundError:pass
    machine=Path('/etc/machine-id').read_text().strip() if Path('/etc/machine-id').is_file() else ''
    return {'container':kind,'fingerprint':digest([kind,socket.gethostname(),os.getuid(),machine])}
def set_new_directory_mode(path):
    fd=os.open(path,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
    try:os.fchmod(fd,0o770)
    finally:os.close(fd)

def private_directory(path):
    path=Path(path)
    try:path.mkdir(mode=0o770);set_new_directory_mode(path)
    except FileExistsError:pass
    info=path.lstat()
    if not stat.S_ISDIR(info.st_mode) or path.resolve()!=path or info.st_uid!=os.getuid() or info.st_mode&0o007:raise ValueError('REMOTE_STATE_UNSAFE')
    return path

def atomic(path,value):
    candidate=path.with_name(path.name+'.candidate')
    fd=os.open(candidate,os.O_CREAT|os.O_EXCL|os.O_WRONLY|os.O_NOFOLLOW,0o770)
    try:
        os.fchmod(fd,0o770)
        with os.fdopen(fd,'w',encoding='utf-8') as f:json.dump(value,f,ensure_ascii=False);f.flush();os.fsync(f.fileno())
        os.replace(candidate,path)
    finally:
        if candidate.exists():candidate.unlink()
def load(path):
    try:fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
    except FileNotFoundError:return None
    with os.fdopen(fd,'r',encoding='utf-8') as f:
        info=os.fstat(f.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_nlink!=1 or info.st_uid!=os.getuid() or info.st_mode&0o007 or info.st_size>2*LIMIT:raise ValueError('REMOTE_RECEIPT_UNSAFE')
        return json.load(f)

def handle(p,*,state_root=None,identity=None):
    if not isinstance(p,dict) or p.get('protocol')!=PROTOCOL or p.get('action') not in ('execute','status'):raise ValueError('REMOTE_INPUT_INVALID')
    for name in ('job_id','input_digest','scope_digest'):
        if not isinstance(p.get(name),str) or not re.fullmatch('[a-f0-9]{64}',p[name]):raise ValueError('REMOTE_IDENTITY_INVALID')
    identity=identity or target_identity()
    if identity['container']!=p.get('container') or p.get('target_fingerprint') not in (None,identity['fingerprint']):raise ValueError('REMOTE_TARGET_DIVERGENT')
    root=Path(state_root) if state_root else Path('/var/tmp')/('cab-external-'+str(os.getuid()))
    if p['action']=='status' and not root.exists():return {'found':False,'target_fingerprint':identity['fingerprint']}
    root=private_directory(root);scope=private_directory(root/p['scope_digest']);receipt=scope/(p['job_id']+'.json')
    previous=load(receipt)
    if previous:
        if previous['input_digest']!=p['input_digest']:raise ValueError('REMOTE_REQUEST_CONFLICT')
        return {'found':True,**previous}
    if p['action']=='status':return {'found':False,'target_fingerprint':identity['fingerprint']}
    argv=p.get('argv');timeout=p.get('timeout_ms',120000)
    if not isinstance(argv,list) or not argv or any(not isinstance(a,str) or '\0' in a for a in argv) or type(timeout) is not int or not 1<=timeout<=2147483647:raise ValueError('REMOTE_COMMAND_INVALID')
    work=private_directory(scope/(p['job_id']+'.work'))
    files=p.get('files',[])
    if not isinstance(files,list) or len(files)>128:raise ValueError('REMOTE_ARTIFACT_INVALID')
    artifacts=[];size=0
    for item in files:
        path=Path(item['path']);data=base64.b64decode(item['data'],validate=True);size+=len(data)
        if path.is_absolute() or str(path)!=item['path'] or any(x in ('.','..') for x in path.parts) or size>16*LIMIT or hashlib.sha256(data).hexdigest()!=item['sha256']:raise ValueError('REMOTE_ARTIFACT_INVALID')
        target=work/path
        parent=work
        for component in path.parts[:-1]:
            parent=parent/component
            try:parent.mkdir(mode=0o770);set_new_directory_mode(parent)
            except FileExistsError:pass
        if target.parent.resolve()!=target.parent or target.exists() or target.is_symlink():raise ValueError('REMOTE_ARTIFACT_UNSAFE')
        fd=os.open(target,os.O_CREAT|os.O_EXCL|os.O_WRONLY|os.O_NOFOLLOW,0o770)
        os.fchmod(fd,0o770)
        with os.fdopen(fd,'wb') as f:f.write(data)
        artifacts.append({'path':str(path),'sha256':item['sha256']})
    value={'protocol':PROTOCOL,'job_id':p['job_id'],'input_digest':p['input_digest'],'status':'INTENT','target_fingerprint':identity['fingerprint'],
           'startedAt':datetime.now(timezone.utc).isoformat(),'artifacts':artifacts,'workdir':str(work)}
    atomic(receipt,value)
    output=bytearray();status='COMPLETED';exit_code=None;process=None
    try:
        process=subprocess.Popen(argv,cwd=work,env={'PATH':'/usr/local/bin:/usr/bin:/bin','HOME':str(work),'LANG':'C.UTF-8','PYTHONDONTWRITEBYTECODE':'1'},
          stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True)
        value.update(status='RUNNING',pid=process.pid);atomic(receipt,value)
        deadline=time.monotonic()+timeout/1000
        with selectors.DefaultSelector() as selector:
            selector.register(process.stdout,selectors.EVENT_READ)
            while selector.get_map():
                if time.monotonic()>deadline or len(output)>LIMIT:
                    try:os.killpg(process.pid,signal.SIGKILL)
                    except ProcessLookupError:pass
                    status='TIMED_OUT' if len(output)<=LIMIT else 'OUTPUT_LIMIT';break
                for key,_ in selector.select(min(0.2,max(0,deadline-time.monotonic()))):
                    chunk=os.read(key.fileobj.fileno(),65536)
                    if not chunk:selector.unregister(key.fileobj)
                    else:output.extend(chunk)
        process.stdout.close();exit_code=process.wait(timeout=5)
    except OSError:status='UNKNOWN' if process is not None else 'FAILED_TO_START'
    value.update(status=status,exitCode=exit_code,output=scrub(bytes(output[:LIMIT]).decode('utf-8',errors='replace')),outputTruncated=len(output)>LIMIT,
                 finishedAt=datetime.now(timezone.utc).isoformat())
    atomic(receipt,value);return {'found':True,**value}

def main():
    os.umask(0o007)
    p=None
    try:
        p=json.loads(sys.stdin.read(24*LIMIT));result=handle(p)
    except (ValueError,KeyError,TypeError,OSError) as error:
        code=str(error);closed={'REMOTE_INPUT_INVALID','REMOTE_IDENTITY_INVALID','REMOTE_TARGET_DIVERGENT','REMOTE_STATE_UNSAFE','REMOTE_RECEIPT_UNSAFE','REMOTE_REQUEST_CONFLICT','REMOTE_COMMAND_INVALID','REMOTE_ARTIFACT_INVALID','REMOTE_ARTIFACT_UNSAFE'}
        result={'status':'REFUSED','errorCode':code if code in closed else 'REMOTE_EXECUTION_REFUSED'}
        if isinstance(p,dict):result.update(job_id=p.get('job_id'),input_digest=p.get('input_digest'),noEffect=code in closed)
    sys.stdout.write(json.dumps(result,ensure_ascii=False)+'\n')
if __name__=='__main__':main()
