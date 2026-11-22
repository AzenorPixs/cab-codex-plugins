"""Qualification du catalogue avec migration et persistance PostgreSQL isolées."""
import os
from pathlib import Path
from subprocess import DEVNULL, run
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
from datetime import timedelta
from decimal import Decimal

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
        from cab_platform.core.models import AgentApiKey, AgentModel, AgentModelPolicy, AgentProvider
        AgentModelPolicy.objects.all().delete()
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

    def test_provider_removal_protects_keys_and_survives_refresh(self):
        from cab_platform import agent_catalog as catalog
        from cab_platform.core.models import AgentApiKey, AgentModel, AgentProvider
        with patch.object(catalog, 'fetch', return_value=OPEN_CODE):
            provider = catalog.add_provider('Demo', 'https://example.org', 'https://example.org/models')
        identifier = provider['id']
        with patch.object(catalog, 'crypt_credential', return_value=b'fixture-ciphertext'):
            key = catalog.add_key(identifier, 'fixture-key')
        with self.assertRaises(catalog.Refused) as error:
            catalog.remove_provider(identifier)
        self.assertEqual(error.exception.code, 'agent-provider-keys-linked')
        self.assertTrue(AgentApiKey.objects.filter(pk=key['id']).exists())
        self.assertTrue(AgentModel.objects.filter(provider_id=identifier).exists())
        catalog.remove_key(key['id'])
        AgentProvider.objects.filter(pk=identifier).update(refresh_after=timezone.now())
        def remove_during_fetch(_):
            self.assertEqual(catalog.remove_provider(identifier), {'removed': True})
            return OPEN_CODE
        with patch.object(catalog, 'refresh_reference'), patch.object(catalog, 'fetch', side_effect=remove_during_fetch):
            catalog.refresh()
        self.assertFalse(AgentProvider.objects.filter(pk=identifier).exists())
        self.assertFalse(AgentModel.objects.filter(provider_id=identifier).exists())

    def test_cache_prices_preserve_zero_shortest_duration_and_legacy_models(self):
        from cab_platform import agent_catalog as catalog
        from cab_platform.core.models import AgentModel
        source = {'id': 'prices', 'cost': {'text': {'input': {'cache': {
            'read': 0, 'write': {'12h': 0.5, '30m': 0.25},
        }}}}}
        reference = {'prices': {'cost': {'cache_read': 4, 'cache_write': 5}}}
        details = catalog.model_details('prices', source, reference)
        expected = {'cache_read_cost': 0, 'cache_write_cost': 0.25, 'cache_write_duration': '30m'}
        self.assertEqual({key: details['summary'][key] for key in expected}, expected)
        priced = catalog.cache_prices({'pricing': {'input_cache_read': '0.00000025', 'input_cache_write': '0.0000015'}})
        self.assertEqual(Decimal(priced['cache_read_cost']), Decimal('.25'))
        self.assertEqual(Decimal(priced['cache_write_cost']), Decimal('1.5'))
        provider = catalog.add_provider('Demo', 'https://example.org', '')
        legacy = {'summary': catalog.normalize(source), 'metadata': details['metadata']}
        AgentModel.objects.create(provider_id=provider['id'], identifier='prices', source=source, details=legacy)
        row, = catalog.models()
        self.assertEqual({key: row[key] for key in expected}, expected)

    def test_policy_crud_filters_inclusively_and_excludes_unknowns(self):
        from cab_platform import agent_catalog as catalog, model_policies as rules
        from cab_platform.core.models import AgentModel, AgentModelPolicy
        provider = catalog.add_provider('Demo', 'https://example.org', '')
        base = {'context': 500_000, 'output': 64_000, 'input_cost': '1.25', 'output_cost': 2,
                'cache_read_cost': .1, 'cache_write_cost': .3}
        summaries = {
            'paid': base,
            'tagged:free': base,
            'zero': {**base, 'input_cost': '0', 'output_cost': 0},
            'partial': {**base, 'output_cost': None},
            'smaller': {**base, 'context': 262_144},
        }
        for identifier, summary in summaries.items():
            AgentModel.objects.create(provider_id=provider['id'], identifier=identifier, source={}, details={'summary': summary})
        values = {'name': ' Démo ', 'include_free': False, 'include_paid': True, 'context_min': 500_000,
                  'output_min': 64_000, **dict.fromkeys(rules.PRICE_FIELDS, Decimal(0))}
        values.update(input_price_min=Decimal('1.25'), input_price_max=Decimal('1.25'),
                      output_price_min=Decimal(2), output_price_max=Decimal(2),
                      cache_read_max=Decimal('.1'), cache_write_min=Decimal('.3'))
        policy = rules.save_policy(None, values)
        self.assertEqual(policy['name'], 'Démo')
        self.assertEqual([row['identifier'] for row in catalog.models(policy['id'])], ['paid'])
        self.assertEqual(len(catalog.models()), 5)
        deliberately_invalid = [
            ({'name': 'Tous'}, 'agent-model-policy-name-invalid'),
            ({'context_min': 400_000}, 'agent-model-policy-slider-invalid'),
            ({'input_price_max': Decimal(1)}, 'agent-model-policy-bounds-invalid'),
        ]
        for fields, code in deliberately_invalid:
            with self.assertRaises(catalog.Refused) as error:
                rules.save_policy(policy['id'], {**values, **fields})
            self.assertEqual(error.exception.code, code)
        with self.assertRaises(catalog.Refused) as error:
            rules.save_policy(None, {**values, 'name': 'démo'})
        self.assertEqual(error.exception.code, 'agent-model-policy-duplicate')
        edited = {**values, **dict.fromkeys(rules.PRICE_FIELDS, Decimal(0)),
                  'name': 'Gratuits', 'include_free': True, 'include_paid': False}
        rules.save_policy(policy['id'], edited)
        self.assertEqual(rules.policy_list()[0]['name'], 'Gratuits')
        self.assertEqual([row['identifier'] for row in catalog.models(policy['id'])], ['zero', 'tagged:free'])
        self.assertEqual(rules.remove_policy(policy['id']), {'removed': True})
        self.assertFalse(AgentModelPolicy.objects.exists())
        with self.assertRaises(catalog.Refused):
            catalog.models(policy['id'])

    def test_excluded_display_names_and_complete_cache_bounds(self):
        from cab_platform import agent_catalog as catalog, model_policies as rules
        from cab_platform.core.models import AgentModel
        provider = catalog.add_provider('Démo', 'https://example.org', '')
        base = {'cache_read_cost': '.25', 'cache_write_cost': '.5'}
        samples = {
            'included': {**base, 'name': 'Standard'},
            'first': {**base, 'name': 'Modèle Éclair'},
            'second': {**base, 'name': 'Version bêta'},
            'eclair-hidden-id': {**base, 'name': 'Libellé distinct'},
            'beta-visible-id': base,
            'too-low': {**base, 'cache_read_cost': '.24'},
            'too-high': {**base, 'cache_write_cost': '.51'},
            'unknown': {**base, 'cache_read_cost': None},
        }
        for identifier, summary in samples.items():
            AgentModel.objects.create(provider_id=provider['id'], identifier=identifier, source={}, details={'summary': summary})
        values = {'name': 'Filtrée', 'include_free': True, 'include_paid': True,
                  'context_min': 0, 'output_min': 0, **dict.fromkeys(rules.PRICE_FIELDS, Decimal(0)),
                  'model_filter': ' ECLAIR ; ; beta; '}
        values.update(cache_read_min=Decimal('.25'), cache_read_max=Decimal('.25'),
                      cache_write_min=Decimal('.5'), cache_write_max=Decimal('.5'))
        saved = rules.save_policy(None, values)
        self.assertEqual(saved['model_filter'], 'ECLAIR ; ; beta;')
        self.assertEqual([row['identifier'] for row in catalog.models(saved['id'])], ['eclair-hidden-id', 'included'])
        self.assertEqual(len(catalog.models()), len(samples))
        for field, value in [('cache_read_min', '.26'), ('cache_write_max', '.49')]:
            with self.assertRaises(catalog.Refused) as error:
                rules.save_policy(saved['id'], {**values, field: Decimal(value)})
            self.assertEqual(error.exception.code, 'agent-model-policy-bounds-invalid')
        cleared = rules.save_policy(saved['id'], {**values, 'model_filter': ''})
        self.assertEqual(cleared['model_filter'], '')
        self.assertEqual(len(catalog.models(saved['id'])), 5)

    def test_policy_sort_is_persisted_numeric_stable_and_missing_last(self):
        from cab_platform import agent_catalog as catalog, model_policies as rules
        from cab_platform.core.models import AgentModel
        provider = catalog.add_provider('Demo', 'https://example.org', '')
        summaries = {
            'a': {'input_cost': '10', 'output_cost': '1', 'cache_read_cost': '.5', 'cache_write_cost': '3'},
            'b': {'input_cost': 0, 'output_cost': '10', 'cache_read_cost': '.2', 'cache_write_cost': None},
            'c': {'input_cost': '2', 'output_cost': '2', 'cache_read_cost': '.5', 'cache_write_cost': '12'},
            'd': {'input_cost': None, 'output_cost': None, 'cache_read_cost': None, 'cache_write_cost': '5'},
        }
        for identifier, summary in summaries.items():
            AgentModel.objects.create(provider_id=provider['id'], identifier=identifier, source={}, details={'summary': summary})
        values = {'name': 'Tri', 'include_free': True, 'include_paid': True, 'context_min': 0, 'output_min': 0,
                  **dict.fromkeys(rules.PRICE_FIELDS, Decimal(0))}
        policy = rules.save_policy(None, values)
        self.assertEqual((policy['sort_column'], policy['sort_descending']), ('input_cost', False))
        self.assertEqual([row['identifier'] for row in catalog.models(policy['id'])], ['b', 'c', 'a', 'd'])
        situations = [
            ('input_cost', True, ['a', 'c', 'b', 'd']),
            ('output_cost', False, ['a', 'c', 'b', 'd']),
            ('cache_read_cost', True, ['a', 'c', 'b', 'd']),
            ('cache_write_cost', False, ['a', 'd', 'c', 'b']),
        ]
        for column, descending, expected in situations:
            with self.subTest(column=column, descending=descending):
                rules.save_policy(policy['id'], {**values, 'sort_column': column, 'sort_descending': descending})
                reloaded, = rules.policy_list()
                self.assertEqual((reloaded['sort_column'], reloaded['sort_descending']), (column, descending))
                self.assertEqual([row['identifier'] for row in catalog.models(policy['id'])], expected)


