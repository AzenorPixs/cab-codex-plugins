import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

test("corrèle uniquement l'instrumentation de sortie OpenCode admise", async (context) => {
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

  for (let attempt = 0; attempt < 40 && replies.length === 0; attempt += 1) {
    await delay(25);
  }

  assert.deepEqual(replies, [
    { id: "permission-command-123", body: { response: "once" } },
  ]);
});

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
