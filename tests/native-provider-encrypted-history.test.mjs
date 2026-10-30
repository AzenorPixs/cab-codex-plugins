import assert from 'node:assert/strict';
import test from 'node:test';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createOpenCodeV2Client} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs';
const binary=process.env.CAB_TEST_OPENCODE;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function port(){const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p}
async function until(check){for(let n=0;n<250;n++){if(await check())return;await delay(100)}throw Error('synthetic Responses timeout')}

test('OpenCode exact : Responses chiffré inter-comptes, sonde fraîche distincte et limite sans altération', {skip:!binary,timeout:60000},async t=>{
 const root=mkdtempSync(join(tmpdir(),'cab-native-encrypted-')),workspace=join(root,'workspace');mkdirSync(workspace);
 const passwordFile=join(root,'password');writeFileSync(passwordFile,'synthetic-responses-basic',{mode:0o600});
 const keyA='synthetic-account-A',keyB='synthetic-account-B',cipherA='SYNTHETIC_CIPHER_ACCOUNT_A',cipherB='SYNTHETIC_CIPHER_ACCOUNT_B';
 const requests=[];let index=0,nativeLog='';
 const provider=createServer(async(req,res)=>{
  let raw='';for await(const b of req)raw+=b;const input=JSON.parse(raw);const account=req.headers.authorization===`Bearer ${keyA}`?'A':req.headers.authorization===`Bearer ${keyB}`?'B':'unknown';
  const oldCipher=raw.includes(cipherA);requests.push({account,model:input.model,oldCipher,hasCheckpoint:raw.includes('CHECKPOINT_KNOWN_WRITE')});
  if(account==='B'&&oldCipher){res.writeHead(400,{'content-type':'application/json'}).end(JSON.stringify({error:{message:'reasoning encrypted_content was not issued to this caller',type:'invalid_request_error',code:'invalid_request_error'}}));return}
  const n=++index,reason={id:'rs_'+n,type:'reasoning',summary:[{type:'summary_text',text:'synthetic reasoning'}],encrypted_content:account==='A'?cipherA:cipherB};
  const message={id:'msg_out_'+n,type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:'CHECKPOINT_KNOWN_WRITE synthetic answer',annotations:[]}]};
  const response={id:'resp_'+n,object:'response',created_at:Math.floor(Date.now()/1000),model:input.model,status:'completed',output:[reason,message],error:null,incomplete_details:null,
   usage:{input_tokens:10,output_tokens:5,total_tokens:15,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:2}}};
  res.writeHead(200,{'content-type':'text/event-stream'});let sequence=0;
  const send=(type,data)=>res.write('event: '+type+'\ndata: '+JSON.stringify({type,sequence_number:++sequence,...data})+'\n\n');
  send('response.created',{response:{...response,status:'in_progress',output:[]}});
  send('response.output_item.added',{output_index:0,item:{id:reason.id,type:'reasoning',summary:[]}});
  send('response.reasoning_summary_part.added',{item_id:reason.id,output_index:0,summary_index:0,part:{type:'summary_text',text:''}});
  send('response.reasoning_summary_text.delta',{item_id:reason.id,output_index:0,summary_index:0,delta:'synthetic reasoning'});
  send('response.reasoning_summary_text.done',{item_id:reason.id,output_index:0,summary_index:0,text:'synthetic reasoning'});
  send('response.output_item.done',{output_index:0,item:reason});
  send('response.output_item.added',{output_index:1,item:{...message,status:'in_progress',content:[]}});
  send('response.content_part.added',{item_id:message.id,output_index:1,content_index:0,part:{type:'output_text',text:'',annotations:[]}});
  send('response.output_text.delta',{item_id:message.id,output_index:1,content_index:0,delta:message.content[0].text});
  send('response.output_text.done',{item_id:message.id,output_index:1,content_index:0,text:message.content[0].text});
  send('response.content_part.done',{item_id:message.id,output_index:1,content_index:0,part:message.content[0]});
  send('response.output_item.done',{output_index:1,item:message});send('response.completed',{response});res.end();
 });await new Promise(r=>provider.listen(0,'127.0.0.1',r));
 const listenPort=await port();const model={name:'fixture',limit:{context:32000,output:4096},capabilities:{tools:true,input:['text'],output:['text']},variants:[{id:'medium'}]};
 const config={autoupdate:false,share:'disabled',providers:{fixture:{package:'aisdk:@ai-sdk/openai',settings:{baseURL:`http://127.0.0.1:${provider.address().port}/v1`},body:{store:false,include:['reasoning.encrypted_content']},models:{first:structuredClone(model),second:structuredClone(model)}}}};
 const child=spawn(binary,['serve','--hostname','127.0.0.1','--port',String(listenPort)],{cwd:workspace,stdio:['ignore','ignore','pipe'],env:{PATH:process.env.PATH,HOME:root,XDG_CONFIG_HOME:join(root,'config'),XDG_DATA_HOME:join(root,'data'),XDG_CACHE_HOME:join(root,'cache'),XDG_STATE_HOME:join(root,'state'),OPENCODE_PASSWORD:'synthetic-responses-basic',OPENCODE_CONFIG_CONTENT:JSON.stringify(config),OPENCODE_DISABLE_PROJECT_CONFIG:'1',OPENCODE_DISABLE_DEFAULT_PLUGINS:'1',OPENCODE_DISABLE_CLAUDE_CODE:'1',OPENCODE_DISABLE_MODELS_FETCH:'1',OPENCODE_DISABLE_AUTOUPDATE:'1',OPENCODE_DISABLE_LSP_DOWNLOAD:'1'}});
 child.stderr.on('data',b=>nativeLog+=b);t.after(async()=>{if(child.exitCode===null&&child.signalCode===null){const done=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await done}await new Promise(r=>provider.close(r));rmSync(root,{recursive:true,force:true})});
 const client=createOpenCodeV2Client({baseUrl:`http://127.0.0.1:${listenPort}`,directory:workspace,passwordFile});
 await until(async()=>{if(child.exitCode!==null)throw Error('private Responses startup failed');try{return Boolean(await client.info())}catch{return false}});
 const info=await client.info(true);const connect=(key,transactionId)=>client.connectProviderKey('fixture',{transactionId,expectedPid:info.pid,assertBoundary:async()=>{},secretSource:async()=>Buffer.from(key)});
 await connect(keyA,'encrypted-account-A');
 const historical=await client.createSession({model:{providerID:'fixture',modelID:'first',reasoning:'medium'},permissions:[{permission:'*',pattern:'*',action:'deny'}]});
 async function turn(sid,text){await client.prompt(sid,text);await until(async()=>!(await client.activeSessions())[sid]);return (await client.messages(sid)).findLast(m=>m.info.role==='assistant')}
 const first=await turn(historical.id,'Remember CHECKPOINT_KNOWN_WRITE; no tools.');assert.equal(first.info.error,undefined);
 const saved=await client.request(`/api/session/${historical.id}/message/${first.info.id}`);assert.ok(JSON.stringify(saved).includes(cipherA),'synthetic cipher must actually be persisted natively');
 const beforeIds=(await client.messages(historical.id)).map(m=>m.info.id);
 assert.equal((await turn(historical.id,'Continue under A, no tool.')).info.error,undefined);assert.ok(requests.at(-1).oldCipher);
 await connect(keyB,'encrypted-account-B');
 const fresh=await client.createSession({model:{providerID:'fixture',modelID:'first',reasoning:'medium'},permissions:[{permission:'*',pattern:'*',action:'deny'}]});
 assert.equal((await turn(fresh.id,'Fresh B, no tool.')).info.error,undefined);assert.equal(requests.at(-1).oldCipher,false);
 const broken=await turn(historical.id,'Continue existing history under B, no tool.');assert.ok(broken.info.error);assert.equal(requests.at(-1).oldCipher,true);
 const calls=requests.length;await client.prompt(historical.id,'Queue without executing.',{resume:false});await delay(150);assert.equal(requests.length,calls);assert.equal((await client.activeSessions())[historical.id],undefined);
 assert.ok((await turn(historical.id,'Resume after queued input, no tool.')).info.error);assert.equal(requests.at(-1).oldCipher,true);
 await client.switchModel(historical.id,{providerID:'fixture',modelID:'second',reasoning:'medium'});
 assert.equal((await turn(historical.id,'Explicit different model, keep known checkpoint, no tool.')).info.error,undefined);
 assert.equal(requests.at(-1).oldCipher,false);assert.equal(requests.at(-1).hasCheckpoint,true);
 assert.ok(JSON.stringify(await client.request(`/api/session/${historical.id}/message/${first.info.id}`)).includes(cipherA));
 await client.switchModel(historical.id,{providerID:'fixture',modelID:'first',reasoning:'medium'});
 assert.ok((await turn(historical.id,'Return to original model, no tool.')).info.error);assert.equal(requests.at(-1).oldCipher,true);
 const ids=new Set((await client.messages(historical.id)).map(m=>m.info.id));assert.ok(beforeIds.every(id=>ids.has(id)));
 assert.equal((await client.info(true)).pid,info.pid);assert.equal((await client.session(historical.id)).id,historical.id);
 assert.equal((await client.messages(historical.id)).flatMap(m=>m.parts.filter(p=>p.type==='tool')).length,0);
 assert.ok(!nativeLog.includes(keyA)&&!nativeLog.includes(keyB));
 console.log(JSON.stringify({nativeVersion:info.version,syntheticResponsesCipherPersisted:true,freshTargetWorks:true,historicalSameModelFails:true,resumeFalseQueuesOnly:true,
  explicitDifferentModelWorks:true,plaintextCheckpointPreserved:true,returnToOriginalFails:true,sameSid:true,samePid:true,historyRecordsPreserved:true,tools:0,realHistoryRead:false}));
});
