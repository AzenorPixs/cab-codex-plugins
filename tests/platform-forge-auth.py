"""Qualification des forges avec des réponses contrôlées et un serveur TLS local."""
from contextlib import nullcontext
from copy import deepcopy
from datetime import timedelta
import errno
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import socket
import ssl
from subprocess import run
import sys
from types import SimpleNamespace
from tempfile import TemporaryDirectory
from threading import Thread
import unittest
from unittest.mock import Mock, patch
from urllib.parse import unquote, urlsplit

import django
from django.conf import settings
from django.utils import timezone
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
settings.configure(INSTALLED_APPS=['django.contrib.auth', 'django.contrib.contenttypes', 'cab_platform.core'])
django.setup()

from cab_platform import forge_auth, forge_publish_artifacts, forge_push, forge_repository, forge_settings, forge_sync, forge_version


class ForgeAuthTests(unittest.TestCase):
    token = 'jeton-fictif-confidentiel'

    def setUp(self):
        self.messages = []
        decrypt = patch.object(forge_auth, 'crypt', return_value=self.token.encode())
        decrypt.start()
        self.addCleanup(decrypt.stop)

    def observe(self, forge='GITLAB', report=True, tls_setting=''):
        project = SimpleNamespace(public_metadata={'values': {f'REMOTE_{forge}_SSL_VERIFY': tls_setting}})
        return forge_auth.observe(
            project, forge, 'https://forge.example/interne', 'alice', 'chiffré', 'projet',
            self.messages.append if report else None,
        )

    def journal(self):
        log = ''.join(self.messages)
        self.assertNotIn(self.token, log)
        self.assertNotIn('forge.example/interne', log)
        return log

    def test_dns_tcp_timeout_refusal_and_unreachable(self):
        cases = (
            (socket.gaierror(socket.EAI_NONAME, self.token), 'DNS — résolution du nom impossible'),
            (TimeoutError(self.token), 'TCP — délai d’attente dépassé'),
            (ConnectionRefusedError(errno.ECONNREFUSED, self.token), 'TCP — connexion refusée'),
            (OSError(errno.ENETUNREACH, self.token), 'TCP — réseau ou hôte inaccessible'),
        )
        for forge in ('GITLAB', 'GITHUB', 'FORGEJO'):
            for error, message in cases:
                with self.subTest(forge=forge, message=message):
                    self.messages.clear()
                    with patch('socket.create_connection', side_effect=error):
                        self.assertIsNone(self.observe(forge))
                    log = self.journal()
                    self.assertIn(message, log)
                    self.assertIn(f'{forge} — consultation du profil', log)
                    self.assertNotIn('Connexion TCP établie', log)

    def test_tls_certificate_error_and_timeout(self):
        cases = (
            (ssl.SSLCertVerificationError(self.token), 'TLS — vérification du certificat échouée'),
            (TimeoutError(self.token), 'TLS — délai d’attente dépassé'),
        )
        for error, message in cases:
            with self.subTest(message=message):
                self.messages.clear()
                with patch('socket.create_connection', return_value=Mock()), patch.object(
                    ssl.SSLContext, 'wrap_socket', side_effect=error,
                ):
                    self.assertIsNone(self.observe())
                log = self.journal()
                self.assertIn('Connexion TCP établie', log)
                self.assertIn(message, log)
                self.assertNotIn('Connexion TLS établie', log)

    def test_http_timeout_after_tls(self):
        tls_socket = Mock()
        tls_socket.send.side_effect = len
        tls_socket.recv.side_effect = TimeoutError(self.token)
        with patch('socket.create_connection', return_value=Mock()), patch.object(
            ssl.SSLContext, 'wrap_socket', return_value=tls_socket,
        ):
            self.assertIsNone(self.observe())
        log = self.journal()
        self.assertIn('Connexion TLS établie', log)
        self.assertIn('Attente de la réponse HTTP', log)
        self.assertIn('HTTP — délai d’attente dépassé', log)

    def test_http_profile_success_uses_forge_tls_policy(self):
        for forge, field in (('GITLAB', 'username'), ('GITHUB', 'login'), ('FORGEJO', 'login')):
            with self.subTest(forge=forge):
                self.messages.clear()
                body = f'{{"{field}": "alice"}}'.encode()
                tls_socket = Mock()
                tls_socket.send.side_effect = len
                tls_socket.recv.return_value = (
                    f'HTTP/1.1 200 OK\r\nContent-Length: {len(body)}\r\nConnection: close\r\n\r\n'.encode() + body
                )

                def wrap_socket(context, sock, *, server_hostname):
                    self.assertFalse(context.check_hostname)
                    self.assertEqual(context.verify_mode, ssl.CERT_NONE)
                    self.assertEqual(server_hostname, 'forge.example')
                    return tls_socket

                with patch('socket.create_connection', return_value=Mock()), patch.object(
                    ssl.SSLContext, 'wrap_socket', autospec=True, side_effect=wrap_socket,
                ):
                    self.assertIs(self.observe(forge, tls_setting='0' if forge == 'GITHUB' else ''), True)
                log = self.journal()
                self.assertIn('Connexion TLS établie', log)
                self.assertIn('HTTP 200', log)
                self.assertIn('Identité du compte vérifiée', log)

    def test_cache_signature_ignores_legacy_tls_settings(self):
        project = SimpleNamespace(configuration={})
        for forge in forge_auth.FORGES:
            expected = forge_auth.inputs(project, {}, forge)[3]
            for setting in ('0', '1', 'false', 'true', 'malformé'):
                with self.subTest(forge=forge, setting=setting):
                    values = {f'REMOTE_{forge}_SSL_VERIFY': setting}
                    self.assertEqual(forge_auth.inputs(project, values, forge)[3], expected)

    def test_rejected_token_and_background_check(self):
        client = httpx.Client(transport=httpx.MockTransport(lambda request: httpx.Response(401)))
        with patch.object(forge_auth.httpx, 'Client', return_value=client):
            self.assertIs(self.observe('FORGEJO', report=False), False)
        self.assertEqual(self.messages, [])

    def test_repository_fallbacks_separate_authenticated_and_anonymous_requests(self):
        for forge in ('GITLAB', 'GITHUB', 'FORGEJO'):
            with self.subTest(forge=forge):
                self.messages.clear()
                client = httpx.Client(transport=httpx.MockTransport(self.repository_response))
                with patch.object(forge_auth.httpx, 'Client', return_value=client) as connect:
                    self.assertIs(self.observe(forge, tls_setting='1' if forge == 'FORGEJO' else '0'), True)
                self.assertIs(connect.call_args.kwargs['verify'], False)
                log = self.journal()
                self.assertIn('HTTP 403', log)
                self.assertIn('HTTP 200', log)
                self.assertIn('HTTP 404', log)
                self.assertIn('au dépôt avec', log)
                self.assertIn('au dépôt sans', log)

    def repository_response(self, request):
        if request.url.path.endswith('/user'):
            return httpx.Response(403)
        if 'Authorization' not in request.headers:
            return httpx.Response(404)
        if request.url.path.endswith('/info/refs'):
            self.assertEqual(request.url.params['service'], 'git-upload-pack')
            return httpx.Response(200, headers={'content-type': 'application/x-git-upload-pack-advertisement'})
        return httpx.Response(200, json={'permissions': {'pull': True}})


