"""Contrat public OpenAPI. Toutes les mutations délèguent aux commandes."""
import hashlib
import json
import secrets
from pathlib import Path
from typing import Any,Literal
from django.contrib.auth import authenticate,login,logout
from django.db import transaction
from django.http import HttpResponse,JsonResponse
from django.middleware.csrf import CsrfViewMiddleware,get_token
from django.core.exceptions import ObjectDoesNotExist
from django.db import IntegrityError
from django.utils import timezone
from ninja import NinjaAPI,Schema
from ninja.security import HttpBearer,APIKeyHeader,APIKeyCookie
from pydantic import Field
from cab_platform import __version__
from cab_platform import bootstrap
from cab_platform.paths import config
from . import commands
from .auth import principal
from .models import Actor,Event,Incident,Lease,Maintenance,Metric,Operation,Project,Run,SessionProjection,Configuration

class LocalBearer(HttpBearer):
    def authenticate(self,request,token):return principal(request)
class AdministratorKey(APIKeyHeader):
    param_name='X-CAB-Admin'
    def authenticate(self,request,key):
        if key:return principal(request,admin=True)
class WebSession(APIKeyCookie):
    param_name='sessionid'
    def authenticate(self,request,key):
        if key and request.user.is_authenticated:return principal(request)

api=NinjaAPI(title='CAB',version='1.0.0',description='Contrat CAB système ; règles métier Django. Bearer lié au pair Unix, administration locale explicite ou session Web avec CSRF.',auth=[LocalBearer(),AdministratorKey(),WebSession()])
class Command(Schema):
    name:str
    data:dict[str,Any]
class Bootstrap(Schema):
    username:str
    password:str
    database_port:int=5433
class Login(Schema):
    username:str
    password:str
class InterfacePreferences(Schema):
    font_scale:int=Field(ge=80,le=160)
    theme:Literal['light','dark']
class ServiceConfiguration(Schema):
    revision:str
    configuration:dict[str,Any]
class NewProject(Schema):
    name:str
    folder:str
    request_id:str

@api.exception_handler(commands.Refused)
def refused(request,error):return api.create_response(request,{'error':error.code},status=error.status)


def csrf_check(request):
    if getattr(request,'cab_peer',None):return
    checker=CsrfViewMiddleware(lambda req:HttpResponse())
    checker.process_request(request)
    result=checker.process_view(request,lambda *a:None,(),{})
    if result:raise commands.Refused('csrf-required',403)

@api.exception_handler(ObjectDoesNotExist)
def not_found(request,error):return api.create_response(request,{'error':'not-found'},status=404)

@api.exception_handler(IntegrityError)
def conflict(request,error):return api.create_response(request,{'error':'identity-conflict'},status=409)

@api.exception_handler(KeyError)
@api.exception_handler(TypeError)
@api.exception_handler(ValueError)
def invalid_input(request,error):return api.create_response(request,{'error':'command-input-invalid'},status=400)

@api.get('/health',auth=None)
def health(request):return {**bootstrap.status(),'csrf_token':get_token(request)}

@api.get('/interface/preferences',auth=None)
def interface_preferences(request):
    from cab_platform.paths import runtime_config
    initialized=bool(runtime_config().get('initialized'));value={'font_scale':100,'theme':'light'}
    if initialized:
        record=Configuration.objects.filter(pk='interface').first()
        if record:value=InterfacePreferences.model_validate(record.value).model_dump()
    return {**value,'persistent':initialized,'csrf_token':get_token(request)}

@api.post('/interface/preferences',auth=None)
def save_interface_preferences(request,body:InterfacePreferences):
    csrf_check(request)
    from cab_platform.paths import runtime_config
    commands.require(runtime_config().get('initialized'),'initialization-required',503)
    Configuration.objects.update_or_create(pk='interface',defaults={'value':body.model_dump()})
    return {**body.model_dump(),'persistent':True}

@api.get('/administration/agents')
def administration_agents(request):
    principal(request,admin=True)
    from cab_platform.agent_binaries import inventory
    return inventory()

@api.get('/administration/configuration')
def administration_configuration(request):
    principal(request,admin=True)
    from cab_platform.administration import view
    return view()

@api.post('/administration/configuration')
def save_administration_configuration(request,body:ServiceConfiguration):
    principal(request,admin=True)
    from cab_platform.administration import save
    result=save(body.revision,body.configuration)
    if result['logging_reload']:
        import os,signal
        os.kill(os.getppid(),signal.SIGHUP)
    return result

