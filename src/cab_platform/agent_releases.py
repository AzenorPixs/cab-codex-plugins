"""Cache GitHub quotidien ; ordonnanceur du service, jamais de fetch depuis la page."""
from datetime import datetime,timezone
import fcntl
import json
import os
from pathlib import Path
import re
import secrets
import time
import gzip
import io
import subprocess
from urllib.error import URLError
from urllib.request import Request,urlopen
from .paths import STATE,config,private_dir,read_json,atomic_json
from . import __version__

REPOSITORIES={'opencode':'anomalyco/opencode','codex':'openai/codex'}
CHATGPT_REPOSITORY='https://persistent.oaistatic.com/codex-app-prod/linux/deb'

def chatgpt_installed():
    result=subprocess.run(['/usr/bin/dpkg-query','-W','-f=${db:Status-Status}|${Version}','chatgpt'],capture_output=True,text=True,timeout=4)
    state,sep,version=result.stdout.strip().partition('|')
    return version if result.returncode==0 and state=='installed' and sep else None

def fetch_chatgpt(base=CHATGPT_REPOSITORY):
    from urllib.parse import urlsplit
    parsed=urlsplit(base)
    if parsed.scheme!='https' or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:raise ValueError('agent-release-url-invalid')
    request=Request(base.rstrip('/')+'/dists/stable/main/binary-amd64/Packages.gz',headers={'User-Agent':'CAB/'+__version__})
    with urlopen(request,timeout=4) as response:raw=response.read(8*1024*1024+1)
    if len(raw)>8*1024*1024:raise ValueError('agent-release-response-too-large')
    with gzip.GzipFile(fileobj=io.BytesIO(raw)) as stream:raw=stream.read(16*1024*1024+1)
    if len(raw)>16*1024*1024:raise ValueError('agent-release-response-too-large')
    candidates=[]
    for paragraph in raw.decode().split('\n\n'):
        fields={line.split(':',1)[0]:line.split(':',1)[1].strip() for line in paragraph.splitlines() if ':' in line and not line.startswith((' ','\t'))}
        value=fields.get('Version','')
        if fields.get('Package')=='chatgpt' and fields.get('Architecture') in ('amd64','all') and re.fullmatch(r'[0-9][A-Za-z0-9.+:~_-]{0,159}',value):candidates.append(value)
    if not candidates:raise ValueError('chatgpt-version-unavailable')
    latest=candidates[0]
    for value in candidates[1:]:
        if subprocess.run(['/usr/bin/dpkg','--compare-versions',value,'gt',latest],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=3).returncode==0:latest=value
    return {'version':latest,'url':base,'provider_label':'APT ChatGPT'}

def repository(cfg,agent):
    value=cfg.get(agent+'_release_repository',REPOSITORIES[agent])
    if not isinstance(value,str) or not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+',value) or any(part in ('.','..') for part in value.split('/')):raise ValueError('agent-release-repository-invalid')
    return value

def cached():return read_json(STATE/'agent-releases.json',{})

def fetch(repo,major=None):
    endpoint='/releases?per_page=100' if major is not None else '/releases/latest'
    request=Request('https://api.github.com/repos/'+repo+endpoint,headers={'Accept':'application/vnd.github+json','User-Agent':'CAB/'+__version__})
    with urlopen(request,timeout=4) as response:raw=response.read(16*1024*1024+1)
    if len(raw)>16*1024*1024:raise ValueError('agent-release-response-too-large')
    data=json.loads(raw);items=data if isinstance(data,list) else [data];candidates=[]
    for item in items:
        if not isinstance(item,dict) or not isinstance(item.get('tag_name'),str) or not isinstance(item.get('html_url'),str):continue
        match=re.fullmatch(r'(?:rust-v|v)?(\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?)',item['tag_name'])
        if not match or item.get('draft') or item.get('prerelease'):continue
        version=match.group(1);numbers=tuple(map(int,version.split('-',1)[0].split('+',1)[0].split('.')))
        if major is not None and numbers[0]!=major:continue
        url=item['html_url']
        if not url.lower().startswith(('https://github.com/'+repo+'/releases/tag/').lower()):continue
        candidates.append((numbers,{'version':version,'url':url,'provider_label':'GitHub'}))
    if not candidates:raise ValueError('agent-release-tag-invalid')
    return max(candidates,key=lambda pair:pair[0])[1]


def refresh(now=None):
    cfg=config()
    if not cfg.get('initialized'):return
    now=time.time() if now is None else now;day=int(now//86400)
    private_dir(STATE);fd=os.open(STATE/'agent-releases.lock',os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW,0o600)
    try:
        try:fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:return
        values=cached();before=json.dumps(values,sort_keys=True)
        for agent in [*REPOSITORIES,'codex_desktop']:
            repo=cfg.get('codex_desktop_release_url',CHATGPT_REPOSITORY) if agent=='codex_desktop' else repository(cfg,agent)
            record=values.get(agent,{});major=2 if agent=='opencode' else None
            if record.get('repository')!=repo or record.get('major')!=major or record.get('provider_revision')!=2:record={'provider_revision':2,'major':major,'repository':repo,'next_check':now+secrets.randbelow(61),'status':'pending'}
            if now>=record['next_check'] and record.get('checked_day')!=day:
                try:record.update(fetch_chatgpt(repo) if agent=='codex_desktop' else fetch(repo,major=major),status='ok')
                except (URLError,OSError,ValueError,TimeoutError) as error:record.update(status='unavailable',error=type(error).__name__)
                record.update(checked_at=now,checked_day=day,next_check=(day+1)*86400+secrets.randbelow(86400))
            elif record.get('checked_day')==day and now>=record['next_check']:
                record['next_check']=(day+1)*86400+secrets.randbelow(86400)
            values[agent]=record
        if json.dumps(values,sort_keys=True)!=before:atomic_json(STATE/'agent-releases.json',values)
    finally:os.close(fd)
