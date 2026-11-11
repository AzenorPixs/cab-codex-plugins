"""Qualification du filtrage et du rechargement réel sans initialisation SQL."""
import io
import json
import logging
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch
from urllib.request import urlopen

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
from cab_platform import logging as journal


class JournalTests(unittest.TestCase):
    def test_secret_filter_and_context(self):
        with patch.object(journal,'config',return_value={'logging':{'level':'DEBUG'},'database_password':'synthetic configured value'}):
            journal.configure()
        message='Authorization: Bearer synthetic-bearer password="two words" postgres://alice:fake@localhost/db synthetic configured value'
        record=logging.LogRecord('cab.worker',logging.ERROR,__file__,1,message,(),None)
        record.run_id='RUN-example';record.component='electric'
        text=journal.JournalFormatter().format(record)
        self.assertTrue(text.startswith('<3>'))
        payload=json.loads(text[3:])
        self.assertEqual(payload['component'],'electric')
        self.assertEqual(payload['run_id'],'RUN-example')
        for private in ['synthetic-bearer','two words','alice:fake','synthetic configured value']:
            self.assertNotIn(private,text)

    def test_invalid_level_preserves_previous_level(self):
        with patch.object(journal,'config',return_value={'logging':{'level':'WARNING'}}):journal.configure()
        with patch.object(journal,'config',return_value={'logging':{'level':'TRACE'}}):
            with self.assertRaises(ValueError):journal.configure()
        self.assertEqual(logging.getLogger().level,logging.WARNING)
        self.assertEqual(logging.getLogger('django.db.backends').level,logging.WARNING)
        for invalid in [{'logging':[]},{'logging':{'level':[]}},{'logging':{'level':None}}]:
            with patch.object(journal,'config',return_value=invalid):
                with self.assertRaises(ValueError):journal.configure()
            self.assertEqual(logging.getLogger().level,logging.WARNING)

    def test_reload_keeps_bootstrap_process_and_state(self):
        evidence=ROOT/'output/scm/cab-3.0.0';evidence.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='logging-',dir=evidence) as directory:
            root=Path(directory);(root/'config').mkdir(mode=0o700)
            cfg=root/'config/cab.json';cfg.write_text('{"logging":{"level":"INFO"}}');cfg.chmod(0o600)
            with socket.socket() as address:
                address.bind(('127.0.0.1',0));port=address.getsockname()[1]
            env={**os.environ,'PYTHONPATH':str(ROOT/'src'),'CAB_CONFIG':str(cfg),'CAB_STATE_DIR':str(root/'state'),'CAB_RUNTIME_DIR':str(root/'run')}
            with (root/'service.log').open('w+') as stream:
                process=subprocess.Popen([sys.executable,'-m','cab_platform.cli','serve','--port',str(port)],env=env,stdout=stream,stderr=subprocess.STDOUT)
                def health():
                    deadline=time.monotonic()+15
                    while time.monotonic()<deadline:
                        if process.poll() is not None:self.fail('service exited')
                        try:
                            with urlopen(f'http://127.0.0.1:{port}/api/v1/health',timeout=1) as response:return json.load(response)
                        except OSError:time.sleep(0.1)
                    self.fail('service unavailable')
                try:
                    before=health();self.assertEqual(before['state'],'UNINITIALIZED')
                    children=(Path('/proc')/str(process.pid)/'task'/str(process.pid)/'children').read_text()
                    nonce=(root/'state/django-secret.json').read_bytes()
                    cfg.write_text('{"logging":{"level":"DEBUG"}}');process.send_signal(signal.SIGHUP)
                    deadline=time.monotonic()+5
                    while time.monotonic()<deadline:
                        stream.seek(0)
                        if 'diagnostic logging enabled' in stream.read():break
                        time.sleep(0.1)
                    else:self.fail('reload diagnostic absent')
                    cfg.write_text('{"logging":{"level":"INVALID"}}');process.send_signal(signal.SIGHUP);time.sleep(0.3)
                    self.assertEqual(health()['state'],'UNINITIALIZED')
                    self.assertEqual((Path('/proc')/str(process.pid)/'task'/str(process.pid)/'children').read_text(),children)
                    self.assertEqual((root/'state/django-secret.json').read_bytes(),nonce)
                    self.assertEqual(json.loads(cfg.read_text()),{'logging':{'level':'INVALID'}})
                    stream.seek(0);self.assertIn('configuration reload refused',stream.read())
                finally:
                    process.terminate()
                    try:process.wait(timeout=20)
                    except subprocess.TimeoutExpired:process.kill();process.wait()


if __name__=='__main__':unittest.main()
