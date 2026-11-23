"""Vérifications et mesures publiques des clés des fournisseurs."""
from dataclasses import dataclass
from datetime import timedelta
from math import isfinite
from random import randint
import re

from django.db import close_old_connections, transaction
from django.db.models import Q
from django.utils import timezone

from . import agent_catalog as catalog
from .core.commands import Refused, require
from .core.models import AgentApiKey, AgentCatalogFile

WINDOW = 4 * 3600
CLAIM_LIFETIME = timedelta(minutes=5)
OPENAI_LIMITS = 'https://api.openai.com/v1/fine_tuning/model_limits'
ROUTER_KEY = 'https://openrouter.ai/api/v1/key'
ROUTER_CREDITS = 'https://openrouter.ai/api/v1/credits'
GO_USAGE = 'https://opencode.ai/inference/go/v1/usage'
MAX_METRICS_BYTES = 512 * 1024


def provider_kind(provider):
    parts = catalog.parse_url(provider.api_url)
    if parts.scheme != 'https' or parts.port not in (None, 443):
        return None
    if parts.hostname == 'api.openai.com':
        return 'openai'
    if parts.hostname == 'openrouter.ai':
        return 'router'
    if parts.hostname == 'opencode.ai' and parts.path.rstrip('/') in (
            '/zen/go/v1', '/inference/go', '/inference/go/v1'):
        return 'go'
    return None


def catalog_auth_allowed(provider):
    if not provider.models_url:
        return False
    if provider_kind(provider) == 'openai':
        return provider.models_url == catalog.OPENAI_MODELS_URL
    api = catalog.parse_url(provider.api_url)
    models = catalog.parse_url(provider.models_url, public=True)
    return api.scheme == 'https' and api.port in (None, 443) and api.hostname == models.hostname


@dataclass
class Outcome:
    valid: bool | None
    check_error: str = ''
    metrics: dict | None = None
    metrics_error: str = ''


def request(url, secret, *, metrics=False):
    maximum = MAX_METRICS_BYTES if metrics else catalog.MAX_CATALOG_BYTES
    status, payload, headers = catalog.fetch(url, secret=secret, max_bytes=maximum)
    if status in (401, 403):
        raise Refused(f'agent-api-key-http-{status}', 422)
    require(status == 200, 'agent-api-key-provider-unavailable', 422)
    result = catalog.parse_document(payload)
    require(isinstance(result, dict), 'agent-api-key-response-invalid', 422)
    return result, headers


def number(value, maximum=10**15):
    return (value if type(value) in (int, float) and 0 <= value <= maximum and isfinite(value)
            else None)


def openai_metrics(document, headers):
    rates = {}
    for resource in ('requests', 'tokens', 'project-tokens'):
        for operation in ('limit', 'remaining'):
            key = operation + '-' + resource
            value = headers.get('x-ratelimit-' + key, '')
            if re.fullmatch(r'[0-9]{1,15}', value):
                rates[key] = int(value)
    rows = document.get('data')
    require(isinstance(rows, list), 'agent-api-key-response-invalid', 422)
    fine_tuning = []
    for row in rows[:100]:
        if not isinstance(row, dict) or not isinstance(row.get('id'), str):
            continue
        if not re.fullmatch(r'[a-zA-Z0-9._:-]{1,100}', row['id']):
            continue
        public = {field: number(row.get(field)) for field in
                  ('jobs_so_far_today', 'max_jobs_per_day', 'curr_pending_jobs', 'max_pending_jobs')}
        if any(value is not None for value in public.values()):
            fine_tuning.append({'model': row['id'], **public})
    return {'rate_limits': rates, 'fine_tuning': fine_tuning,
            'fine_tuning_partial': document.get('has_more') is True or len(rows) > 100}


def go_metrics(document):
    usage = catalog.obj(document.get('usage'))
    values = {key: number(catalog.obj(usage.get(meter)).get('percent'), 100)
              for key, meter in (('rolling', 'rolling'), ('week', 'weekly'), ('month', 'monthly'))}
    return {'kind': 'go', **values} if any(value is not None for value in values.values()) else {}


def router_metrics(document):
    data = catalog.obj(document.get('data'))
    values = {key: number(data.get(field)) for key, field in (
        ('day', 'usage_daily'), ('week', 'usage_weekly'), ('month', 'usage_monthly'),
        ('key_budget', 'limit_remaining'))}
    return {'kind': 'router', **values} if any(value is not None for value in values.values()) else {}


