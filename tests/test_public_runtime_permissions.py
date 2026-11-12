"""Archives synthétiques publiques : permissions et import sous un autre UID."""
import hashlib
import json
import os
from pathlib import Path
import pwd
import subprocess
import sys
import tarfile
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from cab_platform.package_install import install

class PublicRuntimeTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(prefix='cab-public-runtime-');self.base=Path(self.tmp.name);self.base.chmod(0o755)
        self.root=self.base/'installed';self.root.mkdir(mode=0o755)
        manifest={'version':'fixture','archives':{}}
        for name in ['python-vendor','electric']:
            payload=self.base/(name+'-source');payload.mkdir(mode=0o700)
            if name=='python-vendor':
                package=payload/'public_fixture';package.mkdir(mode=0o700);module=package/'__init__.py';module.write_text('VALUE=42\n');module.chmod(0o640)
            else:
                binary=payload/'bin';binary.mkdir(mode=0o700);entry=binary/'entrypoint';entry.write_text('#!/bin/sh\nprintf "PUBLIC-RUNTIME-OK\\n"\n');entry.chmod(0o700)
            archive=self.root/(name+'.tar.xz')
            with tarfile.open(archive,'w:xz') as stream:
                for path in payload.iterdir():stream.add(path,arcname=path.name)
            manifest['archives'][name]={'file':archive.name,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()}
        (self.root/'runtime-manifest.json').write_text(json.dumps(manifest));self.private=self.root/'private-state';self.private.write_text('synthetic-private');self.private.chmod(0o600)
    def tearDown(self):self.tmp.cleanup()
    def test_private_umask_public_import_and_execution(self):
        previous=os.umask(0o077)
        try:install(self.root)
        finally:os.umask(previous)
        self.assertEqual((self.root/'python-vendor').stat().st_mode&0o777,0o755)
        self.assertEqual((self.root/'python-vendor/public_fixture/__init__.py').stat().st_mode&0o777,0o644)
        self.assertEqual((self.root/'electric/bin/entrypoint').stat().st_mode&0o777,0o755)
        self.assertEqual(self.private.stat().st_mode&0o777,0o600)
        options={}
        if os.getuid()==0:
            user=next(user for user in pwd.getpwall() if user.pw_uid>0)
            options={'user':user.pw_uid,'group':user.pw_gid,'extra_groups':[]}
        script='import sys;sys.path.insert(0,sys.argv[1]);import public_fixture;assert public_fixture.VALUE==42'
        result=subprocess.run([sys.executable,'-B','-c',script,str(self.root/'python-vendor')],cwd=self.base,capture_output=True,text=True,**options)
        self.assertEqual(result.returncode,0,result.stderr)
        result=subprocess.run([str(self.root/'electric/bin/entrypoint')],cwd=self.base,capture_output=True,text=True,**options)
        self.assertEqual(result.stdout.strip(),'PUBLIC-RUNTIME-OK');self.assertEqual(result.returncode,0)
    def test_integrity_failure_keeps_existing_runtime(self):
        directory=self.root/'python-vendor';directory.mkdir();marker=directory/'retained';marker.write_text('unchanged')
        with (self.root/'python-vendor.tar.xz').open('ab') as stream:stream.write(b'tampered')
        with self.assertRaisesRegex(RuntimeError,'runtime-archive-integrity-invalid'):install(self.root)
        self.assertEqual(marker.read_text(),'unchanged')

if __name__=='__main__':unittest.main()
