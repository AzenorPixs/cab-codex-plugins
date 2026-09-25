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
