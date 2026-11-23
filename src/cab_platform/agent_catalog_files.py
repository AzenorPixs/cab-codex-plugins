"""Fichiers de catalogue privés, vérification groupée et publication PostgreSQL."""
from dataclasses import dataclass
from hashlib import sha256
import logging
import os
from pathlib import Path
import stat
from tempfile import NamedTemporaryFile

from django.db import close_old_connections, transaction
from django.utils import timezone

from . import agent_catalog as catalog
from .core.commands import Refused, require
from .core.models import AgentCatalogFile, AgentCatalogProjection, AgentModel, AgentProvider
from .paths import STATE, private_dir

LOG = logging.getLogger(__name__)
COMPLETION = 'completion'
ROOT = STATE / 'agent-catalogs'


def source_path(source):
    return ROOT / (source.pk + '-' + sha256(source.url.encode()).hexdigest() + '.json')


def save_fields(source, **values):
    changed = [key for key, value in values.items() if getattr(source, key) != value]
    if changed:
        for key in changed:
            setattr(source, key, values[key])
        source.save(update_fields=changed)


@transaction.atomic
def configure_source(key, url, provider=None):
    source, created = AgentCatalogFile.objects.select_for_update().get_or_create(
        pk=key, defaults={'url': url, 'provider': provider, 'state': 'queued' if url else 'idle',
                          'refresh_after': timezone.now() if url else None})
    if not created and source.url != url:
        save_fields(source, url=url, generation=source.generation+1, valid=False, refreshed_at=None,
                    error='', attempted_at=None, last_refresh_error='', state='queued' if url else 'idle',
                    refresh_after=timezone.now() if url else None)
    return source


def configure_completion(url):
    url = url.strip()
    require(len(url) <= 2048, 'agent-catalog-url-invalid', 400)
    if url:
        catalog.parse_url(url, public=True)
    configure_source(COMPLETION, url)
    return {'queued': bool(url)}


def request_scan():
    AgentCatalogFile.objects.filter(pk=COMPLETION, scan_requested=False).update(scan_requested=True)
    return {'queued': True}


@transaction.atomic
def request_download(key, *, supersede=False):
    source = AgentCatalogFile.objects.select_for_update().filter(pk=key).first()
    require(source is not None and source.url, 'agent-catalog-source-unavailable', 404)
    if supersede or source.state not in ('queued', 'downloading'):
        save_fields(source, state='queued', error='', refresh_after=timezone.now(),
                    generation=source.generation + int(supersede))
    return {'queued': True}


def display():
    return list(AgentCatalogProjection.objects.order_by('id').values('id', 'kind', 'data'))


def read_file(path):
    with os.fdopen(os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK), 'rb') as stream:
        before = os.fstat(stream.fileno())
        if not stat.S_ISREG(before.st_mode) or not 0 < before.st_size <= catalog.MAX_CATALOG_BYTES:
            raise ValueError
        payload = stream.read(catalog.MAX_CATALOG_BYTES + 1)
        after = os.fstat(stream.fileno())
        if len(payload) != before.st_size or after.st_mtime_ns != before.st_mtime_ns:
            raise ValueError
    return payload


