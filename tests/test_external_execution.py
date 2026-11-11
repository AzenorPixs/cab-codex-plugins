import base64
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'plugins/cab-approval-bridge/broker'))
import cgpt_approval_bridge_external as external
import cgpt_approval_bridge_external_runner as runner

class ExternalExecutionTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(dir=ROOT/'.cab-tests');self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name);self.project=self.root/'project';self.project.mkdir();self.home=self.root/'home';self.home.mkdir()
        (self.project/'source.py').write_text('VALUE=42\n')
        (self.project/'project.env').write_text("SSH_TEST_HOST='127.0.0.1'\nSSH_TEST_USER='fixture'\nSSH_TEST_PASSWORD='fixture-private-password'\n")
        key=b'ssh-ed25519';blob=len(key).to_bytes(4,'big')+key+(32).to_bytes(4,'big')+bytes(32)
        self.known=self.root/'known_hosts';self.known.write_text('127.0.0.1 ssh-ed25519 '+base64.b64encode(blob).decode()+'\n');self.known.chmod(0o600)
        self.profile={'id':'bank','kind':'ssh','resource_key':'lxc:test/100','host_key':'SSH_TEST_HOST','user_key':'SSH_TEST_USER','password_key':'SSH_TEST_PASSWORD','container':'lxc','known_hosts':str(self.known)}
        self.profile['connection_fingerprint']=external.connection(str(self.project),self.profile)['fingerprint']
        self.args={'request_id':'request','run_id':'run','session_id':'ses_test','change_id':'change','directory':str(self.project),'reservation_version':1,
          'adapter_id':'bank','argv':['/usr/bin/python3','-c','from pathlib import Path;print(Path("source.py").read_text());print("TOKEN=fixture")'],
          'files':[{'path':'source.py'}]}
        self.calls=[];self.remote=self.root/'remote';self.remote.mkdir(mode=0o700)
    def grant(self,args,known=False):return {'status':'AUTHORIZED_EXTERNAL','request_id':args['request_id'],'adapter':self.profile,'input_digest':external.digest(self.args),
        'source_revision':'a'*64,'lease_id':'lease','fencing':3,'read_roots':[str(self.project)],'target_fingerprint':None,'execution_known':known,'remote_allowed':True}
    def transport(self,cfg,packet,timeout):
        self.calls.append(packet['action']);return runner.handle(packet,state_root=self.remote,identity={'container':'lxc','fingerprint':'b'*64})
    def test_execute_transfers_only_scoped_artifacts_and_replays_the_receipt(self):
        first=external.execute(self.args,self.grant,transport=self.transport,home=self.home)
        self.assertEqual(first['status'],'COMPLETED');self.assertEqual(first['exitCode'],0);self.assertIn('VALUE=42',first['output']);self.assertNotIn('TOKEN=fixture',first['output'])
        again=external.execute(self.args,lambda a:self.grant(a,known=True),transport=self.transport,home=self.home)
        self.assertEqual(first,again);self.assertEqual(self.calls,['execute']);self.assertNotIn('fixture-private-password',json.dumps(first))
    def test_lost_response_is_reconciled_by_status_without_reexecuting(self):
        def lost(cfg,p,timeout):self.transport(cfg,p,timeout);raise external.ExternalError('external-transport-uncertain')
        result=external.execute(self.args,self.grant,transport=lost,home=self.home);self.assertEqual(result['status'],'UNKNOWN')
        args={k:v for k,v in self.args.items() if k not in ('argv','files')}
        result=external.status(args,lambda a:self.grant(a,known=True),transport=self.transport,home=self.home)
        self.assertEqual(result['status'],'COMPLETED');self.assertEqual(self.calls,['execute','status'])
    def test_ambiguous_config_and_changed_target_are_refused_without_values(self):
        with (self.project/'project.env').open('a') as f:f.write('SSH_TEST_HOST=other\n')
        with self.assertRaisesRegex(external.ExternalError,'config-ambiguous'):external.connection(str(self.project),self.profile)
    def test_private_config_is_never_uploaded_and_missing_known_receipt_is_not_replayed(self):
        with self.assertRaisesRegex(external.ExternalError,'artifact-protected'):external.gather_files(str(self.project),[{'path':'project.env'}],[str(self.project)])
        with self.assertRaisesRegex(external.ExternalError,'receipt-reconciliation-required'):
            external.execute(self.args,lambda a:self.grant(a,known=True),transport=self.transport,home=self.home)
        self.assertEqual(self.calls,[])
    def test_remote_refuses_host_execution_and_preserves_existing_unknown(self):
        packet={'protocol':runner.PROTOCOL,'action':'execute','job_id':'a'*64,'input_digest':'c'*64,'scope_digest':'d'*64,'container':'lxc','target_fingerprint':None,'argv':['/usr/bin/true']}
        with self.assertRaisesRegex(ValueError,'TARGET_DIVERGENT'):runner.handle(packet,state_root=self.remote,identity={'container':'','fingerprint':'b'*64})
    def test_remote_failure_and_timeout_cannot_be_successes(self):
        for i,argv in enumerate([['/usr/bin/false'],['/usr/bin/sleep','2']]):
            p={'protocol':runner.PROTOCOL,'action':'execute','job_id':str(i)*64,'input_digest':'c'*64,'scope_digest':'d'*64,'container':'lxc','target_fingerprint':None,'argv':argv,'timeout_ms':50}
            result=runner.handle(p,state_root=self.remote,identity={'container':'lxc','fingerprint':'b'*64})
            self.assertTrue(result['exitCode']!=0 or result['status']!='COMPLETED')
    def test_describe_never_returns_credentials(self):
        draft={k:v for k,v in self.profile.items() if k!='connection_fingerprint'}
        result=external.describe({**self.args,'profile':draft},lambda _: {'status':'AUTHORIZED_EXTERNAL_DESCRIBE'})
        self.assertEqual(result['profile']['connection_fingerprint'],self.profile['connection_fingerprint']);self.assertNotIn('fixture-private-password',json.dumps(result))
if __name__=='__main__':unittest.main()
