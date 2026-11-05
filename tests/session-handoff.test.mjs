import {fixtureEnvironment} from './helpers/cab-environment.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createJobContext,VERSION} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs';
Object.assign(process.env,fixtureEnvironment,{OC_Codex_OUTSIDE_SANDBOX:'1',OC_Codex_DECISION_MODE:'manual'});

async function fixture(t) {
  const directory=mkdtempSync(join(tmpdir(),'cab-handoff-job-')), state=join(directory,'state'); mkdirSync(state,{mode:0o700});
  const run={runId:'run-handoff',contextId:1,version:1,sessionId:'ses_old',directory,changeId:'change-handoff'};
  const job={jobId:'job-handoff',sessionId:run.sessionId,directory,changeId:run.changeId,criteria:['product proof'],armed:true,
    lastProvenMilestone:'previous checkpoint',currentCabMandate:null,terminalGate:{status:'OPEN'},extension:{witness:'preserved'}};
  const jobPath=join(state,'controller-job.json');writeFileSync(jobPath,JSON.stringify(job),{mode:0o600});
  const native={busy:{},permissions:[],oldParts:[],parts:[{type:'tool',tool:'cgpt-validation_broker_readiness',callID:'call_ready',
    state:{status:'completed',input:{run_id:run.runId},metadata:{cabCodeMode:{wrapperId:'native_ready'}},
      output:JSON.stringify({status:'READY',pending_count:0,run_id:run.runId,server_version:VERSION}),time:{start:1,end:2}}}],
    permission:[{permission:'*',pattern:'*',action:'ask'}],pid:12345};
  let forbidden=0;
  const openCode={
    info:async()=>({pid:native.pid,version:'2.2.5'}),location:async()=>({directory}),mcp:async()=>({'cgpt-validation':{status:'connected'}}),
    sessionStatus:async()=>native.busy,permissions:async()=>native.permissions,
    session:async id=>({id,directory,permission:native.permission,...(native.model?{model:native.model}:{})}),
    messages:async id=>[{info:{id:'msg_'+id,role:'assistant',...(native.model||{})},parts:id==='ses_old'?native.oldParts:native.parts}],
    replyPermission:async()=>{forbidden++;throw Error('no permission effect allowed');},
  };
  let context=createJobContext({workspace:directory,stateDirectory:state,run,openCodeClient:openCode});
  const readiness=async()=>context.handle({method:'POST',cabPayload:{status:'READY',pending_count:0}},
    {writeHead(){return this;},end(){}},new URL('http://127.0.0.1/broker/readiness'));
  await readiness();
  t.after(async()=>{await context.close();rmSync(directory,{recursive:true,force:true});assert.equal(forbidden,0);});
  return {native,run,job,context,jobPath,async restart(){await context.close();context=createJobContext({workspace:directory,stateDirectory:state,run,openCodeClient:openCode});await readiness();return context;}};
}

test('handoff checkpoint repair is atomic, preserves business fields and observes old SID without admitting it',async t=>{
  const h=await fixture(t), first=await h.context.inspectSessionHandoff('ses_new');
  const receipt={handoffId:'handoff-1',runId:h.run.runId,contextId:1,jobId:h.job.jobId,sourceSessionId:'ses_old',sessionId:'ses_new',
    checkpointDigest:first.checkpointDigest,state:'COMMITTED',committedAt:new Date().toISOString()};
  h.run.sessionId='ses_new';
  h.context=await h.restart();
  assert.equal(h.context.publicJob().sessionId,'ses_old');
  await h.context.applySessionHandoff(receipt);
  assert.deepEqual(h.context.sessions(),['ses_new']); assert.deepEqual(h.context.observedSessions(),['ses_new','ses_old']);
  const saved=JSON.parse(readFileSync(h.jobPath));assert.equal(saved.lastProvenMilestone,h.job.lastProvenMilestone);
  assert.deepEqual(saved.criteria,h.job.criteria);assert.deepEqual(saved.extension,h.job.extension);
  assert.equal(saved.armed,true);assert.equal(saved.terminalGate.status,'OPEN');assert.deepEqual(saved.revokedSessions,['ses_old']);
  const restored=await h.restart();await restored.applySessionHandoff(receipt);
  assert.equal(restored.publicJob().sessionHandoffHistory.length,1); assert.deepEqual(restored.sessions(),['ses_new']);
  await assert.rejects(restored.applySessionHandoff({...receipt,checkpointDigest:'a'.repeat(64)}),/checkpoint-divergent/);
});

test('handoff allows only exact acknowledged protected historical bash call while old session is idle',async t=>{
  const h=await fixture(t);
  h.native.oldParts=[{type:'tool',tool:'bash',callID:'call_old',state:{status:'running',input:{command:'vite --port 5173'}}}];
  await assert.rejects(h.context.inspectSessionHandoff('ses_new'),/new-call-active/);
  const {createHash}=await import('node:crypto');
  const allowed={sessionId:'ses_old',callId:'call_old',kind:'bash',targetDigest:createHash('sha256').update(JSON.stringify(['bash','vite --port 5173'])).digest('hex')};
  assert.ok((await h.context.inspectSessionHandoff('ses_new',[allowed])).boundaryDigest);
  await assert.rejects(h.context.inspectSessionHandoff('ses_new',[{...allowed,targetDigest:'0'.repeat(64)}]),/new-call-active/);
});

