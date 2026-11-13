"""Régularisation sur fixture PostgreSQL ; aucun travail historique rejoué."""
import os
import tempfile
import unittest
import uuid
from pathlib import Path
if os.environ.get('CAB_TEST_FIXTURE')!='1':raise RuntimeError('dedicated-postgresql-fixture-required')
import django
django.setup()
from django.db import transaction
from cab_platform.core import commands as c,historical as h
from cab_platform.core.models import Actor,Event,Project,Operation,Lease,Resource,Maintenance,MeasurementPeriod


class HistoricalTests(unittest.TestCase):
    def setUp(self):
        self.tx=transaction.atomic();self.tx.__enter__();self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        self.actor=Actor.objects.create(pk=uuid.uuid4().hex,uid=os.getuid(),agent='fixture',token_hash=uuid.uuid4().hex)
        self.project=Project.objects.create(pk=uuid.uuid4().hex,root=str(self.root),owner_uid=os.getuid(),owner_gid=os.getgid());self.actor.projects.add(self.project)
        (self.root/'source').write_text('stable')
        self.run=c.begin_run(self.actor,{'project_id':self.project.pk,'run_id':'HISTORY','session_id':'SID-HISTORY','mode':'direct','change':'fixture','paths':['source'],'criteria':['historical'],'decisions_resolved':True})
        self.archive='openspec/changes/archive/2026-11-12-fixture';self.path=self.root/self.archive;self.path.mkdir(parents=True)
        for name in ('proposal.md','review.md','STATISTICS.md'):(self.path/name).write_text('# Preuve historique\n')
        (self.path/'tasks.md').write_text('- [x] 1. Travail historique\n')
        self.data={'project_id':self.project.pk,'run_id':self.run.run_id,'archive_path':self.archive}
    def tearDown(self):
        transaction.set_rollback(True);self.tx.__exit__(None,None,None);self.tmp.cleanup()
    def confirmation(self):
        return {**self.data,'evidence_digest':h.inspect(self.actor,self.data)['evidence_digest'],'receipt_id':'HISTORICAL-CLOSE','authorization':'Instruction explicite du développeur dans le mandat de fixture','reason':'Régularisation documentaire du cycle historique archivé.','developer_authorized':True}
    def test_close_preserves_identity_operations_and_no_acceptance(self):
        self.run.mandate['native_frozen_at']='2026-11-12T12:00:00Z';self.run.save()
        op=Operation.objects.create(run=self.run,request_id='OLD-FAILED',state='FAILED_TO_START',input_digest='old',source_revision='old',request={'kind':'local'},receipt={'dispatched':False},receipt_digest='historical')
        before=(self.run.session_id,self.run.generation,self.run.mandate,op.receipt)
        data=self.confirmation();receipt=h.close(self.actor,data);self.run.refresh_from_db();op.refresh_from_db()
        self.assertEqual(self.run.state,'CLOSED');self.assertEqual(self.run.stage,11);self.assertFalse(receipt['normal_acceptance']);self.assertEqual(receipt['branch'],'HISTORIQUE')
        self.assertEqual(before,(self.run.session_id,self.run.generation,self.run.mandate,op.receipt));self.assertEqual(Operation.objects.filter(run=self.run).count(),1)
        (self.path/'review.md').write_text('amendé ultérieurement')
        self.assertEqual(h.close(self.actor,data),receipt);self.assertEqual(Event.objects.filter(run=self.run,kind='run-closed').count(),1)
        with self.assertRaisesRegex(c.Refused,'closure-receipt-conflict'):h.close(self.actor,{**data,'reason':'Une autre justification différente.'})
    def test_stale_evidence_and_missing_authorization(self):
        data=self.confirmation()
        with self.assertRaisesRegex(c.Refused,'authorization'):h.close(self.actor,{**data,'developer_authorized':False})
        (self.path/'review.md').write_text('Preuve modifiée')
        with self.assertRaisesRegex(c.Refused,'historical-evidence-stale'):h.close(self.actor,data)
        self.run.refresh_from_db();self.assertEqual(self.run.state,'WORKING')
    def test_incomplete_ambiguous_active_and_unsafe_archives(self):
        (self.path/'tasks.md').write_text('- [ ] Incomplet\n')
        with self.assertRaisesRegex(c.Refused,'tasks-incomplete'):h.inspect(self.actor,self.data)
        (self.path/'tasks.md').write_text('- [x] Complet\n')
        active=self.root/'openspec/changes/fixture';active.mkdir()
        with self.assertRaisesRegex(c.Refused,'source-active'):h.inspect(self.actor,self.data)
        active.rmdir();duplicate=self.path.with_name('2026-11-13-fixture');duplicate.mkdir()
        with self.assertRaisesRegex(c.Refused,'archive-ambiguous'):h.inspect(self.actor,self.data)
        duplicate.rmdir();(self.path/'review.md').unlink();(self.path/'review.md').symlink_to(self.root/'source')
        with self.assertRaisesRegex(c.Refused,'proof-unavailable'):h.inspect(self.actor,self.data)
    def test_unknown_and_held_lease_are_protected(self):
        op=Operation.objects.create(run=self.run,request_id='UNKNOWN',state='UNKNOWN',input_digest='old',source_revision='old')
        with self.assertRaisesRegex(c.Refused,'effects-protected'):h.inspect(self.actor,self.data)
        op.state='FAILED_TO_START';op.save();resource=Resource.objects.create(key=uuid.uuid4().hex)
        Lease.objects.create(run=self.run,resource=resource,fencing=1)
        with self.assertRaisesRegex(c.Refused,'effects-protected'):h.inspect(self.actor,self.data)
    def test_other_owner_and_piloted_rejected(self):
        other=Actor.objects.create(pk=uuid.uuid4().hex,uid=os.getuid(),agent='fixture',token_hash=uuid.uuid4().hex);other.projects.add(self.project)
        with self.assertRaisesRegex(c.Refused,'authority-required'):h.inspect(other,self.data)
        self.run.mode='piloted';self.run.save()
        with self.assertRaisesRegex(c.Refused,'direct-required'):h.inspect(self.actor,self.data)
    def test_maintenance_and_open_measurement_rejected(self):
        maintenance=Maintenance.objects.create(transaction_id=uuid.uuid4().hex,state='PREPARED')
        with self.assertRaisesRegex(c.Refused,'maintenance-in-progress'):h.inspect(self.actor,self.data)
        maintenance.delete()
        MeasurementPeriod.objects.create(run=self.run,session=self.run.coding_session,change=self.run.change_record,started=self.run.created)
        with self.assertRaisesRegex(c.Refused,'historical-measurement-open'):h.inspect(self.actor,self.data)


if __name__=='__main__':unittest.main()
