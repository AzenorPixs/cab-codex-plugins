"""Atelier existant, racine /tmp propre au projet pour le profil piloté."""
import hashlib
import os
import pwd
from pathlib import Path
import shutil
import stat
from django.db import transaction
from .core.models import Workshop
from .core.commands import require

def _parent(path):
    path.mkdir(parents=True,exist_ok=True,mode=0o711)
    fd=os.open(path,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
    try:
        info=os.fstat(fd)
        require(path.resolve()==path and info.st_uid==os.getuid() and not info.st_mode&0o022,'workshop-parent-unsafe')
        # mkdir reste soumis à l'umask privée du service, contrairement à fchmod.
        os.fchmod(fd,0o711)
    finally:os.close(fd)
    return path

def _direct_parents(run):
    """Parents partagés par groupe projet ; aucun dossier RUN n'est normalisé."""
    project=Path(run.project.root);project_info=project.stat()
    user=pwd.getpwuid(run.actor.uid)
    require(run.actor.uid==0 or project_info.st_gid in os.getgrouplist(user.pw_name,user.pw_gid),'workshop-project-group-required')
    parent=project
    for name in ('.cab-tests',run.change):
        path=parent/name
        require(path.parent==parent and path.resolve()==path,'workshop-parent-unsafe')
        created=False
        try:path.mkdir(mode=0o770);created=True
        except FileExistsError:pass
        fd=os.open(path,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
        try:
            if created:
                os.fchown(fd,-1,project_info.st_gid);os.fchmod(fd,0o2770)
            info=os.fstat(fd)
            require(info.st_uid in (os.getuid(),project_info.st_uid) and info.st_gid==project_info.st_gid and not info.st_mode&0o002,'workshop-parent-unsafe')
            if info.st_uid==os.getuid():
                # Ne réparer que les parents contrôlés par le service ; garder
                # le propriétaire et les droits des répertoires préexistants du projet.
                os.fchmod(fd,0o770 | (info.st_mode&stat.S_ISGID))
            else:
                require(run.actor.uid==0 or bool(info.st_mode&0o010),'workshop-parent-inaccessible')
        finally:os.close(fd)
        parent=path
    return parent

@transaction.atomic
def workshop(run):
    # Le verrou du RUN sérialise toute création/déplacement.
    type(run).objects.select_for_update().get(pk=run.pk)
    # Aussi à la reprise d'un atelier enregistré : un parent peut avoir été
    # créé sous une umask trop restrictive dans une version antérieure.
    direct_root=_direct_parents(run) if run.mode!='piloted' else None
    known=Workshop.objects.filter(run=run).first()
    if known:
        p=Path(known.path)
        if p.exists():
            info=p.lstat();require(stat.S_ISDIR(info.st_mode) and p.resolve()==p and (info.st_dev,info.st_ino,info.st_uid)==(known.device,known.inode,known.uid),'workshop-identity-changed');return p
        require(not run.operation_set.filter(state__in=['RUNNING','UNKNOWN']).exists() and not run.operation_set.filter(state='INTENT',dispatched=True).exists(),'workshop-missing-effect-unresolved')
        known.delete()
    old=Path(run.project.root)/'.cab-tests'/run.change/run.run_id
    if run.mode=='piloted':
        root=_parent(Path('/tmp/cab'))
        root=_parent(root/run.project_id)
        root=_parent(root/'.cab-tests')
        root=_parent(root/run.change)
        target=root/run.run_id
        if old.exists():
            require(run.mandate.get('workshop_migration_authorized') is True,'workshop-migration-authorization-required')
            require(old.resolve()==old and old.stat().st_uid==run.actor.uid,'legacy-workshop-unsafe')
            require(not run.operation_set.filter(state__in=['RUNNING','UNKNOWN']).exists() and not run.operation_set.filter(state='INTENT',dispatched=True).exists(),'workshop-boundary-busy')
            require(not target.exists(),'workshop-target-exists')
            shutil.move(str(old),str(target))
        else:target.mkdir(mode=0o700,exist_ok=False)
    else:
        target=direct_root/run.run_id;target.mkdir(mode=0o700,exist_ok=False)
    os.chown(target,run.actor.uid,-1);os.chmod(target,0o700)
    info=target.lstat();Workshop.objects.create(run=run,path=str(target),device=info.st_dev,inode=info.st_ino,uid=info.st_uid)
    return target
