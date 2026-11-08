"""Adaptateurs quantitatifs natifs ; aucune sauvegarde de prompt ou réponse."""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import stat

CODEX_TOKENS = {"input_tokens": "tokens_input", "output_tokens": "tokens_output",
                "cached_input_tokens": "tokens_cache_read", "reasoning_output_tokens": "tokens_reasoning",
                "cache_write_input_tokens": "tokens_cache_write",
                "total_tokens": "tokens_total"}
MAX_LINE = 8 * 1024 * 1024
VERSION = "2.4.24"


def codex_source(path, home=None):
    """Un fichier explicitement enregistré, jamais un parcours de conversations."""
    path = Path(path).absolute()
    home = Path(home) if home else Path.home()
    roots = (home / ".codex/sessions", home / ".codex/archived_sessions")
    if path.suffix != ".jsonl" or not path.name.startswith("rollout-") or not any(path.is_relative_to(root) for root in roots):
        raise ValueError("sgs-codex-source-outside-native-root")
    if path.resolve() != path:
        raise ValueError("sgs-codex-source-symlink")
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid():
        raise ValueError("sgs-codex-source-owner-invalid")
    return path


def native_counts(info):
    if not isinstance(info, dict):
        return {}
    return {metric: value for name, metric in CODEX_TOKENS.items()
            if type(value := info.get(name)) is int and value >= 0}


