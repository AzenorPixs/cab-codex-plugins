import { fixtureEnvironment } from './helpers/cab-environment.mjs';
import { openCodeV2TestHandler } from './helpers/opencode-v2-test-server.mjs';
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

async function statusFixture(context, initialState) {
  const directory = mkdtempSync(join(tmpdir(), "cab-supervisor-status-"));
  const statePath = join(directory, "supervisor-state.json");
  const port = await availablePort();
  const job = { jobId: "job-status", sessionId: "ses_status", directory, armed: true,
    criteria: ["preuve"], lastProvenMilestone: "tests-proved",
    terminalGate: { status: "OPEN" }, recovery: { sessionId: "ses_next" } };
  if (initialState) writeFileSync(statePath, JSON.stringify(initialState(job)));
  const control = { job, unavailable: false, sessionUnavailable: false, failMessage: false };
  const messages = [];
  const controller = createServer((request, response) => {
    if (control.unavailable) { response.writeHead(503).end(); return; }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(request.url === "/status" ? controllerStatus() : control.job));
  });
  await new Promise((resolve) => controller.listen(0, "127.0.0.1", resolve));
  const opencode = createServer(openCodeV2TestHandler(async (request, response) => {
    if (request.url === "/global/event") {
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.write('data: {"type":"server.connected"}\n\n');
      return;
    }
    if (request.method === "POST") {
      let body = "";
      for await (const chunk of request) body += chunk;
      messages.push({ body: JSON.parse(body), persisted: JSON.parse(readFileSync(statePath, "utf8")) });
      control.job.recovery = { sessionId: "ses_next" };
      if (control.failMessage) { response.writeHead(503).end(); return; }
    } else if (control.sessionUnavailable) {
      response.writeHead(503).end(); return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ id: control.job?.sessionId }));
  }, { directory }));
  await new Promise((resolve) => opencode.listen(0, "127.0.0.1", resolve));
  let supervisor;
  async function stop() {
    if (!supervisor || supervisor.exitCode !== null || supervisor.signalCode !== null) return;
    const stopped = new Promise((resolve) => supervisor.once("exit", resolve));
    supervisor.kill("SIGTERM");
    await stopped;
  }
  async function status() {
    const response = await fetch(`http://127.0.0.1:${port}/status`);
    assert.equal(response.status, 200);
    return response.json();
  }
  async function start() {
    supervisor = spawn(process.execPath, [supervisorPath], {
      env: { ...fixtureEnvironment, OC_Codex_WORKSPACE: directory,
        OC_Codex_CONTROLLER_URL: `http://127.0.0.1:${controller.address().port}`,
        OC_Codex_OPENCODE_URL: `http://127.0.0.1:${opencode.address().port}`,
        OC_Codex_SUPERVISOR_STATUS_PORT: String(port), OC_Codex_SUPERVISOR_STATE_PATH: statePath,
        OC_Codex_SUPERVISOR_RESUME_DELAY_MS: "1000", OC_Codex_SUPERVISOR_POLL_INTERVAL_MS: "250" },
      stdio: "ignore",
    });
    await waitFor(async () => {
      try { return (await status()).jobId === control.job?.jobId; }
      catch (cause) { if (cause instanceof TypeError) return false; throw cause; }
    }, "Le statut du job n'est pas disponible.");
  }
  context.after(async () => {
    await stop();
    controller.closeAllConnections(); opencode.closeAllConnections();
    await new Promise((resolve) => controller.close(resolve));
    await new Promise((resolve) => opencode.close(resolve));
    rmSync(directory, { recursive: true, force: true });
  });
  await start();
  return { directory, statePath, control, messages, status, stop, start };
}

