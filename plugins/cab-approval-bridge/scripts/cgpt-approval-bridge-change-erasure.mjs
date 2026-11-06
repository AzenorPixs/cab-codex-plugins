import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { constants, closeSync, existsSync, fstatSync, fsyncSync, lstatSync, openSync,
  readFileSync, readdirSync, realpathSync, unlinkSync, renameSync, rmdirSync, writeFileSync,fchmodSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {homedir} from 'node:os';
import {digest as observationDigest,validateBundle} from './cgpt-approval-bridge-observation-statistics.mjs';
import { canonicalContinuityDigest, continuityDigest } from './cgpt-approval-bridge-continuity.mjs';
import { ensurePrivateStateDirectory, readRuntimeJson, writeRuntimeJson } from './cgpt-approval-bridge-state-layout.mjs';

export const VERSION = '2.3.5';
export const ERASURE_PROTOCOL = 'cab-change-erasure-v1';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,199}$/.test(value);
const fail = code => { throw Object.assign(new Error(code), { code, status: 409 }); };
const sha = value => createHash('sha256').update(value).digest('hex');
const identityKeys = new Set(['runId','run_id','changeId','change_id','sessionId','session_id','sessionID',
  'jobId','job_id','operationId','operation_id','requestId','request_id','approvalId','approval_id',
  'accessId','access_id','transactionId','stageId','actionId','policyId','extensionId','permissionId','callID']);
const ownerKeys = new Set(['runId','run_id','changeId','change_id']);
const identityLists=new Set(['runIds','run_ids','scopeRunIds','sessionIds','session_ids','operationIds','requestIds','approvalIds','revokedSessions','sourceSessions']);
const unambiguousId=value=>typeof value==='string'&&(value.length>=16||/^(?:ses_|op-|req-|request-|approval-|apr-|call_|job-|policy-|access-|erasure-|run-)/.test(value));
const terminalOperations = new Set(['COMPLETED','NO_EFFECT','RECONCILED','CANCELLED']);
function privateAncestor(directory) {
  let current=directory;
  while(true){const stat=lstatSync(current);if(stat.isDirectory()&&stat.uid===process.getuid()&&!(stat.mode&0o077))return true;
    const parent=dirname(current);if(parent===current)return false;current=parent;}
}
const excludedStateName=name=>/\.(?:crt|cer|der|key|pem|p12|pfx|env)(?:\..*)?$/.test(name)||
  /^(?:id_rsa|id_ed25519|credentials\.(?:json|yaml)|secrets\.(?:json|yaml)|opencode\.password)$/.test(name)||
  ['.git','.ssh','.cache','node_modules','config','credentials'].includes(name);

