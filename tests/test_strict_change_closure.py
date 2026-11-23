"""Vérification sur PostgreSQL avec annulation systématique des données de test."""
import os
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'src'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cab_platform.settings')
import django

django.setup()

from django.db import transaction
from cab_platform.core import commands as c, monitor, run_closure, run_finalization, run_lifecycle
from cab_platform.core.models import Actor, FinalizationPlan, Project, Run


class StrictClosureTests(unittest.TestCase):
    def setUp(self):
        transaction_scope = transaction.atomic()
        transaction_scope.__enter__()
        def rollback():
            transaction.set_rollback(True)
            transaction_scope.__exit__(None, None, None)
        self.addCleanup(rollback)
        temp = TemporaryDirectory(dir=ROOT / '.cab-tests/DCAB')
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        active = self.root / 'openspec/changes/fixture'
        active.mkdir(parents=True)
        (active / 'proposal.md').write_text('# Proposition\n')
        (active / 'tasks.md').write_text('- [ ] Vérifier\n')
        self.active = active
        key = uuid4().hex
        self.project = Project.objects.create(pk=key, root=str(self.root),
                                              owner_uid=os.getuid(), owner_gid=os.getgid())
        self.actor = Actor.objects.create(pk=key, uid=os.getuid(), agent='fixture',
                                          role='admin', token_hash=key)
        self.run = Run.objects.create(project=self.project, actor=self.actor, run_id='TEST-CLOSURE',
                                      session_id=key, mode='direct', change='fixture',
                                      mandate={'paths': ['openspec/changes']})
        monitor.ensure_records(self.run)
        self.data = {'project_id': key, 'run_id': self.run.run_id, 'receipt_id': 'STOP-FIXTURE'}

    def test_delivery_cannot_close_active_or_incomplete_archive(self):
        policy = {'nature': 'delivery', 'checks': [], 'requirements': [], 'review_required': False}
        plan = FinalizationPlan.objects.create(run=self.run, policy=policy, digest=c.digest(policy))
        self.assertIn('change-still-open', run_finalization.dossier(self.run, plan)['missing'])
        self.assertIsNone(run_finalization.process(self.run.pk))
        self.run.refresh_from_db()
        self.assertEqual(self.run.state, 'WORKING')
        archive = self.active.parent / 'archive/2026-11-19-fixture'
        archive.parent.mkdir()
        self.active.rename(archive)
        self.assertIn('archive-tasks-incomplete', run_finalization.dossier(self.run, plan)['missing'])
        (archive / 'tasks.md').write_text('- [x] Vérifier\n')
        self.assertEqual(run_finalization.dossier(self.run, plan)['missing'], [])

    def test_blocked_run_creates_report_and_keeps_active_change(self):
        data = {**self.data, 'branch': 'BLOQUÉ', 'dependencies': ['Attendre le banc de validation.']}
        receipt = run_closure.close_normal(self.actor, data)
        self.run.refresh_from_db()
        self.assertEqual(self.run.state, 'BLOCKED')
        self.assertTrue(self.active.is_dir())
        self.assertIn('Attendre le banc de validation.', (self.active / 'BLOCKERS.md').read_text())
        self.assertEqual(receipt['blockers']['path'], 'openspec/changes/fixture/BLOCKERS.md')
        self.assertEqual(run_closure.close_normal(self.actor, data), receipt)
        self.assertEqual(self.run.event_set.filter(kind='run-closed').count(), 1)

    def test_inconsistent_closed_run_cannot_be_used_as_success(self):
        original = {'receipt_id': 'ORIGINAL', 'branch': 'TERMINÉ'}
        self.run.state = 'CLOSED'
        self.run.review = {'closure': original}
        self.run.save()
        current = run_lifecycle.reconcile_closed_change(self.run)
        self.assertEqual(current.state, 'CLOSURE_INVALID')
        self.assertEqual(current.review['closure'], original)
        self.assertFalse(run_lifecycle.evaluate(current)['archive_allowed'])
        archive = self.active.parent / 'archive/2026-11-19-fixture'
        archive.parent.mkdir()
        self.active.rename(archive)
        self.assertEqual(run_lifecycle.reconcile_closed_change(current).state, 'CLOSURE_INVALID')
        (archive / 'tasks.md').write_text('- [x] Vérifier\n')
        self.assertEqual(run_lifecycle.reconcile_closed_change(current).state, 'CLOSED')


if __name__ == '__main__':
    unittest.main(verbosity=2)
