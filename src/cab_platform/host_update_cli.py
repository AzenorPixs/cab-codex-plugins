"""Client de cab-update.service, hors du protocole des changes."""

import time

from .client import ClientError

TERMINAL = {'OK', 'FAILED', 'UNKNOWN', 'RELOAD_REQUIRED'}


def status(client, request_id):
    return client.command('system.update.status', {'request_id':request_id})


def request(client, request_id, version, timeout_ms):
    if not 1000 <= timeout_ms <= 1800000:
        raise ValueError('update-wait-invalid')
    try:
        result=client.command('system.update', {'request_id':request_id,'version':version})
    except ClientError as error:
        # La réponse peut se perdre lors de l’arrêt de cab.service.
        return {'request_id':request_id,'state':'ADMISSION_UNCONFIRMED','error':str(error),
                'next_action':'cab update-status','retry_execution':False}
    deadline=time.monotonic()+timeout_ms/1000
    while result['state'] not in TERMINAL and time.monotonic()<deadline:
        time.sleep(min(1,max(0,deadline-time.monotonic())))
        try:
            result=status(client,request_id)
        except ClientError:
            continue
    return result
