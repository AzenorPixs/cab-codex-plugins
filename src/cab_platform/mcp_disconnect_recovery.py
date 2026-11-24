"""Remédiation MCP persistante après une perte de connexion observée."""
from datetime import timedelta
import hashlib
import os
from pathlib import Path

from django.db import connection, transaction
from django.db.models import Q
from django.utils import timezone

from . import __version__
from .connector_process import alive, identity
from .core import commands as c, native_control
from .core.models import Actor, McpConnector, McpDisconnectRecovery, McpRunBinding, NativeReload, SystemUpdate
from .native_api import same_instance
from .notifications import publish

# Laisser les redémarrages déjà en cours et les brèves pertes se résorber.
GRACE = timedelta(seconds=4)
DEADLINE = timedelta(seconds=90)
FRESH = timedelta(seconds=15)

REASONS = {
    'heartbeat-confirmed': 'Heartbeat, moteur et catalogue confirmés.',
    'agent-not-confirmed': 'L’instance d’origine de l’agent n’est plus confirmée.',
    'no-control-path': 'Aucun contrôle natif disponible et relais d’origine arrêté.',
    'not-confirmed-before-deadline': 'Aucun moteur et catalogue concordants observés avant le délai.',
    'effect-uncertain': 'Résultat du contrôle incertain ; aucun rejeu.',
}
METHODS = {'QUEUED':'Rétablissement observé pendant la surveillance',
           'NATIVE':'Contrôle natif de l’agent', 'RELAY':'En attente du relais',
           'DISPATCHED':'Relance du moteur par le relais'}


def active_owner(saved, agent):
    current = identity(saved.get('pid', 0)) if saved else None
    if not same_instance(current, saved):
        return False
    try:
        exe = os.readlink(Path('/proc', str(current['pid']), 'exe')).removesuffix(' (deleted)')
    except OSError:
        return False
    return (Path(exe).name == ('opencode' if agent == 'opencode' else 'codex')
            and same_instance(identity(current['pid']), current))


def capture_anchor(connector):
    owner = identity(connector.process.get('parent_pid', 0))
    if not owner or owner['uid'] != connector.actor.uid or not active_owner(owner, connector.agent):
        return {}
    try:
        cwd = os.readlink(Path('/proc', str(connector.process['pid']), 'cwd'))
    except OSError:
        return {}
    if not alive(connector.process):
        return {}
    return {'owner': owner, 'location': hashlib.sha256(os.fsencode(cwd)).hexdigest()}


def enqueue(connector,purpose='loss'):
    binding = McpRunBinding.objects.filter(connector=connector).select_related('run').first()
    record = McpDisconnectRecovery.objects.filter(connector=connector, finished__isnull=True).first()
    if record is None:
        McpDisconnectRecovery.objects.create(
            connector=connector, project_id=binding.run.project_id if binding else None,
            anchor=connector.recovery_anchor,
            baseline=list(McpConnector.objects.filter(actor=connector.actor).values_list('pk', flat=True)),
            purpose=purpose,
        )


def recovery_owner(record):
    return record.anchor.get('owner', {})


def healthy_replacement(record, now):
    """Confirme le service rendu, indépendamment de l'attribution d'une ancienne relance."""
    if record.purpose != 'loss' or not record.anchor:
        return None
    siblings = McpConnector.objects.filter(
        actor_id=record.connector.actor_id, recovery_anchor=record.anchor, seen__gte=now-FRESH,
        state__in=['READY', 'BUSY'], uncertain=False,
        relay_version=__version__, loaded_version=__version__, catalog_version=__version__,
    ).exclude(pk=record.connector_id)
    return next((row for row in siblings.order_by('pk') if alive(row.process) and alive(row.worker)), None)


def overlapping_loss(record):
    if record.purpose != 'loss' or not record.anchor:
        return False
    return (McpDisconnectRecovery.objects.filter(
        connector__actor_id=record.connector.actor_id, anchor=record.anchor, purpose='loss',
    ).filter(Q(created__lt=record.created) | Q(created=record.created, pk__lt=record.pk))
      .filter(Q(finished__isnull=True) | Q(finished__gte=record.created))
      .exclude(report__contains={'reason':'overlapping-loss'}).exists())


