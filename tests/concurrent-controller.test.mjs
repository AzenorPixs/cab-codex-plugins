import { fixtureEnvironment } from './helpers/cab-environment.mjs';
import { openCodeV2TestHandler, v2ProviderResponseBytes, v2NormalizedToolPart } from './helpers/opencode-v2-test-server.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import test from 'node:test';
import { prepareControllerModelPolicy } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-policy.mjs';
import { createOpenCodeV2Client } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs';
import { proofHash } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-maintenance-proof.mjs';
import { ResourceRunRegistry } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs';

const controllerPath = fileURLToPath(new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs', import.meta.url));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(check, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) { if (await check()) return; await delay(20); }
  throw new Error('condition not reached');
}
async function setup(t, { reconnectMs = 30, environment = {}, codingPolicy = false, prepareCatalog = false } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'cab-concurrent-'));
  const native = { permissions: [], replies: [], busy: {}, messages: {}, rules: {}, requests: [], sessions: {} };
  if (codingPolicy) {
    const stamp=new Date(Date.now()-60000).toISOString();
    const catalog={schema_version:2,evaluated_at:stamp,published_at:stamp,selection_status:'selected',selected_mode:'mode1',
      models:Array.from({length:6},(_,i)=>({mode:'mode'+(i+1),priority:i+1,state:'Valide',selected:i===0,provider:'provider'+(i+1),
        model_id:'model'+(i+1),evaluated_this_run:true,evaluated_at:stamp,reasoning:'low'}))};
    const activeRoot=join(directory,'active-skill');if(prepareCatalog)mkdirSync(join(activeRoot,'data'),{recursive:true});
    const path=prepareCatalog?join(activeRoot,'data/pllm-current.json'):join(directory,'pllm-current.json');writeFileSync(path,JSON.stringify(catalog));
    native.catalogPath=path;
    if(prepareCatalog){native.preparation=prepareControllerModelPolicy({environment,activeSkillRoot:activeRoot});environment={...environment,...native.preparation.environment};}
    else environment={...environment,OC_Codex_PLLM_CATALOG:path};
    native.providers={connected:catalog.models.map(m=>m.provider),all:catalog.models.map(m=>({id:m.provider,models:{[m.model_id]:{variants:{medium:{},high:{},xhigh:{},low:{}}}}}))};
    native.messages.ses_probe=[{info:{id:'msg_user',sessionID:'ses_probe',role:'user'},parts:[]},
      {info:{id:'msg_response',sessionID:'ses_probe',role:'assistant',finish:'stop',parentID:'msg_user',providerID:'provider1',modelID:'model1',variant:'medium',time:{completed:Date.now()-10}},parts:[{type:'text',text:'probe ok'}]}];
    native.sessions.ses_probe={id:'ses_probe',directory,model:{providerID:'provider1',modelID:'model1',variant:'medium'},permission:[]};
  }
  const eventStreams = new Set();
  native.emit = (event) => { for (const stream of eventStreams) stream.write('data: ' + JSON.stringify(event) + '\n\n'); };
  const children = [];
  const opencode = createServer(openCodeV2TestHandler(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    native.requests.push(url.pathname);
    if (native.onRequest) await native.onRequest(url.pathname);
    if (url.pathname === '/global/event') {
      response.writeHead(200, { 'content-type': 'text/event-stream' });
      eventStreams.add(response); response.on('close', () => eventStreams.delete(response));
      response.write('data: {"type":"server.connected"}\n\n'); return;
    }
    let payload;
    if (url.pathname === '/provider') payload = native.providers || {all:[],connected:[]};
    else if (/^\/session\/[^/]+\/message\/[^/]+$/.test(url.pathname)) payload=(native.messages[url.pathname.split('/')[2]] || []).find(m=>m.info?.id===url.pathname.split('/')[4]);
    else if (url.pathname === '/permission') payload = native.permissions;
    else if (url.pathname === '/global/health') payload = { healthy: true };
    else if (url.pathname === '/path') payload = { directory };
    else if (url.pathname === '/mcp') payload = { 'cgpt-validation': { status: 'connected' } };
    else if (url.pathname === '/session/status') payload = native.busy;
    else if (url.pathname.includes('/permissions/')) {
      let body = ''; for await (const chunk of request) body += chunk;
      native.replies.push({ path: url.pathname, body: JSON.parse(body) });
      native.permissions = native.permissions.filter((p) => !url.pathname.endsWith('/' + p.id)); payload = true;
    } else if (url.pathname.endsWith('/message')) payload = native.messages[url.pathname.split('/')[2]] || [];
    else if (url.pathname.startsWith('/session/')) payload = { id: url.pathname.split('/')[2], directory,
      permission: native.rules[url.pathname.split('/')[2]] || [{ permission: '*', pattern: '*', action: 'ask' }],
      ...native.sessions[url.pathname.split('/')[2]] };
    else { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'content-type': 'application/json', connection: 'close' }); response.end(JSON.stringify(payload));
  }, { directory, onModelSwitch: ({sessionId,body}) => {
    native.sessions[sessionId] = { ...native.sessions[sessionId], model: { providerID: body.model.providerID,
      modelID: body.model.id, ...(body.model.variant ? { variant: body.model.variant } : {}) } };
  } }));
  await new Promise((resolve) => opencode.listen(0, '127.0.0.1', resolve));
  const listener = createServer();
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  const base = 'http://127.0.0.1:' + port;
  let child;
  let stderr = '';
  async function start() {
    child = spawn(process.execPath, [controllerPath], { stdio: ['ignore', 'ignore', 'pipe'], env: {
      ...fixtureEnvironment, OC_Codex_WORKSPACE: directory, OC_Codex_OUTSIDE_SANDBOX: '1',
      OC_Codex_STATUS_PORT: String(port), OC_Codex_OPENCODE_URL: 'http://127.0.0.1:' + opencode.address().port,
      OC_Codex_DECISION_MODE: 'manual', OC_Codex_RECONNECT_MS: String(reconnectMs),
      CODEX_COMMAND: 'cab-test-unused-app-server',
      ...environment,
    } });
    child.stderr.on('data', (data) => { stderr += data; });
    await waitFor(async () => { if (child.exitCode !== null) throw new Error(stderr);
      let status;
      try { const response = await fetch(base + '/status', { headers: { connection: 'close' }, signal: AbortSignal.timeout(500) }); if (!response.ok) return false; status = await response.json(); }
      catch { return false; }
      assert.equal(status.pid, child.pid, 'fixture controller PID mismatch');
      assert.equal(status.workspace, directory, 'fixture controller workspace mismatch');
      return status.opencodeSse === 'connected'; }, 10000);
  }
  async function stop() {
    if (child.exitCode !== null) return;
    const done = new Promise((resolve) => child.once('exit', resolve)); child.kill('SIGTERM'); await done;
    await delay(30);
  }
  t.after(async () => {
    for (const process of children) if (process.exitCode === null && process.signalCode === null) {
      const done = new Promise((resolve) => process.once('exit', resolve)); process.kill('SIGTERM'); await done;
    }
    await stop(); opencode.closeAllConnections();
    await new Promise((resolve) => opencode.close(resolve)); rmSync(directory, { recursive: true, force: true }); });
  const get = async (path) => { const r = await fetch(base + path, { headers: { connection: 'close' } });
    const text = await r.text(); return { status: r.status, body: text ? JSON.parse(text) : null }; };
  const post = async (path, data) => { const r = await fetch(base + path, { method: 'POST',
    headers: { 'content-type': 'application/json', connection: 'close' }, body: JSON.stringify(path === '/broker/readiness' ? { coordination_protocol: 'resource-scoped-v1', ...data } : data) });
    const text = await r.text(); return { status: r.status, body: text ? JSON.parse(text) : null }; };
  const candidate = (id) => ({ runId: id, ownerId: 'codex-' + id, sessionId: 'ses_' + id, directory,
    changeId: 'change-' + id, selectionKey: 'requirement-' + id, dependsOn: [],
    resources: [{ key: 'file:src/' + id + '.py', mode: 'write' }], exclusiveResources: ['file:src/' + id + '.py'] });
  async function reserve(id, override = {}) {
    const r = await post('/runs/reserve', { ...candidate(id),
      ...(override.resources ? { exclusiveResources: [] } : {}), ...override }); assert.equal(r.status, 201, JSON.stringify(r));
    const arm = await post('/runs/' + id + '/job/arm', { jobId: 'job-' + id, sessionId: 'ses_' + id,
      directory, changeId: 'change-' + id, strictCommands: true, criteria: ['delivery', 'statistics'] });
    assert.equal(arm.status, 201, JSON.stringify(arm)); return r.body;
  }
  const approval = (run, requestId, expectedRevisions = null) => {
    const resources = requestId.startsWith('preflight') ? run.resources.map((r) => ({ ...r, mode: 'read' })) : run.resources;
    const value = { run_id: run.runId, reservation_version: run.version,
    coordination_protocol: 'resource-scoped-v1', operation_id: 'op-' + requestId,
    operation_digest: createHash('sha256').update(requestId).digest('hex'),
    expected_revisions: expectedRevisions || Object.fromEntries(resources.map((r) => [r.key, 0])),
    requestId, approval_id: 'approval-' + requestId, session_id: run.sessionId,
    change_id: run.changeId, directory, files: [], commands: ['/usr/bin/true'],
    resources, title: 'isolated command', summary: 'synthetic fixture' };
    native.messages[run.sessionId] ||= [];
    native.messages[run.sessionId].push({ parts: [{ type: 'tool', tool: 'cgpt-validation_request_validation',
      state: { status: 'running', input: structuredClone(value) } }] });
    return value;
  };
  await start();
  await post('/broker/readiness', { status: 'READY', pending_count: 0, infrastructure_status: 'READY' });
  async function approvedAccess(run, requestId, expectedRevisions) {
    const value = approval(run, requestId, expectedRevisions);
    assert.equal((await post('/validation/request', { approval: value })).status, 202);
    assert.equal((await post('/runs/' + run.runId + '/decision/' + value.requestId, { decision: 'approved' })).status, 201);
    const acquired = await post('/runs/' + run.runId + '/locks/acquire', { version: run.version,
      operationId: value.operation_id, operationDigest: value.operation_digest,
      resources: value.resources, expectedRevisions: value.expected_revisions });
    assert.equal(acquired.status, 200, JSON.stringify(acquired));
    return { approval: value, access: acquired.body };
  }
  async function execute(value) {
    native.permissions.push({ id: 'perm-' + value.requestId, sessionID: value.session_id,
      permission: value.commands.length ? 'bash' : 'edit', tool: { callID: 'call-' + value.requestId },
      metadata: value.commands.length ? { command: value.commands[0] } : { filepath: directory + '/' + value.files[0] } });
    await waitFor(() => native.replies.some((r) => r.path.endsWith('/perm-' + value.requestId)));
  }
  async function completeTool(value, exit = 0) {
    const op = (await get('/runs')).body.coordination.operations[value.operation_id];
    const stamp = Math.max(Date.now(), op.native.startedAt) + 1;
    const part = { type: 'tool', id: 'part-' + value.requestId, callID: 'call-' + value.requestId,
      sessionID: value.session_id, tool: value.commands.length ? 'bash' : 'edit', state: { status: 'completed',
        input: value.commands.length ? { command: value.commands[0] } : { filePath: directory + '/' + value.files[0] },
        time: { start: stamp, end: stamp + 1 }, metadata: { exit } } };
    native.messages[value.session_id].push({ parts: [part] });
    native.emit({ type: 'message.part.updated', properties: { part } });
  }
  async function releaseOperation(run, value, access) {
    const current = access || (await get('/runs/' + run.runId + '/locks')).body.accesses.find((a) => a.accessId === value.operation_id);
    return post('/runs/' + run.runId + '/locks/release', { version: run.version, operationId: current.accessId,
      token: current.token, fencing: current.fencing, outcome: 'COMPLETED', evidence: ['native effects reviewed'] });
  }
  const nativeClient = createOpenCodeV2Client({ baseUrl:'http://127.0.0.1:'+opencode.address().port, directory,
    passwordFile:fixtureEnvironment.OC_Codex_OPENCODE_PASSWORD_FILE });
  return { native, nativeClient, children, directory, base, get, post, candidate, reserve, approval, start, stop,
    approvedAccess, execute, completeTool, releaseOperation };
}

