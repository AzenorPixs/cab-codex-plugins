import assert from 'node:assert/strict';
import test from 'node:test';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile, symlink, link, unlink, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { Worker } from 'node:worker_threads';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { updateComponents } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs';
import { BROKER_ARTIFACT_FILES, validateBrokerProof, inspectBrokerArtifacts, inspectBrokerProcess } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-artifact-proof.mjs';
import { processIdentity } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-maintenance-proof.mjs';

const version = (source) => source.match(/^(?:export )?(?:const )?(?:VERSION|SERVER_VERSION|version)\s*=\s*["']([^"']+)["']/m)?.[1];

async function artifactFixture(t) {
  const root=await mkdtemp(join(tmpdir(),'cab-readonly-proof-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const directory=join(root,'broker');await cp(new URL('../plugins/cab-approval-bridge/broker/',import.meta.url),directory,{recursive:true});
  const parent=await processIdentity(process.pid),manifest={};
  for(const name of BROKER_ARTIFACT_FILES)manifest[name]=createHash('sha256').update(await readFile(join(directory,name))).digest('hex');
  const proof={authorization:'isolated source proof',entry:join(directory,BROKER_ARTIFACT_FILES[0]),expectedUid:process.getuid(),expectedGid:(await lstat(join(directory,BROKER_ARTIFACT_FILES[0]))).gid,
    manifest,loadedVersion:'1.7.1',instanceId:'inst-isolated-proof',opencodeProcess:parent,brokerProcess:{...parent,pid:parent.pid+1}};
  return {root,directory,proof};
}

test('broker externe : trois artefacts cibles vérifiés sans mutation et processus antérieur annoncé séparément',async(t)=>{
  const h=await artifactFixture(t),before=await inspectBrokerArtifacts(h.directory,h.proof);
  assert.equal(before.version,'1.10.5');assert.equal(h.proof.loadedVersion,'1.7.1');
  assert.equal(Object.keys(before.files).length,3);
  assert.deepEqual(await inspectBrokerArtifacts(h.directory,h.proof),before);
  for(const name of BROKER_ARTIFACT_FILES)assert.equal(createHash('sha256').update(await readFile(join(h.directory,name))).digest('hex'),h.proof.manifest[name]);
});

test('broker externe : manifeste, propriétaire, liens et alias divergents sont refusés',async(t)=>{
  const h=await artifactFixture(t);
  assert.throws(()=>validateBrokerProof({...h.proof,unrecognized:'not an authorization'},h.directory),/proof-invalid/);
  await assert.rejects(inspectBrokerArtifacts(h.directory,{...h.proof,manifest:{...h.proof.manifest,[BROKER_ARTIFACT_FILES[0]]:'0'.repeat(64)}}),/artifact-divergent/);
  const uid=h.proof.expectedUid+1;
  await assert.rejects(inspectBrokerArtifacts(h.directory,{...h.proof,expectedUid:uid,opencodeProcess:{...h.proof.opencodeProcess,uid},brokerProcess:{...h.proof.brokerProcess,uid}}),/artifact-unsafe/);
  const path=join(h.directory,BROKER_ARTIFACT_FILES[0]),saved=await readFile(path);
  await link(path,join(h.root,'alias.py'));await assert.rejects(inspectBrokerArtifacts(h.directory,h.proof),/artifact-unsafe/);
  await unlink(join(h.root,'alias.py'));await unlink(path);await writeFile(join(h.root,'linked.py'),saved);
  await symlink(join(h.root,'linked.py'),path);await assert.rejects(inspectBrokerArtifacts(h.directory,h.proof),/artifact-unsafe/);
});

test('broker externe : véritable enfant Python, entrée et identité du parent contrôlées sans environnement',async(t)=>{
  const h=await artifactFixture(t);await writeFile(h.proof.entry,'import time\ntime.sleep(30)\n');
  const child=spawn('python3',[h.proof.entry],{stdio:'ignore'});
  t.after(async()=>{if(child.exitCode===null&&child.signalCode===null){const done=new Promise((resolve)=>child.once('exit',resolve));child.kill('SIGTERM');await done;}});
  await new Promise((resolve)=>setTimeout(resolve,30));
  h.proof.brokerProcess=await processIdentity(child.pid);
  assert.deepEqual(await inspectBrokerProcess(h.proof,h.proof.brokerProcess),h.proof.brokerProcess);
  assert.deepEqual(await inspectBrokerProcess(h.proof),h.proof.brokerProcess);
  await assert.rejects(inspectBrokerProcess({...h.proof,entry:join(h.root,'another.py')},h.proof.brokerProcess),/process-changed/);
  await assert.rejects(inspectBrokerProcess({...h.proof,opencodeProcess:{...h.proof.opencodeProcess,startTime:'0'}},h.proof.brokerProcess),/parent-changed/);
});

test('broker externe : politique explicite incompatible avec M2 ou preuve absente refusée avant service',async(t)=>{
  const h=await fixture(t);
  await assert.rejects(updateComponents({...h.c,brokerPolicy:'reuse-readonly',layout:'managed-release'},h.options),/broker-proof-invalid/);
  await assert.rejects(updateComponents({...h.c,profile:'frozen-recovery-controller',brokerPolicy:'reuse-readonly'},h.options),/broker-policy-profile-invalid/);
  assert.ok(!h.state.events.some((event)=>event[0]==='systemd'));
});

test('broker externe : enfant Python créé par un thread secondaire, unicité et gardes conservées',async(t)=>{
  const h=await artifactFixture(t);await writeFile(h.proof.entry,'import time\ntime.sleep(60)\n');
  const worker=new Worker(`
    const {parentPort,workerData}=require('node:worker_threads');
    const {spawn}=require('node:child_process');
    const children=[];
    function launch(){const child=spawn('python3',[workerData.entry],{stdio:'ignore'});children.push(child);child.once('spawn',()=>parentPort.postMessage(child.pid));child.once('error',error=>{throw error;});}
    parentPort.on('message',async action=>{
      if(action==='second')launch();
      else if(action==='stop'){await Promise.all(children.map(child=>child.exitCode!==null||child.signalCode!==null?Promise.resolve():new Promise(done=>{child.once('exit',done);child.kill('SIGTERM');})));parentPort.close();}
    });
    launch();
  `,{eval:true,workerData:{entry:h.proof.entry}});
  const next=()=>new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);});
  const stopped=new Promise(resolve=>worker.once('exit',resolve));let closed=false;
  t.after(async()=>{if(!closed){worker.postMessage('stop');await stopped;}});
  const pid=await next();h.proof.brokerProcess=await processIdentity(pid);
  const mainChildren=(await readFile('/proc/'+process.pid+'/task/'+process.pid+'/children','utf8')).trim().split(/\s+/);
  assert.ok(!mainChildren.includes(String(pid)),'le cas exige un enfant absent du thread principal');
  assert.deepEqual(await inspectBrokerProcess(h.proof),h.proof.brokerProcess);
  assert.deepEqual(await inspectBrokerProcess(h.proof,h.proof.brokerProcess),h.proof.brokerProcess);
  await assert.rejects(inspectBrokerProcess({...h.proof,entry:join(h.root,'wrong.py')}),/process-not-unique/);
  await assert.rejects(inspectBrokerProcess({...h.proof,expectedUid:process.getuid()+1}),/process-not-unique/);
  await assert.rejects(inspectBrokerProcess({...h.proof,opencodeProcess:{...h.proof.opencodeProcess,startTime:'0'}}),/parent-changed/);
  const second=next();worker.postMessage('second');await second;
  await assert.rejects(inspectBrokerProcess(h.proof),/process-not-unique/);
  worker.postMessage('stop');await stopped;closed=true;
  await assert.rejects(inspectBrokerProcess(h.proof),/process-not-unique/);
});

