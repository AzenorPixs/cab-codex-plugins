"""Instantané public de project.env : liste fermée, aucune évaluation shell."""
import base64
import hashlib
import os
from pathlib import Path
import re
import stat
from urllib.parse import urlsplit

FORGES=('FORGEJO','GITHUB','GITLAB')
DEBIAN_RETENTION = 'PROJECT_DEBIAN_RETENTION'
DOCKER_RETENTION = 'PROJECT_DOCKER_RETENTION'
RETENTION = re.compile(r'(?:(?P<count>[0-9]+)(?:,(?P<days>[0-9]+)D)?|(?P<duration>[0-9]+)D)')
LANGUAGES = 'PROJECT_LANGUAGES'
FRAMEWORKS = 'PROJECT_FRAMEWORKS'
DATABASES = 'PROJECT_DB'
SPECIFICATIONS = 'PROJECT_SPECIFICATIONS'
DEFAULT_SPECIFICATIONS = 'OpenSpec'
LEGACY_LANGUAGES = 'PROJECT_TYPE'
SUFFIXES=('BASE_URL','OWNER','REPOSITORY','NAME','BRANCH')
KEYS={DEBIAN_RETENTION,DOCKER_RETENTION,LANGUAGES,FRAMEWORKS,DATABASES,SPECIFICATIONS,'PROJECT_ID','PROJECT_NAME','PROJECT_VERSION','PROJECT_VERSION_POLICY','PROJECT_DOCKERED','PROJECT_DEBIAN_PACKAGE','REMOTE_GITLAB_REGISTRY','GIT_USER_NAME','GIT_USER_EMAIL','LOCAL_DEFAULT_BRANCH'}|{f'REMOTE_{forge}_{suffix}' for forge in FORGES for suffix in SUFFIXES}
ASSIGNMENT=re.compile(r'''\s*([A-Z][A-Z0-9_]*)\s*=\s*(?:'([^'\r\n]*)'|"([^"\r\n]*)"|([^'"\r\n]*?))\s*(?:\s+\#.*)?''')
SCALAR_KEY = re.compile(r'\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=')
REGISTRY = re.compile(r'[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?(?::[0-9]{1,5})?')

def artifact_retention(value: str) -> tuple[int, int | None]:
    if not value:
        return 0, None
    match = RETENTION.fullmatch(value)
    if not match or len(value)>500:
        raise ValueError('project-artifact-retention-invalid')
    days = match['days'] or match['duration']
    return int(match['count'] or 0), int(days) if days is not None else None


def public_value(key,value):
    if not value or len(value)>500 or any(ord(c)<32 for c in value) or any(c in value for c in '$`\\'):return False
    if key.endswith('_BASE_URL'):
        try:
            url=urlsplit(value)
            return url.scheme in ('http','https') and bool(url.hostname) and url.username is None and url.password is None and not url.query and not url.fragment and url.port!=0 and not any(c.isspace() for c in value)
        except ValueError:return False
    if key in (DEBIAN_RETENTION,DOCKER_RETENTION):return RETENTION.fullmatch(value) is not None
    if key=='PROJECT_ID':
        from .project_ids import valid
        return valid(value)
    if key in ('PROJECT_DOCKERED','PROJECT_DEBIAN_PACKAGE'):return value.lower() in ('yes','no','true','false','1','0')
    if key=='PROJECT_NAME':return len(value)<=120 and bool(re.fullmatch(r'[\w .,+()&:/@-]+',value))
    if key=='GIT_USER_NAME':return len(value)<=120 and bool(re.fullmatch(r'[\w .,+()&/@-]+',value))
    if key==LANGUAGES:return bool(re.fullmatch(r'[\w .,+#()/-]+',value))
    if key in (FRAMEWORKS,DATABASES):
        return all(re.fullmatch(r'[\w .+#()/-]+',item.strip()) for item in value.split(','))
    if key==SPECIFICATIONS:
        return bool(re.fullmatch(r'[\w .+#()/-]+',value))
    if key=='PROJECT_VERSION':
        from .versioning import canonical_version,VersionError
        try:canonical_version(value);return True
        except VersionError:return False
    if key=='PROJECT_VERSION_POLICY':
        return value in tuple('1234567')
    if key=='REMOTE_GITLAB_REGISTRY':
        return bool(REGISTRY.fullmatch(value))
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

def rename_project_languages(source: str) -> str:
    lines = source.splitlines(keepends=True)
    assignments = {}
    for index, line in enumerate(lines):
        key = SCALAR_KEY.match(line)
        if not key or key[1] not in (LANGUAGES, LEGACY_LANGUAGES):
            continue
        name = key[1]
        body = line.rstrip('\r\n')
        match = ASSIGNMENT.fullmatch(body) if len(body) <= 4096 else None
        if name in assignments or match is None:
            assignments[name] = None
            continue
        group = next(i for i in (2,3,4) if match.group(i) is not None)
        value = match[group].strip()
        suffix = body[match.end(group)+(group != 4):].lstrip()
        comment = suffix+line[len(body):] if suffix.startswith('#') else ''
        assignments[name] = index, key.span(1), value, comment
    if LEGACY_LANGUAGES not in assignments:
        return source
    legacy = assignments[LEGACY_LANGUAGES]
    if legacy is None or (legacy[2] and not public_value(LANGUAGES,legacy[2])):
        raise ValueError('project-languages-migration-conflict')
    index, (start,end), value, comment = legacy
    if LANGUAGES in assignments:
        current = assignments[LANGUAGES]
        if current is None or current[2] != value:
            raise ValueError('project-languages-migration-conflict')
        indentation = lines[index][:start]
        lines[index] = indentation+comment if comment else ''
    else:
        lines[index] = lines[index][:start]+LANGUAGES+lines[index][end:]
    return ''.join(lines)


