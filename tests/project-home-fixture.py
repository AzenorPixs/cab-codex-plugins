"""Données synthétiques du banc navigateur, sans lecture de fichier réel."""
import os
from pathlib import Path
import json
import sys
if os.environ.get('CAB_TEST_FIXTURE')!='1' or not Path('/.dockerenv').exists():raise RuntimeError('dedicated-container-required')
os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
import django
django.setup()
from cab_platform.core.models import Project
root=Path('/tmp/cab-home-browser-fixture');root.mkdir(exist_ok=True)
action=sys.argv[1] if len(sys.argv)>1 else 'initial'
file=root/'project.env'
if action=='delete':file.unlink(missing_ok=True)
else:
    title='Projet démonstration' if action=='initial' else 'Projet actualisé'
    content=f'PROJECT_ID=home-fixture\nPROJECT_NAME="{title}"\nPROJECT_VERSION=1.2.3\nPROJECT_TYPE="Python, TypeScript, React"\nREMOTE_FORGEJO_BASE_URL=https://forge.example.org\nREMOTE_FORGEJO_OWNER=fixture\nREMOTE_GITHUB_REPOSITORY=cab-fixture\nREMOTE_GITHUB_TOKEN=synthetic-secret-never-public\n'
    if action=='updated':content=content.replace('1.2.3','2.0.0').replace('Python, TypeScript, React','Python, Django').replace('REMOTE_GITHUB_REPOSITORY=cab-fixture\n','')
    temporary=root/'replacement';temporary.write_text(content);temporary.replace(file)
import hashlib
project,created=Project.objects.get_or_create(pk=hashlib.sha256(str(root).encode()).hexdigest(),defaults={'identifier':'home-fixture','name':'Nom de création','root':str(root),'owner_uid':0,'configuration':{'private':'synthetic-private-configuration'}})
print(json.dumps({'project_id':project.pk,'identifier':project.identifier,'root':str(root),'action':action}))
