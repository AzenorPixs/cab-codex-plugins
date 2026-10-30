import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import readline from "node:readline";

import { nextLifecycle, publicLifecycle, validLifecycle, VERSION as STEP_VERSION } from './cgpt-approval-bridge-run-steps.mjs';
import { validCodingModel, VERSION as MODEL_VERSION } from './cgpt-approval-bridge-model-policy.mjs';
import { createOpenCodeV2ClientFromEnv } from './cgpt-approval-bridge-opencode-client.mjs';
import { createModelTransition, modelContractHash, validModelTransitionState, MODEL_TRANSITION_PROTOCOL,
  VERSION as TRANSITION_VERSION } from './cgpt-approval-bridge-model-transition.mjs';

export const VERSION = "2.1.19";
if ([STEP_VERSION, MODEL_VERSION, TRANSITION_VERSION].some((value) => value !== VERSION)) throw new Error('CAB lifecycle component version mismatch');

export function commandLengthLimit(environment = process.env) {
  const name = Object.hasOwn(environment, 'OC_Codex_MAX_COMMAND_LENGTH')
    ? 'OC_Codex_MAX_COMMAND_LENGTH' : 'OC_CGPT_MAX_COMMAND_LENGTH';
  if (!Object.hasOwn(environment, name)) return 16_384;
  const value = environment[name];
  const limit = Number(value);
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value) || !Number.isSafeInteger(limit) || limit <= 0) {
    throw new Error(`${name} doit être un entier décimal strictement positif et sûr JavaScript.`);
  }
  return limit;
}

export function checkCommandLength(approval, maxLength) {
  if (!Array.isArray(approval?.commands)) return;
  for (const command of approval.commands) {
    if (typeof command !== 'string' || command.length <= maxLength) continue;
    const message = `Commande refusée : longueur ${command.length}, limite autorisée ${maxLength}.`;
    const cause = new Error(message);
    cause.code = 'command-too-long';
    cause.status = 400;
    cause.diagnostic = { error: cause.code, message, maxLength, actualLength: command.length, unit: 'utf16' };
    throw cause;
  }
}

const DECISION_ERRORS = new Map(Object.entries({
  'decision-invalid': 'La décision doit être approved, rejected ou needs_clarification.',
  'decision-invalid-json': 'Le corps de décision n’est pas un JSON valide.',
  'decision-validation-unknown': 'Aucune validation admise ne correspond à cette demande.',
  'decision-already-recorded': 'Une décision est déjà enregistrée pour cette demande.',
  'notification-reconciliation-rejection-only': 'Cette demande réconciliée accepte uniquement un rejet.',
  'decision-operation-invalidated': 'L’opération de cette demande a été invalidée.',
  'decision-context-closed': 'Le contexte de décision est fermé.',
  'decision-recovery-transition': 'Une transition de récupération est en cours.',
  'decision-session-revoked': 'La session du mandat est révoquée.',
  'decision-context-divergent': 'Le mandat ne correspond pas au contexte du job.',
  'decision-recovery-mismatch': 'Le mandat ne correspond pas au prévol de récupération courant.',
  'decision-session-mismatch': 'La session du mandat ne correspond pas à celle du job.',
  'decision-operation-not-admitted': 'L’opération n’est plus admise pour cette décision.',
  'resource-revision-stale': 'La révision d’une ressource a changé depuis la demande.',
  'reservation-version-stale': 'La version de réservation de la demande est périmée.',
  'operation-identity-divergent': 'L’identité de l’opération ne correspond pas au registre.',
  'operation-outside-reservation': 'Une ressource du mandat est hors de la réservation.',
  'expected-revisions-invalid': 'Les révisions attendues du mandat sont invalides.',
  'resources-invalid': 'Le manifeste de ressources du mandat est invalide.',
  'resource-physical-alias-refused': 'Une ressource possède un alias physique non admis.',
  'run-not-reserved': 'Le RUN ne possède plus de réservation active.',
  'run-target-required': 'Un RUN doit être ciblé explicitement.',
  'run-transition-in-flight': 'Une transition du RUN est en cours.',
  'global-coordination-suspended': 'La coordination globale suspend l’admission de cette opération.',
  'run-pause': 'Le RUN est en pause.',
  'run-stop': 'Le RUN est arrêté.',
  'maintenance-preflight-required': 'Un prévol de maintenance reste requis pour ce RUN.',
  'coordination-upgrade-required': 'Le protocole de coordination requis n’est pas disponible.',
  'registry-unavailable': 'L’autorité du registre n’est pas disponible.',
  'broker-integrity-unavailable': 'L’intégrité du broker ne permet pas cette opération.',
  'test-resource-not-held': 'La réservation de l’environnement de test n’est pas détenue.',
  'test-reconciliation-required': 'La réservation de test restaurée doit être réconciliée.',
  'decision-processing-failed': 'La décision n’a pas pu être traitée ; vérifier son état enregistré.'
}));
const decisionError = (code) => Object.assign(new Error(code), { code });

