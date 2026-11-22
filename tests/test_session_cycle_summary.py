"""Synthèse des cycles, isolation du RUN et projection Electric autorisée."""
from datetime import timedelta
from decimal import Decimal
import unittest
from unittest.mock import patch

from django.utils import timezone
import test_stage_protocol as fixtures
from cab_platform.change_stage_metrics import cycle_summary, finish_cycle, keys_for
from cab_platform.core.models import RunCycleIteration
from cab_platform.time_projection import refresh


class CycleSummaryTests(unittest.TestCase):
    setUp=fixtures.ProtocolTests.setUp
    finish=fixtures.ProtocolTests.finish
    begin=fixtures.ProtocolTests.begin

    def test_interrupted_complete_zero_and_open_cycles_persist_without_recounting(self):
        self.begin(1)
        first=RunCycleIteration.objects.get(run=self.run)
        finish_cycle(first,first.started_at+timedelta(seconds=100.1),keys_for(self.run))
        self.assertFalse(first.complete)
        RunCycleIteration.objects.create(run=self.run,number=2,started_at=first.ended_at,
            ended_at=first.ended_at+timedelta(seconds=200.2),duration_seconds=Decimal('200.2'),complete=True)
        RunCycleIteration.objects.create(run=self.run,number=3,started_at=first.ended_at,
            ended_at=first.ended_at,duration_seconds=0)
        self.assertTrue(refresh(self.run.pk))
        self.run.refresh_from_db()
        summary=self.run.cycle_summary
        self.assertEqual(summary['iteration_count'],3)
        self.assertEqual(summary['duration_seconds'],300.3)
        self.assertEqual(summary['agent_seconds'],300.3)
        self.assertEqual(summary['cab_seconds'],0)
        self.assertEqual(summary['last_duration_seconds'],0)
        self.assertTrue(summary['duration_complete'])
        self.assertFalse(refresh(self.run.pk))
        RunCycleIteration.objects.create(run=self.run,number=4,started_at=timezone.now())
        self.assertTrue(refresh(self.run.pk))
        self.run.refresh_from_db()
        summary=self.run.cycle_summary
        self.assertEqual(summary['iteration_count'],4)
        self.assertEqual(summary['measured_count'],3)
        self.assertEqual(summary['duration_seconds'],300.3)
        self.assertFalse(summary['duration_complete'])
        self.assertFalse(summary['agent_seconds_complete'])
        self.assertIsNone(summary['last_duration_seconds'])
        self.assertIsNone(summary['last_ended_at'])
        self.assertFalse(refresh(self.run.pk))

    def test_empty_is_unknown_and_open_cycle_count_is_persisted_immediately(self):
        self.assertEqual(cycle_summary([]),{})
        self.begin(1)
        self.run.refresh_from_db()
        self.assertEqual(self.run.cycle_summary['iteration_count'],1)
        self.assertIsNone(self.run.cycle_summary['duration_seconds'])
        self.assertIsNone(self.run.cycle_summary['last_ended_at'])

    def test_decimal_totals_and_missing_attribution(self):
        now=timezone.now()
        rows=[{'number':n,'started_at':now,'ended_at':now,'duration_seconds':value,
               'cab_seconds':value,'agent_seconds':0,'waiting_seconds':0}
              for n,value in enumerate((0.1,0.2),1)]
        self.assertEqual(cycle_summary(rows)['duration_seconds'],0.3)
        rows[0]['cab_seconds']=None
        self.assertEqual(cycle_summary(rows)['cab_seconds'],0.2)
        self.assertFalse(cycle_summary(rows)['cab_seconds_complete'])

    def test_electric_projects_summary_only_for_authorized_run(self):
        from django.test import RequestFactory
        from cab_platform import web_views
        self.begin(1)
        request=RequestFactory().get('/api/v1/sync/run-data/run',self.ids)
        with patch.object(web_views,'principal',return_value=self.actor), \
             patch.object(web_views,'config',return_value={'electric_secret':'fixture'}), \
             patch('httpx.get') as get:
            get.return_value.status_code=200
            get.return_value.content=b'[]'
            get.return_value.headers={}
            self.assertEqual(web_views.sync_run_data(request,'run').status_code,200)
            params=get.call_args.kwargs['params']
            self.assertIn('cycle_summary',params['columns'].split(','))
            self.assertEqual(params['where'],'id = '+str(self.run.pk))
            request=RequestFactory().get('/api/v1/sync/run-data/run',{**self.ids,'run_id':'foreign-run'})
            get.reset_mock()
            self.assertEqual(web_views.sync_run_data(request,'run').status_code,403)
            get.assert_not_called()


