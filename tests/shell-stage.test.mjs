import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,chmodSync,symlinkSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {ShellStageStore,shellPayloadDigest,shellPayloadLauncher,assertShellDelivery} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-shell-stage.mjs';
function fixture(t){const root=mkdtempSync(join(tmpdir(),'cab-shell-stage-'));t.after(()=>rmSync(root,{recursive:true,force:true}));return join(root,'stages.json')}
const input=()=>({stageId:'stage-one',jobId:'job-one',sessionId:'ses_one',reservationVersion:1,requestId:'request-one',approvalId:'approval-one',operationId:'op-one',payload:'printf "é\\n"\n',payloadSha256:shellPayloadDigest('printf "é\\n"\n')});
const binding=()=>({runId:'run-one',contextId:1,directory:'/workspace',host:'127.0.0.1',port:8788,opencodePid:42});
test('porte-mandat : octets immuables, idempotence, corps privé et restauration',t=>{
 const path=fixture(t),s=new ShellStageStore(path),i=input(),d=s.create(i,binding());
 assert.equal(d.payload,undefined);assert.ok(d.command.includes(i.payloadSha256));assert.equal(statSync(path).mode&0o777,0o600);
 assert.deepEqual(s.create(Object.fromEntries(Object.entries(i).reverse()),binding()),d);assert.deepEqual(new ShellStageStore(path).describe(i.stageId),d);
 assert.equal(s.get(i.stageId).payload,i.payload);const b=readFileSync(path);
 const op={kind:'bash',runId:'run-one',sessionId:i.sessionId,directory:'/workspace',reservationVersion:1,operationId:i.operationId,target:d.command};
 assert.equal(s.review(op,i.requestId).payload,i.payload);assert.equal(s.review({...op,target:d.command+'x'},i.requestId),null);assert.equal(s.review(op,'foreign'),null);
 assert.throws(()=>s.create({...i,payload:'different',payloadSha256:shellPayloadDigest('different')},binding()),/identity-divergent/);assert.deepEqual(readFileSync(path),b);
});
test('porte-mandat : valeurs/encodages/limites et lanceur étranger refusés',t=>{
 const s=new ShellStageStore(fixture(t));
 for(const p of ['', '\0','\ud800','a'.repeat(65537)])assert.throws(()=>shellPayloadDigest(p),/payload-invalid/);
 for(const change of [i=>i.payloadSha256='0'.repeat(64),i=>i.stageId='../escape',i=>i.reservationVersion=0,i=>i.extra=true]){const i=input();change(i);assert.throws(()=>s.create(i,binding()),/shell-stage-/);}
 assert.notEqual(shellPayloadDigest('é'),shellPayloadDigest('e\u0301'));assert.notEqual(shellPayloadDigest('x\n'),shellPayloadDigest('x\r\n'));
 assert.throws(()=>shellPayloadLauncher({...binding(),host:'remote.example',stageId:'one',bytes:1,sha256:'a'.repeat(64)}),/launcher-invalid/);
});
test('porte-mandat : fichier lié, mode ouvert et contenu altéré ne se restaurent pas',t=>{
 const path=fixture(t),s=new ShellStageStore(path);s.create(input(),binding());const copy=path+'.link';symlinkSync(path,copy);assert.throws(()=>new ShellStageStore(copy));
 chmodSync(path,0o640);assert.throws(()=>new ShellStageStore(path),/store-unsafe/);chmodSync(path,0o600);
 const raw=JSON.parse(readFileSync(path));raw.stages[0].payload+='x';writeFileSync(path,JSON.stringify(raw));assert.throws(()=>new ShellStageStore(path),/shell-stage-/);
});
function delivery(stage){return {run:{runId:stage.runId,contextId:1,version:1,state:'RESERVED'},job:{armed:true,strictCommands:true,jobId:stage.jobId,sessionId:stage.sessionId,directory:stage.directory},
 operation:{kind:'bash',target:stage.command,operationId:stage.operationId,sessionId:stage.sessionId,directory:stage.directory,runId:stage.runId,reservationVersion:1,operationDigest:'a'.repeat(64)},
 decision:{decision:'approved',approval_id:stage.approvalId,requestId:stage.requestId,run_id:stage.runId,reservation_version:1},
 registered:{operationId:stage.operationId,requestId:stage.requestId,runId:stage.runId,contextId:1,version:1,sessionId:stage.sessionId,state:'EXECUTING',accessId:'access',operationDigest:'a'.repeat(64),
 native:{onceAcknowledged:true,kind:'bash',callId:'call_one',targetDigest:createHash('sha256').update(JSON.stringify(['bash',stage.command])).digest('hex')}},
 access:{accessId:'access',runId:stage.runId,contextId:1,version:1,state:'EXECUTING',operationIds:[stage.operationId]},restored:false,pid:42,host:'127.0.0.1',port:8788}}