test('garde du moniteur : quiescence, origine et exclusion des mutations concurrentes', async (t) => {
  const h = await setup(t);
  const headers = { 'content-type': 'application/json', 'x-cab-monitor': '1' };
  const post = async (path, body, extra = {}) => {
    const response = await fetch(h.base + '/monitor/lifecycle/' + path, { method: 'POST',
      headers: { ...headers, ...extra }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  assert.equal((await post('prepare', { workspace: h.directory }, { origin: 'https://foreign.invalid' })).status, 403);
  h.native.busy = { session: { type: 'busy' } };
  assert.equal((await post('prepare', { workspace: h.directory })).status, 409);
  h.native.busy = {};
  h.native.permissions = [{ id: 'pending', sessionID: 'session' }];
  assert.equal((await post('prepare', { workspace: h.directory })).status, 409);
  h.native.permissions = [];
  const lease = await post('prepare', { workspace: h.directory });
  assert.equal(lease.status, 200, JSON.stringify(lease));
  assert.equal(lease.body.workspace, h.directory); assert.ok(lease.body.pid > 0);
  assert.equal((await h.post('/runs/reserve', h.candidate('blocked'))).status, 409);
  assert.equal((await post('release', { token: 'wrong' })).status, 409);
  assert.equal((await post('release', { token: lease.body.token })).status, 200);
  await h.reserve('active');
  assert.equal((await post('prepare', { workspace: h.directory })).status, 409);
});

test('la garde refuse une mutation déjà en vol sans interrompre sa réservation', async (t) => {
  const h = await setup(t); let resume; let entered;
  const waiting = new Promise((resolve) => { entered = resolve; });
  const paused = new Promise((resolve) => { resume = resolve; });
  h.native.onRequest = async (path) => { if (path === '/session/ses_race') { entered(); await paused; } };
  const reservation = h.post('/runs/reserve', h.candidate('race')); await waiting;
  const response = await fetch(h.base + '/monitor/lifecycle/prepare', { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-cab-monitor': '1' }, body: JSON.stringify({ workspace: h.directory }) });
  assert.equal(response.status, 409); resume();
  assert.equal((await reservation).status, 201);
});

test('API STATS et purge : contrat HTTP, origines et préservation du RUN', async (t) => {
  const h = await setup(t);
  await h.reserve('stats');
  const before = (await h.get('/runs')).body;
  assert.equal((await h.get('/statistics/dashboard?selection=7d&runId=stats')).status, 200);
  assert.equal((await h.get('/statistics/dashboard?selection=invalid')).status, 400);
  const route = h.base + '/statistics/retention/preview';
  const headers = { 'content-type': 'application/json', 'x-cab-statistics': '1' };
  assert.equal((await fetch(route, { method: 'POST', body: '{"days":7}' })).status, 400);
  assert.equal((await fetch(route, { method: 'POST', headers: { ...headers, origin: 'http://foreign.invalid' }, body: '{"days":7}' })).status, 403);
  const response = await fetch(route, { method: 'POST', headers, body: '{"days":7}' });
  assert.equal(response.status, 200); const preview = await response.json();
  assert.ok(preview.protectedContexts >= 1);
  const purge = await fetch(h.base + '/statistics/retention/purge', { method: 'POST', headers,
    body: JSON.stringify({ token: preview.token, confirm: true }) });
  assert.equal(purge.status, 200); assert.equal((await purge.json()).status, 'completed');
  assert.deepEqual((await h.get('/runs')).body, before);
});

for (const [environment, expected] of [[{}, 16384], [{ OC_Codex_MAX_COMMAND_LENGTH: '4096' }, 4096],
  [{ OC_CGPT_MAX_COMMAND_LENGTH: '2000' }, 2000]]) {
  test(`statuts publics et journal de supervision en lecture seule : limite ${expected}`, async (t) => {
    const h = await setup(t, { environment });
    assert.deepEqual((await h.get('/status')).body.configuration, { maxCommandLength: expected, commandLengthUnit: 'UTF-16' });
    const run = await h.reserve('monitor');
    assert.equal((await h.get('/status')).body.configuration.maxCommandLength, expected);
    assert.equal((await h.get('/runs/monitor/status')).body.configuration.maxCommandLength, expected);
    const approval = h.approval(run, 'monitor-request');
    approval.summary = 'PRIVATE-MONITOR-SENTINEL';
    h.native.messages[run.sessionId].at(-1).parts[0].state.input.summary = approval.summary;
    const pending = await h.post('/validation/request', { approval });
    assert.equal(pending.status, 202, JSON.stringify(pending));
    const before = (await h.get('/runs')).body;
    const observed = await h.get('/monitor/events');
    assert.equal(observed.status, 200);
    assert.ok(observed.body.events.some((event) => event.requestId === 'monitor-request' && event.runId === 'monitor'));
    assert.ok(!JSON.stringify(observed.body).includes('PRIVATE-MONITOR-SENTINEL'));
    assert.deepEqual((await h.get('/runs')).body, before);
    assert.equal(h.native.replies.length, 0);
    const abort = new AbortController();
    const stream = await fetch(h.base + '/monitor/events', { headers: { accept: 'text/event-stream' }, signal: abort.signal });
    const reader = stream.body.getReader();
    assert.match(new TextDecoder().decode((await reader.read()).value), /event: snapshot/);
    abort.abort(); await reader.cancel().catch(() => {});
  });
}

test('le chemin historique accepte une étape et la conserve après redémarrage', async (t) => {
  const h = await setup(t);
  assert.equal((await h.post('/job/arm', { jobId: 'legacy-step', sessionId: 'ses_legacy_step',
    directory: h.directory, changeId: 'change-legacy', criteria: [] })).status, 201);
  const declared = await h.post('/job/progress', { jobId: 'legacy-step', stepId: 'ARCHIVING', expectedStepSequence: 0 });
  assert.equal(declared.status, 202);
  assert.equal(declared.body.terminalGate.status, 'OPEN');
  await h.stop(); await h.start();
  assert.deepEqual((await h.get('/job')).body.lifecycle, declared.body.lifecycle);
  assert.equal(h.native.replies.length, 0);
});

test('cycle par RUN : retour 8→6, idempotence, restauration et nouveau job', async (t) => {
  const h = await setup(t); await h.reserve('steps'); await h.reserve('peer');
  const progress = (stepId, expectedStepSequence, extra = {}) => h.post('/runs/steps/job/progress',
    { jobId: 'job-steps', stepId, expectedStepSequence, ...extra });
  assert.equal((await h.get('/runs/steps/job')).body.lifecycle, null);
  assert.equal((await progress('REVIEW', 0)).status, 202);
  const implementation = await progress('IMPLEMENTATION', 1);
  assert.equal(implementation.status, 202);
  const lifecycle = implementation.body.lifecycle;
  assert.deepEqual(lifecycle.history.map((entry) => entry.id), ['REVIEW', 'IMPLEMENTATION']);
  assert.deepEqual((await progress('IMPLEMENTATION', 1)).body.lifecycle, lifecycle);
  assert.equal((await progress('CLOSURE', 1)).status, 400);
  assert.equal((await progress('UNKNOWN', 2)).status, 400);
  assert.equal((await progress('CLOSURE', 2, { stepStatus: 'DONE' })).status, 400);
  const a = (await h.get('/runs/steps/status')).body;
  assert.equal(a.coordination.phase, 'WORK'); assert.equal(a.terminalGate.status, 'OPEN');
  assert.equal((await h.get('/runs/peer/job')).body.lifecycle, null);
  assert.equal(h.native.replies.length, 0);
  assert.ok((await h.get('/monitor/events')).body.events.some((event) => event.runId === 'steps' && event.stepId === 'IMPLEMENTATION'));
  await h.stop(); await h.start();
  assert.deepEqual((await h.get('/runs/steps/job')).body.lifecycle, lifecycle);
  await h.post('/broker/readiness', { status: 'READY', pending_count: 0 });
  assert.equal((await h.post('/runs/steps/job/arm', { jobId: 'job-steps', sessionId: 'ses_steps', directory: h.directory,
    changeId: 'change-steps', criteria: ['delivery', 'statistics'] })).status, 201);
  assert.deepEqual((await h.get('/runs/steps/job')).body.lifecycle, lifecycle);
  assert.equal((await progress('CLOSURE', 2)).body.terminalGate.status, 'OPEN');
  assert.equal((await h.post('/runs/steps/job/terminal-gate', { state: 'TERMINÉ' })).status, 201);
  assert.equal((await progress('IMPLEMENTATION', 3)).status, 400);
  assert.equal((await h.post('/runs/steps/job/disarm', { jobId: 'job-steps' })).status, 202);
  assert.equal((await h.post('/runs/steps/job/arm', { jobId: 'new-job', sessionId: 'ses_steps', directory: h.directory,
    changeId: 'change-steps', criteria: [] })).body.lifecycle, null);
});

test('deux déclarations concurrentes ne perdent aucun passage et une persistance échouée ne publie pas l’étape', async (t) => {
  const h = await setup(t); const run = await h.reserve('steps');
  const progress = (stepId, expectedStepSequence) => h.post('/runs/steps/job/progress',
    { jobId: 'job-steps', stepId, expectedStepSequence });
  const results = await Promise.all([progress('REVIEW', 0), progress('IMPLEMENTATION', 0)]);
  assert.equal(results.filter((result) => result.status === 202).length, 1);
  assert.ok(results.some((result) => [400, 409].includes(result.status)));
  const before = (await h.get('/runs/steps/job')).body.lifecycle;
  assert.equal(before.sequence, 1);
  const target = before.history[0].id === 'REVIEW' ? 'IMPLEMENTATION' : 'REVIEW';
  const temporary = join(h.directory, '.opencode', 'state', 'cgpt-approval-bridge', 'runs', 'steps',
    String(run.contextId || run.version), 'controller-job.json.tmp');
  mkdirSync(temporary);
  assert.equal((await progress(target, 1)).status, 400);
  assert.deepEqual((await h.get('/runs/steps/job')).body.lifecycle, before);
  assert.equal((await h.get('/monitor/events')).body.events.filter((event) => event.type === 'lifecycle-step-changed').length, 1);
  rmSync(temporary, { recursive: true });
  assert.equal((await progress(target, 1)).body.lifecycle.sequence, 2);
});

test('publication ciblée HTTP : reçu après reprise, génération, gate et pair indépendant', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); const b = await h.reserve('b');
  const { approval, access } = await h.approvedAccess(a, 'published-a');
  await h.execute(approval); await h.completeTool(approval); h.native.busy.ses_b = { type: 'busy' };
  const payload = { version: a.version, operationId: access.accessId, token: access.token, fencing: access.fencing,
    transactionId: 'publication-a', outcome: 'COMPLETED', proofRevisions: approval.expected_revisions,
    reportFile: 'openspec/changes/archive/2026-10-16-change-a/STATISTIQUES.md', evidence: ['validation and archive reviewed'] };
  const result = await h.post('/runs/a/publish', payload); assert.equal(result.status, 200, JSON.stringify(result));
  assert.ok((await h.get('/monitor/events')).body.events.some((event) =>
    event.operationId === approval.operation_id && event.operationState === 'COMPLETED'));
  assert.equal((await h.get('/runs/b/status')).body.coordination.reason, null);
  assert.equal((await h.get('/runs')).body.runs.find((r) => r.runId === 'b').version, b.version);
  assert.equal((await h.get('/runs/a/status')).body.terminalGate.status, 'OPEN');
  assert.equal((await h.post('/validation/request', { approval: h.approval(a, 'old-version') })).body.error, 'reservation-version-stale');
  await h.stop(); await h.start();
  assert.deepEqual((await h.post('/runs/a/publish', payload)).body, result.body);
  assert.equal((await h.post('/runs/a/publish', { ...payload, evidence: ['different'] })).body.error, 'publication-transaction-divergent');
});

test('le contrôle global exceptionnel regroupe les lectures natives de la cohorte', async (t) => {
  // La mesure vise la requête de cohorte, sans le polling périodique des permissions.
  const h = await setup(t, { reconnectMs: 10000 });
  await waitFor(() => h.native.requests.includes('/session/status'));
  for (const id of ['a', 'b', 'c']) await h.reserve(id);
  const g = await h.post('/coordination/global/request', { cause: 'SHARED_MAINTENANCE', scope: 'all',
    transactionId: 'maintenance', authorization: 'explicit developer maintenance', evidence: ['authorized'] });
  assert.equal(g.status, 202); h.native.requests.length = 0;
  const confirmed = await h.post('/coordination/global/confirm', { ...g.body, evidence: ['native quiescence'] });
  assert.equal(confirmed.status, 200, JSON.stringify(confirmed));
  assert.equal(h.native.requests.filter((p) => p === '/session/status').length, 1);
  assert.equal(h.native.requests.filter((p) => p === '/permission').length, 1);
});

test('les attentes de ressources exposent le pair courant sans contenu natif sensible', async (t) => {
  const h = await setup(t); const resources = [{ key: 'file:common', mode: 'write' }];
  const a = await h.reserve('a', { resources, exclusiveResources: [] });
  const b = await h.reserve('b', { resources, exclusiveResources: [] });
  await h.approvedAccess(a, 'holder');
  const approval = h.approval(b, 'waiting');
  await h.post('/validation/request', { approval }); await h.post('/runs/b/decision/waiting', { decision: 'approved' });
  const waiting = await h.post('/runs/b/locks/acquire', { version: b.version, operationId: approval.operation_id,
    operationDigest: approval.operation_digest, resources, expectedRevisions: approval.expected_revisions });
  assert.equal(waiting.status, 202); assert.equal(waiting.body.token, undefined);
  const status = (await h.get('/runs/b/status')).body;
  assert.equal(status.coordination.blockers[0].runId, 'a');
  assert.equal(status.coordination.reason, 'resource-conflict'); assert.equal(h.native.replies.length, 0);
});

test('une cohorte occupée, invalide ou divergente refuse le gel exceptionnel', async (t) => {
  const h = await setup(t); await h.reserve('a'); await h.reserve('b');
  const g = (await h.post('/coordination/global/request', { cause: 'GLOBAL_PAUSE', scope: 'all',
    transactionId: 'pause', authorization: 'explicit pause all', evidence: ['authorized'] })).body;
  const confirm = () => h.post('/coordination/global/confirm', { ...g, evidence: ['quiescent'] });
  h.native.busy.ses_b = { type: 'busy' }; assert.equal((await confirm()).body.error, 'native-session-not-quiescent');
  h.native.busy = { ses_b: { type: 'invalid' } };
  assert.ok(['native-reconciliation-invalid', 'opencode-session-status-invalid'].includes((await confirm()).body.error));
  h.native.busy = {}; h.native.sessions.ses_b = { directory: '/different' };
  assert.equal((await confirm()).body.error, 'native-session-divergent');
  assert.equal((await h.get('/coordination/global')).body.global.state, 'DRAINING');
});

test('un événement SSE pendant le contrôle exceptionnel impose une observation neuve', async (t) => {
  const h = await setup(t); await h.reserve('a');
  const g = (await h.post('/coordination/global/request', { cause: 'GLOBAL_PAUSE', scope: 'all',
    transactionId: 'pause', authorization: 'explicit pause all', evidence: ['authorized'] })).body;
  let fired = false; h.native.onRequest = async (path) => {
    if (path !== '/session/status' || fired) return; fired = true;
    h.native.emit({ type: 'session.status', properties: { sessionID: 'ses_a', status: { type: 'idle' } } }); await delay(50);
  };
  assert.equal((await h.post('/coordination/global/confirm', { ...g, evidence: ['quiescence'] })).body.error, 'native-observation-changed');
  h.native.onRequest = null;
  assert.equal((await h.post('/coordination/global/confirm', { ...g, evidence: ['quiescence'] })).status, 200);
});

test('une mutation pendant observation exceptionnelle refuse une cohorte périmée', async (t) => {
  const h = await setup(t); await h.reserve('a'); const b = await h.reserve('b');
  const g = (await h.post('/coordination/global/request', { cause: 'SHARED_MAINTENANCE', scope: 'all',
    transactionId: 'maintenance', authorization: 'authorized maintenance', evidence: ['authorized'] })).body;
  let fired = false; h.native.onRequest = async (path) => {
    if (path !== '/session/status' || fired) return; fired = true;
    await h.post('/runs/b/suspend', { version: b.version, action: 'PAUSE', evidence: ['targeted pause'],
      maintenanceTransactionId: g.transactionId, maintenanceGeneration: g.generation });
  };
  assert.equal((await h.post('/coordination/global/confirm', { ...g, evidence: ['quiescence'] })).body.error, 'native-observation-changed');
  assert.equal((await h.get('/coordination/global')).body.global.state, 'DRAINING');
});

test('une pause sous gel global est liée à SHARED_MAINTENANCE et à sa génération', async (t) => {
  const h = await setup(t); const a = await h.reserve('a');
  const g = (await h.post('/coordination/global/request', { cause: 'SHARED_MAINTENANCE', scope: 'all',
    transactionId: 'maintenance-bound-pause', authorization: 'authorized maintenance', evidence: ['authorized'] })).body;
  assert.equal((await h.post('/runs/a/suspend', { version: a.version, action: 'PAUSE', evidence: ['pause'] })).body.error,
    'global-coordination-suspended');
  assert.equal((await h.post('/runs/a/suspend', { version: a.version, action: 'PAUSE', evidence: ['pause'],
    maintenanceTransactionId: 'other', maintenanceGeneration: g.generation })).body.error, 'global-coordination-suspended');
  const paused = await h.post('/runs/a/suspend', { version: a.version, action: 'PAUSE', evidence: ['pause'],
    maintenanceTransactionId: g.transactionId, maintenanceGeneration: g.generation });
  assert.equal(paused.status, 200); assert.equal(paused.body.suspension.action, 'PAUSE');
  assert.equal((await h.get('/coordination/global')).body.global.state, 'DRAINING');
});

test('une progression tardive conserve les effets non résolus pendant le drainage global', async (t) => {
  const h = await setup(t); await h.reserve('a'); await h.reserve('b');
  const g = (await h.post('/coordination/global/request', { cause: 'GLOBAL_STOP', scope: 'all',
    transactionId: 'stop', authorization: 'explicit global stop', evidence: ['authorized'] })).body;
  let fired = false; h.native.onRequest = async (path) => {
    if (path !== '/session/status' || fired) return; fired = true;
    await h.post('/runs/b/job/progress', { jobId: 'job-b', currentCabMandate: 'late-effect' });
  };
  assert.equal((await h.post('/coordination/global/confirm', { ...g, evidence: ['quiescence'] })).body.error, 'run-not-quiescent');
});

test('deux publications simultanées produisent un seul reçu sans nouvelle permission', async (t) => {
  const h = await setup(t); const a = await h.reserve('a');
  const { approval, access } = await h.approvedAccess(a, 'simultaneous'); await h.execute(approval); await h.completeTool(approval);
  const payload = { version: a.version, operationId: access.accessId, token: access.token, fencing: access.fencing,
    transactionId: 'once-publish', outcome: 'COMPLETED', proofRevisions: approval.expected_revisions, evidence: ['reviewed'] };
  const replies = await Promise.all([h.post('/runs/a/publish', payload), h.post('/runs/a/publish', payload)]);
  assert.ok(replies.some((r) => r.status === 200)); assert.ok(replies.every((r) => [200, 409].includes(r.status)));
  assert.equal((await h.post('/runs/a/publish', payload)).body.referenceVersion, 1);
  assert.equal(Object.keys((await h.get('/runs')).body.coordination.publications).length, 1);
  assert.equal(h.native.replies.length, 1);
});

test('une fin native inconnue garde les protections et interdit le gate', async (t) => {
  const h = await setup(t); const a = await h.reserve('a');
  const { approval, access } = await h.approvedAccess(a, 'unknown'); await h.execute(approval);
  const refused = await h.releaseOperation(a, approval, access);
  assert.equal(refused.body.error, 'native-completion-not-proved');
  assert.equal((await h.post('/runs/a/job/terminal-gate', { state: 'TERMINÉ' })).body.error, 'run-accesses-unresolved');
  assert.equal((await h.get('/runs/a/locks')).body.accesses[0].state, 'EXECUTING');
  await h.completeTool(approval); assert.equal((await h.releaseOperation(a, approval, access)).status, 200);
});

test('sélection simultanée : un seul propriétaire du change et aucun écrasement', async (t) => {
  const h = await setup(t);
  const results = await Promise.all(['a', 'b'].map((id) => h.post('/runs/reserve',
    { ...h.candidate(id), changeId: 'same-change', selectionKey: 'same-requirement' })));
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal((await h.get('/runs')).body.runs.length, 1);
});

test('trois sessions, permissions once exactes et décisions isolées', async (t) => {
  const h = await setup(t);
  const runs = [];
  for (const id of ['a', 'b', 'c']) runs.push(await h.reserve(id));
  const approvals = runs.map((run) => h.approval(run, 'request-' + run.runId));
  for (const a of approvals) assert.equal((await h.post('/validation/request', { approval: a })).status, 202);
  assert.equal((await h.post('/runs/b/decision/request-a', { decision: 'approved' })).status, 409);
  h.native.permissions = runs.map((run) => ({ id: 'permission-' + run.runId, sessionID: run.sessionId,
    permission: 'bash', metadata: { command: '/usr/bin/true' } }));
  for (const a of approvals) assert.equal((await h.post('/runs/' + a.run_id + '/decision/' + a.requestId,
    { decision: 'approved' })).status, 201);
  await waitFor(() => h.native.replies.length === 3);
  assert.deepEqual(h.native.replies.map((p) => p.path).sort(), runs.map((run) =>
    '/session/' + run.sessionId + '/permissions/permission-' + run.runId).sort());
  assert.ok(h.native.replies.every((p) => p.body.response === 'once'));
  const decision = (await h.get('/runs/a/decision/request-a')).body;
  assert.equal(decision.run_id, 'a'); assert.equal(decision.reservation_version, runs[0].version);
  assert.equal((await h.post('/job/progress', { jobId: 'job-a' })).status, 409);
});

test('un RUN arrêté puis abandonné reprend après redémarrage sans permission héritée', async (t) => {
  const h = await setup(t); const a = await h.reserve('resume', {
    resources: [{ key: 'file:src/resume.py', mode: 'read' }] });
  assert.equal((await h.post('/runs/resume/job/terminal-gate', { state: 'BLOQUÉ',
    reason: 'explicit documentary prerequisite' })).status, 201);
  assert.equal((await h.post('/runs/resume/job/disarm', { jobId: 'job-resume' })).status, 202);
  assert.equal((await h.post('/runs/resume/suspend', { version: a.version, action: 'STOP',
    evidence: ['targeted stop after gate'] })).status, 200);
  const released = await h.post('/runs/resume/release', { version: a.version, delivered: false,
    evidence: ['no pending effects; prerequisite requires decision'] });
  assert.equal(released.status, 200); assert.equal(released.body.state, 'ABANDONED');
  await h.stop(); await h.start();
  const next = await h.post('/runs/reserve', { ...h.candidate('resume'),
    resources: a.resources, exclusiveResources: [] });
  assert.equal(next.status, 201, JSON.stringify(next));
  assert.ok(next.body.version > released.body.version); assert.notEqual(next.body.contextId, a.contextId);
  assert.equal(next.body.suspension, undefined);
  assert.equal((await h.post('/runs/resume/job/arm', { jobId: 'job-resume-new', sessionId: a.sessionId,
    directory: h.directory, changeId: a.changeId, strictCommands: true, criteria: ['resumed delivery'] })).status, 201);
  const job = (await h.get('/runs/resume/job')).body;
  assert.equal(job.jobId, 'job-resume-new'); assert.equal(job.terminalGate.status, 'OPEN');
  const snapshot = (await h.get('/runs')).body;
  assert.ok(snapshot.history.some((run) => run.runId === a.runId && run.contextId === a.contextId &&
    run.state === 'ABANDONED' && run.suspension.action === 'STOP'));
  assert.deepEqual(h.native.replies, []);
  assert.equal(Object.keys(snapshot.coordination.operations).length, 0);
});

test('une session allow est refusée sans bloquer la permission once d’un autre RUN', async (t) => {
  const h = await setup(t);
  const a = await h.reserve('a');
  const b = await h.reserve('b');
  h.native.rules.ses_a = [{ permission: 'bash', pattern: '*', action: 'allow' }];
  const refused = await h.post('/validation/request', { approval: h.approval(a, 'unsafe-a') });
  assert.equal(refused.body.error, 'native-permission-ask-required');
  assert.equal((await h.post('/validation/request', { approval: h.approval(b, 'safe-b') })).status, 202);
  h.native.permissions = [{ id: 'safe-b-permission', sessionID: 'ses_b', permission: 'bash',
    metadata: { command: '/usr/bin/true' } }];
  assert.equal((await h.post('/runs/b/decision/safe-b', { decision: 'approved' })).status, 201);
  await waitFor(() => h.native.replies.length === 1);
  assert.equal(h.native.replies[0].path, '/session/ses_b/permissions/safe-b-permission');
  assert.deepEqual(h.native.replies[0].body, { response: 'once' });
  assert.equal((await h.get('/runs/a/job')).body.sessionId, 'ses_a');
});

test('admission ask refusée puis corrigée : aucun propriétaire ou opération orphelin', async (t) => {
  const h = await setup(t); const a = await h.reserve('a');
  const approval = h.approval(a, 'ask-drift');
  let reads = 0;
  h.native.onRequest = async (path) => {
    if (path === '/session/ses_a' && ++reads === 2) {
      h.native.rules.ses_a = [{ permission: 'bash', pattern: '*', action: 'allow' }];
    }
  };
  const before = (await h.get('/runs')).body;
  assert.equal((await h.post('/validation/resource-request', { approval })).body.error, 'native-permission-ask-required');
  const refused = (await h.get('/runs')).body;
  assert.deepEqual(refused.requestOwners, before.requestOwners);
  assert.deepEqual(refused.coordination.operations, before.coordination.operations);
  assert.equal((await h.get('/runs/a/status')).body.undecidedValidationCount, 0);
  h.native.onRequest = null; h.native.rules.ses_a = [{ permission: '*', pattern: '*', action: 'ask' }];
  assert.equal((await h.post('/validation/resource-request', { approval })).status, 202);
  assert.equal((await h.post('/runs/a/decision/ask-drift', { decision: 'rejected' })).status, 201);
  assert.deepEqual(h.native.replies, []);
});

test('adoption maintenance : corps client et transaction inconnue ne produisent pas HELD',async(t)=>{
  const h=await setup(t);await h.reserve('a');const before=(await h.get('/runs')).body;
  assert.equal((await h.post('/coordination/maintenance/adopt',{transactionId:'../../outside',sealDigest:'0'.repeat(64)})).status,409);
  assert.equal((await h.post('/coordination/maintenance/adopt',{transactionId:'maintenance-00000000-0000-0000-0000-000000000000',sealDigest:'0'.repeat(64),path:'/outside'})).status,400);
  assert.deepEqual((await h.get('/runs')).body,before);assert.deepEqual(h.native.replies,[]);
});

async function orphanedPreflight(t, mutate = () => {}) {
  const h = await setup(t); const a = await h.reserve('a'); const b = await h.reserve('b');
  const recovery = { jobId: 'job-a', expectedSessionId: 'ses_a', sessionId: 'ses_a_new',
    recoveryId: 'recovery-orphan', preflightRequestId: 'preflight-orphan' };
  assert.equal((await h.post('/runs/a/job/recover', { ...recovery, phase: 'prepare' })).status, 200);
  const approval = h.approval({ ...a, sessionId: recovery.sessionId }, recovery.preflightRequestId);
  h.native.messages.ses_a_new[0].parts[0].state = { status: 'completed', input: structuredClone(approval),
    output: JSON.stringify({ ...approval, status: 'PENDING', notification_status: 'FAILED' }) };
  await h.stop();
  // Reproduire l'état durable produit par l'ancienne admission, uniquement dans la fixture arrêtée.
  const registry = new ResourceRunRegistry(h.directory, join(h.directory, '.opencode/state/cgpt-approval-bridge'));
  await registry.acquireAuthority();
  try {
    registry.prepareOperation(a.runId, approval, { candidateSession: recovery.sessionId });
    const keys = ['run_id','reservation_version','requestId','approval_id','change_id','session_id','directory',
      'title','summary','files','commands','resources','coordination_protocol','operation_id','operation_digest','expected_revisions','access_id'];
    const identity = Object.fromEntries(keys.map((key) => [key, approval[key] ??
      (['resources','commands'].includes(key) ? [] : key === 'summary' ? '' : null)]));
    registry.claimRequest('a', approval.requestId, createHash('sha256').update(JSON.stringify(identity)).digest('hex'), false);
    mutate(registry, approval); registry.persist();
  } finally {
    const ended = new Promise((resolve) => registry.lock.once('exit', resolve)); registry.close(); await ended;
  }
  await h.start();
  await h.post('/broker/readiness', { status: 'BLOCKED', pending_count: 1 });
  const payload = { transactionId: 'reconcile-orphan', developerAuthorization: 'accord-humain-fixture-source-runtime-distinct',
    jobId: recovery.jobId, recoveryId: recovery.recoveryId, approval };
  return { h, a, b, approval, recovery, payload };
}

async function pausedOrphan(t, timeout = false) {
  const h=await setup(t),a=await h.reserve('a');
  const approval=h.approval(a,'paused-write');approval.commands=['printf operation-non-executee'];
  const part=h.native.messages.ses_a.at(-1).parts[0];
  part.state={status:timeout?'error':'completed',input:structuredClone(approval),
    ...(timeout?{error:'MCP error -32001: request timed out'}:{output:JSON.stringify({...approval,status:'PENDING'})})};
  if(timeout)h.native.messages.ses_a.push({parts:[{type:'tool',tool:'cgpt-validation_get_approval',state:{status:'completed',input:{approval_id:approval.approval_id},output:JSON.stringify({...approval,status:'PENDING'})}}]});
  await h.post('/runs/a/suspend',{version:a.version,action:'PAUSE',evidence:['human maintenance pause']});
  await h.post('/runs/a/job/progress',{jobId:'job-a',currentCabMandate:approval.requestId});
  return {h,a,approval,payload:{transactionId:'paused-repair',developerAuthorization:'human maintenance authorization',jobId:'job-a',recoveryId:null,approval}};
}

for(const timeout of [false,true])test(`demande orpheline en pause : admission absente et rejet seul, timeout=${timeout}`,async(t)=>{
  const {h,approval,payload}=await pausedOrphan(t,timeout);
  if(timeout)h.native.rules.ses_a=[{permission:'*',pattern:'*',action:'deny'}];
  const before=(await h.get('/runs')).body;
  assert.equal(before.requestOwners[approval.requestId],undefined);
  const receipt=await h.post('/runs/a/validation/reconcile',payload);
  assert.equal(receipt.status,201,JSON.stringify(receipt));assert.equal(receipt.body.recoveryId,null);
  assert.deepEqual((await h.post('/runs/a/validation/reconcile',payload)).body,receipt.body);
  for(const decision of ['approved','needs_clarification'])assert.equal((await h.post('/runs/a/decision/'+approval.requestId,{decision})).status,400);
  const after=(await h.get('/runs')).body;
  assert.equal(after.requestOwners[approval.requestId].reconciliation.outcome,'REJECTION_ONLY');
  const restored=new ResourceRunRegistry(h.directory,join(h.directory,'.opencode/state/cgpt-approval-bridge'));
  assert.equal(restored.resourceState.operations[approval.operation_id].rejectionOnly,true);
  assert.equal((await h.post('/runs/a/decision/'+approval.requestId,{decision:'rejected'})).status,201);
  assert.deepEqual(h.native.replies,[]);
});

for(const variant of ['no-pause','busy','permission','allow','effect','poll-identity','timeout-no-poll','duplicate','history-drift','job','mandate','approval-divergent','stale-version','poll-status'])test(`demande orpheline en pause : refuse ${variant} sans admission partielle`,async(t)=>{
  const {h,a,approval,payload}=await pausedOrphan(t,true);
  if(variant==='no-pause')await h.post('/runs/a/suspend',{version:a.version,action:'RESUME',evidence:['isolated test']});
  if(variant==='busy')h.native.busy.ses_a={type:'busy'};
  if(variant==='permission')h.native.permissions=[{id:'permission-a',sessionID:'ses_a',permission:'bash',patterns:['*']}];
  if(variant==='allow')h.native.rules.ses_a=[{permission:'*',pattern:'*',action:'allow'}];
  if(variant==='effect')h.native.messages.ses_a.push({parts:[{type:'tool',tool:'bash',state:{status:'completed',input:{command:'printf danger'},output:''}}]});
  if(variant==='poll-identity')h.native.messages.ses_a.at(-1).parts[0].state.input.approval_id='approval-other';
  if(variant==='timeout-no-poll')h.native.messages.ses_a.pop();
  if(variant==='duplicate')h.native.messages.ses_a.push(structuredClone(h.native.messages.ses_a[0]));
  if(variant==='job')payload.jobId='other-job';
  if(variant==='mandate')await h.post('/runs/a/job/progress',{jobId:'job-a',currentCabMandate:'other-request'});
  if(variant==='approval-divergent')payload.approval={...approval,commands:['other command']};
  if(variant==='stale-version'){
    approval.reservation_version++;
    h.native.messages.ses_a[0].parts[0].state.input=structuredClone(approval);
    h.native.messages.ses_a.at(-1).parts[0].state.output=JSON.stringify({...approval,status:'PENDING'});
  }
  if(variant==='poll-status')h.native.messages.ses_a.at(-1).parts[0].state.output=JSON.stringify({...approval,status:'APPROVED'});
  if(variant==='history-drift'){
    let reads=0;h.native.onRequest=(path)=>{if(path==='/session/ses_a/message'&&++reads===2)h.native.messages.ses_a.push({parts:[{type:'tool',tool:'bash',state:{status:'completed'}}]});};
  }
  const before=(await h.get('/runs')).body;
  const rejected=await h.post('/runs/a/validation/reconcile',payload);
  assert.ok(rejected.status>=400,JSON.stringify(rejected));
  assert.deepEqual((await h.get('/runs')).body,before);assert.deepEqual(h.native.replies,[]);
});

test('prévol orphelin : rejet seul durable, notifications répétées, pair actif puis retry existant', async (t) => {
  const { h, b, approval, recovery, payload } = await orphanedPreflight(t);
  const before = (await h.get('/runs')).body;
  assert.equal((await h.post('/validation/resource-request', { approval })).body.error, 'request-reconciliation-required');
  h.native.busy.ses_b = { type: 'busy' };
  const receipt = await h.post('/runs/a/validation/reconcile', payload);
  assert.equal(receipt.status, 201, JSON.stringify(receipt));
  assert.equal(receipt.body.outcome, 'REJECTION_ONLY');
  assert.equal((await h.get('/runs/a/decision/' + approval.requestId)).status, 404);
  assert.deepEqual((await h.post('/runs/a/validation/reconcile', payload)).body, receipt.body);
  assert.equal((await h.post('/runs/a/validation/reconcile', { ...payload, developerAuthorization: 'autre-accord' })).status, 409);
  for (const route of ['/validation/resource-request', '/validation/resource-reminder']) {
    assert.equal((await h.post(route, { approval })).status, 202);
  }
  for (const decision of ['approved', 'needs_clarification']) {
    assert.equal((await h.post('/runs/a/decision/' + approval.requestId, { decision })).status, 400);
  }
  assert.equal((await h.post('/runs/a/locks/acquire', { version: approval.reservation_version,
    operationId: approval.operation_id, operationDigest: approval.operation_digest, resources: approval.resources,
    expectedRevisions: approval.expected_revisions })).status, 409);
  assert.deepEqual(h.native.replies, []);
  const after = (await h.get('/runs')).body;
  assert.deepEqual(after.runs.find((r) => r.runId === 'b'), before.runs.find((r) => r.runId === 'b'));
  assert.deepEqual(after.coordination.accesses, before.coordination.accesses);
  const restored = new ResourceRunRegistry(h.directory, join(h.directory, '.opencode/state/cgpt-approval-bridge'));
  assert.deepEqual(restored.requestOwners[approval.requestId].reconciliation, receipt.body);
  assert.equal(restored.resourceState.operations[approval.operation_id].rejectionOnly, true);
  assert.equal((await h.post('/runs/a/decision/' + approval.requestId, { decision: 'rejected' })).status, 201);
  const decision = (await h.get('/runs/a/decision/' + approval.requestId)).body;
  assert.equal(decision.approval_id, approval.approval_id); assert.equal(decision.decision, 'rejected');
  h.native.messages.ses_a_new.push({ parts: [{ type: 'tool', tool: 'cgpt-validation_poll_approval',
    state: { status: 'completed', input: { approval_id: approval.approval_id },
      output: JSON.stringify({ ...approval, status: 'REJECTED' }) } }] });
  await h.post('/broker/readiness', { status: 'READY', pending_count: 0 });
  const retry = await h.post('/runs/a/job/recover', { ...recovery, phase: 'retry',
    previousPreflightRequestId: approval.requestId, preflightRequestId: 'preflight-orphan-next' });
  assert.equal(retry.status, 200, JSON.stringify(retry));
  assert.equal(retry.body.jobId, recovery.jobId);
  assert.equal(retry.body.recovery.sessionId, recovery.sessionId);
  assert.equal(retry.body.recovery.recoveryId, recovery.recoveryId);
  assert.equal(retry.body.recovery.preflightRequestId, 'preflight-orphan-next');
  assert.deepEqual(h.native.replies, []);
  assert.equal((await h.get('/runs/b/job')).body.sessionId, b.sessionId);
});

test('réconciliation orpheline : autorisation, identités et preuves divergentes sont refusées sans mutation', async (t) => {
  const { h, approval, payload } = await orphanedPreflight(t);
  const before = (await h.get('/runs')).body;
  const bad = [
    { ...payload, developerAuthorization: '' }, { ...payload, jobId: 'job-autre' },
    { ...payload, recoveryId: 'recovery-autre' },
    ...[{ requestId: 'preflight-autre' }, { approval_id: 'autre' }, { session_id: 'ses_other' },
      { reservation_version: approval.reservation_version + 1 }, { operation_digest: '0'.repeat(64) },
      { commands: ['true'] }, { title: 'autre' }, { summary: 'autre' },
      { resources: approval.resources.map((r) => ({ ...r, mode: 'write' })) },
      { expected_revisions: Object.fromEntries(approval.resources.map((r) => [r.key, 1])) }]
      .map((change) => ({ ...payload, approval: { ...approval, ...change } })),
  ];
  for (const candidate of bad) {
    const response = await h.post('/runs/a/validation/reconcile', candidate);
    assert.ok(response.status >= 400, JSON.stringify(candidate));
    assert.deepEqual((await h.get('/runs')).body, before);
  }
  for (const status of ['APPROVED', 'REJECTED', 'CANCELLED']) {
    h.native.messages.ses_a_new[0].parts[0].state.output = JSON.stringify({ ...approval, status });
    assert.equal((await h.post('/runs/a/validation/reconcile', payload)).status, 409);
  }
  assert.deepEqual(h.native.replies, []);
});

test('réconciliation orpheline : effet natif, permission et candidate allow maintiennent le gel', async (t) => {
  const { h, payload } = await orphanedPreflight(t);
  const before = (await h.get('/runs')).body;
  h.native.permissions = [{ id: 'pending', sessionID: 'ses_a_new', permission: 'bash' }];
  assert.equal((await h.post('/runs/a/validation/reconcile', payload)).status, 409);
  h.native.permissions = []; h.native.rules.ses_a_new = [{ permission: 'bash', pattern: '*', action: 'allow' }];
  assert.equal((await h.post('/runs/a/validation/reconcile', payload)).status, 409);
  h.native.rules.ses_a_new = [{ permission: '*', pattern: '*', action: 'ask' }];
  h.native.messages.ses_a_new.push({ parts: [{ type: 'tool', tool: 'bash',
    state: { status: 'completed', input: { command: '/usr/bin/true' }, metadata: { exit: 0 } } }] });
  assert.equal((await h.post('/runs/a/validation/reconcile', payload)).status, 409);
  assert.deepEqual((await h.get('/runs')).body, before);
  assert.deepEqual(h.native.replies, []);
});

test('réconciliation orpheline : opération durable commencée ou incertaine refusée', async (t) => {
  for (const state of ['ISSUING', 'EXECUTING', 'UNKNOWN', 'COMPLETED']) await t.test(state, async (subtest) => {
    const { h, payload } = await orphanedPreflight(subtest, (registry, approval) => {
      registry.resourceState.operations[approval.operation_id].state = state;
    });
    const before = (await h.get('/runs')).body;
    assert.equal((await h.post('/runs/a/validation/reconcile', payload)).status, 409);
    assert.deepEqual((await h.get('/runs')).body, before);
    assert.deepEqual(h.native.replies, []);
  });
});

test('réconciliation orpheline : propriétaire ou opération absent/divergent ne se reconstruit pas', async (t) => {
  for (const kind of ['owner-absent', 'owner-digest', 'operation-absent', 'operation-digest']) await t.test(kind, async (subtest) => {
    const { h, payload } = await orphanedPreflight(subtest, (registry, approval) => {
      if (kind === 'owner-absent') delete registry.requestOwners[approval.requestId];
      if (kind === 'owner-digest') registry.requestOwners[approval.requestId].digest = '0'.repeat(64);
      if (kind === 'operation-absent') delete registry.resourceState.operations[approval.operation_id];
      if (kind === 'operation-digest') registry.resourceState.operations[approval.operation_id].identityDigest = '0'.repeat(64);
    });
    const before = (await h.get('/runs')).body;
    assert.equal((await h.post('/runs/a/validation/reconcile', payload)).status, 409);
    assert.deepEqual((await h.get('/runs')).body, before);
  });
});

test('réconciliation orpheline : un reçu après perte du contexte ne restaure aucune décision', async (t) => {
  const { h, payload, approval } = await orphanedPreflight(t);
  assert.equal((await h.get('/status')).body.notificationReconciliation, 'rejection-only-v1');
  const result = await h.post('/runs/a/validation/reconcile', payload); assert.equal(result.status, 201);
  await h.stop(); await h.start();
  await h.post('/broker/readiness', { status: 'BLOCKED', pending_count: 1 });
  assert.equal((await h.post('/runs/a/validation/reconcile', payload)).body.error, 'notification-reconciliation-context-lost');
  assert.equal((await h.post('/runs/a/decision/' + approval.requestId, { decision: 'approved' })).status, 400);
  assert.equal((await h.get('/runs/a/decision/' + approval.requestId)).status, 404);
  assert.deepEqual((await h.get('/runs')).body.requestOwners[approval.requestId].reconciliation, result.body);
  assert.deepEqual(h.native.replies, []);
});

test('réconciliation orpheline : historique modifié pendant les contrôles reste refusé', async (t) => {
  const { h, payload } = await orphanedPreflight(t);
  const before = (await h.get('/runs')).body;
  let reads = 0;
  h.native.onRequest = async (path) => {
    if (path === '/session/ses_a_new/message' && ++reads === 2) {
      h.native.messages.ses_a_new.push({ parts: [{ type: 'tool', tool: 'bash',
        state: { status: 'completed', input: { command: '/usr/bin/true' }, metadata: { exit: 0 } } }] });
    }
  };
  assert.equal((await h.post('/runs/a/validation/reconcile', payload)).status, 409);
  assert.deepEqual((await h.get('/runs')).body, before);
  assert.deepEqual(h.native.replies, []);
});

test('réconciliation orpheline : un accès déjà attribué interdit la réparation', async (t) => {
  const { h, payload } = await orphanedPreflight(t, (registry, approval) => {
    registry.acquireAccess('a', { version: approval.reservation_version, operationId: approval.operation_id,
      operationDigest: approval.operation_digest, resources: approval.resources,
      operationIds: [approval.operation_id], expectedRevisions: approval.expected_revisions });
  });
  const before = (await h.get('/runs')).body;
  assert.equal((await h.post('/runs/a/validation/reconcile', payload)).status, 409);
  assert.deepEqual((await h.get('/runs')).body, before);
  assert.deepEqual(h.native.replies, []);
});

test('réconciliation orpheline : une candidate détenue par un pair est refusée', async (t) => {
  const { h, payload } = await orphanedPreflight(t, (registry, approval) => {
    registry.reserve({ runId: 'c', ownerId: 'codex-c', sessionId: approval.session_id, directory: registry.directory,
      changeId: 'change-c', selectionKey: 'intent-c', dependsOn: [], resources: [{ key: 'file:src/c.py', mode: 'read' }] });
  });
  const before = (await h.get('/runs')).body;
  assert.equal((await h.post('/runs/a/validation/reconcile', payload)).body.error,
    'notification-reconciliation-session-already-owned');
  assert.deepEqual((await h.get('/runs')).body, before);
  assert.deepEqual(h.native.replies, []);
});

test('un RUN indécis ne bloque pas le gate d’un autre et sa libération reste contrôlée', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); const b = await h.reserve('b', {
    resources: [{ key: 'file:src/b.py', mode: 'read' }] });
  assert.equal((await h.post('/validation/request', { approval: h.approval(a, 'request-a') })).status, 202);
  await h.post('/broker/readiness', { status: 'BLOCKED', root_cause: 'DECISION_WAIT_WITHOUT_PROGRESS',
    pending_count: 1, by_run: { a: { pending_count: 1, stalled_count: 0 }, b: { pending_count: 0, stalled_count: 0 } } });
  assert.equal((await h.post('/runs/a/job/terminal-gate', { state: 'TERMINÉ' })).status, 409);
  assert.equal((await h.post('/runs/b/job/terminal-gate', { state: 'TERMINÉ' })).status, 201);
  assert.equal((await h.post('/runs/b/release', { version: b.version, delivered: true, evidence: ['delivery', 'archive-report'] })).status, 409);
  assert.equal((await h.post('/runs/b/job/disarm', { jobId: 'job-b' })).status, 202);
  assert.equal((await h.post('/runs/b/release', { version: b.version, delivered: true, evidence: ['delivery', 'archive-report'] })).status, 200);
  assert.equal((await h.get('/runs')).body.runs.find((r) => r.runId === 'a').state, 'RESERVED');
  const next = await h.post('/runs/reserve', { ...h.candidate('b'), changeId: 'change-next',
    selectionKey: 'requirement-next', sessionId: 'ses_next' });
  assert.equal(next.status, 201);
  assert.ok(next.body.version > b.version);
  assert.equal((await h.post('/runs/b/job/arm', { jobId: 'job-next', sessionId: 'ses_next', directory: h.directory,
    changeId: 'change-next', strictCommands: true, criteria: ['delivery'] })).status, 201);
  assert.equal((await h.get('/runs/b/job')).body.sessionId, 'ses_next');
});

test('une identité déclarée ne remplace pas le tool part natif de la session ciblée', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); const b = await h.reserve('b');
  const claimed = { ...h.approval(a, 'forged-request'), run_id: b.runId, change_id: b.changeId,
    session_id: b.sessionId, reservation_version: b.version, resources: b.resources };
  const response = await h.post('/validation/request', { approval: claimed });
  assert.equal(response.status, 409);
  assert.equal(response.body.error, 'native-validation-not-correlated');
  assert.equal(h.native.replies.length, 0);
});

