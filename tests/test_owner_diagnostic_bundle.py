"""Diagnostic broker synthétique : aucun journal ni clé ne sont écrits."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


class OwnerDiagnosticBundleTest(unittest.TestCase):
    def test_reconstructed_events_are_explicit_and_idempotent(self):
        broker=Path(__file__).resolve().parents[1]/'plugins/cab-approval-bridge/broker'
        with tempfile.TemporaryDirectory(prefix='cab-reconstruction-') as directory:
            root=Path(directory);env=os.environ.copy()
            env['CGPT_APPROVAL_STORE']=str(root/'approvals.json');env['CGPT_APPROVAL_JOURNAL']=str(root/'events.ndjson')
            env['CGPT_JOURNAL_CHECKPOINT_PATH']=str(root/'checkpoint.json')
            for key in ('CGPT_JOURNAL_HMAC_KEY','CGPT_JOURNAL_HMAC_PREVIOUS_KEYS'):env.pop(key,None)
            script="""import json,sys;sys.path.insert(0,sys.argv[1]);import cgpt_approval_bridge_server as b
item={'approval_id':'approval-test','requestId':'request-test','change_id':'change-test','status':'REJECTED','created_at':'2026-11-05T00:00:00Z','expires_at':'2099-01-01T00:00:00Z'}
b.repair_journal_for_item(item,reconstructed=True);b.repair_journal_for_item(item,reconstructed=True)
events=b.journal.read_events(approval_id='approval-test');print(json.dumps([{'type':e['event_type'],'origin':e['data'].get('reconstruction')} for e in events]))"""
            result=subprocess.run(['python3','-B','-c',script,str(broker)],env=env,text=True,capture_output=True,check=True)
            self.assertEqual(json.loads(result.stdout),[{'type':'APPROVAL_CREATED','origin':'from-retained-store-not-original'},
                                                        {'type':'APPROVAL_REJECTED','origin':'from-retained-store-not-original'}])

    def test_same_change_in_other_project_is_not_owned_by_change_name_alone(self):
        broker=Path(__file__).resolve().parents[1]/'plugins/cab-approval-bridge/broker'
        script="""import sys;sys.path.insert(0,sys.argv[1]);import cgpt_approval_bridge_server as b
scope={'workspace':'/project-a','changeId':'same','changeIds':['same'],'runIds':['target-run'],'ids':['target-run','target-request'],'closureAuthority':'authoritative-retired-run-batch-v1'}
foreign={'directory':'/project-b','change_id':'same','approval_id':'other-approval'}
assert not b.erasure_owns_item(foreign,scope)
assert not b.erasure_owns_item({**foreign,'directory':'relative-token'},scope)
assert not b.erasure_owns_item({k:v for k,v in foreign.items() if k!='directory'},scope)
assert b.erasure_owns_item({**foreign,'requestId':'target-request'},scope)
assert b.erasure_owns_item({**foreign,'directory':'/project-a'},scope)
"""
        subprocess.run(['python3','-B','-c',script,str(broker)],text=True,capture_output=True,check=True)

    def test_bundle_is_read_only_and_does_not_reanchor_journal(self):
        broker=Path(__file__).resolve().parents[1]/'plugins/cab-approval-bridge/broker'
        with tempfile.TemporaryDirectory(prefix='cab-diag-') as directory:
            root=Path(directory);store=root/'approvals.json';store.write_text(json.dumps({'schema_version':2,'approvals':{}}))
            store.chmod(0o600)
            env=os.environ.copy();env['CGPT_APPROVAL_STORE']=str(store);env['CGPT_APPROVAL_JOURNAL']=str(root/'events.ndjson')
            env['CGPT_JOURNAL_CHECKPOINT_PATH']=str(root/'checkpoint.json')
            script="""import json,sys;sys.path.insert(0,sys.argv[1]);import cgpt_approval_bridge_server as b
scope={'workspace':'/fixture','changeId':'target','runIds':['target-run'],'ids':['target-run'],'sharedIdentityIds':[]}
result=b.diagnostic_terminal_erasure_bundle({'action':'diagnose','transport':'owner-local-v1','scope':scope})
print(json.dumps({'ids':result['scope']['ids'],'root_count':len(result['roots'])}))"""
            before=store.read_bytes()
            result=subprocess.run(['python3','-B','-c',script,str(broker)],env=env,text=True,capture_output=True,check=True)
            self.assertEqual(json.loads(result.stdout)['ids'],['target-run'])
            self.assertEqual(store.read_bytes(),before)
            self.assertEqual(sorted(p.name for p in root.iterdir()),['approvals.json'])


if __name__ == '__main__':
    unittest.main()
