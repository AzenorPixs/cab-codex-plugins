"""Entrées et validations explicites, reçus CAB indépendants."""
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .change_stage_metrics import LABELS, keys_for, number_for, finish_iteration, statistics_at_closure
from .core import commands as c
from .core.models import ChangeStageIteration, Event, FinalizationPlan, GitDelivery, Operation, Run

KEY = 'stage_protocol'
VERSION = 'agent-stages-v2'
LEGACY_VERSION = 'agent-stages-v1'
DEADLOCK_SQLSTATE = '40P01'
MAX_DEADLOCK_RETRIES = 3


def enabled(run):
    return run.configuration.get(KEY, {}).get('version') in (LEGACY_VERSION, VERSION)


def authority(actor, run):
    return actor.pk == (run.mandate.get('orchestrator_id') if run.mode == 'piloted' else run.actor_id)


def _plan(run):
    plan = FinalizationPlan.objects.filter(run=run).first()
    return plan.policy if plan else {}


def _requires_delivery(run):
    return any(rule['kind'] == 'publication' for rule in _plan(run).get('requirements', []))


def transition(current, target, *, restart=False):
    """Un enchaînement vers l’avant exige la validation et ne saute aucun passage."""
    if current is None:
        c.require(target == 1, 'stage-initialization-required')
        return False
    previous = current['stage']
    if target == previous:
        c.require(current['validated'] or restart, 'stage-already-started')
    elif target > previous:
        c.require(target == previous + 1 and current['validated'], 'stage-agent-validation-required')
    return target <= previous


def _save(run, protocol):
    run.configuration = {**run.configuration, KEY:protocol}
    run.save(update_fields=['configuration','updated'])


def _request(actor, data, kind):
    key = c.identifier(data['request_id'])
    run = c.run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False)
    c.require(enabled(run),'stage-protocol-not-enabled')
    c.require(authority(actor,run),'stage-agent-authority-required',403)
    fingerprint = c.digest(data)
    previous = Event.objects.filter(run=run,kind=kind,data__request_id=key).first()
    if previous:
        c.require(previous.data['digest']==fingerprint,'stage-request-conflict')
        return run, key, fingerprint, previous.data['result']
    c.require(run.state in ('WORKING','FINALIZATION_PENDING','REVIEW_PENDING','ACCEPTED')
              and not run.suspension,'run-not-active')
    from .core.models import Maintenance
    c.require(not Maintenance.objects.filter(state__in=('PREPARED','INSTALLING')).exists(),'maintenance-in-progress')
    return run, key, fingerprint, None


def _description(data):
    value = data.get('text')
    c.require(isinstance(value,str) and 0 < len(value.strip()) <= 2000,'stage-agent-text-required',400)
    from .logging import redact
    return redact(value.strip())


def _start_checks(run, attempt):
    ids = []
    for rule in _plan(run).get('checks',[]):
        executor = rule['executor']
        packet = {
            'project_id':run.project_id,'run_id':run.run_id,'session_id':run.session_id,
            'generation':run.generation,'request_id':f'STAGE-{run.pk}-{attempt}-{rule["id"]}',
            'kind':executor,'phase':'verification','argv':rule['argv'],
        }
        if executor == 'external':
            packet['adapter_id'] = rule['adapter_id']
        operation,_ = c.start_operation(run.actor,packet)
        ids.append(operation.pk)
    return ids


def begin(actor, data):
    c.require({'project_id','run_id','request_id','stage','text'} <= set(data)
              <= {'project_id','run_id','request_id','stage','text','version','scope','restart'},'stage-begin-fields-invalid',400)
    from .preexisting_git import git_guard
    with git_guard(), transaction.atomic():
        return _begin(actor,data)


