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

def sync_project(request):return sync_projection(request,'project_metadata_projection')

def sync_connectors(request):return sync_projection(request,'mcp_connector_projection')

def sync_projection(request,table):
    try:
        actor=principal(request)
        project=None if table=='mcp_connector_projection' else Project.objects.get(pk=request.GET.get('project_id',''))
        if project is not None and actor.role!='admin':scope(actor,project)
    except (Refused,Project.DoesNotExist):return JsonResponse({'error':'project-not-authorized'},status=403)
    cfg=config();params={k:request.GET[k] for k in ('offset','handle','live','cursor') if k in request.GET}
    # L'identifiant est encodé comme littéral SQL même pour un catalogue importé.
    if table=='mcp_connector_projection':where='true' if actor.role=='admin' else 'uid = '+str(actor.uid)
    else:
        identity=project.pk.replace("'","''")
        where=("id" if table=='project_metadata_projection' else 'project_id')+" = '"+identity+"'"
    params.update(table=table,where=where,secret=cfg['electric_secret'])
    if table=='project_metadata_projection':params['columns']='id,public_metadata'
    if table=='mcp_connector_projection':params['columns']='connector_id,agent,uid,loaded_version,catalog_version,relay_version,state,connected'
    import httpx
    try:response=httpx.get('http://127.0.0.1:'+str(cfg.get('electric_port',8791))+'/v1/shape',params=params,timeout=65)
    except httpx.HTTPError:return JsonResponse({'error':'sync-unavailable'},status=503)
    if response.status_code not in (200,204,304,409):return JsonResponse({'error':'sync-unavailable'},status=503)
    result=HttpResponse(response.content,status=response.status_code,content_type=response.headers.get('content-type','application/json'))
    for key,value in response.headers.items():
        if key.lower().startswith('electric-'):result[key]=value
    result['Cache-Control']='private, no-store';return result
