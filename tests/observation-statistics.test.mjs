import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, statSync, symlinkSync, linkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ObservationStatistics, summarizeSegments, validateBundle } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observation-statistics.mjs';
import { SessionStatistics } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs';
import { buildAuditBundle } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-import-observations.mjs';

const day = 86400000;
const at = 1800000000000;
const run = (id, contextId = 1) => ({ runId: id, contextId, changeId: 'change-' + id, sessionId: 'ses_' + id });
const context = (id, firstAt = at, lastAt = at + 1000) => ({ ...run(id), state: 'RESERVED', phase: 'WORK',
  firstAt, lastAt, closedAt: null });
const interval = (from, to, ids, extra = {}) => ({ from, to, registryKnown: true, nativeAvailable: true,
  scopeRunIds: ids, integrationOwner: null, contexts: ids.map((id) => ({ ...run(id), nativeType: 'busy', queue: false, stale: false })), ...extra });
const bundle = (project, extra = {}) => ({ schemaVersion: 1, sourceId: 'audit', datasetId: 'one', project,
  firstAt: at, lastAt: at + 1000, pollMs: 5000, gapMs: 15000,
  intervals: [interval(at, at + 1000, ['a'])], catalog: [context('a')], events: [], quota: [], evidence: [], ...extra });
function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'cab-observations-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('window clipping partitions known, unknown, two and three without adding pairs', () => {
  const result = summarizeSegments([interval(at, at + 1000, ['a','b']), interval(at + 1000, at + 2000, ['a','b','c'])], at + 500, at + 2500);
  for (const bucket of Object.values(result.categories)) {
    assert.equal(bucket.multiMs, 1500); assert.equal(bucket.unknownMs, 500);
    assert.equal(bucket.exactlyTwoMs, 500); assert.equal(bucket.threeOrMoreMs, 1000);
    assert.equal(bucket.coverage, .75);
  }
  assert.ok(result.pairs.reduce((sum, pair) => sum + pair.reservedMs, 0) > result.durationMs);
});

test('concurrent identical imports persist once and recover the same provenance', async (t) => {
  const directory = fixture(t); const store = new ObservationStatistics(directory, { now: () => at + 1000, project: directory });
  const b = bundle(directory);
  const receipts = await Promise.all([store.import(b), store.import(b)]);
  assert.deepEqual(receipts.map((r) => r.status), ['imported','already-imported']);
  assert.equal(statSync(store.path).mode & 0o777, 0o600);
  const restored = new ObservationStatistics(directory, { now: () => at + 1000, project: directory });
  assert.equal((await restored.import(b)).status, 'already-imported');
  await assert.rejects(restored.import({ ...b, pollMs: 4000 }), /observation-dataset-conflict/);
  assert.equal(restored.overview().datasets.length, 1);
});

test('unknown fields, commands, wrong project and malformed quotas never enter the store', async (t) => {
  const directory = fixture(t); const store = new ObservationStatistics(directory, { persist: false, project: directory });
  for (const extra of [{ command: 'SECRET' }, { project: '/foreign' }, { quota: [{ token: 'SECRET' }] }]) {
    await assert.rejects(store.import(bundle(directory, extra)), /observation-bundle-invalid/);
  }
  assert.equal(store.overview().datasets.length, 0);
  assert.equal(JSON.stringify(store.data).includes('SECRET'), false);
});

test('scope changes and missing queue evidence stay unknown', () => {
  const before = interval(at, at + 1000, ['a']);
  const after = interval(at + 1000, at + 2000, ['a','b']);
  after.contexts.forEach((c) => { c.queue = null; c.stale = null; });
  const result = summarizeSegments([before, after], at, at + 2000, (c) => c.runId === 'b', 'b');
  assert.equal(result.categories.reservation.unknownMs, 1000);
  assert.equal(result.categories.reservation.monoMs, 1000);
  assert.equal(result.perContext[0].queueUnknownMs, 1000); assert.equal(result.perContext[0].staleUnknownMs, 1000);
});

