"""Archivage → mesures figées → publication en lecture seule → clôture."""
import copy
from pathlib import Path
from django.db import transaction
from django.utils import timezone
from .core import commands as c
from .core.models import Run,Event,MeasurementPeriod
from .change_stage_metrics import PROFILE,number_for

KEY='publication_boundary'


def frozen(run):return run.configuration.get(KEY,{}).get('state')=='FROZEN'


def editable(run):c.require(not frozen(run),'publication-project-read-only',409)


@transaction.atomic
def position(run,key,event):
    current=Run.objects.select_for_update().get(pk=run.pk)
    current.stage=number_for(current,key);current.phase=key.upper()
    current.save(update_fields=['stage','phase','updated']);c.event(current,event,{'stage':current.stage})
    run.stage=current.stage;run.phase=current.phase


def prepare(run,*,partial=False,commit_reports=False,before_freeze=None,publication=True):
    if run.configuration.get('cycle_profile')!=PROFILE:return None
    from .preexisting_git import git_guard
    with git_guard(),transaction.atomic():
        return _prepare_locked(run,partial,commit_reports,before_freeze,publication)


def _prepare_locked(run,partial,commit_reports,before_freeze,publication):
    current=Run.objects.select_for_update(of=('self',)).select_related('actor','project','change_record').get(pk=run.pk)
    previous=current.configuration.get(KEY,{})
    revision=c.revision(current)
    if previous.get('state')=='FROZEN':
        c.require(previous['source_revision']==revision,'publication-frozen-source-changed')
        c.require(previous['commit_reports']==commit_reports,'publication-commit-policy-conflict')
        from .stage_protocol import enabled
        if enabled(current) and publication is True and not previous.get('preparation'):
            previous={**previous,'preparation':before_freeze() if before_freeze else {}}
            current.configuration={**current.configuration,KEY:previous}
            current.save(update_fields=['configuration','updated'])
            from .stage_substeps import phase
            phase(current,'publication',previous['publication_ref'],'RUNNING')
        run.configuration=current.configuration
        return previous
    if not partial:
        from .core.run_lifecycle import require_closed_change
        require_closed_change(current)
    preparation=before_freeze() if before_freeze else {}
    from .core import measurements,statistics_service
    measurements.end_if_open(current.actor,current)
    cutoff=timezone.now().isoformat();generation=previous.get('generation',0)+1
    statistics_service.discover(current.project)
    contribution=statistics_service.evidence_for_change(current.change_record)
    source=current.change_record.local_sources.filter(present=True).order_by('archived','-path').first()
    marker={'state':'FROZEN','cutoff':cutoff,'generation':generation,'source_revision':revision,'contribution':copy.deepcopy(contribution),'source_path':source.path if source else None,'preparation':preparation,'commit_reports':commit_reports,'publication_ref':'publication-'+str(generation)}
    from .phase_statistics import enqueue
    job=enqueue(current,marker)
    marker={**marker,'statistics_job':job.pk}
    current.configuration={**current.configuration,KEY:marker};current.save(update_fields=['configuration','updated'])
    from .stage_substeps import phase
    phase(current,'statistics','statistics-'+job.pk,'RUNNING')
    if publication is not None:
        phase(current,'publication',marker['publication_ref'],'RUNNING' if publication else 'SKIPPED')
    c.event(current,'statistics-inputs-frozen',{'boundary':marker,'periods':list(MeasurementPeriod.objects.filter(run=current).values_list('pk',flat=True))})
    from .stage_protocol import enabled
    if not enabled(current):
        position(current,'closure','closure-started')
    run.configuration=current.configuration;run.stage=current.stage;run.phase=current.phase
    return marker


def reopen_for_remediation(run,*,version=False,target=None):
    if not frozen(run):return
    from .core import measurements
    previous=run.configuration[KEY]
    from .preexisting_git import git_guard
    with git_guard(),transaction.atomic():
        current=Run.objects.select_for_update().get(pk=run.pk)
        current.configuration={**current.configuration,KEY:{'state':'OPEN','generation':previous['generation']}}
        current.save(update_fields=['configuration','updated'])
        c.event(current,'publication-returned-to-work',{'previous_boundary':previous,'reason':'source-remediation'})
    from .stage_protocol import enabled
    if target is None and not enabled(current):
        position(current,'version-skill' if version else 'implementation','run-progress')
    if target!='statistics':
        measurements.transition(current.actor,{'project_id':current.project_id,'run_id':current.run_id,'request_id':'REMEDIATION-WORK-'+str(previous['generation']),'from_coding_start':False},'begin')
    run.configuration=current.configuration;run.stage=current.stage;run.phase=current.phase


@transaction.atomic
def adopt(actor,data):
    c.require(set(data)=={'project_id','run_id','request_id','authorization'},'cycle-profile-fields-invalid',400)
    run=c.run_scope(actor,data['run_id'],data['project_id'],lock=True);c.working(run)
    c.require(isinstance(data['authorization'],str) and len(data['authorization'])>=20,'cycle-profile-authorization-required')
    if run.configuration.get('cycle_profile')==PROFILE:return {'profile':PROFILE,'adopted':True}
    from .core.models import ChangeStageIteration,GitDelivery,RunCycleIteration
    c.require(run.cycle_steps==12 and run.stage==1 and not run.review and not GitDelivery.objects.filter(run=run).exists() and not ChangeStageIteration.objects.filter(run=run).exclude(stage__key='initialization').exists(),'cycle-profile-history-protected')
    run.configuration={**run.configuration,'cycle_profile':PROFILE};run.save(update_fields=['configuration','updated'])
    initial=ChangeStageIteration.objects.filter(run=run,ended_at__isnull=True,started_at__isnull=False).first()
    if initial:
        cycle=RunCycleIteration.objects.create(run=run,number=1,started_at=initial.started_at,visited=['initialization'])
        initial.cycle=cycle;initial.save(update_fields=['cycle'])
    c.event(run,'cycle-profile-adopted',{'request_id':c.identifier(data['request_id']),'profile':PROFILE,'authorization':data['authorization'],'authority':actor.pk})
    return {'profile':PROFILE,'adopted':True}
