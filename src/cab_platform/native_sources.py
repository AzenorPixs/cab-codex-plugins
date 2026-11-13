"""Résolution du seul journal natif demandé ; aucun contenu de conversation exporté."""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import pwd
import stat
import uuid


class NativeSourceError(ValueError):
    pass


def directory(path: Path) -> int:
    if not path.is_absolute() or '..' in path.parts:
        raise NativeSourceError('native-source-path-invalid')
    fd=os.open('/',os.O_RDONLY|os.O_DIRECTORY)
    try:
        for part in path.parts[1:]:
            child=os.open(part,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=fd)
            os.close(fd);fd=child
        return fd
    except OSError:
        os.close(fd)
        raise


def inspect(uid: int, session_id: str, project_root: str, source_file: str) -> dict:
    path=Path(source_file)
    if not path.is_absolute() or '..' in path.parts:
        raise NativeSourceError('native-source-path-invalid')
    try:
        parent=directory(path.parent)
        try:fd=os.open(path.name,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK,dir_fd=parent)
        finally:os.close(parent)
        with os.fdopen(fd,'rb') as stream:
            info=os.fstat(stream.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_uid!=uid or info.st_nlink!=1:
                raise NativeSourceError('native-source-owner-invalid')
            first=stream.readline(65537)
        if len(first)>65536:raise NativeSourceError('native-source-header-invalid')
        identity=json.loads(first)
        if not isinstance(identity,dict) or identity.get('type')!='session_meta' or not isinstance(identity.get('payload'),dict) or identity['payload'].get('id')!=session_id or identity['payload'].get('cwd')!=project_root:
            raise NativeSourceError('native-source-identity-divergent')
        return {'source_file':str(path),'device':info.st_dev,'inode':info.st_ino,'uid':info.st_uid}
    except FileNotFoundError:
        raise NativeSourceError('native-source-not-found') from None
    except (json.JSONDecodeError,UnicodeError):
        raise NativeSourceError('native-source-header-invalid') from None
    except OSError:
        raise NativeSourceError('native-source-unavailable') from None


def locate(uid: int, session_id: str, project_root: str, codex_home: str='') -> dict:
    try:
        identity=uuid.UUID(session_id)
        if str(identity)!=session_id or identity.version!=7:
            raise ValueError('uuid-v7-required')
        day=datetime.fromtimestamp((identity.int>>80)/1000,timezone.utc).strftime('%Y/%m/%d')
    except (ValueError,TypeError,AttributeError,OverflowError,OSError):
        raise NativeSourceError('native-source-explicit-path-required') from None
    try:home=Path(codex_home) if codex_home else Path(pwd.getpwuid(uid).pw_dir)/'.codex'
    except KeyError:raise NativeSourceError('native-source-account-unavailable') from None
    folder=home/'sessions'/day
    try:
        fd=directory(folder)
        try:
            candidates=[]
            with os.scandir(fd) as entries:
                for index,entry in enumerate(entries):
                    if index>=10000:raise NativeSourceError('native-source-directory-limit')
                    if entry.name.startswith('rollout-') and entry.name.endswith('-'+session_id+'.jsonl'):
                        candidates.append(entry.name)
                        if len(candidates)>1:raise NativeSourceError('native-source-ambiguous')
        finally:os.close(fd)
        if not candidates:raise NativeSourceError('native-source-not-found')
        return inspect(uid,session_id,project_root,str(folder/candidates[0]))
    except FileNotFoundError:
        raise NativeSourceError('native-source-not-found') from None
    except OSError:
        raise NativeSourceError('native-source-unavailable') from None
