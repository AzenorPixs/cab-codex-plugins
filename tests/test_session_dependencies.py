import importlib.util
import base64
import hashlib
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
from contextlib import contextmanager
import select
import socket
import socketserver
import struct
import sqlite3
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("cab_session_dependencies", ROOT / "plugins/cab-approval-bridge/scripts/cab_session_dependencies.py")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def fake_websocket(connection, handler):
    """Synthetic local server, preserving the native WebSocket framing."""
    connection.settimeout(10)
    headers=b''
    while not headers.endswith(b'\r\n\r\n'):
        part=connection.recv(1)
        if not part:raise RuntimeError('handshake EOF')
        headers+=part
        if len(headers)>16384:raise RuntimeError('handshake too large')
    key=next(line.split(b':',1)[1].strip() for line in headers.split(b'\r\n') if line.lower().startswith(b'sec-websocket-key:'))
    accept=base64.b64encode(hashlib.sha1(key+b'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest())
    connection.sendall(b'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+b'\r\n\r\n')
    def take(size):
        data=b''
        while len(data)<size:
            block=connection.recv(size-len(data))
            if not block:raise EOFError()
            data+=block
        return data
    while True:
        try:head=take(2)
        except EOFError:return
        opcode=head[0]&15;length=head[1]&127
        if length==126:length=struct.unpack('!H',take(2))[0]
        elif length==127:length=struct.unpack('!Q',take(8))[0]
        if not head[1]&128:raise RuntimeError('unmasked client frame')
        mask=take(4);raw=take(length);payload=bytes(value^mask[i%4] for i,value in enumerate(raw))
        if opcode==8:return
        if opcode!=1:continue
        reply=handler(json.loads(payload))
        if reply is None:continue
        if reply == b'oversize':
            connection.sendall(bytes([0x81,127])+struct.pack('!Q',1024*1024+1));return
        data=json.dumps(reply).encode();size=len(data)
        prefix=(bytes([0x81,size]) if size<126 else bytes([0x81,126])+struct.pack('!H',size)
                if size<=65535 else bytes([0x81,127])+struct.pack('!Q',size))
        connection.sendall(prefix+data)


class DependencyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.base = Path(self.temp.name)
        self.project = self.base / "project"
        self.other = self.base / "other"
        self.project.mkdir()
        self.other.mkdir()
        self.store = MODULE.DependencyStore(self.base / "store")
        self.store.register(self.project, "sender", "run1", "direct")
        self.store.register(self.project, "receiver", "run2", "piloted")

    def tearDown(self):
        self.store.close()
        self.temp.cleanup()

    def test_group_mode_and_legacy_database_remain_usable(self):
        directory=self.base/'store';database=directory/'dependencies.sqlite3';marker=directory/'store.enabled'
        self.assertEqual(directory.stat().st_mode&0o777,0o770)
        self.assertEqual(database.stat().st_mode&0o777,0o770)
        self.assertEqual(marker.stat().st_mode&0o777,0o770)
        self.store.close();directory.chmod(0o2770);database.chmod(0o600);marker.chmod(0o600)
        self.store=MODULE.DependencyStore(directory)
        self.assertEqual(self.store.db.execute('SELECT count(*) FROM sessions').fetchone()[0],2)

    def test_persistence_dedup_ack_and_project_isolation(self):
        s = self.store
        s.register(self.other, "receiver", "run2", "direct")
        s.subscribe(self.project, "receiver", "run2", "dep1", "task", "change/1.2", "criterion1")
        s.subscribe(self.other, "receiver", "run2", "dep1", "task", "change/1.2", "criterion1")
        result = s.publish(self.project, "sender", "run1", "notice1", "task", "change/1.2", "openspec/changes/change/tasks.md")
        self.assertEqual(result["recipients"], 1)
        routes=s.outbox(self.project,'sender','run1','notice1')['recipients']
        self.assertEqual([(r['recipient_session'],r['recipient_run']) for r in routes],[('receiver','run2')])
        self.assertNotIn('criterion1',json.dumps(routes))
        with self.assertRaisesRegex(MODULE.CoordinationError,'notice-owner-mismatch'):
            s.outbox(self.project,'receiver','run2','notice1')
        self.assertEqual(result["native_notification"], "unavailable")
        s.publish(self.project, "sender", "run1", "notice1", "task", "change/1.2", "openspec/changes/change/tasks.md")
        self.assertEqual(len(s.inbox(self.project, "receiver", "run2")["notices"]), 1)
        self.assertEqual(s.inbox(self.other, "receiver", "run2")["notices"], [])
        with self.assertRaisesRegex(MODULE.CoordinationError, "notice-conflict"):
            s.publish(self.project, "sender", "run1", "notice1", "task", "change/1.2", "different.md")
        ack = s.acknowledge(self.project, "receiver", "run2", "dep1", "notice1")
        self.assertFalse(ack["dependency_verified"])
        s.close()
        self.store = MODULE.DependencyStore(self.base / "store")
        self.assertEqual(self.store.inbox(self.project, "receiver", "run2")["notices"][0]["acknowledged"], 1)

    def test_proof_digest_is_preserved_and_conflicting_reuse_is_rejected(self):
        s = self.store
        s.subscribe(self.project, 'receiver', 'run2', 'dep', 'change', 'change', 'done')
        digest = 'a' * 64
        s.publish(self.project, 'sender', 'run1', 'note', 'change', 'change', 'proof.md', digest)
        notice = s.inbox(self.project, 'receiver', 'run2')['notices'][0]
        self.assertEqual(notice['proof_sha256'], digest)
        self.assertTrue(notice['created_at'])
        with self.assertRaisesRegex(MODULE.CoordinationError, 'notice-conflict'):
            s.publish(self.project, 'sender', 'run1', 'note', 'change', 'change', 'proof.md', 'b' * 64)
        with self.assertRaisesRegex(MODULE.CoordinationError, 'proof-digest-invalid'):
            s.publish(self.project, 'sender', 'run1', 'other', 'change', 'change', 'proof.md', 'invalid')

    def test_late_subscription_and_no_implicit_resume(self):
        s = self.store
        s.publish(self.project, "sender", "run1", "notice2", "capability", "qualified-api", "proof.json")
        s.subscribe(self.project, "receiver", "run2", "dep2", "capability", "qualified-api", "integration")
        notices = s.inbox(self.project, "receiver", "run2")["notices"]
        self.assertEqual(len(notices), 1)
        self.assertEqual(notices[0]["acknowledged"], 0)
        self.assertEqual(s.db.execute("SELECT mode FROM sessions WHERE session='receiver'").fetchone()[0], "piloted")

    def test_conflict_and_rejection_leave_state_unchanged(self):
        s = self.store
        s.subscribe(self.project, "receiver", "run2", "dep", "change", "dependency", "done")
        with self.assertRaisesRegex(MODULE.CoordinationError, "dependency-conflict"):
            s.subscribe(self.project, "receiver", "run2", "dep", "change", "dependency", "other")
        with self.assertRaises(MODULE.CoordinationError):
            s.publish(self.project, "sender", "run1", "notice", "change", "dependency", "../secrets")
        with self.assertRaisesRegex(MODULE.CoordinationError, "task-subject-invalid"):
            s.subscribe(self.project, "receiver", "run2", "task", "task", "1.2", "done")
        self.assertEqual(s.inbox(self.project, "receiver", "run2")["notices"], [])
        with self.assertRaisesRegex(MODULE.CoordinationError, "notice-not-found"):
            s.acknowledge(self.project, "receiver", "run2", "dep", "unknown")

    def test_batch_code_requires_unambiguous_project_registry_entry(self):
        s = self.store
        with self.assertRaisesRegex(MODULE.CoordinationError, "batch-code-unverified"):
            s.subscribe(self.project, "receiver", "run2", "dep", "task", "dependency/1.2", "done", "CO01")
        registry = self.project / 'openspec/BATCH_CODES.md'
        registry.parent.mkdir()
        registry.write_text('| CO01 | dependency | source |\n', encoding='utf-8')
        s.subscribe(self.project, "receiver", "run2", "dep", "task", "dependency/1.2", "done", "CO01")
        s.subscribe(self.project, "receiver", "run2", "cap", "capability", "ready", "done", "CO01", "dependency")
        with self.assertRaisesRegex(MODULE.CoordinationError, "batch-code-unverified"):
            s.subscribe(self.project, "receiver", "run2", "cap2", "capability", "ready", "done", "CO01")
        registry.write_text('| CO01 | dependency | source |\n| CO01 | other | source |\n', encoding='utf-8')
        with self.assertRaisesRegex(MODULE.CoordinationError, "batch-code-unverified"):
            s.subscribe(self.project, "receiver", "run2", "other", "change", "dependency", "done", "CO01")

    def test_storage_rejects_nonprivate_directory_and_symlink(self):
        public = self.base / 'public'
        public.mkdir(mode=0o755)
        public.chmod(0o755)
        with self.assertRaisesRegex(MODULE.CoordinationError, 'storage-not-private'):
            MODULE.DependencyStore(public)
        alias = self.base / 'alias'
        alias.symlink_to(self.base / 'store', target_is_directory=True)
        with self.assertRaisesRegex(MODULE.CoordinationError, 'storage-not-private'):
            MODULE.DependencyStore(alias)

    def test_additive_upgrade_keeps_legacy_data_without_inventing_time(self):
        directory = self.base / 'legacy'
        directory.mkdir(mode=0o700)
        path = directory / 'dependencies.sqlite3'
        db = sqlite3.connect(path)
        path.chmod(0o600)
        db.executescript('''
          CREATE TABLE subscriptions(project TEXT,session TEXT,run TEXT,dependency_id TEXT,
            kind TEXT,subject TEXT,criterion TEXT,batch_code TEXT,PRIMARY KEY(project,session,run,dependency_id));
          CREATE TABLE notices(project TEXT,notice_id TEXT,sender_session TEXT,sender_run TEXT,
            kind TEXT,subject TEXT,proof TEXT,fingerprint TEXT,PRIMARY KEY(project,notice_id));
          INSERT INTO notices VALUES('p','n','s','r','change','c','proof','digest');
        ''')
        db.close()
        legacy = MODULE.DependencyStore(directory)
        try:
            row = legacy.db.execute("SELECT proof,created_at FROM notices WHERE notice_id='n'").fetchone()
            self.assertEqual(tuple(row), ('proof', None))
            self.assertIn('batch_change', {row['name'] for row in legacy.db.execute('PRAGMA table_info(subscriptions)')})
        finally:
            legacy.close()

    def test_concurrent_publish_deduplicates(self):
        self.store.subscribe(self.project, "receiver", "run2", "dep", "change", "dep-change", "done")
        barrier = threading.Barrier(2)
        failures = []
        def worker():
            client = MODULE.DependencyStore(self.base / "store")
            try:
                barrier.wait()
                client.publish(self.project, "sender", "run1", "same", "change", "dep-change", "proof.md")
            except Exception as exc:
                failures.append(exc)
            finally:
                client.close()
        threads = [threading.Thread(target=worker) for _ in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        self.assertEqual(failures, [])
        self.assertEqual(len(self.store.inbox(self.project, "receiver", "run2")["notices"]), 1)

    def test_concurrent_distinct_notices_are_all_retained(self):
        self.store.subscribe(self.project, 'receiver', 'run2', 'dep', 'change', 'dep-change', 'done')
        barrier = threading.Barrier(4)
        failures = []
        def worker(index):
            client = MODULE.DependencyStore(self.base / 'store')
            try:
                barrier.wait()
                client.publish(self.project, 'sender', 'run1', 'notice' + str(index), 'change', 'dep-change', 'proof.md')
            except Exception as exc:
                failures.append(exc)
            finally:
                client.close()
        threads = [threading.Thread(target=worker, args=(index,)) for index in range(4)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        self.assertEqual(failures, [])
        self.assertEqual(len(self.store.inbox(self.project, 'receiver', 'run2')['notices']), 4)

    def test_failed_fanout_rolls_back_notice(self):
        s = self.store
        s.subscribe(self.project, "receiver", "run2", "dep", "change", "dep-change", "done")
        s.db.execute("CREATE TRIGGER fail_inbox BEFORE INSERT ON inbox BEGIN SELECT RAISE(ABORT, 'failure'); END")
        with self.assertRaises(Exception):
            s.publish(self.project, "sender", "run1", "failed", "change", "dep-change", "proof.md")
        self.assertEqual(s.db.execute("SELECT count(*) FROM notices").fetchone()[0], 0)

    def test_cli_reports_native_transport_unavailable(self):
        script = ROOT / "plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-dependencies.py"
        result = subprocess.run([sys.executable, "-B", str(script), "inbox", "--store", str(self.base / "store"),
                                 "--project", str(self.project), "--session", "receiver", "--run", "run2"],
                                env=dict(os.environ, CODEX_THREAD_ID='receiver'), check=True, capture_output=True, text=True)
        self.assertEqual(json.loads(result.stdout), {"native_notification": "unavailable", "notices": []})
        rejected = subprocess.run([sys.executable, '-B', str(script), 'inbox', '--store', str(self.base / 'store'),
                                   '--project', str(self.project), '--session', 'receiver', '--run', 'run2'],
                                  env=dict(os.environ, CODEX_THREAD_ID='different'), capture_output=True, text=True)
        self.assertNotEqual(rejected.returncode, 0)
        self.assertEqual(json.loads(rejected.stderr)['error'], 'coordination-native-session-mismatch')

    def test_default_runtime_store_is_shared_for_project_clients(self):
        script = ROOT / "plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-dependencies.py"
        env = dict(os.environ, OC_Codex_RUNTIME_STATE_ROOT=str(self.base / "runtime"))
        def call(action, session, run, *extra):
            result = subprocess.run([sys.executable, "-B", str(script), action, "--project", str(self.project),
                                     "--session", session, "--run", run, *extra], env=dict(env, CODEX_THREAD_ID=session),
                                    check=True, capture_output=True, text=True)
            return json.loads(result.stdout)
        call("register", "one", "run1", "--mode", "direct")
        call("register", "two", "run2", "--mode", "piloted")
        call("register", "three", "run3", "--mode", "direct")
        self.assertEqual(call("state", "two", "run2", "--state", "paused", "--generation", "1")["status"], "paused")
        call("subscribe", "two", "run2", "--dependency-id", "dep", "--kind", "change",
             "--subject", "change", "--criterion", "ready")
        call("subscribe", "three", "run3", "--dependency-id", "dep", "--kind", "change",
             "--subject", "change", "--criterion", "ready")
        call("publish", "one", "run1", "--notice-id", "note", "--kind", "change",
             "--subject", "change", "--proof", "proof.md")
        self.assertEqual(len(call("inbox", "two", "run2")["notices"]), 1)
        self.assertEqual(len(call("inbox", "three", "run3")["notices"]), 1)
        call('ack', 'three', 'run3', '--dependency-id', 'dep', '--notice-id', 'note')
        self.assertEqual(call('inbox', 'two', 'run2')['notices'][0]['acknowledged'], 0)

    def test_batch_paginates_paused_recipients_without_native_effect(self):
        root=self.base/'batch-runtime';store=MODULE.DependencyStore(root/'cab-approval-bridge/dependencies')
        self.addCleanup(store.close)
        store.register(self.project,'sender','run1','direct')
        for i in range(5):
            session='recipient'+str(i);run='run'+str(i+2)
            store.register(self.project,session,run,'direct')
            store.subscribe(self.project,session,run,'dep','change','change','done')
            store.set_session_state(self.project,session,run,'paused',1)
        store.publish(self.project,'sender','run1','note','change','change','proof.md')
        script=ROOT/'plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-dependencies.py'
        env=dict(os.environ,CODEX_THREAD_ID='sender',OC_Codex_RUNTIME_STATE_ROOT=str(root))
        seen=[]
        for offset in (0,2,4):
            result=subprocess.run([sys.executable,'-B',str(script),'notify-all','--project',str(self.project),
                '--session','sender','--run','run1','--notice-id','note','--controller-url','http://127.0.0.1:1',
                '--codex-socket','/unavailable','--offset',str(offset),'--limit','2'],
                env=env,capture_output=True,text=True,timeout=10,check=True)
            body=json.loads(result.stdout);seen.extend(body['recipients'])
            self.assertEqual(body['next_offset'],None if offset==4 else offset+2)
        self.assertEqual(len(seen),5)
        self.assertTrue(all(r['status']=='waiting' and r['reason']=='recipient-paused' for r in seen))

    def test_batch_without_native_socket_keeps_notice_in_mailbox(self):
        root=self.base/'offline-runtime';store=MODULE.DependencyStore(root/'cab-approval-bridge/dependencies')
        self.addCleanup(store.close)
        store.register(self.project,'sender','run1','direct');store.register(self.project,'receiver','run2','direct')
        store.subscribe(self.project,'receiver','run2','dep','change','change','done')
        store.set_session_state(self.project,'receiver','run2','active',1)
        store.publish(self.project,'sender','run1','note','change','change','proof.md')
        script=ROOT/'plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-dependencies.py'
        result=subprocess.run([sys.executable,'-B',str(script),'notify-all','--project',str(self.project),
            '--session','sender','--run','run1','--notice-id','note'],
            env=dict(os.environ,CODEX_THREAD_ID='sender',OC_Codex_RUNTIME_STATE_ROOT=str(root)),
            capture_output=True,text=True,timeout=10,check=True)
        item=json.loads(result.stdout)['recipients'][0]
        self.assertEqual((item['status'],item['reason']),('waiting','native-transport-unavailable'))
        self.assertEqual(len(store.inbox(self.project,'receiver','run2')['notices']),1)

    def test_delivery_intention_survives_restart_and_refuses_replay(self):
        s = self.store
        s.subscribe(self.project, "receiver", "run2", "dep", "change", "dep-change", "done")
        s.publish(self.project, "sender", "run1", "notice", "change", "dep-change", "proof.md")
        identity = (self.project, "receiver", "run2", "dep", "notice")
        with self.assertRaisesRegex(MODULE.CoordinationError, "session-not-active"):
            s.prepare_delivery(*identity, "attempt", "turn")
        s.set_session_state(self.project, "receiver", "run2", "active", 1)
        result = s.prepare_delivery(*identity, "attempt", "turn")
        self.assertFalse(result["native_effect_authorized"])
        s.record_delivery(*identity, "attempt", "unknown")
        s.close()
        self.store = MODULE.DependencyStore(self.base / "store")
        s = self.store
        self.assertEqual(s.prepare_delivery(*identity, "attempt", "turn")["status"], "unknown")
        with self.assertRaisesRegex(MODULE.CoordinationError, "delivery-conflict"):
            s.prepare_delivery(*identity, "other-attempt", "turn")
        with self.assertRaisesRegex(MODULE.CoordinationError, "delivery-proof-invalid"):
            s.record_delivery(*identity, "attempt", "accepted")
        s.record_delivery(*identity, "attempt", "accepted", {"id": "attempt", "result": {"turnId": "turn"}})
        with self.assertRaisesRegex(MODULE.CoordinationError, "terminal-conflict"):
            s.record_delivery(*identity, "attempt", "rejected")

    def test_explicit_pause_blocks_preparation_and_stale_resume(self):
        s = self.store
        s.subscribe(self.project, "receiver", "run2", "dep", "change", "dep-change", "done")
        s.publish(self.project, "sender", "run1", "notice", "change", "dep-change", "proof.md")
        s.set_session_state(self.project, "receiver", "run2", "active", 1)
        s.set_session_state(self.project, "receiver", "run2", "paused", 2)
        with self.assertRaisesRegex(MODULE.CoordinationError, "session-not-active"):
            s.prepare_delivery(self.project, "receiver", "run2", "dep", "notice", "attempt", "turn")
        with self.assertRaisesRegex(MODULE.CoordinationError, "session-state-stale"):
            s.set_session_state(self.project, "receiver", "run2", "active", 1)
        with self.assertRaisesRegex(MODULE.CoordinationError, 'resume-evidence-required'):
            s.set_session_state(self.project, 'receiver', 'run2', 'active', 3)
        self.assertEqual(s.set_session_state(self.project, 'receiver', 'run2', 'active', 3,
                                            resume_evidence='developer-message-1')['status'],'active')
        self.assertEqual(len(s.inbox(self.project, "receiver", "run2")["notices"]), 1)

    def test_local_gate_serializes_pause_with_inflight_admission(self):
        s = self.store
        s.set_session_state(self.project, 'receiver', 'run2', 'active', 1)
        with s.local_delivery_barrier(self.project, 'receiver', 'run2', 'turn') as allowed:
            self.assertTrue(allowed)
            with self.assertRaisesRegex(MODULE.CoordinationError, 'session-busy'):
                s.set_session_state(self.project, 'receiver', 'run2', 'paused', 2)
            with self.assertRaisesRegex(MODULE.CoordinationError, 'session-busy'):
                s.close_session(self.project, 'receiver', 'run2', 'receipt')
        s.set_session_state(self.project, 'receiver', 'run2', 'paused', 2)
        with s.local_delivery_barrier(self.project, 'receiver', 'run2', 'turn') as allowed:
            self.assertFalse(allowed)

    def test_pilot_gate_requires_exact_controller_authority(self):
        s = self.store
        s.set_session_state(self.project, 'receiver', 'run2', 'active', 1)
        status = {'protocol': 'dependency-pause-gate-v1', 'workspace': str(self.project),
                  'runId': 'run2', 'version': 4, 'active': True, 'stateRoot': str(self.base)}
        with s.pilot_delivery_barrier(self.project, 'receiver', 'run2', 'turn', 4, lambda _: status, self.base) as allowed:
            self.assertTrue(allowed)
        status['active'] = False
        with s.pilot_delivery_barrier(self.project, 'receiver', 'run2', 'turn', 4, lambda _: status, self.base) as allowed:
            self.assertFalse(allowed)
        with self.assertRaises(MODULE.CoordinationError):
            MODULE.controller_admission('http://example.com:8788','run2')
        status['active'] = True
        status['workspace'] = str(self.other)
        with s.pilot_delivery_barrier(self.project, 'receiver', 'run2', 'turn', 4, lambda _: status, self.base) as allowed:
            self.assertFalse(allowed)
        status['workspace'] = str(self.project);status['stateRoot']=str(self.other)
        with s.pilot_delivery_barrier(self.project, 'receiver', 'run2', 'turn', 4, lambda _: status, self.base) as allowed:
            self.assertFalse(allowed)

    def test_piloted_notification_cli_uses_controller_and_native_fake(self):
        atelier_root = ROOT / '.cab-tests'
        atelier_root.mkdir(exist_ok=True)
        runtime_dir = tempfile.TemporaryDirectory(prefix='sg-', dir=atelier_root)
        self.addCleanup(runtime_dir.cleanup)
        root = Path(runtime_dir.name)
        store = MODULE.DependencyStore(root / 'cab-approval-bridge/dependencies')
        self.addCleanup(store.close)
        store.register(self.project, 'sender', 'sender-run', 'direct')
        store.set_session_state(self.project, 'sender', 'sender-run', 'active', 1)
        store.register(self.project, 'receiver', 'receiver-run', 'piloted')
        store.register(self.project, 'direct-receiver', 'direct-run', 'direct')
        store.subscribe(self.project, 'receiver', 'receiver-run', 'dep', 'change', 'change', 'done')
        store.subscribe(self.project, 'direct-receiver', 'direct-run', 'dep', 'change', 'change', 'done')
        store.publish(self.project, 'sender', 'sender-run', 'note', 'change', 'change', 'proof.md')
        store.set_session_state(self.project, 'receiver', 'receiver-run', 'active', 1)
        store.set_session_state(self.project, 'direct-receiver', 'direct-run', 'active', 1)
        project = str(self.project)
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_):
                pass
            def do_GET(self):
                payload = json.dumps({'protocol': 'dependency-pause-gate-v1', 'workspace': project,
                                      'runId': 'receiver-run', 'version': 4, 'active': True, 'stateRoot': str(root)}).encode()
                self.send_response(200); self.send_header('Content-Length', str(len(payload))); self.end_headers()
                self.wfile.write(payload)
        controller = HTTPServer(('127.0.0.1', 0), Handler)
        controller.timeout=10
        self.addCleanup(controller.server_close)
        controller_thread = threading.Thread(target=lambda:[controller.handle_request() for _ in range(2)])
        controller_thread.start()
        sgs_dir = root / 'cab-approval-bridge/sgs'; sgs_dir.mkdir(mode=0o700)
        class SGSHandler(BaseHTTPRequestHandler):
            def log_message(self, *_):
                pass
            def do_GET(self):
                payload = b'{"status":"VERIFIED"}'
                self.send_response(200); self.send_header('Content-Length', str(len(payload))); self.end_headers()
                self.wfile.write(payload)
        sgs = socketserver.UnixStreamServer(str(sgs_dir / 'sgs.sock'), SGSHandler)
        sgs.timeout=10
        (sgs_dir / 'sgs.sock').chmod(0o600)
        self.addCleanup(sgs.server_close)
        sgs_thread = threading.Thread(target=lambda:[sgs.handle_request() for _ in range(5)]); sgs_thread.start()
        atelier = ROOT / '.cab-tests/coordinate-project-coding-sessions/scm-direct'
        atelier.mkdir(parents=True, exist_ok=True)
        short_dir = tempfile.TemporaryDirectory(prefix='px-', dir=atelier)
        self.addCleanup(short_dir.cleanup)
        path = Path(short_dir.name) / 's.sock'
        server = socket.socket(socket.AF_UNIX); self.addCleanup(server.close)
        server.bind(str(path)); path.chmod(0o600); server.listen(2); server.settimeout(10)
        methods, errors = [], []
        def respond(message):
            method=message.get('method')
            if method=='initialize':return {'id':message['id'],'result':{}}
            if method=='thread/read':
                methods.append(method)
                return {'id':message['id'],'result':{'thread':{'id':message['params']['threadId'],'cwd':project,
                    'canAcceptDirectInput':True,'status':{'type':'active','activeFlags':[]}}}}
            if method=='turn/steer':
                methods.append(method);return {'id':message['id'],'result':{'turnId':message['params']['expectedTurnId']}}
            return None
        def serve():
            try:
                for _ in range(4):
                    connection, _ = server.accept()
                    with connection:fake_websocket(connection,respond)
            except Exception as exc:
                errors.append(exc)
        native_thread = threading.Thread(target=serve); native_thread.start()
        script = ROOT / 'plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-dependencies.py'
        env = dict(os.environ, CODEX_THREAD_ID='sender', OC_Codex_RUNTIME_STATE_ROOT=str(root))
        result = subprocess.run([sys.executable, '-B', str(script), 'notify-piloted', '--project', project,
            '--session', 'sender', '--run', 'sender-run', '--recipient-session', 'receiver', '--recipient-run', 'receiver-run',
            '--dependency-id', 'dep', '--notice-id', 'note', '--attempt-id', 'attempt', '--turn-id', 'turn',
            '--reservation-version', '4', '--controller-url', f'http://127.0.0.1:{controller.server_port}',
            '--codex-socket', str(path)], env=env, capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)['status'], 'accepted')
        direct=subprocess.run([sys.executable, '-B', str(script), 'notify-direct', '--project', project,
            '--session', 'sender', '--run', 'sender-run', '--recipient-session', 'direct-receiver', '--recipient-run', 'direct-run',
            '--dependency-id', 'dep', '--notice-id', 'note', '--attempt-id', 'attempt2', '--turn-id', 'turn2',
            '--controller-url', f'http://127.0.0.1:{controller.server_port}', '--codex-socket', str(path)], env=env, capture_output=True, text=True, timeout=15)
        native_thread.join(timeout=10); controller_thread.join(timeout=10)
        self.assertEqual(direct.returncode,0,direct.stderr);self.assertEqual(json.loads(direct.stdout)['status'],'accepted')
        self.assertEqual(methods, ['thread/read', 'turn/steer','thread/read','turn/steer']); self.assertEqual(errors, [])
        paused=subprocess.run([sys.executable,'-B',str(script),'state','--project',project,'--session','direct-receiver',
            '--run','direct-run','--state','paused','--generation','2'],
            env=dict(env,CODEX_THREAD_ID='direct-receiver'),capture_output=True,text=True,timeout=10)
        self.assertEqual(paused.returncode,0,paused.stderr)
        second=subprocess.run([sys.executable,'-B',str(script),'publish','--project',project,'--session','sender',
            '--run','sender-run','--notice-id','note2','--kind','change','--subject','change','--proof','proof.md'],
            env=env,capture_output=True,text=True,timeout=10)
        self.assertEqual(second.returncode,0,second.stderr)
        blocked=subprocess.run([sys.executable,'-B',str(script),'notify-direct','--project',project,'--session','sender',
            '--run','sender-run','--recipient-session','direct-receiver','--recipient-run','direct-run','--dependency-id','dep',
            '--notice-id','note2','--attempt-id','attempt3','--turn-id','turn2','--controller-url',f'http://127.0.0.1:{controller.server_port}','--codex-socket',str(path)],
            env=env,capture_output=True,text=True,timeout=10)
        self.assertNotEqual(blocked.returncode,0)
        self.assertEqual(json.loads(blocked.stderr)['error'],'coordination-native-barrier-unavailable')
        sgs_thread.join(timeout=10);self.assertFalse(sgs_thread.is_alive())

    def test_scm_dependency_does_not_cause_pause(self):
        s = self.store
        s.register(self.project, "receiver", "run2", "piloted", "SCM")
        s.set_session_state(self.project, "receiver", "run2", "active", 1)
        with self.assertRaisesRegex(MODULE.CoordinationError, "dependency-pause-forbidden"):
            s.set_session_state(self.project, "receiver", "run2", "paused", 2, "dependency")
        self.assertEqual(s.set_session_state(self.project, "receiver", "run2", "paused", 2, "explicit")["status"], "paused")
        with self.assertRaisesRegex(MODULE.CoordinationError, "mandate-conflict"):
            s.register(self.project, "receiver", "run2", "piloted", "other")

    def test_non_scm_dependency_pause_requires_explicit_decision_reference(self):
        s=self.store
        s.register(self.project,'receiver','run2','piloted','other')
        s.set_session_state(self.project,'receiver','run2','active',1)
        with self.assertRaisesRegex(MODULE.CoordinationError,'pause-decision-required'):
            s.set_session_state(self.project,'receiver','run2','paused',2,'dependency')
        decision=s.record_dependency_decision(self.project,'receiver','run2','decision1','pause','developer-choice-1')
        self.assertFalse(decision['native_action'])
        self.assertEqual(s.set_session_state(self.project,'receiver','run2','paused',2,'dependency',
                                           decision_evidence='decision1')['status'],'paused')
        self.assertEqual(s.db.execute('SELECT count(*) FROM dependency_pause_decisions').fetchone()[0],1)

    def test_dependency_stop_choice_is_only_recorded_and_scm_is_excluded(self):
        s=self.store
        s.register(self.project,'receiver','run2','piloted','other')
        first=s.record_dependency_decision(self.project,'receiver','run2','d','stop','developer-message')
        self.assertEqual(first,{'status':'recorded','choice':'stop','native_action':False})
        decisions=s.decisions(self.project,'receiver','run2')['decisions']
        self.assertEqual(decisions[0]['decision_id'],'d');self.assertNotIn('developer-message',json.dumps(decisions))
        self.assertEqual(s.record_dependency_decision(self.project,'receiver','run2','d','stop','developer-message'),first)
        with self.assertRaisesRegex(MODULE.CoordinationError,'decision-conflict'):
            s.record_dependency_decision(self.project,'receiver','run2','d','pause','developer-message')
        s.register(self.project,'sender','run1','direct','SCM')
        with self.assertRaisesRegex(MODULE.CoordinationError,'choice-forbidden'):
            s.record_dependency_decision(self.project,'sender','run1','d','stop','developer-message')

    def test_targeted_close_preserves_peer_and_refuses_uncertain_delivery(self):
        s = self.store
        s.register(self.project, "peer", "run3", "direct")
        for session, run in (("receiver", "run2"), ("peer", "run3")):
            s.subscribe(self.project, session, run, "dep", "change", "dep-change", "done")
        s.publish(self.project, "sender", "run1", "first", "change", "dep-change", "proof.md")
        s.set_session_state(self.project, "receiver", "run2", "active", 1)
        keys = (self.project, "receiver", "run2", "dep", "first")
        s.prepare_delivery(*keys, "attempt", "turn")
        s.record_delivery(*keys, "attempt", "unknown")
        with self.assertRaisesRegex(MODULE.CoordinationError, "delivery-unresolved"):
            s.close_session(self.project, "receiver", "run2", "receipt")
        s.record_delivery(*keys, "attempt", "accepted", {"id": "attempt", "result": {"turnId": "turn"}})
        self.assertEqual(s.close_session(self.project, "receiver", "run2", "receipt")["status"], "closed")
        s.publish(self.project, "sender", "run1", "second", "change", "dep-change", "proof.md")
        self.assertEqual(s.inbox(self.project, "receiver", "run2")["notices"], [])
        self.assertEqual(len(s.inbox(self.project, "peer", "run3")["notices"]), 2)

    def test_peer_notice_retained_until_explicit_release_then_target_erased(self):
        s=self.store;s.register(self.project,'peer','run3','direct')
        for session,run in (('receiver','run2'),('peer','run3')):
            s.subscribe(self.project,session,run,'dep','change','change','done')
        s.publish(self.project,'sender','run1','note','change','change','proof.md')
        closed=s.close_session(self.project,'sender','run1','receipt')
        self.assertEqual((closed['status'],closed['peer_references']),('retained-for-peers',2))
        with self.assertRaisesRegex(MODULE.CoordinationError,'release-not-acknowledged'):
            s.release_notice(self.project,'receiver','run2','note','verified')
        s.acknowledge(self.project,'receiver','run2','dep','note')
        self.assertFalse(s.release_notice(self.project,'receiver','run2','note','verified')['duplicate'])
        self.assertTrue(s.release_notice(self.project,'receiver','run2','note','verified')['duplicate'])
        self.assertEqual(s.close_session(self.project,'sender','run1','receipt')['peer_references'],1)
        self.assertEqual(len(s.inbox(self.project,'peer','run3')['notices']),1)
        s.acknowledge(self.project,'peer','run3','dep','note')
        s.release_notice(self.project,'peer','run3','note','verified-peer')
        self.assertEqual(s.close_session(self.project,'sender','run1','receipt')['status'],'closed')
        self.assertTrue(s.close_session(self.project,'sender','run1','receipt')['duplicate'])
        self.assertIsNone(s.db.execute("SELECT 1 FROM sessions WHERE session='sender'").fetchone())
        self.assertIsNotNone(s.db.execute("SELECT 1 FROM sessions WHERE session='peer'").fetchone())
        with self.assertRaisesRegex(MODULE.CoordinationError,'notice-conflict'):
            s.publish(self.project,'peer','run3','note','change','change','proof.md')

    def test_released_notice_is_not_recreated_on_publication_retry(self):
        s=self.store;s.subscribe(self.project,'receiver','run2','dep','change','change','done')
        s.publish(self.project,'sender','run1','note','change','change','proof.md')
        s.acknowledge(self.project,'receiver','run2','dep','note')
        s.release_notice(self.project,'receiver','run2','note','verified')
        s.publish(self.project,'sender','run1','note','change','change','proof.md')
        self.assertEqual(s.inbox(self.project,'receiver','run2')['notices'],[])

    def test_recipient_cli_releases_only_its_acknowledged_copy(self):
        s=self.store;s.register(self.project,'peer','run3','direct')
        for session,run in (('receiver','run2'),('peer','run3')):
            s.subscribe(self.project,session,run,'dep','change','change','done')
        s.publish(self.project,'sender','run1','note','change','change','proof.md')
        s.acknowledge(self.project,'receiver','run2','dep','note')
        script=ROOT/'plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-dependencies.py'
        result=subprocess.run([sys.executable,'-B',str(script),'release-notice','--store',str(self.base/'store'),
            '--project',str(self.project),'--session','receiver','--run','run2','--notice-id','note','--release-evidence','review-id'],
            env=dict(os.environ,CODEX_THREAD_ID='receiver'),capture_output=True,text=True,timeout=10)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(json.loads(result.stdout)['status'],'released')
        self.assertEqual(s.inbox(self.project,'receiver','run2')['notices'],[])
        self.assertEqual(len(s.inbox(self.project,'peer','run3')['notices']),1)

    def test_cleanup_waits_for_wal_reader_without_touching_peer(self):
        s=self.store
        reader=sqlite3.connect(self.base/'store/dependencies.sqlite3',isolation_level=None)
        try:
            reader.execute('BEGIN');reader.execute('SELECT count(*) FROM sessions').fetchone()
            result=s.close_session(self.project,'sender','run1','receipt')
            self.assertEqual(result['status'],'cleanup-pending')
            self.assertEqual(s.db.execute("SELECT count(*) FROM sessions WHERE session='receiver'").fetchone()[0],1)
        finally:
            reader.execute('ROLLBACK');reader.close()
        result=s.close_session(self.project,'sender','run1','receipt')
        self.assertEqual(result['status'],'closed');self.assertTrue(result['disk_verified'])
        self.assertTrue(result['duplicate'])

    def test_cleanup_removes_target_identity_from_database_bytes(self):
        s=self.store;session='unique-session-erase-3281';run='unique-run-erase-3281'
        s.register(self.project,session,run,'direct')
        result=s.close_session(self.project,session,run,'receipt-erase')
        self.assertTrue(result['disk_verified'])
        data=(self.base/'store/dependencies.sqlite3').read_bytes()
        self.assertNotIn(session.encode(),data);self.assertNotIn(run.encode(),data)
        self.assertIsNotNone(s.db.execute("SELECT 1 FROM sessions WHERE session='receiver'").fetchone())

    def test_readonly_closure_guard_scopes_pending_and_detects_missing_store(self):
        root=self.base/'runtime-close'
        self.assertEqual(MODULE.check_close(self.project,'run2',root)['status'],'absent')
        s=MODULE.DependencyStore(root/'cab-approval-bridge/dependencies')
        s.register(self.project,'sender','run1','direct');s.register(self.project,'receiver','run2','piloted')
        s.subscribe(self.project,'receiver','run2','dep','change','change','done')
        s.publish(self.project,'sender','run1','note','change','change','proof.md')
        s.set_session_state(self.project,'receiver','run2','active',1)
        s.prepare_delivery(self.project,'receiver','run2','dep','note','attempt','turn')
        self.assertEqual(MODULE.check_close(self.project,'run2',root,'receiver'),{'status':'pending','pending':1})
        self.assertEqual(MODULE.check_close(self.project,'run1',root,'sender'),{'status':'pending','pending':1})
        self.assertEqual(MODULE.check_close(self.project,'other',root)['status'],'clear')
        s.record_delivery(self.project,'receiver','run2','dep','note','attempt','unknown')
        expected=MODULE.codex_steer_request('receiver','turn','note','attempt')['params']['input']
        def exchange(request):
            result=({'thread':{'id':'receiver','cwd':str(self.project)}} if request['method']=='thread/read' else
                    {'data':[{'turnId':'turn','item':{'id':'item','type':'userMessage','clientId':'attempt','content':expected}}],'nextCursor':None})
            return {'id':request['id'],'result':result}
        s.observe_uncertain_delivery(self.project,'receiver','run2','dep','note','attempt','turn',exchange)
        self.assertEqual(MODULE.check_close(self.project,'run2',root,'receiver')['status'],'clear')
        s.close()
        (root/'cab-approval-bridge/dependencies/dependencies.sqlite3').unlink()
        with self.assertRaisesRegex(MODULE.CoordinationError,'database-missing'):
            MODULE.check_close(self.project,'run2',root)

    def test_dispatch_unknown_never_replays_a_native_effect(self):
        s = self.store
        s.subscribe(self.project, "receiver", "run2", "dep", "change", "dep-change", "done")
        s.publish(self.project, "sender", "run1", "notice", "change", "dep-change", "proof.md")
        s.set_session_state(self.project, "receiver", "run2", "active", 1)
        @contextmanager
        def barrier(*_args):
            yield True
        calls = []
        def lost_response(*args):
            calls.append(args)
            raise TimeoutError("lost")
        keys = (self.project, "receiver", "run2", "dep", "notice", "attempt", "turn")
        with self.assertRaises(TimeoutError):
            s.dispatch(*keys, barrier, lost_response)
        with self.assertRaisesRegex(MODULE.CoordinationError, "not-replayable"):
            s.dispatch(*keys, barrier, lost_response)
        self.assertEqual(len(calls), 1)

    def test_uncertain_notification_is_observed_without_replay_or_fake_ack(self):
        s = self.store
        s.subscribe(self.project,'receiver','run2','dep','change','change','done')
        s.publish(self.project,'sender','run1','note','change','change','proof.md')
        s.set_session_state(self.project,'receiver','run2','active',1)
        keys=(self.project,'receiver','run2','dep','note')
        s.prepare_delivery(*keys,'attempt','turn');s.record_delivery(*keys,'attempt','unknown')
        expected=MODULE.codex_steer_request('receiver','turn','note','attempt')['params']['input']
        methods=[]
        def exchange(request):
            methods.append(request['method'])
            if request['method']=='thread/read':
                result={'thread':{'id':'receiver','cwd':str(self.project),'preview':'private'}}
            else:
                result={'data':[{'turnId':'turn','item':{'id':'item1','type':'userMessage',
                          'clientId':'attempt','content':expected}}], 'nextCursor':None}
            return {'id':request['id'],'result':result}
        result=s.observe_uncertain_delivery(*keys,'attempt','turn',exchange)
        self.assertEqual((result['status'],result['native_ack']),('observed','unknown'))
        route=s.outbox(self.project,'sender','run1','note')['recipients'][0]
        self.assertEqual(route['delivery_state'],'observed');self.assertEqual(route['observation_sha256'],result['proof_sha256'])
        self.assertEqual(methods,['thread/read','thread/items/list'])
        self.assertNotIn('private',json.dumps(result))
        self.assertEqual(s.db.execute("SELECT state FROM deliveries WHERE attempt_id='attempt'").fetchone()[0],'unknown')
        with self.assertRaisesRegex(MODULE.CoordinationError,'not-replayable'):
            @contextmanager
            def barrier(*_):
                yield True
            s.dispatch(*keys,'attempt','turn',barrier,lambda *_: self.fail('no replay'))
        def missing(request):
            result=({'thread':{'id':'receiver','cwd':str(self.project)}} if request['method']=='thread/read'
                    else {'data':[],'nextCursor':None})
            return {'id':request['id'],'result':result}
        with self.assertRaisesRegex(MODULE.CoordinationError,'observation-inconclusive'):
            MODULE.codex_observe_notice(self.project,'receiver','turn','note','attempt',missing)
        def conflict(request):
            result=({'thread':{'id':'receiver','cwd':str(self.project)}} if request['method']=='thread/read' else
                    {'data':[{'turnId':'turn','item':{'id':'item2','type':'userMessage','clientId':'attempt',
                              'content':[{'type':'text','text':'different'}]}}],'nextCursor':None})
            return {'id':request['id'],'result':result}
        with self.assertRaisesRegex(MODULE.CoordinationError,'observation-inconclusive'):
            MODULE.codex_observe_notice(self.project,'receiver','turn','note','attempt',conflict)
        self.assertTrue(s.observe_uncertain_delivery(*keys,'attempt','turn',lambda _:self.fail('no native reread'))['duplicate'])
        self.assertEqual(s.close_session(self.project,'receiver','run2','receipt')['status'],'closed')

    def test_dispatch_requires_native_barrier(self):
        self.store.subscribe(self.project,'receiver','run2','dep','change','change','done')
        self.store.publish(self.project,'sender','run1','notice','change','change','proof.md')
        @contextmanager
        def denied(*_args):
            yield False
        with self.assertRaisesRegex(MODULE.CoordinationError, "barrier-unavailable"):
            self.store.dispatch(self.project, "receiver", "run2", "dep", "notice", "attempt", "turn",
                                denied, lambda *_: self.fail("native effect must not run"))

    def test_only_prepared_intention_can_be_cancelled(self):
        s = self.store
        s.subscribe(self.project, 'receiver', 'run2', 'dep', 'change', 'change', 'done')
        s.publish(self.project, 'sender', 'run1', 'note', 'change', 'change', 'proof.md')
        s.set_session_state(self.project, 'receiver', 'run2', 'active', 1)
        keys = (self.project, 'receiver', 'run2', 'dep', 'note')
        s.prepare_delivery(*keys, 'attempt1', 'turn')
        self.assertEqual(s.cancel_prepared(*keys, 'attempt1')['status'], 'cancelled-no-effect')
        s.prepare_delivery(*keys, 'attempt2', 'turn')
        s.record_delivery(*keys, 'attempt2', 'unknown')
        with self.assertRaisesRegex(MODULE.CoordinationError, 'not-cancellable'):
            s.cancel_prepared(*keys, 'attempt2')

    def test_cli_cancels_only_producers_prepared_intention(self):
        s=self.store
        s.subscribe(self.project,'receiver','run2','dep','change','change','done')
        s.publish(self.project,'sender','run1','note','change','change','proof.md')
        s.set_session_state(self.project,'receiver','run2','active',1)
        s.prepare_delivery(self.project,'receiver','run2','dep','note','attempt','turn')
        script=ROOT/'plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-dependencies.py'
        result=subprocess.run([sys.executable,'-B',str(script),'cancel-prepared','--store',str(self.base/'store'),
            '--project',str(self.project),'--session','sender','--run','run1','--recipient-session','receiver',
            '--recipient-run','run2','--dependency-id','dep','--notice-id','note','--attempt-id','attempt'],
            env=dict(os.environ,CODEX_THREAD_ID='sender'),capture_output=True,text=True,timeout=10)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(json.loads(result.stdout)['status'],'cancelled-no-effect')

    def test_codex_request_is_correlated_and_only_contains_technical_notice(self):
        request = MODULE.codex_steer_request("thread", "turn", "notice", "attempt")
        self.assertEqual(request["method"], "turn/steer")
        self.assertEqual(request["params"]["threadId"], "thread")
        self.assertEqual(request["params"]["expectedTurnId"], "turn")
        self.assertEqual(request["params"]["clientUserMessageId"], "attempt")
        self.assertIn("Avis technique CAB notice", request["params"]["input"][0]["text"])
        self.assertEqual(MODULE.codex_steer_result({"id": "attempt", "result": {"turnId": "turn"}}, "attempt", "turn"), "accepted")
        self.assertEqual(MODULE.codex_steer_result({"id": "attempt", "result": {"turnId": "other"}}, "attempt", "turn"), "unknown")
        self.assertEqual(MODULE.codex_steer_result({"id": "attempt", "error": {"code": 1}}, "attempt", "turn"), "unknown")
        with self.assertRaises(MODULE.CoordinationError):
            MODULE.codex_steer_request("thread", "turn", "notice", "../attempt")

    def test_codex_simulated_dispatch_confirms_only_matching_turn(self):
        s = self.store
        s.subscribe(self.project, "receiver", "run2", "dep", "change", "change", "done")
        s.publish(self.project, "sender", "run1", "note", "change", "change", "proof.md")
        s.set_session_state(self.project, "receiver", "run2", "active", 1)
        @contextmanager
        def barrier(*_args):
            yield True
        captured = []
        def exchange(request):
            captured.append(request)
            return {"id": request["id"], "result": {"turnId": "turn"}}
        send = MODULE.codex_steer_sender("attempt", exchange)
        result = s.dispatch(self.project, "receiver", "run2", "dep", "note", "attempt", "turn", barrier, send)
        self.assertEqual(result, {"status": "accepted", "dependency_verified": False})
        self.assertEqual(len(captured), 1)
        self.assertEqual(captured[0]["params"]["expectedTurnId"], "turn")
        @contextmanager
        def denied(*_args):
            yield False
        duplicate=s.dispatch(self.project,'receiver','run2','dep','note','attempt','turn',denied,send)
        self.assertTrue(duplicate['duplicate']);self.assertEqual(len(captured),1)

    def test_one_native_notice_covers_multiple_criteria_for_same_recipient(self):
        s=self.store
        s.subscribe(self.project,'receiver','run2','dep1','change','change','criterion1')
        s.subscribe(self.project,'receiver','run2','dep2','change','change','criterion2')
        s.publish(self.project,'sender','run1','note','change','change','proof.md')
        s.set_session_state(self.project,'receiver','run2','active',1)
        @contextmanager
        def barrier(*_args):
            yield True
        calls=[]
        def send(*_args):
            calls.append(1);return {'id':'attempt','result':{'turnId':'turn'}}
        s.dispatch(self.project,'receiver','run2','dep1','note','attempt','turn',barrier,send)
        result=s.dispatch(self.project,'receiver','run2','dep2','note','attempt','turn',barrier,send)
        self.assertTrue(result['duplicate']);self.assertEqual(len(calls),1)
        routes=s.outbox(self.project,'sender','run1','note')['recipients']
        self.assertEqual([r['delivery_state'] for r in routes],['accepted','accepted'])
        self.assertEqual([r['delivery_dependency_id'] for r in routes],['dep1','dep1'])

    def test_native_sender_checks_project_and_active_flags_before_steer(self):
        calls = []
        thread = {'id': 'receiver', 'cwd': str(self.project), 'canAcceptDirectInput': True,
                  'status': {'type': 'active', 'activeFlags': []}, 'preview': 'private'}
        def exchange(request):
            calls.append(request['method'])
            if request['method'] == 'thread/read':
                return {'id': request['id'], 'result': {'thread': thread}}
            return {'id': request['id'], 'result': {'turnId': 'turn'}}
        sender = MODULE.codex_verified_sender(self.project, 'attempt', exchange)
        response = sender('receiver', 'turn', 'notice')
        self.assertEqual(MODULE.codex_steer_result(response, 'attempt', 'turn'), 'accepted')
        self.assertEqual(calls, ['thread/read', 'turn/steer'])
        thread['cwd'] = str(self.other)
        with self.assertRaisesRegex(MODULE.CoordinationError, 'project-mismatch'):
            sender('receiver', 'turn', 'notice')
        thread['cwd'] = str(self.project)
        thread['status']['activeFlags'] = ['waitingOnApproval']
        with self.assertRaisesRegex(MODULE.CoordinationError, 'thread-not-active'):
            sender('receiver', 'turn', 'notice')
        self.assertEqual(calls.count('turn/steer'), 1)

    def test_websocket_waits_for_initialize_and_correlates_response(self):
        path=self.base/'server.sock';server=socket.socket(socket.AF_UNIX);self.addCleanup(server.close)
        server.bind(str(path));path.chmod(0o600);server.listen(1);server.settimeout(10)
        methods=[];premature=[];errors=[]
        def serve():
            try:
                connection,_=server.accept()
                with connection:
                    def respond(message):
                        method=message.get('method');methods.append(method)
                        if method=='initialize':
                            premature.append(bool(select.select([connection],[],[],0.1)[0]))
                            return {'id':message['id'],'result':{}}
                        if method=='turn/steer':return {'id':message['id'],'result':{'turnId':'turn'}}
                    fake_websocket(connection,respond)
            except Exception as exc:errors.append(exc)
        thread=threading.Thread(target=serve);thread.start()
        request=MODULE.codex_steer_request('thread','turn','notice','attempt')
        alias=self.base/'alias.sock';alias.symlink_to(path)
        response=MODULE.codex_proxy_exchange(request,alias);thread.join(timeout=12)
        self.assertEqual(errors,[]);self.assertFalse(thread.is_alive());self.assertEqual(premature,[False])
        self.assertEqual(methods,['initialize','initialized','turn/steer'])
        self.assertEqual(MODULE.codex_steer_result(response,'attempt','turn'),'accepted')
        with self.assertRaises(ValueError):MODULE.decode_json('{"id":"a","id":"b"}')
        path.chmod(0o666);self.base.chmod(0o755)
        try:
            with self.assertRaisesRegex(MODULE.CoordinationError,'socket-invalid'):MODULE.codex_proxy_exchange(request,path)
        finally:self.base.chmod(0o700)

    def test_websocket_rejects_oversized_frame_before_payload(self):
        path=self.base/'large.sock';server=socket.socket(socket.AF_UNIX);self.addCleanup(server.close)
        server.bind(str(path));path.chmod(0o600);server.listen(1);server.settimeout(10)
        def serve():
            connection,_=server.accept()
            with connection:fake_websocket(connection,lambda _message:b'oversize')
        thread=threading.Thread(target=serve);thread.start()
        self.assertIsNone(MODULE.codex_proxy_exchange(MODULE.codex_steer_request('thread','turn','notice','attempt'),path))
        thread.join(timeout=12);self.assertFalse(thread.is_alive())

    def test_codex_websocket_against_isolated_fake_server(self):
        atelier = ROOT / '.cab-tests/coordinate-project-coding-sessions/scm-direct'
        atelier.mkdir(parents=True, exist_ok=True)
        short_dir = tempfile.TemporaryDirectory(prefix='px-', dir=atelier)
        self.addCleanup(short_dir.cleanup)
        path = Path(short_dir.name) / 's.sock'
        server = socket.socket(socket.AF_UNIX)
        self.addCleanup(server.close)
        server.bind(str(path))
        path.chmod(0o600)
        server.listen(1)
        server.settimeout(10)
        errors = []
        def serve():
            try:
                connection, _ = server.accept()
                def respond(message):
                    if message.get('method')=='initialize':return {'id':message['id'],'result':{}}
                    if message.get('method')=='turn/steer':return {'id':message['id'],'result':{'turnId':message['params']['expectedTurnId']}}
                with connection:fake_websocket(connection,respond)
            except Exception as exc:
                errors.append(exc)
        thread = threading.Thread(target=serve)
        thread.start()
        request = MODULE.codex_steer_request('thread', 'turn', 'notice', 'attempt')
        response = MODULE.codex_proxy_exchange(request, path)
        thread.join(timeout=12)
        self.assertFalse(thread.is_alive())
        self.assertEqual(errors, [])
        self.assertEqual(MODULE.codex_steer_result(response, 'attempt', 'turn'), 'accepted')

    def test_verified_sender_with_framed_fake_server(self):
        atelier = ROOT / '.cab-tests/coordinate-project-coding-sessions/scm-direct'
        atelier.mkdir(parents=True, exist_ok=True)
        short_dir = tempfile.TemporaryDirectory(prefix='px-', dir=atelier)
        self.addCleanup(short_dir.cleanup)
        path = Path(short_dir.name) / 's.sock'
        server = socket.socket(socket.AF_UNIX)
        self.addCleanup(server.close)
        server.bind(str(path))
        path.chmod(0o600)
        server.listen(2)
        server.settimeout(10)
        methods, errors = [], []
        def serve():
            try:
                for _ in range(2):
                    connection, _ = server.accept()
                    def respond(message):
                        method=message.get('method')
                        if method=='initialize':return {'id':message['id'],'result':{}}
                        if method=='thread/read':
                            methods.append(method);return {'id':message['id'],'result':{'thread':{
                                'id':'receiver','cwd':str(self.project),'canAcceptDirectInput':True,
                                'status':{'type':'active','activeFlags':[]},'preview':'private'}}}
                        if method=='turn/steer':
                            methods.append(method);return {'id':message['id'],'result':{'turnId':'turn'}}
                    with connection:fake_websocket(connection,respond)
            except Exception as exc:
                errors.append(exc)
        thread = threading.Thread(target=serve)
        thread.start()
        sender = MODULE.codex_verified_sender(self.project, 'attempt', lambda request: MODULE.codex_proxy_exchange(request, path))
        response = sender('receiver', 'turn', 'notice')
        thread.join(timeout=12)
        self.assertFalse(thread.is_alive())
        self.assertEqual(errors, [])
        self.assertEqual(methods, ['thread/read', 'turn/steer'])
        self.assertEqual(MODULE.codex_steer_result(response, 'attempt', 'turn'), 'accepted')

    def test_direct_release_verification_requires_matching_scope_digest(self):
        atelier = ROOT / '.cab-tests'
        atelier.mkdir(exist_ok=True)
        runtime = tempfile.TemporaryDirectory(prefix='sg-', dir=atelier)
        self.addCleanup(runtime.cleanup)
        directory = Path(runtime.name) / 'cab-approval-bridge/sgs'
        directory.mkdir(parents=True, mode=0o700)
        path = directory / 'sgs.sock'
        server = socket.socket(socket.AF_UNIX)
        self.addCleanup(server.close)
        server.bind(str(path))
        path.chmod(0o600)
        server.listen(1)
        def serve():
            connection, _ = server.accept()
            with connection, connection.makefile('rb') as stream:
                headers = []
                while True:
                    line = stream.readline()
                    if line in (b'\r\n', b''):
                        break
                    headers.append(line)
                if headers[0].startswith(b'GET /session-binding?'):
                    result=b'{"status":"VERIFIED"}'
                else:
                    length = int(next(h.split(b':', 1)[1] for h in headers if h.lower().startswith(b'content-length:')))
                    body = json.loads(stream.read(length))
                    identity = [socket.gethostname(), os.getuid(), str(self.project.resolve()), 'change', 'run', 'session', 'coder']
                    native = subprocess.run(['node', '-e', "const c=require('crypto');const v=JSON.parse(process.argv[1]);process.stdout.write(c.createHash('sha256').update(JSON.stringify(v)).digest('hex'))", json.dumps(identity)],
                                            check=True, capture_output=True, text=True)
                    self.assertEqual(body['scope']['bindingId'], 'codex-' + native.stdout)
                    digest = hashlib.sha256(MODULE.encoded(body['scope']).encode()).hexdigest()
                    if body['receipt_id'] == 'bad':
                        digest = '0' * 64
                    result = json.dumps({'status': 'RELEASE_VERIFIED', 'scope_digest': digest}).encode()
                connection.sendall(b'HTTP/1.0 200 OK\r\nContent-Length: ' + str(len(result)).encode() + b'\r\n\r\n' + result)
        thread = threading.Thread(target=serve)
        thread.start()
        result = MODULE.verify_direct_release(self.project, 'change', 'run', 'session', 'receipt', runtime.name)
        thread.join(timeout=5)
        self.assertFalse(thread.is_alive())
        self.assertEqual(result['status'], 'RELEASE_VERIFIED')
        target=MODULE.DependencyStore(Path(runtime.name)/'cab-approval-bridge/dependencies')
        self.addCleanup(target.close)
        target.register(self.project,'session','run','direct')
        thread = threading.Thread(target=serve);thread.start()
        self.assertEqual(target.close_direct_verified(self.project,'session','run','change','receipt',runtime.name)['status'],'closed')
        thread.join(timeout=5);self.assertFalse(thread.is_alive())
        thread = threading.Thread(target=serve)
        thread.start()
        with self.assertRaisesRegex(MODULE.CoordinationError, 'sgs-proof-invalid'):
            MODULE.verify_direct_release(self.project, 'change', 'run', 'session', 'bad', runtime.name)
        thread.join(timeout=5)
        self.assertFalse(thread.is_alive())
        thread=threading.Thread(target=serve);thread.start()
        script=ROOT/'plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-dependencies.py'
        result=subprocess.run([sys.executable,'-B',str(script),'close-direct','--project',str(self.project),
            '--session','session','--run','run','--change','change','--receipt-id','receipt'],
            env=dict(os.environ,CODEX_THREAD_ID='session',OC_Codex_RUNTIME_STATE_ROOT=runtime.name),
            capture_output=True,text=True,timeout=10)
        thread.join(timeout=5);self.assertFalse(thread.is_alive())
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(json.loads(result.stdout)['status'],'closed')
        thread=threading.Thread(target=serve);thread.start()
        self.assertEqual(target.reopen_direct_verified(self.project,'session','run',runtime.name)['status'],'reopened')
        thread.join(timeout=5);self.assertFalse(thread.is_alive())
        self.assertEqual(target.db.execute('SELECT receipt_id FROM session_closure_history').fetchone()[0],hashlib.sha256(b'receipt').hexdigest())
        self.assertEqual(target.db.execute('SELECT state FROM session_states WHERE session=?',('session',)).fetchone()[0],'paused')


if __name__ == "__main__":
    unittest.main()
