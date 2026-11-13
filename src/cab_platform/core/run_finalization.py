"""Automate déterministe ; validation par politique, jamais une revue LLM simulée."""
from pathlib import Path
from django.db import transaction
from django.utils import timezone
from . import commands as c,run_evidence as evidence
from .models import EvidenceProducer,FinalizationPlan,Operation,Run

def dossier(run,plan):
    from .run_lifecycle import archive_state,guard
    missing=[];selected=[];archive=None;boundary=False
    if not plan.policy:return {'missing':['finalization-contract-required'],'proofs':[],'boundary':False}
    c.require(c.digest(plan.policy)==plan.digest,'finalization-policy-divergent')
    try:
        guard(run,allow_measurement=True);c.require(not run.suspension,'run-suspended')
        c.require(run.actor.active,'finalization-owner-inactive')
    except c.Refused as error:missing.append(error.code)
    if plan.policy['nature']=='development':
        try:archive,_=archive_state(run);boundary=True
        except (c.Refused,OSError,ValueError) as error:
            missing.append(getattr(error,'code','finalization-archive-unavailable'))
            boundary=not (Path(run.project.root)/'openspec/changes'/run.change).exists()
    else:boundary=True
    current=c.revision(run);revisions={current}
    if archive:revisions.add(c.revision(run,{'openspec/changes/'+run.change:archive}))
    groups={}
    for rule in plan.policy['checks']+plan.policy['requirements']:
        source='cab-operation' if 'argv' in rule else 'cab-update' if rule['producer']=='cab-update' else 'producer:'+rule['producer']
        row=run.finalization_evidence.filter(source=source,payload__rule_id=rule['id']).order_by('-pk').first()
        reason=None
        if row is None:reason='missing'
        elif row.digest!=c.digest(row.payload):reason='integrity'
        elif row.payload.get('scope')!=evidence.identity(run):reason='scope'
        elif row.payload.get('result')!='passed':reason='not-passed'
        elif row.payload.get('source_revision') not in revisions:reason='source-stale'
        elif source=='cab-operation':
            op=Operation.objects.filter(pk=row.payload.get('operation_id'),run=run).first()
            if not op or op.state!='COMPLETED' or op.receipt.get('exit_code')!=0 or op.receipt_digest!=row.payload.get('receipt_digest') or row.payload.get('source_after')!=op.source_revision:reason='receipt-stale'
        elif source.startswith('producer:'):
            producer=EvidenceProducer.objects.filter(pk=rule['producer'],project=run.project,active=True,actor__active=True,actor__role='collector').first()
            if not producer or rule['kind'] not in producer.kinds:reason='producer-inactive'
        if reason:missing.append('evidence:'+rule['id']+':'+reason);continue
        if row.payload.get('artifact_sha256'):
            group=rule.get('artifact_group','release');value=row.payload['artifact_sha256']
            if group in groups and groups[group]!=value:missing.append('artifact:'+group+':divergent')
            groups[group]=value
        selected.append({'id':row.pk,'digest':row.digest,'rule_id':rule['id']})
    if plan.policy['review_required']:
        submission=run.review.get('submission',{});decision=run.review.get('decision',{})
        authority=run.mandate.get('orchestrator_id') if run.mode=='piloted' else run.actor_id
        if decision.get('decision')!='accept' or decision.get('actor')!=authority or submission.get('source_revision') not in revisions or submission.get('policy_digest')!=plan.digest or submission.get('proofs')!=selected:missing.append('reserved-review-required')
    return {'missing':sorted(set(missing)),'proofs':selected,'boundary':boundary,'archive_path':archive,'source_revision':current,'artifact_groups':groups}

def view(run,plan=None):
    plan=plan or FinalizationPlan.objects.get(run=run)
    if run.state=='CLOSED' and plan.receipt:return {'phase':'CLOSED','missing':[],'policy_digest':plan.digest,'receipt':plan.receipt}
    try:result=dossier(run,plan)
    except (c.Refused,OSError,ValueError) as error:result={'missing':[getattr(error,'code','finalization-source-unavailable')],'proofs':[],'boundary':False}
    return {**result,'phase':'REVIEW' if result['missing']==['reserved-review-required'] and run.state=='REVIEW_PENDING' else 'WAITING' if result['missing'] else 'READY','policy_digest':plan.digest,'nature':plan.policy.get('nature')}

