"""Service PostgreSQL de fixture : fichiers maîtres, catalogue, verrous et reprises."""
import os
from pathlib import Path
import tempfile
import unittest
import uuid
from unittest.mock import patch
if os.environ.get('CAB_TEST_FIXTURE')!='1':raise RuntimeError('dedicated-postgresql-fixture-required')
import django
django.setup()
from django.db import transaction
from cab_platform.core import commands,statistics_service as s
from cab_platform.core.models import Project,Change,Run,Actor,StatisticsDocument,StatisticsRevision,StatisticsLock,StatisticsJob,ProjectStatistics
from cab_platform import statistics_documents as d

class ServiceTests(unittest.TestCase):
    def setUp(self):
        self.atomic=transaction.atomic();self.atomic.__enter__();self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);self.base=self.root/'openspec/changes';self.base.mkdir(parents=True)
        self.project=Project.objects.create(pk=uuid.uuid4().hex,root=str(self.root),owner_uid=os.getuid(),owner_gid=os.getgid());self.actor=Actor.objects.create(pk=uuid.uuid4().hex,uid=os.getuid(),agent='codex',token_hash=uuid.uuid4().hex);self.actor.projects.add(self.project)
    def tearDown(self):transaction.set_rollback(True);self.atomic.__exit__(None,None,None);self.tmp.cleanup()
    def source(self,name,content=None,archived=False):
        path=self.base/('archive/2026-11-13-'+name if archived else name);path.mkdir(parents=True);(path/'tasks.md').write_text('- [x] 1. Tâche prouvée\n')
        if content is not None:(path/'STATISTICS.md').write_text(content)
        return path
    def publish(self,job,path,content):
        from cab_platform.statistics_io import publish
        expected=d.sha(path.read_bytes()) if path.exists() else None
        return publish({'root':str(self.root),'path':str(path),'content':content,'expected':expected,'uid':os.getuid(),'gid':os.getgid()})['sha256']
    def test_all_changes_catalogued_one_project_and_unstarted_is_not_missing(self):
        self.source('untouched');self.source('done','# Rapport archivé\n',True);s.discover(self.project)
        self.assertEqual(Change.objects.filter(project=self.project).count(),2);self.assertEqual(StatisticsDocument.objects.get(source__change__identifier='untouched').status,'not-started');self.assertEqual(StatisticsDocument.objects.get(source__change__identifier='done').content,'# Rapport archivé\n')
    def test_local_manual_amendment_updates_projection_and_keeps_history(self):
        path=self.source('done','# Rapport\n\n| Mesure | Valeur |\n| --- | --- |\n| Tokens d’entrée | 125 |\n',True);s.discover(self.project)
        document=StatisticsDocument.objects.get(source__change__project=self.project);before=document.sha256
        (path/'STATISTICS.md').write_text((path/'STATISTICS.md').read_text().replace('125','275'));s.import_document(document.source);document.refresh_from_db()
        self.assertNotEqual(before,document.sha256);self.assertEqual(document.metrics.get(key='tokens_input').value,'275');self.assertEqual(document.revisions.count(),2)
        view=s.read_change(self.actor,{'project_id':self.project.pk,'change':'done'});self.assertTrue(view['sources'][0]['in_sync'])
        (path/'STATISTICS.md').write_text('# Nouvelle modification\n');view=s.read_change(self.actor,{'project_id':self.project.pk,'change':'done'});self.assertFalse(view['sources'][0]['in_sync'])
    def test_global_created_without_individual_for_uncoded_change(self):
        path=self.source('untouched');self.source('done','# Source unique\n',True)
        with patch.object(s,'write',side_effect=self.publish):result=s.sync(self.project,'FULL',full=True)
        self.assertFalse((path/'STATISTICS.md').exists());self.assertIn('# Source unique\n',(self.root/'STATISTICS.md').read_text());state=ProjectStatistics.objects.get(project=self.project);self.assertTrue(state.coverage_complete);self.assertLessEqual((state.next_full_sync-state.last_full_sync).total_seconds(),86400);self.assertGreaterEqual((state.next_full_sync-state.last_full_sync).total_seconds(),43200);self.assertEqual(result['state'],'COMPLETED');self.assertFalse((self.root/'.STATISTICS.lock').exists())
    def test_writer_lock_is_durable_and_blocks_concurrent_job(self):
        with s.guarded(self.project,'test','ONE') as (job,previous):
            with self.assertRaisesRegex(commands.Refused,'statistics-project-busy'):
                with s.guarded(self.project,'test','TWO'):pass
        self.assertIsNone(StatisticsLock.objects.get(project=self.project).owner_id)
    def test_framed_file_deletion_is_hashed_without_recreating_it(self):
        path=self.root/'SGS.md';path.write_text('ancien prompt')
        run=commands.begin_run(self.actor,{'project_id':self.project.pk,'run_id':'DELETE','session_id':'SID','mode':'direct','change':'deletion','paths':['SGS.md'],'criteria':['fixture'],'decisions_resolved':True})
        before=commands.revision(run);path.unlink();after=commands.revision(run)
        self.assertNotEqual(before,after);self.assertEqual(after,commands.revision(run));self.assertFalse(path.exists())
        path.symlink_to(self.root/'other')
        with self.assertRaises(commands.Refused):commands.revision(run)
    def test_unknown_changed_file_keeps_protection(self):
        path=self.source('done','# Original\n',True)/'STATISTICS.md';old=d.sha(path.read_bytes())
        with self.assertRaises(OSError):
            with s.guarded(self.project,'test','UNCERTAIN') as (job,previous):
                job.expected={str(path):{'before':old,'after':'a'*64}};job.save();path.write_text('# Modification indépendante\n');raise OSError('fixture')
        self.assertIsNotNone(StatisticsLock.objects.get(project=self.project).owner_id)
        with self.assertRaisesRegex(commands.Refused,'statistics-effect-unknown'):
            with s.guarded(self.project,'test','NEW'):pass
    def test_generation_is_service_owned_and_preserves_manual_text(self):
        path=self.source('coded');(self.root/'source').write_text('fixture');run=commands.begin_run(self.actor,{'project_id':self.project.pk,'run_id':'RUN','session_id':'SID','mode':'direct','change':'coded','paths':['source'],'criteria':['fixture'],'decisions_resolved':True})
        with patch.object(s,'write',side_effect=self.publish):s.sync(self.project,'GENERATE',generate='coded')
        report=path/'STATISTICS.md';self.assertTrue(report.exists());self.assertIn(d.BEGIN,report.read_text());manual=report.read_text().replace('Les valeurs absentes','MES AMENDEMENTS. Les valeurs absentes');report.write_text(manual)
        document=StatisticsDocument.objects.get(source__change=run.change_record);s.import_document(document.source)
        with patch.object(s,'write',side_effect=self.publish):s.sync(self.project,'REGENERATE',generate='coded')
        self.assertEqual(report.read_text(),manual);document.refresh_from_db();self.assertTrue(document.manual_override)

if __name__=='__main__':unittest.main()
