import unittest
from cab_platform.finalization_contract import validate,replace_check_argv,next_actions,ContractError

class ContractTests(unittest.TestCase):
    def policy(self):return {'checks':[{'id':'unit','argv':['python3','-B','tests.py'],'criteria':['criterion']}]}
    def test_default_direct_policy(self):
        result=validate(self.policy(),['criterion'],'direct');self.assertFalse(result['review_required']);self.assertEqual(result['nature'],'development')
    def test_empty_or_uncovered_plan_rejected(self):
        with self.assertRaises(ContractError):validate({},['criterion'],'direct')
        with self.assertRaises(ContractError):validate(self.policy(),['criterion','other'],'direct')
    def test_pilot_cannot_remove_reserved_review(self):
        self.assertTrue(validate(self.policy(),['criterion'],'piloted')['review_required'])
        with self.assertRaises(ContractError):validate({**self.policy(),'review_required':False},['criterion'],'piloted')
    def test_no_duplicate_or_unknown_rules(self):
        policy=self.policy();policy['checks']*=2
        with self.assertRaises(ContractError):validate(policy,['criterion'],'direct')
        with self.assertRaises(ContractError):validate({**self.policy(),'implicit_accept':True},['criterion'],'direct')
    def test_activation_requires_installation_and_availability(self):
        with self.assertRaises(ContractError):validate({**self.policy(),'nature':'activation'},['criterion'],'direct')
    def test_service_requires_terminal_proof(self):
        with self.assertRaises(ContractError):validate({**self.policy(),'nature':'service'},['criterion'],'direct')
    def test_revision_changes_only_argv_and_preserves_original(self):
        original=validate(self.policy(),['criterion'],'piloted')
        revised=replace_check_argv(original,'unit',['python3','corrected.py'])
        self.assertEqual(original['checks'][0]['argv'],['python3','-B','tests.py'])
        restored=replace_check_argv(revised,'unit',original['checks'][0]['argv'])
        self.assertEqual(original,restored);self.assertTrue(revised['review_required'])
        with self.assertRaises(ContractError):replace_check_argv(original,'unknown',['true'])
        with self.assertRaises(ContractError):replace_check_argv(original,'unit',original['checks'][0]['argv'])
    def test_missing_actions_are_precise_and_never_execute_or_replay(self):
        policy=self.policy();policy['checks'][0]['id']='unit:scoped'
        actions=next_actions(['evidence:unit:scoped:check-revised','closure-effects-protected','reserved-review-required'],policy)
        self.assertEqual(actions[0]['rule_id'],'unit:scoped');self.assertEqual(actions[0]['alternative']['command'],'finalization.revise_check')
        self.assertEqual(actions[0]['blocked_by'],['closure-effects-protected'])
        self.assertTrue(all(not row['automatic'] and not row['replay'] for row in actions))
        self.assertEqual(actions[1]['query'],'operation');self.assertEqual(actions[2]['command'],'run.review')
    def test_cabu_wait_reads_existing_job_instead_of_installing(self):
        policy={'update_request_id':'UPDATE','requirements':[{'id':'installed','kind':'installation','producer':'cab-update'}]}
        action=next_actions(['evidence:installed:missing'],policy)[0]
        self.assertEqual(action['command'],'system.update.status');self.assertEqual(action['request_id'],'UPDATE')
        self.assertEqual(next_actions(['finalization-contract-required'],{})[0]['command'],'finalization.configure')

if __name__=='__main__':unittest.main()
