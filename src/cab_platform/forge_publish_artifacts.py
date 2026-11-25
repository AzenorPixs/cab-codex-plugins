"""Publication des artefacts locaux par le service CAB."""
from contextlib import ExitStack, contextmanager, nullcontext
from datetime import timedelta
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
from urllib.request import parse_http_list, parse_keqv_list

import httpx
from django.db import close_old_connections, connection, transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from .artifact_builders import DOCKER, DOCKER_NAME, ENV, opened, regular
from .connector_process import alive, identity as process_identity
from .core.commands import Refused, identifier, require
from .core.models import Maintenance, Project, ProjectForgeArtifactPublication
from .forge_artifacts import DEB, TAG, docker_versions, github_version_tags, pages, tag_rank, publication_date, remember_gitlab_debian
from .forge_repository import FORGES, configured, get_json, identity, missing_configuration, refresh_one
from .forge_settings import crypt, forge_client
from .forge_version import base_for
from .project_artifacts import debian_inventory, docker_inventory, enabled, require_available, require_artifact_delivery_available
from .project_metadata import DEBIAN_RETENTION, DOCKER_RETENTION, REGISTRY, artifact_retention
from .versioning import VersionError, canonical_version, historical_version

REPO_PATH = re.compile(r'[a-zA-Z0-9][a-zA-Z0-9_.-]*(?:/[a-zA-Z0-9][a-zA-Z0-9_.-]*)*')
DIGEST = re.compile(r'sha256:[a-f0-9]{64}')
logger = logging.getLogger(__name__)


PUBLICATION_STEPS = {
    'debian': ('debian-tag','debian-release','debian-retention'),
    'docker': ('docker-prepare','docker-login','docker-push','docker-confirm','docker-retention'),
}
PUBLICATION_ERRORS = (Refused, VersionError, httpx.HTTPError, OSError, ValueError, subprocess.SubprocessError)
REGISTRY_INVENTORY_SCOPES = {'FORGEJO':'read:package','GITHUB':'read:packages','GITLAB':'read_api'}
RECONCILIATION_DELAYS = (0,30,120)
_reconciliation_lock = threading.Lock()


def diagnostic(error):
    if isinstance(error, Refused):
        details = error.details if isinstance(error.details,dict) else {}
        return error.code, {key:details[key] for key in (
            'phase','tag','reason','missing','exit_code','http_status','publication_confirmed','remaining_count','required_scopes'
        ) if key in details}
    if isinstance(error,httpx.HTTPStatusError):
        return 'artifact-forge-publication-failed', {'http_status':error.response.status_code}
    return 'artifact-forge-publication-failed', {}


class PublicationProgress:
    def __init__(self,kinds,save=None):
        self.kinds = [kind for kind in PUBLICATION_STEPS if kind in kinds]
        self.steps = {key:{'key':key,'state':'PENDING'} for key in (
            'configuration','inventory','connection',
            *(key for kind in self.kinds for key in PUBLICATION_STEPS[kind]),
        )}
        self.save = save

    def set(self,key,state,**details):
        self.steps[key] = {'key':key,'state':state,**details}
        if self.save is not None:
            self.save(self.snapshot())

    @contextmanager
    def step(self,key):
        self.set(key,'RUNNING')
        try:
            yield
        except PUBLICATION_ERRORS as error:
            code,details = diagnostic(error)
            self.set(key,'FAILED',error=code,details=details,at=timezone.now().isoformat())
            raise
        else:
            self.set(key,'COMPLETED',at=timezone.now().isoformat())

    def skip_missing(self,plan):
        for kind in self.kinds:
            if kind not in plan:
                for key in PUBLICATION_STEPS[kind]:
                    self.set(key,'SKIPPED')

    def snapshot(self):
        return {'kinds':self.kinds,'steps':list(self.steps.values())}


def track(progress,key):
    return progress.step(key) if progress is not None else nullcontext()


def gitlab_first_tag_failed(job):
    details = job.receipt.get('details') or {}
    progress = job.receipt.get('progress') or {}
    stages = {step['key']: step['state'] for step in progress.get('steps', [])}
    tag = (job.plan.get('docker') or {}).get('tag')
    return (job.forge == 'GITLAB' and isinstance(tag, str) and tag != 'latest'
            and details.get('phase') == 'registry-push' and details.get('tag') == tag
            and type(details.get('exit_code')) is int and details['exit_code'] != 0
            and stages.get('docker-push') == 'FAILED' and stages.get('docker-confirm') == 'PENDING')


