#!/usr/bin/env python3
"""Hold the shared registry authority lock until the controller closes stdin."""

import fcntl
import os
import stat
import sys

VERSION = "2.1.10"


def main():
    path = sys.argv[1]
    flags = os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW
    fd = os.open(path, flags, 0o600)
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
            raise RuntimeError("invalid registry lock")
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        print("READY", flush=True)
        while sys.stdin.buffer.read(4096):
            pass
    except (BlockingIOError, RuntimeError):
        print("registry authority unavailable", file=sys.stderr)
        return 1
    finally:
        os.close(fd)
    return 0


if __name__ == "__main__":
    sys.exit(main())
