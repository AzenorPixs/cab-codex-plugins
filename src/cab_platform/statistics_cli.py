"""Interface légère : toute mutation statistique appartient au service CAB."""
import argparse
import json
from pathlib import Path
import secrets
import re
import sys
from . import __version__
from .client import Client

def main(argv=None,legacy=False):
    parser=argparse.ArgumentParser(description='Statistiques CAB : sources locales, projection et génération par le service.')
    parser.add_argument('mode',choices=['sync','generate','status','change','project','VERSION','CHANGE','DELTA','REBUILD','INSPECT','QUERY','VERIFY','RECOVER'])
    parser.add_argument('--project-root');parser.add_argument('--project-id');parser.add_argument('--change');parser.add_argument('--request-id')
    for name in ['contract','state','evidence','report','review','cab-export','file-mode','metric']:parser.add_argument('--'+name)
    for name in ['maintain-global','no-code','sources']:parser.add_argument('--'+name,action='store_true')
    parser.add_argument('--code-root',action='append');parser.add_argument('--offset',type=int,default=0);parser.add_argument('--limit',type=int,default=50)
    args=parser.parse_args(argv)
    if args.mode=='VERSION':print(json.dumps({'version':__version__,'owner':'cab.service','source_of_truth':'change/STATISTICS.md'}));return 0
    client=Client();project=args.project_id
    if not project:
        if not args.project_root:parser.error('--project-root ou --project-id requis')
        project=client.command('project.register',{'root':str(Path(args.project_root).resolve())})['project_id']
    change=args.change
    if change and '/' in change:change=re.sub(r'^\d{4}-\d{2}-\d{2}-','',Path(change).name)
    if args.evidence=='-':sys.stdin.buffer.read(2*1024*1024+1)
    if args.mode in ('generate','CHANGE'):
        if not change:parser.error('--change requis')
        result=client.command('statistics.sync',{'project_id':project,'change':change,'request_id':args.request_id or 'CLI-'+secrets.token_hex(16)})
    elif args.mode in ('sync','DELTA','REBUILD','RECOVER'):
        result=client.command('statistics.sync',{'project_id':project,'request_id':args.request_id or 'CLI-'+secrets.token_hex(16),'full':True})
    elif args.mode in ('change','INSPECT','QUERY') and change:result=client.command('statistics.change',{'project_id':project,'change':change})
    else:result=client.command('statistics.project',{'project_id':project})
    print(json.dumps(result,ensure_ascii=False,default=str));return 0
