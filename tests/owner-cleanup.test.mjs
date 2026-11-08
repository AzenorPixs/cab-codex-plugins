import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,chmodSync,copyFileSync,rmSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import readline from 'node:readline';
import {fileURLToPath} from 'node:url';
import {ownerCleanup} from '../plugins/cab-approval-bridge/broker/cgpt_approval_bridge_owner_cleanup.mjs';
import {diagnoseErasureFilePlan} from '../plugins/cab-approval-bridge/broker/cgpt-approval-bridge-change-erasure.mjs';
import {ErasureTransaction} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-change-erasure.mjs';
import {ChangeErasureManager} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-erasure-manager.mjs';
import {processOwnerIdentity} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-process-lifecycle.mjs';
import {startOwnerProxy} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-owner-proxy.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=fileURLToPath(new URL('../plugins/cab-approval-bridge/broker/',import.meta.url));
function fixture(t){const root=mkdtempSync(join(tmpdir(),'cab-owner-')),workspace=join(root,'project'),home=join(root,'home'),data=join(root,'broker');
 for(const path of [workspace,home,data])mkdirSync(path,{mode:0o700});t.after(()=>rmSync(root,{force:true,recursive:true}));
 const scope={protocol:'cab-change-erasure-v1',workspace,changeId:'change-target-owner-123',ownerId:'owner-target',runIds:['run-target-owner-123'],ids:['change-target-owner-123','run-target-owner-123','ses_target_owner123'],registrySequence:1,coordinationSequence:1};
 const target={runId:scope.runIds[0],changeId:scope.changeId,sessionId:scope.ids[2]},peer={runId:'run-peer-owner-123',changeId:'change-peer-owner-123',sessionId:'ses_peer_owner123'};
 const file=join(data,'approvals.json');writeFileSync(file,JSON.stringify({rows:[target,peer]}),{mode:0o600});return {root,workspace,home,data,scope,peer,file,transactionId:'erasure-'+randomUUID()};}
