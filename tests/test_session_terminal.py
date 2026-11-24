"""Console Web et shell isolé sur un projet synthétique."""
from base64 import b64decode
import os
import pwd
import socket
from pathlib import Path
from shlex import quote
import sys
from tempfile import TemporaryDirectory
from time import monotonic, sleep
from types import SimpleNamespace
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from django.conf import settings
if not settings.configured:
    settings.configure(SECRET_KEY='fixture', USE_TZ=True,
                       INSTALLED_APPS=['django.contrib.auth', 'django.contrib.contenttypes', 'cab_platform.core'])
import django
django.setup()

from cab_platform import session_terminal as terminal
from cab_platform.core import api
from cab_platform.core.commands import Refused


class SessionTerminalTests(unittest.TestCase):
    def test_rejects_other_actor_and_inactive_run(self):
        payload = api.SessionTerminalInput(action='open')
        request = SimpleNamespace(session=SimpleNamespace(session_key='browser'))
        with patch.object(api, 'principal', return_value=SimpleNamespace(agent='codex', pk='actor')) as auth:
            with self.assertRaisesRegex(Refused, 'session-terminal-web-admin-required'):
                api.session_terminal(request, 'project', 'run', payload)
            auth.assert_called_once_with(request, admin=True)
        with self.assertRaisesRegex(Refused, 'session-terminal-run-inactive'):
            terminal.access(SimpleNamespace(pk=1, state='CLOSED', suspension=''),
                            'admin', 'browser', 'open')

    def test_access_uses_admin_browser_and_same_run(self):
        request = SimpleNamespace(session=SimpleNamespace(session_key='browser'))
        run = object()
        body = api.SessionTerminalInput(action='poll', terminal_id='terminal', offset=4)
        with patch.object(api, 'principal', return_value=SimpleNamespace(agent='web', pk='admin')), \
                patch.object(api.commands, 'run_scope', return_value=run), \
                patch.object(terminal, 'access', return_value={'closed': True}) as access:
            response = api.session_terminal(request, 'project', 'run', body)
            access.assert_called_once_with(run, 'admin', 'browser',
                                           action='poll', terminal_id='terminal', offset=4, text='')
            self.assertEqual(response['Cache-Control'], 'private, no-store')

    @unittest.skipUnless(os.environ.get('CAB_TERMINAL_NAMESPACE_TEST') == '1',
                         'Les espaces de noms sont qualifiés sur l’hôte.')
    def test_shell_is_root_only_in_its_sandbox_and_closes(self):
        with TemporaryDirectory() as directory:
            project = Path(directory)
            workspace = project / '.cab-tests' / 'run'
            workspace.mkdir(parents=True)
            secret = project / 'project.env'
            secret.write_text('SYNTHETIC_SECRET=fixture')
            uid = int(os.environ['CAB_TERMINAL_TEST_UID']) if os.geteuid() == 0 else os.getuid()
            if os.geteuid() == 0:
                gid = pwd.getpwuid(uid).pw_gid
                for path in (project, project/'.cab-tests', workspace, secret):
                    os.chown(path, uid, gid)
            run = SimpleNamespace(pk=51, state='WORKING', suspension='', generation=1,
                                  run_id='run', change='change', session_id='session',
                                  actor=SimpleNamespace(uid=uid), project=SimpleNamespace(root=str(project)))
            with socket.socket() as listener, patch('cab_platform.workshops.workshop', return_value=workspace):
                listener.bind(('127.0.0.1', 0))
                listener.listen()
                port = listener.getsockname()[1]
                network_test = (f'import socket;s=socket.socket();s.settimeout(.5);'
                                f'print("isolated_OK" if s.connect_ex(("127.0.0.1",{port})) else "network_BAD")')
                started = terminal.access(run, 'admin', 'browser', 'open')
                token = started['terminal_id']
                try:
                    repeated = terminal.access(run, 'admin', 'browser', 'open')
                    self.assertEqual(repeated['terminal_id'], token)
                    with self.assertRaisesRegex(Refused, 'session-terminal-not-found'):
                        terminal.access(run, 'admin', 'other-browser', 'poll', terminal_id=token)
                    statement = (
                        'id -u; whoami; test -t 0 && echo tty_OK; '
                        'test ! -s '+quote(str(secret))+' && echo protected_OK; '
                        'touch '+quote(str(project/'should-not-exist'))+' 2>/dev/null || echo readonly_OK; '
                        'touch scratch && test -e scratch && echo scratch_OK; '
                        '/usr/bin/python3.13 -c '+quote(network_test)+'\n'
                    )
                    terminal.access(run, 'admin', 'browser', 'write', terminal_id=token, text=statement)
                    output = b''
                    position = 0
                    deadline = monotonic() + 6
                    while monotonic() < deadline:
                        reply = terminal.access(run, 'admin', 'browser', 'poll', terminal_id=token, offset=position)
                        output += b64decode(reply['output'])
                        position = reply['offset']
                        if b'\r\nisolated_OK\r\n' in output or reply['closed']:
                            break
                        sleep(.05)
                    for line in (b'0', b'root', b'tty_OK', b'protected_OK', b'readonly_OK', b'scratch_OK', b'isolated_OK'):
                        self.assertIn(b'\r\n' + line + b'\r\n', output)
                    self.assertFalse((project/'should-not-exist').exists())
                    command = '/usr/bin/python3.13 -c '+quote(
                        'import time;print("waiting_OK",flush=True);time.sleep(10)')+'\n'
                    terminal.access(run, 'admin', 'browser', 'write', terminal_id=token, text=command)

                    def wait_output(marker, position):
                        received = b''
                        deadline = monotonic() + 4
                        while monotonic() < deadline:
                            reply = terminal.access(run, 'admin', 'browser', 'poll', terminal_id=token, offset=position)
                            received += b64decode(reply['output'])
                            position = reply['offset']
                            if marker in received:
                                return position
                            self.assertFalse(reply['closed'])
                            sleep(.05)
                        self.fail('Marqueur de console absent après saisie ou interruption.')

                    position = wait_output(b'\r\nwaiting_OK\r\n', position)
                    terminal.access(run, 'admin', 'browser', 'write', terminal_id=token, text='\x03')
                    terminal.access(run, 'admin', 'browser', 'write', terminal_id=token, text='echo interrupt_OK\n')
                    position = wait_output(b'\r\ninterrupt_OK\r\n', position)
                    run.state = 'CLOSED'
                    self.assertTrue(terminal.access(run, 'admin', 'browser', 'poll',
                                                    terminal_id=token, offset=position)['closed'])
                finally:
                    terminal.access(run, 'admin', 'browser', 'close', terminal_id=token)
                    self.assertNotIn(token, terminal.CONSOLES)
