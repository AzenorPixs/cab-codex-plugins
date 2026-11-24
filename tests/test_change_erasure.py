import copy
import hashlib
import json
import os
import sys
import tempfile
import unittest
from contextlib import ExitStack
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'src'))
import cgpt_approval_bridge_server as bridge


class ChangeErasureTest(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.root = Path(self.stack.enter_context(tempfile.TemporaryDirectory(prefix='cab-erasure-')))
        self.stack.enter_context(patch.dict(os.environ, {
            'CGPT_APPROVAL_STORE':str(self.root/'approvals.json'),
            'CGPT_APPROVAL_JOURNAL':str(self.root/'events.ndjson'),
            'CGPT_JOURNAL_CHECKPOINT_PATH':str(self.root/'checkpoint.json'),
            'CGPT_BROKER_INSTANCE_LOCK':str(self.root/'broker.instance.lock'),
        }, clear=True))
        self.stack.enter_context(patch.object(bridge,'ERASURE_PREPARED',None))
        self.stack.enter_context(patch.object(bridge,'AUTO_REMEDIATION_CIRCUIT_STATE_PATH',str(self.root/'circuit.json')))
        self.control = self.root/'control'
        self.control.mkdir(mode=0o700)
        (self.control/'change-erasure.key').write_bytes(b'k'*32)
        (self.control/'change-erasure.key').chmod(0o600)

    def events(self):
        j=bridge.journal
        return [j.append_event('FIXTURE_EVENT',change_id=change,approval_id='approval-'+change,
                               data={'value':change},event_key='key-'+change) for change in ['target','peer']]

    def signed(self):
        value={'protocol':'cab-change-erasure-v1','transactionId':'erasure-11111111-1111-1111-1111-111111111111',
               'controlRoot':str(self.control),'scope':{'workspace':'/fixture','changeId':'target','runIds':['run-target'],
               'ids':['target','run-target','approval-target'],'registrySequence':10}}
        return {**value,'signature':bridge.erasure_control_signature(value,b'k'*32)}

    def store(self,status='APPROVED'):
        bridge.save_store(bridge.store_path(),{'approvals':{'approval-target':{
            'approval_id':'approval-target','requestId':'request-target','change_id':'target','run_id':'run-target',
            'directory':'/fixture','status':status,'created_at':'2026-11-05T00:00:00Z','expires_at':'2099-01-01T00:00:00Z'}}})

    def authorize_stop(self):
        signed=self.signed()
        value={k:v for k,v in signed.items() if k!='signature'}
        value['phase']='STOPPING'
        value['signature']=bridge.erasure_control_signature(value,b'k'*32)
        path=self.control/'change-erasure.json'
        path.write_text(json.dumps(value));path.chmod(0o600)
        return signed

    def test_reanchor_preserves_peer_event_and_original_inputs(self):
        events=self.events(); original=copy.deepcopy(events)
        result=bridge.journal.prepare_erasure_reanchor(events,[events[0]['event_id']])
        self.assertEqual(events,original)
        metadata={'sequence','previous_hash','event_hash','journal_version'}
        self.assertEqual({k:v for k,v in result[0].items() if k not in metadata},
                         {k:v for k,v in events[1].items() if k not in metadata})
        self.assertEqual(bridge.journal.validate_sequences(result),1)
        self.assertEqual(bridge.journal.calculate_chain_tip(result),result[0]['event_hash'])

    def test_reanchor_refuses_tamper_unknown_event_and_duplicate_identity(self):
        events=self.events()
        with self.assertRaises(bridge.journal.JournalValidationError):
            bridge.journal.prepare_erasure_reanchor(events,['missing'])
        events[0]['data']['value']='tampered'
        with self.assertRaises(bridge.journal.JournalError):
            bridge.journal.prepare_erasure_reanchor(events,[])

    def test_pending_target_refuses_without_any_erasure(self):
        self.store('PENDING'); before=(self.root/'approvals.json').read_bytes()
        with self.assertRaisesRegex(bridge.ValidationError,'broker-pending'):
            bridge.prepare_terminal_erasure(self.signed())
        self.assertEqual((self.root/'approvals.json').read_bytes(),before)
        self.assertIsNone(bridge.ERASURE_PREPARED)

    def test_invalid_control_signature_refuses(self):
        self.store(); signed=self.signed(); signed['scope']['changeId']='forged'
        with self.assertRaisesRegex(bridge.ValidationError,'signature-invalid'):
            bridge.prepare_terminal_erasure(signed)

    def test_unconfigured_anchor_prepares_authenticated_bundle_without_rewriting_journal(self):
        events=self.events();self.store();before=(self.root/'events.ndjson').read_bytes()
        bridge.prepare_terminal_erasure(self.authorize_stop());bridge.prepare_terminal_erasure_bundle()
        self.assertEqual((self.root/'events.ndjson.hmac.key').stat().st_mode & 0o777, 0o770)
        self.assertEqual((self.root/'events.ndjson').read_bytes(),before)
        bundle=json.loads((self.control/'broker-erasure.json').read_text())
        signature=bundle.pop('signature')
        self.assertEqual(signature,bridge.erasure_control_signature(bundle,b'k'*32))
        self.assertIn('request-target',bundle['scope']['ids'])
        # A prepared local key alone does not change the old journal's mode.
        self.assertIsNone(bridge.journal.checkpoint_key())
        for entry in bundle['entries']:
            Path(entry['path']).write_text(entry['text'])
            Path(entry['path']).chmod(0o600)
        retained=bridge.journal.read_events_unlocked(bridge.journal.journal_path())
        self.assertEqual([event['event_id'] for event in retained],[events[1]['event_id']])
        self.assertTrue(bridge.journal.verify_checkpoint(retained,bridge.journal.journal_path())['ok'])
        self.assertIsNotNone(bridge.journal.checkpoint_key())

    def test_configured_anchor_reuses_key_and_refuses_invalid_checkpoint(self):
        with patch.dict(os.environ,{'CGPT_JOURNAL_HMAC_KEY':'fixture-key'}):
            self.events();self.store()
            payload=json.loads((self.root/'checkpoint.json').read_text());payload['signature']='0'*64
            (self.root/'checkpoint.json').write_text(json.dumps(payload))
            with self.assertRaisesRegex(bridge.ValidationError,'journal-integrity-invalid'):
                bridge.prepare_terminal_erasure(self.authorize_stop())
            self.assertFalse((self.control/'broker-erasure.json').exists())


    def test_local_key_symlink_refused(self):
        self.events();self.store()
        (self.root/'events.ndjson.hmac.key').symlink_to(self.control/'change-erasure.key')
        bridge.prepare_terminal_erasure(self.authorize_stop())
        with self.assertRaises(OSError):
            bridge.prepare_terminal_erasure_bundle()

    def test_local_key_modes_and_group_authority(self):
        key=self.root/'events.ndjson.hmac.key'
        key.write_bytes(b'x'*32)
        for mode in (0o600, 0o770):
            with self.subTest(mode=oct(mode)):
                key.chmod(mode)
                self.assertEqual(bridge.journal.checkpoint_key(allow_unanchored=True), b'x'*32)
        key.chmod(0o775)
        with self.assertRaisesRegex(bridge.journal.JournalError, 'cle locale du journal non sure'):
            bridge.journal.checkpoint_key(allow_unanchored=True)
        key.chmod(0o770)
        with patch.object(bridge.journal.os, 'getgroups', return_value=[]), \
             patch.object(bridge.journal.os, 'getgid', return_value=key.stat().st_gid+100000):
            with self.assertRaisesRegex(bridge.journal.JournalError, 'cle locale du journal non sure'):
                bridge.journal.checkpoint_key(allow_unanchored=True)
        original_stat = os.stat
        def altered_parent(path, *args, **kwargs):
            result = original_stat(path, *args, **kwargs)
            if str(path) == str(self.root):
                return SimpleNamespace(st_mode=result.st_mode, st_uid=result.st_uid,
                                       st_gid=result.st_gid+100000)
            return result
        with patch.object(bridge.journal.os, 'stat', side_effect=altered_parent):
            with self.assertRaisesRegex(bridge.journal.JournalError, 'cle locale du journal non sure'):
                bridge.journal.checkpoint_key(allow_unanchored=True)

    def test_post_erasure_new_proposal_cannot_recreate_retired_approval_offline(self):
        (self.root/'events.ndjson.erasure-epoch.json').write_text('{"epoch":1,"generation":10}')
        with patch.dict(os.environ,{'CGPT_CONTROLLER_URL':'http://127.0.0.1:0'}):
            with self.assertRaisesRegex(bridge.ValidationError,'admission-unavailable-or-retired'):
                bridge.do_propose({'requestId':'new-request','change_id':'target','title':'fixture',
                                   'files':['one.txt']})
        self.assertNotIn('new-request',(self.root/'approvals.json').read_text() if (self.root/'approvals.json').exists() else '')

    def test_checkpoint_present_sans_cle_ne_devient_pas_un_premier_ancrage(self):
        with patch.dict(os.environ,{'CGPT_JOURNAL_HMAC_KEY':'fixture-key'}):
            self.events()
        self.store()
        with self.assertRaisesRegex(bridge.ValidationError,'journal-authentication-unavailable'):
            bridge.prepare_terminal_erasure(self.authorize_stop())
        self.assertFalse((self.root/'events.ndjson.hmac.key').exists())

    def test_checkpoint_tampered_after_prepare_is_refused_before_bundle(self):
        with patch.dict(os.environ,{'CGPT_JOURNAL_HMAC_KEY':'fixture-key'}):
            self.events();self.store()
            bridge.prepare_terminal_erasure(self.authorize_stop())
            payload=json.loads((self.root/'checkpoint.json').read_text());payload['signature']='0'*64
            (self.root/'checkpoint.json').write_text(json.dumps(payload))
            with self.assertRaisesRegex(bridge.ValidationError,'journal-integrity-invalid'):
                bridge.prepare_terminal_erasure_bundle()
            self.assertFalse((self.control/'broker-erasure.json').exists())

@unittest.skipUnless(os.environ.get('CAB_EFFECTS_FIXTURE') == '1', 'PostgreSQL isolé requis')
class TerminalCleanupTests(unittest.TestCase):
    def setUp(self):
        from test_stage_protocol import ProtocolTests

        self.finish = lambda: ProtocolTests.finish(self)
        ProtocolTests.setUp(self)
        self.request = {**self.ids, 'request_id': 'terminal-cleanup', 'confirm_irreversible': True}

    def close(self, run, branch='TERMINÉ'):
        from cab_platform.core.commands import event

        receipt = {'branch': branch, 'receipt_id': 'terminal-proof'}
        run.state = 'CLOSED' if branch == 'TERMINÉ' else 'BLOCKED'
        run.review = {'closure': receipt}
        run.save(update_fields=['state', 'review'])
        event(run, 'run-closed', receipt)

    def metric(self, run):
        from cab_platform.core.models import Metric

        return Metric.objects.create(run=run, source='fixture', stream='native', sequence=1)

    def test_command_resumes_only_pending_components_and_preserves_peer(self):
        from django.test import RequestFactory
        from cab_platform.collectors import locked_metrics_run
        from cab_platform.core import session_cleanup as cleanup
        from cab_platform.core import api
        from cab_platform.core.models import Incident, Metric, Run

        self.close(self.run)
        peer = Run.objects.create(project=self.project, actor=self.actor, run_id='peer',
                                  session_id=self.run.session_id, change=self.run.change, mode='direct')
        target_metric, peer_metric = self.metric(self.run), self.metric(peer)
        incident = Incident.objects.create(incident_id='pending', project=self.project, run=self.run)

        request = RequestFactory().post('/api/v1/command')
        with patch.object(api, 'principal', return_value=self.actor):
            partial = api.command(request, api.Command(name='session.cleanup', data=self.request))
        self.assertEqual(partial['status'], 'PARTIAL')
        self.assertEqual({item['component']: item['status'] for item in partial['targets'][0]['components']},
                         {'coordination': 'ABSENT', 'statistics': 'REMOVED', 'ccab': 'PENDING', 'session': 'PENDING'})
        self.assertFalse(Metric.objects.filter(pk=target_metric.pk).exists())
        self.assertTrue(Metric.objects.filter(pk=peer_metric.pk).exists())
        self.assertIsNone(locked_metrics_run(self.run))
        incident.state = 'RESOLVED'
        incident.save(update_fields=['state'])

        with patch.object(cleanup, 'cleanup_statistics', side_effect=AssertionError('statistics replay')), \
             patch.object(cleanup, 'cleanup_coordination', side_effect=AssertionError('coordination replay')):
            complete = cleanup.terminal_cleanup(self.actor, self.request)
            self.assertEqual(complete['status'], 'COMPLETE')
            self.assertEqual(cleanup.terminal_cleanup(self.actor, self.request), complete)
        self.assertFalse(Run.objects.filter(pk=self.run.pk).exists())
        self.assertTrue(Run.objects.filter(pk=peer.pk, state='WORKING').exists())
        self.assertTrue(Metric.objects.filter(pk=peer_metric.pk).exists())

    def test_change_preflight_refuses_active_run_before_any_effect(self):
        from cab_platform.core.commands import Refused
        from cab_platform.core.models import Metric, Run
        from cab_platform.core.session_cleanup import terminal_cleanup

        self.close(self.run)
        metric = self.metric(self.run)
        Run.objects.create(project=self.project, actor=self.actor, run_id='active', session_id='active',
                           change=self.run.change, mode='direct')
        with self.assertRaisesRegex(Refused, 'session-not-closed'):
            terminal_cleanup(self.actor, {'project_id': self.project.pk, 'change': self.run.change,
                                          'request_id': 'change-cleanup', 'confirm_irreversible': True})
        self.assertTrue(Metric.objects.filter(pk=metric.pk).exists())

    def test_resumption_refuses_a_different_generation(self):
        from cab_platform.core.models import Incident, Run
        from cab_platform.core.session_cleanup import terminal_cleanup

        self.close(self.run)
        incident = Incident.objects.create(incident_id='generation-pending', project=self.project, run=self.run)
        first = terminal_cleanup(self.actor, self.request)
        self.assertEqual(first['status'], 'PARTIAL')
        Run.objects.filter(pk=self.run.pk).update(generation=2)
        incident.state = 'RESOLVED'
        incident.save(update_fields=['state'])

        resumed = terminal_cleanup(self.actor, self.request)
        self.assertEqual(resumed['status'], 'PARTIAL')
        self.assertEqual(resumed['targets'][0]['components'][2]['code'], 'session-cleanup-identity-divergent')
        self.assertTrue(Incident.objects.filter(pk=incident.pk, state='RESOLVED').exists())

    def test_blocked_run_keeps_open_change_and_prevents_legacy_reimport(self):
        import hashlib
        import sqlite3
        from unittest.mock import Mock
        from cab_platform import migration
        from cab_platform.core.models import Project, Run
        from cab_platform.core.session_cleanup import terminal_cleanup

        # L'identifiant respecte la dérivation réelle de l'importeur à partir de la racine.
        root = self.root / 'legacy'
        root.mkdir()
        project = Project.objects.create(pk=hashlib.sha256(str(root).encode()).hexdigest(),
                                         root=str(root), owner_uid=os.getuid())
        self.actor.projects.add(project)
        run = Run.objects.create(project=project, actor=self.actor, run_id='retired',
                                 session_id='retired-sid', change='fixture', mode='direct')
        self.close(run, branch='BLOQUÉ')
        source = root / 'openspec' / 'changes' / run.change
        source.mkdir(parents=True)
        report = source / 'STATISTICS.md'
        report.write_text('Rapport conservé\n', encoding='utf-8')
        self.assertEqual(terminal_cleanup(self.actor, {**self.request, 'project_id': project.pk,
                                                      'run_id': run.run_id})['status'], 'COMPLETE')
        self.assertEqual(report.read_text(encoding='utf-8'), 'Rapport conservé\n')

        path = self.root / 'legacy.sqlite3'
        with sqlite3.connect(path) as database:
            database.execute('CREATE TABLE bindings (binding TEXT, uid INTEGER, body TEXT)')
            database.execute('CREATE TABLE binding_closures (binding TEXT)')
            database.execute('CREATE TABLE telemetry (binding TEXT, event_id TEXT, source TEXT, stream TEXT, sequence INTEGER, body TEXT)')
            for key, sid in [('retired', 'retired-sid'), ('peer', 'peer-sid')]:
                body = {'project': str(root), 'change': 'fixture', 'run': key, 'session': sid}
                database.execute('INSERT INTO bindings VALUES (?,?,?)', (key, os.getuid(), json.dumps(body)))
        sha = hashlib.sha256(path.read_bytes()).hexdigest()
        with patch.object(migration, 'cipher', return_value=Mock(encrypt=lambda _raw: b'fixture')):
            migration.import_runtime_sqlite({'path': str(path), 'sha256': sha})
        self.assertFalse(Run.objects.filter(project=project, run_id='retired').exists())
        self.assertTrue(Run.objects.filter(project=project, run_id='peer').exists())
