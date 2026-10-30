import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MonitorCatalog, MonitorServices, eligibility, itemKey } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-management.mjs';
import { createMonitorServer } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor.mjs';
import { monitorConfiguration } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-data.mjs';

async function directory(t) {
  const root = await mkdtemp(join(tmpdir(), 'cab-management-'));
  t.after(() => rm(root, { force: true, recursive: true })); return root;
}
function snapshot() {
  return { sources: Object.fromEntries(['controller', 'registry', 'sessions'].map((key) => [key, { stale: false }])),
    runs: [{ runId: 'done', changeId: 'change-a', state: 'DELIVERED', generation: 12, armed: null,
      pending: null, hasMandate: false, nativeActivity: null, gate: { status: null } }],
    changes: { available: true, truncated: false, changes: [{ changeId: 'change-a', location: 'active',
      title: 'Change terminé', progress: { available: true, completed: 1, total: 1, tasks: [{ done: true, label: 'Vérifier' }] } }] } };
}
const body = (kind, item, action) => ({ kind, key: itemKey(kind, item), action, ...(action === 'delete' ? { confirm: true } : {}) });

test('catalogue : persistance, restauration, suppression logique et sources préservées', async (t) => {
  const root = await directory(t); const source = join(root, 'tasks.md');
  await writeFile(source, '- [x] Source intacte\n');
  const data = snapshot(); let catalog = new MonitorCatalog(join(root, 'private'), root);
  await catalog.load();
  assert.equal(catalog.project(data).runs[0].manageable, true);
  await catalog.mutate(body('runs', data.runs[0], 'archive'), data);
  await catalog.mutate(body('changes', data.changes.changes[0], 'archive'), data);
  catalog = new MonitorCatalog(join(root, 'private'), root); await catalog.load();
  let view = catalog.project(data);
  assert.equal(view.runs.length, 0); assert.equal(view.changes.changes.length, 0);
  assert.equal(view.archives.runs.length, 1); assert.equal(view.archives.changes.length, 1);
  await catalog.mutate(body('runs', data.runs[0], 'restore'), data);
  view = catalog.project(data); assert.equal(view.runs.length, 1); assert.equal(view.archives.runs.length, 0);
  await catalog.mutate(body('runs', data.runs[0], 'delete'), data);
  assert.equal(catalog.project(data).runs.length, 0);
  await catalog.mutate(body('changes', data.changes.changes[0], 'delete'), data);
  assert.equal(catalog.project(data).archives.changes.length, 0);
  assert.equal(await readFile(source, 'utf8'), '- [x] Source intacte\n');
  assert.equal(data.runs[0].state, 'DELIVERED');
});

test('catalogue : génération reprise et modification documentaire restent visibles', async (t) => {
  const root = await directory(t); const data = snapshot(); const catalog = new MonitorCatalog(root, root);
  await catalog.mutate(body('runs', data.runs[0], 'archive'), data);
  await catalog.mutate(body('changes', data.changes.changes[0], 'delete'), data);
  const next = structuredClone(data); next.runs[0].generation++; next.runs[0].state = 'RESERVED';
  next.changes.changes[0].progress.tasks.push({ done: false, label: 'Nouvelle tâche' });
  next.changes.changes[0].progress.total++;
  const view = catalog.project(next);
  assert.equal(view.runs.length, 1); assert.equal(view.runs[0].manageable, false);
  assert.equal(view.archives.runs.length, 1); assert.equal(view.changes.changes.length, 1);
  await catalog.mutate(body('runs', data.runs[0], 'restore'), data);
  assert.equal(catalog.project(next).runs.length, 1);
  next.runs[0].state = 'DELIVERED';
  await catalog.mutate(body('runs', next.runs[0], 'archive'), next);
  assert.equal(catalog.project(next).runs.length, 0, 'une génération restaurée ne réapparaît pas sous une génération archivée');
});

