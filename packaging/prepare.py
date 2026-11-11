"""Préparation CI : sources choisies, assets compilés, runtimes publics figés."""
import hashlib
import json
from pathlib import Path
import shutil
import tarfile

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/package'

def archive(source,destination):
    with tarfile.open(destination,'w:xz') as stream:
        for path in sorted(source.iterdir()):stream.add(path,arcname=path.name,recursive=True)
    return {'file':destination.name,'sha256':hashlib.sha256(destination.read_bytes()).hexdigest()}

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    target=OUT/'python/cab_platform'
    if target.parent.exists():shutil.rmtree(target.parent)
    for source in (ROOT/'src/cab_platform').rglob('*.py'):
        if source.is_symlink():raise RuntimeError('source-symlink-refused')
        dest=target/source.relative_to(ROOT/'src/cab_platform');dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,dest);dest.chmod(0o644)
    if not (OUT/'web/index.html').is_file():raise RuntimeError('frontend-build-required')
    public=OUT/'electric-public'
    if not (public/'bin/entrypoint').is_file():raise RuntimeError('pinned-electric-image-extraction-required')
    vendor=OUT/'python-vendor'
    if not (vendor/'django/__init__.py').is_file():raise RuntimeError('locked-python-vendor-required')
    manifest={'version':'3.0.0','platform':'Debian 13 amd64, Python 3.13','electric_image':'electricsql/electric@sha256:efb6fa43859d67cb8c73439e0c8bc0f7a3daa467500fb06f2a924bcb2070c139','python_lock_sha256':hashlib.sha256((ROOT/'packaging/python-lock.txt').read_bytes()).hexdigest(),'archives':{'python-vendor':archive(vendor,OUT/'python-vendor.tar.xz'),'electric':archive(public,OUT/'electric.tar.xz')}}
    (OUT/'runtime-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    for name,source in [('plugins',ROOT/'integrations/codex'),('commands',ROOT/'integrations/commands'),('docs',ROOT/'docs')]:
        destination=OUT/name
        if destination.exists():shutil.rmtree(destination)
        shutil.copytree(source,destination)
        for path in [destination,*destination.rglob('*')]:path.chmod(0o755 if path.is_dir() else 0o644)
    catalog=json.loads((ROOT/'.agents/plugins/marketplace.json').read_text())
    for plugin in catalog['plugins']:plugin['source']['path']='./plugins/'+{'CAB':'cab','CABU':'cabu','CCAB':'ccab'}[plugin['name']]
    (OUT/'marketplace.json').write_text(json.dumps(catalog,indent=2)+'\n')
    print(json.dumps({'prepared':True,'version':'3.0.0','archives':{k:v['sha256'] for k,v in manifest['archives'].items()}}))

if __name__=='__main__':main()
