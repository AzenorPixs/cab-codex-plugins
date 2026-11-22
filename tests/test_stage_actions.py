"""Preuves d’action par passage, indépendantes des étapes facultatives."""
import os
import unittest
from types import SimpleNamespace

import test_stage_protocol as fixtures

from cab_platform import stage_actions as actions, stage_protocol
from cab_platform.core import commands as c


class MandateListTests(unittest.TestCase):
    def test_named_mandates_are_compact_and_unique(self):
        self.assertEqual(actions.normalize_mandates(['SCM','CICDF','CABU']),['SCM','CICDF','CABU'])
        for invalid in ([],['SCM','SCM'],['SCM\nCABU'],['https://example.invalid/token'],None):
            with self.subTest(invalid=invalid), self.assertRaises(c.Refused):
                actions.normalize_mandates(invalid)

    def test_named_mandates_are_read_from_the_run(self):
        self.assertEqual(actions.mandates_for(SimpleNamespace(mandate={'mandates':['SCM','CICDF']})),['SCM','CICDF'])
        self.assertEqual(actions.mandates_for(SimpleNamespace(mandate={})),['CAB'])


@unittest.skipUnless(os.environ.get('CAB_EFFECTS_FIXTURE')=='1','PostgreSQL isolé requis')
class ObservedActionTests(unittest.TestCase):
    setUp=fixtures.ProtocolTests.setUp
    finish=fixtures.ProtocolTests.finish
    begin=fixtures.ProtocolTests.begin
    validate=fixtures.ProtocolTests.validate

    def test_initialization_requires_exact_mandates_and_keeps_receipt(self):
        from cab_platform.core.models import ChangeStageIteration

        self.run.configuration[stage_protocol.KEY]['mandate_confirmation']=True
        self.run.mandate['mandates']=['SCM','CICDF','CABU']
        self.run.save(update_fields=['configuration','mandate'])
        first=self.begin(1)
        self.assertEqual(self.validate(first['attempt'])['missing'],['stage:1:mandate-confirmation-required'])
        packet={**self.ids,'request_id':'confirm-mandates','attempt':first['attempt'],'action':'mandats'}
        with self.assertRaisesRegex(c.Refused,'stage-mandates-divergent'):
            actions.declare(self.actor,{**packet,'mandates':['SCM']})
        result=actions.declare(self.actor,{**packet,'mandates':['CABU','SCM','CICDF']})
        self.assertEqual(actions.declare(self.actor,{**packet,'mandates':['CABU','SCM','CICDF']}),result)
        self.assertTrue(self.validate(first['attempt'])['validated'])
        row=ChangeStageIteration.objects.get(pk=result['id'])
        self.assertEqual(row.stage.key,'initialization.action-mandats')
        self.assertEqual(row.parent.stage.key,'initialization')
        self.assertEqual(row.receipt['mandates'],['SCM','CICDF','CABU'])
        self.assertIsNone(row.started_at)
        self.assertIsNotNone(row.ended_at)
        self.assertFalse(ChangeStageIteration.objects.filter(run=self.run,stage__key='initialization.action-prevol').exists())
        second=self.begin(1)
        self.assertEqual(self.validate(second['attempt'])['missing'],['stage:1:mandate-confirmation-required'])

    def test_late_receipt_updates_original_passage_even_after_reiteration(self):
        from cab_platform.core.models import ChangeStageIteration, Operation
        one=self.begin(1);self.validate(one['attempt'])
        first=self.begin(2)
        original=ChangeStageIteration.objects.get(run=self.run,stage__key='analysis',parent__isnull=True)
        Operation.objects.create(run=self.run,request_id='verified-action',input_digest='0'*64,
              source_revision='1'*64,dispatch_nonce='fixture',request={'phase':'verification'})
        self.validate(first['attempt'])
        self.begin(2)
        self.run.refresh_from_db()
        c.event(self.run,'operation-dispatched',{'request_id':'verified-action'})
        for _ in range(2):
            c.event(self.run,'operation-terminal',{'request_id':'verified-action','state':'COMPLETED','exit_code':0})
        row=ChangeStageIteration.objects.get(run=self.run,stage__key='analysis.action-execution')
        self.assertEqual(row.parent_id,original.pk)
        self.assertEqual(row.state,'COMPLETED')
        self.assertIsNotNone(row.started_at)
        self.assertGreaterEqual(row.ended_at,row.started_at)
