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

    def test_lookup_after_lost_response_preserves_identity_and_never_notifies(self):
        item = bridge.do_propose(self.args())
        identity = {key: item[key] for key in ("requestId", "run_id", "session_id", "operation_id", "operation_digest")}
        bridge.maybe_notify_controller.reset_mock()
        before = Path(bridge.store_path()).read_bytes()
        events = bridge.journal.read_events()
        receipt = bridge.do_lookup_validation(identity)
        self.assertTrue(receipt["found"])
        self.assertEqual(receipt["approval_id"], item["approval_id"])
        self.assertEqual(receipt["status"], "PENDING")
        self.assertTrue(receipt["snapshot_only"])
        self.assertNotIn("commands", receipt)
        for key in ("run_id", "session_id", "operation_id", "operation_digest"):
            self.assertEqual(bridge.do_lookup_validation({**identity, key: "foreign"}),
                             {"found": False, "snapshot_only": True})
        bridge.maybe_notify_controller.assert_not_called()
        self.assertEqual(Path(bridge.store_path()).read_bytes(), before)
        self.assertEqual(bridge.journal.read_events(), events)

    def test_temporary_transport_failure_keeps_pending_and_uses_bounded_retry(self):
        item = bridge.do_propose(self.args())
        lease = bridge.acquire_notification_lease(item["approval_id"])
        diagnostic = {"http_status": 503, "error_code": None}
        with patch.object(bridge.time, "time", return_value=1000):
            bridge.complete_notification_lease(item["approval_id"], "stale", False, diagnostic, 0.1)
            bridge.complete_notification_lease(item["approval_id"], lease["lease_id"], False, diagnostic, 0.1)
        restored = bridge.load_store(bridge.store_path())["approvals"][item["approval_id"]]
        self.assertEqual(restored["status"], "PENDING")
        self.assertEqual(restored["notification_transport_retries"], 1)
        self.assertAlmostEqual(bridge.parse_utc(restored["notification_next_retry_at"]), 1000.1)
        self.assertEqual(restored["decision_id"], "")

    def test_transport_retry_budget_does_not_disable_normal_backoff(self):
        item = bridge.do_propose(self.args())
        with bridge.locked_store(bridge.store_path()):
            data = bridge.load_store(bridge.store_path())
            data["approvals"][item["approval_id"]]["notification_transport_retries"] = 10
            bridge.save_store(bridge.store_path(), data)
        lease = bridge.acquire_notification_lease(item["approval_id"])
        with patch.object(bridge.time, "time", return_value=1000):
            bridge.complete_notification_lease(item["approval_id"], lease["lease_id"], False, None, 0.1)
        restored = bridge.load_store(bridge.store_path())["approvals"][item["approval_id"]]
        self.assertAlmostEqual(bridge.parse_utc(restored["notification_next_retry_at"]), 1005)
        self.assertEqual(restored["status"], "PENDING")

    def test_transport_retry_hint_accepts_only_the_exact_bounded_diagnostic(self):
        item = bridge.do_propose(self.args())
        for payload, expected in [
            ({"error": "transport-update-in-progress", "retry_after_ms": 100}, 0.1),
            ({"error": "transport-update-in-progress", "retry_after_ms": 1}, None),
            ({"error": "transport-update-in-progress", "retry_after_ms": True}, None),
            ({"error": "transport-update-in-progress", "retry_after_ms": 100, "extra": "PRIVATE"}, None),
            ({"error": "unknown", "retry_after_ms": 100}, None),
        ]:
            with self.subTest(payload=payload):
                failure = bridge.error.HTTPError("http://127.0.0.1/validation", 503, "temporary", {},
                                                 io.BytesIO(json.dumps(payload).encode()))
                with patch.object(bridge.request, "urlopen", side_effect=failure):
                    result = bridge.notify_controller(item, "transport-retry-lease")
                self.assertEqual(result["transport_retry_seconds"], expected)
                self.assertFalse(result["delivered"])

    def test_fast_transport_probes_do_not_inflate_the_normal_backoff(self):
        item = bridge.do_propose(self.args())
        clock = 1000.0
        for attempt in range(11):
            with bridge.locked_store(bridge.store_path()):
                data = bridge.load_store(bridge.store_path())
                data["approvals"][item["approval_id"]]["notification_next_retry_at"] = ""
                bridge.save_store(bridge.store_path(), data)
            lease = bridge.acquire_notification_lease(item["approval_id"])
            with patch.object(bridge.time, "time", return_value=clock):
                bridge.complete_notification_lease(item["approval_id"], lease["lease_id"], False, None, 0.1)
            current = bridge.load_store(bridge.store_path())["approvals"][item["approval_id"]]
            delay = bridge.parse_utc(current["notification_next_retry_at"]) - clock
            self.assertAlmostEqual(delay, 0.1 if attempt < 10 else 5)
            clock += 1
        self.assertEqual(current["notification_attempts"], 11)
        self.assertEqual(current["notification_standard_attempts"], 1)
        self.assertEqual(bridge.notification_retry_delay(10**9), bridge.NOTIFICATION_RETRY_MAX_SECONDS)

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
        shell = bridge.do_propose({**self.args("command"), "tool_input_sha256": "a" * 64})
        self.assertEqual(shell["tool_input_sha256"], "a" * 64)

    def test_background_shell_is_explicit_immutable_and_requires_reserved_port(self):
        args = {**self.args("background"), "shell_background": True,
                "tool_input_sha256": "c" * 64,
                "resources": [{"key": "port:fixture/5173", "mode": "write"}],
                "expected_revisions": {"port:fixture/5173": 0}}
        item = bridge.do_propose(args)
        self.assertIs(item["shell_background"], True)
        for field, value in [("shell_background", False), ("tool_input_sha256", "d" * 64),
                             ("resources", [{"key": "port:fixture/5173", "mode": "read"}])]:
            with self.assertRaises(bridge.ValidationError):
                bridge.do_propose({**args, field: value})
        omitted = dict(args)
        omitted.pop("shell_background")
        with self.assertRaises(bridge.ValidationError):
            bridge.do_propose(omitted)
        for resources in [[], None, [{"key": "file:fixture", "mode": "write"}]]:
            with self.assertRaises(bridge.ValidationError):
                bridge.do_propose({**args, "resources": resources})
        self.assertFalse(bridge.validate_controller_decision(item, {"tool_input_sha256": "c" * 64}))

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

    def test_request_validation_default_timeout_is_finite_and_delivery_is_not_terminal(self):
        args = {**self.args(), "timeout_seconds": 1, "interval_seconds": 1}

        def delivered(item):
            lease = bridge.acquire_notification_lease(item["approval_id"])
            self.assertIsNotNone(lease)
            bridge.complete_notification_lease(item["approval_id"], lease["lease_id"], True)
            return True

        with patch.object(bridge, "maybe_notify_controller", side_effect=delivered), \
             patch.object(bridge.time, "monotonic", side_effect=[0.0, 2.0]):
            result = bridge.do_request_validation(args)

        self.assertEqual(result["status"], "PENDING")
        self.assertTrue(result["validation_timeout"])
        self.assertTrue(result["retry_required"])
        self.assertEqual(result["next_action"], "poll_approval")
        self.assertEqual(result["retry_approval_id"], result["approval_id"])
        stored = bridge.do_get({"approval_id": result["approval_id"]})
        self.assertEqual(stored["status"], "PENDING")
        self.assertEqual(stored["notification_status"], "DELIVERED")

    def test_request_validation_timeout_zero_is_rejected_before_request_creation(self):
        args = {**self.args("zero-timeout"), "timeout_seconds": 0}
        with self.assertRaises(bridge.ValidationError):
            bridge.do_request_validation(args)
        with self.assertRaises(bridge.ValidationError):
            bridge.do_get({"approval_id": args["approval_id"]})

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

    def test_transient_native_visibility_and_busy_keep_same_pending(self):
        for status, code in ((503, "native-validation-evidence-unavailable"), (409, "run-transition-in-flight")):
            args = self.args()
            args["requestId"] = "transient-" + str(status)
            args["approval_id"] = "approval-transient-" + str(status)
            args["operation_id"] = "operation-transient-" + str(status)
            item = bridge.do_propose(args)
            lease = bridge.acquire_notification_lease(item["approval_id"])
            diagnostic = {"http_status": status, "error_code": code}
            bridge.complete_notification_lease(item["approval_id"], lease["lease_id"], False, diagnostic)
            restored = bridge.do_get({"approval_id": item["approval_id"]})
            self.assertEqual(restored["status"], "PENDING")
            self.assertEqual(restored["notification_diagnostic"], diagnostic)
            self.assertEqual(restored["decision_id"], "")
            self.assertFalse(any(event["event_type"] == "APPROVAL_NOT_ADMITTED" for event in bridge.journal.read_events(approval_id=item["approval_id"])))

    def test_notification_diagnostic_closes_deterministic_refusal_without_decision(self):
        args = self.args()
        item = bridge.do_propose(args)
        diagnostic = {"http_status": 409, "error_code": "resource-revision-stale"}
        lease = bridge.acquire_notification_lease(item["approval_id"])
        bridge.complete_notification_lease(item["approval_id"], "stale-lease", False, diagnostic)
        self.assertNotIn("notification_diagnostic", bridge.do_get({"approval_id": item["approval_id"]}))
        bridge.complete_notification_lease(item["approval_id"], lease["lease_id"], False, diagnostic)
        restored = bridge.do_get({"approval_id": item["approval_id"]})
        self.assertEqual(restored["notification_diagnostic"], diagnostic)
        self.assertEqual(restored["status"], "NOT_ADMITTED")
        self.assertEqual(restored["notification_status"], "FAILED")
        self.assertEqual(restored["notification_attempts"], 1)
        self.assertEqual(restored["decision_id"], "")
        self.assertEqual(restored["reviewer"], "")
        self.assertIsNone(bridge.acquire_notification_lease(item["approval_id"]))
        self.assertEqual(bridge.do_propose(args)["status"], "NOT_ADMITTED")
        self.assertEqual(bridge.do_get({"approval_id": item["approval_id"]})["notification_attempts"], 1)
        events = bridge.journal.read_events(approval_id=item["approval_id"])
        self.assertTrue(any(event["event_type"] == "APPROVAL_NOT_ADMITTED" for event in events))
        self.assertFalse(any(event["event_type"] == "APPROVAL_REJECTED" for event in events))
        self.assertTrue(bridge.store_journal_consistency_snapshot()["ok"])
        self.assertEqual(bridge.do_list({"status": "NOT_ADMITTED"})["count"], 1)

    def test_existing_pending_with_deterministic_refusal_closes_on_poll_without_decision(self):
        item = bridge.do_propose(self.args())
        path = bridge.store_path()
        with bridge.locked_store(path):
            data = bridge.load_store(path)
            current = data["approvals"][item["approval_id"]]
            current["notification_status"] = "FAILED"
            current["notification_diagnostic"] = {"http_status": 409, "error_code": "resource-revision-stale"}
            bridge.save_store(path, data)
        result = bridge.do_poll({"approval_id": item["approval_id"], "timeout_seconds": 1, "interval_seconds": 1})
        self.assertEqual(result["status"], "NOT_ADMITTED")
        self.assertNotIn("poll_timeout", result)
        self.assertEqual(result["notification_diagnostic"]["error_code"], "resource-revision-stale")
        self.assertEqual(result["decision_id"], "")
        with patch.object(bridge, "controller_tcp_reachable", return_value=False):
            bridge.run_pending_watchdog_once()
        self.assertEqual(bridge.pending_watchdog_snapshot()["pending_count"], 0)

    def test_transient_or_unrecognized_notification_failure_remains_pending(self):
        item = bridge.do_propose(self.args())
        lease = bridge.acquire_notification_lease(item["approval_id"])
        bridge.complete_notification_lease(item["approval_id"], lease["lease_id"], False,
                                           {"http_status": 503, "error_code": None})
        current = bridge.do_get({"approval_id": item["approval_id"]})
        self.assertEqual(current["status"], "PENDING")
        self.assertTrue(bridge.notification_retry_due({**current, "notification_next_retry_at": ""}))

    def test_known_http_400_refusal_is_not_admitted(self):
        item = bridge.do_propose(self.args())
        lease = bridge.acquire_notification_lease(item["approval_id"])
        bridge.complete_notification_lease(item["approval_id"], lease["lease_id"], False,
                                           {"http_status": 400, "error_code": "expected-revisions-invalid"})
        current = bridge.do_get({"approval_id": item["approval_id"]})
        self.assertEqual(current["status"], "NOT_ADMITTED")
        self.assertEqual(current["notification_diagnostic"]["error_code"], "expected-revisions-invalid")
        self.assertEqual(current["decision_id"], "")

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
        self.assertEqual(restored["status"], "NOT_ADMITTED")
        self.assertEqual(restored["decision_id"], "")
        self.assertNotIn("PRIVATE", str(restored))

    def test_request_validation_returns_not_admitted_instead_of_polling_after_stale_revision(self):
        args = {**self.args(), "timeout_seconds": 30, "interval_seconds": 1}
        body = json.dumps({"error": "resource-revision-stale", "message": "PRIVATE"}).encode()
        exc = bridge.error.HTTPError("http://controller", 409, "Conflict", {}, io.BytesIO(body))
        with patch.object(bridge, "maybe_notify_controller", side_effect=real_maybe_notify_controller), patch.object(bridge.request, "urlopen", side_effect=exc):
            result = bridge.do_request_validation(args)
        self.assertEqual(result["status"], "NOT_ADMITTED")
        self.assertEqual(result["notification_diagnostic"]["error_code"], "resource-revision-stale")
        self.assertNotIn("retry_required", result)
        self.assertEqual(result["decision_id"], "")
        self.assertEqual(result["status"], "NOT_ADMITTED")
        self.assertEqual(result["notification_diagnostic"]["error_code"], "resource-revision-stale")
        self.assertNotIn("retry_required", result)
        self.assertEqual(result["decision_id"], "")

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
