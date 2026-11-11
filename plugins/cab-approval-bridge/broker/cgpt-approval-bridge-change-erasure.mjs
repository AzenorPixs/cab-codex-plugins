import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { constants, closeSync, existsSync, fstatSync, fsyncSync, lstatSync, openSync,
  readFileSync, readdirSync, realpathSync, unlinkSync, renameSync, rmdirSync, writeFileSync,fchmodSync,rmSync } from 'node:fs';
import { dirname, join, resolve,relative } from 'node:path';
import {homedir} from 'node:os';
import {digest as observationDigest,validateBundle} from './cgpt-approval-bridge-observation-statistics.mjs';
import { canonicalContinuityDigest, continuityDigest } from './cgpt-approval-bridge-continuity.mjs';
import { ensurePrivateStateDirectory, readRuntimeJson, writeRuntimeJson } from './cgpt-approval-bridge-state-layout.mjs';
import { PermissionReplyJournal, validPermissionReply } from './cgpt-approval-bridge-permission-replies.mjs';

export const VERSION = '2.7.2';
export const ERASURE_PROTOCOL = 'cab-change-erasure-v1';
export const ERASURE_RECEIPT_MAX_BYTES = 128 * 1024 * 1024;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,199}$/.test(value);
const identityValue = value => identifier(value) && !['null','undefined'].includes(value);
const fail = code => { throw Object.assign(new Error(code), { code, status: 409 }); };
const sha = value => createHash('sha256').update(value).digest('hex');
const identityKeys = new Set(['runId','run_id','changeId','change_id','sessionId','session_id','sessionID',
  'jobId','job_id','operationId','operation_id','requestId','request_id','approvalId','approval_id',
  'accessId','access_id','transactionId','stageId','actionId','policyId','extensionId','permissionId','callID']);
const ownerKeys = new Set(['runId','run_id','changeId','change_id']);
const identityLists=new Set(['runIds','run_ids','scopeRunIds','sessionIds','session_ids','operationIds','requestIds','approvalIds','revokedSessions','sourceSessions','onceAcknowledged','restoredAccesses']);
const unambiguousId=value=>typeof value==='string'&&(value.length>=16||/^(?:ses_|op-|req-|request-|approval-|apr-|call_|job-|policy-|access-|erasure-|run-)/.test(value));
const terminalOperations = new Set(['COMPLETED','NO_EFFECT','RECONCILED','CANCELLED']);
const effectiveIds=scope=>scope.ids.filter(id=>identityValue(id)&&!(scope.closureAuthority==='authoritative-retired-run-batch-v1'&&(scope.sharedIdentityIds||[]).includes(id)));
const secondaryRetentionId=id=>identifier(id)&&!id.startsWith('ses_');
export function reconcileRetiredRetention(value,{sharedIdentityIds,evidence,ownerStatus}){
  if(value?.scope?.closureAuthority!=='authoritative-retired-run-batch-v1'||value.brokerTransport!=='owner-local-v1'||!['SEALED','FREEZING'].includes(value.phase)||
    value.entries?.length||value.expectedPeers||value.ownerReceipts?.commit||!Array.isArray(sharedIdentityIds)||!sharedIdentityIds.length||
    sharedIdentityIds.some(id=>!secondaryRetentionId(id)||value.scope.runIds.includes(id)||id.startsWith('ses_'))||
    !Array.isArray(evidence)||!evidence.length||evidence.some(v=>typeof v!=='string'||!v||v.length>500)||
    ownerStatus?.protocol!=='cab-owner-erasure-v1'||ownerStatus.transactionId!==value.transactionId||ownerStatus.state!=='PREPARED'||ownerStatus.uid!==value.ownerReceipts?.prepare?.uid||
    ownerStatus.scopeDigest!==canonicalContinuityDigest(value.scope))fail('erasure-retention-reconciliation-refused');
  const shared=[...new Set([...value.scope.sharedIdentityIds,...sharedIdentityIds])].sort();
  return {...value,scope:{...value.scope,sharedIdentityIds:shared},ownerReceipts:{},ownerAction:'prepare',phase:'SEALED',
    retentionReconciliations:[...(value.retentionReconciliations||[]),{at:Date.now(),previousScopeDigest:ownerStatus.scopeDigest,
      added:sharedIdentityIds,evidence,ownerStatusDigest:canonicalContinuityDigest(ownerStatus)}]};
}
export function retentionOnlyRebind(before,after){
  if(before?.closureAuthority!=='authoritative-retired-run-batch-v1'||after?.closureAuthority!==before.closureAuthority)return false;
  const {sharedIdentityIds:a,...left}=before,{sharedIdentityIds:b,...right}=after;
  return Array.isArray(a)&&Array.isArray(b)&&a.every(id=>b.includes(id))&&b.every(id=>a.includes(id)||secondaryRetentionId(id)&&!before.runIds.includes(id)&&!id.startsWith('ses_'))&&
    canonicalContinuityDigest(left)===canonicalContinuityDigest(right);
}
function privateAncestor(directory) {
  let current=directory;
  while(true){const stat=lstatSync(current);if(stat.isDirectory()&&stat.uid===process.getuid()&&!(stat.mode&0o077))return true;
    const parent=dirname(current);if(parent===current)return false;current=parent;}
}
const excludedStateName=name=>/\.(?:crt|cer|der|key|pem|p12|pfx|env)(?:\..*)?$/.test(name)||
  /^(?:id_rsa|id_ed25519|credentials\.(?:json|yaml)|secrets\.(?:json|yaml)|opencode\.password)$/.test(name)||
  // Une déclaration CCAB non acquittée reste nécessaire même après clôture du change.
  ['.git','.ssh','.cache','node_modules','config','credentials','ccab-pending'].includes(name);

