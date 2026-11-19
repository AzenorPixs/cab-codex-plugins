"""Décisions administratives traçables pour le travail hôte sans livraison."""
from copy import deepcopy
from django.db import transaction
from .core import commands as c
from .core.models import Event,FinalizationPlan,GitDelivery,GitSessionEffect,GitSessionIndex,GitFileReservation,TerminalGitCommit
from .finalization_contract import validate,ContractError


def revised_policy(policy,old_criteria,new_criteria,mode):
    c.require(isinstance(new_criteria,list) and len(new_criteria)==len(old_criteria) and len(set(new_criteria))==len(new_criteria) and all(isinstance(item,str) and 0<len(item)<=4000 for item in new_criteria),'finalization-reframe-criteria-invalid',400)
    mapping=dict(zip(old_criteria,new_criteria));value=deepcopy(policy)
    for rule in value['checks']+value.get('requirements',[]):rule['criteria']=[mapping[item] for item in rule['criteria']]
    try:return validate(value,new_criteria,mode)
    except ContractError as error:raise c.Refused(str(error),400) from None


def require_prequalification(run):
    c.require(not run.operation_set.exists() and not run.finalization_evidence.exists(),'finalization-reframe-after-proof',409)
    c.require(not run.review and not run.mandate.get('native_frozen_at') and not run.mandate.get('legacy_snapshot_id'),'finalization-reframe-protected',409)


def require_host_policy(run,plan,index):
    c.require(run.mode=='direct' and plan.policy.get('nature')=='development' and not plan.policy.get('review_required'),'host-completion-policy-required',409)
    c.require(not any(rule.get('kind') in ('publication','installation') for rule in plan.policy.get('requirements',[])),'host-completion-delivery-required',409)
    c.require(index is not None and index.state=='RELEASED','host-completion-index-not-released',409)


def admission(actor,data,kind,extra):
    c.require(actor.active and actor.role=='admin','administrator-required',403)
    c.require(set(data)=={'project_id','run_id','request_id','expected_policy_digest','expected_framing_digest','authorization'}|extra,'host-completion-fields-invalid',400)
    c.require(isinstance(data['authorization'],str) and 20<=len(data['authorization'])<=4000,'host-completion-authorization-required',400)
    run=c.run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False)
    key=c.identifier(data['request_id']);fingerprint=c.digest(data)
    previous=Event.objects.filter(run=run,kind=kind,data__request_id=key).first()
    if previous:
        c.require(previous.data['fingerprint']==fingerprint,'host-completion-request-conflict',409)
        return run,None,key,fingerprint,previous.data['receipt']
    c.working(run)
    c.require(c.no_pending(run) and not run.suspension and not run.review and not run.mandate.get('native_frozen_at') and not run.mandate.get('legacy_snapshot_id'),'host-completion-protected',409)
    plan=FinalizationPlan.objects.select_for_update().get(run=run)
    c.require(not plan.receipt and plan.digest==c.digest(plan.policy) and plan.digest==data['expected_policy_digest'] and run.mandate.get('framing_digest')==data['expected_framing_digest'],'finalization-revision-stale',409)
    return run,plan,key,fingerprint,None


@transaction.atomic
def reframe_prequalification(actor,data):
    run,plan,key,fingerprint,previous=admission(actor,data,'finalization-prequalification-reframed',{'criteria'}|({'nature'} if 'nature' in data else set()))
    if previous:return previous
    require_prequalification(run)
    from .core.run_lifecycle import guard
    guard(run,allow_measurement=True)
    c.require(not GitDelivery.objects.filter(run=run).exists() and not GitSessionEffect.objects.filter(run=run).exists() and not TerminalGitCommit.objects.filter(run=run).exists(),'finalization-reframe-protected',409)
    old_policy=deepcopy(plan.policy);old_criteria=list(run.mandate['criteria']);old_digest=plan.digest;old_framing=run.mandate['framing_digest']
    policy=revised_policy(plan.policy,old_criteria,data['criteria'],run.mode)
    if 'nature' in data:
        c.require(plan.policy['nature']=='development' and data['nature']=='delivery' and data['criteria']==old_criteria and any(rule.get('kind')=='publication' for rule in policy['requirements']),'finalization-prequalification-nature-refused',409)
        policy={**policy,'nature':'delivery'}
        try:policy=validate(policy,old_criteria,run.mode)
        except ContractError as error:raise c.Refused(str(error),400) from None
    run.mandate={**run.mandate,'criteria':data['criteria'],'finalization':policy,'decisions':run.mandate.get('decisions',[])+[data['authorization']]}
    run.mandate['framing_digest']=c.digest({k:v for k,v in run.mandate.items() if k not in ('framing_digest','native_source','native_frozen_at','native_source_home','native_source_history')})
    run.save(update_fields=['mandate','updated'])
    plan.policy=policy;plan.digest=c.digest(policy);plan.phase='WAITING';plan.missing=['evidence-required-after-reframe'];plan.save(update_fields=['policy','digest','phase','missing','updated'])
    receipt={'reframed':True,'policy_digest':plan.digest,'framing_digest':run.mandate['framing_digest'],'new_proofs_required':True}
    c.event(run,'finalization-prequalification-reframed',{'request_id':key,'fingerprint':fingerprint,'authority':actor.pk,'authorization':data['authorization'],'previous_criteria':old_criteria,'previous_policy':old_policy,'previous_policy_digest':old_digest,'previous_framing_digest':old_framing,'receipt':receipt})
    return receipt


