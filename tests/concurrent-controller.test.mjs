import { fixtureEnvironment } from './helpers/cab-environment.mjs';
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
import { ResourceRunRegistry } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs';

const controllerPath = fileURLToPath(new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs', import.meta.url));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(check) {
  for (let i = 0; i < 200; i++) { if (await check()) return; await delay(20); }
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
    native.providers={connected:catalog.models.map(m=>m.provider),all:catalog.models.map(m=>({id:m.provider,models:{[m.model_id]:{variants:{high:{},xhigh:{},low:{}}}}}))};
    native.messages.ses_probe=[{info:{id:'msg_user',sessionID:'ses_probe',role:'user',model:{providerID:'provider1',modelID:'model1'},variant:'high'},parts:[]},
      {info:{id:'msg_response',sessionID:'ses_probe',role:'assistant',finish:'stop',parentID:'msg_user',providerID:'provider1',modelID:'model1',time:{completed:Date.now()-10}},parts:[{type:'text',text:'probe ok'}]}];
  }
  const eventStreams = new Set();
  native.emit = (event) => { for (const stream of eventStreams) stream.write('data: ' + JSON.stringify(event) + '\n\n'); };
  const children = [];
  const opencode = createServer(async (request, response) => {
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
  });
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
      try { return (await fetch(base + '/status')).ok; } catch { return false; } });
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
  async function completeTool(value) {
    const op = (await get('/runs')).body.coordination.operations[value.operation_id];
    const stamp = Math.max(Date.now(), op.native.startedAt) + 1;
    const part = { type: 'tool', id: 'part-' + value.requestId, callID: 'call-' + value.requestId,
      sessionID: value.session_id, tool: value.commands.length ? 'bash' : 'edit', state: { status: 'completed',
        input: value.commands.length ? { command: value.commands[0] } : { filePath: directory + '/' + value.files[0] },
        time: { start: stamp, end: stamp + 1 }, metadata: { exit: 0 } } };
    native.messages[value.session_id].push({ parts: [part] });
    native.emit({ type: 'message.part.updated', properties: { part } });
  }
  async function releaseOperation(run, value, access) {
    const current = access || (await get('/runs/' + run.runId + '/locks')).body.accesses.find((a) => a.accessId === value.operation_id);
    return post('/runs/' + run.runId + '/locks/release', { version: run.version, operationId: current.accessId,
      token: current.token, fencing: current.fencing, outcome: 'COMPLETED', evidence: ['native effects reviewed'] });
  }
  return { native, children, directory, base, get, post, candidate, reserve, approval, start, stop,
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
  h.native.busy = { ses_b: { type: 'invalid' } }; assert.equal((await confirm()).body.error, 'native-reconciliation-invalid');
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
    await h.post('/runs/b/suspend', { version: b.version, action: 'PAUSE', evidence: ['targeted pause'] });
  };
  assert.equal((await h.post('/coordination/global/confirm', { ...g, evidence: ['quiescence'] })).body.error, 'native-observation-changed');
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
  assert.equal(initialized.result.serverInfo.version, '1.10.4');
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
    h.native.messages.ses_a_new.flatMap((m) => m.parts)))).digest('hex');
  const payload = { ...recovery, phase: 'complete', developerAuthorization: 'accord-ciblé-fixture',
    restoredPreflightProof: { nativeToolCount: 3, nativeToolHash: hash(), decision,
      blockedGateValidatedAt: gate.body.validatedAt } };
  const history = structuredClone(h.native.messages.ses_a_new);
  await h.stop(); await h.start();
  await h.post('/broker/readiness', { status: 'READY', pending_count: 0,
    by_run: { a: { pending_count: 0 }, b: { pending_count: 0 } } });
  h.native.messages.ses_a_new[0].parts[0].state.input.resources = [{ key: 'file:src/foreign.py', mode: 'write' }];
  const changed = structuredClone(payload); changed.restoredPreflightProof.nativeToolHash = hash();
  assert.equal((await h.post('/runs/a/job/recover', changed)).body.error, 'preflight-approval-divergent');
  h.native.messages.ses_a_new = history;
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
  await h.start(); await h.post('/broker/readiness',{status:'READY',pending_count:0});
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


