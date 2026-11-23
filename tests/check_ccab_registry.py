"""Contrôle hôte en lecture seule du registre CCAB et de sa consultation projet."""
import ast
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path('/home/devops/datas/cab')
sys.path.insert(0, '/usr/lib/cab/python')
from cab_platform.client import Client, ClientError

project_id = hashlib.sha256(str(ROOT).encode()).hexdigest()
model = ast.parse((ROOT / 'src/cab_platform/core/models.py').read_text(encoding='utf-8'))
incident = next(node for node in model.body if isinstance(node, ast.ClassDef) and node.name == 'Incident')
meta = next(node for node in incident.body if isinstance(node, ast.ClassDef) and node.name == 'Meta')
assert any(isinstance(node, ast.Assign) and any(isinstance(key, ast.Name) and key.id == 'db_table' for key in node.targets) and ast.literal_eval(node.value) == 'ccab' for node in meta.body)
client = Client()
legacy = client.get('incidents', project_id=project_id)
expected = hashlib.sha256(json.dumps(legacy['incidents'], sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()
assert legacy['snapshot_digest'] == expected
result = client.get('projects/' + project_id + '/incidents', page=1, page_size=2)
assert result['total'] == legacy['total'] and 0 <= len(result['incidents']) <= 2
assert result['page'] == 1 and result['page_size'] == 2
fields = {'incident_id', 'category', 'summary', 'evidence', 'state', 'claim', 'resolution', 'created', 'project_id', 'run_id'}
old = {row['incident_id']: row for row in legacy['incidents']}
for row in result['incidents']:
    assert fields <= row.keys() and row['project_id'] == project_id
    assert isinstance(row['evidence'], list) and isinstance(row['claim'], dict) and isinstance(row['resolution'], dict)
    if row['incident_id'] in old:
        assert all(row[key] == old[row['incident_id']][key] for key in ('category', 'summary', 'evidence'))
last = client.get('projects/' + project_id + '/incidents', page=10**9, page_size=2)
assert last['has_next'] is False
try:
    client.get('projects/' + project_id + '/incidents', page_size=0)
except ClientError as error:
    assert str(error) == 'incident-pagination-invalid'
else:
    raise AssertionError('Pagination invalide acceptée')
for project in client.get('projects')['projects']:
    identifier = project['id']
    scoped = client.get('projects/' + identifier + '/incidents', page=1, page_size=2)
    assert all(row['project_id'] == identifier for row in scoped['incidents'])
    assert all(fields <= row.keys() for row in scoped['incidents'])
print('Registre ccab, pagination, périmètre projet et compatibilité CCAB : vérifiés')
