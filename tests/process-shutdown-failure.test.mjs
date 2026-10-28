import { fixtureEnvironment } from './helpers/cab-environment.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, rm, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { followOpenCodeLifetime } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-process-lifecycle.mjs';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
test('un échec du callback de fermeture reste diagnostiqué', async (t) => {
  let identity = { pid: 123, startTime: '45', state: 'S' };
  const diagnostics = [];
  const watcher = followOpenCodeLifetime({ info: async () => ({ pid: 123 }) }, {
    readIdentity: async () => identity, intervalMs: 60000,
    onExit: async () => { throw new Error('synthetic cleanup failure'); }, onDiagnostic: (code) => diagnostics.push(code) });
  t.after(() => watcher.stop());
  await watcher.check(); identity = null; await watcher.check();
  assert.deepEqual(diagnostics, ['opencode-lifecycle-shutdown-failed']);
});

test('écriture statistique impossible : échec explicite 78 et sortie du helper', { timeout: 10000 }, async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'cab-shutdown-failure-'));
  const state = join(directory, '.opencode/state/cgpt-approval-bridge');
  // A directory cannot be atomically replaced by the statistics file.
  await mkdir(join(state, 'controller-statistics.json'), { recursive: true });
  const listener = createServer(); await new Promise((r) => listener.listen(0, '127.0.0.1', r));
  const port = listener.address().port; await new Promise((r) => listener.close(r));
  const child = spawn(process.execPath, [fileURLToPath(new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs', import.meta.url))],
    { stdio: ['ignore', 'ignore', 'pipe'], env: { ...fixtureEnvironment, OC_Codex_WORKSPACE: directory,
      OC_Codex_OUTSIDE_SANDBOX: '1', OC_Codex_STATUS_PORT: String(port), OC_Codex_DECISION_MODE: 'manual',
      OC_Codex_OPENCODE_URL: 'http://127.0.0.1:0', CODEX_COMMAND: 'cab-test-unused-app-server' } });
  let errors = ''; child.stderr.on('data', (data) => { errors += data; });
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) {
    const done = once(child, 'exit'); child.kill('SIGKILL'); await done; }
    await rm(directory, { recursive: true, force: true }); });
  let ready = false;
  for (let i = 0; i < 200; i++) {
    try { ready = (await fetch('http://127.0.0.1:' + port + '/status')).ok; } catch { ready = false; }
    if (ready || child.exitCode !== null) break;
    await delay(20);
  }
  assert.ok(ready, errors);
  const helperPids = (await readFile(`/proc/${child.pid}/task/${child.pid}/children`, 'utf8')).trim().split(/\s+/).filter(Boolean);
  assert.equal(helperPids.length, 1);
  const done = once(child, 'exit'); child.kill('SIGTERM');
  assert.deepEqual(await done, [78, null]);
  assert.match(errors, /arrêt incomplet/);
  for (const pid of helperPids) {
    let gone = false;
    for (let i = 0; i < 100; i++) {
      try { await readFile(`/proc/${pid}/stat`, 'utf8'); }
      catch (cause) { if (cause.code !== 'ENOENT') throw cause; gone = true; break; }
      await delay(10);
    }
    assert.ok(gone, 'helper encore présent');
  }
});

test('annuler une observation pendant un arrêt volontaire reste silencieux', async () => {
  let fail; const diagnostics = [];
  const watcher = followOpenCodeLifetime({ info: () => new Promise((_, reject) => { fail = reject; }) }, {
    onExit: () => assert.fail(), onDiagnostic: (code) => diagnostics.push(code) });
  const pending = watcher.check(); watcher.stop(); fail(new Error('synthetic abort')); await pending;
  assert.deepEqual(diagnostics, []);
});
