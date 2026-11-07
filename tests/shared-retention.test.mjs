import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {extendErasureScope,reconcileRetiredRetention,retentionOnlyRebind,projectErasure,erasureReferences,ErasureTransaction} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-change-erasure.mjs';
import {canonicalContinuityDigest,renewErasureHandoff} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-continuity.mjs';
import {ownerCleanup} from '../plugins/cab-approval-bridge/broker/cgpt_approval_bridge_owner_cleanup.mjs';
const scope=()=>({workspace:'/fixture',changeId:'batch-maintenance',ownerId:'operator',runIds:['run-retired'],protectedRunIds:['run-protected'],changeIds:['old-change'],ids:['run-retired','old-change','source-shared'],sharedIdentityIds:['run-protected','live-change'],closureAuthority:'authoritative-retired-run-batch-v1'});
const tx=()=>({protocol:'cab-change-erasure-v1',transactionId:'erasure-11111111-1111-4111-8111-111111111111',scope:scope(),phase:'FREEZING',brokerTransport:'owner-local-v1',entries:[],ownerReceipts:{prepare:{state:'PREPARED',uid:1002}}});
const request=v=>({sharedIdentityIds:['source-shared'],evidence:['owner-journal-shared-identity-observed'],ownerStatus:{protocol:'cab-owner-erasure-v1',uid:1002,transactionId:v.transactionId,state:'PREPARED',scopeDigest:canonicalContinuityDigest(v.scope)}});
test('Rétention : même périmètre, référence secondaire partagée conservée et absence honnête',()=>{
 const v=tx(),next=reconcileRetiredRetention(v,request(v));assert.deepEqual(next.scope.runIds,v.scope.runIds);assert.deepEqual(next.scope.ids,v.scope.ids);assert.equal(next.phase,'SEALED');
 const data=[{runId:'run-retired',changeId:'old-change',requestId:'source-shared'},{runId:'run-protected',changeId:'live-change',requestId:'source-shared'}];
 assert.deepEqual(projectErasure(data,next.scope),[data[1]]);assert.deepEqual(erasureReferences([data[1]],next.scope),[]);assert.equal(retentionOnlyRebind(v.scope,next.scope),true);
});
test('Rétention : phase appliquée, RUN/SID primaire et preuve étrangère refusés',()=>{
 const v=tx();for(const phase of ['APPLYING','RESTARTING','CERTIFIED'])assert.throws(()=>reconcileRetiredRetention({...v,phase},request(v)),/reconciliation-refused/);
 assert.throws(()=>reconcileRetiredRetention(v,{...request(v),sharedIdentityIds:['run-retired']}),/reconciliation-refused/);
 assert.throws(()=>reconcileRetiredRetention(v,{...request(v),ownerStatus:{...request(v).ownerStatus,state:'APPLIED'}}),/reconciliation-refused/);
 assert.equal(retentionOnlyRebind(v.scope,{...v.scope,runIds:['another-run']}),false);
 const extra=reconcileRetiredRetention(v,{...request(v),sharedIdentityIds:['source-private-secondary']});assert.deepEqual(extra.scope.ids,v.scope.ids);assert.equal(retentionOnlyRebind(v.scope,extra.scope),true);
});
test('Propriétaire : réancrage PREPARED sans application, refus après début d’application',t=>{
 const home=mkdtempSync(join(tmpdir(),'cab-retention-owner-'));t.after(()=>rmSync(home,{recursive:true,force:true}));const v=tx(),next=reconcileRetiredRetention(v,request(v));
 assert.equal(ownerCleanup({action:'prepare',scope:v.scope,transactionId:v.transactionId},{home}).state,'PREPARED');
 assert.equal(ownerCleanup({action:'prepare',scope:next.scope,transactionId:v.transactionId},{home}).state,'PREPARED');
 const root=join(home,'.local/state/cab-owner-erasure',canonicalHash('/fixture'));
 const store=new ErasureTransaction(root),value=store.load();store.save({...value,phase:'APPLYING'});
 assert.throws(()=>ownerCleanup({action:'prepare',scope:{...next.scope,sharedIdentityIds:[...next.scope.sharedIdentityIds,'old-change']},transactionId:v.transactionId},{home}),/transaction-divergent/);
});
import {createHash} from 'node:crypto';function canonicalHash(value){return createHash('sha256').update(value).digest('hex')}
test('Transfert : renouvellement du même reçu après projection exacte, divergence refusée',()=>{
 const nativeIdentity={pid:42,version:'2.2.5',directory:'/fixture'},registry={version:'runtime',project:'/fixture',runs:[]};const {version,...data}=registry;
 const envelope={sequence:3,value:{state:'SEALED',transactionId:'continuity-proof',workspace:'/fixture',nativeIdentity,registryDigest:canonicalContinuityDigest(data),preparedAt:100,expiresAt:30100}};
 const args={workspace:'/fixture',transactionId:'continuity-proof',nativeIdentity,registrySnapshot:registry,at:60000};const renewed=renewErasureHandoff(envelope,args);
 assert.equal(renewed.value.expiresAt,90000);assert.equal(renewed.value.registryDigest,envelope.value.registryDigest);assert.equal(renewed.value.transactionId,envelope.value.transactionId);
 assert.throws(()=>renewErasureHandoff(envelope,{...args,nativeIdentity:{...nativeIdentity,pid:43}}),/boundary-divergent/);assert.throws(()=>renewErasureHandoff(envelope,{...args,registrySnapshot:{...registry,runs:[{}]}}),/boundary-divergent/);
});

