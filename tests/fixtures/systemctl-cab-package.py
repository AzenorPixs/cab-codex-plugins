#!/usr/bin/python3.13
"""Uniquement dans le conteneur sans PID1 systemd : hooks, puis vrai serveur CAB."""
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
args=sys.argv[1:]
with Path('/var/log/cab-package-systemctl.jsonl').open('a') as log:log.write(json.dumps(args)+'\n')
pidfile=Path('/run/cab-fixture-service.pid')
def alive():
    try:
        pid=int(pidfile.read_text());return Path(f'/proc/{pid}/stat').read_text().split(') ',1)[1][0]!='Z' and b'cab_platform.cli' in Path(f'/proc/{pid}/cmdline').read_bytes()
    except (OSError,ValueError):return False
if args[0] in ('daemon-reload','enable','disable'):raise SystemExit(0)
if args[0]=='is-active':raise SystemExit(0 if alive() else 3)
if args[0]=='start':
    if not alive():
        with Path('/var/log/cab-fixture.log').open('ab') as log:
            p=subprocess.Popen(['/usr/bin/cab','serve'],stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
        pidfile.write_text(str(p.pid))
elif args[0]=='stop':
    if alive():
        os.kill(int(pidfile.read_text()),signal.SIGTERM)
        for _ in range(100):
            if not alive():break
            time.sleep(.1)
        else:raise SystemExit('fixture service did not stop')
elif args[0]=='reload':
    if alive():os.kill(int(pidfile.read_text()),signal.SIGHUP)
else:raise SystemExit('fixture systemctl action unsupported')
