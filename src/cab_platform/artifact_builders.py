"""Construction locale des recettes Debian et Docker des projets."""
from contextlib import contextmanager
from datetime import datetime
import json
import hashlib
import os
from pathlib import Path
import pwd
import re
import shutil
import stat
import subprocess
import sys
import tarfile
from tempfile import TemporaryDirectory
from uuid import uuid4

from .core.commands import SECRET, Refused, require

PACKAGE = re.compile(r'[a-z0-9][a-z0-9+.-]{1,99}')
ARCH = re.compile(r'[a-z0-9][a-z0-9-]{0,49}')
VERSION = re.compile(r'[0-9][A-Za-z0-9.+:~\-]{0,99}')
DOCKER_NAME = re.compile(r'[a-z0-9]+(?:[._-]+[a-z0-9]+)*')
DOCKER = ['/usr/bin/docker', '--host', 'unix:///var/run/docker.sock']
ENV = {'PATH': '/usr/bin:/bin', 'LANG': 'C.UTF-8'}
PRIVATE = {'.git', '.opencode', 'openspec', 'deb', 'dist', '.cache', '__pycache__',
           'node_modules', '.mypy_cache', '.pytest_cache', '.ruff_cache', '.venv',
           'venv', 'logs', 'tmp', '.env'}
PRIVATE_SUFFIX = ('.pyc', '.pyo', '.log', '.tmp', '.temp', '.swp', '.swo',
                  '~', '.bak', '.orig', '.rej')


def project_root(project):
    root = Path(project.root)
    require(root.is_absolute() and root.resolve() == root and root.is_dir(),
            'artifact-project-path-invalid', 409)
    return root


def printable(value):
    return isinstance(value, str) and bool(value) and len(value) <= 4000 and value.isprintable()


def parts(value, *, absolute=False):
    require(printable(value) and value.startswith('/') == absolute, 'artifact-recipe-invalid', 409)
    path = value[1:] if absolute else value
    names = path.split('/')
    require(all(name not in ('', '.', '..') for name in names), 'artifact-recipe-invalid', 409)
    return names


def safe_source(name):
    return name not in PRIVATE and not name.endswith(PRIVATE_SUFFIX) and not SECRET.search(name)


@contextmanager
def opened(path, *, parent=None, directory=False):
    flags = os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK
    if directory:
        flags |= os.O_DIRECTORY
    fd = os.open(path, flags, dir_fd=parent)
    try:
        yield fd
    finally:
        os.close(fd)


@contextmanager
def source(root_fd, names):
    name, *rest = names
    require(safe_source(name), 'artifact-source-private', 409)
    with opened(name, parent=root_fd, directory=bool(rest)) as fd:
        if rest:
            with source(fd, rest) as descendant:
                yield descendant
        else:
            yield fd


def regular(fd):
    info = os.fstat(fd)
    require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1, 'artifact-source-invalid', 409)
    return info


def read_small(fd, limit):
    require(regular(fd).st_size <= limit, 'artifact-recipe-invalid', 409)
    with os.fdopen(os.dup(fd), 'rb') as stream:
        raw = stream.read(limit + 1)
    require(len(raw) <= limit, 'artifact-recipe-invalid', 409)
    return raw


def copy_source(fd, destination):
    info = os.fstat(fd)
    if stat.S_ISDIR(info.st_mode):
        destination.mkdir()
        for name in sorted(os.listdir(fd)):
            require(safe_source(name), 'artifact-source-private', 409)
            with opened(name, parent=fd) as child:
                copy_source(child, destination / name)
    else:
        regular(fd)
        with os.fdopen(os.dup(fd), 'rb') as infile, destination.open('xb') as out:
            shutil.copyfileobj(infile, out)
    destination.chmod(stat.S_IMODE(info.st_mode) & 0o755)


