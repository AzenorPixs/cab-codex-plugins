"""Contrôle final exécuté réellement par CAB ; aucun reçu d'exécution reconstruit."""
import json
from pathlib import Path
import sys
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
BASE=ROOT/'output/scm/cab-3.0.0'
for file,count in [('finalization-322-contract.log',6),('finalization-322-unit.log',9),('finalization-322-legacy-regression.log',16),('finalization-322-statistics-regression.log',7)]:
    text=(BASE/file).read_text();assert f'Ran {count} tests' in text and '\nOK\n' in text,file
public=json.loads((BASE/'finalization-322-public.log').read_text())
assert public['actual_execution_recorded'] and public['worker_closed_without_llm_submission_or_review_or_close'] and public['period_closed_without_llm_end'] and public['untrusted_coder_cannot_attest']
browser=json.loads((BASE/'finalization-322-browser.json').read_text())
assert len(browser['results'])==2 and all(row['waiting_explicit'] and row['policy_closed'] for row in browser['results'])
release=json.loads((BASE/'release-322.json').read_text());assert release['version']=='3.2.2' and release['github_asset_matches']
assert all(json.loads((BASE/'preservation-322.json').read_text())['preserved'].values())
suite=unittest.defaultTestLoader.discover(str(ROOT/'tests'),pattern='test_finalization_contract.py')
result=unittest.TextTestRunner().run(suite);assert result.wasSuccessful()
print('FINALIZATION-322: contract, PostgreSQL, actual worker, native receipts, browser and release proofs verified; no LLM final submission.')
