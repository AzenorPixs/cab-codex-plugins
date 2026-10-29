import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { fixtureEnvironment } from './helpers/cab-environment.mjs';
import { createObservationJournal } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-events.mjs';
import { monitorConfiguration, parseTasks, parseChangeTitle, readChanges, MonitorState, fetchJson, normalizeRuns, operationalState } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-data.mjs';
import { nextLifecycle } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-run-steps.mjs';
import { createMonitorServer } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor.mjs';

const config = () => monitorConfiguration({ OC_Codex_WORKSPACE: process.cwd(), OC_Codex_MONITOR_STATE_DIR: join(tmpdir(), 'catalogs') });
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'cab-web-monitor-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'openspec', 'changes', 'change-a'), { recursive: true });
  await writeFile(join(root, 'openspec', 'changes', 'change-a', 'tasks.md'), '- [x] Spécifier\n- [ ] Implémenter\n');
  return root;
}
async function listen(t, handler) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); });
  return 'http://127.0.0.1:' + server.address().port;
}
const json = (response, value) => { response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify(value)); };

test('configuration : port 8790, loopback, alias et valeurs invalides', () => {
  assert.equal(config().port, 8790);
  assert.equal(config().pollMs, 1000);
  assert.equal(monitorConfiguration({ OC_CGPT_WORKSPACE: '/workspace', OC_CGPT_MONITOR_PORT: '9000' }).port, 9000);
  for (const [key, value] of [['MONITOR_HOST', '0.0.0.0'], ['MONITOR_PORT', '80'], ['MONITOR_PORT', '443'],
    ['MONITOR_PORT', 'NaN'], ['MONITOR_PORT', '65536'], ['MONITOR_POLL_INTERVAL_MS', '0'],
    ['CONTROLLER_URL', 'https://127.0.0.1:8788'], ['CONTROLLER_URL', 'http://remote.invalid/'],
    ['CONTROLLER_URL', 'http://127.0.0.1/path'], ['OPENCODE_URL', 'http://user:password@127.0.0.1/']]) {
    assert.throws(() => monitorConfiguration({ OC_Codex_WORKSPACE: '/workspace', ['OC_Codex_' + key]: value }), /OC_Codex_/);
  }
  assert.equal(monitorConfiguration({ OC_Codex_WORKSPACE: '/workspace', OC_Codex_CONTROLLER_URL: 'http://[::1]:8788/status/' }).controllerUrl, 'http://[::1]:8788');
});

test('tâches : total dynamique, clôture indépendante, fences et code ignorés', () => {
  const source = ['- [x] Première', '- [X] Deuxième', '- [x] Troisième', ...Array.from({ length: 11 }, (_, i) => '- [ ] Tâche ' + i),
    '```md', '- [x] Code', '```', '~~~', '- [x] Code tilde', '~~~', '    - [x] Code indenté'].join('\n');
  const result = parseTasks(source);
  assert.equal(result.completed, 3); assert.equal(result.total, 14);
  assert.equal(parseTasks('Sans liste').available, false);
  assert.equal(parseTasks('- [x] Seule').completed, 1);
});

test('codes de lot : premier titre explicite hors code, formats et absences', () => {
  for (const code of ['PA01', 'PA02', 'C08', 'O26', 'B02', 'L1', 'L2', 'L01', 'L10']) {
    for (const separator of ['—', '–', '-', ':']) {
      assert.equal(parseChangeTitle('# ' + code + ' ' + separator + ' Intitulé').lotCode, code);
    }
    assert.equal(parseChangeTitle('# ' + code).lotCode, code);
  }
  for (const source of ['# Sans code PA01', '# PA1 — Court', '# pa01 — Minuscules',
    '# L0 — Inconnu', '# L3 — Inconnu', '# L9 — Inconnu', '# l1 — Minuscules',
    '# L1suffixe — Invalide', '# L2 texte sans séparateur', '# L1 —',
    '# ABCDEFGHIJK01 — Trop de lettres', '# A00001 — Trop de chiffres',
    '# Sans code\n# L1 — Second titre', '```md\n# L2 — Exemple\n```\n# Sans code',
    '~~~\n# L1 — Exemple\n~~~', '    # L2 — Code indenté',
    '# PA01 texte sans séparateur', 'PA01 — Sans titre', '## PA01 — Sous-titre',
    '    # PA01 — Code indenté', '# Sans code\n# PA01 — Second titre',
    '```md\n# PA01 — Exemple\n```\n# Sans code', '~~~\n# C08 — Exemple\n~~~']) {
    assert.equal(parseChangeTitle(source).lotCode, null, source);
  }
  assert.deepEqual(parseChangeTitle('```md\n# PA02 — Exemple\n```\n# B02 — Import ###'),
    { title: 'B02 — Import', lotCode: 'B02' });
});

