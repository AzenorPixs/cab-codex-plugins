from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py"


class PilotedPromptsTest(unittest.TestCase):
    def test_retired_propagator_has_no_project_effect(self):
        with tempfile.TemporaryDirectory() as directory:
            project = Path(directory)
            sentinel = project / "sentinel.md"
            sentinel.write_text("conservé", encoding="utf-8")
            before = {item.name: item.read_bytes() for item in project.iterdir()}
            for args in ([], ["--project", str(project), "--apply"]):
                result = subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True)
                self.assertEqual(result.returncode, 2)
                self.assertIn("contrat CAB distribué", result.stderr)
                self.assertEqual({item.name: item.read_bytes() for item in project.iterdir()}, before)


if __name__ == "__main__":
    unittest.main()