def awaiting_catalog(connector, now):
    # Le client doit lire le catalogue du moteur déjà renouvelé.
    return (connector.state == 'CATALOG_PENDING' and connector.seen >= now-FRESH
            and alive(connector.process) and alive(connector.worker))


def proved_connector(record, now):
    query = McpConnector.objects.filter(
        actor_id=record.connector.actor_id, seen__gte=max(record.created, now-FRESH),
        state__in=['READY', 'BUSY'], loaded_version=__version__, catalog_version=__version__, uncertain=False,
    )
    original = query.filter(pk=record.connector_id).first()
    if original and alive(original.process) and alive(original.worker):
        return original
    if not record.anchor:
        return None
    # Une nouvelle liaison d'un même emplacement ne désigne pas deux pertes indépendantes.
    if McpDisconnectRecovery.objects.filter(
        connector__actor_id=record.connector.actor_id, anchor=record.anchor, finished__isnull=True
    ).exclude(pk=record.pk).exists():
        return None
    candidates = [row for row in query.filter(recovery_anchor=record.anchor).exclude(pk__in=record.baseline)
                  if alive(row.process) and alive(row.worker)]
    if len(candidates) != 1:
        return None
    row = candidates[0]
    if McpDisconnectRecovery.objects.filter(connector__actor_id=row.actor_id, created__gte=record.created,
                                            report__restored_connector=row.pk).exists():
        return None
    return row


def finish(record, state, reason, restored=None, *, notify=True):
    now = timezone.now()
    record.report = {
        'reason': reason, 'started_at': record.created.isoformat(), 'finished_at': now.isoformat(),
        'connector_id': record.connector_id, 'agent': record.connector.agent, 'method': record.state,
        'restored_connector': restored.pk if restored else None,
        'loaded_version': restored.loaded_version if restored else None,
        'catalog_version': restored.catalog_version if restored else None,
    }
    record.state, record.finished = state, now
    record.save(update_fields=['report', 'state', 'finished'])
    if notify and record.purpose=='loss':
        label = 'réussie' if restored else 'échouée'
        body = (f'Agent : {record.connector.agent}\nConnecteur : {record.connector_id}\n'
                f'Début : {record.report["started_at"]}\nFin : {record.report["finished_at"]}\n'
                f'Méthode : {METHODS[record.report["method"]]}\n'
                f'Résultat : {REASONS[reason]}')
        if restored:
            body += (f'\nRelais observé : {restored.pk}\nMoteur : {restored.loaded_version}'
                     f'\nCatalogue : {restored.catalog_version}')
        publish(f'mcp-disconnect-recovery:{record.pk}', title=f'Remédiation MCP {label}', body=body,
                project=record.project)


def update_in_progress():
    return SystemUpdate.objects.filter(active_slot=1).exclude(state__in=['FAILED','OK']).exists()


