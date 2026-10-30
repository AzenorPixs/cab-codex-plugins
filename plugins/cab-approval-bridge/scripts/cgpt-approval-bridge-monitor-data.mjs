import { constants } from 'node:fs';
import { lstat, open, readdir, realpath } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { publicEvent, VERSION as EVENT_VERSION } from './cgpt-approval-bridge-monitor-events.mjs';
import { lifecycleView, RUN_STEPS, VERSION as STEP_VERSION } from './cgpt-approval-bridge-run-steps.mjs';
import { createOpenCodeV2ClientFromEnv } from './cgpt-approval-bridge-opencode-client.mjs';

export const VERSION = '2.1.21';
if ([EVENT_VERSION, STEP_VERSION].some((value) => value !== VERSION)) throw new Error('CAB monitor component version mismatch');
const record = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const idPattern = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/;
const text = (value, limit = 240) => typeof value === 'string' ? value.slice(0, limit) : null;
const id = (value) => typeof value === 'string' && idPattern.test(value) ? value : null;
const stamp = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
const code = (value) => typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,100}$/.test(value) ? value : null;
const componentVersion = (value) => typeof value === 'string' && value.length <= 100 &&
  /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)*$/.test(value) ? value : null;

export function monitorConfiguration(environment = process.env) {
  const get = (key) => environment['OC_Codex_' + key] ?? environment['OC_CGPT_' + key];
  const number = (key, fallback, min, max) => {
    const value = get(key) ?? String(fallback);
    if (!/^[0-9]+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) {
      throw new Error('OC_Codex_' + key + ' invalide.');
    }
    return Number(value);
  };
  const endpoint = (key, fallback, status = false) => {
    let value;
    try { value = new URL(get(key) ?? fallback); } catch { throw new Error('OC_Codex_' + key + ' invalide.'); }
    if (value.protocol !== 'http:' || !['127.0.0.1', '[::1]', 'localhost'].includes(value.hostname) ||
        value.username || value.password || value.search || value.hash ||
        !(status ? ['/', '/status', '/status/'] : ['/']).includes(value.pathname)) {
      throw new Error('OC_Codex_' + key + ' doit désigner une base HTTP loopback.');
    }
    value.pathname = '/';
    return value.href.replace(/\/$/, '');
  };
  const workspace = get('WORKSPACE');
  if (!workspace || !isAbsolute(workspace)) throw new Error('OC_Codex_WORKSPACE doit être absolu.');
  const host = get('MONITOR_HOST') ?? '127.0.0.1';
  if (!['127.0.0.1', '::1'].includes(host)) throw new Error('OC_Codex_MONITOR_HOST doit être loopback.');
  const stateRoot = get('MONITOR_STATE_DIR') ?? join(homedir(), '.local', 'state', 'cab-approval-bridge-monitor');
  if (!isAbsolute(stateRoot)) throw new Error('OC_Codex_MONITOR_STATE_DIR doit être absolu.');
  return { workspace, host, port: number('MONITOR_PORT', 8790, 1024, 65535),
    stateDirectory: join(stateRoot, createHash('sha256').update(workspace).digest('hex')),
    pollMs: number('MONITOR_POLL_INTERVAL_MS', 1000, 250, 60000),
    staleMs: number('MONITOR_STALE_MS', 10000, 1000, 300000),
    timeoutMs: number('MONITOR_TIMEOUT_MS', 2000, 100, 10000),
    controllerUrl: endpoint('CONTROLLER_URL', 'http://127.0.0.1:8788', true),
    supervisorUrl: endpoint('SUPERVISOR_URL', 'http://127.0.0.1:8789', true),
    opencodeUrl: endpoint('OPENCODE_URL', 'http://127.0.0.1:4096') };
}

