import mimetypes
from pathlib import Path
import json
from django.http import FileResponse,HttpResponse,JsonResponse,StreamingHttpResponse
from .core.auth import principal
from .core.commands import Refused,scope
from .core.models import Project
from .paths import config
import os

WEB=Path(os.environ.get('CAB_WEB_ROOT','/usr/lib/cab/web'))
def frontend(request,path=''):
    if path.startswith('api/'):return JsonResponse({'error':'not-found'},status=404)
    target=(WEB/path) if path else WEB/'index.html'
    if target.resolve().is_relative_to(WEB.resolve()) and target.is_file():return FileResponse(target.open('rb'),content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream')
    index=WEB/'index.html'
    if index.is_file() and '.' not in Path(path).name:return FileResponse(index.open('rb'),content_type='text/html')
    return HttpResponse('Interface CAB non construite',status=503,content_type='text/plain')

def sync_sessions(request):
    try:
        actor=principal(request);project=Project.objects.get(pk=request.GET.get('project_id',''))
        if actor.role!='admin':scope(actor,project)
    except (Refused,Project.DoesNotExist):return JsonResponse({'error':'project-not-authorized'},status=403)
    cfg=config();params={k:request.GET[k] for k in ('offset','handle','live','cursor') if k in request.GET}
    params.update(table='cab_core_sessionprojection',where="project_id = '"+project.pk+"'",secret=cfg['electric_secret'])
    import httpx
    try:response=httpx.get('http://127.0.0.1:'+str(cfg.get('electric_port',8791))+'/v1/shape',params=params,timeout=65)
    except httpx.HTTPError:return JsonResponse({'error':'sync-unavailable'},status=503)
    if response.status_code not in (200,204,304,409):return JsonResponse({'error':'sync-unavailable'},status=503)
    result=HttpResponse(response.content,status=response.status_code,content_type=response.headers.get('content-type','application/json'))
    for key,value in response.headers.items():
        if key.lower().startswith('electric-'):result[key]=value
    result['Cache-Control']='private, no-store';return result
