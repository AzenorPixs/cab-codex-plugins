#!/usr/bin/env python3
"""Lecture locale seule d’un checkpoint SGS ; aucun état métier CAB modifié."""
import argparse
import json
import os
from pathlib import Path
import sqlite3
import stat

VERSION = "2.4.29"


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--state-root',required=True,type=Path)
    parser.add_argument('--project',required=True);parser.add_argument('--component',required=True)
    args=parser.parse_args();root=args.state_root/'cab-approval-bridge/sgs';path=root/'runtime.sqlite3'
    if not path.exists():print(json.dumps({'data':None,'sequence':0}));return
    info=path.lstat()
    if root.resolve()!=root or not stat.S_ISREG(info.st_mode) or info.st_uid!=os.getuid() or info.st_mode&0o077:raise ValueError('sgs-checkpoint-not-private')
    connection=sqlite3.connect(path.as_uri()+'?mode=ro',uri=True)
    try:
        row=connection.execute('SELECT uid,sequence,body FROM component_checkpoints WHERE project=? AND component=?',(args.project,args.component)).fetchone()
        if row and row[0]!=os.getuid():raise ValueError('sgs-checkpoint-owner-mismatch')
        print(json.dumps({'data':json.loads(row[2]) if row else None,'sequence':row[1] if row else 0}))
    finally:connection.close()


if __name__=='__main__':main()
