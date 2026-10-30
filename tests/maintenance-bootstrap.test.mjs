import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, copyFile, readdir, readFile, writeFile, rm, unlink, symlink, realpath, readlink, lstat, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { fixtureEnvironment } from './helpers/cab-environment.mjs';
import { openCodeV2TestHandler } from './helpers/opencode-v2-test-server.mjs';
import { updateComponents } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs';
import { moduleManifest, proofHash, processIdentity, collectFrozenProof, maintenanceHttp,
  readBootstrapJournal } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-maintenance-proof.mjs';
import { BROKER_ARTIFACT_FILES, inspectBrokerArtifacts } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-artifact-proof.mjs';

const originalPlugin = process.env.CAB_TEST_ORIGINAL_PLUGIN;
const currentPlugin = fileURLToPath(new URL('../plugins/cab-approval-bridge/', import.meta.url));
const pause = (ms) => new Promise((done) => setTimeout(done,ms));
const portReservations=new Map();
async function freePort() {
  const s=createServer(); await new Promise((done)=>s.listen(0,'127.0.0.1',done));
  const port=s.address().port; portReservations.set(port,s); return port;
}
async function releasePort(base) {
  const port=Number(new URL(base).port), listener=portReservations.get(port);
  if(listener){portReservations.delete(port);await new Promise((done)=>listener.close(done));}
}
async function until(check) {
  const end=Date.now()+10000;
  do { if(await check()) return; await pause(20); } while(Date.now()<end);
  throw new Error('fixture condition not reached');
}
async function fixture(t, { webActive = true, managed = false } = {}) {
  const root=await mkdtemp(join(tmpdir(),'cab-bootstrap-'));
  const home=join(root,'profile'), workspace=join(root,'workspace'), scripts=join(home,'.local/share/cab-approval-bridge');
  const monitorScripts=join(home,'.local/share/cab-approval-bridge-monitor/scripts');
  const brokerDirectory=join(root,'broker');
  for(const dir of [workspace,scripts,monitorScripts,brokerDirectory]) await mkdir(dir,{recursive:true,mode:0o700});
  const credentialDirectory=join(home,'.config/cab-approval-bridge');
  await mkdir(credentialDirectory,{recursive:true,mode:0o700});
  await copyFile(fixtureEnvironment.OC_Codex_OPENCODE_PASSWORD_FILE,join(credentialDirectory,'opencode.password'));
  const realScripts=managed?join(scripts,'releases','1.7.1+original','scripts'):scripts;
  await mkdir(realScripts,{recursive:true,mode:0o700});
  for(const name of await readdir(join(originalPlugin,'scripts'))) if(/\.(mjs|py)$/.test(name)) {
    await copyFile(join(originalPlugin,'scripts',name),join(realScripts,name));
    if(managed)await symlink('releases/1.7.1+original/scripts/'+name,join(scripts,name));
  }
  for(const name of ['cgpt_approval_bridge_server.py','cgpt_approval_bridge_router.py','cgpt_approval_bridge_journal.py']) {
    await copyFile(join(originalPlugin,'broker',name),join(brokerDirectory,name));
  }
  const monitorRoot=join(home,'.local/share/cab-approval-bridge-monitor');
  const monitorReal=managed?join(monitorRoot,'releases/1.7.1+original/scripts'):monitorScripts;
  const webLogical=join(monitorRoot,'web-monitor'),webReal=managed?join(monitorRoot,'releases/1.7.1+original/web-monitor'):webLogical;
  if(managed){await rm(monitorScripts,{recursive:true});await symlink('releases/1.7.1+original/scripts',monitorScripts);await symlink('releases/1.7.1+original/web-monitor',webLogical);}
  await mkdir(monitorReal,{recursive:true,mode:0o700});await mkdir(webReal,{recursive:true,mode:0o700});
  for(const name of await readdir(join(originalPlugin,'scripts')))if(/\.(mjs|py)$/.test(name))await copyFile(join(originalPlugin,'scripts',name),join(monitorReal,name));
  for(const name of ['index.html','app.mjs','stats.mjs','style.css'])await copyFile(join(originalPlugin,'web-monitor',name),join(webReal,name));
  const controllerFile=join(scripts,'cgpt-approval-bridge-controller.mjs');
  assert.equal(createHash('sha256').update(await readFile(controllerFile)).digest('hex'),
    '3cfb31247836605ea0f04fec4d4ff449c0fc34e8c5b5ee97382d379bfb40913b','contrôleur original 1.7.1 épinglé');
  const originalEntry=await realpath(controllerFile),originalManifest=await moduleManifest(originalEntry);
  const native={rules:{},messages:{},busy:{},permissions:[],replies:[],events:[],mcp:'connected'};
  const streams=new Set();
  const server=createServer(openCodeV2TestHandler(async(req,res)=>{
    const u=new URL(req.url,'http://localhost'); native.events.push([req.method,u.pathname]);
    if(u.pathname==='/global/event') {
      res.writeHead(200,{'content-type':'text/event-stream'}); streams.add(res);
      req.on('close',()=>streams.delete(res));res.write('data: {"type":"server.connected"}\n\n');return;
    }
    let value;
    if(u.pathname==='/global/health') value={healthy:true,version:'fixture'};
    else if(u.pathname==='/api/snapshot')value={version:native.webVersion||'1.7.1',identity:{workspace}};
    else if(u.pathname==='/path')value={directory:workspace};
    else if(u.pathname==='/mcp')value={'cgpt-validation':{status:native.mcp}};
    else if(u.pathname==='/mcp/cgpt-validation/disconnect'&&req.method==='POST'){
      await stopBroker();if(native.loseDisconnectResponse){native.loseDisconnectResponse=false;res.destroy();return;}value=true;}
    else if(u.pathname==='/mcp/cgpt-validation/connect'&&req.method==='POST'){await startBroker();value=true;}
    else if(u.pathname==='/session/status')value=native.busy;
    else if(u.pathname==='/permission')value=native.permissions;
    else if(u.pathname.endsWith('/message') && req.method==='GET')value=native.messages[u.pathname.split('/')[2]]||[];
    else if(u.pathname.includes('/permissions/')) {
      let raw='';for await(const c of req)raw+=c;native.replies.push(JSON.parse(raw));
      native.permissions=native.permissions.filter((p)=>p.id!==u.pathname.split('/').at(-1));value=true;
    } else if(u.pathname.startsWith('/session/')) {
      const id=u.pathname.split('/')[2];value={id,directory:workspace,
        permission:native.rules[id]||[{permission:'*',pattern:'*',action:'ask'}]};
    } else {res.writeHead(404).end();return;}
    res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(value));
  }, { directory: workspace, allowLegacyTestCalls: true }));
  await new Promise((done)=>server.listen(0,'127.0.0.1',done));
  const opencodeUrl='http://127.0.0.1:'+server.address().port;
  const controllerUrl='http://127.0.0.1:'+await freePort();
  const supervisorUrl='http://127.0.0.1:'+await freePort();
  const monitorUrl='http://127.0.0.1:'+await freePort();
  assert.equal(new Set([controllerUrl,supervisorUrl,monitorUrl]).size,3);
  const maintenanceRoot=join(home,'.local/state/cab-approval-bridge-update/frozen-controller');
  const children=[];const processes={};const serviceEvents=[];let stderr='';let telemetry;const waiters=new Map();
  t.after(async()=>{
    if(telemetry)clearInterval(telemetry);
    for(const w of waiters.values())clearTimeout(w.timer);
    for(const child of children)if(child.exitCode===null&&child.signalCode===null){const ended=new Promise((done)=>child.once('exit',done));child.kill('SIGTERM');await ended;}
    for(const base of [controllerUrl,supervisorUrl,monitorUrl])await releasePort(base);
    server.closeAllConnections();for(const s of streams)s.end();await new Promise((done)=>server.close(done));await rm(root,{recursive:true,force:true});
  });
  const environment={...fixtureEnvironment,OC_Codex_WORKSPACE:workspace,OC_Codex_OUTSIDE_SANDBOX:'1',
    OC_Codex_STATUS_PORT:new URL(controllerUrl).port,OC_Codex_OPENCODE_URL:opencodeUrl,OC_Codex_CONTROLLER_URL:controllerUrl,
    OC_Codex_SUPERVISOR_STATUS_PORT:new URL(supervisorUrl).port,OC_Codex_SUPERVISOR_POLL_INTERVAL_MS:'250',
    OC_Codex_SUPERVISOR_URL:supervisorUrl,OC_Codex_MONITOR_PORT:new URL(monitorUrl).port,
    OC_Codex_MONITOR_STATE_DIR:join(home,'.local/state/fixture-monitor'),
    OC_Codex_MAINTENANCE_STATE_DIR:maintenanceRoot,OC_Codex_RECONNECT_MS:'30',OC_Codex_DECISION_MODE:'manual',
    CODEX_COMMAND:'cab-fixture-unused'};
  async function start(name) {
    if(processes[name]?.exitCode===null&&processes[name]?.signalCode===null)return;
    const base=name==='controller'?controllerUrl:name==='monitor'?monitorUrl:supervisorUrl;
    const entry=await realpath(join(name==='monitor'?monitorScripts:scripts,'cgpt-approval-bridge-'+name+'.mjs'));
    await releasePort(base);
    const child=spawn(process.execPath,[entry],{env:environment,stdio:['ignore','ignore','pipe']});
    processes[name]=child;children.push(child);child.stderr.on('data',(d)=>{stderr+=d;});
    let observed=null;
    try {
      await until(async()=>{
        if(child.exitCode!==null||child.signalCode!==null)throw new Error('fixture child exited: '+name+' '+child.exitCode+' '+child.signalCode+' '+stderr);
        let response, payload;
        try {response=await fetch(base+(name==='monitor'?'/api/snapshot':'/status'));observed={status:response.status};
          if(!response.ok)return false;payload=await response.json();}
        catch{return false;}
        const identity=name==='monitor'?payload.identity?.workspace:payload.workspace;
        assert.equal(identity,workspace,'fixture service workspace mismatch: '+name);
        if(name!=='monitor')assert.equal(payload.pid,child.pid,'fixture service PID mismatch: '+name);
        return true;
      });
    } catch(cause) {throw new Error('fixture start failed: '+JSON.stringify({component:name,pid:child.pid,exitCode:child.exitCode,signalCode:child.signalCode,observed})+' '+stderr,{cause});}
  }
  async function stop(name) {
    const p=processes[name]; if(!p||p.exitCode!==null||p.signalCode!==null)return;
    const ended=new Promise((done)=>p.once('exit',done));p.kill('SIGTERM');await ended;
  }
  const serviceCommand=async(args)=>{
    if(args[0]==='daemon-reload'){serviceEvents.push(args);return '';}
    serviceEvents.push(args);const name=args[1]?.replace('cgpt-approval-bridge-','').replace('.service','');
    if(args[0]==='show') {
      const active=processes[name]?.exitCode===null&&processes[name]?.signalCode===null;
      const pid=active?processes[name].pid:0;
      const dir=name==='monitor'?monitorScripts:scripts;
      return `LoadState=loaded\nActiveState=${active?'active':'inactive'}\nMainPID=${pid}\nExecStart=/usr/bin/env node ${join(dir,'cgpt-approval-bridge-'+name+'.mjs')}\n`;
    }
    for(const target of args.slice(1)) {
      const component=target.replace('cgpt-approval-bridge-','').replace('.service','');
      assert.ok(['controller','supervisor','monitor'].includes(component),'aucune commande OpenCode');
      if(args[0]==='stop')await stop(component);else if(args[0]==='start')await start(component);else assert.fail('commande service inattendue');
    }
    return '';
  };
  await start('controller');
  let broker,sequence=0;
  async function startBroker(){
  broker=spawn('python3',[join(brokerDirectory,'cgpt_approval_bridge_server.py')],{stdio:['pipe','pipe','pipe'],env:{
    PATH:process.env.PATH,PYTHONUNBUFFERED:'1',CGPT_CONTROLLER_URL:controllerUrl,CGPT_PENDING_WATCHDOG_INTERVAL:'1',
    CGPT_APPROVAL_STORE:join(root,'approvals.json'),CGPT_APPROVAL_JOURNAL:join(root,'events.ndjson'),
    CGPT_BROKER_INSTANCE_LOCK:join(root,'broker.instance.lock'),CGPT_JOURNAL_CHECKPOINT_PATH:join(root,'checkpoint.json'),
    CGPT_AUTO_REMEDIATION_CB_STATE_PATH:join(root,'circuit.json') }});
  children.push(broker);broker.stderr.on('data',(d)=>{stderr+=d;});
  readline.createInterface({input:broker.stdout}).on('line',(line)=>{
    const value=JSON.parse(line),w=waiters.get(value.id);if(w){waiters.delete(value.id);clearTimeout(w.timer);w.resolve(value);}
  });
  await call('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'isolated-original-bootstrap',version:'1'}});
  broker.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');native.mcp='connected';
  }
  async function stopBroker(){
    if(broker?.exitCode===null&&broker.signalCode===null){const done=new Promise((resolve)=>broker.once('exit',resolve));broker.kill('SIGTERM');await done;}native.mcp='disabled';
  }
  const call=(method,params)=>new Promise((resolve,reject)=>{
    const id=++sequence,timer=setTimeout(()=>{waiters.delete(id);reject(new Error('MCP fixture timeout '+stderr));},15000);
    waiters.set(id,{resolve,timer});broker.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');
  });
  const tool=async(name,args)=>{
    const value=await call('tools/call',{name,arguments:args});
    assert.ok(!value.error,JSON.stringify(value));return JSON.parse(value.result.content.find((c)=>c.type==='text').text);
  };
  await startBroker();
  const request=(path,body)=>maintenanceHttp(controllerUrl,path,body);
  await request('/broker/readiness',{status:'READY',pending_count:0,coordination_protocol:'resource-scoped-v1'});
  const reserve=async(id)=>{
    const r=await request('/runs/reserve',{runId:id,ownerId:'codex-'+id,sessionId:'ses_'+id,directory:workspace,
      changeId:'change-'+id,selectionKey:'intent-'+id,resources:[{key:'file:src/'+id+'.py',mode:'write'}],dependsOn:[]});
    await request('/runs/'+id+'/job/arm',{jobId:'job-'+id,sessionId:'ses_'+id,directory:workspace,
      changeId:r.changeId,strictCommands:true,criteria:['synthetic source proof']});return r;
  };
  const a=await reserve('a'),b=await reserve('b');
  await request('/runs/b/suspend',{version:b.version,action:'PAUSE',evidence:['explicit isolated maintenance rendezvous']});
  const recovery={jobId:'job-a',expectedSessionId:'ses_a',sessionId:'ses_new',recoveryId:'recovery-a',preflightRequestId:'preflight-a'};
  await request('/runs/a/job/recover',{...recovery,phase:'prepare'});
  native.rules.ses_a=[{permission:'*',pattern:'*',action:'deny'}];
  native.messages.ses_new=[];
  const append=(name,input,output)=>native.messages.ses_new.push({parts:[{type:'tool',tool:'cgpt-validation_'+name,
    state:{status:'completed',input,output:JSON.stringify(output),time:{start:Date.now(),end:Date.now()}}}]});
  append('broker_readiness',{},await tool('broker_readiness',{}));
  const resources=a.resources.map((r)=>({...r,mode:'read'}));
  const approval={requestId:'preflight-a',approval_id:'approval-preflight-a',change_id:a.changeId,session_id:'ses_new',
    directory:workspace,files:[],commands:['/usr/bin/true'],title:'synthetic preflight',summary:'no native effect',
    run_id:'a',reservation_version:a.version,coordination_protocol:'resource-scoped-v1',operation_id:'op-preflight-a',
    operation_digest:createHash('sha256').update('preflight-a').digest('hex'),resources,
    expected_revisions:Object.fromEntries(resources.map((r)=>[r.key,0])),timeout_seconds:1,interval_seconds:1};
  native.rules.ses_new=[{permission:'bash',pattern:'*',action:'allow'}];
  const part={type:'tool',tool:'cgpt-validation_request_validation',state:{status:'running',input:approval}};
  native.messages.ses_new.push({parts:[part]});
  const pending=await tool('request_validation',approval); assert.equal(pending.status,'PENDING');
  part.state={status:'completed',input:approval,output:JSON.stringify(pending)};
  native.rules.ses_new=[{permission:'*',pattern:'*',action:'ask'}];
  for(let i=0;i<2;i++)append('poll_approval',{approval_id:approval.approval_id,timeout_seconds:1,interval_seconds:1},
    await tool('poll_approval',{approval_id:approval.approval_id,timeout_seconds:1,interval_seconds:1}));
  const originalRuns=await request('/runs');
  const publishBroker=async()=>{const r=await tool('broker_readiness',{});await request('/broker/readiness',r);return r;};
  await until(async()=>{const r=await publishBroker();return r.pending_count===1;});
  telemetry=setInterval(()=>{void publishBroker().catch(()=>{});},250);
  assert.ok(originalRuns.requestOwners[approval.requestId]);
  assert.equal((await request('/runs/a/status')).hasUnresolvedOperation,false);
  await start('supervisor');
  if(webActive)await start('monitor');else await releasePort(monitorUrl);
  const c={profile:'frozen-recovery-controller',home,workspace,pluginRoot:currentPlugin,brokerDirectory,controllerUrl,
    supervisorUrl,monitorUrl,opencodeUrl,waitMs:5000,frozenRecovery:{
      transactionId:'maintenance-'+randomUUID(),authorization:'specific isolated maintenance approval',layout:managed?'managed-release':'flat',
      target:{runId:'a',jobId:'job-a',expectedSessionId:'ses_a',candidateSessionId:'ses_new',recoveryId:recovery.recoveryId,
        preflightRequestId:approval.requestId,approvalId:approval.approval_id,reservationVersion:a.version,contextId:a.contextId},
      originalManifest,expectedBuildDigest:proofHash(await moduleManifest(join(currentPlugin,'scripts/cgpt-approval-bridge-controller.mjs'))),
      preservedProcesses:{opencode:await processIdentity(process.pid),broker:await processIdentity(broker.pid),web:webActive?await processIdentity(processes.monitor.pid):null} }};
  return {root,c,native,request,tool,publishBroker,getBroker:()=>broker,stopTelemetry:()=>clearInterval(telemetry),append,approval,recovery,a,serviceEvents,serviceCommand,processes,broker,
    originalRuns,originalEntry,originalManifest,maintenanceRoot,controllerFile};
}

