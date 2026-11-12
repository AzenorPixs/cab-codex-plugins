"""Configuration privée : aucun accès au fichier hôte ou à sa base."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'src'))
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
import django
django.setup()
from cab_platform import administration as admin,paths
from cab_platform.core.commands import Refused

class ConfigurationTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(dir=ROOT/'output/scm/cab-3.0.0');self.root=Path(self.tmp.name)
        self.file=self.root/'cab.json';self.state=self.root/'state'
        self.original={'initialized':True,'version':'3.0.0','database_host':'127.0.0.1','database_port':5433,'database_password':'synthetic-database-secret','logging':{'level':'INFO'}}
        self.file.write_text(json.dumps(self.original));self.file.chmod(0o600)
        self.context=patch.multiple(admin,CONFIG=self.file,STATE=self.state,config=lambda:json.loads(self.file.read_text()),runtime_config=lambda:copy.deepcopy(self.original));self.context.start()
    def tearDown(self):self.context.stop();self.tmp.cleanup()
    def test_mask_preserve_backup_and_live_log_level(self):
        before=admin.view();self.assertNotIn('synthetic-database-secret',json.dumps(before))
        changes=before['configuration'];changes['logging']={'level':'DEBUG'}
        result=admin.save(before['revision'],changes)
        self.assertTrue(result['logging_reload']);self.assertFalse(result['restart_required'])
        saved=json.loads(self.file.read_text());self.assertEqual(saved['database_password'],self.original['database_password']);self.assertEqual(saved['logging']['level'],'DEBUG')
        self.assertEqual(self.file.stat().st_mode&0o777,0o600)
        backup=next((self.state/'configuration-backups').glob('*.json'));self.assertEqual(json.loads(backup.read_text()),self.original)
    def test_revision_and_lifecycle_fields_are_protected(self):
        before=admin.view()
        with self.assertRaises(Refused):admin.save('stale',{'logging':{'level':'DEBUG'}})
        with self.assertRaises(Refused):admin.save(before['revision'],{'initialized':False})
        with self.assertRaises(Refused):admin.save(before['revision'],{'logging':{'level':'invalid'}})
        self.assertEqual(json.loads(self.file.read_text()),self.original)
    def test_technical_configuration_waits_for_restart(self):
        before=admin.view();result=admin.save(before['revision'],{'database_port':5434})
        self.assertTrue(result['restart_required']);self.assertEqual(result['pending_fields'],['database_port']);self.assertFalse(result['logging_reload'])
    def test_agent_paths_hot_and_web_urls_validated(self):
        before=admin.view()
        result=admin.save(before['revision'],{'opencode_binary':'/opt/agent/opencode'})
        self.assertFalse(result['restart_required'])
        for value in ['relative/path','bad\npath']:
            with self.assertRaises(Refused):admin.save(result['revision'],{'codex_binary':value})
        for url in ['https://user:password@example.org','https://example.org/path','https://*.example.org','file:///tmp']:
            with self.assertRaises(Refused):admin.save(result['revision'],{'web_public_urls':[url]})
        result=admin.save(result['revision'],{'web_public_urls':['https://cab.example.org']})
        self.assertEqual(result['pending_fields'],['web_public_urls'])
    def test_runtime_snapshot_and_first_initialization(self):
        saved={'initialized':False}
        with patch.object(paths,'_active_config',None),patch.object(paths,'config',side_effect=lambda:copy.deepcopy(saved)):
            self.assertFalse(paths.runtime_config()['initialized'])
            saved.update(initialized=True,database_port=5433)
            self.assertEqual(paths.runtime_config()['database_port'],5433)
            saved['database_port']=5434
            self.assertEqual(paths.runtime_config()['database_port'],5433)

if __name__=='__main__':unittest.main()
