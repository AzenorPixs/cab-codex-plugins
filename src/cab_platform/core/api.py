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
from .models import Actor,Event,Incident,Lease,Maintenance,Metric,Operation,Project,Run,SessionProjection,Configuration,SystemUpdate

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
    return {'project_id':run.project_id,'run_id':run.run_id,'session_id':run.session_id,'mode':run.mode,'change':run.change,'state':run.state,'suspension':run.suspension,'generation':run.generation,'stage':run.stage,'phase':run.phase or None,'tasks_done':run.change_record.tasks_done if run.change_record else None,'tasks_total':run.change_record.tasks_total if run.change_record else None,'updated':run.updated.isoformat()}

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

@api.post('/projects/{project_id}/refresh')
def refresh_project(request,project_id:str):
    actor=principal(request)
    try:project=Project.objects.get(pk=project_id)
    except Project.DoesNotExist:return api.create_response(request,{'error':'project-not-authorized'},status=403)
    if actor.role!='admin':commands.scope(actor,project)
    from cab_platform.project_metadata import synchronize
    return {'public_metadata':synchronize(project.pk)}

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
    return {'sessions':[run_data(r) for r in Run.objects.filter(project=p,session_archive__isnull=True).order_by('-updated')[:500]]}

@api.get('/closures')
def closure_evaluations(request,project_id:str):
    actor=principal(request);p=Project.objects.get(pk=project_id);commands.scope(actor,p)
    from .run_lifecycle import evaluate
    return {'evaluations':[evaluate(r) for r in Run.objects.filter(project=p).order_by('-updated')[:500]]}

@api.get('/session-archives')
def session_archives(request,project_id:str):
    actor=principal(request);p=Project.objects.get(pk=project_id);commands.scope(actor,p)
    from .models import SessionArchive
    return {'sessions':[{**run_data(row.run),'archived_at':row.created.isoformat(),'archive_request_id':row.request_id} for row in SessionArchive.objects.filter(run__project=p).select_related('run','run__change_record').order_by('-created')[:500]]}

@api.get('/run')
def run_status(request,project_id:str,run_id:str):
    actor=principal(request);r=commands.run_scope(actor,run_id,project_id,owner=False)
    from .monitor import details
    return {**run_data(r),'monitor':details(r),'mandate':r.mandate,'review':r.review,'operations':[operation_data(o) for o in r.operation_set.order_by('pk')[:200]],'exceptions':list(Event.objects.filter(run=r,kind__startswith='exception-').values('id','kind','data','created'))}

@api.get('/operation')
def operation_status(request,project_id:str,run_id:str,request_id:str):
    actor=principal(request);r=commands.run_scope(actor,run_id,project_id,owner=False)
    return operation_data(Operation.objects.get(run=r,request_id=request_id))

@api.get('/connectors/policy')
def connector_policy(request):
    actor=principal(request)
    from cab_platform.paths import config
    from cab_platform.worker_stop import policy
    blocked=Operation.objects.filter(run__actor=actor).exclude(state__in=commands.TERMINAL).exists() or Lease.objects.filter(run__actor=actor,state='HELD').exists() or Maintenance.objects.filter(state__in=['PREPARED','INSTALLING']).exists() or SystemUpdate.objects.filter(actor=actor,state='UNKNOWN').exists()
    return {'mcp_reload':policy(config().get('mcp_reload')),'stop_allowed':not blocked}

@api.get('/finalization')
def finalization_status(request,project_id:str,run_id:str):
    actor=principal(request);run=commands.run_scope(actor,run_id,project_id,owner=False)
    from .models import FinalizationPlan
    from .run_finalization import view
    plan=FinalizationPlan.objects.filter(run=run).first()
    if plan is None:
        from cab_platform.finalization_contract import next_actions
        missing=['finalization-contract-required']
        actions=next_actions(missing,{})
        if run.operation_set.exists() or run.review or run.mandate.get('native_frozen_at') or run.mandate.get('legacy_snapshot_id'):
            actions[0]['blocked_by']=['finalization-adoption-not-safe']
        return {'phase':'LEGACY','missing':missing,'policy':None,'evidence':[],'next_actions':actions}
    return {**view(run,plan),'policy':plan.policy,'evidence':list(run.finalization_evidence.order_by('pk').values('id','source','evidence_id','digest','payload','created')[:200])}

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
    from .measurements import run_statistics
    return run_statistics(actor,r,after)

