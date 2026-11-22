"""Édition locale des forges et conservation chiffrée de leurs tokens."""
import base64
import hashlib
import json
import os
from pathlib import Path
import pwd
import re
import stat
import subprocess
import sys
from django.db import transaction
from .core.commands import Refused,require
from .core.models import Project
from .project_metadata import FORGES,SUFFIXES,ASSIGNMENT,public_value

_IO=r'''import base64,fcntl,hashlib,json,os,secrets,stat,sys
p=json.load(sys.stdin);root=p['root'];uid=os.getuid();rfd=os.open(root,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW);dfd=None

def read(fd,name,missing=False):
    try:f=os.open(name,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK,dir_fd=fd)
    except FileNotFoundError:
        if missing:return None,None
        raise
    with os.fdopen(f,'rb') as s:
        info=os.fstat(s.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_nlink!=1 or info.st_size>1048576:raise ValueError('file-unsafe')
        data=s.read(1048577)
        if len(data)>1048576:raise ValueError('file-unsafe')
        return data,info

def put(fd,name,data,old,info):
    tmp='.cab-write-'+secrets.token_hex(12);out=None
    try:
        out=os.open(tmp,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600,dir_fd=fd)
        with os.fdopen(out,'wb') as s:
            out=None
            if info is not None:
                os.fchmod(s.fileno(),stat.S_IMODE(info.st_mode));os.fchown(s.fileno(),-1,info.st_gid)
                original=os.open(name,os.O_RDONLY|os.O_NOFOLLOW,dir_fd=fd)
                try:
                    for attr in os.listxattr(original):os.setxattr(s.fileno(),attr,os.getxattr(original,attr))
                finally:os.close(original)
            s.write(data);s.flush();os.fsync(s.fileno())
        current,now=read(fd,name,True)
        if old!=current or (info is None)!=(now is None):raise ValueError('file-changed')
        if info is not None and (info.st_dev,info.st_ino,info.st_mtime_ns,info.st_ctime_ns)!=(now.st_dev,now.st_ino,now.st_mtime_ns,now.st_ctime_ns):raise ValueError('file-changed')
        if old is None:
            os.link(tmp,name,src_dir_fd=fd,dst_dir_fd=fd,follow_symlinks=False);os.unlink(tmp,dir_fd=fd);tmp=None
        else:os.replace(tmp,name,src_dir_fd=fd,dst_dir_fd=fd);tmp=None
        os.fsync(fd)
    finally:
        if out is not None:os.close(out)
        if tmp is not None:
            try:os.unlink(tmp,dir_fd=fd)
            except FileNotFoundError:pass
try:
    op=p['op'];env,envinfo=read(rfd,'project.env')
    if op=='env-read':result={'content':base64.b64encode(env).decode(),'digest':hashlib.sha256(env).hexdigest()}
    elif op=='env-write':
        if hashlib.sha256(env).hexdigest()!=p['digest']:raise ValueError('file-changed')
        data=base64.b64decode(p['content'],validate=True)
        if data!=env:put(rfd,'project.env',data,env,envinfo)
        result={'saved':True}
    else:
        try:dfd=os.open('config',os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=rfd)
        except FileNotFoundError:
            if op=='token-read':result={'token':None}
            else:os.mkdir('config',0o700,dir_fd=rfd);dfd=os.open('config',os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=rfd)
        if dfd is not None:
            name=p['forge'].lower()+'.token';token,info=read(dfd,name,True)
            if op=='token-read':result={'token':None if token is None else base64.b64encode(token).decode()}
            else:
                previous=p.get('digest');actual=None if token is None else hashlib.sha256(token).hexdigest()
                if previous!=actual:raise ValueError('file-changed')
                username,usernameinfo=read(dfd,p['forge'].lower()+'.username',True)
                put(dfd,name,base64.b64decode(p['token'],validate=True),token,info)
                put(dfd,p['forge'].lower()+'.username',p['username'].encode(),username,usernameinfo)
                result={'saved':True}
    print(json.dumps(result))
finally:
    if dfd is not None:os.close(dfd)
    os.close(rfd)
'''


