"""Contract qualification through the real CLI, with isolated passive clients."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

CLI = Path(__file__).resolve().parents[1] / 'plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-dependencies.py'


class SessionCoordinationAdapterTest(unittest.TestCase):
    def test_capabilities_has_no_registration_or_filesystem_effect(self):
        with tempfile.TemporaryDirectory() as temporary:
            target = Path(temporary) / 'not-created'
            result = subprocess.run([sys.executable, str(CLI), 'capabilities', '--store', str(target)],
                                    capture_output=True, text=True, check=True)
            data = json.loads(result.stdout)
            self.assertEqual(data['adapter_protocol'], 'cab-session-coordination-1')
            self.assertEqual(data['mandate_mapping']['SCMP'], 'SCM')
            self.assertEqual(data['mode_owners'], {'direct': 'agent', 'piloted': 'orchestrator'})
            self.assertFalse(data['automatic_resume'])
            self.assertEqual(data['native_delivery'], 'per-attempt-verification')
            self.assertTrue({'subscribe', 'publish', 'inbox', 'ack', 'check-close'} <= set(data['operations']))
            self.assertFalse(target.exists())

    def test_all_mode_pairs_revalidate_deduplicate_and_preserve_pause(self):
        for sender_mode in ('direct', 'piloted'):
            for receiver_mode in ('direct', 'piloted'):
                with self.subTest(sender=sender_mode, receiver=receiver_mode), tempfile.TemporaryDirectory() as temporary:
                    root = Path(temporary)
                    project = root / 'project'
                    project.mkdir()
                    proof = project / 'proof.md'
                    proof.write_text('Validated fixture capability\n')
                    expected = hashlib.sha256(proof.read_bytes()).hexdigest()
                    env = dict(os.environ, OC_Codex_RUNTIME_STATE_ROOT=str(root / 'runtime'))
                    env.pop('CODEX_THREAD_ID', None)  # Synthetic CLI actors, never a native session.

                    def call(action, actor, *args, success=True):
                        command = [sys.executable, str(CLI), action, '--project', str(project),
                                   '--session', actor, '--run', 'run-' + actor, *args]
                        result = subprocess.run(command, capture_output=True, text=True, env=env)
                        self.assertEqual(result.returncode == 0, success, result.stderr)
                        return json.loads(result.stdout if success else result.stderr)

                    for actor, mode in (('producer', sender_mode), ('consumer', receiver_mode)):
                        call('register', actor, '--mode', mode, '--mandate', 'other')
                        call('state', actor, '--state', 'active', '--generation', '1')
                    call('subscribe', 'consumer', '--dependency-id', 'required', '--kind', 'task',
                         '--subject', 'fixture-change/1.1', '--criterion', 'fixture-passed')
                    publish = ('--notice-id', 'proof-1', '--kind', 'task', '--subject', 'fixture-change/1.1',
                               '--proof', 'proof.md', '--proof-sha256', expected)
                    call('publish', 'producer', *publish)
                    call('publish', 'producer', *publish)
                    notices = call('inbox', 'consumer')['notices']
                    self.assertEqual(len(notices), 1)
                    self.assertEqual(hashlib.sha256(proof.read_bytes()).hexdigest(), notices[0]['proof_sha256'])
                    self.assertTrue(notices[0]['created_at'])
                    self.assertFalse(call('ack', 'consumer', '--dependency-id', 'required',
                                          '--notice-id', 'proof-1')['dependency_verified'])
                    self.assertTrue(call('inbox', 'consumer')['notices'][0]['acknowledged'])
                    call('state', 'consumer', '--state', 'paused', '--generation', '2')
                    call('publish', 'producer', *tuple('proof-2' if arg == 'proof-1' else arg for arg in publish))
                    response = call('notify-all', 'producer', '--notice-id', 'proof-2')
                    self.assertEqual(response['recipients'][0]['reason'], 'recipient-paused')
                    self.assertEqual(len(call('inbox', 'consumer')['notices']), 2)
                    call('state', 'consumer', '--state', 'active', '--generation', '3', success=False)
                    call('state', 'consumer', '--state', 'active', '--generation', '3',
                         '--resume-evidence', 'developer-resume')
                    response = call('notify-all', 'producer', '--notice-id', 'proof-2')
                    self.assertEqual(response['recipients'][0]['reason'], 'native-transport-unavailable')


if __name__ == '__main__':
    unittest.main()
