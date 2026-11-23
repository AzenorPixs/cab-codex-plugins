"""Qualification du catalogue avec migration et persistance PostgreSQL isolées."""
import json
import os
from pathlib import Path
from subprocess import DEVNULL, run
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
from datetime import timedelta
from decimal import Decimal
from hashlib import sha256
from uuid import uuid4

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
OPENAI_PRICES = b"""### Standard pricing data
| Model | Short context input | Short context output | Short context cached input | Short context 30m write | Short context 12h write |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gpt-fixture (<272K context length) | $2 | $10 | $0.10 | $2.50 | $5 | $4 | $30 | $0.20 | $5 | $10 |
### Batch pricing data
| Model | Input | Output | Cached input |
| gpt-fixture | $1 | $5 | $0.05 |
"""


class CatalogTests(unittest.TestCase):
    def setUp(self):
        from cab_platform import agent_catalog_files as files
        from cab_platform.core.models import AgentApiKey, AgentCatalogFile, AgentModel, AgentModelPolicy, AgentProvider
        AgentModelPolicy.objects.all().delete()
        AgentApiKey.objects.all().delete()
        AgentModel.objects.all().delete()
        AgentCatalogFile.objects.all().delete()
        AgentProvider.objects.all().delete()
        directory = TemporaryDirectory(prefix='cab-catalog-json-')
        self.addCleanup(directory.cleanup)
        state = patch.object(files, 'ROOT', Path(directory.name) / 'catalogs')
        state.start()
        self.addCleanup(state.stop)
        files.configure_completion('')

    def test_catalog_import_and_enrichment(self):
        from cab_platform import agent_catalog as catalog, agent_catalog_files as files
        from cab_platform.core.models import AgentCatalogFile, AgentModel
        go = catalog.add_provider('Go', 'https://opencode.ai/zen/go/v1', 'https://opencode.ai/zen/go/v1/models')
        router = catalog.add_provider('Router', 'https://openrouter.ai/api/v1', 'https://openrouter.ai/api/v1/models')
        self.assertFalse(AgentModel.objects.exists())
        contents = {
            go['models_url']: OPEN_CODE, router['models_url']: OPEN_ROUTER,
            catalog.MODELS_DEV_URL: REFERENCE,
        }
        files.configure_completion(catalog.MODELS_DEV_URL)
        with patch.object(catalog, 'download', side_effect=lambda url: json.dumps(contents[url]).encode()):
            files.refresh()
        row = AgentModel.objects.get(provider_id=go['id'])
        self.assertEqual(row.source, OPEN_CODE['data'][0])
        source = AgentCatalogFile.objects.get(provider_id=go['id'])
        self.assertEqual(source.refresh_after.date(), source.refreshed_at.date() + timedelta(days=1))
        self.assertEqual(row.details['summary']['input_cost'], 0.15)
        self.assertEqual(row.details['summary']['context'], 1_000_000)
        self.assertEqual(row.details['summary']['output'], 10)
        self.assertEqual(row.details['summary']['name'], 'Go model')
        self.assertEqual(row.details['metadata']['family'], 'demo')
        self.assertEqual(row.details['metadata']['capabilities'], {'tools': True})
        router_model = AgentModel.objects.get(provider_id=router['id'])
        self.assertEqual(router_model.details['summary']['input_cost'], '1.25000000')
        self.assertEqual(router_model.details['summary']['output'], 25)
        self.assertEqual(len(catalog.models()), 2)
        self.assertEqual(json.loads(files.preview(source.pk)), OPEN_CODE)

    def test_failed_refresh_keeps_last_valid_catalog(self):
        from cab_platform import agent_catalog as catalog, agent_catalog_files as files
        from cab_platform.core.models import AgentCatalogFile, AgentModel
        provider = catalog.add_provider('Demo', 'https://example.org', 'https://example.org/models')
        source = AgentCatalogFile.objects.get(provider_id=provider['id'])
        with patch.object(catalog, 'download', return_value=json.dumps(OPEN_CODE).encode()):
            files.refresh()
        files.request_download(source.pk)
        with patch.object(catalog, 'download', return_value=b'{"data":[]}'):
            files.refresh()
        self.assertEqual(AgentModel.objects.get(provider_id=provider['id']).identifier, 'sample')
        source.refresh_from_db()
        self.assertGreater(source.refresh_after, timezone.now())
        self.assertEqual(source.state, 'error')
        self.assertTrue(source.valid)
        self.assertEqual(json.loads(files.preview(source.pk)), OPEN_CODE)

    def test_checks_all_hashes_and_only_recalculates_changed_content(self):
        from cab_platform import agent_catalog as catalog, agent_catalog_files as files
        from cab_platform.core.models import AgentCatalogFile, AgentModel
        first = catalog.add_provider('Go', 'https://opencode.ai/zen/go/v1', 'https://opencode.ai/zen/go/v1/models')
        second = catalog.add_provider('Router', 'https://openrouter.ai/api/v1', 'https://openrouter.ai/api/v1/models')
        files.configure_completion(catalog.MODELS_DEV_URL)
        payloads = {first['models_url']:json.dumps(OPEN_CODE).encode(), second['models_url']:json.dumps(OPEN_ROUTER).encode(),
                    catalog.MODELS_DEV_URL:json.dumps(REFERENCE).encode()}
        with patch.object(catalog, 'download', side_effect=payloads.__getitem__) as download:
            files.refresh()
            source = AgentCatalogFile.objects.get(provider_id=first['id'])
            completion = AgentCatalogFile.objects.get(pk=files.COMPLETION)
            router = AgentCatalogFile.objects.get(provider_id=second['id'])
            self.assertTrue(all(item.valid and item.sha256 for item in (source, completion, router)))
            old_timestamp = source.refreshed_at
            files.request_scan()
            files.request_download(source.pk)
            with patch.object(catalog, 'save_catalog', wraps=catalog.save_catalog) as recalculate:
                with patch.object(files, 'update_models', wraps=files.update_models) as enrich:
                    files.refresh()
                    recalculate.assert_not_called()
                    enrich.assert_not_called()
            source.refresh_from_db()
            self.assertGreater(source.refreshed_at, old_timestamp)
            files.source_path(completion).unlink()
            with patch.object(files, 'update_models', wraps=files.update_models) as enrich:
                files.refresh()
                enrich.assert_not_called()
            self.assertTrue(files.source_path(completion).is_file())
            self.assertEqual(download.call_count, 5)

        revised = json.loads(payloads[catalog.MODELS_DEV_URL])
        revised['opencode-go']['models']['sample']['limit']['output'] = 15
        files.save_file(files.source_path(completion), json.dumps(revised).encode())
        order = []
        read = files.read_file
        enrich = files.update_models
        with patch.object(files, 'read_file', side_effect=lambda path:(order.append(path),read(path))[1]):
            with patch.object(files, 'update_models', side_effect=lambda provider,reference:(order.append('apply'),enrich(provider,reference))[1]):
                files.refresh()
        self.assertTrue({files.source_path(source),files.source_path(completion),files.source_path(router)}
                        .issubset(order[:order.index('apply')]))
        self.assertEqual(AgentModel.objects.get(provider_id=first['id']).details['summary']['output'], 15)
        edited = json.loads(payloads[first['models_url']])
        edited['data'][0]['name'] = 'Modèle révisé'
        raw = json.dumps(edited).encode()
        files.save_file(files.source_path(source), raw)
        with patch.object(catalog, 'save_catalog', wraps=catalog.save_catalog) as save:
            files.refresh()
            self.assertEqual(save.call_args.args[0].pk, first['id'])
            save.assert_called_once()
        source.refresh_from_db()
        router.refresh_from_db()
        self.assertEqual(source.sha256, sha256(raw).hexdigest())
        self.assertEqual(router.sha256, sha256(payloads[second['models_url']]).hexdigest())
        self.assertEqual(AgentModel.objects.get(provider_id=first['id']).details['summary']['name'], 'Modèle révisé')
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
        from cab_platform.core.models import AgentCatalogProjection
        projected = AgentCatalogProjection.objects.get(pk='key:'+str(key_id)).data
        self.assertEqual(set(projected), {'id', 'provider_id', 'day', 'week', 'month', 'credits',
            'valid', 'checked_at', 'refreshed_at', 'checking', 'queued', 'metrics', 'check_error', 'metrics_error'})
        self.assertNotIn('fixture-ciphertext', str(projected))
        self.assertEqual(catalog.keys(), [{**projected, 'provider': 'Demo'}])
        self.assertEqual(catalog.remove_key(key_id), {'removed': True})
        self.assertFalse(AgentApiKey.objects.exists())

    def test_provider_and_key_are_saved_atomically(self):
        from cab_platform import agent_catalog as catalog
        from cab_platform.core.models import AgentApiKey, AgentCatalogFile, AgentProvider
        fields = ('Demo', 'https://example.org/v1', 'https://example.org/models')
        with patch.object(catalog, 'crypt_credential', side_effect=catalog.Refused('tpm', 503)):
            with self.assertRaises(catalog.Refused):
                catalog.add_provider(*fields, key='fixture-key')
        self.assertFalse(AgentProvider.objects.exists())
        self.assertFalse(AgentCatalogFile.objects.filter(provider__isnull=False).exists())
        with patch.object(catalog, 'crypt_credential', return_value=b'fixture-ciphertext'):
            provider = catalog.add_provider(*fields, key='fixture-key')
        self.assertNotIn('key', provider)
        self.assertEqual(AgentApiKey.objects.get().provider_id, provider['id'])
        with patch.object(catalog, 'crypt_credential', side_effect=catalog.Refused('tpm', 503)):
            with self.assertRaises(catalog.Refused):
                catalog.save_provider(provider['id'], 'Refusé', *fields[1:], key='fixture-key')
        self.assertEqual(AgentProvider.objects.get(pk=provider['id']).name, 'Demo')

    def test_openai_auth_prices_daily_refresh_and_last_valid_data(self):
        from cab_platform import agent_catalog as catalog, agent_catalog_files as files
        from cab_platform.core.models import AgentApiKey, AgentCatalogFile, AgentCatalogProjection, AgentModel
        provider = catalog.add_provider('OpenAI', 'https://api.openai.com/v1', catalog.OPENAI_MODELS_URL)
        source_key = 'provider-'+str(provider['id'])
        with patch.object(catalog, 'download') as fetch:
            files.refresh()
            fetch.assert_not_called()
        self.assertEqual(AgentCatalogFile.objects.get(pk=source_key).error, 'agent-catalog-key-required')
        with patch.object(catalog, 'crypt_credential', return_value=b'fixture-ciphertext'):
            catalog.save_provider(provider['id'], provider['name'], provider['api_url'],
                                  provider['models_url'], key='fixture-key')
        AgentApiKey.objects.filter(provider_id=provider['id']).update(valid=True)
        models = json.dumps({'data': [{'id': 'gpt-fixture'}, {'id': 'no-price'}]}).encode()
        with patch.object(catalog, 'crypt_credential', return_value=b'fixture-key'), \
             patch.object(catalog, 'download', side_effect=[models, OPENAI_PRICES]) as fetch:
            files.refresh()
            from unittest.mock import call
            self.assertEqual(fetch.call_args_list, [call(catalog.OPENAI_MODELS_URL, openai_key='fixture-key'),
                                                    call(catalog.OPENAI_PRICING_URL)])
            files.refresh()
            self.assertEqual(fetch.call_count, 2)
        model = AgentModel.objects.get(identifier='gpt-fixture')
        summary = AgentCatalogProjection.objects.get(pk='model:'+str(model.pk)).data
        self.assertEqual([summary[field] for field in ('input_cost','output_cost','cache_read_cost')],
                         [2, 10, 0.1])
        self.assertEqual(summary['cache_write_rates'], {'30m': 2.5, '12h': 5})
        self.assertEqual(model.source['openai_standard_prices']['long']['12h'], 10)
        self.assertIsNone(AgentModel.objects.get(identifier='no-price').details['summary']['input_cost'])
        self.assertNotIn('fixture-key', files.read_file(files.source_path(AgentCatalogFile.objects.get(pk=source_key))).decode())
        files.request_download(source_key)
        with patch.object(catalog, 'crypt_credential', return_value=b'fixture-key'), \
             patch.object(catalog, 'download', side_effect=[models, b'invalid pricing']):
            files.refresh()
        source = AgentCatalogFile.objects.get(pk=source_key)
        self.assertTrue(source.valid)
        self.assertEqual(source.last_refresh_error, 'agent-catalog-format-invalid')
        self.assertGreater(source.attempted_at, source.refreshed_at)
        self.assertEqual(AgentModel.objects.get(pk=model.pk).details['summary']['input_cost'], 2)

    def test_key_health_schedule_projection_and_manual_failure(self):
        from cab_platform import agent_catalog as catalog, agent_key_health as health
        from cab_platform.core.models import AgentApiKey, AgentCatalogProjection
        provider = catalog.add_provider('OpenAI', 'https://api.openai.com/v1', catalog.OPENAI_MODELS_URL)
        key_id = uuid4()
        AgentApiKey.objects.create(id=key_id, provider_id=provider['id'], ciphertext='private')
        now = timezone.now()
        key = health.claim(now)
        self.assertIsNone(health.claim(now))
        models = b'{"data":[{"id":"gpt-fixture"}]}'
        quotas = b'{"data":[{"id":"gpt-fixture","jobs_so_far_today":0,"max_jobs_per_day":10}]}'
        with patch.object(catalog, 'key_secret', return_value='fixture'), patch.object(
                catalog, 'fetch', side_effect=[(200, models, {}), (200, quotas, {})]) as fetch:
            result = health.probe(key)
        self.assertEqual([call.args[0] for call in fetch.call_args_list],
                         [catalog.OPENAI_MODELS_URL, health.OPENAI_LIMITS])
        health.finish(key, result, now)
        row = AgentCatalogProjection.objects.get(pk='key:'+str(key_id)).data
        self.assertTrue(row['valid'])
        self.assertEqual(row['metrics']['fine_tuning'][0]['max_jobs_per_day'], 10)
        self.assertIsNone(row['credits'])
        self.assertNotIn('private', json.dumps(row))
        saved = row['refreshed_at']
        scheduled = AgentApiKey.objects.get(pk=key_id).refresh_after
        window = int(now.timestamp()) // health.WINDOW
        self.assertEqual(int(scheduled.timestamp()) // health.WINDOW, window + 1)
        self.assertIsNone(health.claim(now))
        health.request_refresh(key_id)
        key = health.claim(now + timedelta(seconds=1))
        with patch.object(catalog, 'key_secret', return_value='fixture'), patch.object(
                catalog, 'fetch', return_value=(401, b'', {})) as fetch:
            result = health.probe(key)
        fetch.assert_called_once()
        health.finish(key, result, now + timedelta(seconds=2))
        row = AgentCatalogProjection.objects.get(pk='key:'+str(key_id)).data
        self.assertFalse(row['valid'])
        self.assertEqual(row['check_error'], 'agent-api-key-http-401')
        self.assertEqual(row['refreshed_at'], saved)
        self.assertEqual(AgentApiKey.objects.get(pk=key_id).refresh_after, scheduled)
        self.assertEqual(catalog.keys()[0]['checked_at'], row['checked_at'])
        health.request_refresh(key_id)
        abandoned = health.claim(now + timedelta(seconds=3))
        recovered = health.claim(now + timedelta(minutes=6))
        self.assertEqual(recovered.pk, abandoned.pk)
        health.finish(abandoned, health.Outcome(True, metrics={'credits': 10}), now + timedelta(minutes=6))
        self.assertEqual(AgentCatalogProjection.objects.get(pk='key:'+str(key_id)).data['refreshed_at'], saved)

    def test_catalog_auth_selects_only_valid_keys_and_checks_origin(self):
        from cab_platform import agent_catalog as catalog, agent_key_health as health
        from cab_platform.core.models import AgentApiKey, AgentProvider
        values = catalog.add_provider('Router', 'https://openrouter.ai/api/v1', 'https://openrouter.ai/api/v1/models')
        provider = AgentProvider.objects.get(pk=values['id'])
        AgentApiKey.objects.create(id=uuid4(), provider=provider, ciphertext='invalid', valid=False)
        with self.assertRaisesRegex(catalog.Refused, 'agent-provider-key-origin-change'):
            catalog.save_provider(provider.pk, provider.name, 'https://example.org/v1', 'https://example.org/models')
        eligible = [AgentApiKey.objects.create(id=uuid4(), provider=provider, ciphertext='valid', valid=True)
                    for _ in range(2)]
        with patch.object(catalog, 'choice', side_effect=lambda keys: keys[-1]) as choose, patch.object(
                catalog, 'key_secret', return_value='fixture'), patch.object(
                catalog, 'fetch', return_value=(200, b'{}', {})) as fetch:
            catalog.authenticated_catalog(provider)
            self.assertCountEqual(choose.call_args.args[0], eligible)
            fetch.assert_called_once_with(provider.models_url, secret='fixture')
            provider.models_url = 'https://example.org/models'
            with self.assertRaisesRegex(catalog.Refused, 'agent-catalog-auth-url-invalid'):
                catalog.authenticated_catalog(provider)
            fetch.assert_called_once()
        with patch.object(catalog, 'key_secret', return_value='fixture'), patch.object(
                catalog, 'fetch', side_effect=[
                    (200, b'{"data":{"usage_daily":1,"usage_weekly":2,"usage_monthly":3,"limit_remaining":5,"is_management_key":true}}', {}),
                    (200, b'{"data":{"total_credits":50,"total_usage":10}}', {}),
                ]):
            self.assertEqual(health.probe(eligible[0]).metrics,
                             {'kind':'router','day':1,'week':2,'month':3,'key_budget':5,'credits':40})
        go = AgentProvider(name='Go', api_url='https://opencode.ai/zen/go/v1')
        with patch.object(catalog, 'key_secret', return_value='fixture'), patch.object(
                catalog, 'fetch', return_value=(200, b'{"usage":{"rolling":{"percent":2},"weekly":{"percent":3},"monthly":{"percent":4}}}', {})):
            self.assertEqual(health.probe(AgentApiKey(provider=go)).metrics,
                             {'kind':'go','rolling':2,'week':3,'month':4})

    def test_public_fetch_rejects_private_addresses_and_redirects(self):
        from cab_platform import agent_catalog as catalog
        with patch.object(catalog.socket, 'getaddrinfo',
                          return_value=[(0, 0, 0, '', ('127.0.0.1', 443))]):
            with patch.object(catalog.socket, 'create_connection') as connect:
                with self.assertRaises(catalog.Refused):
                    catalog.download('https://example.org/models')
                connect.assert_not_called()
        with self.assertRaises(catalog.Refused):
            catalog.download('https://secret@example.org/models')
        with self.assertRaises(catalog.Refused):
            catalog.download('https://example.org/models', openai_key='fixture-key')
        with patch.object(catalog, 'public_address', return_value='93.184.216.34'):
            with patch.object(catalog.socket, 'create_connection'), patch.object(catalog.ssl, 'create_default_context'):
                with patch.object(catalog.client, 'HTTPSConnection') as connection_class:
                    response = connection_class.return_value.getresponse.return_value.__enter__.return_value
                    response.status = 302
                    with self.assertRaises(catalog.Refused):
                        catalog.download('https://example.org/models')
                    connection_class.assert_called_once()
                    response.read1.assert_not_called()

    def test_provider_removal_protects_keys_and_survives_refresh(self):
        from cab_platform import agent_catalog as catalog, agent_catalog_files as files
        from cab_platform.core.models import AgentApiKey, AgentModel, AgentProvider
        provider = catalog.add_provider('Demo', 'https://example.org', 'https://example.org/models')
        with patch.object(catalog, 'download', return_value=json.dumps(OPEN_CODE).encode()):
            files.refresh()
        identifier = provider['id']
        with patch.object(catalog, 'crypt_credential', return_value=b'fixture-ciphertext'):
            key = catalog.add_key(identifier, 'fixture-key')
        with self.assertRaises(catalog.Refused) as error:
            catalog.remove_provider(identifier)
        self.assertEqual(error.exception.code, 'agent-provider-keys-linked')
        self.assertTrue(AgentApiKey.objects.filter(pk=key['id']).exists())
        self.assertTrue(AgentModel.objects.filter(provider_id=identifier).exists())
        catalog.remove_key(key['id'])
        files.request_download('provider-'+str(identifier))
        def remove_during_fetch(_):
            self.assertEqual(catalog.remove_provider(identifier), {'removed': True})
            return json.dumps(OPEN_CODE).encode()
        with patch.object(catalog, 'download', side_effect=remove_during_fetch):
            files.refresh()
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

    def test_provider_selection_persists_and_all_includes_later_providers(self):
        from cab_platform import agent_catalog as catalog, model_policies as rules
        from cab_platform.core.models import AgentModel, AgentModelPolicy

        def provider_with_model(name):
            provider_id = catalog.add_provider(name, 'https://example.org', '')['id']
            details = {'summary': {'input_cost': 1, 'cache_read_cost': None}}
            AgentModel.objects.create(provider_id=provider_id, identifier=name, source={}, details=details)
            return provider_id

        def names(policy_id):
            return [row['provider'] for row in catalog.models(policy_id)]

        first = provider_with_model('A')
        second = provider_with_model('B')
        values = {'name': 'Fournisseurs', 'include_free': True, 'include_paid': True, 'context_min': 0,
                  'output_min': 0, **dict.fromkeys(rules.PRICE_FIELDS, Decimal(0))}
        policy = rules.save_policy(None, values)
        policy_id = policy['id']
        self.assertIsNone(policy['provider_ids'])
        self.assertEqual(names(policy_id), ['A', 'B'])
        third = provider_with_model('C')
        self.assertEqual(names(policy_id), ['A', 'B', 'C'])
        updated = rules.save_policy(policy_id, {**values, 'provider_ids': [third, first, third]})
        self.assertEqual(updated['provider_ids'], [first, third])
        self.assertEqual(rules.policy_list()[0]['provider_ids'], [first, third])
        self.assertEqual(names(policy_id), ['A', 'C'])
        self.assertEqual(rules.save_policy(policy_id, values)['provider_ids'], [first, third])
        catalog.remove_provider(first)
        self.assertEqual(names(policy_id), ['C'])
        with self.assertRaises(catalog.Refused) as error:
            rules.save_policy(policy_id, {**values, 'provider_ids': [first]})
        self.assertEqual(error.exception.code, 'agent-model-policy-provider-invalid')
        AgentModelPolicy.objects.filter(pk=policy_id).update(provider_ids=[])
        self.assertEqual(names(policy_id), ['B', 'C'])
        self.assertIsNone(rules.policy_list()[0]['provider_ids'])
        self.assertIsNone(rules.save_policy(policy_id, values)['provider_ids'])
        self.assertIsNone(rules.save_policy(policy_id, {**values, 'provider_ids': []})['provider_ids'])
        self.assertIsNone(AgentModelPolicy.objects.get(pk=policy_id).provider_ids)
        self.assertEqual(names(policy_id), ['B', 'C'])
        rules.save_policy(policy_id, {**values, 'provider_ids': None})
        self.assertEqual(names(policy_id), ['B', 'C'])
        self.assertNotIn(second, updated['provider_ids'])


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
                sort_state = sort_migration.apply(controls_state.clone(), schema_editor)
            provider_migration = loader.get_migration('cab_core', '0059_model_policy_providers')
            with connection.schema_editor() as schema_editor:
                live_previous = provider_migration.apply(sort_state.clone(), schema_editor)
            old_provider = live_previous.apps.get_model('cab_core', 'AgentProvider').objects.create(
                name='Existant', api_url='https://example.org', models_url='https://example.org/models')
            old_key_id = uuid4()
            live_previous.apps.get_model('cab_core', 'AgentApiKey').objects.create(
                id=old_key_id, provider_id=old_provider.pk, ciphertext='fixture-encrypted-key')
            live_previous.apps.get_model('cab_core', 'AgentModel').objects.create(
                provider_id=old_provider.pk, identifier='existing-model',
                source={'remote': 'fixture-source-only'},
                details={'summary': {'name': 'Existant'}, 'metadata': {'fixture-private': True}})
            live_migration = loader.get_migration('cab_core', '0060_agent_catalog_live')
            with connection.schema_editor() as schema_editor:
                live_state = live_migration.apply(live_previous.clone(), schema_editor)
            openai_migration = loader.get_migration('cab_core', '0062_openai_catalog')
            with connection.schema_editor() as schema_editor:
                openai_state = openai_migration.apply(live_state.clone(), schema_editor)
            health_migration = loader.get_migration('cab_core', '0063_agent_api_key_health')
            with connection.schema_editor() as schema_editor:
                health_migration.apply(openai_state.clone(), schema_editor)
            from cab_platform.core.models import AgentCatalogFile, AgentCatalogProjection, AgentModelPolicy, AgentProvider
            openai = AgentProvider.objects.get(name='OpenAI')
            assert openai.api_url == 'https://api.openai.com/v1'
            assert AgentCatalogFile.objects.get(provider_id=openai.pk).url == 'https://api.openai.com/v1/models'
            assert AgentCatalogFile.objects.get(provider_id=old_provider.pk).state == 'queued'
            assert AgentCatalogProjection.objects.get(pk='key:'+str(old_key_id)).data['provider_id'] == old_provider.pk
            old_projection = AgentCatalogProjection.objects.get(pk='key:'+str(old_key_id)).data
            assert 'ciphertext' not in old_projection and old_projection['valid'] is None and old_projection['queued']
            assert AgentCatalogProjection.objects.get(kind='model').data['name'] == 'Existant'
            assert 'source' not in AgentCatalogProjection.objects.get(kind='model').data
            upgraded = AgentModelPolicy.objects.get(pk=legacy.pk)
            assert (upgraded.cache_read_max, upgraded.cache_write_min) == (Decimal('.2'), Decimal('.3'))
            assert (upgraded.model_filter, upgraded.cache_read_min, upgraded.cache_write_max) == ('', 0, 0)
            assert (upgraded.sort_column, upgraded.sort_descending) == ('input_cost', False)
            assert upgraded.provider_ids is None
            result = unittest.main(exit=False).result
            with connection.schema_editor() as schema_editor:
                health_migration.unapply(openai_state, schema_editor)
            with connection.schema_editor() as schema_editor:
                live_migration.unapply(live_previous, schema_editor)
                provider_migration.unapply(sort_state, schema_editor)
                sort_migration.unapply(controls_state, schema_editor)
                controls_migration.unapply(policy_state, schema_editor)
                policy_migration.unapply(catalog_state, schema_editor)
                migration.unapply(initial, schema_editor)
            assert not {'agent_models', 'agent_model_policies'}.intersection(connection.introspection.table_names())
        finally:
            connection.close()
            command('pg_ctl', '-D', pgdata, '-m', 'immediate', '-w', 'stop')
    raise SystemExit(0 if result.wasSuccessful() else 1)
