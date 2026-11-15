"""Qualification destructive réservée au conteneur jetable identifié CAB."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
from unittest.mock import patch

if not Path('/.dockerenv').exists() or os.environ.get('CAB_PG_MIGRATION_FIXTURE') != '1':
    raise RuntimeError('disposable-cab-container-required')

from cab_platform import postgresql as pg
from cab_platform.paths import CONFIG, STATE, atomic_json, config, private_dir, secret
from cab_platform.bootstrap import initialize


def refused(code, action):
    try:
        action()
    except pg.PostgreSQLError as error:
        assert str(error) == code, str(error)
    else:
        raise AssertionError('refus attendu : ' + code)


private_dir(CONFIG.parent);private_dir(STATE)
atomic_json(CONFIG, {'initialized': False})
os.environ['DJANGO_SETTINGS_MODULE'] = 'cab_platform.settings'
os.environ['CAB_MIGRATE'] = '1'
import django
django.setup()
assert pg.ensure()['state'] == 'BOOTSTRAP_ONLY'
assert not pg.clusters(), 'aucun cluster avant amorçage'
with patch.object(pg, 'default_major', return_value=17):
    # Préparer un vrai cluster PG17 ; ensuite sélection et migration utilisent
    # sans double la cible PG18 du métapaquet Debian du conteneur Forky.
    initialize({'username': 'qualification', 'password': '', 'database_port': 5433}, secret('bootstrap-token'))
cfg = config()
assert cfg['postgresql']['major'] == 17
os.environ['DJANGO_SETTINGS_MODULE'] = 'cab_platform.settings'
os.environ['CAB_MIGRATE'] = '1'
import django
django.setup()
from django.db import connections
from cab_platform.core.models import Actor, Project, Run, Operation

actor = Actor.objects.create(id='fixture-coder', uid=1000, role='coder', agent='codex', token_hash='0' * 64)
project = Project.objects.create(id='fixture-project', root='/fixture', name='fixture', owner_uid=1000)
actor.projects.add(project)
run = Run.objects.create(project=project, actor=actor, run_id='fixture-run', session_id='fixture-sid', change='fixture-change', mode='direct', state='WORKING', suspension='IMPORT_PROTECTED')
unknown = {'status': 'UNKNOWN', 'reason': 'fixture-conserved', 'exit_code': None}
digest = hashlib.sha256(json.dumps(unknown, sort_keys=True).encode()).hexdigest()
op = Operation.objects.create(run=run, request_id='fixture-unknown', state='UNKNOWN', request={}, receipt=unknown, receipt_digest=digest, source_revision='0'*64, dispatch_nonce='fixture', dispatched=True)
connections.close_all()
assert pg.default_major() == 18
refused('postgres-operations-protected', pg.ensure)
# Une réconciliation déjà prouvée conserve son reçu UNKNOWN ; elle ne devient
# jamais une réussite de test. Le RUN et sa protection demeurent inchangés.
Operation.objects.filter(pk=op.pk).update(state='CANCELLED')
connections.close_all()
atomic_json(STATE / 'postgresql-migration.json', {'state': 'DISPATCHED'})
refused('postgres-migration-reconciliation-required', pg.ensure)
(STATE / 'postgresql-migration.json').unlink()
before = pg.fingerprint(cfg)
private_dir(STATE / 'electric');(STATE / 'electric/fixture-old-state').write_text('ancienne projection')
result = pg.ensure()
assert result['state'] == 'MIGRATED' and result['major'] == 18
assert pg.fingerprint(config()) == before
assert pg.ensure()['state'] == 'QUALIFIED', 'redémarrage idempotent sans rejeu'
assert any(row['major'] == 17 and row['cluster'] == 'cab' and row['status'] == 'down' for row in pg.clusters())
old = next(row for row in pg.clusters() if row['major'] == 17 and row['cluster'] == 'cab')
pg.command(['/usr/bin/pg_ctlcluster', '17', 'cab', 'start'])
assert pg.fingerprint({**cfg, 'database_port': old['port']}) == before, 'ancien cluster restaurable intact'
pg.command(['/usr/bin/pg_ctlcluster', '17', 'cab', 'stop'])
receipt = json.loads(Path(result['receipt']).read_text())
assert receipt['state'] == 'COMPLETED' and receipt['source_retained'] and receipt['integrity_verified']
dump = Path(receipt['backup']) / 'cluster.sql'
assert hashlib.sha256(dump.read_bytes()).hexdigest() == receipt['backup_sha256']
assert (dump.parent / 'electric-before/fixture-old-state').read_text() == 'ancienne projection'
connections.close_all()
reloaded = Operation.objects.get(pk=op.pk)
assert reloaded.receipt == unknown and reloaded.receipt_digest == digest
assert Run.objects.get(pk=run.pk).suspension == 'IMPORT_PROTECTED'
connections.close_all()
# Electric doit réellement relire PG18 et servir une shape après reconstruction.
from cab_platform.service import electric_command
args, env, cwd = electric_command()
logfile = (STATE / 'fixture-electric.log').open('w')
electric = subprocess.Popen(args, env=env, cwd=cwd, stdout=logfile, stderr=subprocess.STDOUT)
try:
    import httpx
    deadline = time.monotonic() + 60
    while True:
        try:
            response = httpx.get('http://127.0.0.1:8791/v1/health', timeout=2)
            if response.status_code == 200:
                break
        except httpx.HTTPError:
            pass
        assert electric.poll() is None, 'Electric arrêté ; diagnostic privé dans état conteneur'
        assert time.monotonic() < deadline, 'Electric indisponible'
        time.sleep(.5)
    shape = httpx.get('http://127.0.0.1:8791/v1/shape', params={'table': 'cab_core_sessionprojection', 'offset': '-1', 'secret': cfg['electric_secret']}, timeout=20)
    assert shape.status_code == 200, 'shape Electric indisponible'
    assert isinstance(shape.json(), list)
finally:
    electric.terminate();electric.wait(timeout=20);logfile.close()

print(json.dumps({'passed': True, 'migration': '17->18', 'tables': len(before['tables']), 'sequences': len(before['sequences']), 'all_rows_verified': True, 'unknown_receipt_preserved': True, 'import_protection_preserved': True, 'source_retained': True, 'backup_verified': True, 'interrupted_dispatch_refused': True, 'electric_pg18_shape': True, 'idempotent_restart': True}))
