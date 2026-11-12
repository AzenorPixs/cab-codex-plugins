"""Édition bornée du fichier CAB : révision, secrets conservés et sauvegarde privée."""
import fcntl
import hashlib
import json
import os
import re
import time
from urllib.parse import urlsplit
from .paths import CONFIG,STATE,atomic_json,config,private_dir,runtime_config
from .logging import LEVELS
from .core.commands import Refused,require

MASK='__SECRET_CONSERVE__'
PROJECT_SETTINGS={'projects_root','projects_user','projects_group'}
RELEASE_SETTINGS={'opencode_release_repository','codex_release_repository'}
AGENT_SETTINGS={'opencode_binary','codex_binary','opencode_mcp_config','codex_mcp_config'}
EDITABLE={'logging','database','database_host','database_port','database_user','database_password','migrator_user','migrator_password','electric_user','electric_password','electric_secret','electric_port','web_allowed_hosts','web_csrf_trusted_origins','web_public_urls'}|PROJECT_SETTINGS|AGENT_SETTINGS|RELEASE_SETTINGS
SENSITIVE=re.compile('password|secret|token|credential|api[_-]?key',re.I)

def revision(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()

def masked(value):
    if isinstance(value,dict):return {key:MASK if SENSITIVE.search(key) else masked(item) for key,item in value.items()}
    if isinstance(value,list):return [masked(item) for item in value]
    return value

def view():
    saved=config();active=runtime_config()
    pending=sorted(key for key in EDITABLE-{'logging'}-PROJECT_SETTINGS-AGENT_SETTINGS-RELEASE_SETTINGS if saved.get(key)!=active.get(key))
    return {'path':str(CONFIG),'revision':revision(saved),'configuration':masked({key:value for key,value in saved.items() if key in EDITABLE}),'read_only':masked({key:value for key,value in saved.items() if key not in EDITABLE}),'restart_required':bool(pending),'pending_fields':pending,'secret_placeholder':MASK,'logging_levels':sorted(LEVELS)}

def save(expected,changes):
    require(isinstance(changes,dict) and set(changes)<=EDITABLE,'configuration-fields-invalid',400)
    private_dir(STATE);fd=os.open(STATE/'configuration.lock',os.O_RDWR|os.O_CREAT|os.O_NOFOLLOW,0o600)
    try:
        fcntl.flock(fd,fcntl.LOCK_EX)
        current=config();require(expected==revision(current),'configuration-revision-stale')
        candidate={**current}
        for key,value in changes.items():
            if SENSITIVE.search(key) and value==MASK:
                require(key in current,'configuration-secret-missing',400);continue
            if key in ('web_allowed_hosts','web_csrf_trusted_origins','web_public_urls'):
                require(isinstance(value,list) and len(value)<=64 and all(isinstance(item,str) and 1<=len(item)<=512 for item in value),'configuration-web-trust-invalid',400)
                for item in value:
                    if key=='web_allowed_hosts':
                        require(bool(re.fullmatch(r'[A-Za-z0-9.-]+|\[[0-9A-Fa-f:]+\]',item)),'configuration-web-trust-invalid',400)
                    else:
                        parsed=urlsplit(item)
                        require(parsed.scheme in ('http','https') and parsed.hostname and not any(c in item for c in ('*','\n','\r',' ')) and parsed.username is None and parsed.password is None and parsed.path=='' and not parsed.query and not parsed.fragment,'configuration-web-trust-invalid',400)
                        try:parsed.port
                        except ValueError:raise Refused('configuration-web-trust-invalid',400) from None
            elif key=='logging':
                require(isinstance(value,dict) and set(value)=={'level'} and isinstance(value['level'],str) and value['level'] in LEVELS,'configuration-log-level-invalid',400)
            elif key.endswith('_port'):
                require(type(value) is int and 1024<=value<=65535,'configuration-port-invalid',400)
            else:
                require(isinstance(value,str) and len(value)<=4096 and not any(c in value for c in ('\0','\n','\r')),'configuration-value-invalid',400)
            if key in RELEASE_SETTINGS:
                from .agent_releases import repository
                try:repository({key:value},key.split('_',1)[0])
                except ValueError:raise Refused('configuration-release-repository-invalid',400) from None
            if key in AGENT_SETTINGS:
                require(value=='' or os.path.isabs(value),'configuration-agent-path-invalid',400)
            candidate[key]=value
        if PROJECT_SETTINGS & set(changes):
            from .projects import project_settings
            project_settings(candidate)
        changed=sorted(key for key in EDITABLE if candidate.get(key)!=current.get(key))
        if changed:
            backup=private_dir(STATE/'configuration-backups')/(str(time.time_ns())+'.json');atomic_json(backup,current)
            atomic_json(CONFIG,candidate)
        return {**view(),'changed_fields':changed,'logging_reload': 'logging' in changed}
    finally:os.close(fd)
