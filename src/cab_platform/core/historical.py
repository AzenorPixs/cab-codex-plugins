"""Clôture documentaire explicite ; aucune acceptation de tests rétroactive."""
import re
from datetime import date
from pathlib import Path
from django.db import transaction
from django.utils import timezone
from cab_platform.statistics_documents import read_source,sha
from . import commands as c,monitor
from .models import Lease,MeasurementPeriod,Operation


def scoped(actor,data,lock=False):
    run=c.run_scope(actor,data['run_id'],data['project_id'],lock=lock,owner=False)
    c.require(actor.pk==run.actor_id or actor.role=='admin','historical-authority-required',403)
    return run


def inspect_run(run,archive: str) -> dict:
    c.require(run.mode=='direct','historical-direct-required')
    c.working(run)
    c.require(c.no_pending(run) and not Lease.objects.filter(run=run,state='HELD').exists(),'historical-effects-protected')
    c.require(not MeasurementPeriod.objects.filter(run=run,ended__isnull=True).exists(),'historical-measurement-open')
    c.require(isinstance(archive,str) and re.fullmatch(r'openspec/changes/archive/\d{4}-\d{2}-\d{2}-'+re.escape(run.change),archive),'historical-archive-invalid',400)
    try:date.fromisoformat(Path(archive).name[:10])
    except ValueError:raise c.Refused('historical-archive-invalid',400) from None
    root=Path(run.project.root)
    active=c.safe_path(root,'openspec/changes/'+run.change,exists=False)
    c.require(not active.exists(),'historical-source-active')
    target=c.safe_path(root,archive)
    candidates=list((root/'openspec/changes/archive').glob('????-??-??-'+run.change))
    c.require(candidates==[target],'historical-archive-ambiguous')
    proofs={}
    try:
        for name in ('proposal.md','tasks.md','review.md','STATISTICS.md'):
            raw,_=read_source(root,target/name,1024*1024 if name!='STATISTICS.md' else 8*1024*1024)
            c.require(raw.strip(),'historical-proof-empty')
            proofs[name]={'path':archive+'/'+name,'sha256':sha(raw)}
    except (OSError,ValueError,UnicodeError) as error:
        raise c.Refused('historical-proof-unavailable') from error
    # L'observateur existant exclut les cases d'exemples dans les blocs de code.
    from types import SimpleNamespace
    observed=monitor.observe_tasks(SimpleNamespace(project=run.project,identifier=run.change,source_path=archive+'/tasks.md'))
    c.require(observed.get('source_state')=='archived' and observed.get('tasks_total',0)>0 and observed['tasks_done']==observed['tasks_total'],'historical-tasks-incomplete')
    c.require(observed['tasks_sha256']==proofs['tasks.md']['sha256'],'historical-proof-changed')
    snapshot={'project_id':run.project_id,'run_id':run.run_id,'session_id':run.session_id,'generation':run.generation,'archive_path':archive,'framing_digest':run.mandate.get('framing_digest'),'review_digest':c.digest(run.review),'tasks_done':observed['tasks_done'],'tasks_total':observed['tasks_total'],'proofs':proofs,'operations':list(Operation.objects.filter(run=run).order_by('pk').values('request_id','state','receipt_digest','dispatched'))}
    return {**snapshot,'evidence_digest':c.digest(snapshot),'kind':'historical','qualification':'documentary-only','tests_replayed':False,'normal_acceptance':False}


def inspect(actor,data) -> dict:
    return inspect_run(scoped(actor,data),data['archive_path'])


@transaction.atomic
def close(actor,data) -> dict:
    run=scoped(actor,data,lock=True)
    receipt_id=c.identifier(data['receipt_id'])
    reason=data.get('reason');authorization=data.get('authorization')
    c.require(isinstance(reason,str) and 10<=len(reason.strip())<=4000,'historical-reason-required',400)
    c.require(isinstance(authorization,str) and 10<=len(authorization.strip())<=2000 and data.get('developer_authorized') is True,'historical-authorization-required',400)
    request={key:data[key] for key in ('archive_path','evidence_digest','reason','authorization','developer_authorized')}
    request_digest=c.digest(request)
    previous=run.review.get('closure')
    if previous:
        c.require(previous.get('kind')=='historical' and previous.get('receipt_id')==receipt_id and previous.get('request_digest')==request_digest,'closure-receipt-conflict')
        return previous
    evidence=inspect_run(run,data['archive_path'])
    c.require(evidence['evidence_digest']==data['evidence_digest'],'historical-evidence-stale')
    receipt={'receipt_id':receipt_id,'kind':'historical','branch':'HISTORIQUE','actor':actor.pk,'at':timezone.now().isoformat(),'authorization':authorization,'reason':reason,'request_digest':request_digest,'evidence':evidence,'normal_acceptance':False,'tests_replayed':False,'limits':['Les preuves de tests et de livraison sont documentaires ; aucun résultat courant reconstruit.']}
    run.review={**run.review,'closure':receipt};run.state='CLOSED';run.stage=11;run.phase='HISTORICAL';run.save(update_fields=['review','state','stage','phase','updated'])
    c.event(run,'run-closed',receipt)
    return receipt
