import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,statSync,rmSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {ErasureTransaction} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-change-erasure.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'cab-candidates-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const state=join(root,'state'),update=join(root,'update');mkdirSync(state,{mode:0o700});mkdirSync(update,{mode:0o700});
 const tx=new ErasureTransaction(state),transactionId='erasure-12345678-1234-1234-1234-123456789abc';
 const scope={workspace:'/fixture',changeId:'change-target-123456',runIds:['run-target-123456'],ids:['run-target-123456']};
 const value={transactionId,scope,phase:'STOPPING',roots:[state,update]};tx.save(value);
 return {root,state,update,tx,value,directory:join(update,'erasure-candidates',transactionId)};
}

test('Candidats : plan cumulé supérieur à128Mio, reçu compact, ancien lecteur fermé et reprise sans réécriture',async t=>{
 const f=fixture(t),next={peer:'kept',padding:'x'.repeat(45*1024*1024)},text=JSON.stringify(next)+'\n';
 const entries=[];
 for(let i=0;i<3;i++){const path=join(f.state,'peer-'+i+'.json');writeFileSync(path,'{"before":true}\n',{mode:0o600});entries.push({path,before:hash(readFileSync(path)),next,remove:false});}
 assert.ok(Buffer.byteLength(text)*3>128*1024*1024);
 const value=f.tx.stageCandidates({...f.value,phase:'APPLYING',entries},f.directory);f.tx.save(value);
 assert.ok(statSync(f.tx.path).size<10000);
 if(process.env.CAB_TEST_LEGACY_BROKER_REF){
  const legacy=join(f.root,'legacy');mkdirSync(legacy);
  for(const name of ['change-erasure','continuity','state-layout','observation-statistics']){
   const file='cgpt-approval-bridge-'+name+'.mjs';const bytes=execFileSync('git',['-c','safe.directory='+process.cwd(),'show',process.env.CAB_TEST_LEGACY_BROKER_REF+':plugins/cab-approval-bridge/scripts/'+file],{maxBuffer:4*1024*1024});writeFileSync(join(legacy,file),bytes);
  }
  const old=await import(pathToFileURL(join(legacy,'cgpt-approval-bridge-change-erasure.mjs')).href);
  const oldTx=new old.ErasureTransaction(f.state,{createKey:false});
  assert.throws(()=>oldTx.applyFiles(oldTx.load()),/source-divergent/);
  assert.equal(readFileSync(entries[0].path,'utf8'),'{"before":true}\n');
 }
 f.tx.applyFiles(value);const before=statSync(entries[0].path);
 assert.equal(hash(readFileSync(entries[0].path)),hash(text));
 rmSync(value.entries[0].candidate.path);f.tx.applyFiles(value);
 assert.equal(statSync(entries[0].path).mtimeMs,before.mtimeMs);
 const compact={...value,phase:'RESTARTING',entries:[]};f.tx.save(compact);f.tx.clearCandidates(compact);f.tx.clearCandidates(compact);
 assert.equal(existsSync(f.directory),false);
});

for(const kind of ['tampered','outside'])test('Candidat nécessaire refusé sans écriture : '+kind,t=>{
 const f=fixture(t),path=join(f.state,'peer.json');writeFileSync(path,'{"before":true}\n',{mode:0o600});
 const value=f.tx.stageCandidates({...f.value,phase:'APPLYING',entries:[{path,before:hash(readFileSync(path)),next:{peer:'after'},remove:false}]},f.directory);
 if(kind==='tampered')writeFileSync(value.entries[0].candidate.path,'tampered');else value.entries[0].candidate.path='/etc/passwd';
 assert.throws(()=>f.tx.applyFiles(value),kind==='tampered'?/candidate-divergent/:/candidate-reference-invalid/);
 assert.equal(readFileSync(path,'utf8'),'{"before":true}\n');
});
