"""Reprise d'une instance graphique observée, par le superviseur système CAB."""
import hashlib
import os
import pwd
import select
import signal
import subprocess
import time
from contextlib import ExitStack
from pathlib import Path

from .cabu_recovery_policy import authorization, frontend_executable, same_instance
from .client import ClientError
from .connector_process import cab_process, identity
from .paths import STATE, atomic_json, read_json

GUI_KEYS = {'DISPLAY', 'WAYLAND_DISPLAY', 'XAUTHORITY', 'XDG_SESSION_TYPE'}


def proc_file(pid, name):
    return Path('/proc', str(pid), name)


def shared_profile(uid,agent):
    if agent not in ('codex','codex-cli'):
        return False
    import tomllib
    from .integration import read_user_file
    try:
        home=Path(pwd.getpwuid(uid).pw_dir)
        document=tomllib.loads(read_user_file(home/'.codex/config.toml',uid).decode())
        server=document.get('mcp_servers',{}).get('cab',{})
        return (document.get('features',{}).get('mcp_connection_sharing') is True
                and server.get('cwd')==str(home)
                and server.get('command')=='/usr/bin/cab'
                and server.get('args')==['mcp','--agent',agent]
                and server.get('env',{}).get('CAB_MCP_SHARED_STDIO')=='1')
    except (OSError,KeyError,ValueError,ClientError):
        return False


def open_process(stack, saved):
    fd = os.pidfd_open(saved['pid'])
    stack.callback(os.close, fd)
    if identity(saved['pid']) != saved:
        raise RuntimeError('cabu-recovery-instance-divergent')
    return fd


def stop_process(fd, report):
    poll = select.poll()
    poll.register(fd, select.POLLIN)
    for sig, timeout in ((signal.SIGTERM, 15000), (signal.SIGKILL, 5000)):
        if any(events & select.POLLIN for _, events in poll.poll(0)):
            return
        report(sig.name)
        try:
            signal.pidfd_send_signal(fd, sig)
        except ProcessLookupError:
            pass
        if any(events & select.POLLIN for _, events in poll.poll(timeout)):
            return
    raise RuntimeError('cabu-recovery-exit-unconfirmed')


def user_environment(account, app):
    runtime = f'/run/user/{account.pw_uid}'
    env = {'PATH': '/usr/bin:/bin', 'LANG': 'C.UTF-8', 'XDG_RUNTIME_DIR': runtime,
           'DBUS_SESSION_BUS_ADDRESS': f'unix:path={runtime}/bus'}
    prefix = ['/usr/sbin/runuser', '-u', account.pw_name, '--']
    result = invoke(prefix + ['/usr/bin/systemctl', '--user', 'show-environment'], env)
    for entry in [*result.stdout.splitlines(), *os.fsdecode(proc_file(app['pid'], 'environ').read_bytes()).split('\0')]:
        key, _, value = entry.partition('=')
        if key in GUI_KEYS and value:
            env[key] = value
    if not (env.get('DISPLAY') or env.get('WAYLAND_DISPLAY')):
        raise RuntimeError('cabu-recovery-no-graphical-session')
    return prefix, env


def invoke(argv, env):
    return subprocess.run(argv, env=env, capture_output=True, text=True, timeout=15, check=True)


def replacement_process(prefix, env, unit, old_app, executable):
    query = prefix + ['/usr/bin/systemctl', '--user', 'show', unit, '--property=MainPID', '--value']
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        pid = int(invoke(query, env).stdout.strip())
        current = identity(pid)
        if current and current['uid'] == old_app['uid'] and not same_instance(current, old_app):
            if proc_file(pid, 'exe').resolve() == executable:
                return current
        time.sleep(0.2)
    raise RuntimeError('cabu-recovery-replacement-unobserved')


