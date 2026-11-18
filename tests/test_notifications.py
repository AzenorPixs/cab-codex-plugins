"""Contrôles ciblés ; CAB_NOTIFICATIONS_LIVE=1 utilise PG avec rollback intégral."""
import os
import sys
import types
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0,os.environ.get('CAB_TEST_SOURCE',str(Path(__file__).resolve().parents[1]/'src')))
LIVE=os.environ.get('CAB_NOTIFICATIONS_LIVE')=='1'
if LIVE:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
else:
    from django.conf import settings
    settings.configure(SECRET_KEY='fixture',INSTALLED_APPS=['cab_platform.core'],DATABASES={'default':{'ENGINE':'django.db.backends.dummy'}})
import django
django.setup()
from cab_platform import notifications as n
from cab_platform.core.commands import Refused
from cab_platform import session_delivery as delivery
from test_terminal_git import TerminalGitTests,TerminalVersionTests


class ContractTests(unittest.TestCase):
    def test_version_choisie_par_le_codeur_direct_ou_orchestrateur_pilote(self):
        coder=types.SimpleNamespace(pk='coder',active=True)
        orchestrator=types.SimpleNamespace(pk='orchestrator',active=True)
        run=types.SimpleNamespace(actor_id='coder',mode='direct',mandate={'orchestrator_id':'orchestrator'})
        self.assertEqual(delivery.version_authority(coder,run),'coder')
        with self.assertRaises(Refused):delivery.version_authority(orchestrator,run)
        run.mode='piloted'
        self.assertEqual(delivery.version_authority(orchestrator,run),'orchestrator')
        with self.assertRaises(Refused):delivery.version_authority(coder,run)

    def test_codeur_pilote_ne_peut_pas_livrer_une_version_non_declaree(self):
        from unittest.mock import MagicMock
        run=types.SimpleNamespace(mode='piloted',mandate={'orchestrator_id':'orchestrator'})
        events=MagicMock();events.objects.filter.return_value.order_by.return_value.first.return_value=None
        deliveries=MagicMock();deliveries.objects.filter.return_value.first.return_value=None
        with patch('cab_platform.core.models.Event',events),patch('cab_platform.core.models.GitDelivery',deliveries),patch.object(delivery,'preflight_commit') as commit:
            with self.assertRaises(Refused):delivery.start_delivery(object(),run,'3.2.18',None)
        commit.assert_not_called()

    def test_codeur_pilote_utilise_exactement_le_choix_de_son_orchestrateur(self):
        from unittest.mock import MagicMock
        run=types.SimpleNamespace(mode='piloted',mandate={'orchestrator_id':'orchestrator'})
        selected={'version':'3.2.18','authority':'orchestrator'}
        events=MagicMock();events.objects.filter.return_value.order_by.return_value.first.return_value=types.SimpleNamespace(data=selected)
        with patch('cab_platform.core.models.Event',events):
            self.assertEqual(delivery.delivery_version_selection(object(),run,'3.2.18'),selected)
            with self.assertRaises(Refused):delivery.delivery_version_selection(object(),run,'3.2.19')

    def test_politique_lit_le_versionnement_du_projet_sans_demander_au_developpeur(self):
        run=types.SimpleNamespace(mode='direct',actor_id='coder',project=types.SimpleNamespace(root='/fixture'))
        with patch('cab_platform.project_metadata.read_metadata',return_value={'values':{'PROJECT_VERSION':'1.2.3.4'}}):
            policy=delivery.version_policy(run)
        self.assertEqual(policy['numeric_components'],4)
        self.assertEqual(policy['selected_by'],'coding-agent')
        self.assertFalse(policy['ask_developer_when_missing'])

    def test_question_choix_uniques(self):
        choices=[{'id':'yes','label':'Oui'},{'id':'no','label':'Non'}]
        self.assertEqual(len(n.validated('Question','Contenu','question',choices)),64)
        with self.assertRaises(Refused):n.validated('Question','Contenu','question',[choices[0],choices[0]])

    def test_message_ne_porte_pas_de_commande(self):
        with self.assertRaises(Refused):n.validated('Message','Contenu','message',[{'id':'run','label':'Exécuter'}])
        with self.assertRaises(Refused):n.validated('Question','Contenu','question',[{'id':'a','label':'A','command':'false'},{'id':'b','label':'B'}])

    def test_acces_admin_uniquement(self):
        with self.assertRaises(Refused):n.administrator(types.SimpleNamespace(active=True,role='coder'))
        with self.assertRaises(Refused):n.administrator(types.SimpleNamespace(active=False,role='admin'))

    def test_cle_stable(self):
        self.assertEqual(n.identifier('a'),n.identifier('a'))
        self.assertNotEqual(n.identifier('a'),n.identifier('b'))

    def test_resultat_de_livraison_distinct_de_son_avancement(self):
        delivery=types.SimpleNamespace(pk=17,project=object(),version='3.2.18')
        view={'state':'RUNNING','steps':[{'key':'release:GITHUB','state':'SKIPPED','receipt':{'reason':'developer-deferred'}}]}
        with patch.object(n,'publish') as publish:
            n.delivery_notification(delivery,view)
            progress=publish.call_args
            n.delivery_notification(delivery,{**view,'state':'COMPLETED'})
            terminal=publish.call_args
        self.assertNotEqual(progress.args[0],terminal.args[0])
        self.assertIs(terminal.kwargs['project'],delivery.project)
        self.assertIn('report demandé',terminal.kwargs['body'])


