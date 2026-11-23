"""Vérifie la projection OpenAI, avec une sonde de lecture facultative sur l’hôte."""
import os
from pathlib import Path
import sys
from unittest.mock import patch

sys.path[:0] = [str(Path(__file__).resolve().parents[1] / 'src'), '/usr/lib/cab/python-vendor']
import django
from django.conf import settings


def verify(result):
    assert result.valid is True and not result.check_error, result.check_error
    assert not result.metrics_error, result.metrics_error
    assert 'credits' not in result.metrics
    limits = result.metrics['fine_tuning']
    assert limits and all(limit['model'] and limit['max_jobs_per_day'] is not None for limit in limits)
    assert all(set(limit) == {'model', 'max_jobs_per_day', 'jobs_so_far_today', 'max_pending_jobs',
                              'curr_pending_jobs'} for limit in limits)
    return len(limits)


if sys.argv[1:] == ['--live']:
    os.environ['DJANGO_SETTINGS_MODULE'] = 'cab_platform.settings'
    django.setup()
    from cab_platform import agent_catalog as catalog, agent_key_health as health

    # Les nouvelles colonnes ne sont pas requises sur le service encore installé.
    from cab_platform.core.models import AgentApiKey
    key = AgentApiKey.objects.select_related('provider').only(
        'id', 'ciphertext', 'provider__id', 'provider__api_url', 'provider__models_url').get(
        provider__models_url=catalog.OPENAI_MODELS_URL)
    count = verify(health.probe(key))
    print(f'OpenAI réel : clé valide et limites de fine-tuning pour {count} modèles. Crédit indisponible.')
elif not sys.argv[1:]:
    settings.configure(SECRET_KEY='fixture', INSTALLED_APPS=['cab_platform.core'])
    django.setup()
    from cab_platform import agent_catalog as catalog, agent_key_health as health
    from cab_platform.core.models import AgentApiKey, AgentProvider

    key = AgentApiKey(provider=AgentProvider(api_url='https://api.openai.com/v1',
                                            models_url=catalog.OPENAI_MODELS_URL))
    models = b'{"data":[{"id":"fixture-model"}]}'
    limits = b'{"data":[{"id":"fixture-model","jobs_so_far_today":0,"max_jobs_per_day":8}]}'
    with patch.object(catalog, 'key_secret', return_value='fixture'), patch.object(
            catalog, 'fetch', side_effect=[(200, models, {}), (200, limits, {})]) as transport:
        assert verify(health.probe(key)) == 1
        assert [call.args[0] for call in transport.call_args_list] == [catalog.OPENAI_MODELS_URL, health.OPENAI_LIMITS]
    print('Contrat OpenAI : contrôle d’accès, limites par modèle et crédit indisponible vérifiés.')
else:
    raise SystemExit('Usage : platform-openai-key-health.py [--live]')