async function transitionAndRecovery(t, managed=false,homogeneous=false,rollbackOrdinary=false,reuse=null) {
    const h=await fixture(t,{managed}), oldPid=h.processes.controller.pid, brokerPid=h.broker.pid;
    const observation=(await h.request('/status')).brokerReadiness;
    assert.equal(observation.by_session?.ses_new?.pending_count,1,JSON.stringify({total:observation.pending_count,by_run:observation.by_run,by_session:observation.by_session}));
    const beforeJob=await h.request('/runs/a/job');
    const { createOpenCodeV2ClientFromEnv } = await import('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs');
    const proofOptions={controllerUrl:h.c.controllerUrl,workspace:h.c.workspace,target:h.c.frozenRecovery.target,
      openCode:createOpenCodeV2ClientFromEnv({directory:h.c.workspace,baseUrl:h.c.opencodeUrl})};
    const baselineProof=await collectFrozenProof(proofOptions);
    const withRegistry=(amend)=>({...proofOptions,request:async(base,path,body)=>{
      const value=await maintenanceHttp(base,path,body);
      return path==='/runs'?amend(value):value;
    }});
    assert.deepEqual(await collectFrozenProof(withRegistry((r)=>({...r,testResourceProtocol:'test-resources-v1'}))),baselineProof);
    await assert.rejects(collectFrozenProof(withRegistry((r)=>({...r,testResourceProtocol:'unknown-v99'}))),/maintenance-runtime-incompatible/);
    const altered=await collectFrozenProof(withRegistry((r)=>({...r,runs:r.runs.map((run,index)=>index?run:{...run,selectionKey:'altered-fixture-intent'})})));
    assert.notEqual(altered.registryHash,baselineProof.registryHash);

    const result=await updateComponents(h.c,{serviceCommand:h.serviceCommand});
    h.stopTelemetry();
    assert.equal(result.status,'completed');assert.equal(result.originalRefusal.error,'run-not-quiescent');
    assert.equal(result.packageVersion,'2.1.14');
    assert.deepEqual(result.runtimeVersions,{controller:'2.1.14',broker:'1.7.1',supervisor:'1.7.1',web:'1.7.1'});
    assert.notEqual(h.processes.controller.pid,oldPid);assert.equal(h.broker.pid,brokerPid);assert.equal(h.broker.exitCode,null);
    const status=await h.request('/status');assert.equal(status.maintenanceBuildDigest,h.c.frozenRecovery.expectedBuildDigest);
    assert.equal(status.notificationReconciliation,'rejection-only-v1');assert.equal(status.frozenRecoveryMaintenance,'frozen-recovery-v1');
    assert.deepEqual({...await h.request('/runs/a/job'),updatedAt:null},{...beforeJob,updatedAt:null});
    assert.equal((await h.request('/runs')).coordination.global.state,'RELEASED');
    assert.equal(h.native.messages.ses_new.length,4);assert.deepEqual(h.native.replies,[]);
    assert.ok(!h.native.events.some(([method,path])=>method==='POST'&&(path.includes('/mcp/')||path.includes('/dispose'))));
    assert.deepEqual(h.serviceEvents.filter((e)=>e[0]==='stop').map((e)=>e[1]),
      ['cgpt-approval-bridge-supervisor.service','cgpt-approval-bridge-controller.service']);
    const repair={transactionId:'repair-original',developerAuthorization:'specific refusal-only repair approval',
      jobId:'job-a',recoveryId:h.recovery.recoveryId,approval:h.approval};
    await h.request('/broker/readiness',{status:'BLOCKED',pending_count:1,coordination_protocol:'resource-scoped-v1'});
    assert.equal((await h.request('/runs/a/validation/reconcile',repair)).outcome,'REJECTION_ONLY');
    await assert.rejects(h.request('/runs/a/decision/preflight-a',{decision:'approved'}));
    await h.request('/runs/a/decision/preflight-a',{decision:'rejected'});
    const rejected=await h.tool('poll_approval',{approval_id:h.approval.approval_id,timeout_seconds:5,interval_seconds:1});
    assert.equal(rejected.status,'REJECTED');h.append('poll_approval',{approval_id:h.approval.approval_id},rejected);
    await h.request('/broker/readiness',{status:'READY',pending_count:0,coordination_protocol:'resource-scoped-v1'});
    const retry=await h.request('/runs/a/job/recover',{...h.recovery,phase:'retry',previousPreflightRequestId:'preflight-a',preflightRequestId:'preflight-next'});
    assert.equal(retry.recovery.sessionId,'ses_new');assert.equal(retry.jobId,'job-a');assert.deepEqual(h.native.replies,[]);
    assert.equal((await h.request('/runs/b/job')).sessionId,'ses_b');
    // Franchir la frontière complète avec le même broker original, une nouvelle demande et une seule vraie commande inoffensive.
    h.append('broker_readiness',{},await h.tool('broker_readiness',{}));
    const next={...h.approval,requestId:'preflight-next',approval_id:'approval-next',operation_id:'op-next',
      operation_digest:createHash('sha256').update('preflight-next').digest('hex'),timeout_seconds:5};
    const part={type:'tool',tool:'cgpt-validation_request_validation',state:{status:'running',input:next,time:{start:Date.now()}}};
    h.native.messages.ses_new.push({parts:[part]});
    const pendingReply=h.tool('request_validation',next);pendingReply.catch(()=>{});
    await until(async()=>(await h.request('/runs/a/status')).undecidedValidationCount===1);
    await h.request('/runs/a/decision/preflight-next',{decision:'approved',reviewer:'CGPT'});
    const approved=await pendingReply;assert.equal(approved.status,'APPROVED');
    part.state={...part.state,status:'completed',output:JSON.stringify(approved),time:{start:part.state.time.start,end:Date.now()}};
    const access=await h.request('/runs/a/locks/acquire',{version:h.a.version,operationId:next.operation_id,
      operationDigest:next.operation_digest,resources:next.resources,expectedRevisions:next.expected_revisions});
    h.native.permissions=[{id:'permission-next',sessionID:'ses_new',permission:'bash',tool:{callID:'call-next'},metadata:{command:'/usr/bin/true'}}];
    await until(()=>h.native.replies.length===1);assert.deepEqual(h.native.replies,[{response:'once'}]);
    const operation=(await h.request('/runs')).coordination.operations[next.operation_id];
    const exit=await new Promise((done,reject)=>{const child=spawn('/usr/bin/true',[],{cwd:h.c.workspace});child.once('error',reject);child.once('exit',done);});
    assert.equal(exit,0);
    h.native.messages.ses_new.push({parts:[{id:'native-next',sessionID:'ses_new',callID:'call-next',type:'tool',tool:'bash',
      state:{status:'completed',input:{command:'/usr/bin/true'},metadata:{exit},time:{start:operation.native.startedAt,end:Date.now()}}}]});
    let finalReadiness;
    await until(async()=>{finalReadiness=await h.tool('broker_readiness',{});return finalReadiness.status==='READY'&&finalReadiness.pending_count===0;});
    h.append('broker_readiness',{},finalReadiness);
    await h.request('/broker/readiness',finalReadiness);
    await h.request('/runs/a/locks/release',{version:h.a.version,operationId:next.operation_id,token:access.token,fencing:access.fencing,
      outcome:'COMPLETED',evidence:['fresh native once and exit 0']});
    const complete=await h.request('/runs/a/job/recover',{...h.recovery,phase:'complete',preflightRequestId:'preflight-next'});
    assert.equal(complete.sessionId,'ses_new');assert.equal(complete.recovery,null);assert.equal(complete.jobId,'job-a');
    assert.equal(h.broker.pid,brokerPid);assert.equal(h.broker.exitCode,null);assert.equal(h.native.replies.length,1);
    const stopCount=h.serviceEvents.filter((e)=>e[0]==='stop').length;
    await assert.rejects(updateComponents(h.c,{serviceCommand:h.serviceCommand,rollbackOnly:true}),/update-frozen-manual-rollback-not-supported/);
    assert.equal(h.serviceEvents.filter((e)=>e[0]==='stop').length,stopCount);
    assert.equal((await updateComponents(h.c,{serviceCommand:h.serviceCommand})).status,'up-to-date');
    assert.deepEqual(await moduleManifest(h.originalEntry),managed?h.originalManifest:
      await moduleManifest(join(currentPlugin,'scripts/cgpt-approval-bridge-controller.mjs')));
    if(managed)assert.match(await readlink(h.controllerFile),/^releases\/2\.1\.14\+build\.[a-f0-9]+\/scripts\/cgpt-approval-bridge-controller\.mjs$/);
    if(homogeneous){
      const run=(await h.request('/runs')).runs.find((r)=>r.runId==='a');
      await h.request('/runs/a/suspend',{version:run.version,action:'PAUSE',evidence:['explicit homogeneous alignment rendezvous']});
      const normal={...h.c,layout:'managed-release'};delete normal.profile;delete normal.frozenRecovery;
      let readonlyBefore;
      if(reuse){
        const manifest={};
        for(const name of BROKER_ARTIFACT_FILES){
          const target=join(normal.brokerDirectory,name);await copyFile(join(currentPlugin,'broker',name),target);
          const stamp=new Date(Date.now()+2000);await utimes(target,stamp,stamp);
          manifest[name]=createHash('sha256').update(await readFile(target)).digest('hex');
        }
        const ready=await h.publishBroker();assert.equal(ready.server_version,'1.7.1');assert.equal(ready.pending_count,0);
        normal.brokerPolicy='reuse-readonly';normal.brokerProof={authorization:'isolated explicit readonly broker reuse',
          entry:join(normal.brokerDirectory,BROKER_ARTIFACT_FILES[0]),expectedUid:process.getuid(),expectedGid:(await lstat(join(normal.brokerDirectory,BROKER_ARTIFACT_FILES[0]))).gid,
          manifest,loadedVersion:ready.server_version,instanceId:ready.instance_id,
          opencodeProcess:await processIdentity(process.pid),brokerProcess:await processIdentity(h.getBroker().pid)};
        readonlyBefore=await inspectBrokerArtifacts(normal.brokerDirectory,normal.brokerProof);
        if(reuse==='disconnect-loss')h.native.loseDisconnectResponse=true;
        if(reuse!=='complete'){
          let restartFailureInjected=false;
          const onPhase=(phase,receipt)=>{
            if(reuse==='before-intent-crash'&&phase==='STOPPING'&&receipt.externalBroker?.disconnectIntentAt===null)
              throw Object.assign(new Error('fixture readonly before intent crash'),{code:'SIMULATED_CRASH'});
            if(reuse==='intent-crash'&&phase==='STOPPING'&&receipt.externalBroker?.disconnectIntentAt!==null)
              throw Object.assign(new Error('fixture readonly intent crash'),{code:'SIMULATED_CRASH'});
            if(reuse==='restart-failure'&&phase==='RESTARTING'&&!restartFailureInjected){
              restartFailureInjected=true;throw new Error('fixture readonly restart failure');
            }
          };
          await assert.rejects(updateComponents(normal,{serviceCommand:h.serviceCommand,onPhase}),
            reuse==='before-intent-crash'?/fixture readonly before intent crash/:reuse==='intent-crash'?/fixture readonly intent crash/:/update-broker-forward-recovery-required/);
          const receipt=JSON.parse(await readFile(join(normal.home,'.local/state/cab-approval-bridge-update/current.json')));
          if(reuse==='before-intent-crash')assert.equal(receipt.externalBroker.disconnectIntentAt,null);
          else assert.ok(receipt.externalBroker.disconnectIntentAt);
          assert.ok(['STOPPING','READONLY_RECOVERY_REQUIRED'].includes(receipt.phase));
          assert.ok(!receipt.files.some((file)=>file.group==='broker'));
          assert.equal(receipt.externalBroker.beforeLoadedVersion,'1.7.1');assert.equal(receipt.externalBroker.artifactVersion,'2.1.14');
          assert.deepEqual(await inspectBrokerArtifacts(normal.brokerDirectory,normal.brokerProof),readonlyBefore);
          const calls=h.native.events.length;
          if(reuse==='before-intent-crash')assert.equal((await updateComponents(normal,{serviceCommand:h.serviceCommand,rollbackOnly:true})).status,'rolled-back');
          else await assert.rejects(updateComponents(normal,{serviceCommand:h.serviceCommand,rollbackOnly:true}),/update-broker-forward-recovery-required/);
          assert.ok(!h.native.events.slice(calls).some(([method,path])=>method==='POST'&&path.startsWith('/mcp/')));
        }
      }
      if(rollbackOrdinary){
        const controllerLink=await readlink(h.controllerFile);
        const monitorLink=await readlink(join(h.c.home,'.local/share/cab-approval-bridge-monitor/scripts'));
        let failureInjected=false;
        await assert.rejects(updateComponents(normal,{serviceCommand:h.serviceCommand,onPhase:(phase)=>{
          if(phase==='RESTARTING'&&!failureInjected){failureInjected=true;throw new Error('fixture ordinary install failure');}
        }}),/update-failed-rolled-back/);
        assert.equal(await readlink(h.controllerFile),controllerLink);
        assert.equal(await readlink(join(h.c.home,'.local/share/cab-approval-bridge-monitor/scripts')),monitorLink);
        assert.equal((await h.request('/status')).version,'2.1.14');
        assert.equal((await maintenanceHttp(h.c.supervisorUrl,'/status')).version,'1.7.1');
        assert.equal((await maintenanceHttp(h.c.monitorUrl,'/api/snapshot')).version,'1.7.1');
        assert.equal((await h.tool('broker_readiness',{})).server_version,'1.7.1');
        assert.equal((await h.request('/runs')).coordination.global.state,'RELEASED');
        assert.deepEqual(await moduleManifest(h.originalEntry),h.originalManifest);
        assert.equal(h.native.replies.length,1);return;
      }
      const aligned=await updateComponents(normal,{serviceCommand:h.serviceCommand});assert.equal(aligned.status,'completed');
      if(reuse){
        assert.equal(aligned.brokerArtifactPolicy,'reuse-readonly');assert.equal(aligned.brokerLoadedBefore,'1.7.1');assert.equal(aligned.brokerLoadedAfter,'2.1.14');
        assert.deepEqual(await inspectBrokerArtifacts(normal.brokerDirectory,normal.brokerProof),readonlyBefore);
        await assert.rejects(updateComponents(normal,{serviceCommand:h.serviceCommand}),
          (cause)=>cause.code==='update-preparation-failed'&&['maintenance-process-unavailable','update-broker-process-changed'].includes(cause.causeCode));
        const fresh=await h.publishBroker(),previousBrokerPid=h.getBroker().pid;
        normal.brokerProof={...normal.brokerProof,loadedVersion:fresh.server_version,instanceId:fresh.instance_id,
          brokerProcess:await processIdentity(previousBrokerPid)};
        const repeated=await updateComponents(normal,{serviceCommand:h.serviceCommand});
        assert.ok(['up-to-date','completed'].includes(repeated.status));
        if(repeated.status==='up-to-date')assert.equal(h.getBroker().pid,previousBrokerPid);
        else assert.notEqual(h.getBroker().pid,previousBrokerPid);
        assert.deepEqual(await inspectBrokerArtifacts(normal.brokerDirectory,normal.brokerProof),readonlyBefore);
      }
      assert.equal((await h.request('/status')).version,'2.1.14');
      assert.equal((await maintenanceHttp(h.c.supervisorUrl,'/status')).version,'2.1.14');
      assert.equal((await maintenanceHttp(h.c.monitorUrl,'/api/snapshot')).version,'2.1.14');
      const ready=await h.tool('broker_readiness',{});assert.equal(ready.server_version,'2.1.14');
      assert.notEqual(h.getBroker().pid,brokerPid);assert.equal(h.c.frozenRecovery.preservedProcesses.opencode.pid,process.pid);
      assert.equal((await h.request('/runs/a/job')).jobId,'job-a');assert.equal(h.native.replies.length,1);
      assert.deepEqual(await moduleManifest(h.originalEntry),h.originalManifest);
    }
}

