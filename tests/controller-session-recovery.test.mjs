import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const controllerPath = fileURLToPath(new URL(
  "../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs", import.meta.url
));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(check) {
  for (let i = 0; i < 100; i += 1) {
    if (await check()) return;
    await delay(20);
  }
  throw new Error("Condition de test non atteinte.");
}

async function setup(context, strictCommands = true) {
  const directory = mkdtempSync(join(tmpdir(), "cab-recovery-"));
  const fakeCodex = join(directory, "fake-codex.cjs");
  writeFileSync(fakeCodex, "#!/usr/bin/env node\nprocess.stdin.resume();\n", { mode: 0o755 });
  const native = { permissions: [], busy: {}, messages: [], replies: [], path: directory,
    mcp: "connected", health: true, divergentSession: false, unavailable: false,
    delayPath: false, releasePath: null };
  const opencode = createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname === "/global/event") {
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.write('data: {"type":"server.connected","properties":{}}\n\n');
      return;
    }
    if (url.pathname !== "/global/health") {
      assert.equal(url.searchParams.get("directory"), directory);
    }
    if (native.unavailable) { response.writeHead(503).end(); return; }
    if (native.delayPath && url.pathname === "/path") {
      await new Promise((resolve) => { native.releasePath = resolve; });
    }
    let payload;
    if (url.pathname === "/global/health") payload = { healthy: native.health };
    else if (url.pathname === "/path") payload = { directory: native.path };
    else if (url.pathname === "/mcp") payload = { "cgpt-validation": { status: native.mcp } };
    else if (url.pathname === "/session/status") payload = native.busy;
    else if (url.pathname === "/permission") payload = native.permissions;
    else if (url.pathname.endsWith("/message")) payload = native.messages;
    else if (url.pathname.includes("/permissions/")) {
      let body = "";
      for await (const chunk of request) body += chunk;
      native.replies.push({ path: url.pathname, body: JSON.parse(body) });
      native.permissions = native.permissions.filter((p) => !url.pathname.endsWith(`/${p.id}`));
      payload = true;
    } else if (url.pathname.startsWith("/session/")) {
      payload = { id: url.pathname.split("/")[2], directory: native.divergentSession ? "/other" : directory };
    } else { response.writeHead(404).end(); return; }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(payload));
  });
  await new Promise((resolve) => opencode.listen(0, "127.0.0.1", resolve));
  const listener = createServer();
  await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  let controller;
  async function start() {
    controller = spawn(process.execPath, [controllerPath], {
      env: { ...process.env, CODEX_COMMAND: fakeCodex, OC_Codex_WORKSPACE: directory,
        OC_Codex_OUTSIDE_SANDBOX: "1", OC_Codex_OPENCODE_URL: `http://127.0.0.1:${opencode.address().port}`,
        OC_Codex_STATUS_PORT: String(port), OC_Codex_RECONNECT_MS: "25", OC_Codex_DECISION_MODE: "manual" },
      stdio: "ignore",
    });
    await waitFor(async () => {
      try { return (await fetch(`${base}/status`)).ok; } catch { return false; }
    });
  }
  async function stop() {
    const stopped = new Promise((resolve) => controller.once("exit", resolve));
    controller.kill("SIGTERM");
    await stopped;
  }
  const get = async (path) => (await fetch(base + path)).json();
  async function post(path, data) {
    const r = await fetch(base + path, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(data) });
    return { status: r.status, body: await r.json() };
  }
  context.after(async () => {
    await stop();
    opencode.closeAllConnections();
    await new Promise((resolve) => opencode.close(resolve));
    rmSync(directory, { recursive: true, force: true });
  });
  await start();
  await post("/broker/readiness", { status: "READY", pending_count: 0 });
  const contract = { jobId: "job-recovery", sessionId: "ses_old", directory, changeId: "change-recovery",
    criteria: ["preuve"], strictCommands };
  assert.equal((await post("/job/arm", contract)).status, 201);
  await post("/job/progress", { jobId: contract.jobId, lastProvenMilestone: "tests-proved" });
  const recovery = { jobId: contract.jobId, expectedSessionId: "ses_old", sessionId: "ses_new",
    recoveryId: "recovery-1", preflightRequestId: "preflight-1" };
  const approval = (requestId, sessionId = "ses_new", command = "/usr/bin/true") => ({
    requestId, approval_id: `approval-${requestId}`, change_id: "change-recovery", session_id: sessionId,
    directory, files: [], commands: [command], summary: "fixture synthétique" });
  async function validate(a) { return post("/validation/request", { approval: a }); }
  async function approve(id) { return post(`/decision/${id}`, { decision: "approved" }); }
  async function preflight() {
    const a = approval(recovery.preflightRequestId);
    assert.equal((await validate(a)).status, 202);
    assert.equal((await approve(a.requestId)).status, 201);
    native.permissions = [{ id: "permission-preflight", sessionID: "ses_new", permission: "bash",
      metadata: { command: "/usr/bin/true" } }];
    await waitFor(() => native.replies.length === 1);
    native.messages = [{ parts: [
      { type: "tool", tool: "cgpt-validation_request_validation", state: { status: "completed",
        input: a, output: JSON.stringify({ ...a, status: "APPROVED" }), time: { start: 1, end: 2 } } },
      { type: "tool", tool: "bash", state: { status: "completed", input: { command: "/usr/bin/true" },
        metadata: { exit: 0 }, time: { start: 3, end: 4 } } },
      { type: "tool", tool: "cgpt-validation_broker_readiness", state: { status: "completed",
        output: JSON.stringify({ status: "READY", pending_count: 0 }), time: { start: 5, end: 6 } } },
    ] }];
  }
  return { native, get, post, recovery, contract, approval, validate, approve, preflight, start, stop };
}

