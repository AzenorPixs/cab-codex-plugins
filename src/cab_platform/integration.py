"""Intégrations explicites, avec sauvegarde privée et sans toucher aux autres serveurs."""
import hashlib
import fcntl
import json
import os
from pathlib import Path
import pwd
import shutil
import subprocess
import time
import secrets
import tomllib
import sys
import re
import stat
from . import __version__
from .client import ClientError
from .paths import STATE,private_dir,atomic_json,read_json,config

def read_user_file(path,uid):
    fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
    with os.fdopen(fd,'rb') as stream:
        info=os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_uid!=uid or info.st_nlink!=1 or info.st_size>16*1024*1024:raise ClientError('integration-file-owner-invalid')
        return stream.read()

def write_user_file(path,content,env,options):
    script='''import os,secrets,sys
from pathlib import Path
path=Path(sys.argv[1]);path.parent.mkdir(parents=True,exist_ok=True)
temporary=path.with_name('.cab-'+secrets.token_hex(8))
fd=os.open(temporary,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
with os.fdopen(fd,'wb') as stream:stream.write(sys.stdin.buffer.read());stream.flush();os.fsync(stream.fileno())
os.replace(temporary,path)
'''
    result=subprocess.run([sys.executable,'-c',script,str(path)],input=content,env=env,capture_output=True,timeout=30,**options)
    if result.returncode:raise ClientError('integration-file-write-failed')

