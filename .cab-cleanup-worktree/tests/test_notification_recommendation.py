import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import cgpt_approval_bridge_server as bridge


class NotificationRecommendationTest(unittest.TestCase):
    def action(self, *items):
        watchdog = {"approvals": {str(i): item for i, item in enumerate(items)}}
        with patch.object(bridge, "automatic_action_allowed", return_value=False):
            return bridge.recommended_action_for_root_cause("NOTIFICATION_LEASE_STUCK", watchdog)

    @staticmethod
    def item(status="FAILED", reason="retry_overdue", state="STALLED_NOTIFICATION"):
        return {"state": state, "reason": reason, "notification_status": status}

    def test_failed_retry_uses_reconciliation_not_lease_recovery(self):
        action = self.action(self.item())
        self.assertEqual(action["code"], "RECONCILE_PENDING_APPROVALS")
        self.assertEqual(action["class"], "CONTROLLED")
        self.assertFalse(action["requires_human"])
        self.assertFalse(action["automatic_execution_active"])
        self.assertEqual(action["guardrails"]["max_attempts"], 3)

    def test_never_delivered_uses_reconciliation(self):
        for status in ("", "PENDING"):
            with self.subTest(status=status):
                self.assertEqual(self.action(self.item(status, "notification_never_delivered"))["code"], "RECONCILE_PENDING_APPROVALS")

    def test_only_expired_sending_uses_lease_recovery(self):
        action = self.action(self.item("SENDING", "notification_lease_expired"))
        self.assertEqual(action["code"], "RECOVER_NOTIFICATION_LEASE")
        self.assertEqual(action["guardrails"]["max_attempts"], 2)

    def test_mixed_states_require_targeted_diagnostic(self):
        action = self.action(self.item(), self.item("SENDING", "notification_lease_expired"))
        self.assertEqual(action["code"], "INSPECT_PENDING_WATCHDOG")
        self.assertEqual(action["class"], "DIAGNOSTIC")
        self.assertFalse(action["mutates_state"])

    def test_incomplete_or_inconsistent_substates_are_not_guessed(self):
        for value in ({"state": "STALLED_NOTIFICATION"}, self.item("FAILED", "notification_lease_expired"), self.item("SENDING", "retry_overdue"), self.item("SENDING", "notification_lease_active", "NOTIFYING")):
            with self.subTest(value=value):
                self.assertEqual(self.action(value)["class"], "DIAGNOSTIC")
        self.assertEqual(self.action()["class"], "DIAGNOSTIC")

    def test_many_retry_notifications_share_advisory_action(self):
        self.assertEqual(self.action(self.item(), self.item("PENDING", "notification_never_delivered"))["code"], "RECONCILE_PENDING_APPROVALS")

    def test_unrelated_root_cause_and_legacy_call_remain_compatible(self):
        with patch.object(bridge, "automatic_action_allowed", return_value=False):
            self.assertEqual(bridge.recommended_action_for_root_cause("NOTIFICATION_LEASE_STUCK")["code"], "RECOVER_NOTIFICATION_LEASE")
            self.assertEqual(bridge.recommended_action_for_root_cause("NONE", {"approvals": {}})["code"], "NONE")

    def test_health_classification_uses_its_watchdog_snapshot_without_effect(self):
        args = ({"ok": True}, {"ok": True}, {"ok": True}, {"ok": True}, True,
                {}, {"approvals": {"approval": self.item()}}, {"state": "IDLE"}, {}, {}, {})
        with patch.object(bridge, "automatic_action_allowed", return_value=False), patch.object(bridge, "execute_controlled_remediation") as execute:
            result = bridge.classify_root_cause(*args)
        self.assertEqual(result["root_cause"], "NOTIFICATION_LEASE_STUCK")
        self.assertEqual(result["recommended_action"]["code"], "RECONCILE_PENDING_APPROVALS")
        execute.assert_not_called()
