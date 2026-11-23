"""Reprises bornées de PostgreSQL et des veilles inotify de CAB."""
from datetime import datetime, timezone
import logging
import os
from pathlib import Path
import pwd
from secrets import token_hex
import subprocess
import time

from django.db import DatabaseError, close_old_connections

from .connector_process import identity
from .native_api import same_instance
from .paths import STATE, atomic_json, config, read_json
from .postgresql import SUPPORTED, PostgreSQLError, clusters

log = logging.getLogger('cab.recovery')


def timestamp():
    return datetime.now(timezone.utc).isoformat()


class Receipt:
    """Le reçu local survit à une panne de la base et interdit le rejeu."""
    def __init__(self, key, label, *, recover_interrupted=True):
        self.path = STATE / f'recovery-{key}.json'
        self.label = label
        self.next_publication = 0
        self.data = read_json(self.path, {}) or {}
        if recover_interrupted and self.data.get('state') == 'ATTEMPTING':
            self.finish(False, 'Reprise interrompue, résultat non confirmé.')

    def save(self):
        atomic_json(self.path, self.data)

    def begin(self):
        if not self.unclaimed():
            return False
        self.data = {'id':token_hex(16), 'state':'ATTEMPTING', 'started':timestamp()}
        self.save()
        return True

    def unclaimed(self):
        return not self.data or self.data.get('rearmed', False)

    def finish(self, success, detail):
        self.data.update(state='SUCCEEDED' if success else 'FAILED', finished=timestamp(), detail=detail)
        self.save()

    def publish(self):
        if self.data.get('state') not in ('SUCCEEDED','FAILED') or self.data.get('published'):
            return
        if time.monotonic()<self.next_publication:
            return
        self.next_publication=time.monotonic()+5
        from .notifications import publish
        item = self.data
        try:
            close_old_connections()
            publish('service-recovery:'+item['id'],
                    title=f"{self.label} — {'Réussite' if item['state']=='SUCCEEDED' else 'Échec'}",
                    body=f"Début : {item['started']}\nFin : {item['finished']}\n{item['detail']}")
        except DatabaseError:
            return
        finally:
            close_old_connections()
        item['published'] = True
        self.save()

    def rearm(self):
        if self.data.get('published') and not self.data.get('rearmed'):
            self.data['rearmed'] = True
            self.save()


def postgres_target(configuration):
    target = configuration.get('postgresql')
    if not isinstance(target, dict):
        return None
    if (configuration.get('database_host') not in ('127.0.0.1','localhost','/var/run/postgresql')
            or configuration.get('database') != 'cab' or target.get('cluster') != 'cab'
            or target.get('major') not in SUPPORTED or type(target.get('port')) is not int
            or target['port'] != configuration.get('database_port')):
        return None
    return target


def run_command(argv, timeout):
    try:
        return subprocess.run(argv, capture_output=True, text=True, timeout=timeout, check=False)
    except (OSError, subprocess.TimeoutExpired):
        return None


def unit_for(target):
    return f"postgresql@{target['major']}-cab.service"


def probe_postgres(target):
    unit = unit_for(target)
    result = run_command(['/usr/bin/systemctl','show','--property=ActiveState,MainPID',unit], 5)
    if result is None or result.returncode:
        return 'UNKNOWN', None
    data = dict(line.split('=',1) for line in result.stdout.splitlines() if '=' in line)
    pid = data.get('MainPID','')
    if not pid.isdigit():
        return 'UNKNOWN', None
    if pid == '0' and data.get('ActiveState') in ('inactive','failed'):
        # Un autre cluster ou un serveur démarré hors de cette unité ne justifie pas un start.
        try:
            found = [row for row in clusters() if row['cluster']=='cab' and row['major']==target['major']
                     and row['port']==target['port']]
        except PostgreSQLError:
            return 'UNKNOWN', None
        return ('DOWN', None) if len(found)==1 and found[0]['status']=='down' else ('UNKNOWN', None)
    proc = identity(int(pid))
    if data.get('ActiveState') != 'active' or not proc:
        return 'UNKNOWN', None
    try:
        path = Path('/proc',pid,'exe').readlink()
        if proc['uid'] != pwd.getpwnam('postgres').pw_uid or str(path) != f"/usr/lib/postgresql/{target['major']}/bin/postgres":
            return 'UNKNOWN', None
    except (OSError, KeyError):
        return 'UNKNOWN', None
    result = run_command(['/usr/sbin/runuser','-u','postgres','--','/usr/bin/psql','-XAtq',
                          '-h','/var/run/postgresql','-p',str(target['port']),'-d','cab',
                          '-c','SELECT 1'], 4)
    if not same_instance(identity(proc['pid']), proc):
        return 'UNKNOWN', None
    return ('READY' if result is not None and result.returncode==0 and result.stdout.strip()=='1' else 'UNKNOWN'),proc['pid']