def recipe(root_fd):
    with source(root_fd, ['build', 'debian-package.json']) as fd:
        data = json.loads(read_small(fd, 1024 * 1024))
    keys = {'package', 'architecture', 'maintainer', 'description', 'depends', 'version', 'files', 'maintainer_scripts'}
    require(isinstance(data, dict) and not (data.keys() - keys), 'artifact-recipe-invalid', 409)
    for key, pattern in (('package', PACKAGE), ('architecture', ARCH)):
        value = data.get(key)
        require(isinstance(value, str) and pattern.fullmatch(value), 'artifact-recipe-invalid', 409)
    require(all(printable(data.get(key)) for key in ('maintainer', 'description')), 'artifact-recipe-invalid', 409)
    deps = data.get('depends', [])
    require(isinstance(deps, list) and all(map(printable, deps)), 'artifact-recipe-invalid', 409)
    return data


def cab_runtime_recipe(data):
    return any(isinstance(item,dict) and item.get('destination')=='/usr/lib/cab/runtime-manifest.json'
               for item in (data.get('files') or []))


def verify_cab_debian(fd, version):
    from .client import ClientError
    from .update import preflight_package
    path=f'/proc/self/fd/{fd}'
    control=subprocess.run(['/usr/bin/dpkg-deb','-f',path,'Package','Version'],pass_fds=(fd,),
                           env=ENV,capture_output=True,text=True,timeout=15)
    require(control.returncode==0 and control.stdout.splitlines()==['Package: cab',f'Version: {version}'],
            'debian-package-version-invalid',409)
    try:
        return preflight_package(path,version,pass_fds=(fd,),require_payload_hashes=True)
    except ClientError as error:
        raise Refused(str(error),409) from error


def prepare_cab_runtime(project, root, root_fd, scratch, version, mark):
    """Préparer en espace privé avec l’identité POSIX du projet."""
    require(project.owner_uid>0,'artifact-debian-build-owner-invalid',409)
    from .package_versions import inspect as version_inspect
    versions=version_inspect(root,version)
    if versions['mismatches']:
        mark({'diagnostic':{'phase':'payload-preparation','code':'package-source-version-not-aligned','paths':versions['mismatches'],'remediation':'prepare-reserved-package-versions'}})
        raise Refused('artifact-debian-source-version-not-aligned',409)
    account=pwd.getpwuid(project.owner_uid)
    group=project.owner_gid if project.owner_gid is not None else account.pw_gid
    with source(root_fd,['packaging','prepare.py']) as fd:
        regular(fd)
    node=shutil.which('node',path=ENV['PATH'])
    require(node is not None,'artifact-debian-node-unavailable',409)
    scratch.chmod(0o711)
    generated=scratch/'generated'
    generated.mkdir(mode=0o700)
    os.chown(generated,project.owner_uid,group)
    code=execute([sys.executable,'-B',str(root/'packaging/prepare.py'),'--output',str(generated),
                  '--dependencies',str(root/'output/package'),'--node',node,'--expected-version',version],mark,
                 options={'user':project.owner_uid,'group':group,'extra_groups':os.getgrouplist(account.pw_name,group)},
                 env={**ENV,'HOME':str(generated)},diagnostic_phase='payload-preparation')
    require(code==0,'artifact-debian-payload-preparation-failed',409)
    return generated


