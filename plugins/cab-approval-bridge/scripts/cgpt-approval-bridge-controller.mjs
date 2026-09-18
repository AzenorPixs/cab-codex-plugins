import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, isAbsolute, join } from "node:path";
import readline from "node:readline";

function envValue(name) {
  const legacyName = name.replace("OC_Codex_", "OC_CGPT_");
  return process.env[name] || process.env[legacyName];
}

const workspace = envValue("OC_Codex_WORKSPACE");
const allowedStatusHosts = new Set([
  "127.0.0.1",
  "::1",
]);

if (envValue("OC_Codex_OUTSIDE_SANDBOX") !== "1") {
  throw new Error(
    "Le contrôleur Codex doit être exécuté hors sandbox (OC_Codex_OUTSIDE_SANDBOX=1 ; alias OC_CGPT_OUTSIDE_SANDBOX accepté)."
  );
}

const opencodeUrl = (
  envValue("OC_Codex_OPENCODE_URL") || "http://127.0.0.1:4096"
).replace(/\/$/, "");

const codexCommand = process.env.CODEX_COMMAND || "codex";
const statusHost = envValue("OC_Codex_STATUS_HOST") || "127.0.0.1";
const statusPort = Number(envValue("OC_Codex_STATUS_PORT") || "8788");
const reconnectMs = Number(envValue("OC_Codex_RECONNECT_MS") || "1000");
const decisionMode = envValue("OC_Codex_DECISION_MODE") || "manual";
const reminderStatePath = join(
  workspace || ".",
  ".opencode",
  "state",
  "cgpt-approval-bridge",
  "controller-reminders.json"
);
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

