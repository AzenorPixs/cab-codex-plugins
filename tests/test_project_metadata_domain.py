"""PostgreSQL et inotify réels du seul conteneur de qualification CAB."""
import hashlib
import json
import os
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import patch

if os.environ.get('CAB_TEST_FIXTURE')!='1' or not Path('/.dockerenv').exists():raise RuntimeError('dedicated-container-required')
os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
import django
django.setup()
from django.db import connection,transaction
from django.test import RequestFactory
from cab_platform.core.models import Actor,Project
from cab_platform.core.api import refresh_project
from cab_platform.project_metadata import synchronize
from cab_platform.statistics_watch import Watcher
from cab_platform.web_views import sync_project

class MetadataDomainTests(unittest.TestCase):
    def setUp(self):
        self.atomic=transaction.atomic();self.atomic.__enter__();self.tmp=tempfile.TemporaryDirectory(prefix='cab-home-domain-');self.root=Path(self.tmp.name)
        self.project=Project.objects.create(pk=hashlib.sha256(str(self.root).encode()).hexdigest(),root=str(self.root),name='Création',owner_uid=os.getuid(),configuration={'private':'synthetic-secret'})
        self.actor=Actor.objects.create(pk='metadata-fixture',uid=os.getuid(),role='coder',agent='fixture',token_hash='metadata-fixture-token-hash')
        self.actor.projects.add(self.project);self.file=self.root/'project.env';self.factory=RequestFactory()
    def tearDown(self):
        transaction.set_rollback(True);self.atomic.__exit__(None,None,None);self.tmp.cleanup()
    def test_snapshot_revision_idempotence_and_removal(self):
        self.file.write_text('PROJECT_NAME=Premier\nPROJECT_VERSION=1\nREMOTE_GITHUB_TOKEN=synthetic-secret\n')
        first=synchronize(self.project.pk);self.assertEqual(first['revision'],1);self.assertEqual(synchronize(self.project.pk),first)
        self.file.write_text('PROJECT_NAME=Deuxième\n');second=synchronize(self.project.pk)
        self.assertEqual(second['revision'],2);self.assertNotIn('PROJECT_VERSION',second['values'])
        self.file.unlink();last=synchronize(self.project.pk);self.assertEqual(last['state'],'missing');self.assertEqual(last['values'],{})
        self.project.refresh_from_db();self.assertEqual(self.project.configuration,{'private':'synthetic-secret'});self.assertEqual(self.project.name,'Création')
    def test_refresh_is_authorized_before_file_read(self):
        foreign=Actor.objects.create(pk='metadata-foreign',uid=os.getuid(),role='coder',agent='fixture',token_hash='metadata-foreign-token-hash')
        from cab_platform.core.commands import Refused
        with patch('cab_platform.core.api.principal',return_value=foreign),patch('cab_platform.project_metadata.read_metadata') as read:
            with self.assertRaises(Refused):refresh_project(self.factory.post('/'),self.project.pk)
            read.assert_not_called()
        self.file.write_text('PROJECT_NAME=Autorisé\n')
        with patch('cab_platform.core.api.principal',return_value=self.actor):self.assertEqual(refresh_project(self.factory.post('/'),self.project.pk)['public_metadata']['values']['PROJECT_NAME'],'Autorisé')
    def test_shape_has_fixed_columns_project_and_no_private_configuration(self):
        import httpx
        response=httpx.Response(200,json=[],headers={'electric-handle':'fixture-handle'})
        request=self.factory.get('/',{'project_id':self.project.pk,'table':'configuration','columns':'*','where':'true','offset':'-1'})
        with patch('cab_platform.web_views.principal',return_value=self.actor),patch('cab_platform.web_views.config',return_value={'electric_secret':'fixture-only'}),patch('httpx.get',return_value=response) as get:
            result=sync_project(request);params=get.call_args.kwargs['params']
        self.assertEqual(result.status_code,200);self.assertEqual(params['table'],'project_metadata_projection');self.assertEqual(params['columns'],'id,public_metadata');self.assertEqual(params['where'],f"id = '{self.project.pk}'")
        self.assertEqual(result['Cache-Control'],'private, no-store')
        self.actor.projects.clear()
        with patch('cab_platform.web_views.principal',return_value=self.actor),patch('httpx.get') as get:
            self.assertEqual(sync_project(request).status_code,403);get.assert_not_called()
    def test_electric_sql_privileges_and_publication_are_column_limited(self):
        with connection.cursor() as cursor:
            cursor.execute("SELECT has_column_privilege('cab_electric','project_metadata_projection','public_metadata','SELECT'),has_column_privilege('cab_electric','projects','configuration','SELECT')")
            self.assertEqual(cursor.fetchone(),(True,False))
            cursor.execute("SELECT attnames FROM pg_publication_tables WHERE pubname='electric_publication_default' AND tablename='project_metadata_projection'")
            self.assertEqual(set(cursor.fetchone()[0]),{'id','public_metadata'})
    def test_inotify_handles_atomic_replacement_deletion_and_recreation(self):
        watcher=Watcher()
        try:
            watcher.rebuild();watcher.env_dirty.clear();watcher.env_catchup=time.monotonic()+60;watcher.next_inventory=time.monotonic()+60
            self.file.write_text('PROJECT_NAME=Initial\n');watcher.tick();self.assertIn(self.project.pk,watcher.env_dirty);watcher.env_dirty.clear()
            temporary=self.root/'replacement';temporary.write_text('PROJECT_NAME=Atomic\n');temporary.replace(self.file)
            watcher.tick();self.assertIn(self.project.pk,watcher.env_dirty);self.assertEqual(synchronize(self.project.pk)['values']['PROJECT_NAME'],'Atomic');watcher.env_dirty.clear()
            self.file.unlink();watcher.tick();self.assertIn(self.project.pk,watcher.env_dirty);self.assertEqual(synchronize(self.project.pk)['state'],'missing');watcher.env_dirty.clear()
            self.file.write_text('PROJECT_NAME=Recréé\n');watcher.tick();self.assertIn(self.project.pk,watcher.env_dirty)
        finally:watcher.close()

if __name__=='__main__':unittest.main()
