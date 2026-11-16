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
from .core.models import Actor,AgentUser,Maintenance
from .paths import STATE,private_dir
from .jsonc import normalize as normalize_jsonc


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


def opencode_config(original,jsonc=False):
    try:
        text=original.decode('utf-8')
        normalized,trailing=normalize_jsonc(text) if jsonc else (text,set())
        document=json.loads(normalized,object_pairs_hook=_unique)
        require(isinstance(document,dict),'agent-config-invalid',409)
        mcp=document.get('mcp',{});require(isinstance(mcp,dict),'agent-config-invalid',409)
        direct=mcp.get('cab')
        if direct is not None:
            require(isinstance(direct,dict) and direct.get('type')=='local' and direct.get('enabled') is not False and direct.get('command')==['/usr/bin/cab','mcp','--agent','opencode'],'agent-cab-conflict',409)
        servers=mcp.get('servers',{});require(isinstance(servers,dict),'agent-config-invalid',409)
        target=['/usr/bin/cab','mcp','--agent','opencode'];current=servers.get('cab')
        if current is not None:
            require(isinstance(current,dict) and current.get('type')=='local' and current.get('disabled') is not True,'agent-cab-conflict',409)
            command=current.get('command')
            if command==target:return original
            require(command in (['/usr/bin/cab','mcp','--agent','codex'],['/usr/bin/cab','mcp','--agent','codex-cli']),'agent-cab-conflict',409)
        newline='\r\n' if '\r\n' in text else '\n'
        expected=copy.deepcopy(document)
        cab={'type':'local','command':target}
        root=normalized.index('{');mcp_span,root_end=_member(normalized,root,'mcp')
        def insert(end,nonempty,key,value):
            i=end-1
            while i>=0 and normalized[i].isspace():i-=1
            comma=',' if nonempty and not any(i<position<end for position in trailing) else ''
            return text[:end]+comma+newline+'  '+json.dumps(key)+': '+json.dumps(value,ensure_ascii=False,separators=(',',':'))+newline+text[end:]
        if mcp_span is None:
            changed=insert(root_end,bool(document),'mcp',{'servers':{'cab':cab}})
            expected['mcp']={'servers':{'cab':cab}}
        else:
            servers_span,mcp_end=_member(normalized,mcp_span[0],'servers')
            if servers_span is None:
                changed=insert(mcp_end,bool(mcp),'servers',{'cab':cab})
                expected['mcp']['servers']={'cab':cab}
            else:
                cab_span,servers_end=_member(normalized,servers_span[0],'cab')
                if cab_span is None:
                    changed=insert(servers_end,bool(servers),'cab',cab)
                    expected['mcp']['servers']['cab']=cab
                else:
                    command_span,_=_member(normalized,cab_span[0],'command');require(command_span is not None,'agent-cab-conflict',409)
                    changed=text[:command_span[0]]+json.dumps(target,ensure_ascii=False)+text[command_span[1]:]
                    expected['mcp']['servers']['cab']['command']=target
        checked,_=normalize_jsonc(changed) if jsonc else (changed,set())
        require(json.loads(checked,object_pairs_hook=_unique)==expected,'agent-config-preservation-failed',409)
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



_CREATE_SCRIPT=r'''import json,os,secrets,sys
p=json.load(sys.stdin);fd=os.open(p['home'],os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW);tmp=None
try:
    for part in ('.config','opencode'):
        try:os.mkdir(part,0o700,dir_fd=fd)
        except FileExistsError:pass
        child=os.open(part,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=fd);os.close(fd);fd=child
    for name in ('opencode.json','opencode.jsonc'):
        try:os.stat(name,dir_fd=fd,follow_symlinks=False)
        except FileNotFoundError:continue
        sys.exit(2)
    tmp='.cab-mcp-'+secrets.token_hex(12)
    out=os.open(tmp,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600,dir_fd=fd)
    with os.fdopen(out,'wb') as stream:
        stream.write(bytes.fromhex(p['content']));stream.flush();os.fsync(stream.fileno())
    try:os.link(tmp,'opencode.jsonc',src_dir_fd=fd,dst_dir_fd=fd,follow_symlinks=False)
    except FileExistsError:sys.exit(2)
    os.unlink(tmp,dir_fd=fd);tmp=None;os.fsync(fd)
    try:os.stat('opencode.json',dir_fd=fd,follow_symlinks=False)
    except FileNotFoundError:pass
    else:sys.exit(3)
finally:
    if tmp is not None:
        try:os.unlink(tmp,dir_fd=fd)
        except FileNotFoundError:pass
    os.close(fd)
'''


