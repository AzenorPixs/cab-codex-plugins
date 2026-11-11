import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {ResourceRunRegistry} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs';
import {grantAutonomy,autonomousGrant,completeAutonomousCall,sourceRevision} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-autonomous-mandate.mjs';
import {CoderCoordination} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-coder-coordination.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
async function fixture(t,{shared=false,lost=false}={}) {
 const project=mkdtempSync(join(tmpdir(),'cab-coder-coordination-'));for(const name of ['a','b','shared'])mkdirSync(join(project,name));
 writeFileSync(join(project,'a/proof.md'),'candidate evidence\n');writeFileSync(join(project,'shared/source.md'),'source\n');
 const registry=new ResourceRunRegistry(project,join(project,'registry'));await registry.acquireAuthority();
 t.after(async()=>{await registry.close();rmSync(project,{recursive:true,force:true});});
 const contexts=new Map(),runs={};
 for(const name of ['a','b']) {
  const paths=[name,...(shared?['shared']:[])];
  const run=registry.reserve({runId:name,ownerId:'owner-'+name,sessionId:'ses_'+name,directory:project,changeId:'change-'+name,selectionKey:'select-'+name,dependsOn:[],resources:paths.map(p=>({key:'file:'+p,mode:'write'})),exclusiveResources:[]});runs[name]=run;
  contexts.set(name,{publicJob:()=>({armed:true,sessionId:run.sessionId,changeId:run.changeId,directory:project})});
  grantAutonomy(registry,name,{protocol:'autonomous-change-v1',mandateId:'mandate-'+name,version:run.version,sessionId:run.sessionId,objective:'Implement assigned change',criteria:['ready'],constraints:[],decisionsResolved:true,decisions:[],paths,coordination:true});
 }
 const sent=[];let observed=[];
 const openCode={prompt:async(session,text)=>{sent.push({session,text});if(lost)throw Error('lost');return {id:'message-'+sent.length,sessionID:session};},messages:async()=>observed};
 const coordination=new CoderCoordination({registry,contexts,openCode,stateRoot:join(project,'state')});
 for(const [name,run] of Object.entries(runs))await coordination.adopt(name,{version:run.version,sessionId:run.sessionId,authorization:'Developer initial mandate'});
 const request=(name,action,args={})=>({request_id:'req-'+name+'-'+action,run_id:name,reservation_version:runs[name].version,session_id:runs[name].sessionId,change_id:runs[name].changeId,directory:project,action,args});
 const publish=()=>coordination.act(request('a','publish',{notice_id:'notice-a',kind:'change',subject:'change-a',proof:'a/proof.md',proof_sha256:sha(readFileSync(join(project,'a/proof.md'))),stage:'tested'}));
 const subscribe=()=>coordination.act(request('b','subscribe',{dependency_id:'dependency-a',kind:'change',subject:'change-a',criterion:'ready'}));
 return {project,registry,runs,contexts,coordination,sent,request,publish,subscribe,setObserved:rows=>observed=rows};
}

test('two coders coordinate through controller-owned private SQLite without an orchestrator decision',async t=>{
 const f=await fixture(t);await f.subscribe();await f.publish();await f.publish();
 assert.equal(f.sent.length,1);assert.equal(f.sent[0].session,'ses_b');
 const inbox=await f.coordination.act(f.request('b','inbox'));assert.equal(inbox.items[0].actor_session,'ses_a');assert.equal(inbox.items[0].stage,'tested');assert.equal(inbox.items[0].proof_state,'fresh');
 await f.coordination.act(f.request('b','ack',{dependency_id:'dependency-a',notice_id:'notice-a'}));await f.coordination.pump();assert.equal(f.sent.length,1);
 assert.equal(f.registry.runs.get('a').autonomy.metrics.intermediateDecisions,0);
});
test('paused recipient is not resumed and gets one notice only after explicit resume',async t=>{
 const f=await fixture(t);await f.subscribe();f.registry.suspend('b',{version:f.runs.b.version,action:'PAUSE',evidence:['explicit developer pause']});
 await f.publish();assert.equal(f.sent.length,0);f.registry.suspend('b',{version:f.runs.b.version,action:'RESUME',evidence:['explicit developer resume']});
 await f.coordination.pump();assert.equal(f.sent.length,1);
});
test('lost native reply is observed without a second prompt and stale proof stays unverified',async t=>{
 const f=await fixture(t,{lost:true});await f.subscribe();await f.publish();assert.equal(f.sent.length,1);
 await f.coordination.pump();assert.equal(f.sent.length,1);
 f.setObserved([{info:{id:'actual-native-message',role:'user'},parts:[{type:'text',text:f.sent[0].text}]}]);await f.coordination.pump();await f.coordination.pump();assert.equal(f.sent.length,1);
 writeFileSync(join(f.project,'a/proof.md'),'changed');const inbox=await f.coordination.act(f.request('b','inbox'));assert.equal(inbox.items[0].proof_state,'stale');
});
test('identity spoofing and acceptance without a final review are refused',async t=>{
 const f=await fixture(t);await assert.rejects(f.coordination.act({...f.request('a','status'),session_id:'ses_b'}),/identity/);
 await assert.rejects(f.coordination.act(f.request('a','publish',{notice_id:'fake',stage:'accepted'})),/acceptance/);
});
test('shared autonomous resources are acquired atomically per execution, FIFO and revision checked',async t=>{
 const f=await fixture(t,{shared:true});
 const args=name=>({request_id:'call-'+name,run_id:name,reservation_version:f.runs[name].version,session_id:'ses_'+name,change_id:'change-'+name,directory:f.project,argv:['/usr/bin/true']});
 const grant={status:'AUTHORIZED_ATELIER',directory:f.project,atelier:'unused',runtimeRoots:[]};
 autonomousGrant(f.registry,'a',args('a'),grant);
 assert.throws(()=>autonomousGrant(f.registry,'b',args('b'),grant),/resources-busy/);
 assert.equal(f.registry.runs.get('b').autonomy.calls['call-b'].state,'WAITING');
 completeAutonomousCall(f.registry,'a',{request_id:'call-a',status:'COMPLETED',exitCode:0,receiptDigest:sha('receipt-a')});
 assert.ok(autonomousGrant(f.registry,'b',args('b'),grant).autonomy);
 completeAutonomousCall(f.registry,'b',{request_id:'call-b',status:'COMPLETED',exitCode:0,receiptDigest:sha('receipt-b')});
 assert.throws(()=>autonomousGrant(f.registry,'a',{...args('a'),request_id:'stale',expected_revision:'0'.repeat(64)},grant),/revision-stale/);
});