test("publie le jalon et le gate observés sans hériter du job précédent", async (context) => {
  const h = await statusFixture(context);
  let status = await h.status();
  assert.equal(status.lastProvenMilestone, "tests-proved");
  assert.deepEqual(status.terminalGate, { status: "OPEN" });
  assert.equal(status.resumeAttemptCount, 0);
  h.control.job = { ...h.control.job, jobId: "other-job", lastProvenMilestone: null,
    terminalGate: { status: "VALIDATED" } };
  await waitFor(async () => (await h.status()).jobId === "other-job", "Nouveau job non observé.");
  status = await h.status();
  assert.equal(status.lastProvenMilestone, null);
  assert.deepEqual(status.terminalGate, { status: "VALIDATED" });
  assert.equal(status.resumeAttemptCount, 0);
  h.control.job = null;
  await waitFor(async () => (await h.status()).jobId === null, "Job désarmé non observé.");
  assert.equal((await h.status()).terminalGate, null);
  assert.equal((await h.status()).lastProvenMilestone, null);
});

test("compte les émissions réussies et échouées après persistance", async (context) => {
  const h = await statusFixture(context);
  assert.equal((await h.status()).resumeAttemptCount, 0);
  h.control.job.recovery = null;
  await waitFor(async () => (await h.status()).lastResumeAttempt?.result === "sent", "Reprise non envoyée.");
  assert.equal(h.messages[0].persisted.resumeAttemptCount, 1);
  assert.equal((await h.status()).resumeAttemptCount, 1);
  h.control.failMessage = true;
  h.control.job.recovery = null;
  await waitFor(() => h.messages.length === 2, "Émission échouée non observée.");
  await waitFor(async () => (await h.status()).lastResumeAttempt?.result === "failed", "Échec non publié.");
  assert.equal(h.messages[1].persisted.resumeAttemptCount, 2);
  assert.equal((await h.status()).resumeAttemptCount, 2);
});

test("conserve le compteur au redémarrage et au transfert, puis repart à zéro pour un autre job", async (context) => {
  const h = await statusFixture(context, (job) => ({ jobId: job.jobId, sessionId: job.sessionId,
    directory: job.directory, resumeAttemptCount: 7 }));
  assert.equal((await h.status()).resumeAttemptCount, 7);
  await h.stop(); await h.start();
  assert.equal((await h.status()).resumeAttemptCount, 7);
  h.control.job.sessionId = "ses_transferred";
  await waitFor(async () => (await h.status()).sessionId === "ses_transferred", "Transfert non observé.");
  assert.equal((await h.status()).resumeAttemptCount, 7);
  h.control.job = { ...h.control.job, jobId: "job-new" };
  await waitFor(async () => (await h.status()).jobId === "job-new", "Nouveau job non observé.");
  assert.equal((await h.status()).resumeAttemptCount, 0);
});

test("garde inconnu le compteur historique même après une nouvelle émission", async (context) => {
  const h = await statusFixture(context, (job) => ({ jobId: job.jobId, sessionId: job.sessionId,
    directory: job.directory, lastResumeAttempt: { result: "sent" } }));
  assert.equal((await h.status()).resumeAttemptCount, null);
  h.control.job.recovery = null;
  await waitFor(() => h.messages.length === 1, "Reprise historique non émise.");
  assert.equal(h.messages[0].persisted.resumeAttemptCount, null);
  assert.equal((await h.status()).resumeAttemptCount, null);
});

test("une préparation abandonnée ou une réconciliation échouée ne compte pas une émission", async (context) => {
  const h = await statusFixture(context);
  h.control.sessionUnavailable = true;
  h.control.job.recovery = null;
  await waitFor(async () => (await h.status()).reason === "reconciliation-failed", "Préparation échouée non observée.");
  assert.equal((await h.status()).resumeAttemptCount, 0);
  assert.deepEqual(h.messages, []);
  const before = (await h.status()).lastReconciliationAt;
  h.control.unavailable = true;
  await delay(350);
  const status = await h.status();
  assert.equal(status.lastReconciliationAt, before);
  assert.equal(status.lastProvenMilestone, "tests-proved");
  assert.equal(status.resumeAttemptCount, 0);
});

