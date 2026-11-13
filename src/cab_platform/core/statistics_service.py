"""CAB possède les écritures ; fichiers locaux maîtres, PostgreSQL projection."""
from contextlib import contextmanager
from datetime import timedelta
import hashlib
import fcntl
import json
import os
from pathlib import Path
import pwd
import re
import secrets
import subprocess
import sys
import threading
from django.db import transaction
from django.utils import timezone
from cab_platform import statistics_documents as documents
from cab_platform import sgs_engine as engine
from . import commands,measurements
from .monitor import identity,observe_tasks
from .models import Project,Change,ChangeSource,StatisticsDocument,StatisticsRevision,StatisticsMetric,ProjectStatistics,StatisticsJob,StatisticsLock,Run,Operation,Maintenance

ACTIVE=set()

def process_identity(pid):
    try:return Path('/proc/sys/kernel/random/boot_id').read_text().strip()+':'+Path('/proc',str(pid),'stat').read_text().split(') ',1)[1].split()[19]
    except OSError:return ''

def alive(pid,start):return bool(start) and process_identity(pid)==start

def file_hash(project,path):
    try:return documents.sha(documents.read_source(Path(project.root),Path(path),64*1024*1024)[0])
    except FileNotFoundError:return None

def recover_lock(lock):
    job=lock.owner
    if not job:return
    if job.state in ('COMPLETED','FAILED'):lock.owner=None;lock.save();return
    if alive(job.owner_pid,job.owner_start) and (job.owner_pid!=os.getpid() or job.pk in ACTIVE):raise commands.Refused('statistics-project-busy')
    child=job.result.get('child',{})
    if alive(child.get('pid',0),child.get('start','')):raise commands.Refused('statistics-effect-unknown')
    for path,expected in job.expected.items():
        if file_hash(job.project,path) not in (expected['before'],expected['after']):raise commands.Refused('statistics-effect-unknown')
    job.state='FAILED';job.result={**job.result,'recovered':'writer-stopped-files-verified'};job.save();lock.owner=None;lock.save()

@contextmanager
def guarded(project,action,request_id):
    with transaction.atomic():
        Project.objects.select_for_update().get(pk=project.pk)
        lock,_=StatisticsLock.objects.get_or_create(project=project)
        lock=StatisticsLock.objects.select_for_update(of=('self',)).select_related('owner__project').get(pk=project.pk)
        previous=StatisticsJob.objects.filter(project=project,request_id=request_id).first()
        if previous:
            commands.require(previous.action==action,'statistics-request-conflict')
            yield None,previous;return
        recover_lock(lock)
        job=StatisticsJob.objects.create(pk=secrets.token_hex(16),project=project,action=action,request_id=request_id,owner_pid=os.getpid(),owner_start=process_identity(os.getpid()))
        lock.owner=job;lock.fencing+=1;lock.save()
    ACTIVE.add(job.pk)
    try:
        yield job,None
    except (OSError,ValueError,commands.Refused,subprocess.SubprocessError) as error:
        known=getattr(error,'code','') in {'statistics-local-conflict','statistics-target-invalid','statistics-target-unsafe'} or not job.expected
        job.state='FAILED' if known else 'UNKNOWN';job.result={**job.result,'error':getattr(error,'code',type(error).__name__)};job.save()
        if known:StatisticsLock.objects.filter(project=project,owner=job).update(owner=None)
        raise
    else:
        job.state='COMPLETED';job.save()
        StatisticsLock.objects.filter(project=project,owner=job).update(owner=None)
    finally:ACTIVE.discard(job.pk)

