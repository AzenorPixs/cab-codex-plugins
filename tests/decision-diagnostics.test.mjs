import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {createJobContext} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs';
process.env.OC_Codex_DECISION_MODE='manual';
process.env.OC_Codex_OUTSIDE_SANDBOX='1';

async function fixture(t,{inspect=true,observer=()=>{}}={}){
 const directory=mkdtempSync(join(tmpdir(),'cab-decision-'));const state=join(directory,'state');mkdirSync(state);
 const flags={cause:null,allowed:true};
 const context=createJobContext({workspace:directory,stateDirectory:state,observe:observer,openCodeClient:{},
  admitOperation:()=>flags.allowed,
  ...(inspect?{inspectOperationAdmission:()=>{if(flags.cause)throw flags.cause;return flags.allowed;}}:{})});
 t.after(async()=>{await context.close();rmSync(directory,{recursive:true,force:true});});
 const send=async(method,path,payload,raw)=>{
  const request={method,cabPayload:payload};
  if(raw!==undefined){delete request.cabPayload;request[Symbol.asyncIterator]=async function*(){yield raw;};}
  let status,headers={},text='';const response={writeHead(s,h={}){status=s;headers=h;return this;},end(value=''){text+=value;return this;}};
  await context.handle(request,response,new URL(path,'http://localhost'));
  return {status,headers,text,body:text?JSON.parse(text):null};
 };
 const approval={requestId:'request-fixture',approval_id:'approval-fixture',change_id:'change-fixture',
  session_id:'ses_fixture',directory,files:[],commands:['/usr/bin/true'],summary:'fixture'};
 const admit=()=>send('POST','/validation/request',{approval});
 const decide=(body)=>send('POST','/decision/'+approval.requestId,body);
 return {context,flags,send,approval,admit,decide};
}

test('diagnostic décision : invalide, JSON invalide et validation inconnue ont des codes distincts',async t=>{
 const h=await fixture(t);
 for(const value of [null,[],{}, {decision:'APPROVED'}, {decision:'secret-value'}]){
  const r=await h.decide(value);assert.equal(r.status,400);assert.equal(r.body.error,'decision-invalid');
  assert.equal(r.body.decision_recorded,false);assert.equal(r.headers['content-type'],'application/json');assert.ok(!r.text.includes('secret-value'));
 }
 const invalid=await h.send('POST','/decision/request-fixture',undefined,'{malformed');
 assert.equal(invalid.body.error,'decision-invalid-json');
 const unknown=await h.decide({decision:'approved'});assert.equal(unknown.body.error,'decision-validation-unknown');
 assert.equal(h.context.decision('request-fixture'),undefined);
});

test('diagnostic décision : causes admises précises, aucune décision implicite et GET404 compatible avec indécis1',async t=>{
 const h=await fixture(t);assert.equal((await h.admit()).status,202);
 for(const code of ['resource-revision-stale','reservation-version-stale','run-transition-in-flight','operation-outside-reservation','registry-unavailable']){
  h.flags.cause=Object.assign(new Error('sensitive private exception'),{code});
  const r=await h.decide({decision:'approved'});assert.equal(r.status,400);assert.equal(r.body.error,code);
  assert.equal(r.body.decision_recorded,false);assert.ok(!r.text.includes('sensitive'));assert.ok(r.text.length<1024);
  assert.equal((await h.send('GET','/decision/request-fixture')).status,404);
  assert.equal(h.context.publicStatus().undecidedValidationCount,1);
 }
});

test('diagnostic décision : exception et code arbitraires ne sont jamais exposés',async t=>{
 const h=await fixture(t);await h.admit();
 for(const cause of [new Error('/private/path secret-token'),Object.assign(new Error('raw-command'),{code:'attacker-secret-code'})]){
  h.flags.cause=cause;const r=await h.decide({decision:'approved'});
  assert.equal(r.body.error,'decision-processing-failed');assert.equal(r.body.decision_recorded,false);
  for(const value of ['/private/path','secret-token','raw-command','attacker-secret-code'])assert.ok(!r.text.includes(value));
 }
});

test('diagnostic décision : callback booléen historique faux reste bloquant',async t=>{
 const h=await fixture(t,{inspect:false});await h.admit();h.flags.allowed=false;
 const r=await h.decide({decision:'approved'});assert.equal(r.body.error,'decision-operation-not-admitted');
 assert.equal(r.body.decision_recorded,false);assert.equal(h.context.decision('request-fixture'),undefined);
});

test('diagnostic décision : invalidation et fermeture de contexte distinctes, rejet toujours possible',async t=>{
 const h=await fixture(t);await h.admit();h.context.invalidateOperation('request-fixture');
 assert.equal((await h.decide({decision:'approved'})).body.error,'decision-operation-invalidated');
 assert.equal((await h.decide({decision:'rejected'})).status,201);
 const duplicate=await h.decide({decision:'approved'});assert.equal(duplicate.body.error,'decision-already-recorded');assert.equal(duplicate.body.decision_recorded,true);
 assert.equal(h.context.decision('request-fixture').decision,'rejected');
 const other=await fixture(t);await other.admit();await other.context.close();
 assert.equal((await other.decide({decision:'approved'})).body.error,'decision-context-closed');
});

test('diagnostic décision : erreur après enregistrement indique la décision locale effective',async t=>{
 const h=await fixture(t,{observer:type=>{if(type==='validation-manually-answered')throw new Error('private observer failure');}});await h.admit();
 const r=await h.decide({decision:'rejected'});assert.equal(r.status,400);assert.equal(r.body.error,'decision-processing-failed');
 assert.equal(r.body.decision_recorded,true);assert.equal((await h.send('GET','/decision/request-fixture')).body.decision,'rejected');
 assert.ok(!r.text.includes('private observer failure'));
});


test('diagnostic décision : une validation réconciliée reste réservée au rejet',async t=>{
 const h=await fixture(t);
 assert.equal((await h.send('POST','/job/arm',{jobId:'job-fixture',sessionId:h.approval.session_id,directory:h.approval.directory,changeId:h.approval.change_id,criteria:['proof'],strictCommands:true})).status,201);
 h.context.installReconciledValidation({validation:{requestId:h.approval.requestId,approvalId:h.approval.approval_id,
  changeId:h.approval.change_id,rejectionOnly:true,operation:{sessionId:h.approval.session_id,directory:h.approval.directory,kind:'bash',target:'/usr/bin/true'}}});
 const result=await h.decide({decision:'approved'});assert.equal(result.status,400);
 assert.equal(result.body.error,'notification-reconciliation-rejection-only');assert.equal(result.body.decision_recorded,false);
 assert.equal((await h.decide({decision:'rejected'})).status,201);
});
