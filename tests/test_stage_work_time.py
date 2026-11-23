"""Régressions du temps observé et de la cadence des rappels."""
from datetime import datetime, timedelta, timezone
import io
import json
import os
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from uuid import uuid4

if os.environ.get('CAB_EFFECTS_FIXTURE') == '1':
    import django
    django.setup()
else:
    import test_git_commit_metadata  # Initialisation Django sans base.

from cab_platform import change_stage_metrics as metrics, measurement_sources, stage_reminders


class DurationTests(unittest.TestCase):
    now = datetime(2026, 11, 22, tzinfo=timezone.utc)

    def at(self, seconds):
        return self.now + timedelta(seconds=seconds)

    def test_observed_union_separates_night_wait(self):
        native = (self.at(-1), ((self.at(-1),self.at(5)), (self.at(20),self.at(30))), (), (), None)
        self.assertEqual(metrics.split_time(self.at(0),self.at(29_576),native,
                                           [(self.at(4),self.at(15))]), (25,29_551))

    def test_missing_native_coverage_does_not_become_idle(self):
        self.assertEqual(metrics.split_time(self.at(0),self.at(20),None,[(self.at(7),self.at(10))]),(3,None))
        self.assertEqual(metrics.split_time(self.at(0),self.at(20),None,[]),(None,None))

    def test_unfinished_turn_does_not_become_idle(self):
        self.assertEqual(metrics.split_time(self.at(0),self.at(20),(self.at(-1),(),(self.at(2),),(),None),[]),(None,None))

    def test_legacy_closure_uses_actual_event_bounds(self):
        start={'id':1,'kind':'finalization-started','created':self.at(30)}
        end={'id':2,'kind':'run-closed','created':self.at(38)}
        self.assertEqual(list(metrics._restore_stage_passages(None,[start,end],set())),[('closure',start,end)])
        self.assertEqual(list(metrics._restore_stage_passages(None,[start,end],{'closure'})),[])

    def test_closure_counts_parallel_phase_wait_separately(self):
        self.assertEqual(metrics.split_time(self.at(0),self.at(200),None,[],work_from=self.at(190)),(10,190))

    def test_native_parser_keeps_only_timestamp_and_turn_bounds(self):
        records=[
            ('session_meta',{},0),
            ('event_msg',{'type':'task_started','turn_id':'one'},10),
            ('event_msg',{'type':'task_complete','turn_id':'one','last_agent_message':'private'},14),
            ('event_msg',{'type':'turn_aborted','turn_id':'two','duration_ms':2000},22),
        ]
        data=b''.join((json.dumps({'type':kind,'payload':payload,'timestamp':self.at(at).isoformat()})+'\n').encode() for kind,payload,at in records)
        result=measurement_sources._time_lines(io.BytesIO(data),len(data))
        self.assertEqual(result[:4],(self.at(0),((self.at(10),self.at(14)),(self.at(20),self.at(22))),(),()))
        self.assertNotIn('private',repr(result))

    def test_missing_control_binary_is_a_known_non_start(self):
        from cab_platform.execution import _bounded_process
        callback = unittest.mock.Mock()
        state, exit_code, message = _bounded_process(['cab-test-missing-executable-396'],os.getuid(),1000,callback)
        self.assertEqual((state,exit_code),('FAILED_TO_START',None))
        self.assertIn('introuvable',message)
        callback.assert_not_called()