test('une publication indépendante ne suspend pas le pair ni sa génération', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); const b = await h.reserve('b');
  assert.equal((await h.post('/runs/a/integration', { version: a.version, acquire: true })).body.error, 'coordination-upgrade-required');
  const { approval, access } = await h.approvedAccess(a, 'publish-independent');
  await h.execute(approval); await h.completeTool(approval);
  assert.equal((await h.post('/runs/a/publish', { version: a.version, transactionId: 'independent', operationId: access.accessId,
    token: access.token, fencing: access.fencing, outcome: 'COMPLETED', proofRevisions: approval.expected_revisions,
    evidence: ['validated'] })).status, 200);
  assert.equal((await h.get('/runs/b/status')).body.coordination.reason, null);
  assert.equal((await h.post('/validation/request', { approval: h.approval(b, 'still-current') })).status, 202);
});

test('récupération de A avec B actif : réservation conservée et génération renouvelée', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); await h.reserve('b');
  const step = await h.post('/runs/a/job/progress', { jobId: 'job-a', stepId: 'ANALYSIS', expectedStepSequence: 0 });
  assert.equal(step.status, 202);
  h.native.permissions = [{ id: 'permission-b', sessionID: 'ses_b', permission: 'bash', metadata: { command: 'unrelated' } }];
  let stamp;
  const recovery = { jobId: 'job-a', expectedSessionId: 'ses_a', sessionId: 'ses_a_new', recoveryId: 'recovery-a', preflightRequestId: 'preflight-a' };
  assert.equal((await h.post('/runs/a/job/recover', { ...recovery, phase: 'prepare' })).status, 200);
  const approval = h.approval({ ...a, sessionId: 'ses_a_new' }, 'preflight-a');
  assert.equal((await h.post('/validation/request', { approval })).status, 202);
  assert.equal((await h.post('/runs/a/decision/preflight-a', { decision: 'approved' })).status, 201);
  h.native.permissions.push({ id: 'permission-a', sessionID: 'ses_a_new', permission: 'bash', metadata: { command: '/usr/bin/true' } });
  await waitFor(() => h.native.replies.length === 1);
  stamp = Date.now() + 1;
  h.native.messages.ses_a_new = [{ parts: [
    { type: 'tool', tool: 'cgpt-validation_request_validation', state: { status: 'completed', input: approval,
      output: JSON.stringify({ ...approval, status: 'APPROVED' }), time: { start: stamp + 1, end: stamp + 2 } } },
    { type: 'tool', tool: 'bash', state: { status: 'completed', input: { command: '/usr/bin/true' },
      metadata: { exit: 0 }, time: { start: stamp + 3, end: stamp + 4 } } },
    { type: 'tool', tool: 'cgpt-validation_broker_readiness', state: { status: 'completed',
      output: JSON.stringify({ status: 'READY', pending_count: 0 }), time: { start: stamp + 5, end: stamp + 6 } } },
  ] }];
  await h.post('/broker/readiness', { status: 'READY', pending_count: 0, by_run: { a: { pending_count: 0 }, b: { pending_count: 0 } } });
  assert.equal((await h.releaseOperation(a, approval)).status, 200);
  const complete = await h.post('/runs/a/job/recover', { ...recovery, phase: 'complete' });
  assert.equal(complete.status, 200, JSON.stringify(complete));
  assert.deepEqual(complete.body.lifecycle, step.body.lifecycle);
  const run = (await h.get('/runs')).body.runs.find((r) => r.runId === 'a');
  assert.equal(run.sessionId, 'ses_a_new'); assert.ok(run.version > a.version);
  assert.equal(h.native.permissions[0].sessionID, 'ses_b');
  assert.equal((await h.post('/validation/request', { approval: h.approval(a, 'old-owner') })).status, 409);
});

