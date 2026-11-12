"""Cache GitHub journalier et transport MCP sur métadonnées synthétiques."""
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import URLError
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from cab_platform import agent_releases as releases,agent_runtime

class ReleaseTests(unittest.TestCase):
    def test_daily_schedule_is_persistent_and_failure_keeps_previous_value(self):
        with tempfile.TemporaryDirectory() as folder:
            state=Path(folder);now=100*86400+100
            with patch.object(releases,'STATE',state),patch.object(releases,'config',return_value={'initialized':True}),patch.object(releases.secrets,'randbelow',return_value=0),patch.object(releases,'fetch',return_value={'version':'1.2.3','url':'https://github.com/example/repo/releases/tag/v1.2.3'}) as fetch:
                releases.refresh(now);releases.refresh(now+2);self.assertEqual(fetch.call_count,2)
                fetch.side_effect=URLError('offline');releases.refresh(101*86400+1);releases.refresh(101*86400+2);self.assertEqual(fetch.call_count,4)
                data=releases.cached();self.assertEqual(data['codex']['version'],'1.2.3');self.assertEqual(data['codex']['status'],'unavailable');self.assertEqual((state/'agent-releases.json').stat().st_mode&0o777,0o600)
    def test_bootstrap_never_fetches_and_repository_is_bounded(self):
        with patch.object(releases,'config',return_value={'initialized':False}),patch.object(releases,'fetch') as fetch:releases.refresh();fetch.assert_not_called()
        for value in ['https://elsewhere/repo','../repo','owner/repo?token=value']:
            with self.assertRaises(ValueError):releases.repository({'codex_release_repository':value},'codex')

class TransportTests(unittest.TestCase):
    def test_private_wire_descriptors_have_live_peers(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            def process(pid,mcp,entries):
                path=root/str(pid);(path/'fd').mkdir(parents=True);(path/'fdinfo').mkdir()
                for fd,pipe,flags in entries:
                    (path/'fd'/str(fd)).symlink_to(pipe);(path/'fdinfo'/str(fd)).write_text('flags:\t'+flags+'\n')
                return {'pid':pid,'uid':1,'agent':'codex' if not mcp else None,'mcp':mcp,'proc':path}
            server=process(1,'codex',[(0,'/dev/null','0'),(1,'pipe:[log]','1'),(2,'pipe:[log]','1'),(6,'pipe:[in]','0'),(7,'pipe:[out]','1')]);peer=process(2,None,[(3,'pipe:[in]','1'),(4,'pipe:[out]','0')])
            result=agent_runtime.observation([server,peer],'codex');self.assertTrue(result['mcp_connected']);self.assertTrue(result['running'])
            (peer['proc']/'fd/4').unlink();result=agent_runtime.observation([server,peer],'codex');self.assertFalse(result['mcp_connected'])

if __name__=='__main__':unittest.main()