def write_package_tree(root_fd, tree, data, version, *, prepared_fd=None):
    control = tree / 'DEBIAN'
    control.mkdir()
    control.chmod(0o755)
    conffiles = []
    destinations = []
    files = data.get('files')
    require(isinstance(files, list) and files, 'artifact-recipe-invalid', 409)
    for item in files:
        require(isinstance(item, dict) and not (item.keys() - {'source', 'destination', 'conffile', 'empty_json', 'mode'}),
                'artifact-recipe-invalid', 409)
        names = parts(item.get('source'))
        dest = parts(item.get('destination'), absolute=True)
        require(dest[0] != 'DEBIAN', 'artifact-recipe-invalid', 409)
        suffix = Path(*dest)
        require(all(suffix != other and suffix not in other.parents and other not in suffix.parents
                    for other in destinations), 'artifact-recipe-invalid', 409)
        destinations.append(suffix)
        require(all(type(item[key]) is bool for key in ('conffile', 'empty_json') if key in item),
                'artifact-recipe-invalid', 409)
        mode = item.get('mode')
        require('mode' not in item or isinstance(mode, str) and re.fullmatch('0[0-7]{3}', mode),
                'artifact-recipe-invalid', 409)
        require(not (len(names) == 1 and names[0] == 'build' or names == ['build', 'debian-package.json']),
                'artifact-source-invalid', 409)
        target = tree / suffix
        parent = tree
        for name in dest[:-1]:
            parent /= name
            if not parent.exists():
                parent.mkdir()
                parent.chmod(0o755)
        source_root,source_names=(prepared_fd,names[2:]) if prepared_fd is not None and names[:2]==['output','package'] else (root_fd,names)
        require(source_names,'artifact-source-invalid',409)
        with source(source_root, source_names) as fd:
            if mode is not None or item.get('conffile') or item.get('empty_json'):
                regular(fd)
            copy_source(fd, target)
        if item.get('empty_json'):
            with opened(target) as fd:
                require(json.loads(read_small(fd, 65536)) == [], 'artifact-recipe-invalid', 409)
        if mode is not None:
            target.chmod(int(mode, 8))
        if item.get('conffile'):
            conffiles.append('/' + str(suffix))
    scripts = data.get('maintainer_scripts', {})
    require(isinstance(scripts, dict) and not (scripts.keys() - {'preinst', 'postinst', 'prerm', 'postrm'}),
            'artifact-recipe-invalid', 409)
    for name, path in scripts.items():
        with source(root_fd, parts(path)) as fd:
            require(regular(fd).st_size > 0, 'artifact-source-invalid', 409)
            copy_source(fd, control / name)
        (control / name).chmod(0o755)
    content = {'Package': data['package'], 'Version': version, 'Architecture': data['architecture'],
               'Maintainer': data['maintainer'], 'Description': data['description']}
    if data.get('depends'):
        content['Depends'] = ', '.join(data['depends'])
    (control / 'control').write_text(''.join(f'{key}: {value}\n' for key, value in content.items()), encoding='utf-8')
    (control / 'control').chmod(0o644)
    if conffiles:
        (control / 'conffiles').write_text(''.join(path+'\n' for path in conffiles), encoding='utf-8')
        (control / 'conffiles').chmod(0o644)


def execute(argv, mark, *, options=None, env=None,diagnostic_phase=None):
    if diagnostic_phase:
        import tempfile
        with tempfile.TemporaryFile() as output:
            process=subprocess.Popen(argv,env=env or ENV,stdin=subprocess.DEVNULL,stdout=output,stderr=output,start_new_session=True,umask=0o022,**(options or {}))
            from .connector_process import identity
            mark({'child':identity(process.pid),'build_phase':diagnostic_phase})
            code=process.wait(timeout=3600)
            if code:
                output.seek(0,2);size=output.tell();output.seek(max(0,size-65536));tail=output.read()
                known={'package-source-version-mismatch':'prepare-reserved-package-versions','package-payload-version-invalid':'prepare-reserved-package-versions','pinned-electric-image-extraction-required':'restore-pinned-electric-dependency','locked-python-vendor-required':'restore-locked-python-vendor','frontend-build-required':'qualify-frontend-build','source-symlink-refused':'inspect-public-source-links'}
                if diagnostic_phase=='payload-preparation':
                    reason=next((name for name in known if name.encode() in tail),'payload-source-build-failed')
                    diagnostic={'code':reason,'remediation':known.get(reason,'qualify-corrected-sources'),
                                'typescript_codes':sorted(set(s.decode() for s in re.findall(rb'\bTS[0-9]{3,6}\b',tail)))}
                else:
                    indicators={
                        b'Cannot connect to the Docker daemon':'artifact-docker-daemon-unavailable',
                        b'pull access denied':'artifact-docker-pull-denied',
                        b'no space left on device':'artifact-build-storage-full',
                    }
                    diagnostic={'code':next((reason for indicator,reason in indicators.items() if indicator in tail),
                                            'artifact-build-command-failed')}
                mark({'diagnostic':{**diagnostic,'phase':diagnostic_phase,'exit_code':code}})
            return code
    process = subprocess.Popen(argv, env=env or ENV, stdin=subprocess.DEVNULL,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                               start_new_session=True, umask=0o022, **(options or {}))
    from .connector_process import identity
    mark({'child': identity(process.pid)})
    return process.wait(timeout=3600)