@api.post('/bootstrap',auth=None)
def initialize(request,body:Bootstrap):
    csrf_check(request)
    try:return bootstrap.initialize(body.model_dump(),request.headers.get('X-CAB-Bootstrap',''))
    except bootstrap.BootstrapError as error:return api.create_response(request,{'error':str(error)},status=409)

@api.post('/login',auth=None)
def web_login(request,body:Login):
    csrf_check(request)
    user=authenticate(request,username=body.username,password=body.password)
    if user is None:return api.create_response(request,{'error':'authentication-required'},status=401)
    login(request,user);return {'authenticated':True}

@api.post('/logout')
def web_logout(request):logout(request);return {'authenticated':False}

def run_data(run):
    return {'project_id':run.project_id,'run_id':run.run_id,'session_id':run.session_id,'mode':run.mode,'change':run.change,'state':run.state,'suspension':run.suspension,'generation':run.generation,'updated':run.updated.isoformat()}

def operation_data(op):
    return {'id':op.pk,'request_id':op.request_id,'state':op.state,'receipt':op.receipt or None,'receipt_digest':op.receipt_digest or None,'source_revision':op.source_revision}

@api.get('/projects')
def projects(request):
    actor=principal(request);rows=Project.objects.all() if actor.role=='admin' else actor.projects.all()
    from cab_platform.projects import project_data
    return {'projects':[project_data(p) for p in rows.order_by('name','root')]}

@api.get('/projects/settings')
def projects_settings(request):
    principal(request,admin=True)
    from cab_platform.projects import settings_view
    return settings_view()

@api.post('/projects')
def new_project(request,body:NewProject):
    actor=principal(request,admin=True)
    from cab_platform.projects import create_project,project_data
    project,created=create_project(actor,body.name,body.folder,body.request_id)
    return {**project_data(project),'created':created}

@api.get('/sessions')
def sessions(request,project_id:str):
    actor=principal(request);p=Project.objects.get(pk=project_id)
    if actor.role!='admin':commands.scope(actor,p)
    return {'sessions':[run_data(r) for r in Run.objects.filter(project=p).order_by('-updated')[:500]]}

@api.get('/run')
def run_status(request,project_id:str,run_id:str):
    actor=principal(request);r=commands.run_scope(actor,run_id,project_id,owner=False)
    return {**run_data(r),'mandate':r.mandate,'review':r.review,'operations':[operation_data(o) for o in r.operation_set.order_by('pk')[:200]],'exceptions':list(Event.objects.filter(run=r,kind__startswith='exception-').values('id','kind','data','created'))}

@api.get('/operation')
def operation_status(request,project_id:str,run_id:str,request_id:str):
    actor=principal(request);r=commands.run_scope(actor,run_id,project_id,owner=False)
    return operation_data(Operation.objects.get(run=r,request_id=request_id))

@api.get('/handoff')
def handoff(request,project_id:str,run_id:str,after:int=0):
    actor=principal(request);r=commands.run_scope(actor,run_id,project_id,owner=False)
    commands.require(actor.role=='admin' or actor.pk==r.mandate.get('orchestrator_id') or r.mode=='direct' and r.actor_id==actor.pk,'handoff-authority-required',403)
    rows=list(Event.objects.filter(run=r,id__gt=max(0,after),kind__in=['exception-requested','review-requested','run-closed']).order_by('id').values('id','kind','data')[:100])
    return {'run_id':r.run_id,'state':r.state,'events':rows,'next_after':rows[-1]['id'] if rows else after,'submission':r.review.get('submission') if r.state=='REVIEW_PENDING' else None}

@api.get('/events')
def events(request,project_id:str,after:int=0):
    actor=principal(request);p=Project.objects.get(pk=project_id)
    if actor.role!='admin':commands.scope(actor,p)
    return {'events':list(Event.objects.filter(project=p,id__gt=max(0,after)).order_by('id').values('id','kind','data','created')[:200])}

@api.get('/metrics')
def metrics(request,project_id:str,run_id:str,after:int=0):
    actor=principal(request);r=commands.run_scope(actor,run_id,project_id,owner=False)
    rows=list(Metric.objects.filter(run=r,pk__gt=max(0,after)).order_by('pk').values('id','source','stream','sequence','values','coverage','model')[:200])
    return {'run_id':r.run_id,'streams':rows,'next_after':rows[-1]['id'] if len(rows)==200 else None}

