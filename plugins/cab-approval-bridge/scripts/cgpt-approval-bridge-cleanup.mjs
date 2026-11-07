import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve,dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import {randomUUID} from 'node:crypto';
import { ErasureTransaction, erasureFilePlan, projectErasure, erasureReferences, removeErasureDirectories,readErasureBytes } from './cgpt-approval-bridge-change-erasure.mjs';
import { runtimeStateDirectory,legacyStateDirectory, readRuntimeJson, ensurePrivateStateDirectory } from './cgpt-approval-bridge-state-layout.mjs';
import { authority } from './cgpt-approval-bridge-update.mjs';
import { canonicalContinuityDigest, continuityDigest } from './cgpt-approval-bridge-continuity.mjs';
import { createOpenCodeV2ClientFromEnv } from './cgpt-approval-bridge-opencode-client.mjs';
import {ArchiveContent,archiveDirectory,changeReports} from './cgpt-approval-bridge-archives.mjs';
import {cleanTestArea} from './cgpt-approval-bridge-autonomy.mjs';
import {purgeStatistics,verifyStatisticsAbsence} from './cgpt-approval-bridge-sgs-cleanup.mjs';

export const VERSION='2.4.1';
const fail=code=>{throw Object.assign(new Error(code),{code})};
const exec=promisify(execFile);
const unit=name=>'cgpt-approval-bridge-'+name+'.service';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const base=value=>{const u=new URL(value);if(u.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.username||u.password||u.pathname!=='/'||u.search||u.hash)fail('erasure-endpoint-invalid');return u.origin};

