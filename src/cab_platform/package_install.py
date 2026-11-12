"""Installation hors réseau des runtimes publics vérifiés embarqués."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import tarfile

def install(root=Path('/usr/lib/cab')):
    manifest=json.loads((root/'runtime-manifest.json').read_text())
    for name in ['python-vendor','electric']:
        item=manifest['archives'][name];source=root/item['file']
        if source.is_symlink() or hashlib.sha256(source.read_bytes()).hexdigest()!=item['sha256']:raise RuntimeError('runtime-archive-integrity-invalid')
        staging=root/('.'+name+'-install')
        if staging.exists():shutil.rmtree(staging)
        staging.mkdir(mode=0o755)
        with tarfile.open(source,'r:xz') as archive:
            # Le filtre data de Python refuse traversées, périphériques et liens
            # sortants ; l’archive est le runtime public identifié dans le SBOM.
            archive.extractall(staging,filter='data')
        # Ces archives ne contiennent que des runtimes publics. Les modes de
        # l'atelier de build et l'umask du service ne doivent pas les privatiser.
        for path in staging.rglob('*'):
            info=path.lstat()
            if stat.S_ISLNK(info.st_mode):continue
            if stat.S_ISDIR(info.st_mode):path.chmod(0o755)
            elif stat.S_ISREG(info.st_mode):path.chmod(0o755 if info.st_mode&0o111 else 0o644)
        staging.chmod(0o755)
        destination=root/name
        if destination.exists():shutil.rmtree(destination)
        os.replace(staging,destination)
    return {'installed':True,'manifest_version':manifest['version']}

if __name__=='__main__':print(json.dumps(install()))
