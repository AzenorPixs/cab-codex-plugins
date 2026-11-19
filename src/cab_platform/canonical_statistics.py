"""Rapport maître d'un RUN canonique ; aucun change OpenSpec synthétique."""
from decimal import Decimal
from pathlib import Path
import re
import os
from django.db import transaction
from . import statistics_documents as documents,sgs_engine as engine
from .core import commands as c,measurements
from .core.models import Run,MeasurementPeriod,RunEvidence,Operation,GitFileReservation

KEY='canonical_statistics'

def scope(run) -> dict:
    return {'project_id':run.project_id,'run_id':run.run_id,'session_id':run.session_id,'generation':run.generation,'change':run.change,'actor_id':run.actor_id,'uid':run.actor.uid,'agent':run.actor.agent}

def directory(run) -> str:
    return 'statistics/runs/'+c.digest(scope(run))

def eligible(run) -> bool:
    root=Path(run.project.root)
    if run.change_record.local_sources.exists():return False
    if (root/'openspec/changes'/run.change).exists() or any((root/'openspec/changes/archive').glob('????-??-??-'+run.change)):return False
    if run.finalization_plan.policy.get('nature')!='delivery':return False
    for name in run.mandate.get('paths',[]):
        if re.fullmatch(r'openspec/specs/[^/]+/spec\.md',name) and c.safe_path(root,name,exists=False).is_file():return True
    return False

def owner(project,relative: str):
    if not re.fullmatch(r'statistics/runs/[0-9a-f]{64}/STATISTICS\.md',relative):return None
    for run in Run.objects.filter(project=project,configuration__canonical_statistics__path=relative).select_related('project'):
        record=run.configuration[KEY]
        if relative==directory(run)+'/STATISTICS.md' and record.get('scope')==scope(run):return run
    return None

def check_target(project,relative: str):
    run=owner(project,relative)
    c.require(run is not None,'statistics-target-invalid')
    c.safe_path(Path(project.root),relative,exists=False)
    c.require(not GitFileReservation.objects.filter(project=project,path=relative,active=True).exclude(git_index__session_id=run.coding_session_id).exists(),'statistics-target-reserved')
    return run

@transaction.atomic
def project_record(run,record):
    current=Run.objects.select_for_update().get(pk=run.pk)
    previous=current.configuration.get(KEY,{})
    c.require(not previous or previous.get('scope')==scope(run),'statistics-canonical-scope-divergent')
    current.configuration={**current.configuration,KEY:record};current.save(update_fields=['configuration'])
    run.configuration=current.configuration
    if previous.get('sha256')!=record.get('sha256') or previous.get('state')!=record.get('state'):
        c.event(current,'canonical-statistics-projected',{'scope':scope(run),'path':record['path'],'sha256':record['sha256'],'previous_sha256':previous.get('sha256'),'state':record['state']})

def prepare_directory(run):
    from .native_sources import directory as open_directory
    fd=open_directory(Path(run.project.root))
    try:
        for name in directory(run).split('/'):
            created=False
            try:os.mkdir(name,0o770,dir_fd=fd);created=True
            except FileExistsError:pass
            child=os.open(name,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=fd)
            os.close(fd);fd=child
            if created:
                gid=run.project.owner_gid if run.project.owner_gid is not None else Path(run.project.root).stat().st_gid
                if os.getuid()==0:os.fchown(fd,run.project.owner_uid,gid)
                os.fchmod(fd,0o770)
    finally:os.close(fd)

