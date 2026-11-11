#!/usr/bin/env python3
"""Services permanents SGS/CCAB, IPC Unix avec identité fournie par le noyau."""
from __future__ import annotations

import argparse
from http.server import BaseHTTPRequestHandler
import importlib.util
import json
import os
import re
from pathlib import Path
import signal
import socket
import socketserver
import stat
import struct
import subprocess
import sys
import threading
import time
from urllib.parse import parse_qs, urlsplit

SCRIPT_DIRECTORY=Path(__file__).resolve().parent
sys.path.insert(0,str(SCRIPT_DIRECTORY))
# Figer les imports au release chargé, même si CABU change le lien stable.
import cab_sgs

SPEC = importlib.util.spec_from_file_location("cab_runtime_store", SCRIPT_DIRECTORY / "cgpt-approval-bridge-runtime-store.py")
store_module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(store_module)
NATIVE_SPEC = importlib.util.spec_from_file_location("cab_native_telemetry", SCRIPT_DIRECTORY / "cgpt-approval-bridge-native-telemetry.py")
native_module = importlib.util.module_from_spec(NATIVE_SPEC)
NATIVE_SPEC.loader.exec_module(native_module)
EMITTER_SPEC=importlib.util.spec_from_file_location('cab_sgs_emitter',SCRIPT_DIRECTORY/'cgpt-approval-bridge-sgs-emitter.py')
emitter_module=importlib.util.module_from_spec(EMITTER_SPEC);EMITTER_SPEC.loader.exec_module(emitter_module)
VERSION = "2.5.8"
if store_module.VERSION != VERSION or native_module.VERSION != VERSION:
    raise RuntimeError("runtime-component-version-mismatch")
MAX_BODY = 64 * 1024 * 1024


def ensure_project_test_root(workspace):
    project=Path(workspace)
    if not project.is_absolute() or project.resolve()!=project or not project.is_dir():
        raise store_module.RuntimeErrorCode('atelier-project-invalid')
    root=project/'.cab-tests'
    metadata=project.stat()
    try:
        root.mkdir(mode=0o775)
    except FileExistsError:
        pass
    else:
        if root.stat().st_gid!=metadata.st_gid:os.chown(root,-1,metadata.st_gid)
        root.chmod(0o775|(metadata.st_mode&stat.S_ISGID))
    if root.resolve()!=root or not root.is_dir():raise store_module.RuntimeErrorCode('atelier-root-invalid')
    return root