test('périmètre, génération, identité native et redémarrage refusent les permissions obsolètes', async (t) => {
  const h = await setup(t); const a = await h.reserve('a');
  const wrong = { ...h.approval(a, 'wrong'), files: ['src/other.py'], commands: [], resources: [] };
  assert.equal((await h.post('/validation/request', { approval: wrong })).status, 409);
  const extended = await h.post('/runs/a/extend', { version: a.version, resources: [{ key: 'file:tests/a.py', mode: 'write' }] });
  assert.equal(extended.status, 200);
  assert.equal((await h.post('/validation/request', { approval: h.approval(a, 'old-generation') })).status, 409);
  const current = extended.body; const approval = h.approval(current, 'request-current');
  assert.equal((await h.post('/validation/request', { approval })).status, 202);
  await h.stop(); await h.start();
  assert.equal((await h.get('/runs')).body.runs[0].version, current.version);
  assert.equal((await h.post('/validation/request', { approval })).status, 409);
  assert.equal(h.native.replies.length, 0);
});

test('un broker MCP réel transporte trois validations parallèles sans confondre les permissions', { timeout: 15000 }, async (t) => {
  const h = await setup(t);
  const runs = [];
  for (const id of ['a', 'b', 'c']) runs.push(await h.reserve(id));
  const source = fileURLToPath(new URL('../src/cgpt_approval_bridge_server.py', import.meta.url));
  const broker = spawn('python3', [source], { stdio: ['pipe', 'pipe', 'pipe'], env: {
    PATH: process.env.PATH, PYTHONUNBUFFERED: '1', CGPT_CONTROLLER_URL: h.base,
    CGPT_APPROVAL_STORE: join(h.directory, 'broker-approvals.json'),
    CGPT_APPROVAL_JOURNAL: join(h.directory, 'broker-events.ndjson'),
    CGPT_JOURNAL_CHECKPOINT_PATH: join(h.directory, 'broker-checkpoint.json'),
    CGPT_BROKER_INSTANCE_LOCK: join(h.directory, 'broker.instance.lock'),
    CGPT_AUTO_REMEDIATION_CB_STATE_PATH: join(h.directory, 'broker-circuit.json'),
  } });
  h.children.push(broker);
  let brokerError = '';
  broker.stderr.on('data', (data) => { brokerError += data; });
  const waiters = new Map();
  t.after(() => { for (const waiter of waiters.values()) clearTimeout(waiter.timer); });
  readline.createInterface({ input: broker.stdout }).on('line', (line) => {
    const message = JSON.parse(line); const waiter = waiters.get(message.id);
    if (waiter) { waiters.delete(message.id); clearTimeout(waiter.timer); waiter.resolve(message); }
  });
  let nextId = 1;
  const call = (method, params) => new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => { waiters.delete(id); reject(new Error('MCP timeout: ' + brokerError)); }, 10000);
    waiters.set(id, { resolve, timer });
    broker.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
  const initialized = await call('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'synthetic-test', version: '1' } });
  assert.equal(initialized.result.serverInfo.version, '2.1.28');
  broker.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  const approvals = runs.map((r) => h.approval(r, 'mcp-' + r.runId));
  const replies = approvals.map((approval) => call('tools/call', { name: 'request_validation',
    arguments: { ...approval, timeout_seconds: 15, interval_seconds: 1 } }));
  const terminalReplies = Promise.all(replies);
  terminalReplies.catch(() => {});
  await waitFor(async () => Object.values((await h.get('/status')).body.runs).every((r) => r.undecidedValidationCount === 1));
  h.native.permissions = runs.map((r) => ({ id: 'mcp-permission-' + r.runId, sessionID: r.sessionId,
    permission: 'bash', metadata: { command: '/usr/bin/true' } }));
  for (const approval of approvals) assert.equal((await h.post('/runs/' + approval.run_id + '/decision/' + approval.requestId,
    { decision: 'approved' })).status, 201);
  const results = await terminalReplies;
  for (let i = 0; i < results.length; i++) {
    assert.notEqual(results[i].result.isError, true);
    const payload = JSON.parse(results[i].result.content[0].text);
    assert.equal(payload.status, 'APPROVED'); assert.equal(payload.run_id, runs[i].runId);
    assert.equal(payload.requestId, approvals[i].requestId);
  }
  await waitFor(() => h.native.replies.length === 3);
  assert.ok(h.native.replies.every((p) => p.body.response === 'once'));
});

test('statistiques automatiques : broker relayé, décision, once, SSE filtré et reprise', async (t) => {
  const h = await setup(t); const a = await h.reserve('a');
  const approval = h.approval(a, 'measured-request');
  assert.equal((await h.post('/validation/request', { approval })).status, 202);
  h.native.permissions.push({ id: 'measured-permission', sessionID: 'ses_a', permission: 'bash', metadata: { command: '/usr/bin/true' } });
  assert.equal((await h.post('/runs/a/decision/measured-request', { decision: 'approved' })).status, 201);
  await waitFor(() => h.native.replies.length === 1);
  const event = { type: 'message.part.updated', properties: { part: { id: 'measured-part', sessionID: 'ses_a',
    type: 'tool', tool: 'bash', state: { status: 'completed', time: { start: 10, end: 20 },
      input: { command: 'SECRET-COMMAND' }, output: 'SECRET-OUTPUT' } } } };
  h.native.emit(event); h.native.emit(event);
  await waitFor(async () => (await h.get('/runs/a/statistics')).body.contexts[0].tools.bash?.completed === 1);
  const measured = (await h.get('/runs/a/statistics')).body;
  assert.equal(measured.contexts[0].decisions.approved, 1);
  assert.equal(measured.contexts[0].decisions.once, 1);
  assert.equal(measured.contexts[0].latencies.requestToDecision.count, 1);
  assert.ok(!JSON.stringify(measured).includes('SECRET'));
  const markdown = await fetch(h.base + '/runs/a/statistics?format=markdown');
  assert.match(markdown.headers.get('content-type'), /text\/markdown/);
  assert.equal(((await markdown.text()).match(/^## /gm) || []).length, 6);
  await h.stop(); await h.start();
  const restored = (await h.get('/runs/a/statistics?contextId=' + a.contextId)).body;
  assert.equal(restored.contexts[0].tools.bash.completed, 1);
  assert.equal(restored.contexts[0].decisions.once, 1);
  assert.ok(restored.restartUnknownMs > 0);
});

test('closing et rapport ciblés : le pair continue et le gate exige la fin native', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); await h.reserve('b');
  const { approval, access } = await h.approvedAccess(a, 'source'); await h.execute(approval); await h.completeTool(approval);
  const reportFile = 'openspec/changes/archive/2026-10-16-change-a/STATISTIQUES.md';
  const publication = await h.post('/runs/a/publish', { version: a.version, transactionId: 'published-source', operationId: access.accessId,
    token: access.token, fencing: access.fencing, outcome: 'COMPLETED', proofRevisions: approval.expected_revisions,
    reportFile, evidence: ['source and archive validated'] }); assert.equal(publication.status, 200);
  const run = (await h.get('/runs')).body.runs.find((r) => r.runId === 'a');
  const report = h.approval(run, 'report'); report.files = [reportFile]; report.commands = [];
  h.native.messages.ses_a.at(-1).parts[0].state.input = structuredClone(report);
  assert.equal((await h.post('/validation/request', { approval: report })).status, 202);
  assert.equal((await h.post('/runs/a/decision/report', { decision: 'approved' })).status, 201);
  await h.execute(report);
  assert.equal((await h.post('/runs/a/job/terminal-gate', { state: 'TERMINÉ' })).body.error, 'run-accesses-unresolved');
  await h.completeTool(report); assert.equal((await h.releaseOperation(run, report)).status, 200);
  assert.equal((await h.get('/runs/b/status')).body.coordination.reason, null);
  assert.equal((await h.post('/runs/a/job/terminal-gate', { state: 'TERMINÉ' })).status, 201);
  assert.equal((await h.post('/runs/a/job/disarm', { jobId: 'job-a' })).status, 202);
  assert.equal((await h.post('/runs/a/release', { version: run.version, delivered: true, evidence: ['report verified'] })).status, 200);
});

test('une réduction quiescente retire project:* sans accepter une génération ancienne', async (t) => {
  const h = await setup(t);
  const a = await h.reserve('a', { resources: [{ key: 'project:*', mode: 'read' }] });
  const reduced = await h.post('/runs/a/resources', { version: a.version,
    resources: [{ key: 'file:src/a.py', mode: 'read' }], evidence: ['global read completed'] });
  assert.equal(reduced.status, 200);
  await h.reserve('b');
  assert.equal((await h.post('/validation/request', { approval: h.approval(a, 'stale-resource') })).status, 409);
  const current = h.approval(reduced.body, 'pending-current');
  assert.equal((await h.post('/validation/request', { approval: current })).status, 202);
  assert.equal((await h.post('/runs/a/resources', { version: reduced.body.version,
    resources: reduced.body.resources, evidence: ['must wait for pending validation'] })).body.error, 'run-not-quiescent');
});


test('rejet réconcilié permet seulement la levée globale liée et quiescente', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); await h.reserve('b');
  const recovery = { jobId: 'job-a', expectedSessionId: 'ses_a', sessionId: 'ses_a_new',
    recoveryId: 'recovery-rejected', preflightRequestId: 'preflight-rejected' };
  assert.equal((await h.post('/runs/a/job/recover', { ...recovery, phase: 'prepare' })).status, 200);
  const approval = h.approval({ ...a, sessionId: 'ses_a_new' }, recovery.preflightRequestId);
  assert.equal((await h.post('/validation/request', { approval })).status, 202);
  assert.equal((await h.post('/runs/a/decision/' + approval.requestId, { decision: 'rejected' })).status, 201);
  h.native.messages.ses_a_new[0].parts[0].state = { status: 'completed', input: approval,
    output: JSON.stringify({ ...approval, status: 'REJECTED' }), time: { start: 1, end: 2 } };
  await h.stop(); await h.start();
  await h.post('/broker/readiness', { status: 'READY', pending_count: 0,
    infrastructure_status: 'READY', coordination_protocol: 'resource-scoped-v1' });
  const global = (await h.post('/coordination/global/request', { transactionId: 'rejected-global',
    cause: 'GLOBAL_RECONCILIATION', scope: 'all', authorization: 'human test', evidence: ['test'] })).body;
  const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
  const parts = h.native.messages.ses_a_new.flatMap(m => m.parts).map(v2NormalizedToolPart);
  const payload = { ...recovery, phase: 'reconcile-rejected', previousPreflightRequestId: approval.requestId,
    preflightRequestId: 'preflight-next', developerAuthorization: 'human test', globalTransactionId: global.transactionId,
    rejectedPreflightProof: { nativeToolCount: parts.length,
      nativeToolHash: createHash('sha256').update(JSON.stringify(canonical(parts))).digest('hex') } };
  assert.equal((await h.post('/runs/a/job/recover', { ...payload, globalTransactionId: 'other' })).status, 409);
  const reconciled = await h.post('/runs/a/job/recover', payload);
  assert.equal(reconciled.status, 200, JSON.stringify(reconciled.body));
  const attempt = reconciled.body.recovery.attempts.at(-1);
  const release = { transactionId: global.transactionId, generation: global.generation,
    authorization: 'human test', evidence: ['sealed rejection'], rejectedRecovery: { runId: 'a', jobId: 'job-a',
      recoveryId: recovery.recoveryId, preflightRequestId: 'preflight-next', nativeToolHash: attempt.nativeToolHash } };
  assert.equal((await h.post('/coordination/global/confirm', { ...release, authorization: '' })).status, 409);
  h.native.busy.ses_b = { type: 'busy' };
  assert.equal((await h.post('/coordination/global/confirm', release)).status, 409);
  delete h.native.busy.ses_b;
  assert.equal((await h.post('/coordination/global/confirm', release)).status, 200);
  h.native.messages.ses_a_new[0].parts[0].state.output = 'changed';
  assert.equal((await h.post('/coordination/global/release', release)).status, 409);
  h.native.messages.ses_a_new[0].parts[0].state.output = JSON.stringify({ ...approval, status: 'REJECTED' });
  assert.equal((await h.post('/coordination/global/release', release)).status, 200);
  assert.equal((await h.get('/runs/a/job')).body.recovery.preflightRequestId, 'preflight-next');
  assert.deepEqual(h.native.replies, []);
});

test('restauration humaine concurrente conserve propriétaire et digest sans nouvelle once', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); await h.reserve('b');
  const recovery = { jobId: 'job-a', expectedSessionId: 'ses_a', sessionId: 'ses_a_new',
    recoveryId: 'recovery-a-restore', preflightRequestId: 'preflight-a-restore' };
  const prepared = await h.post('/runs/a/job/recover', { ...recovery, phase: 'prepare' });
  assert.equal(prepared.status, 200);
  let stamp = Date.parse(prepared.body.recovery.preparedAt);
  const approval = h.approval({ ...a, sessionId: 'ses_a_new' }, recovery.preflightRequestId);
  assert.equal((await h.post('/validation/request', { approval })).status, 202);
  assert.equal((await h.post('/runs/a/decision/' + approval.requestId, { decision: 'approved' })).status, 201);
  h.native.permissions.push({ id: 'permission-restored-a', sessionID: 'ses_a_new', permission: 'bash',
    metadata: { command: '/usr/bin/true' } });
  await waitFor(() => h.native.replies.length === 1);
  stamp = Date.now() + 1;
  h.native.messages.ses_a_new = [{ parts: [
    { type: 'tool', tool: 'cgpt-validation_request_validation', state: { status: 'completed', input: approval,
      output: JSON.stringify({ ...approval, status: 'APPROVED', reviewer: 'CGPT' }),
      time: { start: stamp + 1, end: stamp + 2 } } },
    { type: 'tool', tool: 'bash', state: { status: 'completed', input: { command: '/usr/bin/true' },
      metadata: { exit: 0 }, time: { start: stamp + 3, end: stamp + 4 } } },
    { type: 'tool', tool: 'cgpt-validation_broker_readiness', state: { status: 'completed',
      output: JSON.stringify({ status: 'READY', pending_count: 0 }), time: { start: stamp + 5, end: stamp + 6 } } },
  ] }];
  await h.post('/broker/readiness', { status: 'READY', pending_count: 0,
    by_run: { a: { pending_count: 0 }, b: { pending_count: 0 } } });
  await delay(10);
  assert.equal((await h.releaseOperation(a, approval)).status, 200);
  const gate = await h.post('/runs/a/job/terminal-gate', { state: 'BLOQUÉ' });
  assert.equal(gate.status, 201);
  assert.equal((await h.post('/runs/a/job/disarm', { jobId: 'job-a' })).status, 202);
  const decision = (await h.get('/runs/a/decision/' + approval.requestId)).body;
  const ordered = (v) => Array.isArray(v) ? v.map(ordered) : v !== null && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, ordered(v[k])])) : v;
  const hash = () => createHash('sha256').update(JSON.stringify(ordered(
    h.native.messages.ses_a_new.flatMap((m) => m.parts).map(v2NormalizedToolPart)))).digest('hex');
  for (const message of h.native.messages.ses_a_new) for (const part of message.parts) if (part.type === 'tool') {
    part.callID ||= 'call_fixture'; part.executed = true; part.state.metadata ||= {};
  }
  const payload = { ...recovery, phase: 'complete', developerAuthorization: 'accord-ciblé-fixture',
    restoredPreflightProof: { nativeToolCount: 3, nativeToolHash: hash(), decision,
      blockedGateValidatedAt: gate.body.validatedAt } };
  const v2History = structuredClone(h.native.messages.ses_a_new);
  await h.stop(); await h.start();
  await h.post('/broker/readiness', { status: 'READY', pending_count: 0,
    by_run: { a: { pending_count: 0 }, b: { pending_count: 0 } } });
  h.native.messages.ses_a_new[0].parts[0].state.input.resources = [{ key: 'file:src/foreign.py', mode: 'write' }];
  const changed = structuredClone(payload); changed.restoredPreflightProof.nativeToolHash = hash();
  assert.equal((await h.post('/runs/a/job/recover', changed)).body.error, 'preflight-approval-divergent');
  h.native.messages.ses_a_new = v2History;
  const result = await h.post('/runs/a/job/recover', payload);
  assert.equal(result.status, 200, JSON.stringify(result));
  assert.equal(result.body.sessionId, 'ses_a_new');
  assert.equal(result.body.armed, true);
  const runs = (await h.get('/runs')).body.runs;
  assert.equal(runs.find((run) => run.runId === 'b').sessionId, 'ses_b');
  assert.deepEqual((await h.get('/runs/a/decision/' + approval.requestId)).body, decision);
  assert.equal(h.native.replies.length, 1);
});

