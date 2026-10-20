import assert from 'node:assert/strict';
import test from 'node:test';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { updateComponents } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs';

const version = (source) => source.match(/^(?:export )?(?:const )?(?:VERSION|SERVER_VERSION|version)\s*=\s*["']([^"']+)["']/m)?.[1];
async function fixture(t, { active = ['controller', 'supervisor', 'monitor'], broker = true, realSyntax = false } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'cab-update-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const c = { home: join(root, 'home with space'), workspace: join(root, 'workspace'),
    pluginRoot: join(root, 'plugin'), brokerDirectory: join(root, 'broker'), waitMs: 2000 };
  await mkdir(c.home); await mkdir(c.workspace);
  await cp(new URL('../plugins/cab-approval-bridge/', import.meta.url), c.pluginRoot, { recursive: true });
  const scripts = join(c.home, '.local/share/cab-approval-bridge');
  const monitor = join(c.home, '.local/share/cab-approval-bridge-monitor');
  const units = join(c.home, '.config/systemd/user');
  const copyOld = async (source, target) => {
    await mkdir(target, { recursive: true }); await cp(source, target, { recursive: true });
    for (const entry of await readdir(target, { withFileTypes: true })) {
      if (entry.isFile()) {
        const path = join(target, entry.name); await writeFile(path, (await readFile(path, 'utf8')).replaceAll('1.7.1', '1.7.0'));
      }
    }
  };
  await copyOld(join(c.pluginRoot, 'scripts'), scripts);
  await copyOld(join(c.pluginRoot, 'scripts'), join(monitor, 'scripts'));
  await copyOld(join(c.pluginRoot, 'web-monitor'), join(monitor, 'web-monitor'));
  await copyOld(join(c.pluginRoot, 'systemd'), units);
  await copyOld(join(c.pluginRoot, 'broker'), c.brokerDirectory);
  const runtime = join(c.workspace, 'synthetic-runtime.json');
  await writeFile(runtime, '{"consumedOnce":["once-1"],"run":"a","gate":"OPEN"}\n');
  const catalog = join(c.home, '.local/state/cab-approval-bridge-monitor/catalog.json');
  await mkdir(join(catalog, '..'), { recursive: true }); await writeFile(catalog, 'ARCHIVE-SENTINEL');
  const run = { runId: 'a', changeId: 'change-a', sessionId: 'session-a', contextId: 1, version: 5, state: 'RESERVED',
    resources: [{ key: 'file:one.py', mode: 'write' }], suspension: { action: 'PAUSE', evidenceDigest: 'existing-pause' } };
  const state = { services: Object.fromEntries(['controller', 'supervisor', 'monitor'].map((name) => [name, active.includes(name)])),
    versions: { controller: '1.7.0', supervisor: '1.7.0', monitor: '1.7.0' }, broker,
    brokerVersion: '1.7.0', global: null, run, busy: false, failStart: null, wrongBroker: false, now: Date.now(), events: [] };
  const entry = (component) => component === 'monitor' ? join(monitor, 'scripts/cgpt-approval-bridge-monitor.mjs') : join(scripts, 'cgpt-approval-bridge-' + component + '.mjs');
  const request = async (base, route, body) => {
    const url = new URL(route, base); const path = url.pathname; state.events.push(['http', path]);
    if (path === '/mcp') return { 'cgpt-validation': { status: state.broker ? 'connected' : 'disabled' } };
    if (path.endsWith('/disconnect')) { state.broker = false; return {}; }
    if (path.endsWith('/connect')) {
      state.broker = true; state.brokerVersion = version(await readFile(join(c.brokerDirectory, 'cgpt_approval_bridge_server.py'), 'utf8'));
      if (state.wrongBroker && state.brokerVersion === '1.7.1') state.brokerVersion = '1.7.0';
      return {};
    }
    if (path === '/api/snapshot') {
      if (!state.services.monitor) throw new Error('monitor-off');
      return { version: state.versions.monitor, identity: { workspace: c.workspace } };
    }
    if (base.includes('8789')) {
      if (!state.services.supervisor) throw new Error('supervisor-off');
      return { version: state.versions.supervisor, workspace: c.workspace, pid: 102 };
    }
    if (!state.services.controller) throw new Error('controller-off');
    if (path === '/runs') return { project: c.workspace, schemaVersion: 4, coordinationProtocol: 'resource-scoped-v1',
      runs: [structuredClone(state.run)], requestOwners: { 'consumed-request': { runId: 'a', digest: 'stable' } } };
    if (path === '/status') return { version: state.versions.controller, workspace: c.workspace, pid: 101, mode: 'concurrent',
      runs: { a: { job: { armed: true }, undecidedValidationCount: 0 } },
      brokerReadiness: { server_version: state.brokerVersion }, brokerReadinessReceivedAt: new Date(state.now).toISOString() };
    if (path === '/coordination/global') return { global: state.global };
    if (path === '/coordination/global/request') {
      if (state.global?.transactionId === body.transactionId) return state.global;
      if (state.global && state.global.state !== 'RELEASED') throw new Error('foreign-maintenance');
      state.global = { transactionId: body.transactionId, generation: 8, state: 'DRAINING' }; return state.global;
    }
    if (path === '/coordination/global/confirm') {
      if (state.busy) throw Object.assign(new Error('native-busy'), { status: 409 });
      state.global.state = 'HELD'; return state.global;
    }
    if (path === '/coordination/global/release') { state.global.state = 'RELEASED'; return state.global; }
    throw new Error('unexpected-path:' + path);
  };
  const options = { http: request, now: () => state.now, sleep: async (ms) => { state.now += ms; },
    ...(realSyntax ? {} : { syntax: async () => {} }),
    serviceCommand: async (args) => {
      state.events.push(['systemd', ...args]);
      if (args[0] === 'daemon-reload') return '';
      const component = args[1].replace('cgpt-approval-bridge-', '').replace('.service', '');
      if (args[0] === 'show') return 'LoadState=loaded\nActiveState=' + (state.services[component] ? 'active' : 'inactive') +
        '\nMainPID=' + ({ controller: 101, supervisor: 102, monitor: 103 })[component] + '\nExecStart=/usr/bin/env node "' + entry(component) + '"\n';
      if (args[0] === 'stop') state.services[component] = false;
      else if (args[0] === 'start') {
        if (state.failStart === component) { state.failStart = null; throw new Error('synthetic-start-failed'); }
        state.services[component] = true; state.versions[component] = version(await readFile(entry(component), 'utf8'));
      } else throw new Error('unexpected-command');
      return '';
    } };
  return { root, c, options, state, scripts, entry, runtime, catalog,
    receipt: async () => JSON.parse(await readFile(join(c.home, '.local/state/cab-approval-bridge-update/current.json'), 'utf8')) };
}

