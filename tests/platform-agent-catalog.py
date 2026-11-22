"""Qualification du catalogue avec migration et persistance PostgreSQL isolées."""
import os
from pathlib import Path
from subprocess import DEVNULL, run
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
from datetime import timedelta

if sys.executable != '/usr/bin/python3.13':
    os.execv('/usr/bin/python3.13', ['/usr/bin/python3.13', __file__])

sys.path[:0] = [str(Path(__file__).resolve().parents[1] / 'src'), '/usr/lib/cab/python-vendor']
import django
from django.conf import settings
from django.db import connection
from django.db.migrations.loader import MigrationLoader
from django.utils import timezone

PG = Path('/usr/lib/postgresql/17/bin')
OPEN_CODE = {'data': [{'id': 'sample', 'name': 'Go model', 'limit': {'context': 1000000},
                       'cost': {'text': {'input': {'price': 0.15}}}, 'capabilities': {'tools': True}}]}
OPEN_ROUTER = {'data': [{'id': 'lab/sample', 'name': 'Router model', 'context_length': 100,
                         'pricing': {'prompt': '0.00000125'}, 'top_provider': {'max_completion_tokens': 25}}]}
REFERENCE = {'opencode-go': {'models': {'sample': {'id': 'sample', 'name': 'Other label',
             'limit': {'context': 10, 'output': 10}, 'cost': {'input': 2}, 'family': 'demo'}}}}


class CatalogTests(unittest.TestCase):
    def setUp(self):
        from cab_platform.core.models import AgentApiKey, AgentModel, AgentProvider
        AgentApiKey.objects.all().delete()
        AgentModel.objects.all().delete()
        AgentProvider.objects.all().delete()

    def test_catalog_import_and_enrichment(self):
        from cab_platform import agent_catalog as catalog
        from cab_platform.core.models import AgentModel, AgentProvider
        with patch.object(catalog, 'fetch', side_effect=[OPEN_CODE, OPEN_ROUTER]):
            go = catalog.add_provider('Go', 'https://opencode.ai/zen/go/v1', 'https://opencode.ai/zen/go/v1/models')
            router = catalog.add_provider('Router', 'https://openrouter.ai/api/v1', 'https://openrouter.ai/api/v1/models')
        row = AgentModel.objects.get(provider_id=go['id'])
        self.assertEqual(row.source, OPEN_CODE['data'][0])
        self.assertEqual(row.details['summary']['input_cost'], 0.15)
        provider = AgentProvider.objects.get(pk=go['id'])
        self.assertLessEqual(provider.refresh_after - provider.refreshed_at, timedelta(hours=24, seconds=1))
        self.assertGreaterEqual(provider.refresh_after - provider.refreshed_at, timedelta(hours=18))
        now = timezone.now()
        with patch.object(catalog, '_reference_due', None), patch.object(catalog, '_reference', None):
            with patch.object(catalog, 'fetch', return_value=REFERENCE) as fetch:
                catalog.refresh_reference()
                catalog.refresh_reference()
                fetch.assert_called_once_with(catalog.MODELS_DEV_URL)
            self.assertLessEqual(catalog._reference_due-now, timedelta(hours=24, seconds=1))
        row.refresh_from_db()
        self.assertEqual(row.details['summary']['context'], 1_000_000)
        self.assertEqual(row.details['summary']['output'], 10)
        self.assertEqual(row.details['summary']['name'], 'Go model')
        self.assertEqual(row.details['metadata']['family'], 'demo')
        self.assertEqual(row.details['metadata']['capabilities'], {'tools': True})
        router_model = AgentModel.objects.get(provider_id=router['id'])
        self.assertEqual(router_model.details['summary']['input_cost'], '1.25000000')
        self.assertEqual(router_model.details['summary']['output'], 25)
        self.assertEqual(len(catalog.models()), 2)

    def test_failed_refresh_keeps_last_valid_catalog(self):
        from cab_platform import agent_catalog as catalog
        from cab_platform.core.models import AgentModel, AgentProvider
        with patch.object(catalog, 'fetch', return_value=OPEN_CODE):
            provider = catalog.add_provider('Demo', 'https://example.org', 'https://example.org/models')
        AgentProvider.objects.filter(pk=provider['id']).update(refresh_after=timezone.now())
        with patch.object(catalog, 'refresh_reference'), patch.object(catalog, 'fetch', return_value={'data': []}):
            catalog.refresh()
        self.assertEqual(AgentModel.objects.get(provider_id=provider['id']).identifier, 'sample')
        self.assertGreater(AgentProvider.objects.get(pk=provider['id']).refresh_after, timezone.now())

    def test_api_key_fail_closed_and_metadata_only(self):
        from cab_platform import agent_catalog as catalog
        from cab_platform.core.models import AgentApiKey
        provider = catalog.add_provider('Demo', 'https://example.org/v1', '')
        with patch.object(catalog, 'crypt_credential', side_effect=catalog.Refused('tpm', 503)):
            with self.assertRaises(catalog.Refused):
                catalog.add_key(provider['id'], 'fixture-key')
        self.assertFalse(AgentApiKey.objects.exists())
        with patch.object(catalog, 'crypt_credential', return_value=b'fixture-ciphertext') as encrypt:
            key_id = catalog.add_key(provider['id'], 'fixture-key')['id']
        encrypt.assert_called_once_with('cab-agent-api-' + key_id.hex, b'fixture-key',
                                        failure='agent-api-key-tpm-unavailable')
        self.assertEqual(AgentApiKey.objects.get(pk=key_id).ciphertext, 'fixture-ciphertext')
        self.assertEqual(catalog.keys(), [{'id': key_id, 'provider': 'Demo',
                                         'day': None, 'week': None, 'month': None, 'credits': None}])
        self.assertEqual(catalog.remove_key(key_id), {'removed': True})
        self.assertFalse(AgentApiKey.objects.exists())

    def test_public_fetch_rejects_private_addresses_and_redirects(self):
        from cab_platform import agent_catalog as catalog
        with patch.object(catalog.socket, 'getaddrinfo',
                          return_value=[(0, 0, 0, '', ('127.0.0.1', 443))]):
            with patch.object(catalog.socket, 'create_connection') as connect:
                with self.assertRaises(catalog.Refused):
                    catalog.fetch('https://example.org/models')
                connect.assert_not_called()
        with self.assertRaises(catalog.Refused):
            catalog.fetch('https://secret@example.org/models')
        with patch.object(catalog, 'public_address', return_value='93.184.216.34'):
            with patch.object(catalog.socket, 'create_connection'), patch.object(catalog.ssl, 'create_default_context'):
                with patch.object(catalog.client, 'HTTPSConnection') as connection_class:
                    response = connection_class.return_value.getresponse.return_value.__enter__.return_value
                    response.status = 302
                    with self.assertRaises(catalog.Refused):
                        catalog.fetch('https://example.org/models')
                    connection_class.assert_called_once()
                    response.read1.assert_not_called()


