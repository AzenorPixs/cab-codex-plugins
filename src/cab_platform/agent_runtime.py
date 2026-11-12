"""Observation Linux des processus et transports MCP, sans exporter les argv."""
import os
from pathlib import Path


def processes(uids,proc=Path('/proc')):
    rows=[]
    for entry in proc.iterdir():
        if not entry.name.isdigit():continue
        try:
            uid=entry.stat().st_uid
            if uid not in uids:continue
            state=(entry/'stat').read_text().split(') ',1)[1].split()[0]
            if state in ('Z','X'):continue
            executable=os.readlink(entry/'exe').removesuffix(' (deleted)')
            # Analyse locale seulement ; aucun argument ou environnement exporté.
            args=(entry/'cmdline').read_bytes()[:16384].split(b'\0')
            mcp=None
            if b'cab_platform.cli' in args and b'mcp' in args:
                mcp=next((args[i+1].decode() for i,value in enumerate(args[:-1]) if value==b'--agent'),None)
                if mcp not in ('codex','opencode'):mcp=None
            name=Path(executable).name
            administrative=len(args)>1 and args[1] in (b'plugin',b'mcp',b'login',b'logout',b'auth',b'upgrade',b'update',b'completion',b'completions')
            agent=name if name in ('codex','opencode') and not administrative and b'--version' not in args and b'--help' not in args else None
            rows.append({'pid':int(entry.name),'uid':uid,'agent':agent,'mcp':mcp,'proc':entry})
        except (OSError,ValueError,IndexError,UnicodeError):continue
    return rows


def pipes(process):
    values=[];entry=process['proc']
    try:
        stderr=os.readlink(entry/'fd/2')
        for fd in (entry/'fd').iterdir():
            try:
                endpoint=os.readlink(fd)
                if not endpoint.startswith('pipe:') or endpoint==stderr:continue
                flags=next(line.split()[1] for line in (entry/'fdinfo'/fd.name).read_text().splitlines() if line.startswith('flags:'))
                access=int(flags,8)&os.O_ACCMODE
                values.append((endpoint,access))
            except (OSError,ValueError,StopIteration):continue
    except OSError:return None
    return values


def observation(rows,agent):
    candidates=[row for row in rows if row['mcp']==agent];connected=False;unknown=False
    # Le SDK MCP peut détourner fd0/fd1 et conserver les fils sur fd6/fd7.
    # On observe les pipes et leurs directions, pas seulement les descripteurs std.
    for candidate in candidates:
        own=pipes(candidate)
        if own is None:unknown=True;continue
        incoming={pipe for pipe,access in own if access in (os.O_RDONLY,os.O_RDWR)}
        outgoing={pipe for pipe,access in own if access in (os.O_WRONLY,os.O_RDWR)}
        readers=set();writers=set()
        for peer in rows:
            if peer['pid']==candidate['pid']:continue
            # Les fd stderr des pairs peuvent transporter le flux d'un relais ;
            # les pipes observés du serveur restent ceux hors journal.
            try:
                for fd in (peer['proc']/'fd').iterdir():
                    try:
                        pipe=os.readlink(fd)
                        if pipe not in incoming|outgoing:continue
                        flags=next(line.split()[1] for line in (peer['proc']/'fdinfo'/fd.name).read_text().splitlines() if line.startswith('flags:'))
                        access=int(flags,8)&os.O_ACCMODE
                        if access in (os.O_RDONLY,os.O_RDWR):readers.add(pipe)
                        if access in (os.O_WRONLY,os.O_RDWR):writers.add(pipe)
                    except (OSError,ValueError,StopIteration):continue
            except OSError:unknown=True
        if incoming&writers and outgoing&readers:connected=True;break
    return {'running':any(row['agent']==agent for row in rows),'mcp_running':bool(candidates),'mcp_connected':connected,'mcp_state':'connected' if connected else 'unverified' if unknown else 'disconnected'}