def debian_version(project, root, metadata, data):
    value = metadata.get('PROJECT_VERSION') or data.get('version')
    if not value and os.path.lexists(root / '.git'):
        from .git_commit_remove import context, run
        options, env = context(project)
        tags = run(project, options, env, 'tag', '--points-at', 'HEAD')
        require(tags.returncode == 0, 'artifact-version-invalid', 409)
        names = tags.stdout.decode().splitlines()
        if any(re.fullmatch(r'v?(0|[1-9]\d*)(\.(0|[1-9]\d*)){0,6}', name) for name in names):
            names = [name for name in names if not re.fullmatch(r'v?\d{4}(\.\d{2}){4}', name)]
        versions = {name.removeprefix('v') for name in names}
        require(len(versions) <= 1, 'artifact-version-invalid', 409)
        value = next(iter(versions), None)
    return value or datetime.now().strftime('%Y.%m.%d.%H.%M')


def package_contents(fd):
    """Comparer le contrôle et le contenu, indépendamment des dates du conteneur Debian."""
    def archive_contents(section):
        command = ['/usr/bin/dpkg-deb', section, f'/proc/self/fd/{fd}']
        contents = {}
        with subprocess.Popen(command, pass_fds=(fd,), env=ENV, stdout=subprocess.PIPE,
                              stderr=subprocess.DEVNULL) as process:
            try:
                with tarfile.open(fileobj=process.stdout, mode='r|') as archive:
                    for item in archive:
                        stream = archive.extractfile(item) if item.isfile() else None
                        digest = hashlib.file_digest(stream, 'sha256').hexdigest() if stream else ''
                        contents[item.name] = (item.type, item.mode, item.uid, item.gid, item.linkname, digest)
                code = process.wait(timeout=30)
            except (OSError, tarfile.TarError, subprocess.SubprocessError) as error:
                process.kill()
                raise Refused('artifact-debian-existing-invalid', 409) from error
            require(code == 0, 'artifact-debian-existing-invalid', 409)
        return contents
    return tuple(archive_contents(section) for section in ('--ctrl-tarfile', '--fsys-tarfile'))


def build_debian(project,metadata,mark):
    from .build_workspace import source
    with source(project) as prepared:return _build_debian(prepared,metadata,mark)


