"""Inventaire PostgreSQL et projection des constructions d’artefacts."""
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
from .core.models import GitDelivery, GitDeliveryStep, Maintenance, Project, ProjectArtifact, ProjectArtifactBuild
from .project_metadata import read_metadata

FLAGS = {'debian': 'PROJECT_DEBIAN_PACKAGE', 'docker': 'PROJECT_DOCKERED'}
DOCKER_KEYS = frozenset((FLAGS['docker'], 'PROJECT_ID', 'PROJECT_VERSION'))
BUILDERS = {'debian': build_debian, 'docker': build_docker}
ACTIVE = ('PENDING', 'RUNNING', 'UNKNOWN')
DOCKER_FIELDS = ('Id', 'RepoTags', 'Size', 'Os', 'Architecture', 'Created')
DOCKER_FORMAT = '[' + ','.join('{{json .' + field + '}}' for field in DOCKER_FIELDS) + ']'
logger = logging.getLogger(__name__)


class BuildConfigurationRefused(Refused):
    def __init__(self, source, kind, expected_version=None):
        super().__init__('artifact-build-config-changed')
        self.configuration = {'state': source['state'], 'issues': source['issues']}
        if expected_version is not None and source['state'] == 'ready':
            values = source['values']
            if values.get('PROJECT_VERSION', '') != expected_version:
                self.configuration['issues'].append({'key': 'PROJECT_VERSION', 'reason': 'changed'})
            if not enabled(values, kind):
                self.configuration['issues'].append({'key': FLAGS[kind], 'reason': 'disabled'})


def build_metadata(project, kind):
    options = {'keys': DOCKER_KEYS} if kind == 'docker' else {}
    return read_metadata(project.root, diagnostic=True, project=project, **options)


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


def docker_inventory(project, metadata, *, tag=None):
    name = metadata.get('PROJECT_ID') or project.identifier or ''
    if not DOCKER_NAME.fullmatch(name):
        return {}
    refs = [name + ':' + tag] if tag else [name + ':latest']
    if not tag and (version := metadata.get('PROJECT_VERSION')):
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
    for family in (kind,) if kind else FLAGS:
        source = build_metadata(project, family)
        metadata = source['values']
        if source['state'] != 'ready' or not enabled(metadata, family):
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


def latest_builds(project):
    builds = {}
    dates = {}
    public_fields = ('phase', 'steps', 'configuration', 'diagnostic', 'exit_code', 'process_started')
    for row in ProjectArtifactBuild.objects.filter(project=project).order_by('kind', '-created', '-pk').distinct('kind'):
        dates[row.kind] = row.created
        builds[row.kind] = {
            'source': 'factory',
            'request_id': row.pk, 'state': row.state, 'version': row.version,
            'created': row.created.isoformat(), 'error': row.receipt.get('error'),
            **{key: row.receipt[key] for key in public_fields if key in row.receipt},
        }
    steps = GitDeliveryStep.objects.filter(
        delivery__project=project,
        key__in=[f'build:{kind}' for kind in FLAGS],
        state__in=('RUNNING', 'COMPLETED', 'FAILED', 'UNKNOWN'),
    ).select_related('delivery').order_by('key', '-updated', '-pk').distinct('key')
    for step in steps:
        kind = step.key.removeprefix('build:')
        manual = builds.get(kind)
        if manual and (manual['state'] in ACTIVE or dates[kind] >= step.updated):
            continue
        builds[kind] = {
            'source': 'delivery', 'delivery_id': step.delivery_id,
            'state': step.state, 'version': step.delivery.version, 'created': step.updated.isoformat(),
            'error': step.receipt.get('error'),
            **{key: step.receipt[key] for key in public_fields if key in step.receipt},
        }
    return builds


