import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scripts = new URL("../plugins/cab-approval-bridge/scripts/", import.meta.url);

async function waitFor(check) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Le client de test n'a pas atteint son contrôle attendu.");
}

for (const prefix of ["OC_Codex_", "OC_CGPT_"]) {
  for (const suffix of ["", "/status", "/status/"]) {
    test(`CGP06 URL commune ${prefix}CONTROLLER_URL avec suffixe ${suffix || "base"}`, async (context) => {
      const directory = mkdtempSync(join(tmpdir(), "cab-url-compatibility-"));
      const marker = join(directory, "systemctl-called");
      writeFileSync(join(directory, "systemctl"),
        `#!${process.execPath}\nrequire('node:fs').writeFileSync(${JSON.stringify(marker)}, 'called');\n`,
        { mode: 0o755 });
      const requests = [];
      const server = createServer((request, response) => {
        requests.push(request.url);
        if (request.url === "/global/event") {
          response.writeHead(200, { "content-type": "text/event-stream" });
          response.write('data: {"type":"server.connected"}\n\n');
          return;
        }
        let payload;
        if (request.url === "/global/health") payload = { healthy: true };
        else if (request.url === "/status") payload = {
          appServer: "ready", opencodeSse: "connected", activeValidationCount: 0,
          brokerReadiness: { status: "READY", pending_count: 0 },
          brokerReadinessReceivedAt: new Date().toISOString(),
        };
        else if (request.url === "/job") payload = null;
        else if (request.url === "/healthcheck-supervisor") payload = {};
        else { response.writeHead(404).end(); return; }
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify(payload));
      });
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const base = `http://127.0.0.1:${server.address().port}`;
      const listener = createServer();
      await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
      const supervisorPort = listener.address().port;
      await new Promise((resolve) => listener.close(resolve));
      const environment = {
        ...process.env, PATH: `${directory}:${process.env.PATH || ""}`,
        OC_Codex_CONTROLLER_URL: "", OC_CGPT_CONTROLLER_URL: "",
        OC_Codex_OPENCODE_URL: "", OC_CGPT_OPENCODE_URL: "",
        OC_Codex_SUPERVISOR_URL: "", OC_CGPT_SUPERVISOR_URL: "",
        [`${prefix}CONTROLLER_URL`]: `${base}${suffix}`,
        [`${prefix}OPENCODE_URL`]: base,
        [`${prefix}SUPERVISOR_URL`]: `${base}/healthcheck-supervisor`,
        OC_Codex_WORKSPACE: directory, OC_Codex_SUPERVISOR_STATUS_HOST: "127.0.0.1",
        OC_Codex_SUPERVISOR_STATUS_PORT: String(supervisorPort),
        OC_Codex_SUPERVISOR_POLL_INTERVAL_MS: "250",
      };
      const processes = [];
      context.after(async () => {
        for (const child of processes) {
          if (child.exitCode !== null || child.signalCode !== null) continue;
          const stopped = new Promise((resolve) => child.once("exit", resolve));
          child.kill("SIGTERM");
          await stopped;
        }
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
        rmSync(directory, { recursive: true, force: true });
      });
      const healthcheck = spawn(process.execPath,
        [fileURLToPath(new URL("cgpt-approval-bridge-healthcheck.mjs", scripts))],
        { env: environment, stdio: "ignore" });
      processes.push(healthcheck);
      await waitFor(() => requests.includes("/healthcheck-supervisor") || healthcheck.exitCode !== null);
      assert.equal(healthcheck.exitCode, null, `Healthcheck arrêté ; routes : ${requests.join(", ")}`);
      assert.equal(existsSync(marker), false, "Aucun systemctl, même simulé, ne doit être nécessaire.");
      const start = requests.length;
      const supervisor = spawn(process.execPath,
        [fileURLToPath(new URL("cgpt-approval-bridge-supervisor.mjs", scripts))],
        { env: environment, stdio: "ignore" });
      processes.push(supervisor);
      await waitFor(() => requests.slice(start).includes("/job") ||
        requests.slice(start).some((path) => path.includes("/status/status")));
      assert.ok(requests.slice(start).includes("/status"), "Le superviseur doit retrouver /status.");
      assert.ok(requests.slice(start).includes("/job"), "Le superviseur doit retrouver /job.");
      assert.ok(!requests.some((path) => path.includes("/status/status")));
      assert.equal(existsSync(marker), false);
    });
  }
}
