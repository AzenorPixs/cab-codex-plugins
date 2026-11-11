"""Point d’entrée installé et outils d’administration explicitement demandés."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import pwd
import subprocess
import sys
from . import __version__
from .client import Client,ClientError

def main(argv=None):
    parser=argparse.ArgumentParser(prog='cab');parser.add_argument('--version',action='version',version=__version__)
    sub=parser.add_subparsers(dest='action',required=True)
    sub.add_parser('status')
    serve=sub.add_parser('serve');serve.add_argument('--port',type=int,default=8790)
    mcp=sub.add_parser('mcp');mcp.add_argument('--agent',choices=['codex','opencode'],default='codex')
    sub.add_parser('bootstrap-token')
    update_parser=sub.add_parser('update');update_parser.add_argument('--package')
    enroll=sub.add_parser('enroll');enroll.add_argument('--user',required=True);enroll.add_argument('--agent',required=True);enroll.add_argument('--role',choices=['coder','orchestrator','collector'],default='coder')
    call=sub.add_parser('call');call.add_argument('name');call.add_argument('--admin',action='store_true')
    integrate=sub.add_parser('integrate');integrate.add_argument('agent',choices=['codex','opencode']);integrate.add_argument('--user',required=True);integrate.add_argument('--workspace')
    maintenance=sub.add_parser('maintenance');maintenance.add_argument('step',choices=['prepare','resume','cancel','verify']);maintenance.add_argument('--transaction',required=True)
    imp=sub.add_parser('import-legacy');imp.add_argument('manifest')
    backup=sub.add_parser('backup');backup.add_argument('--destination',required=True)
    sgs=sub.add_parser('sgs');sgs.add_argument('arguments',nargs=argparse.REMAINDER)
    args=parser.parse_args(argv)
    try:
        if args.action=='status':result=Client().get('health')
        elif args.action=='serve':
            from .service import run
            run(args.port);return 0
        elif args.action=='mcp':
            from .mcp import run
            os.environ['CAB_AGENT']=args.agent;run();return 0
        elif args.action=='bootstrap-token':
            if os.getuid()!=0:raise ClientError('root-administration-required')
            from .paths import secret
            print(secret('bootstrap-token'));return 0
        elif args.action=='update':
            from .update import update
            result=update(args.package)
        elif args.action=='enroll':
            if os.getuid()!=0:raise ClientError('root-administration-required')
            user=pwd.getpwnam(args.user);actor_id=args.agent+'-'+str(user.pw_uid)+'-'+args.role
            result=Client(admin=True).command('actor.enroll',{'id':actor_id,'uid':user.pw_uid,'agent':args.agent,'role':args.role})
            from .integration import write_profile
            target=write_profile(user,args.agent,{'actor_id':result['actor_id'],'token':result['token']})
            result={'actor_id':result['actor_id'],'profile':str(target),'token_exposed':False}
        elif args.action=='call':result=Client(admin=args.admin).command(args.name,json.load(sys.stdin))
        elif args.action=='integrate':
            from .integration import integrate
            result=integrate(args.agent,args.user,args.workspace)
        elif args.action=='maintenance':
            if args.step=='verify':
                from .maintenance import verify
                result=verify()
            else:
                result=Client(admin=True).command('maintenance.'+args.step,{'transaction_id':args.transaction,'evidence':{'administrator_uid':os.getuid()}})
                from .paths import STATE,atomic_json
                atomic_json(STATE/'maintenance-receipt.json',result)
        elif args.action=='import-legacy':
            if os.getuid()!=0:raise ClientError('root-administration-required')
            os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
            import django;django.setup()
            from .migration import import_manifest
            result=import_manifest(Path(args.manifest))
        elif args.action=='backup':
            from .maintenance import backup
            result=backup(Path(args.destination))
        elif args.action=='sgs':
            from . import sgs_engine
            return sgs_engine.main(args.arguments)
        print(json.dumps(result,ensure_ascii=False,default=str));return 0
    except (ClientError,OSError,ValueError,KeyError) as error:
        from .logging import redact
        print(json.dumps({'error':redact(str(error))}),file=sys.stderr);return 1

if __name__=='__main__':raise SystemExit(main())
