import {sourceRevision,mandateDigest} from './cgpt-approval-bridge-autonomous-mandate.mjs';
import {resolve,isAbsolute} from 'node:path';
export const VERSION='2.7.0';
export const EXTERNAL_PROTOCOL='cab-external-exec-v1';
const id=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.-]{0,199}$/.test(v)&&!['constructor','__proto__','prototype'].includes(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const terminal=v=>['COMPLETED','TIMED_OUT','OUTPUT_LIMIT','FAILED_TO_START'].includes(v);
const fail=(code,status=409)=>{throw Object.assign(new Error(code),{code,status});};
export const externalPending=(run,key)=>Object.values(run?.externalCalls||{}).some(call=>!terminal(call.state)&&(!key||call.resourceKey===key));
function profile(value) {
 const keys=['id','kind','resource_key','host_key','user_key','password_key','container','connection_fingerprint','port_key','known_hosts'];
 if(!value||typeof value!=='object'||Object.keys(value).some(k=>!keys.includes(k))||!id(value.id)||value.kind!=='ssh'||
    !/^(lxc|docker):[a-z0-9][a-z0-9_.-]*(\/[a-z0-9][a-z0-9_.-]*)?$/.test(value.resource_key||'')||
    value.container!==value.resource_key.split(':')[0]||!hash(value.connection_fingerprint))fail('external-profile-invalid');
 for(const [key,suffix] of [['host_key','(HOST|IP|ADDRESS)'],['user_key','USER'],['password_key','(PASSWORD|PASS)'],['port_key','PORT']])
  if((key!=='port_key'||value[key]!==undefined)&&!new RegExp('^[A-Z][A-Z0-9_]{0,90}_'+suffix+'$').test(value[key]||''))fail('external-profile-key-invalid');
 if(value.known_hosts!==undefined&&(typeof value.known_hosts!=='string'||!isAbsolute(value.known_hosts)))fail('external-profile-invalid');
 return structuredClone(value);
}
export class ExternalExecution {
 constructor({registry,contexts}){Object.assign(this,{registry,contexts});}
 run(runId,args,{read=false}={}) {
  this.registry.admission(runId);const run=this.registry.runs.get(runId),job=this.contexts.get(runId)?.publicJob();
  if(this.contexts.get(runId)?.transportIsPaused?.()||!run||run.state!=='RESERVED'||!job?.armed||job.sessionId!==run.sessionId||job.currentCabMandate||job.recovery||
    args.session_id!==run.sessionId||args.reservation_version!==run.version||args.change_id!==run.changeId||args.directory!==run.directory||!id(args.request_id))fail('external-run-divergent');
  if(!read&&(!run.autonomy||run.autonomy.state!=='WORKING'||run.autonomy.reservationVersion!==run.version))fail('external-mandate-not-working');
  return run;
 }
 lease(run,key,{optional=false}={}) {
  const entry=Object.values(this.registry.resourceState.testReservations||{}).find(e=>e.runId===run.runId&&e.contextId===run.contextId&&e.version===run.version&&
    e.state==='HELD'&&!this.registry.restoredTests.has(e.transactionId)&&e.resources.some(r=>r.key===key&&r.mode==='write'));
  if(!entry&&!optional)fail('external-test-lease-required');return entry;
 }
 register(runId,payload,{initial=false}={}) {
  this.registry.admission(runId);const run=this.registry.owned(runId,payload.version),job=this.contexts.get(runId)?.publicJob();
  if(!job?.armed||job.sessionId!==run.sessionId||!run.autonomy||run.autonomy.state!=='WORKING')fail('external-adapter-not-ready');
  if(!initial) {
   const exception=run.autonomy.exceptions.find(e=>e.request_id===payload.exceptionId);
   if(!exception||!['missing-tool','outside-framing'].includes(exception.category)||exception.decision?.decision!=='approved')fail('external-approved-exception-required');
  }
  const adapter=profile(payload.profile);if(externalPending(run,adapter.resource_key))fail('external-resource-busy',423);this.registry.scope(runId,run.version,[{key:adapter.resource_key,mode:'write'}]);this.lease(run,adapter.resource_key);
  run.externalAdapters||={};const prior=run.externalAdapters[adapter.id],fingerprint=mandateDigest(adapter);
  if(prior&&prior.profileDigest!==fingerprint)fail('external-adapter-conflict');
  if(!prior)run.externalAdapters[adapter.id]={profile:adapter,profileDigest:fingerprint,contextId:run.contextId,sessionId:run.sessionId,
    reservationVersion:run.version,exceptionId:payload.exceptionId||null,targetFingerprint:null};
  Object.assign(run.externalAdapters[adapter.id],{contextId:run.contextId,sessionId:run.sessionId,reservationVersion:run.version});
  this.registry.persist();return {status:'ADAPTER_READY',adapterId:adapter.id,resourceKey:adapter.resource_key,profileDigest:fingerprint};
 }
 authorize(method,args) {
  const run=this.run(args.run_id,args,{read:method!=='external_execute'});
  if(method==='external_describe') {
   const draft=args.profile;if(!draft||draft.kind!=='ssh'||!id(draft.id))fail('external-profile-invalid');
   this.registry.scope(run.runId,run.version,[{key:draft.resource_key,mode:'write'}]);this.lease(run,draft.resource_key);
   return {status:'AUTHORIZED_EXTERNAL_DESCRIBE'};
  }
  const adapter=run.externalAdapters?.[args.adapter_id];
  if(!adapter||adapter.contextId!==run.contextId||adapter.sessionId!==run.sessionId||adapter.reservationVersion!==run.version)fail('external-adapter-required');
  run.externalCalls||={};let call=run.externalCalls[args.request_id];const status=method==='external_status';
  if(status&&!call)fail('external-request-not-found');
  if(!status) {
   if(!Array.isArray(args.argv)||!args.argv.length||args.argv.some(v=>typeof v!=='string'||v.includes('\0'))||
     args.timeout_ms!==undefined&&(!Number.isSafeInteger(args.timeout_ms)||args.timeout_ms<1||args.timeout_ms>2147483647)||
     !['test','cleanup','verify-cleanup'].includes(args.phase||'test'))fail('external-command-invalid');
   const inputDigest=mandateDigest(args);
   if(call&&call.inputDigest!==inputDigest)fail('external-request-conflict');
   if(!call) {
    if(run.autonomy.calls[args.request_id]||this.registry.requestOwners[args.request_id])fail('external-request-conflict');
    if(Object.values(run.externalCalls).some(c=>!terminal(c.state)&&c.resourceKey===adapter.profile.resource_key))fail('external-resource-busy',423);
    const lease=this.lease(run,adapter.profile.resource_key);
    if(!Array.isArray(args.files||[])||(args.files||[]).length>128)fail('external-artifacts-invalid');
    for(const f of args.files||[]) {
     if(!f||typeof f.path!=='string'||isAbsolute(f.path)||f.path.split('/').includes('..'))fail('external-artifacts-invalid');
     this.registry.scope(run.runId,run.version,[{key:'file:'+f.path,mode:'read'}]);
    }
    call={requestId:args.request_id,inputDigest,adapterId:args.adapter_id,resourceKey:adapter.profile.resource_key,
      contextId:run.contextId,version:run.version,sessionId:run.sessionId,state:'INTENT',phase:args.phase||'test',
      leaseId:lease.transactionId,fencing:lease.fencing,sourceRevision:sourceRevision(run.directory,run.autonomy.paths),
      order:++this.registry.resourceState.sequence,profile:adapter.profile,executionIssued:false};
    run.externalCalls[args.request_id]=call;this.registry.persist();
   }
  }
  if(call.adapterId!==args.adapter_id||call.sessionId!==run.sessionId)fail('external-request-divergent');
  const lease=this.lease(run,call.resourceKey,{optional:true});
  const allowed=!!lease&&lease.transactionId===call.leaseId&&lease.fencing===call.fencing;
  if(!status&&!allowed)fail('external-test-lease-required');
  const executionKnown=call.executionIssued; if(!status&&!call.executionIssued){call.executionIssued=true;this.registry.persist();}
  const roots=[...run.resources.filter(r=>r.key.startsWith('file:')).map(r=>resolve(run.directory,r.key.slice(5))),...run.autonomy.paths.map(p=>resolve(run.directory,p))];
  return {status:'AUTHORIZED_EXTERNAL',request_id:args.request_id,adapter:call.profile,input_digest:call.inputDigest,
    source_revision:call.sourceRevision,lease_id:call.leaseId,fencing:call.fencing,read_roots:roots,
    target_fingerprint:adapter.targetFingerprint,remote_allowed:allowed,execution_known:executionKnown};
 }
 finish(packet) {
  const run=this.registry.runs.get(packet.run_id),call=run?.externalCalls?.[packet.request_id],receipt=packet.receipt;
  if(!run||!call||run.sessionId!==packet.session_id||call.sessionId!==run.sessionId||call.contextId!==run.contextId||
    !receipt||receipt.requestId!==call.requestId||receipt.input_digest!==call.inputDigest||receipt.leaseId!==call.leaseId||receipt.fencing!==call.fencing||
    !['INTENT','RUNNING','UNKNOWN','COMPLETED','TIMED_OUT','OUTPUT_LIMIT','FAILED_TO_START'].includes(receipt.status)||
    mandateDigest(receipt)!==packet.receipt_digest)fail('external-receipt-invalid');
  if(terminal(call.state)) {
   if(call.receiptDigest!==packet.receipt_digest)fail('external-terminal-conflict');return {status:'RECORDED',requestId:call.requestId};
  }
  const adapter=run.externalAdapters[call.adapterId];
  if(receipt.target_fingerprint) {
   if(!hash(receipt.target_fingerprint)||adapter.targetFingerprint&&adapter.targetFingerprint!==receipt.target_fingerprint)fail('external-target-divergent');
   adapter.targetFingerprint=receipt.target_fingerprint;
  }
  if(terminal(receipt.status)) {
   const lease=this.lease(run,call.resourceKey);
   if(lease.transactionId!==call.leaseId||lease.fencing!==call.fencing)fail('external-lease-divergent');
   if(receipt.status==='COMPLETED'&&!Number.isInteger(receipt.exitCode))fail('external-exit-invalid');
   run.autonomy.calls[call.requestId]={inputDigest:call.inputDigest,state:receipt.status==='OUTPUT_LIMIT'?'TIMED_OUT':receipt.status,
    receiptDigest:packet.receipt_digest,exitCode:receipt.exitCode,sourceRevision:call.sourceRevision,external:true};
   call.finishedOrder=++this.registry.resourceState.sequence;
  }
  call.state=receipt.status;call.receiptDigest=packet.receipt_digest;call.exitCode=receipt.exitCode;
  call.dispatched=receipt.dispatched===true;this.registry.persist();return {status:'RECORDED',requestId:call.requestId};
 }
 release(args) {
  const run=this.run(args.run_id,args),payloadDigest=mandateDigest(args);run.externalReleases||={};
  const prior=run.externalReleases[args.request_id];if(prior){if(prior.inputDigest!==payloadDigest)fail('external-release-conflict');return prior.receipt;}
  const pairs=args.proofs||[{cleanup_request_id:args.cleanup_request_id,verification_request_id:args.verification_request_id}];
  if(!Array.isArray(pairs)||!pairs.length||pairs.length>8)fail('external-cleanup-proof-required');
  let lease;const keys=[],digests=[];
  for(const pair of pairs) {
   const clean=run.externalCalls?.[pair.cleanup_request_id],verify=run.externalCalls?.[pair.verification_request_id];
   if(!clean||!verify||clean.phase!=='cleanup'||verify.phase!=='verify-cleanup'||clean.state!=='COMPLETED'||verify.state!=='COMPLETED'||
    clean.exitCode!==0||verify.exitCode!==0||clean.leaseId!==verify.leaseId||clean.resourceKey!==verify.resourceKey||
    clean.finishedOrder>=verify.order||externalPending(run,clean.resourceKey))fail('external-cleanup-proof-required');
   const current=this.lease(run,clean.resourceKey);
   if(current.transactionId!==clean.leaseId||current.fencing!==clean.fencing||lease&&lease.transactionId!==current.transactionId)fail('external-lease-divergent');
   lease=current;keys.push(clean.resourceKey);digests.push(clean.receiptDigest,verify.receiptDigest);
  }
  if(new Set(keys).size!==keys.length||lease.resources.some(r=>!keys.includes(r.key)))fail('external-complete-bank-cleanup-required');
  const released=this.registry.releaseExternalTests(run.runId,lease.transactionId,{digest:mandateDigest(digests),resources:keys});
  const receipt={status:'RELEASED',transactionId:released.transactionId,resources:released.resources,fencing:released.fencing,proofDigest:released.proofDigest};
  run.externalReleases[args.request_id]={inputDigest:payloadDigest,receipt};this.registry.persist();return receipt;
 }
}
