import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareValidationData} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-validation-preparation.mjs';
import {nativeToolInputDigest} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs';
test('Préparation pure : révisions exactes et empreinte native, aucune autorisation implicite',()=>{
 const run={runId:'run',state:'RESERVED',version:9,sessionId:'ses_test',changeId:'change',directory:'/fixture'};
 const resources=[{key:'file:src/example.py',mode:'write'}],revisions={'file:src/example.py':17};
 const input={run_id:'run',reservation_version:9,session_id:'ses_test',change_id:'change',directory:'/fixture',request_id:'fresh-request',
  title:'Écrire le fichier proposé',summary:'Lot exact examiné',native_tool:'write',native_input:{path:'src/example.py',content:'épreuve\n'}};
 const result=prepareValidationData(run,input,resources,revisions);
 assert.equal(result.authorization,false);assert.equal(result.admitted,false);
 assert.equal(result.validation.tool_input_sha256,nativeToolInputDigest(input.native_input));
 assert.deepEqual(result.validation.expected_revisions,revisions);
 assert.deepEqual(result.validation.files,['src/example.py']);
 const {operation_digest,...payload}=result.validation;
 assert.equal(operation_digest,nativeToolInputDigest({protocol:'cab-unit-digest-v1',...payload}));
 assert.equal(prepareValidationData(run,input,resources,revisions).validation.operation_digest,operation_digest);
 assert.throws(()=>prepareValidationData(run,{...input,reservation_version:8},resources,revisions),/run-divergent/);
});
