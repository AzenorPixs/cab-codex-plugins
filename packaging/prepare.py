"""Préparation CI : sources choisies, assets compilés, runtimes publics figés."""
import hashlib
import ast
import argparse
import json
from pathlib import Path
import re
import shutil
import stat
import subprocess
import tarfile
import tomllib

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/package'

def validate_versions(root):
    module=ast.parse((root/'src/cab_platform/__init__.py').read_text())
    versions=[ast.literal_eval(node.value) for node in module.body if isinstance(node,ast.Assign) and any(isinstance(target,ast.Name) and target.id=='__version__' for target in node.targets)]
    if len(versions)!=1 or not isinstance(versions[0],str) or not re.fullmatch(r'\d+\.\d+\.\d+',versions[0]):raise RuntimeError('package-source-version-invalid')
    version=versions[0]
    def require(condition):
        if not condition:raise RuntimeError('package-payload-version-invalid')
    require(tomllib.loads((root/'pyproject.toml').read_text())['project']['version']==version)
    require(json.loads((root/'frontend/package.json').read_text())['version']==version)
    lock=json.loads((root/'frontend/package-lock.json').read_text())
    require(lock['version']==version and lock['packages']['']['version']==version)
    require("import {version as buildVersion} from '../package.json'" in (root/'frontend/src/SystemUpdate.tsx').read_text())
    for label,folder in [('CAB','cab'),('CCAB','ccab'),('CABU','cabu'),('CICD','cicd'),('CICDF','cicdf')]:
        base=root/'integrations/codex'/folder
        manifest=base/'.codex-plugin/plugin.json';skill=base/'skills'/folder/'SKILL.md';command=root/'integrations/commands'/(label+'.md')
        require(all(path.is_file() and not path.is_symlink() for path in (manifest,skill,command)))
        data=json.loads(manifest.read_text());require(data.get('name')==label and data.get('version')==version)
        frontmatter=command.read_text().split('---',2)
        require(len(frontmatter)==3 and not frontmatter[0].strip())
        declared=re.findall(r'^version:\s*(\S+)\s*$',frontmatter[1],re.M)
        require(declared==[version])
    return version

def archive(source,destination):
    with tarfile.open(destination,'w:xz') as stream:
        for path in sorted(source.iterdir()):stream.add(path,arcname=path.name,recursive=True)
    return {'file':destination.name,'sha256':hashlib.sha256(destination.read_bytes()).hexdigest()}

def public_modes(root):
    """Seul le payload public généré reçoit ses modes de distribution."""
    for path in [root,*root.rglob('*')]:
        info=path.lstat()
        if stat.S_ISLNK(info.st_mode):raise RuntimeError('public-payload-symlink-refused')
        if stat.S_ISDIR(info.st_mode):path.chmod(0o755)
        elif stat.S_ISREG(info.st_mode):path.chmod(0o644)
        else:raise RuntimeError('public-payload-type-invalid')


def payload_digest(root):
    files={}
    for path in sorted(root.rglob('*')):
        if path.is_file():
            with path.open('rb') as stream:
                files[path.relative_to(root).as_posix()]=hashlib.file_digest(stream,'sha256').hexdigest()
    return hashlib.sha256(json.dumps(files,sort_keys=True,separators=(',',':')).encode()).hexdigest()


def main(*, output=None, dependencies=None, node=None, expected_version=None):
    output=output or OUT
    dependencies=dependencies or OUT
    version=validate_versions(ROOT)
    if expected_version is not None and version!=expected_version:
        raise RuntimeError('package-source-version-mismatch')
    public=dependencies/'electric-public'
    if not (public/'bin/entrypoint').is_file():raise RuntimeError('pinned-electric-image-extraction-required')
    vendor=dependencies/'python-vendor'
    if not (vendor/'django/__init__.py').is_file():raise RuntimeError('locked-python-vendor-required')
    output.mkdir(parents=True,exist_ok=True)
    node=node or shutil.which('node')
    if node is None:raise RuntimeError('frontend-node-unavailable')
    frontend=ROOT/'frontend'
    subprocess.run([node,'node_modules/typescript/bin/tsc','--noEmit'],cwd=frontend,check=True)
    subprocess.run([node,'node_modules/vite/bin/vite.js','build','--outDir',str(output/'web'),
                    '--emptyOutDir'],cwd=frontend,check=True)
    target=output/'python/cab_platform'
    if target.parent.exists():shutil.rmtree(target.parent)
    for source in (ROOT/'src/cab_platform').rglob('*.py'):
        if source.is_symlink():raise RuntimeError('source-symlink-refused')
        dest=target/source.relative_to(ROOT/'src/cab_platform');dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,dest);dest.chmod(0o644)
    public_modes(target.parent)
    if not (output/'web/index.html').is_file():raise RuntimeError('frontend-build-required')
    public_modes(output/'web')
    manifest={'version':version,'platform':'Debian 13 amd64, Python 3.13','electric_image':'electricsql/electric@sha256:efb6fa43859d67cb8c73439e0c8bc0f7a3daa467500fb06f2a924bcb2070c139','python_lock_sha256':hashlib.sha256((ROOT/'packaging/python-lock.txt').read_bytes()).hexdigest(),'archives':{'python-vendor':archive(vendor,output/'python-vendor.tar.xz'),'electric':archive(public,output/'electric.tar.xz')}}

    for name,source in [('plugins',ROOT/'integrations/codex'),('commands',ROOT/'integrations/commands'),('docs',ROOT/'docs')]:
        destination=output/name
        if destination.exists():shutil.rmtree(destination)
        shutil.copytree(source,destination)
        for path in [destination,*destination.rglob('*')]:path.chmod(0o755 if path.is_dir() else 0o644)
    catalog=json.loads((ROOT/'.agents/plugins/marketplace.json').read_text())
    for plugin in catalog['plugins']:plugin['source']['path']='./plugins/'+{'CAB':'cab','CABU':'cabu','CCAB':'ccab','CICD':'cicd','CICDF':'cicdf'}[plugin['name']]
    (output/'marketplace.json').write_text(json.dumps(catalog,indent=2)+'\n')
    manifest['payload_sha256']={name:payload_digest(output/name) for name in ('python','web')}
    (output/'runtime-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'prepared':True,'version':version,'archives':{k:v['sha256'] for k,v in manifest['archives'].items()}}))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description='Préparer le contenu public du paquet CAB.')
    parser.add_argument('--output',type=Path)
    parser.add_argument('--dependencies',type=Path)
    parser.add_argument('--node')
    parser.add_argument('--expected-version')
    args=parser.parse_args()
    main(output=args.output,dependencies=args.dependencies,node=args.node,expected_version=args.expected_version)
