import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync,readdirSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {PermissionReplyJournal} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-permission-replies.mjs';
import {ManifestExtensions} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-manifest-extensions.mjs';
import {ResourceRunRegistry} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs';
import {nativeEvidenceView,validateReadOnlyReview,commandDigest} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-recovery-evidence.mjs';
import {createOpenCodeV2Client} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
function directory(t){const root=mkdtempSync(join(tmpdir(),'cab-autonomous-'));t.after(()=>rmSync(root,{recursive:true,force:true}));return root;}
const identity={sessionId:'ses_review',permissionId:'per_review',directory:'/workspace',decision:'reject',nativePid:42,nativeVersion:'2.2.20',callId:'call_review',targetDigest:hash('target')};

test('refus natif : intention indéterminée, ACK relisible et identité immuable',t=>{
 const root=directory(t),j=new PermissionReplyJournal(join(root,'receipts'));
 const first=j.begin(identity);assert.equal(first.value.state,'INTENT');
 assert.throws(()=>j.begin(identity),/outcome-unverified/);
 const ack=j.acknowledge(first.value);assert.equal(ack.httpStatus,204);
 assert.equal(j.begin(identity).replay,true);
 assert.throws(()=>j.begin({...identity,callId:'different-call'}),/identity-divergent/);
 assert.equal(j.snapshot(identity.sessionId,identity.directory).receipts.length,1);
 assert.equal(j.snapshot('ses_other',identity.directory).receipts.length,0);
});

function nativeFixture(t,{loseResponse=false}={}){
 const root=directory(t),passwordFile=join(root,'password');writeFileSync(passwordFile,'synthetic-password\n',{mode:0o600});let posts=0;
 const journal=join(root,'permission-replies'),command='echo PRIVATE_COMMAND_NOT_TO_PERSIST';
 const client=createOpenCodeV2Client({baseUrl:'http://127.0.0.1:4096',directory:'/workspace',passwordFile,permissionReceiptDirectory:journal,
  fetchImpl:async(url,opt)=>{
   const path=new URL(url).pathname;
   if(path==='/api/info')return Response.json({version:'2.2.20',pid:42,hostname:'127.0.0.1',urls:[],paths:{}});
   if(path==='/api/permission/request')return Response.json({location:{directory:'/workspace'},data:[{id:'per_review',sessionID:'ses_review',action:'bash',resources:[command],source:{type:'tool',id:'call_review'}}]});
   if(path.endsWith('/reply')){posts++;if(loseResponse)throw new Error('synthetic network failure');return new Response(null,{status:204});}
   throw new Error('unexpected request');
  }});
 return {client,journal,command,posts:()=>posts};
}
test('client reject : ACK durable avant retour et deuxième appel sans POST',async t=>{
 const f=nativeFixture(t);await f.client.replyPermission('ses_review','per_review','reject');
 await f.client.replyPermission('ses_review','per_review','reject');assert.equal(f.posts(),1);
 const report=f.client.permissionReplies('ses_review');assert.equal(report.receipts[0].state,'ACKNOWLEDGED');
 for(const name of readdirSync(f.journal))assert.ok(!readFileSync(join(f.journal,name),'utf8').includes(f.command));
});
test('client reject : réponse perdue conserve INTENT et interdit le rejeu',async t=>{
 const f=nativeFixture(t,{loseResponse:true});await assert.rejects(f.client.replyPermission('ses_review','per_review','reject'));
 await assert.rejects(f.client.replyPermission('ses_review','per_review','reject'),/outcome-unverified/);assert.equal(f.posts(),1);
 assert.equal(f.client.permissionReplies('ses_review').receipts[0].state,'INTENT');
});

async function registryFixture(t){
 const root=directory(t),r=new ResourceRunRegistry(root,join(root,'state'));await r.acquireAuthority();t.after(()=>r.close());
 const reserve=(id,resources)=>r.reserve({runId:id,ownerId:'owner-'+id,sessionId:'ses_'+id,directory:root,changeId:'change-'+id,selectionKey:'selection-'+id,dependsOn:[],resources,exclusiveResources:[]});
 const prepare=(run,id)=>{const approval={coordination_protocol:'resource-scoped-v1',run_id:run.runId,reservation_version:run.version,session_id:run.sessionId,requestId:'request-'+id,operation_id:id,operation_digest:hash(id),expected_revisions:r.revisions(run.resources),resources:run.resources};r.prepareOperation(run.runId,approval);return approval;};
 return {root,r,reserve,prepare};
}
const port=n=>({key:'port:host-a/'+n,mode:'write'});
function extension(r,run){return {extensionId:'extension-1',ownerId:run.ownerId,version:run.version,expectedManifestDigest:r.manifestDigest(run.runId),resources:[port(5174)],authorization:'approved change; orchestrator technical review',evidence:['review/compatible-port-5174']};}

