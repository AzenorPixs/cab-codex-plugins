"""Cycle, tables et tâches sur PostgreSQL de fixture, sans fichiers utilisateurs."""
import json
import hashlib
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch
import os
from pathlib import Path
import tempfile
import unittest
import uuid
os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
import django
django.setup()
from django.db import transaction
from cab_platform.core import commands,monitor
from cab_platform.core.models import Actor,Project,Run,CodingSession,Change,ChangeTask,SessionProjection

class MonitorTests(unittest.TestCase):
    def setUp(self):
        self.atomic=transaction.atomic();self.atomic.__enter__();self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        self.project=Project.objects.create(pk=uuid.uuid4().hex,root=str(self.root),owner_uid=os.getuid());self.actor=Actor.objects.create(pk=uuid.uuid4().hex,uid=os.getuid(),agent='codex',token_hash=uuid.uuid4().hex);self.actor.projects.add(self.project)
        self.path=self.root/'openspec/changes/change';self.path.mkdir(parents=True);self.tasks=self.path/'tasks.md';self.tasks.write_text('- [x] 1. Première\n- [ ] 2. Seconde\n```md\n- [x] Ceci est un exemple\n```\n')
        self.run=commands.begin_run(self.actor,{'project_id':self.project.pk,'run_id':'RUN','session_id':'SID-SHARED','mode':'direct','change':'change','paths':['openspec/changes/change'],'criteria':['test'],'decisions_resolved':True})
    def tearDown(self):transaction.set_rollback(True);self.atomic.__exit__(None,None,None);self.tmp.cleanup()
    def test_registered_profiles_require_private_file_and_matching_actor(self):
        from cab_platform.finalization import registered_profiles
        token='synthetic-profile-token';self.actor.token_hash=hashlib.sha256(token.encode()).hexdigest();self.actor.save()
        home=self.root/'home';profile=home/'.config/cab/codex.json';profile.parent.mkdir(parents=True);profile.write_text(json.dumps({'actor_id':self.actor.pk,'token':token}));profile.chmod(0o600)
        user=SimpleNamespace(pw_uid=os.getuid(),pw_gid=os.getgid(),pw_dir=str(home),pw_name='fixture')
        with patch('cab_platform.finalization.pwd.getpwuid',return_value=user):
            self.assertIn({'agent':'codex','uid':os.getuid()},registered_profiles())
            profile.chmod(0o644);self.assertEqual(registered_profiles(),[])
            profile.chmod(0o600);profile.write_text(json.dumps({'actor_id':self.actor.pk,'token':'wrong'}));self.assertEqual(registered_profiles(),[])
    def test_stage_moves_backwards_without_acceptance(self):
        commands.progress(self.actor,{'project_id':self.project.pk,'run_id':'RUN','stage':5,'phase':'WORK'})
        commands.progress(self.actor,{'project_id':self.project.pk,'run_id':'RUN','stage':3,'phase':'WORK'})
        self.run.refresh_from_db();self.assertEqual(self.run.stage,3);self.assertEqual(self.run.state,'WORKING');self.assertEqual(self.run.review,{})
        self.assertEqual(SessionProjection.objects.get(binding=self.run).stage,3)
        for stage in [0,13,True]:
            with self.assertRaises(commands.Refused):commands.progress(self.actor,{'project_id':self.project.pk,'run_id':'RUN','stage':stage})

    def test_skill_acknowledgement_precedes_implementation(self):
        from cab_platform.version_skill import acknowledge,REVISION
        target={'project_id':self.project.pk,'run_id':'RUN'}
        with self.assertRaisesRegex(commands.Refused,'version-skill-ack-required'):
            commands.progress(self.actor,{**target,'stage':7})
        commands.progress(self.actor,{**target,'stage':5})
        self.assertTrue(acknowledge(self.actor,{**target,'revision':REVISION,'confirmed':True})['acknowledged'])
        self.assertEqual(commands.progress(self.actor,{**target,'stage':7})['stage'],7)

    def test_connected_direct_owner_can_record_an_exact_authorized_extension(self):
        target={'project_id':self.project.pk,'run_id':'RUN','request_id':'direct-path'}
        commands.exception(self.actor,{**target,'category':'outside-framing','summary':'Ajout accordé'})
        data={**target,'decision':'approved','scope':{
            'paths':['integrations/codex/cab/skills/version/SKILL.md'],
            'authorization':'Autorisation explicite datée du développeur pour le skill Version.',
        }}
        with self.assertRaisesRegex(commands.Refused,'exception-authority-required'):
            commands.exception_decision(self.actor,data)
        with self.assertRaisesRegex(commands.Refused,'exception-authority-required'):
            commands.exception_decision(self.actor,{**data,'scope':{'paths':data['scope']['paths']}},
                                        direct_connection=True)
        with self.assertRaisesRegex(commands.Refused,'path-protected'):
            commands.exception_decision(self.actor,{**data,'scope':{**data['scope'],'paths':['project.env']}},
                                        direct_connection=True)
        with self.assertRaisesRegex(commands.Refused,'exception-direct-file-required'):
            commands.exception_decision(self.actor,{**data,'scope':{**data['scope'],'paths':['openspec/changes']}},
                                        direct_connection=True)
        receipt=commands.exception_decision(self.actor,data,direct_connection=True)
        self.assertEqual(receipt['added_paths'],data['scope']['paths'])
        self.assertEqual(commands.exception_decision(self.actor,data,direct_connection=True),receipt)
        self.assertFalse((self.root/data['scope']['paths'][0]).exists())

    def test_piloted_coder_cannot_use_direct_extension(self):
        target={'project_id':self.project.pk,'run_id':'RUN','request_id':'piloted-path'}
        Run.objects.filter(pk=self.run.pk).update(mode='piloted')
        commands.exception(self.actor,{**target,'category':'outside-framing','summary':'Demande du codeur'})
        with self.assertRaisesRegex(commands.Refused,'exception-authority-required'):
            commands.exception_decision(self.actor,{**target,'decision':'approved','scope':{
                'paths':['docs/version.md'],'authorization':'Accord annoncé par le codeur piloté.',
            }},direct_connection=True)

    def test_change_cumulative_duration_includes_restarts_without_double_counting(self):
        from django.utils import timezone
        from cab_platform.change_stage_metrics import summarize

        second=commands.begin_run(self.actor,{
            'project_id':self.project.pk,'run_id':'RUN2','session_id':'SID-RESTART',
            'mode':'direct','change':'change','paths':['openspec/changes/change'],
            'criteria':['test'],'decisions_resolved':True,
        })
        base=timezone.now()
        for run,start,elapsed in ((self.run,0,10),(second,20,12)):
            target={'project_id':self.project.pk,'run_id':run.run_id}
            with patch('django.utils.timezone.now',return_value=base+timedelta(seconds=start)):
                commands.progress(self.actor,{**target,'stage':5,'description':'Spécification examinée'})
            with patch('django.utils.timezone.now',return_value=base+timedelta(seconds=start+2)):
                commands.progress(self.actor,{**target,'stage':5})
            with patch('django.utils.timezone.now',return_value=base+timedelta(seconds=start+elapsed)):
                commands.progress(self.actor,{**target,'stage':4})

        summary=summarize(second.change_record)
        stage=next(item for item in summary['stages'] if item['key']=='specification')
        self.assertEqual(stage['iteration_count'],2)
        self.assertEqual(stage['duration_seconds'],22)
        self.assertEqual([item['run_id'] for item in stage['iterations']],['RUN','RUN2'])
        self.assertEqual([item['description_source'] for item in stage['iterations']],['agent','agent'])

    def test_task_rows_update_atomically_and_removed_rows_are_retained(self):
        monitor.refresh_changes();change=Change.objects.get(project=self.project,identifier='change');self.assertEqual((change.tasks_done,change.tasks_total),(1,2))
        first=ChangeTask.objects.get(change=change,source_id='number:1:1');second=ChangeTask.objects.get(change=change,source_id='number:2:1')
        self.tasks.write_text('- [ ] 1. Première modifiée\n');monitor.refresh_changes();first.refresh_from_db();second.refresh_from_db();change.refresh_from_db()
        self.assertFalse(first.completed);self.assertTrue(first.active);self.assertFalse(second.active);self.assertEqual((change.tasks_done,change.tasks_total),(0,1))
        projection=SessionProjection.objects.get(binding=self.run);self.assertEqual((projection.tasks_done,projection.tasks_total),(0,1))
        self.tasks.unlink();monitor.refresh_changes();change.refresh_from_db();self.assertEqual(change.source_state,'unavailable');self.assertEqual(change.tasks_total,1);self.assertEqual(ChangeTask.objects.filter(change=change).count(),2)
    def test_archive_and_ambiguity_and_symlinks(self):
        archive=self.root/'openspec/changes/archive/2026-11-12-change';archive.parent.mkdir();self.path.rename(archive);monitor.refresh_changes();self.run.refresh_from_db();self.run.change_record.refresh_from_db();self.assertEqual(self.run.change_record.source_state,'archived')
        self.path.mkdir();(self.path/'tasks.md').write_text('- [ ] Other\n');monitor.refresh_changes();self.run.change_record.refresh_from_db();self.assertEqual(self.run.change_record.source_state,'ambiguous')
        (self.path/'tasks.md').unlink();self.path.rmdir();(archive/'tasks.md').unlink();(archive/'tasks.md').symlink_to('/etc/passwd');monitor.refresh_changes();self.run.change_record.refresh_from_db();self.assertEqual(self.run.change_record.source_state,'unavailable')
    def test_shared_session_entities_and_unknown_fields(self):
        second=commands.begin_run(self.actor,{'project_id':self.project.pk,'run_id':'RUN2','session_id':'SID-SHARED','mode':'direct','change':'change','paths':['openspec/changes/change'],'criteria':['test'],'decisions_resolved':True})
        self.run.refresh_from_db();self.assertEqual(second.coding_session_id,self.run.coding_session_id);self.assertEqual(second.change_record_id,self.run.change_record_id)
        detail=monitor.details(self.run);self.assertEqual(detail['stage'],1);self.assertIsNone(detail['native_activity']);self.assertIsNone(detail['terminal_gate'])
        self.assertEqual([Project._meta.db_table,Run._meta.db_table,CodingSession._meta.db_table,Change._meta.db_table,ChangeTask._meta.db_table],['projects','runs','sessions','changes','change_tasks'])

if __name__=='__main__':unittest.main()
