"""Contrôles ciblés du partage MCP et de la preuve de reprise."""
import asyncio
import os
from pathlib import Path
import sys
import tomllib
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cab_platform.settings')
os.environ['CAB_MIGRATE'] = '1'
import django
django.setup()

from django.db import connection, transaction
from django.db.migrations.executor import MigrationExecutor
from mcp.types import RequestParamsMeta
from pydantic import TypeAdapter
from cab_platform import mcp, __version__
from cab_platform.core import commands, connectors
from cab_platform.core.models import Actor, McpConnector, Project, Run
from cab_platform.mcp_epoch import shared_stdio


class SharedStdioTests(unittest.TestCase):
    def test_config_is_idempotent_and_preserves_other_servers(self):
        original = (b'[mcp_servers.cab]\ncommand = "/usr/bin/cab"\nargs = ["mcp", "--agent", "codex"]\n'
                    b'[mcp_servers.other]\ncommand = "other"\n')
        result = shared_stdio(original, '/home/test')
        document = tomllib.loads(result.decode())
        self.assertEqual(shared_stdio(result, '/home/test'), result)
        self.assertTrue(document['features']['mcp_connection_sharing'])
        self.assertEqual(document['mcp_servers']['cab']['cwd'], '/home/test')
        self.assertEqual(document['mcp_servers']['other'], {'command': 'other'})

    def test_request_metadata_is_isolated(self):
        threads = [str(uuid4()), str(uuid4())]

        async def echo(_server, _name, _arguments, _context):
            await asyncio.sleep(0)
            return mcp.shared_thread.get()

        async def call():
            contexts = [
                SimpleNamespace(request_context=SimpleNamespace(
                    meta=TypeAdapter(RequestParamsMeta).validate_python({'threadId': thread})))
                for thread in threads
            ]
            return await asyncio.gather(*(mcp.server.call_tool('test', {}, context) for context in contexts))

        with patch.dict(os.environ, CAB_MCP_SHARED_STDIO='1'), patch.object(mcp.MCPServer, 'call_tool', echo):
            self.assertEqual(asyncio.run(call()), threads)
        self.assertIsNone(mcp.shared_thread.get())

    def test_two_runs_share_one_connector_without_fallback(self):
        key = uuid4().hex
        project = Project.objects.create(pk=key, root='/test/' + key, owner_uid=9876)
        actor = Actor.objects.create(pk=key, uid=9876, agent='codex', token_hash=key)
        actor.projects.add(project)
        runs = [
            Run.objects.create(project=project, actor=actor, session_id=str(uuid4()),
                               run_id='partage-' + str(index), mode='direct', change=key,
                               mandate={'native_source': {'proof': key}})
            for index in range(2)
        ]
        worker = {'pid': 98}
        connector = McpConnector.objects.create(pk=key, actor=actor, agent=actor.agent,
                                                 worker=worker, process={'pid': 99}, state='READY')
        peer = {'pid': 98, 'uid': actor.uid}
        with patch.object(connectors, 'worker_connector', return_value=connector), \
             patch.object(connectors, 'alive', return_value=True), \
             patch.object(connectors, 'identity', return_value=worker):
            for run in runs:
                data = {'project_id': project.pk, 'run_id': run.run_id}
                self.assertTrue(connectors.bind_worker_run(actor, data, peer, native_thread=run.session_id))
            for run in runs:
                self.assertEqual(connectors.current_worker_run(
                    actor, peer, read_only=True, native_thread=run.session_id), run)
            for invalid in (None, '', str(uuid4())):
                with self.assertRaises(commands.Refused):
                    connectors.current_worker_run(actor, peer, read_only=True, native_thread=invalid)
            with self.assertRaises(commands.Refused):
                connectors.bind_worker_run(actor, data, peer, native_thread=runs[0].session_id)

    def test_restart_requires_one_current_replacement(self):
        old = {'pid': 10, 'uid': 9876, 'start_ticks': 1, 'boot_id': 'test'}
        new_app = {'pid': 20, 'uid': 9876}
        new_backend = {'pid': 21, 'uid': 9876, 'parent_pid': 20}
        targets = [
            {'kind': 'managed', 'agent': 'codex', 'connector_id': str(pid),
             'owner': old, 'process': {'pid': pid, 'uid': 9876}}
            for pid in (11, 12, 13)
        ]
        row = SimpleNamespace(
            pk='new', agent='codex', process={'pid': 22, 'uid': 9876, 'parent_pid': 21},
            worker={'pid': 23}, state='READY', loaded_version=__version__, relay_version=__version__,
            catalog_version=__version__, uncertain=False, generation=1, pending=0, error='')
        query = Mock()
        with patch.object(McpConnector.objects, 'filter', return_value=query), \
             patch.object(connectors, 'identity', return_value=new_backend), \
             patch.object(connectors, 'alive', side_effect=lambda process: bool(process)):
            query.exclude.return_value = []
            state, outcomes = connectors.assess(targets, __version__, shared_owner=old)
            self.assertEqual(state, 'RELOAD_REQUIRED')
            self.assertEqual({item['reason'] for item in outcomes}, {'shared-stdio-replacement-required'})
        recovery = {'state': 'WAITING_MCP', 'backend': old, 'replacement': new_app, 'shared_stdio': True}
        with patch.object(McpConnector.objects, 'filter', return_value=query), \
             patch.object(connectors, 'identity', return_value=new_backend), \
             patch.object(connectors, 'alive', side_effect=lambda process: process and process['pid'] >= 20):
            query.exclude.return_value = [row, row]
            self.assertEqual(connectors.assess(targets, __version__, recovery=recovery)[0], 'RELOAD_REQUIRED')
            query.exclude.return_value = [row]
            state, outcomes = connectors.assess(targets, __version__, recovery=recovery)
            self.assertEqual(state, 'OK')
            self.assertEqual({item['connector_id'] for item in outcomes}, {'new'})
            row.catalog_version = ''
            self.assertEqual(connectors.assess(targets, __version__, recovery=recovery)[0], 'RECONNECTING')


if __name__ == '__main__':
    with transaction.atomic():
        migration = ('cab_core', '0044_mcp_shared_binding')
        executor = MigrationExecutor(connection)
        if migration not in executor.loader.applied_migrations:
            executor.migrate([migration])
        passed = unittest.TextTestRunner(verbosity=2).run(
            unittest.defaultTestLoader.loadTestsFromTestCase(SharedStdioTests)).wasSuccessful()
        transaction.set_rollback(True)
    raise SystemExit(not passed)
