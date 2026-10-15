import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import test from 'node:test';

const controllerPath = fileURLToPath(new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs', import.meta.url));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(check) {
  for (let i = 0; i < 200; i++) { if (await check()) return; await delay(20); }
  throw new Error('condition not reached');
}
async function setup(t) {
  const directory = mkdtempSync(join(tmpdir(), 'cab-concurrent-'));
  const native = { permissions: [], replies: [], busy: {}, messages: {}, rules: {} };
  const children = [];
  const opencode = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/global/event') {
      response.writeHead(200, { 'content-type': 'text/event-stream' });
      response.write('data: {"type":"server.connected"}\n\n'); return;
    }
    let payload;
    if (url.pathname === '/permission') payload = native.permissions;
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
      permission: native.rules[url.pathname.split('/')[2]] || [{ permission: '*', pattern: '*', action: 'ask' }] };
    else { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify(payload));
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
      ...process.env, OC_Codex_WORKSPACE: directory, OC_Codex_OUTSIDE_SANDBOX: '1',
      OC_Codex_STATUS_PORT: String(port), OC_Codex_OPENCODE_URL: 'http://127.0.0.1:' + opencode.address().port,
      OC_Codex_DECISION_MODE: 'manual', OC_Codex_RECONNECT_MS: '30',
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
  const get = async (path) => { const r = await fetch(base + path); return { status: r.status, body: await r.json() }; };
  const post = async (path, data) => { const r = await fetch(base + path, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    const text = await r.text(); return { status: r.status, body: text ? JSON.parse(text) : null }; };
  const candidate = (id) => ({ runId: id, ownerId: 'codex-' + id, sessionId: 'ses_' + id, directory,
    changeId: 'change-' + id, selectionKey: 'requirement-' + id, dependsOn: [],
    resources: [{ key: 'file:src/' + id + '.py', mode: 'write' }] });
  async function reserve(id, override = {}) {
    const r = await post('/runs/reserve', { ...candidate(id), ...override }); assert.equal(r.status, 201, JSON.stringify(r));
    const arm = await post('/runs/' + id + '/job/arm', { jobId: 'job-' + id, sessionId: 'ses_' + id,
      directory, changeId: 'change-' + id, strictCommands: true, criteria: ['delivery', 'statistics'] });
    assert.equal(arm.status, 201, JSON.stringify(arm)); return r.body;
  }
  const approval = (run, requestId) => {
    const value = { run_id: run.runId, reservation_version: run.version,
    requestId, approval_id: 'approval-' + requestId, session_id: run.sessionId,
    change_id: run.changeId, directory, files: [], commands: ['/usr/bin/true'],
    resources: run.resources, title: 'isolated command', summary: 'synthetic fixture' };
    native.messages[run.sessionId] ||= [];
    native.messages[run.sessionId].push({ parts: [{ type: 'tool', tool: 'cgpt-validation_request_validation',
      state: { status: 'running', input: structuredClone(value) } }] });
    return value;
  };
  await start();
  await post('/broker/readiness', { status: 'READY', pending_count: 0, infrastructure_status: 'READY' });
  return { native, children, directory, base, get, post, candidate, reserve, approval, start, stop };
}

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

test('intégration stable : suspension des autres RUN et réconciliation obligatoire de la référence', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); const b = await h.reserve('b');
  assert.equal((await h.post('/runs/a/integration', { version: a.version, acquire: true })).status, 409);
  for (const run of [a, b]) assert.equal((await h.post('/runs/' + run.runId + '/ready',
    { version: run.version, evidence: ['local checks passed at a stable fixture milestone'] })).status, 200);
  assert.equal((await h.post('/runs/a/integration', { version: a.version, acquire: true })).status, 200);
  assert.equal((await h.get('/runs/b/status')).body.coordination.reason, 'integration-suspended');
  assert.equal((await h.post('/validation/request', { approval: h.approval(b, 'blocked-by-integration') })).status, 409);
  const globalCheck = { ...h.approval(a, 'global-check'), resources: [{ key: 'project:*', mode: 'read' }] };
  h.native.messages.ses_a.push({ parts: [{ type: 'tool', tool: 'cgpt-validation_request_validation',
    state: { status: 'running', input: globalCheck } }] });
  assert.equal((await h.post('/validation/request', { approval: globalCheck })).status, 202);
  h.native.permissions.push({ id: 'global-check-permission', sessionID: 'ses_a', permission: 'bash', metadata: { command: '/usr/bin/true' } });
  assert.equal((await h.post('/runs/a/decision/global-check', { decision: 'approved' })).status, 201);
  await waitFor(() => h.native.replies.length === 1);
  const publication = await h.post('/runs/a/integration', { version: a.version, acquire: false,
    published: true, evidence: ['synthetic combined validation and publication proof'] });
  assert.equal(publication.status, 200);
  assert.equal((await h.get('/runs/b/status')).body.coordination.reason, 'reference-reconciliation-required');
  const refreshed = await h.post('/runs/b/reconcile', { version: b.version,
    referenceVersion: publication.body.referenceVersion, evidence: ['reviewed base and affected tests for fixture B'] });
  assert.equal(refreshed.status, 200);
  assert.ok(refreshed.body.version > b.version);
  assert.equal((await h.post('/validation/request', { approval: h.approval(b, 'old-reference') })).status, 409);
  assert.equal((await h.post('/validation/request', { approval: h.approval(refreshed.body, 'new-reference') })).status, 202);
});

test('récupération de A avec B actif : réservation conservée et génération renouvelée', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); await h.reserve('b');
  h.native.permissions = [{ id: 'permission-b', sessionID: 'ses_b', permission: 'bash', metadata: { command: 'unrelated' } }];
  const recovery = { jobId: 'job-a', expectedSessionId: 'ses_a', sessionId: 'ses_a_new', recoveryId: 'recovery-a', preflightRequestId: 'preflight-a' };
  assert.equal((await h.post('/runs/a/job/recover', { ...recovery, phase: 'prepare' })).status, 200);
  const approval = h.approval({ ...a, sessionId: 'ses_a_new' }, 'preflight-a');
  assert.equal((await h.post('/validation/request', { approval })).status, 202);
  assert.equal((await h.post('/runs/a/decision/preflight-a', { decision: 'approved' })).status, 201);
  h.native.permissions.push({ id: 'permission-a', sessionID: 'ses_a_new', permission: 'bash', metadata: { command: '/usr/bin/true' } });
  await waitFor(() => h.native.replies.length === 1);
  h.native.messages.ses_a_new = [{ parts: [
    { type: 'tool', tool: 'cgpt-validation_request_validation', state: { status: 'completed', input: approval,
      output: JSON.stringify({ ...approval, status: 'APPROVED' }), time: { start: 1, end: 2 } } },
    { type: 'tool', tool: 'bash', state: { status: 'completed', input: { command: '/usr/bin/true' },
      metadata: { exit: 0 }, time: { start: 3, end: 4 } } },
    { type: 'tool', tool: 'cgpt-validation_broker_readiness', state: { status: 'completed',
      output: JSON.stringify({ status: 'READY', pending_count: 0 }), time: { start: 5, end: 6 } } },
  ] }];
  await h.post('/broker/readiness', { status: 'READY', pending_count: 0, by_run: { a: { pending_count: 0 }, b: { pending_count: 0 } } });
  const complete = await h.post('/runs/a/job/recover', { ...recovery, phase: 'complete' });
  assert.equal(complete.status, 200, JSON.stringify(complete));
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
  assert.equal(initialized.result.serverInfo.version, '1.0.2');
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