def _begin(actor, data):
    run, key, fingerprint, prior = _request(actor,data,'stage-agent-started')
    if prior:
        return prior
    stage, description = data['stage'], _description(data)
    keys = keys_for(run)
    c.require(type(stage) is int and 1 <= stage <= len(keys),'run-stage-invalid',400)
    name = keys[stage-1]
    c.require(name=='publication' or not ({'version','scope'} & set(data)),'stage-delivery-fields-invalid',400)
    protocol = run.configuration[KEY]
    previous = protocol.get('current')
    restart=data.get('restart',False)
    c.require(type(restart) is bool and (not restart or previous and previous['stage']==stage),'stage-restart-invalid',400)
    again = transition(previous,stage,restart=restart)
    if name == 'publication' and previous and previous['stage'] == 10 and keys[9] == 'cleanup':
        from .run_cleanup import inventory
        approved = previous.get('cab', {}).get('inventory', {})
        c.require(approved.get('digest') == inventory(run)['digest'], 'cleanup-inventory-changed')
    if name in ('implementation','verification','review','archival','statistics','vacant','cleanup','publication','closure'):
        from .version_skill import require_acknowledged
        require_acknowledged(run)
    active = dict(protocol.get('active', {}))
    if again:
        from .publication_boundary import frozen, reopen_for_remediation
        # Les requêtes anciennes restent consultables via leurs événements mais
        # ne valident plus les étapes à partir du point de reprise.
        c.require(not any(step['cab'].get('state')=='DISPATCHING' for step in active.values()),'stage-cab-dispatch-in-flight')
        publication=active.get('11',{}).get('cab',{})
        c.require(stage>11 or publication.get('state')!='UNKNOWN','stage-return-effects-protected')
        if stage<=11 and publication.get('state')=='QUEUED':
            from .stage_substeps import phase
            phase(run,'publication',publication['reference'],'CANCELLED',{'reason':'agent-return'})
        kept = {index:value for index,value in active.items() if int(index) < stage}
        if frozen(run) and stage <= (11 if statistics_at_closure(run) else number_for(run,'statistics')):
            from .phase_statistics import result_for
            c.require(result_for(run)['state'] not in ('PENDING','RUNNING','UNKNOWN')
                      and not GitDelivery.objects.filter(run=run,state__in=('PENDING','RUNNING','UNKNOWN')).exists(),
                      'stage-return-effects-protected')
            reopen_for_remediation(run,target=name)
            run.refresh_from_db()
        active = kept
    if restart:
        report=next((item for item in reports(run) if item['attempt']==previous['attempt']),None)
        c.require(not report or report['state'] not in ('RUNNING','PENDING','DISPATCHING','UNKNOWN'),
                  'stage-restart-effects-protected')
    if previous and (previous['stage'] != stage or again):
        old = ChangeStageIteration.objects.filter(run=run,stage__key=keys[previous['stage']-1],
            parent__isnull=True,asynchronous=False,ended_at__isnull=True).first()
        if old:
            finish_iteration(old,timezone.now(),'stage-returned' if again else 'stage-transition',
                             state='CANCELLED' if again else 'COMPLETED')
    # Clôture reste ouverte jusqu’au sceau CAB pour mesurer son exécution.
    attempt = protocol.get('sequence',0)+1
    run.stage=stage
    run.phase=name.replace('-','_').upper()
    if run.state == 'ACCEPTED' or run.state == 'REVIEW_PENDING' and stage < 12:
        run.state='WORKING'
    run.save(update_fields=['stage','phase','state','updated'])
    entry={'stage':stage,'attempt':attempt,'validated':False,'cab':{'state':'NOT_REQUIRED'}}
    active[str(stage)] = entry
    updated={**protocol,'sequence':attempt,'active':active,'current':entry}
    _save(run,updated)
    c.event(run,'run-progress',{'stage':stage,'phase':run.phase})
    phase_row = None
    if name == 'verification':
        ids = _start_checks(run,attempt)
        if ids:
            entry['cab']={'state':'ADMITTED','operations':ids}
    elif name == 'archival' and _plan(run).get('checks'):
        entry['cab']={'state':'ARCHIVE_WAITING'}
    elif name == 'cleanup':
        entry['cab'] = _cleanup(run, attempt)
    elif name == 'statistics':
        from .publication_boundary import prepare
        marker=prepare(run,commit_reports=_requires_delivery(run),publication=None)
        entry['cab']={'state':'ADMITTED','statistics_job':marker['statistics_job']}
    elif name == 'publication' and _requires_delivery(run):
        from .session_delivery import version_tuple, delivery_version_selection
        version, scope = data.get('version'), data.get('scope','change')
        c.require(scope in ('change','project'),'stage-delivery-scope-invalid',400)
        version_tuple(version)
        prior_delivery=GitDelivery.objects.filter(run=run,version=version).first()
        if prior_delivery is None:
            delivery_version_selection(run.actor,run,version)
        target = _plan(run).get('target_version')
        c.require(not target or target==version,'stage-delivery-version-divergent')
        from .publication_boundary import KEY as BOUNDARY, frozen, prepare
        from .stage_substeps import phase
        if statistics_at_closure(run) and not frozen(run):
            prepare(run,publication=None)
        c.require(frozen(run),'stage-statistics-not-started')
        reference='publication-stage-'+str(attempt)
        run.configuration={**run.configuration,BOUNDARY:{**run.configuration[BOUNDARY],'publication_ref':reference}}
        run.save(update_fields=['configuration','updated'])
        revision=c.revision(run)
        entry['cab']={'state':'QUEUED','version':version,'scope':scope,'source_revision':revision,'reference':reference}
        phase_row = phase(run,'publication',reference,'RUNNING')
        if prior_delivery and prior_delivery.state=='COMPLETED':
            same=prior_delivery.plan.get('source_revision')==revision and prior_delivery.plan.get('scope')==scope
            state='COMPLETED' if same else 'FAILED'
            phase(run,'publication',reference,state,{'delivery_id':prior_delivery.pk,'reused':same})
            entry['cab']['state']='ADMITTED' if same else 'FAILED'
            if not same:entry['cab']['error']='stage-publication-previous-receipt-stale'
    elif name == 'publication':
        from .stage_substeps import phase
        phase(run,'publication','stage-skipped-'+str(attempt),'SKIPPED')
    from .stage_telemetry import confirmation_roles, open_tracking
    row=phase_row or ChangeStageIteration.objects.filter(run=run,stage__key=name,parent__isnull=True,
        asynchronous=False,started_at__isnull=False,ended_at__isnull=True).first()
    telemetry = {}
    if row:
        if name != 'closure' and not row.asynchronous:
            row.description=description
            row.description_source='agent'
            row.save(update_fields=['description','description_source'])
        telemetry = open_tracking(run, row, attempt, key)
        if telemetry:
            entry['token_tracking_passage'] = row.pk
    _save(run,updated)
    result={'text':f'{"Retour" if again else "Début"} à l’étape {stage}/{len(keys)} — {LABELS[name]}. {description}',
            'stage':stage,'attempt':attempt,'cab':dict(entry['cab']),'reports':reports(run)}
    roles = confirmation_roles(run)
    if roles:
        result['telemetry_required'] = list(roles)
    if telemetry:
        result['telemetry'] = telemetry
    c.event(run,'stage-agent-started',{'request_id':key,'digest':fingerprint,'actor':actor.pk,'result':result})
    return result


