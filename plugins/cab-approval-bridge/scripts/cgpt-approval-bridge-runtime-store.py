"""Stockage privé SGS/CCAB ; bibliothèque standard, sans contenu de conversation."""
from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import stat
import time
from uuid import uuid4

VERSION = "2.4.30"
IDENTIFIER = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.:/+@-]{0,255}$")
METRICS = frozenset(("tokens_input", "tokens_output", "tokens_reasoning",
                     "tokens_cache_read", "tokens_cache_write", "tokens_total",
                     "cost_usd", "messages", "tools", "commands", "writes", "web",
                     "permissions", "tests", "compactions", "duration_seconds",
                     "wait_seconds", "preparation_seconds", "ttft_seconds",
                     "generation_seconds", "update_preparation_seconds", "update_cutover_seconds"))
METRICS |= frozenset(('messages_llm','messages_user','messages_assistant','tools_llm','commands_api',
                      'commands_success','commands_failure','files_touched','command_wall_seconds',
                      'tool_wall_seconds','message_span_seconds','reasoning_span_seconds','web_search','web_open'))
METRICS |= frozenset(('ccab_open','ccab_claimed','ccab_resolved_retained','ccab_total_retained'))
SOURCES = frozenset(("codex-native", "opencode-native", "cab-component", "llm-supplement", "archive"))


class RuntimeErrorCode(ValueError):
    """Erreur publique sans données confidentielles."""


def identifier(value):
    if not isinstance(value, str) or not IDENTIFIER.fullmatch(value):
        raise RuntimeErrorCode("runtime-identity-invalid")
    return value


def timestamp(value):
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            raise ValueError()
        return parsed.astimezone(timezone.utc).isoformat()
    except (AttributeError, ValueError, OverflowError) as exc:
        raise RuntimeErrorCode("runtime-timestamp-invalid") from exc


