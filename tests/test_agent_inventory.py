"""Inventaire MCP : ne jamais exposer les secrets des fichiers privés."""
import json
import os
from pathlib import Path
import pwd
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from cab_platform.agent_binaries import mcp_configuration,version

class InventoryTests(unittest.TestCase):
    def test_mcp_metadata_never_contains_credentials(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'opencode.json'
            path.write_text(json.dumps({'mcp':{'cab':{'command':['/usr/bin/cab','secret-argument'],'environment':{'SECRET':'hidden-secret'}},'paused':{'enabled':False,'url':'https://secret.invalid'}}}))
            result=mcp_configuration(path,pwd.getpwuid(os.getuid()),'opencode')
            self.assertEqual(result['state'],'configured')
            self.assertEqual(result['servers'][1]['state'],'disabled')
            self.assertEqual(result['servers'][0]['runtime'],'unverified')
            self.assertNotIn('secret',json.dumps(result))
            path.unlink();path.symlink_to('/etc/passwd')
            self.assertEqual(mcp_configuration(path,pwd.getpwuid(os.getuid()),'opencode')['state'],'unreadable')
    def test_codex_toml_and_invalid_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'config.toml';path.write_text('[mcp_servers.cab]\ncommand="/usr/bin/cab"\nenabled=false\n')
            result=mcp_configuration(path,pwd.getpwuid(os.getuid()),'codex')
            self.assertEqual(result['servers'][0]['state'],'disabled')
            path.write_text('not toml');self.assertEqual(mcp_configuration(path,pwd.getpwuid(os.getuid()),'codex')['state'],'invalid')
    def test_version_stderr_and_bounded_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'agent';path.write_text('#!/bin/sh\necho "agent v2.3.4" >&2\n');path.chmod(0o700)
            self.assertEqual(version(path,pwd.getpwuid(os.getuid())),'2.3.4')
            path.write_text('#!/bin/sh\nexit 1\n');self.assertIsNone(version(path,pwd.getpwuid(os.getuid())))

if __name__=='__main__':unittest.main()