export async function fetchJson(url, timeoutMs, fetcher = fetch) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(timeoutMs), redirect: 'error',
    headers: { accept: 'application/json' } });
  if (!response.ok || !response.body) throw new Error('source-unavailable');
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > 2 * 1024 * 1024) throw new Error('source-too-large');
    chunks.push(chunk);
  }
  const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('source-invalid');
  return result;
}

export function parseTasks(markdown) {
  let fence = null;
  const tasks = [];
  for (const line of markdown.split(/\r?\n/)) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (marker) {
      if (!fence) fence = { character: marker[1][0], length: marker[1].length };
      else if (marker[1][0] === fence.character && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
      continue;
    }
    if (fence || /^ {4}|^\t/.test(line)) continue;
    const match = line.match(/^ {0,3}(?:[-+*]|\d+[.)])\s+\[([ xX])\]\s+(.+)$/);
    if (match) tasks.push({ done: match[1].toLowerCase() === 'x', label: match[2].slice(0, 240) });
    if (tasks.length >= 2000) return { available: false, reason: 'task-limit', tasks: [], completed: null, total: null };
  }
  return { available: tasks.length > 0, reason: tasks.length ? null : 'no-tasks', tasks,
    completed: tasks.length ? tasks.filter((task) => task.done).length : null, total: tasks.length || null };
}

export function parseChangeTitle(markdown) {
  let fence = null;
  for (const line of markdown.split(/\r?\n/)) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (marker) {
      if (!fence) fence = { character: marker[1][0], length: marker[1].length };
      else if (marker[1][0] === fence.character && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
      continue;
    }
    if (fence) continue;
    const heading = line.match(/^ {0,3}#\s+(.+)$/);
    if (!heading) continue;
    const title = heading[1].trim().replace(/\s+#+\s*$/, '');
    const lotCode = title.match(/^([A-Z]{1,10}[0-9]{2,4}|L[12])(?:\s+[—–:-]\s+.+)?$/)?.[1] || null;
    return { title: title.slice(0, 160), lotCode };
  }
  return { title: null, lotCode: null };
}

async function regularDirectory(path) {
  const value = await lstat(path);
  if (!value.isDirectory() || value.isSymbolicLink()) throw new Error('unsafe-directory');
}

async function document(directory, name) {
  const path = join(directory, name);
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > 256 * 1024) throw new Error('document-unavailable');
    return await file.readFile({ encoding: 'utf8' });
  } finally { await file.close(); }
}

export async function readChanges(workspace, referenced = []) {
  const unavailable = (changeId, reason) => ({ changeId, title: changeId, lotCode: null, location: 'unknown',
    progress: { available: false, reason, completed: null, total: null, tasks: [] } });
  try {
    const root = await realpath(workspace);
    const specs = join(root, 'openspec');
    const changes = join(specs, 'changes');
    await regularDirectory(specs);
    await regularDirectory(changes);
    const entries = (await readdir(changes, { withFileTypes: true })).slice(0, 1000);
    const selected = entries.filter((entry) => entry.name !== 'archive' && id(entry.name) && entry.isDirectory())
      .slice(0, 200).map((entry) => ({ changeId: entry.name, directory: join(changes, entry.name), location: 'active' }));
    const missing = [...new Set(referenced.filter(id))].filter((value) => !selected.some((entry) => entry.changeId === value));
    if (missing.length) {
      try {
        const archive = join(changes, 'archive');
        await regularDirectory(archive);
        const names = (await readdir(archive, { withFileTypes: true })).slice(0, 5000);
        for (const changeId of missing) {
          const matches = names.filter((entry) => entry.isDirectory() &&
            /^\d{4}-\d{2}-\d{2}-/.test(entry.name) && entry.name.slice(11) === changeId);
          if (matches.length === 1) selected.push({ changeId, directory: join(archive, matches[0].name), location: 'archived' });
        }
      } catch { /* An absent or unsafe archive does not hide active changes. */ }
    }
    const result = [];
    for (const entry of selected) {
      try {
        await regularDirectory(entry.directory);
        let title = entry.changeId;
        let lotCode = null;
        try {
          const parsed = parseChangeTitle(await document(entry.directory, 'proposal.md'));
          title = parsed.title || title; lotCode = parsed.lotCode;
        }
        catch { /* The task document remains useful without a proposal title. */ }
        let progress;
        try { progress = parseTasks(await document(entry.directory, 'tasks.md')); }
        catch { progress = unavailable(entry.changeId, 'tasks-unavailable').progress; }
        result.push({ changeId: entry.changeId, title, lotCode, location: entry.location, progress });
      } catch { result.push(unavailable(entry.changeId, 'unsafe-change')); }
    }
    for (const value of missing) if (!result.some((entry) => entry.changeId === value)) result.push(unavailable(value, 'change-unavailable'));
    return { available: true, truncated: entries.length >= 1000 || selected.length >= 200, changes: result };
  } catch { return { available: false, reason: 'changes-unavailable', changes: referenced.filter(id).map((value) => unavailable(value, 'changes-unavailable')) }; }
}