def probe(key):
    provider = key.provider
    try:
        kind = provider_kind(provider)
        if kind is None:
            require(catalog_auth_allowed(provider), 'agent-api-key-endpoint-unavailable', 422)
        secret = catalog.key_secret(key)
        url = {'openai': catalog.OPENAI_MODELS_URL, 'go': GO_USAGE, 'router': ROUTER_KEY}.get(
            kind, provider.models_url)
        document, headers = request(url, secret, metrics=kind in ('go', 'router'))
        if kind not in ('go', 'router'):
            require(bool(catalog.read_catalog(document)), 'agent-api-key-response-invalid', 422)
    except Refused as error:
        rejected = error.code in ('agent-api-key-http-401', 'agent-api-key-http-403')
        return Outcome(False if rejected else None, check_error=error.code)
    metrics = {}
    try:
        if kind == 'openai':
            try:
                limits, limit_headers = request(OPENAI_LIMITS, secret, metrics=True)
            except Refused as error:
                metrics = openai_metrics({'data': []}, headers)
                return Outcome(True, metrics=metrics if metrics['rate_limits'] else None,
                               metrics_error=error.code)
            metrics = openai_metrics(limits, {**headers, **limit_headers})
            if not metrics['rate_limits'] and not metrics['fine_tuning']:
                metrics = {}
        elif kind == 'go':
            metrics = go_metrics(document)
        elif kind == 'router':
            metrics = router_metrics(document)
            if catalog.obj(document.get('data')).get('is_management_key') is True:
                data, _ = request(ROUTER_CREDITS, secret, metrics=True)
                balance = catalog.obj(data.get('data'))
                total, spent = number(balance.get('total_credits')), number(balance.get('total_usage'))
                if total is not None and spent is not None:
                    metrics = {**metrics, 'kind': 'router', 'credits': round(total - spent, 8)}
    except Refused as error:
        return Outcome(True, metrics=metrics or None, metrics_error=error.code)
    return Outcome(True, metrics=metrics or None, metrics_error='' if metrics else 'agent-api-key-metrics-unavailable')


def next_refresh(now):
    window_start = (int(now.timestamp()) // WINDOW + 1) * WINDOW
    return now.fromtimestamp(window_start + randint(0, WINDOW - 1), tz=now.tzinfo)


@transaction.atomic
def request_refresh(key_id):
    key = AgentApiKey.objects.select_for_update().filter(pk=key_id).first()
    require(key is not None, 'agent-api-key-not-found', 404)
    if key.checking_at is None or key.checking_at <= timezone.now() - CLAIM_LIFETIME:
        key.refresh_requested = True
        key.save(update_fields=['refresh_requested'])
    return {'queued': True}


@transaction.atomic
def claim(now):
    due = Q(refresh_requested=True) | Q(refresh_after__lte=now) | Q(refresh_after__isnull=True)
    available = Q(checking_at__isnull=True) | Q(checking_at__lte=now - CLAIM_LIFETIME)
    key = AgentApiKey.objects.select_for_update(skip_locked=True, of=('self',)).select_related('provider').filter(
        (due | Q(checking_at__isnull=False)) & available).order_by('refresh_after', 'id').first()
    if key is not None:
        key.checking_at = now
        key.refresh_requested = False
        key.save(update_fields=['checking_at', 'refresh_requested'])
    return key


@transaction.atomic
def finish(key, result, now):
    values = {'valid': result.valid, 'checked_at': now, 'checking_at': None,
              'check_error': result.check_error, 'metrics_error': result.metrics_error}
    if key.refresh_after is None or key.refresh_after <= key.checking_at:
        values['refresh_after'] = next_refresh(now)
    if result.valid and (result.metrics is not None or result.metrics_error == 'agent-api-key-metrics-unavailable'):
        values['refreshed_at'] = now
        values['metrics'] = result.metrics or {}
    updated = AgentApiKey.objects.filter(pk=key.pk, checking_at=key.checking_at).update(**values)
    if updated and result.valid and key.valid is not True:
        AgentCatalogFile.objects.filter(provider_id=key.provider_id, state='error',
            last_refresh_error__in=['agent-catalog-key-required', 'agent-catalog-valid-key-unavailable']).update(
                state='queued', refresh_after=now)


def refresh():
    try:
        for _ in range(3):
            key = claim(timezone.now())
            if key is None:
                return
            finish(key, probe(key), timezone.now())
    finally:
        close_old_connections()
