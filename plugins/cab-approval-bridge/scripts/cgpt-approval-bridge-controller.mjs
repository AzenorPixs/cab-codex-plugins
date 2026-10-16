import { createHash } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { createJobContext } from './cgpt-approval-bridge-job-context.mjs';
import { CoordinationError, RunRegistry, VERSION } from './cgpt-approval-bridge-runs.mjs';
import { SessionStatistics, VERSION as STATISTICS_VERSION } from './cgpt-approval-bridge-statistics.mjs';

const version = "1.2.1";
if (version !== VERSION || version !== STATISTICS_VERSION) throw new Error('CAB component version mismatch');

const envValue = (key) => process.env[key] || process.env[key.replace('OC_Codex_', 'OC_CGPT_')];
const workspaceInput = envValue('OC_Codex_WORKSPACE');
if (!workspaceInput || !workspaceInput.startsWith('/')) throw new Error('OC_Codex_WORKSPACE doit désigner une racine de projet absolue.');
if (envValue('OC_Codex_OUTSIDE_SANDBOX') !== '1') throw new Error('OC_Codex_OUTSIDE_SANDBOX=1 est requis.');
if (!['automatic', 'manual'].includes(envValue('OC_Codex_DECISION_MODE') || 'manual')) {
  throw new Error('OC_Codex_DECISION_MODE doit être automatic ou manual.');
}
const host = envValue('OC_Codex_STATUS_HOST') || '127.0.0.1';
if (!['127.0.0.1', '::1'].includes(host)) throw new Error('OC_Codex_STATUS_HOST doit être une adresse loopback autorisée.');
const workspace = realpathSync(workspaceInput);
const stateDirectory = join(workspace, '.opencode', 'state', 'cgpt-approval-bridge');
const port = Number(envValue('OC_Codex_STATUS_PORT') || 8788);
const opencodeUrl = (envValue('OC_Codex_OPENCODE_URL') || 'http://127.0.0.1:4096').replace(/\/$/, '');
const reconnectMs = Number(envValue('OC_Codex_RECONNECT_MS') || 1000);
const statistics = new SessionStatistics(stateDirectory);
let registryRevision = 0;
let nativeGeneration = 0;
function observeStatistics(callback) {
  try { callback(); } catch { statistics.error = 'statistics-observation-unavailable'; }
}
const registry = new RunRegistry(workspace, stateDirectory, {
  observe: (snapshot) => { registryRevision++; observeStatistics(() => statistics.registry(snapshot)); },
});
await registry.acquireAuthority();
statistics.registry(registry.snapshot());
const contexts = new Map();
const transitions = new Set();
let broker = null;
let sseState = 'connecting';
let reconnectTimer;
let sseGeneration = 0;
const legacy = createJobContext({ workspace, stateDirectory, admitOperation: () => {
  try { registry.assertHealthy(); return true; } catch { return false; }
} });

