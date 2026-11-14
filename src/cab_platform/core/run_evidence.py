"""Registre immutable ; seules les autorités déclarées attestent des faits."""
import re
import copy
from django.db import transaction
from cab_platform.finalization_contract import validate,replace_check_argv,ContractError,KINDS
from . import commands as c
from .models import Actor,Event,EvidenceProducer,FinalizationPlan,Operation,Run,RunEvidence,SystemUpdate

def validate_policy(run,policy):
    try:return validate(policy,run.mandate['criteria'],run.mode)
    except ContractError as error:raise c.Refused(str(error),400) from error

def initialize(run,policy=None):
    value=validate_policy(run,policy) if policy is not None else {}
    return FinalizationPlan.objects.create(run=run,policy=value,digest=c.digest(value) if value else '',missing=[] if value else ['finalization-contract-required'])

@transaction.atomic
def configure(actor,data):
    run=c.run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False)
    c.require(run.actor_id==actor.pk if run.mode=='direct' else run.mandate.get('orchestrator_id')==actor.pk,'finalization-authority-required',403)
    value=validate_policy(run,data['policy'])
    plan=FinalizationPlan.objects.filter(run=run).first()
    if plan and plan.policy:
        c.require(plan.policy==value,'finalization-contract-immutable');return {'policy':plan.policy,'digest':plan.digest}
    c.working(run)
    c.require(not run.operation_set.exists() and not run.review and not run.mandate.get('native_frozen_at') and not run.mandate.get('legacy_snapshot_id'),'finalization-adoption-not-safe')
    if plan is None:plan=initialize(run,value)
    else:plan.policy=value;plan.digest=c.digest(value);plan.missing=[];plan.save()
    c.event(run,'finalization-configured',{'policy_digest':plan.digest,'authorizer':actor.pk})
    return {'policy':plan.policy,'digest':plan.digest}

@transaction.atomic
def revise_check(actor,data):
    c.require(set(data)=={'project_id','run_id','request_id','expected_policy_digest','check_id','argv','reason'},'finalization-revision-fields-invalid',400)
    run=c.run_scope(actor,data['run_id'],data['project_id'],lock=True)
    key=c.identifier(data['request_id']);fingerprint=c.digest(data)
    previous=Event.objects.filter(run=run,kind='finalization-check-revised',data__request_id=key).first()
    if previous:
        c.require(previous.data['input_digest']==fingerprint,'finalization-revision-request-conflict')
        return previous.data['receipt']
    c.working(run)
    from .run_lifecycle import guard
    guard(run,allow_measurement=True)
    c.require(not run.mandate.get('native_frozen_at') and not run.mandate.get('legacy_snapshot_id'),'finalization-revision-protected')
    plan=FinalizationPlan.objects.select_for_update().filter(run=run).first()
    c.require(plan and plan.policy and not plan.receipt,'finalization-contract-required')
    c.require(plan.digest==data['expected_policy_digest'] and plan.digest==c.digest(plan.policy),'finalization-revision-stale')
    reason=data['reason'];c.require(isinstance(reason,str) and 10<=len(reason.strip())<=4000,'finalization-revision-reason-required',400)
    try:value=replace_check_argv(plan.policy,data['check_id'],data['argv'])
    except ContractError as error:raise c.Refused(str(error),400) from error
    value=validate_policy(run,value)
    check=next(item for item in plan.policy['checks'] if item['id']==data['check_id'])
    version=plan.check_revisions.get(check['id'],1)
    latest=run.finalization_evidence.filter(source='cab-operation',payload__rule_id=check['id']).order_by('-pk').first()
    current=c.revision(run)
    c.require(not (latest and latest.payload.get('check_revision',1)==version and latest.payload.get('result')=='passed' and latest.payload.get('source_revision')==current),'finalization-check-already-passed')
    old_policy=plan.policy;old_digest=plan.digest
    plan.policy=value;plan.digest=c.digest(value);plan.check_revisions={**plan.check_revisions,check['id']:version+1}
    plan.phase='WAITING';plan.missing=['evidence:'+check['id']+':check-revised'];plan.save()
    receipt={'request_id':key,'check_id':check['id'],'check_revision':version+1,'previous_policy_digest':old_digest,'policy_digest':plan.digest,'new_execution_required':True,'effects_issued':False}
    c.event(run,'finalization-check-revised',{'request_id':key,'input_digest':fingerprint,'actor':actor.pk,'reason':reason,'source_revision':current,'old_policy':old_policy,'new_policy':value,'receipt':receipt})
    return receipt

