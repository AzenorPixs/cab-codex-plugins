import { constants } from 'node:fs';
import { lstat, mkdir, open, realpath, readdir, rename, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

export const VERSION = '1.7.1';
const exec = promisify(execFile);
const hash = (data) => createHash('sha256').update(data).digest('hex');
const error = (code) => Object.assign(new Error(code), { code });
const brokerFiles = ['cgpt_approval_bridge_server.py', 'cgpt_approval_bridge_router.py', 'cgpt_approval_bridge_journal.py'];
const unit = (name) => 'cgpt-approval-bridge-' + name + '.service';
const complete = new Set(['COMPLETED', 'ROLLED_BACK', 'PREPARATION_FAILED']);
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
    const chunks = []; let bytes = 0;
    for await (const chunk of response.body) {
      bytes += chunk.length; if (bytes > 2 * 1024 * 1024) throw error('update-response-too-large'); chunks.push(chunk);
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
  for (const key of ['home', 'workspace', 'pluginRoot', 'brokerDirectory']) {
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
    units: join(c.home, '.config/systemd/user'), broker: c.brokerDirectory };
  const cacheRoots = [join(c.home, '.codex/plugins/cache')];
  const cacheAt = c.pluginRoot.indexOf('/plugins/cache/');
  if (cacheAt >= 0) cacheRoots.push(c.pluginRoot.slice(0, cacheAt) + '/plugins/cache');
  for (const target of Object.values(c.roots)) {
    if (cacheRoots.some((cache) => within(cache, target))) throw error('update-cache-destination-refused');
    if (within(c.workspace, target) || within(c.pluginRoot, target) || within(target, c.pluginRoot) || within(target, c.workspace)) {
      throw error('update-project-destination-refused');
    }
  }
  c.state = join(c.home, '.local/state/cab-approval-bridge-update');
  if (within(c.workspace, c.state) || within(c.pluginRoot, c.state)) throw error('update-project-destination-refused');
  return c;
}
const runIdentity = (registry) => hash(JSON.stringify({
  runs: [...registry.runs].sort((a, b) => a.runId.localeCompare(b.runId)).map((run) =>
    [run.runId, run.changeId, run.sessionId, run.contextId, run.version, run.state, run.suspension || null, run.resources]),
  requestOwners: Object.entries(registry.requestOwners || {}).sort(([a], [b]) => a.localeCompare(b)) }));

export async function updateComponents(input, options = {}) {
  const c = configuration(input);
  const service = options.serviceCommand || command, request = options.http || http;
  const validate = options.syntax || syntax;
  const now = options.now || Date.now;
  const sleep = options.sleep || ((ms) => new Promise((done) => setTimeout(done, ms)));
  const contextKey = hash(JSON.stringify([c.home, c.workspace, c.brokerDirectory,
    c.controllerUrl, c.supervisorUrl, c.monitorUrl, c.opencodeUrl]));
  await directories(c.workspace); await directories(c.pluginRoot); await directories(c.state, true);
  const stateStat = await lstat(c.state);
  if (stateStat.uid !== process.getuid() || (stateStat.mode & 0o077)) throw error('update-private-state-required');
  const lock = await authority(join(c.state, 'update.lock'));
  let receipt;
  let receiptTrusted = false;
  let recovered = false;
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
  async function save(phase) {
    if (lock.process.exitCode !== null || lock.process.signalCode !== null) throw error('update-lock-lost');
    receipt.phase = phase; receipt.updatedAt = new Date(now()).toISOString();
    const data = JSON.stringify(receipt, null, 2) + '\n';
    await atomic(join(transaction(), 'receipt.json'), data); await atomic(currentFile, data);
    await options.onPhase?.(phase, structuredClone(receipt));
  }
  async function metadata(component) {
    const raw = await service(['show', unit(component), '--property=LoadState,ActiveState,MainPID,ExecStart']);
    const value = Object.fromEntries(raw.trim().split('\n').map((line) => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)]; }));
    if (!['active', 'inactive', 'failed'].includes(value.ActiveState) || !['loaded', 'not-found'].includes(value.LoadState)) throw error('update-service-state-unknown');
    if (value.ActiveState === 'active') {
      const entry = component === 'monitor' ? join(c.roots.monitorScripts, 'cgpt-approval-bridge-monitor.mjs') :
        join(c.roots.scripts, 'cgpt-approval-bridge-' + component + '.mjs');
      const escaped = entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!Number.isSafeInteger(Number(value.MainPID)) || Number(value.MainPID) < 1 ||
          !new RegExp('(?:^|[\\s=\\x22\\x27])' + escaped + '(?:$|[\\s;\\]\\}\\x22\\x27])')
            .test((value.ExecStart || '').replaceAll('\\x20', ' '))) throw error('update-service-not-owned');
    }
    return value;
  }
  const nativePath = (path) => path + '?directory=' + encodeURIComponent(c.workspace);
  async function brokerState() {
    const value = await request(c.opencodeUrl, nativePath('/mcp'));
    const status = value?.['cgpt-validation']?.status;
    if (!['connected', 'disabled'].includes(status)) throw error('update-broker-state-unknown');
    return status;
  }
  async function nativeBroker(action) {
    await request(c.opencodeUrl, nativePath('/mcp/cgpt-validation/' + action), {});
    if (await brokerState() !== (action === 'connect' ? 'connected' : 'disabled')) throw error('update-broker-state-unconfirmed');
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
      try { if (await check()) return true; } catch (cause) { if (cause.code === 'update-runtime-incompatible') throw cause; }
      if (now() >= deadline) return false;
      await sleep(Math.min(1000, deadline - now()));
    } while (true);
  }
  async function drain() {
    if (!receipt.maintenance) return true;
    const { transactionId, generation } = receipt.maintenance;
    return wait(async () => {
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
    if (receipt.maintenance && (await metadata('controller')).ActiveState === 'active') {
      const global = (await request(c.controllerUrl, '/coordination/global')).global;
      if (!global || global.state !== 'HELD' || global.transactionId !== receipt.maintenance.transactionId ||
          global.generation !== receipt.maintenance.generation) throw error('update-maintenance-owner-changed');
    }
    if (receipt.active.supervisor) await service(['stop', unit('supervisor')]);
    if (receipt.brokerConnected) await nativeBroker('disconnect');
    if (receipt.active.controller) await service(['stop', unit('controller')]);
    if (receipt.active.monitor) await service(['stop', unit('monitor')]);
    for (const component of ['controller', 'supervisor', 'monitor']) {
      if ((await metadata(component)).ActiveState === 'active') throw error('update-service-stop-unconfirmed');
    }
  }
  async function startAll() {
    if (receipt.active.controller) {
      await service(['start', unit('controller')]);
      if (!await wait(async () => Boolean(await registry()), 30000)) throw error('update-controller-start-unconfirmed');
      if (receipt.maintenance) {
        const global = (await request(c.controllerUrl, '/coordination/global')).global;
        if (!global || global.state !== 'HELD' || global.transactionId !== receipt.maintenance.transactionId ||
            global.generation !== receipt.maintenance.generation) throw error('update-maintenance-owner-changed');
      }
    }
    if (receipt.brokerConnected) await nativeBroker('connect');
    if (receipt.active.monitor) await service(['start', unit('monitor')]);
    if (receipt.active.supervisor) await service(['start', unit('supervisor')]);
  }
  async function verified(expected) {
    for (const component of ['controller', 'supervisor', 'monitor']) {
      const meta = await metadata(component);
      if ((meta.ActiveState === 'active') !== receipt.active[component]) return false;
      if (!receipt.active[component]) continue;
      const status = await request(c[component === 'monitor' ? 'monitorUrl' : component + 'Url'], component === 'monitor' ? '/api/snapshot' : '/status');
      const workspace = component === 'monitor' ? status.identity?.workspace : status.workspace;
      if (status.version !== expected[component] || (workspace && workspace !== c.workspace) ||
          (status.pid && status.pid !== Number(meta.MainPID))) return false;
      if (component === 'monitor' && workspace !== c.workspace) return false;
    }
    if (receipt.active.controller) {
      if (receipt.runIdentity && receipt.runIdentity !== runIdentity(await registry())) throw error('update-run-identity-changed');
      if (receipt.brokerConnected) {
        const status = await request(c.controllerUrl, '/status');
        if (status.brokerReadiness?.server_version !== expected.broker ||
            !status.brokerReadinessReceivedAt ||
            Date.parse(status.brokerReadinessReceivedAt) < (receipt.brokerReconnectedAt || now() - 10000)) return false;
      }
    }
    return true;
  }
  async function rollback() {
    await save('ROLLING_BACK'); await stopAll();
    for (const file of receipt.files) {
      const current = await optional(target(file));
      const currentHash = current ? hash(current.data) : null;
      if (currentHash !== file.beforeHash && currentHash !== file.afterHash) throw error('update-installed-artifact-changed');
    }
    for (let i = 0; i < receipt.files.length; i++) {
      const file = receipt.files[i]; const path = target(file);
      if (file.beforeHash) {
        const saved = await regular(join(transaction(), 'backup', String(i)));
        if (hash(saved.data) !== file.beforeHash) throw error('update-backup-invalid');
        await atomic(path, saved.data, file.mode);
      } else if (await optional(path)) await unlink(path);
    }
    await service(['daemon-reload']); receipt.brokerReconnectedAt = now(); await startAll();
    if (!await wait(() => verified(receipt.previousVersions), 30000)) throw error('update-rollback-unconfirmed');
    await save('ROLLBACK_RELEASING'); await release(); await save('ROLLED_BACK');
  }
  try {
    const existing = await optional(currentFile);
    if (existing) {
      try { receipt = JSON.parse(existing.data.toString('utf8')); } catch { throw error('update-journal-invalid'); }
      if (receipt.schema !== 1 || (!complete.has(receipt.phase) && receipt.contextKey !== contextKey) || !/^update-[a-f0-9-]{36}$/.test(receipt.id) ||
          !Array.isArray(receipt.files) || receipt.files.length > 128 || !receipt.active ||
          !['PREPARING', 'PREPARED', 'FREEZING', 'WAITING', 'STOPPING', 'INSTALLING', 'RESTARTING', 'VERIFYING',
            'RELEASING', 'ROLLING_BACK', 'ROLLBACK_RELEASING', 'ROLLBACK_FAILED', ...complete].includes(receipt.phase) ||
          !['controller', 'supervisor', 'monitor'].every((component) => typeof receipt.active[component] === 'boolean')) throw error('update-journal-invalid');
      for (const file of receipt.files) {
        target(file);
        if ((file.beforeHash !== null && !/^[a-f0-9]{64}$/.test(file.beforeHash)) ||
            !/^[a-f0-9]{64}$/.test(file.afterHash) || !Number.isInteger(file.mode) || file.mode < 0 || file.mode > 0o777) throw error('update-journal-invalid');
      }
      if (new Set(receipt.files.map(target)).size !== receipt.files.length || typeof receipt.brokerConnected !== 'boolean' ||
          !baseVersion(receipt.version) || (receipt.maintenance && (receipt.maintenance.transactionId !== receipt.id ||
            (!Number.isSafeInteger(receipt.maintenance.generation) && receipt.phase !== 'FREEZING')))) throw error('update-journal-invalid');
      receiptTrusted = true;
      if (['RELEASING', 'ROLLBACK_RELEASING'].includes(receipt.phase)) {
        const finished = receipt.phase === 'RELEASING' ? 'COMPLETED' : 'ROLLED_BACK';
        if (receipt.maintenance) {
          const global = (await request(c.controllerUrl, '/coordination/global')).global;
          if (!global || global.transactionId !== receipt.maintenance.transactionId || global.generation !== receipt.maintenance.generation) {
            throw error('update-maintenance-owner-changed');
          }
          if (global.state !== 'RELEASED') {
            const versions = finished === 'COMPLETED' ? Object.fromEntries(['controller', 'supervisor', 'monitor', 'broker'].map((name) => [name, receipt.version])) : receipt.previousVersions;
            if (global.state !== 'HELD' || !await verified(versions)) throw error('update-recovery-required');
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
      if (!complete.has(receipt.phase) && receipt.phase !== 'WAITING') {
        if (['PREPARING', 'PREPARED'].includes(receipt.phase) && !receipt.maintenance) await save('PREPARATION_FAILED');
        else {
          try { await rollback(); recovered = true; } catch { await save('ROLLBACK_FAILED'); throw error('update-recovery-required'); }
        }
      }
    }
    if (options.rollbackOnly) {
      if (!receipt || complete.has(receipt.phase)) return { status: recovered ? 'rolled-back' : 'nothing-to-recover' };
      if (!await drain()) return { status: 'waiting', transactionId: receipt.id };
      if (receipt.phase === 'WAITING') {
        await save('ROLLBACK_RELEASING'); await release(); await save('ROLLED_BACK');
      } else await rollback();
      return { status: 'rolled-back', transactionId: receipt.id };
    }
    if (receipt?.phase !== 'WAITING') {
      const manifest = JSON.parse((await regular(join(c.pluginRoot, '.codex-plugin/plugin.json'))).data.toString('utf8'));
      const version = baseVersion(manifest.version);
      if (version !== VERSION) throw error('update-package-version-invalid');
      receipt = { schema: 1, contextKey, id: 'update-' + randomUUID(), version, phase: 'PREPARING',
        active: { controller: false, supervisor: false, monitor: false }, files: [], brokerConnected: false };
      receiptTrusted = true;
      await save('PREPARING');
      const scripts = (await readdir(join(c.pluginRoot, 'scripts'))).filter((name) => /^cgpt-approval-bridge-[a-z-]+\.(mjs|py)$/.test(name)).sort();
      const required = ['controller.mjs', 'job-context.mjs', 'runs.mjs', 'resource-coordination.mjs',
        'statistics.mjs', 'observation-statistics.mjs', 'statistics-maintenance.mjs', 'import-observations.mjs',
        'registry-lock.py', 'supervisor.mjs', 'supervisor-context.mjs', 'opencode-sse-client.mjs', 'healthcheck.mjs',
        'reset.py', 'prompts.py', 'monitor.mjs', 'monitor-data.mjs', 'monitor-events.mjs', 'monitor-management.mjs',
        'run-steps.mjs', 'update.mjs'];
      if (scripts.length > 64 || required.some((name) => !scripts.includes('cgpt-approval-bridge-' + name))) throw error('update-package-incomplete');
      const artifacts = [
        ...scripts.map((name) => ({ group: 'scripts', name, source: join(c.pluginRoot, 'scripts', name) })),
        ...['monitor', 'monitor-data', 'monitor-events', 'monitor-management', 'run-steps', 'statistics-maintenance', 'observation-statistics']
          .map((name) => ({ group: 'monitorScripts', name: 'cgpt-approval-bridge-' + name + '.mjs', source: join(c.pluginRoot, 'scripts/cgpt-approval-bridge-' + name + '.mjs') })),
        ...brokerFiles.map((name) => ({ group: 'broker', name, source: join(c.pluginRoot, 'broker', name) })),
        ...['index.html', 'app.mjs', 'stats.mjs', 'style.css'].map((name) => ({ group: 'web', name, source: join(c.pluginRoot, 'web-monitor', name) })),
        ...['controller', 'supervisor', 'monitor'].map((name) => ({ group: 'units', name: unit(name), source: join(c.pluginRoot, 'systemd', unit(name)) })),
      ];
      const byPath = new Map(artifacts.map((artifact) => [artifact.source, artifact]));
      if (new Set(artifacts.map(target)).size !== artifacts.length) throw error('update-overlapping-destinations');
      for (let i = 0; i < artifacts.length; i++) {
        const artifact = artifacts[i], content = await regular(artifact.source);
        const path = target(artifact), before = await optional(path);
        if (/\.(py|mjs)$/.test(artifact.name)) {
          if (artifact.group !== 'web' && sourceVersion(content.data) !== version) throw error('update-package-version-invalid');
          if (before && baseVersion(sourceVersion(before.data)) && newer(baseVersion(sourceVersion(before.data)), version)) throw error('update-downgrade-refused');
          for (const match of content.data.toString('utf8').matchAll(/(?:from\s+|import\s*)['"](\.\/[^'"]+)['"]/g)) {
            if (!byPath.has(resolve(dirname(artifact.source), match[1]))) throw error('update-package-import-missing');
          }
          await validate(artifact.source, transaction());
        }
        if (artifact.group === 'units') {
          const component = artifact.name.replace('cgpt-approval-bridge-', '').replace('.service', '');
          const entry = component === 'monitor' ? '%h/.local/share/cab-approval-bridge-monitor/scripts/cgpt-approval-bridge-monitor.mjs' :
            '%h/.local/share/cab-approval-bridge/cgpt-approval-bridge-' + component + '.mjs';
          const source = content.data.toString('utf8');
          if (!source.includes('Description=CAB ' + version + ' ') ||
              !source.split('\n').includes('ExecStart=/usr/bin/env node ' + entry) || /^\[Install\]/m.test(source)) throw error('update-unit-invalid');
        }
        const file = { group: artifact.group, name: artifact.name, afterHash: hash(content.data),
          beforeHash: before ? hash(before.data) : null, mode: before?.mode ?? content.mode };
        if (before) await atomic(join(transaction(), 'backup', String(i)), before.data);
        await atomic(join(transaction(), 'stage', String(i)), content.data);
        receipt.files.push(file);
      }
      for (const component of ['controller', 'supervisor', 'monitor']) receipt.active[component] = (await metadata(component)).ActiveState === 'active';
      receipt.brokerConnected = await brokerState() === 'connected';
      if ((receipt.active.supervisor || receipt.brokerConnected) && !receipt.active.controller) throw error('update-controller-required');
      receipt.previousVersions = {};
      for (const component of ['controller', 'supervisor', 'monitor', 'broker']) {
        const group = component === 'broker' ? 'broker' : component === 'monitor' ? 'monitorScripts' : 'scripts';
        const name = component === 'broker' ? brokerFiles[0] : 'cgpt-approval-bridge-' + component + '.mjs';
        const previous = await optional(join(c.roots[group], name));
        receipt.previousVersions[component] = previous ? sourceVersion(previous.data) : null;
      }
      if (receipt.active.controller) receipt.runIdentity = runIdentity(await registry());
      if (receipt.active.monitor) {
        const status = await request(c.monitorUrl, '/api/snapshot');
        if (status.identity?.workspace !== c.workspace) throw error('update-workspace-divergent');
      }
      await save('PREPARED');
      receipt.brokerReconnectedAt = 0;
      const desired = Object.fromEntries(['controller', 'supervisor', 'monitor', 'broker'].map((name) => [name, version]));
      if (receipt.files.every((file) => file.beforeHash === file.afterHash) && await verified(desired)) {
        await save('COMPLETED'); return { status: 'up-to-date', version, active: receipt.active };
      }
      if (receipt.active.controller) {
        const transactionId = receipt.id;
        receipt.maintenance = { transactionId, generation: null }; await save('FREEZING');
        const maintenance = await request(c.controllerUrl, '/coordination/global/request', {
          transactionId, cause: 'SHARED_MAINTENANCE', scope: 'all', authorization: '/cab update active components',
          evidence: ['cab-update-package-validated-and-backed-up'] });
        if (maintenance.transactionId !== transactionId || !Number.isSafeInteger(maintenance.generation)) throw error('update-maintenance-unconfirmed');
        receipt.maintenance = { transactionId, generation: maintenance.generation };
      }
      await save('WAITING');
    }
    for (let i = 0; i < receipt.files.length; i++) {
      const file = receipt.files[i];
      if (hash((await regular(join(transaction(), 'stage', String(i)))).data) !== file.afterHash) throw error('update-stage-changed');
      if (file.beforeHash && hash((await regular(join(transaction(), 'backup', String(i)))).data) !== file.beforeHash) throw error('update-backup-invalid');
      const installed = await optional(target(file));
      if ((installed ? hash(installed.data) : null) !== file.beforeHash) throw error('update-installed-artifact-changed');
    }
    if (!await drain()) { await save('WAITING'); return { status: 'waiting', transactionId: receipt.id, version: receipt.version }; }
    await save('STOPPING'); await stopAll(); await save('INSTALLING');
    for (let i = 0; i < receipt.files.length; i++) {
      const file = receipt.files[i], data = (await regular(join(transaction(), 'stage', String(i)))).data;
      if (hash(data) !== file.afterHash) throw error('update-stage-changed');
      await atomic(target(file), data, file.mode);
    }
    await service(['daemon-reload']); await save('RESTARTING');
    receipt.brokerReconnectedAt = now(); await startAll(); await save('VERIFYING');
    const desired = Object.fromEntries(['controller', 'supervisor', 'monitor', 'broker'].map((name) => [name, receipt.version]));
    if (!await wait(() => verified(desired), 30000)) throw error('update-active-version-unconfirmed');
    await save('RELEASING'); await release(); await save('COMPLETED');
    return { status: 'completed', version: receipt.version, transactionId: receipt.id, active: receipt.active,
      brokerConnected: receipt.brokerConnected, deployedVersions: desired,
      activeVersions: Object.fromEntries(Object.keys(desired).map((name) => [name,
        (name === 'broker' ? receipt.brokerConnected : receipt.active[name]) ? desired[name] : null])) };
  } catch (cause) {
    if (options.onPhase && cause.code === 'SIMULATED_CRASH') throw cause;
    if (!receiptTrusted) throw cause.code?.startsWith('update-') ? cause : error('update-journal-invalid');
    if (receipt && ['RELEASING', 'ROLLBACK_RELEASING'].includes(receipt.phase)) throw error('update-recovery-required');
    if (receipt && ['STOPPING', 'INSTALLING', 'RESTARTING', 'VERIFYING', 'ROLLING_BACK'].includes(receipt.phase)) {
      try { await rollback(); } catch { await save('ROLLBACK_FAILED'); throw error('update-recovery-required'); }
      throw error('update-failed-rolled-back');
    }
    if (receipt && !receipt.maintenance && !complete.has(receipt.phase)) await save('PREPARATION_FAILED');
    throw cause.code?.startsWith('update-') ? cause : error('update-preparation-failed');
  } finally { await lock.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const keys = { '--plugin-root': 'pluginRoot', '--workspace': 'workspace', '--broker-directory': 'brokerDirectory', '--home': 'home',
      '--controller-url': 'controllerUrl', '--supervisor-url': 'supervisorUrl', '--monitor-url': 'monitorUrl', '--opencode-url': 'opencodeUrl', '--wait-ms': 'waitMs' };
    const input = {}; let rollbackOnly = false;
    for (let i = 2; i < process.argv.length; i++) {
      const argument = process.argv[i];
      if (argument === '--rollback' && !rollbackOnly) { rollbackOnly = true; continue; }
      if (!keys[argument] || Object.hasOwn(input, keys[argument]) || !process.argv[i + 1]) throw error('update-arguments-invalid');
      input[keys[argument]] = argument === '--wait-ms' ? Number(process.argv[++i]) : process.argv[++i];
    }
    input.workspace = await realpath(input.workspace);
    const result = await updateComponents(input, { rollbackOnly,
      onPhase: async (phase, receipt) => { process.stdout.write(JSON.stringify({ phase, transactionId: receipt.id }) + '\n'); } });
    process.stdout.write(JSON.stringify(result) + '\n');
    if (result.status === 'waiting') process.exitCode = 2;
  } catch (cause) {
    process.stderr.write(JSON.stringify({ error: cause.code?.startsWith('update-') ? cause.code : 'update-unavailable' }) + '\n');
    process.exitCode = 1;
  }
}
