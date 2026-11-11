import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync,linkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {ResourceRunRegistry} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs';
import {grantAutonomy,autonomousGrant,completeAutonomousCall,submitAutonomousWork,reviewAutonomousWork,requireAutonomousAcceptance,sourceRevision,mandateDigest,requestAutonomyException,decideAutonomyException} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-autonomous-mandate.mjs';

async function fixture(t) {
 const root=mkdtempSync(join(tmpdir(),'cab-autonomous-'));mkdirSync(join(root,'src'));mkdirSync(join(root,'other'));
 writeFileSync(join(root,'src/a.py'),'VALUE=1\n');writeFileSync(join(root,'other/peer.py'),'PEER=1\n');
 const registry=new ResourceRunRegistry(root,join(root,'private'));await registry.acquireAuthority();
 t.after(async()=>{await registry.close();rmSync(root,{recursive:true,force:true});});
 const reserve=(id,path)=>registry.reserve({runId:id,ownerId:'owner-'+id,sessionId:'ses_'+id,directory:root,changeId:'change-'+id,selectionKey:'selection-'+id,dependsOn:[],resources:[{key:'file:'+path,mode:'write'}],exclusiveResources:[]});
 const run=reserve('autonomous','src');
 const mandate={protocol:'autonomous-change-v1',mandateId:'mandate',version:run.version,sessionId:run.sessionId,objective:'Implement VALUE',criteria:['value is 2'],constraints:['No network'],decisionsResolved:true,decisions:['Developer chose VALUE=2 before coding'],paths:['src']};
 const args=id=>({request_id:id,run_id:run.runId,reservation_version:run.version,session_id:run.sessionId,change_id:run.changeId,directory:root,argv:['/usr/bin/true']});
 const grant={status:'AUTHORIZED_ATELIER',directory:root,atelier:root+'/.cab-tests/change-autonomous/autonomous',runtimeRoots:[]};
 return {root,registry,run,reserve,mandate,args,grant};
}

test('mandate requires decisions before coding and cannot expand the reservation',async t=>{
 const f=await fixture(t);
 for(const patch of [{decisionsResolved:false},{paths:['other']},{paths:['../outside']},{decisions:['']}])
  assert.throws(()=>grantAutonomy(f.registry,f.run.runId,{...f.mandate,...patch}));
 const m=grantAutonomy(f.registry,f.run.runId,f.mandate);assert.equal(m.metrics.intermediateDecisions,0);
 assert.deepEqual(grantAutonomy(f.registry,f.run.runId,f.mandate),m);
 assert.throws(()=>grantAutonomy(f.registry,f.run.runId,{...f.mandate,objective:'different'}),/conflict/);
 assert.throws(()=>f.reserve('overlap','src/a.py'),/autonomy-peer-conflict/);
 const peer=f.reserve('peer','other');assert.equal(peer.state,'RESERVED');
});

test('multiple edits, failing test, correction and final review need no intermediate decision',async t=>{
 const f=await fixture(t);grantAutonomy(f.registry,f.run.runId,f.mandate);
 for(let i=0;i<4;i++) {
  const args=f.args('call-'+i);const grant=autonomousGrant(f.registry,f.run.runId,args,f.grant);
  assert.equal(grant.autonomy.paths[0],join(f.root,'src'));
  assert.throws(()=>submitAutonomousWork(f.registry,f.run.runId,{submissionId:'early',summary:'early',tests:[],limits:[]}));
  assert.throws(()=>autonomousGrant(f.registry,f.run.runId,f.args('parallel'),f.grant),/not-working/);
  writeFileSync(join(f.root,'src/a.py'),'VALUE='+i+'\n');
  completeAutonomousCall(f.registry,f.run.runId,{request_id:args.request_id,status:'COMPLETED',exitCode:i===0?1:0,receiptDigest:'receipt-'+i});
  assert.deepEqual(autonomousGrant(f.registry,f.run.runId,args,f.grant),grant);
 }
 const payload={submissionId:'submission-1',summary:'Result and tests',tests:[{criterion:'value is 2',requestId:'call-3',receiptDigest:'receipt-3',outcome:'passed'}],limits:[]};
 const submission=submitAutonomousWork(f.registry,f.run.runId,payload);
 assert.deepEqual(submitAutonomousWork(f.registry,f.run.runId,payload),submission);
 assert.throws(()=>autonomousGrant(f.registry,f.run.runId,f.args('after-submit'),f.grant),/not-working/);
 assert.throws(()=>requireAutonomousAcceptance(f.registry.runs.get(f.run.runId)),/acceptance-required/);
 reviewAutonomousWork(f.registry,f.run.runId,{reviewId:'review-1',submissionDigest:submission.digest,decision:'changes-requested',reason:'Use the selected value'});
 writeFileSync(join(f.root,'src/a.py'),'VALUE=2\n');
 autonomousGrant(f.registry,f.run.runId,f.args('retest'),f.grant);
 completeAutonomousCall(f.registry,f.run.runId,{request_id:'retest',status:'COMPLETED',exitCode:0,receiptDigest:'receipt-retest'});
 payload.tests=[{criterion:'value is 2',requestId:'retest',receiptDigest:'receipt-retest',outcome:'passed'}];
 const second=submitAutonomousWork(f.registry,f.run.runId,{...payload,submissionId:'submission-2'});
 reviewAutonomousWork(f.registry,f.run.runId,{reviewId:'review-2',submissionDigest:second.digest,decision:'accept',reason:'Tests and diff reviewed'});
 const active=f.registry.runs.get(f.run.runId);requireAutonomousAcceptance(active);
 assert.deepEqual(active.autonomy.metrics,{initialMandates:1,intermediateDecisions:0,submissions:2,reviews:2,exceptions:0});
 writeFileSync(join(f.root,'src/a.py'),'VALUE=3\n');
 assert.throws(()=>requireAutonomousAcceptance(active),/acceptance-required/);
 assert.equal(readFileSync(join(f.root,'other/peer.py'),'utf8'),'PEER=1\n');
});

