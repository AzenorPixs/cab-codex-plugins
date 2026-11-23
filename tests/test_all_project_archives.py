"""Pagination et portée des archives, sans création ni suppression de sessions."""
import os
import subprocess
import sys
import types
import unittest
from datetime import datetime,timedelta,timezone
from pathlib import Path
from unittest.mock import MagicMock,patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,os.environ.get('CAB_TEST_SOURCE',str(ROOT/'src')))
from test_all_project_sessions import GlobalSessionScopeTests
from test_host_completion import HostCompletionPolicyTests
from django.db.models import Q

from cab_platform import archive_listing as listing,web_views as views
from cab_platform.core.commands import Refused


class Rows(list):
    def count(self):return len(self)
    def select_related(self,*args):return self
    def filter(self,search):
        def matches(row,clause):
            if isinstance(clause,Q):
                return any(matches(row,child) for child in clause.children)
            lookup,term=clause
            value=row
            for key in lookup.split('__')[:-1]:
                value=getattr(value,key,None)
            return term.lower() in str(value or '').lower()
        return Rows(row for row in self if matches(row,search))
    def order_by(self,*args):return Rows(sorted(self,key=lambda row:(row.created,row.pk),reverse=True))

class Membership:
    def __init__(self,ids):self.ids=ids
    def all(self):return [types.SimpleNamespace(pk=key) for key in self.ids]
    def filter(self,pk):return types.SimpleNamespace(exists=lambda:pk in self.ids)
    def values_list(self,*args,**kwargs):return self.ids


class ArchiveListingTests(unittest.TestCase):
    def setUp(self):
        start=datetime(2026,1,1,tzinfo=timezone.utc)
        self.rows=Rows(types.SimpleNamespace(pk=n,created=start+timedelta(seconds=n),run=types.SimpleNamespace(project_id='a' if n<36 else 'b',run_id='RUN-'+str(n))) for n in range(61))
        manager=MagicMock();manager.all.side_effect=lambda:Rows(self.rows)
        def filtered(**filters):
            ids={filters['run__project'].pk} if 'run__project' in filters else {p.pk for p in filters['run__project__in']}
            return Rows(row for row in self.rows if row.run.project_id in ids)
        manager.filter.side_effect=filtered
        projects=MagicMock();projects.objects.get.side_effect=lambda pk:types.SimpleNamespace(pk=pk)
        self.addCleanup(patch.stopall)
        patch.object(listing,'Project',projects).start()
        patch.object(listing,'SessionArchive',types.SimpleNamespace(objects=manager)).start()
        self.admin=types.SimpleNamespace(active=True,role='admin',projects=Membership([]))

    def test_10_archives_et_navigation_complete(self):
        pages=[listing.archive_page(self.admin,page=n) for n in range(1,8)]
        self.assertEqual([len(rows) for rows,meta in pages],[10,10,10,10,10,10,1])
        self.assertEqual(len({row.pk for rows,meta in pages for row in rows}),61)
        for n,(rows,meta) in enumerate(pages,1):
            self.assertEqual(meta['page'],n);self.assertEqual(meta['total'],61);self.assertEqual(meta['total_pages'],7)
            self.assertEqual(meta['has_next'],n<7)
        self.assertEqual(listing.archive_page(self.admin,page=999)[1]['page'],7)

    def test_acteur_limite_aux_archives_de_ses_projets(self):
        actor=types.SimpleNamespace(active=True,role='coder',projects=Membership(['a']))
        rows,meta=listing.archive_page(actor)
        self.assertEqual(meta['total'],36);self.assertEqual(meta['total_pages'],4)
        self.assertEqual({row.run.project_id for row in rows},{'a'})
        rows,meta=listing.archive_page(self.admin,'b')
        self.assertEqual(len(rows),10);self.assertEqual({row.run.project_id for row in rows},{'b'})

    def test_recherche_avant_pagination_et_apres_autorisation(self):
        actor=types.SimpleNamespace(active=True,role='coder',projects=Membership(['a']))
        rows,meta=listing.archive_page(actor,page=3,search='run- 12')
        self.assertEqual([row.run.run_id for row in rows],['RUN-12'])
        self.assertEqual((meta['page'],meta['total']), (1,1))
        rows,meta=listing.archive_page(actor,search='RUN-60')
        self.assertEqual(list(rows),[])
        self.assertEqual(meta['total'],0)

    def test_aucun_projet_autorise_retourne_une_page_vide(self):
        actor=types.SimpleNamespace(active=True,role='coder',projects=Membership([]))
        rows,meta=listing.archive_page(actor)
        self.assertEqual(len(rows),0);self.assertEqual(meta['total_pages'],1);self.assertFalse(meta['has_next'])

    def test_projet_interdit_acteur_inactif_et_page_invalide_refuses(self):
        actor=types.SimpleNamespace(active=True,role='coder',projects=Membership(['a']))
        with self.assertRaises(Refused):listing.archive_page(actor,'b')
        with self.assertRaises(Refused):listing.archive_page(types.SimpleNamespace(active=False,role='admin'))
        with self.assertRaises(Refused):listing.archive_page(self.admin,page=0)

    def test_flux_electric_des_archives_reste_scope_cote_serveur(self):
        helper=GlobalSessionScopeTests('test_administrateur_recoit_toutes_les_sessions_non_archivees')
        with patch.object(views,'sync_project_sessions',views.sync_project_archives):
            self.assertEqual(helper.shape(self.admin),'archived = true')
            actor=types.SimpleNamespace(active=True,role='coder',projects=Membership(['a']))
            self.assertEqual(helper.shape(actor),"archived = true AND project_id IN ('a')")


if __name__=='__main__':
    build='--build' in sys.argv
    if build:sys.argv.remove('--build')
    result=unittest.main(verbosity=2,exit=False).result
    if not result.wasSuccessful():raise SystemExit(1)
    if build:
        env={**os.environ,'PATH':'/home/devops/node/current/bin:/usr/bin:/bin'}
        raise SystemExit(subprocess.run(['/home/devops/node/current/bin/npm','run','build','--prefix',str(ROOT/'frontend')],env=env).returncode)
