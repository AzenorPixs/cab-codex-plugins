import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const commandPath = new URL("../.codex/commands/cab.md", import.meta.url);
const servicePath = new URL(
  "../plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service",
  import.meta.url
);
const supervisorServicePath = new URL(
  "../plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service",
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
  assert.match(
    command,
    /systemctl --user start cgpt-approval-bridge-supervisor\.service/
  );
  assert.match(
    command,
    /systemctl --user stop cgpt-approval-bridge-supervisor\.service/
  );
  assert.match(command, /POST \/job\/arm/);
  assert.match(command, /POST \/job\/disarm/);
});

test("distribue un superviseur utilisateur inactif par défaut", () => {
  const service = readFileSync(supervisorServicePath, "utf8");

  assert.match(service, /^After=cgpt-approval-bridge-controller\.service$/m);
  assert.match(service, /^Restart=on-failure$/m);
  assert.doesNotMatch(service, /^\[Install\]$/m);
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
  const supervisor = readFileSync(
    new URL(
      "../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs",
      import.meta.url
    ),
    "utf8"
  );

  const project = readFileSync(new URL("../pyproject.toml", import.meta.url), "utf8");

  assert.match(command, /^version: 0\.86\.3$/m);
  assert.match(manifest, /"version": "0\.86\.3\+codex\./);
  assert.match(controller, /version: "0\.86\.3"/);
  assert.match(supervisor, /const version = "0\.86\.3"/);
  assert.match(broker, /SERVER_VERSION = "0\.86\.3"/);
  assert.match(project, /^version = "0\.86\.3"$/m);
});

test("la mise à jour déploie le superviseur sans le démarrer", () => {
  const command = readFileSync(commandPath, "utf8");
  const updateStart = command.indexOf("## `/cab update`");
  const updateEnd = command.indexOf("## `/cab stop`");
  const update = command.slice(updateStart, updateEnd);

  assert.match(update, /cgpt-approval-bridge-supervisor\.mjs/);
  assert.match(update, /cgpt-approval-bridge-supervisor\.service/);
  assert.match(update, /systemctl --user\s+daemon-reload/);
  assert.match(update, /ne démarre ni n'arrête\s+le superviseur/);
  assert.match(update, /CAB_SUPERVISEUR_INSTALLÉ/);
  assert.match(update, /CAB_SUPERVISEUR_MIS_À_JOUR/);
  assert.match(update, /version du superviseur extraite/);
  assert.match(update, /version du superviseur déployé/);
});

test("la marketplace CAB distribue les statistiques avec le plugin existant", () => {
  const root = new URL("../", import.meta.url);
  const marketplace = JSON.parse(readFileSync(new URL(".agents/plugins/marketplace.json", root)));
  const entry = marketplace.plugins.find((plugin) => plugin.name === "cab-approval-bridge");
  assert.ok(entry);
  assert.ok(!marketplace.plugins.some((plugin) => plugin.name === "coding-session-statistics"));
  const pluginRoot = new URL(`${entry.source.path}/`, root);
  const manifest = JSON.parse(readFileSync(new URL(".codex-plugin/plugin.json", pluginRoot)));
  const skillsRoot = new URL(manifest.skills, pluginRoot);
  const available = readdirSync(skillsRoot);
  assert.ok(available.includes("approval-bridge"));
  assert.ok(available.includes("coding-session-statistics"));
  const stats = new URL("coding-session-statistics/", skillsRoot);
  const skill = readFileSync(new URL("SKILL.md", stats), "utf8");
  const metadata = readFileSync(new URL("agents/openai.yaml", stats), "utf8");
  assert.match(skill, /^name: coding-session-statistics$/m);
  assert.match(metadata, /\$coding-session-statistics/);
  assert.match(skill, /mcp__codex_app__get_usage_limits/);
  assert.doesNotMatch(skill, /\/cgpt 7u|\.codexold/);
  assert.match(skill, /usedPercent/);
  assert.match(skill, /10080/);
  assert.match(skill, /relevé initial absent/);
  assert.match(skill, /sondes périodiques non activées/);
});

test("le protocole exige un rapport par archive et empêche une clôture sans preuve", () => {
  const protocolPaths = [
    "../AGENTS.md",
    "../.codex/commands/cab.md",
    "../plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md",
    "../plugins/cab-approval-bridge/skills/coding-session-statistics/SKILL.md",
  ];
  for (const path of protocolPaths) {
    const protocol = readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");
    assert.match(protocol, /openspec\/changes\/archive\/<archive>\/STATISTIQUES\.md/, path);
    assert.match(protocol, /mandat d'édition distinct/, path);
    assert.match(protocol, /six sections/, path);
    assert.match(protocol, /rapport par archive/, path);
    assert.match(protocol, /N\/A/, path);
    assert.match(protocol, /sans réarchiver|Ne pas réarchiver/, path);
    assert.match(protocol, /TERMINÉ/, path);
  }
  const command = readFileSync(commandPath, "utf8");
  const run = command.slice(command.indexOf("## `/cab run`"), command.indexOf("## `/cab test`"));
  assert.match(run, /critères de fin la preuve du rapport/);
  assert.match(run, /Ne demande pas la clôture normale `TERMINÉ` sans preuve du rapport/);
  assert.match(run, /Si l'archivage échoue/);
  assert.match(run, /`BLOQUÉ` ou un arrêt explicite/);
});
