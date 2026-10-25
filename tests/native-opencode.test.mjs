import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const binary = process.env.CAB_TEST_OPENCODE;
async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve)); return port;
}
async function waitFor(check, milliseconds = 15000) {
  const end = Date.now() + milliseconds;
  while (Date.now() < end) { if (await check()) return; await new Promise((r) => setTimeout(r, 100)); }
  throw new Error('native integration timeout');
}

test('OpenCode natif : trois sessions et un seul broker source 1.10.1 dans un contexte isolé',
  { skip: !binary, timeout: 45000 }, async (t) => {
    const temporary = mkdtempSync(join(tmpdir(), 'cab-native-opencode-'));
    const workspace = join(temporary, 'workspace'); mkdirSync(workspace);
    const port = await freePort(); const controllerPort = await freePort();
    const base = 'http://127.0.0.1:' + port;
    const controllerBase = 'http://127.0.0.1:' + controllerPort;
    const sourceDirectory = fileURLToPath(new URL('../src/', import.meta.url));
    const starts = join(temporary, 'broker-starts.jsonl');
    const wrapper = join(temporary, 'broker-entry.py');
    writeFileSync(wrapper, 'import sys, os, json\nsys.path.insert(0, ' + JSON.stringify(sourceDirectory) +
      ')\nimport cgpt_approval_bridge_server as bridge\nwith open(' + JSON.stringify(starts) +
      ', "a") as f:\n f.write(json.dumps({"pid":os.getpid(),"version":bridge.SERVER_VERSION})+"\\n")\nraise SystemExit(bridge.main())\n');
    const brokerEnvironment = { CGPT_CONTROLLER_URL: controllerBase,
      CGPT_APPROVAL_STORE: join(temporary, 'approvals.json'), CGPT_APPROVAL_JOURNAL: join(temporary, 'events.ndjson'),
      CGPT_BROKER_INSTANCE_LOCK: join(temporary, 'broker.instance.lock'),
      CGPT_JOURNAL_CHECKPOINT_PATH: join(temporary, 'journal-checkpoint.json'),
      CGPT_AUTO_REMEDIATION_CB_STATE_PATH: join(temporary, 'circuit.json') };
    const config = { autoupdate: false, share: 'disabled', mcp: { 'cgpt-validation': {
      type: 'local', enabled: true, command: ['python3', wrapper], environment: brokerEnvironment } } };
    const environment = { PATH: process.env.PATH,
      XDG_CONFIG_HOME: join(temporary, 'config'), XDG_DATA_HOME: join(temporary, 'data'),
      XDG_CACHE_HOME: join(temporary, 'cache'), XDG_STATE_HOME: join(temporary, 'state'),
      OPENCODE_CONFIG_CONTENT: JSON.stringify(config), OPENCODE_DISABLE_PROJECT_CONFIG: '1',
      OPENCODE_DISABLE_DEFAULT_PLUGINS: '1', OPENCODE_DISABLE_CLAUDE_CODE: '1',
      OPENCODE_DISABLE_MODELS_FETCH: '1', OPENCODE_DISABLE_AUTOUPDATE: '1', OPENCODE_DISABLE_LSP_DOWNLOAD: '1' };
    let controller;
    const opencode = spawn(binary, ['serve', '--pure', '--hostname', '127.0.0.1', '--port', String(port)],
      { cwd: workspace, env: environment, stdio: 'ignore' });
    const request = async (url, method = 'GET', payload) => {
      const response = await fetch(url, { method, signal: AbortSignal.timeout(10000),
        ...(payload === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }) });
      assert.ok(response.ok, 'HTTP ' + response.status + ' at ' + new URL(url).pathname);
      return response.json();
    };
    const native = (path, method, payload) => request(base + path + '?directory=' + encodeURIComponent(workspace), method, payload);
    const stop = async (child) => {
      if (!child || child.exitCode !== null || child.signalCode !== null) return;
      const stopped = new Promise((resolve) => child.once('exit', resolve)); child.kill('SIGTERM'); await stopped;
    };
    t.after(async () => {
      try { await native('/instance/dispose', 'POST', {}); } catch { /* Only this isolated instance is affected. */ }
      await stop(controller); await stop(opencode);
      rmSync(temporary, { recursive: true, force: true });
    });
    await waitFor(async () => { if (opencode.exitCode !== null) throw new Error('isolated OpenCode startup failed');
      try { return (await request(base + '/global/health')).healthy; } catch { return false; } }, 20000);
    controller = spawn(process.execPath, [fileURLToPath(new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs', import.meta.url))],
      { env: { PATH: process.env.PATH, OC_Codex_WORKSPACE: workspace, OC_Codex_OUTSIDE_SANDBOX: '1',
        OC_Codex_OPENCODE_URL: base, OC_Codex_STATUS_PORT: String(controllerPort), OC_Codex_DECISION_MODE: 'manual',
        CODEX_COMMAND: 'cab-test-unused-app-server' }, stdio: 'ignore' });
    await waitFor(async () => { try { return Boolean(await request(controllerBase + '/status')); } catch { return false; } });
    const mcp = await native('/mcp');
    assert.equal(mcp['cgpt-validation'].status, 'connected');
    await waitFor(async () => (await request(controllerBase + '/status')).brokerReadiness?.server_version === '1.10.1');
    const sessions = await Promise.all(['a', 'b', 'c'].map((id) => native('/session', 'POST', { title: 'CAB isolated fixture ' + id })));
    const reservations = [];
    for (let i = 0; i < sessions.length; i++) {
      const runId = 'native-' + i;
      const reservation = await request(controllerBase + '/runs/reserve', 'POST', { runId, ownerId: 'fixture-owner',
        directory: workspace, sessionId: sessions[i].id, changeId: 'fixture-' + i, selectionKey: 'fixture-requirement-' + i,
        resources: [{ key: 'resource:fixture-' + i, mode: 'read' }], dependsOn: [] });
      reservations.push(reservation);
      await request(controllerBase + '/runs/' + runId + '/job/arm', 'POST', { jobId: 'job-' + i,
        directory: workspace, sessionId: sessions[i].id, changeId: 'fixture-' + i, strictCommands: true, criteria: ['isolated-native-smoke'] });
    }
    assert.equal((await request(controllerBase + '/status')).activeRunCount, 3);
    assert.equal(new Set(sessions.map((s) => s.id)).size, 3);
    const brokers = readFileSync(starts, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(brokers.length, 1); assert.equal(brokers[0].version, '1.10.1');
    for (const run of reservations) {
      await request(controllerBase + '/runs/' + run.runId + '/job/terminal-gate', 'POST', { state: 'BLOQUÉ' });
      await request(controllerBase + '/runs/' + run.runId + '/job/disarm', 'POST', { jobId: 'job-' + run.runId.split('-')[1] });
      await request(controllerBase + '/runs/' + run.runId + '/release', 'POST', { version: run.version, delivered: false,
        evidence: ['isolated native fixture ended; no model, code operation or project delivery'] });
    }
    await native('/instance/dispose', 'POST', {});
    await waitFor(() => !existsSync('/proc/' + brokers[0].pid), 5000);
  });