export async function cleanupChange(input, dependencies={}) {
  const updateRoot=dependencies.updateDirectory||join(homedir(),'.local/state/cab-approval-bridge-update');
  ensurePrivateStateDirectory(updateRoot);
  const lock=await authority(join(updateRoot,'update.lock'));
  const offlineLocks=[];
  try{return await executeCleanup(input,{...dependencies,updateRoot,offlineLocks})}
  finally{while(offlineLocks.length)await offlineLocks.pop().close();await lock.close()}
}
async function executeCleanup(input,dependencies) {
  const runtimeVersion=input.runtimeVersion??VERSION;
  if(runtimeVersion!==VERSION&&(VERSION!=='2.4.1'||runtimeVersion!=='2.4.0'||!['execute','finalize','verify'].includes(input.action)))fail('erasure-runtime-compatibility-refused');
  const workspace=resolve(input.workspace),root=dependencies.stateDirectory||runtimeStateDirectory(workspace);
  if(input.action==='execute'&&root!==runtimeStateDirectory(workspace)&&!dependencies.statisticsCleanup)fail('erasure-sgs-isolation-adapter-required');
  const statisticalCleanup=dependencies.statisticsCleanup||{purge:purgeStatistics,verify:verifyStatisticsAbsence};
  if(!existsSync(join(root,'controller-runs.json')))fail('erasure-runtime-not-found');
  const controller=base(input.controllerUrl||'http://127.0.0.1:8788');
  const supervisor=base(input.supervisorUrl||'http://127.0.0.1:8789');
  const monitor=base(input.monitorUrl||'http://127.0.0.1:8790');
  const service=dependencies.service||(async(name,action)=>{await exec('/usr/bin/systemctl',['--user',action,unit(name)],{timeout:15000,maxBuffer:4096})});
  const servicePid=dependencies.servicePid||(async name=>{
    const result=await exec('/usr/bin/systemctl',['--user','show','--property=MainPID','--value',unit(name)],{timeout:5000,maxBuffer:1024});
    if(!/^\d+\s*$/.test(result.stdout))fail('erasure-service-identity-unavailable');return Number(result.stdout.trim());});
  const http=dependencies.http||(async(url,path,body)=>{
    const response=await fetch(url+path,{method:body===undefined?'GET':'POST',redirect:'error',signal:AbortSignal.timeout(path==='/cleanup/owner/check'?95000:10000),
      headers:{'content-type':'application/json','x-cab-continuity':'cab-continuity-v1'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const chunks=[];let length=0;for await(const part of response.body){length+=part.length;if(length>64*1024*1024)fail('erasure-response-too-large');chunks.push(part)}
    const result=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!response.ok)fail(result.error||'erasure-source-refused');return result;
  });
  if(['preview','prepare','seal','status'].includes(input.action)) {
    const identity=await http(controller,'/transport/status');
    if(identity.workspace!==workspace||identity.version!==runtimeVersion)fail('erasure-component-identity-invalid');
    if(['preview','prepare'].includes(input.action))return http(controller,'/cleanup/'+input.action,input.request||readRuntimeJson(input.input).value);
    if(input.action==='seal')return http(controller,'/cleanup/seal',{transactionId:input.transactionId});
    return http(controller,'/cleanup/status',{});
  }
  const tx=new ErasureTransaction(root,{createKey:false});
  const releaseOfflineLocks=async()=>{while(dependencies.offlineLocks.length)await dependencies.offlineLocks.pop().close()};
  const takeOfflineLocks=async()=>{
    const owned=tx.load()?.brokerTransport==='owner-local-v1';
    const bundle=owned?{transactionId:input.transactionId,locks:{}}:tx.verify(readRuntimeJson(join(root,'broker-erasure.json')).value);
    if(bundle.transactionId!==input.transactionId||!bundle.locks||!owned&&(Object.keys(bundle.locks).length!==3||
      !['instance','store','journal'].every(key=>typeof bundle.locks[key]==='string'&&bundle.locks[key].startsWith('/'))))
      fail('erasure-lock-inventory-invalid');
    const legacyLock=join(legacyStateDirectory(workspace),'registry.instance.lock');
    const paths=[join(root,'registry.instance.lock'),...Object.values(bundle.locks),...(existsSync(legacyLock)?[legacyLock]:[])];
    for(const path of new Set(paths))dependencies.offlineLocks.push(await authority(path));
  };
  const certificateInput=()=>{const value=input.certificate||readRuntimeJson(input.input).value;return value.certificate||value};
  const absent=(value,exclude=[])=>!erasureFilePlan(value.roots,value.scope,{exclude:[...exclude,...(value.journalPaths||[])],legacyRoots:value.legacyRoots||[],sourceArtifactRoots:value.sourceArtifactRoots||[]}).entries.length&&
    (value.journalPaths||[]).every(path=>!erasureReferences(readErasureBytes(path).toString('utf8'),value.scope).length);
  if(input.action==='verify') {
    const certificate=tx.verify(certificateInput());
    if(certificate.scope?.workspace!==workspace||!certificate.roots?.includes(root))fail('erasure-workspace-divergent');
    const [c,s,m]=await Promise.all([http(controller,'/status'),http(supervisor,'/status'),http(monitor,'/api/snapshot')]);
    if([c,s,m].some(row=>row.version!==runtimeVersion)||c.brokerReadiness?.server_version!==runtimeVersion)fail('erasure-component-identity-invalid');
    if(certificate.ownerReceipts?.commit){const owner=await http(controller,'/cleanup/owner/check',{certificate:certificateInput()});if(owner.state!=='VERIFIED')fail('erasure-owner-absence-unverified');}
    if(certificate.sgsReceipt)await statisticalCleanup.verify(certificate.scope);
    if(!absent(certificate)||[c,s,m].some(value=>erasureReferences(value,certificate.scope).length))fail('erasure-absence-unverified');
    return tx.seal({...certificate,status:'PURGED',verifiedAt:Date.now(),verifiedRuntimeVersion:runtimeVersion});
  }
  const native=dependencies.openCode||createOpenCodeV2ClientFromEnv({directory:workspace,baseUrl:input.opencodeUrl||'http://127.0.0.1:4096'});
  let value=tx.load();
  if(!value||value.transactionId!==input.transactionId)fail('erasure-transaction-divergent');
  if(value.scope?.workspace!==workspace||!value.roots?.includes(root))fail('erasure-workspace-divergent');
  if(runtimeVersion!==VERSION){
    if(value.protocol!=='cab-change-erasure-v1'||!['SEALED','FREEZING','STOPPING','APPLYING','RESTARTING','VERIFYING','CERTIFIED'].includes(value.phase))fail('erasure-runtime-compatibility-refused');
    value={...value,recoveryCompatibility:{helperVersion:VERSION,runtimeVersion}};tx.save(value);
  }
  const ownerCall=async action=>{
    await http(controller,'/cleanup/owner/action',{transactionId:value.transactionId,action});
    const expected={commit:'APPLIED',verify:'VERIFIED',finalize:'PURGED'}[action],end=Date.now()+90000;
    while(true){
      const status=await http(controller,'/cleanup/status',{});
      if(status.ownerStates?.[action]===expected&&status.ownerInstances?.[action]===status.brokerInstanceId){value=tx.load();return;}
      if(status.brokerPreparationError)fail(status.brokerPreparationError);
      if(Date.now()>=end)fail('erasure-owner-action-timeout');await delay(200);
    }
  };
  if(input.action==='finalize') {
    const signed=certificateInput();tx.verify(signed);
    if(value.phase!=='CERTIFIED'||canonicalContinuityDigest(signed)!==canonicalContinuityDigest(value.certificate))fail('erasure-certificate-not-acknowledged');
    const [c,s,m,active,permissions,info,sessions]=await Promise.all([http(controller,'/status'),http(supervisor,'/status'),http(monitor,'/api/snapshot'),
      native.sessionStatus(workspace),native.permissions(workspace,{sessionIds:value.sessionIds}),native.info(true),native.listSessions(workspace)]);
    const present=new Set(sessions.map(row=>row.id));
    if([c,s,m].some(view=>erasureReferences(view,value.scope).length)||value.sessionIds.some(id=>active[id])||
      value.sessionIds.some(id=>id!==value.retainedSessionId&&present.has(id))||value.retainedSessionId&&!present.has(value.retainedSessionId)||
      permissions.some(row=>value.sessionIds.includes(row.sessionID))||info.pid!==value.nativeIdentity.pid||info.version!==value.nativeIdentity.version)
      fail('erasure-final-boundary-changed');
    if(!absent(value,[tx.path,join(root,'broker-erasure.json')]))fail('erasure-absence-unverified');
    if(value.brokerTransport==='owner-local-v1')await ownerCall('finalize');
    if(existsSync(join(root,'broker-erasure.json')))unlinkSync(join(root,'broker-erasure.json'));
    return tx.finish(value,()=>absent(value,[tx.path]));
  }
  if(input.action!=='execute')fail('erasure-action-invalid');
  if(value.phase==='CERTIFIED')return value.certificate;
  const bundlePath=join(root,'broker-erasure.json');
  const excluded=[tx.path,bundlePath];
  const nativeIdentity=async()=>{
    const info=await native.info(true);return {pid:info.pid,version:info.version};
  };
  const checkNative=async()=>{
    const identity=await nativeIdentity();
    if(identity.pid!==value.nativeIdentity.pid||identity.version!==value.nativeIdentity.version||
      value.sharedDirectory&&await native.sharedMcpDirectory()!==value.sharedDirectory)fail('erasure-native-identity-changed');
    const [sessions,active,permissions]=await Promise.all([native.listSessions(workspace),native.sessionStatus(workspace),
      native.permissions(workspace,{sessionIds:value.sessionIds})]);
    const present=new Set(sessions.map(row=>row.id));
    if(value.sessionIds.some(id=>id!==value.retainedSessionId&&present.has(id)||active[id])||
      value.retainedSessionId&&!present.has(value.retainedSessionId)||permissions.some(row=>value.sessionIds.includes(row.sessionID)))
      fail('erasure-native-cleanup-incomplete');
  };
  const transition=async action=>{
    const desired=action==='connect'?'connected':'disabled';
    const state=(await native.mcp(value.sharedDirectory))['cgpt-validation']?.status;
    if(state===desired){value={...value,mcpTransition:{action,state:'VERIFIED'}};tx.save(value);return}
    if(state==='pending'||value.mcpTransition?.action===action&&value.mcpTransition.state==='INTENT')fail('erasure-mcp-transition-unverified');
    if(!['connected','disabled'].includes(state))fail('erasure-mcp-state-unavailable');
    value={...value,mcpTransition:{action,state:'INTENT'}};tx.save(value);
    if(action==='connect')await native.connectMcp('cgpt-validation',value.sharedDirectory,{timeout:20000});
    else await native.disconnectMcp('cgpt-validation',value.sharedDirectory,{timeout:20000});
    if((await native.mcp(value.sharedDirectory))['cgpt-validation']?.status!==desired)fail('erasure-mcp-transition-unverified');
    value={...value,mcpTransition:{action,state:'VERIFIED'}};tx.save(value);
  };
  const start=async()=>{
    await releaseOfflineLocks();
    for(const name of ['controller','supervisor','monitor']) {
      const address=name==='controller'?controller:name==='supervisor'?supervisor:monitor;
      const path=name==='controller'?'/transport/status':name==='supervisor'?'/status':'/api/maintenance-identity';
      if(await servicePid(name)===0)await service(name,'start');
      await wait(async()=>{const identity=await http(address,path),pid=await servicePid(name);
        if(identity.version!==runtimeVersion||(identity.workspace||identity.identity?.workspace)!==workspace||identity.pid!==pid)
          fail('erasure-service-identity-changed');return true;});
    }
    await transition('connect');
  };
  const wait=async(check,ms=20000)=>{const end=Date.now()+ms;do{try{if(await check())return}catch(cause){if(['erasure-native-identity-changed','erasure-service-identity-changed'].includes(cause.code))throw cause}if(Date.now()>=end)fail('erasure-component-verification-timeout');await delay(200)}while(true)};
  if(value.phase==='SEALED') {
    const status=await http(controller,'/cleanup/status',{});
    if(status.brokerPreparationError)fail(status.brokerPreparationError);
    if(!status.brokerPrepared)return {status:'WAITING_BROKER',transactionId:value.transactionId,retryAfterMs:1000};
    await http(controller,'/cleanup/seal',{transactionId:value.transactionId});value=tx.load();
    await checkNative();
    const identities=await Promise.all([http(controller,'/transport/status'),http(supervisor,'/status'),http(monitor,'/api/maintenance-identity')]);
    if(identities[0].workspace!==workspace||identities[1].workspace!==workspace||identities[2].identity?.workspace!==workspace||
      identities.some(row=>row.version!==runtimeVersion))fail('erasure-component-identity-invalid');
    const componentPids={};
    for(const [index,name] of ['controller','supervisor','monitor'].entries()){
      const pid=await servicePid(name);if(!pid||pid!==identities[index].pid)fail('erasure-service-identity-changed');componentPids[name]=pid;}
    if(!Number.isSafeInteger(status.brokerPid)||status.brokerPid<=0)fail('erasure-broker-identity-unverified');
    value={...value,componentPids,transportTransactionId:value.transportTransactionId||'continuity-'+randomUUID(),
      sharedDirectory:await native.sharedMcpDirectory(),brokerPid:status.brokerPid,phase:'FREEZING'};tx.save(value);
  }
  if(value.phase==='FREEZING') {
    if(!value.retainedArchive) {
      const archive=new ArchiveContent(archiveDirectory(workspace,{stateRoot:dirname(value.roots[1])}),workspace);
      const retained=archive.retain(value.scope,{reportPaths:changeReports(workspace,value.scope.changeId,value.branch),closed:true,branch:value.branch});
      value={...value,retainedArchive:{archiveId:retained.archiveId,fingerprint:retained.fingerprint}};tx.save(value);
    }
    if(!value.cutoverStartedAt){value={...value,cutoverStartedAt:Date.now()};tx.save(value)}
    await http(controller,'/transport/prepare',{transactionId:value.transportTransactionId});
    if(value.brokerTransport==='owner-local-v1')await ownerCall('commit');
    value={...value,phase:'STOPPING'};tx.save(value);
  }
  if(value.phase==='STOPPING') {
    try {
    for(const name of ['supervisor','monitor','controller']) {
      const pid=await servicePid(name);if(pid!==0&&pid!==value.componentPids[name])fail('erasure-service-identity-changed');
      if(pid!==0)await service(name,'stop');
    }
    await transition('disconnect');
    await wait(()=>{try{process.kill(value.brokerPid,0);return false}catch(cause){if(cause.code!=='ESRCH')throw cause;return value.brokerTransport==='owner-local-v1'||existsSync(bundlePath)}});
    await takeOfflineLocks();
    await checkNative();
    const bundle=value.brokerTransport==='owner-local-v1'?{transactionId:value.transactionId,brokerPid:value.brokerPid,scope:value.scope,roots:[],entries:[],journalPaths:[]}:tx.verify(readRuntimeJson(bundlePath).value);
    if(bundle.transactionId!==value.transactionId||bundle.brokerPid!==value.brokerPid||
      bundle.scope.changeId!==value.scope.changeId||canonicalContinuityDigest(bundle.scope.runIds)!==canonicalContinuityDigest(value.scope.runIds))fail('erasure-broker-bundle-divergent');
    const legacyRoots=[legacyStateDirectory(workspace)];
    const sourceArtifactRoots=[dependencies.updateRoot];
    const roots=[...new Set([...value.roots,...bundle.roots,dependencies.updateRoot,...legacyRoots])];
    const plan=erasureFilePlan(roots,bundle.scope,{exclude:[...excluded,...bundle.journalPaths],legacyRoots,sourceArtifactRoots});
    const registryPath=join(root,'controller-runs.json');
    const before=readRuntimeJson(registryPath).value;
    const expectedPeers=projectErasure(before,plan.scope);
    const registryEntry=plan.entries.find(entry=>entry.path===registryPath);
    if(!registryEntry||registryEntry.remove)fail('erasure-registry-candidate-missing');
    const handoffPath=join(root,'transport-handoff.json'),handoff=readRuntimeJson(handoffPath);
    const nextHandoff=structuredClone(handoff.value);
    const {version,...registryValue}=registryEntry.next;
    nextHandoff.value.registryDigest=canonicalContinuityDigest(registryValue);
    nextHandoff.digest=continuityDigest(nextHandoff.value);nextHandoff.sequence++;
    const policyPath=join(value.roots[1],'catalog-policy.json');
    const entries=[...plan.entries.filter(entry=>entry.path!==handoffPath&&entry.path!==policyPath),...bundle.entries,
      {path:policyPath,before:existsSync(policyPath)?readRuntimeJson(policyPath).sha256:null,next:{referencedOnly:true},remove:false},
      {path:handoffPath,before:handoff.sha256,next:nextHandoff,remove:false}];
    value={...value,scope:plan.scope,roots,legacyRoots,sourceArtifactRoots,entries,journalPaths:bundle.journalPaths,expectedPeers,phase:'APPLYING'};tx.save(value);
    }catch(cause){
      if(value.phase==='STOPPING'&&!value.ownerReceipts?.commit&&value.mcpTransition?.state!=='INTENT'&&cause.code!=='erasure-service-identity-changed'){
        value={...value,phase:'RESTORING_PRESERVED',failureCode:typeof cause.code==='string'?cause.code:'erasure-preparation-failed'};tx.save(value);
        await start();value={...value,phase:'SEALED'};tx.save(value);
      }
      throw cause;
    }
  }
  if(value.phase==='RESTORING_PRESERVED'){
    await checkNative();await start();value={...value,phase:'SEALED'};tx.save(value);
    return {status:'PRESERVED_RETRY_PREPARATION',transactionId:value.transactionId};
  }
  if(value.phase==='APPLYING') {
    if(!dependencies.offlineLocks.length)await takeOfflineLocks();
    if(dependencies.beforeApply)await dependencies.beforeApply(value);
    await checkNative();tx.applyFiles(value);removeErasureDirectories(value.roots,value.scope);
    for(const runId of value.scope.runIds)cleanTestArea(workspace,value.scope.changeId,runId,{closed:true,reportsDurable:true});
    if(!value.sgsReceipt) {
      const sgsReceipt=await statisticalCleanup.purge(value.scope,value.branch,value.transactionId);
      value={...value,sgsReceipt};tx.save(value);
    }
    const observed=readRuntimeJson(join(root,'controller-runs.json')).value;
    if(canonicalContinuityDigest(observed)!==canonicalContinuityDigest(value.expectedPeers))fail('erasure-peer-preservation-failed');
    if(!absent(value,excluded))
      fail('erasure-durable-absence-unverified');
    value={...value,phase:'RESTARTING'};tx.save(value);
  }
  if(value.phase==='RESTARTING') {
    await checkNative();await start();
    value={...value,phase:'VERIFYING'};tx.save(value);
  }
  if(value.phase==='VERIFYING') {
    await checkNative();
    await wait(async()=>{
      const [c,s,m]=await Promise.all([http(controller,'/status'),http(supervisor,'/status'),http(monitor,'/api/snapshot')]);
      if(c.version!==runtimeVersion||s.version!==runtimeVersion||m.version!==runtimeVersion||c.brokerReadiness?.server_version!==runtimeVersion||
        c.brokerReadiness?.ready!==true||erasureReferences(c,value.scope).length||erasureReferences(s,value.scope).length||erasureReferences(m,value.scope).length)return false;
      return true;
    });
    if(value.brokerTransport==='owner-local-v1')await ownerCall('verify');
    await statisticalCleanup.verify(value.scope);
    if(!absent(value,excluded))
      fail('erasure-final-absence-unverified');
    // Journal candidates were authenticated in the broker and survive only until
    // this cutover completes. The restarted broker independently verifies HMAC.
    value={...value,runtimeVerifiedAt:Date.now()};tx.save(value);
    return tx.certify(value,()=>absent(value,excluded));
  }
  fail('erasure-phase-invalid');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const [action,...args]=process.argv.slice(2);const input={action};
  try {
    for(let i=0;i<args.length;i+=2){const key={'--workspace':'workspace','--input':'input','--transaction-id':'transactionId',
      '--controller-url':'controllerUrl','--supervisor-url':'supervisorUrl','--monitor-url':'monitorUrl','--opencode-url':'opencodeUrl','--runtime-version':'runtimeVersion'}[args[i]];
      if(!key||!args[i+1]||input[key]!==undefined)fail('erasure-cli-invalid');input[key]=args[i+1]}
    if(!input.workspace)fail('erasure-workspace-required');
    console.log(JSON.stringify(await cleanupChange(input)));
  }catch(cause){console.error(JSON.stringify({status:'INCOMPLETE',error:typeof cause.code==='string'?cause.code:'erasure-failed'}));process.exitCode=1}
}
