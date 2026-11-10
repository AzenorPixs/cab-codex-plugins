#!/usr/bin/env python3
"""Coordinate pause admission with dependency delivery until stdin closes."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import stat
import sys

VERSION = '2.5.4'


def name(prefix, parts):
    data = json.dumps(parts, ensure_ascii=False, separators=(',', ':')).encode()
    return prefix + '-' + hashlib.sha256(data).hexdigest() + '.lock'


def main():
    descriptors = []
    try:
        if len(sys.argv) != 5:
            raise ValueError('arguments')
        root, project, run, mode = sys.argv[1:]
        if not Path(root).is_absolute() or not Path(project).is_absolute() or mode not in ('run', 'global'):
            raise ValueError('identity')
        base = Path(root) / 'cab-approval-bridge/dependencies'
        base.mkdir(mode=0o700, parents=True, exist_ok=True)
        directory = base / 'locks'
        directory.mkdir(mode=0o700, exist_ok=True)
        for path in (base, directory):
            info = path.lstat()
            if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
                raise ValueError('directory')
        locks = [(name('global', [project]), fcntl.LOCK_EX if mode == 'global' else fcntl.LOCK_SH)]
        if mode == 'run':
            locks.append((name('run', [project, run]), fcntl.LOCK_EX))
        for filename, operation in locks:
            fd = os.open(directory / filename, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
            descriptors.append(fd)
            info = os.fstat(fd)
            if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077 or info.st_nlink != 1:
                raise ValueError('lock')
            fcntl.flock(fd, operation)
        print('READY', flush=True)
        while sys.stdin.buffer.read(4096):
            pass
        return 0
    except (OSError, ValueError):
        print('dependency gate unavailable', file=sys.stderr)
        return 1
    finally:
        for fd in reversed(descriptors):
            os.close(fd)


if __name__ == '__main__':
    sys.exit(main())