@api.get('/incidents')
def incidents(request,project_id:str|None=None):
    actor=principal(request);rows=Incident.objects.all() if actor.role=='admin' else Incident.objects.filter(project__in=actor.projects.all())
    if project_id:
        project=Project.objects.get(pk=project_id);commands.scope(actor,project);rows=rows.filter(project=project)
    return {'incidents':list(rows.order_by('created').values('incident_id','category','summary','evidence','state','claim','resolution')[:200])}

@api.post('/command')
def command(request,body:Command):
    actor=principal(request);data=body.data;name=body.name
    if name=='project.register':
        p=commands.register_project(actor,data['root']);return {'project_id':p.pk,'root':p.root}
    if name=='actor.enroll':
        principal(request,admin=True)
        uid=int(data['uid']);role=data.get('role','coder');commands.require(role in ('coder','orchestrator','collector','admin'),'actor-role-invalid',400)
        token=secrets.token_urlsafe(48)
        a=Actor.objects.create(pk=commands.identifier(data['id']),uid=uid,role=role,agent=data['agent'],token_hash=hashlib.sha256(token.encode()).hexdigest(),native=data.get('native',{}))
        for key in data.get('projects',[]):a.projects.add(Project.objects.get(pk=key))
        return {'actor_id':a.pk,'token':token}
    if name=='run.begin':return run_data(commands.begin_run(actor,data))
    if name=='run.reconcile_archive':return commands.reconcile_archive(actor,data)
    if name=='run.adopt':
        with transaction.atomic():
            r=commands.run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False)
            commands.require(actor.role in ('admin','orchestrator') and data.get('orchestrator_id')==actor.pk,'adoption-authority-required',403)
            commands.require(r.suspension=='IMPORT_PROTECTED' and data.get('import_sha256')==r.mandate.get('import_sha256'),'adoption-snapshot-divergent')
            commands.require(data['session_id']==r.session_id and data['generation']==r.generation,'adoption-identity-divergent')
            commands.require(commands.no_pending(r) and not Lease.objects.filter(run=r,state='HELD').exists(),'adoption-effects-protected')
            commands.require(data.get('decisions_resolved') is True and data.get('criteria') and data.get('paths'),'adoption-framing-required')
            for path in data['paths']:commands.safe_path(Path(r.project.root),path)
            coder=Actor.objects.get(pk=data['coder_id'],active=True);commands.scope(coder,r.project)
            old={key:r.mandate[key] for key in ['legacy_snapshot_id','legacy_context_id','import_sha256'] if key in r.mandate}
            r.actor=coder;r.mandate={**data,**old,'framing_digest':commands.digest(data)}
            if coder.agent=='opencode':
                from cab_platform.opencode import session
                session(r)
            r.source_revision=commands.revision(r);r.state='WORKING';r.suspension='';r.save();commands.event(r,'legacy-run-adopted',{'session_id':r.session_id,'generation':r.generation})
            return run_data(r)
    if name=='native.bind':
        import os,stat
        r=commands.run_scope(actor,data['run_id'],data['project_id'])
        commands.require(actor.agent=='codex','native-source-agent-unsupported',400)
        path=Path(data['source_file']);commands.require(path.is_absolute() and path.resolve()==path,'native-source-path-invalid',400)
        fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
        with os.fdopen(fd,'r') as stream:
            info=os.fstat(stream.fileno());commands.require(stat.S_ISREG(info.st_mode) and info.st_uid==actor.uid and info.st_nlink==1,'native-source-owner-invalid',403)
            first=stream.readline(65536)
        identity=json.loads(first)
        commands.require(identity.get('type')=='session_meta' and identity.get('payload',{}).get('id')==r.session_id and identity['payload'].get('cwd')==r.project.root,'native-source-identity-divergent')
        with transaction.atomic():
            r=Run.objects.select_for_update().get(pk=r.pk);source={'source_file':str(path),'device':info.st_dev,'inode':info.st_ino,'uid':info.st_uid}
            previous=r.mandate.get('native_source');commands.require(previous is None or previous==source,'native-source-replacement-refused')
            r.mandate['native_source']=source;r.save();commands.event(r,'native-source-bound',{'agent':actor.agent})
        return {'bound':True,'run_id':r.run_id,'session_id':r.session_id}
    if name=='operation.start':
        op,created=commands.start_operation(actor,data);return {**operation_data(op),'created':created}
    if name=='external.describe':
        r=commands.run_scope(actor,data['run_id'],data['project_id']);commands.working(r)
        commands.require(data['profile']['resource_key'] in r.mandate.get('resources',[]),'external-bank-outside-mandate',403)
        from cab_platform.execution import describe
        return describe(r,data['profile'])
    if name=='external.attach':
        r=commands.run_scope(actor,data['run_id'],data['project_id'],owner=False);commands.working(r)
        profile=data['profile']
        framed=any({k:v for k,v in profile.items() if k!='connection_fingerprint'}==allowed for allowed in r.mandate.get('external_profiles',[]))
        commands.require(actor.role in ('admin','orchestrator') and (actor.role=='admin' or actor.pk==r.mandate.get('orchestrator_id')) or r.actor_id==actor.pk and (r.mode=='direct' or framed),'adapter-authority-required',403)
        from cab_platform.execution import describe
        described=describe(r,{k:v for k,v in profile.items() if k!='connection_fingerprint'})['profile']
        commands.require(described==profile,'external-profile-divergent')
        commands.require(profile['resource_key'] in r.mandate.get('resources',[]) and Lease.objects.filter(run=r,resource_id=profile['resource_key'],state='HELD',operation__isnull=True).exists(),'external-bank-required')
        with transaction.atomic():
            r=Run.objects.select_for_update().get(pk=r.pk);adapters=r.mandate.setdefault('external_adapters',{});prior=adapters.get(profile['id'])
            commands.require(prior is None or prior==profile,'adapter-conflict');adapters[profile['id']]=profile;r.save();commands.event(r,'adapter-ready',{'id':profile['id']})
        return {'state':'ADAPTER_READY','adapter_id':profile['id']}
    if name=='run.submit':return commands.submit(actor,data)
    if name=='run.freeze':
        r=commands.run_scope(actor,data['run_id'],data['project_id']);commands.require(commands.no_pending(r),'effects-unresolved')
        if r.mandate.get('native_frozen_at'):return {'frozen_at':r.mandate['native_frozen_at'],'run_id':r.run_id}
        from cab_platform.collectors import codex_metrics,opencode_metrics
        if actor.agent=='opencode':opencode_metrics(actor)
        else:codex_metrics(r)
        with transaction.atomic():
            r=Run.objects.select_for_update().get(pk=r.pk);r.mandate['native_frozen_at']=timezone.now().isoformat();r.save();commands.event(r,'native-source-frozen',{})
        return {'frozen_at':r.mandate['native_frozen_at'],'run_id':r.run_id,'metrics':list(Metric.objects.filter(run=r).values('source','stream','values','coverage','model'))}
    if name=='run.close':
        with transaction.atomic():
            r=commands.run_scope(actor,data['run_id'],data['project_id'],lock=True)
            commands.require(commands.no_pending(r) and not Lease.objects.filter(run=r,state='HELD').exists(),'closure-effects-protected')
            branch=data['branch'];commands.require(branch in ('TERMINÉ','BLOQUÉ'),'closure-branch-invalid',400)
            if branch=='TERMINÉ':commands.require(r.state in ('ACCEPTED','CLOSED'),'final-acceptance-required')
            report=commands.safe_path(Path(r.project.root),data['report'])
            commands.require(report.name=='STATISTICS.md' and r.change in report.parent.name,'closure-report-outside-change')
            if branch=='BLOQUÉ':commands.require((report.parent/'BLOCKERS.md').is_file(),'blockers-proof-required')
            sha=hashlib.sha256(report.read_bytes()).hexdigest();commands.require(sha==data['sha256'],'closure-report-stale')
            receipt={'receipt_id':commands.identifier(data['receipt_id']),'branch':branch,'report':data['report'],'sha256':sha}
            previous=r.review.get('closure');commands.require(previous is None or previous==receipt,'closure-receipt-conflict')
            r.review['closure']=receipt;r.state='CLOSED' if branch=='TERMINÉ' else 'BLOCKED';r.suspension='';r.save();commands.event(r,'run-closed',receipt)
            return receipt
    if name=='run.review':return commands.review(actor,data)
    if name=='run.suspend':return commands.suspend(actor,data)
    if name=='coordinate':return commands.coordinate(actor,data)
    if name=='bank.reserve':return commands.reserve_bank(actor,data)
    if name=='bank.release':return commands.release_bank(actor,data)
    if name=='exception.request':return commands.exception(actor,data)
    if name=='exception.decide':return commands.exception_decision(actor,data)
    if name=='metric.record':
        commands.require(actor.role in ('collector','admin'),'collector-required',403)
        r=commands.run_scope(actor,data['run_id'],data['project_id'],owner=False)
        with transaction.atomic():
            m,created=Metric.objects.select_for_update().get_or_create(run=r,source=data['source'],stream=data['stream'],defaults={'sequence':data['sequence']})
            if not created and data['sequence']<m.sequence:return {'status':'stale'}
            values=data['values'];commands.require(all(isinstance(v,str) and len(v)<80 for v in values.values()),'metrics-invalid',400)
            m.sequence=data['sequence'];m.values=values;m.coverage=data['coverage'];m.model=data.get('model',{});m.save()
        return {'status':'recorded'}
    if name.startswith('incident.'):
        return incident_command(actor,name,data)
    if name.startswith('maintenance.'):
        principal(request,admin=True);return maintenance_command(actor,name,data)
    raise commands.Refused('command-unknown',400)

