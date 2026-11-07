import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,statSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {ErasureTransaction,erasureReferences} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-change-erasure.mjs';
import {ownerCleanup} from '../plugins/cab-approval-bridge/broker/cgpt_approval_bridge_owner_cleanup.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');

test('Références : motifs littéraux imbriqués, Unicode, identités typées et compatibilité RegExp',()=>{
 const ids=['op-fixture-123456789','fixture-123456789','ses_fixture_123456789'];
 const scope={ids,runIds:['short-run']};
 const text='é préfixe-op-fixture-123456789-suffixe ; ses_fixture_123456789';
 assert.deepEqual(new Set(erasureReferences({text,runId:'short-run'},{...scope,ids:[...ids,'short-run']})),new Set([...ids,'short-run']));
 assert.deepEqual(erasureReferences('aucune référence\n{"peer":"préservé"}',scope),[]);
 assert.deepEqual(erasureReferences(text,scope,/ses_fixture_123456789/g),['ses_fixture_123456789']);
});

test('Reprise propriétaire : reçu signé supérieur à64Mio, candidats déjà appliqués non réécrits',t=>{
 const home=mkdtempSync(join(tmpdir(),'cab-large-owner-'));t.after(()=>rmSync(home,{recursive:true,force:true}));
 const workspace=join(home,'project');mkdirSync(workspace);
 const scope={workspace,changeId:'change-fixture-large',runIds:['run-fixture-large'],ids:['change-fixture-large','run-fixture-large']};
 const broker=join(home,'private-broker');mkdirSync(broker,{mode:0o700});
 const path=join(broker,'peer.json'),text=JSON.stringify({peer:'preserved',padding:'"'.repeat(17*1024*1024)})+'\n';
 writeFileSync(path,text,{mode:0o600});
 const before=statSync(path),transactionId='erasure-12345678-1234-1234-1234-123456789abc';
 const tx=new ErasureTransaction(join(home,'.local/state/cab-owner-erasure',hash(workspace)));
 tx.save({protocol:'cab-change-erasure-v1',transactionId,scope,effectiveScope:scope,phase:'APPLYING',roots:[broker],journalPaths:[],entries:[{path,before:hash('previous'),text,remove:false}]});
 assert.ok(statSync(tx.path).size>64*1024*1024);
 const result=ownerCleanup({action:'commit',scope,transactionId},{home});
 assert.equal(result.state,'APPLIED');
 assert.equal(statSync(path).ino,before.ino);assert.equal(statSync(path).mtimeMs,before.mtimeMs);
 assert.equal(hash(readFileSync(path)),hash(text));
 assert.ok(statSync(tx.path).size<4096);assert.equal(tx.load().phase,'APPLIED');
});

for(const mode of ['peer-progress','marker-diverged','target-reintroduced'])test('Reprise après marqueur signé : '+mode,t=>{
 const home=mkdtempSync(join(tmpdir(),'cab-epoch-owner-'));t.after(()=>rmSync(home,{recursive:true,force:true}));
 const workspace=join(home,'project');mkdirSync(workspace);
 const scope={workspace,changeId:'change-fixture-epoch',runIds:['run-fixture-epoch'],ids:['change-fixture-epoch','run-fixture-epoch']};
 const broker=join(home,'private-broker');mkdirSync(broker,{mode:0o700});
 const dataPath=join(broker,'peer.json'),journal=join(broker,'events.ndjson'),epochPath=journal+'.erasure-epoch.json';
 const epoch=JSON.stringify({epoch:'123456789',generation:3})+'\n';
 const current=JSON.stringify({peer:'advanced',...(mode==='target-reintroduced'?{runId:scope.runIds[0]}:{})})+'\n';
 writeFileSync(dataPath,current,{mode:0o600});writeFileSync(journal,'', {mode:0o600});
 writeFileSync(epochPath,mode==='marker-diverged'?JSON.stringify({epoch:'other',generation:3})+'\n':epoch,{mode:0o600});
 const transactionId='erasure-12345678-1234-1234-1234-123456789abc';
 const tx=new ErasureTransaction(join(home,'.local/state/cab-owner-erasure',hash(workspace)));
 tx.save({protocol:'cab-change-erasure-v1',transactionId,scope,effectiveScope:scope,phase:'APPLYING',roots:[broker],journalPaths:[journal],entries:[
  {path:dataPath,before:hash('before'),text:JSON.stringify({peer:'old'})+'\n',remove:false},
  {path:epochPath,before:null,text:epoch,remove:false}]});
 if(mode==='peer-progress')assert.equal(ownerCleanup({action:'commit',scope,transactionId},{home}).state,'APPLIED');
 else assert.throws(()=>ownerCleanup({action:'commit',scope,transactionId},{home}),mode==='marker-diverged'?/source-divergent/:/absence-unverified/);
 assert.equal(readFileSync(dataPath,'utf8'),current);
});
