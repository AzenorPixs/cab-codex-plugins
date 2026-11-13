import unittest
from cab_platform.finalization_contract import validate,ContractError

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

if __name__=='__main__':unittest.main()
