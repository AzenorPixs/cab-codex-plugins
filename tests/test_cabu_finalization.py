"""Finalisation sans APT, idempotence et reprise par profil sur fichiers isolés."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from cab_platform import __version__,finalization,integration,update
from cab_platform.client import ClientError

class FinalizationTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);self.state=self.root/'state';self.package=self.root/'package';self.home=self.root/'home';self.home.mkdir()
        self.user=SimpleNamespace(pw_uid=os.getuid(),pw_gid=os.getgid(),pw_name='fixture',pw_dir=str(self.home));self.native=[];self.fail_opencode=False
        for label,folder in [('CAB','cab'),('CCAB','ccab'),('CABU','cabu')]:
            source=self.package/'plugins'/folder;(source/'.codex-plugin').mkdir(parents=True);(source/'.codex-plugin/plugin.json').write_text(json.dumps({'name':label,'version':__version__}));(source/'skills'/folder).mkdir(parents=True);(source/'skills'/folder/'SKILL.md').write_text('public fixture '+label)
            (self.package/'commands').mkdir(exist_ok=True);(self.package/'commands'/(label+'.md')).write_text('public command '+label)
        self.cfg={'initialized':True,'integrations':[{'agent':'codex','uid':os.getuid()},{'agent':'codex','uid':os.getuid()},{'agent':'opencode','uid':os.getuid()}]}
        self.patches=[patch.object(finalization,'registered_profiles',return_value=[]),patch.object(finalization,'STATE',self.state),patch.object(integration,'STATE',self.state),patch.object(update,'STATE',self.state),patch.object(finalization,'config',side_effect=lambda:self.cfg),patch.object(finalization,'verify',return_value={'version':__version__,'state':'READY','initialized':True}),patch.object(integration.pwd,'getpwnam',return_value=self.user),patch.object(finalization.pwd,'getpwuid',return_value=self.user),patch.object(integration,'_integrate',side_effect=self.apply)]
        for item in self.patches:item.start()
    def tearDown(self):
        for item in reversed(self.patches):item.stop()
        self.tmp.cleanup()
    def apply(self,agent,username,workspace=None,package_root=None):
        self.native.append(agent)
        if agent=='opencode' and self.fail_opencode:raise ClientError('synthetic-failure')
        target=self.home/('.codex/config.toml' if agent=='codex' else '.config/opencode/opencode.json');target.parent.mkdir(parents=True,exist_ok=True);target.write_text('fixture configuration '+agent);target.chmod(0o600)
        if agent=='codex':
            commands=self.home/'.codex/commands';commands.mkdir(parents=True,exist_ok=True)
            for label,folder in [('CAB','cab'),('CCAB','ccab'),('CABU','cabu')]:
                shutil.copyfile(self.package/'commands'/(label+'.md'),commands/(label+'.md'))
                shutil.copytree(self.package/'plugins'/folder,self.home/'.codex/plugins/cache/cab_codex_plugins'/label/__version__,dirs_exist_ok=True)
        return {'agent':agent,'uid':self.user.pw_uid,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'configuration':str(target)}
    def test_root_secrets_are_not_forwarded_to_native_cli(self):
        with patch.dict(os.environ,{'CAB_ADMIN_TOKEN':'synthetic-private','OPENAI_API_KEY':'synthetic-private'}):
            env=integration.user_environment(self.user)
        self.assertNotIn('CAB_ADMIN_TOKEN',env);self.assertNotIn('OPENAI_API_KEY',env);self.assertEqual(env['HOME'],self.user.pw_dir)
    def test_direct_finalize_repeated_without_duplicate_extensions(self):
        first=finalization.finalize(self.package);second=finalization.finalize(self.package)
        self.assertTrue(first['verified']);self.assertEqual(first['finalization_id'],second['finalization_id']);self.assertEqual(self.native,['codex','opencode'])
        self.assertTrue(all(item['unchanged'] for item in second['integrations']))
        self.assertEqual((self.state/'last-finalization.json').stat().st_mode&0o777,0o600)
    def test_failure_resumes_only_incomplete_profile_and_repairs_missing_cache(self):
        self.fail_opencode=True
        with self.assertRaises(ClientError):finalization.finalize(self.package)
        saved=json.loads((self.state/'last-finalization.json').read_text());self.assertFalse(saved['verified'])
        self.fail_opencode=False;self.assertTrue(finalization.finalize(self.package)['verified']);self.assertEqual(self.native,['codex','opencode','opencode'])
        cached=self.home/'.codex/plugins/cache/cab_codex_plugins/CAB'/__version__/'skills/cab/SKILL.md';cached.unlink();finalization.finalize(self.package)
        self.assertEqual(self.native[-1],'codex');self.assertTrue(cached.exists())
    def test_bootstrap_defers_without_touching_profiles(self):
        self.cfg['initialized']=False;result=finalization.finalize(self.package)
        self.assertTrue(result['deferred']);self.assertEqual(self.native,[]);self.assertEqual(list(self.home.iterdir()),[])
    def test_update_invokes_apt_once_then_reads_postinst_finalization(self):
        package=self.root/'cab.deb';package.write_bytes(b'fixture-public-package');calls=[]
        def run(argv,**options):
            calls.append(argv)
            if argv[0]=='/usr/bin/apt-get':finalization.finalize(self.package);return subprocess.CompletedProcess(argv,0,'','')
            self.assertEqual(argv,['/usr/bin/cab','finalize']);return subprocess.CompletedProcess(argv,0,json.dumps(finalization.finalize(self.package)),'')
        with patch.object(update.subprocess,'check_output',return_value='cab\n'),patch.object(update.subprocess,'run',side_effect=run):result=update.update(str(package))
        self.assertTrue(result['verified']);self.assertEqual(len(calls),2);self.assertEqual(self.native,['codex','opencode']);self.assertEqual(result['package_sha256'],hashlib.sha256(package.read_bytes()).hexdigest())

if __name__=='__main__':unittest.main()
