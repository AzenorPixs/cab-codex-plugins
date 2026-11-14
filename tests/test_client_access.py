"""Accès réellement accordé par l'OS ; aucune normalisation du profil."""
import json
import os
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch
from cab_platform.client import Client,ClientError

class ClientAccessTests(unittest.TestCase):
    def test_heterogeneous_modes_are_accepted_and_unchanged(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'profile.json';payload={'actor_id':'fixture','token':'fixture-only'}
            path.write_text(json.dumps(payload))
            with patch.dict(os.environ,{'CAB_CLIENT_FILE':str(path)}):
                for mode in (0o400,0o600,0o640,0o660,0o770,0o777):
                    with self.subTest(mode=oct(mode)):
                        path.chmod(mode);before=path.read_bytes()
                        self.assertEqual(Client().profile,payload)
                        self.assertEqual(path.read_bytes(),before)
                        self.assertEqual(stat.S_IMODE(path.stat().st_mode),mode)
    def test_atomic_state_rewrite_preserves_existing_mode(self):
        from cab_platform.paths import atomic_json
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'state.json';path.write_text('{}');path.chmod(0o770)
            atomic_json(path,{'updated':True})
            self.assertEqual(stat.S_IMODE(path.stat().st_mode),0o770)
            self.assertEqual(json.loads(path.read_text()),{'updated':True})
    def test_object_integrity_remains_distinct_from_permissions(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'profile.json';path.write_text('{}');other=Path(folder)/'linked.json';os.link(path,other)
            with patch.dict(os.environ,{'CAB_CLIENT_FILE':str(path)}):
                with self.assertRaisesRegex(ClientError,'client-profile-unsafe'):Client()
            other.unlink();path.unlink();path.symlink_to(Path(folder)/'missing')
            with patch.dict(os.environ,{'CAB_CLIENT_FILE':str(path)}):
                with self.assertRaises(OSError):Client()

if __name__=='__main__':unittest.main()
