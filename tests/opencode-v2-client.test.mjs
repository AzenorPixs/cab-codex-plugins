import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { verifyModelPreflight } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-policy.mjs';
import { createOpenCodeV2Client, normalizeOpenCodeEvent, nativeToolInputDigest, nativeCodingMandate, diagnoseCodingTurn } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs';

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
  for(const kind of ['shell','write','edit']) {
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
      assert.equal(options.headers['x-opencode-directory'], new URL(url).pathname === '/api/info' ? undefined : '/shared-server');
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

test('permissions ciblées : une permission étrangère multirésource reste isolée, les identités et cibles propres restent strictes', async t => {
  const f = fixture(); t.after(f.close);
  let owner = 'ses_foreign', missingIdentity = false, sourceReads = 0;
  const client = createOpenCodeV2Client({ baseUrl: 'http://127.0.0.1:4096', directory: '/workspace', passwordFile: f.passwordFile,
    fetchImpl: async u => {
      const path = new URL(u).pathname;
      if (path === '/api/info') return json(info);
      if (path === '/api/permission/request') return json({ location, data: [{ id: 'per_multi',
        ...(missingIdentity ? {} : { sessionID: owner }), action: 'shell', resources: ['a', 'b', 'c', 'd'],
        source: { type: 'tool', messageID: 'msg_multi', id: 'call_multi' } }] });
      sourceReads++;
      return json({ data: { id: 'msg_multi', type: 'assistant', content: [{ type: 'tool', id: 'call_multi', name: 'shell',
        executed: false, time: { created: 1, ran: 2 }, state: { status: 'running', input: { command: 'a' }, metadata: {} } }] } });
    } });
  assert.deepEqual(await client.permissions('/workspace', { sessionIds: ['ses_owned'] }), []);
  assert.equal(sourceReads, 0);
  await assert.rejects(client.permissions(), { code: 'opencode-permission-target-invalid' });
  owner = 'ses_owned';
  await assert.rejects(client.permissions('/workspace', { sessionIds: ['ses_owned'] }), { code: 'opencode-permission-target-invalid' });
  missingIdentity = true;
  await assert.rejects(client.permissions('/workspace', { sessionIds: ['ses_owned'] }), { code: 'opencode-permission-invalid' });
  await assert.rejects(client.permissions('/workspace', { sessionIds: [] }), { code: 'opencode-permission-scope-invalid' });
});

test('usage V2 : tokens et coût natifs validés, métadonnées libres et absences sans métrique fabriquée', async t => {
  const f = fixture(); t.after(f.close);
  const row = { id: 'msg_usage', type: 'assistant', content: [], tokens: { input: 11, output: 7, reasoning: 3, cache: { read: 2, write: 1 } },
    cost: 0, metadata: { tokens: { output: 999 }, cost: 999, usageSource: 'fake', usage: { output: 999 } } };
  const client = createOpenCodeV2Client({ baseUrl: 'http://127.0.0.1:4096', directory: '/workspace', passwordFile: f.passwordFile,
    fetchImpl: async u => new URL(u).pathname === '/api/info' ? json(info)
      : json({ data: [row], cursor: { next: null, previous: null } }) });
  let normalized = (await client.messages('ses_usage'))[0].info;
  assert.deepEqual(normalized.tokens, row.tokens); assert.equal(normalized.cost, 0);
  assert.equal(normalized.usageSource, 'opencode-v2'); assert.equal(normalized.usage, undefined);
  delete row.tokens; delete row.cost;
  normalized = (await client.messages('ses_usage'))[0].info;
  for (const key of ['tokens', 'cost', 'usage', 'usageSource']) assert.equal(normalized[key], undefined);
  row.tokens = { output: 0 };
  normalized = (await client.messages('ses_usage'))[0].info;
  assert.deepEqual(normalized.tokens, { output: 0 }); assert.equal(normalized.cost, undefined);
  for (const tokens of [{ output: -1 }, { input: '3' }, { output: Number.MAX_SAFE_INTEGER + 1 }, {}, { cache: [] }]) {
    row.tokens = tokens; await assert.rejects(client.messages('ses_usage'), { code: 'opencode-message-usage-invalid' });
  }
  delete row.tokens;
  for (const cost of [-1, '0.1', {}]) {
    row.cost = cost; await assert.rejects(client.messages('ses_usage'), { code: 'opencode-message-usage-invalid' });
  }
});


test('SSE V2 : data/location normalisés, identités et enveloppes contradictoires refusées', () => {
  const native = { type: 'session.execution.started', location: { directory: '/workspace' },
    data: { sessionID: 'ses_a' }, durable: { aggregateID: 'ses_a', seq: 1, version: 1 } };
  assert.deepEqual(normalizeOpenCodeEvent(native), { type: native.type, directory: '/workspace', properties: native.data });
  assert.equal(normalizeOpenCodeEvent({ ...native, directory: '/other' }), null);
  assert.equal(normalizeOpenCodeEvent({ ...native, durable: { aggregateID: 'ses_b' } }), null);
  assert.equal(normalizeOpenCodeEvent({ ...native, properties: { sessionID: 'ses_b' } }), null);
  assert.equal(normalizeOpenCodeEvent({ ...native, data: [] }), null);
  const legacy = { directory: '/workspace', payload: { type: 'session.idle', properties: { sessionID: 'ses_a' } } };
  assert.equal(normalizeOpenCodeEvent(legacy).properties.sessionID, 'ses_a');
});

test('erreur MCP V2 : provenance structurée stricte et texte libre sans preuve native', async t => {
  const input = { requestId: 'request', access_id: '' };
  const raw = wrapped('return await tools["cgpt-validation"].request_validation(' + JSON.stringify(input) + ');',
    [{ tool: 'cgpt-validation.request_validation', status: 'error', input }]);
  raw.state.metadata.error = true;
  raw.state.content = [{ type: 'text', text: 'synthetic native error' }];
  const part = await codeModeFixture(t, raw);
  assert.equal(part.tool, 'cgpt-validation_request_validation'); assert.equal(part.state.status, 'error');
  assert.equal(part.state.metadata.cabCodeMode.nativeMcpError, true);
  for (const mutate of [p => delete p.state.metadata.error, p => p.state.metadata.truncated = true,
    p => p.state.metadata.toolCalls[0].input = {}, p => p.state.metadata.toolCalls.push(p.state.metadata.toolCalls[0]),
    p => p.state.input.code = 'return "synthetic native error";']) {
    const changed = structuredClone(raw); mutate(changed);
    assert.equal((await codeModeFixture(t, changed)).tool, 'execute');
  }
});

function directErrorFixture(name = 'request_validation') {
  return { type: 'tool', id: 'call_direct01', name: 'cgpt-validation_' + name, executed: false,
    native: { itemId: 'fc_direct01' }, time: { created: 1, ran: 2, completed: 3 },
    state: { status: 'error', input: { approval_id: 'approval-direct' }, error: { type: 'tool.execution', message: 'native error' } } };
}

test('erreur MCP directe : type natif, identité, temps et empreinte dérivés sans marqueur libre', async t => {
  for (const name of ['request_validation', 'get_approval']) {
    const raw = directErrorFixture(name), part = await codeModeFixture(t, raw);
    assert.equal(part.state.error, 'native error');
    assert.equal(part.state.metadata.cabDirectMcpError.itemId, raw.native.itemId);
    assert.match(part.state.metadata.cabDirectMcpError.envelopeHash, /^[a-f0-9]{64}$/);
    const changed = structuredClone(raw); changed.state.input.approval_id = 'other';
    assert.notEqual((await codeModeFixture(t, changed)).state.metadata.cabDirectMcpError.envelopeHash,
      part.state.metadata.cabDirectMcpError.envelopeHash);
  }
  for (const mutate of [p => p.executed = true, p => delete p.executed, p => p.native.itemId = 'fc_other',
    p => delete p.native, p => p.id = 'other', p => p.time.ran = 0, p => p.time.completed = 1,
    p => delete p.time.created, p => p.state.error = 'native error', p => p.state.error.type = 'unknown',
    p => p.state.status = 'completed', p => p.name = 'cgpt-validation_approve']) {
    const raw = directErrorFixture(); mutate(raw);
    raw.state.metadata = { cabDirectMcpError: { itemId: 'forged', envelopeHash: '0'.repeat(64) } };
    assert.equal((await codeModeFixture(t, raw)).state.metadata.cabDirectMcpError, undefined);
  }
});

test('messages volumineux : pages complètes réduites sans relever le plafond ni avancer le curseur sur échec', async t => {
  const f = fixture(); t.after(f.close); const calls = [];
  const rows = Array.from({ length: 8 }, (_, i) => ({ id: 'msg_large' + i, type: 'assistant', content: [{ type: 'text', text: 'x'.repeat(400000) }] }));
  let secondOversize = true;
  const client = createOpenCodeV2Client({ baseUrl: 'http://127.0.0.1:4096', directory: '/workspace', passwordFile: f.passwordFile,
    fetchImpl: async u => {
      const url = new URL(u); if (url.pathname === '/api/info') return json(info);
      const cursor = url.searchParams.get('cursor'), limit = Number(url.searchParams.get('limit')), start = cursor ? Number(cursor.slice(7)) : 0;
      calls.push({ cursor, limit, order: url.searchParams.get('order') });
      if (cursor && secondOversize) { secondOversize = false; return json({ padding: 'x'.repeat(2 * 1024 * 1024) }); }
      const data = rows.slice(start, start + limit), next = start + data.length;
      return json({ data, cursor: { next: next < rows.length ? 'offset-' + next : null, previous: null } });
    } });
  const result = await client.messages('ses_large');
  assert.deepEqual(result.map(row => row.info.id), rows.map(row => row.id));
  assert.equal(new Set(result.map(row => row.info.id)).size, 8);
  assert.ok(calls.length < 20); assert.equal(calls[0].limit, 200);
  const firstCursor = calls.findIndex(call => call.cursor !== null);
  assert.equal(calls[firstCursor].cursor, calls[firstCursor + 1].cursor);
  assert.ok(calls[firstCursor + 1].limit < calls[firstCursor].limit);
  assert.ok(calls.filter(call => call.cursor).every(call => call.order === null));
});

test('message unique trop volumineux : huit réductions bornées puis échec sans résultat partiel', async t => {
  const f = fixture(); t.after(f.close); const limits = [];
  const client = createOpenCodeV2Client({ baseUrl: 'http://127.0.0.1:4096', directory: '/workspace', passwordFile: f.passwordFile,
    fetchImpl: async u => {
      const url = new URL(u); if (url.pathname === '/api/info') return json(info);
      limits.push(Number(url.searchParams.get('limit')));
      return json({ data: [{ id: 'msg_single', type: 'assistant', content: [{ type: 'text', text: 'x'.repeat(2 * 1024 * 1024) }] }], cursor: { next: null, previous: null } });
    } });
  await assert.rejects(client.messages('ses_large'), { code: 'opencode-response-too-large' });
  assert.deepEqual(limits, [200, 100, 50, 25, 12, 6, 3, 1]);
});

test('pagination adaptative : une erreur HTTP étrangère ne déclenche aucun réessai', async t => {
  const f = fixture(); t.after(f.close); let calls = 0;
  const client = createOpenCodeV2Client({ baseUrl: 'http://127.0.0.1:4096', directory: '/workspace', passwordFile: f.passwordFile,
    fetchImpl: async u => { if (new URL(u).pathname === '/api/info') return json(info); calls++; return json({ error: 'unavailable' }, 503); } });
  await assert.rejects(client.messages('ses_large')); assert.equal(calls, 1);
});


function isolatedMcpFixture(t) {
  const f=fixture();t.after(f.close);const calls=[];
  const state={pid:42,shared:'/workspace/shared',status:'connected',badLocation:false};
  const client=createOpenCodeV2Client({baseUrl:'http://127.0.0.1:4096',directory:'/workspace/technical',passwordFile:f.passwordFile,
    fetchImpl:async(input,options)=>{
      const url=new URL(input);const body=options.body?JSON.parse(options.body):undefined;
      calls.push({path:url.pathname,query:Object.fromEntries(url.searchParams),directory:options.headers['x-opencode-directory'],method:options.method,body});
      if(url.pathname==='/api/info'){state.onInfo?.();return json({...info,pid:state.pid});}
      if(url.pathname==='/api/location')return json({directory:options.headers['x-opencode-directory']||state.shared});
      if(url.pathname==='/api/mcp')return json({location:{directory:state.badLocation?'/workspace/other':state.shared},data:[{name:'cgpt-validation',status:{status:state.status}}]});
      if(url.pathname.startsWith('/api/experimental/mcp/'))return new Response(null,{status:204});
      if(url.pathname==='/api/session')return json({data:{id:'ses_probe',directory:body.location.directory,
        permissions:body.permissions,model:body.model}});
      throw Error('unexpected fixture route '+url.pathname);
    }});
  return {client,calls,state};
}

test('isolation MCP : découverte globale et contrôle partagé sans initialiser le workspace technique',async t=>{
  const {client,calls}=isolatedMcpFixture(t);
  await client.info();await client.mcp();await client.connectMcp('cgpt-validation');await client.disconnectMcp('cgpt-validation');
  for(const call of calls){
    if(['/api/info','/api/location'].includes(call.path)){
      assert.equal(call.directory,undefined);assert.equal(call.query.directory,undefined);
    }else{assert.equal(call.directory,'/workspace/shared');assert.equal(call.query.directory,'/workspace/shared');}
  }
  assert.equal(calls.some(c=>c.directory==='/workspace/technical'),false);
});

test('isolation MCP : argument divergent refusé avant toute requête MCP et cible égale compatible',async t=>{
  const {client,calls}=isolatedMcpFixture(t);
  for(const invoke of [()=>client.mcp('/workspace/technical'),()=>client.connectMcp('cgpt-validation','/workspace/technical'),
    ()=>client.disconnectMcp('cgpt-validation','/workspace/technical')]){
    await assert.rejects(invoke,{code:'opencode-mcp-location-override-refused'});
  }
  assert.equal(calls.some(c=>c.path.includes('/mcp')),false);
  assert.equal((await client.mcp('/workspace/shared'))['cgpt-validation'].status,'connected');
});

test('isolation MCP : location revérifiée, dérive même PID bloquée, nouveau PID redécouvert',async t=>{
  const {client,calls,state}=isolatedMcpFixture(t);assert.equal(await client.sharedMcpDirectory(),'/workspace/shared');
  state.shared='/workspace/replaced';
  await assert.rejects(client.connectMcp('cgpt-validation'),{code:'opencode-mcp-location-changed'});
  assert.equal(calls.some(c=>c.method==='POST'),false);
  state.pid++;assert.equal(await client.sharedMcpDirectory(),'/workspace/replaced');
  state.badLocation=true;await assert.rejects(client.mcp(),{code:'opencode-mcp-invalid'});
});

test('isolation MCP : sonde jetable au workspace partagé, permissions deny et POST correctement ciblé',async t=>{
  const {client,calls}=isolatedMcpFixture(t);
  const probe=await client.createProbeSession({title:'performance sans outil',model:{providerID:'fixture',modelID:'fixture',reasoning:'medium'}});
  assert.equal(probe.directory,'/workspace/shared');
  const post=calls.find(c=>c.path==='/api/session'&&c.method==='POST');
  assert.equal(post.directory,'/workspace/shared');assert.equal(post.query.directory,'/workspace/shared');
  assert.equal(post.body.location.directory,'/workspace/shared');
  assert.deepEqual(post.body.permissions,[{action:'*',resource:'*',effect:'deny'}]);
  assert.equal(post.body.model.variant,'medium');assert.equal(calls.some(c=>c.directory==='/workspace/technical'),false);
});

test('isolation MCP : broker indisponible ou options élargies refusent la sonde sans réparation',async t=>{
  const {client,calls,state}=isolatedMcpFixture(t);
  for(const options of [{directory:'/workspace/technical'},{permissions:[]},{agent:'build'},{title:''}]){
    await assert.rejects(client.createProbeSession(options),{code:'opencode-probe-options-invalid'});
  }
  await assert.rejects(client.createProbeSession({}),{code:'opencode-model-invalid'});
  state.status='failed';await assert.rejects(client.createProbeSession({model:{providerID:'fixture',modelID:'fixture'}}),{code:'opencode-probe-mcp-not-ready'});
  assert.equal(calls.some(c=>c.method==='POST'),false);
});


test('isolation MCP : une session de codage ordinaire conserve son propre workspace explicite',async t=>{
  const {client,calls}=isolatedMcpFixture(t);
  const session=await client.createSession({directory:'/workspace/coding',title:'codage ordinaire',
    permissions:[{permission:'shell',pattern:'*',action:'ask'}]});
  assert.equal(session.directory,'/workspace/coding');
  const post=calls.find(call=>call.path==='/api/session'&&call.method==='POST');
  assert.equal(post.directory,'/workspace/coding');assert.equal(post.query.directory,'/workspace/coding');
  assert.deepEqual(post.body.permissions,[{action:'shell',resource:'*',effect:'ask'}]);
  assert.equal(await client.sharedMcpDirectory(),'/workspace/shared');
});


test('isolation MCP : remplacement serveur pendant préparation refuse la sonde avant POST',async t=>{
  const {client,calls,state}=isolatedMcpFixture(t);let reads=0;
  state.onInfo=()=>{if(++reads===2){state.pid++;state.shared='/workspace/new-server';}};
  await assert.rejects(client.createProbeSession({model:{providerID:'fixture',modelID:'fixture'}}),{code:'opencode-probe-server-changed'});
  assert.equal(calls.some(call=>call.method==='POST'),false);
});

test('isolation MCP : découverte forcée partage une requête info déjà en vol',async t=>{
  const f=fixture();t.after(f.close);let finish;let reads=0;
  const pending=new Promise(resolve=>{finish=resolve;});
  const client=createOpenCodeV2Client({baseUrl:'http://127.0.0.1:4096',directory:'/workspace/technical',passwordFile:f.passwordFile,
    fetchImpl:async(input,options)=>{reads++;assert.equal(options.headers['x-opencode-directory'],undefined);await pending;return json(info);}});
  const first=client.info();const second=client.info(true);
  await new Promise(resolve=>setTimeout(resolve,5));assert.equal(reads,1);finish();
  assert.deepEqual(await first,await second);
});

test('entrée modèle : variant refusé sans réseau pour les quatre méthodes publiques', async t => {
  const f = fixture(); t.after(f.close);
  const invocations = {
    createSession: (client, model) => client.createSession({ model }),
    createProbeSession: (client, model) => client.createProbeSession({ model }),
    prompt: (client, model) => client.prompt('ses_model', 'texte sans outil', { model }),
    switchModel: (client, model) => client.switchModel('ses_model', model),
  };
  for (const [name, invoke] of Object.entries(invocations)) {
    await t.test(name, async () => {
      let calls = 0;
      const client = createOpenCodeV2Client({ baseUrl: 'http://127.0.0.1:4096', directory: '/workspace',
        passwordFile: f.passwordFile, fetchImpl: async () => { calls++; throw Error('unexpected network'); } });
      for (const extra of [{ variant: 'medium' }, { variant: undefined }, { variant: null },
        { variant: 'medium', reasoning: 'medium' }, { variant: 'high', reasoning: 'medium' }]) {
        await assert.rejects(invoke(client, { providerID: 'sensitive-provider', modelID: 'sensitive-model', ...extra }), {
          code: 'opencode-model-variant-unsupported',
          message: 'Le champ model.variant est réservé aux lectures natives ; utiliser model.reasoning en entrée.',
        });
      }
      assert.equal(calls, 0);
    });
  }
});

function modelInputFixture(t) {
  const f = fixture(); t.after(f.close); const calls = [];
  const client = createOpenCodeV2Client({ baseUrl: 'http://127.0.0.1:4096', directory: '/workspace',
    passwordFile: f.passwordFile, fetchImpl: async (input, options) => {
      const path = new URL(input).pathname;
      const body = options.body ? JSON.parse(options.body) : undefined;
      calls.push({ path, method: options.method, body });
      if (path === '/api/info') return json(info);
      if (path === '/api/location') return json({ directory: '/workspace' });
      if (path === '/api/mcp') return json({ location, data: [{ name: 'cgpt-validation', status: { status: 'connected' } }] });
      if (path === '/api/session' && options.method === 'POST') {
        return json({ data: { id: 'ses_model', directory: '/workspace', permissions: body.permissions || [],
          model: body.model || { providerID: 'p', id: 'm' } } });
      }
      if (path === '/api/session/ses_model' && options.method === 'GET') {
        return json({ data: { id: 'ses_model', directory: '/workspace', model: { providerID: 'p', id: 'm', variant: 'medium' } } });
      }
      if (path === '/api/session/ses_model/model') return json({ data: {} });
      if (path === '/api/session/ses_model/prompt') return json({ data: { id: 'msg_model' } });
      throw Error('unexpected model fixture route');
    } });
  return { client, calls };
}

test('entrée modèle : reasoning sérialisé comme variante native pour tous les envois', async t => {
  const { client, calls } = modelInputFixture(t);
  const model = { providerID: 'p', modelID: 'm', reasoning: 'medium' };
  const session = await client.createSession({ model });
  const probe = await client.createProbeSession({ model });
  await client.switchModel('ses_model', { ...model, reasoning: 'high' });
  await client.prompt('ses_model', 'texte sans outil', { model });
  assert.deepEqual(session.model, { providerID: 'p', modelID: 'm', variant: 'medium' });
  assert.deepEqual(probe.model, session.model);
  const sent = calls.filter(call => call.method === 'POST' && call.body?.model).map(call => call.body.model);
  assert.deepEqual(sent, ['medium', 'medium', 'high', 'medium'].map(variant => ({ id: 'm', providerID: 'p', variant })));
});

test('entrée modèle : lecture inchangée, refus de recopie puis conversion explicite', async t => {
  const { client, calls } = modelInputFixture(t);
  const read = await client.session('ses_model');
  assert.deepEqual(read.model, { providerID: 'p', modelID: 'm', variant: 'medium' });
  const before = calls.length;
  await assert.rejects(client.createSession({ model: read.model }), { code: 'opencode-model-variant-unsupported' });
  assert.equal(calls.length, before);
  const { providerID, modelID, variant } = read.model;
  const created = await client.createSession({ model: { providerID, modelID, reasoning: variant } });
  assert.deepEqual(created.model, read.model);
});

test('entrée modèle : absence intentionnelle du niveau conservée', async t => {
  const { client, calls } = modelInputFixture(t);
  const model = { providerID: 'p', modelID: 'm' };
  await client.createSession({ model });
  await client.switchModel('ses_model', model);
  await client.prompt('ses_model', 'texte sans outil', { model });
  const sent = calls.filter(call => call.method === 'POST' && call.body?.model).map(call => call.body.model);
  assert.deepEqual(sent, Array.from({ length: 3 }, () => ({ id: 'm', providerID: 'p' })));
});


test('empreinte native : clés triées, chaînes et Unicode exacts, métadonnées libres exclues',async t=>{
 const input={path:'/workspace/one.py',content:'é\n'};
 assert.equal(nativeToolInputDigest(input),nativeToolInputDigest({content:'é\n',path:input.path}));
 assert.notEqual(nativeToolInputDigest(input),nativeToolInputDigest({...input,content:'e\u0301\n'}));
 assert.notEqual(nativeToolInputDigest(input),nativeToolInputDigest({...input,content:'é\r\n'}));
 const f=fixture();t.after(f.close);
 const client=createOpenCodeV2Client({baseUrl:'http://127.0.0.1:4096',directory:'/workspace',passwordFile:f.passwordFile,
  fetchImpl:async u=>new URL(u).pathname==='/api/info'?json(info):new URL(u).pathname==='/api/permission/request'
   ?json({location,data:[{id:'p',sessionID:'ses_code',action:'edit',resources:[input.path],metadata:{nativeSourceVerified:true,nativeToolInputSha256:'f'.repeat(64)},source:{type:'tool',messageID:'msg_native',id:'call_native'}}]})
   :json({data:{id:'msg_native',type:'assistant',content:[{type:'tool',id:'call_native',name:'write',executed:false,time:{created:1,ran:2},state:{status:'running',input}}]}})});
 assert.equal((await client.permissions('/workspace',{verifyInputs:true}))[0].metadata.nativeToolInputSha256,nativeToolInputDigest(input));
});


test('permission historique : aucune empreinte libre ne devient preuve native',async t=>{
 const f=fixture();t.after(f.close);const client=createOpenCodeV2Client({baseUrl:'http://127.0.0.1:4096',directory:'/workspace',passwordFile:f.passwordFile,
  fetchImpl:async u=>new URL(u).pathname==='/api/info'?json(info):json({location,data:[{id:'p',sessionID:'ses_code',action:'edit',resources:['/workspace/one.py'],metadata:{nativeSourceVerified:true,nativeToolInputSha256:'a'.repeat(64)}}]})});
 const p=(await client.permissions())[0];assert.equal(p.metadata.nativeSourceVerified,undefined);assert.equal(p.metadata.nativeToolInputSha256,undefined);
});


test('Code Mode : readiness vide unique, input absent attesté et empreinte brute conservée',async t=>{
 const code='return await tools["cgpt-validation"].broker_readiness({});';
 const omitted=wrapped(code,[{tool:'cgpt-validation.broker_readiness',status:'completed'}]);
 const before=structuredClone(omitted),part=await codeModeFixture(t,omitted);
 assert.equal(part.tool,'cgpt-validation_broker_readiness');assert.deepEqual(part.state.input,{});
 assert.deepEqual(omitted,before);assert.equal(Object.hasOwn(part.state.metadata.toolCalls[0],'input'),false);
 const explicit=wrapped(code,[{tool:'cgpt-validation.broker_readiness',status:'completed',input:{}}]);
 assert.notEqual(part.state.metadata.cabCodeMode.envelopeHash,(await codeModeFixture(t,explicit)).state.metadata.cabCodeMode.envelopeHash);
 for(const spelling of ['return await tools["cgpt-validation"].broker_readiness( { } );',"return await tools['cgpt-validation'].broker_readiness({});"]){
  assert.equal((await codeModeFixture(t,wrapped(spelling,[{tool:'cgpt-validation.broker_readiness',status:'completed'}]))).tool,'cgpt-validation_broker_readiness');}
});

test('Code Mode : omission input readiness ne généralise aucune valeur implicite',async t=>{
 const base=wrapped('return await tools["cgpt-validation"].broker_readiness({});',[{tool:'cgpt-validation.broker_readiness',status:'completed'}]);
 for(const change of [
  p=>p.state.metadata.toolCalls[0].input=null,
  p=>p.state.metadata.toolCalls[0].input=[],
  p=>p.state.metadata.toolCalls[0].input={run_id:'foreign'},
  p=>p.state.input.code='return await tools["cgpt-validation"].broker_readiness({run_id:"a"});',
  p=>p.state.input.code='return await tools["cgpt-validation"].broker_readiness(arguments);',
  p=>p.state.input.code='const r = await tools["cgpt-validation"].broker_readiness({}); return r;',
  p=>p.state.input.code+=' await tools["cgpt-validation"].reject({});',
  p=>p.state.input.code='const s=search({query:"broker_readiness"}); return await tools["cgpt-validation"].broker_readiness({});',
  p=>p.state.metadata.toolCalls.push({tool:'shell',status:'completed',input:{}}),
  p=>p.state.metadata.toolCalls[0].tool='cgpt-validation.get_approval',
  p=>p.state.metadata.toolCalls[0].status='error',
  p=>p.state.metadata.toolCalls[0].status='running',
  p=>p.state.status='running',
  p=>p.state.status='error',
  p=>p.executed=true,
  p=>delete p.executed,
  p=>p.state.metadata.error=true,
  p=>p.state.metadata.error=null,
  p=>p.state.metadata.error="false",
  p=>p.state.metadata.truncated=true,
  p=>delete p.state.metadata.truncated,
  p=>delete p.state.metadata.toolCalls,
  p=>p.state.metadata.toolCalls=[null],
 ]){const raw=structuredClone(base);change(raw);assert.equal((await codeModeFixture(t,raw)).tool,'execute');}
 for(const method of ['request_validation','get_approval','poll_approval','reject']){
  assert.equal((await codeModeFixture(t,wrapped('return await tools["cgpt-validation"].'+method+'({});',[{tool:'cgpt-validation.'+method,status:'completed'}]))).tool,'execute');}
});


test('mandat natif : instruction explicite sans recopie ni modification du mandat', () => {
 const text='é\nwrite exact "{}"\n';const value=nativeCodingMandate(text);
 assert.ok(value.endsWith('\n\n'+text));assert.match(value,/recherche MCP vide/);assert.match(value,/réconciliation/);
 assert.throws(()=>nativeCodingMandate(''),/mandate-invalid/);
});

const codingMessages = parts => [{info:{id:'msg_request',sessionID:'ses_coding',role:'user'},parts:[]},
 {info:{id:'msg_answer',sessionID:'ses_coding',parentID:'msg_request',role:'assistant',finish:'stop'},parts}];
const codingOptions={sessionId:'ses_coding',promptId:'msg_request'};
test('diagnostic : erreur fournisseur et continuation divergente sans corps ni autorité', () => {
 const input={path:'target.py',content:'reviewed'},expected=nativeToolInputDigest(input);
 const messages=codingMessages([{type:'tool',tool:'write',state:{input:{}}},{type:'tool',tool:'write',state:{input:{path:'target.py',content:'fragment-private'}}}]);
 messages[1].info.error={type:'provider.internal',message:'PRIVATE-ERROR'};messages[1].info.finish='error';
 const d=diagnoseCodingTurn(messages,{...codingOptions,toolInputSha256:expected});
 assert.equal(d.providerFailure,true);assert.equal(d.nativeTurnFailed,true);assert.equal(d.invalidWriteInputCount,1);assert.equal(d.inputMismatchCount,2);
 assert.equal(d.requiresReconciliation,true);assert.equal(d.effectStatus,'unverified');assert.equal(d.nextAction,'reconcile-before-new-mandate');
 assert.ok(!JSON.stringify(d).includes('private'));assert.ok(!JSON.stringify(d).includes('PRIVATE-ERROR'));
 assert.equal(d.decision,undefined);assert.equal(d.once,undefined);assert.equal(messages[1].parts[1].state.input.content,'fragment-private');
});
test('diagnostic : catalogue MCP seul ne prouve pas absence native, corrélation stricte', () => {
 const discovery=codingMessages([{type:'tool',tool:'cab_codemode_discovery',state:{output:'{"items":[]}'}}]);
 const d=diagnoseCodingTurn(discovery,codingOptions);assert.equal(d.discoveryOnly,true);assert.equal(d.nativeWriteCount,0);assert.equal(d.effectStatus,'unverified');
 const valid=codingMessages([{type:'tool',tool:'write',state:{input:{path:'a',content:''}}}]);
 const ok=diagnoseCodingTurn(valid,{...codingOptions,toolInputSha256:nativeToolInputDigest({path:'a',content:''})});assert.equal(ok.inputMismatchCount,0);assert.equal(ok.requiresReconciliation,false);assert.equal(ok.effectStatus,'unverified');
 for(const change of [m=>m[0].info.sessionID='ses_foreign',m=>m[1].info.parentID='msg_other',m=>m.push(structuredClone(m[0]))]){const m=structuredClone(valid);change(m);assert.equal(diagnoseCodingTurn(m,codingOptions).available,false)}
 assert.throws(()=>diagnoseCodingTurn(valid,{...codingOptions,toolInputSha256:'invalid'}),/diagnostic-invalid/);
});

test('frontière de récupération : sessions/activité globales, permissions partagées et sortie filtrée',async t=>{
 const f=fixture();t.after(f.close);const calls=[];let duplicate=false;
 const client=createOpenCodeV2Client({baseUrl:'http://127.0.0.1:4096',directory:'/coding-workspace',passwordFile:f.passwordFile,fetchImpl:async(u,o)=>{
  const url=new URL(u);calls.push({path:url.pathname,query:url.search,scoped:o.headers['x-opencode-directory']});
  if(url.pathname==='/api/info')return json(info);
  if(url.pathname==='/api/location')return json({directory:'/shared'});
  if(url.pathname==='/api/session')return json({data:[{id:duplicate?'invalid':'ses_global',private:'PRIVATE-SOURCE'}],cursor:{next:null}});
  if(url.pathname==='/api/session/active')return json({data:{}});
  if(url.pathname==='/api/permission/request')return json({location:{directory:'/shared'},data:[]});
  throw Error('unexpected '+url.pathname);
 }});
 const observed=await client.mcpRecoverySnapshot();assert.equal(observed.pid,42);assert.equal(observed.sessionCount,1);assert.equal(observed.activeSessionCount,0);assert.equal(observed.sharedPermissionCount,0);assert.equal(observed.sharedDirectory,'/shared');assert.match(observed.sessionIdsSha256,/^[a-f0-9]{64}$/);assert.ok(!JSON.stringify(observed).includes('PRIVATE'));
 assert.ok(calls.filter(c=>['/api/session','/api/session/active','/api/location'].includes(c.path)).every(c=>c.scoped===undefined&&!c.query.includes('directory=')));
 assert.ok(calls.filter(c=>c.path==='/api/permission/request').every(c=>c.scoped==='/shared'&&c.query.includes('directory=%2Fshared')));
 duplicate=true;await assert.rejects(client.mcpRecoverySnapshot(),{code:'opencode-recovery-observation-invalid'});
});

async function permissionPromptFixture(t) {
 const f=fixture();t.after(f.close);const calls=[];let rules=[{action:'shell',resource:'*',effect:'deny'},{action:'edit',resource:'*',effect:'deny'},{action:'subagent',resource:'*',effect:'deny'},{action:'skill',resource:'*',effect:'deny'}];let returnedId='ses_policy',modelChangesDeny=false;
 const client=createOpenCodeV2Client({baseUrl:'http://127.0.0.1:4096',directory:'/default',passwordFile:f.passwordFile,fetchImpl:async(u,o)=>{
  const path=new URL(u).pathname;calls.push({path,method:o.method,scope:o.headers['x-opencode-directory']});
  if(path==='/api/info')return json(info);
  if(path==='/api/session/ses_policy')return json({data:{id:returnedId,directory:'/target',permissions:rules}});
  if(path==='/api/session/ses_policy/model'){if(modelChangesDeny)rules[0].effect='deny';return json({data:{}})}
  if(path==='/api/session/ses_policy/prompt')return json({data:{id:'msg_prompt'}});
  throw Error('unexpected '+path);
 }});
 return {client,calls,setRules:v=>rules=v,setForeign:()=>returnedId='ses_foreign',changeDenyWithModel:()=>modelChangesDeny=true};
}
test('prompt protégé : deny refuse avant prompt/MCP/PATCH/modèle, inspection sans corps',async t=>{
 const h=await permissionPromptFixture(t),options={directory:'/target',requiredNativeAsk:['shell']};
 const policy=await h.client.nativePermissionPolicy('ses_policy',options);assert.equal(policy.ready,false);assert.deepEqual(policy.missing,['shell']);assert.equal(policy.effective.shell.action,'deny');assert.equal(policy.snapshot_only,true);assert.match(policy.policySha256,/^[a-f0-9]{64}$/);assert.equal(policy.permissions,undefined);
 await assert.rejects(h.client.prompt('ses_policy','prévol', {...options,model:{providerID:'fixture',modelID:'fixture'}}),{code:'opencode-native-permission-ask-required'});
 assert.ok(h.calls.every(c=>c.method==='GET'));assert.ok(!h.calls.some(c=>c.path.endsWith('/prompt')||c.path.endsWith('/model')));
});
test('prompt protégé : shell ask seul suffit au prévol, edit deny et contexte restent préservés',async t=>{
 const h=await permissionPromptFixture(t);h.setRules([{action:'shell',resource:'*',effect:'ask'},{action:'edit',resource:'*',effect:'deny'}]);
 const r=await h.client.prompt('ses_policy','prévol',{directory:'/target',requiredNativeAsk:['shell']});assert.equal(r.id,'msg_prompt');assert.equal(h.calls.find(c=>c.path.endsWith('/prompt')).scope,'/target');
 await assert.rejects(h.client.prompt('ses_policy','écriture',{directory:'/target',requiredNativeAsk:['edit']}),{code:'opencode-native-permission-ask-required'});
 assert.equal(h.calls.filter(c=>c.path.endsWith('/prompt')).length,1);assert.equal(h.calls.filter(c=>c.method==='PATCH').length,0);
});
test('prompt protégé : allow/spécifique/alias seul, option invalide et SID divergent refusés',async t=>{
 const h=await permissionPromptFixture(t);
 for(const rules of [[{action:'shell',resource:'*',effect:'allow'}],[{action:'shell',resource:'specific',effect:'ask'}],[{action:'bash',resource:'*',effect:'ask'}]]){h.setRules(rules);await assert.rejects(h.client.prompt('ses_policy','prévol',{directory:'/target',requiredNativeAsk:['shell']}),{code:'opencode-native-permission-ask-required'})}
 for(const value of [[],null,['bash'],['shell','shell'],'shell'])await assert.rejects(h.client.prompt('ses_policy','prévol',{directory:'/target',requiredNativeAsk:value}),{code:'opencode-native-ask-requirement-invalid'});
 h.setForeign();await assert.rejects(h.client.prompt('ses_policy','prévol',{directory:'/target',requiredNativeAsk:['shell']}),{code:'opencode-session-divergent'});assert.ok(h.calls.every(c=>c.method==='GET'));
});
test('prompt historique deny inchangé et nouveau contrôle après changement explicite de modèle',async t=>{
 const h=await permissionPromptFixture(t);await h.client.prompt('ses_policy','lecture/proposition',{directory:'/target'});assert.equal(h.calls.filter(c=>c.path.endsWith('/prompt')).length,1);
 h.setRules([{action:'shell',resource:'*',effect:'ask'},{action:'edit',resource:'*',effect:'deny'}]);h.changeDenyWithModel();
 await assert.rejects(h.client.prompt('ses_policy','prévol',{directory:'/target',model:{providerID:'fixture',modelID:'fixture'},requiredNativeAsk:['shell']}),{code:'opencode-native-permission-ask-required'});
 assert.equal(h.calls.filter(c=>c.path.endsWith('/model')).length,1);assert.equal(h.calls.filter(c=>c.path.endsWith('/prompt')).length,1);assert.equal(h.calls.filter(c=>c.method==='PATCH').length,0);
});
