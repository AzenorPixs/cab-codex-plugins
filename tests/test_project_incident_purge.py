"""Vérification ciblée sur PostgreSQL. Toutes les données de test sont annulées."""
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cab_platform.settings')

import django

django.setup()

from django.db import transaction
from django.test import RequestFactory

from cab_platform.core.commands import Refused
from cab_platform.core.models import Actor, Event, Incident, Project
from cab_platform.core.project_incidents import project_incidents, purge_project_incident, purge_revision


class IncidentPurgeTest(unittest.TestCase):
    def test_admin_purges_only_the_confirmed_resolved_incident(self):
        with transaction.atomic():
            project, other = list(Project.objects.order_by('pk')[:2])
            actor = Actor.objects.get(pk='system-admin')
            request = RequestFactory().post('/')
            token = uuid4().hex
            resolved = Incident.objects.create(pk=f'TEST-{token}', project=project, category='test',
                                               summary='Déclaration de test', state='RESOLVED')
            opened = Incident.objects.create(pk=f'TEST-OPEN-{token}', project=project, category='test',
                                             summary='Déclaration de test ouverte')
            with patch('cab_platform.core.project_incidents.principal', return_value=actor) as authorization:
                by_id = {row['incident_id']: row for row in project_incidents(request, project.pk)['incidents']}
                revision = by_id[resolved.pk]['purge_revision']
                self.assertEqual(revision, purge_revision(resolved))
                self.assertIsNone(by_id[opened.pk]['purge_revision'])
                with self.assertRaisesRegex(Refused, 'incident-not-found'):
                    purge_project_incident(request, other.pk, resolved.pk, revision)
                with self.assertRaisesRegex(Refused, 'incident-unresolved'):
                    purge_project_incident(request, project.pk, opened.pk, purge_revision(opened))
                with self.assertRaisesRegex(Refused, 'incident-snapshot-stale'):
                    purge_project_incident(request, project.pk, resolved.pk, '0' * 64)
                self.assertEqual(purge_project_incident(request, project.pk, resolved.pk, revision),
                                 {'status': 'PURGED_TREATED'})
                authorization.assert_called_with(request, admin=True)
                self.assertFalse(Incident.objects.filter(pk=f'TEST-{token}').exists())
                self.assertTrue(Incident.objects.filter(pk=opened.pk).exists())
                self.assertTrue(Event.objects.filter(project=project, kind='ccab-incident-purged',
                                                     data__incident_id=f'TEST-{token}').exists())
            transaction.set_rollback(True)


if __name__ == '__main__':
    unittest.main(verbosity=2)
