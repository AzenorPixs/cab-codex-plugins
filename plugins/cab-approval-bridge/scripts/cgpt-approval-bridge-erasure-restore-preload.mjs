/** Récupération contrôleur5 : mêmes protections, dépendances OpenSpec corrigées. */
import {readFileSync,realpathSync} from 'node:fs';import {dirname,join} from 'node:path';import {pathToFileURL} from 'node:url';
import {ErasureTransaction} from './cgpt-approval-bridge-change-erasure.mjs';
import {canonicalContinuityDigest} from './cgpt-approval-bridge-continuity.mjs';
import {verifyDependencies} from './cgpt-approval-bridge-dependency-authority.mjs';
export const VERSION='2.4.33';
const fail=code=>{throw Object.assign(new Error(code),{code})};
const receiptPath=process.env.CAB_ERASURE_RESTORE_RECEIPT,transactionId=process.env.CAB_ERASURE_RESTORE_TRANSACTION;
if(!receiptPath||!transactionId)fail('erasure-restore-authorization-required');
const tx=new ErasureTransaction(dirname(receiptPath),{createKey:false}),v=tx.load();
if(tx.path!==receiptPath||v?.transactionId!==transactionId||v.phase!=='RESTARTING'||v.ownerReceipts?.commit?.state!=='APPLIED'||!v.sgsReceipt)fail('erasure-restore-boundary-invalid');
const snapshot=JSON.parse(readFileSync(join(dirname(receiptPath),'controller-runs.json'),'utf8'));
if(canonicalContinuityDigest(snapshot)!==v.expectedPeersDigest||snapshot.project!==v.scope.workspace||snapshot.runs.some(row=>!v.scope.protectedRunIds.includes(row.runId))||snapshot.runs.length!==v.scope.protectedRunIds.length)fail('erasure-restore-registry-divergent');
const entry=realpathSync(process.argv[1]),base=await import(pathToFileURL(join(dirname(entry),'cgpt-approval-bridge-runs.mjs'))),resource=await import(pathToFileURL(join(dirname(entry),'cgpt-approval-bridge-resource-coordination.mjs')));
if(base.VERSION!=='2.4.5'||resource.VERSION!=='2.4.5')fail('erasure-restore-runtime-incompatible');
for(const Class of [base.RunRegistry,resource.ResourceRunRegistry]){
 const original=Class.prototype.checkConflicts;
 Class.prototype.checkConflicts=function(candidate,...args){
  if(this.directory!==v.scope.workspace)fail('erasure-restore-workspace-divergent');
  try{verifyDependencies(this.directory,candidate.dependsOn);}catch(error){throw new base.CoordinationError(error.code||'dependency-openspec-unavailable');}
  return original.call(this,{...candidate,dependsOn:[]},...args);
 };
}
process.stderr.write(JSON.stringify({event:'erasure-openspec-recovery-loaded',helperVersion:VERSION,runtimeVersion:base.VERSION,transactionId,pid:process.pid,registryDigest:v.expectedPeersDigest})+'\n');
