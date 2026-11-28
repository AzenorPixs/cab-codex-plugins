"""Restitution des ressources attribuées au RUN avant la Publication."""
from django.utils import timezone

from .core import commands as c
from .core.models import Event, GitFileReservation, GitSessionIndex, Lease, Operation, ResourceReservation
from .resource_reservations import bank_activity, resource_guard
from .session_git import _index_path, context, git_snapshot, verify_releasable_index
from .workshops import cleanup_workshop


BANK_PHASES = ('cleanup', 'verify-cleanup')


def cleanup_passage(run):
    """Le passage actif, ou sa validation conservée aux étapes suivantes."""
    if run.configuration.get('cleanup_at_stage_10') is True:
        return run.configuration.get('stage_protocol', {}).get('active', {}).get('10')
    return None


def bank_proof(lease):
    """Retient une paire corrélée au banc après la dernière utilisation."""
    activity = bank_activity(lease.run_id, lease.resource_id, lease.created)
    if not activity.exists():
        return None
    operations = Operation.objects.filter(pk__in=activity.values('operation_id'))
    last_test = (
        operations.exclude(request__phase__in=BANK_PHASES)
        .order_by('-updated').values_list('updated', flat=True).first()
    )
    if last_test:
        operations = operations.filter(created__gt=last_test)
    operations = operations.filter(request__resources__contains=[lease.resource_id])
    clean = operations.filter(request__phase='cleanup').order_by('-created', '-pk').first()
    if clean and clean.state == 'COMPLETED' and clean.receipt.get('exit_code') == 0:
        verify = operations.filter(
            request__phase='verify-cleanup', created__gt=clean.updated,
            request__adapter_id=clean.request.get('adapter_id'),
        ).order_by('-created', '-pk').first()
        if verify and verify.state == 'COMPLETED' and verify.receipt.get('exit_code') == 0:
            return clean.request_id, verify.request_id
    return ()


def release_banks(run):
    pending = []
    released = []
    leases = Lease.objects.filter(run=run, operation__isnull=True, state='HELD').order_by('pk')
    for lease in leases:
        proof = bank_proof(lease)
        if proof == () or lease.evidence.get('uncertain'):
            pending.append({'lease_id': lease.pk, 'resource': lease.resource_id})
            continue
        data = {'project_id': run.project_id, 'run_id': run.run_id, 'lease_id': lease.pk}
        if proof:
            data.update(cleanup_request_id=proof[0], verification_request_id=proof[1])
        c.release_bank(run.actor, data)
        released.append(lease.pk)
    return released, pending


def release_files(run):
    index = GitSessionIndex.objects.select_for_update().filter(
        change_id=run.change_record_id, session_id=run.coding_session_id,
    ).first()
    if index is None:
        return 0
    owner_rows = ResourceReservation.objects.filter(run=run, source='git')
    reservations = GitFileReservation.objects.select_for_update().filter(
        git_index=index, pk__in=owner_rows.values('source_id'), active=True,
    )
    paths = list(reservations.order_by('path').values_list('path', flat=True))
    if not paths:
        return 0
    c.require(index.state == 'OPEN' and index.index_path
              and set(paths) <= set(index.origin.get('staged_sources', []))
              and not index.origin.get('finished_writes'), 'cleanup-git-index-not-ready')
    options, env = context(run.project)
    c.require(index.index_path == _index_path(run.project, index, options, env),
              'cleanup-git-index-not-ready')
    verify_releasable_index(run.project, index.index_path, paths)
    return reservations.update(active=False, released=timezone.now())


def inventory(run):
    """Seuls les chemins visibles de l’état Git sont retournés au codeur."""
    snapshot = git_snapshot(run.project)
    entries = snapshot['entries']
    return {'available': snapshot['available'], 'entries': entries, 'digest': c.digest(entries)}


def execute(run, attempt):
    """Avance les restitutions prouvées et expose le travail restant."""
    resource_guard()
    report = {'state': 'PENDING'}
    if not c.no_pending(run):
        return {**report, 'reason': 'cleanup-effects-unresolved'}
    banks, pending = release_banks(run)
    released_files = release_files(run)
    if banks or released_files:
        c.event(run, 'run-cleanup-resources', {
            'attempt': attempt, 'released_banks': banks, 'released_files': released_files,
        })
    if pending:
        return {**report, 'reason': 'cleanup-bank-proof-required', 'banks': pending}
    workspace = cleanup_workshop(run)
    if workspace == 'REMOVED':
        c.event(run, 'run-cleanup-workshop-removed', {'attempt': attempt})
    elif Event.objects.filter(run=run, kind='run-cleanup-workshop-removed', data__attempt=attempt).exists():
        workspace = 'REMOVED'
    return {'state': 'COMPLETED', 'workshop': workspace, 'inventory': inventory(run)}


def reviewed(run, attempt, inventory_digest):
    return Event.objects.filter(
        run=run, kind='stage-action-declared', data__result__attempt=attempt,
        data__result__action='inventaire', data__result__inventory_digest=inventory_digest,
    ).exists()
