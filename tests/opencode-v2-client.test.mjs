import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { verifyModelPreflight } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-policy.mjs';
import { createOpenCodeV2Client } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'cab-opencode-v2-'));
  const passwordFile = join(root, 'opencode.password');
  writeFileSync(passwordFile, 'synthetic-test-password\n', { mode: 0o600 });
  chmodSync(passwordFile, 0o600);
  return { root, passwordFile, close: () => rmSync(root, { recursive: true, force: true }) };
}

const info = { version: '2.2.0', pid: 42, hostname: '127.0.0.1', urls: [], paths: { tmp: '/tmp' } };
const location = { directory: '/workspace', project: { id: 'fixture', directory: '/workspace', canonical: '/workspace' } };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

async function codeModeFixture(t, content) {
  const f = fixture(); t.after(f.close);
  const client = createOpenCodeV2Client({ baseUrl: 'http://127.0.0.1:4096', directory: '/workspace',
    passwordFile: f.passwordFile, fetchImpl: async u => new URL(u).pathname === '/api/info' ? json(info) : json({ data: [{ id: 'msg_code', type: 'assistant',
      content: [content] }], cursor: { next: null, previous: null } }) });
  return (await client.messages('ses_code'))[0].parts[0];
}

const wrapped = (code, toolCalls, status = 'completed') => ({ type: 'tool', id: 'call_execute',
  name: 'execute', executed: false, time: { created: 1, ran: 2, completed: status === 'running' ? undefined : 3 },
  state: { status, input: { code }, content: [{ type: 'text', text: '{"status":"PENDING"}' }],
    metadata: { toolCalls, truncated: false } } });

test('Code Mode : projection littérale, provenance et découverte pure', async t => {
  const input = { requestId: 'request', commands: ['/usr/bin/true'] };
  const raw = wrapped('return await tools["cgpt-validation"].request_validation('+JSON.stringify(input)+');',
    [{ tool: 'cgpt-validation.request_validation', status: 'completed', input }]);
  const p = await codeModeFixture(t, raw);
  assert.equal(p.tool, 'cgpt-validation_request_validation'); assert.deepEqual(p.state.input, input);
  assert.equal(p.callID, raw.id); assert.equal(p.executed, false);
  assert.match(p.state.metadata.cabCodeMode.envelopeHash, /^[a-f0-9]{64}$/);
  const changed = structuredClone(raw); changed.state.input.code = ' '+changed.state.input.code;
  assert.notEqual((await codeModeFixture(t, changed)).state.metadata.cabCodeMode.envelopeHash,
    p.state.metadata.cabCodeMode.envelopeHash);
  const search = { query: 'broker_readiness', namespace: 'cgpt-validation' };
  const discovery = await codeModeFixture(t, wrapped('const r = search('+JSON.stringify(search)+'); return r;',
    [{tool:'search',status:'completed',input:search}]));
  assert.equal(discovery.tool,'cab_codemode_discovery');
  const combined = await codeModeFixture(t, wrapped('const s = search('+JSON.stringify(search)+'); return await tools["cgpt-validation"].broker_readiness({});',
    [{tool:'search',status:'completed',input:search},{tool:'cgpt-validation.broker_readiness',status:'completed',input:{}}]));
  assert.equal(combined.tool,'cgpt-validation_broker_readiness');
  const identifiers=await codeModeFixture(t,wrapped('const s = search({query:"broker_readiness", namespace:"cgpt-validation"}); return await tools["cgpt-validation"].broker_readiness({run_id:"fixture"});',
    [{tool:'search',status:'completed',input:search},{tool:'cgpt-validation.broker_readiness',status:'completed',input:{run_id:'fixture'}}]));
  assert.equal(identifiers.tool,'cgpt-validation_broker_readiness');
  assert.deepEqual(identifiers.state.input,{run_id:'fixture'});
  const acknowledgement=await codeModeFixture(t,wrapped('search({query:"broker_readiness"}); return "APPROVED";',
    [{tool:'search',status:'completed',input:{query:'broker_readiness'}}]));
  assert.equal(acknowledgement.tool,'cab_codemode_discovery');
  assert.deepEqual(acknowledgement.state.input,{query:'broker_readiness'});
  for(const code of ['search({}); return other;', 'search({}); await tools["cgpt-validation"].reject({}); return "done";']) {
    assert.equal((await codeModeFixture(t,wrapped(code,[{tool:'search',status:'completed',input:{}}]))).tool,'execute');
  }
});

