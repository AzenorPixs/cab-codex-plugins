"""Instantané public de project.env : liste fermée, aucune évaluation shell."""
import os
from pathlib import Path
import re
import stat
from urllib.parse import urlsplit

FORGES=('FORGEJO','GITHUB','GITLAB')
SUFFIXES=('BASE_URL','OWNER','REPOSITORY','NAME','BRANCH','SSL_VERIFY')
KEYS={'PROJECT_NAME','PROJECT_VERSION','PROJECT_TYPE'}|{f'REMOTE_{forge}_{suffix}' for forge in FORGES for suffix in SUFFIXES}
ASSIGNMENT=re.compile(r'''\s*([A-Z][A-Z0-9_]*)\s*=\s*(?:'([^'\r\n]*)'|"([^"\r\n]*)"|([^'"\r\n]*?))\s*(?:\s+\#.*)?''')

def public_value(key,value):
    if not value or len(value)>500 or any(ord(c)<32 for c in value) or any(c in value for c in '$`\\'):return False
    if key.endswith('_BASE_URL'):
        try:
            url=urlsplit(value)
            return url.scheme in ('http','https') and bool(url.hostname) and url.username is None and url.password is None and not url.query and not url.fragment and url.port!=0 and not any(c.isspace() for c in value)
        except ValueError:return False
    if key.endswith('_SSL_VERIFY'):return value.lower() in ('0','1','true','false','yes','no')
    if key=='PROJECT_NAME':return len(value)<=120 and bool(re.fullmatch(r'[\w .,+()&:/@-]+',value))
    if key=='PROJECT_TYPE':return bool(re.fullmatch(r'[\w .,+#()/-]+',value))
    if key=='PROJECT_VERSION':return bool(re.fullmatch(r'[\w.+-]+',value))
    return bool(re.fullmatch(r'[\w./@+-]+',value))

def read_metadata(root):
    root=Path(root)
    if not root.is_absolute() or root.resolve()!=root:return {'state':'unsafe','values':{}}
    try:
        fd=os.open(root/'project.env',os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
        with os.fdopen(fd,'rb') as stream:
            info=os.fstat(stream.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_nlink!=1 or info.st_size>1024*1024:return {'state':'unsafe','values':{}}
            raw=stream.read(1024*1024+1)
            if len(raw)>1024*1024:return {'state':'unsafe','values':{}}
        lines=raw.decode('utf-8').splitlines();values={};seen=set();invalid=False
        for line in lines:
            key_match=re.match(r'\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=',line)
            if not key_match or key_match[1] not in KEYS:continue
            key=key_match[1];match=ASSIGNMENT.fullmatch(line) if len(line)<=4096 else None
            if key in seen or not match:
                values.pop(key,None);seen.add(key);invalid=True;continue
            seen.add(key);value=next(part for part in match.groups()[1:] if part is not None).strip()
            if not value:continue
            if public_value(key,value):values[key]=value
            else:invalid=True
        return {'state':'partial' if invalid else 'ready','values':values}
    except FileNotFoundError:return {'state':'missing','values':{}}
    except (OSError,UnicodeError):return {'state':'unavailable','values':{}}

def synchronize(project_id):
    from django.db import transaction
    from .core.models import Project,ProjectMetadataProjection
    # La lecture et la mise à jour sont sérialisées pour éviter qu'une sélection
    # retardée réinstalle un instantané antérieur à celui du watcher.
    with transaction.atomic():
        project=Project.objects.select_for_update().get(pk=project_id)
        snapshot=read_metadata(project.root)
        previous=project.public_metadata or {}
        if any(previous.get(key)!=value for key,value in snapshot.items()):
            snapshot['revision']=int(previous.get('revision',0))+1
            project.public_metadata=snapshot;project.save(update_fields=['public_metadata'])
        projection,created=ProjectMetadataProjection.objects.get_or_create(pk=project.pk,defaults={'public_metadata':project.public_metadata})
        if not created and projection.public_metadata!=project.public_metadata:
            projection.public_metadata=project.public_metadata;projection.save(update_fields=['public_metadata'])
        return project.public_metadata
