import { constants } from 'node:fs';
import { lstat, mkdir, open, readFile, realpath, readdir, rename, unlink, readlink, symlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { FROZEN_PROFILE, FROZEN_CAPABILITY, collectFrozenProof, proofHash, moduleManifest,
  processIdentity, originalGone, maintenanceHttp, readBootstrapJournal, validateFrozenTarget,
  inspectControllerInstallation, checkInstallationJournal } from './cgpt-approval-bridge-maintenance-proof.mjs';
import { validateBrokerProof, inspectBrokerArtifacts, inspectBrokerProcess } from './cgpt-approval-bridge-broker-artifact-proof.mjs';
import { prepareUpdateCredential } from './cgpt-approval-bridge-update-credential.mjs';
import { createOpenCodeV2ClientFromEnv } from './cgpt-approval-bridge-opencode-client.mjs';

export const VERSION = '2.1.28';
const REGISTRY_MAX_BYTES = 16 * 1024 * 1024;
const exec = promisify(execFile);
const hash = (data) => createHash('sha256').update(data).digest('hex');
const error = (code) => Object.assign(new Error(code), { code });
const safeCauseCode = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value) ? value : 'unexpected-error';
const brokerFiles = ['cgpt_approval_bridge_server.py', 'cgpt_approval_bridge_router.py', 'cgpt_approval_bridge_journal.py'];
const unit = (name) => 'cgpt-approval-bridge-' + name + '.service';
const complete = new Set(['COMPLETED', 'ROLLED_BACK', 'PREPARATION_FAILED']);
const recoveryPhases = ['PREPARED', 'STOPPING', 'RESTARTING', 'VERIFYING', 'ROLLING_BACK'];
const recoverySnapshotKeys = ['pid','version','sharedDirectory','sessionCount','sessionIdsSha256','activeSessionCount','sharedPermissionCount'];
const validRecoverySnapshot = value => value && typeof value === 'object' &&
  Object.keys(value).length === recoverySnapshotKeys.length && recoverySnapshotKeys.every(key => Object.hasOwn(value,key)) &&
  Number.isSafeInteger(value.pid) && value.pid > 0 && typeof value.version === 'string' && /^2\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(value.version) &&
  typeof value.sharedDirectory === 'string' && isAbsolute(value.sharedDirectory) &&
  ['sessionCount','activeSessionCount','sharedPermissionCount'].every(key => Number.isSafeInteger(value[key]) && value[key] >= 0) &&
  /^[a-f0-9]{64}$/.test(value.sessionIdsSha256 || '');
const sameRecoveryIdentity = (a,b) => ['pid','version','sharedDirectory','sessionCount','sessionIdsSha256'].every(key => a[key] === b[key]);
const within = (root, target) => { const path = relative(root, target); return !path || (!path.startsWith('../') && path !== '..' && !isAbsolute(path)); };
const baseVersion = (value) => typeof value === 'string' && /^\d+\.\d+\.\d+(?:\+codex\.\d{14})?$/.test(value) ? value.split('+')[0] : null;
const newer = (a, b) => {
  const left = a.split('.').map(Number), right = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] > right[i];
  return false;
};
const sourceVersion = (data) => data.toString('utf8').match(/^(?:export )?(?:const )?(?:VERSION|SERVER_VERSION|version)\s*=\s*["']([^"']+)["']/m)?.[1] || null;

async function directories(path, create = false) {
  let cursor = '/';
  for (const part of resolve(path).split('/').filter(Boolean)) {
    cursor = join(cursor, part);
    if (create) {
      try { await mkdir(cursor, { mode: 0o700 }); }
      catch (cause) { if (cause.code !== 'EEXIST') throw cause; }
    }
    const stat = await lstat(cursor);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw error('update-unsafe-directory');
  }
}
async function regular(path, limit = 4 * 1024 * 1024) {
  await directories(dirname(path));
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > limit) throw error('update-unsafe-file');
    return { data: await file.readFile(), mode: stat.mode & 0o777, ino: stat.ino, uid: stat.uid };
  } finally { await file.close(); }
}
async function optional(path) {
  try { return await regular(path); } catch (cause) { if (cause.code === 'ENOENT') return null; throw cause; }
}
async function atomic(path, data, mode = 0o600) {
  await directories(dirname(path), true);
  await optional(path);
  const temporary = join(dirname(path), '.cab-update-' + randomUUID() + '.tmp');
  const file = await open(temporary, 'wx', mode);
  try { await file.writeFile(data); await file.chmod(mode); await file.sync(); } finally { await file.close(); }
  await rename(temporary, path);
  const directory = await open(dirname(path), 'r');
  try { await directory.sync(); } finally { await directory.close(); }
}
async function command(args) {
  try { return (await exec('/usr/bin/systemctl', ['--user', ...args], { timeout: 15000, maxBuffer: 16384 })).stdout; }
  catch { throw error('update-systemd-failed'); }
}
async function http(base, path, body) {
  let response;
  try {
    response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST',
      redirect: 'error', signal: AbortSignal.timeout(5000), headers: { 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const limit = body === undefined && ['/runs', '/status'].includes(path) ? REGISTRY_MAX_BYTES : 2 * 1024 * 1024;
    const chunks = []; let bytes = 0;
    for await (const chunk of response.body) {
      bytes += chunk.length; if (bytes > limit) throw error('update-response-too-large'); chunks.push(chunk);
    }
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!response.ok) throw Object.assign(error('update-source-refused'), { status: response.status });
    return value;
  } catch (cause) { if (cause.code?.startsWith('update-')) throw cause; throw error('update-source-unavailable'); }
}
async function syntax(path, work) {
  const python = path.endsWith('.py');
  try {
    await exec(python ? 'python3' : process.execPath, python ? ['-m', 'py_compile', path] : ['--check', path],
      { timeout: 15000, maxBuffer: 4096, env: { ...process.env, PYTHONPYCACHEPREFIX: join(work, 'pycache') } });
  } catch { throw error('update-syntax-invalid'); }
}
async function authority(path) {
  const child = spawn('python3', [fileURLToPath(new URL('./cgpt-approval-bridge-registry-lock.py', import.meta.url)), path],
    { stdio: ['pipe', 'pipe', 'ignore'] });
  child.stdin.on('error', () => {});
  try {
    await new Promise((resolve, reject) => {
      let output = '', settled = false;
      const finish = (failure) => {
        if (settled) return; settled = true; clearTimeout(timer);
        if (failure) reject(failure); else resolve();
      };
      const timer = setTimeout(() => finish(error('update-lock-unavailable')), 5000);
      child.once('error', () => finish(error('update-lock-unavailable')));
      child.once('exit', () => finish(error('update-already-running')));
      child.stdout.on('data', (chunk) => {
        if (settled) return;
        output += chunk;
        if (output.trim() === 'READY') finish(); else if (output.length > 1024) finish(error('update-lock-unavailable'));
      });
    });
  } catch (cause) { child.stdin.end(); child.kill('SIGTERM'); throw cause; }
  return { process: child, async close() {
    if (child.exitCode !== null || child.signalCode !== null) return;
    await new Promise((done) => {
      const timer = setTimeout(() => child.kill('SIGTERM'), 3000);
      child.once('exit', () => { clearTimeout(timer); done(); }); child.stdin.end();
    });
  } };
}
function configuration(input) {
  const c = { home: homedir(), controllerUrl: 'http://127.0.0.1:8788', supervisorUrl: 'http://127.0.0.1:8789',
    monitorUrl: 'http://127.0.0.1:8790', opencodeUrl: 'http://127.0.0.1:4096', waitMs: 120000, ...input };
  for (const key of ['home', 'workspace', 'pluginRoot', ...(c.profile === FROZEN_PROFILE && c.brokerDirectory === undefined ? [] : ['brokerDirectory'])]) {
    if (typeof c[key] !== 'string' || !isAbsolute(c[key]) || resolve(c[key]) === '/') throw error('update-path-invalid');
    c[key] = resolve(c[key]);
  }
  if (!Number.isSafeInteger(c.waitMs) || c.waitMs < 0 || c.waitMs > 900000) throw error('update-wait-invalid');
  for (const key of ['controllerUrl', 'supervisorUrl', 'monitorUrl', 'opencodeUrl']) {
    let url;
    try { url = new URL(c[key]); } catch { throw error('update-url-invalid'); }
    if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
        url.username || url.password || url.search || url.hash || url.pathname !== '/') throw error('update-url-invalid');
    c[key] = url.origin;
  }
  c.roots = { scripts: join(c.home, '.local/share/cab-approval-bridge'),
    monitorScripts: join(c.home, '.local/share/cab-approval-bridge-monitor/scripts'),
    web: join(c.home, '.local/share/cab-approval-bridge-monitor/web-monitor'),
    units: join(c.home, '.config/systemd/user'), ...(c.brokerDirectory && c.brokerPolicy !== 'reuse-readonly' ? { broker: c.brokerDirectory } : {}) };
  const cacheRoots = [join(c.home, '.codex/plugins/cache')];
  const cacheAt = c.pluginRoot.indexOf('/plugins/cache/');
  if (cacheAt >= 0) cacheRoots.push(c.pluginRoot.slice(0, cacheAt) + '/plugins/cache');
  for (const [group, target] of Object.entries(c.roots)) {
    if (cacheRoots.some((cache) => within(cache, target))) throw error('update-cache-destination-refused');
    const cabSource = c.brokerPolicy === 'cab-source' && group === 'broker' && target === join(c.workspace, 'src');
    if ((!cabSource && within(c.workspace, target)) || within(c.pluginRoot, target) || within(target, c.pluginRoot) || within(target, c.workspace)) {
      throw error('update-project-destination-refused');
    }
  }
  if (c.serviceWorkspace !== undefined && (c.brokerPolicy !== 'cab-source' || !isAbsolute(c.serviceWorkspace) || resolve(c.serviceWorkspace) === '/')) throw error('update-service-workspace-invalid');
  c.serviceWorkspace = c.serviceWorkspace === undefined ? c.workspace : resolve(c.serviceWorkspace);
  c.state = join(c.home, '.local/state/cab-approval-bridge-update');
  if (within(c.workspace, c.state) || within(c.pluginRoot, c.state)) throw error('update-project-destination-refused');
  return c;
}
const runIdentity = (registry) => hash(JSON.stringify({
  runs: [...registry.runs].sort((a, b) => a.runId.localeCompare(b.runId)).map((run) =>
    [run.runId, run.changeId, run.sessionId, run.contextId, run.version, run.state, run.suspension || null, run.resources]),
  requestOwners: Object.entries(registry.requestOwners || {}).sort(([a], [b]) => a.localeCompare(b)) }));

