"""Observation bornée des dépôts distants et projection PostgreSQL."""
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from functools import partial
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
from .forge_auth import forge_request
from .forge_settings import crypt, forge_client
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


def missing_configuration(project, values, forge):
    prefix = 'REMOTE_' + forge + '_'
    required = (
        ('URL HTTPS valide', base_for(values, forge)),
        ('propriétaire du dépôt', values.get(prefix + 'OWNER')),
        ('nom du dépôt', values.get(prefix + 'REPOSITORY')),
        ('jeton de forge enregistré', (project.configuration or {}).get('forge_tokens_tpm', {}).get(forge)),
    )
    return [label for label, value in required if not value]


def configured(project, values, forge):
    return not missing_configuration(project, values, forge)


def get_json(client, url, *, headers=None, report=None, operation='', max_bytes=1048576, **kwargs):
    with forge_request(client, url, headers, report, operation, **kwargs) as response:
        if report:
            report(f'Réponse HTTP {response.status_code}.\n')
        response.raise_for_status()
        data = b''
        for chunk in response.iter_bytes():
            data += chunk
            if len(data) > max_bytes:
                if report:
                    report('La réponse dépasse la taille autorisée.\n')
                raise ValueError('Réponse distante trop volumineuse')
        return json.loads(data), dict(response.headers)


def observe(project, values, forge, report=None):
    prefix = 'REMOTE_' + forge + '_'
    base = base_for(values, forge)
    owner, repo = values.get(prefix + 'OWNER', ''), values.get(prefix + 'REPOSITORY', '')
    branch = values.get(prefix + 'BRANCH', '')
    missing = missing_configuration(project, values, forge)
    if missing:
        if report:
            report('Configuration incomplète ou invalide — ' + ', '.join(missing) + '.\n')
        return None
    if not all(isinstance(x, str) for x in (owner, repo, branch)):
        if report:
            report('Les paramètres du dépôt ou de la branche sont invalides.\n')
        return None
    if not owner or not repo or '/' in repo or repo in ('.', '..') or any(not x or x in ('.', '..') for x in owner.split('/')):
        if report:
            report('Le propriétaire ou le nom du dépôt est invalide.\n')
        return None
    try:
        if report:
            report('Déchiffrement local du jeton.\n')
        encrypted = project.configuration['forge_tokens_tpm'][forge]
        token = crypt(project, forge, encrypted.encode(), True).decode('utf-8')
        if not token or any(x in token for x in '\r\n\0'):
            if report:
                report('Le jeton est vide ou invalide.\n')
            return None
        headers = {'Accept': 'application/json', 'User-Agent': 'CAB-forge-repository'}
        headers['PRIVATE-TOKEN' if forge == 'GITLAB' else 'Authorization'] = token if forge == 'GITLAB' else ('token ' if forge == 'FORGEJO' else 'Bearer ') + token
        parts = urlsplit(base)
        github_public = forge == 'GITHUB' and parts.hostname.lower() == 'github.com' and parts.port in (None, 443) and parts.path in ('', '/')
        if forge == 'GITLAB':
            api = base + '/api/v4'
            root = api + '/projects/' + quote(owner + '/' + repo, safe='')
        else:
            api = ('https://api.github.com' if github_public else base + '/api/v3') if forge == 'GITHUB' else base + '/api/v1'
            root = api + '/repos/' + '/'.join(quote(x, safe='') for x in owner.split('/')) + '/' + quote(repo, safe='')
        if report:
            report(f'Vérification du certificat TLS désactivée pour cette forge {forge}.\n')
        read = partial(get_json, report=report)
        with forge_client(timeout=8, headers=headers) as client:
            info, _ = read(client, root, operation='Lecture des métadonnées du dépôt', params={'statistics': 'true'} if forge == 'GITLAB' else {})
            if not isinstance(info, dict):
                if report:
                    report('La forge n’a pas renvoyé de métadonnées de dépôt exploitables.\n')
                return None
            branch = branch or info.get('default_branch') or ''
            if not isinstance(branch, str) or not branch:
                if report:
                    report('Aucune branche exploitable dans la configuration ou la réponse de la forge.\n')
                return None
            size = info.get('statistics', {}).get('repository_size') if forge == 'GITLAB' and isinstance(info.get('statistics'), dict) else info.get('size')
            if not isinstance(size, int) or isinstance(size, bool) or size < 0:
                size = None
            elif forge != 'GITLAB':
                size *= 1024
            endpoint = root + ('/repository/commits' if forge == 'GITLAB' else '/commits')
            params = {'ref_name': branch, 'per_page': 1} if forge == 'GITLAB' else {'sha': branch, 'per_page' if forge == 'GITHUB' else 'limit': 1}
            commits, response_headers = read(client, endpoint, operation='Lecture du dernier commit de la branche', params=params)
            if not isinstance(commits, list) or not commits or not isinstance(commits[0], dict):
                if report:
                    report('La forge n’a pas renvoyé de commit exploitable pour cette branche.\n')
                return None
            first = commits[0]
            sha = first.get('id') if forge == 'GITLAB' else first.get('sha')
            details = first.get('commit', {}) if forge != 'GITLAB' else first
            date = details.get('committed_date') if forge == 'GITLAB' else details.get('committer', {}).get('date') if isinstance(details.get('committer'), dict) else None
            if not isinstance(sha, str) or not 7 <= len(sha) <= 64 or any(c not in '0123456789abcdef' for c in sha):
                if report:
                    report('La forge a renvoyé un identifiant de commit invalide.\n')
                return None
            if not isinstance(date, str) or not parse_datetime(date):
                date = None
            count = response_headers.get('x-total-count') if forge == 'FORGEJO' else response_headers.get('x-total') if forge == 'GITLAB' else None
            count = int(count) if isinstance(count, str) and count.isdecimal() else None
            if forge == 'GITHUB':
                graphql = 'https://api.github.com/graphql' if github_public else base + '/api/graphql'
                query = 'query($owner:String!,$repo:String!,$ref:String!){repository(owner:$owner,name:$repo){object(expression:$ref){... on Commit{history{totalCount}}}}}'
                try:
                    document, _ = read(client, graphql, operation='Lecture du nombre de commits', method='POST',
                                       max_bytes=262144, json={'query': query, 'variables': {'owner': owner, 'repo': repo, 'ref': sha}})
                    if isinstance(document, dict):
                        history = (((document.get('data') or {}).get('repository') or {}).get('object') or {}).get('history') or {}
                        candidate = history.get('totalCount') if isinstance(history, dict) else None
                        if isinstance(candidate, int) and not isinstance(candidate, bool) and candidate >= 0:
                            count = candidate
                except (httpx.HTTPError, ValueError, TypeError, KeyError):
                    if report:
                        report('Nombre de commits indisponible.\n')
            tags = None
            try:
                tags_url = root + ('/repository/tags' if forge == 'GITLAB' else '/tags')
                tags = []
                limit = 50 if forge == 'FORGEJO' else 100
                for page in range(1, 11):
                    params = {'page': page, 'limit' if forge == 'FORGEJO' else 'per_page': limit}
                    found, _ = read(client, tags_url, operation=f'Lecture des tags associés au commit — page {page}', params=params)
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
            if report and tags is None:
                report('Tags associés au commit indisponibles.\n')
            from .forge_artifacts import observe as observe_artifacts
            artifacts = observe_artifacts(client,partial(read,operation='Lecture des artefacts publiés'),values,root,api,forge,owner,repo,info,
                                         known_debian=(project.configuration or {}).get('gitlab_debian_publications'))
            return {'available': True, 'branch': branch, 'commit': sha, 'commit_time': date, 'commit_count': count, 'repository_size': size, 'versions': tags, 'published_artifacts': artifacts}
    except (httpx.RequestError, httpx.HTTPStatusError):
        return None
    except (Refused, ValueError, UnicodeError, KeyError, TypeError, OSError) as error:
        if report:
            report(f'Lecture du dépôt impossible — {type(error).__name__}.\n')
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
        with forge_client(timeout=8, headers=headers) as client:
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


