"""Évaluation commune aux commandes, à l'interface et au worker ; aucun rejeu."""
from datetime import date
from pathlib import Path
from types import SimpleNamespace
from django.db import transaction
from . import commands as c,historical,monitor
from .models import Event,Lease,Maintenance,MeasurementPeriod,Run,SessionArchive
from cab_platform.statistics_documents import read_source


def active_change(run):
    c.identifier(run.change)
    return c.safe_path(Path(run.project.root),'openspec/changes/'+run.change,exists=False)


def require_closed_change(run):
    if run.mode != 'service':
        c.require(not active_change(run).exists(),'change-still-open')


def archive_state(run):
    root=Path(run.project.root);active=active_change(run)
    c.require(not active.exists(),'change-still-open')
    candidates=list((root/'openspec/changes/archive').glob('????-??-??-'+run.change))
    c.require(len(candidates)==1,'archive-missing-or-ambiguous')
    path=c.safe_path(root,str(candidates[0].relative_to(root)))
    try:date.fromisoformat(path.name[:10])
    except ValueError:raise c.Refused('archive-date-invalid') from None
    proposal,_=read_source(root,path/'proposal.md',1024*1024)
    c.require(proposal.strip(),'archive-proposal-missing')
    observed=monitor.observe_tasks(SimpleNamespace(project=run.project,identifier=run.change,source_path=str(path.relative_to(root))+'/tasks.md'))
    c.require(observed.get('source_state')=='archived' and observed.get('tasks_total',0)>0 and observed['tasks_done']==observed['tasks_total'],'archive-tasks-incomplete')
    return str(path.relative_to(root)),observed


def closed_change_issue(run):
    """Contrôler les archives présentes, y compris celles des RUN importés."""
    if run.mode=='service' or not run.change:return None
    try:
        require_closed_change(run)
        parent=Path(run.project.root)/'openspec/changes/archive'
        if any(parent.glob('????-??-??-'+run.change)):
            archive_state(run)
    except (c.Refused,OSError,ValueError) as error:
        return getattr(error,'code','finalization-archive-unavailable')
    return None


def guard(run,*,allow_measurement=False,allow_terminal_git=False):
    c.require(not Maintenance.objects.filter(state__in=['PREPARED','INSTALLING']).exists(),'maintenance-in-progress')
    c.require(c.no_pending(run,terminal_git=allow_terminal_git) and not Lease.objects.filter(run=run,state='HELD').exists(),'closure-effects-protected')
    c.require(allow_measurement or not MeasurementPeriod.objects.filter(run=run,ended__isnull=True).exists(),'closure-measurement-open')
    requested={e.data.get('id') for e in Event.objects.filter(run=run,kind='exception-requested')}
    decided={e.data.get('id') for e in Event.objects.filter(run=run,kind='exception-decided')}
    c.require(not requested-decided,'closure-exception-unresolved')


def normal_valid(run):
    guard(run);c.require(not run.suspension,'run-suspended')
    c.require(run.state=='ACCEPTED' and run.review.get('decision',{}).get('decision')=='accept','final-acceptance-required')
    submission=run.review.get('submission',{});tests=submission.get('tests',[])
    c.require(tests and all(t.get('outcome')=='passed' for t in tests),'accepted-tests-missing')
    c.require({t.get('criterion') for t in tests}==set(run.mandate.get('criteria',[])),'criteria-not-covered')
    archive,_=archive_state(run)
    current=c.revision(run);expected=submission.get('source_revision')
    if current!=expected:
        current=c.revision(run,{'openspec/changes/'+run.change:archive})
    c.require(current==expected,'accepted-source-stale')
    for test in tests:
        op=run.operation_set.filter(request_id=test.get('request_id')).first()
        c.require(op and op.state=='COMPLETED' and op.receipt.get('exit_code')==0 and op.receipt_digest==test.get('receipt_digest') and op.source_revision==expected,'accepted-receipt-stale')
    return archive


def terminal_proof(run):
    guard(run)
    issue=closed_change_issue(run)
    c.require(issue is None,issue)
    if run.mandate.get('legacy_snapshot_id'):
        if run.review.get('closure',{}).get('kind') in ('legacy-service-retirement','legacy-technical-retirement'):
            c.require(run.suspension=='IMPORT_PROTECTED','legacy-protection-divergent')
            from .session_cleanup import retirement_proof
            return retirement_proof(run)
        from cab_platform.legacy_closure import proof
        c.require(run.suspension=='IMPORT_PROTECTED','legacy-protection-divergent')
        return {'kind':'legacy','proof':proof(run)}
    c.require(not run.suspension,'run-suspended')
    closure=run.review.get('closure')
    c.require(isinstance(closure,dict) and closure.get('branch') in ('TERMINÉ','HISTORIQUE'),'terminal-receipt-missing')
    c.require(Event.objects.filter(run=run,kind='run-closed',data=closure).exists(),'terminal-audit-missing')
    return {'kind':'historical' if closure.get('kind')=='historical' else 'normal','receipt':closure}


