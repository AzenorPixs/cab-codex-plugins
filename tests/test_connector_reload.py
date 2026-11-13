"""Registre et reçu sur PostgreSQL de fixture ; aucun signal à un vrai client."""
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
if os.environ.get('CAB_TEST_FIXTURE')!='1':raise RuntimeError('dedicated-postgresql-fixture-required')
import django
django.setup()
from django.db import transaction
from cab_platform.core import connectors as c
from cab_platform.core.commands import Refused
from cab_platform.core.models import Actor,McpConnector,ConnectorReload,SystemUpdate
from cab_platform import system_updates as u

class ConnectorTests(unittest.TestCase):
    def setUp(self):
        self.tx=transaction.atomic();self.tx.__enter__();self.tmp=tempfile.TemporaryDirectory();self.state=patch.object(u,'STATE',Path(self.tmp.name));self.state.start()
        self.actor=Actor.objects.create(pk='connector-fixture',uid=12345,agent='codex',token_hash='fixture-connector-token')
        self.parent={'pid':11,'uid':12345,'parent_pid':10,'start':'10','boot':'fixture'};self.worker={'pid':12,'uid':12345,'parent_pid':11,'start':'11','boot':'fixture'}
        self.body={'connector_id':'a'*32,'worker_pid':12,'loaded_version':'3.2.2','catalog_version':'3.2.2','pending':0,'state':'READY'}
    def tearDown(self):self.state.stop();transaction.set_rollback(True);self.tx.__exit__(None,None,None);self.tmp.cleanup()
    def heartbeat(self,body=None):
        with patch.object(c,'identity',side_effect=lambda pid:self.parent if pid==11 else self.worker),patch.object(c,'cab_process',return_value='codex'):
            return c.heartbeat(self.actor,body or self.body,{'uid':12345,'pid':11})
    def test_generation_changes_only_with_worker_and_catalog_resets(self):
        self.assertEqual(self.heartbeat()['generation'],1)
        with self.assertRaisesRegex(Refused,'without-restart'):self.heartbeat({**self.body,'loaded_version':'3.2.3'})
        self.worker={**self.worker,'pid':13,'start':'12'}
        result=self.heartbeat({**self.body,'worker_pid':13,'loaded_version':'3.2.3','catalog_version':''});self.assertEqual(result['generation'],2);self.assertEqual(result['catalog_version'],'')
    def test_peer_and_worker_ownership_are_required(self):
        with self.assertRaises(Refused):c.heartbeat(self.actor,self.body,{'uid':99,'pid':11})
        self.worker={**self.worker,'parent_pid':99}
        with self.assertRaisesRegex(Refused,'worker-invalid'):self.heartbeat()
    def test_legacy_remains_required_without_blind_signal(self):
        target={'kind':'legacy','agent':'codex','process':self.parent,'owner':{'pid':10}}
        with patch.object(c,'alive',return_value=True):state,rows=c.assess([target],'3.2.3')
        self.assertEqual(state,'RELOAD_REQUIRED');self.assertEqual(rows[0]['reason'],'legacy-native-reload-required')
        # Un relais photographié avant son premier heartbeat est reconnu ensuite.
        self.heartbeat({**self.body,'loaded_version':'3.2.3','catalog_version':'3.2.3'})
        with patch.object(c,'alive',return_value=True):self.assertEqual(c.assess([target],'3.2.3')[0],'OK')
    def test_old_worker_receipt_is_composed_with_durable_connector_proof(self):
        job=SystemUpdate.objects.create(pk='OLD-WORKER',actor=self.actor,target_version='3.2.3',state='OK',active_slot=None,result={'version':'3.2.3','verified':True,'package_sha256':'b'*64})
        ConnectorReload.objects.create(update=job,targets=[{'kind':'legacy'}],version='3.2.3')
        with patch.object(c,'assess',return_value=('RELOAD_REQUIRED',[{'state':'RELOAD_REQUIRED'}])):
            result=u.status(self.actor,job.pk);self.assertEqual(result['state'],'RELOAD_REQUIRED');self.assertEqual(result['package_state'],'OK')
        with patch.object(c,'assess',return_value=('OK',[{'state':'READY'}])):
            result=u.status(self.actor,job.pk);self.assertEqual(result['state'],'OK')
        job.refresh_from_db();self.assertIsNone(job.active_slot);self.assertEqual(ConnectorReload.objects.get(update=job).state,'OK')
        with patch.object(c,'assess',side_effect=AssertionError('terminal receipt reopened')):self.assertEqual(u.status(self.actor,job.pk)['state'],'OK')

if __name__=='__main__':unittest.main()