def docker_confirmation_required(job):
    receipt=job.receipt
    if job.state!='UNKNOWN' or receipt.get('issued') is not True:
        return False
    if gitlab_first_tag_failed(job):
        return True
    details=receipt.get('details')
    if (receipt.get('error')=='artifact-forge-publication-unconfirmed'
            and isinstance(details,dict) and details.get('phase')=='registry-confirmation'):
        return True
    progress=receipt.get('progress') or {}
    stages={step['key']:step['state'] for step in progress.get('steps',[])}
    return (bool(job.plan.get('docker')) and stages.get('docker-push')=='COMPLETED'
            and stages.get('docker-confirm') in ('FAILED','UNKNOWN')
            and stages.get('docker-retention')=='PENDING')


def public(job):
    return {'id':job.pk,'forge':job.forge,'state':job.state,'error':job.receipt.get('error'),
            'details':job.receipt.get('details'),'progress':job.receipt.get('progress'),
            'reconcilable':docker_confirmation_required(job)}


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


def obsolete_versions(versions, policy, now, rank):
    count, days = policy
    ordered = sorted(versions, key=lambda key: (
        versions[key] if versions[key] is not None else float('-inf'), rank(key)), reverse=True)
    return ordered[max(0, count):] if days is None else [
        key for key in ordered[max(0, count):]
        if versions[key] is not None and now - versions[key] > days * 86400
    ]


def prune_debian(client,root,forge,packages,mark,policy):
    current={}
    for package in packages:
        tag=canonical_version(package['version'])
        series=debian_series(package['name'],tag)
        if series:
            current.setdefault(series,set()).add(tag)
    if not current:
        return

    now = timezone.now().timestamp()

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
            observed = publication_date(timestamp)
            date = observed.timestamp() if observed else None
            if date is not None and date > now:
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
            count, days = policy
            dates = {tag: date for tag,(date,_) in versions.items()}
            for tag in obsolete_versions(dates, (count-len(current[series]), days), now, tag_rank):
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


def release_debian(project,client,base,root,forge,public_github,packages,mark,progress=None,*,policy=(0,None)):
    with track(progress,'debian-tag'):
        for package in packages:
            name,tag=package['name'],canonical_version(package['version'])
            require(DEB.fullmatch(name),'artifact-local-changed',409)
            git_tag=root+('/repository/tags/' if forge=='GITLAB' else '/git/ref/tags/' if forge=='GITHUB' else '/tags/')+quote(tag,safe='')
            require(existing(client,git_tag) is not None,'artifact-forge-tag-missing',409)
    with track(progress,'debian-release'):
        from .artifact_builders import cab_runtime_recipe,recipe,verify_cab_debian
        try:
            with opened(Path(project.root),directory=True) as root_fd:
                cab_runtime=cab_runtime_recipe(recipe(root_fd))
        except FileNotFoundError:
            cab_runtime=False
        for package in packages:
            name,tag=package['name'],canonical_version(package['version'])
            release_path=root+'/releases'+('/' if forge=='GITLAB' else '/tags/')+quote(tag,safe='')
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
            asset=next((x for x in release_assets(confirmed,forge)
                        if isinstance(x,dict) and x.get('name')==name
                        and (forge!='GITLAB' or x.get('url')==expected_url)
                        and (forge!='GITHUB' or x.get('digest') in (None,expected_digest))),None) if confirmed else None
            require(asset,'artifact-forge-publication-unconfirmed',409)
            if forge=='GITLAB':
                remember_gitlab_debian(project,root,tag,asset)
    if policy != (0,None):
        with track(progress,'debian-retention'):
            prune_debian(client,root,forge,packages,mark,policy)
    elif progress is not None:
        progress.set('debian-retention','SKIPPED')


