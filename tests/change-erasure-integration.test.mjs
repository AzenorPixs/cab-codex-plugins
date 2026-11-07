import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, existsSync, rmSync,writeFileSync,readFileSync,chmodSync,statSync } from 'node:fs';
import {createHash} from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ResourceRunRegistry } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs';
import { ChangeErasureManager, VERSION } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-erasure-manager.mjs';
import { ErasureTransaction, erasureReferences } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-change-erasure.mjs';
import { cleanupChange } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-cleanup.mjs';
import { TransportHandoff } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-continuity.mjs';
import { writeRuntimeJson, readRuntimeJson } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-state-layout.mjs';

const source=resolve('src');
async function fixture(t,branch,{multiOwner=false,legacy=false,runtimeVersion=VERSION}={}) {
  const root=mkdtempSync(join(tmpdir(),'cab-erasure-integration-'));
  const workspace=join(root,'workspace'),state=join(root,'runtime'),monitor=join(root,'monitor'),brokerRoot=join(root,'broker'),update=join(root,'update');
  for(const path of [workspace,state,monitor,brokerRoot,update])mkdirSync(path,{mode:0o700});
  chmodSync(brokerRoot,0o775);
  let registry=new ResourceRunRegistry(workspace,state);await registry.acquireAuthority();
  const reserve=name=>registry.reserve({runId:'run-'+name,ownerId:'owner',sessionId:'ses_'+name,directory:workspace,
    changeId:'change-'+name,selectionKey:'selection-'+name,resources:[{key:'file:'+name+'.txt',mode:'read'}],dependsOn:[]});
  let historical=null;
  if(multiOwner){historical=registry.reserve({runId:'run-historical',ownerId:'historical-owner',sessionId:'ses_historical',directory:workspace,
    changeId:'change-target',selectionKey:'selection-historical',resources:[{key:'file:old.txt',mode:'read'}],dependsOn:[]});
    registry.release(historical.runId,historical.version,false);
    writeRuntimeJson(join(state,'runs',historical.runId,String(historical.contextId),'controller-job.json'),{
      runId:historical.runId,changeId:historical.changeId,sessionId:historical.sessionId,jobId:'job-historical',armed:false,terminalGate:null});}
  const target=reserve('target'),peer=reserve('peer');
  if(legacy){
    const resources=target.resources,expected=registry.revisions(resources),op=registry.prepareOperation(target.runId,{coordination_protocol:'resource-scoped-v1',run_id:target.runId,reservation_version:target.version,session_id:target.sessionId,requestId:'request-legacy',operation_id:'operation-legacy',operation_digest:'a'.repeat(64),expected_revisions:expected,resources});
    registry.recordDecision(target.runId,op.operationId,{status:'approved',requestId:op.requestId,operationId:op.operationId,runId:target.runId,changeId:target.changeId,version:target.version,sessionId:target.sessionId,operationDigest:op.operationDigest,identityDigest:op.identityDigest,approvalId:'approval-legacy'});
    const access=registry.acquireAccess(target.runId,{version:target.version,operationId:op.operationId,operationDigest:op.operationDigest,resources,expectedRevisions:expected});
    registry.nativeStart(target.runId,{operationId:op.operationId,reservationVersion:target.version,sessionId:target.sessionId,operationDigest:op.operationDigest,expectedRevisions:expected,resources,kind:'bash',target:'true'},op.requestId,{id:'permission-legacy',tool:{callID:'call-legacy'}});registry.nativeIssued(op.operationId);
    registry.completeNative(target.runId,op.operationId,{sessionId:target.sessionId,permissionId:'permission-legacy',callId:'call-legacy',finishedAt:Date.now(),status:'completed',exit:0});
    registry.releaseAccess(target.runId,{version:target.version,operationId:op.operationId,token:access.token,fencing:access.fencing,outcome:'COMPLETED',evidence:['fixture-native-terminal']});
    delete registry.resourceState.operations[op.operationId].nativeResult;registry.persist();
  }
  registry.release(target.runId,target.version,branch==='TERMINÉ');
  const business=branch==='TERMINÉ'?join(workspace,'openspec','changes','archive','2026-11-06-'+target.changeId):join(workspace,'openspec','changes',target.changeId);mkdirSync(business,{recursive:true,mode:0o775});
  writeFileSync(join(business,'BLOCKERS.md'),'# Dépendance métier manquante\n');writeFileSync(join(business,'STATISTICS.md'),'# Statistiques métier vérifiées\n');
  const digest=name=>createHash('sha256').update(readFileSync(join(business,name))).digest('hex');
  const dependencyEvidence=branch==='BLOQUÉ'?{reason:'UNSATISFIED_DEPENDENCY',blockersSha256:digest('BLOCKERS.md'),statisticsSha256:digest('STATISTICS.md')}:null;
  const jobPath=join(state,'runs',target.runId,String(target.contextId),'controller-job.json');
  writeRuntimeJson(jobPath,{runId:target.runId,changeId:target.changeId,sessionId:target.sessionId,jobId:'job-target',armed:false,
    terminalGate:{status:'VALIDATED',declaredState:branch}});
  writeRuntimeJson(join(state,'runs',target.runId,'supervisor-state.json'),{runId:target.runId,jobId:'job-target'});
  writeRuntimeJson(join(monitor,'catalog.json'),{schema:1,workspace,entries:[{kind:'changes',item:{changeId:target.changeId},key:'fixture-target'}]});
  const approvalStorePath=join(brokerRoot,branch==='BLOQUÉ'?'approval-store':'approvals.json');
  const env={...process.env,FIXTURE_WORKSPACE:workspace,PYTHONPATH:source,CGPT_APPROVAL_STORE:approvalStorePath,
    CGPT_APPROVAL_JOURNAL:join(brokerRoot,'events.ndjson'),CGPT_JOURNAL_CHECKPOINT_PATH:join(brokerRoot,'checkpoint.json'),
    CGPT_BROKER_INSTANCE_LOCK:join(brokerRoot,'broker.instance.lock'),CGPT_AUTO_REMEDIATION_CB_STATE_PATH:join(brokerRoot,'circuit.json')};
  delete env.CGPT_JOURNAL_HMAC_KEY;delete env.CGPT_JOURNAL_HMAC_PREVIOUS_KEYS;
  const code=`import sys,json,os\nimport cgpt_approval_bridge_server as b\nitems={}\nfor name in (['target','peer','historical'] if ${multiOwner?'True':'False'} else ['target','peer']):\n item={'approval_id':'approval-'+name,'requestId':'request-'+name,'change_id':('change-target' if name=='historical' else 'change-'+name),'run_id':'run-'+name,'directory':os.environ['FIXTURE_WORKSPACE'],'status':'APPROVED','created_at':'2026-11-05T00:00:00Z','expires_at':'2099-01-01T00:00:00Z'}\n items[item['approval_id']]=item\n b.journal.append_event('FIXTURE_EVENT',approval_id=item['approval_id'],request_id=item['requestId'],change_id=item['change_id'],data={'payload':name})\nb.save_store(b.store_path(),{'approvals':items})\nprint('READY',flush=True)\ncommand=json.loads(sys.stdin.read())\nb.prepare_terminal_erasure(command)\nb.journal.append_event('INSTANCE_STOPPED',data={'fixture':True})\nb.prepare_terminal_erasure_bundle()\n`;
  const child=spawn('python3',['-B','-c',code],{env,stdio:['pipe','pipe','pipe']});
  let error='';child.stderr.on('data',data=>{error+=data});
  await new Promise((resolve,reject)=>{child.stdout.once('data',data=>data.toString().trim()==='READY'?resolve():reject(new Error('fixture-not-ready')));child.once('error',reject)});
  let preparedCommand;
  let sessions=[{id:target.sessionId,directory:workspace},{id:peer.sessionId,directory:workspace},...(historical?[{id:historical.sessionId,directory:workspace}]:[])];
  let mcpState='connected';
  const native={mcp:async()=>({'cgpt-validation':{status:mcpState}}),listSessions:async()=>sessions,sessionStatus:async()=>({}),permissions:async()=>[],
    info:async()=>({pid:54321,version:'2.2.5'}),sharedMcpDirectory:async()=>workspace,
    disconnectMcp:async()=>{child.stdin.end(JSON.stringify(preparedCommand));
      if(child.exitCode===null)await new Promise(resolve=>child.once('exit',resolve));assert.equal(child.exitCode,0,error);mcpState='disabled'},
    connectMcp:async()=>{const result=JSON.parse(execFileSync('python3',['-B','-c',
      'import json,cgpt_approval_bridge_journal as j; print(json.dumps(j.verify_journal()))'],{env,encoding:'utf8'}));assert.equal(result.ok,true);mcpState='connected'}};
  const manager=new ChangeErasureManager({workspace,stateDirectory:state,registry,openCode:native,
    monitorIdentity:async()=>({version:VERSION,identity:{workspace},stateDirectory:monitor}),
    broker:()=>({broker_process:{pid:child.pid},erasure_prepared:manager.pending()?.transactionId})});
  let handoff;let adoption;
  const pids={controller:10001,supervisor:10002,monitor:10003};
  const serviceCalls=[];
  const dependencies={stateDirectory:state,updateDirectory:update,openCode:native,
    statisticsCleanup:{purge:async()=>({status:'PURGED',fixture:true}),verify:async()=>({status:'VERIFIED',fixture:true})},servicePid:async name=>pids[name],
    service:async(name,action)=>{serviceCalls.push([name,action]);pids[name]=action==='stop'?0:20001+['controller','supervisor','monitor'].indexOf(name);if(name==='controller'&&action==='stop'){
      handoff.seal(registry);registry.close();
    }if(name==='controller'&&action==='start'){
      registry=new ResourceRunRegistry(workspace,state);await registry.acquireAuthority();
      adoption=new TransportHandoff(join(state,'transport-handoff.json'),workspace).adopt(registry,{pid:54321,version:'2.2.5',directory:workspace});
      assert.equal(adoption.adopted,true);}},
    http:async(base,path,body)=>{
      if(path==='/cleanup/status'){preparedCommand=manager.brokerCommand();return manager.public()}
      if(path==='/cleanup/seal')return manager.seal(body);
      if(path==='/transport/status')return {workspace,version:runtimeVersion,pid:pids.controller};
      if(path==='/transport/prepare') {handoff=new TransportHandoff(join(state,'transport-handoff.json'),workspace);handoff.prepare(body.transactionId,{pid:54321,version:'2.2.5',directory:workspace});return {ready:true}}
      if(path==='/api/maintenance-identity')return {version:runtimeVersion,pid:pids.monitor,identity:{workspace},stateDirectory:monitor};
      if(path==='/api/snapshot')return {version:runtimeVersion,runs:[peer],changes:{changes:[]}};
      if(path==='/status')return {workspace,version:runtimeVersion,pid:base.endsWith(':8789')?pids.supervisor:pids.controller,runs:{[peer.runId]:peer},brokerReadiness:{ready:true,server_version:runtimeVersion}};
      throw new Error('unexpected-fixture-route');
    }};
  t.after(()=>{registry.close();if(child.exitCode===null)child.kill();rmSync(root,{recursive:true,force:true})});
  return {root,workspace,state,monitor,brokerRoot,approvalStorePath,target,peer,historical,manager,native,dependencies,serviceCalls,dependencyEvidence,business,
    clearNative:()=>{sessions=branch==='BLOQUÉ'?[{id:target.sessionId,directory:workspace},{id:peer.sessionId,directory:workspace}]:[{id:peer.sessionId,directory:workspace}]},getRegistry:()=>registry};
}

