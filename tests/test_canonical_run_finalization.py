"""Fixtures PG annulées et dépôt temporaire ; aucun RUN ou reçu réel modifié."""
import os
import sys
import uuid
import unittest
from datetime import timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
sys.path.insert(0,os.environ.get('CAB_TEST_SOURCE',str(Path(__file__).resolve().parents[1]/'src')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
import django
django.setup()
from django.db import transaction,connection
from django.utils import timezone
from cab_platform import canonical_statistics as canonical,statistics_documents as docs,closure_git as terminal
from cab_platform.core import commands as c,statistics_service as stats,run_finalization as final
from cab_platform.core.models import Actor,Project,Run,Operation,RunEvidence,FinalizationPlan,ChangeSource,StatisticsJob,GitSessionIndex,GitFileReservation,MeasurementPeriod,TerminalGitCommit,EvidenceProducer
sys.path.insert(0,str(Path.cwd()/'tests'))
import test_git_commit_metadata as metadata_fixture

class CanonicalTests(unittest.TestCase):
    def setUp(self):
        self.tx=transaction.atomic();self.tx.__enter__();self.addCleanup(self.rollback)
        self.git=metadata_fixture.MetadataTests('test_dates_et_signatures_protegees');self.git.setUp();self.addCleanup(self.git.doCleanups)
        self.root=self.git.root;key=uuid.uuid4().hex
        spec=self.root/'openspec/specs/fixture/spec.md';spec.parent.mkdir(parents=True);spec.write_text('# Spécification canonique réelle de fixture\n')
        self.project=Project.objects.create(pk=key,root=str(self.root),owner_uid=os.getuid(),owner_gid=os.getgid())
        self.actor=Actor.objects.create(pk=key,uid=os.getuid(),agent='fixture',token_hash=key);self.actor.projects.add(self.project)
        collector=Actor.objects.create(pk=key+'-collector',uid=os.getuid(),agent='fixture',role='collector',token_hash=key+'-collector')
        EvidenceProducer.objects.create(pk='fixture-'+key,project=self.project,actor=collector,kinds=['publication'])
        self.run=c.begin_run(self.actor,{'project_id':key,'run_id':'CANONICAL','session_id':'SID-'+key,'mode':'direct','change':'canonical-fixture','paths':['openspec/specs/fixture/spec.md'],'criteria':['fixture'],'decisions_resolved':True,'finalization':{'nature':'delivery','checks':[{'id':'unit','argv':['/bin/true'],'criteria':['fixture']}],'requirements':[{'id':'publish','kind':'publication','producer':'fixture-'+key,'criteria':['fixture']}]}})
        self.run.state='FINALIZING';self.run.save()
        receipt={'state':'COMPLETED','exit_code':0,'output':'Ran 3 tests in 0.01s\nOK\n'}
        op=Operation.objects.create(run=self.run,request_id='fixture-check',input_digest='fixture',source_revision=self.run.source_revision,state='COMPLETED',request={'argv':['/bin/true']},receipt=receipt,receipt_digest=c.digest(receipt))
        payload={'scope':{'project_id':key,'run_id':self.run.run_id,'session_id':self.run.session_id,'generation':self.run.generation,'change':self.run.change},'rule_id':'unit','result':'passed','source_revision':self.run.source_revision,'source_after':self.run.source_revision,'operation_id':op.pk,'receipt_digest':op.receipt_digest,'check_revision':1}
        row=RunEvidence.objects.create(run=self.run,source='cab-operation',evidence_id='fixture',payload=payload,digest=c.digest(payload))
        publication={**payload,'rule_id':'publish','reference':'fixture-local-publication','artifact_sha256':'a'*64}
        pub=RunEvidence.objects.create(run=self.run,source='producer:fixture-'+key,evidence_id='fixture-publish',payload=publication,digest=c.digest(publication))
        self.proofs=[{'id':row.pk,'digest':row.digest,'rule_id':'unit'},{'id':pub.pk,'digest':pub.digest,'rule_id':'publish'}]
    def rollback(self):
        transaction.set_rollback(True);self.tx.__exit__(None,None,None)
    def produce(self,key=None):
        return stats.sync(self.project,key or 'fixture-'+uuid.uuid4().hex,canonical_run=self.run,canonical_proofs=self.proofs)
    def test_real_report_index_global_and_projection_without_fake_change(self):
        result=self.produce();self.run.refresh_from_db();record=self.run.configuration[canonical.KEY]
        report=self.root/record['path'];self.assertTrue(report.is_file());self.assertEqual(result['state'],'COMPLETED')
        self.assertTrue(stats.document_index_matches(self.project,record['path'],docs.sha(report.read_bytes())))
        self.assertTrue(stats.global_index_matches(self.project,docs.sha((self.root/'STATISTICS.md').read_bytes())))
        self.assertEqual(record['state'],'READY');self.assertIn(self.run.session_id,report.read_text())
        self.assertFalse(ChangeSource.objects.filter(change=self.run.change_record).exists());self.assertFalse((self.root/'openspec/changes'/self.run.change).exists())
        self.assertIn(record['path'],(self.root/'STATISTICS.md').read_text())
        self.assertEqual(len([line for line in report.read_text().splitlines() if line.startswith('## ')]),6)
    def test_completed_publication_request_is_not_replayed(self):
        first=self.produce('once');before=(self.root/(canonical.directory(self.run)+'/STATISTICS.md')).stat().st_mtime_ns
        with patch.object(stats,'write',side_effect=AssertionError('replay')):second=self.produce('once')
        self.assertEqual(first,second);self.assertEqual(before,(self.root/(canonical.directory(self.run)+'/STATISTICS.md')).stat().st_mtime_ns)
    def test_disappeared_change_source_is_never_canonical(self):
        ChangeSource.objects.create(change=self.run.change_record,path='openspec/changes/deleted',present=False)
        self.assertFalse(canonical.eligible(self.run))
        with self.assertRaisesRegex(c.Refused,'canonical-ineligible'):self.produce()
        self.assertFalse((self.root/'statistics').exists())
    def test_real_spec_is_required(self):
        (self.root/'openspec/specs/fixture/spec.md').unlink();self.assertFalse(canonical.eligible(self.run))
    def test_foreign_run_path_and_reservation_are_rejected(self):
        self.produce();self.run.refresh_from_db();path=self.run.configuration[canonical.KEY]['path']
        with self.assertRaisesRegex(c.Refused,'target-invalid'):canonical.check_target(self.project,'statistics/runs/'+'0'*64+'/STATISTICS.md')
        other=c.begin_run(self.actor,{**self.run.mandate,'run_id':'OTHER','session_id':'OTHER-SID','change':'other'})
        index=GitSessionIndex.objects.create(change=other.change_record,session_id=other.coding_session_id,initial_run=other)
        GitFileReservation.objects.create(project=self.project,git_index=index,path=path,path_digest=c.digest(path))
        with self.assertRaisesRegex(c.Refused,'target-reserved'):canonical.check_target(self.project,path)
    def test_manual_generated_block_is_preserved(self):
        self.produce();path=self.root/canonical.directory(self.run)/'STATISTICS.md'
        modified=path.read_text().replace('état local :','texte manuel :');path.write_text(modified)
        with self.assertRaisesRegex(c.Refused,'local-conflict'):self.produce()
        self.assertEqual(path.read_text(),modified)
    def test_removed_managed_block_or_master_is_not_silently_recreated(self):
        self.produce();path=self.root/canonical.directory(self.run)/'STATISTICS.md'
        original=path.read_text();path.write_text(original.replace(docs.managed(original),''))
        with self.assertRaisesRegex(c.Refused,'local-conflict'):self.produce()
        path.unlink()
        with self.assertRaisesRegex(c.Refused,'local-conflict'):self.produce()
        self.assertFalse(path.exists())
    def test_only_current_run_selected_receipts_are_counted(self):
        first,partial=canonical.contribution(self.run,self.proofs+self.proofs)
        self.assertEqual(first['metrics']['tests']['value'],'3');self.assertEqual(first['metrics']['tokens_total']['state'],'unavailable')
        other=c.begin_run(self.actor,{**self.run.mandate,'run_id':'OTHER','session_id':'OTHER-SID'})
        now=timezone.now();MeasurementPeriod.objects.create(run=other,change=other.change_record,session=other.coding_session,started=now,ended=now+timedelta(seconds=1),values={'tokens_total':999},coverage={'state':'bounded'})
        second,_=canonical.contribution(self.run,self.proofs);self.assertEqual(first,second)
        with self.assertRaisesRegex(c.Refused,'proof-divergent'):canonical.contribution(other,self.proofs)
    def test_skips_and_expected_failures_do_not_become_measured_successes(self):
        operation=Operation.objects.get(run=self.run)
        row=RunEvidence.objects.get(run=self.run,source='cab-operation')
        for ending in ['OK (skipped=1)','OK (expected failures=1)','aucun bilan unittest observé']:
            operation.receipt={**operation.receipt,'output':'Ran 3 tests in 0.01s\n'+ending+'\n'}
            operation.receipt_digest=c.digest(operation.receipt);operation.save()
            row.payload={**row.payload,'receipt_digest':operation.receipt_digest};row.digest=c.digest(row.payload);row.save()
            selected=[{**item,'digest':row.digest} if item['id']==row.pk else item for item in self.proofs]
            measured,_=canonical.contribution(self.run,selected)
            self.assertEqual(measured['metrics']['tests']['value'],'3')
            self.assertEqual(measured['metrics']['tests_success']['state'],'unavailable')
            self.assertEqual(measured['metrics']['tests_failure']['state'],'unavailable')
    def test_global_contains_each_canonical_master_once(self):
        self.produce();self.run.refresh_from_db();path=self.run.configuration[canonical.KEY]['path']
        self.produce();content=(self.root/'STATISTICS.md').read_text();self.assertEqual(content.count(path),1)
        self.assertEqual(len(canonical.entries(self.project)),1)
    def test_real_change_master_supersedes_canonical_in_global_without_deletion(self):
        self.produce();path=canonical.directory(self.run)+'/STATISTICS.md'
        real=self.root/'openspec/changes'/self.run.change;real.mkdir(parents=True)
        (real/'tasks.md').write_text('- [x] Tâche de fixture réelle\n');(real/'STATISTICS.md').write_text('# Maître du change réel\n')
        stats.sync(self.project,'real-change-global')
        self.assertEqual(canonical.entries(self.project),[])
        self.assertNotIn(path,(self.root/'STATISTICS.md').read_text());self.assertTrue((self.root/path).exists())
    def test_competing_write_preserves_cas_and_unknown_without_replay(self):
        target=self.root/canonical.directory(self.run)/'STATISTICS.md';original=stats.subprocess.Popen;injected=False
        def launch(args,*a,**kw):
            nonlocal injected
            if not injected and 'cab_platform.statistics_io' in args:
                target.write_text('écriture concurrente conservée\n');injected=True
            return original(args,*a,**kw)
        with patch.object(stats.subprocess,'Popen',side_effect=launch):
            with self.assertRaisesRegex(c.Refused,'local-conflict'):self.produce('cas')
        job=StatisticsJob.objects.get(project=self.project,request_id='cas');self.assertEqual(job.state,'UNKNOWN')
        with patch.object(stats,'write',side_effect=AssertionError('replay')):result=self.produce('cas')
        self.assertEqual(result['state'],'UNKNOWN');self.assertEqual(target.read_text(),'écriture concurrente conservée\n')
    def test_symlink_namespace_is_refused_without_external_write(self):
        external=self.root/'external';external.mkdir();(self.root/'statistics').symlink_to(external,target_is_directory=True)
        with self.assertRaises((c.Refused,ValueError)):self.produce()
        self.assertEqual(list(external.iterdir()),[])
    def test_finalizing_exposes_persisted_report_blocker(self):
        plan=FinalizationPlan.objects.get(run=self.run);plan.phase='FINALIZING';plan.missing=['closure-report-required'];plan.save()
        view=final.view(self.run,plan);self.assertEqual(view['phase'],'FINALIZING');self.assertIn('closure-report-required',view['missing'])
        self.assertTrue(any(x['reason']=='closure-report-required' for x in view['next_actions']))
    def test_canonical_terminal_path_is_derived_not_caller_supplied(self):
        self.produce();self.run.refresh_from_db();directory=canonical.directory(self.run)
        self.assertEqual(terminal.document_paths(directory,'TERMINÉ',self.run),[directory+'/STATISTICS.md','STATISTICS.md'])
        for run,path,branch in [(None,directory,'TERMINÉ'),(self.run,'statistics/runs/'+'0'*64,'TERMINÉ'),(self.run,directory,'BLOQUÉ')]:
            with self.assertRaises(c.Refused):terminal.document_paths(path,branch,run)
    def test_terminal_unknown_is_not_reissued(self):
        self.produce();self.run.refresh_from_db()
        row=TerminalGitCommit.objects.create(run=self.run,project=self.project,branch='TERMINÉ',state='UNKNOWN',executor={})
        proxy=SimpleNamespace(in_atomic_block=False,cursor=connection.cursor)
        with patch.object(terminal,'connection',proxy),patch.object(terminal,'_git',side_effect=AssertionError('Git replay')):
            with self.assertRaisesRegex(c.Refused,'closure-git-unknown'):terminal.complete(self.run,'TERMINÉ',canonical.directory(self.run))
        row.refresh_from_db();self.assertEqual(row.state,'UNKNOWN')
    def test_process_uses_existing_terminal_engine_and_closes_only_once(self):
        def complete(run,branch,path):
            self.assertEqual(path,canonical.directory(run));self.assertEqual(branch,'TERMINÉ')
            frozen=terminal.frozen_documents(run,path,branch)
            return {'verified':True,'commit':'f'*40,'documents':{p:{k:v for k,v in data.items() if k!='raw'} for p,data in frozen.items()}}
        with patch.object(terminal,'complete',side_effect=complete) as commit:
            receipt=final.process(self.run.pk);self.run.refresh_from_db();self.assertEqual(self.run.state,'CLOSED')
            self.assertTrue(receipt['terminal_git']['verified']);self.assertEqual(receipt['report'],canonical.directory(self.run)+'/STATISTICS.md')
            self.assertEqual(final.process(self.run.pk),None);self.assertEqual(commit.call_count,1)
        self.assertEqual(Operation.objects.filter(run=self.run).count(),1)

if __name__=='__main__':unittest.main(verbosity=2)
