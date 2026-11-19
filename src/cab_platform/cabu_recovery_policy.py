"""Autorité CABU bornée ; aucune exécution ni signal dans cette politique."""
import os
import stat
from pathlib import Path
from .connector_process import identity,cab_process

def same_instance(left,right):
    return bool(left and right) and all(left.get(key)==right.get(key) for key in ('pid','uid','start','boot'))

POLICY='cabu-necessary-recovery-v1'

def frontend_executable(pid):
    """Identifier le binaire de remplacement, même si l'ancien inode est ouvert."""
    try:
        path = Path(os.readlink(Path('/proc', str(pid), 'exe')).removesuffix(' (deleted)'))
        if not path.is_absolute() or path.name not in ('ChatGPT', 'Codex', 'codex-desktop'):
            return None
        canonical = path.resolve(strict=True)
        for parent in (canonical, *canonical.parents):
            info = parent.stat()
            if info.st_uid != 0 or info.st_mode & 0o022:
                return None
        if stat.S_ISREG(canonical.stat().st_mode):
            return canonical
    except OSError:
        return None


def connector_protected(row, backend):
    from .core.connectors import observed_dead
    if row.pending:
        return True
    if not row.uncertain:
        return False
    if (backend is None or row.state != 'OBSERVED'
            or row.error != 'native-worker-observed-without-heartbeat'):
        return True
    if row.process.get('parent_pid') == backend['pid']:
        return False
    return any(same_instance(identity(saved.get('pid', 0)), saved) or not observed_dead(saved)
               for saved in (row.process, row.worker))

def describe() -> dict:
    return {'id':POLICY,'additional_confirmation_required':False,'scope':['request_id','actor','uid','instance','target_version'],'revocation':'native.control.configure:cabu_recovery_authorized','authorization_is_reconnection':False,'unknown_replay':False}

def capture(actor,peer,request_id: str,version: str) -> dict:
    scope={'policy':POLICY,'request_id':request_id,'actor_id':actor.pk,'uid':actor.uid,'target_version':version,'instance':None,'frontend':None,'provenance':'unix-peer-kernel'}
    if not peer or peer.get('uid')!=actor.uid:return scope
    process=identity(peer.get('pid',0))
    if not process or process['uid']!=actor.uid:return scope
    if cab_process(process['pid'],'mcp-worker')==actor.agent:
        process=identity(process['parent_pid'])
    if not process or process['uid']!=actor.uid or cab_process(process['pid'],'mcp')!=actor.agent:return scope
    owner=identity(process['parent_pid'])
    if not owner or owner['uid']!=actor.uid:return scope
    scope['instance']=owner
    frontend=identity(owner['parent_pid'])
    if frontend and frontend['uid']==actor.uid and frontend_executable(frontend['pid']):
        scope['frontend']=frontend
    return scope

def authorization(job,owner=None,*,frontend=False) -> dict:
    """Lire les protections courantes ; l'exécuteur revérifie avant son effet."""
    from .core.models import Actor,Operation,Lease,Maintenance,McpConnector,NativeReload,GitSessionEffect,GitDelivery,TerminalGitCommit
    from .core import commands as c
    from .paths import runtime_config
    result={'policy':POLICY,'request_id':job.pk,'additional_confirmation_required':False,'replay':False,'state':'BLOCKED'}
    scope=job.result.get('recovery_context',{})
    actor=Actor.objects.filter(pk=job.actor_id).first()
    protected_actors=Actor.objects.filter(uid=actor.uid) if actor and frontend else Actor.objects.filter(pk=job.actor_id)
    reason=''
    if not actor or not actor.active:reason='cabu-recovery-requester-inactive'
    elif actor.native.get('cabu_recovery_authorized',True) is not True:reason='cabu-recovery-revoked'
    elif scope.get('policy')!=POLICY or scope.get('request_id')!=job.pk or scope.get('actor_id')!=actor.pk or scope.get('uid')!=actor.uid or scope.get('target_version')!=job.target_version:reason='cabu-recovery-scope-missing'
    elif job.state not in ('RECONNECTING','RELOAD_REQUIRED') or job.result.get('verified') is not True:reason='cabu-recovery-package-not-verified'
    elif not job.result.get('version') or job.result['version']!=runtime_config().get('version') or job.target_version and job.target_version!=job.result['version']:reason='cabu-recovery-version-divergent'
    else:
        saved=scope.get('frontend') if frontend else scope.get('instance')
        current=identity(saved.get('pid',0)) if saved else None
        backend=identity((scope.get('instance') or {}).get('pid',0)) if frontend else None
        if not same_instance(current,saved) or current['uid']!=actor.uid or owner is not None and not same_instance(owner,saved):reason='cabu-recovery-instance-divergent'
        elif frontend and (job.state!='RELOAD_REQUIRED' or not same_instance(backend,scope['instance']) or backend['parent_pid']!=saved['pid']):reason='cabu-recovery-frontend-unavailable'
        elif Maintenance.objects.filter(state__in=['PREPARED','INSTALLING']).exists():reason='maintenance-in-progress'
        elif Operation.objects.filter(run__actor__in=protected_actors).exclude(state__in=c.TERMINAL).exists() or Lease.objects.filter(run__actor__in=protected_actors,state='HELD').exists():reason='native-control-effects-protected'
        elif NativeReload.objects.filter(actor__in=protected_actors,state__in=['DISPATCHED','UNKNOWN','AUTO_OC_DISPATCHED','AUTO_OC_WAITING','AUTO_OC_UNKNOWN']).exists():reason='native-control-outcome-uncertain'
        elif frontend and NativeReload.objects.filter(actor__in=protected_actors,state='QUEUED').exists():reason='native-control-pending'
        elif frontend and (
            GitSessionEffect.objects.filter(run__actor__in=protected_actors).exclude(state__in=['COMPLETED','FAILED','FAILED_TO_START','CANCELLED']).exists()
            or GitDelivery.objects.filter(run__actor__in=protected_actors).exclude(state__in=['COMPLETED','FAILED','CANCELLED']).exists()
            or TerminalGitCommit.objects.filter(run__actor__in=protected_actors).exclude(state__in=['COMPLETED','FAILED','CANCELLED']).exists()
        ):reason='cabu-recovery-git-effects-protected'
        elif any(connector_protected(row, backend if frontend else None)
                 for row in McpConnector.objects.filter(actor__in=protected_actors).exclude(state__in=['SUPERSEDED','DISCONNECTED'])
                 if frontend or row.process.get('parent_pid') == scope['instance']['pid']):reason='native-control-client-busy'
    result.update(state='BLOCKED' if reason else 'AUTHORIZED',reason=reason or None,instance=scope.get('frontend') if frontend else scope.get('instance'),target_version=job.result.get('version') or job.target_version)
    return result