try {
  const persisted = JSON.parse(readFileSync(reminderStatePath, "utf8"));
  for (const [requestId, notification] of Object.entries(persisted)) {
    reminderNotifications.set(requestId, notification);
  }
} catch {
  // L'absence de notification persistante est l'état initial normal.
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

function updateStatus(type, details = {}) {
  status.lastEvent = {
    at: new Date().toISOString(),
    type,
    ...details,
  };
}

function publicStatus() {
  return {
    startedAt: status.startedAt,
    appServer: status.appServer,
    opencodeSse: status.opencodeSse,
    brokerReadiness: status.brokerReadiness,
    brokerReadinessReceivedAt: status.brokerReadinessReceivedAt,
    activeValidationCount: status.activeValidations.length,
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
    lastEvent: status.lastEvent,
  };
}

function approvedOperation(approval) {
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
    command &&
    command.length <= 2_000;

  if (!files.every(validFile) || !commands.every(validCommand)) {
    throw new Error("Mandat de validation invalide.");
  }

  if (files.length === 1 && commands.length === 0) {
    return { sessionId, directory, kind: "edit", target: files[0] };
  }

  if (files.length === 0 && commands.length === 1) {
    return { sessionId, directory, kind: "bash", target: commands[0] };
  }

  throw new Error(
    "Un mandat de validation doit désigner exactement un fichier ou une commande."
  );
}

function matchesApprovedOperation(permission, operation) {
  if (!operation || permission.sessionID !== operation.sessionId) {
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

  return (
    command === operation.target ||
    command === `${operation.target}${opencodeExitStatusSuffix}`
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
    if (matchesApprovedOperation(permission, validation.operation)) {
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

async function reconcileNativePermissions() {
  const response = await fetch(
    `${opencodeUrl}/permission?directory=${encodeURIComponent(workspace)}`,
    { signal: AbortSignal.timeout(10_000) }
  );

  if (!response.ok) {
    throw new Error(`OpenCode permissions HTTP ${response.status}.`);
  }

  const permissions = await response.json();

  if (!Array.isArray(permissions)) {
    throw new Error("Liste de permissions OpenCode invalide.");
  }

  const next = new Map();

  for (const permission of permissions) {
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
    validation.operationConsumed ||
    reconcilingPermissions.has(validation.requestId)
  ) {
    return;
  }

  reconcilingPermissions.add(validation.requestId);

  try {

    const response = await fetch(
    `${opencodeUrl}/permission?directory=${encodeURIComponent(
      validation.operation.directory
    )}`,
    { signal: AbortSignal.timeout(10_000) }
  );

    if (!response.ok) {
      throw new Error(`OpenCode permissions HTTP ${response.status}.`);
    }

    const permissions = await response.json();

    if (!Array.isArray(permissions)) {
      throw new Error("Liste de permissions OpenCode invalide.");
    }

    const permission = permissions.find((candidate) =>
      matchesApprovedOperation(candidate, validation.operation)
    );

    if (permission) {
      const reply = await fetch(
      `${opencodeUrl}/session/${encodeURIComponent(
        validation.operation.sessionId
      )}/permissions/${encodeURIComponent(permission.id)}?directory=${encodeURIComponent(
        validation.operation.directory
      )}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response: "once" }),
        signal: AbortSignal.timeout(10_000),
      }
    );

      if (!reply.ok || !(await reply.json())) {
        throw new Error(`Réponse permission OpenCode HTTP ${reply.status}.`);
      }

      validation.operationConsumed = true;

      updateStatus("opencode-permission-approved", {
        requestId: validation.requestId,
        permission: permission.permission,
      });
    }
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
  setInterval(() => {
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
      version: "0.72.1",
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
      new Date().toISOString(),
  };

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
      sessionId: "oc-mcp",
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

    httpDecisions.set(request.requestId, {
      ...decision,
      requestId: request.requestId,
      approval_id: request.approvalId,
      change_id: request.changeId,
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
  const health = await fetch(
    `${opencodeUrl}/global/health`,
    {
      signal:
        AbortSignal.timeout(10_000),
    }
  );

  if (!health.ok) {
    throw new Error(
      `OpenCode health HTTP ${health.status}.`
    );
  }

  const value = await health.json();

  if (!value.healthy) {
    throw new Error(
      "OpenCode n'est pas sain."
    );
  }

  updateStatus(
    "opencode-reconciled"
  );

  await reconcileNativePermissions();
}

async function consumeOpenCodeEvents() {
  try {
    await reconcileOpenCode();

    const response = await fetch(
      `${opencodeUrl}/global/event`,
      {
        headers: {
          accept:
            "text/event-stream",
        },
      }
    );

    if (
      !response.ok ||
      !response.body
    ) {
      throw new Error(
        `OpenCode SSE HTTP ${response.status}.`
      );
    }

    status.opencodeSse =
      "connected";

    updateStatus(
      "opencode-sse-connected"
    );

    reconcileApprovedOperations();

    const reader =
      response.body.getReader();

    const decoder =
      new TextDecoder();

    let buffer = "";

    while (true) {
      const {
        done,
        value,
      } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(
        value,
        {
          stream: true,
        }
      );

      const frames =
        buffer.split("\n\n");

      buffer =
        frames.pop() || "";

      for (const frame of frames) {
        const data =
          frame.match(
            /^data:\s*(.+)$/m
          )?.[1];

        if (!data) {
          continue;
        }

        try {
          const event =
            JSON.parse(data);

          updateStatus(
            "opencode-sse-event",
            {
              eventType:
                event.payload
                  ?.type ||
                "unknown",
            }
          );

          reconcileApprovedOperations();
        } catch {
          updateStatus(
            "opencode-sse-invalid-event"
          );
        }
      }
    }

    throw new Error(
      "Flux SSE OpenCode fermé."
    );
  } catch {
    status.opencodeSse =
      "reconnecting";

    updateStatus(
      "opencode-sse-reconnecting"
    );
  }

  setTimeout(() => {
    void consumeOpenCodeEvents();
  }, reconnectMs);
}

async function readJson(request) {
  let body = "";

  for await (const chunk of request) {
    body += chunk;
  }

  return JSON.parse(
    body || "{}"
  );
}

createServer(
  async (request, response) => {
    const url = new URL(
      request.url,
      `http://${statusHost}:${statusPort}`
    );

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

        const previous =
          validations.get(requestId);

        if (
          previous &&
          (previous.approvalId !== approvalId ||
            previous.changeId !== changeId)
        ) {
          throw new Error(
            "requestId déjà associé à une autre validation."
          );
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
            operation: approvedOperation(approval),
          };

          validations.set(
            requestId,
            validation
          );

          void handleValidation(validation);
        } else if (!previous) {
          throw new Error(
            "Validation existante sans identité corrélée."
          );
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
      } catch {
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
        let validation = validations.get(requestId);

        if (!validation && typeof requestId === "string" && typeof approvalId === "string" && typeof changeId === "string") {
          validation = {
            requestId,
            approvalId,
            changeId,
            summary: typeof approval.summary === "string" ? approval.summary : "Validation OpenCode",
            operation: approvedOperation(approval),
          };
          validations.set(requestId, validation);
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
      } catch {
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
          const decision =
            await readJson(request);

          if (
            ![
              "approved",
              "rejected",
              "needs_clarification",
            ].includes(
              decision.decision
            )
          ) {
            throw new Error(
              "Décision invalide."
            );
          }

          if (
            httpDecisions.has(
              requestId
            )
          ) {
            throw new Error(
              "Décision déjà enregistrée."
            );
          }

          const validation =
            validations.get(requestId);

          if (!validation) {
            throw new Error(
              "Validation inconnue."
            );
          }

          httpDecisions.set(requestId, {
            ...decision,
            requestId,
            approval_id:
              validation.approvalId,
            change_id:
              validation.changeId,
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
        } catch {
          response
            .writeHead(400)
            .end();
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
  }
).listen(
  statusPort,
  statusHost,
  () => {
    updateStatus(
      "controller-listening",
      {
        host: statusHost,
        port: statusPort,
      }
    );

    startCodex();
    startPermissionReconciliation();
    void consumeOpenCodeEvents();
  }
);
