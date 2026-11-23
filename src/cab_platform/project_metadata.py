"""Instantané public de project.env : liste fermée, aucune évaluation shell."""
import base64
import os
from pathlib import Path
import re
import stat
from urllib.parse import urlsplit

FORGES=('FORGEJO','GITHUB','GITLAB')
SUFFIXES=('BASE_URL','OWNER','REPOSITORY','NAME','BRANCH')
KEYS={'PROJECT_ID','PROJECT_NAME','PROJECT_VERSION','PROJECT_VERSION_POLICY','PROJECT_TYPE','PROJECT_DOCKERED','PROJECT_DEBIAN_PACKAGE','REMOTE_GITLAB_REGISTRY','GIT_USER_NAME','GIT_USER_EMAIL','LOCAL_DEFAULT_BRANCH'}|{f'REMOTE_{forge}_{suffix}' for forge in FORGES for suffix in SUFFIXES}
ASSIGNMENT=re.compile(r'''\s*([A-Z][A-Z0-9_]*)\s*=\s*(?:'([^'\r\n]*)'|"([^"\r\n]*)"|([^'"\r\n]*?))\s*(?:\s+\#.*)?''')
SCALAR_KEY = re.compile(r'\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=')

def public_value(key,value):
    if not value or len(value)>500 or any(ord(c)<32 for c in value) or any(c in value for c in '$`\\'):return False
    if key.endswith('_BASE_URL'):
        try:
            url=urlsplit(value)
            return url.scheme in ('http','https') and bool(url.hostname) and url.username is None and url.password is None and not url.query and not url.fragment and url.port!=0 and not any(c.isspace() for c in value)
        except ValueError:return False
    if key=='PROJECT_ID':
        from .project_ids import valid
        return valid(value)
    if key in ('PROJECT_DOCKERED','PROJECT_DEBIAN_PACKAGE'):return value.lower() in ('yes','no','true','false','1','0')
    if key=='PROJECT_NAME':return len(value)<=120 and bool(re.fullmatch(r'[\w .,+()&:/@-]+',value))
    if key=='GIT_USER_NAME':return len(value)<=120 and bool(re.fullmatch(r'[\w .,+()&/@-]+',value))
    if key=='PROJECT_TYPE':return bool(re.fullmatch(r'[\w .,+#()/-]+',value))
    if key=='PROJECT_VERSION':
        from .versioning import canonical_version,VersionError
        try:canonical_version(value);return True
        except VersionError:return False
    if key=='PROJECT_VERSION_POLICY':
        return value in tuple('1234567')
    return bool(re.fullmatch(r'[\w./@+-]+',value))


def version_configuration(raw: bytes) -> dict[str, str]:
    from .versioning import VersionError, historical_version, inferred_policy, parse_policy
    values = {}
    for line in raw.decode('utf-8').splitlines():
        key = SCALAR_KEY.match(line)
        if not key or key[1] not in ('PROJECT_VERSION', 'PROJECT_VERSION_POLICY'):
            continue
        name = key[1]
        match = ASSIGNMENT.fullmatch(line) if len(line) <= 4096 else None
        if not match or name in values:
            raise VersionError('version-configuration-invalid')
        values[name] = next(part for part in match.groups()[1:] if part is not None).strip()
    version = values.get('PROJECT_VERSION')
    if version:
        version = historical_version(version)
    components = inferred_policy(version)
    if 'PROJECT_VERSION_POLICY' in values:
        policy = parse_policy(values['PROJECT_VERSION_POLICY'])
        if version and policy != components:
            raise VersionError('version-policy-mismatch')
    return values


def initialize_version_policy(raw: bytes) -> bytes:
    from .versioning import historical_version, inferred_policy
    values = version_configuration(raw)
    if 'PROJECT_VERSION_POLICY' in values:
        return raw
    version = values.get('PROJECT_VERSION')
    policy = inferred_policy(historical_version(version) if version else None)
    newline = b'' if not raw or raw.endswith(b'\n') else b'\n'
    return raw + newline + f'PROJECT_VERSION_POLICY={policy}\n'.encode('ascii')

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
            if key=='PROJECT_VERSION':
                from .versioning import historical_version,VersionError
                try:value=historical_version(value)
                except VersionError:invalid=True;continue
            if public_value(key,value):values[key]=value
            else:invalid=True
        return {'state':'partial' if invalid else 'ready','values':values}
    except FileNotFoundError:return {'state':'missing','values':{}}
    except (OSError,UnicodeError):return {'state':'unavailable','values':{}}