test('processus original 1.7.1 → contrôleur 2.1.14 → rejectionOnly/refus/poll/retry/once/complete, broker conservé',
  {skip:!originalPlugin,timeout:40000},transitionAndRecovery);

test('release gérée : processus original lié → nouvelle release → once/complete sans toucher à l’ancienne',
  {skip:!originalPlugin,timeout:40000},(t)=>transitionAndRecovery(t,true));

test('release gérée : après complete, maintenance ordinaire jusqu’aux quatre processus homogènes 2.1.14',
  {skip:!originalPlugin,timeout:60000},(t)=>transitionAndRecovery(t,true,true));

test('release gérée : un échec ordinaire restaure les pointeurs et les versions actives précédentes',
  {skip:!originalPlugin,timeout:60000},(t)=>transitionAndRecovery(t,true,true,true));

test('release gérée : un layout CLI divergent du fichier autorisé est refusé avant arrêt',
  {skip:!originalPlugin,timeout:30000},async(t)=>{
    const h=await fixture(t,{managed:true});
    await assert.rejects(updateComponents({...h.c,layout:'flat'},{serviceCommand:h.serviceCommand}),/update-frozen-layout-divergent/);
    assert.equal(h.serviceEvents.filter((e)=>e[0]==='stop').length,0);
    assert.deepEqual(await moduleManifest(h.originalEntry),h.originalManifest);
  });

