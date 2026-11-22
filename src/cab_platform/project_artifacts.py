"""Inventaire PostgreSQL des artefacts et suivi des générations manuelles."""
from datetime import datetime, timezone as utc
import json
import logging
import os
from pathlib import Path
import re
import stat
import subprocess
import threading

from django.db import close_old_connections, connection, transaction
from django.utils import timezone

from .artifact_builders import (
    ARCH, DOCKER, DOCKER_NAME, ENV, PACKAGE, VERSION, build_debian, build_docker, opened, project_root,
)
from .connector_process import alive, identity
from .core.commands import Refused, identifier, require
from .core.models import GitDelivery, Maintenance, Project, ProjectArtifact, ProjectArtifactBuild
from .project_metadata import read_metadata

FLAGS = {'debian': 'PROJECT_DEBIAN_PACKAGE', 'docker': 'PROJECT_DOCKERED'}
BUILDERS = {'debian': build_debian, 'docker': build_docker}
ACTIVE = ('PENDING', 'RUNNING', 'UNKNOWN')
DOCKER_FIELDS = ('Id', 'RepoTags', 'Size', 'Os', 'Architecture', 'Created')
DOCKER_FORMAT = '[' + ','.join('{{json .' + field + '}}' for field in DOCKER_FIELDS) + ']'
logger = logging.getLogger(__name__)


def enabled(metadata, kind):
    return metadata.get(FLAGS[kind], '').lower() in ('yes', '1')


def debian_inventory(project):
    root = project_root(project)
    latest = {}
    from .build_workspace import artifact_directory
    directories=[root/'dist',artifact_directory(project)]
    for directory in directories:
        latest.update(_debian_directory(directory))
    return latest


def _debian_directory(directory):
    latest={}
    try:
        with opened(directory, directory=True) as folder:
            for name in os.listdir(folder):
                if not re.fullmatch(r'[a-zA-Z0-9_+.:~\-]{1,250}\.deb', name):
                    continue
                try:
                    with opened(name, parent=folder) as fd:
                        info = os.fstat(fd)
                        if not stat.S_ISREG(info.st_mode):
                            continue
                        fields = subprocess.run(
                            ['/usr/bin/dpkg-deb', '-f', f'/proc/self/fd/{fd}', 'Package', 'Version', 'Architecture'],
                            pass_fds=(fd,), env=ENV, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=5,
                        )
                    if fields.returncode != 0 or len(fields.stdout) > 2048:
                        continue
                    metadata = dict(line.split(': ', 1) for line in fields.stdout.decode().splitlines())
                    package, version, arch = (metadata[key] for key in ('Package', 'Version', 'Architecture'))
                except (OSError, subprocess.SubprocessError, ValueError, KeyError):
                    continue
                if not (PACKAGE.fullmatch(package) and VERSION.fullmatch(version) and ARCH.fullmatch(arch)):
                    continue
                when = datetime.fromtimestamp(info.st_mtime, tz=utc.utc)
                key = f'{package}:{arch}'
                row = {'package': package, 'version': version, 'architecture': arch, 'filename': name, 'size': info.st_size,'storage':str(directory)}
                if key not in latest or (when, name) > (latest[key][0], latest[key][1]['filename']):
                    latest[key] = when, row
    except OSError:
        return {}
    return latest


def docker_inventory(project, metadata):
    name = metadata.get('PROJECT_ID') or project.identifier or ''
    if not DOCKER_NAME.fullmatch(name):
        return {}
    refs = [name + ':latest']
    if version := metadata.get('PROJECT_VERSION'):
        refs.append(name + ':' + version)
    for ref in refs:
        try:
            result = subprocess.run([*DOCKER, 'image', 'inspect', '--format', DOCKER_FORMAT, ref],
                                    env=ENV, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=5)
            if result.returncode or len(result.stdout) > 65536:
                continue
            digest, tags, size, system, arch, created = json.loads(result.stdout)
            when = datetime.fromisoformat(created)
            if not when.tzinfo or not re.fullmatch(r'sha256:[a-f0-9]{64}', digest) or type(size) is not int or size < 0:
                continue
            if not (ARCH.fullmatch(system) and ARCH.fullmatch(arch)):
                continue
            tags = sorted(tag for tag in tags or [] if isinstance(tag, str)
                          and re.fullmatch(re.escape(name) + r':[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}', tag))
            return {'local': (when, {'image': name, 'image_id': digest, 'tags': tags,
                                    'platform': f'{system}/{arch}', 'size': size})}
        except (OSError, subprocess.SubprocessError, ValueError, TypeError):
            continue
    return {}


def refresh(project, kind=None):
    source = read_metadata(project.root)
    if source['state'] != 'ready':
        return
    metadata = source['values']
    for family in (kind,) if kind else FLAGS:
        if not enabled(metadata, family):
            continue
        if family == 'debian':
            observed = debian_inventory(project)
        else:
            observed = docker_inventory(project, metadata)
        if not observed:
            continue
        with transaction.atomic():
            Project.objects.select_for_update(no_key=True).get(pk=project.pk)
            for key, (when, values) in observed.items():
                db_row = ProjectArtifact.objects.filter(project=project, kind=family, artifact_key=key).first()
                if db_row is None:
                    ProjectArtifact.objects.create(project=project, kind=family, artifact_key=key,
                                                   generated_at=when, metadata=values)
                elif when >= db_row.generated_at and (when != db_row.generated_at or values != db_row.metadata):
                    db_row.generated_at, db_row.metadata = when, values
                    db_row.save(update_fields=['generated_at', 'metadata'])


