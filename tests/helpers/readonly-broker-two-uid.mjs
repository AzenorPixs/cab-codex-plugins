import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, appendFile, readdir, chown, lchown, chmod, lstat, realpath, symlink, mkdtemp, rm, copyFile, utimes, open, writeFile, readlink, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import readline from 'node:readline';
import { updateComponents, VERSION } from '../../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs';
import { processIdentity, maintenanceHttp, proofHash } from '../../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-maintenance-proof.mjs';
import { BROKER_ARTIFACT_FILES, inspectBrokerArtifacts } from '../../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-artifact-proof.mjs';

import { repairForwardRelease } from '../../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-forward-repair.mjs';

const mode=isMainThread?process.argv[2]:'opencode', argument=isMainThread?(process.argv[3] ? JSON.parse(process.argv[3]) : {}):workerData;
const nativeSend=message=>parentPort?parentPort.postMessage(message):process.send(message);
const pause=(ms)=>new Promise((done)=>setTimeout(done,ms));
async function fixtureRegistry(base){
  const response=await fetch(base+'/runs',{signal:AbortSignal.timeout(10000)});assert.ok(response.ok);
  const chunks=[];let bytes=0;for await(const chunk of response.body){bytes+=chunk.length;assert.ok(bytes<=16*1024*1024);chunks.push(chunk);}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function until(check) {const end=Date.now()+15000;do{if(await check())return;await pause(25);}while(Date.now()<end);throw new Error('two-uid fixture timeout');}
async function port(){const s=createServer();await new Promise((done)=>s.listen(0,'127.0.0.1',done));const value=s.address().port;await new Promise((done)=>s.close(done));return value;}
async function own(path,uid,gid){const s=await lstat(path);if(s.isSymbolicLink()){await lchown(path,uid,gid);return;}await chown(path,uid,gid);if(s.isDirectory())for(const name of await readdir(path))await own(join(path,name),uid,gid);}

async function nativeServer(c){
  assert.equal(process.getuid(),1002);let broker,sequence=0,telemetry,dropReply=c.dropReply;
  const pending=new Map(),streams=new Set();let stderr='';
  const call=(method,params)=>new Promise((resolve,reject)=>{
    const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error('isolated MCP timeout'));},10000);
    pending.set(id,{resolve,reject,timer});broker.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');
  });
  async function tool(name,args={}){const value=await call('tools/call',{name,arguments:args});assert.ok(!value.error);return JSON.parse(value.result.content.find((v)=>v.type==='text').text);}
  async function publish(){if(!broker||broker.exitCode!==null||broker.signalCode!==null)return;const ready=await tool('broker_readiness');await maintenanceHttp(c.controllerUrl,'/broker/readiness',ready);}
  async function startBroker(){
    broker=spawn('python3',[c.entry],{stdio:['pipe','pipe','pipe'],env:{PATH:process.env.PATH,PYTHONUNBUFFERED:'1',CGPT_CONTROLLER_URL:c.controllerUrl,
      CGPT_PENDING_WATCHDOG_INTERVAL:'1',CGPT_APPROVAL_STORE:join(c.state,'approvals.json'),CGPT_APPROVAL_JOURNAL:join(c.state,'events.ndjson'),
      CGPT_BROKER_INSTANCE_LOCK:join(c.state,'instance.lock'),CGPT_JOURNAL_CHECKPOINT_PATH:join(c.state,'checkpoint.json'),CGPT_AUTO_REMEDIATION_CB_STATE_PATH:join(c.state,'circuit.json')}});
    broker.stdin.on('error',()=>{});broker.stderr.on('data',(v)=>{stderr+=v;});
    readline.createInterface({input:broker.stdout}).on('line',(line)=>{const value=JSON.parse(line),w=pending.get(value.id);if(w){pending.delete(value.id);clearTimeout(w.timer);w.resolve(value);}});
    await call('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'isolated-two-uid',version:'1'}});
    broker.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
  }
  async function stopBroker(){
    if(broker&&broker.exitCode===null&&broker.signalCode===null){const done=new Promise((resolve)=>broker.once('exit',resolve));broker.kill('SIGTERM');await done;}
    for(const w of pending.values()){clearTimeout(w.timer);w.reject(new Error('isolated broker stopped'));}pending.clear();
  }
  const connected=()=>broker&&broker.exitCode===null&&broker.signalCode===null;
  let intentAck;
  (parentPort||process).on('message',(message)=>{if(message.type==='intent-ack'){intentAck?.();intentAck=null;}});
  const server=createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost');let value;
      if(url.pathname==='/global/event'){res.writeHead(200,{'content-type':'text/event-stream'});streams.add(res);req.on('close',()=>streams.delete(res));res.write('data: {"type":"server.connected"}\n\n');return;}
      if(url.pathname==='/global/health')value={healthy:true,version:'isolated'};
      else if(url.pathname==='/path')value={directory:c.workspace};
      else if(url.pathname==='/session/status')value={};
      else if(url.pathname==='/permission')value=[];
      else if(url.pathname==='/mcp')value={'cgpt-validation':{status:connected()?'connected':'disabled'}};
      else if(url.pathname==='/mcp/cgpt-validation/disconnect'&&req.method==='POST'){
        await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('intent not acknowledged')),5000);intentAck=()=>{clearTimeout(timer);resolve();};nativeSend({type:'before-disconnect'});});
        await stopBroker();if(dropReply){dropReply=false;res.destroy();return;}value=true;
      }else if(url.pathname==='/mcp/cgpt-validation/connect'&&req.method==='POST'){await startBroker();value=true;}
      else if(url.pathname==='/fixture/replace'&&req.method==='POST'){
        for(const name of BROKER_ARTIFACT_FILES){const target=join(dirname(c.entry),name);await copyFile(join(c.pluginRoot,'broker',name),target);const stamp=new Date(Date.now()+2000);await utimes(target,stamp,stamp);}value=true;
      }else if(url.pathname==='/fixture/readiness'){value=await tool('broker_readiness');await publish();}
      else if(url.pathname==='/fixture/identity')value={opencode:await processIdentity(process.pid),broker:connected()?await processIdentity(broker.pid):null};
      else if(url.pathname.startsWith('/session/')&&url.pathname.endsWith('/message'))value=[];
      else if(url.pathname.startsWith('/session/'))value={id:url.pathname.split('/')[2],directory:c.workspace,permission:[{permission:'*',pattern:'*',action:'ask'}]};
      else{res.writeHead(404).end();return;}
      res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify(value));
    }catch(error){if(!res.destroyed)res.writeHead(503,{'content-type':'application/json'}).end(JSON.stringify({error:'isolated-native-error'}));nativeSend({type:'native-error',code:error.code||error.message});}
  });
  await new Promise((done)=>server.listen(c.port,'127.0.0.1',done));await startBroker();
  telemetry=setInterval(()=>{void publish().catch(()=>{});},250);
  nativeSend({type:'ready',pid:process.pid});
  let closing=false;const close=async()=>{if(closing)return;closing=true;clearInterval(telemetry);await stopBroker();for(const stream of streams)stream.end();server.closeAllConnections();await new Promise((done)=>server.close(done));if(parentPort)parentPort.close();else process.disconnect();};
  if(parentPort)parentPort.on('message',message=>{if(message.type==='shutdown')void close().catch(()=>process.exit(1));});
  else process.on('SIGTERM',()=>{void close().catch(()=>process.exit(1));});
}