def contribution(run,proofs):
    periods=list(MeasurementPeriod.objects.filter(run=run).select_related('run','session','change').order_by('pk')[:1001])
    c.require(len(periods)<=1000,'statistics-period-limit')
    bounded=measurements.aggregate(periods);result=engine.blank();result['sessions']=[run.session_id]
    result['agents']=[{'role':'coder','agent':run.actor.agent,'model':'N/A','reasoning':'N/A'}]
    result['proof_ids']=['run-periods:'+c.digest([[p['id'],p['sha256']] for p in bounded['periods']])]
    covered=bool(periods) and bounded['complete'] and periods[0].start_snapshot.get('from_coding_start') is True
    if covered:
        for key,value in bounded['metrics'].items():
            if key in result['metrics']:result['metrics'][key]={'state':value['state'],'value':value['value'],'reason':value['reason'],'evidence':[{'line':1,'note':'Périodes fermées du seul RUN ; empreintes natives.'}]}
        result['bounds']={'start':str(Decimal(str(bounded['started'].timestamp()))),'end':str(Decimal(str(bounded['ended'].timestamp())))}
        for key,value in [('duration',str(Decimal(str((bounded['ended']-bounded['started']).total_seconds())))),('net_duration',bounded['active_seconds'])]:
            result['metrics'][key]={'state':'known','value':value,'reason':None,'evidence':[{'line':1,'note':'Bornes serveur du RUN ; union des périodes.'}]}
    selected={item['id']:item['digest'] for item in proofs};count=0;observed=False;plain_success=True;operations=set()
    rows=list(RunEvidence.objects.filter(run=run,pk__in=selected))
    c.require(len(rows)==len(selected),'statistics-proof-divergent')
    for row in rows:
        c.require(row.digest==selected[row.pk] and row.digest==c.digest(row.payload),'statistics-proof-divergent')
        result['proof_ids'].append('run-evidence:'+str(row.pk)+':'+row.digest)
        if row.source!='cab-operation' or row.payload.get('result')!='passed':continue
        operation=Operation.objects.filter(pk=row.payload.get('operation_id'),run=run,state='COMPLETED').first()
        if not operation or operation.pk in operations:continue
        c.require(operation.receipt.get('exit_code')==0 and operation.receipt_digest==row.payload.get('receipt_digest'),'statistics-proof-divergent')
        operations.add(operation.pk)
        matches=re.findall(r'(?m)^Ran (\d+) tests? in ',operation.receipt.get('output',''))
        if matches:
            count+=sum(map(int,matches));observed=True
            output=operation.receipt.get('output','')
            plain_success=plain_success and len(matches)==1 and output.rstrip().splitlines()[-1]=='OK' and not re.search(r'skipped=|expected failures=|unexpected successes=|^FAILED',output,re.M)
    if observed:
        counts=[('tests',count)]+([('tests_success',count),('tests_failure',0)] if plain_success else [])
        for key,value in counts:result['metrics'][key]={'state':'known','value':str(value),'reason':None,'evidence':[{'line':1,'note':'Reçus unittest sélectionnés du seul RUN, sans doublon ; succès/échecs seulement sur bilan plain OK.'}]}

    partial=[[p['run_id'],p['session_id'],key,value,p['coverage']['state']] for p in bounded['periods'] for key,value in sorted(p['values'].items())] if not covered else []
    return result,partial

def generate(job,run,proofs) -> dict:
    from .core import statistics_service as service
    c.require(run.project_id==job.project_id and run.state=='FINALIZING' and eligible(run),'statistics-canonical-ineligible')
    relative=directory(run)+'/STATISTICS.md';path=Path(run.project.root)/relative
    previous=Run.objects.get(pk=run.pk).configuration.get(KEY,{})
    c.require(not GitFileReservation.objects.filter(project=run.project,path=relative,active=True).exclude(git_index__session_id=run.coding_session_id).exists(),'statistics-target-reserved')
    content=''
    try:content=documents.read_source(Path(run.project.root),path)[0].decode()
    except FileNotFoundError:pass
    c.require(not content or previous.get('scope')==scope(run),'statistics-local-conflict')
    c.require(previous.get('state')!='READY' or bool(content),'statistics-local-conflict')
    c.require(not content or not previous.get('generated_block_sha') or bool(documents.managed(content)),'statistics-local-conflict')
    data,partial=contribution(run,proofs)
    header='# Statistiques de la session — '+run.run_id+'\n\nProjet : `'+run.project_id+'` · RUN : `'+run.run_id+'` · SID : `'+run.session_id+'` · génération : '+str(run.generation)+'\n\n'
    text,override=documents.render(run.change,'finalizing',data,content or header,previous.get('generated_block_sha',''),partial)
    c.require(not override,'statistics-local-conflict')
    text=documents.stamped(text,'run');digest=documents.sha(text.encode())
    record={'scope':scope(run),'path':relative,'state':'PENDING','content':text,'sha256':digest,'generated_block_sha':documents.sha(documents.managed(text).encode()),'structure':documents.parse(text)}
    project_record(run,record);check_target(run.project,relative)
    prepare_directory(run)
    service.write(job,path,text)
    record={**record,'state':'READY'};project_record(run,record)
    return {'path':relative,'sha256':digest,'scope':scope(run)}

def entries(project) -> list:
    result=[]
    for run in Run.objects.filter(project=project,configuration__has_key=KEY).select_related('project','change_record'):
        record=run.configuration[KEY]
        if record.get('state')!='READY' or run.change_record.local_sources.filter(present=True).exists():continue
        relative=record.get('path','');check_target(project,relative)
        try:
            raw,_=documents.read_source(Path(project.root),Path(project.root)/relative)
            text=raw.decode();digest=documents.sha(raw);status='ready'
            if digest!=record.get('sha256'):
                updated={**record,'content':text,'sha256':digest,'structure':documents.parse(text)}
                project_record(run,updated)
        except FileNotFoundError:text='';digest='';status='missing'
        result.append({'change':run.change+' · RUN '+run.run_id,'path':relative,'content':text,'sha256':digest,'status':status})
    return result
