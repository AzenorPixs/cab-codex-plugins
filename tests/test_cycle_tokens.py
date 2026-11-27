"""Mesures natives entières, fenêtres du cycle et ventilations par rôle."""
from datetime import timedelta
from io import BytesIO
import json
import unittest
from unittest.mock import patch

from django.utils import timezone
import test_stage_protocol as fixtures

from cab_platform.change_stage_metrics import save_cycle_summary, summarize
from cab_platform.core.models import Actor, AgentModel, AgentProvider, ChangeStage, ChangeStageIteration, CycleTokenUsage, RunCycleIteration, SessionAgent
from cab_platform.cycle_tokens import store_session_agents, store_usage
from cab_platform.measurement_sources import _opencode_usage, _time_lines
from cab_platform.time_projection import refresh


class NativeTokenTests(unittest.TestCase):
    def test_codex_observes_only_model_provider_and_reasoning(self):
        rows=[('session_meta',{'model_provider':'openai','other':'secret-unused'}),
              ('turn_context',{'model':'gpt-fixture','effort':'medium','instructions':'never exported'}),
              ('event_msg',{'type':'thread_settings_applied','settings':{'model':'gpt-next','reasoning_effort':'high'}})]
        data=b''.join(json.dumps({'timestamp':f'2026-11-22T12:00:{i:02}+00:00','type':kind,'payload':payload}).encode()+b'\n'
                      for i,(kind,payload) in enumerate(rows))
        observed=[]
        _time_lines(BytesIO(data),len(data),models=observed)
        self.assertEqual([item[1:] for item in observed],[('gpt-fixture','openai','medium'),('gpt-next','openai','high')])

    def test_codex_uses_deltas_and_never_invents_missing_cache(self):
        def record(second, total, last=None):
            return {'timestamp':f'2026-11-22T12:00:{second:02}+00:00','type':'event_msg',
                    'payload':{'type':'token_count','info':{'total_token_usage':total,'last_token_usage':last}}}
        rows=[
            record(1,{'input_tokens':100,'output_tokens':30},{'input_tokens':20,'output_tokens':2}),
            record(2,{'input_tokens':120,'output_tokens':33}),
            record(3,{'input_tokens':120,'output_tokens':33}),
            record(4,{'input_tokens':5,'output_tokens':2,'cached_input_tokens':0,'cache_write_input_tokens':50}),
            record(5,{'input_tokens':9,'output_tokens':3,'cached_input_tokens':0,'cache_write_input_tokens':60}),
            record(6,{'input_tokens':9,'output_tokens':3,'cached_input_tokens':0,'cache_write_input_tokens':70}),
        ]
        data=b''.join(json.dumps(row).encode()+b'\n' for row in rows)
        usage=[]
        _time_lines(BytesIO(data),len(data),usage)
        self.assertEqual([(stamp.second,counts) for stamp,_,counts in usage],
                         [(2,(20,3,None,None)),(5,(4,1,0,10)),(6,(0,0,0,10))])
        self.assertEqual(usage[1][1][1], (9,3,0))

    def test_opencode_counts_cache_reads_and_writes(self):
        self.assertEqual(_opencode_usage({'id':'message','tokens':{'input':10,'output':0,
                         'cache':{'read':40,'write':90}}}),(10,0,40,90))
        self.assertEqual(_opencode_usage({'id':'message','tokens':{'cache':{'write':0}}}),
                         (None,None,None,0))
        self.assertIsNone(_opencode_usage({'id':'message','tokens':{'input':True,'output':-1}}))