for(const fault of ['complete','before-intent-crash','intent-crash','disconnect-loss','restart-failure'])test('broker en lecture seule : chaîne réelle et '+fault,
  {skip:!originalPlugin,timeout:70000},(t)=>transitionAndRecovery(t,true,true,false,fault));

test('maintenance gelée : pair actif et ancienne session DENY, aucune relance avant frontière',
  {skip:!originalPlugin,timeout:30000},async(t)=>{
    const h=await fixture(t);h.native.busy.ses_b={type:'busy'};
    await assert.rejects(updateComponents(h.c,{serviceCommand:h.serviceCommand}),/maintenance-native-not-quiescent/);
    assert.equal(h.serviceEvents.filter((e)=>e[0]==='stop').length,0);
    assert.equal((await h.request('/runs')).coordination.global.state,'DRAINING');
    assert.equal(h.native.rules.ses_a[0].action,'deny');assert.deepEqual(h.native.replies,[]);
  });

test('maintenance gelée : reprise de la même transaction après arrêt simulé au reçu',
  {skip:!originalPlugin,timeout:30000},async(t)=>{
    const h=await fixture(t);
    await assert.rejects(updateComponents(h.c,{serviceCommand:h.serviceCommand,onPhase:(phase)=>{
      if(phase==='BOOTSTRAP_HELD')throw Object.assign(new Error('fixture interruption'),{code:'SIMULATED_CRASH'});
    }}),/fixture interruption/);
    assert.equal(h.serviceEvents.filter((e)=>e[0]==='stop').length,0);
    const result=await updateComponents(h.c,{serviceCommand:h.serviceCommand});assert.equal(result.status,'completed');
  });

