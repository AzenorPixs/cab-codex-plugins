"""Arrêt du seul enfant possédé, par pidfd et à frontière sûre."""
import asyncio
import os
import select
import signal
import inspect
from .connector_process import identity,cab_process

DEFAULT={'graceful_timeout_seconds':2,'term_timeout_seconds':10,'kill_timeout_seconds':5,'allow_sigkill':True}

def policy(value=None):
    if value is None:return dict(DEFAULT)
    if not isinstance(value,dict) or set(value)-set(DEFAULT):raise ValueError('mcp-reload-policy-fields-invalid')
    result={**DEFAULT,**value}
    for key in ('graceful_timeout_seconds','term_timeout_seconds','kill_timeout_seconds'):
        if type(result[key]) not in (int,float) or not .1<=result[key]<=120:raise ValueError('mcp-reload-policy-timeout-invalid')
    if type(result['allow_sigkill']) is not bool:raise ValueError('mcp-reload-policy-sigkill-invalid')
    return result

async def stop_child(process,agent,settings,quiescent):
    settings=policy(settings);saved=identity(process.pid)
    result={'worker':saved,'policy':settings,'state':'REFUSED','stages':[]}
    if process.returncode is not None:
        await process.wait();return {**result,'state':'STOPPED','reason':'already-exited'}
    if saved is None:
        try:await asyncio.wait_for(asyncio.shield(process.wait()),settings['kill_timeout_seconds'])
        except asyncio.TimeoutError:return {**result,'reason':'worker-identity-unavailable'}
        return {**result,'state':'STOPPED','reason':'exit-observed'}
    async def safe():
        quiet=quiescent()
        if inspect.isawaitable(quiet):quiet=await quiet
        return quiet and identity(process.pid)==saved and saved['uid']==os.getuid() and saved['parent_pid']==os.getpid() and cab_process(process.pid,'mcp-worker')==agent
    if not await safe():return {**result,'reason':'worker-identity-or-boundary-invalid'}
    fd=os.pidfd_open(process.pid)
    try:
        if not await safe():return {**result,'reason':'worker-identity-or-boundary-changed'}
        if process.stdin:
            process.stdin.close();result['stages'].append('stdin-eof')
        try:await asyncio.wait_for(asyncio.shield(process.wait()),settings['graceful_timeout_seconds'])
        except asyncio.TimeoutError:pass
        else:return {**result,'state':'STOPPED','reason':'graceful-exit'}
        for sig,timeout in [(signal.SIGTERM,'term_timeout_seconds'),(signal.SIGKILL,'kill_timeout_seconds')]:
            if select.select([fd],[],[],0)[0]:await process.wait();return {**result,'state':'STOPPED','reason':'exit-observed'}
            if sig==signal.SIGKILL and not settings['allow_sigkill']:return {**result,'state':'DEFERRED','reason':'sigkill-disabled'}
            if not await safe():return {**result,'state':'DEFERRED','reason':'worker-identity-or-boundary-changed'}
            try:signal.pidfd_send_signal(fd,sig)
            except ProcessLookupError:await process.wait();return {**result,'state':'STOPPED','reason':'exit-observed'}
            result['stages'].append(sig.name)
            try:await asyncio.wait_for(asyncio.shield(process.wait()),settings[timeout])
            except asyncio.TimeoutError:continue
            return {**result,'state':'STOPPED','reason':sig.name+'-exit'}
        return {**result,'state':'DEFERRED','reason':'worker-exit-unconfirmed'}
    finally:os.close(fd)