def evaluate(run):
    result={'project_id':run.project_id,'run_id':run.run_id,'state':run.state,'suspension':run.suspension,'action':'blocked','reasons':[],'archive_allowed':False,'historical':False}
    from .models import FinalizationPlan
    from .run_replacement import CANCELLED, closed_recovery
    if run.state == 'BLOCKED':
        result['closed_recovery'] = closed_recovery(run)
    if run.state==CANCELLED:
        result.update(action='cancelled',replacement=run.configuration.get('replacement'))
        return {**result,'evaluation_digest':c.digest(result)}
    if run.state == 'CLOSURE_INVALID':
        result['reasons']=[closed_change_issue(run) or 'archive-missing-or-ambiguous']
        result['evaluation_digest']=c.digest(result)
        return result
    plan=FinalizationPlan.objects.filter(run=run).first()
    if plan is None and run.state=='WORKING' and not run.suspension and not run.operation_set.exists() and not run.review and not run.mandate.get('native_frozen_at') and not run.mandate.get('legacy_snapshot_id'):
        from cab_platform.finalization_contract import next_actions
        result.update(action='configure',reasons=['finalization-contract-required'],next_actions=next_actions(['finalization-contract-required'],{}))
        result['evaluation_digest']=c.digest(result);return result
    if plan and run.state!='CLOSED':
        from .run_finalization import view
        status=view(run,plan)
        return {**result,'action':'finalize' if status['phase']=='READY' else 'waiting','reasons':status['missing'],'finalization':status}
    try:
        guard(run)
        if run.state == 'CLOSED':
            issue=closed_change_issue(run)
            c.require(issue is None,issue)
        if SessionArchive.objects.filter(run=run).exists():result['action']='archived';return result
        if run.mode=='service':
            result['tasks_applicable']=False
            try:
                proof=terminal_proof(run)
                result.update(action='normalize' if run.state!='CLOSED' or run.stage!=run.cycle_steps else 'closed',terminal=proof,archive_allowed=run.state=='CLOSED')
            except c.Refused as error:
                result.update(action='service',reasons=['service-terminal-proof-required',error.code])
                if error.code=='legacy-terminal-proof-missing':
                    try:
                        from .session_cleanup import retirement_facts
                        facts=retirement_facts(run);result.update(action='retire-service',reasons=[],retirement=facts)
                    except (c.Refused,OSError,ValueError) as refused:result['reasons'].append(getattr(refused,'code','legacy-service-observation-unavailable'))
            result['evaluation_digest']=c.digest(result);return result
        if run.state=='CLOSED':
            proof=terminal_proof(run)
            result.update(action='normalize' if run.stage!=run.cycle_steps else 'closed',terminal=proof)
            if proof['kind']=='legacy-technical-retirement':
                result['archive_allowed']=True;result['evaluation_digest']=c.digest(result);return result
            if plan and plan.receipt and plan.policy['nature']!='development':
                result['archive_allowed']=True;result['evaluation_digest']=c.digest(result);return result
            try:
                archive,tasks=archive_state(run);result.update(archive_allowed=True,archive_path=archive,tasks_sha256=tasks['tasks_sha256'])
            except c.Refused as error:result['reasons'].append(error.code)
        elif run.suspension=='IMPORT_PROTECTED':
            proof=terminal_proof(run);archive,_=archive_state(run)
            result.update(action='normalize',terminal=proof,archive_path=archive)
        elif run.state=='ACCEPTED':
            result.update(action='close',archive_path=normal_valid(run))
        elif run.state=='WORKING':
            c.require(not run.suspension,'run-suspended')
            archive,_=archive_state(run);preview=historical.inspect_run(run,archive)
            result.update(action='historical',historical=True,archive_path=archive,evidence_digest=preview['evidence_digest'],reasons=['explicit-historical-confirmation-required'])
        else:result['reasons'].append('terminal-proof-required')
    except (OSError,ValueError) as error:result['reasons']=['closure-source-unavailable']
    except c.Refused as error:result['reasons']=[error.code]
    result['evaluation_digest']=c.digest({k:v for k,v in result.items() if k!='evaluation_digest'})
    return result


def scoped(actor,data,*,lock=False):
    run=c.run_scope(actor,data['run_id'],data['project_id'],lock=lock,owner=False)
    c.require(actor.role=='admin' or actor.pk==run.actor_id or actor.pk==run.mandate.get('orchestrator_id'),'closure-authority-required',403)
    return run