export function erasureInventory(registry,changeId,ownerId) {
  if(!identifier(changeId)||!identifier(ownerId)||!record(registry)||typeof registry.project!=='string'||!registry.project.startsWith('/'))fail('erasure-scope-invalid');
  const rows=[...(registry.runs||[]),...(registry.history||[]).flatMap(row=>[row,row?.run,row?.previous,row?.current])]
    .filter(row=>record(row)&&row.changeId===changeId&&identifier(row.runId));
  if(!rows.length)fail('erasure-change-not-found');
  const bindings=new Map(),owners=new Map();
  for(const row of rows){
    if(!identifier(row.ownerId)||!Number.isSafeInteger(row.contextId)||row.contextId<1||!Number.isSafeInteger(row.version)||row.version<1)fail('erasure-owner-unverified');
    const identity=JSON.stringify([row.runId,row.contextId]);
    if(owners.has(identity)&&owners.get(identity)!==row.ownerId)fail('erasure-owner-ambiguous');
    owners.set(identity,row.ownerId);
    const key=JSON.stringify([row.runId,row.contextId,row.ownerId]),prior=bindings.get(key);
    if(!prior||prior.version<row.version)bindings.set(key,{runId:row.runId,contextId:row.contextId,version:row.version,ownerId:row.ownerId});
  }
  const runBindings=[...bindings.values()].sort((a,b)=>a.runId.localeCompare(b.runId)||a.contextId-b.contextId||a.ownerId.localeCompare(b.ownerId));
  if(!runBindings.some(row=>row.ownerId===ownerId))fail('erasure-run-not-closed-or-foreign');
  return {workspace:registry.project,changeId,runBindings,inventoryDigest:canonicalContinuityDigest({workspace:registry.project,changeId,runBindings}),
    requiresOwnershipReview:runBindings.some(row=>row.ownerId!==ownerId),snapshotOnly:true};
}
function reviewedOwnership(registry,changeId,ownerId,review) {
  const inventory=erasureInventory(registry,changeId,ownerId);
  if(!record(review)||Object.keys(review).length!==3||!Object.hasOwn(review,'inventoryDigest')||!Object.hasOwn(review,'runBindings')||!Object.hasOwn(review,'evidence')||
    !Array.isArray(review.runBindings)||review.runBindings.length>64||!Array.isArray(review.evidence)||!review.evidence.length||review.evidence.length>16||
    review.evidence.some(value=>typeof value!=='string'||!value||value.length>500)||
    review.inventoryDigest!==inventory.inventoryDigest||canonicalContinuityDigest(review.runBindings)!==canonicalContinuityDigest(inventory.runBindings))fail('erasure-ownership-review-divergent');
  if(!inventory.requiresOwnershipReview)fail('erasure-ownership-review-unnecessary');
  return inventory;
}

function legacyTerminalReceipt(operation,access) {
  const native=operation.native,hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
  const releasedAt=typeof access?.finishedAt==='number'?access.finishedAt:Date.parse(access?.finishedAt);
  return operation.state==='COMPLETED'&&!Object.hasOwn(operation,'nativeResult')&&!operation.testReservationId&&
    native?.onceAcknowledged===true&&identifier(native.permissionId)&&identifier(native.callId)&&hash(native.targetDigest)&&
    Number.isFinite(native.startedAt)&&Number.isFinite(operation.finishedAt)&&operation.finishedAt>=native.startedAt&&
    hash(operation.completionDigest)&&access?.accessId===operation.accessId&&access.runId===operation.runId&&
    access.contextId===operation.contextId&&access.version===operation.version&&Array.isArray(access.operationIds)&&
    access.operationIds.includes(operation.operationId)&&access.state==='RELEASED'&&
    ['COMPLETED','NO_EFFECT','RECONCILED'].includes(access.outcome)&&hash(access.releaseDigest)&&
    Number.isFinite(releasedAt)&&releasedAt>=operation.finishedAt;
}

export function erasureScope(registry, changeId, ownerId,{terminalProofs=[],ownershipReview,closedAuthority=false}={}) {
  if (!identifier(changeId) || !identifier(ownerId) || !record(registry)||typeof registry.project!=='string'||!registry.project.startsWith('/')) fail('erasure-scope-invalid');
  const current = registry.runs || [];
  const history = registry.history || [];
  const candidates = [...current, ...history.flatMap(row => [row, row?.run, row?.previous, row?.current])]
    .filter(row => record(row) && row.changeId === changeId && identifier(row.runId));
  if (!candidates.length) fail('erasure-change-not-found');
  const runs = [...new Set(candidates.map(row => row.runId))];
  if([...current,...history].some(row=>record(row)&&runs.includes(row.runId)&&row.changeId!==changeId))
    fail('erasure-run-not-closed-or-foreign');
  const inventory=ownershipReview===undefined?null:reviewedOwnership(registry,changeId,ownerId,ownershipReview);
  if (!inventory&&candidates.some(row => row.ownerId !== ownerId) ||
      current.some(row => runs.includes(row.runId) && (row.changeId !== changeId || row.state === 'RESERVED')))
    fail('erasure-run-not-closed-or-foreign');
  if(closedAuthority)for(const runId of runs) {
    const latest=current.find(row=>row.runId===runId)||candidates.filter(row=>row.runId===runId).sort((a,b)=>(a.version||0)-(b.version||0)).at(-1);
    if(!latest||!['DELIVERED','ABANDONED','RELEASED'].includes(latest.state))fail('erasure-run-in-progress');
  }
  const target = row => runs.includes(row?.runId);
  const c = registry.coordination || {},legacyTerminalOperationIds=[];
  for (const row of Object.values(c.operations || {}).filter(target)) {
    const terminalResult=['completed','error'].includes(row.nativeResult?.status)&&/^[a-f0-9]{64}$/.test(row.completionDigest||'');
    const reconciledPort=row.state==='CANCELLED'&&/^[a-f0-9]{64}$/.test(row.completionDigest||'')&&terminalProofs.some(proof=>
      proof.state==='DONE'&&proof.httpStatus===200&&proof.action==='reconcile-quarantined-port'&&proof.ownerId===(inventory?inventory.runBindings.find(binding=>binding.runId===row.runId&&binding.contextId===row.contextId)?.ownerId:ownerId)&&
      proof.runId===row.runId&&proof.contextId===row.contextId&&proof.targetId===row.operationId&&proof.effectDigest===row.completionDigest&&
      proof.result?.executionOutcome==='HISTORICAL_OUTCOME_UNOBSERVED_RESOURCE_QUIESCENT'&&proof.result?.evidenceAuthority==='VERIFIED_NATIVE_PORT_PROBES');
    const legacyTerminal=legacyTerminalReceipt(row,c.accesses?.[row.accessId]);
    if(legacyTerminal)legacyTerminalOperationIds.push(row.operationId);
    if (!closedAuthority&&(!terminalOperations.has(row.state) || (row.native||row.onceAcknowledged===true)&&!terminalResult&&!reconciledPort&&!legacyTerminal))
      fail('erasure-operation-unreconciled');
  }
  for (const name of ['accesses','testReservations']) for (const row of Object.values(c[name] || {}).filter(target)) {
    if (!closedAuthority&&!['RELEASED','CANCELLED'].includes(row.state)) fail('erasure-resource-unreleased');
  }
  if (!closedAuthority&&(registry.integrationOwner && runs.includes(registry.integrationOwner) ||
      (registry.integrationQueue || []).some(target))) fail('erasure-integration-active');
  const ids = new Set([changeId, ...runs]);
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { for (const item of value) visit(item); return; }
    for (const [key, item] of Object.entries(value)) {
      if (identityKeys.has(key) && identityValue(item)) ids.add(item);
      else if (item && typeof item === 'object') visit(item);
    }
  };
  for (const row of candidates) visit(row);
  for (const name of ['operations','accesses','testReservations','publications'])
    for (const row of Object.values(c[name] || {}).filter(target)) visit(row);
  for (const [key,row] of Object.entries(registry.requestOwners || {})) if (target(row)) { ids.add(key); visit(row); }
  return { protocol: ERASURE_PROTOCOL, workspace:registry.project,changeId, ownerId, runIds: runs.sort(), ids: [...ids].sort(),
    registrySequence: registry.sequence, coordinationSequence: c.sequence,
    ...(closedAuthority?{closureAuthority:'authoritative-run-state-v1'}:{}),
    ...(inventory?{ownershipReview,runBindings:inventory.runBindings}:{}),
    ...(legacyTerminalOperationIds.length?{legacyTerminalOperationIds:legacyTerminalOperationIds.sort()}:{}) };
}

