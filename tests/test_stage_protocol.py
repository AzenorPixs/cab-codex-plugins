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
