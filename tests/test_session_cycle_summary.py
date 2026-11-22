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
