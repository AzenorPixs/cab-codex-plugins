import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createOpenCodeV2Client} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs';
function setup(t,{lost=false,foreign=false,badSource=false,changedPid=false,prefix=false}={}){
 const root=mkdtempSync(join(tmpdir(),'cab-multipart-')),passwordFile=join(root,'password'),receipts=join(root,'receipts');t.after(()=>rmSync(root,{recursive:true,force:true}));writeFileSync(passwordFile,'synthetic',{mode:0o600});
 const resources=['node --check frontend/tests/browser-check.mjs','npm --prefix frontend run test:node','npm --prefix frontend run build'];
 const command=(prefix?'/usr/bin/env EXAMPLE=synthetic ':'')+resources.join(' && ');let sourceReads=0;const posts=[];
 const options={directory:'/workspace',baseUrl:'http://127.0.0.1:4096',passwordFile,permissionReceiptDirectory:receipts,fetchImpl:async(u,opt={})=>{
  const p=new URL(u).pathname;
  if(p==='/api/info')return Response.json({version:'2.2.5',pid:changedPid&&sourceReads>=2?43:42,hostname:'fixture',urls:[],paths:{}});
  if(p==='/api/permission/request')return Response.json({location:{directory:'/workspace'},data:[{id:'per_split',sessionID:foreign?'ses_other':'ses_split',action:'shell',resources,source:{type:'tool',id:'call_split',messageID:'msg_split'}}]});
  if(p==='/api/session/ses_split')return Response.json({data:{id:'ses_split',directory:'/workspace',permissions:[]}});
  if(p==='/api/session/ses_split/message/msg_split'){sourceReads++;return Response.json({data:{id:'msg_split',type:'assistant',time:{created:1},content:[{type:'tool',id:badSource?'call_other':'call_split',name:'shell',executed:false,state:{status:'running',input:{command,workdir:'/workspace'},content:[],metadata:{}}}]}});}
  if(p.endsWith('/reply')){posts.push(JSON.parse(opt.body));if(lost)throw Error('synthetic response lost');return new Response(null,{status:204});}
  throw Error('Unexpected fixture route '+p);
 }};const client=createOpenCodeV2Client(options);return {client,reloadClient:()=>createOpenCodeV2Client(options),posts,receipts,command};
}
for(const prefix of [false,true])test('shell multipart reject : cible '+(prefix?'divergente':'alignée')+', ACK privé idempotent sans once',async t=>{
 const h=setup(t,{prefix});await assert.rejects(h.client.permissions('/workspace',{sessionIds:['ses_split']}),{code:'opencode-permission-target-invalid'});
 await h.client.replyPermission('ses_split','per_split','reject');await h.reloadClient().replyPermission('ses_split','per_split','reject');
 assert.deepEqual(h.posts,[{decision:'reject'}]);const receipt=h.client.permissionReplies('ses_split').receipts[0];assert.equal(receipt.state,'ACKNOWLEDGED');assert.equal(receipt.callId,'call_split');
 for(const name of readdirSync(h.receipts)){assert.equal(statSync(join(h.receipts,name)).mode&0o777,0o600);assert.ok(!readFileSync(join(h.receipts,name),'utf8').includes(h.command));}
});
for(const [name,opts] of [['session étrangère',{foreign:true}],['source non corrélée',{badSource:true}],['PID changé',{changedPid:true}]])test('shell multipart reject : '+name+' sans POST',async t=>{
 const h=setup(t,opts);await assert.rejects(h.client.replyPermission('ses_split','per_split','reject'));assert.equal(h.posts.length,0);assert.equal(h.client.permissionReplies('ses_split').receipts.length,0);
});
test('shell multipart reject : réponse perdue reste INTENT sans rejeu après relecture',async t=>{
 const h=setup(t,{lost:true});await assert.rejects(h.client.replyPermission('ses_split','per_split','reject'));await assert.rejects(h.reloadClient().replyPermission('ses_split','per_split','reject'),{code:'opencode-permission-outcome-unverified'});assert.deepEqual(h.posts,[{decision:'reject'}]);assert.equal(h.client.permissionReplies('ses_split').receipts[0].state,'INTENT');
});