test('maintenance gelée : échec du chargement et retour conservatoire au contrôleur original',
  {skip:!originalPlugin,timeout:30000},async(t)=>{
    const h=await fixture(t);
    await assert.rejects(updateComponents(h.c,{serviceCommand:h.serviceCommand,onPhase:(phase)=>{
      if(phase==='INSTALLED')throw new Error('fixture installation failure');
    }}),/fixture installation failure/);
    const journal=JSON.parse(await readFile(join(h.maintenanceRoot,h.c.frozenRecovery.transactionId+'.json')));
    assert.equal(journal.phase,'ROLLED_BACK_FROZEN');
    assert.equal((await h.request('/runs')).coordination.global.state,'DRAINING');
    assert.equal((await h.request('/status')).notificationReconciliation,undefined);
    assert.deepEqual(h.native.replies,[]);
  });

test('maintenance gelée : refus cumulatifs sans arrêt ni modification du job',
  {skip:!originalPlugin,timeout:30000},async(t)=>{
    const h=await fixture(t), before=await h.request('/runs/a/job');
    const originalOutput=h.native.messages.ses_new[1].parts[0].state.output;
    const cases=[
      ()=>{h.native.rules.ses_new=[{permission:'*',pattern:'*',action:'allow'}];},
      ()=>{h.native.permissions=[{id:'blocked',sessionID:'ses_new',permission:'bash'}];},
      ()=>{h.native.messages.ses_new[1].parts[0].state.output=JSON.stringify({...h.approval,status:'APPROVED'});},
      ()=>{h.native.messages.ses_new.push({parts:[{type:'tool',tool:'bash',state:{status:'completed',input:{command:'/usr/bin/true'}}}]});},
    ];
    for(const change of cases) {
      change(); await assert.rejects(updateComponents(h.c,{serviceCommand:h.serviceCommand}));
      assert.equal(h.serviceEvents.filter((e)=>e[0]==='stop').length,0);
      assert.deepEqual({...await h.request('/runs/a/job'),updatedAt:null},{...before,updatedAt:null});
      h.native.rules.ses_new=[{permission:'*',pattern:'*',action:'ask'}];h.native.permissions=[];
      h.native.messages.ses_new.length=4;h.native.messages.ses_new[1].parts[0].state.output=originalOutput;
    }
    assert.deepEqual(h.native.replies,[]);
  });