test('diagnostic propriétaire : conflit classé sans contenu ni modification',t=>{
 const f=fixture(t);writeFileSync(f.file,JSON.stringify({rows:[{runId:f.scope.runIds[0],directory:'/foreign',secret:'private-marker'}]}),{mode:0o600});
 const before=readFileSync(f.file),result=diagnoseErasureFilePlan([f.data],f.scope);
 assert.deepEqual(result,{status:'PLAN_REFUSED',stage:'scope-directory-target-run',code:'erasure-foreign-reference'});
 assert.deepEqual(readFileSync(f.file),before);assert.doesNotMatch(JSON.stringify(result),/private-marker|\/foreign|cab-owner-/);
});
test('diagnostic propriétaire : projection mixte refusée sans écrire',t=>{
 const f=fixture(t);writeFileSync(f.file,JSON.stringify({runId:'run-foreign-owner-456',nested:{runId:f.scope.runIds[0]}}),{mode:0o600});
 const before=readFileSync(f.file),result=diagnoseErasureFilePlan([f.data],f.scope);
 assert.deepEqual(result,{status:'PLAN_REFUSED',stage:'projection',code:'erasure-foreign-reference'});
 assert.deepEqual(readFileSync(f.file),before);
});
test('diagnostic propriétaire : reçu local authentifié et aucun changement',t=>{
 const f=fixture(t),input={scope:f.scope,transactionId:f.transactionId};
 assert.throws(()=>ownerCleanup({...input,action:'diagnose',bundle:{scope:f.scope,roots:[f.data],journalPaths:[],legacyRoots:[]}},{home:f.home}),/erasure-control-root-missing/);
 ownerCleanup({...input,action:'prepare'},{home:f.home});
 const ownerRoot=join(f.home,'.local/state/cab-owner-erasure',hash(f.workspace));
 const receiptPath=join(ownerRoot,'change-erasure.json'),before=readFileSync(receiptPath),data=readFileSync(f.file);
 const result=ownerCleanup({...input,action:'diagnose',bundle:{scope:f.scope,roots:[f.data],journalPaths:[],legacyRoots:[]}},{home:f.home});
 assert.equal(result.state,'DIAGNOSED');assert.equal(result.ownerPhase,'PREPARED');
 assert.deepEqual(readFileSync(receiptPath),before);assert.deepEqual(readFileSync(f.file),data);
 assert.throws(()=>ownerCleanup({...input,scope:{...f.scope,changeId:'foreign'},action:'diagnose',bundle:{scope:f.scope,roots:[f.data],journalPaths:[],legacyRoots:[]}},{home:f.home}),/erasure-owner-transaction-divergent/);
});
test('owner local : reprise idempotente, pair conservé, certificat puis oubli du reçu',t=>{
 const f=fixture(t),input={scope:f.scope,transactionId:f.transactionId};assert.equal(ownerCleanup({...input,action:'prepare'},{home:f.home}).state,'PREPARED');
 const bundle={scope:f.scope,roots:[f.data],entries:[],journalPaths:[]};const applied=ownerCleanup({...input,action:'commit',bundle},{home:f.home});assert.equal(applied.state,'APPLIED');assert.deepEqual(JSON.parse(readFileSync(f.file)),{rows:[f.peer]});
 writeFileSync(f.file,JSON.stringify({rows:[f.peer],newPeerValue:1}),{mode:0o600});ownerCleanup({...input,action:'commit'},{home:f.home});assert.equal(JSON.parse(readFileSync(f.file)).newPeerValue,1);
 assert.equal(ownerCleanup({...input,action:'verify'},{home:f.home}).state,'VERIFIED');assert.equal(ownerCleanup({...input,action:'finalize'},{home:f.home}).state,'PURGED');
 assert.equal(ownerCleanup({...input,action:'verify',ownerReceipt:applied},{home:f.home}).state,'VERIFIED');
});
test('owner local : aucun finalize avant commit et aucun scope substitué',t=>{const f=fixture(t),input={scope:f.scope,transactionId:f.transactionId};ownerCleanup({...input,action:'prepare'},{home:f.home});
 assert.throws(()=>ownerCleanup({...input,action:'finalize'},{home:f.home}),/phase-invalid/);
 assert.throws(()=>ownerCleanup({...input,scope:{...f.scope,changeId:'foreign'},action:'commit'},{home:f.home}),/transaction-divergent/);
 assert.equal(JSON.parse(readFileSync(f.file)).rows.length,2);
});

test('owner local : lot historique avec sentinelle conserve les objets étrangers',t=>{
 const f=fixture(t),historic={runId:'run-historic-foreign',accessId:'null'},protectedPeer={...f.peer,accessId:'null'};
 const target={runId:f.scope.runIds[0],changeId:f.scope.changeId,accessId:'null'};
 const scope={...f.scope,closureAuthority:'authoritative-retired-run-batch-v1',changeIds:[f.scope.changeId],
   protectedRunIds:[f.peer.runId],sharedIdentityIds:[],ids:[...f.scope.ids,'null']};
 writeFileSync(f.file,JSON.stringify({rows:[target,historic,protectedPeer]}),{mode:0o600});
 const input={scope,transactionId:f.transactionId};ownerCleanup({...input,action:'prepare'},{home:f.home});
 const receipt=ownerCleanup({...input,action:'commit',bundle:{scope,roots:[f.data],entries:[],journalPaths:[]}},{home:f.home});
 assert.equal(receipt.state,'APPLIED');assert.deepEqual(JSON.parse(readFileSync(f.file)).rows,[historic,protectedPeer]);
});

