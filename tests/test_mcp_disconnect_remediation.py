"""Qualification sur l’hôte, avec annulation des fixtures et de la migration de test."""
from datetime import timedelta
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
from uuid import uuid4

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
os.environ['CAB_MIGRATE']='1'
import django

django.setup()

from django.db import connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.utils import timezone
from cab_platform import __version__, mcp_disconnect_recovery as recovery
from cab_platform.core import connectors, native_control
from cab_platform.core.commands import Refused
from cab_platform.core.models import Actor, McpConnector, McpDisconnectRecovery, Notification
from cab_platform.notifications import identifier
from test_process_registry import BinaryRegistryTests


class RecoveryTests(unittest.TestCase):
    def setUp(self):
        key=uuid4().hex
        self.actor=Actor.objects.create(pk=key,uid=1000,agent='codex',token_hash=key)
        self.process={'pid':987650,'parent_pid':987651,'uid':1000,'start':'12','boot':'fixture'}
        owner={**self.process,'pid':987651,'parent_pid':1}
        self.anchor={'owner':owner,'location':'workspace'}
        self.connector=McpConnector.objects.create(pk=key,actor=self.actor,agent='codex',state='READY',
                           process=self.process,worker={**self.process,'pid':987652},
                           loaded_version=__version__,catalog_version=__version__)
        self.patches=[]
        for module,name,value in ((connectors,'alive',True),(recovery,'alive',True),
                                  (recovery,'active_owner',True),(recovery,'update_in_progress',False),
                                  (recovery,'capture_anchor',self.anchor)):
            self.patches.append(patch.object(module,name,return_value=value))
            self.patches[-1].start();self.addCleanup(self.patches[-1].stop)

    def lose(self):
        connectors.project_connector(self.connector)
        self.connector.state='FAILED'
        self.connector.save()
        connectors.project_connector(self.connector)
        connectors.project_connector(self.connector)
        record=McpDisconnectRecovery.objects.get(connector=self.connector)
        record.created=timezone.now()-timedelta(seconds=8)
        McpDisconnectRecovery.objects.filter(pk=record.pk).update(created=record.created)
        return record

    def test_falling_edge_and_success_require_fresh_catalog(self):
        record=self.lose()
        with patch.object(native_control,'request',return_value={'request_id':'FIXTURE-NATIVE'}) as request:
            recovery.advance(record.pk,self.actor.pk)
            self.assertEqual(request.call_count,1)
        record.refresh_from_db()
        self.assertEqual(record.state,'NATIVE')
        self.connector.state='CATALOG_PENDING'
        self.connector.catalog_version=''
        self.connector.save()
        recovery.advance(record.pk,self.actor.pk)
        key=identifier(f'mcp-disconnect-recovery:{record.pk}')
        self.assertFalse(Notification.objects.filter(pk=key).exists())
        self.connector.state='READY'
        self.connector.catalog_version=__version__
        self.connector.save()
        recovery.advance(record.pk,self.actor.pk)
        recovery.advance(record.pk,self.actor.pk)
        record.refresh_from_db()
        self.assertEqual(record.state,'SUCCEEDED')
        self.assertEqual(record.report['restored_connector'],self.connector.pk)
        self.assertIn('Fin :',Notification.objects.get(pk=key).body)

    def test_dead_agent_does_not_trigger_native_control(self):
        record=self.lose()
        with patch.object(recovery,'active_owner',return_value=False), patch.object(native_control,'request') as request:
            recovery.advance(record.pk,self.actor.pk)
            request.assert_not_called()
        record.refresh_from_db()
        self.assertEqual(record.state,'SKIPPED')

    def test_one_relay_claim_and_failure_report_without_replay(self):
        record=self.lose()
        with patch.object(native_control,'request',side_effect=Refused('native-socket-required')):
            recovery.advance(record.pk,self.actor.pk)
        peer={'pid':self.process['pid'],'uid':self.actor.uid}
        with patch.object(recovery,'identity',return_value=self.process):
            self.assertTrue(recovery.claim(self.actor,{'connector_id':self.connector.pk},peer)['reload'])
            self.assertFalse(recovery.claim(self.actor,{'connector_id':self.connector.pk},peer)['reload'])
        McpDisconnectRecovery.objects.filter(pk=record.pk).update(created=timezone.now()-timedelta(seconds=100))
        recovery.advance(record.pk,self.actor.pk)
        record.refresh_from_db()
        self.assertEqual(record.state,'FAILED')
        self.assertIn('échouée',Notification.objects.get(pk=identifier(f'mcp-disconnect-recovery:{record.pk}')).title)

    def test_uncertain_connector_never_dispatches(self):
        record=self.lose()
        self.connector.uncertain=True
        self.connector.save()
        with patch.object(native_control,'request') as request:
            recovery.advance(record.pk,self.actor.pk)
            request.assert_not_called()
        record.refresh_from_db()
        self.assertEqual(record.state,'QUEUED')


if __name__=='__main__':
    with transaction.atomic():
        migration=('cab_core','0040_mcp_disconnect_recovery')
        executor=MigrationExecutor(connection)
        if migration not in executor.loader.applied_migrations:
            executor.migrate([migration])
        suite=unittest.TestSuite()
        for case in (BinaryRegistryTests,RecoveryTests):
            suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(case))
        passed=unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful()
        transaction.set_rollback(True)
    raise SystemExit(not passed)
