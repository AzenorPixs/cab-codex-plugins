import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const supervisorPath = fileURLToPath(
  new URL(
    "../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs",
    import.meta.url
  )
);

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitFor(check, message) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await check()) return;
    await delay(50);
  }

  throw new Error(message);
}

function controllerStatus() {
  return {
    opencodeSse: "connected",
    activeValidationCount: 0,
    brokerReadiness: { status: "READY", pending_count: 0 },
  };
}

test("CGP07 distingue l'activité ciblée du trafic SSE étranger et du transport", async (context) => {
  const directory = mkdtempSync(join(tmpdir(), "cab-supervisor-sse-scope-"));
  const supervisorPort = await availablePort();
  const statePath = join(directory, "supervisor-state.json");
  const job = { jobId: "job-sse-scope", sessionId: "ses_sse_scope", directory,
    criteria: ["activité corrélée"], armed: true, terminalGate: { status: "OPEN" } };
  writeFileSync(statePath, JSON.stringify({ jobId: job.jobId, sessionId: job.sessionId,
    directory, lastActivityAt: new Date().toISOString() }));
  const controller = createServer((request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(request.url === "/status" ? controllerStatus() : job));
  });
  await new Promise((resolve) => controller.listen(0, "127.0.0.1", resolve));
  const messages = [];
  let stream;
  const opencode = createServer(async (request, response) => {
    if (request.url === "/global/event") {
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.write('data: {"type":"server.connected"}\n\n');
      stream = response;
      return;
    }
    if (request.method === "POST") {
      let body = "";
      for await (const chunk of request) body += chunk;
      messages.push({ url: request.url, body: JSON.parse(body) });
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ id: job.sessionId, directory }));
  });
  await new Promise((resolve) => opencode.listen(0, "127.0.0.1", resolve));
  const supervisor = spawn(process.execPath, [supervisorPath], {
    env: { ...process.env, OC_Codex_WORKSPACE: directory,
      OC_Codex_CONTROLLER_URL: `http://127.0.0.1:${controller.address().port}`,
      OC_Codex_OPENCODE_URL: `http://127.0.0.1:${opencode.address().port}`,
      OC_Codex_SUPERVISOR_STATUS_HOST: "127.0.0.1",
      OC_Codex_SUPERVISOR_STATUS_PORT: String(supervisorPort),
      OC_Codex_SUPERVISOR_STATE_PATH: statePath,
      OC_Codex_SUPERVISOR_RESUME_DELAY_MS: "1000", OC_Codex_SUPERVISOR_POLL_INTERVAL_MS: "250" },
    stdio: "ignore",
  });
  let traffic;
  context.after(async () => {
    clearInterval(traffic);
    const stopped = new Promise((resolve) => supervisor.once("exit", resolve));
    supervisor.kill("SIGTERM");
    await stopped;
    controller.closeAllConnections();
    opencode.closeAllConnections();
    await new Promise((resolve) => controller.close(resolve));
    await new Promise((resolve) => opencode.close(resolve));
    rmSync(directory, { recursive: true, force: true });
  });
  const status = async () => (await fetch(`http://127.0.0.1:${supervisorPort}/status`)).json();
  await waitFor(() => Boolean(stream), "Le flux SSE n'a pas été ouvert.");
  const before = (await status()).lastActivityAt;
  stream.write(`data: ${JSON.stringify({ directory, payload: {
    type: "message.updated", properties: { info: { sessionID: job.sessionId } },
  } })}\n\n`);
  let targetedAt;
  await waitFor(async () => {
    targetedAt = (await status()).lastActivityAt;
    return targetedAt !== before;
  }, "L'activité ciblée n'a pas été observée.");
  const foreign = [
    { directory, payload: { type: "message.updated", properties: { info: { sessionID: "ses_foreign" } } } },
    { directory: "/other", payload: { type: "session.status", properties: { sessionID: job.sessionId } } },
    { type: "server.heartbeat", properties: { sessionID: job.sessionId } },
    { type: "message.updated", properties: {} },
  ];
  function emitForeign() {
    for (const event of foreign) stream.write(`data: ${JSON.stringify(event)}\n\n`);
    stream.write("data: invalid-json\n\n");
  }
  emitForeign();
  await delay(100);
  assert.equal((await status()).lastActivityAt, targetedAt, "Le trafic étranger ne vaut pas activité du job.");
  traffic = setInterval(emitForeign, 40);
  await waitFor(() => messages.length === 1, "Le trafic étranger a empêché la reprise du job inactif.");
  assert.equal(messages[0].url, "/session/ses_sse_scope/message");
  job.sessionId = "ses_sse_transferred";
  await waitFor(() => messages.length === 2, "L'activité de l'ancienne session a retardé le contexte transféré.");
  assert.equal(messages[1].url, "/session/ses_sse_transferred/message");
});

