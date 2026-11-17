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
from .core.commands import Refused, require
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


def commit_details(project, forge, commit):
    """Lit les métadonnées du dernier commit observé sur la forge."""
    require(forge in FORGES and isinstance(commit, str) and len(commit) in (40, 64) and all(c in '0123456789abcdef' for c in commit), 'forge-commit-unavailable', 409)
    snapshot = project.public_metadata or {}
    values = snapshot.get('values', {})
    record = (snapshot.get('forge_repositories') or {}).get(forge) or {}
    signature = identity(project, values, forge)
    observed = ((project.configuration or {}).get('forge_repositories') or {}).get(forge) or {}
    require(record.get('available') is True and record.get('commit') == commit and observed.get('observed_signature') == signature and configured(project, values, forge), 'forge-commit-unavailable', 409)
    prefix = 'REMOTE_' + forge + '_'
    base = base_for(values, forge)
    owner, repo = values.get(prefix + 'OWNER', ''), values.get(prefix + 'REPOSITORY', '')
    require(isinstance(owner, str) and isinstance(repo, str) and owner and repo and '/' not in repo and repo not in ('.', '..') and all(part and part not in ('.', '..') for part in owner.split('/')), 'forge-commit-unavailable', 409)
    try:
        encrypted = project.configuration['forge_tokens_tpm'][forge]
        token = crypt(project, forge, encrypted.encode(), True).decode('utf-8')
        require(bool(token) and not any(char in token for char in '\r\n\0'), 'forge-commit-unavailable', 409)
        headers = {'Accept': 'application/json', 'User-Agent': 'CAB-forge-commit'}
        headers['PRIVATE-TOKEN' if forge == 'GITLAB' else 'Authorization'] = token if forge == 'GITLAB' else ('token ' if forge == 'FORGEJO' else 'Bearer ') + token
        parts = urlsplit(base)
        github_public = forge == 'GITHUB' and parts.hostname.lower() == 'github.com' and parts.port in (None, 443) and parts.path in ('', '/')
        if forge == 'GITLAB':
            root = base + '/api/v4/projects/' + quote(owner + '/' + repo, safe='') + '/repository/commits/' + commit
        else:
            api = ('https://api.github.com' if github_public else base + '/api/v3') if forge == 'GITHUB' else base + '/api/v1'
            root = api + '/repos/' + '/'.join(quote(part, safe='') for part in owner.split('/')) + '/' + quote(repo, safe='') + ('/git/commits/' if forge == 'FORGEJO' else '/commits/') + commit
        with httpx.Client(timeout=8, follow_redirects=False, trust_env=False, headers=headers) as client:
            data, _ = get_json(client, root)
            require(isinstance(data, dict), 'forge-commit-unavailable', 409)
            payload = data if forge == 'GITLAB' else data.get('commit')
            require(isinstance(payload, dict), 'forge-commit-unavailable', 409)
            author = payload.get('author') if isinstance(payload.get('author'), dict) else {}
            name = payload.get('author_name') if forge == 'GITLAB' else author.get('name')
            email = payload.get('author_email') if forge == 'GITLAB' else author.get('email')
            date = payload.get('committed_date') if forge == 'GITLAB' else (payload.get('committer') or {}).get('date') if isinstance(payload.get('committer'), dict) else None
            message = payload.get('message')
            def text(value, limit):
                return value[:limit] if isinstance(value, str) and value else 'Non disponible'
            author_line = text(name, 300) + (' <' + email[:300] + '>' if isinstance(email, str) and email else '')
            content = 'Commit : ' + commit + '\nAuteur : ' + author_line + '\nDate : ' + text(date, 100) + '\n\nMessage :\n' + text(message, 16000)
            files = data.get('files')
            if forge == 'GITLAB':
                try:
                    files, _ = get_json(client, root + '/diff', params={'per_page': 100})
                except (httpx.HTTPError, ValueError, KeyError, TypeError):
                    files = None
            if isinstance(files, list):
                names = []
                for item in files[:100]:
                    if not isinstance(item, dict):continue
                    filename = item.get('filename') or item.get('new_path') or item.get('old_path')
                    if isinstance(filename, str) and filename:
                        names.append(filename[:1000].replace('\n', ' ').replace('\r', ' '))
                if names:
                    content += '\n\nFichiers modifiés' + (' (100 premiers)' if len(files) >= 100 else '') + ' :\n' + '\n'.join(names)
            current = Project.objects.get(pk=project.pk)
            latest = current.public_metadata or {}
            require(identity(current, latest.get('values', {}), forge) == signature and ((latest.get('forge_repositories') or {}).get(forge) or {}).get('commit') == commit, 'forge-commit-unavailable', 409)
            return {'content': content}
    except (httpx.HTTPError, ValueError, UnicodeError, KeyError, TypeError, OSError):
        raise Refused('forge-commit-unavailable', 409) from None