export function retiredRunScope(registry,{runIds,protectedRunIds,ownerId,evidence}) {
  if(!record(registry)||!identifier(ownerId)||!Array.isArray(runIds)||!runIds.length||runIds.length>512||
    !Array.isArray(protectedRunIds)||!protectedRunIds.length||[...runIds,...protectedRunIds].some(v=>!identifier(v))||
    new Set(runIds).size!==runIds.length||new Set(protectedRunIds).size!==protectedRunIds.length||
    !Array.isArray(evidence)||!evidence.length||evidence.some(v=>typeof v!=='string'||!v||v.length>500))fail('erasure-retired-inventory-invalid');
  const selected=new Set(runIds),protectedIds=new Set(protectedRunIds);
  if(runIds.some(id=>protectedIds.has(id)))fail('erasure-retired-protected-run');
  const current=registry.runs||[],rows=[...current,...(registry.history||[]).flatMap(r=>[r,r?.run,r?.previous,r?.current])].filter(r=>record(r)&&identifier(r.runId));
  for(const id of runIds)if(!current.some(r=>r.runId===id&&['DELIVERED','ABANDONED','RELEASED'].includes(r.state)))fail('erasure-run-in-progress');
  if(current.some(r=>r.state==='RESERVED'&&selected.has(r.runId)))fail('erasure-run-in-progress');
  const targets=rows.filter(r=>selected.has(r.runId)),others=rows.filter(r=>!selected.has(r.runId));
  if(targets.some(row=>row.directory&&row.directory!==registry.project))fail('erasure-foreign-reference');
  const bindings=[...new Map(targets.map(r=>{
    if(!identifier(r.changeId)||!identifier(r.ownerId)||!Number.isSafeInteger(r.contextId)||r.contextId<1||!Number.isSafeInteger(r.version)||r.version<1)fail('erasure-retired-binding-invalid');
    const v={runId:r.runId,contextId:r.contextId,ownerId:r.ownerId,version:r.version,changeId:r.changeId};return [canonicalContinuityDigest(v),v];
  })).values()].sort((a,b)=>canonicalContinuityDigest(a).localeCompare(canonicalContinuityDigest(b)));
  const shared=new Set();
  for(const row of others)for(const key of ['runId','changeId','sessionId'])if(identifier(row[key]))shared.add(row[key]);
  const ids=new Set(runIds),collect=value=>{
    if(!value||typeof value!=='object')return;
    for(const [key,item] of Object.entries(value))if(identityKeys.has(key)&&identityValue(item)&&!shared.has(item))ids.add(item);else if(item&&typeof item==='object')collect(item);
  };
  targets.forEach(collect);
  for(const name of ['operations','accesses','testReservations','publications'])for(const row of Object.values(registry.coordination?.[name]||{}))if(selected.has(row.runId)) {
    if(['accesses','testReservations'].includes(name)&&!['RELEASED','CANCELLED'].includes(row.state))fail('erasure-resource-unreleased');
    collect(row);
  }
  for(const [key,row] of Object.entries(registry.requestOwners||{}))if(selected.has(row.runId)){ids.add(key);collect(row)}
  const changeIds=[...new Set(targets.map(r=>r.changeId))].sort();
  return {protocol:ERASURE_PROTOCOL,workspace:registry.project,changeId:'retired-runs-'+canonicalContinuityDigest([...selected].sort()).slice(0,32),
    ownerId,runIds:[...selected].sort(),ids:[...ids].sort(),changeIds,runBindings:bindings,protectedRunIds:[...protectedIds].sort(),
    sharedIdentityIds:[...shared].sort(),closureAuthority:'authoritative-retired-run-batch-v1',inventoryDigest:canonicalContinuityDigest(bindings),
    registrySequence:registry.sequence,coordinationSequence:registry.coordination?.sequence};
}

export function retiredJobDigest(root,runIds){
  return canonicalContinuityDigest(erasureFiles(root).filter(path=>{
    const parts=relative(root,path).match(/^runs\/([^/]+)\/(\d+)\/controller-job\.json$/);return parts&&runIds.includes(parts[1]);
  }).sort().map(path=>({path:relative(root,path),job:readRuntimeJson(path).value})));
}