test("relance une seule fois une session armée dont le gate reste ouvert", async (context) => {
  const directory = mkdtempSync(join(tmpdir(), "cab-supervisor-test-"));
  const controllerPort = await availablePort();
  const opencodePort = await availablePort();
  const supervisorPort = await availablePort();
  const messages = [];
  const job = {
    jobId: "job-supervisor-123",
    sessionId: "ses_supervisor_456",
    directory: "/workspace",
    changeId: "change-supervisor-789",
    criteria: ["preuve"],
    lastProvenMilestone: "analyse",
    armed: true,
    terminalGate: { status: "OPEN" },
  };

  const controller = createServer((request, response) => {
    if (request.url === "/status") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(controllerStatus()));
      return;
    }

    if (request.url === "/job") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(job));
      return;
    }

    response.writeHead(404).end();
  });
  await new Promise((resolve) => controller.listen(controllerPort, "127.0.0.1", resolve));

  const opencode = createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/session/ses_supervisor_456") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ id: "ses_supervisor_456" }));
      return;
    }

    if (request.method === "POST" && request.url === "/session/ses_supervisor_456/message") {
      let body = "";
      for await (const chunk of request) body += chunk;
      messages.push(JSON.parse(body));
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ accepted: true }));
      return;
    }

    if (request.method === "GET" && request.url === "/global/event") {
      response.writeHead(200, { "content-type": "text/event-stream" });
      return;
    }

    response.writeHead(404).end();
  });
  await new Promise((resolve) => opencode.listen(opencodePort, "127.0.0.1", resolve));

  const supervisor = spawn(process.execPath, [supervisorPath], {
    env: {
      ...process.env,
      OC_CGPT_WORKSPACE: directory,
      OC_CGPT_CONTROLLER_URL: `http://127.0.0.1:${controllerPort}`,
      OC_CGPT_OPENCODE_URL: `http://127.0.0.1:${opencodePort}`,
      OC_CGPT_SUPERVISOR_STATUS_HOST: "127.0.0.1",
      OC_CGPT_SUPERVISOR_STATUS_PORT: String(supervisorPort),
      OC_CGPT_SUPERVISOR_RESUME_DELAY_MS: "1000",
      OC_CGPT_SUPERVISOR_POLL_INTERVAL_MS: "250",
    },
    stdio: "ignore",
  });

  context.after(async () => {
    supervisor.kill("SIGTERM");
    await new Promise((resolve) => controller.close(resolve));
    await new Promise((resolve) => opencode.close(resolve));
    rmSync(directory, { force: true, recursive: true });
  });

  await waitFor(() => messages.length === 1, "Le superviseur n'a pas relancé la session.");
  assert.match(messages[0].parts[0].text, /REPRISE_CAB_SUPERVISEUR/);
  await delay(400);
  assert.equal(messages.length, 1);
});

test("ne relance pas un job dont le gate est validé", async (context) => {
  const directory = mkdtempSync(join(tmpdir(), "cab-supervisor-terminal-"));
  const controllerPort = await availablePort();
  const opencodePort = await availablePort();
  const supervisorPort = await availablePort();
  let messageCount = 0;

  const controller = createServer((request, response) => {
    const payload = request.url === "/status"
      ? controllerStatus()
      : {
        jobId: "job-terminal-123",
        sessionId: "ses_terminal_456",
        directory: "/workspace",
        criteria: [],
        armed: true,
        terminalGate: { status: "VALIDATED" },
      };
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(payload));
  });
  await new Promise((resolve) => controller.listen(controllerPort, "127.0.0.1", resolve));

  const opencode = createServer((request, response) => {
    if (request.method === "POST") messageCount += 1;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({}));
  });
  await new Promise((resolve) => opencode.listen(opencodePort, "127.0.0.1", resolve));

  const supervisor = spawn(process.execPath, [supervisorPath], {
    env: {
      ...process.env,
      OC_CGPT_WORKSPACE: directory,
      OC_CGPT_CONTROLLER_URL: `http://127.0.0.1:${controllerPort}`,
      OC_CGPT_OPENCODE_URL: `http://127.0.0.1:${opencodePort}`,
      OC_CGPT_SUPERVISOR_STATUS_HOST: "127.0.0.1",
      OC_CGPT_SUPERVISOR_STATUS_PORT: String(supervisorPort),
      OC_CGPT_SUPERVISOR_RESUME_DELAY_MS: "1000",
      OC_CGPT_SUPERVISOR_POLL_INTERVAL_MS: "250",
    },
    stdio: "ignore",
  });

  context.after(async () => {
    supervisor.kill("SIGTERM");
    await new Promise((resolve) => controller.close(resolve));
    await new Promise((resolve) => opencode.close(resolve));
    rmSync(directory, { force: true, recursive: true });
  });

  await delay(1300);
  assert.equal(messageCount, 0);
});

