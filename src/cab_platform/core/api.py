"""Contrat public OpenAPI. Toutes les mutations délèguent aux commandes."""
import hashlib
import json
import secrets
from pathlib import Path
from typing import Any,Literal
from uuid import UUID
from django.contrib.auth import authenticate,login,logout
from django.db import transaction
from django.http import HttpResponse,JsonResponse,StreamingHttpResponse
from django.middleware.csrf import CsrfViewMiddleware,get_token
from django.core.exceptions import ObjectDoesNotExist
from django.db import IntegrityError
from django.utils import timezone
from ninja import NinjaAPI,Schema
from ninja.security import HttpBearer,APIKeyHeader,APIKeyCookie
from pydantic import Field
from cab_platform import __version__
from cab_platform.connector_process import identity,alive
from cab_platform import bootstrap
from cab_platform.paths import config
from . import commands
from .auth import principal
from .models import Actor,Event,Incident,Lease,Maintenance,Metric,Operation,Project,Run,SessionProjection,Configuration,SystemUpdate,McpConnector,InterfacePreferencesProjection

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
class ResponsiveProfile(Schema):
    layout:int=Field(default=100,ge=50,le=150)
    font:int=Field(default=100,ge=50,le=150)
class ResponsiveProfiles(Schema):
    mobile:ResponsiveProfile=Field(default_factory=ResponsiveProfile)
    tablet:ResponsiveProfile=Field(default_factory=ResponsiveProfile)
    hd:ResponsiveProfile=Field(default_factory=ResponsiveProfile)
    fullhd:ResponsiveProfile=Field(default_factory=ResponsiveProfile)
    qhd:ResponsiveProfile=Field(default_factory=ResponsiveProfile)
    uhd:ResponsiveProfile=Field(default_factory=ResponsiveProfile)
class InterfacePreferences(Schema):
    font_scale:int=Field(ge=80,le=160)
    theme:Literal['light','dark']
    responsive:ResponsiveProfiles|None=None
    developer_mode:bool|None=None
    page_responsive:dict[str,dict[str,dict[str,int]]]|None=None
class PageResponsiveAdjustment(Schema):
    page:str=Field(min_length=1,max_length=500)
    profile:Literal['mobile','tablet','hd','fullhd','qhd','uhd']
    field:Literal['layout','font']
    value:int=Field(ge=50,le=150)
class ServiceConfiguration(Schema):
    revision:str
    configuration:dict[str,Any]
class NewProject(Schema):
    name:str
    folder:str
    request_id:str
    project_path:str=''

class ExistingProject(Schema):
    project_path:str

class ProjectConfigurationEdit(Schema):
    fields:dict[str,str]
    revision:str
    project_path:str|None=None

class ForgeEdit(Schema):
    fields:dict[str,str]
    token:str|None=None
    revision:str

class AgentUserRequest(Schema):
    agent:str
    username:str

class AgentUserRemove(Schema):
    agent:str
    id:int

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

class NotificationRead(Schema):
    id:UUID

class NotificationAnswer(NotificationRead):
    choice:str=Field(min_length=1,max_length=100)

@api.get('/notifications')
def notifications_list(request):
    from cab_platform.notifications import administrator,serialize
    from .models import Notification
    administrator(request.auth)
    return {'notifications':[serialize(row) for row in Notification.objects.order_by('created','id')]}

@api.post('/notifications/read')
def notifications_read(request,body:NotificationRead):
    from cab_platform.notifications import read
    return read(request.auth,body.id)

@api.post('/notifications/answer')
def notifications_answer(request,body:NotificationAnswer):
    from cab_platform.notifications import answer
    return answer(request.auth,body.id,body.choice)

@api.get('/health',auth=None)
def health(request):return {**bootstrap.status(),'csrf_token':get_token(request)}

@api.get('/cab-version',auth=None)
def cab_version(request):
    from django.db import DatabaseError
    from .models import CabVersionProjection
    try:row=CabVersionProjection.objects.filter(pk=1).first()
    except DatabaseError:return api.create_response(request,{'error':'version-unavailable'},status=503)
    return {'version':row.version if row else None,'git_version':row.git_version if row else None}

@api.get('/interface/preferences',auth=None)
def interface_preferences(request):
    from cab_platform.paths import runtime_config
    initialized=bool(runtime_config().get('initialized'));value={'font_scale':100,'theme':'light'}
    if initialized:
        record=Configuration.objects.filter(pk='interface').first()
        if record:value=InterfacePreferences.model_validate(record.value).model_dump()
    if value.get('responsive') is None:value['responsive']=ResponsiveProfiles().model_dump()
    if value.get('developer_mode') is None:value['developer_mode']=False
    if value.get('page_responsive') is None:value['page_responsive']={}
    return {**value,'persistent':initialized,'csrf_token':get_token(request)}

@api.post('/interface/preferences',auth=None)
def save_interface_preferences(request,body:InterfacePreferences):
    csrf_check(request)
    from cab_platform.paths import runtime_config
    commands.require(runtime_config().get('initialized'),'initialization-required',503)
    with transaction.atomic():
        record=Configuration.objects.select_for_update().filter(pk='interface').first()
        value=body.model_dump()
        if value['responsive'] is None:
            value['responsive']=(record.value.get('responsive') if record else None) or ResponsiveProfiles().model_dump()
        previous=bool(record.value.get('developer_mode',False)) if record else False
        if value['developer_mode'] is None:value['developer_mode']=previous
        if value['developer_mode']!=previous:principal(request,admin=True)
        value['page_responsive']=(record.value.get('page_responsive') if record else None) or {}
        Configuration.objects.update_or_create(pk='interface',defaults={'value':value})
        InterfacePreferencesProjection.objects.update_or_create(pk=1,defaults={'preferences':value})
    return {**value,'persistent':True}

