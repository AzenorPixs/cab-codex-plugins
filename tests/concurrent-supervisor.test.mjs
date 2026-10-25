import { fixtureEnvironment } from './helpers/cab-environment.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

async function checkSupervision(t, coordinationReason = null) {
  const directory = mkdtempSync(join(tmpdir(), 'cab-multi-supervisor-'));
  const jobs = Object.fromEntries(['a', 'b'].map((id) => [id, { runId: id, jobId: 'job-' + id,
    sessionId: 'ses_' + id, directory, changeId: 'change-' + id, armed: true,
    terminalGate: { status: 'OPEN' }, lastProvenMilestone: 'milestone-' + id }]));
  const statuses = { a: { opencodeSse: 'connected', brokerReadiness: { status: 'READY', pending_count: 1 } },
    b: { opencodeSse: 'connected', brokerReadiness: { status: 'READY', pending_count: 0 } } };
  if (coordinationReason) { statuses.a.brokerReadiness.pending_count = 0; statuses.a.coordination = { reason: coordinationReason }; }
  const sent = []; const busy = {};
  const controller = createServer((request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    const match = path.match(/^\/runs\/([ab])\/(status|job)$/);
    const payload = path === '/status' ? { mode: 'concurrent', runs: statuses }
      : match ? (match[2] === 'status' ? statuses[match[1]] : jobs[match[1]]) : null;
    response.writeHead(payload ? 200 : 404, { 'content-type': 'application/json' }); response.end(JSON.stringify(payload));
  });
  const opencode = createServer(async (request, response) => {
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
  });
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
  for (let i = 0; i < 100 && !sent.length; i++) await new Promise((r) => setTimeout(r, 50));
  assert.equal(sent.length, 1); assert.equal(sent[0].sessionId, 'ses_b');
  let state;
  for (let i = 0; i < 50; i++) {
    state = await (await fetch('http://127.0.0.1:' + port + '/status')).json();
    assert.equal(sent.length, 1);
    if (state.runs.b.reason === 'session-not-idle') break;
    await new Promise((r) => setTimeout(r, 50));
  }
  assert.equal(state.runs.a.resumeAttemptCount, 0); assert.equal(state.runs.b.resumeAttemptCount, 1);
  assert.equal(state.runs.a.reason, coordinationReason || 'pending-validations');
  assert.equal(state.runs.b.reason, 'session-not-idle');

}

test('supervision partagée : attente de A, reprise unique de B et compteurs séparés', { timeout: 10000 }, (t) => checkSupervision(t));
test('un conflit de ressource de A ne provoque aucune relance et préserve B', { timeout: 10000 }, (t) => checkSupervision(t, 'resource-conflict'));
test('une pause ciblée reste prioritaire sur le réveil du superviseur', { timeout: 10000 }, (t) => checkSupervision(t, 'run-pause'));