class ForgeRefreshTests(unittest.TestCase):
    token = 'jeton-fictif-pour-le-rafraichissement'

    def fixture(self, forge, tls_setting):
        prefix = f'REMOTE_{forge}_'
        values = {
            prefix + 'BASE_URL': 'https://forge.example/interne',
            prefix + 'OWNER': 'groupe',
            prefix + 'REPOSITORY': 'projet',
            prefix + 'SSL_VERIFY': tls_setting,
        }
        project = SimpleNamespace(configuration={'forge_tokens_tpm': {forge: 'chiffré'}})
        return project, values

    def test_repository_refresh_ignores_legacy_tls_policy(self):
        for forge, setting in (('GITLAB', '0'), ('GITLAB', '1'), ('GITLAB', ''), ('FORGEJO', '1'), ('GITHUB', '1')):
            with self.subTest(forge=forge, setting=setting):
                project, values = self.fixture(forge, setting)
                messages = []
                client = httpx.Client(transport=httpx.MockTransport(lambda _: httpx.Response(403, text=self.token)))
                with patch.object(forge_repository, 'crypt', return_value=self.token.encode()), patch.object(
                    forge_repository.httpx, 'Client', return_value=client,
                ) as launch:
                    self.assertIsNone(forge_repository.observe(project, values, forge, report=messages.append))
                self.assertIs(launch.call_args.kwargs['verify'], False)
                log = ''.join(messages)
                self.assertIn('Lecture des métadonnées du dépôt', log)
                self.assertIn('Réponse HTTP 403', log)
                self.assertNotIn(self.token, log)

    def test_refresh_distinguishes_transport_failure_and_missing_configuration(self):
        project, values = self.fixture('GITLAB', '1')
        messages = []
        with patch.object(forge_repository, 'crypt', return_value=self.token.encode()), patch(
            'socket.create_connection', side_effect=socket.gaierror(socket.EAI_NONAME, self.token),
        ):
            self.assertIsNone(forge_repository.observe(project, values, 'GITLAB', report=messages.append))
        self.assertIn('DNS — résolution du nom impossible', ''.join(messages))
        self.assertNotIn(self.token, ''.join(messages))
        values.pop('REMOTE_GITLAB_REPOSITORY')
        messages.clear()
        with patch.object(forge_repository, 'crypt') as decrypt:
            self.assertIsNone(forge_repository.observe(project, values, 'GITLAB', report=messages.append))
        decrypt.assert_not_called()
        self.assertIn('nom du dépôt', ''.join(messages))

    def test_manual_refresh_endpoint_returns_only_its_own_diagnostics(self):
        from cab_platform.core import api

        def refresh(project_id, forge, **kwargs):
            self.assertEqual((project_id, forge), ('projet', 'GITLAB'))
            if not kwargs['automatic']:
                kwargs['report']('Réponse HTTP 401.\n')
            return False

        with patch.object(api, 'principal', return_value=SimpleNamespace(role='admin')), patch.object(
            api.Project.objects, 'get', return_value=SimpleNamespace(pk='projet'),
        ), patch.object(forge_repository, 'refresh_one', side_effect=refresh) as run:
            self.assertEqual(api.refresh_one_forge(None, 'projet', 'gitlab'),
                             {'available': False, 'diagnostics': 'Réponse HTTP 401.\n'})
            run.assert_called_once()
            self.assertEqual(api.refresh_one_forge(None, 'projet', 'gitlab', automatic=True),
                             {'available': False})
            self.assertNotIn('report', run.call_args.kwargs)