@api.post('/interface/responsive/page',auth=None)
def save_page_responsive(request,body:PageResponsiveAdjustment):
    csrf_check(request)
    from cab_platform.paths import runtime_config
    commands.require(runtime_config().get('initialized'),'initialization-required',503)
    page=body.page
    commands.require(page.startswith('/') and '?' not in page and '#' not in page and not any(ord(c)<32 for c in page),'interface-page-invalid',400)
    with transaction.atomic():
        record=Configuration.objects.select_for_update().get(pk='interface')
        value=record.value.copy()
        commands.require(value.get('developer_mode') is True,'developer-mode-disabled',403)
        pages=value.get('page_responsive') or {}
        commands.require(page in pages or len(pages)<500,'interface-page-limit',400)
        profile=pages.setdefault(page,{}).setdefault(body.profile,{})
        profile[body.field]=body.value
        value['page_responsive']=pages
        record.value=value;record.save(update_fields=['value'])
        InterfacePreferencesProjection.objects.update_or_create(pk=1,defaults={'preferences':value})
    return {'page':page,'profile':body.profile,'field':body.field,'value':body.value}

@api.get('/administration/agents')
def administration_agents(request):
    principal(request,admin=True)
    from cab_platform.agent_binaries import inventory
    return inventory()

@api.get('/administration/agent-status')
def administration_agent_status(request):
    principal(request,admin=True)
    from .models import Agent
    return {'agents':list(Agent.objects.order_by('position','id').values('id','label','position','installed','running','local_version','mcp_connected','mcp_versions'))}

@api.get('/administration/agent-users')
def administration_agent_users(request,agent:str):
    principal(request,admin=True)
    from cab_platform.agent_users import list_users
    return list_users(agent)

@api.post('/administration/agent-users')
def administration_agent_user_add(request,body:AgentUserRequest):
    principal(request,admin=True)
    from cab_platform.agent_users import register_user
    return register_user(body.agent,body.username)

@api.post('/administration/agent-users/remove')
def administration_agent_user_remove(request,body:AgentUserRemove):
    principal(request,admin=True)
    from cab_platform.agent_users import remove_user
    return remove_user(body.agent,body.id)

class AgentReconcileRequest(Schema):
    agent:str

@api.post('/administration/agent-users/reconcile')
def administration_agent_users_reconcile(request,body:AgentReconcileRequest):
    principal(request,admin=True)
    from cab_platform.agent_users import request_reconciliation
    return request_reconciliation(body.agent)

@api.get('/administration/agent-config-preview')
def administration_agent_config_preview(request,agent:str,id:int):
    principal(request,admin=True)
    from django.http import JsonResponse
    from cab_platform.agent_config_view import read_configuration
    response=JsonResponse({'content':read_configuration(agent,id)})
    response['Cache-Control']='private, no-store'
    response['X-Content-Type-Options']='nosniff'
    return response

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
    resolution=Event.objects.filter(run=op.run,kind='operation-reconciled-stopped',data__operation_id=op.pk).order_by('-pk').first()
    return {'id':op.pk,'request_id':op.request_id,'state':op.state,'receipt':op.receipt or None,'receipt_digest':op.receipt_digest or None,'source_revision':op.source_revision,'reconciliation':resolution.data['receipt'] if resolution else None}

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

@api.get('/projects/browse')
def browse_project_directories(request,path:str=''):
    principal(request,admin=True)
    from cab_platform.projects import browse_directories
    return browse_directories(path)

@api.post('/projects/import')
def add_existing_project(request,body:ExistingProject):
    actor=principal(request,admin=True)
    from cab_platform.projects import add_existing_project,project_data
    project,created=add_existing_project(actor,body.project_path)
    return {**project_data(project),'created':created}

@api.get('/projects/{project_id}/git/files/{kind}')
def project_git_files(request,project_id:str,kind:str):
    actor=principal(request)
    try:project=Project.objects.get(pk=project_id)
    except Project.DoesNotExist:return api.create_response(request,{'error':'project-not-authorized'},status=403)
    if actor.role!='admin':commands.scope(actor,project)
    from cab_platform.project_git import files_overview
    return files_overview(project,kind)

@api.get('/projects/{project_id}/git/branches')
def project_git_branches(request,project_id:str):
    actor=principal(request)
    try:project=Project.objects.get(pk=project_id)
    except Project.DoesNotExist:return api.create_response(request,{'error':'project-not-authorized'},status=403)
    if actor.role!='admin':commands.scope(actor,project)
    from cab_platform.project_git import branches_overview
    return branches_overview(project)

@api.get('/projects/{project_id}/forges/{forge}/commit/{commit}')
def project_forge_commit(request,project_id:str,forge:str,commit:str):
    actor=principal(request)
    try:project=Project.objects.get(pk=project_id)
    except Project.DoesNotExist:return api.create_response(request,{'error':'project-not-authorized'},status=403)
    if actor.role!='admin':commands.scope(actor,project)
    from cab_platform.forge_repository import commit_details
    return commit_details(project,forge.upper(),commit)

@api.get('/projects/{project_id}/forges/{forge}/comparison')
def project_forge_comparison(request,project_id:str,forge:str):
    actor=principal(request)
    try:project=Project.objects.get(pk=project_id)
    except Project.DoesNotExist:return api.create_response(request,{'error':'project-not-authorized'},status=403)
    if actor.role!='admin':commands.scope(actor,project)
    from cab_platform.forge_comparison import details
    return details(project,forge.upper())