import {pendingReconciliationEffects} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs';
test('Réconciliation : l’approbation connue non émise ne se bloque pas elle-même ; décisions et effets inconnus restent protégés',()=>{
 const base={currentMandate:'',reconcilingCount:0,unmatchedCount:0,validations:[{requestId:'approved-unissued'}],decisionFor:()=>({decision:'approved'}),ignoredRequestIds:['approved-unissued']};
 assert.equal(pendingReconciliationEffects(base),false);
 for(const patch of [{currentMandate:'active'},{reconcilingCount:1},{unmatchedCount:1},{decisionFor:()=>null},{ignoredRequestIds:[]}])assert.equal(pendingReconciliationEffects({...base,...patch}),true);
 assert.equal(pendingReconciliationEffects({...base,validations:[...base.validations,{requestId:'unknown-pending'}]}),true);
});

test('Pairs : citations opaques conservées sans mutation, objets externes toujours examinés',()=>{
 const s=scope(),peer={run_id:'run-protected',directory:s.workspace,approval_id:'approval-live',summary:'audit run-retired/old-change',resources:[{key:'file:output/run-retired/log'}]};
 const value={approvals:{live:peer,old:{run_id:'run-retired',approval_id:'approval-old'}}};
 const projected=projectErasure(value,s);assert.deepEqual(projected.approvals.live,peer);assert.equal(projected.approvals.old,undefined);assert.deepEqual(erasureReferences(projected,s),[]);
 assert.ok(erasureReferences({unclassified:'run-retired'},s).includes('run-retired'));
});
test('Pairs : aucune exemption pour RUN contradictoire ou répertoire étranger',()=>{
 const s=scope();for(const peer of [{run_id:'run-protected',runId:'run-retired'}, {run_id:'run-protected',directory:'/foreign',text:'run-retired'}]) {
  assert.ok(erasureReferences(peer,s).length>0);
 }
});

test('Pairs : appartenance primaire prioritaire malgré collision secondaire historique',()=>{
 const s=scope(),peer={run_id:'run-protected',sessionId:'shared-legacy-session',operation_id:'source-shared',summary:'run-retired'};s.ids.push('shared-legacy-session','null');
 const payload={contexts:[peer,{run_id:'run-retired',operation_id:'source-shared'}],metadata:{access_id:'null'}};
 const projected=projectErasure(payload,s);assert.deepEqual(projected.contexts,[peer]);assert.deepEqual(projected.metadata,{access_id:'null'});assert.deepEqual(erasureReferences(projected,s),[]);
 assert.deepEqual(extendErasureScope(s,[payload]).ids,s.ids.slice().filter(x=>x!=='null').sort());
});

test('Pairs : agrégat partagé conservé et sous-contextes cibles seuls projetés',()=>{
 const s=scope(),peer={run_id:'run-protected',sessionId:'source-shared'},old={run_id:'run-retired',sessionId:'source-shared'};
 s.sharedIdentityIds.push('old-change');const data=[{changeId:'old-change',contexts:[peer,old]}];assert.deepEqual(projectErasure(data,s),[{changeId:'old-change',contexts:[peer]}]);assert.deepEqual(erasureReferences(projectErasure(data,s),s),[]);
});

import {mkdirSync,writeFileSync} from 'node:fs';import {erasureFilePlan} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-change-erasure.mjs';
test('Pairs : fichier de job sans RUN interne conservé par son chemin propriétaire',t=>{
 const root=mkdtempSync(join(tmpdir(),'cab-protected-path-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 for(const id of ['run-protected','run-retired']){mkdirSync(join(root,'runs',id,'1'),{recursive:true});writeFileSync(join(root,'runs',id,'1','controller-job.json'),JSON.stringify({changeId:id==='run-protected'?'live-change':'old-change',sessionId:'source-shared'}));}
 const plan=erasureFilePlan([root],scope());assert.equal(plan.entries.length,1);assert.ok(plan.entries[0].path.includes('/run-retired/'));
});

test('Pairs : une clé cible ne supprime pas sa valeur protégée ni sa preuve d’absence',()=>{
 const s=scope(),peer={run_id:'run-protected',operationId:'source-shared',state:'COMPLETED'},old={run_id:'run-retired',operationId:'old-unique'};
 const data={operations:{'source-shared':peer,'old-unique':old}};s.ids.push('old-unique');
 const next=projectErasure(data,s);assert.deepEqual(next,{operations:{'source-shared':peer}});assert.deepEqual(erasureReferences(next,s),[]);
});
