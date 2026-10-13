import copy
import os
from pathlib import Path
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from contextlib import ExitStack
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import cgpt_approval_bridge_server as bridge


class ConcurrentBrokerTest(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        directory = Path(self.stack.enter_context(tempfile.TemporaryDirectory(prefix="cab-concurrent-broker-")))
        self.stack.enter_context(patch.dict(os.environ, {
            "CGPT_APPROVAL_STORE": str(directory / "approvals.json"),
            "CGPT_APPROVAL_JOURNAL": str(directory / "events.ndjson"),
            "CGPT_JOURNAL_CHECKPOINT_PATH": str(directory / "checkpoint.json"),
        }, clear=True))
        self.stack.enter_context(patch.object(bridge, "maybe_notify_controller"))

    def args(self, run="a"):
        return {"run_id": run, "reservation_version": 1, "requestId": f"request-{run}",
                "approval_id": f"approval-{run}", "change_id": f"change-{run}",
                "session_id": f"ses_{run}", "directory": "/synthetic-project",
                "title": "Synthetic command", "files": [], "commands": ["/usr/bin/true"],
                "resources": [{"key": f"resource:{run}", "mode": "read"}]}

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
        decision = {key: item[key] for key in ("requestId", "approval_id", "change_id", "run_id", "reservation_version")}
        self.assertTrue(bridge.validate_controller_decision(item, decision))
        self.assertFalse(bridge.validate_controller_decision(item, {**decision, "run_id": "b"}))
        self.assertFalse(bridge.validate_controller_decision(item, {**decision, "reservation_version": 2}))

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


if __name__ == "__main__":
    unittest.main()
