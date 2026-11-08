import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, unlinkSync, readFileSync, realpathSync, lstatSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve,dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import { ErasureTransaction, erasureFilePlan, projectErasure, erasureReferences, removeErasureDirectories,readErasureBytes,erasureScope,retiredRunScope,retiredJobDigest,reconcileRetiredRetention } from './cgpt-approval-bridge-change-erasure.mjs';
import { runtimeStateDirectory,legacyStateDirectory, readRuntimeJson,writeRuntimeJson, ensurePrivateStateDirectory } from './cgpt-approval-bridge-state-layout.mjs';
import { authority } from './cgpt-approval-bridge-update.mjs';
import { canonicalContinuityDigest, continuityDigest,renewErasureHandoff } from './cgpt-approval-bridge-continuity.mjs';
import { createOpenCodeV2ClientFromEnv } from './cgpt-approval-bridge-opencode-client.mjs';
import {ArchiveContent,archiveDirectory,changeReports} from './cgpt-approval-bridge-archives.mjs';
import {cleanTestArea} from './cgpt-approval-bridge-autonomy.mjs';
import {purgeStatistics,verifyStatisticsAbsence} from './cgpt-approval-bridge-sgs-cleanup.mjs';

export const VERSION='2.4.38';
const fail=code=>{throw Object.assign(new Error(code),{code})};
export function verifyFrozenOwnerRebind(value,{status,nativeIdentity,oldPidAbsent,now=Date.now()}={}) {
  const scope=value?.scope,prepared=value?.ownerReceipts?.prepare,commit=value?.ownerReceipts?.commit;
  const readiness=status?.brokerReadiness,broker=readiness?.broker_process,checked=Date.parse(readiness?.checked_at||'');
  if(value?.phase!=='FREEZING'||value.brokerTransport!=='owner-local-v1'||scope?.closureAuthority!=='authoritative-retired-run-batch-v1'||
    !Array.isArray(scope.runIds)||scope.runIds.length!==1||!Array.isArray(scope.protectedRunIds)||!scope.protectedRunIds.length||
    prepared?.state!=='PREPARED'||commit?.state!=='APPLIED'||prepared.scopeDigest!==canonicalContinuityDigest(scope)||commit.scopeDigest!==prepared.scopeDigest||
    !Number.isSafeInteger(prepared.uid)||commit.uid!==prepared.uid||
    !Number.isSafeInteger(prepared.pid)||!Number.isSafeInteger(commit.pid)||prepared.pid===commit.pid||oldPidAbsent!==true||
    value.brokerPid!==prepared.pid||readiness?.ready!==true||readiness.server_version!==VERSION||broker?.pid!==commit.pid||
    !readiness.instance_id||readiness.instance_id!==commit.instanceId||readiness.instance_id===prepared.instanceId||
    !Number.isFinite(checked)||checked>now||now-checked>10000||
    nativeIdentity?.pid!==value.nativeIdentity?.pid||nativeIdentity?.version!==value.nativeIdentity?.version)
    fail('erasure-owner-rebind-proof-invalid');
  return {previousBrokerPid:prepared.pid,brokerPid:commit.pid,uid:commit.uid,previousInstanceId:prepared.instanceId,instanceId:commit.instanceId};
}
const exec=promisify(execFile);
const unit=name=>'cgpt-approval-bridge-'+name+'.service';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const workScope=value=>value.effectiveScope||value.scope;
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
  if(!['preview','prepare','seal','status','execute','finalize','verify','recover-preparation','reconcile-retention','preflight-owner-rebind'].includes(input.action))fail('erasure-action-invalid');
  const runtimeVersion=input.runtimeVersion??VERSION;
  const frozenOwnerProfile=VERSION==='2.4.38'&&runtimeVersion==='2.4.35'&&['execute','finalize','verify','preflight-owner-rebind'].includes(input.action);
  const compatibleRecovery=frozenOwnerProfile||VERSION==='2.4.38'&&runtimeVersion==='2.4.5'&&['execute','finalize','verify','recover-preparation','reconcile-retention'].includes(input.action)||['2.4.1','2.4.2','2.4.3','2.4.4','2.4.5','2.4.38'].includes(VERSION)&&runtimeVersion==='2.4.0'&&['execute','finalize','verify','recover-preparation'].includes(input.action);
  if(runtimeVersion!==VERSION&&!compatibleRecovery)fail('erasure-runtime-compatibility-refused');
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
  const absent=(value,exclude=[])=>!erasureFilePlan(value.roots,workScope(value),{exclude:[...exclude,...(value.journalPaths||[])],legacyRoots:value.legacyRoots||[],sourceArtifactRoots:value.sourceArtifactRoots||[]}).entries.length&&
    (value.journalPaths||[]).every(path=>!erasureReferences(readErasureBytes(path).toString('utf8'),workScope(value)).length);
  if(input.action==='verify') {
    const certificate=tx.verify(certificateInput());
    if(certificate.scope?.workspace!==workspace||!certificate.roots?.includes(root))fail('erasure-workspace-divergent');
    const [c,s,m]=await Promise.all([http(controller,'/status'),http(supervisor,'/status'),http(monitor,'/api/snapshot')]);
    if(frozenOwnerProfile&&(certificate.recoveryCompatibility?.profile!=='frozen-owner-sentinel-v1'||certificate.scope?.closureAuthority!=='authoritative-retired-run-batch-v1'))fail('erasure-runtime-compatibility-refused');
    if([c,s,m].some(row=>row.version!==runtimeVersion)||c.brokerReadiness?.server_version!==(frozenOwnerProfile?VERSION:runtimeVersion))fail('erasure-component-identity-invalid');
    if(certificate.ownerReceipts?.commit){const owner=await http(controller,'/cleanup/owner/check',{certificate:certificateInput()});if(owner.state!=='VERIFIED')fail('erasure-owner-absence-unverified');}
    if(certificate.sgsReceipt)await statisticalCleanup.verify(workScope(certificate));
    if(!absent(certificate)||[c,s,m].some(value=>erasureReferences(value,workScope(certificate)).length))fail('erasure-absence-unverified');
    return tx.seal({...certificate,status:'PURGED',verifiedAt:Date.now(),verifiedRuntimeVersion:runtimeVersion});
  }
  const native=dependencies.openCode||createOpenCodeV2ClientFromEnv({directory:workspace,baseUrl:input.opencodeUrl||'http://127.0.0.1:4096'});
  let value=tx.load();
  if(!value||value.transactionId!==input.transactionId)fail('erasure-transaction-divergent');
  if(value.scope?.workspace!==workspace||!value.roots?.includes(root))fail('erasure-workspace-divergent');
  if(input.action==='preflight-owner-rebind') {
    const scope=value.scope,prepared=value.ownerReceipts?.prepare;
    if(!frozenOwnerProfile||value.phase!=='FREEZING'||value.brokerTransport!=='owner-local-v1'||
      scope?.closureAuthority!=='authoritative-retired-run-batch-v1'||!Array.isArray(scope.runIds)||scope.runIds.length!==1||!Array.isArray(scope.protectedRunIds)||!scope.protectedRunIds.length||
      !Array.isArray(scope.ids)||!Array.isArray(value.sessionIds)||
      prepared?.state!=='PREPARED'||prepared.scopeDigest!==canonicalContinuityDigest(scope)||!Number.isSafeInteger(prepared.pid)||prepared.pid<=0||
      !Number.isSafeInteger(prepared.uid)||value.brokerPid!==prepared.pid||value.ownerAction!=='commit'||value.ownerReceipts?.commit)
      fail('erasure-owner-preflight-proof-invalid');
    try{process.kill(prepared.pid,0);fail('erasure-previous-broker-still-present');}catch(error){if(error.code!=='ESRCH')throw error;}
    const [c,s,m,info,sessions,active,permissions,mcp]=await Promise.all([http(controller,'/transport/status'),http(supervisor,'/status'),
      http(monitor,'/api/maintenance-identity'),native.info(true),native.listSessions(workspace),native.sessionStatus(workspace),
      native.permissions(workspace,{sessionIds:value.sessionIds}),native.mcp(value.sharedDirectory)]);
    const rows=[c,s,m];for(const [i,name] of ['controller','supervisor','monitor'].entries()){
      if(rows[i].version!==runtimeVersion||rows[i].pid!==await servicePid(name)||(rows[i].workspace||rows[i].identity?.workspace)!==workspace)fail('erasure-service-identity-changed');
    }
    const present=new Set(sessions.map(row=>row.id));
    if(info.pid!==value.nativeIdentity?.pid||info.version!==value.nativeIdentity?.version||
      value.sessionIds.some(id=>id!==value.retainedSessionId&&present.has(id)||active[id])||
      value.retainedSessionId&&!present.has(value.retainedSessionId)||permissions.some(row=>value.sessionIds.includes(row.sessionID))||
      await native.sharedMcpDirectory()!==value.sharedDirectory||!['failed','disabled'].includes(mcp['cgpt-validation']?.status))fail('erasure-native-cleanup-incomplete');
    const snapshot=readRuntimeJson(join(root,'controller-runs.json')).value,current=retiredRunScope(snapshot,{...scope,evidence:value.evidence});
    if(canonicalContinuityDigest(current.runBindings)!==canonicalContinuityDigest(scope.runBindings)||retiredJobDigest(root,scope.runIds)!==scope.jobContextDigest)fail('erasure-preparation-bindings-changed');
    const known=new Set([...scope.runIds,...scope.protectedRunIds]);if((snapshot.runs||[]).some(row=>!known.has(row.runId)))fail('erasure-protected-run-inventory-changed');
    const originalShared=new Set(scope.sharedIdentityIds||[]),targetIds=new Set(scope.ids.filter(id=>!['null','undefined'].includes(id)));
    if((current.sharedIdentityIds||[]).some(id=>targetIds.has(id)&&!originalShared.has(id)))fail('erasure-protected-identity-changed');
    const verifyArtifacts=dependencies.verifyBrokerArtifacts||((directory)=>{
      if(typeof directory!=='string'||!directory.startsWith('/')||realpathSync(directory)!==directory)fail('erasure-broker-source-invalid');
      const packageRoot=resolve(dirname(fileURLToPath(import.meta.url)),'../broker');
      for(const name of ['cgpt_approval_bridge_server.py','cgpt_approval_bridge_router.py','cgpt_approval_bridge_journal.py','cgpt_approval_bridge_atelier.py','cgpt_approval_bridge_reporting.py','cgpt_approval_bridge_owner_cleanup.mjs','cgpt_approval_bridge_owner_diagnostic.py','cgpt-approval-bridge-contract.json','cgpt-approval-bridge-change-erasure.mjs','cgpt-approval-bridge-continuity.mjs','cgpt-approval-bridge-state-layout.mjs','cgpt-approval-bridge-observation-statistics.mjs','cgpt-approval-bridge-permission-replies.mjs']){
        const source=join(directory,name),expected=join(packageRoot,name),a=lstatSync(source),b=lstatSync(expected);
        if(!a.isFile()||a.isSymbolicLink()||!b.isFile()||b.isSymbolicLink()||createHash('sha256').update(readFileSync(source)).digest('hex')!==createHash('sha256').update(readFileSync(expected)).digest('hex'))fail('erasure-broker-source-divergent');
      }
    });
    await verifyArtifacts(input.brokerDirectory);
    return {status:'OWNER_REBIND_PREFLIGHT_OK',transactionId:value.transactionId,runIds:scope.runIds,protectedRunCount:scope.protectedRunIds.length,
      previousBrokerPid:prepared.pid,ownerUid:prepared.uid,nativePid:info.pid,mcpStatus:mcp['cgpt-validation'].status,ownerOutcome:'UNVERIFIED',
      reconnectMayCommit:true,helperVersion:VERSION,runtimeVersion};
  }
  if(frozenOwnerProfile){
    if(value.brokerTransport!=='owner-local-v1'||value.scope?.closureAuthority!=='authoritative-retired-run-batch-v1'||
      !Array.isArray(value.scope.runIds)||value.scope.runIds.length!==1||!Array.isArray(value.scope.protectedRunIds)||!value.scope.protectedRunIds.length||
      !['FREEZING','STOPPING','APPLYING','RESTARTING','VERIFYING','CERTIFIED'].includes(value.phase))fail('erasure-runtime-compatibility-refused');
    if(!value.recoveryCompatibility?.ownerRebound){
      if(input.action!=='execute'||value.phase!=='FREEZING')fail('erasure-owner-rebind-proof-invalid');
      const prepared=value.ownerReceipts?.prepare;
      if(!Number.isSafeInteger(prepared?.pid)||prepared.pid<=0)fail('erasure-owner-rebind-proof-invalid');
      let oldPidAbsent=false;try{process.kill(prepared?.pid,0);}catch(error){if(error.code==='ESRCH')oldPidAbsent=true;else throw error;}
      const [status,info,sessions,active,permissions]=await Promise.all([http(controller,'/status'),native.info(true),
        native.listSessions(workspace),native.sessionStatus(workspace),native.permissions(workspace,{sessionIds:value.sessionIds})]);
      const rebind=verifyFrozenOwnerRebind(value,{status,nativeIdentity:{pid:info.pid,version:info.version},oldPidAbsent});
      const present=new Set(sessions.map(row=>row.id));
      if(value.sessionIds.some(id=>id!==value.retainedSessionId&&present.has(id)||active[id])||
        value.retainedSessionId&&!present.has(value.retainedSessionId)||permissions.some(row=>value.sessionIds.includes(row.sessionID))||
        value.sharedDirectory&&await native.sharedMcpDirectory()!==value.sharedDirectory)fail('erasure-native-cleanup-incomplete');
      const snapshot=readRuntimeJson(join(root,'controller-runs.json')).value;
      const current=retiredRunScope(snapshot,{...value.scope,evidence:value.evidence});
      if(canonicalContinuityDigest(current.runBindings)!==canonicalContinuityDigest(value.scope.runBindings)||
        retiredJobDigest(root,value.scope.runIds)!==value.scope.jobContextDigest)fail('erasure-preparation-bindings-changed');
      const known=new Set([...value.scope.runIds,...value.scope.protectedRunIds]);
      if((snapshot.runs||[]).some(row=>!known.has(row.runId)))fail('erasure-protected-run-inventory-changed');
      const originalShared=new Set(value.scope.sharedIdentityIds||[]),targetIds=new Set(value.scope.ids.filter(id=>!['null','undefined'].includes(id)));
      if((current.sharedIdentityIds||[]).some(id=>targetIds.has(id)&&!originalShared.has(id)))fail('erasure-protected-identity-changed');
      value={...value,brokerPid:rebind.brokerPid,recoveryCompatibility:{profile:'frozen-owner-sentinel-v1',helperVersion:VERSION,runtimeVersion,brokerVersion:VERSION,ownerRebound:rebind}};
      tx.save(value);
    } else if(value.recoveryCompatibility.profile!=='frozen-owner-sentinel-v1'||value.recoveryCompatibility.helperVersion!==VERSION||
      value.recoveryCompatibility.runtimeVersion!==runtimeVersion||value.recoveryCompatibility.brokerVersion!==VERSION||
      value.brokerPid!==value.recoveryCompatibility.ownerRebound.brokerPid)fail('erasure-runtime-compatibility-refused');
  } else if(runtimeVersion!==VERSION){
    if(value.protocol!=='cab-change-erasure-v1'||!['SEALED','FREEZING','STOPPING','APPLYING','RESTARTING','VERIFYING','CERTIFIED'].includes(value.phase))fail('erasure-runtime-compatibility-refused');
    value={...value,recoveryCompatibility:{helperVersion:VERSION,runtimeVersion}};
    if(input.action!=='recover-preparation')tx.save(value);
  }
  if(input.action==='reconcile-retention'){
    const request=input.request||readRuntimeJson(input.input).value;
    const next=reconcileRetiredRetention(value,request),info=await native.info(true);
    if(info.pid!==value.nativeIdentity.pid){
      if(request.authorizedNativeRestart!==true||info.version!==value.nativeIdentity.version)fail('erasure-native-identity-changed');
      try{process.kill(value.nativeIdentity.pid,0);fail('erasure-previous-native-still-present')}catch(error){if(error.code!=='ESRCH')throw error}
      const sessions=await native.listSessions(workspace),present=new Set(sessions.map(row=>row.id)),registry=readRuntimeJson(join(root,'controller-runs.json')).value;
      if(value.sessionIds.some(id=>present.has(id))||registry.runs.some(row=>value.scope.protectedRunIds.includes(row.runId)&&row.state==='RESERVED'&&!present.has(row.sessionId)))fail('erasure-native-restart-boundary-divergent');
      const after=await native.info(true);if(after.pid!==info.pid||after.version!==info.version)fail('erasure-native-identity-changed');
      next.previousNativeIdentities=[...(value.previousNativeIdentities||[]),value.nativeIdentity];
      next.nativeIdentity={...value.nativeIdentity,pid:info.pid,sessionIdsDigest:canonicalContinuityDigest([...present].sort())};
    }else if(info.version!==value.nativeIdentity.version)fail('erasure-native-identity-changed');
    if(retiredJobDigest(root,value.scope.runIds)!==value.scope.jobContextDigest)fail('erasure-retired-jobs-changed');
    tx.save(next);return {status:'RETAINED_SHARED_IDENTITIES_REBOUND',transactionId:value.transactionId,phase:next.phase,retained:request.sharedIdentityIds.length};
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
    if([c,s,m].some(view=>erasureReferences(view,workScope(value)).length)||value.sessionIds.some(id=>active[id])||
      value.sessionIds.some(id=>id!==value.retainedSessionId&&present.has(id))||value.retainedSessionId&&!present.has(value.retainedSessionId)||
      permissions.some(row=>value.sessionIds.includes(row.sessionID))||info.pid!==value.nativeIdentity.pid||info.version!==value.nativeIdentity.version)
      fail('erasure-final-boundary-changed');
    if(!absent(value,[tx.path,join(root,'broker-erasure.json')]))fail('erasure-absence-unverified');
    if(value.brokerTransport==='owner-local-v1')await ownerCall('finalize');
    if(existsSync(join(root,'broker-erasure.json')))unlinkSync(join(root,'broker-erasure.json'));
    return tx.finish(value,()=>absent(value,[tx.path]));
  }
  if(!['execute','recover-preparation'].includes(input.action))fail('erasure-action-invalid');
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
  if(input.action==='recover-preparation'){
    if(value.phase!=='STOPPING'||value.entries?.length||value.expectedPeers)fail('erasure-preparation-recovery-refused');
    await checkNative();
    const snapshot=readRuntimeJson(join(root,'controller-runs.json')).value;
    const current=value.scope.closureAuthority==='authoritative-retired-run-batch-v1'?retiredRunScope(snapshot,{...value.scope,evidence:value.evidence}):
      erasureScope(snapshot,value.scope.changeId,value.scope.ownerId,{closedAuthority:true,...(value.scope.ownershipReview?{ownershipReview:value.scope.ownershipReview}:{})});
    if(value.scope.closureAuthority==='authoritative-retired-run-batch-v1'&&retiredJobDigest(root,value.scope.runIds)!==value.scope.jobContextDigest)fail('erasure-retired-jobs-changed');
    if(canonicalContinuityDigest(current.runIds)!==canonicalContinuityDigest(value.scope.runIds)||
      value.scope.runBindings&&canonicalContinuityDigest(current.runBindings)!==canonicalContinuityDigest(value.scope.runBindings))fail('erasure-preparation-bindings-changed');
    await start();await checkNative();
    const [c,s,m,status,live]=await Promise.all([http(controller,'/transport/status'),http(supervisor,'/status'),http(monitor,'/api/maintenance-identity'),http(controller,'/cleanup/status',{}),http(controller,'/status')]);
    const pids={};
    for(const [i,name] of ['controller','supervisor','monitor'].entries()){
      const row=[c,s,m][i],pid=await servicePid(name);
      if(!pid||row.pid!==pid||row.version!==runtimeVersion||(row.workspace||row.identity?.workspace)!==workspace)fail('erasure-service-identity-changed');pids[name]=pid;
    }
    if(!Number.isSafeInteger(status.brokerPid)||status.brokerPid<=0||live.brokerReadiness?.server_version!==runtimeVersion||live.brokerReadiness?.ready!==true)fail('erasure-broker-identity-unverified');
    const recovery={at:Date.now(),previousPids:value.componentPids||{},verifiedPids:pids};
    value={...value,componentPids:pids,brokerPid:status.brokerPid,preparationRecovery:recovery};tx.save(value);
    return {status:'PRESERVED_PREPARATION_REBOUND',transactionId:value.transactionId,phase:value.phase,helperVersion:VERSION,runtimeVersion,pids};
  }
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
      if(value.scope.closureAuthority==='authoritative-retired-run-batch-v1'){
        const retained=[];
        for(const changeId of value.scope.changeIds){
          if(value.scope.sharedIdentityIds.includes(changeId))continue;
          let paths,branch='TERMINÉ';
          try{paths=changeReports(workspace,changeId,branch)}catch(error){
            if(error.code!=='archive-statistics-required'&&error.code!=='ENOENT')throw error;
            branch='BLOQUÉ';try{paths=changeReports(workspace,changeId,branch)}catch(error){if(error.code!=='archive-statistics-required'&&error.code!=='ENOENT')throw error;continue}
          }
          const runIds=[...new Set(value.scope.runBindings.filter(row=>row.changeId===changeId).map(row=>row.runId))].sort();
          const record=archive.retain({...value.scope,changeId,runIds},{reportPaths:paths,closed:true,branch});
          retained.push({changeId,archiveId:record.archiveId,fingerprint:record.fingerprint});
        }
        value={...value,retainedArchive:{mode:'retired-runs-v1',reports:retained}};tx.save(value);
      }else{
        const retained=archive.retain(value.scope,{reportPaths:changeReports(workspace,value.scope.changeId,value.branch),closed:true,branch:value.branch});
        value={...value,retainedArchive:{archiveId:retained.archiveId,fingerprint:retained.fingerprint}};tx.save(value);
      }
    }
    if(!value.cutoverStartedAt){value={...value,cutoverStartedAt:Date.now()};tx.save(value)}
    if(value.brokerTransport==='owner-local-v1'&&!frozenOwnerProfile)await ownerCall('commit');
    if(value.brokerTransport==='owner-local-v1'){
      const status=await http(controller,'/transport/status');
      if(status.transportContinuity?.receipt?.state==='PREPARED'&&status.transportContinuity.receipt.transactionId===value.transportTransactionId)
        await http(controller,'/transport/cancel',{transactionId:value.transportTransactionId});
    }
    await http(controller,'/transport/prepare',{transactionId:value.transportTransactionId});
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
    const ownerScope=value.ownerReceipts?.commit?.effectiveScope;
    if(ownerScope&&(ownerScope.workspace!==value.scope.workspace||ownerScope.changeId!==value.scope.changeId||
      canonicalContinuityDigest(ownerScope.runIds)!==canonicalContinuityDigest(value.scope.runIds)||!Array.isArray(ownerScope.ids)||
      ownerScope.ids.some(id=>typeof id!=='string'||id.length>256)||value.scope.ids.some(id=>!ownerScope.ids.includes(id)&&!(value.scope.closureAuthority==='authoritative-retired-run-batch-v1'&&value.scope.sharedIdentityIds.includes(id)))))fail('erasure-owner-effective-scope-divergent');
    const projectionScope=ownerScope?{...value.scope,ids:[...new Set([...value.scope.ids,...ownerScope.ids])].sort(),
      ...(value.scope.closureAuthority==='authoritative-retired-run-batch-v1'?{ownerBaseIds:value.scope.ids}:{})}:value.scope;
    const bundle=value.brokerTransport==='owner-local-v1'?{transactionId:value.transactionId,brokerPid:value.brokerPid,scope:projectionScope,roots:[],entries:[],journalPaths:[]}:tx.verify(readRuntimeJson(bundlePath).value);
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
    value=tx.stageCandidates({...value,effectiveScope:plan.scope,roots,legacyRoots,sourceArtifactRoots,entries,journalPaths:bundle.journalPaths,expectedPeers,phase:'APPLYING'},
      join(dependencies.updateRoot,'erasure-candidates',value.transactionId));tx.save(value);
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
    if(value.scope.closureAuthority==='authoritative-retired-run-batch-v1'){
      const seen=new Set();for(const row of value.scope.runBindings){const key=row.runId+'\0'+row.changeId;if(seen.has(key))continue;seen.add(key);cleanTestArea(workspace,row.changeId,row.runId,{closed:true,reportsDurable:true});}
    }else for(const runId of value.scope.runIds)cleanTestArea(workspace,value.scope.changeId,runId,{closed:true,reportsDurable:true});
    if(!value.sgsReceipt) {
      const sgsReceipt=await statisticalCleanup.purge(workScope(value),value.branch,value.transactionId);
      value={...value,sgsReceipt};tx.save(value);
    }
    const observed=readRuntimeJson(join(root,'controller-runs.json')).value;
    if(canonicalContinuityDigest(observed)!==canonicalContinuityDigest(value.expectedPeers))fail('erasure-peer-preservation-failed');
    if(!absent(value,excluded))
      fail('erasure-durable-absence-unverified');
    const {expectedPeers,...compacted}=value;
    value={...compacted,entries:[],expectedPeersDigest:canonicalContinuityDigest(expectedPeers),phase:'RESTARTING'};tx.save(value);
  }
  if(value.phase==='RESTARTING') {
    if(await servicePid('controller')===0){
      await checkNative();
      const path=join(root,'transport-handoff.json'),stored=readRuntimeJson(path),info=await native.info(true);
      const renewed=renewErasureHandoff(stored.value,{workspace,transactionId:value.transportTransactionId,
        nativeIdentity:{pid:info.pid,version:info.version,directory:value.sharedDirectory},registrySnapshot:readRuntimeJson(join(root,'controller-runs.json')).value});
      writeRuntimeJson(path,renewed);value={...value,handoffRenewedAt:Date.now()};tx.save(value);
    }
    tx.clearCandidates(value);
    await checkNative();await start();
    value={...value,phase:'VERIFYING'};tx.save(value);
  }
  if(value.phase==='VERIFYING') {
    await checkNative();
    await wait(async()=>{
      const [c,s,m]=await Promise.all([http(controller,'/status'),http(supervisor,'/status'),http(monitor,'/api/snapshot')]);
      if(c.version!==runtimeVersion||s.version!==runtimeVersion||m.version!==runtimeVersion||c.brokerReadiness?.server_version!==(frozenOwnerProfile?VERSION:runtimeVersion)||
        c.brokerReadiness?.ready!==true||erasureReferences(c,workScope(value)).length||erasureReferences(s,workScope(value)).length||erasureReferences(m,workScope(value)).length)return false;
      return true;
    });
    if(value.brokerTransport==='owner-local-v1')await ownerCall('verify');
    await statisticalCleanup.verify(workScope(value));
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
      '--controller-url':'controllerUrl','--supervisor-url':'supervisorUrl','--monitor-url':'monitorUrl','--opencode-url':'opencodeUrl','--runtime-version':'runtimeVersion','--broker-directory':'brokerDirectory'}[args[i]];
      if(!key||!args[i+1]||input[key]!==undefined)fail('erasure-cli-invalid');input[key]=args[i+1]}
    if(!input.workspace)fail('erasure-workspace-required');
    console.log(JSON.stringify(await cleanupChange(input)));
  }catch(cause){console.error(JSON.stringify({status:'INCOMPLETE',error:typeof cause.code==='string'?cause.code:'erasure-failed'}));process.exitCode=1}
}