test('maintenance gelée : paquet altéré après reçu refusé avant arrêt',
  {skip:!originalPlugin,timeout:30000},async(t)=>{
    const h=await fixture(t);
    await assert.rejects(updateComponents(h.c,{serviceCommand:h.serviceCommand,onPhase:async(phase)=>{
      if(phase==='BOOTSTRAP_HELD') await writeFile(join(h.maintenanceRoot,h.c.frozenRecovery.transactionId,'stage-0'),'corrupt');
    }}),/update-stage-changed/);
    assert.equal(h.serviceEvents.filter((e)=>e[0]==='stop').length,0);
    assert.deepEqual(h.native.replies,[]);
  });

test('maintenance gelée : reçu privé altéré refusé à la reprise',
  {skip:!originalPlugin,timeout:30000},async(t)=>{
    const h=await fixture(t);
    await assert.rejects(updateComponents(h.c,{serviceCommand:h.serviceCommand,onPhase:(phase)=>{
      if(phase==='BOOTSTRAP_HELD')throw Object.assign(new Error('fixture sealed pause'),{code:'SIMULATED_CRASH'});
    }}),/fixture sealed pause/);
    const path=join(h.maintenanceRoot,h.c.frozenRecovery.transactionId+'.json');
    const data=JSON.parse(await readFile(path));data.seal.target.contextId++;await writeFile(path,JSON.stringify(data));
    await assert.rejects(updateComponents(h.c,{serviceCommand:h.serviceCommand}),/maintenance-journal-invalid/);
    assert.equal(h.serviceEvents.filter((e)=>e[0]==='stop').length,0);
  });

