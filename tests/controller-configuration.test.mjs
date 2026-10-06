import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const controllerPath = fileURLToPath(
  new URL(
    "../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs",
    import.meta.url
  )
);

function startWith(environment) {
  return spawnSync(
    process.execPath,
    [controllerPath],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        OC_CGPT_OUTSIDE_SANDBOX: "1",
        OC_CGPT_WORKSPACE: "/workspace",
        ...environment,
      },
    }
  );
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function availablePort() {
  const server = createServer();

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const { port } = server.address();

  await new Promise((resolve) => {
    server.close(resolve);
  });

  return port;
}

async function waitForStatus(baseUrl) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/status`);

      if (response.ok) {
        return;
      }
    } catch {
      // Le processus contrôleur n'a pas encore ouvert son port.
    }

    await delay(50);
  }

  throw new Error("Contrôleur de test indisponible.");
}

test("refuse une interface contrôleur non loopback", () => {
  const result = startWith({
    OC_CGPT_STATUS_HOST: "0.0.0.0",
  });

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /OC_Codex_STATUS_HOST doit être une adresse loopback autorisée/
  );
});

test("refuse un mode de décision inconnu", () => {
  const result = startWith({
    OC_CGPT_DECISION_MODE: "invalid",
    OC_CGPT_STATUS_HOST: "0.0.0.0",
  });

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /OC_Codex_DECISION_MODE doit être automatic ou manual/
  );
});

for (const workspace of [
  "/workspace",
  "/home/devops/datas/cab",
  "/tmp/cab-controller-workspace",
]) {
  test(`accepte le workspace absolu ${workspace}`, () => {
    const result = startWith({
      OC_CGPT_WORKSPACE: workspace,
      OC_CGPT_STATUS_HOST: "0.0.0.0",
    });

    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /OC_Codex_STATUS_HOST doit être une adresse loopback autorisée/
    );
  });
}

test("refuse un workspace relatif", () => {
  const result = startWith({
    OC_CGPT_WORKSPACE: ".",
  });

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /OC_Codex_WORKSPACE doit désigner une racine de projet absolue/
  );
});


test("propage les trois identifiants à une décision manuelle", async (context) => {
  const directory = mkdtempSync(join(tmpdir(), "cab-controller-test-"));
  const fakeCodex = join(directory, "fake-codex.cjs");
  const port = await availablePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  writeFileSync(
    fakeCodex,
    [
      "#!/usr/bin/env node",
      "const readline = require('node:readline');",
      "readline.createInterface({ input: process.stdin }).on('line', (line) => {",
      "  const message = JSON.parse(line);",
      "  if (!message.id) return;",
      "  const result = message.method === 'thread/start' ? { thread: { id: 'test-thread' } } : {};",
      "  process.stdout.write(JSON.stringify({ id: message.id, result }) + '\\n');",
      "});",
    ].join("\n"),
    { mode: 0o755 }
  );

  const controller = spawn(
    process.execPath,
    [controllerPath],
    {
      env: {
        ...process.env,
        CODEX_COMMAND: fakeCodex,
        OC_CGPT_OPENCODE_URL: "http://127.0.0.1:9",
        OC_CGPT_OUTSIDE_SANDBOX: "1",
        OC_CGPT_RECONNECT_MS: "60000",
        OC_CGPT_DECISION_MODE: "manual",
        OC_CGPT_STATUS_HOST: "127.0.0.1",
        OC_CGPT_STATUS_PORT: String(port),
        OC_CGPT_WORKSPACE: directory,
      },
      stdio: "ignore",
    }
  );

  context.after(() => {
    controller.kill("SIGTERM");
    rmSync(directory, { force: true, recursive: true });
  });

  await waitForStatus(baseUrl);

  const prematureGate = await fetch(`${baseUrl}/job/terminal-gate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ state: "TERMINÉ" }),
  });
  assert.equal(prematureGate.status, 409);

  const readiness = await fetch(`${baseUrl}/broker/readiness`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "READY", pending_count: 0 }),
  });
  assert.equal(readiness.status, 202);

  const validGate = await fetch(`${baseUrl}/job/terminal-gate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ state: "TERMINÉ" }),
  });
  assert.equal(validGate.status, 201);

  const armedJob = await fetch(`${baseUrl}/job/arm`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jobId: "job-test-123",
      sessionId: "ses_test_456",
      directory,
      changeId: "change-test-789",
      criteria: ["preuve de test"],
    }),
  });
  assert.equal(armedJob.status, 201);
  assert.equal((await armedJob.json()).terminalGate.status, "OPEN");

  const prematureDisarm = await fetch(`${baseUrl}/job/disarm`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jobId: "job-test-123" }),
  });
  assert.equal(prematureDisarm.status, 409);

  const jobGate = await fetch(`${baseUrl}/job/terminal-gate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ state: "TERMINÉ" }),
  });
  assert.equal(jobGate.status, 201);

  const disarmedJob = await fetch(`${baseUrl}/job/disarm`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jobId: "job-test-123" }),
  });
  assert.equal(disarmedJob.status, 202);
  assert.equal((await disarmedJob.json()).armed, false);

  const validation = {
    approval: {
      approval_id: "approval-test-123",
      change_id: "change-test-789",
      requestId: "request-test-456",
      summary: "Test de corrélation",
    },
  };

  const requestResponse = await fetch(
    `${baseUrl}/validation/request`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validation),
    }
  );

  assert.equal(requestResponse.status, 202);

  const pendingResponse = await fetch(
    `${baseUrl}/decision/request-test-456`
  );

  assert.equal(pendingResponse.status, 404);

  const decisionResponse = await fetch(
    `${baseUrl}/decision/request-test-456`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        approval_id: "identifiant-forge",
        change_id: "changement-forge",
        decision: "approved",
        instructions: "Sans effet de bord.",
        rationale: "Test.",
        requestId: "requete-forgee",
      }),
    }
  );

  assert.equal(decisionResponse.status, 201);

  const readResponse = await fetch(
    `${baseUrl}/decision/request-test-456`
  );

  assert.equal(readResponse.status, 200);
  assert.deepEqual(await readResponse.json(), {
    approval_id: "approval-test-123",
    change_id: "change-test-789",
    decision: "approved",
    instructions: "Sans effet de bord.",
    rationale: "Test.",
    requestId: "request-test-456",
  });
});

