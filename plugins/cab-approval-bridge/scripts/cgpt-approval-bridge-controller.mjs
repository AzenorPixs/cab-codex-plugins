import { createHash, randomUUID } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { createServer } from 'node:http';
import { isAbsolute, join, relative } from 'node:path';
import { createJobContext, commandLengthLimit, checkCommandLength, VERSION as JOB_CONTEXT_VERSION } from './cgpt-approval-bridge-job-context.mjs';
import { CoordinationError, VERSION } from './cgpt-approval-bridge-runs.mjs';
import { ResourceRunRegistry, COORDINATION_PROTOCOL, VERSION as RESOURCE_VERSION } from './cgpt-approval-bridge-resource-coordination.mjs';
import { SessionStatistics, VERSION as STATISTICS_VERSION } from './cgpt-approval-bridge-statistics.mjs';
import { createObservationJournal, VERSION as OBSERVATION_VERSION } from './cgpt-approval-bridge-monitor-events.mjs';
import { StatisticsMaintenance, statisticsDashboard, guardStatisticsPost, VERSION as MAINTENANCE_VERSION } from './cgpt-approval-bridge-statistics-maintenance.mjs';

const version = "1.6.2";
if ([VERSION, STATISTICS_VERSION, JOB_CONTEXT_VERSION, RESOURCE_VERSION, OBSERVATION_VERSION, MAINTENANCE_VERSION].some((value) => value !== version)) throw new Error('CAB component version mismatch');

const envValue = (key) => process.env[key] || process.env[key.replace('OC_Codex_', 'OC_CGPT_')];
const workspaceInput = envValue('OC_Codex_WORKSPACE');
if (!workspaceInput || !workspaceInput.startsWith('/')) throw new Error('OC_Codex_WORKSPACE doit désigner une racine de projet absolue.');
if (envValue('OC_Codex_OUTSIDE_SANDBOX') !== '1') throw new Error('OC_Codex_OUTSIDE_SANDBOX=1 est requis.');
if (!['automatic', 'manual'].includes(envValue('OC_Codex_DECISION_MODE') || 'manual')) {
  throw new Error('OC_Codex_DECISION_MODE doit être automatic ou manual.');
}
const host = envValue('OC_Codex_STATUS_HOST') || '127.0.0.1';
if (!['127.0.0.1', '::1'].includes(host)) throw new Error('OC_Codex_STATUS_HOST doit être une adresse loopback autorisée.');
const maxCommandLength = commandLengthLimit();
const observations = createObservationJournal();
const workspace = realpathSync(workspaceInput);
const stateDirectory = join(workspace, '.opencode', 'state', 'cgpt-approval-bridge');
const port = Number(envValue('OC_Codex_STATUS_PORT') || 8788);
const opencodeUrl = (envValue('OC_Codex_OPENCODE_URL') || 'http://127.0.0.1:4096').replace(/\/$/, '');
const reconnectMs = Number(envValue('OC_Codex_RECONNECT_MS') || 1000);
const statistics = new SessionStatistics(stateDirectory, { project: workspace });
let registryRevision = 0;
let nativeGeneration = 0;
let observedOperations = new Map();
function observeStatistics(callback) {
  try { callback(); } catch { statistics.error = 'statistics-observation-unavailable'; }
}
const registry = new ResourceRunRegistry(workspace, stateDirectory, {
  observe: (snapshot) => {
    registryRevision++;
    observeStatistics(() => statistics.registry(snapshot));
    const current = new Map();
    for (const operation of Object.values(snapshot.coordination?.operations || {}).slice(-500)) {
      current.set(operation.operationId, operation.state);
      if (observedOperations.get(operation.operationId) !== operation.state) {
        observations.record('operation-state-observed', { runId: operation.runId, sessionId: operation.sessionId,
          changeId: snapshot.runs?.find((run) => run.runId === operation.runId)?.changeId,
          operationId: operation.operationId, requestId: operation.requestId, operationState: operation.state });
      }
    }
    observedOperations = current;
  },
});
await registry.acquireAuthority();
statistics.registry(registry.snapshot());
const statisticsMaintenance = new StatisticsMaintenance(statistics, { referenced: () => registry.snapshot().runs });
const contexts = new Map();
const transitions = new Set();
let broker = null;
let sseState = 'connecting';
let reconnectTimer;
let sseGeneration = 0;
const legacy = createJobContext({ workspace, stateDirectory, maxCommandLength,
  observe: (type, details) => observations.record(type, details), admitOperation: (operation, requestId, stage) => {
  try {
    registry.admission();
    if (activeContexts().length) return false;
    if (operation) registry.markLegacyUse(operation);
    return true;
  } catch { return false; }
} });

