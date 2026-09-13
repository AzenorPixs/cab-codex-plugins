import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { isAbsolute } from "node:path";
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
const allowedWorkspaces = new Set([
  "/workspace",
  "/home/devops/datas/cab",
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

if (!workspace) {
  throw new Error(
    "OC_Codex_WORKSPACE doit désigner la racine absolue autorisée du projet."
  );
}

if (!isAbsolute(workspace) || !allowedWorkspaces.has(workspace)) {
  throw new Error(
    "OC_Codex_WORKSPACE doit être une racine CAB absolue autorisée."
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
    activeValidations: status.activeValidations.map(
      ({ requestId, receivedAt }) => ({
        requestId,
        receivedAt,
      })
    ),
    lastEvent: status.lastEvent,
  };
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
      version: "1.0.0",
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
    "Tu es le contrôleur de validation CGPT d'OpenCode.",
    "Évalue uniquement la demande fournie, sans modifier de fichier, lancer de commande ou élargir le périmètre.",
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

  try {
    const decision = await decide({
      type: "NDOC",
      sessionId: "oc-mcp",
      requestId: request.requestId,
      summary: request.summary,
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

  const permissions = await fetch(
    `${opencodeUrl}/permission?directory=${encodeURIComponent(
      workspace
    )}`,
    {
      signal:
        AbortSignal.timeout(10_000),
    }
  );

  if (!permissions.ok) {
    throw new Error(
      `OpenCode permissions HTTP ${permissions.status}.`
    );
  }

  updateStatus(
    "opencode-reconciled"
  );
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
    void consumeOpenCodeEvents();
  }
);