@transaction.atomic
def retarget_release(actor,data):
    """Corriger uniquement la cible de patch après un échec CABU avéré."""
    c.require(set(data)=={'project_id','run_id','request_id','expected_policy_digest','target_version','update_request_id','reason'},'finalization-retarget-fields-invalid',400)
    run=c.run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False)
    c.require(actor.role=='admin' or (run.actor_id==actor.pk if run.mode=='direct' else run.mandate.get('orchestrator_id')==actor.pk),'finalization-authority-required',403)
    key=c.identifier(data['request_id']);fingerprint=c.digest(data)
    previous=Event.objects.filter(run=run,kind='finalization-release-retargeted',data__request_id=key).first()
    if previous:
        c.require(previous.data['input_digest']==fingerprint,'finalization-retarget-request-conflict')
        return previous.data['receipt']
    c.working(run)
    from .run_lifecycle import guard
    guard(run,allow_measurement=True)
    c.require(not run.review and not run.mandate.get('native_frozen_at') and not run.mandate.get('legacy_snapshot_id'),'finalization-revision-protected')
    plan=FinalizationPlan.objects.select_for_update().get(run=run)
    c.require(not plan.receipt and plan.digest==data['expected_policy_digest'] and plan.digest==c.digest(plan.policy),'finalization-revision-stale')
    old=plan.policy.get('target_version','');new=data['target_version']
    c.require(isinstance(new,str) and bool(re.fullmatch(r'\d+\.\d+\.\d+',new)) and bool(re.fullmatch(r'\d+\.\d+\.\d+',old)),'finalization-patch-required',400)
    before=tuple(map(int,old.split('.')));after=tuple(map(int,new.split('.')))
    c.require(after[:2]==before[:2] and after[2]==before[2]+1,'finalization-patch-required',400)
    failed=SystemUpdate.objects.select_for_update().filter(pk=plan.policy.get('update_request_id'),state='FAILED',target_version=old).first()
    c.require(failed is not None and (failed.actor_id==run.actor_id or actor.role=='admin'),'finalization-failed-update-required')
    c.require(not run.finalization_evidence.filter(source='cab-update',payload__result='passed').exists(),'finalization-release-already-proven')
    update_key=c.identifier(data['update_request_id'])
    c.require(update_key!=failed.pk and not SystemUpdate.objects.filter(pk=update_key).exists(),'finalization-new-update-required')
    reason=data['reason'];c.require(isinstance(reason,str) and 10<=len(reason.strip())<=4000,'finalization-revision-reason-required',400)
    old_policy=copy.deepcopy(plan.policy);old_mandate=copy.deepcopy(run.mandate)
    # Seule la version littérale change dans les critères, jamais leur contenu métier.
    replace=lambda value:re.sub(r'(?<![0-9.])'+re.escape(old)+r'(?![0-9.])',new,value)
    run.mandate={**run.mandate,'criteria':[replace(value) for value in run.mandate['criteria']]}
    value=copy.deepcopy(plan.policy);value['target_version']=new;value['update_request_id']=update_key
    for rule in value['checks']+value['requirements']:rule['criteria']=[replace(item) for item in rule['criteria']]
    value=validate_policy(run,value);plan.policy=value;plan.digest=c.digest(value);plan.phase='WAITING';plan.missing=['evidence:new-corrective-release-required'];plan.save()
    run.mandate['finalization']=value
    run.mandate['framing_digest']=c.digest({key:value for key,value in run.mandate.items() if key not in ('framing_digest','native_source','native_frozen_at','native_source_home','native_source_history')})
    run.save(update_fields=['mandate','updated'])
    receipt={'request_id':key,'previous_version':old,'target_version':new,'previous_update_request_id':failed.pk,'update_request_id':update_key,'policy_digest':plan.digest,'effects_issued':False}
    c.event(run,'finalization-release-retargeted',{'request_id':key,'input_digest':fingerprint,'actor':actor.pk,'reason':reason,'old_policy':old_policy,'old_mandate':old_mandate,'failed_update':{'id':failed.pk,'state':failed.state,'result':failed.result},'new_policy':value,'receipt':receipt})
    return receipt