class LocalForge(BaseHTTPRequestHandler):
    sha = 'a' * 40

    def log_message(self, *_):
        pass

    def do_GET(self):
        self.respond()

    def do_POST(self):
        self.respond()

    def respond(self):
        target = urlsplit(self.path)
        path = unquote(target.path)
        if path.startswith('/git/'):
            if self.headers.get('Authorization') != 'Basic Z3JvdXBlOmpldG9uLWZpY3RpZg==':
                self.send_response(401)
                self.send_header('WWW-Authenticate', 'Basic realm="Dépôt de test"')
                self.end_headers()
                return
            size = int(self.headers.get('Content-Length', 0))
            env = {
                **self.server.git_env,
                'GIT_PROJECT_ROOT': str(self.server.repositories),
                'GIT_HTTP_EXPORT_ALL': '1',
                'REQUEST_METHOD': self.command,
                'PATH_INFO': path.removeprefix('/git'),
                'QUERY_STRING': target.query,
                'REMOTE_USER': 'groupe',
                'CONTENT_TYPE': self.headers.get('Content-Type', ''),
                'CONTENT_LENGTH': str(size),
            }
            result = run(['/usr/bin/git','http-backend'], input=self.rfile.read(size), env=env, capture_output=True, check=True)
            raw_headers, body = result.stdout.split(b'\r\n\r\n', 1)
            headers = dict(line.decode().split(': ', 1) for line in raw_headers.split(b'\r\n'))
            self.send_response(int(headers.pop('Status', '200').split()[0]))
        else:
            payload = {'default_branch': 'main'}
            if path.endswith('/user'):
                payload = {'username': 'groupe', 'login': 'groupe'}
            elif path.endswith('/versions'):
                payload = ['2022-11-28']
            elif path.endswith('/version'):
                payload = {'version': '1.2.3'}
            elif path.endswith('/commits'):
                payload = [{'id': self.sha, 'sha': self.sha, 'commit': {}}]
            elif path.endswith('/tags') or path.endswith('/diff'):
                payload = []
            elif path.endswith('/' + self.sha):
                payload = {'message': 'Commit de test', 'commit': {'message': 'Commit de test'}}
            elif path.endswith('/releases') and self.command == 'POST':
                self.rfile.read(int(self.headers['Content-Length']))
                payload = {'id': 1, 'tag_name': '1.0.0'}
            body = json.dumps(payload).encode()
            headers = {'Content-Type': 'application/json'}
            self.send_response(200)
        for key, value in headers.items():
            if key.lower() != 'content-length':
                self.send_header(key, value)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class ForgeTLSIntegrationTests(unittest.TestCase):
    def setUp(self):
        temporary = TemporaryDirectory(dir=os.environ.get('TMPDIR') or '.cab-tests', prefix='forge-tls-')
        self.addCleanup(temporary.cleanup)
        self.workspace = Path(temporary.name).resolve()
        self.git_env = {'PATH': '/usr/bin:/bin', 'HOME': str(self.workspace), 'GIT_CONFIG_NOSYSTEM': '1',
                        'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_TERMINAL_PROMPT': '0', 'LANG': 'C'}
        cert, key = self.workspace / 'cert.pem', self.workspace / 'key.pem'
        run(['/usr/bin/openssl', 'req', '-config', '/dev/null', '-x509', '-newkey', 'rsa:2048', '-noenc', '-days', '1',
             '-subj', '/CN=forge.fixture.invalid', '-keyout', str(key), '-out', str(cert)], capture_output=True, check=True)
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(cert, key)
        server = ThreadingHTTPServer(('127.0.0.1', 0), LocalForge)
        server.repositories = self.workspace
        server.git_env = self.git_env
        server.socket = context.wrap_socket(server.socket, server_side=True)
        worker = Thread(target=server.serve_forever, daemon=True)
        worker.start()
        self.base = f'https://127.0.0.1:{server.server_port}'

        def close():
            server.shutdown()
            server.server_close()
            worker.join()

        self.addCleanup(close)

    def git(self, directory, *args):
        return run(['/usr/bin/git','-C',str(directory),*args], env=self.git_env, capture_output=True, check=True).stdout.decode().strip()

    def test_all_forge_api_clients_accept_a_self_signed_certificate(self):
        with httpx.Client(timeout=4, trust_env=False) as verified:
            with self.assertRaises(httpx.ConnectError):
                verified.get(self.base + '/version')
        for forge in forge_auth.FORGES:
            with self.subTest(forge=forge):
                base = self.base + '/' + forge.lower()
                prefix = f'REMOTE_{forge}_'
                values = {prefix+'BASE_URL': base, prefix+'OWNER': 'groupe', prefix+'REPOSITORY': 'projet', prefix+'SSL_VERIFY': '1'}
                project = SimpleNamespace(pk='fixture', configuration={'forge_tokens_tpm': {forge: 'chiffré'}},
                    public_metadata={'values': values, 'forge_repositories': {forge: {'commit': LocalForge.sha, 'available': True}}})
                project.configuration['forge_repositories'] = {forge: {'observed_signature': forge_repository.identity(project, values, forge)}}
                with patch.object(forge_auth, 'crypt', return_value=b'jeton-fictif'), patch.object(
                    forge_repository, 'crypt', return_value=b'jeton-fictif',
                ), patch.object(forge_publish_artifacts, 'crypt', return_value=b'jeton-fictif'), patch.object(
                    forge_settings, 'crypt', return_value=b'jeton-fictif',
                ), patch.object(forge_repository.Project.objects, 'get', return_value=project):
                    self.assertIs(forge_auth.observe(project, forge, base, 'groupe', 'chiffré'), True)
                    self.assertEqual(forge_repository.observe(project, values, forge)['commit'], LocalForge.sha)
                    self.assertIn('Commit de test', forge_repository.commit_details(project, forge, LocalForge.sha)['content'])
                    self.assertEqual(forge_version.observe(project, forge, base), '2022-11-28' if forge == 'GITHUB' else '1.2.3')
                    with forge_publish_artifacts.remote(project, values, forge) as (client, _, _, root, *_):
                        mark = Mock()
                        release = forge_publish_artifacts.mutate(client, root+'/releases', mark, json={'tag_name': '1.0.0'})
                        self.assertEqual(release['tag_name'], '1.0.0')
                        mark.assert_called_once()

    def test_git_preview_push_and_atomic_sync_over_self_signed_https(self):
        local = self.workspace / 'local'
        local.mkdir()
        self.git(local, 'init', '--initial-branch=main')
        for message in ('ancien', 'nouveau'):
            (local/'etat.txt').write_text(message)
            self.git(local, 'add', 'etat.txt')
            self.git(local, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.org', 'commit', '--allow-empty', '-m', message)
        previous = self.git(local, 'rev-parse', 'HEAD^')
        head = self.git(local, 'rev-parse', 'HEAD')
        self.git(local, 'tag', 'fixture')
        branch, tag = 'refs/heads/main', 'refs/tags/fixture'
        project = SimpleNamespace(root=str(local), owner_uid=os.getuid(),
            configuration={'forge_tokens_tpm': {forge: 'chiffré' for forge in forge_auth.FORGES}})
        for forge in forge_auth.FORGES:
            with self.subTest(forge=forge), patch.object(forge_push, 'crypt', return_value=b'jeton-fictif'):
                self.git(self.workspace, 'init', '--bare', '--initial-branch=main', forge+'.git')
                url = self.base + '/git/' + forge + '.git'
                context = (project, forge, 'groupe', os.getgid(), {}, self.git_env)
                self.assertEqual(forge_push.remote_head(*context, url, 'main'), '')
                self.assertEqual(forge_sync.refs(*context, url, 'main'), ('', {}, {}))
                push = forge_push.remote_git(*context, 'push','--no-follow-tags',
                    '--force-with-lease='+branch+':', url, previous+':'+branch)
                self.assertEqual(push.returncode, 0)
                self.assertEqual(forge_sync.refs(*context, url, 'main'), (previous, {}, {}))
                sync = forge_push.remote_git(*context, 'push','--atomic','--no-follow-tags',
                    '--force-with-lease='+branch+':'+previous,'--force-with-lease='+tag+':', url,
                    head+':'+branch, tag+':'+tag)
                self.assertEqual(sync.returncode, 0)
                self.assertEqual(forge_push.remote_head(*context, url, 'main'), head)
                self.assertEqual(forge_sync.refs(*context, url, 'main'), (head, {tag: head}, {}))
                target = self.workspace / ('reception-' + forge)
                target.mkdir()
                self.git(target, 'init', '--initial-branch=travail')
                (target/'local.txt').write_text('local')
                self.git(target, 'add', 'local.txt')
                self.git(target, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.org', 'commit', '-m', 'local')
                local_head = self.git(target, 'rev-parse', 'HEAD')
                self.git(target, 'tag', 'locale')
                self.git(target, 'branch', 'autre')
                receiving = SimpleNamespace(root=str(target), owner_uid=os.getuid(), configuration=project.configuration)
                record = {'head': local_head, 'remote': head, 'local_branch': 'travail',
                          'source_tags': {'refs/tags/locale':local_head}, 'remote_tags': {tag:head}}
                (target/'non-commite.txt').touch()
                with self.assertRaises(forge_sync.Refused) as blocked:
                    forge_sync.receive(receiving, forge, 'groupe', os.getgid(), {}, self.git_env, url, 'main', record)
                self.assertEqual(blocked.exception.code, 'forge-sync-local-dirty')
                self.assertEqual(self.git(target, 'rev-parse', 'HEAD'), local_head)
                (target/'non-commite.txt').unlink()
                forge_sync.receive(receiving, forge, 'groupe', os.getgid(), {}, self.git_env, url, 'main', record)
                self.assertEqual(self.git(target, 'rev-parse', 'HEAD'), head)
                self.assertEqual(self.git(target, 'rev-parse', 'autre'), local_head)
                self.assertEqual(self.git(target, 'tag'), 'fixture')
                self.assertEqual((target/'etat.txt').read_text(), 'nouveau')
                self.assertFalse((target/'local.txt').exists())
                self.assertEqual(self.git(target, 'status', '--porcelain'), '')
                self.assertEqual(forge_sync.refs(*context, url, 'main'), (head, {tag: head}, {}))

                hook = self.workspace / (forge+'.git') / 'hooks' / 'pre-receive'
                hook.write_text('#!/bin/sh\nprintf "%s\\n" "protected branch" >&2\nexit 1\n')
                hook.chmod(0o700)
                rejected = forge_push.remote_git(*context, 'push', '--atomic', '--porcelain', '--no-follow-tags',
                    '--force-with-lease='+branch+':'+head, '--force-with-lease='+tag+':'+head, url,
                    previous+':'+branch, ':'+tag)
                self.assertNotEqual(rejected.returncode, 0)
                self.assertEqual(forge_push.push_rejection(rejected, {branch, tag}),
                                 ('forge-push-protected-branch', True))
                self.assertEqual(forge_push.push_rejection(rejected, {branch, tag, 'refs/tags/extra'}),
                                 ('forge-push-protected-branch', False))
                self.assertEqual(forge_sync.refs(*context, url, 'main'), (head, {tag: head}, {}))


class GitLabSyncProtectionTests(unittest.TestCase):
    head='a'*40
    before='b'*40

    def check(self,*,ancestor=1,can_push=True,rules=None,observed=None,shallow=False):
        project=SimpleNamespace(configuration={'forge_tokens_tpm':{'GITLAB':'fixture'}})
        values={'REMOTE_GITLAB_OWNER':'group','REMOTE_GITLAB_REPOSITORY':'project',
                'REMOTE_GITLAB_BASE_URL':'https://fixture'}
        def respond(request):
            if request.url.path.endswith('/repository/branches/main'):
                return httpx.Response(200,json={'commit':{'id':observed or self.before},
                                                'protected':True,'can_push':can_push})
            self.assertTrue(request.url.path.endswith('/protected_branches'))
            return httpx.Response(200,json=rules if rules is not None else [
                {'name':'main','allow_force_push':False}])
        with httpx.Client(transport=httpx.MockTransport(respond)) as client, \
             patch.object(forge_sync,'forge_client',return_value=nullcontext(client)), \
             patch.object(forge_sync,'crypt',return_value=b'fixture'), \
             patch.object(forge_sync,'local_git',return_value=b'true\n' if shallow else b'false\n'), \
             patch.object(forge_sync,'local_result',return_value=SimpleNamespace(returncode=ancestor)):
            forge_sync.gitlab_sync_preflight(project,values,'main',self.head,self.before,{},{})

    def test_protected_divergent_branch_refuses_before_push(self):
        with self.assertRaisesRegex(forge_sync.Refused,'forge-sync-gitlab-force-push-forbidden') as failure:
            self.check()
        self.assertEqual(failure.exception.details,{'branch':'main','head':self.head,'remote':self.before})

    def test_push_permission_and_force_push_are_distinct(self):
        with self.assertRaisesRegex(forge_sync.Refused,'forge-sync-gitlab-push-forbidden'):
            self.check(ancestor=0,can_push=False)
        self.check(ancestor=0)
        self.check(ancestor=128)
        self.check(shallow=True)
        self.check(observed='c'*40)

    def test_applicable_wildcard_can_allow_force_push(self):
        self.check(rules=[{'name':'main','allow_force_push':False},
                          {'name':'ma*','allow_force_push':True}])
        with self.assertRaisesRegex(forge_sync.Refused,'forge-sync-gitlab-force-push-forbidden'):
            self.check(rules=[{'name':'main','allow_force_push':False},
                              {'name':'other*','allow_force_push':True}])


class ForgeReconciliationTests(unittest.TestCase):
    head = 'a' * 40
    before = 'b' * 40
    tags = {'refs/tags/1.0.0': head}

    def setUp(self):
        self.values = {'REMOTE_GITLAB_BASE_URL': 'https://forge.example', 'REMOTE_GITLAB_BRANCH': 'main'}
        self.project = SimpleNamespace(root='/fixture', configuration={}, public_metadata={'values': self.values})
        self.receipt = {
            'nonce': 'ancienne-operation', 'actor': '7', 'state': 'UNKNOWN', 'head': self.head, 'remote': self.before,
            'branch': 'main', 'signature': forge_repository.identity(self.project, self.values, 'GITLAB'),
        }
        self.project.configuration['forge_push'] = {'GITLAB': self.receipt}
        self.locked = SimpleNamespace(root=self.project.root, configuration=deepcopy(self.project.configuration),
                                      public_metadata=deepcopy(self.project.public_metadata), save=Mock())
        self.patch(forge_sync.Project.objects, 'get', return_value=self.project)
        self.patch(forge_sync.Project.objects, 'select_for_update', return_value=SimpleNamespace(get=Mock(return_value=self.locked)))
        self.patch(forge_sync.transaction, 'atomic', side_effect=nullcontext)
        self.patch(forge_sync, 'context', return_value=(self.values, 'groupe', 'main', 'https://forge.example/depot.git', 1, {}, {}))
        self.branch = self.patch(forge_sync, 'remote_head', return_value=self.head)
        self.refs = self.patch(forge_sync, 'refs', return_value=(self.head, self.tags, {}))
        self.event = self.patch(forge_sync.Event.objects, 'create', return_value=SimpleNamespace(pk=42))

    def patch(self, obj, name, **kwargs):
        patcher = patch.object(obj, name, **kwargs)
        self.addCleanup(patcher.stop)
        return patcher.start()

    def as_sync(self):
        self.receipt['source_tags'] = self.tags
        self.project.configuration['forge_sync'] = self.project.configuration.pop('forge_push')
        self.locked.configuration = deepcopy(self.project.configuration)

    def reconcile(self, confirmation=None):
        return forge_sync.reconcile('projet', 'GITLAB', '8', confirmation)

    def refused(self, code):
        with self.assertRaises(forge_sync.Refused) as failure:
            self.reconcile()
        self.assertEqual(failure.exception.code, code)
        self.event.assert_not_called()
        self.locked.save.assert_not_called()

    def test_exact_branch_releases_protection_and_keeps_initial_receipt(self):
        self.assertEqual(self.reconcile(), {'reconciled': True, 'receipt_id': 42})
        self.branch.assert_called_once()
        self.refs.assert_not_called()
        saved = self.locked.configuration['forge_push']['GITLAB']
        self.assertEqual((saved['state'],saved['reconciliation_id']), ('RECONCILED',42))
        proof = self.event.call_args.kwargs['data']
        self.assertEqual(proof['receipt']['state'], 'UNKNOWN')
        self.assertEqual(proof['receipt']['remote'], self.before)
        self.assertNotIn('nonce', proof['receipt'])
        self.assertEqual(proof['observed'], {'branch':'main','head':self.head})

    def test_exact_branch_and_all_tags_reconcile_sync(self):
        self.as_sync()
        self.assertTrue(self.reconcile()['reconciled'])
        self.branch.assert_not_called()
        self.refs.assert_called_once()
        self.assertEqual(self.locked.configuration['forge_sync']['GITLAB']['state'], 'RECONCILED')
        self.assertEqual(self.event.call_args.kwargs['data']['observed']['tags'], self.tags)

    def test_sync_rejection_requires_unchanged_references(self):
        self.as_sync()
        record = self.locked.configuration['forge_sync']['GITLAB']
        record.update(state='READY', local_branch='main', remote_tags={}, source='local',
                      expires=(timezone.now()+timedelta(minutes=5)).isoformat())
        self.patch(forge_sync, 'local_position', return_value=('main', self.head))
        self.patch(forge_sync, 'local_tags', return_value=self.tags)
        status = (b'!\tabc:refs/heads/main\t[remote rejected] (hook declined)\n'
                  b'!\tabc:refs/tags/1.0.0\t[remote rejected] (hook declined)\n')
        self.patch(forge_sync, 'remote_git', return_value=SimpleNamespace(
            returncode=1, stdout=status, stderr=b'protected branch'))
        for observed,state,code in (
            ((self.before, {}, {}), 'FAILED', 'forge-push-protected-branch'),
            ((self.head, {}, {}), 'UNKNOWN', 'forge-push-result-unknown'),
        ):
            with self.subTest(state=state):
                self.locked.configuration['forge_sync']['GITLAB'] = dict(record)
                self.refs.side_effect = [(self.before, {}, {}), observed]
                with self.assertRaises(forge_sync.Refused) as error:
                    forge_sync.execute('projet', 'GITLAB', '7', record['nonce'])
                self.assertEqual(error.exception.code, code)
                self.assertEqual(self.locked.configuration['forge_sync']['GITLAB']['state'], state)
                self.assertEqual(self.locked.configuration['forge_sync']['GITLAB']['diagnostic'], 'forge-push-protected-branch')

    def test_sync_rechecks_gitlab_rule_before_marking_running(self):
        self.as_sync()
        record = self.locked.configuration['forge_sync']['GITLAB']
        record.update(state='READY',local_branch='main',remote_tags={},source='local',
                      expires=(timezone.now()+timedelta(minutes=5)).isoformat())
        self.refs.return_value=(self.before,{}, {})
        self.patch(forge_sync,'local_position',return_value=('main',self.head))
        self.patch(forge_sync,'local_tags',return_value=self.tags)
        self.patch(forge_sync,'gitlab_sync_preflight',
                   side_effect=forge_sync.Refused('forge-sync-gitlab-force-push-forbidden'))
        push=self.patch(forge_sync,'remote_git')
        with self.assertRaisesRegex(forge_sync.Refused,'forge-sync-gitlab-force-push-forbidden'):
            forge_sync.execute('projet','GITLAB','7',record['nonce'])
        push.assert_not_called()
        self.assertEqual(self.locked.configuration['forge_sync']['GITLAB']['state'],'READY')

    def test_running_remains_protected_without_observation(self):
        self.receipt['state'] = 'RUNNING'
        self.refused('forge-reconcile-running')
        self.branch.assert_not_called()
        self.refs.assert_not_called()

    def test_previews_report_pending_before_contacting_forge(self):
        with patch.object(forge_push, 'context') as push_context, patch.object(forge_sync, 'context') as sync_context:
            for prepare in (forge_push.prepare, forge_sync.prepare):
                with self.assertRaises(forge_sync.Refused) as failure:
                    prepare('projet', 'GITLAB', '8')
                self.assertEqual(failure.exception.code, 'forge-push-pending')
            push_context.assert_not_called()
            sync_context.assert_not_called()

    def test_divergent_branch_stays_protected(self):
        self.branch.return_value = self.before
        result = self.reconcile()
        self.assertFalse(result['reconciled'])
        self.assertEqual(result['error'], 'forge-reconcile-branch-diverged')
        self.assertEqual(result['details']['observed'], self.before)
        self.event.assert_not_called()
        self.locked.save.assert_not_called()

    def test_additional_remote_tag_stays_protected(self):
        self.as_sync()
        self.refs.return_value = (self.head, {**self.tags, 'refs/tags/autre': self.before}, {})
        result = self.reconcile()
        self.assertEqual(result['error'], 'forge-reconcile-tags-diverged')
        self.assertEqual(result['details']['tag_count'], 1)
        self.event.assert_not_called()
        self.locked.save.assert_not_called()

    def test_admin_closes_divergence_after_same_observation(self):
        self.branch.return_value = self.before
        confirmation = self.reconcile()['details']['confirmation']
        result = self.reconcile(confirmation)
        self.assertTrue(result['closed_unconfirmed'])
        self.assertEqual(self.locked.configuration['forge_push']['GITLAB']['state'], 'CLOSED_UNCONFIRMED')
        self.assertEqual(self.event.call_args.kwargs['data']['receipt']['state'], 'UNKNOWN')
        self.assertEqual(self.branch.call_count, 2)

    def test_confirmation_rejects_changed_observation(self):
        self.branch.return_value = self.before
        confirmation = self.reconcile()['details']['confirmation']
        self.branch.return_value = 'c' * 40
        with self.assertRaises(forge_sync.Refused) as failure:
            self.reconcile(confirmation)
        self.assertEqual(failure.exception.code, 'forge-reconcile-observation-changed')
        self.event.assert_not_called()
        self.locked.save.assert_not_called()

    def test_unavailable_remote_stays_protected(self):
        self.branch.side_effect = forge_sync.Refused('forge-push-preflight-unavailable', 409)
        self.refused('forge-reconcile-observation-unavailable')

    def test_changed_receipt_stays_protected(self):
        self.locked.configuration['forge_push']['GITLAB']['nonce'] = 'autre-operation'
        self.refused('forge-reconcile-receipt-changed')

    def test_changed_configuration_stays_protected(self):
        self.locked.public_metadata['values']['REMOTE_GITLAB_BASE_URL'] = 'https://autre.example'
        self.refused('forge-push-configuration-changed')


if __name__ == '__main__':
    unittest.main(verbosity=2)