test('PLLM HTTP : défaut high, prévol exact, choix persisté et modèle du job immuable', async(t)=>{
 const h=await setup(t,{codingPolicy:true});
 const resolved=await h.post('/model-policy/resolve',{});assert.equal(resolved.status,200,JSON.stringify(resolved));
 assert.equal(resolved.body.reasoning,'high');assert.equal(resolved.body.preflightRequired,true);
 const run=(await h.post('/runs/reserve',h.candidate('a'))).body;
 const arm={jobId:'job-a',sessionId:run.sessionId,directory:h.directory,changeId:run.changeId,strictCommands:true,criteria:['delivery'],
   modelSelectionProtocol:'pllm-auto-v1',modelSelection:{},modelPreflight:{sessionId:'ses_probe',messageId:'msg_response'}};
 assert.equal((await h.post('/runs/a/job/arm',{...arm,modelSelection:0})).body.error,'model-selection-input-invalid');
 h.native.messages.ses_probe[0].info.variant='low';
 assert.equal((await h.post('/runs/a/job/arm',arm)).body.error,'model-preflight-not-proved');
 h.native.messages.ses_probe[0].info.variant='high';
 const armed=await h.post('/runs/a/job/arm',arm);assert.equal(armed.status,201,JSON.stringify(armed));
 assert.equal(armed.body.codingModel.modelID,'model1');assert.equal(armed.body.codingModel.reasoning,'high');
 const selected=armed.body.codingModel;await h.stop();await h.start();
 assert.deepEqual((await h.get('/runs/a/job')).body.codingModel,selected);
 assert.equal((await h.post('/runs/a/job/arm',{...arm,codingModel:selected})).body.error,'model-selection-server-owned');
 h.native.messages.ses_probe[0].info.model={providerID:'provider2',modelID:'model2'};
 h.native.messages.ses_probe[1].info.providerID='provider2';h.native.messages.ses_probe[1].info.modelID='model2';
 const changed=await h.post('/runs/a/job/arm',{...arm,modelSelection:{model:'provider2/model2'}});
 assert.equal(changed.status,400);assert.equal(changed.body.error,'job-coding-model-immutable');
 assert.deepEqual((await h.get('/runs/a/job')).body.codingModel,selected);
});

test('PLLM HTTP : xhigh puis priorité inférieure, modèle explicite incompatible bloqué',async(t)=>{
 const h=await setup(t,{codingPolicy:true});
 h.native.providers.all[0].models.model1.variants={xhigh:{}};
 assert.equal((await h.post('/model-policy/resolve',{})).body.reasoning,'xhigh');
 h.native.providers.all[0].models.model1.variants={low:{}};
 assert.equal((await h.post('/model-policy/resolve',{})).body.mode,'mode2');
 assert.equal((await h.post('/model-policy/resolve',{model:'provider1/model1'})).body.error,'explicit-model-unavailable');
 assert.equal((await h.post('/model-policy/resolve',{model:'provider1/model1',reasoning:'low'})).body.reasoning,'low');
});


test('PLLM HTTP : refus natifs high/xhigh corrélés autorisent le repli mais 429 bloque',async(t)=>{
 const h=await setup(t,{codingPolicy:true});
 const reject=(reasoning,status=400)=>{
  const name=reasoning+'-'+status;const user=structuredClone(h.native.messages.ses_probe[0]);
  user.info.id='msg_user_'+name;user.info.variant=reasoning;
  const response=structuredClone(h.native.messages.ses_probe[1]);response.info.id='msg_bad_'+name;response.info.parentID=user.info.id;
  response.info.error={name:'APIError',data:{statusCode:status,responseBody:JSON.stringify({error:{code:'unsupported_value',param:'reasoning_effort',message:'diagnostic privé fictif'}})}};
  response.parts=[];h.native.messages.ses_probe.push(user,response);
  return {sessionId:'ses_probe',messageId:response.info.id};
 };
 const high=reject('high');const xhigh=reject('xhigh');
 assert.equal((await h.post('/model-policy/resolve',{unavailablePreflights:[high]})).body.reasoning,'xhigh');
 const next=await h.post('/model-policy/resolve',{unavailablePreflights:[high,xhigh]});
 assert.equal(next.body.mode,'mode2');assert.equal(next.body.unavailabilityProofs.length,2);
 assert.equal(JSON.stringify(next.body).includes('diagnostic privé fictif'),false);
 assert.equal((await h.post('/model-policy/resolve',{model:'provider1/model1',unavailablePreflights:[high,xhigh]})).body.error,'explicit-model-unavailable');
 assert.equal((await h.post('/model-policy/resolve',{unavailablePreflights:[reject('high',429)]})).body.error,'model-unavailability-not-proved');
});


