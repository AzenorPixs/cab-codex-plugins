"""Lectures du cycle et des tâches ; aucun compteur ne vaut validation du RUN."""
import hashlib
import json
import os
from pathlib import Path
import re
import stat
from datetime import date
from django.utils import timezone
from django.db import transaction
from .models import CodingSession,Change,ChangeTask,Run,SessionProjection,Event,Operation,Lease,Metric
from cab_platform.logging import redact

STAGES=['Initialisation','Prévol','Analyse','Cadrage','Spécification','Implémentation','Vérifications','Revue','Archivage','Statistiques','Clôture']

def identity(value):return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()

def ensure_records(run):
    updates={}
    if not run.change_record_id and run.change:
        change,_=Change.objects.get_or_create(pk=identity([run.project_id,run.change]),defaults={'project_id':run.project_id,'identifier':run.change})
        updates['change_record_id']=change.pk;run.change_record_id=change.pk
    if not run.coding_session_id and run.session_id:
        session,_=CodingSession.objects.get_or_create(pk=identity([run.project_id,run.actor.agent,run.actor.uid,run.session_id]),defaults={'project_id':run.project_id,'native_id':run.session_id,'agent':run.actor.agent,'uid':run.actor.uid})
        updates['coding_session_id']=session.pk;run.coding_session_id=session.pk
    if updates:Run.objects.filter(pk=run.pk).update(**updates)


def task_source(change):
    root=Path(change.project.root);slug=change.identifier
    if root.resolve()!=root or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}',slug):raise ValueError('change-path-invalid')
    parent=root/'openspec/changes';candidates=[]
    if change.source_path:
        preferred=root/change.source_path
        if preferred.name=='tasks.md' and preferred.is_relative_to(parent) and preferred.exists() and preferred.resolve()==preferred:
            return preferred,'archived' if '/archive/' in str(preferred) else 'open'
    active=parent/slug
    if active.exists():candidates.append((active,'open'))
    for path in (parent/'archive').glob('????-??-??-'+slug):
        try:date.fromisoformat(path.name[:10])
        except ValueError:continue
        candidates.append((path,'archived'))
    if len(candidates)!=1:return None,'ambiguous' if candidates else 'missing'
    path,state=candidates[0];path=path/'tasks.md'
    if path.resolve()!=path:raise ValueError('change-path-unsafe')
    return path,state


def observe_tasks(change):
    try:
        path,state=task_source(change)
        if path is None:return {'source_state':state}
        fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
        with os.fdopen(fd,'rb') as stream:
            before=os.fstat(stream.fileno())
            if not stat.S_ISREG(before.st_mode) or before.st_nlink!=1 or before.st_size>1024*1024:raise ValueError('change-tasks-unsafe')
            raw=stream.read(1024*1024+1);after=os.fstat(stream.fileno())
            if (before.st_size,before.st_mtime_ns)!=(after.st_size,after.st_mtime_ns):raise ValueError('change-tasks-changed')
        tasks=[];fence=None
        for number,line in enumerate(raw.decode('utf-8').splitlines(),1):
            marker=re.match(r'^\s*(```+|~~~+)',line)
            if marker:
                token=marker.group(1)[0];fence=None if fence==token else token if fence is None else fence
                continue
            if fence:continue
            match=re.match(r'^\s*[-*+]\s+\[([ xX])\]\s+(.+)$',line)
            if match:tasks.append({'label':redact(match.group(2),limit=2000),'completed':match.group(1).lower()=='x','line':number})
        return {'source_path':str(path.relative_to(change.project.root)),'source_state':state,'tasks':tasks,'tasks_done':sum(task['completed'] for task in tasks),'tasks_total':len(tasks),'tasks_sha256':hashlib.sha256(raw).hexdigest()}
    except (OSError,ValueError,UnicodeError):return {'source_state':'unavailable'}


