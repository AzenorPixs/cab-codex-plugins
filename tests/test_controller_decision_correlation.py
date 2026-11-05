import io
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

    def test_command_length_notification_diagnostic_is_filtered_without_decision(self):
        item = {**self.item, "status": "PENDING", "commands": ["private-command-fixture"]}
        body = {"error": "command-too-long", "unit": "utf16", "maxLength": 16384, "actualLength": 16385,
                "message": "private-command-fixture", "extra": "private-command-fixture"}
        exc = bridge.error.HTTPError("http://controller", 400, "Bad Request", {},
                                     io.BytesIO(json.dumps(body).encode()))
        with (patch.object(bridge.request, "urlopen", side_effect=exc),
              patch.object(bridge, "journal_controller_event") as events,
              patch.object(bridge, "note_session_activity")):
            result = bridge.notify_controller(item, "fixture-lease")
        self.assertFalse(result["delivered"])
        self.assertEqual(result["http_status"], 400)
        self.assertEqual(result["error"], "command-too-long: longueur 16385, limite autorisée 16384 (utf16).")
        self.assertEqual(events.call_args.args[1], "CONTROLLER_NOTIFICATION_FAILED")
        self.assertEqual(events.call_args.args[3]["error"], result["error"])
        self.assertNotIn("private-command-fixture", json.dumps(events.call_args.args[3]))
        self.assertEqual(item["status"], "PENDING")
        self.assertTrue(exc.fp.closed)

    def test_untrusted_length_diagnostics_keep_generic_http_failure(self):
        valid = {"error": "command-too-long", "unit": "utf16", "maxLength": 2000, "actualLength": 2001}
        invalid = [[], None, {**valid, "error": "other"}, {**valid, "unit": "bytes"},
                   {**valid, "maxLength": True}, {**valid, "actualLength": 2001.0},
                   {**valid, "maxLength": 0}, {**valid, "actualLength": 2000},
                   {**valid, "actualLength": 9007199254740992}, {**valid, "maxLength": "2000"}]
        cases = [(400, json.dumps(payload).encode()) for payload in invalid]
        cases += [(400, b"private-command-fixture"), (400, b"\xff"), (400, b" " * 1025),
                  (400, json.dumps({**valid, "extra": "x" * 1024}).encode()),
                  (409, json.dumps(valid).encode())]
        for status, body in cases:
            with self.subTest(status=status, body_size=len(body)):
                exc = bridge.error.HTTPError("http://controller", status, "Bad Request", {}, io.BytesIO(body))
                with (patch.object(bridge.request, "urlopen", side_effect=exc),
                      patch.object(bridge, "journal_controller_event") as events,
                      patch.object(bridge, "note_session_activity")):
                    result = bridge.notify_controller(self.item, "fixture-lease")
                self.assertEqual(result["error"], "HTTPError: %s" % status)
                self.assertNotIn("private-command-fixture", json.dumps(events.call_args.args[3]))

    def test_unreadable_length_diagnostic_keeps_generic_http_failure(self):
        exc = bridge.error.HTTPError("http://controller", 400, "Bad Request", {}, io.BytesIO())
        with (patch.object(exc, "read", side_effect=OSError("private-command-fixture")),
              patch.object(bridge.request, "urlopen", side_effect=exc),
              patch.object(bridge, "journal_controller_event"),
              patch.object(bridge, "note_session_activity")):
            result = bridge.notify_controller(self.item, "fixture-lease")
        self.assertEqual(result["error"], "HTTPError: 400")

    def test_notification_refusal_code_is_filtered_and_bound_to_http_status(self):
        for status, payload, expected in [
            (409, {"error": "resource-revision-stale", "message": "PRIVATE", "extra": "PRIVATE"}, "resource-revision-stale"),
            (400, {"error": "expected-revisions-invalid"}, "expected-revisions-invalid"),
            (400, {"error": "resource-revision-stale"}, None),
            (409, {"error": "untrusted-secret-code"}, None),
            (500, {"error": "resource-revision-stale"}, None),
            (409, {"error": ["resource-revision-stale"]}, None),
            (409, {"error": "resource-revision-stale", "extra": "x" * 1025}, None),
        ]:
            with self.subTest(status=status, expected=expected):
                exc = bridge.error.HTTPError("http://controller", status, "Failure", {}, io.BytesIO(json.dumps(payload).encode()))
                with (patch.object(bridge.request, "urlopen", side_effect=exc),
                      patch.object(bridge, "journal_controller_event") as event,
                      patch.object(bridge, "note_session_activity")):
                    result = bridge.notify_controller(self.item, "current-lease")
                self.assertEqual(result["diagnostic"], {"http_status": status, "error_code": expected})
                self.assertFalse(result["delivered"])
                self.assertNotIn("PRIVATE", json.dumps(result))
                self.assertNotIn("untrusted-secret-code", json.dumps(result))
                self.assertEqual(event.call_args.args[3]["diagnostic"], result["diagnostic"])
                self.assertTrue(exc.fp.closed)

    def test_unreadable_notification_diagnostic_remains_unknown(self):
        exc = bridge.error.HTTPError("http://controller", 409, "Failure", {}, io.BytesIO())
        with (patch.object(exc, "read", side_effect=OSError("PRIVATE")),
              patch.object(bridge.request, "urlopen", side_effect=exc),
              patch.object(bridge, "journal_controller_event"),
              patch.object(bridge, "note_session_activity")):
            result = bridge.notify_controller(self.item, "lease")
        self.assertEqual(result["diagnostic"], {"http_status": 409, "error_code": None})
        self.assertNotIn("PRIVATE", json.dumps(result))


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