class CycleTokenTests(unittest.TestCase):
    setUp=fixtures.ProtocolTests.setUp
    finish=fixtures.ProtocolTests.finish
    begin=fixtures.ProtocolTests.begin

    def test_agents_are_persisted_by_passage_role_and_observed_settings(self):
        self.begin(1)
        self.run.refresh_from_db()
        passage=self.run.stage_iterations.get(parent=None)
        start=passage.started_at
        end=start+timedelta(seconds=10)
        passage.ended_at=end
        passage.save(update_fields=['ended_at'])
        first=AgentProvider.objects.create(name='Provider A',api_url='https://a.invalid')
        second=AgentProvider.objects.create(name='Provider B',api_url='https://b.invalid')
        for provider in (first,second):
            AgentModel.objects.create(provider=provider,identifier='fixture/model',source={},details={})
        trace=(start,[(start,end)],(),(),())
        observations=[(start-timedelta(seconds=2),'ancienne/session','','low'),
                      (start+timedelta(seconds=1),'fixture/model','provider b','high'),
                      (start+timedelta(seconds=3),'fixture/model','','')]
        sources=[('coder',trace,observations)]
        self.assertTrue(store_session_agents(self.run,sources))
        self.assertFalse(store_session_agents(self.run,sources))
        rows=SessionAgent.objects.filter(stage_passage=passage).order_by('observed_at')
        self.assertEqual(list(rows.values_list('model','provider_id','reasoning')),
                         [('fixture/model',second.pk,'high'),('fixture/model',None,'')])
        row=rows.first()
        row.token_costs={'input_tokens':'0 €','unauthorized':'not projected'}
        row.save(update_fields=['token_costs'])
        view=summarize(self.run.change_record,self.run)
        agents=view['stages'][0]['iterations'][0]['agents']
        self.assertEqual([(item['role'],item['provider'],item['costs']) for item in agents],
                         [('coder','Provider B',{'input_tokens':'0 €'}),('coder',None,{})])

    def test_persisted_rollups_and_live_invalidation(self):
        self.begin(1)
        self.run.refresh_from_db()
        first=self.run.stage_iterations.get(parent=None)
        start=first.started_at
        end=start+timedelta(seconds=10)
        first.ended_at=end
        first.save(update_fields=['ended_at'])
        first.cycle.ended_at=end
        first.cycle.save(update_fields=['ended_at'])
        action_stage=ChangeStage.objects.create(change=self.run.change_record,key='initialization.action-fixture',parent=first.stage)
        action=ChangeStageIteration.objects.create(run=self.run,stage=action_stage,parent=first,cycle=first.cycle,
            started_at=start+timedelta(seconds=1),ended_at=start+timedelta(seconds=4),state='COMPLETED')
        ChangeStageIteration.objects.create(run=self.run,stage=action_stage,parent=first,cycle=first.cycle,
            started_at=start+timedelta(seconds=3),ended_at=start+timedelta(seconds=5),state='COMPLETED')
        second=RunCycleIteration.objects.create(run=self.run,number=2,started_at=end)
        ChangeStageIteration.objects.create(run=self.run,stage=first.stage,cycle=second,started_at=end,state='RUNNING')
        orchestrator=Actor.objects.create(pk='o-'+self.actor.pk,uid=self.actor.uid,agent='fixture',token_hash='fixture')
        self.run.mode='piloted'
        self.run.mandate['orchestrator_id']=orchestrator.pk
        self.run.configuration['reminder_orchestrator_thread']='parent-thread'
        self.run.save(update_fields=['mode','mandate','configuration'])
        self.assertIsNotNone(self.run.coding_session_id)
        usage=[(start-timedelta(seconds=1),'excluded',(99,99,99,99)),
               (start+timedelta(seconds=2),'one',(10,2,0,5)),
               (start+timedelta(seconds=3),'overlap',(2,1,None,None)),(end,'two',(3,1,1,7))]
        parent_usage=[(start+timedelta(seconds=2),'one',(20,3,4,0))]
        self.assertTrue(store_usage(self.run, [('coder',self.run.actor_id,self.run.session_id,
                                               [(usage[1][0], 'one', (10,2,0))])]))
        historical_measurement = CycleTokenUsage.objects.get(run=self.run)
        self.assertIsNone(historical_measurement.cache_write_tokens)
        def native(run, *, actor=None, thread=None, tokens=False, models=False):
            if models:
                return None,parent_usage if thread else usage,()
            return (None, parent_usage if thread else usage) if tokens else None

        with patch('cab_platform.measurement_sources.native_work_time',side_effect=native):
            self.assertTrue(refresh(self.run.pk))
            self.run.refresh_from_db()
            stamp=self.run.updated
            self.assertFalse(refresh(self.run.pk))
            self.run.refresh_from_db()
            self.assertEqual(self.run.updated,stamp)
            self.assertEqual(CycleTokenUsage.objects.filter(run=self.run).count(),4)
            view=summarize(self.run.change_record,self.run)
        self.assertTrue(view['piloted'])
        historical_measurement.refresh_from_db()
        self.assertEqual(historical_measurement.cache_write_tokens,5)
        self.assertEqual(view['tokens']['coder'],{'input_tokens':'15','output_tokens':'4',
                                                 'cache_read_tokens':'1','cache_write_tokens':'12'})
        self.assertEqual(view['session_tokens'],view['tokens'])
        self.assertEqual(self.run.cycle_summary['tokens'],view['tokens'])
        save_cycle_summary(self.run)
        self.run.refresh_from_db()
        self.assertEqual(self.run.cycle_summary['tokens'],view['tokens'])
        self.assertEqual(summarize(self.run.change_record)['tokens'],view['tokens'])
        self.assertEqual(view['cycles'][0]['tokens']['coder']['input_tokens'],'12')
        self.assertEqual(view['cycles'][1]['tokens']['coder']['input_tokens'],'3')
        self.assertEqual(view['stages'][0]['tokens']['orchestrator']['input_tokens'],'20')
        self.assertEqual(view['stages'][0]['iterations'][0]['tokens']['coder']['input_tokens'],'12')
        actions=[row for child in view['stages'][0]['children'] for row in child['iterations']]
        observed=next(row for row in actions if row['id']==action.pk)
        self.assertEqual(observed['tokens']['coder']['input_tokens'],'10')
        self.assertEqual(observed['tokens']['orchestrator']['cache_read_tokens'],'4')
        self.assertEqual(observed['tokens']['orchestrator']['cache_write_tokens'],'0')
        self.assertEqual(view['cycles'][0]['tokens']['coder']['cache_write_tokens'],'5')
        self.assertEqual(view['cycles'][1]['tokens']['coder']['cache_write_tokens'],'7')
        self.assertEqual(CycleTokenUsage.objects.filter(run=self.run,action__isnull=True).count(),2)
