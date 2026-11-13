"""Liaison native transactionnelle sur PostgreSQL de fixture, sans effet DIU."""
import copy
import json
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
from cab_platform.core import commands
from cab_platform.core.models import Actor,Event,Project,Run

class NativeBindingTests(unittest.TestCase):
    def setUp(self):
        self.atomic=transaction.atomic();self.atomic.__enter__();self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        (self.root/'source.txt').write_text('unchanged')
        self.project=Project.objects.create(pk=uuid.uuid4().hex,root=str(self.root),owner_uid=os.getuid())
        self.actor=Actor.objects.create(pk=uuid.uuid4().hex,uid=os.getuid(),agent='codex',token_hash=uuid.uuid4().hex);self.actor.projects.add(self.project)
        self.run=commands.begin_run(self.actor,{'project_id':self.project.pk,'run_id':'NATIVE-FIXTURE','session_id':'EXACT-SID','mode':'direct','change':'fixture','paths':['source.txt'],'criteria':['test'],'decisions_resolved':True})
        self.source=self.root/'native.jsonl';self.source.write_text(json.dumps({'type':'session_meta','payload':{'id':self.run.session_id,'cwd':str(self.root)}})+'\n')
        self.query={'project_id':self.project.pk,'run_id':self.run.run_id};self.before=copy.deepcopy(self.run.mandate)
    def tearDown(self):
        transaction.set_rollback(True);self.atomic.__exit__(None,None,None);self.tmp.cleanup()
    def test_explicit_and_automatic_repeat_preserve_run(self):
        from cab_platform.native_sources import inspect
        found=inspect(self.actor.uid,self.run.session_id,self.project.root,str(self.source))
        commands.bind_native(self.actor,{**self.query,'source_file':str(self.source)})
        with patch('cab_platform.native_sources.locate',return_value=found):commands.bind_native(self.actor,self.query)
        self.run.refresh_from_db();expected={**self.before,'native_source':found};self.assertEqual(self.run.mandate,expected)
        self.assertEqual((self.run.session_id,self.run.generation,self.run.state),('EXACT-SID',1,'WORKING'));self.assertEqual(Event.objects.filter(run=self.run,kind='native-source-bound').count(),1)
        other=self.root/'other.jsonl';other.write_bytes(self.source.read_bytes())
        with self.assertRaisesRegex(commands.Refused,'replacement-refused'):commands.bind_native(self.actor,{**self.query,'source_file':str(other)})
    def test_locate_is_read_only_and_scoped(self):
        from cab_platform.native_sources import inspect
        found=inspect(self.actor.uid,self.run.session_id,self.project.root,str(self.source));count=Run.objects.count();events=Event.objects.count()
        with patch('cab_platform.native_sources.locate',return_value=found):
            result=commands.locate_native(self.actor,{'project_id':self.project.pk,'session_id':self.run.session_id})
        self.assertEqual(result['source_file'],str(self.source));self.assertEqual(Run.objects.count(),count);self.assertEqual(Event.objects.count(),events)
        self.run.refresh_from_db();self.assertEqual(self.run.mandate,self.before)
        other=Actor.objects.create(pk=uuid.uuid4().hex,uid=os.getuid(),agent='codex',token_hash=uuid.uuid4().hex)
        with self.assertRaises(commands.Refused):commands.locate_native(other,{'project_id':self.project.pk,'session_id':self.run.session_id})
    def test_indexed_resume_keeps_sid_run_and_source_history(self):
        commands.bind_native(self.actor,{**self.query,'source_file':str(self.source)})
        resumed=self.root/'resumed.jsonl';resumed.write_bytes(self.source.read_bytes())
        with patch('cab_platform.native_sources.indexed_path',return_value=str(resumed)):
            commands.bind_native(self.actor,{**self.query,'source_file':str(resumed),'resume':True})
            commands.bind_native(self.actor,{**self.query,'source_file':str(resumed),'resume':True})
        self.run.refresh_from_db();history=self.run.mandate['native_source_history'];self.assertEqual(len(history),1);self.assertEqual(history[0]['previous']['source_file'],str(self.source));self.assertEqual(self.run.session_id,'EXACT-SID');self.assertEqual(self.run.run_id,'NATIVE-FIXTURE');self.assertEqual(self.run.generation,1)
        third=self.root/'third.jsonl';third.write_bytes(self.source.read_bytes());self.run.mandate['native_frozen_at']='2026-11-13T00:00:00Z';self.run.save()
        with patch('cab_platform.native_sources.indexed_path',return_value=str(third)),self.assertRaisesRegex(commands.Refused,'resume-state-invalid'):commands.bind_native(self.actor,{**self.query,'source_file':str(third),'resume':True})

if __name__=='__main__':unittest.main()
