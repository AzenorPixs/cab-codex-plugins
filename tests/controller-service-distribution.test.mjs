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
