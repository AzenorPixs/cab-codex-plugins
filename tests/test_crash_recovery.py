import json
import os
import subprocess
import sys
import tempfile
import time
import unittest
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

import cgpt_approval_bridge_server as bridge


class CrashRecoveryTest(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        directory = self.stack.enter_context(
            tempfile.TemporaryDirectory(prefix="cab-recovery-test-", dir=ROOT)
        )
        self.directory = Path(directory)
        self.env = {
            "CGPT_APPROVAL_STORE": str(self.directory / "approvals.json"),
            "CGPT_APPROVAL_JOURNAL": str(self.directory / "events.ndjson"),
            "CGPT_JOURNAL_CHECKPOINT_PATH": str(self.directory / "checkpoint.json"),
            "CGPT_BROKER_INSTANCE_LOCK": str(self.directory / "instance.lock"),
            "CGPT_AUTO_REMEDIATION_CB_STATE_PATH": str(self.directory / "circuit.json"),
        }
        self.stack.enter_context(patch.dict(os.environ, self.env, clear=True))
        self.stack.enter_context(
            patch.object(bridge, "INSTANCE_PREVIOUS_SHUTDOWN_STATE", "UNCLEAN")
        )
        self.stack.enter_context(patch.object(bridge, "INSTANCE_ID", "test-current"))
        self.stack.enter_context(
            patch.object(bridge, "INSTANCE_PREVIOUS_METADATA", {"instance_id": "test-before"})
        )
        self.stack.enter_context(patch.object(bridge, "CRASH_RECOVERY_REPORT", {}))
        self.controller = self.stack.enter_context(
            patch.object(bridge, "controller_decision", return_value=None)
        )
        self.notify = self.stack.enter_context(
            patch.object(bridge, "maybe_notify_controller", return_value=False)
        )

    def item(self, number=0, status="APPROVED"):
        return {
            "approval_id": "approval-%d" % number,
            "requestId": "request-%d" % number,
            "change_id": "change-test",
            "status": status,
            "title": "Synthetic approval",
            "summary": "Synthetic recovery fixture",
            "files": [],
            "expires_at": "2099-01-01T00:00:00Z",
        }

    def seed(self, items, missing=(), extra_events=0):
        bridge.save_store(
            bridge.store_path(),
            {"approvals": {item["approval_id"]: item for item in items}},
        )
        events = []
        previous_hash = bridge.journal.ZERO_HASH
        with Path(bridge.journal.journal_path()).open("w", encoding="utf-8") as handle:
            for item in items:
                event_types = ["APPROVAL_CREATED"]
                if item["status"] in bridge.STATUS_EVENT_TYPES:
                    event_types.append(bridge.STATUS_EVENT_TYPES[item["status"]])
                for event_type in event_types:
                    if (item["approval_id"], event_type) in missing:
                        continue
                    event = bridge.journal.build_event(
                        sequence=len(events) + 1,
                        event_type=event_type,
                        event_key="",
                        approval_id=item["approval_id"],
                        request_id=item["requestId"],
                        change_id=item["change_id"],
                        actor="BROKER",
                        data={"status": item["status"]},
                        previous_hash=previous_hash,
                    )
                    handle.write(json.dumps(event) + "\n")
                    events.append(event)
                    previous_hash = event["event_hash"]
            for _ in range(extra_events):
                event = bridge.journal.build_event(
                    sequence=len(events) + 1,
                    event_type="SYNTHETIC_OBSERVATION",
                    event_key="",
                    approval_id="",
                    request_id="",
                    change_id="",
                    actor="BROKER",
                    data={},
                    previous_hash=previous_hash,
                )
                handle.write(json.dumps(event) + "\n")
                events.append(event)
                previous_hash = event["event_hash"]
        return events

    def business_events(self):
        return [
            event for event in bridge.journal.read_events()
            if event["event_type"] == "APPROVAL_CREATED"
            or event["event_type"] in bridge.STATUS_EVENT_TYPES.values()
        ]

    def test_coherent_recovery_replaces_per_item_scans_without_duplicates(self):
        items = [self.item(number) for number in range(8)]
        before = self.seed(items)
        with patch.object(
            bridge.journal, "read_events_unlocked",
            wraps=bridge.journal.read_events_unlocked,
        ) as reads:
            for item in items:
                bridge.repair_journal_for_item(item)
            self.assertEqual(reads.call_count, 2 * len(items))
            reads.reset_mock()
            report = bridge.recover_after_unclean_shutdown()
            # Index, two consistency snapshots and two lifecycle appends.
            self.assertEqual(reads.call_count, 5)
        self.assertEqual(report["status"], "RECOVERED")
        self.assertEqual(self.business_events(), before)
        self.controller.assert_not_called()
        self.notify.assert_not_called()

    def test_missing_created_and_terminal_events_are_repaired_once(self):
        item = self.item()
        self.seed([item], missing=(
            (item["approval_id"], "APPROVAL_CREATED"),
            (item["approval_id"], "APPROVAL_APPROVED"),
        ))
        self.assertEqual(bridge.recover_after_unclean_shutdown()["status"], "RECOVERED")
        first = self.business_events()
        self.assertEqual(len(first), 2)
        self.assertEqual(bridge.recover_after_unclean_shutdown()["status"], "RECOVERED")
        self.assertEqual(self.business_events(), first)
        bridge.journal.calculate_chain_tip(bridge.journal.read_events())

    def test_index_is_updated_with_normalized_identifiers_after_append(self):
        item = self.item()
        item["approval_id"] = "  approval-0  "
        event_index = set()
        bridge.repair_journal_for_item(item, event_index=event_index)
        bridge.repair_journal_for_item(item, event_index=event_index)
        self.assertEqual(event_index, {
            ("approval-0", "APPROVAL_CREATED"),
            ("approval-0", "APPROVAL_APPROVED"),
        })
        self.assertEqual(len(self.business_events()), 2)

    def test_failed_append_does_not_update_index(self):
        event_index = set()
        with patch.object(
            bridge.journal, "append_event",
            side_effect=bridge.journal.JournalError("synthetic write failure"),
        ):
            with self.assertRaisesRegex(bridge.journal.JournalError, "write failure"):
                bridge.repair_journal_for_item(self.item(), event_index=event_index)
        self.assertEqual(event_index, set())

    def test_index_read_failure_is_propagated(self):
        self.seed([self.item()])
        with (
            patch.object(bridge, "journal_crash_recovery_event"),
            patch.object(
                bridge.journal, "read_events",
                side_effect=bridge.journal.JournalError("synthetic read failure"),
            ),
        ):
            with self.assertRaisesRegex(bridge.journal.JournalError, "read failure"):
                bridge.recover_after_unclean_shutdown()

    def test_index_retains_identifier_validation_and_wildcard_semantics(self):
        self.seed([self.item()])
        for event_index in (None, set()):
            with self.subTest(event_index=event_index):
                with self.assertRaises(bridge.journal.JournalValidationError):
                    bridge.journal_event_exists(123, "APPROVAL_CREATED", event_index)
                with self.assertRaises(bridge.journal.JournalValidationError):
                    bridge.journal_event_exists("x" * 201, "APPROVAL_CREATED", event_index)
                self.assertTrue(bridge.journal_event_exists("", "APPROVAL_CREATED", event_index))
                self.assertTrue(bridge.journal_event_exists("approval-0", "", event_index))

    def test_pending_expiration_and_notification_lease_recovery_are_preserved(self):
        expired = self.item(0, "PENDING")
        expired["expires_at"] = "2000-01-01T00:00:00Z"
        pending = self.item(1, "PENDING")
        pending.update(notification_status="SENDING", notification_lease_id="lease-test")
        self.seed([expired, pending])
        with patch.object(bridge.time, "time", return_value=1700000000):
            report = bridge.recover_after_unclean_shutdown()
        self.assertEqual(report["status"], "RECOVERED")
        self.assertEqual(report["expired_approvals"], ["approval-0"])
        self.assertEqual(report["pending_approvals"], ["approval-1"])
        self.assertEqual(report["recovered_notification_leases"], 1)
        stored = bridge.load_store(bridge.store_path())["approvals"]
        self.assertEqual(stored["approval-0"]["status"], "EXPIRED")
        self.assertEqual(stored["approval-1"]["notification_status"], "FAILED")
        self.assertEqual(stored["approval-1"]["notification_lease_id"], "")
        self.assertEqual(sum(
            event["event_type"] == "APPROVAL_EXPIRED"
            for event in self.business_events()
        ), 1)

    def test_conflicting_terminal_event_still_requires_human(self):
        item = self.item(0, "PENDING")
        self.seed([item])
        bridge.journal.append_event("APPROVAL_REJECTED", approval_id=item["approval_id"])
        report = bridge.recover_after_unclean_shutdown()
        self.assertEqual(report["status"], "HUMAN_REQUIRED")
        self.assertFalse(report["consistency_ok"])
        self.assertEqual(bridge.load_store(bridge.store_path())["approvals"]["approval-0"]["status"], "PENDING")
        self.controller.assert_not_called()
        self.notify.assert_not_called()

    def test_corrupt_hash_chain_is_not_bypassed(self):
        self.seed([self.item()])
        path = Path(bridge.journal.journal_path())
        events = bridge.journal.read_events()
        events[0]["data"]["status"] = "REJECTED"
        path.write_text("".join(json.dumps(event) + "\n" for event in events), encoding="utf-8")
        with self.assertRaises(bridge.journal.JournalError):
            bridge.recover_after_unclean_shutdown()

    def test_clean_shutdown_does_not_read_or_repair_journal(self):
        with (
            patch.object(bridge, "INSTANCE_PREVIOUS_SHUTDOWN_STATE", "CLEAN"),
            patch.object(bridge.journal, "read_events") as reads,
            patch.object(bridge, "repair_journal_for_item") as repair,
        ):
            self.assertEqual(bridge.recover_after_unclean_shutdown()["status"], "NOT_REQUIRED")
        reads.assert_not_called()
        repair.assert_not_called()

    def test_representative_recovery_and_mcp_initialize_in_isolated_process(self):
        items = [self.item(number) for number in range(694)]
        self.seed(items, extra_events=16774 - 2 * len(items))
        journal_bytes = Path(bridge.journal.journal_path()).stat().st_size
        with patch.object(
            bridge.journal, "read_events_unlocked",
            wraps=bridge.journal.read_events_unlocked,
        ) as reads:
            started = time.monotonic()
            report = bridge.recover_after_unclean_shutdown()
            recovery_seconds = time.monotonic() - started
        self.assertEqual(report["status"], "RECOVERED")
        self.assertEqual(reads.call_count, 5)
        self.assertEqual(len(self.business_events()), 2 * len(items))

        bridge.journal.append_event(
            "BROKER_INSTANCE_STARTED", data={"instance_id": "test-before"},
        )
        Path(self.env["CGPT_BROKER_INSTANCE_LOCK"]).write_text(
            json.dumps({"instance_id": "test-before"}), encoding="utf-8",
        )
        # Isolate unrelated schedulers; keep main(), recovery and stdin real.
        child = (
            "import sys; from contextlib import ExitStack; from unittest.mock import patch; "
            "sys.path.insert(0, sys.argv[1]); import cgpt_approval_bridge_server as bridge; "
            "stack = ExitStack(); "
            "[stack.enter_context(patch.object(bridge, name)) for name in "
            "('start_background_reconciliation', 'start_pending_watchdog', "
            "'start_session_watchdog', 'start_readiness_publisher', "
            "'start_auto_remediation_scheduler')]; "
            "sys.exit(bridge.main())"
        )
        initialize = {
            "jsonrpc": "2.0", "id": 1, "method": "initialize",
            "params": {"protocolVersion": bridge.MCP_PROTOCOL_VERSION, "capabilities": {},
                       "clientInfo": {"name": "recovery-test", "version": "1"}},
        }
        started = time.monotonic()
        result = subprocess.run(
            [sys.executable, "-B", "-c", child, str(ROOT / "src")],
            input=json.dumps(initialize) + "\n", text=True, capture_output=True,
            env=self.env, cwd=ROOT, timeout=30, check=False,
        )
        initialize_seconds = time.monotonic() - started
        self.assertEqual(result.returncode, 0, result.stderr)
        response = json.loads(result.stdout)
        self.assertEqual(response["id"], 1)
        self.assertEqual(response["result"]["serverInfo"]["version"], "0.86.5")
        events = bridge.journal.read_events()
        self.assertTrue(any(
            event["event_type"] == "BROKER_CRASH_RECOVERY_COMPLETED"
            and event["data"]["previous_instance_id"] == "test-before"
            for event in events
        ))
        self.assertEqual(len(self.business_events()), 2 * len(items))
        print("SYNTHETIC_BENCHMARK " + json.dumps({
            "approvals": len(items), "initial_events": 16774,
            "initial_journal_bytes": journal_bytes,
            "recovery_journal_reads": reads.call_count,
            "recovery_seconds": round(recovery_seconds, 3),
            "isolated_mcp_process_seconds": round(initialize_seconds, 3),
        }))


if __name__ == "__main__":
    unittest.main()