def registry_rows(client,api,root,forge,owner,repo,info,*,allow_missing=False,dates=False):
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
            if forge=='FORGEJO' and isinstance(key,str) and DIGEST.fullmatch(key):
                # Forgejo expose aussi les manifestes enfants comme versions de package.
                continue
            tags=[key]
            digest=None
        require(all(isinstance(tag,str) and TAG.fullmatch(tag) for tag in tags)
                and key not in inventory,'artifact-forge-response-invalid',409)
        date = publication_date(row.get('created_at')) if dates else None
        if dates and forge=='GITLAB' and date is None and key!='latest':
            details = existing(client,endpoint+'/'+quote(key,safe=''))
            if isinstance(details,dict) and details.get('name')==key:
                date = publication_date(details.get('created_at'))
        inventory[key]=(frozenset(tags),digest,date.timestamp() if date else None)
    return endpoint,inventory


def docker_failure(result, phase, tag):
    stderr = (result.stderr or b'').lower()
    details = {'phase': phase, 'tag': tag, 'exit_code': result.returncode}
    if b'x509:' in stderr or b'certificate signed by unknown authority' in stderr:
        details['reason'] = 'tls-certificate'
    elif any(message in stderr for message in (b'insufficient_scope', b'access denied', b'unauthorized', b'forbidden')):
        details['reason'] = 'registry-access'
    elif b'no such manifest' in stderr or b'manifest unknown' in stderr:
        details['reason'] = 'manifest-missing'
    return details


def inspect_manifest(args,remote_name,reference):
    separator='@' if DIGEST.fullmatch(reference) else ':'
    result=subprocess.run([*args,'manifest','inspect',remote_name+separator+reference],
                          env=ENV,capture_output=True,timeout=30)
    details=docker_failure(result,'registry-confirmation',reference)
    require(result.returncode==0,'artifact-forge-publication-unconfirmed',409,details=details)
    try:
        manifest=json.loads(result.stdout)
    except (ValueError,UnicodeError) as error:
        raise Refused('artifact-forge-publication-unconfirmed',409,details=details) from error
    require(isinstance(manifest,dict),'artifact-forge-publication-unconfirmed',409,details=details)
    return manifest


def registry_digest(args,remote_name,label):
    result=subprocess.run([*args,'buildx','imagetools','inspect','--format','{{json .Manifest}}',
                           remote_name+':'+label],env=ENV,capture_output=True,timeout=30)
    details=docker_failure(result,'registry-confirmation',label)
    require(result.returncode==0,'artifact-forge-publication-unconfirmed',409,details=details)
    try:
        descriptor=json.loads(result.stdout)
    except (ValueError,UnicodeError) as error:
        raise Refused('artifact-forge-publication-unconfirmed',409,details=details) from error
    digest=descriptor.get('digest') if isinstance(descriptor,dict) else None
    require(isinstance(digest,str) and DIGEST.fullmatch(digest),
            'artifact-forge-publication-unconfirmed',409,details=details)
    return digest


def confirm_docker(args, remote_name, labels, image_id, *, read_manifest=None, read_digest=None):
    if read_manifest is None:
        def read_manifest(ref):
            return inspect_manifest(args, remote_name, ref)
    if read_digest is None:
        def read_digest(ref):
            return registry_digest(args, remote_name, ref)
    manifests = [read_manifest(label) for label in labels]
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
                pending.append(read_manifest(digest))
    if not found:
        # Le magasin containerd peut utiliser le descripteur OCI comme identifiant local.
        for label in labels:
            require(read_digest(label)==image_id,
                    'artifact-forge-publication-unconfirmed',409,
                    details={'phase':'registry-confirmation','tag':label})
        references.add(image_id)
    return references


REGISTRY_MANIFEST_TYPES = ', '.join((
    'application/vnd.oci.image.index.v1+json',
    'application/vnd.oci.image.manifest.v1+json',
    'application/vnd.docker.distribution.manifest.list.v2+json',
    'application/vnd.docker.distribution.manifest.v2+json',
))


