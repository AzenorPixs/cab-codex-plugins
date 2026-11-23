"""Publication des artefacts locaux par le service CAB."""
from contextlib import contextmanager
import hashlib
import json
import logging
import os
from pathlib import Path
import re
import subprocess
import tempfile
import threading
from urllib.parse import quote, unquote, urljoin, urlsplit

import httpx
from django.db import close_old_connections, connection, transaction

from .artifact_builders import DOCKER, DOCKER_NAME, ENV, opened, regular
from .connector_process import alive, identity as process_identity
from .core.commands import Refused, identifier, require
from .core.models import GitDelivery, Maintenance, Project, ProjectArtifactBuild, ProjectForgeArtifactPublication
from .forge_artifacts import DEB, TAG
from .forge_repository import FORGES, configured, get_json, identity, missing_configuration, refresh_one
from .forge_settings import crypt, forge_client
from .forge_version import base_for
from .project_artifacts import debian_inventory, docker_inventory, enabled
from .project_metadata import REGISTRY
from .versioning import VersionError, canonical_version

ACTIVE = ('PENDING','RUNNING','UNKNOWN')
REPO_PATH = re.compile(r'[a-zA-Z0-9][a-zA-Z0-9_.-]*(?:/[a-zA-Z0-9][a-zA-Z0-9_.-]*)*')
logger = logging.getLogger(__name__)


def public(job):
    return {'id':job.pk,'forge':job.forge,'state':job.state,'error':job.receipt.get('error'),
            'details':job.receipt.get('details')}


def active(project):
    return ProjectForgeArtifactPublication.objects.filter(project=project,state__in=ACTIVE).exists()


def local_plan(project, values, *, version=None):
    result={}
    if enabled(values,'debian'):
        files=[]
        root=Path(project.root)/'dist'
        for _when,item in debian_inventory(project).values():
            if version and item['version']!=version:
                continue
            storage=Path(item.get('storage',str(root)))
            with opened(storage,directory=True) as folder, opened(item['filename'],parent=folder) as fd:
                info=regular(fd)
                with os.fdopen(os.dup(fd),'rb') as stream:
                    checksum=hashlib.file_digest(stream,'sha256').hexdigest()
                files.append({'name':item['filename'],'version':item['version'],'size':info.st_size,'sha256':checksum,'storage':str(storage)})
        if files:
            result['debian']=files
    if enabled(values,'docker'):
        tag=version or values.get('PROJECT_VERSION')
        observed=docker_inventory(project,values,tag=tag).get('local')
        if observed:
            image=observed[1]
            if not tag or image['image']+':'+tag in image['tags']:
                result['docker']={'image_id':image['image_id'],'tag':tag or 'latest'}
    return result


@contextmanager
def remote(project,values,forge):
    require(configured(project,values,forge),'artifact-forge-unconfigured',409)
    prefix=f'REMOTE_{forge}_'
    base=base_for(values,forge)
    owner,repo=(values[prefix+key] for key in ('OWNER','REPOSITORY'))
    require(REPO_PATH.fullmatch(owner) and REPO_PATH.fullmatch(repo) and '/' not in repo,'artifact-forge-unconfigured',409)
    token=crypt(project,forge,project.configuration['forge_tokens_tpm'][forge].encode(),True).decode()
    require(token and not any(c in token for c in '\r\n\0'),'artifact-forge-unconfigured',409)
    headers={'Accept':'application/json','User-Agent':'CAB-artifact-publication'}
    headers['PRIVATE-TOKEN' if forge=='GITLAB' else 'Authorization']=token if forge=='GITLAB' else ('token ' if forge=='FORGEJO' else 'Bearer ')+token
    github_public=forge=='GITHUB' and urlsplit(base).hostname=='github.com'
    if forge=='GITLAB':
        api=base+'/api/v4';root=api+'/projects/'+quote(owner+'/'+repo,safe='')
    else:
        api=('https://api.github.com' if github_public else base+'/api/v3') if forge=='GITHUB' else base+'/api/v1'
        root=api+'/repos/'+quote(owner,safe='/')+'/'+quote(repo,safe='')
    with forge_client(headers=headers,timeout=30) as client:
        yield client,base,api,root,owner,repo,token,github_public


def existing(client,url,**kwargs):
    try:
        value,_=get_json(client,url,**kwargs)
    except httpx.HTTPStatusError as error:
        if error.response.status_code==404:
            return None
        raise
    require(isinstance(value,dict),'artifact-forge-response-invalid',409)
    return value


