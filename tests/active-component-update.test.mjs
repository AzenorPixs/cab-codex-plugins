import {ResourceRunRegistry} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs';
import {runtimeStateDirectory,legacyStateDirectory} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-state-layout.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { chmod, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile, symlink, link, unlink, lstat, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { Worker } from 'node:worker_threads';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { updateComponents, VERSION as CURRENT_VERSION } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs';
import { BROKER_ARTIFACT_FILES,BROKER_PAYLOAD_FILES, validateBrokerProof, inspectBrokerArtifacts, inspectBrokerProcess } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-artifact-proof.mjs';
import { processIdentity } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-maintenance-proof.mjs';

const version = (source) => source.match(/^(?:export )?(?:const )?(?:VERSION|SERVER_VERSION|version)\s*=\s*["']([^"']+)["']/m)?.[1];

async function artifactFixture(t) {
  const root=await mkdtemp(join(tmpdir(),'cab-readonly-proof-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const directory=join(root,'broker');await cp(new URL('../plugins/cab-approval-bridge/broker/',import.meta.url),directory,{recursive:true});
  await chmod(directory,0o755);
  // Build controlled artifacts: mixed source ownership/ACLs must not leak into
  // this fixture's single-owner/single-group proof. Production guards stay intact.
  for(const name of BROKER_PAYLOAD_FILES){
    const path=join(directory,name),data=await readFile(path);
    await unlink(path);await writeFile(path,data,{mode:0o775});
  }
  const parent=await processIdentity(process.pid),manifest={};
  for(const name of BROKER_ARTIFACT_FILES)manifest[name]=createHash('sha256').update(await readFile(join(directory,name))).digest('hex');
  const proof={authorization:'isolated source proof',entry:join(directory,BROKER_ARTIFACT_FILES[0]),expectedUid:process.getuid(),expectedGid:(await lstat(join(directory,BROKER_ARTIFACT_FILES[0]))).gid,
    manifest,loadedVersion:'1.7.1',instanceId:'inst-isolated-proof',opencodeProcess:parent,brokerProcess:{...parent,pid:parent.pid+1}};
  return {root,directory,proof};
}

test('broker externe : trois artefacts cibles vérifiés sans mutation et processus antérieur annoncé séparément',async(t)=>{
  const h=await artifactFixture(t),before=await inspectBrokerArtifacts(h.directory,h.proof);
  assert.equal(before.version,CURRENT_VERSION);assert.equal(h.proof.loadedVersion,'1.7.1');
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

test('broker externe : tout le payload 2.4 doit correspondre au paquet qualifié',async t=>{
  const h=await artifactFixture(t),packaged=new URL('../plugins/cab-approval-bridge/broker/',import.meta.url).pathname;
  const observed=await inspectBrokerArtifacts(h.directory,h.proof,packaged);
  assert.deepEqual(Object.keys(observed.files).sort(),[...BROKER_PAYLOAD_FILES].sort());
  const path=join(h.directory,'cgpt_approval_bridge_atelier.py');
  await writeFile(path,(await readFile(path,'utf8'))+'\n# fixture divergent\n');
  await assert.rejects(inspectBrokerArtifacts(h.directory,h.proof,packaged),/artifact-divergent/);
});

test('broker externe : propriétaires explicitement liés, ancienne preuve et tiers refusés',async(t)=>{
  const h=await artifactFixture(t),before=await inspectBrokerArtifacts(h.directory,h.proof);
  const explicit={...h.proof,artifactOwnerUid:process.getuid(),directoryOwnerUid:process.getuid()};
  assert.deepEqual(await inspectBrokerArtifacts(h.directory,explicit),before);
  for(const value of [-1,1.5,'1000',process.getuid()+99]) {
    assert.throws(()=>validateBrokerProof({...explicit,artifactOwnerUid:value},h.directory),/proof-invalid/);
    assert.throws(()=>validateBrokerProof({...explicit,directoryOwnerUid:value},h.directory),/proof-invalid/);
  }
  const other=process.getuid()+1;
  const brokerElsewhere={...explicit,expectedUid:other,opencodeProcess:{...explicit.opencodeProcess,uid:other},brokerProcess:{...explicit.brokerProcess,uid:other}};
  assert.deepEqual(await inspectBrokerArtifacts(h.directory,brokerElsewhere),before);
  await assert.rejects(inspectBrokerArtifacts(h.directory,{...brokerElsewhere,artifactOwnerUid:other}),/artifact-unsafe/);
  await assert.rejects(inspectBrokerArtifacts(h.directory,{...brokerElsewhere,directoryOwnerUid:other}),/artifact-unsafe/);
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
async function fixture(t, { active = ['controller', 'supervisor', 'monitor'], broker = true, realSyntax = false, runSuspension = { action: 'PAUSE', evidenceDigest: 'existing-pause' }, global = null, openCodeOffline = false } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'cab-update-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const c = { home: join(root, 'home with space'), workspace: join(root, 'workspace'),
    pluginRoot: join(root, 'plugin'), brokerDirectory: join(root, 'broker'), waitMs: 2000 };
  await mkdir(c.home); await mkdir(c.workspace);
  await mkdir(join(c.home,'.config/cab-approval-bridge'),{recursive:true,mode:0o700});
  await writeFile(join(c.home,'.config/cab-approval-bridge/opencode.password'),'synthetic-test-password\n',{mode:0o600});
  await cp(new URL('../plugins/cab-approval-bridge/', import.meta.url), c.pluginRoot, { recursive: true });
  const scripts = join(c.home, '.local/share/cab-approval-bridge');
  const monitor = join(c.home, '.local/share/cab-approval-bridge-monitor');
  const units = join(c.home, '.config/systemd/user');
  const copyOld = async (source, target) => {
    await mkdir(target, { recursive: true }); await cp(source, target, { recursive: true });
    for (const entry of await readdir(target, { withFileTypes: true })) {
      if (entry.isFile()) {
        const path = join(target, entry.name); await writeFile(path, (await readFile(path, 'utf8')).replaceAll(CURRENT_VERSION, '1.7.0'));
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
    resources: [{ key: 'file:one.py', mode: 'write' }], ...(runSuspension ? { suspension: structuredClone(runSuspension) } : {}) };
  const state = { services: Object.fromEntries(['controller', 'supervisor', 'monitor'].map((name) => [name, active.includes(name)])),
    versions: { controller: '1.7.0', supervisor: '1.7.0', monitor: '1.7.0' }, broker,
    brokerVersion: '1.7.0', global: global ? structuredClone(global) : null, run, busy: false, failStart: null, wrongBroker: false,
    openCodeOffline, now: Date.now(), events: [] };
  const entry = (component) => component === 'monitor' ? join(monitor, 'scripts/cgpt-approval-bridge-monitor.mjs') : join(scripts, 'cgpt-approval-bridge-' + component + '.mjs');
  const request = async (base, route, body) => {
    const url = new URL(route, base); const path = url.pathname; state.events.push(['http', path, url.searchParams.get('directory')]);
    if (path === '/mcp') {
      if (state.openCodeOffline) throw Object.assign(new Error('opencode-offline'), { code: 'update-source-unavailable' });
      return { 'cgpt-validation': { status: state.broker ? 'connected' : 'disabled' } };
    }
    if (path.endsWith('/disconnect')) { state.broker = false; return {}; }
    if (path.endsWith('/connect')) {
      state.broker = true; state.brokerVersion = version(await readFile(join(c.brokerDirectory, 'cgpt_approval_bridge_server.py'), 'utf8'));
      if (state.wrongBroker && state.brokerVersion === CURRENT_VERSION) state.brokerVersion = '1.7.0';
      return {};
    }
    if (path === '/api/snapshot' || path === '/api/identity') {
      if (!state.services.monitor) throw new Error('monitor-off');
      return { version: state.versions.monitor, identity: { workspace: c.workspace } };
    }
    if (path === '/transport/status') {
      if (!state.handoffSupported) throw Object.assign(new Error('unsupported handoff'), { status: 404 });
      return { version: state.versions.controller, workspace: c.workspace, pid: 101,
        protocol: 'cab-continuity-v1', ready: state.handoff?.state === 'PREPARED', receipt: state.handoff || null,
        transportContinuity: { protocol: 'cab-continuity-v1', adopted: state.handoff?.state === 'ADOPTED',
          transactionId: state.handoff?.transactionId }, brokerReadiness: { server_version: state.brokerVersion },
        brokerReadinessReceivedAt: new Date(state.now).toISOString() };
    }
    if (path === '/transport/prepare') {
      state.handoff = { transactionId: body.transactionId, state: state.handoffBusy ? 'CANCELLED' : 'PREPARED' };
      if (state.handoffBusy) throw Object.assign(new Error('busy'), { code: 'update-handoff-busy', status: 409 });
      if (state.handoffResponseLost) {
        state.handoffResponseLost = false;
        throw Object.assign(new Error('response lost'), { code: 'update-source-unavailable' });
      }
      return { protocol: 'cab-continuity-v1', ready: true, receipt: state.handoff };
    }
    if (path === '/transport/cancel') {
      assert.equal(body.transactionId, state.handoff.transactionId);
      state.handoff.state = 'CANCELLED'; return {};
    }
    if (base.includes('8789')) {
      if (!state.services.supervisor) throw new Error('supervisor-off');
      return { version: state.versions.supervisor, workspace: c.workspace, pid: 102 };
    }
    if (!state.services.controller) throw new Error('controller-off');
    if (state.controllerReadyAt && state.now < state.controllerReadyAt) throw new Error('controller-starting');
    if (path === '/runs') return { project: c.workspace, schemaVersion: 4, coordinationProtocol: 'resource-scoped-v1',
      runs: [structuredClone(state.run)], requestOwners: { 'consumed-request': { runId: 'a', digest: 'stable' } } };
    if (path === '/runs/a/suspend') {
      if (!state.global || body.maintenanceTransactionId !== state.global.transactionId ||
          body.maintenanceGeneration !== state.global.generation || body.action !== 'PAUSE') throw new Error('maintenance-owner-divergent');
      if (body.version !== state.run.version) throw new Error('stale-run-version');
      if (state.run.suspension?.action !== 'PAUSE') {
        state.run.version++;
        state.run.suspension = { action: 'PAUSE', evidenceDigest: body.evidence.join(',') };
      }
      return structuredClone(state.run);
    }
    if (path === '/status') return { version: state.versions.controller, workspace: c.workspace, pid: 101, mode: 'concurrent',
      ...(state.handoffSupported ? { transportContinuity: { protocol: 'cab-continuity-v1' } } : {}),
      runs: { a: { job: { armed: true }, undecidedValidationCount: 0 } },
      brokerReadiness: { server_version: state.brokerVersion }, brokerReadinessReceivedAt: new Date(state.now).toISOString() };
    if (path === '/coordination/global') return { global: state.global };
    if (path === '/coordination/global/request') {
      if (state.global?.transactionId === body.transactionId) return state.global;
      if (state.global && state.global.state !== 'RELEASED') throw new Error('foreign-maintenance');
      state.global = { transactionId: body.transactionId, cause: body.cause, generation: 8, state: 'DRAINING' }; return state.global;
    }
    if (path === '/coordination/global/confirm') {
      if (state.busy) throw Object.assign(new Error('native-busy'), { status: 409 });
      state.global.state = 'HELD'; return state.global;
    }
    if (path === '/coordination/global/release') { state.global.state = 'RELEASED'; return state.global; }
    throw new Error('unexpected-path:' + path);
  };
  const options = { processProbe: async () => ({ openCode: false, broker: false, unknown: false }), http: request, now: () => state.now, sleep: async (ms) => { state.now += ms; },
    openCodeClient: {
      info: async()=>{if(state.openCodeOffline)throw Object.assign(new Error('offline'),{code:'update-source-unavailable'});return {pid:state.changedPid?43:42,version:'2.4.28'};},
      sharedMcpDirectory: async()=>state.sharedMcpDirectory||c.workspace,
      mcp: async (directory = state.sharedMcpDirectory || c.workspace) => {
        state.events.push(['http', '/api/mcp', directory]);
        if (state.openCodeOffline) throw Object.assign(new Error('opencode-offline'), { code: 'update-source-unavailable' });
        return { 'cgpt-validation': { status: state.broker ? 'connected' : 'disabled' } };
      },
      disconnectMcp: async (_server, directory = state.sharedMcpDirectory || c.workspace) => {
        state.events.push(['http', '/api/experimental/mcp/cgpt-validation/disconnect', directory]);
        if (state.openCodeOffline) throw Object.assign(new Error('opencode-offline'), { code: 'update-source-unavailable' });
        state.broker = false;
      },
      connectMcp: async (_server, directory = state.sharedMcpDirectory || c.workspace) => {
        state.events.push(['http', '/api/experimental/mcp/cgpt-validation/connect', directory]);
        if (state.openCodeOffline) throw Object.assign(new Error('opencode-offline'), { code: 'update-source-unavailable' });
        state.broker = true; state.brokerVersion = version(await readFile(join(c.brokerDirectory, 'cgpt_approval_bridge_server.py'), 'utf8'));
        if (state.wrongBroker && state.brokerVersion === CURRENT_VERSION) state.brokerVersion = '1.7.0';
      },
    },
    ...(realSyntax ? {} : { syntax: async () => {} }),
    serviceCommand: async (args) => {
      state.events.push(['systemd', ...args]);
      if (args[0] === 'daemon-reload') return '';
      if (args[0] === 'kill') {
        assert.deepEqual(args.slice(1,3),['--signal=SIGTERM','--kill-who=main']);
        assert.equal(args.at(-1),'cgpt-approval-bridge-controller.service');
        state.services.controller=false;state.controllerFailed=Boolean(state.failControllerShutdown);
        if(state.handoff?.state==='PREPARED')state.handoff.state='SEALED';
        return '';
      }
      const component = args[1].replace('cgpt-approval-bridge-', '').replace('.service', '');
      if (args[0] === 'show') return 'LoadState=loaded\nActiveState=' + (state.services[component] ? 'active' : component==='controller'&&state.controllerFailed ? 'failed' : 'inactive') +
        '\nMainPID=' + (state.services[component] ? ({ controller: 101, supervisor: 102, monitor: 103 })[component] : 0) + '\nExecStart=/usr/bin/env node "' + entry(component) + '"\n';
      if (args[0] === 'stop') {
        state.services[component] = false;if(component==='controller')state.controllerFailed=false;
        if (component === 'controller' && state.handoff?.state === 'PREPARED') state.handoff.state = 'SEALED';
      }
      else if (args[0] === 'start') {
        if (state.failStart === component) { state.failStart = null; throw new Error('synthetic-start-failed'); }
        state.services[component] = true; state.versions[component] = version(await readFile(entry(component), 'utf8'));
        if (component === 'controller' && state.handoff?.state === 'SEALED') state.handoff.state = 'ADOPTED';
        if (component === 'controller') state.controllerReadyAt = state.now + (state.controllerDelayMs || 0);
      } else throw new Error('unexpected-command');
      return '';
    } };
  const serviceCommand = options.serviceCommand;
  options.serviceCommand = async args => {
    if (['stop', 'start'].includes(args[0]) && args.length > 2) {
      for (const name of args.slice(1)) await serviceCommand([args[0], name]);
      return '';
    }
    return serviceCommand(args);
  };
  return { root, c, options, state, scripts, entry, runtime, catalog,
    receipt: async () => JSON.parse(await readFile(join(c.home, '.local/state/cab-approval-bridge-update/current.json'), 'utf8')) };
}

test('déploiement complet puis deuxième invocation conforme sans nouvelle coupure', async (t) => {
  const h = await fixture(t, { realSyntax: true }); h.state.sharedMcpDirectory = '/shared-native';
  const before = await readFile(h.runtime, 'utf8');
  const result = await updateComponents(h.c, h.options);
  assert.equal(result.status, 'completed'); assert.equal(result.version, CURRENT_VERSION);
  assert.equal(await readFile(join(h.scripts, 'cab_sgs.py'), 'utf8'),
    await readFile(join(h.c.pluginRoot, 'scripts/cab_sgs.py'), 'utf8'));
  for (const name of ['cab_session_dependencies.py', 'cgpt-approval-bridge-dependencies.py',
    'cgpt-approval-bridge-dependency-gate.mjs','cgpt-approval-bridge-dependency-gate.py']) {
    assert.equal(await readFile(join(h.scripts, name), 'utf8'),
      await readFile(join(h.c.pluginRoot, 'scripts', name), 'utf8'));
  }
  const sgsVersion = await new Promise((resolve, reject) => {
    const child = spawn('python3', ['-B', join(h.scripts, 'cgpt-approval-bridge-sgs.py'), 'VERSION']);
    let output = '', errors = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { errors += chunk; });
    child.once('error', reject);
    child.once('close', code => code === 0 ? resolve(JSON.parse(output)) : reject(new Error(errors)));
  });
  assert.deepEqual(sgsVersion, { version: CURRENT_VERSION, engine_format: 'cab-sgs-1' });
  assert.deepEqual(h.state.versions, { controller: CURRENT_VERSION, supervisor: CURRENT_VERSION, monitor: CURRENT_VERSION });
  assert.equal(h.state.brokerVersion, CURRENT_VERSION); assert.equal(h.state.global, null);
  assert.equal(await readFile(h.runtime, 'utf8'), before); assert.equal(await readFile(h.catalog, 'utf8'), 'ARCHIVE-SENTINEL');
  assert.equal(h.state.run.suspension.action, 'PAUSE');
  const brokerActions = h.state.events.filter((event) => ['/api/experimental/mcp/cgpt-validation/disconnect','/api/experimental/mcp/cgpt-validation/connect'].includes(event[1]));
  assert.deepEqual(brokerActions.map((event) => event[1]), ['/api/experimental/mcp/cgpt-validation/disconnect','/api/experimental/mcp/cgpt-validation/connect']);
  assert.ok(brokerActions.every((event) => event[2] === h.state.sharedMcpDirectory));
  const stopped = h.state.events.filter((event) => event[1] === 'stop').length;
  assert.equal(stopped, 3);
  const second = await updateComponents(h.c, h.options);
  assert.equal(second.status, 'up-to-date');
  assert.equal(second.timings.unavailableMs, 0);
  assert.deepEqual(second.restartedComponents, []);
  assert.equal(h.state.events.filter((event) => event[1] === 'stop').length, stopped);
  assert.ok(!JSON.stringify(h.state.events).includes('instance/dispose'));
});

test('services initialement inactifs : les trois unités sont démarrées après mise à jour vérifiée', async (t) => {
  const h = await fixture(t, { active: ['monitor'], broker: false });
  const result = await updateComponents(h.c, h.options);
  assert.equal(result.status, 'completed');
  assert.deepEqual(h.state.services, { controller: true, supervisor: true, monitor: true });
  assert.equal(version(await readFile(h.entry('controller'), 'utf8')), CURRENT_VERSION);
  for (const component of ['controller','supervisor','monitor']) {
    assert.ok(h.state.events.some((event) => event[1] === 'start' && event[2] === `cgpt-approval-bridge-${component}.service`));
  }
  assert.ok(!JSON.stringify(h.state.events).includes('enable'));
});

test('jeu conforme : seule une unité inactive est démarrée, les composants actifs sont préservés', async (t) => {
  const h = await fixture(t, { active: ['supervisor','monitor'], runSuspension: null });
  const copies = [
    [join(h.c.pluginRoot,'scripts'),join(h.c.home,'.local/share/cab-approval-bridge')],
    [join(h.c.pluginRoot,'scripts'),join(h.c.home,'.local/share/cab-approval-bridge-monitor/scripts')],
    [join(h.c.pluginRoot,'web-monitor'),join(h.c.home,'.local/share/cab-approval-bridge-monitor/web-monitor')],
    [join(h.c.pluginRoot,'systemd'),join(h.c.home,'.config/systemd/user')],
    [join(h.c.pluginRoot,'broker'),h.c.brokerDirectory],
  ];
  for (const [source,target] of copies) await cp(source,target,{recursive:true,force:true});
  h.state.versions={controller:CURRENT_VERSION,supervisor:CURRENT_VERSION,monitor:CURRENT_VERSION};
  h.state.brokerVersion=CURRENT_VERSION;
  const result=await updateComponents(h.c,h.options);
  assert.equal(result.status,'completed');
  assert.deepEqual(h.state.services,{controller:true,supervisor:true,monitor:true});
  assert.equal(h.state.run.suspension,undefined);
  assert.ok(!h.state.events.some((event)=>event[1]==='/coordination/global/request'));
  assert.equal(h.state.events.filter((event)=>event[1]==='stop').length,0);
  assert.deepEqual(h.state.events.filter(event=>event[0]==='systemd'&&event[1]==='start').map(event=>event[2]),
    ['cgpt-approval-bridge-controller.service']);
  assert.equal(h.state.events.filter(event=>event[1]?.endsWith('/connect')).length, 1,
    'le contrôleur arrêté ne pouvait pas prouver la version chargée du broker');
});

test('bascule ciblée : un changement Web préserve contrôleur, superviseur et raccord MCP', async t => {
  const h = await fixture(t);
  await updateComponents(h.c, h.options);
  await writeFile(join(h.c.pluginRoot, 'web-monitor/style.css'), (await readFile(join(h.c.pluginRoot, 'web-monitor/style.css'), 'utf8')) + '\n/* isolated presentation change */\n');
  const offset = h.state.events.length, before = await readFile(h.runtime, 'utf8');
  const result = await updateComponents(h.c, h.options), events = h.state.events.slice(offset);
  assert.equal(result.status, 'completed'); assert.deepEqual(result.restartedComponents, ['monitor']);
  assert.deepEqual(events.filter(event => event[1] === 'stop').map(event => event[2]), ['cgpt-approval-bridge-monitor.service']);
  assert.deepEqual(events.filter(event => event[1] === 'start').map(event => event[2]), ['cgpt-approval-bridge-monitor.service']);
  assert.ok(!events.some(event => event[1]?.endsWith('/connect') || event[1]?.endsWith('/disconnect')));
  assert.equal(result.timings.unavailableMs, 0); assert.equal(await readFile(h.runtime, 'utf8'), before);
});

test('artefact hors fermeture active : installation sans arrêt ni reconnexion', async t => {
  const h = await fixture(t); await updateComponents(h.c, h.options);
  const path = join(h.c.pluginRoot, 'scripts/cgpt-approval-bridge-update.mjs');
  await writeFile(path, (await readFile(path, 'utf8')) + '\n// Isolated updater preparation change.\n');
  const offset = h.state.events.length;
  const result = await updateComponents(h.c, h.options), events = h.state.events.slice(offset);
  assert.equal(result.status, 'completed'); assert.deepEqual(result.restartedComponents, []);
  assert.ok(!events.some(event => ['stop', 'start'].includes(event[1])));
  assert.ok(!events.some(event => event[1]?.endsWith('/connect') || event[1]?.endsWith('/disconnect')));
  assert.equal(result.timings.unavailableMs, 0);
});

async function prepareCompatibleUpdate(h) {
  await updateComponents(h.c, h.options);
  h.state.handoffSupported = true;
  const path = join(h.c.pluginRoot, 'scripts/cgpt-approval-bridge-controller.mjs');
  await writeFile(path, (await readFile(path, 'utf8')) + '\n// Isolated compatible controller change.\n');
}

test('CABU compatible : transfert certifié et seule la brique concernée redémarre', async t => {
  const h = await fixture(t); await prepareCompatibleUpdate(h);
  const before = await readFile(h.runtime, 'utf8'), offset = h.state.events.length;
  const result = await updateComponents(h.c, h.options), events = h.state.events.slice(offset);
  assert.equal(result.status, 'completed'); assert.equal(result.transportContinuity.state, 'ADOPTED');
  assert.deepEqual(result.restartedComponents, ['controller']);
  assert.deepEqual(events.filter(event => event[1] === 'stop').map(event => event[2]), ['cgpt-approval-bridge-controller.service']);
  assert.equal(events.filter(event => event[1] === '/transport/prepare').length, 1);
  assert.ok(!events.some(event => event[1]?.endsWith('/connect') || event[1]?.endsWith('/disconnect')));
  assert.equal(await readFile(h.runtime, 'utf8'), before);
});

test('CABU compatible occupé : préparation conservée, services intacts et reprise du même reçu', async t => {
  const h = await fixture(t); await prepareCompatibleUpdate(h); h.state.handoffBusy = true;
  const offset = h.state.events.length, before = await readFile(h.entry('controller'), 'utf8');
  const waiting = await updateComponents(h.c, h.options);
  assert.equal(waiting.status, 'waiting'); assert.equal(waiting.reason, 'update-handoff-busy');
  assert.ok(!h.state.events.slice(offset).some(event => ['stop', 'start'].includes(event[1])));
  assert.equal(await readFile(h.entry('controller'), 'utf8'), before);
  h.state.handoffBusy = false;
  const result = await updateComponents(h.c, h.options);
  assert.equal(result.status, 'completed'); assert.equal(result.transactionId, waiting.transactionId);
  assert.equal(result.transportContinuity.state, 'ADOPTED');
});

test('CABU réponse de préparation perdue : observation du reçu sans second POST', async t => {
  const h = await fixture(t); await prepareCompatibleUpdate(h); h.state.handoffResponseLost = true;
  const offset = h.state.events.length, waiting = await updateComponents(h.c, h.options);
  assert.equal(waiting.status, 'waiting'); assert.equal(h.state.handoff.state, 'PREPARED');
  const result = await updateComponents(h.c, h.options);
  assert.equal(result.status, 'completed'); assert.equal(result.transactionId, waiting.transactionId);
  assert.equal(h.state.events.slice(offset).filter(event => event[1] === '/transport/prepare').length, 1);
});

test('CABU abandon avant coupure : annule la seule barrière de transport sans redémarrage', async t => {
  const h = await fixture(t); await prepareCompatibleUpdate(h); h.state.handoffResponseLost = true;
  const waiting = await updateComponents(h.c, h.options), offset = h.state.events.length;
  const result = await updateComponents(h.c, { ...h.options, rollbackOnly: true });
  assert.equal(result.status, 'rolled-back'); assert.equal(result.transactionId, waiting.transactionId);
  assert.equal(h.state.handoff.state, 'CANCELLED');
  assert.ok(!h.state.events.slice(offset).some(event => ['stop', 'start'].includes(event[1])));
});

test('layout managed-release conserve le répertoire broker source en fichiers ordinaires', async (t) => {
  const h=await fixture(t);
  await chmod(h.scripts,0o755);
  await chmod(join(h.c.home,'.local/share/cab-approval-bridge-monitor'),0o755);
  const result=await updateComponents({...h.c,layout:'managed-release'},h.options);
  assert.equal(result.status,'completed');
  assert.equal((await lstat(h.entry('controller'))).isSymbolicLink(),true);
  const brokerEntry=join(h.c.brokerDirectory,'cgpt_approval_bridge_server.py');
  assert.equal((await lstat(brokerEntry)).isSymbolicLink(),false);
  assert.equal(version(await readFile(brokerEntry,'utf8')),CURRENT_VERSION);
  assert.deepEqual(h.state.services,{controller:true,supervisor:true,monitor:true});
});

test('mise à jour forcée : les états RUN et coordination ne sont pas des préconditions', async (t) => {
  const h = await fixture(t, { runSuspension: null, global: {
    transactionId: 'foreign-maintenance', cause: 'GLOBAL_RECONCILIATION', scope: 'all', generation: 77, state: 'DRAINING' } });
  h.state.busy = true;
  const result = await updateComponents(h.c, h.options);
  assert.equal(result.status, 'completed');
  assert.equal(h.state.run.suspension, undefined);
  assert.equal(h.state.global.state, 'DRAINING');
  assert.equal(h.state.global.transactionId, 'foreign-maintenance');
  assert.ok(!h.state.events.some((event) => ['/runs','/runs/a/suspend','/coordination/global','/coordination/global/request','/coordination/global/confirm'].includes(event[1])));
  assert.deepEqual(h.state.services, { controller: true, supervisor: true, monitor: true });
});

test('OpenCode absent avec RUN réservé : les fichiers broker sont mis à jour et le runtime reste indisponible', async (t) => {
  const h=await fixture(t,{openCodeOffline:true,runSuspension:null});
  h.options.processProbe=async()=>({openCode:false,broker:false});
  const result=await updateComponents(h.c,h.options);
  assert.equal(result.status,'completed');
  assert.equal(result.brokerArtifactVersion,CURRENT_VERSION);
  assert.equal(result.brokerRuntimeVersion,null);
  assert.equal(result.brokerRuntimeStatus,'INDISPONIBLE');
  assert.equal(version(await readFile(join(h.c.brokerDirectory,'cgpt_approval_bridge_server.py'),'utf8')),CURRENT_VERSION);
  assert.equal(h.state.run.suspension,undefined);
  assert.deepEqual(h.state.services,{controller:true,supervisor:true,monitor:true});
  assert.ok(!h.state.events.some((event)=>['/api/experimental/mcp/cgpt-validation/disconnect','/api/experimental/mcp/cgpt-validation/connect','/coordination/global/request'].includes(event[1])));
});

test('coordination globale étrangère conservée pendant le redémarrage forcé', async (t) => {
  const h = await fixture(t, { active: [], broker: false, runSuspension: null, global: {
    transactionId: 'integrity-reconciliation', cause: 'GLOBAL_RECONCILIATION', scope: 'all', generation: 77, state: 'DRAINING' } });
  assert.equal((await updateComponents(h.c, h.options)).status,'completed');
  assert.equal(h.state.global.transactionId, 'integrity-reconciliation');
  assert.equal(h.state.run.suspension, undefined);
  assert.deepEqual(h.state.services, { controller: true, supervisor: true, monitor: true });
  assert.ok(!h.state.events.some((event) => event[1] === '/coordination/global/request'));
});

test('OpenCode absent : mise à jour possible sans RUN réservé ni broker à reconnecter', async (t) => {
  const h=await fixture(t,{broker:false,openCodeOffline:true,runSuspension:null});
  h.state.run.state='DELIVERED';
  h.options.processProbe=async()=>({openCode:false,broker:false});
  const result=await updateComponents(h.c,h.options);
  assert.equal(result.status,'completed');
  assert.equal(result.brokerConnected,false);
  assert.deepEqual(h.state.services,{controller:true,supervisor:true,monitor:true});
  assert.ok(!h.state.events.some((event)=>['/api/experimental/mcp/cgpt-validation/disconnect','/api/experimental/mcp/cgpt-validation/connect'].includes(event[1])));
});

test('présence OpenCode incertaine interdit le succès avant la coupure', async (t) => {
  const h = await fixture(t, { openCodeOffline: true });
  h.options.processProbe = async () => ({ openCode: false, broker: false, unknown: true });
  await assert.rejects(updateComponents(h.c, h.options), /update-opencode-active-unavailable/);
  assert.ok(!h.state.events.some(event => event[1] === 'stop'));
});

test('activité CAB non consultée : la mise à jour termine sans attendre de quiescence', async (t) => {
  const h = await fixture(t); h.state.busy = true;
  const result = await updateComponents(h.c, h.options);
  assert.equal(result.status, 'completed');
  assert.equal(h.state.global, null);
  assert.deepEqual(h.state.services,{controller:true,supervisor:true,monitor:true});
  assert.equal(version(await readFile(h.entry('controller'), 'utf8')), CURRENT_VERSION);
  assert.equal(h.state.events.filter((event) => event[1] === 'stop').length,3);
});

test('paquet incomplet, import absent, downgrade et syntaxe invalide échouent avant arrêt', async (t) => {
  for (const fault of ['broker', 'import', 'downgrade', 'syntax']) {
    const h = await fixture(t);
    if (fault === 'broker') await rm(join(h.c.pluginRoot, 'broker/cgpt_approval_bridge_router.py'));
    if (fault === 'import') await rm(join(h.c.pluginRoot, 'scripts/cgpt-approval-bridge-job-context.mjs'));
    if (fault === 'downgrade') await writeFile(join(h.c.pluginRoot, 'scripts/cgpt-approval-bridge-controller.mjs'), 'const version = "1.10.11";\n');
    if (fault === 'syntax') h.options.syntax = async () => { throw new Error('synthetic-syntax'); };
    await assert.rejects(updateComponents(h.c, h.options), undefined, fault);
    assert.ok(!h.state.events.some((event) => event[1] === 'stop'), fault);
    assert.equal(h.state.global, null);
  }
});

test('échec de démarrage déclenche le retour aux artefacts précédents et redémarre les trois unités', async (t) => {
  const h = await fixture(t); const before = await readFile(h.entry('controller'));
  h.state.failStart = 'supervisor';
  await assert.rejects(updateComponents(h.c, h.options), /update-failed-rolled-back/);
  assert.deepEqual(await readFile(h.entry('controller')), before);
  assert.deepEqual(h.state.versions, { controller: '1.7.0', supervisor: '1.7.0', monitor: '1.7.0' });
  assert.equal((await h.receipt()).phase, 'ROLLED_BACK');
  assert.deepEqual(h.state.services,{controller:true,supervisor:true,monitor:true});
});

test('broker actif de mauvaise version interdit le succès et restaure les artefacts', async (t) => {
  const h = await fixture(t); h.state.wrongBroker = true;
  await assert.rejects(updateComponents(h.c, h.options), /update-failed-rolled-back/);
  assert.equal((await h.receipt()).phase, 'ROLLED_BACK');
  assert.equal(h.state.versions.controller, '1.7.0');
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

test('interruption au bilan final : reprise idempotente sans nouveau redémarrage', async (t) => {
  const h = await fixture(t);
  h.options.onPhase = async (phase) => {
    if (phase === 'RELEASING') throw Object.assign(new Error('crash'), { code: 'SIMULATED_CRASH' });
  };
  await assert.rejects(updateComponents(h.c, h.options), /crash/);
  const stops = h.state.events.filter((event) => event[1] === 'stop').length;
  delete h.options.onPhase;
  assert.equal((await updateComponents(h.c, h.options)).status, 'up-to-date');
  assert.equal(h.state.events.filter((event) => event[1] === 'stop').length, stops);
});

test('dépôt CAB : exception explicite src, manifeste et projet vérifiés', async (t) => {
  const h = await fixture(t, { openCodeOffline: true });
  h.c.brokerDirectory = join(h.c.workspace, 'src');
  await cp(join(h.c.pluginRoot, 'broker'), h.c.brokerDirectory, { recursive: true });
  await mkdir(join(h.c.workspace, 'plugins/cab-approval-bridge/.codex-plugin'), { recursive: true });
  const manifest = join(h.c.workspace, 'plugins/cab-approval-bridge/.codex-plugin/plugin.json');
  await cp(join(h.c.pluginRoot, '.codex-plugin/plugin.json'), manifest);
  await writeFile(join(h.c.workspace, 'pyproject.toml'), '[project]\nname = "cab"\n');
  await assert.rejects(updateComponents(h.c, h.options), /project-destination/);
  const c = { ...h.c, brokerPolicy: 'cab-source', serviceWorkspace: join(h.root, 'service-project') };
  const http = h.options.http;
  h.options.http = async (...args) => {
    const value = await http(...args);
    if (value?.version) {
      if (value.identity) value.identity.workspace = c.serviceWorkspace;
      else value.workspace = c.serviceWorkspace;
    }
    return value;
  };
  await writeFile(manifest, '{"name":"other"}');
  await assert.rejects(updateComponents(c, h.options), /cab-source-invalid/);
  await cp(join(h.c.pluginRoot, '.codex-plugin/plugin.json'), manifest);
  await writeFile(join(h.c.workspace, 'pyproject.toml'), '[project]\nname = "other"\n');
  await assert.rejects(updateComponents(c, h.options), /cab-source-invalid/);
  await writeFile(join(h.c.workspace, 'pyproject.toml'), '[project]\nname = "cab"\n');
  await assert.rejects(updateComponents({ ...c, brokerDirectory: join(c.workspace, 'another') }, h.options), /project-destination/);
  assert.ok(!h.state.events.some((event) => event[0] === 'systemd'));
  const result = await updateComponents(c, h.options);
  assert.equal(result.status, 'completed');
  assert.equal(result.brokerArtifactVersion, CURRENT_VERSION);
  assert.equal(version(await readFile(join(c.home, '.local/share/cab-approval-bridge-monitor/scripts/cgpt-approval-bridge-opencode-client.mjs'), 'utf8')), CURRENT_VERSION);
  assert.equal(await readFile(h.runtime, 'utf8'), '{"consumedOnce":["once-1"],"run":"a","gate":"OPEN"}\n');
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

test("un reçu déjà terminé d'une ancienne version ne bloque pas une nouvelle invocation CABU", async (t) => {
  const h=await fixture(t);
  const current=join(h.c.home,'.local/state/cab-approval-bridge-update/current.json');
  await mkdir(join(h.c.home,'.local/state/cab-approval-bridge-update'),{recursive:true,mode:0o700});
  await writeFile(current,JSON.stringify({schema:1,phase:'COMPLETED',version:'1.10.8',managed:{stale:true}}));
  const result=await updateComponents(h.c,h.options);
  assert.equal(result.status,'completed');
  assert.equal(result.version,CURRENT_VERSION);
  assert.deepEqual(h.state.services,{controller:true,supervisor:true,monitor:true});
  assert.equal(h.state.events.filter((event)=>event[1]==='stop').length,3);
});

test('une évolution du RUN pendant la mise à jour ne devient pas une précondition CABU', async (t) => {
  const h = await fixture(t);
  h.options.onPhase = async (phase) => { if (phase === 'VERIFYING') h.state.run.version++; };
  assert.equal((await updateComponents(h.c, h.options)).status,'completed');
  assert.equal(h.state.global,null);
  assert.equal(h.state.run.version, 6);
});

test('interruption après staging : reprise et redémarrage sans maintenance globale', async (t) => {
  const h = await fixture(t);
  h.options.onPhase = async (phase) => { if (phase === 'PREPARED') throw Object.assign(new Error('crash'), { code: 'SIMULATED_CRASH' }); };
  await assert.rejects(updateComponents(h.c, h.options), /crash/);
  assert.equal(h.state.global, null);
  delete h.options.onPhase;
  const result = await updateComponents(h.c, h.options);
  assert.equal(result.status, 'completed');
  assert.deepEqual(h.state.services,{controller:true,supervisor:true,monitor:true});
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

test('une modification externe pendant le staging bloque avant arrêt et reste conservée', async (t) => {
  const h = await fixture(t);
  h.options.onPhase = async (phase) => {
    if (phase === 'PREPARED') await writeFile(h.entry('controller'), 'const version = "1.7.0";\n// external edit\n');
  };
  await assert.rejects(updateComponents(h.c, h.options), /update-installed-artifact-changed/);
  assert.match(await readFile(h.entry('controller'), 'utf8'), /external edit/);
  assert.ok(!h.state.events.some((event) => event[1] === 'stop'));
  assert.equal(h.state.global,null);
});

test('stage altéré après validation refusé avant tout arrêt', async (t) => {
  const h = await fixture(t);
  h.options.onPhase = async (phase, receipt) => {
    if (phase === 'PREPARED') await writeFile(join(h.c.home, '.local/state/cab-approval-bridge-update', receipt.id, 'stage/0'), 'modified stage');
  };
  await assert.rejects(updateComponents(h.c, h.options), /update-stage-changed/);
  assert.ok(!h.state.events.some((event) => event[1] === 'stop'));
  assert.equal(h.state.global,null);
});

test('reprise après arrêt interrompu : la procédure forcée restaure puis redéploie', async (t) => {
  const h = await fixture(t);
  h.options.onPhase = async (phase) => { if (phase === 'INSTALLING') throw Object.assign(new Error('crash'), { code: 'SIMULATED_CRASH' }); };
  await assert.rejects(updateComponents(h.c, h.options), /crash/); delete h.options.onPhase;
  const result=await updateComponents(h.c,h.options);
  assert.equal(result.status,'completed');
  assert.deepEqual(h.state.services,{controller:true,supervisor:true,monitor:true});
  assert.equal(version(await readFile(h.entry('controller'),'utf8')),CURRENT_VERSION);
});


test('broker 1.9.0 chargé vers artefacts 2.3.10 : admission fermée sans mutation',async(t)=>{
  const h=await artifactFixture(t);h.proof.loadedVersion='1.9.0';
  assert.equal(validateBrokerProof(h.proof,h.directory),h.proof);
  const before=await inspectBrokerArtifacts(h.directory,h.proof);
  assert.equal(before.version,CURRENT_VERSION);assert.equal(h.proof.loadedVersion,'1.9.0');
  for(const loadedVersion of ['1.7.1','1.8.0','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.10.5','1.10.6','1.10.7','1.10.8','1.10.9','1.10.10','2.1.0','2.1.1','2.1.5','2.1.32','2.1.33','2.1.34'])assert.equal(validateBrokerProof({...h.proof,loadedVersion},h.directory).loadedVersion,loadedVersion);
  for(const loadedVersion of ['1.9.1','1.9.0+codex.20261025101020','1.10.12','2.1.32+codex.20261028011316',null])assert.throws(()=>validateBrokerProof({...h.proof,loadedVersion},h.directory),/proof-invalid/);
  assert.throws(()=>validateBrokerProof({...h.proof,expectedUid:h.proof.expectedUid+1},h.directory),/proof-invalid/);
  assert.deepEqual(await inspectBrokerArtifacts(h.directory,h.proof),before);
});


async function networkFixture(t, { registryPadding = 0, statusPadding = 0, statusBytes = 0, monitorPadding = 0 } = {}) {
  const h=await fixture(t);const bases={controller:'http://127.0.0.1:8788',supervisor:'http://127.0.0.1:8789',monitor:'http://127.0.0.1:8790',opencode:'http://127.0.0.1:4096'};
  const c={...h.c};const servers=[];let registrySize=0,statusSize=0;
  for(const name of Object.keys(bases)){
    const server=createServer(async(req,res)=>{
      try {
        let text='';for await(const part of req)text+=part;
        const route=new URL(req.url,'http://localhost').pathname;
        const value=await h.options.http(bases[name],req.url,text?JSON.parse(text):undefined);
        if(name==='controller'&&route==='/runs'&&registryPadding)value.transportFixtureHistory='x'.repeat(registryPadding);
        if(name==='controller'&&route==='/status'&&statusPadding)value.transportFixtureHistory='x'.repeat(statusPadding);
        if(name==='controller'&&route==='/status'&&statusBytes){value.transportFixtureHistory='';value.transportFixtureHistory='x'.repeat(statusBytes-Buffer.byteLength(JSON.stringify(value)));}
        if(name==='monitor'&&route==='/api/snapshot'&&monitorPadding)value.transportFixtureHistory='x'.repeat(monitorPadding);
        const data=JSON.stringify(value);if(name==='controller'&&route==='/runs')registrySize=Buffer.byteLength(data);if(name==='controller'&&route==='/status')statusSize=Buffer.byteLength(data);
        res.writeHead(200,{'content-type':'application/json'});res.end(data);
      } catch {res.writeHead(503,{'content-type':'application/json'}).end('{"error":"fixture unavailable"}');}
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));servers.push(server);c[name+'Url']='http://127.0.0.1:'+server.address().port;
  }
  t.after(async()=>{for(const server of servers){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}});
  const {http,...options}=h.options;
  return {...h,c,options,registrySize:()=>registrySize,statusSize:()=>statusSize};
}

test('registre HTTP volumineux ignoré par le processus de mise à jour',async(t)=>{
  const h=await networkFixture(t,{registryPadding:3*1024*1024});const initial=await readFile(h.runtime);
  const result=await updateComponents(h.c,h.options);
  assert.equal(result.status,'completed');assert.equal(h.registrySize(),0);
  assert.ok(!h.state.events.some((event)=>event[1]==='/runs'));
  assert.deepEqual(await readFile(h.runtime),initial);assert.equal(h.state.run.suspension.action,'PAUSE');
});

test('registre HTTP supérieur à 16 Mio non lu avant mise à jour',async(t)=>{
  const h=await networkFixture(t,{registryPadding:16*1024*1024+1});
  const result=await updateComponents(h.c,h.options);
  assert.equal(result.status,'completed');
  assert.ok(!h.state.events.some(e=>e[1]==='/runs'));
  assert.equal(h.state.global,null);assert.equal(h.state.broker,true);
});

test('statut contrôleur supérieur2Mio lu intégralement sous la borne16Mio',async t=>{
  const h=await networkFixture(t,{statusPadding:3*1024*1024});const runtime=await readFile(h.runtime);
  const result=await updateComponents(h.c,h.options);assert.equal(result.status,'completed');
  assert.ok(h.statusSize()>2*1024*1024&&h.statusSize()<16*1024*1024);
  assert.deepEqual(await readFile(h.runtime),runtime);assert.equal(h.state.global,null);
});

test('statut contrôleur à exactement16Mio accepté sans augmentation globale',async t=>{
  const h=await networkFixture(t,{statusBytes:16*1024*1024});
  assert.equal((await updateComponents(h.c,h.options)).status,'completed');assert.equal(h.statusSize(),16*1024*1024);
});

test('statut contrôleur au-delà16Mio : erreur explicite et rollback non terminal conservé',async t=>{
  const h=await networkFixture(t,{statusPadding:16*1024*1024+1});
  await assert.rejects(updateComponents(h.c,h.options),error=>error.code==='update-recovery-required'&&error.failureCode==='update-response-too-large');
  assert.equal(h.state.broker,false);assert.equal((await h.receipt()).phase,'ROLLBACK_FAILED');
  assert.deepEqual(h.state.versions,{controller:'1.7.0',supervisor:'1.7.0',monitor:'1.7.0'});
});

test('identité minimale : CABU ne dépend pas de la taille du snapshot moniteur',async t=>{
  const h=await networkFixture(t,{monitorPadding:2*1024*1024+1});
  assert.equal((await updateComponents(h.c,h.options)).status,'completed');
  assert.equal((await h.receipt()).phase,'COMPLETED');
});


test('CABU chronométré : coupure courte, cache exact et redémarrage à chaud', async (t) => {
  const h = await fixture(t, { realSyntax: true });
  h.options.now = () => { h.state.now = Date.now(); return h.state.now; };
  h.options.sleep = ms => new Promise(resolve => setTimeout(resolve, Math.min(ms, 10)));
  const cold = await updateComponents(h.c, h.options);
  const warm = await updateComponents(h.c, h.options);
  for (const result of [cold, warm]) {
    assert.equal(result.status, result===warm ? 'up-to-date' : 'completed');
    assert.ok(result.timings.unavailableMs < 5000, JSON.stringify(result.timings));
    assert.ok(result.timings.totalMs >= result.timings.unavailableMs);
  }
  const cache = JSON.parse(await readFile(join(h.c.home, '.local/state/cab-approval-bridge-update/syntax-cache.json'), 'utf8'));
  assert.ok(Object.keys(cache).length > 10);
  assert.ok(!h.state.events.some(event => event[1].includes('/suspend') || event[1].includes('/coordination/')));
  t.diagnostic(JSON.stringify({ cold: cold.timings, warm: warm.timings }));
});

test('OpenCode actif avec broker initialement failed est rechargé et vérifié', async (t) => {
  const h = await fixture(t);
  const mcp = h.options.openCodeClient.mcp;
  let first = true;
  h.options.openCodeClient.mcp = async directory => {
    if (first) { first = false; return { 'cgpt-validation': { status: 'failed' } }; }
    return mcp(directory);
  };
  const result = await updateComponents(h.c, h.options);
  assert.equal(result.status, 'completed'); assert.equal(result.brokerRuntimeVersion, CURRENT_VERSION);
  assert.ok(h.state.events.some(event => event[1].endsWith('/disconnect')));
});


test('credential manquant : refus avant toute coupure et avant sauvegarde des artefacts', async t => {
  const h=await fixture(t);
  await unlink(join(h.c.home,'.config/cab-approval-bridge/opencode.password'));
  await assert.rejects(updateComponents(h.c,h.options), /update-credential-missing/);
  assert.ok(!h.state.events.some(e=>e[0]==='systemd'));
  const receipt=await h.receipt();
  assert.equal(receipt.phase,'PREPARATION_FAILED');
  assert.equal(receipt.failureCode,'update-credential-missing');
  assert.equal(receipt.files.length,0);
});

test('cab-source mixte : services par liens gérés, broker ordinaire et anciennes releases conservées', async t => {
  const h=await fixture(t);
  await mkdir(join(h.c.workspace,'plugins'),{recursive:true});
  await cp(h.c.pluginRoot,join(h.c.workspace,'plugins/cab-approval-bridge'),{recursive:true});
  await writeFile(join(h.c.workspace,'pyproject.toml'),'[project]\nname = "cab"\n');
  const broker=join(h.c.workspace,'src'); await cp(h.c.brokerDirectory,broker,{recursive:true});
  h.c.brokerDirectory=broker; h.c.brokerPolicy='cab-source'; h.c.layout='managed-release';
  await chmod(h.scripts,0o755);await chmod(join(h.c.home,'.local/share/cab-approval-bridge-monitor'),0o755);
  const entry=h.entry('controller'); const old=await readFile(entry);
  const release=join(h.scripts,'releases/old/scripts');await mkdir(release,{recursive:true});
  await writeFile(join(release,'cgpt-approval-bridge-controller.mjs'),old);
  await unlink(entry);await symlink('releases/old/scripts/cgpt-approval-bridge-controller.mjs',entry);
  const result=await updateComponents(h.c,h.options);
  assert.equal(result.status,'completed');
  assert.equal((await lstat(entry)).isSymbolicLink(),true);
  assert.deepEqual(await readFile(join(release,'cgpt-approval-bridge-controller.mjs')),old);
  for(const name of BROKER_ARTIFACT_FILES) {const info=await lstat(join(broker,name));assert.equal(info.isSymbolicLink(),false);assert.equal(info.mode&0o777,0o775);}
  const receipt=await h.receipt();assert.equal(receipt.managed.broker,undefined);
  // Reprise inchangée : les liens existants restent admissibles.
  assert.equal((await updateComponents(h.c,h.options)).status,'up-to-date');
});

test('cab-source mixte : le repli restitue les liens et fichiers originaux', async t => {
  const h=await fixture(t);
  await mkdir(join(h.c.workspace,'plugins'),{recursive:true});
  await cp(h.c.pluginRoot,join(h.c.workspace,'plugins/cab-approval-bridge'),{recursive:true});
  await writeFile(join(h.c.workspace,'pyproject.toml'),'[project]\nname = "cab"\n');
  const broker=join(h.c.workspace,'src');await cp(h.c.brokerDirectory,broker,{recursive:true});
  h.c.brokerDirectory=broker;h.c.brokerPolicy='cab-source';h.c.layout='managed-release';
  await chmod(h.scripts,0o755);await chmod(join(h.c.home,'.local/share/cab-approval-bridge-monitor'),0o755);
  const brokerBefore=await readFile(join(broker,BROKER_ARTIFACT_FILES[0]));
  h.state.failStart='supervisor';
  await assert.rejects(updateComponents(h.c,h.options),/update-failed-rolled-back/);
  assert.equal((await lstat(h.entry('controller'))).isSymbolicLink(),false);
  assert.deepEqual(await readFile(join(broker,BROKER_ARTIFACT_FILES[0])),brokerBefore);
  assert.equal((await h.receipt()).phase,'ROLLED_BACK');
});

test('échec 243 : cause filtrée par service conservée après repli et attachée au diagnostic CLI', async t => {
  const h=await fixture(t);const original=h.options.serviceCommand;
  let failure=false;
  h.options.serviceCommand=async args=>{
    if(args[0]==='start'&&!failure){failure=true;throw Object.assign(new Error('private-output-must-not-leak'),{code:'EIO'});}
    if(args[0]==='show'&&args.includes('--property=ActiveState,SubState,Result,ExecMainStatus'))
      return 'ActiveState=activating\nSubState=auto-restart\nResult=exit-code\nExecMainStatus=243\nUntrusted=private-output-must-not-leak\n';
    return original(args);
  };
  await assert.rejects(updateComponents(h.c,h.options),error=>{
    assert.equal(error.code,'update-failed-rolled-back');
    assert.equal(error.failureCode,'EIO');assert.equal(error.recoveryPhase,'ROLLED_BACK');
    assert.equal(error.serviceFailures.length,3);
    assert.ok(error.serviceFailures.every(e=>e.ExecMainStatus===243));return true;
  });
  const receipt=await h.receipt();
  assert.equal(receipt.phase,'ROLLED_BACK');assert.equal(receipt.serviceFailures.length,3);
  assert.ok(!JSON.stringify(receipt).includes('private-output-must-not-leak'));
});

test('cab-source mixte : un lien broker reste refusé avant arrêt', async t => {
  const h=await fixture(t);
  await mkdir(join(h.c.workspace,'plugins'),{recursive:true});
  await cp(h.c.pluginRoot,join(h.c.workspace,'plugins/cab-approval-bridge'),{recursive:true});
  await writeFile(join(h.c.workspace,'pyproject.toml'),'[project]\nname = "cab"\n');
  const broker=join(h.c.workspace,'src');await cp(h.c.brokerDirectory,broker,{recursive:true});
  const entry=join(broker,BROKER_ARTIFACT_FILES[0]);await unlink(entry);
  await symlink(join(h.c.brokerDirectory,BROKER_ARTIFACT_FILES[0]),entry);
  await assert.rejects(updateComponents({...h.c,brokerDirectory:broker,brokerPolicy:'cab-source',layout:'managed-release'},h.options));
  assert.ok(!h.state.events.some(e=>e[0]==='systemd'));
});

test('CLI réel : credential manquant donne un diagnostic JSON sans contenu privé',async t=>{
  const h=await fixture(t);await unlink(join(h.c.home,'.config/cab-approval-bridge/opencode.password'));
  const script=join(h.c.pluginRoot,'scripts/cgpt-approval-bridge-update.mjs');
  const child=spawn(process.execPath,[script,'--plugin-root',h.c.pluginRoot,'--workspace',h.c.workspace,
    '--broker-directory',h.c.brokerDirectory,'--home',h.c.home],{stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
  const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
  assert.equal(code,1);const result=JSON.parse(stderr);
  assert.equal(result.error,'update-credential-missing');assert.equal(result.recoveryPhase,'PREPARATION_FAILED');
  assert.equal(result.failureCode,'update-credential-missing');assert.deepEqual(result.serviceFailures,[]);
  assert.ok(!stdout.includes('synthetic-test-password'));assert.ok(!stderr.includes('synthetic-test-password'));
});


test('démarrage CABU : contrôleur prêt après15s dans le budget configuré, sans succès prématuré',async t=>{
  const h=await fixture(t);h.c.waitMs=20000;h.state.controllerDelayMs=15000;const initial=h.state.now;
  const result=await updateComponents(h.c,h.options);
  assert.equal(result.status,'completed');assert.ok(h.state.now-initial>=15000);
  assert.equal(h.state.brokerVersion,CURRENT_VERSION);assert.equal((await h.receipt()).phase,'COMPLETED');
  assert.equal(await readFile(h.runtime,'utf8'),'{"consumedOnce":["once-1"],"run":"a","gate":"OPEN"}\n');
});

test('rollback CABU : dépassement, reprises en échec gardent le même journal non terminal puis retour vérifié',async t=>{
  const h=await fixture(t);h.c.waitMs=500;h.state.controllerDelayMs=1500;
  await assert.rejects(updateComponents(h.c,h.options),{code:'update-recovery-required'});
  const failed=await h.receipt();assert.equal(failed.phase,'ROLLBACK_FAILED');assert.equal(failed.failureCode,'update-controller-start-unconfirmed');
  const runtime=await readFile(h.runtime,'utf8');
  for(let i=0;i<2;i++){
    await assert.rejects(updateComponents(h.c,{...h.options,rollbackOnly:true}),{code:'update-recovery-required'});
    const repeated=await h.receipt();assert.equal(repeated.id,failed.id);assert.equal(repeated.phase,'ROLLBACK_FAILED');
    assert.equal(repeated.failureCode,'update-controller-start-unconfirmed');assert.equal(await readFile(h.runtime,'utf8'),runtime);
  }
  h.state.controllerDelayMs=0;
  const restored=await updateComponents(h.c,{...h.options,rollbackOnly:true});assert.equal(restored.status,'rolled-back');
  const receipt=await h.receipt();assert.equal(receipt.id,failed.id);assert.equal(receipt.phase,'ROLLED_BACK');
  assert.deepEqual(h.state.versions,{controller:'1.7.0',supervisor:'1.7.0',monitor:'1.7.0'});
  assert.equal(h.state.brokerVersion,'1.7.0');assert.equal(await readFile(h.runtime,'utf8'),runtime);
});

test('rollback CABU : reprise avant liée conserve le reçu et rétablit les briques sans reload global',async t=>{
 const h=await fixture(t);h.c.layout='managed-release';h.c.waitMs=500;h.state.controllerDelayMs=1500;
 await chmod(h.scripts,0o755);await chmod(join(h.c.home,'.local/share/cab-approval-bridge-monitor'),0o755);
 await mkdir(join(h.c.workspace,'plugins'),{recursive:true});
 await cp(h.c.pluginRoot,join(h.c.workspace,'plugins/cab-approval-bridge'),{recursive:true});
 await writeFile(join(h.c.workspace,'pyproject.toml'),'[project]\nname = "cab"\n');
 const sourceBroker=join(h.c.workspace,'src');await cp(h.c.brokerDirectory,sourceBroker,{recursive:true});
 h.c.brokerDirectory=sourceBroker;h.c.brokerPolicy='cab-source';
 await assert.rejects(updateComponents(h.c,h.options),{code:'update-recovery-required'});
 const failed=await h.receipt();assert.equal(failed.phase,'ROLLBACK_FAILED');
 assert.equal(failed.failureCode,'update-controller-start-unconfirmed');
 failed.version='2.1.67';
 for(const file of failed.files.filter(item=>item.group==='broker')){
  const content=(await readFile(join(h.c.pluginRoot,'broker',file.name),'utf8')).replaceAll(CURRENT_VERSION,'2.1.67');
  file.afterHash=createHash('sha256').update(content).digest('hex');
  const advanced=['cgpt_approval_bridge_journal.py','cgpt_approval_bridge_router.py','cgpt_approval_bridge_server.py'].includes(file.name);
  await writeFile(join(sourceBroker,file.name),advanced ? await readFile(join(h.c.pluginRoot,'broker',file.name)) : content);
 }
 await writeFile(join(h.c.home,'.local/state/cab-approval-bridge-update/current.json'),JSON.stringify(failed)+'\n');
 await writeFile(join(h.c.home,'.local/state/cab-approval-bridge-update',failed.id,'receipt.json'),JSON.stringify(failed)+'\n');
 h.state.controllerDelayMs=0;h.c.waitMs=2000;
 const result=await updateComponents({...h.c,resumeForward:failed.id},h.options);
 assert.equal(result.status,'completed');assert.equal(result.version,CURRENT_VERSION);
 const completed=await h.receipt();assert.equal(completed.recoveryOf,failed.id);assert.equal(completed.phase,'COMPLETED');
 const prior=JSON.parse(await readFile(join(h.c.home,'.local/state/cab-approval-bridge-update',failed.id,'receipt.json'),'utf8'));
 assert.equal(prior.phase,'SUPERSEDED');assert.equal(prior.failureCode,'update-controller-start-unconfirmed');
 assert.equal(h.state.brokerVersion,CURRENT_VERSION);assert.deepEqual(h.state.services,{controller:true,supervisor:true,monitor:true});
 assert.ok(!h.state.events.some(event=>event[1]==='/api/location/reload'));
 assert.equal(await readFile(h.runtime,'utf8'),'{"consumedOnce":["once-1"],"run":"a","gate":"OPEN"}\n');
});

test('reprise avant CABU : un identifiant sans reçu ROLLBACK_FAILED est refusé avant toute coupure',async t=>{
 const h=await fixture(t);
 await assert.rejects(updateComponents({...h.c,resumeForward:'update-11111111-1111-4111-8111-111111111111'},h.options),
  {code:'update-forward-recovery-authorization-invalid'});
 assert.ok(!h.state.events.some(event=>event[1]==='stop'));
 assert.deepEqual(h.state.services,{controller:true,supervisor:true,monitor:true});
});

test('reprise avant CABU : broker déjà déconnecté exige la transition exacte du reçu parent',async t=>{
 const h=await fixture(t);h.c.layout='managed-release';
 await chmod(h.scripts,0o755);await chmod(join(h.c.home,'.local/share/cab-approval-bridge-monitor'),0o755);
 assert.equal((await updateComponents(h.c,h.options)).status,'completed');
 const parent=await h.receipt();parent.phase='SUPERSEDED';
 parent.supersession={fromVersion:'2.1.67',packageVersion:'2.1.68',reason:'forward-recovery-after-controller-rollback-failure',failureCode:'update-controller-start-unconfirmed'};
 parent.mcpTransition={action:'disconnect',state:'CONFIRMED',at:h.state.now};
 await writeFile(join(h.c.home,'.local/state/cab-approval-bridge-update',parent.id,'receipt.json'),JSON.stringify(parent)+'\n');
 const id='update-22222222-2222-4222-8222-222222222222';
 const failed=structuredClone(parent);failed.id=id;failed.phase='ROLLBACK_FAILED';failed.version='2.1.68';
 failed.failureCode='update-controller-start-unconfirmed';failed.brokerWasConnected=false;failed.recoveryOf=parent.id;
 delete failed.mcpTransition;delete failed.supersession;
 h.state.broker=false;
 const stateDirectory=join(h.c.home,'.local/state/cab-approval-bridge-update');
 await mkdir(join(stateDirectory,id),{recursive:true});
 await writeFile(join(stateDirectory,id,'receipt.json'),JSON.stringify(failed)+'\n');
 await writeFile(join(stateDirectory,'current.json'),JSON.stringify(failed)+'\n');
 const result=await updateComponents({...h.c,resumeForward:id},h.options);
 assert.equal(result.status,'completed');assert.equal(result.version,CURRENT_VERSION);
 const current=await h.receipt();assert.equal(current.recoveryOf,id);assert.equal(current.phase,'COMPLETED');
 const old=JSON.parse(await readFile(join(stateDirectory,id,'receipt.json'),'utf8'));
 assert.equal(old.phase,'SUPERSEDED');
 assert.equal(h.state.brokerVersion,CURRENT_VERSION);assert.deepEqual(h.state.services,{controller:true,supervisor:true,monitor:true});
 assert.ok(!h.state.events.some(event=>event[1]==='/api/location/reload'));
});

function pendingRecovery(h, { transient = 0, at = 'connect' } = {}) {
  const client=h.options.openCodeClient,connect=client.connectMcp,disconnect=client.disconnectMcp;
  h.state.pending=false;h.state.reloads=0;h.c.waitMs=150;
  client.mcp=async()=>{
    if(h.state.pending && transient && --transient===0)h.state.pending=false;
    return {'cgpt-validation':{status:h.state.pending?'pending':h.state.broker?'connected':'disabled'}};
  };
  client.connectMcp=async(...args)=>{await connect(...args);if(at==='connect')h.state.pending=true;};
  client.disconnectMcp=async(...args)=>{await disconnect(...args);if(at==='disconnect')h.state.pending=true;};
  client.mcpRecoverySnapshot=async()=>({pid:h.state.changedPid?43:42,version:'2.4.28',sharedDirectory:h.c.workspace,sessionCount:1,
    sessionIdsSha256:h.state.changedSessions?'b'.repeat(64):'a'.repeat(64),activeSessionCount:h.state.recoveryBusy?1:0,sharedPermissionCount:h.state.recoveryPermission?1:0});
  client.request=async(path,options)=>{
    assert.equal(path,'/api/location/reload');assert.equal(options.method,'POST');assert.equal(options.scoped,false);
    assert.equal((await h.receipt()).mcpRecovery.reload.state,'INTENT','intention persistée avant POST');
    h.state.reloads++;if(!h.state.keepPending)h.state.pending=false;h.state.broker=true;
    h.state.brokerVersion=h.state.recoveryWrongVersion?'0.0.0':version(await readFile(join(h.c.brokerDirectory,'cgpt_approval_bridge_server.py'),'utf8'));
    if(h.state.changePidAfterReload)h.state.changedPid=true;if(h.state.changeSessionsAfterReload)h.state.changedSessions=true;
    if(h.state.reloadLostReply)throw Object.assign(new Error('synthetic lost response'),{code:'opencode-unavailable'});
    return null;
  };
  return h;
}
const nativeCalls=(h,action)=>h.state.events.filter(e=>e[0]==='http'&&e[1].endsWith('/'+action)).length;
async function persistentPending(t,options){const h=pendingRecovery(await fixture(t),options);await assert.rejects(updateComponents(h.c,h.options),{code:'update-mcp-recovery-required'});assert.equal((await h.receipt()).phase,'MCP_RECOVERY_REQUIRED');return h;}

test('MCP pending transitoire : une connexion, attente seule et aucune récupération globale',async t=>{
 const h=pendingRecovery(await fixture(t),{transient:3});const r=await updateComponents(h.c,h.options);
 assert.equal(r.status,'completed');assert.equal(nativeCalls(h,'connect'),1);assert.equal(nativeCalls(h,'disconnect'),1);assert.equal(h.state.reloads,0);
});
test('MCP pending persistant : même reçu, services disponibles et reprise sans commande réémise',async t=>{
 const h=await persistentPending(t);const before=await h.receipt();assert.equal(before.mcpRecovery.resumePhase,'RESTARTING');assert.ok(Object.values(h.state.services).every(Boolean));
 await assert.rejects(updateComponents(h.c,h.options),{code:'update-mcp-recovery-required'});assert.equal((await h.receipt()).id,before.id);assert.equal(nativeCalls(h,'connect'),1);assert.equal(nativeCalls(h,'disconnect'),1);assert.equal(h.state.reloads,0);
 h.state.pending=false;const r=await updateComponents(h.c,h.options);assert.equal(r.status,'completed');assert.equal(r.transactionId,before.id);assert.equal(nativeCalls(h,'connect'),1);
});
test('MCP pending initial : aucune coupure ni commande, staging du même reçu repris',async t=>{
 const h=pendingRecovery(await fixture(t),{transient:0});h.state.pending=true;
 await assert.rejects(updateComponents(h.c,h.options),{code:'update-mcp-recovery-required'});const before=await h.receipt();assert.equal(before.mcpRecovery.resumePhase,'PREPARED');assert.equal(h.state.events.filter(e=>e[0]==='systemd'&&e[1]==='stop').length,0);assert.equal(nativeCalls(h,'connect'),0);
 h.state.pending=false;const r=await updateComponents(h.c,{...h.options,openCodeClient:{...h.options.openCodeClient,connectMcp:async()=>{h.state.broker=true;h.state.brokerVersion=CURRENT_VERSION}}});assert.equal(r.transactionId,before.id);assert.equal(r.status,'completed');
});
test('récupération MCP : autorisation liée, profils/activité/permissions refusés sans POST',async t=>{
 const h=await persistentPending(t);const id=(await h.receipt()).id;
 for(const input of [{recoverMcp:'update-'+ '0'.repeat(36)},{recoverMcp:id,profile:'frozen-recovery-controller'},{recoverMcp:id,brokerPolicy:'reuse-readonly'}])await assert.rejects(updateComponents({...h.c,...input},h.options),{code:'update-mcp-recovery-authorization-invalid'});
 for(const key of ['recoveryBusy','recoveryPermission']){h.state[key]=true;await assert.rejects(updateComponents({...h.c,recoverMcp:id},h.options),{code:'update-mcp-recovery-native-busy'});h.state[key]=false;}
 assert.equal(h.state.reloads,0);assert.equal((await h.receipt()).id,id);
});
test('récupération MCP : POST global unique, réponse perdue réconciliée et même reçu COMPLETED',async t=>{
 const h=await persistentPending(t);const before=await h.receipt();h.state.reloadLostReply=true;
 const r=await updateComponents({...h.c,recoverMcp:before.id},h.options);assert.equal(r.transactionId,before.id);assert.equal(r.status,'completed');assert.equal(h.state.reloads,1);
 const after=await h.receipt();assert.equal(after.mcpRecovery.reload.state,'VERIFIED');assert.equal(after.mcpRecovery.reload.error,'opencode-unavailable');assert.deepEqual(after.mcpRecovery.reload.before,after.mcpRecovery.reload.after);
 await assert.rejects(updateComponents({...h.c,recoverMcp:before.id},h.options),{code:'update-mcp-recovery-authorization-invalid'});assert.equal(h.state.reloads,1);
});
test('récupération MCP : crash après intention ne permet jamais un second POST',async t=>{
 const h=await persistentPending(t);const id=(await h.receipt()).id;
 await assert.rejects(updateComponents({...h.c,recoverMcp:id},{...h.options,onPhase:async(phase,r)=>{if(phase==='MCP_RECOVERY_REQUIRED'&&r.mcpRecovery.reload?.state==='INTENT')throw Object.assign(new Error('crash'),{code:'SIMULATED_CRASH'})}}),{code:'SIMULATED_CRASH'});
 assert.equal((await h.receipt()).mcpRecovery.reload.state,'INTENT');assert.equal(h.state.reloads,0);
 await assert.rejects(updateComponents({...h.c,recoverMcp:id},h.options),{code:'update-mcp-recovery-required'});assert.equal(h.state.reloads,0);
 h.state.pending=false;assert.equal((await updateComponents(h.c,h.options)).transactionId,id);assert.equal(h.state.reloads,0);
});
test('récupération MCP : PID/sessions changés ou mauvaise version refusent la clôture',async t=>{
 for(const key of ['changePidAfterReload','changeSessionsAfterReload','recoveryWrongVersion'])await t.test(key,async t=>{
  const h=await persistentPending(t);h.state[key]=true;const id=(await h.receipt()).id;
  await assert.rejects(updateComponents({...h.c,recoverMcp:id},h.options),{code:key==='recoveryWrongVersion'?'update-active-version-unconfirmed':'update-mcp-recovery-identity-changed'});
  assert.equal((await h.receipt()).phase,'MCP_RECOVERY_REQUIRED');assert.equal(h.state.reloads,1);
 });
});
test('récupération MCP : disconnect incertain ne boucle pas et clôt seulement le repli du même reçu',async t=>{
 const h=await persistentPending(t,{at:'disconnect'});const id=(await h.receipt()).id;assert.equal((await h.receipt()).mcpRecovery.resumePhase,'STOPPING');
 // Le raccord reconstruit est observable ; les transitions suivantes sont immédiates.
 h.options.openCodeClient.disconnectMcp=async()=>{h.state.events.push(['http','/api/experimental/mcp/cgpt-validation/disconnect']);h.state.broker=false;};
 const r=await updateComponents({...h.c,recoverMcp:id},h.options);
 assert.equal(r.status,'rolled-back');assert.equal((await h.receipt()).id,id);assert.equal((await h.receipt()).phase,'ROLLED_BACK');assert.equal(h.state.reloads,1);
});

test('récupération MCP : ancien ROLLBACK_FAILED réconcilié sans installation suivante implicite',async t=>{
 const h=await fixture(t);h.c.waitMs=100;h.state.controllerDelayMs=10000;
 await assert.rejects(updateComponents(h.c,h.options),{code:'update-recovery-required'});const before=await h.receipt();assert.equal(before.phase,'ROLLBACK_FAILED');
 h.state.controllerDelayMs=0;h.state.controllerReadyAt=0;pendingRecovery(h,{at:'none'});h.state.pending=true;
 const r=await updateComponents({...h.c,recoverMcp:before.id},h.options);assert.equal(r.status,'rolled-back');assert.equal(r.transactionId,before.id);assert.equal((await h.receipt()).phase,'ROLLED_BACK');assert.equal(h.state.reloads,1);
 const dirs=(await readdir(join(h.c.home,'.local/state/cab-approval-bridge-update'))).filter(n=>/^update-[a-f0-9-]{36}$/.test(n));assert.equal(dirs.length,1);
});
test('récupération MCP : PID changé avant récupération et autorisation sans reçu refusés',async t=>{
 const empty=await fixture(t);await assert.rejects(updateComponents({...empty.c,recoverMcp:'update-'+ '0'.repeat(36)},empty.options),{code:'update-mcp-recovery-authorization-invalid'});assert.equal(empty.state.events.length,0);
 const h=await persistentPending(t);h.state.changedPid=true;await assert.rejects(updateComponents({...h.c,recoverMcp:(await h.receipt()).id},h.options),{code:'update-mcp-recovery-identity-changed'});assert.equal(h.state.reloads,0);
});

test('MCP : timeout de réponse connect ne renvoie pas la commande après observation autonome',async t=>{
 const h=pendingRecovery(await fixture(t));const connect=h.options.openCodeClient.connectMcp;
 h.options.openCodeClient.connectMcp=async(...args)=>{await connect(...args);throw Object.assign(new Error('lost response'),{code:'opencode-unavailable'})};
 await assert.rejects(updateComponents(h.c,h.options),{code:'update-mcp-recovery-required'});const id=(await h.receipt()).id;
 h.state.pending=false;const r=await updateComponents(h.c,h.options);assert.equal(r.transactionId,id);assert.equal(r.status,'completed');assert.equal(nativeCalls(h,'connect'),1);assert.equal(h.state.reloads,0);
});
test('MCP : intention connect interrompue ne rejoue jamais connect au redémarrage',async t=>{
 const h=pendingRecovery(await fixture(t));
 await assert.rejects(updateComponents(h.c,{...h.options,onPhase:async(phase,r)=>{if(phase==='RESTARTING'&&r.mcpTransition?.action==='connect'&&r.mcpTransition.state==='INTENT')throw Object.assign(new Error('crash'),{code:'SIMULATED_CRASH'})}}),{code:'SIMULATED_CRASH'});
 assert.equal(nativeCalls(h,'connect'),0);await assert.rejects(updateComponents(h.c,h.options),{code:'update-mcp-recovery-required'});assert.equal(nativeCalls(h,'connect'),0);assert.equal(h.state.reloads,0);
});
test('MCP : --rollback après retour autonome ne convertit pas le reçu en succès cible',async t=>{
 const h=await persistentPending(t);const id=(await h.receipt()).id;h.state.pending=false;
 h.options.openCodeClient.connectMcp=async()=>{h.state.broker=true;h.state.brokerVersion=version(await readFile(join(h.c.brokerDirectory,'cgpt_approval_bridge_server.py'),'utf8'))};
 const r=await updateComponents(h.c,{...h.options,rollbackOnly:true});assert.equal(r.status,'rolled-back');assert.equal((await h.receipt()).id,id);assert.equal((await h.receipt()).phase,'ROLLED_BACK');assert.equal(h.state.reloads,0);
});

test('récupération MCP : needs_auth reste bloquant, failed exige le reçu exact et sa snapshot inactive',async t=>{
 const h=await persistentPending(t);const id=(await h.receipt()).id;
 h.options.openCodeClient.mcp=async()=>({'cgpt-validation':{status:'needs_auth'}});
 await assert.rejects(updateComponents({...h.c,recoverMcp:id},h.options),{code:'update-broker-needs-auth'});
 assert.equal(h.state.reloads,0);
 h.options.openCodeClient.mcp=async()=>({'cgpt-validation':{status:h.state.reloads||h.state.autonomousConnected?'connected':'failed'}});
 await assert.rejects(updateComponents(h.c,h.options),{code:'update-broker-state-unconfirmed'});
 assert.equal(h.state.reloads,0);
 h.state.recoveryBusy=true;
 await assert.rejects(updateComponents({...h.c,recoverMcp:id},h.options),{code:'update-mcp-recovery-native-busy'});
 assert.equal(h.state.reloads,0);h.state.recoveryBusy=false;
 const recovered=await updateComponents({...h.c,recoverMcp:id},h.options);
 assert.equal(recovered.status,'completed');assert.equal(recovered.transactionId,id);
 assert.equal(h.state.reloads,1);assert.equal((await h.receipt()).mcpRecovery.reload.state,'VERIFIED');
});
test('récupération MCP : failed ne rejoue pas un reload déjà intentionné sur le même reçu',async t=>{
 const h=await persistentPending(t);const id=(await h.receipt()).id;
 h.options.openCodeClient.mcp=async()=>({'cgpt-validation':{status:h.state.reloads||h.state.autonomousConnected?'connected':'failed'}});
 await assert.rejects(updateComponents({...h.c,recoverMcp:id},{...h.options,onPhase:async(phase,r)=>{
   if(phase==='MCP_RECOVERY_REQUIRED'&&r.mcpRecovery.reload?.state==='INTENT')
     throw Object.assign(new Error('simulated boundary'),{code:'SIMULATED_CRASH'});
 }}),{code:'SIMULATED_CRASH'});
 assert.equal(h.state.reloads,0);assert.equal((await h.receipt()).mcpRecovery.reload.state,'INTENT');
 await assert.rejects(updateComponents({...h.c,recoverMcp:id},h.options),{code:'update-mcp-recovery-required'});
 assert.equal(h.state.reloads,0);
 h.state.autonomousConnected=true;
 const recovered=await updateComponents({...h.c,recoverMcp:id},h.options);
 assert.equal(recovered.status,'completed');assert.equal(recovered.transactionId,id);assert.equal(h.state.reloads,0);
});
test('récupération MCP : failed se réconcilie de façon identique sur plusieurs reçus explicites',async t=>{
 for(let index=0;index<2;index++)await t.test('receipt-'+index,async t=>{
  const h=await persistentPending(t);const id=(await h.receipt()).id;
  h.options.openCodeClient.mcp=async()=>({'cgpt-validation':{status:h.state.reloads?'connected':'failed'}});
  const result=await updateComponents({...h.c,recoverMcp:id},h.options);
  assert.equal(result.status,'completed');assert.equal(result.transactionId,id);
  assert.equal(h.state.reloads,1);assert.equal((await h.receipt()).mcpRecovery.reload.state,'VERIFIED');
 });
});

async function advanceBrokerReceipt(t,{changeController=false}={}){
 const h=await persistentPending(t);const receipt=await h.receipt();receipt.version='2.1.42';receipt.mcpRecovery.resumePhase='RESTARTING';
 const snapshot={pid:42,version:'2.4.28',sharedDirectory:h.c.workspace,sessionCount:1,sessionIdsSha256:'a'.repeat(64),activeSessionCount:0,sharedPermissionCount:0};
 receipt.mcpRecovery.reload={state:'VERIFIED',before:snapshot,after:snapshot,at:h.state.now};
 const roots={scripts:h.scripts,monitorScripts:join(h.c.home,'.local/share/cab-approval-bridge-monitor/scripts'),
  web:join(h.c.home,'.local/share/cab-approval-bridge-monitor/web-monitor'),units:join(h.c.home,'.config/systemd/user'),broker:h.c.brokerDirectory};
 for(let index=0;index<receipt.files.length;index++){
  const file=receipt.files[index],stagePath=join(h.c.home,'.local/state/cab-approval-bridge-update',receipt.id,'stage',String(index));
  const staged=Buffer.from((await readFile(stagePath,'utf8')).replaceAll(CURRENT_VERSION,'2.1.42'));
  await writeFile(stagePath,staged);file.afterHash=createHash('sha256').update(staged).digest('hex');
  if(file.group!=='broker'||!['cgpt_approval_bridge_journal.py','cgpt_approval_bridge_router.py','cgpt_approval_bridge_server.py'].includes(file.name))
   await writeFile(join(roots[file.group],file.name),staged);
 }
 if(changeController){const file=receipt.files.find(item=>item.group==='scripts'&&item.name==='cgpt-approval-bridge-controller.mjs');
  await writeFile(join(roots.scripts,file.name),'tampered');}
 await writeFile(join(h.c.home,'.local/state/cab-approval-bridge-update/current.json'),JSON.stringify(receipt));
 h.state.versions={controller:'2.1.42',supervisor:'2.1.42',monitor:'2.1.42'};h.state.brokerVersion='2.1.43';h.state.broker=true;h.state.pending=false;h.state.events=[];
 return {h,id:receipt.id};
}
test('reprise : un reçu RESTARTING historique est clos SUPERSEDED si seuls les trois brokers correspondent au paquet CAB plus récent',async t=>{
 const {h,id}=await advanceBrokerReceipt(t);const result=await updateComponents({...h.c,recoverMcp:id},h.options);
 assert.equal(result.status,'superseded');assert.equal(result.transactionId,id);assert.equal(result.previousVersion,'2.1.42');
 assert.equal(result.supersedingVersion,CURRENT_VERSION);assert.equal(result.brokerRuntimeVersion,'2.1.43');assert.equal(h.state.reloads,0);
 const receipt=await h.receipt();assert.equal(receipt.phase,'SUPERSEDED');assert.equal(receipt.failureCode,'update-broker-pending-timeout');
 assert.deepEqual(receipt.supersession.brokerFiles,['cgpt_approval_bridge_journal.py','cgpt_approval_bridge_router.py','cgpt_approval_bridge_server.py']);
 assert.equal(h.state.events.some(event=>event[0]==='systemd'&&['stop','start'].includes(event[1])),false);
});
test('reprise : un artefact hors broker divergent interdit SUPERSEDED',async t=>{
 const {h,id}=await advanceBrokerReceipt(t,{changeController:true});
 await assert.rejects(updateComponents({...h.c,recoverMcp:id},h.options),{code:'update-installed-artifact-changed'});
 assert.equal((await h.receipt()).phase,'MCP_RECOVERY_REQUIRED');assert.equal(h.state.reloads,0);
});
test('reprise : le broker doit dépasser le reçu sans dépasser le paquet courant',async t=>{
 await t.test('version du reçu refusée',async t=>{
  const {h,id}=await advanceBrokerReceipt(t);h.state.brokerVersion='2.1.42';
  await assert.rejects(updateComponents({...h.c,recoverMcp:id},h.options),{code:'update-superseded-state-unconfirmed'});
  assert.equal((await h.receipt()).phase,'MCP_RECOVERY_REQUIRED');assert.equal(h.state.reloads,0);
 });
 await t.test('version exacte du paquet admise',async t=>{
  const {h,id}=await advanceBrokerReceipt(t);h.state.brokerVersion=CURRENT_VERSION;
  const result=await updateComponents({...h.c,recoverMcp:id},h.options);
  assert.equal(result.status,'superseded');assert.equal(result.brokerRuntimeVersion,CURRENT_VERSION);
  assert.equal((await h.receipt()).phase,'SUPERSEDED');assert.equal(h.state.reloads,0);
 });
});


test('distribution moniteur : le client installé charge réellement permission-policy',async t=>{
 const h=await fixture(t);
 for(const path of [h.scripts,join(h.c.home,'.local/share/cab-approval-bridge-monitor'),h.c.brokerDirectory])await chmod(path,0o700);
 await updateComponents({...h.c,layout:'managed-release'},h.options);
 const root=join(h.c.home,'.local/share/cab-approval-bridge-monitor/scripts');
 assert.deepEqual(await readFile(join(root,'cgpt-approval-bridge-permission-policy.mjs')),await readFile(join(h.c.pluginRoot,'scripts/cgpt-approval-bridge-permission-policy.mjs')));
 const loaded=await import(pathToFileURL(join(root,'cgpt-approval-bridge-opencode-client.mjs')).href);
 const client=loaded.createOpenCodeV2Client({baseUrl:'http://127.0.0.1:4096',directory:h.c.workspace,passwordFile:join(h.c.home,'.config/cab-approval-bridge/opencode.password')});
 assert.equal(typeof client.nativePermissionPolicy,'function');
});
test('distribution moniteur : import seulement dans le groupe primaire refusé avant coupure',async t=>{
 const h=await fixture(t);const scripts=join(h.c.pluginRoot,'scripts'),client=join(scripts,'cgpt-approval-bridge-opencode-client.mjs');
 await writeFile(join(scripts,'cgpt-approval-bridge-extra-fixture.mjs'),`export const VERSION='${CURRENT_VERSION}';\n`);
 await writeFile(client,"import './cgpt-approval-bridge-extra-fixture.mjs';\n"+await readFile(client,'utf8'));
 await assert.rejects(updateComponents(h.c,h.options),{code:'update-package-import-missing'});
 assert.ok(!h.state.events.some(e=>e[0]==='systemd'&&['stop','start'].includes(e[1])));assert.equal((await h.receipt()).phase,'PREPARATION_FAILED');
});

test('CABU scelle le transfert avant de stopper le groupe contenant son autorité flock',async t=>{
 const h=await fixture(t);h.state.handoffSupported=true;
 const original=h.options.serviceCommand;
 h.options.serviceCommand=async args=>{
  if(args[0]==='stop'&&args.includes('cgpt-approval-bridge-controller.service'))
   assert.equal(h.state.services.controller,false,'le processus principal doit finir avant le signal de groupe');
  return original(args);
 };
 const result=await updateComponents(h.c,h.options);assert.equal(result.status,'completed');
 const kill=h.state.events.findIndex(x=>x[0]==='systemd'&&x[1]==='kill');
 const stop=h.state.events.findIndex(x=>x[0]==='systemd'&&x[1]==='stop');
 assert.ok(kill>=0&&stop>kill);assert.equal(h.state.handoff.state,'ADOPTED');
});

test('CABU accepte le principal arrêté en failed avec MainPID nul et exige encore le transfert adopté',async t=>{
 const h=await fixture(t);h.state.handoffSupported=true;h.state.failControllerShutdown=true;
 const result=await updateComponents(h.c,h.options);
 assert.equal(result.status,'completed');assert.equal(h.state.handoff.state,'ADOPTED');
 assert.equal(h.state.services.controller,true);assert.equal(h.state.controllerFailed,false);
});

async function privateMigrationFixture(t,{offline=false,cabSource=false}={}) {
 const h=await fixture(t,offline?{active:[]}:{});h.c.layout='managed-release';h.state.versions.controller=offline?'2.1.2':'2.2.6';
 if(cabSource){
  await rename(h.c.brokerDirectory,join(h.c.workspace,'src'));h.c.brokerDirectory=join(h.c.workspace,'src');h.c.brokerPolicy='cab-source';
  await writeFile(join(h.c.workspace,'pyproject.toml'),'[project]\nname = "cab"\n');
  await mkdir(join(h.c.workspace,'plugins/cab-approval-bridge/.codex-plugin'),{recursive:true});
  await cp(join(h.c.pluginRoot,'.codex-plugin/plugin.json'),join(h.c.workspace,'plugins/cab-approval-bridge/.codex-plugin/plugin.json'));
 }
 if(offline)for(const directory of [h.scripts,join(h.c.home,'.local/share/cab-approval-bridge-monitor/scripts'),join(h.c.home,'.config/systemd/user'),h.c.brokerDirectory])for(const name of await readdir(directory)){const file=join(directory,name);if((await lstat(file)).isFile())await writeFile(file,(await readFile(file,'utf8')).replaceAll('1.7.0','2.1.2'));}
 const source=legacyStateDirectory(h.c.workspace);await mkdir(source,{recursive:true});
 const registry=new ResourceRunRegistry(h.c.workspace,source);await registry.acquireAuthority();t.after(()=>registry.close());
 const run=registry.reserve({runId:'a',ownerId:'owner-a',sessionId:'ses_a',directory:h.c.workspace,changeId:'change-a',selectionKey:'selection-a',resources:[{key:'file:one.py',mode:'write'}],dependsOn:[]});
 const resources=run.resources,expected=registry.revisions(resources),op=registry.prepareOperation(run.runId,{coordination_protocol:'resource-scoped-v1',run_id:run.runId,reservation_version:run.version,session_id:run.sessionId,requestId:'request-once-old',operation_id:'once-old',operation_digest:'a'.repeat(64),expected_revisions:expected,resources});
 registry.recordDecision(run.runId,op.operationId,{status:'approved',requestId:op.requestId,operationId:op.operationId,runId:run.runId,changeId:run.changeId,version:run.version,sessionId:run.sessionId,operationDigest:op.operationDigest,identityDigest:op.identityDigest,approvalId:'approval-old'});
 registry.acquireAccess(run.runId,{version:run.version,operationId:op.operationId,operationDigest:op.operationDigest,resources,expectedRevisions:expected});
 registry.nativeStart(run.runId,{operationId:op.operationId,reservationVersion:run.version,sessionId:run.sessionId,operationDigest:op.operationDigest,expectedRevisions:expected,resources,kind:'bash',target:'synthetic-effect'},op.requestId,{id:'permission-old',tool:{callID:'call-old'}});
 registry.nativeIssued(op.operationId);const validSnapshot=registry.snapshot();registry.close();h.state.run=structuredClone(run);
 await chmod(h.scripts,0o755);await chmod(join(h.c.home,'.local/share/cab-approval-bridge-monitor'),0o755);
 h.options.openCodeClient.permissions=async()=>[];
 const initialHttp=h.options.http;
 h.options.http=async(base,path,body)=>{
  if(path==='/runs'){return {...structuredClone(validSnapshot),version:h.state.versions.controller};}
  if(path==='/runtime/migration'||path==='/runtime/migration/activate') {
   const directory=runtimeStateDirectory(h.c.workspace,{home:h.c.home}),file=join(directory,'runtime-migration.json');
   const proof=JSON.parse(await readFile(file));
   if(path.endsWith('/activate')){assert.equal(body.transactionId,proof.transactionId);proof.phase='ACTIVE';await writeFile(file,JSON.stringify(proof),{mode:0o600});}
   return {runtimeStateDirectory:directory,migration:{transactionId:proof.transactionId,phase:proof.phase}};
  }
  return initialHttp(base,path,body);
 };
 const snapshot=await h.options.http('http://127.0.0.1:8788','/runs');
 const bytes=JSON.stringify(snapshot);await writeFile(join(source,'controller-runs.json'),bytes,{mode:0o775});await chmod(join(source,'controller-runs.json'),0o775);
 return {...h,source,bytes};
}
test('CABU migration privée : copie0775 conservée, once et activation idempotente vérifiées',async t=>{
 const h=await privateMigrationFixture(t),result=await updateComponents(h.c,h.options);
 assert.equal(result.status,'completed');assert.equal(result.runtimeMigration.state,'ACTIVE');assert.equal(result.transportContinuity.state,'LEGACY');
 assert.equal(await readFile(join(h.source,'controller-runs.json'),'utf8'),h.bytes);
 assert.equal((await lstat(join(h.source,'controller-runs.json'))).mode&0o777,0o775);
 const copied=join(result.runtimeMigration.destination,'controller-runs.json');assert.equal((await lstat(copied)).mode&0o777,0o600);
 assert.equal(JSON.parse(await readFile(copied)).coordination.operations['once-old'].native.onceAcknowledged,true);
 assert.equal((await updateComponents(h.c,h.options)).status,'up-to-date');
});
test('CABU migration privée : démarrage interrompu reprend en avant sans retour à ancien stockage',async t=>{
 const h=await privateMigrationFixture(t);h.state.failStart='controller';
 await assert.rejects(updateComponents(h.c,h.options),/migration-forward-recovery-required/);
 const failed=await h.receipt();assert.equal(failed.runtimeMigration.state,'COPIED');assert.equal(failed.phase,'RESTARTING');
 const result=await updateComponents(h.c,h.options);assert.equal(result.status,'completed');assert.equal(result.transactionId,failed.id);
 assert.equal(result.runtimeMigration.state,'ACTIVE');assert.equal(await readFile(join(h.source,'controller-runs.json'),'utf8'),h.bytes);
});
test('CABU migration privée : permission native ou lien historique conserve les services avant coupure',async t=>{
 const h=await privateMigrationFixture(t);h.options.openCodeClient.permissions=async()=>[{id:'unresolved'}];
 await assert.rejects(updateComponents(h.c,h.options),/migration-native-permission-pending/);
 assert.equal(h.state.events.some(e=>e[0]==='systemd'&&e[1]==='stop'),false);
 h.options.openCodeClient.permissions=async()=>[];await symlink(h.root,join(h.source,'runs'));
 await assert.rejects(updateComponents(h.c,h.options),/preparation-failed/);
 assert.equal(h.state.events.some(e=>e[0]==='systemd'&&e[1]==='stop'),false);
});

test('CABU migration privée : réponse de déconnexion perdue, observation puis reprise sans rejeu',async t=>{
 const h=await privateMigrationFixture(t),disconnect=h.options.openCodeClient.disconnectMcp;let calls=0;
 h.options.openCodeClient.disconnectMcp=async(...args)=>{calls++;await disconnect(...args);throw Object.assign(new Error('lost'),{code:'opencode-unavailable'});};
 await assert.rejects(updateComponents(h.c,h.options),/migration-forward-recovery-required/);
 const failed=await h.receipt();assert.equal(failed.phase,'STOPPING');assert.equal(failed.mcpTransition.state,'INTENT');
 assert.equal((await updateComponents(h.c,h.options)).status,'completed');assert.equal(calls,1);
});

test('CABU migration privée : registre disque supérieur à16Mio sans augmenter la réponse API',async t=>{
 const h=await privateMigrationFixture(t);h.bytes+=' '.repeat(20*1024*1024);
 await writeFile(join(h.source,'controller-runs.json'),h.bytes,{mode:0o775});
 const result=await updateComponents(h.c,h.options);assert.equal(result.status,'completed');
 assert.equal(await readFile(join(result.runtimeMigration.destination,'controller-runs.json'),'utf8'),h.bytes);
 assert.equal(await readFile(join(h.source,'controller-runs.json'),'utf8'),h.bytes);
});


test('CABU offline : lecteur cible valide un registre refusé par les fichiers2.1.2, états et once préservés',async t=>{
 const h=await privateMigrationFixture(t,{offline:true});
 const result=await updateComponents(h.c,h.options);assert.equal(result.status,'completed');assert.equal(result.runtimeMigration.state,'ACTIVE');
 const source=await readFile(join(h.source,'controller-runs.json'),'utf8');assert.equal(source,h.bytes);
 const copied=JSON.parse(await readFile(join(result.runtimeMigration.destination,'controller-runs.json')));
 assert.equal(copied.coordination.operations['once-old'].native.onceAcknowledged,true);
 assert.equal(copied.coordination.operations['once-old'].decision.status,'approved');
 assert.equal(copied.coordination.operations['once-old'].state,'EXECUTING');
 assert.ok(Object.values(copied.coordination.accesses).some(access=>access.state==='EXECUTING'));
 assert.deepEqual((await h.receipt()).initialActive,{controller:false,supervisor:false,monitor:false});
});
for(const variant of ['schema','job','stage','drift','native-pid'])test('CABU offline refuse avant coupure : '+variant,async t=>{
 const h=await privateMigrationFixture(t,{offline:true});const source=join(h.source,'controller-runs.json');
 if(variant==='schema'){const value=JSON.parse(h.bytes);value.schemaVersion=999;await writeFile(source,JSON.stringify(value));}
 if(variant==='job')await writeFile(join(h.source,'controller-job.json'),'{}',{mode:0o775});
 if(variant==='stage')await writeFile(join(h.source,'shell-stages.json'),'{"schemaVersion":1,"stages":[{}]}',{mode:0o775});
 if(variant==='drift'||variant==='native-pid'){
  const info=h.options.openCodeClient.info;let count=0;
  h.options.openCodeClient.info=async()=>{const value=await info();if(++count>=2){if(variant==='drift')await writeFile(source,h.bytes+' ');else return {...value,pid:value.pid+1};}return value;};
 }
 await assert.rejects(updateComponents(h.c,h.options),/migration-/);
 assert.equal(h.state.events.some(event=>event[0]==='systemd'&&['stop','start'].includes(event[1])),false);
 assert.equal((await h.receipt()).phase,'PREPARATION_FAILED');
});
test('repli CABU : les services initialement arrêtés ne sont jamais redémarrés par le repli',async t=>{
 const h=await fixture(t,{active:[]});h.state.wrongBroker=true;
 await assert.rejects(updateComponents(h.c,h.options),/failed-rolled-back/);
 const receipt=await h.receipt();assert.equal(receipt.phase,'ROLLED_BACK');
 assert.deepEqual(h.state.services,{controller:false,supervisor:false,monitor:false});
 const rollback=h.state.events.findIndex(event=>event[0]==='systemd'&&event[1]==='daemon-reload');
 assert.ok(rollback>=0);
 assert.equal(receipt.initialActive.controller,false);
});
async function failedOfflineReceipt(t,{classic=false,cabSource=false}={}){
 const h=await privateMigrationFixture(t,{offline:true,cabSource}),source=join(h.source,'controller-runs.json'),saved=join(h.source,'saved-registry.json');
 if(classic)delete h.c.layout;
 await rename(source,saved);h.state.wrongBroker=true;
 const service=h.options.serviceCommand;let reloads=0;
 h.options.serviceCommand=async args=>{if(args[0]==='daemon-reload'&&++reloads===2)throw Object.assign(new Error('synthetic'),{code:'synthetic-rollback-failed'});return service(args);};
 await assert.rejects(updateComponents(h.c,h.options),/recovery-required/);
 const before=await h.receipt();assert.equal(before.phase,'ROLLBACK_FAILED');assert.equal(before.failureCode,'update-active-version-unconfirmed');
 assert.equal(before.rollbackFailureCode,'synthetic-rollback-failed');
 delete before.initialActive;before.active={controller:true,supervisor:true,monitor:true};
 const receiptRoot=join(h.c.home,'.local/state/cab-approval-bridge-update');
 for(const path of [join(receiptRoot,'current.json'),join(receiptRoot,before.id,'receipt.json')])await writeFile(path,JSON.stringify(before),{mode:0o600});
 await rename(saved,source);h.options.serviceCommand=service;h.state.wrongBroker=false;
 return {...h,before};
}
test('CABU offline reprend le même reçu ROLLBACK_FAILED sans réinitialiser décisions ou once',async t=>{
 const h=await failedOfflineReceipt(t),result=await updateComponents(h.c,h.options);
 assert.equal(result.transactionId,h.before.id);assert.equal(result.runtimeMigration.state,'ACTIVE');assert.equal(result.status,'completed');
 assert.equal((await h.receipt()).offlineRecovery.previousPhase,'ROLLBACK_FAILED');
 assert.equal(await readFile(join(h.source,'controller-runs.json'),'utf8'),h.bytes);
});
test('CABU offline : un updater plus récent termine la cible initiale du même reçu et annonce la suite',async t=>{
 const h=await failedOfflineReceipt(t),directory=join(h.root,'new-updater');await cp(join(h.c.pluginRoot,'scripts'),directory,{recursive:true});
 const file=join(directory,'cgpt-approval-bridge-update.mjs');await writeFile(file,(await readFile(file,'utf8')).replace(`export const VERSION = '${CURRENT_VERSION}';`,"export const VERSION = '9.0.0';"));
 const newer=await import(pathToFileURL(file).href);const result=await newer.updateComponents(h.c,h.options);
 assert.equal(result.transactionId,h.before.id);assert.equal(result.version,CURRENT_VERSION);assert.equal(result.packageVersion,'9.0.0');assert.equal(result.nextUpdateRequired,true);
});

for(const variant of ['stage','backup','installed','initial-activity'])test('reprise offline refuse une frontière non vérifiée : '+variant,async t=>{
 const h=await failedOfflineReceipt(t),root=join(h.c.home,'.local/state/cab-approval-bridge-update'),receipt=await h.receipt();
 if(variant==='initial-activity'){
  delete receipt.observedActive;for(const file of [join(root,'current.json'),join(root,receipt.id,'receipt.json')])await writeFile(file,JSON.stringify(receipt),{mode:0o600});
 }else{
  const index=receipt.files.findIndex(file=>file.group==='scripts'&&file.name==='cgpt-approval-bridge-controller.mjs');
  const file=variant==='installed'?h.entry('controller'):join(root,receipt.id,variant,String(index));await writeFile(file,'changed-synthetic-artifact');
 }
 const events=h.state.events.length;
 await assert.rejects(updateComponents(h.c,h.options),/stage-changed|backup-invalid|installed-artifact-changed|initial-services-unverified/);
 assert.equal((await h.receipt()).id,receipt.id);assert.equal((await h.receipt()).phase,'ROLLBACK_FAILED');
 assert.equal(h.state.events.slice(events).some(event=>event[0]==='systemd'&&['stop','start'].includes(event[1])),false);
});

test('CABU classique : reprend le même reçu malgré une option managed forcée et arrête les résidus du repli',async t=>{
 const h=await failedOfflineReceipt(t,{classic:true});h.state.services.supervisor=true;h.state.services.monitor=true;
 await writeFile(join(h.source,'supervisor-state.json'),'{"state":"residual-active"}',{mode:0o775});
 const service=h.options.serviceCommand;
 h.options.serviceCommand=async args=>{if(args[0]==='stop'&&args.includes('cgpt-approval-bridge-supervisor.service'))await writeFile(join(h.source,'supervisor-state.json'),'{"state":"stopped"}');return service(args);};
 const result=await updateComponents({...h.c,layout:'managed-release'},h.options);
 assert.equal(result.transactionId,h.before.id);assert.equal(result.status,'completed');assert.equal(result.installationLayout,'classic');
 const receipt=await h.receipt();assert.equal(receipt.managed,undefined);
 const copied=JSON.parse(await readFile(join(result.runtimeMigration.destination,'supervisor-state.json')));assert.equal(copied.state,'stopped');
 for(const component of ['controller','supervisor','monitor'])assert.ok(h.state.events.some(event=>event[0]==='systemd'&&event[1]==='stop'&&event.includes('cgpt-approval-bridge-'+component+'.service')));
 assert.equal((await lstat(h.entry('controller'))).isSymbolicLink(),false);
});
test('CABU classique neuf : migration vérifiée sans exiger managed-release',async t=>{
 const h=await privateMigrationFixture(t,{offline:true});delete h.c.layout;
 const result=await updateComponents(h.c,h.options);assert.equal(result.status,'completed');assert.equal(result.installationLayout,'classic');assert.equal((await h.receipt()).managed,undefined);
});
test('CABU classique : broker intermédiaire identique au code qualifié conservé en audit avant reprise',async t=>{
 const h=await failedOfflineReceipt(t,{classic:true}),root=join(h.c.home,'.local/state/cab-approval-bridge-update'),receipt=await h.receipt();
 const oldVersion='2.3.4';receipt.version=oldVersion;
 for(let i=0;i<receipt.files.length;i++){
  const file=receipt.files[i],path=join(root,receipt.id,'stage',String(i)),data=(await readFile(path,'utf8')).replaceAll(CURRENT_VERSION,oldVersion);
  await writeFile(path,data);file.afterHash=createHash('sha256').update(data).digest('hex');
 }
 for(const file of [join(root,'current.json'),join(root,receipt.id,'receipt.json')])await writeFile(file,JSON.stringify(receipt),{mode:0o600});
 const names=['cgpt_approval_bridge_server.py','cgpt_approval_bridge_router.py','cgpt_approval_bridge_journal.py'];
 for(const name of names)await writeFile(join(h.c.brokerDirectory,name),await readFile(join(h.c.pluginRoot,'broker',name)));
 const result=await updateComponents(h.c,h.options);assert.equal(result.transactionId,receipt.id);assert.equal(result.version,oldVersion);assert.equal(result.nextUpdateRequired,true);
 const after=await h.receipt();assert.equal(after.offlineRecovery.observedBrokerFiles.length,3);
 for(const item of after.offlineRecovery.observedBrokerFiles){const index=receipt.files.findIndex(file=>file.group===item.group&&file.name===item.name);assert.equal(createHash('sha256').update(await readFile(join(root,receipt.id,'observed-broker',String(index)))).digest('hex'),item.sha256);}
});

async function orphanRegistryFixture(t){
 const h=await failedOfflineReceipt(t,{classic:true}),destination=runtimeStateDirectory(h.c.workspace,{home:h.c.home});
 await mkdir(destination,{recursive:true,mode:0o700});await writeFile(join(destination,'controller-runs.json'),h.bytes,{mode:0o600});return {...h,destination};
}
test('CABU adoption : registre identique sans manifeste adopté dans le même reçu classique',async t=>{
 const h=await orphanRegistryFixture(t),before=await lstat(join(h.destination,'controller-runs.json'));
 const result=await updateComponents(h.c,h.options);assert.equal(result.status,'completed');assert.equal(result.transactionId,h.before.id);
 assert.equal(result.runtimeMigration.registryAdoption.state,'VERIFIED');assert.equal(result.runtimeMigration.registryAdoption.sha256,createHash('sha256').update(h.bytes).digest('hex'));
 assert.equal((await lstat(join(h.destination,'controller-runs.json'))).ino,before.ino);assert.equal(await readFile(join(h.source,'controller-runs.json'),'utf8'),h.bytes);
 const value=JSON.parse(await readFile(join(h.destination,'controller-runs.json')));assert.equal(value.coordination.operations['once-old'].native.onceAcknowledged,true);assert.equal(value.coordination.operations['once-old'].decision.status,'approved');
});
for(const variant of ['foreign-registry','foreign-proof','foreign-auxiliary'])test('CABU adoption refuse sans écrasement : '+variant,async t=>{
 const h=await orphanRegistryFixture(t),target=join(h.destination,'controller-runs.json');
 if(variant==='foreign-registry')await writeFile(target,'{"foreign":true}');
 if(variant==='foreign-proof')await writeFile(join(h.destination,'runtime-migration.json'),JSON.stringify({protocol:'cab-private-state-migration-v1',transactionId:'update-00000000-0000-0000-0000-000000000000',workspace:h.c.workspace}),{mode:0o600});
 if(variant==='foreign-auxiliary')await writeFile(join(h.destination,'controller-job.json'),'{"foreign":true}',{mode:0o600});
 const before=await readFile(target);await assert.rejects(updateComponents(h.c,h.options),/destination-divergent|destination-proof-divergent|forward-recovery-required/);
 assert.equal((await h.receipt()).id,h.before.id);assert.deepEqual(await readFile(target),before);assert.equal(await readFile(join(h.source,'controller-runs.json'),'utf8'),h.bytes);
 await assert.rejects(readFile(join(h.destination,'runtime-layout.json')),{code:'ENOENT'});
});
test('CABU adoption : interruption après copie puis reprise du même reçu sans réécriture',async t=>{
 const h=await orphanRegistryFixture(t);let crashed=false;
 h.options.onPhase=async(phase,receipt)=>{if(!crashed&&phase==='INSTALLING'&&receipt.runtimeMigration?.state==='COPIED'){crashed=true;throw Object.assign(new Error('isolated-crash'),{code:'SIMULATED_CRASH'});}};
 await assert.rejects(updateComponents(h.c,h.options),/forward-recovery-required/);const partial=await h.receipt();assert.equal(partial.runtimeMigration.registryAdoption.state,'VERIFIED');
 const bytes=await readFile(join(h.destination,'controller-runs.json'));delete h.options.onPhase;
 const result=await updateComponents(h.c,h.options);assert.equal(result.status,'completed');assert.equal(result.transactionId,partial.id);assert.deepEqual(await readFile(join(h.destination,'controller-runs.json')),bytes);
});

test('CABU adoption : source et cible changées ensemble ne remplacent pas l’empreinte capturée',async t=>{
 const h=await orphanRegistryFixture(t);let captured=false;
 h.options.onPhase=async(phase,receipt)=>{if(!captured&&phase==='PREPARED'&&receipt.runtimeMigration?.state==='CAPTURED'){
  captured=true;await writeFile(join(h.source,'controller-runs.json'),h.bytes+' ');await writeFile(join(h.destination,'controller-runs.json'),h.bytes+' ');
  throw Object.assign(new Error('isolated-capture'),{code:'SIMULATED_CRASH'});
 }};
 await assert.rejects(updateComponents(h.c,h.options),/forward-recovery-required/);const before=await h.receipt();delete h.options.onPhase;
 await assert.rejects(updateComponents(h.c,h.options),error=>error.failureCode==='update-migration-source-changed');
 assert.equal((await h.receipt()).id,before.id);assert.equal(await readFile(join(h.destination,'controller-runs.json'),'utf8'),h.bytes+' ');
 await assert.rejects(readFile(join(h.destination,'runtime-layout.json')),{code:'ENOENT'});
});

async function interruptedCapturedMigration(t) {
 const h=await privateMigrationFixture(t,{offline:true});
 h.options.onPhase=async (phase,receipt)=>{if(phase==='PREPARED'&&receipt.runtimeMigration?.state==='CAPTURED')throw Object.assign(new Error('interrupted'),{code:'SIMULATED_CRASH'});};
 await assert.rejects(updateComponents(h.c,h.options),/interrupted|forward-recovery-required/);
 delete h.options.onPhase;
 const before=await h.receipt(),info=await h.options.openCodeClient.info(true);
 h.options.openCodeClient.info=async()=>({...info,pid:info.pid+1});
 h.options.openCodeClient.mcpRecoverySnapshot=async()=>({pid:info.pid+1,version:info.version,sharedDirectory:await h.options.openCodeClient.sharedMcpDirectory(),sessionCount:1,sessionIdsSha256:'a'.repeat(64),activeSessionCount:0,sharedPermissionCount:0});
 await assert.rejects(updateComponents(h.c,h.options),e=>e.failureCode==='update-migration-native-changed');
 return {...h,before};
}
test('CABU recapture : identité changée avant copie, même reçu et audit conservés',async t=>{
 const h=await interruptedCapturedMigration(t);
 await assert.rejects(updateComponents(h.c,h.options),e=>e.failureCode==='update-migration-native-changed');
 const result=await updateComponents({...h.c,recaptureMigration:h.before.id},h.options);
 assert.equal(result.status,'completed');assert.equal(result.transactionId,h.before.id);
 const root=join(h.c.home,'.local/state/cab-approval-bridge-update',h.before.id);
 const audit=JSON.parse(await readFile(join(root,'runtime-migration-native-recovery.json')));
 assert.equal(audit.state,'VERIFIED');assert.notEqual(audit.before.nativeIdentity.pid,audit.after.nativeIdentity.pid);
 assert.equal(await readFile(join(h.source,'controller-runs.json'),'utf8'),h.bytes);
});
for(const variant of ['busy','source','wrong-receipt','copied'])test('CABU recapture refuse '+variant,async t=>{
 const h=await interruptedCapturedMigration(t),c={...h.c,recaptureMigration:h.before.id};
 if(variant==='busy'){const snapshot=h.options.openCodeClient.mcpRecoverySnapshot;h.options.openCodeClient.mcpRecoverySnapshot=async()=>({...await snapshot(),activeSessionCount:1});}
 if(variant==='source')await writeFile(join(h.source,'controller-runs.json'),h.bytes+' ');
 if(variant==='wrong-receipt')c.recaptureMigration='update-00000000-0000-0000-0000-000000000000';
 if(variant==='copied'){const root=join(h.c.home,'.local/state/cab-approval-bridge-update');const receipt=await h.receipt();receipt.runtimeMigration.state='COPIED';for(const file of [join(root,'current.json'),join(root,receipt.id,'receipt.json')])await writeFile(file,JSON.stringify(receipt));}
 await assert.rejects(updateComponents(c,h.options));
 assert.equal((await h.receipt()).id,h.before.id);
 await assert.rejects(readFile(join(h.c.home,'.local/state/cab-approval-bridge-update',h.before.id,'runtime-migration-native-recovery.json')),{code:'ENOENT'});
});

test('CABU recapture : rollback explicite avant copie ne relance pas la migration',async t=>{
 const h=await interruptedCapturedMigration(t);
 const result=await updateComponents(h.c,{...h.options,rollbackOnly:true});
 assert.equal(result.status,'rolled-back');assert.equal((await h.receipt()).phase,'ROLLED_BACK');
 assert.equal(await readFile(join(h.source,'controller-runs.json'),'utf8'),h.bytes);
});
test('CABU recapture : interruption après audit reprend sans remplacer la preuve initiale',async t=>{
 const h=await interruptedCapturedMigration(t),c={...h.c,recaptureMigration:h.before.id},info=h.options.openCodeClient.info;
 h.options.openCodeClient.info=async()=>{throw Object.assign(new Error('interrupted-after-audit'),{code:'SIMULATED_CRASH'});};
 await assert.rejects(updateComponents(c,h.options));h.options.openCodeClient.info=info;
 const path=join(h.c.home,'.local/state/cab-approval-bridge-update',h.before.id,'runtime-migration-native-recovery.json');
 const before=JSON.parse(await readFile(path));assert.equal(before.state,'VERIFIED');
 const result=await updateComponents(c,h.options);assert.equal(result.status,'completed');
 assert.deepEqual(JSON.parse(await readFile(path)),before);
});

for(const divergent of [false,true])test('CABU recapture : copie partielle '+(divergent?'divergente refusée':'identique reprise'),async t=>{
 const h=await interruptedCapturedMigration(t),root=join(h.c.home,'.local/state/cab-approval-bridge-update',h.before.id);
 const proof=JSON.parse(await readFile(join(root,'runtime-migration.json'))),destination=(await h.receipt()).runtimeMigration.destination;
 await mkdir(destination,{recursive:true,mode:0o700});
 await writeFile(join(destination,'runtime-layout.json'),JSON.stringify({schema:1,workspace:h.c.workspace,source:h.source,phase:'COPYING',files:proof.sourceFiles}),{mode:0o600});
 await writeFile(join(destination,'controller-runs.json'),h.bytes+(divergent?' ':''),{mode:0o600});
 const call=updateComponents({...h.c,recaptureMigration:h.before.id},h.options);
 if(divergent)await assert.rejects(call,e=>e.failureCode==='update-migration-copy-divergent');
 else {const result=await call;assert.equal(result.status,'completed');assert.equal(result.transactionId,h.before.id);}
});

for(const attempts of [0,1])test('CABU recapture : état superviseur sans job, tentatives '+attempts,async t=>{
 const h=await interruptedCapturedMigration(t),root=join(h.c.home,'.local/state/cab-approval-bridge-update',h.before.id);
 const proof=JSON.parse(await readFile(join(root,'runtime-migration.json'))),destination=(await h.receipt()).runtimeMigration.destination;
 // Include the technical source in the captured inventory before interrupting the copy.
 const source=join(h.source,'supervisor-state.json');await writeFile(source,'{"state":"WAITING"}',{mode:0o775});
 proof.sourceFiles.push({name:'supervisor-state.json',sha256:createHash('sha256').update(await readFile(source)).digest('hex')});
 await writeFile(join(root,'runtime-migration.json'),JSON.stringify(proof));
 await mkdir(destination,{recursive:true,mode:0o700});
 await writeFile(join(destination,'runtime-layout.json'),JSON.stringify({schema:1,workspace:h.c.workspace,source:h.source,phase:'COPYING',files:proof.sourceFiles}),{mode:0o600});
 const old=JSON.stringify({state:'WAITING',reason:'reconciliation-failed',resumeInFlight:false,resumeAttemptCount:attempts,lastReconciliationAt:null,lastResumeAttempt:{result:'failed'}});
 await writeFile(join(destination,'supervisor-state.json'),old,{mode:0o600});
 const call=updateComponents({...h.c,recaptureMigration:h.before.id},h.options);
 if(attempts)await assert.rejects(call,e=>e.failureCode==='update-migration-copy-divergent');
 else {const result=await call;assert.equal(result.status,'completed');assert.equal(await readFile(join(root,'recapture-supervisor-state.backup.json'),'utf8'),old);}
});

test('CABU recapture : broker courant avancé après copie, audit et cible historique conservés',async t=>{
 const h=await failedOfflineReceipt(t,{classic:true,cabSource:true}),root=join(h.c.home,'.local/state/cab-approval-bridge-update'),receipt=await h.receipt();
 receipt.version='2.3.4';
 for(let i=0;i<receipt.files.length;i++){const file=receipt.files[i],path=join(root,receipt.id,'stage',String(i)),data=(await readFile(path,'utf8')).replaceAll(CURRENT_VERSION,receipt.version);await writeFile(path,data);file.afterHash=createHash('sha256').update(data).digest('hex');}
 for(const path of [join(root,'current.json'),join(root,receipt.id,'receipt.json')])await writeFile(path,JSON.stringify(receipt));
 let interrupted=false;h.options.onPhase=async(phase,r)=>{if(!interrupted&&phase==='INSTALLING'&&r.runtimeMigration?.state==='COPIED'){interrupted=true;throw Object.assign(new Error('interrupt'),{code:'SIMULATED_CRASH'});}};
 await assert.rejects(updateComponents(h.c,h.options));delete h.options.onPhase;
 for(const name of ['cgpt_approval_bridge_server.py','cgpt_approval_bridge_router.py','cgpt_approval_bridge_journal.py'])await writeFile(join(h.c.brokerDirectory,name),await readFile(join(h.c.pluginRoot,'broker',name)));
 const result=await updateComponents(h.c,h.options);assert.equal(result.status,'completed');assert.equal(result.version,'2.3.4');assert.equal(result.nextUpdateRequired,true);
 assert.equal(result.transactionId,receipt.id);assert.equal((await h.receipt()).offlineRecovery.observedBrokerFiles.length,3);
});