def collect_codex(store, binding, source, home=None):
    """Reprise au dernier octet acquitté ; compteur natif cumulatif -> deltas."""
    path = codex_source(source, home)
    producer = "codex-" + hashlib.sha256((binding["binding"] + str(path)).encode()).hexdigest()
    previous = store.cursor(producer) or {"offset": 0, "counts": {}, "verified": False}
    info = path.stat()
    identity = [info.st_dev, info.st_ino]
    if previous.get("file") not in (None, identity) or info.st_size < previous["offset"]:
        # Ne pas relire silencieusement une autre incarnation sous le même nom.
        raise ValueError("sgs-codex-source-replaced")
    state = {**previous, "file": identity}
    read_bytes = 0
    stored = 0
    with store.transaction(), path.open("rb") as stream:
        stream.seek(state["offset"])
        while read_bytes < 16 * 1024 * 1024:
            start = stream.tell()
            line = stream.readline(MAX_LINE + 1)
            if not line:
                break
            if len(line) > MAX_LINE:
                raise ValueError("sgs-codex-native-line-too-large")
            if not line.endswith(b"\n"):
                break
            read_bytes += len(line)
            record = json.loads(line)
            payload = record.get("payload") or {}
            if not isinstance(payload, dict):
                raise ValueError("sgs-codex-native-record-invalid")
            kind = record.get("type")
            at = record.get("timestamp")
            if kind == "session_meta":
                if payload.get("id") != binding["session"] or payload.get("cwd") != binding["project"]:
                    raise ValueError("sgs-codex-native-identity-mismatch")
                state["verified"] = True
                state["native_started_at"] = at
            metrics = None
            model = None
            coverage = None
            semantics='delta'
            event_stream='native-turns'
            file_count=None
            if state["verified"] and kind == "turn_context":
                name = payload.get("model")
                effort = payload.get("effort") or payload.get("reasoning_effort")
                provider = payload.get("model_provider")
                if isinstance(name, str):
                    model = {"name": name, "provider": provider if isinstance(provider, str) else None,
                             "reasoning": effort if isinstance(effort, str) else None}
                    if state.get('model',{}).get('name')==name and model['provider'] is None:model['provider']=state['model'].get('provider')
                    state['model']=model
                    metrics = {}
            if state['verified'] and kind=='event_msg' and payload.get('type')=='thread_settings_applied':
                settings=payload.get('thread_settings') or {}
                name=settings.get('model');provider=settings.get('model_provider_id');effort=settings.get('reasoning_effort')
                if isinstance(name,str):
                    model={'name':name,'provider':provider if isinstance(provider,str) else None,'reasoning':effort if isinstance(effort,str) else None}
                    state['model']=model;metrics={}
            if state["verified"] and kind == "event_msg" and payload.get("type") == "token_count":
                usage = payload.get("info") or {}
                current = native_counts(usage.get("total_token_usage"))
                old = state["counts"]
                reset = any(key in old and value < old[key] for key, value in current.items())
                metrics = {key: str(value - old.get(key, 0)) for key, value in current.items() if not reset and value >= old.get(key, 0)}
                missing_baseline = not old and state.get("native_started_at") and store_module_timestamp(state["native_started_at"]) < store_module_timestamp(binding["started_at"]) <= store_module_timestamp(at)
                if missing_baseline:
                    metrics = {key: str(value) for key, value in native_counts(usage.get("last_token_usage")).items()}
                state["counts"] = current if reset else {**old,**current}
                coverage = {key: ("partial" if reset or missing_baseline else "native") for key in current}
                if reset:
                    metrics = {}  # borne manquante : ne pas inventer un delta.
            if state["verified"] and kind == "event_msg":
                event_type = payload.get("type")
                if event_type in ("context_compacted", "context_compaction"):
                    metrics = {"compactions": "1"}
                if event_type in ("task_started", "turn_started") and at:
                    state["turn_started_at"] = at
                if event_type in ("task_complete", "turn_completed") and at and state.get("turn_started_at"):
                    duration = (store_module_timestamp(at) - store_module_timestamp(state["turn_started_at"])).total_seconds()
                    if duration >= 0:
                        metrics = {"duration_seconds": str(duration)}
                    state.pop("turn_started_at", None)
            if state["verified"] and kind == "response_item":
                item_type = payload.get("type")
                if item_type == "message":
                    metrics = {"messages_llm": "1"}
                if item_type in ("function_call", "custom_tool_call"):
                    metrics = {"tools_llm": "1"}
                    name = payload.get("name", "")
                    if name in ("exec_command", "shell", "shell_command", "functions.exec_command"):
                        metrics["commands_api"] = "1"
                    identity=str(payload.get('call_id') or payload.get('id') or start)
                    event_stream='api-call-'+hashlib.sha256(identity.encode()).hexdigest();semantics='cumulative'
            if state['verified'] and kind=='event_msg' and payload.get('type')=='item_completed':
                item=payload.get('item') or {};item_type=item.get('type');item_id=item.get('id')
                if isinstance(item_id,str):
                    event_stream='native-item-'+hashlib.sha256((str(item_type)+item_id).encode()).hexdigest();semantics='cumulative'
                    if item_type in ('UserMessage','AgentMessage'):
                        metrics={'messages':'1',('messages_user' if item_type=='UserMessage' else 'messages_assistant'):'1'}
                    elif item_type in ('CommandExecution','McpToolCall','Extension','FileChange','FunctionCallOutput'):
                        metrics={'tools':'1'}
                    elif item_type=='ContextCompaction':metrics={'compactions':'1'}
                    if item_type=='CommandExecution':
                        metrics['commands']='1'
                        code=item.get('exit_code')
                        if type(code) is int:
                            metrics.update(commands_success=str(int(code==0)),commands_failure=str(int(code!=0)))
                    if item_type=='FileChange' and item.get('status')=='completed':
                        changes=item.get('changes')
                        if isinstance(changes,dict):
                            metrics['writes']=str(len(changes))
                            coverage={'writes':'partial'}  # Les écritures via shell ne sont pas des FileChange.
                            if at and store_module_timestamp(at)>=store_module_timestamp(binding['started_at']):
                                files=set(state.get('files',[]))
                                for path_key in changes:
                                    path_key=os.path.normpath(os.path.join(binding['project'],path_key))
                                    files.add(hashlib.sha256(path_key.encode()).hexdigest())
                                state['files']=sorted(files);file_count=len(files)
                    if item_type=='Extension' and isinstance(item.get('kind'),str) and item['kind'].startswith('web.'):
                        metrics['web']='1'
                        action=item.get('action') or {}
                        if isinstance(action,dict) and action.get('type')=='search':metrics['web_search']='1'
                        if isinstance(action,dict) and action.get('type') in ('open','click'):metrics['web_open']='1'
                    begin=payload.get('started_at_ms');end=payload.get('completed_at_ms')
                    if type(begin) is int and type(end) is int and end>=begin:
                        metric={'CommandExecution':'command_wall_seconds','McpToolCall':'tool_wall_seconds','Extension':'tool_wall_seconds',
                                'FileChange':'tool_wall_seconds','FunctionCallOutput':'tool_wall_seconds','AgentMessage':'message_span_seconds','Reasoning':'reasoning_span_seconds'}.get(item_type)
                        if metric:
                            if metrics is None:metrics={}
                            metrics[metric]=str((end-begin)/1000)
            if metrics is not None and at and store_module_timestamp(at) >= store_module_timestamp(binding["started_at"]):
                event = {"binding": binding["binding"], "event_id": producer + ":" + str(start),
                         "source": "codex-native", "stream": event_stream, "sequence": start,
                         "at": at, "semantics": semantics, "metrics": metrics}
                if model is None and state.get('model') and not state.get('model_reported'):
                    model=state['model']
                if model:
                    event["model"] = model
                    state['model_reported']=True
                if coverage:
                    event["coverage"] = coverage
                store.event(event, os.getuid())
                stored += 1
                if file_count is not None:
                    store.event({**{k:v for k,v in event.items() if k not in ('model','coverage')},
                                 'event_id':event['event_id']+':files','stream':'files-distinct','semantics':'cumulative',
                                 'metrics':{'files_touched':str(file_count)},'coverage':{'files_touched':'partial'}},os.getuid())
            state["offset"] = stream.tell()
            # Événement durable avant curseur ; crash entre les deux = doublon neutre.
            store.cursor(producer, state,binding=binding['binding'])
    if not state["verified"] and state["offset"]:
        raise ValueError("sgs-codex-native-session-metadata-missing")
    return {"stored": stored, "offset": state["offset"], "source": "codex-native"}


