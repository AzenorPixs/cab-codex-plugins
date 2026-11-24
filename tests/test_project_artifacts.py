"""Contrôles ciblés des constructeurs natifs et de la projection Fabrique."""
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
SCRATCH = Path(os.environ.get('TMPDIR', ROOT / '.cab-tests'))
sys.path.insert(0, str(ROOT / 'src'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cab_platform.settings')
os.environ['CAB_MIGRATE'] = '1'
import django
from django.conf import settings
if __name__ == '__main__':
    settings.configure(
        SECRET_KEY='factory-fixture', USE_TZ=True,
        INSTALLED_APPS=['django.contrib.auth', 'django.contrib.contenttypes',
                        'django.contrib.sessions', 'cab_platform.core'],
        DATABASES={'default': {'ENGINE': 'django.db.backends.postgresql', 'NAME': 'postgres'}},
    )
django.setup()

from django.db import connection, transaction
from django.db.migrations.executor import MigrationExecutor
from cab_platform import artifact_builders as builders, project_artifacts as artifacts
from cab_platform import forge_publish_artifacts as publication
from cab_platform import paths, project_metadata
from cab_platform.build_workspace import artifact_directory
from cab_platform.core.commands import Refused
from cab_platform.core.models import (
    Change, GitDelivery, GitDeliveryStep, GitSessionIndex,
    Project, ProjectArtifact, ProjectArtifactBuild, ProjectForgeArtifactPublication,
)


class FactoryTests(unittest.TestCase):
    def test_automatic_registry_confirmation_unlocks_factory_on_the_same_receipt(self):
        from cab_platform.core.models import Notification
        from cab_platform.notifications import artifact_notification, identifier

        tag='1.2.3'
        image={'tag':tag,'image_id':'sha256:'+'b'*64}
        steps=[{'key':key,'state':state} for key,state in (
            ('docker-prepare','COMPLETED'),('docker-login','COMPLETED'),('docker-push','COMPLETED'),
            ('docker-confirm','FAILED'),('docker-retention','PENDING'),
        )]
        original={'issued':True,'error':'artifact-forge-publication-failed',
                  'progress':{'kinds':['docker'],'steps':steps}}
        for forge,registry in (('FORGEJO','forgejo.fixture'),('GITHUB','ghcr.io'),('GITLAB','registry.fixture')):
            with self.subTest(forge=forge), TemporaryDirectory(dir=SCRATCH) as directory:
                values={'PROJECT_VERSION':tag,'REMOTE_GITLAB_REGISTRY':'registry.fixture'}
                project=Project.objects.create(pk=uuid4().hex,root=directory,owner_uid=os.getuid(),
                                               public_metadata={'values':values})
                job=ProjectForgeArtifactPublication.objects.create(
                    pk=uuid4().hex,project=project,state='UNKNOWN',forge=forge,
                    plan={'docker':image,'signature':'fixture','registry':values['REMOTE_GITLAB_REGISTRY']},
                    receipt=original,
                )
                key='manual-publication:'+job.pk
                artifact_notification(key,project,forge,'UNKNOWN',original)
                with self.assertRaisesRegex(Refused,'artifact-build-active'):
                    artifacts.require_available(project)
                with patch.object(publication,'identity',return_value='fixture'), \
                     patch.object(publication,'docker_inventory',return_value={'local':(None,image)}), \
                     patch.object(publication,'remote') as remote, patch.object(publication,'registry_login') as login, \
                     patch.object(publication,'confirm_docker') as confirm:
                    remote.return_value.__enter__.return_value=(
                        None,'https://forgejo.fixture',None,None,'owner','sample','token',forge=='GITHUB')
                    login.return_value.__enter__.return_value=([],{})
                    publication.attempt_reconciliation(job.pk)
                confirm.assert_called_once_with([],registry+'/owner/sample',(tag,'latest'),image['image_id'])
                job.refresh_from_db()
                self.assertEqual(job.state,'COMPLETED')
                self.assertEqual(job.receipt['previous']['state'],'UNKNOWN')
                self.assertFalse(job.receipt['details']['cleanup_performed'])
                self.assertEqual(Notification.objects.get(pk=identifier(key)).artifacts[0]['state'],'COMPLETED')
                artifacts.require_available(project)

    def test_latest_build_receipt_includes_native_deliveries_for_each_format(self):
        before = datetime(2026, 11, 21, tzinfo=timezone.utc)
        after = before + timedelta(days=2)
        for kind in ('debian', 'docker'):
            with self.subTest(kind=kind), TemporaryDirectory(dir=SCRATCH) as directory:
                project = Project.objects.create(pk=uuid4().hex, root=directory, owner_uid=os.getuid())
                change = Change.objects.create(pk=uuid4().hex, project=project, identifier='factory-receipts')
                index = GitSessionIndex.objects.create(change=change, index_path='fixture')
                delivery = GitDelivery.objects.create(project=project, git_index=index, version='3.28.0',
                                                      state='COMPLETED')
                pending_delivery = GitDelivery.objects.create(project=project, git_index=index, version='3.28.1',
                                                              state='PENDING')
                manual = ProjectArtifactBuild.objects.create(
                    pk=uuid4().hex, project=project, kind=kind, version='3.8.1',
                    state='FAILED', receipt={'error': 'manual-failure'},
                )
                native = GitDeliveryStep.objects.create(
                    delivery=delivery, key=f'build:{kind}', state='COMPLETED',
                    receipt={'exit_code': 0, 'executed': True, 'internal_field': 'private-fixture'},
                )
                GitDeliveryStep.objects.create(delivery=pending_delivery, key=f'build:{kind}', state='PENDING')
                ProjectArtifactBuild.objects.filter(pk=manual.pk).update(created=before)
                GitDeliveryStep.objects.filter(pk=native.pk).update(updated=after)
                self.assertEqual(artifacts.snapshot(project)['builds'][kind], {
                    'source': 'delivery', 'delivery_id': delivery.pk, 'version': '3.28.0',
                    'state': 'COMPLETED', 'created': after.isoformat(), 'error': None, 'exit_code': 0,
                })
                ProjectArtifactBuild.objects.filter(pk=manual.pk).update(created=after + timedelta(seconds=1))
                recent = artifacts.snapshot(project)['builds'][kind]
                self.assertEqual((recent['source'], recent['request_id'], recent['error']),
                                 ('factory', manual.pk, 'manual-failure'))
                GitDeliveryStep.objects.filter(pk=native.pk).update(
                    updated=after + timedelta(seconds=2), state='FAILED', receipt={'error': 'native-failure'},
                )
                failed = artifacts.snapshot(project)['builds'][kind]
                self.assertEqual((failed['source'], failed['state'], failed['error']),
                                 ('delivery', 'FAILED', 'native-failure'))
                ProjectArtifactBuild.objects.filter(pk=manual.pk).update(created=before, state='UNKNOWN')
                self.assertEqual(artifacts.snapshot(project)['builds'][kind]['state'], 'UNKNOWN')

    def test_debian_build_and_existing_version(self):
        with TemporaryDirectory(dir=SCRATCH) as directory, TemporaryDirectory(dir=SCRATCH) as state, \
                patch.object(paths, 'STATE', Path(state)):
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
            package = artifact_directory(project) / 'factory-check_1.2.3_all.deb'
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
        with TemporaryDirectory(dir=SCRATCH) as directory:
            root = Path(directory)
            (root / 'build').mkdir()
            (root / 'build' / 'docker-build.args').write_text('VALUE=a b\n')
            (root / 'entrypoint.sh').touch()
            (root / 'dockerfile').touch()
            owner_uid = os.getuid()
            project = SimpleNamespace(root=directory, owner_uid=owner_uid, owner_gid=None, identifier='fixture')
            with patch.object(builders, 'docker_image_details', return_value=None), \
                    patch.object(builders, 'execute', return_value=0) as command:
                builders.build_docker(project, {'PROJECT_VERSION':'1.2.3'}, lambda _record: None)
            self.assertEqual(command.call_args.args[0], [
                *builders.DOCKER, 'build', '--file', str(root / 'dockerfile'), '--tag', 'fixture:latest',
                '--tag', 'fixture:1.2.3', '--build-arg', 'VALUE=a b', str(root),
            ])
            self.assertEqual(command.call_args.kwargs['options'], {})

    def test_factory_docker_ignores_invalid_forge_and_publication_uses_versioned_image(self):
        with TemporaryDirectory(dir=SCRATCH) as directory:
            root = Path(directory)
            (root / 'dockerfile').touch()
            (root / 'entrypoint.sh').touch()
            configuration = root / 'project.env'
            configuration.write_text('PROJECT_ID=fixture\nPROJECT_DOCKERED=yes\nPROJECT_VERSION=v1.2.3\n'
                                     'REMOTE_GITLAB_REGISTRY=https://invalide.example\n')
            self.assertEqual(project_metadata.read_metadata(directory)['state'], 'partial')
            self.assertTrue(project_metadata.public_value('REMOTE_GITLAB_REGISTRY', 'registry.example:5050'))
            values = project_metadata.read_metadata(directory)['values']
            project = Project.objects.create(pk=uuid4().hex, root=directory, owner_uid=os.getuid(),
                                             public_metadata={'values':values})
            job = artifacts.request_build(project, 'docker', uuid4().hex)
            ProjectArtifactBuild.objects.filter(pk=job['request_id']).update(state='RUNNING')
            image_id = 'sha256:' + 'a' * 64
            tags = ['fixture:latest', 'fixture:1.2.3']
            inspected = subprocess.CompletedProcess([], 0, json.dumps([
                image_id, tags, 7, 'linux', 'amd64', '2026-11-23T12:00:00+00:00',
            ]).encode())
            with patch.object(artifacts, 'close_old_connections'), \
                    patch.object(builders, 'docker_image_details', return_value=None), \
                    patch.object(builders, 'execute', return_value=0) as execute, \
                    patch.object(artifacts.subprocess, 'run', return_value=inspected) as docker:
                artifacts.run_build(job['request_id'])
                factory = artifacts.snapshot(project)
                self.assertEqual(factory['builds']['docker']['state'], 'COMPLETED')
                self.assertEqual(factory['builds']['docker']['version'], '1.2.3')
                self.assertEqual(set(factory['artifacts'][0]['tags']), set(tags))
                self.assertEqual(execute.call_args.args[0][-5:-1],
                                 ['--tag', 'fixture:latest', '--tag', 'fixture:1.2.3'])
                self.assertEqual(publication.local_plan(project, values),
                                 {'docker': {'image_id':image_id, 'tag':'1.2.3'}})
                self.assertEqual(docker.call_args.args[0][-1], 'fixture:1.2.3')
                for forge in ('GITLAB', 'GITHUB', 'FORGEJO'):
                    publication_id = uuid4().hex
                    ProjectForgeArtifactPublication.objects.create(
                        pk=publication_id, project=project, forge=forge, state='RUNNING',
                        plan={'signature':'fixture', 'registry':'ancien-registre.example'} if forge!='GITLAB'
                        else {'signature':'fixture'},
                    )
                    with patch.object(publication, 'close_old_connections'), \
                            patch.object(publication, 'identity', return_value='fixture'), \
                            patch.object(publication, 'refresh_one'), \
                            patch.dict(publication.PUBLISHERS, {forge:Mock()}) as publishers:
                        publication.worker(publication_id)
                        result = ProjectForgeArtifactPublication.objects.get(pk=publication_id)
                        if forge == 'GITLAB':
                            self.assertEqual(result.receipt['error'], 'artifact-forge-registry-invalid')
                            publishers[forge].assert_not_called()
                        else:
                            self.assertEqual(result.state, 'COMPLETED')
                            self.assertEqual(publishers[forge].call_args.args[2]['docker']['image_id'], image_id)

    def test_factory_configuration_and_execution_failures_keep_safe_diagnostics(self):
        with TemporaryDirectory(dir=SCRATCH) as directory:
            configuration = Path(directory) / 'project.env'
            project = Project.objects.create(pk=uuid4().hex, root=directory, owner_uid=os.getuid())
            configuration.write_text('PROJECT_DOCKERED=yes\nPROJECT_VERSION=${PRIVATE_VALUE}\n')
            with self.assertRaises(artifacts.BuildConfigurationRefused) as refused:
                artifacts.request_build(project, 'docker', uuid4().hex)
            self.assertEqual(refused.exception.configuration, {'state':'partial','issues':[
                {'key':'PROJECT_VERSION','line':2,'reason':'invalid-version'},
            ]})
            configuration.write_text('PROJECT_DOCKERED=yes\nPROJECT_VERSION=1.2.3\n')
            job = artifacts.request_build(project, 'docker', uuid4().hex)
            ProjectArtifactBuild.objects.filter(pk=job['request_id']).update(state='RUNNING')

            def failed_build(_project, _metadata, mark):
                mark({'build_phase':'docker-build', 'child':{'pid':123}})
                mark({'diagnostic':{'phase':'docker-build','code':'artifact-docker-pull-denied','exit_code':17}})
                return 17

            with patch.object(artifacts, 'close_old_connections'), patch.dict(artifacts.BUILDERS, {'docker':failed_build}):
                artifacts.run_build(job['request_id'])
            result = artifacts.snapshot(project)['builds']['docker']
            self.assertEqual(result['state'], 'FAILED')
            self.assertEqual(result['steps'], ['configuration', 'sources', 'docker-build'])
            self.assertTrue(result['process_started'])
            self.assertEqual(result['exit_code'], 17)
            self.assertEqual(result['diagnostic']['code'], 'artifact-docker-pull-denied')
            self.assertNotIn('child', result)


if __name__ == '__main__':
    postgres = Path('/usr/lib/postgresql/17/bin')
    with TemporaryDirectory(dir=SCRATCH, prefix='factory-postgres-') as directory:
        data = Path(directory) / 'db'
        subprocess.run([postgres/'initdb', '-D', data, '-A', 'trust', '--no-locale', '--encoding=UTF8'],
                       stdout=subprocess.DEVNULL, check=True)
        subprocess.run([postgres/'pg_ctl', '-D', data, '-l', Path(directory)/'postgres.log',
                        '-o', f"-h '' -k {directory}", '-w', 'start'], stdout=subprocess.DEVNULL, check=True)
        try:
            connection.settings_dict['HOST'] = directory
            executor = MigrationExecutor(connection)
            executor.migrate(executor.loader.graph.leaf_nodes())
            with transaction.atomic():
                result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(FactoryTests))
                transaction.set_rollback(True)
        finally:
            connection.close()
            subprocess.run([postgres/'pg_ctl', '-D', data, '-m', 'fast', '-w', 'stop'],
                           stdout=subprocess.DEVNULL, check=True)
    raise SystemExit(not result.wasSuccessful())
