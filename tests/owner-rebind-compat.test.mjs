import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyFrozenOwnerRebind,VERSION} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-cleanup.mjs';
import {canonicalContinuityDigest} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-continuity.mjs';
import {ChangeErasureManager} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-erasure-manager.mjs';
import {startDiagnosticOwnerProxy} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-owner-diagnostic-proxy.mjs';
import {request} from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {processOwnerIdentity} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-process-lifecycle.mjs';
import {fileURLToPath} from 'node:url';
import {mkdtempSync,chmodSync,mkdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ErasureTransaction} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-change-erasure.mjs';

const now=Date.parse('2026-11-08T12:00:00Z');
function fixture(){
 const value={phase:'FREEZING',brokerTransport:'owner-local-v1',brokerPid:111,
  scope:{closureAuthority:'authoritative-retired-run-batch-v1',runIds:['target'],protectedRunIds:['peer']},
  nativeIdentity:{pid:10,version:'2.2.5'},ownerReceipts:{prepare:{state:'PREPARED',uid:1000,pid:111,instanceId:'old'},
    commit:{state:'APPLIED',uid:1000,pid:222,instanceId:'new'}}};
 const evidence={status:{brokerReadiness:{ready:true,server_version:VERSION,broker_process:{pid:222},instance_id:'new',checked_at:new Date(now).toISOString()}},
  nativeIdentity:{pid:10,version:'2.2.5'},oldPidAbsent:true,now};
 value.ownerReceipts.prepare.scopeDigest=canonicalContinuityDigest(value.scope);value.ownerReceipts.commit.scopeDigest=value.ownerReceipts.prepare.scopeDigest;
 return {value,evidence};
}
test('reprise owner : preuve cohérente et PID changé',()=>{const {value,evidence}=fixture();assert.equal(verifyFrozenOwnerRebind(value,evidence).brokerPid,222);});
for(const [name,mutate] of [
 ['ancien PID vivant',(_v,e)=>{e.oldPidAbsent=false;}],['UID différent',(v)=>{v.ownerReceipts.commit.uid=1001;}],
 ['commit non attesté',(v)=>{delete v.ownerReceipts.commit;}],['autre portée',(v)=>{v.scope.closureAuthority='other';}],
 ['RUN pair non protégé',(v)=>{v.scope.protectedRunIds=[];}],['PID inchangé',(v)=>{v.ownerReceipts.commit.pid=111;}],
 ['broker périmé',(_v,e)=>{e.status.brokerReadiness.checked_at='2026-11-08T11:59:00Z';}],
 ['OpenCode changé',(_v,e)=>{e.nativeIdentity.pid=11;}],['version broker divergente',(_v,e)=>{e.status.brokerReadiness.server_version='2.4.35';}],
])test('reprise owner : refus '+name,()=>{const {value,evidence}=fixture();mutate(value,evidence);assert.throws(()=>verifyFrozenOwnerRebind(value,evidence),/erasure-owner-rebind-proof-invalid/);});

test('diagnostic propriétaire : commande bornée à l’identité noyau sans mutation du reçu',async()=>{
 const {value}=fixture();delete value.ownerReceipts.commit;const before=JSON.stringify(value);
 const manager=new ChangeErasureManager({workspace:'/fixture',stateDirectory:'/fixture',brokerIdentity:async pid=>({uid:1000,state:pid===222?'S':'Z'})});
 manager.pending=()=>value;manager.transaction=()=>({seal:command=>({...command,signature:'fixture'}),verify:command=>{const {signature,...rest}=command;assert.equal(signature,'fixture');return rest;}});
 const sender={pid:222,uid:1000,instanceId:'new'};
 const command=await manager.diagnosticOwnerCommand(sender,{pid:222,uid:1000});
 assert.equal(command.action,'diagnose');assert.deepEqual(command.scope,value.scope);assert.equal(JSON.stringify(value),before);
 const receipt={protocol:'cab-owner-erasure-v1',transactionId:value.transactionId,scopeDigest:canonicalContinuityDigest(value.scope),state:'DIAGNOSED',uid:1000,pid:222,ownerPhase:'PREPARED',diagnostic:{status:'PLAN_REFUSED',stage:'projection',code:'erasure-foreign-reference'}};
 assert.equal((await manager.verifyDiagnosticOwnerReceipt(command,sender,{pid:222,uid:1000},receipt)).diagnostic.stage,'projection');
 await assert.rejects(manager.verifyDiagnosticOwnerReceipt(command,sender,{pid:222,uid:1000},{...receipt,private_data:'forbidden'}),/erasure-owner-diagnostic-receipt-invalid/);
 await assert.rejects(manager.diagnosticOwnerCommand(sender,{pid:223,uid:1000}),/erasure-owner-diagnostic-identity-invalid/);
 await assert.rejects(manager.diagnosticOwnerCommand({...sender,uid:1001},{pid:222,uid:1001}),/erasure-owner-diagnostic-identity-invalid/);
 assert.equal(JSON.stringify(value),before);
});