def refresh_one(project_id, forge, *, wait=False, managed=True, automatic=True, report=None):
    lock_id = int.from_bytes(hashlib.sha256((str(project_id) + ':' + forge).encode()).digest()[:4], 'big', signed=True)
    acquired = False
    announced = False
    try:
        if report:
            report('Attente de l’accès au rafraîchissement de la forge.\n')
        with connection.cursor() as cursor:
            if wait:
                cursor.execute('SELECT pg_advisory_lock(%s,%s)', [7348510, lock_id])
                acquired = True
            else:
                cursor.execute('SELECT pg_try_advisory_lock(%s,%s)', [7348510, lock_id])
                acquired = cursor.fetchone()[0]
        if not acquired:
            if report:
                report('Un autre rafraîchissement de cette forge est en cours.\n')
            return
        project = Project.objects.get(pk=project_id)
        values = (project.public_metadata or {}).get('values', {})
        signature = identity(project, values, forge)
        if report:
            report('Lecture des paramètres enregistrés.\n')
        missing = missing_configuration(project, values, forge)
        if missing:
            if report:
                report('Configuration incomplète ou invalide — ' + ', '.join(missing) + '.\n')
            return False
        from .git_monitor_config import read as read_monitor_settings
        with transaction.atomic():
            current = Project.objects.select_for_update().get(pk=project_id)
            current_values = (current.public_metadata or {}).get('values', {})
            if identity(current, current_values, forge) != signature:
                if report:
                    report('La configuration a changé avant le rafraîchissement.\n')
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
        observed = observe(project, values, forge, report=report) if report else observe(project, values, forge)
        with transaction.atomic():
            project = Project.objects.select_for_update().get(pk=project_id)
            snapshot = dict(project.public_metadata or {})
            latest_values=snapshot.get('values',{})
            if identity(project, latest_values, forge) != signature:
                if report:
                    report('La configuration a changé pendant le rafraîchissement. Résultat écarté.\n')
                return
            from .forge_artifacts import persist
            persist(project,latest_values,forge,observed.pop('published_artifacts',{}) if observed else {})
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
            if report:
                report('Vérification de l’authentification de la forge.\n')
                refresh_auth(project_id, forge, managed=False, report=report)
            else:
                refresh_auth(project_id, forge, managed=False)
        elif report:
            report('Actualisation indisponible. Les dernières données valides sont conservées.\n')
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
