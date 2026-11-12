"""Configuration privée et écritures atomiques du service."""
import json
import os
import secrets
import stat
import copy
from pathlib import Path

STATE = Path(os.environ.get('CAB_STATE_DIR', '/var/lib/cab'))
RUNTIME = Path(os.environ.get('CAB_RUNTIME_DIR', '/run/cab'))
CONFIG = Path(os.environ.get('CAB_CONFIG', '/etc/cab/cab.json'))
_active_config = None

def private_dir(path):
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    info=path.lstat()
    if not stat.S_ISDIR(info.st_mode) or path.resolve()!=path or info.st_uid!=os.getuid() or info.st_mode&0o077:
        raise RuntimeError('cab-private-directory-unsafe')
    return path

def atomic_json(path,value):
    private_dir(path.parent)
    temporary=path.with_name('.'+path.name+'.'+secrets.token_hex(8))
    fd=os.open(temporary,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
    try:
        with os.fdopen(fd,'w',encoding='utf-8') as stream:
            json.dump(value,stream,ensure_ascii=False,sort_keys=True);stream.write('\n');stream.flush();os.fsync(stream.fileno())
        os.replace(temporary,path)
        parent=os.open(path.parent,os.O_DIRECTORY)
        try:os.fsync(parent)
        finally:os.close(parent)
    finally:
        temporary.unlink(missing_ok=True)

def read_json(path,default=None):
    try:fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
    except FileNotFoundError:return default
    with os.fdopen(fd,'r',encoding='utf-8') as stream:
        info=os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_nlink!=1 or info.st_uid!=os.getuid() or info.st_mode&0o077 or info.st_size>4*1024*1024:
            raise RuntimeError('cab-private-file-unsafe')
        return json.load(stream)

def config():return read_json(CONFIG,{})

def runtime_config():
    """Configuration active du processus ; les changements techniques attendent son redémarrage."""
    global _active_config
    if _active_config is None or not _active_config.get('initialized'):
        _active_config=config()
    return copy.deepcopy(_active_config)

def secret(name):
    private_dir(STATE);path=STATE/(name+'.json');value=read_json(path)
    if value is None:
        value={'value':secrets.token_urlsafe(48)};atomic_json(path,value)
    return value['value']