def reports(run):
    result=[]
    protocol=run.configuration.get(KEY,{})
    for step in protocol.get('active',{}).values():
        cab=step.get('cab',{})
        admission=cab.get('state')
        state=admission
        details={}
        if 'cleanup' in cab:
            details = {k: cab[k] for k in ('reason', 'banks', 'workshop', 'inventory') if k in cab}
        elif 'operations' in cab:
            ops=list(Operation.objects.filter(run=run,pk__in=cab['operations']).order_by('pk'))
            fresh=[op for op in ops if op.state=='COMPLETED' and op.receipt.get('exit_code')==0]
            state=('COMPLETED' if len(fresh)==len(cab['operations']) else 'UNKNOWN' if any(op.state=='UNKNOWN' for op in ops)
                   else 'FAILED' if len(ops)!=len(cab['operations']) or any(op.state in c.TERMINAL and op not in fresh for op in ops)
                   else 'RUNNING')
            details={'operations':[{'request_id':op.request_id,'state':op.state,'exit_code':op.receipt.get('exit_code'),
                                    'receipt_digest':op.receipt_digest or None} for op in ops]}
        elif 'statistics_job' in cab:
            from .phase_statistics import result_for
            observed=result_for(run)
            state=observed['state']
            if state=='COMPLETED' and not observed.get('verified'):
                state='FAILED'
            details={'statistics_job':cab['statistics_job'],'receipt_digest':observed.get('receipt_digest')}
        elif 'version' in cab:
            row=GitDelivery.objects.filter(run=run,version=cab['version']).first()
            if row and (row.plan.get('source_revision') != cab['source_revision'] or row.plan.get('scope')!=cab['scope']):
                state='UNKNOWN' if admission=='UNKNOWN' else 'FAILED'
                details={'error':'stage-publication-source-changed','version':row.version}
            elif row:
                state=row.state
                details={'delivery_id':row.pk,'version':row.version,
                         'steps':list(row.steps.order_by('pk').values('key','state'))}
            else:
                details={k:cab[k] for k in ('version','error','recovery_state','recovery_reason') if k in cab}
        if admission != 'NOT_REQUIRED':
            result.append({'stage':step['stage'],'attempt':step['attempt'],'state':state,**details})
    return result


