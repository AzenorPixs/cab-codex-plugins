import { randomUUID } from 'node:crypto';
import { ContinuityStore } from './cgpt-approval-bridge-continuity.mjs';
import { stepDefinition, STEP_STATUSES, VERSION as STEP_VERSION } from './cgpt-approval-bridge-run-steps.mjs';

export const VERSION = '2.2.27';
if (STEP_VERSION !== VERSION) throw new Error('CAB observation lifecycle component version mismatch');
const identifier = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/;

// Only correlation identifiers and closed enums cross this public boundary.
export function publicEvent(type, details = {}) {
  if (typeof type !== 'string' || !/^[a-z][a-z0-9.-]{0,99}$/.test(type)) return null;
  if (type === 'opencode-sse-event') return null;
  const value = { type };
  for (const key of ['runId', 'changeId', 'sessionId', 'jobId', 'requestId', 'approvalId', 'operationId']) {
    if (typeof details[key] === 'string' && identifier.test(details[key])) value[key] = details[key];
  }
  if (['approved', 'rejected', 'needs_clarification'].includes(details.decision)) value.decision = details.decision;
  if (stepDefinition(details.stepId) && STEP_STATUSES.includes(details.stepStatus) &&
      Number.isSafeInteger(details.stepSequence) && details.stepSequence > 0) {
    value.stepId = details.stepId; value.stepStatus = details.stepStatus; value.stepSequence = details.stepSequence;
  }
  if (['PREPARED', 'ISSUING', 'EXECUTING', 'UNKNOWN', 'COMPLETED', 'NO_EFFECT', 'RECONCILED', 'CANCELLED'].includes(details.operationState)) value.operationState = details.operationState;
  return value;
}

export function createObservationJournal({ limit = 500, now = () => Date.now(), path } = {}) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Invalid observation journal limit.');
  let durableStore, persistenceError = null, diagnosticCode = null;
  if (path) {
    try {
      durableStore = new ContinuityStore(path, 'observations', value => value &&
        typeof value.instanceId === 'string' && /^[a-f0-9-]{36}$/.test(value.instanceId) &&
        Number.isFinite(Date.parse(value.startedAt)) && Number.isSafeInteger(value.sequence) && value.sequence >= 0 &&
        Array.isArray(value.events) && value.events.length <= 10000 && value.events.every((event, index, all) =>
          publicEvent(event.type, event) && Number.isFinite(Date.parse(event.at)) &&
          Number.isSafeInteger(event.sequence) && event.sequence > 0 && event.sequence <= value.sequence &&
          (!index || event.sequence === all[index - 1].sequence + 1)));
    } catch (cause) {
      persistenceError = 'observation-state-unavailable';
      diagnosticCode = ['continuity-state-invalid', 'continuity-file-unsafe', 'continuity-directory-unsafe']
        .includes(cause.code) ? cause.code : 'observation-io-unavailable';
    }
  }
  const restored = durableStore?.snapshot();
  const instanceId = restored?.instanceId || randomUUID();
  const startedAt = restored?.startedAt || new Date(now()).toISOString();
  const events = restored?.events.slice(-limit) || [];
  const clients = new Set();
  let sequence = restored?.sequence || 0;
  const durable = () => Boolean(durableStore && !persistenceError);
  function snapshot(cursor) {
    const match = typeof cursor === 'string' ? /^([a-f0-9-]{36}):(\d+)$/.exec(cursor) : null;
    const after = match && Number(match[2]);
    const resumable = Boolean(match && match[1] === instanceId && Number.isSafeInteger(after) && after <= sequence &&
      after >= (events[0]?.sequence ?? sequence + 1) - 1);
    return { version: VERSION, instanceId, startedAt, sequence,
      cursor: instanceId + ':' + sequence, durable: durable(), error: persistenceError, diagnosticCode,
      truncated: sequence > events.length, limit,
      ...(cursor !== undefined ? { replay: resumable ? 'complete' : 'gap' } : {}),
      events: events.filter(event => !resumable || event.sequence > after).map(event => ({ ...event })) };
  }
  function record(type, details) {
    const value = publicEvent(type, details);
    if (!value) return;
    const event = { ...value, sequence: ++sequence, at: new Date(now()).toISOString() };
    events.push(event);
    if (events.length > limit) events.shift();
    if (durableStore && !persistenceError) {
      try { durableStore.write({ instanceId, startedAt, sequence, events }); }
      catch { persistenceError = 'observation-persistence-unavailable'; }
    }
    const frame = 'id: ' + instanceId + ':' + sequence + '\nevent: observation\ndata: ' +
      JSON.stringify({ instanceId, event, durable: durable() }) + '\n\n';
    for (const response of clients) if (!response.write(frame)) response.destroy();
  }
  function stream(request, response) {
    if (clients.size >= 20) { response.writeHead(503).end(); return; }
    response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store',
      'x-content-type-options': 'nosniff' });
    const cursor = request.headers?.['last-event-id'];
    const value = snapshot(cursor);
    response.write('id: ' + value.cursor + '\nevent: snapshot\ndata: ' + JSON.stringify(value) + '\n\n');
    clients.add(response);
    const heartbeat = setInterval(() => { if (!response.write(': heartbeat\n\n')) response.destroy(); }, 15000);
    response.on('close', () => { clients.delete(response); clearInterval(heartbeat); });
  }
  return { record, snapshot, stream };
}
