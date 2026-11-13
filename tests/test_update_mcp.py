"""Le client MCP attend/reconnecte sans réémettre la mise à jour."""
import asyncio
import unittest
from unittest.mock import Mock,patch,AsyncMock
from cab_platform.client import ClientError
from cab_platform import mcp

class MCPUpdateTests(unittest.IsolatedAsyncioTestCase):
    async def test_restart_is_read_again_without_new_update(self):
        client=Mock();client.command.side_effect=[{'state':'QUEUED','request_id':'SAME'},ClientError('cab-unavailable'),{'state':'VERIFYING','request_id':'SAME'},{'state':'OK','request_id':'SAME','version':'3.2.1'}]
        with patch.object(mcp,'client',return_value=client),patch.object(mcp.asyncio,'sleep',new=AsyncMock()):result=await mcp.cab_update('SAME','3.2.1')
        self.assertEqual(result['state'],'OK');self.assertEqual(result['version'],'3.2.1')
        self.assertEqual([call.args[0] for call in client.command.call_args_list],['system.update','system.update.status','system.update.status','system.update.status'])
    async def test_lost_admission_is_never_reissued(self):
        client=Mock();client.command.side_effect=ClientError('cab-unavailable')
        with patch.object(mcp,'client',return_value=client):result=await mcp.cab_update('SAME')
        self.assertEqual(result['state'],'ADMISSION_UNCONFIRMED');self.assertFalse(result['retry_execution']);self.assertEqual(client.command.call_count,1)
    async def test_unknown_stops_waiting_without_new_effect(self):
        client=Mock();client.command.return_value={'state':'UNKNOWN','request_id':'SAME'}
        with patch.object(mcp,'client',return_value=client):result=await mcp.cab_update('SAME')
        self.assertEqual(result['state'],'UNKNOWN');self.assertEqual(client.command.call_count,1)

if __name__=='__main__':unittest.main()
