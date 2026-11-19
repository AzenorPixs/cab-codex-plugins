"""Qualification hôte : transactions PostgreSQL de fixture intégralement annulées."""
import copy
import hashlib
import os
import sys
import tempfile
import subprocess
import time
import signal
import threading
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch

source=Path(__file__).resolve().parents[1]/'src'
sys.path.insert(0,os.environ.get('CAB_TEST_SOURCE',str(source) if source.is_dir() else '/usr/lib/cab/python'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
import django
django.setup()
from django.db import transaction,connection,connections
from cab_platform.core import commands as c,run_evidence as e,run_finalization as f,connectors as connectors
from cab_platform.core.models import Actor,Event,FinalizationPlan,Lease,Operation,Project,Resource,RunEvidence,McpConnector,McpRunBinding,Run,SessionProjection,McpConnectorProjection,Change,CodingSession,GitSessionIndex,GitFileReservation,ChangeSource,StatisticsDocument


class ContestedEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.tx=transaction.atomic();self.tx.__enter__()
        self.addCleanup(self.rollback)
        self.folder=tempfile.TemporaryDirectory(prefix='cab-contest-');self.addCleanup(self.folder.cleanup)
        self.root=Path(self.folder.name);(self.root/'source').write_text('stable')
        token=uuid.uuid4().hex
        self.owner=Actor.objects.create(pk='fixture-owner-'+token,uid=os.getuid(),agent='fixture',token_hash=token)
        self.admin=Actor.objects.create(pk='fixture-admin-'+token,uid=os.getuid(),agent='fixture',role='admin',token_hash=token+'admin')
        self.project=Project.objects.create(pk=token,root=str(self.root),owner_uid=os.getuid(),owner_gid=os.getgid())
        self.owner.projects.add(self.project)
        archive=self.root/'openspec/changes/archive/2026-11-19-fixture';archive.mkdir(parents=True)
        (archive/'proposal.md').write_text('# Fixture\n');(archive/'tasks.md').write_text('- [x] Fixture validée\n')
        policy={'nature':'development','checks':[{'id':'unit','argv':['/bin/true'],'criteria':['fixture']},{'id':'other','argv':['/bin/echo','other'],'criteria':['fixture']}]}
        self.run=c.begin_run(self.owner,{'project_id':self.project.pk,'run_id':'FIXTURE','session_id':'FIXTURE-'+token,'mode':'direct','change':'fixture','paths':['source'],'criteria':['fixture'],'decisions_resolved':True,'finalization':policy})
        self.op=self.operation(['/bin/true']);self.other=self.operation(['/bin/echo','other'])
        self.proof=RunEvidence.objects.get(run=self.run,payload__operation_id=self.op.pk)
        self.before=(copy.deepcopy(self.op.receipt),self.op.receipt_digest,copy.deepcopy(self.proof.payload),self.proof.digest)
        self.data={'project_id':self.project.pk,'run_id':self.run.run_id,'request_id':'contest-once','expected_policy_digest':self.run.finalization_plan.digest,'check_id':'unit','operation_id':self.op.pk,'evidence_id':self.proof.pk,'expected_evidence_digest':self.proof.digest,'expected_receipt_digest':self.op.receipt_digest,'argv':['/bin/echo','verified'],'reason':'Le contrôle précédent ne découvrait aucun test.','authorization':'Mandat développeur explicite de la fixture de qualification.'}
    def tearDown(self):self.rollback()
    def rollback(self):
        if getattr(self,'rolled_back',False):return
        transaction.set_rollback(True);self.tx.__exit__(None,None,None);self.rolled_back=True
    def operation(self,argv):
        op,_=c.start_operation(self.owner,{'project_id':self.project.pk,'run_id':self.run.run_id,'session_id':self.run.session_id,'generation':self.run.generation,'request_id':'OP-'+uuid.uuid4().hex,'kind':'local','argv':argv})
        op=c.claim_operation(op.pk);c.dispatched(op.pk,op.dispatch_nonce)
        return c.complete(op.pk,op.dispatch_nonce,{'request_id':op.request_id,'input_digest':op.input_digest,'source_revision':op.source_revision,'state':'COMPLETED','exit_code':0})
    def contest(self,**changes):return e.contest_check(self.admin,{**self.data,**changes})
    def test_originals_preserved_other_check_selected_new_execution_required(self):
        receipt=self.contest();self.op.refresh_from_db();self.proof.refresh_from_db()
        self.assertEqual(self.before,(self.op.receipt,self.op.receipt_digest,self.proof.payload,self.proof.digest))
        self.assertEqual(receipt['check_revision'],2);self.assertTrue(receipt['new_execution_required'])
        plan=FinalizationPlan.objects.get(run=self.run);view=f.dossier(self.run,plan)
        self.assertTrue(any(x.startswith('evidence:unit:') for x in view['missing']))
        self.assertEqual([x['rule_id'] for x in view['proofs']],['other'])
        self.assertNotIn(self.proof.pk,[x['id'] for x in view['proofs']])
        self.operation(self.data['argv']);plan.refresh_from_db()
        self.assertFalse(f.dossier(self.run,plan)['missing'])
    def test_idempotent_before_stale_policy_and_conflicting_request(self):
        receipt=self.contest();self.assertEqual(receipt,self.contest())
        with self.assertRaisesRegex(c.Refused,'request-conflict'):self.contest(reason='Une autre justification différente.')
        with self.assertRaisesRegex(c.Refused,'contest-stale'):self.contest(request_id='concurrent-other')
        self.assertEqual(Event.objects.filter(run=self.run,kind='finalization-check-contested').count(),1)
    def test_admin_and_exact_proof_identity_required(self):
        with self.assertRaisesRegex(c.Refused,'administrator-required'):e.contest_check(self.owner,self.data)
        for change in [{'expected_evidence_digest':'0'*64},{'expected_receipt_digest':'0'*64},{'operation_id':self.other.pk},{'evidence_id':RunEvidence.objects.get(run=self.run,payload__operation_id=self.other.pk).pk}]:
            with self.subTest(change=tuple(change)):
                with self.assertRaises(c.Refused):self.contest(**change)
        self.assertFalse(Event.objects.filter(run=self.run,kind='finalization-check-contested').exists())
    def test_unknown_and_held_lease_remain_protected(self):
        pending=Operation.objects.create(run=self.run,request_id='UNKNOWN',input_digest='fixture',source_revision='fixture',state='UNKNOWN')
        with self.assertRaisesRegex(c.Refused,'effects-protected'):self.contest()
        pending.delete();resource=Resource.objects.create(key='fixture-'+uuid.uuid4().hex)
        lease=Lease.objects.create(run=self.run,resource=resource,fencing=1)
        with self.assertRaisesRegex(c.Refused,'effects-protected'):self.contest()
        self.assertEqual(lease.state,'HELD')
    def test_freeze_import_review_and_closed_remain_protected(self):
        original=copy.deepcopy(self.run.mandate)
        for key in ['native_frozen_at','legacy_snapshot_id']:
            self.run.mandate={**original,key:'fixture'};self.run.save()
            with self.assertRaises(c.Refused):self.contest()
        self.run.mandate=original;self.run.review={'decision':{'decision':'accept'}};self.run.save()
        with self.assertRaisesRegex(c.Refused,'protected'):self.contest()
        self.run.review={};self.run.state='CLOSED';self.run.save()
        with self.assertRaises(c.Refused):self.contest()
    def test_success_cannot_be_revised_without_contestation(self):
        revision={key:self.data[key] for key in ['project_id','run_id','request_id','expected_policy_digest','check_id','argv','reason']}
        with self.assertRaisesRegex(c.Refused,'already-passed'):e.revise_check(self.owner,revision)
        self.contest();plan=FinalizationPlan.objects.get(run=self.run)
        revision.update(request_id='return-old-argv',expected_policy_digest=plan.digest,argv=['/bin/true'])
        e.revise_check(self.owner,revision);plan.refresh_from_db()
        self.assertEqual(plan.check_revisions['unit'],3)
        self.assertTrue(any(x.startswith('evidence:unit:') for x in f.dossier(self.run,plan)['missing']))
    def test_stale_source_and_policy_are_rejected(self):
        with self.assertRaisesRegex(c.Refused,'contest-stale'):self.contest(expected_policy_digest='0'*64)
        (self.root/'source').write_text('changed')
        with self.assertRaisesRegex(c.Refused,'source-stale'):self.contest()
    def test_no_operation_or_criteria_or_producer_created_by_contestation(self):
        plan=FinalizationPlan.objects.get(run=self.run);before=copy.deepcopy(plan.policy);operations=self.run.operation_set.count()
        self.contest();plan.refresh_from_db()
        expected=copy.deepcopy(before);expected['checks'][0]['argv']=self.data['argv']
        self.assertEqual(plan.policy,expected);self.assertEqual(self.run.operation_set.count(),operations)


class PrequalificationAndBundleTests(ContestedEvidenceTests):
    def test_nature_correction_preserves_contract_and_is_idempotent_before_proof(self):
        from cab_platform.host_completion import reframe_prequalification
        RunEvidence.objects.filter(run=self.run).delete();Lease.objects.filter(run=self.run).delete();Operation.objects.filter(run=self.run).delete()
        plan=FinalizationPlan.objects.get(run=self.run)
        plan.policy['requirements']=[{'id':'publish','kind':'publication','producer':'fixture-release','criteria':['fixture']}];plan.digest=c.digest(plan.policy);plan.save()
        before=copy.deepcopy(plan.policy)
        data={'project_id':self.project.pk,'run_id':self.run.run_id,'request_id':'correct-delivery','criteria':['fixture'],'nature':'delivery','expected_policy_digest':plan.digest,'expected_framing_digest':self.run.mandate['framing_digest'],'authorization':'Mandat développeur explicite de livraison dans cette fixture.'}
        receipt=reframe_prequalification(self.admin,data);self.assertEqual(receipt,reframe_prequalification(self.admin,data))
        plan.refresh_from_db();expected={**before,'nature':'delivery'};self.assertEqual(plan.policy,expected)
        self.assertFalse(self.run.operation_set.exists());self.assertFalse(self.run.finalization_evidence.exists())
        with self.assertRaises(c.Refused):reframe_prequalification(self.admin,{**data,'request_id':'other','expected_policy_digest':plan.digest,'expected_framing_digest':receipt['framing_digest'],'nature':'development'})
    def test_nature_correction_refuses_existing_proof_and_missing_publication(self):
        from cab_platform.host_completion import reframe_prequalification
        plan=FinalizationPlan.objects.get(run=self.run)
        data={'project_id':self.project.pk,'run_id':self.run.run_id,'request_id':'correct-delivery','criteria':['fixture'],'nature':'delivery','expected_policy_digest':plan.digest,'expected_framing_digest':self.run.mandate['framing_digest'],'authorization':'Mandat développeur explicite de livraison dans cette fixture.'}
        with self.assertRaisesRegex(c.Refused,'after-proof'):reframe_prequalification(self.admin,data)
        RunEvidence.objects.filter(run=self.run).delete();Lease.objects.filter(run=self.run).delete();Operation.objects.filter(run=self.run).delete()
        with self.assertRaisesRegex(c.Refused,'nature-refused'):reframe_prequalification(self.admin,data)
    def test_archive_reconciliation_keeps_only_own_reserved_paths(self):
        from cab_platform.session_git import reconciled_archive_owned
        index=GitSessionIndex.objects.create(change=self.run.change_record,session=self.run.coding_session,initial_run=self.run,index_path='fixture')
        archive='openspec/changes/archive/2026-11-19-fixture'
        self.run.mandate={**self.run.mandate,'archive_reconciliations':[{'archive_path':archive,'source_revision':'fixture'}]};self.run.save()
        previous='openspec/changes/fixture/proposal.md'
        GitFileReservation.objects.create(project=self.project,git_index=index,path=previous,path_digest=hashlib.sha256(previous.encode()).hexdigest())
        target=archive+'/proposal.md'
        self.assertFalse(reconciled_archive_owned(self.run,index,target))
        c.event(self.run,'mandate-archive-reconciled',{'archive_path':archive,'source_revision':'fixture'})
        self.assertTrue(reconciled_archive_owned(self.run,index,target))
        self.assertFalse(reconciled_archive_owned(self.run,index,archive+'/tasks.md'))
        self.assertFalse(reconciled_archive_owned(self.run,index,'openspec/changes/archive/2026-11-19-other/proposal.md'))
        source=self.root/previous;source.parent.mkdir(parents=True);source.write_text('source encore présente')
        self.assertFalse(reconciled_archive_owned(self.run,index,target))
    def test_verified_bundle_report_is_in_real_git_commit_and_tampering_refused(self):
        fixture_tests=Path(__file__).resolve().parent
        if not (fixture_tests/'test_git_commit_metadata.py').is_file():fixture_tests=Path.cwd()/'tests'
        sys.path.insert(0,str(fixture_tests))
        import test_git_commit_metadata as metadata_fixture
        from cab_platform import session_delivery as d
        fixture=metadata_fixture.MetadataTests('test_dates_et_signatures_protegees');fixture.setUp();self.addCleanup(fixture.doCleanups)
        self.project.root=str(fixture.root);self.project.save(update_fields=['root'])
        self.run.refresh_from_db()
        old=Change.objects.create(pk=uuid.uuid4().hex,project=self.project,identifier='archived-bundle')
        oldrun=Run.objects.create(project=self.project,actor=self.owner,run_id='CLOSED-BUNDLE',session_id=self.run.session_id,coding_session=self.run.coding_session,change_record=old,mode='direct',change=old.identifier,state='CLOSED')
        FinalizationPlan.objects.create(run=oldrun,receipt={'state':'CLOSED','fixture':True})
        relative='openspec/changes/archive/2026-11-19-'+old.identifier
        archive=fixture.root/relative;archive.mkdir(parents=True)
        (archive/'proposal.md').write_text('# Fixture');(archive/'tasks.md').write_text('- [x] Validé')
        source=ChangeSource.objects.create(change=old,path=relative,archived=True,present=True)
        content='# Rapport CAB de fixture\n';report=archive/'STATISTICS.md';report.write_text(content);sha=hashlib.sha256(content.encode()).hexdigest()
        document=StatisticsDocument.objects.create(source=source,content=content,sha256=sha,status='ready',generated_digest=sha,generated_block_sha=sha)
        index=GitSessionIndex.objects.create(change=self.run.change_record,session=self.run.coding_session,initial_run=self.run,index_path=str(fixture.root/'.git/index'))
        for name in ['proposal.md','tasks.md']:
            path=relative+'/'+name;GitFileReservation.objects.create(project=self.project,git_index=index,path=path,path_digest=hashlib.sha256(path.encode()).hexdigest());fixture.git('add',path)
        from cab_platform.git_commit_remove import context
        options,env=context(self.project)
        own=d._temp_index(str(fixture.root/'.git'),self.project);self.addCleanup(lambda:Path(own).unlink(missing_ok=True))
        d._copy_session_index(index.index_path,own,self.project.owner_uid);own_env={**env,'GIT_INDEX_FILE':own}
        self.assertEqual(d.bundled_statistics_changes(self.project,index),{index.change_id,old.pk})
        included=d.include_change_statistics(self.project,index,options,env,own_env)
        self.assertIn(relative+'/STATISTICS.md',[item['path'] for item in included])
        tree=d._git(self.project,options,own_env,'write-tree');self.assertEqual(tree.returncode,0)
        committed=d._git(self.project,options,{**own_env,**fixture.env},'commit-tree',tree.stdout.decode().strip(),'-m','fixture-bundle')
        self.assertEqual(committed.returncode,0)
        blob=d._git(self.project,options,env,'show',committed.stdout.decode().strip()+':'+relative+'/STATISTICS.md')
        self.assertEqual(blob.stdout,content.encode())
        report.write_text('modification non attestée')
        with self.assertRaisesRegex(c.Refused,'statistics-unavailable'):d.include_change_statistics(self.project,index,options,env,own_env)
        report.write_text(content);document.manual_override=True;document.save()
        with self.assertRaisesRegex(c.Refused,'statistics-unavailable'):d.include_change_statistics(self.project,index,options,env,own_env)
        document.manual_override=False;document.save();oldrun.session_id='OTHER-SID';oldrun.coding_session=None;oldrun.save()
        self.assertEqual(d.bundled_statistics_changes(self.project,index),{index.change_id})


class NativeWorkerRecoveryTests(ContestedEvidenceTests):
    # Réutiliser seulement les fixtures, pas les huit tests du parent.
    def process_pair(self):
        self.owner.agent='codex';self.owner.save(update_fields=['agent'])
        self.run.mandate={**self.run.mandate,'native_source':str(self.root/'source')};self.run.save()
        parent=subprocess.Popen(['/usr/bin/cab','mcp','--agent','codex'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
        worker=None
        def cleanup():
            # Seul le fils de fixture créé ici est arrêté ; aucun appel métier.
            if worker and connectors.identity(worker['pid'])==worker:
                fd=os.pidfd_open(worker['pid'])
                try:signal.pidfd_send_signal(fd,signal.SIGTERM)
                finally:os.close(fd)
            parent.stdin.close()
            try:parent.wait(timeout=10)
            except subprocess.TimeoutExpired:
                parent.terminate();parent.wait(timeout=5)
            parent.stdout.close()
        self.addCleanup(cleanup)
        deadline=time.monotonic()+5
        while time.monotonic()<deadline:
            children=Path('/proc/'+str(parent.pid)+'/task/'+str(parent.pid)+'/children').read_text().split()
            if children:
                worker=connectors.identity(int(children[0]))
                if worker and connectors.cab_process(worker['pid'],'mcp-worker')=='codex':return parent,worker
            time.sleep(.01)
        raise AssertionError('worker-réel-non-observé')
    def test_real_process_pair_recovered_without_fake_version_and_adopted_once(self):
        parent,worker=self.process_pair();peer={'uid':os.getuid(),'pid':worker['pid']}
        self.assertTrue(connectors.bind_worker_run(self.owner,self.data,peer))
        observed=connectors.worker_connector(self.owner,peer)
        self.assertEqual(observed.state,'OBSERVED');self.assertTrue(observed.uncertain)
        self.assertEqual((observed.loaded_version,observed.catalog_version,observed.relay_version),('','',''))
        self.assertFalse(observed.public_projection.connected)
        self.assertEqual(connectors.current_worker_run(self.owner,peer,read_only=True).pk,self.run.pk)
        self.assertTrue(connectors.bind_worker_run(self.owner,self.data,peer))
        self.assertEqual(McpConnector.objects.filter(actor=self.owner).count(),1)
        body={'connector_id':'b'*32,'worker_pid':worker['pid'],'loaded_version':'3.2.18','catalog_version':'','pending':0,'state':'CATALOG_PENDING','uncertain':False}
        result=connectors.heartbeat(self.owner,body,{'uid':os.getuid(),'pid':parent.pid})
        observed.refresh_from_db();self.assertEqual(observed.state,'SUPERSEDED')
        live=connectors.worker_connector(self.owner,peer);self.assertEqual(live.pk,result['connector_id'])
        self.assertEqual(McpRunBinding.objects.get(connector=live).run_id,self.run.pk)
        self.assertFalse(McpRunBinding.objects.filter(connector=observed).exists())
        connectors.heartbeat(self.owner,body,{'uid':os.getuid(),'pid':parent.pid})
        self.assertEqual(McpConnector.objects.filter(actor=self.owner).exclude(state='SUPERSEDED').count(),1)
        with self.assertRaisesRegex(c.Refused,'already-registered'):
            connectors.heartbeat(self.owner,{**body,'connector_id':'c'*32},{'uid':os.getuid(),'pid':parent.pid})
    def test_real_process_wrong_peer_and_shared_active_run_are_refused(self):
        parent,worker=self.process_pair();peer={'uid':os.getuid(),'pid':worker['pid']}
        self.assertIsNone(connectors.observe_native_worker(self.owner,self.run,{**peer,'uid':os.getuid()+1}))
        self.assertIsNone(connectors.observe_native_worker(self.owner,self.run,{'uid':os.getuid(),'pid':parent.pid}))
        self.assertTrue(connectors.bind_worker_run(self.owner,self.data,peer))
        second=c.begin_run(self.owner,{'project_id':self.project.pk,'run_id':'OTHER','session_id':'OTHER-SID','mode':'direct','change':'other','paths':['source'],'criteria':['fixture'],'decisions_resolved':True})
        second.mandate={**second.mandate,'native_source':str(self.root/'source')};second.save()
        with self.assertRaisesRegex(c.Refused,'session-connector-shared'):
            connectors.bind_worker_run(self.owner,{'project_id':self.project.pk,'run_id':second.run_id},peer)
        self.assertEqual(connectors.current_worker_run(self.owner,peer,read_only=True).pk,self.run.pk)
    def test_pid_identity_change_refused_without_registry(self):
        parent,worker=self.process_pair();actual=connectors.identity;reads={}
        def changing(pid):
            reads[pid]=reads.get(pid,0)+1
            if pid==worker['pid'] and reads[pid]>2:return {**worker,'start':'recycled'}
            return actual(pid)
        with patch.object(connectors,'identity',side_effect=changing):
            with self.assertRaisesRegex(c.Refused,'process-changed'):
                connectors.observe_native_worker(self.owner,self.run,{'uid':os.getuid(),'pid':worker['pid']})
        self.assertFalse(McpConnector.objects.filter(actor=self.owner).exists())


class ConcurrentNativeRecoveryTests(unittest.TestCase):
    def test_observed_bind_serializes_with_real_heartbeat_adoption(self):
        # Fixture persistée uniquement pour rendre les deux transactions visibles.
        # Aucun RUN utilisateur, aucune preuve ni opération métier n'est créé.
        folder=tempfile.TemporaryDirectory(prefix='cab-concurrent-recovery-');root=Path(folder.name)
        (root/'source').write_text('fixture')
        token=uuid.uuid4().hex
        actor=Actor.objects.create(pk='fixture-concurrent-'+token,uid=os.getuid(),agent='codex',token_hash=token)
        project=Project.objects.create(pk=token,root=str(root),owner_uid=os.getuid(),owner_gid=os.getgid(),creation_state='FIXTURE')
        actor.projects.add(project)
        run=Run.objects.create(project=project,actor=actor,run_id='FIXTURE-CONCURRENT',session_id='FIXTURE-'+token,mode='direct',change='fixture',mandate={'native_source':str(root/'source'),'paths':['source'],'criteria':['fixture']})
        parent=subprocess.Popen(['/usr/bin/cab','mcp','--agent','codex'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
        worker=None;threads=[];release=threading.Event();read=threading.Event();heartbeat_started=threading.Event();errors=[];pids={}
        try:
            deadline=time.monotonic()+5
            while time.monotonic()<deadline:
                children=Path('/proc/'+str(parent.pid)+'/task/'+str(parent.pid)+'/children').read_text().split()
                if children:
                    worker=connectors.identity(int(children[0]))
                    if worker and connectors.cab_process(worker['pid'],'mcp-worker')=='codex':break
                time.sleep(.01)
            self.assertIsNotNone(worker)
            peer={'uid':os.getuid(),'pid':worker['pid']};data={'project_id':project.pk,'run_id':run.run_id}
            connectors.bind_worker_run(actor,data,peer)
            original=connectors.worker_connector
            def pause_after_observation(owner,actual_peer):
                row=original(owner,actual_peer)
                if threading.current_thread().name=='fixture-binding':
                    read.set()
                    if not release.wait(5):raise AssertionError('interleaving-timeout')
                return row
            def execute(name,action):
                try:
                    with transaction.atomic():
                        with connection.cursor() as cursor:
                            cursor.execute("SET LOCAL lock_timeout='4000ms'")
                            cursor.execute('SELECT pg_backend_pid()');pids[name]=cursor.fetchone()[0]
                        if name=='heartbeat':heartbeat_started.set()
                        action()
                except Exception as error:errors.append((name,type(error).__name__,str(error)))
                finally:connections.close_all()
            with patch.object(connectors,'worker_connector',side_effect=pause_after_observation):
                binder=threading.Thread(name='fixture-binding',target=execute,args=('binding',lambda:connectors.bind_worker_run(actor,data,peer)));threads.append(binder);binder.start()
                self.assertTrue(read.wait(5))
                body={'connector_id':token,'worker_pid':worker['pid'],'loaded_version':'3.2.18','catalog_version':'','pending':0,'state':'CATALOG_PENDING','uncertain':False}
                heart=threading.Thread(name='fixture-heartbeat',target=execute,args=('heartbeat',lambda:connectors.heartbeat(actor,body,{'uid':os.getuid(),'pid':parent.pid})));threads.append(heart);heart.start()
                self.assertTrue(heartbeat_started.wait(5));blocked=False;deadline=time.monotonic()+3
                while time.monotonic()<deadline:
                    with connection.cursor() as cursor:
                        cursor.execute('SELECT pg_blocking_pids(%s)',[pids['heartbeat']]);blocked=pids['binding'] in cursor.fetchone()[0]
                    if blocked:break
                    time.sleep(.01)
                self.assertTrue(blocked,'heartbeat doit attendre le verrou du bind')
                release.set()
                for thread in threads:thread.join(6)
                self.assertFalse(any(thread.is_alive() for thread in threads));self.assertEqual(errors,[])
            selected=connectors.worker_connector(actor,peer)
            self.assertEqual(selected.pk,token)
            self.assertEqual(McpRunBinding.objects.get(connector=selected).run_id,run.pk)
            self.assertFalse(McpRunBinding.objects.filter(connector__state='SUPERSEDED',run=run).exists())
        finally:
            release.set()
            for thread in threads:thread.join(6)
            if worker and connectors.identity(worker['pid'])==worker:
                fd=os.pidfd_open(worker['pid'])
                try:signal.pidfd_send_signal(fd,signal.SIGTERM)
                finally:os.close(fd)
            parent.stdin.close()
            try:parent.wait(timeout=10)
            except subprocess.TimeoutExpired:parent.terminate();parent.wait(timeout=5)
            parent.stdout.close()
            McpRunBinding.objects.filter(run=run).delete();McpConnectorProjection.objects.filter(connector__actor=actor).delete();McpConnector.objects.filter(actor=actor).delete()
            Event.objects.filter(project=project).delete();SessionProjection.objects.filter(binding=run).delete()
            run.delete();Change.objects.filter(project=project).delete();CodingSession.objects.filter(project=project).delete();project.delete();actor.delete();folder.cleanup()


if __name__=='__main__':
    suite=unittest.defaultTestLoader.loadTestsFromTestCase(ContestedEvidenceTests)
    suite.addTests(NativeWorkerRecoveryTests(name) for name in NativeWorkerRecoveryTests.__dict__ if name.startswith('test_'))
    suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(ConcurrentNativeRecoveryTests))
    suite.addTests(PrequalificationAndBundleTests(name) for name in PrequalificationAndBundleTests.__dict__ if name.startswith('test_'))
    if suite.countTestCases()==0:raise RuntimeError('aucun-test-decouvert')
    outcome=unittest.TextTestRunner(verbosity=2).run(suite)
    raise SystemExit(0 if outcome.wasSuccessful() else 1)
