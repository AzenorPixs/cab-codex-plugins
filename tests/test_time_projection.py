"""Attente partielle et publication durable des preuves temporelles."""
from datetime import datetime, timedelta, timezone
import os
import unittest

import test_stage_protocol as fixtures
from cab_platform import cycle_attribution as clock


class PartialTimeTests(unittest.TestCase):
    def test_run_218_known_wait_is_visible_beside_unattributed_time(self):
        origin=datetime(2026,11,22,tzinfo=timezone.utc)
        def point(us):
            return origin+timedelta(microseconds=us)
        result=clock.partition(origin,point(687_200_032),
            [(origin,point(91_589_787))],
            [(point(91_589_787),point(596_448_460))],
            [(origin,point(682_905_524))],display=True)
        self.assertFalse(result['attribution_complete'])
        self.assertEqual(result['wait_observed_seconds'],86.5)
        self.assertEqual(result['unattributed_seconds'],4.3)

    def test_fully_observed_parts_still_add_after_display_rounding(self):
        from decimal import Decimal
        origin=datetime(2026,11,22,tzinfo=timezone.utc)
        def point(us):
            return origin+timedelta(microseconds=us)
        result=clock.partition(origin,point(3_150_000),[(origin,point(1_050_000))],
          [(point(1_050_000),point(2_100_000))],[(origin,point(3_150_000))],display=True)
        self.assertEqual(sum(Decimal(str(result[key])) for key in clock.FIELDS),Decimal('3.2'))


@unittest.skipUnless(os.environ.get('CAB_EFFECTS_FIXTURE')=='1','PostgreSQL isolé requis')
class PersistedTimeTests(unittest.TestCase):
    setUp=fixtures.ProtocolTests.setUp
    finish=fixtures.ProtocolTests.finish
    begin=fixtures.ProtocolTests.begin
    validate=fixtures.ProtocolTests.validate

    def test_open_passage_publishes_observed_work_without_setting_its_end(self):
        from cab_platform.change_stage_metrics import summarize
        from cab_platform.core.models import ChangeStageIteration
        from cab_platform.stage_substeps import update
        from cab_platform.time_projection import refresh

        self.begin(1)
        self.run.refresh_from_db()
        stage=ChangeStageIteration.objects.get(run=self.run,parent__isnull=True)
        begin=stage.started_at+timedelta(seconds=1)
        end=begin+timedelta(seconds=3)
        update(self.run,'check','checked-later','RUNNING','Contrôle',at=begin)
        update(self.run,'check','checked-later','COMPLETED','Contrôle',at=end)
        self.assertTrue(refresh(self.run.pk))
        stage.refresh_from_db()
        self.assertIsNone(stage.ended_at)
        self.assertEqual(stage.time_projection['cab_seconds'],3)
        self.assertEqual(stage.time_projection['measured_until'],end.isoformat())
        view=summarize(self.run.change_record,self.run)['stages'][0]['iterations'][0]
        self.assertEqual(view['cab_seconds'],3)
        self.assertFalse(refresh(self.run.pk))

    def test_closed_run_revises_saved_totals_after_late_child_receipt(self):
        from cab_platform.core import commands as c
        from cab_platform.core.models import ChangeStageIteration
        from cab_platform.stage_substeps import update
        from cab_platform.time_projection import refresh
        self.begin(1)
        self.run.refresh_from_db()
        a=update(self.run,'late','released-later','RUNNING','Contrôle')
        self.run.state='CLOSED'
        self.run.save(update_fields=['state'])
        c.event(self.run,'run-closed',{})
        self.assertTrue(refresh(self.run.pk))
        parent=a.parent
        parent.refresh_from_db()
        self.assertIsNone(parent.time_projection['cab_seconds'])
        update(self.run,'late','released-later','COMPLETED','Contrôle')
        self.assertTrue(refresh(self.run.pk))
        parent.refresh_from_db()
        self.assertGreater(parent.time_projection['cab_seconds'],0)
        self.assertIn(a.pk,parent.time_projection['basis']['stage_iteration_ids'])
        self.assertTrue(parent.ended_at)
