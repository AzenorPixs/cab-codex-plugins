import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureEnvironment } from './helpers/cab-environment.mjs';
import { createOpenCodeV2Client } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs';
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
  const client=createOpenCodeV2Client({baseUrl:'http://127.0.0.1:4096',directory:'/project',
    passwordFile:fixtureEnvironment.OC_Codex_OPENCODE_PASSWORD_FILE,fetchImpl:async(input)=>{
      const url=new URL(input);calls.push(url.pathname);
      if(url.pathname==='/api/info')return Response.json({version:'2.2.0',pid:42,hostname:'127.0.0.1',urls:[],paths:{tmp:'/tmp'}});
      if(url.pathname==='/api/session/ses_technical')return Response.json({data:{id:'ses_technical',directory:'/project',permissions:[]}});
      if(url.pathname==='/api/session/ses_technical/message')return Response.json({data:[{id:'msg_technical',type:'assistant',time:{created:1},content:[
        {type:'tool',id:'part-health',name:'cgpt-validation_broker_health',executed:true,time:{created:1,ran:2,completed:1000},
          state:{status:'completed',input:{},content:[{type:'text',text:JSON.stringify(health)}],metadata:{}}},
      ]}],cursor:{next:null,previous:null}});
      return Response.json({}, {status:404});
    }});
  const result=await readApprovalMetadata({opencodeUrl:'http://127.0.0.1:4096',directory:'/project',sessionId:'ses_technical',approvalId:'apr-example',openCodeClient:client});
  assert.deepEqual(calls,['/api/info','/api/session/ses_technical','/api/session/ses_technical/message']);
  assert.equal(result.source.part_id,'part-health');assert.equal(result.metadata.approval_id,'apr-example');
});

test('métadonnées : aucune exécution pour observation absente ou contexte divergent',async()=>{
  const input={opencodeUrl:'http://127.0.0.1:4096',directory:'/project',sessionId:'ses_technical',approvalId:'apr-example'};
  const client=(session,messages=[])=>createOpenCodeV2Client({baseUrl:input.opencodeUrl,directory:input.directory,
    passwordFile:fixtureEnvironment.OC_Codex_OPENCODE_PASSWORD_FILE,fetchImpl:async(url)=>{
      const path=new URL(url).pathname;
      if(path==='/api/info')return Response.json({version:'2.2.0',pid:42,hostname:'127.0.0.1',urls:[],paths:{tmp:'/tmp'}});
      if(path.startsWith('/api/session/')&&path.endsWith('/message'))return Response.json({data:messages,cursor:{next:null,previous:null}});
      if(path.startsWith('/api/session/'))return Response.json({data:session});
      return Response.json({}, {status:404});
    }});
  await assert.rejects(readApprovalMetadata({...input,openCodeClient:{session:async()=>({id:'ses_other',directory:'/other'}),messages:async()=>[]}}),/metadata-session-divergent/);
  await assert.rejects(readApprovalMetadata({...input,opencodeUrl:'https://remote.example',openCodeClient:async()=>assert.fail()}),/metadata-context-invalid/);
  await assert.rejects(readApprovalMetadata({...input,openCodeClient:client({id:'ses_technical',directory:'/project',permissions:[]},[])}),/metadata-observation-unavailable/);
});
