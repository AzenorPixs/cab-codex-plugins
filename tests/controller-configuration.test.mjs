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
    /OC_CGPT_STATUS_HOST doit être une adresse loopback autorisée/
  );
});

for (const workspace of [
  "/workspace",
  "/home/devops/datas/cab",
]) {
  test(`accepte le workspace CAB ${workspace}`, () => {
    const result = startWith({
      OC_CGPT_WORKSPACE: workspace,
      OC_CGPT_STATUS_HOST: "0.0.0.0",
    });

    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /OC_CGPT_STATUS_HOST doit être une adresse loopback autorisée/
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
    /OC_CGPT_WORKSPACE doit être une racine CAB absolue autorisée/
  );
});

test("refuse un workspace absolu hors CAB", () => {
  const result = startWith({
    OC_CGPT_WORKSPACE: "/tmp",
  });

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /OC_CGPT_WORKSPACE doit être une racine CAB absolue autorisée/
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
