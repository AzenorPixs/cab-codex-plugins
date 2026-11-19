import importlib.util,sys,unittest,tomllib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from cab_platform import mcp_epoch as epoch
BASE=b'[mcp_servers.cab]\ncommand="/usr/bin/cab"\nargs=["mcp","--agent","codex"]\n'
class EpochTests(unittest.TestCase):
 def test_no_env_and_same_version_byte_idempotence(self):
  changed=epoch.codex_epoch(BASE,'3.2.26');self.assertEqual(epoch.codex_epoch(changed,'3.2.26'),changed);self.assertIn(b'CAB_MCP_PACKAGE_VERSION',changed)
 def test_different_versions_change_effective_definition(self):
  old=epoch.codex_epoch(BASE,'3.2.26');new=epoch.codex_epoch(old,'3.2.27');self.assertNotEqual(tomllib.loads(old.decode()),tomllib.loads(new.decode()))
 def test_table_secrets_other_servers_and_reload_nonce_preserved(self):
  raw=BASE+b'\n[mcp_servers.cab.env]\nPRIVATE_FIXTURE="fixture-value"\nCAB_MCP_RELOAD_ID="native-fixture"\n\n[mcp_servers.other]\ncommand="other"\n'
  changed=epoch.codex_epoch(raw,'3.2.27');doc=tomllib.loads(changed.decode());self.assertEqual(doc['mcp_servers']['cab']['env']['PRIVATE_FIXTURE'],'fixture-value');self.assertEqual(doc['mcp_servers']['cab']['env']['CAB_MCP_RELOAD_ID'],'native-fixture');self.assertEqual(doc['mcp_servers']['other']['command'],'other')
 def test_inline_environment_preserved(self):
  raw=BASE+b'env={ PRIVATE_FIXTURE="fixture-value" }\n'
  changed=epoch.codex_epoch(raw,'3.2.27');self.assertEqual(tomllib.loads(changed.decode())['mcp_servers']['cab']['env']['PRIVATE_FIXTURE'],'fixture-value');self.assertEqual(epoch.codex_epoch(changed,'3.2.27'),changed)
 def test_inline_epoch_can_be_amended(self):
  raw=BASE+b'env={ CAB_MCP_PACKAGE_VERSION="3.2.26", PRIVATE_FIXTURE="fixture-value" }\n'
  changed=epoch.codex_epoch(raw,'3.2.27');self.assertEqual(tomllib.loads(changed.decode())['mcp_servers']['cab']['env']['CAB_MCP_PACKAGE_VERSION'],'3.2.27')
 def test_quoted_header_and_key(self):
  raw=BASE+b'\n[mcp_servers."cab".env]\n"CAB_MCP_PACKAGE_VERSION"="3.2.26"\n'
  changed=epoch.codex_epoch(raw,'3.2.27');self.assertEqual(tomllib.loads(changed.decode())['mcp_servers']['cab']['env'][epoch.KEY],'3.2.27')
 def test_unowned_command_and_invalid_version_refused(self):
  for raw,version in [(BASE.replace(b'/usr/bin/cab',b'/usr/bin/other'),'3.2.27'),(BASE,'v3.2.27'),(BASE+b'env=1\n','3.2.27')]:
   with self.subTest(version=version),self.assertRaises(epoch.ClientError):epoch.codex_epoch(raw,version)
class ReconcileTests(unittest.TestCase):
 def test_reconciler_and_install_share_version_and_preserve_same_bytes(self):
  import os
  os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
  import django
  django.setup()
  from cab_platform.agent_config_reconcile import codex_config
  from cab_platform import __version__
  changed=codex_config(BASE,'codex');doc=tomllib.loads(changed.decode())
  self.assertEqual(doc['mcp_servers']['cab']['env'][epoch.KEY],__version__)
  self.assertEqual(codex_config(changed,'codex'),changed)
 def test_reconciler_preserves_existing_environment_on_agent_switch(self):
  import os
  os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
  import django
  django.setup()
  from cab_platform.agent_config_reconcile import codex_config
  raw=BASE+b'\n[mcp_servers.cab.env]\nPRIVATE_FIXTURE="fixture-value"\n'
  changed=codex_config(raw,'codex-cli');doc=tomllib.loads(changed.decode())
  self.assertEqual(doc['mcp_servers']['cab']['args'],['mcp','--agent','codex-cli'])
  self.assertEqual(doc['mcp_servers']['cab']['env']['PRIVATE_FIXTURE'],'fixture-value')
