"""Installation neuve et projection Electric réelle, dans un conteneur vierge."""
import json
import os
from pathlib import Path
import subprocess
import time
import httpx

assert Path('/.dockerenv').exists() and os.environ.get('CAB_TEST_FIXTURE')=='1'
base='http://127.0.0.1:8790/api/v1/'
with httpx.Client(timeout=75) as client:
    for _ in range(100):
        try:
            health=client.get(base+'health').json();break
        except httpx.HTTPError:time.sleep(.2)
    assert health['state']=='UNINITIALIZED',health
    token=subprocess.check_output(['/usr/bin/cab','bootstrap-token'],text=True).strip()
    result=client.post(base+'bootstrap',json={'username':'fixture-admin','password':'synthetic-fixture-password'},headers={'X-CAB-Bootstrap':token,'X-CSRFToken':health['csrf_token']})
    assert result.status_code==200,result.status_code
    for _ in range(100):
        health=client.get(base+'health').json()
        if health['state']=='READY':break
        time.sleep(.2)
    assert health['state']=='READY',health
    result=client.post(base+'login',json={'username':'fixture-admin','password':'synthetic-fixture-password'},headers={'X-CSRFToken':health['csrf_token']});assert result.status_code==200
    os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
    import django
    django.setup()
    from django.db import connection
    from cab_platform.core.models import Project
    from cab_platform.project_metadata import synchronize
    root=Path('/tmp/fresh-home-project');root.mkdir();(root/'project.env').write_text('PROJECT_NAME=Fresh\nPROJECT_VERSION=3.2.0\n')
    project=Project.objects.create(pk='a'*64,identifier='fresh-home',name='Initial',root=str(root),owner_uid=0)
    synchronize(project.pk)
    response=client.get(base+'sync/project',params={'project_id':project.pk,'offset':'-1'})
    assert response.status_code==200,(response.status_code,response.text[:500])
    rows=[item['value'] for item in response.json() if 'value' in item]
    assert rows, 'empty-project-shape'
    public=rows[0]['public_metadata']
    if isinstance(public,str):public=json.loads(public)
    assert public['values']['PROJECT_NAME']=='Fresh',rows
    with connection.cursor() as cursor:
        cursor.execute("SELECT has_table_privilege('cab_electric','projects','SELECT'),has_table_privilege('cab_electric','project_metadata_projection','SELECT')")
        assert cursor.fetchone()==(False,True)
    print(json.dumps({'fresh_web_bootstrap':True,'postgresql_migrations':True,'electric_real_shape':True,'private_projects_table_not_readable':True,'version':health['version']}))
