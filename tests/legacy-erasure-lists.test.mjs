import test from 'node:test';
import assert from 'node:assert/strict';
import {projectErasure,erasureReferences} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-change-erasure.mjs';
import {continuityDigest} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-continuity.mjs';

test('Migration : liste de once ciblée, pairs et booléens conservés',()=>{
 const target='request-target-123456789',peer='request-peer-123456789';
 const scope={ids:[target],runIds:[]};
 const source={protocol:'cab-private-state-migration-v1',inventory:{onceAcknowledged:[peer,target]},native:{onceAcknowledged:true}};
 const next=projectErasure(source,scope);
 assert.deepEqual(next.inventory.onceAcknowledged,[peer]);assert.equal(next.native.onceAcknowledged,true);
 assert.equal(erasureReferences(next,scope).length,0);assert.deepEqual(source.inventory.onceAcknowledged,[peer,target]);
});

test('Transfert : accès ciblé retiré, ordre des pairs et digest réancré',()=>{
 const target='access-target-123456789',peers=['access-peer-123456789','access-other-123456789'];
 const value={restoredAccesses:[peers[0],target,peers[1]]};
 const source={protocol:'cab-continuity-v1',kind:'transport',instanceId:'fixture',sequence:1,value,digest:continuityDigest(value)};
 const next=projectErasure(source,{ids:[target],runIds:[]});
 assert.deepEqual(next.value.restoredAccesses,peers);assert.equal(next.digest,continuityDigest(next.value));assert.equal(next.sequence,2);
 assert.notEqual(next.digest,source.digest);
});

test('Liste typée : aucune suppression par simple préfixe',()=>{
 const target='request-target-123456789',near=target+'-peer';
 const next=projectErasure({inventory:{onceAcknowledged:[near,target]}},{ids:[target],runIds:[]});
 assert.deepEqual(next.inventory.onceAcknowledged,[near]);
 assert.ok(erasureReferences(next,{ids:[target],runIds:[]}).length>0);
});
