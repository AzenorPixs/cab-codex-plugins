"""Réconciliation bornée de l'entrée MCP CAB des comptes déclarés."""
import copy
import fcntl
import hashlib
import json
import os
from pathlib import Path
import pwd
import re
import secrets
import stat
import subprocess
import sys
import tomllib
from django.db import close_old_connections,connection,transaction
from .agent_users import local_account
from .core.commands import Refused,require
from .core.models import AgentUser,Maintenance
from .paths import STATE,private_dir


class Uncertain(Exception):pass


def codex_config(original,connector):
    try:
        text=original.decode('utf-8')
        document=tomllib.loads(text)
    except (UnicodeError,ValueError):raise Refused('agent-config-invalid',409) from None
    servers=document.get('mcp_servers',{})
    require(isinstance(servers,dict),'agent-config-invalid',409)
    target=['mcp','--agent',connector]
    current=servers.get('cab')
    if current is None:
        suffix=('' if not text or text.endswith('\n') else '\n')+'\n[mcp_servers.cab]\ncommand = "/usr/bin/cab"\nargs = ["mcp", "--agent", "'+connector+'"]\ntool_timeout_sec = 86430\n'
        changed=text+suffix
    else:
        require(isinstance(current,dict) and current.get('command')=='/usr/bin/cab','agent-cab-conflict',409)
        old=current.get('args')
        if old==target:return original
        require(old in (['mcp','--agent','codex'],['mcp','--agent','codex-cli']),'agent-cab-conflict',409)
        header=re.search(r'(?m)^\s*\[\s*mcp_servers\s*\.\s*(?:cab|"cab"|\'cab\')\s*\]\s*(?:#.*)?$',text)
        require(header is not None,'agent-cab-conflict',409)
        following=re.search(r'(?m)^\s*\[',text[header.end():])
        end=header.end()+following.start() if following else len(text)
        section=text[header.end():end]
        pattern=r'(?m)^(\s*args\s*=\s*)\[[^\]]*\]'
        changed_section,count=re.subn(pattern,lambda m:m.group(1)+json.dumps(target,ensure_ascii=False),section)
        require(count==1,'agent-cab-conflict',409)
        changed=text[:header.end()]+changed_section+text[end:]
    try:updated=tomllib.loads(changed)
    except ValueError:raise Refused('agent-config-invalid',409) from None
    expected=copy.deepcopy(document)
    if current is None:expected.setdefault('mcp_servers',{})['cab']={'command':'/usr/bin/cab','args':target,'tool_timeout_sec':86430}
    else:expected['mcp_servers']['cab']['args']=target
    require(updated==expected,'agent-config-preservation-failed',409)
    return changed.encode('utf-8')


def _unique(pairs):
    value={}
    for key,item in pairs:
        if key in value:raise ValueError('duplicate')
        value[key]=item
    return value


def _member(text,start,wanted):
    decoder=json.JSONDecoder();n=len(text);i=start+1
    while i<n:
        while i<n and text[i].isspace():i+=1
        if i<n and text[i]=='}':return None,i
        key,i=decoder.raw_decode(text,i)
        while i<n and text[i].isspace():i+=1
        if i>=n or text[i]!=':':raise ValueError('invalid-object')
        i+=1
        while i<n and text[i].isspace():i+=1
        begin=i;_,i=decoder.raw_decode(text,i)
        if key==wanted:return (begin,i),None
        while i<n and text[i].isspace():i+=1
        if i<n and text[i]==',':i+=1;continue
        if i<n and text[i]=='}':return None,i
        raise ValueError('invalid-object')
    raise ValueError('invalid-object')


