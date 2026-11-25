"""Artefacts attestés par les releases et registres des forges."""
from itertools import count
import hashlib
import json
import re
from urllib.parse import quote

import httpx
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from .core.models import Project, ProjectForgeArtifact
from .project_artifacts import FLAGS, enabled
from .versioning import historical_version

TAG = re.compile(r'[A-Za-z0-9_][A-Za-z0-9_.+-]{0,127}')
DEB = re.compile(r'[A-Za-z0-9][A-Za-z0-9_.+~:\-]{0,247}\.deb')
PAGE_SIZE = 20
PAGES = 3


def source(values, forge):
    return [values.get(f'REMOTE_{forge}_{key}', '') for key in ('BASE_URL', 'OWNER', 'REPOSITORY')]


def pages(client, read, endpoint, forge, *, exhaustive=False, **query):
    previous=None
    for number in count(1) if exhaustive else range(1, PAGES + 1):
        result, _ = read(client, endpoint, params={**query, 'page':number,
                                                   'limit' if forge=='FORGEJO' else 'per_page':PAGE_SIZE})
        if not isinstance(result,list) or (exhaustive and (
                result==previous or any(not isinstance(item,dict) for item in result))):
            raise ValueError('forge-artifact-response-invalid')
        yield from (item for item in result if isinstance(item,dict))
        if len(result)<PAGE_SIZE:
            break
        previous=result


def publication_date(value):
    try:
        date=parse_datetime(value) if isinstance(value,str) else None
    except ValueError:
        return None
    return date if date and timezone.is_aware(date) else None


def upload_key(root,tag,asset):
    url=asset.get('url')
    if isinstance(url,str) and url and type(asset.get('id')) is int:
        return hashlib.sha256(json.dumps([root,tag,asset['id'],asset['name'],url]).encode()).hexdigest()
    return None


@transaction.atomic
def remember_gitlab_debian(project,root,tag,asset):
    key=upload_key(root,tag,asset)
    if key is None:
        return
    current=Project.objects.select_for_update().get(pk=project.pk)
    configuration=dict(current.configuration or {})
    dates=dict(configuration.get('gitlab_debian_publications') or {})
    dates[key]=timezone.now().isoformat()
    configuration['gitlab_debian_publications']=dates
    current.configuration=configuration
    current.save(update_fields=['configuration'])


def chronology(items,candidates):
    complete=all(date is not None for date,_ in candidates)
    latest=None
    if complete and candidates:
        date,item=max(candidates,key=lambda entry:(entry[0],entry[1]['name'],entry[1]['tags'][0]))
        latest={**item,'published_at':date.isoformat()}
    return {'available':True,'items':items,'latest':latest,
            **({} if complete else {'chronology_unverified':True})}


def debian(client, read, root, forge, known=None):
    items,candidates=[],[]
    now=timezone.now()
    for release in pages(client,read,root+'/releases',forge,exhaustive=True):
        tag=release.get('tag_name')
        if release.get('draft') or release.get('upcoming_release') or not isinstance(tag,str) or not TAG.fullmatch(tag):
            continue
        released=publication_date(release.get('released_at' if forge=='GITLAB' else 'published_at'))
        if released and released>now:
            continue
        assets=release.get('assets')
        if forge=='GITLAB':
            assets=assets.get('links') if isinstance(assets,dict) else None
        if not isinstance(assets,list):
            continue
        files=set()
        for asset in assets:
            name=asset.get('name') if isinstance(asset,dict) else None
            if not isinstance(name,str) or not DEB.fullmatch(name) or asset.get('state','uploaded')!='uploaded':
                continue
            files.add(name)
            raw=asset.get('published_at') or asset.get('created_at')
            if forge=='GITLAB' and not raw:
                raw=(known or {}).get(upload_key(root,tag,asset))
            uploaded=publication_date(raw)
            date=max(released or uploaded,uploaded) if uploaded and uploaded<=now else None
            candidates.append((date,{'name':name,'tags':[tag]}))
        if files and not items:
            items=[{'name':name,'tags':[tag]} for name in sorted(files)]
    return chronology(items,candidates)

