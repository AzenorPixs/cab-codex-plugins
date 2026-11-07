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
                                    "reporter": "reporter-" + identity, "version": "2.4.1", "category": "protocol", "summary": "Incident synthétique", "evidence": []})

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


if __name__ == "__main__":
    unittest.main()
