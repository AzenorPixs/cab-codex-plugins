"""Vérifications hôte ciblées sur un dépôt éphémère, sans toucher aux projets."""
import hashlib
import os
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import MagicMock,patch

sys.path.insert(0,os.environ.get('CAB_TEST_SOURCE',str(Path(__file__).resolve().parents[1]/'src')))
from django.conf import settings
if not settings.configured:settings.configure(SECRET_KEY='fixture',INSTALLED_APPS=['cab_platform.core'],DATABASES={'default':{'ENGINE':'django.db.backends.dummy'}})
import django
django.setup()
from cab_platform import git_commit_metadata as m
from cab_platform.core.commands import Refused


class MetadataTests(unittest.TestCase):
    def setUp(self):
        self.folder=tempfile.TemporaryDirectory(prefix='cab-commit-edit-')
        self.addCleanup(self.folder.cleanup)
        self.root=Path(self.folder.name)
        self.project=types.SimpleNamespace(pk='fixture',root=str(self.root),owner_uid=os.getuid(),owner_gid=os.getgid(),creation_state='READY')
        self.env={'PATH':'/usr/bin:/bin','HOME':str(self.root),'GIT_CONFIG_NOSYSTEM':'1','GIT_CONFIG_GLOBAL':'/dev/null','GIT_OPTIONAL_LOCKS':'0','GIT_AUTHOR_NAME':'Fixture','GIT_AUTHOR_EMAIL':'fixture@example.invalid','GIT_COMMITTER_NAME':'Fixture','GIT_COMMITTER_EMAIL':'fixture@example.invalid','GIT_AUTHOR_DATE':'1600000000 +0100','GIT_COMMITTER_DATE':'1600000000 +0100'}
        self.git('init','--initial-branch=main')
        (self.root/'file.txt').write_text('premier\n');self.git('add','file.txt');self.git('commit','-m','Premier')
        self.first=self.git('rev-parse','HEAD').strip()
        (self.root/'file.txt').write_text('second\n');self.git('add','file.txt');self.git('commit','-m','Second')
        self.head=self.git('rev-parse','HEAD').strip()
        self.git('branch','autre');self.git('tag','debut',self.first)
        self.git('tag','-a','fin','-m','Description de fin')
        (self.root/'file.txt').write_text('indexé\n');self.git('add','file.txt')
        (self.root/'file.txt').write_text('travail non indexé\n');(self.root/'libre.txt').write_text('non suivi\n')

    def git(self,*args):
        result=m.write(self.project,{},self.env,*args)
        self.assertEqual(result.returncode,0,args)
        return result.stdout.decode()

    def draft(self,commit=None):
        preview=m.preview(self.project,commit or self.first,self.head)
        tag=preview['tags'][0] if preview['tags'] else {'name':'','description':''}
        return {'request_id':'fixture-edit','commit':preview['commit'],'expected_head':preview['head'],'expected_branch':preview['branch'],'refs_digest':preview['refs_digest'],'author':preview['author'],'email':preview['email'],'date':preview['date'],'message':preview['message'],'tag_name':tag['name'],'new_tag':tag['name'],'tag_description':tag['description'],'_dispatch':lambda:None}

    def test_modifie_metadonnees_tags_et_preserve_fichiers_index_autre_branche(self):
        index=(self.root/'.git/index').read_bytes();tree=self.git('rev-parse','HEAD^{tree}')
        data=self.draft();data.update(author='Nouvel auteur',email='nouveau@example.invalid',date='2026-11-18T17:00:00+01:00',message='Nouveau message\nDétail du commit\n',new_tag='renomme',tag_description='Description distincte du tag\n')
        result=m._edit(self.project,data)
        self.assertEqual(result['rewritten'],2)
        current=m.preview(self.project,result['commit'],result['head'])
        self.assertEqual(current['author'],'Nouvel auteur');self.assertEqual(current['message'],data['message']);self.assertEqual(current['date'],data['date'])
        self.assertEqual(current['tags'],[{'name':'renomme','description':'Description distincte du tag\n'}])
        self.assertEqual(self.git('rev-parse','HEAD^{tree}'),tree)
        self.assertEqual(self.git('rev-parse','autre').strip(),self.head)
        self.assertEqual(self.git('rev-parse','fin^{commit}').strip(),result['head'])
        self.assertEqual((self.root/'.git/index').read_bytes(),index)
        self.assertEqual((self.root/'file.txt').read_text(),'travail non indexé\n')
        self.assertEqual((self.root/'libre.txt').read_text(),'non suivi\n')

    def test_description_de_tag_seule_ne_reecrit_pas_les_commits(self):
        data=self.draft(self.head);data['tag_description']='Nouvelle description de tag\n'
        result=m._edit(self.project,data)
        self.assertEqual(result['head'],self.head);self.assertEqual(result['rewritten'],0)
        self.assertEqual(m.preview(self.project,self.head)['tags'][0]['description'],data['tag_description'])

    def test_enregistrement_sans_changement_ne_deplace_aucune_reference(self):
        before=self.git('show-ref')
        for commit in [self.first,self.head]:
            result=m._edit(self.project,self.draft(commit))
            self.assertEqual(result['rewritten'],0);self.assertEqual(result['tags_changed'],0)
            self.assertEqual(self.git('show-ref'),before)

    def test_refuse_tag_concurrent_ou_nom_deja_pris(self):
        data=self.draft();self.git('tag','nouveau',self.head)
        with self.assertRaises(Refused):m._edit(self.project,data)
        self.assertEqual(self.git('rev-parse','HEAD').strip(),self.head)
        data=self.draft();data['new_tag']='fin'
        with self.assertRaises(Refused):m._edit(self.project,data)

    def test_dates_et_signatures_protegees(self):
        with self.assertRaises(Refused):m.author_line('Auteur','test@example.invalid','2026-11-18T17:00:00')
        raw=b'tree '+b'a'*40+b'\nauthor A <a@example.invalid> 1600000000 +0000\ncommitter A <a@example.invalid> 1600000000 +0000\ngpgsig signature\n\nMessage\n'
        with self.assertRaises(Refused):m.rewrite(raw,[],message=b'Autre message\n')

    def test_requete_inconnue_non_rejouee_et_recu_non_altere(self):
        data=self.draft();data.pop('_dispatch')
        fingerprint=hashlib.sha256(__import__('json').dumps(data,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
        row=types.SimpleNamespace(value={'state':'RUNNING','fingerprint':fingerprint},save=MagicMock())
        configuration=MagicMock();configuration.objects.filter.return_value.first.return_value=row
        with patch.object(m,'Configuration',configuration),patch.object(m,'connection',types.SimpleNamespace(cursor=MagicMock())),patch.object(m,'_edit') as effect:
            with self.assertRaises(Refused):m.edit('fixture',data)
        effect.assert_not_called();row.save.assert_not_called()

    def new_commit(self,**fields):
        from cab_platform import project_git
        self.project.public_metadata={'values':{'GIT_USER_NAME':'Identité projet','GIT_USER_EMAIL':'projet@example.invalid','PROJECT_VERSION':'0.0.1'}}
        projects=MagicMock();projects.objects.get.return_value=self.project
        reservations=MagicMock();reservations.objects.filter.return_value.exists.return_value=True
        with patch.object(project_git,'Project',projects),patch.object(project_git,'commit_progress'),patch.object(project_git,'_refresh_status'),patch('cab_platform.core.models.GitFileReservation',reservations),patch('django.db.connection',types.SimpleNamespace(cursor=MagicMock())):
            return project_git.commit_local('fixture',**fields)

    def test_indexation_web_des_fichiers_suivis_reserves(self):
        from cab_platform import git_stage_modified as stage
        projects = MagicMock()
        projects.objects.get.return_value = self.project
        reservations = MagicMock()
        reservations.objects.filter.return_value.exists.return_value = True
        _, digest = stage.preview(self.project)
        with patch.object(stage, 'Project', projects), patch.object(stage, 'connection', types.SimpleNamespace(cursor=MagicMock())), patch.object(stage, '_refresh_status'), patch('cab_platform.core.models.GitFileReservation', reservations):
            self.assertEqual(stage.stage('fixture', digest), {'staged': 1})
        self.assertEqual(self.git('show', ':file.txt'), 'travail non indexé\n')
        self.assertEqual(self.git('ls-files', '--', 'libre.txt'), '')

    def test_futur_commit_applique_auteur_date_et_description_du_tag_distincte(self):
        output=[]
        result=self.new_commit(tag='futur',description='Message du futur commit',author='Auteur choisi',email='auteur@example.invalid',date='2026-11-18T17:00:00+01:00',tag_description='Description distincte du tag',console=output.append)
        self.assertTrue(result['created'])
        self.assertEqual(self.git('show','-s','--format=%an|%ae|%aI|%cI|%s','HEAD').strip(),'Auteur choisi|auteur@example.invalid|2026-11-18T17:00:00+01:00|2026-11-18T17:00:00+01:00|Message du futur commit')
        head=self.git('rev-parse','HEAD').strip()
        self.assertEqual(m.preview(self.project,head)['tags'][0]['description'].strip(),'Description distincte du tag')
        self.assertTrue(any('$ git commit' in line for line in output))
        self.assertEqual(self.git('config','user.name').strip(),'Identité projet')
        (self.root/'file.txt').write_text('Commit avec description de tag vide\n')
        self.assertTrue(self.new_commit(tag='description-vide',description='Autre message',tag_description='')['created'])
        head=self.git('rev-parse','HEAD').strip()
        self.assertEqual(m.preview(self.project,head)['tags'][0]['description'].strip(),'')

    def test_futur_commit_confirme_tag_existant_avant_indexation(self):
        original=(self.root/'.git/index').read_bytes()
        conflict=self.new_commit(tag='fin',description='Nouveau commit',tag_description='Nouveau texte du tag')
        self.assertFalse(conflict['created']);self.assertIn('tag_conflict',conflict)
        self.assertEqual((self.root/'.git/index').read_bytes(),original)
        result=self.new_commit(tag='fin',description='Nouveau commit',expected_tag=conflict['tag_conflict'],tag_description='Nouveau texte du tag')
        self.assertTrue(result['created'])
        head=self.git('rev-parse','HEAD').strip()
        self.assertEqual(self.git('rev-parse','fin^{commit}').strip(),head)
        self.assertEqual(m.preview(self.project,head)['tags'][0]['description'].strip(),'Nouveau texte du tag')

    def test_liberation_exige_des_fichiers_identiques_a_index_de_session(self):
        from cab_platform.session_git import verify_releasable_index
        index=str(self.root/'.git/index')
        with self.assertRaises(Refused):verify_releasable_index(self.project,index,['file.txt'])
        self.git('add','file.txt')
        with self.assertRaises(Refused):verify_releasable_index(self.project,index,['file.txt','libre.txt'])
        self.git('add','libre.txt')
        digest=verify_releasable_index(self.project,index,['file.txt','libre.txt'])
        self.assertEqual(digest,hashlib.sha256(Path(index).read_bytes()).hexdigest())
        (self.root/'file.txt').write_text('Modification postérieure à la validation\n')
        with self.assertRaises(Refused):verify_releasable_index(self.project,index,['file.txt'])


if __name__=='__main__':unittest.main(verbosity=2)
