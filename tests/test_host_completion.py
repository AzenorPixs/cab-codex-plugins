"""Gardes de clôture hôte et révision explicite avant qualification."""
import types
import unittest
from cab_platform.host_completion import revised_policy,require_prequalification,require_host_policy
from cab_platform.core.commands import Refused

class HostCompletionPolicyTests(unittest.TestCase):
    def test_existing_snapshot_is_preserved_only_when_index_and_refs_match(self):
        import test_git_commit_metadata as fixtures
        from cab_platform.host_completion import verify_unpublished_stage
        fixture=fixtures.MetadataTests('test_dates_et_signatures_protegees')
        fixture.setUp()
        self.addCleanup(fixture.doCleanups)
        tree=fixture.git('write-tree').strip()
        keep='refs/cab/recovery-test'
        base='refs/cab/recovery-base'
        fixture.git('update-ref',keep,tree)
        fixture.git('update-ref',base,fixture.head)
        path=str(fixture.root/'.git/index')
        index=types.SimpleNamespace(index_path=path,base_head=fixture.head,keep_ref=keep,keep_oid=tree)
        receipt={'phase':'prepared','index_path':path,'base_oid':fixture.head,
                 'keep_ref':keep,'base_ref':base,'previous_keep_oid':tree}
        before=__import__('pathlib').Path(path).read_bytes()
        result=verify_unpublished_stage(fixture.project,index,receipt)
        self.assertEqual(result['retained_snapshot'],tree)
        self.assertEqual(__import__('pathlib').Path(path).read_bytes(),before)
        fixture.git('update-ref',base,fixture.first)
        with self.assertRaises(Refused):
            verify_unpublished_stage(fixture.project,index,receipt)
        fixture.git('update-ref',base,fixture.head)
        fixture.git('read-tree',fixture.head)
        with self.assertRaises(Refused):
            verify_unpublished_stage(fixture.project,index,receipt)

    def test_revision_avant_preuve_preserve_commandes_producteurs_et_revue(self):
        old=['25 archives par page','Portée autorisée'];new=['10 archives par page','Portée autorisée']
        policy={'nature':'development','checks':[{'id':'test','argv':['/usr/bin/true'],'criteria':old,'executor':'local'}],'requirements':[{'id':'proof','kind':'verification','producer':'producer','criteria':old}],'review_required':True}
        value=revised_policy(policy,old,new,'direct')
        self.assertEqual(value['checks'][0]['criteria'],new)
        self.assertEqual(value['checks'][0]['argv'],policy['checks'][0]['argv'])
        self.assertEqual(value['requirements'][0]['producer'],'producer');self.assertTrue(value['review_required'])
        self.assertEqual(policy['checks'][0]['criteria'],old)
        with self.assertRaises(Refused):revised_policy(policy,old,[new[0]],'direct')

    def test_aucune_revision_de_critere_apres_operation_preuve_ou_gel(self):
        exists=lambda value:types.SimpleNamespace(exists=lambda:value)
        run=types.SimpleNamespace(operation_set=exists(False),finalization_evidence=exists(False),review={},mandate={})
        require_prequalification(run)
        run.operation_set=exists(True)
        with self.assertRaises(Refused):require_prequalification(run)
        run.operation_set=exists(False);run.finalization_evidence=exists(True)
        with self.assertRaises(Refused):require_prequalification(run)
        run.finalization_evidence=exists(False);run.mandate={'native_frozen_at':'fixture'}
        with self.assertRaises(Refused):require_prequalification(run)

    def test_fin_hote_refuse_livraison_ou_index_encore_reserve(self):
        run=types.SimpleNamespace(mode='direct');plan=types.SimpleNamespace(policy={'nature':'development','review_required':False,'requirements':[]});index=types.SimpleNamespace(state='RELEASED')
        require_host_policy(run,plan,index)
        index.state='OPEN'
        with self.assertRaises(Refused):require_host_policy(run,plan,index)
        index.state='RELEASED';plan.policy['requirements']=[{'kind':'publication'}]
        with self.assertRaises(Refused):require_host_policy(run,plan,index)
        plan.policy['requirements']=[];run.mode='piloted'
        with self.assertRaises(Refused):require_host_policy(run,plan,index)


    def test_annulation_initialisation_exige_absence_snapshot_et_references(self):
        import test_git_commit_metadata as fixture_module
        from cab_platform.host_completion import verify_unpublished_stage
        fixture=fixture_module.MetadataTests('test_dates_et_signatures_protegees');fixture.setUp();self.addCleanup(fixture.doCleanups)
        path=str(fixture.root/'.git/index')
        index=types.SimpleNamespace(index_path=path,base_head=fixture.head,keep_ref='',keep_oid='')
        receipt={'phase':'prepared','index_path':path,'base_oid':fixture.head,'keep_ref':'refs/cab/test-unpublished','base_ref':'refs/cab/test-base'}
        with self.assertRaises(Refused):verify_unpublished_stage(fixture.project,index,receipt)
        fixture.git('read-tree',fixture.head)
        proof=verify_unpublished_stage(fixture.project,index,receipt);self.assertTrue(proof['no_snapshot'])
        fixture.git('update-ref',receipt['keep_ref'],fixture.head)
        with self.assertRaises(Refused):verify_unpublished_stage(fixture.project,index,receipt)