test('Reprise2.4.1 : runtime2.4.0 explicite, même reçu, certificat distinct et garde de version inconnue',async t=>{
 const f=await fixture(t,'TERMINÉ',{runtimeVersion:'2.4.0'});
 const plan=await f.manager.prepare({changeId:f.target.changeId,ownerId:'owner',branch:'TERMINÉ',retainedSessionId:null,evidence:['fixture-business-report-reviewed'],dependencyEvidence:f.dependencyEvidence});
 f.clearNative();await f.manager.seal({transactionId:plan.transactionId});
 await assert.rejects(cleanupChange({workspace:f.workspace,action:'execute',transactionId:plan.transactionId,runtimeVersion:'2.3.10'},f.dependencies),/runtime-compatibility-refused/);
 assert.equal(f.serviceCalls.length,0);
 const input={workspace:f.workspace,transactionId:plan.transactionId,runtimeVersion:'2.4.0'};
 const certificate=await cleanupChange({...input,action:'execute'},f.dependencies);
 assert.deepEqual(certificate.recoveryCompatibility,{helperVersion:VERSION,runtimeVersion:'2.4.0'});
 const final=await cleanupChange({...input,action:'finalize',certificate},f.dependencies);
 assert.equal(final.status,'PURGED');assert.equal(final.transactionId,plan.transactionId);
 assert.equal((await cleanupChange({...input,action:'verify',certificate},f.dependencies)).status,'PURGED');
});