def maintenance():
    update = read_json(STATE/'maintenance-receipt.json', {}) or {}
    migration = read_json(STATE/'postgresql-migration.json', {}) or {}
    return update.get('state') == 'PREPARED' or bool(migration and migration.get('state')!='COMPLETED')


class PostgresMonitor:
    def __init__(self, was_ready=False):
        self.receipt = Receipt('postgresql','PostgreSQL CAB')
        self.pid = None
        self.was_ready = was_ready
        self.down_count = 0

    def tick(self, stop):
        target = postgres_target(config())
        if not target or maintenance():
            self.down_count = 0
            return
        state, self.pid = probe_postgres(target)
        if state == 'READY':
            self.was_ready = True
            self.down_count = 0
            self.receipt.publish()
            self.receipt.rearm()
            return
        self.down_count = self.down_count+1 if state=='DOWN' else 0
        if not self.was_ready or self.down_count<2 or stop.is_set() or not self.receipt.unclaimed():
            return
        # Relire la cible et l'unité juste avant l'effet.
        if postgres_target(config())!=target or maintenance() or probe_postgres(target)[0]!='DOWN':
            return
        if not self.receipt.begin():
            return
        if stop.is_set():
            self.receipt.finish(False,'CAB s’arrête avant l’émission du démarrage PostgreSQL.')
            return
        result = run_command(['/usr/bin/systemctl','start',unit_for(target)], 45)
        deadline = time.monotonic()+30
        while time.monotonic()<deadline and not stop.is_set():
            state,self.pid = probe_postgres(target)
            if state=='READY':
                self.receipt.finish(True,'Le cluster CAB est actif et répond à SELECT 1.')
                self.receipt.publish()
                self.receipt.rearm()
                self.down_count=0
                return
            if result is not None and result.returncode and state=='DOWN':
                break
            stop.wait(1)
        self.receipt.finish(False,'La base CAB n’a pas confirmé sa disponibilité après la tentative.')

    def run(self, stop):
        while not stop.is_set():
            try:
                self.tick(stop)
            except (OSError, ValueError, RuntimeError, DatabaseError) as error:
                log.warning('Surveillance PostgreSQL indisponible',extra={'code':type(error).__name__})
            stop.wait(4)


class InotifyMonitor:
    """Les veilles noyau appartiennent à CAB ; aucun démon tiers à relancer."""
    def __init__(self, factory, key, label):
        self.factory = factory
        self.receipt = Receipt(key,label)
        self.watcher = None
        self.abandoned = False

    def close(self):
        old,self.watcher = self.watcher,None
        if old is not None:
            try:
                old.close()
            except OSError:
                pass

    def observe(self):
        if self.watcher is None:
            self.watcher = self.factory()
        return self.watcher.tick()

    def tick(self):
        self.receipt.publish()
        if self.abandoned:
            return None
        try:
            result = self.observe()
        except OSError:
            self.close()
            if not self.receipt.begin():
                self.abandoned = True
                return None
            try:
                result = self.observe()
            except OSError:
                self.close()
                self.abandoned = True
                self.receipt.finish(False,'La veille n’a pas pu être reconstruite et relue.')
            else:
                self.receipt.finish(True,'Les descripteurs ont été reconstruits et une lecture a réussi.')
            self.receipt.publish()
            if self.abandoned:
                return None
        self.receipt.rearm()
        return result