export function erasureScope(registry, changeId, ownerId,{terminalProofs=[]}={}) {
  if (!identifier(changeId) || !identifier(ownerId) || !record(registry)||typeof registry.project!=='string'||!registry.project.startsWith('/')) fail('erasure-scope-invalid');
  const current = registry.runs || [];
  const history = registry.history || [];
  const candidates = [...current, ...history.flatMap(row => [row, row?.run, row?.previous, row?.current])]
    .filter(row => record(row) && row.changeId === changeId && identifier(row.runId));
  if (!candidates.length) fail('erasure-change-not-found');
  const runs = [...new Set(candidates.map(row => row.runId))];
  if([...current,...history].some(row=>record(row)&&runs.includes(row.runId)&&row.changeId!==changeId))
    fail('erasure-run-not-closed-or-foreign');
  if (candidates.some(row => row.ownerId !== ownerId) ||
      current.some(row => runs.includes(row.runId) && (row.changeId !== changeId || row.state === 'RESERVED')))
    fail('erasure-run-not-closed-or-foreign');
  const target = row => runs.includes(row?.runId);
  const c = registry.coordination || {};
  for (const row of Object.values(c.operations || {}).filter(target)) {
    const terminalResult=['completed','error'].includes(row.nativeResult?.status)&&/^[a-f0-9]{64}$/.test(row.completionDigest||'');
    const reconciledPort=row.state==='CANCELLED'&&/^[a-f0-9]{64}$/.test(row.completionDigest||'')&&terminalProofs.some(proof=>
      proof.state==='DONE'&&proof.httpStatus===200&&proof.action==='reconcile-quarantined-port'&&proof.ownerId===ownerId&&
      proof.runId===row.runId&&proof.contextId===row.contextId&&proof.targetId===row.operationId&&proof.effectDigest===row.completionDigest&&
      proof.result?.executionOutcome==='HISTORICAL_OUTCOME_UNOBSERVED_RESOURCE_QUIESCENT'&&proof.result?.evidenceAuthority==='VERIFIED_NATIVE_PORT_PROBES');
    if (!terminalOperations.has(row.state) || (row.native||row.onceAcknowledged===true)&&!terminalResult&&!reconciledPort)
      fail('erasure-operation-unreconciled');
  }
  for (const name of ['accesses','testReservations']) for (const row of Object.values(c[name] || {}).filter(target)) {
    if (!['RELEASED','CANCELLED'].includes(row.state)) fail('erasure-resource-unreleased');
  }
  if (registry.integrationOwner && runs.includes(registry.integrationOwner) ||
      (registry.integrationQueue || []).some(target)) fail('erasure-integration-active');
  const ids = new Set([changeId, ...runs]);
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { for (const item of value) visit(item); return; }
    for (const [key, item] of Object.entries(value)) {
      if (identityKeys.has(key) && identifier(item)) ids.add(item);
      else if (item && typeof item === 'object') visit(item);
    }
  };
  for (const row of candidates) visit(row);
  for (const name of ['operations','accesses','testReservations','publications'])
    for (const row of Object.values(c[name] || {}).filter(target)) visit(row);
  for (const [key,row] of Object.entries(registry.requestOwners || {})) if (target(row)) { ids.add(key); visit(row); }
  return { protocol: ERASURE_PROTOCOL, workspace:registry.project,changeId, ownerId, runIds: runs.sort(), ids: [...ids].sort(),
    registrySequence: registry.sequence, coordinationSequence: c.sequence };
}

export function extendErasureScope(scope, documents) {
  const ids = new Set(scope.ids);
  const owned = value => record(value) && (Object.entries(value).some(([key,item]) => identityKeys.has(key) && ids.has(item))||
    typeof value.id==='string'&&value.id.startsWith('ses_')&&ids.has(value.id)&&value.directory===scope.workspace);
  let changed;
  do {
    changed = false;
    const collect = value => {
      if (!value || typeof value !== 'object') return;
      if(owned(value)&&typeof value.directory==='string'&&value.directory!==scope.workspace)fail('erasure-foreign-reference');
      if (owned(value)) for (const [key,item] of Object.entries(value)) if (identityKeys.has(key) && identifier(item) && !ids.has(item)) {
        if (ownerKeys.has(key)) fail('erasure-foreign-reference');
        ids.add(item); changed = true;
      }
      if(owned(value))for(const key of ['sourceSessions','revokedSessions','sessionIds','session_ids'])
        for(const item of Array.isArray(value[key])?value[key]:[])if(typeof item==='string'&&item.startsWith('ses_')&&identifier(item)&&!ids.has(item)){
          ids.add(item);changed=true;
        }
      for (const item of Object.values(value)) collect(item);
    };
    for (const document of documents) collect(document);
  } while (changed);
  return { ...scope, ids: [...ids].sort() };
}

