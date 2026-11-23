"""Rapport retiré absent : Git réel, aucun accès à la base de production."""
import copy
import hashlib
import os
import types
import unittest
from unittest.mock import MagicMock, patch
import test_git_commit_metadata as fixtures
from cab_platform.core import commands as c, statistics_service as s


class AbsentReportRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.fixture=fixtures.MetadataTests('test_dates_et_signatures_protegees')
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        self.root=self.fixture.root
        self.relative='openspec/changes/retired/STATISTICS.md'
        self.archive=self.root/'openspec/changes/archive/2026-11-21-retired'
        self.archive.mkdir(parents=True)
        (self.archive/'proposal.md').write_text('Archive réelle\n')
        self.sibling='openspec/changes/archive/2026-11-21-other/STATISTICS.md'
        self.current=self.root/self.sibling
        self.current.parent.mkdir()
        self.current.write_text('Rapport achevé\n')
        self.fixture.git('add','--',self.sibling)
        desired=hashlib.sha256(b'rapport non publie').hexdigest()
        completed=hashlib.sha256(self.current.read_bytes()).hexdigest()
        self.job=types.SimpleNamespace(pk='fixture',request_id='fixture-recovery',project=self.fixture.project,
            state='UNKNOWN',action='sync',owner_pid=99999991,owner_start='stopped',
            expected={str(self.root/self.relative):{'before':None,'after':desired}},
            result={'error':'statistics-publication-unconfirmed',
                'child':{'pid':99999992,'start':'stopped'},'indexed_documents':{
                    self.relative:{'state':'PENDING','sha256':desired},
                    self.sibling:{'state':'COMPLETED','sha256':completed}}},save=MagicMock())

    def evidence(self):
        return s.retired_pending_publication_evidence(self.job)

    def test_absent_head_and_index_recovers_without_mutation_or_replay(self):
        from cab_platform.core.models import Event
        original=copy.deepcopy({'state':self.job.state,'expected':self.job.expected,'result':self.job.result})
        index=(self.root/'.git/index').read_bytes()
        refs=self.fixture.git('show-ref')
        lock=types.SimpleNamespace(owner=self.job,save=MagicMock())
        connection=types.SimpleNamespace(in_atomic_block=True,cursor=MagicMock())
        with patch.object(s,'connection',connection),patch.object(Event.objects,'create') as event:
            s.recover_lock(lock)
        self.assertEqual(self.job.state,'FAILED')
        self.assertIsNone(lock.owner)
        self.assertEqual(event.call_args.kwargs['data']['original_receipt'],original)
        result=self.job.result['recovery']
        self.assertEqual(result['classification'],'FAILED_REMAINDER_NO_CHANGE')
        self.assertTrue(result['index_before_absent'])
        self.assertFalse(result['effects_replayed'])
        self.assertFalse(result['success_reconstructed'])
        self.assertEqual(self.job.result['indexed_documents'],original['result']['indexed_documents'])
        self.assertEqual((self.root/'.git/index').read_bytes(),index)
        self.assertEqual(self.fixture.git('show-ref'),refs)
        self.assertFalse((self.root/self.relative).exists())

    def test_index_entry_without_head_preserves_unknown(self):
        path=self.root/self.relative
        path.parent.mkdir()
        path.write_text('Entrée divergente')
        self.fixture.git('add','--',self.relative)
        path.unlink()
        path.parent.rmdir()
        self.assertIsNone(self.evidence())

    def test_head_entry_without_index_preserves_unknown(self):
        path=self.root/self.relative
        path.parent.mkdir()
        path.write_text('Ancien rapport')
        self.fixture.git('add','--',self.relative)
        self.fixture.git('commit','-m','Rapport fixture')
        self.fixture.git('rm','--',self.relative)
        if path.parent.exists():path.parent.rmdir()
        self.assertIsNone(self.evidence())

    def test_changed_completed_report_preserves_unknown(self):
        self.current.write_text('Contenu divergent')
        self.assertIsNone(self.evidence())

    def test_live_writer_preserves_unknown(self):
        self.job.result['child']={'pid':os.getpid(),'start':s.process_identity(os.getpid())}
        self.assertIsNone(self.evidence())

    def test_ambiguous_archive_preserves_unknown(self):
        (self.archive.parent/'2026-11-20-retired').mkdir()
        self.assertIsNone(self.evidence())

    def test_git_failure_is_not_absence(self):
        from cab_platform.git_commit_remove import run
        def failing(*args):
            if 'ls-files' in args:return types.SimpleNamespace(returncode=128,stdout=b'')
            return run(*args)
        with patch('cab_platform.git_commit_remove.run',side_effect=failing):
            self.assertIsNone(self.evidence())


if __name__=='__main__':unittest.main()