def opencode_config(original):
    try:
        text=original.decode('utf-8');document=json.loads(text,object_pairs_hook=_unique)
        require(isinstance(document,dict),'agent-config-invalid',409)
        servers=document.get('mcp',{});require(isinstance(servers,dict),'agent-config-invalid',409)
        target=['/usr/bin/cab','mcp','--agent','opencode'];current=servers.get('cab')
        if current is not None:
            require(isinstance(current,dict) and current.get('type')=='local','agent-cab-conflict',409)
            command=current.get('command')
            if command==target:return original
            require(command in ([ '/usr/bin/cab','mcp','--agent','codex'],['/usr/bin/cab','mcp','--agent','codex-cli']),'agent-cab-conflict',409)
        root=text.index('{');mcp_span,root_end=_member(text,root,'mcp')
        expected=copy.deepcopy(document)
        if mcp_span is None:
            entry=json.dumps({'cab':{'type':'local','command':target,'enabled':True}},ensure_ascii=False,separators=(',',':'))
            changed=text[:root_end]+(',' if document else '')+'\n  "mcp": '+entry+'\n'+text[root_end:]
            expected['mcp']={'cab':{'type':'local','command':target,'enabled':True}}
        else:
            mcp_start=mcp_span[0];cab_span,mcp_end=_member(text,mcp_start,'cab')
            if cab_span is None:
                entry=json.dumps({'type':'local','command':target,'enabled':True},ensure_ascii=False,separators=(',',':'))
                changed=text[:mcp_end]+(',' if servers else '')+'\n    "cab": '+entry+'\n'+text[mcp_end:]
                expected['mcp']['cab']={'type':'local','command':target,'enabled':True}
            else:
                command_span,_=_member(text,cab_span[0],'command');require(command_span is not None,'agent-cab-conflict',409)
                changed=text[:command_span[0]]+json.dumps(target,ensure_ascii=False)+text[command_span[1]:]
                expected['mcp']['cab']['command']=target
        require(json.loads(changed,object_pairs_hook=_unique)==expected,'agent-config-preservation-failed',409)
        return changed.encode('utf-8')
    except Refused:raise
    except (ValueError,UnicodeError,KeyError,TypeError,IndexError):raise Refused('agent-config-invalid',409) from None


_REPLACE_SCRIPT=r'''import hashlib,json,os,secrets,stat,sys
p=json.load(sys.stdin);path=p['path'];folder=os.path.dirname(path);name=os.path.basename(path)
fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
tmp=None
try:
    fcntl=__import__('fcntl');fcntl.flock(fd,fcntl.LOCK_EX);before=os.fstat(fd)
    if not stat.S_ISREG(before.st_mode) or before.st_nlink!=1 or before.st_uid!=os.getuid() or before.st_size>4194304:sys.exit(2)
    with os.fdopen(os.dup(fd),'rb') as f:raw=f.read(4194305)
    if hashlib.sha256(raw).hexdigest()!=p['expected']:sys.exit(2)
    tmp=os.path.join(folder,'.cab-mcp-'+secrets.token_hex(12));out=os.open(tmp,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
    with os.fdopen(out,'wb') as f:
        os.fchown(f.fileno(),-1,before.st_gid);os.fchmod(f.fileno(),stat.S_IMODE(before.st_mode))
        for key in os.listxattr(fd):os.setxattr(f.fileno(),key,os.getxattr(fd,key))
        f.write(bytes.fromhex(p['content']));f.flush();os.fsync(f.fileno())
    now=os.stat(path,follow_symlinks=False)
    if (before.st_dev,before.st_ino,before.st_mtime_ns,before.st_ctime_ns,before.st_size)!=(now.st_dev,now.st_ino,now.st_mtime_ns,now.st_ctime_ns,now.st_size):sys.exit(2)
    os.replace(tmp,path);tmp=None
    d=os.open(folder,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
    try:os.fsync(d)
    finally:os.close(d)
finally:
    os.close(fd)
    if tmp is not None:
        try:os.unlink(tmp)
        except FileNotFoundError:pass
'''


def guarded_replace(path,user,original,changed):
    backups=private_dir(STATE/'integration-backups')
    backup=backups/('agent-config-'+str(user.pw_uid)+'-'+secrets.token_hex(16)+'.backup')
    fd=os.open(backup,os.O_CREAT|os.O_EXCL|os.O_WRONLY|os.O_NOFOLLOW,0o600)
    with os.fdopen(fd,'wb') as stream:
        stream.write(original);stream.flush();os.fsync(stream.fileno())
    options={'user':user.pw_uid,'group':user.pw_gid,'extra_groups':os.getgrouplist(user.pw_name,user.pw_gid)} if os.getuid()==0 else {}
    env={'PATH':'/usr/bin:/bin','HOME':user.pw_dir,'USER':user.pw_name,'LANG':'C.UTF-8','PYTHONDONTWRITEBYTECODE':'1'}
    payload=json.dumps({'path':str(path),'expected':hashlib.sha256(original).hexdigest(),'content':changed.hex()})
    try:result=subprocess.run([sys.executable,'-c',_REPLACE_SCRIPT],input=payload,text=True,capture_output=True,timeout=30,env=env,**options)
    except (OSError,subprocess.TimeoutExpired):raise Uncertain('agent-config-write-uncertain') from None
    if result.returncode==2:raise Refused('agent-config-changed',409)
    if result.returncode:raise Uncertain('agent-config-write-uncertain')


