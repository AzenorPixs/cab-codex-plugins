import { normalizeOpenCodeEvent } from './cgpt-approval-bridge-opencode-client.mjs';
import { constants, closeSync, existsSync, fstatSync, openSync, readFileSync, realpathSync } from 'node:fs';
import { mkdir, open, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { ObservationStatistics, VERSION as OBSERVATION_VERSION } from './cgpt-approval-bridge-observation-statistics.mjs';

export const VERSION = "2.1.33";
if (OBSERVATION_VERSION !== VERSION) throw new Error('CAB statistics component version mismatch');
const categories = ['reservation', 'changes', 'native', 'nativeChanges'];
const bucket = () => ({ monoMs: 0, multiMs: 0, zeroMs: 0, unknownMs: 0, exactlyTwoMs: 0, threeOrMoreMs: 0 });
const preflight = (change) => /^cismp\d*-preflight(?:-|$)/.test(change);
const business = (change) => !preflight(change) && !/^(rsmp-|inventory-)/.test(change);
const finite = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const knownId = (value) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(value);
const metric = () => ({ count: 0, sumMs: 0, samplesMs: [] });
const globalCauses = ['GLOBAL_RECONCILIATION', 'SHARED_MAINTENANCE', 'GLOBAL_PAUSE', 'GLOBAL_STOP'];
const coordinationMetric = (at) => ({ availableFrom: at, resourceWaitMs: 0, sharedHeldMs: 0,
  exclusiveActiveMs: 0, issuedEffectMs: 0, promotionWaitMs: 0, reconciliationMs: 0, reconciliationCount: 0,
  globalMs: Object.fromEntries(globalCauses.map((cause) => [cause, 0])) });
function validCoordination(value) {
  return onlyKeys(value, Object.keys(coordinationMetric(0))) &&
    Object.keys(coordinationMetric(0)).filter((key) => key !== 'globalMs').every((key) => finite(value[key])) &&
    onlyKeys(value.globalMs, globalCauses) && globalCauses.every((key) => finite(value.globalMs[key]));
}
function safeParent(path) {
  let existing = resolve(path);
  while (!existsSync(existing) && dirname(existing) !== existing) existing = dirname(existing);
  if (realpathSync(existing) !== existing) throw new Error('invalid statistics parent');
}
const onlyKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).every((key) => keys.includes(key));
function sample(target, value) {
  if (!finite(value)) return;
  target.count++; target.sumMs += value; target.samplesMs.push(value);
  if (target.samplesMs.length > 2048) target.samplesMs.shift();
}
function quantiles(target) {
  const sorted = [...target.samplesMs].sort((a, b) => a - b);
  return { count: target.count, meanMs: target.count ? target.sumMs / target.count : null,
    medianMs: sorted.length ? sorted[Math.ceil(sorted.length * .5) - 1] : null,
    p95Ms: sorted.length ? sorted[Math.ceil(sorted.length * .95) - 1] : null,
    sampleCount: sorted.length, sampleScope: 'dernières 2048 observations au maximum' };
}
function validSnapshot(value) {
  if (!onlyKeys(value, ['schemaVersion', 'firstAt', 'lastAt', 'restartUnknownMs', 'categories', 'contexts', 'admissions']) ||
      ![1, 2].includes(value.schemaVersion) || !finite(value.firstAt) || !finite(value.lastAt) ||
      !finite(value.restartUnknownMs) || !value.contexts || Array.isArray(value.contexts) || !value.categories) return false;
  if (!onlyKeys(value.categories, categories) || !categories.every((key) =>
      onlyKeys(value.categories[key], Object.keys(bucket())) && Object.keys(bucket()).every((k) => finite(value.categories[key][k])))) return false;
  if (value.admissions !== undefined && (!value.admissions || typeof value.admissions !== 'object' || Array.isArray(value.admissions) ||
      !Object.values(value.admissions).every((a) => onlyKeys(a, ['runId', 'changeId', 'sessionId', 'firstAt', 'lastAt', 'attempts', 'causes']) &&
        knownId(a.runId) && knownId(a.changeId) && knownId(a.sessionId) && finite(a.firstAt) && finite(a.lastAt) &&
        Number.isSafeInteger(a.attempts) && a.attempts > 0 && a.causes &&
        Object.entries(a.causes).every(([code, count]) => /^[a-z][a-z0-9-]{0,79}$/.test(code) && finite(count))))) return false;
  return Object.values(value.contexts).every((c) => onlyKeys(c, ['runId', 'contextId', 'changeId', 'firstAt', 'lastAt',
    'state', 'phase', 'sessionIds', 'reservedMs', 'busyMs', 'idleMs', 'nativeUnknownMs', 'integrationMs', 'queueMs',
    'staleMs', 'requests', 'tools', 'messages', 'httpFailures', 'latencies', 'coordination']) &&
    (c.coordination === undefined || validCoordination(c.coordination)) &&
    knownId(c.runId) && Number.isSafeInteger(c.contextId) &&
    c.contextId > 0 && knownId(c.changeId) && c.requests && c.tools && c.messages && c.latencies &&
    finite(c.firstAt) && finite(c.lastAt) && ['RESERVED', 'DELIVERED', 'ABANDONED'].includes(c.state) &&
    ['WORK', 'REPORT'].includes(c.phase) && Array.isArray(c.sessionIds) && c.sessionIds.every(knownId) &&
    Object.entries(c.requests).every(([id, r]) => knownId(id) &&
      onlyKeys(r, ['receivedAt', 'decision', 'decisionAt', 'onceAt', 'technicalError']) &&
      ['receivedAt', 'decisionAt', 'onceAt'].every((k) => r[k] === undefined || finite(r[k])) &&
      (r.decision === undefined || ['approved', 'rejected', 'needs_clarification'].includes(r.decision)) &&
      (r.technicalError === undefined || r.technicalError === true)) &&
    Object.entries(c.tools).every(([id, t]) => knownId(id) && onlyKeys(t, ['name', 'status', 'durationMs']) &&
      ['bash', 'edit', 'write', 'read', 'apply_patch', 'glob', 'grep', 'webfetch', 'websearch', 'cab-mcp', 'other'].includes(t.name) &&
      ['pending', 'running', 'completed', 'error'].includes(t.status) && (t.durationMs === undefined || finite(t.durationMs))) &&
    Object.entries(c.messages).every(([id, role]) => knownId(id) && ['user', 'assistant'].includes(role)) &&
    c.httpFailures && Object.entries(c.httpFailures).every(([code, count]) => /^[a-z][a-z0-9-]{0,79}$/.test(code) && finite(count)) &&
    onlyKeys(c.latencies, ['requestToDecision', 'decisionToOnce', 'nativeTool']) &&
    ['requestToDecision', 'decisionToOnce', 'nativeTool'].every((key) => c.latencies[key]) &&
    Object.values(c.latencies).every((m) => Number.isSafeInteger(m.count) && m.count >= 0 && finite(m.sumMs) &&
      onlyKeys(m, ['count', 'sumMs', 'samplesMs']) && Array.isArray(m.samplesMs) &&
      m.samplesMs.length <= 2048 && m.samplesMs.every(finite)) &&
    ['reservedMs', 'busyMs', 'idleMs', 'nativeUnknownMs', 'integrationMs', 'queueMs', 'staleMs'].every((k) => finite(c[k])));
}

