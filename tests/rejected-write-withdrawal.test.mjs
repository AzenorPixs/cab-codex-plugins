import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {ResourceRunRegistry} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs';
import {canonicalContinuityDigest} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-continuity.mjs';
import {nativeEvidenceView,rejectedEditWithdrawalProof} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-recovery-evidence.mjs';
import {nativeToolInputDigest} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
function fixture(){
 const input={path:'/workspace/archive/STATISTICS.md',content:'PRIVATE_WRITE_CONTENT'},approval={directory:'/workspace',session_id:'ses_write',files:['archive/STATISTICS.md'],commands:[],tool_input_sha256:nativeToolInputDigest({...input,content:'APPROVED_CONTENT'})};
 const part={type:'tool',tool:'write',nativeTool:'write',nativeFormat:'opencode-v2',nativeErrorType:'aborted',executed:false,callID:'call_write',state:{status:'error',input,time:{start:1000,end:3000}}};
 const receipt={state:'ACKNOWLEDGED',httpStatus:204,replyOrigin:'CAB_CLIENT_PROGRAMMATIC',decision:'reject',sessionId:'ses_write',directory:'/workspace',nativePid:42,nativeVersion:'2.2.5',callId:'call_write',permissionId:'per_write',targetDigest:hash(JSON.stringify(['edit',input.path])),createdAt:new Date(2000).toISOString(),acknowledgedAt:new Date(2500).toISOString()};
 const view=nativeEvidenceView({run:{runId:'r',ownerId:'owner',contextId:1,version:1},operation:{operationId:'op',operationDigest:hash('op'),sessionId:'ses_write'},approval,parts:[part],native:{pid:42,version:'2.2.5'},activeSessions:{},permissions:[],journal:null,replies:{receipts:[receipt],truncated:false}});
 return {part,approval,receipt,view};
}
test('write rejeté : projection call/ACK visible sans journal et contenu filtré, digests distincts conservés',()=>{
 const f=fixture();assert.equal(f.view.calls.length,1);assert.equal(f.view.calls[0].nativeTool,'write');assert.equal(f.view.replyReceipts.length,1);assert.equal(f.view.journal.coverage,'MISSING_RELEVANT_CALLS');assert.equal(JSON.stringify(f.view).includes('PRIVATE_WRITE_CONTENT'),false);
 const proof=rejectedEditWithdrawalProof(f.view,[f.part],f.approval);assert.equal(proof.kind,'REJECTED_UNISSUED_EDIT');assert.equal(proof.rejectedEdit.nativeTool,'write');assert.equal(proof.rejectedEdit.nativeInputSha256,nativeToolInputDigest(f.part.state.input));assert.notEqual(proof.rejectedEdit.nativeInputSha256,proof.rejectedEdit.approvedInputSha256);assert.equal(proof.executionOutcome,'COORDINATION_WITHDRAWN_BEFORE_ISSUANCE');assert.equal(proof.nativeResult,undefined);
});
for(const variant of ['no-receipt','intent','http200','foreign-call','foreign-permission','foreign-session','foreign-pid','foreign-version','target','content-change','input-extra','input-alias','missing-content','tool-spoof','executed','bad-error','busy','pending','extra-call','second-file','command','receipt-truncated','wrong-permission-category','late-intent'])test('write rejeté : refus '+variant,()=>{
 const f=fixture();let parts=[f.part];
 if(variant==='no-receipt')f.view.replyReceipts=[];if(variant==='intent')f.receipt.state='INTENT';if(variant==='http200')f.receipt.httpStatus=200;
 if(variant==='foreign-call')f.receipt.callId='other';if(variant==='foreign-permission')f.receipt.permissionId='';if(variant==='foreign-session')f.receipt.sessionId='ses_other';if(variant==='foreign-pid')f.receipt.nativePid=43;if(variant==='foreign-version')f.receipt.nativeVersion='2.2.6';
 if(variant==='target')f.part.state.input.path='/workspace/other.md';if(variant==='content-change')f.part.state.input.content+='altered';if(variant==='input-extra')f.part.state.input.replaceAll=true;if(variant==='input-alias'){f.part.state.input.filePath=f.part.state.input.path;delete f.part.state.input.path;}if(variant==='missing-content')delete f.part.state.input.content;if(variant==='tool-spoof')f.part.nativeTool='edit';if(variant==='executed')f.part.executed=true;if(variant==='bad-error')f.part.nativeErrorType='ToolError';if(variant==='busy')f.view.sessionIdle=false;if(variant==='pending')f.view.pendingPermissionCount=1;if(variant==='extra-call')parts.push({...f.part,callID:'extra'});if(variant==='second-file')f.approval.files.push('other.md');if(variant==='command')f.approval.commands=['/usr/bin/true'];if(variant==='receipt-truncated')f.view.replyReceiptsTruncated=true;if(variant==='wrong-permission-category')f.receipt.targetDigest=hash(JSON.stringify(['write',f.part.state.input.path]));if(variant==='late-intent')f.receipt.createdAt=new Date(4000).toISOString();
 assert.throws(()=>rejectedEditWithdrawalProof(f.view,parts,f.approval));
});
test('write rejeté : contenu vide est lié exactement pour le seul retrait',()=>{
 const f=fixture();f.part.state.input.content='';
 f.view=nativeEvidenceView({run:{runId:'r',ownerId:'owner',contextId:1,version:1},operation:{operationId:'op',operationDigest:hash('op'),sessionId:'ses_write'},approval:f.approval,parts:[f.part],native:{pid:42,version:'2.2.5'},activeSessions:{},permissions:[],journal:null,replies:{receipts:[f.receipt],truncated:false}});
 const p=rejectedEditWithdrawalProof(f.view,[f.part],f.approval);assert.equal(p.rejectedEdit.nativeInputSha256,nativeToolInputDigest(f.part.state.input));
});

