"""CABU Debian : publication officielle, intégrité de l’asset et même reçu système."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
from urllib.request import Request,urlopen
from . import __version__
from .client import ClientError
from .paths import STATE,atomic_json,private_dir

def update(package=None):
    if os.getuid()!=0:raise ClientError('root-administration-required')
    private_dir(STATE)
    with tempfile.TemporaryDirectory(prefix='cab-update-',dir=STATE) as folder:
        if package:
            path=Path(package).resolve()
            if not path.is_file():raise ClientError('debian-package-missing')
        else:
            request=Request('https://api.github.com/repos/AzenorPixs/cab-codex-plugins/releases/latest',headers={'Accept':'application/vnd.github+json','User-Agent':'CAB/'+__version__})
            with urlopen(request,timeout=30) as response:release=json.load(response)
            assets=[a for a in release.get('assets',[]) if a.get('name','').startswith('cab_') and a['name'].endswith('_amd64.deb')]
            if len(assets)!=1:raise ClientError('release-debian-asset-ambiguous')
            asset=assets[0];expected=asset.get('digest','')
            if not expected.startswith('sha256:'):raise ClientError('release-integrity-proof-missing')
            url=asset['browser_download_url']
            if not url.startswith('https://github.com/AzenorPixs/cab-codex-plugins/releases/download/'):raise ClientError('release-url-invalid')
            path=Path(folder)/'cab.deb'
            with urlopen(url,timeout=120) as response,path.open('wb') as stream:
                for data in iter(lambda:response.read(1024*1024),b''):stream.write(data)
            if hashlib.sha256(path.read_bytes()).hexdigest()!=expected[7:]:raise ClientError('release-package-integrity-invalid')
        package_name=subprocess.check_output(['/usr/bin/dpkg-deb','-f',str(path),'Package'],text=True).strip()
        if package_name!='cab':raise ClientError('debian-package-identity-invalid')
        sha=hashlib.sha256(path.read_bytes()).hexdigest()
        # apt/dpkg réalise preinst/postinst et conserve leurs reçus de maintenance.
        completed=subprocess.run(['/usr/bin/apt-get','install','-y',str(path)],capture_output=True,text=True)
        if completed.returncode:raise ClientError('debian-update-failed-preserved-receipt')
        verification=subprocess.run(['/usr/bin/cab','maintenance','verify','--transaction','debian-upgrade'],capture_output=True,text=True)
        if verification.returncode:raise ClientError('updated-service-not-ready')
        health=json.loads(verification.stdout);result={'package_sha256':sha,'state':health['state'],'version':health['version'],'verified':True}
        from .integration import integrate
        from .paths import config
        import pwd
        result['integrations']=[integrate(item['agent'],pwd.getpwuid(item['uid']).pw_name) for item in config().get('integrations',[]) if item['agent'] in ('codex','opencode')]
        atomic_json(STATE/'last-update.json',result);return result