test('transition mixte : version Web non qualifiée refusée sans arrêt',
  {skip:!originalPlugin,timeout:30000},async(t)=>{
    const h=await fixture(t);
    const web=createServer((_request,response)=>{
      response.writeHead(200,{'content-type':'application/json'});
      response.end(JSON.stringify({version:'1.6.0',identity:{workspace:h.c.workspace}}));
    });
    await new Promise((done)=>web.listen(0,'127.0.0.1',done));
    t.after(async()=>{web.closeAllConnections();await new Promise((done)=>web.close(done));});
    h.c.monitorUrl='http://127.0.0.1:'+web.address().port;
    await assert.rejects(updateComponents(h.c,{serviceCommand:h.serviceCommand}),/update-frozen-mixed-version-not-qualified/);
    assert.equal(h.serviceEvents.filter((e)=>e[0]==='stop').length,0);
  });

test('transition mixte : un pair inactif sans PAUSE explicite reste bloquant',
  {skip:!originalPlugin,timeout:30000},async(t)=>{
    const h=await fixture(t),b=(await h.request('/runs')).runs.find((r)=>r.runId==='b');
    await h.request('/runs/b/suspend',{version:b.version,action:'RESUME',evidence:['fixture missing pause']});
    await assert.rejects(updateComponents(h.c,{serviceCommand:h.serviceCommand}),/maintenance-peer-pause-required/);
    assert.equal(h.serviceEvents.filter((e)=>e[0]==='stop').length,0);
  });

test('maintenance gelée : un autre PENDING global interdit le chargement',
  {skip:!originalPlugin,timeout:30000},async(t)=>{
    const h=await fixture(t);
    await h.tool('request_validation',{requestId:'unattributed',approval_id:'unattributed-approval',change_id:'other-change',title:'unattributed diagnostic',summary:'isolated additional pending',
      session_id:'ses_unknown',directory:h.c.workspace,files:[],commands:['/usr/bin/true'],timeout_seconds:1,interval_seconds:1});
    await until(async()=>{const r=await h.publishBroker();return r.pending_count===2;});
    await assert.rejects(updateComponents(h.c,{serviceCommand:h.serviceCommand}),/maintenance-broker-pending-unattributed/);
    assert.equal(h.serviceEvents.filter((e)=>e[0]==='stop').length,0);assert.deepEqual(h.native.replies,[]);
  });

