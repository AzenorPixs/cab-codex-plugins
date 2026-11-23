"""Contrat de mise à jour système séparé des passages de change."""
import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, call, patch

import test_stage_protocol as fixtures

from cab_platform.client import ClientError
from cab_platform.core import commands as c
from cab_platform.core.run_evidence import require_change_policy
from cab_platform.host_update_cli import request
from cab_platform.session_delivery import package_proof_required
from cab_platform.change_stage_metrics import HOST_UPDATE_ACTIONS, visible_receipt


class StandaloneCabuTests(unittest.TestCase):
    def test_new_change_does_not_accept_host_installation_proof(self):
        run=SimpleNamespace(mode='direct')
        clean={'requirements':[{'producer':'cab-delivery:p','kind':'publication'}]}
        require_change_policy(run,clean)
        for policy in ({**clean,'update_request_id':'host-update'}, {'requirements':[{'producer':'cab-update'}]}):
            with self.subTest(policy=policy), self.assertRaisesRegex(c.Refused,'host-update-outside-change-cycle'):
                require_change_policy(run,policy)

    def test_debian_package_proof_does_not_depend_on_installation(self):
        plan={'debian':True,'evidence_producer':'cab-delivery:p'}
        rules=[{'kind':'publication','producer':'cab-delivery:p','artifact_group':'package'}]
        self.assertTrue(package_proof_required(plan,rules))
        self.assertFalse(package_proof_required({**plan,'debian':False},rules))

    def test_cli_uses_the_same_service_receipt_with_no_reinstallation(self):
        client=Mock()
        client.command.side_effect=[{'state':'QUEUED'},ClientError('cab-unavailable'),{'state':'OK','version':'3.9.12'}]
        with patch('cab_platform.host_update_cli.time.sleep'):
            result=request(client,'standalone-1','3.9.12',1000)
        self.assertEqual(result['state'],'OK')
        self.assertEqual(client.command.call_args_list,[
            call('system.update',{'request_id':'standalone-1','version':'3.9.12'}),
            call('system.update.status',{'request_id':'standalone-1'}),
            call('system.update.status',{'request_id':'standalone-1'}),
        ])

    def test_missing_admission_reply_preserves_the_request_id(self):
        client=Mock()
        client.command.side_effect=ClientError('cab-unavailable')
        result=request(client,'standalone-2','3.9.12',1000)
        self.assertEqual(result['state'],'ADMISSION_UNCONFIRMED')
        self.assertEqual(result['request_id'],'standalone-2')
        self.assertEqual(client.command.call_count,1)

    def test_old_mandate_receipt_is_filtered_only_for_display(self):
        receipt={'mandates':['SCM','CICDF','CABU']}
        self.assertEqual(visible_receipt(receipt),{'mandates':['SCM','CICDF']})
        self.assertEqual(receipt['mandates'][-1],'CABU')
        self.assertIn('closure.action-installation',HOST_UPDATE_ACTIONS)

    def test_public_cli_routes_update_through_the_service(self):
        from cab_platform.cli import main
        with patch('cab_platform.cli.Client') as client, patch('builtins.print'):
            client.return_value.command.return_value={'state':'OK','version':'3.9.12'}
            self.assertEqual(main(['update','--version','3.9.12','--request-id','cli-verified']),0)
        client.return_value.command.assert_called_once_with('system.update',{'request_id':'cli-verified','version':'3.9.12'})


@unittest.skipUnless(os.environ.get('CAB_EFFECTS_FIXTURE')=='1','PostgreSQL isolé requis')
class LegacyDisplayTests(unittest.TestCase):
    setUp=fixtures.ProtocolTests.setUp
    finish=fixtures.ProtocolTests.finish
    begin=fixtures.ProtocolTests.begin

    def test_historical_action_remains_in_pg_but_not_in_stage_detail(self):
        from django.utils import timezone
        from cab_platform.change_stage_metrics import summarize
        from cab_platform.core.models import ChangeStage,ChangeStageIteration
        self.begin(1)
        self.run.refresh_from_db()
        parent=ChangeStageIteration.objects.get(run=self.run,parent__isnull=True)
        start=timezone.now()
        mandate,_=ChangeStage.objects.get_or_create(change=parent.stage.change,key='initialization.action-mandats',parent=parent.stage)
        ChangeStageIteration.objects.create(run=self.run,stage=mandate,parent=parent,
            description='Prévol réalisé. CABU annoncé plus tard.',description_source='agent',started_at=start,
            ended_at=start,receipt={'mandates':['SCM','CABU'],'note':'Le texte CABU reste dans le reçu.'})
        close=ChangeStage.objects.create(change=parent.stage.change,key='closure')
        root=ChangeStageIteration.objects.create(run=self.run,stage=close,started_at=start,ended_at=start)
        update=ChangeStage.objects.create(change=close.change,key='closure.action-installation',parent=close)
        record=ChangeStageIteration.objects.create(run=self.run,stage=update,parent=root,
             description_source='cab',started_at=start,ended_at=start,receipt={'event_id':7})
        result=summarize(parent.stage.change,self.run)
        self.assertNotIn('CABU',str(result))
        self.assertFalse(result['stages'][-1]['children'])
        self.assertTrue(ChangeStageIteration.objects.filter(pk=record.pk).exists())
