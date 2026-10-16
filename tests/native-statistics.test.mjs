import assert from 'node:assert/strict';
import { linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SessionStatistics } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs';

function fixture(t, persist = false) {
  const directory = mkdtempSync(join(tmpdir(), 'cab-statistics-'));
  let at = 1700000000000;
  const options = { now: () => at, persist, intervalMs: 0 };
  const stats = new SessionStatistics(directory, options);
  t.after(async () => { await stats.close(); rmSync(directory, { recursive: true, force: true }); });
  const run = (runId, contextId = 1, changeId = `change-${runId}`) => ({ runId, contextId, changeId,
    sessionId: `ses_${runId}`, state: 'RESERVED', phase: 'WORK', referenceVersion: 0 });
  const registry = (runs, extra = {}) => stats.registry({ project: directory, runs, integrationOwner: null,
    integrationQueue: [], referenceVersion: 0, ...extra });
  return { directory, stats, run, registry, options, step: (ms) => { at += ms; } };
}

test('durées MONO/MULTI/ZERO et triple concurrence excluent les prévols et distinguent RSMP', async (t) => {
  const h = fixture(t); const a = h.run('a'); const b = h.run('b', 2); const c = h.run('c', 3, 'rsmp-contract');
  h.registry([a]); h.stats.connection(true); h.stats.nativeSnapshot({ ses_a: { type: 'busy' } });
  h.step(1000); h.registry([a, b]); h.stats.nativeSnapshot({ ses_a: { type: 'busy' }, ses_b: { type: 'busy' } });
  h.step(2000); h.registry([a, b, c, h.run('p', 4, 'cismp3-preflight-check')]);
  h.stats.nativeSnapshot({ ses_a: { type: 'busy' }, ses_b: { type: 'busy' }, ses_c: { type: 'busy' } });
  h.step(3000); const s = h.stats.summary();
  assert.equal(s.categories.reservation.monoMs, 1000);
  assert.equal(s.categories.reservation.exactlyTwoMs, 2000);
  assert.equal(s.categories.reservation.threeOrMoreMs, 3000);
  assert.equal(s.categories.changes.multiMs, 5000);
  assert.equal(s.categories.nativeChanges.exactlyTwoMs, 5000);
  assert.equal(s.categories.native.threeOrMoreMs, 3000);
  for (const category of Object.values(s.categories)) {
    assert.equal(category.monoMs + category.multiMs + category.zeroMs + category.unknownMs, 6000);
    assert.equal(category.multiMs, category.exactlyTwoMs + category.threeOrMoreMs);
  }
});

test('déduplication SSE, données sensibles exclues et états natifs distincts des décisions', async (t) => {
  const h = fixture(t, true); const a = h.run('a'); h.registry([a]);
  const event = { type: 'message.part.updated', properties: { part: { id: 'tool_1', sessionID: 'ses_a',
    type: 'tool', tool: 'bash', state: { status: 'completed', time: { start: 10, end: 50 },
      input: { command: 'SECRET-COMMAND', token: 'SECRET-TOKEN' }, output: 'SECRET-OUTPUT' } } } };
  h.stats.nativeEvent(event); h.stats.nativeEvent(event);
  h.stats.nativeEvent({ ...event, directory: '/different-project', properties: { part: {
    ...event.properties.part, id: 'foreign-part' } } });
  h.stats.nativeEvent({ type: 'message.updated', properties: { info: { id: 'msg_1', sessionID: 'ses_a',
    role: 'assistant', content: 'SECRET-CONTENT', apiKey: 'SECRET-KEY' } } });
  h.stats.observe(a, 'validation-received', { requestId: 'request-1', receivedAt: h.options.now() - 10, error: 'SECRET-ERROR' });
  h.step(30); h.stats.observe(a, 'validation-manually-answered', { requestId: 'request-1', decision: 'approved' });
  h.step(20); h.stats.observe(a, 'opencode-permission-approved', { requestId: 'request-1' });
  h.stats.observe(a, 'opencode-permission-approved', { requestId: 'request-1' });
  await h.stats.flush();
  const s = h.stats.summary('a', 1).contexts[0];
  assert.equal(s.tools.bash.completed, 1); assert.equal(s.messages.assistant, 1);
  assert.equal(s.decisions.approved, 1); assert.equal(s.decisions.once, 1);
  assert.equal(s.latencies.requestToDecision.medianMs, 40);
  assert.equal(s.latencies.decisionToOnce.p95Ms, 20);
  assert.equal(s.latencies.nativeTool.count, 1);
  assert.ok(!readFileSync(h.stats.path, 'utf8').includes('SECRET'));
  assert.equal(statSync(h.stats.path).mode & 0o777, 0o600);
});

test('une approbation ne devient pas un outil exécuté et les erreurs ne sont pas des refus', async (t) => {
  const h = fixture(t); const a = h.run('a'); h.registry([a]);
  for (const requestId of ['approved', 'rejected', 'error', 'constructor']) h.stats.observe(a, 'validation-received', { requestId });
  h.stats.observe(a, 'validation-answered', { requestId: 'approved', decision: 'approved' });
  h.stats.observe(a, 'validation-answered', { requestId: 'rejected', decision: 'rejected' });
  h.stats.observe(a, 'validation-failed', { requestId: 'error' });
  const c = h.stats.summary('a', 1).contexts[0];
  assert.equal(c.decisions.approved, 1); assert.equal(c.decisions.rejected, 1);
  assert.equal(c.decisions.pending, 2); assert.equal(c.decisions.technicalErrors, 1);
  assert.equal(c.decisions.once, 0); assert.deepEqual(c.tools, {});
});

