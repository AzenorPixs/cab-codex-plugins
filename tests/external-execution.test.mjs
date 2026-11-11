import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ResourceRunRegistry} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs';
import {ExternalExecution,legacyExternalPreflightProof} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-external-execution.mjs';
import {RecoveryCoordinator} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-recovery.mjs';
import {grantAutonomy,mandateDigest,submitAutonomousWork,autonomousGrant,completeAutonomousCall} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-autonomous-mandate.mjs';
async function fixture(t) {
 const project=mkdtempSync(join(tmpdir(),'cab-external-'));mkdirSync(join(project,'src'));writeFileSync(join(project,'src/value.py'),'VALUE=42\n');
 const registry=new ResourceRunRegistry(project,join(project,'private'));await registry.acquireAuthority();t.after(async()=>{await registry.close();rmSync(project,{recursive:true,force:true});});
 const resource='lxc:test/100';const run=registry.reserve({runId:'external',ownerId:'owner',sessionId:'ses_external',changeId:'change-external',directory:project,selectionKey:'select',resources:[{key:'file:src',mode:'write'},{key:resource,mode:'write'}],dependsOn:[],exclusiveResources:[]});
 const lease=registry.acquireTests(run.runId,{version:run.version,transactionId:'bank-lease',resources:[{key:resource,mode:'write'}],evidence:['allocated test bank']});
 grantAutonomy(registry,run.runId,{protocol:'autonomous-change-v1',mandateId:'mission',version:run.version,sessionId:run.sessionId,objective:'Test approved bank',criteria:['bank test'],constraints:[],decisionsResolved:true,decisions:['Selected container bank'],paths:['src']});
 const contexts=new Map([[run.runId,{publicJob:()=>({armed:true,sessionId:run.sessionId})}]]),external=new ExternalExecution({registry,contexts});
 const profile={id:'bank',kind:'ssh',resource_key:resource,host_key:'SSH_TEST_HOST',user_key:'SSH_TEST_USER',password_key:'SSH_TEST_PASSWORD',container:'lxc',connection_fingerprint:'a'.repeat(64)};
 const args=(request,extra={})=>({request_id:request,run_id:run.runId,session_id:run.sessionId,change_id:run.changeId,directory:project,reservation_version:run.version,adapter_id:'bank',...extra});
 const finish=(a,g,status='COMPLETED',exitCode=0)=>{
  const receipt={protocol:'cab-external-exec-v1',requestId:a.request_id,runId:a.run_id,sessionId:a.session_id,changeId:a.change_id,input_digest:g.input_digest,status,exitCode,
   sourceRevision:g.source_revision,adapterId:'bank',leaseId:lease.transactionId,fencing:lease.fencing,dispatched:true,target_fingerprint:'b'.repeat(64),output:'PUBLIC_BANK_TEST_OK'};
  const sha=mandateDigest(receipt);external.finish({run_id:run.runId,session_id:run.sessionId,request_id:a.request_id,receipt,receipt_digest:sha});return {receipt,sha};
 };
 return {project,registry,run,lease,external,profile,args,finish};
}
test('approval and current reserved bank are required, then multiple commands run without extra decisions',async t=>{
 const f=await fixture(t);
 assert.throws(()=>f.external.register(f.run.runId,{version:f.run.version,profile:f.profile,exceptionId:'missing'}),/approved-exception/);
 f.external.register(f.run.runId,{version:f.run.version,profile:f.profile},{initial:true});
 for(let i=0;i<2;i++){const args=f.args('test-'+i,{argv:['/usr/bin/true']}),grant=f.external.authorize('external_execute',args);f.finish(args,grant);}
 assert.equal(f.registry.runs.get(f.run.runId).autonomy.metrics.intermediateDecisions,0);
 const m=f.registry.runs.get(f.run.runId).autonomy;
 const submission=submitAutonomousWork(f.registry,f.run.runId,{submissionId:'bank-result',summary:'External bank passed',tests:[{criterion:'bank test',requestId:'test-1',outcome:'passed'}],limits:[]});
 assert.equal(submission.tests[0].receiptDigest,m.calls['test-1'].receiptDigest);
});
test('unknown effect preserves lease, blocks publication and allows independent local work',async t=>{
 const f=await fixture(t);f.external.register(f.run.runId,{version:f.run.version,profile:f.profile},{initial:true});
 const args=f.args('unknown',{argv:['/usr/bin/true']}),grant=f.external.authorize('external_execute',args);f.finish(args,grant,'UNKNOWN',null);
 assert.throws(()=>f.registry.releaseUnusedTests(f.run.runId,{transactionId:f.lease.transactionId}),/external-effects/);
 assert.throws(()=>submitAutonomousWork(f.registry,f.run.runId,{}),/external-effects/);
 const local=f.args('independent',{argv:['/usr/bin/true']});delete local.adapter_id;
 assert.ok(autonomousGrant(f.registry,f.run.runId,local,{status:'AUTHORIZED_ATELIER',directory:f.project,atelier:'unused',runtimeRoots:[]}).autonomy);
 completeAutonomousCall(f.registry,f.run.runId,{request_id:'independent',status:'COMPLETED',exitCode:0,receiptDigest:'c'.repeat(64)});
 assert.equal(f.registry.testReservations(f.run.runId)[0].state,'HELD');
});
test('authenticated first preflight failure closes coordination without inventing a test or releasing its lease',async t=>{
 const f=await fixture(t);f.external.register(f.run.runId,{version:f.run.version,profile:f.profile},{initial:true});
 const a=f.args('preflight-failure',{argv:['/usr/bin/true']}),g=f.external.authorize('external_execute',a);
 const result=f.external.preflightFailed(a,g,'external-state-unsafe'),run=f.registry.runs.get(f.run.runId),call=run.externalCalls[a.request_id];
 assert.equal(result.status,'PREFLIGHT_FAILED');assert.equal(call.state,'PREFLIGHT_FAILED');assert.equal(call.executionIssued,true);
 assert.equal(call.receiptDigest,undefined);assert.equal(run.autonomy.calls[a.request_id],undefined);
 assert.throws(()=>submitAutonomousWork(f.registry,f.run.runId,{submissionId:'invalid-preflight',summary:'Not a test',tests:[{criterion:'bank test',requestId:a.request_id,outcome:'passed'}],limits:[]}),/autonomy-submission-invalid/);
 assert.equal(f.registry.testReservations(f.run.runId)[0].state,'HELD');
 assert.deepEqual(f.external.preflightFailed(a,g,'external-state-unsafe'),result);
 assert.throws(()=>f.external.authorize('external_execute',a),/external-request-terminal/);
 assert.equal(f.external.authorize('external_execute',f.args('fresh-request',{argv:['/usr/bin/true']})).status,'AUTHORIZED_EXTERNAL');
});
test('preflight coordination outcome survives registry restart without a synthetic test receipt',async t=>{
 const f=await fixture(t);f.external.register(f.run.runId,{version:f.run.version,profile:f.profile},{initial:true});
 const a=f.args('preflight-persisted',{argv:['/usr/bin/true']}),g=f.external.authorize('external_execute',a);
 f.external.preflightFailed(a,g,'external-state-unsafe');await f.registry.close();
 const restored=new ResourceRunRegistry(f.project,join(f.project,'private'));await restored.acquireAuthority();
 try {
  const run=restored.runs.get(f.run.runId),call=run.externalCalls[a.request_id];
  assert.equal(call.state,'PREFLIGHT_FAILED');assert.ok(call.preflightFailure.proofDigest);
  assert.equal(call.receiptDigest,undefined);assert.equal(run.autonomy.calls[a.request_id],undefined);
  assert.equal(restored.testReservations(f.run.runId)[0].state,'HELD');
 } finally {await restored.close();}
});
async function legacyPreflightFixture(t) {
 const f=await fixture(t);f.external.register(f.run.runId,{version:f.run.version,profile:f.profile},{initial:true});
 const args=f.args('legacy-preflight',{argv:['/usr/bin/true']}),grant=f.external.authorize('external_execute',args);
 const run=f.registry.runs.get(f.run.runId),call=run.externalCalls[args.request_id];
 const error='MCP tool "external_execute" on server "cgpt-validation" failed: external-state-unsafe';
 const ready=(callID,at)=>({tool:'cgpt-validation_broker_readiness',callID,state:{status:'completed',time:{end:at},output:JSON.stringify({status:'READY',ready:true,server_version:'2.7.1',instance_id:'inst-fixture',checked_at:new Date(at).toISOString(),broker_process:{pid:222,started_at:'1970-01-01T00:00:07.000Z'}})}});
 const part={tool:'cgpt-validation_external_execute',callID:'call-original',state:{status:'error',input:args,error,output:error,time:{start:20000,end:21000},metadata:{truncated:false,error:true,cabCodeMode:{nativeMcpError:true,wrapperId:'call-original',envelopeHash:'a'.repeat(64)},toolCalls:[{tool:'cgpt-validation.external_execute',status:'error',input:args}]}}};
 const update={id:'update-fixture',phase:'COMPLETED',version:'2.7.1',brokerConnected:true,updatedAt:'1970-01-01T00:00:10.000Z',brokerReconnectedAt:5000,nativeIdentity:{pid:111,version:'2.2.6',sharedDirectory:run.directory},files:[
  {group:'broker',name:'cgpt_approval_bridge_server.py',afterHash:'5f96a6f947512c56c38d3666b17e69069b7747f7041add947404fdac897801ad'},
  {group:'broker',name:'cgpt_approval_bridge_external.py',afterHash:'291025f739b8bc2fb1b671d94346f369151317910150379a81086aca744f389e'}]};
 return {...f,run,call,grant,proofInput:{run,call,parts:[ready('ready-before',15000),part,ready('ready-after',30000)],update,nativeProof:{kind:'controller-native-instance',workspace:run.directory,pid:111,version:'2.2.6',observedAt:1000}},part};
}
test('legacy preflight proof requires native error bracketed by the same delivered broker instance',async t=>{
 const f=await legacyPreflightFixture(t),proof=legacyExternalPreflightProof(f.proofInput);
 assert.equal(proof.requestId,'legacy-preflight');assert.equal(proof.limitation,'DEPLOYED_ARTIFACTS_AND_PROCESS_CONTINUITY_NOT_CONTINUOUS_MEMORY_HASH');
 assert.match(proof.proofDigest,/^[a-f0-9]{64}$/);assert.equal(f.call.state,'INTENT');
});
test('legacy preflight review preserves intent history, refuses replay and leaves the bank held',async t=>{
 const f=await legacyPreflightFixture(t),proof=legacyExternalPreflightProof(f.proofInput);proof.boundaryDigest='d'.repeat(64);
 const payload={actionId:'review-legacy',ownerId:f.run.ownerId,version:f.run.version,requestId:f.call.requestId,
  previewDigest:proof.boundaryDigest,evidence:['qualified-native-boundary']},effect='e'.repeat(64);
 const result=f.external.reconcileLegacyPreflight(f.run.runId,payload,proof,effect);
 assert.equal(result.state,'PREFLIGHT_FAILED');assert.equal(result.coordinationOnly,true);assert.equal(f.call.executionIssued,true);
 assert.equal(f.call.preflightFailure.previousState,'INTENT');assert.equal(f.call.preflightFailure.effectDigest,effect);
 assert.equal(f.call.receiptDigest,undefined);assert.equal(f.run.autonomy.calls[f.call.requestId],undefined);
 assert.equal(f.registry.testReservations(f.run.runId)[0].state,'HELD');
 assert.deepEqual(f.external.reconcileLegacyPreflight(f.run.runId,payload,proof,effect),result);
 assert.throws(()=>f.external.authorize('external_execute',f.part.state.input),/external-request-terminal/);
});
test('legacy preflight requires a scoped owner policy and recovers a lost response without replay',async t=>{
 const f=await legacyPreflightFixture(t),recovery=new RecoveryCoordinator(f.registry,join(f.project,'private','recovery-policies.json'));
 const sourceReceiptId='update-00000000-0000-0000-0000-000000000000';f.proofInput.update.id=sourceReceiptId;
 const proof=legacyExternalPreflightProof(f.proofInput);proof.boundaryDigest='d'.repeat(64);
 recovery.grant(f.run.runId,{policyId:'wrong-scope',ownerId:f.run.ownerId,version:f.run.version,
  actions:['reconcile-external-preflight'],resources:[{key:'file:src',mode:'write'}],authorization:'Different resource only'});
 assert.equal(recovery.plan(f.run.runId).actions.find(a=>a.action==='reconcile-external-preflight').authority,'orchestrator-policy-required');
 recovery.grant(f.run.runId,{policyId:'external-policy',ownerId:f.run.ownerId,version:f.run.version,
  actions:['reconcile-external-preflight'],resources:[{key:f.call.resourceKey,mode:'write'}],authorization:'Review only this preflight boundary'});
 const plan=recovery.plan(f.run.runId);assert.ok(plan.actions.some(a=>a.action==='reconcile-external-preflight'&&a.authority==='orchestrator'));
 const request={actionId:'review-legacy',ownerId:f.run.ownerId,policyId:'external-policy',boundaryDigest:plan.boundaryDigest,
  action:'reconcile-external-preflight',targetId:f.call.requestId,input:{sourceReceiptId,nativeBoundaryDigest:proof.boundaryDigest,evidence:['native-and-delivery']}};
 assert.throws(()=>recovery.authorize(f.run.runId,{...request,ownerId:'foreign'}),/recovery-owner-or-policy-divergent/);
 const originalDigest=f.call.inputDigest;f.call.inputDigest='0'.repeat(64);
 assert.throws(()=>recovery.authorize(f.run.runId,request),/recovery-boundary-stale/);f.call.inputDigest=originalDigest;
 const action=recovery.authorize(f.run.runId,request);assert.equal(action.path,'/external/reconcile-preflight');
 const p={actionId:request.actionId,ownerId:f.run.ownerId,version:f.run.version,requestId:f.call.requestId,
  previewDigest:proof.boundaryDigest,evidence:request.input.evidence};
 f.external.reconcileLegacyPreflight(f.run.runId,p,proof,mandateDigest(action.payload));
 await f.registry.close();const restored=new ResourceRunRegistry(f.project,join(f.project,'private'));await restored.acquireAuthority();
 try {
  const after=new RecoveryCoordinator(restored,join(f.project,'private','recovery-policies.json'));
  const replay=after.authorize(f.run.runId,request);assert.equal(replay.replay,true);assert.equal(replay.status,200);
  assert.equal(replay.result.state,'PREFLIGHT_FAILED');assert.equal(replay.result.coordinationOnly,true);
  assert.equal(restored.runs.get(f.run.runId).autonomy.calls[f.call.requestId],undefined);
  assert.equal(restored.testReservations(f.run.runId)[0].state,'HELD');
 } finally {await restored.close();}
});
for(const variant of ['changed-input','changed-lease','wrong-owner','stale-preview','already-dispatched'])test('legacy preflight review refuses '+variant,async t=>{
 const f=await legacyPreflightFixture(t),proof=legacyExternalPreflightProof(f.proofInput);proof.boundaryDigest='d'.repeat(64);
 const payload={actionId:'review-legacy',ownerId:f.run.ownerId,version:f.run.version,requestId:f.call.requestId,
  previewDigest:proof.boundaryDigest,evidence:['qualified-native-boundary']};
 if(variant==='changed-input')f.call.inputDigest='0'.repeat(64);
 if(variant==='changed-lease')f.call.fencing++;
 if(variant==='wrong-owner')payload.ownerId='foreign';
 if(variant==='stale-preview')payload.previewDigest='0'.repeat(64);
 if(variant==='already-dispatched')f.call.dispatched=true;
 assert.throws(()=>f.external.reconcileLegacyPreflight(f.run.runId,payload,proof,'e'.repeat(64)));
 assert.equal(f.call.state,'INTENT');assert.equal(f.registry.testReservations(f.run.runId)[0].state,'HELD');
});
for(const variant of ['artifact','missing-before','other-instance','readiness-error','input','duplicate','error','native-instance','late-update'])test('legacy preflight proof rejects '+variant,async t=>{
 const f=await legacyPreflightFixture(t),x=f.proofInput;
 if(variant==='artifact')x.update.files[1].afterHash='0'.repeat(64);
 if(variant==='missing-before')x.parts.shift();
 if(variant==='other-instance'){const p=x.parts.at(-1),v=JSON.parse(p.state.output);v.instance_id='inst-other';p.state.output=JSON.stringify(v);}
 if(variant==='readiness-error'){const p=structuredClone(x.parts[0]);p.state.status='error';p.state.time.end=f.part.state.time.end;x.parts.push(p);}
 if(variant==='input')f.part.state.input={...f.part.state.input,argv:['/usr/bin/false']};
 if(variant==='duplicate')x.parts.push(structuredClone(f.part));
 if(variant==='error')f.part.state.error='other-error';
 if(variant==='native-instance')x.nativeProof.pid=112;
 if(variant==='late-update')x.update.updatedAt='1970-01-01T00:00:25.000Z';
 assert.throws(()=>legacyExternalPreflightProof(x),/external-preflight-evidence-invalid/);assert.equal(f.call.state,'INTENT');
});
for(const variant of ['repeat-grant','wrong-code','wrong-digest','wrong-fence','wrong-session'])test('prévol externe refuse preuve divergente : '+variant,async t=>{
 const f=await fixture(t);f.external.register(f.run.runId,{version:f.run.version,profile:f.profile},{initial:true});
 const a=f.args('preflight-divergent',{argv:['/usr/bin/true']}),g=f.external.authorize('external_execute',a);
 if(variant==='repeat-grant')g.execution_known=true;if(variant==='wrong-digest')g.input_digest='0'.repeat(64);
 if(variant==='wrong-fence')g.fencing++;if(variant==='wrong-session')a.session_id='ses_foreign';
 assert.throws(()=>f.external.preflightFailed(a,g,variant==='wrong-code'?'other-error':'external-state-unsafe'));
 assert.equal(f.registry.runs.get(f.run.runId).externalCalls['preflight-divergent'].state,'INTENT');
 assert.equal(f.registry.testReservations(f.run.runId)[0].state,'HELD');
});
test('cleanup and independent verification release the bank without exposing its private token',async t=>{
 const f=await fixture(t);f.external.register(f.run.runId,{version:f.run.version,profile:f.profile},{initial:true});
 for(const phase of ['cleanup','verify-cleanup']){const args=f.args(phase,{argv:['/usr/bin/true'],phase});f.finish(args,f.external.authorize('external_execute',args));}
 const args=f.args('release',{cleanup_request_id:'cleanup',verification_request_id:'verify-cleanup'});delete args.adapter_id;
 const result=f.external.release(args);assert.equal(result.status,'RELEASED');assert.equal('token' in result,false);assert.deepEqual(f.external.release(args),result);
 assert.equal(f.registry.testReservations(f.run.runId)[0].state,'RELEASED');
});
test('wrong identity, stale fence, changed commands and source failures remain explicit',async t=>{
 const f=await fixture(t);f.external.register(f.run.runId,{version:f.run.version,profile:f.profile},{initial:true});
 assert.throws(()=>f.external.authorize('external_execute',{...f.args('bad',{argv:['/usr/bin/true']}),session_id:'ses_other'}),/divergent/);
 const a=f.args('one',{argv:['/usr/bin/true']}),g=f.external.authorize('external_execute',a);
 assert.throws(()=>f.external.authorize('external_execute',{...a,argv:['/usr/bin/false']}),/request-conflict/);
 f.finish(a,g,'COMPLETED',1);
 assert.throws(()=>submitAutonomousWork(f.registry,f.run.runId,{submissionId:'fake',summary:'not passed',tests:[{requestId:'one',criterion:'bank test',outcome:'passed'}],limits:[]}),error=>error.diagnostic?.reason==='test-did-not-pass');
 f.registry.restoredTests.add(f.lease.transactionId);assert.throws(()=>f.external.authorize('external_execute',f.args('stale',{argv:['/usr/bin/true']})),/lease-required/);
});