def migrate_project_languages(project, before: bytes, after: bytes):
    from .core.commands import Refused
    from .forge_settings import file_operation
    digest = hashlib.sha256(after).hexdigest()
    try:
        file_operation(project, {'op':'env-write','digest':hashlib.sha256(before).hexdigest(),
                                  'content':base64.b64encode(after).decode('ascii')})
    except Refused:
        # Le reçu d’écriture peut être perdu après le remplacement.
        pass
    try:
        if file_operation(project, {'op':'env-read'})['digest']==digest:
            return
    except Refused:
        pass
    raise ValueError('project-languages-migration-unconfirmed')


def read_metadata(root, *, keys=KEYS, diagnostic=False, project=None, with_digest=False):
    issues=[]
    digest=None
    migration_error=None
    def result(state, values=None):
        snapshot={'state':state,'values':values or {}}
        if diagnostic:
            snapshot['issues']=issues
        if with_digest:
            snapshot['source_digest']=digest
        if migration_error:
            snapshot['language_migration_error']=migration_error
        return snapshot

    root=Path(root)
    if not root.is_absolute() or root.resolve()!=root:return result('unsafe')
    try:
        fd=os.open(root/'project.env',os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
        with os.fdopen(fd,'rb') as stream:
            info=os.fstat(stream.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_nlink!=1 or info.st_size>1024*1024:return result('unsafe')
            raw=stream.read(1024*1024+1)
            if len(raw)>1024*1024:return result('unsafe')
        source = raw.decode('utf-8')
        if LEGACY_LANGUAGES in source:
            try:
                changed = rename_project_languages(source)
                if changed != source:
                    migrated = changed.encode('utf-8')
                    if project is not None:
                        migrate_project_languages(project,raw,migrated)
                    raw,source = migrated,changed
            except ValueError as error:
                migration_error = str(error)
                issues.append({'key':LANGUAGES,'reason':migration_error})
        if with_digest:
            digest=hashlib.sha256(raw).hexdigest()
        lines=source.splitlines();values={};seen=set()
        for number,line in enumerate(lines,1):
            key_match=re.match(r'\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=',line)
            if not key_match or key_match[1] not in keys:continue
            key=key_match[1];match=ASSIGNMENT.fullmatch(line) if len(line)<=4096 else None
            if key in seen or not match:
                issues.append({'key':key,'line':number,'reason':'duplicate' if key in seen else 'invalid-syntax'})
                values.pop(key,None);seen.add(key);continue
            seen.add(key);value=next(part for part in match.groups()[1:] if part is not None).strip()
            if not value:continue
            if key=='PROJECT_VERSION':
                from .versioning import historical_version,VersionError
                try:value=historical_version(value)
                except VersionError:
                    issues.append({'key':key,'line':number,'reason':'invalid-version'})
                    continue
            if public_value(key,value):values[key]=value
            else:issues.append({'key':key,'line':number,'reason':'invalid-value'})
        return result('partial' if issues else 'ready',values)
    except FileNotFoundError:
        digest='missing'
        return result('missing')
    except (OSError,UnicodeError):return result('unavailable')

def synchronize(project_id,include_forges=True,include_git=True,verify_source=False):
    from django.db import transaction
    from .core.models import Project,ProjectMetadataProjection
    # La lecture et la mise à jour sont sérialisées pour éviter qu'une sélection
    # retardée réinstalle un instantané antérieur à celui du watcher.
    with transaction.atomic():
        project=Project.objects.select_for_update().get(pk=project_id)
        snapshot=read_metadata(project.root,project=project,with_digest=verify_source,diagnostic=verify_source)
        if (snapshot['state'] in ('ready','partial') and not snapshot.get('language_migration_error')
                and 'PROJECT_VERSION_POLICY' not in snapshot['values']):
            from .core.commands import Refused
            from .forge_settings import file_operation
            from .versioning import VersionError
            try:
                source=file_operation(project,{'op':'env-read'})
                raw=base64.b64decode(source['content'],validate=True)
                changed=initialize_version_policy(raw)
                if changed!=raw:
                    file_operation(project,{'op':'env-write','digest':source['digest'],'content':base64.b64encode(changed).decode('ascii')})
                    snapshot=read_metadata(project.root,project=project,with_digest=verify_source,diagnostic=verify_source)
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
        if snapshot['state'] in ('ready','partial','missing'):
            snapshot['values'].setdefault(SPECIFICATIONS,DEFAULT_SPECIFICATIONS)
        source_digest = snapshot.pop('source_digest',None)
        source_issues = snapshot.pop('issues',[])
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
        errors=('language_migration_error','version_policy_error')
        if (tokens_changed or 'git_version' in previous
                or any(previous.get(key)!=value for key,value in snapshot.items())
                or any(key in previous and key not in snapshot for key in errors)):
            snapshot['revision']=int(previous.get('revision',0))+1
            project.public_metadata=snapshot;project.save(update_fields=['public_metadata'])
        projection,created=ProjectMetadataProjection.objects.get_or_create(pk=project.pk,defaults={'public_metadata':project.public_metadata})
        if not created and projection.public_metadata!=project.public_metadata:
            projection.public_metadata=project.public_metadata;projection.save(update_fields=['public_metadata'])
        return (project.public_metadata,source_digest,source_issues) if verify_source else project.public_metadata