export function extendErasureScope(scope, documents, {diagnosticStage=()=>{},baseIds=[],seedIds=[],approvalSeeds=[]} = {}) {
  const ids = new Set(effectiveIds(scope));
  const shared=new Set(scope.sharedIdentityIds||[]);
  const owned = value => record(value) && (Object.entries(value).some(([key,item]) => identityKeys.has(key) && ids.has(item))||
    typeof value.id==='string'&&value.id.startsWith('ses_')&&ids.has(value.id)&&value.directory===scope.workspace);
  let changed;
  do {
    changed = false;
    const collect = value => {
      if (!value || typeof value !== 'object'||retainedPeer(value,scope)) return;
      if(owned(value)&&typeof value.directory==='string'&&value.directory!==scope.workspace){
        const primary=['runId','run_id'].some(key=>scope.runIds.includes(value[key]));
        const change=['changeId','change_id'].some(key=>scope.changeIds?.includes(value[key])||value[key]===scope.changeId);
        const matches=Object.entries(value).filter(([key,item])=>identityKeys.has(key)&&!['changeId','change_id'].includes(key)&&ids.has(item)).map(([key])=>key);
        const session=matches.some(key=>['sessionId','session_id','sessionID'].includes(key));
        const run=matches.some(key=>['runId','run_id'].includes(key));
        const detail=run?'run':session?'session':matches.some(key=>/^(?:approvalId|approval_id)$/.test(key))?'approval':
          matches.some(key=>/^(?:requestId|request_id)$/.test(key))?'request':matches.some(key=>/^(?:operationId|operation_id)$/.test(key))?'operation':
          matches.some(key=>/^(?:accessId|access_id)$/.test(key))?'access':matches.length?'other':'only';
        const candidate=resolve(value.directory),workspace=resolve(scope.workspace);
        const area=candidate.startsWith(workspace+'/.cab-tests/')?'atelier':candidate.startsWith(workspace+'/')?'child':candidate.startsWith('/tmp/')?'tmp':candidate.startsWith(homedir()+'/datas/')?'home-project':candidate.startsWith(homedir()+'/')?'home':'foreign';
        const hasRun=['runId','run_id'].some(key=>typeof value[key]==='string'&&value[key]);
        const approvalMatch=Object.entries(value).filter(([key,item])=>['approvalId','approval_id'].includes(key)&&ids.has(item)).map(([,item])=>item);
        const qualifier=area==='home-project'&&!hasRun?(approvalMatch.every(unambiguousId)?'-clear':'-ambiguous'):'';
        const anyBase=Object.entries(value).some(([key,item])=>identityKeys.has(key)&&!['changeId','change_id'].includes(key)&&baseIds.includes(item));
        const seed=approvalMatch.some(item=>seedIds.includes(item));
        const deepBase=(node,depth=0)=>{
          if(depth>0&&typeof node==='string')return unambiguousId(node)&&baseIds.includes(node);
          if(Array.isArray(node))return node.some(item=>deepBase(item,depth+1));
          if(!record(node))return false;
          return Object.entries(node).some(([key,item])=>!['changeId','change_id'].includes(key)&&
            (depth>0&&identityKeys.has(key)&&typeof item==='string'&&baseIds.includes(item)||deepBase(item,depth+1)));
        };
        const nested=(deepBase(value)?'-nested-base':'-no-nested-base')+(['null','undefined'].includes(value.directory)?'-sentinel':value.directory==='.'?'-dot':value.directory==='..'?'-dotdot':!value.directory.startsWith('/')?(value.directory.includes('/')?'-relative-path':'-relative-token'):candidate===value.directory?'-canonical':candidate===value.directory.replace(/\/+$/,'')?'-trailing-slash':'-noncanonical');
        const origin=qualifier&&baseIds.length?(approvalMatch.some(item=>baseIds.includes(item))?'-base':anyBase?'-derived-base-strong':seed?(approvalMatch.some(item=>approvalSeeds.includes(item))?'-derived-seed-approval'+nested:'-derived-seed-other'+nested):'-derived-discovered'):'';
        diagnosticStage(primary?'scope-directory-target-run':change&&detail==='approval'?'scope-directory-change-approval-'+area+(['foreign','tmp','home','home-project'].includes(area)?(hasRun?'-run':'-no-run'):'')+qualifier+origin:change?'scope-directory-change-'+detail:'scope-directory-secondary');
        fail('erasure-foreign-reference');
      }
      if (owned(value)) for (const [key,item] of Object.entries(value)) if (identityKeys.has(key) && identityValue(item) && !ids.has(item)&&!shared.has(item)) {
        if (ownerKeys.has(key)){diagnosticStage('scope-extension-owner');fail('erasure-foreign-reference');}
        ids.add(item); changed = true;
      }
      if(owned(value))for(const key of ['sourceSessions','revokedSessions','sessionIds','session_ids'])
        for(const item of Array.isArray(value[key])?value[key]:[])if(typeof item==='string'&&item.startsWith('ses_')&&identifier(item)&&!ids.has(item)&&!shared.has(item)){
          ids.add(item);changed=true;
        }
      for (const item of Object.values(value)) collect(item);
    };
    for (const document of documents) collect(document);
  } while (changed);
  return { ...scope, ids: [...ids].sort() };
}

// A retained RUN may cite a retired RUN in an immutable approval payload.
// Only its verified primary ownership permits retaining that opaque payload.
function retainedPeer(node,scope) {
  if(scope.closureAuthority!=='authoritative-retired-run-batch-v1'||!record(node))return false;
  const retainedEvent=Array.isArray(scope.ownerBaseIds)&&typeof node.event_id==='string'&&typeof node.event_type==='string'&&
    typeof node.approval_id==='string'&&(scope.sharedIdentityIds||[]).includes(node.approval_id);
  const explicitForeign=typeof node.directory==='string'&&node.directory.startsWith('/')&&resolve(node.directory)===node.directory&&node.directory!==scope.workspace;
  const unattributedApproval=Array.isArray(scope.ownerBaseIds)&&typeof node.directory==='string'&&node.directory!==scope.workspace&&
    !node.directory.startsWith('/')&&['approvalId','approval_id'].some(key=>typeof node[key]==='string');
  if(retainedEvent||explicitForeign||unattributedApproval){
    const ids=new Set(Array.isArray(scope.ownerBaseIds)?scope.ownerBaseIds.filter(identityValue):effectiveIds(scope));
    const strong=value=>{
      if(typeof value==='string')return unambiguousId(value)&&ids.has(value);
      if(Array.isArray(value))return value.some(strong);
      if(!record(value))return false;
      return Object.entries(value).some(([key,item])=>!['changeId','change_id'].includes(key)&&
        (unambiguousId(key)&&ids.has(key)||identityKeys.has(key)&&typeof item==='string'&&ids.has(item)||strong(item)));
    };
    if(!strong(node))return true;
  }
  const runs=['runId','run_id'].filter(key=>typeof node[key]==='string').map(key=>node[key]);
  if(!runs.length||!runs.every(id=>id===runs[0]&&scope.protectedRunIds.includes(id)))return false;
  if(typeof node.directory==='string'&&node.directory!==scope.workspace)return false;
  return true;
}