def _build_debian(project, metadata, mark):
    root = project_root(project)
    with opened(root, directory=True) as root_fd:
        data = recipe(root_fd)
        version = debian_version(project, root, metadata, data)
        require(isinstance(version, str) and VERSION.fullmatch(version), 'artifact-version-invalid', 409)
        version_status = subprocess.run(['/usr/bin/dpkg', '--validate-version', version], env=ENV,
                                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
        require(version_status.returncode == 0, 'artifact-version-invalid', 409)
        from .build_workspace import artifact_directory
        with opened(artifact_directory(project),directory=True) as dist_fd, TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            tree = tmp_path / 'tree'
            tree.mkdir(mode=0o700)
            cab_runtime=cab_runtime_recipe(data)
            if cab_runtime:
                generated=prepare_cab_runtime(project,root,root_fd,tmp_path,version,mark)
                with opened(generated,directory=True) as prepared_fd:
                    write_package_tree(root_fd,tree,data,version,prepared_fd=prepared_fd)
            else:
                write_package_tree(root_fd,tree,data,version)
            filename = f"{data['package']}_{version}_{data['architecture']}.deb"
            archive = tmp_path / filename
            code = execute(['/usr/bin/dpkg-deb', '--build', '--root-owner-group', str(tree), str(archive)], mark,
                           diagnostic_phase='debian-build')
            if code == 0:
                if cab_runtime:
                    with opened(archive) as candidate:
                        verify_cab_debian(candidate,version)
                try:
                    with opened(filename, parent=dist_fd) as existing, opened(archive) as candidate:
                        regular(existing)
                        require(package_contents(existing) == package_contents(candidate),
                                'artifact-debian-version-conflict', 409)
                    return 0
                except FileNotFoundError:
                    pass
                import secrets
                temporary = '.cab-' + secrets.token_hex(12)
                fd = os.open(temporary, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644, dir_fd=dist_fd)
                try:
                    with os.fdopen(fd, 'wb') as out, archive.open('rb') as built:
                        os.fchmod(out.fileno(), 0o644)
                        shutil.copyfileobj(built, out)
                        out.flush()
                        os.fsync(out.fileno())
                    try:
                        os.link(temporary, filename, src_dir_fd=dist_fd, dst_dir_fd=dist_fd, follow_symlinks=False)
                    except FileExistsError as error:
                        raise Refused('artifact-debian-version-conflict', 409) from error
                finally:
                    try:
                        os.unlink(temporary, dir_fd=dist_fd)
                    except FileNotFoundError:
                        pass
            return code


def docker_args(root_fd):
    try:
        with source(root_fd, ['build', 'docker-build.args']) as fd:
            raw = read_small(fd, 65536)
    except FileNotFoundError:
        return []
    require(b'\0' not in raw and b'\r' not in raw, 'artifact-docker-args-invalid', 409)
    args = {}
    for line in raw.decode('utf-8').split('\n'):
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        name, equal, value = line.partition('=')
        require(equal and re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', name) and name not in args,
                'artifact-docker-args-invalid', 409)
        args[name] = value
    return [token for key, value in args.items() for token in ('--build-arg', f'{key}={value}')]


def docker_image_details(reference, options, env):
    fields = ('Id', 'Os', 'Architecture', 'Variant', 'RootFS', 'Config')
    template = '[' + ','.join('{{json (index . "' + field + '")}}' for field in fields) + ']'
    result = subprocess.run([*DOCKER, 'image', 'inspect', '--format', template, reference], env=env,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10, **options)
    if result.returncode:
        require(b'No such image' in result.stderr or b'not found' in result.stderr,
                'artifact-docker-inspection-failed', 409)
        return None
    return json.loads(result.stdout)


def build_docker(project, metadata, mark):
    from .build_workspace import REFERENCE, source as isolated_source
    if REFERENCE.get() is None:
        return _build_docker(project, metadata, mark)
    with isolated_source(project) as snapshot:
        return _build_docker(snapshot, metadata, mark)


def _build_docker(project, metadata, mark):
    root = project_root(project)
    image = metadata.get('PROJECT_ID') or project.identifier or ''
    require(DOCKER_NAME.fullmatch(image), 'artifact-docker-name-invalid', 409)
    with opened(root, directory=True) as root_fd:
        for name in ('dockerfile', 'entrypoint.sh'):
            with source(root_fd, [name]) as fd:
                regular(fd)
        args = docker_args(root_fd)
    account = pwd.getpwuid(project.owner_uid)
    group = project.owner_gid if project.owner_gid is not None else account.pw_gid
    require(project.owner_uid != 0 and os.geteuid() in (0, project.owner_uid), 'artifact-docker-owner-invalid', 409)
    options = {'user': account.pw_uid, 'group': group, 'extra_groups': os.getgrouplist(account.pw_name, group)} if os.geteuid()==0 else {}
    env = {**ENV, 'HOME': account.pw_dir}
    latest = image + ':latest'
    version = metadata.get('PROJECT_VERSION')
    require(isinstance(version,str) and re.fullmatch(r'[0-9][A-Za-z0-9_.-]{0,99}',version),
            'artifact-docker-version-required',409)
    tagged = f'{image}:{version}'
    previous = docker_image_details(tagged, options, env)
    temporary = f'{image}:cab-build-{uuid4().hex}' if previous else None
    argv = [*DOCKER, 'build', '--file', str(root / 'dockerfile'), '--tag', temporary or latest]
    if tagged and not temporary:
        argv += ['--tag', tagged]
    code = execute([*argv, *args, str(root)], mark, options=options, env=env, diagnostic_phase='docker-build')
    if not temporary:
        return code
    try:
        if code:
            return code
        candidate = docker_image_details(temporary, options, env)
        current = docker_image_details(tagged, options, env)
        require(candidate and current == previous and candidate[1:] == previous[1:],
                'artifact-docker-version-conflict', 409)
        return execute([*DOCKER, 'image', 'tag', previous[0], latest], mark, options=options, env=env,
                       diagnostic_phase='docker-tag')
    finally:
        subprocess.run([*DOCKER, 'image', 'rm', temporary], env=env, stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL, timeout=10, **options)
