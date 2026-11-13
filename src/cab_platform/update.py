"""CABU Debian : publication officielle, intégrité de l’asset et même reçu système."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import re
from urllib.request import Request,urlopen
from . import __version__
from .client import ClientError
from .paths import STATE,atomic_json,private_dir

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
            endpoint='tags/v'+version if version else 'latest'
            request=Request('https://api.github.com/repos/AzenorPixs/cab-codex-plugins/releases/'+endpoint,headers={'Accept':'application/vnd.github+json','User-Agent':'CAB/'+__version__})
            with urlopen(request,timeout=30) as response:release=json.load(response)
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
        if not re.fullmatch(r'\d+\.\d+\.\d+',target) or version and target!=version:raise ClientError('debian-package-version-invalid')
        if subprocess.run(['/usr/bin/dpkg','--compare-versions',target,'lt',previous],capture_output=True).returncode==0:raise ClientError('update-downgrade-refused')
        sha=hashlib.sha256(path.read_bytes()).hexdigest()
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
        result['package_sha256']=sha;result['previous_version']=previous
        atomic_json(STATE/'last-update.json',result);return result