test('consultations et import statistique HTTP ne changent ni registre ni permissions', async (t) => {
  const h = await setup(t); await h.reserve('a'); const before = (await h.get('/runs')).body;
  const at = Date.now() - 1000;
  const bundle = { schemaVersion: 1, sourceId: 'synthetic-audit', datasetId: 'one', project: h.directory,
    firstAt: at, lastAt: at + 100, pollMs: 5, gapMs: 15, events: [], quota: [], evidence: [],
    catalog: [{ runId: 'old', contextId: 1, changeId: 'change-old', sessionId: 'ses_old', state: 'DELIVERED',
      phase: 'REPORT', firstAt: at, lastAt: at + 100, closedAt: at + 100 }],
    intervals: [{ from: at, to: at + 100, registryKnown: true, nativeAvailable: false, scopeRunIds: ['old'],
      integrationOwner: null, contexts: [{ runId: 'old', contextId: 1, changeId: 'change-old', sessionId: 'ses_old',
        nativeType: null, queue: null, stale: null }] }] };
  assert.equal((await h.post('/statistics/import', { bundle })).body.status, 'imported');
  assert.equal((await h.post('/statistics/import', { bundle })).body.status, 'already-imported');
  assert.equal((await h.post('/statistics/import', { bundle: { ...bundle, command: 'SECRET' } })).status, 400);
  for (const selection of ['current','last','24h','7d','30d']) {
    const view = await h.get('/statistics/view?selection=' + selection);
    assert.equal(view.status, 200); assert.equal(view.body.selection, selection);
    assert.equal(view.body.sources[1].historical, true);
  }
  assert.deepEqual((await h.get('/runs')).body, before); assert.equal(h.native.replies.length, 0);
  await h.stop(); await h.start();
  assert.equal((await h.post('/statistics/import', { bundle })).body.status, 'already-imported');
});

test('pause ciblée et intégrité commune ferment leurs admissions sans approbation implicite', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); const b = await h.reserve('b');
  assert.equal((await h.post('/runs/a/suspend', { version: a.version, action: 'PAUSE', evidence: ['pause A'] })).status, 200);
  assert.equal((await h.post('/validation/request', { approval: h.approval(a, 'paused') })).body.error, 'run-pause');
  assert.equal((await h.post('/validation/request', { approval: h.approval(b, 'independent') })).status, 202);
  assert.equal((await h.post('/runs/b/decision/independent', { decision: 'rejected' })).status, 201);
  await h.post('/broker/readiness', { status: 'BLOCKED', infrastructure_status: 'BLOCKED', root_cause: 'JOURNAL_INTEGRITY_FAILURE' });
  const global = (await h.get('/coordination/global')).body.global;
  assert.equal(global.cause, 'GLOBAL_RECONCILIATION'); assert.equal(global.state, 'DRAINING');
  assert.equal((await h.post('/validation/request', { approval: h.approval(b, 'integrity-blocked') })).body.error, 'global-coordination-suspended');
  assert.equal(h.native.replies.length, 0);
});

test('ancien broker ou anciens champs refusés sans permission ni gel ordinaire', async (t) => {
  const h = await setup(t); const a = await h.reserve('a');
  await h.post('/broker/readiness', { status: 'READY', coordination_protocol: 'legacy' });
  assert.equal((await h.post('/validation/request', { approval: h.approval(a, 'old-broker') })).body.error, 'coordination-upgrade-required');
  await h.post('/broker/readiness', { status: 'READY' });
  const old = h.approval(a, 'old-fields'); delete old.operation_id;
  h.native.messages.ses_a.at(-1).parts[0].state.input = structuredClone(old);
  assert.equal((await h.post('/validation/request', { approval: old })).body.error, 'coordination-upgrade-required');
  assert.equal((await h.get('/coordination/global')).body.global, null); assert.equal(h.native.replies.length, 0);
});

test('un refus explicite reste possible pendant une pause après préparation', async (t) => {
  const h = await setup(t); const a = await h.reserve('a');
  const approval = h.approval(a, 'pending-pause');
  assert.equal((await h.post('/validation/request', { approval })).status, 202);
  await h.post('/runs/a/suspend', { version: a.version, action: 'PAUSE', evidence: ['pause'] });
  assert.equal((await h.post('/runs/a/decision/pending-pause', { decision: 'rejected' })).status, 201);
  assert.equal((await h.get('/runs/a/decision/pending-pause')).body.decision, 'rejected');
  assert.equal(h.native.replies.length, 0);
});

test('migration HTTP conserve les RUN et exige once exact avant leur reprise métier', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); await h.reserve('b');
  const legacy = (await h.get('/runs')).body; legacy.schemaVersion = 3;
  delete legacy.coordination; delete legacy.coordinationProtocol;
  await h.stop();
  const state = join(h.directory,'.opencode','state','cgpt-approval-bridge');
  writeFileSync(join(state,'controller-runs.json'),JSON.stringify(legacy)+'\n');
  await h.start();
  // A nominal cohort proof requires the initial SSE connection to be established.
  await waitFor(async () => (await h.get('/status')).body.opencodeSse === 'connected');
  await h.post('/broker/readiness',{status:'READY',pending_count:0});
  assert.equal((await h.get('/runs/a/status')).body.coordination.reason,'coordination-upgrade-required');
  const migrated = await h.post('/coordination/migrate',{cause:'SHARED_MAINTENANCE',authorization:'explicit migration',evidence:['native quiescence and backup']});
  assert.equal(migrated.status,200,JSON.stringify(migrated));
  assert.equal(migrated.body.runs.length,2);
  assert.equal(statSync(join(state,migrated.body.coordination.legacy.backupFile)).mode & 0o777,0o600);
  await h.post('/runs/a/suspend',{version:a.version,action:'RESUME',evidence:['preflight only']});
  const g=migrated.body.coordination.global;
  assert.equal((await h.post('/coordination/global/release',{transactionId:g.transactionId,generation:g.generation,
    authorization:'preflight only while peers paused',evidence:['transport checks passed']})).status,200);
  assert.equal((await h.post('/validation/request',{approval:h.approval(a,'business-before-probe')})).body.error,'maintenance-preflight-required');
  const {approval,access}=await h.approvedAccess(a,'preflight-migration');
  await h.execute(approval);await h.completeTool(approval);
  assert.equal((await h.releaseOperation(a,approval,access)).status,200);
  const runs=(await h.get('/runs')).body.runs;
  assert.equal(runs.find(r=>r.runId==='a').maintenancePreflightRequired,undefined);
  assert.equal(runs.find(r=>r.runId==='b').suspension.action,'PAUSE');
  assert.equal((await h.post('/validation/request',{approval:h.approval(a,'business-after-probe')})).status,202);
  assert.equal(h.native.replies.length,1);
});

test('la fin native accepte un appel commencé avant ask mais refuse un autre callID', async (t) => {
  const h=await setup(t);const a=await h.reserve('a');
  const {approval,access}=await h.approvedAccess(a,'pending-before-ask');await h.execute(approval);
  const op=(await h.get('/runs')).body.coordination.operations[approval.operation_id];
  const part={type:'tool',tool:'bash',callID:'wrong-call',state:{status:'completed',input:{command:'/usr/bin/true'},
    time:{start:op.native.startedAt-1000,end:Date.now()+1},metadata:{exit:0}}};
  h.native.messages.ses_a.push({parts:[part]});
  assert.equal((await h.releaseOperation(a,approval,access)).body.error,'native-completion-not-proved');
  part.callID='call-'+approval.requestId;
  assert.equal((await h.releaseOperation(a,approval,access)).status,200);
  assert.equal((await h.releaseOperation(a,approval,access)).status,200);
});

test('l’usage historique unique garde once et exige une clôture réconciliée avant Multi-RUN', async (t) => {
  const h=await setup(t);
  const approval={requestId:'legacy-request',approval_id:'legacy-approval',change_id:'legacy-change',session_id:'ses_legacy',
    directory:h.directory,files:[],commands:['/usr/bin/true'],summary:'legacy compatibility'};
  assert.equal((await h.post('/validation/request',{approval})).status,202);
  assert.equal((await h.post('/decision/legacy-request',{decision:'approved'})).status,201);
  h.native.permissions.push({id:'legacy-permission',sessionID:'ses_legacy',permission:'bash',metadata:{command:'/usr/bin/true'}});
  await waitFor(()=>h.native.replies.length===1);await delay(30);
  assert.equal((await h.post('/runs/reserve',h.candidate('a'))).body.error,'legacy-coordination-reconciliation-required');
  const g=(await h.post('/coordination/global/request',{cause:'GLOBAL_RECONCILIATION',scope:'all',transactionId:'legacy-global',
    authorization:'explicit handoff',evidence:['legacy review']})).body;
  h.native.busy.ses_legacy={type:'busy'};
  assert.equal((await h.post('/coordination/global/confirm',{...g,evidence:['not quiescent']})).body.error,'native-session-not-quiescent');
  h.native.busy.ses_legacy={type:'idle'};
  assert.equal((await h.post('/coordination/global/confirm',{...g,evidence:['all legacy effects reviewed']})).status,200);
  assert.equal((await h.post('/coordination/legacy/reconcile',{transactionId:'handoff',authorization:'explicit closure',
    evidence:['native history and effects reconciled']})).status,200);
  assert.equal((await h.post('/coordination/global/release',{...g,authorization:'resume concurrent profile',evidence:['handoff proved']})).status,200);
  assert.equal((await h.reserve('a')).state,'RESERVED');assert.equal(h.native.replies[0].body.response,'once');
});


for (const [label, environment, limit] of [
  ['défaut', {}, 16384],
  ['alias historique', { OC_CGPT_MAX_COMMAND_LENGTH: '2000' }, 2000],
  ['priorité principale', { OC_Codex_MAX_COMMAND_LENGTH: '4096', OC_CGPT_MAX_COMMAND_LENGTH: '2000' }, 4096],
]) {
  test(`bornes de commande HTTP : ${label}`, async (t) => {
    const h = await setup(t, { environment });
    for (const length of [limit - 1, limit, limit + 1]) {
      const approval = { requestId: 'length-' + length, approval_id: 'approval-' + length, change_id: 'length-change',
        session_id: 'ses_length', directory: h.directory, files: [], commands: ['x'.repeat(length)] };
      const result = await h.post('/validation/request', { approval });
      if (length <= limit) {
        assert.equal(result.status, 202, JSON.stringify(result));
        assert.equal((await h.post('/validation/reminder', { approval })).status, 202);
      } else {
        assert.equal(result.status, 400);
        assert.deepEqual(result.body, { error: 'command-too-long',
          message: `Commande refusée : longueur ${length}, limite autorisée ${limit}.`,
          maxLength: limit, actualLength: length, unit: 'utf16' });
        assert.equal((await h.get('/decision/' + approval.requestId)).status, 404);
      }
    }
    assert.equal(h.native.replies.length, 0);
  });
}

test('comptage UTF-16 : accents BMP et caractères hors BMP aux bornes', async (t) => {
  const h = await setup(t, { environment: { OC_Codex_MAX_COMMAND_LENGTH: '4' } });
  for (const [index, command] of ['ééé', 'éééé', '😀😀', 'ééééé', '😀😀x'].entries()) {
    const approval = { requestId: 'unicode-' + index, approval_id: 'unicode-approval-' + index,
      change_id: 'unicode-change', session_id: 'ses_unicode', directory: h.directory, files: [], commands: [command] };
    const result = await h.post('/validation/request', { approval });
    assert.equal(result.status, command.length <= 4 ? 202 : 400);
    if (result.status === 400) assert.equal(result.body.actualLength, 5);
  }
});

test('refus de longueur sur demandes et rappels : routes historiques, resource et RUN sans enregistrement', async (t) => {
  const h = await setup(t);
  const legacy = { requestId: 'legacy-too-long', approval_id: 'legacy-approval', change_id: 'legacy-change',
    session_id: 'ses_legacy', directory: h.directory, files: [], commands: ['x'.repeat(16385)] };
  for (const action of ['request', 'reminder']) {
    const result = await h.post('/validation/' + action, { approval: legacy });
    assert.equal(result.status, 400); assert.equal(result.body.error, 'command-too-long');
  }
  assert.equal((await h.get('/status')).body.undecidedValidationCount, 0);
  const run = await h.reserve('a');
  const approval = h.approval(run, 'too-long'); approval.commands = ['x'.repeat(16385)];
  const before = (await h.get('/runs')).body;
  for (const route of ['/validation/request', '/validation/reminder', '/validation/resource-request',
    '/validation/resource-reminder', '/runs/a/validation/request', '/runs/a/validation/reminder']) {
    const result = await h.post(route, { approval });
    assert.equal(result.status, 400, route); assert.equal(result.body.maxLength, 16384);
    assert.equal(result.body.actualLength, 16385); assert.ok(!JSON.stringify(result.body).includes(approval.commands[0]));
  }
  const after = (await h.get('/runs')).body;
  assert.deepEqual(after.coordination.operations, before.coordination.operations);
  assert.deepEqual(after.requestOwners, before.requestOwners);
  assert.equal((await h.get('/runs/a/status')).body.undecidedValidationCount, 0);
  assert.equal((await h.get('/runs/a/decision/too-long')).status, 404);
  assert.equal(h.native.replies.length, 0);
});

test('commande longue stricte : décision corrélée, commande exacte et once consommé une seule fois', async (t) => {
  const h = await setup(t); const run = await h.reserve('a');
  const approval = h.approval(run, 'long-once'); approval.commands = ['x'.repeat(16384)];
  h.native.messages.ses_a.at(-1).parts[0].state.input = structuredClone(approval);
  assert.equal((await h.post('/validation/resource-request', { approval })).status, 202);
  assert.equal((await h.post('/validation/resource-reminder', { approval })).status, 202);
  const permission = { id: 'long-native', sessionID: 'ses_a', permission: 'bash', tool: { callID: 'long-call' },
    metadata: { command: approval.commands[0] } };
  const observePoll = async () => {
    const count = h.native.requests.filter((p) => p === '/permission').length;
    await waitFor(() => h.native.requests.filter((p) => p === '/permission').length >= count + 3);
  };
  h.native.permissions.push(permission); await observePoll(); assert.equal(h.native.replies.length, 0);
  permission.metadata.command = approval.commands[0].slice(0, -1) + 'y';
  assert.equal((await h.post('/runs/a/decision/long-once', { decision: 'approved' })).status, 201);
  const decision = (await h.get('/runs/a/decision/long-once')).body;
  for (const key of ['requestId', 'approval_id', 'change_id', 'run_id', 'reservation_version']) {
    assert.equal(decision[key], approval[key]);
  }
  const acquired = await h.post('/runs/a/locks/acquire', { version: run.version, operationId: approval.operation_id,
    operationDigest: approval.operation_digest, resources: approval.resources, expectedRevisions: approval.expected_revisions });
  assert.equal(acquired.status, 200);
  await observePoll(); assert.equal(h.native.replies.length, 0);
  permission.metadata.command = approval.commands[0];
  await waitFor(() => h.native.replies.length === 1);
  assert.equal(h.native.replies[0].body.response, 'once');
  h.native.permissions.push({ ...permission, id: 'long-native-second' });
  await observePoll(); assert.equal(h.native.replies.length, 1);
  assert.equal((await h.post('/runs/a/decision/long-once', { decision: 'approved' })).status, 400);
  assert.deepEqual((await h.get('/runs/a/decision/long-once')).body, decision);
});


test('une opération consommée ne réinscrit pas sa session après la réconciliation historique', async (t) => {
  const h = await setup(t);
  const approval = { requestId: 'consumed-legacy', approval_id: 'consumed-approval', change_id: 'legacy-change',
    session_id: 'ses_legacy', directory: h.directory, files: [], commands: ['/usr/bin/true'] };
  assert.equal((await h.post('/validation/request', { approval })).status, 202);
  assert.equal((await h.post('/decision/consumed-legacy', { decision: 'approved' })).status, 201);
  h.native.permissions.push({ id: 'consumed-permission', sessionID: 'ses_legacy', permission: 'bash',
    metadata: { command: '/usr/bin/true' } });
  await waitFor(() => h.native.replies.length === 1);
  const global = await h.post('/coordination/global/request', { cause: 'GLOBAL_RECONCILIATION', scope: 'all',
    transactionId: 'consumed-global', authorization: 'explicit closure', evidence: ['effects reviewed'] });
  assert.equal(global.status, 202);
  assert.equal((await h.post('/coordination/global/confirm', { ...global.body, evidence: ['quiescence proved'] })).status, 200);
  assert.equal((await h.post('/coordination/legacy/reconcile', { transactionId: 'consumed-handoff',
    authorization: 'explicit closure', evidence: ['effects reviewed'] })).status, 200);
  assert.equal((await h.post('/coordination/global/release', { ...global.body,
    authorization: 'explicit resume', evidence: ['closure proved'] })).status, 200);
  const count = h.native.requests.filter((p) => p === '/permission').length;
  await waitFor(() => h.native.requests.filter((p) => p === '/permission').length >= count + 3);
  assert.deepEqual((await h.get('/runs')).body.coordination.legacySources, []);
  assert.equal((await h.reserve('a')).state, 'RESERVED');
  assert.equal(h.native.replies.length, 1); assert.equal(h.native.replies[0].body.response, 'once');
});