@unittest.skipUnless(LIVE,'PG réel réservé au contrôle hôte explicite')
class PersistenceTests(unittest.TestCase):
    def setUp(self):
        from django.db import transaction
        from cab_platform.core.models import Actor,Project
        self.atomic=transaction.atomic();self.atomic.__enter__()
        self.addCleanup(lambda:self.atomic.__exit__(None,None,None))
        self.addCleanup(lambda:transaction.set_rollback(True))
        self.actor=Actor.objects.filter(role='admin',active=True).first()
        self.project=Project.objects.get(root='/home/devops/datas/cab')
        self.key='fixture-notifications-'+uuid.uuid4().hex

    def test_message_lu_purge_et_republication_ne_le_recree_pas(self):
        row=n.publish(self.key,title='Contrôle',body='Message temporaire',project=self.project)
        self.assertEqual(row['sender'],self.project.name or self.project.public_metadata['values']['PROJECT_NAME'])
        receipt=n.read(self.actor,row['id'])
        self.assertEqual(receipt['state'],'READ')
        self.assertFalse(n.Notification.objects.filter(pk=row['id']).exists())
        self.assertEqual(n.publish(self.key,title='Contrôle',body='Message temporaire',project=self.project)['state'],'READ')

    def test_question_reste_apres_lecture_et_reponse_est_idempotente(self):
        row=n.publish(self.key,title='Question',body='Choisir',kind='question',choices=[{'id':'a','label':'A'},{'id':'b','label':'B'}])
        self.assertEqual(row['sender'],'CAB')
        n.read(self.actor,row['id'])
        self.assertIsNotNone(n.Notification.objects.get(pk=row['id']).read_at)
        with self.assertRaises(Refused):n.answer(self.actor,row['id'],'inconnu')
        first=n.answer(self.actor,row['id'],'a')
        self.assertEqual(first,n.answer(self.actor,row['id'],'a'))
        with self.assertRaises(Refused):n.answer(self.actor,row['id'],'b')
        self.assertFalse(n.Notification.objects.filter(pk=row['id']).exists())

    def test_question_ne_change_pas_apres_publication(self):
        choices=[{'id':'a','label':'A'},{'id':'b','label':'B'}]
        n.publish(self.key,title='Question',body='Choisir',kind='question',choices=choices)
        with self.assertRaises(Refused):n.publish(self.key,title='Question',body='Autre question',kind='question',choices=choices)


if __name__=='__main__':unittest.main(verbosity=2)