test('unknown effect, stale generation, forged passed test, symlinks and shared inodes are refused',async t=>{
 const f=await fixture(t);grantAutonomy(f.registry,f.run.runId,f.mandate);
 autonomousGrant(f.registry,f.run.runId,f.args('test-failed'),f.grant);
 completeAutonomousCall(f.registry,f.run.runId,{request_id:'test-failed',status:'COMPLETED',exitCode:1,receiptDigest:'failed'});
 assert.throws(()=>submitAutonomousWork(f.registry,f.run.runId,{submissionId:'fake',summary:'fake',limits:[],tests:[{criterion:'value is 2',requestId:'test-failed',receiptDigest:'failed',outcome:'passed'}]}),/submission-invalid/);
 symlinkSync(join(f.root,'other/peer.py'),join(f.root,'src/alias'));
 assert.throws(()=>sourceRevision(f.root,['src']),/unsafe/);rmSync(join(f.root,'src/alias'));
 linkSync(join(f.root,'other/peer.py'),join(f.root,'src/hardlink'));
 assert.throws(()=>sourceRevision(f.root,['src']),/unsafe/);rmSync(join(f.root,'src/hardlink'));
 f.registry.runs.get(f.run.runId).version++;
 assert.throws(()=>autonomousGrant(f.registry,f.run.runId,f.args('stale'),f.grant),/stale/);
});

test('persistent mandate resumes with same identities and known receipts are not relaunched',async t=>{
 const f=await fixture(t);grantAutonomy(f.registry,f.run.runId,f.mandate);
 autonomousGrant(f.registry,f.run.runId,f.args('known'),f.grant);
 const data={request_id:'known',status:'COMPLETED',exitCode:0,receiptDigest:'known-receipt'};
 completeAutonomousCall(f.registry,f.run.runId,data);await f.registry.close();
 const restored=new ResourceRunRegistry(f.root,join(f.root,'private'));await restored.acquireAuthority();t.after(()=>restored.close());
 const grant=autonomousGrant(restored,f.run.runId,f.args('known'),f.grant);assert.equal(grant.autonomy.mandateId,'mandate');
 assert.equal(restored.runs.get(f.run.runId).autonomy.calls.known.state,'COMPLETED');
 assert.equal(completeAutonomousCall(restored,f.run.runId,data).status,'RECORDED');
});

