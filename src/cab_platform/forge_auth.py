"""Vérification bornée des identités de forge ; aucun secret dans la projection."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import threading
from urllib.parse import quote,urlsplit
import httpx
from django.db import close_old_connections,transaction
from .core.models import Project,ProjectMetadataProjection
from .core.commands import Refused
from .forge_settings import crypt
from .project_metadata import FORGES

_pool=ThreadPoolExecutor(max_workers=3,thread_name_prefix='cab-forge-auth')
_lock=threading.Lock()
_running=set()
_pending=set()


def inputs(project,values,forge):
    url=values.get('REMOTE_'+forge+'_BASE_URL','')
    owner=values.get('REMOTE_'+forge+'_OWNER','')
    encrypted=(project.configuration or {}).get('forge_tokens_tpm',{}).get(forge,'')
    repository=values.get('REMOTE_'+forge+'_REPOSITORY','')
    signature=hashlib.sha256(json.dumps([url,owner,repository,encrypted],ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
    return url,owner,encrypted,signature


def repository_access(client,base,owner,repository,headers):
    if not repository or any('/' in value or value in ('.','..') for value in (owner,repository)):return None
    endpoint=base+'/api/v1/repos/'+quote(owner,safe='')+'/'+quote(repository,safe='')
    with client.stream('GET',endpoint,headers=headers) as response:
        if response.status_code==401:return False
        if response.status_code!=200:return None
        data=b''
        for chunk in response.iter_bytes():
            data+=chunk
            if len(data)>262144:return None
    authorized=json.loads(data)
    with client.stream('GET',endpoint,headers={'Accept':'application/json','User-Agent':'CAB-forge-auth'}) as response:
        if response.status_code in (401,403,404):return True
        if response.status_code!=200:return None
        data=b''
        for chunk in response.iter_bytes():
            data+=chunk
            if len(data)>262144:return None
    anonymous=json.loads(data)
    granted=authorized.get('permissions',{}) if isinstance(authorized,dict) else {}
    public=anonymous.get('permissions',{}) if isinstance(anonymous,dict) else {}
    if not isinstance(granted,dict) or not isinstance(public,dict):return None
    return True if any(granted.get(key) is True and public.get(key) is not True for key in ('admin','push','pull')) else None



def git_repository_access(client,base,owner,repository,token):
    owner_parts=owner.split('/')
    if not repository or '/' in repository or repository in ('.','..') or any(not part or part in ('.','..') for part in owner_parts):return None
    name=repository if repository.endswith('.git') else repository+'.git'
    endpoint=base+'/'+'/'.join(quote(part,safe='') for part in owner_parts)+'/'+quote(name,safe='')+'/info/refs?service=git-upload-pack'
    headers={'Accept':'application/x-git-upload-pack-advertisement','User-Agent':'CAB-forge-auth'}
    with client.stream('GET',endpoint,headers=headers,auth=(owner,token)) as response:
        if response.status_code==401:return False
        if response.status_code!=200:return None
        if not response.headers.get('content-type','').lower().startswith('application/x-git-upload-pack-advertisement'):return None
    with client.stream('GET',endpoint,headers=headers) as response:
        if response.status_code in (401,403,404):return True
        return None

def observe(project,forge,url,owner,encrypted,repository=''):
    if not url or not owner or not encrypted:return None
    try:
        parts=urlsplit(url)
        if parts.scheme!='https' or not parts.hostname or parts.username or parts.password or parts.query or parts.fragment:return None
        base=url.rstrip('/')
        if forge=='GITHUB':endpoint='https://api.github.com/user' if parts.hostname.lower()=='github.com' and parts.port in (None,443) and parts.path in ('','/') else base+'/api/v3/user'
        elif forge=='GITLAB':endpoint=base+'/api/v4/user'
        else:endpoint=base+'/api/v1/user'
        token=crypt(project,forge,encrypted.encode(),True).decode('utf-8')
        if not token or any(c in token for c in '\r\n\0'):return None
        headers={'Accept':'application/json','User-Agent':'CAB-forge-auth'}
        if forge=='GITLAB':headers['PRIVATE-TOKEN']=token
        else:headers['Authorization']=('token ' if forge=='FORGEJO' else 'Bearer ')+token
        with httpx.Client(timeout=6,follow_redirects=False,trust_env=False) as client:
            with client.stream('GET',endpoint,headers=headers) as response:
                if response.status_code==403 and forge=='FORGEJO':return repository_access(client,base,owner,repository,headers)
                if response.status_code in (401,403) and forge in ('GITHUB','GITLAB'):return git_repository_access(client,base,owner,repository,token)
                if response.status_code==401:return False
                if response.status_code!=200:return None
                data=b''
                for chunk in response.iter_bytes():
                    data+=chunk
                    if len(data)>262144:return None
            document=json.loads(data)
            name=document.get('username' if forge=='GITLAB' else 'login') if isinstance(document,dict) else None
            if not isinstance(name,str) or not name:return None
            if name.casefold()==owner.casefold():return True
            if forge in ('GITHUB','GITLAB'):return git_repository_access(client,base,owner,repository,token)
            return False
    except (httpx.HTTPError,Refused,ValueError,UnicodeError,KeyError,TypeError,OSError):return None


def refresh_one(project_id,forge):
    try:
        project=Project.objects.get(pk=project_id)
        url,owner,encrypted,signature=inputs(project,(project.public_metadata or {}).get('values',{}),forge)
        repository=(project.public_metadata or {}).get('values',{}).get('REMOTE_'+forge+'_REPOSITORY','')
        state=observe(project,forge,url,owner,encrypted,repository)
        with transaction.atomic():
            project=Project.objects.select_for_update().get(pk=project_id)
            snapshot=dict(project.public_metadata or {})
            if inputs(project,snapshot.get('values',{}),forge)[3]!=signature:return
            config=dict(project.configuration or {});auth=dict(config.get('forge_auth') or {})
            old=auth.get(forge,{})
            if old.get('signature')==signature and old.get('state') is state:return
            auth[forge]={'signature':signature,'state':state};config['forge_auth']=auth
            project.configuration=config
            states=dict(snapshot.get('forge_auth') or {});states[forge]=state;snapshot['forge_auth']=states;snapshot['revision']=int(snapshot.get('revision',0))+1
            project.public_metadata=snapshot;project.save(update_fields=['configuration','public_metadata'])
            ProjectMetadataProjection.objects.update_or_create(pk=project.pk,defaults={'public_metadata':snapshot})
    finally:
        close_old_connections()
        key=(project_id,forge)
        with _lock:
            if key in _pending:
                _pending.discard(key)
                try:_pool.submit(refresh_one,project_id,forge)
                except RuntimeError:_running.discard(key)
            else:_running.discard(key)


def enqueue(project_id,forges=FORGES,*,changed=False):
    project=Project.objects.filter(pk=project_id).only('configuration','public_metadata').first()
    if project is None:return
    values=(project.public_metadata or {}).get('values',{})
    for forge in forges:
        if forge not in FORGES:continue
        url,owner,token,_=inputs(project,values,forge)
        if not url or not owner.strip() or not token:continue
        key=(project_id,forge)
        with _lock:
            if key in _running:
                if changed:_pending.add(key)
                continue
            _running.add(key)
            try:_pool.submit(refresh_one,project_id,forge)
            except RuntimeError:_running.discard(key)