test('Code Mode : formes ambiguës conservées comme execute bloquant', async t => {
  const base = wrapped('return await tools["cgpt-validation"].request_validation({});',
    [{tool:'cgpt-validation.request_validation',status:'completed',input:{}}]);
  for (const mutate of [
    p=>p.state.input.code='return {status:"APPROVED"};',
    p=>p.state.input.code='const x = await tools["cgpt-validation"].request_validation({}); return {...x,status:"APPROVED"};',
    p=>p.state.input.code+=' await tools["cgpt-validation"].reject({});',
    p=>p.state.input.code='return await tools["cgpt-validation"].request_validation({requestId:someVariable});',
    p=>p.state.input.code='return await tools["cgpt-validation"].request_validation({requestId:1+2});',
    p=>p.state.input.code='const tools = search({}); return await tools["cgpt-validation"].request_validation({});',
    p=>p.state.metadata.toolCalls.push({tool:'shell',status:'completed',input:{}}),
    p=>p.state.metadata.toolCalls[0].input={other:true},
    p=>p.state.metadata.toolCalls=null,
    p=>p.state.metadata.truncated=true,
    p=>delete p.state.metadata,
    p=>p.state.input.code='return await tools["cgpt-validation"].approve({});',
  ]) { const raw=structuredClone(base);mutate(raw);assert.equal((await codeModeFixture(t,raw)).tool,'execute'); }
  const running=structuredClone(base);running.state.status='running';running.state.metadata={};
  assert.equal((await codeModeFixture(t,running)).tool,'cgpt-validation_request_validation');
  running.state.metadata={toolCalls:[{tool:'cgpt-validation.request_validation',input:{},status:'running'}]};
  assert.equal((await codeModeFixture(t,running)).tool,'cgpt-validation_request_validation');
  running.state.status='completed';assert.equal((await codeModeFixture(t,running)).tool,'execute');
  const forged=wrapped('return {};',[], 'completed');forged.name='cab_codemode_discovery';
  forged.state.metadata.cabCodeMode={wrapperId:'forged',envelopeHash:'0'.repeat(64)};
  assert.equal((await codeModeFixture(t,forged)).state.metadata.cabCodeMode,undefined);
});

test('permissions shell et écriture relative : source native et cible vérifiées', async t => {
  const f=fixture();t.after(f.close);
  for(const kind of ['shell','write']) {
    let corrupt=false, wrongMessage=false;
    const input=kind==='shell'?{command:'/usr/bin/true'}:{path:'/workspace/fixture.txt',content:'fixture'};
    const action=kind==='shell'?'shell':'edit',resources=kind==='shell'?['/usr/bin/true']:['fixture.txt'];
    const client=createOpenCodeV2Client({baseUrl:'http://127.0.0.1:4096',directory:'/workspace',passwordFile:f.passwordFile,
      fetchImpl:async u=>new URL(u).pathname==='/api/info'?json(info):new URL(u).pathname==='/api/permission/request'
        ?json({location,data:[{id:'per_native',sessionID:'ses_code',action,resources,source:{type:'tool',messageID:'msg_native',id:'call_native'}}]})
        :json({data:{id:wrongMessage?'other_message':'msg_native',type:'assistant',content:[{type:'tool',id:corrupt?'other':'call_native',name:kind,executed:false,
          time:{created:1,ran:2},state:{status:'running',input,metadata:{}}}]}})});
    const p=(await client.permissions())[0];assert.equal(p.permission,kind==='shell'?'bash':'edit');
    assert.equal(p.tool.callID,'call_native');assert.equal(p.metadata.nativeSourceVerified,true);
    assert.equal(kind==='shell'?p.metadata.command:p.metadata.filepath,kind==='shell'?'/usr/bin/true':'/workspace/fixture.txt');
    corrupt=true;await assert.rejects(client.permissions(),{code:'opencode-permission-source-invalid'});
    corrupt=false;wrongMessage=true;await assert.rejects(client.permissions(),{code:'opencode-permission-source-invalid'});
    wrongMessage=false;if(kind==='shell')input.background=true;else input.path='/other/fixture.txt';
    await assert.rejects(client.permissions(),{code:'opencode-permission-target-invalid'});
  }
});

