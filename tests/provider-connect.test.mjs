import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createOpenCodeV2Client } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs';
const json = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'cab-provider-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const passwordFile=join(root,'password');writeFileSync(passwordFile,'synthetic-basic-password',{mode:0o600});
  const calls=[];const state={pid:42,busy:{},permissions:[],active:null,postError:false,afterPost:null};
  const client=createOpenCodeV2Client({baseUrl:'http://127.0.0.1:4096',directory:'/workspace',passwordFile,
    fetchImpl:async(input,options)=>{
      const path=new URL(input).pathname;calls.push({path,method:options.method});
      if(path==='/api/info')return json({version:'2.2.0',pid:state.pid,hostname:'127.0.0.1',urls:[],paths:{tmp:'/tmp'}});
      if(path==='/openapi.json')return json({paths:{'/api/integration/{integrationID}/connect/key':{post:{operationId:'integration.connect.key',requestBody:{content:{'application/json':{schema:{properties:{key:{type:'string'}}}}}},responses:{204:{}}}},'/api/integration/{integrationID}':{get:{operationId:'integration.get'}}}});
      if(path==='/api/session/active')return json({data:state.busy});
      if(path==='/api/location')return json({directory:'/workspace'});
      if(path==='/api/integration')return json({data:[]});
      if(path==='/api/permission/request')return json({location:{directory:'/workspace'},data:state.permissions});
      if(path==='/api/integration/fixture')return json({data:{id:'fixture',methods:[{type:'key'}],connections:state.active?[state.active]:[]}});
      if(path==='/api/integration/fixture/connect/key'){
        const body=JSON.parse(options.body);assert.equal(body.key,'synthetic-provider-key');
        state.active={id:'credential_new',type:'credential',method:'key',label:body.label};
        state.afterPost?.();if(state.postError)throw Error('synthetic-provider-key');
        return new Response(null,{status:204});
      }
      throw Error('unexpected fixture path');
    }});
  const options={transactionId:'transition-1',expectedPid:42,assertBoundary:async()=>{},secretSource:async()=>Buffer.from('synthetic-provider-key\n')};
  return {client,calls,state,options};
}

test('raccord V2 : clé en canal privé, connexion opaque et garde racine inchangée',async t=>{
  const {client,calls,options}=fixture(t);const key=Buffer.from('synthetic-provider-key\n');options.secretSource=async()=>key;
  const result=await client.connectProviderKey('fixture',options);
  assert.equal(result.status,'connected');assert.equal(result.credentialId,'credential_new');assert.equal(result.requiresPreflight,true);
  assert.equal(JSON.stringify(result).includes('synthetic-provider-key'),false);assert.ok(key.every(b=>b===0));
  assert.equal(calls.filter(c=>c.method==='POST').length,1);
  assert.ok(!calls.some(c=>c.path==='/api/credential'||c.path.includes('reload')||c.path.includes('dispose')));
  const count=calls.length;await assert.rejects(client.request('/openapi.json',{schemaRead:true}),{code:'opencode-v2-route-invalid'});assert.equal(calls.length,count);
});

test('raccord V2 : pair actif, identité changée et frontière divergente refusés avant secret/effet',async t=>{
  for(const scenario of ['busy','pid','boundary'])await t.test(scenario,async t=>{
    const {client,calls,state,options}=fixture(t);let reads=0;options.secretSource=async()=>{reads++;return 'synthetic-provider-key'};
    if(scenario==='busy')state.busy={ses_peer:{type:'running'}};
    if(scenario==='pid')state.pid=43;
    if(scenario==='boundary')options.assertBoundary=async()=>{throw Object.assign(Error('private details'),{code:'provider-cohort-changed'})};
    await assert.rejects(client.connectProviderKey('fixture',options),e=>e.effectPossible===false&&!e.message.includes('private'));
    assert.equal(reads,0);assert.ok(!calls.some(c=>c.method==='POST'));
  });
});

test('raccord V2 : erreur après POST reste incertaine, sans fuite ni rejeu',async t=>{
  const {client,calls,state,options}=fixture(t);state.postError=true;
  await assert.rejects(client.connectProviderKey('fixture',options),e=>e.code==='opencode-provider-connect-failed'&&e.effectPossible===true&&
    !JSON.stringify(e).includes('synthetic-provider-key')&&!e.cause);
  assert.equal(calls.filter(c=>c.method==='POST').length,1);
  assert.equal((await client.integrationConnection('fixture')).active.id,'credential_new');
});

