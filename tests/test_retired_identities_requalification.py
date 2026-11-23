"""Requalification ciblée sans relancer de transaction d’effacement réelle."""
from pathlib import Path
import os
import subprocess
import sys
import unittest

from test_strict_change_closure import StrictClosureTests
from cab_platform.core import run_lifecycle


class ArchiveIntegrityTest(StrictClosureTests):
    def test_imported_closed_archive_with_incomplete_tasks_is_invalid(self):
        archive = self.active.parent / 'archive/2026-11-19-fixture'
        archive.parent.mkdir()
        self.active.rename(archive)
        self.run.state = 'CLOSED'
        self.run.suspension = 'IMPORT_PROTECTED'
        self.run.save()
        current = run_lifecycle.reconcile_closed_change(self.run)
        self.assertEqual(current.state, 'CLOSURE_INVALID')
        self.assertEqual(current.suspension, 'IMPORT_PROTECTED')
        self.assertEqual(run_lifecycle.evaluate(current)['reasons'], ['archive-tasks-incomplete'])
        (archive / 'tasks.md').write_text('- [x] Vérifier\n')
        repaired = run_lifecycle.reconcile_closed_change(current)
        self.assertEqual(repaired.state, 'CLOSED')
        self.assertEqual(repaired.suspension, 'IMPORT_PROTECTED')


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    subprocess.run([
        '/home/devops/node/current/bin/node', '--test',
        'tests/shared-retention.test.mjs', 'tests/owner-cleanup.test.mjs',
        'tests/sgs-erasure-marker.test.mjs', 'tests/atelier-native.test.mjs',
        'tests/retired-run-cleanup.test.mjs',
    ], cwd=root, check=True, env={**os.environ,'CAB_TEST_FOREIGN_UID':'',
                                 'CAB_TEST_PYTHON':'/home/devops/python/current/bin/python3'})
    args=[sys.executable, '-B', 'tests/test_atelier_permissions.py']
    if os.getuid()==0:
        import pwd
        owner=pwd.getpwuid(root.stat().st_uid).pw_name
        args=['/usr/sbin/runuser','-u',owner,'--',*args]
    subprocess.run(args,cwd=root,check=True)
    subprocess.run([sys.executable,'-B','tests/test_runtime_services.py',
                    'RuntimeServicesTest.test_only_released_snapshot_removes_report_and_aggregate_without_reimport',
                    'RuntimeServicesTest.test_forget_released_open_snapshot_preserves_peer_and_prevents_reimport',
                    'RuntimeServicesTest.test_explicit_archive_forget_suppresses_reimport_and_compacts'],
                   cwd=root,check=True)
    unittest.main(defaultTest='ArchiveIntegrityTest', verbosity=2)
