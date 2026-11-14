"""Finalisation CABU locale commune ; aucun téléchargement ou appel APT."""
import fcntl
import hashlib
import json
import hmac
import os
from pathlib import Path
import pwd
import subprocess
import stat
from . import __version__
from .client import ClientError
from .paths import STATE,atomic_json,config,private_dir,read_json
from .maintenance import verify
from .integration import integrate,payload_digest,read_user_file


def registered_profiles():
    """Comptes enrôlés avec leur profil privé valide ; aucun scan de HOME."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
    import django
    from django.apps import apps
    if not apps.ready:django.setup()
    from .core.models import Actor
    from django.db import DatabaseError
    plans=[]
    try:actors=list(Actor.objects.filter(active=True,agent__in=['codex','codex-cli','opencode']).only('id','uid','agent','token_hash'))
    except DatabaseError:raise ClientError('integration-profile-inventory-unavailable') from None
    for actor in actors:
        try:
            user=pwd.getpwuid(actor.uid);home=Path(user.pw_dir)
            if home.resolve()!=home:continue
            path=home/'.config/cab'/(actor.agent+'.json')
            if actor.agent=='codex' and not path.exists():path=home/'.config/cab/client.json'
            info=path.stat()
            if info.st_size>65536:continue
            profile=json.loads(read_user_file(path,actor.uid))
            if not isinstance(profile,dict):continue
            if profile.get('actor_id')!=actor.pk or not isinstance(profile.get('token'),str):continue
            if not hmac.compare_digest(hashlib.sha256(profile['token'].encode()).hexdigest(),actor.token_hash):continue
            plan={'agent':actor.agent,'uid':actor.uid}
            if plan not in plans:plans.append(plan)
        except (OSError,ValueError,KeyError,ClientError):continue
    return plans


def finalize(package_root=Path('/usr/lib/cab')):
    if os.getuid()!=0:raise ClientError('root-administration-required')
    private_dir(STATE)
    fd=os.open(STATE/'finalization.lock',os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW,0o600)
    try:
        fcntl.flock(fd,fcntl.LOCK_EX)
        health=verify();cfg=config()
        if not cfg.get('initialized'):
            result={'version':__version__,'state':health['state'],'verified':True,'deferred':True,'integrations':[]}
            atomic_json(STATE/'last-finalization.json',result);atomic_json(STATE/'last-update.json',result)
            return result
        plans=[]
        configured=cfg.get('integrations',[])
        if not isinstance(configured,list):raise ClientError('integration-plan-invalid')
        for item in configured+registered_profiles():
            if not isinstance(item,dict) or item.get('agent') not in ('codex','codex-cli','opencode') or type(item.get('uid')) is not int or item['uid']<0:raise ClientError('integration-plan-invalid')
            plan={'agent':item['agent'],'uid':item['uid']}
            if plan not in plans:plans.append(plan)
        plans.sort(key=lambda item:(item['agent'],item['uid']))
        stamp=hashlib.sha256(json.dumps({'version':__version__,'payload':payload_digest(package_root),'accounts':plans},sort_keys=True).encode()).hexdigest()
        saved=read_json(STATE/'last-finalization.json',{})
        # L'intégration possède aussi son propre contrôle de contenu, partagé
        # avec les anciens wrappers CABU encore en mémoire pendant une upgrade.
        steps=saved.get('steps',{}) if saved.get('finalization_id')==stamp else {}
        result={'version':__version__,'state':health['state'],'verified':False,'deferred':False,'finalization_id':stamp,'steps':steps,'integrations':[]}
        for plan in plans:
            key=plan['agent']+':'+str(plan['uid'])
            try:
                user=pwd.getpwuid(plan['uid'])
                value=integrate(plan['agent'],user.pw_name,package_root=package_root)
                steps[key]={'state':'COMPLETED','result':value};result['integrations'].append(value)
                atomic_json(STATE/'last-finalization.json',result)
            except (ClientError,OSError,ValueError,KeyError,subprocess.SubprocessError) as error:
                steps[key]={'state':'FAILED','error':str(error) if isinstance(error,ClientError) else type(error).__name__}
                atomic_json(STATE/'last-finalization.json',result)
                raise ClientError('integration-finalization-failed:'+key) from None
        from .core.connectors import attach_active_updates,snapshot,assess
        attach_active_updates(__version__)
        connector_state,connectors=assess(snapshot(),__version__)
        result['connector_state']=connector_state;result['connectors']=connectors
        result['verified']=True
        atomic_json(STATE/'last-finalization.json',result);atomic_json(STATE/'last-update.json',result)
        return result
    finally:os.close(fd)