def save_file(path, payload):
    private_dir(ROOT)
    with NamedTemporaryFile(dir=ROOT, prefix='.download-', delete=False) as stream:
        temporary = Path(stream.name)
        try:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
            os.replace(temporary, path)
        finally:
            temporary.unlink(missing_ok=True)
    fd = os.open(ROOT, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def validate_file(source, payload):
    document = catalog.parse_document(payload)
    if source.pk != COMPLETION:
        return catalog.read_catalog(document)
    require(isinstance(document, dict) and any(catalog.obj(item).get('models') for item in document.values()),
            'agent-catalog-format-invalid', 422)
    return document


@dataclass(frozen=True)
class Observation:
    generation: int
    digest: str = ''
    error: str = ''


def observe_sources(sources):
    """Comparer tous les fichiers avant de publier un changement de modèle."""
    observed = {}
    for source in sources:
        if not source.url:
            continue
        try:
            path = source_path(source)
            payload = read_file(path)
            digest = sha256(payload).hexdigest()
            if digest != source.sha256:
                validate_file(source, payload)
            observed[source.pk] = Observation(source.generation, digest)
        except FileNotFoundError:
            observed[source.pk] = Observation(source.generation, error='agent-catalog-file-missing')
        except (ValueError, OSError, Refused):
            observed[source.pk] = Observation(source.generation, error='agent-catalog-file-invalid')
    return observed


def read_observed(source, observation):
    require(observation and observation.generation == source.generation and observation.digest,
            'agent-catalog-file-invalid', 409)
    try:
        payload = read_file(source_path(source))
        require(sha256(payload).hexdigest() == observation.digest, 'agent-catalog-file-invalid', 409)
    except (ValueError, OSError):
        raise Refused('agent-catalog-file-invalid', 409) from None
    return payload


def preview(key):
    source = AgentCatalogFile.objects.filter(pk=key, valid=True).first()
    require(source is not None, 'agent-catalog-file-invalid', 404)
    return read_observed(source, Observation(source.generation, source.sha256))


def due(source, observed, now):
    if not source.url:
        return False
    return (source.state in ('queued', 'downloading') or source.refresh_after is None
            or source.refresh_after <= now or ((source.valid or source.state == 'applying') and not observed.digest))


def download_source(source):
    if not AgentCatalogFile.objects.filter(pk=source.pk, generation=source.generation).update(state='downloading', error=''):
        return None
    try:
        if source.provider_id and source.url == catalog.OPENAI_MODELS_URL:
            provider = source.provider
            require(catalog.parse_url(provider.api_url).hostname == 'api.openai.com',
                    'agent-catalog-auth-url-invalid', 422)
            payload = catalog.openai_catalog(source.provider_id)
        elif source.provider_id:
            provider = source.provider
            require(provider.models_url == source.url, 'agent-catalog-url-diverged', 422)
            payload = catalog.authenticated_catalog(provider)
        else:
            payload = catalog.download(source.url)
        require(len(payload) <= catalog.MAX_CATALOG_BYTES, 'agent-catalog-format-invalid', 422)
        validate_file(source, payload)
        with transaction.atomic():
            current = AgentCatalogFile.objects.select_for_update().filter(pk=source.pk, generation=source.generation).first()
            if current is None:
                return None
            save_file(source_path(current), payload)
            save_fields(current, state='applying', refresh_after=catalog.next_refresh())
        return source.generation, timezone.now()
    except (Refused, OSError) as error:
        code = getattr(error, 'code', 'agent-catalog-file-unavailable')
        AgentCatalogFile.objects.filter(pk=source.pk, generation=source.generation).update(
            state='error', error=code, last_refresh_error=code, attempted_at=timezone.now(),
            refresh_after=catalog.next_refresh())
    return None


def update_models(provider, reference):
    matches = catalog.reference_for(provider, reference)
    rows = list(provider.catalog.all())
    changed = []
    for row in rows:
        details = catalog.model_details(row.identifier, row.source, matches)
        if row.details != details:
            row.details = details
            changed.append(row)
    AgentModel.objects.bulk_update(changed, ['details'], batch_size=250)


def needs_reconciliation(source, observation):
    return (observation is not None and observation.generation == source.generation and observation.digest
            and source.sha256 != observation.digest)


@transaction.atomic
def reconcile(observed, downloaded):
    # L’ordre des verrous est le même que lors d’une édition de fournisseur.
    providers = {row.pk: row for row in AgentProvider.objects.select_for_update().order_by('pk')}
    sources = {row.pk: row for row in AgentCatalogFile.objects.select_for_update().order_by('pk')}
    changed = {key for key, source in sources.items() if needs_reconciliation(source, observed.get(key))}
    completion = sources[COMPLETION]
    reference = None
    observed_reference = observed.get(COMPLETION)
    if changed and observed_reference and observed_reference.digest and observed_reference.generation == completion.generation:
        reference = validate_file(completion, read_observed(completion, observed_reference))

    for key, source in sources.items():
        observation = observed.get(key)
        if not observation or observation.generation != source.generation:
            continue
        provider = providers.get(source.provider_id)
        if provider and key in changed:
            records = validate_file(source, read_observed(source, observation))
            catalog.save_catalog(provider, records, reference)
        elif provider and COMPLETION in changed:
            update_models(provider, reference)
        downloaded_value = downloaded.get(key)
        refreshed = downloaded_value[1] if downloaded_value and downloaded_value[0] == source.generation else None
        if observation.digest:
            values = {'valid': True, 'sha256': observation.digest}
            if key in changed or refreshed or source.state == 'applying':
                values.update(state='idle', error='', refreshed_at=refreshed or timezone.now())
                if refreshed or source.state == 'applying':
                    values.update(attempted_at=values['refreshed_at'], last_refresh_error='')
            save_fields(source, **values)
        else:
            save_fields(source, valid=False, error=source.error or observation.error)
    save_fields(completion, scan_requested=False)


def refresh():
    """Vérification autonome, y compris sans navigation Web."""
    try:
        sources = list(AgentCatalogFile.objects.order_by('refresh_after', 'id'))
        observed = observe_sources(sources)
        now = timezone.now()
        downloaded = {}
        for source in sources:
            observation = observed.get(source.pk)
            if observation and due(source, observation, now):
                result = download_source(source)
                if result:
                    downloaded[source.pk] = result
        if downloaded:
            sources = list(AgentCatalogFile.objects.order_by('id'))
            observed = observe_sources(sources)
        changed = {source.pk for source in sources if needs_reconciliation(source, observed.get(source.pk))}
        if changed:
            affected = changed | {source.pk for source in sources if source.provider_id and COMPLETION in changed}
            AgentCatalogFile.objects.filter(pk__in=affected, adjusting=False).update(adjusting=True)
        if downloaded or any(
            source.scan_requested or (observation := observed.get(source.pk)) and (
                needs_reconciliation(source, observation) or source.valid != bool(observation.digest)
                or source.state == 'applying' or bool(observation.error and not source.error))
            for source in sources
        ):
            reconcile(observed, downloaded)
    except Refused as error:
        LOG.warning('Catalogues non ajustés', extra={'code': error.code})
    finally:
        try:
            AgentCatalogFile.objects.filter(adjusting=True).update(adjusting=False)
        finally:
            close_old_connections()
