"""Vérification bornée des identités de forge ; aucun secret dans la projection."""
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
import errno
import hashlib
import json
import socket
import ssl
import threading
from urllib.parse import quote,urlsplit
import httpx
from django.db import close_old_connections,transaction
from .core.models import Project,ProjectMetadataProjection
from .core.commands import Refused
from .forge_settings import crypt, forge_client
from .project_metadata import FORGES

_pool=ThreadPoolExecutor(max_workers=3,thread_name_prefix='cab-forge-auth')
_lock=threading.Lock()
_running=set()
_pending=set()


def transport_failure(error, phase):
    cause = error
    while cause is not None:
        if isinstance(cause, socket.gaierror):
            return 'DNS — résolution du nom impossible'
        if isinstance(cause, ssl.SSLCertVerificationError):
            return 'TLS — vérification du certificat échouée'
        if isinstance(cause, ssl.SSLError):
            return 'TLS — négociation échouée'
        if isinstance(cause, ConnectionRefusedError):
            return f'{phase} — connexion refusée'
        if isinstance(cause, OSError) and cause.errno in (errno.ENETUNREACH, errno.EHOSTUNREACH):
            return f'{phase} — réseau ou hôte inaccessible'
        cause = cause.__cause__ or cause.__context__
    if isinstance(error, httpx.TimeoutException):
        return f'{phase} — délai d’attente dépassé'
    return f'{phase} — {type(error).__name__}'


@contextmanager
def forge_request(client, endpoint, headers, report, operation, *, method='GET', **kwargs):
    if report is None:
        with client.stream(method, endpoint, headers=headers, **kwargs) as response:
            yield response
        return

    phase = 'HTTP'

    def trace(event, _details):
        nonlocal phase
        event = event.partition('.')[2]
        if event == 'connect_tcp.started':
            phase = 'TCP'
            report('Résolution du nom et ouverture de la connexion TCP.\n')
        elif event == 'connect_tcp.complete':
            report('Connexion TCP établie.\n')
        elif event == 'start_tls.started':
            phase = 'TLS'
            report('Négociation TLS.\n')
        elif event == 'start_tls.complete':
            phase = 'HTTP'
            report('Connexion TLS établie.\n')
        elif event == 'receive_response_headers.started':
            report('Attente de la réponse HTTP.\n')

    report(f'{operation}.\n')
    try:
        with client.stream(method, endpoint, headers=headers, extensions={'trace': trace}, **kwargs) as response:
            yield response
    except httpx.RequestError as error:
        report(f'Vérification impossible — {transport_failure(error, phase)}.\n')
        raise


