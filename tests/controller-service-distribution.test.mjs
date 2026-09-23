import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const commandPath = new URL("../.codex/commands/cab.md", import.meta.url);
const servicePath = new URL(
  "../plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service",
  import.meta.url
);

test("distribue une unité utilisateur inactive par défaut", () => {
  const service = readFileSync(servicePath, "utf8");

  assert.match(service, /^EnvironmentFile=%h\/\.config\/cab-approval-bridge\/controller\.env$/m);
  assert.match(service, /^Restart=on-failure$/m);
  assert.doesNotMatch(service, /^\[Install\]$/m);
});

test("la commande CAB installe sans activer, démarre et arrête explicitement", () => {
  const command = readFileSync(commandPath, "utf8");

  assert.match(command, /systemctl --user daemon-reload/);
  assert.match(
    command,
    /ne doit jamais appeler `systemctl --user enable`/
  );
  assert.match(
    command,
    /systemctl --user start cgpt-approval-bridge-controller\.service/
  );
  assert.match(
    command,
    /systemctl --user stop cgpt-approval-bridge-controller\.service/
  );
});

test("la commande CAB prévole le modèle OpenCode avant la session persistante", () => {
  const command = readFileSync(commandPath, "utf8");
  const preflight = command.indexOf("session de prévol temporaire");
  const persistentSession = command.indexOf("session de codage OpenCode persistante");

  assert.notEqual(preflight, -1);
  assert.notEqual(persistentSession, -1);
  assert.ok(preflight < persistentSession);
  assert.match(command, /fournisseur, son modèle et son niveau de raisonnement/);
  assert.match(command, /CAB_INACTIF/);
});

test("les artefacts distribués annoncent la même version de base", () => {
  const command = readFileSync(commandPath, "utf8");
  const manifest = readFileSync(
    new URL(
      "../plugins/cab-approval-bridge/.codex-plugin/plugin.json",
      import.meta.url
    ),
    "utf8"
  );
  const controller = readFileSync(
    new URL(
      "../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs",
      import.meta.url
    ),
    "utf8"
  );
  const broker = readFileSync(
    new URL("../src/cgpt_approval_bridge_server.py", import.meta.url),
    "utf8"
  );

  assert.match(command, /^version: 0\.84\.4$/m);
  assert.match(manifest, /"version": "0\.84\.4\+codex\./);
  assert.match(controller, /version: "0\.84\.4"/);
  assert.match(broker, /SERVER_VERSION = "0\.84\.4"/);
});
