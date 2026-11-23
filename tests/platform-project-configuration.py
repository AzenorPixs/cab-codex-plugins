"""Contrôle des points d’entrée de création et d’édition avec de vrais fichiers."""
import grp
import json
import os
from pathlib import Path
import pwd
import stat
import sys
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import uuid

import django
from django.conf import settings
from django.db import connection, transaction

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
settings.configure(
    INSTALLED_APPS=['django.contrib.auth', 'django.contrib.contenttypes', 'cab_platform.core'],
    DATABASES={'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}},
    SECRET_KEY='fixture',
)
django.setup()

from cab_platform import forge_settings, project_configuration_edit, projects
from cab_platform.core import api
from cab_platform.core.commands import Refused
from cab_platform.core.models import Project, ProjectMetadataProjection, VersionPolicyMigration


class ProjectConfigurationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with connection.schema_editor() as schema:
            for model in (Project, ProjectMetadataProjection, VersionPolicyMigration):
                schema.create_model(model)

    def setUp(self):
        self.root = Path(self.enterContext(TemporaryDirectory(prefix='cab-project-configuration-')))
        os.chown(self.root, -1, os.getgid())
        self.root.chmod(0o700)
        atomic = transaction.atomic()
        atomic.__enter__()
        self.addCleanup(atomic.__exit__, None, None, None)
        self.addCleanup(transaction.set_rollback, True)
        self.actor = SimpleNamespace(role='admin', projects=SimpleNamespace(add=lambda project: None))
        self.enterContext(patch.object(api, 'principal', return_value=self.actor))
        self.enterContext(patch('cab_platform.paths.secret', return_value='fixture'))
        self.enterContext(patch.object(projects, 'config', return_value={
            'projects_root': str(self.root),
            'projects_user': pwd.getpwuid(os.getuid()).pw_name,
            'projects_group': grp.getgrgid(os.getgid()).gr_name,
        }))
        project_root = self.root / 'existant'
        project_root.mkdir()
        self.project = Project.objects.create(
            pk='projet-interne', identifier='existant', root=str(project_root), owner_uid=os.getuid(),
        )
        self.file = project_root / 'project.env'

    def open_editor(self):
        response = api.project_configuration_read(None, self.project.pk)
        self.assertEqual(response['Cache-Control'], 'no-store')
        return json.loads(response.content)

    def save_editor(self, snapshot):
        return api.project_configuration_save(None, self.project.pk, api.ProjectConfigurationEdit(
            fields={'PROJECT_ID': 'existant', 'PROJECT_NAME': 'Projet édité', 'PROJECT_VERSION': '2.5'},
            revision=snapshot['revision'],
            project_path=snapshot['project_path'],
        ))

    def test_open_missing_file_and_create_on_save(self):
        snapshot = self.open_editor()
        self.assertEqual(snapshot['project_path'], self.project.root)
        self.assertEqual(snapshot['fields']['PROJECT_NAME'], '')
        self.assertFalse(self.file.exists())
        self.assertTrue(self.save_editor(snapshot)['saved'])
        self.assertEqual(stat.S_IMODE(self.file.stat().st_mode), 0o600)
        self.assertEqual(self.file.stat().st_uid, self.project.owner_uid)
        self.assertEqual(self.open_editor()['fields']['PROJECT_NAME'], 'Projet édité')
        values = ProjectMetadataProjection.objects.get(pk=self.project.pk).public_metadata['values']
        self.assertEqual(values['PROJECT_VERSION_POLICY'], '2')
        self.assertEqual(values['PROJECT_VERSION'], '2.5')

    def test_stale_missing_revision_refuses_new_even_empty_file(self):
        snapshot = self.open_editor()
        self.file.touch()
        with self.assertRaisesRegex(Refused, 'project-configuration-changed'):
            self.save_editor(snapshot)
        self.assertEqual(self.file.read_bytes(), b'')

    def test_concurrent_creation_refuses_overwrite_at_write(self):
        snapshot = self.open_editor()
        original = forge_settings.file_operation

        def write_after_external_creation(project, payload):
            if payload['op'] == 'env-write':
                self.file.write_text('PROJECT_NAME="Concurrent"\n')
            return original(project, payload)

        with patch.object(project_configuration_edit, 'file_operation', side_effect=write_after_external_creation):
            with self.assertRaisesRegex(Refused, 'project-configuration-uncertain'):
                self.save_editor(snapshot)
        self.assertEqual(self.file.read_text(), 'PROJECT_NAME="Concurrent"\n')

    def test_reject_unsafe_file_and_keep_other_callers_strict(self):
        with self.assertRaisesRegex(Refused, 'forge-file-unavailable'):
            forge_settings.file_operation(self.project, {'op': 'env-read'})
        self.file.symlink_to(self.root / 'absent')
        with self.assertRaisesRegex(Refused, 'forge-file-unavailable'):
            self.open_editor()

    def test_edit_existing_file_preserves_other_lines(self):
        self.file.write_text('# commentaire\nOTHER="conservé"\nPROJECT_VERSION_POLICY=2\n')
        self.assertTrue(self.save_editor(self.open_editor())['saved'])
        self.assertTrue(self.file.read_text().startswith('# commentaire\nOTHER="conservé"\nPROJECT_VERSION_POLICY=2\n'))

    def test_create_project_initializes_and_projects_available_metadata_once(self):
        body = api.NewProject(name='Démonstration CAB', folder='demo-cab', request_id=str(uuid.uuid4()))
        result = api.new_project(None, body)
        path = self.root / 'demo-cab' / 'project.env'
        contents = 'PROJECT_ID="demo-cab"\nPROJECT_NAME="Démonstration CAB"\nPROJECT_VERSION_POLICY=3\n'
        self.assertTrue(result['created'])
        self.assertEqual(result['creation_state'], 'READY')
        self.assertEqual(path.read_text(), contents)
        self.assertEqual(path.stat().st_uid, result['owner_uid'])
        self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
        self.assertEqual(ProjectMetadataProjection.objects.get(pk=result['id']).public_metadata['values'], {
            'PROJECT_ID': 'demo-cab', 'PROJECT_NAME': 'Démonstration CAB', 'PROJECT_VERSION_POLICY': '3',
        })
        self.assertFalse((path.parent / '.git').exists())
        inode = path.stat().st_ino
        self.assertFalse(api.new_project(None, body)['created'])
        self.assertEqual(path.stat().st_ino, inode)
        self.assertEqual(path.read_text(), contents)

    def test_create_does_not_overwrite_existing_directory(self):
        target = self.root / 'non-catalogué'
        target.mkdir()
        existing = target / 'project.env'
        existing.write_text('PROJECT_NAME="Existant"\n')
        body = api.NewProject(name='Autre projet', folder='autre', request_id=str(uuid.uuid4()),
                              project_path=str(target))
        with self.assertRaisesRegex(Refused, 'project-folder-exists'):
            api.new_project(None, body)
        self.assertEqual(existing.read_text(), 'PROJECT_NAME="Existant"\n')
        self.assertEqual(Project.objects.get(root=str(target)).creation_state, 'FAILED')


if __name__ == '__main__':
    unittest.main(verbosity=2)