test('owner local : même change dans un autre projet conservé, identité cible étrangère refusée',t=>{
 const f=fixture(t),scope={...f.scope,closureAuthority:'authoritative-retired-run-batch-v1',changeIds:[f.scope.changeId],protectedRunIds:[f.peer.runId],sharedIdentityIds:[]};
 const foreign={changeId:scope.changeId,approvalId:'foreign-approval-unrelated-123',directory:'/other-project'},target={runId:scope.runIds[0],changeId:scope.changeId,directory:scope.workspace};
 writeFileSync(f.file,JSON.stringify({rows:[foreign,target]}),{mode:0o600});
 const input={scope,transactionId:f.transactionId};ownerCleanup({...input,action:'prepare'},{home:f.home});
 const receipt=ownerCleanup({...input,action:'commit',bundle:{scope,roots:[f.data],entries:[],journalPaths:[]}},{home:f.home});
 assert.equal(receipt.state,'APPLIED');assert.deepEqual(JSON.parse(readFileSync(f.file)).rows,[foreign]);
 const compromised={...foreign,nested:{sessionId:scope.ids[2]}};writeFileSync(f.file,JSON.stringify({rows:[compromised]}),{mode:0o600});
 assert.equal(diagnoseErasureFilePlan([f.data],scope).code,'erasure-foreign-reference');
});

test('owner local : approbation identique entre projets reste protégée',t=>{
 const f=fixture(t),shared='approval-shared-foreign-123';
 const scope={...f.scope,ids:[...f.scope.ids,shared],closureAuthority:'authoritative-retired-run-batch-v1',changeIds:[f.scope.changeId],protectedRunIds:[f.peer.runId],sharedIdentityIds:[]};
 const data={rows:[{changeId:scope.changeId,approvalId:shared,directory:'/other-project'},
   {runId:scope.runIds[0],changeId:scope.changeId,approvalId:shared,directory:scope.workspace}]};
 writeFileSync(f.file,JSON.stringify(data),{mode:0o600});const before=readFileSync(f.file);
 const input={scope,transactionId:f.transactionId};ownerCleanup({...input,action:'prepare'},{home:f.home});
 assert.throws(()=>ownerCleanup({...input,action:'commit',bundle:{scope,roots:[f.data],entries:[],journalPaths:[]}},{home:f.home}),/erasure-foreign-reference/);
 assert.deepEqual(readFileSync(f.file),before);
});

test('owner local : identifiant dérivé partagé conserve le pair et efface la cible',t=>{
 const f=fixture(t),shared='approval-shared-derived-123';
 const scope={...f.scope,closureAuthority:'authoritative-retired-run-batch-v1',changeIds:[f.scope.changeId],protectedRunIds:[f.peer.runId],sharedIdentityIds:[]};
 const foreign={changeId:scope.changeId,approvalId:shared,directory:'/other-project',note:'foreign-opaque'};
 const target={runId:scope.runIds[0],changeId:scope.changeId,approvalId:shared,directory:scope.workspace};
 writeFileSync(f.file,JSON.stringify({rows:[foreign,target]}),{mode:0o600});
 const input={scope,transactionId:f.transactionId};ownerCleanup({...input,action:'prepare'},{home:f.home});
 const receipt=ownerCleanup({...input,action:'commit',bundle:{scope:{...scope,ids:[...scope.ids,shared]},roots:[f.data],entries:[],journalPaths:[]}},{home:f.home});
 assert.equal(receipt.state,'APPLIED');assert.deepEqual(JSON.parse(readFileSync(f.file)).rows,[foreign]);
 assert.equal(ownerCleanup({...input,action:'verify'},{home:f.home}).state,'VERIFIED');
});

test('owner local : approbation non attribuée à répertoire relatif conservée',t=>{
 const f=fixture(t),shared='approval-relative-unknown-123';
 const scope={...f.scope,closureAuthority:'authoritative-retired-run-batch-v1',changeIds:[f.scope.changeId],protectedRunIds:[f.peer.runId],sharedIdentityIds:[]};
 const unknown={changeId:scope.changeId,approvalId:shared,directory:'relative-token'},target={runId:scope.runIds[0],changeId:scope.changeId,directory:scope.workspace};
 writeFileSync(f.file,JSON.stringify({rows:[unknown,target]}),{mode:0o600});
 const input={scope,transactionId:f.transactionId};ownerCleanup({...input,action:'prepare'},{home:f.home});
 const result=ownerCleanup({...input,action:'commit',bundle:{scope:{...scope,ids:[...scope.ids,shared]},roots:[f.data],entries:[],journalPaths:[]}},{home:f.home});
 assert.equal(result.state,'APPLIED');assert.deepEqual(JSON.parse(readFileSync(f.file)).rows,[unknown]);
});

