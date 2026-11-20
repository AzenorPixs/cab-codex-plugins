"""Contrôle des observations et publications sans contacter de forge réelle."""
import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch

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
from cab_platform.forge_publish_artifacts import release_debian, release_docker


class ForgeArtifactsTests(unittest.TestCase):
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

    def test_each_debian_publication_reads_back_the_release(self):
        data=b'package fixture'
        name='sample_2.0.0_all.deb'
        with TemporaryDirectory() as directory:
            dist=Path(directory)/'dist';dist.mkdir()
            (dist/name).write_bytes(data)
            plan=[{'name':name,'version':'2.0.0','size':len(data),'sha256':hashlib.sha256(data).hexdigest()}]
            project=SimpleNamespace(root=directory)
            for forge in ('FORGEJO','GITHUB','GITLAB'):
                with self.subTest(forge=forge):
                    assets, marks, requests=[],[],[]
                    def handle(request):
                        path=request.url.path
                        requests.append((request.method,path))
                        if request.method=='GET' and '/tags/' in path and '/releases/' not in path:
                            return httpx.Response(200,json={})
                        if request.method=='GET':
                            return httpx.Response(200,json={'tag_name':'2.0.0','id':9,
                                'upload_url':'https://uploads.github.com/repositories/12/releases/9/assets{?name}',
                                'assets':{'links':assets} if forge=='GITLAB' else assets})
                        if path.endswith('/uploads'):
                            self.assertIn(data,request.read())
                            return httpx.Response(201,json={'url':'/uploads/a121/'+name})
                        if path.endswith('/assets/links'):
                            self.assertEqual(json.loads(request.read())['name'],name)
                        else:
                            self.assertIn(data,request.read())
                        assets.append({'name':name})
                        return httpx.Response(201,json={'id':1})
                    with httpx.Client(transport=httpx.MockTransport(handle)) as client:
                        release_debian(project,client,'https://fixture','https://fixture/project',
                                       forge,True,plan,lambda:marks.append(True))
                    self.assertEqual(len(marks),2 if forge=='GITLAB' else 1)
                    self.assertEqual(requests[-1][0],'GET')

    def test_docker_publishes_version_and_latest_for_each_forge(self):
        for forge, expected in [('FORGEJO','fixture/owner/sample'),('GITHUB','ghcr.io/owner/sample'),
                                ('GITLAB','registry.fixture:5050/owner/sample')]:
            with self.subTest(forge=forge):
                calls,marks=[],[]
                def command(args,**kwargs):
                    calls.append((args,kwargs))
                    return SimpleNamespace(returncode=1,stderr=b'no such manifest') if 'inspect' in args else SimpleNamespace(returncode=0)
                with patch('cab_platform.forge_publish_artifacts.existing',return_value={}), \
                        patch('cab_platform.forge_publish_artifacts.subprocess.run',side_effect=command):
                    release_docker(None,'https://fixture','https://fixture/api','https://fixture/project',forge,
                                   'owner','sample','token-fixture',True,{'REMOTE_GITLAB_REGISTRY':'registry.fixture:5050'},
                                   {'image_id':'sha256:'+'a'*64,'tag':'2.0.0'},lambda:marks.append(True))
                self.assertEqual([args[-1] for args,_ in calls if 'push' in args],[expected+':2.0.0',expected+':latest'])
                self.assertEqual(marks,[True,True])
                self.assertTrue(all('token-fixture' not in args for args,_ in calls))


if __name__=='__main__':
    unittest.main(verbosity=2)
