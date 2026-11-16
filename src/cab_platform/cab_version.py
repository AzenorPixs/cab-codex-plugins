"""Projection publique bornée de la version déclarée dans la configuration CAB."""
import re
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
        if not created and projection.version!=value:
            projection.version=value;projection.save(update_fields=['version'])
    return True