def confirm_gitlab_registry(base, registry, repository, username, token, labels, image_id, *, allow_missing_version=False):
    details = {'phase': 'registry-confirmation'}
    code = 'artifact-forge-publication-unconfirmed'
    require(REGISTRY.fullmatch(registry) and REPO_PATH.fullmatch(repository), code, 409, details=details)
    endpoint = f'https://{registry}/v2/'
    origin = urlsplit(base)
    manifests = {}
    with forge_client(timeout=8, headers={'Accept': REGISTRY_MANIFEST_TYPES}) as client:
        probe = client.get(endpoint)
        if probe.status_code == 401:
            scheme, _, challenge = probe.headers.get('www-authenticate', '').partition(' ')
            fields = parse_keqv_list(parse_http_list(challenge))
            realm = urlsplit(fields.get('realm', ''))
            require(scheme.lower() == 'bearer' and fields.get('service') and
                    (realm.scheme, realm.netloc, realm.path) ==
                    ('https', origin.netloc, origin.path.rstrip('/') + '/jwt/auth')
                    and not (realm.query or realm.fragment), code, 409, details=details)
            credentials, _ = get_json(client, realm.geturl(), auth=(username, token), params={
                'service': fields['service'], 'scope': f'repository:{repository}:pull',
            }, max_bytes=32768)
            bearer = credentials.get('token') if isinstance(credentials, dict) else None
            require(isinstance(bearer, str) and re.fullmatch(r'[A-Za-z0-9_.=-]{1,16384}', bearer),
                    code, 409, details=details)
            headers = {'Authorization': 'Bearer ' + bearer}
        else:
            probe.raise_for_status()
            headers = {}

        def observe(ref):
            if ref not in manifests:
                manifest, response = get_json(client, endpoint + repository + '/manifests/' + quote(ref, safe=':'),
                                              headers=headers)
                digest = response.get('docker-content-digest', '')
                require(isinstance(manifest, dict) and DIGEST.fullmatch(digest)
                        and (not DIGEST.fullmatch(ref) or digest == ref),
                        code, 409, details={**details, 'tag': ref})
                manifests[ref] = manifest, digest
            return manifests[ref]

        if allow_missing_version:
            try:
                observe(labels[0])
            except httpx.HTTPStatusError as error:
                if error.response.status_code != 404:
                    raise
                # L'accès à l'autre référence distingue une version manquante
                # d'un dépôt ou d'un registre inaccessible.
                observe('latest')
                return None

        digests = [observe(label)[1] for label in labels]
        require(all(digest == digests[0] for digest in digests), code, 409, details=details)
        return confirm_docker([], registry + '/' + repository, labels, image_id,
                              read_manifest=lambda ref: observe(ref)[0],
                              read_digest=lambda ref: observe(ref)[1])


def confirm_forge_docker(args, base, registry, owner, repo, forge, token, labels, image_id):
    repository = (owner + '/' + repo).lower()
    try:
        return confirm_docker(args, registry + '/' + repository, labels, image_id)
    except Refused as error:
        if forge != 'GITLAB' or (error.details or {}).get('reason') != 'tls-certificate':
            raise
    try:
        return confirm_gitlab_registry(base, registry, repository, owner.rsplit('/', 1)[-1], token, labels, image_id)
    except (httpx.HTTPError, ValueError) as error:
        status = error.response.status_code if isinstance(error, httpx.HTTPStatusError) else None
        raise Refused('artifact-forge-publication-unconfirmed', 409, details={
            'phase': 'registry-confirmation', **({'http_status': status} if status else {}),
        }) from None


def prune_docker(client,inventory,forge,labels,references,previous,mark,policy):
    keep=frozenset(label.casefold() for label in labels) if forge=='FORGEJO' else frozenset(labels)

    def comparable(tags):
        return {tag.casefold() for tag in tags} if forge=='FORGEJO' else tags

    details={'phase':'registry-cleanup','publication_confirmed':True}
    try:
        endpoint,rows=inventory(dates=True)
        observed=set().union(*(comparable(tags) for tags,_,_ in rows.values()))
        require(endpoint and keep<=observed,'artifact-forge-registry-cleanup-unconfirmed',409,details=details)
        dates = {}
        for key,(tags,digest,date) in rows.items():
            if comparable(tags)&keep or digest in references:
                continue
            if tags or key in previous:
                dates[key] = date
        count, days = policy
        candidates = set(obsolete_versions(
            dates, (count-1, days), timezone.now().timestamp(),
            lambda key: max(map(tag_rank, rows[key][0] or previous[key])),
        ))
        for key in sorted(candidates):
            remove(client,endpoint+'/'+quote(str(key),safe=''),mark)
        _,remaining=inventory()
        observed=set().union(*(comparable(tags) for tags,_,_ in remaining.values()))
        require(keep<=observed and not candidates.intersection(remaining)
                and (rows.keys()-candidates)<=remaining.keys(),
                'artifact-forge-registry-cleanup-unconfirmed',409,details=details)
        if policy == (1,None):
            require(not observed-keep,'artifact-forge-registry-obsolete-tags-retained',409,
                    details={**details,'remaining_count':len(observed-keep)})
    except (httpx.HTTPError,ValueError,OSError) as error:
        if isinstance(error,httpx.HTTPStatusError):
            details['http_status']=error.response.status_code
        raise Refused('artifact-forge-registry-cleanup-unconfirmed',409,details=details) from error