test("récupère le même job, invalide les anciens mandats et conserve les preuves après redémarrage", async (context) => {
  const h = await setup(context);
  const old = h.approval("old-approved", "ses_old", "printf old");
  assert.equal((await h.validate(old)).status, 202);
  assert.equal((await h.approve(old.requestId)).status, 201);
  let prepared;
  await waitFor(async () => {
    prepared = await h.post("/job/recover", { ...h.recovery, phase: "prepare" });
    if (prepared.status !== 200) assert.equal(prepared.body.error, "validation-in-flight");
    return prepared.status === 200;
  });
  assert.equal(prepared.body.sessionId, "ses_old");
  assert.equal(prepared.body.recovery.recoveryId, h.recovery.recoveryId);
  assert.equal((await h.post("/job/terminal-gate", { state: "TERMINÉ" })).status, 409);
  assert.equal((await h.post("/job/arm", h.contract)).status, 409);
  for (const a of [h.approval("wrong", "ses_wrong"), h.approval("old", "ses_old"),
    h.approval("other", "ses_new"), h.approval("preflight-1", "ses_new", "true")]) {
    assert.equal((await h.validate(a)).status, 409);
  }
  assert.equal((await h.post("/job/recover", { ...h.recovery, phase: "complete" })).status, 409);
  await h.preflight();
  const completed = await h.post("/job/recover", { ...h.recovery, phase: "complete" });
  assert.equal(completed.status, 200);
  assert.equal(completed.body.sessionId, "ses_new");
  for (const key of ["jobId", "directory", "changeId", "criteria", "strictCommands"]) {
    assert.deepEqual(completed.body[key], h.contract[key]);
  }
  assert.equal(completed.body.lastProvenMilestone, "tests-proved");
  assert.equal(completed.body.terminalGate.status, "OPEN");
  assert.equal(completed.body.recovery, null);
  assert.deepEqual(completed.body.revokedSessions, ["ses_old"]);
  assert.equal(completed.body.recoveryHistory.length, 1);
  assert.equal((await h.get(`/decision/${old.requestId}`)).decision, "approved");
  h.native.permissions = [{ id: "stale", sessionID: "ses_old", permission: "bash", metadata: { command: "printf old" } }];
  await delay(120);
  assert.equal(h.native.replies.length, 1);
  h.native.permissions = [];
  assert.equal((await h.validate(h.approval("stale-request", "ses_old"))).status, 409);
  assert.equal((await h.post("/job/recover", { ...h.recovery, phase: "complete" })).status, 409);
  await h.stop(); await h.start();
  const restored = await h.get("/job");
  assert.equal(restored.sessionId, "ses_new");
  assert.equal(restored.recoveryHistory.length, 1);
  assert.deepEqual(restored.revokedSessions, ["ses_old"]);
  assert.equal((await h.validate(h.approval("after-restart", "ses_old"))).status, 409);
});

test("refuse les préconditions divergentes sans changer le job", async (context) => {
  const h = await setup(context);
  const prepare = () => h.post("/job/recover", { ...h.recovery, phase: "prepare" });
  for (const [field, value, normal] of [
    ["permissions", [{ id: "pending" }], []], ["busy", { ses_old: { type: "busy" } }, {}],
    ["busy", { ses_new: { type: "busy" } }, {}], ["path", "/other", h.contract.directory],
    ["mcp", "failed", "connected"], ["health", false, true], ["divergentSession", true, false],
    ["unavailable", true, false],
  ]) {
    h.native[field] = value;
    assert.equal((await prepare()).status, 409, field);
    assert.equal((await h.get("/job")).recovery, null);
    h.native[field] = normal;
  }
  await h.post("/job/progress", { jobId: h.contract.jobId, currentCabMandate: "not-closed" });
  assert.equal((await prepare()).body.error, "current-mandate-not-closed");
  await h.post("/job/progress", { jobId: h.contract.jobId, currentCabMandate: "" });
  await h.validate(h.approval("undecided", "ses_old"));
  assert.equal((await prepare()).body.error, "undecided-validation");
  await h.post("/decision/undecided", { decision: "rejected" });
  assert.equal((await prepare()).status, 200);
});