test('transport diagnostique : deux UID réels et identité noyau',async t=>{
 if(spawnSync('sudo',['-n','true']).status!==0){t.skip('sudo indisponible');return;}
 const rows=spawnSync('getent',['passwd'],{encoding:'utf8'}).stdout.trim().split('\n').map(row=>row.split(':'));
 const candidate=rows.find(row=>Number(row[2])>0&&Number(row[2])!==process.getuid()&&spawnSync('sudo',['-n','-u','#'+row[2],'test','-x',process.execPath]).status===0);
 if(!candidate){t.skip('UID distinct indisponible');return;}
 const uid=Number(candidate[2]),{value}=fixture();delete value.ownerReceipts.commit;value.ownerReceipts.prepare.uid=uid;value.transactionId='erasure-11111111-1111-4111-8111-111111111111';
 const manager=new ChangeErasureManager({workspace:'/fixture',stateDirectory:'/fixture',brokerIdentity:processOwnerIdentity});
 manager.pending=()=>value;manager.transaction=()=>({seal:command=>({...command,signature:'fixture'}),verify:command=>{const {signature,...rest}=command;if(signature!=='fixture')throw new Error('signature');return rest;}});
 const proxy=await startDiagnosticOwnerProxy(manager);t.after(()=>proxy.stop());
 const continuity=fileURLToPath(new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-continuity.mjs',import.meta.url));
 const code=`import {request} from 'node:http'; import {canonicalContinuityDigest} from ${JSON.stringify(continuity)};
 const post=(path,input)=>new Promise((resolve,reject)=>{const body=JSON.stringify(input),r=request({socketPath:${JSON.stringify(proxy.identity.path)},path,method:'POST',headers:{'content-length':Buffer.byteLength(body)}},res=>{let x='';res.on('data',c=>x+=c);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(x)}));});r.on('error',reject);r.end(body);});
 const sender={pid:process.pid,uid:process.getuid(),instanceId:'isolated-two-uid'};const p=await post('/cleanup/owner/poll',sender);if(p.status!==200)throw Error('poll');
 const receipt={protocol:'cab-owner-erasure-v1',transactionId:p.body.command.transactionId,scopeDigest:canonicalContinuityDigest(p.body.command.scope),state:'DIAGNOSED',uid:sender.uid,pid:sender.pid,ownerPhase:'PREPARED',diagnostic:{status:'PLAN_VALID',stage:'projection'}};
 const x=await post('/cleanup/owner/exchange',{sender,command:p.body.command,receipt});if(x.status!==200)throw Error('exchange');process.stdout.write(JSON.stringify(x.body.diagnostic));`;
 const child=spawn('sudo',['-n','-u','#'+uid,process.execPath,'--input-type=module','-e',code],{stdio:['ignore','pipe','pipe']});let out='',err='';child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);
 const exit=await new Promise(resolve=>child.on('exit',resolve));assert.equal(exit,0,err);assert.equal(JSON.parse(out).status,'PLAN_VALID');
});