// A context owns its decisions, gates and recovery; OpenCode and MCP stay shared.
export function createJobContext({ workspace, stateDirectory, run = null,
  currentRun = () => run,
  admitOperation = () => true, inspectOperationAdmission = null, ownsSession = () => true, observe = () => {},
  nativeLifecycle = {}, openCodeClient = null, modelPolicy = {},
  maxCommandLength = commandLengthLimit(),
  verifyRestoredPreflight = () => true }) {
  const transportAbort = new AbortController();
  const openCode = openCodeClient || createOpenCodeV2ClientFromEnv({ directory: workspace, signal: transportAbort.signal });
function envValue(name) {
  const legacyName = name.replace("OC_Codex_", "OC_CGPT_");
  return process.env[name] || process.env[legacyName];
}


const allowedStatusHosts = new Set([
  "127.0.0.1",
  "::1",
]);

if (envValue("OC_Codex_OUTSIDE_SANDBOX") !== "1") {
  throw new Error(
    "Le contrôleur Codex doit être exécuté hors sandbox (OC_Codex_OUTSIDE_SANDBOX=1 ; alias OC_CGPT_OUTSIDE_SANDBOX accepté)."
  );
}

const codexCommand = process.env.CODEX_COMMAND || "codex";
const statusHost = envValue("OC_Codex_STATUS_HOST") || "127.0.0.1";
const statusPort = Number(envValue("OC_Codex_STATUS_PORT") || "8788");
const reconnectMs = Number(envValue("OC_Codex_RECONNECT_MS") || "1000");
const decisionMode = envValue("OC_Codex_DECISION_MODE") || "manual";
const reminderStatePath = join(stateDirectory, "controller-reminders.json");
const jobStatePath = join(stateDirectory, "controller-job.json");
const opencodeExitStatusSuffix = ' 2>/dev/null; echo "exit=$?"';

if (!workspace) {
  throw new Error(
    "OC_Codex_WORKSPACE doit désigner la racine absolue autorisée du projet."
  );
}

if (!isAbsolute(workspace)) {
  throw new Error(
    "OC_Codex_WORKSPACE doit désigner une racine de projet absolue."
  );
}

if (!new Set(["automatic", "manual"]).has(decisionMode)) {
  throw new Error(
    "OC_Codex_DECISION_MODE doit être automatic ou manual."
  );
}

if (!allowedStatusHosts.has(statusHost)) {
  throw new Error(
    "OC_Codex_STATUS_HOST doit être une adresse loopback autorisée."
  );
}

let codex;
let codexThreadId;
let nextId = 1;

const rpcWaiters = new Map();
const turnStarts = new Map();
const turns = new Map();
const active = new Map();
const answered = new Set();
const httpDecisions = new Map();
const validations = new Map();
const reconcilingPermissions = new Set();
const unmatchedNativePermissions = new Map();
const reminderNotifications = new Map();
let job = null;
let jobPersistence = Promise.resolve();
let recoveryTransitionInFlight = false;
let lifecycleTransitionInFlight = false;
let permissionTimer;
let closed = false;
let closePromise;

try {
  const persisted = JSON.parse(readFileSync(reminderStatePath, "utf8"));
  for (const [requestId, notification] of Object.entries(persisted)) {
    reminderNotifications.set(requestId, notification);
  }
} catch {
  // L'absence de notification persistante est l'état initial normal.
}

try {
  const persisted = JSON.parse(readFileSync(jobStatePath, "utf8"));
  if (!validPersistedJob(persisted)) {
    const cause = new Error("contrat invalide");
    cause.code = "INVALID_JOB_CONTRACT";
    throw cause;
  }
  job = persisted;
} catch (cause) {
  if (cause.code !== "ENOENT") {
    const reason = cause instanceof SyntaxError ? "JSON invalide"
      : cause.code === "INVALID_JOB_CONTRACT" ? "contrat invalide" : "lecture impossible";
    throw new Error(`Restauration du contrat de job impossible : ${reason}.`);
  }
}

const status = {
  startedAt: new Date().toISOString(),
  appServer: "starting",
  opencodeSse: "connecting",
  brokerReadiness: null,
  brokerReadinessReceivedAt: null,
  activeValidations: [],
  lastEvent: {
    at: new Date().toISOString(),
    type: "starting",
  },
};
const terminalGate = {
  status: job?.terminalGate?.status || "OPEN",
  reason: job?.terminalGate?.reason || "job-not-terminal",
  declaredState: job?.terminalGate?.declaredState || null,
  validatedAt: job?.terminalGate?.validatedAt || null,
};

const modelTransitions = createModelTransition({
  getJob: () => job, setJob: candidate => { job = candidate; }, persist: candidate => persistJob(candidate), client: openCode,
  resolveSelection: input => {
    if (typeof modelPolicy.resolve !== 'function') throw Object.assign(new Error('model-transition-unsupported'), { code: 'model-transition-unsupported' });
    return modelPolicy.resolve(input);
  },
  proveSelection: (selection, proof, notBefore) => {
    if (typeof modelPolicy.prove !== 'function') throw Object.assign(new Error('model-transition-unsupported'), { code: 'model-transition-unsupported' });
    return modelPolicy.prove(selection, proof, notBefore);
  },
  observeConnection: (selection,input) => typeof modelPolicy.connection === 'function' ? modelPolicy.connection(selection,input) : null,
  assertBoundary: () => {
    if (!run || typeof modelPolicy.assertBoundary !== 'function') throw Object.assign(new Error('model-transition-run-required'), { code: 'model-transition-run-required' });
    if (closed || terminalGate.status !== 'OPEN' || Number(status.brokerReadiness?.pending_count || 0) > 0 ||
        job?.currentCabMandate || reconcilingPermissions.size || unmatchedNativePermissions.size ||
        status.activeValidations.length || [...validations.values()].some(v => !httpDecisions.has(v.requestId) ||
          httpDecisions.get(v.requestId)?.decision === 'approved' && !v.operationConsumed && !v.operationInvalidated)) {
      throw Object.assign(new Error('model-transition-not-quiescent'), { code: 'model-transition-not-quiescent' });
    }
    return modelPolicy.assertBoundary();
  },
});

function publicJob() {
  if (!job) return null;

  return {
    ...(run ? { runId: run.runId } : {}),
    jobId: job.jobId,
    sessionId: job.sessionId,
    directory: job.directory,
    changeId: job.changeId,
    criteria: job.criteria,
    strictCommands: job.strictCommands === true,
    ...(job.codingModel ? { codingModel: structuredClone(job.codingModel) } : {}),
    modelTransitionProtocol: MODEL_TRANSITION_PROTOCOL,
    modelContractHash: modelContractHash(job.codingModel),
    modelTransition: job.modelTransition ? structuredClone(job.modelTransition) : null,
    modelTransitionHistory: structuredClone(job.modelTransitionHistory || []),
    lifecycle: publicLifecycle(job.lifecycle),
    lastProvenMilestone: job.lastProvenMilestone,
    currentCabMandate: job.currentCabMandate,
    armed: job.armed,
    armedAt: job.armedAt,
    updatedAt: job.updatedAt,
    disarmedAt: job.disarmedAt || null,
    recovery: job.recovery || null,
    recoveryHistory: job.recoveryHistory || [],
    revokedSessions: job.revokedSessions || [],
    terminalGate: { ...terminalGate },
  };
}

function persistJob(candidate = job) {
  if (!candidate) return Promise.resolve();

  candidate.terminalGate = { ...terminalGate };
  candidate.updatedAt = new Date().toISOString();
  const snapshot = JSON.stringify(candidate, null, 2);

  jobPersistence = jobPersistence.catch(() => {}).then(async () => {
    await mkdir(dirname(jobStatePath), { recursive: true });
    const temporaryPath = `${jobStatePath}.tmp`;
    await writeFile(temporaryPath, snapshot, "utf8");
    await rename(temporaryPath, jobStatePath);
  });

  return jobPersistence;
}

function rememberJob() {
  if (modelTransitions.inFlight) return;
  void persistJob().catch(() => {
    updateStatus("job-persistence-failed");
  });
}

function resetTerminalGate(reason, persist = true) {
  terminalGate.status = "OPEN";
  terminalGate.reason = reason;
  terminalGate.declaredState = null;
  terminalGate.validatedAt = null;
  if (persist) {
    rememberJob();
  }
}

function terminalGateFailure(declaredState) {
  if (job?.modelTransition) return 'model-transition-pending';
  if (run && unmatchedNativePermissions.size) return "native-permissions-unresolved";
  if (run && job?.currentCabMandate) return "current-mandate-not-closed";
  if (run && [...validations.values()].some((v) => httpDecisions.get(v.requestId)?.decision === "approved" &&
      !v.operationConsumed && !v.operationInvalidated)) return "native-effect-unresolved";
  if (job?.recovery && declaredState !== "BLOQUÉ") return "session-recovery-pending";
  if (!new Set(["TERMINÉ", "BLOQUÉ"]).has(declaredState)) return "terminal-state-required";
  if (status.activeValidations.length > 0) return "active-validations";
  for (const validation of validations.values()) {
    if (!httpDecisions.has(validation.requestId)) return "undecided-validation";
  }
  if (!status.brokerReadiness) return "broker-readiness-missing";
  if (Number(status.brokerReadiness.pending_count || 0) > 0) return "pending-validations";
  return null;
}

function updateStatus(type, details = {}) {
  status.lastEvent = {
    at: new Date().toISOString(),
    type,
    ...details,
  };
  observe(type, { ...details, ...(run ? { runId: run.runId } : {}),
    ...(job ? { changeId: job.changeId, sessionId: job.sessionId, jobId: job.jobId } : {}) });
}

function publicStatus() {
  return {
    configuration: { maxCommandLength, commandLengthUnit: 'UTF-16' },
    version: "2.1.19",
    ...(run ? { runId: run.runId } : {}),
    startedAt: status.startedAt,
    appServer: status.appServer,
    opencodeSse: status.opencodeSse,
    brokerReadiness: status.brokerReadiness,
    brokerReadinessReceivedAt: status.brokerReadinessReceivedAt,
    activeValidationCount: status.activeValidations.length,
    undecidedValidationCount: [...validations.values()].filter((v) => !httpDecisions.has(v.requestId)).length,
    pendingReminderCount: reminderNotifications.size,
    activeValidations: status.activeValidations.map(
      ({ requestId, receivedAt }) => ({
        requestId,
        receivedAt,
      })
    ),
    unmatchedNativePermissionCount: unmatchedNativePermissions.size,
    unmatchedNativePermissions: Array.from(
      unmatchedNativePermissions.values()
    ),
    terminalGate: { ...terminalGate },
    job: publicJob(),
    lastEvent: status.lastEvent,
  };
}

function validJobContract(payload) {
  if (payload?.codingModel !== undefined && !validCodingModel(payload.codingModel)) return null;
  if (
    !payload ||
    typeof payload.jobId !== "string" ||
    !payload.jobId ||
    typeof payload.sessionId !== "string" ||
    !payload.sessionId ||
    typeof payload.directory !== "string" ||
    !isAbsolute(payload.directory) ||
    !Array.isArray(payload.criteria) ||
    !payload.criteria.every((criterion) => typeof criterion === "string") ||
    (payload.strictCommands !== undefined &&
      typeof payload.strictCommands !== "boolean")
  ) {
    return null;
  }

  if (
    payload.changeId !== undefined &&
    (typeof payload.changeId !== "string" || !payload.changeId)
  ) {
    return null;
  }

  return {
    jobId: payload.jobId,
    sessionId: payload.sessionId,
    directory: payload.directory,
    changeId: payload.changeId || null,
    criteria: payload.criteria,
    strictCommands: payload.strictCommands === true,
    ...(payload.codingModel ? { codingModel: structuredClone(payload.codingModel) } : {}),
    lastProvenMilestone: null,
    currentCabMandate: null,
    armed: true,
    armedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function validPersistedJob(payload) {
  if (!validModelTransitionState(payload)) return false;
  if (payload?.codingModel !== undefined && !validCodingModel(payload.codingModel)) return false;
  const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const text = (value) => typeof value === "string" && value.length > 0;
  const strings = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");
  if (!record(payload) || !text(payload.jobId) || !text(payload.sessionId) ||
      typeof payload.directory !== "string" || !isAbsolute(payload.directory) ||
      !strings(payload.criteria) || typeof payload.armed !== "boolean" ||
      (payload.changeId !== undefined && payload.changeId !== null && !text(payload.changeId)) ||
      (payload.strictCommands !== undefined && typeof payload.strictCommands !== "boolean")) {
    return false;
  }
  for (const key of ["lastProvenMilestone", "currentCabMandate", "armedAt", "updatedAt", "disarmedAt"]) {
    if (payload[key] !== undefined && payload[key] !== null && typeof payload[key] !== "string") return false;
  }
  if (payload.lifecycle !== undefined && !validLifecycle(payload.lifecycle)) return false;
  if (payload.terminalGate !== undefined) {
    const gate = payload.terminalGate;
    if (!record(gate) || !["OPEN", "VALIDATED"].includes(gate.status) ||
        (gate.declaredState !== undefined && gate.declaredState !== null &&
          !["TERMINÉ", "BLOQUÉ"].includes(gate.declaredState))) return false;
    for (const key of ["reason", "validatedAt"]) {
      if (gate[key] !== undefined && gate[key] !== null && typeof gate[key] !== "string") return false;
    }
  }
  const recoveryRecord = (value) => {
    if (!record(value)) return false;
    for (const key of ["jobId", "expectedSessionId", "sessionId", "recoveryId", "preflightRequestId",
      "preparedAt", "completedAt"]) {
      if (value[key] !== undefined && !text(value[key])) return false;
    }
    if (value.invalidatedRequestIds !== undefined && !strings(value.invalidatedRequestIds)) return false;
    if (value.preparationHistory !== undefined && (!record(value.preparationHistory) ||
        !Number.isSafeInteger(value.preparationHistory.nativeToolCount) ||
        value.preparationHistory.nativeToolCount < 0 ||
        !/^[a-f0-9]{64}$/.test(value.preparationHistory.nativeToolHash))) return false;
    if (value.restoredPreflight !== undefined && (!record(value.restoredPreflight) ||
        !text(value.restoredPreflight.authorizationReference) ||
        !text(value.restoredPreflight.blockedGateValidatedAt) ||
        !text(value.restoredPreflight.restoredAt) ||
        !text(value.restoredPreflight.requestId) || !text(value.restoredPreflight.approvalId) ||
        !Number.isSafeInteger(value.restoredPreflight.nativeToolCount) || value.restoredPreflight.nativeToolCount < 1 ||
        !/^[a-f0-9]{64}$/.test(value.restoredPreflight.nativeToolHash) ||
        !/^[a-f0-9]{64}$/.test(value.restoredPreflight.decisionHash) ||
        value.restoredPreflight.nativePermissionReplayed !== false)) return false;
    if (value.attempts !== undefined && (!Array.isArray(value.attempts) || !value.attempts.every((attempt) =>
      record(attempt) && text(attempt.preflightRequestId) && strings(attempt.requestIds) &&
      strings(attempt.approvalIds) && Number.isSafeInteger(attempt.nativeToolCount) &&
      attempt.nativeToolCount >= 0 && text(attempt.nativeToolHash) &&
      (text(attempt.refusedAt) || (text(attempt.reconciledAt) &&
        attempt.outcome === "EXECUTED_WITHOUT_NATIVE_ONCE" && text(attempt.authorizationReference) &&
        text(attempt.nativeParentId) && text(attempt.nativeParentHash)))))) return false;
    return true;
  };
  if (payload.recovery !== undefined && payload.recovery !== null && !recoveryRecord(payload.recovery)) return false;
  if (payload.recoveryHistory !== undefined &&
      (!Array.isArray(payload.recoveryHistory) || !payload.recoveryHistory.every(recoveryRecord))) return false;
  if (payload.revokedSessions !== undefined && !strings(payload.revokedSessions)) return false;
  return true;
}

function approvedOperation(approval) {
  checkCommandLength(approval, maxCommandLength);
  const sessionId = approval?.session_id;
  const directory = approval?.directory;
  const files = approval?.files;
  const commands = approval?.commands;

  if (
    typeof sessionId !== "string" ||
    typeof directory !== "string" ||
    !sessionId.startsWith("ses_") ||
    !directory.startsWith("/")
  ) {
    return null;
  }

  if (!Array.isArray(files) || !Array.isArray(commands)) {
    throw new Error("Mandat de validation incomplet.");
  }

  const validFile = (file) =>
    typeof file === "string" &&
    file &&
    !file.startsWith("/") &&
    file !== ".." &&
    !file.startsWith("../");
  const validCommand = (command) =>
    typeof command === "string" &&
    command;

  if (!files.every(validFile) || !commands.every(validCommand)) {
    throw new Error("Mandat de validation invalide.");
  }

  if (files.length === 1 && commands.length === 0) {
    return { sessionId, directory, kind: "edit", target: files[0], runId: approval.run_id,
      reservationVersion: approval.reservation_version, resources: approval.resources,
      operationId: approval.operation_id, operationDigest: approval.operation_digest,
      expectedRevisions: approval.expected_revisions, accessId: approval.access_id,
      coordinationProtocol: approval.coordination_protocol };
  }

  if (files.length === 0 && commands.length === 1) {
    return { sessionId, directory, kind: "bash", target: commands[0], runId: approval.run_id,
      reservationVersion: approval.reservation_version, resources: approval.resources,
      operationId: approval.operation_id, operationDigest: approval.operation_digest,
      expectedRevisions: approval.expected_revisions, accessId: approval.access_id,
      coordinationProtocol: approval.coordination_protocol };
  }

  throw new Error(
    "Un mandat de validation doit désigner exactement un fichier ou une commande."
  );
}

function operationAllowed(operation, requestId, stage = 'prepare') {
  return operationContextAllowed(operation, requestId) && admitOperation(operation, requestId, stage);
}

function operationContextFailure(operation, requestId) {
  if (closed) return 'decision-context-closed';
  if (job?.modelTransition || modelTransitions.inFlight) return 'decision-recovery-transition';
  if (recoveryTransitionInFlight) return 'decision-recovery-transition';
  if (job?.revokedSessions?.includes(operation?.sessionId)) return 'decision-session-revoked';
  if (!job?.armed) return null;
  if (!operation || operation.directory !== job.directory) return 'decision-context-divergent';
  if (job.recovery) {
    return operation.sessionId === job.recovery.sessionId && requestId === job.recovery.preflightRequestId &&
      operation.kind === 'bash' && operation.target === '/usr/bin/true' ? null : 'decision-recovery-mismatch';
  }
  return operation.sessionId === job.sessionId ? null : 'decision-session-mismatch';
}
function operationContextAllowed(operation, requestId) {
  return operationContextFailure(operation, requestId) === null;
}
function assertDecisionOperation(operation, requestId) {
  const contextFailure = operationContextFailure(operation, requestId);
  if (contextFailure) throw decisionError(contextFailure);
  const inspect = inspectOperationAdmission || admitOperation;
  if (inspect(operation, requestId, 'prepare') !== true) throw decisionError('decision-operation-not-admitted');
}

function recoveryFailure(reason) {
  throw new Error(reason);
}

function nativePermissionFailure(reason) {
  const error = new Error(reason);
  error.code = "NATIVE_PERMISSION_GUARD";
  throw error;
}

function hasNativeAsk(session, kind, actions = ['ask']) {
  if (!Array.isArray(session.permission) || session.permission.some((rule) =>
      !rule || typeof rule.permission !== "string" || !rule.permission ||
      typeof rule.pattern !== "string" || !["ask", "allow", "deny"].includes(rule.action))) {
    return false;
  }
  if (kind === 'bash' && session.permission.some(rule => rule.permission === 'shell')) kind = 'shell';
  const matches = (pattern) => new RegExp(`^${pattern.split("").map((character) =>
    character === "*" ? ".*" : character === "?" ? "." :
      character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("")}$`).test(kind);
  const last = session.permission.findLast((rule) => matches(rule.permission));
  // Une règle finale globale ask couvre aussi les cibles spécifiques antérieures.
  return last?.pattern === "*" && actions.includes(last.action);
}

async function checkNativeAsk(operation, nativeKind = operation?.kind) {
  if (!job?.armed) return;
  let session;
  try {
    session = await openCode.session(operation.sessionId, operation.directory);
  } catch (cause) {
    if (cause.code === "NATIVE_PERMISSION_GUARD") throw cause;
    if (cause.code === "opencode-session-divergent") nativePermissionFailure("native-permission-context-divergent");
    nativePermissionFailure("native-permission-control-unavailable");
  }
  if (session?.id !== operation.sessionId || session.directory !== operation.directory) {
    nativePermissionFailure("native-permission-context-divergent");
  }
  if (!hasNativeAsk(session, nativeKind)) nativePermissionFailure("native-permission-ask-required");
}

async function nativeAskGuard(operation, response, request) {
  try {
    await checkNativeAsk(operation);
    return true;
  } catch (cause) {
    if (cause.code !== "NATIVE_PERMISSION_GUARD") throw cause;
    request?.cabObserveHttpFailure?.(cause.message);
    updateStatus("native-permission-guard-refused", { error: cause.message });
    response.writeHead(409, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: cause.message }));
    return false;
  }
}

function recoveryApprovalAllowed(approval) {
  if (!job?.recovery) return true;
  return approval.change_id === job.changeId &&
    !(job.recovery.attempts || []).some((attempt) =>
      attempt.approvalIds.includes(approval.approval_id));
}

function recoveryTools(messages) {
  if (!Array.isArray(messages) || messages.some((message) => !Array.isArray(message.parts))) {
    recoveryFailure("preflight-messages-invalid");
  }
  return messages.flatMap((message) => message.parts.filter((part) => part.type === "tool"));
}

function recoveryToolsHash(parts) {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

function nativeParentHash(info) {
  return createHash("sha256").update(JSON.stringify({ id: info.id, role: info.role, tools: info.tools })).digest("hex");
}

function isPreparationDiagnostic(part, parts) {
  const tool = part.tool;
  if (tool === 'cab_codemode_discovery' && part.state?.status === 'completed' && part.state.metadata?.cabCodeMode) return true;
  if (["cgpt-validation_broker_readiness", "cgpt-validation_broker_health",
    "cgpt-validation_list_pending", "cgpt-validation_broker_evaluate_remediation"].includes(tool)) return true;
  if (tool === "cgpt-validation_cancel_approval") {
    let output;
    try { output = JSON.parse(part.state?.output); } catch { return false; }
    return output.status === "CANCELLED" && output.approval_id === part.state.input?.approval_id &&
      output.directory === job.directory && output.change_id === job.changeId &&
      (!run || output.run_id === run.runId);
  }
  if (tool !== "cgpt-validation_broker_execute_controlled_remediation" ||
      part.state?.input?.action_code !== "RECONCILE_PENDING_APPROVALS") return false;
  const approvalId = part.state.input.approval_id;
  return parts.some((entry) => {
    if (entry.tool !== "cgpt-validation_list_pending" || entry.state?.status !== "completed") return false;
    let output;
    try { output = JSON.parse(entry.state.output); } catch { return false; }
    return output.approvals?.some((approval) => approval.approval_id === approvalId &&
      approval.directory === job.directory && approval.change_id === job.changeId &&
      (!run || approval.run_id === run.runId)) === true;
  });
}

function canonicalRecoveryHash(value) {
  const ordered = (entry) => Array.isArray(entry) ? entry.map(ordered) :
    entry !== null && typeof entry === "object"
      ? Object.fromEntries(Object.keys(entry).sort().map((key) => [key, ordered(entry[key])])) : entry;
  return createHash("sha256").update(JSON.stringify(ordered(value))).digest("hex");
}

function currentRecoveryTools(recovery, parts, messages = []) {
  const preparation = recovery.preparationHistory;
  if (preparation && (parts.length < preparation.nativeToolCount ||
      recoveryToolsHash(parts.slice(0, preparation.nativeToolCount)) !== preparation.nativeToolHash)) {
    recoveryFailure("preflight-history-divergent");
  }
  const previous = recovery.attempts?.at(-1);
  if (!previous) {
    if (preparation) return parts.slice(preparation.nativeToolCount);
    // Compatibilité des récupérations déjà préparées : seuls les diagnostics
    // techniques terminés avant prepare sont exclus du prévol, jamais ses outils.
    const firstRequest = parts.findIndex((part) => part.tool === "cgpt-validation_request_validation" &&
      part.state?.input?.requestId === recovery.preflightRequestId);
    const preparedAt = Date.parse(recovery.preparedAt);
    return parts.filter((part, index) => !(index < firstRequest && Number.isFinite(preparedAt) &&
      Number.isFinite(part.state?.time?.start) && Number.isFinite(part.state?.time?.end) &&
      part.state.time.start <= part.state.time.end && part.state.time.end < preparedAt &&
      isPreparationDiagnostic(part, parts)));
  }
  for (const attempt of recovery.attempts || []) {
    if (!attempt.nativeParentId) continue;
    const parent = messages.find((message) => message.info?.id === attempt.nativeParentId);
    if (!parent || nativeParentHash(parent.info) !== attempt.nativeParentHash) {
      recoveryFailure("preflight-history-divergent");
    }
  }
  if (parts.length < previous.nativeToolCount ||
      recoveryToolsHash(parts.slice(0, previous.nativeToolCount)) !== previous.nativeToolHash) {
    recoveryFailure("preflight-history-divergent");
  }
  return parts.slice(previous.nativeToolCount);
}

async function inspectRejectedReconciliation(recovery, payload) {
  if (typeof payload.developerAuthorization !== 'string' || !payload.developerAuthorization.trim() ||
      payload.developerAuthorization.length > 500) recoveryFailure('developer-authorization-required');
  if (unmatchedNativePermissions.size) recoveryFailure('native-permissions-unresolved');
  const messages = await openCode.messages(recovery.sessionId, job.directory);
  const parts = recoveryTools(messages), proof = payload.rejectedPreflightProof;
  if (proof?.nativeToolCount !== parts.length || proof.nativeToolHash !== canonicalRecoveryHash(parts)) {
    recoveryFailure('preflight-history-divergent');
  }
  const current = currentRecoveryTools(recovery, parts, messages);
  let submitted = false, rejected = false, approvalId;
  for (const part of current) {
    const state = part.state;
    if (part.tool === 'cab_codemode_discovery' && state?.status === 'completed' && state.metadata?.cabCodeMode) continue;
    if (part.tool === 'cgpt-validation_broker_readiness' && state?.status === 'completed') continue;
    if (part.tool === 'cgpt-validation_request_validation') {
      const input = state?.input;
      if (submitted || input?.requestId !== recovery.preflightRequestId ||
          input.session_id !== recovery.sessionId || input.directory !== job.directory ||
          input.change_id !== job.changeId || (run && input.run_id !== run.runId) ||
          typeof input.approval_id !== 'string' || !input.approval_id ||
          JSON.stringify(input.files) !== '[]' || JSON.stringify(input.commands) !== '["/usr/bin/true"]' ||
          (approvalId && input.approval_id !== approvalId)) recoveryFailure('preflight-request-divergent');
      approvalId = input.approval_id;
      if (state.status === 'error' && /^MCP error -32602:/.test(state.error || '')) continue;
      submitted = true;
    } else if (!submitted || !['cgpt-validation_poll_approval', 'cgpt-validation_get_approval', 'cgpt-validation_reject'].includes(part.tool) ||
        state?.input?.approval_id !== approvalId) recoveryFailure('preflight-effect-not-excluded');
    if (part.tool === 'cgpt-validation_reject' && (!state.metadata?.cabCodeMode || state.input.reviewer !== 'CGPT')) {
      recoveryFailure('preflight-refusal-not-proved');
    }
    if (['cgpt-validation_poll_approval', 'cgpt-validation_get_approval'].includes(part.tool) &&
        state?.status === 'error' && state.error === 'Tool execution interrupted' && state.metadata?.cabCodeMode) continue;
    let output;
    try { output = JSON.parse(state?.output); } catch { recoveryFailure('preflight-refusal-not-proved'); }
    if (state.status !== 'completed' || output.requestId !== recovery.preflightRequestId ||
        output.approval_id !== approvalId || output.session_id !== recovery.sessionId ||
        output.directory !== job.directory || output.change_id !== job.changeId || (run && output.run_id !== run.runId) ||
        JSON.stringify(output.files) !== '[]' || JSON.stringify(output.commands) !== '["/usr/bin/true"]' ||
        !['PENDING', 'REJECTED'].includes(output.status) || (rejected && output.status !== 'REJECTED')) {
      recoveryFailure('preflight-refusal-not-proved');
    }
    rejected ||= output.status === 'REJECTED';
  }
  const known = validations.get(recovery.preflightRequestId), decision = httpDecisions.get(recovery.preflightRequestId);
  if (!submitted || !rejected || (decision && decision.decision !== 'rejected') ||
      (known && (known.operationConsumed || known.approvalId !== approvalId)) ||
      canonicalRecoveryHash(recoveryTools(await openCode.messages(recovery.sessionId, job.directory))) !== proof.nativeToolHash) {
    recoveryFailure('preflight-refusal-not-proved');
  }
  return { preflightRequestId: recovery.preflightRequestId, requestIds: [recovery.preflightRequestId],
    approvalIds: [approvalId], nativeToolCount: parts.length, nativeToolHash: recoveryToolsHash(parts),
    refusedAt: new Date().toISOString(), outcome: 'REJECTED_WITHOUT_EFFECT',
    authorizationReference: payload.developerAuthorization, globalTransactionId: payload.globalTransactionId || null };
}

function qualifiedMcpError(part) {
  return part.state?.metadata?.cabCodeMode?.nativeMcpError === true ||
    Boolean(part.state?.metadata?.cabDirectMcpError?.itemId && part.state.metadata.cabDirectMcpError.envelopeHash);
}

function nativeUnregisteredRefusal(part, recovery) {
  const state = part.state, input = state?.input;
  return run && state?.status === 'error' && qualifiedMcpError(part) &&
    state.error === 'MCP tool "request_validation" on server "cgpt-validation" failed: protocole de coordination ou identite d operation invalide' &&
    input?.access_id === '' && input.requestId === recovery.preflightRequestId &&
    typeof input.approval_id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(input.approval_id) &&
    input.session_id === recovery.sessionId && input.directory === job.directory && input.change_id === job.changeId &&
    input.run_id === run.runId && input.reservation_version === currentRun()?.version &&
    input.coordination_protocol === 'resource-scoped-v1' &&
    JSON.stringify(input.files) === '[]' && JSON.stringify(input.commands) === '["/usr/bin/true"]';
}

function nativeUnknownApproval(part, approvalId) {
  return part.tool === 'cgpt-validation_get_approval' && part.state?.status === 'error' &&
    qualifiedMcpError(part) &&
    Object.keys(part.state.input || {}).length === 1 && part.state.input.approval_id === approvalId &&
    part.state.error === `MCP tool "get_approval" on server "cgpt-validation" failed: approval_id '${approvalId}' inconnu`;
}

async function checkRecoveryRetry(recovery, nextRequestId) {
  const validation = validations.get(recovery.preflightRequestId);
  const decision = httpDecisions.get(recovery.preflightRequestId);
  if (validation && (decision?.decision !== "rejected" || validation.operationConsumed)) {
    recoveryFailure("preflight-not-refused-without-effect");
  }
  const messages = await openCode.messages(recovery.sessionId, job.directory);
  const parts = recoveryTools(messages);
  const current = currentRecoveryTools(recovery, parts, messages);
  const requestIds = new Set([recovery.preflightRequestId]);
  const approvalIds = new Set();
  const submitted = new Map();
  let refused = false;
  for (const part of current) {
    const state = part.state;
    if (part.tool === 'cab_codemode_discovery' && state?.status === 'completed' && state.metadata?.cabCodeMode) continue;
    if (part.tool === "cgpt-validation_broker_readiness" && state?.status === "completed") continue;
    let attempt;
    if (part.tool === "cgpt-validation_request_validation") {
      const input = state?.input;
      const recorded = validations.get(input?.requestId);
      if (recorded) {
        if (httpDecisions.get(input.requestId)?.decision !== "rejected" || recorded.operationConsumed ||
            input.approval_id !== recorded.approvalId || input.change_id !== recorded.changeId ||
            input.session_id !== recovery.sessionId || input.directory !== job.directory ||
            JSON.stringify(input.files) !== "[]" ||
            JSON.stringify(input.commands) !== '["/usr/bin/true"]' ||
            recorded.operation?.sessionId !== input.session_id ||
            recorded.operation?.directory !== input.directory ||
            recorded.operation?.kind !== "bash" || recorded.operation?.target !== "/usr/bin/true" ||
            submitted.has(input.approval_id)) {
          recoveryFailure("preflight-refusal-not-proved");
        }
        attempt = { input, rejected: false };
        submitted.set(input.approval_id, attempt);
        requestIds.add(input.requestId);
        approvalIds.add(input.approval_id);
        // Le timeout seul ne prouve rien ; seul un polling corrélé peut le compléter.
        if (state.status === "error") {
          if (typeof state.error !== "string" ||
              !/^(?:MCP(?: error)? -32001:? )?(?:Request timed out|MCP timeout)$/i.test(state.error)) {
            recoveryFailure("preflight-refusal-not-proved");
          }
          continue;
        }
      } else {
        if (nativeUnregisteredRefusal(part, recovery)) {
          if (submitted.has(input.approval_id)) recoveryFailure('preflight-refusal-not-proved');
          submitted.set(input.approval_id, { input, rejected: true, unregistered: true, notFound: false });
          requestIds.add(input.requestId); approvalIds.add(input.approval_id); refused = true;
          continue;
        }
        if (state?.status !== "error" || typeof state.error !== "string" ||
            !/^MCP error -32602:/.test(state.error)) {
          recoveryFailure("preflight-refusal-not-proved");
        }
        refused = true;
        if (typeof input?.requestId === "string") requestIds.add(input.requestId);
        if (typeof input?.approval_id === "string") approvalIds.add(input.approval_id);
        continue;
      }
    } else if (["cgpt-validation_poll_approval", "cgpt-validation_get_approval"].includes(part.tool)) {
      attempt = submitted.get(state?.input?.approval_id);
      if (!attempt) recoveryFailure("preflight-refusal-not-proved");
    } else {
      recoveryFailure("preflight-effect-not-excluded");
    }
    if (attempt.unregistered) {
      if (!nativeUnknownApproval(part, attempt.input.approval_id)) recoveryFailure('preflight-refusal-not-proved');
      attempt.notFound = true;
      continue;
    }
    let output;
    try { output = JSON.parse(state?.output); } catch { recoveryFailure("preflight-refusal-not-proved"); }
    const input = attempt.input;
    if (state.status !== "completed" || !output ||
        ["requestId", "approval_id", "session_id", "directory", "change_id", "files", "commands"].some(
          (key) => JSON.stringify(output[key]) !== JSON.stringify(input[key])) ||
        !["PENDING", "REJECTED"].includes(output.status) ||
        (attempt.rejected && output.status !== "REJECTED")) {
      recoveryFailure("preflight-refusal-not-proved");
    }
    if (output.status === "REJECTED") {
      attempt.rejected = true;
      refused = true;
    }
  }
  if (!refused || [...submitted.values()].some((attempt) => !attempt.rejected || (attempt.unregistered && !attempt.notFound)) ||
      (validation && !submitted.has(validation.approvalId)) || requestIds.has(nextRequestId)) {
    recoveryFailure("preflight-refusal-not-proved");
  }
  return { preflightRequestId: recovery.preflightRequestId, requestIds: [...requestIds],
    approvalIds: [...approvalIds], nativeToolCount: parts.length,
    nativeToolHash: recoveryToolsHash(parts), refusedAt: new Date().toISOString() };
}

async function verifyRejectedRecoveryRelease(payload) {
  const recovery = job?.recovery, reference = payload.rejectedRecovery;
  const attempt = recovery?.attempts?.at(-1);
  if (!reference || reference.runId !== run?.runId || reference.jobId !== job?.jobId ||
      reference.recoveryId !== recovery?.recoveryId || reference.preflightRequestId !== recovery?.preflightRequestId ||
      attempt?.outcome !== 'REJECTED_WITHOUT_EFFECT' || !attempt.authorizationReference ||
      attempt.globalTransactionId !== payload.transactionId || reference.nativeToolHash !== attempt.nativeToolHash) {
    recoveryFailure('rejected-recovery-release-divergent');
  }
  await checkRecoveryContext(recovery);
  const parts = recoveryTools(await openCode.messages(recovery.sessionId, job.directory));
  if (parts.length !== attempt.nativeToolCount || recoveryToolsHash(parts) !== attempt.nativeToolHash ||
      job.recovery !== recovery || recovery.attempts.at(-1) !== attempt) recoveryFailure('preflight-history-divergent');
}

async function inspectNotificationReconciliation(payload, matchesApproval) {
  if (payload?.recoveryId === null) return inspectPausedOrphan(payload, matchesApproval);
  const approval = payload?.approval;
  const recovery = job?.recovery;
  const operation = approvedOperation(approval);
  if (!run || !job?.armed || terminalGate.status !== 'OPEN' || !recovery ||
      payload.jobId !== job.jobId || payload.recoveryId !== recovery.recoveryId ||
      approval?.requestId !== recovery.preflightRequestId || approval.change_id !== job.changeId ||
      approval.run_id !== run.runId || operation?.sessionId !== recovery.sessionId ||
      JSON.stringify(approval.files) !== '[]' || JSON.stringify(approval.commands) !== '["/usr/bin/true"]' ||
      !Array.isArray(approval.resources) || !approval.resources.length ||
      approval.resources.some((resource) => resource.mode !== 'read') ||
      !operationContextAllowed(operation, approval.requestId) || !recoveryApprovalAllowed(approval)) {
    recoveryFailure('notification-reconciliation-context-divergent');
  }
  if (validations.has(approval.requestId) || httpDecisions.has(approval.requestId) ||
      job.currentCabMandate || reconcilingPermissions.size || unmatchedNativePermissions.size ||
      active.size || reminderNotifications.size || [...validations.values()].some((v) => !httpDecisions.has(v.requestId))) {
    recoveryFailure('notification-reconciliation-validation-exists');
  }
  const health = await openCode.info();
  const path = await openCode.location(job.directory);
  const mcp = await openCode.mcp();
  if (!health.version.startsWith('2.') || path.directory !== job.directory || mcp['cgpt-validation']?.status !== 'connected') {
    recoveryFailure('opencode-context-divergent');
  }
  await checkNativeAsk(operation);
  const messages = await openCode.messages(recovery.sessionId, job.directory);
  const parts = recoveryTools(messages);
  const current = currentRecoveryTools(recovery, parts, messages);
  let submitted = false;
  for (const part of current) {
    const state = part.state;
    if (part.tool === 'cgpt-validation_broker_readiness' && state?.status === 'completed') continue;
    if (part.tool === 'cgpt-validation_request_validation') {
      if (submitted || !matchesApproval(state?.input)) recoveryFailure('notification-reconciliation-proof-divergent');
      submitted = true;
    } else if (!['cgpt-validation_poll_approval', 'cgpt-validation_get_approval'].includes(part.tool) ||
        !submitted || state?.input?.approval_id !== approval.approval_id) {
      recoveryFailure('notification-reconciliation-effect-not-excluded');
    }
    let output;
    try { output = JSON.parse(state?.output); } catch { recoveryFailure('notification-reconciliation-proof-divergent'); }
    if (state?.status !== 'completed' || output?.status !== 'PENDING' ||
        ['requestId', 'approval_id', 'session_id', 'directory', 'change_id', 'files', 'commands'].some(
          (key) => JSON.stringify(output[key]) !== JSON.stringify(approval[key]))) {
      recoveryFailure('notification-reconciliation-proof-divergent');
    }
  }
  if (!submitted) recoveryFailure('notification-reconciliation-proof-divergent');
  const busy = await openCode.sessionStatus(job.directory);
  const permissions = await openCode.permissions(job.directory, permissionScope());
  if (!busy || typeof busy !== 'object' || Array.isArray(busy) || !Array.isArray(permissions) ||
      permissions.some((permission) => ownsSession(permission.sessionID))) {
    recoveryFailure('notification-reconciliation-native-not-quiescent');
  }
  for (const sessionId of [job.sessionId, recovery.sessionId]) {
    const session = await openCode.session(sessionId, job.directory);
    if (session.id !== sessionId || session.directory !== job.directory ||
        (busy[sessionId] && busy[sessionId].type !== 'idle') ||
        (sessionId === recovery.sessionId && !hasNativeAsk(session, 'bash'))) {
      recoveryFailure('notification-reconciliation-native-not-quiescent');
    }
  }
  const finalMessages = await openCode.messages(recovery.sessionId, job.directory);
  if (recoveryToolsHash(recoveryTools(finalMessages)) !== recoveryToolsHash(parts)) {
    recoveryFailure('notification-reconciliation-proof-divergent');
  }
  if (!operationContextAllowed(operation, approval.requestId) || validations.has(approval.requestId) ||
      httpDecisions.has(approval.requestId)) recoveryFailure('notification-reconciliation-context-divergent');
  return { validation: { requestId: approval.requestId, approvalId: approval.approval_id,
    changeId: approval.change_id, summary: typeof approval.summary === 'string' ? approval.summary : 'Prévol réconcilié',
    operation, rejectionOnly: true }, nativeToolCount: parts.length, nativeToolHash: recoveryToolsHash(parts) };
}

async function inspectPausedOrphan(payload, matchesApproval) {
  const approval = payload.approval, operation = approvedOperation(approval);
  const fail = (code) => recoveryFailure('notification-reconciliation-' + code);
  if (!run || currentRun()?.suspension?.action !== 'PAUSE' || !job?.armed || job.recovery || terminalGate.status !== 'OPEN' ||
      payload.jobId !== job.jobId || approval?.run_id !== run.runId || approval.change_id !== job.changeId ||
      operation?.sessionId !== job.sessionId || !operationContextAllowed(operation,approval.requestId) ||
      (job.currentCabMandate && job.currentCabMandate !== approval.requestId)) fail('context-divergent');
  if (validations.has(approval.requestId) || httpDecisions.has(approval.requestId) || active.size ||
      reconcilingPermissions.size || unmatchedNativePermissions.size || reminderNotifications.size ||
      [...validations.values()].some((v) => !httpDecisions.has(v.requestId))) fail('validation-exists');
  const health = await openCode.info(), path = await openCode.location(job.directory), mcp = await openCode.mcp();
  if (!health.version.startsWith('2.') || path.directory !== job.directory || mcp['cgpt-validation']?.status !== 'connected') fail('context-divergent');
  const parts = recoveryTools(await openCode.messages(job.sessionId, job.directory));
  const submissions = parts.filter((p) => p.tool === 'cgpt-validation_request_validation' && p.state?.input?.requestId === approval.requestId);
  if (submissions.length !== 1 || !matchesApproval(submissions[0].state?.input)) fail('proof-divergent');
  const first = parts.indexOf(submissions[0]); let pending = false;
  for (const part of parts.slice(first)) {
    const state = part.state;
    if (part.tool === 'cgpt-validation_broker_readiness' && state?.status === 'completed') continue;
    if (part === submissions[0] && state?.status === 'error' && /-32001/.test(state.error || '')) continue;
    if (part !== submissions[0] && (!['cgpt-validation_poll_approval','cgpt-validation_get_approval'].includes(part.tool) ||
        state?.input?.approval_id !== approval.approval_id)) fail('effect-not-excluded');
    let output; try { output = JSON.parse(state?.output); } catch { fail('proof-divergent'); }
    if (state?.status !== 'completed' || output?.status !== 'PENDING' ||
        ['requestId','approval_id','session_id','directory','change_id','files','commands'].some((key) =>
          JSON.stringify(output[key]) !== JSON.stringify(approval[key]))) fail('proof-divergent');
    pending = true;
  }
  if (!pending) fail('proof-divergent');
  const busy = await openCode.sessionStatus(job.directory), permissions = await openCode.permissions(job.directory, permissionScope()),
    session = await openCode.session(job.sessionId, job.directory);
  if (!busy || typeof busy !== 'object' || Array.isArray(busy) || !Array.isArray(permissions) ||
      permissions.some((p) => ownsSession(p.sessionID)) || session.id !== job.sessionId || session.directory !== job.directory ||
      (busy[job.sessionId] && busy[job.sessionId].type !== 'idle') || !hasNativeAsk(session,operation.kind,['ask','deny'])) fail('native-not-quiescent');
  if (recoveryToolsHash(recoveryTools(await openCode.messages(job.sessionId, job.directory))) !== recoveryToolsHash(parts)) fail('proof-divergent');
  return { validation: { requestId:approval.requestId,approvalId:approval.approval_id,changeId:approval.change_id,
    summary:typeof approval.summary === 'string' ? approval.summary : 'Demande en pause réconciliée',operation,rejectionOnly:true,pausedOrphan:true },
    nativeToolCount:parts.length,nativeToolHash:recoveryToolsHash(parts) };
}

function checkReconciledValidation(inspection) {
  const validation = inspection.validation;
  if (!operationContextAllowed(validation.operation, validation.requestId) ||
      validations.has(validation.requestId) || httpDecisions.has(validation.requestId) ||
      (job.currentCabMandate && !(validation.pausedOrphan && currentRun()?.suspension?.action === 'PAUSE' &&
        job.currentCabMandate === validation.requestId)) || reconcilingPermissions.size || unmatchedNativePermissions.size ||
      active.size || reminderNotifications.size) {
    recoveryFailure('notification-reconciliation-context-divergent');
  }
}

function installReconciledValidation(inspection) {
  checkReconciledValidation(inspection);
  const validation = inspection.validation;
  validations.set(validation.requestId, validation);
  updateStatus('notification-reconciled-rejection-only', { requestId: validation.requestId });
}

// Remédiation humaine bornée : l'ancien prévol reste invalide et n'est jamais rejoué.
async function checkExecutedPreflight(recovery, payload) {
  if (typeof payload.developerAuthorization !== "string" ||
      !payload.developerAuthorization.trim() || payload.developerAuthorization.length > 500) {
    recoveryFailure("developer-authorization-required");
  }
  const validation = validations.get(recovery.preflightRequestId);
  if (validation && (httpDecisions.get(recovery.preflightRequestId)?.decision !== "approved" ||
      validation.operationConsumed || validation.operationInvalidated)) {
    recoveryFailure("preflight-not-executed-without-once");
  }
  const session = await openCode.session(recovery.sessionId, job.directory);
  const bashRule = (Array.isArray(session.permission) ? session.permission : []).findLast((rule) =>
    rule.permission === "bash" || rule.permission === "*");
  if (bashRule?.pattern !== "*" || bashRule.action !== "ask") {
    recoveryFailure("preflight-native-ask-required");
  }
  const messages = await openCode.messages(recovery.sessionId, job.directory);
  const parts = recoveryTools(messages);
  const current = currentRecoveryTools(recovery, parts, messages);
  let parentInfo = null;
  let submitted = null;
  let approvalEnd = null;
  let commandEnd = null;
  let commandCount = 0;
  let ready = false;
  for (const part of current) {
    const state = part.state;
    if (part.tool === "cgpt-validation_request_validation") {
      const input = state?.input;
      if (submitted || input?.requestId !== recovery.preflightRequestId ||
          input.session_id !== recovery.sessionId || input.directory !== job.directory ||
          input.change_id !== job.changeId || typeof input.approval_id !== "string" ||
          !input.approval_id || JSON.stringify(input.files) !== "[]" ||
          JSON.stringify(input.commands) !== '["/usr/bin/true"]' ||
          (run && input.run_id !== run.runId)) recoveryFailure("preflight-request-divergent");
      const message = messages.find((message) => message.parts.includes(part));
      const parent = messages.find((entry) => entry.info?.id === message?.info?.parentID);
      if (parent?.info?.role !== "user" || parent.info.tools?.bash !== true) {
        recoveryFailure("preflight-native-allow-not-proved");
      }
      parentInfo = parent.info;
      submitted = input;
      if (state.status === "error") continue;
    }
    if (!state || state.status !== "completed") recoveryFailure("preflight-tool-not-completed");
    if (["cgpt-validation_request_validation", "cgpt-validation_poll_approval",
      "cgpt-validation_get_approval"].includes(part.tool)) {
      if (!submitted || (part.tool !== "cgpt-validation_request_validation" &&
          state.input?.approval_id !== submitted.approval_id)) recoveryFailure("preflight-poll-divergent");
      let output;
      try { output = JSON.parse(state.output); } catch { recoveryFailure("preflight-approval-invalid"); }
      if (output.requestId !== submitted.requestId || output.approval_id !== submitted.approval_id ||
          output.change_id !== job.changeId || output.session_id !== recovery.sessionId ||
          output.directory !== job.directory || JSON.stringify(output.files) !== "[]" ||
          JSON.stringify(output.commands) !== '["/usr/bin/true"]' ||
          (validation && output.approval_id !== validation.approvalId)) {
        recoveryFailure("preflight-approval-divergent");
      }
      if (output.status === "APPROVED" && output.reviewer === "CGPT" &&
          Number.isFinite(state.time?.end)) approvalEnd = state.time.end;
      else if (output.status !== "PENDING") recoveryFailure("preflight-approval-not-approved");
    } else if (part.tool === "bash") {
      commandCount += 1;
      if (!Number.isFinite(approvalEnd) || !Number.isFinite(state.time?.start) ||
          state.time.start < approvalEnd || state.input?.command !== "/usr/bin/true" ||
          state.metadata?.exit !== 0 || !Number.isFinite(state.time?.end) ||
          state.time.end < state.time.start) recoveryFailure("preflight-command-invalid");
      commandEnd = state.time.end;
    } else if (part.tool === "cgpt-validation_broker_readiness") {
      let output;
      try { output = JSON.parse(state.output); } catch { recoveryFailure("preflight-readiness-invalid"); }
      if (Number.isFinite(commandEnd) && Number.isFinite(state.time?.start) &&
          state.time.start >= commandEnd && output.status === "READY" && output.pending_count === 0 &&
          (!run || output.run_id === run.runId)) ready = true;
    } else recoveryFailure("preflight-unexpected-tool");
  }
  if (!submitted || commandCount !== 1 || !ready) recoveryFailure("preflight-proof-missing");
  return { preflightRequestId: recovery.preflightRequestId, requestIds: [submitted.requestId],
    approvalIds: [submitted.approval_id], nativeToolCount: parts.length,
    nativeToolHash: recoveryToolsHash(parts), reconciledAt: new Date().toISOString(),
    outcome: "EXECUTED_WITHOUT_NATIVE_ONCE", authorizationReference: payload.developerAuthorization,
    nativeParentId: parentInfo.id, nativeParentHash: nativeParentHash(parentInfo) };
}

async function checkRecoveryContext(candidate, blockedRestore = false) {
  if (!blockedRestore && (!job?.armed || terminalGate.status !== "OPEN")) recoveryFailure("job-not-recoverable");
  if (job.currentCabMandate) recoveryFailure("current-mandate-not-closed");
  if (reconcilingPermissions.size || active.size || reminderNotifications.size) {
    recoveryFailure("validation-in-flight");
  }
  for (const validation of validations.values()) {
    if (!httpDecisions.has(validation.requestId)) recoveryFailure("undecided-validation");
  }
  if (status.brokerReadiness?.status !== "READY" ||
      Number(status.brokerReadiness.pending_count) !== 0) {
    recoveryFailure("broker-not-ready");
  }
  let health, path, mcp, busy, permissions;
  try { [health, path, mcp, busy, permissions] = await Promise.all([openCode.info(), openCode.location(job.directory),
    openCode.mcp(), openCode.sessionStatus(job.directory), openCode.permissions(job.directory, permissionScope(candidate.sessionId))]); }
  catch { recoveryFailure('opencode-control-unavailable'); }
  if (!health.version.startsWith('2.') || path.directory !== job.directory ||
      mcp["cgpt-validation"]?.status !== "connected") {
    recoveryFailure("opencode-context-divergent");
  }
  if (!Array.isArray(permissions) || permissions.some((permission) =>
      !run || ownsSession(permission.sessionID) || permission.sessionID === candidate.sessionId)) {
    recoveryFailure("native-permissions-unresolved");
  }
  if (!busy || typeof busy !== "object" || Array.isArray(busy)) recoveryFailure("session-status-invalid");
  for (const id of [job.sessionId, candidate.sessionId]) {
    const session = await openCode.session(id, job.directory);
    if (session.id !== id || session.directory !== job.directory) recoveryFailure("session-context-divergent");
    if (busy[id] && busy[id].type !== "idle") recoveryFailure("session-not-idle");
    if (id === candidate.sessionId && !hasNativeAsk(session, "bash")) {
      recoveryFailure("preflight-native-ask-required");
    }
  }
}

async function checkRecoveryPreflight(recovery, restored = null) {
  const validation = restored?.validation || validations.get(recovery.preflightRequestId);
  const decision = restored?.decision || httpDecisions.get(recovery.preflightRequestId);
  if (!validation || decision?.decision !== "approved" ||
      !validation.operationConsumed || validation.operationInvalidated ||
      validation.operation?.sessionId !== recovery.sessionId ||
      validation.operation?.directory !== job.directory ||
      validation.operation?.target !== "/usr/bin/true") {
    recoveryFailure("preflight-permission-not-consumed");
  }
  const messages = await openCode.messages(recovery.sessionId, job.directory);
  const parts = currentRecoveryTools(recovery, recoveryTools(messages), messages);
  let submitted = false;
  let approvalEnd = null;
  let commandEnd = null;
  let ready = false;
  let commandCount = 0;
  for (const part of parts) {
    const state = part.state;
    if (part.tool === 'cab_codemode_discovery' && state?.status === 'completed' && state.metadata?.cabCodeMode) continue;
    const approvalTool = ["cgpt-validation_request_validation", "cgpt-validation_poll_approval",
      "cgpt-validation_get_approval"].includes(part.tool);
    if (part.tool === "cgpt-validation_request_validation") {
      const input = state?.input;
      if (submitted || input?.requestId !== recovery.preflightRequestId ||
          input.approval_id !== validation.approvalId || input.change_id !== validation.changeId ||
          input.session_id !== recovery.sessionId || input.directory !== job.directory ||
          JSON.stringify(input.files) !== "[]" || JSON.stringify(input.commands) !== '["/usr/bin/true"]') {
        recoveryFailure("preflight-request-divergent");
      }
      submitted = true;
      // Un délai MCP ne remplace pas la preuve : un polling corrélé doit encore réussir.
      if (state.status === "error") continue;
    }
    if (approvalTool && part.tool !== "cgpt-validation_request_validation" &&
        state?.status === "error" &&
        state.error === "MCP error -32001: Request timed out") {
      if (!submitted || state.input?.approval_id !== validation.approvalId) {
        recoveryFailure("preflight-poll-divergent");
      }
      continue;
    }
    if (!state || state.status !== "completed") recoveryFailure("preflight-tool-not-completed");
    if (approvalTool) {
      if (!submitted || (part.tool !== "cgpt-validation_request_validation" &&
          state.input?.approval_id !== validation.approvalId)) recoveryFailure("preflight-poll-divergent");
      let output;
      try { output = JSON.parse(state.output); } catch { recoveryFailure("preflight-approval-invalid"); }
      if (output.requestId !== recovery.preflightRequestId ||
          output.approval_id !== validation.approvalId || output.change_id !== validation.changeId ||
          output.session_id !== recovery.sessionId || output.directory !== job.directory ||
          JSON.stringify(output.files) !== "[]" ||
          JSON.stringify(output.commands) !== '["/usr/bin/true"]') {
        recoveryFailure("preflight-approval-divergent");
      }
      if (output.status === "APPROVED") approvalEnd = state.time?.end;
      else if (output.status !== "PENDING") recoveryFailure("preflight-approval-not-approved");
    } else if (part.tool === "bash") {
      commandCount += 1;
      if (!Number.isFinite(approvalEnd) || !Number.isFinite(state.time?.start) ||
          state.time.start < approvalEnd || state.input?.command !== "/usr/bin/true" ||
          state.metadata?.exit !== 0 || !Number.isFinite(state.time?.end)) {
        recoveryFailure("preflight-command-invalid");
      }
      commandEnd = state.time.end;
    } else if (part.tool === "cgpt-validation_broker_readiness") {
      let output;
      try { output = JSON.parse(state.output); } catch { recoveryFailure("preflight-readiness-invalid"); }
      if (Number.isFinite(commandEnd) && Number.isFinite(state.time?.start) &&
          state.time.start >= commandEnd && output.status === "READY" &&
          output.pending_count === 0) ready = true;
    } else {
      recoveryFailure("preflight-unexpected-tool");
    }
  }
  if (!submitted || commandCount !== 1 || !ready) recoveryFailure("preflight-proof-missing");
}

// Reprise manuelle d'un prévol déjà consommé, attesté par le gate BLOQUÉ
// persistant. Cette reconstruction ne transmet aucune permission native.
async function checkedBlockedPreflightRestore(payload) {
  const proof = payload.restoredPreflightProof;
  if (typeof payload.developerAuthorization !== "string" ||
      !payload.developerAuthorization.trim() || payload.developerAuthorization.length > 500) {
    recoveryFailure("developer-authorization-required");
  }
  if (payload.phase !== "complete" || job.armed || terminalGate.status !== "VALIDATED" ||
      terminalGate.declaredState !== "BLOQUÉ" || !job.recovery ||
      job.revokedSessions?.includes(job.recovery.sessionId) ||
      job.recovery.invalidatedRequestIds?.includes(job.recovery.preflightRequestId) ||
      proof?.blockedGateValidatedAt !== terminalGate.validatedAt) {
    recoveryFailure("blocked-preflight-attestation-required");
  }
  if (!Number.isSafeInteger(proof.nativeToolCount) || proof.nativeToolCount < 1 ||
      typeof proof.nativeToolHash !== "string" || !/^[a-f0-9]{64}$/.test(proof.nativeToolHash)) {
    recoveryFailure("preflight-history-divergent");
  }
  const messages = await openCode.messages(job.recovery.sessionId, job.directory);
  const parts = recoveryTools(messages);
  if (parts.length < proof.nativeToolCount ||
      canonicalRecoveryHash(parts.slice(0, proof.nativeToolCount)) !== proof.nativeToolHash) {
    recoveryFailure("preflight-history-divergent");
  }
  const current = currentRecoveryTools(job.recovery, parts, messages);
  const requests = current.filter((part) => part.tool === "cgpt-validation_request_validation");
  if (requests.length !== 1) recoveryFailure("preflight-request-divergent");
  const request = requests[0];
  const approval = request.state?.input;
  const decision = proof.decision;
  if (!decision || decision.decision !== "approved" ||
      decision.requestId !== job.recovery.preflightRequestId ||
      decision.approval_id !== approval?.approval_id || decision.change_id !== job.changeId ||
      (run && (decision.run_id !== run.runId || approval.run_id !== run.runId ||
        decision.reservation_version !== approval.reservation_version))) {
    recoveryFailure("preflight-approval-divergent");
  }
  const approvedResponse = current.some((part) => {
    if (!["cgpt-validation_request_validation", "cgpt-validation_poll_approval",
      "cgpt-validation_get_approval"].includes(part.tool) || part.state?.status !== "completed") return false;
    let output;
    try { output = JSON.parse(part.state.output); } catch { return false; }
    return output.status === "APPROVED" && output.reviewer === "CGPT" &&
      output.requestId === decision.requestId && output.approval_id === decision.approval_id;
  });
  if (!approvedResponse) recoveryFailure("preflight-approval-not-approved");
  const command = current.find((part) => part.tool === "bash");
  const gateAt = Date.parse(terminalGate.validatedAt);
  if (!command || !Number.isFinite(gateAt) || !Number.isFinite(command.state?.time?.end) ||
      command.state.time.end > gateAt) recoveryFailure("blocked-preflight-attestation-required");
  const sealedReady = parts.slice(0, proof.nativeToolCount).some((part) => {
    if (part.tool !== "cgpt-validation_broker_readiness" || part.state?.status !== "completed" ||
        !Number.isFinite(part.state.time?.start) || !Number.isFinite(part.state.time?.end) ||
        part.state.time.start < command.state.time.end || part.state.time.end > gateAt) return false;
    let output;
    try { output = JSON.parse(part.state.output); } catch { return false; }
    return output.status === "READY" && output.pending_count === 0;
  });
  if (!sealedReady) recoveryFailure("blocked-preflight-attestation-required");
  const preparedAt = Date.parse(job.recovery.preparedAt);
  if (!Number.isFinite(preparedAt) || command.state.time.start < preparedAt || messages.some((message) => message.info?.role === "user" &&
      message.info?.tools?.bash === true && message.info.time?.created >= preparedAt &&
      message.info.time.created <= command.state.time.end)) recoveryFailure("preflight-native-once-not-proved");
  const validation = { requestId: decision.requestId, approvalId: approval.approval_id,
    changeId: job.changeId, operation: approvedOperation(approval), operationConsumed: true,
    operationInvalidated: false };
  if (validation.operation?.sessionId !== job.recovery.sessionId ||
      !verifyRestoredPreflight(approval)) recoveryFailure("preflight-approval-divergent");
  const known = httpDecisions.get(decision.requestId);
  const existing = validations.get(decision.requestId);
  if ((known && JSON.stringify(known) !== JSON.stringify(decision)) ||
      (existing && (!existing.operationConsumed || existing.operationInvalidated))) {
    recoveryFailure("preflight-restore-conflict");
  }
  await checkRecoveryPreflight(job.recovery, { validation, decision });
  return { validation, decision, audit: { authorizationReference: payload.developerAuthorization,
    nativeToolCount: proof.nativeToolCount, nativeToolHash: proof.nativeToolHash,
    blockedGateValidatedAt: terminalGate.validatedAt, restoredAt: new Date().toISOString(),
    requestId: decision.requestId, approvalId: decision.approval_id,
    decisionHash: canonicalRecoveryHash(decision), nativePermissionReplayed: false } };
}

async function recoverJob(payload) {
  const keys = ["jobId", "expectedSessionId", "sessionId", "recoveryId", "preflightRequestId"];
  if (!payload || !["prepare", "retry", "reconcile", "reconcile-rejected", "complete"].includes(payload.phase) ||
      keys.some((key) => typeof payload[key] !== "string" || !payload[key]) ||
      !payload.sessionId.startsWith("ses_") ||
      payload.sessionId === payload.expectedSessionId) recoveryFailure("recovery-contract-invalid");
  if (!job || payload.jobId !== job.jobId || payload.expectedSessionId !== job.sessionId) {
    recoveryFailure("recovery-job-divergent");
  }
  if (payload.phase === "prepare") {
    if (job.recovery || job.revokedSessions?.includes(payload.sessionId) ||
        job.recoveryHistory?.some((entry) => entry.recoveryId === payload.recoveryId ||
          entry.preflightRequestId === payload.preflightRequestId) ||
        validations.has(payload.preflightRequestId) || httpDecisions.has(payload.preflightRequestId)) {
      recoveryFailure("recovery-identity-reused");
    }
  } else if (!job.recovery || keys.some((key) =>
      !(["retry", "reconcile", "reconcile-rejected"].includes(payload.phase) && key === "preflightRequestId") && job.recovery[key] !== payload[key])) {
    recoveryFailure("recovery-not-prepared");
  }
  if (["retry", "reconcile", "reconcile-rejected"].includes(payload.phase) &&
      (payload.previousPreflightRequestId !== job.recovery.preflightRequestId ||
       payload.preflightRequestId === job.recovery.preflightRequestId ||
       validations.has(payload.preflightRequestId) || httpDecisions.has(payload.preflightRequestId) ||
       job.recovery.attempts?.some((attempt) => attempt.requestIds.includes(payload.preflightRequestId)))) {
    recoveryFailure("recovery-identity-reused");
  }
  const restored = payload.restoredPreflightProof === undefined ? null
    : await checkedBlockedPreflightRestore(payload);
  await checkRecoveryContext(payload, Boolean(restored));
  const previousAttempt = payload.phase === "retry"
    ? await checkRecoveryRetry(job.recovery, payload.preflightRequestId)
    : payload.phase === "reconcile" ? await checkExecutedPreflight(job.recovery, payload)
    : payload.phase === "reconcile-rejected" ? await inspectRejectedReconciliation(job.recovery, payload) : null;
  if (payload.phase === "complete") await checkRecoveryPreflight(job.recovery, restored);
  if (status.brokerReadiness?.status !== "READY" ||
      Number(status.brokerReadiness.pending_count) !== 0) recoveryFailure("broker-not-ready");
  const previousJob = job;
  const previousGate = { ...terminalGate };
  const snapshot = structuredClone(job);
  if (payload.phase === "prepare") {
    snapshot.recovery = { ...Object.fromEntries(keys.map((key) => [key, payload[key]])),
      preparedAt: new Date().toISOString() };
  const preparationParts = recoveryTools(await openCode.messages(payload.sessionId, job.directory));
    if (preparationParts.some((part) => !isPreparationDiagnostic(part, preparationParts) ||
        !["completed", "error"].includes(part.state?.status))) recoveryFailure("preflight-preparation-tool-forbidden");
    snapshot.recovery.preparationHistory = { nativeToolCount: preparationParts.length,
      nativeToolHash: recoveryToolsHash(preparationParts) };
    snapshot.revokedSessions = [...new Set([...(snapshot.revokedSessions || []), job.sessionId])];
    snapshot.recovery.invalidatedRequestIds = [...validations.values()]
      .filter((validation) => validation.operation?.sessionId === job.sessionId)
      .map((validation) => validation.requestId);
  } else if (["retry", "reconcile", "reconcile-rejected"].includes(payload.phase)) {
    snapshot.recovery.attempts = [...(snapshot.recovery.attempts || []), previousAttempt];
    snapshot.recovery.preflightRequestId = payload.preflightRequestId;
  } else {
    snapshot.sessionId = payload.sessionId;
    if (restored) {
      snapshot.armed = true;
      snapshot.disarmedAt = null;
      snapshot.recovery.restoredPreflight = restored.audit;
    }
    snapshot.recoveryHistory = [...(snapshot.recoveryHistory || []),
      { ...snapshot.recovery, completedAt: new Date().toISOString() }];
    snapshot.recovery = null;
  }
  job = snapshot;
  resetTerminalGate("session-recovery", false);
  try {
    await persistJob();
  } catch {
    job = previousJob;
    Object.assign(terminalGate, previousGate);
    recoveryFailure("recovery-persistence-failed");
  }
  if (restored) {
    validations.set(restored.validation.requestId, restored.validation);
    httpDecisions.set(restored.validation.requestId, restored.decision);
    answered.add(restored.validation.requestId);
  }
  if (payload.phase === "reconcile") {
    const previousValidation = validations.get(previousAttempt.preflightRequestId);
    if (previousValidation) previousValidation.operationInvalidated = true;
  }
  for (const validation of validations.values()) {
    if (job.revokedSessions?.includes(validation.operation?.sessionId)) {
      validation.operationInvalidated = true;
    }
  }
  updateStatus(`job-recovery-${payload.phase}`, { recoveryId: payload.recoveryId });
  return publicJob();
}

function matchesApprovedOperation(permission, operation) {
  if (!operation || job?.revokedSessions?.includes(operation.sessionId) ||
      permission.sessionID !== operation.sessionId) {
    return false;
  }

  if (operation.kind === "edit" && permission.permission === "edit") {
    const filePath = permission.metadata?.filepath;
    const prefix = `${operation.directory}/`;

    return (
      typeof filePath === "string" &&
      filePath.startsWith(prefix) &&
      filePath.slice(prefix.length) === operation.target
    );
  }

  if (
    operation.kind !== "bash" ||
    permission.permission !== "bash" ||
    typeof permission.metadata?.command !== "string"
  ) {
    return false;
  }

  const command = permission.metadata.command;
  const strictCommands =
    job?.recovery?.sessionId === operation.sessionId ||
    (job?.strictCommands === true && job.directory === operation.directory);

  return (
    command === operation.target ||
    (!strictCommands &&
      command === `${operation.target}${opencodeExitStatusSuffix}`)
  );
}

function nativePermissionSummary(permission) {
  if (
    !permission ||
    typeof permission.id !== "string" ||
    !permission.id ||
    typeof permission.sessionID !== "string" ||
    !permission.sessionID ||
    typeof permission.permission !== "string" ||
    !permission.permission
  ) {
    return null;
  }

  return {
    id: permission.id,
    sessionId: permission.sessionID,
    permission: permission.permission,
  };
}

function isCorrelatedNativePermission(permission) {
  for (const validation of validations.values()) {
    if (!validation.operationConsumed && !validation.operationInvalidated &&
        operationAllowed(validation.operation, validation.requestId) &&
        matchesApprovedOperation(permission, validation.operation)) {
      return true;
    }
  }

  return false;
}

function hasSameNativePermissions(next) {
  if (next.size !== unmatchedNativePermissions.size) {
    return false;
  }

  for (const [id, permission] of next) {
    const previous = unmatchedNativePermissions.get(id);

    if (
      !previous ||
      previous.sessionId !== permission.sessionId ||
      previous.permission !== permission.permission
    ) {
      return false;
    }
  }

  return true;
}

function permissionScope(extraSessionId) {
  return run ? { sessionIds: [...new Set([job?.sessionId || run.sessionId,
    job?.recovery?.sessionId, extraSessionId].filter(Boolean))] } : {};
}

async function reconcileNativePermissions() {
  const permissions = await openCode.permissions(workspace, permissionScope());

  const next = new Map();

  for (const permission of permissions) {
    if (run && !ownsSession(permission.sessionID)) continue;
    if (isCorrelatedNativePermission(permission)) {
      continue;
    }

    const summary = nativePermissionSummary(permission);

    if (summary) {
      next.set(summary.id, summary);
    }
  }

  if (hasSameNativePermissions(next)) {
    return;
  }

  unmatchedNativePermissions.clear();

  for (const [id, permission] of next) {
    unmatchedNativePermissions.set(id, permission);
  }

  updateStatus(
    next.size > 0
      ? "opencode-unmatched-native-permissions"
      : "opencode-unmatched-native-permissions-cleared",
    { count: next.size }
  );
}

async function transmitApprovedOperation(validation) {
  if (
    !validation.operation ||
    validation.operationInvalidated ||
    validation.operationConsumed ||
    !operationAllowed(validation.operation, validation.requestId) ||
    reconcilingPermissions.has(validation.requestId)
  ) {
    return;
  }

  reconcilingPermissions.add(validation.requestId);

  try {

    const permissions = await openCode.permissions(validation.operation.directory, permissionScope(validation.operation.sessionId));

    const permission = permissions.find((candidate) =>
      matchesApprovedOperation(candidate, validation.operation)
    );

    if (permission && operationAllowed(validation.operation, validation.requestId, 'permission') &&
        !validation.operationInvalidated) {
      await checkNativeAsk(validation.operation, permission.nativeAction || validation.operation.kind);
      if (!operationAllowed(validation.operation, validation.requestId, 'permission') ||
          validation.operationInvalidated || validation.operationConsumed) return;
      nativeLifecycle.begin?.(validation.operation, validation.requestId, permission);
      await openCode.replyPermission(validation.operation.sessionId, permission.id, 'once', validation.operation.directory);

      validation.operationConsumed = true;
      nativeLifecycle.issued?.(validation.operation, validation.requestId);

      updateStatus("opencode-permission-approved", {
        requestId: validation.requestId,
        permission: permission.permission,
      });
    }
  } catch (cause) {
    nativeLifecycle.unknown?.(validation.operation, validation.requestId);
    throw cause;
  } finally {
    reconcilingPermissions.delete(validation.requestId);
  }
}

function reconcileApprovedOperations() {
  for (const validation of validations.values()) {
    if (httpDecisions.get(validation.requestId)?.decision === "approved") {
      void transmitApprovedOperation(validation).catch((cause) => {
        updateStatus("opencode-permission-reconciliation-failed", {
          requestId: validation.requestId,
          error: cause.message,
        });
      });
    }
  }
}

function startPermissionReconciliation() {
  permissionTimer = setInterval(() => {
    reconcileApprovedOperations();
    void reconcileNativePermissions().catch((cause) => {
      updateStatus("opencode-permission-observation-failed", {
        error: cause.message,
      });
    });
  }, reconnectMs);
}

function sendCodex(method, params) {
  const id = nextId++;

  codex.stdin.write(
    `${JSON.stringify({
      method,
      id,
      params,
    })}\n`
  );

  return id;
}

function parseDecision(text) {
  const candidate = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/, "");

  const value = JSON.parse(candidate);

  if (
    !value ||
    !["approved", "rejected", "needs_clarification"].includes(
      value.decision
    ) ||
    typeof value.rationale !== "string" ||
    typeof value.instructions !== "string"
  ) {
    throw new Error("Décision Codex invalide.");
  }

  return value;
}

function decisionSchema() {
  return {
    type: "object",
    properties: {
      decision: {
        type: "string",
        enum: [
          "approved",
          "rejected",
          "needs_clarification",
        ],
      },
      rationale: {
        type: "string",
      },
      instructions: {
        type: "string",
      },
    },
    required: [
      "decision",
      "rationale",
      "instructions",
    ],
    additionalProperties: false,
  };
}

function rejectAll(message) {
  for (const waiter of rpcWaiters.values()) {
    waiter.reject(new Error(message));
  }

  rpcWaiters.clear();

  for (const turn of turns.values()) {
    turn.reject(new Error(message));
  }

  turns.clear();
  turnStarts.clear();
}

function onCodexLine(line) {
  let message;

  try {
    message = JSON.parse(line);
  } catch {
    return;
  }

  if (message.id && rpcWaiters.has(message.id)) {
    const waiter = rpcWaiters.get(message.id);

    rpcWaiters.delete(message.id);

    if (message.error) {
      waiter.reject(
        new Error(message.error.message)
      );
    } else {
      waiter.resolve(message.result);
    }

    return;
  }

  if (message.id && turnStarts.has(message.id)) {
    const turn = turnStarts.get(message.id);

    turnStarts.delete(message.id);

    if (
      message.error ||
      !message.result?.turn?.id
    ) {
      turn.reject(
        new Error(
          message.error?.message ||
            "Réponse turn/start Codex invalide."
        )
      );

      return;
    }

    turn.turnId = message.result.turn.id;
    turns.set(turn.turnId, turn);

    return;
  }

  if (
    message.method ===
    "item/agentMessage/delta"
  ) {
    const turn = turns.get(
      message.params?.turnId
    );

    if (turn) {
      turn.text +=
        message.params?.delta || "";
    }

    return;
  }

  if (
    message.method === "item/completed" &&
    message.params?.item?.type ===
      "agentMessage"
  ) {
    const turn = turns.get(
      message.params?.turnId
    );

    if (
      turn &&
      typeof message.params.item.text ===
        "string"
    ) {
      turn.finalText =
        message.params.item.text;
    }

    return;
  }

  if (message.method === "turn/completed") {
    const turn = turns.get(
      message.params?.turn?.id
    );

    if (!turn) {
      return;
    }

    turns.delete(turn.turnId);

    if (
      message.params.turn.status !==
      "completed"
    ) {
      turn.reject(
        new Error(
          `Tour Codex terminé avec l'état ${message.params.turn.status}.`
        )
      );

      return;
    }

    if (turn.kind === "reminder") {
      turn.resolve(turn.finalText || turn.text);
      return;
    }

    try {
      turn.resolve(
        parseDecision(
          turn.finalText || turn.text
        )
      );
    } catch (cause) {
      turn.reject(cause);
    }
  }
}

function startCodex() {
  codex = spawn(
    codexCommand,
    ["app-server"],
    {
      stdio: [
        "pipe",
        "pipe",
        "inherit",
      ],
    }
  );

  status.appServer = "starting";
  updateStatus("app-server-starting");

  codex.on("error", (cause) => {
    rejectAll(
      `Impossible de démarrer Codex App Server : ${cause.message}`
    );
  });

  codex.on("exit", (code) => {
    status.appServer = "stopped";

    updateStatus(
      "app-server-stopped",
      {
        code: code ?? "unknown",
      }
    );

    rejectAll(
      "Codex App Server s'est arrêté."
    );
  });

  readline
    .createInterface({
      input: codex.stdout,
    })
    .on("line", onCodexLine);

  sendCodex("initialize", {
    clientInfo: {
      name: "cgpt-approval-bridge-controller",
      version: "2.1.19",
    },
  });

  codex.stdin.write(
    `${JSON.stringify({
      method: "initialized",
      params: {},
    })}\n`
  );
}

function callCodex(method, params) {
  return new Promise(
    (resolve, reject) => {
      const id = sendCodex(
        method,
        params
      );

      rpcWaiters.set(id, {
        resolve,
        reject,
      });
    }
  );
}

async function ensureThread() {
  if (codexThreadId) {
    return codexThreadId;
  }

  const result = await callCodex(
    "thread/start",
    {
      cwd: workspace,
      sandboxPolicy: {
        type: "readOnly",
      },
    }
  );

  codexThreadId = result.thread.id;

  status.appServer = "ready";
  updateStatus("app-server-ready");

  return codexThreadId;
}

async function decide(request) {
  const threadId = await ensureThread();

  const prompt = [
    "Tu es l'orchestrateur et validateur de la session de codage OpenCode.",
    "Évalue et décide uniquement le mandat unitaire fourni, sans modifier de fichier, lancer de commande, élargir le périmètre ni déléguer cette décision.",
    "Toute opération, y compris un archivage OpenSpec, exige sa propre décision explicite et corrélée.",
    "Réponds exclusivement selon le schéma JSON imposé.",
    JSON.stringify(request),
  ].join("\n\n");

  return new Promise(
    (resolve, reject) => {
      const startId = sendCodex(
        "turn/start",
        {
          threadId,
          input: [
            {
              type: "text",
              text: prompt,
            },
          ],
          outputSchema:
            decisionSchema(),
        }
      );

      turnStarts.set(startId, {
        text: "",
        finalText: "",
        resolve,
        reject,
      });
    }
  );
}

async function persistReminderNotification(reminder, reason) {
  const notification = {
    requestId: reminder.requestId,
    approval_id: reminder.approvalId,
    change_id: reminder.changeId,
    age_seconds: reminder.ageSeconds,
    reason,
    recordedAt: new Date().toISOString(),
  };
  reminderNotifications.set(reminder.requestId, notification);
  await mkdir(dirname(reminderStatePath), { recursive: true });
  const temporaryPath = `${reminderStatePath}.tmp`;
  await writeFile(
    temporaryPath,
    JSON.stringify(Object.fromEntries(reminderNotifications), null, 2),
    "utf8"
  );
  await rename(temporaryPath, reminderStatePath);
}

async function notifyOrchestrator(reminder) {
  if (decisionMode === "manual") {
    updateStatus("validation-awaiting-manual-decision", {
      requestId: reminder.requestId,
    });
    return;
  }

  const threadId = await ensureThread();
  const prompt = [
    "RAPPEL_CAB",
    "Une décision CAB reste en attente. Examine le mandat corrélé, décide explicitement, demande une clarification ou maintiens l'attente.",
    "N'approuve jamais implicitement et n'exécute aucune opération.",
    JSON.stringify(reminder),
  ].join("\n\n");
  return new Promise((resolve, reject) => {
    const startId = sendCodex("turn/start", {
      threadId,
      input: [{ type: "text", text: prompt }],
    });
    turnStarts.set(startId, {
      kind: "reminder",
      text: "",
      finalText: "",
      resolve,
      reject,
    });
  });
}

function scheduleReminderHeartbeat(reminder) {
  setTimeout(() => {
    void notifyOrchestrator(reminder).catch(async () => {
      await persistReminderNotification(reminder, "heartbeat-unavailable");
    });
  }, 30_000);
}

async function handleValidation(request) {
  if (
    !request ||
    typeof request.requestId !==
      "string" ||
    typeof request.approvalId !==
      "string" ||
    typeof request.changeId !==
      "string" ||
    typeof request.summary !== "string"
  ) {
    return;
  }

  if (
    active.has(request.requestId) ||
    answered.has(request.requestId) ||
    httpDecisions.has(
      request.requestId
    )
  ) {
    return;
  }

  const entry = {
    requestId: request.requestId,
    receivedAt:
      new Date(request.receivedAt ?? Date.now()).toISOString(),
  };

  resetTerminalGate("validation-received");

  active.set(
    request.requestId,
    entry
  );

  status.activeValidations.push(
    entry
  );

  updateStatus(
    "validation-received",
    {
      requestId: request.requestId,
      receivedAt: Date.parse(entry.receivedAt),
    }
  );

  if (decisionMode === "manual") {
    updateStatus(
      "validation-awaiting-manual-decision",
      {
        requestId: request.requestId,
      }
    );

    active.delete(request.requestId);
    status.activeValidations = status.activeValidations.filter(
      (value) => value !== entry
    );
    return;
  }

  try {
    const decision = await decide({
      type: "NDOC",
      sessionId: request.operation?.sessionId || "oc-mcp",
      runId: run?.runId || null,
      reservationVersion: request.operation?.reservationVersion || null,
      resources: request.operation?.resources || [],
      requestId: request.requestId,
      summary: request.summary,
      operation: request.operation
        ? {
            sessionId: request.operation.sessionId,
            directory: request.operation.directory,
            kind: request.operation.kind,
            target: request.operation.target,
          }
        : null,
    });

    if (
      ![
        "approved",
        "rejected",
        "needs_clarification",
      ].includes(decision.decision)
    ) {
      throw new Error(
        "Décision contrôleur invalide."
      );
    }

    if (
      httpDecisions.has(
        request.requestId
      ) ||
      answered.has(
        request.requestId
      )
    ) {
      return;
    }

    if (decision.decision === "approved") await checkNativeAsk(request.operation);
    if (httpDecisions.has(request.requestId) || answered.has(request.requestId) ||
        (decision.decision === 'approved' && (request.operationInvalidated ||
          !operationAllowed(request.operation, request.requestId)))) return;

    httpDecisions.set(request.requestId, {
      ...decision,
      requestId: request.requestId,
      approval_id: request.approvalId,
      change_id: request.changeId,
      ...(run ? { run_id: run.runId, reservation_version: request.operation?.reservationVersion,
        operation_id: request.operation?.operationId, operation_digest: request.operation?.operationDigest,
        expected_revisions: request.operation?.expectedRevisions,
        coordination_protocol: request.operation?.coordinationProtocol, resources: request.operation?.resources,
        access_id: request.operation?.accessId } : {}),
    });

    answered.add(
      request.requestId
    );

    updateStatus(
      "validation-answered",
      {
        requestId:
          request.requestId,
        decision:
          decision.decision,
      }
    );

    if (decision.decision === "approved") {
      try {
        await transmitApprovedOperation(request);
      } catch (cause) {
        updateStatus(
          "opencode-permission-reconciliation-failed",
          {
            requestId: request.requestId,
            error: cause.message,
          }
        );
      }
    }
  } catch (cause) {
    updateStatus(
      "validation-failed",
      {
        requestId:
          request.requestId,
        error: cause.message,
      }
    );
  } finally {
    active.delete(
      request.requestId
    );

    status.activeValidations =
      status.activeValidations.filter(
        (value) =>
          value !== entry
      );
  }
}

async function reconcileOpenCode() {
  await openCode.info(true);

  updateStatus(
    "opencode-reconciled"
  );

  await reconcileNativePermissions();
}

async function readJson(request) {
  if (request.cabPayload !== undefined) return request.cabPayload;
  let body = "";

  for await (const chunk of request) {
    body += chunk;
  }

  return JSON.parse(
    body || "{}"
  );
}

const handle = async (request, response, url) => {
  if (request.method === 'POST' && url.pathname === '/job/model-transition') {
    try {
      const result = await modelTransitions.handle(await readJson(request));
      await persistJob();
      response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      response.end(JSON.stringify(result));
    } catch (cause) {
      response.writeHead(409, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      response.end(JSON.stringify({ error: /^[a-z][a-z0-9-]{1,90}$/.test(cause.code || '') ? cause.code : 'model-transition-failed' }));
    }
    return;
  }
  if (request.method === 'POST' && (modelTransitions.inFlight || job?.modelTransition) &&
      ['/job/arm','/job/recover','/job/disarm','/job/progress','/job/terminal-gate'].includes(url.pathname)) {
    response.writeHead(409, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'model-transition-pending' })); return;
  }

    if (
      request.method === "GET" &&
      url.pathname === "/status"
    ) {
      response.writeHead(
        200,
        {
          "cache-control":
            "no-store",
          "content-type":
            "application/json",
        }
      );

      response.end(
        JSON.stringify(
          publicStatus()
        )
      );

      return;
    }

    if (request.method === "GET" && url.pathname === "/job") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(publicJob()));
      return;
    }

    if (request.method === 'POST' && lifecycleTransitionInFlight && url.pathname.startsWith('/job/')) {
      response.writeHead(409, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'lifecycle-transition-in-flight' }));
      return;
    }

    if (request.method === "POST" && url.pathname === "/job/recover") {
      if (recoveryTransitionInFlight) {
        response.writeHead(409, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "recovery-transition-in-flight" }));
        return;
      }
      recoveryTransitionInFlight = true;
      try {
        const recovered = await recoverJob(await readJson(request));
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify(recovered));
      } catch (cause) {
        response.writeHead(409, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: cause.message }));
      } finally {
        recoveryTransitionInFlight = false;
      }
      return;
    }

    if (request.method === "POST" && recoveryTransitionInFlight &&
        (url.pathname.startsWith("/job/") || url.pathname.startsWith("/validation/") ||
         url.pathname.startsWith("/decision/"))) {
      response.writeHead(409, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "recovery-transition-in-flight" }));
      return;
    }

    if (request.method === "POST" && url.pathname === "/job/arm") {
      try {
        const candidate = validJobContract(await readJson(request));

        if (!candidate) {
          throw new Error("Contrat de job invalide.");
        }

        if (
          job &&
          job.armed &&
          (job.jobId !== candidate.jobId || job.sessionId !== candidate.sessionId)
        ) {
          response.writeHead(409, { "content-type": "application/json" });
          response.end(JSON.stringify({ error: "job-already-armed" }));
          return;
        }

        if (
          job &&
          job.jobId === candidate.jobId &&
          job.sessionId !== candidate.sessionId
        ) {
          response.writeHead(409, { "content-type": "application/json" });
          response.end(JSON.stringify({ error: "job-session-immutable" }));
          return;
        }

        if (job?.recovery || (job?.jobId === candidate.jobId &&
            job.revokedSessions?.includes(candidate.sessionId))) {
          response.writeHead(409, { "content-type": "application/json" });
          response.end(JSON.stringify({ error: "job-session-revoked-or-recovering" }));
          return;
        }
        if (job?.jobId === candidate.jobId) {
          if (job.modelTransitionHistory) candidate.modelTransitionHistory = structuredClone(job.modelTransitionHistory);
          if (job.codingModel) {
            if (candidate.codingModel && ['providerID','modelID','reasoning','source','mode','priority'].some((key) =>
              job.codingModel[key] !== candidate.codingModel[key])) throw new Error('job-coding-model-immutable');
            candidate.codingModel = structuredClone(job.codingModel);
          } else if (candidate.codingModel) throw new Error('job-coding-model-immutable');
          candidate.recoveryHistory = job.recoveryHistory || [];
          candidate.revokedSessions = job.revokedSessions || [];
          if (job.lifecycle !== undefined) candidate.lifecycle = publicLifecycle(job.lifecycle);
        }
        job = candidate;
        resetTerminalGate("job-armed", false);
        await persistJob();
        updateStatus("job-armed", { jobId: job.jobId });
        response.writeHead(201, { "content-type": "application/json" });
        response.end(JSON.stringify(publicJob()));
      } catch (cause) {
        response.writeHead(400, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: cause.message }));
      }

      return;
    }

    if (request.method === "POST" && url.pathname === "/job/progress") {
      let ownsLifecycleTransition = false;
      try {
        const payload = await readJson(request);
        if (lifecycleTransitionInFlight) {
          response.writeHead(409, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ error: 'lifecycle-transition-in-flight' }));
          return;
        }

        if (
          !job ||
          !job.armed ||
          payload?.jobId !== job.jobId ||
          (payload.lastProvenMilestone !== undefined &&
            typeof payload.lastProvenMilestone !== "string") ||
          (payload.currentCabMandate !== undefined &&
            typeof payload.currentCabMandate !== "string")
        ) {
          throw new Error("Progression de job invalide.");
        }

        const declaresStep = ['stepId', 'stepStatus', 'expectedStepSequence'].some((key) => Object.hasOwn(payload, key));
        if (declaresStep) {
          if (terminalGate.status !== 'OPEN') throw new Error('lifecycle-terminal-gate-validated');
          const lifecycle = nextLifecycle(job.lifecycle, payload.stepId, payload.stepStatus, payload.expectedStepSequence);
          const changed = lifecycle.sequence !== (job.lifecycle?.sequence || 0);
          const candidate = { ...job, lifecycle };
          if (payload.lastProvenMilestone !== undefined) candidate.lastProvenMilestone = payload.lastProvenMilestone;
          if (payload.currentCabMandate !== undefined) candidate.currentCabMandate = payload.currentCabMandate;
          ownsLifecycleTransition = true;
          lifecycleTransitionInFlight = true;
          await persistJob(candidate);
          job = candidate;
          if (changed) updateStatus('lifecycle-step-changed', { stepId: lifecycle.history.at(-1).id,
            stepStatus: lifecycle.history.at(-1).status, stepSequence: lifecycle.sequence });
        } else {
          if (payload.lastProvenMilestone !== undefined) job.lastProvenMilestone = payload.lastProvenMilestone;
          if (payload.currentCabMandate !== undefined) job.currentCabMandate = payload.currentCabMandate;
          await persistJob();
        }
        updateStatus("job-progress", { jobId: job.jobId });
        response.writeHead(202, { "content-type": "application/json" });
        response.end(JSON.stringify(publicJob()));
      } catch (cause) {
        response.writeHead(400, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: cause.message }));
      } finally {
        if (ownsLifecycleTransition) lifecycleTransitionInFlight = false;
      }

      return;
    }

    if (request.method === "POST" && url.pathname === "/job/disarm") {
      try {
        const payload = await readJson(request);

        if (!job || payload?.jobId !== job.jobId) {
          throw new Error("Job inconnu.");
        }

        if (terminalGate.status !== "VALIDATED") {
          response.writeHead(409, { "content-type": "application/json" });
          response.end(JSON.stringify({ error: "terminal-gate-open" }));
          return;
        }

        job.armed = false;
        job.disarmedAt = new Date().toISOString();
        await persistJob();
        updateStatus("job-disarmed", { jobId: job.jobId });
        response.writeHead(202, { "content-type": "application/json" });
        response.end(JSON.stringify(publicJob()));
      } catch (cause) {
        response.writeHead(400, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: cause.message }));
      }

      return;
    }

    if (
      request.method === "POST" &&
      url.pathname === "/job/terminal-gate"
    ) {
      try {
        const payload = await readJson(request);
        const declaredState = payload?.state;
        const reason = terminalGateFailure(declaredState);

        if (reason) {
          resetTerminalGate(reason);
          updateStatus("terminal-gate-refused", { reason });
          response.writeHead(409, { "content-type": "application/json" });
          response.end(JSON.stringify({ status: "OPEN", reason }));
          return;
        }

        terminalGate.status = "VALIDATED";
        terminalGate.reason = "terminal-gate-validated";
        terminalGate.declaredState = declaredState;
        terminalGate.validatedAt = new Date().toISOString();
        await persistJob();
        updateStatus("terminal-gate-validated", { declaredState });
        response.writeHead(201, { "content-type": "application/json" });
        response.end(JSON.stringify({
          status: terminalGate.status,
          declaredState,
          validatedAt: terminalGate.validatedAt,
        }));
      } catch (cause) {
        response.writeHead(400, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: cause.message }));
      }

      return;
    }

    if (
      request.method === "POST" &&
      url.pathname ===
        "/broker/readiness"
    ) {
      try {
        const payload =
          await readJson(request);

        if (
          !payload ||
          ![
            "READY",
            "DEGRADED",
            "BLOCKED",
            "HUMAN_REQUIRED",
          ].includes(payload.status)
        ) {
          throw new Error(
            "Readiness broker invalide."
          );
        }

        status.brokerReadiness =
          payload;

        if (Number(payload.pending_count || 0) > 0) {
          resetTerminalGate("pending-validations");
        }

        status.brokerReadinessReceivedAt =
          new Date().toISOString();

        updateStatus(
          "broker-readiness",
          {
            brokerStatus:
              payload.status,
            rootCause:
              payload.root_cause ||
              "NONE",
          }
        );

        response.writeHead(
          202,
          {
            "content-type":
              "application/json",
          }
        );

        response.end(
          JSON.stringify({
            accepted: true,
            status:
              payload.status,
          })
        );
      } catch {
        response
          .writeHead(400)
          .end();
      }

      return;
    }

    if (
      request.method === "POST" &&
      url.pathname ===
        "/validation/request"
    ) {
      try {
        const payload =
          await readJson(request);

        const approval =
          payload.approval;

        const requestId =
          approval?.requestId;

        const approvalId =
          approval?.approval_id;

        const changeId =
          approval?.change_id;

        if (
          !requestId ||
          typeof requestId !== "string" ||
          !approvalId ||
          typeof approvalId !== "string" ||
          !changeId ||
          typeof changeId !== "string"
        ) {
          throw new Error(
            "Identifiants de validation absents."
          );
        }

        const operation = approvedOperation(approval);
        const admissionAllowed = () => request.cabCommitAdmission
          ? operationContextAllowed(operation, requestId) : operationAllowed(operation, requestId);
        if (!admissionAllowed() || !recoveryApprovalAllowed(approval)) {
          response.writeHead(409, { "content-type": "application/json" });
          request.cabObserveHttpFailure?.("validation-session-not-admitted");
          response.end(JSON.stringify({ error: "validation-session-not-admitted" }));
          return;
        }
        if (!(await nativeAskGuard(operation, response, request))) return;
        if (!admissionAllowed() || !recoveryApprovalAllowed(approval)) {
          response.writeHead(409, { "content-type": "application/json" });
          request.cabObserveHttpFailure?.("validation-session-not-admitted");
          response.end(JSON.stringify({ error: "validation-session-not-admitted" }));
          return;
        }
        const previous =
          validations.get(requestId);

        if (
          previous &&
          (previous.approvalId !== approvalId ||
            previous.changeId !== changeId ||
            JSON.stringify(previous.operation) !== JSON.stringify(operation))
        ) {
          throw new Error(
            "requestId déjà associé à une autre validation."
          );
        }

        if (previous?.rejectionOnly) {
          request.cabCommitAdmission?.();
          response.writeHead(202, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ requestId, status: 'PENDING' }));
          return;
        }

        if (
          !active.has(requestId) &&
          !answered.has(
            requestId
          ) &&
          !httpDecisions.has(
            requestId
          )
        ) {
          const summary =
            typeof approval?.summary ===
              "string" &&
            approval.summary
              ? approval.summary
              : typeof approval?.title ===
                    "string" &&
                  approval.title
                ? approval.title
                : "Validation OpenCode";

          const validation = {
            requestId,
            approvalId,
            changeId,
            summary,
            operation,
            receivedAt: request.cabReceivedAt,
          };

          request.cabCommitAdmission?.();

          validations.set(
            requestId,
            validation
          );

          void handleValidation(validation);
        } else if (!previous) {
          throw new Error(
            "Validation existante sans identité corrélée."
          );
        } else {
          request.cabCommitAdmission?.();
        }

        response.writeHead(
          202,
          {
            "content-type":
              "application/json",
          }
        );

        response.end(
          JSON.stringify({
            requestId,
            status: "PENDING",
          })
        );
      } catch (cause) {
        request.cabObserveHttpFailure?.(cause.code || 'validation-request-invalid');
        if (cause.code === 'command-too-long') {
          response.writeHead(400, { 'content-type': 'application/json' });
          response.end(JSON.stringify(cause.diagnostic));
          return;
        }
        if (cause.code) {
          response.writeHead(cause.status || 409, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ error: cause.code }));
          return;
        }
        response
          .writeHead(400)
          .end();
      }

      return;
    }

    if (
      request.method === "POST" &&
      url.pathname === "/validation/reminder"
    ) {
      try {
        const payload = await readJson(request);
        const approval = payload?.approval;
        const requestId = approval?.requestId;
        const approvalId = approval?.approval_id;
        const changeId = approval?.change_id;
        const operation = approvedOperation(approval);
        const admissionAllowed = () => request.cabCommitAdmission
          ? operationContextAllowed(operation, requestId) : operationAllowed(operation, requestId);
        if (!admissionAllowed() || !recoveryApprovalAllowed(approval)) {
          response.writeHead(409, { "content-type": "application/json" });
          request.cabObserveHttpFailure?.("validation-session-not-admitted");
          response.end(JSON.stringify({ error: "validation-session-not-admitted" }));
          return;
        }
        if (!(await nativeAskGuard(operation, response, request))) return;
        if (!admissionAllowed() || !recoveryApprovalAllowed(approval)) {
          response.writeHead(409, { "content-type": "application/json" });
          request.cabObserveHttpFailure?.("validation-session-not-admitted");
          response.end(JSON.stringify({ error: "validation-session-not-admitted" }));
          return;
        }
        let validation = validations.get(requestId);

        if (!validation && typeof requestId === "string" && typeof approvalId === "string" && typeof changeId === "string") {
          validation = {
            requestId,
            approvalId,
            changeId,
            summary: typeof approval.summary === "string" ? approval.summary : "Validation OpenCode",
            operation: approvedOperation(approval),
          };
        }

        if (
          !validation ||
          validation.approvalId !== approvalId ||
          validation.changeId !== changeId ||
          httpDecisions.has(requestId) ||
          answered.has(requestId)
        ) {
          throw new Error("Relance de validation invalide ou terminale.");
        }

        request.cabCommitAdmission?.();
        validations.set(requestId, validation);

        if (validation.rejectionOnly) {
          response.writeHead(202, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ requestId, status: 'PENDING' }));
          return;
        }

        const reminder = {
          requestId,
          approvalId,
          changeId,
          sessionId: approval.session_id,
          ageSeconds: payload.age_seconds,
          operation: validation.operation,
          lastState: payload.last_state,
        };

        try {
          await notifyOrchestrator(reminder);
          reminderNotifications.delete(requestId);
          updateStatus("validation-reminder-delivered", { requestId });
        } catch {
          scheduleReminderHeartbeat(reminder);
          await persistReminderNotification(reminder, "orchestrator-unavailable");
          updateStatus("validation-reminder-pending", { requestId });
        }

        response.writeHead(202, { "content-type": "application/json" });
        response.end(JSON.stringify({ requestId, status: "PENDING" }));
      } catch (cause) {
        request.cabObserveHttpFailure?.(cause.code || 'validation-request-invalid');
        if (cause.code === 'command-too-long') {
          response.writeHead(400, { 'content-type': 'application/json' });
          response.end(JSON.stringify(cause.diagnostic));
          return;
        }
        if (cause.code) {
          response.writeHead(cause.status || 409, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ error: cause.code }));
          return;
        }
        response.writeHead(400).end();
      }

      return;
    }

    const decisionMatch =
      url.pathname.match(
        /^\/decision\/([^/]+)$/
      );

    if (decisionMatch) {
      const requestId =
        decodeURIComponent(
          decisionMatch[1]
        );

      if (
        request.method === "GET"
      ) {
        const decision =
          httpDecisions.get(
            requestId
          );

        if (!decision) {
          response
            .writeHead(404)
            .end();

          return;
        }

        response.writeHead(
          200,
          {
            "content-type":
              "application/json",
          }
        );

        response.end(
          JSON.stringify(
            decision
          )
        );

        return;
      }

      if (
        request.method === "POST"
      ) {
        try {
          let decision;
          try { decision = await readJson(request); }
          catch (cause) { if (cause instanceof SyntaxError) throw decisionError('decision-invalid-json'); throw cause; }

          if (
            !decision || typeof decision !== 'object' || Array.isArray(decision) || ![
              "approved",
              "rejected",
              "needs_clarification",
            ].includes(
              decision.decision
            )
          ) {
            throw decisionError('decision-invalid');
          }

          if (
            httpDecisions.has(
              requestId
            )
          ) {
            throw decisionError('decision-already-recorded');
          }

          const validation =
            validations.get(requestId);

          if (!validation) {
            throw decisionError('decision-validation-unknown');
          }
          if (validation.rejectionOnly && decision.decision !== 'rejected') {
            throw decisionError('notification-reconciliation-rejection-only');
          }
          if (decision.decision === 'approved') {
            if (validation.operationInvalidated) throw decisionError('decision-operation-invalidated');
            assertDecisionOperation(validation.operation, requestId);
          }

          if (decision.decision === "approved" &&
              !(await nativeAskGuard(validation.operation, response, request))) return;
          if (httpDecisions.has(requestId)) throw decisionError('decision-already-recorded');
          if (decision.decision === 'approved') {
            if (validation.operationInvalidated) throw decisionError('decision-operation-invalidated');
            assertDecisionOperation(validation.operation, requestId);
          }

          httpDecisions.set(requestId, {
            ...decision,
            requestId,
            approval_id:
              validation.approvalId,
            change_id:
              validation.changeId,
            ...(run ? { run_id: run.runId, reservation_version: validation.operation?.reservationVersion,
              operation_id: validation.operation?.operationId, operation_digest: validation.operation?.operationDigest,
              expected_revisions: validation.operation?.expectedRevisions,
              coordination_protocol: validation.operation?.coordinationProtocol, resources: validation.operation?.resources,
              access_id: validation.operation?.accessId } : {}),
          });

          const entry =
            active.get(requestId);

          if (entry) {
            active.delete(
              requestId
            );

            status.activeValidations =
              status.activeValidations.filter(
                (value) =>
                  value !== entry
              );
          }

          answered.add(
            requestId
          );

          updateStatus(
            "validation-manually-answered",
            {
              requestId,
              decision:
                decision.decision,
            }
          );

          if (decision.decision === "approved") {
            void transmitApprovedOperation(validation).catch((cause) => {
              updateStatus(
                "opencode-permission-reconciliation-failed",
                {
                  requestId,
                  error: cause.message,
                }
              );
            });
          }

          response.writeHead(
            201,
            {
              "content-type":
                "application/json",
            }
          );

          response.end(
            JSON.stringify({
              requestId,
              status: "DECIDED",
            })
          );
        } catch (cause) {
          const code = typeof cause?.code === 'string' && DECISION_ERRORS.has(cause.code)
            ? cause.code : 'decision-processing-failed';
          response.writeHead(400, { 'content-type': 'application/json', 'cache-control': 'no-store' });
          response.end(JSON.stringify({ error: code, message: DECISION_ERRORS.get(code),
            decision_recorded: httpDecisions.has(requestId) }));
        }

        return;
      }

      response
        .writeHead(405, {
          allow: "GET, POST",
        })
        .end();

      return;
    }

    response
      .writeHead(404)
      .end();
};

