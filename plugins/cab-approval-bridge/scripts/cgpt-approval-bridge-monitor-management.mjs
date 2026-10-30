import { constants } from 'node:fs';
import { lstat, mkdir, open, rename, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { join, parse, relative } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createOpenCodeV2ClientFromEnv } from './cgpt-approval-bridge-opencode-client.mjs';

export const VERSION = '2.1.23';
const execute = promisify(execFile);
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = (code, status = 409) => Object.assign(new Error(code), { status });
const terminal = (run) => ['DELIVERED', 'ABANDONED', 'RELEASED'].includes(run.state) ||
  (run.runId === 'legacy' && run.armed === false && run.gate?.status === 'VALIDATED');
const busy = (run) => run.armed === true || run.hasMandate || run.pending > 0 ||
  (run.nativeActivity && run.nativeActivity !== 'idle');
const fresh = (snapshot, name) => snapshot.sources[name]?.stale === false;
export const itemKey = (kind, item) => hash(kind === 'runs' ? [item.runId, item.generation] :
  [item.changeId, item.location, item.progress]);

export function eligibility(snapshot, kind, item) {
  if (!fresh(snapshot, 'controller') || !fresh(snapshot, 'registry') || !fresh(snapshot, 'sessions') ||
      snapshot.runsTruncated || snapshot.changes.truncated) return false;
  if (kind === 'runs') return terminal(item) && !busy(item) &&
    (item.runId !== 'legacy' ? Number.isSafeInteger(item.generation) : item.pending === 0);
  return snapshot.changes.available && item.location !== 'unknown' &&
    (item.location === 'archived' || (item.progress?.available && item.progress.completed === item.progress.total)) &&
    !snapshot.runs.some((run) => run.changeId === item.changeId && (!terminal(run) || busy(run)));
}

export function guardManagementPost(request, url, requireOrigin = true) {
  if (request.headers['content-type']?.split(';')[0].trim() !== 'application/json' ||
      request.headers['x-cab-monitor'] !== '1' ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      (requireOrigin && request.headers.origin !== url.origin) ||
      (request.headers.origin && request.headers.origin !== url.origin)) throw fail('monitor-origin-refused', 403);
}

export async function managementBody(request) {
  request.setTimeout(5000, () => request.destroy());
  const chunks = []; let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 4096) throw fail('monitor-request-too-large', 413);
    chunks.push(chunk);
  }
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw fail('monitor-request-invalid', 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail('monitor-request-invalid', 400);
  return body;
}

