"""Recette du catalogue sur PostgreSQL et Electric éphémères."""
import json
from datetime import timedelta
import os
from pathlib import Path
import socket
import subprocess
import sys
from tempfile import TemporaryDirectory
import time
from types import SimpleNamespace
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
PG = Path('/usr/lib/postgresql/17/bin')
ELECTRIC = Path('/usr/lib/cab/electric')
sys.path[:0] = [str(ROOT/'src'), '/usr/lib/cab/python-vendor']
os.environ['PSYCOPG_IMPL'] = 'python'


def free_port():
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        return listener.getsockname()[1]


def postgres(command, *args):
    subprocess.run([PG/command, *args], check=True, stdout=subprocess.DEVNULL)


def qualify(base, port):
    from django.conf import settings
    settings.configure(SECRET_KEY='fixture', USE_TZ=True,
        INSTALLED_APPS=['django.contrib.auth', 'django.contrib.contenttypes', 'django.contrib.sessions', 'cab_platform.core'],
        DATABASES={'default': {'ENGINE': 'django.db.backends.postgresql', 'NAME': 'postgres',
                              'USER': 'fixture', 'HOST': '127.0.0.1', 'PORT': port}},
        DEFAULT_AUTO_FIELD='django.db.models.BigAutoField')
    import django
    django.setup()
    from django.core.management import call_command
    from django.db import connection
    from django.utils import timezone
    from django.test import RequestFactory
    import httpx
    from cab_platform import change_catalogue, statistics_watch, web_views
    from cab_platform.bootstrap import CHANGE_CATALOGUE_ELECTRIC_SQL
    from cab_platform.core import api
    from cab_platform.core.models import Change, Project, ProjectStatistics

    call_command('migrate', verbosity=0)
    with connection.cursor() as cursor:
        cursor.execute('CREATE ROLE cab_electric LOGIN REPLICATION')
        cursor.execute('CREATE PUBLICATION electric_publication_default')
        cursor.execute(CHANGE_CATALOGUE_ELECTRIC_SQL)
        cursor.execute("SELECT has_column_privilege('cab_electric', 'changes', 'catalogue', 'SELECT'),"
                       "has_column_privilege('cab_electric', 'changes', 'catalogue_hashes', 'SELECT')")
        assert cursor.fetchone() == (True, False)

    owner = {'owner_uid':os.getuid(), 'owner_gid':os.getgid(), 'creation_state':'READY'}
    project = Project.objects.create(pk='fixture-alpha', identifier='alpha', name='Alpha', root=str(base/'alpha'), **owner)
    beta = Project.objects.create(pk='fixture-beta', identifier='beta', name='Beta', root=str(base/'beta'), **owner)
    folder = Path(project.root)/'openspec/changes/sample'
    folder.mkdir(parents=True)
    (folder/'proposal.md').write_text('# Titre du change\n')
    (folder/'tasks.md').write_text('- [x] 1. Fait\n- [ ] 2. En cours\n')
    (folder/'STATISTICS.md').write_text('# Rapport\n')
    other = Path(beta.root)/'openspec/changes/other'
    other.mkdir(parents=True)
    (other/'proposal.md').write_text('# Autre projet\n')
    with patch.object(statistics_watch,'sync',return_value={'state':'DEFERRED'}):
        statistics_watch.synchronize(project.pk)
    change_catalogue.refresh(beta.pk)
    current = Change.objects.get(project=project,identifier='sample')
    row = current.catalogue[0]
    assert row['title']=='Titre du change' and row['tasks_done']==1 and row['tasks_total']==2
    assert len(current.catalogue_hashes[row['source']]['STATISTICS.md'])==64
    scheduled = ProjectStatistics.objects.get(project=project).next_catalogue_sync
    assert scheduled.date()==timezone.now().date()+timedelta(days=1)
    (folder/'STATISTICS.md').touch()
    change_catalogue.refresh(project.pk)
    current.refresh_from_db()
    assert current.catalogue[0]['changed_at']==row['changed_at']
    assert ProjectStatistics.objects.get(project=project).next_catalogue_sync==scheduled
    ProjectStatistics.objects.filter(project=project).update(
        next_catalogue_sync=timezone.now()-timedelta(seconds=1), next_full_sync=scheduled)
    watcher=statistics_watch.Watcher()
    try:
        watcher.rebuild()
        assert project.pk in watcher.dirty
        with patch.object(statistics_watch,'sync',return_value={'state':'OK'}) as sync:
            statistics_watch.synchronize(project.pk)
            sync.assert_called_once_with(project,full=False,automatic=True)
        assert ProjectStatistics.objects.get(project=project).next_catalogue_sync>timezone.now()
    finally:
        watcher.close()

    electric_port = free_port()
    secret='fixture-project-changes'
    database_url=f'postgresql://cab_electric:fixture@127.0.0.1:{port}/postgres?sslmode=disable'
    env={**os.environ,'DATABASE_URL':database_url,'ELECTRIC_DATABASE_URL':database_url,
         'ELECTRIC_SECRET':secret,'ELECTRIC_PORT':str(electric_port),'ELECTRIC_BIND_ADDRESS':'127.0.0.1',
         'ELECTRIC_STORAGE_DIR':str(base/'electric'),'ELECTRIC_MANUAL_TABLE_PUBLISHING':'true',
         'ELECTRIC_USAGE_REPORTING':'false','ELECTRIC_TELEMETRY':'disabled','ERL_FLAGS':'+S 2',
         'RELEASE_NODE':f'project_changes_{electric_port}@localhost','RELEASE_DISTRIBUTION':'none',
         'ERL_CRASH_DUMP':str(base/'erl_crash.dump'),
         'LANG':'C.UTF-8','LC_ALL':'C.UTF-8'}
    with (base/'electric.log').open('wb') as log, subprocess.Popen(
            [ELECTRIC/'bin/entrypoint','start'],cwd=ELECTRIC,env=env,stdout=log,stderr=subprocess.STDOUT) as electric:
        try:
            deadline=time.monotonic()+20
            while time.monotonic()<deadline:
                try:
                    if httpx.get(f'http://127.0.0.1:{electric_port}/v1/health',timeout=.5).is_success:
                        break
                except httpx.HTTPError:
                    pass
                time.sleep(.2)
            actor=SimpleNamespace(active=True,role='admin')
            requests=RequestFactory()
            with patch.object(web_views,'principal',return_value=actor), patch.object(web_views,'config',return_value={'electric_port':electric_port,'electric_secret':secret}):
                first=web_views.sync_project_changes(requests.get('/',{'project_id':project.pk,'offset':'-1','columns':'catalogue_hashes','where':'true'}))
                assert first.status_code==200, (first.status_code,(base/'electric.log').read_text()[-3000:])
                initial=json.loads(first.content)
                assert any(item.get('value',{}).get('id')==current.pk for item in initial)
                assert b'Autre projet' not in first.content and b'catalogue_hashes' not in first.content
                with patch.object(api,'principal',return_value=actor):
                    assert api.project_changes(None,project.pk)['changes'][0]['catalogue'][0]==row
                    from cab_platform.core.commands import Refused
                    try:
                        api.refresh_project_change(None,beta.pk,current.pk)
                    except Refused as error:
                        assert error.code=='change-not-found'
                    else:
                        raise AssertionError('L’actualisation accepte un change étranger')
                    (folder/'STATISTICS.md').write_text('# Rapport amendé\n')
                    assert api.refresh_project_change(None,project.pk,current.pk)=={'refreshed':True}
                current.refresh_from_db()
                assert current.catalogue[0]['changed_at']>row['changed_at']
                archive=folder.parent/'archive/2026-11-24-sample'
                archive.parent.mkdir()
                folder.rename(archive)
                change_catalogue.refresh(project.pk)
                current.refresh_from_db()
                assert current.catalogue[0]['archived_at']=='2026-11-24'
                second=web_views.sync_project_changes(requests.get('/',{
                    'project_id':project.pk,'offset':first['electric-offset'],'handle':first['electric-handle'],'live':'true'}))
                assert second.status_code==200 and b'2026-11-24-sample' in second.content, second.status_code
        finally:
            electric.terminate()
            try:
                electric.wait(timeout=8)
            except subprocess.TimeoutExpired:
                electric.kill()
                electric.wait()
    print('PostgreSQL et Electric : inventaire, isolation, empreintes, actualisation et archivage validés.')


if __name__=='__main__':
    with TemporaryDirectory(prefix='project-changes-',dir=os.environ.get('TMPDIR',ROOT/'.cab-tests')) as directory:
        root=Path(directory)
        data=root/'pg'
        port=free_port()
        postgres('initdb','-D',data,'-A','trust','-U','fixture','--no-locale','--encoding=UTF8')
        postgres('pg_ctl','-D',data,'-l',root/'postgres.log','-o',
                 f'-h 127.0.0.1 -p {port} -k {root} -c wal_level=logical','-w','start')
        try:
            qualify(root,port)
        finally:
            postgres('pg_ctl','-D',data,'-m','fast','-w','stop')