// Cet observateur n'admet aucune opération et ne lit ni historique ni contenu brut.
export class SessionStatistics {
  constructor(stateDirectory, { now = Date.now, persist = true, intervalMs = 5000, project = null } = {}) {
    this.now = now; this.persistEnabled = persist;
    this.path = join(stateDirectory, 'controller-statistics.json');
    this.runs = []; this.queue = []; this.integrationOwner = null; this.referenceVersion = 0;
    this.resourceProfile = false; this.accessStates = []; this.globalState = null;
    this.registryKnown = false;
    this.nativeStates = new Map(); this.connected = false; this.dirty = false; this.saving = null;
    this.error = null; this.writeCount = 0; this.droppedEvents = 0;
    const at = now();
    this.data = { schemaVersion: 2, firstAt: at, lastAt: at, restartUnknownMs: 0,
      categories: Object.fromEntries(categories.map((key) => [key, bucket()])), contexts: {}, admissions: {} };
    if (persist) {
      let fd;
      try {
        safeParent(stateDirectory);
        fd = openSync(this.path, constants.O_RDONLY | constants.O_NOFOLLOW);
        const stat = fstatSync(fd);
        if (!stat.isFile() || stat.nlink !== 1 || stat.size > 64 * 1024 * 1024) throw new Error('invalid snapshot');
        const restored = JSON.parse(readFileSync(fd, 'utf8'));
        if (!validSnapshot(restored)) throw new Error('invalid snapshot');
        this.data = restored;
        this.data.schemaVersion = 2;
        for (const context of Object.values(this.data.contexts)) context.coordination ||= coordinationMetric(at);
        this.data.admissions ||= {};
        const gap = Math.max(0, at - restored.lastAt);
        this.data.restartUnknownMs += gap;
        for (const key of categories) this.data.categories[key].unknownMs += gap;
        this.data.lastAt = at;
      } catch (cause) {
        if (cause.code !== 'ENOENT') this.error = 'statistics-restoration-invalid';
      } finally { if (fd !== undefined) closeSync(fd); }
    }
    this.dirty = true;
    this.observations = new ObservationStatistics(stateDirectory, { now, persist, project });
    if (intervalMs) {
      this.timer = setInterval(() => { this.advance(); void this.flush(); }, intervalMs);
      this.timer.unref();
    }
  }
  key(run) { return `${run.runId}:${run.contextId}`; }
  context(run) {
    const key = this.key(run);
    if (!this.data.contexts[key]) this.data.contexts[key] = {
      runId: run.runId, contextId: run.contextId, changeId: run.changeId,
      firstAt: this.now(), lastAt: this.now(), state: run.state, phase: run.phase || 'WORK', sessionIds: [],
      reservedMs: 0, busyMs: 0, idleMs: 0, nativeUnknownMs: 0, integrationMs: 0, queueMs: 0, staleMs: 0,
      requests: {}, tools: {}, messages: {}, httpFailures: {},
      coordination: coordinationMetric(this.now()),
      latencies: { requestToDecision: metric(), decisionToOnce: metric(), nativeTool: metric() },
    };
    const context = this.data.contexts[key];
    if (knownId(run.sessionId) && !context.sessionIds.includes(run.sessionId)) context.sessionIds.push(run.sessionId);
    return context;
  }
  advance(at = this.now()) {
    const elapsed = Math.max(0, at - this.data.lastAt);
    const live = this.runs.filter((r) => r.state === 'RESERVED');
    const registryKnown = this.registryKnown && elapsed <= 15000;
    const from = Math.max(this.data.lastAt, this.observations?.data.native.firstAt || this.data.lastAt);
    if (this.observations && at > from) {
      this.observations.recordInterval({ from, to: at, registryKnown, nativeAvailable: this.connected,
        scopeRunIds: this.runs.map((r) => r.runId), integrationOwner: this.integrationOwner,
        globalCause: this.resourceProfile ? this.globalState?.state !== 'RELEASED' ? this.globalState?.cause || null : null : undefined,
        contexts: live.map((run) => {
          const accesses = this.accessStates.filter((a) => a.runId === run.runId && a.contextId === run.contextId);
          return { runId: run.runId, contextId: run.contextId, changeId: run.changeId, sessionId: run.sessionId,
            nativeType: this.nativeStates.get(run.sessionId) || null,
            queue: this.queue.some((q) => q.runId === run.runId),
            stale: !this.resourceProfile && run.phase !== 'REPORT' && run.referenceVersion !== this.referenceVersion,
            resource: this.resourceProfile ? { waiting: accesses.some((a) => a.state === 'WAITING'),
              held: accesses.some((a) => ['HELD', 'EXECUTING', 'UNKNOWN'].includes(a.state) && a.protection === 'SHARED'),
              exclusive: accesses.some((a) => ['HELD', 'EXECUTING', 'UNKNOWN'].includes(a.state) && a.protection === 'EXCLUSIVE'),
              issued: accesses.some((a) => ['EXECUTING', 'UNKNOWN'].includes(a.state)),
              promotion: accesses.some((a) => a.state === 'WAITING' && a.promoting) } : null };
        }) });
    }
    const reserved = live.filter((r) => !preflight(r.changeId));
    const changes = reserved.filter((r) => business(r.changeId));
    const busy = (r) => this.nativeStates.get(r.sessionId) === 'busy';
    const counts = [reserved.length, changes.length, reserved.filter(busy).length, changes.filter(busy).length];
    categories.forEach((key, i) => {
      const target = this.data.categories[key];
      const known = registryKnown && (i < 2 || (this.connected &&
        (i === 2 ? reserved : changes).every((r) => this.nativeStates.has(r.sessionId))));
      if (!known) target.unknownMs += elapsed;
      else {
        target[counts[i] === 0 ? 'zeroMs' : counts[i] === 1 ? 'monoMs' : 'multiMs'] += elapsed;
        if (counts[i] === 2) target.exactlyTwoMs += elapsed;
        if (counts[i] >= 3) target.threeOrMoreMs += elapsed;
      }
    });
    for (const run of live) {
      const c = this.context(run); c.lastAt = at;
      if (registryKnown && this.observations) this.observations.catalog(run, at);
      if (registryKnown) {
        c.reservedMs += elapsed;
        if (this.integrationOwner === run.runId) c.integrationMs += elapsed;
        if (this.queue.some((q) => q.runId === run.runId)) c.queueMs += elapsed;
        if (!this.resourceProfile && run.referenceVersion !== this.referenceVersion && run.phase !== 'REPORT') c.staleMs += elapsed;
        if (this.resourceProfile) {
          const accesses = this.accessStates.filter((a) => a.runId === run.runId && a.contextId === run.contextId);
          if (accesses.some((a) => a.state === 'WAITING')) c.coordination.resourceWaitMs += elapsed;
          if (accesses.some((a) => a.state === 'WAITING' && a.promoting)) c.coordination.promotionWaitMs += elapsed;
          if (accesses.some((a) => ['HELD', 'EXECUTING', 'UNKNOWN'].includes(a.state) && a.protection === 'SHARED')) c.coordination.sharedHeldMs += elapsed;
          if (accesses.some((a) => ['HELD', 'EXECUTING', 'UNKNOWN'].includes(a.state) && a.protection === 'EXCLUSIVE')) c.coordination.exclusiveActiveMs += elapsed;
          if (accesses.some((a) => ['EXECUTING', 'UNKNOWN'].includes(a.state))) c.coordination.issuedEffectMs += elapsed;
          if (this.globalState && this.globalState.state !== 'RELEASED' && globalCauses.includes(this.globalState.cause)) {
            c.coordination.globalMs[this.globalState.cause] += elapsed;
          }
        }
      }
      const state = this.nativeStates.get(run.sessionId);
      c[registryKnown && this.connected && ['busy', 'idle'].includes(state)
        ? state === 'busy' ? 'busyMs' : 'idleMs' : 'nativeUnknownMs'] += elapsed;
    }
    this.data.lastAt = Math.max(this.data.lastAt, at); this.dirty = true;
  }
  registry(snapshot) {
    this.advance();
    this.directory = snapshot.project || this.directory;
    if (this.directory) this.observations.bind(this.directory);
    const previous = this.runs;
    this.runs = snapshot.runs.map((r) => ({ runId: r.runId, contextId: r.contextId, changeId: r.changeId,
      sessionId: r.sessionId, state: r.state, phase: r.phase || 'WORK', referenceVersion: r.referenceVersion,
      version: r.version }));
    this.integrationOwner = snapshot.integrationOwner; this.referenceVersion = snapshot.referenceVersion;
    this.resourceProfile = snapshot.coordinationProtocol === 'resource-scoped-v1';
    this.globalState = snapshot.coordination?.global ? { cause: snapshot.coordination.global.cause,
      state: snapshot.coordination.global.state } : null;
    const accesses = Object.values(snapshot.coordination?.accesses || {});
    this.accessStates = accesses.filter((a) => ['WAITING', 'HELD', 'EXECUTING', 'UNKNOWN'].includes(a.state)).map((a) => ({
      runId: a.runId, contextId: a.contextId, state: a.state, protection: a.protection,
      promoting: a.state === 'WAITING' && accesses.some((holder) => holder.protection === 'EXCLUSIVE' &&
        ['HELD', 'EXECUTING', 'UNKNOWN'].includes(holder.state) && a.resources?.some((left) => holder.resources?.some((right) =>
          (left.mode === 'write' || right.mode === 'write') && (left.key === right.key ||
            (left.key.startsWith('file:') && right.key.startsWith('file:') &&
              (left.key.startsWith(right.key + '/') || right.key.startsWith(left.key + '/'))))))) }));
    this.registryKnown = true;
    this.queue = snapshot.integrationQueue || [];
    for (const run of this.runs) {
      const c = this.context(run); c.state = run.state; c.phase = run.phase; c.lastAt = this.now();
      this.observations.catalog(run);
      const prior = previous.find((r) => r.runId === run.runId && r.contextId === run.contextId);
      if (!prior || prior.version !== run.version) this.observations.event({ id: prior ? 'generation-' + run.version : 'context-' + run.contextId,
        runId: run.runId, contextId: run.contextId, changeId: run.changeId, at: this.now(),
        kind: prior ? 'generation' : 'change-observed', status: null, name: null, durationMs: null });
    }
  }
  connection(connected) {
    this.advance(); this.connected = connected;
    if (!connected) this.nativeStates.clear();
  }
  nativeSnapshot(states, onlyUnknown = false) {
    this.advance();
    if (!states || typeof states !== 'object' || Array.isArray(states)) {
      this.error = 'statistics-native-baseline-unavailable'; return;
    }
    if (this.error === 'statistics-native-baseline-unavailable') this.error = null;
    for (const run of this.runs.filter((r) => r.state === 'RESERVED')) {
      if (onlyUnknown && this.nativeStates.has(run.sessionId)) continue;
      const type = states[run.sessionId]?.type || 'idle';
      if (['idle', 'busy', 'retry'].includes(type)) this.nativeStates.set(run.sessionId, type);
    }
  }
  observe(run, type, details = {}) {
    if (!run || !knownId(run.runId) || !knownId(run.changeId)) return;
    this.advance(); const c = this.context(run);
    if (type === 'resource-reconciliation-completed' && finite(details.durationMs)) {
      c.coordination.reconciliationMs += details.durationMs; c.coordination.reconciliationCount++;
    }
    const requestId = details.requestId;
    const eventKind = { 'validation-received': 'request', 'validation-answered': 'decision',
      'validation-manually-answered': 'decision', 'opencode-permission-approved': 'once', 'validation-failed': 'technical-error' }[type];
    if (eventKind && knownId(requestId)) this.observations.event({ id: requestId, runId: run.runId,
      contextId: run.contextId, changeId: run.changeId, at: this.now(), kind: eventKind,
      status: eventKind === 'decision' ? details.decision : null, name: null, durationMs: null });
    if (knownId(requestId)) {
      if (!Object.hasOwn(c.requests, requestId)) c.requests[requestId] = {};
      const request = c.requests[requestId];
      if (type === 'validation-received' && request.receivedAt === undefined) {
        request.receivedAt = finite(details.receivedAt) && details.receivedAt <= this.now() ? details.receivedAt : this.now();
      }
      if (['validation-answered', 'validation-manually-answered'].includes(type) && request.decisionAt === undefined &&
          ['approved', 'rejected', 'needs_clarification'].includes(details.decision)) {
        request.decision = details.decision; request.decisionAt = this.now();
        if (request.receivedAt !== undefined) sample(c.latencies.requestToDecision, request.decisionAt - request.receivedAt);
      }
      if (type === 'opencode-permission-approved' && request.onceAt === undefined) {
        request.onceAt = this.now();
        if (request.decisionAt !== undefined) sample(c.latencies.decisionToOnce, request.onceAt - request.decisionAt);
      }
      if (type === 'validation-failed') request.technicalError = true;
    }
  }
  httpFailure(run, code) {
    if (!run || !/^[a-z][a-z0-9-]{0,79}$/.test(code || '')) return;
    const c = this.context(run); c.httpFailures[code] = (c.httpFailures[code] || 0) + 1; this.dirty = true;
  }
  admissionFailure(candidate, code) {
    if (!candidate || !['runId', 'changeId', 'sessionId'].every((key) => knownId(candidate[key])) ||
        !/^[a-z][a-z0-9-]{0,79}$/.test(code || '')) return;
    const key = `${candidate.runId}:${candidate.changeId}:${candidate.sessionId}`;
    const entry = this.data.admissions[key] ||= { runId: candidate.runId, changeId: candidate.changeId,
      sessionId: candidate.sessionId, firstAt: this.now(), lastAt: this.now(), attempts: 0, causes: {} };
    entry.attempts++; entry.lastAt = this.now(); entry.causes[code] = (entry.causes[code] || 0) + 1;
    this.dirty = true;
  }
  nativeEvent(event) {
    const value = normalizeOpenCodeEvent(event);
    if (!value) return;
    const props = value.properties;
    if (this.directory && [event.directory, value.directory, props.directory, props.info?.directory]
      .some((directory) => directory !== undefined && directory !== this.directory)) return;
    const session = props.sessionID || props.sessionId || props.part?.sessionID || props.info?.sessionID;
    const run = this.runs.find((r) => r.state === 'RESERVED' && r.sessionId === session);
    if (!run) return;
    this.advance(); const c = this.context(run);
    if (value.type === 'session.status' && ['busy', 'idle', 'retry'].includes(props.status?.type)) {
      this.nativeStates.set(session, props.status.type);
    } else if (['session.idle', 'session.execution.succeeded', 'session.execution.failed', 'session.execution.interrupted'].includes(value.type)) this.nativeStates.set(session, 'idle');
    else if (value.type === 'session.execution.started') this.nativeStates.set(session, 'busy');
    else if (value.type === 'message.updated' && knownId(props.info?.id) &&
        ['user', 'assistant'].includes(props.info.role)) {
      c.messages[props.info.id] = props.info.role;
      this.observations.event({ id: props.info.id, runId: run.runId, contextId: run.contextId, changeId: run.changeId,
        at: this.now(), kind: 'message', status: props.info.role, name: null, durationMs: null });
    }
    else if (value.type === 'message.part.updated' && props.part?.type === 'tool') {
      const part = props.part;
      if (!knownId(part.id)) { this.droppedEvents++; return; }
      const status = part.state?.status;
      if (!['pending', 'running', 'completed', 'error'].includes(status)) return;
      const prior = c.tools[part.id];
      if (prior && ['completed', 'error'].includes(prior.status)) return;
      const name = ['bash', 'edit', 'write', 'read', 'apply_patch', 'glob', 'grep', 'webfetch', 'websearch'].includes(part.tool)
        ? part.tool : part.tool?.startsWith('cgpt-validation_') ? 'cab-mcp' : 'other';
      const tool = c.tools[part.id] = { name, status };
      const time = part.state?.time;
      if (['completed', 'error'].includes(status) && finite(time?.start) && finite(time?.end) && time.end >= time.start) {
        tool.durationMs = time.end - time.start; sample(c.latencies.nativeTool, tool.durationMs);
      }
      this.observations.event({ id: part.id, runId: run.runId, contextId: run.contextId, changeId: run.changeId,
        at: this.now(), kind: 'tool', status, name, durationMs: tool.durationMs === undefined ? null : Math.round(tool.durationMs) });
    }
    this.dirty = true;
  }
  summary(runId, contextId) {
    this.advance();
    const contexts = Object.values(this.data.contexts).filter((c) => (!runId || c.runId === runId) &&
      (contextId === undefined || c.contextId === contextId)).map((c) => {
      const decisions = { approved: 0, rejected: 0, needs_clarification: 0, pending: 0, once: 0, technicalErrors: 0 };
      for (const r of Object.values(c.requests)) {
        decisions[r.decision || 'pending']++;
        if (r.onceAt !== undefined) decisions.once++;
        if (r.technicalError) decisions.technicalErrors++;
      }
      const tools = {};
      for (const t of Object.values(c.tools)) {
        tools[t.name] ||= { completed: 0, error: 0, running: 0, pending: 0 };
        tools[t.name][t.status]++;
      }
      const { requests, tools: nativeTools, messages, latencies, ...meta } = c;
      return { ...meta, decisions, tools,
        messages: { user: Object.values(messages).filter((role) => role === 'user').length,
          assistant: Object.values(messages).filter((role) => role === 'assistant').length },
        latencies: Object.fromEntries(Object.entries(latencies).map(([key, m]) => [key, quantiles(m)])) };
    });
    return { schemaVersion: 2, version: VERSION, observedAt: new Date(this.now()).toISOString(),
      firstAt: new Date(this.data.firstAt).toISOString(), lastAt: new Date(this.data.lastAt).toISOString(),
      restartUnknownMs: this.data.restartUnknownMs, categories: structuredClone(this.data.categories), contexts,
      persistence: { status: this.error ? 'DEGRADED' : 'READY', cause: this.error, writes: this.writeCount },
      limitations: ['busy ne prouve pas du codage productif', 'tentatives HTTP distinctes des refus de permission',
        'coordination depuis availableFrom ; détention, attente, effets émis et gels peuvent se recouvrir',
        'issuedEffectMs décrit une permission en suivi, pas une durée de codage productif',
        'quotas, tokens, coûts, modèles et sondes non disponibles dans cet agrégat',
        'liste de fichiers et URL non collectée pour préserver la confidentialité',
        'horodatages de réception du contrôleur ; aucune reconstruction des événements manquants'],
      admissionAttempts: Object.values(this.data.admissions).filter((a) => !runId || a.runId === runId)
        .map((a) => ({ ...structuredClone(a), observedSpanMs: a.lastAt - a.firstAt,
          limitation: 'bornes des tentatives observées, pas durée causale exhaustive ni nombre de refus distincts' })),
      droppedEvents: this.droppedEvents };
  }
  markdown(runId, contextId) {
    const data = this.summary(runId, contextId);
    if (data.contexts.length !== 1) throw new Error('statistics-context-required');
    const c = data.contexts[0];
    const f = (ms) => `${(ms / 1000).toFixed(3)} s`;
    const n = (ms) => ms === null ? 'N/A — événement absent' : f(ms);
    const pct = (value, total) => total ? `${(100 * value / total).toFixed(1)} %` : 'N/A';
    const countTools = (t) => t.completed + t.error + t.running + t.pending;
    const toolTotal = Object.values(c.tools).reduce((total, t) => total + countTools(t), 0);
    const rows = Object.entries(c.tools).map(([name, t]) =>
      `| ${name} | ${countTools(t)} (${pct(countTools(t), toolTotal)}) | ${t.completed} | ${t.error} | ${t.running + t.pending} |`).join('\n');
    const decisionTotal = c.decisions.approved + c.decisions.rejected + c.decisions.needs_clarification + c.decisions.pending;
    const decisionRows = ['approved', 'rejected', 'needs_clarification', 'pending'].map((key) =>
      `| ${key} | ${c.decisions[key]} | ${pct(c.decisions[key], decisionTotal)} |`).join('\n');
    const agents = '| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |\n' +
      '|---|---|---|---|---|---|---|\n| N/A — métadonnées non collectées | N/A | N/A | N/A | N/A | N/A | N/A |\n';
    return `# Statistiques CAB — ${c.changeId}\n\nBrouillon déterministe à vérifier avant publication. RUN ${c.runId}, contexte ${c.contextId}.\n\n` +
      `### Agents de codage\n\n${agents}\n### Agents orchestrateurs\n\n${agents}\n` +
      `## 1. Statistiques générales et décisions\n\n` +
      `Début observé : ${new Date(c.firstAt).toISOString()}. Dernière observation : ${new Date(c.lastAt).toISOString()}. État ${c.state}, phase ${c.phase}.\n\n` +
      `| Décision CAB | Nombre | Part |\n|---|---:|---:|\n${decisionRows}\n| Total | ${decisionTotal} | ${pct(decisionTotal, decisionTotal)} |\n\n` +
      `Permissions once : ${c.decisions.once}. Erreurs techniques de validation : ${c.decisions.technicalErrors} (peuvent recouvrir une attente). Une approbation ne prouve pas une exécution.\n\n` +
      `| Latence observée | Nombre | Médiane | p95 | Échantillon |\n|---|---:|---:|---:|---:|\n` +
      Object.entries(c.latencies).map(([key, m]) => `| ${key} | ${m.count} | ${n(m.medianMs)} | ${n(m.p95Ms)} | ${m.sampleCount} |`).join('\n') +
      `\n\nQuantiles sur les dernières 2048 observations au maximum. Temps réservé : ${f(c.reservedMs)} ; busy : ${f(c.busyMs)} ; idle : ${f(c.idleMs)} ; natif inconnu : ${f(c.nativeUnknownMs)}.\n\n` +
      `## 2. Types de messages et d'outils\n\nMessages observés : user ${c.messages.user}, assistant ${c.messages.assistant}.\n\n` +
      `| Famille | Total et part | Completed | Erreur technique | En cours |\n|---|---:|---:|---:|---:|\n${rows || '| N/A — aucun événement | 0 (N/A) | 0 | 0 | 0 |'}\n\n` +
      `Completed décrit l'état natif terminé ; il ne prouve pas la réussite d'un test ni une approbation manuelle.\n\n` +
      `## 3. Fichiers modifiés\n\nN/A — chemins et contenus exclus de la collecte. Compléter seulement depuis des preuves autorisées.\n\n` +
      `## 4. Commandes\n\nLes compteurs bash figurent ci-dessus. N/A pour les commandes exactes, non conservées. Les erreurs d'outils ne sont pas assimilées à des refus.\n\n` +
      `## 5. Accès web\n\nN/A — URL et arguments non conservés ; aucune visite déduite d'une simple demande.\n\n` +
      `## 6. Synthèse globale\n\nHistorique d'intégration : ${f(c.integrationMs)} ; file historique : ${f(c.queueMs)} ; référence historique : ${f(c.staleMs)}.\n\n` +
      `Coordination depuis ${new Date(c.coordination.availableFrom).toISOString()} : attente de ressource ${f(c.coordination.resourceWaitMs)}, détention partagée ${f(c.coordination.sharedHeldMs)}, activité exclusive ${f(c.coordination.exclusiveActiveMs)}, promotion ${f(c.coordination.promotionWaitMs)}, réconciliation ciblée ${f(c.coordination.reconciliationMs)} (${c.coordination.reconciliationCount}).\n\n` +
      `Gels exceptionnels : ${Object.entries(c.coordination.globalMs).map(([cause, ms]) => cause + ' ' + f(ms)).join(' ; ')}. Ces conditions peuvent se recouvrir et ne s'additionnent pas.\n\n` +
      `| Durée de la session observée | Valeur |\n|---|---|\n| Début observé | ${new Date(c.firstAt).toISOString()} |\n` +
      `| Dernière observation, fin à confirmer après archive | ${new Date(c.lastAt).toISOString()} |\n| Durée observée, attentes incluses | ${f(c.lastAt - c.firstAt)} |\n\n` +
      `| Quota Codex 7 jours | Horodatage | Utilisé | Réinitialisation |\n|---|---|---|---|\n` +
      `| Avant | N/A | N/A | N/A |\n| Après archive | N/A | N/A | N/A |\n| Différence | — | N/A | — |\n\n` +
      `Outil natif absent du service, compte partagé ; compléter seulement depuis des relevés comparables autorisés. Tokens, coûts et débit : N/A — non collectés.\n\n` +
      `Couverture : contrôleur et SSE observés ; interruption du contrôleur inconnue cumulée ${f(data.restartUnknownMs)}. Busy ne prouve pas du codage productif. Aucun gain causal calculé.\n\n` +
      `Persistance : ${data.persistence.status}${data.persistence.cause ? ' — ' + data.persistence.cause : ''}. Tests, archive, rapport final et gate : à vérifier par l'orchestrateur, jamais déduits par ce service.\n`;
  }
  async flush() {
    if (this.maintenance) return;
    if (!this.persistEnabled || !this.dirty || this.error === 'statistics-restoration-invalid') return;
    if (this.saving) { await this.saving; return; }
    this.dirty = false;
    const text = JSON.stringify(this.data) + '\n';
    this.saving = (async () => {
      let candidate;
      try {
        safeParent(dirname(this.path));
        await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
        if (realpathSync(dirname(this.path)) !== resolve(dirname(this.path))) throw new Error('invalid parent');
        candidate = `${this.path}.candidate-${randomUUID()}`;
        const fd = await open(candidate, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
        try { await fd.writeFile(text, 'utf8'); await fd.sync(); } finally { await fd.close(); }
        await rename(candidate, this.path); candidate = undefined; this.writeCount++;
        if (this.error === 'statistics-persistence-unavailable') this.error = null;
      } catch { this.error = 'statistics-persistence-unavailable'; this.dirty = true; }
      finally {
        if (candidate) { try { await unlink(candidate); } catch { this.error = 'statistics-persistence-unavailable'; } }
      }
    })();
    await this.saving; this.saving = null;
    await this.observations.flush();
  }
  async close() {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.timer); this.advance();
    if (this.saving) await this.saving;
    await this.flush();
    await this.observations.flush();
  }
}
