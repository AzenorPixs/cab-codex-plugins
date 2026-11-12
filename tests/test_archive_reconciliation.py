"""Réconciliation transactionnelle sur PostgreSQL de fixture ; aucun effet externe."""
import copy
import os
from pathlib import Path
import tempfile
import unittest
import uuid
from unittest.mock import Mock,patch
os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
import django
django.setup()
from django.db import transaction
from cab_platform.core import commands
from cab_platform.core.models import Actor,Project,Run,Operation,Event,Resource,Lease
from cab_platform.client import ClientError
from cab_platform import mcp

class ArchiveTests(unittest.TestCase):
    def setUp(self):
        self.atomic=transaction.atomic();self.atomic.__enter__()
        self.tmp=tempfile.TemporaryDirectory(prefix='cab-archive-test-');self.root=Path(self.tmp.name)
        self.change='fixture-change';self.old=self.root/'openspec/changes'/self.change;self.old.mkdir(parents=True)
        for name in ('proposal.md','tasks.md'):(self.old/name).write_text('# Fixture\n')
        (self.root/'source.txt').write_text('source conservée\n')
        self.project=Project.objects.create(pk=uuid.uuid4().hex,root=str(self.root),owner_uid=os.getuid())
        self.actor=Actor.objects.create(pk=uuid.uuid4().hex,uid=os.getuid(),agent='codex',token_hash=uuid.uuid4().hex);self.actor.projects.add(self.project)
        self.run=commands.begin_run(self.actor,{'project_id':self.project.pk,'run_id':'DIRECT','session_id':'SID-EXACT','mode':'direct','change':self.change,'paths':['source.txt','openspec/changes/'+self.change],'criteria':['test'],'decisions_resolved':True})
        self.run.mandate['native_frozen_at']='2026-11-12T10:00:00Z';self.run.save()
        self.receipt=Operation.objects.create(run=self.run,request_id='OLD-FAILED',input_digest='a'*64,source_revision=self.run.source_revision,dispatch_nonce='b'*64,state='FAILED_TO_START',receipt={'dispatched':False},receipt_digest='c'*64)
        self.archive='openspec/changes/archive/2026-11-12-'+self.change
        self.payload={'project_id':self.project.pk,'run_id':self.run.run_id,'archive_path':self.archive,'expected_framing_digest':self.run.mandate['framing_digest']}
    def tearDown(self):
        transaction.set_rollback(True);self.atomic.__exit__(None,None,None);self.tmp.cleanup()
    def archive_files(self):
        target=self.root/self.archive;target.parent.mkdir(parents=True,exist_ok=True);self.old.rename(target);return target
    def test_reconcile_idempotent_then_new_request_preserves_receipts_and_freeze(self):
        self.archive_files();original=copy.deepcopy(self.run.mandate)
        first=commands.reconcile_archive(self.actor,self.payload);second=commands.reconcile_archive(self.actor,self.payload)
        self.assertEqual(first['state'],'RECONCILED');self.assertEqual(second['state'],'ALREADY_RECONCILED')
        self.assertEqual(Event.objects.filter(run=self.run,kind='mandate-archive-reconciled').count(),1)
        self.run.refresh_from_db();self.receipt.refresh_from_db()
        self.assertEqual(self.run.session_id,'SID-EXACT');self.assertEqual(self.run.generation,1);self.assertEqual(self.run.state,'WORKING')
        self.assertEqual(self.run.mandate['native_frozen_at'],original['native_frozen_at']);self.assertEqual(self.receipt.receipt_digest,'c'*64)
        self.assertEqual(self.run.mandate['paths'],['source.txt',self.archive]);self.assertEqual(self.run.mandate['criteria'],original['criteria'])
        operation,created=commands.start_operation(self.actor,{'project_id':self.project.pk,'run_id':'DIRECT','session_id':'SID-EXACT','generation':1,'request_id':'NEW-TEST','kind':'local','argv':['/bin/true']})
        self.assertTrue(created);self.assertEqual(operation.state,'WAITING');self.assertFalse(operation.dispatched)
    def test_live_source_wrong_date_and_other_change_refused(self):
        with self.assertRaises(commands.Refused):commands.reconcile_archive(self.actor,self.payload)
        self.archive_files()
        for value in ['openspec/changes/archive/2026-11-12-other','openspec/changes/archive/2026-99-99-'+self.change,'../outside']:
            with self.assertRaises(commands.Refused):commands.reconcile_archive(self.actor,{**self.payload,'archive_path':value})
    def test_stale_digest_and_other_actor_refused(self):
        self.archive_files()
        with self.assertRaises(commands.Refused):commands.reconcile_archive(self.actor,{**self.payload,'expected_framing_digest':'0'*64})
        other=Actor.objects.create(pk=uuid.uuid4().hex,uid=os.getuid(),agent='codex',token_hash=uuid.uuid4().hex);other.projects.add(self.project)
        with self.assertRaises(commands.Refused):commands.reconcile_archive(other,self.payload)
    def test_waiting_and_unknown_operations_keep_protections(self):
        self.archive_files()
        for state in ('WAITING','INTENT','RUNNING','UNKNOWN'):
            self.receipt.state=state;self.receipt.save()
            with self.assertRaises(commands.Refused):commands.reconcile_archive(self.actor,self.payload)
            self.run.refresh_from_db();self.assertEqual(self.run.mandate['framing_digest'],self.payload['expected_framing_digest'])
    def test_held_bank_blocks_reconciliation(self):
        self.archive_files();resource=Resource.objects.create(pk='fixture-'+uuid.uuid4().hex)
        Lease.objects.create(run=self.run,resource=resource,fencing=1)
        with self.assertRaises(commands.Refused):commands.reconcile_archive(self.actor,self.payload)
    def test_symlink_archive_refused_without_state_change(self):
        self.archive_files();target=self.root/self.archive;renamed=target.with_name('elsewhere');target.rename(renamed);target.symlink_to(renamed)
        with self.assertRaises(commands.Refused):commands.reconcile_archive(self.actor,self.payload)
        self.run.refresh_from_db();self.assertEqual(self.run.mandate['framing_digest'],self.payload['expected_framing_digest'])

class MCPDiagnosticsTests(unittest.IsolatedAsyncioTestCase):
    async def test_lost_admission_is_not_retried_or_declared_no_effect(self):
        client=Mock();client.command.side_effect=ClientError('cab-unavailable')
        with patch.object(mcp,'client',return_value=client):
            result=await mcp.execute('local','project','run','sid',1,'REQ',['/bin/true'],1000,[])
        self.assertEqual(result['state'],'ADMISSION_UNCONFIRMED');self.assertFalse(result['retry_execution']);self.assertNotIn('dispatched',result);client.command.assert_called_once()
    async def test_missing_receipt_is_explicit_and_read_only(self):
        client=Mock();client.get.side_effect=ClientError('not-found')
        with patch.object(mcp,'client',return_value=client):result=mcp.atelier_status('project','run','REQ')
        self.assertEqual(result['state'],'NOT_FOUND');self.assertEqual(result['request_id'],'REQ');client.command.assert_not_called()

if __name__=='__main__':unittest.main()