test('environnement Docker HTTP : conservation entre commandes et restitution prouvée avant le pair', async (t) => {
  const h=await setup(t);const resources=[{key:'docker:engine-a',mode:'write'}];
  const a=await h.reserve('a',{resources});const b=await h.reserve('b',{resources});
  assert.equal((await h.get('/status')).body.testResourceProtocol,'test-resources-v1');
  const acquire={version:a.version,transactionId:'tests-a',resources,evidence:['identité du moteur vérifiée']};
  const lease=(await h.post('/runs/a/test-resources/acquire',acquire)).body;
  assert.equal(lease.state,'HELD');
  assert.equal((await h.post('/runs/b/test-resources/acquire',{...acquire,version:b.version,transactionId:'tests-b'})).status,202);
  assert.equal((await h.get('/runs/b/status')).body.coordination.reason,'test-resource-conflict');
  const payload={version:a.version,transactionId:lease.transactionId,token:lease.token,fencing:lease.fencing,evidence:['restitution examinée']};
  assert.equal((await h.post('/runs/a/test-resources/release',payload)).body.error,'test-cleanup-proof-required');
  const execute=async(id)=>{
    const revisions=(await h.get('/runs/a/locks')).body.revisions;
    const operation=await h.approvedAccess(a,id,revisions);await h.execute(operation.approval);
    await h.completeTool(operation.approval);
    assert.equal((await h.releaseOperation(a,operation.approval,operation.access)).status,200);
    return operation.approval.operation_id;
  };
  await execute('container-tests');
  assert.equal((await h.get('/runs/a/test-resources')).body.reservations[0].state,'HELD');
  assert.equal((await h.post('/runs/a/job/terminal-gate',{state:'TERMINÉ'})).body.error,'run-accesses-unresolved');
  const cleanupOperationId=await execute('cleanup');
  const verificationOperationId=await execute('verify-clean');
  const release={...payload,cleanup:[{resourceKey:resources[0].key,cleanupOperationId,verificationOperationId,restored:true}]};
  assert.equal((await h.post('/runs/a/test-resources/release',release)).status,200);
  assert.equal((await h.post('/runs/a/test-resources/release',release)).body.state,'RELEASED');
  assert.equal((await h.get('/runs/b/test-resources')).body.reservations[0].state,'HELD');
  assert.equal((await h.post('/runs/a/test-resources/release',{...release,evidence:['preuve divergente']})).status,409);
});

test('réservation LXC HTTP restaurée : nouvelle frontière native et jeton renouvelé', async (t) => {
  const h=await setup(t);const a=await h.reserve('a',{resources:[{key:'lxc:host-a/101',mode:'write'}]});
  const lease=(await h.post('/runs/a/test-resources/acquire',{version:a.version,transactionId:'lxc-a',resources:a.resources,evidence:['instance canonique']})).body;
  await h.stop();await h.start();
  assert.equal((await h.get('/runs/a/test-resources')).body.reservations[0].reconciliationRequired,true);
  const payload={version:a.version,transactionId:lease.transactionId,token:lease.token,fencing:lease.fencing,evidence:['frontière native sans activité']};
  assert.equal((await h.post('/runs/a/test-resources/release',payload)).body.error,'test-reconciliation-required');
  h.native.busy[a.sessionId]={type:'busy'};
  assert.equal((await h.post('/runs/a/test-resources/reconcile',{...payload,reconciliationId:'reconcile-a'})).status,409);
  h.native.busy={};
  const request={...payload,reconciliationId:'reconcile-a'};
  const restored=await h.post('/runs/a/test-resources/reconcile',request);
  assert.equal(restored.status,200,JSON.stringify(restored));assert.notEqual(restored.body.token,lease.token);
  assert.equal((await h.post('/runs/a/test-resources/reconcile',request)).body.token,restored.body.token);
  assert.equal((await h.post('/runs/a/test-resources/release',payload)).body.error,'test-token-invalid');
});


for (const browser of ['chromium','firefox']) test('verrou HTTP du navigateur externe '+browser+' : fin et restitution distinctes', async (t) => {
  const h=await setup(t);const resources=[{key:'browser:host-a/'+browser,mode:'write'}];
  const a=await h.reserve('a',{resources});const b=await h.reserve('b',{resources});
  const lease=(await h.post('/runs/a/test-resources/acquire',{version:a.version,transactionId:'browser-a',resources,evidence:['navigateur DEVOPS résolu']})).body;
  assert.equal(lease.state,'HELD');
  assert.equal((await h.post('/runs/b/test-resources/acquire',{version:b.version,transactionId:'browser-b',resources,evidence:['même navigateur']})).status,202);
  const execute=async(id)=>{
    const revisions=(await h.get('/runs/a/locks')).body.revisions;
    const op=await h.approvedAccess(a,id,revisions);await h.execute(op.approval);await h.completeTool(op.approval);
    assert.equal((await h.releaseOperation(a,op.approval,op.access)).status,200);return op.approval.operation_id;
  };
  await execute('browser-test');
  const payload={version:a.version,transactionId:lease.transactionId,token:lease.token,fencing:lease.fencing,evidence:['sessions et profil temporaires restitués']};
  assert.equal((await h.post('/runs/a/test-resources/release',payload)).body.error,'test-cleanup-proof-required');
  assert.equal((await h.post('/runs/a/job/terminal-gate',{state:'TERMINÉ'})).status,409);
  const cleanupOperationId=await execute('close-browser');const verificationOperationId=await execute('verify-browser');
  assert.equal((await h.post('/runs/a/test-resources/release',{...payload,cleanup:[{resourceKey:resources[0].key,cleanupOperationId,verificationOperationId,restored:true}]})).status,200);
  assert.equal((await h.get('/runs/b/test-resources')).body.reservations[0].state,'HELD');
});


test('PLLM HTTP : défaut medium, prévol exact, choix persisté et modèle du job immuable', async(t)=>{
 const h=await setup(t,{codingPolicy:true});
 const resolved=await h.post('/model-policy/resolve',{});assert.equal(resolved.status,200,JSON.stringify(resolved));
 assert.equal(resolved.body.reasoning,'medium');assert.equal(resolved.body.preflightRequired,true);
 const run=(await h.post('/runs/reserve',h.candidate('a'))).body;
 const arm={jobId:'job-a',sessionId:run.sessionId,directory:h.directory,changeId:run.changeId,strictCommands:true,criteria:['delivery'],
   modelSelectionProtocol:'pllm-auto-v1',modelSelection:{},modelPreflight:{sessionId:'ses_probe',messageId:'msg_response'}};
 assert.equal((await h.post('/runs/a/job/arm',{...arm,modelSelection:0})).body.error,'model-selection-input-invalid');
 h.native.sessions.ses_probe.model.variant='low';
 assert.equal((await h.post('/runs/a/job/arm',arm)).body.error,'model-preflight-not-proved');
 h.native.sessions.ses_probe.model.variant='medium';
 const armed=await h.post('/runs/a/job/arm',arm);assert.equal(armed.status,201,JSON.stringify(armed));
 assert.equal(armed.body.codingModel.modelID,'model1');assert.equal(armed.body.codingModel.reasoning,'medium');
 const selected=armed.body.codingModel;await h.stop();await h.start();
 assert.deepEqual((await h.get('/runs/a/job')).body.codingModel,selected);
 assert.equal((await h.post('/runs/a/job/arm',{...arm,codingModel:selected})).body.error,'model-selection-server-owned');
 h.native.sessions.ses_probe.model={providerID:'provider2',modelID:'model2',variant:'medium'};
 h.native.messages.ses_probe[1].info.providerID='provider2';h.native.messages.ses_probe[1].info.modelID='model2';
 const changed=await h.post('/runs/a/job/arm',{...arm,modelSelection:{model:'provider2/model2'}});
 assert.equal(changed.status,400);assert.equal(changed.body.error,'job-coding-model-immutable');
 assert.deepEqual((await h.get('/runs/a/job')).body.codingModel,selected);
});

test('PLLM HTTP : medium absent choisit high avant la politique inférieure, modèle incompatible bloqué',async(t)=>{
 const h=await setup(t,{codingPolicy:true});
 h.native.providers.all[0].models.model1.variants={high:{},xhigh:{}};
 const resolved=await h.post('/model-policy/resolve',{});
 assert.equal(resolved.status,200,JSON.stringify(resolved));
 assert.equal(resolved.body.mode,'mode1');assert.equal(resolved.body.reasoning,'high');
 h.native.providers.all[0].models.model1.variants={low:{}};
 assert.equal((await h.post('/model-policy/resolve',{})).body.mode,'mode2');
 assert.equal((await h.post('/model-policy/resolve',{model:'provider1/model1'})).body.error,'explicit-model-unavailable');
 assert.equal((await h.post('/model-policy/resolve',{model:'provider1/model1',reasoning:'low'})).body.reasoning,'low');
});


test('PLLM HTTP : refus natif corrélé de medium autorise high mais 429 bloque',async(t)=>{
 const h=await setup(t,{codingPolicy:true});
 const reject=(reasoning,status=400)=>{
  const name=reasoning+'-'+status;const user=structuredClone(h.native.messages.ses_probe[0]);
  user.info.id='msg_user_'+name;
  const response=structuredClone(h.native.messages.ses_probe[1]);response.info.id='msg_bad_'+name;response.info.parentID=user.info.id;response.info.variant=reasoning;
  response.info.error={name:'APIError',data:{statusCode:status,responseBody:JSON.stringify({error:{code:'unsupported_value',param:'reasoning_effort',message:'diagnostic privé fictif'}})}};
  response.parts=[];h.native.messages.ses_probe.push(user,response);
  return {sessionId:'ses_probe',messageId:response.info.id};
 };
 const medium=reject('medium');
 const next=await h.post('/model-policy/resolve',{unavailablePreflights:[medium]});
 assert.equal(next.body.mode,'mode1',JSON.stringify(next));assert.equal(next.body.reasoning,'high');assert.equal(next.body.unavailabilityProofs.length,1);
 assert.equal(JSON.stringify(next.body).includes('diagnostic privé fictif'),false);
 assert.equal((await h.post('/model-policy/resolve',{model:'provider1/model1',reasoning:'medium',unavailablePreflights:[medium]})).body.error,'explicit-model-unavailable');
 assert.equal((await h.post('/model-policy/resolve',{unavailablePreflights:[reject('medium',429)]})).body.error,'model-unavailability-not-proved');
});


test('Budget /provider fourni par la session : bornes exactes, portée locale et confidentialité',async(t)=>{
 const h=await setup(t,{codingPolicy:true});const marker='DONNEE_PRIVEE_SYNTHETIQUE';
 h.native.providers.privatePadding=marker+'x'.repeat(3*1024*1024);
 const bytes=v2ProviderResponseBytes(h.native.providers,h.directory);
 assert.equal((await h.post('/model-policy/resolve',{})).body.error,'model-observation-too-large');
 for(const value of [0,-1,1.5,'8000000',null,Number.MAX_SAFE_INTEGER+1]){
  const observations=()=>h.native.requests.filter(p=>p==='/provider'||p.startsWith('/session/ses_probe')).length;
  const before=observations();
  const result=await h.post('/model-policy/resolve',{providerMaxBytes:value});
  assert.equal(result.body.error,'model-selection-input-invalid');assert.equal(observations(),before);
 }
 const overLimit=await h.post('/model-policy/resolve',{providerMaxBytes:bytes-1});
 assert.equal(overLimit.body.error,'model-observation-too-large',JSON.stringify({overLimit,bytes}));
 const exact=await h.post('/model-policy/resolve',{providerMaxBytes:bytes});assert.equal(exact.status,200);assert.equal(exact.body.reasoning,'medium');
 assert.ok(!JSON.stringify(exact).includes(marker));
 assert.equal((await h.post('/model-policy/resolve',{})).body.error,'model-observation-too-large');
 const run=(await h.post('/runs/reserve',h.candidate('a'))).body;
 const arm={jobId:'job-a',sessionId:run.sessionId,directory:h.directory,changeId:run.changeId,strictCommands:true,criteria:['budget'],modelSelectionProtocol:'pllm-auto-v1',modelSelection:{providerMaxBytes:bytes},modelPreflight:{sessionId:'ses_probe',messageId:'msg_response'}};
 const probeSession=structuredClone(h.native.sessions.ses_probe);
 h.native.sessions.ses_probe={privatePadding:marker+'x'.repeat(2*1024*1024)};
 assert.equal((await h.post('/runs/a/job/arm',arm)).body.error,'model-observation-too-large');
 h.native.sessions.ses_probe=probeSession;
 h.native.messages.ses_probe[1].parts.push({type:'text',text:marker+'x'.repeat(2*1024*1024)});
 assert.equal((await h.post('/runs/a/job/arm',arm)).body.error,'model-observation-too-large');
 h.native.messages.ses_probe[1].parts.pop();
 const armed=await h.post('/runs/a/job/arm',arm);assert.equal(armed.status,201,JSON.stringify(armed));
 assert.ok(!JSON.stringify(armed).includes(marker));assert.ok(!JSON.stringify((await h.get('/runs/a/job')).body).includes(marker));
 h.native.providers.privatePadding=marker+'x'.repeat(17*1024*1024);
 const larger=v2ProviderResponseBytes(h.native.providers,h.directory);assert.ok(larger>16*1024*1024);
 assert.equal((await h.post('/model-policy/resolve',{model:'provider1/model1',providerMaxBytes:larger})).status,200);
});


test('Raccord HTTP préparé : catalogue transmis, alias natif, variante imbriquée et job conservé',async(t)=>{
 const h=await setup(t,{codingPolicy:true,prepareCatalog:true,environment:{CAB_TEST_PRIVATE_OPTION:'NE_PAS_RESTITUER'}});
 const catalog=JSON.parse(readFileSync(h.native.catalogPath,'utf8'));catalog.models[0].provider='opencodego';writeFileSync(h.native.catalogPath,JSON.stringify(catalog));
 h.native.providers.all[0].id='opencode-go';h.native.providers.connected[0]='opencode-go';
 const parent=h.native.messages.ses_probe[0].info;parent.model={providerID:'opencode-go',modelID:'model1',variant:'medium'};delete parent.variant;
 h.native.sessions.ses_probe.model={providerID:'opencode-go',modelID:'model1',variant:'medium'};
 h.native.messages.ses_probe[1].info.providerID='opencode-go';h.native.messages.ses_probe[1].info.variant='medium';
 const resolved=await h.post('/model-policy/resolve',{});assert.equal(resolved.status,200,JSON.stringify(resolved));
 assert.equal(h.native.preparation.source,'active-skill');assert.equal(resolved.body.source,'pllm-automatic');assert.equal(resolved.body.providerID,'opencode-go');assert.equal(resolved.body.logicalProviderID,'opencodego');
 assert.ok(!JSON.stringify(resolved).includes('NE_PAS_RESTITUER'));
 const run=(await h.post('/runs/reserve',h.candidate('a'))).body;
 const arm={jobId:'job-a',sessionId:run.sessionId,directory:h.directory,changeId:run.changeId,strictCommands:true,criteria:['raccord'],modelSelectionProtocol:'pllm-auto-v1',modelSelection:{},modelPreflight:{sessionId:'ses_probe',messageId:'msg_response'}};
 const bad=structuredClone(arm);h.native.sessions.ses_probe.model.variant='low';assert.equal((await h.post('/runs/a/job/arm',bad)).body.error,'model-preflight-not-proved');h.native.sessions.ses_probe.model.variant='medium';
 const armed=await h.post('/runs/a/job/arm',arm);assert.equal(armed.status,201,JSON.stringify(armed));assert.equal(armed.body.codingModel.providerID,'opencode-go');assert.equal(armed.body.codingModel.logicalProviderID,'opencodego');
 const selected=armed.body.codingModel;await h.stop();await h.start();assert.deepEqual((await h.get('/runs/a/job')).body.codingModel,selected);
});

test('Raccord HTTP : indisponibilités imbriquées rattachées au catalogue logique, auth et contradictions refusées',async(t)=>{
 const h=await setup(t,{codingPolicy:true,prepareCatalog:true});
 const catalog=JSON.parse(readFileSync(h.native.catalogPath,'utf8'));catalog.models[0].provider='opencodego';
 const skipped=catalog.models.pop();skipped.provider=null;skipped.state='Invalide';skipped.evaluated_this_run=false;catalog.models.unshift(skipped);
 writeFileSync(h.native.catalogPath,JSON.stringify(catalog));
 h.native.providers.all[0].id='opencode-go';h.native.providers.connected[0]='opencode-go';
 const reject=(reasoning,status=400,contradiction=false)=>{
  const name=reasoning+'-'+status+'-'+contradiction;const user=structuredClone(h.native.messages.ses_probe[0]);user.info.id='msg_user_'+name;
  h.native.sessions.ses_probe.model={providerID:'opencode-go',modelID:'model1',variant:reasoning};
  user.info.model={providerID:'opencode-go',modelID:'model1',variant:reasoning};delete user.info.variant;
  const response=structuredClone(h.native.messages.ses_probe[1]);Object.assign(response.info,{id:'msg_bad_'+name,parentID:user.info.id,providerID:'opencode-go',variant:contradiction?'low':reasoning});
  response.info.error={name:'APIError',data:{statusCode:status,responseBody:JSON.stringify({error:{code:'unsupported_value',param:'reasoning_effort',message:'PRIVE_SYNTHETIQUE'}})}};
  response.parts=[];h.native.messages.ses_probe.push(user,response);return {sessionId:'ses_probe',messageId:response.info.id};
 };
 const medium=reject('medium');
 const lower=await h.post('/model-policy/resolve',{unavailablePreflights:[medium]});assert.equal(lower.status,200);assert.equal(lower.body.mode,'mode1');assert.equal(lower.body.reasoning,'high');assert.ok(!JSON.stringify(lower).includes('PRIVE_SYNTHETIQUE'));
 for(const reference of [reject('medium',429),reject('medium',401),reject('medium',400,true)])assert.equal((await h.post('/model-policy/resolve',{unavailablePreflights:[reference]})).body.error,'model-unavailability-not-proved');
});

test('recovery du RUN : permission étrangère ignorée avant lecture de cible, permission propre toujours bloquante', async t => {
  const h = await setup(t); await h.reserve('scoped');
  const permission = { id: 'per_foreign_shell', sessionID: 'ses_foreign', permission: 'shell', metadata: { command: '/usr/bin/true' } };
  h.native.permissions.push(permission);
  const recovery = { jobId: 'job-scoped', expectedSessionId: 'ses_scoped', sessionId: 'ses_scoped_new',
    recoveryId: 'recovery-scoped', preflightRequestId: 'preflight-scoped', phase: 'prepare' };
  const prepared = await h.post('/runs/scoped/job/recover', recovery);
  assert.equal(prepared.status, 200, JSON.stringify(prepared));
  assert.equal(prepared.body.recovery.sessionId, recovery.sessionId);
  assert.equal(h.native.permissions[0], permission);
  assert.deepEqual(h.native.replies, []);
  permission.sessionID = recovery.sessionId;
  const retried = await h.post('/runs/scoped/job/recover', { ...recovery, phase: 'retry',
    previousPreflightRequestId: recovery.preflightRequestId, preflightRequestId: 'preflight-scoped-next' });
  assert.equal(retried.status, 409);
  assert.equal(retried.body.error, 'opencode-control-unavailable');
  assert.deepEqual(h.native.replies, []);
});

async function unregisteredNativeRefusal(t) {
  const h = await setup(t); const run = await h.reserve('refusal');
  const recovery = { jobId: 'job-refusal', expectedSessionId: 'ses_refusal', sessionId: 'ses_refusal_new',
    recoveryId: 'recovery-refusal', preflightRequestId: 'preflight-refusal' };
  assert.equal((await h.post('/runs/refusal/job/recover', { ...recovery, phase: 'prepare' })).status, 200);
  const input = { ...h.approval({ ...run, sessionId: recovery.sessionId }, recovery.preflightRequestId), access_id: '' };
  const envelope = (name, args, output, id) => ({ type: 'tool', id, callID: id, tool: 'execute', executed: false,
    state: { status: 'completed', input: { code: `return await tools["cgpt-validation"].${name}(${JSON.stringify(args)});` },
      output, time: { start: Date.now(), end: Date.now() + 1 }, metadata: { error: true, truncated: false,
        toolCalls: [{ tool: 'cgpt-validation.' + name, status: 'error', input: structuredClone(args) }] } } });
  const refusal = envelope('request_validation', input,
    'MCP tool "request_validation" on server "cgpt-validation" failed: protocole de coordination ou identite d operation invalide', 'call_refusal');
  const lookup = envelope('get_approval', { approval_id: input.approval_id },
    `MCP tool "get_approval" on server "cgpt-validation" failed: approval_id '${input.approval_id}' inconnu`, 'call_lookup');
  h.native.messages[recovery.sessionId] = [{ parts: [refusal, lookup] }];
  return { h, recovery, input, refusal, lookup };
}

