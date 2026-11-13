"""À lancer sur demande CABU explicite : parcours MCP réel, même reçu durable."""
import json
import selectors
import subprocess
import time
from pathlib import Path

request_id='CABU-MCP-3.2.1-20261113'
process=subprocess.Popen(['/usr/bin/cab','mcp','--agent','codex'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,bufsize=1)
selector=selectors.DefaultSelector();selector.register(process.stdout,selectors.EVENT_READ);sequence=0
def rpc(method,params,notification=False):
    global sequence
    sequence+=1;packet={'jsonrpc':'2.0','method':method,'params':params}
    if not notification:packet['id']=sequence
    process.stdin.write(json.dumps(packet)+'\n');process.stdin.flush()
    if notification:return
    deadline=time.monotonic()+1860
    while time.monotonic()<deadline:
        if process.poll() is not None:raise RuntimeError('mcp-process-ended')
        if selector.select(.2):
            line=process.stdout.readline()
            if not line:raise RuntimeError('mcp-response-missing')
            value=json.loads(line)
            if value.get('id')==sequence:
                if 'error' in value:raise RuntimeError('mcp-protocol-error')
                return value['result']
    raise RuntimeError('mcp-wait-timeout-read-same-request')
def call(name,args):
    result=rpc('tools/call',{'name':name,'arguments':args})
    if result.get('isError'):raise RuntimeError('mcp-tool-refused-read-same-request')
    return result.get('structuredContent') or json.loads(result['content'][0]['text'])
try:
    rpc('initialize',{'protocolVersion':'2025-11-25','capabilities':{},'clientInfo':{'name':'cab-explicit-update-qualification','version':'1'}})
    rpc('notifications/initialized',{},True)
    names={tool['name'] for tool in rpc('tools/list',{})['tools']}
    assert {'cab_update','cab_update_status'}<=names
    result=call('cab_update',{'request_id':request_id,'version':'3.2.1'})
    if result.get('state')=='ADMISSION_UNCONFIRMED':result=call('cab_update_status',{'request_id':request_id})
    assert result['state']=='OK' and result['version']=='3.2.1' and result['verified'] is True,result
    repeated=call('cab_update',{'request_id':request_id,'version':'3.2.1'})
    assert repeated==result,'idempotent-receipt-divergent'
    proof={**result,'native_mcp_tools_discovered':True,'repeated_request_same_receipt':True}
    Path('output/scm/cab-3.0.0/self-update-native-mcp-proof.json').write_text(json.dumps(proof,indent=2)+'\n')
    print(json.dumps(proof))
finally:
    selector.close();process.terminate();process.wait(timeout=10)
