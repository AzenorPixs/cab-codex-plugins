import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeEvidenceView,rejectedShellWithdrawalProof} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-recovery-evidence.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
function fixture(){
 const approval={directory:'/workspace',session_id:'ses_a',files:[],commands:['/usr/bin/true; /usr/bin/true']};
 const part={type:'tool',tool:'bash',nativeTool:'shell',nativeFormat:'opencode-v2',nativeErrorType:'aborted',callID:'call_shell',executed:false,state:{status:'error',input:{command:approval.commands[0],workdir:'/workspace'},time:{start:1000,end:3000}}};
 const receipt={state:'ACKNOWLEDGED',httpStatus:204,replyOrigin:'CAB_CLIENT_PROGRAMMATIC',decision:'reject',sessionId:'ses_a',directory:'/workspace',nativePid:42,nativeVersion:'2.2.5',callId:part.callID,permissionId:'per_shell',targetDigest:hash(JSON.stringify(['bash',approval.commands[0]])),createdAt:new Date(2000).toISOString(),acknowledgedAt:new Date(2500).toISOString()};
 const view=nativeEvidenceView({run:{runId:'r',contextId:1,version:1},operation:{operationId:'op',sessionId:'ses_a'},approval,parts:[part],native:{pid:42,version:'2.2.5'},activeSessions:{},permissions:[],journal:null,replies:{receipts:[receipt],truncated:false}});
 return {approval,part,receipt,view};
}
test('shell refusé multipart : seule coordination retirée, preuve ACK exacte',()=>{const f=fixture(),p=rejectedShellWithdrawalProof(f.view,[f.part],f.approval);assert.equal(p.kind,'REJECTED_UNISSUED_SHELL');assert.equal(p.executionOutcome,'COORDINATION_WITHDRAWN_BEFORE_ISSUANCE');assert.ok(!('nativeResult'in p)&&!('once'in p));});
for(const variant of ['no-ack','intent','once','foreign-session','foreign-directory','foreign-pid','foreign-version','foreign-call','foreign-permission','wrong-target','different-command','changed-input','late-intent','wrong-error','executed','busy','pending','truncated','extra-effect'])test('shell refusé : garde '+variant,()=>{
 const f=fixture();let parts=[f.part];
 switch(variant){
 case'no-ack':f.view.replyReceipts=[];break;case'intent':f.receipt.state='INTENT';break;case'once':f.receipt.decision='once';break;
 case'foreign-session':f.receipt.sessionId='ses_other';break;case'foreign-directory':f.receipt.directory='/other';break;
 case'foreign-pid':f.receipt.nativePid=43;break;case'foreign-version':f.receipt.nativeVersion='2.2.4';break;
 case'foreign-call':f.receipt.callId='other';break;case'foreign-permission':f.receipt.permissionId='';break;
 case'wrong-target':f.receipt.targetDigest=hash('other');break;case'different-command':f.approval.commands=['other'];break;
 case'changed-input':f.part.state.input.workdir='/other';break;case'late-intent':f.receipt.createdAt=new Date(4000).toISOString();break;
 case'wrong-error':f.part.nativeErrorType='ToolError';break;case'executed':f.part.executed=true;break;
 case'busy':f.view.sessionIdle=false;break;case'pending':f.view.pendingPermissionCount=1;break;
 case'truncated':f.view.replyReceiptsTruncated=true;break;case'extra-effect':parts.push({...f.part,callID:'other'});break;
 }assert.throws(()=>rejectedShellWithdrawalProof(f.view,parts,f.approval));
});
