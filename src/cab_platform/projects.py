"""Création d’un dossier borné et catalogue PostgreSQL, sans initialisation Git."""
import hashlib
import os
from pathlib import Path
import pwd
import grp
import re
import uuid
from django.db import transaction
from django.db.models import Q
from .paths import config
from .core.commands import require,Refused
from .core.models import Project

FOLDER=re.compile(r'^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$')

def project_settings(cfg=None):
    cfg=config() if cfg is None else cfg
    require(all(isinstance(cfg.get(key),str) and cfg[key].strip() for key in ['projects_root','projects_user','projects_group']),'projects-settings-required',400)
    root=Path(cfg['projects_root'])
    require(root.is_absolute() and root!=Path('/') and root.resolve()==root and root.is_dir(),'projects-root-invalid',400)
    try:user=pwd.getpwnam(cfg['projects_user'])
    except KeyError:raise Refused('projects-user-not-found',400) from None
    try:group=grp.getgrnam(cfg['projects_group'])
    except KeyError:raise Refused('projects-group-not-found',400) from None
    from .os_access import accessible
    require(accessible(root,user.pw_uid,os.X_OK),'projects-root-not-accessible',400)
    return root,user,group

def settings_view():
    cfg=config();keys=['projects_root','projects_user','projects_group']
    values={key:cfg.get(key,'') for key in keys}
    try:project_settings(cfg);configured=True;error=None
    except Refused as refused:configured=False;error=refused.code
    return {**values,'configured':configured,'error':error}

def project_data(project):
    return {'identifier':project.identifier,'id':project.pk,'name':project.name or Path(project.root).name,'root':project.root,'owner_uid':project.owner_uid,'owner_gid':project.owner_gid,'creation_state':project.creation_state,'public_metadata':project.public_metadata}