test('éligibilité : refus STOPPED réservé, états inconnus, activité, fraîcheur et troncature', async (t) => {
  const root = await directory(t); const data = snapshot(); const catalog = new MonitorCatalog(root, root);
  for (const change of [
    (s) => { s.runs[0].state = 'RESERVED'; s.runs[0].operationalState = 'STOPPED'; },
    (s) => { s.runs[0].pending = 1; }, (s) => { s.runs[0].hasMandate = true; },
    (s) => { s.runs[0].nativeActivity = 'busy'; }, (s) => { s.sources.registry.stale = true; },
    (s) => { s.sources.sessions.stale = true; }, (s) => { s.runsTruncated = true; },
    (s) => { s.changes.truncated = true; }, (s) => { s.runs[0].generation = null; },
  ]) {
    const value = structuredClone(data); change(value);
    assert.equal(eligibility(value, 'runs', value.runs[0]), false);
    await assert.rejects(catalog.mutate(body('runs', value.runs[0], 'archive'), value), /protected/);
  }
  data.runs[0].state = 'RESERVED';
  assert.equal(eligibility(data, 'changes', data.changes.changes[0]), false);
});

test('catalogue : corruption et liens refusés sans écrasement', async (t) => {
  const root = await directory(t); const privateDir = join(root, 'private'); await mkdir(privateDir);
  await writeFile(join(privateDir, 'catalog.json'), '{broken');
  let catalog = new MonitorCatalog(privateDir, root); await catalog.load();
  assert.equal(catalog.error, 'monitor-catalog-unavailable');
  await assert.rejects(catalog.mutate(body('runs', snapshot().runs[0], 'archive'), snapshot()), /unavailable/);
  assert.equal(await readFile(join(privateDir, 'catalog.json'), 'utf8'), '{broken');
  const linked = join(root, 'linked'); await symlink(privateDir, linked);
  catalog = new MonitorCatalog(linked, root); await catalog.load();
  assert.equal(catalog.error, 'monitor-catalog-unavailable');
});

test('catalogue : suppression sans confirmation et opérations concurrentes refusées', async (t) => {
  const root = await directory(t); const catalog = new MonitorCatalog(root, root); const data = snapshot();
  await assert.rejects(catalog.mutate({ ...body('runs', data.runs[0], 'delete'), confirm: false }, data), /invalid/);
  const first = catalog.mutate(body('runs', data.runs[0], 'archive'), data);
  await assert.rejects(catalog.mutate(body('changes', data.changes.changes[0], 'archive'), data), /busy/);
  await first;
});

function services({ active = true, refused = false, unmanaged = false, commandFailure = false } = {}) {
  const calls = []; const units = new Map();
  const configuration = { workspace: '/fixture', controllerUrl: 'http://127.0.0.1:8788',
    supervisorUrl: 'http://127.0.0.1:8789', opencodeUrl: 'http://127.0.0.1:4096' };
  let broker = 'connected';
  const openCodeClient = {
    mcp: async (directory = '/shared-native') => { calls.push(['GET', '/api/mcp', '?directory=' + encodeURIComponent(directory)]);
      return { 'cgpt-validation': { status: broker } }; },
    disconnectMcp: async (_server, directory = '/shared-native') => { calls.push(['POST', '/api/experimental/mcp/cgpt-validation/disconnect', '?directory=' + encodeURIComponent(directory)]); broker = 'disabled'; },
    connectMcp: async (_server, directory = '/shared-native') => { calls.push(['POST', '/api/experimental/mcp/cgpt-validation/connect', '?directory=' + encodeURIComponent(directory)]); broker = 'connected'; },
  };
  const instance = new MonitorServices(configuration, { pid: 22,
    openCodeClient,
    serviceCommand: async (args) => {
      calls.push(args);
      if (args[0] === 'show') return 'LoadState=loaded\nActiveState=' + (units.get(args[1]) || (active ? 'active' : 'inactive')) +
        '\nMainPID=' + (unmanaged ? '99' : '22') + '\n';
      if (commandFailure) throw new Error('synthetic failure');
      units.set(args[1], args[0] === 'stop' ? 'inactive' : 'active'); return '';
    },
    fetcher: async (input, options) => {
      const url = new URL(input); calls.push([options.method, url.pathname, url.search]);
      if (url.pathname.endsWith('prepare') && refused) return Response.json({ error: 'monitor-runs-active' }, { status: 409 });
      if (url.pathname.endsWith('/disconnect')) broker = 'disabled';
      if (url.pathname.endsWith('/connect')) broker = 'connected';
      return Response.json(url.pathname === '/mcp' ? { 'cgpt-validation': { status: broker } } :
        { workspace: '/fixture', pid: 22, token: 'lease', expiresAt: Date.now() + 30000 });
    } });
  return { instance, calls };
}

