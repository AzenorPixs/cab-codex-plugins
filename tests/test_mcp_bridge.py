"""Transport uniquement ; aucun appel métier n'est rejoué par le relais."""
import asyncio
import json
import unittest
from unittest.mock import AsyncMock,Mock,patch
from cab_platform.client import ClientError
from cab_platform.mcp_bridge import Bridge,key

class BridgeTests(unittest.IsolatedAsyncioTestCase):
    def bridge(self):
        with patch('cab_platform.mcp_bridge.Client'):bridge=Bridge('codex')
        bridge.output=AsyncMock();return bridge
    async def test_reload_defers_for_business_and_server_requests(self):
        b=self.bridge();b.initialized=True;b.spawn=AsyncMock();b.pending={'1':{'id':1}}
        await b.reload();b.spawn.assert_not_awaited()
        b.pending={};b.server_pending={'2'};await b.reload();b.spawn.assert_not_awaited()
    async def test_update_admitted_once_then_only_status_reads(self):
        b=self.bridge();b.client.command=Mock(side_effect=[{'state':'QUEUED'},{'state':'RECONNECTING'},{'state':'OK','version':'3.2.3'}])
        message={'jsonrpc':'2.0','id':7,'method':'tools/call','params':{'name':'cab_update','arguments':{'request_id':'ONCE','version':'3.2.3'}}}
        with patch('cab_platform.mcp_bridge.asyncio.sleep',new=AsyncMock()):await b.update(message)
        self.assertEqual([call.args[0] for call in b.client.command.call_args_list],['system.update','system.update.status','system.update.status'])
        self.assertEqual(b.output.call_args.args[0]['result']['structuredContent']['state'],'OK');self.assertFalse(b.pending)
    async def test_uncertain_admission_never_retries(self):
        b=self.bridge();b.client.command=Mock(side_effect=ClientError('cab-unavailable'))
        await b.update({'id':7,'params':{'arguments':{'request_id':'ONCE'}}})
        self.assertEqual(b.client.command.call_count,1);self.assertEqual(b.output.call_args.args[0]['result']['structuredContent']['state'],'ADMISSION_UNCONFIRMED')
    async def test_worker_death_reports_unknown_without_replay(self):
        b=self.bridge();reader=asyncio.StreamReader();reader.feed_eof();child=Mock(stdout=reader);b.child=child;b.pending={key(4):{'id':4,'method':'tools/call'}}
        await b.read_worker(child)
        response=b.output.call_args.args[0];self.assertEqual(response['id'],4);self.assertIn('outcome-unconfirmed',response['error']['message']);self.assertFalse(b.pending)
    async def test_catalog_only_acknowledged_after_real_list_response(self):
        b=self.bridge();b.version='3.2.3';b.catalog='';reader=asyncio.StreamReader()
        reader.feed_data((json.dumps({'jsonrpc':'2.0','id':9,'result':{'tools':[]}})+'\n').encode());reader.feed_eof()
        child=Mock(stdout=reader);b.child=child;b.stopped=True;b.pending={key(9):{'id':9,'method':'tools/list'}}
        await b.read_worker(child);self.assertEqual(b.catalog,'3.2.3')

if __name__=='__main__':unittest.main()
