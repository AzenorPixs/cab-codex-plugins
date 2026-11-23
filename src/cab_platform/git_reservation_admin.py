"""Libération administrative d'une réservation Git identifiée."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import sys

from django.db import connection, transaction
from django.utils import timezone

IDENTITY = {'project_id', 'run_id', 'session_id', 'generation', 'index_id', 'reservation_id', 'path'}
COMPARE = {'keep_oid', 'index_sha256', 'blob_oid'}
EVENT = 'git-file-reservation-released'


def inspect_target(current, data):
    from .core import commands as c
    from .core.models import GitDelivery, GitFileReservation, GitSessionIndex, Lease
    from .git_commit_remove import OID, context, run
    from .session_delivery import _gitdir
    from .session_git import verify_releasable_index

    c.working(current)
    c.require(
        not current.review and not current.mandate.get('native_frozen_at')
        and not current.mandate.get('legacy_snapshot_id'),
        'session-git-release-protected', 409,
    )
    c.require(
        c.no_pending(current) and not Lease.objects.filter(run=current, state='HELD').exists(),
        'session-git-effect-unresolved', 409,
    )
    index = GitSessionIndex.objects.select_for_update().filter(
        pk=data['index_id'], initial_run=current, change_id=current.change_record_id,
        session_id=current.coding_session_id,
    ).first()
    c.require(index is not None, 'session-git-release-identity-divergent', 409)
    c.require(
        index.state == 'OPEN' and not GitDelivery.objects.filter(git_index=index).exists(),
        'session-git-release-protected', 409,
    )
    c.require(
        not index.effects.filter(state__in=['INTENT', 'RUNNING', 'UNKNOWN']).exists()
        and not GitDelivery.objects.filter(
            project=current.project, state__in=['PENDING', 'RUNNING', 'PARTIAL', 'UNKNOWN'],
        ).exists(),
        'session-git-effect-unresolved', 409,
    )
    path = data['path']
    target = c.safe_path(Path(current.project.root), path)
    c.require(str(Path(path)) == path and target.is_file(), 'session-git-release-file-required', 400)
    reservation = GitFileReservation.objects.select_for_update().filter(
        pk=data['reservation_id'], project=current.project, git_index=index, path=path,
        path_digest=hashlib.sha256(path.encode()).hexdigest(), active=True,
    ).first()
    c.require(reservation is not None, 'session-git-release-identity-divergent', 409)

    options, env = context(current.project)
    gitdir = _gitdir(current.project, options, env)
    directory = gitdir / 'cab-session-index'
    token = hashlib.sha256(f'{index.change_id}:{index.session_id}'.encode()).hexdigest()
    try:
        directory_info = directory.lstat()
        git_info = gitdir.stat()
    except OSError as error:
        raise c.Refused('session-git-index-unavailable', 409) from error
    c.require(
        stat.S_ISDIR(directory_info.st_mode) and directory_info.st_uid == git_info.st_uid == current.project.owner_uid
        and not directory_info.st_mode & 0o007
        and (not directory_info.st_mode & 0o070 or directory_info.st_gid == git_info.st_gid)
        and index.index_path == str(directory / (token + '.index'))
        and index.keep_ref == 'refs/cab/session-index/' + token and OID.fullmatch(index.keep_oid),
        'session-git-index-unavailable', 409,
    )
    keep = run(current.project, options, env, 'rev-parse', '--verify', index.keep_ref)
    c.require(keep.returncode == 0 and keep.stdout.strip() == index.keep_oid.encode(),
              'session-git-index-unavailable', 409)
    digest = verify_releasable_index(current.project, index.index_path, [path])
    private = {**env, 'GIT_INDEX_FILE': index.index_path}
    staged = run(current.project, options, private, 'rev-parse', '--verify', ':' + path)
    working = run(current.project, options, env, 'hash-object', '--no-filters', '--', path)
    blob = staged.stdout.decode('ascii', 'replace').strip()
    c.require(staged.returncode == working.returncode == 0 and OID.fullmatch(blob)
              and staged.stdout == working.stdout, 'session-git-release-unstaged', 409)
    remaining = index.reservations.filter(active=True).exclude(pk=reservation.pk).count()
    return reservation, index, {
        **{k: data[k] for k in sorted(IDENTITY)},
        'keep_oid': index.keep_oid,
        'index_sha256': digest,
        'blob_oid': blob,
        'remaining_count': remaining,
    }


def reservation_release(actor, action, data):
    """Inspecte, libère ou relit le reçu sous le verrou Git de CAB."""
    from .core import commands as c
    from .core.models import Event

    c.require(actor.active and actor.role == 'admin' and actor.uid == 0,
              'administrator-required', 403)
    fields = {
        'inspect': IDENTITY,
        'release': IDENTITY | COMPARE | {'request_id', 'authorization'},
        'status': {'project_id', 'run_id', 'request_id'},
    }
    c.require(action in fields and isinstance(data, dict) and set(data) == fields[action],
              'session-git-fields-invalid', 400)
    if action != 'inspect':
        request_id = c.identifier(data['request_id'])
    if action != 'status':
        c.require(all(type(data[key]) is int and data[key] > 0
                      for key in ('generation', 'index_id', 'reservation_id')),
                  'session-git-release-identity-invalid', 400)
    if action == 'release':
        authorization = data['authorization']
        c.require(isinstance(authorization, str) and 20 <= len(authorization.strip()) <= 4000,
                  'session-git-release-authorization-required', 400)
        fingerprint = c.digest(data)

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute('SELECT pg_advisory_xact_lock(%s,%s)', [7348501, 7348502])
        current = c.run_scope(actor, data['run_id'], data['project_id'], lock=True, owner=False)
        if action != 'inspect':
            previous = Event.objects.filter(run=current, kind=EVENT, data__request_id=request_id).first()
            if previous:
                if action == 'release':
                    c.require(previous.data['fingerprint'] == fingerprint,
                              'session-git-release-request-conflict', 409)
                return previous.data['receipt']
            c.require(action != 'status', 'session-git-release-receipt-not-found', 404)

        c.require(current.session_id == data['session_id'] and current.generation == data['generation'],
                  'session-git-release-identity-divergent', 409)
        reservation, index, proof = inspect_target(current, data)
        if action == 'inspect':
            return {**proof, 'effects_issued': False}
        c.require(all(proof[key] == data[key] for key in COMPARE),
                  'session-git-release-index-changed', 409)

        receipt = {
            **proof, 'request_id': request_id, 'state': 'RELEASED', 'released_count': 1,
            'index_preserved': True, 'delivered': False,
        }
        reservation.active = False
        reservation.released = timezone.now()
        reservation.save(update_fields=['active', 'released'])
        if not proof['remaining_count']:
            index.state = 'RELEASED'
            index.origin = {**index.origin, 'release': receipt}
            index.save(update_fields=['state', 'origin', 'updated'])
        c.event(current, EVENT, {
            'request_id': request_id, 'fingerprint': fingerprint, 'actor': actor.pk,
            'authorization': authorization, 'receipt': receipt,
        })
        return receipt


def main():
    parser = argparse.ArgumentParser(prog='cab git-reservation-admin')
    parser.add_argument('action', choices=['inspect', 'release', 'status'])
    args = parser.parse_args()
    if os.geteuid() != 0:
        print(json.dumps({'error': 'root-administration-required'}), file=sys.stderr)
        return 1
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cab_platform.settings')
    import django
    django.setup()
    from .core import commands as c
    from .core.models import Actor

    try:
        actor = Actor.objects.filter(pk='system-admin', uid=0, role='admin', active=True).first()
        c.require(actor is not None, 'administrator-required', 403)
        result = reservation_release(actor, args.action, json.load(sys.stdin))
    except (c.Refused, ValueError, OSError) as error:
        from .logging import redact
        print(json.dumps({'error': redact(str(error))}), file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
