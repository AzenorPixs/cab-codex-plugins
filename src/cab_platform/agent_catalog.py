"""Catalogues publics des fournisseurs et clés conservées au TPM."""
from datetime import timedelta
from decimal import Decimal, InvalidOperation
from http import client
from ipaddress import ip_address, ip_network
import json
import logging
from math import isfinite
from random import randint
import re
import socket
import ssl
from time import monotonic
from urllib.parse import urlsplit
from uuid import uuid4

from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.db import IntegrityError, close_old_connections, transaction
from django.db.models import Case, F, JSONField, Value, When
from django.db.models.deletion import ProtectedError
from django.utils import timezone

from .core.commands import Refused, require
from .core.models import AgentApiKey, AgentModel, AgentProvider
from .forge_settings import crypt_credential

MODELS_DEV_URL = 'https://models.dev/api.json'
MAX_CATALOG_BYTES = 16 * 1024 * 1024
MAX_MODELS = 10_000
RETRY_DELAY = timedelta(minutes=30)
LOG = logging.getLogger(__name__)
_reference = None
_reference_due = None
_TRANSITION = tuple(map(ip_network, ('2002::/16', '64:ff9b::/96', '64:ff9b:1::/48', '2001::/32')))


def parse_url(value, public=False):
    try:
        URLValidator(schemes=['https'] if public else ['http', 'https'])(value)
        parts = urlsplit(value)
        if (parts.username is not None or parts.password is not None or parts.fragment
                or (public and parts.port not in (443, None)) or not value.isascii()):
            raise ValueError
        return parts
    except (ValueError, ValidationError):
        raise Refused('agent-catalog-url-invalid', 400) from None


def public_address(host):
    addresses = [ip_address(row[4][0]) for row in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)]
    for address in addresses:
        actual = getattr(address, 'ipv4_mapped', None) or address
        if (not actual.is_global or actual.is_multicast or actual.is_reserved
                or (actual.version == 6 and any(actual in network for network in _TRANSITION))):
            raise ValueError
    if not addresses:
        raise ValueError
    return str(addresses[0])


def fetch(url):
    parts = parse_url(url, public=True)
    target = (parts.path or '/') + ('?' + parts.query if parts.query else '')
    deadline = monotonic() + 15
    connection = client.HTTPSConnection(parts.hostname, timeout=5)
    try:
        address = public_address(parts.hostname)
        with socket.create_connection((address, 443), timeout=5) as raw_socket:
            with ssl.create_default_context().wrap_socket(raw_socket, server_hostname=parts.hostname) as tls:
                connection.sock = tls
                connection.request('GET', target, headers={'Accept': 'application/json'})
                with connection.getresponse() as response:
                    if response.status != 200:
                        raise ValueError
                    payload = bytearray()
                    while chunk := response.read1(64 * 1024):
                        payload.extend(chunk)
                        if len(payload) > MAX_CATALOG_BYTES or monotonic() > deadline:
                            raise ValueError
        document = json.loads(payload, parse_constant=_invalid_constant)
        validate_strings(document)
        return document
    except (OSError, ValueError, RecursionError, client.HTTPException):
        raise Refused('agent-catalog-unavailable', 422) from None
    finally:
        connection.close()


def _invalid_constant(_):
    raise ValueError


def validate_strings(value):
    if isinstance(value, dict):
        for key, child in value.items():
            validate_strings(key)
            validate_strings(child)
    elif isinstance(value, list):
        for child in value:
            validate_strings(child)
    elif isinstance(value, float) and not isfinite(value):
        raise ValueError
    elif isinstance(value, str):
        if '\0' in value:
            raise ValueError
        value.encode()


def obj(data):
    return data if isinstance(data, dict) else {}


def read_catalog(data):
    rows = obj(data).get('data')
    require(isinstance(rows, list) and 0 < len(rows) <= MAX_MODELS, 'agent-catalog-format-invalid', 422)
    result = {}
    for row in rows:
        identifier = obj(row).get('id')
        require(isinstance(identifier, str) and 0 < len(identifier.strip()) <= 255
                and len(identifier) <= 255 and identifier not in result,
                'agent-catalog-format-invalid', 422)
        result[identifier] = row
    return result


