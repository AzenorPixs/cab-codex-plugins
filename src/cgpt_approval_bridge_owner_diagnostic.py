#!/usr/bin/env python3
"""Client ponctuel de diagnostic propriétaire ; aucune route de commit."""
import json
import os
import sys
from uuid import uuid4

import cgpt_approval_bridge_server as broker

VERSION = '2.4.43'


def run(identity):
    broker.OWNER_ERASURE_SOCKET = identity
    broker.INSTANCE_ID = 'diagnostic-' + str(uuid4())
    sender = {'pid':os.getpid(),'uid':os.getuid(),'instanceId':broker.INSTANCE_ID}
    command = broker.owner_erasure_http('/cleanup/owner/poll',sender)['command']
    if command.get('action') != 'diagnose' or command.get('brokerPid') != os.getpid():
        raise broker.ValidationError('erasure-owner-diagnostic-input-invalid')
    bundle = broker.diagnostic_terminal_erasure_bundle(command)
    receipt = broker.owner_erasure_worker(command,'diagnose',bundle=bundle)
    return broker.owner_erasure_http('/cleanup/owner/exchange',{'command':command,'sender':sender,'receipt':receipt})


if __name__ == '__main__':
    try:
        identity=json.loads(sys.stdin.readline())
        print(json.dumps(run(identity),ensure_ascii=False))
    except (ValueError,OSError,KeyError,broker.ValidationError,broker.StoreError) as exc:
        code=str(exc)
        print(json.dumps({'error':code if code.startswith('erasure-') and all(c.islower() or c.isdigit() or c=='-' for c in code) else 'erasure-owner-diagnostic-failed'}),file=sys.stderr)
        raise SystemExit(1)