export async function updateComponents(input, options = {}) {
  if (input.recoverMcp !== undefined && (!/^update-[a-f0-9-]{36}$/.test(input.recoverMcp) || input.profile !== undefined || input.brokerPolicy === 'reuse-readonly')) throw error('update-mcp-recovery-authorization-invalid');
  if (input.profile === FROZEN_PROFILE) {
    if (input.brokerPolicy !== undefined || input.brokerProof !== undefined) throw error('update-broker-policy-profile-invalid');
    return maintainFrozenController(input, options);
  }
  if (input.profile !== undefined) throw error('update-profile-invalid');
  if (input.layout !== undefined && input.layout !== 'managed-release') throw error('update-layout-invalid');
  if (input.brokerPolicy !== undefined && !['install','cab-source','reuse-readonly'].includes(input.brokerPolicy)) throw error('update-broker-policy-invalid');
  const c = configuration(input);
  if (input.brokerPolicy === 'cab-source') {
    if (c.brokerDirectory !== join(c.workspace, 'src')) throw error('update-cab-source-invalid');
    await directories(c.workspace);
    await directories(c.brokerDirectory);
    for (const name of brokerFiles) await regular(join(c.brokerDirectory, name));
    const project = (await regular(join(c.workspace, 'pyproject.toml'))).data.toString('utf8');
    const local = JSON.parse((await regular(join(c.workspace, 'plugins/cab-approval-bridge/.codex-plugin/plugin.json'))).data);
    const installed = JSON.parse((await regular(join(c.pluginRoot, '.codex-plugin/plugin.json'))).data);
    if (!/^\[project\]\s*\nname\s*=\s*["']cab["']\s*$/m.test(project) ||
        local.name !== 'CAB' || JSON.stringify(local) !== JSON.stringify(installed)) throw error('update-cab-source-invalid');
  }
  const readonlyBroker = input.brokerPolicy === 'reuse-readonly';
  if (readonlyBroker) {
    if (input.layout !== 'managed-release') throw error('update-broker-policy-layout-invalid');
    validateBrokerProof(input.brokerProof,c.brokerDirectory);
  } else if (input.brokerProof !== undefined) throw error('update-broker-policy-invalid');
  const service = options.serviceCommand || command, request = options.http || http;
  const openCode = options.openCodeClient || createOpenCodeV2ClientFromEnv({ directory: c.serviceWorkspace, baseUrl: c.opencodeUrl,
    ...(options.openCodeFetch ? { fetchImpl: options.openCodeFetch } : {}) });
  const validate = options.syntax || syntax;
  const syntaxCachePath = join(c.state, 'syntax-cache.json');
  const validationKeys = new Set();
  let syntaxCache = {};
  let validatorIdentity;
  async function validateCached(path, data) {
    if (!validatorIdentity) {
      const python = options.syntax ? 'injected-validator' : (await exec('python3', ['--version'], { timeout: 5000 })).stdout.trim();
      validatorIdentity = [process.execPath, process.version, python];
      if (!options.syntax) {
        const cached = await optional(syntaxCachePath);
        if (cached && cached.uid === process.getuid() && !(cached.mode & 0o077)) {
          try { const value = JSON.parse(cached.data); if (value && typeof value === 'object' && !Array.isArray(value)) syntaxCache = value; } catch { syntaxCache = {}; }
        }
      }
    }
    const key = hash(JSON.stringify([validatorIdentity, path.endsWith('.py') ? 'py' : 'mjs', hash(data)]));
    if (!validationKeys.has(key) && (options.syntax || syntaxCache[key] !== true)) {
      const exact = join(transaction(), 'syntax-' + key + (path.endsWith('.py') ? '.py' : '.mjs'));
      await atomic(exact, data);
      await validate(exact, transaction());
    }
    validationKeys.add(key); syntaxCache[key] = true;
  }
  const now = options.now || Date.now;
  const sleep = options.sleep || ((ms) => new Promise((done) => setTimeout(done, ms)));
  const processProbe = options.processProbe;
  const contextKey = hash(JSON.stringify([c.home, c.workspace, c.brokerDirectory,
    c.controllerUrl, c.supervisorUrl, c.monitorUrl, c.opencodeUrl,
    ...(readonlyBroker ? ['reuse-readonly',proofHash(input.brokerProof)] : [])]));
  await directories(c.workspace); await directories(c.pluginRoot); await directories(c.state, true);
  const stateStat = await lstat(c.state);
  if (stateStat.uid !== process.getuid() || (stateStat.mode & 0o077)) throw error('update-private-state-required');
  const lock = await authority(join(c.state, 'update.lock'));
  let receipt;
  let receiptTrusted = false;
  let recovered = false;
  let forwardRecovery = false;
  let preparedMcpResume = false;
  const currentFile = join(c.state, 'current.json');
  const target = (file) => {
    if (!file || typeof file !== 'object' || !Object.hasOwn(c.roots, file.group) ||
        typeof file.name !== 'string' || !/^[a-zA-Z0-9_.-]+$/.test(file.name) || file.name.startsWith('.')) throw error('update-journal-invalid');
    const allowed = file.group === 'broker' ? brokerFiles.includes(file.name) : file.group === 'units' ?
      ['controller', 'supervisor', 'monitor'].some((component) => file.name === unit(component)) : file.group === 'web' ?
        ['index.html', 'app.mjs', 'stats.mjs', 'style.css'].includes(file.name) : /^cgpt-approval-bridge-[a-z-]+\.(mjs|py)$/.test(file.name);
    if (!allowed) throw error('update-journal-invalid');
    return join(c.roots[file.group], file.name);
  };
  const transaction = () => join(c.state, receipt.id);
  const saveDeployment = () => atomic(join(c.state,'last-deployment.json'),JSON.stringify(Object.fromEntries(
    ['home','workspace','serviceWorkspace','brokerDirectory','brokerPolicy','layout','controllerUrl','supervisorUrl','monitorUrl','opencodeUrl']
      .filter(key=>c[key]!==undefined).map(key=>[key,c[key]])),null,2)+'\n');
  const desiredVersions = () => Object.fromEntries(['controller','supervisor','monitor','broker'].map((name)=>[name,receipt.version]));
  const targetActive = () => receipt.targetActive || receipt.active;
  const jobsIdentity = (status) => proofHash(Object.entries(status.mode === 'concurrent' ? status.runs || {} : { single:status })
    .sort(([a],[b])=>a.localeCompare(b)).map(([id,context])=>[id,context.job ? Object.fromEntries([
      'runId','jobId','sessionId','directory','changeId','criteria','strictCommands','armed','recovery','recoveryHistory',
      'revokedSessions','currentCabMandate','lifecycle','lastProvenMilestone'].map((key)=>[key,context.job[key] ?? null])) : null]));
  function requirePauses(snapshot, allowStop = true) {
    if (snapshot.runs.some((run)=>run.state === 'RESERVED' &&
        !(run.suspension?.action === 'PAUSE' || (allowStop && run.suspension?.action === 'STOP')))) {
      throw error('update-runs-not-paused');
    }
  }
  async function pauseRuns(snapshot) {
    const global = (await request(c.controllerUrl, '/coordination/global')).global;
    if (!receipt.maintenance || !['DRAINING','HELD'].includes(global?.state) || global.cause !== 'SHARED_MAINTENANCE' ||
        global.transactionId !== receipt.maintenance.transactionId || global.generation !== receipt.maintenance.generation) {
      throw error('update-maintenance-owner-changed');
    }
    for (const run of snapshot.runs) {
      if (run.state !== 'RESERVED' || ['PAUSE','STOP'].includes(run.suspension?.action)) continue;
      const paused = await request(c.controllerUrl, '/runs/' + encodeURIComponent(run.runId) + '/suspend', {
        version: run.version, action: 'PAUSE', evidence: ['cab-update-pause:' + receipt.id],
        maintenanceTransactionId: receipt.maintenance.transactionId,
        maintenanceGeneration: receipt.maintenance.generation });
      if (paused.runId !== run.runId || paused.state !== 'RESERVED' || paused.suspension?.action !== 'PAUSE') {
        throw error('update-run-pause-unconfirmed');
      }
    }
    const current = await registry();
    requirePauses(current);
    return current;
  }
  async function brokerArtifactsUnchanged() {
    if (!readonlyBroker) return;
    const actual = await inspectBrokerArtifacts(c.brokerDirectory,input.brokerProof,join(c.pluginRoot,'broker'));
    if (receipt?.externalBroker && proofHash(actual) !== proofHash(receipt.externalBroker.artifacts)) throw error('update-broker-artifact-changed');
    return actual;
  }
  async function restoreInitialServices() {
    if (!receipt?.servicesObserved) return;
    for (const component of ['supervisor','monitor','controller']) {
      const active = (await metadata(component)).ActiveState === 'active';
      if (receipt.active[component] && !active) await service(['start', unit(component)]);
      else if (!receipt.active[component] && active) await service(['stop', unit(component)]);
    }
  }
  async function requireStoredHeld() {
    const file = await regular(join(c.workspace,'.opencode/state/cgpt-approval-bridge/controller-runs.json'), REGISTRY_MAX_BYTES);
    if (file.uid !== process.getuid() || (file.mode & 0o077)) throw error('update-broker-registry-untrusted');
    const snapshot = JSON.parse(file.data), global=snapshot.coordination?.global;
    if (snapshot.schemaVersion !== 4 || snapshot.coordinationProtocol !== 'resource-scoped-v1' || snapshot.project !== c.workspace ||
        global?.state !== 'HELD' || global.transactionId !== receipt.id || global.generation !== receipt.maintenance?.generation ||
        runIdentity(snapshot) !== receipt.runIdentity) throw error('update-maintenance-owner-changed');
    requirePauses(snapshot); await brokerArtifactsUnchanged();
  }
  function brokerResult() {
    if (readonlyBroker) return { brokerArtifactPolicy:'reuse-readonly',brokerArtifactVersion:VERSION,
      brokerLoadedBefore:receipt.externalBroker.beforeLoadedVersion,brokerLoadedAfter:VERSION,
      brokerProcess:receipt.externalBroker.afterProcess,opencodeProcess:input.brokerProof.opencodeProcess };
    return { timings: receipt.timings || {}, brokerArtifactVersion:receipt.version, brokerRuntimeVersion:receipt.brokerConnected ? receipt.version : null,
      brokerRuntimeStatus:receipt.openCodeAvailable === false ? 'INDISPONIBLE' :
        receipt.brokerConnected ? 'VERIFIE' : 'NON_VERIFIE' };
  }
  async function releaseLink(root, logical, link, name) {
    if (isAbsolute(link)) throw error('update-managed-link-refused');
    const path=resolve(dirname(logical),link),tail=relative(root,path).split('/');
    if (tail[0]!=='releases'||!/^[A-Za-z0-9][A-Za-z0-9_.+-]{0,99}$/.test(tail[1]||'')||
        !['scripts','broker','web-monitor'].includes(tail[2])||tail.length!==(name?4:3)||
        (name&&tail[3]!==name)||relative(dirname(logical),path)!==link) throw error('update-managed-link-refused');
    await directories(name?dirname(path):path);return path;
  }
  async function managedPlan(group) {
    if(input.layout!=='managed-release'||group==='units'||(group==='broker'&&c.brokerPolicy==='cab-source'))return null;
    receipt.managed ||= {};
    if(receipt.managed[group])return receipt.managed[group];
    const logical=c.roots[group],stat=await lstat(logical);
    if(group==='broker') {
      const entry=join(logical,brokerFiles[0]);
      const entryStat=await lstat(entry).catch((cause)=>{if(cause.code==='ENOENT')return null;throw cause;});
      if(entryStat&&!entryStat.isSymbolicLink())return null;
    }
    const root=group==='monitorScripts'||group==='web'||stat.isSymbolicLink()?dirname(logical):logical;
    await directories(root);const owner=await lstat(root);
    if(owner.uid!==process.getuid()||(owner.mode&0o022)||logical.includes('/releases/'))throw error('update-managed-owner-divergent');
    const section=group==='web'?'web-monitor':group==='broker'?'broker':'scripts';
    const releaseId=receipt.version+'+update.'+receipt.id.slice(7);
    const plan={root,logical,section,directory:join(root,'releases',releaseId,section),mode:'links'};
    if(stat.isSymbolicLink()) {
      plan.mode='directory';plan.oldLink=await readlink(logical);
      plan.oldDirectory=await releaseLink(root,logical,plan.oldLink);
      plan.newLink=relative(dirname(logical),plan.directory);
    } else await directories(logical);
    receipt.managed[group]=plan;return plan;
  }
  async function deployed(file,recordEntry=false) {
    const path=target(file),plan=await managedPlan(file.group);
    if(!plan)return optional(path);
    if(plan.mode==='directory') {
      const link=await readlink(plan.logical);
      if(![plan.oldLink,plan.newLink].includes(link))throw error('update-managed-pointer-changed');
      return optional(join(await releaseLink(plan.root,plan.logical,link),file.name));
    }
    let stat;
    try{stat=await lstat(path);}catch(cause){if(cause.code!=='ENOENT')throw cause;}
    if(!stat) {if(recordEntry)file.originalKind='missing';return null;}
    if(stat.uid!==process.getuid()||stat.nlink!==1)throw error('update-managed-owner-divergent');
    if(stat.isSymbolicLink()) {
      const link=await readlink(path);
      if(!recordEntry&&link!==file.originalLink&&link!==relative(dirname(path),join(plan.directory,file.name)))throw error('update-managed-pointer-changed');
      if(recordEntry){file.originalKind='link';file.originalLink=link;}
      return regular(await releaseLink(plan.root,path,link,file.name));
    }
    if(recordEntry)file.originalKind='file';
    else if(file.originalKind!=='file')throw error('update-managed-pointer-changed');
    return regular(path);
  }
  async function linkSwitch(path,next) {
    const temp=join(dirname(path),'.cab-link-'+randomUUID());await symlink(next,temp);await rename(temp,path);
    const fd=await open(dirname(path),'r');try{await fd.sync();}finally{await fd.close();}
  }
  async function installManagedFiles() {
    for(let i=0;i<receipt.files.length;i++) {
      const file=receipt.files[i],plan=await managedPlan(file.group),data=(await regular(join(transaction(),'stage',String(i)))).data;
      if(hash(data)!==file.afterHash)throw error('update-stage-changed');
      if(!plan) {await atomic(target(file),data,file.mode);continue;}
      await directories(plan.directory,true);
      const path=join(plan.directory,file.name),present=await optional(path);
      if(present&&hash(present.data)!==file.afterHash)throw error('update-managed-release-changed');
      if(!present)await atomic(path,data,file.mode);
    }
    for(const file of receipt.files) {
      const plan=receipt.managed?.[file.group];if(!plan||plan.mode==='directory')continue;
      await deployed(file);await linkSwitch(target(file),relative(dirname(target(file)),join(plan.directory,file.name)));
    }
    for(const plan of Object.values(receipt.managed||{}))if(plan.mode==='directory') {
      const current=await readlink(plan.logical);if(![plan.oldLink,plan.newLink].includes(current))throw error('update-managed-pointer-changed');
      await linkSwitch(plan.logical,plan.newLink);
    }
  }
  async function restoreManagedFile(file,i) {
    const plan=receipt.managed?.[file.group];
    if(plan?.mode==='directory')return;
    const path=target(file);
    if(plan&&file.originalKind==='link'){await linkSwitch(path,file.originalLink);return;}
    if(file.beforeHash) {
      const saved=await regular(join(transaction(),'backup',String(i)));
      if(hash(saved.data)!==file.beforeHash)throw error('update-backup-invalid');
      if(plan) {
        const temp=join(dirname(path),'.cab-restore-'+randomUUID());await atomic(temp,saved.data,file.mode);await rename(temp,path);
      } else await atomic(path,saved.data,file.mode);
    } else if(await lstat(path).catch((cause)=>{if(cause.code==='ENOENT')return null;throw cause;}))await unlink(path);
  }
  async function save(phase) {
    if (lock.process.exitCode !== null || lock.process.signalCode !== null) throw error('update-lock-lost');
    if(receipt.managed)receipt.layoutDigest=proofHash(receipt.managed);
    receipt.phase = phase; receipt.updatedAt = new Date(now()).toISOString();
    const data = JSON.stringify(receipt, null, 2) + '\n';
    await atomic(join(transaction(), 'receipt.json'), data); await atomic(currentFile, data);
    await options.onPhase?.(phase, structuredClone(receipt));
  }
  async function metadata(component) {
    const raw = await service(['show', unit(component), '--property=LoadState,ActiveState,MainPID,ExecStart']);
    const value = Object.fromEntries(raw.trim().split('\n').map((line) => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)]; }));
    if (!['active', 'inactive', 'failed', 'activating', 'deactivating', 'reloading'].includes(value.ActiveState) || !['loaded', 'not-found'].includes(value.LoadState)) throw error('update-service-state-unknown');
    if (value.ActiveState === 'active') {
      const entry = component === 'monitor' ? join(c.roots.monitorScripts, 'cgpt-approval-bridge-monitor.mjs') :
        join(c.roots.scripts, 'cgpt-approval-bridge-' + component + '.mjs');
      const escaped = entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!Number.isSafeInteger(Number(value.MainPID)) || Number(value.MainPID) < 1 ||
          !new RegExp('(?:^|[\\s=\\x22\\x27])' + escaped + '(?:$|[\\s;\\]\\}\\x22\\x27])')
            .test((value.ExecStart || '').replaceAll('\\x20', ' '))) throw error('update-service-not-owned');
      if (readonlyBroker && (await processIdentity(Number(value.MainPID))).uid !== process.getuid()) throw error('update-service-not-owned');
    }
    return value;
  }
  async function captureServiceFailures() {
    const failures = [];
    for (const component of ['controller', 'supervisor', 'monitor']) {
      try {
        const raw = await service(['show', unit(component), '--property=ActiveState,SubState,Result,ExecMainStatus']);
        const values = Object.fromEntries(raw.trim().split('\n').map(line => {
          const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)];
        }));
        const safe = key => /^[a-z][a-z0-9-]{0,39}$/.test(values[key] || '') ? values[key] : 'unknown';
        const exitStatus = /^\d{1,3}$/.test(values.ExecMainStatus || '') ? Number(values.ExecMainStatus) : null;
        if (values.ActiveState !== 'active' || (exitStatus !== null && exitStatus !== 0)) {
          failures.push({ component, ActiveState: safe('ActiveState'), SubState: safe('SubState'),
            Result: safe('Result'), ExecMainStatus: exitStatus });
        }
      } catch { failures.push({ component, ActiveState: 'unknown', SubState: 'unknown', Result: 'unavailable', ExecMainStatus: null }); }
    }
    receipt.serviceFailures = failures;
  }
  function reported(cause) {
    return Object.assign(cause, { transactionId: receipt?.id, failureCode: receipt?.failureCode,
      serviceFailures: receipt?.serviceFailures || [], recoveryPhase: receipt?.phase });
  }
  async function brokerState() {
    const value = await openCode.mcp();
    const status = value?.['cgpt-validation']?.status;
    if (!['connected', 'disabled', 'failed', 'pending', 'needs_auth'].includes(status)) throw error('update-broker-state-unknown');
    if (receipt) receipt.openCodeAvailable = true;
    return status;
  }
  async function processPresence(brokerDirectory) {
    let openCode = false, broker = false, unknown = false;
    let processes;
    try { processes = await readdir('/proc'); } catch { throw error('update-opencode-process-state-unknown'); }
    const entry = Buffer.from(join(brokerDirectory, brokerFiles[0]));
    for (const pid of processes) {
      if (!/^\d+$/.test(pid)) continue;
      try {
        const comm = (await readFile('/proc/' + pid + '/comm', 'utf8')).trim().toLowerCase();
        if (comm === 'opencode') openCode = true;
        if (!/^python(?:\d+(?:\.\d+)?)?$/.test(comm)) continue;
        const command = await readFile('/proc/' + pid + '/cmdline');
        if (command.includes(entry)) broker = true;
        if (openCode && broker) break;
      } catch (cause) {
        if (cause.code === 'EACCES' || cause.code === 'EPERM') unknown = true;
      }
    }
    return { openCode, broker, unknown };
  }
  async function nativeBroker(action) {
    if (!['connect','disconnect'].includes(action)) throw error('update-broker-action-invalid');
    const targetState = action === 'connect' ? 'connected' : 'disabled', deadline = now() + c.waitMs;
    let state = await brokerState();
    while (state === 'pending' && now() < deadline) { await sleep(Math.min(50,deadline-now())); state = await brokerState(); }
    if (state === 'pending') throw error('update-broker-pending-timeout');
    if (state === targetState) return;
    if (receipt.mcpTransition?.state === 'INTENT') throw error('update-broker-pending-timeout');
    receipt.mcpTransition = { action, state:'INTENT', at:now() }; await save(receipt.phase);
    try {
      const timeout = Math.max(1,Math.min(10000,deadline-now()));
      if (action === 'connect') await openCode.connectMcp('cgpt-validation',undefined,{timeout});
      else await openCode.disconnectMcp('cgpt-validation',undefined,{timeout});
    } catch (cause) {
      if (!['opencode-unavailable','update-source-unavailable'].includes(cause.code)) throw cause;
      // Une réponse perdue ne permet pas de renvoyer une opération native.
      throw error('update-broker-pending-timeout');
    }
    state = await brokerState();
    while (state === 'pending' && now() < deadline) { await sleep(Math.min(50,deadline-now())); state = await brokerState(); }
    if (state === 'pending') throw error('update-broker-pending-timeout');
    if (state !== targetState) {
      receipt.mcpTransition.state = 'FAILED'; await save(receipt.phase);
      throw error(state === 'needs_auth' ? 'update-broker-needs-auth' : 'update-broker-state-unconfirmed');
    }
    receipt.mcpTransition.state = 'CONFIRMED'; await save(receipt.phase);
  }

  async function recoveryObservation() {
    const value = await openCode.mcpRecoverySnapshot();
    if (!validRecoverySnapshot(value)) throw error('update-mcp-recovery-observation-invalid');
    return value;
  }
  async function recoverMcp() {
    if (receipt.nativeIdentity) {
      const info = await openCode.info(true), directory = await openCode.sharedMcpDirectory();
      if (info.pid !== receipt.nativeIdentity.pid || info.version !== receipt.nativeIdentity.version || directory !== receipt.nativeIdentity.sharedDirectory) throw error('update-mcp-recovery-identity-changed');
    }
    let state = await brokerState();
    const recovery = receipt.mcpRecovery;
    if (state === 'needs_auth') throw error('update-broker-needs-auth');
    if (state === 'failed') throw error('update-broker-state-unconfirmed');
    if (input.recoverMcp !== undefined && state !== 'connected' && !recovery.reload) {
      const before = await recoveryObservation();
      if (before.activeSessionCount || before.sharedPermissionCount) throw error('update-mcp-recovery-native-busy');
      recovery.reload = { state:'INTENT', before, at:now() };
      receipt.brokerReconnectedAt = now();
      await save('MCP_RECOVERY_REQUIRED');
      try {
        await openCode.request('/api/location/reload',{method:'POST',scoped:false,timeout:Math.max(1,c.waitMs)});
        recovery.reload.state = 'HTTP_COMPLETED';
      } catch (cause) {
        recovery.reload.state = 'UNKNOWN'; recovery.reload.error = safeCauseCode(cause.code);
      }
      await save('MCP_RECOVERY_REQUIRED');
    }
    if (state !== 'connected' && !await wait(async () => await brokerState() === 'connected',c.waitMs)) throw error('update-mcp-recovery-required');
    if (recovery.reload) {
      const after = await recoveryObservation();
      if (!sameRecoveryIdentity(recovery.reload.before,after)) throw error('update-mcp-recovery-identity-changed');
      if (after.activeSessionCount || after.sharedPermissionCount) throw error('update-mcp-recovery-native-busy');
      recovery.reload.after = after; recovery.reload.state = 'VERIFIED'; await save('MCP_RECOVERY_REQUIRED');
    }
    receipt.brokerConnected = true;
    if (receipt.mcpTransition?.state === 'INTENT') receipt.mcpTransition.state = 'RECONCILED';
    if (options.rollbackOnly) { await rollback(); return {status:'rolled-back',transactionId:receipt.id,recoveredMcp:true}; }
    if (['RESTARTING','VERIFYING'].includes(recovery.resumePhase)) {
      for (const file of receipt.files) { const actual = await deployed(file); if (!actual || hash(actual.data) !== file.afterHash) throw error('update-installed-artifact-changed'); }
      if (!await wait(() => verified(desiredVersions(),targetActive()),c.waitMs)) throw error('update-active-version-unconfirmed');
      receipt.timings ||= {}; receipt.timings.totalMs = now()-(receipt.startedAtMs || now());
      await save('COMPLETED');
      await saveDeployment();
      return {status:'completed',version:receipt.version,transactionId:receipt.id,recoveredMcp:true,
        active:targetActive(),deployedVersions:desiredVersions(),activeVersions:desiredVersions(),...brokerResult()};
    }
    if (recovery.resumePhase === 'PREPARED') { await save('PREPARED'); preparedMcpResume = true; return null; }
    await rollback(); return {status:'rolled-back',transactionId:receipt.id,recoveredMcp:true};
  }
  async function registry() {
    const value = await request(c.controllerUrl, '/runs');
    if (value.project !== c.workspace || !Array.isArray(value.runs) || value.coordinationProtocol !== 'resource-scoped-v1' || value.schemaVersion !== 4) {
      throw error('update-runtime-incompatible');
    }
    return value;
  }
  async function wait(check, duration = c.waitMs) {
    const deadline = now() + duration;
    do {
      try { if (await check()) return true; } catch (cause) { if (['update-runtime-incompatible', 'update-response-too-large'].includes(cause.code)) throw cause; }
      if (now() >= deadline) return false;
      await sleep(Math.min(50, deadline - now()));
    } while (true);
  }
  async function drain() {
    if (!receipt.maintenance) return true;
    const { transactionId, generation } = receipt.maintenance;
    return wait(async () => {
      const snapshot = await registry();
      await pauseRuns(snapshot);
      const status = await request(c.controllerUrl, '/status');
      if (status.mode !== 'concurrent' && status.job?.armed) return false;
      const contexts = status.mode === 'concurrent' ? Object.values(status.runs || {}) : [status];
      if (contexts.some((context) => context.job?.currentCabMandate || context.job?.recovery ||
          context.undecidedValidationCount > 0 || context.hasUnresolvedOperation || context.unmatchedNativePermissionCount > 0)) return false;
      const held = await request(c.controllerUrl, '/coordination/global/confirm', { transactionId, generation, evidence: ['cab-update-boundary-verified'] });
      if (held.state !== 'HELD' || held.transactionId !== transactionId || held.generation !== generation) return false;
      receipt.runIdentity = runIdentity(await registry()); return true;
    });
  }
  async function release() {
    if (!receipt.maintenance) return;
    const value = await request(c.controllerUrl, '/coordination/global/release', {
      transactionId: receipt.maintenance.transactionId, generation: receipt.maintenance.generation,
      authorization: '/cab update verified release', evidence: ['cab-update-components-and-runs-verified'] });
    if (value.state !== 'RELEASED') throw error('update-maintenance-release-unconfirmed');
  }
  async function stopAll() {
    if (!readonlyBroker) {
      await service(['stop', ...['controller', 'supervisor', 'monitor'].map(unit)]);
      if (receipt.openCodeAvailable && receipt.brokerWasConnected) await nativeBroker('disconnect');
      return;
    }

    await brokerArtifactsUnchanged();
    if (receipt.maintenance && (await metadata('controller')).ActiveState === 'active') {
      const global = (await request(c.controllerUrl, '/coordination/global')).global;
      if (!global || global.state !== 'HELD' || global.transactionId !== receipt.maintenance.transactionId ||
          global.generation !== receipt.maintenance.generation) throw error('update-maintenance-owner-changed');
    }
    if ((await metadata('supervisor')).ActiveState === 'active') await service(['stop', unit('supervisor')]);
    if (receipt.brokerConnected) {
      if (readonlyBroker && !receipt.externalBroker.disconnectIntentAt) {
        await inspectBrokerProcess(input.brokerProof,input.brokerProof.brokerProcess);
        receipt.externalBroker.disconnectIntentAt = now();
        await save('STOPPING');
      }
      if (await brokerState() === 'connected') await nativeBroker('disconnect');
    }
    if ((await metadata('controller')).ActiveState === 'active') await service(['stop', unit('controller')]);
    if ((await metadata('monitor')).ActiveState === 'active') await service(['stop', unit('monitor')]);
    for (const component of ['controller', 'supervisor', 'monitor']) {
      if ((await metadata(component)).ActiveState === 'active') throw error('update-service-stop-unconfirmed');
    }
  }
  async function startAll(active = receipt.active, expectedVersion = receipt.version) {
    if (!readonlyBroker) {
      await service(['start', ...['controller', 'supervisor', 'monitor'].map(unit)]);
      if (receipt.openCodeAvailable) {
        try {
          if (!await wait(async () => (await request(c.controllerUrl, '/status')).version === expectedVersion, c.waitMs)) throw error('update-controller-start-unconfirmed');
          await nativeBroker('connect');
          receipt.brokerConnected = true;
        } catch (cause) {
          receipt.brokerConnected = false;
          if (['update-controller-start-unconfirmed', 'update-response-too-large', 'update-broker-pending-timeout', 'update-broker-needs-auth'].includes(cause.code)) throw cause;
          throw error('update-broker-reload-unconfirmed');
        }
      }
      return;
    }
    if (active.controller) {
      await service(['start', unit('controller')]);
      if (!await wait(async () => Boolean(await registry()), 30000)) throw error('update-controller-start-unconfirmed');
      if (receipt.maintenance) {
        const global = (await request(c.controllerUrl, '/coordination/global')).global;
        if (!global || global.state !== 'HELD' || global.transactionId !== receipt.maintenance.transactionId ||
            global.generation !== receipt.maintenance.generation) throw error('update-maintenance-owner-changed');
      }
    }
    if (receipt.brokerConnected) {
      if (readonlyBroker) await brokerArtifactsUnchanged();
      await nativeBroker('connect');
    }
    if (active.monitor) await service(['start', unit('monitor')]);
    if (active.supervisor) await service(['start', unit('supervisor')]);
  }
  async function verified(expected, active = targetActive()) {
    if (readonlyBroker) await brokerArtifactsUnchanged();
    const observations = await Promise.all(['controller', 'supervisor', 'monitor'].map(async component => {
      const [meta, status] = await Promise.all([
        metadata(component),
        active[component] ? request(c[component === 'monitor' ? 'monitorUrl' : component + 'Url'], component === 'monitor' ? '/api/snapshot' : '/status') : null,
      ]);
      return { component, meta, status };
    }));
    for (const { component, meta, status } of observations) {
      if ((meta.ActiveState === 'active') !== active[component]) return false;
      if (!active[component]) continue;
      const workspace = component === 'monitor' ? status.identity?.workspace : status.workspace;
      if (status.version !== expected[component] || (workspace && workspace !== c.serviceWorkspace) ||
          (status.pid && status.pid !== Number(meta.MainPID))) return false;
      if (component === 'monitor' && workspace !== c.serviceWorkspace) return false;
    }
    const controllerStatus = observations.find(row => row.component === 'controller').status;
    if (active.controller && readonlyBroker) {
      if (receipt.runIdentity && receipt.runIdentity !== runIdentity(await registry())) throw error('update-run-identity-changed');
      if (receipt.brokerConnected) {
        const status = await request(c.controllerUrl, '/status');
        if (status.brokerReadiness?.server_version !== expected.broker ||
            !status.brokerReadinessReceivedAt ||
            Date.parse(status.brokerReadinessReceivedAt) < (receipt.brokerReconnectedAt || now() - 10000)) return false;
        if (readonlyBroker) {
          if (receipt.jobIdentity !== jobsIdentity(status)) throw error('update-broker-job-identity-changed');
          requirePauses(await registry(), false);
          const child = await inspectBrokerProcess(input.brokerProof);
          const initial = receipt.externalBroker.disconnectIntentAt === null;
          if (initial ? proofHash(child) !== proofHash(input.brokerProof.brokerProcess) || status.brokerReadiness.instance_id !== input.brokerProof.instanceId :
              proofHash(child) === proofHash(input.brokerProof.brokerProcess) || status.brokerReadiness.instance_id === input.brokerProof.instanceId) return false;
          if (status.brokerReadiness.pending_count !== 0 || !status.brokerReadiness.instance_id) return false;
          receipt.externalBroker.afterProcess = child;
          receipt.externalBroker.afterInstanceId = status.brokerReadiness.instance_id;
        }
      }
    }
    if (active.controller && receipt.brokerConnected && !readonlyBroker) {
      const status = controllerStatus;
      if (status.brokerReadiness?.server_version !== expected.broker || !status.brokerReadinessReceivedAt ||
          Date.parse(status.brokerReadinessReceivedAt) < (receipt.brokerReconnectedAt || now() - 10000)) {
        return false;
      }
    }
    return true;
  }
  async function rollback() {
    if (readonlyBroker) {
      if (receipt.externalBroker.disconnectIntentAt !== null) throw error('update-broker-forward-recovery-required');
      await brokerArtifactsUnchanged();
      await inspectBrokerProcess(input.brokerProof,input.brokerProof.brokerProcess);
      for (const file of receipt.files) {
        const current=await deployed(file);
        if ((current ? hash(current.data) : null) !== file.beforeHash) throw error('update-broker-forward-recovery-required');
      }
      for (const component of ['controller','monitor','supervisor']) {
        if (receipt.active[component] && (await metadata(component)).ActiveState !== 'active') await service(['start',unit(component)]);
      }
      if (!await verified(receipt.previousVersions, receipt.active)) throw error('update-broker-rollback-unconfirmed');
      await save('ROLLBACK_RELEASING'); await release(); await save('ROLLED_BACK'); return;
    }
    await save('ROLLING_BACK'); await stopAll();
    for (const file of receipt.files) {
      const current = await deployed(file);
      const currentHash = current ? hash(current.data) : null;
      if (currentHash !== file.beforeHash && currentHash !== file.afterHash) throw error('update-installed-artifact-changed');
    }
    for (let i = 0; i < receipt.files.length; i++) {
      const file = receipt.files[i]; const path = target(file);
      await restoreManagedFile(file,i);
    }
    for(const plan of Object.values(receipt.managed||{}))if(plan.mode==='directory')await linkSwitch(plan.logical,plan.oldLink);
    await service(['daemon-reload']); receipt.brokerReconnectedAt = now(); await startAll(receipt.active, receipt.previousVersions.controller);
    if (!await wait(() => verified(receipt.previousVersions, receipt.active), 30000)) throw error('update-rollback-unconfirmed');
    await save('ROLLBACK_RELEASING'); await release(); await save('ROLLED_BACK');
  }
  try {
    const existing = await optional(currentFile);
    if (existing) {
      try { receipt = JSON.parse(existing.data.toString('utf8')); } catch { throw error('update-journal-invalid'); }
      if (input.recoverMcp !== undefined && (receipt.id !== input.recoverMcp || complete.has(receipt.phase) ||
          !['MCP_RECOVERY_REQUIRED','ROLLBACK_FAILED'].includes(receipt.phase))) throw error('update-mcp-recovery-authorization-invalid');
      if (complete.has(receipt.phase)) receipt = null;
      else {
      if (receipt.schema !== 1 || (!complete.has(receipt.phase) && receipt.contextKey !== contextKey) || !/^update-[a-f0-9-]{36}$/.test(receipt.id) ||
          !Array.isArray(receipt.files) || receipt.files.length > 128 || !receipt.active ||
          !['PREPARING', 'PREPARED', 'FREEZING', 'WAITING', 'STOPPING', 'INSTALLING', 'RESTARTING', 'VERIFYING',
            'RELEASING', 'ROLLING_BACK', 'ROLLBACK_RELEASING', 'ROLLBACK_FAILED', 'MCP_RECOVERY_REQUIRED', 'READONLY_RECOVERY_REQUIRED', ...complete].includes(receipt.phase) ||
          !['controller', 'supervisor', 'monitor'].every((component) => typeof receipt.active[component] === 'boolean') ||
          (receipt.targetActive && !['controller','supervisor','monitor'].every((component) => typeof receipt.targetActive[component] === 'boolean')) ||
          (receipt.servicesObserved !== undefined && typeof receipt.servicesObserved !== 'boolean') ||
          (receipt.openCodeAvailable !== undefined && typeof receipt.openCodeAvailable !== 'boolean')) throw error('update-journal-invalid');
      for (const file of receipt.files) {
        target(file);
        if ((file.beforeHash !== null && !/^[a-f0-9]{64}$/.test(file.beforeHash)) ||
            !/^[a-f0-9]{64}$/.test(file.afterHash) || !Number.isInteger(file.mode) || file.mode < 0 || file.mode > 0o777) throw error('update-journal-invalid');
      }
      if(receipt.managed) {
        if(input.layout!=='managed-release'||receipt.layoutDigest!==proofHash(receipt.managed))throw error('update-journal-invalid');
        for(const [group,plan] of Object.entries(receipt.managed)) {
          if(!Object.hasOwn(c.roots,group)||plan.logical!==c.roots[group]||!['links','directory'].includes(plan.mode)||
              !within(plan.root,plan.directory)||!plan.directory.includes('/releases/'))throw error('update-journal-invalid');
        }
      }
      if (new Set(receipt.files.map(target)).size !== receipt.files.length || typeof receipt.brokerConnected !== 'boolean' ||
          !baseVersion(receipt.version) || (receipt.maintenance && (receipt.maintenance.transactionId !== receipt.id ||
            (!Number.isSafeInteger(receipt.maintenance.generation) && receipt.phase !== 'FREEZING')))) throw error('update-journal-invalid');
      if ((!complete.has(receipt.phase) && receipt.phase !== 'PREPARING') ||
          (readonlyBroker && receipt.contextKey === contextKey && receipt.phase === 'COMPLETED')) {
        if (readonlyBroker !== Boolean(receipt.externalBroker) || (readonlyBroker &&
            (receipt.externalBroker.proofDigest !== proofHash(input.brokerProof) || receipt.externalBroker.artifactVersion !== VERSION ||
             receipt.externalBroker.beforeLoadedVersion !== input.brokerProof.loadedVersion || receipt.externalBroker.beforeInstanceId !== input.brokerProof.instanceId ||
             receipt.files.some((file)=>file.group==='broker') ||
             (receipt.externalBroker.disconnectIntentAt !== null && !Number.isFinite(receipt.externalBroker.disconnectIntentAt))))) throw error('update-journal-invalid');
      }
      if (receipt.mcpTransition && (!['connect','disconnect'].includes(receipt.mcpTransition.action) ||
          !['INTENT','CONFIRMED','RECONCILED','FAILED'].includes(receipt.mcpTransition.state) || !Number.isFinite(receipt.mcpTransition.at))) throw error('update-journal-invalid');
      if (receipt.nativeIdentity && (Object.keys(receipt.nativeIdentity).length !== 3 || !Number.isSafeInteger(receipt.nativeIdentity.pid) || receipt.nativeIdentity.pid <= 0 ||
          typeof receipt.nativeIdentity.version !== 'string' || !/^2\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(receipt.nativeIdentity.version) ||
          typeof receipt.nativeIdentity.sharedDirectory !== 'string' || !isAbsolute(receipt.nativeIdentity.sharedDirectory))) throw error('update-journal-invalid');
      if (receipt.mcpRecovery && (!recoveryPhases.includes(receipt.mcpRecovery.resumePhase) ||
          receipt.mcpRecovery.reload && (!['INTENT','UNKNOWN','HTTP_COMPLETED','VERIFIED'].includes(receipt.mcpRecovery.reload.state) ||
            !validRecoverySnapshot(receipt.mcpRecovery.reload.before) || !Number.isFinite(receipt.mcpRecovery.reload.at)))) throw error('update-journal-invalid');
      if (receipt.phase === 'MCP_RECOVERY_REQUIRED' && !receipt.mcpRecovery) throw error('update-journal-invalid');
      receiptTrusted = true;
      if (!readonlyBroker && (receipt.phase === 'MCP_RECOVERY_REQUIRED' || input.recoverMcp !== undefined ||
          receipt.mcpTransition?.state === 'INTENT' && recoveryPhases.includes(receipt.phase))) {
        receipt.mcpRecovery ||= { resumePhase: receipt.phase === 'ROLLBACK_FAILED' ? 'ROLLING_BACK' : receipt.phase };
        if (!recoveryPhases.includes(receipt.mcpRecovery.resumePhase)) throw error('update-journal-invalid');
        await save('MCP_RECOVERY_REQUIRED');
        const recoveredResult = await recoverMcp();
        if (recoveredResult) return recoveredResult;
      }
      if (readonlyBroker && receipt.externalBroker && receipt.contextKey === contextKey) {
        await brokerArtifactsUnchanged();
        if (receipt.phase === 'COMPLETED') {
          for (const file of receipt.files) if (hash((await deployed(file)).data) !== file.afterHash) throw error('update-installed-artifact-changed');
          if (!await verified(desiredVersions(), targetActive())) throw error('update-broker-completed-runtime-changed');
          return {status:'up-to-date',version:receipt.version,transactionId:receipt.id,...brokerResult()};
        }
      }
      if (['RELEASING', 'ROLLBACK_RELEASING'].includes(receipt.phase)) {
        const finished = receipt.phase === 'RELEASING' ? 'COMPLETED' : 'ROLLED_BACK';
        if (receipt.maintenance) {
          const global = (await request(c.controllerUrl, '/coordination/global')).global;
          if (!global || global.transactionId !== receipt.maintenance.transactionId || global.generation !== receipt.maintenance.generation) {
            throw error('update-maintenance-owner-changed');
          }
          if (global.state !== 'RELEASED') {
            const versions = finished === 'COMPLETED' ? Object.fromEntries(['controller', 'supervisor', 'monitor', 'broker'].map((name) => [name, receipt.version])) : receipt.previousVersions;
            if (global.state !== 'HELD' || !await verified(versions, finished === 'COMPLETED' ? targetActive() : receipt.active)) throw error('update-recovery-required');
            await release();
          }
        }
        await save(finished);
      }
      if (receipt.phase === 'FREEZING') {
        const maintenance = await request(c.controllerUrl, '/coordination/global/request', {
          transactionId: receipt.id, cause: 'SHARED_MAINTENANCE', scope: 'all', authorization: '/cab update active components',
          evidence: ['cab-update-package-validated-and-backed-up'] });
        if (maintenance.transactionId !== receipt.id || !Number.isSafeInteger(maintenance.generation)) throw error('update-maintenance-unconfirmed');
        receipt.maintenance = { transactionId: receipt.id, generation: maintenance.generation }; await save('WAITING');
      }
      if (!preparedMcpResume && !complete.has(receipt.phase) && receipt.phase !== 'WAITING') {
        if (['PREPARING', 'PREPARED'].includes(receipt.phase) && !receipt.maintenance) await save('PREPARATION_FAILED');
        else if (readonlyBroker && receipt.externalBroker.disconnectIntentAt !== null) {
          await requireStoredHeld(); forwardRecovery = true;
        } else {
          try { await rollback(); recovered = true; } catch { await save('ROLLBACK_FAILED'); throw error('update-recovery-required'); }
        }
      }
      }
    }
    if (input.recoverMcp !== undefined && !receipt) throw error('update-mcp-recovery-authorization-invalid');
    if (options.rollbackOnly) {
      if (readonlyBroker && receipt?.externalBroker?.disconnectIntentAt !== null && receipt?.externalBroker) throw error('update-broker-forward-recovery-required');
      if (!receipt || complete.has(receipt.phase)) return { status: recovered ? 'rolled-back' : 'nothing-to-recover' };
      if (readonlyBroker && !await drain()) return { status: 'waiting', transactionId: receipt.id };
      if (receipt.phase === 'WAITING') {
        await save('ROLLBACK_RELEASING'); await release(); await save('ROLLED_BACK');
      } else await rollback();
      return { status: 'rolled-back', transactionId: receipt.id };
    }
    if (receipt?.phase !== 'WAITING' && !forwardRecovery && !preparedMcpResume) {
      const manifest = JSON.parse((await regular(join(c.pluginRoot, '.codex-plugin/plugin.json'))).data.toString('utf8'));
      const version = baseVersion(manifest.version);
      if (version !== VERSION) throw error('update-package-version-invalid');
      if (manifest.skills !== './skills/') throw error('update-skill-association-invalid');
      const skill = (await regular(join(c.pluginRoot, 'skills/approval-bridge/SKILL.md'))).data.toString('utf8');
      const updateReference = (await regular(join(c.pluginRoot, 'skills/approval-bridge/references/component-update.md'))).data.toString('utf8');
      if (!skill.includes('references/component-update.md') || !skill.includes('cgpt-approval-bridge-update.mjs') ||
          !updateReference.includes('/CAB update') || !updateReference.includes('systemctl --user stop') ||
          !updateReference.includes('INDISPONIBLE')) throw error('update-skill-association-invalid');
      receipt = { schema: 1, contextKey, id: 'update-' + randomUUID(), version, phase: 'PREPARING',
        active: { controller: true, supervisor: true, monitor: true },
        targetActive: { controller: true, supervisor: true, monitor: true }, servicesObserved: false,
        files: [], brokerConnected: false, startedAtMs: now(), timings: {} };
      receiptTrusted = true;
      await save('PREPARING');
      await prepareUpdateCredential(c);
      if (readonlyBroker) {
        const artifacts=await brokerArtifactsUnchanged();
        await inspectBrokerProcess(input.brokerProof,input.brokerProof.brokerProcess);
        const snapshot=await registry(), status=await request(c.controllerUrl,'/status'), readiness=status.brokerReadiness;
        requirePauses(snapshot, false);
        if (await brokerState() !== 'connected' || readiness?.server_version !== input.brokerProof.loadedVersion ||
            readiness.instance_id !== input.brokerProof.instanceId || readiness.pending_count !== 0 ||
            !Number.isFinite(Date.parse(readiness.checked_at)) || now()-Date.parse(readiness.checked_at)>35000) throw error('update-broker-loaded-state-divergent');
        receipt.externalBroker={proofDigest:proofHash(input.brokerProof),artifacts,artifactVersion:VERSION,
          beforeLoadedVersion:readiness.server_version,beforeInstanceId:readiness.instance_id,disconnectIntentAt:null,
          afterProcess:null,afterInstanceId:null};
        receipt.jobIdentity=jobsIdentity(status);
        for (const name of brokerFiles) await validate(join(c.pluginRoot,'broker',name),transaction());
      }
      const scripts = (await readdir(join(c.pluginRoot, 'scripts'))).filter((name) => /^cgpt-approval-bridge-[a-z-]+\.(mjs|py)$/.test(name)).sort();
      const required = ['controller.mjs', 'job-context.mjs', 'model-policy.mjs', 'model-transition.mjs', 'provider-connect.mjs', 'context-portability.mjs', 'shell-stage.mjs', 'runs.mjs', 'resource-coordination.mjs',
        'statistics.mjs', 'observation-statistics.mjs', 'statistics-maintenance.mjs', 'import-observations.mjs',
        'registry-lock.py', 'supervisor.mjs', 'supervisor-context.mjs', 'opencode-sse-client.mjs', 'healthcheck.mjs',
        'reset.py', 'prompts.py', 'monitor.mjs', 'monitor-data.mjs', 'monitor-events.mjs', 'monitor-management.mjs',
        'run-steps.mjs', 'process-lifecycle.mjs', 'update.mjs'];
      if (scripts.length > 64 || required.some((name) => !scripts.includes('cgpt-approval-bridge-' + name))) throw error('update-package-incomplete');
      const artifacts = [
        ...scripts.map((name) => ({ group: 'scripts', name, source: join(c.pluginRoot, 'scripts', name) })),
        ...['monitor', 'monitor-data', 'monitor-events', 'monitor-management', 'run-steps', 'statistics-maintenance', 'observation-statistics', 'opencode-client', 'process-lifecycle']
          .map((name) => ({ group: 'monitorScripts', name: 'cgpt-approval-bridge-' + name + '.mjs', source: join(c.pluginRoot, 'scripts/cgpt-approval-bridge-' + name + '.mjs') })),
        ...(readonlyBroker ? [] : brokerFiles.map((name) => ({ group: 'broker', name, source: join(c.pluginRoot, 'broker', name) }))),
        ...['index.html', 'app.mjs', 'stats.mjs', 'style.css'].map((name) => ({ group: 'web', name, source: join(c.pluginRoot, 'web-monitor', name) })),
        ...['controller', 'supervisor', 'monitor'].map((name) => ({ group: 'units', name: unit(name), source: join(c.pluginRoot, 'systemd', unit(name)) })),
      ];
      const byPath = new Map(artifacts.map((artifact) => [artifact.source, artifact]));
      if (new Set(artifacts.map(target)).size !== artifacts.length) throw error('update-overlapping-destinations');
      for (let i = 0; i < artifacts.length; i++) {
        const artifact = artifacts[i], content = await regular(artifact.source);
        const entry={group:artifact.group,name:artifact.name};const before = await deployed(entry,true);
        if (/\.(py|mjs)$/.test(artifact.name)) {
          if (artifact.group !== 'web' && sourceVersion(content.data) !== version) throw error('update-package-version-invalid');
          if (before && baseVersion(sourceVersion(before.data)) && newer(baseVersion(sourceVersion(before.data)), version)) throw error('update-downgrade-refused');
          for (const match of content.data.toString('utf8').matchAll(/(?:from\s+|import\s*)['"](\.\/[^'"]+)['"]/g)) {
            if (!byPath.has(resolve(dirname(artifact.source), match[1]))) throw error('update-package-import-missing');
          }
          await validateCached(artifact.source, content.data);
        }
        if (artifact.group === 'units') {
          const component = artifact.name.replace('cgpt-approval-bridge-', '').replace('.service', '');
          const entry = component === 'monitor' ? '%h/.local/share/cab-approval-bridge-monitor/scripts/cgpt-approval-bridge-monitor.mjs' :
            '%h/.local/share/cab-approval-bridge/cgpt-approval-bridge-' + component + '.mjs';
          const source = content.data.toString('utf8');
          if (!source.includes('Description=CAB ' + version + ' ') ||
              !source.split('\n').includes('ExecStart=/usr/bin/env node ' + entry) || /^\[Install\]/m.test(source)) throw error('update-unit-invalid');
        }
        const file = { ...entry, afterHash: hash(content.data),
          beforeHash: before ? hash(before.data) : null, mode: before?.mode ?? content.mode };
        if (before) await atomic(join(transaction(), 'backup', String(i)), before.data);
        await atomic(join(transaction(), 'stage', String(i)), content.data);
        receipt.files.push(file);
      }
      if(receipt.managed)receipt.layoutDigest=proofHash(receipt.managed);
      if (readonlyBroker) {
        for (const component of ['controller', 'supervisor', 'monitor']) receipt.active[component] = (await metadata(component)).ActiveState === 'active';
        receipt.servicesObserved = true;
        receipt.brokerConnected = await brokerState() === 'connected';
        if (!receipt.active.controller || !receipt.brokerConnected) throw error('update-broker-controller-required');
        const existingGlobal = (await request(c.controllerUrl, '/coordination/global')).global;
        if (existingGlobal && existingGlobal.state !== 'RELEASED') throw error('update-global-coordination-active');
      }
      receipt.previousVersions = {};
      for (const component of ['controller', 'supervisor', 'monitor', 'broker']) {
        if (component === 'broker' && readonlyBroker) {receipt.previousVersions.broker=receipt.externalBroker.beforeLoadedVersion;continue;}
        const group = component === 'broker' ? 'broker' : component === 'monitor' ? 'monitorScripts' : 'scripts';
        const name = component === 'broker' ? brokerFiles[0] : 'cgpt-approval-bridge-' + component + '.mjs';
        const previous = await deployed(receipt.files.find((f)=>f.group===group&&f.name===name)||{group,name});
        receipt.previousVersions[component] = previous ? sourceVersion(previous.data) : null;
      }
      if (readonlyBroker) {
        const initialRegistry = await registry();
        receipt.runIdentity = runIdentity(initialRegistry);
        const status = await request(c.monitorUrl, '/api/snapshot');
        if (status.identity?.workspace !== c.serviceWorkspace) throw error('update-workspace-divergent');
      }
      if (!options.syntax) await atomic(syntaxCachePath, JSON.stringify(Object.fromEntries([...validationKeys].map((key) => [key, true]))) + '\n');
      await save('PREPARED');
      if (readonlyBroker) {
        receipt.brokerReconnectedAt = 0;
        const desired = Object.fromEntries(['controller', 'supervisor', 'monitor', 'broker'].map((name) => [name, version]));
        if (receipt.files.every((file) => file.beforeHash === file.afterHash) &&
            Object.values(receipt.active).every(Boolean) && await verified(desired, targetActive())) {
          await save('COMPLETED'); return { status: 'up-to-date', version, active: targetActive(), ...brokerResult() };
        }
        if ((await metadata('controller')).ActiveState === 'active') {
          const global = (await request(c.controllerUrl, '/coordination/global')).global;
          if (global && global.state !== 'RELEASED') throw error('update-global-coordination-active');
          const transactionId = receipt.id;
          receipt.maintenance = { transactionId, generation: null }; await save('FREEZING');
          const maintenance = await request(c.controllerUrl, '/coordination/global/request', {
            transactionId, cause: 'SHARED_MAINTENANCE', scope: 'all', authorization: input.brokerProof.authorization,
            evidence: ['cab-update-package-validated-and-backed-up'] });
          if (maintenance.transactionId !== transactionId || !Number.isSafeInteger(maintenance.generation)) throw error('update-maintenance-unconfirmed');
          receipt.maintenance = { transactionId: receipt.id, generation: maintenance.generation };
        }
        await save('WAITING');
      }
    }
    for (let i = 0; i < receipt.files.length; i++) {
      const file = receipt.files[i];
      if (hash((await regular(join(transaction(), 'stage', String(i)))).data) !== file.afterHash) throw error('update-stage-changed');
      if (file.beforeHash && hash((await regular(join(transaction(), 'backup', String(i)))).data) !== file.beforeHash) throw error('update-backup-invalid');
      const installed = await deployed(file);
      if (!([file.beforeHash,...(forwardRecovery ? [file.afterHash] : [])].includes(installed ? hash(installed.data) : null))) throw error('update-installed-artifact-changed');
    }
    if (readonlyBroker) {
      if (forwardRecovery) await requireStoredHeld();
      else if (!await drain()) { await save('WAITING'); return { status: 'waiting', transactionId: receipt.id, version: receipt.version }; }
    }
    await prepareUpdateCredential(c);
    if (!readonlyBroker) {
      try {
        const info = await openCode.info(true), sharedDirectory = await openCode.sharedMcpDirectory();
        receipt.nativeIdentity ||= {pid:info.pid,version:info.version,sharedDirectory};
        let initialState = await brokerState();
        if (initialState === 'pending' && !await wait(async () => { initialState = await brokerState(); return initialState !== 'pending'; },c.waitMs)) throw error('update-broker-pending-timeout');
        receipt.brokerWasConnected = initialState !== 'disabled';
      }
      catch (cause) {
        if (cause.code === 'update-broker-pending-timeout') throw cause;
        const presence = processProbe ? await processProbe(c.brokerDirectory) : await processPresence(c.brokerDirectory);
        if (presence.openCode || presence.unknown) throw error('update-opencode-active-unavailable');
        receipt.openCodeAvailable = false; receipt.brokerWasConnected = false;
      }
    }
    const preparedPath = (i) => join(dirname(target(receipt.files[i])), '.cab-ready-' + receipt.id + '-' + i);
    if (!input.layout && !readonlyBroker) {
      for (let i = 0; i < receipt.files.length; i++) {
        const data = (await regular(join(transaction(), 'stage', String(i)))).data;
        if (hash(data) !== receipt.files[i].afterHash) throw error('update-stage-changed');
        await atomic(preparedPath(i), data, receipt.files[i].mode);
      }
    }
    receipt.timings ||= {};
    receipt.cutoverAtMs = now();
    receipt.timings.preparationMs = receipt.cutoverAtMs - (receipt.startedAtMs || receipt.cutoverAtMs);
    await save('STOPPING'); await stopAll(); await save('INSTALLING');
    if(input.layout==='managed-release')await installManagedFiles();
    else for (let i = 0; i < receipt.files.length; i++) {
      const file = receipt.files[i], data = (await regular(join(transaction(), 'stage', String(i)))).data;
      if (hash(data) !== file.afterHash) throw error('update-stage-changed');
      if (!readonlyBroker) {
        const installed = await deployed(file);
        if ((installed ? hash(installed.data) : null) !== file.beforeHash) throw error('update-installed-artifact-changed');
        if (hash((await regular(preparedPath(i))).data) !== file.afterHash) throw error('update-stage-changed');
        await rename(preparedPath(i), target(file));
      } else await atomic(target(file), data, file.mode);
    }
    if (!input.layout && !readonlyBroker) {
      for (const directory of new Set(receipt.files.map((file) => dirname(target(file))))) {
        const fd = await open(directory, 'r'); try { await fd.sync(); } finally { await fd.close(); }
      }
    }
    if (receipt.files.some((file) => file.group === 'units' && file.beforeHash !== file.afterHash)) await service(['daemon-reload']);
    await save('RESTARTING');
    receipt.brokerReconnectedAt = now(); await startAll(targetActive()); await save('VERIFYING');
    const desired = Object.fromEntries(['controller', 'supervisor', 'monitor', 'broker'].map((name) => [name, receipt.version]));
    if (!await wait(() => verified(desired, targetActive()), 30000)) throw error('update-active-version-unconfirmed');
    receipt.timings ||= {};
    receipt.timings.unavailableMs = now() - receipt.cutoverAtMs;
    receipt.timings.totalMs = now() - (receipt.startedAtMs || receipt.cutoverAtMs);
    await save('RELEASING'); await release(); await save('COMPLETED');
    await saveDeployment();
    return { status: 'completed', version: receipt.version, transactionId: receipt.id, active: targetActive(),
      brokerConnected: receipt.brokerConnected, deployedVersions: desired,
      ...brokerResult(),
      activeVersions: Object.fromEntries(Object.keys(desired).map((name) => [name,
        (name === 'broker' ? receipt.brokerConnected : targetActive()[name]) ? desired[name] : null])) };
  } catch (cause) {
    if (options.onPhase && cause.code === 'SIMULATED_CRASH') throw cause;
    if (receiptTrusted && !readonlyBroker && cause.code === 'update-broker-pending-timeout' && recoveryPhases.includes(receipt.phase)) {
      receipt.failureCode ||= cause.code;
      receipt.mcpRecovery ||= {resumePhase:receipt.phase};
      await save('MCP_RECOVERY_REQUIRED');
      if (receipt.mcpRecovery.resumePhase !== 'PREPARED') {
        try { await service(['start',...['controller','supervisor','monitor'].map(unit)]); }
        catch { await captureServiceFailures(); await save('MCP_RECOVERY_REQUIRED'); }
      }
      throw reported(error('update-mcp-recovery-required'));
    }
    if (receiptTrusted && receipt?.phase === 'MCP_RECOVERY_REQUIRED') throw reported(cause);
    if (receiptTrusted && receipt && ['STOPPING','INSTALLING','RESTARTING','VERIFYING'].includes(receipt.phase)) {
      receipt.failureCode = safeCauseCode(cause.code);
      await captureServiceFailures();
      await save(receipt.phase);
    }
    if (!receiptTrusted) throw cause.code?.startsWith('update-') ? cause : error('update-journal-invalid');
    if (receipt?.maintenance?.generation === null) {
      try {
        const global = (await request(c.controllerUrl, '/coordination/global')).global;
        if (global?.transactionId !== receipt.maintenance.transactionId) receipt.maintenance = null;
      } catch { /* Preserve an uncertain maintenance intent for recovery. */ }
    }
    if (readonlyBroker && receipt?.externalBroker?.disconnectIntentAt !== null && receipt?.externalBroker &&
        !['RELEASING','COMPLETED','ROLLBACK_RELEASING','ROLLED_BACK'].includes(receipt.phase)) {
      receipt.recoveryError=cause.code?.startsWith('update-') ? cause.code : 'update-broker-recovery-unavailable';
      await save('READONLY_RECOVERY_REQUIRED'); throw error('update-broker-forward-recovery-required');
    }
    if (receipt && ['RELEASING', 'ROLLBACK_RELEASING'].includes(receipt.phase)) throw error('update-recovery-required');
    if (receipt && ['STOPPING', 'INSTALLING', 'RESTARTING', 'VERIFYING', 'ROLLING_BACK'].includes(receipt.phase)) {
      try { await rollback(); } catch { await save('ROLLBACK_FAILED'); throw reported(error('update-recovery-required')); }
      throw reported(error('update-failed-rolled-back'));
    }
    if (receipt && !receipt.maintenance && ['PREPARING', 'PREPARED'].includes(receipt.phase)) {
      try { await restoreInitialServices(); }
      catch { await save('ROLLBACK_FAILED'); throw error('update-controller-restore-required'); }
      receipt.failureCode = safeCauseCode(cause.code);
      await save('PREPARATION_FAILED');
    }
    if (cause.code?.startsWith('update-')) throw reported(cause);
    const failure = error('update-preparation-failed');
    failure.causeCode = safeCauseCode(cause.code);
    throw reported(failure);
  } finally {
    try { if (receipt && complete.has(receipt.phase)) {
      for (let i = 0; i < receipt.files.length; i++) {
        try { await unlink(join(dirname(target(receipt.files[i])), '.cab-ready-' + receipt.id + '-' + i)); }
        catch (cause) { if (cause.code !== 'ENOENT') throw error('update-prepared-cleanup-failed'); }
      }
    } } finally { await lock.close(); }
  }
}

