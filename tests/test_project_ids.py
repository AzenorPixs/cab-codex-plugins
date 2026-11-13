"""Extraction littérale bornée ; valeurs rejetées jamais affichées."""
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from cab_platform.project_ids import identifier_for_root

class ProjectIdTests(unittest.TestCase):
    def test_literal_id_and_ambiguity_without_execution(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);p=root/'project.env'
            p.write_text('PROJECT_ID="pixs"\nUNRELATED_VALUE=not-used\n');self.assertEqual(identifier_for_root(root),'pixs')
            for value in ['PROJECT_ID=$(touch should-not-exist)\n','PROJECT_ID=pixs\nPROJECT_ID=other\n','export PROJECT_ID=pixs\n']:
                p.write_text(value);self.assertIsNone(identifier_for_root(root))
            self.assertFalse((root/'should-not-exist').exists())
    def test_missing_config_uses_folder_and_symlink_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);self.assertEqual(identifier_for_root(root),root.name)
            (root/'project.env').symlink_to('/etc/passwd');self.assertIsNone(identifier_for_root(root))

if __name__=='__main__':unittest.main()
