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
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from .artifact_builders import DOCKER, DOCKER_NAME, ENV, opened, regular
from .connector_process import alive, identity as process_identity
from .core.commands import Refused, identifier, require
from .core.models import GitDelivery, Maintenance, Project, ProjectArtifactBuild, ProjectForgeArtifactPublication
from .forge_artifacts import DEB, TAG, docker_versions, github_version_tags, pages, tag_rank
from .forge_repository import FORGES, configured, get_json, identity, missing_configuration, refresh_one
from .forge_settings import crypt, forge_client
from .forge_version import base_for
from .project_artifacts import debian_inventory, docker_inventory, enabled
from .project_metadata import REGISTRY
from .versioning import VersionError, canonical_version, historical_version

ACTIVE = ('PENDING','RUNNING','UNKNOWN')
REPO_PATH = re.compile(r'[a-zA-Z0-9][a-zA-Z0-9_.-]*(?:/[a-zA-Z0-9][a-zA-Z0-9_.-]*)*')
DIGEST = re.compile(r'sha256:[a-f0-9]{64}')
DEBIAN_KEEP = 7
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


def mutate(client,url,mark,*,method='POST',**kwargs):
    mark()
    with client.stream(method,url,**kwargs) as response:
        response.raise_for_status()
        body=bytearray()
        for chunk in response.iter_bytes():
            body.extend(chunk)
            require(len(body)<=1048576,'artifact-forge-response-invalid',409)
    value=json.loads(body)
    require(isinstance(value,dict),'artifact-forge-response-invalid',409)
    return value


def remove(client,url,mark):
    mark()
    with client.stream('DELETE',url) as response:
        if response.status_code!=404:
            response.raise_for_status()


def item_id(item):
    value=item.get('id')
    require(type(value) is int and value>0,'artifact-forge-response-invalid',409)
    return value


def release_assets(release,forge):
    assets=release.get('assets')
    if forge=='GITLAB':
        assets=assets.get('links') if isinstance(assets,dict) else None
    return assets if isinstance(assets,list) else []


def debian_asset_url(root,forge,release,asset):
    asset_id=item_id(asset)
    if forge=='GITHUB':
        return f'{root}/releases/assets/{asset_id}'
    if forge=='FORGEJO':
        return f'{root}/releases/{item_id(release)}/assets/{asset_id}'
    return f'{root}/releases/{quote(release["tag_name"],safe="")}/assets/links/{asset_id}'


def debian_series(name,tag):
    fields=name.removesuffix('.deb').rsplit('_',2)
    return (fields[0],fields[2]) if len(fields)==3 and fields[1]==tag else None


