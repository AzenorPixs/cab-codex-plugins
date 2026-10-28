// Qualification explicite : TMPDIR=<dossier local> node tests/web-monitor-browser.mjs
import assert from 'node:assert/strict';
import { fixtureEnvironment } from './helpers/cab-environment.mjs';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createMonitorServer } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor.mjs';
import { monitorConfiguration } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-data.mjs';
import { createObservationJournal } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-events.mjs';
import { nextLifecycle } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-run-steps.mjs';
import { SessionStatistics } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs';
import { StatisticsMaintenance, statisticsDashboard } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics-maintenance.mjs';

const delay = (ms) => new Promise((done) => setTimeout(done, ms));
async function wait(check, label) {
  for (let i = 0; i < 150; i++) { if (await check()) return; await delay(100); }
  throw new Error('Délai dépassé : ' + label);
}
async function unusedPort() {
  const server = createServer(); await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const port = server.address().port; await new Promise((done) => server.close(done)); return port;
}
const root = await mkdtemp(join(tmpdir(), 'cab-monitor-browser-'));
const artifactDirectory = resolve(process.env.TMPDIR || root);
const children = [];
let monitor;
let upstream;
let browserClose;
const results = [];
const unit = process.env.CAB_MONITOR_BROWSER_UNIT;
if (unit && !['header', 'manual', 'order'].includes(unit)) throw new Error('Unité navigateur inconnue');
async function finishUnit(browser, passed) {
  results.push({ browser: browser.name, version: browser.version, passed });
  await browser.close(); browserClose = null;
  console.log(browser.name + ' : unité ' + unit + ' réussie');
}
const journal = createObservationJournal();
let completed = 3;
let limit = 4096;
let failed = false;
let lifecycle = nextLifecycle(undefined, 'REVIEW', undefined, 0);
let recoveryBlocked = false;
let managementMode = false;
let managementGeneration = 10;
let brokerConnection = 'connected';
const serviceCalls = [];
const serviceStates = new Map();
let statistics;
let retention;
const changeIds = ['add-local-web-monitor', 'improve-session-recovery', 'review-event-traces'];
async function tasks() {
  const directory = join(root, 'openspec', 'changes', changeIds[0]);
  await writeFile(join(directory, 'tasks.md'), Array.from({ length: 14 }, (_, i) => '- [' + (i < completed ? 'x' : ' ') + '] ' +
    ['Définir les contrats d’observation', 'Exposer la configuration effective', 'Collecter les états des composants', 'Construire le tableau de bord'][i % 4] +
    (managementMode ? ' · série ' + managementGeneration : '')).join('\n'));
}
function child(command, args) {
  const process = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...globalThis.process.env, MOZ_CRASHREPORTER_DISABLE: '1', XDG_CACHE_HOME: join(root, 'cache') } });
  children.push(process); return process;
}
async function webdriver(base, path, body) {
  const response = await fetch(base + path, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const value = await response.json(); if (value.value?.error) throw new Error(value.value.error + ': ' + value.value.message);
  return value.value;
}
async function chrome() {
  const port = await unusedPort(); const process = child('/usr/bin/chromedriver', ['--port=' + port, '--log-level=SEVERE']);
  const base = 'http://127.0.0.1:' + port;
  await wait(async () => { if (process.exitCode !== null) throw new Error('chromedriver arrêté');
    try { return (await fetch(base + '/status')).ok; } catch { return false; } }, 'chromedriver');
  const session = await webdriver(base, '/session', { capabilities: { alwaysMatch: { browserName: 'chrome',
    'goog:chromeOptions': { binary: '/usr/bin/chromium', args: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
      '--user-data-dir=' + join(root, 'chromium'), '--disk-cache-dir=' + join(root, 'chromium-cache'), '--no-first-run'] } } } });
  const path = '/session/' + session.sessionId;
  return { name: 'Chromium', version: session.capabilities.browserVersion,
    navigate: (url) => webdriver(base, path + '/url', { url }),
    evaluate: (expression) => webdriver(base, path + '/execute/sync', { script: expression.includes(';') ? expression : 'return (' + expression + ');', args: [] }),
    viewport: async (width, height) => {
      await webdriver(base, path + '/window/rect', { width, height });
      await webdriver(base, path + '/goog/cdp/execute', { cmd: 'Emulation.setDeviceMetricsOverride',
        params: { width, height, deviceScaleFactor: 1, mobile: width < 600 } });
    },
    screenshot: async (name) => writeFile(join(artifactDirectory, name), Buffer.from(await webdriver(base, path + '/screenshot'), 'base64')),
    close: async () => { await fetch(base + path, { method: 'DELETE' }); } };
}
async function firefox() {
  const port = await unusedPort(); await mkdir(join(root, 'firefox'));
  const process = child('/usr/bin/firefox', ['--headless', '--no-remote', '--profile', join(root, 'firefox'), '--remote-debugging-port', String(port)]);
  process.stderr.on('data', () => {});
  let socket;
  await wait(async () => {
    if (process.exitCode !== null) throw new Error('Firefox arrêté');
    try {
      const candidate = new WebSocket('ws://127.0.0.1:' + port + '/session');
      await new Promise((done, reject) => { candidate.addEventListener('open', done, { once: true }); candidate.addEventListener('error', reject, { once: true }); });
      socket = candidate; return true;
    } catch { return false; }
  }, 'Firefox BiDi');
  let sequence = 0; const pending = new Map();
  socket.addEventListener('message', (message) => {
    const value = JSON.parse(message.data); const promise = pending.get(value.id);
    if (!promise) return; pending.delete(value.id);
    if (value.type === 'error') promise.reject(new Error(value.error + ': ' + value.message)); else promise.resolve(value.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const session = await send('session.new', { capabilities: {} });
  const context = (await send('browsingContext.create', { type: 'tab' })).context;
  return { name: 'Firefox', version: session.capabilities.browserVersion,
    navigate: (url) => send('browsingContext.navigate', { context, url, wait: 'complete' }),
    evaluate: async (expression) => {
      const value = await send('script.evaluate', { expression, target: { context }, awaitPromise: false });
      if (value.type === 'exception') throw new Error('Firefox script exception');
      return value.result.value;
    },
    viewport: (width, height) => send('browsingContext.setViewport', { context, viewport: { width, height } }),
    screenshot: async (name) => writeFile(join(artifactDirectory, name), Buffer.from((await send('browsingContext.captureScreenshot', { context, origin: 'viewport' })).data, 'base64')),
    close: async () => { await send('session.end'); socket.close(); } };
}

try {
  for (const [index, changeId] of changeIds.entries()) {
    const directory = join(root, 'openspec', 'changes', changeId); await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'proposal.md'), '# ' + ['PA01 — Supervision web locale', 'Reprise des sessions', 'O26 — Observation des événements'][index]);
    await writeFile(join(directory, 'tasks.md'), '- [x] Préparation\n- [ ] Validation\n');
  }
  await tasks();
  const runIds = ['RUN-WEB', 'RUN-RECOVERY', 'RUN-AUDIT'];
  const statisticsDirectory = join(root, 'statistics-fixture'); await mkdir(statisticsDirectory);
  statistics = new SessionStatistics(statisticsDirectory, { project: root, intervalMs: 0 });
  statistics.registry({ project: root, integrationOwner: null, referenceVersion: 0, runs: runIds.map((runId, index) => ({ runId, contextId: 1,
    changeId: changeIds[index], sessionId: 'ses_' + index, state: 'RESERVED', version: 1 })) });
  retention = new StatisticsMaintenance(statistics);
  function oldStatistics() {
    const c = statistics.context({ runId: 'RUN-HISTORY', contextId: 1, changeId: 'old-statistics', state: 'DELIVERED' });
    c.firstAt = Date.now() - 61 * 86400000; c.lastAt = Date.now() - 60 * 86400000;
    statistics.dirty = true;
  }
  oldStatistics(); await statistics.flush();
  for (let i = 0; i < 4; i++) journal.record(['job-armed', 'validation-received', 'validation-manually-answered', 'job-progress'][i],
    { runId: runIds[i % 3], changeId: changeIds[i % 3], requestId: 'req-' + i, ...(i === 2 ? { decision: 'approved' } : {}) });
  upstream = createServer(async (request, response) => {
    if (failed) { response.writeHead(503).end(); return; }
    const target = new URL(request.url, 'http://localhost');
    if (target.pathname.startsWith('/monitor/lifecycle/')) {
      const status = !managementMode && target.pathname.endsWith('/prepare') ? 409 : 200;
      response.writeHead(status, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ token: 'fixture-lease', workspace: root, pid: process.pid })); return;
    }
    if (target.pathname.startsWith('/api/experimental/mcp/cgpt-validation/')) {
      serviceCalls.push(target.pathname);
      brokerConnection = target.pathname.endsWith('/disconnect') ? 'disabled' : 'connected';
      response.writeHead(200, { 'content-type': 'application/json' }); response.end('{}'); return;
    }
    if (target.pathname.startsWith('/statistics/')) {
      try {
        let value;
        if (target.pathname === '/statistics/dashboard') value = statisticsDashboard(statistics, target.searchParams);
        else {
          let text = ''; for await (const chunk of request) text += chunk;
          value = target.pathname.endsWith('/preview') ? retention.preview(JSON.parse(text)) : await retention.purge(JSON.parse(text));
        }
        response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify(value));
      } catch (error) { response.writeHead(error.status || 500, { 'content-type': 'application/json' }); response.end(JSON.stringify({ error: error.code })); }
      return;
    }
    const payload = request.url === '/status' ? { version: '2.1.2', mode: 'concurrent', workspace: root, pid: process.pid, configuration: { maxCommandLength: limit },
      brokerReadiness: { status: 'READY', server_version: '2.1.2' }, brokerReadinessReceivedAt: new Date().toISOString(),
      runs: Object.fromEntries((managementMode ? [] : runIds).map((runId, i) => [runId, { job: { changeId: changeIds[i], sessionId: 'ses_' + i, armed: true,
        lifecycle: i === 0 ? lifecycle : nextLifecycle(undefined, i === 1 ? 'IMPLEMENTATION' : 'STATISTICS', undefined, 0),
        lastProvenMilestone: ['Contrat d’observation validé', 'Reprise préparée', 'Événements corrélés'][i], currentCabMandate: 'mandat-' + i },
      terminalGate: { status: 'OPEN' }, undecidedValidationCount: i === 1 ? 1 : 0,
      coordination: { phase: ['WORK', 'WORK', 'REPORT'][i], ...(i === 1 ? { reason: recoveryBlocked ? 'resource-effects-unknown' : 'resource-conflict', blockers: [{ runId: 'RUN-WEB' }] }
        : i === 2 ? { reason: 'resource-effects-unknown' } : {}) } }])) }
      : request.url === '/runs' ? { runs: runIds.map((runId, i) => ({ runId, changeId: changeIds[i], state: managementMode ? 'DELIVERED' : 'RESERVED', version: managementGeneration + i })) }
        : target.pathname === '/api/info' ? { version: '2.2.0', pid: process.pid, hostname: '127.0.0.1', urls: [], paths: { tmp: '/tmp' } }
          : target.pathname === '/api/location' ? { directory: root }
          : target.pathname === '/api/mcp' ? { location: { directory: root }, data: [{ name: 'cgpt-validation', status: { status: brokerConnection } }] }
          : target.pathname === '/api/session/active' ? { data: managementMode ? {} : { ses_0: { type: 'running' } } }
            : request.url === '/monitor/events' ? journal.snapshot() : {};
    if (request.url === '/monitor/events' && request.headers.accept === 'text/event-stream') { journal.stream(request, response); return; }
    response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify(payload));
  });
  await new Promise((done) => upstream.listen(0, '127.0.0.1', done));
  const upstreamUrl = 'http://127.0.0.1:' + upstream.address().port;
  const monitorConfig = { ...monitorConfiguration({ OC_Codex_WORKSPACE: root, OC_Codex_MONITOR_STATE_DIR: join(root, 'catalogs') }), port: 0, pollMs: 300,
    controllerUrl: upstreamUrl, supervisorUrl: upstreamUrl, opencodeUrl: upstreamUrl };
  const options = { serviceCommand: async (args) => {
    serviceCalls.push(args);
    if (args[0] === 'show') return 'LoadState=loaded\nActiveState=' + (serviceStates.get(args[1]) || 'active') + '\nMainPID=' + process.pid + '\n';
    if (args[0] === '--no-block') {
      const port = monitor.server.address().port;
      await monitor.close(); monitor = await createMonitorServer({ ...monitorConfig, port }, options); await monitor.start(); return '';
    }
    serviceStates.set(args[1], args[0] === 'stop' ? 'inactive' : 'active'); return '';
  } };
  monitor = await createMonitorServer(monitorConfig, options);
  const address = await monitor.start(); const url = 'http://127.0.0.1:' + address.port;
  for (const factory of [chrome, firefox]) {
    completed = 3; limit = 4096; failed = false; recoveryBlocked = false; managementMode = false; managementGeneration += 10;
    lifecycle = nextLifecycle(undefined, 'REVIEW', undefined, 0);
    await tasks(); await monitor.state.collect();
    const browser = await factory(); browserClose = browser.close;
    await browser.viewport(1440, 1100); await browser.navigate(url);
    await wait(() => browser.evaluate("document.querySelector('#connection').textContent.includes('connectée') && document.querySelectorAll('#work-content tbody tr').length === 3"), browser.name + ' affichage initial');
    assert.equal(await browser.evaluate("document.querySelector('#metrics').textContent.includes('4 096')"), true);
    assert.equal(await browser.evaluate("document.querySelector('#work-content').textContent.includes('3/14')"), true);
    assert.equal(await browser.evaluate("JSON.stringify([...document.querySelectorAll('#work-content th')].map(x=>x.textContent)) === JSON.stringify(['RUN / CHANGE','codes de lot','ETAT','ÉTAPE','TÂCHES COCHÉES','ACTIONS'])"), true);
    assert.equal(await browser.evaluate("JSON.stringify([...document.querySelectorAll('#work-content tbody tr')].map(row=>[row.querySelector('[data-run]').dataset.run,row.cells[1].textContent]).sort())"), JSON.stringify([['RUN-AUDIT','O26'],['RUN-RECOVERY',''],['RUN-WEB','PA01']]));
    await browser.evaluate("document.querySelector('#changes-tab').click(); true");
    assert.equal(await browser.evaluate("document.querySelectorAll('#work-content th')[1].textContent"), 'codes de lot');
    assert.equal(await browser.evaluate("JSON.stringify([...document.querySelectorAll('#work-content tbody tr')].map(row=>[row.querySelector('[data-change]').dataset.change,row.cells[1].textContent]).sort())"), JSON.stringify([['add-local-web-monitor','PA01'],['improve-session-recovery',''],['review-event-traces','O26']]));
    await browser.screenshot('web-monitor-' + browser.name.toLowerCase() + '-lot-codes-changes.png');
    await browser.evaluate("document.querySelector('#runs-tab').click(); true");
    assert.equal(await browser.evaluate("document.querySelector('#work-content').textContent.includes('Revue · 8/11') && document.querySelector('#work-content').textContent.includes('WAITING')"), true);
    assert.equal(await browser.evaluate("document.querySelector('#health').textContent.includes('v2.1.2') && document.querySelector('#health').textContent.includes('v2.2.0')"), true);
    assert.equal(await browser.evaluate("document.querySelector('#detail').textContent.includes('WORK')"), true);
    assert.equal(await browser.evaluate("getComputedStyle(document.querySelector('tr[data-state=WAITING]')).backgroundColor"), 'rgb(255, 246, 207)');
    assert.equal(await browser.evaluate("getComputedStyle(document.querySelector('tr[data-state=BLOCKED]')).backgroundColor"), 'rgb(255, 232, 235)');
    await browser.evaluate("document.querySelector('#detail details summary').click(); true");
    assert.equal(await browser.evaluate("document.querySelectorAll('.cycle-list li').length"), 11);
    await browser.screenshot('web-monitor-' + browser.name.toLowerCase() + '-desktop.png');
    assert.equal(await browser.evaluate("!!document.querySelector('.topbar #updated') && !!document.querySelector('.topbar #cadence') && !document.querySelector('.hero #updated')"), true);
    assert.equal(await browser.evaluate("Math.abs(document.querySelector('#updated').getBoundingClientRect().top-document.querySelector('#cadence').getBoundingClientRect().top)<2 && document.querySelector('#updated').getBoundingClientRect().left>document.querySelector('.environment').getBoundingClientRect().right && document.querySelector('#cadence').getBoundingClientRect().left>document.querySelector('#updated').getBoundingClientRect().right"), true);
    await browser.viewport(390, 844);
    assert.equal(await browser.evaluate("document.documentElement.scrollWidth<=window.innerWidth && getComputedStyle(document.querySelector('.environment')).display!=='none' && document.querySelector('.topbar-context').scrollWidth>document.querySelector('.topbar-context').clientWidth"), true);
    await browser.screenshot('web-monitor-' + browser.name.toLowerCase() + '-header-mobile.png');
    assert.equal(await browser.evaluate("document.querySelectorAll('#work-content th')[1].textContent"), 'codes de lot');
    await browser.evaluate("document.querySelector('#changes-tab').click(); true");
    assert.equal(await browser.evaluate("document.documentElement.scrollWidth<=window.innerWidth && document.querySelectorAll('#work-content th')[1].textContent==='codes de lot'"), true);
    await browser.screenshot('web-monitor-' + browser.name.toLowerCase() + '-lot-codes-mobile.png');
    await browser.evaluate("document.querySelector('#runs-tab').click(); true");
    await browser.viewport(1440, 1100);
    if (unit === 'header') { await finishUnit(browser, ['métadonnées alignées après workspace', 'ligne mobile défilable sans débordement']); continue; }
    const orderedSnapshot = await (await fetch(url + '/api/snapshot')).json();
    const changeTemplate = orderedSnapshot.changes.changes[0];
    orderedSnapshot.changes.changes = [['zeta',3,10], ['unknown',null,null], ['zero',0,2], ['high',5,100], ['alpha',3,3]].map(([changeId, completed, total]) => ({
      ...changeTemplate, changeId, title: changeId, progress: { available: completed !== null, completed, total, tasks: [] } }));
    const runTemplate = orderedSnapshot.runs[0];
    orderedSnapshot.runs = [['RUN-A-ZETA','zeta'], ['RUN-UNKNOWN','unknown'], ['RUN-Z-ALPHA','alpha'], ['RUN-ZERO','zero'], ['RUN-Z-HIGH','high'], ['RUN-A-ALPHA','alpha']].map(([runId,changeId]) => ({ ...runTemplate, runId, changeId }));
    await browser.evaluate("document.querySelector('#refresh-interval').value='0'; document.querySelector('#refresh-interval').dispatchEvent(new Event('change')); window.__orderFetch=window.fetch; window.__orderSnapshot=" + JSON.stringify(JSON.stringify(orderedSnapshot)) + "; window.__orderApplied=JSON.parse(window.__orderSnapshot); Object.freeze(window.__orderApplied.runs); Object.freeze(window.__orderApplied.changes.changes); window.fetch=(url,options)=>url==='/api/snapshot'?Promise.resolve({ok:true,json:async()=>window.__orderApplied}):window.__orderFetch(url,options); document.querySelector('#monitor-refresh').click(); true");
    await wait(() => browser.evaluate("document.querySelectorAll('#work-content tbody tr').length===6"),browser.name+' données de tri appliquées');
    assert.equal(await browser.evaluate("JSON.stringify([...document.querySelectorAll('#work-content [data-run]')].map(x=>x.dataset.run))"), JSON.stringify(['RUN-Z-HIGH','RUN-A-ALPHA','RUN-Z-ALPHA','RUN-A-ZETA','RUN-ZERO','RUN-UNKNOWN']));
    await browser.evaluate("document.querySelector('[data-run=RUN-A-ZETA]').click(); document.querySelector('#changes-tab').click(); true");
    assert.equal(await browser.evaluate("JSON.stringify([...document.querySelectorAll('#work-content [data-change]')].map(x=>x.dataset.change))"), JSON.stringify(['high','alpha','zeta','zero','unknown']));
    await browser.evaluate("document.querySelector('[data-change=alpha]').click(); document.querySelector('#search').value='a'; document.querySelector('#search').dispatchEvent(new Event('input')); true");
    assert.equal(await browser.evaluate("JSON.stringify([...document.querySelectorAll('#work-content [data-change]')].map(x=>x.dataset.change))"), JSON.stringify(['alpha','zeta']));
    await browser.evaluate("document.querySelector('#search').value=''; document.querySelector('#runs-tab').click(); true");
    assert.equal(await browser.evaluate("document.querySelector('#work-content tr.selected [data-run]').dataset.run==='RUN-A-ZETA' && JSON.stringify(window.__orderApplied)===window.__orderSnapshot"), true);
    await browser.screenshot('web-monitor-' + browser.name.toLowerCase() + '-task-order.png');
    await browser.evaluate("window.fetch=window.__orderFetch; document.querySelector('#monitor-refresh').click(); true");
    await wait(() => browser.evaluate("document.querySelectorAll('#work-content tbody tr').length===3 && !document.querySelector('#monitor-refresh').disabled"),browser.name+' restauration après tri');
    await browser.evaluate("document.querySelector('#changes-tab').click(); document.querySelector('[data-change=add-local-web-monitor]').click(); document.querySelector('#runs-tab').click(); document.querySelector('[data-run=RUN-WEB]').click(); document.querySelector('#detail details summary').click(); true");
    if (unit === 'order') { await finishUnit(browser, ['nombre absolu avant pourcentage', 'égalités change puis RUN', 'inconnu après zéro', 'recherche et sélection conservées', 'snapshot non muté']); continue; }
    assert.equal(await browser.evaluate("JSON.stringify([...document.querySelector('#refresh-interval').options].map(x=>x.textContent)) === JSON.stringify(['Manuel','1s','3s','7s','30s','1m','5m','10m','30m'])"), true);
    await browser.evaluate("window.__intervals=[]; window.__setInterval=window.setInterval; window.setInterval=(fn,ms,...args)=>{window.__intervals.push(ms);return window.__setInterval(fn,ms,...args)}; true");
    for (const cadence of ['1000','3000','7000','30000','60000','300000','600000','1800000']) {
      await browser.evaluate("document.querySelector('#refresh-interval').value='"+cadence+"'; document.querySelector('#refresh-interval').dispatchEvent(new Event('change')); true");
      assert.equal(await browser.evaluate('window.__intervals.at(-1)'), Number(cadence));
    }
    await browser.evaluate("document.querySelector('#refresh-interval').value='7000'; document.querySelector('#refresh-interval').dispatchEvent(new Event('change')); true");
    await browser.navigate(url);
    await wait(() => browser.evaluate("document.querySelector('#metrics').textContent.includes('4 096')"), browser.name+' préférence après rechargement');
    assert.equal(await browser.evaluate("document.querySelector('#refresh-interval').value"), '7000');
    await browser.evaluate("document.querySelector('#refresh-interval').value='0'; document.querySelector('#refresh-interval').dispatchEvent(new Event('change')); true");
    completed=5;limit=3000;await tasks();await monitor.state.collect();await delay(1300);
    assert.equal(await browser.evaluate("document.querySelector('#metrics').textContent.includes('4 096') && document.querySelector('#work-content').textContent.includes('3/14')"),true);
    await browser.evaluate("document.querySelector('#monitor-refresh').click(); true");
    await wait(() => browser.evaluate("document.querySelector('#metrics').textContent.includes('3 000') && document.querySelector('#work-content').textContent.includes('5/14')"),browser.name+' clic manuel');
    await browser.evaluate("document.querySelector('#detail details summary').click(); true");
    await delay(100);
    await browser.evaluate("window.__frozenView=JSON.stringify(['#metrics','#work-content','#detail'].map(s=>document.querySelector(s).textContent)); window.__frozenSelection=document.querySelector('#work-content tr.selected button').dataset.run; window.__dateNow=Date.now; window.__clockOffset=20000; Date.now=()=>window.__dateNow()+window.__clockOffset; true");
    await delay(1200);
    assert.equal(await browser.evaluate("[...document.querySelectorAll('.health-card:not([data-component=monitor]) .health-status')].every(x=>x.textContent==='Disponible')"), true);
    await browser.evaluate("document.querySelector('#runs-tab').click(); true");
    assert.equal(await browser.evaluate("window.__frozenView===JSON.stringify(['#metrics','#work-content','#detail'].map(s=>document.querySelector(s).textContent)) && document.querySelector('#work-content tr.selected button').dataset.run===window.__frozenSelection && document.querySelector('#detail details').open"), true);
    await browser.screenshot('web-monitor-' + browser.name.toLowerCase() + '-manual-stable.png');
    await browser.evaluate("window.__clockOffset=1790000; true");
    await delay(1100);
    assert.equal(await browser.evaluate("document.querySelector('[data-component=monitor] .health-status').textContent"),'Disponible');
    monitor.server.closeAllConnections();
    assert.equal(await browser.evaluate("document.querySelector('[data-component=monitor] .health-status').textContent"),'Disponible');
    await delay(1100);
    assert.equal(await browser.evaluate("window.__frozenView===JSON.stringify(['#metrics','#work-content','#detail'].map(s=>document.querySelector(s).textContent))"), true);
    await browser.evaluate("window.__clockOffset=1800001; true");
    await wait(() => browser.evaluate("document.querySelector('[data-component=monitor] .health-status').textContent === 'Non observé'"),browser.name+' expiration Web sans refresh');
    await browser.evaluate("window.__fetch=window.fetch; window.fetch=(url,options)=>url==='/api/snapshot'?Promise.resolve(new Response('{}',{status:503})):window.__fetch(url,options); document.querySelector('#monitor-refresh').click(); true");
    await wait(() => browser.evaluate("document.querySelector('#refresh-status').textContent.includes('impossible')"),browser.name+' échec refresh');
    assert.equal(await browser.evaluate("document.querySelector('[data-component=monitor] .health-status').textContent"),'Non observé');
    assert.equal(await browser.evaluate("window.__frozenView===JSON.stringify(['#metrics','#work-content','#detail'].map(s=>document.querySelector(s).textContent)) && document.querySelector('[data-component=controller] .health-status').textContent==='Disponible'"), true);
    await browser.evaluate("window.fetch=(url,options)=>url==='/api/snapshot'?Promise.resolve(new Response('{}',{status:200})):window.__fetch(url,options); document.querySelector('#monitor-refresh').click(); true");
    await delay(250);
    assert.equal(await browser.evaluate("document.querySelector('[data-component=monitor] .health-status').textContent"),'Non observé');
    await browser.evaluate("window.fetch=window.__fetch; Date.now=window.__dateNow; document.querySelector('#monitor-refresh').click(); true");
    await wait(() => browser.evaluate("document.querySelector('[data-component=monitor] .health-status').textContent === 'Disponible' && !document.querySelector('#monitor-refresh').disabled"),browser.name+' nouveau succès Web');
    const guardedSnapshot = await (await fetch(url + '/api/snapshot')).json();
    for (const run of guardedSnapshot.runs) Object.assign(run, { state: 'DELIVERED', armed: false, hasMandate: false, pending: 0, manageable: true });
    await browser.evaluate("window.__guardSnapshot=" + JSON.stringify(JSON.stringify(guardedSnapshot)) + "; window.__manageCalls=0; window.fetch=(url,options)=>url==='/api/snapshot'?Promise.resolve(new Response(window.__guardSnapshot,{status:200})):url.startsWith('/api/manage/')?(window.__manageCalls++,Promise.resolve(new Response('{}',{status:200}))):window.__fetch(url,options); document.querySelector('#monitor-refresh').click(); true");
    await wait(() => browser.evaluate("!document.querySelector('#monitor-refresh').disabled && !document.querySelector('[data-component=controller] button[aria-label^=Redémarrer]').disabled"),browser.name+' gardes sur snapshot frais');
    await browser.evaluate("Date.now=()=>window.__dateNow()+20000; true");
    await delay(1200);
    assert.equal(await browser.evaluate("document.querySelector('[data-component=controller] .health-status').textContent==='Disponible' && document.querySelector('[data-component=controller] button[aria-label^=Redémarrer]').disabled"), true);
    await browser.evaluate("document.querySelector('#work-content .row-actions button').click(); true");
    assert.equal(await browser.evaluate("window.__manageCalls===0 && document.querySelector('#management-status').textContent.includes('Actualisez la vue')"), true);
    guardedSnapshot.sources.controller.available = false;
    await browser.evaluate("Date.now=window.__dateNow; window.__guardSnapshot=" + JSON.stringify(JSON.stringify(guardedSnapshot)) + "; document.querySelector('#monitor-refresh').click(); true");
    await wait(() => browser.evaluate("document.querySelector('[data-component=controller] .health-status').textContent==='Indisponible' && document.querySelector('#work-content').textContent.includes('UNKNOWN')"),browser.name+' source indisponible au prochain snapshot');
    await browser.evaluate("window.fetch=window.__fetch; document.querySelector('#monitor-refresh').click(); true");
    await wait(() => browser.evaluate("!document.querySelector('#monitor-refresh').disabled && document.querySelector('[data-component=controller] .health-status').textContent==='Disponible'"),browser.name+' restauration après gardes');
    if (unit === 'manual') { await finishUnit(browser, ['vue stable après vingt secondes', 'états et sélection conservés après interaction et perte SSE', 'HTTP échoué et JSON invalide sans effacement', 'Web expiré après trente minutes', 'gardes courantes sans POST', 'nouveau snapshot indisponible rendu']); continue; }
    await browser.evaluate("document.querySelector('#refresh-interval').value='3000'; document.querySelector('#refresh-interval').dispatchEvent(new Event('change')); true");
    completed=3;limit=4096;await tasks();await monitor.state.collect();await delay(1100);
    assert.equal(await browser.evaluate("document.querySelector('#metrics').textContent.includes('3 000')"),true);
    await wait(() => browser.evaluate("document.querySelector('#metrics').textContent.includes('4 096') && document.querySelector('#work-content').textContent.includes('3/14')"),browser.name+' cadence 3s effective');
    await browser.evaluate("document.querySelector('#refresh-interval').value='1000'; document.querySelector('#refresh-interval').dispatchEvent(new Event('change')); true");
    const lateSnapshot=await (await fetch(url+'/api/snapshot')).json();lateSnapshot.configuration.maxCommandLength=9999;
    await browser.evaluate("document.querySelector('#refresh-interval').value='0'; document.querySelector('#refresh-interval').dispatchEvent(new Event('change')); window.__fetchLate=window.fetch; window.fetch=(url,options)=>url==='/api/snapshot'?new Promise(resolve=>{window.__lateResolve=resolve}):window.__fetchLate(url,options); true");
    await monitor.close();
    await wait(() => browser.evaluate("!document.querySelector('#connection').textContent.includes('connectée')"),browser.name+' transport interrompu pour réponse tardive');
    await browser.evaluate("document.querySelector('#refresh-interval').value='1000'; document.querySelector('#refresh-interval').dispatchEvent(new Event('change')); true");
    await wait(() => browser.evaluate("typeof window.__lateResolve === 'function'"),browser.name+' récupération automatique en vol');
    await browser.evaluate("document.querySelector('#refresh-interval').value='0'; document.querySelector('#refresh-interval').dispatchEvent(new Event('change')); window.__lateResolve(new Response("+JSON.stringify(JSON.stringify(lateSnapshot))+",{status:200})); true");
    await wait(() => browser.evaluate("!document.querySelector('#monitor-refresh').disabled"),browser.name+' réponse automatique terminée');
    assert.equal(await browser.evaluate("document.querySelector('#metrics').textContent.includes('4 096') && !document.querySelector('#metrics').textContent.includes('9 999')"),true);
    await browser.evaluate("window.fetch=window.__fetchLate; true");
    monitor=await createMonitorServer({...monitorConfig,port:address.port},options);await monitor.start();
    await browser.evaluate("document.querySelector('#monitor-refresh').click(); true");
    await wait(() => browser.evaluate("!document.querySelector('#monitor-refresh').disabled && document.querySelector('#refresh-status').textContent === ''"),browser.name+' reprise manuelle après réponse écartée');
    await browser.evaluate("document.querySelector('#refresh-interval').value='1000'; document.querySelector('#refresh-interval').dispatchEvent(new Event('change')); true");
    recoveryBlocked = true; await monitor.state.collect();
    await wait(() => browser.evaluate("document.querySelectorAll('tr[data-state=BLOCKED]').length === 2"), browser.name + ' WAITING devenu BLOCKED');
    recoveryBlocked = false; await monitor.state.collect();
    await browser.evaluate("document.querySelector('#changes-tab').click(); true");
    assert.equal(await browser.evaluate("document.querySelector('#detail').textContent.includes('Supervision web locale')"), true);
    await browser.evaluate("document.querySelector('#search').value='recovery'; document.querySelector('#search').dispatchEvent(new Event('input')); true");
    assert.equal(await browser.evaluate("document.querySelectorAll('#work-content tbody tr').length"), 1);
    await browser.evaluate("document.querySelector('#search').value=''; document.querySelector('#runs-tab').click(); true");
    completed = 4; limit = 16384; lifecycle = nextLifecycle(lifecycle, 'IMPLEMENTATION', undefined, 1); await tasks();
    journal.record('lifecycle-step-changed', { runId: 'RUN-WEB', changeId: changeIds[0], requestId: 'req-live',
      stepId: 'IMPLEMENTATION', stepStatus: 'IN_PROGRESS', stepSequence: 2 });
    await wait(() => browser.evaluate("document.querySelector('#work-content').textContent.includes('4/14') && document.querySelector('#metrics').textContent.includes('16 384') && document.querySelector('#timeline').textContent.includes('req-live') && document.querySelector('#work-content tbody tr').textContent.includes('Implémentation · 6/11')"), browser.name + ' actualisation dynamique et retour 8→6');
    assert.equal(await browser.evaluate("document.querySelector('.step-history').textContent.includes('Revue · 8/11') && document.querySelector('.step-history').textContent.includes('Implémentation · 6/11')"), true);
    failed = true; await monitor.state.collect();
    await wait(() => browser.evaluate("document.querySelector('#health').textContent.includes('Indisponible') && document.querySelector('#work-content').textContent.includes('UNKNOWN')"), browser.name + ' panne visible');
    failed = false; await monitor.state.collect();
    monitor.server.closeAllConnections();
    await wait(() => browser.evaluate("document.querySelector('#connection').textContent.includes('connectée')"), browser.name + ' reconnexion SSE');
    await browser.viewport(390, 844); await delay(250);
    assert.equal(await browser.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
    await browser.screenshot('web-monitor-' + browser.name.toLowerCase() + '-mobile.png');
    await browser.viewport(1440, 1100); oldStatistics();
    await browser.evaluate("document.querySelector('#stats-nav').click(); true");
    await wait(() => browser.evaluate("!document.querySelector('#stats-page').hidden && document.querySelector('#stats-status').textContent.includes('Dernier succès')"), browser.name + ' STATS disponible');
    assert.equal(await browser.evaluate("document.querySelector('#monitor-page').hidden && document.querySelector('#stats-nav').getAttribute('aria-current') === 'page'"), true);
    assert.equal(await browser.evaluate("document.querySelector('#stats-content').textContent.includes('SOURCE NATIVE') && document.querySelector('#stats-content').textContent.includes('HORS FENÊTRE TEMPORELLE')"), true);
    await browser.evaluate("document.querySelector('#stats-selection').value='7d'; document.querySelector('#stats-selection').dispatchEvent(new Event('change')); true");
    await wait(() => browser.evaluate("document.querySelector('#stats-status').textContent.includes('Dernier succès')"), browser.name + ' fenêtre 7 jours');
    await browser.evaluate("document.querySelector('#stats-run').value='RUN-WEB'; document.querySelector('#stats-run').dispatchEvent(new Event('change')); true");
    await wait(() => browser.evaluate("document.querySelector('#stats-status').textContent.includes('Dernier succès')"), browser.name + ' filtre RUN');
    assert.equal(await browser.evaluate("!document.querySelector('#stats-content').textContent.includes('RUN-RECOVERY')"), true);
    await browser.screenshot('web-stats-' + browser.name.toLowerCase() + '-desktop.png');
    await browser.evaluate("document.querySelector('#retention-preview').click(); true");
    await wait(() => browser.evaluate("document.querySelector('#retention-dialog').open"), browser.name + ' prévisualisation purge');
    await browser.evaluate("document.querySelector('#retention-cancel').click(); true");
    assert.ok(statistics.data.contexts['RUN-HISTORY:1'], 'annulation sans purge');
    await browser.evaluate("document.querySelector('#retention-preview').click(); true");
    await wait(() => browser.evaluate("document.querySelector('#retention-dialog').open"), browser.name + ' confirmation purge');
    await browser.screenshot('web-stats-' + browser.name.toLowerCase() + '-purge.png');
    await browser.evaluate("document.querySelector('#retention-confirm').click(); true");
    await wait(() => browser.evaluate("document.querySelector('#retention-status').textContent.includes('Purge terminée')"), browser.name + ' purge terminée');
    assert.equal(statistics.data.contexts['RUN-HISTORY:1'], undefined);
    assert.ok(statistics.data.contexts['RUN-WEB:1'], 'contexte actif protégé');
    failed = true;
    await wait(() => browser.evaluate("document.querySelector('#stats-status').textContent.includes('Données anciennes')"), browser.name + ' statistiques anciennes');
    failed = false;
    await browser.viewport(390, 844); await delay(250);
    assert.equal(await browser.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
    await browser.screenshot('web-stats-' + browser.name.toLowerCase() + '-mobile.png');
    await browser.evaluate("document.querySelector('#monitor-nav').click(); true");
    await wait(() => browser.evaluate("!document.querySelector('#monitor-page').hidden && document.querySelector('#stats-page').hidden"), browser.name + ' retour MONITOR');
    assert.equal(await browser.evaluate("getComputedStyle(document.querySelector('#page-title')).fontWeight >= 800 && document.querySelector('#page-title').textContent === 'CENTRE D’OBSERVATION' && !document.querySelector('#monitor-page').textContent.includes('Tout le travail.') && !document.querySelector('#monitor-page').textContent.includes('Une vue commune.')"), true);
    assert.equal(await browser.evaluate("document.querySelectorAll('.health-card').length === 5 && document.querySelectorAll('[data-component=monitor] button').length === 1"), true);
    assert.equal(await browser.evaluate("[...document.querySelectorAll('#work-content .row-actions button')].every(button => button.disabled)"), true);
    await browser.evaluate("document.querySelector('[data-component=monitor] button').focus(); true");
    assert.equal(await browser.evaluate("document.activeElement.getAttribute('aria-label') === 'Redémarrer Web'"), true);
    managementMode = true; completed = 14; await tasks(); await monitor.state.collect();
    await wait(() => browser.evaluate("!document.querySelector('#work-content .row-actions button').disabled"), browser.name + ' RUN terminé admissible');
    for (const component of ['controller', 'supervisor', 'broker']) {
      await browser.evaluate("document.querySelector('[data-component=" + component + "] button[aria-label^=Redémarrer]').click(); true");
      await wait(() => browser.evaluate("document.querySelector('#management-status').textContent.includes('état de la brique confirmé')"), browser.name + ' commande ' + component);
    }
    assert.ok(serviceCalls.some((args) => Array.isArray(args) && args[0] === 'restart'));
    assert.ok(serviceCalls.includes('/api/experimental/mcp/cgpt-validation/disconnect'));
    const originalTasks = await readFile(join(root, 'openspec', 'changes', changeIds[0], 'tasks.md'), 'utf8');
    await browser.evaluate("document.querySelector('#work-content button[aria-label=\"Archiver RUN-WEB\"]').click(); true");
    await wait(() => browser.evaluate("document.querySelector('#management-status').textContent.includes('Élément archivé') && !document.querySelector('#work-content [data-run=RUN-WEB]')"), browser.name + ' RUN archivé');
    await browser.evaluate("document.querySelector('#changes-tab').click(); true");
    await browser.evaluate("document.querySelector('#work-content button[aria-label^=Archiver]').click(); true");
    await wait(() => browser.evaluate("document.querySelector('#management-status').textContent.includes('Élément archivé') && !document.querySelector('#work-content [data-change=add-local-web-monitor]')"), browser.name + ' change archivé');
    await browser.evaluate("document.querySelector('#archives-nav').click(); true");
    await wait(() => browser.evaluate("!document.querySelector('#archives-page').hidden && document.querySelector('#archives-nav').getAttribute('aria-current') === 'page' && document.querySelector('#archives-runs').textContent.includes('RUN-WEB') && document.querySelector('#archives-changes').textContent.includes('add-local-web-monitor')"), browser.name + ' archives RUN et changes');
    await browser.screenshot('web-archives-' + browser.name.toLowerCase() + '-desktop.png');
    await browser.evaluate("document.querySelector('#archives-runs button[aria-label=\"Désarchiver RUN-WEB\"]').click(); true");
    await wait(() => browser.evaluate("document.querySelector('#management-status').textContent.includes('RUN désarchivé')"), browser.name + ' désarchivage');
    await browser.viewport(390, 844); await delay(250);
    assert.equal(await browser.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
    await browser.screenshot('web-archives-' + browser.name.toLowerCase() + '-mobile.png');
    await browser.evaluate("document.querySelector('#monitor-nav').click(); document.querySelector('#runs-tab').click(); true");
    await wait(() => browser.evaluate("!!document.querySelector('#work-content [data-run=RUN-WEB]')"), browser.name + ' RUN restauré');
    await browser.evaluate("document.querySelector('#work-content button[aria-label=\"Supprimer RUN-RECOVERY du moniteur\"]').click(); true");
    await wait(() => browser.evaluate("document.querySelector('#management-dialog').open"), browser.name + ' confirmation suppression');
    await browser.evaluate("document.querySelector('#management-cancel').click(); true");
    assert.equal(await browser.evaluate("!!document.querySelector('#work-content [data-run=RUN-RECOVERY]')"), true);
    await browser.evaluate("document.querySelector('#work-content button[aria-label=\"Supprimer RUN-RECOVERY du moniteur\"]').click(); document.querySelector('#management-confirm').click(); true");
    await wait(() => browser.evaluate("document.querySelector('#management-status').textContent.includes('Ligne supprimée') && !document.querySelector('#work-content [data-run=RUN-RECOVERY]')"), browser.name + ' suppression logique');
    assert.equal(await readFile(join(root, 'openspec', 'changes', changeIds[0], 'tasks.md'), 'utf8'), originalTasks);
    await browser.evaluate("document.querySelector('[data-component=monitor] button').click(); true");
    await wait(() => browser.evaluate("document.querySelector('#management-status').textContent.includes('Web redémarré')"), browser.name + ' Web redémarré et SSE rétabli');
    assert.equal(await browser.evaluate("!document.querySelector('#work-content [data-run=RUN-RECOVERY]')"), true);
    results.push({ browser: browser.name, version: browser.version, passed: ['rendu', 'limite effective', 'RUN et changes', '3/14 puis 4/14',
      'ETAT et ÉTAPE distincts', 'versions des briques', 'cycle de onze étapes', 'retour Revue 8/11 vers Implémentation 6/11',
      'historique conservé', 'WAITING jaune et BLOCKED rouge sur les lignes des jobs', 'filtres', 'SSE', 'panne UNKNOWN', 'reconnexion', 'mobile sans débordement',
      'navigation STATS/MONITOR', 'fenêtre 7 jours et filtre RUN', 'cumul distinct', 'prévisualisation et annulation', 'purge et protection active', 'statistiques anciennes', 'STATS mobile sans débordement',
      'réponse automatique tardive écartée après passage Manuel', 'neuf choix de cadence', 'cadence effective 3s', 'préférence mémorisée', 'Manuel sans mise à jour SSE', 'clic Actualiser',
      'Web disponible malgré perte SSE', 'Web expiré après 30 minutes', 'échecs HTTP et snapshot invalide sans renouvellement',
      'titre simplifié et gras', 'cinq cartes dont Web', 'boutons actifs protégés', 'commandes trois briques',
      'archivage RUN et change', 'navigation ARCHIVES', 'désarchivage sans reprise', 'annulation suppression',
      'suppression logique persistante', 'sources intactes', 'archives mobile', 'redémarrage Web avec reconnexion'] });
    results.at(-1).passed.push('codes de lot en deuxième colonne RUN et CHANGE avec cellule vide sans code', 'métadonnées alignées et responsive', 'vue manuelle stable au-delà du délai de fraîcheur', 'gardes de gestion à l’horloge courante', 'tri des deux tableaux avec égalités et inconnus');
    await browser.close(); browserClose = null; console.log(browser.name + ' : qualification réussie');
  }
  await writeFile(join(artifactDirectory, 'web-monitor-browser' + (unit ? '-' + unit : '') + '-results.json'), JSON.stringify(results, null, 2) + '\n');
} finally {
  await browserClose?.().catch(() => {});
  for (const process of children.reverse()) {
    if (process.exitCode !== null || process.signalCode !== null) continue;
    const exited = new Promise((done) => process.once('exit', done)); process.kill('SIGTERM');
    const timer = setTimeout(() => process.kill('SIGKILL'), 3000); await exited; clearTimeout(timer);
  }
  await monitor?.close();
  await statistics?.close();
  if (upstream) { upstream.closeAllConnections(); await new Promise((done) => upstream.close(done)); }
  await rm(root, { recursive: true, force: true });
}
