"""Contrôles ciblés de la clôture et des invariants de version."""
import hashlib
import types
import unittest
from pathlib import Path
from unittest.mock import Mock,MagicMock,patch
from contextlib import ExitStack
from cab_platform import closure_git as terminal
from cab_platform.versioning import canonical_version,historical_version,version_tag,release_metadata,VersionError


class TerminalVersionTests(unittest.TestCase):
    def test_quatre_surfaces_sans_prefixe_et_defaut_projet(self):
        self.assertEqual(version_tag('3.2.17','3.2.16'),'3.2.17')
        self.assertEqual(version_tag(project_version='3.2.16'),'3.2.16')
        self.assertEqual(release_metadata('3.2.17'),{'version':'3.2.17','tag_name':'3.2.17','name':'3.2.17'})
        for value in ('v3.2.17','V3.2.17'):
            with self.subTest(value=value),self.assertRaises(VersionError):canonical_version(value)
        self.assertEqual(historical_version('v3.2.15'),'3.2.15')

    def test_blocage_selection_limitee_aux_documents(self):
        self.assertEqual(terminal.document_paths('openspec/changes/example','BLOQUÉ'),['openspec/changes/example/STATISTICS.md','STATISTICS.md','openspec/changes/example/BLOCKERS.md'])
        self.assertNotIn('src/main.py',terminal.document_paths('openspec/changes/archive/2026-11-18-example','TERMINÉ'))
        with self.assertRaises(terminal.c.Refused):terminal.document_paths('../other','TERMINÉ')


