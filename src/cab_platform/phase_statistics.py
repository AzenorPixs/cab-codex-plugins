"""Phase Statistiques autonome : instantané, rapports et commit local borné."""
from contextlib import contextmanager
import copy
import hashlib
import os
import threading
from pathlib import Path
from django.db import transaction,close_old_connections
from .core import commands as c
from .core.models import Run,StatisticsJob
from .preexisting_git import git_guard
from . import stage_substeps as clock

_launching=set()
_launch_lock=threading.Lock()

def enqueue(run,boundary):
    key=c.digest(['phase-statistics',run.pk,boundary['generation']])
    row,created=StatisticsJob.objects.get_or_create(pk=key,defaults={'project':run.project,'action':'phase-snapshot','request_id':'PHASE-STATS-'+key,'state':'PENDING','owner_pid':0,'owner_start':'','expected':{'run_pk':run.pk,'boundary':copy.deepcopy(boundary),'input_digest':c.digest(boundary)}})
    c.require(row.expected['input_digest']==c.digest(boundary),'statistics-snapshot-conflict')
    if created:transaction.on_commit(lambda:launch(row.pk))
    return row


def result_for(run):
    boundary=run.configuration.get('publication_boundary',{})
    key=boundary.get('statistics_job')
    job=StatisticsJob.objects.filter(pk=key,project_id=run.project_id,action='phase-snapshot').first() if key else None
    if job is None or job.expected.get('run_pk')!=run.pk:return {'state':'NOT_STARTED'}
    return {'state':job.state,'id':job.pk,'verified':job.result.get('verified') is True,'source_revision':job.expected['boundary']['source_revision'],'receipt_digest':c.digest(job.result),'result':job.result}


def written_reports(root,expected,hashes):
    """Sélectionner les écritures attestées de ce rendu, jamais les dirty globaux."""
    result={}
    for path,digest in hashes.items():
        witness=expected.get(str(Path(root)/path))
        if not isinstance(witness,dict) or witness.get('before')==witness.get('after'):
            continue
        c.require(witness.get('after')==digest,'report-commit-source-changed')
        result[path]=digest
    return result


def report_observer(run, reference):
    labels = {
        'preparation': 'Préparation des données et des rapports',
        'change': 'Calcul et validation des statistiques du change',
        'global': 'Calcul et validation des statistiques globales',
    }

    @contextmanager
    def observe(key):
        action = 'calculate-' + key
        identity = reference + ':' + action
        clock.update(run,action,identity,'RUNNING',labels[key],phase='statistics')
        try:
            yield
        except Exception as error:
            code=getattr(error,'code',type(error).__name__)
            state='UNKNOWN' if 'unknown' in code else 'FAILED'
            clock.update(run,action,identity,state,labels[key],{'error':code},phase='statistics')
            raise
        else:
            clock.update(run,action,identity,'COMPLETED',labels[key],{'verified':True},phase='statistics')

    return observe


def lock_observer(run, reference):
    def observed(start,end):
        identity=reference+':acquire-lock'
        label='Acquisition du verrou des statistiques'
        receipt={'time_role':'wait'}
        clock.update(run,'acquire-lock',identity,'RUNNING',label,receipt,phase='statistics',at=start)
        clock.update(run,'acquire-lock',identity,'COMPLETED',label,receipt,phase='statistics',at=end)
    return observed


