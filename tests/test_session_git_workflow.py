"""Contrôles ciblés des invariants Git de session et de livraison."""
import os
import sys
from pathlib import Path
import tempfile
import types
import unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))

from django.conf import settings
if not settings.configured:
    settings.configure(SECRET_KEY='fixture', INSTALLED_APPS=['cab_platform.core'], DATABASES={'default':{'ENGINE':'django.db.backends.dummy'}})
import django
django.setup()
from cab_platform.core.commands import Refused
from cab_platform import session_delivery,session_git


class SnapshotTests(unittest.TestCase):
    def test_capture_statuts_et_masque_chemins_proteges(self):
        oid=b'a'*40
        data=b'# branch.oid '+oid+b'\0# branch.head main\0' + b'1 .M N... 100644 100644 100644 '+oid+b' '+oid+b' src/a.py\0? project.env\0? new.txt\0'
        result=types.SimpleNamespace(returncode=0,stdout=data)
        with patch.object(session_git,'probe',return_value=1),patch.object(session_git,'context',return_value=({},{})),patch.object(session_git,'run',return_value=result):
            value=session_git.git_snapshot(object())
        self.assertEqual(value['head'],'a'*40)
        self.assertEqual(value['branch'],'main')
        self.assertEqual([item['path'] for item in value['entries']],['src/a.py','new.txt'])
        self.assertEqual(value['protected_count'],1)

    def test_depot_absent_ne_cree_pas_git(self):
        with patch.object(session_git,'probe',return_value=0),patch.object(session_git,'run') as run:
            value=session_git.git_snapshot(object())
        self.assertFalse(value['available'])
        run.assert_not_called()


class DeliveryTests(unittest.TestCase):
    def test_version_preserve_autres_lignes_et_commentaire(self):
        original=b'OTHER=value\nPROJECT_VERSION="3.2.15" # note\nSECRET=fixture\n'
        updated,old=session_delivery.replace_version(original,'3.2.16')
        self.assertEqual(old,'3.2.15')
        self.assertEqual(updated,b'OTHER=value\nPROJECT_VERSION="3.2.16" # note\nSECRET=fixture\n')

    def test_refuse_version_dupliquee_ou_non_croissante(self):
        with self.assertRaises(Refused):session_delivery.replace_version(b'PROJECT_VERSION=1.0.0\nPROJECT_VERSION=1.0.1\n','1.1.0')
        with self.assertRaises(Refused):session_delivery.replace_version(b'PROJECT_VERSION=1.0.1\n','1.0.1')

    def test_priorite_tags_distants(self):
        session_delivery.validate_remote_tags('3.2.16',{'refs/tags/v3.2.15':'a','refs/tags/v2026.11.17.09.40':'b','refs/tags/2026-11-17-09-34-54':'c'})
        for tag in ('refs/tags/v3.2.16','refs/tags/3.2.17','refs/tags/non-comparable','refs/tags/2026-99-17-09-34-54'):
            with self.subTest(tag=tag),self.assertRaises(Refused):session_delivery.validate_remote_tags('3.2.16',{tag:'x'})

    def test_copie_index_preserve_source(self):
        with tempfile.TemporaryDirectory(prefix='cab-index-unit-') as directory:
            source=Path(directory)/'source';target=Path(directory)/'target'
            source.write_bytes(b'index-source');target.write_bytes(b'ancien')
            session_delivery._copy_session_index(str(source),str(target),os.getuid())
            self.assertEqual(source.read_bytes(),b'index-source')
            self.assertEqual(target.read_bytes(),b'index-source')



class StatisticsSnapshotsTests(unittest.TestCase):
    def test_seuls_les_rapports_cab_sont_exempts_du_blocage_de_code_non_indexe(self):
        snapshot={'entries':[{'path':'src/main.py','status':'MM'},{'path':'openspec/changes/example/STATISTICS.md','status':'AM'},{'path':'STATISTICS.md','status':'MM'},{'path':'docs/STATISTICS.md','status':'MM'}]}
        self.assertEqual(session_delivery.unstaged_code_paths(snapshot),{'src/main.py','docs/STATISTICS.md'})


class NativeAccessTests(unittest.TestCase):
    def test_chemins_autorises_respectent_les_frontieres(self):
        from cab_platform.core.native_access import within
        self.assertTrue(within(['src/a.py'],['src']))
        self.assertFalse(within(['src-other/a.py'],['src']))
        self.assertFalse(within([],['src']))


class LegacyAdoptionTests(unittest.TestCase):
    def test_adoption_reservee_administrateur(self):
        actor=types.SimpleNamespace(active=True,role='coder')
        with self.assertRaises(Refused) as error:session_git.adopt_files(actor,{})
        self.assertEqual(error.exception.code,'session-git-administrator-required')

    def test_index_partage_adopte_ne_tolere_aucune_modification_ulterieure(self):
        origin={'paths':['src/a.py'],'shared_digest':'approved'}
        with patch.object(session_git,'shared_scope_digest',return_value='approved'):
            self.assertTrue(session_git.shared_index_allowed(object(),{}, {},['src/a.py'],['src/a.py'],origin))
        with patch.object(session_git,'shared_scope_digest',return_value='changed'):
            self.assertFalse(session_git.shared_index_allowed(object(),{}, {},['src/a.py'],['src/a.py'],origin))
        self.assertFalse(session_git.shared_index_allowed(object(),{}, {},['src/b.py'],['src/b.py'],origin))


class DiuBuildTests(unittest.TestCase):
    def test_commande_debian_bornee_et_recu(self):
        from unittest.mock import Mock
        process=Mock(pid=123);process.wait.return_value=0;receipts=[]
        with patch.object(session_delivery,'diu_program',return_value='/fixture/diu'),patch('subprocess.Popen',return_value=process) as spawn,patch('cab_platform.connector_process.identity',return_value={'pid':123}):
            receipt=session_delivery.execute_diu_build(types.SimpleNamespace(identifier='fixture'),'debian','3.2.16',receipts.append)
        self.assertEqual(spawn.call_args.args[0],['/fixture/diu','projects','build','debian','fixture'])
        self.assertEqual([item['phase'] for item in receipts],['prepared','started'])
        self.assertEqual(receipt['exit_code'],0)
        self.assertEqual(receipt['source_mode'],'working-tree')

    def test_timeout_ne_relance_pas_le_build(self):
        import subprocess
        from unittest.mock import Mock
        process=Mock(pid=123);process.wait.side_effect=subprocess.TimeoutExpired('fixture',3600)
        with patch.object(session_delivery,'diu_program',return_value='/fixture/diu'),patch('subprocess.Popen',return_value=process) as spawn,patch('cab_platform.connector_process.identity',return_value={'pid':123}):
            with self.assertRaises(Refused) as error:session_delivery.execute_diu_build(types.SimpleNamespace(identifier='fixture'),'docker','3.2.16',lambda value:None)
        self.assertEqual(error.exception.code,'session-delivery-diu-execution-unknown')
        spawn.assert_called_once()

from test_terminal_git import TerminalVersionTests,TerminalGitTests

if __name__=='__main__':unittest.main()
