import json
import os
import sys
import tempfile
import unittest
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'src'))
import cgpt_approval_bridge_server as bridge

ACTION = 'RECONCILE_PENDING_APPROVALS'


class RemediationDeliveryResultTest(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.root = Path(self.stack.enter_context(tempfile.TemporaryDirectory(prefix='cab-delivery-result-')))
        self.stack.enter_context(patch.dict(os.environ, {
            'CGPT_CONTROLLER_URL': 'http://127.0.0.1:0',
            'CGPT_APPROVAL_STORE': str(self.root / 'approvals.json'),
            'CGPT_APPROVAL_JOURNAL': str(self.root / 'events.ndjson'),
            'CGPT_JOURNAL_CHECKPOINT_PATH': str(self.root / 'checkpoint.json'),
        }, clear=True))
        self.item = {
            'approval_id': 'approval-delivery', 'requestId': 'request-delivery',
            'change_id': 'change-delivery', 'status': 'PENDING',
            'created_at': '2026-11-05T00:00:00Z', 'expires_at': '2099-01-01T00:00:00Z',
            'title': 'Synthetic delivery', 'summary': 'Private fixture', 'files': [],
            'notification_status': 'FAILED', 'notification_attempts': 17,
            'notification_updated_at': '2026-11-05T00:00:01Z',
            'notification_next_retry_at': '', 'notification_lease_until': '',
            'notification_diagnostic': {'http_status': 503, 'error_code': 'broker-coordination-not-ready'},
        }
        bridge.save_store(bridge.store_path(), {'approvals': {self.item['approval_id']: self.item}})
        bridge.ensure_created_event(self.item)
        self.stack.enter_context(patch.object(bridge, 'controller_tcp_reachable', return_value=True))

    def update(self, **values):
        data = bridge.load_store(bridge.store_path())
        data['approvals'][self.item['approval_id']].update(values)
        bridge.save_store(bridge.store_path(), data)

    def execute(self, notify=False):
        with patch.object(bridge, 'controller_decision', return_value=None), patch.object(bridge, 'maybe_notify_controller', side_effect=notify if callable(notify) else lambda _: notify):
            return bridge.execute_reconcile_pending_approval(self.item['approval_id'])

    def controlled(self, notify=False, executor_result=None):
        with ExitStack() as stack:
            stack.enter_context(patch.object(bridge, 'evaluate_controlled_remediation', return_value={'state': 'ELIGIBLE', 'scope_key': 'approval-delivery:none'}))
            stack.enter_context(patch.object(bridge, 'controller_decision', return_value=None))
            stack.enter_context(patch.object(bridge, 'maybe_notify_controller', side_effect=notify if callable(notify) else lambda _: notify))
            if executor_result is not None:
                stack.enter_context(patch.object(bridge, 'execute_controlled_remediation', return_value=executor_result))
            return bridge.do_execute_controlled_remediation({'action_code': ACTION, 'approval_id': self.item['approval_id'], 'operator': 'fixture-owner', 'comment': 'bounded delivery qualification'})

    def test_failed_notification_is_not_reestablished(self):
        result = self.execute(False)
        self.assertEqual(result['outcome'], 'NOTIFICATION_NOT_REESTABLISHED')
        self.assertFalse(result['notification_reestablished'])
        self.assertFalse(result['notification_delivered'])
        self.assertEqual(result['notification_status'], 'FAILED')
        self.assertFalse(bridge.controlled_remediation_result_success(ACTION, result))
        self.assertEqual(result['notification_diagnostic'], self.item['notification_diagnostic'])
        self.assertEqual(result['notification_attempts'], 17)

    def test_no_lease_and_future_retry_is_not_reported_as_delivery(self):
        self.update(notification_next_retry_at='2090-01-01T00:00:00Z')
        before = bridge.load_store(bridge.store_path())
        with patch.object(bridge, 'controller_decision', return_value=None), patch.object(bridge, 'notify_controller') as notify:
            result = bridge.execute_reconcile_pending_approval(self.item['approval_id'])
        notify.assert_not_called()
        self.assertFalse(result['notification_reestablished'])
        self.assertEqual(bridge.load_store(bridge.store_path()), before)

    def test_ack_and_persisted_delivery_are_both_required(self):
        def delivered(_):
            self.update(notification_status='DELIVERED', notification_attempts=18)
            return True
        result = self.execute(delivered)
        self.assertEqual(result['outcome'], 'NOTIFICATION_REESTABLISHED')
        self.assertTrue(result['notification_reestablished'])
        self.assertTrue(result['notification_delivered'])
        self.assertTrue(bridge.controlled_remediation_result_success(ACTION, result))

    def test_ack_without_persisted_delivery_does_not_claim_success(self):
        result = self.execute(True)
        self.assertTrue(result['notification_delivered'])
        self.assertFalse(result['notification_reestablished'])
        self.assertFalse(bridge.controlled_remediation_result_success(ACTION, result))

    def test_concurrent_delivery_is_observed_without_causal_claim(self):
        def concurrent(_):
            self.update(notification_status='DELIVERED')
            return False
        result = self.execute(concurrent)
        self.assertEqual(result['outcome'], 'NOTIFICATION_ALREADY_DELIVERED')
        self.assertFalse(result['notification_delivered'])
        self.assertFalse(result['notification_reestablished'])
        self.assertTrue(result['notification_delivery_observed'])
        self.assertTrue(bridge.controlled_remediation_result_success(ACTION, result))

    def test_concurrent_terminal_preserves_its_actual_status(self):
        def concurrent(_):
            self.update(status='CANCELLED')
            return False
        result = self.execute(concurrent)
        self.assertEqual(result['outcome'], 'ALREADY_TERMINAL')
        self.assertEqual(result['status'], 'CANCELLED')
        self.assertFalse(result['notification_reestablished'])
        self.assertTrue(bridge.controlled_remediation_result_success(ACTION, result))

    def test_existing_decision_is_applied_without_notification(self):
        def apply(item, _):
            item['status'] = 'APPROVED'
            return True
        with patch.object(bridge, 'controller_decision', return_value={'decision': 'approved'}), patch.object(bridge, 'apply_controller_decision', side_effect=apply), patch.object(bridge, 'maybe_notify_controller') as notify:
            result = bridge.execute_reconcile_pending_approval(self.item['approval_id'])
        notify.assert_not_called()
        self.assertEqual(result['outcome'], 'DECISION_APPLIED')
        self.assertEqual(result['status'], 'APPROVED')
        self.assertTrue(bridge.controlled_remediation_result_success(ACTION, result))

    def test_failed_result_is_persisted_as_failed_attempt(self):
        before = bridge.load_store(bridge.store_path())
        result = self.controlled(False)
        self.assertEqual(result['status'], 'FAILED')
        self.assertEqual(result['attempt']['status'], 'FAILED')
        record = bridge.remediation_attempt_by_id(result['attempt_id'])
        self.assertEqual(record['status'], 'FAILED')
        self.assertFalse(record['result']['notification_reestablished'])
        self.assertEqual(bridge.load_store(bridge.store_path()), before)

    def test_successful_result_is_persisted_as_completed(self):
        def delivered(_):
            self.update(notification_status='DELIVERED')
            return True
        result = self.controlled(delivered)
        self.assertEqual(result['status'], 'COMPLETED')
        self.assertEqual(bridge.remediation_attempt_by_id(result['attempt_id'])['status'], 'COMPLETED')
        self.assertEqual(bridge.load_store(bridge.store_path())['approvals'][self.item['approval_id']]['status'], 'PENDING')

    def test_legacy_contradictory_result_is_not_marked_completed(self):
        old = {'outcome': 'NOTIFICATION_REESTABLISHED', 'status': 'PENDING', 'notification_status': 'FAILED', 'notification_delivered': False, 'notification_reestablished': True}
        result = self.controlled(executor_result=old)
        self.assertEqual(result['status'], 'FAILED')
        self.assertEqual(result['attempt']['status'], 'FAILED')

    def test_unknown_or_nonterminal_success_claims_fail_closed(self):
        for value in (None, {}, {'outcome': 'DECISION_APPLIED', 'status': 'PENDING'}, {'outcome': 'DECISION_APPLIED', 'status': 'CANCELLED'}, {'outcome': 'ALREADY_TERMINAL', 'status': 'PENDING'}, {'outcome': 'unknown', 'status': 'APPROVED'}):
            with self.subTest(value=value):
                self.assertFalse(bridge.controlled_remediation_result_success(ACTION, value))

    def test_progress_diagnostics_are_filtered(self):
        self.update(notification_diagnostic={'http_status': 503, 'error_code': 'PRIVATE_TOKEN', 'body': 'PRIVATE_TOKEN'}, notification_updated_at='PRIVATE_TOKEN', notification_attempts=True)
        result = self.execute(False)
        self.assertIsNone(result['notification_diagnostic'])
        self.assertEqual(result['notification_updated_at'], '')
        self.assertIsNone(result['notification_attempts'])
        self.assertNotIn('PRIVATE_TOKEN', json.dumps(result))

    def test_failed_attempt_does_not_reset_budget_or_cooldown(self):
        result = self.controlled(False)
        records = bridge.remediation_attempt_history(ACTION, 'approval-delivery:none')
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]['status'], 'FAILED')
        evaluation = bridge.evaluate_controlled_remediation(ACTION, self.item['approval_id'])
        self.assertEqual(evaluation['state'], 'COOLDOWN')
        self.assertEqual(evaluation['attempts_used'], 1)
        self.assertEqual(evaluation['attempts_remaining'], 2)
        self.assertEqual(bridge.remediation_attempt_by_id(result['attempt_id'])['status'], 'FAILED')

    def test_other_executors_keep_their_existing_semantics(self):
        self.assertTrue(bridge.controlled_remediation_result_success('RECOVER_NOTIFICATION_LEASE', {'notification_status': 'FAILED'}))

    def test_manual_completion_cannot_persist_a_false_success(self):
        with patch.object(bridge, 'evaluate_controlled_remediation', return_value={'state': 'ELIGIBLE', 'scope_key': 'approval-delivery:none'}):
            started = bridge.do_start_remediation_attempt({'action_code': ACTION, 'approval_id': self.item['approval_id'], 'operator': 'fixture-owner'})
        result = bridge.do_finish_remediation_attempt({'attempt_id': started['attempt_id'], 'operator': 'fixture-owner', 'result': {'outcome': 'NOTIFICATION_REESTABLISHED', 'status': 'PENDING', 'notification_status': 'FAILED', 'notification_delivered': False, 'notification_reestablished': True}}, True)
        self.assertEqual(result['status'], 'FAILED')
        self.assertEqual(bridge.remediation_attempt_by_id(started['attempt_id'])['status'], 'FAILED')

    def test_historical_completed_receipt_is_read_without_rewriting(self):
        with patch.object(bridge, 'evaluate_controlled_remediation', return_value={'state': 'ELIGIBLE', 'scope_key': 'approval-delivery:none'}):
            started = bridge.do_start_remediation_attempt({'action_code': ACTION, 'approval_id': self.item['approval_id'], 'operator': 'fixture-owner'})
        old = {'outcome': 'NOTIFICATION_REESTABLISHED', 'notification_delivered': False, 'notification_reestablished': True, 'notification_status': 'FAILED'}
        bridge.journal.append_unique_event(event_type='REMEDIATION_ATTEMPT_COMPLETED', event_key='fixture-historical-completed', actor='fixture-old-owner', approval_id=self.item['approval_id'], data={'attempt_id': started['attempt_id'], 'action_code': ACTION, 'scope_key': 'approval-delivery:none', 'approval_id': self.item['approval_id'], 'result': old})
        before = Path(bridge.journal.journal_path()).read_bytes()
        record = bridge.remediation_attempt_by_id(started['attempt_id'])
        self.assertEqual(record['status'], 'COMPLETED')
        self.assertEqual(record['result'], old)
        self.assertEqual(Path(bridge.journal.journal_path()).read_bytes(), before)

    def test_mcp_tool_returns_failed_attempt_as_structured_data(self):
        with patch.object(bridge, 'evaluate_controlled_remediation', return_value={'state': 'ELIGIBLE', 'scope_key': 'approval-delivery:none'}), patch.object(bridge, 'controller_decision', return_value=None), patch.object(bridge, 'maybe_notify_controller', return_value=False):
            result = bridge.handle_request({'jsonrpc': '2.0', 'id': 7, 'method': 'tools/call', 'params': {'name': 'broker_execute_controlled_remediation', 'arguments': {'action_code': ACTION, 'approval_id': self.item['approval_id'], 'operator': 'fixture-owner'}}})
        self.assertNotIn('error', result)
        payload = json.loads(result['result']['content'][0]['text'])
        self.assertEqual(payload['status'], 'FAILED')
        self.assertEqual(payload['attempt']['status'], 'FAILED')
        self.assertFalse(payload['result']['notification_reestablished'])
