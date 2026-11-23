"""Échéances, réservations PostgreSQL et édition bornée."""
from datetime import UTC, datetime, timedelta
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / 'src'), '/usr/lib/cab/python-vendor']

POSTGRES = os.environ.get('CAB_RESERVATION_TEST_POSTGRES') == '1'
if not POSTGRES:
    from django.conf import settings
    if not settings.configured:
        settings.configure(
            SECRET_KEY='fixture', USE_TZ=True, INSTALLED_APPS=['cab_platform.core'],
            DATABASES={'default': {'ENGINE': 'django.db.backends.dummy'}},
        )
    import django
    django.setup()


class ReservationUnitTests(unittest.TestCase):
    def test_renew_resets_warning_and_moves_deadline_from_acceptance(self):
        from cab_platform import resource_reservations as rr

        now = datetime(2026, 11, 22, tzinfo=UTC)
        row = SimpleNamespace(expires=now + timedelta(seconds=30), count=1, warned=True)
        with patch.object(rr.ResourceReservation.objects, 'bulk_update') as write:
            rr.renew_rows([row], now)
        write.assert_called_once()
        self.assertEqual(row.expires, now + timedelta(seconds=300))
        self.assertEqual(row.expires - rr.LIFETIME + rr.RENEW_AFTER, now + timedelta(seconds=240))
        self.assertEqual(row.count, 2)
        self.assertFalse(row.warned)

    def test_renew_at_deadline_cannot_reactivate_lease(self):
        from cab_platform import resource_reservations as rr
        from cab_platform.core.commands import Refused

        now = datetime(2026, 11, 22, tzinfo=UTC)
        row = SimpleNamespace(expires=now, count=1, warned=True)
        with patch.object(rr.ResourceReservation.objects, 'bulk_update') as write:
            with self.assertRaisesRegex(Refused, 'reservation-expired'):
                rr.renew_rows([row], now)
        write.assert_not_called()

    def test_file_editor_validates_revision_deadline_and_link(self):
        from cab_platform.reservation_file_view import edit_file, FileRefused

        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / 'note.txt'
            target.write_text('Version 1', encoding='utf-8')
            packet = {'directory': folder, 'path': 'note.txt'}
            before = edit_file(packet)
            after = edit_file({**packet, 'content':'Version 2', 'digest':before['digest'], 'deadline':time.time()+60})
            self.assertEqual(after['text'], 'Version 2')
            with self.assertRaisesRegex(FileRefused, 'reservation-file-changed'):
                edit_file({**packet, 'content':'Autre', 'digest':before['digest'], 'deadline':time.time()+60})
            with self.assertRaisesRegex(FileRefused, 'reservation-expired'):
                edit_file({**packet, 'content':'Autre', 'digest':after['digest'], 'deadline':0})
            self.assertEqual(target.read_text(encoding='utf-8'), 'Version 2')
            (Path(folder) / 'link').symlink_to(target)
            with self.assertRaises(OSError):
                edit_file({**packet, 'path':'link'})


