"""Données d'affichage synthétiques, uniquement dans le conteneur de recette."""
import json
import os
from pathlib import Path
import sys
if os.environ.get('CAB_TEST_FIXTURE')!='1' or not Path('/.dockerenv').exists():raise RuntimeError('dedicated-container-required')
import django
django.setup()
from django.utils import timezone
from cab_platform.core.models import Actor,McpConnector,McpConnectorProjection
from cab_platform.core.connectors import project_connector
from cab_platform.connector_process import identity
ids={'codex':'d324'+('1'*28),'opencode':'d324'+('2'*28)}
action=sys.argv[1]
if action=='cleanup':
    McpConnectorProjection.objects.filter(connector_id__in=ids.values()).delete();McpConnector.objects.filter(pk__in=ids.values()).delete()
else:
    for agent,key in ids.items():
        actor=Actor.objects.filter(agent=agent,uid=0,active=True).first()
        assert actor is not None
        version='3.2.3' if agent=='codex' and action=='seed' else '3.2.4'
        row,_=McpConnector.objects.update_or_create(pk=key,defaults={'actor':actor,'agent':agent,'process':identity(1),'worker':identity(1),'loaded_version':version,'catalog_version':version,'relay_version':'3.2.4','state':'DISCONNECTED' if agent=='codex' and action=='disconnect' else 'READY','seen':timezone.now()})
        project_connector(row)
print(json.dumps({'fixture_action':action}))
