/** Réparation additive sous preuves d’origine ; aucun effet métier émis. */
import {createHash} from 'node:crypto';
import {canonicalContinuityDigest} from './cgpt-approval-bridge-continuity.mjs';
export const VERSION='2.4.28';
const fail=code=>{throw Object.assign(new Error(code),{code})};
const ordered=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export const originalRecordDigest=value=>createHash('sha256').update(ordered(value).replace(/[^\x00-\x7f]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'))).digest('hex');
export function planProtectedRepair(snapshot,baseline,copies){
 if(!Array.isArray(baseline?.protectedRunIds)||!snapshot.coordination||snapshot.runs.length!==baseline.protectedRunIds.length||snapshot.runs.some(r=>!baseline.protectedRunIds.includes(r.runId)))fail('preservation-repair-run-scope-invalid');
 const next=structuredClone(snapshot),counts={operations:0,accesses:0};
 for(const kind of ['operations','accesses'])for(const [key,row]of Object.entries(copies[kind]||{})){
  if(!row||!baseline.protectedRunIds.includes(row.runId)||!baseline[kind]?.[key]||originalRecordDigest(row)!==baseline[kind][key])fail('preservation-repair-original-mismatch');
  if(kind==='operations'&&(row.operationId!==key||!['PREPARED','COMPLETED','CANCELLED','NO_EFFECT','RECONCILED'].includes(row.state)))fail('preservation-repair-effect-unqualified');
  if(kind==='accesses'&&(row.accessId!==key||!['RELEASED','CANCELLED'].includes(row.state)||row.token))fail('preservation-repair-active-access-refused');
  const current=next.coordination[kind][key];
  if(current){if(originalRecordDigest(current)!==baseline[kind][key])fail('preservation-repair-current-entry-divergent');continue;}
  next.coordination[kind][key]=structuredClone(row);counts[kind]++;
 }
 return {next,counts,beforeDigest:canonicalContinuityDigest(snapshot),afterDigest:canonicalContinuityDigest(next)};
}
export function planResolvedIntegrityRelease(snapshot,{transactionId,generation,authorization,evidence,observations},at=Date.now()){
 const g=snapshot.coordination.global;
 if(!g||g.transactionId!==transactionId||g.generation!==generation||g.state!=='DRAINING'||g.cause!=='GLOBAL_RECONCILIATION'||g.authorization!=='technical-integrity-protection'||!authorization||!Array.isArray(evidence)||!evidence.length||observations?.length!==2)fail('integrity-release-boundary-invalid');
 const [a,b]=observations;
 for(const p of observations)if(p.project!==snapshot.project||p.brokerReady!==true||p.brokerCause!=='NONE'||!p.brokerInstance||!Number.isSafeInteger(p.nativePid)||p.nativePid<=0||p.activeNative!==0||p.pendingPermissions!==0||!Number.isFinite(p.brokerAt)||at-p.brokerAt<0||at-p.brokerAt>45000||!Number.isFinite(p.at)||at-p.at<0||at-p.at>45000||p.registryDigest!==canonicalContinuityDigest(snapshot))fail('integrity-release-evidence-invalid');
 if(a.nativePid!==b.nativePid||a.nativeVersion!==b.nativeVersion||a.brokerInstance!==b.brokerInstance||a.at>b.at)fail('integrity-release-native-boundary-changed');
 const next=structuredClone(snapshot);next.coordination.global={...g,state:'RELEASED',finishedAt:new Date(at).toISOString(),resolvedWithoutAcquire:true,releaseDigest:canonicalContinuityDigest({transactionId,generation,authorization,evidence,observations})};
 return {next,transactionId,generation,resourceProtectionsUnchanged:true};
}
