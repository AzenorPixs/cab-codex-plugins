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
        self.scope='codex'

    def test_two_channels_are_always_an_excess(self):
        self.assertFalse(m.conditions([self.connector],self.now)[1])
        self.assertTrue(m.conditions([self.connector,self.connector],self.now)[1])

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
            row.relay_version=row.loaded_version=__version__
            row.catalog_version=''
            row.state='CATALOG_PENDING'
            row.seen=self.now+timedelta(seconds=66)
            m.inspect(self.scope,[row],row.seen)
            self.assertEqual(notify.call_count,1)
            row.state='READY'
            row.catalog_version=__version__
            m.inspect(self.scope,[row],row.seen)
            self.assertEqual(notify.call_count,1)
            row.seen+=m.FRESH
            m.inspect(self.scope,[row],row.seen)
        self.assertEqual(notify.call_count,2)
        self.assertTrue(McpConvergence.objects.get(pk=self.scope).incident['finished'])
        self.assertTrue(notify.call_args_list[0].args[0].endswith(':start'))
        self.assertTrue(notify.call_args_list[1].args[0].endswith(':end'))

    def test_catalog_flaps_do_not_rearm_topology(self):
        rows=[self.connector, McpConnector.objects.create(
            pk=uuid4().hex, actor=self.actor, agent='codex', process={'pid':15}, worker={'pid':16},
        )]
        for row in rows:
            row.state='READY'
            row.relay_version=row.loaded_version=row.catalog_version=__version__

        def observe(seconds, observed):
            now=self.now+timedelta(seconds=seconds)
            for row in observed:
                row.seen=now
            m.inspect(self.scope,observed,now)

        def request_topology(scope, observed, incident, now, crowded):
            incident['topology_request']='MCP-TOPOLOGY-fixture'

        with patch.object(m,'alive',return_value=True), \
             patch.object(m,'update_in_progress',return_value=False), \
             patch.object(m,'try_topology',side_effect=request_topology) as attempt, \
             patch.object(m,'publish') as notify:
            observe(0,rows)
            rows[1].state='CATALOG_PENDING'
            observe(10,rows)
            rows[1].state='READY'
            observe(15,rows)
            observe(29,rows)
            attempt.assert_not_called()
            observe(30,rows)
            attempt.assert_called_once()
            observe(35,rows[:1])
            observe(40,[])
            observe(45,rows[:1])
            self.assertEqual(notify.call_count,1)
            observe(50,rows)
            observe(65,rows)
            observe(80,rows)
            attempt.assert_called_once()
            observe(85,rows[:1])
            observe(100,rows[:1])
            self.assertEqual(notify.call_count,2)


if __name__=='__main__':
    with transaction.atomic():
        migration=('cab_core','0044_mcp_shared_binding')
        executor=MigrationExecutor(connection)
        if migration not in executor.loader.applied_migrations:
            executor.migrate([migration])
        suite=unittest.defaultTestLoader.loadTestsFromTestCase(ConvergenceTests)
        passed=unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful()
        transaction.set_rollback(True)
    raise SystemExit(not passed)
