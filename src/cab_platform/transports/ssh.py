"""SSH adapter for a declared, leased container; credentials never cross the API."""
from __future__ import annotations
import base64
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import stat
import subprocess
import threading
import tempfile
from datetime import datetime,timezone
from . import external_runner as runner

VERSION='3.0.0'
PROTOCOL='cab-external-exec-v1'
LOCK=threading.RLock()
ACTIVE_PROCESSES={}
TERMINAL={'COMPLETED','TIMED_OUT','OUTPUT_LIMIT','FAILED_TO_START'}
SECRET_NAME=re.compile(r'\.env(?:\.|$)|\.(?:key|pem|p12|pfx|crt|cer|der)$|^(?:credentials|secrets)\.(?:json|yaml)$|^id_(?:rsa|ed25519)$|^\.(?:netrc|npmrc|pypirc)$')
class ExternalError(ValueError):pass

def fail(code):raise ExternalError(code)
def digest(value):return runner.digest(value)
def identity(args):
    for k in ('request_id','run_id','session_id','change_id'):
        if not isinstance(args.get(k),str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,199}',args[k]):fail('external-identity-invalid')
    directory=args.get('directory')
    if not isinstance(directory,str) or not Path(directory).is_absolute() or str(Path(directory).resolve())!=directory:fail('external-directory-invalid')
    if type(args.get('reservation_version')) is not int or args['reservation_version']<1:fail('external-generation-invalid')
def profile_shape(profile,*,fingerprint=True):
    required={'id','kind','resource_key','host_key','user_key','password_key','container'}
    if fingerprint:required.add('connection_fingerprint')
    if not isinstance(profile,dict) or not required<=set(profile) or set(profile)-required-{'port_key','known_hosts'}:fail('external-profile-invalid')
    if profile['kind']!='ssh' or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,99}',profile['id']):fail('external-profile-invalid')
    if not re.fullmatch(r'(?:lxc|docker):[a-z0-9][a-z0-9_.-]*(?:/[a-z0-9][a-z0-9_.-]*)?',profile['resource_key']) or profile['container']!=profile['resource_key'].split(':')[0]:fail('external-bank-invalid')
    for key,suffix in [('host_key',r'(?:HOST|IP|ADDRESS)'),('user_key',r'USER'),('password_key',r'(?:PASSWORD|PASS)'),('port_key',r'PORT')]:
        if key in profile and (not isinstance(profile[key],str) or not re.fullmatch(r'[A-Z][A-Z0-9_]{0,90}_'+suffix,profile[key])):fail('external-config-key-invalid')
    if fingerprint and not re.fullmatch(r'[a-f0-9]{64}',profile.get('connection_fingerprint','')):fail('external-fingerprint-invalid')
    if 'known_hosts' in profile and (not isinstance(profile['known_hosts'],str) or not Path(profile['known_hosts']).is_absolute() or not Path(profile['known_hosts']).name.startswith('known_hosts')):fail('external-known-hosts-invalid')
    return profile

