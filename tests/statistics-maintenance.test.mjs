import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SessionStatistics } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs';
import { StatisticsMaintenance, statisticsDashboard, statisticsSelection, writeRetentionSnapshot } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics-maintenance.mjs';

const DAY = 86400000;
async function fixture(t, days = 7) {
  const root = await mkdtemp(join(tmpdir(), 'cab-statistics-retention-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const clock = { now: 2000000000000 }, cutoff = clock.now - days * DAY;
  const s = new SessionStatistics(root, { now: () => clock.now, project: root, intervalMs: 0 });
  const context = (runId, at, state = 'DELIVERED') => {
    const c = s.context({ runId, contextId: 1, changeId: 'change-' + runId, state });
    c.firstAt = at - 100; c.lastAt = at; c.state = state;
    return c;
  };
  const old = context('old', cutoff - 1), boundary = context('boundary', cutoff), active = context('active', cutoff - 2, 'RESERVED');
  const referenced = context('referenced', cutoff - 3);
  const record = (c) => ({ runId: c.runId, contextId: c.contextId, changeId: c.changeId,
    sessionId: null, state: c.state, phase: c.phase, firstAt: c.firstAt, lastAt: c.lastAt, closedAt: c.state === 'DELIVERED' ? c.lastAt : null });
  const event = (c) => ({ id: 'event-' + c.runId, runId: c.runId, contextId: c.contextId, changeId: c.changeId,
    at: c.lastAt, kind: 'decision', status: 'approved', name: null, durationMs: null });
  const segment = (at, contexts) => ({ from: at - 100, to: at, registryKnown: true, nativeAvailable: true,
    scopeRunIds: contexts.map((c) => c.runId), integrationOwner: null,
    contexts: contexts.map((c) => ({ runId: c.runId, contextId: c.contextId, changeId: c.changeId,
      sessionId: null, nativeType: 'busy', queue: false, stale: false })) });
  const start = cutoff - 10000;
  s.observations.data.native = { firstAt: start, lastAt: clock.now,
    catalog: [old, boundary, active, referenced].map(record), events: [old, boundary, active, referenced].map(event),
    intervals: [segment(cutoff - 500, [old]), segment(cutoff - 300, [old, active]), segment(cutoff, [boundary])] };
  s.observations.eventsById = new Map(s.observations.data.native.events.map((e) => [[e.runId, e.contextId, e.changeId, e.kind, e.id].join('\0'), e]));
  const bundle = (datasetId, contexts) => ({ schemaVersion: 1, project: root, sourceId: 'audit', datasetId,
    firstAt: start, lastAt: cutoff - 1, pollMs: 10, gapMs: 100, intervals: [], events: [],
    catalog: contexts.map(record), quota: [], evidence: [] });
  await s.observations.import(bundle('old-dataset', [old]));
  await s.observations.import(bundle('protected-dataset', [active]));
  s.data.firstAt = start;
  s.data.admissions = { old: { runId: 'old', changeId: old.changeId, sessionId: 'session-old',
    firstAt: start, lastAt: cutoff - 1, attempts: 1, causes: { conflict: 1 } }, active: {
    runId: 'active', changeId: active.changeId, sessionId: 'session-active', firstAt: start, lastAt: cutoff - 1, attempts: 1, causes: { conflict: 1 } } };
  s.observations.dirty = true; await s.flush();
  const references = [referenced];
  const maintenance = new StatisticsMaintenance(s, { now: () => clock.now, referenced: () => references });
  return { s, maintenance, clock, cutoff, old, boundary, active, referenced, references, context, root };
}

for (const days of [1, 3, 7, 30, 365]) test(`purge ${days} jours : borne stricte, actifs/référencés, segments mixtes, imports et restauration`, async (t) => {
  const h = await fixture(t, days);
  const before = await readFile(h.s.path, 'utf8');
  const preview = h.maintenance.preview({ days });
  assert.equal(preview.cutoff, h.cutoff);
  assert.deepEqual(preview.counts, { contexts: 1, admissions: 1, catalog: 1, events: 1, intervals: 1, datasets: 1 });
  assert.equal(await readFile(h.s.path, 'utf8'), before, 'preview sans écriture');
  const result = await h.maintenance.purge({ token: preview.token, confirm: true });
  assert.equal(result.status, 'completed');
  assert.equal(h.s.data.contexts['old:1'], undefined);
  for (const name of ['boundary', 'active', 'referenced']) assert.ok(h.s.data.contexts[name + ':1']);
  assert.equal(h.s.observations.data.native.intervals.length, 2);
  assert.equal(h.s.observations.data.datasets.length, 1);
  assert.equal(h.s.data.admissions.old, undefined); assert.ok(h.s.data.admissions.active);
  assert.deepEqual(await h.maintenance.purge({ token: preview.token, confirm: true }), result);
  const restored = new SessionStatistics(h.root, { now: () => h.clock.now, intervalMs: 0, project: h.root });
  assert.equal(restored.error, null); assert.equal(restored.observations.error, null);
  assert.equal(restored.data.contexts['old:1'], undefined);
  assert.equal(restored.observations.data.native.events.some((e) => e.runId === 'old'), false);
});

test('contrat fermé, expiration, dérive et limite de vingt reçus', async (t) => {
  const h = await fixture(t);
  for (const payload of [{ days: 2 }, { days: '7' }, { days: 7, path: '/arbitrary' }, null]) assert.throws(() => h.maintenance.preview(payload));
  let preview = h.maintenance.preview({ days: 7 });
  await assert.rejects(h.maintenance.purge({ token: preview.token, confirm: false }), /confirmation-invalid/);
  h.s.data.contexts['old:1'].messages.new = 'assistant';
  await assert.rejects(h.maintenance.purge({ token: preview.token, confirm: true }), /preview-changed/);
  preview = h.maintenance.preview({ days: 7 }); h.references.push(h.old);
  await assert.rejects(h.maintenance.purge({ token: preview.token, confirm: true }), /preview-changed/);
  preview = h.maintenance.preview({ days: 7 }); h.clock.now += 300000;
  await assert.rejects(h.maintenance.purge({ token: preview.token, confirm: true }), /preview-expired/);
  for (let i = 0; i < 25; i++) h.maintenance.preview({ days: 7 });
  assert.equal(h.maintenance.previews.size, 20);
});

test('échec partiel : magasin observation refusé sans perdre ses données ni réécrire les données supprimées', async (t) => {
  const h = await fixture(t);
  h.maintenance.writer = (path, data) => { if (path === h.s.observations.path) throw new Error('disk-unavailable'); writeRetentionSnapshot(path, data); };
  const preview = h.maintenance.preview({ days: 7 });
  const result = await h.maintenance.purge({ token: preview.token, confirm: true });
  assert.equal(result.status, 'partial-failure');
  assert.equal(result.stores[0].removed.contexts, 1); assert.equal(result.stores[1].removed.events, 0);
  assert.equal(h.s.data.contexts['old:1'], undefined); assert.ok(h.s.observations.data.native.events.some((e) => e.runId === 'old'));
  assert.deepEqual(await h.maintenance.purge({ token: preview.token, confirm: true }), result);
});

test('drainage des écritures, import concurrent refusé et observation récente conservée', async (t) => {
  const h = await fixture(t); let release;
  h.s.saving = new Promise((resolve) => { release = resolve; });
  const preview = h.maintenance.preview({ days: 7 });
  const pending = h.maintenance.purge({ token: preview.token, confirm: true });
  await Promise.resolve();
  await assert.rejects(h.s.observations.import({}), /maintenance-busy/);
  await assert.rejects(h.maintenance.purge({ token: preview.token, confirm: true }), /maintenance-busy/);
  h.context('recent', h.clock.now);
  release(); await pending; h.s.saving = null;
  assert.ok(JSON.parse(await readFile(h.s.path, 'utf8')).contexts['recent:1']);
  assert.equal(h.maintenance.busy, false); assert.equal(h.s.maintenance, false);
});

test('lien refusé et donnée invalide : pas de remplacement de cible', async (t) => {
  const h = await fixture(t);
  const target = join(h.root, 'protected-fixture.json'); await writeFile(target, '{"sentinel":true}\n');
  await rm(h.s.observations.path); await symlink(target, h.s.observations.path);
  const preview = h.maintenance.preview({ days: 7 });
  const result = await h.maintenance.purge({ token: preview.token, confirm: true });
  assert.equal(result.status, 'partial-failure'); assert.equal(await readFile(target, 'utf8'), '{"sentinel":true}\n');
  h.s.error = 'statistics-restoration-invalid';
  assert.throws(() => h.maintenance.preview({ days: 7 }), /maintenance-unavailable/);
});

test('dashboard : sources séparées, fenêtres/cumul, projection sans données privées et filtres fermés', async (t) => {
  const h = await fixture(t);
  const result = statisticsDashboard(h.s, new URLSearchParams({ selection: '7d', runId: 'old' }));
  assert.equal(result.sources.length, 3); assert.equal(result.selection, '7d');
  assert.ok(result.limitations.some((value) => value.includes('hors fenêtre')));
  assert.ok(result.cumulative.every((c) => c.runId === 'old'));
  assert.ok(result.sources.every((s) => s.contexts.every((c) => c.runId === 'old')));
  const text = JSON.stringify(result);
  assert.ok(!text.includes('sessionId')); assert.ok(!text.includes('accountFingerprint'));
  assert.ok(!text.includes('"events":')); assert.ok(!text.includes('"project":'));
  for (const parameters of ['selection=365d', 'runId=../bad', 'selection=current&selection=last', 'path=/private']) {
    assert.throws(() => statisticsSelection(new URLSearchParams(parameters)), /selection-invalid/);
  }
});

test('une purge réduit la couverture et conserve les agrégats globaux sans inventer ZERO', async (t) => {
  const h = await fixture(t, 1);
  const before = h.s.observations.view('7d').sources[0].categories.reservation;
  const cumulative = structuredClone(h.s.data.categories);
  const preview = h.maintenance.preview({ days: 1 });
  await h.maintenance.purge({ token: preview.token, confirm: true });
  const after = h.s.observations.view('7d').sources[0].categories.reservation;
  assert.equal(after.unknownMs, before.unknownMs + 100);
  assert.equal(after.zeroMs, before.zeroMs);
  assert.deepEqual(h.s.data.categories, cumulative);
});