function json(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  response.end(JSON.stringify(payload));
}
async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > 256 * 1024) throw new CoordinationError('request-too-large', 413);
  }
  try { return JSON.parse(body || '{}'); }
  catch { throw new CoordinationError('invalid-json', 400); }
}
function contextFor(run) {
  if (contexts.has(run.runId)) return contexts.get(run.runId);
  let context;
  context = createJobContext({
    workspace, stateDirectory: join(stateDirectory, 'runs', run.runId, String(run.contextId || run.version)), run,
    observe: (type, details) => observeStatistics(() => statistics.observe(run, type, details)),
    ownsSession: (session) => context.sessions().includes(session),
    verifyRestoredPreflight: (approval) => {
      try {
        const owner = registry.requestOwners[approval.requestId];
        const digest = createHash('sha256').update(JSON.stringify(nativeIdentity(approval))).digest('hex');
        return owner?.runId === run.runId && owner.digest === digest &&
          registry.covers(run.runId, approval.reservation_version, approval.resources);
      } catch { return false; }
    },
    admitOperation: (operation) => {
      try {
        if (transitions.has(run.runId) || !operation || operation.runId !== run.runId || operation.directory !== workspace ||
            !context.sessions().includes(operation.sessionId)) return false;
        // A candidate session is admitted only by the existing recovery preflight.
        const resources = operation.kind === 'edit'
          ? [{ key: 'file:' + operation.target, mode: 'write' }] : operation.resources;
        return registry.covers(run.runId, operation.reservationVersion, resources);
      } catch { return false; }
    },
  });
  contexts.set(run.runId, context);
  context.start();
  if (sseState === 'connected') context.onConnect();
  return context;
}
function activeContexts() {
  return [...contexts.entries()].filter(([id]) => registry.runs.get(id)?.state === 'RESERVED');
}
function statusFor(runId, context) {
  const status = context.publicStatus();
  const run = registry.runs.get(runId);
  const reason = registry.integrationOwner && registry.integrationOwner !== runId ? 'integration-suspended'
    : run.phase !== 'REPORT' && run.referenceVersion !== registry.referenceVersion ? 'reference-reconciliation-required'
      : registry.integrationQueue.length && run.integrationReady && run.phase !== 'REPORT' && !registry.integrationOwner
        ? 'integration-draining' : null;
  return { ...status, coordination: { reason, integrationReady: run.integrationReady,
    referenceVersion: registry.referenceVersion, reviewedReferenceVersion: run.referenceVersion,
    phase: run.phase, integrationQueue: registry.integrationQueue,
    integrationBlockers: localIntegrationBlockers(runId) },
    ...(reason ? { brokerReadiness: { ...status.brokerReadiness, status: 'BLOCKED', ready: false, root_cause: reason } } : {}) };
}
function localIntegrationBlockers(runId) {
  const blockers = registry.integrationBlockers(runId);
  for (const [id, context] of activeContexts()) {
    const status = context.publicStatus();
    const entry = (reason) => ({ runId: id, reason });
    if (status.job?.currentCabMandate) blockers.push(entry('current-mandate-not-closed'));
    if (status.undecidedValidationCount) blockers.push(entry('undecided-validation'));
    if (status.unmatchedNativePermissionCount) blockers.push(entry('native-permissions-unresolved'));
    if (status.job?.recovery) blockers.push(entry('session-recovery-pending'));
    if (context.pendingEffects()) blockers.push(entry('run-not-quiescent'));
  }
  return blockers;
}
async function nativeCohort() {
  const entries = activeContexts().map(([runId, context]) => ({ runId, context,
    sessionId: context.publicJob()?.sessionId || registry.runs.get(runId).sessionId }));
  const revision = registryRevision;
  const generation = nativeGeneration;
  async function get(path) {
    try {
      const response = await fetch(opencodeUrl + path + '?directory=' + encodeURIComponent(workspace),
        { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('unavailable');
      return await response.json();
    } catch { throw new CoordinationError('native-reconciliation-unavailable'); }
  }
  const [busy, permissions, ...sessions] = await Promise.all([
    get('/session/status'), get('/permission'),
    ...entries.map((entry) => get('/session/' + encodeURIComponent(entry.sessionId))),
  ]);
  if (!busy || typeof busy !== 'object' || Array.isArray(busy) || !Array.isArray(permissions) ||
      Object.values(busy).some((state) => !state || !['idle', 'busy', 'retry'].includes(state.type)) ||
      permissions.some((permission) => !permission || typeof permission.sessionID !== 'string' || typeof permission.id !== 'string')) {
    throw new CoordinationError('native-reconciliation-invalid');
  }
  const blockers = [];
  entries.forEach((entry, index) => {
    const session = sessions[index];
    if (session?.id !== entry.sessionId || session.directory !== workspace) throw new CoordinationError('native-session-divergent');
    if (!entry.context.sessions().includes(entry.sessionId)) throw new CoordinationError('native-observation-changed');
    if (busy[entry.sessionId] && busy[entry.sessionId].type !== 'idle') {
      blockers.push({ runId: entry.runId, sessionId: entry.sessionId, reason: 'native-session-busy' });
    }
    const count = permissions.filter((permission) => permission.sessionID === entry.sessionId).length;
    if (count) blockers.push({ runId: entry.runId, sessionId: entry.sessionId, reason: 'native-permissions-unresolved', count });
  });
  if (registryRevision !== revision || nativeGeneration !== generation) throw new CoordinationError('native-observation-changed');
  observeStatistics(() => statistics.nativeSnapshot(busy));
  return blockers;
}
async function checkCohort() {
  const blockers = await nativeCohort();
  if (activeContexts().some(([, context]) => context.pendingEffects() || context.publicJob()?.recovery)) {
    throw new CoordinationError('run-not-quiescent');
  }
  if (blockers.length) throw new CoordinationError('native-session-not-quiescent');
}
function proofReferences(payload) {
  if (!Array.isArray(payload.evidence) || !payload.evidence.length ||
      !payload.evidence.every((e) => typeof e === 'string' && e.length > 0 && e.length <= 500)) {
    throw new CoordinationError('evidence-references-required');
  }
}
function scopedReadiness(runId, payload) {
  const scoped = payload.by_run?.[runId] || { pending_count: 0, stalled_count: 0 };
  const commonCauses = new Set(['STORE_UNHEALTHY', 'JOURNAL_UNHEALTHY', 'JOURNAL_INTEGRITY_FAILURE',
    'STORE_JOURNAL_DIVERGENCE', 'WORKER_POOL_SATURATED', 'CONTROLLER_UNREACHABLE']);
  const commonFailure = commonCauses.has(payload.root_cause) || (payload.infrastructure_status && payload.infrastructure_status !== 'READY');
  const state = commonFailure ? payload.status : (scoped.status || (scoped.stalled_count ? 'BLOCKED' : 'READY'));
  return { ...payload, ...scoped, status: state, ready: state === 'READY', run_id: runId,
    root_cause: commonFailure ? payload.root_cause : scoped.root_cause || 'NONE' };
}
async function publishTo(context, readiness) {
  await context.handle({ method: 'POST', cabPayload: readiness },
    { writeHead() { return this; }, end() {} }, new URL('http://localhost/broker/readiness'));
}
async function checkNative(sessionId, idle = false) {
  const r = await fetch(opencodeUrl + '/session/' + encodeURIComponent(sessionId) +
    '?directory=' + encodeURIComponent(workspace), { signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new CoordinationError('native-session-unavailable');
  const session = await r.json();
  if (session.id !== sessionId || session.directory !== workspace) throw new CoordinationError('native-session-divergent');
  if (idle) {
    const [busyResponse, permissionsResponse] = await Promise.all([
      fetch(opencodeUrl + '/session/status?directory=' + encodeURIComponent(workspace)),
      fetch(opencodeUrl + '/permission?directory=' + encodeURIComponent(workspace)),
    ]);
    if (!busyResponse.ok || !permissionsResponse.ok) throw new CoordinationError('native-reconciliation-unavailable');
    const busy = await busyResponse.json();
    const permissions = await permissionsResponse.json();
    if (!busy || typeof busy !== 'object' || Array.isArray(busy) ||
        !Array.isArray(permissions) || (busy[sessionId] && busy[sessionId].type !== 'idle') ||
        permissions.some((p) => p.sessionID === sessionId)) throw new CoordinationError('native-session-not-quiescent');
    observeStatistics(() => statistics.nativeSnapshot(busy));
  }
}
function singleContext() {
  const active = activeContexts();
  if (active.length > 1 || (active.length && legacy.publicJob()?.armed)) throw new CoordinationError('run-target-required');
  return active[0]?.[1] || legacy;
}
function nativeIdentity(approval) {
  return Object.fromEntries(['run_id', 'reservation_version', 'requestId', 'approval_id', 'change_id',
    'session_id', 'directory', 'title', 'summary', 'files', 'commands', 'resources']
    .map((key) => [key, approval[key] ?? (['resources', 'commands'].includes(key) ? [] : key === 'summary' ? '' : null)]));
}
async function verifyNativeValidation(approval) {
  const response = await fetch(opencodeUrl + '/session/' + encodeURIComponent(approval.session_id) +
    '/message?directory=' + encodeURIComponent(workspace), { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new CoordinationError('native-validation-unavailable');
  const messages = await response.json();
  const expected = JSON.stringify(nativeIdentity(approval));
  if (!Array.isArray(messages) || !messages.some((message) => Array.isArray(message.parts) &&
      message.parts.some((part) => part.type === 'tool' &&
        part.tool === 'cgpt-validation_request_validation' &&
        ['running', 'completed'].includes(part.state?.status) && part.state?.input &&
        JSON.stringify(nativeIdentity(part.state.input)) === expected))) {
    throw new CoordinationError('native-validation-not-correlated');
  }
}
for (const run of registry.runs.values()) if (run.state === 'RESERVED') contextFor(run);
if (contexts.size && legacy.publicJob()?.armed) throw new Error('Legacy job must be reconciled before concurrent RUNs.');
legacy.start();

const server = createServer(async (request, response) => {
  request.cabReceivedAt = Date.now();
  let transitionRun = null;
  let observedRun = null;
  let attemptedReservation = null;
  try {
    const url = new URL(request.url, 'http://localhost');
    const payload = request.method === 'POST' ? await readJson(request) : null;
    request.cabPayload = payload;
    registry.assertHealthy();
    const statisticsMatch = url.pathname.match(/^\/runs\/([A-Za-z0-9][A-Za-z0-9_.-]{0,99})\/statistics$/);
    if (request.method === 'GET' && (url.pathname === '/statistics' || statisticsMatch)) {
      const runId = statisticsMatch?.[1];
      const contextId = url.searchParams.has('contextId') ? Number(url.searchParams.get('contextId')) : undefined;
      if (contextId !== undefined && (!Number.isSafeInteger(contextId) || contextId < 1)) {
        throw new CoordinationError('statistics-context-invalid', 400);
      }
      const current = registry.runs.get(runId);
      const selectedContext = contextId ?? current?.contextId;
      const result = statistics.summary(runId, selectedContext);
      if (runId && !result.contexts.length) throw new CoordinationError('statistics-not-found', 404);
      if (url.searchParams.get('format') === 'markdown') {
        if (!runId) throw new CoordinationError('statistics-context-required', 400);
        response.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'no-store' });
        response.end(statistics.markdown(runId, selectedContext));
      } else json(response, 200, result);
      return;
    }
    if (request.method === 'GET' && url.pathname === '/runs') {
      json(response, 200, registry.snapshot()); return;
    }
    if (request.method === 'GET' && url.pathname === '/status' && !url.searchParams.has('runId')) {
      const entries = activeContexts();
      if (!entries.length) { json(response, 200, legacy.publicStatus()); return; }
      json(response, 200, { version: VERSION, mode: 'concurrent', opencodeSse: sseState,
        brokerReadiness: broker, activeRunCount: entries.length,
        runs: Object.fromEntries(entries.map(([id, c]) => [id, statusFor(id, c)])),
        activeValidationCount: entries.reduce((n, [, c]) => n + c.publicStatus().activeValidationCount, 0),
        job: entries.length === 1 ? entries[0][1].publicJob() : null });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/runs/reserve') {
      attemptedReservation = payload;
      if (legacy.publicJob()?.armed) throw new CoordinationError('legacy-job-active');
      await checkNative(payload.sessionId);
      const run = registry.reserve(payload);
      const context = contextFor(run);
      if (broker) await publishTo(context, scopedReadiness(run.runId, broker));
      json(response, 201, run); return;
    }
    if (request.method === 'POST' && url.pathname === '/broker/readiness') {
      if (!payload || !['READY', 'DEGRADED', 'BLOCKED', 'HUMAN_REQUIRED'].includes(payload.status)) {
        throw new CoordinationError('readiness-invalid', 400);
      }
      broker = payload;
      await publishTo(legacy, payload);
      for (const [runId, context] of activeContexts()) await publishTo(context, scopedReadiness(runId, payload));
      json(response, 202, { accepted: true, status: payload.status }); return;
    }
    const match = url.pathname.match(/^\/runs\/([A-Za-z0-9][A-Za-z0-9_.-]{0,99})(\/.*)?$/);
    let runId = match?.[1] || payload?.approval?.run_id || url.searchParams.get('runId');
    const requestId = url.pathname.match(/\/decision\/([^/]+)$/)?.[1];
    if (!runId && requestId && registry.requestOwners[requestId]) runId = registry.requestOwners[requestId].runId;
    if (match?.[2] === '/integration' && request.method === 'POST' && payload?.completion !== undefined) {
      const receipt = registry.completionReceipt(runId, payload);
      if (receipt) { json(response, 200, { ...registry.snapshot(), completion: receipt }); return; }
    }
    const context = runId ? contexts.get(runId) : singleContext();
    if (!context) throw new CoordinationError('run-not-found', 404);
    if (match) url.pathname = match[2] || '/status';
    if (runId) {
      const run = registry.runs.get(runId);
      if (!run || run.state !== 'RESERVED') throw new CoordinationError('run-not-reserved');
      observedRun = run;
      if (request.method === 'POST' && transitions.has(runId)) throw new CoordinationError('run-transition-in-flight');
      if (request.method === 'POST' && ['/release', '/ready', '/reconcile', '/integration', '/integration-request', '/resources', '/closing', '/job/recover', '/job/terminal-gate', '/job/disarm'].includes(url.pathname)) {
        transitions.add(runId);
        transitionRun = runId;
      }
      if (request.method === 'GET' && url.pathname === '/status') { json(response, 200, statusFor(runId, context)); return; }
      if (request.method === 'GET' && url.pathname === '/integration-status') {
        const nativeBlockers = await nativeCohort();
        json(response, 200, { runId, referenceVersion: registry.referenceVersion,
          integrationOwner: registry.integrationOwner, integrationQueue: registry.integrationQueue,
          blockers: [...localIntegrationBlockers(runId), ...nativeBlockers],
          observedAt: new Date().toISOString() }); return;
      }
      if (request.method === 'POST' && ['/integration-request', '/resources', '/closing'].includes(url.pathname)) {
        if (context.pendingEffects() || context.publicJob()?.recovery) throw new CoordinationError('run-not-quiescent');
        registry.owned(runId, payload.version);
        proofReferences(payload);
        await checkNative(context.publicJob()?.sessionId || run.sessionId, true);
        if (url.pathname === '/integration-request') {
          if (payload.cancel !== undefined && typeof payload.cancel !== 'boolean') throw new CoordinationError('integration-action-required', 400);
          json(response, 200, registry.requestIntegration(runId, payload.version, payload.cancel || false));
        } else if (url.pathname === '/resources') json(response, 200, registry.reduce(runId, payload));
        else json(response, 200, registry.closing(runId, payload));
        return;
      }
      if (request.method === 'POST' && ['/ready', '/reconcile'].includes(url.pathname)) {
        if (context.pendingEffects() || context.publicJob()?.recovery) throw new CoordinationError('run-not-quiescent');
        registry.owned(runId, payload.version);
        proofReferences(payload);
        await checkNative(context.publicJob()?.sessionId || run.sessionId, true);
        if (url.pathname === '/ready') {
          registry.ready(runId, payload.version);
          json(response, 200, registry.snapshot());
        } else json(response, 200, registry.reconcile(runId, payload.version, payload.referenceVersion));
        return;
      }
      if (url.pathname === '/extend' && request.method === 'POST') {
        if (context.pendingEffects() || context.publicJob()?.recovery) throw new CoordinationError('run-not-quiescent');
        json(response, 200, registry.extend(runId, payload)); return;
      }
      if (url.pathname === '/integration' && request.method === 'POST') {
        if (activeContexts().some(([, c]) => c.pendingEffects() || c.publicJob()?.recovery)) throw new CoordinationError('run-not-quiescent');
        if (typeof payload.acquire !== 'boolean') throw new CoordinationError('integration-action-required', 400);
        if (!payload.acquire && typeof payload.published !== 'boolean') throw new CoordinationError('publication-state-required');
        if (!payload.acquire && payload.published) proofReferences(payload);
        if (payload.acquire) registry.integration(runId, payload.version, true);
        // Once the durable barrier is held, no other RUN can acquire a new permission.
        try {
          await checkCohort();
        } catch (cause) {
          if (payload.acquire) registry.cancelAcquisition(runId);
          throw cause;
        }
        if (!payload.acquire && payload.completion !== undefined) {
          const receipt = registry.completeIntegration(runId, payload);
          json(response, 200, { ...registry.snapshot(), completion: receipt }); return;
        }
        if (!payload.acquire) registry.integration(runId, payload.version, false, payload.published);
        json(response, 200, registry.snapshot()); return;
      }
      if (url.pathname === '/release' && request.method === 'POST') {
        if (context.unresolved()) throw new CoordinationError('run-not-quiescent');
        registry.owned(runId, payload.version);
        await checkNative(context.publicJob()?.sessionId || run.sessionId, true);
        const gate = context.publicJob()?.terminalGate;
        if (typeof payload.delivered !== 'boolean' || gate?.status !== 'VALIDATED' ||
            (payload.delivered && gate.declaredState !== 'TERMINÉ')) throw new CoordinationError('release-proof-required');
        // Delivery and archive evidence are reviewed by the orchestrator, never inferred by CAB.
        if (!Array.isArray(payload.evidence) || !payload.evidence.length ||
            !payload.evidence.every((e) => typeof e === 'string' && e.length > 0 && e.length <= 500)) {
          throw new CoordinationError('release-evidence-required');
        }
        const released = registry.release(runId, payload.version, payload.delivered);
        context.close();
        contexts.delete(runId);
        json(response, 200, released); return;
      }
      if (request.method === 'POST' && url.pathname === '/job/arm') {
        if (payload.sessionId !== run.sessionId || payload.directory !== run.directory || payload.changeId !== run.changeId) {
          throw new CoordinationError('job-reservation-divergent');
        }
        await checkNative(payload.sessionId);
      }
      if (request.method === 'POST' && ['/validation/request', '/validation/reminder'].includes(url.pathname)) {
        if (context.publicJob() && !context.publicJob().armed) throw new CoordinationError('job-disarmed');
        const approval = payload.approval;
        if (context.hasUnresolvedValidation() && !context.hasRequest(approval?.requestId)) {
          throw new CoordinationError('run-mandate-already-active');
        }
        if (approval?.run_id !== runId || approval?.change_id !== run.changeId ||
            approval?.directory !== run.directory || !context.sessions().includes(approval.session_id)) {
          throw new CoordinationError('validation-reservation-divergent');
        }
        registry.owned(runId, approval.reservation_version);
        const operationResources = approval.files?.length === 1 && approval.commands?.length === 0
          ? [{ key: 'file:' + approval.files[0], mode: 'write' }] : approval.resources;
        registry.covers(runId, approval.reservation_version, operationResources);
        await checkNative(approval.session_id);
        await verifyNativeValidation(approval);
        if (transitions.has(runId)) throw new CoordinationError('run-transition-in-flight');
        const digest = createHash('sha256').update(JSON.stringify(nativeIdentity(approval))).digest('hex');
        const first = !context.hasRequest(approval.requestId);
        registry.claimRequest(runId, approval.requestId, digest, context.hasRequest(approval.requestId));
        if (first && operationResources.some((r) => r.mode === 'write')) registry.modifying(runId);
      }
      if (request.method === 'POST' && url.pathname.startsWith('/decision/')) {
        if (registry.requestOwners[requestId]?.runId !== runId) throw new CoordinationError('decision-run-divergent');
      }
      if (request.method === 'POST' && url.pathname === '/job/terminal-gate') {
        await checkNative(context.publicJob()?.sessionId || run.sessionId, true);
      }
      if (request.method === 'POST' && url.pathname === '/job/recover' &&
          activeContexts().some(([id, c]) => id !== runId && c.sessions().includes(payload.sessionId))) {
        throw new CoordinationError('recovery-session-already-owned');
      }
    }
    const oldSession = context.publicJob()?.sessionId;
    await context.handle(request, response, url);
    const newSession = context.publicJob()?.sessionId;
    if (runId && oldSession && newSession !== oldSession) registry.transfer(runId, newSession);
  } catch (cause) {
    observeStatistics(() => statistics.httpFailure(observedRun, cause.code));
    observeStatistics(() => statistics.admissionFailure(attemptedReservation, cause.code));
    if (!response.headersSent) json(response, cause.status || 409, { error: cause.code || cause.message });
    else response.destroy();
  } finally { if (transitionRun) transitions.delete(transitionRun); }
});
server.listen(port, host, () => { void consumeEvents(); });

async function consumeEvents() {
  try {
    const response = await fetch(opencodeUrl + '/global/event');
    if (!response.ok || !response.body) throw new Error('SSE unavailable');
    sseState = 'connected';
    nativeGeneration++;
    const generation = ++sseGeneration;
    statistics.connection(true);
    void fetch(opencodeUrl + '/session/status?directory=' + encodeURIComponent(workspace),
      { signal: AbortSignal.timeout(10000) }).then(async (state) => {
      if (!state.ok) throw new Error('native baseline unavailable');
      const baseline = await state.json();
      if (sseState === 'connected' && generation === sseGeneration) {
        observeStatistics(() => statistics.nativeSnapshot(baseline, true));
      }
    }).catch(() => { statistics.error = 'statistics-native-baseline-unavailable'; });
    legacy.onConnect();
    for (const [, context] of activeContexts()) context.onConnect();
    const decoder = new TextDecoder();
    let buffer = '';
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const frames = buffer.split('\n\n');
      buffer = frames.pop() || '';
      if (buffer.length > 1024 * 1024) throw new Error('SSE frame too large');
      for (const frame of frames) {
        const data = frame.match(/^data:\s*(.+)$/m)?.[1];
        if (!data) continue;
        let event;
        try { event = JSON.parse(data); } catch { continue; }
        observeStatistics(() => statistics.nativeEvent(event));
        legacy.onEvent(event);
        const props = event.payload?.properties || event.properties || {};
        const session = props.sessionID || props.sessionId || props.part?.sessionID || props.info?.sessionID || props.info?.id;
        const type = event.payload?.type || event.type;
        if (['session.status', 'session.idle', 'session.updated', 'session.deleted', 'permission.asked', 'permission.replied'].includes(type) &&
            activeContexts().some(([, context]) => context.sessions().includes(session))) nativeGeneration++;
        for (const [, context] of activeContexts()) {
          if (context.sessions().includes(session)) context.onEvent(event);
        }
      }
    }
  } catch { /* Connection state is published below; no event or effect is invented. */ }
  sseState = 'reconnecting';
  nativeGeneration++;
  sseGeneration++;
  statistics.connection(false);
  legacy.onDisconnect();
  for (const [, context] of activeContexts()) context.onDisconnect();
  reconnectTimer = setTimeout(() => { void consumeEvents(); }, reconnectMs);
}
async function shutdown() {
  clearTimeout(reconnectTimer);
  registry.close();
  server.close();
  await statistics.close();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