def close_missing(run):
    if not enabled(run):
        return []
    protocol=run.configuration[KEY]
    current=protocol.get('current',{})
    missing=[f'stage:{number}:agent-validation-required' for number in range(1,12)
             if not protocol.get('active',{}).get(str(number),{}).get('validated')]
    if current.get('stage') != 12 or not current.get('validated'):
        missing.append('stage:12:agent-validation-required')
    missing.extend(f'stage:{item["stage"]}:cab-return:{str(item["state"]).lower()}' for item in reports(run)
                   if item['state']!='COMPLETED')
    return missing


def _cleanup(run, attempt):
    from .run_cleanup import execute
    try:
        result = execute(run, attempt)
    except c.Refused as error:
        result = {'state': 'PENDING', 'reason': error.code}
    except OSError:
        result = {'state': 'PENDING', 'reason': 'cleanup-workshop-unavailable'}
    return {'cleanup': True, **result}


def validate(actor, data):
    from .preexisting_git import git_guard
    with git_guard(), transaction.atomic():
        return _validate(actor, data)


def _validate(actor, data):
    c.require(set(data)=={'project_id','run_id','request_id','attempt','text'},'stage-validation-fields-invalid',400)
    run,key,fingerprint,prior=_request(actor,data,'stage-agent-validated')
    if prior:
        return prior
    description=_description(data)
    protocol=run.configuration[KEY]
    current=protocol.get('current')
    c.require(current and type(data['attempt']) is int and current['attempt']==data['attempt']
              and not current['validated'],'stage-attempt-not-current')
    name=keys_for(run)[current['stage']-1]
    from .stage_telemetry import confirmation_roles, confirmed_roles, tracking_view
    roles = confirmation_roles(run)
    if roles:
        confirmed = confirmed_roles(run, current['attempt'])
        missing = [f'stage:{current["stage"]}:telemetry-required:{role}' for role in roles if role not in confirmed]
        if missing:
            return {'validated':False,'stage':current['stage'],'attempt':current['attempt'],
                    'missing':missing,'reports':reports(run)}
    if name=='initialization' and protocol.get('mandate_confirmation'):
        from .stage_actions import mandates_validated
        if not mandates_validated(run,current['attempt']):
            return {'validated':False,'stage':1,'attempt':current['attempt'],
                    'missing':['stage:1:mandate-confirmation-required'],'reports':reports(run)}
    if name=='version-skill':
        from .version_skill import require_acknowledged
        require_acknowledged(run)
    if name=='archival':
        from .core.run_lifecycle import archive_state
        archive_state(run)
        if current['cab']['state']=='ARCHIVE_WAITING':
            _archive_checks(run)
            run.refresh_from_db()
            protocol=run.configuration[KEY];current=protocol['current']
    if name == 'cleanup':
        from .run_cleanup import reviewed
        cab = _cleanup(run, current['attempt'])
        current = {**current, 'cab': cab}
        protocol = {**protocol, 'current': current, 'active': {**protocol['active'], '10': current}}
        _save(run, protocol)
        if cab['state'] == 'COMPLETED':
            inventory = cab['inventory']
            if not inventory['available'] or not reviewed(run, current['attempt'], inventory['digest']):
                return {'validated': False, 'stage': 10, 'attempt': current['attempt'],
                        'missing': ['stage:10:inventory-review-required'], 'reports': reports(run)}
    report=next((item for item in reports(run) if item['attempt']==current['attempt']),None)
    if report and report['state']!='COMPLETED':
        return {'validated':False,'stage':current['stage'],'attempt':current['attempt'],
                'missing':[f'stage:{current["stage"]}:cab-return:{report["state"].lower()}'],'reports':reports(run)}
    if current['cab'].get('operations'):
        revision=c.revision(run)
        c.require(not Operation.objects.filter(run=run,pk__in=current['cab']['operations'])
                  .exclude(source_revision=revision).exists(),'stage-verification-source-changed')
    if name=='closure':
        from .core.run_finalization import dossier
        plan=FinalizationPlan.objects.get(run=run)
        missing=[item for item in dossier(run,plan)['missing'] if item!='stage:12:agent-validation-required']
        if missing:
            return {'validated':False,'stage':12,'missing':missing,'reports':reports(run)}
    old=ChangeStageIteration.objects.filter(run=run,stage__key=name,parent__isnull=True,
            asynchronous=False,ended_at__isnull=True).first()
    if old and name=='implementation' and run.actor.agent in ('codex','codex-cli','opencode'):
        from .stage_telemetry import require_implementation_tokens
        if not require_implementation_tokens(run,old,timezone.now()):
            return {'validated':False,'stage':current['stage'],'attempt':current['attempt'],
                    'missing':['stage:implementation:native-tokens-required'],'reports':reports(run)}
    if old and name!='closure':
        finish_iteration(old,timezone.now(),'agent-validated',state='SKIPPED' if name=='vacant' else 'COMPLETED')
    current={**current,'validated':True}
    active={**protocol['active'],str(current['stage']):current}
    _save(run,{**protocol,'active':active,'current':current})
    result={'validated':True,'stage':current['stage'],'attempt':current['attempt'],
            'text':f'Étape {current["stage"]} validée par l’agent. {description}','reports':reports(run)}
    if current.get('token_tracking_passage'):
        tracking = ChangeStageIteration.objects.get(run=run, pk=current['token_tracking_passage'])
        result['telemetry'] = tracking_view(tracking, tracking.time_projection)
    if name=='closure' and statistics_at_closure(run):
        result['native_end_required']=True
        result['text']+=' Terminer le tour de codage pour que CAB collecte la télémétrie et clôture le RUN.'
    c.event(run,'stage-agent-validated',{'request_id':key,'digest':fingerprint,'actor':actor.pk,'result':result})
    return result


