"""Libération ciblée sur un index Git réel et un PostgreSQL de fixture."""

import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import uuid

if os.environ.get('CAB_TEST_FIXTURE') != '1':
    raise RuntimeError('dedicated-postgresql-fixture-required')

import django
django.setup()

from cab_platform.core import commands as c
from cab_platform.core.models import Actor, Event, GitSessionEffect, GitSessionIndex, Operation, Project
from cab_platform.git_reservation_admin import COMPARE, EVENT, reservation_release
from cab_platform.session_git import reserve_files, stage_files


class ExactReservationReleaseTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory(prefix='cab-release-fixture-')
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.target = 'system-platform.md'
        self.paths = [self.target, *(f'other-{i}.md' for i in range(11))]
        for path in self.paths:
            (self.root / path).write_text('base\n')
        self.git('init', '-q')
        self.git('add', '--', *self.paths)
        self.git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
                 'commit', '-qm', 'fixture')

        token = uuid.uuid4().hex
        self.project = Project.objects.create(
            pk=token, root=str(self.root), owner_uid=os.getuid(), owner_gid=os.getgid(),
        )
        self.owner = Actor.objects.create(
            pk='fixture-owner-' + token, uid=os.getuid(), agent='fixture', token_hash=token,
        )
        self.admin = Actor.objects.create(
            pk='fixture-admin-' + token, uid=0, agent='fixture', role='admin', token_hash=token + 'admin',
        )
        self.owner.projects.add(self.project)
        self.run = c.begin_run(self.owner, {
            'project_id': token, 'run_id': 'FIXTURE', 'session_id': 'FIXTURE-' + token,
            'mode': 'direct', 'change': 'fixture-release-exact', 'paths': self.paths,
            'criteria': ['fixture'], 'decisions_resolved': True,
        })
        self.run.mandate = {**self.run.mandate, 'native_source': {'uid': os.getuid()}}
        self.run.save(update_fields=['mandate'])
        resolver = patch.object(c, 'resolve_native', return_value=self.run.mandate['native_source'])
        resolver.start()
        self.addCleanup(resolver.stop)
        scope = {'project_id': token, 'run_id': self.run.run_id}
        reserve_files(self.owner, {**scope, 'request_id': 'reserve-fixture', 'paths': self.paths})
        for path in self.paths:
            (self.root / path).write_text(f'{path}\n')
        Operation.objects.create(
            run=self.run, request_id='validate-fixture', state='COMPLETED',
            request={'phase': 'test'}, receipt={'exit_code': 0}, source_revision=c.revision(self.run),
        )
        stage_files(self.owner, {**scope, 'request_id': 'stage-fixture', 'paths': self.paths})
        self.index = GitSessionIndex.objects.get(initial_run=self.run)
        self.reservation = self.index.reservations.get(path=self.target)
        self.identity = {
            **scope, 'session_id': self.run.session_id, 'generation': self.run.generation,
            'index_id': self.index.pk, 'reservation_id': self.reservation.pk, 'path': self.target,
        }
        self.status = {**scope, 'request_id': 'release-exact-fixture'}

    def git(self, *args):
        return subprocess.run(
            ['/usr/bin/git', '-C', self.root, *args], check=True, capture_output=True,
            env={**os.environ, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null'},
        ).stdout

    def payload(self):
        proof = reservation_release(self.admin, 'inspect', self.identity)
        self.assertFalse(proof['effects_issued'])
        return {
            **self.identity, **{key: proof[key] for key in COMPARE}, **self.status,
            'authorization': 'Le développeur autorise cette réservation exacte dans la fixture.',
        }

    def test_release_one_preserves_eleven_index_file_and_receipt(self):
        file = self.root / self.target
        before = file.read_bytes(), file.stat().st_mode, file.stat().st_mtime_ns
        index_bytes = Path(self.index.index_path).read_bytes()
        directory = Path(self.index.index_path).parent
        directory.chmod(0o2770)
        peers = list(self.index.reservations.exclude(pk=self.reservation.pk).order_by('pk').values())
        index_row = GitSessionIndex.objects.filter(pk=self.index.pk).values().get()
        payload = self.payload()

        receipt = reservation_release(self.admin, 'release', payload)

        self.assertEqual((receipt['released_count'], receipt['remaining_count']), (1, 11))
        self.assertTrue(receipt['index_preserved'])
        self.assertEqual(Path(self.index.index_path).read_bytes(), index_bytes)
        self.assertEqual(directory.stat().st_mode & 0o7777, 0o2770)
        self.assertEqual((file.read_bytes(), file.stat().st_mode, file.stat().st_mtime_ns), before)
        self.assertEqual(list(self.index.reservations.exclude(pk=self.reservation.pk)
                              .order_by('pk').values()), peers)
        self.assertEqual(GitSessionIndex.objects.filter(pk=self.index.pk).values().get(), index_row)
        self.reservation.refresh_from_db()
        self.assertFalse(self.reservation.active)
        self.assertEqual(reservation_release(self.admin, 'status', self.status), receipt)
        self.assertEqual(reservation_release(self.admin, 'release', payload), receipt)
        self.assertEqual(Event.objects.filter(run=self.run, kind=EVENT).count(), 1)
        with self.assertRaisesRegex(c.Refused, 'session-git-release-request-conflict'):
            reservation_release(self.admin, 'release', {**payload, 'path': 'other-0.md'})

    def test_rejects_wrong_identity_stale_file_and_uncertain_effect(self):
        payload = self.payload()
        for changes in ({'generation': 2}, {'index_id': self.index.pk + 1}, {'path': 'other-0.md'}):
            with self.subTest(changes=changes):
                with self.assertRaisesRegex(c.Refused, 'session-git-release-identity-divergent'):
                    reservation_release(self.admin, 'release', {**payload, **changes})
        with self.assertRaisesRegex(c.Refused, 'administrator-required'):
            reservation_release(self.owner, 'release', payload)
        with self.assertRaisesRegex(c.Refused, 'session-git-release-index-changed'):
            reservation_release(self.admin, 'release', {**payload, 'index_sha256': '0' * 64})
        file = self.root / self.target
        before = file.read_bytes()
        file.write_bytes(b'changed after inspection\n')
        with self.assertRaisesRegex(c.Refused, 'session-git-release-unstaged'):
            reservation_release(self.admin, 'release', payload)
        file.write_bytes(before)
        GitSessionEffect.objects.create(
            run=self.run, git_index=self.index, request_id='uncertain-fixture',
            request_digest='0' * 64, state='UNKNOWN',
        )
        with self.assertRaisesRegex(c.Refused, 'session-git-effect-unresolved'):
            reservation_release(self.admin, 'release', payload)
        self.assertEqual(self.index.reservations.filter(active=True).count(), 12)
        self.assertFalse(Event.objects.filter(run=self.run, kind=EVENT).exists())