export function normalizeRuns(controller = {}, registry = {}, supervisor = {}, sessions = {}) {
  controller = record(controller); registry = record(registry); supervisor = record(supervisor); sessions = record(sessions);
  const concurrent = controller.mode === 'concurrent';
  const runValues = Array.isArray(registry.runs) ? registry.runs.filter((run) => run && typeof run === 'object').slice(0, 200) : [];
  const identities = new Set([...runValues.map((run) => id(run.runId)), ...Object.keys(record(controller.runs)).slice(0, 200).filter(id)].filter(Boolean));
  if (!identities.size && controller.job) identities.add('legacy');
  return [...identities].map((runId) => {
    const reservation = runValues.find((run) => run.runId === runId) || {};
    const status = record(concurrent ? controller.runs?.[runId] : runId === 'legacy' ? controller : {});
    const job = record(status.job);
    const observed = record(supervisor.mode === 'concurrent' ? supervisor.runs?.[runId] : runId === 'legacy' ? supervisor : {});
    const gate = record(status.terminalGate || job.terminalGate);
    const coordination = record(status.coordination);
    const lifecycle = lifecycleView(job.lifecycle);
    return { runId, changeId: id(job.changeId) || id(reservation.changeId), sessionId: id(job.sessionId) || id(reservation.sessionId),
      generation: Number.isSafeInteger(reservation.version) ? reservation.version : id(job.jobId),
      state: code(reservation.state), phase: code(coordination.phase || reservation.phase),
      step: lifecycle.current, stepHistory: lifecycle.history, stepSequence: lifecycle.sequence, stepHistoryTruncated: lifecycle.truncated,
      readiness: code(status.brokerReadiness?.status), cause: code(coordination.reason || status.brokerReadiness?.root_cause),
      lastProvenMilestone: text(job.lastProvenMilestone), currentMandate: code(job.currentCabMandate), hasMandate: Boolean(job.currentCabMandate),
      armed: typeof job.armed === 'boolean' ? job.armed : null, gate: { status: code(gate.status), declaredState: text(gate.declaredState, 40) },
      updatedAt: stamp(job.updatedAt), nativeActivity: code(sessions[job.sessionId || reservation.sessionId]?.type),
      pending: Number.isSafeInteger(status.undecidedValidationCount) ? status.undecidedValidationCount : null,
      blockers: [...new Set((Array.isArray(coordination.blockers) ? coordination.blockers : []).filter((blocker) => blocker && typeof blocker === 'object').flatMap((blocker) =>
        [id(blocker.runId), id(blocker.ownerRunId), id(blocker.blockingRunId)]).filter(Boolean))].slice(0, 30),
      supervisor: { cause: code(observed.currentReason || observed.reason),
        resumeAttemptCount: Number.isSafeInteger(observed.resumeAttemptCount) ? observed.resumeAttemptCount : null } };
  });
}