def prepare_review(run,plan,result):
    tests=[]
    for item in result['proofs']:
        row=run.finalization_evidence.get(pk=item['id'])
        if row.source!='cab-operation':continue
        check=next(check for check in plan.policy['checks'] if check['id']==row.payload['rule_id'])
        tests.extend({'criterion':criterion,'request_id':row.payload['request_id'],'outcome':'passed','receipt_digest':row.payload['receipt_digest']} for criterion in check['criteria'])
    submission={'id':'CAB-FINALIZATION-'+str(run.pk),'policy_digest':plan.digest,'source_revision':result['source_revision'],'proofs':result['proofs'],'tests':tests,'limits':[],'summary':'Dossier assemblé automatiquement par CAB à partir des preuves authentifiées.'}
    submission['digest']=c.digest(submission)
    previous=run.review.get('submission',{})
    if previous.get('digest')==submission['digest']:return
    run.review={'submission':submission};run.state='REVIEW_PENDING';run.stage=8;run.save(update_fields=['review','state','stage','updated'])
    c.event(run,'review-requested',{'submission_digest':submission['digest'],'assembled_by':'cab-policy'})

def process(run_id):
    run=Run.objects.select_related('actor','project').get(pk=run_id);plan=FinalizationPlan.objects.get(run=run)
    if run.state in ('CLOSED','BLOCKED'):return
    if not plan.policy:
        path=Path(run.project.root)/'openspec/changes/archive'
        if any(path.glob('????-??-??-'+run.change)) and run.state=='WORKING':
            with transaction.atomic():
                run=Run.objects.select_for_update().get(pk=run_id)
                if run.state=='WORKING':run.state='FINALIZATION_PENDING';run.save(update_fields=['state','updated']);c.event(run,'finalization-waiting',{'missing':['finalization-contract-required']})
        return
    evidence.capture_update(plan)
    with transaction.atomic():
        run=Run.objects.select_for_update().select_related('actor','project').get(pk=run_id)
        plan=FinalizationPlan.objects.select_for_update().get(run=run)
        if run.state in ('CLOSED','BLOCKED'):return
        result=dossier(run,plan)
        if result['missing']:
            changed=plan.missing!=result['missing'] or plan.phase!='WAITING'
            plan.phase='WAITING';plan.missing=result['missing']
            if changed:plan.save()
            if result['missing']==['reserved-review-required']:
                prepare_review(run,plan,result);return
            if result['boundary'] and run.state!='FINALIZATION_PENDING':
                run.state='FINALIZATION_PENDING';run.save(update_fields=['state','updated']);c.event(run,'finalization-waiting',{'missing':plan.missing})
            return
        if run.state!='FINALIZING':
            run.state='FINALIZING';run.stage=10;run.save(update_fields=['state','stage','updated'])
            plan.phase='FINALIZING';plan.missing=[];plan.save()
            c.event(run,'finalization-started',{'policy_digest':plan.digest,'proofs':result['proofs']})
    # État durable FINALIZING : aucune nouvelle exécution n'est admise.
    from .measurements import end_if_open
    from . import statistics_service
    end_if_open(run.actor,run)
    statistics_service.discover(run.project)
    source=run.change_record.local_sources.filter(present=True).order_by('archived','-path').first()
    job='AUTO-FINALIZE-'+str(run.pk)+'-'+c.digest(result['proofs'])[:16]
    statistics_service.sync(run.project,job,generate=run.change if source else None)
    report=None;report_sha=None
    if source:
        report=source.path+'/STATISTICS.md'
        from cab_platform.statistics_documents import read_source,sha
        raw,_=read_source(Path(run.project.root),Path(run.project.root)/report);report_sha=sha(raw)
    with transaction.atomic():
        run=Run.objects.select_for_update().select_related('actor','project').get(pk=run_id)
        plan=FinalizationPlan.objects.select_for_update().get(run=run)
        if plan.receipt:return plan.receipt
        current=dossier(run,plan)
        c.require(not current['missing'] and current['proofs']==result['proofs'] and current['source_revision']==result['source_revision'],'finalization-proof-changed')
        receipt={'receipt_id':'POLICY-FINALIZE-'+str(run.pk),'kind':'policy','branch':'TERMINÉ','policy_digest':plan.digest,'nature':plan.policy['nature'],'proofs':current['proofs'],'source_revision':current['source_revision'],'artifact_groups':current['artifact_groups'],'report':report,'sha256':report_sha,'at':timezone.now().isoformat(),'authority':'cab-policy','llm_submission_required':False}
        plan.receipt=receipt;plan.phase='CLOSED';plan.missing=[];plan.save()
        run.review={**run.review,'closure':receipt};run.state='CLOSED';run.stage=11;run.phase='CLOSED';run.save(update_fields=['review','state','stage','phase','updated'])
        c.event(run,'run-closed',receipt)
        return receipt