test('codes historiques : L1 actif et L2 archivé référencé restent inchangés', async (t) => {
  const root = await fixture(t);
  const active = join(root, 'openspec', 'changes', 'change-a');
  const archived = join(root, 'openspec', 'changes', 'archive', '2026-10-25-historical-change');
  await mkdir(archived, { recursive: true });
  await writeFile(join(active, 'proposal.md'), '# L1 — Admission');
  await writeFile(join(archived, 'proposal.md'), '# L2 — Maintenance');
  await writeFile(join(archived, 'tasks.md'), '- [x] Qualification\n');
  const result = await readChanges(root, ['historical-change']);
  const first = result.changes.find((change) => change.changeId === 'change-a');
  const second = result.changes.find((change) => change.changeId === 'historical-change');
  assert.equal(first.lotCode, 'L1');
  assert.equal(first.title, 'L1 — Admission');
  assert.equal(first.location, 'active');
  assert.equal(first.progress.total, 2);
  assert.equal(second.lotCode, 'L2');
  assert.equal(second.title, 'L2 — Maintenance');
  assert.equal(second.location, 'archived');
  assert.equal(second.progress.completed, 1);
});

test('changes : lecture locale, archive référencée et liens refusés', async (t) => {
  const root = await fixture(t);
  const archived = join(root, 'openspec', 'changes', 'archive', '2026-10-20-old-change');
  await mkdir(archived, { recursive: true }); await writeFile(join(archived, 'tasks.md'), '- [x] Livraison');
  await writeFile(join(archived, 'proposal.md'), '# C08 — Installation');
  await writeFile(join(root, 'openspec', 'changes', 'change-a', 'proposal.md'), '# PA01 — Compilation');
  const outside = join(root, 'private-fixture.md'); await writeFile(outside, '- [x] PRIVATE-SENTINEL');
  const unsafe = join(root, 'openspec', 'changes', 'unsafe'); await mkdir(unsafe);
  await symlink(outside, join(unsafe, 'tasks.md'));
  await symlink(outside, join(unsafe, 'proposal.md'));
  await symlink(join(root, 'openspec', 'changes', 'change-a'), join(root, 'openspec', 'changes', 'linked'));
  const result = await readChanges(root, ['old-change', '../private', 'missing', 'linked']);
  assert.equal(result.changes.find((c) => c.changeId === 'change-a').progress.total, 2);
  assert.equal(result.changes.find((c) => c.changeId === 'old-change').location, 'archived');
  assert.equal(result.changes.find((c) => c.changeId === 'old-change').lotCode, 'C08');
  assert.equal(result.changes.find((c) => c.changeId === 'change-a').lotCode, 'PA01');
  for (const changeId of ['unsafe', 'missing', 'linked']) assert.equal(result.changes.find((c) => c.changeId === changeId).lotCode, null);
  assert.equal(result.changes.find((c) => c.changeId === 'unsafe').progress.available, false);
  assert.equal(result.changes.find((c) => c.changeId === 'linked').progress.available, false);
  assert.ok(!JSON.stringify(result).includes('PRIVATE-SENTINEL'));
});

test('journal : données filtrées, identité, borne et ordre', () => {
  const journal = createObservationJournal({ limit: 2 });
  journal.record('validation-received', { runId: 'a', requestId: 'req-a', command: 'PRIVATE-SENTINEL', summary: 'PRIVATE-SENTINEL' });
  journal.record('validation-manually-answered', { runId: 'a', requestId: 'req-a', decision: 'approved', error: 'PRIVATE-SENTINEL' });
  journal.record('job-progress', { runId: 'b', jobId: 'job-b' });
  journal.record('opencode-sse-event', { runId: 'a', eventType: 'message.part.delta' });
  const value = journal.snapshot();
  assert.equal(value.events.length, 2); assert.equal(value.sequence, 3); assert.equal(value.truncated, true);
  assert.equal(value.events[0].decision, 'approved'); assert.equal(value.events[1].runId, 'b');
  assert.ok(!JSON.stringify(value).includes('PRIVATE-SENTINEL'));
});

