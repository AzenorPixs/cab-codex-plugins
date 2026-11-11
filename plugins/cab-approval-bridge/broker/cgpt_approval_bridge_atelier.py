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

VERSION = "2.7.2"
LOCK = threading.RLock()
ACTIVE_PROCESSES={}
SECRET = re.compile(r"(?:\.env(?:\.|$)|\.(?:key|pem|p12|pfx|crt|cer|der)$|^(?:credentials|secrets)\.(?:json|yaml)$|^id_(?:rsa|ed25519)$|^(?:\.npmrc|\.pypirc|opencode\.password|\.netrc)$)")


class AtelierError(ValueError):
    pass


def ensure_project(workspace):
    project=Path(workspace)
    if not project.is_absolute() or project.resolve()!=project or not project.is_dir():raise AtelierError('atelier-project-invalid')
    root=project/'.cab-tests'
    if not root.exists():
        root.mkdir(mode=0o770)
        if root.stat().st_gid!=project.stat().st_gid:os.chown(root,-1,project.stat().st_gid)
        root.chmod(0o770|(project.stat().st_mode&0o2000))
    if root.resolve()!=root or not root.is_dir():raise AtelierError('atelier-root-invalid')
    return root


def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def devops_resources(workspace):
    """Inventaire déclaratif seulement : aucun shell, variable ou secret hôte."""
    document=Path(workspace)/'DEVOPS.md'
    result={'source':'DEVOPS.md','sha256':None,'state':'absent','resources':[],'mounts':[],'binPaths':[]}
    try:
        fd=os.open(document,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
    except FileNotFoundError:return result
    except OSError:
        result['state']='unavailable';return result
    try:
        before=os.fstat(fd)
        if not stat.S_ISREG(before.st_mode) or before.st_size>1024*1024:raise AtelierError('atelier-devops-document-invalid')
        data=os.read(fd,1024*1024+1);after=os.fstat(fd)
        if len(data)!=before.st_size or (before.st_size,before.st_mtime_ns)!=(after.st_size,after.st_mtime_ns):raise AtelierError('atelier-devops-document-changed')
    finally:os.close(fd)
    try:text=data.decode('utf-8')
    except UnicodeDecodeError:raise AtelierError('atelier-devops-document-invalid') from None
    result.update(state='observed',sha256=hashlib.sha256(data).hexdigest())
    seen=set();mounts=set();bins=[];section=''
    private={'.ssh','.gnupg','.codex','.config','.git','.cab-tests','secrets','credentials'}
    def protected(path):
        if any(part in private or SECRET.search(part) for part in path.parts):return True
        if '.opencode' in path.parts:
            at=path.parts.index('.opencode')
            return len(path.parts)<=at+1 or path.parts[at+1]!='bin'
        return False
    broad={Path('/'),Path('/home'),Path('/root'),Path('/tmp'),Path('/var'),Path('/etc'),Path('/run'),Path('/proc'),Path('/sys'),Path('/dev')}
    def add_mount(source,destination):
        if source in broad or destination in broad or protected(source) or protected(destination):return False
        if source.is_dir() and source.parent==Path('/home'):return False
        if source==Path(workspace) or Path(workspace).is_relative_to(source):return False
        if destination.is_relative_to(Path('/usr')) or destination in (Path('/bin'),Path('/lib'),Path('/lib64')):return True
        pair=(str(source),str(destination))
        if pair not in mounts:
            mounts.add(pair);result['mounts'].append({'source':pair[0],'destination':pair[1]})
        return True
    for line in text.splitlines():
        heading=re.match(r'^#{1,6}\s+(.+)$',line)
        if heading:
            section=heading[1].strip()
            external=next((kind for pattern,kind in ((r'\bDocker\b','docker'),(r'\bLXC\b','lxc'),(r'PostgreSQL Serveur','database'),(r'\bTPM\b','device')) if re.search(pattern,section,re.I)),None)
            if external and ('external',external) not in seen:
                seen.add(('external',external));result['resources'].append({'kind':external,'state':'cab-access-required','route':'existing-cab-reservation-and-validation'})
            continue
        match=re.fullmatch(r'\s*[*-]\s+(?:(Interpréteur|Installation|Chemin)\s*:\s*)?(`?)(/[^`\r\n]+)\2\s*',line)
        if not match:continue
        literal=match[3].strip().replace('\\_','_')
        if len(literal)>4096 or '\x00' in literal or literal in seen:continue
        seen.add(literal)
        if len(seen)>256:raise AtelierError('atelier-devops-resource-limit')
        path=Path(literal)
        # Les titres/paragraphes ne sont pas des commandes ; les chemins privés
        # et les espaces qui permettraient de remonter à l'hôte restent exclus.
        if path in broad or protected(path) or re.search(r'Prompts|Configuration locale',section,re.I):
            result['resources'].append({'kind':'protected','state':'not-mounted'});continue
        try:
            target=path.resolve(strict=True);info=target.stat()
            if stat.S_ISSOCK(info.st_mode) or stat.S_ISCHR(info.st_mode) or stat.S_ISBLK(info.st_mode):
                result['resources'].append({'path':literal,'kind':'external','state':'cab-access-required','route':'existing-cab-reservation-and-validation'});continue
            if not (stat.S_ISREG(info.st_mode) or stat.S_ISDIR(info.st_mode)) or not os.access(target,os.R_OK):raise OSError()
        except (OSError,RuntimeError):
            result['resources'].append({'path':literal,'kind':'local','state':'unavailable'});continue
        if protected(target):
            result['resources'].append({'kind':'protected','state':'not-mounted'});continue
        if target.is_file() and not os.access(target,os.X_OK) and target.suffix not in {'.so','.a','.dll','.dylib'}:
            result['resources'].append({'path':literal,'kind':'data','state':'cab-access-required','route':'existing-cab-reservation-and-validation'});continue
        if target.is_dir() and not ((target/'bin').is_dir() or any(part in {'lib','lib64','include','site-packages','node_modules'} for part in target.parts)):
            result['resources'].append({'path':literal,'kind':'data','state':'cab-access-required','route':'existing-cab-reservation-and-validation'});continue
        roots=[]
        # bin et lib restent ensemble : CPython/Go/npm utilisent leurs voisins.
        for item in (path,target):
            if 'node_modules' in item.parts:
                prefix=Path(*item.parts[:item.parts.index('node_modules')+1])
            elif 'bin' in item.parts:
                at=item.parts.index('bin');prefix=Path(*item.parts[:at])
                if prefix.name in {'.opencode','.local'}:prefix=item.parent
            else:prefix=item
            roots.append((prefix.resolve(),prefix))
        previous_mounts=list(result['mounts']);previous_seen=set(mounts)
        accepted=all(add_mount(source,destination) for source,destination in roots)
        if not accepted:result['mounts']=previous_mounts;mounts=previous_seen
        if accepted and stat.S_ISREG(info.st_mode) and os.access(target,os.X_OK) and str(path.parent) not in bins:bins.append(str(path.parent))
        result['resources'].append({'path':literal,'kind':'local','state':'read-only' if accepted else 'not-mounted'})
    result['binPaths']=sorted(bins,key=lambda value:not Path(value).is_relative_to(Path(workspace)))
    return result


def mask_runtime(command,root):
    """Inspecte les noms et types seulement, jamais le contenu des secrets."""
    root=Path(root)
    if root.is_file():return
    for directory,dirs,files in os.walk(root,followlinks=False):
        for name in list(dirs):
            if name in {'.ssh','.gnupg','.config','.git','.codex','state','share','credentials','secrets'}:
                dirs.remove(name);path=str(Path(directory)/name)
                command += ['--tmpfs',path,'--remount-ro',path]
        for name in files:
            path=Path(directory)/name
            try:info=path.lstat()
            except FileNotFoundError:continue
            if SECRET.search(name) or stat.S_ISSOCK(info.st_mode):command += ['--ro-bind','/dev/null',str(path)]


def sandbox_identity(command,home):
    """Identité minimale synthétique, sans exposer les comptes/configs hôte."""
    files={'passwd':f'cab:x:{os.getuid()}:{os.getgid()}:atelier:{home}:/bin/sh\n',
           'group':f'cab:x:{os.getgid()}:\n','nsswitch.conf':'passwd: files\ngroup: files\nhosts: files\n',
           'hosts':'127.0.0.1 localhost\n::1 localhost\n','chromium-empty':''}
    for name,content in files.items():
        destination=home/('.cab-'+name)
        fd,candidate=tempfile.mkstemp(prefix='.cab-identity-',dir=home)
        try:
            with os.fdopen(fd,'w') as stream:stream.write(content);stream.flush();os.fchmod(stream.fileno(),0o770)
            os.replace(candidate,destination)
        finally:
            if os.path.exists(candidate):os.unlink(candidate)
        target='/etc/'+name if name!='chromium-empty' else '/etc/chromium.d/00-cab'
        command += ['--ro-bind',str(destination),target]


def validate_args(args):
    expected={"request_id","run_id","reservation_version","session_id","change_id","directory","argv"}
    if not isinstance(args,dict) or set(args)-{"timeout_ms","expected_revision"}!=expected:
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
    if "expected_revision" in args and (not isinstance(args["expected_revision"],str) or not re.fullmatch(r"[a-f0-9]{64}",args["expected_revision"])):raise AtelierError("atelier-revision-invalid")
    timeout=args.get("timeout_ms",60000)
    if type(timeout) is not int or not 1<=timeout<=2147483647:raise AtelierError("atelier-timeout-invalid")


def sandbox_command(args,grant):
    validate_args(args)
    workspace=Path(args["directory"])
    expected=workspace/".cab-tests"/args["change_id"]/args["run_id"]
    if set(grant)-{"autonomy"}!={"status","directory","atelier","runtimeRoots"} or grant["status"]!="AUTHORIZED_ATELIER" or grant["directory"]!=str(workspace) or grant["atelier"]!=str(expected):
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
    if Path('/etc/alternatives').is_dir():command += ['--ro-bind','/etc/alternatives','/etc/alternatives']
    runtime_roots=grant["runtimeRoots"]
    if not isinstance(runtime_roots,list) or any(not isinstance(v,str) or not Path(v).is_absolute() or Path(v).resolve()!=Path(v) for v in runtime_roots):raise AtelierError("atelier-runtime-root-invalid")
    for source in runtime_roots:
        if not os.access(source,os.R_OK|os.X_OK):raise AtelierError("atelier-runtime-root-unavailable")
        command += ["--ro-bind",source,source]
    command += ["--ro-bind",str(workspace),str(workspace)]
    autonomy=grant.get('autonomy')
    if autonomy is not None:
        if (not isinstance(autonomy,dict) or set(autonomy)-{'executionKnown'}!={'protocol','mandateId','paths'}
                or autonomy['protocol']!='autonomous-change-v1' or not isinstance(autonomy['paths'],list)
                or not autonomy['paths']):raise AtelierError('atelier-autonomy-grant-invalid')
        for literal in autonomy['paths']:
            path=Path(literal)
            if (not path.is_absolute() or path.resolve()!=path or path==workspace
                    or not path.is_relative_to(workspace)
                    or any(part in {'.git','.opencode','.cab-tests','.codex'} or SECRET.search(part)
                           for part in path.relative_to(workspace).parts)):
                raise AtelierError('atelier-autonomy-path-invalid')
            candidates=[path]
            if path.is_dir():
                for directory,dirs,files in os.walk(path,followlinks=False):
                    candidates.extend(Path(directory)/name for name in [*dirs,*files])
            for candidate in candidates:
                info=candidate.lstat()
                if (stat.S_ISLNK(info.st_mode) or not (stat.S_ISDIR(info.st_mode) or stat.S_ISREG(info.st_mode))
                        or stat.S_ISREG(info.st_mode) and info.st_nlink!=1
                        or SECRET.search(candidate.name)):
                    raise AtelierError('atelier-autonomy-source-unsafe')
            command += ['--bind',literal,literal]
    resources=devops_resources(workspace)
    for mount in resources['mounts']:
        command += ['--ro-bind',mount['source'],mount['destination']]
    for mount in resources['mounts']:mask_runtime(command,mount['destination'])
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
        path.mkdir(mode=0o770,exist_ok=True)
        if path.resolve()!=path or not path.is_dir():raise AtelierError("atelier-scratch-unsafe")
        path.chmod(0o770)
    sandbox_identity(command,expected/'.home')
    # Les sockets Unix des navigateurs ont une limite de chemin courte. Cette
    # vue privée pointe uniquement vers le temporaire du RUN, jamais l'hôte.
    command += ['--bind',str(expected/'.tmp'),'/cab-tmp']
    fonts=Path('/etc/fonts')
    if fonts.is_dir() and fonts.stat().st_uid==0 and not fonts.stat().st_mode&0o022:
        command += ['--ro-bind',str(fonts),str(fonts)]
    search=":".join(dict.fromkeys([*resources['binPaths'],*(str(Path(root).parent if Path(root).is_file() else Path(root)/"bin") for root in runtime_roots)]))
    command += ["--setenv","PATH",(search+":" if search else "")+"/usr/bin:/bin",
                "--setenv","HOME",str(expected/".home"),"--setenv","TMPDIR","/cab-tmp",
                "--setenv","PYTHONDONTWRITEBYTECODE","1","--setenv","LANG","C.UTF-8","--setenv","USER","cab","--chdir",str(workspace if autonomy else expected),"--",*args["argv"]]
    return {'argv':command,'masked_shared_links':masked,'devops_resources':resources}


def private_jobs(directory,home=None):
    root=(Path(home) if home else Path.home())/".local/state/cab-ateliers"/hashlib.sha256(directory.encode()).hexdigest()
    if root.parent.resolve()!=root.parent:raise AtelierError("atelier-jobs-not-private")
    root.parent.mkdir(mode=0o770,parents=True,exist_ok=True)
    parent=root.parent.lstat()
    groups=set(os.getgroups()) | {os.getgid()}
    if (root.parent.resolve()!=root.parent or not stat.S_ISDIR(parent.st_mode)
            or parent.st_uid!=os.getuid() or parent.st_mode&0o007
            or parent.st_mode&0o070 and parent.st_gid not in groups):
        raise AtelierError("atelier-jobs-not-private")
    parent_fd=os.open(root.parent,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
    try:
        opened_parent=os.fstat(parent_fd)
        if (opened_parent.st_dev,opened_parent.st_ino)!=(parent.st_dev,parent.st_ino):
            raise AtelierError("atelier-jobs-not-private")
        created=False
        try:
            os.mkdir(root.name,0o770,dir_fd=parent_fd)
            created=True
        except FileExistsError:
            pass
        try:
            fd=os.open(root.name,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=parent_fd)
        except OSError as error:
            raise AtelierError("atelier-jobs-not-private") from error
        try:
            info=os.fstat(fd)
            if (not stat.S_ISDIR(info.st_mode) or info.st_uid!=os.getuid() or info.st_mode&0o007
                    or info.st_mode&0o070 and (info.st_gid!=parent.st_gid or info.st_gid not in groups)):
                raise AtelierError("atelier-jobs-not-private")
            if created:os.fchmod(fd,0o770)
        finally:
            os.close(fd)
    finally:
        os.close(parent_fd)
    if root.resolve()!=root:raise AtelierError("atelier-jobs-not-private")
    return root


def read_job(path):
    try:
        fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
    except FileNotFoundError:
        return None
    except OSError as error:
        raise AtelierError("atelier-job-not-private") from error
    try:
        info=os.fstat(fd)
        if (not stat.S_ISREG(info.st_mode) or info.st_nlink!=1 or info.st_uid!=os.getuid() or info.st_mode&0o007
                or info.st_mode&0o070 and (info.st_gid!=path.parent.stat().st_gid
                                           or info.st_gid not in set(os.getgroups()) | {os.getgid()})):
            raise AtelierError("atelier-job-not-private")
        with os.fdopen(fd,"r",encoding="utf-8") as stream:
            fd=-1
            return json.load(stream)
    finally:
        if fd!=-1:os.close(fd)


def save(path,value):
    fd,candidate=tempfile.mkstemp(prefix=".atelier-",dir=path.parent)
    try:
        with os.fdopen(fd,"w",encoding="utf-8") as stream:
            json.dump(value,stream,ensure_ascii=False);stream.flush();os.fchmod(stream.fileno(),0o770);os.fsync(stream.fileno())
        os.replace(candidate,path)
    finally:
        if os.path.exists(candidate):os.unlink(candidate)


def execute(args,authorize,*,job_home=None):
    validate_args(args)
    grant=authorize(args)
    root=private_jobs(args["directory"],job_home)
    path=root/(hashlib.sha256((args["run_id"]+"\0"+args["request_id"]).encode()).hexdigest()+".json")
    fingerprint=hashlib.sha256(canonical(args).encode()).hexdigest()
    with LOCK:
        previous=read_job(path)
        if previous is not None:
            if previous["input_sha256"]!=fingerprint:raise AtelierError("atelier-request-conflict")
            return previous
        if grant.get('autonomy',{}).get('executionKnown'):raise AtelierError('atelier-controller-receipt-reconciliation-required')
        plan=sandbox_command(args,grant);command=plan['argv']
        value={"requestId":args["request_id"],"runId":args["run_id"],"changeId":args["change_id"],"sessionId":args["session_id"],
               "input_sha256":fingerprint,"status":"INTENT","startedAt":datetime.now(timezone.utc).isoformat(),
               "requires_orchestrator_validation":not bool(grant.get('autonomy')),
               "requires_final_review":bool(grant.get('autonomy')),
               'masked_shared_links':plan['masked_shared_links'],'devops_resources':plan['devops_resources'],
               'autonomousMandate':grant.get('autonomy',{}).get('mandateId'),
               'validationStage':'final-review' if grant.get('autonomy') else 'orchestrator'}
        save(path,value)
    output=Path(grant["atelier"])/(".cab-result-"+fingerprint+".log")
    if output.is_symlink():raise AtelierError("atelier-output-symlink")
    with output.open("x+b") as stream:
        os.fchmod(stream.fileno(),0o770)
        try:
            process=subprocess.Popen(command,stdin=subprocess.DEVNULL,stdout=stream,stderr=subprocess.STDOUT,env={"PATH":"/usr/bin:/bin"},start_new_session=True)
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
    value=read_job(path)
    if value is None:return {"found":False,"requestId":args["request_id"],"snapshot_only":True,'devops_resources':devops_resources(args['directory'])}
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
