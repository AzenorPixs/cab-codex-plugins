"""Project-scoped durable dependency notices; no native session effects."""
from __future__ import annotations

import hashlib
import base64
import http.client
import json
import os
from datetime import datetime, timezone
from contextlib import contextmanager
import fcntl
from pathlib import Path
import re
import sqlite3
import stat
import socket
import struct
import time
from urllib.parse import quote, urlencode, urlsplit

VERSION = "2.5.8"
TOKEN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:/#-]{0,255}$")
KINDS = frozenset(("change", "task", "capability"))


class CoordinationError(ValueError):
    pass


def token(value):
    if not isinstance(value, str) or not TOKEN.fullmatch(value) or ".." in value or "//" in value:
        raise CoordinationError("coordination-identity-invalid")
    return value


def project_root(value):
    path = Path(value).resolve(strict=True)
    if not path.is_dir():
        raise CoordinationError("coordination-project-invalid")
    return str(path)


def same_state_root(left,right):
    try:
        return (isinstance(left,str) and Path(left).is_absolute() and Path(right).is_absolute() and
                Path(left).resolve()==Path(right).resolve())
    except (OSError,RuntimeError,TypeError):
        return False


def reference(value):
    token(value)
    if value.startswith("/") or ":" in value or value.startswith("."):
        raise CoordinationError("coordination-reference-invalid")
    return value


def dependency_subject(kind, value):
    token(value)
    if kind == 'task':
        parts = value.split('/')
        if len(parts) != 2 or any(not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,99}', part) for part in parts):
            raise CoordinationError("coordination-task-subject-invalid")
    elif kind == 'change' and not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,99}', value):
        raise CoordinationError("coordination-change-subject-invalid")
    return value


def verify_batch_code(project, kind, subject, batch_code, batch_change=None):
    """Use only an unambiguous code/change entry in the project registry."""
    token(batch_code)
    change = batch_change if kind == 'capability' else subject.split('/')[0]
    if not change or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,99}', change):
        raise CoordinationError("coordination-batch-code-unverified")
    if kind != 'capability' and batch_change is not None and batch_change != change:
        raise CoordinationError("coordination-batch-code-unverified")
    registry = Path(project) / 'openspec/BATCH_CODES.md'
    try:
        info = registry.lstat()
        if not stat.S_ISREG(info.st_mode) or info.st_size > 4 * 1024 * 1024 or registry.resolve(strict=True) != registry:
            raise CoordinationError("coordination-batch-code-unverified")
        fd = os.open(registry, os.O_RDONLY | os.O_NOFOLLOW)
        with os.fdopen(fd, 'r', encoding='utf-8') as source:
            opened = os.fstat(source.fileno())
            if (opened.st_dev, opened.st_ino, opened.st_size) != (info.st_dev, info.st_ino, info.st_size):
                raise CoordinationError("coordination-batch-code-unverified")
            lines = source.read(4 * 1024 * 1024 + 1).splitlines()
    except (OSError, UnicodeError) as exc:
        raise CoordinationError("coordination-batch-code-unverified") from exc
    rows = []
    for line in lines:
        if not line.startswith('|'):
            continue
        cells = [cell.strip().strip('`') for cell in line.strip('|').split('|')]
        if len(cells) >= 2 and cells[0] == batch_code:
            rows.append(cells)
    if len(rows) != 1 or rows[0][1] != change:
        raise CoordinationError("coordination-batch-code-unverified")