for(const branch of ['TERMINÉ','BLOQUÉ'])for(const multiOwner of [false,true])for(const legacy of (multiOwner?[false,true]:[false]))test('OC then all CAB stores, authenticated reanchor and peer preserved: '+branch+(multiOwner?' multi-owner':'')+(legacy?' legacy':''),async t=>{
  const f=await fixture(t,branch,{multiOwner,legacy});
  const preview=multiOwner?f.manager.preview({changeId:f.target.changeId,ownerId:'owner'}):null;
  if(multiOwner)assert.equal(f.manager.pending(),null);
  const plan=await f.manager.prepare({changeId:f.target.changeId,ownerId:'owner',branch,
    retainedSessionId:branch==='BLOQUÉ'?f.target.sessionId:null,evidence:['fixture-business-report-reviewed'],dependencyEvidence:f.dependencyEvidence,
    ...(multiOwner?{ownershipReview:{runBindings:preview.runBindings,inventoryDigest:preview.inventoryDigest,evidence:['developer:whole-change-cleanup-reviewed']}}:{})});
  if(legacy){assert.deepEqual(plan.scope.legacyTerminalOperationIds,['operation-legacy']);assert.equal(Object.hasOwn(f.getRegistry().resourceState.operations['operation-legacy'],'nativeResult'),false);}
  if(branch==='TERMINÉ')await assert.rejects(f.manager.seal({transactionId:plan.transactionId}),/native-cleanup-incomplete/);
  f.clearNative();await f.manager.seal({transactionId:plan.transactionId});
  const beforePeer=f.getRegistry().snapshot().runs.find(row=>row.runId===f.peer.runId);
  const pendingCertificate=await cleanupChange({workspace:f.workspace,action:'execute',transactionId:plan.transactionId},f.dependencies);
  assert.equal(pendingCertificate.status,'CERTIFIED_PENDING_FINALIZE');
  const certificate=await cleanupChange({workspace:f.workspace,action:'finalize',transactionId:plan.transactionId,certificate:pendingCertificate},f.dependencies);
  assert.equal(certificate.status,'PURGED');assert.equal(new ErasureTransaction(f.state).verify(certificate).status,'PURGED');
  assert.ok(certificate.scope.ids.includes(certificate.transactionId));
  const globalHandoff=readRuntimeJson(join(f.state,'transport-handoff.json')).value;
  assert.notEqual(globalHandoff.value.transactionId,certificate.transactionId);
  assert.equal(erasureReferences(globalHandoff,certificate.scope).length,0);
  assert.equal(existsSync(join(f.state,'change-erasure.json')),false);assert.equal(existsSync(join(f.state,'broker-erasure.json')),false);
  assert.equal(existsSync(join(f.state,'runs',f.target.runId)),false);
  assert.deepEqual(f.getRegistry().snapshot().runs.find(row=>row.runId===f.peer.runId),beforePeer);
  const approvals=readRuntimeJson(f.approvalStorePath,{legacy:true}).value.approvals;
  assert.deepEqual(Object.keys(approvals),['approval-peer']);
  assert.equal(erasureReferences(readRuntimeJson(join(f.monitor,'catalog.json')).value,certificate.scope).length,0);
  assert.deepEqual(f.serviceCalls.map(([name,action])=>name+':'+action),['supervisor:stop','monitor:stop','controller:stop','controller:start','supervisor:start','monitor:start']);
  assert.equal((await f.native.listSessions()).some(row=>row.id===f.target.sessionId),branch==='BLOQUÉ');
  assert.equal(statSync(f.brokerRoot).mode&0o777,0o775);
  const verified=await cleanupChange({workspace:f.workspace,action:'verify',certificate:pendingCertificate},f.dependencies);
  assert.equal(verified.status,'PURGED');
  assert.equal(readFileSync(join(f.business,'BLOCKERS.md'),'utf8'),'# Dépendance métier manquante\n');
});

