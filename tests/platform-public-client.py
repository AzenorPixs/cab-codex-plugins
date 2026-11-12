"""Nouveau client MCP sous compte non root ; lectures publiques seulement."""
import json
import os
import selectors
import subprocess
import time
assert os.getuid()!=0,'Exécuter ce contrôle sous un compte client non root'
p=subprocess.Popen(['/usr/bin/cab','mcp','--agent','codex'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,bufsize=1)
sequence=0;selector=selectors.DefaultSelector();selector.register(p.stdout,selectors.EVENT_READ)
def rpc(method,params,notification=False):
    global sequence
    sequence+=1;message={'jsonrpc':'2.0','method':method,'params':params}
    if not notification:message['id']=sequence
    p.stdin.write(json.dumps(message)+'\n');p.stdin.flush()
    if notification:return
    end=time.monotonic()+20
    while time.monotonic()<end:
        if not selector.select(.2):continue
        line=p.stdout.readline()
        if not line:raise RuntimeError('MCP client stopped')
        result=json.loads(line)
        if result.get('id')==sequence:
            assert 'error' not in result,'MCP public request failed'
            return result['result']
    raise RuntimeError('MCP public request timeout')
try:
    rpc('initialize',{'protocolVersion':'2025-11-25','capabilities':{},'clientInfo':{'name':'cab-public-client-proof','version':'1'}})
    rpc('notifications/initialized',{},True)
    tools=rpc('tools/list',{})['tools'];assert any(tool['name']=='run_reconcile_archive' for tool in tools)
    result=rpc('tools/call',{'name':'cab_status','arguments':{}});assert not result.get('isError')
    health=result.get('structuredContent') or json.loads(result['content'][0]['text'])
    assert health['state']=='READY'
    if os.environ.get('CAB_EXPECTED_VERSION'):assert health['version']==os.environ['CAB_EXPECTED_VERSION']
    print(json.dumps({'uid':os.getuid(),'new_mcp_process':True,'archive_reconciliation_tool_exposed':True,'health':health['state'],'version':health['version']}))
finally:
    selector.close();p.terminate();p.wait(timeout=10)