test('profil gelé : autorisation et cible absentes refusées avant toute action de service', async(t)=>{
  const h=await fixture(t);
  await assert.rejects(updateComponents({...h.c,profile:'frozen-recovery-controller'},h.options),/update-frozen-contract-invalid/);
  assert.ok(!h.state.events.some((event)=>event[0]==='systemd'&&event[1]==='stop'));
});
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
        const path = join(target, entry.name); await writeFile(path, (await readFile(path, 'utf8')).replaceAll('1.10.5', '1.7.0'));
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
      if (state.wrongBroker && state.brokerVersion === '1.10.5') state.brokerVersion = '1.7.0';
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

test('jeu réel : les quatre briques actives passent en 1.10.5, RUN et archives conservés, deuxième invocation sans arrêt', async (t) => {
  const h = await fixture(t, { realSyntax: true }); const before = await readFile(h.runtime, 'utf8');
  const result = await updateComponents(h.c, h.options);
  assert.equal(result.status, 'completed'); assert.equal(result.version, '1.10.5');
  assert.deepEqual(h.state.versions, { controller: '1.10.5', supervisor: '1.10.5', monitor: '1.10.5' });
  assert.equal(h.state.brokerVersion, '1.10.5'); assert.equal(h.state.global.state, 'RELEASED');
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
  assert.equal(version(await readFile(h.entry('controller'), 'utf8')), '1.10.5');
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


test('broker 1.9.0 chargé vers artefacts 1.10.5 : admission fermée sans mutation',async(t)=>{
  const h=await artifactFixture(t);h.proof.loadedVersion='1.9.0';
  assert.equal(validateBrokerProof(h.proof,h.directory),h.proof);
  const before=await inspectBrokerArtifacts(h.directory,h.proof);
  assert.equal(before.version,'1.10.5');assert.equal(h.proof.loadedVersion,'1.9.0');
  for(const loadedVersion of ['1.7.1','1.8.0','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.10.5'])assert.equal(validateBrokerProof({...h.proof,loadedVersion},h.directory).loadedVersion,loadedVersion);
  for(const loadedVersion of ['1.9.1','1.9.0+codex.20261025101020','1.10.6','2.0.0',null])assert.throws(()=>validateBrokerProof({...h.proof,loadedVersion},h.directory),/proof-invalid/);
  assert.throws(()=>validateBrokerProof({...h.proof,expectedUid:h.proof.expectedUid+1},h.directory),/proof-invalid/);
  assert.deepEqual(await inspectBrokerArtifacts(h.directory,h.proof),before);
});


async function networkFixture(t, { registryPadding = 0, statusPadding = 0 } = {}) {
  const h=await fixture(t);const bases={controller:'http://127.0.0.1:8788',supervisor:'http://127.0.0.1:8789',monitor:'http://127.0.0.1:8790',opencode:'http://127.0.0.1:4096'};
  const c={...h.c};const servers=[];let registrySize=0;
  for(const name of Object.keys(bases)){
    const server=createServer(async(req,res)=>{
      try {
        let text='';for await(const part of req)text+=part;
        const route=new URL(req.url,'http://localhost').pathname;
        const value=await h.options.http(bases[name],req.url,text?JSON.parse(text):undefined);
        if(name==='controller'&&route==='/runs'&&registryPadding)value.transportFixtureHistory='x'.repeat(registryPadding);
        if(name==='controller'&&route==='/status'&&statusPadding)value.transportFixtureHistory='x'.repeat(statusPadding);
        const data=JSON.stringify(value);if(name==='controller'&&route==='/runs')registrySize=Buffer.byteLength(data);
        res.writeHead(200,{'content-type':'application/json'});res.end(data);
      } catch {res.writeHead(503,{'content-type':'application/json'}).end('{"error":"fixture unavailable"}');}
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));servers.push(server);c[name+'Url']='http://127.0.0.1:'+server.address().port;
  }
  t.after(async()=>{for(const server of servers){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}});
  const {http,...options}=h.options;
  return {...h,c,options,registrySize:()=>registrySize};
}

test('registre HTTP supérieur à 2 Mio : lecture intégrale et maintenance contrôlée',async(t)=>{
  const h=await networkFixture(t,{registryPadding:3*1024*1024});const initial=await readFile(h.runtime);
  const result=await updateComponents(h.c,h.options);
  assert.equal(result.status,'completed');assert.ok(h.registrySize()>2*1024*1024);
  assert.deepEqual(await readFile(h.runtime),initial);assert.equal(h.state.run.suspension.action,'PAUSE');
});

test('registre HTTP supérieur à 16 Mio refusé avant effet',async(t)=>{
  const h=await networkFixture(t,{registryPadding:16*1024*1024+1});
  await assert.rejects(updateComponents(h.c,h.options),/update-response-too-large/);
  assert.ok(!h.state.events.some(e=>e[0]==='systemd'&&e[1]==='stop'));
  assert.equal(h.state.global,null);assert.equal(h.state.broker,true);
});

test('les autres réponses HTTP restent limitées à 2 Mio',async(t)=>{
  const h=await networkFixture(t,{statusPadding:2*1024*1024+1});
  const result=await updateComponents(h.c,h.options);
  assert.equal(result.status,'waiting');
  assert.ok(!h.state.events.some(e=>e[0]==='systemd'&&e[1]==='stop'));
  assert.equal(h.state.global.state,'DRAINING');assert.equal(h.state.broker,true);
});