def write_profile(user,agent,payload):
    import re
    if not re.fullmatch('[A-Za-z0-9_-]{1,40}',agent):raise ClientError('client-agent-invalid')
    fd=os.open(user.pw_dir,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
    try:
        for name in ['.config','cab']:
            try:os.mkdir(name,mode=0o700,dir_fd=fd);created=True
            except FileExistsError:created=False
            child=os.open(name,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=fd)
            if created:os.fchown(child,user.pw_uid,user.pw_gid)
            if os.fstat(child).st_uid!=user.pw_uid:os.close(child);raise ClientError('client-directory-owner-invalid')
            os.close(fd);fd=child
        os.fchmod(fd,0o700);temporary='.'+agent+'-'+secrets.token_hex(8)
        file=os.open(temporary,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600,dir_fd=fd)
        with os.fdopen(file,'w') as stream:
            json.dump(payload,stream);stream.write('\n');stream.flush();os.fsync(stream.fileno());os.fchown(stream.fileno(),user.pw_uid,user.pw_gid)
        os.replace(temporary,agent+'.json',src_dir_fd=fd,dst_dir_fd=fd);os.fsync(fd)
    finally:os.close(fd)
    return Path(user.pw_dir)/'.config/cab'/(agent+'.json')

def initialize_profiles(profiles):
    from .core.models import Actor
    for profile in profiles:
        user=pwd.getpwuid(profile['uid']);agent=profile['agent'];role=profile['role']
        if role not in ('coder','orchestrator','collector'):raise ClientError('bootstrap-profile-role-invalid')
        actor_id=agent+'-'+str(user.pw_uid)+'-'+role;token=secrets.token_urlsafe(48)
        actor,created=Actor.objects.get_or_create(pk=actor_id,defaults={'uid':user.pw_uid,'agent':agent,'role':role,'token_hash':hashlib.sha256(token.encode()).hexdigest(),'native':profile.get('native',{})})
        if not created:
            if actor.run_set.exists():continue
            actor.token_hash=hashlib.sha256(token.encode()).hexdigest();actor.save()
        write_profile(user,agent,{'actor_id':actor.pk,'token':token})

def payload_digest(package_root):
    for label,folder in [('CAB','cab'),('CCAB','ccab'),('CABU','cabu')]:
        manifest=package_root/'plugins'/folder/'.codex-plugin/plugin.json'
        if not manifest.is_file() or not (package_root/'plugins'/folder/'skills'/folder/'SKILL.md').is_file() or not (package_root/'commands'/(label+'.md')).is_file():raise ClientError('integration-payload-missing')
        data=json.loads(manifest.read_text())
        if data.get('name')!=label or data.get('version')!=__version__:raise ClientError('integration-payload-version-invalid')
    values=[]
    for folder in ('plugins','commands'):
        for path in sorted((package_root/folder).rglob('*')):
            if path.is_symlink():raise ClientError('integration-payload-unsafe')
            if path.is_file():values.append([str(path.relative_to(package_root)),hashlib.sha256(path.read_bytes()).hexdigest()])
    if not values:raise ClientError('integration-payload-missing')
    return hashlib.sha256(json.dumps(values,sort_keys=True).encode()).hexdigest()


def integration_files(user,agent,package_root):
    home=Path(user.pw_dir);target=home/('.codex/config.toml' if agent=='codex' else '.config/opencode/opencode.json')
    values={'configuration':hashlib.sha256(read_user_file(target,user.pw_uid)).hexdigest()}
    if agent=='codex':
        for name in ('CAB.md','CCAB.md','CABU.md'):
            values[name]=hashlib.sha256(read_user_file(home/'.codex/commands'/name,user.pw_uid)).hexdigest()
        for label,folder in [('CAB','cab'),('CCAB','ccab'),('CABU','cabu')]:
            source=package_root/'plugins'/folder
            version=json.loads((source/'.codex-plugin/plugin.json').read_text())['version']
            cached=home/'.codex/plugins/cache/cab_codex_plugins'/label/version
            for path in sorted(source.rglob('*')):
                if path.is_file():
                    relative=path.relative_to(source);content=read_user_file(cached/relative,user.pw_uid)
                    if hashlib.sha256(content).digest()!=hashlib.sha256(path.read_bytes()).digest():raise ClientError('codex-plugin-payload-mismatch')
                    values[label+'/'+str(relative)]=hashlib.sha256(content).hexdigest()
    return values


def integrate(agent,username,workspace=None,package_root=Path('/usr/lib/cab')):
    user=pwd.getpwnam(username)
    if agent not in ('codex','opencode'):raise ClientError('integration-agent-invalid')
    if os.getuid() not in (0,user.pw_uid):raise ClientError('integration-user-required')
    directory=private_dir(STATE/'integration-status');marker=directory/(agent+'-'+str(user.pw_uid)+'.json')
    fd=os.open(marker.with_suffix('.lock'),os.O_RDWR|os.O_CREAT|os.O_NOFOLLOW,0o600)
    try:
        fcntl.flock(fd,fcntl.LOCK_EX)
        stamp=payload_digest(package_root);saved=read_json(marker,{})
        target=Path(user.pw_dir)/('.codex/config.toml' if agent=='codex' else '.config/opencode/opencode.json')
        try:actual=integration_files(user,agent,package_root)
        except (FileNotFoundError,ClientError):actual={}
        if saved.get('payload_digest')==stamp and saved.get('files')==actual and actual:
            return {**saved['result'],'unchanged':True}
        result=_integrate(agent,username,workspace,package_root)
        actual=integration_files(user,agent,package_root)
        atomic_json(marker,{'payload_digest':stamp,'files':actual,'result':result})
        return {**result,'unchanged':False}
    finally:os.close(fd)


def user_environment(user):
    # L'installation root ne transmet pas ses tokens ou secrets aux CLI des comptes.
    env={key:os.environ[key] for key in ('PATH','LANG','LC_ALL','TERM') if key in os.environ}
    env.update(HOME=user.pw_dir,USER=user.pw_name,LOGNAME=user.pw_name,CODEX_HOME=str(Path(user.pw_dir)/'.codex'))
    return env


def _integrate(agent,username,workspace=None,package_root=Path('/usr/lib/cab')):
    user=pwd.getpwnam(username)
    if os.getuid() not in (0,user.pw_uid):raise ClientError('integration-user-required')
    home=Path(user.pw_dir)
    if home.resolve()!=home:raise ClientError('integration-home-unsafe')
    target=home/('.codex/config.toml' if agent=='codex' else '.config/opencode/opencode.json')
    if target.exists() and (target.resolve()!=target or not target.is_file() or target.stat().st_nlink!=1):raise ClientError('integration-target-unsafe')
    backup=None;original=read_user_file(target,user.pw_uid) if target.exists() else None
    if target.exists():
        directory=private_dir(STATE/'integration-backups')
        backup=directory/(agent+'-'+str(user.pw_uid)+'-'+str(time.time_ns())+'.backup')
        fd=os.open(backup,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        with os.fdopen(fd,'wb') as stream:stream.write(original)
    env=user_environment(user)
    options={'user':user.pw_uid,'group':user.pw_gid,'extra_groups':os.getgrouplist(user.pw_name,user.pw_gid)} if os.getuid()==0 else {}
    catalog_refresh='protocol-notification'
    if agent=='codex':
        configured=config().get('codex_binary') if os.getuid()==0 else None
        if configured and (not Path(configured).is_absolute() or not Path(configured).is_file() or not os.access(configured,os.X_OK)):raise ClientError('codex-cli-unavailable')
        executable=configured or shutil.which('codex',path=os.pathsep.join([os.environ.get('PATH',''),'/usr/local/bin',str(home/'.local/bin')]))
        if not executable:raise ClientError('codex-cli-unavailable')
        directory=subprocess.run(['/usr/bin/mkdir','-p',str(home/'.codex')],env=env,capture_output=True,timeout=30,**options)
        if directory.returncode:raise ClientError('codex-home-unavailable')
        old=tomllib.loads(original.decode()) if original else {}
        for name,server in old.get('mcp_servers',{}).items():
            literals=[server.get('command',''),*server.get('args',[])]
            if any(str(value).endswith(('/cgpt-approval-bridge-broker.mjs','/cgpt_approval_bridge_server.py')) for value in literals):
                removed=subprocess.run([executable,'mcp','remove',name],env=env,capture_output=True,text=True,timeout=30,**options)
                if removed.returncode:raise ClientError('codex-legacy-mcp-removal-failed')
        result=subprocess.run([executable,'mcp','add','cab','--','/usr/bin/cab','mcp','--agent','codex'],env=env,cwd=workspace or user.pw_dir,capture_output=True,text=True,timeout=30,**options)
        if result.returncode:raise ClientError('codex-mcp-registration-failed')
        text=read_user_file(target,user.pw_uid).decode()
        match=re.search(r'(?m)^\[mcp_servers\.cab\]\s*$',text)
        if not match:raise ClientError('codex-cab-table-missing')
        following=re.search(r'(?m)^\[',text[match.end():]);end=match.end()+following.start() if following else len(text)
        section=text[match.end():end];section=re.sub(r'(?m)^tool_timeout_sec\s*=.*\n?','',section)
        text=text[:match.end()]+'\ntool_timeout_sec = 86430\n'+section+text[end:]
        if tomllib.loads(text)['mcp_servers']['cab']['tool_timeout_sec']!=86430:raise ClientError('codex-tool-timeout-invalid')
        write_user_file(target,text.encode(),env,options)
        previous=old.get('features',{}).get('mcp_tool_list_changed')
        if previous is False:catalog_refresh='explicitly-disabled'
        elif previous is True:catalog_refresh='enabled'
        else:
            features=subprocess.run([executable,'features','list'],env=env,capture_output=True,text=True,timeout=30,**options)
            supported=features.returncode==0 and any(line.split() and line.split()[0]=='mcp_tool_list_changed' for line in features.stdout.splitlines())
            if supported:
                enabled=subprocess.run([executable,'features','enable','mcp_tool_list_changed'],env=env,capture_output=True,timeout=30,**options)
                if enabled.returncode or tomllib.loads(read_user_file(target,user.pw_uid).decode()).get('features',{}).get('mcp_tool_list_changed') is not True:raise ClientError('codex-catalog-refresh-enable-failed')
                catalog_refresh='enabled'
            else:catalog_refresh='client-capability-unavailable'
        # Le catalogue local du paquet remplace seulement la provenance CAB.
        listing=subprocess.run([executable,'plugin','marketplace','list','--json'],env=env,capture_output=True,text=True,timeout=30,**options)
        if listing.returncode:raise ClientError('codex-marketplace-inventory-failed')
        configured=json.loads(listing.stdout).get('marketplaces',[])
        if any(item.get('name')=='cab_codex_plugins' and item.get('root')!=str(package_root) for item in configured):
            removed=subprocess.run([executable,'plugin','marketplace','remove','cab_codex_plugins','--json'],env=env,capture_output=True,text=True,timeout=30,**options)
            if removed.returncode:raise ClientError('codex-old-cab-marketplace-removal-failed')
        added=subprocess.run([executable,'plugin','marketplace','add',str(package_root),'--json'],env=env,capture_output=True,text=True,timeout=30,**options)
        if added.returncode:raise ClientError('codex-cab-marketplace-registration-failed')
        for plugin in ['CAB','CCAB','CABU']:
            installed=subprocess.run([executable,'plugin','add',plugin+'@cab_codex_plugins','--json'],env=env,capture_output=True,text=True,timeout=30,**options)
            if installed.returncode:raise ClientError('codex-cab-plugin-installation-failed')
        commands=home/'.codex/commands';commands.mkdir(parents=True,exist_ok=True)
        if commands.resolve()!=commands:raise ClientError('codex-command-directory-unsafe')
        for name in ['CAB.md','CCAB.md','CABU.md']:
            source=package_root/'commands'/name;destination=commands/name
            if destination.exists():
                if destination.resolve()!=destination or not destination.is_file():raise ClientError('codex-command-target-unsafe')
                directory=private_dir(STATE/'integration-backups');copy=directory/(name+'-'+str(user.pw_uid)+'-'+str(time.time_ns()))
                copy.write_bytes(read_user_file(destination,user.pw_uid));copy.chmod(0o600)
            write_user_file(destination,source.read_bytes(),env,options)
        os.chown(commands,user.pw_uid,user.pw_gid)
    else:
        current=json.loads(original) if original else {}
        for name,server in list(current.get('mcp',{}).items()):
            if isinstance(server,dict) and any(str(value).endswith(('/cgpt-approval-bridge-broker.mjs','/cgpt_approval_bridge_server.py')) for value in server.get('command',[])):del current['mcp'][name]
        current.setdefault('mcp',{})['cab']={'type':'local','command':['/usr/bin/cab','mcp','--agent','opencode'],'enabled':True}
        write_user_file(target,(json.dumps(current,indent=2)+'\n').encode(),env,options)
    return {'agent':agent,'uid':user.pw_uid,'configuration':str(target),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'backup':str(backup) if backup else None,'runtime':'/usr/bin/cab','credentials_exposed':False,'catalog_refresh':catalog_refresh}
