import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync,statSync,chmodSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {legacyStateDirectory,legacyRuntimeFiles,initializeRuntimeState,writeRuntimeJson} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-state-layout.mjs';
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'cab-adopt-')),workspace=join(root,'project'),destination=join(root,'private');mkdirSync(workspace);mkdirSync(destination,{mode:0o700});
 const source=legacyStateDirectory(workspace);mkdirSync(source,{recursive:true});
 const bytes=JSON.stringify({project:workspace,schemaVersion:4,runs:[],syntheticOnceAcknowledged:true})+'\n';
 writeFileSync(join(source,'controller-runs.json'),bytes,{mode:0o775});writeFileSync(join(source,'controller-statistics.json'),'{"coverage":"known"}\n',{mode:0o775});
 writeFileSync(join(destination,'controller-runs.json'),bytes,{mode:0o600});
 const captured=legacyRuntimeFiles(workspace).map(({name,sha256})=>({name,sha256}));t.after(()=>rmSync(root,{recursive:true,force:true}));
 return {root,workspace,destination,source,bytes,captured,marker:join(destination,'runtime-layout.json')};
}
test('adoption : preuve complète, octets/inode existants conservés, reprise idempotente',t=>{
 const h=fixture(t),path=join(h.destination,'controller-runs.json'),before=statSync(path);
 const value=initializeRuntimeState(h.workspace,h.destination,{validatedSourceFiles:[...h.captured].reverse()});
 assert.equal(value.phase,'READY');assert.equal(value.adoptedRegistrySha256,h.captured.find(x=>x.name==='controller-runs.json').sha256);
 assert.equal(readFileSync(path,'utf8'),h.bytes);assert.equal(statSync(path).ino,before.ino);assert.equal(statSync(path).mtimeMs,before.mtimeMs);
 assert.equal(statSync(path).mode&0o777,0o600);assert.equal(statSync(join(h.source,'controller-runs.json')).mode&0o777,0o775);
 assert.deepEqual(readFileSync(join(h.destination,'controller-statistics.json')),readFileSync(join(h.source,'controller-statistics.json')));
 assert.deepEqual(initializeRuntimeState(h.workspace,h.destination,{validatedSourceFiles:h.captured}),value);
});
for(const variant of ['no-proof','registry','auxiliary','foreign-file','source-changed','partial-proof','unsafe-mode','symlink'])test('adoption refusée sans mutation : '+variant,t=>{
 const h=fixture(t),target=join(h.destination,'controller-runs.json');let proof=h.captured;
 if(variant==='registry')writeFileSync(target,'{"foreign":true}\n');
 if(variant==='auxiliary')writeFileSync(join(h.destination,'controller-statistics.json'),'{"foreign":true}\n',{mode:0o600});
 if(variant==='foreign-file')writeFileSync(join(h.destination,'controller-job.json'),'{"foreign":true}\n',{mode:0o600});
 if(variant==='source-changed')writeFileSync(join(h.source,'controller-runs.json'),h.bytes+' ');
 if(variant==='partial-proof')proof=proof.slice(0,1);
 if(variant==='unsafe-mode')chmodSync(target,0o640);
 if(variant==='symlink'){rmSync(target);symlinkSync(join(h.source,'controller-runs.json'),target);}
 const sourceBefore=readFileSync(join(h.source,'controller-runs.json')),targetBefore=readFileSync(target);
 assert.throws(()=>initializeRuntimeState(h.workspace,h.destination,variant==='no-proof'?{}:{validatedSourceFiles:proof}));
 assert.equal(existsSync(h.marker),false);assert.deepEqual(readFileSync(join(h.source,'controller-runs.json')),sourceBefore);assert.deepEqual(readFileSync(target),targetBefore);
});
test('adoption interrompue : manifeste COPYING garde son empreinte et reprend sans réécrire le registre',t=>{
 const h=fixture(t),sha=h.captured.find(x=>x.name==='controller-runs.json').sha256;
 writeRuntimeJson(h.marker,{schema:1,workspace:h.workspace,layout:'private-user-state-v1',source:h.source,phase:'COPYING',migrationId:'migration-fixture',files:h.captured,adoptedRegistrySha256:sha});
 const before=statSync(join(h.destination,'controller-runs.json')).ino;
 const value=initializeRuntimeState(h.workspace,h.destination,{validatedSourceFiles:h.captured});
 assert.equal(value.phase,'READY');assert.equal(value.adoptedRegistrySha256,sha);assert.equal(value.migrationId,'migration-fixture');assert.equal(statSync(join(h.destination,'controller-runs.json')).ino,before);
});