def command(*args):
    run([str(PG / args[0]), *args[1:]], check=True, stdout=DEVNULL)


if __name__ == '__main__':
    with TemporaryDirectory(prefix='cab-pg-catalog-') as directory:
        pgdata = str(Path(directory) / 'db')
        command('initdb', '-D', pgdata, '-A', 'trust', '-U', 'catalog', '--no-sync', '--locale=C', '--encoding=UTF8')
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
                catalog_state = migration.apply(initial.clone(), schema_editor)
            policy_migration = loader.get_migration('cab_core', '0056_agent_model_policy')
            with connection.schema_editor() as schema_editor:
                policy_state = policy_migration.apply(catalog_state.clone(), schema_editor)
            legacy_model = policy_state.apps.get_model('cab_core', 'AgentModelPolicy')
            legacy = legacy_model.objects.create(name='Politique 3.15.0', cache_read_max=Decimal('.2'), cache_write_min=Decimal('.3'))
            controls_migration = loader.get_migration('cab_core', '0057_model_policy_controls')
            with connection.schema_editor() as schema_editor:
                controls_state = controls_migration.apply(policy_state.clone(), schema_editor)
            sort_migration = loader.get_migration('cab_core', '0058_model_policy_sort')
            with connection.schema_editor() as schema_editor:
                sort_migration.apply(controls_state.clone(), schema_editor)
            from cab_platform.core.models import AgentModelPolicy
            upgraded = AgentModelPolicy.objects.get(pk=legacy.pk)
            assert (upgraded.cache_read_max, upgraded.cache_write_min) == (Decimal('.2'), Decimal('.3'))
            assert (upgraded.model_filter, upgraded.cache_read_min, upgraded.cache_write_max) == ('', 0, 0)
            assert (upgraded.sort_column, upgraded.sort_descending) == ('input_cost', False)
            result = unittest.main(exit=False).result
            with connection.schema_editor() as schema_editor:
                sort_migration.unapply(controls_state, schema_editor)
                controls_migration.unapply(policy_state, schema_editor)
                policy_migration.unapply(catalog_state, schema_editor)
                migration.unapply(initial, schema_editor)
            assert not {'agent_models', 'agent_model_policies'}.intersection(connection.introspection.table_names())
        finally:
            connection.close()
            command('pg_ctl', '-D', pgdata, '-m', 'immediate', '-w', 'stop')
    raise SystemExit(0 if result.wasSuccessful() else 1)