def recheck(actor,data,*,automatic=False):
    run=Run.objects.get(project_id=data['project_id'],run_id=data['run_id']) if automatic else scoped(actor,data)
    evaluation=evaluate(run)
    if evaluation['action']=='retire-service':
        from .session_cleanup import retire
        retire(run,'cab-policy' if automatic else actor.pk);run.refresh_from_db();return evaluate(run)
    if evaluation['action'] in ('waiting','finalize'):
        from .run_finalization import process
        process(run.pk);run.refresh_from_db();return evaluate(run)
    if evaluation['action']=='close':
        from .run_closure import close_normal
        # La preuve de revue est l'autorité métier ; aucune identité de pair simulée.
        receipt=close_normal(run.actor,{'project_id':run.project_id,'run_id':run.run_id,'branch':'TERMINÉ','receipt_id':'AUTO-CLOSE-'+str(run.pk)},automatic=True)
        run.refresh_from_db();return {**evaluate(run),'closure':receipt}
    if evaluation['action']=='normalize':
        with transaction.atomic():
            run=Run.objects.select_for_update().get(pk=run.pk) if automatic else scoped(actor,data,lock=True)
            current=evaluate(run)
            c.require(current['action']=='normalize','closure-evaluation-changed')
            require_closed_change(run)
            run.state='CLOSED';run.stage=run.cycle_steps;run.save(update_fields=['state','stage','updated'])
            c.event(run,'run-terminal-reconciled',{'proof':current['terminal'],'protection_retained':run.suspension,'automatic':automatic})
        return evaluate(run)
    return evaluation


@transaction.atomic
def archive_session(actor,data):
    run=scoped(actor,data,lock=True);request=c.identifier(data['request_id'])
    existing=SessionArchive.objects.filter(run=run).first()
    if existing:
        c.require(existing.request_id==request and existing.evidence['evaluation']['evaluation_digest']==data.get('evaluation_digest'),'session-archive-receipt-conflict')
        return {'archived':True,'request_id':request,'run_id':run.run_id,'at':existing.created.isoformat()}
    evaluation=evaluate(run)
    c.require(run.state=='CLOSED' and evaluation['archive_allowed'],'session-not-archivable')
    c.require(data.get('evaluation_digest')==evaluation['evaluation_digest'],'closure-evaluation-stale')
    row=SessionArchive.objects.create(run=run,actor=actor,request_id=request,evidence={'identity':{'project_id':run.project_id,'run_id':run.run_id,'session_id':run.session_id,'generation':run.generation},'evaluation':evaluation})
    c.event(run,'session-archived',{'request_id':request,'archive_id':row.pk})
    return {'archived':True,'request_id':request,'run_id':run.run_id,'at':row.created.isoformat()}


_cursors={None:0,False:0,True:0}


@transaction.atomic
def reconcile_closed_change(run):
    """Corriger un état affiché sans réécrire ni rejouer son reçu historique."""
    current=Run.objects.select_for_update().select_related('project').get(pk=run.pk)
    if current.mode=='service' or current.state not in ('CLOSED','CLOSURE_INVALID'):return current
    issue=closed_change_issue(current)
    if current.state=='CLOSED' and issue:
        current.state='CLOSURE_INVALID'
        current.save(update_fields=['state','updated'])
        c.event(current,'run-closure-inconsistent',{'reason':issue,'receipt_id':current.review.get('closure',{}).get('receipt_id')})
    elif current.state=='CLOSURE_INVALID':
        try:archive,_=archive_state(current)
        except (c.Refused,OSError,ValueError):return current
        current.state='CLOSED'
        current.save(update_fields=['state','updated'])
        c.event(current,'run-closure-archive-reconciled',{'archive_path':archive,'replayed':False})
    return current


def sweep(*, historical=None):
    if Maintenance.objects.filter(state__in=['PREPARED','INSTALLING']).exists():return
    closed_states=('CLOSED','CLOSURE_INVALID')
    candidates=Run.objects.filter(pk__gt=_cursors[historical])
    if historical is True:
        candidates=candidates.filter(state__in=closed_states)
    elif historical is False:
        candidates=candidates.exclude(state__in=closed_states+('CANCELLED_BEFORE_START',))
    rows=list(candidates.select_related('project').order_by('pk')[:100])
    if not rows:_cursors[historical]=0;return
    try:
        for run in rows:
            from .models import FinalizationPlan
            if run.state in ('CLOSED','CLOSURE_INVALID'):
                try:run=reconcile_closed_change(run)
                except (c.Refused,OSError,ValueError):continue
            if run.state not in ('CLOSED','CLOSURE_INVALID','BLOCKED','BLOCKING','CANCELLED_BEFORE_START') and FinalizationPlan.objects.filter(run=run).exists():
                from .run_finalization import process
                try:process(run.pk)
                except (c.Refused,OSError,ValueError):continue
                run.refresh_from_db()
            evaluation=evaluate(run)
            if evaluation['action'] in ('close','normalize','retire-service'):
                try:recheck(None,{'project_id':run.project_id,'run_id':run.run_id},automatic=True)
                except (c.Refused,OSError,ValueError):continue
            # La projection corrige aussi les anciens états masqués, sans levée de protection.
            run.refresh_from_db();c.projection(run)
    finally:_cursors[historical]=rows[-1].pk
