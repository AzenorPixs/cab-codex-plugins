import copy
import io
import json
import hashlib
import os
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from contextlib import ExitStack
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import cgpt_approval_bridge_server as bridge

real_maybe_notify_controller = bridge.maybe_notify_controller


class ConcurrentBrokerTest(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        directory = Path(self.stack.enter_context(tempfile.TemporaryDirectory(prefix="cab-concurrent-broker-")))
        self.stack.enter_context(patch.dict(os.environ, {
            "CGPT_CONTROLLER_URL": "http://127.0.0.1:0",
            "CGPT_APPROVAL_STORE": str(directory / "approvals.json"),
            "CGPT_APPROVAL_JOURNAL": str(directory / "events.ndjson"),
            "CGPT_JOURNAL_CHECKPOINT_PATH": str(directory / "checkpoint.json"),
        }, clear=True))
        self.stack.enter_context(patch.object(bridge, "maybe_notify_controller"))

    def args(self, run="a"):
        return {"run_id": run, "reservation_version": 1, "requestId": f"request-{run}",
                "coordination_protocol": "resource-scoped-v1", "operation_id": f"op-{run}",
                "operation_digest": hashlib.sha256(run.encode()).hexdigest(),
                "expected_revisions": {f"resource:{run}": 0},
                "approval_id": f"approval-{run}", "change_id": f"change-{run}",
                "session_id": f"ses_{run}", "directory": "/synthetic-project",
                "title": "Synthetic command", "files": [], "commands": ["/usr/bin/true"],
                "resources": [{"key": f"resource:{run}", "mode": "read"}]}

    def test_native_tool_input_digest_is_immutable_and_correlated(self):
        args = {**self.args(), "files": ["one.py"], "commands": [], "tool_input_sha256": "a" * 64}
        item = bridge.do_propose(args)
        self.assertEqual(item["tool_input_sha256"], "a" * 64)
        self.assertEqual(bridge.do_propose(args)["approval_id"], item["approval_id"])
        for replacement in [None, "b" * 64]:
            changed = {**args}
            if replacement is None:
                changed.pop("tool_input_sha256")
            else:
                changed["tool_input_sha256"] = replacement
            with self.assertRaises(bridge.ValidationError):
                bridge.do_propose(changed)
        decision = {"requestId": item["requestId"], "approval_id": item["approval_id"],
                    "change_id": item["change_id"], "decision": "approved"}
        self.assertFalse(bridge.validate_controller_decision(item, decision))
        for invalid in [None, "", "z" * 64, "a" * 63]:
            with self.assertRaises(bridge.ValidationError):
                bridge.do_propose({**args, "tool_input_sha256": invalid})
        with self.assertRaises(bridge.ValidationError):
            bridge.do_propose({**self.args("command"), "tool_input_sha256": "a" * 64})

    def test_three_parallel_calls_preserve_each_run_identity(self):
        with ThreadPoolExecutor(max_workers=3) as executor:
            items = list(executor.map(lambda run: bridge.do_propose(self.args(run)), ("a", "b", "c")))
        self.assertEqual({item["run_id"] for item in items}, {"a", "b", "c"})
        for item in items:
            restored = bridge.do_get({"approval_id": item["approval_id"]})
            self.assertEqual(restored["reservation_version"], 1)
            self.assertEqual(restored["resources"], item["resources"])

    def test_retry_cannot_omit_or_change_reservation_identity(self):
        args = self.args()
        bridge.do_propose(args)
        for key, value in (("run_id", "other"), ("reservation_version", 2),
                           ("resources", [{"key": "resource:other", "mode": "write"}])):
            changed = copy.deepcopy(args)
            changed[key] = value
            with self.assertRaises(bridge.ValidationError):
                bridge.do_propose(changed)
        legacy = {k: v for k, v in args.items() if k not in ("run_id", "reservation_version", "resources")}
        with self.assertRaises(bridge.ValidationError):
            bridge.do_propose(legacy)

    def test_command_requires_resources_and_positive_integer_generation(self):
        for version in (True, 0, -1, "1"):
            with self.assertRaises(bridge.ValidationError):
                bridge.do_propose({**self.args(), "reservation_version": version})
        with self.assertRaises(bridge.ValidationError):
            bridge.do_propose({**self.args(), "resources": []})

    def test_controller_decision_is_bound_to_run_and_generation(self):
        item = bridge.do_propose(self.args())
        decision = {key: item[key] for key in ("requestId", "approval_id", "change_id", "run_id", "reservation_version",
                    "coordination_protocol", "operation_id", "operation_digest", "expected_revisions", "resources")}
        self.assertTrue(bridge.validate_controller_decision(item, decision))
        self.assertFalse(bridge.validate_controller_decision(item, {**decision, "run_id": "b"}))
        self.assertFalse(bridge.validate_controller_decision(item, {**decision, "reservation_version": 2}))
        self.assertFalse(bridge.validate_controller_decision(item, {**decision, "operation_id": "other"}))
        self.assertFalse(bridge.validate_controller_decision(item, {**decision, "expected_revisions": {"resource:a": 1}}))

    def test_old_or_incomplete_coordination_is_refused_before_persistence(self):
        for key in ("coordination_protocol", "operation_id", "operation_digest", "expected_revisions"):
            args = self.args()
            del args[key]
            with self.assertRaises(bridge.ValidationError):
                bridge.do_propose(args)
        with self.assertRaises(bridge.ValidationError):
            bridge.do_propose({**self.args(), "expected_revisions": {"resource:a": True}})

    def test_empty_access_id_is_refused_before_registration_and_schema_matches(self):
        schema = bridge.APPROVAL_REQUEST_PROPERTIES["access_id"]
        self.assertEqual(schema["minLength"], 1)
        self.assertRegex("access-valid", schema["pattern"])
        for value in ("", "bad value", "/absolute"):
            with self.assertRaises(bridge.ValidationError):
                bridge.do_propose({**self.args(), "access_id": value})
            self.assertEqual(bridge.load_store(bridge.store_path())["approvals"], {})
        self.assertEqual(bridge.do_propose(self.args())["status"], "PENDING")

    def test_notification_diagnostic_persists_only_under_current_lease_and_clears_on_delivery(self):
        args = self.args()
        item = bridge.do_propose(args)
        diagnostic = {"http_status": 409, "error_code": "resource-revision-stale"}
        lease = bridge.acquire_notification_lease(item["approval_id"])
        bridge.complete_notification_lease(item["approval_id"], "stale-lease", False, diagnostic)
        self.assertNotIn("notification_diagnostic", bridge.do_get({"approval_id": item["approval_id"]}))
        bridge.complete_notification_lease(item["approval_id"], lease["lease_id"], False, diagnostic)
        restored = bridge.do_get({"approval_id": item["approval_id"]})
        self.assertEqual(restored["notification_diagnostic"], diagnostic)
        self.assertEqual(restored["status"], "PENDING")
        self.assertEqual(restored["notification_status"], "FAILED")
        self.assertEqual(restored["notification_attempts"], 1)
        with patch.object(bridge, "notification_retry_due", return_value=True):
            current = bridge.acquire_notification_lease(item["approval_id"])
        bridge.complete_notification_lease(item["approval_id"], lease["lease_id"], True)
        self.assertEqual(bridge.do_get({"approval_id": item["approval_id"]})["notification_status"], "SENDING")
        bridge.complete_notification_lease(item["approval_id"], current["lease_id"], True)
        delivered = bridge.do_get({"approval_id": item["approval_id"]})
        self.assertNotIn("notification_diagnostic", delivered)
        self.assertEqual(delivered["notification_status"], "DELIVERED")
        self.assertEqual(delivered["notification_attempts"], 2)
        self.assertEqual(delivered["status"], "PENDING")

    def test_notification_diagnostic_rejects_untrusted_shape(self):
        item = bridge.do_propose(self.args())
        diagnostic = {"http_status": 409, "error_code": "resource-revision-stale"}
        lease = bridge.acquire_notification_lease(item["approval_id"])
        bridge.complete_notification_lease(item["approval_id"], lease["lease_id"], False, {**diagnostic, "message": "PRIVATE"})
        restored = bridge.do_get({"approval_id": item["approval_id"]})
        self.assertNotIn("notification_diagnostic", restored)
        self.assertNotIn("PRIVATE", str(restored))

    def test_http_refusal_diagnostic_reaches_persisted_approval_without_decision(self):
        item = bridge.do_propose(self.args())
        body = json.dumps({"error": "resource-revision-stale", "message": "PRIVATE"}).encode()
        exc = bridge.error.HTTPError("http://controller", 409, "Conflict", {}, io.BytesIO(body))
        with patch.object(bridge.request, "urlopen", side_effect=exc):
            self.assertFalse(real_maybe_notify_controller(item))
        restored = bridge.do_get({"approval_id": item["approval_id"]})
        self.assertEqual(restored["notification_diagnostic"], {"http_status": 409, "error_code": "resource-revision-stale"})
        self.assertEqual(restored["notification_attempts"], 1)
        self.assertEqual(restored["status"], "PENDING")
        self.assertNotIn("PRIVATE", str(restored))

    def test_old_controller_cannot_receive_new_run_through_legacy_route(self):
        item = bridge.do_propose(self.args())
        with patch.object(bridge.request, "urlopen") as transport:
            transport.return_value.__enter__.return_value.status = 404
            result = bridge.notify_controller(item, "fixture-lease")
        self.assertFalse(result["delivered"])
        self.assertTrue(transport.call_args.args[0].full_url.endswith("/validation/resource-request"))
        self.assertEqual(bridge.do_get({"approval_id": item["approval_id"]})["status"], "PENDING")

    def test_readiness_scopes_pending_counts_but_retains_shared_store_failure(self):
        bridge.do_propose(self.args("a"))
        health = {"status": "OK", "diagnosis": {"root_cause": "NONE"},
                  "controller": {"tcp_reachable": True}, "pending_watchdog": {"pending_count": 1}}
        with patch.object(bridge, "do_health", return_value=health):
            a = bridge.do_readiness({"run_id": "a"})
            b = bridge.do_readiness({"run_id": "b"})
        self.assertEqual(a["pending_count"], 1)
        self.assertEqual(b["pending_count"], 0)
        self.assertEqual(b["status"], "READY")
        health["diagnosis"]["root_cause"] = "STORE_UNHEALTHY"
        with patch.object(bridge, "do_health", return_value=health):
            self.assertEqual(bridge.do_readiness({"run_id": "b"})["status"], "BLOCKED")

    def check_consistency_during_transition(self, transition):
        entered = threading.Event()
        release = threading.Event()
        snapshot_thread = []
        original_read = bridge.journal.read_events

        def read_events(*args, **kwargs):
            if threading.get_ident() == snapshot_thread[0]:
                entered.set()
                if not release.wait(5):
                    raise AssertionError("Le contrôle de cohérence n'a pas été libéré.")
            return original_read(*args, **kwargs)

        def snapshot():
            snapshot_thread.append(threading.get_ident())
            return bridge.store_journal_consistency_snapshot()

        with patch.object(bridge.journal, "read_events", side_effect=read_events):
            with ThreadPoolExecutor(max_workers=2) as executor:
                observation = executor.submit(snapshot)
                try:
                    self.assertTrue(entered.wait(5))
                    writer = executor.submit(transition)
                    try:
                        writer.result(timeout=0.2)
                    except TimeoutError:
                        # La transition peut attendre la fin de la lecture cohérente.
                        pass
                finally:
                    release.set()
                result = observation.result(timeout=5)
                writer.result(timeout=5)
        self.assertTrue(result["ok"], result)
        self.assertTrue(bridge.store_journal_consistency_snapshot()["ok"])

    def test_concurrent_creation_never_looks_like_orphan_journal_approval(self):
        self.check_consistency_during_transition(lambda: bridge.do_propose(self.args()))

    def test_concurrent_cancellation_never_looks_like_conflicting_terminal_event(self):
        item = bridge.do_propose(self.args())
        self.check_consistency_during_transition(
            lambda: bridge.do_cancel({"approval_id": item["approval_id"]})
        )

    def test_genuine_orphan_remains_ambiguous_without_creating_an_approval(self):
        bridge.journal.append_event(
            "APPROVAL_CREATED", approval_id="orphan", request_id="request-orphan",
            change_id="change-orphan", actor="OC",
        )
        result = bridge.store_journal_consistency_snapshot()
        self.assertFalse(result["ok"])
        self.assertEqual(result["orphan_journal_approvals"], ["orphan"])
        self.assertEqual(bridge.load_store(bridge.store_path())["approvals"], {})

    def test_scoped_readiness_preserves_shared_failure_cause(self):
        health = {"status": "DEGRADED", "diagnosis": {"root_cause": "STORE_JOURNAL_DIVERGENCE"},
                  "controller": {"tcp_reachable": True}, "pending_watchdog": {"pending_count": 0},
                  "consistency": {"ok": False, "orphan_journal_approvals": ["orphan"]}}
        with patch.object(bridge, "do_health", return_value=health):
            result = bridge.do_readiness({"run_id": "a"})
        self.assertEqual(result["status"], "HUMAN_REQUIRED")
        self.assertEqual(result["infrastructure_status"], "HUMAN_REQUIRED")
        self.assertEqual(result["root_cause"], "STORE_JOURNAL_DIVERGENCE")
        self.assertEqual(result["by_run"], {})

    def test_readiness_counts_current_store_instead_of_stale_watchdog(self):
        item = bridge.do_propose(self.args())
        bridge.do_cancel({"approval_id": item["approval_id"]})
        health = {"status": "OK", "diagnosis": {"root_cause": "NONE"},
                  "controller": {"tcp_reachable": True},
                  "pending_watchdog": {"pending_count": 1, "stalled_count": 1,
                                       "approvals": {item["approval_id"]: {"state": "STALLED_DECISION"}}}}
        with patch.object(bridge, "do_health", return_value=health):
            result = bridge.do_readiness()
        self.assertEqual(result["pending_count"], 0)
        self.assertEqual(result["stalled_count"], 0)
        self.assertEqual(result["by_run"]["a"]["pending_count"], 0)


if __name__ == "__main__":
    unittest.main()