def mutate(client,url,mark,**kwargs):
    mark()
    with client.stream('POST',url,**kwargs) as response:
        response.raise_for_status()
        body=bytearray()
        for chunk in response.iter_bytes():
            body.extend(chunk)
            require(len(body)<=1048576,'artifact-forge-response-invalid',409)
    value=json.loads(body)
    require(isinstance(value,dict),'artifact-forge-response-invalid',409)
    return value


def release_assets(release,forge):
    assets=release.get('assets')
    if forge=='GITLAB':
        assets=assets.get('links') if isinstance(assets,dict) else None
    return assets if isinstance(assets,list) else []


def release_debian(project,client,base,root,forge,public_github,packages,mark):
    from .artifact_builders import cab_runtime_recipe,recipe,verify_cab_debian
    try:
        with opened(Path(project.root),directory=True) as root_fd:
            cab_runtime=cab_runtime_recipe(recipe(root_fd))
    except FileNotFoundError:
        cab_runtime=False
    for package in packages:
        name,tag=package['name'],canonical_version(package['version'])
        require(DEB.fullmatch(name),'artifact-local-changed',409)
        release_path=root+'/releases'+('/' if forge=='GITLAB' else '/tags/')+quote(tag,safe='')
        git_tag=root+('/repository/tags/' if forge=='GITLAB' else '/git/ref/tags/' if forge=='GITHUB' else '/tags/')+quote(tag,safe='')
        require(existing(client,git_tag) is not None,'artifact-forge-tag-missing',409)
        with opened(Path(package.get('storage',str(Path(project.root)/'dist'))),directory=True) as folder,opened(name,parent=folder) as fd:
            info=regular(fd)
            with os.fdopen(os.dup(fd),'rb') as stream:
                require(info.st_size==package['size'] and hashlib.file_digest(stream,'sha256').hexdigest()==package['sha256'],
                        'artifact-local-changed',409)
                if cab_runtime:
                    verify_cab_debian(fd,tag)
                stream.seek(0)
                release=existing(client,release_path)
                if release is None:
                    release=mutate(client,root+'/releases',mark,json={'tag_name':tag,'name':tag})
                require(release.get('tag_name')==tag and not release.get('draft'),'artifact-forge-release-invalid',409)
                prior=next((x for x in release_assets(release,forge) if isinstance(x,dict) and x.get('name')==name),None)
                if prior:
                    digest=prior.get('digest')
                    require(not digest or digest=='sha256:'+package['sha256'],'artifact-forge-version-conflict',409)
                    continue
                if forge=='GITHUB':
                    url=str(release.get('upload_url','')).split('{',1)[0]
                    target,expected=urlsplit(url),urlsplit('https://uploads.github.com' if public_github else base)
                    require((target.scheme,target.netloc)==(expected.scheme,expected.netloc) and
                            not target.username and not target.password and not target.query and not target.fragment and
                            type(release.get('id')) is int and target.path.endswith(f'/releases/{release["id"]}/assets'),
                            'artifact-forge-upload-url-invalid',409)
                    mutate(client,url,mark,params={'name':name},content=iter(lambda:stream.read(1024*1024),b''),
                           headers={'Content-Type':'application/octet-stream','Content-Length':str(info.st_size)})
                elif forge=='FORGEJO':
                    release_id=release.get('id')
                    require(type(release_id) is int and release_id>0,'artifact-forge-release-invalid',409)
                    mutate(client,f'{root}/releases/{release_id}/assets',mark,params={'name':name},
                           files={'attachment':(name,stream,'application/vnd.debian.binary-package')})
                else:
                    uploaded=mutate(client,root+'/uploads',mark,
                                    files={'file':(name,stream,'application/vnd.debian.binary-package')})
                    path=uploaded.get('url')
                    require(isinstance(path,str) and re.fullmatch(r'/uploads/[0-9a-fA-F]+/'+re.escape(name),path),
                            'artifact-forge-upload-url-invalid',409)
                    project_path='/'+quote(unquote(root.rsplit('/',1)[-1]),safe='/')
                    full=uploaded.get('full_path')
                    if isinstance(full,str) and re.fullmatch(r'/-/project/[0-9]+'+re.escape(path),full):
                        url=urljoin(base+'/',full)
                    else:
                        url=base+project_path+path
                    mutate(client,release_path+'/assets/links',mark,
                           json={'name':name,'url':url,'link_type':'package'})
        confirmed=existing(client,release_path)
        require(confirmed and any(isinstance(x,dict) and x.get('name')==name for x in release_assets(confirmed,forge)),
                'artifact-forge-publication-unconfirmed',409)


