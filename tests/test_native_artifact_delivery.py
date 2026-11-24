"""Contrôle de la livraison CAB complète sans mutation distante réelle."""
from pathlib import Path
import sys
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

from cab_platform import session_delivery as delivery
from cab_platform.core.commands import Refused
from cab_platform.core.models import GitDelivery, Project


class NativeArtifactDeliveryTests(unittest.TestCase):
    def test_publication_only_selects_built_formats_of_the_delivered_version(self):
        project=SimpleNamespace(pk='project',root='/fixture',configuration={})
        values={'PROJECT_VERSION':'2.0.0'}
        target={'name':'GITHUB','signature':'signature'}
        trace=[]
        def native(project,values,artifacts,mark,progress):
            trace.append(artifacts)
            with progress.step('debian-release'):
                mark()
        with patch('cab_platform.project_metadata.read_metadata',return_value={'state':'ready','values':values}), \
                patch('cab_platform.forge_repository.identity',return_value='signature'), \
                patch('cab_platform.forge_repository.refresh_one') as refresh, \
                patch('cab_platform.forge_publish_artifacts.local_plan',return_value={'debian':[{}],'docker':{}}) as local, \
                patch.dict('cab_platform.forge_publish_artifacts.PUBLISHERS',{'GITHUB':native}):
            receipt=delivery.execute_native_publication(project,target,'2.0.0',{'debian':True,'docker':False},trace.append)
            local.assert_called_once_with(project,values,version='2.0.0')
            refresh.assert_called_once_with('project','GITHUB',wait=True,automatic=False)
            self.assertEqual(trace[0],{'debian':[{}]})
            self.assertEqual({key:value for key,value in receipt.items() if key!='progress'},
                             {'publisher':'cab','version':'2.0.0','tag':'2.0.0','exit_code':0,'executed':True})
            self.assertEqual(receipt['progress']['kinds'],['debian'])
            self.assertIn(('debian-release','COMPLETED'),
                          [(step['key'],step['state']) for step in receipt['progress']['steps']])
            with self.assertRaisesRegex(Refused,'session-delivery-config-changed'):
                delivery.execute_native_publication(project,target,'2.0.1',{'debian':True,'docker':False},trace.append)

    def test_both_scopes_use_same_build_and_publish_order(self):
        for scope in ('change','project'):
            with self.subTest(scope=scope):
                p=SimpleNamespace(pk='project')
                target={'name':'FORGEJO','remote':'head','signature':'sig','branch':'main'}
                plan={'scope':scope,'forges':[target],'docker':True,'debian':True,'defer_releases':False}
                row=SimpleNamespace(project=p,run=None,version='2.0.0',plan=plan,steps=SimpleNamespace(get=lambda **kwargs:SimpleNamespace(state='PENDING')))
                trace=[]
                def build(_p,kind,_version,mark):
                    trace.append(('build',kind));mark({})
                    return {'exit_code':0}
                def publish(_p,forge,_version,_plan,mark):
                    trace.append(('publish',forge['name']));mark({})
                    return {'exit_code':0}
                with patch.object(GitDelivery,'objects') as deliveries,patch.object(Project,'objects') as projects, \
                        patch.object(delivery,'_set_step'),patch.object(delivery,'_update_step_receipt'), \
                        patch.object(delivery,'push_version',return_value={'verified':True}), \
                        patch.object(delivery,'verify_version',return_value={'verified':True}), \
                        patch.object(delivery,'execute_native_build',side_effect=build), \
                        patch.object(delivery,'execute_native_publication',side_effect=publish), \
                        patch.object(delivery,'_retire_index'),patch.object(delivery,'attest_delivery'), \
                        patch.object(delivery,'_set_delivery_state') as state:
                    deliveries.select_related.return_value.get.return_value=row
                    projects.get.return_value=p
                    delivery._continue_after_commit(1,{'commit':'commit','tag_oid':'tag'})
                self.assertEqual(trace,[('build','docker'),('build','debian'),('publish','FORGEJO')])
                state.assert_called_once_with(1,'COMPLETED')


if __name__=='__main__':
    unittest.main(verbosity=2)
