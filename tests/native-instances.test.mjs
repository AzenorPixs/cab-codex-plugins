import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {NativeInstances} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-native-instances.mjs';
function fixture(t){const root=mkdtempSync(join(tmpdir(),'cab-instances-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const updateRoot=join(root,'updates');mkdirSync(updateRoot);return {root,updateRoot,native:{pid:process.pid,version:'2.4.5'}};}
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

test('reboot : frontière postérieure au call, sans ancien PID ni observation antidatée',async t=>{
 const h=fixture(t),journal=new NativeInstances(h.root,join(h.root,'instances.json'),h.updateRoot);
 const boot=Number(readFileSync('/proc/stat','utf8').match(/^btime (\d+)$/m)[1])*1000;
 const before=Date.now(),proof=await journal.rebootProof(h.native,boot-2000);
 assert.ok(proof.observedAt>=before);assert.ok(proof.observedAt<=Date.now());
 assert.equal((await journal.rebootProof(h.native,boot-2000)).observedAt,proof.observedAt);
 assert.equal(proof.kind,'kernel-reboot-after-call');assert.equal(proof.kernelBootMs,boot);
 assert.equal(proof.pid,process.pid);assert.match(proof.bootIdSha256,/^[a-f0-9]{64}$/);
 assert.equal(await journal.rebootProof(h.native,boot),null);
 assert.equal(await journal.rebootProof(h.native,Date.now()),null);
 assert.equal(await journal.rebootProof(h.native,NaN),null);
 const path=join(h.root,'instances.json');assert.equal(existsSync(path),true);
 const restored=new NativeInstances(h.root,path,h.updateRoot);assert.equal((await restored.rebootProof(h.native,boot-2000)).observedAt,proof.observedAt);
});

test('observation de noyau tardive conserve la première preuve native antérieure au call',async t=>{
 const h=fixture(t),journal=new NativeInstances(h.root,join(h.root,'instances.json'),h.updateRoot),first=await journal.observe(h.native),invocation=first.observedAt+1;
 await new Promise(resolve=>setTimeout(resolve,5));const epoch=await journal.kernelEpoch(h.native);assert.ok(epoch.observedAt>invocation);
 const proof=await journal.proof(h.native,invocation);assert.equal(proof.kind,'controller-native-instance');assert.equal(proof.observedAt,first.observedAt);
});

test('preuve native : une ancienne observation antérieure au boot ne qualifie jamais un PID réutilisé',async t=>{
 const h=fixture(t),journal=new NativeInstances(h.root,join(h.root,'instances.json'),h.updateRoot),identity=await journal.identity(h.native);
 const boot=Number(readFileSync('/proc/stat','utf8').match(/^btime (\d+)$/m)[1])*1000;
 journal.rows=[{...identity,observedAt:boot-2000}];assert.equal(await journal.proof(h.native,boot-1000),null);
});
