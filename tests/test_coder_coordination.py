import hashlib
import sys
import tempfile
import unittest
from unittest.mock import patch
from contextlib import contextmanager
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'plugins/cab-approval-bridge/scripts'))
from cab_coder_coordination import CoderMailbox,proof_state
from cab_session_dependencies import DependencyStore,CoordinationError,check_close

class CoderCoordinationTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(dir=ROOT/'.cab-tests');self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name);self.project=self.root/'project';self.project.mkdir()
        self.state=self.root/'state';self.path=self.state/'cab-approval-bridge/dependencies'
        self.box=CoderMailbox(self.path);self.addCleanup(self.box.close)
        self.proof=self.project/'proof.txt';self.proof.write_text('candidate fixture\n');self.sha=hashlib.sha256(self.proof.read_bytes()).hexdigest()
    def adopt(self,run):return self.box.adopt(str(self.project),run,'owner-'+run,'ses_'+run,1,1,'change-'+run)
    def action(self,run,action,args):return self.box.execute({'project':str(self.project),'run':run,'session':'ses_'+run,'generation':1,'context':1,'action':action,'request_id':'request-'+run+'-'+action,'args':args})
    def subscribe(self,run,source):return self.action(run,'subscribe',{'dependency_id':'dep-'+source,'kind':'change','subject':'change-'+source,'criterion':'ready'})
    def publish(self,run='a'):return self.action(run,'publish',{'notice_id':'notice-'+run,'kind':'change','subject':'change-'+run,'proof':'proof.txt','proof_sha256':self.sha,'stage':'tested'})
    def test_ownership_transfer_preserves_existing_subscriptions_and_retires_parent(self):
        s=self.box.store;s.register(str(self.project),'owner-b','b','piloted');s.set_session_state(str(self.project),'owner-b','b','active',1)
        s.subscribe(str(self.project),'owner-b','b','dep-a','change','change-a','ready')
        self.adopt('a');self.adopt('b');self.publish()
        items=self.action('b','inbox',{})['items'];self.assertEqual(len(items),1);self.assertEqual(items[0]['actor_session'],'ses_a');self.assertEqual(items[0]['proof_state'],'fresh')
        legacy=DependencyStore(self.path)
        try:
            with self.assertRaisesRegex(CoordinationError,'owner-delegated'):legacy.publish(str(self.project),'owner-a','a','fake','change','change-a','proof.txt',self.sha)
        finally:legacy.close()
    def test_deduplication_freshness_and_ack_do_not_validate_dependency(self):
        self.adopt('a');self.adopt('b');self.subscribe('b','a');self.publish();self.publish()
        self.assertEqual(len(self.action('b','inbox',{})['items']),1)
        self.proof.write_text('changed\n');self.assertEqual(self.action('b','inbox',{})['items'][0]['proof_state'],'stale')
        result=self.action('b','ack',{'dependency_id':'dep-a','notice_id':'notice-a'});self.assertFalse(result['dependency_verified'])
    def test_direct_to_piloted_and_piloted_to_direct_share_one_mailbox(self):
        p=str(self.project);s=self.box.store;s.register(p,'direct','direct-run','direct','SCM');s.set_session_state(p,'direct','direct-run','active',1)
        s.subscribe(p,'direct','direct-run','dep-a','change','change-a','ready')
        self.adopt('a');self.action('a','subscribe',{'dependency_id':'dep-direct','kind':'change','subject':'direct-change','criterion':'ready'})
        s.publish(p,'direct','direct-run','notice-direct','change','direct-change','proof.txt',self.sha)
        self.assertEqual(self.action('a','inbox',{})['items'][0]['notice_id'],'notice-direct')
        self.publish();self.assertEqual(s.inbox(p,'direct','direct-run')['notices'][0]['notice_id'],'notice-a')
    def test_unknown_delivery_is_durable_and_blocks_both_sides_until_observed(self):
        self.adopt('a');self.adopt('b');self.subscribe('b','a');self.publish()
        p={'project':str(self.project),'run':'b','storage_session':'owner-b','notice_id':'notice-a','attempt_id':'attempt','action':'prepare-delivery'}
        self.assertTrue(self.box.execute(p)['send']);self.assertFalse(self.box.execute(p)['send'])
        self.box.execute({**p,'action':'finish-delivery','state':'unknown'})
        self.assertEqual(check_close(str(self.project),'a',str(self.state))['status'],'pending')
        self.assertEqual(check_close(str(self.project),'b',str(self.state))['status'],'pending')
        self.box.execute({**p,'action':'finish-delivery','state':'observed','native_message_id':'native-msg'})
        self.assertEqual(check_close(str(self.project),'b',str(self.state))['status'],'clear')
    def test_cycles_and_stale_identity(self):
        self.adopt('a');self.adopt('b');self.subscribe('a','b');result=self.subscribe('b','a');self.assertEqual(result['cycles'],[['a','b']])
        with self.assertRaisesRegex(CoordinationError,'binding-stale'):self.box.execute({'project':str(self.project),'run':'a','session':'ses_other','generation':1,'context':1,'action':'inbox'})
    def test_pause_is_not_lifted_by_a_notice_or_migration(self):
        self.adopt('a');s=self.box.store;p=str(self.project);s.register(p,'owner-b','b','piloted');s.set_session_state(p,'owner-b','b','paused',1)
        with self.assertRaisesRegex(CoordinationError,'paused'):self.adopt('b')
        s.subscribe(p,'owner-b','b','dep-a','change','change-a','ready');self.publish()
        self.assertEqual(self.box.routes(p)['routes'][0]['session_state'],'paused')
    def test_protected_or_escaped_proof_is_never_opened(self):
        for name in ['project.env','../outside','.git/config']:
            with self.assertRaisesRegex(CoordinationError,'protected'):proof_state(str(self.project),name,self.sha)
    def test_restart_reuses_binding_and_delivery_identity(self):
        self.adopt('a');other=CoderMailbox(self.path)
        try:self.assertEqual(other.adopt(str(self.project),'a','owner-a','ses_a',1,1,'change-a')['actor_session'],'ses_a')
        finally:other.close()
    def test_request_identity_cannot_be_reused_for_another_notice(self):
        self.adopt('a');self.publish()
        with self.assertRaisesRegex(CoordinationError,'request-conflict'):
            self.action('a','publish',{'notice_id':'changed','kind':'change','subject':'change-a','proof':'proof.txt','proof_sha256':self.sha,'stage':'tested'})
    def test_explicit_generation_rebind_keeps_notices_and_retires_the_old_actor(self):
        self.adopt('a');self.adopt('b');self.subscribe('b','a');self.publish()
        with self.assertRaisesRegex(CoordinationError,'binding-conflict'):self.box.adopt(str(self.project),'a','owner-a','ses_new',2,1,'change-a')
        self.box.adopt(str(self.project),'a','owner-a','ses_new',2,1,'change-a',replace=True)
        self.assertEqual(self.action('b','inbox',{})['items'][0]['actor_session'],'ses_a')
        with self.assertRaisesRegex(CoordinationError,'binding-stale'):self.action('a','status',{})
    def test_direct_native_route_uses_the_existing_guarded_sender_once(self):
        p=str(self.project);s=self.box.store;s.register(p,'direct','direct-run','direct');s.set_session_state(p,'direct','direct-run','active',1)
        s.subscribe(p,'direct','direct-run','dep-a','change','change-a','ready');self.adopt('a');self.publish()
        self.box.db.execute('INSERT INTO coder_direct_transports VALUES(?,?,?,?)',(p,'direct','direct-run','/private/fixture.sock'))
        @contextmanager
        def barrier(*args):yield True
        calls=[]
        def sender(session,turn,notice):
            calls.append((session,turn,notice))
            attempt='coder-'+hashlib.sha256(__import__('cab_session_dependencies').encoded([p,session,'direct-run',notice]).encode()).hexdigest()
            return {'id':attempt,'result':{'turnId':turn}}
        packet={'action':'notify-direct','project':p,'run':'direct-run','session':'direct','notice_id':'notice-a','dependency_id':'dep-a','state_root':str(self.state),'controller_url':'http://127.0.0.1:8788'}
        with patch('cab_coder_coordination.verify_pilot_binding'),patch('cab_coder_coordination.codex_active_turn',return_value={'turn_id':'turn'}),patch('cab_coder_coordination.codex_verified_sender',return_value=sender),patch.object(s,'direct_delivery_barrier',barrier):
            self.assertEqual(self.box.execute(packet)['status'],'accepted')
            self.assertEqual(self.box.execute(packet)['status'],'accepted')
        self.assertEqual(calls,[('direct','turn','notice-a')])
if __name__=='__main__':unittest.main()
