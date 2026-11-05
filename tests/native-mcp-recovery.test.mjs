import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createOpenCodeV2Client} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs';
const binary=process.env.CAB_TEST_OPENCODE;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(check,label){for(let i=0;i<150;i++){if(await check())return;await delay(50)}throw Error('native MCP fixture: '+label)}
test('OpenCode exact : pending retardé, rechargement global sans arrêt et sessions conservées',{skip:!binary,timeout:30000},async t=>{
 const root=mkdtempSync(join(tmpdir(),'cab-native-mcp-recovery-')),workspace=join(root,'workspace');mkdirSync(workspace);
 const passwordFile=join(root,'password'),script=join(root,'fixture.py'),marker=join(root,'first-start'),pids=join(root,'pids');writeFileSync(passwordFile,'synthetic-private-password\n',{mode:0o600});
 writeFileSync(script,`import sys,json,time,os\nmarker=${JSON.stringify(marker)}\nwith open(${JSON.stringify(pids)},'a') as f:f.write(str(os.getpid())+'\\n')\nfirst=not os.path.exists(marker)\nopen(marker,'a').close()\nfor line in sys.stdin:\n r=json.loads(line)\n if 'id' not in r:continue\n method=r.get('method')\n if method=='initialize':\n  if first:time.sleep(20)\n  result={'protocolVersion':r.get('params',{}).get('protocolVersion','2024-11-05'),'capabilities':{'tools':{}},'serverInfo':{'name':'fixture','version':'1'}}\n elif method=='tools/list':result={'tools':[]}\n else:result={}\n print(json.dumps({'jsonrpc':'2.0','id':r['id'],'result':result}),flush=True)\n`);
 const reservation=createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));
 const child=spawn(binary,['serve','--hostname','127.0.0.1','--port',String(port)],{cwd:workspace,stdio:'ignore',env:{PATH:process.env.PATH,HOME:root,XDG_CONFIG_HOME:join(root,'config'),XDG_DATA_HOME:join(root,'data'),XDG_CACHE_HOME:join(root,'cache'),XDG_STATE_HOME:join(root,'state'),OPENCODE_PASSWORD:'synthetic-private-password',OPENCODE_CONFIG_CONTENT:JSON.stringify({autoupdate:false,share:'disabled',mcp:{servers:{'cgpt-validation':{type:'local',command:['python3',script]}}}}),OPENCODE_DISABLE_PROJECT_CONFIG:'1',OPENCODE_DISABLE_DEFAULT_PLUGINS:'1',OPENCODE_DISABLE_MODELS_FETCH:'1',OPENCODE_DISABLE_AUTOUPDATE:'1',OPENCODE_DISABLE_LSP_DOWNLOAD:'1'}});
 t.after(async()=>{if(child.exitCode===null&&child.signalCode===null){const done=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await done}if(existsSync(pids))for(const raw of readFileSync(pids,'utf8').trim().split('\n')){const pid=Number(raw);try{if(readFileSync('/proc/'+pid+'/cmdline').includes(Buffer.from(script)))process.kill(pid,'SIGTERM')}catch(e){if(!['ENOENT','ESRCH'].includes(e.code))throw e}}rmSync(root,{recursive:true,force:true})});
 const client=createOpenCodeV2Client({baseUrl:'http://127.0.0.1:'+port,directory:workspace,passwordFile});
 await until(async()=>{try{return (await client.info(true)).pid===child.pid}catch{return false}},'API');
 await until(async()=>{try{return (await client.mcp())['cgpt-validation']?.status==='pending'&&existsSync(marker)}catch{return false}},'pending observed');
 await client.createSession({title:'persistent recovery fixture',permissions:[{permission:'*',pattern:'*',action:'deny'}]});
 const before=await client.mcpRecoverySnapshot();assert.equal(before.activeSessionCount,0);assert.equal(before.sharedPermissionCount,0);
 await client.request('/api/location/reload',{method:'POST',scoped:false,timeout:10000});
 await until(async()=>{try{return (await client.mcp())['cgpt-validation']?.status==='connected'}catch{return false}},'connected after one reload');
 const after=await client.mcpRecoverySnapshot();assert.deepEqual(after,before);assert.equal(child.exitCode,null);assert.equal(child.signalCode,null);
 console.log(JSON.stringify({nativeVersion:after.version,pendingObserved:true,reloadCount:1,samePid:true,sameSessions:true,sessionCount:after.sessionCount,mcpConnected:true}));
});