test('real isolated execution writes two sources, runs tests and blocks peer, host and network',async t=>{
 const f=await fixture(t);grantAutonomy(f.registry,f.run.runId,f.mandate);
 mkdirSync(f.grant.atelier,{recursive:true});
 const script=`from pathlib import Path\nimport socket\np=Path(${JSON.stringify(f.root)})\n(p/'src/a.py').write_text('VALUE=2\\n')\n(p/'src/b.py').write_text('assert 1+1==2\\n')\nexec((p/'src/a.py').read_text());assert VALUE==2\nexec((p/'src/b.py').read_text())\ntry:\n (p/'other/peer.py').write_text('forbidden')\n raise AssertionError('peer writable')\nexcept OSError:pass\ntry:\n socket.create_connection(('1.1.1.1',443),0.2)\n raise AssertionError('network available')\nexcept OSError:pass\nprint('AUTONOMOUS_BOUNDARIES_OK')`;
 const args={...f.args('actual'),argv:['/usr/bin/python3','-c',script]},grant=autonomousGrant(f.registry,f.run.runId,args,f.grant);
 const code=`import sys,json\nsys.path.insert(0,${JSON.stringify(join(process.cwd(),'plugins/cab-approval-bridge/broker'))})\nimport cgpt_approval_bridge_atelier as a\nargs=json.loads(${JSON.stringify(JSON.stringify(args))});grant=json.loads(${JSON.stringify(JSON.stringify(grant))})\nr=a.execute(args,lambda _:grant,job_home=${JSON.stringify(join(f.root,'job-home'))})\nassert a.execute(args,lambda _:grant,job_home=${JSON.stringify(join(f.root,'job-home'))})==r\nprint(json.dumps(r))`;
 const result=JSON.parse(execFileSync('/home/devops/python/current/bin/python3',['-B','-c',code],{encoding:'utf8',timeout:20000}));
 assert.equal(result.status,'COMPLETED');assert.equal(result.exitCode,0,result.output);assert.match(result.output,/AUTONOMOUS_BOUNDARIES_OK/);
 assert.equal(readFileSync(join(f.root,'src/a.py'),'utf8'),'VALUE=2\n');assert.equal(readFileSync(join(f.root,'other/peer.py'),'utf8'),'PEER=1\n');
 completeAutonomousCall(f.registry,f.run.runId,{request_id:'actual',status:result.status,exitCode:result.exitCode,receiptDigest:mandateDigest(result)});
});

test('explicit replacement preserves history and is refused while an effect is uncertain',async t=>{
 const f=await fixture(t);const initial=grantAutonomy(f.registry,f.run.runId,f.mandate);
 autonomousGrant(f.registry,f.run.runId,f.args('pending'),f.grant);
 assert.throws(()=>grantAutonomy(f.registry,f.run.runId,{...f.mandate,mandateId:'replacement',replaces:initial.inputDigest}),/conflict/);
 completeAutonomousCall(f.registry,f.run.runId,{request_id:'pending',status:'COMPLETED',exitCode:0,receiptDigest:'pending-receipt'});
 const changed=grantAutonomy(f.registry,f.run.runId,{...f.mandate,mandateId:'replacement',replaces:initial.inputDigest});
 assert.equal(changed.previousMandates[0].mandateId,initial.mandateId);
 assert.equal(changed.previousMandates[0].calls.pending.state,'COMPLETED');
});


test('only four exceptions, explicit scoped answers and independent work are allowed',async t=>{
 const f=await fixture(t);grantAutonomy(f.registry,f.run.runId,f.mandate);
 for(const category of ['outside-change','outside-framing','missing-tool','web-consultation']) {
  const payload={request_id:'exception-'+category,category,summary:'Required decision: '+category};
  assert.equal(requestAutonomyException(f.registry,f.run.runId,payload).independentWorkMayContinue,true);
  const decision={requestId:payload.request_id,decision:'approved',scope:'Only the requested documented need'};
  assert.deepEqual(decideAutonomyException(f.registry,f.run.runId,decision),decision);
  assert.deepEqual(decideAutonomyException(f.registry,f.run.runId,decision),decision);
  assert.equal(requestAutonomyException(f.registry,f.run.runId,payload).status,'EXCEPTION_REQUESTED');
  assert.throws(()=>decideAutonomyException(f.registry,f.run.runId,{...decision,scope:'different'}),/conflict/);
 }
 assert.throws(()=>requestAutonomyException(f.registry,f.run.runId,{request_id:'ordinary',category:'test-failed',summary:'ordinary failed test'}),/invalid/);
 assert.equal(f.registry.runs.get(f.run.runId).autonomy.metrics.exceptions,4);
 assert.ok(autonomousGrant(f.registry,f.run.runId,f.args('independent'),f.grant).autonomy);
});

import {waitForAutonomousWork} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-autonomous-wait.mjs';
test('orchestrator waits on one event stream, without polling or intermediate decisions',async()=>{
 let checks=0,cancelled=false;
 const response=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: '+JSON.stringify({event:{type:'autonomy-review-requested',runId:'run'}})+'\n\n'));},cancel(){cancelled=true;}});
 const result=await waitForAutonomousWork({controller:'http://127.0.0.1:8788',runId:'run',fetchImpl:async url=>{
  if(new URL(url).pathname==='/monitor/events')return new Response(response);
  checks++;return Response.json({autonomy:{state:checks<3?'WORKING':'REVIEW_PENDING',exceptions:[],submissions:[{digest:'final'}]}});
 }});
 assert.equal(result.submissionDigest,'final');assert.equal(checks,3);assert.equal(cancelled,true);
 await assert.rejects(waitForAutonomousWork({controller:'http://external.invalid',runId:'run'}),/input-invalid/);
});
