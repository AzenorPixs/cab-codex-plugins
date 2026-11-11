"""Installation, vérification et sauvegarde ; aucune réinitialisation implicite."""
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import tarfile
import hashlib
from . import __version__
from .client import Client,ClientError
from .paths import CONFIG,STATE,atomic_json,config,private_dir,read_json

def installed():
    cfg=config()
    if not cfg:
        atomic_json(CONFIG,{'logging':{'level':'INFO'},'initialized':False,'version':__version__})
        return {'state':'BOOTSTRAP_ONLY'}
    if cfg.get('initialized'):
        result=subprocess.run([sys.executable,'-m','django','migrate','--noinput'],env={**os.environ,'DJANGO_SETTINGS_MODULE':'cab_platform.settings','CAB_MIGRATE':'1'},capture_output=True,text=True,timeout=120)
        if result.returncode:raise RuntimeError('package-schema-migration-failed')
    cfg['version']=__version__;atomic_json(CONFIG,cfg)
    return {'state':'CONFIGURED' if cfg.get('initialized') else 'BOOTSTRAP_ONLY'}

def verify(timeout=40):
    deadline=time.monotonic()+timeout;result=None
    while time.monotonic()<deadline:
        try:
            result=Client().get('health')
            if result.get('version')==__version__ and result['state'] in ('READY','UNINITIALIZED'):
                receipt=read_json(STATE/'maintenance-receipt.json')
                if result['initialized'] and receipt and receipt.get('state')=='PREPARED':
                    Client(admin=True).command('maintenance.resume',{'transaction_id':receipt['transaction_id']})
                    receipt['state']='COMPLETED';receipt['verified_version']=__version__;atomic_json(STATE/'maintenance-receipt.json',receipt)
                return result
        except ClientError:pass
        time.sleep(.2)
    raise ClientError('installed-service-not-ready')

def backup(destination):
    if os.getuid()!=0:raise ClientError('root-administration-required')
    if destination.exists():raise ClientError('backup-destination-exists')
    if not destination.is_absolute() or destination.is_relative_to(STATE):raise ClientError('backup-destination-invalid')
    cfg=config()
    if not cfg.get('initialized'):raise ClientError('cab-not-initialized')
    private_dir(destination)
    # Le mot de passe n’est jamais un argument, une sortie ou une variable shell.
    passfile=destination/'pgpass';passfile.write_text(':'.join(str(cfg[k]).replace('\\','\\\\').replace(':','\\:') for k in ['database_host','database_port','database','migrator_user','migrator_password'])+'\n');passfile.chmod(0o600)
    try:
        result=subprocess.run(['/usr/bin/pg_dump','--format=custom','--no-owner','--host',cfg['database_host'],'--port',str(cfg['database_port']),'--username',cfg['migrator_user'],'--dbname',cfg['database'],'--file',str(destination/'cab.dump')],env={**os.environ,'PGPASSFILE':str(passfile)},capture_output=True,timeout=900)
        if result.returncode:raise ClientError('database-backup-failed')
        (destination/'cab.dump').chmod(0o600)
        atomic_json(destination/'cab.json',cfg)
        with tarfile.open(destination/'private-state.tar.xz','w:xz') as archive:archive.add(STATE,arcname='cab-state')
        (destination/'private-state.tar.xz').chmod(0o600)
        digests={}
        for name in ['cab.dump','cab.json','private-state.tar.xz']:
            with (destination/name).open('rb') as stream:digests[name]=hashlib.file_digest(stream,'sha256').hexdigest()
        atomic_json(destination/'manifest.json',{'version':__version__,'type':'logical-offline-restore','created':time.time(),'automatic_restore':False,'sha256':digests})
    finally:passfile.unlink(missing_ok=True)
    return {'backup':str(destination),'automatic_restore':False}

if __name__=='__main__':print(json.dumps(installed()))