test('le client V2 authentifie les appels, normalise MCP et refuse les routes hors API', async (context) => {
  const f = fixture(); context.after(f.close);
  const calls = [];
  const client = createOpenCodeV2Client({ baseUrl: 'http://127.0.0.1:4096', directory: '/workspace', passwordFile: f.passwordFile,
    fetchImpl: async (input, init) => {
      const url = new URL(input); calls.push({ path: url.pathname, auth: init.headers.authorization, method: init.method });
      if (url.pathname === '/api/info') return json(info);
      if (url.pathname === '/api/location') return json(location);
      if (url.pathname === '/api/mcp') return json({ location, data: [{ name: 'cgpt-validation', status: { status: 'connected' } }] });
      return json({ _tag: 'NotFoundError', message: 'not found' }, 404);
    } });

  const servers = await client.mcp('/workspace');
  assert.equal(servers['cgpt-validation'].status, 'connected');
  assert.deepEqual(calls.map((call) => call.path), ['/api/info', '/api/location', '/api/mcp']);
  assert.ok(calls.every((call) => call.auth === `Basic ${Buffer.from('opencode:synthetic-test-password').toString('base64')}`));
  assert.ok(calls.every((call) => call.path.startsWith('/api/')));
});

test('le client refuse OpenCode 1.19.x sans essai de route V1', async (context) => {
  const f = fixture(); context.after(f.close);
  const paths = [];
  const client = createOpenCodeV2Client({ baseUrl: 'http://127.0.0.1:4096', directory: '/workspace', passwordFile: f.passwordFile,
    fetchImpl: async (input) => { paths.push(new URL(input).pathname); return json({ ...info, version: '1.19.4' }); } });
  await assert.rejects(client.info(), { code: 'opencode-v2-required' });
  assert.deepEqual(paths, ['/api/info']);
});

test('le client respecte le nom Basic Auth fixe opencode de V2', async (context) => {
  const f = fixture(); context.after(f.close);
  let calls = 0;
  assert.throws(() => createOpenCodeV2Client({ baseUrl: 'http://127.0.0.1:4096', passwordFile: f.passwordFile,
    username: 'custom-user', fetchImpl: async () => { calls++; return json(info); } }), { code: 'opencode-username-invalid' });
  assert.equal(calls, 0);
});

test('le client ne prend pas une page HTML 200 pour une API saine', async (context) => {
  const f = fixture(); context.after(f.close);
  let calls = 0;
  const client = createOpenCodeV2Client({ baseUrl: 'http://127.0.0.1:4096', directory: '/workspace', passwordFile: f.passwordFile,
    fetchImpl: async () => { calls++; return new Response('<html>OpenCode</html>', { status: 200, headers: { 'content-type': 'text/html' } }); } });
  await assert.rejects(client.info(), { code: 'opencode-v2-required' });
  assert.equal(calls, 1);
});

