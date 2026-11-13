"""Audit final des preuves natives et externes sans réémettre une installation."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1];proofs=root/'output/scm/cab-3.0.0'
tests=json.loads((proofs/'self-update-tests-proof.json').read_text())
assert tests['tests']>=54 and all(row['exit_code']==0 for row in tests['commands'])
native=json.loads((proofs/'self-update-native-mcp-proof.json').read_text())
assert native['state']=='OK' and native['version']=='3.2.1' and native['verified'] is True
activation=json.loads((proofs/'self-update-activation-proof.json').read_text())
assert activation['package_status']=='install ok installed' and activation['version']=='3.2.1'
assert activation['service_active'] and activation['health_ready'] and activation['finalization_verified']
delivery=json.loads((proofs/'self-update-delivery-proof.json').read_text())
assert delivery['version']=='3.2.1' and delivery['cicd_exit_code']==0 and delivery['forgejo_published'] and delivery['github_published']
archive=root/'openspec/changes/archive/2026-11-13-align-packaged-integration-versions'
assert archive.is_dir() and '- [ ]' not in (archive/'tasks.md').read_text() and (archive/'STATISTICS.md').is_file()
print(json.dumps({'state':'PASS','version':'3.2.1','native_mcp_ok':True,'configured_package':True,'source_tests':tests['tests'],'archive_and_delivery':True}))