def cost_per_million(raw):
    if not isinstance(raw, (str, int, float)) or isinstance(raw, bool) or len(str(raw)) > 64:
        return None
    try:
        value = Decimal(str(raw))
        if not value.is_finite() or value < 0 or value.adjusted() > 12 or value.adjusted() < -24:
            return None
        return format(value * 1_000_000, 'f')
    except InvalidOperation:
        return None


def positive_int(value):
    return value if type(value) is int and 0 < value <= 10**12 else None


def modality_list(value):
    if isinstance(value, list) and value and all(isinstance(item, str) and item for item in value):
        return value
    return None


def base_cost(cost, direction):
    value = cost.get(direction, obj(obj(cost.get('text')).get(direction)).get('price'))
    return native_cost(value)


def native_cost(value):
    return value if type(value) in (int, float) and 0 <= value < 10**15 else None


def first_price(*values):
    return next((value for value in values if value is not None), None)


def cache_prices(record):
    cost = obj(record.get('cost'))
    pricing = obj(record.get('pricing'))
    cache = obj(obj(obj(cost.get('text')).get('input')).get('cache'))
    read = first_price(native_cost(cache.get('read')), cost_per_million(pricing.get('input_cache_read')),
                       native_cost(cost.get('cache_read')))
    write = native_cost(cache.get('write'))
    duration = None
    if write is None:
        units = {'s': 1, 'm': 60, 'h': 3600, 'd': 86400}
        options = []
        for label, value in obj(cache.get('write')).items():
            match = re.fullmatch(r'([1-9][0-9]{0,5})([smhd])', label)
            price = native_cost(value)
            if match and price is not None:
                options.append((int(match[1]) * units[match[2]], label, price))
        if options:
            _, duration, write = min(options)
    write = first_price(write, cost_per_million(pricing.get('input_cache_write')),
                        native_cost(cost.get('cache_write')))
    return {'cache_read_cost': read, 'cache_write_cost': write, 'cache_write_duration': duration}


def merge_cache(primary, fallback):
    if primary['cache_write_cost'] is not None:
        fallback = {**fallback, 'cache_write_duration': primary['cache_write_duration']}
    return merge_missing(primary, fallback)


def normalize(record):
    limit = obj(record.get('limit'))
    architecture = obj(record.get('architecture'))
    modalities = obj(record.get('modalities'))
    pricing = obj(record.get('pricing'))
    cost = obj(record.get('cost'))
    name = record.get('name')
    input_cost = base_cost(cost, 'input')
    output_cost = base_cost(cost, 'output')
    return {
        'name': name if isinstance(name, str) and name.strip() else None,
        'context': positive_int(limit.get('context')) or positive_int(record.get('context_length'))
            or positive_int(obj(record.get('top_provider')).get('context_length')),
        'output': positive_int(limit.get('output'))
            or positive_int(obj(record.get('top_provider')).get('max_completion_tokens')),
        'input_modalities': modality_list(modalities.get('input')) or modality_list(architecture.get('input_modalities')),
        'output_modalities': modality_list(modalities.get('output')) or modality_list(architecture.get('output_modalities')),
        'input_cost': input_cost if input_cost is not None else cost_per_million(pricing.get('prompt')),
        'output_cost': output_cost if output_cost is not None else cost_per_million(pricing.get('completion')),
    }


def merge_missing(primary, fallback):
    result = primary.copy()
    for key, value in fallback.items():
        current = result.get(key)
        if current is None or current == '':
            result[key] = value
        elif isinstance(current, dict) and isinstance(value, dict):
            result[key] = merge_missing(current, value)
    return result


