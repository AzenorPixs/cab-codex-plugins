"""Autorisations interprojets explicites ; identité native conservée."""
from pathlib import Path
from django.db import transaction
from . import commands as c
from .models import Event,Run
from cab_platform.native_sources import inspect,NativeSourceError

KINDS=('native-project-granted','native-project-revoked')


def within(paths,allowed):
    return bool(paths) and all(any(path==base or path.startswith(base+'/') for base in allowed) for path in paths)


def root_for(run):
    grant=Event.objects.filter(run=run,kind__in=KINDS).order_by('-pk').first()
    if grant is None:return run.project.root
    c.require(grant.kind=='native-project-granted','native-project-access-revoked',403)
    data=grant.data
    c.require(within(run.mandate.get('paths',[]),data.get('paths',[])),'native-project-path-not-authorized',403)
    source=Run.objects.select_related('actor','project').filter(pk=data.get('source_run')).first()
    c.require(source is not None and source.actor_id==run.actor_id and source.session_id==run.session_id and source.project_id==data.get('source_project'),'native-project-source-divergent',403)
    c.require(source.actor.active and source.project.root==data.get('source_root'),'native-project-source-divergent',403)
    native=source.mandate.get('native_source',{})
    c.require(native and native==data.get('native_source'),'native-project-source-divergent',403)
    try:checked=inspect(source.actor.uid,source.session_id,source.project.root,native['source_file'])
    except NativeSourceError as error:raise c.Refused(str(error),403) from None
    c.require(checked==native,'native-project-source-divergent',403)
    return source.project.root


@transaction.atomic
def grant(actor,data):
    c.require(actor.role=='admin','native-project-admin-required',403)
    c.require(set(data)=={'project_id','run_id','request_id','source_project_id','source_run_id','paths','authorization'},'native-project-fields-invalid',400)
    target=c.run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False)
    request_id=c.identifier(data['request_id'])
    fingerprint=c.digest(data)
    previous=Event.objects.filter(run=target,kind__in=KINDS,data__request_id=request_id).first()
    if previous:
        c.require(previous.data.get('request_digest')==fingerprint,'native-project-request-conflict',409)
        return {'granted':previous.kind=='native-project-granted','request_id':request_id}
    c.require(target.state in ('WORKING','FINALIZATION_PENDING') and not target.suspension and c.no_pending(target),'native-project-run-protected',409)
    paths=data['paths']
    c.require(isinstance(paths,list) and 0<len(paths)<=128 and all(isinstance(p,str) for p in paths),'native-project-path-invalid',400)
    for path in paths:c.safe_path(Path(target.project.root),path,exists=False)
    c.require(within(target.mandate.get('paths',[]),paths),'native-project-path-not-authorized',403)
    authorization=data['authorization']
    c.require(isinstance(authorization,str) and 0<len(authorization)<=4000,'native-project-authorization-required',400)
    source=Run.objects.select_related('actor','project').filter(project_id=data['source_project_id'],run_id=data['source_run_id']).first()
    c.require(source is not None,'native-project-source-not-found',404)
    c.scope(actor,source.project)
    c.require(source.project_id!=target.project_id and source.actor_id==target.actor_id and source.session_id==target.session_id,'native-project-source-divergent',403)
    native=source.mandate.get('native_source',{})
    c.require(isinstance(native,dict) and native.get('source_file'),'native-project-source-unbound',403)
    try:checked=inspect(source.actor.uid,source.session_id,source.project.root,native['source_file'])
    except NativeSourceError as error:raise c.Refused(str(error),403) from None
    c.require(checked==native,'native-project-source-divergent',403)
    if target.mandate.get('native_source'):c.require(target.mandate['native_source']==native,'native-project-source-divergent',403)
    c.event(target,'native-project-granted',{'request_id':request_id,'request_digest':fingerprint,'source_run':source.pk,'source_project':source.project_id,'source_root':source.project.root,'native_source':native,'paths':paths,'authorization':authorization,'authority':actor.pk})
    return {'granted':True,'request_id':request_id}


@transaction.atomic
def revoke(actor,data):
    c.require(actor.role=='admin','native-project-admin-required',403)
    c.require(set(data)=={'project_id','run_id','request_id'},'native-project-fields-invalid',400)
    target=c.run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False)
    request_id=c.identifier(data['request_id'])
    previous=Event.objects.filter(run=target,kind__in=KINDS,data__request_id=request_id).first()
    if previous:
        c.require(previous.kind=='native-project-revoked','native-project-request-conflict',409)
        return {'revoked':True,'request_id':request_id}
    c.require(c.no_pending(target),'native-project-run-protected',409)
    c.event(target,'native-project-revoked',{'request_id':request_id,'authority':actor.pk})
    return {'revoked':True,'request_id':request_id}