async function updater(c){
  assert.equal(process.getuid(),1000);
  let denied=false;
  try{const fd=await open(c.input.brokerProof.entry,'r+');await fd.close();}catch(error){if(error.code==='EACCES')denied=true;else throw error;}
  assert.equal(denied,true,'la séparation UID interdit réellement l’écriture dans le broker');
  try{
    const options={serviceCommand:(args)=>maintenanceHttp(c.controlUrl,'/service',{args}),onPhase:(phase,receipt)=>{
      process.send({type:'phase',phase,intent:receipt.externalBroker?.disconnectIntentAt,brokerInFiles:receipt.files.some((file)=>file.group==='broker')});
    }};
    if(c.crashPrepared)options.onPrepared=()=>{throw new Error('isolated-prepared-interruption');};
    const result=mode==='repair'?await repairForwardRelease(c.input,options):await updateComponents(c.input,options);
    process.send({type:'result',uid:process.getuid(),writeDenied:denied,result});
  }catch(error){process.send({type:'result',uid:process.getuid(),writeDenied:denied,error:error.code||error.message});}
  process.disconnect();
}

async function scenario(dropReply){
  assert.equal(process.getuid(),0);assert.ok(existsSync('/.dockerenv'));assert.equal(process.env.CAB_TEST_ISOLATED_TWO_UID,'1');
  const root=await mkdtemp('/work/cab-readonly-uid-');await chmod(root,0o755);
  const home=join(root,'profile'),workspace=join(root,'workspace'),brokerDirectory=join(root,'broker'),brokerState=join(root,'broker-state');
  const pluginRoot='/inputs/plugins/cab-approval-bridge',original='/inputs/original';
  const historicalRecovery=process.env.CAB_TEST_HISTORICAL_RECOVERY==='1';
  const originalVersion=JSON.parse(await readFile(join(original,'.codex-plugin/plugin.json'),'utf8')).version.split('+')[0];
  assert.ok(['1.7.1','1.9.0','1.10.1','1.10.2','1.10.3'].includes(originalVersion));
  const scripts=join(home,'.local/share/cab-approval-bridge'),seed=join(scripts,'releases/seed/scripts');
  const monitorRoot=join(home,'.local/share/cab-approval-bridge-monitor'),monitorScripts=join(monitorRoot,'scripts');
  const processes={},children=[],events=[];let stderr='';
  const controllerUrl='http://127.0.0.1:'+await port(),supervisorUrl='http://127.0.0.1:'+await port(),monitorUrl='http://127.0.0.1:'+await port(),opencodeUrl='http://127.0.0.1:'+await port();
  let native,control;
  async function stop(child){if(child&&child.exitCode===null&&child.signalCode===null){const done=new Promise((resolve)=>child.once('exit',resolve));child.kill('SIGTERM');await done;}}
  try{
    for(const p of [home,workspace,brokerDirectory,brokerState,seed,join(home,'.config/systemd/user'),join(monitorRoot,'releases/seed')])await mkdir(p,{recursive:true,mode:0o700});
    await cp(join(originalVersion!=='1.7.1'?original:pluginRoot,'scripts'),seed,{recursive:true});
    for(const name of ['cgpt-approval-bridge-supervisor.mjs','cgpt-approval-bridge-supervisor-context.mjs'])await copyFile(join(original,'scripts',name),join(seed,name));
    for(const name of await readdir(seed))await symlink('releases/seed/scripts/'+name,join(scripts,name));
    await cp(join(original,'scripts'),join(monitorRoot,'releases/seed/scripts'),{recursive:true});
    await cp(join(original,'web-monitor'),join(monitorRoot,'releases/seed/web-monitor'),{recursive:true});
    if(historicalRecovery){
      for(const section of ['scripts','web-monitor']){
        const logical=join(monitorRoot,section);await mkdir(logical);
        for(const name of await readdir(join(monitorRoot,'releases/seed',section)))await symlink('../releases/seed/'+section+'/'+name,join(logical,name));
      }
    }else{await symlink('releases/seed/scripts',monitorScripts);await symlink('releases/seed/web-monitor',join(monitorRoot,'web-monitor'));}
    await own(home,1000,1000);await own(workspace,1000,1000);
    for(const name of BROKER_ARTIFACT_FILES)await copyFile(join(original,'broker',name),join(brokerDirectory,name));
    await chmod(brokerDirectory,0o755);await own(brokerDirectory,1002,1002);await own(brokerState,1002,1002);
    const env={PATH:process.env.PATH,OC_Codex_WORKSPACE:workspace,OC_Codex_OUTSIDE_SANDBOX:'1',OC_Codex_STATUS_PORT:new URL(controllerUrl).port,
      OC_Codex_CONTROLLER_URL:controllerUrl,OC_Codex_OPENCODE_URL:opencodeUrl,OC_Codex_SUPERVISOR_URL:supervisorUrl,
      OC_Codex_SUPERVISOR_STATUS_PORT:new URL(supervisorUrl).port,OC_Codex_SUPERVISOR_POLL_INTERVAL_MS:'250',OC_Codex_MONITOR_PORT:new URL(monitorUrl).port,
      OC_Codex_MONITOR_STATE_DIR:join(home,'.local/state/fixture-monitor'),OC_Codex_RECONNECT_MS:'30',OC_Codex_DECISION_MODE:'manual',CODEX_COMMAND:'unused'};
    async function start(name){
      if(processes[name]?.exitCode===null&&processes[name]?.signalCode===null)return;
      const entry=await realpath(join(name==='monitor'?monitorScripts:scripts,'cgpt-approval-bridge-'+name+'.mjs'));
      const child=spawn(process.execPath,[entry],{uid:1000,gid:1000,env,stdio:['ignore','ignore','pipe']});children.push(child);processes[name]=child;
      child.stderr.on('data',(value)=>{stderr+=value;});const base=name==='controller'?controllerUrl:name==='supervisor'?supervisorUrl:monitorUrl;
      await until(async()=>{if(child.exitCode!==null)throw new Error('service exited '+name+' '+stderr);try{return(await fetch(base+(name==='monitor'?'/api/snapshot':'/status'))).ok;}catch{return false;}});
    }
    native=spawn(process.execPath,[import.meta.filename,'opencode',JSON.stringify({port:Number(new URL(opencodeUrl).port),controllerUrl,workspace,pluginRoot,
      entry:join(brokerDirectory,BROKER_ARTIFACT_FILES[0]),state:brokerState,dropReply})],{uid:1002,gid:1002,env:{PATH:process.env.PATH,CAB_TEST_WORKER_BROKER:process.env.CAB_TEST_WORKER_BROKER||'0'},stdio:['ignore','ignore','pipe','ipc']});
    children.push(native);native.stderr.on('data',(value)=>{stderr+=value;});
    const journalFile=join(home,'.local/state/cab-approval-bridge-update/current.json');let intentChecks=0;
    native.on('message',(message)=>{if(message.type==='before-disconnect')void(async()=>{
      const receipt=JSON.parse(await readFile(journalFile));assert.ok(receipt.externalBroker.disconnectIntentAt);assert.ok(!receipt.files.some((file)=>file.group==='broker'));intentChecks++;native.send({type:'intent-ack'});
    })().catch((error)=>{stderr+=error.stack;native.kill('SIGTERM');});});
    await start('controller');
    await until(async()=>{try{return(await maintenanceHttp(opencodeUrl,'/fixture/readiness')).pending_count===0;}catch{return false;}});
    const largeRegistry=process.env.CAB_TEST_LARGE_REGISTRY==='1';
    const runIds=largeRegistry?Array.from({length:40},(_,i)=>'r'+i):['a','b'];
    for(const id of runIds){
      const r=await maintenanceHttp(controllerUrl,'/runs/reserve',{runId:id,ownerId:'owner-'+id,sessionId:'ses_'+id,directory:workspace,changeId:'change-'+id,
        selectionKey:'intent-'+id,resources:largeRegistry?Array.from({length:256},(_,i)=>({key:'file:src/'+id+'/'+ 'd'.repeat(180)+'/'+ 'e'.repeat(180)+'/'+i+'-'+ 'f'.repeat(100)+'.py',mode:'write'})):[{key:'file:src/'+id+'.py',mode:'write'}],dependsOn:[]});
      await maintenanceHttp(controllerUrl,'/runs/'+id+'/job/arm',{jobId:'job-'+id,sessionId:'ses_'+id,directory:workspace,changeId:r.changeId,strictCommands:true,criteria:['isolated two uid']});
      await maintenanceHttp(controllerUrl,'/runs/'+id+'/suspend',{version:r.version,action:'PAUSE',evidence:['explicit isolated rendezvous']});
    }
    if(historicalRecovery){
      await stop(processes.controller);
      const path=join(workspace,'.opencode/state/cgpt-approval-bridge/controller-runs.json');
      const stored=JSON.parse(await readFile(path));stored.coordination.revisions['browser:c14-headless-test-profiles']=0;
      await writeFile(path,JSON.stringify(stored,null,2)+'\n');await start('controller');
    }
    const publicRegistryBytes=Buffer.byteLength(JSON.stringify(await fixtureRegistry(controllerUrl)));
    const privateRegistryBytes=(await lstat(join(workspace,'.opencode/state/cgpt-approval-bridge/controller-runs.json'))).size;
    if(largeRegistry){assert.ok(publicRegistryBytes>2*1024*1024);assert.ok(privateRegistryBytes>4*1024*1024);}
    await start('supervisor');await start('monitor');
    await maintenanceHttp(opencodeUrl,'/fixture/replace',{});
    const ready=await maintenanceHttp(opencodeUrl,'/fixture/readiness'),initial=await maintenanceHttp(opencodeUrl,'/fixture/identity');
    assert.equal(ready.server_version,originalVersion);assert.equal(initial.opencode.uid,1002);assert.equal(initial.broker.uid,1002);
    if(process.env.CAB_TEST_WORKER_BROKER==='1'){
      const children=(await readFile('/proc/'+native.pid+'/task/'+native.pid+'/children','utf8')).trim().split(/\s+/);
      assert.ok(!children.includes(String(initial.broker.pid)),'le broker doit provenir d’un thread secondaire');
    }
    const manifest={};for(const name of BROKER_ARTIFACT_FILES)manifest[name]=createHash('sha256').update(await readFile(join(brokerDirectory,name))).digest('hex');
    const input={home,workspace,pluginRoot:historicalRecovery?'/inputs/failing':pluginRoot,brokerDirectory,controllerUrl,supervisorUrl,monitorUrl,opencodeUrl,layout:'managed-release',brokerPolicy:'reuse-readonly',waitMs:5000,
      brokerProof:{authorization:'isolated two uid maintenance',entry:join(brokerDirectory,BROKER_ARTIFACT_FILES[0]),expectedUid:1002,expectedGid:1002,manifest,
        loadedVersion:ready.server_version,instanceId:ready.instance_id,opencodeProcess:initial.opencode,brokerProcess:initial.broker}};
    const before=await inspectBrokerArtifacts(brokerDirectory,input.brokerProof);
    control=createServer(async(req,res)=>{try{
      assert.equal(req.url,'/service');assert.equal(req.method,'POST');let text='';for await(const part of req)text+=part;
      const {args}=JSON.parse(text);assert.ok(Array.isArray(args));events.push(args);
      if(args[0]==='daemon-reload'){res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify(''));return;}
      const name=args[1].replace('cgpt-approval-bridge-','').replace('.service','');assert.ok(['controller','supervisor','monitor'].includes(name));
      let result='';if(args[0]==='show'){
        const active=processes[name]?.exitCode===null&&processes[name]?.signalCode===null;
        result=`LoadState=loaded\nActiveState=${active?'active':'inactive'}\nMainPID=${active?processes[name].pid:0}\nExecStart=/usr/bin/env node ${join(name==='monitor'?monitorScripts:scripts,'cgpt-approval-bridge-'+name+'.mjs')}\n`;
      }else if(args[0]==='stop')await stop(processes[name]);else if(args[0]==='start')await start(name);else assert.fail('unexpected isolated service action');
      res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify(result));
    }catch(error){stderr+=error.stack;res.writeHead(503,{'content-type':'application/json'}).end(JSON.stringify({error:'isolated-service-error'}));}});
    await new Promise((done)=>control.listen(0,'127.0.0.1',done));
    async function update(kind='update',overrides={},extra={}){
      const child=spawn(process.execPath,[import.meta.filename,kind,JSON.stringify({input:{...input,...overrides},...extra,controlUrl:'http://127.0.0.1:'+control.address().port})],
        {uid:1000,gid:1000,env:{PATH:process.env.PATH},stdio:['ignore','ignore','pipe','ipc']});children.push(child);let result;
      child.stderr.on('data',(value)=>{stderr+=value;});child.on('message',(message)=>{if(message.type==='result')result=message;else if(message.type==='phase')assert.equal(message.brokerInFiles,false);});
      const exit=await new Promise((done)=>child.once('exit',done));assert.equal(exit,0,stderr);assert.ok(result,stderr);assert.equal(result.uid,1000);assert.equal(result.writeDenied,true);return result;
    }
    if(dropReply){const failed=await update();assert.equal(failed.error,'update-broker-forward-recovery-required',stderr);
      const receipt=JSON.parse(await readFile(journalFile));assert.equal(receipt.phase,'READONLY_RECOVERY_REQUIRED');assert.ok(receipt.externalBroker.disconnectIntentAt);
      assert.equal((await maintenanceHttp(controllerUrl,'/coordination/global')).global.state,'HELD');
      assert.deepEqual(await inspectBrokerArtifacts(brokerDirectory,input.brokerProof),before);
    }
    let recoveryProof;
    if(historicalRecovery){
      const failed=await update();assert.ok(failed.error,JSON.stringify(failed));
      const originalRaw=await readFile(journalFile),receipt=JSON.parse(originalRaw);assert.equal(receipt.phase,'READONLY_RECOVERY_REQUIRED');
      await stop(processes.controller);await stop(processes.supervisor);
      const registryPath=join(workspace,'.opencode/state/cgpt-approval-bridge/controller-runs.json');
      const originalRegistry=await readFile(registryPath),tx=join(dirname(journalFile),receipt.id);
      const repairInput={pluginRoot,transactionId:receipt.id,authorization:'isolated historical reader forward recovery'};
      const unauthorized=await update('repair',{...repairInput,transactionId:'update-00000000-0000-0000-0000-000000000000'});assert.equal(unauthorized.error,'forward-phase-refused');
      assert.deepEqual(await readFile(journalFile),originalRaw);assert.deepEqual(await readFile(registryPath),originalRegistry);
      const badCandidate=join(root,'bad-candidate');await cp(pluginRoot,badCandidate,{recursive:true});
      await appendFile(join(badCandidate,'scripts/cgpt-approval-bridge-controller.mjs'),'\n// isolated unqualified change\n');
      const badCode=await update('repair',{...repairInput,pluginRoot:badCandidate});assert.equal(badCode.error,'forward-code-change-not-qualified');
      const pointer=join(scripts,'cgpt-approval-bridge-runs.mjs'),knownLink=await readlink(pointer);
      await unlink(pointer);await symlink('releases/unknown/scripts/cgpt-approval-bridge-runs.mjs',pointer);await lchown(pointer,1000,1000);
      const badPointer=await update('repair',repairInput);assert.equal(badPointer.error,'forward-pointer-changed');
      await unlink(pointer);await symlink(knownLink,pointer);await lchown(pointer,1000,1000);
      const modified=JSON.parse(originalRegistry);modified.coordination.global.generation++;
      await writeFile(registryPath,JSON.stringify(modified));
      const badHeld=await update('repair',repairInput);assert.equal(badHeld.error,'forward-held-proof-invalid');
      await writeFile(registryPath,originalRegistry);
      assert.deepEqual(await readFile(journalFile),originalRaw);
      const oldReleases={};
      for(const file of receipt.files){const plan=receipt.managed[file.group];if(plan){const path=join(plan.directory,file.name);oldReleases[path]=createHash('sha256').update(await readFile(path)).digest('hex');}}
      const interrupted=await update('repair',repairInput,{crashPrepared:true});assert.equal(interrupted.error,'isolated-prepared-interruption',JSON.stringify(interrupted)+' '+stderr);
      assert.deepEqual(await readFile(journalFile),originalRaw);assert.deepEqual(await readFile(registryPath),originalRegistry);
      const drift=await update('repair',{...repairInput,authorization:'different authorization'});assert.equal(drift.error,'forward-plan-divergent');
      await unlink(join(tx,'forward-current.json'));
      const orphanPlan=await update('repair',repairInput,{crashPrepared:true});assert.equal(orphanPlan.error,'isolated-prepared-interruption');
      assert.deepEqual(await readFile(journalFile),originalRaw);assert.deepEqual(await readFile(registryPath),originalRegistry);
      const repaired=await update('repair',repairInput);assert.equal(repaired.result?.status,'prepared',JSON.stringify(repaired)+' '+stderr);
      const amended=JSON.parse(await readFile(journalFile));assert.equal(amended.id,receipt.id);assert.equal(amended.maintenance.generation,receipt.maintenance.generation);
      assert.deepEqual(await readFile(join(tx,'forward',amended.forwardRepair.id,'original-receipt.json')),originalRaw);
      assert.deepEqual(await readFile(registryPath),originalRegistry);
      for(let i=0;i<receipt.files.length;i++)assert.equal(createHash('sha256').update(await readFile(join(tx,'forward',amended.forwardRepair.id,'original-stage',String(i)))).digest('hex'),receipt.files[i].afterHash);
      for(const [path,sha] of Object.entries(oldReleases))assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'),sha);
      assert.equal((await update('repair',repairInput)).result?.status,'already-prepared');
      input.pluginRoot=pluginRoot;
      recoveryProof={sameTransaction:true,sameGeneration:true,registryUnchanged:true,originalReceiptPreserved:true,interruptionRecovered:true,authorityDriftRefused:true,codeDriftRefused:true,pointerDriftRefused:true,heldDriftRefused:true,originalStagesPreserved:true,oldReleasesPreserved:true};
    }
    const result=await update();assert.ok(!result.error,JSON.stringify(result)+' '+stderr);assert.equal(result.result.status,'completed');
    assert.equal(result.result.brokerLoadedBefore,originalVersion);assert.equal(result.result.brokerLoadedAfter,VERSION);
    assert.deepEqual(await inspectBrokerArtifacts(brokerDirectory,input.brokerProof),before);
    const after=await maintenanceHttp(opencodeUrl,'/fixture/identity');assert.deepEqual(after.opencode,initial.opencode);
    assert.notEqual(after.broker.pid,initial.broker.pid);assert.equal(after.broker.uid,1002);
    const actual={controller:(await maintenanceHttp(controllerUrl,'/status')).version,supervisor:(await maintenanceHttp(supervisorUrl,'/status')).version,
      web:(await maintenanceHttp(monitorUrl,'/api/snapshot')).version,broker:(await maintenanceHttp(opencodeUrl,'/fixture/readiness')).server_version};
    assert.deepEqual(Object.values(actual),[VERSION,VERSION,VERSION,VERSION]);
    assert.equal((await maintenanceHttp(controllerUrl,'/coordination/global')).global.state,'RELEASED');
    const runs=(await fixtureRegistry(controllerUrl)).runs;assert.ok(runs.every((run)=>run.suspension.action==='PAUSE'));
    const serviceUids={};for(const name of ['controller','supervisor','monitor']){serviceUids[name]=(await processIdentity(processes[name].pid)).uid;assert.equal(serviceUids[name],1000);}
    const stops=events.filter((event)=>event[0]==='stop').length;assert.equal((await update()).result.status,'up-to-date');assert.equal(events.filter((event)=>event[0]==='stop').length,stops);
    return {scenario:historicalRecovery?'historical-key-forward-recovery':dropReply?'disconnect-reply-lost':'success',recoveryProof,originalVersion,largeRegistry,publicRegistryBytes,privateRegistryBytes,actualVersions:actual,serviceUids,opencodeUid:after.opencode.uid,brokerUid:after.broker.uid,
      sourceUnchanged:true,kernelWriteDenied:true,intentChecks,openCodePreserved:true,pausesPreserved:true,workerBroker:process.env.CAB_TEST_WORKER_BROKER==='1',artifactDigest:proofHash(before)};
  }finally{
    for(const child of children.reverse())await stop(child);
    if(control){control.closeAllConnections();await new Promise((done)=>control.close(done));}
    await rm(root,{recursive:true,force:true});
  }
}