def reference_for(provider, reference):
    if not reference:
        return {}
    urls = {value.rstrip('/') for value in (provider.api_url, provider.models_url)}
    names = {provider.name.casefold(), provider.name.casefold().replace(' ', '-')}
    known_urls = {
        'https://opencode.ai/zen/go/v1/models': 'opencode-go',
        'https://openrouter.ai/api/v1/models': 'openrouter',
    }
    for url, key in known_urls.items():
        if url in urls and key in reference:
            return obj(obj(reference[key]).get('models'))
    candidates = [obj(value.get('models')) for key, value in reference.items() if isinstance(value, dict)
                  and (key in names or str(value.get('name', '')).casefold() in names
                       or str(value.get('api', '')).rstrip('/') in urls)]
    return candidates[0] if len(candidates) == 1 else {}


def model_details(identifier, record, reference):
    match = obj(reference.get(identifier))
    if not match:
        ids = {value for key in ('canonical_id', 'canonical_slug', 'canonical_model_id')
               if isinstance(value := record.get(key), str) and value}
        candidates = [value for key, value in reference.items() if isinstance(value, dict)
                      and (key in ids or value.get('canonical_model_id') in ids)]
        if len(candidates) == 1:
            match = candidates[0]
    cache = merge_cache(cache_prices(record), cache_prices(match))
    return {'summary': {**merge_missing(normalize(record), normalize(match)), **cache},
            'metadata': merge_missing(record, match)}


def next_refresh():
    return timezone.now() + timedelta(seconds=randint(18 * 3600, 24 * 3600 - 60))


def save_catalog(provider, records, reference):
    matches = reference_for(provider, reference)
    AgentModel.objects.bulk_create([
        AgentModel(provider=provider, identifier=identifier, source=record,
                   details=model_details(identifier, record, matches))
        for identifier, record in records.items()
    ], batch_size=250, update_conflicts=True, unique_fields=['provider', 'identifier'],
       update_fields=['source', 'details'])
    provider.catalog.exclude(identifier__in=records).delete()
    provider.refreshed_at = timezone.now()
    provider.refresh_after = next_refresh()
    provider.save(update_fields=['refreshed_at', 'refresh_after'])


def providers():
    return list(AgentProvider.objects.order_by('name', 'id').values('id', 'name', 'api_url', 'models_url'))


def add_provider(name, api_url, models_url):
    name, api_url, models_url = name.strip(), api_url.strip(), models_url.strip()
    require(0 < len(name) <= 160 and not any(ord(char) < 32 for char in name),
            'agent-provider-name-invalid', 400)
    require(0 < len(api_url) <= 2048 and len(models_url) <= 2048, 'agent-catalog-url-invalid', 400)
    parse_url(api_url)
    require(not AgentProvider.objects.filter(name=name).exists(), 'agent-provider-duplicate', 409)
    records = read_catalog(fetch(models_url)) if models_url else None
    with transaction.atomic():
        try:
            with transaction.atomic():
                provider = AgentProvider.objects.create(name=name, api_url=api_url, models_url=models_url)
        except IntegrityError:
            raise Refused('agent-provider-duplicate', 409) from None
        if records is not None:
            save_catalog(provider, records, None)
    return {'id': provider.pk, 'name': provider.name, 'api_url': provider.api_url, 'models_url': provider.models_url}


@transaction.atomic
def remove_provider(provider_id):
    provider = AgentProvider.objects.select_for_update().filter(pk=provider_id).first()
    require(provider is not None, 'agent-provider-not-found', 404)
    try:
        provider.delete()
    except ProtectedError:
        raise Refused('agent-provider-keys-linked', 409) from None
    return {'removed': True}


def key_metadata(key_id, provider_name):
    return {'id': key_id, 'provider': provider_name, 'day': None, 'week': None,
            'month': None, 'credits': None}


def keys():
    rows = AgentApiKey.objects.order_by('provider__name', 'id').values_list('id', 'provider__name')
    return [key_metadata(key_id, provider_name) for key_id, provider_name in rows]