test('collecte : limite effective, RUN isolés, aucune décision ou mutation et ancienne donnée visible', async (t) => {
  const workspace = await fixture(t); let failed = false; let now = Date.now(); const requests = [];
  const journal = createObservationJournal();
  journal.record('job-progress', { runId: 'a', changeId: 'change-a' });
  const base = await listen(t, (request, response) => {
    requests.push({ method: request.method, path: request.url });
    if (failed) { response.writeHead(503).end(); return; }
    if (request.url === '/status') return json(response, { mode: 'concurrent', configuration: { maxCommandLength: 2000 },
      runs: { a: { job: { changeId: 'change-a', sessionId: 'ses_a', armed: true }, terminalGate: { status: 'OPEN' },
        coordination: { reason: 'resource-conflict', blockers: [{ runId: 'b' }] } },
      b: { job: { changeId: 'change-b', sessionId: 'ses_b', armed: true }, terminalGate: { status: 'OPEN' } } } });
    if (request.url === '/runs') return json(response, { runs: [{ runId: 'a', state: 'RESERVED' }, { runId: 'b', state: 'RESERVED' }], privateToken: 'PRIVATE-SENTINEL' });
    if (request.url === '/monitor/events') return json(response, journal.snapshot());
    if (request.url.startsWith('/api/info')) return json(response, { version: '2.2.0', pid: 42,
      hostname: '127.0.0.1', urls: [], paths: { tmp: '/tmp' } });
    if (request.url.startsWith('/api/mcp')) return json(response, { location: { directory: workspace },
      data: [{ name: 'cgpt-validation', status: { status: 'connected' } }] });
    if (request.url === '/api/session/active') return json(response, { data: { 'ses_b': { type: 'running' } } });
    return json(response, { 'ses_b': { type: 'busy' } });
  });
  const state = new MonitorState({ ...config(), workspace, controllerUrl: base, supervisorUrl: base, opencodeUrl: base }, { now: () => now });
  await state.collect(); const first = state.snapshot();
  assert.equal(first.configuration.maxCommandLength, 2000); assert.equal(first.runs.length, 2);
  assert.equal(first.runs.find((r) => r.runId === 'a').cause, 'resource-conflict');
  assert.equal(first.runs.find((r) => r.runId === 'b').nativeActivity, 'busy');
  assert.equal(first.nativeHealth, true, JSON.stringify(first.sources.opencode));
  assert.ok(requests.every((r) => r.method === 'GET' && !r.path.includes('/decision')));
  assert.ok(!JSON.stringify(first).includes('PRIVATE-SENTINEL'));
  failed = true; now += 15000; await state.collect(); const next = state.snapshot();
  assert.equal(next.sources.controller.available, false); assert.equal(next.sources.controller.stale, true);
  assert.equal(next.configuration.maxCommandLength, 2000); assert.equal(next.runs.length, 2);
  const before = next.events.length; state.ingest(journal.snapshot()); assert.equal(state.events.length, before);
  const restarted = createObservationJournal().snapshot();
  state.ingest(restarted); assert.equal(state.coverage.restarted, true);
  state.ingest(journal.snapshot()); assert.equal(state.coverage.instanceId, restarted.instanceId);
});

test('une limite non exposée reste indisponible, sans valeur de défaut inventée', () => {
  const state = new MonitorState(config());
  assert.equal(state.snapshot().configuration.maxCommandLength, null);
  assert.equal(state.snapshot().configuration.defaultMaxCommandLength, 16384);
});

