"""Vérification du diagnostic HTTPX d’authentification sans accès réseau."""
import errno
from pathlib import Path
import socket
import ssl
import sys
import unittest
from unittest.mock import Mock, patch

import django
from django.conf import settings
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
settings.configure(INSTALLED_APPS=['django.contrib.auth', 'django.contrib.contenttypes', 'cab_platform.core'])
django.setup()

from cab_platform import forge_auth


class ForgeAuthTests(unittest.TestCase):
    token = 'jeton-fictif-confidentiel'

    def setUp(self):
        self.messages = []
        decrypt = patch.object(forge_auth, 'crypt', return_value=self.token.encode())
        decrypt.start()
        self.addCleanup(decrypt.stop)

    def observe(self, forge='GITLAB', report=True):
        return forge_auth.observe(
            None, forge, 'https://forge.example/interne', 'alice', 'chiffré', 'projet',
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

    def test_http_profile_success_keeps_tls_verification(self):
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
                    self.assertTrue(context.check_hostname)
                    self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
                    self.assertEqual(server_hostname, 'forge.example')
                    return tls_socket

                with patch('socket.create_connection', return_value=Mock()), patch.object(
                    ssl.SSLContext, 'wrap_socket', autospec=True, side_effect=wrap_socket,
                ):
                    self.assertIs(self.observe(forge), True)
                log = self.journal()
                self.assertIn('Connexion TLS établie', log)
                self.assertIn('HTTP 200', log)
                self.assertIn('Identité du compte vérifiée', log)

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
                with patch.object(forge_auth.httpx, 'Client', return_value=client):
                    self.assertIs(self.observe(forge), True)
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


if __name__ == '__main__':
    unittest.main(verbosity=2)
