import {runtimeStateDirectory} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-state-layout.mjs';
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
  const restartNative = async (missingSession = '') => {
    await stop(native, 'SIGKILL');
    const replacement = fork(join(root, 'tests/helpers/lifecycle-opencode-server.mjs'), [directory,String(nativePort),missingSession],
      { stdio: ['ignore', 'ignore', 'pipe', 'ipc'], env: fixtureEnvironment });
    children.push(replacement);
    await new Promise((resolve,reject)=>{replacement.once('message',resolve);replacement.once('error',reject)});
    return replacement;
  };
  return { directory, services, native, bases, stop, errors, restartNative };
}

test('redémarrage OpenCode : services et RUN conservés sans rejeu', { timeout: 15000 }, async t=>{
 const f=await setup(t), pids=Object.fromEntries(Object.entries(f.services).map(([k,v])=>[k,v.pid]));
 const response=await fetch(f.bases.controller+'/runs/reserve',{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({runId:'restart-run',ownerId:'owner',sessionId:'ses_restart',directory:f.directory,changeId:'change-restart',
   selectionKey:'restart',dependsOn:[],resources:[{key:'file:src/a',mode:'write'},{key:'browser:host-a/chromium',mode:'write'}],exclusiveResources:['file:src/a']})});
 assert.equal(response.status,201,await response.clone().text());const run=await response.json();
 const leaseResponse=await fetch(f.bases.controller+'/runs/restart-run/test-resources/acquire',{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({version:run.version,transactionId:'restart-browser',resources:[{key:'browser:host-a/chromium',mode:'write'}],evidence:['fixture']})});
 assert.equal(leaseResponse.status,200,await leaseResponse.clone().text());const lease=await leaseResponse.json();
 await f.stop(f.native,'SIGKILL');
 await until(async()=>{const d=await (await fetch(f.bases.controller+'/runs/restart-run/status')).json();return d.nativeRestart?.state==='WAITING';});
 const blocked=await fetch(f.bases.controller+'/runs/reserve',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
 assert.equal(blocked.status,503);
 const replacement=await f.restartNative();
 await until(async()=>{const d=await (await fetch(f.bases.controller+'/runs/restart-run/status')).json();return d.nativeRestart?.state==='VERIFIED'&&d.nativeRestart.pid===replacement.pid;},10000);
 for(const [name,child] of Object.entries(f.services)){assert.equal(child.pid,pids[name]);assert.equal(child.exitCode,null)}
 const staleBroker=await fetch(f.bases.controller+'/broker/readiness',{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({status:'READY',broker_process:{pid:process.pid}})});
 assert.equal(staleBroker.status,503);assert.equal((await staleBroker.json()).error,'opencode-restart-broker-identity-unverified');
 const runs=await (await fetch(f.bases.controller+'/runs')).json();assert.ok(runs.runs.some(x=>x.runId==='restart-run'&&x.sessionId==='ses_restart'));
 assert.equal(Object.keys(runs.coordination.operations).length,0);
 const leaseAfter=runs.coordination.testReservations['restart-browser'];assert.equal(leaseAfter.state,'HELD');assert.equal(leaseAfter.fencing,lease.fencing);
 const status=await (await fetch(f.bases.controller+'/runs/restart-run/status')).json();
 assert.notEqual(status.coordination.reason,'test-reconciliation-required');
});

test('redémarrage : session manquante isolée puis reprise après vérification', { timeout: 15000 }, async t=>{
 const f=await setup(t);
 for(const id of ['a','b']){
  const response=await fetch(f.bases.controller+'/runs/reserve',{method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({runId:id,ownerId:'owner-'+id,sessionId:'ses_'+id,directory:f.directory,changeId:'change-'+id,
    selectionKey:id,dependsOn:[],resources:[{key:'file:src/'+id,mode:'write'}],exclusiveResources:['file:src/'+id]})});
  assert.equal(response.status,201,await response.text());
 }
 await f.stop(f.native,'SIGKILL');
 await until(async()=>{const d=await (await fetch(f.bases.controller+'/runs/a/status')).json();return d.nativeRestart?.state==='WAITING';});
 const replacement=await f.restartNative('ses_b');
 await until(async()=>{const d=await (await fetch(f.bases.controller+'/runs/b/status')).json();return d.nativeRestart?.state==='SESSION_UNVERIFIED';},10000);
 const a=await (await fetch(f.bases.controller+'/runs/a/status')).json();assert.equal(a.nativeRestart.state,'VERIFIED');
 const blocked=await fetch(f.bases.controller+'/runs/b/locks/acquire',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(blocked.status,503);
 const independent=await fetch(f.bases.controller+'/runs/a/locks/acquire',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.notEqual(independent.status,503);
 replacement.send('restore-session');
 await until(async()=>{const d=await (await fetch(f.bases.controller+'/runs/b/status')).json();return d.nativeRestart?.state==='VERIFIED';},8000);
});

test('identité HTTP divergente : mutation refusée même si ancien processus vivant', {timeout:15000}, async t=>{
 const f=await setup(t);
 await new Promise(resolve=>{const listener=value=>{if(value.pidDiverged){f.native.off('message',listener);resolve();}};f.native.on('message',listener);f.native.send('diverge-pid')});
 const response=await fetch(f.bases.controller+'/runs/reserve',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
 assert.equal(response.status,503);assert.equal((await response.json()).error,'opencode-restart-reconciliation-required');
});

for (const signal of ['normal', 'SIGKILL']) {
  test(`fin serveur ${signal} : services en attente, deux RUN conservés puis arrêt explicite`, { timeout: 15000 }, async (t) => {
    const f = await setup(t);
    const state = join(runtimeStateDirectory(f.directory));
    const helperPids = (await readFile(`/proc/${f.services.controller.pid}/task/${f.services.controller.pid}/children`, 'utf8')).trim().split(/\s+/).filter(Boolean);
    assert.ok(helperPids.length >= 1);
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
    if (signal === 'normal') { const done = once(f.native, 'exit'); f.native.send('exit'); await done; }
    else await f.stop(f.native, signal);
    await until(async()=>{const d=await (await fetch(f.bases.controller+'/runs/a/status')).json();return d.nativeRestart?.state==='WAITING';});
    for(const child of Object.values(f.services))assert.equal(child.exitCode,null);
    const started = performance.now();
    const exits = Object.values(f.services).map((child) => once(child, 'exit'));
    for(const child of Object.values(f.services))child.kill('SIGTERM');
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
  assert.ok(children.length >= 2);
  await f.stop(f.native, 'SIGKILL');
  await delay(700);
  for(const child of Object.values(f.services))assert.equal(child.exitCode,null);
  const exits = Object.values(f.services).map((child) => once(child, 'exit'));
  for(const child of Object.values(f.services))child.kill('SIGTERM');
  assert.deepEqual(await Promise.all(exits), [[0, null], [0, null], [0, null]], f.errors.join(''));
  for (const pid of children) await until(async () => {
    try { await readFile(`/proc/${pid}/stat`, 'utf8'); return false; }
    catch (cause) { if (cause.code === 'ENOENT') return true; throw cause; }
  });
});
