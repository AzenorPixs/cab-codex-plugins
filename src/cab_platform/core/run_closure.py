"""Clôture normale partagée par l'API et le worker CAB."""
import hashlib
from pathlib import Path
from django.db import transaction
from . import commands
from .models import Lease


def close_normal(actor,data,*,automatic=False):
    from .measurements import end_if_open
    candidate=commands.run_scope(actor,data['run_id'],data['project_id'])
    if automatic:
        from .run_lifecycle import normal_valid
        normal_valid(candidate)
    previous=candidate.review.get('closure')
    if previous and previous.get('receipt_id')==data.get('receipt_id'):
        commands.require(previous.get('branch')==data.get('branch'),'closure-receipt-conflict');return previous
    commands.require(commands.no_pending(candidate) and not Lease.objects.filter(run=candidate,state='HELD').exists(),'closure-effects-protected')
    commands.require(data['branch'] in ('TERMINÉ','BLOQUÉ'),'closure-branch-invalid',400)
    if data['branch']=='TERMINÉ':commands.require(candidate.state in ('ACCEPTED','CLOSED'),'final-acceptance-required')
    end_if_open(actor,candidate)
    from . import statistics_service
    statistics_service.sync(candidate.project,'CLOSE-'+commands.identifier(data['receipt_id']),generate=candidate.change)
    candidate.change_record.refresh_from_db()
    source=candidate.change_record.local_sources.filter(present=True).order_by('archived','-path').first()
    commands.require(source is not None and (data['branch']!='TERMINÉ' or source.archived),'closure-archive-required')
    data={**data,'report':source.path+'/STATISTICS.md'}
    candidate_report=commands.safe_path(Path(candidate.project.root),data['report'])
    data['sha256']=hashlib.sha256(candidate_report.read_bytes()).hexdigest()
    commands.require(candidate_report.name=='STATISTICS.md' and candidate.change in candidate_report.parent.name,'closure-report-outside-change')
    commands.require(hashlib.sha256(candidate_report.read_bytes()).hexdigest()==data['sha256'],'closure-report-stale')
    if data['branch']=='BLOQUÉ':commands.require((candidate_report.parent/'BLOCKERS.md').is_file(),'blockers-proof-required')
    with transaction.atomic():
        r=commands.run_scope(actor,data['run_id'],data['project_id'],lock=True)
        commands.require(commands.no_pending(r) and not Lease.objects.filter(run=r,state='HELD').exists(),'closure-effects-protected')
        if automatic:normal_valid(r)
        branch=data['branch'];commands.require(branch in ('TERMINÉ','BLOQUÉ'),'closure-branch-invalid',400)
        if branch=='TERMINÉ':commands.require(r.state in ('ACCEPTED','CLOSED'),'final-acceptance-required')
        report=commands.safe_path(Path(r.project.root),data['report'])
        commands.require(report.name=='STATISTICS.md' and r.change in report.parent.name,'closure-report-outside-change')
        if branch=='BLOQUÉ':commands.require((report.parent/'BLOCKERS.md').is_file(),'blockers-proof-required')
        sha=hashlib.sha256(report.read_bytes()).hexdigest();commands.require(sha==data['sha256'],'closure-report-stale')
        receipt={'receipt_id':commands.identifier(data['receipt_id']),'branch':branch,'report':data['report'],'sha256':sha}
        previous=r.review.get('closure');commands.require(previous is None or previous==receipt,'closure-receipt-conflict')
        r.review['closure']=receipt;r.state='CLOSED' if branch=='TERMINÉ' else 'BLOCKED';r.stage=11 if branch=='TERMINÉ' else r.stage;r.suspension='';r.save();commands.event(r,'run-closed',receipt)
        return receipt
