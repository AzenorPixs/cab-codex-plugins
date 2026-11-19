"""Qualification PG/Git de l'admission ; seuls les objets de fixture sont écrits."""
import copy
import hashlib
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import uuid
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cab_platform.settings')
import django
django.setup()
from django.db import transaction
from cab_platform import preexisting_git as admission, session_git as session
from cab_platform.core import commands as c
from cab_platform.core.models import Actor, Event, GitChange, GitFileReservation, GitSessionIndex, Lease, Operation, Project, Resource


class PreexistingAuthorizationTests(unittest.TestCase):
    def setUp(self):
        self.atomic = transaction.atomic()
        self.atomic.__enter__()
        self.addCleanup(self.rollback)
        folder = tempfile.TemporaryDirectory(prefix='cab-preexisting-')
        self.addCleanup(folder.cleanup)
        self.root = Path(folder.name)
        (self.root / 'incoming').mkdir()
        (self.root / 'DEVOPS.md').write_text('base\n')
        (self.root / 'notes.md').write_text('stable\n')
        self.git('init', '-q')
        self.git('config', 'user.name', 'CAB fixture')
        self.git('config', 'user.email', 'fixture@example.invalid')
        self.git('add', 'DEVOPS.md', 'notes.md')
        self.git('commit', '-qm', 'base')
        (self.root / 'DEVOPS.md').write_text('preexisting explicitly approved\n')
        token = uuid.uuid4().hex
        self.owner = Actor.objects.create(pk='fixture-preexisting-owner-' + token, uid=os.getuid(), agent='fixture', token_hash=token)
        self.admin = Actor.objects.create(pk='fixture-preexisting-admin-' + token, uid=os.getuid(), agent='fixture', role='admin', token_hash=token + 'admin')
        self.project = Project.objects.create(pk=token, root=str(self.root), owner_uid=os.getuid(), owner_gid=os.getgid())
        self.owner.projects.add(self.project)
        self.run = c.begin_run(self.owner, {'project_id': token, 'run_id': 'FIXTURE', 'session_id': 'FIXTURE-' + token, 'mode': 'direct', 'change': 'fixture-preexisting', 'paths': ['DEVOPS.md', 'notes.md', 'incoming'], 'criteria': ['fixture'], 'decisions_resolved': True, 'finalization': {'nature': 'development', 'checks': [{'id': 'fixture', 'argv': ['/bin/true'], 'criteria': ['fixture']}]}})
        self.run.mandate = {**self.run.mandate, 'native_source': {'source_file': str(self.root / 'notes.md'), 'uid': os.getuid()}}
        self.run.save(update_fields=['mandate'])
        resolver = patch.object(c, 'resolve_native', side_effect=lambda *args, **kwargs: kwargs['run'].mandate.get('native_source'))
        resolver.start()
        self.addCleanup(resolver.stop)
        self.baseline = copy.deepcopy(GitChange.objects.get(change=self.run.change_record).baseline)
        self.kw = {'project_id': token, 'run_id': self.run.run_id}

    def rollback(self):
        if getattr(self, 'rolled_back', False):
            return
        transaction.set_rollback(True)
        self.atomic.__exit__(None, None, None)
        self.rolled_back = True

    def git(self, *args):
        result = subprocess.run(['/usr/bin/git', '-C', str(self.root), *args], env={**os.environ, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null'}, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout.strip()

    def inspect(self, paths=None):
        return admission.inspect_preexisting(self.admin, {**self.kw, 'paths': paths or ['DEVOPS.md']})['expected_state']

    def payload(self, **changes):
        paths = changes.get('paths', ['DEVOPS.md'])
        expected = changes.get('expected_state')
        if expected is None:
            expected = self.inspect(paths)
        return {**self.kw, 'request_id': 'fixture-authorize', 'paths': paths, 'expected_state': expected, 'authorization': 'Developer explicitly approved inclusion of this preexisting fixture file.', **changes}

    def reserve(self, paths=None):
        selected = paths or ['DEVOPS.md']
        key = hashlib.sha256('\0'.join(sorted(selected)).encode()).hexdigest()[:12]
        return session.reserve_files(self.owner, {**self.kw, 'request_id': 'fixture-reserve-' + key, 'paths': selected})

    def test_preexisting_refused_without_authorization(self):
        with self.assertRaisesRegex(c.Refused, 'file-preexisting'):
            self.reserve()
        self.assertFalse(GitFileReservation.objects.filter(project=self.project).exists())

    def test_admission_preserves_baseline_file_and_index_then_allows_reservation(self):
        payload = self.payload()
        head = self.git('rev-parse', 'HEAD')
        status = self.git('status', '--porcelain')
        raw = (self.root / 'DEVOPS.md').read_bytes()
        receipt = admission.authorize_preexisting(self.admin, payload)
        self.assertTrue(receipt['baseline_preserved'])
        self.assertFalse(receipt['index_changed'])
        self.assertFalse(GitSessionIndex.objects.filter(change=self.run.change_record).exists())
        self.assertFalse(GitFileReservation.objects.filter(project=self.project).exists())
        self.assertEqual(GitChange.objects.get(change=self.run.change_record).baseline, self.baseline)
        self.assertEqual((head, status, raw), (self.git('rev-parse', 'HEAD'), self.git('status', '--porcelain'), (self.root / 'DEVOPS.md').read_bytes()))
        self.assertEqual(self.reserve()['reserved_count'], 1)
        event = Event.objects.get(run=self.run, kind='git-files-reserved')
        self.assertEqual(event.data['preexisting_authorizations'][0]['grant_id'], receipt['grant_id'])

    def test_idempotency_and_conflicting_request_are_audited(self):
        payload = self.payload()
        receipt = admission.authorize_preexisting(self.admin, payload)
        self.reserve()
        self.assertEqual(receipt, admission.authorize_preexisting(self.admin, payload))
        with self.assertRaisesRegex(c.Refused, 'request-conflict'):
            admission.authorize_preexisting(self.admin, {**payload, 'authorization': 'A different authorization must not replace the first receipt.'})
        self.assertEqual(Event.objects.filter(run=self.run, kind='git-preexisting-authorized').count(), 1)

    def test_owner_cannot_inspect_or_grant_administrative_authority(self):
        with self.assertRaisesRegex(c.Refused, 'administrator-required'):
            admission.inspect_preexisting(self.owner, {**self.kw, 'paths': ['DEVOPS.md']})
        with self.assertRaisesRegex(c.Refused, 'administrator-required'):
            admission.authorize_preexisting(self.owner, self.payload())

    def test_cas_rejects_changed_file_without_mutating_baseline(self):
        payload = self.payload()
        (self.root / 'DEVOPS.md').write_text('changed after approval observation\n')
        with self.assertRaisesRegex(c.Refused, 'source-changed'):
            admission.authorize_preexisting(self.admin, payload)
        self.assertFalse(Event.objects.filter(run=self.run, kind='git-preexisting-authorized').exists())
        self.assertEqual(GitChange.objects.get(change=self.run.change_record).baseline, self.baseline)

    def test_cas_rejects_tampered_head_and_baseline(self):
        payload = self.payload()
        for key in ['head', 'baseline_digest', 'framing_digest', 'source_revision']:
            modified = copy.deepcopy(payload)
            modified['expected_state'][key] = '0' * 64
            with self.subTest(key=key), self.assertRaisesRegex(c.Refused, 'source-changed'):
                admission.authorize_preexisting(self.admin, modified)
        modified = copy.deepcopy(payload)
        modified['expected_state']['scope']['generation'] = True
        with self.assertRaisesRegex(c.Refused, 'source-changed'):
            admission.authorize_preexisting(self.admin, modified)

    def test_grant_becomes_stale_if_file_changes_before_reservation(self):
        admission.authorize_preexisting(self.admin, self.payload())
        (self.root / 'DEVOPS.md').write_text('foreign change after grant\n')
        with self.assertRaisesRegex(c.Refused, 'file-preexisting'):
            self.reserve()
        self.assertFalse(GitFileReservation.objects.filter(project=self.project).exists())

    def test_file_mode_change_also_invalidates_grant(self):
        admission.authorize_preexisting(self.admin, self.payload())
        target = self.root / 'DEVOPS.md'
        target.chmod(target.stat().st_mode ^ 0o100)
        with self.assertRaisesRegex(c.Refused, 'file-preexisting'):
            self.reserve()

    def test_outside_scope_secrets_symlinks_and_directories_rejected(self):
        (self.root / 'outside.md').write_text('outside\n')
        (self.root / 'incoming' / 'credentials.json').write_text('{}')
        (self.root / 'incoming' / 'link.md').symlink_to(self.root / 'notes.md')
        for path in ['outside.md', 'incoming/credentials.json', 'incoming/link.md', 'incoming', '../outside.md', 'incoming/\0bad', 'incoming/\udcffbad']:
            with self.subTest(path=path), self.assertRaises((c.Refused, ValueError)):
                self.inspect([path])

    def test_replacement_by_fifo_cannot_block_file_inspection(self):
        original_open = os.open
        target = self.root / 'DEVOPS.md'
        def replacing_open(path, flags, *args, **kwargs):
            if Path(path) == target:
                target.unlink()
                os.mkfifo(target)
            return original_open(path, flags, *args, **kwargs)
        with patch.object(admission.os, 'open', side_effect=replacing_open):
            with self.assertRaisesRegex(c.Refused, 'file-unsafe'):
                admission.fingerprint(self.root, 'DEVOPS.md')

    def test_foreign_reservation_is_never_adopted(self):
        other = c.begin_run(self.owner, {**self.run.mandate, 'run_id': 'OTHER', 'session_id': 'OTHER-SID', 'change': 'other'})
        index = GitSessionIndex.objects.create(change=other.change_record, session_id=other.coding_session_id, initial_run=other)
        GitFileReservation.objects.create(project=self.project, git_index=index, path='DEVOPS.md', path_digest=hashlib.sha256(b'DEVOPS.md').hexdigest())
        with self.assertRaisesRegex(c.Refused, 'session-git-reserved'):
            self.inspect()

    def test_shared_staged_content_is_not_blessed(self):
        self.git('add', 'DEVOPS.md')
        with self.assertRaisesRegex(c.Refused, 'shared-index-conflict'):
            self.inspect()

    def test_unknown_operation_and_lease_remain_protected(self):
        unknown = Operation.objects.create(run=self.run, request_id='fixture-unknown', input_digest='fixture', source_revision='fixture', state='UNKNOWN')
        with self.assertRaisesRegex(c.Refused, 'effects-protected'):
            self.inspect()
        unknown.delete()
        resource = Resource.objects.create(key='fixture-resource-' + uuid.uuid4().hex)
        Lease.objects.create(run=self.run, resource=resource, fencing=1)
        with self.assertRaisesRegex(c.Refused, 'effects-protected'):
            self.inspect()

    def test_review_freeze_import_and_closed_remain_protected(self):
        original = copy.deepcopy(self.run.mandate)
        for key in ['native_frozen_at', 'legacy_snapshot_id']:
            self.run.mandate = {**original, key: 'fixture'}
            self.run.save()
            with self.assertRaises(c.Refused):
                self.inspect()
        self.run.mandate = original
        self.run.review = {'decision': {'decision': 'accept'}}
        self.run.save()
        with self.assertRaises(c.Refused):
            self.inspect()
        self.run.review = {}
        self.run.state = 'CLOSED'
        self.run.save()
        with self.assertRaises(c.Refused):
            self.inspect()

    def test_native_source_divergence_is_not_overridden(self):
        with patch.object(c, 'resolve_native', return_value={'source_file': 'wrong'}):
            with self.assertRaisesRegex(c.Refused, 'native-source-resume-required'):
                self.inspect()

    def test_existing_index_is_preserved_and_used(self):
        self.reserve(['notes.md'])
        index = GitSessionIndex.objects.get(change=self.run.change_record)
        payload = self.payload()
        self.assertEqual(payload['expected_state']['index_id'], index.pk)
        admission.authorize_preexisting(self.admin, payload)
        self.reserve(['DEVOPS.md'])
        self.assertEqual(GitSessionIndex.objects.get(change=self.run.change_record).pk, index.pk)

    def test_untracked_regular_file_requires_exact_explicit_grant(self):
        path = 'incoming/approved.md'
        (self.root / path).write_text('explicitly approved external file\n')
        payload = self.payload(paths=[path], expected_state=self.inspect([path]))
        admission.authorize_preexisting(self.admin, payload)
        self.assertEqual(self.reserve([path])['reserved_count'], 1)
        self.assertEqual(GitChange.objects.get(change=self.run.change_record).baseline, self.baseline)

    def test_historical_dirty_committed_file_is_automatically_reservable(self):
        self.git('add', 'DEVOPS.md')
        self.git('commit', '-qm', 'prior work delivered')
        self.assertEqual(self.reserve()['reserved_count'], 1)
        self.assertEqual(GitChange.objects.get(change=self.run.change_record).baseline, self.baseline)
        event = Event.objects.get(run=self.run, kind='git-files-reserved')
        self.assertEqual(event.data['clean_initial_paths'], ['DEVOPS.md'])
        self.assertFalse(Event.objects.filter(run=self.run, kind='git-preexisting-authorized').exists())

    def test_clean_status_cannot_hide_different_bytes(self):
        self.git('add', 'DEVOPS.md')
        self.git('commit', '-qm', 'prior work delivered')
        self.git('update-index', '--assume-unchanged', 'DEVOPS.md')
        (self.root / 'DEVOPS.md').write_text('hidden external content\n')
        self.assertEqual(self.git('status', '--porcelain'), '')
        with self.assertRaisesRegex(c.Refused, 'file-preexisting'):
            self.reserve()

    def test_ignored_executable_bit_preserves_modes_and_baseline(self):
        self.git('add', 'DEVOPS.md')
        self.git('commit', '-qm', 'prior work delivered')
        self.git('config', 'core.filemode', 'false')
        path = self.root / 'DEVOPS.md'
        path.chmod(0o770)
        before = admission.fingerprint(self.root, 'DEVOPS.md')
        self.assertEqual(self.git('status', '--porcelain'), '')
        self.assertEqual(self.reserve()['reserved_count'], 1)
        self.assertEqual(admission.fingerprint(self.root, 'DEVOPS.md'), before)
        self.assertEqual(GitChange.objects.get(change=self.run.change_record).baseline, self.baseline)
        self.assertEqual(Event.objects.get(run=self.run, kind='git-files-reserved').data['clean_initial_paths'], ['DEVOPS.md'])

    def test_tracked_executable_bit_difference_is_refused(self):
        self.git('add', 'DEVOPS.md')
        self.git('commit', '-qm', 'prior work delivered')
        self.git('config', 'core.filemode', 'true')
        (self.root / 'DEVOPS.md').chmod(0o770)
        self.assertFalse(admission.clean_at_head(self.run, 'DEVOPS.md', session.git_snapshot(self.project)))
        with self.assertRaisesRegex(c.Refused, 'file-preexisting'):
            self.reserve()

    def test_ignored_mode_cannot_hide_different_bytes(self):
        self.git('add', 'DEVOPS.md')
        self.git('commit', '-qm', 'prior work delivered')
        self.git('config', 'core.filemode', 'false')
        self.git('update-index', '--assume-unchanged', 'DEVOPS.md')
        (self.root / 'DEVOPS.md').write_text('hidden external content\n')
        (self.root / 'DEVOPS.md').chmod(0o770)
        self.assertEqual(self.git('status', '--porcelain'), '')
        with self.assertRaisesRegex(c.Refused, 'file-preexisting'):
            self.reserve()

    def test_grant_cannot_leak_to_another_run(self):
        admission.authorize_preexisting(self.admin, self.payload())
        other = c.begin_run(self.owner, {**self.run.mandate, 'run_id': 'OTHER', 'session_id': 'OTHER-SID', 'change': 'other'})
        with self.assertRaisesRegex(c.Refused, 'file-preexisting'):
            session.reserve_files(self.owner, {**self.kw, 'run_id': other.run_id, 'request_id': 'other-reserve', 'paths': ['DEVOPS.md']})


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(PreexistingAuthorizationTests)
    if suite.countTestCases() == 0:
        raise RuntimeError('aucun-test-decouvert')
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    raise SystemExit(0 if result.wasSuccessful() else 1)