// Only typed identity ownership selects records. Unclassified textual references
// are rejected by the final scan rather than deleting an unrelated payload.
export function projectErasure(value, scope) {
  const ids = new Set(effectiveIds(scope));
  const own = node => record(node) && (Object.entries(node).some(([key,item]) => identityKeys.has(key) && ids.has(item))||
    typeof node.id==='string'&&node.id.startsWith('ses_')&&ids.has(node.id)&&node.directory===scope.workspace);
  const foreign = node => record(node) && Object.entries(node).some(([key,item]) => ownerKeys.has(key) && typeof item === 'string' && !ids.has(item)&&
    !(['changeId','change_id'].includes(key)&&scope.closureAuthority==='authoritative-retired-run-batch-v1'&&scope.changeIds.includes(item)));
  const peerCache=new WeakMap(),containsCaches=new Map();
  const peer=node=>{
    if(!node||typeof node!=='object')return false;
    if(!peerCache.has(node))peerCache.set(node,retainedPeer(node,scope));
    return peerCache.get(node);
  };
  const contains=(node,predicate)=>{
    if(!node||typeof node!=='object')return predicate(node);
    if(!containsCaches.has(predicate))containsCaches.set(predicate,new WeakMap());
    const cache=containsCaches.get(predicate);
    if(cache.has(node))return cache.get(node);
    const result=peer(node)?predicate===foreign:predicate(node)||Object.values(node).some(item=>contains(item,predicate));
    cache.set(node,result);return result;
  };
  const related=node=>own(node)||typeof node==='string'&&unambiguousId(node)&&ids.has(node);
  const visit = (node,parentKey='') => {
    if(peer(node))return node;
    if (Array.isArray(node)) {
      if (!identityLists.has(parentKey) && node.length === 2 && unambiguousId(node[0]) && ids.has(node[0])) return undefined;
      return node.filter(item=>!(identityLists.has(parentKey)&&typeof item==='string'&&ids.has(item))&&
        !(record(item)&&contains(item,own)&&!contains(item,foreign))).map(item=>visit(item,parentKey)).filter(item => item !== undefined);
    }
    if (!record(node)) return node;
    if(foreign(node)&&contains(node,related))fail('erasure-foreign-reference');
    const ownedPath=typeof node.name==='string'&&node.name.startsWith('runs/')&&scope.runIds.includes(node.name.split('/')[1]);
    if (own(node)||ownedPath) { if (foreign(node)||typeof node.directory==='string'&&node.directory!==scope.workspace) fail('erasure-foreign-reference'); return undefined; }
    const result = Object.fromEntries(Object.entries(node).filter(([key,item]) => !(ids.has(key)&&unambiguousId(key))||peer(item)).map(([key,item]) => [key,key==='integrationOwner'&&ids.has(item)?null:visit(item,key)])
      .filter(([,item]) => item !== undefined));
    if (record(node.bundle) && node.bundle.schemaVersion===1 && typeof node.bundle.sourceId==='string' &&
        typeof node.bundle.datasetId==='string' && typeof node.hash==='string') {
      try {
        validateBundle(node.bundle,scope.workspace);validateBundle(result.bundle,scope.workspace);
        if (observationDigest(node.bundle)!==node.hash) fail('erasure-statistics-import-invalid');
        result.hash=observationDigest(result.bundle);
      } catch { fail('erasure-statistics-import-invalid'); }
    }
    if((Object.hasOwn(node,'signature')||Object.hasOwn(node,'sealDigest'))&&
      canonicalContinuityDigest(node)!==canonicalContinuityDigest(result))fail('erasure-signed-format-uncovered');
    if (result.protocol === 'cab-continuity-v1' && Object.hasOwn(result,'value')) {
      if (result.kind === 'observations' && Array.isArray(result.value?.events)) {
        const events = result.value.events;
        const last = result.value.sequence;
        result.value.events = events.map((event,index) => ({ ...event, sequence: last - events.length + index + 1 }));
        result.value.instanceId=randomUUID();
      }
      result.digest = continuityDigest(result.value); result.sequence++;
    }
    return result;
  };
  return visit(value);
}

function erasurePattern(scope) {
  const values=effectiveIds(scope).filter(unambiguousId);
  if(!values.length)return null;
  const nodes=[{next:new Map(),failure:0,output:[]}];
  for(const value of values){
    let state=0;
    for(const character of value){
      if(!nodes[state].next.has(character)){
        nodes[state].next.set(character,nodes.length);nodes.push({next:new Map(),failure:0,output:[]});
      }
      state=nodes[state].next.get(character);
    }
    nodes[state].output.push(value);
  }
  const queue=[...nodes[0].next.values()];
  for(let index=0;index<queue.length;index++)for(const [character,child] of nodes[queue[index]].next){
    let state=nodes[queue[index]].failure;
    while(state&&!nodes[state].next.has(character))state=nodes[state].failure;
    nodes[child].failure=nodes[state].next.get(character)||0;
    nodes[child].output.push(...nodes[nodes[child].failure].output);queue.push(child);
  }
  return {scan(text,found){
    let state=0;
    for(const character of text){
      while(state&&!nodes[state].next.has(character))state=nodes[state].failure;
      state=nodes[state].next.get(character)||0;
      for(const value of nodes[state].output)found.add(value);
    }
  }};
}
export function erasureReferences(value, scope, pattern=erasurePattern(scope)) {
  const ids=new Set(effectiveIds(scope)),found=new Set();
  const visit=(node,parentKey='')=>{
    if(retainedPeer(node,scope))return;
    if(Array.isArray(node)){for(const item of node){if(identityLists.has(parentKey)&&ids.has(item))found.add(item);visit(item,parentKey)}return}
    if(record(node)){for(const [key,item] of Object.entries(node)){
      if(ids.has(key)&&unambiguousId(key)&&!retainedPeer(item,scope))found.add(key);
      if(identityKeys.has(key)&&ids.has(item))found.add(item);
      if(key==='name'&&typeof item==='string'&&item.startsWith('runs/')&&scope.runIds.includes(item.split('/')[1]))found.add(item.split('/')[1]);
      visit(item,key);}return;}
    if(typeof node==='string'&&pattern){
      if(typeof pattern.scan==='function')pattern.scan(node,found);
      else{pattern.lastIndex=0;for(const match of node.matchAll(pattern))found.add(match[0]);}
    }
  };
  if(typeof value==='string'){
    try{visit(JSON.parse(value))}catch{for(const line of value.split('\n'))try{visit(JSON.parse(line))}catch{visit(line)}}
  }else visit(value);
  return [...found];
}