def guarded_create_opencode(home,user):
    document={'$schema':'https://opencode.ai/config.json','mcp':{'servers':{'cab':{'type':'local','command':['/usr/bin/cab','mcp','--agent','opencode']}}}}
    content=(json.dumps(document,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
    payload=json.dumps({'home':str(home),'content':content.hex()})
    options={'user':user.pw_uid,'group':user.pw_gid,'extra_groups':os.getgrouplist(user.pw_name,user.pw_gid)} if os.geteuid()==0 else {}
    try:result=subprocess.run([sys.executable,'-c',_CREATE_SCRIPT],input=payload,text=True,capture_output=True,timeout=30,env={'PATH':'/usr/bin:/bin'},**options)
    except (OSError,subprocess.TimeoutExpired):raise Uncertain('agent-config-write-uncertain') from None
    if result.returncode==2:raise Refused('agent-config-changed',409)
    if result.returncode!=0:raise Uncertain('agent-config-write-uncertain')



_PROFILE_CREATE_SCRIPT=r'''import json,os,secrets,sys
p=json.load(sys.stdin);fd=os.open(p['home'],os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW);tmp=None
try:
    for part in ('.config','cab'):
        try:os.mkdir(part,0o700,dir_fd=fd)
        except FileExistsError:pass
        child=os.open(part,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=fd);os.close(fd);fd=child
    tmp='.opencode-'+secrets.token_hex(12)
    out=os.open(tmp,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600,dir_fd=fd)
    with os.fdopen(out,'w') as stream:
        json.dump(p['profile'],stream);stream.write('\n');stream.flush();os.fsync(stream.fileno())
    try:os.link(tmp,'opencode.json',src_dir_fd=fd,dst_dir_fd=fd,follow_symlinks=False)
    except FileExistsError:sys.exit(2)
    os.unlink(tmp,dir_fd=fd);tmp=None;os.fsync(fd)
finally:
    if tmp is not None:
        try:os.unlink(tmp,dir_fd=fd)
        except FileNotFoundError:pass
    os.close(fd)
'''


def ensure_opencode_profile(user):
    home=Path(user.pw_dir);folder=home/'.config/cab';target=folder/'opencode.json'
    for parent in (home/'.config',folder):
        require(not parent.is_symlink() and (not parent.exists() or parent.resolve()==parent and parent.is_dir()),'agent-profile-unsafe',409)
    require(not target.is_symlink(),'agent-profile-unsafe',409)
    try:fd=os.open(target,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
    except FileNotFoundError:fd=None
    except OSError:raise Refused('agent-profile-unsafe',409) from None
    if fd is not None:
        try:
            info=os.fstat(fd);require(stat.S_ISREG(info.st_mode) and info.st_nlink==1 and info.st_uid==user.pw_uid and info.st_size<=16384,'agent-profile-unsafe',409)
            with os.fdopen(os.dup(fd),'rb') as stream:profile=json.load(stream)
            require(isinstance(profile,dict) and isinstance(profile.get('actor_id'),str) and isinstance(profile.get('token'),str) and profile['token'],'agent-profile-invalid',409)
            actor=Actor.objects.filter(pk=profile['actor_id'],uid=user.pw_uid,agent='opencode',active=True).first()
            require(actor is not None and secrets.compare_digest(actor.token_hash,hashlib.sha256(profile['token'].encode()).hexdigest()),'agent-profile-invalid',409)
        except (ValueError,UnicodeError,TypeError):raise Refused('agent-profile-invalid',409) from None
        finally:os.close(fd)
        return
    actor_id='opencode-'+str(user.pw_uid)+'-coder'
    with transaction.atomic():
        require(not Actor.objects.filter(pk=actor_id).exists(),'agent-profile-conflict',409)
        token=secrets.token_urlsafe(48)
        Actor.objects.create(pk=actor_id,uid=user.pw_uid,agent='opencode',role='coder',token_hash=hashlib.sha256(token.encode()).hexdigest())
        payload=json.dumps({'home':str(home),'profile':{'actor_id':actor_id,'token':token}})
        options={'user':user.pw_uid,'group':user.pw_gid,'extra_groups':os.getgrouplist(user.pw_name,user.pw_gid)} if os.geteuid()==0 else {}
        try:result=subprocess.run([sys.executable,'-c',_PROFILE_CREATE_SCRIPT],input=payload,text=True,capture_output=True,timeout=30,env={'PATH':'/usr/bin:/bin'},**options)
        except (OSError,subprocess.TimeoutExpired):raise Uncertain('agent-profile-write-uncertain') from None
        if result.returncode==2:raise Refused('agent-profile-changed',409)
        if result.returncode!=0:raise Uncertain('agent-profile-write-uncertain')


def merge_opencode_jsonc(json_bytes,jsonc_bytes):
    try:
        source=json.loads(json_bytes.decode('utf-8'),object_pairs_hook=_unique)
        text=jsonc_bytes.decode('utf-8')
        normalized,_=normalize_jsonc(text)
        target=json.loads(normalized,object_pairs_hook=_unique)
        require(isinstance(source,dict) and isinstance(target,dict),'agent-config-invalid',409)
        def add_missing(source_obj,target_obj,path):
            nonlocal text
            for key,value in source_obj.items():
                if key in target_obj:
                    if isinstance(value,dict) and isinstance(target_obj[key],dict):
                        add_missing(value,target_obj[key],path+[key])
                    continue
                normalized,trailing=normalize_jsonc(text)
                start=normalized.index('{')
                for part in path:
                    span,_=_member(normalized,start,part)
                    if span is None:raise ValueError('missing-parent')
                    start=span[0]
                _,end=_member(normalized,start,key)
                i=end-1
                while i>=0 and normalized[i].isspace():i-=1
                comma=',' if target_obj and not any(i<position<end for position in trailing) else ''
                newline='\r\n' if '\r\n' in text else '\n'
                text=text[:end]+comma+newline+'  '+json.dumps(key,ensure_ascii=False)+': '+json.dumps(value,ensure_ascii=False)+newline+text[end:]
                target_obj[key]=copy.deepcopy(value)
        expected=copy.deepcopy(target)
        add_missing(source,expected,[])
        checked,_=normalize_jsonc(text)
        require(json.loads(checked,object_pairs_hook=_unique)==expected,'agent-config-preservation-failed',409)
        return text.encode('utf-8')
    except Refused:raise
    except (ValueError,UnicodeError,TypeError,KeyError,IndexError):raise Refused('agent-config-invalid',409) from None


_COLLAPSE_SCRIPT=r'''import fcntl,hashlib,json,os,secrets,stat,sys
p=json.load(sys.stdin);source=p['source'];target=p['target'];folder=os.path.dirname(source);tmp=None
def read(path):
    fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW);info=os.fstat(fd)
    if not stat.S_ISREG(info.st_mode) or info.st_nlink!=1 or info.st_uid!=os.getuid() or info.st_size>4194304:os.close(fd);sys.exit(2)
    with os.fdopen(os.dup(fd),'rb') as f:data=f.read(4194305)
    return fd,info,data
fd,info,raw=read(source);fcntl.flock(fd,fcntl.LOCK_EX)
try:
    if hashlib.sha256(raw).hexdigest()!=p['source_hash']:sys.exit(2)
    try:other,oi,old=read(target)
    except FileNotFoundError:other=None;old=None
    try:
        if other is not None:fcntl.flock(other,fcntl.LOCK_EX)
        if (hashlib.sha256(old).hexdigest() if old is not None else None)!=p['target_hash']:sys.exit(2)
        tmp=os.path.join(folder,'.cab-opencode-'+secrets.token_hex(12));out=os.open(tmp,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
        with os.fdopen(out,'wb') as f:
            original=oi if other is not None else info
            os.fchown(f.fileno(),-1,original.st_gid);os.fchmod(f.fileno(),stat.S_IMODE(original.st_mode))
            if other is not None:
                for key in os.listxattr(other):os.setxattr(f.fileno(),key,os.getxattr(other,key))
            else:
                for key in os.listxattr(fd):os.setxattr(f.fileno(),key,os.getxattr(fd,key))
            f.write(bytes.fromhex(p['content']));f.flush();os.fsync(f.fileno())
        now=os.stat(source,follow_symlinks=False)
        if (info.st_dev,info.st_ino,info.st_mtime_ns,info.st_ctime_ns,info.st_size)!=(now.st_dev,now.st_ino,now.st_mtime_ns,now.st_ctime_ns,now.st_size):sys.exit(2)
        if other is None:
            try:os.link(tmp,target,follow_symlinks=False)
            except FileExistsError:sys.exit(2)
            os.unlink(tmp);tmp=None
        else:
            now=os.stat(target,follow_symlinks=False)
            if (oi.st_dev,oi.st_ino,oi.st_mtime_ns,oi.st_ctime_ns,oi.st_size)!=(now.st_dev,now.st_ino,now.st_mtime_ns,now.st_ctime_ns,now.st_size):sys.exit(2)
            os.replace(tmp,target);tmp=None
        d=os.open(folder,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
        try:
            os.fsync(d)
            now=os.stat(source,follow_symlinks=False)
            if (info.st_dev,info.st_ino,info.st_mtime_ns,info.st_ctime_ns,info.st_size)!=(now.st_dev,now.st_ino,now.st_mtime_ns,now.st_ctime_ns,now.st_size):sys.exit(3)
            os.unlink(source);os.fsync(d)
        finally:os.close(d)
    finally:
        if other is not None:os.close(other)
finally:
    os.close(fd)
    if tmp is not None:
        try:os.unlink(tmp)
        except FileNotFoundError:pass
'''


def collapse_opencode(source,target,user):
    def read_safe(path):
        try:fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
        except FileNotFoundError:return None
        except OSError:raise Refused('agent-config-unsafe',409) from None
        try:
            info=os.fstat(fd);require(stat.S_ISREG(info.st_mode) and info.st_nlink==1 and info.st_uid==user.pw_uid and info.st_size<=4194304,'agent-config-unsafe',409)
            with os.fdopen(os.dup(fd),'rb') as f:return f.read(4194305)
        finally:os.close(fd)
    original=read_safe(source);require(original is not None,'agent-config-changed',409)
    existing=read_safe(target)
    merged=merge_opencode_jsonc(original,existing) if existing is not None else original
    changed=opencode_config(merged,jsonc=True)
    ensure_opencode_profile(user)
    backups=private_dir(STATE/'integration-backups')
    for data in (original,existing):
        if data is None:continue
        backup=backups/('agent-config-'+str(user.pw_uid)+'-'+secrets.token_hex(16)+'.backup')
        fd=os.open(backup,os.O_CREAT|os.O_EXCL|os.O_WRONLY|os.O_NOFOLLOW,0o600)
        with os.fdopen(fd,'wb') as f:f.write(data);f.flush();os.fsync(f.fileno())
    options={'user':user.pw_uid,'group':user.pw_gid,'extra_groups':os.getgrouplist(user.pw_name,user.pw_gid)} if os.getuid()==0 else {}
    payload=json.dumps({'source':str(source),'target':str(target),'source_hash':hashlib.sha256(original).hexdigest(),'target_hash':hashlib.sha256(existing).hexdigest() if existing is not None else None,'content':changed.hex()})
    try:result=subprocess.run([sys.executable,'-c',_COLLAPSE_SCRIPT],input=payload,text=True,capture_output=True,timeout=30,env={'PATH':'/usr/bin:/bin'},**options)
    except (OSError,subprocess.TimeoutExpired):raise Uncertain('agent-config-write-uncertain') from None
    if result.returncode==2:raise Refused('agent-config-changed',409)
    if result.returncode!=0:raise Uncertain('agent-config-write-uncertain')


def observe_and_reconcile(row):
    account=local_account(row.username)
    require(account['uid']==row.uid and account['home']==row.home,'agent-account-identity-changed',409)
    try:user=pwd.getpwnam(row.username)
    except KeyError:raise Refused('agent-account-missing',409) from None
    require(user.pw_uid==account['uid'] and user.pw_gid==account['gid'] and user.pw_dir==account['home'],'agent-account-identity-changed',409)
    home=Path(row.home);require(home.resolve()==home,'agent-home-unsafe',409)
    codex=row.agent_id in ('codex_desktop','codex')
    target=home/'.codex/config.toml' if codex else home/'.config/opencode/opencode.json'
    if not codex:
        candidates=(target,target.with_suffix('.jsonc'))
        for candidate in candidates:require(not candidate.is_symlink(),'agent-config-unsafe',409)
        present=[candidate for candidate in candidates if candidate.exists()]
        if not present:
            guarded_create_opencode(home,user)
            ensure_opencode_profile(user)
            return {'config_present':True,'config_path':str(candidates[1]),'mcp_declared':True,'config_error':''}
        if candidates[0] in present:
            parent=candidates[0].parent
            while parent!=home:
                require(not parent.is_symlink() and (not parent.exists() or parent.resolve()==parent and parent.is_dir()),'agent-config-unsafe',409)
                parent=parent.parent
            collapse_opencode(candidates[0],candidates[1],user)
            return {'config_present':True,'config_path':str(candidates[1]),'mcp_declared':True,'config_error':''}
        target=candidates[1]
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
        else:
            changed=opencode_config(original,jsonc=target.suffix=='.jsonc')
            ensure_opencode_profile(user)
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
