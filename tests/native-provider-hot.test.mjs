import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOpenCodeV2Client } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs';
const binary=process.env.CAB_TEST_OPENCODE;
async function port(){const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(check){for(let i=0;i<250;i++){if(await check())return;await delay(100)}throw Error('native provider fixture timeout')}

test('OpenCode exact : compte fournisseur remplacé à chaud, même PID et sessions, sans reload', {skip:!binary,timeout:60000},async t=>{
 const root=mkdtempSync(join(tmpdir(),'cab-native-provider-'));const workspace=join(root,'workspace');mkdirSync(workspace);
 const passwordFile=join(root,'password');writeFileSync(passwordFile,'synthetic-provider-basic',{mode:0o600});
 const key1='synthetic-account-one',key2='synthetic-account-two',key3='synthetic-account-other';const requests=[];
 const provider=createServer(async(req,res)=>{
  for await(const b of req){};
  requests.push({account:req.headers.authorization===`Bearer ${key1}`?1:req.headers.authorization===`Bearer ${key2}`?2:req.headers.authorization===`Bearer ${key3}`?3:0});
  res.writeHead(200,{'content-type':'text/event-stream'});
  for(const [delta,finish]of [[{role:'assistant',content:'synthetic text only'},null],[{},'stop']])res.write('data: '+JSON.stringify({id:'fixture',object:'chat.completion.chunk',created:1,model:'fixture',choices:[{index:0,delta,finish_reason:finish}]})+'\n\n');
  res.end('data: [DONE]\n\n');
 });await new Promise(r=>provider.listen(0,'127.0.0.1',r));
 const listenPort=await port(),controllerPort=await port();let log='',controllerLog='',controller;
 const control=`http://127.0.0.1:${controllerPort}`;
 const source=fileURLToPath(new URL('../src/',import.meta.url));const wrapper=join(root,'broker.py'),brokerPidFile=join(root,'broker-pid');
 writeFileSync(wrapper,'import sys, os\nopen('+JSON.stringify(brokerPidFile)+', \"w\").write(str(os.getpid()))\nsys.path.insert(0, '+JSON.stringify(source)+')\nimport cgpt_approval_bridge_server as b\nraise SystemExit(b.main())\n');
 const config={autoupdate:false,share:'disabled',providers:{fixture:{package:'aisdk:@ai-sdk/openai-compatible',settings:{baseURL:`http://127.0.0.1:${provider.address().port}/v1`},models:{fixture:{name:'fixture',limit:{context:32000,output:4096},capabilities:{tools:true,input:['text'],output:['text']},variants:[{id:'medium'},{id:'high'}]}}}}};
 config.mcp={servers:{'cgpt-validation':{type:'local',command:['/home/devops/python/current/bin/python3',wrapper],environment:{CGPT_CONTROLLER_URL:control,CGPT_APPROVAL_STORE:join(root,'approvals.json'),CGPT_APPROVAL_JOURNAL:join(root,'journal.ndjson'),CGPT_BROKER_INSTANCE_LOCK:join(root,'broker.lock'),CGPT_JOURNAL_CHECKPOINT_PATH:join(root,'broker-checkpoint.json'),CGPT_AUTO_REMEDIATION_CB_STATE_PATH:join(root,'circuit.json')}}}};
 config.providers.other=structuredClone(config.providers.fixture);config.providers.other.models={other:structuredClone(config.providers.fixture.models.fixture)};
 const child=spawn(binary,['serve','--hostname','127.0.0.1','--port',String(listenPort)],{cwd:workspace,stdio:['ignore','ignore','pipe'],env:{PATH:process.env.PATH,HOME:root,
  XDG_CONFIG_HOME:join(root,'config'),XDG_DATA_HOME:join(root,'data'),XDG_CACHE_HOME:join(root,'cache'),XDG_STATE_HOME:join(root,'state'),
  OPENCODE_PASSWORD:'synthetic-provider-basic',OPENCODE_CONFIG_CONTENT:JSON.stringify(config),OPENCODE_DISABLE_PROJECT_CONFIG:'1',OPENCODE_DISABLE_DEFAULT_PLUGINS:'1',OPENCODE_DISABLE_CLAUDE_CODE:'1',OPENCODE_DISABLE_MODELS_FETCH:'1',OPENCODE_DISABLE_AUTOUPDATE:'1',OPENCODE_DISABLE_LSP_DOWNLOAD:'1'}});
 child.stderr.on('data',b=>log+=b);
 t.after(async()=>{if(controller&&controller.exitCode===null&&controller.signalCode===null){const done=new Promise(r=>controller.once('exit',r));controller.kill('SIGTERM');await done}if(child.exitCode===null&&child.signalCode===null){const done=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await done}await new Promise(r=>provider.close(r));if(existsSync(brokerPidFile)){const pid=Number(readFileSync(brokerPidFile,'utf8'));assert.ok(Number.isSafeInteger(pid)&&pid>0);await until(async()=>!existsSync('/proc/'+pid))}rmSync(root,{recursive:true,force:true})});
 const client=createOpenCodeV2Client({baseUrl:`http://127.0.0.1:${listenPort}`,directory:workspace,passwordFile});
 await until(async()=>{if(child.exitCode!==null)throw Error('native provider startup failed');try{return Boolean(await client.info())}catch{return false}});
 const info=await client.info(true);const contract=await client.providerKeyContract();assert.equal(contract.pid,info.pid);
 const connect=async(key,id,integration='fixture')=>client.connectProviderKey(integration,{transactionId:id,expectedPid:info.pid,assertBoundary:async()=>{},secretSource:async()=>Buffer.from(key)});
 await connect(key1,'account-one');
 const model={providerID:'fixture',modelID:'fixture',reasoning:'medium'};
 const a=await client.createSession({model,permissions:[{permission:'*',pattern:'*',action:'deny'}]});
 const b=await client.createSession({model,permissions:[{permission:'*',pattern:'*',action:'deny'}]});
 async function prompt(id){await client.prompt(id,'Text only; no tool.');await until(async()=>!(await client.activeSessions())[id]);const messages=await client.messages(id);assert.ok(messages.some(m=>m.info.role==='assistant'&&!m.info.error));assert.equal(messages.flatMap(m=>m.parts.filter(p=>p.type==='tool')).length,0);return messages}
 const first=await prompt(a.id);await prompt(b.id);assert.ok(requests.length>=2);assert.ok(requests.every(r=>r.account===1));
 const before=requests.length;const switched=await connect(key2,'account-two');assert.ok(switched.credentialId);
 await prompt(a.id);await prompt(b.id);assert.ok(requests.length>before);assert.ok(requests.slice(before).every(r=>r.account===2));
 await connect(key3,'account-other','other');
 const startController=()=>{
  controller=spawn(process.execPath,[fileURLToPath(new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs',import.meta.url))],{stdio:['ignore','ignore','pipe'],env:{PATH:process.env.PATH,OC_Codex_WORKSPACE:workspace,OC_Codex_OUTSIDE_SANDBOX:'1',OC_Codex_STATUS_PORT:String(controllerPort),OC_Codex_OPENCODE_URL:`http://127.0.0.1:${listenPort}`,OC_Codex_OPENCODE_PASSWORD_FILE:passwordFile,OC_Codex_DECISION_MODE:'manual',CODEX_COMMAND:'cab-unused-test-command'}});
  controller.stderr.on('data',b=>controllerLog+=b);
 };
 const http=async(path,body)=>{const r=await fetch(control+path,{method:body?'POST':'GET',headers:{'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert.ok(r.ok,JSON.stringify({path,status:r.status,data}));return data};
 startController();await until(async()=>{if(controller.exitCode!==null)throw Error('private controller startup failed');try{return Boolean(await http('/status'))}catch{return false}});
 const reserved=await http('/runs/reserve',{runId:'native-hot',ownerId:'fixture-owner',directory:workspace,sessionId:a.id,changeId:'fixture-hot',selectionKey:'fixture-hot',resources:[{key:'file:fixture.txt',mode:'read'}],dependsOn:[]});
 await http('/runs/native-hot/job/arm',{jobId:'job-hot',sessionId:a.id,directory:workspace,changeId:'fixture-hot',criteria:['no-business-effect'],strictCommands:true});
 await http('/runs/native-hot/suspend',{version:reserved.version,action:'PAUSE',evidence:['synthetic-authorized-boundary']});
 const originalJob=await http('/runs/native-hot/job');
 const transition={transactionId:'native-hot-model',developerAuthorization:'synthetic-human-ref',jobId:'job-hot',sessionId:a.id,runVersion:reserved.version};
 await http('/runs/native-hot/job/model-transition',{...transition,phase:'prepare',expectedModelHash:originalJob.modelContractHash,selection:{model:'other/other',reasoning:'medium'}});
 const probe=await client.createProbeSession({model:{providerID:'other',modelID:'other',reasoning:'medium'}});const probeRows=await prompt(probe.id);const proof=probeRows.findLast(m=>m.info.role==='assistant');
 await http('/runs/native-hot/job/model-transition',{...transition,phase:'commit',preflight:{sessionId:probe.id,messageId:proof.info.id}});
 const adopted=await http('/runs/native-hot/job');assert.equal(adopted.jobId,originalJob.jobId);assert.equal(adopted.sessionId,originalJob.sessionId);assert.equal(adopted.modelTransitionHistory[0].before,null);assert.equal(adopted.codingModel.providerID,'other');
 const stopped=new Promise(r=>controller.once('exit',r));controller.kill('SIGTERM');await stopped;startController();
 await until(async()=>{try{return Boolean(await http('/runs/native-hot/job'))}catch{return false}});
 assert.deepEqual((await http('/runs/native-hot/job')).modelTransitionHistory,adopted.modelTransitionHistory);

 const mark=requests.length;await prompt(a.id);await prompt(b.id);assert.deepEqual(requests.slice(mark).map(r=>r.account),[3,2]);
 assert.equal((await client.session(a.id)).model.providerID,'other');assert.equal((await client.session(b.id)).model.providerID,'fixture');
 const after=await client.messages(a.id);assert.deepEqual(after.slice(0,first.length).map(m=>m.info.id),first.map(m=>m.info.id));
 assert.equal((await client.info(true)).pid,info.pid);assert.equal((await client.session(a.id)).id,a.id);assert.equal((await client.session(b.id)).id,b.id);
 assert.ok(!log.includes(key1)&&!log.includes(key2)&&!controllerLog.includes(key3));
 console.log(JSON.stringify({nativeVersion:info.version,samePid:true,sameSessions:true,sameJob:true,historyPersisted:true,controllerNativeTransition:true,schemaDigest:contract.schemaDigest,warmAccountSwitch:true,hotProviderSwitch:true,peerProviderPreserved:true,reload:false,tools:0,secretInLogs:false}));
});
