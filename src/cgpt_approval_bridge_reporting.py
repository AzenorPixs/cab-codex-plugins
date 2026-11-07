"""Outbox propriétaire pour incidents CCAB et jauges SGS, sans clé étrangère."""
import hashlib
import json
import os
from pathlib import Path
import stat
import tempfile
import threading
import re
from datetime import datetime,timezone

VERSION='2.4.1'
LOCK=threading.RLock()
ROOT=None


def configure(root):
    global ROOT
    ROOT=Path(root).absolute()


def directory(workspace):
    if ROOT is None:raise ValueError('broker-reporting-not-configured')
    root=ROOT/hashlib.sha256(workspace.encode()).hexdigest()
    root.mkdir(mode=0o700,parents=True,exist_ok=True)
    info=root.lstat()
    if root.resolve()!=root or not stat.S_ISDIR(info.st_mode) or info.st_uid!=os.getuid() or info.st_mode&0o077:raise ValueError('broker-reporting-storage-unsafe')
    return root


def write(path,value):
    fd,candidate=tempfile.mkstemp(prefix='.reporting-',dir=path.parent)
    try:
        with os.fdopen(fd,'w') as stream:
            json.dump(value,stream,ensure_ascii=False);stream.flush();os.fsync(stream.fileno())
        os.replace(candidate,path)
        parent=os.open(path.parent,os.O_RDONLY)
        try:os.fsync(parent)
        finally:os.close(parent)
    finally:
        if os.path.exists(candidate):os.unlink(candidate)


def enqueue_incident(args,relay):
    required={'incident_id','session_id','directory','summary','category','evidence'}
    if not isinstance(args,dict) or set(args)-{'run_id','change_id'}!=required:raise ValueError('ccab-report-input-invalid')
    if not isinstance(args['directory'],str) or not Path(args['directory']).is_absolute():raise ValueError('ccab-project-invalid')
    if not isinstance(args['summary'],str) or not 1<=len(args['summary'])<=2000:raise ValueError('ccab-summary-invalid')
    for key in ('incident_id','session_id','category'):
        if not isinstance(args[key],str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.:/+@-]{0,255}',args[key]):raise ValueError('ccab-identity-invalid')
    root=directory(args['directory'])/'ccab-pending';root.mkdir(mode=0o700,exist_ok=True)
    key=hashlib.sha256(args['incident_id'].encode()).hexdigest();path=root/('incident-'+key+'.json')
    with LOCK:
        if path.exists():
            packet=json.loads(path.read_text())
            if packet['args']!=args:raise ValueError('ccab-incident-conflict')
        else:
            packet={'args':args,'reportedAt':datetime.now(timezone.utc).isoformat()};write(path,packet)
    try:
        result=relay('/ccab/owner/report',packet)
        with LOCK:path.unlink(missing_ok=True)
        return result
    except (OSError,ValueError):return {'accepted':True,'status':'QUEUED_LOCALLY','incident_id':args['incident_id']}


def publish(workspace,snapshot,relay):
    root=directory(workspace)
    packet={'project':workspace,'sequence':__import__('time').time_ns()//1000,'data':{key:value for key,value in snapshot.items() if key!='ccab_outbox'}}
    with LOCK:write(root/'statistics.json',packet)
    status='queued'
    try:
        relay('/statistics/owner/checkpoint',packet)
        with LOCK:(root/'statistics.json').unlink(missing_ok=True)
        status='stored'
    except (OSError,ValueError):pass  # La seule copie non acquittée reste dans l'outbox.
    for path in sorted((root/'ccab-pending').glob('incident-*.json')):
        with LOCK:
            if not path.exists():continue
            packet=json.loads(path.read_text())
        try:
            relay('/ccab/owner/report',packet)
            with LOCK:path.unlink(missing_ok=True)
        except (OSError,ValueError):break
    return {'statistics':status,'incidentsPending':pending(workspace)['count']}


def pending(workspace):
    root=directory(workspace);result=[]
    with LOCK:
        for path in sorted((root/'ccab-pending').glob('incident-*.json')):
            value=json.loads(path.read_text());result.append({'incident_id':value['args']['incident_id'],'reportedAt':value['reportedAt'],
                'summary':value['args']['summary'],'project':workspace,'status':'QUEUED_LOCALLY'})
    return {'count':len(result),'entries':result[:50],'truncated':len(result)>50}