test('retry V2 : refus natif avant enregistrement et lookup inconnu corrélés conservent la candidate', async t => {
  const { h, recovery } = await unregisteredNativeRefusal(t);
  const result = await h.post('/runs/refusal/job/recover', { ...recovery, phase: 'retry',
    previousPreflightRequestId: recovery.preflightRequestId, preflightRequestId: 'preflight-refusal-next' });
  assert.equal(result.status, 200, JSON.stringify(result));
  assert.equal(result.body.recovery.sessionId, recovery.sessionId);
  assert.equal(result.body.recovery.attempts[0].preflightRequestId, recovery.preflightRequestId);
  assert.match(result.body.recovery.attempts[0].nativeToolHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(h.native.replies, []);
});

for (const kind of ['texte-seul', 'lookup-absent', 'lookup-divergent', 'arguments-divergents', 'appel-supplémentaire', 'troncature', 'refus-non-déterministe']) {
  test('retry V2 refuse la preuve ambiguë : ' + kind, async t => {
    const { h, recovery, refusal, lookup, input } = await unregisteredNativeRefusal(t);
    if (kind === 'texte-seul') refusal.state.metadata.error = false;
    if (kind === 'lookup-absent') h.native.messages[recovery.sessionId][0].parts.pop();
    if (kind === 'lookup-divergent') lookup.state.output = 'approval inconnue';
    if (kind === 'arguments-divergents') refusal.state.metadata.toolCalls[0].input.requestId = 'foreign';
    if (kind === 'appel-supplémentaire') h.native.messages[recovery.sessionId][0].parts.push({ type: 'tool', tool: 'bash', state: { status: 'completed', input: { command: '/usr/bin/true' } } });
    if (kind === 'troncature') refusal.state.metadata.truncated = true;
    if (kind === 'refus-non-déterministe') {
      input.access_id = 'valid-access';
      refusal.state.input.code = `return await tools["cgpt-validation"].request_validation(${JSON.stringify(input)});`;
      refusal.state.metadata.toolCalls[0].input = input;
    }
    const before = (await h.get('/runs/refusal/job')).body;
    const result = await h.post('/runs/refusal/job/recover', { ...recovery, phase: 'retry',
      previousPreflightRequestId: recovery.preflightRequestId, preflightRequestId: 'preflight-refusal-next' });
    assert.equal(result.status, 409, JSON.stringify(result));
    assert.deepEqual((await h.get('/runs/refusal/job')).body.recovery, before.recovery);
    assert.deepEqual(h.native.replies, []);
  });
}


for (const type of ['session.execution.started', 'session.execution.succeeded', 'permission.asked']) {
  test('un événement SSE V2 data invalide la cohorte : ' + type, async t => {
    const h = await setup(t); await h.reserve('a');
    const g = (await h.post('/coordination/global/request', { cause: 'GLOBAL_PAUSE', scope: 'all',
      transactionId: 'pause-v2', authorization: 'explicit pause all', evidence: ['authorized'] })).body;
    let fired = false; h.native.onRequest = async path => {
      if (path !== '/session/status' || fired) return; fired = true;
      h.native.emit({ type, location: { directory: h.directory }, data: { sessionID: 'ses_a' } }); await delay(50);
    };
    const result = await h.post('/coordination/global/confirm', { ...g, evidence: ['quiescence'] });
    assert.equal(result.body.error, 'native-observation-changed');
    assert.deepEqual(h.native.replies, []);
  });
}

async function directNativeRefusal(t) {
  const value = await unregisteredNativeRefusal(t);
  const { h, recovery, refusal, lookup } = value;
  const stamp = Date.now();
  const direct = (part, index) => ({ type: 'tool', id: 'call_direct' + index,
    name: part === refusal ? 'cgpt-validation_request_validation' : 'cgpt-validation_get_approval',
    executed: false, native: { itemId: 'fc_direct' + index }, time: { created: stamp, ran: stamp + 1, completed: stamp + 2 },
    state: { status: 'error', input: structuredClone(part.state.metadata.toolCalls[0].input),
      error: { type: 'tool.execution', message: part.state.output } } });
  const parts = [direct(refusal, 1), direct(lookup, 2)];
  h.native.messages[recovery.sessionId] = [{ nativeV2: { id: 'msg_direct', type: 'assistant', content: parts } }];
  return { ...value, parts };
}

test('retry MCP direct : refus et lookup natifs conservent la candidate, prévol neuf sous once puis complete', async t => {
  const { h, recovery } = await directNativeRefusal(t);
  const result = await h.post('/runs/refusal/job/recover', { ...recovery, phase: 'retry',
    previousPreflightRequestId: recovery.preflightRequestId, preflightRequestId: 'preflight-direct-next' });
  assert.equal(result.status, 200, JSON.stringify(result));
  assert.equal(result.body.recovery.sessionId, recovery.sessionId);
  assert.equal(result.body.recovery.attempts[0].nativeToolCount, 2);
  assert.deepEqual(h.native.replies, []);
  const run = (await h.get('/runs')).body.runs.find(r => r.runId === 'refusal');
  const { approval, access } = await h.approvedAccess({ ...run, sessionId: recovery.sessionId }, 'preflight-direct-next');
  await h.execute(approval); await h.completeTool(approval);
  const messages = h.native.messages[recovery.sessionId], command = messages.at(-1).parts[0];
  const submitted = messages.find(message => message.parts?.[0]?.state?.input?.requestId === approval.requestId).parts[0];
  submitted.state = { ...submitted.state, status: 'completed', output: JSON.stringify({ ...approval, status: 'APPROVED' }),
    time: { start: command.state.time.start - 2, end: command.state.time.start - 1 } };
  messages.push({ parts: [{ type: 'tool', tool: 'cgpt-validation_broker_readiness', state: { status: 'completed',
    input: {}, output: JSON.stringify({ status: 'READY', pending_count: 0 }),
    time: { start: command.state.time.end + 1, end: command.state.time.end + 2 } } }] });
  assert.equal((await h.releaseOperation(run, approval, access)).status, 200);
  const done = await h.post('/runs/refusal/job/recover', { ...recovery, preflightRequestId: 'preflight-direct-next', phase: 'complete' });
  assert.equal(done.status, 200, JSON.stringify(done));
  assert.equal(done.body.sessionId, recovery.sessionId); assert.equal(done.body.recovery, null);
  assert.equal(h.native.replies.length, 1);
});

for (const kind of ['type-libre', 'item-divergent', 'temps-absent', 'temps-inverse', 'execute-vrai', 'session-divergente',
  'generation-divergente', 'lookup-absent', 'lookup-faux', 'effet-supplementaire', 'marqueur-fabrique', 'refus-non-deterministe']) {
  test('retry MCP direct reste fermé : ' + kind, async t => {
    const { h, recovery, parts } = await directNativeRefusal(t);
    if (kind === 'type-libre') parts[0].state.error = parts[0].state.error.message;
    if (kind === 'item-divergent') parts[0].native.itemId = 'fc_other';
    if (kind === 'temps-absent') delete parts[0].time.ran;
    if (kind === 'temps-inverse') parts[0].time.completed = parts[0].time.created - 1;
    if (kind === 'execute-vrai') parts[0].executed = true;
    if (kind === 'session-divergente') parts[0].state.input.session_id = 'ses_other';
    if (kind === 'generation-divergente') parts[0].state.input.reservation_version++;
    if (kind === 'lookup-absent') parts.pop();
    if (kind === 'lookup-faux') parts[1].state.error.message = 'approval inconnue';
    if (kind === 'effet-supplementaire') parts.push({ type: 'tool', id: 'call_shell', name: 'shell', executed: true,
      time: { created: 1, ran: 2, completed: 3 }, state: { status: 'completed', input: { command: '/usr/bin/true' }, metadata: { exit: 0 } } });
    if (kind === 'marqueur-fabrique') {
      delete parts[0].native; parts[0].state.metadata = { cabDirectMcpError: { itemId: 'fc_forged', envelopeHash: '0'.repeat(64) } };
    }
    if (kind === 'refus-non-deterministe') parts[0].state.input.access_id = 'valid-access';
    const before = (await h.get('/runs/refusal/job')).body;
    const result = await h.post('/runs/refusal/job/recover', { ...recovery, phase: 'retry',
      previousPreflightRequestId: recovery.preflightRequestId, preflightRequestId: 'preflight-direct-next' });
    assert.equal(result.status, 409, JSON.stringify(result));
    assert.deepEqual((await h.get('/runs/refusal/job')).body.recovery, before.recovery);
    assert.deepEqual(h.native.replies, []);
  });
}

test('notification stale avant admission : chaque tentative locale est comptée une fois pour son RUN sans décision', async t => {
  const h = await setup(t); const a = await h.reserve('a'); await h.reserve('b');
  const stale = h.approval(a, 'diagnostic-stale', { [a.resources[0].key]: 1 });
  for (let attempt = 1; attempt <= 3; attempt++) {
    const refused = await h.post('/validation/resource-request', { approval: stale });
    assert.equal(refused.status, 409); assert.equal(refused.body.error, 'resource-revision-stale');
    const stats = (await h.get('/runs/a/statistics')).body.contexts[0];
    assert.equal(stats.httpFailures['resource-revision-stale'], attempt);
    assert.equal(stats.decisions.pending, 0); assert.equal(stats.decisions.rejected, 0);
    assert.equal(stats.decisions.approved, 0); assert.equal(stats.decisions.once, 0);
    const status = (await h.get('/runs/a/status')).body;
    assert.equal(status.undecidedValidationCount, 0); assert.equal(status.activeValidationCount, 0);
  }
  assert.equal((await h.get('/runs/b/statistics')).body.contexts[0].httpFailures['resource-revision-stale'], undefined);
  const registry = (await h.get('/runs')).body;
  assert.equal(registry.requestOwners[stale.requestId], undefined);
  assert.equal(registry.coordination.operations[stale.operation_id], undefined);
  assert.deepEqual(h.native.replies, []);
  const valid = h.approval(a, 'diagnostic-valid');
  assert.equal((await h.post('/validation/resource-request', { approval: valid })).status, 202);
  assert.equal((await h.get('/runs/a/statistics')).body.contexts[0].httpFailures['resource-revision-stale'], 3);
  assert.deepEqual(h.native.replies, []);
});



async function unusedHttpPayload(h, run, lease) {
  const current = (await h.get('/runs/'+run.runId+'/test-resources')).body.reservations.find((r)=>r.transactionId===lease.transactionId);
  const all=(await h.get('/runs')).body.coordination.operations;
  const ops=Object.values(all).filter((op)=>op.runId===run.runId && op.contextId===run.contextId &&
    (op.testReservationId===lease.transactionId || Date.parse(op.preparedAt)>=Date.parse(current.grantedAt)));
  const messages=await h.nativeClient.messages(run.sessionId,h.directory);
  return {version:run.version,transactionId:lease.transactionId,token:lease.token,fencing:lease.fencing,
    contextId:run.contextId,sessionId:run.sessionId,boundaryDigest:current.unusedReleaseBoundary,
    developerAuthorization:'autorisation humaine ciblée de cette réservation sans effet',evidence:['mandats et historique natif examinés'],
    attestation:{noEnvironmentMutation:true,noMutatingMandate:true,operations:ops.map((op)=>
      ({operationId:op.operationId,classification:op.state==='CANCELLED'?'cancelled-without-execution':'read-only-no-effect'}))},
    nativeProof:{messageCount:messages.length,toolCount:messages.flatMap(m=>m.parts.filter(p=>p.type==='tool')).length,historyHash:proofHash(messages)}};
}
async function unusedHttpLease(h, run, transactionId='unused-http') {
  const result=await h.post('/runs/'+run.runId+'/test-resources/acquire',{version:run.version,transactionId,
    resources:run.resources.filter(r=>r.key.startsWith('lxc:')),evidence:['instance canonique examinée']});
  assert.equal(result.status,200,JSON.stringify(result)); return result.body;
}

test('release-unused HTTP : frontière sans opération, reçu exact, FIFO et extend débloqué sans effet natif',async(t)=>{
  const h=await setup(t);const resources=[{key:'lxc:host-a/101',mode:'write'}];
  const a=await h.reserve('a',{resources});const b=await h.reserve('b',{resources});const lease=await unusedHttpLease(h,a);
  const waiting=await h.post('/runs/b/test-resources/acquire',{version:b.version,transactionId:'wait-b',resources,evidence:['même instance']});
  assert.equal(waiting.status,202);
  const extension={version:a.version,resources:[{key:'file:independent.py',mode:'write'}]};
  assert.equal((await h.post('/runs/a/extend',extension)).body.error,'run-accesses-unresolved');
  const p=await unusedHttpPayload(h,a,lease);const replies=h.native.replies.length;
  const result=await h.post('/runs/a/test-resources/release-unused',p);
  assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.unusedReleaseReceipt.mode,'unused-no-effect');
  assert.equal((await h.get('/runs/b/test-resources')).body.reservations[0].state,'HELD');
  assert.deepEqual((await h.post('/runs/a/test-resources/release-unused',p)).body,result.body);
  assert.equal((await h.post('/runs/a/test-resources/release-unused',{...p,evidence:['différent']})).status,409);
  assert.equal((await h.post('/runs/a/test-resources/release',p)).status,409);
  assert.equal((await h.post('/runs/a/extend',extension)).status,200);
  assert.equal(h.native.replies.length,replies);
});

test('release-unused HTTP : fin native exit1 relue même COMPLETED et diagnostic non converti en succès',async(t)=>{
  const h=await setup(t);const a=await h.reserve('a',{resources:[{key:'lxc:host-a/101',mode:'write'}]});
  const lease=await unusedHttpLease(h,a);const op=await h.approvedAccess(a,'readonly-diagnostic');
  await h.execute(op.approval);await h.completeTool(op.approval,1);
  assert.equal((await h.releaseOperation(a,op.approval,op.access)).status,200);
  const p=await unusedHttpPayload(h,a,lease);const result=await h.post('/runs/a/test-resources/release-unused',p);
  assert.equal(result.status,200,JSON.stringify(result));
  assert.equal((await h.get('/runs')).body.coordination.operations[op.approval.operation_id].nativeResult.exit,1);
  assert.equal(h.native.replies.length,1); assert.equal(h.native.replies[0].body.response,'once');
});

test('release-unused HTTP : autorisation, attestations, mutation et preuve incomplète refusées sans nouvelle once',async(t)=>{
  const h=await setup(t);const a=await h.reserve('a',{resources:[{key:'lxc:host-a/101',mode:'write'}]});
  const lease=await unusedHttpLease(h,a);const p=await unusedHttpPayload(h,a,lease);
  for(const change of [x=>delete x.developerAuthorization,x=>x.attestation.noMutatingMandate=false,
    x=>x.attestation.noEnvironmentMutation=false,x=>delete x.nativeProof,x=>x.nativeProof.historyHash='0'.repeat(64),
    x=>x.contextId++,x=>x.sessionId='ses_b',x=>x.token='wrong']){
    const q=structuredClone(p);change(q);const result=await h.post('/runs/a/test-resources/release-unused',q);
    assert.equal(result.status,409,JSON.stringify(result));
    assert.equal((await h.get('/runs/a/test-resources')).body.reservations[0].state,'HELD');
  }
  h.native.busy.ses_a={type:'busy'};
  assert.equal((await h.post('/runs/a/test-resources/release-unused',p)).status,409);h.native.busy={};
  h.native.permissions=[{id:'pending',sessionID:a.sessionId,permission:'bash',metadata:{command:'true'}}];
  assert.equal((await h.post('/runs/a/test-resources/release-unused',p)).status,409);h.native.permissions=[];
  assert.equal(h.native.replies.length,0);
});

test('release-unused HTTP : résultat natif déjà enregistré puis altéré ne peut pas être rescellé',async(t)=>{
  const h=await setup(t);const a=await h.reserve('a',{resources:[{key:'lxc:host-a/101',mode:'write'}]});
  const lease=await unusedHttpLease(h,a);const op=await h.approvedAccess(a,'diagnostic-altered');
  await h.execute(op.approval);await h.completeTool(op.approval,1);await h.releaseOperation(a,op.approval,op.access);
  h.native.messages.ses_a.at(-1).parts[0].state.metadata.exit=0;
  const p=await unusedHttpPayload(h,a,lease);const result=await h.post('/runs/a/test-resources/release-unused',p);
  assert.equal(result.body.error,'test-unused-native-completion-divergent');
  assert.equal((await h.get('/runs/a/test-resources')).body.reservations[0].state,'HELD');
});

test('release-unused HTTP : changement du transcript pendant relecture et outil hors CAB bloquent',async(t)=>{
  const h=await setup(t);const a=await h.reserve('a',{resources:[{key:'lxc:host-a/101',mode:'write'}]});
  const lease=await unusedHttpLease(h,a);const p=await unusedHttpPayload(h,a,lease);let reads=0;
  h.native.onRequest=async(path)=>{if(path==='/session/ses_a/message' && ++reads===2)
    h.native.messages.ses_a=[{info:{id:'msg_late',role:'user',time:{created:Date.now()}},parts:[{type:'text',text:'late'}]}];};
  assert.equal((await h.post('/runs/a/test-resources/release-unused',p)).body.error,'test-unused-boundary-stale');
  h.native.onRequest=null;const stamp=Date.now()+1;
  h.native.messages.ses_a.push({info:{id:'msg_untracked',role:'assistant',time:{created:stamp}},parts:[{type:'tool',tool:'bash',callID:'call_untracked',
    state:{status:'completed',input:{command:'/usr/bin/true'},time:{start:stamp,end:stamp+1},metadata:{exit:0}}}]});
  const q=await unusedHttpPayload(h,a,lease);
  assert.equal((await h.post('/runs/a/test-resources/release-unused',q)).body.error,'test-unused-native-tool-unreviewable');
  assert.equal((await h.get('/runs/a/test-resources')).body.reservations[0].state,'HELD');assert.equal(h.native.replies.length,0);
});


test('release-unused HTTP : mandat courant, restauration, compaction et fin absente conservent HELD',async(t)=>{
  const h=await setup(t);const a=await h.reserve('a',{resources:[{key:'lxc:host-a/101',mode:'write'}]});
  const lease=await unusedHttpLease(h,a);let p=await unusedHttpPayload(h,a,lease);
  assert.equal((await h.post('/runs/a/job/progress',{jobId:'job-a',currentCabMandate:'inspection en cours'})).status,202);
  assert.equal((await h.post('/runs/a/test-resources/release-unused',p)).body.error,'run-not-quiescent');
  assert.equal((await h.post('/runs/a/job/progress',{jobId:'job-a',currentCabMandate:''})).status,202);
  const stamp=Date.now()+1;
  h.native.messages.ses_a=[{nativeV2:{id:'msg_compaction',type:'compaction',time:{created:stamp}}}];
  p=await unusedHttpPayload(h,a,lease);
  assert.equal((await h.post('/runs/a/test-resources/release-unused',p)).body.error,'test-unused-history-incomplete');
  h.native.messages.ses_a=[{info:{id:'msg_running',role:'assistant',time:{created:stamp}},parts:[{type:'tool',tool:'read',callID:'call_running',
    state:{status:'running',input:{path:'/test'},time:{start:stamp},metadata:{}}}]}];
  p=await unusedHttpPayload(h,a,lease);
  assert.equal((await h.post('/runs/a/test-resources/release-unused',p)).body.error,'test-unused-history-incomplete');
  h.native.messages.ses_a=[];p=await unusedHttpPayload(h,a,lease);await h.stop();await h.start();
  assert.equal((await h.post('/runs/a/test-resources/release-unused',p)).body.error,'test-reconciliation-required');
  assert.equal((await h.get('/runs/a/test-resources')).body.reservations[0].state,'HELD');
});