@transaction.atomic
def store(run,source,key,payload):
    c.identifier(key);fingerprint=c.digest(payload)
    current=Run.objects.select_for_update().get(pk=run.pk)
    previous=RunEvidence.objects.filter(run=run,source=source,evidence_id=key).first()
    if previous:
        c.require(previous.digest==fingerprint,'evidence-identity-conflict');return previous
    c.require(current.state!='CLOSED','evidence-run-closed')
    row,created=RunEvidence.objects.get_or_create(run=run,source=source,evidence_id=key,defaults={'payload':payload,'digest':fingerprint})
    c.require(row.digest==fingerprint,'evidence-identity-conflict')
    if created:c.event(run,'finalization-evidence-recorded',{'evidence_id':row.pk,'source':source,'digest':fingerprint})
    return row

def operation_completed(op):
    plan=FinalizationPlan.objects.filter(run=op.run).first()
    if not plan or not plan.policy:return
    matches=[check for check in plan.policy['checks'] if check['argv']==op.request.get('argv') and check['executor']==op.request.get('kind') and (check['executor']!='external' or check['adapter_id']==op.request.get('adapter_id'))]
    if not matches:return
    try:after=c.revision(op.run)
    except (c.Refused,OSError,ValueError):after=None
    for check in matches:
        payload={'rule_id':check['id'],'check_revision':plan.check_revisions.get(check['id'],1),'kind':'verification','result':'passed' if op.state=='COMPLETED' and op.receipt.get('exit_code')==0 and op.source_revision==after else 'unavailable' if after is None else 'failed','source_revision':op.source_revision,'source_after':after,'operation_id':op.pk,'request_id':op.request_id,'receipt_digest':op.receipt_digest,'exit_code':op.receipt.get('exit_code'),'scope':identity(op.run)}
        store(op.run,'cab-operation',check['id']+':'+op.request_id if len(check['id']+':'+op.request_id)<=200 else c.digest([check['id'],op.request_id]),payload)

def identity(run):return {'project_id':run.project_id,'run_id':run.run_id,'session_id':run.session_id,'change':run.change,'generation':run.generation}

@transaction.atomic
def register_producer(actor,data):
    c.require(actor.role=='admin' and actor.active,'administrator-required',403)
    owner=Actor.objects.get(pk=data['actor_id']);c.require(owner.active and owner.role=='collector','evidence-collector-required',403)
    c.require(owner.projects.filter(pk=data['project_id']).exists(),'project-not-authorized',403)
    kinds=data['kinds'];c.require(isinstance(kinds,list) and kinds and all(k in KINDS for k in kinds),'evidence-kinds-invalid',400)
    key=c.identifier(data['producer_id']);c.require(key!='cab-update','evidence-producer-reserved',400)
    producer,created=EvidenceProducer.objects.get_or_create(pk=key,defaults={'project_id':data['project_id'],'actor':owner,'kinds':sorted(set(kinds))})
    c.require(producer.actor_id==owner.pk and producer.project_id==data['project_id'] and producer.kinds==sorted(set(kinds)) and producer.active,'evidence-producer-conflict')
    return {'producer_id':producer.pk,'actor_id':producer.actor_id,'project_id':producer.project_id,'kinds':producer.kinds}

