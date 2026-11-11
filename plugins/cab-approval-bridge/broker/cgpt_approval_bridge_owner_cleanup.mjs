import {readFileSync,existsSync,unlinkSync,lstatSync} from 'node:fs';
import {homedir} from 'node:os';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {ErasureTransaction,erasureFilePlan,erasureReferences,removeErasureDirectories,readErasureBytes,retentionOnlyRebind,diagnoseErasureFilePlan} from './cgpt-approval-bridge-change-erasure.mjs';
import {ensurePrivateStateDirectory} from './cgpt-approval-bridge-state-layout.mjs';
import {canonicalContinuityDigest} from './cgpt-approval-bridge-continuity.mjs';
export const VERSION='2.7.1';
const fail=code=>{throw Object.assign(new Error(code),{code})};
export function ownerCleanup(input,{home=homedir()}={}) {
 const {action,scope,transactionId}=input;
 if(!['prepare','commit','status','verify','finalize','diagnose'].includes(action)||!/^erasure-[a-f0-9-]{36}$/.test(transactionId||'')||
   !scope||!Array.isArray(scope.ids)||!Array.isArray(scope.runIds)||!scope.runIds.length||typeof scope.workspace!=='string'||resolve(scope.workspace)!==scope.workspace||scope.workspace==='/')fail('erasure-owner-input-invalid');
 const root=join(home,'.local/state/cab-owner-erasure',createHash('sha256').update(scope.workspace).digest('hex'));
 if(action!=='diagnose')ensurePrivateStateDirectory(root);
 const tx=new ErasureTransaction(root,action==='diagnose'?{createKey:false,readOnly:true}:{}),scopeDigest=canonicalContinuityDigest(scope);
 let value=tx.load();
 const ownerStatePresent=Boolean(value);
 if(value&&(value.transactionId!==transactionId||canonicalContinuityDigest(value.scope)!==scopeDigest)){
  if(value.transactionId===transactionId&&action==='prepare'&&value.phase==='PREPARED'&&!value.entries?.length&&retentionOnlyRebind(value.scope,scope)){
   value={...value,scope,retentionReboundAt:Date.now()};tx.save(value);
  }else fail('erasure-owner-transaction-divergent');
 }
 const receipt=state=>({protocol:'cab-owner-erasure-v1',transactionId,scopeDigest,state,uid:process.getuid(),pid:process.ppid});
 if(action==='diagnose'){
  const bundle=input.bundle;
  const priorShared=scope.sharedIdentityIds||[],nextShared=bundle?.scope?.sharedIdentityIds||[];
  const baseScope=bundle?.scope?{...bundle.scope,ids:scope.ids,...(Object.hasOwn(scope,'sharedIdentityIds')?{sharedIdentityIds:priorShared}:{})}:null;
  if(!value||!['PREPARED','APPLYING','APPLIED'].includes(value.phase)||!bundle||!Array.isArray(bundle.roots)||
     !Array.isArray(bundle.journalPaths)||!Array.isArray(bundle.legacyRoots)||
     !bundle.scope||!Array.isArray(bundle.scope.ids)||
     !Array.isArray(priorShared)||!Array.isArray(nextShared)||canonicalContinuityDigest(baseScope)!==scopeDigest||
     !scope.ids.every(id=>bundle.scope.ids.includes(id)||priorShared.includes(id))||!bundle.scope.ids.every(id=>typeof id==='string')||
     !priorShared.every(id=>nextShared.includes(id))||nextShared.some(id=>!priorShared.includes(id)&&scope.ids.includes(id)))fail('erasure-owner-diagnostic-input-invalid');
  let result=diagnoseErasureFilePlan(bundle.roots,bundle.scope,{exclude:bundle.journalPaths,legacyRoots:bundle.legacyRoots,baseIds:scope.ids,approvalSeeds:bundle.diagnosticApprovalSeeds||[]});
  if(value.phase==='APPLIED'&&result.status==='PLAN_VALID'){
    const effective={...value.effectiveScope,sharedIdentityIds:bundle.scope.sharedIdentityIds,ownerBaseIds:scope.ids};
    const texts=(value.journalPaths||[]).map(path=>readErasureBytes(path,{legacy:(value.legacyRoots||[]).some(root=>path===root||path.startsWith(root+'/'))}).toString('utf8'));
    const refs=texts.flatMap(text=>erasureReferences(text,effective));
    if(refs.length){const stage=refs.some(id=>scope.runIds.includes(id))?'journal-reference-run':
      refs.some(id=>(scope.changeIds||[]).includes(id))?'journal-reference-change':
      refs.some(id=>scope.ids.includes(id))?'journal-reference-base':'journal-reference-derived';
      const events=texts.flatMap(text=>text.split('\n').map(line=>{try{return JSON.parse(line)}catch{return null}}).filter(Boolean));
      const reduced={...effective,ids:refs},pattern=new RegExp(refs.map(id=>id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
      const offending=events.filter(event=>erasureReferences(event,reduced,pattern).length);
      const shared=offending.length>0&&offending.every(event=>effective.sharedIdentityIds.includes(event.approval_id));
      const withApproval=offending.some(event=>typeof event.approval_id==='string'&&event.approval_id);
      const withoutApproval=offending.some(event=>!event.approval_id);
      const ownership=withApproval&&withoutApproval?'mixed':withApproval?'approval':'noapproval';
      result={status:'PLAN_REFUSED',stage:stage+(shared?'-shared':'-unshared')+'-'+ownership,code:'erasure-owner-absence-unverified'};}
  }
  return {...receipt('DIAGNOSED'),ownerPhase:value.phase,diagnostic:result};
 }
 const isLegacy=(v,path)=>(v.legacyRoots||[]).some(root=>path===root||path.startsWith(root+'/'));
 const committedEpoch=v=>{
  const entry=v.entries?.at(-1),journal=v.journalPaths?.[0];
  if(typeof journal!=='string'||entry?.path!==journal+'.erasure-epoch.json'||entry.remove!==false||typeof entry.text!=='string'||!existsSync(entry.path))return false;
  let epoch;try{epoch=JSON.parse(entry.text);}catch{return false;}
  if(Object.keys(epoch).sort().join(',')!=='epoch,generation'||!/^\d+$/.test(epoch.epoch)||!Number.isSafeInteger(epoch.generation)||epoch.generation<0)return false;
  // Le dernier écrit fsync du plan signé prouve l'application ordonnée des
  // candidats précédents. Les pairs peuvent ensuite avancer ; ne pas les rejouer.
  return createHash('sha256').update(readErasureBytes(entry.path,{legacy:isLegacy(v,entry.path)})).digest('hex')===
    createHash('sha256').update(entry.text).digest('hex');
 };
 const absent=v=>!erasureFilePlan(v.roots,v.effectiveScope||v.scope,{exclude:v.journalPaths||[],legacyRoots:v.legacyRoots||[]}).entries.length&&
  (v.journalPaths||[]).every(path=>!erasureReferences(readErasureBytes(path,{legacy:isLegacy(v,path)}).toString('utf8'),v.effectiveScope||v.scope).length);
 if(action==='prepare'){
  if(!value){value={protocol:'cab-change-erasure-v1',transactionId,scope,phase:'PREPARED',roots:[],entries:[]};tx.save(value);}
  return receipt(value.phase);
 }
 if(action==='status')return receipt(value?.phase||'ABSENT');
 if(action==='commit'){
  if(!value)fail('erasure-owner-transaction-missing');
  if(value.phase==='PREPARED'){
   const bundle=input.bundle;
   if(!bundle||!Array.isArray(bundle.roots)||!Array.isArray(bundle.entries)||!Array.isArray(bundle.journalPaths)||bundle.scope?.workspace!==scope.workspace||bundle.scope?.changeId!==scope.changeId||canonicalContinuityDigest(bundle.scope?.runIds)!==canonicalContinuityDigest(scope.runIds)||!Array.isArray(bundle.scope.ids)||scope.ids.some(id=>!bundle.scope.ids.includes(id)&&!(scope.closureAuthority==='authoritative-retired-run-batch-v1'&&scope.sharedIdentityIds.includes(id)))||
     scope.closureAuthority==='authoritative-retired-run-batch-v1'&&(!Array.isArray(bundle.scope.sharedIdentityIds)||!scope.sharedIdentityIds.every(id=>bundle.scope.sharedIdentityIds.includes(id))||bundle.scope.sharedIdentityIds.some(id=>!scope.sharedIdentityIds.includes(id)&&scope.ids.includes(id))))fail('erasure-owner-bundle-divergent');
   const roots=[...new Set(bundle.roots)];
   const plan=erasureFilePlan(roots,bundle.scope,{exclude:bundle.journalPaths,legacyRoots:bundle.legacyRoots||[],
     ...(scope.closureAuthority==='authoritative-retired-run-batch-v1'?{baseIds:scope.ids}:{})});
   const legacyRoots=bundle.legacyRoots||[],entries=[...plan.entries,...bundle.entries].map(entry=>{
    if(existsSync(entry.path)&&lstatSync(entry.path).uid!==process.getuid())fail('erasure-owner-file-foreign');
    const legacy=entry.legacy===true||legacyRoots.some(root=>entry.path===root||entry.path.startsWith(root+'/'));
    const within=relative(scope.workspace,entry.path),project=!within||!within.startsWith('..')&&!isAbsolute(within);
    return {...entry,legacy,...(legacy&&!project?{fileMode:0o600}:{})};
   });
   value={...value,phase:'APPLYING',roots,effectiveScope:plan.scope,entries,journalPaths:bundle.journalPaths,legacyRoots};tx.save(value);
  }
  if(value.phase==='APPLYING'){
   const epochCommitted=committedEpoch(value),planDigest=canonicalContinuityDigest(value);
   if(!epochCommitted)tx.applyFiles(value);
   removeErasureDirectories(value.roots,value.scope);
   if(!absent(value))fail('erasure-owner-absence-unverified');
   value={...value,phase:'APPLIED',entries:[],completionProof:{kind:epochCommitted?'signed-final-epoch-and-current-absence':'file-hashes-and-current-absence',planDigest}};tx.save(value);
  }
  if(value.phase!=='APPLIED')fail('erasure-owner-phase-invalid');
  return {...receipt('APPLIED'),roots:value.roots,effectiveScope:value.effectiveScope||value.scope,journalPaths:value.journalPaths,
   ...(value.completionProof?{completionProof:value.completionProof}:{})};
 }
 if(value&&value.phase!=='APPLIED')fail('erasure-owner-phase-invalid');
 if(!value){
  if(!input.ownerReceipt||input.ownerReceipt.scopeDigest!==scopeDigest||!Array.isArray(input.ownerReceipt.roots))fail('erasure-owner-receipt-required');
  value={scope,effectiveScope:input.ownerReceipt.effectiveScope||scope,roots:input.ownerReceipt.roots,journalPaths:input.ownerReceipt.journalPaths||[]};
 }
 if(action==='verify'&&input.bundle&&(value.phase==='APPLIED'||!ownerStatePresent)&&value.effectiveScope&&scope.closureAuthority==='authoritative-retired-run-batch-v1'){
  const candidateScope=input.bundle.scope,prior=value.effectiveScope.sharedIdentityIds||[],next=candidateScope?.sharedIdentityIds;
  if(!candidateScope||!Array.isArray(candidateScope.ids)||!Array.isArray(next)||!prior.every(id=>next.includes(id))||
    next.some(id=>typeof id!=='string'||!prior.includes(id)&&scope.ids.includes(id))||
    canonicalContinuityDigest({...candidateScope,ids:scope.ids,sharedIdentityIds:scope.sharedIdentityIds})!==scopeDigest)
    fail('erasure-owner-retention-divergent');
  const updated={...value,effectiveScope:{...value.effectiveScope,sharedIdentityIds:next,ownerBaseIds:scope.ids}};
  if(!absent(updated))fail('erasure-owner-absence-unverified');
  if(canonicalContinuityDigest(updated.effectiveScope)!==canonicalContinuityDigest(value.effectiveScope)){value=updated;if(ownerStatePresent)tx.save(value);}
 }
 if(!absent(value))fail('erasure-owner-absence-unverified');
 if(action==='finalize'&&existsSync(tx.path))unlinkSync(tx.path);
 return {...receipt(action==='finalize'?'PURGED':'VERIFIED'),roots:value.roots,effectiveScope:value.effectiveScope||value.scope,journalPaths:value.journalPaths||[]};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const raw=readFileSync(0);if(raw.length>128*1024*1024)fail('erasure-owner-input-too-large');process.stdout.write(JSON.stringify(ownerCleanup(JSON.parse(raw))));}
 catch(cause){process.stderr.write(JSON.stringify({error:cause.code||'erasure-owner-failed'}));process.exitCode=1;}
}
