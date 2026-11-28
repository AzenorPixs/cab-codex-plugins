"""Pseudo-terminal de session, lié à un navigateur et à l’atelier d’un RUN."""
from base64 import b64encode
from errno import EIO
import fcntl
import os
from pathlib import Path
import pty
import pwd
import secrets
import select
import struct
import subprocess
import sys
import tempfile
import termios
import threading
from time import monotonic

MAX_CONSOLES = 8
MAX_OUTPUT = 65536
MAX_INPUT = 4096
IDLE_SECONDS = 30
RETAIN_SECONDS = 20
CONSOLES = {}
REGISTRY = threading.RLock()
LAUNCHER = (
    'import sys; from cab_platform.session_terminal import launch_shell; '
    'launch_shell(*sys.argv[1:])'
)


def active(run):
    from .run_cleanup import cleanup_passage
    return run.state == 'WORKING' and not run.suspension and cleanup_passage(run) is None


def launch_shell(project, workshop, run_id, session_id, change, generation):
    """Point d’entrée enfant exécuté sous l’identité non privilégiée du RUN."""
    from .transports.sandbox import sandbox_command

    if os.geteuid() == 0:
        raise RuntimeError('terminal-unprivileged-launch-required')
    fcntl.ioctl(0, termios.TIOCSCTTY, 0)
    scratch = tempfile.mkdtemp(prefix='console-', dir=workshop)
    args = {'directory': project, 'run_id': run_id, 'session_id': session_id,
            'change_id': change, 'reservation_version': int(generation),
            'request_id': 'terminal-shell',
            'argv': ['/usr/bin/bash', '--noprofile', '--norc', '-i']}
    grant = {'status': 'AUTHORIZED_ATELIER', 'directory': project, 'atelier': scratch,
             'runtimeRoots': []}
    command = sandbox_command(args, grant)['argv']
    home = Path(scratch) / '.home'
    (home / '.cab-passwd').write_text(f'root:x:0:0:atelier:{home}:/usr/bin/bash\n')
    (home / '.cab-group').write_text('root:x:0:\n')
    # Le processus enfant possède déjà sa propre session et son TTY.
    command.remove('--new-session')
    command[1:1] = ['--unshare-user', '--uid', '0', '--gid', '0', '--disable-userns',
                    '--cap-drop', 'ALL']
    position = command.index('--')
    command[position:position] = ['--setenv', 'TERM', 'dumb', '--setenv', 'USER', 'root',
                                  '--setenv', 'PS1', 'atelier# ', '--setenv', 'HISTFILE', '/dev/null']
    os.execv(command[0], command)


def spawn_shell(run, workspace):
    """Ne transmettre que le pseudo-terminal et une identité OS non privilégiée."""
    from .core.commands import require

    user = pwd.getpwuid(run.actor.uid)
    require(user.pw_uid > 0 and os.geteuid() in (0, user.pw_uid),
            'session-terminal-owner-unavailable', 409)
    options = {}
    if os.geteuid() == 0:
        options = {'user': user.pw_uid, 'group': user.pw_gid,
                   'extra_groups': os.getgrouplist(user.pw_name, user.pw_gid)}
    master, slave = pty.openpty()
    try:
        fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 24, 90, 0, 0))
        os.set_blocking(master, False)
        process = subprocess.Popen(
            [sys.executable, '-B', '-c', LAUNCHER, run.project.root, str(workspace),
             run.run_id, run.session_id, run.change, str(run.generation)],
            stdin=slave, stdout=slave, stderr=slave, start_new_session=True, cwd='/',
            env={'PATH': '/usr/bin:/bin', 'LANG': 'C.UTF-8',
                 'PYTHONPATH': str(Path(__file__).resolve().parents[1])}, **options,
        )
    except BaseException:
        os.close(master)
        raise
    finally:
        os.close(slave)
    return process, master


