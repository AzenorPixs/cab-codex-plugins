"""Contrôles de reprise sur processus synthétiques, sans couper l’hôte."""
import os
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
import django
django.setup()

from cab_platform import component_recovery as component, service_recovery
from cab_platform.preexisting_git import file_state


class ComponentRecoveryTests(unittest.TestCase):
    def setUp(self):
        folder=TemporaryDirectory(dir=ROOT/'.cab-tests/DCAB')
        self.addCleanup(folder.cleanup)
        self.root=Path(folder.name)
        for manager in (patch.object(service_recovery,'STATE',self.root),
                        patch.object(service_recovery,'close_old_connections'),
                        patch.object(component,'maintenance',return_value=False)):
            manager.start();self.addCleanup(manager.stop)

    def test_restart_of_api_waits_for_the_new_child(self):
        first=SimpleNamespace(alive=True,ready=True)
        second=SimpleNamespace(alive=True,ready=False)
        spawn=Mock(side_effect=[first,second])
        monitor=component.ChildRecovery('api','API CAB',spawn,lambda child:child.alive,lambda child:child.ready)
        with patch.object(component.time,'monotonic',side_effect=range(20)), patch('cab_platform.notifications.publish') as note:
            monitor.tick()
            first.alive=False
            self.assertIs(monitor.tick(),second)
            self.assertEqual(monitor.receipt.data['state'],'ATTEMPTING')
            monitor.tick()
            note.assert_not_called()
            second.ready=True
            monitor.tick()
        self.assertEqual(spawn.call_count,2)
        self.assertEqual(monitor.receipt.data['state'],'SUCCEEDED')
        note.assert_called_once()

    def test_failed_child_is_not_started_again(self):
        first=SimpleNamespace(alive=True,ready=True)
        second=SimpleNamespace(alive=False,ready=False)
        spawn=Mock(side_effect=[first,second])
        watch=component.ChildRecovery('electric','Electric',spawn,lambda child:child.alive,lambda child:child.ready)
        with patch.object(component.time,'monotonic',side_effect=range(30)), patch('cab_platform.notifications.publish') as note:
            watch.tick()
            first.alive=False
            for _ in range(5):watch.tick()
        self.assertEqual(spawn.call_count,2)
        self.assertEqual(watch.receipt.data['state'],'FAILED')
        note.assert_called_once()

    def test_daemon_once_and_only_when_systemd_reports_failure(self):
        with patch.object(component,'unit_status',side_effect=[('inactive',0),('failed',0),('failed',0),('failed',0)]), \
             patch.object(component,'run_command',return_value=SimpleNamespace(returncode=0)) as command, \
             patch('cab_platform.notifications.publish') as note:
            component.recover_daemon()
            command.assert_not_called()
            component.recover_daemon()
            component.recover_daemon()
        command.assert_called_once_with(['/usr/bin/systemctl','start','cab.service'],10)
        note.assert_called_once()
        self.assertIn('Échec',note.call_args.kwargs['title'])

    def test_daemon_success_requires_its_own_api(self):
        with patch.object(component,'unit_status',side_effect=[('failed',0),('active',99)]), \
             patch.object(component,'run_command',return_value=SimpleNamespace(returncode=0)), \
             patch.object(component,'api_ready',return_value=True) as ready, \
             patch('cab_platform.notifications.publish') as note:
            component.recover_daemon()
        ready.assert_called_once_with(parent=99)
        self.assertIn('Réussite',note.call_args.kwargs['title'])

    def test_explicit_absence_preserves_head_object_identity(self):
        context=SimpleNamespace(project=SimpleNamespace(root=str(self.root)))
        snapshot={'head':'ref','entries':[{'status':'.D','path':'deleted.md'}]}
        object_line=b'100644 blob '+b'a'*40+b'\tdeleted.md\x00'
        with patch('cab_platform.preexisting_git.git_run',side_effect=[
            SimpleNamespace(returncode=1),SimpleNamespace(returncode=0,stdout=b''),
            SimpleNamespace(returncode=0,stdout=object_line)
        ]), patch('cab_platform.session_git.shared_scope_digest',return_value='index'):
            state=file_state(context,'deleted.md',snapshot,[],{})
        self.assertTrue(state['file']['absent'])
        self.assertEqual(state['file']['head_oid'],'a'*40)


if __name__=='__main__':
    unittest.main(verbosity=2)