def docker_registry(base,forge,github_public,metadata):
    registry='ghcr.io' if forge=='GITHUB' else metadata.get('REMOTE_GITLAB_REGISTRY','') if forge=='GITLAB' else urlsplit(base).netloc
    require(REGISTRY.fullmatch(registry) and (forge!='GITHUB' or github_public),'artifact-forge-registry-invalid',409,
            details={'phase':'registry-configuration'})
    return registry


@contextmanager
def registry_login(registry,owner,token):
    with tempfile.TemporaryDirectory(prefix='cab-registry-') as config:
        args=[*DOCKER,'--config',config]
        result=subprocess.run([*args,'login',registry,'--username',owner.rsplit('/',1)[-1],'--password-stdin'],
                              input=token.encode(),env=ENV,capture_output=True,timeout=30)
        require(result.returncode==0,'artifact-forge-registry-auth-failed',409,
                details={'phase':'registry-login','exit_code':result.returncode})
        yield args,{**ENV,'DOCKER_CONFIG':config}


def release_docker(client,base,api,root,forge,owner,repo,token,github_public,metadata,image,mark,progress=None):
    policy = artifact_retention(metadata.get(DOCKER_RETENTION,''))
    with track(progress,'docker-prepare'):
        registry=docker_registry(base,forge,github_public,metadata)
        if forge=='GITHUB':
            require(not token.startswith('github_pat_'),'artifact-github-packages-classic-token-required',409,
                    details={'phase':'registry-configuration',
                             'required_scopes':['write:packages'] + (
                                 ['delete:packages'] if policy != (0,None) else [])})
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
        def inventory(*,allow_missing=False,dates=False):
            return registry_rows(client,api,root,forge,owner,repo,info,
                                 allow_missing=allow_missing,dates=dates)

        try:
            _,rows=inventory(allow_missing=True) if policy != (0,None) else (None,{})
        except httpx.HTTPStatusError as error:
            status=error.response.status_code
            if status not in (401,403):
                raise
            raise Refused('artifact-forge-registry-inventory-forbidden',409,details={
                'phase':'registry-inventory','http_status':status,
                'required_scopes':[REGISTRY_INVENTORY_SCOPES[forge]],
            }) from error
        previous={key:tags for key,(tags,_,_) in rows.items() if tags}

    with ExitStack() as stack:
        with track(progress,'docker-login'):
            args,env=stack.enter_context(registry_login(registry,owner,token))
        # Un même artefact confirmé est déjà publié, même si le registre
        # interdit de réécrire un tag existant.
        try:
            references = confirm_forge_docker(args, base, registry, owner, repo, forge, token, labels, image['image_id'])
        except PUBLICATION_ERRORS:
            references = None
        if references is not None:
            if progress is not None:
                progress.set('docker-push', 'SKIPPED')
                progress.set('docker-confirm', 'COMPLETED', at=timezone.now().isoformat())
        else:
            with track(progress,'docker-push'):
                for label in labels:
                    target=remote_name+':'+label
                    tagged=subprocess.run([*args,'tag',image['image_id'],target],env=env,capture_output=True,timeout=10)
                    require(tagged.returncode==0,'artifact-local-changed',409,
                            details={'phase':'local-tag','tag':label,'exit_code':tagged.returncode})
                    mark()
                    pushed=subprocess.run([*args,'push','--quiet',target],env=env,capture_output=True,timeout=1800)
                    require(pushed.returncode==0,'artifact-forge-publication-unconfirmed',409,
                            details=docker_failure(pushed,'registry-push',label))
            with track(progress,'docker-confirm'):
                references=confirm_forge_docker(args,base,registry,owner,repo,forge,token,labels,image['image_id'])
        if policy != (0,None):
            with track(progress,'docker-retention'):
                prune_docker(client,inventory,forge,labels,references,previous,mark,policy)
        elif progress is not None:
            progress.set('docker-retention','SKIPPED')


