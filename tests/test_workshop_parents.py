"""Parents d'atelier sous umask privée : vrais fichiers, sans RUN ou base modifié."""
import os
from pathlib import Path
import pwd
import tempfile
from types import SimpleNamespace
import unittest
os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
import django
django.setup()
from cab_platform.workshops import _direct_parents,_parent
from cab_platform.core.commands import Refused

class WorkshopParentTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        self.project=self.root/'project';self.project.mkdir(mode=0o770)
        self.run=SimpleNamespace(project=SimpleNamespace(root=str(self.project)),actor=SimpleNamespace(uid=os.getuid()),change='change-test')
    def tearDown(self):self.tmp.cleanup()
    def test_private_umask_and_known_run_preserved(self):
        old=os.umask(0o077)
        try:parent=_direct_parents(self.run)
        finally:os.umask(old)
        self.assertEqual(parent.stat().st_mode&0o777,0o770)
        self.assertEqual(parent.stat().st_gid,self.project.stat().st_gid)
        target=parent/'RUN-ONE';target.mkdir(mode=0o700);(target/'evidence').write_text('preserved');before=target.stat()
        parent.chmod(0o2700);_direct_parents(self.run)
        self.assertEqual(parent.stat().st_mode&0o777,0o770)
        self.assertEqual(target.stat().st_ino,before.st_ino);self.assertEqual(target.stat().st_mode,before.st_mode)
        self.assertEqual((target/'evidence').read_text(),'preserved')
    def test_symlink_and_world_writable_parent_refused(self):
        elsewhere=self.root/'elsewhere';elsewhere.mkdir();before=elsewhere.stat().st_mode
        (self.project/'.cab-tests').symlink_to(elsewhere)
        with self.assertRaises(Refused):_direct_parents(self.run)
        self.assertEqual(elsewhere.stat().st_mode,before)
        (self.project/'.cab-tests').unlink();(self.project/'.cab-tests').mkdir();(self.project/'.cab-tests').chmod(0o777)
        with self.assertRaises(Refused):_direct_parents(self.run)
        self.assertEqual((self.project/'.cab-tests').stat().st_mode&0o777,0o777)
    def test_shared_tmp_prefix_is_traversable_under_umask(self):
        path=self.root/'prefix';old=os.umask(0o077)
        try:_parent(path)
        finally:os.umask(old)
        self.assertEqual(path.stat().st_mode&0o777,0o711)

if __name__=='__main__':unittest.main()