def encoded(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def digest(value):
    return hashlib.sha256(encoded(value).encode()).hexdigest()


def quantities(values):
    if not isinstance(values, dict) or not set(values) <= METRICS:
        raise RuntimeErrorCode("sgs-metrics-invalid")
    result = {}
    for key, value in values.items():
        try:
            if isinstance(value, bool) or type(value) not in (str, int):
                raise ValueError()
            number = Decimal(str(value))
            if not number.is_finite() or number < 0 or number > Decimal("1e30"):
                raise ValueError()
            if key.startswith("tokens_") and number != number.to_integral():
                raise ValueError()
        except (ValueError, InvalidOperation) as exc:
            raise RuntimeErrorCode("sgs-quantity-invalid") from exc
        result[key] = str(number)
    return result


def private_directory(path):
    path = Path(path).absolute()
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    info = path.lstat()
    if stat.S_ISLNK(info.st_mode) or not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
        raise RuntimeErrorCode("runtime-storage-not-private")
    return path


class RuntimeStore:
    def __init__(self, directory):
        self.directory = private_directory(directory)
        path = self.directory / "runtime.sqlite3"
        if path.exists() or path.is_symlink():
            info = path.lstat()
            if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
                raise RuntimeErrorCode("runtime-database-not-private")
        else:
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
            os.close(fd)
        self.db = sqlite3.connect(path, timeout=5, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute('PRAGMA secure_delete=ON')
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS bindings(
          binding TEXT PRIMARY KEY, uid INTEGER NOT NULL, body TEXT NOT NULL, fingerprint TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS telemetry(
          binding TEXT NOT NULL REFERENCES bindings(binding), event_id TEXT NOT NULL,
          source TEXT NOT NULL, stream TEXT NOT NULL, sequence INTEGER NOT NULL,
          at TEXT NOT NULL, received TEXT NOT NULL, body TEXT NOT NULL, fingerprint TEXT NOT NULL,
          PRIMARY KEY(binding,event_id));
        CREATE TABLE IF NOT EXISTS cursors(
          producer TEXT PRIMARY KEY, body TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS native_sources(
          binding TEXT PRIMARY KEY REFERENCES bindings(binding), source TEXT NOT NULL,
          location TEXT NOT NULL, status TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS binding_closures(
          binding TEXT PRIMARY KEY REFERENCES bindings(binding), ended_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS archive_reports(
          project TEXT NOT NULL, path TEXT NOT NULL, fingerprint TEXT NOT NULL,
          body TEXT NOT NULL, PRIMARY KEY(project,path));
        CREATE TABLE IF NOT EXISTS archive_suppressions(
          project TEXT NOT NULL, path_digest TEXT NOT NULL, PRIMARY KEY(project,path_digest));
        CREATE TABLE IF NOT EXISTS incidents(
          sequence INTEGER PRIMARY KEY AUTOINCREMENT, incident_id TEXT UNIQUE NOT NULL,
          created TEXT NOT NULL, updated TEXT NOT NULL, state TEXT NOT NULL,
          body TEXT NOT NULL, claim TEXT, claimant TEXT, lease_until REAL,
          resolution TEXT);
        CREATE TABLE IF NOT EXISTS receipts(
          action_id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, body TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS component_checkpoints(
          project TEXT NOT NULL, component TEXT NOT NULL, uid INTEGER NOT NULL,
          sequence INTEGER NOT NULL, at TEXT NOT NULL, body TEXT NOT NULL,
          fingerprint TEXT NOT NULL, PRIMARY KEY(project,component));
        CREATE TABLE IF NOT EXISTS purge_receipts(
          receipt_id TEXT PRIMARY KEY, scope_digest TEXT NOT NULL, body TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS cursor_bindings(
          producer TEXT PRIMARY KEY, binding TEXT NOT NULL REFERENCES bindings(binding));
        CREATE TABLE IF NOT EXISTS service_metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
        """)
        self.db.execute("INSERT OR IGNORE INTO service_metadata VALUES('instance',?)",(str(uuid4()),))
        self.db.execute("INSERT OR IGNORE INTO service_metadata VALUES('started_at',?)",(datetime.now(timezone.utc).isoformat(),))

    def close(self):
        self.db.close()

    @contextmanager
    def transaction(self):
        if self.db.in_transaction:
            # Le collecteur regroupe événements et curseur dans un même commit.
            yield
            return
        self.db.execute("BEGIN IMMEDIATE")
        try:
            yield
        except BaseException:
            self.db.execute("ROLLBACK")
            raise
        else:
            self.db.execute("COMMIT")

    def bind(self, body, uid):
        expected = {"binding", "host", "instance", "project", "change", "run", "session", "role", "agent", "mode", "started_at"}
        if set(body)-{'cab_direct'} != expected or body["role"] not in ("coder", "orchestrator","component") or body["mode"] not in ("direct", "piloted","service"):
            raise RuntimeErrorCode("sgs-binding-invalid")
        if (body['role']=='component')!=(body['mode']=='service'):raise RuntimeErrorCode('sgs-component-mode-invalid')
        if 'cab_direct' in body and (type(body['cab_direct']) is not bool or body['cab_direct'] and body['mode']!='direct'):raise RuntimeErrorCode('sgs-direct-opt-in-invalid')
        for key in expected - {"started_at", "project"}:
            identifier(body[key])
        project = Path(body["project"])
        if not project.is_absolute() or str(project.resolve()) != str(project) or not project.is_dir():
            raise RuntimeErrorCode("sgs-project-invalid")
        timestamp(body["started_at"])
        with self.transaction():
            old = self.db.execute("SELECT * FROM bindings WHERE binding=?", (body["binding"],)).fetchone()
            if old and (old["uid"] != uid or old["fingerprint"] != digest(body)):
                prior=json.loads(old['body'])
                if old['uid']==uid and body.get('cab_direct') is True and {k:v for k,v in prior.items() if k!='cab_direct'}=={k:v for k,v in body.items() if k!='cab_direct'}:
                    self.db.execute('UPDATE bindings SET body=?,fingerprint=? WHERE binding=?',(encoded(body),digest(body),body['binding']))
                else:raise RuntimeErrorCode("sgs-binding-conflict")
            self.db.execute("INSERT OR IGNORE INTO bindings VALUES(?,?,?,?)", (body["binding"], uid, encoded(body), digest(body)))
        return {"binding": body["binding"], "status": "bound"}

    def event(self, body, uid):
        allowed = {"binding", "event_id", "source", "stream", "sequence", "at", "semantics", "metrics", "model", "coverage"}
        if not isinstance(body, dict) or set(body) - allowed or not allowed - {"model", "coverage"} <= set(body):
            raise RuntimeErrorCode("sgs-event-invalid")
        for key in ("binding", "event_id", "stream"):
            identifier(body[key])
        if body["source"] not in SOURCES or body["semantics"] not in ("delta", "cumulative") or type(body["sequence"]) is not int or not 0 <= body["sequence"] < 2**63:
            raise RuntimeErrorCode("sgs-event-invalid")
        timestamp(body["at"])
        quantities(body["metrics"])
        if "model" in body:
            model = body["model"]
            if not isinstance(model, dict) or set(model) != {"name", "provider", "reasoning"}:
                raise RuntimeErrorCode("sgs-model-invalid")
            for value in model.values():
                if value is not None:
                    identifier(value)
        if "coverage" in body:
            coverage = body["coverage"]
            if not isinstance(coverage, dict) or not set(coverage) <= METRICS or any(v not in ("native", "unavailable", "partial", "supplement") for v in coverage.values()):
                raise RuntimeErrorCode("sgs-coverage-invalid")
        with self.transaction():
            binding = self.db.execute("SELECT uid FROM bindings WHERE binding=?", (body["binding"],)).fetchone()
            if not binding or binding["uid"] != uid:
                raise RuntimeErrorCode("sgs-binding-owner-mismatch")
            old = self.db.execute("SELECT fingerprint FROM telemetry WHERE binding=? AND event_id=?", (body["binding"], body["event_id"])).fetchone()
            if old and old[0] != digest(body):
                raise RuntimeErrorCode("sgs-event-conflict")
            closure=self.db.execute("SELECT ended_at FROM binding_closures WHERE binding=?",(body["binding"],)).fetchone()
            if closure and not old:
                raise RuntimeErrorCode("sgs-binding-closed")
            self.db.execute("INSERT OR IGNORE INTO telemetry VALUES(?,?,?,?,?,?,?,?,?)", (
                body["binding"], body["event_id"], body["source"], body["stream"], body["sequence"],
                timestamp(body["at"]), datetime.now(timezone.utc).isoformat(), encoded(body), digest(body)))
        return {"event_id": body["event_id"], "status": "duplicate" if old else "stored"}

    def statistics(self, project, change=None, bindings=None):
        result = []
        for row in self.db.execute("SELECT * FROM bindings ORDER BY binding"):
            binding = json.loads(row["body"])
            if binding["project"] != project or (change and binding["change"] != change):
                continue
            if bindings is not None and row['binding'] not in bindings:continue
            rows = self.db.execute("SELECT * FROM telemetry WHERE binding=? ORDER BY at,sequence,event_id", (row["binding"],)).fetchall()
            latest, by_source, models, coverage, conflicts = {}, {}, [], {}, {}
            for event in rows:
                data = json.loads(event["body"])
                stream = (data["source"], data["stream"])
                if data["semantics"] == "cumulative":
                    if stream not in latest or latest[stream]["sequence"] < data["sequence"]:
                        latest[stream] = data
                        conflicts.pop(stream,None)
                    elif latest[stream]["sequence"] == data["sequence"] and latest[stream]["metrics"] != data["metrics"]:
                        keys=set(latest[stream]['metrics'])|set(data['metrics'])
                        conflicts.setdefault(stream,set()).update(k for k in keys if latest[stream]['metrics'].get(k)!=data['metrics'].get(k))
                else:
                    deltas = by_source.setdefault(data["source"], {})
                    for key, value in data["metrics"].items():
                        deltas[key] = deltas.get(key, Decimal(0)) + Decimal(str(value))
                for key, value in data.get("coverage", {}).items():
                    source_coverage = coverage.setdefault(data['source'], {})
                    if source_coverage.get(key) != "partial":
                        source_coverage[key] = value
                if data.get("model") and (not models or models[-1]["model"] != data["model"]):
                    if models:
                        models[-1]["until"] = event["at"]
                    models.append({"from": event["at"], "until": None, "model": data["model"], "source": data["source"]})
            for data in latest.values():
                deltas = by_source.setdefault(data["source"], {})
                for key, value in data["metrics"].items():
                    deltas[key] = deltas.get(key, Decimal(0)) + Decimal(str(value))
            # Une mesure native disponible ne s'additionne jamais à son complément LLM.
            deltas = {}
            selected_sources = {}
            for source in ("llm-supplement", "archive", "cab-component", "codex-native", "opencode-native"):
                deltas.update(by_source.get(source, {}))
                selected_sources.update({key:source for key in by_source.get(source,{})})
            if any(source not in ('codex-native','opencode-native') for source,_ in conflicts):raise RuntimeErrorCode('sgs-cumulative-sequence-conflict')
            uncertain=set().union(*conflicts.values()) if conflicts else set()
            for key in uncertain:deltas.pop(key,None)
            native_source = self.db.execute("SELECT source,status FROM native_sources WHERE binding=?", (row["binding"],)).fetchone()
            diagnostic=self.cursor('diagnostic-'+digest(row['binding']))
            diagnostic={key:value for key,value in (diagnostic or {}).items() if value is not None}
            if uncertain:diagnostic.update(status='partial',reason='native-cumulative-revision-conflict')
            closure=self.db.execute("SELECT ended_at FROM binding_closures WHERE binding=?",(row["binding"],)).fetchone()
            ended_at=closure[0] if closure else None
            if models and ended_at:models[-1]['until']=ended_at
            result.append({**binding, "metrics": {key: str(value) for key, value in deltas.items()},
                           "coverage": {key: 'partial' if key in uncertain else coverage.get(selected_sources.get(key),{}).get(key,
                               "supplement" if selected_sources.get(key)=='llm-supplement' else
                               "native" if key in deltas else "unavailable") for key in METRICS},
                           "models": models, "events": len(rows),"ended_at":ended_at,
                           "collector": {**dict(native_source),**(diagnostic or {})} if native_source else {"status": "unavailable", "reason": "native-source-not-registered",**diagnostic}})
        archives = [json.loads(row[0]) for row in self.db.execute("SELECT body FROM archive_reports WHERE project=? ORDER BY path", (project,))]
        if change:
            archives = [item for item in archives if item.get("change") == change]
        components=[{'component':row['component'],'sequence':row['sequence'],'at':row['at'],'fingerprint':row['fingerprint'],
                     'bytes':len(row['body'].encode())} for row in self.db.execute('SELECT * FROM component_checkpoints WHERE project=?',(project,))]
        return {"version": VERSION, "sessions": result, "archives": archives,'components':components,
                "totals_policy": "Native totals retain cache/reasoning inclusion; roles and archive contributions remain distinct."}

    def component_checkpoint(self,body,uid):
        expected={'project','component','sequence','at','data'}
        if not isinstance(body,dict) or set(body)!=expected or not isinstance(body['project'],str) or not Path(body['project']).is_absolute():raise RuntimeErrorCode('sgs-component-checkpoint-invalid')
        if body['component'] not in {'controller-statistics','controller-observations','protocol-efficiency','broker-statistics','supervisor-statistics','update-statistics'} or type(body['sequence']) is not int or not 0<=body['sequence']<=2**53-1:raise RuntimeErrorCode('sgs-component-checkpoint-invalid')
        timestamp(body['at'])
        data=body['data']
        def check(value,depth=0):
            if depth>32:raise RuntimeErrorCode('sgs-component-checkpoint-depth')
            if isinstance(value,dict):
                for key,item in value.items():
                    if key.lower() in {'password','authorization','raw_content','aggregated_output','stdout','stderr','prompt','command','secret'}:raise RuntimeErrorCode('sgs-component-sensitive-field')
                    if key.lower() in {'input','output','content','token'} and not (item is None or type(item) in (int,float)):raise RuntimeErrorCode('sgs-component-sensitive-field')
                    check(item,depth+1)
            elif isinstance(value,list):
                for item in value:check(item,depth+1)
            elif isinstance(value,str):
                if len(value)>4000 or '\n' in value or '\r' in value:raise RuntimeErrorCode('sgs-component-text-invalid')
            elif value is not None and type(value) not in (bool,int,float):raise RuntimeErrorCode('sgs-component-value-invalid')
        if not isinstance(data,dict):raise RuntimeErrorCode('sgs-component-data-invalid')
        check(data)
        fingerprint=digest(data)
        with self.transaction():
            old=self.db.execute('SELECT * FROM component_checkpoints WHERE project=? AND component=?',(body['project'],body['component'])).fetchone()
            if old and old['uid']!=uid:raise RuntimeErrorCode('sgs-component-owner-mismatch')
            if old and old['sequence']>body['sequence']:return {'status':'superseded','sequence':old['sequence']}
            if old and old['sequence']==body['sequence']:
                if old['fingerprint']!=fingerprint:raise RuntimeErrorCode('sgs-component-checkpoint-conflict')
                return {'status':'duplicate','sequence':old['sequence']}
            self.db.execute('INSERT INTO component_checkpoints VALUES(?,?,?,?,?,?,?) ON CONFLICT(project,component) DO UPDATE SET sequence=excluded.sequence,at=excluded.at,body=excluded.body,fingerprint=excluded.fingerprint',
                (body['project'],body['component'],uid,body['sequence'],timestamp(body['at']),encoded(data),fingerprint))
        return {'status':'stored','sequence':body['sequence'],'fingerprint':fingerprint}

    def close_binding(self,binding,ended_at,uid):
        identifier(binding);ended_at=timestamp(ended_at)
        with self.transaction():
            row=self.db.execute("SELECT body,uid FROM bindings WHERE binding=?",(binding,)).fetchone()
            if not row or row['uid']!=uid:raise RuntimeErrorCode('sgs-binding-owner-mismatch')
            latest=self.db.execute("SELECT MAX(at) FROM telemetry WHERE binding=?",(binding,)).fetchone()[0]
            start=timestamp(json.loads(row['body'])['started_at'])
            if ended_at<start or latest and ended_at<latest or datetime.fromisoformat(ended_at)>datetime.now(timezone.utc):raise RuntimeErrorCode('sgs-close-boundary-invalid')
            old=self.db.execute("SELECT ended_at FROM binding_closures WHERE binding=?",(binding,)).fetchone()
            if old and old[0]!=ended_at:raise RuntimeErrorCode('sgs-close-boundary-conflict')
            self.db.execute("INSERT OR IGNORE INTO binding_closures VALUES(?,?)",(binding,ended_at))
        return {'binding':binding,'ended_at':ended_at,'status':'closed'}

    def cursor(self, producer, value=None,binding=None):
        identifier(producer)
        if value is not None:
            self.db.execute("INSERT INTO cursors VALUES(?,?) ON CONFLICT(producer) DO UPDATE SET body=excluded.body", (producer, encoded(value)))
            if binding:self.db.execute('INSERT OR IGNORE INTO cursor_bindings VALUES(?,?)',(producer,binding))
            return value
        row = self.db.execute("SELECT body FROM cursors WHERE producer=?", (producer,)).fetchone()
        return json.loads(row[0]) if row else None

    def purge_preview(self,scope,uid):
        if not isinstance(scope,dict) or not {'workspace','changeId','runIds','ids'}<=set(scope):raise RuntimeErrorCode('sgs-purge-scope-invalid')
        identifier(scope['changeId'])
        if not isinstance(scope['workspace'],str) or not Path(scope['workspace']).is_absolute() or not isinstance(scope['runIds'],list) or not isinstance(scope['ids'],list):raise RuntimeErrorCode('sgs-purge-scope-invalid')
        targets=[]
        for row in self.db.execute('SELECT * FROM bindings'):
            value=json.loads(row['body'])
            if value['project']==scope['workspace'] and (value['run'] in scope['runIds'] if scope.get('closureAuthority')=='authoritative-retired-run-batch-v1' else value['change']==scope['changeId']):
                if row['uid']!=uid:raise RuntimeErrorCode('sgs-purge-owner-mismatch')
                targets.append(value['binding'])
        components=[{'component':row['component'],'fingerprint':row['fingerprint'],'sequence':row['sequence']} for row in self.db.execute('SELECT * FROM component_checkpoints WHERE project=?',(scope['workspace'],))]
        return {'bindings':targets,'components':components,'scope_digest':digest(scope)}

    def purge(self,scope,receipt_id,components,uid):
        identifier(receipt_id)
        preview=self.purge_preview(scope,uid)
        scope_digest=digest(scope)
        with self.transaction():
            old=self.db.execute('SELECT * FROM purge_receipts WHERE receipt_id=?',(receipt_id,)).fetchone()
            if old:
                if old['scope_digest']!=scope_digest:raise RuntimeErrorCode('sgs-purge-receipt-conflict')
                if preview['bindings']:raise RuntimeErrorCode('sgs-purge-reintroduced-data')
                return json.loads(old['body'])
            reports=[json.loads(row[0]) for row in self.db.execute('SELECT body FROM archive_reports WHERE project=?',(scope['workspace'],))]
            batch=scope.get('closureAuthority')=='authoritative-retired-run-batch-v1'
            if batch and (not scope.get('protectedRunIds') or set(scope['runIds'])&set(scope['protectedRunIds'])):raise RuntimeErrorCode('sgs-purge-scope-invalid')
            reports=[report for report in reports if report.get('change') in (scope.get('changeIds',[]) if batch else [scope['changeId']])]
            current=self.statistics(scope['workspace'],bindings=set(preview['bindings']))['sessions']
            if not reports and (not batch or current):raise RuntimeErrorCode('sgs-durable-report-required')
            snapshots={session['binding']:session for report in reports for native in report.get('native_telemetry',[]) for session in native['snapshot']['sessions']}
            for session in current:
                recorded=snapshots.get(session['binding'])
                if not session.get('ended_at'):raise RuntimeErrorCode('sgs-statistical-window-open')
                if not recorded or session['events'] and (recorded['metrics']!=session['metrics'] or recorded['models']!=session['models']):raise RuntimeErrorCode('sgs-report-snapshot-outdated')
            if not isinstance(components,list) or {row['component'] for row in preview['components']}!={row.get('component') for row in components}:raise RuntimeErrorCode('sgs-purge-components-divergent')
            for update in components:
                row=self.db.execute('SELECT * FROM component_checkpoints WHERE project=? AND component=?',(scope['workspace'],update['component'])).fetchone()
                if row['uid']!=uid or row['fingerprint']!=update.get('expectedFingerprint'):raise RuntimeErrorCode('sgs-component-checkpoint-changed')
                sequence=max(row['sequence']+1,int(time.time()*1000000),update.get('sequenceFloor',0))
                if update.get('data') is None:self.db.execute('DELETE FROM component_checkpoints WHERE project=? AND component=?',(scope['workspace'],update['component']))
                else:
                    self.component_checkpoint({'project':scope['workspace'],'component':update['component'],'sequence':sequence,
                        'at':datetime.now(timezone.utc).isoformat(),'data':update['data']},uid)
            for binding in preview['bindings']:
                producers=[row[0] for row in self.db.execute('SELECT producer FROM cursor_bindings WHERE binding=?',(binding,))]
                producers.append('diagnostic-'+digest(binding))
                for producer in producers:self.db.execute('DELETE FROM cursors WHERE producer=?',(producer,))
                self.db.execute('DELETE FROM cursor_bindings WHERE binding=?',(binding,))
                for table in ('telemetry','native_sources','binding_closures'):
                    self.db.execute('DELETE FROM '+table+' WHERE binding=?',(binding,))
                self.db.execute('DELETE FROM bindings WHERE binding=?',(binding,))
            result={'receipt_id':receipt_id,'status':'PURGED','scope_digest':scope_digest,'bindingsRemoved':len(preview['bindings']),
                    'componentsProjected':len(components),'reportProofs':sorted(report['sha256'] for report in reports)}
            self.db.execute('INSERT INTO purge_receipts VALUES(?,?,?)',(receipt_id,scope_digest,encoded(result)))
            return result

    def import_archive(self, project, relative, contribution):
        """Contribution extraite/validée par cab_sgs, jamais réécriture du rapport."""
        path = Path(relative)
        if path.is_absolute() or ".." in path.parts or path.parts[:3] != ("openspec", "changes", "archive") or path.name not in ("STATISTICS.md", "STATISTIQUES.md"):
            raise RuntimeErrorCode("sgs-archive-path-invalid")
        if self.archive_suppressed(project,relative):return {'status':'developer-deleted'}
        value = {"project": project, "path": str(path), **contribution}
        fingerprint = digest(value)
        with self.transaction():
            old = self.db.execute("SELECT fingerprint FROM archive_reports WHERE project=? AND path=?", (project, str(path))).fetchone()
            self.db.execute("INSERT INTO archive_reports VALUES(?,?,?,?) ON CONFLICT(project,path) DO UPDATE SET fingerprint=excluded.fingerprint,body=excluded.body", (project, str(path), fingerprint, encoded(value)))
        return {"path": str(path), "status": "unchanged" if old and old[0] == fingerprint else "imported"}

    def archive_suppressed(self,project,relative):
        return self.db.execute('SELECT 1 FROM archive_suppressions WHERE project=? AND path_digest=?',(project,digest(relative))).fetchone() is not None

    def forget_archives(self,project,paths):
        if not isinstance(project,str) or not Path(project).is_absolute() or not isinstance(paths,list) or not paths or len(paths)>128:raise RuntimeErrorCode('sgs-archive-deletion-invalid')
        for name in paths:
            if not isinstance(name,str):raise RuntimeErrorCode('sgs-archive-deletion-invalid')
            path=Path(name)
            if path.is_absolute() or '..' in path.parts or len(path.parts)!=5 or path.parts[:3]!=('openspec','changes','archive') or path.name not in ('STATISTICS.md','STATISTIQUES.md'):raise RuntimeErrorCode('sgs-archive-deletion-invalid')
            change=re.sub(r'^\d{4}-\d{2}-\d{2}-','',path.parts[3])
            if any(json.loads(row[0])['project']==project and json.loads(row[0])['change']==change for row in self.db.execute('SELECT body FROM bindings')):raise RuntimeErrorCode('sgs-archive-native-window-retained')
        with self.transaction():
            for name in paths:
                self.db.execute('INSERT OR IGNORE INTO archive_suppressions VALUES(?,?)',(project,digest(name)))
                self.db.execute('DELETE FROM archive_reports WHERE project=? AND path=?',(project,name))
        return {'status':'DEVELOPER_DELETED','count':len(paths),'reimportSuppressed':True}

    def compact(self):
        if self.db.in_transaction:raise RuntimeErrorCode('runtime-compaction-transaction-active')
        if self.db.execute('PRAGMA wal_checkpoint(TRUNCATE)').fetchone()[0]:raise RuntimeErrorCode('runtime-compaction-busy')
        self.db.execute('VACUUM')
        if self.db.execute('PRAGMA wal_checkpoint(TRUNCATE)').fetchone()[0]:raise RuntimeErrorCode('runtime-compaction-busy')
        return {'status':'COMPACTED'}

    def incident(self, body):
        expected = {"incident_id", "project", "change", "run", "reporter", "version", "category", "summary", "evidence"}
        if not isinstance(body, dict) or set(body)-{'reported_at','origin'} != expected:
            raise RuntimeErrorCode("ccab-incident-invalid")
        for key in expected - {"project", "summary", "evidence","run","change"}:
            identifier(body[key])
        for key in ('run','change'):
            if body[key] is not None:identifier(body[key])
        if 'origin' in body:
            origin=body['origin']
            if not isinstance(origin,dict) or set(origin)!={'transport','uid','instance'} or origin['transport']!='broker-owner-bridge' or type(origin['uid']) is not int or origin['uid']<0:raise RuntimeErrorCode('ccab-origin-invalid')
            identifier(origin['instance'])
        if not isinstance(body["project"], str) or not Path(body["project"]).is_absolute():
            raise RuntimeErrorCode("ccab-project-invalid")
        if not isinstance(body["summary"], str) or not 1 <= len(body["summary"]) <= 2000 or not isinstance(body["evidence"], list) or len(body["evidence"]) > 32:
            raise RuntimeErrorCode("ccab-evidence-invalid")
        for proof in body["evidence"]:
            if not isinstance(proof, dict) or set(proof) != {"reference", "sha256"} or not isinstance(proof["reference"], str) or not 1 <= len(proof["reference"]) <= 1000 or not re.fullmatch(r"[a-f0-9]{64}", proof["sha256"]):
                raise RuntimeErrorCode("ccab-evidence-invalid")
        now = datetime.now(timezone.utc).isoformat()
        entered=timestamp(body['reported_at']) if body.get('reported_at') else now
        if datetime.fromisoformat(entered)>datetime.now(timezone.utc):raise RuntimeErrorCode('ccab-reported-time-invalid')
        with self.transaction():
            old = self.db.execute("SELECT * FROM incidents WHERE incident_id=?", (body["incident_id"],)).fetchone()
            if old and old["body"] != encoded(body):
                raise RuntimeErrorCode("ccab-incident-conflict")
            self.db.execute("INSERT OR IGNORE INTO incidents(incident_id,created,updated,state,body) VALUES(?,?,?,'OPEN',?)", (body["incident_id"], entered, now, encoded(body)))
        return self.incidents(incident_id=body["incident_id"])[0]

    def incidents(self, incident_id=None):
        query = "SELECT * FROM incidents" + (" WHERE incident_id=?" if incident_id else "") + " ORDER BY created,sequence"
        rows = self.db.execute(query, (incident_id,) if incident_id else ())
        return [{**json.loads(row["body"]), "sequence": row["sequence"], "created": row["created"],
                 "updated": row["updated"], "state": row["state"], "claimant": row["claimant"],
                 "claim": row["claim"],
                 "lease_until": row["lease_until"], "resolution": json.loads(row["resolution"]) if row["resolution"] else None} for row in rows]

    def claim(self, action_id, claimant, incident_ids=None, reason=None, lease_seconds=900):
        identifier(action_id)
        identifier(claimant)
        if type(lease_seconds) is not int or not 1 <= lease_seconds <= 86400:
            raise RuntimeErrorCode("ccab-lease-invalid")
        if incident_ids is not None and (not isinstance(incident_ids, list) or not incident_ids or len(set(incident_ids)) != len(incident_ids) or len(incident_ids) > 100):
            raise RuntimeErrorCode("ccab-batch-invalid")
        if incident_ids and (not isinstance(reason, str) or not 1 <= len(reason) <= 2000):
            raise RuntimeErrorCode("ccab-batch-reason-required")
        body = {"action_id": action_id, "claimant": claimant, "incident_ids": incident_ids, "reason": reason, "lease_seconds": lease_seconds}
        with self.transaction():
            receipt = self.db.execute("SELECT * FROM receipts WHERE action_id=?", (action_id,)).fetchone()
            if receipt:
                if receipt["fingerprint"] != digest(body):
                    raise RuntimeErrorCode("ccab-action-conflict")
                return json.loads(receipt["body"])
            now = time.time()
            available = self.db.execute("SELECT * FROM incidents WHERE state='OPEN' OR (state='CLAIMED' AND lease_until<?) ORDER BY created,sequence", (now,)).fetchall()
            ids = incident_ids or ([available[0]["incident_id"]] if available else [])
            by_id = {row["incident_id"]: row for row in available}
            if not ids or any(identifier(key) not in by_id for key in ids):
                raise RuntimeErrorCode("ccab-claim-unavailable")
            until = now + lease_seconds
            for key in ids:
                self.db.execute("UPDATE incidents SET state='CLAIMED',claim=?,claimant=?,lease_until=?,updated=? WHERE incident_id=?", (action_id, claimant, until, datetime.now(timezone.utc).isoformat(), key))
            result = {"claim": action_id, "claimant": claimant, "incident_ids": ids, "reason": reason, "lease_until": until}
            self.db.execute("INSERT INTO receipts VALUES(?,?,?)", (action_id, digest(body), encoded(result)))
            return result

    def renew(self, action_id, claim, claimant, lease_seconds=900):
        for value in (action_id, claim, claimant):
            identifier(value)
        if type(lease_seconds) is not int or not 1 <= lease_seconds <= 86400:
            raise RuntimeErrorCode("ccab-lease-invalid")
        body={"claim":claim,"claimant":claimant,"lease_seconds":lease_seconds}
        with self.transaction():
            old=self.db.execute("SELECT * FROM receipts WHERE action_id=?",(action_id,)).fetchone()
            if old:
                if old["fingerprint"]!=digest(body):raise RuntimeErrorCode("ccab-action-conflict")
                return json.loads(old["body"])
            rows=self.db.execute("SELECT incident_id,lease_until FROM incidents WHERE state='CLAIMED' AND claim=? AND claimant=?",(claim,claimant)).fetchall()
            now=time.time()
            if not rows or any(row["lease_until"]<now for row in rows):raise RuntimeErrorCode("ccab-claim-stale")
            until=now+lease_seconds
            self.db.execute("UPDATE incidents SET lease_until=?,updated=? WHERE state='CLAIMED' AND claim=? AND claimant=?",(until,datetime.now(timezone.utc).isoformat(),claim,claimant))
            result={"claim":claim,"claimant":claimant,"lease_until":until,"incident_ids":[row["incident_id"] for row in rows]}
            self.db.execute("INSERT INTO receipts VALUES(?,?,?)",(action_id,digest(body),encoded(result)))
            return result

    def purge_treated(self, incident_id):
        identifier(incident_id)
        with self.transaction():
            row = self.db.execute("SELECT state FROM incidents WHERE incident_id=?", (incident_id,)).fetchone()
            if row is None:
                return {"status": "ALREADY_ABSENT", "incident_id": incident_id}
            if row["state"] != "RESOLVED":
                raise RuntimeErrorCode("ccab-purge-untreated")
            self.db.execute("DELETE FROM incidents WHERE incident_id=?", (incident_id,))
            for receipt in self.db.execute("SELECT * FROM receipts").fetchall():
                body = json.loads(receipt['body'])
                refs = set(body.get('incident_ids', [])) | ({body['incident_id']} if 'incident_id' in body else set())
                if incident_id not in refs:
                    continue
                if not any(self.db.execute('SELECT 1 FROM incidents WHERE incident_id=?', (key,)).fetchone() for key in refs):
                    self.db.execute('DELETE FROM receipts WHERE action_id=?', (receipt['action_id'],))
            return {"status": "PURGED_TREATED", "incident_id": incident_id}

    def purge_treated_batch(self, incident_ids):
        if not isinstance(incident_ids, list) or not incident_ids or len(incident_ids) > 100:
            raise RuntimeErrorCode("ccab-batch-invalid")
        for incident_id in incident_ids:
            identifier(incident_id)
        if len(set(incident_ids)) != len(incident_ids):
            raise RuntimeErrorCode("ccab-batch-invalid")
        with self.transaction():
            rows = [self.db.execute("SELECT state FROM incidents WHERE incident_id=?", (key,)).fetchone() for key in incident_ids]
            if any(row is not None and row['state'] != 'RESOLVED' for row in rows):
                raise RuntimeErrorCode("ccab-purge-untreated")
            removed = sum(row is not None for row in rows)
            self.db.executemany("DELETE FROM incidents WHERE incident_id=?", [(key,) for key in incident_ids])
            removed_ids = set(incident_ids)
            for receipt in self.db.execute("SELECT * FROM receipts").fetchall():
                body = json.loads(receipt['body'])
                refs = set(body.get('incident_ids', [])) | ({body['incident_id']} if 'incident_id' in body else set())
                if refs & removed_ids and not any(self.db.execute('SELECT 1 FROM incidents WHERE incident_id=?', (key,)).fetchone() for key in refs):
                    self.db.execute('DELETE FROM receipts WHERE action_id=?', (receipt['action_id'],))
            return {"status": "PURGED_TREATED", "removed": removed}

    def purge_all_treated(self):
        with self.transaction():
            if self.db.execute("SELECT 1 FROM incidents WHERE state != 'RESOLVED' LIMIT 1").fetchone():
                raise RuntimeErrorCode("ccab-purge-untreated")
            count = self.db.execute("SELECT count(*) FROM incidents").fetchone()[0]
            receipts = self.db.execute("SELECT count(*) FROM receipts").fetchone()[0]
            self.db.execute("DELETE FROM incidents")
            self.db.execute("DELETE FROM receipts")
            return {"status": "PURGED_TREATED", "removed": count, "receipts_removed": receipts}

    def purge_resolved(self,scope):
        removed=[];retained_receipts=0
        with self.transaction():
            for row in self.db.execute("SELECT * FROM incidents WHERE state='RESOLVED'").fetchall():
                body=json.loads(row['body'])
                if body['project']==scope['workspace'] and body.get('change') in scope.get('changeIds',[scope['changeId']]) and body.get('run') in scope['runIds']:
                    removed.append(row['incident_id']);self.db.execute('DELETE FROM incidents WHERE incident_id=?',(row['incident_id'],))
            for row in self.db.execute('SELECT * FROM receipts').fetchall():
                body=json.loads(row['body']);references=set(body.get('incident_ids',[]))|({body['incident_id']} if 'incident_id' in body else set())
                if references and references<=set(removed):self.db.execute('DELETE FROM receipts WHERE action_id=?',(row['action_id'],))
                elif references&set(removed):
                    remaining=references-set(removed)
                    states=[self.db.execute('SELECT state FROM incidents WHERE incident_id=?',(key,)).fetchone() for key in remaining]
                    if states and all(item and item[0]=='RESOLVED' for item in states):self.db.execute('DELETE FROM receipts WHERE action_id=?',(row['action_id'],))
                    else:retained_receipts+=1
        return {'status':'PURGED_RESOLVED','removed':len(removed),'sharedReceiptsNecessary':retained_receipts}

    def resolve(self, action_id, incident_id, claim, claimant, resolution):
        for value in (action_id, incident_id, claim, claimant):
            identifier(value)
        if not isinstance(resolution, dict) or set(resolution) != {"classification", "method", "reporters_verified", "release"} or resolution["classification"] not in ("code-fix", "documentation-fix", "false-positive", "no-fix"):
            raise RuntimeErrorCode("ccab-resolution-invalid")
        if not isinstance(resolution["method"], str) or not 1 <= len(resolution["method"]) <= 4000 or not isinstance(resolution["reporters_verified"], list) or not resolution["reporters_verified"]:
            raise RuntimeErrorCode("ccab-reporter-verification-required")
        for reporter in resolution["reporters_verified"]:
            identifier(reporter)
        if resolution["classification"] in ("code-fix", "documentation-fix"):
            release = resolution["release"]
            if not isinstance(release, dict) or set(release) != {"version", "commit", "publication", "cabu_receipt"} or any(not isinstance(v, str) or not v or len(v) > 300 for v in release.values()):
                raise RuntimeErrorCode("ccab-release-proof-required")
        elif resolution["release"] is not None:
            raise RuntimeErrorCode("ccab-no-fix-release-invalid" if resolution["classification"] == "no-fix" else "ccab-false-positive-release-invalid")
        body = {"incident_id": incident_id, "claim": claim, "claimant": claimant, "resolution": resolution}
        with self.transaction():
            old = self.db.execute("SELECT * FROM receipts WHERE action_id=?", (action_id,)).fetchone()
            if old:
                if old["fingerprint"] != digest(body):
                    raise RuntimeErrorCode("ccab-action-conflict")
                return json.loads(old["body"])
            row = self.db.execute("SELECT * FROM incidents WHERE incident_id=?", (incident_id,)).fetchone()
            if not row or row["state"] != "CLAIMED" or row["claim"] != claim or row["claimant"] != claimant or row["lease_until"] < time.time():
                raise RuntimeErrorCode("ccab-claim-stale")
            if json.loads(row["body"])["reporter"] not in resolution["reporters_verified"]:
                raise RuntimeErrorCode("ccab-reporter-verification-required")
            self.db.execute("UPDATE incidents SET state='RESOLVED',updated=?,resolution=? WHERE incident_id=?", (datetime.now(timezone.utc).isoformat(), encoded(resolution), incident_id))
            result = {"incident_id": incident_id, "state": "RESOLVED", "resolution": resolution}
            self.db.execute("INSERT INTO receipts VALUES(?,?,?)", (action_id, digest(body), encoded(result)))
            return result
