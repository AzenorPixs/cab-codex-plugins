"""Qualification vitale SGS/CCAB, exclusivement sur données synthétiques privées."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest

SCRIPTS = Path(__file__).resolve().parents[1] / "plugins/cab-approval-bridge/scripts"
sys.path.insert(0, str(SCRIPTS))


def module(name):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / ("cgpt-approval-bridge-" + name + ".py"))
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


runtime = module("runtime-store")
native = module("native-telemetry")
service = module('runtime-service')


class RuntimeServicesTest(unittest.TestCase):
    def test_released_snapshot_projection_preserves_peer_and_new_run(self):
        original = [{'record_id': 'report-one', 'snapshot': {'format': 'cab-native-sgs-1',
            'sessions': [{'binding': 'released', 'value': 1}, {'binding': 'peer', 'value': 2}]}},
            {'record_id': 'report-two', 'snapshot': {'format': 'cab-native-sgs-1',
            'sessions': [{'binding': 'new-run', 'value': 3}]}}]
        before = json.dumps(original, sort_keys=True)
        projected = runtime.filter_released_native_snapshots(original, {'released'})
        self.assertEqual([row['binding'] for record in projected for row in record['snapshot']['sessions']], ['peer', 'new-run'])
        self.assertEqual(json.dumps(original, sort_keys=True), before)
        self.assertEqual(runtime.filter_released_native_snapshots(projected, {'released'}), projected)
        with self.assertRaisesRegex(runtime.RuntimeErrorCode, 'sgs-report-projection-invalid'):
            runtime.filter_released_native_snapshots([{'snapshot': {'sessions': [{}]}}], {'released'})

    def test_aggregate_detection_keeps_unseparable_values_protected(self):
        self.assertTrue(runtime.has_known_aggregate({'metrics': {'tokens': {'state': 'known', 'value': '7'}}}))
        self.assertFalse(runtime.has_known_aggregate({'metrics': {'tokens': {'state': 'unavailable', 'value': None}}}))

    def test_release_filter_keeps_new_binding_even_if_session_id_reused(self):
        project=str(self.root);change='fixture-change';relative='openspec/changes/fixture-change/STATISTICS.md'
        self.store.db.execute('INSERT INTO released_change_records VALUES(?,?,?)',(project,runtime.digest('change:'+change),runtime.digest('same-session')))
        self.store.db.execute('INSERT INTO released_snapshot_suppressions VALUES(?,?,?,?,?,?)',
            (project,runtime.digest(relative),runtime.digest('old-binding'),runtime.digest('same-session'),runtime.digest('old-run'),os.getuid()))
        old={'id':'same-session','scope':'cumulative','native_telemetry':{'sessions':[{'binding':'old-binding','session':'same-session'}]}}
        new={'id':'same-session','scope':'cumulative','native_telemetry':{'sessions':[{'binding':'new-binding','session':'same-session'}]}}
        self.assertEqual(native.filtered_release_ledger(self.store,project,change,{'sessions':[old]})[1],[])
        _hidden,retained,filtered,reused=native.filtered_release_ledger(self.store,project,change,{'sessions':[new]})
        self.assertEqual(retained,[new]);self.assertTrue(filtered);self.assertEqual(reused,{'same-session'})

    def test_only_released_snapshot_removes_report_and_aggregate_without_reimport(self):
        import cab_sgs
        target={**self.binding,'binding':'direct-target','run':'other-run','session':'direct-session',
                'instance':f'codex-direct-session-uid{os.getuid()}','cab_direct':True}
        self.store.bind(target,os.getuid())
        self.store.close_binding('direct-target','2026-11-06T10:00:05Z',os.getuid())
        scope={'workspace':str(self.root),'changeId':'fixture-change','runIds':['other-run'],
               'ids':['direct-session'],'sessionId':'direct-session','bindingId':'direct-target','closureAuthority':'direct-session-v1'}
        directory=self.root/'openspec/changes/fixture-change';directory.mkdir(parents=True)
        (directory/'BLOCKERS.md').write_text('fixture')
        snapshot={'format':'cab-native-sgs-1','sessions':[s for s in self.store.statistics(str(self.root))['sessions'] if s['binding']=='direct-target']}
        contribution=cab_sgs.blank();contribution['metrics']['tests']={'state':'known','value':'7','reason':None,'evidence':[{'line':1,'note':'fixture'}]}
        evidence={'schema_version':1,'session_id':'direct-session','scope':'cumulative',
                  'contribution':contribution,'native_telemetry':snapshot}
        cab_sgs.change_report(self.root,str(directory.relative_to(self.root)),json.dumps(evidence).encode(),'blocked')
        report=directory/'STATISTICS.md';before=report.read_bytes()
        native.import_blocked_report(self.store,str(self.root),'fixture-change')
        with self.assertRaisesRegex(runtime.RuntimeErrorCode,'sgs-open-run-still-registered'):
            self.store.forget_open_run(str(self.root),'fixture-change','other-run',os.getuid())
        self.store.purge(scope,'released-only-receipt',[],os.getuid())
        row=self.store.db.execute('SELECT project,path,body FROM archive_reports').fetchone()
        mixed=json.loads(row['body']);mixed['contribution']['sessions'].append('unrelated-session')
        self.store.db.execute('UPDATE archive_reports SET body=? WHERE project=? AND path=?',(json.dumps(mixed),row['project'],row['path']))
        with self.assertRaisesRegex(runtime.RuntimeErrorCode,'sgs-report-aggregate-not-separable'):
            self.store.forget_released_snapshot(scope,'released-only-receipt',os.getuid())
        self.store.db.execute('UPDATE archive_reports SET body=? WHERE project=? AND path=?',(row['body'],row['project'],row['path']))
        self.assertEqual(self.store.forget_open_run(str(self.root),'fixture-change','other-run',os.getuid())['status'],'SNAPSHOT_FORGOTTEN')
        self.assertEqual(self.store.statistics(str(self.root))['archives'],[])
        self.assertEqual(self.store.forget_open_run(str(self.root),'fixture-change','other-run',os.getuid())['status'],'ABSENT')
        self.assertEqual(native.import_blocked_report(self.store,str(self.root),'fixture-change')['status'],'released-change-suppressed')
        self.assertEqual(self.store.statistics(str(self.root))['archives'],[])
        self.assertEqual(self.store.forget_released_snapshot(scope,'released-only-receipt',os.getuid())['status'],'SNAPSHOT_FORGOTTEN')
        self.assertEqual(report.read_bytes(),before)

    def test_closed_change_forget_removes_history_but_keeps_other_changes_and_future_run(self):
        import cab_sgs
        target={**self.binding,'binding':'pa10-binding','change':'pa10-change','run':'pa10-run','session':'pa10-session',
                'instance':f'codex-pa10-session-uid{os.getuid()}','cab_direct':True}
        self.store.bind(target,os.getuid());self.store.close_binding('pa10-binding','2026-11-06T10:00:05Z',os.getuid())
        directory=self.root/'openspec/changes/pa10-change';directory.mkdir(parents=True);(directory/'BLOCKERS.md').write_text('fixture')
        snapshot={'format':'cab-native-sgs-1','sessions':[s for s in self.store.statistics(str(self.root))['sessions'] if s['binding']=='pa10-binding']}
        for session_id,scope,native_data in [('legacy-pa10','cumulative',None),('pa10-session','increment',snapshot)]:
            evidence={'schema_version':1,'session_id':session_id,'scope':scope,'contribution':cab_sgs.blank()}
            if native_data:evidence['native_telemetry']=native_data
            cab_sgs.change_report(self.root,str(directory.relative_to(self.root)),json.dumps(evidence).encode(),'blocked')
        report=directory/'STATISTICS.md';before=report.read_bytes();native.import_blocked_report(self.store,str(self.root),'pa10-change')
        scope={'workspace':str(self.root),'changeId':'pa10-change','runIds':['pa10-run'],'ids':['pa10-session'],
               'sessionId':'pa10-session','bindingId':'pa10-binding','closureAuthority':'direct-session-v1'}
        with self.assertRaisesRegex(runtime.RuntimeErrorCode,'sgs-open-change-still-registered'):
            self.store.forget_open_change(str(self.root),'pa10-change','pa10-run',os.getuid())
        self.store.purge(scope,'pa10-receipt',[],os.getuid())
        row=self.store.db.execute('SELECT body FROM archive_reports WHERE project=?',(str(self.root),)).fetchone()
        mixed=json.loads(row['body']);foreign={**snapshot['sessions'][0],'change':'other-change','binding':'foreign-binding'}
        mixed['native_telemetry'][0]['snapshot']['sessions'].append(foreign)
        self.store.db.execute('UPDATE archive_reports SET body=? WHERE project=?',(json.dumps(mixed),str(self.root)))
        with self.assertRaisesRegex(runtime.RuntimeErrorCode,'sgs-open-change-foreign-session'):
            self.store.forget_open_change(str(self.root),'pa10-change','pa10-run',os.getuid())
        self.store.db.execute('UPDATE archive_reports SET body=? WHERE project=?',(row['body'],str(self.root)))
        self.assertEqual(self.store.forget_open_change(str(self.root),'pa10-change','pa10-run',os.getuid())['status'],'CHANGE_REPORT_FORGOTTEN')
        self.assertEqual(self.store.forget_open_change(str(self.root),'pa10-change','pa10-run',os.getuid())['status'],'ALREADY_ABSENT')
        self.assertEqual(native.import_blocked_report(self.store,str(self.root),'pa10-change')['status'],'released-change-suppressed')
        self.assertEqual(self.store.statistics(str(self.root))['archives'],[])
        self.assertEqual(self.stats()['binding'],'fixture-binding');self.assertEqual(report.read_bytes(),before)
        archive=self.root/'openspec/changes/archive/2026-11-08-pa10-change';archive.mkdir(parents=True)
        (archive/'STATISTICS.md').write_bytes(before)
        self.assertEqual(native.import_archives(self.store,str(self.root))['imported'],0)
        self.assertEqual(self.store.statistics(str(self.root))['archives'],[])
        new={**target,'binding':'future-binding','run':'future-run','session':'future-session','instance':f'codex-future-session-uid{os.getuid()}'}
        self.store.bind(new,os.getuid());new_snapshot={'format':'cab-native-sgs-1','sessions':[s for s in self.store.statistics(str(self.root))['sessions'] if s['binding']=='future-binding']}
        evidence={'schema_version':1,'session_id':'future-session','scope':'increment','contribution':cab_sgs.blank(),'native_telemetry':new_snapshot}
        cab_sgs.change_report(self.root,str(directory.relative_to(self.root)),json.dumps(evidence).encode(),'blocked')
        native.import_blocked_report(self.store,str(self.root),'pa10-change')
        current=self.store.statistics(str(self.root))['archives'][0]
        self.assertEqual(current['contribution']['sessions'],['future-session'])
        self.assertEqual([s['binding'] for r in current['native_telemetry'] for s in r['snapshot']['sessions']],['future-binding'])
        # Un cumul ultérieur peut inclure l'ancien historique : ne pas le réattribuer.
        later={'schema_version':1,'session_id':'future-cumulative','scope':'cumulative','contribution':cab_sgs.blank(),'native_telemetry':new_snapshot}
        later['contribution']['metrics']['tests']={'state':'known','value':'9','reason':None,'evidence':[{'line':1,'note':'fixture'}]}
        cab_sgs.change_report(self.root,str(directory.relative_to(self.root)),json.dumps(later).encode(),'blocked')
        native.import_blocked_report(self.store,str(self.root),'pa10-change')
        current=self.store.statistics(str(self.root))['archives'][0]
        self.assertEqual(current['contribution']['metrics']['tests']['state'],'unavailable')

    def test_forget_released_open_snapshot_preserves_peer_and_prevents_reimport(self):
        import cab_sgs
        target={**self.binding,'binding':'direct-target','session':'direct-session','instance':f'codex-direct-session-uid{os.getuid()}','cab_direct':True}
        self.store.bind(target,os.getuid())
        self.store.close_binding('fixture-binding','2026-11-06T10:00:05Z',os.getuid())
        self.store.close_binding('direct-target','2026-11-06T10:00:05Z',os.getuid())
        scope={'workspace':str(self.root),'changeId':'fixture-change','runIds':['fixture-run'],
               'ids':['direct-session'],'sessionId':'direct-session','bindingId':'direct-target','closureAuthority':'direct-session-v1'}
        directory=self.root/'openspec/changes/fixture-change';directory.mkdir(parents=True)
        (directory/'BLOCKERS.md').write_text('fixture')
        snapshot={'format':'cab-native-sgs-1','sessions':self.store.statistics(str(self.root))['sessions']}
        evidence={'schema_version':1,'session_id':'fixture-report','scope':'cumulative',
                  'contribution':cab_sgs.blank(),'native_telemetry':snapshot}
        cab_sgs.change_report(self.root,str(directory.relative_to(self.root)),json.dumps(evidence).encode(),'blocked')
        report=directory/'STATISTICS.md';before=report.read_bytes()
        native.import_blocked_report(self.store,str(self.root),'fixture-change')
        with self.assertRaisesRegex(runtime.RuntimeErrorCode,'sgs-report-release-proof-invalid'):
            self.store.forget_released_snapshot(scope,'not-released',os.getuid())
        self.store.purge(scope,'released-receipt',[],os.getuid())
        with self.assertRaisesRegex(runtime.RuntimeErrorCode,'sgs-report-release-owner-mismatch'):
            self.store.forget_released_snapshot(scope,'released-receipt',os.getuid()+1)
        row=self.store.db.execute('SELECT project,path,fingerprint,body FROM archive_reports').fetchone()
        mixed=json.loads(row['body']);mixed['contribution']['metrics']['tests']={'state':'known','value':'7','reason':None,'evidence':[{'line':1,'note':'fixture'}]}
        self.store.db.execute('UPDATE archive_reports SET body=? WHERE project=? AND path=?',(json.dumps(mixed),row['project'],row['path']))
        with self.assertRaisesRegex(runtime.RuntimeErrorCode,'sgs-report-aggregate-not-separable'):
            self.store.forget_released_snapshot(scope,'released-receipt',os.getuid())
        self.assertEqual(self.store.db.execute('SELECT body FROM archive_reports').fetchone()[0],json.dumps(mixed))
        self.store.db.execute('UPDATE archive_reports SET body=? WHERE project=? AND path=?',(row['body'],row['project'],row['path']))
        self.assertEqual(self.store.forget_released_snapshot(scope,'released-receipt',os.getuid())['status'],'SNAPSHOT_FORGOTTEN')
        self.assertEqual(self.store.forget_released_snapshot(scope,'released-receipt',os.getuid())['status'],'SNAPSHOT_FORGOTTEN')
        native.import_blocked_report(self.store,str(self.root),'fixture-change')
        telemetry=self.store.statistics(str(self.root))['archives'][0]['native_telemetry']
        self.assertEqual([s['binding'] for r in telemetry for s in r['snapshot']['sessions']],['fixture-binding'])
        self.assertEqual(report.read_bytes(),before)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="cab-runtime-fixture-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.store = runtime.RuntimeStore(self.root / "private")
        self.addCleanup(self.store.close)
        self.binding = {"binding": "fixture-binding", "host": "fixture-host", "instance": "fixture-instance",
                        "project": str(self.root), "change": "fixture-change", "run": "fixture-run", "session": "fixture-session",
                        "role": "coder", "agent": "codex", "mode": "direct", "started_at": "2026-11-06T10:00:00Z"}
        self.store.bind(self.binding, os.getuid())

    def event(self, identity, sequence, metrics, **extra):
        body = {"binding": "fixture-binding", "event_id": identity, "source": "codex-native", "stream": "native-tokens",
                "sequence": sequence, "at": f"2026-11-06T10:00:{sequence:02d}Z", "semantics": "cumulative", "metrics": metrics, **extra}
        return self.store.event(body, os.getuid())

    def stats(self):
        return self.store.statistics(str(self.root))["sessions"][0]

    def test_service_drains_own_outbox_without_agent_retry(self):
        server=service.RuntimeServer(self.root/'isolated-service/sgs','sgs',external_collectors=False)
        self.addCleanup(server.server_close)
        directory=self.root/'isolated-service/sgs-outbox'
        directory.mkdir(mode=0o700)
        event={'binding':'fixture-binding','event_id':'outbox-event','source':'cab-component','stream':'fixture',
               'sequence':1,'at':'2026-11-06T10:00:01Z','semantics':'delta','metrics':{'commands':'1'}}
        for name,value in [('binding-'+'a'*64+'.json',self.binding),('b'*64+'.json',event)]:
            path=directory/name
            path.write_text(json.dumps(value));path.chmod(0o600)
        server.drain_outbox()
        self.assertEqual(list(directory.iterdir()),[])
        self.assertEqual(server.store.statistics(str(self.root))['sessions'][0]['metrics']['commands'],'1')

    def test_idempotence_native_totals_model_periods_and_owner(self):
        first = {"tokens_input": 100, "tokens_cache_read": 80, "tokens_output": 20, "tokens_reasoning": 5, "tokens_total": 120}
        self.event("e1", 1, first, model={"name": "model-a", "provider": "provider-a", "reasoning": "high"})
        self.assertEqual(self.event("e1", 1, first, model={"name": "model-a", "provider": "provider-a", "reasoning": "high"})["status"], "duplicate")
        self.event("e2", 2, {"tokens_total": 180, "tokens_input": 150}, model={"name": "model-b", "provider": "provider-a", "reasoning": "low"})
        stats = self.stats()
        self.assertEqual(stats["metrics"]["tokens_total"], "180")
        self.assertEqual(len(stats["models"]), 2)
        self.assertEqual(stats["models"][0]["until"], "2026-11-06T10:00:02+00:00")
        self.assertEqual(stats["coverage"]["ttft_seconds"], "unavailable")
        with self.assertRaisesRegex(runtime.RuntimeErrorCode, "conflict"):
            self.event("e1", 1, {"tokens_total": 999})
        with self.assertRaisesRegex(runtime.RuntimeErrorCode, "owner-mismatch"):
            self.store.event(
                {"binding": "fixture-binding", "event_id": "e3", "source": "codex-native", "stream": "native-tokens", "sequence": 3,
                 "at": "2026-11-06T10:00:03Z", "semantics": "delta", "metrics": {}}, os.getuid() + 1)

    def test_llm_cannot_double_native_values_or_send_prompt(self):
        self.event("native", 1, {"tokens_input": 100})
        self.event("llm", 2, {"tokens_input": 999, "tests": 4}, source="llm-supplement", semantics="delta")
        self.assertEqual(self.stats()["metrics"]["tokens_input"], "100")
        self.assertEqual(self.stats()["metrics"]["tests"], "4")
        self.assertEqual(self.stats()['coverage']['tests'],'supplement')
        self.assertEqual(self.stats()['coverage']['tokens_input'],'native')
        with self.assertRaisesRegex(runtime.RuntimeErrorCode, "event-invalid"):
            self.event("bad", 3, {}, prompt="must-not-be-stored")

    def test_codex_replay_tail_and_counter_reset(self):
        path = self.root / ".codex/sessions/2026/11/06/rollout-fixture.jsonl"
        path.parent.mkdir(parents=True)
        def record(kind, payload, at="2026-11-06T10:00:01Z"):
            return json.dumps({"type": kind, "payload": payload, "timestamp": at}) + "\n"
        prefix = record("session_meta", {"id": "fixture-session", "cwd": str(self.root)})
        prefix += record("turn_context", {"model": "fixture-model", "effort": "high"})
        prefix += record("event_msg", {"type": "token_count", "info": {"total_token_usage": {"input_tokens": 100, "cached_input_tokens": 60, "output_tokens": 20, "total_tokens": 120}}})
        path.write_text(prefix)
        native.collect_codex(self.store, self.binding, path, self.root)
        native.collect_codex(self.store, self.binding, path, self.root)
        self.assertEqual(self.stats()["metrics"]["tokens_total"], "120")
        next_line = record("event_msg", {"type": "token_count", "info": {"total_token_usage": {"input_tokens": 150, "cached_input_tokens": 80, "output_tokens": 30, "total_tokens": 180}}}, "2026-11-06T10:00:02Z")
        with path.open("a") as f:
            f.write(next_line[:-1])
        native.collect_codex(self.store, self.binding, path, self.root)
        self.assertEqual(self.stats()["metrics"]["tokens_total"], "120")
        with path.open("a") as f:
            f.write("\n")
        native.collect_codex(self.store, self.binding, path, self.root)
        self.assertEqual(self.stats()["metrics"]["tokens_total"], "180")
        with path.open("a") as f:
            f.write(record("event_msg", {"type": "token_count", "info": {"total_token_usage": {"input_tokens": 5, "total_tokens": 5}}}, "2026-11-06T10:00:03Z"))
        native.collect_codex(self.store, self.binding, path, self.root)
        self.assertEqual(self.stats()["metrics"]["tokens_total"], "180")
        self.assertEqual(self.stats()["coverage"]["tokens_total"], "partial")

    def incident(self, identity):
        return self.store.incident({"incident_id": identity, "project": str(self.root), "change": "fixture-change", "run": "fixture-run",
                                    "reporter": "reporter-" + identity, "version": "2.4.6", "category": "protocol", "summary": "Incident synthétique", "evidence": []})

    def test_ccab_fifo_batch_resume_individual_resolution(self):
        self.incident("first")
        self.incident("second")
        self.incident("third")
        claim = self.store.claim("claim-first", "orchestrator")
        self.assertEqual(claim["incident_ids"], ["first"])
        self.assertEqual(self.store.claim("claim-first", "orchestrator"), claim)
        with self.assertRaisesRegex(runtime.RuntimeErrorCode, "reason-required"):
            self.store.claim("claim-bad", "orchestrator", ["second", "third"])
        batch = self.store.claim("claim-batch", "orchestrator", ["second", "third"], "Même cause établie")
        self.assertEqual(len(batch["incident_ids"]), 2)
        resolution = {"classification": "false-positive", "method": "Méthode vérifiée", "reporters_verified": ["reporter-second"], "release": None}
        self.store.resolve("resolve-second", "second", "claim-batch", "orchestrator", resolution)
        self.assertEqual([v["state"] for v in self.store.incidents()], ["CLAIMED", "RESOLVED", "CLAIMED"])
        with self.assertRaisesRegex(runtime.RuntimeErrorCode, "claim-unavailable"):
            self.store.claim("claim-stolen", "another", ["third"], "Concurrence")

    def test_ccab_treated_without_fix_preserves_limitation_and_refuses_release(self):
        self.incident("no-fix-case")
        self.store.claim("claim-no-fix", "orchestrator")
        resolution = {"classification": "no-fix", "method": "Examiné ; source absente, protection conservée", "reporters_verified": ["reporter-no-fix-case"], "release": None}
        invalid = dict(resolution, release={"version": "fixture"})
        with self.assertRaisesRegex(runtime.RuntimeErrorCode, "ccab-no-fix-release-invalid"):
            self.store.resolve("resolve-invalid", "no-fix-case", "claim-no-fix", "orchestrator", invalid)
        result = self.store.resolve("resolve-no-fix", "no-fix-case", "claim-no-fix", "orchestrator", resolution)
        self.assertEqual(result["state"], "RESOLVED")
        self.assertEqual(result["resolution"], resolution)

    def test_ccab_target_purge_preserves_open_incident_and_shared_claim(self):
        self.incident("first-purge")
        self.incident("second-purge")
        self.store.claim("claim-shared", "orchestrator", ["first-purge", "second-purge"], "Lot commun")
        with self.assertRaisesRegex(runtime.RuntimeErrorCode, "ccab-purge-untreated"):
            self.store.purge_treated("first-purge")
        resolution = {"classification": "no-fix", "method": "Examiné, limite conservée", "reporters_verified": ["reporter-first-purge"], "release": None}
        self.store.resolve("resolve-first", "first-purge", "claim-shared", "orchestrator", resolution)
        self.assertEqual(self.store.purge_treated("first-purge")["status"], "PURGED_TREATED")
        self.assertEqual(self.store.purge_treated("first-purge")["status"], "ALREADY_ABSENT")
        self.assertEqual([item["incident_id"] for item in self.store.incidents()], ["second-purge"])
        self.assertIsNotNone(self.store.db.execute("SELECT 1 FROM receipts WHERE action_id='claim-shared'").fetchone())
        resolution["reporters_verified"] = ["reporter-second-purge"]
        self.store.resolve("resolve-second", "second-purge", "claim-shared", "orchestrator", resolution)
        self.store.purge_treated("second-purge")
        self.assertIsNone(self.store.db.execute("SELECT 1 FROM receipts WHERE action_id='claim-shared'").fetchone())

    def test_ccab_batch_purge_refuses_mixed_and_keeps_outside_incident(self):
        for identity in ("batch-first", "batch-second", "outside"):
            self.incident(identity)
        self.store.claim("claim-batch-purge", "orchestrator", ["batch-first", "batch-second"], "Même cause")
        resolution = {"classification": "no-fix", "method": "Traitement effectué ; limite conservée", "reporters_verified": ["reporter-batch-first"], "release": None}
        self.store.resolve("resolve-batch-first", "batch-first", "claim-batch-purge", "orchestrator", resolution)
        with self.assertRaisesRegex(runtime.RuntimeErrorCode, "ccab-purge-untreated"):
            self.store.purge_treated_batch(["batch-first", "batch-second"])
        self.assertEqual(len(self.store.incidents()), 3)
        resolution["reporters_verified"] = ["reporter-batch-second"]
        self.store.resolve("resolve-batch-second", "batch-second", "claim-batch-purge", "orchestrator", resolution)
        self.assertEqual(self.store.purge_treated_batch(["batch-first", "batch-second"])["removed"], 2)
        self.assertEqual([item["incident_id"] for item in self.store.incidents()], ["outside"])

    def test_ccab_global_purge_is_atomic_and_requires_all_treated(self):
        self.incident("treated")
        self.incident("open")
        self.store.claim("claim-treated", "orchestrator")
        resolution = {"classification": "no-fix", "method": "Examiné, limite conservée", "reporters_verified": ["reporter-treated"], "release": None}
        self.store.resolve("resolve-treated", "treated", "claim-treated", "orchestrator", resolution)
        with self.assertRaisesRegex(runtime.RuntimeErrorCode, "ccab-purge-untreated"):
            self.store.purge_all_treated()
        self.assertEqual(len(self.store.incidents()), 2)
        self.store.claim("claim-open", "orchestrator")
        resolution["reporters_verified"] = ["reporter-open"]
        self.store.resolve("resolve-open", "open", "claim-open", "orchestrator", resolution)
        self.assertEqual(self.store.purge_all_treated()["removed"], 2)
        self.assertEqual(self.store.incidents(), [])

    def test_direct_purge_refuses_closed_pilot_without_authority(self):
        self.store.close_binding('fixture-binding','2026-11-06T10:00:01Z',os.getuid())
        pilot={**self.binding,'binding':'pilot-binding','session':'pilot-session','mode':'piloted','agent':'opencode'}
        target={**self.binding,'binding':'direct-target','session':'direct-session','cab_direct':True}
        self.store.bind(pilot,os.getuid());self.store.bind(target,os.getuid())
        self.store.close_binding('pilot-binding','2026-11-06T10:00:02Z',os.getuid())
        self.store.close_binding('direct-target','2026-11-06T10:00:03Z',os.getuid())
        scope={'workspace':str(self.root),'changeId':'fixture-change','runIds':['fixture-run'],
               'ids':['direct-session'],'sessionId':'direct-session','bindingId':'direct-target','closureAuthority':'direct-session-v1'}
        with self.assertRaisesRegex(runtime.RuntimeErrorCode,'direct-closure-pilot-authority-required'):
            self.store.purge_preview(scope,os.getuid())
        self.assertEqual(len(self.store.statistics(str(self.root))['sessions']),3)

    def test_direct_purge_preserves_closed_history_and_refuses_active_peer(self):
        import cab_sgs
        target={**self.binding,'binding':'direct-target','session':'direct-session','cab_direct':True}
        self.store.bind(target,os.getuid())
        self.store.close_binding('direct-target','2026-11-06T10:00:05Z',os.getuid())
        scope={'workspace':str(self.root),'changeId':'fixture-change','runIds':['fixture-run'],
               'ids':['direct-session'],'sessionId':'direct-session','bindingId':'direct-target','closureAuthority':'direct-session-v1'}
        with self.assertRaisesRegex(runtime.RuntimeErrorCode,'direct-closure-active-peer'):
            self.store.purge_preview(scope,os.getuid())
        self.assertEqual(len(self.store.statistics(str(self.root))['sessions']),2)
        self.store.close_binding('fixture-binding','2026-11-06T10:00:06Z',os.getuid())
        snapshot={'format':'cab-native-sgs-1','sessions':self.store.statistics(str(self.root))['sessions']}
        directory=self.root/'openspec/changes/archive/2026-11-06-fixture-change';directory.mkdir(parents=True)
        evidence={'schema_version':1,'session_id':'fixture-report','scope':'cumulative',
                  'contribution':cab_sgs.blank(),'native_telemetry':snapshot}
        cab_sgs.change_report(self.root,str(directory.relative_to(self.root)),json.dumps(evidence).encode(),'archived')
        native.import_archives(self.store,self.root)
        other={**self.binding,'binding':'other-run-binding','run':'other-run','session':'other-session'}
        self.store.bind(other,os.getuid())
        self.store.component_checkpoint({'project':str(self.root),'component':'controller-statistics','sequence':1,
            'at':'2026-11-06T10:00:00Z','data':{'kept':'history'}},os.getuid())
        self.store.cursor('shared-cursor',{'offset':1},binding='fixture-binding')
        self.store.cursor('shared-cursor',{'offset':1},binding='direct-target')
        result=self.store.purge(scope,'direct-receipt',[],os.getuid())
        self.assertEqual(result['bindingsRemoved'],1)
        self.assertEqual(self.store.verify_released_snapshot(scope,'direct-receipt',os.getuid())['status'],'RELEASE_VERIFIED')
        with self.assertRaisesRegex(runtime.RuntimeErrorCode,'sgs-report-release-proof-invalid'):
            self.store.verify_released_snapshot({**scope,'sessionId':'foreign','ids':['foreign']},'direct-receipt',os.getuid())
        with self.assertRaisesRegex(runtime.RuntimeErrorCode,'sgs-report-release-proof-invalid'):
            self.store.verify_released_snapshot(scope,'unknown-receipt',os.getuid())
        remaining=self.store.statistics(str(self.root))
        self.assertEqual([row['binding'] for row in remaining['sessions']],['fixture-binding','other-run-binding'])
        self.assertEqual(remaining['archives'][0]['native_telemetry'][0]['snapshot'],snapshot)
        self.assertEqual(json.loads(self.store.db.execute('SELECT body FROM component_checkpoints').fetchone()[0]),{'kept':'history'})
        self.assertEqual(self.store.cursor('shared-cursor'),{'offset':1})
        self.assertEqual(self.store.purge(scope,'direct-receipt',[],os.getuid()),result)
        with self.assertRaisesRegex(runtime.RuntimeErrorCode,'direct-closure-binding-not-found'):
            self.store.purge(scope,'new-receipt',[],os.getuid())

    def test_all_archived_reports_import_without_rewrite(self):
        directory = self.root / "openspec/changes/archive/2026-11-06-fixture"
        directory.mkdir(parents=True)
        path = directory / "STATISTICS.md"
        content = "# Statistiques\n\nSCM directe.\n| Mesure | Valeur |\n|---|---|\n| Tokens d’entrée | 42 |\n"
        path.write_text(content)
        result = native.import_archives(self.store, self.root)
        self.assertEqual(result["imported"], 1)
        self.assertEqual(native.import_archives(self.store, self.root)["imported"], 0)
        self.assertEqual(path.read_text(), content)
        self.assertEqual(len(self.store.statistics(str(self.root))["archives"]), 1)

    def test_native_history_survives_runtime_deletion_in_durable_report(self):
        import cab_sgs
        self.event("native-report", 1, {"tokens_input": 100, "tokens_cache_read": 80, "tokens_total": 120},
                   model={"name": "model-a", "provider": "fixture-provider", "reasoning": "high"})
        self.store.close_binding('fixture-binding','2026-11-06T10:00:01Z',os.getuid())
        with self.assertRaisesRegex(runtime.RuntimeErrorCode, 'sgs-binding-closed'):
            self.event('late-backdated', 2, {'tokens_input': 1})
        snapshot={"format":"cab-native-sgs-1","sessions":self.store.statistics(str(self.root))["sessions"]}
        directory=self.root/"openspec/changes/archive/2026-11-06-fixture-change"
        directory.mkdir(parents=True)
        evidence={"schema_version":1,"session_id":"fixture-report","scope":"cumulative","contribution":cab_sgs.blank(),"native_telemetry":snapshot}
        cab_sgs.change_report(self.root,str(directory.relative_to(self.root)),json.dumps(evidence).encode(),"archived")
        report=(directory/"STATISTICS.md").read_text()
        self.assertEqual(report.count("\n## "),6)
        self.assertIn("model-a",report)
        self.store.db.execute("DELETE FROM telemetry")
        native.import_archives(self.store,self.root)
        archived=self.store.statistics(str(self.root))["archives"][0]
        restored=archived["native_telemetry"][0]["snapshot"]
        self.assertEqual(restored,snapshot)
        self.assertEqual(archived["change"],"fixture-change")
        # La purge des buffers n'efface pas le rapport importé ni ses modèles.
        scope={'workspace':str(self.root),'changeId':'fixture-change','runIds':['fixture-run'],'ids':['fixture-run','fixture-change','fixture-session']}
        result=self.store.purge(scope,'purge-fixture',[],os.getuid())
        self.assertEqual(result['status'],'PURGED')
        self.assertEqual(self.store.statistics(str(self.root))['sessions'],[])
        self.assertEqual(self.store.statistics(str(self.root))['archives'][0]['native_telemetry'][0]['snapshot'],snapshot)

    def test_codex_native_items_and_configured_provider_without_reasoning_text(self):
        path=self.root/'.codex/sessions/rollout-native-items.jsonl';path.parent.mkdir(parents=True)
        def record(kind,payload,at='2026-11-06T10:00:01Z'):
            return json.dumps({'type':kind,'timestamp':at,'payload':payload})+'\n'
        text=record('session_meta',{'id':'fixture-session','cwd':str(self.root)})
        text+=record('event_msg',{'type':'thread_settings_applied','thread_settings':{'model':'model-a','model_provider_id':'provider-a','reasoning_effort':'high'}})
        for item in [
            {'type':'CommandExecution','id':'command-one','exit_code':0,'status':'completed','command':'NOT_STORED','aggregated_output':'NOT_STORED'},
            {'type':'CommandExecution','id':'command-one','exit_code':0,'status':'completed'},
            {'type':'ContextCompaction','id':'compaction-one'},
            {'type':'FileChange','id':'patch-one','status':'completed','changes':{'src/file.py':{'diff':'NOT_STORED'}}},
            {'type':'Reasoning','id':'reasoning-one','raw_content':'NOT_STORED'},
        ]:
            text+=record('event_msg',{'type':'item_completed','item':item,'started_at_ms':1000,'completed_at_ms':2000})
        text+=record('event_msg',{'type':'thread_settings_applied','thread_settings':{'model':'model-b','model_provider_id':'provider-b','reasoning_effort':'low'}},'2026-11-06T10:00:02Z')
        path.write_text(text);native.collect_codex(self.store,self.binding,path,self.root)
        stats=self.stats()
        self.assertEqual(stats['metrics']['commands'],'1')
        self.assertEqual(stats['metrics']['compactions'],'1')
        self.assertEqual(stats['metrics']['files_touched'],'1')
        self.assertEqual(stats['models'][1]['model']['provider'],'provider-b')
        self.assertEqual(stats['models'][1]['model']['reasoning'],'low')
        rows=[row[0] for row in self.store.db.execute('SELECT body FROM telemetry')]
        self.assertNotIn('NOT_STORED',''.join(rows))

    def test_retired_batch_without_native_window_preserves_live_peer(self):
        scope={'workspace':str(self.root),'changeId':'retired-batch','runIds':['old-run'],
               'ids':['old-run'],'changeIds':['old-change'],'protectedRunIds':['fixture-run'],
               'closureAuthority':'authoritative-retired-run-batch-v1'}
        result=self.store.purge(scope,'retired-no-native-window',[],os.getuid())
        self.assertEqual(result['bindingsRemoved'],0)
        self.assertEqual(self.stats()['binding'],'fixture-binding')
        selected={**scope,'runIds':['fixture-run'],'protectedRunIds':['other-run']}
        with self.assertRaisesRegex(runtime.RuntimeErrorCode,'sgs-durable-report-required'):
            self.store.purge(selected,'retired-native-needs-report',[],os.getuid())
        with self.assertRaisesRegex(runtime.RuntimeErrorCode,'sgs-purge-scope-invalid'):
            self.store.purge({**scope,'protectedRunIds':['old-run']},'retired-overlap-refused',[],os.getuid())

    def test_native_conflicting_latest_is_partial_and_later_snapshot_recovers(self):
        self.event('native-one',1,{'tools':1,'messages':1})
        self.event('native-two',1,{'tools':2,'messages':1})
        snapshot=self.stats()
        self.assertNotIn('tools',snapshot['metrics'])
        self.assertEqual(snapshot['coverage']['tools'],'partial')
        self.assertEqual(snapshot['metrics']['messages'],'1')
        self.assertEqual(snapshot['collector']['reason'],'native-cumulative-revision-conflict')
        self.event('native-final',2,{'tools':3,'messages':1})
        self.assertEqual(self.stats()['metrics']['tools'],'3')

    def test_retired_purge_does_not_fold_unselected_conflicting_peer(self):
        self.event('supplement-one',1,{'tools':1},source='llm-supplement')
        self.event('supplement-two',1,{'tools':2},source='llm-supplement')
        with self.assertRaisesRegex(runtime.RuntimeErrorCode,'sgs-cumulative-sequence-conflict'):self.stats()
        scope={'workspace':str(self.root),'changeId':'retired-batch','runIds':['old-run'],'ids':['old-run'],
               'changeIds':['old-change'],'protectedRunIds':['fixture-run'],'closureAuthority':'authoritative-retired-run-batch-v1'}
        self.assertEqual(self.store.purge(scope,'retired-preserve-conflicting-peer',[],os.getuid())['bindingsRemoved'],0)
        self.assertEqual(self.store.db.execute('SELECT COUNT(*) FROM telemetry').fetchone()[0],2)

    def test_explicit_archive_forget_suppresses_reimport_and_compacts(self):
        path='openspec/changes/archive/2026-11-07-retired-change/STATISTICS.md'
        sentinel='NATIVE_SESSION_RETIRED_SENTINEL_5f5822'
        self.store.import_archive(str(self.root),path,{'change':'retired-change','sha256':'a'*64,'contribution':{'audit':sentinel}})
        self.assertEqual(len(self.store.statistics(str(self.root))['archives']),1)
        self.store.forget_archives(str(self.root),[path])
        self.assertTrue(self.store.archive_suppressed(str(self.root),path))
        self.assertEqual(self.store.import_archive(str(self.root),path,{'change':'retired-change'})['status'],'developer-deleted')
        self.assertEqual(self.store.compact()['status'],'COMPACTED')
        self.assertNotIn(sentinel.encode(),(self.root/'private/runtime.sqlite3').read_bytes())
        self.assertEqual(self.stats()['binding'],'fixture-binding')


if __name__ == "__main__":
    unittest.main()