class RuntimeServer(socketserver.UnixStreamServer):
    def __init__(self, directory, component, allowed_uids=(),external_collectors=True):
        self.component = component
        self.owner = os.getuid()
        self.allowed_uids = frozenset((self.owner, *allowed_uids))
        self.external_collectors=external_collectors;self.native_collector=None
        directory = store_module.private_directory(directory)
        self.store = store_module.RuntimeStore(directory)
        workspace=os.environ.get('OC_Codex_WORKSPACE') or os.environ.get('OC_CGPT_WORKSPACE')
        if workspace:ensure_project_test_root(workspace)
        self.emitter=None
        if component=='ccab' and external_collectors:
            identity=dict(self.store.db.execute('SELECT key,value FROM service_metadata'))
            self.emitter=emitter_module.Emitter(directory/'sgs-outbox',directory.parent/'sgs/sgs.sock','ccab',identity['instance'],identity['started_at'])
        self.socket_path = directory / (component + ".sock")
        # Aucun unlink aveugle d'un socket occupé ; systemd possède son cycle.
        if self.socket_path.exists():
            info = self.socket_path.lstat()
            if not stat.S_ISSOCK(info.st_mode) or info.st_uid != self.owner:
                self.store.close()
                raise store_module.RuntimeErrorCode("runtime-socket-invalid")
            probe = socket.socket(socket.AF_UNIX)
            try:
                probe.connect(str(self.socket_path))
            except ConnectionRefusedError:
                self.socket_path.unlink()
            else:
                self.store.close()
                raise store_module.RuntimeErrorCode("runtime-already-running")
            finally:
                probe.close()
        try:
            super().__init__(str(self.socket_path), RuntimeHandler)
            os.chmod(self.socket_path, 0o600)
        except BaseException:
            self.store.close()
            raise

    def register_source(self,body,uid):
        if set(body)!={'binding','source','location'} or body['source'] not in ('codex-native','opencode-native'):
            raise store_module.RuntimeErrorCode('sgs-source-invalid')
        binding=self.store.db.execute('SELECT uid,body FROM bindings WHERE binding=?',(body['binding'],)).fetchone()
        if not binding or binding['uid']!=uid:raise store_module.RuntimeErrorCode('sgs-binding-owner-mismatch')
        if body['source']=='codex-native':location=str(native_module.codex_source(body['location']))
        else:
            expected=json.loads(binding['body'])['session']
            if body['location']!=expected or not expected.startswith('ses_'):raise store_module.RuntimeErrorCode('sgs-opencode-source-invalid')
            location=expected
        old=self.store.db.execute('SELECT source,location FROM native_sources WHERE binding=?',(body['binding'],)).fetchone()
        if old and (old['source'],old['location'])!=(body['source'],location):raise store_module.RuntimeErrorCode('sgs-source-conflict')
        self.store.db.execute("INSERT OR IGNORE INTO native_sources VALUES(?,?,?,'registered')",(body['binding'],body['source'],location))
        return {'binding':body['binding'],'status':'registered'}

    def drain_outbox(self):
        directory=self.socket_path.parent.parent/'sgs-outbox'
        if not directory.exists():return
        info=directory.lstat()
        if not stat.S_ISDIR(info.st_mode) or info.st_uid!=self.owner or info.st_mode&0o077 or directory.resolve()!=directory:
            self.store.cursor('outbox-diagnostic',{'reason':'sgs-outbox-not-private'});return
        def priority(path):return (0 if path.name.startswith('binding-') else 1 if path.name.startswith('source-') else 2,path.name)
        pending=sorted(directory.iterdir(),key=priority)
        acknowledged=0;failures=0
        for path in pending[:100]:
            if not re.fullmatch(r'(?:binding-|source-|checkpoint-)?[a-f0-9]{64}\.json',path.name):continue
            try:
                descriptor=os.open(path,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
                with os.fdopen(descriptor,'rb') as handle:
                    info=os.fstat(handle.fileno())
                    if not stat.S_ISREG(info.st_mode) or info.st_uid!=self.owner or info.st_mode&0o077 or info.st_nlink!=1 or info.st_size>MAX_BODY:
                        raise store_module.RuntimeErrorCode('sgs-outbox-file-invalid')
                    raw=handle.read(MAX_BODY+1)
                if len(raw)>MAX_BODY:raise store_module.RuntimeErrorCode('sgs-outbox-file-invalid')
                body=json.loads(raw)
                if path.name.startswith('binding-'):
                    ensure_project_test_root(body['project']);self.store.bind(body,self.owner)
                elif path.name.startswith('source-'):self.register_source(body,self.owner)
                elif path.name.startswith('checkpoint-'):self.store.component_checkpoint(body,self.owner)
                else:
                    if body.get('source') in ('codex-native','opencode-native'):raise store_module.RuntimeErrorCode('sgs-native-collector-required')
                    self.store.event(body,self.owner)
                current=path.lstat()
                if (info.st_dev,info.st_ino,info.st_size,info.st_mtime_ns)==(current.st_dev,current.st_ino,current.st_size,current.st_mtime_ns):
                    path.unlink();acknowledged+=1
            except FileNotFoundError:continue
            except (OSError,ValueError,KeyError,TypeError):failures+=1
        self.store.cursor('outbox-diagnostic',{'acknowledged':acknowledged,'failed':failures})

    def collect(self):
        if self.component=='ccab' and self.emitter:
            projects={}
            for incident in self.store.incidents():
                gauges=projects.setdefault(incident['project'],{'ccab_open':0,'ccab_claimed':0,'ccab_resolved_retained':0,'ccab_total_retained':0})
                gauges['ccab_total_retained']+=1
                gauges[{'OPEN':'ccab_open','CLAIMED':'ccab_claimed','RESOLVED':'ccab_resolved_retained'}[incident['state']]]+=1
            for project,metrics in projects.items():self.emitter.emit(project,metrics)
            return
        if self.component != "sgs":
            return
        self.drain_outbox()
        needs_opencode=self.store.db.execute("SELECT 1 FROM native_sources s LEFT JOIN binding_closures c ON s.binding=c.binding WHERE source='opencode-native' AND c.binding IS NULL LIMIT 1").fetchone()
        if needs_opencode and self.external_collectors and (self.native_collector is None or self.native_collector.poll() is not None):
            try:self.native_collector=subprocess.Popen(['/usr/bin/env','node',str(SCRIPT_DIRECTORY/'cgpt-approval-bridge-native-collector.mjs'),str(self.socket_path)],stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            except OSError:self.native_collector=None
        for row in self.store.db.execute("SELECT s.*,b.body FROM native_sources s JOIN bindings b ON b.binding=s.binding LEFT JOIN binding_closures c ON c.binding=b.binding WHERE c.binding IS NULL AND source='codex-native'").fetchall():
            try:
                native_module.collect_codex(self.store, json.loads(row["body"]), row["location"])
                status = "collecting"
            except (ValueError, OSError, json.JSONDecodeError):
                status = "native-source-unavailable"
            self.store.db.execute("UPDATE native_sources SET status=? WHERE binding=?", (status, row["binding"]))
        now = time.monotonic()
        if now >= getattr(self, "next_archive_import", 0):
            self.next_archive_import = now + 60
            for row in self.store.db.execute("SELECT DISTINCT body FROM bindings").fetchall():
                binding = json.loads(row["body"])
                project = binding["project"]
                try:
                    result = native_module.import_archives(self.store, project)
                except OSError:
                    result = {"imported": 0, "unavailable": [{"reason": "sgs-archive-storage-unavailable"}]}
                self.store.cursor("archives-" + store_module.digest(project), result)

    def service_actions(self):
        now = time.monotonic()
        if now >= getattr(self, "next_collect", 0):
            self.next_collect = now + 5
            self.collect()

    def server_close(self):
        if self.emitter:self.emitter.close()
        if self.native_collector is not None and self.native_collector.poll() is None:
            self.native_collector.terminate()
            try:self.native_collector.wait(timeout=3)
            except subprocess.TimeoutExpired:self.native_collector.kill();self.native_collector.wait()
        super().server_close()
        self.store.close()
        self.socket_path.unlink(missing_ok=True)


class RuntimeHandler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def reply(self, status, value):
        data = store_module.encoded(value).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        self.dispatch("GET")

    def do_POST(self):
        self.dispatch("POST")

    def dispatch(self, method):
        try:
            self.connection.settimeout(5)
            pid, uid, _gid = struct.unpack("3i", self.connection.getsockopt(socket.SOL_SOCKET, socket.SO_PEERCRED, 12))
            if uid not in self.server.allowed_uids:
                self.reply(403, {"error": "runtime-peer-not-authorized"})
                return
            split = urlsplit(self.path)
            query = parse_qs(split.query, strict_parsing=True)
            if any(len(values) != 1 for values in query.values()):
                raise store_module.RuntimeErrorCode("runtime-query-invalid")
            body = None
            if method == "POST":
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= MAX_BODY or self.headers.get("Transfer-Encoding"):
                    raise store_module.RuntimeErrorCode("runtime-body-size-invalid")
                def unique(pairs):
                    result = {}
                    for key, value in pairs:
                        if key in result:
                            raise store_module.RuntimeErrorCode("runtime-json-duplicate-key")
                        result[key] = value
                    return result
                body = json.loads(self.rfile.read(length), object_pairs_hook=unique)
                if not isinstance(body, dict):
                    raise store_module.RuntimeErrorCode("runtime-body-invalid")
            route = (method, split.path)
            if route == ("GET", "/status"):
                result = {"component": self.server.component, "version": VERSION, "pid": os.getpid(), "status": "READY"}
            elif route==('POST','/storage/compact'):
                if body:raise store_module.RuntimeErrorCode('runtime-compaction-input-invalid')
                result=self.server.store.compact()
            elif self.server.component == "sgs":
                if route == ("POST", "/bindings"):
                    ensure_project_test_root(body['project'])
                    result = self.server.store.bind(body, uid)
                elif route == ("POST", "/events"):
                    if body.get('source')=='codex-native' or body.get('source')=='opencode-native' and (self.server.native_collector is None or self.server.native_collector.pid!=pid):
                        raise store_module.RuntimeErrorCode('sgs-native-collector-required')
                    result = self.server.store.event(body, uid)
                elif route==('POST','/component/checkpoint'):
                    result=self.server.store.component_checkpoint(body,uid)
                elif route==('GET','/component/checkpoint'):
                    if set(query)!={'project','component'}:raise store_module.RuntimeErrorCode('runtime-query-invalid')
                    row=self.server.store.db.execute('SELECT body,sequence,uid FROM component_checkpoints WHERE project=? AND component=?',(query['project'][0],query['component'][0])).fetchone()
                    if row and row['uid']!=uid:raise store_module.RuntimeErrorCode('sgs-component-owner-mismatch')
                    result={'data':json.loads(row['body']) if row else None,'sequence':row['sequence'] if row else 0}
                elif route==('POST','/purge/preview'):
                    if set(body)!={'scope','branch'}:raise store_module.RuntimeErrorCode('sgs-purge-input-invalid')
                    result=self.server.store.purge_preview(body['scope'],uid)
                    native_module.import_archives(self.server.store,body['scope']['workspace'])
                    if body['branch']=='BLOQUÉ':native_module.import_blocked_report(self.server.store,body['scope']['workspace'],body['scope']['changeId'])
                elif route==('POST','/purge'):
                    if set(body)!={'scope','receipt_id','components'}:raise store_module.RuntimeErrorCode('sgs-purge-input-invalid')
                    result=self.server.store.purge(body['scope'],body['receipt_id'],body['components'],uid)
                elif route==('POST','/purge/verify-released'):
                    if set(body)!={'scope','receipt_id'}:raise store_module.RuntimeErrorCode('sgs-purge-input-invalid')
                    result=self.server.store.verify_released_snapshot(body['scope'],body['receipt_id'],uid)
                elif route == ("POST", "/bindings/close"):
                    if set(body)!={'binding','ended_at'}:raise store_module.RuntimeErrorCode('sgs-close-input-invalid')
                    result=self.server.store.close_binding(body['binding'],body['ended_at'],uid)
                elif route == ("POST", "/sources"):
                    result=self.server.register_source(body,uid)
                elif route==('GET','/sources'):
                    rows=self.server.store.db.execute("SELECT s.source,s.location,b.body FROM native_sources s JOIN bindings b ON b.binding=s.binding LEFT JOIN binding_closures c ON c.binding=b.binding WHERE c.binding IS NULL AND b.uid=?",(uid,)).fetchall()
                    result={'sources':[{'source':row['source'],'location':row['location'],'binding':json.loads(row['body'])} for row in rows]}
                elif route==('GET','/session-binding'):
                    if set(query) not in ({'project','run','session'},{'project','run','session','mode'}):raise store_module.RuntimeErrorCode('sgs-binding-scope-invalid')
                    result=self.server.store.verify_codex_binding(query['project'][0],query['run'][0],query['session'][0],uid,query.get('mode',['piloted'])[0])
                elif route==('POST','/collector/status'):
                    if self.server.native_collector is None or self.server.native_collector.pid!=pid or set(body)-{'reason'}!={'binding','status'} or body['status'] not in ('collecting','native-source-unavailable'):raise store_module.RuntimeErrorCode('sgs-native-collector-required')
                    reason=body.get('reason')
                    if reason is not None and (not isinstance(reason,str) or not store_module.IDENTIFIER.fullmatch(reason)):raise store_module.RuntimeErrorCode('sgs-collector-reason-invalid')
                    self.server.store.db.execute("UPDATE native_sources SET status=? WHERE binding=? AND source='opencode-native'",(body['status'],body['binding']))
                    self.server.store.cursor('diagnostic-'+store_module.digest(body['binding']),{'reason':reason})
                    result={'status':'recorded'}
                elif route == ("GET", "/direct-sessions"):
                    if set(query) != {"project"}:
                        raise store_module.RuntimeErrorCode("runtime-query-invalid")
                    result = {"version": VERSION, **self.server.store.direct_sessions(query["project"][0])}
                elif route == ("GET", "/stats"):
                    if not set(query) <= {"project", "change"} or "project" not in query:
                        raise store_module.RuntimeErrorCode("runtime-query-invalid")
                    result = self.server.store.statistics(query["project"][0], query.get("change", [None])[0])
                elif route==('POST','/archives/forget'):
                    if set(body)!={'project','paths'}:raise store_module.RuntimeErrorCode('sgs-archive-deletion-invalid')
                    result=self.server.store.forget_archives(body['project'],body['paths'])
                elif route==('POST','/reports/forget-closed-change'):
                    if set(body)!={'project','change','run','binding'}:raise store_module.RuntimeErrorCode('sgs-open-run-input-invalid')
                    store_module.identifier(body['binding'])
                    result=self.server.store.forget_open_change(body['project'],body['change'],body['run'],uid,body['binding'])
                elif route==('GET','/events'):
                    if not {'project','binding'}<=set(query) or not set(query)<={'project','binding','after','limit'}:raise store_module.RuntimeErrorCode('sgs-event-query-invalid')
                    binding=self.server.store.db.execute('SELECT uid,body FROM bindings WHERE binding=?',(query['binding'][0],)).fetchone()
                    if not binding or binding['uid']!=uid or json.loads(binding['body'])['project']!=query['project'][0]:raise store_module.RuntimeErrorCode('sgs-event-scope-invalid')
                    after=int(query.get('after',['0'])[0]);limit=int(query.get('limit',['100'])[0])
                    if after<0 or not 1<=limit<=200:raise store_module.RuntimeErrorCode('sgs-event-query-invalid')
                    rows=self.server.store.db.execute('SELECT rowid,body,received FROM telemetry WHERE binding=? AND rowid>? ORDER BY rowid LIMIT ?',(query['binding'][0],after,limit)).fetchall()
                    result={'events':[{'cursor':row['rowid'],'received_at':row['received'],**json.loads(row['body'])} for row in rows],
                        'next':rows[-1]['rowid'] if len(rows)==limit else None}
                else:
                    self.reply(404, {"error": "runtime-route-not-found"})
                    return
            elif route == ("GET", "/incidents"):
                result = {"incidents": self.server.store.incidents()}
            elif route == ("POST", "/incidents"):
                ensure_project_test_root(body['project'])
                result = self.server.store.incident(body)
            elif route == ("POST", "/claim"):
                result = self.server.store.claim(**body)
            elif route == ("POST", "/renew"):
                result = self.server.store.renew(**body)
            elif route == ("POST", "/resolve"):
                result = self.server.store.resolve(**body)
            elif route==('POST','/purge-resolved'):
                if set(body)!={'scope','closed'} or body['closed'] is not True:raise store_module.RuntimeErrorCode('ccab-purge-closure-required')
                result=self.server.store.purge_resolved(body['scope'])
            elif route==('POST','/purge-treated'):
                if body != {'confirmed': True}:raise store_module.RuntimeErrorCode('ccab-purge-confirmation-required')
                result=self.server.store.purge_all_treated()
            elif route==('POST','/purge-incident'):
                if set(body) != {'incident_id'}:raise store_module.RuntimeErrorCode('ccab-purge-target-invalid')
                result=self.server.store.purge_treated(body['incident_id'])
            elif route==('POST','/purge-batch'):
                if set(body) != {'incident_ids'}:raise store_module.RuntimeErrorCode('ccab-purge-target-invalid')
                result=self.server.store.purge_treated_batch(body['incident_ids'])
            else:
                self.reply(404, {"error": "runtime-route-not-found"})
                return
            self.reply(200, result)
        except store_module.RuntimeErrorCode as exc:
            self.reply(409, {"error": str(exc)})
        except (ValueError, TypeError, UnicodeDecodeError):
            self.reply(400, {"error": "runtime-input-invalid"})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("component", choices=("sgs", "ccab"))
    parser.add_argument("--state-directory", type=Path)
    parser.add_argument("--version", action="version", version=VERSION)
    parser.add_argument('--no-external-collectors',action='store_true')
    args = parser.parse_args()
    os.umask(0o077)
    state_root=Path(os.environ.get('OC_Codex_RUNTIME_STATE_ROOT') or os.environ.get('OC_CGPT_RUNTIME_STATE_ROOT') or str(Path.home()/'.local/state'))
    directory = args.state_directory or state_root/'cab-approval-bridge'/args.component
    server = RuntimeServer(directory, args.component,external_collectors=not args.no_external_collectors)
    def stop(_signum, _frame):
        threading.Thread(target=server.shutdown, daemon=True).start()
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        server.serve_forever(poll_interval=0.5)
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except store_module.RuntimeErrorCode as error:
        print(json.dumps({"error": str(error)}), file=sys.stderr)
        raise SystemExit(78)
