"""Qualification CABU ciblée sur l'hôte ; fixtures PG annulées, aucun signal."""
import os
import sys
import uuid
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,os.environ.get('CAB_TEST_SOURCE',str(Path(__file__).resolve().parents[1]/'src')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
import django
django.setup()
from django.db import transaction
from cab_platform import cabu_recovery_policy as p,system_updates as u,__version__
from cab_platform.core import native_control as n,commands as c
from cab_platform.core.models import Actor,SystemUpdate,NativeReload,Event

class PolicyTests(unittest.TestCase):
    def setUp(self):
        self.tx=transaction.atomic();self.tx.__enter__();self.addCleanup(self.rollback)
        key=uuid.uuid4().hex
        self.actor=Actor.objects.create(pk=key,uid=os.getuid(),agent='codex',token_hash=key,native={'control_generation':7})
        self.owner={'pid':424242,'uid':os.getuid(),'parent_pid':424241,'start':'42','boot':'fixture'}
        self.job=SystemUpdate.objects.create(pk=key,actor=self.actor,state='RELOAD_REQUIRED',active_slot=None,target_version=__version__,result={'version':__version__,'verified':True,'recovery_context':{'policy':p.POLICY,'request_id':key,'actor_id':key,'uid':self.actor.uid,'target_version':__version__,'instance':self.owner,'frontend':None}})
        self.addCleanup(patch.stopall)
        patch.object(p,'identity',return_value=self.owner).start()
        patch('cab_platform.paths.runtime_config',return_value={'version':__version__}).start()
    def rollback(self):
        transaction.set_rollback(True);self.tx.__exit__(None,None,None)
    def test_same_instance_authorized_without_additional_confirmation(self):
        result=p.authorization(self.job,self.owner)
        self.assertEqual(result['state'],'AUTHORIZED');self.assertFalse(result['additional_confirmation_required']);self.assertFalse(result['replay'])
    def test_other_uid_or_start_is_blocked(self):
        for changed in ({**self.owner,'uid':999999},{**self.owner,'start':'43'}):
            self.assertEqual(p.authorization(self.job,changed)['reason'],'cabu-recovery-instance-divergent')
    def test_reparenting_alone_does_not_invalidate_kernel_life(self):
        with patch.object(p,'identity',return_value={**self.owner,'parent_pid':1}):self.assertEqual(p.authorization(self.job)['state'],'AUTHORIZED')
    def test_old_receipt_does_not_gain_authority(self):
        self.job.result.pop('recovery_context');self.assertEqual(p.authorization(self.job)['reason'],'cabu-recovery-scope-missing')
    def test_unknown_and_unverified_remain_blocked(self):
        self.job.state='UNKNOWN';self.assertEqual(p.authorization(self.job)['reason'],'cabu-recovery-package-not-verified')
        self.job.state='RELOAD_REQUIRED';self.job.result['verified']=False;self.assertEqual(p.authorization(self.job)['state'],'BLOCKED')
    def test_runtime_version_must_match(self):
        with patch('cab_platform.paths.runtime_config',return_value={'version':'0.0.0'}):self.assertEqual(p.authorization(self.job)['reason'],'cabu-recovery-version-divergent')
    def test_no_desktop_scope_exposes_blocker_without_exception(self):
        self.job.result['recovery_context']['instance']=None
        result=u.data(self.job)
        self.assertEqual(result['frontend_recovery_authorization']['state'],'BLOCKED')
        self.assertFalse(result['frontend_recovery_authorization']['additional_confirmation_required'])
    def test_native_unknown_is_preserved(self):
        row=NativeReload.objects.create(pk=uuid.uuid4().hex,actor=self.actor,target_version=__version__,owner=self.owner,input_digest='fixture',state='UNKNOWN')
        self.assertEqual(p.authorization(self.job)['reason'],'native-control-outcome-uncertain');row.refresh_from_db();self.assertEqual(row.state,'UNKNOWN')
    def test_revoke_without_provider_access_or_generation_change(self):
        self.actor.agent='opencode';self.actor.save()
        with patch.object(n,'endpoint',side_effect=AssertionError('provider access')):
            result=n.configure(self.actor,{'cabu_recovery_authorized':False})
        self.actor.refresh_from_db();self.assertFalse(result['authorized']);self.assertEqual(self.actor.native['control_generation'],7)
        self.assertEqual(p.authorization(self.job)['reason'],'cabu-recovery-revoked')
        self.assertTrue(Event.objects.filter(kind='cabu-recovery-consent-updated',data__actor_id=self.actor.pk).exists())
    def test_revocation_boolean_strict(self):
        with self.assertRaisesRegex(c.Refused,'cabu-recovery-consent-invalid'):n.configure(self.actor,{'cabu_recovery_authorized':1})
    def test_queued_recovery_rechecks_revocation_before_dispatch(self):
        key='fixture-'+uuid.uuid4().hex
        with patch.object(n,'endpoint',return_value=self.owner):
            result=n.request(self.actor,{'request_id':key,'version':__version__},expected=self.owner,update=self.job)
            self.assertEqual(result['cabu_recovery']['request_id'],self.job.pk)
            n.configure(self.actor,{'cabu_recovery_authorized':False})
            row=NativeReload.objects.get(pk=key)
            # Limiter la sélection à notre fixture : aucun travail extérieur exécuté.
            with patch.object(n.NativeReload.objects,'select_for_update') as select,patch.object(n,'boundary'),patch.object(n,'reload_codex') as reload:
                select.return_value.filter.return_value.order_by.return_value.first.return_value=row
                n.work_one();reload.assert_not_called()
            row.refresh_from_db();self.assertEqual(row.state,'UNAVAILABLE');self.assertFalse(row.result['mutation_dispatched'])
    def test_capture_requires_real_peer_chain(self):
        relay={**self.owner,'pid':23,'parent_pid':self.owner['pid']};worker={**self.owner,'pid':24,'parent_pid':23}
        def identify(pid):return {24:worker,23:relay,self.owner['pid']:self.owner}.get(pid)
        def classify(pid,mode):return 'codex' if (pid,mode) in ((24,'mcp-worker'),(23,'mcp')) else None
        with patch.object(p,'identity',side_effect=identify),patch.object(p,'cab_process',side_effect=classify):
            scope=p.capture(self.actor,{'uid':self.actor.uid,'pid':24},'fixture',__version__)
            self.assertEqual(scope['instance'],self.owner)
            self.assertIsNone(p.capture(self.actor,{'uid':999999,'pid':24},'fixture',__version__)['instance'])
    def test_finish_preserves_original_context_in_database_and_receipt(self):
        original=self.job.result['recovery_context']
        self.job.state='INSTALLING';self.job.save()
        with patch.object(u,'atomic_json') as write,patch('cab_platform.core.connectors.assess',return_value=('RECONNECTING',[])):
            receipt=u.finish(self.job,'OK',{'verified':True,'version':__version__})
        self.job.refresh_from_db();self.assertEqual(self.job.result['recovery_context'],original)
        self.assertEqual(receipt['recovery_context'],original);self.assertEqual(write.call_args.args[1]['recovery_context'],original)

if __name__=='__main__':unittest.main(verbosity=2)
