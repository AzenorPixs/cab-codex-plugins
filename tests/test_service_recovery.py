"""Tests de perte contrôlée sans interrompre le cluster PostgreSQL de l’hôte."""
import ctypes
import os
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
from threading import Event
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
import django

django.setup()

from django.db import DatabaseError
from cab_platform import service_recovery as recovery
from cab_platform import postgresql

TARGET={'major':17,'cluster':'cab','port':5433}
CONFIG={'postgresql':TARGET,'database':'cab','database_host':'127.0.0.1','database_port':5433}
DOWN=('DOWN',None)
READY=('READY',12345)


class ServiceRecoveryTests(unittest.TestCase):
    def setUp(self):
        folder=TemporaryDirectory(dir=ROOT/'.cab-tests/DCAB')
        self.addCleanup(folder.cleanup)
        for manager in (patch.object(recovery,'STATE',Path(folder.name)),
                        patch.object(recovery,'close_old_connections')):
            manager.start()
            self.addCleanup(manager.stop)

    def test_stopped_postgres_is_started_once_and_qualified(self):
        stop=Event()
        monitor=recovery.PostgresMonitor()
        states=[READY,DOWN,DOWN,DOWN,READY,READY]
        with patch.object(recovery,'config',return_value=CONFIG), patch.object(recovery,'maintenance',return_value=False), \
             patch.object(recovery,'probe_postgres',side_effect=states), \
             patch.object(recovery,'run_command',return_value=SimpleNamespace(returncode=0)) as command, \
             patch('cab_platform.notifications.publish') as note:
            for _ in range(4):
                monitor.tick(stop)
        command.assert_called_once_with(['/usr/bin/systemctl','start','postgresql@17-cab.service'],45)
        self.assertEqual(monitor.pid,12345)
        self.assertEqual(monitor.receipt.data['state'],'SUCCEEDED')
        note.assert_called_once()
        self.assertIn('Réussite',note.call_args.kwargs['title'])

    def test_failed_attempt_survives_database_and_no_retry_until_healthy(self):
        stop=Event()
        monitor=recovery.PostgresMonitor()
        state=Mock(return_value=READY)
        with patch.object(recovery,'config',return_value=CONFIG), patch.object(recovery,'maintenance',return_value=False), \
             patch.object(recovery,'probe_postgres',state), \
             patch.object(recovery,'run_command',return_value=SimpleNamespace(returncode=1)) as command, \
             patch('cab_platform.notifications.publish') as note:
            monitor.tick(stop)
            state.return_value=DOWN
            for _ in range(8):
                monitor.tick(stop)
            state.return_value=READY
            monitor.tick(stop)
        command.assert_called_once()
        note.assert_called_once()
        self.assertIn('Échec',note.call_args.kwargs['title'])
        self.assertEqual(monitor.receipt.data['state'],'FAILED')

    def test_notification_retries_delivery_but_never_repeats_effect(self):
        receipt=recovery.Receipt('report','PostgreSQL CAB')
        self.assertTrue(receipt.begin())
        receipt.finish(False,'Base indisponible.')
        with patch('cab_platform.notifications.publish',side_effect=[DatabaseError('offline'),None]) as note:
            receipt.publish()
            self.assertFalse(receipt.begin())
            receipt=recovery.Receipt('report','PostgreSQL CAB')
            self.assertFalse(receipt.begin())
            receipt.publish()
            receipt.publish()
        self.assertEqual(note.call_count,2)
        self.assertEqual(note.call_args_list[0].args,note.call_args_list[1].args)

    def test_service_restart_does_not_replay_a_failed_postgres_start(self):
        receipt=recovery.Receipt('postgresql','PostgreSQL CAB')
        self.assertTrue(receipt.begin())
        receipt.finish(False,'Base indisponible.')
        with patch.object(postgresql,'read_json',return_value={}), \
             patch.object(postgresql,'default_major',return_value=17), \
             patch.object(postgresql,'clusters',return_value=[{**TARGET,'status':'down'}]), \
             patch.object(postgresql,'command') as command:
            with self.assertRaisesRegex(postgresql.PostgreSQLError,'attempt-already-recorded'):
                postgresql._ensure(CONFIG)
            command.assert_not_called()

    def test_inotify_reopens_a_real_kernel_descriptor(self):
        class KernelWatch:
            def __init__(self):
                self.fd=ctypes.CDLL(None).inotify_init1(os.O_NONBLOCK|os.O_CLOEXEC)
                assert self.fd>=0
            def tick(self):
                try:os.read(self.fd,4096)
                except BlockingIOError:pass
                return 'ready'
            def close(self):os.close(self.fd)
        with patch('cab_platform.notifications.publish') as note:
            watcher=recovery.InotifyMonitor(KernelWatch,'test-inotify','inotify de test')
            self.addCleanup(watcher.close)
            self.assertEqual(watcher.tick(),'ready')
            old=watcher.watcher
            os.close(old.fd)
            self.assertEqual(watcher.tick(),'ready')
            self.assertIsNot(watcher.watcher,old)
            self.assertEqual(watcher.receipt.data['state'],'SUCCEEDED')
            note.assert_called_once()

    def test_inotify_does_not_loop_after_failed_reconstruction(self):
        factory=Mock(side_effect=OSError('inotify unavailable'))
        with patch('cab_platform.notifications.publish') as note:
            watcher=recovery.InotifyMonitor(factory,'test-inotify-failed','inotify de test')
            for _ in range(6):
                self.assertIsNone(watcher.tick())
        self.assertEqual(factory.call_count,2)
        self.assertEqual(watcher.receipt.data['state'],'FAILED')
        note.assert_called_once()


if __name__=='__main__':
    unittest.main(verbosity=2)