test('diagnostic complet : deux UID, reçu propriétaire et données inchangés',async t=>{
 if(spawnSync('sudo',['-n','true']).status!==0){t.skip('sudo indisponible');return;}
 const rows=spawnSync('getent',['passwd'],{encoding:'utf8'}).stdout.trim().split('\n').map(row=>row.split(':'));
 const user=rows.find(row=>Number(row[2])>0&&Number(row[2])!==process.getuid()&&spawnSync('sudo',['-n','-u','#'+row[2],'test','-x',process.execPath]).status===0);
 if(!user){t.skip('UID distinct indisponible');return;}
 const uid=Number(user[2]),gid=user[3],root=mkdtempSync(join(tmpdir(),'cab-diag-cross-'));chmodSync(root,0o755);
 const home=join(root,'home'),workspace=join(root,'project');
 for(const path of [home,workspace])assert.equal(spawnSync('sudo',['-n','install','-d','-m','0700','-o',String(uid),'-g',gid,path]).status,0);
 t.after(()=>spawnSync('sudo',['-n','rm','-rf','--',root]));
 const source=fileURLToPath(new URL('../plugins/cab-approval-bridge/broker/',import.meta.url)),store=join(home,'approvals.json');
 const setup=spawnSync('sudo',['-n','-u','#'+uid,'python3','-B','-c','import json,sys;open(sys.argv[1],"w").write(json.dumps({"schema_version":2,"approvals":{}}))',store]);assert.equal(setup.status,0);
 const scope={workspace,changeId:'target-change',runIds:['target-run'],ids:['target-change','target-run'],protectedRunIds:['peer-run'],changeIds:['target-change'],sharedIdentityIds:[],closureAuthority:'authoritative-retired-run-batch-v1'};
 const txid='erasure-11111111-1111-4111-8111-111111111111',worker=join(source,'cgpt_approval_bridge_owner_cleanup.mjs');
 const prep=spawnSync('sudo',['-n','-u','#'+uid,'env','HOME='+home,process.execPath,worker],{input:JSON.stringify({action:'prepare',scope,transactionId:txid}),encoding:'utf8'});assert.equal(prep.status,0,prep.stderr);
 const value={protocol:'cab-change-erasure-v1',transactionId:txid,phase:'FREEZING',scope,brokerTransport:'owner-local-v1',ownerReceipts:{prepare:{state:'PREPARED',uid,instanceId:'old',scopeDigest:canonicalContinuityDigest(scope)}}};
 const master=join(root,'master');mkdirSync(master,{mode:0o700});const tx=new ErasureTransaction(master);tx.save(value);const before=readFileSync(tx.path);
 const manager=new ChangeErasureManager({workspace,stateDirectory:master,brokerIdentity:processOwnerIdentity});
 const proxy=await startDiagnosticOwnerProxy(manager);t.after(()=>proxy.stop());
 const child=spawn('sudo',['-n','-u','#'+uid,'env','HOME='+home,'CGPT_APPROVAL_STORE='+store,'CGPT_APPROVAL_JOURNAL='+join(home,'events.ndjson'),'CGPT_JOURNAL_CHECKPOINT_PATH='+join(home,'checkpoint.json'),'python3','-B',join(source,'cgpt_approval_bridge_owner_diagnostic.py')],{stdio:['pipe','pipe','pipe']});
 let out='',err='';child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);child.stdin.end(JSON.stringify(proxy.identity)+'\n');
 const exit=await new Promise(resolve=>child.on('exit',resolve));assert.equal(exit,0,err);assert.equal(JSON.parse(out).diagnostic.status,'PLAN_VALID');
 const observed=spawnSync('sudo',['-n','-u','#'+uid,'cat',store],{encoding:'utf8'});assert.equal(observed.status,0);
 assert.deepEqual(readFileSync(tx.path),before);assert.equal(JSON.parse(observed.stdout).schema_version,2);
});

test('transport isolé : identité noyau et résultat borné sans mutation',async t=>{
 const {value}=fixture();delete value.ownerReceipts.commit;value.ownerReceipts.prepare.uid=process.getuid();value.transactionId='erasure-11111111-1111-4111-8111-111111111111';
 const before=JSON.stringify(value),manager=new ChangeErasureManager({workspace:'/fixture',stateDirectory:'/fixture',brokerIdentity:async pid=>pid===process.pid?{uid:process.getuid(),state:'S'}:null});
 manager.pending=()=>value;manager.transaction=()=>({seal:command=>({...command,signature:'fixture'}),verify:command=>{const {signature,...rest}=command;if(signature!=='fixture')throw new Error('signature');return rest;}});
 const proxy=await startDiagnosticOwnerProxy(manager);t.after(()=>proxy.stop());
 const post=(path,input)=>new Promise((resolve,reject)=>{const body=JSON.stringify(input),req=request({socketPath:proxy.identity.path,path,method:'POST',headers:{'content-type':'application/json','content-length':Buffer.byteLength(body)}},res=>{let data='';res.on('data',chunk=>data+=chunk);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(data)}));});req.on('error',reject);req.end(body);});
 const sender={pid:process.pid,uid:process.getuid(),instanceId:'diagnostic-instance'};
 const poll=await post('/cleanup/owner/poll',sender);assert.equal(poll.status,200);assert.equal(poll.body.command.action,'diagnose');
 const receipt={protocol:'cab-owner-erasure-v1',transactionId:value.transactionId,scopeDigest:canonicalContinuityDigest(value.scope),state:'DIAGNOSED',uid:sender.uid,pid:sender.pid,ownerPhase:'PREPARED',diagnostic:{status:'PLAN_REFUSED',stage:'projection',code:'erasure-foreign-reference'}};
 const reply=await post('/cleanup/owner/exchange',{sender,command:poll.body.command,receipt});assert.equal(reply.status,200);assert.equal(reply.body.diagnostic.stage,'projection');
 const repeated=await post('/cleanup/owner/exchange',{sender,command:poll.body.command,receipt});assert.equal(repeated.status,409);
 const replay=await post('/cleanup/owner/poll',{...sender,pid:sender.pid+1});assert.equal(replay.status,409);
 assert.equal(JSON.stringify(value),before);
});