def tag_rank(tag):
    try:
        return (2,tuple(map(int,historical_version(tag).split('.'))),tag)
    except ValueError:
        return (0 if tag=='latest' else 1,(),tag)


def docker_versions(client,read,root,api,forge,owner,repo,info,*,exhaustive=False):
    if forge=='GITLAB':
        endpoint=root+'/registry/repositories'
        candidate=next((item for item in pages(client,read,endpoint,forge,exhaustive=exhaustive)
                        if item.get('path')==owner+'/'+repo),None)
        if candidate is None:
            return None,()
        registry=candidate.get('id')
        if type(registry) is not int or registry<1:
            raise ValueError('forge-registry-id-invalid')
        endpoint=f'{endpoint}/{registry}/tags'
        return endpoint,pages(client,read,endpoint,forge,exhaustive=exhaustive)
    if forge=='FORGEJO':
        endpoint=api+'/packages/'+quote(owner,safe='')
        rows=(item for item in pages(client,read,endpoint,forge,exhaustive=exhaustive,type='container',q=repo)
              if item.get('type')=='container' and isinstance(item.get('name'),str)
              and item['name'].casefold()==repo.casefold())
        return endpoint+'/container/'+quote(repo.lower(),safe=''),rows
    account=info.get('owner')
    namespace='orgs/'+quote(owner,safe='') if isinstance(account,dict) and account.get('type')=='Organization' else 'users/'+quote(owner,safe='')
    if namespace.startswith('users/'):
        try:
            authenticated,_=read(client,api+'/user')
        except httpx.HTTPStatusError as error:
            if error.response.status_code not in (401,403,404):
                raise
        else:
            login=authenticated.get('login') if isinstance(authenticated,dict) else None
            if isinstance(login,str) and login.casefold()==owner.casefold():
                # Le chemin /users/{owner} expose les paquets publics.
                namespace='user'
    endpoint=f'{api}/{namespace}/packages/container/{quote(repo.lower(),safe="")}/versions'
    return endpoint,pages(client,read,endpoint,forge,exhaustive=exhaustive)


def github_version_tags(version):
    metadata=version.get('metadata')
    container=metadata.get('container') if isinstance(metadata,dict) else None
    tags=container.get('tags') if isinstance(container,dict) else None
    return tags if isinstance(tags,list) else None


GITLAB_TAG_DATES = """query TagDates($id: ContainerRepositoryID!, $after: String) {
  containerRepository(id: $id) {
    tags(first: 100, after: $after) {
      nodes { name digest publishedAt }
      pageInfo { hasNextPage endCursor }
    }
  }
}"""


def gitlab_tag_dates(client,read,api,endpoint):
    token=client.headers.get('private-token')
    headers={'Authorization':'Bearer '+token} if token else None
    identifier='gid://gitlab/ContainerRepository/'+endpoint.rsplit('/',2)[-2]
    cursor=None
    seen=set()
    dates={}
    while True:
        envelope,_=read(client,api.removesuffix('/v4')+'/graphql',method='POST',headers=headers,
                        json={'query':GITLAB_TAG_DATES,'variables':{'id':identifier,'after':cursor}})
        if envelope.get('errors'):
            raise ValueError('gitlab-registry-publication-dates-unavailable')
        tags=envelope['data']['containerRepository']['tags']
        for row in tags['nodes']:
            if row['name'] in dates:
                raise ValueError('gitlab-registry-publication-changed')
            dates[row['name']]=row
        info=tags['pageInfo']
        if not info['hasNextPage']:
            return dates
        cursor=info.get('endCursor')
        if not isinstance(cursor,str) or not cursor or cursor in seen:
            raise ValueError('gitlab-registry-pagination-invalid')
        seen.add(cursor)


def forgejo_manifest(client, read, endpoint, tag):
    try:
        files, _ = read(client, endpoint + '/' + quote(tag, safe='') + '/files')
        hashes = [item.get('sha256') for item in files if item.get('name') == 'manifest.json']
        if len(hashes) == 1 and isinstance(hashes[0], str) and re.fullmatch(r'[a-f0-9]{64}', hashes[0]):
            return hashes[0]
    except (httpx.HTTPError, ValueError, AttributeError, TypeError):
        pass
    return None