def store_module_timestamp(value):
    result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if result.tzinfo is None:
        raise ValueError("sgs-native-timezone-missing")
    return result.astimezone(timezone.utc)


def import_archives(store, project):
    """Importer tous les rapports existants sans créer ni modifier leurs sources."""
    import cab_sgs
    root = Path(project).resolve(strict=True)
    archive = root / "openspec/changes/archive"
    if not archive.is_dir() or archive.resolve() != archive:
        return {"imported": 0, "unavailable": []}
    imported = 0
    unavailable = []
    for directory in sorted(archive.iterdir()):
        if not directory.is_dir() or directory.is_symlink():
            continue
        for name in ("STATISTICS.md", "STATISTIQUES.md"):
            path = directory / name
            if store.archive_suppressed(str(root),str(path.relative_to(root))):continue
            if not path.exists():
                continue
            if path.is_symlink() or path.stat().st_size > cab_sgs.MAX_BYTES:
                unavailable.append({"path": str(path.relative_to(root)), "reason": "sgs-archive-file-invalid"})
                continue
            raw = path.read_bytes()
            fingerprint = hashlib.sha256(raw).hexdigest()
            relative = str(path.relative_to(root))
            prior = store.db.execute("SELECT body FROM archive_reports WHERE project=? AND path=?", (str(root), relative)).fetchone()
            if prior and json.loads(prior[0]).get("sha256") == fingerprint:
                continue
            try:
                text=raw.decode("utf-8")
                contribution = cab_sgs.extract(text)
                marker=cab_sgs.MARKER.search(text)
                telemetry=[]
                if marker:
                    ledger=cab_sgs.load_json(marker[1])
                    telemetry=[{"record_id":record["id"],"snapshot":record["native_telemetry"]} for record in ledger["sessions"] if "native_telemetry" in record]
            except (cab_sgs.SGSError, UnicodeDecodeError):
                unavailable.append({"path": relative, "reason": "sgs-archive-extraction-unavailable"})
                continue
            import re
            change = re.sub(r"^\d{4}-\d{2}-\d{2}-", "", directory.name)
            store.import_archive(str(root), relative, {"change": change, "sha256": fingerprint, "contribution": contribution,"native_telemetry":telemetry})
            imported += 1
    return {"imported": imported, "unavailable": unavailable}


def import_blocked_report(store,project,change):
    import cab_sgs
    if not isinstance(change,str) or not __import__('re').fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,199}',change):raise ValueError('sgs-blocked-change-invalid')
    root=Path(project).resolve(strict=True);directory=root/'openspec/changes'/change
    if directory.resolve()!=directory or not (directory/'BLOCKERS.md').is_file():raise ValueError('sgs-blocked-report-proof-required')
    path=directory/'STATISTICS.md'
    if path.is_symlink() or not path.is_file() or path.stat().st_size>cab_sgs.MAX_BYTES:raise ValueError('sgs-blocked-report-required')
    raw=path.read_bytes();text=raw.decode('utf-8');contribution=cab_sgs.extract(text);marker=cab_sgs.MARKER.search(text)
    telemetry=[]
    if marker:
        telemetry=[{'record_id':row['id'],'snapshot':row['native_telemetry']} for row in cab_sgs.load_json(marker[1])['sessions'] if 'native_telemetry' in row]
    relative=str(path.relative_to(root));value={'project':str(root),'path':relative,'change':change,'state':'blocked',
        'sha256':hashlib.sha256(raw).hexdigest(),'contribution':contribution,'native_telemetry':telemetry}
    store.db.execute('INSERT INTO archive_reports VALUES(?,?,?,?) ON CONFLICT(project,path) DO UPDATE SET fingerprint=excluded.fingerprint,body=excluded.body',
        (str(root),relative,store_module_digest(value),json.dumps(value,ensure_ascii=False,sort_keys=True)))
    return {'path':relative,'status':'imported'}


def store_module_digest(value):
    return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