@transaction.atomic
def reconcile_docker(project,request_id,tag,image_id):
    identifier(request_id)
    require(isinstance(tag,str) and TAG.fullmatch(tag) and isinstance(image_id,str)
            and DIGEST.fullmatch(image_id),'artifact-reconciliation-invalid',400)
    project=Project.objects.select_for_update(no_key=True).get(pk=project.pk)
    job=ProjectForgeArtifactPublication.objects.select_for_update().filter(
        pk=request_id,project=project).first()
    require(job is not None,'artifact-reconciliation-ineligible',409)
    evidence={'tag':tag,'image_id':image_id}
    if job.state in ('COMPLETED', 'FAILED') and job.receipt.get('reconciliation')==evidence:
        return public(job)
    require(not Maintenance.objects.filter(state__in=('PREPARED','INSTALLING')).exists(),
            'maintenance-in-progress',503)
    values=project.public_metadata.get('values',{})
    error=job.receipt.get('error')
    details=job.receipt.get('details')
    # Sur Forgejo, dans un plan Docker seul, cette erreur après l'envoi
    # provenait de l'inventaire des versions demandé après la confirmation.
    legacy_inventory_error=(job.forge=='FORGEJO' and details is None
                            and error=='artifact-forge-response-invalid'
                            and enabled(values,'docker') and not enabled(values,'debian'))
    require(job.state=='UNKNOWN' and job.receipt.get('issued') is True
            and (docker_confirmation_required(job) or legacy_inventory_error),
            'artifact-reconciliation-ineligible',409)
    require('docker' not in job.plan or job.plan['docker']==evidence,
            'artifact-local-changed',409)
    require(values.get('PROJECT_VERSION')==tag and identity(project,values,job.forge)==job.plan['signature']
            and (job.forge!='GITLAB' or values.get('REMOTE_GITLAB_REGISTRY','')==job.plan.get('registry','')),
            'artifact-forge-config-changed',409)
    observed=docker_inventory(project,values,tag=tag).get('local')
    require(observed and observed[1]['image_id']==image_id,'artifact-local-changed',409)
    try:
        with remote(project,values,job.forge) as (_,base,_,_,owner,repo,token,github_public):
            registry=docker_registry(base,job.forge,github_public,values)
            labels=tuple(dict.fromkeys([tag,'latest']))
            if gitlab_first_tag_failed(job):
                references = confirm_gitlab_registry(
                    base, registry, (owner + '/' + repo).lower(), owner.rsplit('/', 1)[-1], token, labels, image_id,
                    allow_missing_version=True,
                )
            else:
                with registry_login(registry,owner,token) as (args,_):
                    references = confirm_forge_docker(args,base,registry,owner,repo,job.forge,token,labels,image_id)
    except (httpx.HTTPError,OSError,subprocess.SubprocessError) as error:
        raise Refused('artifact-forge-publication-unconfirmed',409,
                      details={'phase':'registry-confirmation'}) from error
    if references is None:
        result = {
            **job.receipt, 'previous': {'state': job.state, **job.receipt},
            'error': 'artifact-forge-version-unpublished', 'reconciliation': evidence,
            'details': {'phase': 'registry-confirmation', 'tag': tag, 'reason': 'manifest-missing'},
        }
        job.receipt, job.state = result, 'FAILED'
        job.save(update_fields=['state', 'receipt'])
        from .notifications import artifact_notification
        artifact_notification('manual-publication:'+job.pk,job.project,job.forge,job.state,result,['docker'])
        return public(job)
    progress=job.receipt.get('progress')
    confirmed_at=timezone.now().isoformat()
    if progress:
        progress={**progress,'steps':[
            {'key':'docker-confirm','state':'COMPLETED','at':confirmed_at} if step['key']=='docker-confirm' else
            {'key':'docker-retention','state':'SKIPPED'} if step['key']=='docker-retention' else step
            for step in progress['steps']]}
    job.receipt={'issued':True,'previous':{'state':job.state,**job.receipt},
                 'reconciliation':evidence,
                 **({'progress':progress} if progress else {}),
                 'details':{'phase':'registry-confirmation','publication_confirmed':True,
                            'cleanup_performed':False}}
    job.state='COMPLETED'
    job.save(update_fields=['state','receipt'])
    from .notifications import artifact_notification
    artifact_notification('manual-publication:'+job.pk,job.project,job.forge,job.state,job.receipt,['docker'])
    return public(job)


