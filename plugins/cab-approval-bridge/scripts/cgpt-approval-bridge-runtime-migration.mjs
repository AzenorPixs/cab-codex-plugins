import {createHash} from 'node:crypto';
export const VERSION='2.4.3';
export const RUNTIME_MIGRATION_PROTOCOL='cab-private-state-migration-v1';
const fail=code=>{throw Object.assign(new Error(code),{code});};
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function migrationApprovalIdentity(approval) {
 return Object.fromEntries(['run_id','reservation_version','requestId','approval_id','change_id','session_id','directory',
  'title','summary','files','commands','resources','coordination_protocol','operation_id','operation_digest','expected_revisions','access_id',
  ...(approval.shell_background===true?['shell_background','tool_input_sha256']:[])]
  .map(key=>[key,approval[key]??(['resources','commands'].includes(key)?[]:key==='summary'?'':null)]));
}
export function migrationRegistryDigest(snapshot) {
 const value=structuredClone(snapshot);delete value.version;
 for(const entry of Object.values(value.coordination?.testReservations||{}))delete entry.token;
 // API and disk may serialize object keys in different orders.
 const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
 return digest(canonical(value));
}
export function migrationPendingValidations(snapshot,status,messages) {
 if(snapshot.schemaVersion!==4||snapshot.coordinationProtocol!=='resource-scoped-v1'||status.mode!=='concurrent')fail('update-migration-source-incompatible');
 const pending=[];
 for(const [runId,context] of Object.entries(status.runs||{})) {
  const run=snapshot.runs.find(r=>r.runId===runId);
  for(const item of context.activeValidations||[]) {
   if(!run||run.state!=='RESERVED'||!context.job?.jobId)fail('update-migration-pending-owner-invalid');
   const candidates=[];
   for(const message of messages.get(run.sessionId)||[])for(const part of message.parts||[]) {
    if(part.type!=='tool')continue;
    const raw=part.state?.metadata?.toolCalls||[];
    for(const call of raw)if(call.input?.requestId===item.requestId&&
      ['request_validation','cgpt-validation_request_validation','cgpt-validation.request_validation'].includes(call.tool||call.name))candidates.push(call.input);
    if(part.state?.input?.requestId===item.requestId&&/request_validation$/.test(part.tool||''))candidates.push(part.state.input);
   }
   const owner=snapshot.requestOwners?.[item.requestId];
   const matches=candidates.filter(a=>owner?.runId===runId&&owner.digest===digest(migrationApprovalIdentity(a)));
   if(!matches.length||matches.some(a=>digest(a)!==digest(matches[0])))fail('update-migration-pending-native-unavailable');
   const approval=matches[0],op=snapshot.coordination?.operations?.[approval.operation_id];
   const operationIdentity=createHash('sha256').update(JSON.stringify(Object.fromEntries(['run_id','reservation_version','requestId','approval_id',
    'change_id','session_id','directory','title','summary','files','commands','resources','operation_id','operation_digest',
    'expected_revisions','access_id','coordination_protocol',...(Object.hasOwn(approval,'tool_input_sha256')?['tool_input_sha256']:[]),
    ...(Object.hasOwn(approval,'shell_background')?['shell_background']:[])].map(key=>[key,approval[key]??null])),(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item)).digest('hex');
   if(approval.run_id!==runId||approval.reservation_version!==run.version||approval.session_id!==run.sessionId||
      approval.change_id!==run.changeId||approval.directory!==snapshot.project||!op||op.state!=='PREPARED'||op.decision||op.native||op.nativeResult||
      op.requestId!==item.requestId||op.contextId!==run.contextId||op.version!==run.version||op.sessionId!==run.sessionId||
      op.operationDigest!==approval.operation_digest||op.identityDigest!==operationIdentity)fail('update-migration-pending-divergent');
   pending.push({runId,contextId:run.contextId,version:run.version,jobId:context.job.jobId,approval:structuredClone(approval)});
  }
 }
 return pending;
}
export function validateRuntimeMigration(proof,{workspace,registry,nativeIdentity}) {
 if(!proof||proof.protocol!==RUNTIME_MIGRATION_PROTOCOL||proof.workspace!==workspace||
    !/^update-[a-f0-9-]{36}$/.test(proof.transactionId||'')||!['PREPARED','ACTIVE'].includes(proof.phase)||
    !Array.isArray(proof.pending)||proof.pending.length>100||digest(proof.nativeIdentity)!==digest(nativeIdentity))fail('runtime-migration-proof-invalid');
 if(proof.phase==='PREPARED'&&migrationRegistryDigest(registry)!==proof.registryDigest)fail('runtime-migration-registry-divergent');
 return proof;
}