class FrontendRecoveryTests(unittest.TestCase):
    def test_escalates_only_when_the_same_pidfd_has_not_exited(self):
        from unittest.mock import patch
        from cab_platform import frontend_recovery as recovery

        for polls, signals in (
            ([[], [(41, recovery.select.POLLIN)]], [recovery.signal.SIGTERM]),
            ([[], [], [], [(41, recovery.select.POLLIN)]], [recovery.signal.SIGTERM, recovery.signal.SIGKILL]),
        ):
            with self.subTest(signals=signals), patch.object(recovery.select, 'poll') as poll, patch.object(
                recovery.signal, 'pidfd_send_signal'
            ) as send:
                poll.return_value.poll.side_effect = polls
                report = []
                recovery.stop_process(41, report.append)
                self.assertEqual([call.args for call in send.call_args_list], [(41, sig) for sig in signals])
                self.assertEqual(report, [sig.name for sig in signals])

    def test_unconfirmed_exit_cannot_continue_to_launch(self):
        from unittest.mock import patch
        from cab_platform import frontend_recovery as recovery

        with patch.object(recovery.select, 'poll') as poll, patch.object(recovery.signal, 'pidfd_send_signal'):
            poll.return_value.poll.return_value = []
            with self.assertRaisesRegex(RuntimeError, 'exit-unconfirmed'):
                recovery.stop_process(41, lambda _name: None)

    def test_restart_requires_an_observed_replacement_catalog(self):
        import os
        from types import SimpleNamespace
        from unittest.mock import patch
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cab_platform.settings')
        import django
        django.setup()
        from cab_platform.core import connectors

        def process(pid, parent):
            return {'pid': pid, 'parent_pid': parent, 'uid': 1000, 'start': str(pid), 'boot': 'fixture'}

        old_owner, new_app, new_owner = process(2, 1), process(5, 1), process(6, 5)
        target = {'kind': 'legacy', 'agent': 'codex', 'process': process(3, 2), 'owner': old_owner}
        worker = SimpleNamespace(pk='new', process=process(7, 6), worker=process(8, 7), agent='codex',
                                 loaded_version='3.2.27', catalog_version='', state='READY', uncertain=False,
                                 generation=1)
        recovery = {'state': 'WAITING_MCP', 'backend': old_owner, 'replacement': new_app}
        with patch.object(connectors.McpConnector.objects, 'filter') as rows, patch.object(
            connectors, 'identity', side_effect=lambda pid: new_owner if pid == 6 else None
        ), patch.object(connectors, 'alive', side_effect=lambda item: bool(item and item['pid'] >= 5)):
            rows.return_value.exclude.return_value = [worker]
            self.assertEqual(connectors.assess([target], '3.2.27', recovery=recovery)[0], 'RELOAD_REQUIRED')
            worker.catalog_version = '3.2.27'
            self.assertEqual(connectors.assess([target], '3.2.27', recovery=recovery)[0], 'OK')

    def test_local_cabu_receipt_requires_matching_package_and_active_service(self):
        import os
        from unittest.mock import patch
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cab_platform.settings')
        import django
        django.setup()
        from cab_platform import system_updates
        receipt = {'version': '3.2.27', 'verified': True, 'package_sha256': 'a' * 64}
        with patch.object(system_updates, 'read_json', return_value=receipt), patch.object(
            system_updates.subprocess, 'check_output', return_value='install ok installed|3.2.27'
        ), patch('cab_platform.client.Client') as client:
            client.return_value.get.return_value = {'state': 'READY', 'version': '3.2.26'}
            self.assertIsNone(system_updates.verified_local_installation('3.2.27'))
            client.return_value.get.return_value['version'] = '3.2.27'
            self.assertIs(system_updates.verified_local_installation('3.2.27'), receipt)

    def test_graphical_executable_replaced_on_disk(self):
        from types import SimpleNamespace
        from unittest.mock import patch
        from cab_platform.cabu_recovery_policy import frontend_executable
        expected = Path('/usr/lib/chatgpt/ChatGPT')
        with patch('os.readlink', return_value=f'{expected} (deleted)'), patch.object(
            Path, 'resolve', return_value=expected
        ), patch.object(Path, 'stat', return_value=SimpleNamespace(st_uid=0, st_mode=0o100755)) as metadata:
            self.assertEqual(frontend_executable(42), expected)
            metadata.return_value.st_mode = 0o100775
            self.assertIsNone(frontend_executable(42))

    def test_dead_observation_cannot_mask_a_genuine_uncertain_effect(self):
        import os
        import django
        from types import SimpleNamespace
        from unittest.mock import patch
        from cab_platform.cabu_recovery_policy import connector_protected
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cab_platform.settings')
        django.setup()
        row = SimpleNamespace(pending=0, uncertain=True, state='OBSERVED',
                              error='native-worker-observed-without-heartbeat',
                              process={'pid': 42, 'parent_pid': 10}, worker={'pid': 43})
        with patch('cab_platform.core.connectors.observed_dead', return_value=True), patch(
            'cab_platform.cabu_recovery_policy.identity', return_value=None
        ):
            self.assertFalse(connector_protected(row, {'pid': 99}))
            row.state = 'FAILED'
            self.assertTrue(connector_protected(row, {'pid': 99}))

if __name__=='__main__':unittest.main(verbosity=2)
