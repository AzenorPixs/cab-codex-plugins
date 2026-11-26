"""Surveillance Linux ciblée : aucun parcours du dépôt hors OpenSpec."""
import ctypes
import errno
import os
from pathlib import Path
import struct
import time
from django.utils import timezone
from .core.models import Project,ProjectStatistics,Run
from .core.statistics_service import sync

INVENTORY_INTERVAL = 60
METADATA_INTERVAL = 60
TOKENS = ('forgejo.token', 'github.token', 'gitlab.token')
STRUCTURE = 0x40 | 0x80 | 0x100 | 0x200 | 0x400 | 0x800
WATCH_EVENTS = STRUCTURE | 0x4 | 0x8


def metadata_signature(root):
    """Observer les entrées sans lire le contenu des fichiers protégés."""
    signatures = []
    for path in (root, root/'project.env', root/'.git', root/'config',
                 *(root/'config'/name for name in TOKENS)):
        try:
            info = path.lstat()
        except FileNotFoundError:
            signatures.append(())
        except OSError:
            return None
        else:
            identity = (info.st_dev, info.st_ino, info.st_mode, info.st_uid, info.st_gid)
            if path not in (root, root/'config'):
                identity += (info.st_size, info.st_mtime_ns, info.st_ctime_ns)
            signatures.append(identity)
    return tuple(signatures)


