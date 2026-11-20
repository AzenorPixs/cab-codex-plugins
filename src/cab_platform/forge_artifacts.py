"""Artefacts attestés par les releases et registres des forges."""
import re
from urllib.parse import quote

import httpx
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from .core.models import ProjectForgeArtifact
from .project_artifacts import FLAGS, enabled
from .versioning import historical_version

TAG = re.compile(r'[A-Za-z0-9_][A-Za-z0-9_.+-]{0,127}')
DEB = re.compile(r'[A-Za-z0-9][A-Za-z0-9_.+~:\-]{0,247}\.deb')
PAGE_SIZE = 20
PAGES = 3


def source(values, forge):
    return [values.get(f'REMOTE_{forge}_{key}', '') for key in ('BASE_URL', 'OWNER', 'REPOSITORY')]


def pages(client, read, endpoint, forge, **query):
    for number in range(1, PAGES + 1):
        result, _ = read(client, endpoint, params={**query, 'page':number,
                                                   'limit' if forge=='FORGEJO' else 'per_page':PAGE_SIZE})
        if not isinstance(result,list):
            raise ValueError('forge-artifact-response-invalid')
        yield from (item for item in result if isinstance(item,dict))
        if len(result)<PAGE_SIZE:
            break


def debian(client, read, root, forge):
    for release in pages(client,read,root+'/releases',forge):
        tag=release.get('tag_name')
        if release.get('draft') or release.get('upcoming_release') or not isinstance(tag,str) or not TAG.fullmatch(tag):
            continue
        if forge=='GITLAB' and isinstance(release.get('released_at'),str):
            released=parse_datetime(release['released_at'])
            if released and timezone.is_aware(released) and released>timezone.now():
                continue
        assets=release.get('assets')
        if forge=='GITLAB':
            assets=assets.get('links') if isinstance(assets,dict) else None
        if not isinstance(assets,list):
            continue
        files={item['name'] for item in assets if isinstance(item,dict)
               and isinstance(item.get('name'),str) and DEB.fullmatch(item['name'])
               and item.get('state','uploaded')=='uploaded'}
        if files:
            return [{'name':name,'tags':[tag]} for name in sorted(files)]
    return []


def tag_rank(tag):
    try:
        return (2,tuple(map(int,historical_version(tag).split('.'))),tag)
    except ValueError:
        return (0 if tag=='latest' else 1,(),tag)


def docker(client,read,root,api,forge,owner,repo,info):
    if forge=='GITLAB':
        endpoint=root+'/registry/repositories'
        candidate=next((item for item in pages(client,read,endpoint,forge)
                        if item.get('path')==owner+'/'+repo),None)
        if candidate is None:
            return []
        registry=candidate.get('id')
        if type(registry) is not int or registry<1:
            raise ValueError('forge-registry-id-invalid')
        tags=(item.get('name') for item in pages(client,read,f'{endpoint}/{registry}/tags',forge))
    elif forge=='FORGEJO':
        endpoint=api+'/packages/'+quote(owner,safe='')
        tags=(item.get('version') for item in pages(client,read,endpoint,forge,type='container',q=repo)
              if item.get('type')=='container' and isinstance(item.get('name'),str)
              and item['name'].casefold()==repo.casefold())
    else:
        account=info.get('owner')
        namespace='orgs' if isinstance(account,dict) and account.get('type')=='Organization' else 'users'
        endpoint=f'{api}/{namespace}/{quote(owner,safe="")}/packages/container/{quote(repo.lower(),safe="")}/versions'
        def github_tags():
            for version in pages(client,read,endpoint,forge):
                metadata=version.get('metadata')
                container=metadata.get('container') if isinstance(metadata,dict) else None
                values=container.get('tags') if isinstance(container,dict) else None
                if isinstance(values,list):
                    yield from values
        tags=github_tags()
    confirmed=sorted({tag for tag in tags if isinstance(tag,str) and TAG.fullmatch(tag)},key=tag_rank,reverse=True)
    return [{'name':repo,'tags':confirmed[:8]}] if confirmed else []


def observe(client,read,values,root,api,forge,owner,repo,info):
    result={}
    for kind in FLAGS:
        if not enabled(values,kind):
            continue
        try:
            items=debian(client,read,root,forge) if kind=='debian' else docker(client,read,root,api,forge,owner,repo,info)
            result[kind]={'available':True,'items':items}
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
            result[kind]={'available':False,'items':previous.get(kind,{}).get('items',[])}
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
