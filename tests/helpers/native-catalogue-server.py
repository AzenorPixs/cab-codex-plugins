"""MCP de fixture isolée ; aucune API métier CAB ni credential."""
import json
import os
from pathlib import Path
import sys

version=Path(sys.argv[1]).read_text().strip();log=Path(sys.argv[2])
for line in sys.stdin:
    message=json.loads(line);method=message.get('method')
    with log.open('a') as stream:stream.write(json.dumps({'pid':os.getpid(),'method':method,'version':version})+'\n')
    if 'id' not in message:continue
    if method=='initialize':result={'protocolVersion':message['params']['protocolVersion'],'capabilities':{'tools':{'listChanged':True}},'serverInfo':{'name':'CAB-native-fixture','version':version}}
    elif method=='tools/list':result={'tools':[{'name':'fixture_'+version.replace('.','_'),'description':'Outil de fixture sans effet','inputSchema':{'type':'object','properties':{}}}]}
    elif method=='ping':result={}
    else:
        print(json.dumps({'jsonrpc':'2.0','id':message['id'],'error':{'code':-32601,'message':'fixture-method-unavailable'}}),flush=True);continue
    print(json.dumps({'jsonrpc':'2.0','id':message['id'],'result':result}),flush=True)