def refresh_changes():
    for run in Run.objects.filter(change_record__isnull=True).select_related('actor','project').iterator():ensure_records(run)
    for change in Change.objects.select_related('project').iterator():
        values=observe_tasks(change);tasks=values.pop('tasks',None)
        changed=any(getattr(change,key)!=value for key,value in values.items())
        if tasks is not None and ChangeTask.objects.filter(change=change,active=True).count()!=len(tasks):changed=True
        if not changed:continue
        with transaction.atomic():
            Change.objects.select_for_update().get(pk=change.pk)
            now=timezone.now()
            if tasks is not None:
                ChangeTask.objects.filter(change=change,active=True).update(active=False,updated=now)
                occurrences={}
                for position,task in enumerate(tasks,1):
                    match=re.match(r'^(\d+(?:\.\d+)*)(?:[.)]\s+|\s+)',task['label'])
                    token='number:'+match.group(1) if match else 'text:'+identity(task['label'])
                    occurrences[token]=occurrences.get(token,0)+1;source_id=token+':'+str(occurrences[token])
                    ChangeTask.objects.update_or_create(change=change,source_id=source_id,defaults={'label':task['label'],'completed':task['completed'],'position':position,'source_line':task['line'],'active':True,'source_sha256':values['tasks_sha256'],'observed_at':now})
                values['observed_at']=now
            Change.objects.filter(pk=change.pk).update(**values)
            if tasks is not None:SessionProjection.objects.filter(binding__change_record=change).update(tasks_done=values['tasks_done'],tasks_total=values['tasks_total'],updated=now)


def details(run):
    change=run.change_record
    requested={row.data['id'] for row in Event.objects.filter(run=run,kind='exception-requested') if row.data.get('id')}
    decided={row.data['id'] for row in Event.objects.filter(run=run,kind='exception-decided') if row.data.get('id')}
    latest=Metric.objects.filter(run=run,source__in=['codex-native','opencode-native']).order_by('-updated').first()
    milestone=None
    labels={'run-created':'Cadrage enregistré','mandate-archive-reconciled':'Archive raccordée','review-decided':'Décision de revue enregistrée','run-closed':'Clôture enregistrée'}
    for item in Event.objects.filter(run=run).order_by('-pk')[:100]:
        if item.kind in labels or item.kind=='operation-terminal' and item.data.get('state')=='COMPLETED' and item.data.get('exit_code')==0:
            milestone={'label':labels.get(item.kind,'Exécution terminée sans erreur'),'at':item.created};break
    blockers=set()
    for operation in Operation.objects.filter(run=run,state='WAITING'):
        keys=[key for key in (operation.request.get('resources') or []) if isinstance(key,str)]+['file:'+run.project.root+'/'+path for path in (run.mandate.get('paths') or []) if isinstance(path,str)]
        for lease in Lease.objects.filter(state='HELD').exclude(run=run).select_related('run'):
            if any(key==lease.resource_id or key.startswith('file:') and lease.resource_id.startswith('file:') and (key.startswith(lease.resource_id+'/') or lease.resource_id.startswith(key+'/')) for key in keys):blockers.add(lease.run.run_id)
    return {'stage':run.stage,'phase':run.phase or None,'stages':STAGES,'pending_requests':len(requested-decided) if run.mandate.get('paths') else None,'native_activity':{'source':latest.source,'observed_at':latest.updated} if latest else None,'current_mandate':{'id':run.mandate.get('mandate_id',run.run_id),'paths':run.mandate['paths'],'criteria':run.mandate.get('criteria',[])} if run.mandate.get('paths') else None,'terminal_gate':run.review.get('closure') or run.review.get('decision'),'last_proven_milestone':milestone,'waiting_cause':run.suspension or ('Ressource occupée' if blockers else None),'blocking_runs':sorted(blockers),'change_record':{'id':change.pk,'identifier':change.identifier,'source_path':change.source_path,'source_state':change.source_state,'tasks':[{'id':task.pk,'label':task.label,'completed':task.completed,'line':task.source_line} for task in change.task_records.filter(active=True)],'tasks_done':change.tasks_done,'tasks_total':change.tasks_total,'tasks_sha256':change.tasks_sha256,'observed_at':change.observed_at} if change else None}
