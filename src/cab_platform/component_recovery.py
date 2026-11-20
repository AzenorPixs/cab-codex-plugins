"""Reprises de composants CAB, sous contrôle d'une identité connue."""
import http.client
import json
import os
import socket
import struct
import time

from . import __version__
from .connector_process import identity
from .paths import RUNTIME, runtime_config
from .service_recovery import Receipt, maintenance, run_command


class ChildRecovery:
    """Le processus parent contrôle un seul enfant et vérifie le remplaçant."""
    def __init__(self, key, label, spawn, running, ready):
        self.receipt = Receipt(key, label)
        self.spawn, self.running, self.ready = spawn, running, ready
        self.child = None
        self.started = False
        self.deadline = None
        self.next_check = 0
        self.confirmed = False

    def tick(self):
        now = time.monotonic()
        if now < self.next_check:
            return self.child
        self.next_check = now + 1
        self.receipt.publish()
        if self.child and self.running(self.child):
            if not self.confirmed and self.ready(self.child):
                self.confirmed = True
                if self.deadline is not None:
                    self.receipt.finish(True, 'Le nouveau processus répond à son contrôle de disponibilité.')
                    self.deadline = None
                self.receipt.publish()
                self.receipt.rearm()
            elif self.deadline is not None and now>=self.deadline:
                self.receipt.finish(False, 'Le nouveau processus n’a pas confirmé sa disponibilité.')
                self.deadline = None
            return self.child
        self.child = None
        self.confirmed = False
        if self.deadline is not None:
            self.receipt.finish(False, 'Le nouveau processus s’est arrêté pendant la vérification.')
            self.deadline = None
            self.receipt.publish()
            return None
        if self.started:
            if maintenance() or not self.receipt.begin():
                return None
            self.deadline = now+30
        self.started = True
        try:
            self.child = self.spawn()
        except (OSError, ValueError, RuntimeError):
            if self.deadline is not None:
                self.receipt.finish(False, 'Le démarrage du remplaçant a échoué.')
                self.deadline = None
        return self.child


class LocalHTTP(http.client.HTTPConnection):
    def connect(self):
        self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM)
        self.sock.settimeout(self.timeout)
        self.sock.connect(str(RUNTIME/'cab.sock'))


def api_ready(*, pid=None, parent=None):
    conn=LocalHTTP('localhost',timeout=2)
    try:
        conn.connect()
        peer_pid,uid,_=struct.unpack('3i',conn.sock.getsockopt(socket.SOL_SOCKET,socket.SO_PEERCRED,12))
        peer=identity(peer_pid)
        if uid!=0 or (pid is not None and pid!=peer_pid) or not peer or (parent is not None and peer['parent_pid']!=parent):
            return False
        conn.request('GET','/api/v1/health')
        response=conn.getresponse()
        result=json.loads(response.read(16384))
        return response.status==200 and result.get('version')==__version__
    except (OSError,ValueError,http.client.HTTPException):
        return False
    finally:
        conn.close()


def electric_ready(child):
    conn=http.client.HTTPConnection('127.0.0.1',runtime_config().get('electric_port',8791),timeout=2)
    try:
        conn.request('GET','/v1/health')
        return child.poll() is None and conn.getresponse().status==200
    except (OSError,http.client.HTTPException):
        return False
    finally:
        conn.close()


def unit_status():
    response=run_command(['/usr/bin/systemctl','show','--property=ActiveState,MainPID','cab.service'],5)
    if response is None or response.returncode:
        return '',0
    values=dict(line.split('=',1) for line in response.stdout.splitlines() if '=' in line)
    pid=values.get('MainPID','0')
    return values.get('ActiveState',''),int(pid) if pid.isdigit() else 0


def recover_daemon():
    """Point d’entrée OnFailure indépendant du processus CAB et de son API."""
    record=Receipt('cab-daemon','Démon CAB')
    if maintenance() or unit_status()!=('failed',0) or not record.begin():
        return
    result=run_command(['/usr/bin/systemctl','start','cab.service'],10)
    if result is None or result.returncode:
        record.finish(False,'Le démarrage systemd de CAB n’a pas été confirmé.')
        record.publish()
        return
    deadline=time.monotonic()+45
    while time.monotonic()<deadline:
        state,pid=unit_status()
        if state=='active' and pid and api_ready(parent=pid):
            record.finish(True,'Systemd confirme le processus CAB et son API répond.')
            record.publish()
            return
        if state=='failed':
            break
        time.sleep(1)
    record.finish(False,'Le démon CAB et son API n’ont pas confirmé leur disponibilité.')
    record.publish()


def observe_daemon():
    # Le service peut tourner pendant le contrôle externe. Ne jamais
    # interpréter son reçu ATTEMPTING comme abandonné depuis ce processus.
    record=Receipt('cab-daemon','Démon CAB',recover_interrupted=False)
    if record.data.get('state') in ('SUCCEEDED','FAILED'):
        record.publish()
        if not record.data.get('rearmed') and api_ready(parent=os.getpid()):
            record.rearm()