return {
  handle, publicStatus, publicJob, inspectNotificationReconciliation, checkReconciledValidation, installReconciledValidation,
  verifyRejectedRecoveryRelease,
  close: () => {
    if (closePromise) return closePromise;
    closed = true; transportAbort.abort(); clearInterval(permissionTimer);
    closePromise = new Promise((resolveClosed) => {
      if (!codex?.pid || codex.exitCode !== null || codex.signalCode !== null) { resolveClosed(); return; }
      codex.once('close', resolveClosed);
      codex.kill();
    });
    return closePromise;
  },
  hasUnresolvedValidation: () => [...validations.values()].some((v) => !httpDecisions.has(v.requestId) ||
    (httpDecisions.get(v.requestId)?.decision === "approved" && !v.operationConsumed && !v.operationInvalidated)),
  pendingEffects: () => Boolean(job?.currentCabMandate || reconcilingPermissions.size ||
    unmatchedNativePermissions.size || [...validations.values()].some((v) =>
      !httpDecisions.has(v.requestId) || (httpDecisions.get(v.requestId)?.decision === "approved" &&
        !v.operationConsumed && !v.operationInvalidated))),
  sessions: () => [job?.sessionId || run?.sessionId, job?.recovery?.sessionId].filter(Boolean),
  unresolved: () => Boolean(job?.armed || job?.currentCabMandate || reconcilingPermissions.size ||
    unmatchedNativePermissions.size || [...validations.values()].some((v) =>
      !httpDecisions.has(v.requestId) || (httpDecisions.get(v.requestId)?.decision === "approved" &&
        !v.operationConsumed && !v.operationInvalidated))),
  operation: (requestId) => validations.get(requestId)?.operation,
  decision: (requestId) => httpDecisions.get(requestId),
  invalidateOperation: (requestId) => {
    const validation = validations.get(requestId);
    if (validation && !validation.operationConsumed) validation.operationInvalidated = true;
  },
  hasRequest: (requestId) => validations.has(requestId),
  isRejectionOnly: (requestId) => validations.get(requestId)?.rejectionOnly === true,
  start: () => { startCodex(); startPermissionReconciliation(); },
  onConnect: () => { status.opencodeSse = "connected"; },
  onEvent: (event) => {
    status.opencodeSse = "connected";
    updateStatus("opencode-sse-event", { eventType: event.payload?.type || event.type || "unknown" });
    reconcileApprovedOperations();
  },
  onDisconnect: () => { status.opencodeSse = "reconnecting"; },
};
}
