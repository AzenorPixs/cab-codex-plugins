"""Métadonnées Linux seulement ; aucune lecture de secret ni signal tiers."""
from pathlib import Path

def identity(pid):
    try:
        path=Path('/proc')/str(int(pid));parts=(path/'stat').read_text().split(') ',1)[1].split()
        if parts[0]=='Z':return None
        return {'pid':int(pid),'uid':path.stat().st_uid,'parent_pid':int(parts[1]),'start':parts[19],'boot':Path('/proc/sys/kernel/random/boot_id').read_text().strip()}
    except (OSError,ValueError,IndexError):return None

def alive(saved):return bool(saved) and identity(saved.get('pid'))==saved

def cab_process(pid,mode):
    try:
        args=[value.decode() for value in (Path('/proc')/str(pid)/'cmdline').read_bytes().split(b'\0') if value]
        at=args.index('cab_platform.cli')
        if at==0 or args[at-1]!='-m' or args[at+1]!=mode:return None
        rest=args[at+2:]
        if rest not in ([],['--agent','codex'],['--agent','codex-cli'],['--agent','opencode']):return None
        return rest[-1] if rest else 'codex'
    except (OSError,ValueError,IndexError,UnicodeError):return None

def legacy_processes(allowed,managed):
    rows=[]
    for path in Path('/proc').iterdir():
        if not path.name.isdigit():continue
        info=identity(path.name)
        if not info or info in managed:continue
        agent=cab_process(info['pid'],'mcp')
        if (info['uid'],agent) not in allowed:continue
        owner=identity(info['parent_pid'])
        rows.append({'kind':'legacy','agent':agent,'process':info,'owner':owner})
    return rows
