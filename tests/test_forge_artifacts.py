"""Contrôle des observations et publications sans contacter de forge réelle."""
import json
from datetime import datetime, timedelta, timezone
from contextlib import nullcontext
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from django.conf import settings
if not settings.configured:
    settings.configure(SECRET_KEY='fixture',INSTALLED_APPS=['cab_platform.core'],
                       DATABASES={'default':{'ENGINE':'django.db.backends.dummy'}},USE_TZ=True)
import django
django.setup()

import hashlib
import httpx
from cab_platform.forge_artifacts import observe, merge, upload_key
from cab_platform.forge_repository import get_json
from cab_platform import forge_publish_artifacts
from cab_platform import project_artifacts
from cab_platform.project_metadata import DEBIAN_RETENTION, DOCKER_RETENTION, artifact_retention, public_value
from cab_platform.core.models import ProjectForgeArtifactPublication
from cab_platform.core.commands import Refused
from cab_platform.forge_publish_artifacts import release_debian, release_docker


class ForgeArtifactsTests(unittest.TestCase):
    def test_factory_refusal_names_the_uncertain_publication(self):
        project=object()
        created=datetime(2026,11,24,10,1,tzinfo=timezone.utc)
        blocker=SimpleNamespace(pk='old-publication',forge='GITHUB',state='UNKNOWN',created=created)
        with patch.object(project_artifacts.ProjectArtifactBuild,'objects') as builds, \
             patch.object(ProjectForgeArtifactPublication,'objects') as publications:
            builds.filter.return_value.first.return_value=None
            publications.filter.return_value.first.return_value=blocker
            with self.assertRaisesRegex(Refused,'artifact-build-active') as stopped:
                project_artifacts.require_available(project)
        self.assertEqual(stopped.exception.details,{
            'phase':'request','steps':['request'],'process_started':False,
            'blocking_operation':{'id':'old-publication','source':'publication','state':'UNKNOWN',
                                  'created':created.isoformat(),'forge':'GITHUB'},
        })

    def test_worker_launch_failure_is_terminal_before_any_artifact_effect(self):
        job=SimpleNamespace(pk='publication',plan={'kinds':['docker']})
        with patch.object(project_artifacts.ProjectArtifactBuild,'objects') as builds, \
             patch.object(forge_publish_artifacts,'finish_manual') as finish, \
             patch.object(project_artifacts.threading.Thread,'start',side_effect=RuntimeError):
            project_artifacts.launch('build')
            forge_publish_artifacts.launch(job)
        build=builds.filter.return_value.update.call_args.kwargs
        self.assertEqual(build['state'],'FAILED')
        self.assertIs(build['receipt']['process_started'],False)
        actual,state,receipt=finish.call_args.args
        self.assertIs(actual,job)
        self.assertEqual(state,'FAILED')
        self.assertIs(receipt['issued'],False)
        self.assertEqual(receipt['progress']['steps'][0]['state'],'FAILED')

    def test_existing_latest_without_project_version_reports_missing_docker_tag(self):
        project=SimpleNamespace(identifier='pfd',public_metadata={'values':{'PROJECT_DOCKERED':'Yes','PROJECT_VERSION':'1.0.2'}})
        job=SimpleNamespace(project=project,forge='GITHUB',plan={'signature':'configuration'})
        rows=Mock()
        rows.select_related.return_value.get.return_value=job
        with patch.object(forge_publish_artifacts.ProjectForgeArtifactPublication,'objects',rows), \
                patch.object(forge_publish_artifacts,'finish_manual') as finish, \
                patch.object(forge_publish_artifacts,'identity',return_value='configuration'), \
                patch.object(forge_publish_artifacts,'docker_inventory',
                             side_effect=[{}, {'local':(None,{'tags':['pfd:latest']})}]), \
                patch.dict(forge_publish_artifacts.PUBLISHERS,{'GITHUB':Mock()}) as publishers:
            forge_publish_artifacts.worker('fixture')
            publishers['GITHUB'].assert_not_called()
        finished,state,receipt=finish.call_args.args
        self.assertIs(finished,job)
        self.assertEqual(state,'FAILED')
        self.assertEqual(receipt['error'],'artifact-local-docker-version-missing')
        self.assertFalse(receipt['issued'])
        self.assertEqual(receipt['details'],{'phase':'inventory','tag':'pfd:1.0.2'})
        steps=receipt['progress']['steps']
        self.assertEqual([(s['key'],s['state']) for s in steps[:3]],[
            ('configuration','COMPLETED'),('inventory','FAILED'),('connection','PENDING')])
        self.assertEqual(steps[1]['details'],receipt['details'])

    def test_release_and_each_registry_are_independent(self):
        flags={'PROJECT_DEBIAN_PACKAGE':'Yes','PROJECT_DOCKERED':'Yes'}
        for forge, registry, body in [
            ('GITHUB','/users/owner/packages/container/sample/versions',
             [{'metadata':{'container':{'tags':['latest','2.0.0','beta']}}}]),
            ('FORGEJO','/packages/owner',[{'name':'sample','type':'container','version':'2.0.0'}]),
            ('GITLAB','/project/registry/repositories/5/tags',[{'name':'2.0.0'}]),
        ]:
            with self.subTest(forge=forge):
                seen=[]
                def handle(request):
                    path=request.url.path
                    seen.append(path)
                    if path=='/project/releases':
                        assets=[{'name':'other.txt'},{'name':'sample_2.0.0_all.deb'}]
                        return httpx.Response(200,json=[{'draft':True,'tag_name':'9.0.0','assets':assets},
                          {'tag_name':'2.0.0','assets':{'links':assets} if forge=='GITLAB' else assets}])
                    if path=='/project/registry/repositories':
                        return httpx.Response(200,json=[{'path':'owner/sample','id':5}])
                    if path==registry:
                        return httpx.Response(200,json=body)
                    return httpx.Response(404)
                with httpx.Client(transport=httpx.MockTransport(handle)) as client:
                    data=observe(client,get_json,flags,'https://fixture/project','https://fixture',
                                 forge,'owner','sample',{'owner':{'type':'User'}})
                    self.assertEqual(data['debian']['items'],[{'name':'sample_2.0.0_all.deb','tags':['2.0.0']}])
                    self.assertEqual(data['docker']['items'][0]['tags'][0],'2.0.0')
                    seen.clear()
                    self.assertEqual(observe(client,get_json,{},'https://fixture/project','https://fixture',
                                             forge,'owner','sample',{}),{})
                    self.assertEqual(seen,[])

    def test_publication_date_selects_republished_older_version_on_all_forges(self):
        root,api='https://fixture/project','https://fixture/api/v4'
        old,new='2025-12-01T12:00:00+00:00','2026-01-31T12:00:00+00:00'
        flags={'PROJECT_DOCKERED':'Yes','PROJECT_DEBIAN_PACKAGE':'Yes'}
        for forge in ('FORGEJO','GITHUB','GITLAB'):
            with self.subTest(forge=forge):
                assets=[{'id':index,'name':f'sample_{tag}_all.deb','url':f'https://fixture/upload/{tag}'}
                        for index,tag in enumerate(('2.0.0','1.0.0'),1)]
                if forge!='GITLAB':
                    for asset,date in zip(assets,(old,new)):
                        asset['created_at']=date
                known={upload_key(root,tag,asset):date
                       for tag,asset,date in zip(('2.0.0','1.0.0'),assets,(old,new))}
                tags=[('2.0.0',old),('1.0.0',new)]
                docker_tags=tags+[('latest',new)]
                registry_metadata=True
                def manifest(tag):
                    return ('b' if tag=='2.0.0' else 'a')*64
                def response(request):
                    path=request.url.path
                    if path=='/project/releases':
                        return httpx.Response(200,json=[
                            {'tag_name':tag,'published_at':old,'released_at':old,
                             'assets':{'links':[asset]} if forge=='GITLAB' else [asset]}
                            for (tag,_),asset in zip(tags,assets)])
                    if path=='/project/registry/repositories':
                        return httpx.Response(200,json=[{'path':'owner/sample','id':5}])
                    if path.endswith('/graphql'):
                        self.assertEqual(request.method,'POST')
                        page=json.loads(request.read())['variables']['after']
                        observations=docker_tags[1:] if page else docker_tags[:1]
                        return httpx.Response(200,json={'data':{'containerRepository':{'tags':{
                            'nodes':[{'name':tag,'publishedAt':date if registry_metadata else None,
                                      'digest':'sha256:'+manifest(tag) if registry_metadata else None}
                                     for tag,date in observations],
                            'pageInfo':{'hasNextPage':page is None,'endCursor':'suite'}}}}})
                    if path.endswith('/tags'):
                        return httpx.Response(200,json=[{'name':tag} for tag,_ in docker_tags])
                    if path.endswith('/packages/owner'):
                        return httpx.Response(200,json=[{'type':'container','name':'sample','version':tag,'created_at':date}
                                                        for tag,date in docker_tags])
                    if path.endswith('/files'):
                        return httpx.Response(200,json=[{'name':'manifest.json','sha256':manifest(path.split('/')[-2])}])
                    if path.endswith('/versions'):
                        return httpx.Response(200,json=[{'created_at':date,'metadata':{'container':{
                            'tags':[tag,'latest'] if tag=='1.0.0' else [tag]}}} for tag,date in tags])
                    return httpx.Response(404)
                with httpx.Client(transport=httpx.MockTransport(response)) as client:
                    observed=observe(client,get_json,flags,root,api,forge,'owner','sample',{},known_debian=known)
                    self.assertEqual(observed['docker']['latest'],
                                     {'name':'sample','tags':['1.0.0','latest'],'published_at':new})
                    self.assertEqual(observed['debian']['latest'],
                                     {'name':'sample_1.0.0_all.deb','tags':['1.0.0'],'published_at':new})
                    if forge=='GITLAB':
                        registry_metadata=False
                        fallback=observe(client,get_json,flags,root,api,forge,'owner','sample',{},known_debian=known)
                        self.assertTrue(fallback['docker']['chronology_unverified'])
                        self.assertEqual(fallback['docker']['latest'],{'name':'sample','tags':['latest']})
                        assets[1]['url']='https://fixture/another-upload'
                        received=observe(client,get_json,flags,root,api,forge,'owner','sample',{},known_debian=known)
                        self.assertTrue(received['debian']['chronology_unverified'])
                        self.assertIsNone(received['debian']['latest'])

    def test_refresh_failure_keeps_known_rows_only_for_active_kind(self):
        flags={'PROJECT_DEBIAN_PACKAGE':'Yes'}
        old={key:{'items':[{'name':key,'tags':['1.0.0']}]} for key in ('debian','docker')}
        self.assertEqual(merge(old,flags,{'debian':{'available':False}}),
                         {'debian':{'available':False,'items':old['debian']['items']}})
        empty={'available':True,'items':[]}
        self.assertEqual(merge(old,flags,{'debian':empty}),{'debian':empty})

    def verify_debian_retention(self, policy, retained):
        data=b'package fixture'
        name='sample_2.0.0_all.deb'
        with TemporaryDirectory() as directory:
            dist=Path(directory)/'dist';dist.mkdir()
            (dist/name).write_bytes(data)
            plan=[{'name':name,'version':'2.0.0','size':len(data),'sha256':hashlib.sha256(data).hexdigest()}]
            project=SimpleNamespace(root=directory)
            for forge in ('FORGEJO','GITHUB','GITLAB'):
                with self.subTest(forge=forge):
                    marks,requests=[],[]
                    releases={}
                    for index in range(1,10):
                        tag='2.0.0' if index==9 else f'1.0.{index}'
                        recent = (datetime.now(timezone.utc)-timedelta(days=9-index)).isoformat()
                        date = recent if index >= 7 else '2000-01-01T00:00:00Z'
                        releases[tag]={'tag_name':tag,'id':index,'published_at':date,'released_at':date,
                            'upload_url':'https://uploads.github.com/repositories/12/releases/9/assets{?name}',
                            'assets':[{'name':f'sample_{tag}_all.deb','id':index},
                                      {'name':f'another_{tag}_all.deb','id':100+index}]}
                    def payload(release):
                        return {**release,'assets':{'links':release['assets']}} if forge=='GITLAB' else release
                    def handle(request):
                        path=request.url.path
                        requests.append((request.method,path))
                        if request.method=='GET' and '/tags/' in path and '/releases/' not in path:
                            return httpx.Response(200,json={})
                        if request.method=='GET' and path=='/project/releases':
                            return httpx.Response(200,json=[payload(release) for release in releases.values()])
                        if request.method=='GET':
                            return httpx.Response(200,json=payload(releases['2.0.0']))
                        if request.method=='DELETE':
                            asset_id=int(path.rsplit('/',1)[-1])
                            for release in releases.values():
                                release['assets'][:]=[asset for asset in release['assets'] if asset['id']!=asset_id]
                            return httpx.Response(204)
                        if path.endswith('/uploads'):
                            self.assertIn(data,request.read())
                            return httpx.Response(201,json={'url':'/uploads/a121/'+name})
                        if forge=='GITLAB':
                            self.assertEqual(request.method,'PUT')
                            self.assertTrue(path.endswith('/assets/links/9'))
                            body=json.loads(request.read())
                        else:
                            self.assertIn(data,request.read())
                            body={'name':name}
                        assets=releases['2.0.0']['assets']
                        assets[:]=[asset for asset in assets if asset['name']!=name]
                        assets.append({**body,'id':99})
                        return httpx.Response(201,json={'id':1})
                    with httpx.Client(transport=httpx.MockTransport(handle)) as client, \
                         patch.object(forge_publish_artifacts,'remember_gitlab_debian') as remember:
                        release_debian(project,client,'https://fixture','https://fixture/project',
                                       forge,True,plan,lambda:marks.append(True),policy=policy)
                    if forge=='GITLAB':
                        remember.assert_called_once()
                        self.assertEqual(remember.call_args.args[-1]['id'],99)
                    self.assertEqual(len(marks),2+8-len(retained))
                    self.assertEqual(set(releases),{'2.0.0',*(f'1.0.{i}' for i in range(1,9))})
                    self.assertEqual(
                        [tag for tag,release in releases.items()
                         if any(asset['name'].startswith('sample_') for asset in release['assets'])],
                        [*(f'1.0.{i}' for i in retained),'2.0.0'])
                    self.assertTrue(all(any(asset['name'].startswith('another_') for asset in release['assets'])
                                        for release in releases.values()))
                    cleanup=[index for index,(method,path) in enumerate(requests)
                             if method=='DELETE' and not path.endswith('/9')]
                    if policy == (0,None):
                        self.assertNotIn(('GET','/project/releases'),requests)
                        self.assertFalse(cleanup)
                    else:
                        self.assertTrue(cleanup)
                        self.assertTrue(any(method=='GET' and path.endswith('/2.0.0')
                                            for method,path in requests[:cleanup[0]]))
                        self.assertEqual(requests[-1][0],'GET')

    def test_debian_replaces_the_matching_asset_and_retains_configured_versions(self):
        self.verify_debian_retention((7,None),range(3,9))

    def test_debian_default_keeps_all_publications(self):
        self.verify_debian_retention((0,None),range(1,9))

    def test_debian_keeps_recent_publications_with_cumulative_policy(self):
        self.verify_debian_retention((2,365),(7,8))

    def publish_docker_fixture(self,forge,*,failure=None,alias=False,progress=None,
                               github_owner=False,inventory_status=200,token='token-fixture',retention='1',already_published=False):
        calls,marks=[],[]
        old={f'old-{index}' for index in range(68)}
        tags=old|{'2.0.0','latest'}
        image_id='sha256:'+'a'*64
        versions={index:[tag] for index,tag in enumerate(sorted(old),10)}
        versions.update({1:['2.0.0','latest'],2:['beta'] if alias else []})
        endpoint={
            'FORGEJO':'/api/packages/owner',
            'GITHUB':('/api/user' if github_owner else '/api/users/owner')+'/packages/container/sample/versions',
            'GITLAB':'/project/registry/repositories/5/tags',
        }[forge]
        def command(args,**kwargs):
            self.assertNotIn(token,args)
            if 'push' in args:
                tag=args[-1].rsplit(':',1)[-1]
                calls.append(('push',args[-1]))
                if tag==failure:
                    return SimpleNamespace(returncode=1,stderr=b'')
                versions[1].remove(tag)
                versions[2].append(tag)
            if 'inspect' in args:
                calls.append(('inspect',args[-1]))
                ref=args[-1].rsplit(':',1)[-1]
                if not already_published and ref not in versions[2]:
                    return SimpleNamespace(returncode=1,stderr=b'no such manifest')
            return SimpleNamespace(returncode=0,stderr=b'',stdout=json.dumps({'config':{'digest':image_id}}).encode())

        def tag_date(tag):
            if tag in ('old-0','old-1'):
                age = 1 if tag=='old-0' else 2
                return (datetime.now(timezone.utc)-timedelta(days=age)).isoformat()
            return '2000-01-01T00:00:00Z'

        def handle(request):
            path=request.url.path
            if path=='/api/user':
                return httpx.Response(200,json={'login':'Owner' if github_owner else 'Collaborator'})
            if path=='/project/registry/repositories':
                return httpx.Response(200,json=[{'path':'owner/other','id':4},{'path':'owner/sample','id':5}])
            if request.method=='DELETE':
                calls.append(('delete',path))
                key=path.rsplit('/',1)[-1]
                if forge=='GITHUB':
                    del versions[int(key)]
                else:
                    tags.remove(key)
                return httpx.Response(204)
            if forge=='GITLAB' and path.startswith(endpoint+'/'):
                tag=path.rsplit('/',1)[-1]
                return httpx.Response(200,json={'name':tag,'created_at':tag_date(tag)})
            self.assertEqual(path,endpoint)
            if inventory_status!=200:
                return httpx.Response(inventory_status,json={'message':'Inventaire interdit'})
            page=int(request.url.params['page'])
            if forge=='GITHUB':
                rows=[{'id':key,'name':'sha256:'+f'{key:064x}',
                       'created_at':tag_date(labels[0]) if labels else '2000-01-01T00:00:00Z',
                       'metadata':{'container':{'tags':labels}}} for key,labels in sorted(versions.items())]
            elif forge=='FORGEJO':
                rows=[{'name':'sample','type':'container','version':tag,'created_at':tag_date(tag)}
                      for tag in sorted(tags)]
                rows.append({'name':'sample','type':'container','version':'sha256:'+'b'*64})
                rows.append({'name':'other','type':'container','version':'other-tag'})
            else:
                rows=[{'name':tag} for tag in sorted(tags)]
            return httpx.Response(200,json=rows[(page-1)*20:page*20])

        error=None
        with httpx.Client(transport=httpx.MockTransport(handle)) as client, \
             patch('cab_platform.forge_publish_artifacts.existing',
                   side_effect=lambda client,url: get_json(client,url)[0] if '/registry/repositories/5/tags/' in url else {}), \
             patch('cab_platform.forge_publish_artifacts.subprocess.run',side_effect=command):
            try:
                release_docker(client,'https://fixture','https://fixture/api','https://fixture/project',forge,
                               'owner','sample',token,True,{'REMOTE_GITLAB_REGISTRY':'registry.fixture:5050',DOCKER_RETENTION:retention},
                               {'image_id':image_id,'tag':'2.0.0'},lambda:marks.append(True),progress)
            except Refused as exc:
                error=exc
        return calls,marks,error

    def test_docker_republishes_existing_tags_then_prunes_every_page(self):
        for forge,expected in [('FORGEJO','fixture/owner/sample'),('GITHUB','ghcr.io/owner/sample'),
                               ('GITLAB','registry.fixture:5050/owner/sample')]:
            with self.subTest(forge=forge):
                calls,marks,error=self.publish_docker_fixture(forge)
                self.assertIsNone(error)
                self.assertEqual(calls[:5],[('inspect',expected+':2.0.0'),('push',expected+':2.0.0'),('push',expected+':latest'),
                                            ('inspect',expected+':2.0.0'),('inspect',expected+':latest')])
                self.assertTrue(all(action=='delete' for action,_ in calls[5:]))
                self.assertEqual(len(calls[5:]),69 if forge=='GITHUB' else 68)
                self.assertEqual(len(marks),len(calls)-3)
                self.assertTrue(all('other' not in path and '/4/tags/' not in path for _,path in calls[5:]))

    def test_artifact_retention_values(self):
        for value,expected in (('0',(0,None)),('3',(3,None)),('365D',(0,365)),
                               ('3,365D',(3,365)),('0,700D',(0,700)),('0D',(0,0))):
            with self.subTest(value=value):
                self.assertEqual(artifact_retention(value),expected)
                self.assertTrue(public_value(DEBIAN_RETENTION,value))
                self.assertTrue(public_value(DOCKER_RETENTION,value))
        for value in ('-3','10d','3,','3,4','3D,10','3,365D,8D'):
            self.assertFalse(public_value(DEBIAN_RETENTION,value))
            with self.assertRaises(ValueError):
                artifact_retention(value)

    def test_obsolete_versions_preserves_each_guarantee_and_unknown_dates(self):
        now = datetime(2026,11,24,tzinfo=timezone.utc).timestamp()
        dates = {'recent':now-86400,'boundary':now-10*86400,'old':now-20*86400,'unknown':None}
        obsolete = forge_publish_artifacts.obsolete_versions
        self.assertEqual(obsolete(dates,(1,10),now,str),['old'])
        self.assertEqual(obsolete(dates,(3,10),now,str),[])
        self.assertEqual(obsolete(dates,(2,None),now,str),['old','unknown'])

    def test_docker_default_does_not_read_retention_inventory_or_delete(self):
        for forge in ('FORGEJO','GITHUB','GITLAB'):
            with self.subTest(forge=forge):
                progress=forge_publish_artifacts.PublicationProgress(['docker'])
                calls,_,error=self.publish_docker_fixture(forge,retention='0',inventory_status=403,progress=progress)
                self.assertIsNone(error)
                self.assertEqual([action for action,_ in calls],['inspect','push','push','inspect','inspect'])
                self.assertEqual(progress.steps['docker-retention']['state'],'SKIPPED')

    def test_docker_publication_with_both_tags_aligned_does_not_push(self):
        for forge in ('FORGEJO', 'GITHUB', 'GITLAB'):
            with self.subTest(forge=forge):
                progress=forge_publish_artifacts.PublicationProgress(['docker'])
                calls, marks, error=self.publish_docker_fixture(forge, retention='0', progress=progress,
                                                                already_published=True)
                self.assertIsNone(error)
                self.assertEqual([action for action,_ in calls], ['inspect', 'inspect'])
                self.assertFalse(marks)
                self.assertEqual(progress.steps['docker-push']['state'], 'SKIPPED')
                self.assertEqual(progress.steps['docker-confirm']['state'], 'COMPLETED')

    def test_docker_keeps_recent_versions_with_cumulative_policy(self):
        for forge in ('FORGEJO','GITHUB','GITLAB'):
            with self.subTest(forge=forge):
                calls,_,error=self.publish_docker_fixture(forge,retention='2,365D')
                self.assertIsNone(error)
                deletions=[path.rsplit('/',1)[-1] for action,path in calls if action=='delete']
                self.assertEqual(len(deletions),67 if forge=='GITHUB' else 66)
                self.assertFalse(set(deletions)&({'10','11'} if forge=='GITHUB' else {'old-0','old-1'}))

    def test_incomplete_docker_publication_does_not_delete_previous_versions(self):
        for forge in ('FORGEJO','GITHUB','GITLAB'):
            with self.subTest(forge=forge):
                calls,_,error=self.publish_docker_fixture(forge,failure='latest')
                self.assertEqual(error.code,'artifact-forge-publication-unconfirmed')
                self.assertEqual([action for action,_ in calls],['inspect','push','push'])

    def test_publication_progress_records_each_observed_step(self):
        progress=forge_publish_artifacts.PublicationProgress(['docker'])
        self.publish_docker_fixture('FORGEJO',failure='latest',progress=progress)
        self.assertEqual(progress.steps['docker-login']['state'],'COMPLETED')
        failed=progress.steps['docker-push']
        self.assertEqual(failed['state'],'FAILED')
        self.assertEqual(failed['details'],{'phase':'registry-push','tag':'latest','exit_code':1})
        self.assertEqual(progress.steps['docker-confirm']['state'],'PENDING')
        self.assertEqual(progress.steps['docker-retention']['state'],'PENDING')

    def test_admission_refuses_incompatible_token_or_inventory_before_docker(self):
        for forge,token,status,code,phase,scopes in (
            ('GITHUB','github_pat_fixture',200,'artifact-github-packages-classic-token-required',
             'registry-configuration',['write:packages','delete:packages']),
            ('GITHUB','ghp_fixture',403,'artifact-forge-registry-inventory-forbidden','registry-inventory',['read:packages']),
            ('FORGEJO','forgejo-fixture',401,'artifact-forge-registry-inventory-forbidden','registry-inventory',['read:package']),
            ('GITLAB','gitlab-fixture',403,'artifact-forge-registry-inventory-forbidden','registry-inventory',['read_api']),
        ):
            with self.subTest(forge=forge,code=code):
                progress=forge_publish_artifacts.PublicationProgress(['docker'])
                calls,marks,error=self.publish_docker_fixture(forge,token=token,
                                                               inventory_status=status,progress=progress)
                self.assertEqual(error.code,code)
                self.assertEqual(progress.steps['docker-prepare']['details']['phase'],phase)
                self.assertEqual(progress.steps['docker-prepare']['details']['required_scopes'],scopes)
                self.assertEqual(progress.steps['docker-login']['state'],'PENDING')
                self.assertEqual(progress.steps['docker-push']['state'],'PENDING')
                self.assertFalse(calls or marks)

    def test_github_retention_uses_authenticated_personal_package_path(self):
        calls,_,error=self.publish_docker_fixture('GITHUB',github_owner=True)
        self.assertIsNone(error)
        deletions=[path for action,path in calls if action=='delete']
        self.assertEqual(len(deletions),69)
        self.assertTrue(all(path.startswith('/api/user/packages/container/sample/versions/') for path in deletions))

    def test_remote_tag_confirmation_requires_the_pushed_image(self):
        with patch.object(forge_publish_artifacts,'inspect_manifest',return_value={
                'config':{'digest':'sha256:'+'b'*64}}), \
             patch.object(forge_publish_artifacts,'registry_digest',return_value='sha256:'+'c'*64):
            with self.assertRaisesRegex(Refused,'artifact-forge-publication-unconfirmed'):
                forge_publish_artifacts.confirm_docker(
                    [],'fixture/owner/sample',('2.0.0','latest'),'sha256:'+'a'*64)

    def test_oci_index_digest_must_match_each_published_tag(self):
        image_id='sha256:'+'a'*64
        child='sha256:'+'b'*64
        config='sha256:'+'c'*64
        index={'manifests':[{'digest':child}]}
        args,remote,labels=[],'fixture/owner/sample',('2.0.0','latest')
        for latest in (image_id,'sha256:'+'d'*64):
            with self.subTest(latest=latest), \
                 patch.object(forge_publish_artifacts,'inspect_manifest',
                              side_effect=[index,index,{'config':{'digest':config}}]), \
                 patch.object(forge_publish_artifacts,'registry_digest',side_effect=[image_id,latest]):
                if latest==image_id:
                    self.assertEqual(forge_publish_artifacts.confirm_docker(args,remote,labels,image_id),
                                     {image_id,child})
                else:
                    with self.assertRaisesRegex(Refused,'artifact-forge-publication-unconfirmed'):
                        forge_publish_artifacts.confirm_docker(args,remote,labels,image_id)

    def test_gitlab_certificate_fallback_confirms_both_registry_references(self):
        digest = 'sha256:' + 'a' * 64
        child = 'sha256:' + 'b' * 64
        manifest = {'manifests': [{'digest': child}]}
        calls = []

        def response(request):
            calls.append((request.url.host, request.url.path))
            if request.url.path == '/v2/':
                return httpx.Response(401, headers={'www-authenticate':
                    'Bearer realm="https://git.fixture/jwt/auth",service="container_registry"'})
            if request.url.path == '/jwt/auth':
                self.assertEqual(request.url.host, 'git.fixture')
                self.assertEqual(request.url.params['scope'], 'repository:group/sample:pull')
                self.assertTrue(request.headers.get('authorization', '').startswith('Basic '))
                return httpx.Response(200, json={'token': 'registry-fixture'})
            self.assertEqual(request.headers.get('authorization'), 'Bearer registry-fixture')
            ref = request.url.path.rsplit('/', 1)[-1]
            returned = child if ref == child else digest
            data = {'config': {'digest': 'sha256:'+'c'*64}} if ref == child else manifest
            return httpx.Response(200, json=data, headers={'docker-content-digest': returned})

        tls = Refused('artifact-forge-publication-unconfirmed', 409,
                      details={'phase': 'registry-confirmation', 'reason': 'tls-certificate'})
        with httpx.Client(transport=httpx.MockTransport(response)) as client, \
                patch.object(forge_publish_artifacts, 'forge_client', return_value=nullcontext(client)), \
                patch.object(forge_publish_artifacts, 'inspect_manifest', side_effect=tls):
            self.assertEqual(forge_publish_artifacts.confirm_forge_docker(
                [], 'https://git.fixture', 'registry.fixture', 'group', 'sample', 'GITLAB', 'sensitive-fixture',
                ('1.0.2', 'latest'), digest), {digest, child})
        self.assertEqual(len(calls), 5)

    def test_gitlab_first_failed_tag_can_be_confirmed_absent_only_in_accessible_registry(self):
        digest = 'sha256:' + 'a' * 64
        for latest_status in (200, 403):
            with self.subTest(latest_status=latest_status):
                def response(request):
                    ref = request.url.path.rsplit('/', 1)[-1]
                    if ref == '1.0.2':
                        return httpx.Response(404)
                    if ref == 'latest':
                        return httpx.Response(latest_status, json={'config': {'digest': digest}},
                                              headers={'docker-content-digest': digest})
                    return httpx.Response(200)

                with httpx.Client(transport=httpx.MockTransport(response)) as client, \
                        patch.object(forge_publish_artifacts, 'forge_client', return_value=nullcontext(client)):
                    args = ('https://git.fixture', 'registry.fixture', 'group/sample', 'alice', 'fixture',
                            ('1.0.2', 'latest'), digest)
                    verify = forge_publish_artifacts.confirm_gitlab_registry
                    if latest_status == 200:
                        self.assertIsNone(verify(*args, allow_missing_version=True))
                    else:
                        with self.assertRaises(httpx.HTTPStatusError):
                            verify(*args, allow_missing_version=True)

    def test_gitlab_missing_pair_requires_two_missing_refs_and_the_exact_repository(self):
        digest = 'sha256:' + 'a' * 64
        for latest, listed_name, tags, accepted in (
                (404, 'group/sample', None, True),
                (404, 'group/sample', ['old'], True),
                (404, 'group/other', [], False),
                (404, 'group/sample', ['latest'], False),
                (200, 'group/sample', None, False),
                (403, 'group/sample', None, False)):
            with self.subTest(latest=latest, listed_name=listed_name, tags=tags):
                def response(request):
                    path = request.url.path.rsplit('/', 1)[-1]
                    if path == '1.0.2':
                        return httpx.Response(404)
                    if path == 'latest':
                        return httpx.Response(latest, json={'config': {'digest': digest}},
                                              headers={'docker-content-digest': digest})
                    if path == 'list':
                        return httpx.Response(200, json={'name': listed_name, 'tags': tags})
                    return httpx.Response(200)

                with httpx.Client(transport=httpx.MockTransport(response)) as client, \
                        patch.object(forge_publish_artifacts, 'forge_client', return_value=nullcontext(client)):
                    args = ('https://git.fixture', 'registry.fixture', 'group/sample', 'alice', 'fixture',
                            ('1.0.2', 'latest'), digest)
                    verify = forge_publish_artifacts.confirm_gitlab_registry
                    if accepted:
                        self.assertIsNone(verify(*args, allow_missing_pair=True))
                    else:
                        with self.assertRaises((Refused, httpx.HTTPStatusError)):
                            verify(*args, allow_missing_pair=True)

    def test_gitlab_completed_push_can_reconcile_an_old_receipt_without_republishing(self):
        tag, image_id = '1.0.2', 'sha256:' + 'a' * 64
        module = forge_publish_artifacts
        values = {'PROJECT_VERSION': tag, 'REMOTE_GITLAB_REGISTRY': 'registry.fixture'}
        project = SimpleNamespace(pk='pfd', public_metadata={'values': values}, configuration={})
        previous = {'attempts': 3, 'at': '2026-11-25T12:00:00Z', 'error': 'artifact-forge-publication-unconfirmed'}
        receipt = {'issued': True, 'error': 'artifact-forge-publication-unconfirmed',
                   'details': {'phase': 'registry-confirmation'}, 'automatic_reconciliation': previous,
                   'progress': {'steps': [{'key': key, 'state': state} for key, state in (
                       ('docker-push', 'COMPLETED'), ('docker-confirm', 'FAILED'), ('docker-retention', 'PENDING'))]}}
        job = SimpleNamespace(pk='old-receipt', project=project, project_id=project.pk, forge='GITLAB',
                              state='UNKNOWN', receipt=receipt, save=Mock(),
                              plan={'docker': {'tag': tag, 'image_id': image_id}, 'registry': 'registry.fixture',
                                    'signature': module.identity(project, values, 'GITLAB')})
        now = datetime(2026, 11, 25, 14, tzinfo=timezone.utc)
        self.assertTrue(module.reconciliation_due(job, now))
        self.assertEqual(module.reconciliation_attempts(job)['previous'], previous)
        with patch.object(module.ProjectForgeArtifactPublication, 'objects') as jobs, \
                patch.object(module.Project, 'objects') as projects, \
                patch.object(module.Maintenance, 'objects') as maintenance, \
                patch.object(module, 'docker_inventory', return_value={'local': (None, {'image_id': image_id})}), \
                patch.object(module, 'remote', return_value=nullcontext(
                    (None, 'https://git.fixture', None, None, 'group', 'sample', 'fixture', False))), \
                patch.object(module, 'confirm_gitlab_registry', return_value=None) as verify, \
                patch.object(module, 'release_docker') as publish, \
                patch('cab_platform.notifications.artifact_notification'):
            jobs.select_for_update.return_value.filter.return_value.first.return_value = job
            projects.select_for_update.return_value.get.return_value = project
            maintenance.filter.return_value.exists.return_value = False
            result = module.reconcile_docker.__wrapped__(project, job.pk, tag, image_id)
        self.assertEqual(result['state'], 'FAILED')
        self.assertEqual(job.receipt['previous'], {'state': 'UNKNOWN', **receipt})
        self.assertEqual(job.receipt['observed_absent_tags'], [tag, 'latest'])
        self.assertTrue(verify.call_args.kwargs['allow_missing_pair'])
        publish.assert_not_called()

    def test_gitlab_registry_does_not_send_credentials_to_another_origin(self):
        calls = []
        def response(request):
            calls.append(request.url.host)
            return httpx.Response(401, headers={'www-authenticate':
                'Bearer realm="https://other.fixture/jwt/auth",service="container_registry"'})

        with httpx.Client(transport=httpx.MockTransport(response)) as client, \
                patch.object(forge_publish_artifacts, 'forge_client', return_value=nullcontext(client)):
            with self.assertRaisesRegex(Refused, 'artifact-forge-publication-unconfirmed'):
                forge_publish_artifacts.confirm_gitlab_registry(
                    'https://git.fixture', 'registry.fixture', 'group/sample', 'alice', 'sensitive-fixture',
                    ('1.0.2','latest'), 'sha256:'+'a'*64)
        self.assertEqual(calls, ['registry.fixture'])

    def test_reconciliation_preserves_receipt_until_tags_are_verified(self):
        tag,image_id='2.0.0','sha256:'+'a'*64
        initial={'issued':True,'error':'artifact-forge-publication-unconfirmed',
                 'details':{'phase':'registry-confirmation'}}
        job=SimpleNamespace(pk='receipt',forge='FORGEJO',state='UNKNOWN',
                            receipt=initial,plan={'signature':'signature'},save=Mock())
        project=SimpleNamespace(pk='project',public_metadata={'values':{'PROJECT_VERSION':tag}})
        job.project=project
        configured=(None,'https://fixture',None,None,'owner','sample','token',False)
        publication=forge_publish_artifacts
        with patch.object(publication.ProjectForgeArtifactPublication,'objects') as jobs, \
             patch.object(publication.Project,'objects') as projects, \
             patch.object(publication.Maintenance,'objects') as maintenance, \
             patch('cab_platform.notifications.artifact_notification'), \
             patch.object(publication,'identity',return_value='signature'), \
             patch.object(publication,'docker_inventory',return_value={'local':(None,{'image_id':image_id})}), \
             patch.object(publication,'remote') as remote, patch.object(publication,'registry_login') as login, \
             patch.object(publication,'confirm_docker') as confirm:
            jobs.select_for_update.return_value.filter.return_value.first.return_value=job
            projects.select_for_update.return_value.get.return_value=project
            maintenance.filter.return_value.exists.return_value=False
            remote.return_value.__enter__.return_value=configured
            login.return_value.__enter__.return_value=([],{})
            confirm.side_effect=Refused('artifact-forge-publication-unconfirmed',409)
            reconcile=publication.reconcile_docker.__wrapped__
            with self.assertRaises(Refused):
                reconcile(project,job.pk,tag,image_id)
            self.assertEqual(job.state,'UNKNOWN')
            job.save.assert_not_called()

            confirm.side_effect=None
            result=reconcile(project,job.pk,tag,image_id)
            self.assertEqual(result['state'],'COMPLETED')
            self.assertTrue(result['details']['publication_confirmed'])
            self.assertFalse(result['details']['cleanup_performed'])
            self.assertEqual(job.receipt['previous'],{'state':'UNKNOWN',**initial})
            confirm.assert_called_with([],'fixture/owner/sample',(tag,'latest'),image_id)
            self.assertEqual(reconcile(project,job.pk,tag,image_id),result)
            job.save.assert_called_once()

            legacy={'issued':True,'error':'artifact-forge-response-invalid'}
            job.state,job.receipt='UNKNOWN',legacy
            values=project.public_metadata['values']
            values.update(PROJECT_DOCKERED='Yes',PROJECT_DEBIAN_PACKAGE='Yes')
            with self.assertRaisesRegex(Refused,'artifact-reconciliation-ineligible'):
                reconcile(project,job.pk,tag,image_id)
            self.assertEqual(job.receipt,legacy)
            values['PROJECT_DEBIAN_PACKAGE']='No'
            result=reconcile(project,job.pk,tag,image_id)
            self.assertEqual(result['state'],'COMPLETED')
            self.assertEqual(job.receipt['previous'],{'state':'UNKNOWN',**legacy})

    def test_automatic_reconciliation_requires_recorded_image_and_completed_push(self):
        now=datetime(2026,11,24,10,3,tzinfo=timezone.utc)
        docker={'tag':'1.0.2','image_id':'sha256:'+'a'*64}
        for forge in ('FORGEJO','GITHUB','GITLAB'):
            with self.subTest(forge=forge):
                steps=[
                    {'key':'docker-push','state':'COMPLETED'},
                    {'key':'docker-confirm','state':'UNKNOWN'},
                    {'key':'docker-retention','state':'PENDING'},
                ]
                job=SimpleNamespace(pk='same-receipt',forge=forge,state='UNKNOWN',
                                    project=object(),plan={},save=Mock(),
                                    receipt={'issued':True,'progress':{'steps':steps}})
                self.assertFalse(forge_publish_artifacts.reconciliation_due(job,now))
                job.plan['docker']=docker
                self.assertTrue(forge_publish_artifacts.reconciliation_due(job,now))
                steps[0]['state']='FAILED'
                self.assertFalse(forge_publish_artifacts.reconciliation_due(job,now))
                steps[1]['state']='PENDING'
                job.receipt['details']={'phase':'registry-push','tag':'1.0.2','exit_code':1}
                self.assertEqual(forge_publish_artifacts.reconciliation_due(job,now),forge=='GITLAB')
                job.receipt.pop('details')
                steps[0]['state']='COMPLETED'
                steps[1]['state']='UNKNOWN'
                with patch.object(forge_publish_artifacts.ProjectForgeArtifactPublication,'objects') as records, \
                     patch.object(forge_publish_artifacts.transaction,'atomic',side_effect=nullcontext), \
                     patch.object(forge_publish_artifacts.timezone,'now',return_value=now), \
                     patch.object(forge_publish_artifacts,'reconcile_docker',side_effect=Refused('artifact-local-changed')) as verify:
                    locked=records.select_for_update.return_value
                    locked.get.return_value=job
                    locked.filter.return_value.first.return_value=job
                    forge_publish_artifacts.attempt_reconciliation(job.pk)
                verify.assert_called_once_with(job.project,job.pk,docker['tag'],docker['image_id'])
                self.assertEqual(job.state,'UNKNOWN')
                self.assertEqual(job.receipt['automatic_reconciliation']['error'],'artifact-local-changed')
                self.assertFalse(forge_publish_artifacts.reconciliation_due(job,now+timedelta(seconds=29)))
                self.assertTrue(forge_publish_artifacts.reconciliation_due(job,now+timedelta(seconds=30)))
                job.receipt['automatic_reconciliation']['attempts']=3
                self.assertFalse(forge_publish_artifacts.reconciliation_due(job,now+timedelta(days=1)))

    def test_github_never_deletes_a_version_sharing_a_kept_tag(self):
        calls,_,error=self.publish_docker_fixture('GITHUB',alias=True)
        self.assertEqual(error.code,'artifact-forge-registry-obsolete-tags-retained')
        self.assertTrue(error.details['publication_confirmed'])
        self.assertNotIn(('delete','/api/users/owner/packages/container/sample/versions/2'),calls)


if __name__=='__main__':
    unittest.main(verbosity=2)