def status(actor,data):
    run=c.run_scope(actor,data['run_id'],data['project_id'],owner=False)
    return view(run)


def view(run):
    if not enabled(run):
        return None
    protocol=run.configuration[KEY]
    current = protocol.get('current')
    result = {'current':current,'reports':reports(run)}
    from .stage_telemetry import confirmation_roles, confirmed_roles, tracking_view
    roles = confirmation_roles(run)
    if current and roles:
        confirmed = confirmed_roles(run, current['attempt'])
        result['telemetry'] = {role:'CONFIRMED' if role in confirmed else 'PENDING' for role in roles}
    if current and current.get('token_tracking_passage'):
        row = ChangeStageIteration.objects.filter(run=run, pk=current['token_tracking_passage']).first()
        if row:
            result['telemetry'] = tracking_view(row, row.time_projection)
    return result


def _set_publication(run, attempt, state, **details):
    protocol=run.configuration[KEY]
    step=protocol['active'].get('11')
    if not step or step['attempt']!=attempt:
        return
    step={**step,'cab':{**step['cab'],'state':state,**details}}
    active={**protocol['active'],'11':step}
    current=step if protocol.get('current',{}).get('attempt')==attempt else protocol['current']
    _save(run,{**protocol,'active':active,'current':current})
    if state in ('FAILED','UNKNOWN'):
        from .stage_substeps import phase
        phase(run,'publication',step['cab']['reference'],state,details)
    c.event(run,'stage-cab-publication-'+state.lower(),{'attempt':attempt,'reference':step['cab']['reference'],**details})


