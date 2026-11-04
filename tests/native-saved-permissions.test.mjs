import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,writeFileSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createOpenCodeV2Client,nativeCodingMandate} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs';

function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'cab-native-grants-')),passwordFile=join(root,'password');writeFileSync(passwordFile,'synthetic\n',{mode:0o600});t.after(()=>rmSync(root,{recursive:true,force:true}));
 const state={pid:42,active:{},pending:[],calls:[],failList:false,failDelete:false,dropDelete:false,
  rules:[{action:'shell',resource:'*',effect:'ask'},{action:'edit',resource:'*',effect:'ask'}],
  saved:[{id:'psv_node',projectID:'project-fixture',action:'shell',resource:'PRIVATE_SAVED_COMMAND *'},
   {id:'psv_read',projectID:'project-fixture',action:'read',resource:'*'},
   {id:'psv_external',projectID:'project-fixture',action:'external_directory',resource:'PRIVATE_EXTERNAL'},
   {id:'psv_foreign',projectID:'another-project',action:'shell',resource:'*'}]};
 const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
 const client=createOpenCodeV2Client({baseUrl:'http://127.0.0.1:4096',directory:'/workspace',passwordFile,permissionRepairDirectory:join(root,'repairs'),fetchImpl:async(url,options)=>{
  const path=new URL(url).pathname;state.calls.push({path,method:options.method});
  if(path==='/api/info')return json({version:'2.2.5',pid:state.pid,urls:[],paths:{}});
  if(path==='/api/session/ses_fixture')return json({data:{id:'ses_fixture',projectID:'project-fixture',directory:'/workspace',permissions:state.rules}});
  if(path==='/api/session/active')return json({data:state.active});
  if(path==='/api/permission/request')return json({location:{directory:'/workspace'},data:state.pending});
  if(path==='/api/permission/saved')return json({data:state.saved},state.failList?503:200);
  if(path.startsWith('/api/permission/saved/')&&options.method==='DELETE'){
   if(state.failDelete)return json({},503);
   const id=decodeURIComponent(path.split('/').at(-1));const i=state.saved.findIndex(row=>row.id===id);
   if(i<0)return json({},404);state.saved.splice(i,1);
   if(state.dropDelete)throw new TypeError('synthetic lost response');
   return new Response(null,{status:204});
  }
  if(path.endsWith('/prompt'))return json({data:{id:'msg_fixture'}});
  return json({},404);
 }});
 const plan=()=>client.nativePermissionRepairPlan('ses_fixture',{planId:'repair-fixture'});
 const authorization=p=>({kind:'shared-project-maintenance',projectID:p.projectID,directory:p.directory,planDigest:p.planDigest,reference:'developer:fixture-shared-project-repair'});
 return{client,state,root,plan,authorization};
}

test('ASK effectif : les grants partagés contredisent la règle nominale sans exposer leur contenu',async t=>{
 const h=fixture(t),p=await h.client.nativePermissionPolicy('ses_fixture',{requiredNativeAsk:['shell','edit']});
 assert.equal(p.nominalReady,true);assert.equal(p.ready,false);assert.deepEqual(p.missing,['shell']);assert.equal(p.savedGrantAudit.protectedCount,1);
 assert.equal(JSON.stringify(p).includes('PRIVATE'),false);assert.equal(p.savedGrantAudit.grants[0].id,'psv_node');
 await assert.rejects(h.client.prompt('ses_fixture',nativeCodingMandate('Un seul effet examiné.')),{code:'opencode-native-permission-ask-required'});
 assert.equal(h.state.calls.some(c=>c.method==='POST'||c.method==='DELETE'),false);
});

