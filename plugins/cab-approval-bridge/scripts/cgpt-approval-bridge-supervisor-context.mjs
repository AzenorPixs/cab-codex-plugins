import { readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { validCodingModel, VERSION as MODEL_VERSION } from './cgpt-approval-bridge-model-policy.mjs';
import { createOpenCodeV2ClientFromEnv, normalizeOpenCodeEvent } from './cgpt-approval-bridge-opencode-client.mjs';

export const VERSION = "2.1.16";
if (MODEL_VERSION !== VERSION) throw new Error('CAB model policy component version mismatch');

export function createSupervisorContext({ workspace, controllerUrl, statePath, runId = null }) {
let closed = false;
const transportAbort = new AbortController();
function envValue(name) {
  return process.env[name] || process.env[name.replace("OC_Codex_", "OC_CGPT_")];
}

const version = "2.1.16";

const statusHost = envValue("OC_Codex_SUPERVISOR_STATUS_HOST") || "127.0.0.1";
const statusPort = Number(envValue("OC_Codex_SUPERVISOR_STATUS_PORT") || "8789");
const resumeDelayMs = Number(envValue("OC_Codex_SUPERVISOR_RESUME_DELAY_MS") || "60000");
const pollIntervalMs = Number(envValue("OC_Codex_SUPERVISOR_POLL_INTERVAL_MS") || "5000");
const reconnectMs = Number(envValue("OC_Codex_RECONNECT_MS") || "1000");
const allowedStatusHosts = new Set(["127.0.0.1", "::1"]);

if (!workspace || !isAbsolute(workspace)) {
  throw new Error("OC_Codex_WORKSPACE doit désigner une racine de projet absolue.");
}

if (!allowedStatusHosts.has(statusHost)) {
  throw new Error("OC_Codex_SUPERVISOR_STATUS_HOST doit être une adresse loopback autorisée.");
}

if (!Number.isFinite(resumeDelayMs) || resumeDelayMs < 1000) {
  throw new Error("OC_Codex_SUPERVISOR_RESUME_DELAY_MS doit être supérieur ou égal à 1000.");
}

if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < 250) {
  throw new Error("OC_Codex_SUPERVISOR_POLL_INTERVAL_MS doit être supérieur ou égal à 250.");
}

const state = {
  version,
  startedAt: new Date().toISOString(),
  state: "UNARMED",
  reason: "job-unarmed",
  lastActivityAt: null,
  lastReconciliationAt: null,
  lastProvenMilestone: null,
  terminalGate: null,
  resumeAttemptCount: 0,
  lastResumeAttempt: null,
  resumeInFlight: false,
};
let statePersistence = Promise.resolve();
let supervisedJob = null;

try {
  const persisted = JSON.parse(readFileSync(statePath, "utf8"));
  Object.assign(state, persisted, {
    version,
    startedAt: new Date().toISOString(),
    resumeInFlight: false,
    resumeAttemptCount: Number.isSafeInteger(persisted.resumeAttemptCount) && persisted.resumeAttemptCount >= 0
      ? persisted.resumeAttemptCount : null,
  });
} catch {
  // L'absence d'état persistant est l'état initial normal.
}

function persistState() {
  const snapshot = JSON.stringify(state, null, 2);

  statePersistence = statePersistence.catch(() => {}).then(async () => {
    await mkdir(dirname(statePath), { recursive: true });
    const temporaryPath = `${statePath}.tmp`;
    await writeFile(temporaryPath, snapshot, "utf8");
    await rename(temporaryPath, statePath);
  });

  return statePersistence;
}

function updateState(nextState, reason, details = {}) {
  state.state = nextState;
  state.reason = reason;
  Object.assign(state, details);
  return persistState();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.any([transportAbort.signal, AbortSignal.timeout(10_000)]),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} pour ${url}.`);
  }

  return response.json();
}

function resumeAllowed(status, job) {
  if (job?.codingModel !== undefined && !validCodingModel(job.codingModel)) return 'model-selection-invalid';
  if (runId && status.coordination?.reason) return status.coordination.reason;
  if (runId && (status.hasUnresolvedOperation || status.coordination?.accesses?.some((a) =>
    ['WAITING', 'HELD', 'EXECUTING', 'UNKNOWN'].includes(a.state)))) return 'resource-access-active';
  if (runId && (job?.currentCabMandate || status.unmatchedNativePermissionCount)) return "native-effect-unresolved";
  if (!job || !job.armed) return "job-unarmed";
  if (job.recovery) return "session-recovery-pending";
  if (job.terminalGate?.status === "VALIDATED") return "terminal-gate-validated";
  if (status.opencodeSse !== "connected") return "opencode-sse-unavailable";
  if (!status.brokerReadiness) return "broker-readiness-missing";
  if (!['READY', 'DEGRADED'].includes(status.brokerReadiness.status)) return "broker-not-resumable";
  if (Number(status.brokerReadiness.pending_count || 0) > 0) return "pending-validations";
  if (Number(status.activeValidationCount || 0) > 0) return "active-validations";
  if (runId) return "orchestrator-mandate-required";
  return null;
}

function resumeMessage(job) {
  return [
    "REPRISE_CAB_SUPERVISEUR",
    "Ce message technique ne crée aucun mandat ni permission. Respecte les outils interdits et attends l’orchestrateur si aucun mandat explicite n’autorise la suite.",
    `job_id: ${job.jobId}`,
    `change_id: ${job.changeId || "non-déclaré"}`,
    `dernier_jalon_prouvé: ${job.lastProvenMilestone || "non-déclaré"}`,
    "Le gate terminal CAB est OPEN. Examine l'état de la session, le flux SSE et CAB, puis reprends le premier jalon non prouvé.",
    "Ne produis pas de réponse finale et ne déclares pas le job terminal tant que le gate terminal n'est pas VALIDATED.",
  ].join("\n");
}

function inactivityAgeMs() {
  const lastActivity = Date.parse(state.lastActivityAt || "");
  return Number.isFinite(lastActivity) ? Date.now() - lastActivity : resumeDelayMs;
}

function selectSupervisedJob(job) {
  supervisedJob = job?.armed
    ? { jobId: job.jobId, sessionId: job.sessionId, directory: job.directory }
    : null;
  if (state.jobId !== (supervisedJob?.jobId || null) ||
      state.directory !== (supervisedJob?.directory || null)) {
    state.resumeAttemptCount = supervisedJob ? 0 : null;
  }
  if (state.jobId !== (supervisedJob?.jobId || null) ||
      state.sessionId !== (supervisedJob?.sessionId || null) ||
      state.directory !== (supervisedJob?.directory || null)) {
    Object.assign(state, {
      jobId: supervisedJob?.jobId || null,
      sessionId: supervisedJob?.sessionId || null,
      directory: supervisedJob?.directory || null,
      lastActivityAt: null,
    });
  }
  state.lastProvenMilestone = supervisedJob ? job.lastProvenMilestone ?? null : null;
  state.terminalGate = supervisedJob && job.terminalGate ? { ...job.terminalGate } : null;
}

function observeSessionEvent(frame) {
  const data = frame.split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart()).join("\n");
  if (!data) return null;
  let envelope;
  try {
    envelope = JSON.parse(data);
  } catch (cause) {
    if (!(cause instanceof SyntaxError)) throw cause;
    state.lastEventError = "invalid-sse-json";
    return "invalid-event";
  }
  const event = normalizeOpenCodeEvent(envelope);
  if (!supervisedJob || typeof event?.type !== "string" ||
      !/^(session|message|permission)\./.test(event.type)) return null;
  const properties = event.properties;
  const sessionId = properties?.sessionID || properties?.info?.sessionID ||
    properties?.part?.sessionID ||
    (event.type.startsWith("session.") ? properties?.info?.id : null);
  const directories = [envelope?.directory, event.directory,
    properties?.directory, properties?.info?.directory];
  if (sessionId !== supervisedJob.sessionId ||
      directories.some((directory) => directory !== undefined && directory !== supervisedJob.directory)) {
    return null;
  }
  state.lastActivityAt = new Date().toISOString();
  state.lastEventError = null;
  return "session-activity";
}

async function reconcile() {
  try {
    const [status, job] = await Promise.all([
      fetchJson(`${controllerUrl}/status`),
      fetchJson(`${controllerUrl}/job`),
    ]);

    if (closed) return;
    selectSupervisedJob(job);
    state.lastReconciliationAt = new Date().toISOString();
    const denial = resumeAllowed(status, job);

    if (denial) {
      await updateState(
        denial === "terminal-gate-validated" ? "TERMINAL" : "WAITING",
        denial
      );
      return;
    }

    if (state.resumeInFlight) {
      await updateState("WAITING", "resume-in-flight");
      return;
    }

    if (inactivityAgeMs() < resumeDelayMs) {
      await updateState("WATCHING", "session-active");
      return;
    }

    const openCode = createOpenCodeV2ClientFromEnv({ directory: job?.directory || workspace, signal: transportAbort.signal });
    if (runId) {
      const busy = await openCode.activeSessions();
      if (!busy || typeof busy !== "object" || Array.isArray(busy) ||
          (busy[job.sessionId] && busy[job.sessionId].type !== "idle")) {
        await updateState("WAITING", "session-not-idle");
        return;
      }
    }
    const session = await openCode.session(job.sessionId, job?.directory || workspace);

    if (!session || typeof session !== "object" || (runId &&
        (session.id !== job.sessionId || session.directory !== job.directory))) {
      await updateState("WAITING", "session-unavailable");
      return;
    }

    if (closed) return;
    state.resumeInFlight = true;
    state.lastResumeAttempt = {
      at: new Date().toISOString(),
      result: "pending",
      sessionId: job.sessionId,
    };
    const previousCount = state.resumeAttemptCount;
    if (previousCount !== null) state.resumeAttemptCount += 1;
    try {
      await persistState();
    } catch {
      state.resumeAttemptCount = previousCount;
      state.resumeInFlight = false;
      state.state = "WAITING";
      state.reason = "resume-persistence-failed";
      state.lastResumeAttempt.result = "failed";
      state.lastResumeAttempt.reason = "state-persistence-failed";
      return;
    }

    const latestStatus = await fetchJson(`${controllerUrl}/status`);
    const latestJob = await fetchJson(`${controllerUrl}/job`);
    if (closed) return;
    const changed = latestJob?.jobId !== job.jobId || latestJob?.sessionId !== job.sessionId ||
      JSON.stringify(latestJob?.codingModel) !== JSON.stringify(job.codingModel);
    const latestDenial = resumeAllowed(latestStatus, latestJob);
    if (changed || latestDenial) {
      state.resumeInFlight = false;
      state.lastResumeAttempt.result = 'cancelled';
      await updateState('WAITING', changed ? 'job-changed-before-resume' : latestDenial);
      return;
    }
    await openCode.prompt(job.sessionId, resumeMessage(job), {
      directory: job?.directory || workspace,
      ...(job.codingModel ? { model: { ...job.codingModel, reasoning: job.codingModel.reasoning } } : {}),
    });

    state.resumeInFlight = false;
    state.lastActivityAt = new Date().toISOString();
    state.lastResumeAttempt.result = "sent";
    await updateState("WATCHING", "resume-sent");
  } catch (cause) {
    if (closed) return;
    state.resumeInFlight = false;
    state.lastResumeAttempt = {
      at: new Date().toISOString(),
      result: "failed",
      reason: cause.message,
    };
    await updateState("WAITING", "reconciliation-failed");
  }
}


let reconciling = false;
return {
  snapshot: () => ({ ...state, ...(runId ? { runId } : {}) }),
  reconcile: async () => {
    if (closed || reconciling) return;
    reconciling = true;
    try { await reconcile(); } finally { reconciling = false; }
  },
  observe: async (frame) => { if (!closed && observeSessionEvent(frame)) await persistState(); },
  disconnected: () => closed ? Promise.resolve() : updateState("WAITING", "opencode-sse-reconnecting"),
  close: async () => { closed = true; transportAbort.abort(); await statePersistence; },
};
}