def _publication_snapshot(run, cab):
    from .core.models import GitSessionIndex
    from .session_delivery import delivery_preflight, preflight_commit

    revision=c.revision(run)
    c.require(revision==cab['source_revision'],'stage-publication-source-changed')
    index=GitSessionIndex.objects.filter(change_id=run.change_record_id,session_id=run.coding_session_id,state='OPEN').first()
    c.require(index is not None,'session-delivery-index-invalid')
    from .session_git import delivery_files
    reservations=delivery_files(index)
    c.require(reservations,'session-git-reservation-required')
    git=preflight_commit(run.project,index,cab['version'],reservations,
                         complete=cab['scope']=='project',include_reports=True)
    plan=delivery_preflight(run.project,cab['version'])
    return {'revision':revision,'head':git['head'],'index':index.pk,'index_sha256':git['index_digest'],
            'git_sha256':c.digest(git),'reservations_sha256':c.digest(reservations),
            'delivery_sha256':c.digest(plan),'remote_heads':{forge['name']:forge['remote'] for forge in plan['forges']}}


def _compatible_delivery(row, cab):
    return row.plan.get('source_revision')==cab['source_revision'] and row.plan.get('scope')==cab['scope']


def _publication_effects_absent(run, cab, dispatch):
    from .core.models import GitSessionEffect, Lease, ProjectArtifactBuild, ProjectForgeArtifactPublication, TerminalGitCommit

    project=run.project_id
    active=('PENDING','RUNNING','UNKNOWN','PARTIAL')
    return (c.no_pending(run)
            and not Lease.objects.filter(run__project_id=project,state='HELD').exists()
            and not GitDelivery.objects.filter(project_id=project).filter(
                Q(run=run)|Q(version=cab['version'])|Q(state__in=active)|Q(created__gte=dispatch.created)).exists()
            and not GitSessionEffect.objects.filter(run__project_id=project).filter(
                Q(state__in=('INTENT','RUNNING','UNKNOWN'))|Q(created__gte=dispatch.created)).exists()
            and not TerminalGitCommit.objects.filter(run=run).exists()
            and not ProjectArtifactBuild.objects.filter(project_id=project).filter(
                Q(version=cab['version'])|Q(state__in=active)|Q(created__gte=dispatch.created)).exists()
            and not ProjectForgeArtifactPublication.objects.filter(project_id=project).filter(
                Q(plan__version=cab['version'])|Q(receipt__version=cab['version'])|Q(state__in=active)|Q(created__gte=dispatch.created)).exists())


