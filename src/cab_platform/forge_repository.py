"""Observation bornée des dépôts distants et projection PostgreSQL."""
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
import hashlib
import json
import secrets
import threading
from urllib.parse import quote, urlsplit

import httpx
from django.db import close_old_connections, connection, transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from .core.commands import Refused
from .core.models import Project, ProjectMetadataProjection
from .forge_settings import crypt
from .forge_version import base_for

FORGES = ('FORGEJO', 'GITHUB', 'GITLAB')
_pool = ThreadPoolExecutor(max_workers=3, thread_name_prefix='cab-forge-repository')
_lock = threading.Lock()
_running = set()


def identity(project, values, forge):
    prefix = 'REMOTE_' + forge + '_'
    fields = [values.get(prefix + key, '') for key in ('BASE_URL', 'OWNER', 'REPOSITORY', 'BRANCH')]
    encrypted = (project.configuration or {}).get('forge_tokens_tpm', {}).get(forge, '')
    return hashlib.sha256(json.dumps([*fields, encrypted], ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def configured(project, values, forge):
    prefix = 'REMOTE_' + forge + '_'
    return bool(base_for(values, forge) and values.get(prefix + 'OWNER') and values.get(prefix + 'REPOSITORY') and (project.configuration or {}).get('forge_tokens_tpm', {}).get(forge))


def get_json(client, url, **kwargs):
    with client.stream('GET', url, **kwargs) as response:
        response.raise_for_status()
        data = b''
        for chunk in response.iter_bytes():
            data += chunk
            if len(data) > 1048576:
                raise ValueError('Réponse distante trop volumineuse')
        return json.loads(data), dict(response.headers)


def observe(project, values, forge):
    prefix = 'REMOTE_' + forge + '_'
    base = base_for(values, forge)
    owner, repo = values.get(prefix + 'OWNER', ''), values.get(prefix + 'REPOSITORY', '')
    branch = values.get(prefix + 'BRANCH', '')
    if not configured(project, values, forge) or not all(isinstance(x, str) for x in (owner, repo, branch)):
        return None
    if not owner or not repo or '/' in repo or repo in ('.', '..') or any(not x or x in ('.', '..') for x in owner.split('/')):
        return None
    try:
        encrypted = project.configuration['forge_tokens_tpm'][forge]
        token = crypt(project, forge, encrypted.encode(), True).decode('utf-8')
        if not token or any(x in token for x in '\r\n\0'):
            return None
        headers = {'Accept': 'application/json', 'User-Agent': 'CAB-forge-repository'}
        headers['PRIVATE-TOKEN' if forge == 'GITLAB' else 'Authorization'] = token if forge == 'GITLAB' else ('token ' if forge == 'FORGEJO' else 'Bearer ') + token
        parts = urlsplit(base)
        github_public = forge == 'GITHUB' and parts.hostname.lower() == 'github.com' and parts.port in (None, 443) and parts.path in ('', '/')
        if forge == 'GITLAB':
            root = base + '/api/v4/projects/' + quote(owner + '/' + repo, safe='')
        else:
            api = ('https://api.github.com' if github_public else base + '/api/v3') if forge == 'GITHUB' else base + '/api/v1'
            root = api + '/repos/' + '/'.join(quote(x, safe='') for x in owner.split('/')) + '/' + quote(repo, safe='')
        with httpx.Client(timeout=8, follow_redirects=False, trust_env=False, headers=headers) as client:
            info, _ = get_json(client, root, params={'statistics': 'true'} if forge == 'GITLAB' else {})
            if not isinstance(info, dict):
                return None
            branch = branch or info.get('default_branch') or ''
            if not isinstance(branch, str) or not branch:
                return None
            size = info.get('statistics', {}).get('repository_size') if forge == 'GITLAB' and isinstance(info.get('statistics'), dict) else info.get('size')
            if not isinstance(size, int) or isinstance(size, bool) or size < 0:
                size = None
            elif forge != 'GITLAB':
                size *= 1024
            endpoint = root + ('/repository/commits' if forge == 'GITLAB' else '/commits')
            params = {'ref_name': branch, 'per_page': 1} if forge == 'GITLAB' else {'sha': branch, 'per_page' if forge == 'GITHUB' else 'limit': 1}
            commits, response_headers = get_json(client, endpoint, params=params)
            if not isinstance(commits, list) or not commits or not isinstance(commits[0], dict):
                return None
            first = commits[0]
            sha = first.get('id') if forge == 'GITLAB' else first.get('sha')
            details = first.get('commit', {}) if forge != 'GITLAB' else first
            date = details.get('committed_date') if forge == 'GITLAB' else details.get('committer', {}).get('date') if isinstance(details.get('committer'), dict) else None
            if not isinstance(sha, str) or not 7 <= len(sha) <= 64 or any(c not in '0123456789abcdef' for c in sha):
                return None
            if not isinstance(date, str) or not parse_datetime(date):
                date = None
            count = response_headers.get('x-total-count') if forge == 'FORGEJO' else response_headers.get('x-total') if forge == 'GITLAB' else None
            count = int(count) if isinstance(count, str) and count.isdecimal() else None
            if forge == 'GITHUB':
                graphql = 'https://api.github.com/graphql' if github_public else base + '/api/graphql'
                query = 'query($owner:String!,$repo:String!,$ref:String!){repository(owner:$owner,name:$repo){object(expression:$ref){... on Commit{history{totalCount}}}}}'
                try:
                    response = client.post(graphql, json={'query': query, 'variables': {'owner': owner, 'repo': repo, 'ref': sha}})
                    if response.status_code == 200 and len(response.content) <= 262144:
                        document = response.json()
                        history = (((document.get('data') or {}).get('repository') or {}).get('object') or {}).get('history') or {}
                        candidate = history.get('totalCount') if isinstance(history, dict) else None
                        if isinstance(candidate, int) and not isinstance(candidate, bool) and candidate >= 0:
                            count = candidate
                except (httpx.HTTPError, ValueError, TypeError, KeyError):
                    pass
            tags = None
            try:
                tags_url = root + ('/repository/tags' if forge == 'GITLAB' else '/tags')
                tags = []
                limit = 50 if forge == 'FORGEJO' else 100
                for page in range(1, 11):
                    params = {'page': page, 'limit' if forge == 'FORGEJO' else 'per_page': limit}
                    found, _ = get_json(client, tags_url, params=params)
                    if not isinstance(found, list):
                        tags = None
                        break
                    tags.extend(item['name'] for item in found if isinstance(item, dict) and isinstance(item.get('name'), str) and isinstance(item.get('commit'), dict) and (item['commit'].get('id') or item['commit'].get('sha')) == sha)
                    if len(found) < limit:
                        tags = tags[:20]
                        break
                else:
                    tags = None
            except (httpx.HTTPError, ValueError, TypeError, KeyError):
                tags = None
            return {'available': True, 'branch': branch, 'commit': sha, 'commit_time': date, 'commit_count': count, 'repository_size': size, 'versions': tags}
    except (httpx.HTTPError, Refused, ValueError, UnicodeError, KeyError, TypeError, OSError):
        return None


def refresh_one(project_id, forge):
    lock_id = int.from_bytes(hashlib.sha256((str(project_id) + ':' + forge).encode()).digest()[:4], 'big', signed=True)
    acquired = False
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT pg_try_advisory_lock(%s,%s)', [7348510, lock_id])
            acquired = cursor.fetchone()[0]
        if not acquired:
            return
        project = Project.objects.get(pk=project_id)
        values = (project.public_metadata or {}).get('values', {})
        signature = identity(project, values, forge)
        if not configured(project, values, forge):
            return
        observed = observe(project, values, forge)
        with transaction.atomic():
            project = Project.objects.select_for_update().get(pk=project_id)
            snapshot = dict(project.public_metadata or {})
            if identity(project, snapshot.get('values', {}), forge) != signature:
                return
            config = dict(project.configuration or {})
            records = dict(config.get('forge_repositories') or {})
            record = dict(records.get(forge) or {})
            if record.get('signature') != signature:
                record = {'signature': signature}
            if not record.get('next_check'):
                record['next_check'] = (timezone.now() + timedelta(seconds=secrets.randbelow(86400))).isoformat()
            states = dict(snapshot.get('forge_repositories') or {})
            previous = states.get(forge) if record.get('observed_signature') == signature and isinstance(states.get(forge), dict) else {}
            record['observed_signature'] = signature
            records[forge] = record
            config['forge_repositories'] = records
            if observed is None:
                value = {**previous, 'available': False}
            else:
                value = observed
                if value.get('repository_size') is None and previous.get('repository_size') is not None:
                    value['repository_size'] = previous['repository_size']
                if value.get('commit') == previous.get('commit'):
                    for key in ('commit_count', 'versions'):
                        if value.get(key) is None and previous.get(key) is not None:
                            value[key] = previous[key]
            if value != previous:
                states[forge] = value
                snapshot['forge_repositories'] = states
                snapshot['revision'] = int(snapshot.get('revision', 0)) + 1
                project.public_metadata = snapshot
                project.configuration = config
                project.save(update_fields=['configuration', 'public_metadata'])
                ProjectMetadataProjection.objects.update_or_create(pk=project.pk, defaults={'public_metadata': snapshot})
            else:
                project.configuration = config
                project.save(update_fields=['configuration'])
    finally:
        if acquired:
            with connection.cursor() as cursor:
                cursor.execute('SELECT pg_advisory_unlock(%s,%s)', [7348510, lock_id])
        close_old_connections()
        with _lock:
            _running.discard((str(project_id), forge))


def enqueue(project_id, forges=FORGES):
    project = Project.objects.filter(pk=project_id, creation_state='READY').first()
    if not project:
        return
    values = (project.public_metadata or {}).get('values', {})
    for forge in forges:
        if forge not in FORGES or not configured(project, values, forge):
            continue
        key = (str(project_id), forge)
        with _lock:
            if key in _running:
                continue
            _running.add(key)
            try:
                _pool.submit(refresh_one, project_id, forge)
            except RuntimeError:
                _running.discard(key)


def sweep():
    try:
        for project_id in Project.objects.filter(creation_state='READY').values_list('pk', flat=True):
            due = []
            with transaction.atomic():
                project = Project.objects.select_for_update().get(pk=project_id)
                values = (project.public_metadata or {}).get('values', {})
                config = dict(project.configuration or {})
                records = dict(config.get('forge_repositories') or {})
                changed = False
                now = timezone.now()
                for forge in FORGES:
                    if not configured(project, values, forge):
                        continue
                    signature = identity(project, values, forge)
                    record = dict(records.get(forge) or {})
                    if record.get('signature') != signature:
                        record = {'signature': signature, 'next_check': (now + timedelta(seconds=secrets.randbelow(86400))).isoformat()}
                        records[forge] = record
                        changed = True
                    next_check = parse_datetime(record.get('next_check', ''))
                    if next_check is None:
                        record['next_check'] = (now + timedelta(seconds=secrets.randbelow(86400))).isoformat()
                        changed = True
                    elif next_check <= now:
                        record['next_check'] = (now + timedelta(hours=24)).isoformat()
                        due.append(forge)
                        changed = True
                    records[forge] = record
                if changed:
                    config['forge_repositories'] = records
                    project.configuration = config
                    project.save(update_fields=['configuration'])
            if due:
                enqueue(project_id, due)
    finally:
        close_old_connections()
