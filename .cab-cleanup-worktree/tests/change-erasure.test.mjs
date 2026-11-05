import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync,chmodSync,statSync,existsSync } from 'node:fs';
import {erasureMonitorEndpoint} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-erasure-manager.mjs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { erasureScope, extendErasureScope, projectErasure, erasureFilePlan, ErasureTransaction,
  erasureReferences } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-change-erasure.mjs';
import { ContinuityStore } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-continuity.mjs';
import {createObservationJournal} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-events.mjs';
import { writeRuntimeJson, readRuntimeJson } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-state-layout.mjs';

const run = {runId:'run-target-12345',changeId:'target-change-12345',ownerId:'owner',contextId:1,version:2,state:'DELIVERED',sessionId:'ses_target12345'};
const peer = {runId:'run-peer-12345',changeId:'peer-change-12345',ownerId:'peer-owner',contextId:3,version:3,state:'RESERVED',sessionId:'ses_peer12345'};
const registry = () => ({project:'/fixture',sequence:5,runs:[structuredClone(run),structuredClone(peer)],history:[],requestOwners:{},
  coordination:{sequence:20,operations:{'op-target12345':{runId:run.runId,contextId:1,operationId:'op-target12345',state:'COMPLETED',native:{onceAcknowledged:true},completionDigest:'a'.repeat(64),nativeResult:{status:'completed',exitCode:0}},
    'op-peer12345':{runId:peer.runId,operationId:'op-peer12345',state:'EXECUTING',native:{onceAcknowledged:true}}},accesses:{},testReservations:{}}});
const scope = () => erasureScope(registry(),run.changeId,'owner');
const fixture = fn => { const root=mkdtempSync(join(tmpdir(),'cab-erasure-'));try{return fn(root)}finally{rmSync(root,{recursive:true,force:true})} };

test('closed target selection preserves active peers and global sequences',()=>{
  const r=registry(),s=erasureScope(r,run.changeId,'owner'),next=projectErasure(r,s);
  assert.deepEqual(next.runs,[peer]);assert.equal(next.sequence,5);assert.equal(next.coordination.sequence,20);
  assert.deepEqual(next.coordination.operations['op-peer12345'],r.coordination.operations['op-peer12345']);
  assert.equal(next.coordination.operations['op-target12345'],undefined);
});

for(const state of ['PREPARED','ISSUING','EXECUTING','UNKNOWN'])test('refuses unresolved target '+state,()=>{
  const r=registry();r.coordination.operations['op-target12345'].state=state;
  assert.throws(()=>erasureScope(r,run.changeId,'owner'),/erasure-operation-unreconciled/);
});

test('refuses once without terminal result even if operation says COMPLETED',()=>{
  const r=registry();delete r.coordination.operations['op-target12345'].nativeResult;
  assert.throws(()=>erasureScope(r,run.changeId,'owner'),/erasure-operation-unreconciled/);
});

for(const group of ['accesses','testReservations'])test('refuses unreleased '+group,()=>{
  const r=registry();r.coordination[group].held={runId:run.runId,state:'HELD'};
  assert.throws(()=>erasureScope(r,run.changeId,'owner'),/erasure-resource-unreleased/);
});

test('foreign owner and reused run generation are refused',()=>{
  const r=registry();assert.throws(()=>erasureScope(r,run.changeId,'foreign'),/foreign/);
  r.history.push({...run,changeId:run.changeId});r.runs[0]={...run,changeId:'different-change',state:'ABANDONED'};
  assert.throws(()=>erasureScope(r,run.changeId,'owner'),/foreign/);
});

test('identity closure includes derived receipts without swallowing foreign references',()=>{
  const rows=[{runId:run.runId,actionId:'action-target12345'},{actionId:'action-target12345',approvalId:'approval-target12345'}];
  const s=extendErasureScope(scope(),rows);assert.ok(s.ids.includes('approval-target12345'));assert.deepEqual(projectErasure(rows,s),[]);
  assert.throws(()=>extendErasureScope(s,[{runId:peer.runId,operationId:'op-target12345'}]),/foreign-reference/);
});

test('continuity projection remains readable and preserves peer event contents',()=>fixture(root=>{
  const path=join(root,'events.json'),store=new ContinuityStore(path,'observations',()=>true);
  store.write({sequence:4,events:[{runId:run.runId,sequence:2},{runId:peer.runId,sequence:3,type:'peer'},{runId:run.runId,sequence:4}]});
  const next=projectErasure(readRuntimeJson(path).value,scope());writeRuntimeJson(path,next);
  const restored=new ContinuityStore(path,'observations',()=>true).snapshot();
  assert.deepEqual({...restored,instanceId:undefined},{sequence:4,events:[{runId:peer.runId,sequence:4,type:'peer'}],instanceId:undefined});
  assert.match(restored.instanceId,/^[a-f0-9-]{36}$/);
}));