test('le client suit les pages V2 et normalise les messages et permissions', async (context) => {
  const f = fixture(); context.after(f.close);
  const calls = [];
  const firstCursor = 'next-page';
  const client = createOpenCodeV2Client({ baseUrl: 'http://127.0.0.1:4096', directory: '/workspace', passwordFile: f.passwordFile,
    fetchImpl: async (input, init) => {
      const url = new URL(input); calls.push({ path: url.pathname, cursor: url.searchParams.get('cursor'), body: init.body });
      if (url.searchParams.has('cursor')) assert.equal(url.searchParams.has('order'),false,'le curseur porte son ordre');
      if (url.pathname === '/api/info') return json(info);
      if (url.pathname === '/api/session') return url.searchParams.get('cursor') === firstCursor
        ? json({ data: [{ id: 'ses_busy', directory: '/workspace', permissions: [] }], cursor: { next: null, previous: firstCursor } })
        : json({ data: [{ id: 'ses_idle', directory: '/workspace', permissions: [] }], cursor: { next: firstCursor, previous: null } });
      if (url.pathname === '/api/session/active') return json({ data: { ses_busy: { type: 'running' } } });
      if (url.pathname === '/api/session/ses_idle/message') return url.searchParams.get('cursor') === firstCursor
        ? json({ data: [{ id: 'msg_user', type: 'user', text: 'prévol', time: { created: 1 } },
          { id: 'msg_tool', type: 'assistant', model: { providerID: 'p', id: 'm' }, time: { created: 2 },
            content: [{ type: 'tool', id: 'call_1', name: 'bash', executed: true, time: { created: 2, ran: 3, completed: 4 },
              state: { status: 'completed', input: { command: '/usr/bin/true' }, content: [{ type: 'text', text: '' }] } }] }], cursor: { next: null, previous: null } })
        : json({ data: [], cursor: { next: firstCursor, previous: null } });
      if (url.pathname === '/api/permission/request') return json({ location, data: [{ id: 'per_1', sessionID: 'ses_idle', action: 'bash', resources: ['/usr/bin/true'], metadata: { command: '/usr/bin/true' } }] });
      return json({ _tag: 'NotFoundError', message: 'not found' }, 404);
    } });

  const status = await client.sessionStatus('/workspace');
  assert.deepEqual(status, { ses_busy: { type: 'busy' } });
  const sessions = await client.listSessions('/workspace');
  assert.deepEqual(sessions.map((session) => session.id), ['ses_idle', 'ses_busy']);
  const permissions = await client.permissions('/workspace');
  assert.deepEqual(permissions[0], { id: 'per_1', sessionID: 'ses_idle', permission: 'bash',
    metadata: { command: '/usr/bin/true' }, source: undefined, message: undefined });
  const messages = await client.messages('ses_idle', '/workspace');
  assert.equal(messages.length, 2);
  assert.equal(messages[0].info.role, 'user');
  assert.equal(messages[0].parts[0].text, 'prévol');
  assert.equal(messages[1].parts[0].executed, true);
  assert.equal(calls.filter((call) => call.path === '/api/session').length, 2);
});

test('la création de session traduit les permissions internes vers les règles V2', async (context) => {
  const f = fixture(); context.after(f.close);
  const calls = [];
  const client = createOpenCodeV2Client({ baseUrl: 'http://127.0.0.1:4096', directory: '/workspace', passwordFile: f.passwordFile,
    fetchImpl: async (input, init) => {
      const url = new URL(input); calls.push({ path: url.pathname, body: init.body });
      if (url.pathname === '/api/info') return json(info);
      if (url.pathname === '/api/location') return json(location);
      if (url.pathname === '/api/session') return json({ data: { id: 'ses_new', directory: '/workspace', permissions: [
        { action: 'bash', resource: '*', effect: 'ask' }] } });
      return json({}, 404);
    } });
  const session = await client.createSession({ directory: '/workspace', permissions: [
    { permission: 'bash', pattern: '*', action: 'ask' }] });
  assert.equal(session.id, 'ses_new');
  assert.deepEqual(JSON.parse(calls.at(-1).body).permissions, [{ action: 'bash', resource: '*', effect: 'ask' }]);
});