def add_key(provider_id, secret):
    try:
        encoded = secret.encode()
    except UnicodeError:
        raise Refused('agent-api-key-invalid', 400) from None
    require(0 < len(encoded) <= 16_384 and secret == secret.strip()
            and not any(char.isspace() or ord(char) < 32 for char in secret),
            'agent-api-key-invalid', 400)
    require(AgentProvider.objects.filter(pk=provider_id).exists(), 'agent-provider-not-found', 404)
    key_id = uuid4()
    ciphertext = crypt_credential('cab-agent-api-' + key_id.hex, encoded,
                                  failure='agent-api-key-tpm-unavailable').decode()
    with transaction.atomic():
        provider = AgentProvider.objects.select_for_update().filter(pk=provider_id).first()
        require(provider is not None, 'agent-provider-not-found', 404)
        AgentApiKey.objects.create(id=key_id, provider=provider, ciphertext=ciphertext)
    return key_metadata(key_id, provider.name)


def remove_key(key_id):
    removed, _ = AgentApiKey.objects.filter(pk=key_id).delete()
    require(removed == 1, 'agent-api-key-not-found', 404)
    return {'removed': True}


def models(policy_id=None):
    from .model_policies import excluded_names, matches, policy_or_error

    policy = policy_or_error(policy_id) if policy_id is not None else None
    exclusions = excluded_names(policy.model_filter) if policy else ()
    rows = AgentModel.objects.order_by('provider__name', 'identifier').values(
        'id', 'provider__name', 'identifier', 'details__summary',
        legacy_source=Case(When(details__summary__has_key='cache_read_cost', then=Value(None)),
                           default=F('source'), output_field=JSONField()),
        legacy_metadata=Case(When(details__summary__has_key='cache_read_cost', then=Value(None)),
                             default=F('details__metadata'), output_field=JSONField()),
    )
    result = []
    for item in rows.iterator():
        summary = item['details__summary']
        if 'cache_read_cost' not in summary:
            summary = {**summary, **merge_cache(cache_prices(obj(item['legacy_source'])),
                                                cache_prices(obj(item['legacy_metadata'])))}
        row = {'id': item['id'], 'provider': item['provider__name'], 'identifier': item['identifier'], **summary}
        if policy is None or matches(policy, row, exclusions):
            result.append(row)
    return result


def refresh_reference():
    global _reference, _reference_due
    now = timezone.now()
    if _reference_due is not None and now < _reference_due:
        return
    try:
        reference = fetch(MODELS_DEV_URL)
        require(isinstance(reference, dict) and any(obj(item).get('models') for item in reference.values()),
                'agent-catalog-format-invalid', 422)
        for provider_id in AgentProvider.objects.values_list('id', flat=True).iterator():
            with transaction.atomic():
                provider = AgentProvider.objects.select_for_update().filter(pk=provider_id).first()
                if provider is None:
                    continue
                matches = reference_for(provider, reference)
                rows = list(provider.catalog.all())
                for row in rows:
                    row.details = model_details(row.identifier, row.source, matches)
                AgentModel.objects.bulk_update(rows, ['details'], batch_size=250)
        _reference, _reference_due = reference, next_refresh()
    except Refused:
        _reference_due = now + RETRY_DELAY
        LOG.warning('Catalogue models.dev indisponible')


def refresh():
    try:
        refresh_reference()
        provider = AgentProvider.objects.filter(refresh_after__lte=timezone.now()).order_by('refresh_after').first()
        if provider is None:
            return
        try:
            records = read_catalog(fetch(provider.models_url))
            with transaction.atomic():
                current = AgentProvider.objects.select_for_update().filter(pk=provider.pk).first()
                if current is not None:
                    save_catalog(current, records, _reference)
        except Refused:
            AgentProvider.objects.filter(pk=provider.pk).update(refresh_after=timezone.now() + RETRY_DELAY)
            LOG.warning('Catalogue fournisseur indisponible', extra={'provider_id': provider.pk})
    finally:
        close_old_connections()
