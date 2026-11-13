"""L’installateur refuse les preuves divergentes, sans appel APT réel."""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from cab_platform import update as u
from cab_platform.client import ClientError

class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.body=b'synthetic-debian-payload';self.version='3.2.1';self.apt_rc=0;self.dpkg_state='install ok installed|3.2.1';self.health={'state':'READY','version':'3.2.1'};self.final={'verified':True,'version':'3.2.1'};self.compare_rc=1
        self.asset={'name':'cab_3.2.1_amd64.deb','digest':'sha256:'+hashlib.sha256(self.body).hexdigest(),'browser_download_url':'https://github.com/AzenorPixs/cab-codex-plugins/releases/download/v3.2.1/cab_3.2.1_amd64.deb'}
        self.patches=[patch.object(u,'STATE',Path(self.tmp.name)),patch.object(u,'os',SimpleNamespace(getuid=lambda:0)),patch.object(u,'urlopen',side_effect=self.urlopen),patch.object(u.subprocess,'check_output',side_effect=self.output),patch.object(u.subprocess,'run',side_effect=self.run_command),patch('cab_platform.client.Client')]
        self.mocks=[item.start() for item in self.patches];self.mocks[-1].return_value.get.side_effect=lambda *a,**k:self.health
    def tearDown(self):
        for item in reversed(self.patches):item.stop()
        self.tmp.cleanup()
    def urlopen(self,request,**kwargs):return io.BytesIO(json.dumps({'assets':[self.asset]}).encode() if hasattr(request,'full_url') else self.body)
    def output(self,argv,**kwargs):
        if argv[0].endswith('dpkg-deb'):return 'cab' if argv[-1]=='Package' else self.version
        return self.dpkg_state if argv[-2]=='-f=${Status}|${Version}' else '3.2.0'
    def run_command(self,argv,**kwargs):
        if argv[0].endswith('/dpkg'):return SimpleNamespace(returncode=self.compare_rc)
        if argv[0].endswith('apt-get'):return SimpleNamespace(returncode=self.apt_rc)
        return SimpleNamespace(returncode=0,stdout=json.dumps(self.final))
    def test_ok_requires_all_checks_and_exact_version(self):
        stages=[];result=u.update(version='3.2.1',progress=stages.append)
        self.assertTrue(result['verified']);self.assertEqual(result['version'],'3.2.1');self.assertEqual(stages,['RESOLVING','DOWNLOADING','INSTALLING','VERIFYING'])
        self.assertTrue((Path(self.tmp.name)/'last-update.json').is_file())
    def test_manual_update_resolves_latest_without_pinned_cached_version(self):
        result=u.update();self.assertEqual(result['version'],'3.2.1')
        self.assertTrue(self.mocks[2].call_args_list[0].args[0].full_url.endswith('/releases/latest'))
    def test_digest_failure_prevents_apt(self):
        self.asset['digest']='sha256:'+'0'*64
        with self.assertRaisesRegex(ClientError,'release-package-integrity-invalid'):u.update(version='3.2.1')
        self.assertFalse(any(call.args[0][0].endswith('apt-get') for call in self.mocks[4].call_args_list))
    def test_non_official_url_prevents_download(self):
        self.asset['browser_download_url']='https://example.org/payload'
        with self.assertRaisesRegex(ClientError,'release-url-invalid'):u.update(version='3.2.1')
    def test_downgrade_is_refused(self):
        self.compare_rc=0
        with self.assertRaisesRegex(ClientError,'update-downgrade-refused'):u.update(version='3.2.1')
    def test_postinst_failure_preserves_error(self):
        self.apt_rc=1
        with self.assertRaisesRegex(ClientError,'debian-update-failed-preserved-receipt'):u.update(version='3.2.1')
    def test_half_configured_package_cannot_be_ok(self):
        self.dpkg_state='install ok half-configured|3.2.1'
        with self.assertRaisesRegex(ClientError,'update-activation-not-verified'):u.update(version='3.2.1')
    def test_wrong_live_version_cannot_be_ok(self):
        self.health['version']='3.2.0'
        with self.assertRaisesRegex(ClientError,'update-activation-not-verified'):u.update(version='3.2.1')
    def test_unverified_finalization_cannot_be_ok(self):
        self.final['verified']=False
        with self.assertRaisesRegex(ClientError,'update-activation-not-verified'):u.update(version='3.2.1')

if __name__=='__main__':unittest.main()
