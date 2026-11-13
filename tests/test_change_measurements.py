"""Périodes PostgreSQL de fixture : exclusivité, multi-RUN/SID et export sans cumul."""
from datetime import datetime,timezone,timedelta
from decimal import Decimal
import os
from pathlib import Path
import tempfile
import unittest
import uuid
from unittest.mock import patch
if os.environ.get('CAB_TEST_FIXTURE')!='1':raise RuntimeError('dedicated-postgresql-fixture-required')
import django
django.setup()
from django.db import transaction,IntegrityError
from cab_platform.core import commands,measurements as m
from cab_platform.core.models import Actor,Project,MeasurementPeriod,MeasurementAction,Metric
from cab_platform.sgs_engine import validate_contribution

class ChangeMeasurementTests(unittest.TestCase):
    def setUp(self):
        self.atomic=transaction.atomic();self.atomic.__enter__();self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);(self.root/'source').write_text('fixture')
        self.project=Project.objects.create(pk=uuid.uuid4().hex,root=str(self.root),owner_uid=os.getuid());self.actor=Actor.objects.create(pk=uuid.uuid4().hex,uid=os.getuid(),agent='codex',token_hash=uuid.uuid4().hex);self.actor.projects.add(self.project)
        self.count=0;self.a=self.new_run('A','change-a','SHARED');self.b=self.new_run('B','change-b','SHARED')
    @property
    def periods(self):return MeasurementPeriod.objects.filter(run__project=self.project)
    def tearDown(self):transaction.set_rollback(True);self.atomic.__exit__(None,None,None);self.tmp.cleanup()
    def new_run(self,name,change,sid):
        return commands.begin_run(self.actor,{'project_id':self.project.pk,'run_id':name,'session_id':sid,'mode':'direct','change':change,'paths':['source'],'criteria':['fixture'],'decisions_resolved':True})
    def transition(self,run,action,value,request_id=None,from_start=True):
        self.count+=1;sample={'status':'ok','source':{'session_id':run.session_id},'counters':{'tokens_total':str(value)},'native_at':'native-'+str(value),'offset':self.count*1000}
        data={'project_id':self.project.pk,'run_id':run.run_id,'request_id':request_id or 'REQ-'+str(self.count)}
        if action=='begin':data['from_coding_start']=from_start
        with patch.object(m,'snapshot',return_value=sample):return m.transition(self.actor,data,action)
    def change(self,name='change-a'):return m.change_statistics(self.actor,{'project_id':self.project.pk,'change':name})
    def test_switch_does_not_copy_previous_total_and_repeated_receipt_never_reopens(self):
        first=self.transition(self.a,'begin',100,'START-A');self.transition(self.b,'begin',130);self.transition(self.b,'end',180,'END-B')
        self.assertEqual(self.change()['metrics']['tokens_total']['value'],'30');self.assertEqual(self.change('change-b')['metrics']['tokens_total']['value'],'50')
        with patch.object(m,'snapshot',side_effect=AssertionError('replayed')):
            repeated=m.transition(self.actor,{'project_id':self.project.pk,'run_id':self.a.run_id,'request_id':'START-A','from_coding_start':True},'begin')
        self.assertEqual(first,repeated);self.assertFalse(self.periods.filter(ended__isnull=True).exists());self.assertEqual(self.periods.count(),2)
        with self.assertRaisesRegex(commands.Refused,'request-conflict'):self.transition(self.a,'end',200,'START-A')
    def test_change_aggregates_multiple_runs_and_sids_without_double_time(self):
        self.transition(self.a,'begin',100);self.transition(self.a,'end',125)
        resumed=self.new_run('A2','change-a','SHARED');other=self.new_run('A3','change-a','OTHER')
        self.transition(resumed,'begin',125);self.transition(resumed,'end',150);self.transition(other,'begin',1000);self.transition(other,'end',1015)
        base=datetime(2026,11,13,tzinfo=timezone.utc)
        for period,(left,right) in zip(self.periods.order_by('pk'),[(0,100),(100,200),(50,150)]):
            period.started=base+timedelta(seconds=left);period.ended=base+timedelta(seconds=right);period.save()
        value=self.change();self.assertEqual(value['metrics']['tokens_total']['value'],'65');self.assertEqual(len(value['runs']),3);self.assertEqual(len(value['sessions']),2);self.assertEqual(Decimal(value['active_seconds']),Decimal(200));validate_contribution(value['sgs_evidence']['contribution'])
        self.assertTrue(value['change_coverage_complete']);self.assertEqual(value['sgs_evidence']['contribution']['metrics']['tokens_total']['value'],'65')
    def test_unmeasured_run_or_late_start_keeps_change_total_unknown(self):
        self.transition(self.a,'begin',100,from_start=False);self.transition(self.a,'end',120)
        value=self.change();self.assertIsNone(value['metrics']['tokens_total']['value']);self.assertEqual(value['metrics']['tokens_total']['observed_partial'],'20');self.assertFalse(value['change_coverage_complete']);self.assertIn('A',value['uncovered_runs']);self.assertEqual(value['sgs_evidence']['contribution']['metrics']['tokens_total']['state'],'unavailable')
    def test_unknown_window_never_falls_back_to_session_metric(self):
        self.transition(self.a,'begin',100)
        with patch.object(m,'snapshot',return_value={'status':'unavailable','reason':'synthetic-unavailable'}):m.transition(self.actor,{'project_id':self.project.pk,'run_id':self.a.run_id,'request_id':'END-UNKNOWN'},'end')
        Metric.objects.create(run=self.a,source='codex-native',stream='native-tokens',sequence=1,values={'tokens_total':'100000'})
        value=self.change();self.assertEqual(value['sgs_evidence']['contribution']['metrics']['tokens_total']['state'],'unavailable');self.assertEqual(m.run_statistics(self.actor,self.a)['streams'][0]['values'],{})
    def test_open_window_is_incomplete_and_reset_is_not_a_negative_value(self):
        self.transition(self.a,'begin',100);self.assertFalse(self.change()['complete']);self.assertIsNone(self.change()['active_seconds'])
        self.transition(self.a,'end',4);value=self.change();self.assertEqual(value['periods'][0]['coverage']['reason'],'native-counter-reset');self.assertEqual(value['sgs_evidence']['contribution']['metrics']['tokens_total']['state'],'unavailable')
    def test_freeze_only_closes_own_context_and_resume_has_another_receipt(self):
        other=self.new_run('OTHER','change-a','OTHER');self.transition(self.a,'begin',100);self.transition(other,'begin',10)
        with patch.object(m,'snapshot',return_value={'status':'unavailable','reason':'fixture'}):m.end_if_open(self.actor,self.a)
        self.assertTrue(self.periods.filter(run=other,ended__isnull=True).exists());self.assertFalse(self.periods.filter(run=self.a,ended__isnull=True).exists())
        self.transition(self.a,'begin',150)
        with patch.object(m,'snapshot',return_value={'status':'unavailable','reason':'fixture'}):m.end_if_open(self.actor,self.a)
        self.assertEqual(self.periods.filter(run=self.a).count(),2);self.assertFalse(self.periods.filter(run=self.a,ended__isnull=True).exists())
    def test_database_uniqueness_protects_the_same_sid(self):
        self.transition(self.a,'begin',100);period=self.periods.first()
        with self.assertRaises(IntegrityError),transaction.atomic():MeasurementPeriod.objects.create(session=period.session,run=self.b,change_id=self.b.change_record_id,started=period.started)
        self.assertEqual(self.periods.count(),1)

if __name__=='__main__':unittest.main()