test('release-unused HTTP : course de permission et indisponibilité native refusent sans réparation',async(t)=>{
  const h=await setup(t);const a=await h.reserve('a',{resources:[{key:'lxc:host-a/101',mode:'write'}]});
  const lease=await unusedHttpLease(h,a);const p=await unusedHttpPayload(h,a,lease);let reads=0;
  h.native.onRequest=async(path)=>{if(path==='/session/ses_a/message' && ++reads===1)
    h.native.permissions=[{id:'late-native',sessionID:a.sessionId,permission:'bash',metadata:{command:'true'}}];};
  assert.equal((await h.post('/runs/a/test-resources/release-unused',p)).body.error,'native-session-not-quiescent');
  h.native.permissions=[];h.native.onRequest=async(path)=>{if(path==='/session/ses_a/message')h.native.messages.ses_a=[{nativeV2:{id:'msg_bad',type:'assistant',content:'invalid',time:{created:Date.now()}}}];};
  assert.equal((await h.post('/runs/a/test-resources/release-unused',p)).body.error,'test-unused-history-unavailable');
  assert.equal((await h.get('/runs/a/test-resources')).body.reservations[0].state,'HELD');assert.equal(h.native.replies.length,0);
});


test('diagnostic décision HTTP : trois ressources, révision périmée et rejet sans once supplémentaire',async t=>{
 const h=await setup(t);const shared={key:'file:shared.txt',mode:'read'};
 const a=await h.reserve('a',{resources:[shared,{key:'file:config.yaml',mode:'read'},{key:'resource:cli',mode:'read'}]});
 const b=await h.reserve('b',{resources:[{...shared,mode:'write'}]});
 const approval=h.approval(a,'decision-stale');assert.equal((await h.post('/validation/request',{approval})).status,202);
 const writer=await h.approvedAccess(b,'concurrent-writer');await h.execute(writer.approval);await h.completeTool(writer.approval);await h.releaseOperation(b,writer.approval,writer.access);
 const replies=h.native.replies.length;
 assert.equal((await h.get('/runs/a/decision/decision-stale/admission')).body.admission.state,'STABLE');
 const result=await h.post('/runs/a/decision/decision-stale',{decision:'approved'});
 assert.equal(result.status,400);assert.equal(result.body.error,'resource-revision-stale');assert.equal(result.body.decision_recorded,false);
 assert.equal((await h.get('/runs/a/decision/decision-stale')).status,404);
 assert.equal((await h.get('/runs/a/status')).body.undecidedValidationCount,1);assert.equal(h.native.replies.length,replies);
 assert.equal((await h.post('/runs/a/decision/decision-stale',{decision:'rejected'})).status,201);
 assert.equal(h.native.replies.length,replies);
});

test('diagnostic décision HTTP : succès inchangé, doublon explicite et garde native409 préservée',async t=>{
 const h=await setup(t);const a=await h.reserve('a');const approval=h.approval(a,'decision-success');
 await h.post('/validation/request',{approval});
 assert.equal((await h.post('/runs/a/decision/decision-success',{decision:'invalid'})).body.error,'decision-invalid');
 h.native.rules.ses_a=[{permission:'shell',pattern:'*',action:'deny'}];
 const denied=await h.post('/runs/a/decision/decision-success',{decision:'approved'});assert.equal(denied.status,409);assert.equal(denied.body.error,'native-permission-ask-required');
 h.native.rules.ses_a=[{permission:'*',pattern:'*',action:'ask'}];
 assert.equal((await h.post('/runs/a/decision/decision-success',{decision:'approved'})).status,201);
 const first=(await h.get('/runs/a/decision/decision-success')).body;
 const duplicate=await h.post('/runs/a/decision/decision-success',{decision:'rejected'});
 assert.equal(duplicate.status,400);assert.equal(duplicate.body.error,'decision-already-recorded');assert.equal(duplicate.body.decision_recorded,true);
 assert.deepEqual((await h.get('/runs/a/decision/decision-success')).body,first);assert.equal(h.native.replies.length,0);
});

test('diagnostic décision HTTP : révision modifiée pendant la vérification native reste bloquante',async t=>{
 const h=await setup(t);const resource={key:'file:race.txt',mode:'read'};
 const a=await h.reserve('a',{resources:[resource]});const b=await h.reserve('b',{resources:[{...resource,mode:'write'}]});
 const approval=h.approval(a,'decision-race');await h.post('/validation/request',{approval});let changed=false;
 h.native.onRequest=async path=>{if(path==='/session/ses_a'&&!changed){changed=true;const writer=await h.approvedAccess(b,'writer-during-guard');await h.execute(writer.approval);await h.completeTool(writer.approval);await h.releaseOperation(b,writer.approval,writer.access);}};
 const result=await h.post('/runs/a/decision/decision-race',{decision:'approved'});
 assert.equal(result.status,400);assert.equal(result.body.error,'resource-revision-stale');assert.equal(result.body.decision_recorded,false);
 assert.equal((await h.get('/runs/a/decision/decision-race')).status,404);assert.equal(h.native.replies.length,1);
});


test('diagnostic décision HTTP : transition de reminder tardive signalée sans décision',async t=>{
 const h=await setup(t);const a=await h.reserve('a');const approval=h.approval(a,'decision-reminder-race');
 await h.post('/validation/request',{approval});assert.equal((await h.get('/runs/a/decision/'+approval.requestId+'/admission')).body.admission.state,'STABLE');let count=0,release,entered,reminder;
 const parked=new Promise(resolve=>{release=resolve;});const waiting=new Promise(resolve=>{entered=resolve;});
 h.native.onRequest=async path=>{
  if(path!=='/session/ses_a')return;
  if(++count===1){reminder=h.post('/runs/a/validation/reminder',{approval});await waiting;}
  else if(count===2){entered();await parked;}
 };
 let result;
 try{result=await h.post('/runs/a/decision/decision-reminder-race',{decision:'approved'});}
 finally{release();}
 assert.equal(result.status,400);assert.equal(result.body.error,'run-transition-in-flight');assert.equal(result.body.decision_recorded,false);assert.deepEqual(result.body.admission,{state:'BUSY',snapshot_only:true});
 assert.equal((await reminder).status,202);assert.equal((await h.get('/runs/a/decision/decision-reminder-race')).status,404);
 assert.equal(h.native.replies.length,0);
});

test('transition modèle HTTP : choix explicite libre, même job historique et reprise durable',async t=>{
 const h=await setup(t,{codingPolicy:true});const run=await h.reserve('hot');
 h.native.sessions.ses_hot={id:'ses_hot',directory:h.directory,model:{providerID:'provider1',modelID:'model1',variant:'medium'}};
 const paused=await h.post('/runs/hot/suspend',{version:run.version,action:'PAUSE',evidence:['explicit-human-boundary']});assert.equal(paused.status,200,JSON.stringify(paused));
 const before=(await h.get('/runs/hot/job')).body;assert.equal(before.codingModel,undefined);
 const base={transactionId:'hot-switch',developerAuthorization:'human-transition-ref',jobId:before.jobId,sessionId:before.sessionId,runVersion:paused.body.version};
 // Un choix explicite doit fonctionner même sans catalogue PLLM valide.
 writeFileSync(h.native.catalogPath,JSON.stringify({invalid:true}));
 const prepared=await h.post('/runs/hot/job/model-transition',{...base,phase:'prepare',expectedModelHash:before.modelContractHash,
  selection:{model:'provider2/model2',reasoning:'low'}});assert.equal(prepared.status,200,JSON.stringify(prepared));
 assert.equal(prepared.body.transition.before,null);
 const rearm=await h.post('/runs/hot/job/arm',{jobId:before.jobId,sessionId:before.sessionId,directory:h.directory,changeId:before.changeId,criteria:['unrelated']});
 assert.equal(rearm.body.error,'model-transition-pending');
 const stamp=Date.now();h.native.sessions.ses_probe.model={providerID:'provider2',modelID:'model2',variant:'low'};
 h.native.messages.ses_probe=[{info:{id:'msg_hot_user',sessionID:'ses_probe',role:'user',time:{created:stamp}},parts:[{type:'text',text:'probe'}]},
  {info:{id:'msg_hot_reply',sessionID:'ses_probe',role:'assistant',finish:'stop',parentID:'msg_hot_user',providerID:'provider2',modelID:'model2',variant:'low',time:{created:stamp,completed:stamp}},parts:[{type:'text',text:'probe ok'}]}];
 const committed=await h.post('/runs/hot/job/model-transition',{...base,phase:'commit',preflight:{sessionId:'ses_probe',messageId:'msg_hot_reply'}});
 assert.equal(committed.status,200,JSON.stringify(committed));assert.equal(committed.body.codingModel.providerID,'provider2');assert.equal(committed.body.codingModel.reasoning,'low');
 const after=(await h.get('/runs/hot/job')).body;assert.equal(after.jobId,before.jobId);assert.equal(after.sessionId,before.sessionId);
 assert.deepEqual(after.criteria,before.criteria);assert.equal(after.modelTransitionHistory[0].before,null);assert.equal(after.modelTransition,null);
 assert.equal(h.native.replies.length,0);assert.equal((await h.get('/runs/hot/status')).body.coordination.suspension.action,'PAUSE');
 await h.stop();await h.start();assert.deepEqual((await h.get('/runs/hot/job')).body.modelTransitionHistory,after.modelTransitionHistory);
});

test('transition modèle HTTP : sans choix explicite adopte la PLLM actuelle et conserve source prompt antérieure',async t=>{
 const h=await setup(t,{codingPolicy:true});const run=(await h.post('/runs/reserve',h.candidate('hot-auto'))).body;
 h.native.sessions['ses_hot-auto']={id:'ses_hot-auto',directory:h.directory,model:{providerID:'provider1',modelID:'model1',variant:'medium'}};
 const arm=await h.post('/runs/hot-auto/job/arm',{jobId:'job-hot-auto',sessionId:run.sessionId,directory:h.directory,changeId:run.changeId,
  strictCommands:true,criteria:['preserve-known-write'],modelSelectionProtocol:'pllm-auto-v1',modelSelection:{model:'provider1/model1'},
  modelPreflight:{sessionId:'ses_probe',messageId:'msg_response'}});assert.equal(arm.status,201,JSON.stringify(arm));
 const old=arm.body.codingModel;assert.equal(old.source,'prompt');assert.equal(old.mode,null);
 await h.post('/runs/hot-auto/suspend',{version:run.version,action:'PAUSE',evidence:['human-auto-boundary']});
 const catalog=JSON.parse(readFileSync(h.native.catalogPath,'utf8'));catalog.selected_mode='mode2';catalog.models[0].state='Invalide';catalog.models[0].selected=false;catalog.models[1].selected=true;writeFileSync(h.native.catalogPath,JSON.stringify(catalog));
 const before=(await h.get('/runs/hot-auto/job')).body;
 const base={transactionId:'hot-auto-switch',developerAuthorization:'human-auto-ref',jobId:before.jobId,sessionId:before.sessionId,runVersion:run.version};
 const p=await h.post('/runs/hot-auto/job/model-transition',{...base,phase:'prepare',expectedModelHash:before.modelContractHash});assert.equal(p.status,200,JSON.stringify(p));
 assert.equal(p.body.transition.candidate.mode,'mode2');
 const resume=await h.post('/runs/hot-auto/suspend',{version:run.version,action:'RESUME',evidence:['too-early']});assert.equal(resume.body.error,'model-transition-pending');
 const stamp=Date.now();h.native.sessions.ses_probe.model={providerID:'provider2',modelID:'model2',variant:'medium'};
 h.native.messages.ses_probe=[{info:{id:'msg_auto_user',sessionID:'ses_probe',role:'user',time:{created:stamp}},parts:[{type:'text',text:'probe'}]},
  {info:{id:'msg_auto_reply',sessionID:'ses_probe',role:'assistant',finish:'stop',parentID:'msg_auto_user',providerID:'provider2',modelID:'model2',variant:'medium',time:{created:stamp,completed:stamp}},parts:[{type:'text',text:'probe ok'}]}];
 const result=await h.post('/runs/hot-auto/job/model-transition',{...base,phase:'commit',preflight:{sessionId:'ses_probe',messageId:'msg_auto_reply'}});assert.equal(result.status,200,JSON.stringify(result));
 const after=(await h.get('/runs/hot-auto/job')).body;assert.equal(after.codingModel.source,'pllm-automatic');assert.equal(after.codingModel.mode,'mode2');
 assert.deepEqual(after.modelTransitionHistory[0].before,old);assert.deepEqual(after.criteria,before.criteria);assert.equal(h.native.replies.length,0);
});

test('admission observée : BUSY refuse la décision, pair isolé puis même demande STABLE',async t=>{
 const h=await setup(t);const a=await h.reserve('a'),b=await h.reserve('b');
 const approval=h.approval(a,'admission-busy');await h.post('/validation/request',{approval});
 let release,entered;const parked=new Promise(r=>{release=r}),waiting=new Promise(r=>{entered=r});
 h.native.onRequest=async path=>{if(path==='/session/ses_a'){entered();await parked;}};
 const reminder=h.post('/runs/a/validation/reminder',{approval});await waiting;
 try{
  const observed=await h.get('/runs/a/decision/'+approval.requestId+'/admission');
  assert.equal(observed.status,200);assert.deepEqual(observed.body.admission,{state:'BUSY',snapshot_only:true});
  assert.equal(observed.body.owner_registered,true);assert.equal(observed.body.validation_registered,true);assert.equal(observed.body.decision_recorded,false);
  assert.equal((await h.get('/runs/a/status')).body.admission.state,'BUSY');
  assert.equal((await h.get('/runs/b/status')).body.admission.state,'STABLE');
  const refused=await h.post('/runs/a/decision/'+approval.requestId,{decision:'approved'});
  assert.equal(refused.status,409);assert.equal(refused.body.error,'run-transition-in-flight');assert.equal(refused.body.decision_recorded,false);assert.equal(refused.body.admission.state,'BUSY');
  assert.equal((await h.get('/runs/a/decision/'+approval.requestId)).status,404);assert.equal(h.native.replies.length,0);
  const unknown=await h.post('/runs/a/decision/unknown-request',{decision:'approved'});assert.equal(unknown.status,409);assert.equal(unknown.body.decision_recorded,null);
  const peer=h.approval(b,'admission-peer');assert.equal((await h.post('/validation/request',{approval:peer})).status,202);
  assert.equal((await h.post('/runs/b/decision/'+peer.requestId,{decision:'approved'})).status,201);
 }finally{release();}
 assert.equal((await reminder).status,202);h.native.onRequest=undefined;
 const stable=await h.get('/runs/a/decision/'+approval.requestId+'/admission');assert.equal(stable.body.admission.state,'STABLE');assert.equal(stable.body.decision_recorded,false);
 assert.equal((await h.post('/runs/a/decision/'+approval.requestId,{decision:'approved'})).status,201);
 const decided=await h.get('/runs/a/decision/'+approval.requestId+'/admission');assert.equal(decided.body.decision_recorded,true);
 const before=(await h.get('/runs/a/decision/'+approval.requestId)).body;
 assert.equal((await h.post('/runs/a/decision/'+approval.requestId,{decision:'rejected'})).status,400);
 assert.deepEqual((await h.get('/runs/a/decision/'+approval.requestId)).body,before);assert.equal(h.native.replies.length,0);
});

test('admission ciblée : inconnue explicite, propriétaire étranger refusé et lectures sans mutation',async t=>{
 const h=await setup(t);const a=await h.reserve('a');await h.reserve('b');
 const unknown=await h.get('/runs/a/decision/unknown/admission');assert.equal(unknown.status,404);assert.equal(unknown.body.owner_registered,false);
 assert.equal(unknown.body.validation_registered,false);assert.equal(unknown.body.decision_recorded,null);assert.deepEqual(unknown.body.admission,{state:'STABLE',snapshot_only:true});
 const approval=h.approval(a,'admission-owned');await h.post('/validation/request',{approval});
 const before=(await h.get('/runs')).body;
 assert.equal((await h.get('/runs/a/decision/'+approval.requestId+'/admission')).status,200);
 const foreign=await h.get('/runs/b/decision/'+approval.requestId+'/admission');assert.equal(foreign.status,409);assert.equal(foreign.body.error,'decision-run-divergent');
 assert.equal(foreign.body.decision_recorded,undefined);assert.deepEqual((await h.get('/runs')).body,before);assert.equal(h.native.replies.length,0);
});

test('porte-mandat HTTP : staging sans décision/accès, substitution et livraison anticipée refusées',async t=>{
 const h=await setup(t);const a=await h.reserve('a');await h.reserve('b');
 const payload='printf "reviewed\\n"\n';const input={stageId:'stage-http',jobId:'job-a',sessionId:a.sessionId,reservationVersion:a.version,requestId:'request-carrier',approvalId:'approval-carrier',operationId:'op-carrier',payload,payloadSha256:createHash('sha256').update(payload).digest('hex')};
 const before=(await h.get('/runs')).body;const created=await h.post('/runs/a/shell-stage',input);assert.equal(created.status,201,JSON.stringify(created));
 assert.equal(created.body.payload,undefined);assert.ok(created.body.command.includes(input.payloadSha256));assert.deepEqual((await h.get('/runs')).body,before);
 assert.equal((await h.get('/runs/a/shell-stage/stage-http/payload')).status,409);assert.equal((await h.get('/runs/b/shell-stage/stage-http')).status,409);
 assert.deepEqual((await h.post('/runs/a/shell-stage',Object.fromEntries(Object.entries(input).reverse()))).body,created.body);
 const changed={...input,payload:payload+'#different',payloadSha256:createHash('sha256').update(payload+'#different').digest('hex')};
 assert.equal((await h.post('/runs/a/shell-stage',changed)).body.error,'shell-stage-identity-divergent');
 assert.equal((await h.post('/runs/a/shell-stage',{...input,jobId:'foreign'})).status,409);assert.equal(h.native.replies.length,0);
 h.native.rules[a.sessionId]=[{permission:'shell',pattern:'*',action:'allow'}];assert.equal((await h.post('/runs/a/shell-stage',input)).body.error,'native-permission-ask-required');h.native.rules[a.sessionId]=[{permission:'*',pattern:'*',action:'ask'}];
 await h.stop();await h.start();assert.deepEqual((await h.get('/runs/a/shell-stage/stage-http')).body,created.body);
 assert.equal((await h.get('/runs/a/shell-stage/stage-http/payload')).status,409);
});


test('projection moniteur HTTP : navigation exacte sans registre privé ni mutation',async t=>{
 const h=await setup(t);await h.reserve('a');await h.reserve('b');const before=(await h.get('/runs')).body;
 const {status,body}=await h.get('/monitor/runs');assert.equal(status,200);assert.equal(body.snapshot_only,true);assert.equal(body.totalRuns,2);assert.equal(body.truncated,false);
 for(const run of before.runs){const row=body.runs.find(r=>r.runId===run.runId);for(const k of ['runId','changeId','sessionId','version','state','phase'])assert.equal(row[k],run[k]??null);}
 assert.equal(body.coordination,undefined);assert.equal(body.requestOwners,undefined);assert.equal(body.history,undefined);assert.deepEqual((await h.get('/runs')).body,before);assert.equal(h.native.replies.length,0);
});
