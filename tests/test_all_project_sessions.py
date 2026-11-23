"""Contrôles ciblés de portée Electric et de reprise de fichiers déjà libérés."""
import hashlib
import os
import subprocess
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import MagicMock,patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,os.environ.get('CAB_TEST_SOURCE',str(ROOT/'src')))
from django.conf import settings
if not settings.configured:settings.configure(SECRET_KEY='fixture',INSTALLED_APPS=['django.contrib.auth','django.contrib.contenttypes','cab_platform.core'],DATABASES={'default':{'ENGINE':'django.db.backends.dummy'}})
import django
django.setup()
from cab_platform import web_views as views
from cab_platform.core.commands import Refused


class GlobalSessionScopeTests(unittest.TestCase):
    def shape(self,actor):
        request=types.SimpleNamespace(GET={'offset':'-1','where':'true','table':'projects'})
        response=types.SimpleNamespace(status_code=200,content=b'[]',headers={'content-type':'application/json'})
        with patch.object(views,'principal',return_value=actor),patch.object(views,'config',return_value={'initialized':True,'electric_secret':'fixture','electric_port':8791}),patch('httpx.get',return_value=response) as fetch:
            result=views.sync_project_sessions(request)
        self.assertEqual(result.status_code,200)
        params=fetch.call_args.kwargs['params']
        self.assertEqual(params['table'],'cab_core_sessionprojection')
        self.assertEqual(params['offset'],'-1')
        return params['where']

    def test_administrateur_recoit_toutes_les_sessions_non_archivees(self):
        actor=types.SimpleNamespace(active=True,role='admin',projects=MagicMock())
        self.assertEqual(self.shape(actor),'archived = false')
        actor.projects.values_list.assert_not_called()

    def test_acteur_limite_aux_projets_autorises_et_parametres_non_substituables(self):
        actor=types.SimpleNamespace(active=True,role='coder',projects=MagicMock())
        actor.projects.values_list.return_value=['project-a',"project'b"]
        self.assertEqual(self.shape(actor),"archived = false AND project_id IN ('project-a','project''b')")

    def test_aucun_projet_autorise_ne_donne_aucune_session(self):
        actor=types.SimpleNamespace(active=True,role='coder',projects=MagicMock())
        actor.projects.values_list.return_value=[]
        self.assertEqual(self.shape(actor),'false')

    def test_absence_authentification_ne_transmet_aucune_requete_electric(self):
        with patch.object(views,'principal',side_effect=Refused('authentication-required',401)),patch('httpx.get') as fetch:
            result=views.sync_project_sessions(types.SimpleNamespace(GET={}))
        self.assertEqual(result.status_code,403);fetch.assert_not_called()


class ReleasedSnapshotTests(unittest.TestCase):
    def test_snapshot_libere_reutilisable_uniquement_sans_modification(self):
        import test_git_commit_metadata as fixture_module
        from cab_platform.session_git import released_index_matches
        fixture=fixture_module.MetadataTests('test_dates_et_signatures_protegees');fixture.setUp();self.addCleanup(fixture.doCleanups)
        fixture.git('add','file.txt','libre.txt')
        tree=fixture.git('write-tree').strip()
        snapshot=fixture.git('commit-tree',tree,'-p',fixture.head,'-m','Snapshot de vérification').strip()
        ref='refs/cab/session-index/fixture-owned';fixture.git('update-ref',ref,snapshot)
        path=str(fixture.root/'.git/index');digest=hashlib.sha256(Path(path).read_bytes()).hexdigest()
        index=types.SimpleNamespace(state='RELEASED',origin={'release':{'index_sha256':digest}},index_path=path,keep_ref=ref,keep_oid=snapshot)
        self.assertTrue(released_index_matches(fixture.project,index,'file.txt'))
        index.origin['release']['index_sha256']='0'*64
        self.assertFalse(released_index_matches(fixture.project,index,'file.txt'))
        index.origin['release']['index_sha256']=digest
        (fixture.root/'file.txt').write_text('Modification nouvelle à ne pas reprendre\n')
        self.assertFalse(released_index_matches(fixture.project,index,'file.txt'))


if __name__=='__main__':
    build='--build' in sys.argv
    if build:sys.argv.remove('--build')
    result=unittest.main(verbosity=2,exit=False).result
    if not result.wasSuccessful():raise SystemExit(1)
    if build:
        env={**os.environ,'PATH':'/home/devops/node/current/bin:/usr/bin:/bin'}
        raise SystemExit(subprocess.run(['/home/devops/node/current/bin/npm','run','build','--prefix',str(ROOT/'frontend')],env=env).returncode)