class SessionDeletionTests(unittest.TestCase):
    setUp = fixtures.ProtocolTests.setUp
    finish = fixtures.ProtocolTests.finish
    begin = fixtures.ProtocolTests.begin

    def removal(self, preview, **confirmations):
        from cab_platform.core.session_cleanup import delete

        return delete(self.actor, {
            **self.ids, 'request_id': 'remove-session',
            'expected_deletion_digest': preview['deletion_digest'],
            'confirm_irreversible': True, **confirmations,
        })

    def test_delete_without_closure_cleans_owned_cycles_and_keeps_shared_data(self):
        from cab_platform.change_stage_metrics import refresh_total
        from cab_platform.core.commands import Refused
        from cab_platform.core.models import ChangeStageIteration, CodingSession, CycleTokenUsage, Run, SessionProjection
        from cab_platform.core.session_cleanup import deletion_preview

        self.begin(1)
        self.run.refresh_from_db()
        cycle = self.run.cycle_iterations.get()
        main = self.run.stage_iterations.get(parent__isnull=True)
        change, sid = self.run.change_record, self.run.coding_session
        other = Run.objects.create(
            project=self.project, actor=self.actor, change_record=change, coding_session=sid,
            run_id='peer', session_id=self.run.session_id, change=self.run.change, mode='direct',
        )
        child = ChangeStageIteration.objects.create(
            stage=main.stage, parent=main, cycle=cycle, run=self.run, started_at=main.started_at,
        )
        peer = ChangeStageIteration.objects.create(
            stage=main.stage, run=other, started_at=main.started_at,
            ended_at=main.started_at + timedelta(seconds=12), duration_seconds=12,
        )
        refresh_total(main.stage_id)
        CycleTokenUsage.objects.create(
            project=self.project, change=change, session=sid, run=self.run, stage_passage=main,
            action=child, native_key='usage-own', observed_at=main.started_at, role='coder', input_tokens=11,
        )
        own_run = self.run.pk
        view = deletion_preview(self.actor, self.ids)
        self.assertEqual(view['reasons'], ['session-not-closed'])
        self.assertFalse(view['allowed'])
        self.assertTrue(view['allowed_without_closure'])
        self.assertEqual(view['counts']['token_usage'], 1)
        with self.assertRaisesRegex(Refused, 'session-delete-protected'):
            self.removal(view, confirm_shared=True)
        with self.assertRaisesRegex(Refused, 'session-delete-shared-confirmation-required'):
            self.removal(view, confirm_without_closure=True)
        receipt = self.removal(view, confirm_without_closure=True, confirm_shared=True)
        self.assertTrue(receipt['closure_bypassed'])
        self.assertEqual(receipt, self.removal(view, confirm_without_closure=True, confirm_shared=True))
        self.assertFalse(Run.objects.filter(pk=own_run).exists())
        self.assertFalse(RunCycleIteration.objects.filter(pk=cycle.pk).exists())
        self.assertFalse(ChangeStageIteration.objects.filter(pk__in=[main.pk, child.pk]).exists())
        self.assertFalse(CycleTokenUsage.objects.filter(native_key='usage-own').exists())
        self.assertFalse(SessionProjection.objects.filter(binding_id=own_run).exists())
        self.assertTrue(CodingSession.objects.filter(pk=sid.pk).exists())
        self.assertTrue(ChangeStageIteration.objects.filter(pk=peer.pk, run=other).exists())
        stage = main.stage
        stage.refresh_from_db()
        self.assertEqual((stage.iteration_count, stage.duration_seconds), (1, Decimal('12')))
        self.assertEqual((self.root/'code.txt').read_text(), 'fixture')

    def test_current_preview_cannot_override_effects_or_shared_stage_links(self):
        from cab_platform.core.commands import Refused
        from cab_platform.core.models import ChangeStageIteration, Operation, Run
        from cab_platform.core.session_cleanup import deletion_preview

        self.begin(1)
        current = deletion_preview(self.actor, self.ids)
        operation = Operation.objects.create(run=self.run, request_id='unknown', state='UNKNOWN')
        with self.assertRaisesRegex(Refused, 'session-delete-preview-stale'):
            self.removal(current, confirm_without_closure=True)
        protected = deletion_preview(self.actor, self.ids)
        self.assertIn('closure-effects-protected', protected['reasons'])
        self.assertFalse(protected['allowed_without_closure'])
        with self.assertRaisesRegex(Refused, 'session-delete-protected'):
            self.removal(protected, confirm_without_closure=True)
        operation.delete()
        other = Run.objects.create(
            project=self.project, actor=self.actor, run_id='other', session_id='other',
            change=self.run.change, mode='direct',
        )
        parent = self.run.stage_iterations.get(parent__isnull=True)
        ChangeStageIteration.objects.create(stage=parent.stage, parent=parent, run=other)
        protected = deletion_preview(self.actor, self.ids)
        self.assertIn('session-shared-stage-protected', protected['reasons'])
        self.assertFalse(protected['allowed_without_closure'])

    def test_proven_closure_uses_existing_confirmations_and_removes_unused_sid(self):
        from cab_platform.core.models import CodingSession, Event
        from cab_platform.core.session_cleanup import deletion_preview

        self.run.refresh_from_db()
        sid = self.run.coding_session_id
        self.assertIsNotNone(sid)
        receipt = {'branch': 'TERMINÉ'}
        self.run.state = 'CLOSED'
        self.run.review = {'closure': receipt}
        self.run.save(update_fields=['state', 'review'])
        Event.objects.create(project=self.project, run=self.run, kind='run-closed', data=receipt)
        view = deletion_preview(self.actor, self.ids)
        self.assertTrue(view['allowed'])
        self.assertFalse(view['allowed_without_closure'])
        result = self.removal(view)
        self.assertFalse(result['closure_bypassed'])
        self.assertTrue(result['coding_session_deleted'])
        self.assertFalse(CodingSession.objects.filter(pk=sid).exists())
