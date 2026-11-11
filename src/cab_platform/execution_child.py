"""Préparation et transport sous l’UID du codeur ; aucune autorité SQL."""
import json
import sys
from .transports import sandbox,ssh

def handle(packet):
    if packet['action']=='sandbox':return sandbox.sandbox_command(packet['args'],packet['grant'])
    if packet['action']=='describe':return {'profile':{**packet['profile'],'connection_fingerprint':ssh.connection(packet['directory'],packet['profile'])['fingerprint']},'credential_values_exposed':False}
    profile=packet['profile'];cfg=ssh.connection(packet['directory'],profile)
    if cfg['fingerprint']!=profile['connection_fingerprint']:raise ssh.ExternalError('external-connection-divergent')
    if packet['action']=='prepare-external':
        body=packet['packet'];body['files']=ssh.gather_files(packet['directory'],packet.get('files',[]),packet['read_roots'])
        return {'packet':body,'connection_fingerprint':cfg['fingerprint']}
    if packet['action']=='external':
        result=ssh.ssh_transport(cfg,packet['packet'],packet['timeout_ms'])
        if isinstance(result.get('output'),str):result['output']=ssh.runner.scrub(result['output'].replace(cfg['password'],'[REDACTED]'))
        return {'remote':result}
    raise ValueError('execution-action-invalid')

if __name__=='__main__':
    try:
        data=json.load(sys.stdin);result=handle(data);json.dump({'ok':True,'result':result},sys.stdout,ensure_ascii=False)
    except (ValueError,OSError,KeyError) as error:
        code=str(error) if isinstance(error,(sandbox.AtelierError,ssh.ExternalError)) else 'execution-preparation-failed'
        json.dump({'ok':False,'error':code},sys.stdout);raise SystemExit(2)
