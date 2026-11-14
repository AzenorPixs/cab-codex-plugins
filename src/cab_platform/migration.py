"""Import historique chiffré, identités préservées, aucun réarmement."""
import hashlib
import json
import os
from pathlib import Path
import stat
import sqlite3
import zlib
from decimal import Decimal
from cryptography.fernet import Fernet
from django.db import transaction
from .core import commands
from .core.models import Actor,LegacySnapshot,Project,Resource,Run,Lease,Metric
from .paths import STATE,atomic_json,read_json

def cipher():
    path=STATE/'legacy-encryption.json';saved=read_json(path)
    if saved is None:saved={'key':Fernet.generate_key().decode()};atomic_json(path,saved)
    return Fernet(saved['key'].encode())

@transaction.atomic
def import_manifest(path):
    manifest=read_json(path);commands.require(manifest.get('schema_version')==1,'legacy-manifest-invalid')
    imported=[]
    for item in manifest['registries']:
        root=commands.project_path(item['project']);source=Path(item['path'])
        commands.require(source.resolve()==source and source.name=='controller-runs.json','legacy-source-invalid')
        fd=os.open(source,os.O_RDONLY|os.O_NOFOLLOW)
        with os.fdopen(fd,'rb') as stream:
            info=os.fstat(stream.fileno());commands.require(stat.S_ISREG(info.st_mode) and info.st_nlink==1 and info.st_size<=64*1024*1024,'legacy-source-unsafe');raw=stream.read()
        sha=hashlib.sha256(raw).hexdigest();payload=json.loads(raw)
        commands.require(item.get('sha256',sha)==sha,'legacy-snapshot-divergent')
        commands.require(payload.get('project')==str(root),'legacy-project-divergent')
        snapshot,created=LegacySnapshot.objects.get_or_create(source=str(source),sha256=sha,defaults={'payload':{'ciphertext':cipher().encrypt(raw).decode(),'format':'cab2-registry'}})
        if not created:imported.append({'sha256':sha,'repeated':True});continue
        project,_=Project.objects.get_or_create(pk=hashlib.sha256(str(root).encode()).hexdigest(),defaults={'root':str(root),'owner_uid':root.stat().st_uid})
        for legacy in payload.get('runs',[]):
            uid=item.get('source_uid',info.st_uid)
            actor_id='legacy-'+str(uid)+'-'+hashlib.sha256(str(legacy.get('ownerId','')).encode()).hexdigest()[:16]
            actor,_=Actor.objects.get_or_create(pk=actor_id,defaults={'uid':uid,'agent':'opencode','role':'coder','token_hash':hashlib.sha256(os.urandom(32)).hexdigest(),'active':False});actor.projects.add(project)
            run,added=Run.objects.get_or_create(project=project,run_id=legacy['runId'],defaults={'actor':actor,'session_id':legacy.get('sessionId',''),'mode':'piloted','change':legacy.get('changeId','legacy'),'generation':legacy.get('version',1),'state':legacy.get('state','UNKNOWN'),'suspension':'IMPORT_PROTECTED','mandate':{'legacy_snapshot_id':snapshot.pk,'legacy_context_id':legacy.get('contextId'),'import_sha256':sha,'decisions_resolved':False},'review':{'legacy_state':legacy.get('state')}})
            commands.require(added or run.mandate.get('import_sha256')==sha,'legacy-run-import-conflict')
            if added:commands.event(run,'legacy-imported',{'sha256':sha,'rearmed':False})
        accesses=payload.get('coordination',{}).get('accesses',{})
        for access in accesses.values() if isinstance(accesses,dict) else accesses:
            if access.get('state') in ('RELEASED','COMPLETED','CANCELLED','REFUSED'):continue
            run=Run.objects.filter(project=project,run_id=access.get('runId')).first()
            if run is None:continue
            for resource_key in access.get('resources',[]):
                resource,_=Resource.objects.get_or_create(pk=resource_key)
                Lease.objects.get_or_create(resource=resource,run=run,operation=None,state='HELD',defaults={'fencing':max(resource.fencing,1),'evidence':{'legacy_access':access.get('accessId'),'source_sha256':sha,'uncertain':True}})
        imported.append({'sha256':sha,'repeated':False,'rearmed':False})
    for item in manifest.get('sqlite_snapshots',[]):imported.append(import_runtime_sqlite(item))
    return {'imports':imported,'source_files_preserved':True}

