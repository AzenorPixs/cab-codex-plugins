"""Contrôles sur PostgreSQL annulés après essai."""
from datetime import timedelta
import os
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from uuid import uuid4

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
os.environ['CAB_MIGRATE']='1'
import django
django.setup()

from django.db import connection,transaction
from django.db.migrations.executor import MigrationExecutor
from django.utils import timezone
from cab_platform import __version__, mcp_convergence as m
from cab_platform.core.models import Actor,McpConnector,McpConvergence,McpDisconnectRecovery


class ConvergenceTests(unittest.TestCase):
    def setUp(self):
        key=uuid4().hex
        self.actor=Actor.objects.create(pk=key,uid=9876,agent='codex',token_hash=key)
        self.now=timezone.now()
        self.connector=McpConnector.objects.create(pk=key,actor=self.actor,agent='codex',
                process={'pid':12},worker={'pid':13},state='READY',loaded_version='3.2.20',
                catalog_version='3.2.20',recovery_anchor={'owner':{'pid':14}})
        self.scope='codex:'+str(self.actor.uid)

    def test_two_distinct_channels_are_retained_but_shared_channel_is_flagged(self):
        rows=[self.connector,self.connector]
        with patch.object(m,'attachment',side_effect=[('one','two'),('three','four')]):
            self.assertFalse(m.conditions(rows,self.now)[1])
        with patch.object(m,'attachment',side_effect=[('one','two'),('one','three')]):
            self.assertTrue(m.conditions(rows,self.now)[1])
        with patch.object(m,'attachment',side_effect=[None,('one','two')]):
            self.assertTrue(m.conditions(rows,self.now)[1])

    def test_retry_until_catalog_and_two_notifications_only(self):
        row=self.connector
        with patch.object(m,'alive',return_value=True),patch.object(m,'active_owner',return_value=True), \
             patch.object(m,'update_in_progress',return_value=False),patch.object(m,'publish') as notify:
            m.inspect(self.scope,[row],self.now)
            first=McpDisconnectRecovery.objects.get(connector=row)
            self.assertEqual(first.purpose,'convergence')
            m.inspect(self.scope,[row],self.now+timedelta(seconds=2))
            self.assertEqual(McpDisconnectRecovery.objects.filter(connector=row).count(),1)
            first.finished=self.now+timedelta(seconds=3)
            first.state='FAILED'
            first.save()
            m.inspect(self.scope,[row],self.now+timedelta(seconds=65))
            self.assertEqual(McpDisconnectRecovery.objects.filter(connector=row).count(),2)
            self.assertEqual(notify.call_count,1)
            row.loaded_version=__version__
            row.catalog_version=''
            row.state='CATALOG_PENDING'
            row.seen=self.now+timedelta(seconds=66)
            m.inspect(self.scope,[row],row.seen)
            self.assertEqual(notify.call_count,1)
            row.state='READY'
            row.catalog_version=__version__
            m.inspect(self.scope,[row],row.seen)
            m.inspect(self.scope,[row],row.seen)
        self.assertEqual(notify.call_count,2)
        self.assertTrue(McpConvergence.objects.get(pk=self.scope).incident['finished'])
        self.assertTrue(notify.call_args_list[0].args[0].endswith(':start'))
        self.assertTrue(notify.call_args_list[1].args[0].endswith(':end'))


if __name__=='__main__':
    with transaction.atomic():
        migration=('cab_core','0043_mcp_convergence')
        executor=MigrationExecutor(connection)
        if migration not in executor.loader.applied_migrations:
            executor.migrate([migration])
        suite=unittest.defaultTestLoader.loadTestsFromTestCase(ConvergenceTests)
        passed=unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful()
        transaction.set_rollback(True)
    raise SystemExit(not passed)
