"""Surveillance récursive et regroupement borné des analyses Git."""
import ctypes
import errno
import logging
import os
from pathlib import Path
import struct
import time
from concurrent.futures import ThreadPoolExecutor
from django.db import close_old_connections
from .core.models import Project
from .git_monitor_config import read
from .git_monitor_logic import mark_pending,next_ready

log = logging.getLogger('cab.git_monitor')
MASK = 0x00000004 | 0x00000008 | 0x00000080 | 0x00000040 | 0x00000100 | 0x00000200 | 0x00000400 | 0x00000800 | 0x02000000 | 0x01000000
DIRECTORY = 0x40000000
OVERFLOW = 0x00004000
IGNORED = 0x00008000


class GitMonitor:
    def __init__(self):
        self.lib = ctypes.CDLL(None, use_errno=True)
        self.projects = {}
        self.pending = {}
        self.last_started = {}
        self.settings = read()
        self.next_settings = 0.0
        self.next_inventory = 0.0
        self.pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix='cab-git-monitor')
        self.future = None

    def mark(self, project_id, now=None):
        now = time.monotonic() if now is None else now
        mark_pending(self.pending, project_id, now)

    def close_project(self, project_id):
        entry = self.projects.pop(project_id, None)
        if entry is not None:
            try:os.close(entry['fd'])
            except OSError as error:
                if error.errno!=errno.EBADF:raise
        self.pending.pop(project_id, None)
        self.last_started.pop(project_id, None)

    def add_tree(self, entry, root):
        def failed(error):
            log.warning('Git monitor directory unavailable', extra={'code': type(error).__name__})
            entry['retry'] = True
            entry['retry_at'] = time.monotonic() + 60
        for parent, dirs, _files in os.walk(root, topdown=True, followlinks=False, onerror=failed):
            dirs[:] = [name for name in dirs if not os.path.islink(os.path.join(parent, name))]
            if parent in entry['paths']:
                continue
            wd = self.lib.inotify_add_watch(entry['fd'], os.fsencode(parent), MASK)
            if wd < 0:
                code=ctypes.get_errno()
                if code in (errno.EBADF,errno.ENFILE,errno.EMFILE,errno.ENOSPC,errno.ENOMEM):
                    raise OSError(code,'git-inotify-watch-unavailable')
                log.warning('Git monitor watch unavailable', extra={'code': str(code)})
                entry['retry'] = True
                entry['retry_at'] = time.monotonic() + 60
                continue
            entry['paths'][parent] = wd
            entry['watches'][wd] = parent

    def remove_tree(self, entry, root):
        for path, wd in list(entry['paths'].items()):
            if path == root or path.startswith(root + os.sep):
                self.lib.inotify_rm_watch(entry['fd'], wd)
                entry['paths'].pop(path, None)
                entry['watches'].pop(wd, None)

    def inventory(self):
        wanted = {}
        for project in Project.objects.filter(creation_state='READY').only('id', 'root'):
            root = Path(project.root)
            try:
                if root.is_absolute() and root.resolve() == root and root.is_dir():
                    wanted[project.pk] = str(root)
            except OSError:
                continue
        for project_id, entry in list(self.projects.items()):
            if wanted.get(project_id) != entry['root'] or (entry.get('retry') and time.monotonic() >= entry.get('retry_at', 0)):
                self.close_project(project_id)
        for project_id, root in wanted.items():
            if project_id in self.projects:
                continue
            fd = self.lib.inotify_init1(os.O_NONBLOCK | os.O_CLOEXEC)
            if fd < 0:
                raise OSError(ctypes.get_errno(),'git-inotify-unavailable')
            entry = {'root': root, 'fd': fd, 'paths': {}, 'watches': {}, 'retry': False}
            self.projects[project_id] = entry
            self.add_tree(entry, root)
            self.mark(project_id)

    def events(self, project_id, entry):
        for _batch in range(8):
            try:
                data = os.read(entry['fd'], 262144)
            except BlockingIOError:
                return
            offset = 0
            while offset + 16 <= len(data):
                wd, mask, _cookie, length = struct.unpack_from('iIII', data, offset)
                name = os.fsdecode(data[offset + 16:offset + 16 + length].split(b'\0', 1)[0])
                offset += 16 + length
                if mask & OVERFLOW:
                    self.mark(project_id)
                    entry['retry'] = True
                    entry['retry_at'] = 0
                    self.next_inventory = 0
                    continue
                parent = entry['watches'].get(wd)
                if parent is None:
                    continue
                if mask & IGNORED:
                    entry['paths'].pop(parent, None)
                    entry['watches'].pop(wd, None)
                    continue
                self.mark(project_id)
                path = os.path.join(parent, name) if name else parent
                if mask & DIRECTORY and mask & (0x00000040 | 0x00000200):
                    self.remove_tree(entry, path)
                if mask & DIRECTORY and mask & (0x00000080 | 0x00000100):
                    if os.path.isdir(path) and not os.path.islink(path):
                        self.add_tree(entry, path)
                if mask & (0x00000400 | 0x00000800):
                    self.remove_tree(entry, parent)
                    self.next_inventory = 0

    def ready(self, now):
        return next_ready(self.pending, self.last_started, self.settings, now)

    @staticmethod
    def reconcile(project_id):
        from .project_git import refresh_status
        try:
            refresh_status(project_id)
        finally:
            close_old_connections()

    def tick(self):
        now = time.monotonic()
        if now >= self.next_settings:
            self.settings = read()
            self.next_settings = now + 5
        if now >= self.next_inventory:
            self.inventory()
            self.next_inventory = time.monotonic() + 10
        for project_id, entry in list(self.projects.items()):
            self.events(project_id, entry)
        if self.future is not None and self.future.done():
            try:
                self.future.result()
            except Exception as error:
                log.warning('Git monitor reconciliation unavailable', extra={'code': type(error).__name__})
            self.future = None
        now = time.monotonic()
        if self.future is None and (project_id := self.ready(now)) is not None:
            self.pending.pop(project_id, None)
            self.last_started[project_id] = now
            self.future = self.pool.submit(self.reconcile, project_id)

    def close(self):
        for project_id in list(self.projects):
            self.close_project(project_id)
        self.pool.shutdown(wait=True, cancel_futures=True)


def run(stop):
    from .service_recovery import InotifyMonitor
    watcher = InotifyMonitor(GitMonitor,'inotify-git','Surveillance inotify Git')
    try:
        while not stop.wait(.2):
            try:
                watcher.tick()
            except Exception as error:
                log.warning('Git monitor unavailable', extra={'code': type(error).__name__})
                stop.wait(5)
    finally:
        watcher.close()
        close_old_connections()
