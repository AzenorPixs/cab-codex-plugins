"""Recette PostgreSQL isolée de la conversion des références locales."""

import os
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
import uuid


@unittest.skipUnless(os.environ.get('CAB_TEST_FIXTURE') == '1', 'PostgreSQL jetable requis')
class VersionPolicyMigrationTests(unittest.TestCase):
    def setUp(self):
        from cab_platform.core.models import Project, VersionPolicyMigration

        directory = TemporaryDirectory(prefix='cab-version-repo-')
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        self.project = Project.objects.create(
            pk=uuid.uuid4().hex, root=str(self.root), owner_uid=os.getuid(), owner_gid=os.getgid(),
        )
        self.addCleanup(self.project.delete)
        self.addCleanup(VersionPolicyMigration.objects.filter(project=self.project).delete)
        self.git('init', '-q')
        self.git('commit','--allow-empty','-qm','fixture')

    def git(self, *args):
        return subprocess.run(
            ['/usr/bin/git','-C',str(self.root),'-c','user.name=CAB Fixture',
             '-c','user.email=fixture@example.invalid',*args],
            check=True, capture_output=True,
            env={'PATH':'/usr/bin:/bin','GIT_CONFIG_NOSYSTEM':'1','GIT_CONFIG_GLOBAL':'/dev/null'},
        ).stdout

    def test_resume_after_git_preserves_tag_object_and_updates_projection(self):
        from cab_platform import version_policy_git as git, version_policy_migration as migration
        from cab_platform.core.commands import Refused
        from cab_platform.core.models import ProjectMetadataProjection

        source=b'PROJECT_VERSION=3.8.0\nPROJECT_VERSION_POLICY=3\n'
        env=self.root/'project.env'
        env.write_bytes(source)
        self.addCleanup(ProjectMetadataProjection.objects.filter(pk=self.project.pk).delete)
        self.git('tag','-a','3.8.0','-m','annotation')
        self.git('tag','manual/reference')
        self.git('pack-refs','--all')
        before=git.snapshot(self.project)
        preview=migration.preview(self.project.pk,4,'left')
        self.assertEqual(preview['moves'],{'3.8.0':'0.3.8.0'})

        execute=git.apply
        def interrupt(*args):
            execute(*args)
            raise Refused('fixture-interruption',409)

        with patch.object(git,'apply',side_effect=interrupt):
            with self.assertRaisesRegex(Refused,'fixture-interruption'):
                migration.apply(self.project.pk,4,'left',preview['preview_id'])
        self.assertEqual(env.read_bytes(),source)
        self.assertEqual(git.snapshot(self.project),
                         {'0.3.8.0':before['3.8.0'],'manual/reference':before['manual/reference']})
        self.assertEqual(migration.preview(self.project.pk,4,'left')['state'],'PENDING')

        with patch.object(git,'apply',side_effect=AssertionError('transaction Git rejouée')):
            complete=migration.apply(self.project.pk,4,'left',preview['preview_id'])
            self.assertEqual(migration.apply(self.project.pk,4,'left',preview['preview_id']),complete)
        self.assertEqual(complete['state'],'COMPLETED')
        self.assertEqual(env.read_bytes(),b'PROJECT_VERSION=0.3.8.0\nPROJECT_VERSION_POLICY=4\n')
        self.project.refresh_from_db()
        self.assertEqual(self.project.public_metadata['values']['PROJECT_VERSION_POLICY'],'4')

    def test_conflict_prevents_a_reduction_before_any_mutation(self):
        from cab_platform import version_policy_git as git, version_policy_migration as migration
        from cab_platform.core.models import VersionPolicyMigration

        source=b'PROJECT_VERSION=1.2.3\nPROJECT_VERSION_POLICY=3\n'
        env=self.root/'project.env'
        env.write_bytes(source)
        self.git('tag','1.2.3')
        self.git('tag','1.2.4')
        before=git.snapshot(self.project)
        preview=migration.preview(self.project.pk,2,'right')
        self.assertEqual(preview['state'],'CONFLICT')
        self.assertCountEqual(preview['tags'],['1.2.3','1.2.4','1.2'])
        self.assertEqual(git.snapshot(self.project),before)
        self.assertEqual(env.read_bytes(),source)
        self.assertFalse(VersionPolicyMigration.objects.filter(project=self.project).exists())