def publish_refresh(project_id, forge, running):
    with transaction.atomic():
        project = Project.objects.select_for_update().get(pk=project_id)
        snapshot = dict(project.public_metadata or {})
        statuses = dict(snapshot.get('forge_refresh') or {})
        statuses[forge] = {'running': running, 'started_at': timezone.now().timestamp() if running else None}
        snapshot['forge_refresh'] = statuses
        snapshot['revision'] = int(snapshot.get('revision', 0)) + 1
        project.public_metadata = snapshot
        project.save(update_fields=['public_metadata'])
        ProjectMetadataProjection.objects.update_or_create(pk=project.pk, defaults={'public_metadata': snapshot})


def refresh_one(project_id, forge, *, wait=False, managed=True, automatic=True):
    lock_id = int.from_bytes(hashlib.sha256((str(project_id) + ':' + forge).encode()).digest()[:4], 'big', signed=True)
    acquired = False
    announced = False
    try:
        with connection.cursor() as cursor:
            if wait:
                cursor.execute('SELECT pg_advisory_lock(%s,%s)', [7348510, lock_id])
                acquired = True
            else:
                cursor.execute('SELECT pg_try_advisory_lock(%s,%s)', [7348510, lock_id])
                acquired = cursor.fetchone()[0]
        if not acquired:
            return
        project = Project.objects.get(pk=project_id)
        values = (project.public_metadata or {}).get('values', {})
        signature = identity(project, values, forge)
        if not configured(project, values, forge):
            return False
        from .git_monitor_config import read as read_monitor_settings
        with transaction.atomic():
            current = Project.objects.select_for_update().get(pk=project_id)
            current_values = (current.public_metadata or {}).get('values', {})
            if identity(current, current_values, forge) != signature:
                return False
            config = dict(current.configuration or {})
            records = dict(config.get('forge_repositories') or {})
            record = dict(records.get(forge) or {})
            if record.get('signature') != signature:
                record = {'signature': signature}
            now = timezone.now()
            last_check = parse_datetime(record.get('last_check', ''))
            interval = read_monitor_settings()['forge_auto_interval_minutes']
            if automatic and last_check is not None and timezone.is_aware(last_check) and (now - last_check).total_seconds() < interval * 60:
                return True
            record['last_check'] = now.isoformat()
            records[forge] = record
            config['forge_repositories'] = records
            current.configuration = config
            current.save(update_fields=['configuration'])
        publish_refresh(project_id, forge, True)
        announced = True
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
        if observed is not None:
            from .forge_auth import refresh_one as refresh_auth
            refresh_auth(project_id, forge, managed=False)
        from .forge_comparison import enqueue
        enqueue(project_id)
        return observed is not None
    finally:
        try:
            if announced:
                publish_refresh(project_id, forge, False)
        finally:
            if acquired:
                with connection.cursor() as cursor:
                    cursor.execute('SELECT pg_advisory_unlock(%s,%s)', [7348510, lock_id])
            close_old_connections()
            if managed:
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
