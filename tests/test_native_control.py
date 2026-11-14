"""Frontière native et reçus sans rejeu, sur PostgreSQL dédié."""
import os
import uuid
import unittest
from unittest.mock import patch
if os.environ.get('CAB_TEST_FIXTURE')!='1':raise RuntimeError('dedicated-postgresql-fixture-required')
import django
django.setup()
from django.db import transaction
from cab_platform.core import native_control as n,commands as c
from cab_platform.core.models import Actor,NativeReload,McpConnector
from cab_platform.native_api import NativeFailure

OWNER={'pid':999999,'uid':0,'start':'fixture','boot':'fixture','parent_pid':1}

class NativeControlTests(unittest.TestCase):
    def setUp(self):
        self.tx=transaction.atomic();self.tx.__enter__()
        self.actor=Actor.objects.create(pk=uuid.uuid4().hex,uid=0,agent='codex-cli',token_hash=uuid.uuid4().hex,native={'control_socket':'/fixture','control_generation':1})
    def tearDown(self):
        transaction.set_rollback(True);self.tx.__exit__(None,None,None)
    def request(self,key='NATIVE-ONCE'):
        with patch.object(n,'endpoint',return_value=OWNER),patch.object(n,'boundary'):
            return n.request(self.actor,{'request_id':key})
    def test_duplicate_admission_and_dispatch_once(self):
        first=self.request();self.assertEqual(self.request(),first)
        with patch.object(n,'endpoint',return_value=OWNER),patch.object(n,'boundary'),patch.object(n,'reload_codex',return_value={'method':'fixture'}) as api:
            n.work_one();n.work_one();api.assert_called_once()
        self.assertEqual(NativeReload.objects.get(pk=first['request_id']).state,'COMPLETED')
    def test_unknown_prevents_fallback_even_if_endpoint_removed(self):
        row=NativeReload.objects.get(pk=self.request()['request_id']);row.state='UNKNOWN';row.save()
        connector=McpConnector(actor=self.actor,process={'parent_pid':OWNER['pid']})
        with patch.object(n,'identity',return_value=OWNER),patch.object(n,'endpoint',side_effect=NativeFailure('native-socket-unavailable')):
            self.assertEqual(n.gate(self.actor,connector,n.__version__)['mode'],'wait-native')
        with patch.object(n,'reload_codex') as api:n.work_one();api.assert_not_called()
    def test_native_priority_then_known_unavailability_allows_fallback(self):
        connector=McpConnector(actor=self.actor,process={'parent_pid':OWNER['pid']})
        with patch.object(n,'identity',return_value=OWNER),patch.object(n,'endpoint',return_value=OWNER):
            state=n.gate(self.actor,connector,n.__version__);self.assertEqual(state['mode'],'request-native')
            with patch.object(n,'boundary'):n.request(self.actor,{'request_id':state['request_id']},expected=OWNER)
            self.assertEqual(n.gate(self.actor,connector,n.__version__)['mode'],'wait-native')
            NativeReload.objects.filter(pk=state['request_id']).update(state='UNAVAILABLE')
            self.assertEqual(n.gate(self.actor,connector,n.__version__)['mode'],'fallback')
    def test_busy_boundary_does_not_dispatch(self):
        self.request()
        with patch.object(n,'endpoint',return_value=OWNER),patch.object(n,'boundary',side_effect=c.Refused('native-control-effects-protected')),patch.object(n,'reload_codex') as api:
            n.work_one();api.assert_not_called()
        self.assertEqual(NativeReload.objects.get().state,'QUEUED')
    def test_public_policy_honors_native_wait(self):
        from types import SimpleNamespace
        from cab_platform.core.api import connector_policy
        connector=McpConnector.objects.create(pk=uuid.uuid4().hex,actor=self.actor,agent='codex-cli',process=OWNER)
        with patch('cab_platform.core.api.principal',return_value=self.actor),patch.object(n,'gate',return_value={'mode':'wait-native'}):
            result=connector_policy(SimpleNamespace(cab_peer=OWNER),connector_id=connector.pk)
        self.assertFalse(result['stop_allowed']);self.assertEqual(result['native_control']['mode'],'wait-native')
    def test_uncertain_dispatch_is_not_repeated(self):
        self.request()
        with patch.object(n,'endpoint',return_value=OWNER),patch.object(n,'boundary'),patch.object(n,'reload_codex',side_effect=NativeFailure('response-lost','UNKNOWN')) as api:
            n.work_one();n.work_one();api.assert_called_once()
        self.assertEqual(NativeReload.objects.get().state,'UNKNOWN')
    def test_owner_and_fields_are_not_arbitrary(self):
        with self.assertRaisesRegex(c.Refused,'fields-invalid'):n.configure(self.actor,{'unexpected':'value'})
        with self.assertRaisesRegex(c.Refused,'owner-required'):n.target_actor(self.actor,{'actor_id':'someone-else'})

if __name__=='__main__':unittest.main()
