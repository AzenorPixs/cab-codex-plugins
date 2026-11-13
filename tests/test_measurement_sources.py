"""Instantanés synthétiques : écarts, remplacement, compteur réinitialisé et manque."""
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from cab_platform.measurement_sources import codex_snapshot,difference,opencode_snapshot
from cab_platform.native_sources import inspect

class MeasurementSourcesTests(unittest.TestCase):
    def test_same_file_yields_only_delta_and_reset_is_unknown(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'native.jsonl';path.write_text(json.dumps({'type':'session_meta','payload':{'id':'SID','cwd':folder}})+'\n')
            run=SimpleNamespace(actor=SimpleNamespace(uid=os.getuid()),session_id='SID',project=SimpleNamespace(root=folder))
            run.mandate={'native_source':inspect(os.getuid(),'SID',folder,str(path))}
            def append(value):
                with path.open('a') as f:f.write(json.dumps({'timestamp':'2026-11-13T10:00:00Z','type':'event_msg','payload':{'type':'token_count','info':{'total_token_usage':{'input_tokens':value,'total_tokens':value}}}})+'\n')
            append(100);start=codex_snapshot(run);append(135);end=codex_snapshot(run)
            values,coverage=difference(start,end);self.assertEqual(values['tokens_total'],'35');self.assertEqual(coverage['state'],'bounded')
            append(4);self.assertEqual(difference(end,codex_snapshot(run))[1]['reason'],'native-counter-reset')
    def test_missing_fields_and_changed_source_are_not_zero(self):
        start={'status':'ok','source':{'inode':1},'counters':{'tokens_total':'100','tokens_input':'80'},'offset':10}
        end={'status':'ok','source':{'inode':1},'counters':{'tokens_total':'120'},'offset':20}
        values,coverage=difference(start,end);self.assertNotIn('tokens_input',values);self.assertIn('tokens_input',coverage['missing'])
        end['source']={'inode':2};self.assertEqual(difference(start,end)[1]['state'],'unavailable')
        self.assertEqual(difference({'status':'unavailable'},end)[0],{})
    def test_opencode_duplicate_messages_pending_and_missing_field(self):
        run=SimpleNamespace(actor=SimpleNamespace(uid=1,native={'pid':1,'start_time':'2'}),session_id='SID')
        row={'id':'one','time':{'completed':1000},'tokens':{'input':10,'output':2,'total':12,'cache':{'read':1}}}
        with patch('cab_platform.opencode.messages',return_value=[row,row]):
            start=opencode_snapshot(run);self.assertEqual(start['counters']['tokens_total'],'12')
        second={'id':'two','time':{'completed':1100},'tokens':{'input':5,'output':1}}
        with patch('cab_platform.opencode.messages',return_value=[row,second]):
            end=opencode_snapshot(run);self.assertNotIn('tokens_total',end['counters']);self.assertEqual(end['counters']['tokens_input'],'15')
        second['time']={}
        with patch('cab_platform.opencode.messages',return_value=[row,second]):self.assertEqual(opencode_snapshot(run)['reason'],'native-records-pending')

if __name__=='__main__':unittest.main()
