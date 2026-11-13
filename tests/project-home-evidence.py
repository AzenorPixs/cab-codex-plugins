"""Audit borné des reçus des tests externes et de la livraison, sans les rejouer."""
import hashlib
import json
from pathlib import Path

root=Path(__file__).resolve().parents[1]
proofs=root/'output/scm/cab-3.0.0'
tests=json.loads((proofs/'project-home-tests-proof.json').read_text())
assert tests['tests']==26 and all(row['exit_code']==0 for row in tests['commands'])
assert hashlib.sha256((proofs/'project-home-final-tests.log').read_bytes()).hexdigest()==tests['log_sha256']
browser=json.loads((proofs/'project-home-browser-proof.json').read_text())
assert {row['browser'] for row in browser['results']}=={'Chromium','Firefox'}
for row in browser['results']:
    assert row['cached_display_ms']<2000 and row['delayed_refresh_ms']==8000
    assert all(row[key] for key in ('electric_external_replacement','removed_fields','file_deletion_recreation','home_and_sessions_routes','canonical_redirect','no_secret','mobile'))
bootstrap=json.loads((proofs/'project-home-bootstrap-proof.json').read_text())
assert all(bootstrap[key] for key in ('fresh_web_bootstrap','postgresql_migrations','electric_real_shape','private_projects_table_not_readable'))
archive=root/'openspec/changes/archive/2026-11-13-add-project-home-and-env-sync'
assert archive.is_dir() and not (root/'openspec/changes/add-project-home-and-env-sync').exists()
assert '- [ ]' not in (archive/'tasks.md').read_text()
assert (archive/'STATISTICS.md').stat().st_size>0
release=json.loads((proofs/'project-home-delivery-proof.json').read_text())
assert release['version']=='3.2.0' and release['cicd_exit_code']==0
assert release['forgejo_published'] and release['github_published'] and release['package_verified']
print(json.dumps({'audit':'passed','python_tests':26,'browsers':['Chromium','Firefox'],'archive_and_statistics':True,'delivery_version':'3.2.0'}))