def create_project(actor,name,folder,request_id,project_path=''):
    require(actor.role=='admin','administrator-required',403)
    require(isinstance(name,str) and 1<=len(name.strip())<=120 and not any(ord(c)<32 for c in name),'project-name-invalid',400)
    require(isinstance(folder,str) and FOLDER.fullmatch(folder) and folder not in ('.','..'),'project-folder-invalid',400)
    try:request_id=str(uuid.UUID(request_id))
    except (ValueError,TypeError,AttributeError):raise Refused('project-request-invalid',400) from None
    default_root,user,group=project_settings()
    require(isinstance(project_path,str) and len(project_path)<=1500 and not any(c in project_path for c in '\r\n\0'),'project-path-invalid',400)
    path=Path(project_path) if project_path else default_root/folder
    root=path.parent
    require(path.is_absolute() and path!=Path('/') and path.name not in ('','.','..') and root.is_dir() and root.resolve()==root,'project-path-invalid',400)
    from .os_access import accessible
    require(accessible(root,user.pw_uid,os.W_OK|os.X_OK),'projects-root-not-accessible',400)
    identity=hashlib.sha256(str(path).encode()).hexdigest();name=name.strip()
    # L’intention SQL précède mkdir. Une interruption ne réémet pas l’effet.
    with transaction.atomic():
        existing=Project.objects.select_for_update().filter(pk=identity).first()
        if existing:
            require(existing.creation_request_id==request_id and existing.name==name and existing.owner_uid==user.pw_uid and existing.owner_gid==group.gr_gid,'project-already-exists')
            require(existing.creation_state=='READY','project-creation-needs-reconciliation')
            require(path.is_dir() and path.resolve()==path,'project-directory-missing')
            return existing,False
        from .project_ids import valid
        identifier=folder if valid(folder) else None
        require(identifier is None or not Project.objects.filter(Q(identifier=identifier)|Q(pk=identifier)).exists(),'project-identifier-conflict')
        project=Project.objects.create(identifier=identifier,pk=identity,name=name,root=str(path),owner_uid=user.pw_uid,owner_gid=group.gr_gid,creation_state='CREATING',creation_request_id=request_id)
    parent=None;directory=None
    try:
        parent=os.open(root,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
        require(root.resolve()==root,'projects-root-invalid',400)
        os.mkdir(path.name,mode=0o770,dir_fd=parent)
        directory=os.open(path.name,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=parent)
        os.fchown(directory,user.pw_uid,group.gr_gid);os.fchmod(directory,0o2770);os.fsync(parent)
        with transaction.atomic():
            project=Project.objects.select_for_update().get(pk=identity)
            project.creation_state='READY';project.save(update_fields=['creation_state']);actor.projects.add(project)
        return project,True
    except (OSError,Refused) as error:
        Project.objects.filter(pk=identity).update(creation_state='FAILED')
        code='project-folder-exists' if isinstance(error,FileExistsError) else error.code if isinstance(error,Refused) else 'project-directory-creation-failed'
        raise Refused(code,409) from error
    finally:
        if directory is not None:os.close(directory)
        if parent is not None:os.close(parent)


def add_existing_project(actor,project_path):
    require(actor.role=='admin','administrator-required',403)
    _,user,group=project_settings()
    require(isinstance(project_path,str) and project_path and len(project_path)<=1500 and not any(c in project_path for c in '\r\n\0'),'project-path-invalid',400)
    path=Path(project_path)
    require(path.is_absolute() and path!=Path('/') and path.is_dir() and path.resolve()==path,'project-path-invalid',400)
    from .os_access import accessible
    require(accessible(path,user.pw_uid,os.R_OK|os.X_OK),'projects-root-not-accessible',400)
    from .project_ids import identifier_for_root
    identifier=identifier_for_root(path);require(bool(identifier),'project-identifier-invalid',400)
    identity=hashlib.sha256(str(path).encode()).hexdigest()
    with transaction.atomic():
        existing=Project.objects.select_for_update().filter(root=str(path)).first()
        if existing:
            require(existing.creation_state=='READY','project-creation-needs-reconciliation')
            actor.projects.add(existing);return existing,False
        require(not Project.objects.filter(Q(identifier=identifier)|Q(pk=identifier)|Q(pk=identity)).exists(),'project-identifier-conflict',409)
        project=Project.objects.create(pk=identity,identifier=identifier,name=path.name[:120],root=str(path),owner_uid=user.pw_uid,owner_gid=group.gr_gid,creation_state='READY')
        actor.projects.add(project)
    from .project_metadata import synchronize
    synchronize(project.pk)
    return project,True


def browse_directories(project_path=''):
    import json,subprocess,sys
    default_root,user,_=project_settings()
    require(isinstance(project_path,str) and len(project_path)<=1500 and not any(c in project_path for c in '\r\n\0'),'project-path-invalid',400)
    path=Path(project_path) if project_path else default_root
    require(path.is_absolute() and path.is_dir() and path.resolve()==path,'project-path-invalid',400)
    script='''import json,os,sys
p=sys.argv[1];items=[]
with os.scandir(p) as entries:
 for entry in entries:
  if entry.is_dir(follow_symlinks=False) and not any(ord(c)<32 for c in entry.name):items.append(entry.name)
  if len(items)>1000:break
items.sort(key=str.casefold)
print(json.dumps({'directories':items[:1000],'truncated':len(items)>1000}))
'''
    options={'user':user.pw_uid,'group':user.pw_gid,'extra_groups':os.getgrouplist(user.pw_name,user.pw_gid)} if os.geteuid()==0 else {}
    require(os.geteuid() in (0,user.pw_uid),'projects-root-not-accessible',403)
    try:result=subprocess.run([sys.executable,'-c',script,str(path)],text=True,capture_output=True,timeout=10,cwd='/',env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8'},**options)
    except (OSError,subprocess.TimeoutExpired):raise Refused('project-directory-unavailable',409) from None
    require(result.returncode==0,'project-directory-unavailable',409)
    try:data=json.loads(result.stdout)
    except ValueError:raise Refused('project-directory-unavailable',409) from None
    return {'path':str(path),'parent':str(path.parent) if path!=Path('/') else '',**data}
