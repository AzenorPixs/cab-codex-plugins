#!/usr/bin/env python3
"""Hold the shared registry authority lock until the controller closes stdin."""

import fcntl
import os
import stat
import sys

VERSION = "2.2.29"


def main():
    descriptors = []
    try:
        for index, path in enumerate(sys.argv[1:]):
            fd = os.open(path, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW | os.O_NONBLOCK, 0o600 if index == 0 else 0o775)
            descriptors.append(fd)
            info = os.fstat(fd)
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
                raise RuntimeError("invalid registry lock")
            if index > 0 and info.st_uid == os.getuid() and stat.S_IMODE(info.st_mode) != 0o775:
                os.fchmod(fd, 0o775)
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
