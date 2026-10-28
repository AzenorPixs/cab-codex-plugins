import { fixtureEnvironment } from './helpers/cab-environment.mjs';
import assert from 'node:assert/strict';
import { fork, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const scriptRoot = process.env.CAB_LIFECYCLE_TEST_SCRIPTS || join(root, 'plugins/cab-approval-bridge/scripts');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await check()) return; await delay(20); }
  throw new Error('condition non atteinte');
}
async function port() {
  const server = createServer(); await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const value = server.address().port; await new Promise((r) => server.close(r)); return value;
}
async function setup(t, { initialOutage = false, codingServer = false } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'cab-shutdown-'));
  const children = []; const errors = [];
  const stop = async (child, signal = 'SIGTERM') => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, 'exit'); child.kill(signal); await exited;
  };
  t.after(async () => { for (const child of children.reverse()) await stop(child, 'SIGKILL');
    await rm(directory, { recursive: true, force: true }); });
  const native = fork(join(root, 'tests/helpers/lifecycle-opencode-server.mjs'), [directory],
    { stdio: ['ignore', 'ignore', 'pipe', 'ipc'], env: fixtureEnvironment });
  children.push(native);
  let nativePort; let infoRequests = 0;
  native.on('message', (value) => { nativePort ||= value.port; infoRequests = value.infoRequests || infoRequests; });
  await until(() => nativePort);
  if (initialOutage) native.send('outage');
  const ports = { controller: await port(), supervisor: await port(), monitor: await port() };
  const bases = Object.fromEntries(Object.entries(ports).map(([key, value]) => [key, 'http://127.0.0.1:' + value]));
  const services = {};
  for (const component of ['controller', 'supervisor', 'monitor']) {
    const child = spawn(process.execPath, [join(scriptRoot, 'cgpt-approval-bridge-' + component + '.mjs')],
      { stdio: ['ignore', 'ignore', 'pipe'], env: { ...fixtureEnvironment,
        OC_Codex_WORKSPACE: directory, OC_Codex_OUTSIDE_SANDBOX: '1', OC_Codex_DECISION_MODE: 'manual',
        CODEX_COMMAND: codingServer ? join(root, 'tests/helpers/lifecycle-codex-server.py') : 'cab-test-unused-app-server',
        OC_Codex_STATUS_PORT: String(ports.controller), OC_Codex_SUPERVISOR_STATUS_PORT: String(ports.supervisor),
        OC_Codex_MONITOR_PORT: String(ports.monitor), OC_Codex_CONTROLLER_URL: bases.controller,
        OC_Codex_SUPERVISOR_URL: bases.supervisor, OC_Codex_OPENCODE_URL: 'http://127.0.0.1:' + nativePort } });
    children.push(child); services[component] = child; child.stderr.on('data', (data) => errors.push(data.toString()));
    await until(async () => {
      if (child.exitCode !== null) throw new Error(errors.join(''));
      try { return (await fetch(bases[component] + (component === 'monitor' ? '/api/snapshot' : '/status'))).ok; }
      catch { return false; }
    });
  }
  // Each service must have time to latch the real native fixture PID.
  await until(() => infoRequests >= 3); await delay(600);
  return { directory, services, native, bases, stop, errors };
}