def prune_debian(client,root,forge,packages,mark):
    current={}
    for package in packages:
        tag=canonical_version(package['version'])
        series=debian_series(package['name'],tag)
        if series:
            current.setdefault(series,set()).add(tag)
    if not current:
        return

    def candidates():
        result={series:{} for series in current}
        for release in pages(client,get_json,root+'/releases',forge,exhaustive=True):
            tag=release.get('tag_name')
            if release.get('draft') or release.get('upcoming_release') or not isinstance(tag,str):
                continue
            try:
                version=historical_version(tag)
            except ValueError:
                continue
            timestamp=release.get('released_at' if forge=='GITLAB' else 'published_at')
            date=parse_datetime(timestamp) if isinstance(timestamp,str) else None
            if date and date.utcoffset() is None:
                date=None
            if date and date>timezone.now():
                continue
            for asset in release_assets(release,forge):
                name=asset.get('name') if isinstance(asset,dict) else None
                if not isinstance(name,str) or not DEB.fullmatch(name):
                    continue
                series=debian_series(name,version)
                if series in result and tag not in current[series]:
                    row=result[series].setdefault(tag,(date,[]))
                    row[1].append((release,asset))
        return result

    details={'phase':'debian-cleanup','publication_confirmed':True}
    try:
        obsolete={}
        for series,versions in candidates().items():
            ordered=sorted(versions,key=lambda tag: (
                versions[tag][0].timestamp() if versions[tag][0] else float('-inf'),tag_rank(tag)),
                reverse=True)
            limit=max(0,DEBIAN_KEEP-len(current[series]))
            for tag in ordered[limit:]:
                obsolete[series,tag]=[debian_asset_url(root,forge,release,asset)
                                      for release,asset in versions[tag][1]]
        for urls in obsolete.values():
            for url in urls:
                remove(client,url,mark)
        if obsolete:
            remaining=candidates()
            require(not any(tag in remaining[series] for series,tag in obsolete),
                    'artifact-forge-debian-cleanup-unconfirmed',409,details=details)
    except (httpx.HTTPError,ValueError,OSError) as error:
        if isinstance(error,httpx.HTTPStatusError):
            details['http_status']=error.response.status_code
        raise Refused('artifact-forge-debian-cleanup-unconfirmed',409,details=details) from error


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
        expected_url=None
        expected_digest='sha256:'+package['sha256']
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
                if prior and forge=='GITHUB' and prior.get('digest')==expected_digest and prior.get('state')=='uploaded':
                    continue
                if forge=='GITHUB':
                    url=str(release.get('upload_url','')).split('{',1)[0]
                    target,expected=urlsplit(url),urlsplit('https://uploads.github.com' if public_github else base)
                    require((target.scheme,target.netloc)==(expected.scheme,expected.netloc) and
                            not target.username and not target.password and not target.query and not target.fragment and
                            type(release.get('id')) is int and target.path.endswith(f'/releases/{release["id"]}/assets'),
                            'artifact-forge-upload-url-invalid',409)
                    if prior:
                        remove(client,debian_asset_url(root,forge,release,prior),mark)
                    mutate(client,url,mark,params={'name':name},content=iter(lambda:stream.read(1024*1024),b''),
                           headers={'Content-Type':'application/octet-stream','Content-Length':str(info.st_size)})
                elif forge=='FORGEJO':
                    release_id=release.get('id')
                    require(type(release_id) is int and release_id>0,'artifact-forge-release-invalid',409)
                    assets=f'{root}/releases/{release_id}/assets'
                    if prior:
                        remove(client,debian_asset_url(root,forge,release,prior),mark)
                    mutate(client,assets,mark,params={'name':name},
                           files={'attachment':(name,stream,'application/vnd.debian.binary-package')})
                else:
                    link_id=item_id(prior) if prior else None
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
                    expected_url=url
                    links=release_path+'/assets/links'
                    mutate(client,f'{links}/{link_id}' if link_id is not None else links,mark,
                           method='PUT' if link_id is not None else 'POST',
                           json={'name':name,'url':url,'link_type':'package'})
        confirmed=existing(client,release_path)
        require(confirmed and any(isinstance(x,dict) and x.get('name')==name
                and (forge!='GITLAB' or x.get('url')==expected_url)
                and (forge!='GITHUB' or x.get('digest') in (None,expected_digest))
                for x in release_assets(confirmed,forge)),
                'artifact-forge-publication-unconfirmed',409)
    prune_debian(client,root,forge,packages,mark)


def registry_rows(client,api,root,forge,owner,repo,info,*,allow_missing=False):
    def read_inventory(client,url,**kwargs):
        try:
            return get_json(client,url,**kwargs)
        except httpx.HTTPStatusError as error:
            if allow_missing and error.response.status_code==404:
                return [],{}
            raise

    endpoint,rows=docker_versions(client,read_inventory,root,api,forge,owner,repo,info,exhaustive=True)
    inventory={}
    for row in rows:
        if forge=='GITHUB':
            key=item_id(row)
            tags=github_version_tags(row)
            digest=row.get('name')
            require(isinstance(tags,list) and isinstance(digest,str) and DIGEST.fullmatch(digest),
                    'artifact-forge-response-invalid',409)
        else:
            key=row.get('version' if forge=='FORGEJO' else 'name')
            tags=[key]
            digest=None
        require(all(isinstance(tag,str) and TAG.fullmatch(tag) for tag in tags)
                and key not in inventory,'artifact-forge-response-invalid',409)
        inventory[key]=(frozenset(tags),digest)
    return endpoint,inventory


def inspect_manifest(args,remote_name,reference):
    separator='@' if DIGEST.fullmatch(reference) else ':'
    result=subprocess.run([*args,'manifest','inspect',remote_name+separator+reference],
                          env=ENV,capture_output=True,timeout=30)
    details={'phase':'registry-confirmation','tag':reference,'exit_code':result.returncode}
    require(result.returncode==0,'artifact-forge-publication-unconfirmed',409,details=details)
    try:
        manifest=json.loads(result.stdout)
    except (ValueError,UnicodeError) as error:
        raise Refused('artifact-forge-publication-unconfirmed',409,details=details) from error
    require(isinstance(manifest,dict),'artifact-forge-publication-unconfirmed',409,details=details)
    return manifest


def confirm_docker(args,remote_name,labels,image_id):
    manifests=[inspect_manifest(args,remote_name,label) for label in labels]
    require(all(manifest==manifests[0] for manifest in manifests),
            'artifact-forge-publication-unconfirmed',409,details={'phase':'registry-confirmation'})
    pending=[manifests[0]]
    references=set()
    found=False
    while pending:
        manifest=pending.pop()
        config=manifest.get('config')
        if isinstance(config,dict):
            found=found or config.get('digest')==image_id
            continue
        descriptors=manifest.get('manifests')
        require(isinstance(descriptors,list) and descriptors,
                'artifact-forge-publication-unconfirmed',409,details={'phase':'registry-confirmation'})
        for descriptor in descriptors:
            digest=descriptor.get('digest') if isinstance(descriptor,dict) else None
            require(isinstance(digest,str) and DIGEST.fullmatch(digest),
                    'artifact-forge-publication-unconfirmed',409,details={'phase':'registry-confirmation'})
            if digest not in references:
                references.add(digest)
                pending.append(inspect_manifest(args,remote_name,digest))
    require(found,'artifact-forge-publication-unconfirmed',409,details={'phase':'registry-confirmation'})
    return references