test('unclassified textual reference fails without modifying any file',()=>fixture(root=>{
  const path=join(root,'data.json');writeRuntimeJson(path,{note:'a dependency on '+run.changeId});
  const before=readFileSync(path);assert.throws(()=>erasureFilePlan([root],scope()),/unclassified-reference/);assert.deepEqual(readFileSync(path),before);
}));

test('symlink refused and foreign target preserved',()=>fixture(root=>{
  const outside=join(root,'outside');mkdirSync(outside,{mode:0o700});const file=join(outside,'keep.json');writeRuntimeJson(file,{hello:'world'});
  const source=join(root,'source');mkdirSync(source,{mode:0o700});symlinkSync(file,join(source,'link.json'));
  assert.throws(()=>erasureFilePlan([source],scope()),/symlink-refused/);assert.deepEqual(readRuntimeJson(file).value,{hello:'world'});
}));

test('crash during writes resumes same transaction without restoring removed data',()=>fixture(root=>{
  const data=join(root,'data'),control=join(root,'control');mkdirSync(data,{mode:0o700});
  writeRuntimeJson(join(data,'one.json'),{rows:[run,peer]});writeRuntimeJson(join(data,'two.json'),{rows:[run]});
  const plan=erasureFilePlan([data],scope()),tx=new ErasureTransaction(control);
  const value=tx.prepare({...plan,roots:[data],coverage:['fixture']});let writes=0;
  assert.throws(()=>tx.applyFiles(value,{beforeWrite:()=>{if(++writes===2)throw new Error('crash')}}),/crash/);
  const resumed=new ErasureTransaction(control);resumed.applyFiles(resumed.load());
  const certificate=resumed.finish(value,()=>!erasureFilePlan([data],scope()).entries.length);
  assert.equal(resumed.load(),null);assert.equal(resumed.verify(certificate).status,'PURGED');
  assert.deepEqual(readRuntimeJson(join(data,'one.json')).value,{rows:[peer]});
  assert.equal(erasureReferences(readFileSync(join(data,'two.json'),'utf8'),scope()).length,0);
}));

test('tampered transaction and concurrent file updates refuse without overwriting',()=>fixture(root=>{
  const data=join(root,'data');mkdirSync(data,{mode:0o700});const path=join(data,'one.json');writeRuntimeJson(path,{rows:[run,peer]});
  const tx=new ErasureTransaction(join(root,'control')),v=tx.prepare({...erasureFilePlan([data],scope()),roots:[data]});
  const signed=readRuntimeJson(tx.path).value;signed.phase='FORGED';writeRuntimeJson(tx.path,signed);assert.throws(()=>tx.load(),/signature-invalid/);
  writeRuntimeJson(path,{rows:[run,peer],other:'new'});assert.throws(()=>tx.applyFiles(v),/source-divergent/);
  assert.equal(readRuntimeJson(path).value.other,'new');
}));

test('CANCELLED sans résultat natif exige un reçu de réconciliation qualifié',()=>{
 const r=registry(),op=r.coordination.operations['op-target12345'];op.state='CANCELLED';delete op.nativeResult;
 assert.throws(()=>erasureScope(r,run.changeId,'owner'),/operation-unreconciled/);
 const proof={state:'DONE',httpStatus:200,action:'reconcile-quarantined-port',ownerId:'owner',runId:run.runId,contextId:1,
  targetId:op.operationId,effectDigest:op.completionDigest,result:{executionOutcome:'HISTORICAL_OUTCOME_UNOBSERVED_RESOURCE_QUIESCENT',evidenceAuthority:'VERIFIED_NATIVE_PORT_PROBES'}};
 assert.ok(erasureScope(r,run.changeId,'owner',{terminalProofs:[proof]}));
 for(const patch of [{state:'PREPARED'},{httpStatus:409},{ownerId:'foreign'},{effectDigest:'b'.repeat(64)},{contextId:2}])
  assert.throws(()=>erasureScope(r,run.changeId,'owner',{terminalProofs:[{...proof,...patch}]}),/operation-unreconciled/);
});

test('mots courts et valeurs métier ne deviennent pas des identités par correspondance textuelle',()=>{
 const s={...scope(),changeId:'read',ids:[...scope().ids.filter(id=>id!==run.changeId),'read']};
 const data={rows:[{changeId:peer.changeId,runId:peer.runId,resources:[{mode:'read',key:'file:peer'}]}],note:'reader'};
 assert.deepEqual(projectErasure(data,s),data);assert.deepEqual(erasureReferences(data,s),[]);
});