def release_docker(client,base,api,root,forge,owner,repo,token,github_public,metadata,image,mark):
    registry='ghcr.io' if forge=='GITHUB' else metadata.get('REMOTE_GITLAB_REGISTRY','') if forge=='GITLAB' else urlsplit(base).netloc
    require(REGISTRY.fullmatch(registry) and (forge!='GITHUB' or github_public),'artifact-forge-registry-invalid',409,
            details={'phase':'registry-configuration'})
    tag=image['tag']
    require(TAG.fullmatch(tag) and re.fullmatch(r'sha256:[a-f0-9]{64}',image['image_id']),
            'artifact-local-changed',409)
    info=existing(client,root)
    require(info is not None,'artifact-forge-unconfigured',409,details={'phase':'repository'})
    if tag!='latest':
        require(existing(client,root+('/repository/tags/' if forge=='GITLAB' else '/git/ref/tags/' if forge=='GITHUB' else '/tags/')+quote(tag,safe='')) is not None,
                'artifact-forge-tag-missing',409,details={'phase':'remote-tag','tag':tag})
    remote_name=registry+'/'+(owner+'/'+repo).lower()
    with tempfile.TemporaryDirectory(prefix='cab-registry-') as config:
        args=[*DOCKER,'--config',config]
        result=subprocess.run([*args,'login',registry,'--username',owner.rsplit('/',1)[-1],'--password-stdin'],
                              input=token.encode(),env=ENV,capture_output=True,timeout=30)
        require(result.returncode==0,'artifact-forge-registry-auth-failed',409,
                details={'phase':'registry-login','exit_code':result.returncode})
        if tag!='latest':
            checked=subprocess.run([*args,'manifest','inspect',remote_name+':'+tag],
                                   env=ENV,capture_output=True,timeout=30)
            require(checked.returncode!=0,'artifact-forge-version-conflict',409,
                    details={'phase':'registry-inspect','tag':tag})
            require(b'no such manifest' in checked.stderr.lower() or b'manifest unknown' in checked.stderr.lower(),
                    'artifact-forge-registry-inspect-failed',409,
                    details={'phase':'registry-inspect','tag':tag,'exit_code':checked.returncode})
        for label in dict.fromkeys([tag,'latest']):
            target=remote_name+':'+label
            env={**ENV,'DOCKER_CONFIG':config}
            tagged=subprocess.run([*args,'tag',image['image_id'],target],env=env,capture_output=True,timeout=10)
            require(tagged.returncode==0,'artifact-local-changed',409,
                    details={'phase':'local-tag','tag':label,'exit_code':tagged.returncode})
            mark()
            pushed=subprocess.run([*args,'push','--quiet',target],env=env,capture_output=True,timeout=1800)
            require(pushed.returncode==0,'artifact-forge-publication-unconfirmed',409,
                    details={'phase':'registry-push','tag':label,'exit_code':pushed.returncode})


def release_forgejo(project,values,plan,mark):
    publish(project,values,'FORGEJO',plan,mark)


def release_github(project,values,plan,mark):
    publish(project,values,'GITHUB',plan,mark)


def release_gitlab(project,values,plan,mark):
    publish(project,values,'GITLAB',plan,mark)


def publish(project,values,forge,plan,mark):
    with remote(project,values,forge) as (client,base,api,root,owner,repo,token,public_github):
        if plan.get('debian'):
            release_debian(project,client,base,root,forge,public_github,plan['debian'],mark)
        if plan.get('docker'):
            release_docker(client,base,api,root,forge,owner,repo,token,public_github,values,plan['docker'],mark)


PUBLISHERS={'FORGEJO':release_forgejo,'GITHUB':release_github,'GITLAB':release_gitlab}


