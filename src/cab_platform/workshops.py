"""Atelier existant, racine /tmp propre au projet pour le profil piloté."""
import hashlib
import os
from pathlib import Path
import shutil
import stat
from django.db import transaction
from .core.models import Workshop
from .core.commands import require

def _parent(path):
    path.mkdir(parents=True,exist_ok=True,mode=0o711)
    info=path.lstat()
    require(stat.S_ISDIR(info.st_mode) and path.resolve()==path and info.st_uid==os.getuid() and not info.st_mode&0o022,'workshop-parent-unsafe')
    return path

@transaction.atomic
def workshop(run):
    # Le verrou du RUN sérialise toute création/déplacement.
    type(run).objects.select_for_update().get(pk=run.pk)
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
        root=Path(run.project.root)/'.cab-tests'/run.change;root.mkdir(parents=True,exist_ok=True,mode=0o770)
        require(root.resolve()==root,'workshop-parent-unsafe');target=root/run.run_id;target.mkdir(mode=0o700,exist_ok=False)
    os.chown(target,run.actor.uid,-1);os.chmod(target,0o700)
    info=target.lstat();Workshop.objects.create(run=run,path=str(target),device=info.st_dev,inode=info.st_ino,uid=info.st_uid)
    return target
