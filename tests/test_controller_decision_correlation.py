import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(
    0,
    str(
        Path(__file__).resolve().parents[1]
        / "src"
    ),
)

import cgpt_approval_bridge_server as bridge


class FakeResponse:
    status = 200

    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def read(self):
        return json.dumps(
            self.payload
        ).encode("utf-8")


class ControllerDecisionCorrelationTest(
    unittest.TestCase,
):
    def setUp(self):
        self.item = {
            "approval_id": "approval-123",
            "change_id": "change-789",
            "requestId": "request-456",
        }

    def test_poll_uses_request_id(self):
        observed = []
        payload = {
            "approval_id": "approval-123",
            "change_id": "change-789",
            "decision": "approved",
            "requestId": "request-456",
        }

        def fake_urlopen(url, timeout):
            observed.append((url, timeout))
            return FakeResponse(payload)

        with (
            patch.object(
                bridge,
                "controller_url",
                return_value="http://controller",
            ),
            patch.object(
                bridge.request,
                "urlopen",
                side_effect=fake_urlopen,
            ),
            patch.object(bridge, "journal_controller_event"),
            patch.object(bridge, "note_session_activity"),
        ):
            decision = bridge.controller_decision(self.item)

        self.assertEqual(
            observed[0][0],
            "http://controller/decision/request-456",
        )
        self.assertEqual(decision, payload)

    def test_requires_all_matching_identifiers(self):
        matching = {
            "approval_id": "approval-123",
            "change_id": "change-789",
            "decision": "approved",
            "requestId": "request-456",
        }

        self.assertTrue(
            bridge.validate_controller_decision(
                self.item,
                matching,
            )
        )

        for field in (
            "approval_id",
            "change_id",
            "requestId",
        ):
            incomplete = matching.copy()
            incomplete.pop(field)
            self.assertFalse(
                bridge.validate_controller_decision(
                    self.item,
                    incomplete,
                )
            )

        mismatched = matching.copy()
        mismatched["approval_id"] = "approval-999"
        self.assertFalse(
            bridge.validate_controller_decision(
                self.item,
                mismatched,
            )
        )

    def test_reminder_keeps_pending_state_and_uses_correlated_endpoint(self):
        item = {
            **self.item,
            "status": "PENDING",
            "notification_status": "DELIVERED",
        }
        observed = []

        def fake_urlopen(http_request, timeout):
            observed.append((http_request.full_url, timeout))
            return FakeResponse({})

        with (
            patch.object(
                bridge,
                "controller_url",
                return_value="http://controller",
            ),
            patch.object(
                bridge.request,
                "urlopen",
                side_effect=fake_urlopen,
            ),
            patch.object(bridge.journal, "append_unique_event"),
        ):
            delivered = bridge.remind_controller(
                item,
                age_seconds=30,
                last_state="WAITING_DECISION",
            )

        self.assertTrue(delivered)
        self.assertEqual(
            observed[0][0],
            "http://controller/validation/reminder",
        )
        self.assertEqual(item["status"], "PENDING")


class UnitaryOperationValidationTest(
    unittest.TestCase,
):
    def test_accepts_a_single_relative_file(self):
        files, commands = bridge.validate_unitary_operation(
            {
                "files": ["BUILD.md"],
            }
        )

        self.assertEqual(files, ["BUILD.md"])
        self.assertEqual(commands, [])

    def test_accepts_a_single_command_without_file(self):
        files, commands = bridge.validate_unitary_operation(
            {
                "files": [],
                "commands": ["true"],
            }
        )

        self.assertEqual(files, [])
        self.assertEqual(commands, ["true"])

    def test_rejects_empty_or_ambiguous_operations(self):
        invalid_operations = (
            {"files": [], "commands": []},
            {"files": ["BUILD.md"], "commands": ["true"]},
            {"files": ["BUILD.md", "README.md"], "commands": []},
            {"files": [], "commands": ["true", "false"]},
        )

        for operation in invalid_operations:
            with self.assertRaises(bridge.ValidationError):
                bridge.validate_unitary_operation(operation)


if __name__ == "__main__":
    unittest.main()
