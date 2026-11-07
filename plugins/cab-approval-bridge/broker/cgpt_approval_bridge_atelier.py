"""Exécutions libres de l'atelier : projet RO, espace propre RW, réseau isolé."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import tempfile
import threading
import time
from datetime import datetime, timezone

VERSION = "2.4.1"
LOCK = threading.RLock()
ACTIVE_PROCESSES={}
SECRET = re.compile(r"(?:\.env(?:\.|$)|\.(?:key|pem|p12|pfx|crt|cer|der)$|^(?:credentials|secrets)\.(?:json|yaml)$|^id_(?:rsa|ed25519)$)")


class AtelierError(ValueError):
    pass


def ensure_project(workspace):
    project=Path(workspace)
    if not project.is_absolute() or project.resolve()!=project or not project.is_dir():raise AtelierError('atelier-project-invalid')
    root=project/'.cab-tests'
    if not root.exists():
        root.mkdir(mode=0o775)
        if root.stat().st_gid!=project.stat().st_gid:os.chown(root,-1,project.stat().st_gid)
        root.chmod(0o775|(project.stat().st_mode&0o2000))
    if root.resolve()!=root or not root.is_dir():raise AtelierError('atelier-root-invalid')
    return root


def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def validate_args(args):
    expected={"request_id","run_id","reservation_version","session_id","change_id","directory","argv"}
    if not isinstance(args,dict) or set(args)-{"timeout_ms"}!=expected:
        raise AtelierError("atelier-input-invalid")
    for key in ("request_id","run_id","session_id","change_id"):
        if not isinstance(args[key],str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,199}",args[key]):
            raise AtelierError("atelier-identity-invalid")
    if type(args["reservation_version"]) is not int or args["reservation_version"]<1:
        raise AtelierError("atelier-version-invalid")
    if not isinstance(args["directory"],str) or not Path(args["directory"]).is_absolute() or str(Path(args["directory"]).resolve())!=args["directory"]:
        raise AtelierError("atelier-project-invalid")
    if not isinstance(args["argv"],list) or not args["argv"] or any(not isinstance(v,str) or "\0" in v for v in args["argv"]):
        raise AtelierError("atelier-argv-invalid")
    timeout=args.get("timeout_ms",60000)
    if type(timeout) is not int or not 1<=timeout<=2147483647:raise AtelierError("atelier-timeout-invalid")


def sandbox_command(args,grant):
    validate_args(args)
    workspace=Path(args["directory"])
    expected=workspace/".cab-tests"/args["change_id"]/args["run_id"]
    if set(grant)!={"status","directory","atelier","runtimeRoots"} or grant["status"]!="AUTHORIZED_ATELIER" or grant["directory"]!=str(workspace) or grant["atelier"]!=str(expected):
        raise AtelierError("atelier-grant-divergent")
    if expected.resolve()!=expected or not expected.is_dir():raise AtelierError("atelier-path-unsafe")
    binary=Path("/usr/bin/bwrap")
    if not binary.is_file() or binary.stat().st_uid!=0 or binary.stat().st_mode&0o022:
        raise AtelierError("atelier-isolation-unavailable")
    command=[str(binary),"--unshare-all","--die-with-parent","--new-session","--clearenv"]
    for source in ("/usr","/bin","/lib","/lib64"):
        if Path(source).exists():command += ["--ro-bind",source,source]
    command += ["--proc","/proc","--dev","/dev","--dir","/etc"]
    if Path('/etc/ld.so.cache').is_file():command += ["--ro-bind","/etc/ld.so.cache","/etc/ld.so.cache"]
    runtime_roots=grant["runtimeRoots"]
    if not isinstance(runtime_roots,list) or any(not isinstance(v,str) or not Path(v).is_absolute() or Path(v).resolve()!=Path(v) for v in runtime_roots):raise AtelierError("atelier-runtime-root-invalid")
    for source in runtime_roots:
        if not os.access(source,os.R_OK|os.X_OK):raise AtelierError("atelier-runtime-root-unavailable")
        command += ["--ro-bind",source,source]
    command += ["--ro-bind",str(workspace),str(workspace)]
    # Masquage par noms uniquement ; aucun secret n'est lu ou copié.
    for directory,dirs,files in os.walk(workspace,followlinks=False):
        base=Path(directory)
        for name in list(dirs):
            if name in {".cab-tests",".git",".opencode",".codex",".cache","node_modules",".venv","venv","env","logs"}:
                dirs.remove(name)
                if name in {".git",".opencode",".codex"}:
                    path=str(base/name)
                    command += ["--tmpfs",path,"--remount-ro",path]
        for name in files:
            if SECRET.search(name):command += ["--ro-bind","/dev/null",str(base/name)]
            elif stat.S_ISSOCK((base/name).lstat().st_mode):command += ["--ro-bind","/dev/null",str(base/name)]
    test_root=workspace/".cab-tests"
    command += ["--tmpfs",str(test_root),"--dir",str(expected),"--remount-ro",str(test_root),"--bind",str(expected),str(expected)]
    # Un alias dur vers un fichier hors atelier ne doit pas rendre son inode RW.
    links={}
    for directory,_dirs,files in os.walk(expected,followlinks=False):
        for name in files:
            path=Path(directory)/name
            try:info=path.lstat()
            except FileNotFoundError:continue
            if stat.S_ISREG(info.st_mode) and info.st_nlink>1:
                links.setdefault((info.st_dev,info.st_ino),[]).append((path,info.st_nlink))
    masked=[]
    for aliases in links.values():
        if max(count for _,count in aliases)>len(aliases):
            for path,_count in aliases:
                command += ['--ro-bind','/dev/null',str(path)];masked.append(str(path.relative_to(expected)))
    for name in (".tmp",".home"):
        path=expected/name
        path.mkdir(mode=0o775,exist_ok=True)
        if path.resolve()!=path or not path.is_dir():raise AtelierError("atelier-scratch-unsafe")
        path.chmod(0o775)
    search=":".join(str(Path(root).parent if Path(root).is_file() else Path(root)/"bin") for root in runtime_roots)
    command += ["--setenv","PATH",(search+":" if search else "")+"/usr/bin:/bin",
                "--setenv","HOME",str(expected/".home"),"--setenv","TMPDIR",str(expected/".tmp"),
                "--setenv","LANG","C.UTF-8","--setenv","USER","cab","--chdir",str(expected),"--",*args["argv"]]
    return {'argv':command,'masked_shared_links':masked}


def private_jobs(directory,home=None):
    root=(Path(home) if home else Path.home())/".local/state/cab-ateliers"/hashlib.sha256(directory.encode()).hexdigest()
    root.mkdir(mode=0o700,parents=True,exist_ok=True)
    info=root.lstat()
    if root.resolve()!=root or not stat.S_ISDIR(info.st_mode) or info.st_uid!=os.getuid() or info.st_mode&0o077:raise AtelierError("atelier-jobs-not-private")
    return root


def save(path,value):
    fd,candidate=tempfile.mkstemp(prefix=".atelier-",dir=path.parent)
    try:
        with os.fdopen(fd,"w") as stream:
            json.dump(value,stream,ensure_ascii=False);stream.flush();os.fsync(stream.fileno())
        os.replace(candidate,path)
    finally:
        if os.path.exists(candidate):os.unlink(candidate)


def execute(args,authorize,*,job_home=None):
    validate_args(args)
    grant=authorize(args)
    plan=sandbox_command(args,grant);command=plan['argv']
    root=private_jobs(args["directory"],job_home)
    path=root/(hashlib.sha256((args["run_id"]+"\0"+args["request_id"]).encode()).hexdigest()+".json")
    fingerprint=hashlib.sha256(canonical(args).encode()).hexdigest()
    with LOCK:
        if path.exists():
            previous=json.loads(path.read_text())
            if previous["input_sha256"]!=fingerprint:raise AtelierError("atelier-request-conflict")
            return previous
        value={"requestId":args["request_id"],"runId":args["run_id"],"changeId":args["change_id"],"sessionId":args["session_id"],
               "input_sha256":fingerprint,"status":"INTENT","startedAt":datetime.now(timezone.utc).isoformat(),"requires_orchestrator_validation":True,
               'masked_shared_links':plan['masked_shared_links']}
        save(path,value)
    output=Path(grant["atelier"])/(".cab-result-"+fingerprint+".log")
    if output.is_symlink():raise AtelierError("atelier-output-symlink")
    with output.open("x+b") as stream:
        os.fchmod(stream.fileno(),0o775)
        try:
            process=subprocess.Popen(command,stdout=stream,stderr=subprocess.STDOUT,env={"PATH":"/usr/bin:/bin"},start_new_session=True)
            with LOCK:ACTIVE_PROCESSES[str(path)]={"process":process,"runId":args["run_id"],"workspace":args["directory"]}
            value.update(status="RUNNING",pid=process.pid);save(path,value)
            try:
                exit_code=process.wait(timeout=args.get("timeout_ms",60000)/1000)
                value.update(status="COMPLETED",exitCode=exit_code)
            except subprocess.TimeoutExpired:
                process.kill();process.wait();value.update(status="TIMED_OUT",exitCode=None)
        except OSError as error:
            value.update(status="FAILED_TO_START",exitCode=None,errorCode=error.errno)
        stream.flush();size=os.fstat(stream.fileno()).st_size;stream.seek(0);data=stream.read(1024*1024)
    value.update(finishedAt=datetime.now(timezone.utc).isoformat(),outputPath=str(output),outputBytes=size)
    value.update(output=data.decode("utf-8",errors="replace"),outputTruncated=size>len(data))
    with LOCK:
        save(path,value)
        ACTIVE_PROCESSES.pop(str(path),None)
    return value


def status(args,authorize):
    if set(args)!={"request_id","run_id","reservation_version","session_id","change_id","directory"}:raise AtelierError("atelier-status-input-invalid")
    validate_args({**args,"argv":["/usr/bin/true"]})
    authorize(args)
    root=private_jobs(args["directory"])
    path=root/(hashlib.sha256((args["run_id"]+"\0"+args["request_id"]).encode()).hexdigest()+".json")
    if not path.exists():return {"found":False,"requestId":args["request_id"],"snapshot_only":True}
    value=json.loads(path.read_text())
    if value.get("runId")!=args["run_id"] or value.get("changeId")!=args["change_id"]:raise AtelierError("atelier-status-owner-divergent")
    return {"found":True,"snapshot_only":True,**value}


def stop_scope(scope):
    with LOCK:
        selected=[value for value in ACTIVE_PROCESSES.values() if value['workspace']==scope['workspace'] and value['runId'] in scope['runIds']]
    for value in selected:
        process=value['process']
        if process.poll() is None:process.terminate()
    deadline=time.monotonic()+5
    while time.monotonic()<deadline:
        with LOCK:
            remaining=[value for value in ACTIVE_PROCESSES.values() if value['workspace']==scope['workspace'] and value['runId'] in scope['runIds']]
        if not remaining:return {'stopped':len(selected)}
        time.sleep(0.02)
    raise AtelierError('atelier-stop-unconfirmed')