for(const [name,mutate,expected] of [
  ['busy',h=>h.native.busy.ses_new={type:'busy'},/session-not-idle/],
  ['pending permission',h=>h.native.permissions.push({sessionID:'ses_new'}),/native-permissions-unresolved/],
  ['native allow',h=>h.native.permission[0].action='allow',/native-ask-required/],
  ['unsealed readiness',h=>delete h.native.parts[0].state.metadata.cabCodeMode,/candidate-not-read-only/],
  ['old readiness',h=>h.native.parts[0].state.output=JSON.stringify({status:'READY',pending_count:0,run_id:h.run.runId,server_version:'old'}),/readiness-invalid/],
  ['business effect',h=>h.native.parts.push({type:'tool',tool:'edit',state:{status:'completed'}}),/candidate-not-read-only/],
  ['missing native PID',h=>h.native.pid=null,/native-identity-missing/],
]) test('handoff refuses '+name+' without changing job',async t=>{
  const h=await fixture(t), before=readFileSync(h.jobPath,'utf8'); mutate(h);
  await assert.rejects(h.context.inspectSessionHandoff('ses_new'),expected);
  assert.equal(readFileSync(h.jobPath,'utf8'),before);assert.deepEqual(h.context.sessions(),['ses_old']);
});

test('handoff refuses changed checkpoint before metadata repair',async t=>{
  const h=await fixture(t);
  await assert.rejects(h.context.applySessionHandoff({handoffId:'wrong',runId:h.run.runId,contextId:1,jobId:h.job.jobId,
    sourceSessionId:'ses_old',sessionId:'ses_new',state:'COMMITTED',checkpointDigest:'a'.repeat(64),committedAt:new Date().toISOString()}),/checkpoint-divergent/);
  assert.equal(h.context.publicJob().sessionId,'ses_old');
});

test('handoff preserves a qualified model contract and refuses a different reasoning or provider',async t=>{
  const h=await fixture(t),now=new Date().toISOString();
  const stored=JSON.parse(readFileSync(h.jobPath));stored.codingModel={protocol:'pllm-auto-v1',source:'prompt',providerID:'fixture',modelID:'fixture',reasoning:'high',
    selectedAt:now,mode:null,priority:null,catalogDigest:null,evaluatedAt:null,preflight:{sessionId:'ses_old',messageId:'msg_old',verifiedAt:now}};
  writeFileSync(h.jobPath,JSON.stringify(stored));h.context=await h.restart();
  await assert.rejects(h.context.inspectSessionHandoff('ses_new'),/model-divergent/);
  h.native.model={providerID:'fixture',modelID:'fixture',variant:'high'};
  assert.ok((await h.context.inspectSessionHandoff('ses_new')).boundaryDigest);
  h.native.model.variant='low';await assert.rejects(h.context.inspectSessionHandoff('ses_new'),/model-divergent/);
  h.native.model.variant='high';h.native.model.providerID='other';
  await assert.rejects(h.context.inspectSessionHandoff('ses_new'),/model-divergent/);
  const original=h.native.parts;
  assert.equal(h.context.publicJob().codingModel.reasoning,'high');assert.equal(h.context.publicJob().sessionId,'ses_old');
  assert.equal(h.native.parts,original);
});

for(const phase of ['recovery','PREPARED','APPLYING','NATIVE_UNCONFIRMED']) test('handoff refuses persisted '+phase+' after restart without an inFlight request',async t=>{
  const h=await fixture(t),stored=JSON.parse(readFileSync(h.jobPath)),now=new Date().toISOString();
  if(phase==='recovery')stored.recovery={jobId:h.job.jobId,expectedSessionId:'ses_old',sessionId:'ses_recovery',recoveryId:'recovery-pending',preflightRequestId:'preflight-pending',preparedAt:now};
  else {
    const {modelContractHash,MODEL_TRANSITION_PROTOCOL}=await import('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-transition.mjs');
    const candidate={protocol:'pllm-auto-v1',source:'prompt',providerID:'fixture',modelID:'fixture',reasoning:'high',selectedAt:now,mode:null,priority:null,catalogDigest:null,evaluatedAt:null};
    stored.modelTransition={protocol:MODEL_TRANSITION_PROTOCOL,transactionId:'persisted-model',developerAuthorization:'synthetic owner mandate',
      jobId:h.job.jobId,sessionId:'ses_old',runVersion:1,contextId:1,preparedAt:now,phase,expectedModelHash:modelContractHash(null),
      before:null,selection:{model:'fixture/fixture',reasoning:'high'},candidate,connection:null,
      ...(phase!=='PREPARED'?{verifiedModel:{...candidate,preflight:{sessionId:'ses_old',messageId:'msg_preflight',verifiedAt:now}},previousNativeModel:null}:{})};
  }
  writeFileSync(h.jobPath,JSON.stringify(stored));h.context=await h.restart();
  const before=readFileSync(h.jobPath,'utf8');
  await assert.rejects(h.context.inspectSessionHandoff('ses_new'),/session-handoff-not-quiescent/);
  assert.equal(readFileSync(h.jobPath,'utf8'),before);assert.deepEqual(h.context.sessions().slice(0,1),['ses_old']);
});

test('handoff refreshes readonly readiness in the same candidate without reusing an old version as fresh proof',async t=>{
  const h=await fixture(t),old=structuredClone(h.native.parts[0]);old.callID='call_old_ready';
  old.state.output=JSON.stringify({status:'BLOCKED',pending_count:1,run_id:h.run.runId,server_version:'2.2.12'});
  h.native.parts.unshift(old);assert.ok((await h.context.inspectSessionHandoff('ses_new')).boundaryDigest);
  h.native.parts.pop();await assert.rejects(h.context.inspectSessionHandoff('ses_new'),/readiness-invalid/);
});
