import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ResourceRunRegistry} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs';
import {ExternalExecution} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-external-execution.mjs';
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