for (const signal of ['normal', 'SIGKILL']) {
  test(`fin serveur ${signal} : services et helper terminent, deux RUN conservés`, { timeout: 15000 }, async (t) => {
    const f = await setup(t);
    const state = join(f.directory, '.opencode/state/cgpt-approval-bridge');
    const helperPids = (await readFile(`/proc/${f.services.controller.pid}/task/${f.services.controller.pid}/children`, 'utf8')).trim().split(/\s+/).filter(Boolean);
    assert.equal(helperPids.length, 1);
    for (const id of ['a', 'b']) {
      const response = await fetch(f.bases.controller + '/runs/reserve', { method: 'POST',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ runId: id, ownerId: 'codex-' + id,
          sessionId: 'ses_' + id, directory: f.directory, changeId: 'change-' + id, selectionKey: 'selection-' + id,
          dependsOn: [], resources: [{ key: 'file:src/' + id, mode: 'write' }], exclusiveResources: ['file:src/' + id] }) });
      assert.equal(response.status, 201, await response.text());
      const armed = await fetch(f.bases.controller + '/runs/' + id + '/job/arm', { method: 'POST',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jobId: 'job-' + id,
          sessionId: 'ses_' + id, directory: f.directory, changeId: 'change-' + id,
          strictCommands: true, criteria: ['delivery', 'statistics'] }) });
      assert.equal(armed.status, 201, await armed.text());
    }
    const frozen = await fetch(f.bases.controller + '/coordination/global/request', { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cause: 'GLOBAL_RECONCILIATION',
        scope: 'all', transactionId: 'synthetic-freeze', authorization: 'synthetic fixture only', evidence: ['synthetic freeze'] }) });
    assert.equal(frozen.status, 202, await frozen.text());
    const jobs = {};
    for (const id of ['a', 'b']) jobs[id] = await (await fetch(f.bases.controller + '/runs/' + id + '/job')).json();
    const jobFiles = {};
    for (const id of ['a', 'b']) {
      const generations = await readdir(join(state, 'runs', id));
      const file = join(state, 'runs', id, generations.find((name) => /^\d+$/.test(name)), 'controller-job.json');
      jobFiles[file] = await readFile(file, 'utf8');
      assert.equal(jobs[id].armed, true);
    }
    const registryPath = join(state, 'controller-runs.json');
    const before = JSON.parse(await readFile(registryPath, 'utf8'));
    const started = performance.now();
    const exits = Object.values(f.services).map((child) => once(child, 'exit'));
    if (signal === 'normal') { const done = once(f.native, 'exit'); f.native.send('exit'); await done; }
    else await f.stop(f.native, signal);
    const results = await Promise.all(exits);
    assert.ok(performance.now() - started < 5000);
    assert.deepEqual(results, [[0, null], [0, null], [0, null]], f.errors.join(''));
    assert.deepEqual(JSON.parse(await readFile(registryPath, 'utf8')), before);
    assert.equal(before.coordination.global.state, 'DRAINING');
    for (const [file, value] of Object.entries(jobFiles)) assert.equal(await readFile(file, 'utf8'), value);
    for (const pid of helperPids) await until(async () => {
      try { const stat = await readFile(`/proc/${pid}/stat`, 'utf8'); return false; }
      catch (cause) { if (cause.code === 'ENOENT') return true; throw cause; }
    });
    const lockCheck = spawn('python3', ['-B', '-c',
      'import fcntl,sys;f=open(sys.argv[1],"r+");fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB)', join(state, 'registry.instance.lock')], { stdio: 'ignore' });
    assert.deepEqual(await once(lockCheck, 'exit'), [0, null]);
    assert.ok((await readdir(state)).includes('controller-runs.json'));
  });
}

test('panne HTTP/SSE et perte du contrôleur : les pairs restent disponibles', { timeout: 15000 }, async (t) => {
  const f = await setup(t); f.native.send('outage'); await delay(1200);
  for (const child of Object.values(f.services)) assert.equal(child.exitCode, null);
  await f.stop(f.services.controller);
  assert.equal(f.services.supervisor.exitCode, null);
  assert.equal(f.services.monitor.exitCode, null);
  assert.equal((await fetch(f.bases.monitor + '/api/snapshot')).status, 200);
});

test('attente initiale puis rattachement, fermeture et signal concurrents', { timeout: 15000 }, async (t) => {
  const f = await setup(t, { initialOutage: true });
  for (const child of Object.values(f.services)) assert.equal(child.exitCode, null);
  f.native.send('restore'); await delay(1200);
  const exits = Object.values(f.services).map((child) => once(child, 'exit'));
  await f.stop(f.native, 'SIGKILL');
  for (const child of Object.values(f.services)) child.kill('SIGTERM');
  assert.deepEqual(await Promise.all(exits), [[0, null], [0, null], [0, null]], f.errors.join(''));
});

test('les unités empêchent la relance du statut de nettoyage incomplet', async () => {
  for (const component of ['controller', 'supervisor', 'monitor']) {
    const unit = await readFile(join(scriptRoot, '../systemd/cgpt-approval-bridge-' + component + '.service'), 'utf8');
    assert.match(unit, /^Restart=on-failure$/m);
    assert.match(unit, /^RestartPreventExitStatus=78$/m);
    assert.doesNotMatch(unit, /^\[Install\]/m);
  }
});

test('le contrôleur attend également la sortie de son app server dédié', { timeout: 15000 }, async (t) => {
  const f = await setup(t, { codingServer: true });
  const children = (await readFile(`/proc/${f.services.controller.pid}/task/${f.services.controller.pid}/children`, 'utf8')).trim().split(/\s+/).filter(Boolean);
  assert.equal(children.length, 2);
  const exits = Object.values(f.services).map((child) => once(child, 'exit'));
  await f.stop(f.native, 'SIGKILL');
  assert.deepEqual(await Promise.all(exits), [[0, null], [0, null], [0, null]], f.errors.join(''));
  for (const pid of children) await until(async () => {
    try { await readFile(`/proc/${pid}/stat`, 'utf8'); return false; }
    catch (cause) { if (cause.code === 'ENOENT') return true; throw cause; }
  });
});