if(mode==='opencode'){
  if(isMainThread&&process.env.CAB_TEST_WORKER_BROKER==='1'){
    const worker=new Worker(new URL(import.meta.url),{workerData:argument});
    worker.on('message',message=>process.send(message));process.on('message',message=>worker.postMessage(message));
    process.on('SIGTERM',()=>worker.postMessage({type:'shutdown'}));
    await new Promise((done,reject)=>{worker.once('exit',done);worker.once('error',reject);});process.disconnect();
  }else await nativeServer(argument);
}
else if(['update','repair'].includes(mode))await updater(argument);
else {
  assert.equal(process.getuid(),0);assert.ok(existsSync('/.dockerenv'));assert.equal(process.env.CAB_TEST_ISOLATED_TWO_UID,'1');
  for(const uid of [1000,1002]){
    const home='/work/home-'+uid;
    await mkdir(home,{recursive:true,mode:0o700});await chown(home,uid,uid);
    if(!(await readFile('/etc/passwd','utf8')).split('\n').some((line)=>line.split(':')[2]===String(uid)))
      await appendFile('/etc/passwd',`cabfixture${uid}:x:${uid}:${uid}:isolated CAB fixture:${home}:/usr/sbin/nologin\n`);
    if(!(await readFile('/etc/group','utf8')).split('\n').some((line)=>line.split(':')[2]===String(uid)))
      await appendFile('/etc/group',`cabfixture${uid}:x:${uid}:\n`);
  }
  const results=[];for(const drop of process.env.CAB_TEST_HISTORICAL_RECOVERY==='1'?[false]:[false,true])results.push(await scenario(drop));
  process.stdout.write(JSON.stringify({qualification:'two-real-uids',results},null,2)+'\n');
}
