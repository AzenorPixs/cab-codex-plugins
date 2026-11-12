"""Inventaire administratif borné : versions sous UID propriétaire, MCP sans secrets.

Un MCP déclaré n'est pas présenté comme connecté : son état runtime appartient
à la session native. Aucun serveur MCP ni session n'est lancé par cette lecture.
"""
import json
import os
from pathlib import Path
import pwd
import re
import shutil
import stat
import subprocess
import tempfile
import tomllib
from .paths import config


def accounts(configuration):
    uids={os.getuid()}
    for profile in configuration.get('integrations',[]):
        if isinstance(profile,dict) and type(profile.get('uid')) is int:uids.add(profile['uid'])
    if configuration.get('projects_user'):
        try:uids.add(pwd.getpwnam(configuration['projects_user']).pw_uid)
        except KeyError:pass
    result=[]
    for uid in sorted(uids):
        try:result.append(pwd.getpwuid(uid))
        except KeyError:pass
    return result


def version(path,user):
    """Ne jamais exécuter un binaire utilisateur avec les privilèges du service."""
    options={'user':user.pw_uid,'group':user.pw_gid,'extra_groups':os.getgrouplist(user.pw_name,user.pw_gid)} if os.getuid()==0 else {}
    if os.getuid() not in (0,user.pw_uid):return None
    try:
        # Fichier temporaire pour borner aussi la mémoire consommée par stdout.
        with tempfile.TemporaryFile() as output:
            completed=subprocess.run([str(path),'--version'],stdin=subprocess.DEVNULL,stdout=output,stderr=output,timeout=4,cwd=user.pw_dir,env={'HOME':user.pw_dir,'USER':user.pw_name,'LOGNAME':user.pw_name,'PATH':os.defpath},**options)
            if completed.returncode:return None
            output.seek(0);text=output.read(512).decode('utf-8',errors='replace')
        found=re.search(r'\b[vV]?(\d+\.\d+(?:\.\d+)?(?:[-+][A-Za-z0-9.-]+)?)',text)
        return found.group(1) if found else None
    except (OSError,subprocess.TimeoutExpired):return None


def mcp_configuration(path,user,agent):
    result={'path':str(path),'account':user.pw_name,'state':'absent','servers':[]}
    try:
        fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
        with os.fdopen(fd,'rb') as stream:
            info=os.fstat(stream.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_uid!=user.pw_uid or info.st_nlink!=1 or info.st_size>4*1024*1024:
                return {**result,'state':'unsafe'}
            raw=stream.read(4*1024*1024+1)
        value=tomllib.loads(raw.decode()) if agent=='codex' else json.loads(raw)
        if not isinstance(value,dict):return {**result,'state':'invalid'}
        servers=value.get('mcp_servers' if agent=='codex' else 'mcp',{})
        if not isinstance(servers,dict):return {**result,'state':'invalid'}
        # Seuls noms et état de déclaration sortent du processus : ni commandes,
        # arguments, environnement, URLs, headers ou credentials des MCP.
        result['servers']=[{'name':str(name)[:160],'state':'disabled' if isinstance(server,dict) and server.get('enabled') is False else 'declared','runtime':'unverified'} for name,server in servers.items()][:128]
        result['state']='configured' if servers else 'empty'
    except FileNotFoundError:pass
    except (ValueError,UnicodeError):result['state']='invalid'
    except OSError:result['state']='unreadable'
    return result


def inventory():
    configuration=config();users=accounts(configuration);result=[]
    from .agent_runtime import processes,observation
    from .agent_releases import cached
    rows=processes({user.pw_uid for user in users});releases=cached()
    for agent,label,relative in [('opencode','OpenCode','.opencode/bin/opencode'),('codex','Codex CLI','.local/bin/codex')]:
        configured=configuration.get(agent+'_binary','')
        candidates=[Path(configured)] if configured else [Path(found) for found in [shutil.which(agent)] if found]+[Path(user.pw_dir)/relative for user in users]
        path=next((p for p in candidates if p.is_file() and os.access(p,os.X_OK)),candidates[0] if candidates else None)
        executable=bool(path and path.is_file() and os.access(path,os.X_OK))
        user=next((u for u in users if path and path.is_relative_to(u.pw_dir) and u.pw_uid!=0),None)
        if user is None and path:
            try:user=pwd.getpwuid(path.stat().st_uid)
            except (KeyError,OSError):pass
        state='available' if executable else 'not_executable' if path and path.is_file() else 'not_file' if path and path.exists() else 'missing'
        profiles=[];override=configuration.get(agent+'_mcp_config','')
        for account in users:
            paths=[Path(override)] if override else ([Path(account.pw_dir)/'.codex/config.toml'] if agent=='codex' else [Path(account.pw_dir)/'.config/opencode/opencode.json',Path(account.pw_dir)/'.config/opencode/opencode.jsonc'])
            for item in paths:
                # L'override n'est lu que sous l'identité du propriétaire.
                if override:
                    try:
                        if item.stat().st_uid!=account.pw_uid:continue
                    except FileNotFoundError:
                        if account!=users[0]:continue
                    except OSError:continue
                profile=mcp_configuration(item,account,agent)
                if item.suffix=='.jsonc' and profile['state']=='invalid':profile['state']='jsonc_unverified'
                profiles.append(profile)
            if override and profiles:break
        runtime=observation(rows,agent)
        release=releases.get(agent,{})
        result.append({'runtime':runtime,'release':release,'connector_path':'/usr/bin/cab','agent':agent,'label':label,'path':str(path) if path else '', 'resolved_path':str(path.resolve()) if path and path.exists() else '', 'state':state,'version':version(path,user) if executable and user else None,'mcp_configurations':profiles})
    return {'agents':result,'runtime_notice':'Activité et transport MCP observés sur la machine ; les versions GitHub proviennent du cache quotidien.'}