test('versions propres à chaque source, cycle structuré et état WAITING distinct', async (t) => {
  const workspace = await fixture(t);
  const lifecycle = nextLifecycle(nextLifecycle(undefined, 'REVIEW', undefined, 0), 'IMPLEMENTATION', undefined, 1);
  const fetcher = async (url) => {
    const target = new URL(url); let value;
    if (target.port === '10002') value = { version: '1.4.0' };
    else if (target.pathname === '/api/info') value = { version: '2.2.0', pid: 42,
      hostname: '127.0.0.1', urls: [], paths: { tmp: '/tmp' } };
    else if (target.pathname === '/api/mcp') value = { location: { directory: workspace },
      data: [{ name: 'cgpt-validation', status: { status: 'connected' } }] };
    else if (target.pathname === '/api/session/active') value = { data: {} };
    else if (target.pathname === '/status') value = { version: '2.1.8', mode: 'concurrent', brokerReadiness: { server_version: '2.1.8' },
      runs: { a: { job: { changeId: 'change-a', armed: true, lifecycle }, undecidedValidationCount: 1,
        coordination: { phase: 'WORK' }, terminalGate: { status: 'OPEN' } } } };
    else if (target.pathname === '/runs') value = { runs: [{ runId: 'a', state: 'RESERVED' }] };
    else if (target.pathname === '/monitor/events') value = createObservationJournal().snapshot();
    else value = {};
    return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
  };
  const state = new MonitorState({ ...config(), workspace, controllerUrl: 'http://127.0.0.1:10001',
    supervisorUrl: 'http://127.0.0.1:10002', opencodeUrl: 'http://127.0.0.1:10003' }, { fetcher });
  await state.collect(); const result = state.snapshot();
  assert.deepEqual(result.componentVersions, { controller: '2.1.8', supervisor: '1.4.0', broker: '2.1.8', opencode: '2.2.0', monitor: '2.1.8' });
  assert.equal(result.stepCatalog.length, 11); assert.equal(result.runs[0].step.name, 'Implémentation');
  assert.equal(result.runs[0].step.position, 6); assert.equal(result.runs[0].phase, 'WORK');
  assert.equal(result.runs[0].operationalState, 'WAITING'); assert.equal(result.runs[0].stepHistory.length, 2);
  const missing = new MonitorState(config()).snapshot();
  assert.equal(missing.componentVersions.controller, null); assert.equal(missing.componentVersions.opencode, null);
  assert.equal(normalizeRuns({ job: { armed: true }, coordination: { phase: 'REPORT' } })[0].step, null);
});

test('ETAT suit les faits frais et ne modifie aucune étape', () => {
  const base = { runId: 'a', state: 'RESERVED', armed: true, gate: { status: 'OPEN' }, pending: 0 };
  assert.equal(operationalState(base), 'RUNNING');
  for (const [fields, expected] of [[{ pending: 1 }, 'WAITING'], [{ cause: 'resource-conflict' }, 'WAITING'], [{ cause: 'test-resource-conflict' }, 'WAITING'],
    [{ cause: 'run-pause' }, 'PAUSED'], [{ cause: 'run-stop' }, 'STOPPED'], [{ readiness: 'HUMAN_REQUIRED' }, 'BLOCKED'],
    [{ readiness: 'DEGRADED' }, 'DEGRADED'], [{ state: 'DELIVERED' }, 'DONE'], [{ state: 'ABANDONED' }, 'STOPPED'],
    [{ gate: { status: 'VALIDATED', declaredState: 'TERMINÉ' } }, 'DONE']]) {
    assert.equal(operationalState({ ...base, ...fields }), expected);
  }
  assert.equal(operationalState({ ...base, pending: 1, cause: 'resource-effects-unknown' }), 'BLOCKED');
  assert.equal(operationalState({ ...base, pending: 1, readiness: 'HUMAN_REQUIRED' }), 'BLOCKED');
  assert.equal(operationalState(base, { controllerFresh: false }), 'UNKNOWN');
  assert.equal(operationalState(base, { registryFresh: false }), 'UNKNOWN');
});

test('des champs amont malformés restent inconnus sans arrêter la collecte', () => {
  assert.deepEqual(normalizeRuns(null, { runs: [null] }, null, null), []);
  const runs = normalizeRuns({ mode: 'concurrent', runs: { a: { coordination: { blockers: [null, 'invalid'] } } } });
  assert.equal(runs.length, 1); assert.deepEqual(runs[0].blockers, []);
  const state = new MonitorState(config());
  state.ingest({ instanceId: 'fixture', events: [null, false, {}, { sequence: 1, type: 'job-progress', at: new Date().toISOString(), runId: 'a' }] });
  assert.equal(state.events.length, 1);
});

