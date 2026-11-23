"""Qualification des forges avec des réponses contrôlées et un serveur TLS local."""
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
                self.assertEqual(forge_sync.refs(*context, url, 'main'), ('', {}, {}))
                push = forge_push.remote_git(*context, 'push','--no-follow-tags',
                    '--force-with-lease='+branch+':', url, previous+':'+branch)
                self.assertEqual(push.returncode, 0)
                self.assertEqual(forge_sync.refs(*context, url, 'main'), (previous, {}, {}))
                sync = forge_push.remote_git(*context, 'push','--atomic','--no-follow-tags',
                    '--force-with-lease='+branch+':'+previous,'--force-with-lease='+tag+':', url,
                    head+':'+branch, tag+':'+tag)
                self.assertEqual(sync.returncode, 0)
                self.assertEqual(forge_sync.refs(*context, url, 'main'), (head, {tag: head}, {}))


if __name__ == '__main__':
    unittest.main(verbosity=2)
