"""Qualification du vrai cycle stdin/EOF du broker sur un état synthétique."""
import json
import os
from pathlib import Path
import selectors
import subprocess
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
import cgpt_approval_bridge_server as bridge


class ErasureBrokerProcessTest(unittest.TestCase):
    def test_heartbeat_prepare_puis_eof_prepare_le_bundle_sans_effacer(self):
        with tempfile.TemporaryDirectory(prefix='cab-erasure-process-') as temporary:
            state=Path(temporary);control=state/'control';control.mkdir(mode=0o700)
            (control/'change-erasure.key').write_bytes(b'k'*32);(control/'change-erasure.key').chmod(0o600)
            scope={'workspace':'/fixture','changeId':'target','ownerId':'owner','runIds':['run-target'],
                   'ids':['target','run-target','approval-target'],'registrySequence':10}
            command={'protocol':'cab-change-erasure-v1','transactionId':'erasure-11111111-1111-1111-1111-111111111111',
                     'controlRoot':str(control),'scope':scope}
            signed={**command,'signature':bridge.erasure_control_signature(command,b'k'*32)}
            intent={**command,'phase':'STOPPING'}
            intent['signature']=bridge.erasure_control_signature(intent,b'k'*32)
            (control/'change-erasure.json').write_text(json.dumps(intent));(control/'change-erasure.json').chmod(0o600)
            approvals={}
            for name in ['target','peer']:
                approvals['approval-'+name]={'approval_id':'approval-'+name,'requestId':'request-'+name,
                  'change_id':name,'run_id':'run-'+name,'directory':'/fixture','status':'APPROVED',
                  'created_at':'2026-11-05T00:00:00Z','expires_at':'2099-01-01T00:00:00Z','files':[]}
            (state/'approvals.json').write_text(json.dumps({'schema_version':2,'approvals':approvals}))
            prepared=threading.Event()
            class Controller(BaseHTTPRequestHandler):
                def log_message(self,*args):
                    pass
                def reply(self,value):
                    raw=json.dumps(value).encode();self.send_response(200);self.send_header('Content-Type','application/json')
                    self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
                def do_GET(self):
                    self.reply({'version':bridge.SERVER_VERSION,'status':'ok'})
                def do_POST(self):
                    data=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
                    if self.path=='/broker/readiness':
                        if data.get('erasure_prepared')==command['transactionId']:
                            prepared.set()
                        self.reply({'accepted':True,'erasure_prepare':signed})
                    else:
                        self.reply({'accepted':True})
            controller=ThreadingHTTPServer(('127.0.0.1',0),Controller)
            thread=threading.Thread(target=controller.serve_forever,daemon=True);thread.start()
            env={'LANG':'C.UTF-8','PYTHONPATH':str(ROOT/'src'),'CGPT_APPROVAL_STORE':str(state/'approvals.json'),
                 'CGPT_APPROVAL_JOURNAL':str(state/'events.ndjson'),'CGPT_JOURNAL_CHECKPOINT_PATH':str(state/'checkpoint.json'),
                 'CGPT_BROKER_INSTANCE_LOCK':str(state/'broker.instance.lock'),'CGPT_AUTO_REMEDIATION_CB_STATE_PATH':str(state/'circuit.json'),
                 'CGPT_CONTROLLER_URL':'http://127.0.0.1:'+str(controller.server_port)}
            code='import sys,cgpt_approval_bridge_server as b; b.READINESS_PUBLISH_INTERVAL_SECONDS=0.05; sys.exit(b.main())'
            child=subprocess.Popen([sys.executable,'-B','-c',code],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=env,cwd=ROOT)
            try:
                child.stdin.write(json.dumps({'jsonrpc':'2.0','id':1,'method':'initialize'})+'\n');child.stdin.flush()
                with selectors.DefaultSelector() as selector:
                    selector.register(child.stdout,selectors.EVENT_READ)
                    self.assertTrue(selector.select(5),'initialisation MCP absente')
                    self.assertEqual(json.loads(child.stdout.readline())['id'],1)
                self.assertTrue(prepared.wait(8),'préparation signée non acquittée par heartbeat')
                child.stdin.close();child.stdin=None
                _,error=child.communicate(timeout=10)
                self.assertEqual(child.returncode,0,error)
                bundle=json.loads((control/'broker-erasure.json').read_text());signature=bundle.pop('signature')
                self.assertEqual(signature,bridge.erasure_control_signature(bundle,b'k'*32))
                self.assertEqual(bundle['brokerPid'],child.pid)
                # Le broker ne fait que préparer : seul le pilote hors ligne peut appliquer.
                self.assertIn('approval-target',json.loads((state/'approvals.json').read_text())['approvals'])
                journal=next(row['text'] for row in bundle['entries'] if row['path']==str(state/'events.ndjson'))
                self.assertNotIn('approval-target',journal);self.assertIn('approval-peer',journal)
                self.assertIn('BROKER_INSTANCE_STOPPED',journal)
            finally:
                if child.poll() is None:
                    child.kill()
                child.communicate()
                controller.shutdown();controller.server_close();thread.join(timeout=2)
