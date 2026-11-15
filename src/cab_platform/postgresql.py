"""Sélection Debian et migration logique bornée du seul cluster local CAB."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time

from .paths import CONFIG, STATE, atomic_json, config, private_dir, read_json

SUPPORTED = (17, 18)


class PostgreSQLError(RuntimeError):
    pass


def command(argv: list[str], timeout: int = 120) -> str:
    try:
        result = subprocess.run(argv, capture_output=True, text=True, timeout=timeout, check=False)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise PostgreSQLError('postgres-command-unconfirmed') from error
    if result.returncode:
        raise PostgreSQLError('postgres-command-failed:' + Path(argv[0]).name)
    return result.stdout.strip()


def default_major() -> int:
    result = subprocess.run(['/usr/bin/dpkg-query', '-W', '-f=${Depends}', 'postgresql'], capture_output=True, text=True, check=False)
    matches = re.findall(r'(?:^|[ ,])postgresql-([0-9]+)(?:[ ,(]|$)', result.stdout) if result.returncode == 0 else []
    if len(matches) == 1:
        major = int(matches[0])
    else:
        # Adoption des anciens DEB CAB à dépendance fixe, avant installation
        # du métapaquet. Cet outil a disparu des versions récentes de Forky.
        values = command(['/usr/share/postgresql-common/supported-versions']).split()
        if not values or not values[-1].isdigit():
            raise PostgreSQLError('postgres-default-unavailable')
        major = int(values[-1])
    if major not in SUPPORTED:
        raise PostgreSQLError('postgres-major-unsupported')
    if not Path(f'/usr/lib/postgresql/{major}/bin/postgres').is_file():
        raise PostgreSQLError('postgres-target-not-installed')
    return major


def clusters() -> list[dict]:
    result = []
    for line in command(['/usr/bin/pg_lsclusters', '--no-header']).splitlines():
        row = line.split()
        if len(row) < 7 or not row[0].isdigit() or not row[2].isdigit():
            raise PostgreSQLError('postgres-cluster-inventory-invalid')
        result.append(dict(major=int(row[0]), cluster=row[1], port=int(row[2]), status=row[3]))
    return result


def reference(major: int, port: int) -> dict:
    if major not in SUPPORTED:
        raise PostgreSQLError('postgres-major-unsupported')
    return {'major': major, 'cluster': 'cab', 'port': port}


def sql(port: int, statement: str, database: str = 'postgres') -> str:
    from .bootstrap import _psql
    return _psql(port, statement, database)


def qualify(cfg: dict, major: int) -> None:
    port = cfg['database_port']
    if int(sql(port, 'SHOW server_version_num')) // 10000 != major:
        raise PostgreSQLError('postgres-server-version-divergent')
    if sql(port, 'SHOW wal_level') != 'logical':
        raise PostgreSQLError('postgres-logical-replication-required')
    if sql(port, "SELECT count(*) FROM pg_roles WHERE rolname IN ('cab_owner','cab_migrate','cab_app','cab_electric')") != '4':
        raise PostgreSQLError('postgres-cab-roles-missing')
    if sql(port, "SELECT count(*) FROM django_migrations", cfg['database']) == '0':
        raise PostgreSQLError('postgres-cab-schema-missing')


def quote_identifier(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def fingerprint(cfg: dict) -> dict:
    """Toutes les lignes et séquences ; seuls comptes et empreintes sont exposés."""
    port, database = cfg['database_port'], cfg['database']
    names = json.loads(sql(port, "SELECT COALESCE(json_agg(tablename ORDER BY tablename),'[]') FROM pg_tables WHERE schemaname='public'", database))
    tables = {}
    for name in names:
        table = 'public.' + quote_identifier(name)
        # Empreinte indépendante de l'ordre physique, y compris les doublons.
        tables[name] = json.loads(sql(port, "SELECT json_build_array(count(*),md5(COALESCE(string_agg(md5(t::text),'' ORDER BY md5(t::text)),''))) FROM " + table + ' t', database))
    sequences = {}
    names = json.loads(sql(port, "SELECT COALESCE(json_agg(sequencename ORDER BY sequencename),'[]') FROM pg_sequences WHERE schemaname='public'", database))
    for name in names:
        sequences[name] = sql(port, 'SELECT last_value::text || \':\' || is_called::text FROM public.' + quote_identifier(name), database)
    roles = sql(port, "SELECT json_agg(row(rolname,rolcanlogin,rolreplication)::text ORDER BY rolname) FROM pg_roles WHERE rolname LIKE 'cab_%'")
    publication = sql(port, "SELECT COALESCE(json_agg(row(pubname,schemaname,tablename,attnames,rowfilter)::text ORDER BY pubname,schemaname,tablename),'[]') FROM pg_publication_tables", database)
    return {'tables': tables, 'sequences': sequences, 'roles': roles, 'publications': publication}


def guard(cfg: dict) -> None:
    port, database = cfg['database_port'], cfg['database']
    # Ne jamais migrer un cluster partagé avec des bases étrangères.
    if sql(port, "SELECT count(*) FROM pg_database WHERE NOT datistemplate AND datname NOT IN ('postgres','cab')") != '0':
        raise PostgreSQLError('postgres-cluster-not-exclusive')
    if sql(port, "SELECT count(*) FROM pg_stat_activity WHERE pid<>pg_backend_pid() AND backend_type IN ('client backend','walsender')") != '0':
        raise PostgreSQLError('postgres-clients-active')
    if sql(port, "SELECT count(*) FROM cab_core_operation WHERE state NOT IN ('COMPLETED','FAILED_TO_START','TIMED_OUT','CANCELLED','PREFLIGHT_FAILED')", database) != '0':
        raise PostgreSQLError('postgres-operations-protected')
    if sql(port, "SELECT count(*) FROM cab_core_lease WHERE state='HELD'", database) != '0':
        raise PostgreSQLError('postgres-leases-protected')


def ensure() -> dict:
    """Avant Django/Electric, jamais depuis un worker ni durant les écritures."""
    cfg = config()
    if not cfg.get('initialized'):
        return {'state': 'BOOTSTRAP_ONLY'}
    if os.getuid() != 0:
        raise PostgreSQLError('postgres-root-administration-required')
    if cfg.get('database_host') not in ('127.0.0.1', 'localhost', '/var/run/postgresql') or cfg.get('database') != 'cab':
        raise PostgreSQLError('postgres-local-cluster-required')
    private_dir(STATE)
    fd = os.open(STATE / 'postgresql.lock', os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        return _ensure(config())
    finally:
        os.close(fd)


def _ensure(cfg: dict) -> dict:
    receipt_path = STATE / 'postgresql-migration.json'
    receipt = read_json(receipt_path, {})
    if receipt and receipt.get('state') not in ('COMPLETED',):
        raise PostgreSQLError('postgres-migration-reconciliation-required')
    target = default_major()
    found = [row for row in clusters() if row['cluster'] == 'cab' and row['port'] == cfg['database_port']]
    if len(found) != 1:
        raise PostgreSQLError('postgres-configured-cluster-ambiguous')
    source = found[0]
    current = reference(source['major'], source['port'])
    if cfg.get('postgresql') and cfg['postgresql'] != current:
        raise PostgreSQLError('postgres-reference-divergent')
    if source['status'] == 'down':
        command(['/usr/bin/pg_ctlcluster', str(source['major']), 'cab', 'start'])
    qualify(cfg, source['major'])
    if not cfg.get('postgresql'):
        cfg['postgresql'] = current
        atomic_json(CONFIG, cfg)
    if target == source['major']:
        return {'state': 'QUALIFIED', **current}
    if target < source['major']:
        raise PostgreSQLError('postgres-downgrade-forbidden')
    if any(row['cluster'] == 'cab' and row['major'] == target for row in clusters()):
        raise PostgreSQLError('postgres-target-cluster-exists')
    guard(cfg)
    directory = private_dir(STATE / 'postgresql-migrations' / (str(time.time_ns()) + '-' + str(target)))
    shutil.copyfile(CONFIG, directory / 'cab.json')
    (directory / 'cab.json').chmod(0o600)
    shutil.copytree(Path('/etc/postgresql') / str(source['major']) / 'cab', directory / 'cluster-config')
    # Le dump complet conserve rôles et mots de passe uniquement dans l'état privé.
    dump = directory / 'cluster.sql'
    with dump.open('xb') as stream:
        os.chmod(dump, 0o600)
        result = subprocess.run(['/usr/sbin/runuser', '-u', 'postgres', '--', f'/usr/lib/postgresql/{source["major"]}/bin/pg_dumpall', '-h', '/var/run/postgresql', '-p', str(source['port'])], stdout=stream, stderr=subprocess.PIPE, timeout=900)
        stream.flush();os.fsync(stream.fileno())
    if result.returncode:
        raise PostgreSQLError('postgres-backup-failed')
    before = fingerprint(cfg)
    with dump.open('rb') as stream:
        backup_digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    receipt = {'state': 'PREPARED', 'source': current, 'target': target, 'backup': str(directory), 'backup_sha256': backup_digest, 'before': before, 'method': 'dump', 'started': time.time(), 'replayed': False}
    atomic_json(directory / 'receipt.json', receipt)
    atomic_json(receipt_path, receipt)
    # Établir une frontière d'écriture avant dispatch. Le dump Debian utilise
    # postgres local ; les connexions des clients CAB sont refusées pendant l'effet.
    hba = Path('/etc/postgresql') / str(source['major']) / 'cab/pg_hba.conf'
    original_hba = hba.read_bytes()
    hba.write_bytes(b'local all postgres peer\nlocal all all reject\nhost all all 0.0.0.0/0 reject\nhost all all ::0/0 reject\n')
    sql(source['port'], 'SELECT pg_reload_conf()')
    try:
        guard(cfg)
        # Relever à nouveau les données après fermeture de la frontière.
        before = fingerprint(cfg);receipt['before'] = before
        receipt['state'] = 'DISPATCHED';atomic_json(receipt_path, receipt);atomic_json(directory / 'receipt.json', receipt)
        command(['/usr/bin/pg_upgradecluster', '-v', str(target), '--method=dump', str(source['major']), 'cab'], timeout=3600)
        qualify(cfg, target)
        after = fingerprint(cfg)
        if before != after:
            raise PostgreSQLError('postgres-migration-integrity-divergent')
        receipt['integrity_verified'] = True
        # Pas de vieux stockage Electric relié aux anciens identifiants WAL.
        electric = STATE / 'electric'
        if electric.exists():
            electric.rename(directory / 'electric-before')
        new_hba = Path('/etc/postgresql') / str(target) / 'cab/pg_hba.conf'
        new_hba.write_bytes(original_hba)
        sql(source['port'], 'SELECT pg_reload_conf()')
        cfg['postgresql'] = reference(target, source['port'])
        atomic_json(CONFIG, cfg)
        receipt.update(state='COMPLETED', finished=time.time(), source_retained=True, electric_resnapshot=True)
        atomic_json(directory / 'receipt.json', receipt);atomic_json(receipt_path, receipt)
        return {'state': 'MIGRATED', **cfg['postgresql'], 'receipt': str(directory / 'receipt.json')}
    except (PostgreSQLError, RuntimeError, OSError, subprocess.TimeoutExpired) as error:
        receipt.update(state='RECONCILIATION_REQUIRED', error=type(error).__name__)
        atomic_json(directory / 'receipt.json', receipt);atomic_json(receipt_path, receipt)
        raise
    finally:
        # L'ancien cluster reste restaurable ; ne pas le démarrer ni basculer
        # automatiquement vers une base antérieure après un effet possible.
        hba.write_bytes(original_hba)