def recover(job):
    """Réserver durablement le redémarrage avant le premier signal."""
    from django.db import connection, transaction
    from .core.api import maintenance_command
    from .core.commands import Refused
    from .core.models import Actor, SystemUpdate

    if os.getuid() != 0 or authorization(job, frontend=True)['state'] != 'AUTHORIZED':
        return
    scope = job.result['recovery_context']
    app, backend = scope['frontend'], scope['instance']
    targets = [target for target in job.result['connector_targets'] if same_instance(target.get('owner'), backend)]
    target_pids = {target['process']['pid'] for target in targets}
    if not any(item['state'] == 'RELOAD_REQUIRED' and item['original_pid'] in target_pids
               for item in job.result.get('connectors', [])):
        return

    token = hashlib.sha256(job.pk.encode()).hexdigest()
    path = STATE / f'frontend-recovery-{token}.json'
    if read_json(path):
        return
    unit = f'cab-codex-{token[:24]}'
    maintenance_id = f'CABU-FRONTEND-{token}'
    attempt = {'state': 'STOPPING', 'frontend': app, 'backend': backend, 'signals': [],
               'shared_stdio': shared_profile(app['uid'],job.actor.agent)}
    with ExitStack() as stack:
        try:
            app_fd = open_process(stack, app)
            backend_fd = open_process(stack, backend)
            relay_fds = []
            for target in targets:
                saved = target['process']
                if identity(saved['pid']) != saved or cab_process(saved['pid'], 'mcp') != target['agent']:
                    continue
                relay_fds.append((saved['pid'], open_process(stack, saved)))
                children = proc_file(saved['pid'], f"task/{saved['pid']}/children")
                for pid in children.read_text().split():
                    worker = identity(pid)
                    if (worker and worker['uid'] == app['uid'] and worker['parent_pid'] == saved['pid']
                            and cab_process(worker['pid'], 'mcp-worker') == target['agent']):
                        relay_fds.append((worker['pid'], open_process(stack, worker)))
            executable = frontend_executable(app['pid'])
            if executable is None:
                return
            account = pwd.getpwuid(app['uid'])
            if not account.pw_uid:
                return
            prefix, env = user_environment(account, app)
            args = prefix + ['/usr/bin/systemd-run', '--user', '--collect']
            invoke(args + ['--wait', f'--unit={unit}-check', '/usr/bin/true'], env)
        except (OSError, RuntimeError, KeyError, subprocess.SubprocessError):
            return

        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    cursor.execute('SELECT pg_advisory_xact_lock(%s)', [300001])
                current = SystemUpdate.objects.select_for_update().get(pk=job.pk)
                Actor.objects.select_for_update().get(pk=current.actor_id)
                authority = authorization(current, frontend=True)
                if read_json(path) or authority['state'] != 'AUTHORIZED':
                    return
                if authority.get('stopped_counters'):
                    attempt['stopped_counters'] = authority['stopped_counters']
                result = maintenance_command(current.actor, 'maintenance.prepare', {
                    'transaction_id': maintenance_id, 'evidence': {'update': job.pk, 'purpose': 'cabu-frontend-recovery'},
                })
                if result['state'] != 'PREPARED':
                    return
                atomic_json(path, attempt)
        except Refused:
            return

        def record(role, name):
            attempt['signals'].append({'process': role, 'signal': name})
            atomic_json(path, attempt)

        try:
            stop_process(app_fd, lambda name: record('frontend', name))
            stop_process(backend_fd, lambda name: record('backend', name))
            for pid, fd in relay_fds:
                stop_process(fd, lambda name: record(f'relay:{pid}', name))
            attempt['state'] = 'LAUNCHING'
            atomic_json(path, attempt)
            settings = [f'--setenv={key}={value}' for key, value in env.items()]
            invoke(args + [f'--unit={unit}', *settings, '--', str(executable)], env)
            current_app = replacement_process(prefix, env, unit, app, executable)
            attempt.update(state='WAITING_MCP', replacement=current_app)
        except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
            attempt.update(state='UNKNOWN', error=type(error).__name__)
        finally:
            atomic_json(path, attempt)
            maintenance_command(job.actor, 'maintenance.resume', {'transaction_id': maintenance_id})


def observation(job):
    token = hashlib.sha256(job.pk.encode()).hexdigest()
    return read_json(STATE / f'frontend-recovery-{token}.json', {})