def import_runtime_sqlite(item):
    source=Path(item['path']);commands.require(source.resolve()==source and source.is_file() and source.stat().st_nlink==1,'legacy-sqlite-source-invalid')
    raw=source.read_bytes();sha=hashlib.sha256(raw).hexdigest();commands.require(sha==item['sha256'],'legacy-sqlite-snapshot-divergent')
    snapshot,created=LegacySnapshot.objects.get_or_create(source=str(source),sha256=sha,defaults={'payload':{'format':'sqlite-zlib-fernet','ciphertext':cipher().encrypt(zlib.compress(raw)).decode()}})
    if not created:return {'sha256':sha,'repeated':True}
    runs={};groups={}
    with sqlite3.connect('file:'+str(source)+'?mode=ro',uri=True) as database:
        for binding,uid,text in database.execute('SELECT binding,uid,body FROM bindings'):
            body=json.loads(text);root=Path(body['project']);project_id=hashlib.sha256(str(root).encode()).hexdigest()
            project,_=Project.objects.get_or_create(pk=project_id,defaults={'root':str(root),'owner_uid':root.stat().st_uid if root.is_dir() else uid})
            actor_id='legacy-sgs-'+str(uid)+'-'+hashlib.sha256(str(body.get('agent','')).encode()).hexdigest()[:16]
            actor,_=Actor.objects.get_or_create(pk=actor_id,defaults={'uid':uid,'agent':body.get('agent','unknown'),'role':body.get('role','coder'),'active':False,'token_hash':hashlib.sha256(os.urandom(32)).hexdigest()});actor.projects.add(project)
            closed=database.execute('SELECT 1 FROM binding_closures WHERE binding=?',(binding,)).fetchone() is not None
            run,added=Run.objects.get_or_create(project=project,run_id=body['run'],defaults={'session_id':body['session'],'actor':actor,'mode':body.get('mode','direct'),'change':body['change'],'state':'CLOSED' if closed else 'UNKNOWN','suspension':'IMPORT_PROTECTED','mandate':{'legacy_snapshot_id':snapshot.pk,'import_sha256':sha,'decisions_resolved':False}})
            if added:commands.event(run,'legacy-statistics-imported',{'sha256':sha,'rearmed':False})
            runs[binding]=(run,body)
        for binding,event_id,source_name,stream,sequence,text in database.execute('SELECT binding,event_id,source,stream,sequence,body FROM telemetry ORDER BY binding,source,stream,sequence'):
            if binding not in runs:continue
            body=json.loads(text);key=(binding,source_name,stream);metrics=body.get('metrics',{});semantics=body['semantics']
            if key not in groups:groups[key]={'sequence':sequence,'semantics':semantics,'values':{},'mixed':False,'model':{k:v for k,v in (body.get('model') or {}).items() if k in ('name','provider','reasoning')}}
            group=groups[key]
            if semantics!=group['semantics']:group['mixed']=True
            group['sequence']=max(sequence,group['sequence'])
            if semantics=='cumulative':group['values']=metrics
            else:
                for name,value in metrics.items():group['values'][name]=str(Decimal(group['values'].get(name,'0'))+Decimal(value))
        rows=[]
        for (binding,source_name,stream),group in groups.items():
            run,identity=runs[binding]
            rows.append(Metric(run=run,source='legacy:'+source_name[:73],stream=hashlib.sha256((binding+'\0'+stream).encode()).hexdigest(),sequence=group['sequence'],values={} if group['mixed'] else group['values'],coverage={'legacy_semantics':group['semantics'],'mixed':group['mixed'],'source_snapshot':sha},model={'role':identity.get('role'),'agent':identity.get('agent'),'session_id':identity['session'],'native':group['model']}))
        Metric.objects.bulk_create(rows,batch_size=500)
        # Le registre CCAB peut être vide ; son état original complet reste chiffré.
    return {'sha256':sha,'repeated':False,'bindings':len(runs),'streams':len(groups),'rearmed':False}