@transaction.atomic
def advance(key, actor_id):
    actor = Actor.objects.select_for_update().get(pk=actor_id)
    record = (McpDisconnectRecovery.objects.select_for_update(of=('self',)).select_related('connector', 'project')
              .filter(pk=key, finished__isnull=True).first())
    if record is None:
        return
    now = timezone.now()
    if now < record.created + GRACE:
        return
    owner = recovery_owner(record)
    if not actor.active or not active_owner(owner, actor.agent):
        issued = record.state in ('NATIVE','DISPATCHED')
        finish(record, 'FAILED' if issued else 'SKIPPED', 'agent-not-confirmed', notify=issued)
        return
    native = NativeReload.objects.filter(pk=record.native_request).first() if record.native_request else None
    if native and native.state in ('UNKNOWN','AUTO_OC_UNKNOWN'):
        finish(record, 'FAILED', 'effect-uncertain')
        return
    duplicate = overlapping_loss(record)
    native_issued = record.state == 'NATIVE' and (
        native is None or native.result.get('mutation_dispatched') is True
        or native.state not in ('QUEUED', 'CANCELLED', 'UNAVAILABLE')
    )
    if duplicate and record.state != 'DISPATCHED' and not native_issued:
        finish(record, 'SKIPPED', 'overlapping-loss', notify=False)
        return
    replacement = healthy_replacement(record, now)
    if replacement:
        if native is None or native.state not in ('DISPATCHED','AUTO_OC_DISPATCHED','AUTO_OC_WAITING'):
            finish(record, 'SKIPPED', 'healthy-replacement-already-present', replacement, notify=False)
        return
    restored = proved_connector(record, now)
    if restored:
        finish(record, 'SUCCEEDED', 'heartbeat-confirmed', restored, notify=not duplicate)
        return
    if now >= record.created + DEADLINE:
        finish(record, 'FAILED', 'not-confirmed-before-deadline', notify=not duplicate)
        return
    if duplicate:
        return
    if update_in_progress():
        return
    if record.connector.pending or record.connector.uncertain:
        return
    if awaiting_catalog(record.connector, now):
        return
    if record.state != 'QUEUED':
        if native and native.state=='UNAVAILABLE' and native.result.get('mutation_dispatched') is False:
            record.state='RELAY'
            record.save(update_fields=['state'])
        return
    try:
        native_control.boundary(actor, owner)
    except c.Refused:
        return
    try:
        reply = native_control.request(actor, {'request_id': f'MCP-LOSS-{record.pk}'}, expected=owner,
                                       disconnect_recovery=record.pk)
    except c.Refused as error:
        if error.code in ('native-control-pending','maintenance-in-progress'):
            return
        if alive(record.connector.process) and record.connector.state!='DISCONNECTED':
            record.state='RELAY'
            record.save(update_fields=['state'])
        else:
            finish(record, 'FAILED', 'no-control-path')
        return
    record.state, record.native_request = 'NATIVE', reply['request_id']
    record.save(update_fields=['state','native_request'])


def admit_native(native):
    record = McpDisconnectRecovery.objects.filter(pk=native.result['disconnect_recovery'], finished__isnull=True).select_related('connector').first()
    now = timezone.now()
    return bool(record and not record.connector.pending and not record.connector.uncertain
                and not update_in_progress() and active_owner(recovery_owner(record), record.connector.agent)
                and not overlapping_loss(record) and not healthy_replacement(record, now)
                and not awaiting_catalog(record.connector, now) and not proved_connector(record, now))


@transaction.atomic
def claim(actor, data, peer):
    c.require(set(data)=={'connector_id'} and isinstance(data['connector_id'],str),'connector-recovery-invalid',400)
    pending = McpDisconnectRecovery.objects.filter(connector_id=data['connector_id'],connector__actor=actor,
                                                    finished__isnull=True,state='RELAY')
    if not pending.exists():
        return {'reload': False}
    with connection.cursor() as cursor:
        cursor.execute('SELECT pg_advisory_xact_lock(%s)',[300001])
    actor = Actor.objects.select_for_update().get(pk=actor.pk)
    record = pending.select_for_update(of=('self',)).select_related('connector').first()
    if not actor.active or not record:
        return {'reload': False}
    connector = record.connector
    c.require(peer and peer['uid']==actor.uid and connector.process==identity(peer['pid']),
              'connector-owner-divergent',403)
    owner = recovery_owner(record)
    now = timezone.now()
    if (connector.pending or connector.uncertain or now >= record.created + DEADLINE or update_in_progress()
            or not active_owner(owner, actor.agent) or overlapping_loss(record) or healthy_replacement(record, now)
            or awaiting_catalog(connector, now) or proved_connector(record, now)):
        return {'reload': False}
    if NativeReload.objects.filter(actor=actor,state__in=native_control.PENDING).exists():
        return {'reload': False}
    native_control.boundary(actor, owner)
    record.state='DISPATCHED'
    record.save(update_fields=['state'])
    return {'reload': True}


def sweep():
    pending = list(McpDisconnectRecovery.objects.filter(finished__isnull=True)
                   .order_by('created').values_list('pk','connector__actor_id')[:50])
    for key, actor_id in pending:
        advance(key, actor_id)