class ReminderTests(unittest.TestCase):
    def test_three_short_then_delayed_then_final_and_reset(self):
        start = DurationTests.now
        attempts = []
        for count, offset in enumerate((300,600,900,2700,17100),1):
            at=start+timedelta(seconds=offset)
            self.assertIsNone(stage_reminders.due_reminder(start,attempts,at-timedelta(seconds=1),stage_reminders.DEFAULTS))
            self.assertEqual(stage_reminders.due_reminder(start,attempts,at,stage_reminders.DEFAULTS),count)
            attempts.insert(0,SimpleNamespace(created=at,data={'state':'SENT'}))
        self.assertIsNone(stage_reminders.due_reminder(start,attempts,at+timedelta(days=2),stage_reminders.DEFAULTS))
        self.assertEqual(stage_reminders.due_reminder(at+timedelta(seconds=1),attempts,at+timedelta(seconds=301),stage_reminders.DEFAULTS),1)

    def test_no_repeat_when_delivery_uncertain(self):
        start=DurationTests.now
        attempt=SimpleNamespace(created=start+timedelta(seconds=300),data={'state':'UNKNOWN'})
        self.assertIsNone(stage_reminders.due_reminder(start,[attempt],start+timedelta(days=1),stage_reminders.DEFAULTS))

    def test_delay_values_are_persisted_independently(self):
        values={'seconds':330,'second_seconds':1500,'last_seconds':16000}
        with patch.object(stage_reminders.Configuration.objects,'update_or_create') as save:
            self.assertEqual(stage_reminders.configure(**values),values)
            save.assert_called_once_with(pk='agent-stage-reminders',defaults={'value':values})

    def test_codex_reminder_starts_only_verified_idle_thread(self):
        from cab_platform.native_api import CodexAPI, NativeFailure
        api=object.__new__(CodexAPI)
        with patch.object(api,'_call',side_effect=[{'thread':{'id':'target','cwd':'/fixture','status':{'type':'idle'}}},{'turn':{'id':'turn'}}]) as call:
            self.assertEqual(api.remind_thread('target','/fixture',1000,'Texte lisible'),'turn')
            self.assertEqual(call.call_args.args[1]['input'][0]['text'],'Texte lisible')
        with patch.object(api,'_call',return_value={'thread':{'id':'target','cwd':'/fixture','status':{'type':'active'}}}) as call:
            with self.assertRaises(NativeFailure):
                api.remind_thread('target','/fixture',1000,'Texte lisible')
            self.assertEqual(call.call_count,1)


@unittest.skipUnless(os.environ.get('CAB_EFFECTS_FIXTURE') == '1', 'PostgreSQL isolé requis')
class CompleteCycleTests(unittest.TestCase):
    def test_optional_review_records_observed_decision_in_full_cycle(self):
        from django.conf import settings
        from django.db import transaction
        from cab_platform.core import commands
        from cab_platform.core.models import Actor, Change, ChangeStageIteration, FinalizationPlan, Project, Run, SessionProjection
        from cab_platform.stage_substeps import phase

        self.assertTrue(settings.DATABASES['default']['NAME'].startswith('cab_effects_fixture_'))
        with TemporaryDirectory() as root, transaction.atomic():
            key=uuid4().hex
            project=Project.objects.create(pk=key,root=root,owner_uid=os.getuid())
            actor=Actor.objects.create(pk=key,uid=os.getuid(),agent='fixture',token_hash=key)
            change=Change.objects.create(pk=key,project=project,identifier='fixture')
            run=Run.objects.create(project=project,actor=actor,change_record=change,run_id=key,session_id=key,
                                   mode='direct',change='fixture',cycle_steps=12,configuration={'cycle_profile':metrics.PROFILE})
            FinalizationPlan.objects.create(run=run,policy={'review_required':False})
            start=datetime.now(timezone.utc)-timedelta(minutes=1)
            for stage in (1,2,3,4,5,6,7,9):
                run.stage=stage
                run.save(update_fields=['stage'])
                metrics.observe(run,start+timedelta(seconds=stage))
            skipped=ChangeStageIteration.objects.get(run=run,stage__key='review')
            self.assertEqual((skipped.started_at,skipped.ended_at,skipped.state),(start+timedelta(seconds=9),start+timedelta(seconds=9),'SKIPPED'))
            for name in ('statistics','publication'):
                phase(run,name,name,'RUNNING');phase(run,name,name,'COMPLETED')
            run.stage=12
            run.save(update_fields=['stage'])
            commands.event(run,'closure-started',{})
            self.assertEqual(SessionProjection.objects.get(binding=run).cycle_profile,metrics.PROFILE)
            run.state='CLOSED';run.save(update_fields=['state'])
            commands.event(run,'run-closed',{})
            self.assertTrue(run.cycle_iterations.get().complete)
            self.assertEqual(ChangeStageIteration.objects.filter(run=run,parent=None,ended_at__isnull=False).count(),12)
            transaction.set_rollback(True)