class TerminalGitTests(unittest.TestCase):
    def test_commit_et_envois_uniques_avant_recu_terminal(self):
        self.check_publication('TERMINÉ')

    def test_sortie_bloquee_publie_aussi_son_fichier_de_blocage(self):
        self.check_publication('BLOQUÉ')

    def check_publication(self,branch):
        project=types.SimpleNamespace(pk='project',root='/fixture',public_metadata={'values':{'GIT_USER_NAME':'Fixture','GIT_USER_EMAIL':'fixture@example.invalid'}})
        current=types.SimpleNamespace(pk=123,project_id='project',project=project,run_id='run',session_id='sid',change='example',change_record_id='change',coding_session_id='coding',configuration={'terminal_git':{'required':True}})
        row=types.SimpleNamespace(pk=456,branch=branch,state='INTENT',receipt={},save=Mock())
        runs=MagicMock();runs.objects.select_for_update.return_value.select_related.return_value.get.return_value=current
        rows=MagicMock();rows.objects.select_for_update.return_value.filter.return_value.first.side_effect=[None,row];rows.objects.create.return_value=row
        docs={'STATISTICS.md':{'raw':b'global','sha256':hashlib.sha256(b'global').hexdigest(),'mode':'100644'},'openspec/changes/example/STATISTICS.md':{'raw':b'change','sha256':hashlib.sha256(b'change').hexdigest(),'mode':'100644'}}
        if branch=='BLOQUÉ':docs['openspec/changes/example/BLOCKERS.md']={'raw':b'dependency','sha256':hashlib.sha256(b'dependency').hexdigest(),'mode':'100644'}
        targets=[{'forge':'FORGEJO','branch':'main','previous':'a'*40,'state':'PENDING'},{'forge':'GITHUB','branch':'main','previous':'a'*40,'state':'PENDING'}]
        shared={'temp':'/fixture/shared','lock':'/fixture/index.lock','lock_identity':[1,2]}
        verbs=[]
        def git(project,options,env,*args,**kwargs):
            verbs.append((args,kwargs))
            output={'hash-object':b'b'*40+b'\n','write-tree':b'c'*40+b'\n','commit-tree':b'd'*40+b'\n','mktag':b'e'*40+b'\n','var':b'Fixture <fixture@example.invalid> 1 +0000\n','rev-parse':b'f'*40+b'\n'}.get(args[0],b'')
            return types.SimpleNamespace(returncode=0,stdout=output)
        with ExitStack() as stack:
            for obj,name,value in [(terminal,'Run',runs),(terminal,'TerminalGitCommit',rows),(terminal,'connection',types.SimpleNamespace(in_atomic_block=False,cursor=MagicMock())),(terminal,'frozen_documents',Mock(return_value=docs)),(terminal,'remote_plan',Mock(return_value=targets)),(terminal,'context',Mock(return_value=({},{}))),(terminal,'_head',Mock(return_value=('refs/heads/main','a'*40))),(terminal,'_gitdir',Mock(return_value=Path('/fixture'))),(terminal,'_hooks_supported',Mock()),(terminal,'_temp_index',Mock(return_value='/fixture/own')),(terminal,'_git',git),(terminal,'shared_scope_digest',Mock(return_value='e'*64)),(terminal,'_verify_shared_index',Mock()),(terminal,'_finish_shared_index',Mock()),(terminal,'_remove_own_lock',Mock())]:stack.enter_context(patch.object(obj,name,value))
            stack.enter_context(patch('django.db.transaction.atomic',return_value=MagicMock()))
            delivery=MagicMock();delivery.objects.filter.return_value.order_by.return_value.first.return_value=types.SimpleNamespace(version='3.2.17')
            stack.enter_context(patch('cab_platform.core.models.GitDelivery',delivery))
            stack.enter_context(patch('cab_platform.project_metadata.read_metadata',return_value={'values':{'PROJECT_VERSION':'3.2.17'}}))
            stack.enter_context(patch('cab_platform.session_git._index_path',return_value='/fixture/path.index'))
            stack.enter_context(patch('cab_platform.session_delivery._prepare_shared_index',return_value=shared))
            stack.enter_context(patch('cab_platform.session_delivery.retired_statistics_snapshots',return_value=[]))
            stack.enter_context(patch.object(terminal.c,'event'))
            stack.enter_context(patch.object(terminal.os,'unlink'))
            sends=stack.enter_context(patch.object(terminal,'send',return_value={'state':'COMPLETED','verified':True}))
            first=terminal.complete(current,branch,'openspec/changes/example')
            count=len(verbs)
            second=terminal.complete(current,branch,'openspec/changes/example')
        self.assertEqual(first,second);self.assertTrue(first['verified']);self.assertEqual(sends.call_count,2)
        self.assertEqual(len(verbs),count)
        self.assertEqual(sum(args[0]=='commit-tree' for args,_ in verbs),1)
        self.assertEqual(row.state,'COMPLETED')
        self.assertEqual(first['tag'],'3.2.17');self.assertTrue(first['tag_moved'])
        if branch=='BLOQUÉ':self.assertIn('openspec/changes/example/BLOCKERS.md',first['documents'])
        updates=[kw['data'] for args,kw in verbs if args[0]=='update-ref' and '--stdin' in args]
        self.assertEqual(len(updates),1);self.assertIn(b'update refs/tags/3.2.17 ',updates[0])
        self.assertNotIn(b'refs/tags/v',updates[0])

    def test_reprise_inconnue_ne_cree_pas_un_autre_commit(self):
        current=types.SimpleNamespace(pk=1,configuration={'terminal_git':{'required':True}})
        row=types.SimpleNamespace(branch='TERMINÉ',state='UNKNOWN')
        runs=MagicMock();runs.objects.select_for_update.return_value.select_related.return_value.get.return_value=current
        rows=MagicMock();rows.objects.select_for_update.return_value.filter.return_value.first.return_value=row
        with patch.object(terminal,'Run',runs),patch.object(terminal,'TerminalGitCommit',rows),patch.object(terminal,'connection',types.SimpleNamespace(in_atomic_block=False,cursor=MagicMock())),patch('django.db.transaction.atomic',return_value=MagicMock()),patch.object(terminal,'_git') as git:
            with self.assertRaises(terminal.c.Refused):terminal.complete(current,'TERMINÉ','openspec/changes/example')
        git.assert_not_called()