def docker(client, read, root, api, forge, owner, repo, info):
    endpoint, rows = docker_versions(client, read, root, api, forge, owner, repo, info, exhaustive=True)
    dated = []
    historical = set()
    for row in rows:
        if forge == 'GITHUB':
            tags = github_version_tags(row) or []
        else:
            tags = [row.get('version' if forge == 'FORGEJO' else 'name')]
        tags = sorted({tag for tag in tags if isinstance(tag, str) and TAG.fullmatch(tag)}, key=tag_rank, reverse=True)
        if not tags:
            continue
        historical.update(tags)
        date = publication_date(row.get('published_at') or (None if forge == 'GITLAB' else row.get('created_at')))
        dated.append((date, tags))
    dates = {}
    if forge == 'GITLAB' and historical:
        try:
            dates = gitlab_tag_dates(client, read, api, endpoint)
        except (httpx.HTTPError, ValueError, KeyError, TypeError, AttributeError):
            pass
        if {tag for tag in dates if TAG.fullmatch(tag)} != historical:
            dates = {}
        dated = [(date or publication_date(dates.get(tags[0], {}).get('publishedAt')), tags) for date, tags in dated]
    tags = sorted(historical, key=tag_rank, reverse=True)
    items = [{'name': repo, 'tags': tags[:8]}] if tags else []
    now = timezone.now()
    result = chronology(items, [(date if date and date <= now else None, {'name': repo, 'tags': tags})
                                for date, tags in dated])
    latest = result['latest']
    if latest is None:
        if 'latest' not in historical:
            return result
        groups = [labels for _, labels in dated if 'latest' in labels]
        latest = result['latest'] = {'name': repo, 'tags': groups[0] if len(groups) == 1 else ['latest']}
    tag = latest['tags'][0]
    if forge == 'GITLAB':
        digest = dates.get(tag, {}).get('digest')
        if isinstance(digest, str) and re.fullmatch(r'sha256:[a-f0-9]{64}', digest):
            latest['tags'] = [name for name in tags if dates[name].get('digest') == digest]
    elif forge == 'FORGEJO' and 'latest' in historical:
        reference = forgejo_manifest(client, read, endpoint, tag)
        if reference:
            candidates = (name for name in tags if name != 'latest') if tag == 'latest' else ('latest',)
            alias = next((name for name in candidates if forgejo_manifest(client, read, endpoint, name) == reference), None)
            if alias:
                latest['tags'] = sorted((tag, alias), key=tag_rank, reverse=True)
    return result


def observe(client,read,values,root,api,forge,owner,repo,info,*,known_debian=None):
    result={}
    for kind in FLAGS:
        if not enabled(values,kind):
            continue
        try:
            result[kind]=debian(client,read,root,forge,known_debian) if kind=='debian' else docker(client,read,root,api,forge,owner,repo,info)
        except (httpx.HTTPError, ValueError, KeyError, TypeError):
            result[kind]={'available':False}
    return result


def merge(previous,values,observed):
    result={}
    for kind in FLAGS:
        if not enabled(values,kind):
            continue
        current=observed.get(kind,{})
        if current.get('available') is True:
            result[kind]=current
        else:
            result[kind]={**previous.get(kind,{'items':[]}),'available':False}
    return result


def persist(project,values,forge,observed):
    endpoint=source(values,forge)
    snapshot=ProjectForgeArtifact.objects.filter(project=project,forge=forge).first()
    known=snapshot.artifacts if snapshot and snapshot.source==endpoint else {}
    updated=merge(known,values,observed)
    if not updated:
        if snapshot:
            snapshot.delete()
    elif snapshot is None:
        ProjectForgeArtifact.objects.create(project=project,forge=forge,source=endpoint,artifacts=updated)
    elif snapshot.source!=endpoint or snapshot.artifacts!=updated:
        snapshot.source,snapshot.artifacts=endpoint,updated
        snapshot.save(update_fields=['source','artifacts'])