def reconciliation_due(job,now):
    docker=job.plan.get('docker')
    if not isinstance(docker,dict) or not docker_confirmation_required(job):
        return False
    tag,image_id=docker.get('tag'),docker.get('image_id')
    if not (isinstance(tag,str) and TAG.fullmatch(tag) and isinstance(image_id,str) and DIGEST.fullmatch(image_id)):
        return False
    previous=job.receipt.get('automatic_reconciliation') or {}
    attempts=previous.get('attempts',0)
    if attempts>=len(RECONCILIATION_DELAYS):
        return False
    at=parse_datetime(previous['at']) if attempts else None
    return at is None or now>=at+timedelta(seconds=RECONCILIATION_DELAYS[attempts])


def attempt_reconciliation(key):
    with transaction.atomic():
        job=ProjectForgeArtifactPublication.objects.select_for_update().get(pk=key)
        now=timezone.now()
        if not reconciliation_due(job,now):
            return
        previous=job.receipt.get('automatic_reconciliation') or {}
        attempt={'attempts':previous.get('attempts',0)+1,'at':now.isoformat()}
        job.receipt={**job.receipt,'automatic_reconciliation':attempt}
        job.save(update_fields=['receipt'])
    docker=job.plan['docker']
    try:
        reconcile_docker(job.project,job.pk,docker['tag'],docker['image_id'])
    except Refused as error:
        with transaction.atomic():
            current=ProjectForgeArtifactPublication.objects.select_for_update().filter(pk=key,state='UNKNOWN').first()
            if current:
                current.receipt={**current.receipt,'automatic_reconciliation':{**attempt,'error':error.code}}
                current.save(update_fields=['receipt'])


def launch_reconciliation(key):
    if not _reconciliation_lock.acquire(blocking=False):
        return

    def run():
        close_old_connections()
        try:
            attempt_reconciliation(key)
        finally:
            close_old_connections()
            _reconciliation_lock.release()

    try:
        threading.Thread(target=run,name='cab-verify-forge-publication',daemon=True).start()
    except RuntimeError:
        _reconciliation_lock.release()


def release_forgejo(project,values,plan,mark,progress=None):
    publish(project,values,'FORGEJO',plan,mark,progress)


def release_github(project,values,plan,mark,progress=None):
    publish(project,values,'GITHUB',plan,mark,progress)


def release_gitlab(project,values,plan,mark,progress=None):
    publish(project,values,'GITLAB',plan,mark,progress)


def publish(project,values,forge,plan,mark,progress=None):
    debian_policy = artifact_retention(values.get(DEBIAN_RETENTION,'')) if plan.get('debian') else None
    with ExitStack() as stack:
        with track(progress,'connection'):
            client,base,api,root,owner,repo,token,public_github=stack.enter_context(remote(project,values,forge))
        if plan.get('debian'):
            release_debian(project,client,base,root,forge,public_github,plan['debian'],mark,progress,policy=debian_policy)
        if plan.get('docker'):
            release_docker(client,base,api,root,forge,owner,repo,token,public_github,values,plan['docker'],mark,progress)


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
    require_available(project)
    require_artifact_delivery_available(project,'artifact-build-active')
    values=project.public_metadata.get('values',{})
    kinds=[kind for kind in PUBLICATION_STEPS if enabled(values,kind)]
    job=ProjectForgeArtifactPublication.objects.create(pk=request_id,project=project,forge=forge,
          plan={'signature':identity(project,values,forge),'kinds':kinds,
                **({'registry':values.get('REMOTE_GITLAB_REGISTRY','')} if forge=='GITLAB' else {})},
          receipt={'progress':PublicationProgress(kinds).snapshot()})
    return public(job)


@transaction.atomic
def finish_manual(job,state,result):
    from .notifications import artifact_notification
    changed=ProjectForgeArtifactPublication.objects.filter(pk=job.pk,state='RUNNING').update(
        state=state,receipt=result)
    if changed:
        artifact_notification('manual-publication:'+job.pk,job.project,job.forge,state,result)