export function erasureFiles(root,{legacy=false,sourceArtifacts=false}={}) {
  if (!existsSync(root)) return [];
  if(['/',homedir(),'/tmp','/var/tmp','/home',join(homedir(),'.local'),join(homedir(),'.local/state'),
    join(homedir(),'.config'),join(homedir(),'.opencode/state')].includes(resolve(root)))fail('erasure-root-too-broad');
  if(!legacy&&!privateAncestor(root))fail('erasure-file-unsafe');
  const files = [];
  const visit = path => {
    if (realpathSync(path) !== path) fail('erasure-symlink-refused');
    const stat = lstatSync(path);
    if (!legacy&&stat.uid !== process.getuid()) fail('erasure-file-unsafe');
    if (stat.isDirectory()) for (const entry of readdirSync(path,{withFileTypes:true})) {
      const name=entry.name;
      if(excludedStateName(name)||/\.(?:lock|sock)$/.test(name))continue;
      if(sourceArtifacts&&(name==='pycache'||name==='__pycache__'||/\.(?:mjs|py|sh|service|html|css|md)(?:\.(?:before|after|backup|bak))?$/.test(name)||
        entry.isFile()&&/^\d+$/.test(name)))continue;
      visit(join(path,name));
    }
    else if (stat.isFile() && stat.nlink === 1) files.push(path);
    else fail('erasure-file-unsafe');
  };
  visit(resolve(root)); return files;
}

export function erasureFilePlan(roots, scope, { exclude = [],legacyRoots=[],sourceArtifactRoots=[],diagnosticStage=()=>{},baseIds=[],approvalSeeds=[] } = {}) {
  if(baseIds.length&&(!Array.isArray(baseIds)||!baseIds.every(id=>typeof id==='string')||scope.closureAuthority!=='authoritative-retired-run-batch-v1'))fail('erasure-owner-base-scope-invalid');
  if(baseIds.length)scope={...scope,ownerBaseIds:[...baseIds]};
  diagnosticStage('inventory');
  const excluded = new Set(exclude);
  const files = [...new Set(roots.flatMap(root=>erasureFiles(root,{legacy:legacyRoots.some(legacy=>root===legacy||root.startsWith(legacy+'/')),sourceArtifacts:sourceArtifactRoots.includes(root)})))].filter(path => !excluded.has(path));
  const documents = [];
  for (const path of files) {
    if(scope.closureAuthority==='authoritative-retired-run-batch-v1'&&scope.protectedRunIds.some(id=>path.includes('/runs/'+id+'/')))continue;
    const explicitFile=roots.includes(path)&&lstatSync(path).isFile();
    // Locks and global keys contain no business state; they are never rewritten.
    if (/\.(?:lock|sock)$/.test(path)) continue;
    // Les sauvegardes de code et de documentation ne sont pas des etats de change.
    if(!explicitFile&&/\.(?:mjs|py|sh|service|html|css|md)$/.test(path))continue;
    if(!explicitFile&&!/\.(?:json|ndjson)(?:[.-].*)?$/.test(path))fail('erasure-format-uncovered');
    let document;
    try { document = readRuntimeJson(path,{legacy:true}); }
    catch (cause) {
      if(cause instanceof SyntaxError&&!erasureReferences(readErasureBytes(path,{legacy:legacyRoots.some(root=>path===root||path.startsWith(root+'/'))}).toString('utf8'),scope).length)continue;
      throw Object.assign(new Error('erasure-format-uncovered'), { code: 'erasure-format-uncovered', path, cause }); }
    documents.push({ path, legacy:legacyRoots.some(root=>path===root||path.startsWith(root+'/')), ...document });
  }
  diagnosticStage('scope-extension');
  const extended = extendErasureScope(scope, documents.map(row => row.value),{diagnosticStage,baseIds,seedIds:scope.ids,approvalSeeds});
  const pattern=erasurePattern(extended);
  const entries = [];
  diagnosticStage('projection');
  for (const row of documents) {
    if(retainedPeer(row.value,extended))continue;
    const ownedPath=extended.runIds.some(id=>row.path.includes('/runs/'+id+'/'))||extended.ids.some(id=>row.path.endsWith('/'+id+'.json'));
    if (!erasureReferences(row.value,extended,pattern).length&&!ownedPath) continue;
    if (dirname(row.path).endsWith('/permission-replies')) {
      const envelope = row.value, value = envelope?.value;
      if (!validPermissionReply(value) || envelope.digest !== canonicalContinuityDigest(value) ||
          !effectiveIds(scope).includes(value.sessionId) || value.directory !== scope.workspace ||
          new PermissionReplyJournal(dirname(row.path)).path(value) !== row.path)
        fail('erasure-permission-receipt-invalid');
      entries.push({ path: row.path, before: row.sha256, next: null, remove: true, legacy: row.legacy });
      continue;
    }
    if(row.value?.protocol==='cab-continuity-v1'&&(row.value.digest!==continuityDigest(row.value.value)||
      !Number.isSafeInteger(row.value.sequence)||row.value.sequence<1))fail('erasure-continuity-integrity-invalid');
    const next = projectErasure(row.value,extended);
    const foreignOwner=node=>record(node)&&Object.entries(node).some(([key,item])=>ownerKeys.has(key)&&typeof item==='string'&&!extended.ids.includes(item))||
      node&&typeof node==='object'&&Object.values(node).some(foreignOwner);
    if(ownedPath&&foreignOwner(next))fail('erasure-owned-path-mixed-content');
    if(record(row.value)&&Object.hasOwn(row.value,'signature'))fail('erasure-signed-format-uncovered');
    if (next !== undefined && erasureReferences(next,extended,pattern).length) fail('erasure-unclassified-reference');
    entries.push({ path: row.path, before: row.sha256, next: next ?? null, remove: next === undefined||ownedPath,legacy:row.legacy });
  }
  return { scope: extended, entries, inventoryDigest: canonicalContinuityDigest(entries) };
}

