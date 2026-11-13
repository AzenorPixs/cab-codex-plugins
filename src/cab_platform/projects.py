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
    if user.pw_uid!=0:
        groups=set(os.getgrouplist(user.pw_name,user.pw_gid))
        for parent in [root,*root.parents]:
            info=parent.stat();bit=0o100 if info.st_uid==user.pw_uid else 0o010 if info.st_gid in groups else 0o001
            require(bool(info.st_mode&bit),'projects-root-not-accessible',400)
    return root,user,group

def settings_view():
    cfg=config();keys=['projects_root','projects_user','projects_group']
    values={key:cfg.get(key,'') for key in keys}
    try:project_settings(cfg);configured=True;error=None
    except Refused as refused:configured=False;error=refused.code
    return {**values,'configured':configured,'error':error}

def project_data(project):
    return {'identifier':project.identifier,'id':project.pk,'name':project.name or Path(project.root).name,'root':project.root,'owner_uid':project.owner_uid,'owner_gid':project.owner_gid,'creation_state':project.creation_state,'public_metadata':project.public_metadata}

def create_project(actor,name,folder,request_id):
    require(actor.role=='admin','administrator-required',403)
    require(isinstance(name,str) and 1<=len(name.strip())<=120 and not any(ord(c)<32 for c in name),'project-name-invalid',400)
    require(isinstance(folder,str) and FOLDER.fullmatch(folder) and folder not in ('.','..'),'project-folder-invalid',400)
    try:request_id=str(uuid.UUID(request_id))
    except (ValueError,TypeError,AttributeError):raise Refused('project-request-invalid',400) from None
    root,user,group=project_settings();path=root/folder;identity=hashlib.sha256(str(path).encode()).hexdigest();name=name.strip()
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
        os.mkdir(folder,mode=0o770,dir_fd=parent)
        directory=os.open(folder,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=parent)
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
