"""Versions de forge partagées par instance, observées au plus une fois par jour."""
import hashlib
import json
import re
import secrets
from datetime import timedelta
from urllib.parse import urlsplit
import httpx
from django.db import close_old_connections, transaction
from django.utils import timezone
from .core.models import ForgeVersion, Project, ProjectMetadataProjection
from .core.commands import Refused

FORGES = ('FORGEJO', 'GITLAB', 'GITHUB')


def identity(forge, base):
    return hashlib.sha256((forge + '\0' + base).encode()).hexdigest()


def base_for(values, forge):
    value = values.get('REMOTE_' + forge + '_BASE_URL', '')
    if not isinstance(value, str) or len(value) > 500:
        return ''
    try:
        parts = urlsplit(value)
        if parts.scheme != 'https' or not parts.hostname or parts.username or parts.password or parts.query or parts.fragment or parts.port == 0:
            return ''
    except ValueError:
        return ''
    return value.rstrip('/')


def cached(values):
    ids = {forge: identity(forge, base) for forge in FORGES if (base := base_for(values, forge))}
    rows = {row.pk: row for row in ForgeVersion.objects.filter(pk__in=ids.values())}
    return {forge: rows[key].version for forge, key in ids.items() if key in rows and rows[key].version}


def observe(project, forge, base):
    try:
        headers = {'Accept': 'application/json', 'User-Agent': 'CAB-forge-version'}
        parts = urlsplit(base)
        if forge == 'GITHUB':
            endpoint = 'https://api.github.com/versions' if parts.hostname.lower() == 'github.com' and parts.port in (None, 443) and parts.path in ('', '/') else base + '/api/v3/versions'
        else:
            endpoint = base + ('/api/v4/version' if forge == 'GITLAB' else '/api/v1/version')
            encrypted = (project.configuration or {}).get('forge_tokens_tpm', {}).get(forge, '')
            if encrypted:
                from .forge_settings import crypt
                token = crypt(project, forge, encrypted.encode(), True).decode('utf-8')
                if not token or any(c in token for c in '\r\n\0'):
                    return None
                headers['PRIVATE-TOKEN' if forge == 'GITLAB' else 'Authorization'] = token if forge == 'GITLAB' else 'token ' + token
        with httpx.Client(timeout=8, follow_redirects=False, trust_env=False) as client:
            with client.stream('GET', endpoint, headers=headers) as response:
                if response.status_code != 200:
                    return None
                data = b''
                for chunk in response.iter_bytes():
                    data += chunk
                    if len(data) > 262144:
                        return None
        data = json.loads(data)
        if forge == 'GITHUB':
            versions = [v for v in data if isinstance(v, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', v)] if isinstance(data, list) else []
            value = max(versions) if versions else ''
        else:
            value = data.get('version', '') if isinstance(data, dict) else ''
        return value if isinstance(value, str) and re.fullmatch(r'[A-Za-z0-9.+_-]{1,100}', value) else None
    except (httpx.HTTPError, Refused, ValueError, UnicodeError, KeyError, TypeError, OSError):
        return None


def sweep():
    try:
        projects = list(Project.objects.filter(creation_state='READY'))
        instances = {}
        for project in projects:
            values = (project.public_metadata or {}).get('values', {})
            for forge in FORGES:
                base = base_for(values, forge)
                if base:
                    instances.setdefault((forge, base), project)
        for (forge, base), project in instances.items():
            key = identity(forge, base)
            with transaction.atomic():
                row, _ = ForgeVersion.objects.select_for_update().get_or_create(pk=key, defaults={'forge': forge, 'base_url': base})
                now = timezone.now()
                if row.next_check is not None and row.next_check > now:
                    continue
                row.last_check = now
                row.next_check = now + timedelta(seconds=86400 + secrets.randbelow(3600))
                row.save(update_fields=['last_check', 'next_check'])
            version = observe(project, forge, base)
            if version is None:
                continue
            with transaction.atomic():
                row = ForgeVersion.objects.select_for_update().get(pk=key)
                if row.version == version:
                    continue
                row.version = version
                row.save(update_fields=['version'])
                for current in Project.objects.select_for_update().filter(creation_state='READY'):
                    snapshot = dict(current.public_metadata or {})
                    values = snapshot.get('values', {})
                    if base_for(values, forge) != base:
                        continue
                    versions = dict(snapshot.get('forge_versions') or {})
                    if versions.get(forge) == version:
                        continue
                    versions[forge] = version
                    snapshot['forge_versions'] = versions
                    snapshot['revision'] = int(snapshot.get('revision', 0)) + 1
                    current.public_metadata = snapshot
                    current.save(update_fields=['public_metadata'])
                    ProjectMetadataProjection.objects.update_or_create(pk=current.pk, defaults={'public_metadata': snapshot})
    finally:
        close_old_connections()