test('REPORT is current and the last selection requires an observed delivery', async (t) => {
  const directory = fixture(t); let clock = at; const store = new ObservationStatistics(directory, { persist: false, project: directory, now: () => clock });
  store.catalog({ ...run('a'), state: 'RESERVED', phase: 'REPORT' });
  assert.equal(store.view('last').sources[0].contexts.length, 0);
  clock += 100; store.catalog({ ...run('a'), state: 'DELIVERED', phase: 'REPORT' });
  assert.equal(store.view('last').sources[0].contexts[0].closedAt, clock);
  const historical = context('b', at - 100, at); historical.state = 'DELIVERED'; historical.closedAt = at;
  await store.import(bundle(directory, { datasetId: 'older', firstAt: at - 100, lastAt: at,
    intervals: [interval(at - 100, at, ['b'])], catalog: [historical] }));
  assert.equal(store.view('last').sources[1].contexts.length, 0);
});

test('native hooks record filtered windows without converting historical cumulative counters', async (t) => {
  const directory = fixture(t); let clock = at;
  const stats = new SessionStatistics(directory, { now: () => clock, persist: false, intervalMs: 0, project: directory });
  t.after(() => stats.close());
  const a = { ...run('a'), state: 'RESERVED', phase: 'WORK', referenceVersion: 0, version: 1 };
  stats.registry({ project: directory, runs: [a], integrationOwner: null, referenceVersion: 0, integrationQueue: [] });
  stats.connection(true); stats.nativeSnapshot({ ses_a: { type: 'busy' } });
  stats.context(a).requests['legacy-only'] = { decision: 'approved', receivedAt: at - day, decisionAt: at - day + 1 };
  stats.observe(a, 'validation-received', { requestId: 'now', command: 'SECRET' }); clock += 1000;
  stats.observe(a, 'validation-manually-answered', { requestId: 'now', decision: 'approved' });
  const view = stats.observations.view('24h', 'a');
  assert.equal(view.sources[0].eventCounts['decision:approved'], 1);
  assert.equal(view.sources[0].categories.native.monoMs, 1000);
  assert.equal(JSON.stringify(view).includes('SECRET'), false);
});

test('persistence failure stays visible and cannot acknowledge an undurable duplicate', async (t) => {
  const directory = fixture(t); const store = new ObservationStatistics(directory, { project: directory, now: () => at + 1000 });
  symlinkSync(join(directory, 'missing'), store.path);
  await assert.rejects(store.import(bundle(directory)), /observation-persistence-unavailable/);
  await assert.rejects(store.import(bundle(directory)), /observation-store-unavailable/);
  assert.equal(store.overview().datasets.length, 0);
});

test('enriched or linked snapshots are preserved and marked invalid', async (t) => {
  const directory = fixture(t); const store = new ObservationStatistics(directory, { project: directory, now: () => at + 1000 });
  await store.import(bundle(directory));
  const original = readFileSync(store.path, 'utf8'); const enriched = JSON.parse(original); enriched.secret = 'SECRET';
  writeFileSync(store.path, JSON.stringify(enriched));
  const invalid = new ObservationStatistics(directory, { project: directory, now: () => at + 1000 });
  assert.equal(invalid.error, 'observation-restoration-invalid');
  await invalid.flush(); assert.match(readFileSync(store.path, 'utf8'), /SECRET/);
  rmSync(store.path); writeFileSync(join(directory, 'original'), original); linkSync(join(directory, 'original'), store.path);
  assert.equal(new ObservationStatistics(directory, { project: directory }).error, 'observation-restoration-invalid');
});

