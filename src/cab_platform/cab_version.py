"""Projection publique bornée de la version déclarée dans la configuration CAB."""
import re
import secrets
from datetime import timedelta
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.db import transaction
from .paths import config
from .core.models import Configuration,CabVersionProjection

VERSION=re.compile(r'^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$')

def sync():
    value=config().get('version')
    if not isinstance(value,str) or len(value)>100 or not VERSION.fullmatch(value):return False
    with transaction.atomic():
        row,created=Configuration.objects.select_for_update().get_or_create(key='cab',defaults={'value':{'version':value}})
        if not isinstance(row.value,dict):raise ValueError('cab-configuration-invalid')
        if not created and row.value.get('version')!=value:
            row.value={**row.value,'version':value};row.save(update_fields=['value','updated'])
        projection,created=CabVersionProjection.objects.select_for_update().get_or_create(pk=1,defaults={'version':value})
        changes=[]
        if projection.version!=value:projection.version=value;changes.append('version')
        schedule,_=Configuration.objects.select_for_update().get_or_create(key='git_version_schedule',defaults={'value':{}})
        due=parse_datetime(schedule.value.get('next_check','')) if isinstance(schedule.value,dict) else None
        now=timezone.now()
        if due is None or timezone.is_naive(due) or due<=now:
            from .project_git import git_version
            local_git=git_version()
            schedule.value={'next_check':(now+timedelta(seconds=86400+secrets.randbelow(3600))).isoformat(),'last_check':now.isoformat()}
            schedule.save(update_fields=['value','updated'])
            if local_git is not None and projection.git_version!=local_git:projection.git_version=local_git;changes.append('git_version')
        if changes:projection.save(update_fields=changes)
    return True