test('extension additive : accès protégé et anciens tokens/fencing/génération préservés',async t=>{
 const h=await registryFixture(t),run=h.reserve('a',[port(5173)]),op=h.prepare(run,'old-port');
 const held=h.r.acquireAccess(run.runId,{version:run.version,operationId:op.operation_id,operationDigest:op.operation_digest,resources:run.resources,expectedRevisions:op.expected_revisions});
 const before=structuredClone(h.r.resourceState);assert.throws(()=>h.r.extend(run.runId,{version:run.version,resources:[port(5174)]}),/run-accesses-unresolved/);
 const extensions=new ManifestExtensions(h.r,join(h.root,'state/extensions.json')),payload=extension(h.r,run);
 const result=extensions.extend(run.runId,payload);assert.equal(result.state,'DONE');
 assert.equal(h.r.runs.get(run.runId).version,run.version);assert.deepEqual(h.r.resourceState,before);
 assert.equal(h.r.resourceState.accesses[held.accessId].token,held.token);
 assert.ok(h.r.runs.get(run.runId).resources.some(x=>x.key===port(5174).key));
 assert.deepEqual(extensions.extend(run.runId,payload),result);
 assert.throws(()=>extensions.extend(run.runId,{...payload,resources:[port(5175)]}),/id-reused/);
});
for(const variant of ['owner','stale','overlap','foreign-held','namespace','rights'])test('extension compatible refuse '+variant,async t=>{
 const h=await registryFixture(t),run=h.reserve('a',[port(5173)]),extensions=new ManifestExtensions(h.r,join(h.root,'state/extensions.json'));
 const payload=extension(h.r,run);
 if(variant==='owner')payload.ownerId='foreign';if(variant==='stale')payload.expectedManifestDigest='0'.repeat(64);
 if(variant==='overlap')payload.resources=[port(5173)];
 if(variant==='namespace')payload.resources=[{key:'port:foreign-host/5174',mode:'write'}];
 if(variant==='rights'){h.r.runs.get(run.runId).resources[0].mode='read';payload.expectedManifestDigest=h.r.manifestDigest(run.runId);}
 if(variant==='foreign-held'){
  const other=h.reserve('b',[port(5174)]),op=h.prepare(other,'foreign-port');
  h.r.acquireAccess(other.runId,{version:other.version,operationId:op.operation_id,operationDigest:op.operation_digest,resources:other.resources,expectedRevisions:op.expected_revisions});
 }
 const before=structuredClone(h.r.snapshot());assert.throws(()=>extensions.extend(run.runId,payload));assert.deepEqual(h.r.snapshot(),before);
});
test('extension : crash après mutation se réconcilie depuis le même reçu sans réappliquer',async t=>{
 const h=await registryFixture(t),run=h.reserve('a',[port(5173)]),path=join(h.root,'state/extensions.json');
 const extensions=new ManifestExtensions(h.r,path),payload=extension(h.r,run),write=extensions.write.bind(extensions);
 extensions.write=receipt=>{if(receipt.state==='DONE')throw new Error('synthetic crash');write(receipt);};
 assert.throws(()=>extensions.extend(run.runId,payload),/synthetic crash/);const before=structuredClone(h.r.snapshot());
 const resumed=new ManifestExtensions(h.r,path).extend(run.runId,payload);
 assert.equal(resumed.recoveredFrom,'observed-manifest-after-intent');assert.deepEqual(h.r.snapshot(),before);
});

function reviewedBoundary(){
 const command='/usr/bin/id -u',run={runId:'a',ownerId:'owner-a',contextId:1,version:1};
 const calls=['call_a','call_b'].map(callID=>({type:'tool',tool:'bash',callID,nativeFormat:'opencode-v2',nativeErrorType:'aborted',executed:false,state:{status:'error',input:{command}}}));
 const view=nativeEvidenceView({run,operation:{operationId:'op-a',operationDigest:hash('op-a'),sessionId:'ses_a'},approval:{commands:[command],files:[]},parts:calls,native:{pid:42,version:'2.2.20'},activeSessions:{},permissions:[],journal:{watermark:{aggregateID:'ses_a',seq:12},events:[]},replies:{receipts:[]}});
 const review={ownerId:run.ownerId,effect:'READ_ONLY',commandSha256:commandDigest(command),sourceFiles:[],evidenceRefs:['audit/review-a'],rejectedCalls:calls.map((call,i)=>({callId:call.callID,permissionId:'per_'+i,auditExecutionId:'exec-'+i,ackStatus:204}))};
 return {run,view,review,command};
}
test('diagnostic : watermark sans événements ne prouve rien et filtre les commandes',()=>{
 const f=reviewedBoundary();assert.equal(f.view.journal.coverage,'MISSING_RELEVANT_CALLS');assert.equal(f.view.nativeExecutionOutcome,'UNVERIFIED');
 assert.ok(!JSON.stringify(f.view).includes(f.command));
 const result=validateReadOnlyReview(f.view,f.review,f.run);assert.equal(result.executionOutcome,'UNDETERMINED_READ_ONLY');assert.equal(result.evidenceAuthority,'ORCHESTRATOR_AUDIT_REVIEW');
});
for(const variant of ['owner','digest','executed','completed','unknown-error','missing-call','pending','busy','mutating-review'])test('revue bornée refuse '+variant,()=>{
 const f=reviewedBoundary();
 if(variant==='owner')f.review.ownerId='foreign';if(variant==='digest')f.review.commandSha256='0'.repeat(64);
 if(variant==='executed')f.view.calls[0].executed=true;if(variant==='completed')f.view.calls[0].status='completed';
 if(variant==='unknown-error')f.view.calls[0].nativeErrorType=null;if(variant==='missing-call')f.review.rejectedCalls.pop();
 if(variant==='pending')f.view.pendingPermissionCount=1;if(variant==='busy')f.view.sessionIdle=false;
 if(variant==='mutating-review')f.review.effect='WRITE';assert.throws(()=>validateReadOnlyReview(f.view,f.review,f.run));
});