test('Budget /provider fourni par la session : bornes exactes, portée locale et confidentialité',async(t)=>{
 const h=await setup(t,{codingPolicy:true});const marker='DONNEE_PRIVEE_SYNTHETIQUE';
 h.native.providers.privatePadding=marker+'x'.repeat(3*1024*1024);
 const bytes=Buffer.byteLength(JSON.stringify(h.native.providers));
 assert.equal((await h.post('/model-policy/resolve',{})).body.error,'model-observation-too-large');
 for(const value of [0,-1,1.5,'8000000',null,Number.MAX_SAFE_INTEGER+1]){
  const observations=()=>h.native.requests.filter(p=>p==='/provider'||p.startsWith('/session/ses_probe')).length;
  const before=observations();
  const result=await h.post('/model-policy/resolve',{providerMaxBytes:value});
  assert.equal(result.body.error,'model-selection-input-invalid');assert.equal(observations(),before);
 }
 assert.equal((await h.post('/model-policy/resolve',{providerMaxBytes:bytes-1})).body.error,'model-observation-too-large');
 const exact=await h.post('/model-policy/resolve',{providerMaxBytes:bytes});assert.equal(exact.status,200);assert.equal(exact.body.reasoning,'high');
 assert.ok(!JSON.stringify(exact).includes(marker));
 assert.equal((await h.post('/model-policy/resolve',{})).body.error,'model-observation-too-large');
 const run=(await h.post('/runs/reserve',h.candidate('a'))).body;
 const arm={jobId:'job-a',sessionId:run.sessionId,directory:h.directory,changeId:run.changeId,strictCommands:true,criteria:['budget'],modelSelectionProtocol:'pllm-auto-v1',modelSelection:{providerMaxBytes:bytes},modelPreflight:{sessionId:'ses_probe',messageId:'msg_response'}};
 h.native.sessions.ses_probe={privatePadding:marker+'x'.repeat(2*1024*1024)};
 assert.equal((await h.post('/runs/a/job/arm',arm)).body.error,'model-observation-too-large');
 delete h.native.sessions.ses_probe;
 h.native.messages.ses_probe[1].parts.push({type:'text',text:marker+'x'.repeat(2*1024*1024)});
 assert.equal((await h.post('/runs/a/job/arm',arm)).body.error,'model-observation-too-large');
 h.native.messages.ses_probe[1].parts.pop();
 const armed=await h.post('/runs/a/job/arm',arm);assert.equal(armed.status,201,JSON.stringify(armed));
 assert.ok(!JSON.stringify(armed).includes(marker));assert.ok(!JSON.stringify((await h.get('/runs/a/job')).body).includes(marker));
 h.native.providers.privatePadding=marker+'x'.repeat(17*1024*1024);
 const larger=Buffer.byteLength(JSON.stringify(h.native.providers));assert.ok(larger>16*1024*1024);
 assert.equal((await h.post('/model-policy/resolve',{model:'provider1/model1',providerMaxBytes:larger})).status,200);
});


test('Raccord HTTP préparé : catalogue transmis, alias natif, variante imbriquée et job conservé',async(t)=>{
 const h=await setup(t,{codingPolicy:true,prepareCatalog:true,environment:{CAB_TEST_PRIVATE_OPTION:'NE_PAS_RESTITUER'}});
 const catalog=JSON.parse(readFileSync(h.native.catalogPath,'utf8'));catalog.models[0].provider='opencodego';writeFileSync(h.native.catalogPath,JSON.stringify(catalog));
 h.native.providers.all[0].id='opencode-go';h.native.providers.connected[0]='opencode-go';
 const parent=h.native.messages.ses_probe[0].info;parent.model={providerID:'opencode-go',modelID:'model1',variant:'high'};delete parent.variant;
 h.native.messages.ses_probe[1].info.providerID='opencode-go';h.native.messages.ses_probe[1].info.variant='high';
 const resolved=await h.post('/model-policy/resolve',{});assert.equal(resolved.status,200,JSON.stringify(resolved));
 assert.equal(h.native.preparation.source,'active-skill');assert.equal(resolved.body.source,'pllm-automatic');assert.equal(resolved.body.providerID,'opencode-go');assert.equal(resolved.body.logicalProviderID,'opencodego');
 assert.ok(!JSON.stringify(resolved).includes('NE_PAS_RESTITUER'));
 const run=(await h.post('/runs/reserve',h.candidate('a'))).body;
 const arm={jobId:'job-a',sessionId:run.sessionId,directory:h.directory,changeId:run.changeId,strictCommands:true,criteria:['raccord'],modelSelectionProtocol:'pllm-auto-v1',modelSelection:{},modelPreflight:{sessionId:'ses_probe',messageId:'msg_response'}};
 const bad=structuredClone(arm);parent.variant='low';assert.equal((await h.post('/runs/a/job/arm',bad)).body.error,'model-preflight-not-proved');delete parent.variant;
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
  user.info.model={providerID:'opencode-go',modelID:'model1',variant:reasoning};delete user.info.variant;
  const response=structuredClone(h.native.messages.ses_probe[1]);Object.assign(response.info,{id:'msg_bad_'+name,parentID:user.info.id,providerID:'opencode-go',variant:contradiction?'low':reasoning});
  response.info.error={name:'APIError',data:{statusCode:status,responseBody:JSON.stringify({error:{code:'unsupported_value',param:'reasoning_effort',message:'PRIVE_SYNTHETIQUE'}})}};
  response.parts=[];h.native.messages.ses_probe.push(user,response);return {sessionId:'ses_probe',messageId:response.info.id};
 };
 const high=reject('high');const xhigh=reject('xhigh');
 const first=await h.post('/model-policy/resolve',{unavailablePreflights:[high]});assert.equal(first.status,200,JSON.stringify(first));assert.equal(first.body.reasoning,'xhigh');assert.equal(first.body.providerID,'opencode-go');
 const lower=await h.post('/model-policy/resolve',{unavailablePreflights:[high,xhigh]});assert.equal(lower.status,200);assert.equal(lower.body.mode,'mode2');assert.ok(!JSON.stringify(lower).includes('PRIVE_SYNTHETIQUE'));
 for(const reference of [reject('high',429),reject('high',401),reject('high',400,true)])assert.equal((await h.post('/model-policy/resolve',{unavailablePreflights:[reference]})).body.error,'model-unavailability-not-proved');
});
