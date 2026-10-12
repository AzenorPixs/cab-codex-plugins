import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const controllerPath = fileURLToPath(new URL(
  "../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs",
  import.meta.url
));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fixture(context) {
  const directory = mkdtempSync(join(tmpdir(), "cab-job-restoration-"));
  const stateDirectory = join(directory, ".opencode", "state", "cgpt-approval-bridge");
  const jobPath = join(stateDirectory, "controller-job.json");
  const codexMarker = join(directory, "codex-started");
  const fakeCodex = join(directory, "fake-codex.cjs");
  mkdirSync(stateDirectory, { recursive: true });
  writeFileSync(fakeCodex, [
    "#!/usr/bin/env node",
    "const { writeFileSync } = require('node:fs');",
    "const { join } = require('node:path');",
    "writeFileSync(join(__dirname, 'codex-started'), 'started');",
    "process.stdin.resume();",
  ].join("\n"), { mode: 0o755 });

  const requests = [];
  const opencode = createServer((request, response) => {
    requests.push(request.url);
    if (request.url === "/global/event") {
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.write('data: {"type":"server.connected"}\n\n');
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(request.url === "/global/health" ? { healthy: true } : []));
  });
  opencode.listen(0, "127.0.0.1");
  await once(opencode, "listening");

  const listener = createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  let controller;
  let output = "";

  context.after(async () => {
    if (controller && controller.exitCode === null && controller.signalCode === null) {
      const stopped = once(controller, "exit");
      controller.kill("SIGTERM");
      await stopped;
    }
    opencode.closeAllConnections();
    await new Promise((resolve) => opencode.close(resolve));
    rmSync(directory, { recursive: true, force: true });
  });

  function start() {
    controller = spawn(process.execPath, [controllerPath], {
      env: {
        ...process.env,
        CODEX_COMMAND: fakeCodex,
        OC_Codex_WORKSPACE: directory,
        OC_Codex_OUTSIDE_SANDBOX: "1",
        OC_Codex_DECISION_MODE: "manual",
        OC_Codex_STATUS_HOST: "127.0.0.1",
        OC_Codex_STATUS_PORT: String(port),
        OC_Codex_OPENCODE_URL: `http://127.0.0.1:${opencode.address().port}`,
        OC_Codex_RECONNECT_MS: "60000",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    controller.stdout.on("data", (data) => { output += data; });
    controller.stderr.on("data", (data) => { output += data; });
  }

  async function exit() {
    let timer;
    try {
      const [code, signal] = await Promise.race([
        once(controller, "exit"),
        new Promise((resolve, reject) => {
          timer = setTimeout(() => reject(new Error("Le contrôleur n'a pas refusé le démarrage.")), 1500);
        }),
      ]);
      assert.equal(signal, null);
      assert.notEqual(code, 0);
      assert.equal(existsSync(codexMarker), false, "Codex App Server ne doit pas être lancé.");
      assert.deepEqual(requests, [], "OpenCode ne doit pas être contacté.");
      await assert.rejects(fetch(`${base}/status`, { signal: AbortSignal.timeout(500) }));
      assert.equal(output.includes(directory), false, "Le chemin runtime ne doit pas être exposé.");
      return output;
    } finally {
      clearTimeout(timer);
    }
  }

  async function job() {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try {
        const response = await fetch(`${base}/job`, { signal: AbortSignal.timeout(200) });
        if (response.ok) return response.json();
      } catch {
        // Le contrôleur de test n'a pas encore ouvert son port.
      }
      await delay(20);
    }
    throw new Error("Contrôleur de test indisponible.");
  }

  return { directory, jobPath, start, exit, job };
}

test("un contrat absent permet un démarrage sans job", async (context) => {
  const h = await fixture(context);
  h.start();
  assert.equal(await h.job(), null);
  assert.equal(existsSync(h.jobPath), false);
});

test("restaure le contrat valide, son gel et ses sessions révoquées sans réécriture", async (context) => {
  const h = await fixture(context);
  const contract = {
    jobId: "job-persisted", sessionId: "ses_persisted", directory: h.directory,
    changeId: "change-persisted", criteria: ["preuve"], strictCommands: true,
    armed: true, lastProvenMilestone: "milestone-proved", currentCabMandate: null,
    terminalGate: { status: "OPEN", reason: "session-recovery-pending" },
    recovery: { recoveryId: "recovery-persisted", sessionId: "ses_candidate" },
    revokedSessions: ["ses_revoked"], recoveryHistory: [],
  };
  const content = JSON.stringify(contract, null, 2) + "\n";
  writeFileSync(h.jobPath, content);
  h.start();
  const restored = await h.job();
  for (const key of ["jobId", "sessionId", "changeId", "directory", "criteria",
    "strictCommands", "armed", "lastProvenMilestone", "currentCabMandate",
    "recovery", "revokedSessions", "recoveryHistory"]) {
    assert.deepEqual(restored[key], contract[key]);
  }
  assert.equal(restored.terminalGate.status, "OPEN");
  assert.equal(readFileSync(h.jobPath, "utf8"), content);
});

test("refuse un JSON malformé sans exposer son contenu ni toucher au fichier", async (context) => {
  const h = await fixture(context);
  const marker = "synthetic-private-content-not-for-diagnostics";
  const content = `{"jobId":"${marker}", invalid-json`;
  writeFileSync(h.jobPath, content);
  h.start();
  const output = await h.exit();
  assert.match(output, /Restauration du contrat de job impossible : JSON invalide/);
  assert.equal(output.includes(marker), false);
  assert.equal(readFileSync(h.jobPath, "utf8"), content);
});

test("refuse une erreur de lecture sans la traiter comme ENOENT", async (context) => {
  const h = await fixture(context);
  mkdirSync(h.jobPath);
  const witness = join(h.jobPath, "witness");
  writeFileSync(witness, "unchanged");
  h.start();
  const output = await h.exit();
  assert.match(output, /Restauration du contrat de job impossible : lecture impossible/);
  assert.equal(readFileSync(witness, "utf8"), "unchanged");
});