def file_operation(project,payload):
    user=pwd.getpwuid(project.owner_uid);root=Path(project.root)
    require(root.is_absolute() and root.resolve()==root and root.is_dir(),'forge-project-unsafe',409)
    options={'user':user.pw_uid,'group':user.pw_gid,'extra_groups':os.getgrouplist(user.pw_name,user.pw_gid)} if os.geteuid()==0 else {}
    require(os.geteuid() in (0,user.pw_uid),'forge-owner-unavailable',403)
    try:r=subprocess.run([sys.executable,'-c',_IO],input=json.dumps({'root':str(root),**payload}),text=True,capture_output=True,timeout=20,cwd='/',env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8'},**options)
    except (OSError,subprocess.TimeoutExpired):raise Refused('forge-file-outcome-uncertain',409) from None
    if r.returncode:raise Refused('forge-file-outcome-uncertain' if payload['op'] in ('env-write','token-write') else 'forge-file-unavailable',409)
    try:return json.loads(r.stdout)
    except ValueError:raise Refused('forge-file-outcome-uncertain',409) from None


def validate_forge(forge):
    require(forge in FORGES,'forge-invalid',400)


def token_read(project,forge):
    validate_forge(forge);value=file_operation(project,{'op':'token-read','forge':forge})['token']
    if value is None:return None
    try:
        raw=base64.b64decode(value,validate=True)
        require(len(raw)<=16384,'forge-token-invalid',409)
        return raw.decode('utf-8').rstrip('\r\n')
    except (ValueError,UnicodeError):raise Refused('forge-token-invalid',409) from None


def crypt(project,forge,data,decrypt=False):
    name='cab-forge-'+hashlib.sha256((project.pk+':'+forge).encode()).hexdigest()[:24]
    return crypt_credential(name, data, decrypt)


def crypt_credential(name, data, decrypt=False, failure='forge-tpm-unavailable'):
    argv=['/usr/bin/systemd-creds','--name='+name]
    if not decrypt:argv+=['--with-key=tpm2','--tpm2-device=/dev/tpmrm0']
    argv+=['decrypt' if decrypt else 'encrypt','-','-']
    try:r=subprocess.run(argv,input=data,capture_output=True,timeout=20,env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8'})
    except (OSError,subprocess.TimeoutExpired):raise Refused(failure,503) from None
    require(r.returncode==0,failure,503)
    return r.stdout


def synchronize_tokens(project):
    changed=False;configuration=dict(project.configuration or {});stored=dict(configuration.get('forge_tokens_tpm') or {})
    for forge in FORGES:
        token=token_read(project,forge);old=stored.get(forge)
        if token is None or not token.strip():
            if forge in stored:del stored[forge];changed=True
        elif old is None or crypt(project,forge,old.encode(),True)!=token.encode():
            stored[forge]=crypt(project,forge,token.encode()).decode();changed=True
    if changed:
        configuration['forge_tokens_tpm']=stored;project.configuration=configuration;project.save(update_fields=['configuration'])
    return changed


def edit_values(project,forge,fields,token,digest):
    validate_forge(forge);require(isinstance(fields,dict),'forge-values-invalid',400)
    keys={f'REMOTE_{forge}_{suffix}' for suffix in SUFFIXES};require(set(fields)<=keys,'forge-values-invalid',400)
    for key,value in fields.items():require(isinstance(value,str) and (not value or public_value(key,value)),'forge-values-invalid',400)
    require(token is None or isinstance(token,str) and len(token.encode())<=16384 and not any(c in token for c in '\r\n\0'),'forge-token-invalid',400)
    current=file_operation(project,{'op':'env-read'});raw=base64.b64decode(current['content']);require(current['digest']==digest,'forge-file-changed',409)
    try:text=raw.decode('utf-8')
    except UnicodeError:raise Refused('forge-file-invalid',409) from None
    seen=set();lines=[]
    for line in text.splitlines(keepends=True):
        m=re.match(r'\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=',line)
        if m and m.group(1) in fields:
            key=m.group(1);match=ASSIGNMENT.fullmatch(line.rstrip('\r\n'));require(key not in seen and match is not None,'forge-file-invalid',409);seen.add(key)
            previous=next(part for part in match.groups()[1:] if part is not None).strip()
            if previous!=fields[key]:
                newline='\r\n' if line.endswith('\r\n') else '\n' if line.endswith('\n') else ''
                line=key+'='+json.dumps(fields[key],ensure_ascii=False)+newline
        lines.append(line)
    for key,value in fields.items():
        if key not in seen and value:
            if lines and not lines[-1].endswith(('\n','\r')):lines[-1]+='\n'
            lines.append(key+'='+json.dumps(value,ensure_ascii=False)+'\n')
    changed=''.join(lines).encode('utf-8')
    if token is not None:
        previous_data=file_operation(project,{'op':'token-read','forge':forge})['token'];previous_raw=None if previous_data is None else base64.b64decode(previous_data,validate=True);previous=None if previous_raw is None else previous_raw.decode('utf-8').rstrip('\r\n');crypt(project,forge,token.encode())
        owner=fields.get(f'REMOTE_{forge}_OWNER','');require(bool(owner),'forge-owner-required',400)
    file_operation(project,{'op':'env-write','digest':digest,'content':base64.b64encode(changed).decode()})
    if token is not None and token!=previous:
        file_operation(project,{'op':'token-write','forge':forge,'digest':None if previous_raw is None else hashlib.sha256(previous_raw).hexdigest(),'token':base64.b64encode(token.encode()).decode(),'username':owner})