test('les métadonnées V2 arbitraires ne deviennent pas le champ legacy tools', async (context) => {
  const f = fixture(); context.after(f.close);
  const client = createOpenCodeV2Client({ baseUrl: 'http://127.0.0.1:4096', directory: '/workspace', passwordFile: f.passwordFile,
    fetchImpl: async (input) => {
      const url = new URL(input);
      if (url.pathname === '/api/info') return json(info);
      if (url.pathname === '/api/session/ses_1/message') return json({ data: [
        { id: 'msg_1', type: 'user', text: 'fixture', metadata: { tools: { bash: true } }, time: { created: 1 } },
      ], cursor: { next: null, previous: null } });
      return json({}, 404);
    } });
  const [message] = await client.messages('ses_1', '/workspace');
  assert.equal(message.info.tools, undefined);
});

test('le client répond once par la route V2 et attend un HTTP 204', async (context) => {
  const f = fixture(); context.after(f.close);
  const calls = [];
  const client = createOpenCodeV2Client({ baseUrl: 'http://127.0.0.1:4096', directory: '/workspace', passwordFile: f.passwordFile,
    fetchImpl: async (input, init) => {
      const url = new URL(input); calls.push({ path: url.pathname, body: init.body });
      if (url.pathname === '/api/info') return json(info);
      if (url.pathname.endsWith('/reply')) return new Response(null, { status: 204 });
      return json({ _tag: 'NotFoundError', message: 'not found' }, 404);
    } });
  await client.replyPermission('ses_1', 'per_1', 'once', '/workspace');
  assert.deepEqual(calls.at(-1), { path: '/api/session/ses_1/permission/per_1/reply', body: JSON.stringify({ decision: 'once' }) });
});

test('un credential lisible par groupe est refusé avant toute requête', async (context) => {
  const f = fixture(); context.after(f.close);
  chmodSync(f.passwordFile, 0o644);
  let calls = 0;
  const client = createOpenCodeV2Client({ baseUrl: 'http://127.0.0.1:4096', passwordFile: f.passwordFile,
    fetchImpl: async () => { calls++; return json(info); } });
  await assert.rejects(client.info(), { code: 'opencode-credential-unavailable' });
  assert.equal(calls, 0);
});

test('la location V2 est transmise par en-tête et une divergence est refusée', async (context) => {
  const f = fixture(); context.after(f.close);
  const directory = '/workspace/location';
  let divergent = false;
  const client = createOpenCodeV2Client({ baseUrl: 'http://127.0.0.1:4096', directory, passwordFile: f.passwordFile,
    fetchImpl: async (url, options) => {
      if (new URL(url).pathname === '/api/location') {
        assert.equal(options.headers['x-opencode-directory'], undefined);
        return json({ directory: '/shared-server' });
      }
      assert.equal(options.headers['x-opencode-directory'], new URL(url).pathname === '/api/info' ? directory : '/shared-server');
      if (new URL(url).pathname === '/api/info') return json(info);
      return json({ location: { directory: divergent ? '/other' : '/shared-server' }, data: [{ name: 'cgpt-validation', status: { status: 'connected' } }] });
    } });
  assert.equal((await client.mcp())['cgpt-validation'].status, 'connected');
  divergent = true;
  await assert.rejects(client.mcp(), { code: 'opencode-mcp-invalid' });
});