// Only typed identity ownership selects records. Unclassified textual references
// are rejected by the final scan rather than deleting an unrelated payload.
export function projectErasure(value, scope) {
  const ids = new Set(scope.ids);
  const own = node => record(node) && (Object.entries(node).some(([key,item]) => identityKeys.has(key) && ids.has(item))||
    typeof node.id==='string'&&node.id.startsWith('ses_')&&ids.has(node.id)&&node.directory===scope.workspace);
  const foreign = node => record(node) && Object.entries(node).some(([key,item]) => ownerKeys.has(key) && typeof item === 'string' && !ids.has(item));
  const contains=(node,predicate)=>predicate(node)||node&&typeof node==='object'&&Object.values(node).some(item=>contains(item,predicate));
  const related=node=>own(node)||typeof node==='string'&&unambiguousId(node)&&ids.has(node);
  const visit = (node,parentKey='') => {
    if (Array.isArray(node)) {
      if (!identityLists.has(parentKey) && node.length === 2 && unambiguousId(node[0]) && ids.has(node[0])) return undefined;
      return node.filter(item=>!(identityLists.has(parentKey)&&typeof item==='string'&&ids.has(item))&&
        !(record(item)&&contains(item,own)&&!contains(item,foreign))).map(item=>visit(item,parentKey)).filter(item => item !== undefined);
    }
    if (!record(node)) return node;
    if(foreign(node)&&contains(node,related))fail('erasure-foreign-reference');
    const ownedPath=typeof node.name==='string'&&node.name.startsWith('runs/')&&scope.runIds.includes(node.name.split('/')[1]);
    if (own(node)||ownedPath) { if (foreign(node)||typeof node.directory==='string'&&node.directory!==scope.workspace) fail('erasure-foreign-reference'); return undefined; }
    const result = Object.fromEntries(Object.entries(node).filter(([key]) => !(ids.has(key)&&unambiguousId(key))).map(([key,item]) => [key,key==='integrationOwner'&&ids.has(item)?null:visit(item,key)])
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
  const values=scope.ids.filter(unambiguousId).map(id=>id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  return values.length?new RegExp(values.join('|'),'g'):null;
}
export function erasureReferences(value, scope, pattern=erasurePattern(scope)) {
  const ids=new Set(scope.ids),found=new Set();
  const visit=(node,parentKey='')=>{
    if(Array.isArray(node)){for(const item of node){if(identityLists.has(parentKey)&&ids.has(item))found.add(item);visit(item,parentKey)}return}
    if(record(node)){for(const [key,item] of Object.entries(node)){
      if(ids.has(key)&&unambiguousId(key))found.add(key);
      if(identityKeys.has(key)&&ids.has(item))found.add(item);
      if(key==='name'&&typeof item==='string'&&item.startsWith('runs/')&&scope.runIds.includes(item.split('/')[1]))found.add(item.split('/')[1]);
      visit(item,key);}return;}
    if(typeof node==='string'&&pattern){pattern.lastIndex=0;for(const match of node.matchAll(pattern))found.add(match[0]);}
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

export function erasureFilePlan(roots, scope, { exclude = [],legacyRoots=[],sourceArtifactRoots=[] } = {}) {
  const excluded = new Set(exclude);
  const files = [...new Set(roots.flatMap(root=>erasureFiles(root,{legacy:legacyRoots.includes(root),sourceArtifacts:sourceArtifactRoots.includes(root)})))].filter(path => !excluded.has(path));
  const documents = [];
  for (const path of files) {
    const explicitFile=roots.includes(path)&&lstatSync(path).isFile();
    // Locks and global keys contain no business state; they are never rewritten.
    if (/\.(?:lock|sock)$/.test(path)) continue;
    // Les sauvegardes de code et de documentation ne sont pas des etats de change.
    if(!explicitFile&&/\.(?:mjs|py|sh|service|html|css|md)$/.test(path))continue;
    if(!explicitFile&&!/\.(?:json|ndjson)(?:[.-].*)?$/.test(path))fail('erasure-format-uncovered');
    let document;
    try { document = readRuntimeJson(path,{legacy:true}); }
    catch (cause) {
      if(cause instanceof SyntaxError&&!erasureReferences(readErasureBytes(path,{legacy:legacyRoots.some(root=>path.startsWith(root+'/'))}).toString('utf8'),scope).length)continue;
      throw Object.assign(new Error('erasure-format-uncovered'), { code: 'erasure-format-uncovered', path, cause }); }
    documents.push({ path, legacy:legacyRoots.some(root=>path.startsWith(root+'/')), ...document });
  }
  const extended = extendErasureScope(scope, documents.map(row => row.value));
  const pattern=erasurePattern(extended);
  const entries = [];
  for (const row of documents) {
    const ownedPath=extended.runIds.some(id=>row.path.includes('/runs/'+id+'/'))||extended.ids.some(id=>row.path.endsWith('/'+id+'.json'));
    if (!erasureReferences(row.value,extended,pattern).length&&!ownedPath) continue;
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

function syncDirectory(path) {
  const fd = openSync(path,constants.O_RDONLY);
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

export function readErasureBytes(path,{legacy=false}={}) {
  if(realpathSync(dirname(path))!==dirname(path))fail('erasure-symlink-refused');
  const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
  try{const stat=fstatSync(fd),parent=lstatSync(dirname(path));if(!stat.isFile()||stat.nlink!==1||!legacy&&(stat.uid!==process.getuid()||parent.uid!==process.getuid()||!privateAncestor(dirname(path)))||stat.size>128*1024*1024)fail('erasure-file-unsafe');return readFileSync(fd)}finally{closeSync(fd)}
}
function writeErasureBytes(path,data,{legacy=false}={}) {
  if(!existsSync(dirname(path)))ensurePrivateStateDirectory(dirname(path));
  if(realpathSync(dirname(path))!==dirname(path))fail('erasure-symlink-refused');
  if(!legacy&&!privateAncestor(dirname(path)))fail('erasure-file-unsafe');
  const temporary=path+'.candidate-'+randomUUID(),mode=legacy?0o775:0o600;
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
  constructor(root,{createKey=true}={}) {
    this.root = resolve(root); ensurePrivateStateDirectory(this.root);
    this.path = join(this.root,'change-erasure.json');
    this.keyPath = join(this.root,'change-erasure.key');
    if (!existsSync(this.keyPath)) {
      if(!createKey)fail('erasure-control-key-missing');
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
  load() { return existsSync(this.path) ? this.verify(readRuntimeJson(this.path).value) : null; }
  save(value) { writeRuntimeJson(this.path,this.seal(value)); }
  prepare(plan) {
    if (this.load()) fail('erasure-transaction-in-progress');
    const transactionId='erasure-'+randomUUID();
    const value = { protocol:ERASURE_PROTOCOL, transactionId, phase:'PREPARED',
      ...plan,scope:{...plan.scope,ids:[...new Set([...plan.scope.ids,transactionId])].sort()},acknowledgements:[], startedAt:Date.now() };
    this.save(value); return value;
  }
  applyFiles(value, { beforeWrite = () => {} } = {}) {
    for (const entry of value.entries) {
      if (!entry.path.startsWith('/') || !value.roots.some(root => entry.path===root||entry.path.startsWith(root+'/'))) fail('erasure-path-outside-inventory');
      const current = existsSync(entry.path) ? sha(readErasureBytes(entry.path,{legacy:entry.legacy===true})) : null;
      const bytes=Buffer.from(entry.text??JSON.stringify(entry.next)+'\n');
      const expected = entry.remove ? null : sha(bytes);
      if (current === expected) continue;
      if (current !== entry.before) fail('erasure-source-divergent');
      beforeWrite(entry);
      if (entry.remove) { unlinkSync(entry.path); syncDirectory(dirname(entry.path)); }
      else writeErasureBytes(entry.path,bytes,{legacy:entry.legacy===true});
    }
  }
  certify(value, verifyAbsence) {
    if (verifyAbsence(value) !== true) fail('erasure-absence-unverified');
    const certificate = this.seal({ protocol:ERASURE_PROTOCOL, transactionId:value.transactionId,
      scope:value.scope, roots:value.roots,legacyRoots:value.legacyRoots||[],sourceArtifactRoots:value.sourceArtifactRoots||[],journalPaths:value.journalPaths||[],epoch:Date.now(),
      status:'CERTIFIED_PENDING_FINALIZE', coverage:value.coverage, at:Date.now(),
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