@unittest.skipUnless(POSTGRES, 'banc PostgreSQL éphémère')
class ReservationPostgresTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        tools = Path('/usr/lib/postgresql/17/bin')
        scratch = os.environ.get('TMPDIR', str(ROOT / '.cab-tests'))
        directory = cls.enterClassContext(tempfile.TemporaryDirectory(dir=scratch))
        folder = Path(directory)
        data = folder / 'db'
        subprocess.run([tools/'initdb', '-D', data, '-A', 'trust', '--no-locale', '--encoding=UTF8'],
                       stdout=subprocess.DEVNULL, check=True)
        subprocess.run([tools/'pg_ctl', '-D', data, '-l', folder/'postgres.log',
                        '-o', f"-h '' -k {folder}", '-w', 'start'], stdout=subprocess.DEVNULL, check=True)
        cls.addClassCleanup(subprocess.run, [tools/'pg_ctl', '-D', data, '-m', 'fast', '-w', 'stop'],
                            stdout=subprocess.DEVNULL, check=True)
        os.environ['PSYCOPG_IMPL'] = 'python'
        from django.conf import settings
        settings.configure(
            SECRET_KEY='fixture', USE_TZ=True,
            INSTALLED_APPS=['django.contrib.auth', 'django.contrib.contenttypes', 'django.contrib.sessions', 'cab_platform.core'],
            DATABASES={'default': {'ENGINE':'django.db.backends.postgresql', 'NAME':'postgres', 'HOST':str(folder)}},
        )
        import django
        django.setup()
        from django.db import connections
        from django.core.management import call_command
        cls.addClassCleanup(connections.close_all)
        call_command('migrate', 'cab_core', '0053', verbosity=0)
        cls.make_fixture()
        call_command('migrate', verbosity=0)
        from django.db import connection
        from django.db.migrations.executor import MigrationExecutor
        from cab_platform.core.models import ResourceReservation
        migrated = MigrationExecutor(connection).loader.project_state().apps.get_model('cab_core', 'ResourceReservation')
        if [field.deconstruct()[1:] for field in migrated._meta.fields] != [
            field.deconstruct()[1:] for field in ResourceReservation._meta.fields
        ]:
            raise AssertionError('Le modèle de réservation diverge de sa migration.')

    @classmethod
    def make_fixture(cls):
        from cab_platform.core.models import Actor, Change, GitFileReservation, GitSessionIndex, Lease, Operation, Project, Resource, Run

        project = Project.objects.create(id='reserve-fixture', root=str(ROOT), owner_uid=os.getuid())
        actor = Actor.objects.create(id='coder', uid=os.getuid(), agent='codex', token_hash='test')
        actor.projects.add(project)
        cls.run_row = Run.objects.create(run_id='run', project=project, actor=actor, mode='direct', session_id='sid', change='change')
        change, _ = Change.objects.get_or_create(project=project, identifier='change')
        index = GitSessionIndex.objects.create(change=change, initial_run=cls.run_row, index_path='')
        cls.file = GitFileReservation.objects.create(git_index=index, project=project, path='note', path_digest='note')
        cls.operation = Operation.objects.create(run=cls.run_row, request_id='op', state='UNKNOWN')
        cls.recovery = Lease.objects.create(run=cls.run_row, operation=cls.operation, resource=Resource.objects.create(pk='logical'), fencing=1)
        cls.bank = Lease.objects.create(run=cls.run_row, resource=Resource.objects.create(pk='browser:local:chromium'), fencing=1)

    def test_migration_live_updates_alerts_and_protected_expiration(self):
        from cab_platform import resource_reservations as rr
        from cab_platform.core.models import Event, Lease, ResourceReservation
        from django.db import connection, transaction

        self.assertEqual(ResourceReservation.objects.count(), 3)
        row = ResourceReservation.objects.get(source='git')
        bank = ResourceReservation.objects.get(source='lease', source_id=self.bank.pk)
        self.assertEqual(bank.kind, 'browser')
        self.assertEqual(row.session_id, self.run_row.session_id)
        first = max(ResourceReservation.objects.values_list('expires', flat=True))
        rr.sweep(first - timedelta(seconds=29))
        rr.sweep(first - timedelta(seconds=28))
        self.assertEqual(Event.objects.filter(kind='reservation-warning').count(), 3)
        row.refresh_from_db()
        with patch.object(rr, '_live_connector', return_value=True), patch(
            'cab_platform.stage_reminders._dispatch', return_value={'state':'SENT'},
        ) as push:
            rr.dispatch_notices()
            self.assertEqual(push.call_count, 3)
            self.assertTrue(all(call.args[2] == self.run_row.session_id for call in push.call_args_list))
        with transaction.atomic():
            rr.renew_rows([row], row.expires - timedelta(seconds=27))
        row.refresh_from_db()
        self.assertEqual(row.count, 2)
        self.assertFalse(row.warned)

        rr.sweep(row.expires + timedelta(seconds=1))
        self.assertFalse(ResourceReservation.objects.exists())
        self.assertTrue(Lease.objects.filter(pk=self.recovery.pk, state='HELD').exists())
        self.assertTrue(Lease.objects.filter(pk=self.bank.pk, state='RELEASED').exists())
        self.file.refresh_from_db()
        self.assertTrue(self.file.active)
        self.operation.state='COMPLETED'
        self.operation.save(update_fields=['state'])
        rr.sweep(row.expires + timedelta(seconds=2))
        self.file.refresh_from_db()
        self.assertFalse(self.file.active)
        self.assertTrue(Event.objects.filter(kind='reservation-released', data__description='note').exists())
        with patch.object(rr, '_live_connector', return_value=False), patch('cab_platform.stage_reminders._dispatch') as push:
            rr.dispatch_notices()
            push.assert_not_called()
        self.assertTrue(Event.objects.filter(kind='reservation-released', data__delivery='VISIBLE').exists())

        with connection.cursor() as cursor:
            cursor.execute('CREATE ROLE cab_electric')
            cursor.execute('CREATE PUBLICATION electric_publication_default')
            from cab_platform.bootstrap import STAGE_ELECTRIC_SQL
            cursor.execute(STAGE_ELECTRIC_SQL)
            cursor.execute("SELECT EXISTS(SELECT 1 FROM pg_publication_tables WHERE tablename='resource_reservations')")
            self.assertEqual(cursor.fetchone(), (True,))

    def test_git_reservation_checks_held_file_leases(self):
        from cab_platform import session_git
        from cab_platform.core.commands import Refused
        from cab_platform.core.models import Change, CodingSession, GitChange, Lease, Resource, Run
        from django.db import transaction
        from django.utils import timezone

        actor = self.run_row.actor
        project = self.run_row.project
        blocked = 'src/cab_platform/session_git.py'
        free = 'tests/test_resource_reservations.py'
        with transaction.atomic():
            change = Change.objects.create(pk='git-guard', project=project, identifier='git-guard')
            session = CodingSession.objects.create(
                pk='peer-sid', project=project, native_id='peer-sid', agent=actor.agent, uid=actor.uid,
            )
            target = Run.objects.create(
                project=project, actor=actor, run_id='peer', session_id='peer-sid',
                mode='direct', change='git-guard', change_record=change, coding_session=session,
                mandate={'paths': [blocked, free]},
            )
            GitChange.objects.create(
                project=project, change=target.change_record, initial_run=target,
                baseline={'available': True, 'entries': []}, captured_at=timezone.now(),
            )
            resource, _ = Resource.objects.get_or_create(pk='file:' + str(ROOT / 'src'))
            Lease.objects.create(run=self.run_row, resource=resource, fencing=1)
            request = {'project_id': project.pk, 'run_id': target.run_id}
            snapshot = {'available': True, 'branch': 'main', 'head': 'a' * 40, 'entries': []}
            with (
                patch.object(session_git, 'context', return_value=({}, {})),
                patch.object(session_git, 'run', return_value=SimpleNamespace(returncode=1)),
                patch.object(session_git, 'git_snapshot', return_value=snapshot),
            ):
                with self.assertRaisesRegex(Refused, 'session-git-resource-protected'):
                    session_git.reserve_files(actor, {**request, 'request_id': 'overlap', 'paths': [blocked]})
                result = session_git.reserve_files(actor, {**request, 'request_id': 'free', 'paths': [free]})
            self.assertEqual(result['reserved_count'], 1)
            self.assertEqual([item['description'] for item in result['reservations']], [free])
            transaction.set_rollback(True)