def connection(directory,profile):
    profile_shape(profile,fingerprint='connection_fingerprint' in profile)
    keys=[profile[k] for k in ('host_key','user_key','password_key','port_key') if k in profile]
    values={k:[] for k in keys}
    try:
        fd=os.open(Path(directory)/'project.env',os.O_RDONLY|os.O_NOFOLLOW)
        with os.fdopen(fd,'r',encoding='utf-8') as stream:
            if os.fstat(stream.fileno()).st_size>1024*1024:fail('external-config-invalid')
            for line in stream:
                m=re.fullmatch(r'([A-Z][A-Z0-9_]*)=(.*)',line.strip())
                if m and m[1] in values:values[m[1]].append(m[2])
    except (OSError,UnicodeError):fail('external-config-unavailable')
    cfg={}
    for key,entries in values.items():
        if len(entries)!=1:fail('external-config-ambiguous')
        value=entries[0]
        if value.startswith(('"',"'")):
            if len(value)<2 or value[-1]!=value[0] or value[0] in value[1:-1]:fail('external-config-ambiguous')
            value=value[1:-1]
        elif any(c.isspace() for c in value) or any(c in value for c in '\'"#\\'):fail('external-config-ambiguous')
        if not value or '\0' in value or '\n' in value or '`' in value or '$(' in value:fail('external-config-ambiguous')
        cfg[key]=value
    host,user,password=(cfg[profile[k]] for k in ('host_key','user_key','password_key'))
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9.:-]{0,252}',host) or not re.fullmatch(r'[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}',user):fail('external-connection-invalid')
    if len(password.encode('utf-8'))>4096:fail('external-config-invalid')
    port=cfg[profile['port_key']] if 'port_key' in profile else '22'
    if not port.isascii() or not port.isdigit() or not 1<=int(port)<=65535:fail('external-connection-invalid')
    known=Path(profile.get('known_hosts',str(Path.home()/'.ssh/known_hosts')))
    try:
        fd=os.open(known,os.O_RDONLY|os.O_NOFOLLOW)
        with os.fdopen(fd,'rb') as f:
            info=os.fstat(f.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_uid not in (0,os.getuid()) or info.st_mode&0o002 or info.st_size>1024*1024 or info.st_nlink!=1:fail('external-known-hosts-unsafe')
            data=f.read()
    except OSError:fail('external-known-hosts-unavailable')
    try:lines=[l.split() for l in data.decode('utf-8',errors='strict').splitlines() if l.strip() and not l.lstrip().startswith('#')]
    except UnicodeError:fail('external-known-hosts-invalid')
    normalized=[]
    for row in lines:
        offset=1 if row[0].startswith('@') else 0
        if len(row)<offset+3:fail('external-known-hosts-invalid')
        algorithm=row[offset+1]
        if not algorithm.startswith(('ssh-','ecdsa-','sk-')):fail('external-known-hosts-invalid')
        try:
            key=base64.b64decode(row[offset+2],validate=True);length=int.from_bytes(key[:4],'big')
            if length<1 or key[4:4+length].decode('ascii')!=algorithm:fail('external-known-hosts-invalid')
        except (ValueError,UnicodeError):fail('external-known-hosts-invalid')
        normalized.append(' '.join(row[:offset+3]))
    if not normalized:fail('external-known-hosts-invalid')
    public_data=('\n'.join(normalized)+'\n').encode()
    fp=digest([host,user,int(port),hashlib.sha256(public_data).hexdigest(),profile['container']])
    if profile.get('connection_fingerprint') not in (None,fp):fail('external-connection-changed')
    for binary in ('/usr/bin/ssh','/usr/bin/sshpass'):
        try:info=os.stat(binary)
        except OSError:fail('external-tool-unavailable')
        if not stat.S_ISREG(info.st_mode) or info.st_uid!=0 or info.st_mode&0o002 or not os.access(binary,os.X_OK):fail('external-tool-unavailable')
    return {'host':host,'user':user,'password':password,'port':int(port),'known':str(known),'fingerprint':fp,'known_data':public_data}

def describe(args,authorize):
    identity(args);grant=authorize(args);profile=profile_shape(args['profile'],fingerprint=False)
    if grant.get('status')!='AUTHORIZED_EXTERNAL_DESCRIBE':fail('external-grant-invalid')
    cfg=connection(args['directory'],profile)
    return {'status':'PROFILE_DESCRIBED','profile':{**profile,'connection_fingerprint':cfg['fingerprint']},'credential_values_exposed':False}

def set_new_directory_mode(path):
    fd=os.open(path,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
    try:os.fchmod(fd,0o770)
    finally:os.close(fd)

def create_directories(path):
    missing=[];current=path
    while not current.exists():missing.append(current);current=current.parent
    for item in reversed(missing):
        try:item.mkdir(mode=0o770);set_new_directory_mode(item)
        except FileExistsError:pass

def gather_files(directory,items,allowed):
    if not isinstance(items,list) or len(items)>128:fail('external-artifacts-invalid')
    result=[];size=0;project=Path(directory)
    for item in items:
        if not isinstance(item,dict) or set(item)-{'path','destination','sha256'} or not isinstance(item.get('path'),str):fail('external-artifacts-invalid')
        relative=Path(item['path']);path=project/relative
        if relative.is_absolute() or str(relative)!=item['path'] or any(x in ('.','..','.git','.opencode','.codex','node_modules','logs') or SECRET_NAME.search(x) for x in relative.parts):fail('external-artifact-protected')
        if not any(path==Path(root) or path.is_relative_to(Path(root)) for root in allowed):fail('external-artifact-outside-scope')
        if path.resolve()!=path:fail('external-artifact-unsafe')
        fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
        with os.fdopen(fd,'rb') as f:
            info=os.fstat(f.fileno());size+=info.st_size
            if not stat.S_ISREG(info.st_mode) or info.st_nlink!=1 or size>16*1024*1024:fail('external-artifacts-limit')
            data=f.read();after=os.fstat(f.fileno())
            if (info.st_size,info.st_mtime_ns)!=(after.st_size,after.st_mtime_ns):fail('external-artifact-changed')
        sha=hashlib.sha256(data).hexdigest()
        if item.get('sha256') not in (None,sha):fail('external-artifact-changed')
        destination=item.get('destination',item['path'])
        if not isinstance(destination,str) or Path(destination).is_absolute() or str(Path(destination))!=destination or '..' in Path(destination).parts:fail('external-artifact-destination-invalid')
        result.append({'path':destination,'data':base64.b64encode(data).decode(),'sha256':sha})
    return result

def ssh_transport(cfg,packet,timeout_ms):
    code=Path(runner.__file__).read_text(encoding='utf-8')
    known=tempfile.NamedTemporaryFile(prefix='cab-external-known-',mode='w+b')
    os.fchmod(known.fileno(),0o770)
    known.write(cfg['known_data']);known.flush()
    rfd,wfd=os.pipe()
    argv=['/usr/bin/sshpass','-d',str(rfd),'/usr/bin/ssh','-F','/dev/null','-p',str(cfg['port']),
      '-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+known.name,'-o','PreferredAuthentications=password',
      '-o','PubkeyAuthentication=no','-o','NumberOfPasswordPrompts=1','-o','ConnectTimeout=10','-o','ForwardAgent=no',
      '-o','ClearAllForwardings=yes','-o','ControlMaster=no','-o','ControlPath=none','-o','UpdateHostKeys=no',
      '-l',cfg['user'],cfg['host'],'python3','-c',shlex.quote(code)]
    try:
        os.write(wfd,(cfg['password']+'\n').encode());os.close(wfd);wfd=-1
        process=subprocess.Popen(argv,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,pass_fds=(rfd,),env={'PATH':'/usr/bin:/bin'},start_new_session=True)
        with LOCK:ACTIVE_PROCESSES[packet['job_id']]=process
        try:out,_error=process.communicate(json.dumps(packet,ensure_ascii=False).encode(),timeout=timeout_ms/1000+30)
        except subprocess.TimeoutExpired:
            process.kill();process.communicate();fail('external-transport-uncertain')
        finally:
            with LOCK:ACTIVE_PROCESSES.pop(packet['job_id'],None)
        if process.returncode or len(out)>2*1024*1024:fail('external-transport-uncertain')
        try:return json.loads(out)
        except (ValueError,UnicodeError):fail('external-response-unverified')
    finally:
        os.close(rfd)
        if wfd!=-1:os.close(wfd)
        known.close()

