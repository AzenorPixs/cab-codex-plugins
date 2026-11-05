import { fixtureEnvironment } from './helpers/cab-environment.mjs';
import { openCodeV2TestHandler } from './helpers/opencode-v2-test-server.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

async function checkSupervision(t, coordinationReason = null, codingModel = false) {
  const directory = mkdtempSync(join(tmpdir(), 'cab-multi-supervisor-'));
  const jobs = Object.fromEntries(['a', 'b'].map((id) => [id, { runId: id, jobId: 'job-' + id,
    sessionId: 'ses_' + id, directory, changeId: 'change-' + id, armed: true,
    terminalGate: { status: 'OPEN' }, lastProvenMilestone: 'milestone-' + id }]));
  const statuses = { a: { opencodeSse: 'connected', brokerReadiness: { status: 'READY', pending_count: 1 } },
    b: { opencodeSse: 'connected', brokerReadiness: { status: 'READY', pending_count: 0 } } };
  if (coordinationReason) { statuses.a.brokerReadiness.pending_count = 0; statuses.a.coordination = { reason: coordinationReason }; }
  if (codingModel) jobs.b.codingModel={protocol:'pllm-auto-v1',source:'prompt',providerID:'provider1',modelID:'model1',reasoning:'medium',
    mode:null,priority:null,evaluatedAt:null,catalogDigest:null,selectedAt:new Date().toISOString(),
    preflight:{sessionId:'ses_probe',messageId:'msg_probe',verifiedAt:new Date().toISOString()}};
  const sent = []; const modelSwitches = []; const busy = {};
  const controller = createServer((request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    const match = path.match(/^\/runs\/([ab])\/(status|job)$/);
    const payload = path === '/status' ? { mode: 'concurrent', runs: statuses }
      : match ? (match[2] === 'status' ? statuses[match[1]] : jobs[match[1]]) : null;
    response.writeHead(payload ? 200 : 404, { 'content-type': 'application/json' }); response.end(JSON.stringify(payload));
  });
  const opencode = createServer(openCodeV2TestHandler(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/global/event') {
      response.writeHead(200, { 'content-type': 'text/event-stream' });
      response.write('data: {"type":"server.connected"}\n\n'); return;
    }
    let payload;
    if (url.pathname === '/session/status') payload = busy;
    else if (request.method === 'POST') {
      let body = ''; for await (const chunk of request) body += chunk;
      sent.push({ sessionId: url.pathname.split('/')[2], body: JSON.parse(body) });
      busy.ses_b = { type: 'busy' }; payload = { parts: [] };
    } else payload = { id: url.pathname.split('/')[2], directory };
    response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify(payload));
  }, { directory, onModelSwitch: (switchRequest) => modelSwitches.push(switchRequest) }));
  await new Promise((r) => controller.listen(0, '127.0.0.1', r));
  await new Promise((r) => opencode.listen(0, '127.0.0.1', r));
  const listener = createServer(); await new Promise((r) => listener.listen(0, '127.0.0.1', r));
  const port = listener.address().port; await new Promise((r) => listener.close(r));
  const child = spawn(process.execPath, [fileURLToPath(new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs', import.meta.url))],
    { env: { ...fixtureEnvironment, OC_Codex_WORKSPACE: directory, OC_Codex_SUPERVISOR_STATUS_PORT: String(port),
      OC_Codex_CONTROLLER_URL: 'http://127.0.0.1:' + controller.address().port,
      OC_Codex_OPENCODE_URL: 'http://127.0.0.1:' + opencode.address().port,
      OC_Codex_SUPERVISOR_POLL_INTERVAL_MS: '250', OC_Codex_SUPERVISOR_RESUME_DELAY_MS: '1000' }, stdio: 'ignore' });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const done = new Promise((r) => child.once('exit', r)); child.kill('SIGTERM'); await done;
    }
    for (const server of [controller, opencode]) { server.closeAllConnections(); await new Promise((r) => server.close(r)); }
    rmSync(directory, { recursive: true, force: true });
  });
  let state;
  async function awaitState(reason) {
    for (let i = 0; i < 100; i++) {
      try {
        state = await (await fetch('http://127.0.0.1:' + port + '/status')).json();
        if (state.runs?.b?.reason === reason) return;
      } catch (cause) { if (!(cause instanceof TypeError)) throw cause; }
      await new Promise(r => setTimeout(r, 25));
    }
    assert.fail('État de supervision absent : ' + reason);
  }
  await awaitState('orchestrator-mandate-required');
  assert.equal(state.runs.a.reason, coordinationReason || 'pending-validations');
  assert.equal(state.runs.b.state, 'WAITING');
  assert.equal(state.runs.b.resumeAttemptCount, 0);
  assert.equal(state.runs.a.resumeAttemptCount, 0);
  assert.deepEqual(sent, []); assert.deepEqual(modelSwitches, []);
  assert.equal(jobs.b.armed, true); assert.equal(jobs.b.terminalGate.status, 'OPEN');
  jobs.b.recovery = { sessionId: 'candidate-b', phase: 'prepare' };
  await awaitState('session-recovery-pending');
  jobs.b.recovery = null; jobs.b.sessionId = 'candidate-b';
  await awaitState('orchestrator-mandate-required');
  assert.equal(state.runs.b.sessionId, 'candidate-b');
  jobs.b.currentCabMandate = 'analyse en lecture seule';
  await awaitState('native-effect-unresolved');
  jobs.b.currentCabMandate = null; statuses.b.unmatchedNativePermissionCount = 1;
  await awaitState('native-effect-unresolved');
  statuses.b.unmatchedNativePermissionCount = 0;
  statuses.b.hasUnresolvedOperation = true;
  await awaitState('resource-access-active');
  statuses.b.hasUnresolvedOperation = false;
  await awaitState('orchestrator-mandate-required');
  assert.deepEqual(sent, []); assert.deepEqual(modelSwitches, []);
  assert.equal(state.runs.b.resumeAttemptCount, 0);

}

test('supervision partagée : attente de l’orchestrateur, aucun prompt sans mandat', { timeout: 10000 }, (t) => checkSupervision(t));
test('un conflit de ressource de A ne provoque aucune relance et préserve l’attente indépendante de B', { timeout: 10000 }, (t) => checkSupervision(t, 'resource-conflict'));
test('une pause ciblée reste prioritaire sur le réveil du superviseur', { timeout: 10000 }, (t) => checkSupervision(t, 'run-pause'));

test('une attente Docker/LXC ne provoque aucune relance et préserve les pairs en attente', { timeout: 10000 }, (t) => checkSupervision(t, 'test-resource-conflict'));

test('le superviseur ne génère ni appel modèle ni prompt pour un RUN sans mandat', { timeout: 10000 }, (t) => checkSupervision(t, null, true));