test("un échec de persistance interdit l'émission et conserve le compteur", async (context) => {
  const h = await statusFixture(context);
  await waitFor(() => existsSync(h.statePath), "État initial non persisté.");
  rmSync(h.statePath);
  mkdirSync(h.statePath);
  h.control.job.recovery = null;
  await waitFor(async () => (await h.status()).reason === "resume-persistence-failed", "Échec de persistance non publié.");
  assert.equal((await h.status()).resumeAttemptCount, 0);
  assert.deepEqual(h.messages, []);
});

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
  const opencode = createServer(openCodeV2TestHandler(async (request, response) => {
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
  }, { directory }));
  await new Promise((resolve) => opencode.listen(0, "127.0.0.1", resolve));
  const supervisor = spawn(process.execPath, [supervisorPath], {
    env: { ...fixtureEnvironment, OC_Codex_WORKSPACE: directory,
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
  const oldTargetedAt = targetedAt;
  stream.write(`data: ${JSON.stringify({ type: 'session.execution.started', location: { directory }, data: { sessionID: job.sessionId } })}\n\n`);
  await waitFor(async () => { targetedAt = (await status()).lastActivityAt; return targetedAt !== oldTargetedAt; }, 'Activité V2 data non observée.');
  const foreign = [
    { type: 'session.execution.started', location: { directory: '/foreign' }, data: { sessionID: job.sessionId } },
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
  assert.equal(new URL(messages[0].url, 'http://localhost').pathname, "/session/ses_sse_scope/message");
  job.sessionId = "ses_sse_transferred";
  await waitFor(() => messages.length === 2, "L'activité de l'ancienne session a retardé le contexte transféré.");
  assert.equal(new URL(messages[1].url, 'http://localhost').pathname, "/session/ses_sse_transferred/message");
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
    directory,
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

  const opencode = createServer(openCodeV2TestHandler(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (request.method === "GET" && url.pathname === "/session/ses_supervisor_456") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ id: "ses_supervisor_456" }));
      return;
    }

    if (request.method === "POST" && url.pathname === "/session/ses_supervisor_456/message") {
      let body = "";
      for await (const chunk of request) body += chunk;
      messages.push(JSON.parse(body));
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ accepted: true }));
      return;
    }

    if (request.method === "GET" && url.pathname === "/global/event") {
      response.writeHead(200, { "content-type": "text/event-stream" });
      return;
    }

    response.writeHead(404).end();
  }, { directory }));
  await new Promise((resolve) => opencode.listen(opencodePort, "127.0.0.1", resolve));

  const supervisor = spawn(process.execPath, [supervisorPath], {
    env: {
      ...fixtureEnvironment,
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

  const opencode = createServer(openCodeV2TestHandler((request, response) => {
    if (request.method === "POST") messageCount += 1;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({}));
  }, { directory }));
  await new Promise((resolve) => opencode.listen(opencodePort, "127.0.0.1", resolve));

  const supervisor = spawn(process.execPath, [supervisorPath], {
    env: {
      ...fixtureEnvironment,
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

  const opencode = createServer(openCodeV2TestHandler((request, response) => {
    response.writeHead(200, { "content-type": "text/event-stream" });
    response.end();
  }, { directory }));
  await new Promise((resolve) => opencode.listen(opencodePort, "127.0.0.1", resolve));

  const supervisor = spawn(process.execPath, [supervisorPath], {
    env: {
      ...fixtureEnvironment,
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
  const opencode = createServer(openCodeV2TestHandler(async (request, response) => {
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
  }, { directory }));
  await new Promise((resolve) => opencode.listen(opencodePort, "127.0.0.1", resolve));
  const supervisor = spawn(process.execPath, [supervisorPath], {
    env: { ...fixtureEnvironment, OC_Codex_WORKSPACE: directory,
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
  assert.equal(new URL(messages[0].url, 'http://localhost').pathname, "/session/ses_new/message");
  assert.match(messages[0].body.parts[0].text, /REPRISE_CAB_SUPERVISEUR/);
});