def synchronize(project_id,include_forges=True,include_git=True):
    from django.db import transaction
    from .core.models import Project,ProjectMetadataProjection
    # La lecture et la mise à jour sont sérialisées pour éviter qu'une sélection
    # retardée réinstalle un instantané antérieur à celui du watcher.
    with transaction.atomic():
        project=Project.objects.select_for_update().get(pk=project_id)
        snapshot=read_metadata(project.root)
        if snapshot['state'] in ('ready','partial') and 'PROJECT_VERSION_POLICY' not in snapshot['values']:
            from .core.commands import Refused
            from .forge_settings import file_operation
            from .versioning import VersionError
            try:
                source=file_operation(project,{'op':'env-read'})
                raw=base64.b64decode(source['content'],validate=True)
                changed=initialize_version_policy(raw)
                if changed!=raw:
                    file_operation(project,{'op':'env-write','digest':source['digest'],'content':base64.b64encode(changed).decode('ascii')})
                    snapshot=read_metadata(project.root)
            except VersionError as error:
                snapshot['version_policy_error']=str(error)
            except (Refused,ValueError,OSError):
                snapshot['version_policy_error']='version-policy-file-unavailable'
        elif 'PROJECT_VERSION_POLICY' in snapshot['values']:
            from .versioning import VersionError, parse_policy, policy_parts
            values=snapshot['values']
            if values.get('PROJECT_VERSION'):
                try:policy_parts(values['PROJECT_VERSION'],parse_policy(values['PROJECT_VERSION_POLICY']))
                except VersionError as error:snapshot['version_policy_error']=str(error)
        snapshot['project_root']=project.root
        previous=project.public_metadata or {}
        tokens_changed=False
        if include_forges:
            from .forge_settings import synchronize_tokens
            from .core.commands import Refused
            try:tokens_changed=synchronize_tokens(project);tokens_valid=True
            except Refused:tokens_valid=False
        else:
            values=snapshot.get('values',{})
            snapshot['values']={**{key:value for key,value in values.items() if not key.startswith('REMOTE_')},**{key:value for key,value in previous.get('values',{}).items() if key.startswith('REMOTE_') and key in KEYS}}
        if include_git:
            from .project_git import probe
            observed_git=probe(project)
            configuration=dict(project.configuration or {})
            if observed_git is not None:
                if configuration.get('git_initialized') != observed_git:
                    configuration['git_initialized']=observed_git
                    project.configuration=configuration;project.save(update_fields=['configuration'])
                snapshot['git_initialized']=observed_git
            elif configuration.get('git_initialized') in (0,1):
                snapshot['git_initialized']=configuration['git_initialized']
        elif 'git_initialized' in previous:snapshot['git_initialized']=previous['git_initialized']
        if 'git_status' in previous:snapshot['git_status']=previous['git_status']
        if 'git_commit_progress' in previous:snapshot['git_commit_progress']=previous['git_commit_progress']
        if 'git_delivery' in previous:snapshot['git_delivery']=previous['git_delivery']
        if 'forge_comparisons' in previous:snapshot['forge_comparisons']=previous['forge_comparisons']
        if 'forge_refresh' in previous:snapshot['forge_refresh']=previous['forge_refresh']
        if include_forges:
            from .forge_version import cached
            snapshot['forge_versions']=cached(snapshot.get('values',{}))
            from .forge_auth import inputs
            auth=(project.configuration or {}).get('forge_auth',{})
            credentials={forge:inputs(project,snapshot.get('values',{}),forge) for forge in FORGES}
            changed_forges=tuple(forge for forge,(url,owner,token,signature) in credentials.items() if tokens_valid and url and owner and token and auth.get(forge,{}).get('signature')!=signature)
            snapshot['forge_auth']={forge:(auth.get(forge,{}).get('state') if tokens_valid and all(credentials[forge][:3]) and auth.get(forge,{}).get('signature')==credentials[forge][3] else None) for forge in FORGES}
            if changed_forges:
                from .forge_auth import enqueue
                transaction.on_commit(lambda:enqueue(project_id,changed_forges,changed=True))
        else:
            for key in ('forge_versions','forge_auth'):
                if key in previous:snapshot[key]=previous[key]
        from .forge_repository import identity
        records=(project.configuration or {}).get('forge_repositories',{})
        cached=previous.get('forge_repositories',{})
        snapshot['forge_repositories']={forge:value for forge,value in cached.items() if forge in FORGES and isinstance(value,dict) and records.get(forge,{}).get('observed_signature')==identity(project,snapshot.get('values',{}),forge)}
        if tokens_changed or 'git_version' in previous or any(previous.get(key)!=value for key,value in snapshot.items()):
            snapshot['revision']=int(previous.get('revision',0))+1
            project.public_metadata=snapshot;project.save(update_fields=['public_metadata'])
        projection,created=ProjectMetadataProjection.objects.get_or_create(pk=project.pk,defaults={'public_metadata':project.public_metadata})
        if not created and projection.public_metadata!=project.public_metadata:
            projection.public_metadata=project.public_metadata;projection.save(update_fields=['public_metadata'])
        return project.public_metadata
