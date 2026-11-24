"""Vérifie l’accès aux données d’un change et la sélection des archives."""
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT/'src'), '/usr/lib/cab/python-vendor']
from django.conf import settings

settings.configure(SECRET_KEY='fixture', USE_TZ=True,
    INSTALLED_APPS=['django.contrib.auth','django.contrib.contenttypes','cab_platform.core'],
    DATABASES={'default':{'ENGINE':'django.db.backends.sqlite3','NAME':':memory:'}})
import django
django.setup()

from django.db import connection
from django.utils import timezone
from cab_platform.core import api
from cab_platform.core.commands import Refused
from cab_platform.core.models import Actor, Change, ChangeSource, ChangeStage, ChangeTask, CodingSession, Project, Run, StatisticsDocument, StatisticsMetric


class ChangeDetailTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with connection.schema_editor() as schema:
            for model in [Project, Actor, CodingSession, Change, ChangeTask, ChangeStage, ChangeSource, StatisticsDocument, StatisticsMetric, Run]:
                schema.create_model(model)
        cls.project=Project.objects.create(id='alpha',root='/fixture/alpha',owner_uid=1000)
        cls.other=Project.objects.create(id='beta',root='/fixture/beta',owner_uid=1000)
        cls.active='openspec/changes/example'
        cls.old='openspec/changes/archive/2026-10-10-example'
        cls.recent='openspec/changes/archive/2026-11-10-example'
        cls.change=Change.objects.create(id='change-1',project=cls.project,identifier='example',
            configuration={'private':'fixture'},
            catalogue=[
                {'source':cls.old,'archived':True,'archived_at':'2026-10-10','title':'Archive ancienne'},
                {'source':cls.recent,'archived':True,'archived_at':'2026-11-10','title':'Archive récente'},
                {'source':cls.active,'archived':False,'title':'Change ouvert'},
            ],
            catalogue_hashes={cls.old:{'tasks.md':'older'},cls.active:{'tasks.md':'current'}})
        ChangeTask.objects.create(change=cls.change,source_id='test',position=1,source_line=2,
            source_sha256='current',label='Tâche ouverte',observed_at=timezone.now())
        ChangeStage.objects.create(change=cls.change,key='specification',iteration_count=2)
        actor=Actor.objects.create(id='fixture',uid=1000,agent='codex',token_hash='fixture')
        Run.objects.create(project=cls.project,run_id='RUN-fixture',session_id='SID-fixture',actor=actor,
            mode='direct',change=cls.change.identifier,change_record=cls.change,mandate={'fixture':'private'})
        source=ChangeSource.objects.create(change=cls.change,path=cls.old,archived=True)
        report=StatisticsDocument.objects.create(source=source,status='ready',sha256='report')
        StatisticsMetric.objects.create(document=report,key='tasks',state='known',value='8',unit='tâches')

    def get(self,project='alpha',change='example',source=None,actor=None):
        principal=actor or SimpleNamespace(role='admin',active=True)
        with patch.object(api,'principal',return_value=principal):
            return api.project_change_detail(None,project,change,source)

    def test_open_default_and_internal_identifier(self):
        detail=self.get(change='change-1')
        self.assertEqual(detail['selected']['source'],self.active)
        self.assertEqual(detail['tasks'][0]['label'],'Tâche ouverte')
        self.assertEqual(detail['stages'][0]['label'],'Spécification')
        self.assertNotIn('configuration',detail)
        self.assertEqual(detail['run_ids'],['RUN-fixture'])
        self.assertNotIn('mandate',detail)

    def test_exact_archive_with_its_own_hashes_and_report(self):
        detail=self.get(source=self.old)
        self.assertEqual(detail['selected']['title'],'Archive ancienne')
        self.assertEqual(detail['hashes']['tasks.md'],'older')
        self.assertEqual(detail['tasks'],[])
        self.assertEqual(detail['statistics']['metrics'][0]['value'],'8')
        self.assertEqual(self.get(source=self.recent)['selected']['title'],'Archive récente')

    def test_unknown_source_and_cross_project(self):
        with self.assertRaises(Refused) as error:
            self.get(source='../private')
        self.assertEqual(error.exception.code,'change-source-not-found')
        with self.assertRaises(Refused) as error:
            self.get(project='beta')
        self.assertEqual(error.exception.code,'change-not-found')
        denied=SimpleNamespace(role='coder',active=True,
            projects=SimpleNamespace(filter=lambda **_:SimpleNamespace(exists=lambda:False)))
        with self.assertRaises(Refused) as error:
            self.get(actor=denied)
        self.assertEqual(error.exception.code,'project-not-authorized')


if __name__=='__main__':
    unittest.main(verbosity=2)
