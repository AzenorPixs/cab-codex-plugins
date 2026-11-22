"""Sous-étapes observées : un passage par tentative, aucune date supposée."""
from django.db import transaction
from django.utils import timezone
from .core import commands as c
from .core.models import ChangeStage,ChangeStageIteration,Run
from .change_stage_metrics import PROFILE,observe,finish_iteration,refresh_total


@transaction.atomic
def update(run,key,reference,state,description='',receipt=None,source='cab',phase=None):
    if run.configuration.get('cycle_profile')!=PROFILE:return None
    run=Run.objects.select_for_update().get(pk=run.pk)
    reference=c.digest([run.pk,reference]);now=timezone.now()
    row=ChangeStageIteration.objects.filter(run=run,reference=reference).first()
    if row and row.ended_at is not None:return row
    if row is None:
        observe(run,now)
        parents=ChangeStageIteration.objects.filter(run=run,parent__isnull=True,ended_at__isnull=True)
        parents=parents.filter(stage__key=phase,asynchronous=True) if phase else parents.filter(asynchronous=False)
        parent=parents.select_related('stage').first()
        c.require(parent is not None,'stage-parent-not-observed')
        stage_key=parent.stage.key+'.'+key
        c.require(len(stage_key)<=64,'stage-substep-key-invalid',400)
        stage,_=ChangeStage.objects.get_or_create(change_id=run.change_record_id,key=stage_key,defaults={'parent':parent.stage})
        row=ChangeStageIteration.objects.create(stage=stage,run=run,parent=parent,cycle=parent.cycle,reference=reference,description=description,description_source=source,state=state)
    if state=='RUNNING' and row.started_at is None:
        row.started_at=now;row.iteration_number=ChangeStageIteration.objects.filter(run=run,stage=row.stage,started_at__isnull=False).count()+1
    row.state=state
    if receipt is not None:row.receipt=receipt
    row.save(update_fields=['started_at','iteration_number','state','receipt'])
    if state in ('COMPLETED','FAILED','CANCELLED','SKIPPED'):finish_iteration(row,now,state,state)
    else:refresh_total(row.stage_id)
    Run.objects.filter(pk=run.pk).update(updated=now)
    return row


def delivery_step(delivery,key,state,receipt):
    if not delivery.plan.get('publication_ref'):
        return None
    mapping={'commit':('commit','Commit local'),'version':('version','Version de livraison'),'version-projection':('version-projection','Projection de version'),'retire':('cleanup','Libération de l’index'),'verify:package':('verify-package','Vérification du paquet publié')}
    if key in mapping:kind,label=mapping[key]
    else:
        prefix,_,target=key.partition(':')
        names={'forge':('push','Envoi'),'build':('build','Construction'),'release':('publish','Publication'),'verify':('verify','Vérification')}
        if prefix not in names:return None
        group,label=names[prefix];kind=group+'.'+target;label+=' '+target
    attempt=delivery.plan.get('recovery_intent','initial')
    return update(delivery.run,kind,'delivery:'+str(delivery.pk)+':'+key+':'+str(attempt),state,label,receipt,phase='publication')


@transaction.atomic
def phase(run,key,reference,state,receipt=None):
    if run.configuration.get('cycle_profile')!=PROFILE:return None
    run=Run.objects.select_for_update().get(pk=run.pk);now=timezone.now()
    ref=c.digest([run.pk,'phase',reference])
    row=ChangeStageIteration.objects.filter(run=run,reference=ref).first()
    if row and row.ended_at is not None:return row
    if row is None:
        from .core.models import RunCycleIteration
        cycle=RunCycleIteration.objects.filter(run=run,ended_at__isnull=True).first()
        if cycle and key not in cycle.visited:cycle.visited=[*cycle.visited,key];cycle.save(update_fields=['visited'])
        stage,_=ChangeStage.objects.get_or_create(change_id=run.change_record_id,key=key)
        count=stage.iterations.filter(run=run,started_at__isnull=False).count()+1
        row=ChangeStageIteration.objects.create(stage=stage,run=run,cycle=cycle,reference=ref,asynchronous=True,state=state,started_at=now,iteration_number=count,description_source='cab')
    row.state=state
    if receipt is not None:row.receipt=receipt
    row.save(update_fields=['state','receipt'])
    if state in ('COMPLETED','FAILED','CANCELLED','SKIPPED'):finish_iteration(row,now,state,state)
    else:refresh_total(row.stage_id)
    Run.objects.filter(pk=run.pk).update(updated=now)
    return row


def command(actor,data):
    c.require(set(data)=={'project_id','run_id','request_id','key','state','description'},'stage-substep-fields-invalid',400)
    run=c.run_scope(actor,data['run_id'],data['project_id']);c.working(run)
    c.require(data['state'] in ('RUNNING','COMPLETED','FAILED','CANCELLED'),'stage-substep-state-invalid',400)
    c.require(isinstance(data['key'],str) and 1<=len(data['key'])<=40 and data['key'].replace('-','').replace('_','').isalnum(),'stage-substep-key-invalid',400)
    c.require(isinstance(data['description'],str) and 1<=len(data['description'])<=2000,'stage-substep-description-invalid',400)
    row=update(run,data['key'],c.identifier(data['request_id']),data['state'],data['description'],source='agent')
    c.require(row is not None,'stage-substep-cycle-unsupported')
    return {'id':row.pk,'state':row.state,'started_at':row.started_at,'ended_at':row.ended_at,'duration_seconds':row.duration_seconds,'iteration':row.iteration_number}
