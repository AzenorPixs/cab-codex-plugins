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

    def test_post_close_update_requires_explicit_package_proof(self):
        from cab_platform.finalization_contract import ContractError, validate
        rule={'id':'publish','producer':'cab-delivery:p','kind':'publication','criteria':['livré']}
        policy={'nature':'delivery','post_close_cabu':True,'requirements':[rule]}
        with self.assertRaisesRegex(ContractError,'finalization-post-close-cabu-package-proof-required'):
            validate(policy,['livré'],'direct',legacy=False)
        rule['artifact_group']='package'
        self.assertIs(validate(policy,['livré'],'direct',legacy=False)['post_close_cabu'],True)
        with self.assertRaisesRegex(ContractError,'finalization-post-close-cabu-package-proof-required'):
            validate(policy,['livré'],'piloted',legacy=False)

    def test_divergent_published_package_stops_before_apt(self):
        from pathlib import Path
        from tempfile import TemporaryDirectory
        from cab_platform import update

        with TemporaryDirectory() as work:
            root=Path(work)
            package=root/'cab.deb'
            package.write_bytes(b'different package')
            with patch.object(update,'STATE',root), patch.object(update.os,'getuid',return_value=0), \
                 patch.object(update.subprocess,'check_output',side_effect=['3.46.3','cab','3.47.0']), \
                 patch.object(update.subprocess,'run',return_value=SimpleNamespace(returncode=1)) as run, \
                 patch.object(update,'preflight_package') as preflight:
                with self.assertRaisesRegex(ClientError,'update-published-package-divergent'):
                    update.update(package,version='3.47.0',expected_package_sha256='a'*64)
                run.assert_called_once()
                self.assertEqual(run.call_args.args[0][0],'/usr/bin/dpkg')
                preflight.assert_not_called()

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


@unittest.skipUnless(os.environ.get('CAB_EFFECTS_FIXTURE')=='1','PostgreSQL isolé requis')
class AutomaticCabuTests(unittest.TestCase):
    setUp=fixtures.ProtocolTests.setUp
    finish=fixtures.ProtocolTests.finish

    def seal_delivery(self,package_sha='a'*64,published_sha='a'*64):
        from cab_platform.core.models import GitDelivery,GitDeliveryStep,GitSessionIndex
        from cab_platform.stage_protocol import KEY

        self.project.identifier='cab'
        self.project.save(update_fields=['identifier'])
        sha=c.revision(self.run)
        self.plan.policy={'nature':'delivery','post_close_cabu':True,'target_version':'3.47.0'}
        self.plan.digest=c.digest(self.plan.policy)
        self.plan.phase='CLOSED'
        self.plan.receipt={'receipt_id':'fixture-closure','delivered':True,'source_revision':sha,
                           'artifact_groups':{'package':published_sha}}
        self.plan.save()
        self.run.review={'closure':self.plan.receipt}
        self.run.configuration[KEY]['active']['11']={'validated':True,'cab':{'version':'3.47.0'}}
        self.run.state='CLOSED'
        self.run.save(update_fields=['state','review','configuration'])
        index=GitSessionIndex.objects.create(initial_run=self.run,change_id=self.run.change_record_id,
                                             session_id=self.run.coding_session_id,index_path='fixture')
        delivery=GitDelivery.objects.create(run=self.run,project=self.project,git_index=index,version='3.47.0',
                         state='COMPLETED',commit_oid='a'*40,tag_oid='b'*40,plan={'source_revision':sha})
        GitDeliveryStep.objects.create(delivery=delivery,key='verify:package',state='COMPLETED',
                                      receipt={'package_sha256':package_sha,'verified':True})
        return delivery

    def test_sealed_delivery_archives_and_queues_once(self):
        from cab_platform.core.models import Event,SessionArchive,SystemUpdate
        from cab_platform.system_updates import enqueue_closed_delivery

        delivery=self.seal_delivery()
        with patch('cab_platform.core.run_lifecycle.evaluate',return_value={'archive_allowed':True,'evaluation_digest':'verified'}), \
             patch('cab_platform.core.connectors.snapshot',return_value=[]):
            job=enqueue_closed_delivery(self.run.pk)
            self.assertIsNone(enqueue_closed_delivery(self.run.pk))
        self.assertEqual(job['state'],'QUEUED')
        audit=SystemUpdate.objects.get(pk=f'AUTO-CABU-{self.run.pk}')
        self.assertEqual(audit.result['delivery_proof'],
                         {'delivery_id':delivery.pk,'closure_receipt':'fixture-closure','package_sha256':'a'*64})
        self.assertTrue(SessionArchive.objects.filter(run=self.run).exists())
        self.assertEqual(Event.objects.filter(run=self.run,kind='post-close-cabu-queued').count(),1)

    def test_divergent_package_blocks_before_archive_and_update(self):
        from cab_platform.core.models import SessionArchive,SystemUpdate
        from cab_platform.system_updates import enqueue_pending_deliveries

        self.seal_delivery(published_sha='b'*64)
        enqueue_pending_deliveries()
        self.run.refresh_from_db()
        self.assertEqual(self.run.configuration['post_close_update'],
                         {'state':'BLOCKED','reason':'post-close-cabu-package-unverified'})
        self.assertFalse(SessionArchive.objects.filter(run=self.run).exists())
        self.assertFalse(SystemUpdate.objects.filter(actor=self.actor).exists())


@unittest.skipUnless(os.environ.get('CAB_EFFECTS_FIXTURE')=='1','PostgreSQL isolé requis')
class ConnectorProjectionLockTests(unittest.TestCase):
    def test_connector_projection_allows_key_share_and_serializes_writers(self):
        from concurrent.futures import ThreadPoolExecutor
        from uuid import uuid4
        from django.db import OperationalError, connection, connections, transaction
        from cab_platform.core.connectors import project_connector
        from cab_platform.core.models import Actor,McpConnector,McpConnectorProjection

        key=uuid4().hex
        actor=Actor.objects.create(pk=key,uid=os.getuid(),agent='fixture',token_hash=key)
        connector=McpConnector.objects.create(pk=key,actor=actor,agent='fixture',process={},worker={})
        self.addCleanup(actor.delete)
        self.addCleanup(connector.delete)
        self.addCleanup(McpConnectorProjection.objects.filter(connector=connector).delete)

        def check_concurrent_locks():
            try:
                with connection.cursor() as cursor:
                    cursor.execute('SELECT id FROM mcp_connectors WHERE id=%s FOR KEY SHARE NOWAIT',[key])
                    self.assertEqual(cursor.fetchone(),(key,))
                with self.assertRaises(OperationalError),connection.cursor() as cursor:
                    cursor.execute('SELECT id FROM mcp_connectors WHERE id=%s FOR UPDATE NOWAIT',[key])
            finally:
                connections.close_all()

        with transaction.atomic(),ThreadPoolExecutor(max_workers=1) as pool:
            project_connector(connector)
            pool.submit(check_concurrent_locks).result(timeout=10)