@api.get('/projects/{project_id}/git/commit-removal')
def preview_git_commit_removal(request,project_id:str):
    principal(request,admin=True)
    from cab_platform.git_commit_remove import inspect
    return inspect(Project.objects.get(pk=project_id))

class GitCommitRemoval(Schema):
    expected_head:str
    expected_parent:str
    expected_branch:str
    mode:Literal['keep','discard']
    expected_status:str=''

@api.get('/projects/{project_id}/git/commit-removal/details')
def git_commit_removal_details(request,project_id:str,expected_head:str,expected_parent:str,expected_branch:str):
    principal(request,admin=True)
    from cab_platform.git_commit_remove import restoration_plan
    return restoration_plan(Project.objects.get(pk=project_id),expected_head,expected_parent,expected_branch)

@api.post('/projects/{project_id}/git/commit-removal')
def remove_git_commit(request,project_id:str,body:GitCommitRemoval):
    principal(request,admin=True)
    from cab_platform.git_commit_remove import remove
    return remove(project_id,body.expected_head,body.expected_parent,body.expected_branch,body.mode,body.expected_status)

@api.get('/projects/{project_id}/git/tag')
def read_project_git_tag(request,project_id:str,name:str):
    actor=principal(request)
    try:project=Project.objects.get(pk=project_id)
    except Project.DoesNotExist:return api.create_response(request,{'error':'project-not-authorized'},status=403)
    if actor.role!='admin':commands.scope(actor,project)
    from cab_platform.git_tag_edit import read_tag
    return read_tag(project,name)

class GitTagEditInput(Schema):
    name:str
    new_name:str
    description:str
    expected_oid:str
    expected_commit:str

class GitTagCreateInput(Schema):
    name:str
    description:str
    expected_commit:str

@api.post('/projects/{project_id}/git/tag/create')
def create_project_git_tag(request,project_id:str,body:GitTagCreateInput):
    principal(request,admin=True)
    from cab_platform.git_tag_edit import create_tag
    return create_tag(project_id,body.name,body.description,body.expected_commit)

@api.post('/projects/{project_id}/git/tag')
def edit_project_git_tag(request,project_id:str,body:GitTagEditInput):
    principal(request,admin=True)
    from cab_platform.git_tag_edit import edit_tag
    return edit_tag(project_id,body.name,body.new_name,body.description,body.expected_oid,body.expected_commit)

class GitStageModifiedInput(Schema):
    digest:str

@api.get('/projects/{project_id}/git/stage-modified')
def preview_stage_modified(request,project_id:str):
    principal(request,admin=True)
    from cab_platform.git_stage_modified import describe
    return describe(Project.objects.get(pk=project_id))

@api.post('/projects/{project_id}/git/stage-modified')
def stage_modified(request,project_id:str,body:GitStageModifiedInput):
    principal(request,admin=True)
    from cab_platform.git_stage_modified import stage
    return stage(project_id,body.digest)

@api.get('/projects/{project_id}/git/changes')
def project_git_changes(request,project_id:str):
    actor=principal(request)
    try:project=Project.objects.get(pk=project_id)
    except Project.DoesNotExist:return api.create_response(request,{'error':'project-not-authorized'},status=403)
    if actor.role!='admin':commands.scope(actor,project)
    from cab_platform.project_git import changes_overview
    return changes_overview(project)

@api.get('/projects/{project_id}/git/history')
def project_git_history(request,project_id:str,page:int=1,head:str='',search:str=''):
    actor=principal(request)
    try:project=Project.objects.get(pk=project_id)
    except Project.DoesNotExist:return api.create_response(request,{'error':'project-not-authorized'},status=403)
    if actor.role!='admin':commands.scope(actor,project)
    from cab_platform.project_git import commit_history
    return commit_history(project,page,head,search)

class GitHistoryRemoval(Schema):
    expected_head:str
    commits:list[str]

@api.post('/projects/{project_id}/git/history/remove')
def project_git_history_remove(request,project_id:str,body:GitHistoryRemoval):
    principal(request,admin=True)
    from cab_platform.git_history_remove import remove_selected
    return remove_selected(project_id,body.expected_head,body.commits)

class GitCommitMetadataInput(Schema):
    request_id:str
    commit:str
    expected_head:str
    expected_branch:str
    refs_digest:str
    author:str
    email:str
    date:str
    message:str
    tag_name:str=''
    new_tag:str=''
    tag_description:str=''

@api.get('/projects/{project_id}/git/history/commit/{commit}/metadata')
def project_git_commit_metadata(request,project_id:str,commit:str,head:str=''):
    principal(request,admin=True)
    from cab_platform.git_commit_metadata import preview
    return preview(Project.objects.get(pk=project_id),commit,head)

@api.post('/projects/{project_id}/git/history/commit-metadata')
def project_git_edit_commit_metadata(request,project_id:str,body:GitCommitMetadataInput):
    principal(request,admin=True)
    from cab_platform.git_commit_metadata import edit
    return edit(project_id,body.model_dump())

@api.get('/projects/{project_id}/git/history/commit/{commit}')
def project_git_history_commit(request,project_id:str,commit:str,head:str):
    actor=principal(request)
    try:project=Project.objects.get(pk=project_id)
    except Project.DoesNotExist:return api.create_response(request,{'error':'project-not-authorized'},status=403)
    if actor.role!='admin':commands.scope(actor,project)
    from cab_platform.project_git import commit_overview
    return commit_overview(project,commit,head)

@api.get('/projects/{project_id}/git/commit/{commit}')
def project_git_commit(request,project_id:str,commit:str):
    actor=principal(request)
    try:project=Project.objects.get(pk=project_id)
    except Project.DoesNotExist:return api.create_response(request,{'error':'project-not-authorized'},status=403)
    if actor.role!='admin':commands.scope(actor,project)
    from cab_platform.project_git import commit_overview
    return commit_overview(project,commit)