def disable_producer(actor,data):
    c.require(actor.active and actor.role=='admin','administrator-required',403)
    producer=EvidenceProducer.objects.get(pk=data['producer_id']);producer.active=False;producer.save(update_fields=['active'])
    return {'producer_id':producer.pk,'active':False}

@transaction.atomic
def attest(actor,data):
    c.require(set(data)<={'project_id','run_id','session_id','change','generation','producer_id','evidence_id','rule_id','kind','result','source_revision','artifact_sha256','reference','exit_code'},'evidence-fields-invalid',400)
    producer=EvidenceProducer.objects.filter(pk=data.get('producer_id'),actor=actor,project_id=data.get('project_id'),active=True).first()
    c.require(producer and actor.active and actor.role=='collector','evidence-producer-not-authorized',403)
    run=c.run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False)
    c.require(identity(run)=={key:data.get(key) for key in identity(run)},'evidence-scope-divergent')
    c.require(data.get('kind') in producer.kinds,'evidence-kind-not-authorized',403)
    plan=FinalizationPlan.objects.filter(run=run).first();c.require(plan and plan.policy,'finalization-contract-required')
    rule=next((rule for rule in plan.policy['requirements'] if rule['id']==data.get('rule_id')),None)
    c.require(rule and rule['producer']==producer.pk and rule['kind']==data.get('kind'),'evidence-rule-divergent')
    c.require(data.get('result') in ('passed','failed','unavailable'),'evidence-result-invalid',400)
    c.require(isinstance(data.get('source_revision'),str) and re.fullmatch('[a-f0-9]{64}',data['source_revision']),'evidence-revision-invalid',400)
    if rule['kind'] in ('publication','installation','availability') and data['result']=='passed':c.require(isinstance(data.get('artifact_sha256'),str) and re.fullmatch('[a-f0-9]{64}',data['artifact_sha256']),'evidence-artifact-required',400)
    if rule['kind']=='verification' and data['result']=='passed':c.require(type(data.get('exit_code')) is int and data['exit_code']==0,'evidence-exit-required',400)
    reference=data.get('reference');c.require(isinstance(reference,str) and c.ID.fullmatch(reference),'evidence-reference-required',400)
    payload={'rule_id':rule['id'],'kind':rule['kind'],'result':data['result'],'source_revision':data['source_revision'],'artifact_sha256':data.get('artifact_sha256'),'reference':reference,'exit_code':data.get('exit_code'),'scope':identity(run),'producer_actor':actor.pk}
    row=store(run,'producer:'+producer.pk,data['evidence_id'],payload)
    return {'evidence_id':row.pk,'digest':row.digest,'source':row.source}

def capture_update(plan):
    policy=plan.policy
    if not policy.get('update_request_id'):return
    run=plan.run;job=SystemUpdate.objects.filter(pk=policy['update_request_id'],state='OK').first()
    if not job or job.actor_id not in (run.actor_id,run.mandate.get('orchestrator_id')):return
    from .models import ConnectorReload
    if ConnectorReload.objects.filter(update=job).exists():
        from cab_platform.system_updates import refresh_connectors
        if refresh_connectors(job.pk)['state']!='OK':return
        job.refresh_from_db()
    if job.result.get('verified') is not True or job.result.get('version')!=policy.get('target_version'):return
    artifact=job.result.get('package_sha256')
    if not isinstance(artifact,str) or not re.fullmatch('[a-f0-9]{64}',artifact):return
    for rule in policy['requirements']:
        if rule['producer']!='cab-update':continue
        key=c.digest([job.pk,rule['id']])
        if RunEvidence.objects.filter(run=run,source='cab-update',evidence_id=key).exists():continue
        store(run,'cab-update',key,{'rule_id':rule['id'],'kind':rule['kind'],'result':'passed','source_revision':c.revision(run),'artifact_sha256':artifact,'reference':job.pk,'job_result_digest':c.digest(job.result),'scope':identity(run)})
