import mimetypes
from pathlib import Path
import json
from django.http import FileResponse,HttpResponse,JsonResponse,StreamingHttpResponse
from .core.auth import principal
from .core.commands import Refused,scope
from .core.models import Project
from .paths import runtime_config as config
import os

WEB=Path(os.environ.get('CAB_WEB_ROOT','/usr/lib/cab/web'))
def frontend(request,path=''):
    if path.startswith('api/'):return JsonResponse({'error':'not-found'},status=404)
    target=(WEB/path) if path else WEB/'index.html'
    if target.resolve().is_relative_to(WEB.resolve()) and target.is_file():return FileResponse(target.open('rb'),content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream')
    index=WEB/'index.html'
    if index.is_file() and '.' not in Path(path).name:return FileResponse(index.open('rb'),content_type='text/html')
    return HttpResponse('Interface CAB non construite',status=503,content_type='text/plain')

def sync_sessions(request):return sync_projection(request,'cab_core_sessionprojection')

def sync_project_sessions(request):return sync_projection(request,'cab_core_sessionprojection',all_projects=True)

def sync_project_archives(request):return sync_projection(request,'cab_core_sessionprojection',all_projects=True,archived=True)

def sync_project(request):return sync_projection(request,'project_metadata_projection')

def sync_connectors(request):return sync_projection(request,'mcp_connector_projection')

def sync_agents(request):return sync_projection(request,'agents')

def sync_agent_users(request):return sync_projection(request,'agent_users')

def sync_cab_version(request):return sync_projection(request,'cab_version_projection')

def sync_notifications(request):return sync_projection(request,'cab_notifications')

def sync_interface_preferences(request):return sync_projection(request,'interface_preferences_projection')

def all_sessions_where(actor,*,archived=False):
    predicate='archived = true' if archived else 'archived = false'
    if actor.role=='admin':return predicate
    identities=list(actor.projects.values_list('pk',flat=True))
    if not identities:return 'false'
    return predicate+" AND project_id IN ("+','.join("'"+key.replace("'","''")+"'" for key in identities)+")"


def sync_projection(request,table,*,all_projects=False,archived=False):
    try:
        actor=None if table in ('cab_version_projection','interface_preferences_projection') else principal(request)
        if all_projects:
            if not actor.active:raise Refused('project-not-authorized',403)
            if table!='cab_core_sessionprojection':raise Refused('session-projection-invalid',403)
            project=None
        elif table in ('cab_version_projection','interface_preferences_projection'):project=None
        elif table in ('agents','agent_users','cab_notifications'):
            if actor.role!='admin':raise Refused('administrator-required',403)
            if table=='agent_users' and request.GET.get('agent') not in ('codex_desktop','codex','opencode'):raise Refused('agent-not-found',404)
            project=None
        else:project=None if table=='mcp_connector_projection' else Project.objects.get(pk=request.GET.get('project_id',''))
        if project is not None and actor.role!='admin':scope(actor,project)
    except (Refused,Project.DoesNotExist):return JsonResponse({'error':'project-not-authorized'},status=403)
    cfg=config();params={k:request.GET[k] for k in ('offset','handle','live','cursor') if k in request.GET}
    if table in ('cab_version_projection','interface_preferences_projection') and (not cfg.get('initialized') or not cfg.get('electric_secret')):return JsonResponse({'error':'sync-unavailable'},status=503)
    # L'identifiant est encodé comme littéral SQL même pour un catalogue importé.
    if all_projects:where=all_sessions_where(actor,archived=archived)
    elif table in ('cab_version_projection','interface_preferences_projection'):where='id = 1'
    elif table in ('agents','cab_notifications'):where='true'
    elif table=='agent_users':where="agent_id = '"+request.GET['agent']+"'"
    elif table=='mcp_connector_projection':where='true' if actor.role=='admin' else 'uid = '+str(actor.uid)
    else:
        identity=project.pk.replace("'","''")
        where=("id" if table=='project_metadata_projection' else 'project_id')+" = '"+identity+"'"
    params.update(table=table,where=where,secret=cfg['electric_secret'])
    if table=='project_metadata_projection':params['columns']='id,public_metadata'
    if table=='mcp_connector_projection':params['columns']='connector_id,agent,uid,loaded_version,catalog_version,relay_version,state,connected'
    if table=='cab_notifications':params['columns']='id,project_id,sender,title,body,kind,choices,read_at,created,updated'
    if table=='agents':params['columns']='id,label,position,installed,running,local_version,mcp_connected,mcp_versions'
    if table=='agent_users':params['columns']='id,agent_id,username,home,config_present,config_path,mcp_declared,config_error,reconcile_state'
    if table=='cab_version_projection':params['columns']='id,version,git_version'
    if table=='interface_preferences_projection':params['columns']='id,preferences'
    import httpx
    try:response=httpx.get('http://127.0.0.1:'+str(cfg.get('electric_port',8791))+'/v1/shape',params=params,timeout=65)
    except httpx.HTTPError:return JsonResponse({'error':'sync-unavailable'},status=503)
    if response.status_code not in (200,204,304,409):return JsonResponse({'error':'sync-unavailable'},status=503)
    result=HttpResponse(response.content,status=response.status_code,content_type=response.headers.get('content-type','application/json'))
    for key,value in response.headers.items():
        if key.lower().startswith('electric-'):result[key]=value
    result['Cache-Control']='private, no-store';return result
