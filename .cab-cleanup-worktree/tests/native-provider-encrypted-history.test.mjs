import assert from 'node:assert/strict';
import test from 'node:test';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createOpenCodeV2Client} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs';
const binary=process.env.CAB_TEST_OPENCODE;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function port(){const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p}
async function until(check){for(let n=0;n<250;n++){if(await check())return;await delay(100)}throw Error('synthetic Responses timeout')}

test('OpenCode exact : Responses inter-comptes, limite native et projection à chaud sans altération', {skip:!binary,timeout:60000},async t=>{
 const root=mkdtempSync(join(tmpdir(),'cab-native-encrypted-')),workspace=join(root,'workspace');mkdirSync(workspace);
 const passwordFile=join(root,'password');writeFileSync(passwordFile,'synthetic-responses-basic',{mode:0o600});
 const keyA='synthetic-account-A',keyB='synthetic-account-B',cipherA='SYNTHETIC_CIPHER_ACCOUNT_A',cipherB='SYNTHETIC_CIPHER_ACCOUNT_B';
 const requests=[];let index=0,nativeLog='',toolEmitted=false;
 const provider=createServer(async(req,res)=>{
  let raw='';for await(const b of req)raw+=b;const input=JSON.parse(raw);const account=req.headers.authorization===`Bearer ${keyA}`?'A':req.headers.authorization===`Bearer ${keyB}`?'B':'unknown';
  const oldCipher=raw.includes(cipherA);requests.push({account,model:input.model,oldCipher,hasCheckpoint:raw.includes('CHECKPOINT_KNOWN_WRITE'),historicalToolCall:raw.includes('call_history'),historicalToolResult:Array.isArray(input.input)&&input.input.some(item=>item.type==='function_call_output'&&item.call_id==='call_history')});
  if(account==='B'&&oldCipher){res.writeHead(400,{'content-type':'application/json'}).end(JSON.stringify({error:{message:'reasoning encrypted_content was not issued to this caller',type:'invalid_request_error',code:'invalid_request_error'}}));return}
  const n=++index,reason={id:'rs_'+n,type:'reasoning',summary:[{type:'summary_text',text:'synthetic reasoning'}],encrypted_content:account==='A'?cipherA:cipherB};
  const message={id:'msg_out_'+n,type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:'CHECKPOINT_KNOWN_WRITE synthetic answer',annotations:[]}]};
  const withTool=!toolEmitted&&account==='A'&&Array.isArray(input.tools)&&input.tools.some(t=>t.name==='shell');if(withTool)toolEmitted=true;
  const tool=withTool?{id:'fc_history',type:'function_call',call_id:'call_history',name:'shell',arguments:JSON.stringify({command:'/usr/bin/true',description:'Synthetic historical denied tool'}),status:'completed'}:null;
  const response={id:'resp_'+n,object:'response',created_at:Math.floor(Date.now()/1000),model:input.model,status:'completed',output:[reason,message,...(tool?[tool]:[])],error:null,incomplete_details:null,
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
  send('response.output_item.done',{output_index:1,item:message});
  if(tool){send('response.output_item.added',{output_index:2,item:{...tool,arguments:''}});send('response.function_call_arguments.delta',{item_id:tool.id,output_index:2,delta:tool.arguments});send('response.function_call_arguments.done',{item_id:tool.id,output_index:2,arguments:tool.arguments});send('response.output_item.done',{output_index:2,item:tool});}
  send('response.completed',{response});res.end();
 });await new Promise(r=>provider.listen(0,'127.0.0.1',r));
 const listenPort=await port();const model={name:'fixture',limit:{context:32000,output:4096},capabilities:{tools:true,input:['text'],output:['text']},variants:[{id:'medium'}]};
 const config={autoupdate:false,share:'disabled',providers:{fixture:{package:'aisdk:@ai-sdk/openai',settings:{baseURL:`http://127.0.0.1:${provider.address().port}/v1`},body:{store:false,include:['reasoning.encrypted_content']},models:{first:structuredClone(model),second:structuredClone(model)}}}};
 const child=spawn(binary,['serve','--hostname','127.0.0.1','--port',String(listenPort)],{cwd:workspace,stdio:['ignore','ignore','pipe'],env:{PATH:process.env.PATH,HOME:root,XDG_CONFIG_HOME:join(root,'config'),XDG_DATA_HOME:join(root,'data'),XDG_CACHE_HOME:join(root,'cache'),XDG_STATE_HOME:join(root,'state'),OPENCODE_PASSWORD:'synthetic-responses-basic',OPENCODE_CONFIG_CONTENT:JSON.stringify(config),OPENCODE_DISABLE_PROJECT_CONFIG:'1',OPENCODE_DISABLE_DEFAULT_PLUGINS:'1',OPENCODE_DISABLE_CLAUDE_CODE:'1',OPENCODE_DISABLE_MODELS_FETCH:'1',OPENCODE_DISABLE_AUTOUPDATE:'1',OPENCODE_DISABLE_LSP_DOWNLOAD:'1'}});
 child.stderr.on('data',b=>nativeLog+=b);t.after(async()=>{if(child.exitCode===null&&child.signalCode===null){const done=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await done}await new Promise(r=>provider.close(r));rmSync(root,{recursive:true,force:true})});
 const client=createOpenCodeV2Client({baseUrl:`http://127.0.0.1:${listenPort}`,directory:workspace,passwordFile});
 await until(async()=>{if(child.exitCode!==null)throw Error('private Responses startup failed');try{return Boolean(await client.info())}catch{return false}});
 const info=await client.info(true);const connect=(key,transactionId)=>client.connectProviderKey('fixture',{transactionId,expectedPid:info.pid,assertBoundary:async()=>{},secretSource:async()=>Buffer.from(key)});
 await connect(keyA,'encrypted-account-A');
 const historical=await client.createSession({model:{providerID:'fixture',modelID:'first',reasoning:'medium'},permissions:[{permission:'*',pattern:'*',action:'allow'}]});
 async function turn(sid,text){await client.prompt(sid,text);await until(async()=>!(await client.activeSessions())[sid]);return (await client.messages(sid)).findLast(m=>m.info.role==='assistant')}
 const first=await turn(historical.id,'Remember CHECKPOINT_KNOWN_WRITE; no tools.');assert.equal(first.info.error,undefined);
 const saved=await client.request(`/api/session/${historical.id}/message/${first.info.id}`);assert.ok(JSON.stringify(saved).includes(cipherA),'synthetic cipher must actually be persisted natively');
 const beforeIds=(await client.messages(historical.id)).map(m=>m.info.id);
 const historicalTools=(await client.messages(historical.id)).flatMap(m=>m.parts.filter(p=>p.type==='tool'));assert.equal(historicalTools.length,1);assert.equal(historicalTools[0].state.status,'completed');
 await client.request(`/api/session/${historical.id}`,{method:'PATCH',body:{permissions:[{action:'*',resource:'*',effect:'deny'}]}});
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

 const messagesBeforeHook=await client.messages(historical.id);
 const staleIDs=messagesBeforeHook.filter(m=>m.info.role==='assistant').map(m=>m.info.id);
 const activeB=await client.integrationConnection('fixture');assert.equal(activeB.active.type,'credential');
 const rules={schemaVersion:1,expectedPid:info.pid,rules:[{sessionId:historical.id,providerID:'fixture',modelID:'first',connectionId:activeB.active.id,staleMessageIds:staleIDs}]};
 const pluginDir=join(root,'config','opencode','plugins','cab-context-portability');mkdirSync(pluginDir,{recursive:true});
 writeFileSync(join(pluginDir,'package.json'),JSON.stringify({name:'cab-context-portability',type:'module',exports:'./index.js'}));
 const pluginSource=readFileSync(new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-context-portability.mjs',import.meta.url),'utf8');
 writeFileSync(join(pluginDir,'index.js'),pluginSource+'\nexport default createContextPortabilityPlugin('+JSON.stringify(rules)+');\n');
 await until(async()=>{const listing=await client.request('/api/plugin');return listing.data.some(p=>p.id==='cab-context-portability'&&p.status!=='error')});
 const healed=await turn(historical.id,'Continue same model first under account B with CHECKPOINT_KNOWN_WRITE; no tools.');
 assert.equal(healed.info.error,undefined);assert.equal(requests.at(-1).oldCipher,false);assert.equal(requests.at(-1).hasCheckpoint,true);assert.equal(requests.at(-1).historicalToolCall,true);assert.equal(requests.at(-1).historicalToolResult,true);
 assert.deepEqual((await client.messages(historical.id)).flatMap(m=>m.parts.filter(p=>p.type==='tool')),historicalTools);
 assert.equal((await client.session(historical.id)).model.modelID,'first');
 assert.deepEqual(await client.request(`/api/session/${historical.id}/message/${first.info.id}`),saved);
 assert.equal((await turn(historical.id,'Next turn same model and account B, no tools.')).info.error,undefined);
 const peer=await client.createSession({model:{providerID:'fixture',modelID:'first',reasoning:'medium'},permissions:[{permission:'*',pattern:'*',action:'deny'}]});
 await connect(keyA,'peer-under-A');assert.equal((await turn(peer.id,'Peer history A, no tools.')).info.error,undefined);
 await connect(keyB,'peer-under-B');assert.ok((await turn(peer.id,'Peer must stay rejected, no tools.')).info.error);assert.equal(requests.at(-1).oldCipher,true);
 await connect(keyA,'connection-epoch-changed');assert.notEqual((await client.integrationConnection('fixture')).active.id,activeB.active.id);
 const callsBeforeStaleConnection=requests.length;
 await client.prompt(historical.id,'Connection epoch changed: projection must block, no tools.');await delay(200);
 await until(async()=>!(await client.activeSessions())[historical.id]);
 assert.equal(requests.length,callsBeforeStaleConnection,'stale connection blocked before provider call');

 const ids=new Set((await client.messages(historical.id)).map(m=>m.info.id));assert.ok(beforeIds.every(id=>ids.has(id)));
 assert.equal((await client.info(true)).pid,info.pid);assert.equal((await client.session(historical.id)).id,historical.id);
 assert.equal((await client.messages(historical.id)).flatMap(m=>m.parts.filter(p=>p.type==='tool')).length,1);
 assert.ok(!nativeLog.includes(keyA)&&!nativeLog.includes(keyB));
 console.log(JSON.stringify({nativeVersion:info.version,syntheticResponsesCipherPersisted:true,freshTargetWorks:true,historicalSameModelFails:true,resumeFalseQueuesOnly:true,
  explicitDifferentModelWorks:true,plaintextCheckpointPreserved:true,returnToOriginalFails:true,sameSid:true,samePid:true,historyRecordsPreserved:true,completedHistoricalToolPreserved:true,newTools:0,realHistoryRead:false,hotNativeHook:true,sameModelAfterAccountSwitch:true,peerUnchanged:true,connectionEpochGuard:true}));
});