test('transition mixte : Web initialement inactif reste inactif',
  {skip:!originalPlugin,timeout:30000},async(t)=>{
    const h=await fixture(t,{webActive:false});
    delete h.c.brokerDirectory;
    const result=await updateComponents(h.c,{serviceCommand:h.serviceCommand});assert.equal(result.status,'completed');
    assert.equal(result.runtimeVersions.web,null);
    assert.ok(!h.serviceEvents.some((e)=>['start','stop'].includes(e[0])&&e[1].includes('monitor')));
  });

test('maintenance gelée : interruptions à chaque frontière et reprise sans nouvel effet métier',
  {skip:!originalPlugin,timeout:90000},async(t)=>{
    for(const boundary of ['PREPARED','STOPPING','STOPPED','INSTALLED','RESTARTED','ADOPTED','VERIFIED','COMPLETED']) {
      await t.test(boundary,{timeout:15000},async(subtest)=>{
        const h=await fixture(subtest);
        await assert.rejects(updateComponents(h.c,{serviceCommand:h.serviceCommand,onPhase:(phase)=>{
          if(phase===boundary)throw Object.assign(new Error('fixture interrupted '+boundary),{code:'SIMULATED_CRASH'});
        }}),/fixture interrupted/);
        const result=await updateComponents(h.c,{serviceCommand:h.serviceCommand});
        assert.ok(['completed','up-to-date'].includes(result.status));
        assert.equal((await h.request('/runs/a/job')).recovery.sessionId,'ses_new');
        assert.equal((await h.request('/runs')).coordination.global.state,'RELEASED');
        assert.deepEqual(h.native.replies,[]);
      });
    }
  });

test('maintenance gelée : preuve expirée ne permet aucun arrêt',
  {skip:!originalPlugin,timeout:30000},async(t)=>{
    const h=await fixture(t);
    await assert.rejects(updateComponents(h.c,{serviceCommand:h.serviceCommand,onPhase:(phase)=>{
      if(phase==='BOOTSTRAP_HELD')throw Object.assign(new Error('fixture expiry pause'),{code:'SIMULATED_CRASH'});
    }}),/fixture expiry pause/);
    const path=join(h.maintenanceRoot,h.c.frozenRecovery.transactionId+'.json');
    const journal=JSON.parse(await readFile(path));journal.seal.createdAt=Date.now()-61000;journal.seal.expiresAt=Date.now()-1000;
    journal.sealDigest=proofHash(journal.seal);await writeFile(path,JSON.stringify(journal));
    await assert.rejects(updateComponents(h.c,{serviceCommand:h.serviceCommand}),/update-bootstrap-proof-expired/);
    assert.equal(h.serviceEvents.filter((e)=>e[0]==='stop').length,0);
  });

test('maintenance gelée : entrée installée symbolique refusée sans arrêt',
  {skip:!originalPlugin,timeout:30000},async(t)=>{
    const h=await fixture(t);await unlink(h.controllerFile);
    await symlink(join(originalPlugin,'scripts/cgpt-approval-bridge-controller.mjs'),h.controllerFile);
    await assert.rejects(updateComponents(h.c,{serviceCommand:h.serviceCommand}),/maintenance-symbolic-entry-refused/);
    assert.equal(h.serviceEvents.filter((e)=>e[0]==='stop').length,0);assert.deepEqual(h.native.replies,[]);
  });

test('release gérée : lien absolu hors namespace refusé avant arrêt',
  {skip:!originalPlugin,timeout:30000},async(t)=>{
    const h=await fixture(t,{managed:true});await unlink(h.controllerFile);
    await symlink(join(originalPlugin,'scripts/cgpt-approval-bridge-controller.mjs'),h.controllerFile);
    await assert.rejects(updateComponents(h.c,{serviceCommand:h.serviceCommand}),/maintenance-managed-link-refused/);
    assert.equal(h.serviceEvents.filter((e)=>e[0]==='stop').length,0);
  });

test('release gérée : rollback du seul pointeur, ancienne release conservée',
  {skip:!originalPlugin,timeout:30000},async(t)=>{
    const h=await fixture(t,{managed:true});
    await assert.rejects(updateComponents(h.c,{serviceCommand:h.serviceCommand,onPhase:(phase)=>{
      if(phase==='INSTALLED')throw new Error('fixture managed install failure');
    }}),/fixture managed install failure/);
    assert.equal(await readlink(h.controllerFile),'releases/1.7.1+original/scripts/cgpt-approval-bridge-controller.mjs');
    assert.deepEqual(await moduleManifest(h.originalEntry),h.originalManifest);
    const journal=JSON.parse(await readFile(join(h.maintenanceRoot,h.c.frozenRecovery.transactionId+'.json')));
    assert.equal(journal.phase,'ROLLED_BACK_FROZEN');assert.deepEqual(h.native.replies,[]);
  });

test('maintenance gelée : une frontière de milliseconde conserve un sceau de 60 secondes',
  {skip:!originalPlugin,timeout:30000},async(t)=>{
    const h=await fixture(t);
    const originalNow=Date.now;
    let previous=originalNow();
    // Force actual clock boundaries without inventing a future timestamp.
    const tickNow=()=>{let now=originalNow();while(now<=previous)now=originalNow();previous=now;return now;};
    try {
      await assert.rejects(updateComponents(h.c,{serviceCommand:h.serviceCommand,onPhase:(phase)=>{
        if(phase==='PREPARED')Date.now=tickNow;
        if(phase==='BOOTSTRAP_HELD'){
          Date.now=originalNow;
          throw Object.assign(new Error('fixture interruption'),{code:'SIMULATED_CRASH'});
        }
      }}),/fixture interruption/);
      Date.now=originalNow;
      const journal=await readBootstrapJournal(h.maintenanceRoot,h.c.frozenRecovery.transactionId);
      assert.equal(journal.seal.expiresAt-journal.seal.createdAt,60000);
      const result=await updateComponents(h.c,{serviceCommand:h.serviceCommand});
      assert.equal(result.status,'completed');
    } finally {Date.now=originalNow;}
  });
