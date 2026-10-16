import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
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
  const native = { permissions: [], replies: [], busy: {}, messages: {}, rules: {}, requests: [], sessions: {} };
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
      permission: native.rules[url.pathname.split('/')[2]] || [{ permission: '*', pattern: '*', action: 'ask' }],
      ...native.sessions[url.pathname.split('/')[2]] };
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
      CODEX_COMMAND: 'cab-test-unused-app-server',
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

test('publication atomique HTTP : reprise idempotente, génération et gate conservés', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); const b = await h.reserve('b');
  for (const run of [a, b]) assert.equal((await h.post('/runs/' + run.runId + '/ready',
    { version: run.version, evidence: ['local coherent checkpoint'] })).status, 200);
  assert.equal((await h.post('/runs/a/integration', { version: a.version, acquire: true })).status, 200);
  const request = { version: a.version, referenceVersion: 0, acquire: false, published: true,
    evidence: ['current base and archive verified'], completion: { transactionId: 'atomic-a',
      reportFile: 'openspec/changes/archive/2026-10-16-change-a/STATISTIQUES.md' } };
  const published = await h.post('/runs/a/integration', request);
  assert.equal(published.status, 200, JSON.stringify(published));
  assert.equal(published.body.integrationOwner, null);
  const report = published.body.runs.find((run) => run.runId === 'a');
  assert.equal(report.phase, 'REPORT'); assert.ok(report.version > a.version);
  assert.equal((await h.post('/validation/request', { approval: h.approval(a, 'old-version') })).body.error, 'reservation-version-stale');
  assert.equal((await h.post('/runs/a/release', { version: report.version, delivered: true,
    evidence: ['report absent'] })).body.error, 'run-not-quiescent');
  assert.equal((await h.get('/runs/a/status')).body.terminalGate.status, 'OPEN');
  await h.stop(); await h.start();
  const repeated = await h.post('/runs/a/integration', request);
  assert.equal(repeated.status, 200); assert.deepEqual(repeated.body.completion, published.body.completion);
  assert.equal(repeated.body.referenceVersion, 1);
  const divergent = await h.post('/runs/a/integration', { ...request, evidence: ['different proof'] });
  assert.equal(divergent.body.error, 'integration-transaction-divergent');
});

test('le contrôle de cohorte ne répète pas les lectures globales par RUN', async (t) => {
  const h = await setup(t); const runs = [];
  for (const id of ['a', 'b', 'c']) runs.push(await h.reserve(id));
  for (const run of runs) await h.post('/runs/' + run.runId + '/ready', { version: run.version, evidence: ['stable'] });
  h.native.requests.length = 0;
  assert.equal((await h.post('/runs/a/integration', { version: runs[0].version, acquire: true })).status, 200);
  assert.equal(h.native.requests.filter((path) => path === '/session/status').length, 1);
  assert.equal(h.native.requests.filter((path) => path === '/permission').length, 1);
  for (const run of runs) assert.equal(h.native.requests.filter((path) => path === '/session/' + run.sessionId).length, 1);
});

test('les obstacles exposent le drainage, les mandats et la quiescence sans contenu', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); await h.reserve('b');
  await h.post('/runs/a/integration-request', { version: a.version, evidence: ['prepared'] });
  await h.post('/runs/b/job/progress', { jobId: 'job-b', currentCabMandate: 'opaque-mandate' });
  h.native.busy.ses_b = { type: 'busy' };
  h.native.permissions = [{ id: 'perm-b', sessionID: 'ses_b', metadata: { command: 'must never appear' } }];
  const diagnostic = await h.get('/runs/a/integration-status');
  assert.equal(diagnostic.status, 200);
  for (const reason of ['stable-milestone-required', 'current-mandate-not-closed', 'native-session-busy', 'native-permissions-unresolved']) {
    assert.ok(diagnostic.body.blockers.some((blocker) => blocker.runId === 'b' && blocker.reason === reason));
  }
  assert.equal(JSON.stringify(diagnostic.body).includes('must never appear'), false);
  assert.equal((await h.get('/runs')).body.integrationOwner, null);
});

test('une cohorte occupée, invalide ou divergente conserve la référence', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); const b = await h.reserve('b');
  for (const run of [a, b]) await h.post('/runs/' + run.runId + '/ready', { version: run.version, evidence: ['stable'] });
  h.native.busy.ses_b = { type: 'busy' };
  assert.equal((await h.post('/runs/a/integration', { version: a.version, acquire: true })).body.error, 'native-session-not-quiescent');
  h.native.busy = { ses_b: { type: 'invalid' } };
  assert.equal((await h.post('/runs/a/integration', { version: a.version, acquire: true })).body.error, 'native-reconciliation-invalid');
  h.native.busy = {}; h.native.sessions.ses_b = { directory: '/different-directory' };
  assert.equal((await h.post('/runs/a/integration', { version: a.version, acquire: true })).body.error, 'native-session-divergent');
  const registry = (await h.get('/runs')).body;
  assert.equal(registry.integrationOwner, null); assert.equal(registry.referenceVersion, 0);
});

