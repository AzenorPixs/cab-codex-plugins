import json, os, select, socket, subprocess, sys, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
if os.environ.get('CAB_TEST_ISOLATED_CONTAINER') != '1' or not Path('/.dockerenv').exists():
    raise SystemExit('Run only in the dedicated, network-isolated test container')
sys.path.insert(0, '/tmp')
import cab_session_dependencies as coordination

ready=threading.Event();finish=threading.Event();requests=[]
class Provider(BaseHTTPRequestHandler):
    def log_message(self,*_): pass
    def do_POST(self):
        self.rfile.read(int(self.headers.get('Content-Length','0')))
        requests.append(self.path)
        self.send_response(200);self.send_header('Content-Type','text/event-stream');self.end_headers()
        response={'id':'resp_fixture','object':'response','created_at':int(time.time()),'model':'fixture','status':'in_progress','output':[],'error':None,'incomplete_details':None}
        self.wfile.write(('event: response.created\ndata: '+json.dumps({'type':'response.created','sequence_number':1,'response':response})+'\n\n').encode());self.wfile.flush()
        ready.set();finish.wait(15)
        response.update(status='completed',output=[{'id':'msg_fixture','type':'message','role':'assistant','status':'completed','content':[{'type':'output_text','text':'fixture complete','annotations':[]}]}],usage={'input_tokens':1,'output_tokens':1,'total_tokens':2,'input_tokens_details':{'cached_tokens':0},'output_tokens_details':{'reasoning_tokens':0}})
        try:self.wfile.write(('event: response.completed\ndata: '+json.dumps({'type':'response.completed','sequence_number':2,'response':response})+'\n\n').encode());self.wfile.flush()
        except (BrokenPipeError,ConnectionResetError):pass

server=ThreadingHTTPServer(('127.0.0.1',0),Provider);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
path='/root/.codex/app-server-control/app-server-control.sock';workspace='/tmp/cab-native-workspace';Path(workspace).mkdir(exist_ok=True)
config=Path('/root/.codex/config.toml');config.parent.mkdir(parents=True,exist_ok=True)
config.write_text('model_provider = "fixture"\nmodel = "fixture"\n[model_providers.fixture]\nname = "fixture"\n'
                  +f'base_url = "http://127.0.0.1:{server.server_port}/v1"\n'
                  +'env_key = "CAB_FIXTURE_KEY"\nwire_api = "responses"\nrequires_openai_auth = false\nsupports_websockets = false\n')
args=['codex','app-server','daemon','start','-c','model_provider="fixture"','-c','model="fixture"',
      '-c','model_providers.fixture.name="fixture"','-c',f'model_providers.fixture.base_url="http://127.0.0.1:{server.server_port}/v1"',
      '-c','model_providers.fixture.env_key="CAB_FIXTURE_KEY"','-c','model_providers.fixture.wire_api="responses"',
      '-c','model_providers.fixture.requires_openai_auth=false','-c','model_context_window=8192','-c','model_max_output_tokens=1024']
env=dict(os.environ,CAB_FIXTURE_KEY='fixture-only-key')
proxy_log=open('/tmp/cab-fixture-proxy.err','wb')
started=subprocess.run(args,stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,env=env,timeout=20)
if started.returncode:raise RuntimeError('daemon start failed: '+started.stderr.decode(errors='replace').replace('fixture-only-key','[synthetic]')[-1500:])
try:
    for _ in range(200):
        if Path(path).exists():break
        time.sleep(0.05)
    else:raise RuntimeError('socket unavailable')
    os.chmod(path,0o600)
    native=coordination._NativeWebSocket(path)
    def send(value):native.send(1,json.dumps(value).encode())
    def rpc(identifier,method,params):
        native.deadline=time.monotonic()+20
        send({'jsonrpc':'2.0','id':identifier,'method':method,'params':params})
        while True:
            value=native.message()
            if value.get('id')==identifier:
                if 'error' in value:raise RuntimeError('rpc '+method+' '+str(value['error'].get('message','error')))
                return value['result']
    rpc('init','initialize',{'clientInfo':{'name':'cab-fixture','title':'CAB fixture','version':'1'},'capabilities':{'experimentalApi':True}})
    send({'jsonrpc':'2.0','method':'initialized','params':{}})
    fixture_provider={'name':'fixture','base_url':f'http://127.0.0.1:{server.server_port}/v1',
                      'env_key':'CAB_FIXTURE_KEY','wire_api':'responses','requires_openai_auth':False,
                      'supports_websockets':False}
    created=rpc('thread','thread/start',{'cwd':workspace,'ephemeral':False,'model':'fixture','modelProvider':'fixture',
        'config':{'model_provider':'fixture','model_providers':{'fixture':fixture_provider},'model_context_window':8192},
        'approvalPolicy':'never','sandbox':'read-only'})
    sid=created['thread']['id']
    started=rpc('start','turn/start',{'threadId':sid,'input':[{'type':'text','text':'synthetic fixture only'}]})
    turn=started['turn']['id']
    if not ready.wait(15):raise RuntimeError('synthetic provider not reached')
    def exchange(req):
        return coordination.codex_proxy_exchange(req,path)
    discovered=coordination.codex_active_turn(workspace,sid,exchange)
    if discovered['turn_id']!=turn:raise RuntimeError('turn discovery mismatch')
    sender=coordination.codex_verified_sender(workspace,'fixture-attempt-1',exchange)
    response=sender(sid,turn,'fixture-notice-1')
    if coordination.codex_steer_result(response,'fixture-attempt-1',turn)!='accepted':raise RuntimeError('native steer not accepted')
    finish.set()
    observed=None
    for _ in range(30):
        try:observed=coordination.codex_observe_notice(workspace,sid,turn,'fixture-notice-1','fixture-attempt-1',exchange);break
        except coordination.CoordinationError:time.sleep(0.2)
    print(json.dumps({'native':'codex-cli','thread':'isolated-container','discovery':'passed','steer':'accepted','observation':observed['status'] if observed else 'unverified','provider_paths':sorted(set(requests))}))
    native.close()
finally:
    finish.set();server.shutdown();server.server_close()
    proxy_log.close()