// Le diagnostic ne retourne ni chemin ni contenu ; il ne produit aucun candidat persistant.
export function diagnoseErasureFilePlan(roots,scope,options={}) {
  let stage='inventory';
  try { erasureFilePlan(roots,scope,{...options,diagnosticStage:value=>{stage=value}}); return {status:'PLAN_VALID',stage}; }
  catch(error) {
    if(!/^erasure-[a-z0-9-]+$/.test(error?.code||''))throw error;
    return {status:'PLAN_REFUSED',stage,code:error.code};
  }
}

function syncDirectory(path) {
  const fd = openSync(path,constants.O_RDONLY);
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

export function readErasureBytes(path,{legacy=false}={}) {
  if(realpathSync(dirname(path))!==dirname(path))fail('erasure-symlink-refused');
  const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
  try{const stat=fstatSync(fd),parent=lstatSync(dirname(path));if(!stat.isFile()||stat.nlink!==1||!legacy&&(stat.uid!==process.getuid()||parent.uid!==process.getuid()||!privateAncestor(dirname(path)))||stat.size>128*1024*1024)fail('erasure-file-unsafe');return readFileSync(fd)}finally{closeSync(fd)}
}
function writeErasureBytes(path,data,{legacy=false,fileMode}={}) {
  if(!existsSync(dirname(path)))ensurePrivateStateDirectory(dirname(path));
  if(realpathSync(dirname(path))!==dirname(path))fail('erasure-symlink-refused');
  if(!legacy&&!privateAncestor(dirname(path)))fail('erasure-file-unsafe');
  const temporary=path+'.candidate-'+randomUUID(),mode=fileMode??(legacy?0o775:0o600);
  if(![0o600,0o775].includes(mode))fail('erasure-file-mode-invalid');
  const fd=openSync(temporary,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,mode);
  try{writeFileSync(fd,data);fchmodSync(fd,mode);fsyncSync(fd)}finally{closeSync(fd)}
  renameSync(temporary,path);syncDirectory(dirname(path));
}
export function removeErasureDirectories(roots,scope) {
  const visit=path=>{if(realpathSync(path)!==path)fail('erasure-symlink-refused');
    if(!lstatSync(path).isDirectory())return;
    for(const entry of readdirSync(path,{withFileTypes:true}))if(entry.isDirectory())visit(join(path,entry.name));
    if(scope.runIds.some(id=>path.endsWith('/runs/'+id)||path.includes('/runs/'+id+'/'))&&readdirSync(path).length===0){rmdirSync(path);syncDirectory(dirname(path))}};
  for(const root of roots)if(existsSync(root))visit(root);
}

export class ErasureTransaction {
  constructor(root,{createKey=true,readOnly=false}={}) {
    this.root = resolve(root);
    if(readOnly){
      if(!existsSync(this.root)||realpathSync(this.root)!==this.root)fail('erasure-control-root-missing');
      const stat=lstatSync(this.root);
      if(!stat.isDirectory()||stat.uid!==process.getuid()||(stat.mode&0o077))fail('erasure-control-root-unsafe');
    }else ensurePrivateStateDirectory(this.root);
    this.path = join(this.root,'change-erasure.json');
    this.keyPath = join(this.root,'change-erasure.key');
    if (!existsSync(this.keyPath)) {
      if(!createKey||readOnly)fail('erasure-control-key-missing');
      const fd = openSync(this.keyPath,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
      try { const key=randomBytes(32); writeRuntimeKey(fd,key); } finally { closeSync(fd); }
      syncDirectory(this.root);
    }
    const fd = openSync(this.keyPath,constants.O_RDONLY|constants.O_NOFOLLOW);
    try {
      const stat = fstatSync(fd);
      if (!stat.isFile() || stat.nlink !== 1 || stat.uid !== process.getuid() || stat.mode & 0o077 || stat.size !== 32) fail('erasure-key-unsafe');
      this.key = readFileSync(fd);
    } finally { closeSync(fd); }
  }
  sign(value) { return createHmac('sha256',this.key).update(canonicalContinuityDigest(value)).digest('hex'); }
  seal(value) { return { ...value, signature: this.sign(value) }; }
  verify(signed) {
    if (!record(signed) || !/^[a-f0-9]{64}$/.test(signed.signature || '')) fail('erasure-signature-invalid');
    const { signature,...value } = signed;
    if (!timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(this.sign(value),'hex'))) fail('erasure-signature-invalid');
    return value;
  }
  load() { return existsSync(this.path) ? this.verify(readRuntimeJson(this.path,{maxBytes:ERASURE_RECEIPT_MAX_BYTES}).value) : null; }
  save(value) {
    const signed=this.seal(value);
    if(Buffer.byteLength(JSON.stringify(signed)+'\n')>ERASURE_RECEIPT_MAX_BYTES)fail('erasure-receipt-too-large');
    writeRuntimeJson(this.path,signed);
  }
  prepare(plan) {
    if (this.load()) fail('erasure-transaction-in-progress');
    const transactionId='erasure-'+randomUUID();
    const value = { protocol:ERASURE_PROTOCOL, transactionId, phase:'PREPARED',
      ...plan,scope:{...plan.scope,ids:[...new Set([...plan.scope.ids,transactionId])].sort()},acknowledgements:[], startedAt:Date.now() };
    this.save(value); return value;
  }
  candidateDirectory(value) {
    const directory=value.candidateDirectory;
    if(typeof directory!=='string'||resolve(directory)!==directory||!/^erasure-[a-f0-9-]{36}$/.test(value.transactionId)||
      !directory.endsWith('/erasure-candidates/'+value.transactionId)||!value.roots.some(root=>directory.startsWith(root+'/')))fail('erasure-candidate-directory-unsafe');
    if(existsSync(directory))ensurePrivateStateDirectory(directory);
    return directory;
  }
  stageCandidates(value,directory) {
    const current=this.load();
    if(!current||current.transactionId!==value.transactionId||current.phase!=='STOPPING'||current.entries?.length||current.expectedPeers||
      canonicalContinuityDigest(current.scope)!==canonicalContinuityDigest(value.scope))fail('erasure-candidate-stage-refused');
    this.candidateDirectory({...value,candidateDirectory:directory});
    if(existsSync(directory))rmSync(directory,{recursive:true});
    ensurePrivateStateDirectory(directory);
    const entries=value.entries.map((entry,index)=>{
      if(entry.before!==null&&!/^[a-f0-9]{64}$/.test(entry.before||''))fail('erasure-candidate-before-invalid');
      const {next,text,...metadata}=entry;
      if(entry.remove)return {...metadata,before:'candidate-ref-v2:'+(entry.before||'ABSENT'),sourceBefore:entry.before,candidate:{remove:true}};
      const bytes=Buffer.from(text??JSON.stringify(next)+'\n');
      if(bytes.length>ERASURE_RECEIPT_MAX_BYTES)fail('erasure-candidate-too-large');
      const path=join(directory,String(index));writeErasureBytes(path,bytes);
      return {...metadata,before:'candidate-ref-v2:'+(entry.before||'ABSENT'),sourceBefore:entry.before,
        candidate:{path,sha256:sha(bytes),bytes:bytes.length}};
    });
    return {...value,candidateDirectory:directory,entries};
  }
  clearCandidates(value) {
    if(!value.candidateDirectory)return;
    if(!['RESTARTING','VERIFYING','CERTIFIED'].includes(value.phase)||value.entries?.length)fail('erasure-candidate-clear-refused');
    const directory=this.candidateDirectory(value);
    if(existsSync(directory)){rmSync(directory,{recursive:true});syncDirectory(dirname(directory));}
  }
  applyFiles(value, { beforeWrite = () => {} } = {}) {
    for (const entry of value.entries) {
      if (!entry.path.startsWith('/') || !value.roots.some(root => entry.path===root||entry.path.startsWith(root+'/'))) fail('erasure-path-outside-inventory');
      const current = existsSync(entry.path) ? sha(readErasureBytes(entry.path,{legacy:entry.legacy===true})) : null;
      let bytes;
      const external=record(entry.candidate);
      if(external&&entry.before!=='candidate-ref-v2:'+(entry.sourceBefore||'ABSENT'))fail('erasure-candidate-before-invalid');
      const expected = entry.remove ? null : external?entry.candidate.sha256:sha(Buffer.from(entry.text??JSON.stringify(entry.next)+'\n'));
      if (current === expected) continue;
      if (current !== (external?entry.sourceBefore:entry.before)) fail('erasure-source-divergent');
      if(external&&!entry.remove){
        const directory=this.candidateDirectory(value);
        if(typeof entry.candidate.path!=='string'||!/^\d+$/.test(entry.candidate.path.slice(directory.length+1))||
          !entry.candidate.path.startsWith(directory+'/')||!Number.isSafeInteger(entry.candidate.bytes)||entry.candidate.bytes<0||
          entry.candidate.bytes>ERASURE_RECEIPT_MAX_BYTES||!/^[a-f0-9]{64}$/.test(expected||''))fail('erasure-candidate-reference-invalid');
        bytes=readErasureBytes(entry.candidate.path);
        if(bytes.length!==entry.candidate.bytes||sha(bytes)!==expected)fail('erasure-candidate-divergent');
      }else if(!entry.remove)bytes=Buffer.from(entry.text??JSON.stringify(entry.next)+'\n');
      beforeWrite(entry);
      if (entry.remove) { unlinkSync(entry.path); syncDirectory(dirname(entry.path)); }
      else writeErasureBytes(entry.path,bytes,{legacy:entry.legacy===true,fileMode:entry.fileMode});
    }
  }
  certify(value, verifyAbsence) {
    if (verifyAbsence(value) !== true) fail('erasure-absence-unverified');
    const certificate = this.seal({ protocol:ERASURE_PROTOCOL, transactionId:value.transactionId,
      scope:value.scope, roots:value.roots,legacyRoots:value.legacyRoots||[],sourceArtifactRoots:value.sourceArtifactRoots||[],journalPaths:value.journalPaths||[],epoch:Date.now(),
      status:'CERTIFIED_PENDING_FINALIZE', coverage:value.coverage, at:Date.now(),
      ...(value.ownerReceipts?{ownerReceipts:value.ownerReceipts}:{}),
      ...(value.sgsReceipt?{sgsReceipt:value.sgsReceipt}:{}),
      ...(value.retainedArchive?{retainedArchive:value.retainedArchive}:{}),
      ...(value.recoveryCompatibility?{recoveryCompatibility:value.recoveryCompatibility}:{}),
      ...(value.effectiveScope?{effectiveScope:value.effectiveScope}:{}),
      ...(value.expectedPeersDigest?{peerStateDigest:value.expectedPeersDigest}:{}),
      timings:{preparationMs:value.cutoverStartedAt>=value.startedAt?value.cutoverStartedAt-value.startedAt:null,
        cutoverToVerifiedUpperBoundMs:value.runtimeVerifiedAt>=value.cutoverStartedAt?value.runtimeVerifiedAt-value.cutoverStartedAt:null,
        measurement:'cutover-to-runtime-verified-upper-bound'} });
    this.save({...value,phase:'CERTIFIED',certificate});return certificate;
  }
  finish(value, verifyAbsence) {
    const certificate=value.certificate||this.certify(value,verifyAbsence);
    if (verifyAbsence(value) !== true) fail('erasure-absence-unverified');
    unlinkSync(this.path); syncDirectory(this.root);
    return this.seal({...this.verify(certificate),status:'PURGED'});
  }
}

// Kept separate from JSON stores so key material never enters diagnostics.
import { writeSync } from 'node:fs';
function writeRuntimeKey(fd,key) { let offset=0;while(offset<key.length)offset+=writeSync(fd,key,offset,key.length-offset);fsyncSync(fd); }