@transaction.atomic
def incident_command(actor,name,data):
    if name=='incident.report':
        project=Project.objects.get(pk=data['project_id']);commands.scope(actor,project)
        evidence=data.get('evidence',[]);commands.require(evidence and all(isinstance(e,dict) and isinstance(e.get('reference'),str) and len(e['reference'])<=1000 and __import__('re').fullmatch('[a-f0-9]{64}',e.get('sha256','')) for e in evidence),'incident-evidence-invalid',400)
        row,created=Incident.objects.get_or_create(pk=commands.identifier(data['incident_id']),defaults={'project':project,'category':data['category'],'summary':str(data['summary'])[:4000],'evidence':evidence})
        commands.require(created or row.project_id==project.pk and row.summary==data['summary'],'incident-conflict');return {'state':row.state}
    commands.require(actor.role in ('admin','orchestrator'),'incident-owner-required',403)
    row=Incident.objects.select_for_update().get(pk=data['incident_id'])
    if row.project:commands.scope(actor,row.project)
    if name=='incident.claim':
        until=timezone.now().timestamp()+min(max(int(data.get('lease_seconds',900)),60),3600)
        commands.require(row.state in ('OPEN','CLAIMED') and (row.state=='OPEN' or row.claim.get('actor')==actor.pk or row.claim.get('until',0)<timezone.now().timestamp()),'incident-claimed')
        row.state='CLAIMED';row.claim={'actor':actor.pk,'until':until,'id':commands.identifier(data['claim_id'])};row.save();return {'claim':row.claim}
    commands.require(row.claim.get('actor')==actor.pk and row.claim.get('until',0)>timezone.now().timestamp(),'incident-claim-expired')
    if name=='incident.resolve':
        commands.require(data.get('reporter_verified') is True and data.get('evidence'),'incident-return-not-proven')
        row.state='RESOLVED';row.resolution={'actor':actor.pk,'method':str(data['method'])[:4000],'evidence':data['evidence']};row.save();return {'state':row.state}
    if name=='incident.purge':
        commands.require(row.state=='RESOLVED','incident-unresolved');row.delete();return {'status':'PURGED_TREATED'}
    raise commands.Refused('incident-action-invalid',400)

@transaction.atomic
def maintenance_command(actor,name,data):
    key=commands.identifier(data['transaction_id'])
    if name=='maintenance.prepare':
        # Même verrou d’admission que claim_operation : aucune course avec un worker.
        from django.db import connection
        with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_xact_lock(%s)',[300001])
        commands.require(not Operation.objects.filter(state__in=['RUNNING','INTENT']).exists(),'maintenance-boundary-busy')
        commands.require(not Maintenance.objects.exclude(pk=key).filter(state__in=['PREPARED','INSTALLING']).exists(),'maintenance-transaction-conflict')
        row,created=Maintenance.objects.get_or_create(pk=key,defaults={'state':'PREPARED','evidence':data.get('evidence',{})})
        return {'state':row.state,'transaction_id':key}
    row=Maintenance.objects.select_for_update().get(pk=key)
    if name=='maintenance.resume':row.state='COMPLETED';row.save();return {'state':row.state,'transaction_id':key}
    if name=='maintenance.cancel':row.state='CANCELLED';row.save();return {'state':row.state}
    raise commands.Refused('maintenance-action-invalid',400)
