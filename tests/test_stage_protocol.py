"""Transitions du protocole CAB et effets attendus sur PostgreSQL isolé."""
import os
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
from uuid import uuid4

if os.environ.get('CAB_EFFECTS_FIXTURE') == '1':
    import django
    django.setup()
else:
    import test_git_commit_metadata

from cab_platform import stage_protocol as protocol
from cab_platform.core import commands as c


class TransitionTests(unittest.TestCase):
    def test_forward_requires_validation_and_cannot_skip(self):
        with self.assertRaisesRegex(c.Refused,'stage-agent-validation-required'):
            protocol.transition({'stage':2,'validated':False},3)
        with self.assertRaisesRegex(c.Refused,'stage-agent-validation-required'):
            protocol.transition({'stage':2,'validated':True},4)
        self.assertFalse(protocol.transition({'stage':2,'validated':True},3))
        self.assertTrue(protocol.transition({'stage':8,'validated':False},2))


@unittest.skipUnless(os.environ.get('CAB_EFFECTS_FIXTURE') == '1','PostgreSQL isolé requis')
class ProtocolTests(unittest.TestCase):
    def setUp(self):
        from django.conf import settings
        from django.db import transaction
        from cab_platform.core.models import Actor, FinalizationPlan, Project, Run
        self.assertTrue(settings.DATABASES['default']['NAME'].startswith('cab_effects_fixture_'))
        folder=TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        key=uuid4().hex
        self.tx=transaction.atomic()
        self.tx.__enter__()
        self.addCleanup(self.finish)
        self.root=Path(folder.name)
        (self.root/'code.txt').write_text('fixture')
        self.project=Project.objects.create(pk=key,root=folder.name,owner_uid=os.getuid())
        self.actor=Actor.objects.create(pk=key,uid=os.getuid(),agent='fixture',token_hash=key)
        self.actor.projects.add(self.project)
        self.run=Run.objects.create(project=self.project,actor=self.actor,run_id=key,session_id=key,
            change='fixture',mode='direct',stage=1,cycle_steps=12,mandate={'paths':['code.txt']},
            configuration={'cycle_profile':'publication-12-v1',protocol.KEY:{'version':protocol.VERSION,'active':{}}})
        c.event(self.run,'run-created',{})
        self.plan=FinalizationPlan.objects.create(run=self.run,policy={'checks':[],'requirements':[],'review_required':False,'nature':'development'})
        self.ids={'project_id':key,'run_id':key}

    def finish(self):
        from django.db import transaction
        transaction.set_rollback(True)
        self.tx.__exit__(None,None,None)

    def begin(self,stage,request=None):
        return protocol.begin(self.actor,{**self.ids,'request_id':request or uuid4().hex,'stage':stage,'text':'Travail de cette étape'})

    def validate(self,attempt,request=None):
        return protocol.validate(self.actor,{**self.ids,'request_id':request or uuid4().hex,'attempt':attempt,'text':'Part agent contrôlée'})

    def test_begin_and_validate_are_idempotent_and_return_invalidates_next_steps(self):
        one=self.begin(1,'begin-one')
        self.assertEqual(self.begin(1,'begin-one'),one)
        with self.assertRaisesRegex(c.Refused,'stage-agent-validation-required'):
            self.begin(2)
        verdict=self.validate(one['attempt'],'finish-one')
        self.assertEqual(self.validate(one['attempt'],'finish-one'),verdict)
        two=self.begin(2)
        returned=self.begin(1)
        self.assertGreater(returned['attempt'],two['attempt'])
        self.assertIn('Retour',returned['text'])
        with self.assertRaisesRegex(c.Refused,'stage-attempt-not-current'):
            self.validate(two['attempt'])
        self.run.refresh_from_db()
        self.assertEqual(list(self.run.configuration[protocol.KEY]['active']),['1'])
        self.assertEqual(self.run.stage_iterations.filter(stage__key='initialization').count(),2)

    def test_piloted_coder_cannot_advance_for_the_orchestrator(self):
        from cab_platform.core.models import Actor
        parent=Actor.objects.create(pk=uuid4().hex,uid=os.getuid(),agent='fixture',token_hash=uuid4().hex)
        parent.projects.add(self.project)
        self.run.mode='piloted';self.run.mandate={**self.run.mandate,'orchestrator_id':parent.pk}
        self.run.save(update_fields=['mode','mandate'])
        with self.assertRaisesRegex(c.Refused,'stage-agent-authority-required'):
            self.begin(1)
        answer=protocol.begin(parent,{**self.ids,'request_id':'parent-start','stage':1,'text':'Début sous pilotage'})
        self.assertEqual(answer['stage'],1)
        with self.assertRaisesRegex(c.Refused,'stage-agent-authority-required'):
            self.validate(answer['attempt'])

    def test_verification_stays_open_until_cab_check_succeeds(self):
        from cab_platform.core.models import Operation
        self.plan.policy={**self.plan.policy,'checks':[{'id':'verify','executor':'local','argv':['/bin/true'],'criteria':[]}]}
        self.plan.save(update_fields=['policy'])
        with patch('cab_platform.version_skill.require_acknowledged'):
            for stage in range(1,7):
                self.assertTrue(self.validate(self.begin(stage)['attempt'])['validated'])
            started=self.begin(7)
            op=Operation.objects.get(pk=started['cab']['operations'][0])
            self.assertEqual(op.state,'WAITING')
            self.assertFalse(self.validate(started['attempt'])['validated'])
            with self.assertRaisesRegex(c.Refused,'stage-agent-validation-required'):
                self.begin(8)
            op.state='COMPLETED';op.receipt={'exit_code':0}
            op.save(update_fields=['state','receipt'])
            self.assertTrue(self.validate(started['attempt'])['validated'])
            self.assertEqual(self.begin(8)['stage'],8)

    def test_failed_check_allows_same_stage_restart_without_accepting_old_receipt(self):
        from cab_platform.core.models import Operation
        self.plan.policy={**self.plan.policy,'checks':[{'id':'verify','executor':'local','argv':['/bin/true'],'criteria':[]}]}
        self.plan.save(update_fields=['policy'])
        with patch('cab_platform.version_skill.require_acknowledged'):
            for stage in range(1,7):
                self.validate(self.begin(stage)['attempt'])
            previous=self.begin(7)
            op=Operation.objects.get(pk=previous['cab']['operations'][0])
            op.state='COMPLETED';op.receipt={'exit_code':1};op.save(update_fields=['state','receipt'])
            self.assertFalse(self.validate(previous['attempt'])['validated'])
            current=protocol.begin(self.actor,{**self.ids,'request_id':'restart-verification','stage':7,
                                              'text':'Retour après l’échec','restart':True})
            self.assertNotEqual(current['cab']['operations'],previous['cab']['operations'])
            self.assertFalse(self.validate(current['attempt'])['validated'])

    def queued_publication(self):
        from cab_platform.core.models import McpConnector, McpRunBinding, Operation
        from cab_platform.publication_boundary import KEY as BOUNDARY
        from cab_platform.stage_substeps import phase

        revision=c.revision(self.run)
        cab={'state':'QUEUED','version':'3.46.1','scope':'project','source_revision':revision,'reference':'publication-stage-11'}
        step={'stage':11,'attempt':11,'validated':False,'cab':cab}
        self.run.stage=11
        self.run.configuration['statistics_at_closure']=True
        self.run.configuration[BOUNDARY]={'state':'FROZEN','publication_ref':cab['reference']}
        self.run.configuration[protocol.KEY].update(current=step,active={'11':step},sequence=11)
        self.run.save(update_fields=['stage','configuration'])
        connector=McpConnector.objects.create(pk=uuid4().hex,actor=self.actor,agent=self.actor.agent,state='READY',
                                              process={'pid':1},worker={'pid':2})
        McpRunBinding.objects.create(connector=connector,run=self.run)
        Operation.objects.create(run=self.run,request_id='qualification',state='COMPLETED',
                                 source_revision=revision,receipt={'exit_code':0})
        phase(self.run,'publication',cab['reference'],'RUNNING')
        return cab

    def current_publication(self):
        self.run.refresh_from_db()
        return self.run.configuration[protocol.KEY]['current']['cab']

    def test_uncertain_admission_requeues_once_and_keeps_original_receipt(self):
        from cab_platform.core.models import Event

        self.queued_publication()
        snapshot={'head':'identique','index_sha256':'stable','remote_heads':{'FORGEJO':'identique'}}
        with patch.object(protocol,'_publication_snapshot',return_value=snapshot), \
             patch('cab_platform.connector_process.alive',return_value=True), \
             patch('cab_platform.session_delivery.start_delivery',side_effect=RuntimeError) as start:
            protocol.start_queued_publication(self.run.pk)
            unknown=Event.objects.get(run=self.run,kind='stage-cab-publication-unknown')
            self.assertEqual(self.current_publication()['state'],'UNKNOWN')
            protocol._recover_publication(self.run.pk)
            queued=self.current_publication()
            self.assertEqual((queued['state'],queued['recovery_state'],queued['reference']),
                             ('QUEUED','RETRIED','publication-stage-11-retry-1'))
            proof=Event.objects.get(run=self.run,kind='stage-cab-publication-reconciled-no-effects').data
            self.assertEqual(proof['state'],'FAILED_NO_EFFECTS')
            self.assertEqual(proof['original_receipt_digest'],c.digest(unknown.data))
            self.assertEqual(Event.objects.get(pk=unknown.pk).data,unknown.data)
            self.assertEqual(self.run.stage_iterations.get(reference=c.digest([self.run.pk,'phase','publication-stage-11'])).state,'UNKNOWN')
            protocol.start_queued_publication(self.run.pk)
            protocol._recover_publication(self.run.pk)
            self.assertEqual(self.current_publication()['state'],'UNKNOWN')
            self.assertEqual(start.call_count,2)
            self.assertEqual(Event.objects.filter(run=self.run,kind='stage-cab-publication-reconciled-no-effects').count(),1)

    def test_uncertain_admission_protects_changed_preflight(self):
        self.queued_publication()
        with patch.object(protocol,'_publication_snapshot',side_effect=[{'head':'initial'},{'head':'modifié'}]), \
             patch('cab_platform.connector_process.alive',return_value=True), \
             patch('cab_platform.session_delivery.start_delivery',side_effect=RuntimeError) as start:
            protocol.start_queued_publication(self.run.pk)
            protocol._recover_publication(self.run.pk)
            protocol.start_queued_publication(self.run.pk)
        current=self.current_publication()
        self.assertEqual((current['state'],current['recovery_reason']),('UNKNOWN','stage-publication-proof-divergent'))
        start.assert_called_once()

    def test_deadlock_retries_are_spaced_and_stop_after_three(self):
        from datetime import timedelta
        from django.db import OperationalError
        from django.utils import timezone
        from cab_platform.core.models import Event

        class Deadlock(Exception):
            sqlstate='40P01'

        def deadlock(*args,**kwargs):
            raise OperationalError from Deadlock

        self.queued_publication()
        now=timezone.now()
        with patch.object(protocol,'_publication_snapshot',return_value={'head':'stable'}), \
             patch('cab_platform.connector_process.alive',return_value=True), \
             patch('cab_platform.session_delivery.start_delivery',side_effect=deadlock) as start, \
             patch.object(protocol.timezone,'now',return_value=now) as clock:
            protocol.start_queued_publication(self.run.pk)
            for retry in range(1,4):
                protocol._recover_publication(self.run.pk)
                cab=self.current_publication()
                self.assertEqual(cab['reference'],f'publication-stage-11-retry-{retry}')
                self.assertEqual(cab['retry_after'],clock.return_value.timestamp()+2**retry)
                protocol.start_queued_publication(self.run.pk)
                self.assertEqual(start.call_count,retry)
                clock.return_value+=timedelta(seconds=2**retry)
                protocol.start_queued_publication(self.run.pk)
                self.assertEqual(start.call_count,retry+1)
            protocol._recover_publication(self.run.pk)
        self.assertEqual(self.current_publication()['state'],'UNKNOWN')
        self.assertEqual(Event.objects.filter(run=self.run,kind='stage-cab-publication-reconciled-no-effects').count(),3)

    def test_uncertain_admission_protects_artifact_effect(self):
        from cab_platform.core.models import ProjectArtifactBuild

        self.queued_publication()
        with patch.object(protocol,'_publication_snapshot',return_value={'head':'stable'}) as snapshot, \
             patch('cab_platform.connector_process.alive',return_value=True), \
             patch('cab_platform.session_delivery.start_delivery',side_effect=RuntimeError):
            protocol.start_queued_publication(self.run.pk)
            ProjectArtifactBuild.objects.create(pk=uuid4().hex,project=self.project,kind='debian',version='3.46.1')
            protocol._recover_publication(self.run.pk)
        current=self.current_publication()
        self.assertEqual((current['state'],current['recovery_reason']),('UNKNOWN','stage-publication-effect-protected'))
        snapshot.assert_called_once()

    def test_interrupted_dispatch_adopts_only_compatible_delivery(self):
        from cab_platform.core.models import GitDelivery, GitSessionIndex

        cab=self.queued_publication()
        protocol._set_publication(self.run,11,'DISPATCHING',executor={'pid':1})
        index=GitSessionIndex.objects.create(initial_run=self.run,change_id=self.run.change_record_id,
                                             session_id=self.run.coding_session_id,index_path='fixture')
        row=GitDelivery.objects.create(run=self.run,git_index=index,project=self.project,version=cab['version'],
                                       plan={'scope':'change','source_revision':cab['source_revision']})
        with patch('cab_platform.connector_process.alive',return_value=True):
            protocol._recover_publication(self.run.pk)
        self.assertEqual(self.current_publication()['state'],'DISPATCHING')
        with patch('cab_platform.connector_process.alive',return_value=False):
            protocol._recover_publication(self.run.pk)
        self.assertEqual(self.current_publication()['state'],'UNKNOWN')
        row.plan={**row.plan,'scope':'project'}
        row.save(update_fields=['plan'])
        protocol._recover_publication(self.run.pk)
        current=self.current_publication()
        self.assertEqual((current['state'],current['delivery_id']),('ADMITTED',row.pk))

    def test_statistics_and_skipped_publication_keep_the_real_stage_and_complete_cycle(self):
        from cab_platform.phase_statistics import execute
        archive=self.root/'openspec/changes/archive/2026-11-22-fixture'
        archive.mkdir(parents=True)
        (archive/'proposal.md').write_text('# Fixture\n')
        (archive/'tasks.md').write_text('- [x] Fini\n')
        with patch('cab_platform.version_skill.require_acknowledged'):
            for stage in range(1,10):
                self.assertTrue(self.validate(self.begin(stage)['attempt'])['validated'])
            statistics=self.begin(10)
            self.run.refresh_from_db()
            self.assertEqual(self.run.stage,10)
            self.assertFalse(self.validate(statistics['attempt'])['validated'])
            execute(statistics['cab']['statistics_job'])
            self.assertTrue(self.validate(statistics['attempt'])['validated'])
            self.assertTrue(self.validate(self.begin(11)['attempt'])['validated'])
            close=self.begin(12)
            with patch('cab_platform.core.run_finalization.dossier',return_value={'missing':['stage:12:agent-validation-required']}):
                self.assertTrue(self.validate(close['attempt'])['validated'])
        self.run.refresh_from_db();self.run.state='CLOSED';self.run.save(update_fields=['state'])
        c.event(self.run,'run-closed',{})
        self.assertTrue(self.run.cycle_iterations.get().complete)

    def test_final_validation_waits_for_all_cab_evidence(self):
        self.run.stage=12
        current={'stage':12,'validated':False,'attempt':12,'cab':{'state':'NOT_REQUIRED'}}
        active={str(i):{'stage':i,'attempt':i,'validated':True,'cab':{'state':'NOT_REQUIRED'}} for i in range(1,12)}
        active['12']=current
        self.run.configuration[protocol.KEY].update(current=current,active=active)
        self.run.save(update_fields=['stage','configuration'])
        self.assertEqual(protocol.close_missing(self.run),['stage:12:agent-validation-required'])
        with patch('cab_platform.core.run_finalization.dossier',return_value={'missing':['evidence:installation:missing','stage:12:agent-validation-required']}):
            result=self.validate(12)
            self.assertFalse(result['validated'])
            self.assertEqual(result['missing'],['evidence:installation:missing'])
        with patch('cab_platform.core.run_finalization.dossier',return_value={'missing':['stage:12:agent-validation-required']}):
            self.assertTrue(self.validate(12)['validated'])
        self.run.refresh_from_db()
        self.assertEqual(protocol.close_missing(self.run),[])

    def test_vacant_stage_is_timestamped_without_a_statistics_job(self):
        from cab_platform.change_stage_metrics import stage_names
        from cab_platform.core.models import ChangeStageIteration, StatisticsJob
        self.run.configuration['statistics_at_closure']=True
        self.run.stage=9
        prior={'stage':9,'attempt':9,'validated':True,'cab':{'state':'NOT_REQUIRED'}}
        self.run.configuration[protocol.KEY].update(current=prior,active={'9':prior},sequence=9)
        self.run.save(update_fields=['configuration','stage'])
        with patch('cab_platform.version_skill.require_acknowledged'):
            vacant=self.begin(10)
            self.assertEqual(vacant['cab']['state'],'NOT_REQUIRED')
            self.assertTrue(self.validate(vacant['attempt'])['validated'])
        row=ChangeStageIteration.objects.get(run=self.run,stage__key='vacant')
        self.assertEqual(row.state,'SKIPPED')
        self.assertIsNotNone(row.started_at)
        self.assertIsNotNone(row.ended_at)
        self.assertFalse(row.children.exists())
        self.assertFalse(StatisticsJob.objects.filter(project=self.project).exists())
        self.assertEqual(stage_names(self.run)[9:],['Vacante','Publication','Clôture'])

    def test_closure_waits_for_native_end_then_writes_change_and_global_without_commit(self):
        from django.utils import timezone
        from cab_platform.core import run_finalization
        from cab_platform.core.models import ChangeStageIteration, Event
        from cab_platform.core.monitor import ensure_records

        archive=self.root/'openspec/changes/archive/2026-11-22-fixture'
        archive.mkdir(parents=True)
        (archive/'proposal.md').write_text('# Fixture\n')
        (archive/'tasks.md').write_text('- [x] Fini\n')
        ensure_records(self.run)
        self.run.refresh_from_db()
        self.plan.digest=c.digest(self.plan.policy)
        self.plan.save(update_fields=['digest'])
        self.run.configuration['statistics_at_closure']=True
        self.run.stage=11
        active={str(i):{'stage':i,'attempt':i,'validated':True,'cab':{'state':'NOT_REQUIRED'}} for i in range(1,12)}
        self.run.configuration[protocol.KEY].update(current=active['11'],active=active,sequence=11)
        self.run.save(update_fields=['configuration','stage'])
        with patch('cab_platform.version_skill.require_acknowledged'):
            close=self.begin(12)
            self.assertTrue(self.validate(close['attempt'])['validated'])
        with patch('cab_platform.measurement_sources.native_work_time',return_value=None):
            with self.assertRaisesRegex(c.Refused,'closure-native-coding-end-pending'):
                run_finalization.process(self.run.pk)
        self.assertFalse((archive/'STATISTICS.md').exists())
        self.assertFalse((self.root/'STATISTICS.md').exists())
        finished=timezone.now()
        native=((self.run.created,[(self.run.created,finished)],[],[],[]),[(finished,'last',(21,17,13,11))])
        with patch('cab_platform.measurement_sources.native_work_time',return_value=native), \
             patch('cab_platform.closure_git.complete') as git_closure:
            receipt=run_finalization.process(self.run.pk)
            git_closure.assert_not_called()
        self.run.refresh_from_db()
        self.assertEqual(self.run.state,'CLOSED')
        self.assertIsNotNone(receipt['statistics']['global_sha256'])
        self.assertIn('| 21 | 17 | 13 | 11 |',(archive/'STATISTICS.md').read_text())
        self.assertTrue((self.root/'STATISTICS.md').is_file())
        stages=ChangeStageIteration.objects.filter(run=self.run,parent__stage__key='closure').order_by('started_at')
        keys=list(stages.values_list('stage__key',flat=True))
        self.assertLess(keys.index('closure.collect-final-telemetry'),keys.index('closure.calculate-change'))
        self.assertLess(keys.index('closure.calculate-change'),keys.index('closure.calculate-global'))
        self.assertEqual(Event.objects.filter(run=self.run,kind='native-coding-ended').count(),1)
