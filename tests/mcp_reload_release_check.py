"""Contrôle natif de livraison ; ne fabrique aucun reçu ni acquittement MCP."""
import json
from pathlib import Path
import sys
import unittest
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'src'));base=ROOT/'output/scm/cab-3.0.0'
for name,count in [('mcp-323-transport-unit.log',5),('mcp-323-registry-unit.log',4),('mcp-323-update-regression.log',20)]:
    value=(base/name).read_text();assert f'Ran {count} tests' in value and '\nOK\n' in value,name
public=json.loads((base/'mcp-323-public.json').read_text());assert {row['agent'] for row in public}=={'codex','opencode'}
assert all(row['business_finished_before_reload'] and row['one_execution_only'] and row['worker_replaced'] and row['catalog_ack_observed'] and row['same_run_sid_generation_and_receipt'] for row in public)
browser=json.loads((base/'mcp-323-browser.json').read_text());assert len(browser['results'])==2 and all(row['legacy_requirement_visible'] and row['no_new_installation_enabled'] for row in browser['results'])
native=json.loads((base/'mcp-323-native-integrations.log').read_text().splitlines()[-1]);assert native['idempotent_registration'] and native['unrelated_configuration_preserved']
release=json.loads((base/'release-323.json').read_text());assert release['version']=='3.2.3' and release['github_asset_matches']
assert all(json.loads((base/'preservation-323.json').read_text())['preserved'].values())
result=unittest.TextTestRunner().run(unittest.defaultTestLoader.discover(str(ROOT/'tests'),pattern='test_mcp_bridge.py'));assert result.wasSuccessful()
print('MCP-323: two supervised profiles, actual single execution, catalog acknowledgement, native integration and delivery verified; legacy reload is never fabricated.')
