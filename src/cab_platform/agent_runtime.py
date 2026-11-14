"""Processus et IPC locaux ; aucune lecture des flux ou export des argv."""
import os
from pathlib import Path
import socket
import struct


def processes(uids,proc=Path('/proc')):
    rows=[]
    for entry in proc.iterdir():
        if not entry.name.isdigit():continue
        try:
            uid=entry.stat().st_uid
            if uid not in uids:continue
            fields=(entry/'stat').read_text().split(') ',1)[1].split()
            if fields[0] in ('Z','X'):continue
            exe=os.readlink(entry/'exe').removesuffix(' (deleted)');args=(entry/'cmdline').read_bytes()[:16384].split(b'\0');mcp=None
            if b'cab_platform.cli' in args and b'mcp' in args:
                mcp=next((args[i+1].decode() for i,value in enumerate(args[:-1]) if value==b'--agent'),None)
                if mcp not in ('codex','codex-cli','opencode'):mcp=None
            name=Path(exe).name
            administrative=len(args)>1 and args[1] in (b'plugin',b'mcp',b'login',b'logout',b'auth',b'upgrade',b'update',b'completion',b'completions')
            agent=name if name in ('codex','opencode') and not administrative and b'--version' not in args and b'--help' not in args else None
            rows.append({'pid':int(entry.name),'ppid':int(fields[1]),'uid':uid,'exe':exe,'agent':agent,'mcp':mcp,'proc':entry})
        except (OSError,ValueError,IndexError,UnicodeError):continue
    return rows


def socket_peers():
    """UNIX_DIAG_PEER Linux : seulement des inodes, aucun nom ou contenu."""
    peers={}
    request=struct.pack('=BBHIIIII',socket.AF_UNIX,0,0,0xffffffff,0,4,0xffffffff,0xffffffff)
    with socket.socket(socket.AF_NETLINK,socket.SOCK_RAW,4) as stream:
        stream.settimeout(1);stream.bind((0,0));stream.send(struct.pack('=IHHII',16+len(request),20,0x301,1,0)+request)
        while True:
            packet=stream.recv(262144);offset=0
            while offset+16<=len(packet):
                size,kind,flags,seq,pid=struct.unpack_from('=IHHII',packet,offset)
                if size<16:raise OSError('unix-diag-invalid')
                if kind==3:return peers
                if kind==2:raise OSError('unix-diag-refused')
                if kind==20 and size>=32:
                    inode=struct.unpack_from('=I',packet,offset+20)[0];attribute=offset+32
                    while attribute+4<=offset+size:
                        length,tag=struct.unpack_from('=HH',packet,attribute)
                        if length<4:break
                        if tag==2 and length>=8:peers[inode]=struct.unpack_from('=I',packet,attribute+4)[0]
                        attribute+=(length+3)&~3
                offset+=(size+3)&~3


def pipes(process,exclude_log=True):
    values=[];entry=process['proc']
    try:
        stderr=os.readlink(entry/'fd/2') if exclude_log else None
        for fd in (entry/'fd').iterdir():
            try:
                endpoint=os.readlink(fd)
                if not endpoint.startswith(('pipe:','socket:')) or endpoint==stderr:continue
                flags=next(line.split()[1] for line in (entry/'fdinfo'/fd.name).read_text().splitlines() if line.startswith('flags:'))
                values.append((endpoint,int(flags,8)&os.O_ACCMODE))
            except (OSError,ValueError,StopIteration):continue
    except OSError:return None
    return values


def ancestry(process,rows):
    index={row['pid']:row for row in rows};result=[];seen={process['pid']};pid=process.get('ppid')
    while pid in index and pid not in seen:
        parent=index[pid];result.append(parent);seen.add(pid)
        if parent['agent']:break
        pid=parent.get('ppid')
    return result


def observation(rows,agent,peers=None):
    family='codex' if agent=='codex_desktop' else agent
    families=(family,'codex-cli') if agent=='codex' else (family,)
    candidates=[row for row in rows if row['mcp'] in families];connected=False;transport=False;unknown=False;relevant=False
    for candidate in candidates:
        parents=ancestry(candidate,rows);kind=next((row['agent'] for row in parents if row['agent']),None)
        if kind is not None and kind!=agent:continue
        relevant=True;own=pipes(candidate)
        if own is None:unknown=True;continue
        peer_fds=[item for parent in parents for item in (pipes(parent,False) or [])]
        incoming=False;outgoing=False;matched=set()
        for descriptor,(endpoint,access) in enumerate(own):
            opposite=endpoint
            if endpoint.startswith('socket:'):
                if peers is None:
                    try:peers=socket_peers()
                    except OSError:peers={};unknown=True
                inode=int(endpoint[8:-1]);other=peers.get(inode)
                if not other:continue
                opposite='socket:['+str(other)+']'
            for target,peer_access in peer_fds:
                if target!=opposite:continue
                matched.add(descriptor)
                if access in (os.O_RDONLY,os.O_RDWR) and peer_access in (os.O_WRONLY,os.O_RDWR):incoming=True
                if access in (os.O_WRONLY,os.O_RDWR) and peer_access in (os.O_RDONLY,os.O_RDWR):outgoing=True
        if incoming and outgoing and len(matched)>=2:
            transport=True
            if kind==agent:connected=True
            else:unknown=True
    return {'running':any(row['agent']==agent for row in rows),'mcp_running':relevant,'mcp_transport_connected':transport,'mcp_connected':connected,'mcp_state':'connected' if connected else 'unverified' if unknown else 'disconnected'}
