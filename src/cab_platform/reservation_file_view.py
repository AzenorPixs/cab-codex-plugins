"""Aperçu borné d’un fichier réservé, sous l’identité POSIX du codeur."""
from contextlib import ExitStack
import hashlib
import os
from pathlib import Path
import secrets
import stat
import time

LIMIT = 256 * 1024


class FileRefused(ValueError):
    pass


def edit_file(packet):
    root = Path(packet['directory'])
    path = Path(packet['path'])
    if path.is_absolute() or not path.parts or '..' in path.parts:
        raise FileRefused('reservation-file-unavailable')

    directory_flags = os.O_RDONLY | os.O_NOFOLLOW | os.O_DIRECTORY
    with ExitStack() as close:
        directory = os.open(root.anchor, directory_flags)
        close.callback(os.close, directory)
        for part in (*root.parts[1:], *path.parts[:-1]):
            directory = os.open(part, directory_flags, dir_fd=directory)
            close.callback(os.close, directory)

        fd = os.open(path.name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory)
        file = close.enter_context(os.fdopen(fd, 'rb'))
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size > LIMIT:
            raise FileRefused('reservation-file-unavailable')
        content = file.read(LIMIT + 1)
        if len(content) > LIMIT or b'\0' in content:
            raise FileRefused('reservation-file-unavailable')
        try:
            text = content.decode('utf-8')
        except UnicodeError:
            raise FileRefused('reservation-file-unavailable') from None

        digest = hashlib.sha256(content).hexdigest()
        writable = (info.st_uid == os.geteuid() and not info.st_mode & 0o7000 and not os.listxattr(fd)
                    and os.access(path.name, os.W_OK, dir_fd=directory)
                    and os.access('.', os.W_OK | os.X_OK, dir_fd=directory))
        if 'content' in packet:
            replacement = packet['content'].encode('utf-8')
            if not writable or len(replacement) > LIMIT or b'\0' in replacement:
                raise FileRefused('reservation-file-write-forbidden')
            if packet['digest'] != digest:
                raise FileRefused('reservation-file-changed')
            name = '.cab-editor-' + secrets.token_hex(12)
            temp = os.open(name, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600, dir_fd=directory)
            try:
                with os.fdopen(temp, 'wb') as output:
                    if os.fstat(output.fileno()).st_gid != info.st_gid:
                        os.fchown(output.fileno(), -1, info.st_gid)
                    os.fchmod(output.fileno(), stat.S_IMODE(info.st_mode))
                    output.write(replacement)
                    output.flush()
                    os.fsync(output.fileno())
                present = os.stat(path.name, dir_fd=directory, follow_symlinks=False)
                if (present.st_ino, present.st_dev, present.st_ctime_ns, present.st_nlink) != (
                        info.st_ino, info.st_dev, info.st_ctime_ns, 1):
                    raise FileRefused('reservation-file-changed')
                if time.time() >= packet['deadline']:
                    raise FileRefused('reservation-expired')
                os.replace(name, path.name, src_dir_fd=directory, dst_dir_fd=directory)
            finally:
                try:
                    os.unlink(name, dir_fd=directory)
                except FileNotFoundError:
                    pass
            text, digest = packet['content'], hashlib.sha256(replacement).hexdigest()
        return {'path': packet['path'], 'text': text, 'digest': digest, 'editable': writable}


def view(actor, reservation_id, update=None):
    from django.db import transaction
    from django.utils import timezone

    from .core import commands as c
    from .core.models import GitFileReservation, Lease, ResourceReservation
    from .execution import BeforeEffect, child
    from .resource_reservations import git_guard, resource_guard
    from .session_git import _visible_entry

    with transaction.atomic():
        if update is not None:
            git_guard()
            resource_guard()
        rows = ResourceReservation.objects.select_related('run__actor', 'run__project').filter(
            pk=reservation_id, kind='file', expires__gt=timezone.now(),
        )
        if update is not None:
            rows = rows.select_for_update(of=('self',))
        row = rows.first()
        c.require(row is not None, 'reservation-unavailable', 404)
        run = row.run
        c.scope(actor, run.project)
        root = Path(run.project.root)
        if row.source == 'git':
            entry = GitFileReservation.objects.filter(pk=row.source_id, project=run.project, active=True).first()
            file_path = entry.path if entry else ''
        else:
            lease = Lease.objects.filter(pk=row.source_id, run=run, state='HELD').first()
            prefix = 'file:' + str(root) + '/'
            file_path = lease.resource_id[len(prefix):] if lease and lease.resource_id.startswith(prefix) else ''
        c.require(file_path and _visible_entry('?', file_path) is not None, 'reservation-file-unavailable', 404)
        c.safe_path(root, file_path)
        may_edit = row.source == 'git' and (actor.pk == run.actor_id or actor.role == 'admin') and (
            run.actor.active and run.state == 'WORKING' and not run.suspension
        )
        if update is not None:
            c.require(may_edit and c.no_pending(run), 'reservation-file-write-forbidden', 403)

        packet = {'action': 'reservation-file', 'directory': str(root), 'path': file_path}
        if update is not None:
            packet.update(content=update.content, digest=update.digest, deadline=row.expires.timestamp())
        try:
            result = child(packet, run.actor.uid, timeout=5)
        except BeforeEffect as error:
            raise c.Refused(str(error), 409) from None
        result['editable'] = result['editable'] and may_edit
        if update is not None:
            c.event(run, 'reservation-file-edited', {'reservation_id': row.pk, 'digest': result['digest'], 'actor': actor.pk})
        return result