def observe_and_reconcile(row):
    account=local_account(row.username)
    require(account['uid']==row.uid and account['home']==row.home,'agent-account-identity-changed',409)
    try:user=pwd.getpwnam(row.username)
    except KeyError:raise Refused('agent-account-missing',409) from None
    require(user.pw_uid==account['uid'] and user.pw_gid==account['gid'] and user.pw_dir==account['home'],'agent-account-identity-changed',409)
    home=Path(row.home);require(home.resolve()==home,'agent-home-unsafe',409)
    codex=row.agent_id in ('codex_desktop','codex')
    target=home/('.codex/config.toml' if codex else '.config/opencode/opencode.json')
    parent=target.parent
    while parent!=home:
        require(not parent.is_symlink() and (not parent.exists() or parent.resolve()==parent and parent.is_dir()),'agent-config-unsafe',409)
        parent=parent.parent
    require(not target.is_symlink(),'agent-config-unsafe',409)
    try:fd=os.open(target,os.O_RDONLY|os.O_NOFOLLOW)
    except FileNotFoundError:return {'config_present':False,'config_path':'','mcp_declared':False,'config_error':''}
    except OSError:raise Refused('agent-config-unreadable',409) from None
    try:
        info=os.fstat(fd);require(stat.S_ISREG(info.st_mode) and info.st_nlink==1 and info.st_uid==row.uid and info.st_size<=4194304,'agent-config-unsafe',409)
        with os.fdopen(os.dup(fd),'rb') as stream:original=stream.read(4194305)
    finally:os.close(fd)
    try:
        if codex:
            desktop=AgentUser.objects.filter(agent_id='codex_desktop',uid=row.uid).exists()
            connector='codex' if row.agent_id=='codex_desktop' or desktop else 'codex-cli'
            changed=codex_config(original,connector)
        else:changed=opencode_config(original)
    except Refused as error:
        return {'config_present':True,'config_path':str(target),'mcp_declared':False,'config_error':error.code}
    if changed!=original:guarded_replace(target,user,original,changed)
    return {'config_present':True,'config_path':str(target),'mcp_declared':True,'config_error':''}


def work_one():
    try:
        with transaction.atomic():
            with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_xact_lock(%s)',[300001])
            if Maintenance.objects.filter(state__in=['PREPARED','INSTALLING']).exists():return
            row=AgentUser.objects.select_for_update(skip_locked=True).filter(reconcile_state='PENDING').order_by('pk').first()
            if row is None:return
            row.reconcile_state='RUNNING';row.save(update_fields=['reconcile_state']);row_id=row.pk
        try:
            locks=private_dir(STATE/'agent-config-locks');fd=os.open(locks/(str(row.uid)+'.lock'),os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW,0o600)
            try:fcntl.flock(fd,fcntl.LOCK_EX);values=observe_and_reconcile(row)
            finally:os.close(fd)
            values['reconcile_state']='IDLE'
        except Refused as error:
            values={'config_present':None,'config_path':'','mcp_declared':None,'config_error':error.code,'reconcile_state':'FAILED'}
        except Exception:
            values={'config_present':None,'config_path':'','mcp_declared':None,'config_error':'agent-config-write-uncertain','reconcile_state':'UNCERTAIN'}
        AgentUser.objects.filter(pk=row_id,reconcile_state='RUNNING').update(**values)
    finally:close_old_connections()


def recover_interrupted():
    AgentUser.objects.filter(reconcile_state='RUNNING').update(reconcile_state='UNCERTAIN',config_error='agent-config-write-uncertain')
