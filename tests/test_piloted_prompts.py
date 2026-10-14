import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("cab_prompts", ROOT / "plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py")
prompts = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prompts)


class PilotedPromptsTest(unittest.TestCase):
    def test_only_piloted_catalog_entries_are_selected(self):
        self.assertEqual(len(prompts.PILOTED), 9)
        self.assertTrue({"CISM", "CAISM", "SCM", "ISM", "RSM", "SPCM"}.isdisjoint(prompts.PILOTED))

    def test_cycle_selection_is_reserved_and_checkpoint_scoped(self):
        source = "un seul change est traité à la fois ;\naucun change n’est créé tant qu’un change actif existe ;\noutput/cismp-state.json\n"
        transformed = prompts.transform(source, "CISMP")
        self.assertIn("à la fois par RUN", transformed)
        self.assertIn("avant sa réservation atomique", transformed)
        self.assertIn("output/cismp/<run_id>/state.json", transformed)
        self.assertIn("POST /runs/reserve", transformed)
        self.assertIn("reservation_version", transformed)
        self.assertEqual(prompts.transform(transformed, "CISMP"), transformed)

    def test_unrelated_native_and_authorization_rules_are_preserved(self):
        source = 'Ne jamais lire un secret.\nPermissions natives ask.\nUn mandat = une opération.\n'
        self.assertTrue(prompts.transform(source, "ACSP").startswith(source))


if __name__ == "__main__":
    unittest.main()
