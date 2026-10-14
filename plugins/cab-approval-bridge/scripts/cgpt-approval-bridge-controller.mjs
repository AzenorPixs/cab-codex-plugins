import { createHash } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { createJobContext } from './cgpt-approval-bridge-job-context.mjs';
import { CoordinationError, RunRegistry, VERSION } from './cgpt-approval-bridge-runs.mjs';

const version = "1.0.1";
if (version !== VERSION) throw new Error('CAB component version mismatch');

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
const registry = new RunRegistry(workspace, stateDirectory);
await registry.acquireAuthority();
const contexts = new Map();
const transitions = new Set();
let broker = null;
let sseState = 'connecting';
let reconnectTimer;
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
    ownsSession: (session) => context.sessions().includes(session),
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
    : run.referenceVersion !== registry.referenceVersion ? 'reference-reconciliation-required' : null;
  return { ...status, coordination: { reason, integrationReady: run.integrationReady,
    referenceVersion: registry.referenceVersion, reviewedReferenceVersion: run.referenceVersion },
    ...(reason ? { brokerReadiness: { ...status.brokerReadiness, status: 'BLOCKED', ready: false, root_cause: reason } } : {}) };
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
  let transitionRun = null;
  try {
    const url = new URL(request.url, 'http://localhost');
    const payload = request.method === 'POST' ? await readJson(request) : null;
    request.cabPayload = payload;
    registry.assertHealthy();
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
    const context = runId ? contexts.get(runId) : singleContext();
    if (!context) throw new CoordinationError('run-not-found', 404);
    if (match) url.pathname = match[2] || '/status';
    if (runId) {
      const run = registry.runs.get(runId);
      if (!run || run.state !== 'RESERVED') throw new CoordinationError('run-not-reserved');
      if (request.method === 'POST' && transitions.has(runId)) throw new CoordinationError('run-transition-in-flight');
      if (request.method === 'POST' && ['/release', '/ready', '/reconcile', '/integration', '/job/recover', '/job/terminal-gate', '/job/disarm'].includes(url.pathname)) {
        transitions.add(runId);
        transitionRun = runId;
      }
      if (request.method === 'GET' && url.pathname === '/status') { json(response, 200, statusFor(runId, context)); return; }
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
          await Promise.all(activeContexts().map(([, c]) => checkNative(c.publicJob()?.sessionId || run.sessionId, true)));
        } catch (cause) {
          if (payload.acquire) registry.cancelAcquisition(runId);
          throw cause;
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
        legacy.onEvent(event);
        const props = event.payload?.properties || event.properties || {};
        const session = props.sessionID || props.sessionId || props.info?.sessionID || props.info?.id;
        for (const [, context] of activeContexts()) {
          if (context.sessions().includes(session)) context.onEvent(event);
        }
      }
    }
  } catch { /* Connection state is published below; no event or effect is invented. */ }
  sseState = 'reconnecting';
  legacy.onDisconnect();
  for (const [, context] of activeContexts()) context.onDisconnect();
  reconnectTimer = setTimeout(() => { void consumeEvents(); }, reconnectMs);
}
function shutdown() {
  clearTimeout(reconnectTimer);
  registry.close();
  server.close();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
