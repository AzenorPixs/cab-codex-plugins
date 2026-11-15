"""Reprises de prévol et purge CCAB sur PostgreSQL dédié uniquement."""
import os
import time
import uuid
import unittest
from unittest.mock import patch
if os.environ.get('CAB_TEST_FIXTURE')!='1':raise RuntimeError('dedicated-postgresql-fixture-required')
import test_historical_closure as fixture
from cab_platform.core import api,commands as c,run_evidence as e
from cab_platform.core.models import Incident,FinalizationPlan,Operation,Run
from cab_platform.client import ClientError
from cab_platform import mcp
from mcp.server.mcpserver.exceptions import ToolError

class RecoveryTests(unittest.TestCase):
    setUp=fixture.HistoricalTests.setUp
    tearDown=fixture.HistoricalTests.tearDown
    def policy(self,argv):return {'checks':[{'id':'unit','argv':argv,'criteria':['historical']}]}
    def test_preflight_correction_preserves_history_and_blocks_after_operation(self):
        data={'project_id':self.project.pk,'run_id':self.run.run_id}
        first=e.configure(self.actor,{**data,'policy':self.policy(['/bin/false'])})
        second=e.configure(self.actor,{**data,'policy':self.policy(['/bin/true'])})
        self.assertNotEqual(first['digest'],second['digest'])
        event=self.run.event_set.filter(kind='finalization-configured').last();self.assertEqual(event.data['old_policy'],first['policy'])
        Operation.objects.create(run=self.run,request_id='fixture-ended',state='FAILED_TO_START',input_digest='fixture',source_revision='fixture')
        with self.assertRaisesRegex(c.Refused,'adoption-not-safe'):e.configure(self.actor,{**data,'policy':self.policy(['/bin/false'])})
    def test_resolved_claim_and_all_or_nothing_purge(self):
        self.actor.role='orchestrator';self.actor.save()
        resolution={'verified':'fixture-only','method':'already-treated'}
        one=Incident.objects.create(pk=uuid.uuid4().hex,project=self.project,category='fixture',summary='fixture',state='RESOLVED',claim={'actor':self.actor.pk,'until':0},resolution=resolution)
        two=Incident.objects.create(pk=uuid.uuid4().hex,project=self.project,category='fixture',summary='fixture',state='OPEN')
        api.incident_command(self.actor,'incident.claim',{'incident_id':one.pk,'claim_id':'renewed'})
        one.refresh_from_db();self.assertEqual(one.state,'RESOLVED');self.assertEqual(one.resolution,resolution)
        args={'request_id':'PURGE-FIXTURE','developer_authorized':True,'expected_snapshot_digest':'stale'}
        with self.assertRaisesRegex(c.Refused,'incident-unresolved'):api.incident_command(self.actor,'incident.purge_all',args)
        self.assertEqual(Incident.objects.filter(pk__in=[one.pk,two.pk]).count(),2)
        two.state='RESOLVED';two.claim={'actor':self.actor.pk,'until':time.time()+60};two.resolution=resolution;two.save()
        with self.assertRaisesRegex(c.Refused,'snapshot-stale'):api.incident_command(self.actor,'incident.purge_all',args)
        fields=('incident_id','category','summary','evidence','state','claim','resolution')
        values=list(Incident.objects.order_by('created').values(*fields));args['expected_snapshot_digest']=c.digest(values)
        count=Run.objects.count();result=api.incident_command(self.actor,'incident.purge_all',args)
        self.assertEqual(result['remaining'],0);self.assertEqual(Run.objects.count(),count)
    def test_public_mcp_reports_refused_admission_and_missing_run(self):
        self.assertFalse(mcp.finalization_validate({'reserved_review':'unsupported'},['criterion'])['valid'])
        self.assertIn('publication',mcp.cab_contract()['finalization']['requirement_kinds'])
        client=__import__('unittest.mock',fromlist=['Mock']).Mock()
        client.command.side_effect=ClientError('finalization-fields-invalid');client.get.side_effect=ClientError('not-found')
        with patch.object(mcp,'client',return_value=client):
            with self.assertRaisesRegex(ToolError,'finalization-fields-invalid'):mcp.run_begin('p','r','s','change','direct',['source'],['criterion'],[])
            with self.assertRaisesRegex(ToolError,'not-found'):mcp.run_status('p','r')
        import inspect
        self.assertIn('project_id',inspect.signature(mcp.run_begin).parameters)

if __name__=='__main__':unittest.main()