class GitMonitorSettings(Schema):
    quiet_seconds:int
    interval_seconds:int
    maximum_seconds:int
    forge_auto_interval_minutes:int=60

@api.get('/administration/git')
def git_monitor_settings(request):
    principal(request,admin=True)
    from cab_platform.git_monitor_config import read
    return read()

@api.post('/administration/git')
def save_git_monitor_settings(request,body:GitMonitorSettings):
    principal(request,admin=True)
    from cab_platform.git_monitor_config import save
    return save(body.model_dump())

@api.post('/projects/{project_id}/git/status/refresh/manual')
def refresh_project_git_status_manually(request,project_id:str):
    actor=principal(request)
    try:project=Project.objects.get(pk=project_id)
    except Project.DoesNotExist:return api.create_response(request,{'error':'project-not-authorized'},status=403)
    if actor.role!='admin':commands.scope(actor,project)
    from cab_platform.project_git import refresh_status
    return {'git_status':refresh_status(project.pk,manual=True)}

@api.post('/projects/{project_id}/git/status/refresh')
def refresh_project_git_status(request,project_id:str):
    actor=principal(request)
    try:project=Project.objects.get(pk=project_id)
    except Project.DoesNotExist:return api.create_response(request,{'error':'project-not-authorized'},status=403)
    if actor.role!='admin':commands.scope(actor,project)
    from cab_platform.project_git import refresh_status
    return {'git_status':refresh_status(project.pk)}

class GitCommitInput(Schema):
    author:str|None = None
    email:str|None = None
    date:str|None = None
    tag_description:str|None = None
    tag:str|None = None
    description:str = ''
    expected_tag:str = ''
    request_id:str = ''

@api.post('/projects/{project_id}/git/commit')
def commit_project_git(request,project_id:str,body:GitCommitInput):
    principal(request,admin=True)
    from cab_platform.project_git import commit_local,commit_progress
    try:
        return commit_local(project_id,body.tag,body.description,body.expected_tag,body.request_id,author=body.author,email=body.email,date=body.date,tag_description=body.tag_description)
    except Exception:
        if body.request_id and len(body.request_id)<=80 and all(c in '0123456789abcdef-' for c in body.request_id):
            commit_progress(project_id,body.request_id,'failed')
        raise

@api.post('/projects/{project_id}/git/commit-stream')
def stream_project_git_commit(request,project_id:str,body:GitCommitInput):
    principal(request,admin=True)
    import asyncio
    import threading
    from django.db import close_old_connections
    from cab_platform.project_git import commit_local,commit_progress
    async def events():
        loop = asyncio.get_running_loop()
        queue = asyncio.Queue()
        def send(event):
            try:
                loop.call_soon_threadsafe(queue.put_nowait,event)
            except RuntimeError:
                pass
        def work():
            emitted = 0
            truncated = False
            def output(text):
                nonlocal emitted,truncated
                remaining = 1048576 - emitted
                if remaining > 0:
                    part = text[:remaining]
                    emitted += len(part)
                    if part:send({'type':'output','text':part})
                if len(text) > remaining and not truncated:
                    truncated = True
                    send({'type':'output','text':'\n[Sortie limitée à 1 Mio.]\n'})
            try:
                result=commit_local(project_id,body.tag,body.description,body.expected_tag,body.request_id,output,author=body.author,email=body.email,date=body.date,tag_description=body.tag_description)
                send({'type':'result','result':result})
            except commands.Refused as error:
                if body.request_id and len(body.request_id)<=80 and all(c in '0123456789abcdef-' for c in body.request_id):
                    try:commit_progress(project_id,body.request_id,'failed')
                    except Exception:pass
                send({'type':'error','error':error.code})
            except Exception:
                if body.request_id and len(body.request_id)<=80 and all(c in '0123456789abcdef-' for c in body.request_id):
                    try:commit_progress(project_id,body.request_id,'failed')
                    except Exception:pass
                send({'type':'error','error':'project-git-commit-uncertain'})
            finally:
                close_old_connections()
                send({'type':'end'})
        threading.Thread(target=work,daemon=True,name='cab-git-commit-stream').start()
        while True:
            event=await queue.get()
            yield (json.dumps(event,ensure_ascii=False)+'\n').encode('utf-8')
            if event['type']=='end':break
    response=StreamingHttpResponse(events(),content_type='application/x-ndjson; charset=utf-8')
    response['Cache-Control']='no-store'
    response['X-Accel-Buffering']='no'
    return response

@api.post('/projects/{project_id}/git/clean')
def clean_project_git(request,project_id:str):
    principal(request,admin=True)
    from cab_platform.project_git import clean_packed_objects
    return {'git_status':clean_packed_objects(project_id)}

@api.post('/projects/{project_id}/git/initialize')
def initialize_project_git(request,project_id:str):
    principal(request,admin=True)
    from cab_platform.project_git import initialize
    return initialize(project_id)

@api.post('/projects/{project_id}/refresh')
def refresh_project(request,project_id:str,include_forges:bool=True,include_git:bool=True):
    actor=principal(request)
    try:project=Project.objects.get(pk=project_id)
    except Project.DoesNotExist:return api.create_response(request,{'error':'project-not-authorized'},status=403)
    if actor.role!='admin':commands.scope(actor,project)
    from cab_platform.project_metadata import synchronize
    return {'public_metadata':synchronize(project.pk,include_forges=include_forges,include_git=include_git)}