def command(*args):
    run([str(PG / args[0]), *args[1:]], check=True, stdout=DEVNULL)


if __name__ == '__main__':
    with TemporaryDirectory(prefix='cab-pg-catalog-') as directory:
        pgdata = str(Path(directory) / 'db')
        command('initdb', '-D', pgdata, '-A', 'trust', '-U', 'catalog', '--no-sync', '--locale=C')
        command('pg_ctl', '-D', pgdata, '-l', str(Path(directory) / 'postgres.log'),
                '-o', f"-k {directory} -c listen_addresses='' -c fsync=off", '-w', 'start')
        try:
            settings.configure(SECRET_KEY='fixture', INSTALLED_APPS=['cab_platform.core'], DATABASES={
                'default': {'ENGINE': 'django.db.backends.postgresql', 'NAME': 'postgres',
                            'USER': 'catalog', 'HOST': directory}
            })
            django.setup()
            loader = MigrationLoader(connection)
            target = ('cab_core', '0055_agent_catalog')
            initial = loader.project_state([('cab_core', '0054_resource_reservations')])
            migration = loader.get_migration(*target)
            with connection.schema_editor() as schema_editor:
                migration.apply(initial.clone(), schema_editor)
            result = unittest.main(exit=False).result
            with connection.schema_editor() as schema_editor:
                migration.unapply(initial, schema_editor)
            assert 'agent_models' not in connection.introspection.table_names()
        finally:
            connection.close()
            command('pg_ctl', '-D', pgdata, '-m', 'immediate', '-w', 'stop')
    raise SystemExit(0 if result.wasSuccessful() else 1)
