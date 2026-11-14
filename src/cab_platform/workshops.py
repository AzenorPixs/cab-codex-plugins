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
    created=False
    try:path.mkdir(parents=True,mode=0o711);created=True
    except FileExistsError:pass
    fd=os.open(path,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
    try:
        info=os.fstat(fd)
        require(stat.S_ISDIR(info.st_mode) and path.resolve()==path,'workshop-parent-unsafe')
        if created:os.fchmod(fd,0o711)
    finally:os.close(fd)
    return path

def _direct_parents(run):
    """Parents partagés par groupe projet ; aucun dossier RUN n'est normalisé."""
    project=Path(run.project.root);project_info=project.stat()
    user=pwd.getpwuid(run.actor.uid)
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
            require(stat.S_ISDIR(info.st_mode),'workshop-parent-unsafe')
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
            info=p.lstat();require(stat.S_ISDIR(info.st_mode) and p.resolve()==p and (info.st_dev,info.st_ino)==(known.device,known.inode),'workshop-identity-changed');return p
        require(not run.operation_set.filter(state__in=['RUNNING','UNKNOWN']).exists() and not run.operation_set.filter(state='INTENT',dispatched=True).exists(),'workshop-missing-effect-unresolved')
        known.delete()
    old=Path(run.project.root)/'.cab-tests'/run.change/run.run_id
    moved=False
    if run.mode=='piloted':
        root=_parent(Path('/tmp/cab'))
        root=_parent(root/run.project_id)
        root=_parent(root/'.cab-tests')
        root=_parent(root/run.change)
        target=root/run.run_id
        if old.exists():
            require(run.mandate.get('workshop_migration_authorized') is True,'workshop-migration-authorization-required')
            require(old.resolve()==old and old.is_dir(),'legacy-workshop-unsafe')
            require(not run.operation_set.filter(state__in=['RUNNING','UNKNOWN']).exists() and not run.operation_set.filter(state='INTENT',dispatched=True).exists(),'workshop-boundary-busy')
            require(not target.exists(),'workshop-target-exists')
            shutil.move(str(old),str(target));moved=True
        else:target.mkdir(mode=0o700,exist_ok=False)
    else:
        target=direct_root/run.run_id;target.mkdir(mode=0o700,exist_ok=False)
    if not moved:os.chown(target,run.actor.uid,-1)
    info=target.lstat();Workshop.objects.create(run=run,path=str(target),device=info.st_dev,inode=info.st_ino,uid=info.st_uid)
    return target