def _recover_publication(run_id):
    from .connector_process import alive
    from .core.models import Maintenance
    from .preexisting_git import git_guard
    from .publication_boundary import KEY as BOUNDARY
    from .stage_substeps import phase

    with git_guard(),transaction.atomic():
        run=Run.objects.select_for_update().get(pk=run_id)
        step=run.configuration[KEY].get('current',{})
        cab=step.get('cab',{})
        if step.get('stage')!=11 or cab.get('state') not in ('DISPATCHING','UNKNOWN'):
            return
        if cab['state']=='DISPATCHING' and alive(cab.get('executor') or {}):
            return
        attempt=step['attempt']
        row=GitDelivery.objects.filter(run=run,version=cab['version']).first()
        if row and _compatible_delivery(row,cab):
            _set_publication(run,attempt,'ADMITTED',delivery_id=row.pk)
            return
        if cab['state']=='DISPATCHING':
            _set_publication(run,attempt,'UNKNOWN',error='stage-publication-dispatcher-stopped',execution_finished=True)
            cab=run.configuration[KEY]['current']['cab']
        retry_count=cab.get('retry_count',int(cab.get('recovery_state')=='RETRIED'))
        deadlock=cab.get('sqlstate')==DEADLOCK_SQLSTATE
        limit=MAX_DEADLOCK_RETRIES if deadlock else 1
        if (row or not statistics_at_closure(run) or not cab.get('execution_finished')
                or not cab.get('admission_snapshot') or cab.get('recovery_state')=='PROTECTED' or retry_count>=limit
                or run.state not in ('WORKING','FINALIZATION_PENDING') or run.suspension
                or Maintenance.objects.filter(state__in=('PREPARED','INSTALLING')).exists()):
            return
        events=Event.objects.filter(run=run,data__attempt=attempt,data__reference=cab['reference'])
        dispatch=events.filter(kind='stage-cab-publication-dispatching').last()
        unknown=events.filter(kind='stage-cab-publication-unknown').last()
        reason='stage-publication-evidence-incomplete'
        if (dispatch and unknown and dispatch.pk<unknown.pk
                and dispatch.data.get('admission_snapshot')==cab['admission_snapshot']
                and unknown.data.get('execution_finished') is True):
            reason='stage-publication-effect-protected'
            if _publication_effects_absent(run,cab,dispatch):
                try:
                    with transaction.atomic():
                        snapshot=_publication_snapshot(run,cab)
                except Exception as error:
                    # Le prévol peut inclure le système de fichiers et des forges indisponibles.
                    reason=error.code if isinstance(error,c.Refused) else type(error).__name__
                else:
                    reason=None if snapshot==cab['admission_snapshot'] else 'stage-publication-proof-divergent'
        if reason:
            _set_publication(run,attempt,'UNKNOWN',error=cab['error'],recovery_state='PROTECTED',recovery_reason=reason)
            return
        retry_count+=1
        reference=f'publication-stage-{attempt}-retry-{retry_count}'
        retry_after=timezone.now().timestamp()+(2**retry_count if deadlock else 0)
        proof={'attempt':attempt,'version':cab['version'],'scope':cab['scope'],'state':'FAILED_NO_EFFECTS',
               'original_event_id':unknown.pk,'original_receipt_digest':c.digest(unknown.data),
               'dispatch_event_id':dispatch.pk,'snapshot':snapshot,'reference':reference,'retry_after':retry_after}
        c.event(run,'stage-cab-publication-reconciled-no-effects',proof)
        original=phase(run,'publication',cab['reference'],'UNKNOWN')
        if original:
            finish_iteration(original,timezone.now(),'admission-reconciled-no-effects',state='UNKNOWN')
        run.configuration={**run.configuration,BOUNDARY:{**run.configuration[BOUNDARY],'publication_ref':reference}}
        _set_publication(run,attempt,'QUEUED',reference=reference,admission_snapshot=None,execution_finished=False,
                         executor=None,error=None,sqlstate=None,recovery_state='RETRIED',recovery_snapshot=snapshot,
                         retry_count=retry_count,retry_after=retry_after,
                         original_receipt_digest=proof['original_receipt_digest'])
        phase(run,'publication',reference,'RUNNING')


def _archive_checks(run):
    from .core.run_lifecycle import archive_state
    protocol=run.configuration[KEY];current=protocol.get('current')
    if not current or current['stage']!=9 or current['cab'].get('state')!='ARCHIVE_WAITING':
        return
    try:
        archive_state(run)
    except c.Refused:
        return
    old='openspec/changes/'+run.change
    if any(path==old or path.startswith(old+'/') for path in run.mandate['paths']):
        return  # Le RUN attend son rattachement d’archive, au périmètre exact.
    revision=c.revision(run)
    ids=[]
    for rule in _plan(run)['checks']:
        prior=Operation.objects.filter(run=run,source_revision=revision,state='COMPLETED',receipt__exit_code=0,
                                       request__argv=rule['argv']).order_by('-pk').first()
        if prior:ids.append(prior.pk)
    if len(ids)!=len(_plan(run)['checks']):
        ids=_start_checks(run,current['attempt'])
    current={**current,'cab':{'state':'ADMITTED','operations':ids}}
    _save(run,{**protocol,'current':current,'active':{**protocol['active'],'9':current}})
    c.event(run,'stage-archive-checks-admitted',{'attempt':current['attempt'],'operations':ids})


