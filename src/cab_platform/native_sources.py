"""Résolution du seul journal natif demandé ; aucun contenu de conversation exporté."""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import pwd
import stat
import sqlite3
import subprocess
import sys
import re
import uuid


class NativeSourceError(ValueError):
    pass


def _index_lookup(home: Path,session_id: str,uid: int,strict: bool) -> str | None:
    candidates=[]
    for path in home.glob('state*.sqlite'):
        match=re.fullmatch(r'state_(\d+)\.sqlite',path.name)
        if match or path.name=='state.sqlite':candidates.append((int(match[1]) if match else -1,path))
    if len(candidates)>8:raise NativeSourceError('native-index-limit')
    if not candidates:return None
    path=max(candidates,key=lambda item:item[0])[1]
    info=path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_uid!=uid or info.st_nlink!=1:
        raise NativeSourceError('native-index-owner-invalid')
    try:
        connection=sqlite3.connect(path.as_uri()+'?mode=ro',uri=True,timeout=1)
        try:
            connection.execute('PRAGMA query_only=ON')
            fields={row[1] for row in connection.execute('PRAGMA table_info(threads)')}
            if not {'id','rollout_path'}<=fields:raise NativeSourceError('native-index-schema-unsupported')
            rows=connection.execute('SELECT substr(rollout_path,1,4097) FROM threads WHERE id=? LIMIT 2',(session_id,)).fetchall()
        finally:connection.close()
    except sqlite3.Error:raise NativeSourceError('native-index-unavailable') from None
    current=path.lstat()
    if (current.st_dev,current.st_ino)!=(info.st_dev,info.st_ino):raise NativeSourceError('native-index-replaced')
    if not rows:
        if strict:raise NativeSourceError('native-thread-not-indexed')
        return None
    if len(rows)!=1:raise NativeSourceError('native-source-ambiguous')
    value=rows[0][0]
    if not isinstance(value,str) or not value or len(value)>4096 or not Path(value).is_absolute():
        raise NativeSourceError('native-source-path-invalid')
    return str(Path(value).resolve())


def indexed_path(uid: int,session_id: str,codex_home: str='',strict: bool=True) -> str | None:
    try:user=pwd.getpwuid(uid)
    except KeyError:raise NativeSourceError('native-source-account-unavailable') from None
    home=Path(codex_home) if codex_home else Path(user.pw_dir)/'.codex'
    if not home.is_absolute() or '..' in home.parts:raise NativeSourceError('native-source-path-invalid')
    home=home.resolve()
    if os.getuid()==uid:
        try:return _index_lookup(home,session_id,uid,strict)
        except OSError:raise NativeSourceError('native-index-unavailable') from None
    if os.getuid()!=0:raise NativeSourceError('native-index-user-required')
    code="from pathlib import Path;import json,sys;from cab_platform.native_sources import _index_lookup;print(json.dumps(_index_lookup(Path(sys.argv[1]),sys.argv[2],int(sys.argv[3]),sys.argv[4]=='1')))"
    env={'HOME':user.pw_dir,'USER':user.pw_name,'LOGNAME':user.pw_name,'PATH':'/usr/bin:/bin','LANG':'C.UTF-8','PYTHONUTF8':'1','PYTHONDONTWRITEBYTECODE':'1','PYTHONPATH':str(Path(__file__).resolve().parent.parent)}
    try:
        result=subprocess.run([sys.executable,'-B','-c',code,str(home),session_id,str(uid),'1' if strict else '0'],user=uid,group=user.pw_gid,extra_groups=os.getgrouplist(user.pw_name,user.pw_gid),env=env,capture_output=True,timeout=3)
        if result.returncode or len(result.stdout)>16384:raise NativeSourceError('native-index-unavailable')
        value=json.loads(result.stdout)
        if value is not None and (not isinstance(value,str) or len(value)>4096):raise NativeSourceError('native-index-unavailable')
        return value
    except (OSError,subprocess.TimeoutExpired,json.JSONDecodeError):raise NativeSourceError('native-index-unavailable') from None


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
    indexed=indexed_path(uid,session_id,codex_home)
    if indexed:return inspect(uid,session_id,project_root,indexed)
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
