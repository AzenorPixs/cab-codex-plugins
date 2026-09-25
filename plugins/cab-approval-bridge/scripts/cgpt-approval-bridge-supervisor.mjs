import { readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, isAbsolute, join } from "node:path";

function envValue(name) {
  return process.env[name] || process.env[name.replace("OC_Codex_", "OC_CGPT_")];
}

const version = "0.85.0";
const workspace = envValue("OC_Codex_WORKSPACE");
const statusHost = envValue("OC_Codex_SUPERVISOR_STATUS_HOST") || "127.0.0.1";
const statusPort = Number(envValue("OC_Codex_SUPERVISOR_STATUS_PORT") || "8789");
const controllerUrl = (envValue("OC_Codex_CONTROLLER_URL") || "http://127.0.0.1:8788").replace(/\/$/, "");
const opencodeUrl = (envValue("OC_Codex_OPENCODE_URL") || "http://127.0.0.1:4096").replace(/\/$/, "");
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

const statePath = envValue("OC_Codex_SUPERVISOR_STATE_PATH") || join(
  workspace,
  ".opencode",
  "state",
  "cgpt-approval-bridge",
  "supervisor-state.json"
);

const state = {
  version,
  startedAt: new Date().toISOString(),
  state: "UNARMED",
  reason: "job-unarmed",
  lastActivityAt: null,
  lastReconciliationAt: null,
  lastResumeAttempt: null,
  resumeInFlight: false,
};
let statePersistence = Promise.resolve();

try {
  const persisted = JSON.parse(readFileSync(statePath, "utf8"));
  Object.assign(state, persisted, {
    version,
    startedAt: new Date().toISOString(),
    resumeInFlight: false,
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
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} pour ${url}.`);
  }

  return response.json();
}

function resumeAllowed(status, job) {
  if (!job || !job.armed) return "job-unarmed";
  if (job.terminalGate?.status === "VALIDATED") return "terminal-gate-validated";
  if (status.opencodeSse !== "connected") return "opencode-sse-unavailable";
  if (!status.brokerReadiness) return "broker-readiness-missing";
  if (!['READY', 'DEGRADED'].includes(status.brokerReadiness.status)) return "broker-not-resumable";
  if (Number(status.brokerReadiness.pending_count || 0) > 0) return "pending-validations";
  if (Number(status.activeValidationCount || 0) > 0) return "active-validations";
  return null;
}

function resumeMessage(job) {
  return [
    "REPRISE_CAB_SUPERVISEUR",
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

async function reconcile() {
  try {
    const [status, job] = await Promise.all([
      fetchJson(`${controllerUrl}/status`),
      fetchJson(`${controllerUrl}/job`),
    ]);

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

    const session = await fetchJson(
      `${opencodeUrl}/session/${encodeURIComponent(job.sessionId)}`
    );

    if (!session || typeof session !== "object") {
      await updateState("WAITING", "session-unavailable");
      return;
    }

    state.resumeInFlight = true;
    state.lastResumeAttempt = {
      at: new Date().toISOString(),
      result: "pending",
      sessionId: job.sessionId,
    };
    await persistState();

    await fetchJson(
      `${opencodeUrl}/session/${encodeURIComponent(job.sessionId)}/message`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          parts: [{ type: "text", text: resumeMessage(job) }],
        }),
      }
    );

    state.resumeInFlight = false;
    state.lastActivityAt = new Date().toISOString();
    state.lastResumeAttempt.result = "sent";
    await updateState("WATCHING", "resume-sent");
  } catch (cause) {
    state.resumeInFlight = false;
    state.lastResumeAttempt = {
      at: new Date().toISOString(),
      result: "failed",
      reason: cause.message,
    };
    await updateState("WAITING", "reconciliation-failed");
  }
}

async function consumeOpenCodeEvents() {
  try {
    const response = await fetch(`${opencodeUrl}/global/event`, {
      headers: { accept: "text/event-stream" },
    });

    if (!response.ok || !response.body) {
      throw new Error(`OpenCode SSE HTTP ${response.status}.`);
    }

    let buffer = "";
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() || "";

      for (const frame of frames) {
        if (/^data:\s*/m.test(frame)) {
          state.lastActivityAt = new Date().toISOString();
          await persistState();
        }
      }
    }

    throw new Error("Flux SSE OpenCode fermé.");
  } catch {
    await updateState("WAITING", "opencode-sse-reconnecting");
  }

  setTimeout(() => {
    void consumeOpenCodeEvents();
  }, reconnectMs);
}

createServer((request, response) => {
  if (request.method !== "GET" || request.url !== "/status") {
    response.writeHead(404).end();
    return;
  }

  response.writeHead(200, {
    "cache-control": "no-store",
    "content-type": "application/json",
  });
  response.end(JSON.stringify({ ...state }));
}).listen(statusPort, statusHost, () => {
  void reconcile();
  void consumeOpenCodeEvents();
  setInterval(() => {
    void reconcile();
  }, pollIntervalMs);
});
