"""Édition ciblée et littérale des métadonnées publiques d’un projet."""
import base64
import hashlib
import hmac
import json
import re
from pathlib import Path
from types import SimpleNamespace
from django.db import transaction,IntegrityError
from django.db.models import Q
from .core.commands import Refused,require
from .core.models import Project,Run,Operation,Lease,StatisticsJob,VersionPolicyMigration
from .core.commands import TERMINAL
from .paths import config
from .forge_settings import file_operation
from .project_metadata import ASSIGNMENT,DATABASES,DEBIAN_RETENTION,DEFAULT_SPECIFICATIONS,DOCKER_RETENTION,FRAMEWORKS,LANGUAGES,SPECIFICATIONS,initialize_version_policy,public_value,synchronize

FIELDS=('PROJECT_ID','PROJECT_NAME',LANGUAGES,FRAMEWORKS,DATABASES,SPECIFICATIONS,'PROJECT_DOCKERED','PROJECT_DEBIAN_PACKAGE',DEBIAN_RETENTION,DOCKER_RETENTION,'PROJECT_VERSION','GIT_USER_NAME','GIT_USER_EMAIL','LOCAL_DEFAULT_BRANCH')


def configuration_fields(snapshot):
    values = snapshot.get('values',{})
    fields = {key:values.get(key,'') for key in (*FIELDS,'PROJECT_VERSION_POLICY')}
    fields[LANGUAGES] = values.get(LANGUAGES,values.get('PROJECT_TYPE',''))
    fields[SPECIFICATIONS] = values.get(SPECIFICATIONS) or DEFAULT_SPECIFICATIONS
    return fields


def configuration_revision(project, digest):
    from .paths import secret
    projected = project.public_metadata or {}
    message = json.dumps([project.pk,project.root,digest,configuration_fields(projected)],
                         sort_keys=True,separators=(',',':')).encode('utf-8')
    return hmac.new(secret('django-secret').encode(),message,hashlib.sha256).hexdigest()


def require_configuration_revision(project, digest, revision):
    require(isinstance(revision,str) and hmac.compare_digest(configuration_revision(project,digest),revision),
            'project-configuration-changed',409)


def verify(project_id):
    snapshot,digest,issues = synchronize(project_id,include_forges=False,include_git=False,verify_source=True)
    project = Project.objects.get(pk=project_id)
    env = file_operation(project,{'op':'env-read','allow_missing':True})
    require(project.root==snapshot['project_root'] and env['digest']==digest
            and configuration_fields(project.public_metadata)==configuration_fields(snapshot),
            'project-configuration-changed',409)
    require(snapshot['state'] in ('ready','partial','missing')
            and not any(issue['key'] in (*FIELDS,'PROJECT_VERSION_POLICY') for issue in issues)
            and not snapshot.get('version_policy_error') and not snapshot.get('language_migration_error'),
            snapshot.get('language_migration_error') or 'project-configuration-file-invalid',409)
    return {'fields':configuration_fields(snapshot),'project_path':project.root,
            'revision':configuration_revision(project,digest)}