test('jeu réel : les quatre briques actives passent en 1.7.1, RUN et archives conservés, deuxième invocation sans arrêt', async (t) => {
  const h = await fixture(t, { realSyntax: true }); const before = await readFile(h.runtime, 'utf8');
  const result = await updateComponents(h.c, h.options);
  assert.equal(result.status, 'completed'); assert.equal(result.version, '1.7.1');
  assert.deepEqual(h.state.versions, { controller: '1.7.1', supervisor: '1.7.1', monitor: '1.7.1' });
  assert.equal(h.state.brokerVersion, '1.7.1'); assert.equal(h.state.global.state, 'RELEASED');
  assert.equal(await readFile(h.runtime, 'utf8'), before); assert.equal(await readFile(h.catalog, 'utf8'), 'ARCHIVE-SENTINEL');
  assert.equal(h.state.run.suspension.action, 'PAUSE');
  const stopped = h.state.events.filter((event) => event[1] === 'stop').length;
  assert.equal((await updateComponents(h.c, h.options)).status, 'up-to-date');
  assert.equal(h.state.events.filter((event) => event[1] === 'stop').length, stopped);
  assert.ok(!JSON.stringify(h.state.events).includes('instance/dispose'));
});

test('services initialement inactifs : fichiers actualisés sans les démarrer', async (t) => {
  const h = await fixture(t, { active: ['monitor'], broker: false });
  assert.equal((await updateComponents(h.c, h.options)).status, 'completed');
  assert.deepEqual(h.state.services, { controller: false, supervisor: false, monitor: true });
  assert.equal(version(await readFile(h.entry('controller'), 'utf8')), '1.7.1');
  assert.ok(!h.state.events.some((event) => event[1] === 'start' && event[2]?.includes('supervisor')));
});

test('attente puis reprise : aucun arrêt pendant activité et transaction durable réutilisée', async (t) => {
  const h = await fixture(t); h.state.busy = true;
  const first = await updateComponents(h.c, h.options); assert.equal(first.status, 'waiting');
  assert.equal(h.state.global.state, 'DRAINING'); assert.ok(!h.state.events.some((event) => event[1] === 'stop'));
  assert.equal(version(await readFile(h.entry('controller'), 'utf8')), '1.7.0');
  h.state.busy = false;
  const second = await updateComponents(h.c, h.options);
  assert.equal(second.status, 'completed'); assert.equal(second.transactionId, first.transactionId);
});