def snapshot(project):
    values = project.public_metadata.get('values', {})
    return {
        'enabled': {kind: enabled(values, kind) for kind in FLAGS},
        'artifacts': [
            {'key': f'{row.kind}:{row.artifact_key}', 'kind': row.kind,
             'generated_at': row.generated_at.isoformat(), **row.metadata}
            for row in ProjectArtifact.objects.filter(project=project).order_by('kind', '-generated_at', 'artifact_key')
        ],
        'builds': latest_builds(project),
    }


def require_available(project):
    from .core.models import ProjectForgeArtifactPublication
    build = ProjectArtifactBuild.objects.filter(project=project, state__in=ACTIVE).first()
    if build:
        refuse_blocker(build,'factory','artifact-build-active',kind=build.kind)
    publication = ProjectForgeArtifactPublication.objects.filter(project=project,state__in=ACTIVE).first()
    if publication:
        refuse_blocker(publication,'publication','artifact-build-active',forge=publication.forge)


def require_artifact_delivery_available(project,code='session-delivery-active'):
    delivery = GitDelivery.objects.filter(project=project,state__in=(*ACTIVE,'PARTIAL')).first()
    if delivery:
        refuse_blocker(delivery,'delivery',code,version=delivery.version)


def refuse_blocker(operation,source,code,**target):
    raise Refused(code,409,details={'phase':'request','steps':['request'],'process_started':False,
        'blocking_operation':{'id':str(operation.pk),'source':source,'state':operation.state,
                              'created':operation.created.isoformat(),**target}})


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
    require_artifact_delivery_available(project)
    source = build_metadata(project, kind)
    if source['state'] != 'ready':
        raise BuildConfigurationRefused(source, kind)
    metadata = source['values']
    require(enabled(metadata, kind), 'artifact-build-disabled', 409)
    build = ProjectArtifactBuild.objects.create(pk=request_id, project=project, kind=kind, version=metadata.get('PROJECT_VERSION', ''))
    return {'request_id': build.pk, 'state': build.state}


def run_build(build_id):
    close_old_connections()
    build = ProjectArtifactBuild.objects.select_related('project').get(pk=build_id)
    receipt = {'phase': 'configuration', 'steps': ['configuration'], 'process_started': False}

    def mark(payload):
        phase = payload.get('build_phase') or payload.get('diagnostic', {}).get('phase')
        if phase and phase != receipt['phase']:
            receipt['phase'] = phase
            receipt['steps'].append(phase)
        for key in ('child', 'diagnostic'):
            if key in payload:
                receipt[key] = payload[key]
        if 'child' in payload:
            receipt['process_started'] = True
        ProjectArtifactBuild.objects.filter(pk=build.pk, state='RUNNING').update(receipt=receipt)

    try:
        source = build_metadata(build.project, build.kind)
        metadata = source['values']
        if (source['state'] != 'ready' or not enabled(metadata, build.kind)
                or metadata.get('PROJECT_VERSION', '') != build.version):
            raise BuildConfigurationRefused(source, build.kind, build.version)
        mark({'build_phase': 'sources'})
        code = BUILDERS[build.kind](build.project, metadata, mark)
    except BuildConfigurationRefused as error:
        state = 'FAILED'
        receipt.update(error=error.code, configuration=error.configuration)
    except Refused as error:
        state = 'FAILED'
        receipt['error'] = error.code
    except (OSError, subprocess.SubprocessError, ValueError, KeyError):
        issued = receipt['process_started']
        state = 'UNKNOWN' if issued else 'FAILED'
        receipt['error'] = 'artifact-build-unconfirmed' if issued else 'artifact-build-failed'
    else:
        state = 'COMPLETED' if code == 0 else 'FAILED'
        receipt['exit_code'] = code
        if code == 0:
            mark({'build_phase': 'inventory'})
            try:
                refresh(build.project, build.kind)
            except (Refused, OSError, ValueError):
                receipt['diagnostic'] = {'phase': 'inventory', 'code': 'artifact-inventory-unavailable'}
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
            state='FAILED', receipt={'error':'artifact-build-worker-not-started',
                                     'phase':'configuration','steps':['configuration'],'process_started':False})
