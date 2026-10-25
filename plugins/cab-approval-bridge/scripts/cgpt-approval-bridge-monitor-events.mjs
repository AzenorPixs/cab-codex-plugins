import { randomUUID } from 'node:crypto';
import { stepDefinition, STEP_STATUSES, VERSION as STEP_VERSION } from './cgpt-approval-bridge-run-steps.mjs';

export const VERSION = '1.10.0';
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

export function createObservationJournal({ limit = 500, now = () => Date.now() } = {}) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Invalid observation journal limit.');
  const instanceId = randomUUID();
  const startedAt = new Date(now()).toISOString();
  const events = [];
  const clients = new Set();
  let sequence = 0;
  const snapshot = () => ({ version: VERSION, instanceId, startedAt, sequence,
    truncated: sequence > events.length, limit, events: events.map((event) => ({ ...event })) });
  function record(type, details) {
    const value = publicEvent(type, details);
    if (!value) return;
    const event = { ...value, sequence: ++sequence, at: new Date(now()).toISOString() };
    events.push(event);
    if (events.length > limit) events.shift();
    const frame = 'event: observation\ndata: ' + JSON.stringify({ instanceId, event }) + '\n\n';
    for (const response of clients) if (!response.write(frame)) response.destroy();
  }
  function stream(request, response) {
    if (clients.size >= 20) { response.writeHead(503).end(); return; }
    response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store',
      'x-content-type-options': 'nosniff' });
    response.write('event: snapshot\ndata: ' + JSON.stringify(snapshot()) + '\n\n');
    clients.add(response);
    const heartbeat = setInterval(() => { if (!response.write(': heartbeat\n\n')) response.destroy(); }, 15000);
    response.on('close', () => { clients.delete(response); clearInterval(heartbeat); });
  }
  return { record, snapshot, stream };
}
