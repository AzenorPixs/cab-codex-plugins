"""Réparer une preuve de publication par le paquet réel, reçus initiaux intacts."""
import hashlib
import re
from urllib.parse import urljoin,urlsplit,quote


class ProofError(ValueError):pass


def require(value,code):
    if not value:raise ProofError(code)


def selected_package(packages,version):
    rows=[p for p in packages if p.get('version')==version]
    require(len(rows)==1,'publication-single-package-required')
    value=rows[0]
    require(re.fullmatch('[a-f0-9]{64}',value.get('sha256','')) and isinstance(value.get('size'),int),'publication-package-invalid')
    return value


def checked_asset(package,asset,download):
    require(asset.get('name')==package['name'] and asset.get('state','uploaded')=='uploaded','publication-asset-missing')
    require(asset.get('size')==package['size'],'publication-asset-size-divergent')
    digest=asset.get('digest')
    actual=digest.removeprefix('sha256:') if isinstance(digest,str) and digest.startswith('sha256:') else download(asset,package['size'])
    require(actual==package['sha256'],'publication-asset-digest-divergent')
    return actual


def download_asset(client,base,forge,asset,size):
    import httpx
    url=asset.get('browser_download_url') or asset.get('url')
    require(isinstance(url,str),'publication-asset-url-invalid')
    url=urljoin(base+'/',url);origin=urlsplit(base)
    for _ in range(4):
        target=urlsplit(url)
        same=(target.scheme,target.netloc)==(origin.scheme,origin.netloc)
        public=forge=='GITHUB' and target.scheme=='https' and target.hostname=='release-assets.githubusercontent.com'
        require((same or public) and not target.username and not target.password,'publication-asset-origin-invalid')
        # Un jeton de forge n'est jamais transmis au stockage public redirigé.
        external=httpx.Client(timeout=60,trust_env=False) if public else None
        transport=external or client
        try:
            with transport.stream('GET',url,headers={'Accept':'application/octet-stream'}) as response:
                if response.status_code in (301,302,303,307,308):
                    location=response.headers.get('location');require(bool(location),'publication-asset-redirect-invalid')
                    url=urljoin(url,location);continue
                require(response.status_code==200,'publication-asset-download-failed')
                total=0;checksum=hashlib.sha256()
                for chunk in response.iter_bytes():
                    total+=len(chunk);require(total<=size,'publication-asset-size-divergent');checksum.update(chunk)
                require(total==size,'publication-asset-size-divergent')
                return checksum.hexdigest()
        finally:
            if external:external.close()
    raise ProofError('publication-asset-redirect-limit')


def verified_package(delivery,*,before_retire=False):
    from cab_platform.forge_publish_artifacts import local_plan,remote,existing,release_assets
    from cab_platform.project_metadata import read_metadata
    require(delivery.state in (('RUNNING','COMPLETED') if before_retire else ('COMPLETED',)) and delivery.plan.get('debian') and not delivery.plan.get('defer_releases'),'publication-completed-debian-required')
    steps=delivery.steps.exclude(key__in=['retire','verify:package']) if before_retire else delivery.steps
    require(not steps.exclude(state__in=['COMPLETED','SKIPPED']).exists(),'publication-steps-incomplete')
    values=read_metadata(delivery.project.root,project=delivery.project)['values']
    package=selected_package(local_plan(delivery.project,values,version=delivery.version).get('debian',[]),delivery.version)
    verified=[]
    for target in delivery.plan['forges']:
        forge=target['name'];step=delivery.steps.get(key='release:'+forge)
        require(step.state=='COMPLETED' and step.receipt.get('executed') is True,'publication-not-executed')
        with remote(delivery.project,values,forge) as (client,base,api,root,owner,repo,token,public):
            endpoint=root+'/releases'+('/' if forge=='GITLAB' else '/tags/')+quote(delivery.version,safe='')
            release=existing(client,endpoint)
            require(release and release.get('tag_name')==delivery.version and not release.get('draft'),'publication-release-invalid')
            asset=next((a for a in release_assets(release,forge) if a.get('name')==package['name']),None)
            require(asset is not None,'publication-asset-missing')
            sha=checked_asset(package,asset,lambda item,size:download_asset(client,base,forge,item,size))
            verified.append({'forge':forge,'filename':package['name'],'sha256':sha})
    require(bool(verified),'publication-forge-required')
    return package,verified


def repair(actor,data):
    import os
    from django.db import transaction
    from cab_platform.core import commands as c
    from cab_platform.core.models import GitDelivery,Event,EvidenceProducer,FinalizationPlan
    from cab_platform.core.run_evidence import attest,identity
    require(os.geteuid()==0 and actor.active and actor.uid==0 and actor.role=='admin','publication-local-administrator-required')
    require(set(data)=={'project_id','run_id','delivery_id','request_id','authorization'},'publication-repair-fields-invalid')
    require(isinstance(data['authorization'],str) and len(data['authorization'])>=20,'publication-repair-authorization-required')
    key=c.identifier(data['request_id']);fingerprint=c.digest(data)
    row=GitDelivery.objects.select_related('run__project','project').get(pk=data['delivery_id'],project_id=data['project_id'],run__run_id=data['run_id'])
    c.scope(actor,row.project)
    prior=Event.objects.filter(run=row.run,kind='publication-package-proof-corrected',data__request_id=key).first()
    if prior:require(prior.data['fingerprint']==fingerprint,'publication-proof-request-conflict');return prior.data['receipt']
    require(c.revision(row.run)==row.plan['source_revision'],'publication-proof-source-stale')
    package,forges=verified_package(row)
    producer=EvidenceProducer.objects.select_related('actor').get(pk=row.plan['evidence_producer'],project=row.project,active=True,actor__active=True,actor__uid=0,actor__role='collector')
    rules=FinalizationPlan.objects.get(run=row.run).policy['requirements'];proofs=[]
    with transaction.atomic():
        for rule in rules:
            if rule['producer']!=producer.pk or rule['kind']!='publication':continue
            proof=attest(producer.actor,{**identity(row.run),'producer_id':producer.pk,'evidence_id':c.digest(['delivery-package',row.pk,rule['id'],package['sha256']]),'rule_id':rule['id'],'kind':'publication','result':'passed','source_revision':row.plan['source_revision'],'artifact_sha256':package['sha256'],'reference':'cab-delivery-'+str(row.pk)})
            proofs.append(proof)
        require(bool(proofs),'publication-producer-rule-missing')
        receipt={'delivery_id':row.pk,'version':row.version,'package_sha256':package['sha256'],'forges':forges,'proofs':proofs,'original_proofs_preserved':True}
        c.event(row.run,'publication-package-proof-corrected',{'request_id':key,'fingerprint':fingerprint,'authority':actor.pk,'authorization':data['authorization'],'receipt':receipt})
    return receipt