async function nativeProofFixture(t, rows) {
 const f=fixture();t.after(f.close);const calls=[];
 const client=createOpenCodeV2Client({baseUrl:'http://127.0.0.1:4096',directory:'/workspace',passwordFile:f.passwordFile,
  fetchImpl:async(input)=>{
   const url=new URL(input);calls.push(url);
   if(url.pathname==='/api/info')return json(info);
   if(url.searchParams.has('cursor')){
    assert.equal(url.searchParams.has('order'),false);
    return json({data:[],cursor:{next:null,previous:'opaque'}});
   }
   assert.equal(url.searchParams.get('order'),'asc');
   return json({data:rows,cursor:{next:'opaque',previous:null}});
  }});
 const messages=await client.messages('ses_native');
 return {messages,calls,selection:{providerID:'p',modelID:'m',reasoning:'medium'},proof:{workspace:'/workspace',now:100,
  session:{id:'ses_native',directory:'/workspace',model:{providerID:'p',modelID:'m',variant:'medium'}},parent:messages.find(x=>x.info.id===messages.find(y=>y.info.role==='assistant')?.info.parentID),response:messages.find(x=>x.info.role==='assistant')}};
}
const nativeRows=()=>[
 {id:'msg_u',type:'user',text:'fixture',time:{created:1}},
 {id:'msg_a',type:'assistant',model:{providerID:'p',id:'m',variant:'medium'},time:{created:2,completed:3},finish:'stop',content:[{type:'text',text:'ok'}]},
 {id:'msg_idle',type:'idle',time:{created:4},outcome:{type:'success'}},
];
test('prévol V2 unique : pagination native, modèle observé sur assistant et parent laissé intact',async t=>{
 const h=await nativeProofFixture(t,nativeRows());
 assert.equal(h.proof.parent.info.model,undefined);assert.equal(h.proof.parent.info.variant,undefined);
 assert.equal(h.proof.response.info.nativeSingleExchange,true);
 assert.equal(verifyModelPreflight(h.selection,h.proof).preflight.messageId,'msg_a');
 assert.equal(h.calls.filter(u=>u.pathname.endsWith('/message')).length,2);
});
test('fausse provenance dans metadata et plusieurs échanges : refus sans parent inventé',async t=>{
 const rows=nativeRows();rows.unshift({id:'msg_older',type:'user',text:'autre',time:{created:0}});
 rows[2].metadata={nativeSingleExchange:true};const h=await nativeProofFixture(t,rows);
 assert.equal(h.proof.response.info.nativeSingleExchange,false);
 assert.throws(()=>verifyModelPreflight(h.selection,h.proof),/model-preflight-not-proved/);
});
test('prévol V2 : modèle partiel du parent, variante contradictoire, dates et outils refusés',async t=>{
 for(const change of [
  rows=>rows[0].model={providerID:'p',id:'m'},
  rows=>rows[0].metadata={variant:'low'},
  rows=>rows[1].model.variant='low',
  rows=>rows[1].model.id='other',
  rows=>rows[0].time.created=10,
  rows=>rows[1].time.completed=101,
  rows=>rows[1].content.push({type:'tool',id:'call',name:'bash',executed:false,state:{status:'completed',input:{command:'true'}}}),
 ]){
  const rows=nativeRows();change(rows);const h=await nativeProofFixture(t,rows);
  assert.throws(()=>verifyModelPreflight(h.selection,h.proof),/model-preflight-not-proved/);
 }
});


test('pagination native : curseur répété ou malformé refusé avant tout résultat partiel',async t=>{
 for(const next of ['same',42]){
  const f=fixture();t.after(f.close);
  const c=createOpenCodeV2Client({baseUrl:'http://127.0.0.1:4096',directory:'/workspace',passwordFile:f.passwordFile,
   fetchImpl:async input=>{const url=new URL(input);if(url.pathname==='/api/info')return json(info);
    if(url.searchParams.has('cursor'))assert.equal(url.searchParams.has('order'),false);
    return json({data:[],cursor:{next,previous:null}});
   }});
  await assert.rejects(c.messages('ses_1'),/opencode-messages-pagination-invalid/);
  await assert.rejects(c.listSessions(),/opencode-sessions-pagination-invalid/);
 }
});