test('paquet incomplet, import absent, downgrade et syntaxe invalide échouent avant arrêt', async (t) => {
  for (const fault of ['broker', 'import', 'downgrade', 'syntax']) {
    const h = await fixture(t);
    if (fault === 'broker') await rm(join(h.c.pluginRoot, 'broker/cgpt_approval_bridge_router.py'));
    if (fault === 'import') await rm(join(h.c.pluginRoot, 'scripts/cgpt-approval-bridge-job-context.mjs'));
    if (fault === 'downgrade') await writeFile(h.entry('controller'), 'const version = "2.0.0";\n');
    if (fault === 'syntax') h.options.syntax = async () => { throw new Error('synthetic-syntax'); };
    await assert.rejects(updateComponents(h.c, h.options));
    assert.ok(!h.state.events.some((event) => event[1] === 'stop'), fault);
    assert.equal(h.state.global, null);
  }
});

test('échec de démarrage et mauvaise version broker déclenchent le retour aux artefacts précédents', async (t) => {
  for (const fault of ['start', 'broker-version']) {
    const h = await fixture(t); const before = await readFile(h.entry('controller'));
    if (fault === 'start') h.state.failStart = 'supervisor'; else h.state.wrongBroker = true;
    await assert.rejects(updateComponents(h.c, h.options), /update-failed-rolled-back/);
    assert.deepEqual(await readFile(h.entry('controller')), before);
    assert.deepEqual(h.state.versions, { controller: '1.7.0', supervisor: '1.7.0', monitor: '1.7.0' });
    assert.equal((await h.receipt()).phase, 'ROLLED_BACK'); assert.equal(h.state.global.state, 'RELEASED');
  }
});

test('interruption pendant installation : récupération des artefacts sans restauration du runtime', async (t) => {
  const h = await fixture(t); const original = await readFile(h.runtime, 'utf8');
  h.options.onPhase = async (phase) => { if (phase === 'INSTALLING') throw Object.assign(new Error('crash'), { code: 'SIMULATED_CRASH' }); };
  await assert.rejects(updateComponents(h.c, h.options), /crash/);
  delete h.options.onPhase;
  await updateComponents(h.c, { ...h.options, rollbackOnly: true });
  assert.equal((await h.receipt()).phase, 'ROLLED_BACK');
  assert.equal(version(await readFile(h.entry('controller'), 'utf8')), '1.7.0');
  assert.equal(await readFile(h.runtime, 'utf8'), original);
});

test('interruption à la libération : réconciliation sans retour arrière après reprise', async (t) => {
  const h = await fixture(t);
  h.options.onPhase = async (phase) => {
    if (phase === 'RELEASING') { h.state.global.state = 'RELEASED'; throw Object.assign(new Error('crash'), { code: 'SIMULATED_CRASH' }); }
  };
  await assert.rejects(updateComponents(h.c, h.options), /crash/);
  const stops = h.state.events.filter((event) => event[1] === 'stop').length;
  delete h.options.onPhase;
  assert.equal((await updateComponents(h.c, h.options)).status, 'up-to-date');
  assert.equal(h.state.events.filter((event) => event[1] === 'stop').length, stops);
});

test('cibles projet, liens et journal corrompu sont refusés sans écrasement', async (t) => {
  const h = await fixture(t);
  await assert.rejects(updateComponents({ ...h.c, brokerDirectory: join(h.c.workspace, 'broker') }, h.options), /project-destination/);
  await assert.rejects(updateComponents({ ...h.c, brokerDirectory: join(h.c.home, '.codex/plugins/cache/old/broker') }, h.options), /cache-destination/);
  await rm(h.entry('controller')); await symlink(join(h.c.pluginRoot, 'scripts/cgpt-approval-bridge-controller.mjs'), h.entry('controller'));
  await assert.rejects(updateComponents(h.c, h.options));
  assert.ok(!h.state.events.some((event) => event[1] === 'stop'));
  const path = join(h.c.home, '.local/state/cab-approval-bridge-update/current.json'); await writeFile(path, '{broken');
  await assert.rejects(updateComponents(h.c, h.options), /journal-invalid/);
  assert.equal(await readFile(path, 'utf8'), '{broken');
});