test("prévol strict même sans strictCommands et consommation unique", async (context) => {
  const h = await setup(context, false);
  assert.equal((await h.post("/job/recover", { ...h.recovery, phase: "prepare" })).status, 200);
  const a = h.approval("preflight-1");
  await h.validate(a); await h.approve(a.requestId);
  h.native.permissions = [{ id: "suffix", sessionID: "ses_new", permission: "bash",
    metadata: { command: '/usr/bin/true 2>/dev/null; echo "exit=$?"' } }];
  await delay(120);
  assert.deepEqual(h.native.replies, []);
  h.native.permissions.push({ id: "exact", sessionID: "ses_new", permission: "bash", metadata: { command: "/usr/bin/true" } });
  await waitFor(() => h.native.replies.length === 1);
  assert.deepEqual(h.native.replies[0].body, { response: "once" });
  h.native.permissions = [{ id: "repeat", sessionID: "ses_new", permission: "bash", metadata: { command: "/usr/bin/true" } }];
  await delay(120);
  assert.equal(h.native.replies.length, 1);
});

test("refuse true avec un change divergent sans purger ni valider la récupération", async (context) => {
  const h = await setup(context);
  assert.equal((await h.post("/job/recover", { ...h.recovery, phase: "prepare" })).status, 200);
  const before = await h.get("/job");
  const divergent = h.approval(h.recovery.preflightRequestId, "ses_new", "true");
  divergent.change_id = "another-change";
  assert.equal((await h.validate(divergent)).status, 409);
  assert.equal((await h.post("/job/recover", { ...h.recovery, phase: "complete" })).status, 409);
  const after = await h.get("/job");
  for (const key of ["jobId", "sessionId", "changeId", "lastProvenMilestone", "recovery", "terminalGate"]) {
    assert.deepEqual(after[key], before[key]);
  }
  assert.equal(after.terminalGate.status, "OPEN");
  assert.equal(h.native.replies.length, 0);
});

test("refuse les fausses preuves natives et garde le gel", async (context) => {
  const h = await setup(context);
  await h.post("/job/recover", { ...h.recovery, phase: "prepare" });
  await h.preflight();
  const good = structuredClone(h.native.messages);
  const complete = () => h.post("/job/recover", { ...h.recovery, phase: "complete" });
  for (const mutate of [
    (p) => { p.splice(0, 1); }, (p) => { p[0].state.output = JSON.stringify({ status: "APPROVED", requestId: "wrong" }); },
    (p) => { p[1].state.metadata.exit = 1; }, (p) => { p[1].state.input.command += "; echo invalid"; },
    (p) => { p[2].state.time.start = 1; }, (p) => { p[2].state.output = JSON.stringify({ status: "READY", pending_count: 1 }); },
    (p) => { p.push(structuredClone(p[1])); },
    (p) => { p.push({ type: "tool", tool: "edit", state: { status: "completed" } }); },
  ]) {
    h.native.messages = structuredClone(good); mutate(h.native.messages[0].parts);
    assert.equal((await complete()).status, 409);
    assert.ok((await h.get("/job")).recovery);
    assert.equal((await h.get("/job")).sessionId, "ses_old");
  }
  h.native.messages = good;
  assert.equal((await complete()).status, 200);
});

test("sérialise les transitions et restaure le gel après redémarrage", async (context) => {
  const h = await setup(context);
  h.native.delayPath = true;
  const first = h.post("/job/recover", { ...h.recovery, phase: "prepare" });
  await waitFor(() => h.native.releasePath !== null);
  assert.equal((await h.post("/job/recover", { ...h.recovery, phase: "prepare" })).status, 409);
  assert.equal((await h.post("/job/progress", { jobId: h.contract.jobId, lastProvenMilestone: "race" })).status, 409);
  assert.equal((await h.validate(h.approval("race", "ses_old"))).status, 409);
  h.native.delayPath = false; h.native.releasePath();
  assert.equal((await first).status, 200);
  await h.stop(); await h.start();
  const restored = await h.get("/job");
  assert.equal(restored.recovery.recoveryId, h.recovery.recoveryId);
  assert.equal(restored.lastProvenMilestone, "tests-proved");
  assert.equal((await h.validate(h.approval("stale", "ses_old"))).status, 409);
  assert.equal((await h.post("/job/recover", { ...h.recovery, phase: "complete" })).status, 409);
});


test("accepte un polling MCP corrélé après délai sans inventer de preuve", async (context) => {
  const h = await setup(context);
  await h.post("/job/recover", { ...h.recovery, phase: "prepare" });
  await h.preflight();
  const parts = h.native.messages[0].parts;
  const approval = structuredClone(parts[0]);
  parts[0].state.status = "error";
  delete parts[0].state.output;
  approval.tool = "cgpt-validation_poll_approval";
  approval.state.input = { approval_id: h.approval("preflight-1").approval_id };
  parts.splice(1, 0, approval);
  approval.state.input.approval_id = "wrong";
  assert.equal((await h.post("/job/recover", { ...h.recovery, phase: "complete" })).status, 409);
  approval.state.input.approval_id = h.approval("preflight-1").approval_id;
  assert.equal((await h.post("/job/recover", { ...h.recovery, phase: "complete" })).status, 200);
});
