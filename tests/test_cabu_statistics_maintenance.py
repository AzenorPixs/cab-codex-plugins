"""Maintenance hôte : preuves de fixture, sans reprise d'une opération métier."""
import hashlib
import os
import json
import subprocess
import select
import signal
import time
import tempfile
import types
import stat
import importlib.util
import sys
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch

source=Path(__file__).resolve().parents[1]/'src'
sys.path.insert(0,os.environ.get('CAB_TEST_SOURCE',str(source) if source.is_dir() else '/usr/lib/cab/python'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
import django
django.setup()
from django.db import transaction
from cab_platform.core import commands as c,statistics_service as s
from cab_platform.core.models import Project,StatisticsJob,StatisticsLock,Event
fixtures=Path(__file__).resolve().parent
if not (fixtures/'test_git_commit_metadata.py').is_file():fixtures=Path.cwd()/'tests'
sys.path.insert(0,str(fixtures))
from test_git_commit_metadata import MetadataTests


class StoppedPublicationTests(unittest.TestCase):
    def setUp(self):
        self.tx=transaction.atomic();self.tx.__enter__();self.addCleanup(self.rollback)
        self.git=MetadataTests('test_dates_et_signatures_protegees');self.git.setUp();self.addCleanup(self.git.doCleanups)
        self.root=self.git.root;token=uuid.uuid4().hex
        self.project=Project.objects.create(pk=token,root=str(self.root),owner_uid=os.getuid(),owner_gid=os.getgid())
        self.relative='openspec/changes/fixture/STATISTICS.md';self.path=self.root/self.relative
        desired=hashlib.sha256(b'rapport futur').hexdigest()
        self.result={'child':{'pid':99999992,'start':'fixture-stopped'},'error':'statistics-publication-unconfirmed','indexed_documents':{self.relative:{'path':self.relative,'state':'PENDING','sha256':desired}}}
        self.job=StatisticsJob.objects.create(pk=token,project=self.project,action='sync',request_id='fixture-'+token,state='UNKNOWN',owner_pid=99999991,owner_start='fixture-stopped',expected={str(self.path):{'before':None,'after':desired}},result=self.result)
        self.lock=StatisticsLock.objects.create(project=self.project,owner=self.job)
        self.original={'state':self.job.state,'expected':self.job.expected,'result':self.job.result}
    def tearDown(self):self.rollback()
    def rollback(self):
        if getattr(self,'done',False):return
        transaction.set_rollback(True);self.tx.__exit__(None,None,None);self.done=True
    def test_stopped_before_file_and_index_is_failed_without_replay_and_idempotent(self):
        s.recover_lock(self.lock);self.job.refresh_from_db();self.lock.refresh_from_db()
        self.assertEqual(self.job.state,'FAILED');self.assertIsNone(self.lock.owner_id)
        self.assertEqual(self.job.result['recovery']['classification'],'FAILED_NO_CHANGE')
        self.assertEqual(self.job.result['indexed_documents'],self.result['indexed_documents'])
        event=Event.objects.get(project=self.project,kind='statistics-stopped-before-publication')
        self.assertEqual(event.data['original_receipt'],self.original)
        self.assertEqual(event.data['original_receipt_digest'],c.digest(self.original))
        self.assertFalse(self.path.exists());self.assertFalse(event.data['evidence']['effects_replayed'])
        s.recover_lock(self.lock)
        self.assertEqual(Event.objects.filter(project=self.project,kind='statistics-stopped-before-publication').count(),1)
    def test_index_delta_preserves_unknown_and_lock(self):
        self.path.parent.mkdir(parents=True);self.path.write_text('index différent')
        self.git.git('add',self.relative);self.path.unlink()
        with self.assertRaisesRegex(c.Refused,'statistics-effect-unknown'):s.recover_lock(self.lock)
        self.job.refresh_from_db();self.lock.refresh_from_db()
        self.assertEqual(self.job.state,'UNKNOWN');self.assertEqual(self.lock.owner_id,self.job.pk)
        self.assertFalse(Event.objects.filter(project=self.project,kind='statistics-stopped-before-publication').exists())
    def test_file_delta_preserves_unknown(self):
        self.path.parent.mkdir(parents=True);self.path.write_text('état divergent')
        with self.assertRaisesRegex(c.Refused,'statistics-effect-unknown'):s.recover_lock(self.lock)
        self.job.refresh_from_db();self.assertEqual(self.job.state,'UNKNOWN')
        self.assertEqual(self.path.read_text(),'état divergent')
    def test_only_locally_inactive_owner_can_recover_without_process_restart(self):
        self.job.owner_pid=os.getpid();self.job.owner_start=s.process_identity(os.getpid());self.job.save();self.lock.refresh_from_db()
        s.ACTIVE.add(self.job.pk)
        try:
            with self.assertRaisesRegex(c.Refused,'statistics-project-busy'):s.recover_lock(self.lock)
        finally:s.ACTIVE.discard(self.job.pk)
        s.recover_lock(self.lock);self.job.refresh_from_db()
        self.assertEqual(self.job.state,'FAILED');self.assertTrue(self.job.result['recovery']['owner_execution_stopped']);self.assertFalse(self.job.result['recovery']['owner_stopped'])
    def test_foreign_live_owner_preserves_unknown(self):
        owner=subprocess.Popen([sys.executable,'-B','-c','import time;time.sleep(30)'])
        try:
            self.job.owner_pid=owner.pid;self.job.owner_start=s.process_identity(owner.pid);self.job.save();self.lock.refresh_from_db()
            with self.assertRaisesRegex(c.Refused,'statistics-project-busy'):s.recover_lock(self.lock)
            self.job.refresh_from_db();self.assertEqual(self.job.state,'UNKNOWN')
        finally:
            fd=os.pidfd_open(owner.pid)
            try:signal.pidfd_send_signal(fd,signal.SIGTERM)
            finally:os.close(fd)
            owner.wait(timeout=5)
    def test_live_writer_preserves_unknown(self):
        self.job.result={**self.result,'child':{'pid':os.getpid(),'start':s.process_identity(os.getpid())}};self.job.save()
        self.lock.refresh_from_db()
        with self.assertRaisesRegex(c.Refused,'statistics-effect-unknown'):s.recover_lock(self.lock)
        self.job.refresh_from_db();self.assertEqual(self.job.state,'UNKNOWN')


class PublicPayloadTests(unittest.TestCase):
    def setUp(self):
        self.folder=tempfile.TemporaryDirectory(prefix='cab-public-package-');self.addCleanup(self.folder.cleanup)
        self.root=Path(self.folder.name);self.data=self.root/'data';self.data.mkdir()
        self.version='3.2.20'
        from cab_platform import update as u
        self.u=u
        for name in u.PUBLIC_TREES:(self.data/name).mkdir(parents=True,exist_ok=True)
        files={'usr/bin/cab':'#!/bin/sh\nexit 0\n','usr/lib/cab/python/cab_platform/__init__.py':"__version__ = '3.2.20'\n",'usr/lib/cab/python/cab_platform/cli.py':'# fixture\n','usr/lib/cab/web/index.html':'fixture','usr/lib/cab/runtime-manifest.json':json.dumps({'version':self.version})}
        for name,content in files.items():
            path=self.data/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(content);path.chmod(0o755 if name=='usr/bin/cab' else 0o644)
        control=self.data/'DEBIAN';control.mkdir();(control/'control').write_text('Package: cab\nVersion: 3.2.20\nArchitecture: amd64\nMaintainer: Fixture <fixture@example.invalid>\nDescription: Fixture de modes publics\n')
        for path in [self.data,*self.data.rglob('*')]:
            if path.is_dir():path.chmod(0o755)
        self.package=self.root/'fixture.deb'
    def build(self):
        result=subprocess.run(['/usr/bin/dpkg-deb','--build','--root-owner-group',str(self.data),str(self.package)],capture_output=True)
        self.assertEqual(result.returncode,0)
    def test_public_package_and_embedded_version_are_verified(self):
        self.build();result=self.u.preflight_package(self.package,self.version)
        self.assertGreater(result['public_paths_verified'],5);self.assertEqual(result['embedded_version_verified'],self.version)
    def test_private_payload_refused_before_any_apt_call(self):
        (self.data/'usr/lib/cab/python/cab_platform/__init__.py').chmod(0o600);self.build()
        def command(args,**kwargs):
            self.assertEqual(args[0],'/usr/bin/dpkg');return types.SimpleNamespace(returncode=1)
        with patch.object(self.u,'STATE',self.root/'state'),patch.object(self.u.subprocess,'check_output',side_effect=['3.2.19','cab','3.2.20']),patch.object(self.u.subprocess,'run',side_effect=command) as run:
            with self.assertRaisesRegex(self.u.ClientError,'permissions-invalid'):self.u.update(str(self.package),version=self.version)
            self.assertEqual(run.call_count,1)
    def test_stale_payload_refused(self):
        (self.data/'usr/lib/cab/python/cab_platform/__init__.py').write_text("__version__ = '3.2.19'\n");self.build()
        with self.assertRaisesRegex(self.u.ClientError,'payload-version-invalid'):self.u.preflight_package(self.package,self.version)
    def test_packaging_public_modes_ignore_build_umask_only_for_generated_files(self):
        script=Path(__file__).resolve().parents[1]/'packaging/prepare.py'
        spec=importlib.util.spec_from_file_location('cab_package_fixture',script);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        public=self.root/'generated';public.mkdir();public.chmod(0o2770);file=public/'code.py';file.write_text('# public');file.chmod(0o770)
        module.public_modes(public)
        self.assertEqual(stat.S_IMODE(public.stat().st_mode),0o755);self.assertEqual(stat.S_IMODE(file.stat().st_mode),0o644)


class BuildUmaskTests(unittest.TestCase):
    def test_child_build_umask_is_public_and_parent_077_is_preserved(self):
        from cab_platform import session_delivery as d
        with tempfile.TemporaryDirectory(prefix='cab-build-umask-') as folder:
            root=Path(folder);public=root/'public';public.mkdir();public.chmod(0o755);(public/'code.py').write_text('# public');(public/'code.py').chmod(0o644)
            target=root/'payload';observed=root/'umask';program=root/'diu-fixture'
            body='import os,subprocess\nfrom pathlib import Path\nprevious=os.umask(0o077)\nos.umask(previous)\nPath('+repr(str(observed))+').write_text(oct(previous))\nsubprocess.run(["/bin/cp","-R",'+repr(str(public))+','+repr(str(target))+'],check=True)\n'
            program.write_text('#!'+sys.executable+'\n'+body);program.chmod(0o755)
            previous=os.umask(0o077)
            try:
                with patch.object(d,'diu_program',return_value=str(program)):
                    receipt=d.execute_diu_build(types.SimpleNamespace(identifier='fixture'),'debian','3.2.20',lambda value:None)
                current=os.umask(0o077)
                self.assertEqual(current,0o077);self.assertEqual(receipt['exit_code'],0)
                self.assertEqual(observed.read_text(),'0o22');self.assertEqual(stat.S_IMODE(target.stat().st_mode),0o755);self.assertEqual(stat.S_IMODE((target/'code.py').stat().st_mode),0o644)
            finally:os.umask(previous)


class BridgeRecoveryTests(unittest.TestCase):
    def test_real_stdio_without_initialized_notification_recovers_owned_dead_worker(self):
        from cab_platform.connector_process import identity,cab_process
        parent=subprocess.Popen(['/usr/bin/cab','mcp','--agent','codex'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,bufsize=0)
        buffered=b''
        def send(value):parent.stdin.write((json.dumps(value)+'\n').encode());parent.stdin.flush()
        def frame(timeout=12):
            nonlocal buffered
            deadline=time.monotonic()+timeout
            while b'\n' not in buffered:
                remaining=deadline-time.monotonic()
                if remaining<=0 or not select.select([parent.stdout],[],[],remaining)[0]:raise AssertionError('relai-réponse-absente')
                data=os.read(parent.stdout.fileno(),65536)
                if not data:raise AssertionError('relai-arrêté')
                buffered+=data
            line,buffered=buffered.split(b'\n',1);return json.loads(line)
        def response(request_id):
            for _ in range(10):
                value=frame()
                if value.get('id')==request_id:return value
            raise AssertionError('relai-identifiant-non-trouvé')
        try:
            send({'jsonrpc':'2.0','id':'init','method':'initialize','params':{'protocolVersion':'2025-03-26','capabilities':{},'clientInfo':{'name':'cab-owned-recovery-fixture','version':'1'}}})
            initial=response('init');self.assertIn('result',initial)
            send({'jsonrpc':'2.0','id':'list-before','method':'tools/list','params':{}})
            self.assertTrue(response('list-before')['result']['tools'])
            children=Path(f'/proc/{parent.pid}/task/{parent.pid}/children').read_text().split();self.assertEqual(len(children),1)
            old=identity(int(children[0]));self.assertEqual(old['parent_pid'],parent.pid);self.assertEqual(cab_process(old['pid'],'mcp-worker'),'codex')
            fd=os.pidfd_open(old['pid'])
            try:signal.pidfd_send_signal(fd,signal.SIGTERM)
            finally:os.close(fd)
            notice=frame();self.assertEqual(notice.get('method'),'notifications/tools/list_changed')
            send({'jsonrpc':'2.0','id':'list-after','method':'tools/list','params':{}})
            self.assertTrue(response('list-after')['result']['tools'])
            children=Path(f'/proc/{parent.pid}/task/{parent.pid}/children').read_text().split();self.assertEqual(len(children),1)
            current=identity(int(children[0]));self.assertNotEqual(current,old);self.assertEqual(current['parent_pid'],parent.pid)
        finally:
            children=Path(f'/proc/{parent.pid}/task/{parent.pid}/children')
            if children.exists():
                for value in children.read_text().split():
                    child=identity(int(value))
                    if child and child['parent_pid']==parent.pid and cab_process(child['pid'],'mcp-worker')=='codex':
                        fd=os.pidfd_open(child['pid'])
                        try:signal.pidfd_send_signal(fd,signal.SIGTERM)
                        finally:os.close(fd)
            parent.stdin.close()
            try:parent.wait(timeout=8)
            except subprocess.TimeoutExpired:parent.terminate();parent.wait(timeout=5)
            parent.stdout.close()


if __name__=='__main__':
    suite=unittest.defaultTestLoader.loadTestsFromTestCase(StoppedPublicationTests)
    suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(BridgeRecoveryTests))
    suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(PublicPayloadTests))
    suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(BuildUmaskTests))
    if suite.countTestCases()==0:raise RuntimeError('aucun-test-découvert')
    outcome=unittest.TextTestRunner(verbosity=2).run(suite)
    raise SystemExit(0 if outcome.wasSuccessful() else 1)
