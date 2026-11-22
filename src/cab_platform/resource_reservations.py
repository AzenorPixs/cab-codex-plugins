"""Durée des baux et restitution des ressources gérées par CAB."""
from datetime import timedelta
from threading import Lock, Thread

from django.db import close_old_connections, connection, transaction
from django.db.models import Exists, OuterRef, Q
from django.utils import timezone

from .core import commands as c
from .core.models import Event, GitFileReservation, Lease, McpConnector, ResourceReservation, Run

LIFETIME = timedelta(seconds=300)
RENEW_AFTER = timedelta(seconds=240)
WARNING = timedelta(seconds=30)
ACTIVE_STATES = ('WORKING', 'REVIEW_PENDING', 'FINALIZATION_PENDING', 'ACCEPTED')
_sweep_worker = Lock()
_notice_worker = Lock()


def live(source, source_id):
    return ResourceReservation.objects.filter(
        source=source, source_id=source_id, expires__gt=timezone.now(),
    )


def renew_rows(rows, now):
    expires = now + LIFETIME
    for row in rows:
        c.require(row.expires > now, 'reservation-expired', 409)
        row.expires = expires
        row.count += 1
        row.warned = False
    ResourceReservation.objects.bulk_update(rows, ('expires', 'count', 'warned'))


def public_row(row):
    return {
        'id': row.pk, 'kind': row.kind, 'description': row.description, 'count': row.count,
        'started': row.started.isoformat(), 'expires': row.expires.isoformat(),
        'renew_at': (row.expires - LIFETIME + RENEW_AFTER).isoformat(),
    }


@transaction.atomic
def session_reservations(actor, current, connector_id, data, *, renewal=False):
    from .core.connectors import lock_worker_binding

    if renewal:
        git_guard()
    current = c.run_scope(actor, current.run_id, current.project_id, lock=renewal)
    if not renewal:
        rows = ResourceReservation.objects.filter(run=current, expires__gt=timezone.now())
        reports = Event.objects.filter(run=current, kind__in=('reservation-warning', 'reservation-released'))
        return {
            'reservations': [public_row(row) for row in rows.order_by('pk')],
            'notices': [item for item in reports.order_by('-pk').values('kind', 'created', 'data')[:100]],
        }

    lock_worker_binding(actor, connector_id, current)
    c.working(current)
    resource_guard()
    request_id = c.identifier(data.get('request_id'))
    ids = data.get('reservation_ids')
    c.require(isinstance(ids, list) and 0 < len(ids) <= 256 and
              all(type(key) is int and key > 0 for key in ids) and len(set(ids)) == len(ids),
              'reservation-ids-invalid', 400)
    prior = Event.objects.filter(run=current, kind='reservation-renewed', data__request_id=request_id).first()
    if prior:
        c.require(prior.data['ids'] == sorted(ids), 'reservation-request-conflict', 409)
        return prior.data['receipt']

    rows = list(ResourceReservation.objects.select_for_update().filter(
        pk__in=ids, run=current,
    ).order_by('pk'))
    c.require(len(rows) == len(ids), 'reservation-unavailable', 409)
    renew_rows(rows, timezone.now())
    receipt = {'reservations': [public_row(row) for row in rows]}
    c.event(current, 'reservation-renewed', {'request_id': request_id, 'ids': sorted(ids), 'receipt': receipt})
    return receipt


def git_guard():
    with connection.cursor() as cursor:
        cursor.execute('SELECT pg_advisory_xact_lock(%s, %s)', [7348501, 7348502])


def resource_guard():
    with connection.cursor() as cursor:
        cursor.execute('SELECT pg_advisory_xact_lock(%s)', [300001])


def overlaps(left, right):
    return left == right or (
        left.startswith('file:') and right.startswith('file:')
        and (left.startswith(right + '/') or right.startswith(left + '/'))
    )


def bank_activity(run_id, resource_id, since):
    return Lease.objects.filter(run_id=run_id, resource_id=resource_id, created__gte=since).filter(
        Q(operation__dispatched=True) | Q(operation__state__in=('INTENT', 'RUNNING', 'UNKNOWN')),
    )


def return_unused_banks(now, resource=None):
    """Un banc déjà utilisé garde sa procédure de restitution vérifiée."""
    activity = bank_activity(OuterRef('run_id'), OuterRef('resource_id'), OuterRef('created'))
    current = ResourceReservation.objects.filter(source='lease', source_id=OuterRef('pk'), expires__gt=now)
    expired = Lease.objects.filter(state='HELD', operation__isnull=True).filter(
        ~Exists(current), ~Exists(activity),
    )
    if resource is not None:
        expired = expired.filter(resource_id=resource)
    expired.update(state='RELEASED')


