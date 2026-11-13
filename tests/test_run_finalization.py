"""Preuves de fixture explicites sur PostgreSQL isolé, aucun reçu production fabriqué."""
import os
import unittest
from unittest.mock import patch
import test_historical_closure as fixture
from cab_platform.core import commands as c,run_evidence as e,run_finalization as f,statistics_service as s
from cab_platform.core.models import Actor,EvidenceProducer,FinalizationPlan,MeasurementPeriod,Operation,RunEvidence,SystemUpdate

class FinalizationTests(unittest.TestCase):
    setUp=fixture.HistoricalTests.setUp
    tearDown=fixture.HistoricalTests.tearDown
    def policy(self,**extra):return {'checks':[{'id':'unit','argv':['/bin/true'],'criteria':['historical']}],**extra}
    def configure(self,policy=None):return e.configure(self.actor,{**self.data,'policy':policy or self.policy()})
    def operation(self,argv=None,state='COMPLETED',exit_code=0):
        run=self.run
        op,_=c.start_operation(self.actor,{'project_id':self.project.pk,'run_id':run.run_id,'session_id':run.session_id,'generation':run.generation,'request_id':'OP-'+str(run.operation_set.count()),'kind':'local','argv':argv or ['/bin/true']})
        op=c.claim_operation(op.pk);c.dispatched(op.pk,op.dispatch_nonce)
        op=c.complete(op.pk,op.dispatch_nonce,{'request_id':op.request_id,'input_digest':op.input_digest,'source_revision':op.source_revision,'state':state,'exit_code':exit_code if state=='COMPLETED' else None})
        return op
    def process(self):
        with patch.object(s,'sync',side_effect=lambda *a,**k:s.discover(self.project)):return f.process(self.run.pk)
    def test_direct_closes_without_submission_or_decision_and_finishes_period(self):
        self.configure();self.operation()
        period=MeasurementPeriod.objects.create(run=self.run,change=self.run.change_record,session=self.run.coding_session,started=self.run.created,start_snapshot={'status':'unavailable','reason':'fixture'})
        receipt=self.process();self.run.refresh_from_db();period.refresh_from_db()
        self.assertEqual(self.run.state,'CLOSED');self.assertEqual(self.run.stage,11);self.assertIsNotNone(period.ended)
        self.assertNotIn('submission',self.run.review);self.assertNotIn('decision',self.run.review);self.assertEqual(receipt['kind'],'policy')
        self.process();self.assertEqual(self.run.event_set.filter(kind='run-closed').count(),1)
    def test_missing_and_wrong_argv_do_not_create_success(self):
        self.configure();self.operation(['/bin/false']);self.process();self.run.refresh_from_db()
        self.assertEqual(self.run.state,'FINALIZATION_PENDING');self.assertEqual(RunEvidence.objects.filter(run=self.run).count(),0)
        self.assertIn('evidence:unit:missing',f.view(self.run)['missing'])
    def test_current_source_and_unknown_effect_protect_period(self):
        self.configure();self.operation();(self.root/'source').write_text('changed')
        self.process();self.run.refresh_from_db();self.assertIn('evidence:unit:source-stale',f.view(self.run)['missing'])
        (self.root/'source').write_text('stable');self.operation(state='UNKNOWN')
        self.process();self.run.refresh_from_db();self.assertEqual(self.run.state,'FINALIZATION_PENDING');self.assertIn('closure-effects-protected',f.view(self.run)['missing'])
    def test_contract_cannot_change_after_execution(self):
        self.configure();self.operation()
        with self.assertRaisesRegex(c.Refused,'immutable'):self.configure(self.policy(review_required=True))
        self.assertEqual(self.configure()['digest'],FinalizationPlan.objects.get(run=self.run).digest)
    def producer(self):
        collector=Actor.objects.create(pk='collector-finalization',uid=os.getuid(),role='collector',agent='fixture',token_hash='collector-proof');collector.projects.add(self.project)
        admin=Actor.objects.create(pk='admin-finalization',uid=os.getuid(),role='admin',agent='fixture',token_hash='admin-proof')
        e.register_producer(admin,{'project_id':self.project.pk,'actor_id':collector.pk,'producer_id':'executor','kinds':['publication','installation','availability','verification','service_end']})
        return collector
    def attest(self,collector,rule,artifact='a'*64,key=None):
        kind=next(r['kind'] for r in FinalizationPlan.objects.get(run=self.run).policy['requirements'] if r['id']==rule)
        return e.attest(collector,{**e.identity(self.run),'producer_id':'executor','evidence_id':key or rule,'rule_id':rule,'kind':kind,'result':'passed','source_revision':c.revision(self.run),'artifact_sha256':artifact,'reference':'fixture-receipt','exit_code':0})
    def test_authentication_scope_and_idempotency(self):
        collector=self.producer();policy={'nature':'delivery','requirements':[{'id':'publish','kind':'publication','producer':'executor','criteria':['historical']}]};self.configure(policy)
        with self.assertRaisesRegex(c.Refused,'not-authorized'):self.attest(self.actor,'publish')
        with self.assertRaisesRegex(c.Refused,'scope-divergent'):
            e.attest(collector,{**e.identity(self.run),'session_id':'another-session','producer_id':'executor','evidence_id':'wrong','rule_id':'publish','kind':'publication'})
        row=self.attest(collector,'publish');self.assertEqual(row,self.attest(collector,'publish'))
        with self.assertRaisesRegex(c.Refused,'identity-conflict'):self.attest(collector,'publish','b'*64)
        self.assertEqual(Operation.objects.filter(run=self.run).count(),0)
        self.process();self.run.refresh_from_db();self.assertEqual(self.run.state,'CLOSED')
        with self.assertRaisesRegex(c.Refused,'run-closed'):self.attest(collector,'publish',key='late-new-proof')
    def test_activation_artifact_divergence_and_producer_revocation(self):
        collector=self.producer();policy={'nature':'activation','requirements':[{'id':key,'kind':kind,'producer':'executor','criteria':['historical']} for key,kind in [('install','installation'),('ready','availability')]]};self.configure(policy)
        self.attest(collector,'install');self.attest(collector,'ready','b'*64);self.process();self.run.refresh_from_db()
        self.assertIn('artifact:release:divergent',f.view(self.run)['missing'])
        e.disable_producer(Actor.objects.get(pk='admin-finalization'),{'producer_id':'executor'})
        self.assertIn('evidence:install:producer-inactive',f.view(self.run)['missing'])
    def test_cabu_actual_model_receipt_correlated_without_tests(self):
        policy={'nature':'activation','update_request_id':'UPDATE-FIXTURE','target_version':'3.2.2','requirements':[{'id':key,'kind':kind,'producer':'cab-update','criteria':['historical']} for key,kind in [('install','installation'),('ready','availability')]]};self.configure(policy)
        SystemUpdate.objects.create(pk='UPDATE-FIXTURE',actor=self.actor,target_version='3.2.2',state='OK',active_slot=None,result={'verified':True,'version':'3.2.2','package_sha256':'a'*64})
        self.process();self.run.refresh_from_db();self.assertEqual(self.run.state,'CLOSED');self.assertEqual(self.run.operation_set.count(),0);self.assertEqual(self.run.finalization_evidence.count(),2)
    def test_pilot_dossier_is_assembled_then_waits_for_real_review(self):
        parent=Actor.objects.create(pk='parent-finalization',uid=os.getuid(),agent='fixture',role='orchestrator',token_hash='parent-proof');parent.projects.add(self.project)
        self.run.mode='piloted';self.run.mandate['orchestrator_id']=parent.pk;self.run.save()
        e.configure(parent,{**self.data,'policy':self.policy()});self.operation();self.process();self.run.refresh_from_db()
        self.assertEqual(self.run.state,'REVIEW_PENDING');self.assertEqual(self.run.review['submission']['policy_digest'],FinalizationPlan.objects.get(run=self.run).digest)
        digest=self.run.review['submission']['digest']
        c.review(parent,{**self.data,'submission_digest':digest,'decision':'accept','reason':'Revue de fixture réelle par son autorité.'})
        self.process();self.run.refresh_from_db();self.assertEqual(self.run.state,'CLOSED')
    def test_recovery_after_statistics_interruption_does_not_reexecute(self):
        self.configure();self.operation()
        with patch.object(s,'sync',side_effect=c.Refused('statistics-project-busy')):
            with self.assertRaises(c.Refused):f.process(self.run.pk)
        self.run.refresh_from_db();self.assertEqual(self.run.state,'FINALIZING')
        before=list(self.run.operation_set.values('request_id','receipt_digest'))
        self.process();self.run.refresh_from_db();self.assertEqual(self.run.state,'CLOSED');self.assertEqual(before,list(self.run.operation_set.values('request_id','receipt_digest')))

    def revision(self,argv=None,key='FIX',check='unit'):
        plan=FinalizationPlan.objects.get(run=self.run)
        return {**{k:self.data[k] for k in ('project_id','run_id')},'request_id':key,'check_id':check,'expected_policy_digest':plan.digest,'argv':argv or ['/bin/true'],'reason':'Correction démontrée du cadrage du contrôle de fixture.'}
    def test_failed_check_repair_preserves_receipt_and_closes_only_with_new_execution(self):
        self.configure({'checks':[{'id':'unit','argv':['/bin/false'],'criteria':['historical']}]})
        failed=self.operation(['/bin/false'],exit_code=1);saved=(failed.receipt,failed.receipt_digest)
        self.assertIn('alternative',f.view(self.run)['next_actions'][0])
        data=self.revision();receipt=e.revise_check(self.actor,data)
        self.assertEqual(receipt,e.revise_check(self.actor,data));self.assertEqual(receipt['check_revision'],2)
        with self.assertRaisesRegex(c.Refused,'request-conflict'):e.revise_check(self.actor,{**data,'reason':'Autre justification incompatible avec la requête.'})
        self.process();self.run.refresh_from_db();self.assertNotEqual(self.run.state,'CLOSED')
        self.assertIn('evidence:unit:check-revised',f.view(self.run)['missing'])
        self.operation();self.process();self.run.refresh_from_db();failed.refresh_from_db()
        self.assertEqual(self.run.state,'CLOSED');self.assertEqual(saved,(failed.receipt,failed.receipt_digest))
        self.assertEqual(self.run.operation_set.count(),2);self.assertEqual(self.run.event_set.filter(kind='finalization-check-revised').count(),1)
        self.assertEqual(e.revise_check(self.actor,data),receipt)
    def test_revision_protects_owner_stale_contract_freeze_leases_and_unknown(self):
        self.configure();data=self.revision(['/bin/false'])
        other=Actor.objects.create(pk='other-reviser',uid=os.getuid(),agent='fixture',token_hash='other');other.projects.add(self.project)
        with self.assertRaises(c.Refused):e.revise_check(other,data)
        with self.assertRaisesRegex(c.Refused,'stale'):e.revise_check(self.actor,{**data,'expected_policy_digest':'0'*64})
        with self.assertRaisesRegex(c.Refused,'fields-invalid'):e.revise_check(self.actor,{**data,'criteria':['weakened']})
        self.run.mandate['native_frozen_at']='fixture';self.run.save()
        with self.assertRaisesRegex(c.Refused,'protected'):e.revise_check(self.actor,data)
        self.run.mandate.pop('native_frozen_at');self.run.save()
        from cab_platform.core.models import Lease,Resource
        resource=Resource.objects.create(key='fixture-revision-resource');lease=Lease.objects.create(run=self.run,resource=resource,fencing=1)
        with self.assertRaisesRegex(c.Refused,'effects-protected'):e.revise_check(self.actor,data)
        lease.delete();self.operation(state='UNKNOWN')
        with self.assertRaisesRegex(c.Refused,'effects-protected'):e.revise_check(self.actor,data)
    def test_success_protected_and_old_success_cannot_resurrect_after_argv_roundtrip(self):
        self.configure();self.operation()
        with self.assertRaisesRegex(c.Refused,'already-passed'):e.revise_check(self.actor,self.revision(['/bin/false']))
        (self.root/'source').write_text('changed');e.revise_check(self.actor,self.revision(['/bin/false']))
        (self.root/'source').write_text('stable');e.revise_check(self.actor,self.revision(key='FIX-AGAIN'))
        self.assertIn('evidence:unit:check-revised',f.view(self.run)['missing'])
        self.assertEqual(self.run.operation_set.count(),1)
    def test_piloted_coder_repairs_without_parent_but_final_review_remains_reserved(self):
        parent=Actor.objects.create(pk='parent-reviser',uid=os.getuid(),role='orchestrator',agent='fixture',token_hash='parent');parent.projects.add(self.project)
        self.run.mode='piloted';self.run.mandate['orchestrator_id']=parent.pk;self.run.save()
        e.configure(parent,{**self.data,'policy':{'checks':[{'id':'unit','argv':['/bin/false'],'criteria':['historical']}]}})
        self.operation(['/bin/false'],exit_code=1);e.revise_check(self.actor,self.revision());self.operation();self.process();self.run.refresh_from_db()
        self.assertEqual(self.run.state,'REVIEW_PENDING')
        with self.assertRaises(c.Refused):e.revise_check(self.actor,self.revision(['/bin/false'],key='LATE'))
        c.review(parent,{**self.data,'submission_digest':self.run.review['submission']['digest'],'decision':'accept','reason':'Validation réservée réelle de fixture.'})
        self.process();self.run.refresh_from_db();self.assertEqual(self.run.state,'CLOSED')

if __name__=='__main__':unittest.main()
