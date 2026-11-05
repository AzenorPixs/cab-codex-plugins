import test from 'node:test';
import assert from 'node:assert/strict';
import {notAdmittedWithdrawalProof} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-recovery-evidence.mjs';
function fixture(){
 const approval={requestId:'request_a',approval_id:'approval_a'},value={...approval,status:'NOT_ADMITTED',not_admitted_at:new Date(1000).toISOString()};
 const part={type:'tool',tool:'cgpt-validation_get_approval',callID:'call_get',state:{status:'completed',input:{approval_id:'approval_a'},output:JSON.stringify(value),metadata:{truncated:false},time:{end:2000}}};
 const view={sessionIdle:true,pendingPermissionCount:0,callsTruncated:false,calls:[]};
 return{approval,value,part,view,same:v=>v.requestId==='request_a'&&v.approval_id==='approval_a'};
}
test('NOT_ADMITTED frais : seule coordination retirée, pas de décision fabriquée',()=>{const f=fixture(),p=notAdmittedWithdrawalProof(f.view,[f.part],f.approval,f.same,2001);assert.equal(p.kind,'NOT_ADMITTED_UNISSUED');assert.equal(p.executionOutcome,'COORDINATION_WITHDRAWN_BEFORE_ISSUANCE');assert.equal(p.decision,undefined);assert.equal(p.nativeResult,undefined);});
for(const v of ['pending','approved','foreign','truncated','expired','future','bad-terminal-time','permission','busy','effect','no-get','missing-output'])test('NOT_ADMITTED : preuve refusée '+v,()=>{
 const f=fixture();let now=2001;
 if(v==='pending')f.value.status='PENDING';if(v==='approved')f.value.status='APPROVED';if(v==='foreign')f.value.requestId='other';
 if(v==='truncated')f.part.state.metadata.truncated=true;if(v==='expired')now=302001;if(v==='future')now=1999;
 if(v==='bad-terminal-time')f.value.not_admitted_at=new Date(3000).toISOString();
 if(v==='permission')f.view.pendingPermissionCount=1;if(v==='busy')f.view.sessionIdle=false;if(v==='effect')f.view.calls=[{callId:'effect'}];
 if(v==='no-get')f.part.tool='cgpt-validation_poll_approval';
 f.part.state.output=v==='missing-output'?'invalid':JSON.stringify(f.value);
 assert.throws(()=>notAdmittedWithdrawalProof(f.view,[f.part],f.approval,f.same,now));
});