test('livraison : décision/once/accès/contexte exacts requis, aucune restauration implicite',t=>{
 const store=new ShellStageStore(fixture(t));store.create(input(),binding());const stage=store.get('stage-one');assert.equal(assertShellDelivery(stage,delivery(stage)),true);
 for(const change of [x=>x.decision.decision='rejected',x=>x.decision.approval_id='other',x=>x.operation.target+='x',x=>x.registered.native.onceAcknowledged=false,x=>x.registered.state='ISSUING',x=>x.registered.native.callId=null,x=>x.access.state='HELD',x=>x.restored=true,x=>x.pid=43,x=>x.run.suspension={action:'PAUSE'},x=>x.job.recovery={},x=>x.job.sessionId='foreign',x=>x.access.operationIds=[]]){const x=delivery(stage);change(x);assert.throws(()=>assertShellDelivery(stage,x),/delivery-refused/);}
});

async function launch(command,directory,stdin='') {
  const child=spawn('/bin/bash',['-c',command],{cwd:directory,stdio:['pipe','pipe','pipe'],env:{...process.env,CAB_STAGE_FIXTURE:'inherited'}});
  let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);child.stdin.end(stdin);
  const exit=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve)});return {exit,stdout,stderr};
}
test('lanceur : espace/apostrophe du CWD, stdin, environnement, Unicode et exit conservés',async t=>{
  const directory=mkdtempSync(join(tmpdir(),"cab-stage quote's-"));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const payload='read -r value\ntest "$value" = "entrée" || exit 90\ntest "$CAB_STAGE_FIXTURE" = "inherited" || exit 91\nprintf "sortie-é\\n"\nexit 7\n';let calls=0;
  const server=createServer((req,res)=>{calls++;res.end(payload)});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const command=shellPayloadLauncher({host:'127.0.0.1',port:server.address().port,runId:'one',stageId:'two',bytes:Buffer.byteLength(payload),sha256:shellPayloadDigest(payload),directory});
  const result=await launch(command,directory,'entrée\n');assert.equal(result.exit,7);assert.equal(result.stdout,'sortie-é\n');assert.equal(result.stderr,'');assert.equal(calls,1);
});
test('lanceur : statut, redirection, hash et CWD invalides restent sans payload ni retry',async t=>{
  const directory=mkdtempSync(join(tmpdir(),'cab-stage-refuse-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const payload='printf PAYLOAD_EXECUTED\n';let status=200,calls=0;
  const server=createServer((req,res)=>{calls++;res.writeHead(status,{location:'http://127.0.0.1:1/never'});res.end(payload)});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  for(const mode of ['status','redirect','hash','cwd']){
    status=mode==='status'?503:mode==='redirect'?302:200;calls=0;
    const command=shellPayloadLauncher({host:'127.0.0.1',port:server.address().port,runId:'one',stageId:'two',bytes:Buffer.byteLength(payload),sha256:mode==='hash'?'0'.repeat(64):shellPayloadDigest(payload),directory:mode==='cwd'?directory+'/different':directory});
    const result=await launch(command,directory);assert.equal(result.exit,125);assert.equal(result.stdout,'');assert.equal(result.stderr.trim(),'CAB_SHELL_PAYLOAD_REFUSED');assert.equal(calls,1);
  }
});