test("restaure l'état persistant de supervision après redémarrage", async (context) => {
  const directory = mkdtempSync(join(tmpdir(), "cab-supervisor-restore-"));
  const controllerPort = await availablePort();
  const opencodePort = await availablePort();
  const supervisorPort = await availablePort();
  const statePath = join(directory, "supervisor-state.json");

  writeFileSync(statePath, JSON.stringify({
    state: "WATCHING",
    reason: "resume-sent",
    lastActivityAt: "2026-09-25T00:00:00.000Z",
    lastResumeAttempt: { result: "sent" },
  }));

  const controller = createServer((request, response) => {
    const payload = request.url === "/status"
      ? controllerStatus()
      : {
        jobId: "job-restore-123",
        sessionId: "ses_restore_456",
        directory: "/workspace",
        criteria: [],
        armed: true,
        terminalGate: { status: "VALIDATED" },
      };
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(payload));
  });
  await new Promise((resolve) => controller.listen(controllerPort, "127.0.0.1", resolve));

  const opencode = createServer((request, response) => {
    response.writeHead(200, { "content-type": "text/event-stream" });
    response.end();
  });
  await new Promise((resolve) => opencode.listen(opencodePort, "127.0.0.1", resolve));

  const supervisor = spawn(process.execPath, [supervisorPath], {
    env: {
      ...process.env,
      OC_CGPT_WORKSPACE: directory,
      OC_CGPT_CONTROLLER_URL: `http://127.0.0.1:${controllerPort}`,
      OC_CGPT_OPENCODE_URL: `http://127.0.0.1:${opencodePort}`,
      OC_CGPT_SUPERVISOR_STATUS_HOST: "127.0.0.1",
      OC_CGPT_SUPERVISOR_STATUS_PORT: String(supervisorPort),
      OC_CGPT_SUPERVISOR_STATE_PATH: statePath,
      OC_CGPT_SUPERVISOR_RESUME_DELAY_MS: "1000",
      OC_CGPT_SUPERVISOR_POLL_INTERVAL_MS: "250",
    },
    stdio: "ignore",
  });

  context.after(async () => {
    supervisor.kill("SIGTERM");
    await new Promise((resolve) => controller.close(resolve));
    await new Promise((resolve) => opencode.close(resolve));
    rmSync(directory, { force: true, recursive: true });
  });

  let status;
  await waitFor(async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${supervisorPort}/status`);
      if (!response.ok) return false;
      status = await response.json();
      return true;
    } catch {
      return false;
    }
  }, "Le superviseur restauré est indisponible.");

  assert.equal(status.lastResumeAttempt.result, "sent");
});

test("gèle les relances pendant la récupération et suit ensuite la session transférée", async (context) => {
  const directory = mkdtempSync(join(tmpdir(), "cab-supervisor-recovery-"));
  const controllerPort = await availablePort();
  const opencodePort = await availablePort();
  const supervisorPort = await availablePort();
  const messages = [];
  const job = {
    jobId: "job-recovery-supervisor", sessionId: "ses_old", directory,
    criteria: ["preuve"], armed: true, terminalGate: { status: "OPEN" },
    recovery: { sessionId: "ses_new" },
  };
  const controller = createServer((request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(request.url === "/status" ? controllerStatus() : job));
  });
  await new Promise((resolve) => controller.listen(controllerPort, "127.0.0.1", resolve));
  const opencode = createServer(async (request, response) => {
    if (request.url === "/global/event") {
      response.writeHead(200, { "content-type": "text/event-stream" });
      return;
    }
    if (request.method === "POST") {
      let body = "";
      for await (const chunk of request) body += chunk;
      messages.push({ url: request.url, body: JSON.parse(body) });
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ id: "ses_new", directory }));
  });
  await new Promise((resolve) => opencode.listen(opencodePort, "127.0.0.1", resolve));
  const supervisor = spawn(process.execPath, [supervisorPath], {
    env: { ...process.env, OC_Codex_WORKSPACE: directory,
      OC_Codex_CONTROLLER_URL: `http://127.0.0.1:${controllerPort}`,
      OC_Codex_OPENCODE_URL: `http://127.0.0.1:${opencodePort}`,
      OC_Codex_SUPERVISOR_STATUS_PORT: String(supervisorPort),
      OC_Codex_SUPERVISOR_RESUME_DELAY_MS: "1000", OC_Codex_SUPERVISOR_POLL_INTERVAL_MS: "250" },
    stdio: "ignore",
  });
  context.after(async () => {
    const stopped = new Promise((resolve) => supervisor.once("exit", resolve));
    supervisor.kill("SIGTERM"); await stopped;
    controller.closeAllConnections(); opencode.closeAllConnections();
    await new Promise((resolve) => controller.close(resolve));
    await new Promise((resolve) => opencode.close(resolve));
    rmSync(directory, { force: true, recursive: true });
  });
  await delay(1300);
  assert.deepEqual(messages, []);
  const status = await (await fetch(`http://127.0.0.1:${supervisorPort}/status`)).json();
  assert.equal(status.reason, "session-recovery-pending");
  job.sessionId = "ses_new"; job.recovery = null;
  await waitFor(() => messages.length === 1, "La session transférée n'a pas été suivie.");
  assert.equal(messages[0].url, "/session/ses_new/message");
  assert.match(messages[0].body.parts[0].text, /REPRISE_CAB_SUPERVISEUR/);
});