@api.get('/projects/{project_id}/configuration')
def project_configuration_read(request,project_id:str):
    principal(request,admin=True)
    from cab_platform.forge_settings import file_operation
    from cab_platform.project_configuration_edit import FIELDS
    from cab_platform.project_metadata import synchronize
    from cab_platform.paths import secret
    import hmac
    project=Project.objects.get(pk=project_id);before=file_operation(project,{'op':'env-read'});snapshot=synchronize(project.pk);env=file_operation(project,{'op':'env-read'})
    commands.require(before['digest']==env['digest'],'project-configuration-changed',409)
    commands.require(Project.objects.filter(pk=project.pk,root=project.root).exists(),'project-configuration-changed',409)
    revision=hmac.new(secret('django-secret').encode(),(project.root+'\0'+env['digest']).encode(),hashlib.sha256).hexdigest()
    response=JsonResponse({'fields':{key:snapshot.get('values',{}).get(key,'') for key in FIELDS},'project_path':project.root,'revision':revision})
    response['Cache-Control']='no-store';return response

@api.post('/projects/{project_id}/configuration')
def project_configuration_save(request,project_id:str,body:ProjectConfigurationEdit):
    principal(request,admin=True)
    from cab_platform.forge_settings import file_operation
    from cab_platform.project_configuration_edit import edit
    from cab_platform.paths import secret
    import hmac
    project=Project.objects.get(pk=project_id);env=file_operation(project,{'op':'env-read'})
    expected=hmac.new(secret('django-secret').encode(),(project.root+'\0'+env['digest']).encode(),hashlib.sha256).hexdigest()
    commands.require(hmac.compare_digest(expected,body.revision),'project-configuration-changed',409)
    return edit(project.pk,body.fields,env['digest'],body.project_path)

@api.post('/projects/{project_id}/forges/authenticate')
def forge_authenticate(request,project_id:str):
    actor=principal(request)
    project=Project.objects.get(pk=project_id)
    if actor.role!='admin':commands.scope(actor,project)
    from cab_platform.forge_auth import enqueue
    enqueue(project.pk)
    return {'queued':True}

@api.post('/projects/{project_id}/forges/repositories/refresh')
def refresh_forge_repositories(request,project_id:str):
    actor=principal(request)
    project=Project.objects.get(pk=project_id)
    if actor.role!='admin':commands.scope(actor,project)
    from cab_platform.forge_repository import enqueue
    enqueue(project.pk)
    return {'queued':True}

@api.post('/projects/{project_id}/forges/{forge}/authenticate-stream')
def stream_forge_authentication(request,project_id:str,forge:str):
    actor=principal(request)
    try:project=Project.objects.get(pk=project_id)
    except Project.DoesNotExist:return api.create_response(request,{'error':'project-not-authorized'},status=403)
    if actor.role!='admin':commands.scope(actor,project)
    from cab_platform.forge_repository import FORGES
    forge=forge.upper()
    commands.require(forge in FORGES,'forge-refresh-invalid',400)
    import asyncio
    import threading
    from django.db import close_old_connections
    from cab_platform.forge_auth import refresh_one
    async def events():
        loop=asyncio.get_running_loop()
        queue=asyncio.Queue()
        def send(event):
            try:loop.call_soon_threadsafe(queue.put_nowait,event)
            except RuntimeError:pass
        def work():
            def report(message):send({'type':'output','text':message})
            try:
                state=refresh_one(project.pk,forge,managed=False,report=report)
                report('Authentification réussie.\n' if state is True else 'Authentification échouée.\n' if state is False else 'Authentification non vérifiée.\n')
                send({'type':'result','result':{'state':state}})
            except Exception:
                report('La vérification a échoué avant sa conclusion.\n')
                send({'type':'error','error':'forge-auth-diagnostic-failed'})
            finally:
                close_old_connections()
                send({'type':'end'})
        threading.Thread(target=work,daemon=True,name='cab-forge-auth-stream').start()
        while True:
            event=await queue.get()
            yield (json.dumps(event,ensure_ascii=False)+'\n').encode('utf-8')
            if event['type']=='end':break
    response=StreamingHttpResponse(events(),content_type='application/x-ndjson; charset=utf-8')
    response['Cache-Control']='no-store'
    response['X-Accel-Buffering']='no'
    return response

class ForgePushInput(Schema):
    nonce:str

@api.post('/projects/{project_id}/forges/{forge}/push-prepare')
def prepare_forge_push(request,project_id:str,forge:str):
    actor=principal(request,admin=True)
    from cab_platform.forge_push import prepare
    return prepare(project_id,forge.upper(),actor.pk)

@api.post('/projects/{project_id}/forges/{forge}/push')
def execute_forge_push(request,project_id:str,forge:str,body:ForgePushInput):
    actor=principal(request,admin=True)
    from cab_platform.forge_push import execute
    return execute(project_id,forge.upper(),actor.pk,body.nonce)

@api.post('/projects/{project_id}/forges/{forge}/sync-prepare')
def prepare_forge_sync(request,project_id:str,forge:str):
    actor=principal(request,admin=True)
    from cab_platform.forge_sync import prepare
    return prepare(project_id,forge.upper(),actor.pk)

@api.post('/projects/{project_id}/forges/{forge}/sync')
def execute_forge_sync(request,project_id:str,forge:str,body:ForgePushInput):
    actor=principal(request,admin=True)
    from cab_platform.forge_sync import execute
    return execute(project_id,forge.upper(),actor.pk,body.nonce)

@api.post('/projects/{project_id}/forges/{forge}/refresh')
def refresh_one_forge(request,project_id:str,forge:str,automatic:bool=False):
    actor=principal(request)
    try:project=Project.objects.get(pk=project_id)
    except Project.DoesNotExist:return api.create_response(request,{'error':'project-not-authorized'},status=403)
    if actor.role!='admin':commands.scope(actor,project)
    from cab_platform.forge_repository import FORGES,refresh_one
    forge=forge.upper()
    commands.require(forge in FORGES,'forge-refresh-invalid',400)
    return {'available':bool(refresh_one(project.pk,forge,wait=True,managed=False,automatic=automatic))}

