"""Création POSIX sur un dossier de test et base dédiée, sans projet existant modifié."""
import os
from pathlib import Path
import pwd
import grp
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import uuid
os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
import django
django.setup()
from django.db import transaction
from cab_platform import projects
from cab_platform.core.commands import Refused
from cab_platform.core.models import Project

class ProjectCatalogueTests(unittest.TestCase):
    def setUp(self):
        self.atomic=transaction.atomic();self.atomic.__enter__();self.tmp=tempfile.TemporaryDirectory(prefix='cab-projects-test-');self.root=Path(self.tmp.name)
        self.cfg={'projects_root':str(self.root),'projects_user':pwd.getpwuid(os.getuid()).pw_name,'projects_group':grp.getgrgid(os.getgid()).gr_name}
        self.config=patch.object(projects,'config',return_value=self.cfg);self.config.start();self.actor=SimpleNamespace(role='admin',projects=SimpleNamespace(add=lambda project:None))
    def tearDown(self):
        self.config.stop();transaction.set_rollback(True);self.atomic.__exit__(None,None,None);self.tmp.cleanup()
    def test_table_and_owned_directory_are_created_once(self):
        request=str(uuid.uuid4());project,created=projects.create_project(self.actor,'Projet démonstration','demonstration',request)
        self.assertTrue(created);self.assertEqual(Project._meta.db_table,'projects');path=self.root/'demonstration';info=path.stat()
        self.assertEqual(info.st_uid,os.getuid());self.assertEqual(info.st_gid,os.getgid());self.assertEqual(info.st_mode&0o2777,0o2770)
        repeated,created=projects.create_project(self.actor,'Projet démonstration','demonstration',request)
        self.assertFalse(created);self.assertEqual(repeated.pk,project.pk);self.assertEqual(path.stat().st_ino,info.st_ino)
    def test_paths_and_unknown_posix_accounts_are_refused(self):
        for folder in ['../outside','/absolute','.hidden']:
            with self.assertRaises(Refused):projects.create_project(self.actor,'Test',folder,str(uuid.uuid4()))
        with patch.object(projects.pwd,'getpwnam',side_effect=KeyError):
            with self.assertRaises(Refused):projects.project_settings()
        self.assertEqual(list(self.root.iterdir()),[])
    def test_existing_directory_is_never_modified(self):
        folder=self.root/'existing';folder.mkdir();marker=folder/'proof';marker.write_text('unchanged');before=folder.stat()
        with self.assertRaises(Refused):projects.create_project(self.actor,'Existant','existing',str(uuid.uuid4()))
        self.assertEqual(marker.read_text(),'unchanged');self.assertEqual(folder.stat().st_ino,before.st_ino);self.assertEqual(Project.objects.get(root=str(folder)).creation_state,'FAILED')
    def test_interrupted_intent_is_not_replayed(self):
        import hashlib
        folder=self.root/'interrupted';request=str(uuid.uuid4())
        Project.objects.create(pk=hashlib.sha256(str(folder).encode()).hexdigest(),name='Interrompu',root=str(folder),owner_uid=os.getuid(),owner_gid=os.getgid(),creation_state='CREATING',creation_request_id=request)
        with self.assertRaises(Refused):projects.create_project(self.actor,'Interrompu','interrupted',request)
        self.assertFalse(folder.exists())

if __name__=='__main__':unittest.main()
