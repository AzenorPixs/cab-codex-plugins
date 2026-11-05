import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { followOpenCodeLifetime, processIdentity, boundedCleanup } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-process-lifecycle.mjs';

const live = { pid: 123, startTime: '45', state: 'S' };
function fixture(t, options = {}) {
  let identity = live;
  let apiDown = false;
  let exits = 0;
  let calls = 0;
  const diagnostics = [];
  const watcher = followOpenCodeLifetime({ info: async () => {
    calls++; if (apiDown) throw new Error('synthetic transport failure'); return { pid: live.pid };
  } }, { onExit: () => { exits++; }, onDiagnostic: (code) => diagnostics.push(code),
    readIdentity: async () => { if (identity instanceof Error) throw identity; return identity; },
    intervalMs: 60000, ...options });
  t.after(() => watcher.stop());
  return { watcher, diagnostics, identity: (value) => { identity = value; }, down: () => { apiDown = true; },
    counts: () => ({ exits, calls }) };
}

test('attend une identité vérifiable puis se rattache sans fermer', async (t) => {
  const f = fixture(t); f.identity(null); await f.watcher.check();
  assert.equal(f.watcher.snapshot().state, 'waiting'); assert.equal(f.counts().exits, 0);
  f.identity(live); await f.watcher.check(); assert.equal(f.watcher.snapshot().state, 'attached');
  assert.equal(f.counts().exits, 0);
});
test('panne HTTP et client fermé ne ferment pas un serveur vivant', async (t) => {
  const f = fixture(t); await f.watcher.check(); f.down();
  await f.watcher.check(); await f.watcher.check();
  assert.deepEqual(f.counts(), { exits: 0, calls: 1 });
});
for (const [label, state] of [['absence', null], ['zombie', { ...live, state: 'Z' }],
  ['PID réutilisé', { ...live, startTime: '46' }]]) {
  test(`fin prouvée : ${label}, un seul arrêt`, async (t) => {
    const f = fixture(t); await f.watcher.check(); f.identity(state);
    await f.watcher.check(); await f.watcher.check();
    assert.deepEqual(f.counts(), { exits: 1, calls: 1 });
    assert.equal(f.watcher.snapshot().state, 'stopped');
  });
}
test('erreur locale non probante : diagnostic filtré sans arrêt', async (t) => {
  const f = fixture(t); await f.watcher.check(); f.identity(new Error('synthetic private detail'));
  await f.watcher.check(); await f.watcher.check();
  assert.equal(f.counts().exits, 0); assert.deepEqual(f.diagnostics, ['opencode-lifecycle-identity-unverifiable']);
});
test('pas de contrôle recouvrant ni rattachement après arrêt', async () => {
  let resolveInfo; let calls = 0;
  const watcher = followOpenCodeLifetime({ info: () => { calls++; return new Promise((r) => { resolveInfo = r; }); } },
    { onExit() { assert.fail(); }, readIdentity: async () => live });
  const pending = watcher.check(); await watcher.check(); watcher.stop();
  resolveInfo({ pid: 123 }); await pending;
  assert.equal(calls, 1); assert.equal(watcher.snapshot().identity, null);
});
test('identité réelle et disparition brutale d’un processus dédié', async (t) => {
  const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' });
  t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); });
  const identity = await processIdentity(child.pid); assert.equal(identity.pid, child.pid);
  assert.match(identity.startTime, /^\d+$/);
  const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
  assert.equal(await processIdentity(child.pid), null);
  await assert.rejects(processIdentity('../invalid'), /invalid-pid/);
});
test('nettoyage réussi, rejet et délai borné restent distincts', async () => {
  await boundedCleanup(async () => {});
  await assert.rejects(boundedCleanup(async () => { throw new Error('synthetic'); }), /synthetic/);
  await assert.rejects(boundedCleanup(() => new Promise(() => {}), 20), /shutdown-timeout/);
});