@transaction.atomic
def request(project,forge,request_id):
    identifier(request_id)
    require(forge in FORGES,'forge-not-supported',400)
    with connection.cursor() as cursor:
        cursor.execute('SELECT pg_advisory_xact_lock(%s)',[300001])
    project=Project.objects.select_for_update(no_key=True).get(pk=project.pk)
    previous=ProjectForgeArtifactPublication.objects.filter(pk=request_id).first()
    if previous:
        require(previous.project_id==project.pk and previous.forge==forge,'artifact-publication-request-conflict',409)
        return public(previous)
    require(not Maintenance.objects.filter(state__in=('PREPARED','INSTALLING')).exists(),'maintenance-in-progress',503)
    require(not active(project) and not ProjectArtifactBuild.objects.filter(project=project,state__in=ACTIVE).exists()
            and not GitDelivery.objects.filter(project=project,state__in=(*ACTIVE,'PARTIAL')).exists(),
            'artifact-build-active',409)
    values=project.public_metadata.get('values',{})
    missing=missing_configuration(project,values,forge)
    require(not missing,'artifact-forge-unconfigured',409,
            details={'phase':'configuration','missing':missing})
    from .core.models import ProjectArtifact
    require(ProjectArtifact.objects.filter(project=project,kind__in=[k for k in ('debian','docker') if enabled(values,k)]).exists(),
            'artifact-local-missing',409,details={'phase':'inventory'})
    job=ProjectForgeArtifactPublication.objects.create(pk=request_id,project=project,forge=forge,
          plan={'signature':identity(project,values,forge),
                **({'registry':values.get('REMOTE_GITLAB_REGISTRY','')} if forge=='GITLAB' else {})})
    return public(job)


def worker(key):
    close_old_connections()
    job=ProjectForgeArtifactPublication.objects.select_related('project').get(pk=key)
    project=job.project
    values=project.public_metadata.get('values',{})
    issued=False
    def mark():
        nonlocal issued
        if not issued:
            ProjectForgeArtifactPublication.objects.filter(pk=key,state='RUNNING').update(receipt={'issued':True})
            issued=True
    try:
        require(identity(project,values,job.forge)==job.plan['signature']
                and (job.forge!='GITLAB' or values.get('REMOTE_GITLAB_REGISTRY','')==job.plan.get('registry','')),
                'artifact-forge-config-changed',409)
        plan=local_plan(project,values)
        if not plan and enabled(values,'docker') and (tag:=values.get('PROJECT_VERSION')):
            name=values.get('PROJECT_ID') or project.identifier or ''
            observed=docker_inventory(project,values)
            if observed and DOCKER_NAME.fullmatch(name) and TAG.fullmatch(tag):
                raise Refused('artifact-local-docker-version-missing',
                              details={'phase':'inventory','tag':name+':'+tag})
        require(plan,'artifact-local-missing',409,details={'phase':'inventory'})
        if 'docker' in plan and job.forge=='GITLAB':
            require(REGISTRY.fullmatch(values.get('REMOTE_GITLAB_REGISTRY','')),
                    'artifact-forge-registry-invalid',409,details={'phase':'registry-configuration'})
        PUBLISHERS[job.forge](project,values,plan,mark)
    except (Refused,VersionError,httpx.HTTPError,OSError,ValueError,subprocess.SubprocessError) as error:
        state='UNKNOWN' if issued else 'FAILED'
        result={'error':getattr(error,'code','artifact-forge-publication-failed'),'issued':issued}
        if isinstance(error,Refused) and error.details:
            result['details']=error.details
        if isinstance(error,httpx.HTTPStatusError):
            result['details']={'phase':'forge-api','http_status':error.response.status_code}
    else:
        state,result='COMPLETED',{'issued':issued}
    ProjectForgeArtifactPublication.objects.filter(pk=key,state='RUNNING').update(state=state,receipt=result)
    if issued or state=='COMPLETED':
        try:
            refresh_one(project.pk,job.forge,wait=True,automatic=False)
        except (OSError,Refused):
            logger.warning('Observation distante indisponible après publication',extra={'project_id':project.pk})
    close_old_connections()


@transaction.atomic
def dispatch():
    with connection.cursor() as cursor:
        cursor.execute('SELECT pg_advisory_xact_lock(%s)',[300001])
    if Maintenance.objects.filter(state__in=('PREPARED','INSTALLING')).exists():
        return
    running=ProjectForgeArtifactPublication.objects.filter(state='RUNNING').first()
    if running:
        if alive(running.executor):
            return
        running.state='UNKNOWN'
        running.receipt={**running.receipt,'error':'artifact-forge-publication-unconfirmed'}
        running.save(update_fields=['state','receipt'])
    job=ProjectForgeArtifactPublication.objects.select_for_update().filter(state='PENDING').order_by('created').first()
    if not job:
        return
    job.state,job.executor='RUNNING',process_identity(os.getpid())
    job.save(update_fields=['state','executor'])
    transaction.on_commit(lambda: threading.Thread(target=worker,args=(job.pk,),name='cab-forge-artifacts',daemon=True).start())