test("relances manuelles sans tour Codex, puis décision explicite unique", async (context) => {
  const directory = mkdtempSync(join(tmpdir(), "cab-controller-reminder-"));
  const fakeCodex = join(directory, "fake-codex.cjs");
  const rpcLog = join(directory, "codex-rpc-methods.txt");
  const port = await availablePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  writeFileSync(rpcLog, "");

  writeFileSync(
    fakeCodex,
    [
      "#!/usr/bin/env node",
      "const readline = require('node:readline');",
      "const { appendFileSync } = require('node:fs');",
      "readline.createInterface({ input: process.stdin }).on('line', (line) => {",
      "  const message = JSON.parse(line);",
      "  appendFileSync(process.env.CAB_TEST_RPC_LOG, message.method + '\\n');",
      "  if (!message.id) return;",
      "  const result = message.method === 'thread/start' ? { thread: { id: 'test-thread' } } : message.method === 'turn/start' ? { turn: { id: 'test-turn' } } : {};",
      "  setTimeout(() => { process.stdout.write(JSON.stringify({ id: message.id, result }) + '\\n'); if (message.method === 'turn/start') process.stdout.write(JSON.stringify({ method: 'turn/completed', params: { turn: { id: 'test-turn', status: 'completed' } } }) + '\\n'); }, 0);",
      "});",
    ].join("\n"),
    { mode: 0o755 }
  );

  const controller = spawn(process.execPath, [controllerPath], {
    env: {
      ...process.env,
      CODEX_COMMAND: fakeCodex,
      CAB_TEST_RPC_LOG: rpcLog,
      OC_CGPT_OPENCODE_URL: "http://127.0.0.1:9",
      OC_CGPT_OUTSIDE_SANDBOX: "1",
      OC_CGPT_RECONNECT_MS: "60000",
      OC_CGPT_DECISION_MODE: "manual",
      OC_CGPT_STATUS_HOST: "127.0.0.1",
      OC_CGPT_STATUS_PORT: String(port),
      OC_CGPT_WORKSPACE: directory,
    },
    stdio: "ignore",
  });

  context.after(() => {
    controller.kill("SIGTERM");
    rmSync(directory, { force: true, recursive: true });
  });

  await waitForStatus(baseUrl);
  const approval = {
    approval_id: "approval-reminder-123",
    change_id: "change-reminder-789",
    requestId: "request-reminder-456",
    summary: "Relance corrélée",
    session_id: "ses_reminder",
    directory: "/workspace",
    files: ["src/example.py"],
    commands: [],
  };

  const validation = await fetch(`${baseUrl}/validation/request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ approval }),
  });
  assert.equal(validation.status, 202);

  for (const ageSeconds of [30, 60]) {
    const reminder = await fetch(`${baseUrl}/validation/reminder`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approval, age_seconds: ageSeconds, last_state: "WAITING_DECISION" }),
    });
    assert.equal(reminder.status, 202);
    const status = await fetch(`${baseUrl}/status`).then((response) => response.json());
    assert.equal(status.lastEvent.type, "validation-reminder-delivered");
    assert.equal(status.lastEvent.requestId, approval.requestId);
  }

  const rpcMethods = readFileSync(rpcLog, "utf8").trim().split("\n");
  assert.ok(!rpcMethods.includes("thread/start"), "un rappel manuel ne crée pas de thread Codex");
  assert.ok(!rpcMethods.includes("turn/start"), "un rappel manuel ne crée pas de tour Codex");

  const decision = await fetch(`${baseUrl}/decision/request-reminder-456`);
  assert.equal(decision.status, 404);

  const explicitDecision = { decision: "needs_clarification", reason: "Décision de l'orchestrateur principal" };
  const decided = await fetch(`${baseUrl}/decision/${approval.requestId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(explicitDecision),
  });
  assert.equal(decided.status, 201);
  const received = await fetch(`${baseUrl}/decision/${approval.requestId}`)
    .then((response) => response.json());
  assert.deepEqual(received, {
    ...explicitDecision,
    requestId: approval.requestId,
    approval_id: approval.approval_id,
    change_id: approval.change_id,
  });

  const repeated = await fetch(`${baseUrl}/decision/${approval.requestId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(explicitDecision),
  });
  assert.equal(repeated.status, 400);
  const terminalReminder = await fetch(`${baseUrl}/validation/reminder`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ approval, age_seconds: 90, last_state: "WAITING_DECISION" }),
  });
  assert.equal(terminalReminder.status, 400);
});

test("réconcilie une permission native corrélée apparue après la décision", async (context) => {
  const directory = mkdtempSync(join(tmpdir(), "cab-controller-scope-test-"));
  const fakeCodex = join(directory, "fake-codex.cjs");
  const controllerPort = await availablePort();
  const opencodePort = await availablePort();
  const controllerUrl = `http://127.0.0.1:${controllerPort}`;
  const replies = [];
  let permissions = [];

  const opencode = createServer(async (request, response) => {
    const body = [];

    for await (const chunk of request) {
      body.push(chunk);
    }

    if (request.url.startsWith("/global/health")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ healthy: true }));
      return;
    }

    if (request.url.startsWith("/permission")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(permissions));
      return;
    }

    if (request.url.startsWith("/session/ses_scope_test/permissions/")) {
      replies.push({
        id: request.url.split("/").at(-1).split("?")[0],
        body: JSON.parse(Buffer.concat(body).toString("utf8")),
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end("true");
      return;
    }

    response.writeHead(404).end();
  });

  await new Promise((resolve) => {
    opencode.listen(opencodePort, "127.0.0.1", resolve);
  });

  writeFileSync(
    fakeCodex,
    "#!/usr/bin/env node\nprocess.stdin.resume();\n",
    { mode: 0o755 }
  );

  const controller = spawn(process.execPath, [controllerPath], {
    env: {
      ...process.env,
      CODEX_COMMAND: fakeCodex,
      OC_CGPT_OPENCODE_URL: `http://127.0.0.1:${opencodePort}`,
      OC_CGPT_OUTSIDE_SANDBOX: "1",
      OC_CGPT_RECONNECT_MS: "25",
      OC_CGPT_STATUS_HOST: "127.0.0.1",
      OC_CGPT_STATUS_PORT: String(controllerPort),
      OC_CGPT_WORKSPACE: "/home/devops/datas/cab",
    },
    stdio: "ignore",
  });

  context.after(async () => {
    controller.kill("SIGTERM");
    await new Promise((resolve) => opencode.close(resolve));
    rmSync(directory, { force: true, recursive: true });
  });

  await waitForStatus(controllerUrl);

  const validation = await fetch(`${controllerUrl}/validation/request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      approval: {
        approval_id: "approval-scope-123",
        change_id: "change-scope-789",
        requestId: "request-scope-456",
        summary: "Test de périmètre.",
        session_id: "ses_scope_test",
        directory: "/workspace",
        files: ["BUILD.md"],
        commands: [],
      },
    }),
  });

  assert.equal(validation.status, 202);

  const decision = await fetch(`${controllerUrl}/decision/request-scope-456`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      decision: "approved",
      instructions: "Dans le périmètre.",
      rationale: "Test.",
    }),
  });

  assert.equal(decision.status, 201);

  await delay(50);

  permissions = [
    {
      id: "permission-123",
      sessionID: "ses_scope_test",
      permission: "edit",
      metadata: { filepath: "/workspace/BUILD.md" },
    },
    {
      id: "permission-124",
      sessionID: "ses_scope_test",
      permission: "edit",
      metadata: { filepath: "/workspace/BUILD.md" },
    },
  ];

  for (let attempt = 0; attempt < 40 && replies.length === 0; attempt += 1) {
    await delay(25);
  }

  assert.deepEqual(replies, [
    { id: "permission-123", body: { response: "once" } },
  ]);
});

async function testCommandCorrelation(context, strictCommands) {
  const directory = mkdtempSync(join(tmpdir(), "cab-controller-command-test-"));
  const fakeCodex = join(directory, "fake-codex.cjs");
  const controllerPort = await availablePort();
  const opencodePort = await availablePort();
  const controllerUrl = `http://127.0.0.1:${controllerPort}`;
  const replies = [];
  let permissions = [];

  const opencode = createServer(async (request, response) => {
    const body = [];

    for await (const chunk of request) {
      body.push(chunk);
    }

    if (request.url.startsWith("/global/health")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ healthy: true }));
      return;
    }

    if (request.url.startsWith("/permission")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(permissions));
      return;
    }

    if (request.url.startsWith("/session/ses_command_test/permissions/")) {
      replies.push({
        id: request.url.split("/").at(-1).split("?")[0],
        body: JSON.parse(Buffer.concat(body).toString("utf8")),
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end("true");
      return;
    }

    response.writeHead(404).end();
  });

  await new Promise((resolve) => {
    opencode.listen(opencodePort, "127.0.0.1", resolve);
  });

  writeFileSync(fakeCodex, "#!/usr/bin/env node\nprocess.stdin.resume();\n", {
    mode: 0o755,
  });

  const controller = spawn(process.execPath, [controllerPath], {
    env: {
      ...process.env,
      CODEX_COMMAND: fakeCodex,
      OC_CGPT_OPENCODE_URL: `http://127.0.0.1:${opencodePort}`,
      OC_CGPT_OUTSIDE_SANDBOX: "1",
      OC_CGPT_RECONNECT_MS: "25",
      OC_CGPT_STATUS_HOST: "127.0.0.1",
      OC_CGPT_STATUS_PORT: String(controllerPort),
      OC_CGPT_WORKSPACE: strictCommands ? directory : "/home/devops/datas/cab",
    },
    stdio: "ignore",
  });

  context.after(async () => {
    controller.kill("SIGTERM");
    await new Promise((resolve) => opencode.close(resolve));
    rmSync(directory, { force: true, recursive: true });
  });

  await waitForStatus(controllerUrl);

  if (strictCommands) {
    const contract = {
      jobId: "job-command-test",
      sessionId: "ses_command_test",
      directory: "/workspace",
      criteria: ["Commande exacte, refus des suffixes et consommation unique."],
      strictCommands: true,
    };
    const invalid = await fetch(`${controllerUrl}/job/arm`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...contract, strictCommands: "true" }),
    });
    assert.equal(invalid.status, 400);
    const armed = await fetch(`${controllerUrl}/job/arm`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(contract),
    });
    assert.equal(armed.status, 201);
    assert.equal((await armed.json()).strictCommands, true);
  }

  const validation = await fetch(`${controllerUrl}/validation/request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      approval: {
        approval_id: "approval-command-123",
        change_id: "change-command-789",
        requestId: "request-command-456",
        summary: "Test de corrélation de commande.",
        session_id: "ses_command_test",
        directory: "/workspace",
        files: [],
        commands: ["printf approved"],
      },
    }),
  });

  assert.equal(validation.status, 202);

  const decision = await fetch(`${controllerUrl}/decision/request-command-456`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      decision: "approved",
      instructions: "Dans le périmètre.",
      rationale: "Test.",
    }),
  });

  assert.equal(decision.status, 201);

  permissions = [
    {
      id: "permission-command-123",
      sessionID: "ses_command_test",
      permission: "bash",
      metadata: { command: 'printf approved 2>/dev/null; echo "exit=$?"' },
    },
    {
      id: "permission-command-124",
      sessionID: "ses_command_test",
      permission: "bash",
      metadata: { command: "printf approved; touch unexpected" },
    },
  ];

  if (strictCommands) {
    await delay(150);
    assert.deepEqual(replies, []);
    permissions.push({
      id: "permission-command-exact",
      sessionID: "ses_command_test",
      permission: "bash",
      metadata: { command: "printf approved" },
    });
  }

  for (let attempt = 0; attempt < 40 && replies.length === 0; attempt += 1) {
    await delay(25);
  }

  assert.deepEqual(replies, [
    {
      id: strictCommands ? "permission-command-exact" : "permission-command-123",
      body: { response: "once" },
    },
  ]);

  if (strictCommands) {
    permissions.push({
      id: "permission-command-repeat",
      sessionID: "ses_command_test",
      permission: "bash",
      metadata: { command: "printf approved" },
    });
    await delay(150);
    assert.equal(replies.length, 1);
  }
}

for (const strictCommands of [false, true]) {
  test(`corrèle les commandes avec strictCommands=${strictCommands}`, (context) =>
    testCommandCorrelation(context, strictCommands)
  );
}

test("conserve une décision manuelle rejected face à une décision automatique tardive", async (context) => {
  const directory = mkdtempSync(join(tmpdir(), "cab-controller-race-test-"));
  const fakeCodex = join(directory, "fake-codex.cjs");
  const port = await availablePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  writeFileSync(
    fakeCodex,
    [
      "#!/usr/bin/env node",
      "const readline = require('node:readline');",
      "readline.createInterface({ input: process.stdin }).on('line', (line) => {",
      "  const message = JSON.parse(line);",
      "  if (message.method === 'thread/start') {",
      "    process.stdout.write(JSON.stringify({ id: message.id, result: { thread: { id: 'test-thread' } } }) + '\\n');",
      "    return;",
      "  }",
      "  if (message.method === 'turn/start') {",
      "    const turnId = 'test-turn';",
      "    process.stdout.write(JSON.stringify({ id: message.id, result: { turn: { id: turnId } } }) + '\\n');",
      "    setTimeout(() => {",
      "      const decision = JSON.stringify({ decision: 'approved', rationale: 'Différée.', instructions: 'Approbation automatique.' });",
      "      process.stdout.write(JSON.stringify({ method: 'item/completed', params: { turnId, item: { type: 'agentMessage', text: decision } } }) + '\\n');",
      "      process.stdout.write(JSON.stringify({ method: 'turn/completed', params: { turn: { id: turnId, status: 'completed' } } }) + '\\n');",
      "    }, 500);",
      "  }",
      "});",
    ].join("\n"),
    { mode: 0o755 }
  );

  const controller = spawn(
    process.execPath,
    [controllerPath],
    {
      env: {
        ...process.env,
        CODEX_COMMAND: fakeCodex,
        OC_CGPT_OPENCODE_URL: "http://127.0.0.1:9",
        OC_CGPT_OUTSIDE_SANDBOX: "1",
        OC_CGPT_RECONNECT_MS: "60000",
        OC_CGPT_STATUS_HOST: "127.0.0.1",
        OC_CGPT_STATUS_PORT: String(port),
        OC_CGPT_WORKSPACE: "/home/devops/datas/cab",
      },
      stdio: "ignore",
    }
  );

  context.after(() => {
    controller.kill("SIGTERM");
    rmSync(directory, { force: true, recursive: true });
  });

  await waitForStatus(baseUrl);

  const requestId = "req-cab-manual-decision-race-test-003";

  const validation = {
    approval: {
      approval_id: "apr-cab-manual-decision-race-test-003",
      change_id: "fix-manual-decision-overwrite",
      requestId,
      summary: "Course décision manuelle contre automatique.",
    },
  };

  const requestResponse = await fetch(`${baseUrl}/validation/request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(validation),
  });

  assert.equal(requestResponse.status, 202);

  await delay(150);

  const manualDecision = {
    decision: "rejected",
    instructions: "Refus manuel pendant la décision.",
    rationale: "Course.",
  };

  const decisionResponse = await fetch(`${baseUrl}/decision/${requestId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(manualDecision),
  });

  assert.equal(decisionResponse.status, 201);

  await delay(900);

  const readResponse = await fetch(`${baseUrl}/decision/${requestId}`);

  assert.equal(readResponse.status, 200);
  assert.deepEqual(await readResponse.json(), {
    ...manualDecision,
    approval_id: "apr-cab-manual-decision-race-test-003",
    change_id: "fix-manual-decision-overwrite",
    requestId,
  });
});