@api.get('/projects/{project_id}/forges/{forge}')
def forge_read(request,project_id:str,forge:str):
    principal(request,admin=True)
    from cab_platform.forge_settings import file_operation,token_read,validate_forge
    from cab_platform.project_metadata import synchronize
    from cab_platform.paths import secret
    import hmac
    validate_forge(forge);project=Project.objects.get(pk=project_id)
    snapshot=synchronize(project.pk);env=file_operation(project,{'op':'env-read'})
    value=token_read(project,forge)
    revision=hmac.new(secret('django-secret').encode(),(env['digest']+'\0'+(value or '')).encode(),hashlib.sha256).hexdigest()
    response=JsonResponse({'fields':{k:v for k,v in snapshot.get('values',{}).items() if k.startswith('REMOTE_'+forge+'_')},'token':value or '', 'revision':revision})
    response['Cache-Control']='no-store';return response

@api.post('/projects/{project_id}/forges/{forge}')
def forge_save(request,project_id:str,forge:str,body:ForgeEdit):
    principal(request,admin=True)
    from cab_platform.forge_settings import edit_values,file_operation,token_read,validate_forge,synchronize_tokens
    from cab_platform.project_metadata import synchronize
    from cab_platform.paths import secret
    import hmac
    validate_forge(forge);project=Project.objects.get(pk=project_id)
    env=file_operation(project,{'op':'env-read'})
    current_token=token_read(project,forge)
    expected=hmac.new(secret('django-secret').encode(),(env['digest']+'\0'+(current_token or '')).encode(),hashlib.sha256).hexdigest()
    commands.require(hmac.compare_digest(expected,body.revision),'forge-file-changed',409)
    edit_values(project,forge,body.fields,body.token,env['digest'])
    try:
        with transaction.atomic():synchronize_tokens(Project.objects.select_for_update().get(pk=project.pk))
        synchronize(project.pk)
    except commands.Refused:raise commands.Refused('forge-file-outcome-uncertain',409) from None
    return {'saved':True}

@api.post('/projects')
def new_project(request,body:NewProject):
    actor=principal(request,admin=True)
    from cab_platform.projects import create_project,project_data
    project,created=create_project(actor,body.name,body.folder,body.request_id,body.project_path)
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
def session_archives(request,project_id:str='',page:int=1):
    from cab_platform.archive_listing import archive_page
    rows,pagination=archive_page(principal(request),project_id,page)
    return {'sessions':[{**run_data(row.run),'archived_at':row.created.isoformat(),'archive_request_id':row.request_id} for row in rows],**pagination}

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
def connector_policy(request,connector_id:str='',version:str=''):
    actor=principal(request)
    from cab_platform.paths import config
    from cab_platform.worker_stop import policy
    blocked=Operation.objects.filter(run__actor=actor).exclude(state__in=commands.TERMINAL).exists() or Lease.objects.filter(run__actor=actor,state='HELD').exists() or Maintenance.objects.filter(state__in=['PREPARED','INSTALLING']).exists() or SystemUpdate.objects.filter(actor=actor,state='UNKNOWN').exists()
    native={'mode':'fallback','reason':'native-control-not-registered'}
    peer=getattr(request,'cab_peer',None)
    rows=McpConnector.objects.filter(actor=actor)
    row=rows.filter(pk=connector_id).first() if connector_id else next((r for r in rows if peer and r.process==identity(peer['pid'])),None)
    if row:
        from .native_control import gate
        target=version or __version__
        native={'mode':'wait-native','reason':'native-control-effects-protected'} if blocked else gate(actor,row,target)
        if native['mode']=='fallback' and row.loaded_version==target and row.catalog_version!=target and row.state=='CATALOG_PENDING' and alive(row.worker):
            native={'mode':'wait-native','reason':'catalog-refresh-required'}
    return {'mcp_reload':policy(config().get('mcp_reload')),'stop_allowed':not blocked and native['mode']=='fallback','native_control':native}

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

@api.get('/projects/{project_id}/incidents')
def project_incident_registry(request,project_id:str,page:int=1,page_size:int=25):
    from .project_incidents import project_incidents
    return project_incidents(request,project_id,page,page_size)

class IncidentPurgeRequest(Schema):
    expected_revision:str

@api.post('/projects/{project_id}/incidents/{incident_id}/purge')
def project_incident_purge(request,project_id:str,incident_id:str,payload:IncidentPurgeRequest):
    from .project_incidents import purge_project_incident
    return purge_project_incident(request,project_id,incident_id,payload.expected_revision)