def execute(key):
    from .core import statistics_service as service
    from .statistics_documents import read_source,sha
    from .project_git import probe
    from .reports_git import commit
    from .publication_boundary import KEY
    with transaction.atomic():
        job=StatisticsJob.objects.select_for_update().get(pk=key)
        if job.state!='PENDING':return
        job.state='RUNNING';job.owner_pid=threading.get_native_id();job.owner_start=service.process_identity(job.owner_pid);job.save(update_fields=['state','owner_pid','owner_start','updated'])
    run=Run.objects.select_related('project','actor','change_record').get(pk=job.expected['run_pk'])
    boundary=job.expected['boundary'];ref='statistics-'+key
    snapshot=service.SNAPSHOT.set({'change_id':run.change_record_id,'contribution':boundary['contribution'],'run_pk':run.pk,'generation':boundary['generation']})
    staged=service.STAGE_DOCUMENTS.set(False)
    try:
        current=Run.objects.get(pk=run.pk).configuration.get(KEY,{})
        if current.get('state')!='FROZEN' or current.get('generation')!=boundary['generation']:
            job.state='COMPLETED';job.result={'verified':False,'superseded':True};job.save(update_fields=['state','result','updated'])
            clock.phase(run,'statistics',ref,'SKIPPED',job.result);return
        source=boundary['source_path']
        kwargs={}
        if source is None:
            from .canonical_statistics import eligible
            if eligible(run):
                from .core.run_finalization import dossier
                kwargs={'canonical_run':run,'canonical_proofs':dossier(run,run.finalization_plan)['proofs']}
        rendering=service.sync(run.project,job.request_id+'-render',generate=run.change if source else None,
                               observe_report=report_observer(run,ref),lock_observed=lock_observer(run,ref),**kwargs)
        c.require(rendering['state']=='COMPLETED','statistics-render-not-completed')
        paths=['STATISTICS.md']
        if source:
            paths.append(source+'/STATISTICS.md')
            if (Path(run.project.root)/source/'BLOCKERS.md').is_file():paths.append(source+'/BLOCKERS.md')
        elif kwargs:
            from .canonical_statistics import directory
            paths.append(directory(run)+'/STATISTICS.md')
        with git_guard():
            current=Run.objects.get(pk=run.pk).configuration.get(KEY,{})
            c.require(current.get('state')=='FROZEN' and current.get('generation')==boundary['generation'],'statistics-snapshot-superseded')
            hashes={p:sha(read_source(Path(run.project.root),Path(run.project.root)/p,64*1024*1024)[0]) for p in paths}
            rendered=StatisticsJob.objects.get(pk=rendering['job_id'],project=run.project,state='COMPLETED')
            modified=written_reports(run.project.root,rendered.expected,hashes)
            receipt={'state':'NOT_REQUESTED','commit':None,'paths':[]}
            if boundary['commit_reports']:
                c.require(probe(run.project)==1,'statistics-git-unavailable')
                if modified:
                    clock.update(run,'commit',ref+':commit','RUNNING','Commit local des seuls rapports CAB modifiés par cette phase',phase='statistics')
                    try:
                        receipt=commit(run,sorted(modified),'STATS-'+key,expected_hashes=modified)
                    except Exception as error:
                        code=getattr(error,'code',type(error).__name__)
                        clock.update(run,'commit',ref+':commit',
                                     'UNKNOWN' if 'unknown' in code else 'FAILED',
                                     'Commit local des seuls rapports CAB modifiés par cette phase',
                                     {'error':code},phase='statistics')
                        raise
                    clock.update(run,'commit',ref+':commit','COMPLETED','Commit local des seuls rapports CAB modifiés par cette phase',receipt,phase='statistics')
                else:receipt={'state':'NO_CHANGE','commit':None,'paths':[],'local_only':True}
            job.result={'verified':True,'reports':hashes,'modified_reports':modified,'local_commit':receipt,'source_revision':boundary['source_revision'],'input_digest':job.expected['input_digest']}
            job.state='COMPLETED';job.save(update_fields=['state','result','updated'])
            clock.phase(run,'statistics',ref,'COMPLETED',job.result)
        c.event(run,'statistics-phase-validated',{'job_id':job.pk,'receipt_digest':c.digest(job.result),'source_revision':boundary['source_revision']})
    except Exception as error:
        # Les sorties brutes des processus et les profils ne sont pas publiés.
        code=getattr(error,'code',type(error).__name__)
        job.state='SKIPPED' if code=='statistics-snapshot-superseded' else 'UNKNOWN' if 'unknown' in code else 'FAILED'
        job.result={'verified':False,'error':code};job.save(update_fields=['state','result','updated'])
        clock.phase(run,'statistics',ref,job.state,job.result)
        c.event(run,'statistics-phase-failed',{'job_id':job.pk,'receipt':job.result})
    finally:service.SNAPSHOT.reset(snapshot);service.STAGE_DOCUMENTS.reset(staged)


def launch(key):
    with _launch_lock:
        if key in _launching:return
        _launching.add(key)
    def worker():
        close_old_connections()
        try:execute(key)
        finally:
            close_old_connections()
            with _launch_lock:_launching.discard(key)
    threading.Thread(target=worker,name='cab-statistics-phase',daemon=True).start()


def dispatch():
    from .core.statistics_service import alive
    for job in StatisticsJob.objects.filter(action='phase-snapshot',state='RUNNING'):
        if alive(job.owner_pid,job.owner_start):continue
        receipt={'verified':False,'error':'statistics-phase-worker-stopped-outcome-unknown'}
        if StatisticsJob.objects.filter(pk=job.pk,state='RUNNING',owner_pid=job.owner_pid,owner_start=job.owner_start).update(state='UNKNOWN',result=receipt):
            run=Run.objects.get(pk=job.expected['run_pk'])
            clock.phase(run,'statistics','statistics-'+job.pk,'UNKNOWN',receipt)
    for key in StatisticsJob.objects.filter(action='phase-snapshot',state='PENDING').values_list('pk',flat=True)[:10]:launch(key)