def inputs(project,values,forge):
    url=values.get('REMOTE_'+forge+'_BASE_URL','')
    owner=values.get('REMOTE_'+forge+'_OWNER','')
    encrypted=(project.configuration or {}).get('forge_tokens_tpm',{}).get(forge,'')
    repository=values.get('REMOTE_'+forge+'_REPOSITORY','')
    parameters = [url, owner, repository, encrypted, False]
    signature=hashlib.sha256(json.dumps(parameters,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
    return url,owner,encrypted,signature


def repository_access(client,base,owner,repository,headers,report=None):
    if report:report('Vérification des droits sur le dépôt Forgejo.\n')
    if not repository or any('/' in value or value in ('.','..') for value in (owner,repository)):return None
    endpoint=base+'/api/v1/repos/'+quote(owner,safe='')+'/'+quote(repository,safe='')
    with forge_request(client, endpoint, headers, report, 'Requête au dépôt avec token') as response:
        if report:report(f'Accès au dépôt avec token : HTTP {response.status_code}.\n')
        if response.status_code==401:return False
        if response.status_code!=200:return None
        data=b''
        for chunk in response.iter_bytes():
            data+=chunk
            if len(data)>262144:return None
    authorized=json.loads(data)
    anonymous_headers = {'Accept':'application/json','User-Agent':'CAB-forge-auth'}
    with forge_request(client, endpoint, anonymous_headers, report, 'Requête au dépôt sans token') as response:
        if report:report(f'Accès au dépôt sans token : HTTP {response.status_code}.\n')
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



def git_repository_access(client,base,owner,repository,token,report=None):
    if report:report('Vérification de l’accès Git au dépôt.\n')
    owner_parts=owner.split('/')
    if not repository or '/' in repository or repository in ('.','..') or any(not part or part in ('.','..') for part in owner_parts):return None
    name=repository if repository.endswith('.git') else repository+'.git'
    endpoint=base+'/'+'/'.join(quote(part,safe='') for part in owner_parts)+'/'+quote(name,safe='')+'/info/refs?service=git-upload-pack'
    headers={'Accept':'application/x-git-upload-pack-advertisement','User-Agent':'CAB-forge-auth'}
    with forge_request(client, endpoint, headers, report, 'Requête Git au dépôt avec identifiants', auth=(owner, token)) as response:
        if report:report(f'Accès Git avec identifiants : HTTP {response.status_code}.\n')
        if response.status_code==401:return False
        if response.status_code!=200:return None
        if not response.headers.get('content-type','').lower().startswith('application/x-git-upload-pack-advertisement'):return None
    with forge_request(client, endpoint, headers, report, 'Requête Git au dépôt sans identifiants') as response:
        if report:report(f'Accès Git sans identifiants : HTTP {response.status_code}.\n')
        if response.status_code in (401,403,404):return True
        return None

def observe(project,forge,url,owner,encrypted,repository='',report=None):
    if report:report('Lecture des paramètres enregistrés.\n')
    if not url or not owner or not encrypted:
        if report:report('URL, utilisateur ou token absent : vérification non lancée.\n')
        return None
    try:
        parts=urlsplit(url)
        if parts.scheme!='https' or not parts.hostname or parts.username or parts.password or parts.query or parts.fragment:
            if report:report('URL de forge invalide ou non HTTPS.\n')
            return None
        base=url.rstrip('/')
        if forge=='GITHUB':endpoint='https://api.github.com/user' if parts.hostname.lower()=='github.com' and parts.port in (None,443) and parts.path in ('','/') else base+'/api/v3/user'
        elif forge=='GITLAB':endpoint=base+'/api/v4/user'
        else:endpoint=base+'/api/v1/user'
        if report:report('Déchiffrement local du token.\n')
        token=crypt(project,forge,encrypted.encode(),True).decode('utf-8')
        if not token or any(c in token for c in '\r\n\0'):
            if report:report('Le token est vide ou invalide.\n')
            return None
        headers={'Accept':'application/json','User-Agent':'CAB-forge-auth'}
        if forge=='GITLAB':headers['PRIVATE-TOKEN']=token
        else:headers['Authorization']=('token ' if forge=='FORGEJO' else 'Bearer ')+token
        if report:
            report(f'Vérification du certificat TLS désactivée pour cette forge {forge}.\n')
        with forge_client(timeout=6) as client:
            with forge_request(client, endpoint, headers, report, f'{forge} — consultation du profil par HTTPS') as response:
                if report:report(f'Réponse de l’API utilisateur : HTTP {response.status_code}.\n')
                if response.status_code==403 and forge=='FORGEJO':return repository_access(client,base,owner,repository,headers,report)
                if response.status_code in (401,403) and forge in ('GITHUB','GITLAB'):return git_repository_access(client,base,owner,repository,token,report)
                if response.status_code==401:return False
                if response.status_code!=200:return None
                data=b''
                for chunk in response.iter_bytes():
                    data+=chunk
                    if len(data)>262144:return None
            document=json.loads(data)
            name=document.get('username' if forge=='GITLAB' else 'login') if isinstance(document,dict) else None
            if not isinstance(name,str) or not name:
                if report:report('L’API ne fournit pas d’identité exploitable.\n')
                return None
            if name.casefold()==owner.casefold():
                if report:report('Identité du compte vérifiée.\n')
                return True
            if report:report('Le compte API diffère du propriétaire configuré.\n')
            if forge in ('GITHUB','GITLAB'):return git_repository_access(client,base,owner,repository,token,report)
            return False
    except httpx.HTTPError:
        return None
    except (httpx.InvalidURL,Refused,ValueError,UnicodeError,KeyError,TypeError,OSError) as error:
        if report:report(f'Vérification impossible : {type(error).__name__}.\n')
        return None


def refresh_one(project_id,forge,*,managed=True,report=None):
    try:
        project=Project.objects.get(pk=project_id)
        url,owner,encrypted,signature=inputs(project,(project.public_metadata or {}).get('values',{}),forge)
        repository=(project.public_metadata or {}).get('values',{}).get('REMOTE_'+forge+'_REPOSITORY','')
        state=observe(project,forge,url,owner,encrypted,repository,report) if report else observe(project,forge,url,owner,encrypted,repository)
        with transaction.atomic():
            project=Project.objects.select_for_update().get(pk=project_id)
            snapshot=dict(project.public_metadata or {})
            if inputs(project,snapshot.get('values',{}),forge)[3]!=signature:
                if report:report('Configuration modifiée pendant la vérification : résultat écarté.\n')
                return None
            config=dict(project.configuration or {});auth=dict(config.get('forge_auth') or {})
            old=auth.get(forge,{})
            if old.get('signature')==signature and old.get('state') is state:
                if report:report('Résultat déjà à jour en base.\n')
                return state
            auth[forge]={'signature':signature,'state':state};config['forge_auth']=auth
            project.configuration=config
            states=dict(snapshot.get('forge_auth') or {});states[forge]=state;snapshot['forge_auth']=states;snapshot['revision']=int(snapshot.get('revision',0))+1
            project.public_metadata=snapshot;project.save(update_fields=['configuration','public_metadata'])
            ProjectMetadataProjection.objects.update_or_create(pk=project.pk,defaults={'public_metadata':snapshot})
            if report:report('Résultat enregistré et transmis aux pages.\n')
            return state
    finally:
        if managed:
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