class Console:
    def __init__(self, scope, process, master):
        self.id = secrets.token_urlsafe(32)
        self.scope = scope
        self.process = process
        self.master = master
        self.lock = threading.RLock()
        self.stop = threading.Event()
        self.deadline = monotonic() + IDLE_SECONDS
        self.finished = None
        self.output = bytearray()
        self.offset = 0
        self.thread = threading.Thread(target=self.collect, name='cab-session-terminal', daemon=True)
        self.thread.start()

    def append(self, data):
        with self.lock:
            self.output.extend(data)
            self.offset += len(data)
            del self.output[:max(0, len(self.output) - MAX_OUTPUT)]

    def collect(self):
        try:
            while not self.stop.is_set() and monotonic() < self.deadline:
                ready, _, _ = select.select([self.master], [], [], .2)
                if not ready:
                    if self.process.poll() is not None:
                        break
                    continue
                try:
                    data = os.read(self.master, 4096)
                except BlockingIOError:
                    continue
                except OSError as error:
                    if error.errno != EIO:
                        raise
                    break
                if not data:
                    break
                self.append(data)
        finally:
            with self.lock:
                os.close(self.master)
                self.stop.set()
            if self.process.poll() is None:
                self.process.terminate()
                try:
                    self.process.wait(timeout=1)
                except subprocess.TimeoutExpired:
                    self.process.kill()
            self.process.wait()
            with self.lock:
                self.finished = monotonic()

    def close(self):
        self.stop.set()
        self.thread.join(timeout=3)

    def write(self, text):
        from .core.commands import Refused, require

        data = text.encode('utf-8')
        require(0 < len(data) <= MAX_INPUT, 'session-terminal-input-invalid', 400)
        with self.lock:
            require(not self.stop.is_set(), 'session-terminal-closed', 409)
            try:
                written = os.write(self.master, data)
            except OSError as error:
                self.stop.set()
                raise Refused('session-terminal-input-interrupted', 409) from error
            if written != len(data):
                self.stop.set()
                raise Refused('session-terminal-input-interrupted', 409)
            self.deadline = monotonic() + IDLE_SECONDS

    def snapshot(self, position):
        from .core.commands import require

        with self.lock:
            require(0 <= position <= self.offset, 'session-terminal-offset-invalid', 400)
            first = self.offset - len(self.output)
            if not self.stop.is_set():
                self.deadline = monotonic() + IDLE_SECONDS
            return {'terminal_id': self.id, 'offset': self.offset, 'truncated': position < first,
                    'output': b64encode(self.output[max(0, position - first):]).decode('ascii'),
                    'closed': self.finished is not None}


def access(run, owner, session_key, action, terminal_id=None, offset=0, text=''):
    from .core.commands import Refused, require
    from .workshops import workshop

    scope = (run.pk, owner, session_key)
    with REGISTRY:
        now = monotonic()
        expired = [key for key, item in CONSOLES.items()
                   if item.finished is not None and now - item.finished >= RETAIN_SECONDS]
        for key in expired:
            CONSOLES.pop(key)
        if action == 'open':
            require(active(run), 'session-terminal-run-inactive', 409)
            existing = next((item for item in CONSOLES.values()
                             if item.scope == scope and not item.stop.is_set()), None)
            if existing is not None:
                return existing.snapshot(0)
            require(len(CONSOLES) < MAX_CONSOLES, 'session-terminal-capacity', 409)
            require(run.actor.uid != 0, 'session-terminal-owner-unavailable', 409)
            try:
                console = Console(scope, *spawn_shell(run, workshop(run, terminal=True)))
            except (OSError, KeyError) as error:
                raise Refused('session-terminal-unavailable', 409) from error
            CONSOLES[console.id] = console
            return console.snapshot(0)
        console = CONSOLES.get(terminal_id)
        if action == 'close' and console is None:
            return {'closed': True}
        require(console is not None and console.scope == scope, 'session-terminal-not-found', 404)
        if action == 'close' or not active(run):
            console.close()
            require(console.finished is not None, 'session-terminal-close-pending', 409)
            if action == 'close':
                CONSOLES.pop(terminal_id)
                return {'closed': True}
        if action == 'write':
            console.write(text)
            return {'written': True}
        return console.snapshot(offset)