test('streaming audit migration keeps scopes, gaps, delivery bounds and drops raw bodies', async (t) => {
  const directory = fixture(t);
  const paths = Object.fromEntries(['samples','config','monitor','quota','proof'].map((name) => [name, join(directory, name)]));
  writeFileSync(paths.config, JSON.stringify({ project: directory, sampleSeconds: 5, maximumAcceptedGapSeconds: 15,
    runs: [{ runId: 'a' }, { runId: 'b', trackingRequestedAtUtc: new Date(at + 5000).toISOString() }] }));
  writeFileSync(paths.monitor, JSON.stringify({ collectorStoppedByUser: true, monitoringStoppedByUser: true,
    ignoredPath: '/must/not/be/opened', token: 'SECRET' }));
  const rows = [0,5000,10000,40000].map((delta, i) => ({ kind: 'sample', at: new Date(at + delta).toISOString(),
    registry: { ok: true, referenceVersion: 0, integrationOwner: null }, native: { ok: true, byRun: { a: { type: 'busy' }, b: { type: 'idle' } } },
    runs: [{ ...run('a'), version: i + 1, referenceVersion: 0, state: i === 3 ? 'DELIVERED' : 'RESERVED' },
      { ...run('b'), version: 1, referenceVersion: 0, state: 'RESERVED' }], history: [], statuses: { secret: 'SECRET' },
    command: 'SECRET', sourcePath: '/never/follow' }));
  const tail=join(directory,'samples-tail');
  writeFileSync(paths.samples,rows.slice(0,2).map((row)=>JSON.stringify(row)).join('\n')+'\n');
  writeFileSync(tail,rows.slice(2).map((row)=>JSON.stringify(row)).join('\n')+'\n');
  writeFileSync(paths.quota, JSON.stringify({ accountFingerprintFNV1a64: 'abcdef0123456789', readByUtc: new Date(at).toISOString(),
    windowDurationMins: 10080, usedPercent: 20, resetsAt: 1800010000, accountId: 'SECRET' }));
  writeFileSync(paths.proof, '# Report\n\n## Proof\n\nText\n');
  const result = await buildAuditBundle({ samplesFiles: [paths.samples,tail], configFile: paths.config, monitorFile: paths.monitor,
    quotaFiles: [paths.quota], proofFiles: [paths.proof] });
  assert.equal(result.sourceChecks.rows, 4); assert.equal(result.sourceChecks.stableDuringRead, true);
  assert.equal(JSON.stringify(result.bundle).includes('SECRET'), false);
  assert.equal(result.bundle.catalog.find((c) => c.runId === 'b').firstAt, at + 5000);
  assert.equal(result.bundle.catalog.find((c) => c.runId === 'a').closedAt, at + 40000);
  const stats = summarizeSegments(result.bundle.intervals, at, at + 40000);
  assert.ok(stats.categories.reservation.unknownMs >= 30000);
  assert.equal(result.bundle.evidence.length, 1); assert.equal(result.bundle.quota.length, 1);
});

test('audit migration refuses an active source, linked input and unordered samples', async (t) => {
  const directory = fixture(t); const samples = join(directory, 'samples'); const config = join(directory, 'config'); const monitor = join(directory, 'monitor');
  writeFileSync(config, JSON.stringify({ project: directory, runs: [], sampleSeconds: 5, maximumAcceptedGapSeconds: 15 }));
  writeFileSync(samples, '{}\n'); writeFileSync(monitor, '{}');
  await assert.rejects(buildAuditBundle({ samplesFile: samples, configFile: config, monitorFile: monitor }), /audit-stopped-proof-required/);
  writeFileSync(monitor, JSON.stringify({ collectorStoppedByUser: true, monitoringStoppedByUser: true }));
  const linked = join(directory, 'linked'); symlinkSync(samples, linked);
  await assert.rejects(buildAuditBundle({ samplesFile: linked, configFile: config, monitorFile: monitor }));
  writeFileSync(samples, [at + 1000,at].map((t) => JSON.stringify({ kind: 'sample', at: new Date(t).toISOString() })).join('\n'));
  await assert.rejects(buildAuditBundle({ samplesFile: samples, configFile: config, monitorFile: monitor }), /audit-time-order-invalid/);
});

test('retention and resource metadata remain bounded and explicit in windows', (t) => {
  const directory = fixture(t); let clock = at;
  const store = new ObservationStatistics(directory, { persist: false, project: directory, now: () => clock });
  const segment = interval(at, at + 1000, ['a'], { globalCause: 'GLOBAL_PAUSE' });
  segment.contexts[0].resource = { waiting: true, held: false, exclusive: false, issued: false, promotion: true };
  store.recordInterval(segment); clock += 1000;
  const summary = summarizeSegments(store.data.native.intervals, at, at + 1000);
  assert.equal(summary.perContext[0].resourceWaitMs, 1000); assert.equal(summary.perContext[0].globalExceptionMs.GLOBAL_PAUSE, 1000);
  clock += 31 * day; const view = store.view('24h');
  assert.equal(view.sources[0].categories.native.unknownMs, day);
  assert.equal(store.data.native.intervals.length, 0);
});