export function operationalState(run, { controllerFresh = true, registryFresh = true } = {}) {
  if (!controllerFresh || (run.runId !== 'legacy' && run.state && !registryFresh)) return 'UNKNOWN';
  if (run.state === 'DELIVERED') return 'DONE';
  if (run.state === 'ABANDONED') return 'STOPPED';
  if (run.gate.status === 'VALIDATED') return run.gate.declaredState === 'TERMINÉ' ? 'DONE' : 'BLOCKED';
  if (run.cause === 'run-stop') return 'STOPPED';
  if (['run-pause', 'global-coordination-suspended'].includes(run.cause)) return 'PAUSED';
  if (run.readiness === 'HUMAN_REQUIRED') return 'BLOCKED';
  if (['resource-conflict','test-resource-conflict'].includes(run.cause)) return 'WAITING';
  if (run.cause || ['BLOCKED', 'HUMAN_REQUIRED'].includes(run.readiness)) return 'BLOCKED';
  if (run.pending > 0) return 'WAITING';
  if (run.readiness === 'DEGRADED') return 'DEGRADED';
  if (run.state === 'RELEASED') return 'RELEASED';
  if (run.armed === true) return 'RUNNING';
  if (run.armed === false) return 'IDLE';
  return 'UNKNOWN';
}