test('coupure en APPLYING : verrous réels, reprise du reçu et aucune seconde déconnexion',async t=>{
 const f=await fixture(t,'TERMINÉ');
 const plan=await f.manager.prepare({changeId:f.target.changeId,ownerId:'owner',branch:'TERMINÉ',retainedSessionId:null,
  evidence:['fixture-reviewed'],dependencyEvidence:null});f.clearNative();await f.manager.seal({transactionId:plan.transactionId});
 let disconnects=0;const disconnect=f.native.disconnectMcp;f.native.disconnectMcp=async(...args)=>{disconnects++;return disconnect(...args)};
 let failOnce=true;
 f.dependencies.beforeApply=async()=>{
  const check="import os,sys,fcntl; fd=os.open(sys.argv[1],os.O_RDWR);\ntry: fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)\nexcept BlockingIOError: sys.exit(0)\nsys.exit(1)";
  for(const path of [join(f.state,'registry.instance.lock'),join(f.brokerRoot,'broker.instance.lock'),
   join(f.brokerRoot,'approvals.json.lock'),join(f.brokerRoot,'events.ndjson.lock')])
   execFileSync('python3',['-B','-c',check,path],{stdio:'pipe'});
  if(failOnce){failOnce=false;throw new Error('simulated-cutover-crash')}
 };
 await assert.rejects(cleanupChange({workspace:f.workspace,action:'execute',transactionId:plan.transactionId},f.dependencies),/simulated-cutover-crash/);
 assert.equal(new ErasureTransaction(f.state).load().phase,'APPLYING');assert.equal(disconnects,1);
 assert.equal(f.serviceCalls.filter(([,action])=>action==='start').length,0);
 const certificate=await cleanupChange({workspace:f.workspace,action:'execute',transactionId:plan.transactionId},f.dependencies);
 assert.equal(certificate.status,'CERTIFIED_PENDING_FINALIZE');assert.equal(disconnects,1);
 const result=await cleanupChange({workspace:f.workspace,action:'finalize',transactionId:plan.transactionId,certificate},f.dependencies);
 assert.equal(result.status,'PURGED');
});

