import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import time
import unittest
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'src'))
import cgpt_approval_bridge_server as bridge


@contextmanager
def delayed_controller(delay, status, payload):
    observed = []

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            observed.append(body['approval']['requestId'])
            time.sleep(delay)
            raw = json.dumps(payload).encode()
            try:
                self.send_response(status)
                self.send_header('Content-Length', str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)
            except (BrokenPipeError, ConnectionResetError):
                pass  # The timeout case intentionally closes its client first.

        def log_message(self, *args):
            return

    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield 'http://127.0.0.1:' + str(server.server_port), observed
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


class NotificationAdmissionTimeoutTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='cab-notification-timeout-')
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        env = patch.dict(os.environ, {
            'CGPT_APPROVAL_STORE': str(root / 'approvals.json'),
            'CGPT_APPROVAL_JOURNAL': str(root / 'events.ndjson'),
            'CGPT_JOURNAL_CHECKPOINT_PATH': str(root / 'checkpoint.json'),
        }, clear=True)
        env.start()
        self.addCleanup(env.stop)
        self.item = {'approval_id': 'approval-slow', 'requestId': 'request-slow',
                     'change_id': 'slow-admission', 'run_id': 'run-slow',
                     'status': 'PENDING', 'created_at': '2026-11-05T00:00:00Z',
                     'expires_at': '2099-01-01T00:00:00Z', 'files': [], 'commands': [],
                     'notification_status': 'FAILED', 'notification_attempts': 0}
        bridge.save_store(bridge.store_path(), {'approvals': {'approval-slow': self.item}})
        bridge.ensure_created_event(self.item)

    def deliver(self, delay, status, body, timeout=None):
        with delayed_controller(delay, status, body) as (url, requests):
            with patch.dict(os.environ, {'CGPT_CONTROLLER_URL': url}):
                if timeout is None:
                    delivered = bridge.maybe_notify_controller(self.item)
                else:
                    with patch.object(bridge, 'CONTROLLER_NOTIFICATION_TIMEOUT_SECONDS', timeout):
                        delivered = bridge.maybe_notify_controller(self.item)
            self.assertEqual(requests, ['request-slow'])
        stored = bridge.load_store(bridge.store_path())['approvals']['approval-slow']
        self.assertEqual(stored['status'], 'PENDING')
        self.assertEqual(stored['requestId'], 'request-slow')
        self.assertNotIn('decision', stored)
        return delivered, stored

    def test_ack_after_former_two_second_deadline_is_persisted(self):
        delivered, stored = self.deliver(2.25, 202, {'status': 'PENDING'})
        self.assertTrue(delivered)
        self.assertEqual(stored['notification_status'], 'DELIVERED')
        self.assertEqual(stored['notification_attempts'], 1)
        self.assertNotIn('notification_diagnostic', stored)

    def test_delayed_refusal_remains_visible_without_delivery(self):
        delivered, stored = self.deliver(2.25, 503, {'error': 'native-validation-evidence-unavailable', 'private': 'ignored'})
        self.assertFalse(delivered)
        self.assertEqual(stored['notification_status'], 'FAILED')
        self.assertEqual(stored['notification_diagnostic'], {'http_status': 503, 'error_code': 'native-validation-evidence-unavailable'})
        self.assertNotIn('private', json.dumps(stored))

    def test_expired_transport_deadline_does_not_create_a_decision(self):
        delivered, stored = self.deliver(0.2, 202, {'status': 'PENDING'}, timeout=0.05)
        self.assertFalse(delivered)
        self.assertEqual(stored['notification_status'], 'FAILED')
        self.assertEqual(stored['notification_attempts'], 1)
        self.assertNotIn('notification_diagnostic', stored)
        self.assertTrue(stored['notification_next_retry_at'])

    def test_notification_timeout_fits_inside_existing_lease(self):
        self.assertEqual(bridge.CONTROLLER_NOTIFICATION_TIMEOUT_SECONDS, 10)
        self.assertLess(bridge.CONTROLLER_NOTIFICATION_TIMEOUT_SECONDS, bridge.NOTIFICATION_LEASE_SECONDS)
        self.assertEqual(bridge.CONTROLLER_HTTP_TIMEOUT_SECONDS, 2)

    def test_decision_read_keeps_short_timeout(self):
        with patch.object(bridge.request, 'urlopen', side_effect=TimeoutError) as opened:
            self.assertIsNone(bridge.controller_decision(self.item))
        self.assertEqual(opened.call_args.kwargs['timeout'], 2)


if __name__ == '__main__':
    unittest.main()
