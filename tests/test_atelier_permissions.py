import hashlib
import os
import stat
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'src'))
import cgpt_approval_bridge_atelier as atelier


class AtelierGroupPermissionsTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(dir=ROOT / '.cab-tests', prefix='permissions-')
        self.addCleanup(self.tmp.cleanup)
        self.home = Path(self.tmp.name)
        self.workspace = '/test/workspace'
        self.parent = self.home / '.local/state/cab-ateliers'
        self.parent.mkdir(parents=True, mode=0o770)
        self.parent.chmod(0o2770)
        self.job = self.parent / hashlib.sha256(self.workspace.encode()).hexdigest()

    def test_normalized_group_directory_and_new_receipt(self):
        self.job.mkdir(mode=0o770)
        self.job.chmod(0o2770)
        self.assertEqual(atelier.private_jobs(self.workspace, self.home), self.job)
        path = self.job / 'receipt.json'
        atelier.save(path, {'status': 'COMPLETED'})
        self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o770)
        self.assertEqual(atelier.read_job(path), {'status': 'COMPLETED'})
        path.chmod(0o600)
        self.assertEqual(atelier.read_job(path), {'status': 'COMPLETED'})

    def test_new_directory_is_770_even_with_restrictive_umask(self):
        old = os.umask(0o077)
        try:
            path = atelier.private_jobs(self.workspace, self.home)
        finally:
            os.umask(old)
        self.assertEqual(stat.S_IMODE(path.stat().st_mode) & 0o777, 0o770)

    def test_rejects_other_access_and_non_member_group(self):
        self.job.mkdir()
        self.job.chmod(0o777)
        with self.assertRaisesRegex(atelier.AtelierError, 'atelier-jobs-not-private'):
            atelier.private_jobs(self.workspace, self.home)
        self.job.chmod(0o770)
        with patch.object(atelier.os, 'getgroups', return_value=[]), patch.object(atelier.os, 'getgid', return_value=self.job.stat().st_gid + 10000):
            with self.assertRaisesRegex(atelier.AtelierError, 'atelier-jobs-not-private'):
                atelier.private_jobs(self.workspace, self.home)

    def test_rejects_directory_symlink_and_receipt_symlink_or_hardlink(self):
        other = self.home / 'other'
        other.mkdir()
        self.job.symlink_to(other, target_is_directory=True)
        with self.assertRaisesRegex(atelier.AtelierError, 'atelier-jobs-not-private'):
            atelier.private_jobs(self.workspace, self.home)
        self.job.unlink()
        self.job.mkdir()
        target = self.job / 'target.json'
        atelier.save(target, {'status': 'COMPLETED'})
        link = self.job / 'link.json'
        link.symlink_to(target)
        with self.assertRaisesRegex(atelier.AtelierError, 'atelier-job-not-private'):
            atelier.read_job(link)
        link.unlink()
        link.symlink_to(self.job / 'absent.json')
        with self.assertRaisesRegex(atelier.AtelierError, 'atelier-job-not-private'):
            atelier.read_job(link)
        link.unlink()
        target.chmod(0o777)
        with self.assertRaisesRegex(atelier.AtelierError, 'atelier-job-not-private'):
            atelier.read_job(target)
        target.chmod(0o770)
        os.link(target, link)
        with self.assertRaisesRegex(atelier.AtelierError, 'atelier-job-not-private'):
            atelier.read_job(target)


if __name__ == '__main__':
    unittest.main()
