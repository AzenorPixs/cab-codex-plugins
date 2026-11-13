"""Deux profils MCP stdio réels, moteur remplacé après un appel métier réel."""
import hashlib
import json
import os
from pathlib import Path
import select
import subprocess
import tempfile
import time
assert os.environ.get('CAB_TEST_FIXTURE')=='1' and Path('/.dockerenv').exists()
os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
import django
django.setup()
from cab_platform.core.models import McpConnector,Operation,Run

VERSION=Path('/usr/lib/cab/python/cab_platform/__init__.py');original=VERSION.read_text()
old=original.replace("'3.2.3'","'3.2.2'")
assert old!=original
def wait(check,label,seconds=30):
    until=time.monotonic()+seconds
    while time.monotonic()<until:
        value=check()
        if value:return value
        time.sleep(.1)
    raise AssertionError('timeout:'+label)

class Wire:
    def __init__(self,agent):
        self.process=subprocess.Popen(['/usr/bin/cab','mcp','--agent',agent],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,bufsize=0)
        self.counter=0;self.buffer=b'';self.frames=[];self.notifications=[]
    def send(self,method,params=None,notification=False):
        self.counter+=1;body={'jsonrpc':'2.0','method':method,'params':params or {}}
        if not notification:body['id']=self.counter
        self.process.stdin.write((json.dumps(body)+'\n').encode());self.process.stdin.flush();return self.counter
    def receive(self,seconds=45):
        until=time.monotonic()+seconds
        while time.monotonic()<until:
            if self.frames:return self.frames.pop(0)
            if self.process.poll() is not None:raise AssertionError('bridge-stopped:'+self.process.stderr.read().decode()[-2000:])
            if not select.select([self.process.stdout],[],[],.1)[0]:continue
            chunk=os.read(self.process.stdout.fileno(),65536)
            if not chunk:continue
            self.buffer+=chunk
            while b'\n' in self.buffer:
                line,self.buffer=self.buffer.split(b'\n',1)
                if line:self.frames.append(json.loads(line))
        raise AssertionError('mcp-frame-timeout')
    def response(self,request):
        while True:
            frame=self.receive()
            if frame.get('id')==request:
                assert 'error' not in frame,frame
                return frame['result']
            self.notifications.append(frame)
    def rpc(self,method,params=None):return self.response(self.send(method,params))
    def tool(self,name,arguments):
        result=self.rpc('tools/call',{'name':name,'arguments':arguments});assert not result.get('isError'),result
        return result.get('structuredContent') or json.loads(result['content'][0]['text'])
    def close(self):
        self.process.stdin.close()
        try:self.process.wait(timeout=15)
        except subprocess.TimeoutExpired:self.process.terminate();self.process.wait(timeout=10)
        self.process.stdout.close();self.process.stderr.close()

proof=[]
try:
    for agent in ('codex','opencode'):
        VERSION.write_text(old);wire=Wire(agent)
        try:
            initialized=wire.rpc('initialize',{'protocolVersion':'2025-11-25','capabilities':{},'clientInfo':{'name':agent+'-qualification','version':'1'}})
            assert initialized['serverInfo']['version']=='3.2.2';assert initialized['capabilities']['tools']['listChanged']
            wire.send('notifications/initialized',notification=True);wire.rpc('tools/list')
            row=wait(lambda:McpConnector.objects.filter(process__pid=wire.process.pid,catalog_version='3.2.2').first(),'initial-catalog')
            before={'connector':row.pk,'process':row.process,'worker':row.worker,'generation':row.generation}
            root=Path(tempfile.mkdtemp(prefix='cab-mcp-reload-'));(root/'source').write_text('source stable\n');change=root/'openspec/changes/reload';change.mkdir(parents=True);(change/'tasks.md').write_text('- [ ] Fixture active\n')
            project=wire.tool('project_register',{'root':str(root)})['project_id'];run='RELOAD-'+agent+'-'+root.name
            wire.tool('run_begin',{'project_id':project,'run_id':run,'session_id':'SID-'+run,'change':'reload','mode':'direct','paths':['source'],'criteria':['fixture'],'decisions':[]})
            request='SINGLE-EXECUTION';rpc=wire.send('tools/call',{'name':'atelier_execute','arguments':{'project_id':project,'run_id':run,'session_id':'SID-'+run,'generation':1,'request_id':request,'argv':['/usr/bin/python3.13','-B','-c','import time;time.sleep(4);print("ONE-REAL-EXECUTION")'],'timeout_ms':10000}})
            target=Run.objects.get(project_id=project,run_id=run)
            wait(lambda:Operation.objects.filter(run=target,request_id=request,state='RUNNING').exists(),'real-operation-start')
            VERSION.write_text(original);time.sleep(1.3);row.refresh_from_db()
            assert row.generation==before['generation'] and row.worker==before['worker'],row.state
            result=wire.response(rpc);result=result.get('structuredContent') or json.loads(result['content'][0]['text'])
            assert result['state']=='COMPLETED' and result['receipt']['exit_code']==0,result
            def reloaded():
                row.refresh_from_db();return row.loaded_version=='3.2.3' and row.generation>before['generation']
            wait(reloaded,'worker-reloaded');assert row.catalog_version==''
            assert row.process==before['process'] and row.worker!=before['worker']
            wire.rpc('tools/list');wait(lambda:McpConnector.objects.filter(pk=row.pk,catalog_version='3.2.3').exists(),'catalog-ack')
            assert wire.tool('cab_contract',{})['version']=='3.2.3'
            operation=Operation.objects.get(run=target,request_id=request);assert operation.receipt_digest==result['receipt_digest'];assert Operation.objects.filter(run=target).count()==1
            target.refresh_from_db();assert target.session_id=='SID-'+run and target.generation==1
            proof.append({'agent':agent,'stable_client_process':True,'business_finished_before_reload':True,'worker_replaced':True,'catalog_ack_observed':True,'one_execution_only':True,'same_run_sid_generation_and_receipt':True,'notification_seen':any(n.get('method')=='notifications/tools/list_changed' for n in wire.notifications)})
        finally:wire.close()
finally:VERSION.write_text(original)
Path('/tmp/mcp-reload-323-proof.json').write_text(json.dumps(proof,indent=2));print(json.dumps(proof))
