"""Sources synthétiques : ciblage du SID, confidentialité et refus de liens."""
from datetime import datetime,timezone
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import uuid
from cab_platform import native_sources as native

SID='01a1c9e3-bed3-7a52-abca-0ea08eaa71d9'

class NativeSourceTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.home=Path(self.tmp.name);self.root=str(self.home/'project')
        day=datetime.fromtimestamp((uuid.UUID(SID).int>>80)/1000,timezone.utc).strftime('%Y/%m/%d')
        self.folder=self.home/'.codex/sessions'/day;self.folder.mkdir(parents=True)
        self.path=self.folder/('rollout-fixture-'+SID+'.jsonl');self.write()
    def tearDown(self):self.tmp.cleanup()
    def write(self,sid=SID,root=None):
        self.path.write_bytes((json.dumps({'type':'session_meta','payload':{'id':sid,'cwd':self.root if root is None else root}})+'\n').encode()+b'private fixture content, deliberately invalid JSON\n')
    def test_default_home_and_custom_home_locate_only_exact_file(self):
        other=self.folder/'rollout-private-other.jsonl';other.write_text('must not open')
        opened=[];real_open=os.open
        def observed(path,*args,**kwargs):
            opened.append(str(path));self.assertNotEqual(str(path),other.name)
            return real_open(path,*args,**kwargs)
        with patch.object(native.pwd,'getpwuid',return_value=SimpleNamespace(pw_dir=str(self.home))),patch.object(native.os,'open',side_effect=observed):
            found=native.locate(os.getuid(),SID,self.root)
        self.assertEqual(found['source_file'],str(self.path));self.assertNotIn('private',json.dumps(found))
        self.assertEqual(found,native.locate(os.getuid(),SID,self.root,str(self.home/'.codex')))
    def test_missing_ambiguous_and_non_v7_have_no_fallback(self):
        second=self.path.with_name('rollout-second-'+SID+'.jsonl');second.write_text('not opened')
        with self.assertRaisesRegex(native.NativeSourceError,'ambiguous'):native.locate(os.getuid(),SID,self.root,str(self.home/'.codex'))
        second.unlink();self.path.unlink()
        with self.assertRaisesRegex(native.NativeSourceError,'not-found'):native.locate(os.getuid(),SID,self.root,str(self.home/'.codex'))
        with self.assertRaisesRegex(native.NativeSourceError,'explicit-path-required'):native.locate(os.getuid(),'SID-LEGACY',self.root,str(self.home/'.codex'))
    def test_identity_and_owner_are_verified(self):
        for sid,root in [('another',self.root),(SID,'/another-project')]:
            self.write(sid,root)
            with self.assertRaisesRegex(native.NativeSourceError,'identity-divergent'):native.inspect(os.getuid(),SID,self.root,str(self.path))
        self.write()
        with self.assertRaisesRegex(native.NativeSourceError,'owner-invalid'):native.inspect(os.getuid()+1,SID,self.root,str(self.path))
    def test_symlink_hardlink_and_fifo_are_refused_without_blocking(self):
        target=self.path.with_name('target');self.path.rename(target);self.path.symlink_to(target)
        with self.assertRaises(native.NativeSourceError):native.inspect(os.getuid(),SID,self.root,str(self.path))
        self.path.unlink();os.link(target,self.path)
        with self.assertRaisesRegex(native.NativeSourceError,'owner-invalid'):native.inspect(os.getuid(),SID,self.root,str(self.path))
        self.path.unlink();os.mkfifo(self.path)
        with self.assertRaisesRegex(native.NativeSourceError,'owner-invalid'):native.inspect(os.getuid(),SID,self.root,str(self.path))
    def test_malformed_header_and_parent_symlink_are_refused(self):
        for text in ['not-json','[]','x'*65537]:
            self.path.write_text(text)
            with self.assertRaises(native.NativeSourceError):native.inspect(os.getuid(),SID,self.root,str(self.path))
        self.write();link=self.home/'linked';link.symlink_to(self.folder,target_is_directory=True)
        with self.assertRaises(native.NativeSourceError):native.inspect(os.getuid(),SID,self.root,str(link/self.path.name))

if __name__=='__main__':unittest.main()