test('racine trop large refusée avant lecture et sauvegardes de code CABU exclues',()=>fixture(root=>{
 assert.throws(()=>erasureFilePlan(['/tmp'],scope()),/root-too-broad/);
 const backup=join(root,'backup');mkdirSync(backup,{mode:0o700});writeFileSync(join(backup,'0'),'source globale', {mode:0o600});
 writeRuntimeJson(join(root,'receipt.json'),{rows:[run,peer]});
 const plan=erasureFilePlan([root],scope(),{sourceArtifactRoots:[root]});
 assert.equal(plan.entries.length,1);assert.ok(plan.entries[0].path.endsWith('receipt.json'));
 assert.equal(readFileSync(join(backup,'0'),'utf8'),'source globale');
}));

test('permissions internes 0775 protégées par une racine privée, sans chmod du dossier',()=>fixture(root=>{
 const nested=join(root,'runtime');mkdirSync(nested,{mode:0o775});
 chmodSync(nested,0o775);
 writeFileSync(join(nested,'state.json'),JSON.stringify({rows:[run,peer]})+'\n',{mode:0o775});
 const plan=erasureFilePlan([nested],scope()),tx=new ErasureTransaction(join(root,'control'));
 const value=tx.prepare({...plan,roots:[nested]});tx.applyFiles(value);
 assert.deepEqual(readRuntimeJson(join(nested,'state.json')).value,{rows:[peer]});
 assert.equal(statSync(nested).mode&0o777,0o775);
}));

test('adresses du moniteur de maintenance : profils IPv4/IPv6 et refus hors loopback',()=>{
 assert.equal(erasureMonitorEndpoint(),'http://127.0.0.1:8790/api/maintenance-identity');
 assert.equal(erasureMonitorEndpoint('::1','8791'),'http://[::1]:8791/api/maintenance-identity');
 for(const args of [['0.0.0.0','8790'],['127.0.0.1','8790/path'],['::1',80]])assert.throws(()=>erasureMonitorEndpoint(...args),/address-invalid/);
});

test('observation réancrée : nouveau curseur global, ancien curseur déclaré gap',()=>fixture(root=>{
 const path=join(root,'events.json'),journal=createObservationJournal({path});
 journal.record('operation-state-observed',{runId:run.runId,operationId:'op-target12345',operationState:'COMPLETED'});
 journal.record('operation-state-observed',{runId:peer.runId,operationId:'op-peer12345',operationState:'COMPLETED'});
 const old=journal.snapshot(),next=projectErasure(readRuntimeJson(path).value,scope());writeRuntimeJson(path,next);
 const restored=createObservationJournal({path}).snapshot(old.cursor);
 assert.notEqual(restored.instanceId,old.instanceId);assert.equal(restored.replay,'gap');
 assert.equal(restored.events.length,1);assert.equal(restored.events[0].operationId,'op-peer12345');
}));

test('contenu étranger snake_case dans un chemin cible : refus sans écriture',()=>fixture(root=>{
 const path=join(root,'runs',run.runId,'state.json');writeRuntimeJson(path,{run_id:peer.runId});const before=readFileSync(path);
 assert.throws(()=>erasureFilePlan([root],scope()),/owned-path-mixed-content/);assert.deepEqual(readFileSync(path),before);
}));

test('clé de contrôle perdue : aucun remplacement implicite pendant une reprise',()=>fixture(root=>{
 assert.throws(()=>new ErasureTransaction(root,{createKey:false}),/control-key-missing/);
 assert.equal(existsSync(join(root,'change-erasure.key')),false);
}));

test('sessions source/statistiques enregistrées : inventaire complet et copies natives identifiées',()=>{
 const docs=[{runId:run.runId,sourceSessions:['ses_statistics_old'],revokedSessions:['ses_previous_old']}];
 const s=extendErasureScope(scope(),docs);assert.ok(s.ids.includes('ses_statistics_old'));assert.ok(s.ids.includes('ses_previous_old'));
 assert.deepEqual(projectErasure([{id:'ses_statistics_old',directory:'/fixture'},{id:'ses_foreign',directory:'/fixture'}],s),[{id:'ses_foreign',directory:'/fixture'}]);
});

test('référence imbriquée nécessaire à un pair : refus avant modification',()=>{
 const data={runId:peer.runId,changeId:peer.changeId,operationIds:['op-target12345']};
 assert.throws(()=>projectErasure(data,scope()),/foreign-reference/);
});