def return_idle_files(now, project=None, paths=None):
    current = ResourceReservation.objects.filter(source='git', source_id=OuterRef('pk'), expires__gt=now)
    expired = (GitFileReservation.objects.filter(active=True)
               .filter(~Exists(current)).select_related('git_index__initial_run').order_by('pk'))
    if project is not None:
        expired = expired.filter(project=project, path__in=paths)
    checked = {}
    releasable = []
    for item in expired.iterator():
        index = item.git_index
        run = index.initial_run
        if index.pk not in checked:
            latest = Run.objects.filter(
                project_id=item.project_id, change_record=index.change_id, coding_session_id=index.session_id,
            ).order_by('-pk').first() if index.session_id else run
            checked[index.pk] = bool(latest and c.no_pending(latest) and not _bound_connectors(latest).filter(
                Q(uncertain=True) | Q(pending__gt=0, seen__gt=timezone.now() - timedelta(seconds=15)),
            ).exists() and not index.effects.filter(
                state__in=('INTENT', 'RUNNING', 'UNKNOWN'),
            ).exists())
        if checked[index.pk]:
            releasable.append(item.pk)
    GitFileReservation.objects.filter(pk__in=releasable).update(active=False, released=now)


@transaction.atomic
def sweep(now=None):
    git_guard()
    resource_guard()
    now = now or timezone.now()
    upcoming = list(ResourceReservation.objects.select_for_update().filter(
        warned=False, expires__gt=now, expires__lte=now + WARNING,
    ))
    Event.objects.bulk_create([
        Event(run_id=row.run_id, project_id=row.project_id, kind='reservation-warning', data={
            'reservation_id': row.pk, 'expires': row.expires.isoformat(),
            'description': row.description, 'delivery': 'PENDING',
        }) for row in upcoming
    ])
    ResourceReservation.objects.filter(pk__in=[row.pk for row in upcoming]).update(warned=True)
    return_idle_files(now)
    return_unused_banks(now)
    ResourceReservation.objects.filter(expires__lte=now).delete()


def _live_connector(run):
    from .connector_process import alive

    connectors = _bound_connectors(run).filter(
        state__in=('READY', 'BUSY'), seen__gt=timezone.now() - timedelta(seconds=15),
    )
    return any(alive(connector.process) and alive(connector.worker) for connector in connectors)


def _bound_connectors(run):
    return McpConnector.objects.filter(actor_id=run.actor_id).filter(
        Q(run_binding__run=run) | Q(mcpthreadbinding__run=run, mcpthreadbinding__thread=run.session_id),
    )


def dispatch_notices():
    from .stage_reminders import _dispatch

    now = timezone.now()
    queue = Event.objects.filter(
        kind__in=('reservation-warning', 'reservation-released'),
        data__delivery='PENDING',
    ).filter(Q(data__next_at__isnull=True) | Q(data__next_at__lte=now.isoformat())
             ).select_related('run__actor', 'run__project')
    for event in queue.order_by('pk')[:100]:
        with transaction.atomic():
            selected = Event.objects.select_for_update(skip_locked=True).filter(
                pk=event.pk, data__delivery='PENDING',
            ).first()
            if selected is None:
                continue
            selected.data['delivery'] = 'INTENT'
            selected.save(update_fields=['data'])

        run, data = event.run, event.data
        receipt = {'state': 'VISIBLE'}
        warning = event.kind == 'reservation-warning'
        current = warning and ResourceReservation.objects.filter(
            pk=data['reservation_id'], expires=data['expires'], expires__gt=timezone.now(),
        ).exists()
        if warning and not current:
            receipt = {'state': 'SUPERSEDED'}
        elif run.state in ACTIVE_STATES and not run.suspension and run.actor.active and _live_connector(run):
            message = (f"Réservation CAB de {data['description']} : échéance à {data['expires']}. "
                       "Renouvelez-la si vous utilisez toujours cette ressource.") if warning else (
                f"CAB a libéré la ressource {data['description']}."
            )
            receipt = _dispatch(run, run.actor, run.session_id, message)
        result = {**data, 'delivery': receipt['state'], 'receipt': receipt}
        if receipt.get('reason') in ('reminder-native-thread-busy', 'reminder-native-idle-unconfirmed'):
            result.update(delivery='PENDING', next_at=(timezone.now() + timedelta(seconds=5)).isoformat())
        Event.objects.filter(pk=event.pk).update(data=result)


def launch_worker(lock, target):
    if not lock.acquire(blocking=False):
        return

    def work():
        try:
            target()
        finally:
            close_old_connections()
            lock.release()

    Thread(target=work, name='cab-reservation-' + target.__name__, daemon=True).start()


def launch():
    launch_worker(_sweep_worker, sweep)
    launch_worker(_notice_worker, dispatch_notices)
