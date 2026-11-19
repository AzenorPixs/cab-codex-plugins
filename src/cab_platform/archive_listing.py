"""Pagination des archives selon le périmètre autorisé de l'acteur."""
from .core.commands import require,scope
from .core.models import Project,SessionArchive

ARCHIVE_PAGE_SIZE=10


def archive_page(actor,project_id='',page=1):
    require(actor.active,'project-not-authorized',403)
    require(type(page) is int and 1<=page<=1000000,'session-archives-page-invalid',400)
    if project_id:
        project=Project.objects.get(pk=project_id);scope(actor,project)
        rows=SessionArchive.objects.filter(run__project=project)
    elif actor.role=='admin':rows=SessionArchive.objects.all()
    else:rows=SessionArchive.objects.filter(run__project__in=actor.projects.all())
    total=rows.count();pages=max(1,(total+ARCHIVE_PAGE_SIZE-1)//ARCHIVE_PAGE_SIZE)
    current=min(page,pages);offset=(current-1)*ARCHIVE_PAGE_SIZE
    selected=rows.select_related('run','run__change_record').order_by('-created','-pk')[offset:offset+ARCHIVE_PAGE_SIZE]
    return selected,{'page':current,'page_size':ARCHIVE_PAGE_SIZE,'total':total,'total_pages':pages,'has_next':current<pages}