def edit(project_id,fields,revision,project_path=None):
    require(isinstance(fields,dict) and set(fields)<=set(FIELDS),'project-configuration-fields-invalid',400)
    for key,value in fields.items():require(isinstance(value,str) and (not value or public_value(key,value)),'project-configuration-value-invalid',400)
    if 'PROJECT_ID' in fields:require(bool(fields['PROJECT_ID']),'project-configuration-id-invalid',400)
    written=False
    try:
        with transaction.atomic():
            project=Project.objects.select_for_update().get(pk=project_id)
            require(not VersionPolicyMigration.objects.filter(project=project,state='PENDING').exists(),
                    'version-policy-migration-pending',409)
            if fields.get('PROJECT_VERSION'):
                from .versioning import VersionError, parse_policy, policy_parts
                policy=(project.public_metadata or {}).get('values',{}).get('PROJECT_VERSION_POLICY')
                if policy is not None:
                    try:policy_parts(fields['PROJECT_VERSION'],parse_policy(policy))
                    except VersionError as error:raise Refused(str(error),409) from error
            identifier=fields.get('PROJECT_ID',project.identifier)
            if identifier:
                require(not Project.objects.exclude(pk=project.pk).filter(Q(identifier=identifier)|Q(pk=identifier)).exists(),'project-configuration-id-conflict',409)
            current=file_operation(project,{'op':'env-read','allow_missing':True})
            digest=current['digest']
            require_configuration_revision(project,digest,revision)
            target=project.root
            if project_path is not None:
                require(isinstance(project_path,str) and len(project_path)<=1500 and not any(c in project_path for c in '\r\n\0'),'project-path-invalid',400)
                if project_path:
                    candidate=Path(project_path)
                else:
                    base=config().get('projects_root','');require(isinstance(base,str) and base and identifier,'project-path-invalid',400)
                    candidate=Path(base)/identifier
                require(candidate.is_absolute() and candidate!=Path('/') and candidate.is_dir() and candidate.resolve()==candidate,'project-path-invalid',400)
                target=str(candidate)
            if target!=project.root:
                require(not Project.objects.exclude(pk=project.pk).filter(root=target).exists(),'project-path-conflict',409)
                require(not Run.objects.filter(project=project,state__in=('WORKING','FINALIZATION_PENDING','FINALIZING','REVIEW_PENDING','ACCEPTED')).exists(),'project-path-busy',409)
                require(not Operation.objects.filter(run__project=project).exclude(state__in=TERMINAL).exists() and not Lease.objects.filter(run__project=project,state='HELD').exists() and not StatisticsJob.objects.filter(project=project,state='RUNNING').exists(),'project-path-busy',409)
                target_project=SimpleNamespace(root=target,owner_uid=project.owner_uid)
                try:target_env=file_operation(target_project,{'op':'env-read'})
                except Refused:raise Refused('project-path-different',409) from None
                require(target_env['digest']==current['digest'],'project-path-different',409)
            try:text=base64.b64decode(current['content'],validate=True).decode('utf-8')
            except (ValueError,UnicodeError):raise Refused('project-configuration-file-invalid',409) from None
            seen=set();lines=[]
            for line in text.splitlines(keepends=True):
                match_key=re.match(r'\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=',line)
                if match_key and match_key.group(1) in fields:
                    key=match_key.group(1);match=ASSIGNMENT.fullmatch(line.rstrip('\r\n'))
                    require(key not in seen and match is not None,'project-configuration-file-invalid',409);seen.add(key)
                    group=next(index for index in (2,3,4) if match.group(index) is not None)
                    previous=match.group(group).strip()
                    if previous!=fields[key]:
                        newline='\r\n' if line.endswith('\r\n') else '\n' if line.endswith('\n') else ''
                        body=line[:-len(newline)] if newline else line
                        start,end=match.span(group)
                        if group in (2,3):start-=1;end+=1
                        line=body[:start]+json.dumps(fields[key],ensure_ascii=False)+body[end:]+newline
                lines.append(line)
            for key in FIELDS:
                value=fields.get(key,'')
                if key not in seen and value:
                    if lines and not lines[-1].endswith(('\n','\r')):lines[-1]+='\n'
                    lines.append(key+'='+json.dumps(value,ensure_ascii=False)+'\n')
            content=''.join(lines).encode('utf-8')
            if digest=='missing':content=initialize_version_policy(content)
            destination=SimpleNamespace(root=target,owner_uid=project.owner_uid)
            if content!=base64.b64decode(current['content'],validate=True):
                try:file_operation(destination,{'op':'env-write','digest':digest,'content':base64.b64encode(content).decode()});written=True
                except Refused:raise Refused('project-configuration-uncertain',409) from None
            final_env=file_operation(destination,{'op':'env-read'})
            require(final_env['digest']==hashlib.sha256(content).hexdigest(),'project-configuration-changed',409)
            updated=[]
            if target!=project.root:project.root=target;updated.append('root')
            if identifier and project.identifier!=identifier:project.identifier=identifier;updated.append('identifier')
            if updated:project.save(update_fields=updated)
            synchronize(project.pk)
            return {'saved':True,'identifier':project.identifier or project.pk}
    except IntegrityError:
        if written:raise Refused('project-configuration-uncertain',409) from None
        raise Refused('project-configuration-id-conflict',409) from None
    except Refused:
        if written:raise Refused('project-configuration-uncertain',409) from None
        raise
