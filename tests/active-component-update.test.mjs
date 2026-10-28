import assert from 'node:assert/strict';
import test from 'node:test';
import { chmod, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile, symlink, link, unlink, lstat } from 'node:fs/promises';
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
  await chmod(directory,0o755);
  const parent=await processIdentity(process.pid),manifest={};
  for(const name of BROKER_ARTIFACT_FILES)manifest[name]=createHash('sha256').update(await readFile(join(directory,name))).digest('hex');
  const proof={authorization:'isolated source proof',entry:join(directory,BROKER_ARTIFACT_FILES[0]),expectedUid:process.getuid(),expectedGid:(await lstat(join(directory,BROKER_ARTIFACT_FILES[0]))).gid,
    manifest,loadedVersion:'1.7.1',instanceId:'inst-isolated-proof',opencodeProcess:parent,brokerProcess:{...parent,pid:parent.pid+1}};
  return {root,directory,proof};
}

test('broker externe : trois artefacts cibles vérifiés sans mutation et processus antérieur annoncé séparément',async(t)=>{
  const h=await artifactFixture(t),before=await inspectBrokerArtifacts(h.directory,h.proof);
  assert.equal(before.version,'2.1.2');assert.equal(h.proof.loadedVersion,'1.7.1');
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
  await cp(new URL('../plugins/cab-approval-bridge/', import.meta.url), c.pluginRoot, { recursive: true });
  const scripts = join(c.home, '.local/share/cab-approval-bridge');
  const monitor = join(c.home, '.local/share/cab-approval-bridge-monitor');
  const units = join(c.home, '.config/systemd/user');
  const copyOld = async (source, target) => {
    await mkdir(target, { recursive: true }); await cp(source, target, { recursive: true });
    for (const entry of await readdir(target, { withFileTypes: true })) {
      if (entry.isFile()) {
        const path = join(target, entry.name); await writeFile(path, (await readFile(path, 'utf8')).replaceAll('2.1.2', '1.7.0'));
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
      if (state.wrongBroker && state.brokerVersion === '2.1.2') state.brokerVersion = '1.7.0';
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
      mcp: async (directory) => {
        state.events.push(['http', '/api/mcp', directory]);
        if (state.openCodeOffline) throw Object.assign(new Error('opencode-offline'), { code: 'update-source-unavailable' });
        return { 'cgpt-validation': { status: state.broker ? 'connected' : 'disabled' } };
      },
      disconnectMcp: async (_server, directory) => {
        state.events.push(['http', '/api/experimental/mcp/cgpt-validation/disconnect', directory]);
        if (state.openCodeOffline) throw Object.assign(new Error('opencode-offline'), { code: 'update-source-unavailable' });
        state.broker = false;
      },
      connectMcp: async (_server, directory) => {
        state.events.push(['http', '/api/experimental/mcp/cgpt-validation/connect', directory]);
        if (state.openCodeOffline) throw Object.assign(new Error('opencode-offline'), { code: 'update-source-unavailable' });
        state.broker = true; state.brokerVersion = version(await readFile(join(c.brokerDirectory, 'cgpt_approval_bridge_server.py'), 'utf8'));
        if (state.wrongBroker && state.brokerVersion === '2.1.2') state.brokerVersion = '1.7.0';
      },
    },
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

test('mise à jour forcée : les quatre briques sont installées et les trois unités redémarrées à chaque invocation', async (t) => {
  const h = await fixture(t, { realSyntax: true }); const before = await readFile(h.runtime, 'utf8');
  const result = await updateComponents(h.c, h.options);
  assert.equal(result.status, 'completed'); assert.equal(result.version, '2.1.2');
  assert.deepEqual(h.state.versions, { controller: '2.1.2', supervisor: '2.1.2', monitor: '2.1.2' });
  assert.equal(h.state.brokerVersion, '2.1.2'); assert.equal(h.state.global, null);
  assert.equal(await readFile(h.runtime, 'utf8'), before); assert.equal(await readFile(h.catalog, 'utf8'), 'ARCHIVE-SENTINEL');
  assert.equal(h.state.run.suspension.action, 'PAUSE');
  const brokerActions = h.state.events.filter((event) => ['/api/experimental/mcp/cgpt-validation/disconnect','/api/experimental/mcp/cgpt-validation/connect'].includes(event[1]));
  assert.deepEqual(brokerActions.map((event) => event[1]), ['/api/experimental/mcp/cgpt-validation/disconnect','/api/experimental/mcp/cgpt-validation/connect']);
  assert.ok(brokerActions.every((event) => event[2] === h.c.workspace));
  const stopped = h.state.events.filter((event) => event[1] === 'stop').length;
  assert.equal(stopped, 3);
  assert.equal((await updateComponents(h.c, h.options)).status, 'completed');
  assert.equal(h.state.events.filter((event) => event[1] === 'stop').length, stopped + 3);
  assert.ok(!JSON.stringify(h.state.events).includes('instance/dispose'));
});

test('services initialement inactifs : les trois unités sont démarrées après mise à jour vérifiée', async (t) => {
  const h = await fixture(t, { active: ['monitor'], broker: false });
  const result = await updateComponents(h.c, h.options);
  assert.equal(result.status, 'completed');
  assert.deepEqual(h.state.services, { controller: true, supervisor: true, monitor: true });
  assert.equal(version(await readFile(h.entry('controller'), 'utf8')), '2.1.2');
  for (const component of ['controller','supervisor','monitor']) {
    assert.ok(h.state.events.some((event) => event[1] === 'start' && event[2] === `cgpt-approval-bridge-${component}.service`));
  }
  assert.ok(!JSON.stringify(h.state.events).includes('enable'));
});

test('un jeu déjà déployé redémarre systématiquement les trois unités', async (t) => {
  const h = await fixture(t, { active: ['supervisor','monitor'], runSuspension: null });
  const copies = [
    [join(h.c.pluginRoot,'scripts'),join(h.c.home,'.local/share/cab-approval-bridge')],
    [join(h.c.pluginRoot,'scripts'),join(h.c.home,'.local/share/cab-approval-bridge-monitor/scripts')],
    [join(h.c.pluginRoot,'web-monitor'),join(h.c.home,'.local/share/cab-approval-bridge-monitor/web-monitor')],
    [join(h.c.pluginRoot,'systemd'),join(h.c.home,'.config/systemd/user')],
    [join(h.c.pluginRoot,'broker'),h.c.brokerDirectory],
  ];
  for (const [source,target] of copies) await cp(source,target,{recursive:true,force:true});
  h.state.versions={controller:'2.1.2',supervisor:'2.1.2',monitor:'2.1.2'};
  h.state.brokerVersion='2.1.2';
  const result=await updateComponents(h.c,h.options);
  assert.equal(result.status,'completed');
  assert.deepEqual(h.state.services,{controller:true,supervisor:true,monitor:true});
  assert.equal(h.state.run.suspension,undefined);
  assert.ok(!h.state.events.some((event)=>event[1]==='/coordination/global/request'));
  assert.equal(h.state.events.filter((event)=>event[1]==='stop').length,3);
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
  assert.equal(version(await readFile(brokerEntry,'utf8')),'2.1.2');
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
  assert.equal(result.brokerArtifactVersion,'2.1.2');
  assert.equal(result.brokerRuntimeVersion,null);
  assert.equal(result.brokerRuntimeStatus,'INDISPONIBLE');
  assert.equal(version(await readFile(join(h.c.brokerDirectory,'cgpt_approval_bridge_server.py'),'utf8')),'2.1.2');
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
  assert.equal(version(await readFile(h.entry('controller'), 'utf8')), '2.1.2');
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

test('interruption au bilan final : reprise idempotente et nouveau redémarrage', async (t) => {
  const h = await fixture(t);
  h.options.onPhase = async (phase) => {
    if (phase === 'RELEASING') throw Object.assign(new Error('crash'), { code: 'SIMULATED_CRASH' });
  };
  await assert.rejects(updateComponents(h.c, h.options), /crash/);
  const stops = h.state.events.filter((event) => event[1] === 'stop').length;
  delete h.options.onPhase;
  assert.equal((await updateComponents(h.c, h.options)).status, 'completed');
  assert.equal(h.state.events.filter((event) => event[1] === 'stop').length, stops + 3);
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
  assert.equal(result.brokerArtifactVersion, '2.1.2');
  assert.equal(version(await readFile(join(c.home, '.local/share/cab-approval-bridge-monitor/scripts/cgpt-approval-bridge-opencode-client.mjs'), 'utf8')), '2.1.2');
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
  assert.equal(result.version,'2.1.2');
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
  assert.equal((await updateComponents(h.c, h.options)).status, 'completed');
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
  assert.equal(version(await readFile(h.entry('controller'),'utf8')),'2.1.2');
});


test('broker 1.9.0 chargé vers artefacts 2.1.2 : admission fermée sans mutation',async(t)=>{
  const h=await artifactFixture(t);h.proof.loadedVersion='1.9.0';
  assert.equal(validateBrokerProof(h.proof,h.directory),h.proof);
  const before=await inspectBrokerArtifacts(h.directory,h.proof);
  assert.equal(before.version,'2.1.2');assert.equal(h.proof.loadedVersion,'1.9.0');
  for(const loadedVersion of ['1.7.1','1.8.0','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.10.5','1.10.6','1.10.7','1.10.8','1.10.9','1.10.10','2.1.0','2.1.1','2.1.2'])assert.equal(validateBrokerProof({...h.proof,loadedVersion},h.directory).loadedVersion,loadedVersion);
  for(const loadedVersion of ['1.9.1','1.9.0+codex.20261025101020','1.10.12','2.1.2+codex.20261028011316',null])assert.throws(()=>validateBrokerProof({...h.proof,loadedVersion},h.directory),/proof-invalid/);
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

test('un rapport contrôleur trop volumineux conserve le journal de récupération',async(t)=>{
  const h=await networkFixture(t,{statusPadding:2*1024*1024+1});
  await assert.rejects(updateComponents(h.c,h.options),/update-recovery-required/);
  // An unverified controller must not receive a freshly connected broker.
  assert.equal(h.state.broker,false);
  assert.deepEqual(h.state.versions,{controller:'1.7.0',supervisor:'1.7.0',monitor:'1.7.0'});
  assert.deepEqual(h.state.services,{controller:true,supervisor:true,monitor:true});
  assert.equal((await h.receipt()).phase,'ROLLBACK_FAILED');
});

test('CABU chronométré : coupure courte, cache exact et redémarrage à chaud', async (t) => {
  const h = await fixture(t, { realSyntax: true });
  h.options.now = () => { h.state.now = Date.now(); return h.state.now; };
  h.options.sleep = ms => new Promise(resolve => setTimeout(resolve, Math.min(ms, 10)));
  const cold = await updateComponents(h.c, h.options);
  const warm = await updateComponents(h.c, h.options);
  for (const result of [cold, warm]) {
    assert.equal(result.status, 'completed');
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
  assert.equal(result.status, 'completed'); assert.equal(result.brokerRuntimeVersion, '2.1.2');
  assert.ok(h.state.events.some(event => event[1].endsWith('/disconnect')));
});
