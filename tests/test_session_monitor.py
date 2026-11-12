"""Cycle, tables et tâches sur PostgreSQL de fixture, sans fichiers utilisateurs."""
import json
import hashlib
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
        commands.progress(self.actor,{'project_id':self.project.pk,'run_id':'RUN','stage':7,'phase':'WORK'})
        commands.progress(self.actor,{'project_id':self.project.pk,'run_id':'RUN','stage':3,'phase':'WORK'})
        self.run.refresh_from_db();self.assertEqual(self.run.stage,3);self.assertEqual(self.run.state,'WORKING');self.assertEqual(self.run.review,{})
        self.assertEqual(SessionProjection.objects.get(binding=self.run).stage,3)
        for stage in [0,12,True]:
            with self.assertRaises(commands.Refused):commands.progress(self.actor,{'project_id':self.project.pk,'run_id':'RUN','stage':stage})
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
        detail=monitor.details(self.run);self.assertIsNone(detail['stage']);self.assertIsNone(detail['native_activity']);self.assertIsNone(detail['terminal_gate'])
        self.assertEqual([Project._meta.db_table,Run._meta.db_table,CodingSession._meta.db_table,Change._meta.db_table,ChangeTask._meta.db_table],['projects','runs','sessions','changes','change_tasks'])

if __name__=='__main__':unittest.main()