test('extension compatible : once consommée quarantinée entièrement conservée',async t=>{
 const h=await registryFixture(t),run=h.reserve('a',[port(5173)]),op=h.prepare(run,'quarantined-port');
 const access=h.r.acquireAccess(run.runId,{version:run.version,operationId:op.operation_id,operationDigest:op.operation_digest,resources:run.resources,expectedRevisions:op.expected_revisions});
 h.r.nativeStart(run.runId,{operationId:op.operation_id,operationDigest:op.operation_digest,reservationVersion:run.version,
  runId:run.runId,resources:run.resources,expectedRevisions:op.expected_revisions,sessionId:run.sessionId,kind:'bash',target:'vite --port 5173'},op.requestId,{id:'per_quarantined',tool:{callID:'call_quarantined'}});
 h.r.nativeIssued(op.operation_id);
 const held=h.r.resourceState.accesses[access.accessId];held.state='HELD';
 held.timeoutQuarantine={quarantineId:'quarantine-1',operationId:op.operation_id,inputDigest:hash('quarantine-input'),
  proofDigest:hash('quarantine-proof'),fencing:++h.r.resourceState.sequence,observedAt:new Date().toISOString()};
 held.fencing=h.r.resourceState.sequence;h.r.persist();
 const before=structuredClone(h.r.resourceState),result=new ManifestExtensions(h.r,join(h.root,'state/extensions.json')).extend(run.runId,extension(h.r,run));
 assert.equal(result.state,'DONE');assert.deepEqual(h.r.resourceState,before);
 assert.equal(h.r.resourceState.operations[op.operation_id].state,'EXECUTING');
 assert.equal(h.r.resourceState.operations[op.operation_id].native.onceAcknowledged,true);
});

test('preuves closes : seules les revues DONE du même propriétaire et contexte sont réutilisables',async()=>{
 const {RecoveryCoordinator}=await import('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-recovery.mjs');
 const run={runId:'closed-run',ownerId:'closed-owner',contextId:7,version:11};
 const op={operationId:'closed-op',runId:run.runId,contextId:run.contextId,version:run.version,state:'CANCELLED',decision:{status:'approved',approvalId:'closed-approval'},completionDigest:'a'.repeat(64)};
 const receipt={actionId:'closed-action',entityId:op.operationId,action:'cancel-reviewed-validation',runId:run.runId,ownerId:run.ownerId,contextId:run.contextId,state:'DONE',httpStatus:200,effectDigest:op.completionDigest,result:{executionOutcome:'UNDETERMINED_READ_ONLY'},review:{ownerId:run.ownerId,effect:'READ_ONLY',commandSha256:'b'.repeat(64),sourceFiles:[],evidenceRefs:['audit/closed-read'],rejectedCalls:[{callId:'old-call',permissionId:'old-permission',auditExecutionId:'old-execution',ackStatus:204}]}};
 const select=(r,o)=>RecoveryCoordinator.prototype.closedValidationReviews.call({run:()=>run,receipts:[r],registry:{resourceState:{operations:{[op.operationId]:o}}}},run.runId);
 assert.equal(select(receipt,op).length,1);
 for(const change of [{state:'PREPARED'},{httpStatus:409},{ownerId:'other-owner'},{contextId:8},{effectDigest:'f'.repeat(64)},{result:{executionOutcome:'UNKNOWN'}}])assert.equal(select({...receipt,...change},op).length,0,JSON.stringify(change));
 for(const change of [{state:'PREPARED'},{native:{onceAcknowledged:true}},{version:12},{contextId:8},{decision:{status:'rejected'}}])assert.equal(select(receipt,{...op,...change}).length,0,JSON.stringify(change));
});
