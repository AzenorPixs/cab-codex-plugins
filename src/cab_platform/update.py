"""CABU Debian : publication officielle, intégrité de l’asset et même reçu système."""
import hashlib
import ast
import tarfile
import json
import os
from pathlib import Path
import subprocess
import tempfile
import re
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from . import __version__
from .client import ClientError
from .paths import STATE,atomic_json,private_dir

PUBLIC_TREES=('usr/lib/cab/python','usr/lib/cab/web','usr/lib/cab/plugins','usr/lib/cab/commands','usr/lib/cab/.agents','usr/share/doc/cab')
PUBLIC_FILES={'usr/bin/cab':0o755,'usr/lib/cab/runtime-manifest.json':0o644,'usr/lib/cab/python-vendor.tar.xz':0o644,'usr/lib/cab/electric.tar.xz':0o644}


def preflight_package(path,version,*,pass_fds=(),require_payload_hashes=False):
    """Contrôler le payload public avant APT, sans toucher aux données privées."""
    required={'usr/bin/cab','usr/lib/cab/python/cab_platform/__init__.py','usr/lib/cab/python/cab_platform/cli.py','usr/lib/cab/web/index.html','usr/lib/cab/runtime-manifest.json'}
    seen=set();public=0;embedded={}
    payload={'python':{},'web':{}}
    archives={}
    process=subprocess.Popen(['/usr/bin/dpkg-deb','--fsys-tarfile',str(path)],stdout=subprocess.PIPE,
                             stderr=subprocess.DEVNULL,pass_fds=pass_fds)
    try:
        with tarfile.open(fileobj=process.stdout,mode='r|') as archive:
            for item in archive:
                name=item.name.removeprefix('./').rstrip('/')
                selected=name=='usr/lib/cab' or name in PUBLIC_FILES or any(name==root or name.startswith(root+'/') for root in PUBLIC_TREES)
                if not selected:continue
                if name in seen or '..' in Path(name).parts or name.startswith('/') or not (item.isdir() or item.isfile()):raise ClientError('debian-public-payload-type-invalid')
                wanted=0o755 if item.isdir() else PUBLIC_FILES.get(name,0o644)
                if item.mode!=wanted or item.uid!=0 or item.gid!=0:raise ClientError('debian-public-payload-permissions-invalid')
                public+=1;seen.add(name)
                if not item.isfile():continue
                relative=name.removeprefix('usr/lib/cab/')
                group,_,entry=relative.partition('/')
                if name in ('usr/lib/cab/python/cab_platform/__init__.py','usr/lib/cab/runtime-manifest.json'):
                    stream=archive.extractfile(item)
                    raw=stream.read(262145)
                    if len(raw)>262144:raise ClientError('debian-payload-version-invalid')
                    embedded[name]=raw
                    if group in payload:payload[group][entry]=hashlib.sha256(raw).hexdigest()
                elif group in payload:
                    payload[group][entry]=hashlib.file_digest(archive.extractfile(item),'sha256').hexdigest()
                elif relative in ('python-vendor.tar.xz','electric.tar.xz'):
                    archives[relative]=hashlib.file_digest(archive.extractfile(item),'sha256').hexdigest()
    except (OSError,ValueError,SyntaxError,tarfile.TarError) as error:
        raise ClientError('debian-public-payload-invalid') from error
    finally:
        process.stdout.close()
        try:code=process.wait(timeout=30)
        except subprocess.TimeoutExpired:
            process.kill();process.wait();raise ClientError('debian-payload-inspection-timeout') from None
    if code!=0 or not required.issubset(seen) or not set(PUBLIC_TREES).issubset(seen):raise ClientError('debian-public-payload-incomplete')
    try:
        module=ast.parse(embedded['usr/lib/cab/python/cab_platform/__init__.py'].decode('utf-8'))
        versions=[ast.literal_eval(node.value) for node in module.body if isinstance(node,ast.Assign) and any(isinstance(target,ast.Name) and target.id=='__version__' for target in node.targets)]
        manifest=json.loads(embedded['usr/lib/cab/runtime-manifest.json'])
    except (KeyError,ValueError,SyntaxError,UnicodeError) as error:raise ClientError('debian-payload-version-invalid') from error
    if versions!=[version] or not isinstance(manifest,dict) or manifest.get('version')!=version:
        raise ClientError('debian-payload-version-invalid')
    declarations=manifest.get('payload_sha256')
    if require_payload_hashes or declarations is not None:
        verified={group:hashlib.sha256(json.dumps(files,sort_keys=True,separators=(',',':')).encode()).hexdigest()
                  for group,files in payload.items()}
        declared_archives=manifest.get('archives')
        if not isinstance(declared_archives,dict) or declarations!=verified:
            raise ClientError('debian-payload-integrity-invalid')
        for key in ('python-vendor','electric'):
            item=declared_archives.get(key)
            filename=key+'.tar.xz'
            if not isinstance(item,dict) or item.get('file')!=filename or filename not in archives or item.get('sha256')!=archives[filename]:
                raise ClientError('debian-payload-integrity-invalid')
    return {'public_paths_verified':public,'embedded_version_verified':version,'private_paths_modified':False}