test('un événement SSE pertinent pendant observation exige une nouvelle réconciliation', async (t) => {
  const h = await setup(t); const a = await h.reserve('a');
  await h.post('/runs/a/ready', { version: a.version, evidence: ['stable'] });
  let fired = false;
  h.native.onRequest = async (path) => {
    if (path !== '/session/status' || fired) return;
    fired = true; h.native.emit({ type: 'session.status', properties: { sessionID: 'ses_a', status: { type: 'idle' } } });
    await delay(50);
  };
  assert.equal((await h.post('/runs/a/integration', { version: a.version, acquire: true })).body.error, 'native-observation-changed');
  assert.equal((await h.get('/runs')).body.integrationOwner, null);
  h.native.onRequest = null;
  assert.equal((await h.post('/runs/a/integration', { version: a.version, acquire: true })).status, 200);
});

test('une révision du registre pendant observation refuse une transition sur une cohorte périmée', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); const b = await h.reserve('b');
  for (const run of [a, b]) await h.post('/runs/' + run.runId + '/ready', { version: run.version, evidence: ['stable'] });
  let fired = false;
  h.native.onRequest = async (path) => {
    if (path !== '/session/status' || fired) return;
    fired = true;
    assert.equal((await h.post('/runs/b/integration-request', { version: b.version, evidence: ['prepared peer'] })).status, 200);
  };
  assert.equal((await h.post('/runs/a/integration', { version: a.version, acquire: true })).body.error, 'native-observation-changed');
  const state = (await h.get('/runs')).body;
  assert.equal(state.integrationOwner, null); assert.equal(state.referenceVersion, 0);
  assert.deepEqual(state.integrationQueue.map((entry) => entry.runId), ['b']);
});

test('une nouvelle progression pendant observation conserve les effets non résolus', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); const b = await h.reserve('b');
  for (const run of [a, b]) await h.post('/runs/' + run.runId + '/ready', { version: run.version, evidence: ['stable'] });
  let fired = false;
  h.native.onRequest = async (path) => {
    if (path !== '/session/status' || fired) return;
    fired = true;
    await h.post('/runs/b/job/progress', { jobId: 'job-b', currentCabMandate: 'late-effect' });
  };
  assert.equal((await h.post('/runs/a/integration', { version: a.version, acquire: true })).body.error, 'run-not-quiescent');
  assert.equal((await h.get('/runs')).body.integrationOwner, null);
});

test('deux fins simultanées ne publient qu’une fois et un reçu ne crée aucune permission', async (t) => {
  const h = await setup(t); const a = await h.reserve('a');
  await h.post('/runs/a/ready', { version: a.version, evidence: ['stable'] });
  await h.post('/runs/a/integration', { version: a.version, acquire: true });
  const payload = { version: a.version, referenceVersion: 0, acquire: false, published: true,
    evidence: ['validated publication'], completion: { transactionId: 'simultaneous-a',
      reportFile: 'openspec/changes/archive/2026-10-16-change-a/STATISTIQUES.md' } };
  const replies = await Promise.all([h.post('/runs/a/integration', payload), h.post('/runs/a/integration', payload)]);
  assert.ok(replies.some((reply) => reply.status === 200));
  assert.ok(replies.every((reply) => [200, 409].includes(reply.status)));
  const repeated = await h.post('/runs/a/integration', payload);
  assert.equal(repeated.status, 200); assert.equal(repeated.body.referenceVersion, 1);
  assert.equal(Object.keys(repeated.body.integrationCompletions).length, 1);
  assert.equal(h.native.replies.length, 0);
});

