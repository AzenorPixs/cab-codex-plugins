"""Entrées privées de construction ; les sources du projet restent en lecture."""
from contextlib import contextmanager
from contextvars import ContextVar
import copy
import io
import os
from pathlib import Path
import shutil
import tarfile
import tempfile
from .core import commands as c

REFERENCE=ContextVar('cab_build_reference',default=None)


def artifact_directory(project):
    from .paths import STATE
    c.identifier(project.pk)
    path=STATE/'artifacts'/project.pk/'debian'
    path.mkdir(parents=True,exist_ok=True,mode=0o700)
    return path


@contextmanager
def source(project):
    from .artifact_builders import PRIVATE,SECRET
    original=Path(project.root);reference=REFERENCE.get()
    with tempfile.TemporaryDirectory(prefix='cab-build-input-') as directory:
        base=Path(directory);base.chmod(0o711);root=base/'source';root.mkdir()
        if reference:
            from .git_commit_remove import context
            from .session_delivery import _git
            options,env=context(project)
            result=_git(project,options,env,'archive','--format=tar',reference,timeout=120)
            c.require(result.returncode==0,'artifact-frozen-source-unavailable')
            with tarfile.open(fileobj=io.BytesIO(result.stdout),mode='r:') as archive:
                members=[m for m in archive.getmembers() if not SECRET.search(m.name) and not any(part in PRIVATE|{'output','reports','.cab-tests'} for part in Path(m.name).parts)]
                archive.extractall(root,members=members,filter='data')
        else:
            def excluded(path,names):return [n for n in names if n in PRIVATE|{'output','reports','.cab-tests'} or SECRET.search(n)]
            shutil.copytree(original,root,dirs_exist_ok=True,symlinks=True,ignore=excluded)
        # Dépendances de construction en copie privée : Vite/tsc n'écrivent pas
        # leurs caches dans le node_modules du projet.
        for relative in ('frontend/node_modules','output/package/python-vendor','output/package/electric-public'):
            source_path=original/relative
            if source_path.is_dir():
                destination=root/relative;destination.parent.mkdir(parents=True,exist_ok=True)
                shutil.copytree(source_path,destination,symlinks=True,dirs_exist_ok=True)
        for path in [root,*root.rglob('*')]:
            if os.geteuid()==0:os.lchown(path,project.owner_uid,project.owner_gid if project.owner_gid is not None else project.owner_uid)
            if not path.is_symlink():path.chmod(0o755 if path.is_dir() else (path.stat().st_mode&0o111)|0o644)
        surrogate=copy.copy(project);surrogate.root=str(root)
        yield surrogate
