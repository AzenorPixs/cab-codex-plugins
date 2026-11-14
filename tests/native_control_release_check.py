"""Qualification fraîche : contrats purs et API des SDK réels sur profils temporaires."""
import os
from pathlib import Path
import subprocess
import sys
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'src'),'/usr/lib/cab/python-vendor']
suite=unittest.TestSuite()
for pattern in ('test_client_access.py','test_mcp_bridge.py','test_agent_inventory.py','test_agent_release_split.py'):
    suite.addTests(unittest.defaultTestLoader.discover(str(ROOT/'tests'),pattern=pattern))
if not unittest.TextTestRunner(verbosity=1).run(suite).wasSuccessful():raise SystemExit(1)
env={**os.environ,'PYTHONPATH':str(ROOT/'src')+':/usr/lib/cab/python-vendor','PYTHONDONTWRITEBYTECODE':'1'}
for binary in ('/usr/lib/chatgpt/resources/codex','/usr/local/lib/codex/packages/standalone/current/bin/codex'):
    subprocess.run([sys.executable,'-B',str(ROOT/'tests/platform-native-codex.py'),binary],env=env,check=True,timeout=50)
print('Contrats et deux API natives réelles qualifiés ; profils temporaires, zéro tour LLM et aucun travail utilisateur rejoué.')
