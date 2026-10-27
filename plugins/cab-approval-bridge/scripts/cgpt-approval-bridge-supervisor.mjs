import { createServer } from 'node:http';
import { isAbsolute, join } from 'node:path';
import { createSupervisorContext, VERSION as CONTEXT_VERSION } from './cgpt-approval-bridge-supervisor-context.mjs';

const version = "1.10.6";
if (CONTEXT_VERSION !== version) throw new Error('CAB supervisor component version mismatch');

const envValue = (key) => process.env[key] || process.env[key.replace('OC_Codex_', 'OC_CGPT_')];
const workspace = envValue('OC_Codex_WORKSPACE');
if (!workspace || !isAbsolute(workspace)) throw new Error('OC_Codex_WORKSPACE doit désigner une racine de projet absolue.');
const host = envValue('OC_Codex_SUPERVISOR_STATUS_HOST') || '127.0.0.1';
if (!['127.0.0.1', '::1'].includes(host)) throw new Error('Loopback requis.');
const port = Number(envValue('OC_Codex_SUPERVISOR_STATUS_PORT') || 8789);
const controllerUrl = (envValue('OC_Codex_CONTROLLER_URL') || 'http://127.0.0.1:8788').replace(/\/+$/, '').replace(/\/status$/, '');
const opencodeUrl = (envValue('OC_Codex_OPENCODE_URL') || 'http://127.0.0.1:4096').replace(/\/$/, '');
const pollInterval = Number(envValue('OC_Codex_SUPERVISOR_POLL_INTERVAL_MS') || 5000);
const reconnectMs = Number(envValue('OC_Codex_RECONNECT_MS') || 1000);
if (!Number.isFinite(pollInterval) || pollInterval < 250) throw new Error('Intervalle de supervision invalide.');
const stateDirectory = join(workspace, '.opencode', 'state', 'cgpt-approval-bridge');
const legacy = createSupervisorContext({ workspace, controllerUrl,
  statePath: envValue('OC_Codex_SUPERVISOR_STATE_PATH') || join(stateDirectory, 'supervisor-state.json') });
const contexts = new Map();
let concurrent = false;
let reconcileInFlight = false;
let publicError = null;
async function reconcileAll() {
  if (reconcileInFlight) return;
  reconcileInFlight = true;
  try {
    const response = await fetch(controllerUrl + '/status', { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('controller-unavailable');
    const status = await response.json();
    concurrent = status.mode === 'concurrent';
    if (!concurrent) { await legacy.reconcile(); return; }
    const active = new Set(Object.keys(status.runs || {}));
    for (const runId of active) {
      if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(runId)) throw new Error('invalid-run-id');
      if (!contexts.has(runId)) contexts.set(runId, createSupervisorContext({ workspace, runId,
        controllerUrl: controllerUrl + '/runs/' + encodeURIComponent(runId),
        statePath: join(stateDirectory, 'runs', runId, 'supervisor-state.json') }));
    }
    for (const runId of contexts.keys()) if (!active.has(runId)) contexts.delete(runId);
    await Promise.all([...contexts.values()].map((context) => context.reconcile()));
    publicError = null;
  } catch {
    publicError = 'controller-reconciliation-failed';
    if (!concurrent) await legacy.reconcile();
  } finally { reconcileInFlight = false; }
}
async function consumeEvents() {
  try {
    const response = await fetch(opencodeUrl + '/global/event');
    if (!response.ok || !response.body) throw new Error('SSE unavailable');
    const decoder = new TextDecoder();
    let buffer = '';
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() || '';
      if (buffer.length > 1024 * 1024) throw new Error('SSE frame too large');
      for (const frame of frames) {
        if (concurrent) await Promise.all([...contexts.values()].map((c) => c.observe(frame)));
        else await legacy.observe(frame);
      }
    }
  } catch {
    await Promise.all((concurrent ? [...contexts.values()] : [legacy]).map((c) => c.disconnected()));
  }
  setTimeout(() => { void consumeEvents(); }, reconnectMs);
}
createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (request.method !== 'GET' || url.pathname !== '/status') { response.writeHead(404).end(); return; }
  const runId = url.searchParams.get('runId');
  let value;
  if (runId) {
    if (!contexts.has(runId)) { response.writeHead(404).end(); return; }
    value = contexts.get(runId).snapshot();
  } else value = concurrent ? { version, mode: 'concurrent', error: publicError,
    runs: Object.fromEntries([...contexts].map(([id, c]) => [id, c.snapshot()])) } : legacy.snapshot();
  response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  response.end(JSON.stringify({ ...value, workspace, pid: process.pid }));
}).listen(port, host, () => {
  void reconcileAll();
  void consumeEvents();
  setInterval(() => { void reconcileAll(); }, pollInterval);
});