test('services : unités fixes et broker natif sans redémarrage OpenCode', async () => {
  const h = services();
  for (const component of ['controller', 'supervisor', 'broker']) {
    assert.equal((await h.instance.act({ component, action: 'restart' })).status, 'completed');
  }
  assert.ok(h.calls.some((args) => args[0] === 'restart' && args[1] === 'cgpt-approval-bridge-controller.service'));
  assert.ok(h.calls.some((args) => args[1] === '/api/experimental/mcp/cgpt-validation/disconnect' && args[2] === '?directory=%2Fshared-native'));
  assert.ok(h.calls.some((args) => args[1] === '/api/experimental/mcp/cgpt-validation/connect'));
  assert.ok(!JSON.stringify(h.calls).includes('/instance/dispose'));
  await assert.rejects(h.instance.act({ component: 'opencode', action: 'restart' }), /invalid/);
});

test('services : refus de garde ou propriété avant commande, démarrage à froid et erreurs explicites', async () => {
  let h = services({ refused: true });
  await assert.rejects(h.instance.act({ component: 'controller', action: 'stop' }), /refused/);
  assert.equal(h.calls.filter((args) => args[0] === 'stop').length, 0);
  h = services({ unmanaged: true });
  await assert.rejects(h.instance.act({ component: 'supervisor', action: 'restart' }), /unmanaged/);
  assert.ok(h.calls.some((args) => args[1] === '/monitor/lifecycle/release'));
  h = services({ active: false, refused: true });
  assert.equal((await h.instance.act({ component: 'controller', action: 'start' })).status, 'completed');
  assert.ok(!h.calls.some((args) => args[1] === '/monitor/lifecycle/prepare'));
  h = services({ commandFailure: true });
  await assert.rejects(h.instance.act({ component: 'controller', action: 'restart' }), /synthetic/);
  assert.ok(h.calls.some((args) => args[1] === '/monitor/lifecycle/release'));
});

test('Web : redémarrage différé seulement pour son propre service', async () => {
  const h = services();
  const result = await h.instance.act({ component: 'monitor', action: 'restart' });
  assert.equal(result.deferred, true); assert.equal(h.calls.length, 1);
  await h.instance.restartWeb();
  assert.deepEqual(h.calls[1], ['--no-block', 'restart', 'cgpt-approval-bridge-monitor.service']);
  const manual = services({ unmanaged: true });
  await assert.rejects(manual.instance.act({ component: 'monitor', action: 'restart' }), /unmanaged/);
});

test('API : origine, JSON, champs, routes et état serveur protégés', async (t) => {
  const root = await directory(t);
  const monitor = await createMonitorServer({ ...monitorConfiguration({ OC_Codex_WORKSPACE: root,
    OC_Codex_MONITOR_STATE_DIR: join(root, 'catalogs') }), port: 0 },
  { fetcher: async () => Response.json({}), serviceCommand: async () => { throw new Error('must not execute'); } });
  await monitor.start(); t.after(() => monitor.close());
  const base = 'http://127.0.0.1:' + monitor.server.address().port;
  const headers = { 'content-type': 'application/json', 'x-cab-monitor': '1', origin: base };
  const route = base + '/api/manage/catalog';
  assert.equal((await fetch(route, { method: 'POST', headers: { ...headers, origin: 'https://foreign.invalid' }, body: '{}' })).status, 403);
  assert.equal((await fetch(route, { method: 'POST', headers: { ...headers, 'x-cab-monitor': '' }, body: '{}' })).status, 403);
  assert.equal((await fetch(route)).status, 405);
  assert.equal((await fetch(base + '/api/manage/anything', { method: 'POST', headers, body: '{}' })).status, 404);
  assert.equal((await fetch(route, { method: 'POST', headers, body: JSON.stringify({ kind: 'runs', key: '../x', action: 'archive' }) })).status, 400);
  assert.equal((await fetch(route, { method: 'POST', headers, body: 'x'.repeat(5000) })).status, 413);
  assert.equal((await fetch(route, { method: 'POST', headers, body: JSON.stringify(body('runs', snapshot().runs[0], 'archive')) })).status, 409);
});
