"""Surveillance Linux ciblée : aucun parcours du dépôt hors OpenSpec."""
import ctypes
import os
from pathlib import Path
import struct
import time
from django.utils import timezone
from .core.models import Project,ProjectStatistics,Run
from .core.statistics_service import sync

class Watcher:
    def __init__(self):
        self.lib=ctypes.CDLL(None,use_errno=True);self.fd=self.lib.inotify_init1(os.O_NONBLOCK|os.O_CLOEXEC)
        if self.fd<0:raise OSError(ctypes.get_errno(),'statistics-inotify-unavailable')
        self.paths={};self.watches={};self.dirty={};self.projects=set();self.next_inventory=0;self.next_active=0
        self.env_dirty={};self.env_catchup=0
    def close(self):os.close(self.fd)
    def rebuild(self):
        desired={};self.projects=set()
        for project in Project.objects.filter(creation_state='READY'):
            root=Path(project.root);base=root/'openspec/changes'
            if not root.is_dir() or root.resolve()!=root:continue
            self.projects.add(project.pk)
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
            state=ProjectStatistics.objects.filter(project=project).first()
            if state is None or state.next_full_sync is None or state.next_full_sync<=timezone.now():self.dirty[project.pk]=time.monotonic()
        for path,wd in list(self.paths.items()):
            if path not in desired:self.lib.inotify_rm_watch(self.fd,wd);self.watches.pop(wd,None);del self.paths[path]
        for path,info in desired.items():
            if path not in self.paths:
                wd=self.lib.inotify_add_watch(self.fd,os.fsencode(path),0x8|0x80|0x100|0x200|0x400|0x800|0x02000000|0x01000000)
                if wd<0:raise OSError(ctypes.get_errno(),'statistics-watch-unavailable')
                self.paths[path]=wd;self.watches[wd]=info
                if info[1]:self.env_dirty[info[0]]=time.monotonic()
    def tick(self):
        now=time.monotonic()
        if now>=self.next_inventory:self.rebuild();self.next_inventory=now+2
        while True:
            try:data=os.read(self.fd,262144)
            except BlockingIOError:break
            offset=0
            while offset+16<=len(data):
                wd,mask,cookie,length=struct.unpack_from('iIII',data,offset);name=os.fsdecode(data[offset+16:offset+16+length].split(b'\0',1)[0]);offset+=16+length
                if mask&0x4000:
                    for project_id in Project.objects.values_list('pk',flat=True):self.dirty[project_id]=now;self.env_dirty[project_id]=now
                    self.next_inventory=0
                elif wd in self.watches:
                    project_id,is_root=self.watches[wd]
                    if not is_root or name in ('STATISTICS.md','openspec'):self.dirty[project_id]=now
                    if is_root and (name=='project.env' or mask&(0x400|0x800)):self.env_dirty[project_id]=now
                    if mask&(0x100|0x200|0x400|0x800):self.next_inventory=0
        if now>=self.next_active:
            for project_id in Run.objects.filter(state__in=['WORKING','FINALIZATION_PENDING','FINALIZING','REVIEW_PENDING','ACCEPTED'],suspension='').values_list('project_id',flat=True).distinct():
                if project_id in self.projects:self.dirty.setdefault(project_id,now-1)
            self.next_active=now+5
        if now>=self.env_catchup:
            for project_id in self.projects:self.env_dirty.setdefault(project_id,now)
            self.env_catchup=now+60
        return [key for key,at in self.dirty.items() if now-at>=.3]

def synchronize(project_id):
    project=Project.objects.get(pk=project_id);state=ProjectStatistics.objects.filter(project=project).first()
    due=state is None or state.next_full_sync is None or state.next_full_sync<=timezone.now()
    return sync(project,full=due,automatic=True)
