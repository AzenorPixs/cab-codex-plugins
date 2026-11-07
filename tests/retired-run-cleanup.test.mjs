import test from 'node:test';
import assert from 'node:assert/strict';
import {retiredRunScope,projectErasure,extendErasureScope} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-change-erasure.mjs';
function fixture(){
 const row=(runId,changeId,state,contextId,sessionId)=>({runId,changeId,state,contextId,version:contextId,sessionId,ownerId:'owner-'+runId,directory:'/fixture'});
 return {project:'/fixture',sequence:7,runs:[row('run-retired','change-final','DELIVERED',2,'ses_old'),row('run-protected','change-live','RESERVED',3,'ses_peer')],
 history:[row('run-retired','change-shared','ABANDONED',1,'ses_shared'),row('run-protected','change-shared','ABANDONED',4,'ses_shared')],coordination:{sequence:8,operations:{},accesses:{},testReservations:{}},requestOwners:{}};
}
const input={runIds:['run-retired'],protectedRunIds:['run-protected'],ownerId:'operator',evidence:['developer-explicit-cleanup']};
test('Lot fermé : aliases historiques inclus, identités partagées et pair réservés conservés',()=>{
 const registry=fixture(),scope=retiredRunScope(registry,input);
 assert.deepEqual(scope.changeIds,['change-final','change-shared']);assert.ok(scope.ids.includes('ses_old'));
 assert.equal(scope.ids.includes('ses_shared'),false);assert.equal(scope.ids.includes('change-shared'),false);
 const extended=extendErasureScope(scope,[{runId:'run-retired',sessionId:'ses_shared',changeId:'change-shared'}]);
 assert.equal(extended.ids.includes('ses_shared'),false);
 const projected=projectErasure(registry,extended);assert.deepEqual(projected.runs,[registry.runs[1]]);assert.deepEqual(projected.history,[registry.history[1]]);
});
test('Lot fermé : RUN courant, explicitement protégé et bail non soldé sont refusés',()=>{
 const registry=fixture();assert.throws(()=>retiredRunScope(registry,{...input,runIds:['run-protected']}),/protected-run/);
 assert.throws(()=>retiredRunScope(registry,{...input,runIds:['run-protected'],protectedRunIds:['other']}),/run-in-progress/);
 registry.coordination.testReservations.held={runId:'run-retired',state:'HELD'};assert.throws(()=>retiredRunScope(registry,input),/resource-unreleased/);
});
test('Lot fermé : source étrangère et inventaire modifié ne sont pas adoptés silencieusement',()=>{
 const registry=fixture(),a=retiredRunScope(registry,input);registry.runs[0].version++;
 assert.notEqual(retiredRunScope(registry,input).inventoryDigest,a.inventoryDigest);
 registry.runs[0].directory='/other';assert.throws(()=>retiredRunScope(registry,input),/foreign-reference/);
});
