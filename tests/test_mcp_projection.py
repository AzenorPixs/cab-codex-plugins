"""Projection minimale et audit sur PostgreSQL de fixture uniquement."""
import os
import unittest
from unittest.mock import patch
if os.environ.get('CAB_TEST_FIXTURE')!='1':raise RuntimeError('dedicated-postgresql-fixture-required')
import django
django.setup()
from django.db import transaction
from django.utils import timezone
from cab_platform.core import connectors as c
from cab_platform.core.models import Actor,McpConnector,McpConnectorProjection,McpStopAttempt
from cab_platform.worker_stop import policy
from cab_platform.web_views import sync_connectors
from types import SimpleNamespace

class ProjectionTests(unittest.TestCase):
    def setUp(self):
        self.tx=transaction.atomic();self.tx.__enter__();self.actor=Actor.objects.create(pk='projection-fixture',uid=12345,agent='codex',token_hash='projection-only')
        self.process={'pid':11,'uid':12345,'parent_pid':10,'start':'1','boot':'fixture'};self.worker={'pid':12,'uid':12345,'parent_pid':11,'start':'2','boot':'fixture'}
        self.row=McpConnector.objects.create(pk='a'*32,actor=self.actor,agent='codex',process=self.process,worker=self.worker,loaded_version='3.2.4',catalog_version='3.2.3',state='READY')
    def tearDown(self):transaction.set_rollback(True);self.tx.__exit__(None,None,None)
    def test_projection_copies_observed_versions_and_disconnects(self):
        with patch.object(c,'alive',return_value=True):c.project_connector(self.row)
        p=McpConnectorProjection.objects.get(connector=self.row);self.assertTrue(p.connected);self.assertEqual(p.catalog_version,'3.2.3');self.assertEqual(p.relay_version,'')
        self.assertFalse({'process','worker','actor','error'}&{f.name for f in p._meta.fields})
        with patch.object(c,'alive',return_value=False):c.refresh_projection()
        p.refresh_from_db();self.assertFalse(p.connected)
    def test_audit_duplicate_survives_worker_replacement(self):
        report={'worker':self.worker,'policy':policy(),'state':'STOPPED','stages':['stdin-eof','SIGTERM'],'reason':'SIGTERM-exit'}
        data={'connector_id':self.row.pk,'attempt_id':'b'*32,'report':report};peer={'uid':12345,'pid':11}
        with patch.object(c,'identity',return_value=self.process),patch.object(c,'alive',return_value=False):result=c.stop_report(self.actor,data,peer)
        self.row.worker={**self.worker,'pid':13};self.row.save()
        with patch.object(c,'identity',return_value=self.process):self.assertEqual(result,c.stop_report(self.actor,data,peer))
        self.assertEqual(McpStopAttempt.objects.filter(connector=self.row).count(),1)
    def test_stream_scope_and_column_whitelist_are_server_owned(self):
        request=SimpleNamespace(GET={'where':'true','columns':'process,worker','table':'cab_core_actor','offset':'-1'})
        response=SimpleNamespace(status_code=200,content=b'[]',headers={'content-type':'application/json'})
        with patch('cab_platform.web_views.principal',return_value=self.actor),patch('cab_platform.web_views.config',return_value={'electric_secret':'fixture','electric_port':8791}),patch('httpx.get',return_value=response) as get:
            self.assertEqual(sync_connectors(request).status_code,200)
            values=get.call_args.kwargs['params'];self.assertEqual(values['where'],'uid = 12345');self.assertEqual(values['table'],'mcp_connector_projection');self.assertNotIn('process',values['columns']);self.assertNotIn('worker',values['columns'])

if __name__=='__main__':unittest.main()
