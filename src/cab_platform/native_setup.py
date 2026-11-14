"""Prépare le daemon natif ; seul un frontend réellement raccordé vaut activation."""
import os
from pathlib import Path
import pwd
import subprocess
from .client import Client,ClientError
from .integration import read_user_file,write_user_file
from .native_api import codex_peer,NativeFailure

def prepare(agent,username,binary):
    if agent not in ('codex','codex-cli'):raise ClientError('native-agent-invalid')
    user=pwd.getpwnam(username)
    if os.getuid() not in (0,user.pw_uid):raise ClientError('native-account-required')
    executable=Path(binary)
    if not executable.is_absolute() or not executable.is_file():raise ClientError('native-binary-required')
    env={'HOME':user.pw_dir,'USER':user.pw_name,'LOGNAME':user.pw_name,'PATH':os.defpath,'XDG_RUNTIME_DIR':'/run/user/'+str(user.pw_uid)}
    options={'user':user.pw_uid,'group':user.pw_gid,'extra_groups':os.getgrouplist(user.pw_name,user.pw_gid)} if os.getuid()==0 else {}
    # Le fournisseur supervise son daemon ; CAB ne crée pas un backend de preuve.
    result=subprocess.run([str(executable),'app-server','daemon','start'],env=env,cwd=user.pw_dir,stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=30,**options)
    if result.returncode:raise ClientError('native-daemon-start-failed')
    sock=Path(user.pw_dir)/'.codex/app-server-control/app-server-control.sock'
    try:codex_peer(str(sock),user.pw_uid)
    except NativeFailure as error:raise ClientError(error.code) from error
    launcher=None
    if agent=='codex':
        source=Path('/usr/share/applications/chatgpt.desktop')
        if not source.is_file():raise ClientError('native-desktop-launcher-unavailable')
        launcher=Path(user.pw_dir)/'.local/share/applications'/source.name
        text=read_user_file(launcher if launcher.exists() else source,user.pw_uid).decode()
        marker='env CODEX_APP_SERVER_USE_LOCAL_DAEMON=1 '
        lines=[]
        for line in text.splitlines():
            if line.startswith('Exec=') and marker not in line:line='Exec='+marker+line[5:]
            lines.append(line)
        write_user_file(launcher,('\n'.join(lines)+'\n').encode(),env,options)
    # Pas de jeton transféré entre comptes : l'admin cadre uniquement l'endpoint.
    admin=Client(admin=True) if os.getuid()==0 else Client()
    actor_id=admin.profile.get('actor_id')
    if os.getuid()==0:
        import json
        profile=Path(user.pw_dir)/'.config/cab'/(agent+'.json')
        actor_id=json.loads(read_user_file(profile,user.pw_uid))['actor_id']
    configured=admin.command('native.control.configure',{'actor_id':actor_id,'control_socket':str(sock),'control_binary':str(executable)})
    return {**configured,'socket':str(sock),'desktop_launcher':str(launcher) if launcher else None,'adoption_required':configured['state']!='READY','cli_remote':['--remote','unix://'+str(sock)],'sessions_replayed':False}
