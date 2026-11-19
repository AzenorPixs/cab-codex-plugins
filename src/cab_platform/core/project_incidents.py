"""Consultation paginée des déclarations CCAB d’un projet."""
from .auth import principal
from .commands import require, scope
from .models import Incident, Project


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
    } for row in rows[offset:offset + page_size]]
    return {'incidents': incidents, 'total': total, 'page': page, 'page_size': page_size, 'has_next': offset + page_size < total}