def prune_docker(client,inventory,forge,labels,references,previous,mark):
    keep=frozenset(label.casefold() for label in labels) if forge=='FORGEJO' else frozenset(labels)

    def comparable(tags):
        return {tag.casefold() for tag in tags} if forge=='FORGEJO' else tags

    details={'phase':'registry-cleanup','publication_confirmed':True}
    try:
        endpoint,rows=inventory()
        observed=set().union(*(comparable(tags) for tags,_ in rows.values()))
        require(endpoint and keep<=observed,'artifact-forge-registry-cleanup-unconfirmed',409,details=details)
        candidates=set()
        for key,(tags,digest) in rows.items():
            if comparable(tags)&keep or digest in references:
                continue
            if tags or key in previous:
                candidates.add(key)
        for key in sorted(candidates):
            remove(client,endpoint+'/'+quote(str(key),safe=''),mark)
        _,remaining=inventory()
        observed=set().union(*(comparable(tags) for tags,_ in remaining.values()))
        require(keep<=observed and not candidates.intersection(remaining),
                'artifact-forge-registry-cleanup-unconfirmed',409,details=details)
        require(not observed-keep,'artifact-forge-registry-obsolete-tags-retained',409,
                details={**details,'remaining_count':len(observed-keep)})
    except (httpx.HTTPError,ValueError,OSError) as error:
        if isinstance(error,httpx.HTTPStatusError):
            details['http_status']=error.response.status_code
        raise Refused('artifact-forge-registry-cleanup-unconfirmed',409,details=details) from error


def release_docker(client,base,api,root,forge,owner,repo,token,github_public,metadata,image,mark):
    registry='ghcr.io' if forge=='GITHUB' else metadata.get('REMOTE_GITLAB_REGISTRY','') if forge=='GITLAB' else urlsplit(base).netloc
    require(REGISTRY.fullmatch(registry) and (forge!='GITHUB' or github_public),'artifact-forge-registry-invalid',409,
            details={'phase':'registry-configuration'})
    tag=image['tag']
    require(TAG.fullmatch(tag) and DIGEST.fullmatch(image['image_id']),
            'artifact-local-changed',409)
    info=existing(client,root)
    require(info is not None,'artifact-forge-unconfigured',409,details={'phase':'repository'})
    if tag!='latest':
        require(existing(client,root+('/repository/tags/' if forge=='GITLAB' else '/git/ref/tags/' if forge=='GITHUB' else '/tags/')+quote(tag,safe='')) is not None,
                'artifact-forge-tag-missing',409,details={'phase':'remote-tag','tag':tag})
    remote_name=registry+'/'+(owner+'/'+repo).lower()
    labels=tuple(dict.fromkeys([tag,'latest']))

    def inventory(*,allow_missing=False):
        return registry_rows(client,api,root,forge,owner,repo,info,allow_missing=allow_missing)

    with tempfile.TemporaryDirectory(prefix='cab-registry-') as config:
        args=[*DOCKER,'--config',config]
        result=subprocess.run([*args,'login',registry,'--username',owner.rsplit('/',1)[-1],'--password-stdin'],
                              input=token.encode(),env=ENV,capture_output=True,timeout=30)
        require(result.returncode==0,'artifact-forge-registry-auth-failed',409,
                details={'phase':'registry-login','exit_code':result.returncode})
        previous=set()
        if forge=='GITHUB':
            _,rows=inventory(allow_missing=True)
            previous={key for key,(tags,_) in rows.items() if tags}
        for label in labels:
            target=remote_name+':'+label
            env={**ENV,'DOCKER_CONFIG':config}
            tagged=subprocess.run([*args,'tag',image['image_id'],target],env=env,capture_output=True,timeout=10)
            require(tagged.returncode==0,'artifact-local-changed',409,
                    details={'phase':'local-tag','tag':label,'exit_code':tagged.returncode})
            mark()
            pushed=subprocess.run([*args,'push','--quiet',target],env=env,capture_output=True,timeout=1800)
            require(pushed.returncode==0,'artifact-forge-publication-unconfirmed',409,
                    details={'phase':'registry-push','tag':label,'exit_code':pushed.returncode})
        references=confirm_docker(args,remote_name,labels,image['image_id'])
        prune_docker(client,inventory,forge,labels,references,previous,mark)


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