export async function maintainFrozenController(input, options = {}) {
  if (input.brokerPolicy !== undefined || input.brokerProof !== undefined) throw error('update-broker-policy-profile-invalid');
  if (options.rollbackOnly) throw error('update-frozen-manual-rollback-not-supported');
  const c = configuration(input), spec = input.frozenRecovery;
  if (input.layout !== undefined && (!['flat','managed-release'].includes(input.layout) ||
      input.layout !== (spec?.layout || 'flat'))) throw error('update-frozen-layout-divergent');
  if (!spec || typeof spec.authorization !== 'string' || !spec.authorization.trim() || spec.authorization.length > 500 ||
      !/^maintenance-[a-f0-9-]{36}$/.test(spec.transactionId || '') || !spec.originalManifest ||
      !/^[a-f0-9]{64}$/.test(spec.expectedBuildDigest || '') ||
      !spec.preservedProcesses?.opencode || !spec.preservedProcesses?.broker ||
      !Object.hasOwn(spec.preservedProcesses, 'web')) throw error('update-frozen-contract-invalid');
  validateFrozenTarget(spec.target);
  const service = options.serviceCommand || command, request = maintenanceHttp;
  const openCode = options.openCodeClient || createOpenCodeV2ClientFromEnv({ directory: c.workspace, baseUrl: c.opencodeUrl,
    ...(options.openCodeFetch ? { fetchImpl: options.openCodeFetch } : {}) });
  const root = join(c.state, 'frozen-controller'), transactionId = spec.transactionId;
  await directories(c.state, true); await directories(root, true);
  if ((await lstat(root)).uid !== process.getuid() || ((await lstat(root)).mode & 0o077)) throw error('update-private-state-required');
  const lock = await authority(join(c.state, 'update.lock'));
  const journalFile = join(root, transactionId + '.json'), work = join(root, transactionId);
  let journal, registryLock, journalTrusted = false;
  const phases = ['PREPARED','BOOTSTRAP_HELD','STOPPING','STOPPED','INSTALLED','RESTARTED','ADOPTED','VERIFIED','COMPLETED'];
  const reached = (phase) => phases.indexOf(journal.phase) >= phases.indexOf(phase);
  async function save(phase) {
    journal.phase = phase; await atomic(journalFile, Buffer.from(JSON.stringify(journal, null, 2) + '\n'));
    if (options.onPhase) await options.onPhase(phase, structuredClone(journal));
  }
  async function ownedService(component) {
    const text = await service(['show', unit(component), '--property=LoadState,ActiveState,MainPID,ExecStart']);
    const value = Object.fromEntries(text.trim().split('\n').map((line) => {
      const at = line.indexOf('='); return [line.slice(0,at),line.slice(at+1)];
    }));
    if (!['active','inactive'].includes(value.ActiveState) || value.LoadState !== 'loaded') throw error('update-service-state-unknown');
    if (value.ActiveState === 'active') {
      const directory = component === 'monitor' ? c.roots.monitorScripts : c.roots.scripts;
      const entry = join(directory, 'cgpt-approval-bridge-' + component + '.mjs');
      const escaped = entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!new RegExp('(?:^|[\\s=\\x22\\x27])' + escaped + '(?:$|[\\s;\\]\\}\\x22\\x27])')
        .test((value.ExecStart || '').replaceAll('\\x20',' '))) throw error('update-service-not-owned');
      value.identity = await processIdentity(Number(value.MainPID));
      if (value.identity.uid !== process.getuid()) throw error('update-service-not-owned');
    }
    return value;
  }
  async function preserved() {
    for (const identity of Object.values(spec.preservedProcesses).filter(Boolean)) {
      if (proofHash(await processIdentity(identity.pid)) !== proofHash(identity)) throw error('update-preserved-process-changed');
    }
  }
  async function nativeUnchanged() {
    await preserved();
    const [health,path,mcp,busy,permissions] = await Promise.all([
      openCode.info(),openCode.location(c.workspace),openCode.mcp(),openCode.sessionStatus(c.workspace),openCode.permissions(c.workspace)]);
    if (!health.version.startsWith('2.') || path.directory !== c.workspace || mcp['cgpt-validation']?.status !== 'connected' ||
        !busy || Object.values(busy).some((s) => s?.type !== 'idle') || !Array.isArray(permissions) || permissions.length) {
      throw error('update-native-boundary-changed');
    }
    for (const [id, original] of Object.entries(journal.seal.proof.sessions)) {
      const [session,messages] = await Promise.all([openCode.session(id,c.workspace),openCode.messages(id,c.workspace)]);
      if (session.id !== id || session.directory !== c.workspace || !Array.isArray(messages) ||
          messages.some((m) => !Array.isArray(m.parts))) throw error('update-native-boundary-changed');
      const parts = messages.flatMap((m) => m.parts.filter((p) => p.type === 'tool'));
      if (parts.length !== original.count || hash(Buffer.from(JSON.stringify(parts))) !== original.hash ||
          proofHash(session.permission) !== original.permissionHash) throw error('update-native-boundary-changed');
    }
  }
  async function startController() {
    if ((await ownedService('controller')).ActiveState !== 'active') await service(['start', unit('controller')]);
    const end = Date.now() + 35000;
    while (true) {
      try {
        const status = await request(c.controllerUrl, '/status');
        if (status.frozenRecoveryMaintenance === FROZEN_CAPABILITY && status.maintenanceBuildDigest === spec.expectedBuildDigest &&
            status.brokerReadiness?.server_version === '1.7.1' &&
            Number.isFinite(Date.parse(status.brokerReadiness.checked_at)) &&
            Date.now() - Date.parse(status.brokerReadiness.checked_at) <= 35000) return status;
      } catch { /* Attendre seulement le démarrage du service explicitement demandé. */ }
      if (Date.now() >= end) throw error('update-new-controller-unconfirmed');
      await new Promise((done) => setTimeout(done, 50));
    }
  }
  function destination(file) {
    if (!file || !/^[a-zA-Z0-9_-]+\.(mjs|py)$/.test(file.name)) throw error('update-journal-invalid');
    return join(journal.installation?.layout === 'managed-release' ? journal.deployment.directory : c.roots.scripts, file.name);
  }
  const oldDestination = (file) => join(journal.installation.directory,file.name);
  async function switchControllerLink(next) {
    const installation=journal.installation;
    if (installation.layout !== 'managed-release') return;
    const current=await readlink(installation.entry);
    if (![installation.link,journal.deployment.link].includes(current)) throw error('update-managed-pointer-changed');
    if (current===next) return;
    const temporary=join(installation.root,'.cab-controller-'+randomUUID());
    await symlink(next,temporary); await rename(temporary,installation.entry);
    const fd=await open(installation.root,'r'); try { await fd.sync(); } finally { await fd.close(); }
  }
  async function registryUnchanged() {
    const state = JSON.parse((await regular(join(c.workspace, '.opencode/state/cgpt-approval-bridge/controller-runs.json'))).data);
    if (state.requestOwners?.[spec.target.preflightRequestId]?.reconciliation) throw error('update-rollback-incompatible-receipt');
    const stable = { ...state, version: null, coordination: { ...state.coordination, global: null } };
    if (proofHash(stable) !== journal.seal.proof.registryHash) throw error('update-registry-changed');
  }
  async function recheck() {
    if (Date.now() > journal.seal.expiresAt) throw error('update-bootstrap-proof-expired');
    await checkInstallationJournal(journal,reached('INSTALLED'));
    for (let i=0; i<journal.files.length; i++) {
      const file=journal.files[i], installed=await optional(reached('INSTALLED') ? destination(file) : oldDestination(file));
      if (hash((await regular(join(work,'stage-'+i))).data) !== file.afterHash) throw error('update-stage-changed');
      if (file.beforeHash && hash((await regular(join(work,'backup-'+i))).data) !== file.beforeHash) throw error('update-backup-invalid');
      if ((installed ? hash(installed.data) : null) !== (reached('INSTALLED') ? file.afterHash : file.beforeHash)) throw error('update-installed-artifact-changed');
    }
    await nativeUnchanged();
    const actual = await collectFrozenProof({ controllerUrl:c.controllerUrl, openCode, workspace:c.workspace, target: spec.target, request });
    if (proofHash(actual) !== proofHash(journal.seal.proof)) throw error('update-frozen-proof-changed');
  }
  try {
    const old = await optional(journalFile);
    if (old) {
      journal = JSON.parse(old.data);
      if (journal.profile !== FROZEN_PROFILE || journal.inputDigest !== proofHash({ ...c, frozenRecovery: spec }) ||
          old.uid !== process.getuid() || (old.mode & 0o077) ||
          journal.transactionId !== transactionId || !Array.isArray(journal.files) || !phases.includes(journal.phase) ||
          journal.files.length > 64 || journal.files.length !== Object.keys(journal.manifest || {}).length ||
          proofHash(journal.manifest) !== spec.expectedBuildDigest || proofHash(journal.originalManifest) !== proofHash(spec.originalManifest) ||
          new Set(journal.files.map((f) => f.name)).size !== journal.files.length || journal.files.some((f) =>
            !/^[a-zA-Z0-9_-]+\.(mjs|py)$/.test(f.name || '') || f.afterHash !== journal.manifest[f.name] ||
            f.beforeHash !== (journal.originalManifest[f.name] || null) || !Number.isInteger(f.mode) || f.mode < 0 || f.mode > 0o777)) throw error('update-journal-invalid');
      if (reached('BOOTSTRAP_HELD')) await readBootstrapJournal(root, transactionId);
      journalTrusted = true;
      if (journal.seal && Date.now()>journal.seal.expiresAt) throw error('update-bootstrap-proof-expired');
      if (journal.phase === 'COMPLETED') {
        const status = await request(c.controllerUrl, '/status');
        await preserved();
        if (status.maintenanceBuildDigest !== spec.expectedBuildDigest) throw error('update-loaded-build-changed');
        return { status: 'up-to-date', transactionId, profile: FROZEN_PROFILE, packageVersion: VERSION,
          runtimeVersions: { ...journal.runtimeVersions, controller: VERSION }, buildDigest: spec.expectedBuildDigest };
      }
    } else {
      const controller = await ownedService('controller'), supervisor = await ownedService('supervisor'), web = await ownedService('monitor');
      const status = await request(c.controllerUrl, '/status');
      if (controller.ActiveState !== 'active' || status.pid !== controller.identity.pid || status.version !== '1.7.1' ||
          status.frozenRecoveryMaintenance || status.notificationReconciliation) throw error('update-original-controller-not-proved');
      await preserved();
      const supervisorStatus = supervisor.ActiveState === 'active' ? await request(c.supervisorUrl, '/status') : null;
      const webStatus = web.ActiveState === 'active' ? await request(c.monitorUrl, '/api/snapshot') : null;
      const runtimeVersions = { controller: status.version, broker: status.brokerReadiness?.server_version || null,
        supervisor: supervisorStatus?.version || null, web: webStatus?.version || null };
      if (runtimeVersions.broker !== '1.7.1' ||
          (supervisorStatus && runtimeVersions.supervisor !== '1.7.1') || (webStatus && runtimeVersions.web !== '1.7.1')) {
        throw error('update-frozen-mixed-version-not-qualified');
      }
      if ((web.ActiveState === 'active') !== Boolean(spec.preservedProcesses.web) ||
          (web.identity && proofHash(web.identity) !== proofHash(spec.preservedProcesses.web))) throw error('update-web-identity-divergent');
      const installation = await inspectControllerInstallation(join(c.roots.scripts, 'cgpt-approval-bridge-controller.mjs'),spec.layout || 'flat');
      const originalManifest = installation.manifest;
      if (proofHash(originalManifest) !== proofHash(spec.originalManifest)) throw error('update-original-code-divergent');
      const manifest = await moduleManifest(join(c.pluginRoot, 'scripts/cgpt-approval-bridge-controller.mjs'));
      if (proofHash(manifest) !== spec.expectedBuildDigest) throw error('update-build-digest-divergent');
      journal = { profile: FROZEN_PROFILE, id: transactionId, transactionId, authorization: spec.authorization,
        installation, deployment: installation.layout === 'managed-release' ? {
          directory:join(installation.root,'releases',VERSION+'+build.'+spec.expectedBuildDigest.slice(0,16),'scripts'),
          link:'releases/'+VERSION+'+build.'+spec.expectedBuildDigest.slice(0,16)+'/scripts/cgpt-approval-bridge-controller.mjs' } : {directory:c.roots.scripts},
        runtimeVersions,
        inputDigest: proofHash({ ...c, frozenRecovery: spec }), active: { supervisor: supervisor.ActiveState === 'active' }, files: [],
        originalController: controller.identity, manifest, originalManifest };
      await directories(work, true);
      for (const [name,afterHash] of Object.entries(manifest)) {
        const source = await regular(join(c.pluginRoot, 'scripts', name));
        const before = await optional(join(installation.directory,name));
        if ((before ? hash(before.data) : null) !== (originalManifest[name] || null)) throw error('update-original-code-divergent');
        if (sourceVersion(source.data) !== VERSION) throw error('update-package-version-invalid');
        await syntax(join(c.pluginRoot,'scripts',name),work);
        if (hash(source.data) !== afterHash) throw error('update-stage-changed');
        const i = journal.files.length;
        if (before) await atomic(join(work,'backup-'+i), before.data);
        await atomic(join(work,'stage-'+i), source.data);
        journal.files.push({ name, beforeHash: before ? hash(before.data) : null, afterHash, mode: before?.mode ?? source.mode });
      }
      journalTrusted = true;
      await save('PREPARED');
    }
    if (!reached('BOOTSTRAP_HELD')) {
      const global = await request(c.controllerUrl, '/coordination/global/request', { transactionId,
        cause: 'SHARED_MAINTENANCE', scope: 'all', authorization: spec.authorization,
        evidence: [spec.expectedBuildDigest] });
      let refusal;
      try { await request(c.controllerUrl, '/coordination/global/confirm', { transactionId, generation: global.generation, evidence: ['original-boundary-check'] }); }
      catch (cause) { refusal = { status: cause.httpStatus, error: cause.refusal }; }
      if (global.state !== 'DRAINING' || refusal?.status !== 409 || refusal.error !== 'run-not-quiescent') throw error('update-original-refusal-not-proved');
      const proof = await collectFrozenProof({ controllerUrl:c.controllerUrl, openCode, workspace:c.workspace, target: spec.target, request });
      const second = await collectFrozenProof({ controllerUrl:c.controllerUrl, openCode, workspace:c.workspace, target: spec.target, request });
      if (proofHash(proof) !== proofHash(second)) throw error('update-frozen-proof-changed');
      const createdAt = Date.now();
      journal.seal = { transactionId, workspace: c.workspace, authorization: spec.authorization, authority: 'BOOTSTRAP_HELD',
        target: spec.target, generation: global.generation, globalInputDigest: global.inputDigest,
        proof, filesHash: proofHash(journal.files), installationHash:proofHash(journal.installation), deploymentHash:proofHash(journal.deployment),
        manifest: journal.manifest, buildDigest: spec.expectedBuildDigest,
        originalController: journal.originalController, originalManifest: journal.originalManifest,
        preservedProcesses: spec.preservedProcesses, originalRefusal: refusal,
        createdAt, expiresAt: createdAt + 60000 };
      journal.sealDigest = proofHash(journal.seal); await save('BOOTSTRAP_HELD');
    }
    if (!reached('STOPPED')) {
      await recheck();
      if (proofHash((await ownedService('controller')).identity) !== proofHash(journal.originalController)) throw error('update-controller-identity-changed');
      await save('STOPPING');
      if (journal.active.supervisor) await service(['stop',unit('supervisor')]);
      await recheck();
      await service(['stop',unit('controller')]);
      if (!await originalGone(journal.originalController)) throw error('update-controller-stop-unconfirmed');
      await save('STOPPED');
    }
    if (!reached('INSTALLED')) {
      registryLock = await authority(join(c.workspace,'.opencode/state/cgpt-approval-bridge/registry.instance.lock'));
      await registryUnchanged(); await nativeUnchanged();
      if (journal.installation.layout === 'managed-release') await directories(journal.deployment.directory,true);
      for (let i=0; i<journal.files.length; i++) {
        const file=journal.files[i], current=await optional(destination(file));
        if (journal.installation.layout === 'managed-release') {
          if (current && hash(current.data)!==file.afterHash) throw error('update-installed-artifact-changed');
        } else if ((current ? hash(current.data) : null) !== file.beforeHash) throw error('update-installed-artifact-changed');
        const staged=await regular(join(work,'stage-'+i));
        if (hash(staged.data) !== file.afterHash) throw error('update-stage-changed');
        if (!current || hash(current.data)!==file.afterHash) await atomic(destination(file),staged.data,file.mode);
      }
      await switchControllerLink(journal.deployment.link);
      await save('INSTALLED'); await registryLock.close(); registryLock=null;
    }
    if (!reached('RESTARTED')) {
      await nativeUnchanged(); await startController();
      journal.newController=(await ownedService('controller')).identity;
      await save('RESTARTED');
    }
    if (!reached('ADOPTED')) {
      const adopted=await request(c.controllerUrl,'/coordination/maintenance/adopt',{transactionId,sealDigest:journal.sealDigest});
      if (adopted.state !== 'HELD' || adopted.buildDigest !== spec.expectedBuildDigest) throw error('update-adoption-unconfirmed');
      await save('ADOPTED');
    }
    await recheck(); await save('VERIFIED');
    if (journal.active.supervisor && (await ownedService('supervisor')).ActiveState !== 'active') await service(['start',unit('supervisor')]);
    await recheck();
    const released=await request(c.controllerUrl,'/coordination/global/release',{transactionId,
      generation:journal.seal.generation,authorization:spec.authorization,evidence:[journal.sealDigest]});
    if (released.state !== 'RELEASED') throw error('update-release-unconfirmed');
    await preserved(); await save('COMPLETED');
    return { status:'completed',profile:FROZEN_PROFILE,transactionId,packageVersion:VERSION,
      runtimeVersions:{...journal.runtimeVersions,controller:VERSION},buildDigest:spec.expectedBuildDigest,
      preservedProcesses:spec.preservedProcesses, originalRefusal:journal.seal.originalRefusal };
  } catch (cause) {
    if (cause.code === 'SIMULATED_CRASH' && options.onPhase) throw cause;
    if (journalTrusted && ['STOPPING','STOPPED','INSTALLED','RESTARTED','ADOPTED','VERIFIED'].includes(journal.phase)) {
      try {
        if (registryLock) { await registryLock.close(); registryLock = null; }
        await registryUnchanged();
        const current=await ownedService('controller');
        if (current.ActiveState === 'active' && proofHash(current.identity) !== proofHash(journal.originalController)) await service(['stop',unit('controller')]);
        if (journal.installation.layout === 'managed-release') {
          if (proofHash(await moduleManifest(journal.installation.realEntry))!==proofHash(journal.originalManifest)) throw error('update-original-release-changed');
          await switchControllerLink(journal.installation.link);
        } else for (let i=0; i<journal.files.length; i++) {
          const file=journal.files[i], currentFile=await optional(destination(file));
          const currentHash=currentFile ? hash(currentFile.data) : null;
          if (currentHash !== file.beforeHash && currentHash !== file.afterHash) throw error('update-installed-artifact-changed');
          if (currentHash !== file.beforeHash) {
            if (file.beforeHash) {
              const backup=await regular(join(work,'backup-'+i));
              if (hash(backup.data) !== file.beforeHash) throw error('update-backup-invalid');
              await atomic(destination(file),backup.data,file.mode);
            } else await unlink(destination(file));
          }
        }
        if ((await ownedService('controller')).ActiveState !== 'active') await service(['start',unit('controller')]);
        if (journal.active.supervisor && (await ownedService('supervisor')).ActiveState !== 'active') await service(['start',unit('supervisor')]);
        await save('ROLLED_BACK_FROZEN');
      } catch (rollbackCause) {
        journal.rollbackError = /^(update|maintenance)-/.test(rollbackCause.code || '')
          ? rollbackCause.code : 'update-rollback-unavailable';
        await save('ROLLBACK_FAILED');
      }
    }
    throw cause;
  } finally { if (registryLock) await registryLock.close(); await lock.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1])).href) {
  try {
    const keys = { '--plugin-root': 'pluginRoot', '--workspace': 'workspace', '--broker-directory': 'brokerDirectory', '--home': 'home',
      '--controller-url': 'controllerUrl', '--supervisor-url': 'supervisorUrl', '--monitor-url': 'monitorUrl', '--opencode-url': 'opencodeUrl', '--wait-ms': 'waitMs',
      '--profile': 'profile', '--frozen-proof-file': 'frozenProofFile', '--layout':'layout',
      '--opencode-password-env-file':'passwordEnvFile','--service-workspace':'serviceWorkspace','--broker-policy':'brokerPolicy','--broker-proof-file':'brokerProofFile',
      '--recover-mcp':'recoverMcp' };
    const input = {}; let rollbackOnly = false;
    for (let i = 2; i < process.argv.length; i++) {
      const argument = process.argv[i];
      if (argument === '--rollback' && !rollbackOnly) { rollbackOnly = true; continue; }
      if (!keys[argument] || Object.hasOwn(input, keys[argument]) || !process.argv[i + 1]) throw error('update-arguments-invalid');
      input[keys[argument]] = argument === '--wait-ms' ? Number(process.argv[++i]) : process.argv[++i];
    }
    input.workspace = await realpath(input.workspace);
    if (input.brokerProofFile !== undefined) {
      const supplied=await regular(input.brokerProofFile);
      if ((supplied.mode & 0o077) || supplied.uid !== process.getuid()) throw error('update-private-proof-required');
      input.brokerProof=JSON.parse(supplied.data);delete input.brokerProofFile;
    }
    if (input.profile === FROZEN_PROFILE) {
      const supplied=await regular(input.frozenProofFile);
      if ((supplied.mode & 0o077) || supplied.uid !== process.getuid()) throw error('update-private-proof-required');
      input.frozenRecovery=JSON.parse(supplied.data); delete input.frozenProofFile;
    }
    const result = await updateComponents(input, { rollbackOnly,
      onPhase: async (phase, receipt) => { process.stdout.write(JSON.stringify({ phase, transactionId: receipt.id }) + '\n'); } });
    process.stdout.write(JSON.stringify(result) + '\n');
    if (result.status === 'waiting') process.exitCode = 2;
  } catch (cause) {
    const errorCode = /^(update|maintenance)-/.test(cause.code || '') ? cause.code : 'update-unavailable';
    process.stderr.write(JSON.stringify({ error: errorCode, ...(cause.causeCode ? { cause: cause.causeCode } : {}),
      ...(cause.transactionId ? { transactionId: cause.transactionId, failureCode: cause.failureCode,
        serviceFailures: cause.serviceFailures, recoveryPhase: cause.recoveryPhase } : {}) }) + '\n');
    process.exitCode = 1;
  }
}
