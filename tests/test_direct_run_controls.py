"""Contrôles ciblés des transitions directes et du routage MCP."""
from contextlib import ExitStack
from datetime import datetime, timezone
from pathlib import Path
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from django.conf import settings
if not settings.configured:
    settings.configure(SECRET_KEY='test',INSTALLED_APPS=['django.contrib.auth','django.contrib.contenttypes','cab_platform.core'],
                       DATABASES={'default':{'ENGINE':'django.db.backends.dummy'}})
import django
django.setup()

from cab_platform.core import commands, connectors, models, run_finalization, run_replacement


def make_run(name='first', **values):
    return SimpleNamespace(**{
        'pk':name,'run_id':name,'created':datetime(2026,11,21,tzinfo=timezone.utc),
        'mode':'direct','project_id':'cab','project':'project','actor_id':'actor','session_id':'sid',
        'change':name,'state':'WORKING','stage':None,'suspension':'','configuration':{},
        'mandate':{'native_source':{'source_file':'verified','inode':7}},'review':{},
        'save':MagicMock(),**values,
    })


class ReplacementTests(unittest.TestCase):
    def test_unstarted_run_is_archived_with_its_successor_and_idempotent_receipt(self):
        first=make_run('first',change='shared',state='FINALIZATION_PENDING',suspension='STOP',mandate={})
        next_run=make_run('second',change='shared',state='CLOSED')
        actor=SimpleNamespace(pk='actor')
        with patch.object(run_replacement,'require_unstarted') as verified, \
             patch.object(models.SessionArchive.objects,'create') as archive, \
             patch.object(commands,'event') as event:
            result=run_replacement.cancelled(first,next_run,actor,'receipt')
            self.assertEqual(result,run_replacement.cancelled(first,next_run,actor,'receipt'))
        self.assertEqual((first.state,first.suspension),(run_replacement.CANCELLED,''))
        self.assertEqual(result['run_id'],'second')
        self.assertFalse(result['executed'])
        verified.assert_called_once_with(first)
        archive.assert_called_once_with(run=first,actor=actor,request_id='receipt',evidence={'replacement':result})
        event.assert_called_once_with(first,'run-cancelled-before-start',result)

    def test_native_attachment_and_operation_make_cancellation_inadmissible(self):
        with self.assertRaisesRegex(commands.Refused,'already-started'):
            run_replacement.require_unstarted(make_run())
        no_effect=SimpleNamespace(exists=lambda:False)
        operation=SimpleNamespace(exists=lambda:True)
        first=make_run(mandate={},operation_set=operation,finalization_evidence=no_effect,git_effects=no_effect)
        with self.assertRaisesRegex(commands.Refused,'already-started'):
            run_replacement.require_unstarted(first)

    def test_different_change_or_session_cannot_be_linked(self):
        first=make_run('first')
        for run in (make_run('second'),make_run('second',change='first',session_id='another')):
            with self.subTest(run=run.run_id), self.assertRaisesRegex(commands.Refused,'replacement-divergent'):
                run_replacement.cancelled(first,run,SimpleNamespace(pk='actor'),'receipt')

    def test_suspended_run_does_not_advance_after_change_archive(self):
        first=make_run(suspension='STOP')
        with patch.object(models.Run.objects,'select_related') as runs, \
             patch.object(models.FinalizationPlan.objects,'get',return_value=SimpleNamespace(receipt={})) as plans, \
             patch.object(run_finalization,'dossier') as dossier:
            runs.return_value.get.return_value=first
            run_finalization.process(first.pk)
        plans.assert_called_once_with(run=first)
        dossier.assert_not_called()
        first.save.assert_not_called()


class ConcurrentDirectRunsTests(unittest.TestCase):
    def test_parallel_registration_preserves_anchor_even_with_a_pending_operation(self):
        anchor=make_run()
        extra=make_run('second')
        with patch.object(commands,'no_pending',return_value=False) as pending:
            self.assertTrue(connectors.register_parallel(anchor,extra))
        pending.assert_not_called()
        self.assertIs(extra.configuration['direct_parallel'],True)
        self.assertEqual(anchor.configuration,{})
        extra.save.assert_called_once_with(update_fields=['configuration'])

    def test_explicit_target_does_not_use_the_anchor_run_or_a_foreign_thread(self):
        actor=SimpleNamespace(pk='actor',agent='codex')
        anchor=make_run()
        extra=make_run('second',configuration={'direct_parallel':True})
        binding=SimpleNamespace(run=anchor)
        with ExitStack() as stack:
            stack.enter_context(patch.object(connectors,'worker_connector',return_value='worker'))
            threads=stack.enter_context(patch.object(models.McpThreadBinding.objects,'select_related'))
            threads.return_value.filter.return_value.first.return_value=binding
            stack.enter_context(patch.object(commands,'scope'))
            lookup=stack.enter_context(patch.object(commands,'run_scope',return_value=extra))
            result=connectors.current_worker_run(actor,{},read_only=True,native_thread='sid',
                                                 project_id='cab',run_id='second')
            self.assertIs(result,extra)
            lookup.assert_called_once_with(actor,'second','cab')
            extra.session_id='foreign'
            with self.assertRaisesRegex(commands.Refused,'connector-run-divergent'):
                connectors.current_worker_run(actor,{},read_only=True,native_thread='sid',
                                              project_id='cab',run_id='second')

    def test_ambiguous_implicit_target_refuses_instead_of_selecting_the_latest_run(self):
        actor=SimpleNamespace(pk='actor',agent='codex')
        with patch.object(connectors,'worker_connector',return_value='worker'), \
             patch.object(models.McpThreadBinding.objects,'select_related') as threads, \
             patch.object(models.Run.objects,'filter') as candidates:
            threads.return_value.filter.return_value.first.return_value=SimpleNamespace(run=make_run())
            candidates.return_value.exclude.return_value.exclude.return_value.filter.return_value.exclude.return_value.exists.return_value=True
            with self.assertRaisesRegex(commands.Refused,'session-run-target-required'):
                connectors.current_worker_run(actor,{},read_only=True,native_thread='sid')