def encoded(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def scope_digest(*values):
    return hashlib.sha256(encoded(list(values)).encode()).hexdigest()


def decode_json(value):
    def unique(pairs):
        result={}
        for key,item in pairs:
            if key in result:
                raise ValueError('duplicate-key')
            result[key]=item
        return result
    return json.loads(value,object_pairs_hook=unique)


def codex_steer_request(session, turn_id, notice_id, attempt_id):
    """Build the locally observed app-server request, without performing an effect."""
    session, turn_id, notice_id, attempt_id = map(token, (session, turn_id, notice_id, attempt_id))
    return {"jsonrpc": "2.0", "id": attempt_id, "method": "turn/steer", "params": {
        "threadId": session, "expectedTurnId": turn_id, "clientUserMessageId": attempt_id,
        "input": [{"type": "text", "text": "Avis technique CAB " + notice_id +
                   " : consulter la boîte de dépendances et vérifier les critères du destinataire."}]}}


def codex_steer_result(response, attempt_id, turn_id):
    """Only a correlated successful response establishes native admission."""
    token(attempt_id)
    token(turn_id)
    if (isinstance(response, dict) and response.get('id') == attempt_id and
            isinstance(response.get('result'), dict) and response['result'].get('turnId') == turn_id and
            'error' not in response):
        return 'accepted'
    return 'unknown'


def codex_steer_sender(attempt_id, exchange):
    """Adapt an injected JSON-RPC exchange; no connection is created here."""
    token(attempt_id)
    def send(session, turn_id, notice_id):
        request = codex_steer_request(session, turn_id, notice_id, attempt_id)
        return exchange(request)
    return send


class _NativeWebSocket:
    """Bounded RFC 6455 client for a local app-server Unix socket."""
    def __init__(self,path):
        self.sock=socket.socket(socket.AF_UNIX);self.deadline=time.monotonic()+5;self.buffer=bytearray();self.total=0
        try:
            self.sock.settimeout(5);self.sock.connect(str(path))
            key=base64.b64encode(os.urandom(16)).decode('ascii')
            request=('GET / HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
                     'Sec-WebSocket-Version: 13\r\nSec-WebSocket-Key: '+key+'\r\n\r\n')
            self.sock.sendall(request.encode('ascii'))
            while b'\r\n\r\n' not in self.buffer:
                if len(self.buffer)>16384:raise CoordinationError('coordination-native-handshake-invalid')
                self._receive()
            head,_,rest=self.buffer.partition(b'\r\n\r\n');self.buffer=bytearray(rest)
            if len(head)>16384:raise CoordinationError('coordination-native-handshake-invalid')
            lines=head.decode('ascii').split('\r\n')
            if not lines[0].startswith('HTTP/1.1 101 '):raise CoordinationError('coordination-native-handshake-invalid')
            headers={}
            for line in lines[1:]:
                name,sep,value=line.partition(':');name=name.lower().strip()
                if not sep or name in headers:raise CoordinationError('coordination-native-handshake-invalid')
                headers[name]=value.strip()
            expected=base64.b64encode(hashlib.sha1((key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').encode()).digest()).decode()
            if (headers.get('sec-websocket-accept')!=expected or headers.get('upgrade','').lower()!='websocket' or
                    'upgrade' not in [value.strip() for value in headers.get('connection','').lower().split(',')]):
                raise CoordinationError('coordination-native-handshake-invalid')
        except BaseException:
            self.sock.close();raise

    def _receive(self):
        remaining=self.deadline-time.monotonic()
        if remaining<=0:raise CoordinationError('coordination-native-timeout')
        self.sock.settimeout(remaining);block=self.sock.recv(65536)
        if not block:raise CoordinationError('coordination-native-eof')
        self.total+=len(block)
        if self.total>1024*1024:raise CoordinationError('coordination-native-output-too-large')
        self.buffer.extend(block)

    def _take(self,size):
        while len(self.buffer)<size:self._receive()
        value=bytes(self.buffer[:size]);del self.buffer[:size];return value

    def send(self,opcode,payload):
        if len(payload)>1024*1024:raise CoordinationError('coordination-native-input-too-large')
        length=len(payload);header=bytes([0x80|opcode])
        if length<126:header+=bytes([0x80|length])
        elif length<=65535:header+=bytes([0x80|126])+struct.pack('!H',length)
        else:header+=bytes([0x80|127])+struct.pack('!Q',length)
        mask=os.urandom(4);masked=bytes(value^mask[index%4] for index,value in enumerate(payload))
        remaining=self.deadline-time.monotonic()
        if remaining<=0:raise CoordinationError('coordination-native-timeout')
        self.sock.settimeout(remaining);self.sock.sendall(header+mask+masked)

    def message(self):
        data=bytearray();started=False
        while True:
            first,second=self._take(2);fin=bool(first&0x80);opcode=first&0x0f
            if first&0x70 or second&0x80:raise CoordinationError('coordination-native-frame-invalid')
            length=second&0x7f
            if length==126:length=struct.unpack('!H',self._take(2))[0]
            elif length==127:length=struct.unpack('!Q',self._take(8))[0]
            if length>1024*1024 or (opcode>=8 and (not fin or length>125)):
                raise CoordinationError('coordination-native-frame-invalid')
            payload=self._take(length)
            if opcode==8:raise CoordinationError('coordination-native-eof')
            if opcode==9:self.send(10,payload);continue
            if opcode==10:continue
            if opcode==1 and not started:started=True
            elif opcode!=0 or not started:raise CoordinationError('coordination-native-frame-invalid')
            data.extend(payload)
            if len(data)>1024*1024:raise CoordinationError('coordination-native-output-too-large')
            if fin:return decode_json(bytes(data))

    def close(self):
        self.sock.close()


def codex_proxy_exchange(request, socket_path):
    """Use an explicitly selected private local app-server WebSocket once."""
    socket_path = Path(socket_path)
    if not socket_path.is_absolute():
        raise CoordinationError("coordination-native-socket-invalid")
    def private_parent(path):
        parent=path.parent;info=parent.lstat()
        try:canonical=parent.resolve()==parent
        except (OSError,RuntimeError):canonical=False
        return stat.S_ISDIR(info.st_mode) and info.st_uid==os.getuid() and not info.st_mode&0o077 and canonical
    info=socket_path.lstat()
    if info.st_uid!=os.getuid() or not private_parent(socket_path):
        raise CoordinationError('coordination-native-socket-invalid')
    if stat.S_ISLNK(info.st_mode):
        target=Path(os.readlink(socket_path))
        if not target.is_absolute() or not private_parent(target):
            raise CoordinationError('coordination-native-socket-invalid')
        socket_path=target;info=socket_path.lstat()
    if not stat.S_ISSOCK(info.st_mode) or info.st_uid!=os.getuid():
        raise CoordinationError('coordination-native-socket-invalid')
    if not isinstance(request, dict) or request.get('method') not in ('thread/read', 'thread/items/list', 'thread/turns/list', 'turn/steer') or not isinstance(request.get('id'), str) or request['id'] == 'cab-initialize':
        raise CoordinationError("coordination-native-request-invalid")
    initialize = {"jsonrpc": "2.0", "id": "cab-initialize", "method": "initialize",
                  "params": {"clientInfo": {"name": "cab-dependencies", "title":"CAB dependencies", "version": VERSION},
                             "capabilities":{"experimentalApi":True}}}
    initialized = {"jsonrpc": "2.0", "method": "initialized", "params": {}}
    try:
        native=_NativeWebSocket(socket_path)
        try:
            native.send(1,encoded(initialize).encode())
            for _ in range(100):
                value=native.message()
                if isinstance(value,dict) and value.get('id')=='cab-initialize':
                    if 'result' not in value or 'error' in value:raise CoordinationError('coordination-native-handshake-invalid')
                    break
            else:raise CoordinationError('coordination-native-handshake-invalid')
            native.send(1,encoded(initialized).encode());native.send(1,encoded(request).encode())
            for _ in range(100):
                value=native.message()
                if isinstance(value,dict) and value.get('id')==request['id']:
                    return value
        finally:
            native.close()
    except (OSError,UnicodeError,ValueError,CoordinationError):
        return None
    return None


def codex_verified_sender(project, attempt_id, exchange):
    """Check the native thread's project and activity before a guarded steer."""
    project = project_root(project)
    token(attempt_id)
    read_id = 'read-' + hashlib.sha256(attempt_id.encode()).hexdigest()
    def send(session, turn_id, notice_id):
        token(session)
        query = {'jsonrpc': '2.0', 'id': read_id, 'method': 'thread/read',
                 'params': {'threadId': session, 'includeTurns': False}}
        response = exchange(query)
        if not isinstance(response, dict) or response.get('id') != read_id or 'error' in response:
            raise CoordinationError('coordination-native-thread-unverified')
        result = response.get('result')
        thread = result.get('thread') if isinstance(result, dict) else None
        if not isinstance(thread, dict) or thread.get('id') != session or thread.get('canAcceptDirectInput') is not True:
            raise CoordinationError('coordination-native-thread-unverified')
        status = thread.get('status')
        if not isinstance(status, dict) or status.get('type') != 'active' or status.get('activeFlags') != []:
            raise CoordinationError('coordination-native-thread-not-active')
        try:
            if project_root(thread.get('cwd')) != project:
                raise CoordinationError('coordination-native-project-mismatch')
        except (TypeError, OSError) as exc:
            raise CoordinationError('coordination-native-project-mismatch') from exc
        return exchange(codex_steer_request(session, turn_id, notice_id, attempt_id))
    return send


def codex_active_turn(project, session, exchange):
    """Return only a current native turn identifier, never conversation content."""
    project=project_root(project);session=token(session)
    prefix=hashlib.sha256(encoded([project,session]).encode()).hexdigest()
    read_id='discover-thread-'+prefix
    response=exchange({'jsonrpc':'2.0','id':read_id,'method':'thread/read',
                       'params':{'threadId':session,'includeTurns':False}})
    result=response.get('result') if isinstance(response,dict) and response.get('id')==read_id else None
    thread=result.get('thread') if isinstance(result,dict) else None
    try:
        if (not isinstance(thread,dict) or thread.get('id')!=session or project_root(thread.get('cwd'))!=project or
            thread.get('canAcceptDirectInput') is not True or thread.get('status')!={'type':'active','activeFlags':[]}):
            raise CoordinationError('coordination-native-thread-unverified')
    except (TypeError,OSError) as exc:
        raise CoordinationError('coordination-native-thread-unverified') from exc
    turns_id='discover-turn-'+prefix
    response=exchange({'jsonrpc':'2.0','id':turns_id,'method':'thread/turns/list',
                       'params':{'threadId':session,'limit':1,'sortDirection':'desc','itemsView':'notLoaded'}})
    result=response.get('result') if isinstance(response,dict) and response.get('id')==turns_id else None
    turns=result.get('data') if isinstance(result,dict) else None
    if not isinstance(turns,list) or len(turns)!=1 or not isinstance(turns[0],dict) or turns[0].get('status')!='inProgress':
        raise CoordinationError('coordination-native-turn-unavailable')
    return {'turn_id':token(turns[0].get('id'))}


def codex_observe_notice(project, session, turn_id, notice_id, attempt_id, exchange):
    """Read a bounded native turn and return only an exact observation, never history."""
    project = project_root(project)
    session, turn_id, notice_id, attempt_id = map(token, (session, turn_id, notice_id, attempt_id))
    prefix = hashlib.sha256(attempt_id.encode()).hexdigest()
    read_id = 'observe-thread-' + prefix
    response = exchange({'jsonrpc': '2.0', 'id': read_id, 'method': 'thread/read',
                         'params': {'threadId': session, 'includeTurns': False}})
    result = response.get('result') if isinstance(response, dict) and response.get('id') == read_id else None
    thread = result.get('thread') if isinstance(result, dict) else None
    try:
        if not isinstance(thread, dict) or thread.get('id') != session or project_root(thread.get('cwd')) != project:
            raise CoordinationError('coordination-native-thread-unverified')
    except (OSError, TypeError) as exc:
        raise CoordinationError('coordination-native-thread-unverified') from exc
    expected = codex_steer_request(session, turn_id, notice_id, attempt_id)['params']['input']
    cursor, seen, matches = None, set(), []
    for page in range(10):
        request_id = 'observe-items-' + prefix + '-' + str(page)
        params = {'threadId': session, 'turnId': turn_id, 'limit': 100}
        if cursor is not None:
            params['cursor'] = cursor
        response = exchange({'jsonrpc': '2.0', 'id': request_id, 'method': 'thread/items/list', 'params': params})
        if not isinstance(response, dict) or response.get('id') != request_id or 'error' in response:
            raise CoordinationError('coordination-native-observation-unavailable')
        result = response.get('result')
        if not isinstance(result, dict) or not isinstance(result.get('data'), list) or 'nextCursor' not in result:
            raise CoordinationError('coordination-native-observation-unavailable')
        for entry in result['data']:
            if not isinstance(entry, dict):
                raise CoordinationError('coordination-native-observation-unavailable')
            item = entry.get('item')
            content=item.get('content') if isinstance(item,dict) else None
            same_content=(isinstance(content,list) and len(content)==1 and isinstance(content[0],dict) and
                          set(content[0]) <= {'type','text','text_elements'} and content[0].get('type')=='text' and
                          content[0].get('text')==expected[0]['text'] and content[0].get('text_elements',[])==[])
            if isinstance(item,dict) and item.get('clientId')==attempt_id and not (
                    entry.get('turnId')==turn_id and item.get('type')=='userMessage' and same_content and isinstance(item.get('id'),str)):
                raise CoordinationError('coordination-native-observation-inconclusive')
            if (entry.get('turnId') == turn_id and isinstance(item, dict) and item.get('type') == 'userMessage' and
                    item.get('clientId') == attempt_id and same_content and isinstance(item.get('id'), str)):
                matches.append(item['id'])
        cursor = result['nextCursor']
        if cursor is None:
            if len(matches) != 1:
                raise CoordinationError('coordination-native-observation-inconclusive')
            return {'status': 'observed', 'native_ack': 'unknown',
                    'proof_sha256': hashlib.sha256(encoded([session,turn_id,notice_id,attempt_id,matches[0]]).encode()).hexdigest()}
        if not isinstance(cursor, str) or not cursor or len(cursor) > 1024 or cursor in seen:
            raise CoordinationError('coordination-native-observation-unavailable')
        seen.add(cursor)
    raise CoordinationError('coordination-native-observation-incomplete')


def verify_direct_release(project, change, run, session, receipt_id, state_root):
    """Obtain the existing SGS proof for this exact direct binding."""
    project = project_root(project)
    change, run, session, receipt_id = map(token, (change, run, session, receipt_id))
    if not Path(state_root).is_absolute():
        raise CoordinationError('coordination-sgs-socket-invalid')
    identity = [socket.gethostname(), os.getuid(), project, change, run, session, 'coder']
    binding = 'codex-' + hashlib.sha256(encoded(identity).encode()).hexdigest()
    scope = {'workspace': project, 'changeId': change, 'runIds': [run], 'ids': [session],
             'sessionId': session, 'bindingId': binding, 'closureAuthority': 'direct-session-v1'}
    socket_path = Path(state_root) / 'cab-approval-bridge/sgs/sgs.sock'
    try:
        info = socket_path.lstat()
        if not stat.S_ISSOCK(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
            raise CoordinationError('coordination-sgs-socket-invalid')
        connection = http.client.HTTPConnection('localhost', timeout=5)
        try:
            connection.sock = socket.socket(socket.AF_UNIX)
            connection.sock.settimeout(5)
            connection.sock.connect(str(socket_path))
            body = encoded({'scope': scope, 'receipt_id': receipt_id})
            connection.request('POST', '/purge/verify-released', body=body,
                               headers={'Content-Type': 'application/json'})
            response = connection.getresponse()
            payload = response.read(65537)
            if response.status != 200 or len(payload) > 65536:
                raise CoordinationError('coordination-sgs-proof-unavailable')
            result = decode_json(payload)
        finally:
            connection.close()
    except (OSError, ValueError, http.client.HTTPException) as exc:
        raise CoordinationError('coordination-sgs-proof-unavailable') from exc
    expected = hashlib.sha256(encoded(scope).encode()).hexdigest()
    if not isinstance(result, dict) or result.get('status') != 'RELEASE_VERIFIED' or result.get('scope_digest') != expected:
        raise CoordinationError('coordination-sgs-proof-invalid')
    return result


def controller_admission(base_url, run=None):
    """Read only the bounded, local, versioned pause-gate projection."""
    if run is not None and (not isinstance(run,str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,99}', run)):
        raise CoordinationError('coordination-run-invalid')
    try:
        url = urlsplit(base_url)
        port = url.port
        if (url.scheme != 'http' or url.hostname not in ('127.0.0.1', '::1', 'localhost') or
                url.username or url.password or url.path not in ('', '/') or url.query or url.fragment or not port):
            raise CoordinationError('coordination-controller-invalid')
        connection = http.client.HTTPConnection(url.hostname, port, timeout=3)
        try:
            connection.request('GET', '/dependency-global-admission' if run is None else '/runs/' + run + '/dependency-admission')
            response = connection.getresponse()
            payload = response.read(65537)
            if response.status != 200 or len(payload) > 65536:
                raise CoordinationError('coordination-controller-unavailable')
            return decode_json(payload)
        finally:
            connection.close()
    except (OSError, ValueError, TypeError, http.client.HTTPException) as exc:
        raise CoordinationError('coordination-controller-unavailable') from exc


def verify_pilot_binding(project, run, session, state_root, mode='piloted'):
    project = project_root(project)
    run, session = token(run), token(session)
    if not Path(state_root).is_absolute():
        raise CoordinationError('coordination-sgs-socket-invalid')
    if mode not in ('direct','piloted'):
        raise CoordinationError('coordination-native-binding-invalid')
    path = Path(state_root) / 'cab-approval-bridge/sgs/sgs.sock'
    try:
        info = path.lstat()
        if not stat.S_ISSOCK(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
            raise CoordinationError('coordination-sgs-socket-invalid')
        connection = http.client.HTTPConnection('localhost', timeout=5)
        try:
            connection.sock = socket.socket(socket.AF_UNIX)
            connection.sock.settimeout(5)
            connection.sock.connect(str(path))
            query = urlencode({'project': project, 'run': run, 'session': session, 'mode':mode})
            connection.request('GET', '/session-binding?' + query)
            response = connection.getresponse()
            raw = response.read(65537)
            if response.status != 200 or len(raw) > 65536:
                raise CoordinationError('coordination-sgs-proof-unavailable')
            value = decode_json(raw)
        finally:
            connection.close()
    except (OSError, ValueError, http.client.HTTPException) as exc:
        raise CoordinationError('coordination-sgs-proof-unavailable') from exc
    if not isinstance(value, dict) or value != {'status': 'VERIFIED'}:
        raise CoordinationError('coordination-pilot-binding-unverified')
    return value


def check_close(project, run, state_root, session=None):
    """Read-only closure guard; an absent store is not created."""
    project = project_root(project)
    run = token(run)
    if session is not None:
        token(session)
    if not Path(state_root).is_absolute():
        raise CoordinationError('coordination-storage-not-private')
    directory = Path(state_root) / 'cab-approval-bridge/dependencies'
    path = directory / 'dependencies.sqlite3'
    if not directory.exists() and not directory.is_symlink():
        return {'status':'absent','pending':0}
    try:
        info=directory.lstat()
        if not stat.S_ISDIR(info.st_mode) or info.st_uid!=os.getuid() or info.st_mode & 0o077:
            raise CoordinationError('coordination-storage-not-private')
        marker=directory/'store.enabled'
        if marker.exists() or marker.is_symlink():
            mi=marker.lstat()
            if not stat.S_ISREG(mi.st_mode) or mi.st_uid!=os.getuid() or mi.st_mode & 0o077 or mi.st_nlink!=1:
                raise CoordinationError('coordination-marker-invalid')
        if not path.exists() and not path.is_symlink() and marker.exists():
            raise CoordinationError('coordination-database-missing')
        if not path.exists() and not path.is_symlink():
            return {'status':'absent','pending':0}
        info=path.lstat()
        if not stat.S_ISREG(info.st_mode) or info.st_uid!=os.getuid() or info.st_mode & 0o077:
            raise CoordinationError('coordination-database-not-private')
        db=sqlite3.connect('file:'+quote(str(path),safe='/')+'?mode=ro',uri=True,timeout=5)
        try:
            query="""SELECT count(*) FROM deliveries d JOIN notices n ON n.project=d.project AND n.notice_id=d.notice_id
              WHERE d.project=? AND (d.run=? OR n.sender_run=?) AND
              (state='prepared' OR (state='unknown' AND NOT EXISTS
              (SELECT 1 FROM delivery_observations o WHERE o.project=d.project AND o.session=d.session AND o.run=d.run
               AND o.dependency_id=d.dependency_id AND o.notice_id=d.notice_id AND o.attempt_id=d.attempt_id)))"""
            params=[project,run,run]
            if session is not None:
                query+=' AND ((d.run=? AND d.session=?) OR (n.sender_run=? AND n.sender_session=?))'
                params.extend([run,session,run,session])
            pending=db.execute(query,params).fetchone()[0]
        finally:
            db.close()
    except (OSError, sqlite3.Error) as exc:
        raise CoordinationError('coordination-closure-check-unavailable') from exc
    return {'status':'pending' if pending else 'clear','pending':pending}


class DependencyStore:
    """A private SQLite database; one transaction covers each public mutation."""

    def __init__(self, directory):
        directory = Path(directory).absolute()
        directory.mkdir(mode=0o700, parents=True, exist_ok=True)
        info = directory.lstat()
        if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
            raise CoordinationError("coordination-storage-not-private")
        self.directory = directory
        path = directory / "dependencies.sqlite3"
        if path.exists() or path.is_symlink():
            info = path.lstat()
            if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
                raise CoordinationError("coordination-database-not-private")
        else:
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
            os.close(fd)
        self.db = sqlite3.connect(path, timeout=5, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA synchronous=FULL")
        self.db.execute("PRAGMA secure_delete=ON")
        self.db.executescript('''
        CREATE TABLE IF NOT EXISTS sessions(project TEXT NOT NULL, session TEXT NOT NULL, run TEXT NOT NULL,
          mode TEXT NOT NULL, PRIMARY KEY(project,session,run));
        CREATE TABLE IF NOT EXISTS session_mandates(project TEXT NOT NULL, session TEXT NOT NULL, run TEXT NOT NULL,
          mandate TEXT NOT NULL CHECK(mandate IN ('SCM','other','unknown')),
          PRIMARY KEY(project,session,run),
          FOREIGN KEY(project,session,run) REFERENCES sessions(project,session,run));
        CREATE TABLE IF NOT EXISTS session_states(project TEXT NOT NULL, session TEXT NOT NULL, run TEXT NOT NULL,
          state TEXT NOT NULL CHECK(state IN ('active','paused')), generation INTEGER NOT NULL,
          PRIMARY KEY(project,session,run),
          FOREIGN KEY(project,session,run) REFERENCES sessions(project,session,run));
        CREATE TABLE IF NOT EXISTS session_resumes(project TEXT NOT NULL, session TEXT NOT NULL, run TEXT NOT NULL,
          generation INTEGER NOT NULL, evidence_digest TEXT NOT NULL, PRIMARY KEY(project,session,run,generation));
        CREATE TABLE IF NOT EXISTS dependency_pause_decisions(project TEXT NOT NULL, session TEXT NOT NULL, run TEXT NOT NULL,
          generation INTEGER NOT NULL, evidence_digest TEXT NOT NULL, PRIMARY KEY(project,session,run,generation));
        CREATE TABLE IF NOT EXISTS dependency_decisions(project TEXT NOT NULL, session TEXT NOT NULL, run TEXT NOT NULL,
          decision_id TEXT NOT NULL, choice TEXT NOT NULL CHECK(choice IN ('pause','stop')), evidence_digest TEXT NOT NULL,
          PRIMARY KEY(project,session,run,decision_id),
          FOREIGN KEY(project,session,run) REFERENCES sessions(project,session,run));
        CREATE TABLE IF NOT EXISTS session_closures(project TEXT NOT NULL, session TEXT NOT NULL, run TEXT NOT NULL,
          receipt_id TEXT NOT NULL, PRIMARY KEY(project,session,run),
          FOREIGN KEY(project,session,run) REFERENCES sessions(project,session,run));
        CREATE TABLE IF NOT EXISTS session_closure_history(project TEXT NOT NULL, session TEXT NOT NULL, run TEXT NOT NULL,
          receipt_id TEXT NOT NULL, reopened_at TEXT NOT NULL, PRIMARY KEY(project,session,run,receipt_id));
        CREATE TABLE IF NOT EXISTS closed_scopes(scope_digest TEXT PRIMARY KEY, receipt_digest TEXT NOT NULL, mode TEXT);
        CREATE TABLE IF NOT EXISTS notice_releases(scope_digest TEXT PRIMARY KEY, evidence_digest TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS retired_notices(scope_digest TEXT PRIMARY KEY, fingerprint TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS subscriptions(project TEXT NOT NULL, session TEXT NOT NULL, run TEXT NOT NULL,
          dependency_id TEXT NOT NULL, kind TEXT NOT NULL, subject TEXT NOT NULL, criterion TEXT NOT NULL,
          batch_code TEXT, batch_change TEXT, PRIMARY KEY(project,session,run,dependency_id),
          FOREIGN KEY(project,session,run) REFERENCES sessions(project,session,run));
        CREATE TABLE IF NOT EXISTS notices(project TEXT NOT NULL, notice_id TEXT NOT NULL, sender_session TEXT NOT NULL,
          sender_run TEXT NOT NULL, kind TEXT NOT NULL, subject TEXT NOT NULL, proof TEXT NOT NULL,
          fingerprint TEXT NOT NULL, created_at TEXT NOT NULL, proof_sha256 TEXT, PRIMARY KEY(project,notice_id),
          FOREIGN KEY(project,sender_session,sender_run) REFERENCES sessions(project,session,run));
        CREATE TABLE IF NOT EXISTS inbox(project TEXT NOT NULL, session TEXT NOT NULL, run TEXT NOT NULL,
          dependency_id TEXT NOT NULL, notice_id TEXT NOT NULL, acknowledged INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY(project,session,run,dependency_id,notice_id),
          FOREIGN KEY(project,session,run,dependency_id) REFERENCES subscriptions(project,session,run,dependency_id),
          FOREIGN KEY(project,notice_id) REFERENCES notices(project,notice_id));
        CREATE TABLE IF NOT EXISTS deliveries(project TEXT NOT NULL, session TEXT NOT NULL, run TEXT NOT NULL,
          dependency_id TEXT NOT NULL, notice_id TEXT NOT NULL, attempt_id TEXT NOT NULL, turn_id TEXT NOT NULL,
          state TEXT NOT NULL CHECK(state IN ('prepared','unknown','accepted','rejected')),
          PRIMARY KEY(project,session,run,dependency_id,notice_id),
          UNIQUE(project,attempt_id),
          FOREIGN KEY(project,session,run,dependency_id,notice_id)
            REFERENCES inbox(project,session,run,dependency_id,notice_id));
        CREATE TABLE IF NOT EXISTS delivery_observations(project TEXT NOT NULL, session TEXT NOT NULL, run TEXT NOT NULL,
          dependency_id TEXT NOT NULL, notice_id TEXT NOT NULL, attempt_id TEXT NOT NULL, proof_sha256 TEXT NOT NULL,
          PRIMARY KEY(project,session,run,dependency_id,notice_id),
          FOREIGN KEY(project,session,run,dependency_id,notice_id)
            REFERENCES deliveries(project,session,run,dependency_id,notice_id));
        CREATE UNIQUE INDEX IF NOT EXISTS delivery_once_per_recipient ON deliveries(project,session,run,notice_id);
        ''')
        # Additive upgrades retain previous notices; their unknown timestamp stays NULL.
        self.db.execute("BEGIN IMMEDIATE")
        try:
            for table, column in (('subscriptions', 'batch_change'), ('notices', 'created_at'), ('notices', 'proof_sha256'), ('closed_scopes','mode')):
                columns = {row['name'] for row in self.db.execute("PRAGMA table_info(" + table + ")")}
                if column not in columns:
                    self.db.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " TEXT")
            self.db.execute("COMMIT")
        except BaseException:
            self.db.execute("ROLLBACK")
            self.db.close()
            raise
        marker = directory / 'store.enabled'
        try:
            fd = os.open(marker, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        except FileExistsError:
            info = marker.lstat()
            if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077 or info.st_nlink != 1:
                self.db.close()
                raise CoordinationError('coordination-marker-invalid')
        else:
            try:
                marker_bytes=b'cab-dependency-mailbox-1\n'
                if os.write(fd,marker_bytes)!=len(marker_bytes):
                    raise CoordinationError('coordination-marker-write-failed')
                os.fsync(fd)
            finally:
                os.close(fd)
            directory_fd=os.open(directory,os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)

    def close(self):
        self.db.close()

    def _identity(self, project, session, run):
        return project_root(project), token(session), token(run)

    def _transaction(self, function):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            result = function()
            self.db.execute("COMMIT")
            return result
        except BaseException:
            self.db.execute("ROLLBACK")
            raise

    @contextmanager
    def _session_lock(self, identity):
        directory = self.directory / 'locks'
        directory.mkdir(mode=0o700, exist_ok=True)
        info = directory.lstat()
        if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
            raise CoordinationError('coordination-lock-directory-invalid')
        paths = [(directory / ('global-' + hashlib.sha256(encoded([identity[0]]).encode()).hexdigest() + '.lock'), fcntl.LOCK_SH),
                 (directory / ('run-' + hashlib.sha256(encoded([identity[0], identity[2]]).encode()).hexdigest() + '.lock'), fcntl.LOCK_EX)]
        descriptors = []
        try:
            for path, mode in paths:
                fd = os.open(path, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
                descriptors.append(fd)
                info = os.fstat(fd)
                if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077 or info.st_nlink != 1:
                    raise CoordinationError('coordination-lock-invalid')
                try:
                    fcntl.flock(fd, mode | fcntl.LOCK_NB)
                except BlockingIOError as exc:
                    raise CoordinationError('coordination-session-busy') from exc
            yield
        finally:
            for fd in reversed(descriptors):
                os.close(fd)

    @contextmanager
    def local_delivery_barrier(self, project, session, run, turn_id):
        """Serialize local state changes; native authority is a separate guard."""
        identity = self._identity(project, session, run)
        token(turn_id)
        with self._session_lock(identity):
            row = self.db.execute("SELECT state FROM session_states WHERE project=? AND session=? AND run=?", identity).fetchone()
            closed = self.db.execute("SELECT 1 FROM session_closures WHERE project=? AND session=? AND run=?", identity).fetchone()
            yield bool(row and row['state'] == 'active' and not closed)

    @contextmanager
    def pilot_delivery_barrier(self, project, session, run, turn_id, version, authority, state_root):
        """Hold the shared gate while checking the exact upgraded controller."""
        if type(version) is not int or version < 1:
            raise CoordinationError('coordination-reservation-version-invalid')
        identity = self._identity(project, session, run)
        with self.local_delivery_barrier(*identity, turn_id) as local_active:
            row = self.db.execute("SELECT mode FROM sessions WHERE project=? AND session=? AND run=?", identity).fetchone()
            if not local_active or not row or row['mode'] != 'piloted':
                yield False
                return
            status = authority(run)
            try:
                same_root=isinstance(status,dict) and same_state_root(status.get('stateRoot'),state_root)
            except (OSError,RuntimeError,TypeError):
                same_root=False
            allowed = (isinstance(status, dict) and status.get('protocol') == 'dependency-pause-gate-v1' and
                       status.get('workspace') == identity[0] and status.get('runId') == run and
                       status.get('version') == version and status.get('active') is True and same_root)
            yield allowed

    @contextmanager
    def direct_delivery_barrier(self, project, session, run, turn_id, state_root, authority):
        """Check the direct binding and an upgraded controller's global state."""
        identity=self._identity(project,session,run)
        with self.local_delivery_barrier(*identity,turn_id) as local_active:
            row=self.db.execute('SELECT mode FROM sessions WHERE project=? AND session=? AND run=?',identity).fetchone()
            if not local_active or not row or row['mode']!='direct':
                yield False
                return
            verify_pilot_binding(identity[0],run,session,state_root,'direct')
            status=authority()
            try:
                allowed=(isinstance(status,dict) and status.get('protocol')=='dependency-pause-gate-v1' and
                         status.get('workspace')==identity[0] and status.get('active') is True and
                         same_state_root(status.get('stateRoot'),state_root))
            except (OSError,RuntimeError,TypeError):
                allowed=False
            yield allowed

    def register(self, project, session, run, mode, mandate='unknown'):
        identity = self._identity(project, session, run)
        if mode not in ("direct", "piloted") or mandate not in ('SCM', 'other', 'unknown'):
            raise CoordinationError("coordination-mode-invalid")
        def apply():
            if self.db.execute('SELECT 1 FROM closed_scopes WHERE scope_digest=?',(scope_digest(*identity),)).fetchone():
                raise CoordinationError("coordination-session-closed")
            if self.db.execute("SELECT 1 FROM session_closures WHERE project=? AND session=? AND run=?", identity).fetchone():
                raise CoordinationError("coordination-session-closed")
            row = self.db.execute("SELECT mode FROM sessions WHERE project=? AND session=? AND run=?", identity).fetchone()
            if row and row[0] != mode:
                raise CoordinationError("coordination-session-conflict")
            self.db.execute("INSERT OR IGNORE INTO sessions VALUES(?,?,?,?)", (*identity, mode))
            previous = self.db.execute("SELECT mandate FROM session_mandates WHERE project=? AND session=? AND run=?", identity).fetchone()
            if previous and previous[0] != mandate and mandate != 'unknown':
                if previous[0] != 'unknown':
                    raise CoordinationError("coordination-mandate-conflict")
                self.db.execute("UPDATE session_mandates SET mandate=? WHERE project=? AND session=? AND run=?", (mandate, *identity))
            self.db.execute("INSERT OR IGNORE INTO session_mandates VALUES(?,?,?,?)", (*identity, mandate))
            return {"status": "registered", "native_notification": "unavailable"}
        return self._transaction(apply)

    def subscribe(self, project, session, run, dependency_id, kind, subject, criterion, batch_code=None, batch_change=None):
        identity = self._identity(project, session, run)
        dependency_id, criterion = token(dependency_id), token(criterion)
        if kind not in KINDS:
            raise CoordinationError("coordination-kind-invalid")
        subject = dependency_subject(kind, subject)
        if batch_code is not None:
            verify_batch_code(identity[0], kind, subject, batch_code, batch_change)
        elif batch_change is not None:
            raise CoordinationError("coordination-batch-code-unverified")
        values = (*identity, dependency_id, kind, subject, criterion, batch_code, batch_change)
        def apply():
            if self.db.execute("SELECT 1 FROM session_closures WHERE project=? AND session=? AND run=?", identity).fetchone():
                raise CoordinationError("coordination-session-closed")
            row = self.db.execute("SELECT kind,subject,criterion,batch_code,batch_change FROM subscriptions WHERE project=? AND session=? AND run=? AND dependency_id=?", values[:4]).fetchone()
            if row and tuple(row) != values[4:]:
                raise CoordinationError("coordination-dependency-conflict")
            self.db.execute("INSERT OR IGNORE INTO subscriptions VALUES(?,?,?,?,?,?,?,?,?)", values)
            notices=self.db.execute('''SELECT n.notice_id FROM notices n WHERE n.project=? AND n.kind=? AND n.subject=?
              AND NOT EXISTS (SELECT 1 FROM session_closures c WHERE c.project=n.project AND c.session=n.sender_session AND c.run=n.sender_run)''',
              (identity[0],kind,subject)).fetchall()
            for notice in notices:
                if not self.db.execute('SELECT 1 FROM notice_releases WHERE scope_digest=?',
                                       (scope_digest(*identity,notice['notice_id']),)).fetchone():
                    self.db.execute('INSERT OR IGNORE INTO inbox(project,session,run,dependency_id,notice_id) VALUES(?,?,?,?,?)',
                                    (*identity,dependency_id,notice['notice_id']))
            return {"status": "subscribed", "native_notification": "unavailable"}
        return self._transaction(apply)

    def set_session_state(self, project, session, run, state, generation, reason='explicit', resume_evidence=None, decision_evidence=None):
        """Record an explicit state change with a monotonic generation."""
        identity = self._identity(project, session, run)
        if state not in ('active', 'paused') or reason not in ('explicit', 'dependency') or type(generation) is not int or generation < 1:
            raise CoordinationError("coordination-session-state-invalid")
        def apply():
            if self.db.execute("SELECT 1 FROM session_closures WHERE project=? AND session=? AND run=?", identity).fetchone():
                raise CoordinationError("coordination-session-closed")
            mandate = self.db.execute("SELECT mandate FROM session_mandates WHERE project=? AND session=? AND run=?", identity).fetchone()
            if not mandate:
                raise CoordinationError("coordination-session-not-registered")
            if state == 'paused' and reason == 'dependency' and mandate['mandate'] != 'other':
                raise CoordinationError("coordination-dependency-pause-forbidden")
            row = self.db.execute("SELECT state,generation FROM session_states WHERE project=? AND session=? AND run=?", identity).fetchone()
            if row and (generation < row['generation'] or (generation == row['generation'] and state != row['state'])):
                raise CoordinationError("coordination-session-state-stale")
            if row and row['state']=='paused' and state=='active':
                if resume_evidence is None:
                    raise CoordinationError('coordination-resume-evidence-required')
                evidence=token(resume_evidence)
                self.db.execute('INSERT INTO session_resumes VALUES(?,?,?,?,?)',
                                (*identity,generation,hashlib.sha256(evidence.encode()).hexdigest()))
            if state=='paused' and reason=='dependency' and (not row or row['generation']!=generation):
                if decision_evidence is None:
                    raise CoordinationError('coordination-pause-decision-required')
                evidence=token(decision_evidence)
                decision=self.db.execute('''SELECT choice FROM dependency_decisions WHERE project=? AND session=? AND run=? AND decision_id=?''',
                                         (*identity,evidence)).fetchone()
                if not decision or decision['choice']!='pause':
                    raise CoordinationError('coordination-pause-decision-required')
                self.db.execute('INSERT INTO dependency_pause_decisions VALUES(?,?,?,?,?)',
                                (*identity,generation,hashlib.sha256(evidence.encode()).hexdigest()))
            self.db.execute('''INSERT INTO session_states VALUES(?,?,?,?,?) ON CONFLICT(project,session,run)
              DO UPDATE SET state=excluded.state,generation=excluded.generation''', (*identity, state, generation))
            return {"status": state, "generation": generation}
        with self._session_lock(identity):
            return self._transaction(apply)

    def record_dependency_decision(self, project, session, run, decision_id, choice, evidence):
        """Record a developer's choice without performing pause, stop or disarm."""
        identity=self._identity(project,session,run)
        decision_id,evidence=token(decision_id),token(evidence)
        if choice not in ('pause','stop'):
            raise CoordinationError('coordination-choice-invalid')
        digest=hashlib.sha256(evidence.encode()).hexdigest()
        def apply():
            mandate=self.db.execute('SELECT mandate FROM session_mandates WHERE project=? AND session=? AND run=?',identity).fetchone()
            if not mandate or mandate['mandate']!='other':
                raise CoordinationError('coordination-dependency-choice-forbidden')
            if self.db.execute('SELECT 1 FROM session_closures WHERE project=? AND session=? AND run=?',identity).fetchone():
                raise CoordinationError('coordination-session-closed')
            old=self.db.execute('SELECT choice,evidence_digest FROM dependency_decisions WHERE project=? AND session=? AND run=? AND decision_id=?',
                                (*identity,decision_id)).fetchone()
            if old and (old['choice']!=choice or old['evidence_digest']!=digest):
                raise CoordinationError('coordination-decision-conflict')
            self.db.execute('INSERT OR IGNORE INTO dependency_decisions VALUES(?,?,?,?,?,?)',(*identity,decision_id,choice,digest))
            return {'status':'recorded','choice':choice,'native_action':False}
        with self._session_lock(identity):
            return self._transaction(apply)

    def decisions(self, project, session, run):
        identity=self._identity(project,session,run)
        rows=self.db.execute('''SELECT decision_id,choice,evidence_digest FROM dependency_decisions
          WHERE project=? AND session=? AND run=? ORDER BY rowid''',identity).fetchall()
        return {'decisions':[dict(row) for row in rows]}

    def publish(self, project, session, run, notice_id, kind, subject, proof, proof_sha256=None):
        identity = self._identity(project, session, run)
        notice_id, proof = token(notice_id), reference(proof)
        if kind not in KINDS:
            raise CoordinationError("coordination-kind-invalid")
        subject = dependency_subject(kind, subject)
        if proof_sha256 is not None and (not isinstance(proof_sha256, str) or not re.fullmatch(r'[0-9a-f]{64}', proof_sha256)):
            raise CoordinationError("coordination-proof-digest-invalid")
        fingerprint_data = [*identity, kind, subject, proof]
        if proof_sha256 is not None:
            fingerprint_data.append(proof_sha256)
        fingerprint = hashlib.sha256(encoded(fingerprint_data).encode()).hexdigest()
        def apply():
            if self.db.execute("SELECT 1 FROM session_closures WHERE project=? AND session=? AND run=?", identity).fetchone():
                raise CoordinationError("coordination-session-closed")
            existing = self.db.execute("SELECT fingerprint FROM notices WHERE project=? AND notice_id=?", (identity[0], notice_id)).fetchone()
            retired=self.db.execute('SELECT fingerprint FROM retired_notices WHERE scope_digest=?',
                                    (scope_digest(identity[0],notice_id),)).fetchone()
            if retired:
                if retired['fingerprint']!=fingerprint:raise CoordinationError('coordination-notice-conflict')
                return {'status':'retired','recipients':0,'native_notification':'unavailable'}
            if existing and existing[0] != fingerprint:
                raise CoordinationError("coordination-notice-conflict")
            self.db.execute('''INSERT OR IGNORE INTO notices
              (project,notice_id,sender_session,sender_run,kind,subject,proof,fingerprint,created_at,proof_sha256)
              VALUES(?,?,?,?,?,?,?,?,?,?)''', (identity[0], notice_id, identity[1], identity[2], kind, subject,
                                               proof, fingerprint, datetime.now(timezone.utc).isoformat(), proof_sha256))
            targets=self.db.execute('''SELECT project,session,run,dependency_id FROM subscriptions s WHERE project=? AND kind=? AND subject=?
              AND NOT EXISTS (SELECT 1 FROM session_closures c WHERE c.project=s.project AND c.session=s.session AND c.run=s.run)''',
              (identity[0],kind,subject)).fetchall()
            for target in targets:
                recipient=(target['project'],target['session'],target['run'])
                if not self.db.execute('SELECT 1 FROM notice_releases WHERE scope_digest=?',
                                       (scope_digest(*recipient,notice_id),)).fetchone():
                    self.db.execute('INSERT OR IGNORE INTO inbox(project,session,run,dependency_id,notice_id) VALUES(?,?,?,?,?)',
                                    (*recipient,target['dependency_id'],notice_id))
            count = self.db.execute('''SELECT count(*) FROM (SELECT session,run FROM inbox
              WHERE project=? AND notice_id=? GROUP BY session,run)''', (identity[0], notice_id)).fetchone()[0]
            return {"status": "stored", "recipients": count, "native_notification": "unavailable"}
        return self._transaction(apply)

    def _close_session_locked(self, identity, receipt_id):
        receipt_id = token(receipt_id)
        def apply():
            key=scope_digest(*identity);receipt_digest=hashlib.sha256(receipt_id.encode()).hexdigest()
            terminal=self.db.execute('SELECT receipt_digest FROM closed_scopes WHERE scope_digest=?',(key,)).fetchone()
            if terminal:
                if terminal['receipt_digest']!=receipt_digest:raise CoordinationError('coordination-closure-conflict')
                return {'status':'closed','retained':False,'duplicate':True}
            pending = self.db.execute('''SELECT 1 FROM deliveries d JOIN notices n ON n.project=d.project AND n.notice_id=d.notice_id
              WHERE d.project=? AND ((d.session=? AND d.run=?) OR (n.sender_session=? AND n.sender_run=?)) AND
              (state='prepared' OR (state='unknown' AND NOT EXISTS
              (SELECT 1 FROM delivery_observations o WHERE o.project=d.project AND o.session=d.session AND o.run=d.run
               AND o.dependency_id=d.dependency_id AND o.notice_id=d.notice_id AND o.attempt_id=d.attempt_id))) LIMIT 1''',
               (identity[0],identity[1],identity[2],identity[1],identity[2])).fetchone()
            if pending:
                raise CoordinationError("coordination-delivery-unresolved")
            existing = self.db.execute("SELECT receipt_id FROM session_closures WHERE project=? AND session=? AND run=?", identity).fetchone()
            if existing and existing['receipt_id'] != receipt_id:
                raise CoordinationError("coordination-closure-conflict")
            session_row=self.db.execute('SELECT mode FROM sessions WHERE project=? AND session=? AND run=?',identity).fetchone()
            if not session_row:raise CoordinationError('coordination-session-not-registered')
            self.db.execute("INSERT OR IGNORE INTO session_closures VALUES(?,?,?,?)", (*identity, receipt_id))
            incoming=self.db.execute('''SELECT DISTINCT notice_id FROM inbox WHERE project=? AND session=? AND run=?''',identity).fetchall()
            for row in incoming:
                self.db.execute('INSERT OR IGNORE INTO notice_releases VALUES(?,?)',
                                (scope_digest(*identity,row['notice_id']),receipt_digest))
            for table in ('delivery_observations','deliveries','inbox','subscriptions','session_states',
                          'session_resumes','dependency_pause_decisions','dependency_decisions','session_mandates','session_closure_history'):
                self.db.execute('DELETE FROM '+table+' WHERE project=? AND session=? AND run=?',identity)
            orphaned=self.db.execute('''SELECT notice_id,fingerprint FROM notices WHERE project=? AND sender_session=? AND sender_run=? AND NOT EXISTS
              (SELECT 1 FROM inbox i WHERE i.project=notices.project AND i.notice_id=notices.notice_id)''',identity).fetchall()
            for notice in orphaned:
                prior=self.db.execute('SELECT fingerprint FROM retired_notices WHERE scope_digest=?',
                                      (scope_digest(identity[0],notice['notice_id']),)).fetchone()
                if prior and prior['fingerprint']!=notice['fingerprint']:
                    raise CoordinationError('coordination-notice-conflict')
                self.db.execute('INSERT OR IGNORE INTO retired_notices VALUES(?,?)',
                                (scope_digest(identity[0],notice['notice_id']),notice['fingerprint']))
            self.db.execute('''DELETE FROM notices WHERE project=? AND sender_session=? AND sender_run=? AND NOT EXISTS
              (SELECT 1 FROM inbox i WHERE i.project=notices.project AND i.notice_id=notices.notice_id)''',identity)
            peers=self.db.execute('''SELECT count(*) FROM inbox i JOIN notices n ON n.project=i.project AND n.notice_id=i.notice_id
              WHERE n.project=? AND n.sender_session=? AND n.sender_run=?''',identity).fetchone()[0]
            if peers:
                return {'status':'retained-for-peers','retained':True,'peer_references':peers}
            self.db.execute('DELETE FROM session_closures WHERE project=? AND session=? AND run=?',identity)
            self.db.execute('DELETE FROM sessions WHERE project=? AND session=? AND run=?',identity)
            self.db.execute('INSERT INTO closed_scopes(scope_digest,receipt_digest,mode) VALUES(?,?,?)',(key,receipt_digest,session_row['mode']))
            return {'status':'closed','retained':False,'duplicate':False}
        result=self._transaction(apply)
        if result['status']=='closed':
            try:
                self.db.execute('PRAGMA busy_timeout=0')
                checkpoint=self.db.execute('PRAGMA wal_checkpoint(TRUNCATE)').fetchone()
                wal=self.directory/'dependencies.sqlite3-wal'
                if checkpoint[0] or (wal.exists() and wal.stat().st_size):
                    return {'status':'cleanup-pending','retained':True,'reason':'wal-not-cleared'}
            except (OSError,sqlite3.Error):
                return {'status':'cleanup-pending','retained':True,'reason':'wal-check-unavailable'}
            finally:
                self.db.execute('PRAGMA busy_timeout=5000')
            result['disk_verified']=True
        return result

    def close_session(self, project, session, run, receipt_id):
        """Close one session after the caller has verified its native closure."""
        identity = self._identity(project, session, run)
        with self._session_lock(identity):
            return self._close_session_locked(identity,receipt_id)

    def close_direct_verified(self, project, session, run, change, receipt_id, state_root):
        """Keep the run gate across SGS receipt verification and local closure."""
        identity = self._identity(project,session,run)
        with self._session_lock(identity):
            verify_direct_release(identity[0],change,run,session,receipt_id,state_root)
            return self._close_session_locked(identity,receipt_id)

    def reopen_direct_verified(self, project, session, run, state_root):
        """Reopen only after an explicit start and a newly verified native SGS binding."""
        identity=self._identity(project,session,run)
        with self._session_lock(identity):
            row=self.db.execute('''SELECT c.receipt_id,s.mode FROM session_closures c JOIN sessions s
              USING(project,session,run) WHERE c.project=? AND c.session=? AND c.run=?''',identity).fetchone()
            tombstone=self.db.execute('SELECT receipt_digest,mode FROM closed_scopes WHERE scope_digest=?',(scope_digest(*identity),)).fetchone()
            if (not row or row['mode']!='direct') and (not tombstone or tombstone['mode']!='direct'):
                raise CoordinationError('coordination-direct-reopen-invalid')
            verify_pilot_binding(identity[0],run,session,state_root,'direct')
            def apply():
                current=self.db.execute('SELECT receipt_id FROM session_closures WHERE project=? AND session=? AND run=?',identity).fetchone()
                terminal=self.db.execute('SELECT receipt_digest,mode FROM closed_scopes WHERE scope_digest=?',(scope_digest(*identity),)).fetchone()
                if row:
                    if not current or current['receipt_id']!=row['receipt_id']:raise CoordinationError('coordination-direct-reopen-conflict')
                    previous=hashlib.sha256(row['receipt_id'].encode()).hexdigest()
                else:
                    if not terminal or terminal['receipt_digest']!=tombstone['receipt_digest'] or terminal['mode']!='direct':
                        raise CoordinationError('coordination-direct-reopen-conflict')
                    previous=terminal['receipt_digest']
                    self.db.execute('INSERT INTO sessions VALUES(?,?,?,?)',(*identity,'direct'))
                    self.db.execute('INSERT INTO session_mandates VALUES(?,?,?,?)',(*identity,'unknown'))
                self.db.execute('INSERT INTO session_closure_history VALUES(?,?,?,?,?)',
                                (*identity,previous,datetime.now(timezone.utc).isoformat()))
                self.db.execute('DELETE FROM session_closures WHERE project=? AND session=? AND run=?',identity)
                self.db.execute('DELETE FROM closed_scopes WHERE scope_digest=?',(scope_digest(*identity),))
                self.db.execute('INSERT OR IGNORE INTO session_mandates VALUES(?,?,?,?)',(*identity,'unknown'))
                state=self.db.execute('SELECT generation FROM session_states WHERE project=? AND session=? AND run=?',identity).fetchone()
                generation=(state['generation']+1) if state else 1
                self.db.execute('''INSERT INTO session_states VALUES(?,?,?,?,?) ON CONFLICT(project,session,run)
                  DO UPDATE SET state='paused',generation=excluded.generation''',(*identity,'paused',generation))
                return {'status':'reopened','native_notification':'unavailable'}
            return self._transaction(apply)

    def inbox(self, project, session, run):
        identity = self._identity(project, session, run)
        rows = self.db.execute('''SELECT i.dependency_id,i.notice_id,i.acknowledged,s.criterion,s.batch_code,s.batch_change,
          n.kind,n.subject,n.proof,n.proof_sha256,n.sender_session,n.sender_run,n.created_at FROM inbox i
          JOIN subscriptions s USING(project,session,run,dependency_id)
          JOIN notices n USING(project,notice_id) WHERE i.project=? AND i.session=? AND i.run=?
          ORDER BY i.rowid''', identity).fetchall()
        return {"notices": [dict(row) for row in rows], "native_notification": "unavailable"}

    def outbox(self, project, session, run, notice_id):
        """Expose routing identifiers for the originating session's notice only."""
        identity=self._identity(project,session,run);notice_id=token(notice_id)
        row=self.db.execute('''SELECT sender_session,sender_run FROM notices WHERE project=? AND notice_id=?''',
                            (identity[0],notice_id)).fetchone()
        if not row or (row['sender_session'],row['sender_run'])!=(identity[1],identity[2]):
            raise CoordinationError('coordination-notice-owner-mismatch')
        rows=self.db.execute('''SELECT i.session AS recipient_session,i.run AS recipient_run,i.dependency_id,
          s.mode,CASE WHEN c.receipt_id IS NOT NULL THEN 'closed' ELSE COALESCE(st.state,'unknown') END AS session_state,i.acknowledged,
          CASE WHEN d.state='unknown' AND o.proof_sha256 IS NOT NULL THEN 'observed'
               ELSE COALESCE(d.state,'not-attempted') END AS delivery_state,
          d.attempt_id,d.turn_id,d.dependency_id AS delivery_dependency_id,o.proof_sha256 AS observation_sha256
          FROM inbox i JOIN sessions s USING(project,session,run)
          LEFT JOIN session_states st USING(project,session,run)
          LEFT JOIN session_closures c USING(project,session,run)
          LEFT JOIN deliveries d ON d.project=i.project AND d.session=i.session AND d.run=i.run AND d.notice_id=i.notice_id
          LEFT JOIN delivery_observations o ON o.project=d.project AND o.session=d.session AND o.run=d.run
            AND o.dependency_id=d.dependency_id AND o.notice_id=d.notice_id AND o.attempt_id=d.attempt_id
          WHERE i.project=? AND i.notice_id=? ORDER BY i.rowid''',(identity[0],notice_id)).fetchall()
        return {'notice_id':notice_id,'recipients':[dict(value) for value in rows]}

    def acknowledge(self, project, session, run, dependency_id, notice_id):
        identity = self._identity(project, session, run)
        keys = (*identity, token(dependency_id), token(notice_id))
        def apply():
            cursor = self.db.execute('''UPDATE inbox SET acknowledged=1 WHERE project=? AND session=? AND run=?
              AND dependency_id=? AND notice_id=?''', keys)
            if not cursor.rowcount:
                raise CoordinationError("coordination-notice-not-found")
            return {"status": "acknowledged", "dependency_verified": False}
        return self._transaction(apply)

    def release_notice(self, project, session, run, notice_id, evidence):
        """Release only this recipient's fully acknowledged notice."""
        identity=self._identity(project,session,run);notice_id=token(notice_id);evidence=token(evidence)
        key=scope_digest(*identity,notice_id);proof=hashlib.sha256(evidence.encode()).hexdigest()
        def apply():
            old=self.db.execute('SELECT evidence_digest FROM notice_releases WHERE scope_digest=?',(key,)).fetchone()
            if old:
                if old['evidence_digest']!=proof:raise CoordinationError('coordination-release-conflict')
                return {'status':'released','duplicate':True}
            rows=self.db.execute('''SELECT acknowledged FROM inbox WHERE project=? AND session=? AND run=? AND notice_id=?''',
                                 (*identity,notice_id)).fetchall()
            if not rows or any(row['acknowledged']!=1 for row in rows):
                raise CoordinationError('coordination-release-not-acknowledged')
            pending=self.db.execute('''SELECT 1 FROM deliveries d WHERE project=? AND session=? AND run=? AND notice_id=? AND
              (state='prepared' OR (state='unknown' AND NOT EXISTS (SELECT 1 FROM delivery_observations o
                WHERE o.project=d.project AND o.session=d.session AND o.run=d.run AND o.dependency_id=d.dependency_id
                AND o.notice_id=d.notice_id AND o.attempt_id=d.attempt_id)))''',(*identity,notice_id)).fetchone()
            if pending:raise CoordinationError('coordination-delivery-unresolved')
            for table in ('delivery_observations','deliveries','inbox'):
                self.db.execute('DELETE FROM '+table+' WHERE project=? AND session=? AND run=? AND notice_id=?',(*identity,notice_id))
            self.db.execute('INSERT INTO notice_releases VALUES(?,?)',(key,proof))
            return {'status':'released','duplicate':False}
        with self._session_lock(identity):
            return self._transaction(apply)

    def prepare_delivery(self, project, session, run, dependency_id, notice_id, attempt_id, turn_id):
        """Record an intention before any native effect; never sends or resumes."""
        identity = self._identity(project, session, run)
        keys = (*identity, token(dependency_id), token(notice_id))
        attempt_id, turn_id = token(attempt_id), token(turn_id)
        def apply():
            if self.db.execute("SELECT 1 FROM session_closures WHERE project=? AND session=? AND run=?", identity).fetchone():
                raise CoordinationError("coordination-session-closed")
            row = self.db.execute('''SELECT attempt_id,turn_id,state FROM deliveries WHERE project=? AND session=?
              AND run=? AND notice_id=?''', (*identity,keys[4])).fetchone()
            if row:
                if row['attempt_id'] != attempt_id or row['turn_id'] != turn_id:
                    raise CoordinationError("coordination-delivery-conflict")
                return {"status": row['state'], "native_effect_authorized": False}
            state = self.db.execute("SELECT state FROM session_states WHERE project=? AND session=? AND run=?", identity).fetchone()
            if not state or state['state'] != 'active':
                raise CoordinationError("coordination-session-not-active")
            self.db.execute("INSERT INTO deliveries VALUES(?,?,?,?,?,?,?,?)", (*keys, attempt_id, turn_id, 'prepared'))
            return {"status": "prepared", "native_effect_authorized": False}
        return self._transaction(apply)

    def record_delivery(self, project, session, run, dependency_id, notice_id, attempt_id, state, response=None):
        """Persist a result; unknown can be reconciled but never blindly replayed."""
        identity = self._identity(project, session, run)
        keys = (*identity, token(dependency_id), token(notice_id))
        attempt_id = token(attempt_id)
        if state not in ('unknown', 'accepted', 'rejected'):
            raise CoordinationError("coordination-delivery-state-invalid")
        def apply():
            row = self.db.execute('''SELECT attempt_id,state,turn_id FROM deliveries WHERE project=? AND session=?
              AND run=? AND dependency_id=? AND notice_id=?''', keys).fetchone()
            if not row or row['attempt_id'] != attempt_id:
                raise CoordinationError("coordination-delivery-not-found")
            if row['state'] in ('accepted', 'rejected') and row['state'] != state:
                raise CoordinationError("coordination-delivery-terminal-conflict")
            if state == 'accepted' and codex_steer_result(response, attempt_id, row['turn_id']) != 'accepted':
                raise CoordinationError("coordination-delivery-proof-invalid")
            if state == 'rejected' and row['state'] != 'rejected':
                raise CoordinationError("coordination-delivery-proof-invalid")
            self.db.execute('''UPDATE deliveries SET state=? WHERE project=? AND session=? AND run=?
              AND dependency_id=? AND notice_id=?''', (state, *keys))
            return {"status": state, "dependency_verified": False}
        return self._transaction(apply)

    def cancel_prepared(self, project, session, run, dependency_id, notice_id, attempt_id):
        """Cancel only an intention known not to have crossed the native boundary."""
        identity = self._identity(project, session, run)
        keys = (*identity, token(dependency_id), token(notice_id), token(attempt_id))
        def apply():
            cursor = self.db.execute('''DELETE FROM deliveries WHERE project=? AND session=? AND run=?
              AND dependency_id=? AND notice_id=? AND attempt_id=? AND state='prepared' ''', keys)
            if not cursor.rowcount:
                raise CoordinationError("coordination-delivery-not-cancellable")
            return {"status": "cancelled-no-effect"}
        return self._transaction(apply)

    def observe_uncertain_delivery(self, project, session, run, dependency_id, notice_id, attempt_id, turn_id, exchange):
        """Reconcile a positive native observation without inventing an ACK."""
        identity = self._identity(project,session,run)
        keys = (*identity,token(dependency_id),token(notice_id))
        attempt_id,turn_id=token(attempt_id),token(turn_id)
        def validate():
            row=self.db.execute('''SELECT attempt_id,turn_id,state FROM deliveries WHERE project=? AND session=?
              AND run=? AND dependency_id=? AND notice_id=?''',keys).fetchone()
            if not row or row['attempt_id']!=attempt_id or row['turn_id']!=turn_id or row['state']!='unknown':
                raise CoordinationError('coordination-delivery-not-uncertain')
        validate()
        old=self.db.execute('''SELECT attempt_id,proof_sha256 FROM delivery_observations WHERE project=? AND session=?
          AND run=? AND dependency_id=? AND notice_id=?''',keys).fetchone()
        if old:
            if old['attempt_id']!=attempt_id:
                raise CoordinationError('coordination-observation-conflict')
            return {'status':'observed','native_ack':'unknown','proof_sha256':old['proof_sha256'],'duplicate':True}
        observed=codex_observe_notice(identity[0],identity[1],turn_id,notice_id,attempt_id,exchange)
        def apply():
            validate()
            old=self.db.execute('''SELECT attempt_id,proof_sha256 FROM delivery_observations WHERE project=? AND session=?
              AND run=? AND dependency_id=? AND notice_id=?''',keys).fetchone()
            if old and (old['attempt_id']!=attempt_id or old['proof_sha256']!=observed['proof_sha256']):
                raise CoordinationError('coordination-observation-conflict')
            self.db.execute('INSERT OR IGNORE INTO delivery_observations VALUES(?,?,?,?,?,?,?)',
                            (*keys,attempt_id,observed['proof_sha256']))
            return observed
        return self._transaction(apply)

    def dispatch(self, project, session, run, dependency_id, notice_id, attempt_id, turn_id, barrier, send):
        """Use an injected native barrier and transport; an ambiguous effect is never replayed.

        The barrier is responsible for excluding a concurrent authoritative pause
        until the send reaches its native boundary. No production barrier is
        supplied by this module.
        """
        identity=self._identity(project,session,run)
        keys = (*identity,token(dependency_id),token(notice_id))
        attempt_id,turn_id=token(attempt_id),token(turn_id)
        if not self.db.execute('''SELECT 1 FROM inbox WHERE project=? AND session=? AND run=? AND dependency_id=? AND notice_id=?''',keys).fetchone():
            raise CoordinationError('coordination-recipient-unverified')
        previous=self.db.execute('''SELECT attempt_id,turn_id,state FROM deliveries WHERE project=? AND session=?
          AND run=? AND notice_id=?''',(*identity,keys[4])).fetchone()
        if previous:
            if previous['attempt_id']!=attempt_id or previous['turn_id']!=turn_id:
                raise CoordinationError('coordination-delivery-conflict')
            if previous['state']=='accepted':
                return {'status':'accepted','dependency_verified':False,'duplicate':True}
            if previous['state']!='prepared':
                raise CoordinationError('coordination-delivery-not-replayable')
        with barrier(project, session, run, turn_id) as permit:
            if permit is not True:
                raise CoordinationError("coordination-native-barrier-unavailable")
            prepared = self.prepare_delivery(*keys, attempt_id, turn_id)
            if prepared['status'] == 'accepted':
                return {'status':'accepted','dependency_verified':False,'duplicate':True}
            if prepared['status'] != 'prepared':
                raise CoordinationError("coordination-delivery-not-replayable")
            # Persist uncertainty before the call. A crash or exception does not
            # establish whether the native system received the request.
            self.record_delivery(*keys, attempt_id, 'unknown')
            result = send(session, turn_id, notice_id)
            if codex_steer_result(result, attempt_id, turn_id) != 'accepted':
                raise CoordinationError("coordination-native-result-unknown")
            return self.record_delivery(*keys, attempt_id, 'accepted', result)