@transaction.atomic
def declare_host_completion(actor,data):
    run,plan,key,fingerprint,previous=admission(actor,data,'host-completion-authorized',set())
    if previous:return previous
    index=GitSessionIndex.objects.select_for_update().filter(change_id=run.change_record_id,session_id=run.coding_session_id).first()
    require_host_policy(run,plan,index)
    c.require(not GitFileReservation.objects.filter(git_index=index,active=True).exists() and not GitDelivery.objects.filter(run=run).exists() and not TerminalGitCommit.objects.filter(run=run).exists(),'host-completion-delivery-protected',409)
    marker={'mode':'host-validated-without-delivery','authority':actor.pk,'authorization':data['authorization'],'request_id':key,'delivered':False}
    previous_terminal=run.configuration.get('terminal_git',{})
    run.configuration={**run.configuration,'terminal_git':{'required':False},'host_completion':marker};run.save(update_fields=['configuration','updated'])
    receipt={'configured':True,'delivery_required':False,'proofs_and_archive_required':True,'index_preserved':True}
    c.event(run,'host-completion-authorized',{'request_id':key,'fingerprint':fingerprint,'previous_terminal_git':previous_terminal,'authority':actor.pk,'authorization':data['authorization'],'receipt':receipt})
    return receipt


def verify_unpublished_stage(project,index,receipt):
    from pathlib import Path
    from .git_commit_remove import context,run as git_run
    from .session_delivery import _index_digest
    c.require(receipt.get('phase')=='prepared' and not receipt.get('previous_keep_oid') and not index.keep_ref and not index.keep_oid,'stage-cancel-snapshot-present',409)
    c.require(receipt.get('index_path')==index.index_path and receipt.get('base_oid')==index.base_head and not Path(index.index_path+'.lock').exists(),'stage-cancel-index-changed',409)
    digest=_index_digest(index.index_path,project.owner_uid);options,env=context(project)
    for field in ('keep_ref','base_ref'):
        result=git_run(project,options,env,'rev-parse','--verify','--quiet',receipt[field])
        c.require(result.returncode==1,'stage-cancel-reference-present',409)
    own={**env,'GIT_INDEX_FILE':index.index_path}
    result=git_run(project,options,own,'diff','--cached','--quiet','--no-ext-diff',index.base_head,'--')
    c.require(result.returncode==0,'stage-cancel-snapshot-present',409)
    c.require(_index_digest(index.index_path,project.owner_uid)==digest,'stage-cancel-index-changed',409)
    return {'index_sha256':digest,'base_oid':index.base_head,'no_snapshot':True,'no_references':True}


def cancel_unpublished_stage(actor,data):
    import os
    from pathlib import Path
    from django.db import connection
    from .core.models import Lease,Operation
    from .session_git import _index_path
    from .git_commit_remove import context
    c.require(actor.active and actor.role=='admin','administrator-required',403)
    c.require(set(data)=={'project_id','run_id','effect_id','request_id','expected_receipt_digest','authorization'} and isinstance(data['authorization'],str) and len(data['authorization'])>=20,'stage-cancel-fields-invalid',400)
    with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_lock(%s,%s)',[7348501,7348502])
    try:
        with transaction.atomic():
            run=c.run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False)
            key=c.identifier(data['request_id']);fingerprint=c.digest(data)
            previous=Event.objects.filter(run=run,kind='git-stage-aborted-on-proof',data__request_id=key).first()
            if previous:
                c.require(previous.data['fingerprint']==fingerprint,'stage-cancel-request-conflict',409)
                return previous.data['receipt']
            c.working(run)
            c.require(run.mode=='direct' and not run.review and not run.mandate.get('native_frozen_at') and not run.mandate.get('legacy_snapshot_id'),'stage-cancel-protected',409)
            effect=GitSessionEffect.objects.select_for_update().get(pk=data['effect_id'],run=run)
            index=GitSessionIndex.objects.select_for_update().get(pk=effect.git_index_id)
            c.require(effect.state=='UNKNOWN' and index.state=='UNKNOWN' and c.digest(effect.receipt)==data['expected_receipt_digest'],'stage-cancel-state-changed',409)
            c.require(not GitSessionEffect.objects.filter(run=run,state__in=['INTENT','RUNNING','UNKNOWN']).exclude(pk=effect.pk).exists() and not Operation.objects.filter(run=run).exclude(state__in=c.TERMINAL).exists() and not Lease.objects.filter(run=run,state='HELD').exists() and not GitDelivery.objects.filter(run=run).exists() and not TerminalGitCommit.objects.filter(run=run).exists(),'stage-cancel-effects-protected',409)
            options,env=context(run.project)
            c.require(index.index_path==_index_path(run.project,index,options,env),'stage-cancel-index-changed',409)
            proof=verify_unpublished_stage(run.project,index,effect.receipt)
            backup=index.index_path+'.aborted-'+str(effect.pk)
            c.require(not os.path.lexists(backup),'stage-cancel-backup-exists',409)
            os.rename(index.index_path,backup)
            effect.state='CANCELLED';effect.save(update_fields=['state','updated'])
            index.state='PENDING';index.save(update_fields=['state','updated'])
            receipt={'cancelled':True,'effect_id':effect.pk,'original_receipt_preserved':True,'index_backup':backup,**proof}
            c.event(run,'git-stage-aborted-on-proof',{'request_id':key,'fingerprint':fingerprint,'authority':actor.pk,'authorization':data['authorization'],'original_receipt_digest':data['expected_receipt_digest'],'receipt':receipt})
            return receipt
    finally:
        with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_unlock(%s,%s)',[7348501,7348502])
