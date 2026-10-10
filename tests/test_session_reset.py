import fcntl
import hashlib
import importlib.util
import os
import json
import subprocess
import sys
import selectors
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py"
spec = importlib.util.spec_from_file_location("cab_session_reset", SCRIPT)
reset = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reset)


class SessionResetTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="cab-reset-test-", dir=ROOT)
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.state = self.root / reset.STATE_DIRECTORY
        self.state.mkdir()

    def test_purge_all_previous_state_and_conflicts_without_following_links(self):
        for name in ["approvals.json", "events.ndjson", "journal.checkpoint.json",
                     "controller-job.json", "controller-reminders.json",
                     "supervisor-state.json", "auto-remediation-circuit.json",
                     "approvals.sync-conflict-20261005-test.json", reset.INSTANCE_LOCK]:
            (self.state / name).write_text("previous session", encoding="utf-8")
        outside = self.root / "project-source.txt"
        outside.write_text("preserve", encoding="utf-8")
        (self.state / "external-link").symlink_to(outside)
        nested = self.state / "old-runtime"
        nested.mkdir()
        (nested / "trace").write_text("old", encoding="utf-8")
        report = reset.reset_directories([str(self.state)])
        self.assertGreater(report[0]["removed_entries"], 0)
        self.assertEqual(list(self.state.iterdir()), [self.state / reset.INSTANCE_LOCK])
        self.assertEqual((self.state / reset.INSTANCE_LOCK).stat().st_size, 0)
        self.assertEqual(outside.read_text(), "preserve")
        self.assertEqual(reset.reset_directories([str(self.state)])[0]["removed_entries"], 0)

    def test_two_runtime_spaces_preserve_external_checkpoint_and_validated_write(self):
        broker_state = self.state
        project = self.root / "project"
        project_state = project / ".opencode/state" / reset.STATE_DIRECTORY
        project_state.mkdir(parents=True)
        source = project / "validated-source.txt"
        source.write_text("already validated write\n", encoding="utf-8")
        source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
        source_stat = source.stat()
        output = project / "output"
        output.mkdir()
        checkpoint = output / "cismp-state.json"
        checkpoint.write_text(json.dumps({
            "change_id": "expected-change",
            "dernier_jalon_prouve": "write-validated",
            "validated_write": {"path": str(source), "sha256": source_hash},
            "prochaine_action": "run remaining validation",
        }), encoding="utf-8")
        report = project / "STATISTIQUES.md"
        report.write_text("preserved report\n", encoding="utf-8")
        history = self.root / "native-session-history.json"
        history.write_text('{"proof":"native reference"}\n', encoding="utf-8")
        preserved = {p: p.read_bytes() for p in [checkpoint, report, history]}
        for directory in [broker_state, project_state]:
            for name in ["approvals.json", "events.ndjson", "controller-job.json",
                         "journal.checkpoint.json", "supervisor-state.json",
                         "approvals.sync-conflict-20261010-test.json"]:
                (directory / name).write_text("unread old technical state", encoding="utf-8")
        result = reset.reset_directories([str(broker_state), str(project_state)])
        self.assertEqual(len(result), 2)
        for directory in [broker_state, project_state]:
            self.assertEqual(list(directory.iterdir()), [directory / reset.INSTANCE_LOCK])
            self.assertEqual((directory / reset.INSTANCE_LOCK).stat().st_size, 0)
        for p, content in preserved.items():
            self.assertEqual(p.read_bytes(), content)
        self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), source_hash)
        self.assertEqual(source.stat().st_mtime_ns, source_stat.st_mtime_ns)
        self.assertEqual(json.loads(checkpoint.read_text())["change_id"], "expected-change")

    def test_busy_second_broker_preserves_both_directories(self):
        second = self.root / "second" / reset.STATE_DIRECTORY
        second.mkdir(parents=True)
        for directory in [self.state, second]:
            (directory / "approvals.json").write_text("keep", encoding="utf-8")
        with (second / reset.INSTANCE_LOCK).open("w") as handle:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with self.assertRaises(RuntimeError):
                reset.reset_directories([str(self.state), str(second)])
        for directory in [self.state, second]:
            self.assertEqual((directory / "approvals.json").read_text(), "keep")

    def test_rejects_wrong_directory_and_parent_traversal(self):
        for value in [str(self.root), reset.STATE_DIRECTORY,
                      str(self.state / ".." / reset.STATE_DIRECTORY)]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                reset.reset_directories([value])

    def test_rejects_symlink_directory_or_parent(self):
        for name in ["direct", "ancestor"]:
            parent = self.root / name
            parent.mkdir()
        direct = self.root / "direct" / reset.STATE_DIRECTORY
        direct.symlink_to(self.state, target_is_directory=True)
        ancestor = self.root / "ancestor" / "linked-parent"
        ancestor.symlink_to(self.root, target_is_directory=True)
        for value in [direct, ancestor / reset.STATE_DIRECTORY]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                reset.reset_directories([str(value)])

    def test_missing_directory_is_already_empty(self):
        missing = self.root / "missing" / reset.STATE_DIRECTORY
        self.assertEqual(reset.reset_directories([str(missing)])[0]["removed_entries"], 0)
        self.assertFalse(missing.exists())

    def test_rejects_symlink_instance_lock(self):
        outside = self.root / "outside"
        outside.write_text("keep", encoding="utf-8")
        (self.state / reset.INSTANCE_LOCK).symlink_to(outside)
        with self.assertRaises(OSError):
            reset.reset_directories([str(self.state)])
        self.assertEqual(outside.read_text(), "keep")

    def test_rejects_hardlink_instance_lock_before_deleting_state(self):
        outside = self.root / "outside"
        outside.write_text("keep", encoding="utf-8")
        os.link(outside, self.state / reset.INSTANCE_LOCK)
        (self.state / "approvals.json").write_text("keep approvals", encoding="utf-8")
        with self.assertRaises(ValueError):
            reset.reset_directories([str(self.state)])
        self.assertEqual(outside.read_text(), "keep")
        self.assertEqual((self.state / "approvals.json").read_text(), "keep approvals")

    def test_rejects_nested_targets_before_deleting_state(self):
        nested = self.state / "child" / reset.STATE_DIRECTORY
        nested.mkdir(parents=True)
        (self.state / "approvals.json").write_text("keep", encoding="utf-8")
        with self.assertRaises(ValueError):
            reset.reset_directories([str(self.state), str(nested)])
        self.assertEqual((self.state / "approvals.json").read_text(), "keep")

    def test_cli_requires_new_session_confirmation(self):
        result = subprocess.run(
            [sys.executable, "-B", str(SCRIPT), "--state-dir", str(self.state)],
            capture_output=True, text=True, timeout=10,
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("--confirm-new-session", result.stderr)
        self.assertEqual(list(self.state.iterdir()), [])
        result = subprocess.run(
            [sys.executable, "-B", str(SCRIPT), "--confirm-new-session",
             "--state-dir", str(self.state)],
            capture_output=True, text=True, timeout=10,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["status"], "CAB_STATE_RESET")

    def test_purged_corrupt_history_allows_fresh_mcp_initialization(self):
        for name in ["approvals.json", "events.ndjson", "journal.checkpoint.json"]:
            (self.state / name).write_text("invalid old state", encoding="utf-8")
        reset.reset_directories([str(self.state)])
        environment = {
            "HOME": str(self.root), "LANG": "C.UTF-8",
            "CGPT_APPROVAL_STORE": str(self.state / "approvals.json"),
            "CGPT_APPROVAL_JOURNAL": str(self.state / "events.ndjson"),
            "CGPT_JOURNAL_CHECKPOINT_PATH": str(self.state / "journal.checkpoint.json"),
            "CGPT_BROKER_INSTANCE_LOCK": str(self.state / reset.INSTANCE_LOCK),
            "CGPT_AUTO_REMEDIATION_CB_STATE_PATH": str(self.state / "circuit.json"),
            "CGPT_CONTROLLER_URL": "http://127.0.0.1:0",
        }
        requests = [
            {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}},
            {"jsonrpc": "2.0", "id": 2, "method": "tools/call",
             "params": {"name": "broker_readiness", "arguments": {}}},
        ]
        process = subprocess.Popen(
            [sys.executable, "-B", str(ROOT / "src/cgpt_approval_bridge_server.py")],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, env=environment, cwd=ROOT,
        )
        replies = {}
        try:
            with selectors.DefaultSelector() as selector:
                selector.register(process.stdout, selectors.EVENT_READ)
                for value in requests:
                    process.stdin.write(json.dumps(value) + "\n")
                    process.stdin.flush()
                    self.assertTrue(selector.select(timeout=10), "MCP response timed out")
                    reply = json.loads(process.stdout.readline())
                    replies[reply["id"]] = reply
        finally:
            process.stdin.close()
            process.stdin = None
            try:
                _, errors = process.communicate(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.communicate()
                raise
        self.assertEqual(process.returncode, 0, errors)
        self.assertEqual(replies[1]["result"]["serverInfo"]["version"], "0.87.0")
        readiness = json.loads(replies[2]["result"]["content"][0]["text"])
        self.assertEqual(readiness["pending_count"], 0)
        self.assertEqual(readiness["root_cause"], "CONTROLLER_UNREACHABLE")
        self.assertFalse(readiness["human_required"])


if __name__ == "__main__":
    unittest.main()