test('collectes non chevauchantes et réponses amont bornées', async () => {
  let resolve; let requests = 0;
  const pending = new Promise((done) => { resolve = done; });
  const paths = [];
  const state = new MonitorState(config(), { fetcher: async (url) => {
    requests++; const target = new URL(url); paths.push(target.pathname); await pending; let value = {};
    if (target.pathname === '/api/info') value = { version: '2.2.0', pid: 42, hostname: '127.0.0.1', urls: [], paths: { tmp: '/tmp' } };
    else if (target.pathname === '/api/mcp') value = { location: { directory: process.cwd() }, data: [] };
    else if (target.pathname === '/api/session/active') value = { data: {} };
    return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
  } });
  const first = state.collect(); const second = state.collect();
  for (let attempt = 0; attempt < 100 && requests < 5; attempt++) await new Promise((done) => setTimeout(done, 1));
  assert.equal(requests, 5, 'requêtes avant résolution : ' + requests + ' ' + paths.join(','));
  resolve(); await Promise.all([first, second]); assert.equal(requests, 7);
  await assert.rejects(fetchJson('http://127.0.0.1/', 1000, async () => new Response(' '.repeat(2 * 1024 * 1024 + 1))), /source-too-large/);
});

test('serveur indépendant : page, CSP, SSE initial et méthodes de mutation refusées', async (t) => {
  const workspace = await fixture(t);
  const upstream = await listen(t, (request, response) => { response.writeHead(503).end(); });
  const monitor = await createMonitorServer({ ...config(), workspace, port: 0, controllerUrl: upstream, supervisorUrl: upstream, opencodeUrl: upstream });
  const address = await monitor.start(); t.after(() => monitor.close());
  const base = 'http://127.0.0.1:' + address.port;
  const page = await fetch(base); assert.equal(page.status, 200); assert.match(await page.text(), /CAB Monitor/);
  assert.match(page.headers.get('content-security-policy'), /default-src 'none'/);
  for (const path of ['/app.mjs', '/style.css', '/api/snapshot']) assert.equal((await fetch(base + path)).status, 200);
  assert.equal((await fetch(base + '/api/snapshot', { method: 'POST' })).status, 405);
  assert.equal((await fetch(base + '/api/snapshot', { headers: { origin: 'http://foreign.invalid' } })).status, 403);
  assert.equal((await fetch(base + '/../../project.env')).status, 404);
  const abort = new AbortController(); const stream = await fetch(base + '/api/events', { signal: abort.signal });
  const reader = stream.body.getReader(); const first = await reader.read();
  assert.match(new TextDecoder().decode(first.value), /event: snapshot/); abort.abort(); await reader.cancel().catch(() => {});
});

test('relais STATS : routes fixes, origine obligatoire, corps borné et panne', async (t) => {
  const workspace = await fixture(t); const requests = []; let failed = false;
  const upstream = await listen(t, async (request, response) => {
    if (!request.url.startsWith('/statistics/')) { response.writeHead(503).end(); return; }
    requests.push({ url: request.url, method: request.method });
    if (failed) { response.writeHead(503).end(); return; }
    if (request.method === 'POST') {
      assert.equal(request.headers['x-cab-statistics'], '1');
      let body = ''; for await (const chunk of request) body += chunk;
      return json(response, { received: JSON.parse(body) });
    }
    return json(response, { sources: [], cumulative: [], selection: '7d' });
  });
  const monitor = await createMonitorServer({ ...config(), workspace, port: 0, controllerUrl: upstream,
    supervisorUrl: upstream, opencodeUrl: upstream });
  const address = await monitor.start(); t.after(() => monitor.close());
  const base = 'http://127.0.0.1:' + address.port;
  assert.equal((await fetch(base + '/stats.mjs')).status, 200);
  assert.equal((await fetch(base + '/api/statistics?selection=7d')).status, 200);
  assert.equal((await fetch(base + '/api/statistics?path=/private')).status, 400);
  const path = base + '/api/statistics/retention/preview';
  const headers = { 'content-type': 'application/json', 'x-cab-statistics': '1', origin: base };
  const before = requests.length;
  assert.equal((await fetch(path, { method: 'POST', headers: { ...headers, origin: 'http://foreign.invalid' }, body: '{"days":7}' })).status, 403);
  assert.equal((await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cab-statistics': '1' }, body: '{"days":7}' })).status, 403);
  assert.equal((await fetch(path, { method: 'POST', headers, body: ' '.repeat(4097) })).status, 413);
  assert.equal(requests.length, before);
  const response = await fetch(path, { method: 'POST', headers, body: '{"days":7}' });
  assert.deepEqual(await response.json(), { received: { days: 7 } });
  assert.deepEqual(requests.at(-1), { url: '/statistics/retention/preview', method: 'POST' });
  assert.equal((await fetch(base + '/api/statistics/retention/arbitrary', { method: 'POST', headers })).status, 404);
  failed = true;
  assert.equal((await fetch(base + '/api/statistics?selection=7d')).status, 503);
});