class Watcher:
    def __init__(self):
        self.lib=ctypes.CDLL(None,use_errno=True);self.fd=self.lib.inotify_init1(os.O_NONBLOCK|os.O_CLOEXEC)
        if self.fd<0:raise OSError(ctypes.get_errno(),'statistics-inotify-unavailable')
        self.paths={};self.watches={};self.dirty={};self.projects={};self.next_inventory=0;self.next_active=0
        self.env_dirty={};self.env_signatures={};self.env_catchup=0
        self.tasks_dirty=set();self.reset_watches=False
    def close(self):os.close(self.fd)
    def rebuild(self):
        desired={};projects={}
        for project in Project.objects.filter(creation_state='READY'):
            root=Path(project.root);base=root/'openspec/changes'
            if not root.is_dir() or root.resolve()!=root:continue
            projects[project.pk]=root
            candidates=[root,root/'openspec',base,base/'archive']
            if base.exists():
                folders=[p for p in base.iterdir() if p.name!='archive']
                if (base/'archive').is_dir():folders+=list((base/'archive').iterdir())
                for folder in folders:
                    if folder.is_dir() and not folder.is_symlink():
                        candidates.extend([folder,folder/'specs'])
                        if (folder/'specs').is_dir():candidates.extend((folder/'specs').iterdir())
            for path in candidates:
                if path.is_dir() and path.resolve()==path:desired[str(path)]=(project.pk,path==root)
            config_dir=root/'config'
            if config_dir.is_dir() and not config_dir.is_symlink() and config_dir.resolve()==config_dir:desired[str(config_dir)]=(project.pk,'config')
            state=ProjectStatistics.objects.filter(project=project).first()
            now=timezone.now()
            if (state is None or state.next_full_sync is None or state.next_full_sync<=now
                    or state.next_catalogue_sync is None or state.next_catalogue_sync<=now):
                self.dirty.setdefault(project.pk,time.monotonic())
        for project_id in self.projects.keys()-projects.keys():
            self.env_signatures.pop(project_id,None)
            self.env_dirty.pop(project_id,None)
            self.dirty.pop(project_id,None)
            self.tasks_dirty.discard(project_id)
        self.projects=projects
        for path,wd in list(self.paths.items()):
            if path not in desired:self.lib.inotify_rm_watch(self.fd,wd);self.watches.pop(wd,None);del self.paths[path]
        for path,info in desired.items():
            if path not in self.paths:
                wd=self.lib.inotify_add_watch(self.fd,os.fsencode(path),WATCH_EVENTS|0x02000000|0x01000000)
                if wd<0:
                    code=ctypes.get_errno()
                    if code in (errno.ENOENT,errno.ENOTDIR):continue
                    raise OSError(code,'statistics-watch-unavailable')
                self.paths[path]=wd;self.watches[wd]=info
                if info[1]:self.env_dirty[info[0]]=time.monotonic()
                else:self.tasks_dirty.add(info[0])

    def observe_event(self, wd, mask, name, now):
        if mask & 0x4000:  # IN_Q_OVERFLOW
            for project_id in self.projects:
                self.dirty[project_id]=now
                self.env_dirty[project_id]=now
            self.tasks_dirty.update(self.projects)
            self.next_inventory=0
            self.reset_watches=True
            return
        if wd not in self.watches:
            return
        project_id, scope = self.watches[wd]
        removed = mask & (0x400 | 0x800 | 0x8000)
        structure = removed or (mask & STRUCTURE and mask & 0x40000000)
        if removed:
            self.watches.pop(wd,None)
            self.paths={path:watch for path,watch in self.paths.items() if watch!=wd}
            if not mask & 0x8000:
                self.lib.inotify_rm_watch(self.fd,wd)
        if scope is True:
            if name in ('project.env','.git','config') or removed:
                self.env_dirty[project_id]=now
            if name=='STATISTICS.md':
                self.dirty[project_id]=now
            if name=='openspec' or removed:
                self.dirty[project_id]=now
                self.tasks_dirty.add(project_id)
            if removed or (name in ('openspec','config') and mask & STRUCTURE):
                self.next_inventory=0
        elif scope=='config':
            if name in TOKENS or removed:
                self.env_dirty[project_id]=now
            if removed:
                self.next_inventory=0
        else:
            if structure or name in ('STATISTICS.md','.openspec.yaml','proposal.md','tasks.md','design.md','spec.md'):
                self.dirty[project_id]=now
            if structure or name=='tasks.md':
                self.tasks_dirty.add(project_id)
            if structure:
                self.next_inventory=0

    def tick(self):
        now=time.monotonic()
        if self.reset_watches:
            fd=self.lib.inotify_init1(os.O_NONBLOCK|os.O_CLOEXEC)
            if fd<0:
                raise OSError(ctypes.get_errno(),'statistics-inotify-unavailable')
            self.close()
            self.fd=fd
            self.watches.clear();self.paths.clear();self.reset_watches=False
        if now>=self.next_inventory:self.rebuild();self.next_inventory=now+INVENTORY_INTERVAL
        while True:
            try:data=os.read(self.fd,262144)
            except BlockingIOError:break
            offset=0
            while offset+16<=len(data):
                wd,mask,cookie,length=struct.unpack_from('iIII',data,offset);name=os.fsdecode(data[offset+16:offset+16+length].split(b'\0',1)[0]);offset+=16+length
                self.observe_event(wd,mask,name,now)
        if now>=self.next_active:
            for project_id in Run.objects.filter(state__in=['WORKING','FINALIZATION_PENDING','FINALIZING','REVIEW_PENDING','ACCEPTED'],suspension='').values_list('project_id',flat=True).distinct():
                if project_id in self.projects:self.dirty.setdefault(project_id,now-1)
            self.next_active=now+5
        if now>=self.env_catchup:
            self.catch_up_metadata(now)
        return [key for key,at in self.dirty.items() if now-at>=.3]

    def catch_up_metadata(self, now):
        for project_id, root in self.projects.items():
            signature=metadata_signature(root)
            if signature is None or self.env_signatures.get(project_id)!=signature:
                self.env_dirty.setdefault(project_id,now)
        self.env_catchup=now+METADATA_INTERVAL

    def synchronize_metadata(self, project_id):
        from .project_metadata import synchronize as synchronize_project

        root=self.projects.get(project_id)
        if root is None:
            return
        signature=metadata_signature(root)
        _,complete=synchronize_project(project_id,with_status=True)
        if signature is not None and complete and metadata_signature(root)==signature:
            return signature

def synchronize(project_id):
    from .change_catalogue import refresh

    project=Project.objects.get(pk=project_id);state=ProjectStatistics.objects.filter(project=project).first()
    due=state is None or state.next_full_sync is None or state.next_full_sync<=timezone.now()
    try:
        refresh(project_id)
    finally:
        result=sync(project,full=due,automatic=True)
    return result
