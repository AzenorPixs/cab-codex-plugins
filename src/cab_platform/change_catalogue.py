"""Projection des déclarations OpenSpec pour la page Changes."""

from collections import defaultdict
from datetime import datetime, time, timedelta, timezone as utc
from pathlib import Path
from secrets import randbelow

from django.db import transaction
from django.utils import timezone

from .core.commands import Refused
from .core.models import Change, Project, ProjectStatistics
from .core.monitor import identity
from .logging import redact
from .statistics_documents import catalogue


def next_daily_sync(now):
    tomorrow = now.astimezone(utc.utc).date() + timedelta(days=1)
    return datetime.combine(tomorrow, time(), utc.utc) + timedelta(seconds=randbelow(86400))


def public_projection(change, sources, now):
    previous = {row['source']: row for row in change.catalogue}
    seen = {source['path'] for source in sources}
    removed_open = any(not row['archived'] for path, row in previous.items() if path not in seen)
    rows = []
    hashes = {}
    for item in sorted(sources, key=lambda source: source['path']):
        source = item['path']
        files = {name: info for name, info in item['manifest'].items() if name != '_directory'}
        digest = {name: info['sha256'] for name, info in files.items()}
        hashes[source] = digest
        old = previous.get(source)
        old_hashes = change.catalogue_hashes.get(source)
        if old is not None and old_hashes == digest:
            changed_at = old['changed_at']
        elif old is None and not (item['archived'] and removed_open):
            modified = max((info['mtime'] for info in files.values()), default=item['directory_mtime'])
            changed_at = datetime.fromtimestamp(modified / 1_000_000_000, tz=utc.utc).isoformat()
        else:
            changed_at = now.isoformat()
        metadata = item['metadata']
        rows.append({
            'source': source,
            'identifier': change.identifier,
            'title': redact(metadata['title'], limit=250) if metadata.get('title') else None,
            'tasks_done': metadata.get('tasks_done'),
            'tasks_total': metadata.get('tasks_total'),
            'changed_at': changed_at,
            'archived': item['archived'],
            'archived_at': item['archived_at'],
        })
    return rows, hashes


@transaction.atomic
def refresh(project_id, *, identifier=None):
    project = Project.objects.select_for_update().get(pk=project_id)
    root = Path(project.root)
    if project.creation_state != 'READY' or not root.is_dir() or root.resolve() != root:
        raise Refused('change-catalogue-unavailable', 503)
    try:
        sources = catalogue(root, identifier=identifier, projection=True)
        directories = {(item['manifest']['_directory']['device'], item['manifest']['_directory']['inode'])
                       for item in sources}
        if len(directories) != len(sources):
            raise ValueError('change-directory-moved-during-scan')
    except (OSError, ValueError) as error:
        raise Refused('change-catalogue-unavailable', 503) from error

    by_identifier = defaultdict(list)
    for item in sources:
        by_identifier[item['identifier']].append(item)
    existing = Change.objects.filter(project=project)
    if identifier is not None:
        existing = existing.filter(identifier=identifier)
    changes = {change.identifier: change for change in existing}
    for key in by_identifier.keys() - changes.keys():
        changes[key], _ = Change.objects.get_or_create(
            project=project, identifier=key, defaults={'id': identity([project.pk, key])})

    now = timezone.now()
    for key, change in changes.items():
        rows, hashes = public_projection(change, by_identifier.get(key, []), now)
        if rows != change.catalogue or hashes != change.catalogue_hashes:
            Change.objects.filter(pk=change.pk).update(catalogue=rows, catalogue_hashes=hashes)
    if identifier is None:
        state, _ = ProjectStatistics.objects.get_or_create(project=project)
        if state.next_catalogue_sync is None or state.next_catalogue_sync <= now:
            state.next_catalogue_sync = next_daily_sync(now)
            state.save(update_fields=['next_catalogue_sync'])
