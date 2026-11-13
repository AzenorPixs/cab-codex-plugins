"""Publication fixe de STATISTICS.md sous UID légitime, sans verrou fichier."""
import hashlib
import json
import os
from pathlib import Path
import secrets
import stat
import sys
from .native_sources import directory

def publish(packet):
    root=Path(packet['root']);path=Path(packet['path'])
    if root.resolve()!=root or not path.is_relative_to(root) or path.name!='STATISTICS.md' or path.resolve()!=path:raise ValueError('statistics-target-invalid')
    parent=directory(path.parent);temporary='.cab-statistics-'+secrets.token_hex(12)
    def current():
        try:fd=os.open(path.name,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK,dir_fd=parent)
        except FileNotFoundError:return None
        with os.fdopen(fd,'rb') as stream:
            info=os.fstat(stream.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_nlink!=1:raise ValueError('statistics-target-unsafe')
            return hashlib.file_digest(stream,'sha256').hexdigest()
    try:
        if current()!=packet['expected']:raise ValueError('statistics-local-conflict')
        raw=packet['content'].encode('utf-8');fd=os.open(temporary,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o770,dir_fd=parent)
        with os.fdopen(fd,'wb') as stream:
            stream.write(raw);stream.flush();os.fsync(stream.fileno());os.fchmod(stream.fileno(),packet.get('mode',0o770))
            if os.getuid()==0:os.fchown(stream.fileno(),packet.get('uid',0),packet['gid'])
        if current()!=packet['expected']:raise ValueError('statistics-local-conflict')
        os.replace(temporary,path.name,src_dir_fd=parent,dst_dir_fd=parent);os.fsync(parent)
        return {'sha256':hashlib.sha256(raw).hexdigest(),'path':str(path)}
    finally:
        try:os.unlink(temporary,dir_fd=parent)
        except FileNotFoundError:pass
        os.close(parent)

if __name__=='__main__':
    try:print(json.dumps({'ok':True,'result':publish(json.load(sys.stdin))}))
    except ValueError as error:
        code=str(error) if str(error) in {'statistics-local-conflict','statistics-target-invalid','statistics-target-unsafe'} else 'statistics-publication-failed'
        print(json.dumps({'ok':False,'error':code}));raise SystemExit(2)
    except (OSError,KeyError):print(json.dumps({'ok':False,'error':'statistics-publication-failed'}));raise SystemExit(2)
