"""Preuves temporelles CAB, agent et attente, avec et sans trace complète."""
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch
import os
import unittest

import test_stage_protocol as fixtures

from cab_platform import cycle_attribution as clock
from cab_platform import stage_actions, stage_protocol
from cab_platform.core import commands as c
from cab_platform.phase_statistics import report_observer


class AttributionTests(unittest.TestCase):
    start=datetime(2026,11,22,tzinfo=timezone.utc)

    def at(self, seconds):
        return self.start+timedelta(seconds=seconds)

    def test_priority_and_repeated_intervals_count_once(self):
        start,end=self.at(0),self.at(12)
        result=clock.partition(start,end,
            [(self.at(3),self.at(7)),(self.at(4),self.at(9))],
            [(self.at(1),self.at(5)),(self.at(6),self.at(10))],[(start,end)])
        self.assertEqual(result,dict(cab_seconds=6,agent_seconds=3,wait_observed_seconds=3,unattributed_seconds=0,attribution_complete=True))

    def test_missing_coverage_is_not_waiting(self):
        result=clock.partition(self.at(0),self.at(10),[(self.at(0),self.at(2))])
        self.assertFalse(result['attribution_complete'])
        self.assertEqual(result['cab_seconds'],2)
        self.assertIsNone(result['wait_observed_seconds'])

    def test_display_rounding_keeps_total(self):
        start,end=self.at(0),self.at(768.6)
        result=clock.partition(start,end,[(start,self.at(100.04))],[(self.at(90),self.at(230.08))],[(start,end)],display=True)
        self.assertEqual(sum(Decimal(str(result[key])) for key in clock.FIELDS),Decimal('768.6'))
        self.assertEqual(sum(clock.display_parts((1_050_000,1_050_000,1_050_000))),3.2)

    def test_change_failure_does_not_open_a_global_action(self):
        observer=report_observer(object(),'statistics-fixture')
        with patch('cab_platform.phase_statistics.clock.update') as update:
            with self.assertRaisesRegex(c.Refused,'fixture-failed'):
                with observer('change'):
                    raise c.Refused('fixture-failed')
        self.assertEqual([(call.args[1],call.args[3]) for call in update.call_args_list],
                         [('calculate-change','RUNNING'),('calculate-change','FAILED')])

    def test_missing_or_old_blocker_is_not_a_creation(self):
        with TemporaryDirectory() as directory:
            run=SimpleNamespace(change='a',project=SimpleNamespace(root=directory))
            name='openspec/changes/a/BLOCKERS.md'
            path=Path(directory)/name
            path.parent.mkdir(parents=True)
            with self.assertRaisesRegex(c.Refused,'stage-blocker-unavailable'):
                stage_actions.blocker_proof(run,name)
            path.write_text('Bilan attesté\n')
            self.assertIn('sha256',stage_actions.blocker_proof(run,name))
            with self.assertRaisesRegex(c.Refused,'stage-blocker-not-produced-in-passage'):
                stage_actions.blocker_proof(run,name,since=datetime.now(timezone.utc)+timedelta(days=1))
            with self.assertRaisesRegex(c.Refused,'stage-blocker-path-invalid'):
                stage_actions.blocker_proof(run,'openspec/changes/b/BLOCKERS.md')


@unittest.skipUnless(os.environ.get('CAB_EFFECTS_FIXTURE')=='1','PostgreSQL isolé requis')
class BlockerActionTests(unittest.TestCase):
    setUp=fixtures.ProtocolTests.setUp
    finish=fixtures.ProtocolTests.finish
    begin=fixtures.ProtocolTests.begin
    validate=fixtures.ProtocolTests.validate

    def test_legacy_name_traced_only_after_real_write_in_current_iteration(self):
        from cab_platform.core.models import ChangeStageIteration
        first=self.begin(1);self.validate(first['attempt'])
        stage=self.begin(2)
        path='openspec/changes/fixture/BLOCKER.md'
        file=self.root/path;file.parent.mkdir(parents=True)
        packet={**self.ids,'request_id':'blocker-written','attempt':stage['attempt'],'action':'blocage','blocker_path':path}
        with self.assertRaisesRegex(c.Refused,'stage-blocker-unavailable'):
            stage_actions.declare(self.actor,packet)
        self.assertFalse(ChangeStageIteration.objects.filter(run=self.run,stage__key='analysis.action-blocage').exists())
        file.write_text('Bilan réellement rédigé\n')
        result=stage_actions.declare(self.actor,packet)
        row=ChangeStageIteration.objects.get(pk=result['id'])
        self.assertEqual(row.parent.stage.key,'analysis')
        self.assertEqual(row.description_source,'agent')
        self.assertEqual(row.receipt['path'],path)

    def test_cab_creates_one_action_for_a_new_blocker_only(self):
        from cab_platform.core.models import ChangeStageIteration
        from cab_platform.core.statistics_service import sync
        self.begin(1)
        self.run.refresh_from_db()
        relative='openspec/changes/fixture/BLOCKERS.md'
        (self.root/relative).parent.mkdir(parents=True)
        first=stage_actions.blocker_observer(self.run,'first-write')
        second=stage_actions.blocker_observer(self.run,'later-check')
        sync(self.project,'write-blocker',blocker=(relative,'Bilan écrit par CAB\n'),blocker_written=first)
        sync(self.project,'check-blocker',blocker=(relative,'Texte ignoré\n'),blocker_written=second)
        row=ChangeStageIteration.objects.get(run=self.run,stage__key='initialization.action-blocage')
        self.assertEqual(row.description_source,'cab')
        self.assertEqual(row.receipt['request_id'],'first-write')
        self.assertIsNotNone(row.started_at)
        self.assertIsNotNone(row.ended_at)
