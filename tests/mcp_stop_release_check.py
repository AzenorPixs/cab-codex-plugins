"""Contrôle final réel CAB ; aucun reçu ni état de connexion n'est inventé."""
import json
from pathlib import Path
import sys
import unittest
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'src'));base=ROOT/'output/scm/cab-3.0.0'
for name,count in [('mcp-324-stop-unit.log',6),('mcp-324-bridge-regression.log',5),('mcp-324-projection-unit.log',3),('mcp-324-registry-regression.log',4)]:
    value=(base/name).read_text();assert f'Ran {count} tests' in value and '\nOK\n' in value,name
public=json.loads((base/'mcp-324-public.json').read_text());assert len(public)==2 and all(row['stop_audit_persisted'] and row['one_execution_only'] and row['catalog_ack_observed'] for row in public)
browser=json.loads((base/'mcp-324-browser.json').read_text());assert len(browser['results'])==4 and all(row['no_document_reload'] and row['green_bold_dot'] and row['live_electric_version'] and row['live_disconnection'] for row in browser['results'])
release=json.loads((base/'release-324.json').read_text());assert release['version']=='3.2.4' and release['github_asset_matches']
assert all(json.loads((base/'preservation-324.json').read_text())['preserved'].values())
result=unittest.TextTestRunner().run(unittest.defaultTestLoader.discover(str(ROOT/'tests'),pattern='test_worker_stop.py'));assert result.wasSuccessful()
print('MCP-324: bounded PID-safe stop, real SIGKILL fixture, audit, Electric live versions, browsers and delivery verified.')