@api.get('/incidents')
def incidents(request,project_id:str|None=None):
    actor=principal(request);rows=Incident.objects.all() if actor.role=='admin' else Incident.objects.filter(project__in=actor.projects.all())
    if project_id:
        project=Project.objects.get(pk=project_id);commands.scope(actor,project);rows=rows.filter(project=project)
    values=list(rows.order_by('created').values('incident_id','category','summary','evidence','state','claim','resolution')[:200])
    return {'incidents':values,'snapshot_digest':commands.digest(values),'total':rows.count()}

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
    if name in ('native.control.configure','native.control.reload','native.control.status'):
        from . import native_control
        return {'native.control.configure':native_control.configure,'native.control.reload':native_control.request,'native.control.status':native_control.status}[name](actor,data)
    if name=='connector.native_reload':
        from .native_control import request_connector
        return request_connector(actor,data,getattr(request,'cab_peer',None))
    if name=='finalization.contest_check':
        principal(request,admin=True)
        from .run_evidence import contest_check
        return contest_check(actor,data)
    if name in ('finalization.configure','finalization.revise_check','finalization.retarget_release','evidence.producer.register','evidence.producer.disable','evidence.attest'):
        from . import run_evidence
        return {'finalization.configure':run_evidence.configure,'finalization.revise_check':run_evidence.revise_check,'finalization.retarget_release':run_evidence.retarget_release,'evidence.producer.register':run_evidence.register_producer,'evidence.producer.disable':run_evidence.disable_producer,'evidence.attest':run_evidence.attest}[name](actor,data)
    if name=='system.update.check':
        commands.require(set(data)<={'force'} and type(data.get('force',False)) is bool,'update-fields-invalid',400)
        if data.get('force'):principal(request,admin=True)
        from cab_platform.update_availability import request_check
        return request_check(data.get('force',False))
    if name=='system.update.confirm_disconnected':
        principal(request,admin=True)
        from cab_platform import system_updates
        return system_updates.confirm_disconnected(actor,data)
    if name in ('system.update','system.update.status'):
        commands.require(set(data)<=({'request_id','version'} if name=='system.update' else {'request_id'}),'update-fields-invalid',400)
        from cab_platform import system_updates
        return system_updates.request(actor,data.get('request_id'),data.get('version',''),peer=getattr(request,'cab_peer',None)) if name=='system.update' else system_updates.status(actor,data.get('request_id'))
    if name=='operation.reconcile_stopped':
        from .operation_recovery import reconcile_stopped
        return reconcile_stopped(actor,data)
    if name=='session.retire_technical':
        from .session_cleanup import retire_technical
        return retire_technical(actor,data)
    if name in ('session.delete_preview','session.delete'):
        from .session_cleanup import deletion_preview,delete
        return deletion_preview(actor,data) if name=='session.delete_preview' else delete(actor,data)
    if name in ('run.reevaluate','session.archive'):
        from . import run_lifecycle
        return run_lifecycle.recheck(actor,data) if name=='run.reevaluate' else run_lifecycle.archive_session(actor,data)
    if name in ('run.inspect_historical','run.close_historical'):
        from . import historical
        return historical.inspect(actor,data) if name=='run.inspect_historical' else historical.close(actor,data)
    if name=='project.register':
        p=commands.register_project(actor,data['root'])
        from cab_platform.session_delivery import ensure_delivery_producer
        return {'project_id':p.pk,'root':p.root,'delivery_producer':ensure_delivery_producer(p)}
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
    if name=='notification.create':
        from cab_platform.notifications import create
        return create(actor,data)
    if name=='notification.receipt':
        from cab_platform.notifications import administrator,receipt_view
        from .models import NotificationReceipt
        administrator(actor)
        commands.require(set(data)=={'id'},'notification-fields-invalid',400)
        receipt=NotificationReceipt.objects.filter(pk=UUID(str(data['id']))).first()
        return receipt_view(receipt) if receipt else {'id':data['id'],'state':'PENDING'}
    if name in ('session.git.inspect_preexisting','session.git.authorize_preexisting'):
        from cab_platform.preexisting_git import inspect_preexisting,authorize_preexisting
        return (inspect_preexisting if name=='session.git.inspect_preexisting' else authorize_preexisting)(actor,data)
    if name=='session.git.adopt':
        from cab_platform.session_git import adopt_files
        return adopt_files(actor,data)
    if name in ('session.git.stage_adopted','session.git.reserve_adopted'):
        from cab_platform.session_git import administrative_stage
        return administrative_stage(actor,data,reserve=name=='session.git.reserve_adopted')
    if name in ('session.delivery.start_adopted','session.delivery.status_adopted'):
        from cab_platform.session_git import administrative_run
        from cab_platform.session_delivery import start_delivery,delivery_status
        commands.require(set(data)=={'project_id','run_id','version'},'session-delivery-fields-invalid',400)
        if name=='session.delivery.status_adopted':
            commands.require(actor.active and actor.role=='admin','session-git-administrator-required',403)
            current=commands.run_scope(actor,data['run_id'],data['project_id'],owner=False)
            return delivery_status(current.actor,current,data['version'],None,administrator=actor)
        current,connector_id=administrative_run(actor,data)
        return start_delivery(current.actor,current,data['version'],connector_id)
    if name in ('run.reframe_prequalification','finalization.host_completion','session.git.cancel_unpublished_stage'):
        principal(request,admin=True)
        from cab_platform.host_completion import reframe_prequalification,declare_host_completion,cancel_unpublished_stage
        return {'run.reframe_prequalification':reframe_prequalification,'finalization.host_completion':declare_host_completion,'session.git.cancel_unpublished_stage':cancel_unpublished_stage}[name](actor,data)
    if name in ('terminal.git.authorize','terminal.git.status'):
        from cab_platform.closure_git import authorize,view
        if name=='terminal.git.authorize':return authorize(actor,data)
        current=commands.run_scope(actor,data['run_id'],data['project_id'],owner=False)
        return view(current)
    if name=='session.delivery.select_version':
        from cab_platform.session_delivery import select_delivery_version
        return select_delivery_version(actor,data)
    if name=='session.delivery.policy':
        from cab_platform.session_delivery import configure_delivery_policy
        return configure_delivery_policy(actor,data)
    if name in ('session.delivery.start','session.delivery.status'):
        from .connectors import current_worker_run,worker_connector
        from cab_platform.session_delivery import start_delivery,delivery_status
        commands.require(set(data)=={'version'},'session-delivery-fields-invalid',400)
        peer=getattr(request,'cab_peer',None)
        current=current_worker_run(actor,peer,read_only=name=='session.delivery.status')
        connector=worker_connector(actor,peer)
        commands.require(connector is not None,'session-connector-unbound',409)
        return (start_delivery if name=='session.delivery.start' else delivery_status)(actor,current,data['version'],connector.pk)
    if name=='session.git.context':
        commands.require(not data,'session-git-fields-invalid',400)
        from .connectors import current_worker_run
        current=current_worker_run(actor,getattr(request,'cab_peer',None),read_only=True)
        from cab_platform.session_delivery import version_policy
        return {'project_id':current.project_id,'run_id':current.run_id,'change':current.change,'session_id':current.session_id,'version_policy':version_policy(current)}
    if name in ('session.git.reserve','session.git.stage','session.git.status','session.git.inspect','session.git.release'):
        from .connectors import current_worker_run,worker_connector
        from cab_platform.session_git import reserve_files,stage_files,effect_status,inspect_session,release_files
        peer=getattr(request,'cab_peer',None)
        current=current_worker_run(actor,peer,read_only=name in ('session.git.status','session.git.inspect'))
        connector=worker_connector(actor,peer)
        commands.require(connector is not None,'session-connector-unbound',409)
        commands.require(data.get('project_id',current.project_id)==current.project_id and data.get('run_id',current.run_id)==current.run_id,'session-connector-run-divergent',403)
        scoped={**data,'project_id':current.project_id,'run_id':current.run_id}
        if name=='session.git.release':return release_files(actor,scoped,connector.pk)
        if name in ('session.git.reserve','session.git.stage'):
            return (reserve_files if name=='session.git.reserve' else stage_files)(actor,scoped,connector.pk)
        return (effect_status if name=='session.git.status' else inspect_session)(actor,scoped)
    if name=='native.locate':return commands.locate_native(actor,data)
    if name=='native.bind':
        from .connectors import bind_worker_run
        with transaction.atomic():
            Actor.objects.select_for_update().get(pk=actor.pk)
            result=commands.bind_native(actor,data)
            peer=getattr(request,'cab_peer',None)
            connector_bound=bind_worker_run(actor,data,peer)
            if not connector_bound:
                from cab_platform.connector_process import identity,cab_process
                process=identity(peer['pid']) if peer else None
                run=commands.run_scope(actor,data['run_id'],data['project_id'])
                commands.event(run,'native-connector-binding-unavailable',{'peer':peer,'process':process,'worker_agent':cab_process(peer['pid'],'mcp-worker') if peer else None,'parent_agent':cab_process(process['parent_pid'],'mcp') if process else None})
            return {**result,'connector_bound':connector_bound}
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
    if name=='finalization.host_check':
        principal(request,admin=True)
        commands.require(getattr(request,'cab_peer',None) and request.cab_peer['uid']==0,'host-check-local-root-required',403)
        from . import run_evidence
        op,created=run_evidence.host_check(actor,data)
        return {**operation_data(op),'created':created}
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
    if name=='native.grant':
        from .native_access import grant
        return grant(actor,data)
    if name=='native.grant.revoke':
        from .native_access import revoke
        return revoke(actor,data)
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
    if name=='incident.purge_all':
        commands.require(data.get('developer_authorized') is True,'incident-purge-authorization-required',403)
        key=commands.identifier(data['request_id'])
        rows=list(Incident.objects.select_for_update().order_by('created'))
        commands.require(all(row.state=='RESOLVED' for row in rows),'incident-unresolved')
        for row in rows:
            if row.project:commands.scope(actor,row.project)
            commands.require(row.claim.get('actor')==actor.pk and row.claim.get('until',0)>timezone.now().timestamp(),'incident-claim-expired')
        fields=('incident_id','category','summary','evidence','state','claim','resolution')
        values=[{field:getattr(row,field) for field in fields} for row in rows]
        commands.require(commands.digest(values)==data.get('expected_snapshot_digest'),'incident-snapshot-stale')
        identifiers=[row.pk for row in rows]
        Incident.objects.filter(pk__in=identifiers).delete()
        return {'request_id':key,'status':'PURGED_TREATED','purged':identifiers,'remaining':0}
    row=Incident.objects.select_for_update().get(pk=data['incident_id'])
    if row.project:commands.scope(actor,row.project)
    if name=='incident.claim':
        until=timezone.now().timestamp()+min(max(int(data.get('lease_seconds',900)),60),3600)
        commands.require(row.state in ('OPEN','CLAIMED','RESOLVED') and (row.state=='OPEN' or row.claim.get('actor')==actor.pk or row.claim.get('until',0)<timezone.now().timestamp()),'incident-claimed')
        if row.state!='RESOLVED':row.state='CLAIMED'
        row.claim={'actor':actor.pk,'until':until,'id':commands.identifier(data['claim_id'])};row.save();return {'claim':row.claim}
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
        from .models import AgentUser
        commands.require(not AgentUser.objects.filter(reconcile_state='RUNNING').exists(),'maintenance-boundary-busy')
        commands.require(not Maintenance.objects.exclude(pk=key).filter(state__in=['PREPARED','INSTALLING']).exists(),'maintenance-transaction-conflict')
        row,created=Maintenance.objects.get_or_create(pk=key,defaults={'state':'PREPARED','evidence':data.get('evidence',{})})
        return {'state':row.state,'transaction_id':key}
    row=Maintenance.objects.select_for_update().get(pk=key)
    if name=='maintenance.resume':row.state='COMPLETED';row.save();return {'state':row.state,'transaction_id':key}
    if name=='maintenance.cancel':row.state='CANCELLED';row.save();return {'state':row.state}
    raise commands.Refused('maintenance-action-invalid',400)