test('raccord V2 : source secrète malformée ou échouée filtrée avant POST',async t=>{
  for(const source of [async()=> 'line1\nline2',async()=>Buffer.alloc(4097),async()=>{throw Error('synthetic-provider-key')}]){
    const {client,calls,options}=fixture(t);options.secretSource=source;
    await assert.rejects(client.connectProviderKey('fixture',options),e=>e.effectPossible===false&&!e.message.includes('synthetic-provider-key')&&!e.cause);
    assert.ok(!calls.some(c=>c.method==='POST'));
  }
});

test('raccord V2 : identité changeant après effet conserve l’incertitude',async t=>{
  const {client,state,options}=fixture(t);state.afterPost=()=>state.pid++;
  await assert.rejects(client.connectProviderKey('fixture',options),{code:'opencode-provider-connection-unconfirmed',effectPossible:true});
});

const { connectProviderAccount, providerCohort, VERSION: PROVIDER_VERSION } = await import('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-provider-connect.mjs');
const { readFile, access } = await import('node:fs/promises');
function coordinated(t) {
 const root=mkdtempSync(join(tmpdir(),'cab-provider-cohort-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const state={version:1,pause:true,effects:false,calls:0,throwAfter:false};
 const fetchImpl=async url=>new URL(url).pathname==='/status'?json({workspace:'/workspace',version:PROVIDER_VERSION}):new URL(url).pathname==='/runs'?json({runs:[{runId:'run-a',state:'RESERVED',version:state.version,contextId:1}]}):json({job:{armed:true,modelTransitionProtocol:'model-transition-v1',jobId:'job-a',sessionId:'ses_a',currentCabMandate:''},coordination:{suspension:state.pause?{action:'PAUSE'}:null,accesses:[]},hasUnresolvedOperation:state.effects,activeValidationCount:0,undecidedValidationCount:0,unmatchedNativePermissionCount:0});
 const client={info:async()=>({pid:42}),sharedMcpDirectory:async()=>'/workspace',integrationConnection:async()=>({active:{type:'credential',method:'key',id:'cred-new',label:'CAB-tx-a'}}),
  connectProviderKey:async(id,o)=>{await o.assertBoundary();const bytes=await o.secretSource();bytes.fill(0);state.calls++;if(state.throwAfter)throw Object.assign(Error('synthetic-private'),{code:'opencode-provider-connect-failed',effectPossible:true});return {status:'connected',credentialId:'cred-new'}}};
 const options={client,controllerUrl:'http://127.0.0.1:8788',integrationID:'fixture',transactionId:'tx-a',developerAuthorization:'human-ref',expectedPid:42,stateDirectory:root,secretSource:async()=>Buffer.from('synthetic-private'),fetchImpl};
 return {root,state,options,fetchImpl};
}

test('raccord coordonné : pauses réelles, reçu non secret et exclusion des doubles transactions',async t=>{
 const {root,state,options}=coordinated(t);const receipt=await connectProviderAccount(options);
 assert.equal(receipt.phase,'COMPLETED');assert.equal(state.calls,1);assert.equal(JSON.stringify(receipt).includes('synthetic-private'),false);
 assert.equal(JSON.parse(await readFile(join(root,'tx-a.json'),'utf8')).phase,'COMPLETED');
 await assert.rejects(connectProviderAccount(options));assert.equal(state.calls,1);
});

test('raccord coordonné : pair non pausé ou effet connu interdit avant consommation de clé',async t=>{
 for(const field of ['pause','effects']){
  const {state,options}=coordinated(t);if(field==='pause')state.pause=false;else state.effects=true;
  let reads=0;options.secretSource=async()=>{reads++;return Buffer.from('synthetic-private')};
  await assert.rejects(connectProviderAccount(options));assert.equal(state.calls,0);assert.equal(reads,0);
 }
});

test('raccord coordonné : incertitude garde le verrou, réconciliation sans seconde clé',async t=>{
 const {root,state,options}=coordinated(t);state.throwAfter=true;
 await assert.rejects(connectProviderAccount(options),e=>e.effectPossible===true&&!e.message.includes('synthetic-private'));
 assert.equal(JSON.parse(await readFile(join(root,'tx-a.json'),'utf8')).phase,'UNCONFIRMED');await access(join(root,'provider.lock'));
 await assert.rejects(connectProviderAccount({...options,transactionId:'tx-b'}),{code:'provider-transition-locked'});
 options.secretSource=async()=>{throw Error('must not read key')};
 const receipt=await connectProviderAccount({...options,reconcile:true});assert.equal(receipt.phase,'COMPLETED');assert.equal(state.calls,1);
 await assert.rejects(access(join(root,'provider.lock')));
});

test('raccord CLI : gestionnaire simulé par pipe privé, aucune clé dans stdout/stderr/reçu',async t=>{
 const {createServer}=await import('node:http');const {spawn}=await import('node:child_process');const {fileURLToPath}=await import('node:url');
 const root=mkdtempSync(join(tmpdir(),'cab-provider-cli-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const passwordFile=join(root,'basic-password');writeFileSync(passwordFile,'synthetic-cli-basic',{mode:0o600});
 const key='synthetic-managed-provider-key';let active=null,posts=0;
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;let value;
  if(path==='/status')value={workspace:'/workspace',version:PROVIDER_VERSION};
  else if(path==='/runs')value={runs:[]};
  else if(path==='/api/info')value={version:'2.2.0',pid:4242,hostname:'127.0.0.1',urls:[],paths:{tmp:'/tmp'}};
  else if(path==='/api/location')value={directory:'/workspace'};
  else if(path==='/openapi.json')value={paths:{'/api/integration/{integrationID}/connect/key':{post:{operationId:'integration.connect.key',requestBody:{content:{'application/json':{schema:{properties:{key:{type:'string'}}}}}},responses:{204:{}}}},'/api/integration/{integrationID}':{get:{operationId:'integration.get'}}}};
  else if(path==='/api/integration')value={data:[]};
  else if(path==='/api/session/active')value={data:{}};
  else if(path==='/api/permission/request')value={location:{directory:'/workspace'},data:[]};
  else if(path==='/api/integration/fixture')value={data:{id:'fixture',methods:[{type:'key'}],connections:active?[active]:[]}};
  else if(path==='/api/integration/fixture/connect/key'){
   let body='';for await(const chunk of req)body+=chunk;const parsed=JSON.parse(body);assert.equal(parsed.key,key);posts++;
   active={id:'credential_cli',type:'credential',method:'key',label:parsed.label};res.writeHead(204).end();return;
  }else{res.writeHead(404).end();return}
  res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify(value));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 const {symlink}=await import('node:fs/promises');
 const canonical=fileURLToPath(new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-provider-connect.mjs',import.meta.url));
 const linked=join(root,'installed-provider-connect.mjs');await symlink(canonical,linked);
 for(const [layout,entry]of [['canonical',canonical],['linked',linked]]){
 active=null;posts=0;const transaction='cli-'+layout;
 const child=spawn(process.execPath,[entry,
  '--opencode-url',base,'--controller-url',base,'--directory','/workspace','--integration','fixture','--transaction',transaction,
  '--authorization-reference','human-cli-ref','--expected-pid','4242','--secret-fd','0','--state-directory',join(root,'state')],
  {env:{...process.env,OC_Codex_OPENCODE_PASSWORD_FILE:passwordFile},stdio:['pipe','pipe','pipe']});
 let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);const exited=new Promise(r=>child.once('exit',r));
 child.stdin.end(key+'\n');assert.equal(await exited,0,stderr);assert.equal(posts,1);
 const result=JSON.parse(stdout);assert.equal(result.phase,'COMPLETED');
 const bytes=await readFile(join(root,'state',transaction+'.json'),'utf8');for(const text of [stdout,stderr,bytes]){
  assert.equal(text.includes(key),false);assert.equal(text.includes('synthetic-cli-basic'),false);
 }
 }
});

test('raccord : reçu terminé avant libération du verrou repris sans injection',async t=>{
 const {mkdir,writeFile}=await import('node:fs/promises');const {root,state,options}=coordinated(t);
 await connectProviderAccount(options);await mkdir(join(root,'provider.lock'),{mode:0o700});
 await writeFile(join(root,'provider.lock/owner.json'),JSON.stringify({transactionId:'tx-a'}),{mode:0o600});
 const recovered=await connectProviderAccount({...options,reconcile:true,secretSource:async()=>{throw Error('must not consume')}});
 assert.equal(recovered.phase,'COMPLETED');assert.equal(state.calls,1);await assert.rejects(access(join(root,'provider.lock')));
});