def update(package=None,version=None,progress=None):
    if os.getuid()!=0:raise ClientError('root-administration-required')
    if version is not None and (not isinstance(version,str) or not re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)',version)):raise ClientError('update-version-invalid')
    def stage(value):
        if progress:progress(value)
    private_dir(STATE)
    previous=subprocess.check_output(['/usr/bin/dpkg-query','-W','-f=${Version}','cab'],text=True).strip()
    with tempfile.TemporaryDirectory(prefix='cab-update-',dir=STATE) as folder:
        if package:
            path=Path(package).resolve()
            if not path.is_file():raise ClientError('debian-package-missing')
        else:
            stage('RESOLVING')
            endpoint='tags/'+version if version else 'latest'
            request=Request('https://api.github.com/repos/AzenorPixs/cab-codex-plugins/releases/'+endpoint,headers={'Accept':'application/vnd.github+json','User-Agent':'CAB/'+__version__})
            try:
                with urlopen(request,timeout=30) as response:release=json.load(response)
            except HTTPError as error:
                if error.code!=404 or not version:raise
                # Relire les noms réellement publiés, sans construire un tag préfixé.
                from .versioning import historical_version,VersionError
                listing=Request('https://api.github.com/repos/AzenorPixs/cab-codex-plugins/releases?per_page=100',headers={'Accept':'application/vnd.github+json','User-Agent':'CAB/'+__version__})
                with urlopen(listing,timeout=30) as response:historical=json.load(response)
                release=None
                for candidate in historical if isinstance(historical,list) else []:
                    if not isinstance(candidate,dict) or candidate.get('draft') or candidate.get('prerelease'):continue
                    try:matched=historical_version(candidate.get('tag_name'))==version
                    except VersionError:continue
                    if matched:release=candidate;break
                if release is None:raise ClientError('release-version-unavailable')

            assets=[a for a in release.get('assets',[]) if a.get('name','').startswith('cab_') and a['name'].endswith('_amd64.deb')]
            if len(assets)!=1:raise ClientError('release-debian-asset-ambiguous')
            asset=assets[0];expected=asset.get('digest','')
            if not expected.startswith('sha256:'):raise ClientError('release-integrity-proof-missing')
            url=asset['browser_download_url']
            if not url.startswith('https://github.com/AzenorPixs/cab-codex-plugins/releases/download/'):raise ClientError('release-url-invalid')
            path=Path(folder)/'cab.deb'
            stage('DOWNLOADING')
            with urlopen(url,timeout=120) as response,path.open('wb') as stream:
                for data in iter(lambda:response.read(1024*1024),b''):stream.write(data)
            if hashlib.sha256(path.read_bytes()).hexdigest()!=expected[7:]:raise ClientError('release-package-integrity-invalid')
        package_name=subprocess.check_output(['/usr/bin/dpkg-deb','-f',str(path),'Package'],text=True).strip()
        if package_name!='cab':raise ClientError('debian-package-identity-invalid')
        target=subprocess.check_output(['/usr/bin/dpkg-deb','-f',str(path),'Version'],text=True).strip()
        if not re.fullmatch(r'(?:0|[1-9][0-9]*)(?:\.(?:0|[1-9][0-9]*)){0,6}',target) or version and target!=version:raise ClientError('debian-package-version-invalid')
        if subprocess.run(['/usr/bin/dpkg','--compare-versions',target,'lt',previous],capture_output=True).returncode==0:raise ClientError('update-downgrade-refused')
        sha=hashlib.sha256(path.read_bytes()).hexdigest()
        payload=preflight_package(path,target)
        # apt/dpkg réalise preinst/postinst et conserve leurs reçus de maintenance.
        stage('INSTALLING')
        completed=subprocess.run(['/usr/bin/apt-get','install','-y',str(path)],capture_output=True,text=True,timeout=1500)
        if completed.returncode:raise ClientError('debian-update-failed-preserved-receipt')
        # Le nouveau binaire lit le reçu idempotent produit par postinst.
        stage('VERIFYING')
        verification=subprocess.run(['/usr/bin/cab','finalize'],capture_output=True,text=True,timeout=180)
        if verification.returncode:raise ClientError('updated-service-not-ready')
        result=json.loads(verification.stdout)
        installed=subprocess.check_output(['/usr/bin/dpkg-query','-W','-f=${Status}|${Version}','cab'],text=True).strip()
        from .client import Client
        health=Client(admin=True).get('health')
        if installed!='install ok installed|'+target or not result.get('verified') or result.get('version')!=target or health.get('state')!='READY' or health.get('version')!=target:raise ClientError('update-activation-not-verified')
        result['package_sha256']=sha;result['previous_version']=previous;result['payload_preflight']=payload
        atomic_json(STATE/'last-update.json',result);return result