function json(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  response.end(JSON.stringify(payload));
}
async function readJson(request, maxBytes = 256 * 1024) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBytes) throw new CoordinationError('request-too-large', 413);
  }
  try { return JSON.parse(body || '{}'); }
  catch { throw new CoordinationError('invalid-json', 400); }
}
function contextFor(run) {
  if (contexts.has(run.runId)) return contexts.get(run.runId);
  let context;
  context = createJobContext({
    workspace, stateDirectory: join(stateDirectory, 'runs', run.runId, String(run.contextId || run.version)), run, maxCommandLength,
    observe: (type, details) => {
      observations.record(type, { runId: run.runId, changeId: run.changeId, sessionId: run.sessionId, ...details });
      observeStatistics(() => statistics.observe(run, type, details));
    },
    ownsSession: (session) => context.sessions().includes(session),
    verifyRestoredPreflight: (approval) => {
      try {
        const owner = registry.requestOwners[approval.requestId];
        const digest = createHash('sha256').update(JSON.stringify(nativeIdentity(approval))).digest('hex');
        return owner?.runId === run.runId && owner.digest === digest &&
          registry.covers(run.runId, approval.reservation_version, approval.resources);
      } catch { return false; }
    },
    nativeLifecycle: {
      begin: (operation, requestId, permission) => registry.nativeStart(run.runId, operation, requestId, permission),
      issued: (operation) => registry.nativeIssued(operation.operationId),
      unknown: (operation) => registry.nativeUnknown(operation?.operationId),
    },
    admitOperation: (operation, requestId, stage) => {
      try {
        if (transitions.has(run.runId) || !operation || operation.runId !== run.runId || operation.directory !== workspace ||
            !context.sessions().includes(operation.sessionId)) return false;
        if (broker?.coordination_protocol !== COORDINATION_PROTOCOL) return false;
        if (['STORE_UNHEALTHY', 'JOURNAL_UNHEALTHY', 'JOURNAL_INTEGRITY_FAILURE', 'STORE_JOURNAL_DIVERGENCE']
          .includes(broker?.root_cause)) return false;
        // A candidate session is admitted only by the existing recovery preflight.
        return registry.operationAdmission(run.runId, operation, requestId, stage);
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
  const accesses = registry.accesses(runId);
  const global = registry.resourceState.global;
  const reason = registry.migrationRequired || broker?.coordination_protocol !== COORDINATION_PROTOCOL ? 'coordination-upgrade-required'
    : global && global.state !== 'RELEASED' ? 'global-coordination-suspended'
      : run.suspension ? 'run-' + run.suspension.action.toLowerCase()
        : run.maintenancePreflightRequired ? 'maintenance-preflight-required'
        : accesses.some((a) => a.state === 'WAITING') ? 'resource-conflict'
          : accesses.some((a) => a.state === 'UNKNOWN') ? 'resource-effects-unknown'
            : accesses.some((a) => ['HELD','EXECUTING'].includes(a.state) && registry.restoredAccesses.has(a.accessId))
              ? 'access-reconciliation-required'
              : accesses.some((a) => a.state === 'STALE' && a.version === run.version) ? 'resource-revision-stale' : null;
  return { ...status, hasUnresolvedOperation: context.hasUnresolvedValidation(), coordination: { reason, integrationReady: run.integrationReady,
    referenceVersion: registry.referenceVersion, reviewedReferenceVersion: run.referenceVersion,
    phase: run.phase, protocol: registry.snapshot().coordinationProtocol, global, suspension: run.suspension || null,
    accesses, blockers: accesses.flatMap((a) => a.blockers),
    integrationQueue: [], integrationBlockers: [] },
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
    directory: workspace, sessionId: context.publicJob()?.sessionId || registry.runs.get(runId).sessionId }));
  for (const source of registry.resourceState.legacySources) entries.push({ runId: null, context: null, ...source });
  for (const sessionId of legacy.sessions()) if (!entries.some((entry) => entry.sessionId === sessionId)) {
    entries.push({ runId: null, context: legacy, sessionId, directory: legacy.publicJob()?.directory || workspace });
  }
  const revision = registryRevision;
  const generation = nativeGeneration;
  async function get(path, directory = workspace) {
    try {
      const response = await fetch(opencodeUrl + path + '?directory=' + encodeURIComponent(directory),
        { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('unavailable');
      return await response.json();
    } catch { throw new CoordinationError('native-reconciliation-unavailable'); }
  }
  const directories = [...new Set([workspace, ...entries.map((entry) => entry.directory)])];
  const [observations, sessions] = await Promise.all([
    Promise.all(directories.map(async (directory) => ({ directory, busy: await get('/session/status', directory),
      permissions: await get('/permission', directory) }))),
    Promise.all(entries.map((entry) => get('/session/' + encodeURIComponent(entry.sessionId), entry.directory))),
  ]);
  if (observations.some(({busy, permissions}) => !busy || typeof busy !== 'object' || Array.isArray(busy) || !Array.isArray(permissions) ||
      Object.values(busy).some((state) => !state || !['idle', 'busy', 'retry'].includes(state.type)) ||
      permissions.some((permission) => !permission || typeof permission.sessionID !== 'string' || typeof permission.id !== 'string'))) {
    throw new CoordinationError('native-reconciliation-invalid');
  }
  const blockers = [];
  entries.forEach((entry, index) => {
    const session = sessions[index];
    const {busy, permissions} = observations.find((observation) => observation.directory === entry.directory);
    if (session?.id !== entry.sessionId || session.directory !== entry.directory) throw new CoordinationError('native-session-divergent');
    if (entry.context && !entry.context.sessions().includes(entry.sessionId)) throw new CoordinationError('native-observation-changed');
    if (busy[entry.sessionId] && busy[entry.sessionId].type !== 'idle') {
      blockers.push({ runId: entry.runId, sessionId: entry.sessionId, reason: 'native-session-busy' });
    }
    const count = permissions.filter((permission) => permission.sessionID === entry.sessionId).length;
    if (count) blockers.push({ runId: entry.runId, sessionId: entry.sessionId, reason: 'native-permissions-unresolved', count });
  });
  if (registryRevision !== revision || nativeGeneration !== generation) throw new CoordinationError('native-observation-changed');
  observeStatistics(() => statistics.nativeSnapshot(observations.find((o) => o.directory === workspace).busy));
  return blockers;
}
async function checkCohort() {
  const blockers = await nativeCohort();
  if (legacy.pendingEffects() || activeContexts().some(([, context]) => context.pendingEffects() || context.publicJob()?.recovery)) {
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
    'session_id', 'directory', 'title', 'summary', 'files', 'commands', 'resources',
    'coordination_protocol', 'operation_id', 'operation_digest', 'expected_revisions', 'access_id']
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
function nativePartProof(operation, part, sessionId) {
  if (!operation.native || operation.sessionId !== sessionId || part?.type !== 'tool' ||
      !['completed', 'error'].includes(part.state?.status)) return null;
  const state = part.state;
  const callId = part.callID || part.callId || null;
  if (operation.native.callId && operation.native.callId !== callId) return null;
  let kind;
  let target;
  if (part.tool === 'bash') { kind = 'bash'; target = state.input?.command; }
  else if (['edit', 'write', 'apply_patch'].includes(part.tool)) {
    kind = 'edit'; target = state.input?.filePath || state.input?.filepath || state.input?.path;
    if (part.tool === 'apply_patch') {
      const patch = state.input?.patchText || state.input?.patch;
      if (typeof patch !== 'string' || /^\*\*\* Move to:/m.test(patch)) return null;
      const paths = [...new Set([...patch.matchAll(/^\*\*\* (?:Add|Update|Delete) File: ([^\r\n]+)$/gm)].map((m) => m[1]))];
      if (paths.length !== 1) return null;
      target = paths[0];
    }
    if (typeof target === 'string' && isAbsolute(target)) target = relative(workspace, target);
  } else return null;
  if (typeof target !== 'string' || createHash('sha256').update(JSON.stringify([kind, target])).digest('hex') !==
      operation.native.targetDigest || !Number.isFinite(state.time?.start) || !Number.isFinite(state.time?.end) ||
      state.time.end < operation.native.startedAt || state.time.end < state.time.start ||
      (!operation.native.callId && state.time.start < Date.parse(operation.preparedAt))) return null;
  return { sessionId, permissionId: operation.native.permissionId, callId,
    finishedAt: state.time.end, status: state.status,
    exit: Number.isInteger(state.metadata?.exit) ? state.metadata.exit : null };
}
function observeNativeCompletion(runId, part, sessionId) {
  for (const operation of Object.values(registry.resourceState.operations)) {
    if (operation.runId !== runId || !['ISSUING', 'EXECUTING', 'UNKNOWN'].includes(operation.state)) continue;
    const proof = nativePartProof(operation, part, sessionId);
    if (proof) registry.completeNative(runId, operation.operationId, proof);
  }
}
async function proveNativeCompletions(runId, access) {
  const pending = access.operationIds.map((id) => registry.resourceState.operations[id])
    .filter((op) => ['ISSUING', 'EXECUTING', 'UNKNOWN'].includes(op.state));
  if (!pending.length) return;
  const sessionId = pending[0].sessionId;
  const response = await fetch(opencodeUrl + '/session/' + encodeURIComponent(sessionId) +
    '/message?directory=' + encodeURIComponent(workspace), { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new CoordinationError('native-completion-unavailable');
  const messages = await response.json();
  if (!Array.isArray(messages)) throw new CoordinationError('native-completion-invalid');
  for (const op of pending) {
    const proof = messages.flatMap((message) => Array.isArray(message.parts) ? message.parts : [])
      .map((part) => nativePartProof(op, part, op.sessionId)).find(Boolean);
    if (!proof) throw new CoordinationError('native-completion-not-proved');
    registry.completeNative(runId, op.operationId, proof);
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
    const maintenanceRoute = ['/statistics/retention/preview', '/statistics/retention/purge'].includes(url.pathname);
    if (maintenanceRoute) {
      if (request.method !== 'POST') { response.writeHead(405, { allow: 'POST' }).end(); return; }
      guardStatisticsPost(request, url, server.address().port);
      request.setTimeout(5000, () => request.destroy());
    }
    if (request.method === 'GET' && url.pathname === '/monitor/events') {
      if (request.headers.accept === 'text/event-stream') observations.stream(request, response);
      else json(response, 200, observations.snapshot());
      return;
    }
    const payload = request.method === 'POST' ? await readJson(request,
      url.pathname === '/statistics/import' ? 64 * 1024 * 1024 : maintenanceRoute ? 4096 : 256 * 1024) : null;
    if (['/validation/resource-request','/validation/resource-reminder'].includes(url.pathname)) {
      if (!payload?.approval?.run_id || payload.approval.coordination_protocol !== COORDINATION_PROTOCOL) {
        throw new CoordinationError('coordination-upgrade-required');
      }
      url.pathname = url.pathname === '/validation/resource-request' ? '/validation/request' : '/validation/reminder';
    }
    request.cabPayload = payload;
    if (request.method === 'POST' && /^(?:\/runs\/[A-Za-z0-9][A-Za-z0-9_.-]{0,99})?\/validation\/(request|reminder)$/.test(url.pathname)) {
      checkCommandLength(payload?.approval, maxCommandLength);
    }
    registry.assertHealthy();
    if (maintenanceRoute) {
      const result = url.pathname.endsWith('/preview') ? statisticsMaintenance.preview(payload) : await statisticsMaintenance.purge(payload);
      json(response, 200, result); return;
    }
    if (request.method === 'GET' && url.pathname === '/statistics/dashboard') {
      json(response, 200, statisticsDashboard(statistics, url.searchParams)); return;
    }
    if (request.method === 'POST' && url.pathname === '/statistics/import') {
      if (!payload || Object.keys(payload).length !== 1 || !payload.bundle) throw new CoordinationError('observation-import-invalid', 400);
      json(response, 200, await statistics.observations.import(payload.bundle)); return;
    }
    const observationMatch = url.pathname.match(/^\/runs\/([A-Za-z0-9][A-Za-z0-9_.-]{0,99})\/statistics\/view$/);
    if (request.method === 'GET' && (url.pathname === '/statistics/view' || observationMatch)) {
      const selection = url.searchParams.get('selection') || 'current';
      const runId = observationMatch?.[1] || url.searchParams.get('runId') || undefined;
      const contextId = url.searchParams.has('contextId') ? Number(url.searchParams.get('contextId')) : undefined;
      statistics.advance();
      if (url.searchParams.get('format') === 'markdown') {
        response.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'no-store' });
        response.end(statistics.observations.markdown(selection, runId, contextId));
      } else json(response, 200, statistics.observations.view(selection, runId, contextId));
      return;
    }
    if (url.pathname === '/coordination/global' && request.method === 'GET') {
      json(response, 200, { protocol: registry.snapshot().coordinationProtocol,
        global: registry.resourceState.global, blockers: localIntegrationBlockers(),
        accesses: registry.accesses().filter((a) => ['HELD', 'EXECUTING', 'UNKNOWN'].includes(a.state)) }); return;
    }
    if (request.method === 'POST' && url.pathname.startsWith('/coordination/')) {
      if (url.pathname === '/coordination/global/request') {
        json(response, 202, registry.requestGlobal(payload)); return;
      }
      if (['/coordination/global/confirm', '/coordination/global/release', '/coordination/migrate', '/coordination/rollback', '/coordination/legacy/reconcile'].includes(url.pathname)) {
        proofReferences(payload);
        await checkCohort();
        if (url.pathname.endsWith('/confirm')) json(response, 200, registry.confirmGlobal(payload));
        else if (url.pathname.endsWith('/release')) json(response, 200, registry.releaseGlobal(payload));
        else if (url.pathname === '/coordination/legacy/reconcile') {
          if (legacy.publicJob()?.armed) throw new CoordinationError('legacy-job-active');
          json(response, 200, registry.reconcileLegacy(payload));
        } else if (url.pathname.endsWith('/rollback')) json(response, 200, registry.rollbackMigration(payload));
        else json(response, 200, registry.migrate({ ...payload, quiescent: true }));
        return;
      }
      throw new CoordinationError('coordination-route-not-found', 404);
    }
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
      json(response, 200, { version: VERSION, mode: 'concurrent',
        configuration: { maxCommandLength, commandLengthUnit: 'UTF-16' }, coordinationProtocol: registry.snapshot().coordinationProtocol,
        globalCoordination: registry.resourceState.global, opencodeSse: sseState,
        brokerReadiness: broker, brokerReadinessReceivedAt: legacy.publicStatus().brokerReadinessReceivedAt, activeRunCount: entries.length,
        runs: Object.fromEntries(entries.map(([id, c]) => [id, statusFor(id, c)])),
        activeValidationCount: entries.reduce((n, [, c]) => n + c.publicStatus().activeValidationCount, 0),
        job: entries.length === 1 ? entries[0][1].publicJob() : null });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/runs/reserve') {
      attemptedReservation = payload;
      if (legacy.publicJob()?.armed || legacy.pendingEffects()) throw new CoordinationError('legacy-job-active');
      await checkNative(payload.sessionId);
      if (legacy.publicJob()?.armed || legacy.pendingEffects()) throw new CoordinationError('legacy-job-active');
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
      if (!registry.migrationRequired && ['STORE_UNHEALTHY', 'JOURNAL_UNHEALTHY', 'JOURNAL_INTEGRITY_FAILURE', 'STORE_JOURNAL_DIVERGENCE']
        .includes(payload.root_cause) && (!registry.resourceState.global || registry.resourceState.global.state === 'RELEASED')) {
        registry.requestGlobal({ cause: 'GLOBAL_RECONCILIATION', scope: 'all',
          transactionId: 'integrity-' + randomUUID(), authorization: 'technical-integrity-protection',
          evidence: [payload.root_cause] });
      }
      await publishTo(legacy, payload);
      for (const [runId, context] of activeContexts()) await publishTo(context, scopedReadiness(runId, payload));
      json(response, 202, { accepted: true, status: payload.status }); return;
    }
    const match = url.pathname.match(/^\/runs\/([A-Za-z0-9][A-Za-z0-9_.-]{0,99})(\/.*)?$/);
    let runId = match?.[1] || payload?.approval?.run_id || url.searchParams.get('runId');
    const requestId = url.pathname.match(/\/decision\/([^/]+)$/)?.[1];
    if (!runId && requestId && registry.requestOwners[requestId]) runId = registry.requestOwners[requestId].runId;
    if (match?.[2] === '/integration' && request.method === 'POST' && payload?.completion !== undefined) {
      throw new CoordinationError('coordination-upgrade-required');
    }
    if (match?.[2] === '/publish' && request.method === 'POST' &&
        Object.hasOwn(registry.resourceState.publications, payload?.transactionId)) {
      json(response, 200, registry.publish(runId, payload)); return;
    }
    if (match?.[2] === '/locks/release' && request.method === 'POST' &&
        registry.resourceState.accesses[payload?.operationId]?.state === 'RELEASED') {
      json(response, 200, registry.releaseAccess(runId, payload)); return;
    }
    const context = runId ? contexts.get(runId) : singleContext();
    if (!context) throw new CoordinationError('run-not-found', 404);
    if (match) url.pathname = match[2] || '/status';
    if (runId) {
      const run = registry.runs.get(runId);
      if (!run || run.state !== 'RESERVED') throw new CoordinationError('run-not-reserved');
      observedRun = run;
      if (request.method === 'POST' && transitions.has(runId)) throw new CoordinationError('run-transition-in-flight');
      if (request.method === 'POST' && ['/release', '/ready', '/reconcile', '/integration', '/integration-request', '/resources', '/closing', '/job/recover', '/job/terminal-gate', '/job/disarm', '/locks/acquire', '/locks/release', '/locks/cancel', '/locks/attach', '/locks/reconcile', '/publish', '/suspend'].includes(url.pathname)) {
        transitions.add(runId);
        transitionRun = runId;
      }
      if (request.method === 'GET' && url.pathname === '/status') { json(response, 200, statusFor(runId, context)); return; }
      if (request.method === 'GET' && url.pathname === '/locks') {
        json(response, 200, { runId, protocol: COORDINATION_PROTOCOL, accesses: registry.accesses(runId),
          revisions: registry.revisions(run.resources) }); return;
      }
      if (request.method === 'POST' && ['/integration', '/integration-request'].includes(url.pathname)) {
        throw new CoordinationError('coordination-upgrade-required');
      }
      if (request.method === 'POST' && url.pathname === '/locks/acquire') {
        const operationIds = payload.operationIds || (registry.resourceState.operations[payload.operationId] ? [payload.operationId] : []);
        if (!Array.isArray(operationIds) || operationIds.some((id) =>
          context.decision(registry.resourceState.operations[id]?.requestId)?.decision !== 'approved')) {
          throw new CoordinationError('access-operation-not-approved');
        }
        const access = registry.acquireAccess(runId, payload);
        json(response, access.state === 'WAITING' ? 202 : 200, access); return;
      }
      if (request.method === 'POST' && url.pathname === '/locks/attach') {
        if (!Array.isArray(payload.operationIds) || payload.operationIds.some((id) =>
          context.decision(registry.resourceState.operations[id]?.requestId)?.decision !== 'approved')) {
          throw new CoordinationError('access-operation-not-approved');
        }
        json(response, 200, registry.attachOperations(runId, payload)); return;
      }
      if (request.method === 'POST' && url.pathname === '/locks/reconcile') {
        const access = registry.held(runId, payload);
        await proveNativeCompletions(runId, access);
        await checkNative(registry.resourceState.operations[access.operationIds[0]]?.sessionId || run.sessionId, true);
        const result = registry.reconcileAccess(runId, payload);
        for (const id of access.operationIds) if (registry.resourceState.operations[id].state === 'CANCELLED') {
          context.invalidateOperation(registry.resourceState.operations[id].requestId);
        }
        json(response, 200, result); return;
      }
      if (request.method === 'POST' && ['/locks/release', '/publish'].includes(url.pathname)) {
        const receipt = url.pathname === '/publish' ? registry.resourceState.publications[payload.transactionId] : null;
        if (receipt) { json(response, 200, registry.publish(runId, payload)); return; }
        const access = registry.held(runId, payload);
        if (context.publicJob()?.currentCabMandate || (url.pathname === '/publish' &&
            (context.publicJob()?.recovery || context.publicStatus().undecidedValidationCount))) {
          throw new CoordinationError('run-not-quiescent');
        }
        await proveNativeCompletions(runId, access);
        await checkNative(registry.resourceState.operations[access.operationIds[0]]?.sessionId ||
          context.publicJob()?.sessionId || run.sessionId, true);
        const result = url.pathname === '/publish' ? registry.publish(runId, payload) : registry.releaseAccess(runId, payload);
        for (const id of access.operationIds) context.invalidateOperation(registry.resourceState.operations[id].requestId);
        json(response, 200, result); return;
      }
      if (request.method === 'POST' && url.pathname === '/locks/cancel') {
        const result = registry.cancelAccess(runId, payload);
        for (const id of result.operationIds) context.invalidateOperation(registry.resourceState.operations[id].requestId);
        json(response, 200, result); return;
      }
      if (request.method === 'POST' && url.pathname === '/suspend') {
        json(response, 200, registry.suspend(runId, payload)); return;
      }
      if (request.method === 'GET' && url.pathname === '/integration-status') {
        json(response, 200, { runId, referenceVersion: registry.referenceVersion,
          protocol: COORDINATION_PROTOCOL, integrationOwner: null, integrationQueue: [],
          blockers: registry.accesses(runId).flatMap((a) => a.blockers),
          observedAt: new Date().toISOString() }); return;
      }
      if (request.method === 'POST' && ['/resources', '/closing'].includes(url.pathname)) {
        if (context.pendingEffects() || context.publicJob()?.recovery) throw new CoordinationError('run-not-quiescent');
        registry.owned(runId, payload.version);
        proofReferences(payload);
        await checkNative(context.publicJob()?.sessionId || run.sessionId, true);
        if (url.pathname === '/resources') json(response, 200, registry.reduce(runId, payload));
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
        } else {
          const reconciled = registry.reconcile(runId, payload.version, payload.expectedRevisions, payload.evidence);
          observeStatistics(() => statistics.observe(run, 'resource-reconciliation-completed',
            { durationMs: Date.now() - request.cabReceivedAt }));
          json(response, 200, reconciled);
        }
        return;
      }
      if (url.pathname === '/extend' && request.method === 'POST') {
        if (context.pendingEffects() || context.publicJob()?.recovery) throw new CoordinationError('run-not-quiescent');
        json(response, 200, registry.extend(runId, payload)); return;
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
        if (broker?.coordination_protocol !== COORDINATION_PROTOCOL) throw new CoordinationError('coordination-upgrade-required');
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
        const operationResources = approval.resources;
        if (approval.files?.length === 1 && approval.commands?.length === 0 &&
            !operationResources?.some((r) => r.mode === 'write' &&
              (r.key === 'file:' + approval.files[0] || ('file:' + approval.files[0]).startsWith(r.key + '/')))) {
          throw new CoordinationError('operation-outside-reservation');
        }
        registry.scope(runId, approval.reservation_version, operationResources);
        await checkNative(approval.session_id);
        await verifyNativeValidation(approval);
        if (transitions.has(runId)) throw new CoordinationError('run-transition-in-flight');
        const recovery = context.publicJob()?.recovery;
        registry.prepareOperation(runId, approval, { candidateSession: recovery?.preflightRequestId === approval.requestId ? recovery.sessionId : null });
        const digest = createHash('sha256').update(JSON.stringify(nativeIdentity(approval))).digest('hex');
        const first = !context.hasRequest(approval.requestId);
        registry.claimRequest(runId, approval.requestId, digest, context.hasRequest(approval.requestId));
        if (first && operationResources.some((r) => r.mode === 'write')) registry.modifying(runId);
      }
      if (request.method === 'POST' && url.pathname.startsWith('/decision/')) {
        if (registry.requestOwners[requestId]?.runId !== runId) throw new CoordinationError('decision-run-divergent');
      }
      if (request.method === 'POST' && url.pathname === '/job/terminal-gate') {
        if (registry.unresolvedAccess(runId)) throw new CoordinationError('run-accesses-unresolved');
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
    if (!response.headersSent) json(response, cause.status || 409,
      cause.code === 'command-too-long' ? cause.diagnostic : { error: cause.code || cause.message });
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
            (legacy.sessions().includes(session) || registry.resourceState.legacySources.some((source) => source.sessionId === session) ||
              activeContexts().some(([, context]) => context.sessions().includes(session)))) nativeGeneration++;
        for (const [, context] of activeContexts()) {
          if (context.sessions().includes(session)) context.onEvent(event);
        }
        if (props.part) for (const [runId, context] of activeContexts()) {
          if (context.sessions().includes(session)) observeNativeCompletion(runId, props.part, session);
        }
      }
    }
  } catch { /* Connection state is published below; no event or effect is invented. */ }
  sseState = 'reconnecting';
  nativeGeneration++;
  sseGeneration++;
  statistics.connection(false);
  for (const operation of Object.values(registry.resourceState.operations)) registry.nativeUnknown(operation.operationId);
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