def worker(key):
    close_old_connections()
    job=ProjectForgeArtifactPublication.objects.select_related('project').get(pk=key)
    project=job.project
    values=project.public_metadata.get('values',{})
    issued=False
    def save(progress):
        ProjectForgeArtifactPublication.objects.filter(pk=key,state='RUNNING').update(
            receipt={'issued':issued,'progress':progress})

    kinds=job.plan.get('kinds',[kind for kind in PUBLICATION_STEPS if enabled(values,kind)])
    progress=PublicationProgress(kinds,save)

    def mark():
        nonlocal issued
        if not issued:
            issued=True
            save(progress.snapshot())

    try:
        with progress.step('configuration'):
            require(identity(project,values,job.forge)==job.plan['signature']
                    and (job.forge!='GITLAB' or values.get('REMOTE_GITLAB_REGISTRY','')==job.plan.get('registry','')),
                    'artifact-forge-config-changed',409)
            if 'kinds' in job.plan:
                missing=missing_configuration(project,values,job.forge)
                require(not missing,'artifact-forge-unconfigured',409,
                        details={'phase':'configuration','missing':missing})
        with progress.step('inventory'):
            plan={kind:artifact for kind,artifact in local_plan(project,values).items() if kind in kinds}
            if not plan and 'docker' in kinds and (tag:=values.get('PROJECT_VERSION')):
                name=values.get('PROJECT_ID') or project.identifier or ''
                observed=docker_inventory(project,values)
                if observed and DOCKER_NAME.fullmatch(name) and TAG.fullmatch(tag):
                    raise Refused('artifact-local-docker-version-missing',
                                  details={'phase':'inventory','tag':name+':'+tag})
            require(plan,'artifact-local-missing',409,details={'phase':'inventory'})
            if 'docker' in plan:
                ProjectForgeArtifactPublication.objects.filter(pk=key,state='RUNNING').update(
                    plan={**job.plan,'docker':plan['docker']})
            progress.skip_missing(plan)
        if 'docker' in plan and job.forge=='GITLAB' and not REGISTRY.fullmatch(values.get('REMOTE_GITLAB_REGISTRY','')):
            with progress.step('docker-prepare'):
                raise Refused('artifact-forge-registry-invalid',409,details={'phase':'registry-configuration'})
        PUBLISHERS[job.forge](project,values,plan,mark,progress)
    except PUBLICATION_ERRORS as error:
        state='UNKNOWN' if issued else 'FAILED'
        code,details=diagnostic(error)
        result={'error':code,'issued':issued,**({'details':details} if details else {})}
    else:
        state,result='COMPLETED',{'issued':issued}
    finish_manual(job,state,{**result,'progress':progress.snapshot()})
    if issued or state=='COMPLETED':
        try:
            refresh_one(project.pk,job.forge,wait=True,automatic=False)
        except (OSError,Refused):
            logger.warning('Observation distante indisponible après publication',extra={'project_id':project.pk})
    close_old_connections()


def launch(job):
    try:
        threading.Thread(target=worker,args=(job.pk,),name='cab-forge-artifacts',daemon=True).start()
    except RuntimeError:
        error='artifact-forge-publication-failed'
        progress=PublicationProgress(job.plan.get('kinds',[]))
        progress.set('configuration','FAILED',error=error,at=timezone.now().isoformat())
        finish_manual(job,'FAILED',{'error':error,'issued':False,'progress':progress.snapshot()})


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
        result={**running.receipt,'error':'artifact-forge-publication-unconfirmed'}
        progress=result.get('progress')
        if progress:
            result['progress']={**progress,'steps':[
                {**step,'state':'UNKNOWN','error':result['error'],'at':timezone.now().isoformat()}
                if step['state']=='RUNNING' else step for step in progress['steps']]}
        finish_manual(running,'UNKNOWN',result)
    if not _reconciliation_lock.locked():
        now=timezone.now()
        candidates=ProjectForgeArtifactPublication.objects.filter(
            state='UNKNOWN',plan__docker__isnull=False,receipt__issued=True).order_by('created')
        candidate=next((item for item in candidates.iterator() if reconciliation_due(item,now)),None)
        if candidate:
            transaction.on_commit(lambda:launch_reconciliation(candidate.pk))
    job=ProjectForgeArtifactPublication.objects.select_for_update().filter(state='PENDING').order_by('created').first()
    if not job:
        return
    job.state,job.executor='RUNNING',process_identity(os.getpid())
    job.save(update_fields=['state','executor'])
    transaction.on_commit(lambda: launch(job))