export class MonitorState {
  constructor(configuration, { now = () => Date.now(), fetcher = fetch } = {}) {
    this.configuration = configuration; this.now = now; this.fetcher = fetcher;
    this.openCode = createOpenCodeV2ClientFromEnv({ directory: configuration.workspace,
      baseUrl: configuration.opencodeUrl, fetchImpl: fetcher });
    this.startedAt = new Date(now()).toISOString(); this.sources = {}; this.events = [];
    this.changes = { available: false, changes: [] }; this.running = false; this.listeners = new Set();
    this.coverage = { instanceId: null, truncated: false, restarted: false, stream: 'connecting' };
    this.instances = [];
    this.lastSequence = 0;
  }
  ingest(journal) {
    if (!journal || !id(journal.instanceId) || !Array.isArray(journal.events)) return;
    if (this.coverage.instanceId !== journal.instanceId) {
      if (this.instances.includes(journal.instanceId)) return;
      if (this.coverage.instanceId) this.coverage.restarted = true;
      this.instances = [...this.instances, journal.instanceId].slice(-10);
      this.coverage.instanceId = journal.instanceId; this.lastSequence = 0;
    }
    this.coverage.truncated ||= journal.truncated === true;
    for (const event of journal.events.slice(-500)) {
      if (!event || typeof event !== 'object') continue;
      if (!Number.isSafeInteger(event.sequence) || event.sequence <= this.lastSequence || !stamp(event.at)) continue;
      const safe = publicEvent(event.type, event);
      if (!safe) continue;
      this.lastSequence = event.sequence;
      this.events.push({ ...safe, at: event.at, sequence: event.sequence, instanceId: journal.instanceId });
    }
    if (this.events.length > 200) { this.events = this.events.slice(-200); this.coverage.truncated = true; }
  }
  async source(name, urlOrLoader) {
    const attemptedAt = new Date(this.now()).toISOString();
    const previous = this.sources[name] || {};
    try {
      const value = typeof urlOrLoader === 'function' ? await urlOrLoader() :
        await fetchJson(urlOrLoader, this.configuration.timeoutMs, this.fetcher);
      if ((name === 'registry' && !Array.isArray(value.runs)) ||
          (name === 'opencode' && (typeof value.version !== 'string' || !/^2\./.test(value.version) || !Number.isSafeInteger(value.pid))) ||
          (name === 'observations' && (!id(value.instanceId) || !Array.isArray(value.events)))) throw new Error('source-invalid');
      this.sources[name] = { available: true, attemptedAt, lastSuccessAt: new Date(this.now()).toISOString(), value };
    } catch (cause) {
      this.sources[name] = { ...previous, available: false, attemptedAt, lastSuccessAt: previous.lastSuccessAt || null,
        error: ['opencode-auth-required', 'opencode-v2-required', 'opencode-credential-unavailable']
          .includes(cause.code) ? cause.code : 'source-unavailable' };
    }
  }
  async collect() {
    if (this.collecting) return this.collecting;
    this.collecting = this.collectOnce();
    try { await this.collecting; } finally { this.collecting = null; }
  }
  async collectOnce() {
    if (this.running) return;
    this.running = true;
    const c = this.configuration;
    try {
      await Promise.all([this.source('controller', c.controllerUrl + '/status'),
        this.source('registry', c.controllerUrl + '/runs'), this.source('supervisor', c.supervisorUrl + '/status'),
        this.source('opencode', () => this.openCode.info()),
        this.source('mcp', () => this.openCode.mcp()),
        this.source('sessions', () => this.openCode.sessionStatus(c.workspace)),
        this.source('observations', c.controllerUrl + '/monitor/events')]);
      this.ingest(this.sources.observations?.value);
      const runs = this.runs();
      this.changes = await readChanges(c.workspace, runs.map((run) => run.changeId));
      this.publish();
    } finally { this.running = false; }
  }
  runs() { return normalizeRuns(this.sources.controller?.value, this.sources.registry?.value,
    this.sources.supervisor?.value, this.sources.sessions?.value); }
  snapshot() {
    const now = this.now();
    const sources = Object.fromEntries(Object.entries(this.sources).map(([name, source]) => [name, {
      available: source.available, attemptedAt: source.attemptedAt, lastSuccessAt: source.lastSuccessAt,
      ageMs: source.lastSuccessAt ? Math.max(0, now - Date.parse(source.lastSuccessAt)) : null,
      stale: !source.available || !source.lastSuccessAt || now - Date.parse(source.lastSuccessAt) > this.configuration.staleMs,
      error: source.error || null }]));
    const controller = this.sources.controller?.value || {};
    const limit = controller.configuration?.maxCommandLength;
    return { version: VERSION, identity: { workspace: this.configuration.workspace },
      startedAt: this.startedAt, generatedAt: new Date(now).toISOString(), sources,
      stepCatalog: RUN_STEPS,
      componentVersions: { controller: componentVersion(controller.version),
        supervisor: componentVersion(this.sources.supervisor?.value?.version),
        broker: componentVersion(controller.brokerReadiness?.server_version),
        opencode: componentVersion(this.sources.opencode?.value?.version), monitor: VERSION },
      nativeHealth: this.sources.opencode?.available === true && /^2\./.test(this.sources.opencode?.value?.version || '') ? true : null,
      brokerConnection: code(this.sources.mcp?.value?.['cgpt-validation']?.status),
      runsTruncated: !Array.isArray(this.sources.registry?.value?.runs) || this.sources.registry.value.runs.length > 200 ||
        this.sources.registry.value.truncated === true || Object.keys(record(controller.runs)).length > 200,
      configuration: { pollMs: this.configuration.pollMs, staleMs: this.configuration.staleMs,
        maxCommandLength: Number.isSafeInteger(limit) && limit > 0 ? limit : null,
        commandLengthUnit: 'UTF-16', defaultMaxCommandLength: 16384 },
      broker: { status: code(controller.brokerReadiness?.status), observedAt: stamp(controller.brokerReadinessReceivedAt),
        stale: sources.controller?.stale !== false || !stamp(controller.brokerReadinessReceivedAt) ||
          now - Date.parse(controller.brokerReadinessReceivedAt) > this.configuration.staleMs },
      runs: this.runs().map((run) => ({ ...run, operationalState: operationalState(run, {
        controllerFresh: sources.controller?.stale === false, registryFresh: sources.registry?.stale === false }) })),
      changes: this.changes, coverage: { ...this.coverage }, events: [...this.events] };
  }
  publish() { const snapshot = this.snapshot(); for (const listener of this.listeners) listener(snapshot); }
}