async function safeDirectory(directory, create = false) {
  let current = parse(directory).root;
  for (const part of relative(current, directory).split('/').filter(Boolean)) {
    current = join(current, part);
    if (create) {
      try { await mkdir(current, { mode: 0o700 }); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
    }
    const stat = await lstat(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw fail('monitor-catalog-unsafe');
  }
}

export class MonitorCatalog {
  constructor(directory, workspace) {
    this.directory = directory; this.workspace = workspace; this.entries = [];
    this.error = null; this.pending = false;
  }
  async load() {
    try {
      await safeDirectory(this.directory);
      const file = await open(join(this.directory, 'catalog.json'), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      let value;
      try {
        const stat = await file.stat();
        if (!stat.isFile() || stat.nlink !== 1 || stat.size > 2 * 1024 * 1024) throw fail('monitor-catalog-invalid');
        value = JSON.parse(await file.readFile('utf8'));
      } finally { await file.close(); }
      if (value.schema !== 1 || value.workspace !== this.workspace || !Array.isArray(value.entries) || value.entries.length > 2000 ||
          value.entries.some((entry) => !entry || !['runs', 'changes'].includes(entry.kind) ||
            !['archived', 'deleted', 'restored'].includes(entry.state) || !/^[a-f0-9]{64}$/.test(entry.key) ||
            !Number.isFinite(Date.parse(entry.at)) || !entry.item ||
            itemKey(entry.kind, entry.item) !== entry.key)) throw fail('monitor-catalog-invalid');
      this.entries = value.entries;
    } catch (error) {
      if (error.code === 'ENOENT') { this.entries = []; return; }
      this.error = 'monitor-catalog-unavailable';
    }
  }
  project(snapshot) {
    const result = structuredClone(snapshot);
    result.archives = { runs: [], changes: [] };
    result.management = { catalogError: this.error };
    for (const kind of ['runs', 'changes']) {
      let values = kind === 'runs' ? result.runs : result.changes.changes;
      const visible = values.filter((item) => !this.entries.some((entry) => entry.kind === kind &&
        entry.key === itemKey(kind, item) && entry.state !== 'restored'));
      for (const entry of this.entries.filter((entry) => entry.kind === kind && entry.state !== 'deleted')) {
        const item = { ...entry.item, key: entry.key, archivedAt: entry.at };
        if (entry.state === 'archived') result.archives[kind].push(item);
        else if (!values.some((value) => kind === 'runs' ? value.runId === entry.item.runId : itemKey(kind, value) === entry.key) &&
                 !visible.some((value) => kind === 'runs' ? value.runId === entry.item.runId : itemKey(kind, value) === entry.key)) {
          visible.push({ ...item, historical: true });
        }
      }
      values = visible.map((item) => ({ ...item, key: itemKey(kind, item),
        manageable: !this.error && !item.historical && eligibility(snapshot, kind, item) }));
      if (kind === 'runs') result.runs = values; else result.changes.changes = values;
    }
    return result;
  }
  async mutate(body, snapshot) {
    if (this.pending) throw fail('monitor-management-busy');
    this.pending = true;
    let lock, temporary;
    try {
      if (this.error) throw fail(this.error, 503);
      if (Object.keys(body).some((key) => !['kind', 'key', 'action', 'confirm'].includes(key)) ||
          !['runs', 'changes'].includes(body.kind) || !/^[a-f0-9]{64}$/.test(body.key) ||
          !['archive', 'delete', 'restore'].includes(body.action) ||
          (body.action === 'delete' && body.confirm !== true)) throw fail('monitor-action-invalid', 400);
      await safeDirectory(this.directory, true);
      lock = await open(join(this.directory, 'catalog.lock'), 'wx', 0o600);
      await this.load();
      if (this.error) throw fail(this.error, 503);
      const existing = this.entries.find((entry) => entry.kind === body.kind && entry.key === body.key);
      const raw = body.kind === 'runs' ? snapshot.runs : snapshot.changes.changes;
      const item = raw.find((value) => itemKey(body.kind, value) === body.key);
      if (body.action === 'restore') {
        if (body.kind !== 'runs' || existing?.state !== 'archived') throw fail('monitor-item-unavailable');
      } else if (!item || !eligibility(snapshot, body.kind, item) || existing?.state === 'deleted') {
        throw fail('monitor-item-protected');
      }
      const entries = this.entries.filter((entry) => entry !== existing);
      entries.push({ kind: body.kind, key: body.key,
        state: { archive: 'archived', delete: 'deleted', restore: 'restored' }[body.action],
        at: new Date().toISOString(), item: item || existing.item });
      const data = JSON.stringify({ schema: 1, workspace: this.workspace, entries }) + '\n';
      if (entries.length > 2000 || Buffer.byteLength(data) > 2 * 1024 * 1024) throw fail('monitor-catalog-full');
      temporary = join(this.directory, 'catalog-' + randomUUID() + '.tmp');
      const file = await open(temporary, 'wx', 0o600);
      try { await file.writeFile(data); await file.sync(); } finally { await file.close(); }
      await rename(temporary, join(this.directory, 'catalog.json')); temporary = null;
      const directory = await open(this.directory, 'r');
      try { await directory.sync(); } finally { await directory.close(); }
      this.entries = entries;
      return { status: 'completed', action: body.action };
    } catch (error) {
      if (error.status) throw error;
      throw fail(error.code === 'EEXIST' ? 'monitor-management-busy' : 'monitor-catalog-unavailable', 503);
    } finally {
      try {
        if (temporary) await unlink(temporary);
        if (lock) { await lock.close(); await unlink(join(this.directory, 'catalog.lock')); }
      } finally { this.pending = false; }
    }
  }
}

const units = { controller: 'cgpt-approval-bridge-controller.service',
  supervisor: 'cgpt-approval-bridge-supervisor.service', monitor: 'cgpt-approval-bridge-monitor.service' };
export async function systemd(args) {
  try { return (await execute('/usr/bin/systemctl', ['--user', ...args], { timeout: 10000, maxBuffer: 8192 })).stdout; }
  catch { throw fail('monitor-service-command-failed', 503); }
}

export class MonitorServices {
  constructor(configuration, { fetcher = fetch, serviceCommand = systemd, pid = process.pid, openCodeClient } = {}) {
    this.configuration = configuration; this.fetcher = fetcher; this.command = serviceCommand;
    this.openCode = openCodeClient || createOpenCodeV2ClientFromEnv({ directory: configuration.workspace,
      baseUrl: configuration.opencodeUrl, fetchImpl: fetcher });
    this.pid = pid; this.pending = false;
  }
  async service(component) {
    const output = await this.command(['show', units[component], '--property=LoadState,ActiveState,MainPID']);
    return Object.fromEntries(output.trim().split('\n').map((line) => line.split('=')));
  }
  async json(base, path, body) {
    const response = await this.fetcher(base + path, { method: body === undefined ? 'GET' : 'POST',
      signal: AbortSignal.timeout(10000), redirect: 'error', headers: { 'content-type': 'application/json', 'x-cab-monitor': '1' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const chunks = []; let bytes = 0;
    if (!response.body) throw fail('monitor-component-unavailable', 503);
    for await (const chunk of response.body) {
      bytes += chunk.length;
      if (bytes > 2 * 1024 * 1024) throw fail('monitor-component-unavailable', 503);
      chunks.push(chunk);
    }
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!response.ok) throw fail('monitor-component-refused', response.status === 409 ? 409 : 503);
    return value;
  }
  async act(body) {
    if (this.pending) throw fail('monitor-management-busy');
    if (Object.keys(body).some((key) => !['component', 'action'].includes(key)) ||
        !['controller', 'supervisor', 'broker', 'monitor'].includes(body.component) ||
        !['start', 'stop', 'restart'].includes(body.action) ||
        (body.component === 'monitor' && body.action !== 'restart')) throw fail('monitor-action-invalid', 400);
    this.pending = true;
    let lease;
    let controllerReplaced = false;
    let outcome;
    const c = this.configuration;
    try {
      if (body.component === 'monitor') {
        const service = await this.service('monitor');
        if (service.LoadState !== 'loaded' || service.ActiveState !== 'active' || Number(service.MainPID) !== this.pid) {
          throw fail('monitor-service-unmanaged');
        }
        // --no-block lets systemd finish the restart after this HTTP response is sent.
        return { status: 'accepted', action: 'restart', component: 'monitor', deferred: true };
      }
      let service;
      if (body.component !== 'broker') {
        service = await this.service(body.component);
        if (service.LoadState !== 'loaded' || !['active', 'inactive', 'failed'].includes(service.ActiveState)) {
          throw fail('monitor-service-unmanaged');
        }
        if (body.action === 'start' && ['inactive', 'failed'].includes(service.ActiveState)) {
          await this.command(['start', units[body.component]]);
          await this.verifyService(body.component);
          return { status: 'completed', component: body.component, action: body.action };
        }
      }
      lease = await this.json(c.controllerUrl, '/monitor/lifecycle/prepare', { workspace: c.workspace });
      if (lease.workspace !== c.workspace || !lease.token) throw fail('monitor-workspace-divergent');
      if (service?.ActiveState === 'active') {
        const identity = body.component === 'controller' ? lease : await this.json(c.supervisorUrl, '/status');
        if (identity.workspace !== c.workspace || Number(identity.pid) !== Number(service.MainPID)) throw fail('monitor-service-unmanaged');
      }
      if (body.component === 'broker') {
        if (body.action !== 'start') await this.openCode.disconnectMcp('cgpt-validation');
        if (body.action !== 'stop') await this.openCode.connectMcp('cgpt-validation');
        const status = await this.openCode.mcp();
        if (status['cgpt-validation']?.status !== (body.action === 'stop' ? 'disabled' : 'connected')) {
          throw fail('monitor-broker-state-unconfirmed');
        }
      } else {
        await this.command([body.action, units[body.component]]);
        controllerReplaced = body.component === 'controller' && body.action !== 'start';
        await this.verifyService(body.component, body.action === 'stop');
      }
      outcome = { status: 'completed', component: body.component, action: body.action };
      return outcome;
    } finally {
      if (lease?.token && !controllerReplaced) {
        try { await this.json(c.controllerUrl, '/monitor/lifecycle/release', { token: lease.token }); }
        catch {
          if (outcome) outcome.warning = 'monitor-lease-release-unconfirmed';
          // A failed action still reports its original failure; this lease expires after 30 s.
        }
      }
      this.pending = false;
    }
  }
  async verifyService(component, stopped = false) {
    const service = await this.service(component);
    if (service.ActiveState !== (stopped ? 'inactive' : 'active')) throw fail('monitor-service-state-unconfirmed', 503);
    if (!stopped) {
      const identity = await this.json(component === 'controller' ? this.configuration.controllerUrl : this.configuration.supervisorUrl, '/status');
      if (identity.workspace !== this.configuration.workspace || Number(identity.pid) !== Number(service.MainPID)) {
        throw fail('monitor-service-unmanaged');
      }
    }
  }
  async restartWeb() { await this.command(['--no-block', 'restart', units.monitor]); }
}
