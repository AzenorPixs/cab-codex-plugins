"""Clôtures, imports et archivage sur PostgreSQL dédié ; preuves simulées en fixture."""
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import unittest
import zlib
from unittest.mock import patch
from contextlib import closing
from test_historical_closure import HistoricalTests
from cab_platform.core import commands as c,run_lifecycle as l,statistics_service as s
from cab_platform.core.models import Actor,Event,LegacySnapshot,Run,SessionArchive,SessionProjection,FinalizationPlan
from cab_platform.migration import cipher


class LifecycleTests(unittest.TestCase):
    setUp=HistoricalTests.setUp
    tearDown=HistoricalTests.tearDown

    def accept(self,run=None,reviewer=None):
        run=run or self.run
        op,_=c.start_operation(self.actor,{'project_id':self.project.pk,'run_id':run.run_id,'session_id':run.session_id,'generation':run.generation,'request_id':'TEST-'+run.run_id,'kind':'local','argv':['/bin/true']})
        op=c.claim_operation(op.pk);c.dispatched(op.pk,op.dispatch_nonce)
        c.complete(op.pk,op.dispatch_nonce,{'request_id':op.request_id,'input_digest':op.input_digest,'source_revision':op.source_revision,'state':'COMPLETED','exit_code':0})
        submission=c.submit(self.actor,{'project_id':self.project.pk,'run_id':run.run_id,'submission_id':'REVIEW-'+run.run_id,'tests':[{'request_id':op.request_id,'criterion':criterion,'outcome':'passed'} for criterion in run.mandate['criteria']]})
        c.review(reviewer or self.actor,{'project_id':self.project.pk,'run_id':run.run_id,'submission_digest':submission['digest'],'decision':'accept','reason':'fixture'})
        run.refresh_from_db();return run

    def close(self):
        self.accept()
        with patch.object(s,'sync',side_effect=lambda *a,**k:s.discover(self.project)):
            result=l.recheck(self.actor,self.data)
        self.run.refresh_from_db();return result

    def test_normal_auto_close_then_archive_keeps_relations(self):
        self.close();self.assertEqual(self.run.state,'CLOSED');self.assertEqual(self.run.stage,11)
        view=l.evaluate(self.run);self.assertTrue(view['archive_allowed'])
        data={**self.data,'evaluation_digest':view['evaluation_digest'],'request_id':'ARCHIVE'}
        result=l.archive_session(self.actor,data);self.assertEqual(l.archive_session(self.actor,data),result)
        with self.assertRaisesRegex(c.Refused,'receipt-conflict'):l.archive_session(self.actor,{**data,'evaluation_digest':'f'*64})
        self.assertTrue(Run.objects.filter(pk=self.run.pk).exists());self.assertEqual(SessionArchive.objects.get(run=self.run).evidence['identity']['session_id'],self.run.session_id)
        self.assertTrue(SessionProjection.objects.get(binding=self.run).archived)
        self.assertEqual(self.run.operation_set.count(),1)

    def test_stale_code_prevents_automatic_close(self):
        self.accept();(self.root/'source').write_text('changé')
        self.assertEqual(l.evaluate(self.run)['reasons'],['accepted-source-stale']);self.run.refresh_from_db();self.assertEqual(self.run.state,'ACCEPTED')

    def test_piloted_final_review_allows_worker_closure(self):
        parent=Actor.objects.create(pk='parent-lifecycle',uid=os.getuid(),agent='fixture',role='orchestrator',token_hash='fixture-parent');parent.projects.add(self.project)
        run=c.begin_run(parent,{'project_id':self.project.pk,'run_id':'PILOT','session_id':'SID-PILOT','mode':'piloted','change':'fixture','paths':['source'],'criteria':['pilot proof'],'decisions_resolved':True,'orchestrator_id':parent.pk,'coder_id':self.actor.pk})
        # Cette non-régression représente un ancien RUN, sans adoption implicite.
        FinalizationPlan.objects.filter(run=run).delete()
        self.accept(run,reviewer=parent)
        with patch.object(s,'sync',side_effect=lambda *a,**k:s.discover(self.project)):l.recheck(None,{'project_id':self.project.pk,'run_id':run.run_id},automatic=True)
        run.refresh_from_db();self.assertEqual(run.state,'CLOSED');self.assertEqual(run.stage,11);self.assertEqual(run.review['decision']['actor'],parent.pk)

    def test_unaccepted_completed_tasks_require_historical_confirmation(self):
        view=l.recheck(self.actor,self.data);self.assertEqual(view['action'],'historical');self.run.refresh_from_db();self.assertEqual(self.run.state,'WORKING')
        (self.path/'tasks.md').write_text('Aucune tâche observée\n')
        self.assertEqual(l.evaluate(self.run)['reasons'],['archive-tasks-incomplete'])

    def test_archive_rechecks_hash_and_authority(self):
        self.close();view=l.evaluate(self.run);data={**self.data,'evaluation_digest':view['evaluation_digest'],'request_id':'ARCHIVE'}
        (self.path/'tasks.md').write_text('- [x] Autre libellé\n')
        with self.assertRaisesRegex(c.Refused,'evaluation-stale'):l.archive_session(self.actor,data)
        other=Actor.objects.create(pk='other-lifecycle',uid=os.getuid(),agent='fixture',token_hash='no')
        with self.assertRaises(c.Refused):l.archive_session(other,data)
        self.assertFalse(SessionArchive.objects.filter(run=self.run).exists())

    def test_archival_relocation_preserves_acceptance(self):
        active=self.root/'openspec/changes/fixture';self.path.rename(active)
        self.run.mandate['paths']=['source','openspec/changes/fixture'];self.run.save()
        self.accept();expected=self.run.review['submission']['source_revision'];active.rename(self.path)
        self.assertNotEqual(c.revision(self.run),expected)
        self.assertEqual(c.revision(self.run,{'openspec/changes/fixture':self.archive}),expected)
        self.assertEqual(l.evaluate(self.run)['action'],'close')

    def legacy(self,closed=True):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'legacy.sqlite'
            with closing(sqlite3.connect(path)) as db,db:
                db.execute('CREATE TABLE bindings(binding TEXT,uid INTEGER,body TEXT)');db.execute('CREATE TABLE binding_closures(binding TEXT,ended_at TEXT)')
                db.execute('INSERT INTO bindings VALUES(?,?,?)',('B',self.actor.uid,json.dumps({'project':self.project.root,'run':self.run.run_id,'session':self.run.session_id,'change':self.run.change,'mode':self.run.mode})))
                if closed:db.execute('INSERT INTO binding_closures VALUES(?,?)',('B','2026-11-12T12:00:00Z'))
            raw=path.read_bytes()
        snapshot=LegacySnapshot.objects.create(source='fixture-snapshot',sha256=hashlib.sha256(raw).hexdigest(),payload={'format':'sqlite-zlib-fernet','ciphertext':cipher().encrypt(zlib.compress(raw)).decode()})
        self.run.mandate={'legacy_snapshot_id':snapshot.pk,'import_sha256':snapshot.sha256,'decisions_resolved':False};self.run.state='CLOSED';self.run.suspension='IMPORT_PROTECTED';self.run.save()
        return snapshot

    def test_legacy_closed_normalized_without_removing_protection(self):
        self.legacy();before=self.run.mandate.copy();self.actor.active=False;self.actor.save()
        self.assertEqual(l.evaluate(self.run)['action'],'normalize')
        l.recheck(None,self.data,automatic=True);self.run.refresh_from_db()
        self.assertEqual(self.run.stage,11);self.assertEqual(self.run.suspension,'IMPORT_PROTECTED');self.assertEqual(self.run.mandate,before)
        self.assertEqual(SessionProjection.objects.get(binding=self.run).state,'CLOSED')
        self.assertTrue(l.evaluate(self.run)['archive_allowed'])

    def test_divergent_and_nonterminal_imports_remain_protected(self):
        snapshot=self.legacy(closed=False)
        self.assertEqual(l.evaluate(self.run)['reasons'],['legacy-terminal-proof-missing'])
        snapshot.sha256='f'*64;snapshot.save();self.assertEqual(l.evaluate(self.run)['reasons'],['legacy-snapshot-divergent'])
        self.run.refresh_from_db();self.assertIsNone(self.run.stage);self.assertEqual(self.run.suspension,'IMPORT_PROTECTED')

    def test_service_without_tasks_is_not_closed(self):
        self.run.mode='service';self.run.state='UNKNOWN';self.run.suspension='IMPORT_PROTECTED';self.run.save()
        result=l.recheck(self.actor,self.data);self.assertEqual(result['action'],'service');self.assertFalse(result['archive_allowed'])
        self.run.refresh_from_db();self.assertEqual(self.run.state,'UNKNOWN');self.assertIsNone(self.run.stage)

    def test_service_terminal_snapshot_can_be_closed_without_tasks(self):
        self.run.mode='service';self.run.save();self.legacy();self.run.state='UNKNOWN';self.run.save()
        result=l.recheck(None,self.data,automatic=True);self.run.refresh_from_db()
        self.assertEqual(self.run.state,'CLOSED');self.assertEqual(self.run.suspension,'IMPORT_PROTECTED');self.assertTrue(result['archive_allowed']);self.assertFalse(result['tasks_applicable'])


if __name__=='__main__':unittest.main()