for(const variant of ['quarantine','restored','second-member','second-resource'])test('write refusé et frontière dédiée : '+variant,async t=>{
 const root=mkdtempSync(join(tmpdir(),'cab-write-guard-')),registry=new ResourceRunRegistry(root,join(root,'state'));await registry.acquireAuthority();t.after(async()=>{await registry.close();rmSync(root,{recursive:true,force:true});});
 const resources=[{key:'file:archive',mode:'write'},...(variant==='second-resource'?[{key:'file:other',mode:'write'}]:[])];
 const run=registry.reserve({runId:'r',ownerId:'owner',sessionId:'ses_write',directory:root,changeId:'change-write',selectionKey:'change-write',resources,dependsOn:[]});
 const f=fixture();f.approval={...f.approval,directory:root,coordination_protocol:'resource-scoped-v1',run_id:run.runId,reservation_version:run.version,requestId:'request-write',approval_id:'approval-write',operation_id:'operation-write',operation_digest:hash('operation-write'),resources,expected_revisions:Object.fromEntries(resources.map(r=>[r.key,0]))};
 f.part.state.input.path=join(root,'archive/STATISTICS.md');f.receipt.directory=root;f.receipt.targetDigest=hash(JSON.stringify(['edit',f.part.state.input.path]));
 f.view=nativeEvidenceView({run,operation:{operationId:'operation-write',operationDigest:hash('operation-write'),sessionId:'ses_write'},approval:f.approval,parts:[f.part],native:{pid:42,version:'2.2.5'},activeSessions:{},permissions:[],journal:null,replies:{receipts:[f.receipt],truncated:false}});
 const proof=rejectedEditWithdrawalProof(f.view,[f.part],f.approval),op=registry.prepareOperation(run.runId,f.approval);
 registry.claimRequest(run.runId,op.requestId,hash('owner-write'),false);
 registry.recordDecision(run.runId,op.operationId,{status:'approved',requestId:op.requestId,approvalId:'approval-write',changeId:run.changeId,operationId:op.operationId,operationDigest:op.operationDigest,identityDigest:op.identityDigest,runId:run.runId,version:run.version,sessionId:run.sessionId});
 const access=registry.acquireAccess(run.runId,{operationId:op.operationId,version:run.version,resources,expectedRevisions:op.expectedRevisions,operationDigest:op.operationDigest}),parent=registry.resourceState.accesses[access.accessId];
 if(variant==='quarantine')parent.timeoutQuarantine={operationId:op.operationId};if(variant==='restored')registry.restoredAccesses.add(access.accessId);
 if(variant==='second-member'){const other={...f.approval,requestId:'request-other',approval_id:'approval-other',operation_id:'operation-other',operation_digest:hash('other')};registry.prepareOperation(run.runId,other);parent.operationIds.push('operation-other');}
 const before=structuredClone(registry.resourceState),pd=canonicalContinuityDigest(parent),proofDigest=canonicalContinuityDigest(proof);
 if(variant!=='second-resource'){assert.throws(()=>registry.withdrawRejectedAttachedShell(run.runId,op.operationId,proofDigest,pd,{allowReference:true,allowSingleton:true}),/attached-withdrawal/);assert.deepEqual(registry.resourceState,before);return;}
 assert.equal(registry.withdrawRejectedAttachedShell(run.runId,op.operationId,proofDigest,pd,{allowReference:true,allowSingleton:true}).state,'CANCELLED');assert.deepEqual(registry.resourceState.accesses,before.accesses);assert.deepEqual(registry.resourceState.revisions,before.revisions);assert.equal(parent.resources.length,2);
});
