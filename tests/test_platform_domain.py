"""Règles critiques sur PostgreSQL réel, uniquement sur le fixture explicitement fourni."""
import hashlib
import json
import os
from pathlib import Path
import sys
import sqlite3
import tempfile
import unittest
from types import SimpleNamespace
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
if not os.environ.get('CAB_CONFIG','').startswith(str(ROOT/'output/scm/cab-3.0.0/web-smoke/')):
    raise RuntimeError('dedicated-postgresql-fixture-required')
os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
import django
django.setup()
from django.db import transaction
from cab_platform.core import commands as c
from cab_platform.core.models import Actor,Lease,Operation,Maintenance,Metric,Run,LegacySnapshot
from cab_platform.core.api import maintenance_command

class DomainTests(unittest.TestCase):
    def setUp(self):
        self.atomic=transaction.atomic();self.atomic.__enter__()
        self.tmp=tempfile.TemporaryDirectory(dir=ROOT/'output/scm/cab-3.0.0')
        self.root=Path(self.tmp.name);(self.root/'source.txt').write_text('initial\n')
        self.actor=Actor.objects.create(id='fixture-coder',uid=os.getuid(),role='coder',agent='fixture',token_hash=hashlib.sha256(b'fixture-coder').hexdigest())
        self.parent=Actor.objects.create(id='fixture-parent',uid=os.getuid(),role='orchestrator',agent='fixture',token_hash=hashlib.sha256(b'fixture-parent').hexdigest())
        self.project=c.register_project(self.actor,str(self.root));self.parent.projects.add(self.project)
    def tearDown(self):
        transaction.set_rollback(True);self.atomic.__exit__(None,None,None);self.tmp.cleanup()
    def run_data(self,name='RUN-one',mode='direct'):
        return {'project_id':self.project.pk,'run_id':name,'session_id':'SID-'+name,'mode':mode,'change':'fixture-change','decisions_resolved':True,'criteria':['minimal-proof'],'paths':['source.txt'],'coder_id':self.actor.pk,'orchestrator_id':self.parent.pk}
    def begin(self,name='RUN-one',mode='direct'):
        return c.begin_run(self.parent if mode=='piloted' else self.actor,self.run_data(name,mode))
    def operation(self,run,name='OP-one'):
        return c.start_operation(self.actor,{'project_id':self.project.pk,'run_id':run.run_id,'session_id':run.session_id,'generation':run.generation,'request_id':name,'kind':'local','argv':['/bin/true']})[0]
    def receipt(self,op,state='COMPLETED'):
        return {'request_id':op.request_id,'input_digest':op.input_digest,'source_revision':op.source_revision,'state':state,'exit_code':0 if state=='COMPLETED' else None}
    def test_identity_and_no_replay(self):
        run=self.begin();self.assertEqual(self.begin().pk,run.pk)
        op=self.operation(run);self.assertEqual(self.operation(run).pk,op.pk)
        op=c.claim_operation(op.pk);c.dispatched(op.pk,op.dispatch_nonce)
        with self.assertRaises(c.Refused):c.dispatched(op.pk,op.dispatch_nonce)
        c.complete(op.pk,op.dispatch_nonce,self.receipt(op))
        self.assertIsNone(c.claim_operation(op.pk))
        self.assertEqual(self.operation(run).state,'COMPLETED')
    def test_unknown_preserves_lease(self):
        first=self.operation(self.begin());second=self.operation(self.begin('RUN-two'))
        first=c.claim_operation(first.pk);c.dispatched(first.pk,first.dispatch_nonce)
        c.complete(first.pk,first.dispatch_nonce,self.receipt(first,'UNKNOWN'))
        self.assertTrue(Lease.objects.filter(operation=first,state='HELD').exists())
        self.assertIsNone(c.claim_operation(second.pk))
        with self.assertRaises(c.Refused):c.submit(self.actor,{'project_id':self.project.pk,'run_id':first.run.run_id,'tests':[]})
    def test_piloted_review_is_final_and_parent_only(self):
        run=self.begin(mode='piloted');op=c.claim_operation(self.operation(run).pk)
        c.dispatched(op.pk,op.dispatch_nonce);c.complete(op.pk,op.dispatch_nonce,self.receipt(op))
        submission=c.submit(self.actor,{'project_id':self.project.pk,'run_id':run.run_id,'submission_id':'final-one','tests':[{'request_id':op.request_id,'criterion':'minimal-proof','outcome':'passed'}]})
        decision={'project_id':self.project.pk,'run_id':run.run_id,'submission_digest':submission['digest'],'decision':'accept'}
        with self.assertRaises(c.Refused):c.review(self.actor,decision)
        self.assertEqual(c.review(self.parent,decision)['decision']['decision'],'accept')
    def test_changed_sources_invalidate_tests(self):
        run=self.begin();op=c.claim_operation(self.operation(run).pk)
        c.dispatched(op.pk,op.dispatch_nonce);c.complete(op.pk,op.dispatch_nonce,self.receipt(op))
        (self.root/'source.txt').write_text('changed\n')
        with self.assertRaises(c.Refused):c.submit(self.actor,{'project_id':self.project.pk,'run_id':run.run_id,'submission_id':'stale','tests':[{'request_id':op.request_id,'criterion':'minimal-proof','outcome':'passed'}]})
    def test_maintenance_retains_waiting_and_blocks_admission(self):
        op=self.operation(self.begin())
        maintenance_command(self.parent,'maintenance.prepare',{'transaction_id':'fixture-update'})
        with self.assertRaises(c.Refused):c.claim_operation(op.pk)
        op.refresh_from_db();self.assertEqual(op.state,'WAITING')
        maintenance_command(self.parent,'maintenance.resume',{'transaction_id':'fixture-update'})
        self.assertIsNotNone(c.claim_operation(op.pk))
    def test_parent_cannot_execute_as_coder(self):
        run=self.begin(mode='piloted')
        with self.assertRaises(c.Refused):c.start_operation(self.parent,{'project_id':self.project.pk,'run_id':run.run_id,'session_id':run.session_id,'generation':1,'request_id':'parent-effect','kind':'local','argv':['/bin/true']})
    def test_native_collection_is_bound_to_run_and_quantitative(self):
        from cab_platform.collectors import codex_metrics
        run=self.begin();source=self.root/'native.jsonl'
        rows=[{'type':'session_meta','payload':{'id':run.session_id,'cwd':str(self.root)}},{'type':'response_item','payload':{'text':'synthetic-private-prompt'}},{'type':'event_msg','payload':{'type':'token_count','info':{'total_token_usage':{'input_tokens':17,'output_tokens':3,'total_tokens':20}}}}]
        source.write_text('\n'.join(json.dumps(row) for row in rows)+'\n');info=source.stat()
        run.mandate['native_source']={'source_file':str(source),'device':info.st_dev,'inode':info.st_ino};run.save()
        codex_metrics(run);codex_metrics(run)
        metric=Metric.objects.get(run=run);self.assertEqual(metric.values['tokens_total'],'20');self.assertNotIn('synthetic-private-prompt',str(metric.values));self.assertEqual(Metric.objects.filter(run=run).count(),1)
        run.mandate['native_frozen_at']='fixture';run.save();source.write_text('replaced\n');codex_metrics(run)
        self.assertEqual(Metric.objects.get(run=run).values['tokens_total'],'20')
    def test_legacy_import_preserves_identity_and_uncertain_lease(self):
        from cab_platform.migration import import_manifest
        source=self.root/'controller-runs.json';key='file:'+str(self.root/'source.txt')
        source.write_text(json.dumps({'project':str(self.root),'runs':[{'runId':'LEGACY-one','sessionId':'SID-legacy','changeId':'legacy-change','version':1437,'contextId':1432,'state':'UNKNOWN','password':'synthetic-never-public'}],'coordination':{'accesses':{'A':{'runId':'LEGACY-one','accessId':'A','state':'HELD','resources':[key]}}}}));source.chmod(0o600)
        manifest=self.root/'manifest.json';manifest.write_text(json.dumps({'schema_version':1,'registries':[{'project':str(self.root),'path':str(source)}]}));manifest.chmod(0o600)
        before=source.read_bytes();import_manifest(manifest);second=import_manifest(manifest)
        run=Run.objects.get(project=self.project,run_id='LEGACY-one');self.assertEqual(run.session_id,'SID-legacy');self.assertEqual(run.generation,1437);self.assertEqual(run.suspension,'IMPORT_PROTECTED')
        self.assertTrue(Lease.objects.filter(run=run,state='HELD').exists());self.assertTrue(second['imports'][0]['repeated']);self.assertEqual(LegacySnapshot.objects.count(),1)
        self.assertNotIn('synthetic-never-public',str(run.mandate));self.assertNotIn('synthetic-never-public',str(LegacySnapshot.objects.get().payload));self.assertEqual(source.read_bytes(),before)
    def test_legacy_statistics_do_not_add_cumulative_snapshots(self):
        from cab_platform.migration import import_runtime_sqlite
        source=self.root/'runtime.sqlite3'
        with sqlite3.connect(source) as database:
            database.executescript('CREATE TABLE bindings(binding TEXT,uid INTEGER,body TEXT);CREATE TABLE binding_closures(binding TEXT);CREATE TABLE telemetry(binding TEXT,event_id TEXT,source TEXT,stream TEXT,sequence INTEGER,body TEXT);')
            identity={'project':str(self.root),'run':'LEGACY-SGS','session':'SID-SGS','agent':'codex','role':'coder','mode':'direct','change':'legacy-sgs'}
            database.execute('INSERT INTO bindings VALUES(?,?,?)',('B',os.getuid(),json.dumps(identity)))
            for stream,semantics,values in [('cumulative','cumulative',[9,12]),('delta','delta',[2,3])]:
                for sequence,value in enumerate(values,1):database.execute('INSERT INTO telemetry VALUES(?,?,?,?,?,?)',('B',stream+str(sequence),'fixture-native',stream,sequence,json.dumps({'semantics':semantics,'metrics':{'tools':str(value)}})))
        item={'path':str(source),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()}
        import_runtime_sqlite(item);self.assertTrue(import_runtime_sqlite(item)['repeated'])
        run=Run.objects.get(project=self.project,run_id='LEGACY-SGS');values=sorted(int(row.values['tools']) for row in Metric.objects.filter(run=run))
        self.assertEqual(values,[5,12]);self.assertEqual(run.suspension,'IMPORT_PROTECTED')
    def test_agent_profiles_are_distinct_and_private(self):
        from cab_platform.integration import write_profile
        user=SimpleNamespace(pw_dir=str(self.root),pw_uid=os.getuid(),pw_gid=os.getgid())
        first=write_profile(user,'codex',{'actor_id':'parent','token':'synthetic-parent'})
        second=write_profile(user,'opencode',{'actor_id':'coder','token':'synthetic-coder'})
        self.assertNotEqual(first,second);self.assertEqual(json.loads(first.read_text())['actor_id'],'parent');self.assertEqual(json.loads(second.read_text())['actor_id'],'coder')
        self.assertEqual(first.stat().st_mode&0o777,0o600);self.assertEqual(second.stat().st_mode&0o777,0o600)

if __name__=='__main__':unittest.main()
