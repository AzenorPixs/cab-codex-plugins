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
def workshop(run, *, terminal=False):
    # Le verrou du RUN sérialise toute création/déplacement.
    run = type(run).objects.select_for_update().get(pk=run.pk)
    if terminal:
        from .run_cleanup import cleanup_passage
        require(not cleanup_passage(run), 'session-terminal-run-inactive')
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


def cleanup_workshop(run):
    """Retire l’atelier enregistré, sous verrou du RUN et sans suivre les liens."""
    from .session_terminal import CONSOLES, REGISTRY

    require(REGISTRY.acquire(blocking=False), 'cleanup-terminal-pending')
    try:
        require(not any(console.scope[0] == run.pk and console.finished is None
                        for console in CONSOLES.values()), 'cleanup-terminal-pending')
        known = Workshop.objects.filter(run=run).first()
        if known is None:
            return 'ABSENT'
        target = Path('/tmp/cab') / run.project_id / '.cab-tests' / run.change / run.run_id
        require(Path(known.path) == target and target.resolve() == target,
                'cleanup-workshop-identity-changed')
        try:
            parent = os.open(target.parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        except FileNotFoundError:
            return 'ABSENT'
        try:
            info = os.fstat(parent)
            require(info.st_uid == os.geteuid() and not info.st_mode & 0o022,
                    'cleanup-workshop-parent-unsafe')
            try:
                info = os.stat(target.name, dir_fd=parent, follow_symlinks=False)
            except FileNotFoundError:
                return 'ABSENT'
            require(stat.S_ISDIR(info.st_mode) and info.st_uid == known.uid == run.actor.uid
                    and (info.st_dev, info.st_ino) == (known.device, known.inode),
                    'cleanup-workshop-identity-changed')
            with open('/proc/self/mountinfo', encoding='utf-8', errors='surrogateescape') as mounts:
                mount_paths = (entry.split(' ', 5)[4] for entry in mounts)
                require(not any(path == str(target) or path.startswith(str(target) + '/')
                                for path in mount_paths), 'cleanup-workshop-mount-present')
            require(shutil.rmtree.avoids_symlink_attacks, 'cleanup-workshop-removal-unsupported')
            shutil.rmtree(target.name, dir_fd=parent)
        finally:
            os.close(parent)
    finally:
        REGISTRY.release()
    return 'REMOVED'
