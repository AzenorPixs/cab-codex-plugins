import test from 'node:test';
import assert from 'node:assert/strict';
import {rejectedUnissuedTurnProof} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-recovery-evidence.mjs';
const noEnvironment=p=>['cgpt-validation_request_validation','cgpt-validation_get_approval','cgpt-validation_poll_approval'].includes(p.tool)&&p.state?.status==='completed';
function fixture(){
 const approval={requestId:'req-a',approval_id:'approval-a',session_id:'ses_a',commands:['same-command']};
 const operation={operationId:'op-a',requestId:approval.requestId,sessionId:'ses_a',state:'PREPARED',decision:{status:'rejected',recordedAt:new Date(2000).toISOString()}};
 const user=(id,created)=>({info:{id,role:'user',sessionID:'ses_a',time:{created}},parts:[]});
 const assistant=(id,parentID,created,completed,finish,parts=[])=>({info:{id,role:'assistant',parentID,sessionID:'ses_a',finish,time:{created,completed}},parts});
 const requestPart={type:'tool',tool:'cgpt-validation_request_validation',callID:'request-call',state:{status:'completed',input:approval,output:JSON.stringify({...approval,status:'PENDING'})}};
 const rejectPart={type:'tool',tool:'cgpt-validation_poll_approval',callID:'reject-call',state:{status:'completed',input:{approval_id:approval.approval_id},output:JSON.stringify({...approval,status:'REJECTED'})}};
 const messages=[user('msg_user1',1000),assistant('msg_request','msg_user1',1100,1300,'tool-calls',[requestPart]),assistant('msg_pending_stop','msg_user1',1400,1500,'stop'),user('msg_user2',1700),assistant('msg_reject','msg_user2',1800,2100,'tool-calls',[rejectPart]),assistant('msg_stop','msg_user2',2200,2300,'stop'),{info:{id:'msg_system',role:'system',sessionID:'ses_a',time:{created:2350}},parts:[]},user('msg_user3',2400),assistant('msg_later','msg_user3',2500,2600,'stop',[{type:'tool',tool:'bash',state:{status:'completed',input:{command:approval.commands[0]},metadata:{exit:0}}}])];
 const same=v=>Object.keys(approval).every(k=>JSON.stringify(v?.[k])===JSON.stringify(approval[k]));
 return {approval,operation,messages,requestPart,rejectPart,proof(){return rejectedUnissuedTurnProof(messages,operation,approval,requestPart,noEnvironment,same);}};
}
test('rejet : chaîne native complète jusqu’au rejet observé, suffixe scellé sans le déclarer sans effet',()=>{
 const f=fixture(),p=f.proof();assert.equal(p.kind,'REJECTED_UNISSUED_TERMINAL_TURN');assert.equal(p.executionOutcome,'COORDINATION_WITHDRAWN_BEFORE_ISSUANCE');assert.equal(p.terminalTurn.terminalMessageId,'msg_stop');assert.ok(p.terminalTurn.laterMessagesDigest);assert.equal(p.nativeResult,undefined);assert.equal(p.once,undefined);
 f.messages.at(-1).parts[0].state.metadata.exit=1;assert.notEqual(f.proof().terminalTurn.wholeTranscriptDigest,p.terminalTurn.wholeTranscriptDigest);
});
function delayedFixture(){
 const f=fixture();f.operation.decision.recordedAt=new Date(1600).toISOString();
 f.requestPart.executed=false;f.requestPart.state.metadata={truncated:false};
 f.rejectPart.executed=false;f.rejectPart.state.metadata={truncated:false};
 f.messages[4].parts.unshift({type:'tool',tool:'bash',state:{status:'completed'}});
 return f;
}
test('rejet différé : tour initial clos sans effet, décision avant nouveau tour et poll exact ultérieur',()=>{
 const f=delayedFixture(),p=f.proof();assert.equal(p.kind,'REJECTED_UNISSUED_TERMINAL_TURN');
 assert.equal(p.terminalTurn.rejectionObservedLater,true);assert.equal(p.terminalTurn.terminalMessageId,'msg_pending_stop');
 assert.equal(p.terminalTurn.rejected.callId,'reject-call');assert.ok(p.terminalTurn.laterMessagesDigest);
});
for(const variant of ['late-decision','effect-in-original','foreign-rejection','truncated-poll','wrong-approval','same-parent-later','unterminated','missing-poll','early-decision','poll-before-next-user','duplicate-user','truncated-request'])
 test('rejet différé refuse '+variant,()=>{
  const f=delayedFixture();
  if(variant==='late-decision')f.operation.decision.recordedAt=new Date(5000).toISOString();
  if(variant==='effect-in-original')f.messages[1].parts.push({type:'tool',tool:'bash',state:{status:'completed'}});
  if(variant==='foreign-rejection')f.rejectPart.state.output=JSON.stringify({...f.approval,requestId:'foreign',status:'REJECTED'});
  if(variant==='truncated-poll')f.rejectPart.state.metadata.truncated=true;
  if(variant==='wrong-approval')f.rejectPart.state.input.approval_id='other';
  if(variant==='same-parent-later')f.messages.at(-1).info.parentID='msg_user1';
  if(variant==='unterminated')f.messages[2].info.finish='tool-calls';
  if(variant==='missing-poll')f.rejectPart.state.output=JSON.stringify({...f.approval,status:'PENDING'});
  if(variant==='early-decision')f.operation.decision.recordedAt=new Date(1200).toISOString();
  if(variant==='poll-before-next-user')f.messages[4].info.time.created=1601;
  if(variant==='duplicate-user')f.messages.at(-2).info.id='msg_user1';
  if(variant==='truncated-request')f.requestPart.state.metadata.truncated=true;
  assert.equal(f.proof(),null);
 });
for(const variant of ['approved','native','once','unknown-decision-time','late-decision','no-rejected-observation','foreign-rejected-observation','effect-before-rejected','effect-after-pending-stop','foreign-parent','incomplete','late-same-parent','system-tool','no-next-user','foreign-sid','no-parent'])test('tour rejeté conserve les gardes : '+variant,()=>{
 const f=fixture();
 switch(variant){
 case'approved':f.operation.decision.status='approved';break;case'native':f.operation.native={onceAcknowledged:true};break;case'once':f.operation.onceAcknowledged=true;break;
 case'unknown-decision-time':delete f.operation.decision.recordedAt;break;case'late-decision':f.operation.decision.recordedAt=new Date(5000).toISOString();break;
 case'no-rejected-observation':f.rejectPart.state.output=JSON.stringify({...f.approval,status:'PENDING'});break;
 case'foreign-rejected-observation':f.rejectPart.state.output=JSON.stringify({...f.approval,requestId:'foreign',status:'REJECTED'});break;
 case'effect-before-rejected':f.messages[1].parts.push({type:'tool',tool:'bash',state:{status:'completed'}});break;
 case'effect-after-pending-stop':f.messages[4].parts.push({type:'tool',tool:'edit',state:{status:'completed'}});break;
 case'foreign-parent':f.messages[4].info.parentID='foreign';break;case'incomplete':delete f.messages[4].info.time.completed;break;
 case'late-same-parent':f.messages.at(-1).info.parentID='msg_user2';break;case'system-tool':f.messages[6].parts.push({type:'tool',tool:'bash'});break;
 case'no-next-user':f.messages.splice(7);break;case'foreign-sid':f.messages[1].info.sessionID='ses_other';break;case'no-parent':f.messages.splice(0,1);break;
 }assert.equal(f.proof(),null);
});
