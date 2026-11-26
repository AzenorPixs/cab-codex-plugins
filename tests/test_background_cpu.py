"""Vérifier le travail de fond CAB sans dépendre d'un service en production."""
import sys
import tempfile
from importlib.util import find_spec
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'src'))
if find_spec('django') is None:
    sys.path.append('/usr/lib/cab/python-vendor')

import django
from django.conf import settings

if not settings.configured:
    settings.configure(
        SECRET_KEY='background-test',
        INSTALLED_APPS=['django.contrib.auth', 'django.contrib.contenttypes', 'cab_platform.core'],
        DATABASES={'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}},
        DEFAULT_AUTO_FIELD='django.db.models.BigAutoField',
        USE_TZ=True,
    )
django.setup()

from cab_platform import collectors, service, statistics_watch
from cab_platform.core import monitor, run_lifecycle


class WatchTests(unittest.TestCase):
    def setUp(self):
        self.watcher = statistics_watch.Watcher()
        self.addCleanup(self.watcher.close)
        fixture = tempfile.TemporaryDirectory()
        self.addCleanup(fixture.cleanup)
        self.root = Path(fixture.name).resolve()
        self.change = self.root/'openspec/changes/demo'
        self.change.mkdir(parents=True)
        self.task = self.change/'tasks.md'
        self.task.write_text('- [ ] Une tâche\n')
        self.due = SimpleNamespace(next_full_sync=None, next_catalogue_sync=None)
        self.watcher.next_active = float('inf')

    def tick(self):
        project = SimpleNamespace(pk='demo', root=str(self.root))
        with patch.object(statistics_watch.Project.objects, 'filter', return_value=[project]), \
             patch.object(statistics_watch.ProjectStatistics.objects, 'filter') as states:
            states.return_value.first.return_value = self.due
            return self.watcher.tick()

    def test_task_write_and_atomic_move_trigger_projection(self):
        self.tick()
        self.watcher.tasks_dirty.clear()
        self.task.write_text('- [x] Une tâche\n')
        self.tick()
        self.assertEqual(self.watcher.tasks_dirty, {'demo'})
        self.watcher.tasks_dirty.clear()
        archive = self.change.parent/'archive'
        archive.mkdir()
        self.change.rename(archive/'2026-11-26-demo')
        self.tick()
        self.assertEqual(self.watcher.tasks_dirty, {'demo'})
        self.assertEqual(self.watcher.next_inventory, 0)
        self.tick()
        self.assertIn(str(archive/'2026-11-26-demo'), self.watcher.paths)

    def test_overflow_rebuilds_watches_and_queues_both_projections(self):
        self.tick()
        descriptor = self.watcher.fd
        self.watcher.dirty.clear()
        self.watcher.tasks_dirty.clear()
        self.watcher.env_dirty.clear()
        self.watcher.observe_event(-1, 0x4000, '', 10)
        self.assertEqual(self.watcher.tasks_dirty, {'demo'})
        self.assertEqual(self.watcher.dirty, {'demo': 10})
        self.assertEqual(self.watcher.env_dirty, {'demo': 10})
        self.tick()
        self.assertNotEqual(self.watcher.fd, descriptor)
        self.assertIn(str(self.change), self.watcher.paths)

    def test_unchanged_metadata_is_skipped_but_symlink_replacement_is_detected(self):
        self.watcher.projects = {'demo': self.root}
        self.watcher.env_signatures['demo'] = statistics_watch.metadata_signature(self.root)
        self.watcher.catch_up_metadata(10)
        self.assertFalse(self.watcher.env_dirty)
        (self.root/'project.env').symlink_to('missing')
        self.watcher.catch_up_metadata(70)
        self.assertEqual(self.watcher.env_dirty, {'demo': 70})

    def test_only_complete_and_stable_metadata_scan_returns_a_signature(self):
        self.watcher.projects = {'demo': self.root}
        with patch('cab_platform.project_metadata.synchronize', return_value=({}, False)) as sync:
            self.assertIsNone(self.watcher.synchronize_metadata('demo'))
            sync.return_value = ({}, True)
            self.assertIsNotNone(self.watcher.synchronize_metadata('demo'))

            def change_source(*args, **kwargs):
                (self.root/'project.env').write_text('PROJECT_NAME=Fixture\n')
                return {}, True

            sync.side_effect = change_source
            self.assertIsNone(self.watcher.synchronize_metadata('demo'))


class BackgroundTests(unittest.TestCase):
    def test_project_events_limit_the_task_queries(self):
        with patch.object(monitor.Run.objects, 'filter') as runs, \
             patch.object(monitor.Change.objects, 'select_related') as changes:
            monitor.refresh_changes(('updated',))
            runs.return_value.select_related.return_value.filter.assert_called_once_with(project_id__in=('updated',))
            changes.return_value.filter.assert_called_once_with(project_id__in=('updated',))

    def test_independent_cursors_for_working_and_historical_runs(self):
        cursors = {None: 0, False: 27, True: 104}
        with patch.object(run_lifecycle, '_cursors', cursors), \
             patch.object(run_lifecycle.Maintenance.objects, 'filter') as maintenance, \
             patch.object(run_lifecycle.Run.objects, 'filter') as runs:
            maintenance.return_value.exists.return_value = False
            candidates = runs.return_value
            candidates.filter.return_value.select_related.return_value.order_by.return_value = []
            candidates.exclude.return_value.select_related.return_value.order_by.return_value = []
            run_lifecycle.sweep(historical=False)
            runs.assert_called_with(pk__gt=27)
            self.assertIn('CLOSED', candidates.exclude.call_args.kwargs['state__in'])
            self.assertEqual(cursors[True], 104)
            run_lifecycle.sweep(historical=True)
            runs.assert_called_with(pk__gt=104)
            self.assertEqual(candidates.filter.call_args.kwargs['state__in'], ('CLOSED','CLOSURE_INVALID'))
            self.assertEqual(cursors, {None: 0, False: 0, True: 0})

    def test_convergence_can_wait_while_active_native_recovery_runs(self):
        with patch('cab_platform.core.native_control.recover') as recover, \
             patch('cab_platform.core.native_control.work_one') as dispatch, \
             patch('cab_platform.core.native_control.queue_mismatched') as queue, \
             patch('cab_platform.mcp_disconnect_recovery.sweep') as pending, \
             patch('cab_platform.mcp_convergence.sweep') as convergence, \
             patch('cab_platform.opencode_recovery.sweep'):
            service.background_native(convergence=False)
            recover.assert_called_once()
            dispatch.assert_called_once()
            pending.assert_called_once()
            queue.assert_not_called()
            convergence.assert_not_called()
            service.background_native(convergence=True)
            queue.assert_called_once()
            convergence.assert_called_once()

    def test_codex_journal_already_projected_is_not_parsed(self):
        with tempfile.TemporaryDirectory() as fixture:
            journal = Path(fixture)/'session.jsonl'
            journal.write_text('{}\n')
            info = journal.stat()
            run = SimpleNamespace(
                actor=SimpleNamespace(uid=info.st_uid, native={}), mandate={
                    'native_source': {'source_file': str(journal), 'device': info.st_dev, 'inode': info.st_ino},
                },
            )
            with patch.object(collectors.json, 'loads', side_effect=AssertionError('lecture redondante')) as loads:
                collectors.codex_metrics(run, known_sequence=info.st_mtime_ns//1000000)
            loads.assert_not_called()


if __name__ == '__main__':
    unittest.main()
