"""Process-level EOF qualification using only a dedicated synthetic store."""
import fcntl
import json
from pathlib import Path
import selectors
import subprocess
import sys
import tempfile
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]


class BrokerShutdownTest(unittest.TestCase):
    def test_eof_preserves_pending_approval_and_releases_lock(self):
        with tempfile.TemporaryDirectory(prefix="cab-eof-") as directory:
            state = Path(directory)
            environment = {
                "LANG": "C.UTF-8",
                "CGPT_APPROVAL_STORE": str(state / "approvals.json"),
                "CGPT_APPROVAL_JOURNAL": str(state / "events.ndjson"),
                "CGPT_JOURNAL_CHECKPOINT_PATH": str(state / "checkpoint.json"),
                "CGPT_BROKER_INSTANCE_LOCK": str(state / "broker.instance.lock"),
                "CGPT_AUTO_REMEDIATION_CB_STATE_PATH": str(state / "circuit.json"),
                "CGPT_CONTROLLER_URL": "http://127.0.0.1:0",
            }
            child = subprocess.Popen(
                [sys.executable, "-B", str(ROOT / "src/cgpt_approval_bridge_server.py")],
                stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                text=True, env=environment, cwd=ROOT,
            )
            try:
                child.stdin.write(json.dumps({"jsonrpc": "2.0", "id": 1, "method": "initialize"}) + "\n")
                child.stdin.flush()
                with selectors.DefaultSelector() as selector:
                    selector.register(child.stdout, selectors.EVENT_READ)
                    self.assertTrue(selector.select(5), "initialisation MCP absente")
                    self.assertEqual(json.loads(child.stdout.readline())["id"], 1)
                arguments = {"approval_id": "approval-eof", "change_id": "synthetic-eof",
                             "title": "Synthetic EOF approval", "files": ["fixture.txt"]}
                child.stdin.write(json.dumps({"jsonrpc": "2.0", "id": 2, "method": "tools/call",
                    "params": {"name": "request_validation", "arguments": arguments}}) + "\n")
                child.stdin.flush()
                deadline = time.monotonic() + 5
                before = None
                while time.monotonic() < deadline:
                    try:
                        before = json.loads((state / "approvals.json").read_text())["approvals"].get("approval-eof")
                    except FileNotFoundError:
                        pass
                    if before:
                        break
                    time.sleep(0.02)
                self.assertIsNotNone(before, "demande non persistée")
                self.assertEqual(before["status"], "PENDING")
                started = time.monotonic()
                child.stdin.close()
                child.stdin = None
                child.stdout.close()
                child.stdout = None
                _, errors = child.communicate(timeout=5)
                self.assertEqual(child.returncode, 0, errors)
                self.assertLess(time.monotonic() - started, 5)
                after = json.loads((state / "approvals.json").read_text())["approvals"]["approval-eof"]
                self.assertEqual(after["status"], "PENDING")
                for key in ["approval_id", "change_id", "title", "files", "created_at", "decision"]:
                    self.assertEqual(after.get(key), before.get(key), key)
                with (state / "broker.instance.lock").open("r+") as lock:
                    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            finally:
                if child.poll() is None:
                    child.kill()
                child.communicate()


if __name__ == "__main__":
    unittest.main()