test('préparation vers un autre workspace : refus avant tout POST et sans clé créée',async t=>{
 const f=await fixture(t,'TERMINÉ');let posts=0;
 const dependencies={...f.dependencies,http:async(_base,path)=>{
  if(path==='/transport/status')return {workspace:'/other-project',version:VERSION};posts++;return {};
 }};
 await assert.rejects(cleanupChange({workspace:f.workspace,action:'prepare',request:{}},dependencies),/component-identity-invalid/);
 assert.equal(posts,0);assert.equal(existsSync(join(f.state,'change-erasure.key')),false);assert.equal(existsSync(join(f.state,'change-erasure.json')),false);
});

for(const variant of ['historical-armed','final-gate','closing-owner','unbound-job','changed-before-seal','armed-before-seal'])test('multi-owner : garde manager '+variant,async t=>{
 const f=await fixture(t,'TERMINÉ',{multiOwner:true}),preview=f.manager.preview({changeId:f.target.changeId,ownerId:'owner'});
 const request={changeId:f.target.changeId,ownerId:'owner',branch:'TERMINÉ',retainedSessionId:null,dependencyEvidence:null,evidence:['change-closed'],
  ownershipReview:{runBindings:preview.runBindings,inventoryDigest:preview.inventoryDigest,evidence:['developer:whole-change-cleanup-reviewed']}};
 const historicalPath=join(f.state,'runs',f.historical.runId,String(f.historical.contextId),'controller-job.json');
 const finalPath=join(f.state,'runs',f.target.runId,String(f.target.contextId),'controller-job.json');
 if(variant==='historical-armed'){const job=readRuntimeJson(historicalPath).value;job.armed=true;writeRuntimeJson(historicalPath,job);}
 if(variant==='final-gate'){const job=readRuntimeJson(finalPath).value;job.terminalGate=null;writeRuntimeJson(finalPath,job);}
 if(variant==='closing-owner')request.ownerId='historical-owner';
 if(variant==='unbound-job')writeRuntimeJson(join(f.state,'runs','run-foreign','99','controller-job.json'),{runId:'run-foreign',changeId:f.target.changeId,armed:false});
 if(['changed-before-seal','armed-before-seal'].includes(variant)){
  const plan=await f.manager.prepare(request);f.clearNative();
  if(variant==='changed-before-seal')f.getRegistry().runs.get(f.target.runId).version++;
  else {const job=readRuntimeJson(historicalPath).value;job.armed=true;writeRuntimeJson(historicalPath,job);}
  await assert.rejects(f.manager.seal({transactionId:plan.transactionId}),/ownership-review-divergent|terminal-gate-unverified/);return;
 }
 await assert.rejects(f.manager.prepare(request),/erasure-/);assert.equal(f.manager.pending(),null);
});