test('coupure SSE et horloge longue restent inconnues sans inventer une activité nulle', async (t) => {
  const h = fixture(t); h.registry([h.run('a')]); h.stats.connection(true);
  h.stats.nativeSnapshot({ ses_a: { type: 'busy' } });
  h.step(1000); h.stats.connection(false); h.step(2000); h.stats.connection(true);
  h.step(1000); h.stats.nativeSnapshot({}); h.step(20000);
  const s = h.stats.summary();
  assert.equal(s.categories.native.monoMs, 1000);
  assert.equal(s.categories.native.unknownMs, 23000);
  assert.equal(s.categories.native.zeroMs, 0);
  assert.equal(s.categories.reservation.unknownMs, 20000);
});

test('une baseline tardive ne remplace pas un état SSE plus récent', async (t) => {
  const h = fixture(t); h.registry([h.run('a')]); h.stats.connection(true);
  h.stats.nativeEvent({ type: 'session.status', properties: { sessionID: 'ses_a', status: { type: 'busy' } } });
  h.stats.nativeSnapshot({}, true); h.step(1000);
  assert.equal(h.stats.summary().categories.native.monoMs, 1000);
});

test('les tentatives avant admission sont bornées sans être assimilées à des refus distincts', async (t) => {
  const h = fixture(t); const a = h.run('a');
  h.stats.admissionFailure(a, 'integration-in-progress'); h.step(1000);
  h.stats.admissionFailure(a, 'integration-in-progress');
  const s = h.stats.summary('a');
  assert.equal(s.contexts.length, 0);
  assert.equal(s.admissionAttempts[0].attempts, 2);
  assert.equal(s.admissionAttempts[0].observedSpanMs, 1000);
  assert.match(s.admissionAttempts[0].limitation, /pas durée causale/);
});

test('reprise durable et nouveau contexte conservent leurs populations distinctes', async (t) => {
  const h = fixture(t, true); const a = h.run('a'); h.registry([a]); h.step(1000);
  await h.stats.close(); h.step(7000);
  const restored = new SessionStatistics(h.directory, h.options);
  t.after(() => restored.close());
  assert.equal(restored.summary().restartUnknownMs, 7000);
  restored.registry({ runs: [{ ...a, state: 'DELIVERED' }, h.run('a', 2, 'next-change')],
    integrationOwner: null, integrationQueue: [], referenceVersion: 0 });
  restored.observe(h.run('a', 2, 'next-change'), 'validation-received', { requestId: 'next' });
  const s = restored.summary('a');
  assert.equal(s.contexts.length, 2);
  assert.equal(s.contexts.find((c) => c.contextId === 1).decisions.pending, 0);
  assert.equal(s.contexts.find((c) => c.contextId === 2).decisions.pending, 1);
  await restored.close();
});

test('quantiles bornés, brouillon à six sections et N/A explicites', async (t) => {
  const h = fixture(t); const a = h.run('a'); h.registry([a]);
  for (let i = 0; i < 2100; i++) {
    h.stats.observe(a, 'validation-received', { requestId: `r-${i}` }); h.step(1);
    h.stats.observe(a, 'validation-answered', { requestId: `r-${i}`, decision: 'approved' });
  }
  const c = h.stats.summary('a', 1).contexts[0];
  assert.equal(c.latencies.requestToDecision.count, 2100);
  assert.equal(c.latencies.requestToDecision.sampleCount, 2048);
  const md = h.stats.markdown('a', 1);
  assert.equal((md.match(/^## /gm) || []).length, 6);
  assert.match(md, /N\/A/); assert.match(md, /Brouillon/);
  assert.ok(!md.includes('\r'));
});

test('snapshot invalide ou enrichi de contenu interdit reste intact et signale sa limite', async (t) => {
  const h = fixture(t, true); h.registry([h.run('a')]); await h.stats.flush();
  const data = JSON.parse(readFileSync(h.stats.path, 'utf8'));
  data.contexts['a:1'].secret = 'SECRET-INJECTED'; writeFileSync(h.stats.path, JSON.stringify(data));
  const invalid = new SessionStatistics(h.directory, h.options);
  assert.equal(invalid.summary().persistence.cause, 'statistics-restoration-invalid');
  assert.ok(!JSON.stringify(invalid.summary()).includes('SECRET-INJECTED'));
  await invalid.close(); assert.ok(readFileSync(h.stats.path, 'utf8').includes('SECRET-INJECTED'));
  // L'observateur initial du test doit conserver le snapshot volontairement invalide.
  h.stats.persistEnabled = false;
});

test('liens symboliques, liens physiques et échec de persistance restent sans effet métier', async (t) => {
  const h = fixture(t, false); const outside = join(h.directory, 'outside'); mkdirSync(outside);
  const link = join(h.directory, 'link'); symlinkSync(outside, link);
  const invalid = new SessionStatistics(link, { ...h.options, persist: true });
  assert.equal(invalid.summary().persistence.cause, 'statistics-restoration-invalid'); await invalid.close();
  const original = join(h.directory, 'original'); writeFileSync(original, '{}');
  linkSync(original, h.stats.path);
  const hard = new SessionStatistics(h.directory, { ...h.options, persist: true });
  assert.equal(hard.summary().persistence.cause, 'statistics-restoration-invalid'); await hard.close();
  rmSync(h.stats.path); mkdirSync(h.stats.path);
  h.stats.persistEnabled = true; h.stats.observe(h.run('a'), 'validation-received', { requestId: 'safe' });
  await h.stats.flush();
  assert.equal(h.stats.summary().persistence.cause, 'statistics-persistence-unavailable');
  assert.equal(h.stats.summary('a', 1).contexts[0].decisions.pending, 1);
});
