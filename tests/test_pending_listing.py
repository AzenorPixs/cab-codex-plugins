import json
import os
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


class PendingListingTest(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.directory = Path(self.stack.enter_context(
            tempfile.TemporaryDirectory(prefix="cab-list-test-", dir=ROOT)
        ))
        self.stack.enter_context(patch.dict(os.environ, {
            "CGPT_APPROVAL_STORE": str(self.directory / "approvals.json"),
            "CGPT_APPROVAL_JOURNAL": str(self.directory / "events.ndjson"),
            "CGPT_JOURNAL_CHECKPOINT_PATH": str(self.directory / "checkpoint.json"),
        }, clear=True))

    def item(self, number=0, status="APPROVED"):
        return {
            "approval_id": "approval-%d" % number,
            "requestId": "request-%d" % number,
            "change_id": "change-test",
            "status": status,
            "created_at": "2026-10-05T00:00:%02dZ" % (number % 60),
            "expires_at": "2099-01-01T00:00:00Z",
            "title": "Synthetic approval",
            "summary": "Synthetic listing fixture",
            "files": [],
        }

    def seed(self, items, missing=(), extra_events=0):
        bridge.save_store(bridge.store_path(), {
            "approvals": {item["approval_id"]: item for item in items},
        })
        events = []
        previous_hash = bridge.journal.ZERO_HASH
        with Path(bridge.journal.journal_path()).open("w", encoding="utf-8") as handle:
            def write(event_type, item):
                nonlocal previous_hash
                event = bridge.journal.build_event(
                    sequence=len(events) + 1, event_type=event_type, event_key="",
                    approval_id=item.get("approval_id", ""),
                    request_id=item.get("requestId", ""),
                    change_id=item.get("change_id", ""), actor="BROKER",
                    data={"status": item.get("status", "")}, previous_hash=previous_hash,
                )
                handle.write(json.dumps(event) + "\n")
                events.append(event)
                previous_hash = event["event_hash"]

            for item in items:
                event_types = ["APPROVAL_CREATED"]
                if item["status"] in bridge.STATUS_EVENT_TYPES:
                    event_types.append(bridge.STATUS_EVENT_TYPES[item["status"]])
                for event_type in event_types:
                    if (item["approval_id"], event_type) not in missing:
                        write(event_type, item)
            for _ in range(extra_events):
                write("SYNTHETIC_OBSERVATION", {})
        return events

    def test_coherent_listing_reads_once_and_preserves_filter_sort_count_limit(self):
        items = [self.item(i, "PENDING" if i % 2 else "APPROVED")
                 for i in reversed(range(8))]
        before = self.seed(items)
        with patch.object(bridge.journal, "read_events_unlocked",
                          wraps=bridge.journal.read_events_unlocked) as reads:
            result = bridge.do_list({"status": "PENDING", "limit": 2})
            self.assertEqual(reads.call_count, 1)
        self.assertEqual(result["count"], 4)
        self.assertEqual([item["approval_id"] for item in result["approvals"]],
                         ["approval-1", "approval-3"])
        self.assertEqual(bridge.journal.read_events(), before)
        self.assertEqual(bridge.do_list({"status": "REJECTED", "limit": 1}),
                         {"approvals": [], "count": 0})
        all_items = bridge.do_list({"limit": 3})
        self.assertEqual(all_items["count"], 8)
        self.assertEqual([item["approval_id"] for item in all_items["approvals"]],
                         ["approval-0", "approval-1", "approval-2"])

    def test_missing_events_repaired_once_and_index_is_local_to_each_call(self):
        item = self.item()
        self.seed([item], missing=(
            (item["approval_id"], "APPROVAL_CREATED"),
            (item["approval_id"], "APPROVAL_APPROVED"),
        ))
        original = bridge.repair_journal_for_item
        indexes = []

        def repair_twice(item, event_index=None):
            indexes.append(event_index)
            original(item, event_index=event_index)
            original(item, event_index=event_index)

        with patch.object(bridge, "repair_journal_for_item", side_effect=repair_twice):
            bridge.do_list({})
            first = bridge.journal.read_events()
            bridge.do_list({})
        self.assertEqual(len(first), 2)
        self.assertEqual(bridge.journal.read_events(), first)
        self.assertIsNotNone(indexes[0])
        self.assertIsNot(indexes[0], indexes[1])
        self.assertEqual(indexes[0], {
            ("approval-0", "APPROVAL_CREATED"),
            ("approval-0", "APPROVAL_APPROVED"),
        })
        bridge.journal.calculate_chain_tip(first)

    def test_expiration_is_saved_before_terminal_append(self):
        item = self.item(status="PENDING")
        item["expires_at"] = "2000-01-01T00:00:00Z"
        self.seed([item])
        original = bridge.journal.append_event
        persisted = []

        def append(*args, **kwargs):
            stored = bridge.load_store(bridge.store_path())["approvals"]
            persisted.append(stored[item["approval_id"]]["status"])
            return original(*args, **kwargs)

        with patch.object(bridge.journal, "append_event", side_effect=append):
            self.assertEqual(bridge.do_list({"status": "PENDING"}),
                             {"approvals": [], "count": 0})
        self.assertEqual(persisted, ["EXPIRED"])
        self.assertEqual(bridge.do_list({"status": "EXPIRED"})["count"], 1)
        self.assertEqual(sum(e["event_type"] == "APPROVAL_EXPIRED"
                             for e in bridge.journal.read_events()), 1)

    def test_initial_read_failure_is_propagated(self):
        self.seed([self.item()])
        with patch.object(bridge.journal, "read_events",
                          side_effect=bridge.journal.JournalError("synthetic read failure")):
            with self.assertRaisesRegex(bridge.journal.JournalError, "read failure"):
                bridge.do_list({})

    def test_failed_append_does_not_update_index(self):
        item = self.item()
        self.seed([item], missing=((item["approval_id"], "APPROVAL_APPROVED"),))
        original = bridge.repair_journal_for_item
        indexes = []

        def capture(item, event_index=None):
            indexes.append(event_index)
            return original(item, event_index=event_index)

        with (patch.object(bridge, "repair_journal_for_item", side_effect=capture),
              patch.object(bridge.journal, "append_event",
                           side_effect=bridge.journal.JournalError("synthetic write failure"))):
            with self.assertRaisesRegex(bridge.journal.JournalError, "write failure"):
                bridge.do_list({})
        self.assertEqual(indexes, [{("approval-0", "APPROVAL_CREATED")}])

    def test_corrupt_chain_still_blocks_missing_event_append(self):
        item = self.item()
        events = self.seed([item], missing=((item["approval_id"], "APPROVAL_APPROVED"),))
        events[0]["data"]["status"] = "REJECTED"
        path = Path(bridge.journal.journal_path())
        path.write_text("".join(json.dumps(e) + "\n" for e in events), encoding="utf-8")
        with self.assertRaises(bridge.journal.JournalError):
            bridge.do_list({})
        self.assertEqual(len(bridge.journal.read_events()), 1)

    def test_empty_store_does_not_read_or_repair_journal(self):
        bridge.save_store(bridge.store_path(), {"approvals": {}})
        with (patch.object(bridge.journal, "read_events") as reads,
              patch.object(bridge, "repair_journal_for_item") as repair):
            self.assertEqual(bridge.do_list({}), {"approvals": [], "count": 0})
        reads.assert_not_called()
        repair.assert_not_called()

    def test_invalid_arguments_are_rejected_before_reading_journal(self):
        with patch.object(bridge.journal, "read_events") as reads:
            for args in ({"status": "UNKNOWN"}, {"limit": True}, {"limit": 0},
                         {"limit": 201}, {"limit": "1"}):
                with self.subTest(args=args), self.assertRaises(bridge.ValidationError):
                    bridge.do_list(args)
        reads.assert_not_called()

    def test_index_retains_identifier_validation(self):
        self.seed([self.item()])
        for identifier in (123, "x" * 201):
            invalid = self.item()
            invalid["approval_id"] = identifier
            bridge.save_store(bridge.store_path(), {"approvals": {"fixture": invalid}})
            with self.subTest(identifier=identifier):
                with self.assertRaises(bridge.journal.JournalValidationError):
                    bridge.do_list({})

    def test_representative_listing_has_one_initial_journal_read(self):
        items = [self.item(i) for i in range(694)]
        self.seed(items, extra_events=16774 - 2 * len(items))
        journal_bytes = Path(bridge.journal.journal_path()).stat().st_size
        with patch.object(bridge.journal, "read_events_unlocked",
                          wraps=bridge.journal.read_events_unlocked) as reads:
            started = time.monotonic()
            result = bridge.do_list({"status": "PENDING", "limit": 1})
            elapsed = time.monotonic() - started
        self.assertEqual(result, {"approvals": [], "count": 0})
        self.assertEqual(reads.call_count, 1)
        print("SYNTHETIC_LIST_BENCHMARK " + json.dumps({
            "approvals": len(items), "events": 16774, "journal_bytes": journal_bytes,
            "journal_reads": reads.call_count, "seconds": round(elapsed, 3),
        }))


if __name__ == "__main__":
    unittest.main()