test('la libération atomique garde la barrière tant que les effets ou observations restent incertains', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); const b = await h.reserve('b');
  for (const run of [a, b]) await h.post('/runs/' + run.runId + '/ready', { version: run.version, evidence: ['stable'] });
  await h.post('/runs/a/integration', { version: a.version, acquire: true });
  const payload = { version: a.version, referenceVersion: 0, acquire: false, published: true,
    evidence: ['validated publication'], completion: { transactionId: 'guarded-a',
      reportFile: 'openspec/changes/archive/2026-10-16-change-a/STATISTIQUES.md' } };
  h.native.busy.ses_b = { type: 'busy' };
  assert.equal((await h.post('/runs/a/integration', payload)).body.error, 'native-session-not-quiescent');
  h.native.busy = {};
  await h.post('/runs/a/job/progress', { jobId: 'job-a', currentCabMandate: 'unreconciled-effect' });
  assert.equal((await h.post('/runs/a/integration', payload)).body.error, 'run-not-quiescent');
  const state = (await h.get('/runs')).body;
  assert.equal(state.integrationOwner, 'a'); assert.equal(state.referenceVersion, 0);
  assert.equal(state.runs.find((run) => run.runId === 'a').phase, 'WORK');
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
  assert.equal(initialized.result.serverInfo.version, '1.2.1');
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

test('file, closing et rapport : les pairs reprennent et les gates restent obligatoires', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); const b = await h.reserve('b');
  for (const run of [a, b]) {
    assert.equal((await h.post('/runs/' + run.runId + '/integration-request',
      { version: run.version, evidence: ['integration requested'] })).status, 200);
    assert.equal((await h.post('/runs/' + run.runId + '/ready',
      { version: run.version, evidence: ['stable local milestone'] })).status, 200);
  }
  assert.equal((await h.post('/runs/b/integration', { version: b.version, acquire: true })).body.error, 'integration-queue-order');
  assert.equal((await h.post('/runs/a/integration', { version: a.version, acquire: true })).status, 200);
  assert.equal((await h.post('/runs/a/integration', { version: a.version, acquire: false,
    published: true, evidence: ['archive and combined validation'] })).status, 200);
  const reportFile = 'openspec/changes/archive/2026-10-15-change-a/STATISTIQUES.md';
  const closing = await h.post('/runs/a/closing', { version: a.version, reportFile, evidence: ['published own archive'] });
  assert.equal(closing.status, 200, JSON.stringify(closing));
  assert.equal((await h.post('/runs/a/release', { version: closing.body.version,
    delivered: true, evidence: ['report'] })).status, 409);
  const refreshed = await h.post('/runs/b/reconcile', { version: b.version, referenceVersion: 1, evidence: ['base reviewed'] });
  assert.equal(refreshed.status, 200);
  assert.equal((await h.post('/runs/b/ready', { version: refreshed.body.version, evidence: ['ready on current reference'] })).status, 200);
  assert.equal((await h.post('/runs/b/integration', { version: refreshed.body.version, acquire: true })).status, 200);
  const blocked = h.approval(closing.body, 'report-under-barrier');
  assert.equal((await h.post('/validation/request', { approval: blocked })).body.error, 'integration-suspended');
  assert.equal((await h.post('/runs/b/integration', { version: refreshed.body.version, acquire: false,
    published: true, evidence: ['B published'] })).status, 200);
  const report = h.approval(closing.body, 'report-after-barrier');
  report.files = [reportFile]; report.commands = []; report.resources = [];
  h.native.messages.ses_a.at(-1).parts[0].state.input = structuredClone(report);
  assert.equal((await h.post('/validation/request', { approval: report })).status, 202);
  h.native.permissions.push({ id: 'report-permission', sessionID: 'ses_a', permission: 'edit',
    metadata: { filepath: h.directory + '/' + reportFile } });
  assert.equal((await h.post('/runs/a/decision/report-after-barrier', { decision: 'approved' })).status, 201);
  await waitFor(() => h.native.replies.length === 1);
  assert.equal(h.native.replies[0].body.response, 'once');
  assert.equal((await h.post('/runs/a/job/terminal-gate', { state: 'TERMINÉ' })).status, 201);
  assert.equal((await h.post('/runs/a/job/disarm', { jobId: 'job-a' })).status, 202);
  assert.equal((await h.post('/runs/a/release', { version: closing.body.version,
    delivered: true, evidence: ['report verified and publication proved'] })).status, 200);
  assert.equal((await h.get('/runs/a/statistics')).body.contexts[0].state, 'DELIVERED');
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
  const stamp = Date.parse(prepared.body.recovery.preparedAt);
  const approval = h.approval({ ...a, sessionId: 'ses_a_new' }, recovery.preflightRequestId);
  assert.equal((await h.post('/validation/request', { approval })).status, 202);
  assert.equal((await h.post('/runs/a/decision/' + approval.requestId, { decision: 'approved' })).status, 201);
  h.native.permissions.push({ id: 'permission-restored-a', sessionID: 'ses_a_new', permission: 'bash',
    metadata: { command: '/usr/bin/true' } });
  await waitFor(() => h.native.replies.length === 1);
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