test('une dérive des générations interdit la levée du gel et conserve le diagnostic de récupération', async (t) => {
  const h = await fixture(t);
  h.options.onPhase = async (phase) => { if (phase === 'VERIFYING') h.state.run.version++; };
  await assert.rejects(updateComponents(h.c, h.options), /update-recovery-required/);
  assert.equal((await h.receipt()).phase, 'ROLLBACK_FAILED'); assert.equal(h.state.global.state, 'HELD');
  assert.equal(h.state.run.version, 6);
});

test('interruption avant le gel : la même intention de maintenance est récupérée', async (t) => {
  const h = await fixture(t);
  h.options.onPhase = async (phase) => { if (phase === 'FREEZING') throw Object.assign(new Error('crash'), { code: 'SIMULATED_CRASH' }); };
  await assert.rejects(updateComponents(h.c, h.options), /crash/);
  assert.equal(h.state.global, null); const id = (await h.receipt()).id;
  delete h.options.onPhase;
  const result = await updateComponents(h.c, h.options);
  assert.equal(result.status, 'completed'); assert.equal(result.transactionId, id);
});

test('autorité flock concurrente refusée, libération et contrat corrompu préservé', async (t) => {
  const h = await fixture(t);
  let entered, resume;
  const ready = new Promise((done) => { entered = done; });
  const pending = new Promise((done) => { resume = done; });
  const first = updateComponents(h.c, { ...h.options, onPhase: async (phase) => {
    if (phase === 'PREPARED') { entered(); await pending; }
  } });
  await ready;
  await assert.rejects(updateComponents(h.c, h.options), /update-already-running/);
  resume(); await first;
  const directory = join(h.c.home, '.local/state/cab-approval-bridge-update');
  assert.equal((await updateComponents(h.c, h.options)).status, 'up-to-date');
  const invalid = JSON.stringify({ schema: 1, phase: 'INSTALLING', files: [] });
  await writeFile(join(directory, 'current.json'), invalid);
  await assert.rejects(updateComponents(h.c, h.options), /update-journal-invalid/);
  assert.equal(await readFile(join(directory, 'current.json'), 'utf8'), invalid);
});

test('une modification externe pendant attente bloque le déploiement ; annulation conserve cette modification', async (t) => {
  const h = await fixture(t); h.state.busy = true;
  assert.equal((await updateComponents(h.c, h.options)).status, 'waiting');
  await writeFile(h.entry('controller'), 'const version = "1.7.0";\n// external edit\n');
  h.state.busy = false;
  await assert.rejects(updateComponents(h.c, h.options), /update-installed-artifact-changed/);
  await updateComponents(h.c, { ...h.options, rollbackOnly: true });
  assert.match(await readFile(h.entry('controller'), 'utf8'), /external edit/);
  assert.ok(!h.state.events.some((event) => event[1] === 'stop'));
  assert.equal(h.state.global.state, 'RELEASED');
});

test('stage altéré pendant attente refusé avant tout arrêt', async (t) => {
  const h = await fixture(t); h.state.busy = true;
  await updateComponents(h.c, h.options); const receipt = await h.receipt();
  await writeFile(join(h.c.home, '.local/state/cab-approval-bridge-update', receipt.id, 'stage/0'), 'modified stage');
  h.state.busy = false;
  await assert.rejects(updateComponents(h.c, h.options), /update-stage-changed/);
  assert.ok(!h.state.events.some((event) => event[1] === 'stop'));
  await updateComponents(h.c, { ...h.options, rollbackOnly: true });
  assert.equal(h.state.global.state, 'RELEASED');
});

test('gel levé par une intervention externe : la récupération ne coupe pas les RUN repris', async (t) => {
  const h = await fixture(t);
  h.options.onPhase = async (phase) => { if (phase === 'INSTALLING') throw Object.assign(new Error('crash'), { code: 'SIMULATED_CRASH' }); };
  await assert.rejects(updateComponents(h.c, h.options), /crash/); delete h.options.onPhase;
  h.state.global.state = 'RELEASED'; h.state.services.controller = true; h.state.run.version++;
  const stops = h.state.events.filter((event) => event[1] === 'stop').length;
  await assert.rejects(updateComponents(h.c, h.options), /update-recovery-required/);
  assert.equal(h.state.events.filter((event) => event[1] === 'stop').length, stops);
  assert.equal((await h.receipt()).phase, 'ROLLBACK_FAILED');
});