test('deux UID réels : canal noyau authentifié, clé étrangère inaccessible et cleanup sous le propriétaire',async t=>{
 const sudo=spawnSync('sudo',['-n','true']);if(sudo.status!==0){t.skip('sudo non disponible pour le fixture à deux UID');return;}
 const requested=process.env.CAB_TEST_FOREIGN_UID;
 const users=spawnSync('getent',['passwd'],{encoding:'utf8'}).stdout.trim().split('\n').map(line=>line.split(':')).filter(row=>Number(row[2])>0&&Number(row[2])!==process.getuid()&&(!requested||row[2]===requested));
 const candidate=users.find(row=>spawnSync('sudo',['-n','-u','#'+row[2],'test','-w',row[5]]).status===0&&
   spawnSync('sudo',['-n','-u','#'+row[2],'test','-x',process.execPath]).status===0);
 if(!candidate){t.skip('aucun UID distinct exécutable disponible');return;}
 const [,,uid,gid]=candidate,root=mkdtempSync(join(tmpdir(),'cab-owner-two-uids-'));chmodSync(root,0o755);
 const workspace=join(root,'project'),master=join(root,'master'),foreign=join(root,'foreign'),code=join(root,'code');
 for(const path of [workspace,master,code])mkdirSync(path,{mode:path===master?0o700:0o755});
 assert.equal(spawnSync('sudo',['-n','install','-d','-m','0755','-o',uid,'-g',gid,foreign]).status,0);
 t.after(()=>{spawnSync('sudo',['-n','rm','-rf','--',root]);});
 for(const name of ['cgpt_approval_bridge_server.py','cgpt_approval_bridge_router.py','cgpt_approval_bridge_journal.py','cgpt_approval_bridge_owner_cleanup.mjs','cgpt-approval-bridge-change-erasure.mjs','cgpt-approval-bridge-continuity.mjs','cgpt-approval-bridge-state-layout.mjs','cgpt-approval-bridge-observation-statistics.mjs','cgpt-approval-bridge-permission-replies.mjs']){
  if(process.env.CAB_TEST_LEGACY_BROKER_REF&&/^(?:cgpt_approval_bridge_server|cgpt_approval_bridge_router|cgpt_approval_bridge_journal)\.py$/.test(name)){
   assert.match(process.env.CAB_TEST_LEGACY_BROKER_REF,/^[a-f0-9]{40}$/);
   const legacy=spawnSync('git',['-c','safe.directory='+process.cwd(),'show',process.env.CAB_TEST_LEGACY_BROKER_REF+':plugins/cab-approval-bridge/broker/'+name],{maxBuffer:4*1024*1024});
   assert.equal(legacy.status,0);writeFileSync(join(code,name),legacy.stdout);
  }else copyFileSync(join(source,name),join(code,name));
  chmodSync(join(code,name),0o644);
 }
 const scope={protocol:'cab-change-erasure-v1',workspace,changeId:'change-target-owner-123',ownerId:'owner-target',runIds:['run-target-owner-123'],ids:['change-target-owner-123','run-target-owner-123','ses_target_owner123'],registrySequence:1,coordinationSequence:1};
 if(process.env.CAB_TEST_RELATIVE_PEER==='1')Object.assign(scope,{closureAuthority:'authoritative-retired-run-batch-v1',changeIds:[scope.changeId],protectedRunIds:['run-peer-owner-123'],sharedIdentityIds:[]});
 const tx=new ErasureTransaction(master),value=tx.prepare({scope,phase:'SEALED',sessionIds:[],roots:[master],coverage:['controller','broker']});
 let broker={coordination_capabilities:['owner-local-erasure-v1']};
 const manager=new ChangeErasureManager({workspace,stateDirectory:master,registry:{},openCode:{},monitorIdentity:()=>{},broker:()=>broker,brokerIdentity:processOwnerIdentity});
 let proxy;
 const server=createServer(async(req,res)=>{try{let raw='';for await(const b of req)raw+=b;const input=JSON.parse(raw);const peer=proxy.peer(req),sender=req.url.endsWith('/poll')?input:input.sender;
  if(peer.pid!==sender.pid||peer.uid!==sender.uid)throw new Error('peer-divergent');
  const result=req.url.endsWith('/poll')?await manager.ownerPoll(input):await manager.ownerExchange(input);res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify(result));
 }catch(error){res.writeHead(403,{'content-type':'application/json'}).end(JSON.stringify({error:error.code||error.message}));}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));proxy=await startOwnerProxy('http://127.0.0.1:'+server.address().port);
 t.after(async()=>{await proxy.stop();await new Promise(resolve=>server.close(resolve));});
 const childCode=`
import sys,json,os
from pathlib import Path
os.environ['CGPT_APPROVAL_STORE']=${JSON.stringify(join(foreign,'approvals.json'))}
os.environ['CGPT_APPROVAL_JOURNAL']=${JSON.stringify(join(foreign,'events.ndjson'))}
os.environ['CGPT_JOURNAL_CHECKPOINT_PATH']=${JSON.stringify(join(foreign,'checkpoint.json'))}
os.environ['CGPT_BROKER_INSTANCE_LOCK']=${JSON.stringify(join(foreign,'broker.instance.lock'))}
os.environ['CGPT_AUTO_REMEDIATION_CB_STATE_PATH']=${JSON.stringify(join(foreign,'circuit.json'))}
for key in ['CGPT_JOURNAL_HMAC_KEY','CGPT_JOURNAL_HMAC_PREVIOUS_KEYS']:
 os.environ.pop(key,None)
sys.path.insert(0,${JSON.stringify(code)})
import cgpt_approval_bridge_server as cab
for actual in [cab.store_path(),cab.journal.journal_path(),cab.journal.checkpoint_path(),cab.instance_lock_path(),cab.AUTO_REMEDIATION_CIRCUIT_STATE_PATH]:
 if not os.path.realpath(actual).startswith(os.path.realpath(${JSON.stringify(foreign)})+os.sep):
  raise RuntimeError('fixture-state-path-not-isolated')
if os.getuid()!=${Number(uid)}:
 raise RuntimeError('fixture-owner-not-isolated')
cab.OWNER_ERASURE_SOCKET=json.loads(${JSON.stringify(JSON.stringify({}))})
cab.OWNER_ERASURE_SOCKET=${JSON.stringify(proxy.identity)}
cab.INSTANCE_ID='foreign-instance'
items={}
for name in ['target','peer']:
 item={'approval_id':'approval-'+name,'requestId':'request-'+name,'change_id':'change-'+name+'-owner-123','run_id':'run-'+name+'-owner-123','directory':${JSON.stringify(workspace)},'status':'APPROVED','created_at':'2026-11-05T00:00:00Z','expires_at':'2099-01-01T00:00:00Z'}
 items[item['approval_id']]=item
 cab.journal.append_event('FIXTURE_EVENT',approval_id=item['approval_id'],request_id=item['requestId'],change_id=item['change_id'],data={'payload':name})
cab.save_store(cab.store_path(),{'approvals':items})
print(json.dumps({'pid':os.getpid(),'uid':os.getuid(),'instanceId':cab.INSTANCE_ID,'keyReadable':os.access(${JSON.stringify(tx.keyPath)},os.R_OK),'home':str(Path.home())}),flush=True)
for line in sys.stdin:
 try:
  command=json.loads(line)
  result=cab.owner_terminal_erasure(command)
  if ${process.env.CAB_TEST_RELATIVE_PEER==='1'?'True':'False'} and result['state']=='PREPARED':
   with cab.locked_store(cab.store_path()):
    snapshot=cab.load_store(cab.store_path())
    snapshot['approvals']['foreign-alias']={'approval_id':'approval-target','requestId':'request-other','change_id':'change-target-owner-123','directory':'relative-token','status':'APPROVED','created_at':'2026-11-05T00:00:00Z','expires_at':'2099-01-01T00:00:00Z'}
    cab.save_store(cab.store_path(),snapshot)
  with cab.locked_store(cab.store_path()):
   saved=cab.load_store(cab.store_path())
  print(json.dumps({'state':result['state'],'pairPreserved':'approval-peer' in saved['approvals'],'foreignPreserved':${process.env.CAB_TEST_RELATIVE_PEER==='1'?'True':'False'} is False or 'foreign-alias' in saved['approvals'],'journalOK':cab.journal.verify_journal()['ok']}),flush=True)
 except Exception as error:
  detail={'error':type(error).__name__+':'+str(error)}
  if ${process.env.CAB_TEST_RELATIVE_PEER==='1'?'True':'False'} and command.get('action')=='commit':
   try:
    bundle=cab.prepare_terminal_erasure_bundle(command)
    detail['diagnostic']=cab.owner_erasure_worker(command,'diagnose',bundle=bundle)['diagnostic']
   except Exception as diagnostic_error:detail['diagnosticError']=type(diagnostic_error).__name__+':'+str(diagnostic_error)
  print(json.dumps(detail),flush=True)
 `;
 const child=spawn('sudo',['-n','-u','#'+uid,'python3','-B','-c',childCode],{stdio:['pipe','pipe','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);
 t.after(()=>{child.stdin.end();if(child.exitCode===null)child.kill('SIGTERM');});
 const lines=readline.createInterface({input:child.stdout}),iterator=lines[Symbol.asyncIterator]();
 const next=async()=>{let timer;try{const r=await Promise.race([iterator.next(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('fixture-timeout '+stderr)),10000)})]);assert.equal(r.done,false,stderr);return JSON.parse(r.value);}finally{clearTimeout(timer)}};
 const hello=await next();
 t.after(()=>{const own=join(hello.home,'.local/state/cab-owner-erasure',hash(workspace));spawnSync('sudo',['-n','rm','-rf','--',own]);});
 assert.equal(hello.uid,Number(uid));assert.equal(hello.keyReadable,false);
 broker={...broker,broker_process:{pid:hello.pid},instance_id:hello.instanceId};
 const send=async()=>{child.stdin.write(JSON.stringify(manager.brokerCommand())+'\n');const result=await next();assert.equal(result.error,undefined,JSON.stringify(result));assert.equal(result.pairPreserved,true);assert.equal(result.foreignPreserved,true);assert.equal(result.journalOK,true);return result;};
 assert.equal((await send()).state,'PREPARED');
 const current=tx.load();tx.save({...current,phase:'FREEZING'});manager.ownerAction({transactionId:value.transactionId,action:'commit'});
 assert.equal((await send()).state,'APPLIED');
 tx.save({...tx.load(),phase:'VERIFYING'});manager.ownerAction({transactionId:value.transactionId,action:'verify'});assert.equal((await send()).state,'VERIFIED');
 tx.save({...tx.load(),phase:'CERTIFIED'});manager.ownerAction({transactionId:value.transactionId,action:'finalize'});assert.equal((await send()).state,'PURGED');
 assert.equal(manager.pending().ownerReceipts.commit.uid,Number(uid));
 const tampered={...manager.brokerCommand(),scope:{...manager.pending().scope,changeId:'foreign'}};
 await assert.rejects(manager.ownerExchange({command:tampered,sender:{pid:hello.pid,uid:Number(uid),instanceId:hello.instanceId},receipt:null}),/signature-invalid/);
});
