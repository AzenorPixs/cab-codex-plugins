import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {NativeInstances} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-native-instances.mjs';
function fixture(t){const root=mkdtempSync(join(tmpdir(),'cab-instances-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const updateRoot=join(root,'updates');mkdirSync(updateRoot);return {root,updateRoot,native:{pid:process.pid,version:'2.2.4'}};}
test('instance native : observation durable avant invocation et preuve en lecture seule',async t=>{
 const h=fixture(t),file=join(h.root,'instances.json'),journal=new NativeInstances(h.root,file,h.updateRoot);
 const observed=await journal.observe(h.native),before=readFileSync(file,'utf8');
 const proof=await journal.proof(h.native,Date.now()+1000);assert.equal(proof.kind,'controller-native-instance');assert.equal(proof.startTime,observed.startTime);
 assert.equal(readFileSync(file,'utf8'),before);
});
test('instance ancienne : reçu CABU scope/PID/version concordant, sans observation rétroactive fabriquée',async t=>{
 const h=fixture(t),file=join(h.root,'instances.json'),contextKey='c'.repeat(64),id='update-11111111-1111-4111-8111-111111111111';
 writeFileSync(join(h.updateRoot,'current.json'),JSON.stringify({contextKey}),{mode:0o600});mkdirSync(join(h.updateRoot,id));
 writeFileSync(join(h.updateRoot,id,'receipt.json'),JSON.stringify({phase:'COMPLETED',contextKey,updatedAt:new Date(Date.now()-5000).toISOString(),nativeIdentity:{pid:process.pid,version:h.native.version,sharedDirectory:h.root}}),{mode:0o600});
 const journal=new NativeInstances(h.root,file,h.updateRoot),proof=await journal.proof(h.native,Date.now()-1000);
 assert.equal(proof.kind,'legacy-cabu-native-instance');assert.equal(proof.receiptId,id);assert.equal(proof.legacyCgroupUnrecorded,true);
 assert.equal(existsSync(file),false);
});
test('instance : cgroup connu divergent ne se reconstruit pas depuis un PID ancien',async t=>{
 const h=fixture(t),journal=new NativeInstances(h.root,join(h.root,'instances.json'),h.updateRoot),observed=await journal.observe(h.native);
 journal.rows=[{...observed,cgroupDigest:'0'.repeat(64)}];
 assert.equal(await journal.proof(h.native,Date.now()+1000),null);
});