test('réparation : plan borné, révocation API seule, read/external/autre projet conservés et reçu rejouable',async t=>{
 const h=fixture(t),p=await h.plan(),kept=structuredClone(h.state.saved.slice(1));
 assert.equal(JSON.stringify(p).includes('PRIVATE'),false);assert.deepEqual(p.targets.map(x=>x.id),['psv_node']);
 const result=await h.client.revokeSavedNativePermissions(p,h.authorization(p));assert.equal(result.state,'COMPLETED');assert.equal(result.policyReady,true);
 assert.deepEqual(h.state.saved,kept);assert.equal(statSync(result.receiptPath).mode&0o777,0o600);
 const count=h.state.calls.filter(c=>c.method==='DELETE').length;assert.equal(count,1);
 const again=await h.client.revokeSavedNativePermissions(p,h.authorization(p));assert.equal(again.replay,true);assert.equal(h.state.calls.filter(c=>c.method==='DELETE').length,count);
 assert.equal((await h.client.nativePermissionPolicy('ses_fixture',{requiredNativeAsk:['shell','edit']})).ready,true);
});

for(const variant of ['authority','project','plan','native','active','pending','policy','new-grant','retained-change'])test('réparation : refus '+variant+' avant DELETE',async t=>{
 const h=fixture(t),p=await h.plan(),a=h.authorization(p),before=structuredClone(h.state.saved);
 if(variant==='authority')a.kind='change-only';
 if(variant==='project')a.projectID='another-project';
 if(variant==='plan')p.targets[0].id='psv_foreign';
 if(variant==='native')h.state.pid=43;
 if(variant==='active')h.state.active.ses_peer={type:'running'};
 if(variant==='pending')h.state.pending.push({id:'per_pending',sessionID:'ses_peer'});
 if(variant==='policy')h.state.rules[0].effect='deny';
 if(variant==='new-grant')h.state.saved.push({id:'psv_new',projectID:'project-fixture',action:'shell',resource:'*'});
 if(variant==='retained-change')h.state.saved.find(x=>x.id==='psv_read').resource='changed';
 const current=structuredClone(h.state.saved);await assert.rejects(h.client.revokeSavedNativePermissions(p,a));
 assert.deepEqual(h.state.saved,current);assert.equal(h.state.calls.some(c=>c.method==='DELETE'),false);
 if(['authority','project','plan','native','active','pending','policy'].includes(variant))assert.deepEqual(h.state.saved,before);
});

test('révocation : réponse perdue mais absence vérifiée, aucune seconde suppression au replay',async t=>{
 const h=fixture(t),p=await h.plan();h.state.dropDelete=true;
 const result=await h.client.revokeSavedNativePermissions(p,h.authorization(p));assert.equal(result.state,'COMPLETED');
 const count=h.state.calls.filter(c=>c.method==='DELETE').length;await h.client.revokeSavedNativePermissions(p,h.authorization(p));
 assert.equal(h.state.calls.filter(c=>c.method==='DELETE').length,count);
});

test('révocation : erreur sans effet conservée, reprise explicite du même plan puis budget borné',async t=>{
 const h=fixture(t),p=await h.plan();h.state.failDelete=true;
 await assert.rejects(h.client.revokeSavedNativePermissions(p,h.authorization(p)),{code:'opencode-permission-repair-outcome-unverified'});
 await assert.rejects(h.client.revokeSavedNativePermissions(p,h.authorization(p)),{code:'opencode-permission-repair-outcome-unverified'});
 await assert.rejects(h.client.revokeSavedNativePermissions(p,h.authorization(p)),{code:'opencode-permission-repair-retry-budget-exhausted'});
 assert.equal(h.state.calls.filter(c=>c.method==='DELETE').length,2);assert.ok(h.state.saved.some(x=>x.id==='psv_node'));
});

for(const variant of ['unavailable','malformed','unknown-field'])test('audit non prouvé '+variant+' reste fermé',async t=>{
 const h=fixture(t);if(variant==='unavailable')h.state.failList=true;
 if(variant==='malformed')delete h.state.saved[0].projectID;
 if(variant==='unknown-field')h.state.saved[0].effect='deny';
 const p=await h.client.nativePermissionPolicy('ses_fixture');assert.equal(p.ready,false);assert.equal(p.savedGrantAudit.available,false);
 assert.equal(JSON.stringify(p).includes('PRIVATE'),false);
});

test('le client CAB refuse always avant toute réponse native',async t=>{
 const h=fixture(t);await assert.rejects(h.client.replyPermission('ses_fixture','per_one','always'),{code:'opencode-permission-always-forbidden'});
 assert.equal(h.state.calls.length,0);
});
