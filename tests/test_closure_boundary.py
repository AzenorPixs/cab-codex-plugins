"""Périmètre des commits statistiques sur un dépôt jetable, jamais le projet."""
import contextlib
import hashlib
import types
import unittest
from unittest.mock import MagicMock,patch

import test_git_commit_metadata as fixtures
from cab_platform import phase_statistics as phase,reports_git as reports
from cab_platform import closure_git
from cab_platform.core.commands import Refused


class WrittenReportsTests(unittest.TestCase):
    def test_closure_uses_phase_receipts_without_a_git_commit(self):
        run=types.SimpleNamespace(configuration={'cycle_profile':'publication-12-v1'})
        with patch.object(closure_git,'parallel_receipt',return_value={'project_written':False}) as receipt,patch.object(closure_git,'_git') as git:
            self.assertEqual(closure_git.complete(run,'TERMINÉ','unused'),{'project_written':False})
        receipt.assert_called_once_with(run,'TERMINÉ');git.assert_not_called()

    def test_only_actual_writes_are_selected(self):
        root='/fixture'
        hashes={'STATISTICS.md':'global','openspec/changes/change/STATISTICS.md':'change','openspec/changes/change/BLOCKERS.md':'preexisting'}
        expected={'/fixture/STATISTICS.md':{'before':'old','after':'global'},'/fixture/openspec/changes/change/STATISTICS.md':{'before':None,'after':'change'}}
        self.assertEqual(phase.written_reports(root,expected,hashes),{'STATISTICS.md':'global','openspec/changes/change/STATISTICS.md':'change'})

    def test_unchanged_report_is_not_selected(self):
        self.assertEqual(phase.written_reports('/fixture',{'/fixture/STATISTICS.md':{'before':'same','after':'same'}},{'STATISTICS.md':'same'}),{})

    def test_write_from_another_phase_is_not_selected(self):
        self.assertEqual(phase.written_reports('/fixture',{'/fixture/code.py':{'before':'old','after':'new'}},{'STATISTICS.md':'global'}),{})

    def test_report_changed_after_rendering_is_rejected(self):
        with self.assertRaisesRegex(Refused,'report-commit-source-changed'):
            phase.written_reports('/fixture',{'/fixture/STATISTICS.md':{'before':'old','after':'generated'}},{'STATISTICS.md':'concurrent'})


class ReportCommitTests(unittest.TestCase):
    def setUp(self):
        self.fixture=fixtures.MetadataTests('test_dates_et_signatures_protegees')
        self.fixture.setUp();self.addCleanup(self.fixture.doCleanups)
        self.root=self.fixture.root
        (self.root/'.git/cab-session-index').mkdir(mode=0o700)
        self.project=self.fixture.project
        self.project.public_metadata={'values':{'GIT_USER_NAME':'Fixture','GIT_USER_EMAIL':'fixture@example.invalid'}}
        self.run=types.SimpleNamespace(project=self.project,change='fixture')
        self.report='openspec/changes/fixture/STATISTICS.md'
        (self.root/self.report).parent.mkdir(parents=True)
        (self.root/self.report).write_text('Rapport produit par la phase\n')
        (self.root/'STATISTICS.md').write_text('Global préexistant modifié hors phase\n')
        (self.root/self.report).with_name('BLOCKERS.md').write_text('Blocage préexistant hors phase\n')
        self.events=MagicMock()
        self.events.objects.filter.return_value.first.return_value=None
        self.events.objects.filter.return_value.exists.return_value=False

    def commit(self,hashes=None):
        hashes=hashes if hashes is not None else {self.report:hashlib.sha256((self.root/self.report).read_bytes()).hexdigest()}
        with patch.object(reports,'Event',self.events),patch.object(reports.c,'event'),patch.object(reports,'git_guard',contextlib.nullcontext):
            return reports.commit(self.run,[self.report],'fixture-phase-commit',expected_hashes=hashes)

    def test_commit_only_its_report_preserves_other_staged_and_working_files(self):
        indexed=self.fixture.git('show',':file.txt')
        working=(self.root/'file.txt').read_bytes()
        tags=self.fixture.git('show-ref','--tags')
        result=self.commit()
        self.assertEqual(result['state'],'COMPLETED')
        self.assertTrue(result['local_only'])
        self.assertEqual(self.fixture.git('diff-tree','--no-commit-id','--name-only','-r',result['commit']).splitlines(),[self.report])
        self.assertEqual(self.fixture.git('show',':file.txt'),indexed)
        self.assertEqual((self.root/'file.txt').read_bytes(),working)
        self.assertEqual(self.fixture.git('show-ref','--tags'),tags)
        self.assertEqual((self.root/'STATISTICS.md').read_text(),'Global préexistant modifié hors phase\n')
        self.assertEqual((self.root/self.report).with_name('BLOCKERS.md').read_text(),'Blocage préexistant hors phase\n')

    def test_no_second_commit_when_report_is_already_committed(self):
        first=self.commit()
        result=self.commit()
        self.assertEqual(result['state'],'NO_CHANGE')
        self.assertIsNone(result['commit'])
        self.assertEqual(result['head'],first['commit'])
        self.assertEqual(self.fixture.git('rev-parse','HEAD').strip(),first['commit'])

    def test_concurrent_report_is_rejected_before_ref_change(self):
        head=self.fixture.git('rev-parse','HEAD')
        with self.assertRaisesRegex(Refused,'report-commit-source-changed'):self.commit({self.report:'0'*64})
        self.assertEqual(self.fixture.git('rev-parse','HEAD'),head)

    def test_code_cannot_enter_the_report_commit(self):
        with self.assertRaisesRegex(Refused,'report-commit-path-invalid'):
            reports.commit(self.run,['file.txt'],'fixture-code-forbidden',expected_hashes={'file.txt':'0'*64})


if __name__=='__main__':unittest.main()