def start_queued_publication(run_id):
    from .connector_process import alive, identity
    from .core.models import McpRunBinding, McpThreadBinding, Maintenance
    from .preexisting_git import git_guard
    from .session_delivery import start_delivery

    with git_guard(),transaction.atomic():
        run=Run.objects.select_for_update().get(pk=run_id)
        if run.state not in ('WORKING','FINALIZATION_PENDING') or run.suspension or Maintenance.objects.filter(state__in=('PREPARED','INSTALLING')).exists():
            return
        step=run.configuration[KEY].get('active',{}).get('11')
        if not step or step['cab'].get('state')!='QUEUED' or not c.no_pending(run):
            return
        cab=step['cab']
        if cab.get('retry_after',0)>timezone.now().timestamp():
            return
        prior=GitDelivery.objects.filter(run=run,version=cab['version']).first()
        if prior:
            if _compatible_delivery(prior,cab):
                _set_publication(run,step['attempt'],'ADMITTED',delivery_id=prior.pk)
            else:
                _set_publication(run,step['attempt'],'UNKNOWN',error='stage-publication-source-changed')
            return
        revision=c.revision(run)
        if revision != cab['source_revision']:
            _set_publication(run,step['attempt'],'FAILED',error='stage-publication-source-changed')
            return
        if not Operation.objects.filter(run=run,state='COMPLETED',source_revision=revision,receipt__exit_code=0).exists():
            return
        bindings=[*McpThreadBinding.objects.filter(run=run,thread=run.session_id).select_related('connector'),
                  *McpRunBinding.objects.filter(run=run).select_related('connector')]
        usable={b.connector_id:b.connector for b in bindings if b.connector.actor_id==run.actor_id
                and b.connector.state in ('READY','BUSY') and alive(b.connector.process) and alive(b.connector.worker)}
        if len(usable)!=1:
            return
        if run.actor.agent in ('codex','codex-cli'):
            try:
                source=c.resolve_native(run.actor,run.project,run.session_id,{'codex_home':run.mandate.get('native_source_home','')},run=run)
            except c.Refused as error:
                _set_publication(run,step['attempt'],'FAILED',error=error.code)
                return
            if source!=run.mandate.get('native_source'):
                _set_publication(run,step['attempt'],'FAILED',error='native-source-resume-required')
                return
        # Intent durable avant les appels natifs ; aucune réémission sur un arrêt.
        import threading
        executor=identity(threading.get_native_id())
        if executor is None:
            return
        snapshot=None
        if statistics_at_closure(run):
            try:
                with transaction.atomic():
                    snapshot=_publication_snapshot(run,cab)
            except Exception as error:
                c.event(run,'stage-cab-publication-snapshot-unavailable',{
                    'attempt':step['attempt'],'reference':cab['reference'],
                    'reason':error.code if isinstance(error,c.Refused) else type(error).__name__})
        if cab.get('recovery_state')=='RETRIED' and snapshot!=cab['recovery_snapshot']:
            _set_publication(run,step['attempt'],'UNKNOWN',error='stage-publication-proof-divergent',recovery_state='PROTECTED')
            return
        _set_publication(run,step['attempt'],'DISPATCHING',executor=executor,admission_snapshot=snapshot)
    try:
        start_delivery(run.actor,run,cab['version'],next(iter(usable)),complete=cab['scope']=='project',stage_authorized=True)
    except c.Refused as error:
        state,details=('UNKNOWN' if any(word in error.code for word in ('unknown','uncertain','unconfirmed')) else 'FAILED'),{'error':error.code}
    except Exception as error:
        cause=error.__cause__
        sqlstate=getattr(cause,'sqlstate',None) or getattr(cause,'pgcode',None)
        state,details='UNKNOWN',{'error':'stage-publication-outcome-unconfirmed','failure_type':type(error).__name__}
        if sqlstate==DEADLOCK_SQLSTATE:details['sqlstate']=sqlstate
    else:
        state,details='ADMITTED',{}
    with transaction.atomic():
        current=Run.objects.select_for_update().get(pk=run.pk)
        _set_publication(current,step['attempt'],state,execution_finished=True,**details)


def dispatch():
    pending=Run.objects.filter(state__in=('WORKING','FINALIZATION_PENDING'),
        configuration__stage_protocol__current__cab__state__in=('DISPATCHING','UNKNOWN'))
    for pk in pending.values_list('pk',flat=True):
        _recover_publication(pk)
    for pk in Run.objects.filter(state__in=('WORKING','FINALIZATION_PENDING'),suspension='',
            configuration__stage_protocol__current__cab__state='ARCHIVE_WAITING').values_list('pk',flat=True)[:10]:
        with transaction.atomic():
            _archive_checks(Run.objects.select_for_update().get(pk=pk))
    for pk in Run.objects.filter(state__in=('WORKING','FINALIZATION_PENDING'),
            configuration__stage_protocol__current__cab__state='QUEUED').values_list('pk',flat=True)[:10]:
        start_queued_publication(pk)
