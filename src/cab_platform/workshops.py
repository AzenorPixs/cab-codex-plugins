"""Ateliers CAB sous /tmp ; conservation des anciens ateliers et de leurs identités."""
import hashlib
import os
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

@transaction.atomic
def workshop(run):
    # Le verrou du RUN sérialise toute création/déplacement.
    type(run).objects.select_for_update().get(pk=run.pk)
    known=Workshop.objects.filter(run=run).first()
    if known:
        p=Path(known.path)
        legacy_direct=run.mode!='piloted' and p.is_relative_to(Path(run.project.root)/'.cab-tests')
        if p.exists():
            info=p.lstat()
            require(stat.S_ISDIR(info.st_mode) and p.resolve()==p and (info.st_dev,info.st_ino)==(known.device,known.inode),'workshop-identity-changed')
            if not legacy_direct:return p
        require(not run.operation_set.filter(state__in=['RUNNING','UNKNOWN']).exists() and not run.operation_set.filter(state='INTENT',dispatched=True).exists(),'workshop-missing-effect-unresolved')
        if not legacy_direct:known.delete();known=None
    old=Path(run.project.root)/'.cab-tests'/run.change/run.run_id
    moved=False
    root=_parent(Path('/tmp/cab'))
    root=_parent(root/run.project_id)
    root=_parent(root/'.cab-tests')
    root=_parent(root/run.change)
    target=root/run.run_id
    if run.mode=='piloted' and old.exists():
        require(run.mandate.get('workshop_migration_authorized') is True,'workshop-migration-authorization-required')
        require(old.resolve()==old and old.is_dir(),'legacy-workshop-unsafe')
        require(not run.operation_set.filter(state__in=['RUNNING','UNKNOWN']).exists() and not run.operation_set.filter(state='INTENT',dispatched=True).exists(),'workshop-boundary-busy')
        require(not target.exists(),'workshop-target-exists')
        shutil.move(str(old),str(target));moved=True
    else:
        target.mkdir(mode=0o700,exist_ok=False)
    if not moved:os.chown(target,run.actor.uid,-1)
    info=target.lstat()
    Workshop.objects.update_or_create(run=run,defaults={'path':str(target),'device':info.st_dev,'inode':info.st_ino,'uid':info.st_uid})
    if known:
        from .core.commands import event
        event(run,'legacy-workshop-detached',{'path':known.path,'device':known.device,'inode':known.inode,'replacement':str(target)})
    return target