@api.get('/incidents')
def incidents(request,project_id:str|None=None):
    actor=principal(request);rows=Incident.objects.all() if actor.role=='admin' else Incident.objects.filter(project__in=actor.projects.all())
    if project_id:
        project=Project.objects.get(pk=project_id);commands.scope(actor,project);rows=rows.filter(project=project)
    return {'incidents':list(rows.order_by('created').values('incident_id','category','summary','evidence','state','claim','resolution')[:200])}

@api.get('/updates/availability',auth=None)
def update_availability(request):
    from cab_platform.update_availability import view
    return view()

@api.post('/command')
def command(request,body:Command):
    actor=principal(request);data=body.data;name=body.name
    if name=='connector.heartbeat':
        from .connectors import heartbeat
        return heartbeat(actor,data,getattr(request,'cab_peer',None))
    if name=='connector.stop_report':
        from .connectors import stop_report
        return stop_report(actor,data,getattr(request,'cab_peer',None))
    if name=='connector.disconnected':
        from .connectors import disconnected
        return disconnected(actor,data,getattr(request,'cab_peer',None))
    if name in ('finalization.configure','finalization.revise_check','evidence.producer.register','evidence.producer.disable','evidence.attest'):
        from . import run_evidence
        return {'finalization.configure':run_evidence.configure,'finalization.revise_check':run_evidence.revise_check,'evidence.producer.register':run_evidence.register_producer,'evidence.producer.disable':run_evidence.disable_producer,'evidence.attest':run_evidence.attest}[name](actor,data)
    if name=='system.update.check':
        commands.require(set(data)<={'force'} and type(data.get('force',False)) is bool,'update-fields-invalid',400)
        if data.get('force'):principal(request,admin=True)
        from cab_platform.update_availability import request_check
        return request_check(data.get('force',False))
    if name in ('system.update','system.update.status'):
        commands.require(set(data)<=({'request_id','version'} if name=='system.update' else {'request_id'}),'update-fields-invalid',400)
        from cab_platform import system_updates
        return system_updates.request(actor,data.get('request_id'),data.get('version','')) if name=='system.update' else system_updates.status(actor,data.get('request_id'))
    if name in ('run.reevaluate','session.archive'):
        from . import run_lifecycle
        return run_lifecycle.recheck(actor,data) if name=='run.reevaluate' else run_lifecycle.archive_session(actor,data)
    if name in ('run.inspect_historical','run.close_historical'):
        from . import historical
        return historical.inspect(actor,data) if name=='run.inspect_historical' else historical.close(actor,data)
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
    if name=='run.progress':return commands.progress(actor,data)
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
    if name=='native.locate':return commands.locate_native(actor,data)
    if name=='native.bind':return commands.bind_native(actor,data)
    if name in ('statistics.begin','statistics.end','statistics.change'):
        from . import measurements
        if name=='statistics.change':
            from .statistics_service import read_change
            return read_change(actor,data)
        return measurements.transition(actor,data,name.rsplit('.',1)[1])
    if name in ('statistics.sync','statistics.project'):
        from . import statistics_service
        if name=='statistics.project':return statistics_service.project_status(actor,data)
        project=Project.objects.get(pk=data['project_id']);commands.scope(actor,project)
        request_id=commands.identifier(data['request_id'])
        return statistics_service.sync(project,request_id,generate=data.get('change'),full=data.get('full') is True)
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
        from .measurements import end_if_open
        end_if_open(actor,r)
        from cab_platform.collectors import codex_metrics,opencode_metrics
        if actor.agent=='opencode':opencode_metrics(actor)
        else:codex_metrics(r)
        with transaction.atomic():
            r=Run.objects.select_for_update().get(pk=r.pk);r.mandate['native_frozen_at']=timezone.now().isoformat();r.save();commands.event(r,'native-source-frozen',{})
        from .measurements import run_statistics
        bounded=run_statistics(actor,r)
        return {'frozen_at':r.mandate['native_frozen_at'],'run_id':r.run_id,'metrics':bounded['streams'],'statistics':bounded}
    if name=='run.close':
        from .models import FinalizationPlan
        candidate=commands.run_scope(actor,data['run_id'],data['project_id'])
        plan=FinalizationPlan.objects.filter(run=candidate).exclude(policy={}).first()
        if plan and data.get('branch')=='TERMINÉ':
            from .run_finalization import process
            if plan.receipt:return plan.receipt
            receipt=process(candidate.pk);commands.require(receipt,'finalization-proof-required');return receipt
        from .run_closure import close_normal
        return close_normal(actor,data)
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
