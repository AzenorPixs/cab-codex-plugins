"""Cache GitHub quotidien ; ordonnanceur du service, jamais de fetch depuis la page."""
from datetime import datetime,timezone
import fcntl
import json
import os
from pathlib import Path
import re
import secrets
import time
from urllib.error import URLError
from urllib.request import Request,urlopen
from .paths import STATE,config,private_dir,read_json,atomic_json
from . import __version__

REPOSITORIES={'opencode':'anomalyco/opencode','codex':'openai/codex'}

def repository(cfg,agent):
    value=cfg.get(agent+'_release_repository',REPOSITORIES[agent])
    if not isinstance(value,str) or not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+',value) or any(part in ('.','..') for part in value.split('/')):raise ValueError('agent-release-repository-invalid')
    return value

def cached():return read_json(STATE/'agent-releases.json',{})

def fetch(repo):
    request=Request('https://api.github.com/repos/'+repo+'/releases/latest',headers={'Accept':'application/vnd.github+json','User-Agent':'CAB/'+__version__})
    with urlopen(request,timeout=4) as response:raw=response.read(1024*1024+1)
    if len(raw)>1024*1024:raise ValueError('agent-release-response-too-large')
    data=json.loads(raw)
    if not isinstance(data,dict) or not isinstance(data.get('tag_name'),str) or not isinstance(data.get('html_url'),str):raise ValueError('agent-release-response-invalid')
    match=re.fullmatch(r'(?:rust-v|v)?(\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?)',data.get('tag_name',''))
    if not match or data.get('draft') or data.get('prerelease'):raise ValueError('agent-release-tag-invalid')
    url=data.get('html_url','')
    if not url.lower().startswith(('https://github.com/'+repo+'/releases/tag/').lower()):raise ValueError('agent-release-url-invalid')
    return {'version':match.group(1),'url':url}

def refresh(now=None):
    cfg=config()
    if not cfg.get('initialized'):return
    now=time.time() if now is None else now;day=int(now//86400)
    private_dir(STATE);fd=os.open(STATE/'agent-releases.lock',os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW,0o600)
    try:
        try:fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:return
        values=cached();before=json.dumps(values,sort_keys=True)
        for agent in REPOSITORIES:
            repo=repository(cfg,agent);record=values.get(agent,{})
            if record.get('repository')!=repo:record={'repository':repo,'next_check':now+secrets.randbelow(61),'status':'pending'}
            if now>=record['next_check'] and record.get('checked_day')!=day:
                try:record.update(fetch(repo),status='ok')
                except (URLError,OSError,ValueError,TimeoutError) as error:record.update(status='unavailable',error=type(error).__name__)
                record.update(checked_at=now,checked_day=day,next_check=(day+1)*86400+secrets.randbelow(86400))
            elif record.get('checked_day')==day and now>=record['next_check']:
                record['next_check']=(day+1)*86400+secrets.randbelow(86400)
            values[agent]=record
        if json.dumps(values,sort_keys=True)!=before:atomic_json(STATE/'agent-releases.json',values)
    finally:os.close(fd)
