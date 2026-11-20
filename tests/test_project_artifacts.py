"""Contrôles ciblés des constructeurs natifs et de la projection Fabrique."""
import json
import os
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'src'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cab_platform.settings')
os.environ['CAB_MIGRATE'] = '1'
import django
django.setup()

from django.db import connection, transaction
from django.db.migrations.executor import MigrationExecutor
from cab_platform import artifact_builders as builders, project_artifacts as artifacts
from cab_platform.core.commands import Refused
from cab_platform.core.models import Project, ProjectArtifact


class FactoryTests(unittest.TestCase):
    def test_debian_build_and_existing_version(self):
        with TemporaryDirectory(dir=ROOT / '.cab-tests' / 'DCAB') as directory:
            root = Path(directory)
            (root / 'build').mkdir()
            (root / 'payload').write_text('artefact test')
            (root / 'build' / 'debian-package.json').write_text(json.dumps({
                'package': 'factory-check', 'architecture': 'all', 'maintainer': 'CAB <cab@example.test>',
                'description': 'Contrôle Fabrique', 'files': [{'source': 'payload', 'destination': '/usr/share/factory-check'}],
            }))
            config = {'PROJECT_DEBIAN_PACKAGE': 'Yes', 'PROJECT_DOCKERED': 'No', 'PROJECT_VERSION': '1.2.3'}
            (root / 'project.env').write_text(''.join(f'{key}={value}\n' for key, value in config.items()))
            project = Project.objects.create(pk=uuid4().hex, root=directory, owner_uid=os.getuid(),
                                             public_metadata={'values': config})
            self.assertEqual(builders.build_debian(project, config, lambda _record: None), 0)
            package = root / 'dist' / 'factory-check_1.2.3_all.deb'
            previous = package.stat()
            self.assertEqual(builders.build_debian(project, config, lambda _record: None), 0)
            self.assertEqual(package.stat().st_ino, previous.st_ino)
            (root / 'payload').write_text('contenu divergent')
            with self.assertRaisesRegex(Refused, 'artifact-debian-version-conflict'):
                builders.build_debian(project, config, lambda _record: None)
            artifacts.refresh(project)
            self.assertEqual(ProjectArtifact.objects.filter(project=project).count(), 1)
            result = artifacts.snapshot(project)
            self.assertEqual(result['enabled'], {'debian': True, 'docker': False})
            self.assertEqual(result['artifacts'][0]['version'], '1.2.3')
            self.assertEqual(result['artifacts'][0]['filename'], package.name)
            job = artifacts.request_build(project, 'debian', 'fixture-' + uuid4().hex)
            self.assertEqual(artifacts.request_build(project, 'debian', job['request_id']), job)
            with self.assertRaisesRegex(Refused, 'artifact-build-active'):
                artifacts.request_build(project, 'docker', 'fixture-' + uuid4().hex)

    def test_docker_reuses_diu_context_tags_and_literal_args(self):
        with TemporaryDirectory(dir=ROOT / '.cab-tests' / 'DCAB') as directory:
            root = Path(directory)
            (root / 'build').mkdir()
            (root / 'build' / 'docker-build.args').write_text('VALUE=a b\n')
            (root / 'entrypoint.sh').touch()
            (root / 'dockerfile').touch()
            project = SimpleNamespace(root=directory, owner_uid=1002, owner_gid=None, identifier='fixture')
            with patch.object(builders, 'docker_image_details', return_value=None), \
                    patch.object(builders, 'execute', return_value=0) as command:
                builders.build_docker(project, {'PROJECT_VERSION':'1.2.3'}, lambda _record: None)
            self.assertEqual(command.call_args.args[0], [
                *builders.DOCKER, 'build', '--file', str(root / 'dockerfile'), '--tag', 'fixture:latest',
                '--tag', 'fixture:1.2.3', '--build-arg', 'VALUE=a b', str(root),
            ])
            self.assertEqual(command.call_args.kwargs['options']['user'], 1002)


if __name__ == '__main__':
    with transaction.atomic():
        target = ('cab_core', '0045_project_artifacts')
        executor = MigrationExecutor(connection)
        if target not in executor.loader.applied_migrations:
            executor.migrate([target])
        result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(FactoryTests))
        transaction.set_rollback(True)
    raise SystemExit(not result.wasSuccessful())