def write(job,path,content):
    project=job.project;root=Path(project.root);path=Path(path);expected=file_hash(project,path);desired=documents.sha(content.encode())
    if expected==desired:return desired
    job.expected={**job.expected,str(path):{'before':expected,'after':desired}};job.save(update_fields=['expected','updated'])
    try:info=path.stat();uid=info.st_uid;gid=info.st_gid;mode=info.st_mode&0o777
    except FileNotFoundError:uid=project.owner_uid;gid=project.owner_gid if project.owner_gid is not None else root.stat().st_gid;mode=0o770
    user=pwd.getpwuid(uid);env={'HOME':user.pw_dir,'USER':user.pw_name,'PATH':'/usr/bin:/bin','LANG':'C.UTF-8','PYTHONPATH':str(Path(__file__).resolve().parents[2]),'PYTHONDONTWRITEBYTECODE':'1'}
    options={'user':uid,'group':user.pw_gid,'extra_groups':os.getgrouplist(user.pw_name,user.pw_gid)} if os.getuid()==0 else {}
    if os.getuid()!=0:commands.require(os.getuid()==uid,'statistics-writer-uid-required')
    process=subprocess.Popen([sys.executable,'-B','-m','cab_platform.statistics_io'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=env,**options)
    try:
        job.result={**job.result,'child':{'pid':process.pid,'start':process_identity(process.pid)}};job.save(update_fields=['result','updated'])
        packet={'root':str(root),'path':str(path),'expected':expected,'content':content,'uid':uid,'gid':gid,'mode':mode}
        output,error=process.communicate(json.dumps(packet),timeout=30)
        result=json.loads(output)
        if result.get('error') in {'statistics-local-conflict','statistics-target-invalid','statistics-target-unsafe'}:raise commands.Refused(result['error'])
        commands.require(process.returncode==0 and result.get('ok') and result['result']['sha256']==desired,'statistics-publication-unconfirmed')
        commands.require(file_hash(project,path)==desired,'statistics-publication-divergent')
        return desired
    finally:
        if process.poll() is None:process.kill();process.communicate()

def import_document(source):
    with transaction.atomic():
        document,_=StatisticsDocument.objects.get_or_create(source=source)
        document=StatisticsDocument.objects.select_for_update().get(pk=document.pk)
        root=Path(source.change.project.root);path=root/source.path/'STATISTICS.md'
        try:
            raw,info=documents.read_source(root,path);digest=documents.sha(raw);text=raw.decode()
        except FileNotFoundError:
            status='not-started' if not source.archived and not Run.objects.filter(change_record=source.change).exists() else 'missing'
            if document.status!=status:document.status=status;document.save()
            return document
        except (OSError,ValueError,UnicodeError):
            document.status='unavailable';document.save();return document
        if document.sha256==digest and document.status=='ready':return document
        structure=documents.parse(text);block=documents.managed(text)
        if block and not document.generated_block_sha:
            inherited=StatisticsDocument.objects.filter(source__change=source.change,generated_block_sha=documents.sha(block.encode())).exclude(pk=document.pk).first()
            if inherited:
                document.generated_block_sha=inherited.generated_block_sha;document.generated_digest=inherited.generated_digest
        if block and document.generated_block_sha and documents.sha(block.encode())!=document.generated_block_sha:document.manual_override=True
        document.content=text;document.sha256=digest;document.source_mtime=info.st_mtime_ns;document.structure=structure;document.status='ready';document.save()
        StatisticsRevision.objects.get_or_create(document=document,sha256=digest,defaults={'content':text,'structure':structure})
        for key,metric in structure['contribution']['metrics'].items():
            StatisticsMetric.objects.update_or_create(document=document,key=key,defaults={**{name:metric[name] for name in ['state','value','reason','evidence']},'unit':engine.METRICS[key][2]})
        return document

@transaction.atomic
def discover(project):
    Project.objects.select_for_update().get(pk=project.pk)
    root=Path(project.root);sources=documents.catalogue(root);seen=[]
    for item in sources:
        change,_=Change.objects.get_or_create(pk=identity([project.pk,item['identifier']]),defaults={'project':project,'identifier':item['identifier']})
        source=ChangeSource.objects.filter(change=change,path=item['path']).first()
        if source is None:
            moved=next((old for old in change.local_sources.all() if old.manifest.get('_directory')==item['manifest']['_directory'] and not (root/old.path).exists()),None)
            if moved:source=moved;source.path=item['path'];source.save(update_fields=['path'])
            else:source=ChangeSource.objects.create(change=change,path=item['path'])
        if not source.present or source.archived!=item['archived'] or source.manifest!=item['manifest']:
            source.present=True;source.archived=item['archived'];source.manifest=item['manifest'];source.save()
        seen.append(source.pk);import_document(source)
    ChangeSource.objects.filter(change__project=project).exclude(pk__in=seen).update(present=False)
    for change in Change.objects.filter(project=project):
        choices=list(change.local_sources.filter(present=True).order_by('archived','-path'))
        if choices:
            primary=choices[0];change.source_path=primary.path+'/tasks.md';change.source_state='archived' if primary.archived else 'open';change.save(update_fields=['source_path','source_state'])
            values=observe_tasks(change);values.pop('tasks',None);values.pop('source_state',None)
            if not (root/primary.path/'tasks.md').exists():values.update(tasks_done=None,tasks_total=None,tasks_sha256='')
            for key,value in values.items():setattr(change,key,value)
            change.save(update_fields=list(values))
    state,_=ProjectStatistics.objects.get_or_create(project=project);state.inventory_complete=True;state.error='';state.save()
    return sources

def evidence_for_change(change):
    actor=Run.objects.filter(change_record=change).select_related('actor').order_by('-pk').first()
    if actor:
        data=measurements.change_statistics(actor.actor,{'project_id':change.project_id,'change':change.identifier});contribution=data['sgs_evidence']['contribution']
    else:contribution=engine.blank()
    if change.tasks_done is not None:contribution['metrics']['tasks']={'state':'known','value':str(change.tasks_done),'reason':None,'evidence':[{'line':1,'note':'Cases locales de tasks.md ; ne valent pas validation du RUN.'}]}
    # Seuls les compteurs effectivement émis par un runner reconnu sont retenus.
    accepted=[]
    for run in Run.objects.filter(change_record=change):
        accepted += [test.get('request_id') for test in run.review.get('submission',{}).get('tests',[]) if test.get('outcome')=='passed']
    test_count=0;observed=False
    for operation in Operation.objects.filter(run__change_record=change,request_id__in=set(accepted),state='COMPLETED'):
        if operation.receipt.get('exit_code')!=0:continue
        counts=re.findall(r'(?m)^Ran (\d+) tests? in ',operation.receipt.get('output',''))
        if counts:test_count+=sum(map(int,counts));observed=True
    if observed:
        for key,value in [('tests',test_count),('tests_success',test_count),('tests_failure',0)]:contribution['metrics'][key]={'state':'known','value':str(value),'reason':None,'evidence':[{'line':1,'note':'Reçus de runners unittest terminés, référencés par la revue ; aucune déclaration LLM.'}]}
    return contribution

def generate_change(job,change):
    source=change.local_sources.filter(present=True).order_by('archived','-path').first()
    commands.require(source is not None,'statistics-change-source-missing')
    document=import_document(source);contribution=evidence_for_change(change)
    if not source.archived and not Run.objects.filter(change_record=change).exists():return document
    observations=[]
    from .models import MeasurementPeriod
    from cab_platform.measurement_sources import snapshot,difference
    for period in MeasurementPeriod.objects.filter(change=change,ended__isnull=True).select_related('run__actor','run__project','session')[:50]:
        values,coverage=difference(period.start_snapshot,snapshot(period.run))
        observations.extend([[period.run.run_id,period.session.native_id,key,value,coverage['state']] for key,value in sorted(values.items())])
        if not values:observations.append([period.run.run_id,period.session.native_id,'N/A','N/A',coverage.get('reason','non observé')])
    state='archived' if source.archived else 'working';digest=commands.digest({'contribution':contribution,'state':state,'observations':observations})
    if document.generated_digest==digest and document.status=='ready':return document
    text,override=documents.render(change.identifier,state,contribution,document.content if document.status=='ready' else '',document.generated_block_sha,observations)
    if override:document.manual_override=True;document.save(update_fields=['manual_override']);return document
    text=documents.stamped(text,'change')
    write(job,Path(change.project.root)/source.path/'STATISTICS.md',text)
    block=documents.managed(text);document.generated_digest=digest;document.generated_block_sha=documents.sha(block.encode());document.manual_override=False;document.save(update_fields=['generated_digest','generated_block_sha','manual_override'])
    return import_document(source)

def generate_global(job):
    project=job.project;entries=[]
    for source in ChangeSource.objects.filter(change__project=project,present=True).select_related('change','statistics').order_by('change__identifier','path'):
        document=import_document(source)
        entries.append({'change':source.change.identifier,'path':source.path+'/STATISTICS.md','content':document.content,'sha256':document.sha256,'status':document.status})
    state=ProjectStatistics.objects.get(project=project)
    commands.require(state.inventory_complete,'statistics-inventory-incomplete')
    text=documents.global_document(project.identifier or project.name or Path(project.root).name,entries)
    # Ne pas changer l’horodatage d’un global dont les sources sont identiques.
    current_marker=documents.marker(state.content,'project')
    stamped=documents.stamped(text,'project');new_marker=documents.marker(stamped,'project')
    if current_marker and current_marker['valid'] and current_marker['content_sha256']==new_marker['content_sha256']:text=state.content
    else:text=stamped
    digest=write(job,Path(project.root)/'STATISTICS.md',text)
    state.content=text;state.sha256=digest;state.manifest=[{key:item[key] for key in ['change','path','sha256','status']} for item in entries];state.coverage_complete=all(item['status'] in ('ready','not-started') for item in entries);state.save()
    return state

def retire_file_lock(project):
    """Migration seulement : ouvre un ancien verrou, n’en crée jamais."""
    path=Path(project.root)/'.STATISTICS.lock'
    try:fd=os.open(path,os.O_RDWR|os.O_NOFOLLOW|os.O_NONBLOCK)
    except FileNotFoundError:return
    try:
        info=os.fstat(fd)
        commands.require(__import__('stat').S_ISREG(info.st_mode) and info.st_nlink==1,'statistics-legacy-lock-unsafe')
        try:fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:raise commands.Refused('statistics-legacy-writer-active') from None
        current=path.lstat()
        commands.require((current.st_dev,current.st_ino)==(info.st_dev,info.st_ino),'statistics-legacy-lock-changed')
        path.unlink()
    finally:os.close(fd)

def sync(project,request_id=None,generate=None,full=False,automatic=False):
    commands.require(not Maintenance.objects.filter(state__in=['PREPARED','INSTALLING']).exists(),'maintenance-in-progress')
    commands.require(Path(project.root).is_dir() and Path(project.root).resolve()==Path(project.root),'statistics-project-unavailable')
    open_before=set(Change.objects.filter(project=project,source_state='open').values_list('pk',flat=True))
    # Une protection d’écriture incertaine ne bloque pas la projection du maître local.
    discover(project)
    with guarded(project,'sync',request_id or 'SYNC-'+secrets.token_hex(12)) as (job,previous):
        if previous:return {'job_id':previous.pk,'state':previous.state,'result':previous.result}
        retire_file_lock(project)
        targets={generate} if isinstance(generate,str) else set(generate or [])
        if automatic:
            targets.update(Run.objects.filter(project=project,state__in=['WORKING','REVIEW_PENDING','ACCEPTED'],suspension='').values_list('change',flat=True))
            targets.update(Change.objects.filter(pk__in=open_before,source_state='archived').values_list('identifier',flat=True))
        for change in Change.objects.filter(project=project,identifier__in=targets,local_sources__present=True).distinct():generate_change(job,change)
        state=generate_global(job)
        if full or state.next_full_sync is None:
            state.last_full_sync=timezone.now();state.next_full_sync=state.last_full_sync+timedelta(seconds=43200+secrets.randbelow(43201));state.save(update_fields=['last_full_sync','next_full_sync'])
        job.result={**job.result,'changes':Change.objects.filter(project=project).count(),'reports':StatisticsDocument.objects.filter(source__change__project=project,status='ready',source__present=True).count(),'global_sha256':state.sha256,'coverage_complete':state.coverage_complete}
    return {'job_id':job.pk,'state':'COMPLETED','result':job.result}

def read_change(actor,data):
    project=Project.objects.get(pk=data['project_id']);commands.scope(actor,project);change=Change.objects.filter(project=project,identifier=data['change']).first()
    sources=[]
    if change:
        for source in change.local_sources.filter(present=True).order_by('archived','-path'):
            document=StatisticsDocument.objects.filter(source=source).first()
            if document is None:continue
            try:
                raw,_=documents.read_source(Path(project.root),Path(project.root)/source.path/'STATISTICS.md');actual=documents.sha(raw);actual_marker=documents.marker(raw.decode(),'change')
            except (OSError,ValueError,UnicodeError):actual=None;actual_marker=None
            sources.append({'path':source.path+'/STATISTICS.md','status':document.status,'sha256':document.sha256,'actual_sha256':actual,'actual_marker':actual_marker,'in_sync':actual==document.sha256 if actual is not None else document.status=='not-started','source_mtime_ns':document.source_mtime,'imported_at':document.imported_at,'revision_count':document.revisions.count(),'structure':document.structure,'manual_override':document.manual_override})
    return {'schema':'cab-local-statistics-1','project_id':project.pk,'change':data['change'],'source_of_truth':'local-STATISTICS.md','sources':sources}

def project_status(actor,data):
    project=Project.objects.get(pk=data['project_id']);commands.scope(actor,project);state=ProjectStatistics.objects.filter(project=project).first()
    try:
        raw,_=documents.read_source(Path(project.root),Path(project.root)/'STATISTICS.md',64*1024*1024);actual=documents.sha(raw);actual_marker=documents.marker(raw.decode(),'project')
    except (OSError,ValueError,UnicodeError):actual=None;actual_marker=None
    inputs_current=bool(state)
    if state:
        for entry in state.manifest:
            try:current=file_hash(project,Path(project.root)/entry['path'])
            except (OSError,ValueError,UnicodeError):current=None
            if (current or '')!=(entry['sha256'] or ''):inputs_current=False;break
    return {'project_id':project.pk,'source_of_truth':'changes/STATISTICS.md','inventory_complete':state.inventory_complete if state else False,'coverage_complete':state.coverage_complete if state else False,'global_sha256':state.sha256 if state else None,'actual_global_sha256':actual,'global_in_sync':bool(state and actual and actual==state.sha256),'global_sources_current':inputs_current,'actual_global_marker':actual_marker,'global_marker':documents.marker(state.content,'project') if state else None,'last_full_sync':state.last_full_sync if state else None,'next_full_sync':state.next_full_sync if state else None,'changes':Change.objects.filter(project=project).count(),'reports':StatisticsDocument.objects.filter(source__change__project=project,source__present=True,status='ready').count(),'not_started':StatisticsDocument.objects.filter(source__change__project=project,source__present=True,status='not-started').count(),'jobs':list(StatisticsJob.objects.filter(project=project).order_by('-created').values('id','state','action','result')[:10])}
