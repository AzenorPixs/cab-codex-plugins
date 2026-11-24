"""Contrôle des observations et publications sans contacter de forge réelle."""
import json
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
from cab_platform.forge_artifacts import observe, merge
from cab_platform.forge_repository import get_json
from cab_platform import forge_publish_artifacts
from cab_platform.core.commands import Refused
from cab_platform.forge_publish_artifacts import release_debian, release_docker


class ForgeArtifactsTests(unittest.TestCase):
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

    def test_refresh_failure_keeps_known_rows_only_for_active_kind(self):
        flags={'PROJECT_DEBIAN_PACKAGE':'Yes'}
        old={key:{'items':[{'name':key,'tags':['1.0.0']}]} for key in ('debian','docker')}
        self.assertEqual(merge(old,flags,{'debian':{'available':False}}),
                         {'debian':{'available':False,'items':old['debian']['items']}})
        empty={'available':True,'items':[]}
        self.assertEqual(merge(old,flags,{'debian':empty}),{'debian':empty})

    def test_debian_replaces_the_matching_asset_and_retains_seven_versions(self):
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
                        releases[tag]={'tag_name':tag,'id':index,
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
                    with httpx.Client(transport=httpx.MockTransport(handle)) as client:
                        release_debian(project,client,'https://fixture','https://fixture/project',
                                       forge,True,plan,lambda:marks.append(True))
                    self.assertEqual(len(marks),4)
                    self.assertEqual(set(releases),{'2.0.0',*(f'1.0.{i}' for i in range(1,9))})
                    self.assertEqual(
                        [tag for tag,release in releases.items()
                         if any(asset['name'].startswith('sample_') for asset in release['assets'])],
                        [*(f'1.0.{i}' for i in range(3,9)),'2.0.0'])
                    self.assertTrue(all(any(asset['name'].startswith('another_') for asset in release['assets'])
                                        for release in releases.values()))
                    first_cleanup=next(index for index,(method,path) in enumerate(requests)
                                       if method=='DELETE' and path.endswith('/1'))
                    self.assertTrue(any(method=='GET' and path.endswith('/2.0.0')
                                        for method,path in requests[:first_cleanup]))
                    self.assertEqual(requests[-1][0],'GET')

    def publish_docker_fixture(self,forge,*,failure=None,alias=False,progress=None):
        calls,marks=[],[]
        old={f'old-{index}' for index in range(68)}
        tags=old|{'2.0.0','latest'}
        image_id='sha256:'+'a'*64
        versions={index:[tag] for index,tag in enumerate(sorted(old),10)}
        versions.update({1:['2.0.0','latest'],2:['beta'] if alias else []})
        endpoint={
            'FORGEJO':'/api/packages/owner',
            'GITHUB':'/api/users/owner/packages/container/sample/versions',
            'GITLAB':'/project/registry/repositories/5/tags',
        }[forge]
        def command(args,**kwargs):
            self.assertNotIn('token-fixture',args)
            if 'push' in args:
                tag=args[-1].rsplit(':',1)[-1]
                calls.append(('push',args[-1]))
                if tag==failure:
                    return SimpleNamespace(returncode=1)
                versions[1].remove(tag)
                versions[2].append(tag)
            if 'inspect' in args:
                calls.append(('inspect',args[-1]))
            return SimpleNamespace(returncode=0,stdout=json.dumps({'config':{'digest':image_id}}).encode())

        def handle(request):
            path=request.url.path
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
            self.assertEqual(path,endpoint)
            page=int(request.url.params['page'])
            if forge=='GITHUB':
                rows=[{'id':key,'name':'sha256:'+f'{key:064x}',
                       'metadata':{'container':{'tags':labels}}} for key,labels in sorted(versions.items())]
            elif forge=='FORGEJO':
                rows=[{'name':'sample','type':'container','version':tag} for tag in sorted(tags)]
                rows.append({'name':'sample','type':'container','version':'sha256:'+'b'*64})
                rows.append({'name':'other','type':'container','version':'other-tag'})
            else:
                rows=[{'name':tag} for tag in sorted(tags)]
            return httpx.Response(200,json=rows[(page-1)*20:page*20])

        error=None
        with httpx.Client(transport=httpx.MockTransport(handle)) as client, \
             patch('cab_platform.forge_publish_artifacts.existing',return_value={}), \
             patch('cab_platform.forge_publish_artifacts.subprocess.run',side_effect=command):
            try:
                release_docker(client,'https://fixture','https://fixture/api','https://fixture/project',forge,
                               'owner','sample','token-fixture',True,{'REMOTE_GITLAB_REGISTRY':'registry.fixture:5050'},
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
                self.assertEqual(calls[:4],[('push',expected+':2.0.0'),('push',expected+':latest'),
                                            ('inspect',expected+':2.0.0'),('inspect',expected+':latest')])
                self.assertTrue(all(action=='delete' for action,_ in calls[4:]))
                self.assertEqual(len(calls[4:]),69 if forge=='GITHUB' else 68)
                self.assertEqual(len(marks),len(calls)-2)
                self.assertTrue(all('other' not in path and '/4/tags/' not in path for _,path in calls[4:]))

    def test_incomplete_docker_publication_does_not_delete_previous_versions(self):
        for forge in ('FORGEJO','GITHUB','GITLAB'):
            with self.subTest(forge=forge):
                calls,_,error=self.publish_docker_fixture(forge,failure='latest')
                self.assertEqual(error.code,'artifact-forge-publication-unconfirmed')
                self.assertEqual([action for action,_ in calls],['push','push'])

    def test_publication_progress_records_each_observed_step(self):
        progress=forge_publish_artifacts.PublicationProgress(['docker'])
        self.publish_docker_fixture('FORGEJO',failure='latest',progress=progress)
        self.assertEqual(progress.steps['docker-login']['state'],'COMPLETED')
        failed=progress.steps['docker-push']
        self.assertEqual(failed['state'],'FAILED')
        self.assertEqual(failed['details'],{'phase':'registry-push','tag':'latest','exit_code':1})
        self.assertEqual(progress.steps['docker-confirm']['state'],'PENDING')
        self.assertEqual(progress.steps['docker-retention']['state'],'PENDING')

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

    def test_reconciliation_preserves_receipt_until_tags_are_verified(self):
        tag,image_id='2.0.0','sha256:'+'a'*64
        initial={'issued':True,'error':'artifact-forge-publication-unconfirmed',
                 'details':{'phase':'registry-confirmation'}}
        job=SimpleNamespace(pk='receipt',forge='FORGEJO',state='UNKNOWN',
                            receipt=initial,plan={'signature':'signature'},save=Mock())
        project=SimpleNamespace(pk='project',public_metadata={'values':{'PROJECT_VERSION':tag}})
        configured=(None,'https://fixture',None,None,'owner','sample','token',False)
        publication=forge_publish_artifacts
        with patch.object(publication.ProjectForgeArtifactPublication,'objects') as jobs, \
             patch.object(publication.Project,'objects') as projects, \
             patch.object(publication,'identity',return_value='signature'), \
             patch.object(publication,'docker_inventory',return_value={'local':(None,{'image_id':image_id})}), \
             patch.object(publication,'remote') as remote, patch.object(publication,'registry_login') as login, \
             patch.object(publication,'confirm_docker') as confirm:
            jobs.select_for_update.return_value.filter.return_value.first.return_value=job
            projects.select_for_update.return_value.get.return_value=project
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

    def test_github_never_deletes_a_version_sharing_a_kept_tag(self):
        calls,_,error=self.publish_docker_fixture('GITHUB',alias=True)
        self.assertEqual(error.code,'artifact-forge-registry-obsolete-tags-retained')
        self.assertTrue(error.details['publication_confirmed'])
        self.assertNotIn(('delete','/api/users/owner/packages/container/sample/versions/2'),calls)


if __name__=='__main__':
    unittest.main(verbosity=2)