def sweep():
    for project in Project.objects.filter(creation_state='READY').iterator():
        try:
            refresh(project)
        except (Refused, OSError, ValueError):
            logger.warning('Inventaire des artefacts indisponible', extra={'project_id': project.pk})


def snapshot(project):
    builds = {}
    for row in ProjectArtifactBuild.objects.filter(project=project).order_by('kind', '-created').distinct('kind'):
        builds[row.kind] = {'state': row.state, 'error': row.receipt.get('error')}
    values = project.public_metadata.get('values', {})
    return {
        'enabled': {kind: enabled(values, kind) for kind in FLAGS},
        'artifacts': [
            {'key': f'{row.kind}:{row.artifact_key}', 'kind': row.kind,
             'generated_at': row.generated_at.isoformat(), **row.metadata}
            for row in ProjectArtifact.objects.filter(project=project).order_by('kind', '-generated_at', 'artifact_key')
        ],
        'builds': builds,
    }


def require_available(project):
    from .core.models import ProjectForgeArtifactPublication
    require(not ProjectArtifactBuild.objects.filter(project=project, state__in=ACTIVE).exists(),
            'artifact-build-active', 409)
    require(not ProjectForgeArtifactPublication.objects.filter(project=project,state__in=ACTIVE).exists(),
            'artifact-build-active',409)


@transaction.atomic
def request_build(project, kind, request_id):
    request_id = identifier(request_id)
    require(kind in FLAGS, 'artifact-kind-invalid', 400)
    with connection.cursor() as cursor:
        cursor.execute('SELECT pg_advisory_xact_lock(%s)', [300001])
    project = Project.objects.select_for_update(no_key=True).get(pk=project.pk)
    previous = ProjectArtifactBuild.objects.filter(pk=request_id).first()
    if previous:
        require(previous.project_id == project.pk and previous.kind == kind, 'artifact-build-request-conflict', 409)
        return {'request_id': previous.pk, 'state': previous.state}
    require(project.creation_state == 'READY', 'artifact-project-path-invalid', 409)
    require(not Maintenance.objects.filter(state__in=('PREPARED', 'INSTALLING')).exists(), 'maintenance-in-progress', 503)
    require_available(project)
    require(not GitDelivery.objects.filter(project=project, state__in=('PENDING', 'RUNNING', 'UNKNOWN', 'PARTIAL')).exists(),
            'session-delivery-active', 409)
    source = read_metadata(project.root)
    require(source['state'] == 'ready', 'artifact-build-config-changed', 409)
    metadata = source['values']
    require(enabled(metadata, kind), 'artifact-build-disabled', 409)
    build = ProjectArtifactBuild.objects.create(pk=request_id, project=project, kind=kind, version=metadata.get('PROJECT_VERSION', ''))
    return {'request_id': build.pk, 'state': build.state}


def run_build(build_id):
    close_old_connections()
    build = ProjectArtifactBuild.objects.select_related('project').get(pk=build_id)
    issued = False

    def mark(payload):
        nonlocal issued
        issued = True
        ProjectArtifactBuild.objects.filter(pk=build.pk, state='RUNNING').update(receipt=payload)

    try:
        source = read_metadata(build.project.root)
        metadata = source['values']
        require(source['state'] == 'ready' and enabled(metadata, build.kind)
                and metadata.get('PROJECT_VERSION', '') == build.version,
                'artifact-build-config-changed', 409)
        code = BUILDERS[build.kind](build.project, metadata, mark)
    except Refused as error:
        state, receipt = 'FAILED', {'error': error.code}
    except (OSError, subprocess.SubprocessError, ValueError, KeyError):
        state = 'UNKNOWN' if issued else 'FAILED'
        receipt = {'error': 'artifact-build-unconfirmed' if issued else 'artifact-build-failed'}
    else:
        state, receipt = ('COMPLETED' if code == 0 else 'FAILED'), {'exit_code': code}
        if code == 0:
            try:
                refresh(build.project, build.kind)
            except (Refused, OSError, ValueError):
                logger.warning('Artefact construit, inventaire indisponible', extra={'project_id': build.project_id})
    ProjectArtifactBuild.objects.filter(pk=build.pk, state='RUNNING').update(state=state, receipt=receipt)
    close_old_connections()


@transaction.atomic
def dispatch():
    with connection.cursor() as cursor:
        cursor.execute('SELECT pg_advisory_xact_lock(%s)', [300001])
    if Maintenance.objects.filter(state__in=('PREPARED', 'INSTALLING')).exists():
        return
    running = ProjectArtifactBuild.objects.filter(state='RUNNING').first()
    if running:
        if alive(running.executor):
            return
        running.state = 'UNKNOWN'
        running.receipt = {**running.receipt, 'error': 'artifact-build-unconfirmed'}
        running.save(update_fields=['state', 'receipt'])
    job = ProjectArtifactBuild.objects.select_for_update().filter(state='PENDING').order_by('created').first()
    if not job:
        return
    job.state, job.executor = 'RUNNING', identity(os.getpid())
    job.save(update_fields=['state', 'executor'])
    transaction.on_commit(lambda: launch(job.pk))


def launch(build_id):
    try:
        threading.Thread(target=run_build, args=(build_id,), name='cab-project-artifact', daemon=True).start()
    except RuntimeError:
        ProjectArtifactBuild.objects.filter(pk=build_id, state='RUNNING').update(
            state='UNKNOWN', receipt={'error': 'artifact-build-unconfirmed'})
