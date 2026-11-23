"""Inventaire PostgreSQL des processus suivis par le superviseur CAB."""
import os
from pathlib import Path
import pwd
import re

from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from .agent_runtime import processes
from . import __version__
from .connector_process import cab_process, identity
from .core.commands import digest
from .core.connectors import observed_dead
from .core.models import Actor, BinaryCounts, Maintenance, ObservedBinary
from .native_api import same_instance
from .paths import STATE, read_json


def project_counts():
    counts = ObservedBinary.objects.aggregate(
        inactive=Count('pk', filter=Q(active=False)),
        active=Count('pk', filter=Q(active=True)),
    )
    row,created = BinaryCounts.objects.get_or_create(pk=1, defaults=counts)
    if not created and (row.inactive!=counts['inactive'] or row.active!=counts['active']):
        BinaryCounts.objects.filter(pk=1).update(**counts)


@transaction.atomic
def initialize():
    """Conserver l'inventaire si ce démarrage appartient à une mise à jour vérifiée en cours."""
    receipt = read_json(STATE/'maintenance-receipt.json', {})
    key = receipt.get('transaction_id', '')
    packaged_upgrade = (isinstance(key, str) and re.fullmatch(r'debian-upgrade-'+re.escape(__version__)+r'-\d+', key)
                        and receipt.get('state')=='PREPARED'
                        and Maintenance.objects.filter(pk=key, state__in=['PREPARED','INSTALLING']).exists())
    if not packaged_upgrade:
        ObservedBinary.objects.all().delete()
    project_counts()
    return packaged_upgrade


def executable(pid):
    return os.readlink(Path('/proc', str(pid), 'exe')).removesuffix(' (deleted)')


@transaction.atomic
def refresh(supervised):
    known = {int(pid): role for pid, role in supervised.items() if pid}
    uids = set(Actor.objects.filter(active=True,agent__in=['codex','codex-cli','opencode'])
               .values_list('uid',flat=True))
    for row in processes(uids):
        if row['mcp']:
            known.setdefault(row['pid'], 'relais-mcp')
        elif row['agent'] or Path(row['exe']).name in ('ChatGPT','Codex','codex-desktop'):
            known.setdefault(row['pid'], 'agent')
        elif cab_process(row['pid'],'mcp-worker'):
            known.setdefault(row['pid'], 'moteur-mcp')

    for pid, role in known.items():
        current = identity(pid)
        if not current:
            continue
        try:
            path = executable(pid)
        except OSError:
            continue
        if not same_instance(identity(pid), current):
            continue
        uid = current['uid']
        try:
            username = pwd.getpwuid(uid).pw_name
        except KeyError:
            username = str(uid)
        key = digest([pid, uid, current['start'], current['boot'], path])
        ObservedBinary.objects.update_or_create(pk=key, defaults={
            'pid':pid, 'uid':uid, 'username':username, 'executable':path,
            'role':role, 'process':current, 'active':True, 'stopped':None,
        })

    now = timezone.now()
    for row in ObservedBinary.objects.filter(active=True).iterator():
        current = identity(row.pid)
        try:
            unchanged = same_instance(current, row.process) and executable(row.pid)==row.executable
        except OSError:
            continue
        if not unchanged and (current is not None or observed_dead(row.process)):
            ObservedBinary.objects.filter(pk=row.pk).update(active=False, stopped=now)
    project_counts()
