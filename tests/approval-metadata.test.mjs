import test from 'node:test';
import assert from 'node:assert/strict';
import { projectApprovalMetadata,readApprovalMetadata } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-approval-metadata.mjs';

const health={server:{version:'1.7.1',pid:123},instance:{instance_id:'inst-original'},pending_watchdog:{approvals:{
  'apr-example':{state:'STALLED_NOTIFICATION',notification_status:'FAILED',age_seconds:120,
    title:'SENSITIVE_TITLE',summary:'SENSITIVE_SUMMARY',commands:['SENSITIVE_COMMAND'],files:['SENSITIVE_FILE'],store:'SENSITIVE_STORE'} }}};

test('métadonnées : champs publics seuls, aucune attribution inventée',()=>{
  const result=projectApprovalMetadata(health,'apr-example');
  assert.equal(result.status,'OBSERVED');assert.equal(result.metadata.run_id,null);assert.equal(result.attribution_complete,false);
  assert.equal(result.source.observation_is_current,false);assert.ok(!JSON.stringify(result).includes('SENSITIVE_'));
  assert.equal(projectApprovalMetadata(health,'another-id').status,'NOT_IN_OBSERVATION');
});

test('métadonnées : lecture de la seule observation native préexistante par GET',async()=>{
  const calls=[];
  const request=async(base,path,body)=>{
    calls.push({base,path,body});assert.equal(body,undefined);
    if(!path.includes('/message'))return{id:'ses_technical',directory:'/project'};
    return[{parts:[{id:'part-health',type:'tool',tool:'cgpt-validation_broker_health',
      state:{status:'completed',output:JSON.stringify(health),time:{end:1000}}}]}];
  };
  const result=await readApprovalMetadata({opencodeUrl:'http://127.0.0.1:4096',directory:'/project',sessionId:'ses_technical',approvalId:'apr-example'},request);
  assert.equal(calls.length,2);assert.equal(result.source.part_id,'part-health');assert.equal(result.metadata.approval_id,'apr-example');
});

test('métadonnées : aucune exécution pour observation absente ou contexte divergent',async()=>{
  const input={opencodeUrl:'http://127.0.0.1:4096',directory:'/project',sessionId:'ses_technical',approvalId:'apr-example'};
  await assert.rejects(readApprovalMetadata(input,async()=>({id:'ses_other',directory:'/other'})),/metadata-session-divergent/);
  await assert.rejects(readApprovalMetadata({...input,opencodeUrl:'https://remote.example'},async()=>assert.fail()),/metadata-context-invalid/);
  await assert.rejects(readApprovalMetadata(input,async(base,path)=>path.includes('/message')?[]:{id:'ses_technical',directory:'/project'}),/metadata-observation-unavailable/);
});
