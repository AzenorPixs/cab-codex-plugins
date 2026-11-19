"""Consultation et suppression manuelle des déclarations CCAB d’un projet."""
from django.db import transaction
from .auth import principal
from .commands import Refused, digest, require, scope
from .models import Event, Incident, Project


def purge_revision(row: Incident) -> str:
    return digest([row.incident_id, row.project_id, row.created.isoformat(), row.state, row.resolution])


def project_incidents(request, project_id: str, page: int = 1, page_size: int = 25):
    actor = principal(request)
    project = Project.objects.get(pk=project_id)
    scope(actor, project)
    require(page >= 1 and 1 <= page_size <= 100, 'incident-pagination-invalid', 400)
    rows = Incident.objects.filter(project=project).select_related('run').order_by('-created', 'incident_id')
    total = rows.count()
    page = min(page, max(1, (total + page_size - 1) // page_size))
    offset = (page - 1) * page_size
    incidents = [{
        'incident_id': row.incident_id,
        'project_id': row.project_id,
        'run_id': row.run.run_id if row.run_id else None,
        'category': row.category,
        'summary': row.summary,
        'evidence': row.evidence,
        'state': row.state,
        'claim': row.claim,
        'resolution': row.resolution,
        'created': row.created,
        'purge_revision': purge_revision(row) if actor.role == 'admin' and row.state == 'RESOLVED' else None,
    } for row in rows[offset:offset + page_size]]
    return {'incidents': incidents, 'total': total, 'page': page, 'page_size': page_size, 'has_next': offset + page_size < total}


@transaction.atomic
def purge_project_incident(request, project_id: str, incident_id: str, expected_revision: str):
    actor = principal(request, admin=True)
    project = Project.objects.filter(pk=project_id).first()
    require(project is not None, 'incident-not-found', 404)
    scope(actor, project)
    try:
        row = Incident.objects.select_for_update().get(pk=incident_id, project=project)
    except Incident.DoesNotExist:
        raise Refused('incident-not-found', 404) from None
    require(row.state == 'RESOLVED', 'incident-unresolved', 409)
    require(purge_revision(row) == expected_revision, 'incident-snapshot-stale', 409)
    row.delete()
    Event.objects.create(project=project, kind='ccab-incident-purged',
                         data={'incident_id': incident_id, 'actor': actor.pk})
    return {'status': 'PURGED_TREATED'}
