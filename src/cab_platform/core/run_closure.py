"""Clôture normale partagée par l'API et le worker CAB."""
import hashlib
from pathlib import Path
from django.db import transaction
from . import commands
from .models import Lease


def blocker_document(run,dependencies):
    commands.require(isinstance(dependencies,list) and 0<len(dependencies)<=20
                     and all(isinstance(item,str) and 0<len(item.strip())<=500 and len(item.splitlines())==1
                             for item in dependencies),'closure-dependencies-required',400)
    return (f'# Dépendances non satisfaites\n\nRUN : {run.run_id}\n\n'
            + ''.join(f'- {item.strip()}\n' for item in dependencies))


def close_normal(actor,data,*,automatic=False):
    from .measurements import end_if_open
    from .run_lifecycle import active_change,archive_state,guard
    candidate=commands.run_scope(actor,data['run_id'],data['project_id'])
    from cab_platform.stage_protocol import enabled
    commands.require(data.get('branch')!='TERMINÉ' or not enabled(candidate),'stage-use-closure-validation')
    if automatic:
        from .run_lifecycle import normal_valid
        normal_valid(candidate)
    previous=candidate.review.get('closure')
    if previous and previous.get('receipt_id')==data.get('receipt_id'):
        commands.require(previous.get('branch')==data.get('branch'),'closure-receipt-conflict')
        if previous['branch']=='TERMINÉ':archive_state(candidate)
        return previous
    commands.require(not previous,'closure-receipt-conflict')
    commands.require(commands.no_pending(candidate) and not Lease.objects.filter(run=candidate,state='HELD').exists(),'closure-effects-protected')
    commands.require(data['branch'] in ('TERMINÉ','BLOQUÉ'),'closure-branch-invalid',400)
    request_id=commands.identifier(data['receipt_id'])
    blocker=None
    if data['branch']=='TERMINÉ':
        commands.require(candidate.state=='ACCEPTED','final-acceptance-required')
        archive_state(candidate)
    else:
        with transaction.atomic():
            candidate=commands.run_scope(actor,data['run_id'],data['project_id'],lock=True)
            guard(candidate,allow_measurement=True)
            commands.require(not candidate.review.get('closure') and not candidate.suspension
                             and candidate.state in ('WORKING','FINALIZATION_PENDING','REVIEW_PENDING','ACCEPTED','BLOCKING'),
                             'run-not-working')
            active=active_change(candidate)
            commands.require(active.is_dir(),'blockers-active-change-required')
            relative=str((active/'BLOCKERS.md').relative_to(candidate.project.root))
            commands.safe_path(Path(candidate.project.root),relative,exists=False)
            from .models import GitFileReservation
            commands.require(not GitFileReservation.objects.filter(project=candidate.project,path=relative,active=True)
                             .exclude(git_index__session_id=candidate.coding_session_id).exists(),'closure-document-reserved')
            if 'dependencies' in data:
                blocker=(relative,blocker_document(candidate,data['dependencies']))
            else:
                commands.require((active/'BLOCKERS.md').is_file(),'blockers-proof-required')
            fingerprint=commands.digest([request_id,blocker])
            pending=candidate.configuration.get('blocked_closure')
            commands.require(not pending or pending==fingerprint,'closure-receipt-conflict')
            candidate.configuration={**candidate.configuration,'blocked_closure':fingerprint}
            candidate.state='BLOCKING'
            candidate.save(update_fields=['configuration','state','updated'])
    end_if_open(actor,candidate)
    from . import statistics_service
    result=statistics_service.sync(candidate.project,'CLOSE-'+request_id,generate=candidate.change,blocker=blocker)
    commands.require(result['state']=='COMPLETED','closure-statistics-job-unconfirmed')
    candidate.change_record.refresh_from_db()
    source=candidate.change_record.local_sources.filter(present=True).order_by('archived','-path').first()
    commands.require(source is not None and (data['branch']!='TERMINÉ' or source.archived),'closure-archive-required')
    data={**data,'report':source.path+'/STATISTICS.md'}
    candidate_report=commands.safe_path(Path(candidate.project.root),data['report'])
    data['sha256']=hashlib.sha256(candidate_report.read_bytes()).hexdigest()
    commands.require(candidate_report.name=='STATISTICS.md' and candidate.change in candidate_report.parent.name,'closure-report-outside-change')
    commands.require(hashlib.sha256(candidate_report.read_bytes()).hexdigest()==data['sha256'],'closure-report-stale')
    if data['branch']=='BLOQUÉ':commands.require((candidate_report.parent/'BLOCKERS.md').is_file(),'blockers-proof-required')
    from cab_platform.closure_git import complete
    terminal=complete(candidate,data['branch'],source.path)
    if terminal:data={**data,'sha256':terminal['documents'][data['report']]['sha256']}
    with transaction.atomic():
        r=commands.run_scope(actor,data['run_id'],data['project_id'],lock=True)
        commands.require(commands.no_pending(r) and not Lease.objects.filter(run=r,state='HELD').exists(),'closure-effects-protected')
        if automatic:normal_valid(r)
        branch=data['branch'];commands.require(branch in ('TERMINÉ','BLOQUÉ'),'closure-branch-invalid',400)
        if branch=='TERMINÉ':
            commands.require(r.state=='ACCEPTED','final-acceptance-required')
            archive_state(r)
        report=commands.safe_path(Path(r.project.root),data['report'])
        commands.require(report.name=='STATISTICS.md' and r.change in report.parent.name,'closure-report-outside-change')
        if branch=='BLOQUÉ':
            commands.require(r.state=='BLOCKING' and active_change(r)==report.parent,'blockers-active-change-required')
            commands.require((report.parent/'BLOCKERS.md').is_file(),'blockers-proof-required')
        sha=data['sha256'] if terminal else hashlib.sha256(report.read_bytes()).hexdigest();commands.require(sha==data['sha256'],'closure-report-stale')
        receipt={'receipt_id':request_id,'branch':branch,'report':data['report'],'sha256':sha,'terminal_git':terminal}
        if branch=='BLOQUÉ':
            from cab_platform.statistics_documents import read_source
            raw,_=read_source(Path(r.project.root),report.parent/'BLOCKERS.md',1024*1024)
            commands.require(raw.strip(),'blockers-proof-required')
            receipt['blockers']={'path':str((report.parent/'BLOCKERS.md').relative_to(r.project.root)),
                                 'sha256':hashlib.sha256(raw).hexdigest()}
        previous=r.review.get('closure');commands.require(previous is None or previous==receipt,'closure-receipt-conflict')
        r.review['closure']=receipt;r.state='CLOSED' if branch=='TERMINÉ' else 'BLOCKED';r.stage=r.cycle_steps if branch=='TERMINÉ' else r.stage;r.suspension='';r.save();commands.event(r,'run-closed',receipt)
        return receipt
