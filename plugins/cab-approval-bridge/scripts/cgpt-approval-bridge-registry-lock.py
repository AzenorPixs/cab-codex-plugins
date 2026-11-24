#!/usr/bin/env python3
"""Hold the shared registry authority lock until the controller closes stdin."""

import fcntl
import os
import stat
import sys

VERSION = "2.7.4"


def main():
    descriptors = []
    paths = sys.argv[1:]
    read_only = paths[:1] == ["--read-only"]
    if read_only:
        paths = paths[1:]
    try:
        for path in paths:
            flags = os.O_NOFOLLOW | os.O_NONBLOCK
            if read_only:
                try:
                    fd = os.open(path, os.O_RDONLY | flags)
                except FileNotFoundError:
                    return 2
            else:
                try:
                    fd = os.open(path, os.O_RDWR | os.O_CREAT | os.O_EXCL | flags, 0o770)
                    os.fchmod(fd,0o770)
                except FileExistsError:
                    fd = os.open(path, os.O_RDWR | flags)
            descriptors.append(fd)
            info = os.fstat(fd)
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
                raise RuntimeError("invalid registry lock")
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        print("READY", flush=True)
        while sys.stdin.buffer.read(4096):
            pass
    except (OSError, RuntimeError):
        print("registry authority unavailable", file=sys.stderr)
        return 1
    finally:
        for fd in descriptors:
            os.close(fd)
    return 0


if __name__ == "__main__":
    sys.exit(main())
