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

  assert.match(command, /^version: 0\.87\.0$/m);
  assert.match(manifest, /"version": "0\.87\.0\+codex\./);
  assert.match(controller, /version: "0\.87\.0"/);
  assert.match(supervisor, /const version = "0\.87\.0"/);
  assert.match(broker, /SERVER_VERSION = "0\.87\.0"/);
  assert.match(project, /^version = "0\.87\.0"$/m);
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

test("AGENTS renvoie au protocole local dédié avec ses contrats techniques", () => {
  const agents = readFileSync(new URL("../AGENTS.md", import.meta.url), "utf8");
  const reference = agents.match(/\[ORCHESTRATED_CODING\.md\]\((ORCHESTRATED_CODING\.md)\)/);
  assert.ok(reference, "Le renvoi local doit exister dans AGENTS.md.");
  assert.match(agents.replace(/\s+/g, " "), /les deux agents DOIVENT lire intégralement/);
  assert.match(agents, /est un fichier facultatif/);
  assert.match(agents.replace(/\s+/g, " "), /Son absence est normale pour les autres projets/);
  assert.doesNotMatch(agents, /### Protocole de communication OpenCode ↔ CGPT via CAB/);
  const protocol = readFileSync(new URL(`../${reference[1]}`, import.meta.url), "utf8");
  for (const endpoint of ["POST /job/arm", "POST /job/progress", "POST /job/recover",
    "POST /job/terminal-gate", "POST /job/disarm", "GET /decision/<requestId>"]) {
    assert.ok(protocol.includes(endpoint), endpoint);
  }
  assert.match(protocol, /MCP stdio local/);
  assert.match(protocol, /strictCommands/);
  assert.match(protocol, /session directe SCM/);
});

test("le protocole exige un rapport par archive et empêche une clôture sans preuve", () => {
  const protocolPaths = [
    "../ORCHESTRATED_CODING.md",
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

test("le protocole distribué protège la lecture seule et décrit la récupération explicite", () => {
  for (const path of [
    new URL("../.codex/commands/cab.md", import.meta.url),
    new URL("../plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md", import.meta.url),
  ]) {
    const protocol = readFileSync(path, "utf8");
    for (const tool of ["bash", "edit", "write", "apply_patch", "task", "skill"]) {
      assert.ok(protocol.includes(`"${tool}":false`));
    }
    assert.match(protocol, /POST \/job\/recover/);
    assert.match(protocol, /phase: "prepare"/);
    assert.match(protocol, /phase: "complete"/);
    assert.match(protocol, /permissions natives\n`ask`/);
  }
});

test("le protocole distribue des cadences indépendantes et une attente PLLM persistante", () => {
  for (const path of [
    "../ORCHESTRATED_CODING.md",
    "../.codex/commands/cab.md",
    "../plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md",
  ]) {
    const protocol = readFileSync(new URL(path, import.meta.url), "utf8")
      .replace(/\s+/g, " ");
    assert.match(protocol, /SSE OpenCode en temps réel/, path);
    assert.match(protocol, /demandes et les rapports toutes les 3 secondes/, path);
    assert.match(protocol, /pauses fixes de 7 secondes/, path);
    assert.match(protocol, /vérifications de progression/, path);
    assert.match(protocol, /temporisations techniques du superviseur/, path);
    assert.match(protocol, /même RUN en attente non terminale/, path);
    assert.match(protocol, /benchmark toutes les 30 minutes \(1 800 secondes\), indéfiniment, sans limite de tentatives/, path);
    assert.match(protocol, /jusqu'à reprise sûre du RUN ou arrêt explicite du développeur/, path);
    assert.match(protocol, /échéance.*depuis l'échec observé de la dernière tentative/, path);
    assert.match(protocol, /checkpoint non secret/, path);
    assert.match(protocol, /tentative en cours ou d'effet inconnu avant de retenter/, path);
    assert.match(protocol, /tentatives simultanées/, path);
    assert.match(protocol, /sans attente bloquante de trente minutes/, path);
    assert.match(protocol, /readiness CAB réelle et les permissions avant reprise/, path);
    assert.match(protocol, /ne vaut jamais approbation, ne rejoue aucun mandat consommé/, path);
    assert.match(protocol, /ne contourne aucun blocage CAB distinct/, path);
  }
});

test("l'exception de purge garde le double écart, les preuves et le prévol exact", () => {
  for (const path of [
    "../ORCHESTRATED_CODING.md",
    "../.codex/commands/cab.md",
    "../plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md",
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    const start = source.indexOf("Nouvelle session CAB après prévol de récupération divergent");
    // L'initialisation peut référencer le titre ; sélectionner la section elle-même.
    const section = source.slice(source.indexOf("\n", source.indexOf(
      "# Nouvelle session CAB après prévol de récupération divergent"
    ))).replace(/\s+/g, " ");
    assert.notEqual(start, -1, path);
    assert.match(section, /sans nouvelle confirmation/, path);
    assert.match(section, /à la fois la transmission de `true` au lieu de `\/usr\/bin\/true` et un `change_id` divergent/, path);
    assert.match(section, /ne couvre aucun autre échec/, path);
    assert.match(section, /n'est jamais exécutée automatiquement par `\/job\/recover`/, path);
    assert.match(section, /aucun mandat actif ou en attente, aucune permission non résolue et aucun effet inconnu/, path);
    assert.match(section, /checkpoint métier non secret/, path);
    assert.match(section, /gate OPEN, sans fabriquer un gate valide/, path);
    assert.match(section, /<home OpenCode>\/\.opencode\/state\/cgpt-approval-bridge\//, path);
    assert.match(section, /<racine projet>\/\.opencode\/state\/cgpt-approval-bridge\//, path);
    assert.match(section, /identifiants de session, job, requête et approbation neufs/, path);
    assert.match(section, /exactement `\/usr\/bin\/true`, sans suffixe, avec le `change_id` attendu/, path);
    assert.match(section, /sans rejouer les écritures validées/, path);
    assert.match(section, /récupération ordinaire reste sans purge/, path);
  }
  const reset = readFileSync(new URL(
    "../plugins/cab-approval-bridge/skills/approval-bridge/references/session-reset.md",
    import.meta.url
  ), "utf8").replace(/\s+/g, " ");
  assert.match(reset, /sans nouvelle confirmation/);
  assert.match(reset, /checkpoint métier externe sont distincts/);
  assert.match(reset, /ne prétend pas réussir `\/cab stop` normal/);
  assert.match(reset, /--confirm-new-session --state-dir/);
});

test("les sondes statistiques n'arrêtent pas le travail pour attendre le créneau", () => {
  for (const path of [
    "../ORCHESTRATED_CODING.md",
    "../.codex/commands/cab.md",
    "../plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md",
    "../plugins/cab-approval-bridge/skills/coding-session-statistics/SKILL.md",
  ]) {
    const protocol = readFileSync(new URL(path, import.meta.url), "utf8")
      .replace(/\s+/g, " ");
    assert.match(protocol, /sondes statistiques.*toutes les 30 minutes|sonde toutes les 30 minutes/, path);
    assert.match(protocol, /sans arrêter le travail pour attendre un créneau/, path);
    assert.match(protocol, /sonde statistique échouée reste distincte d'un échec du benchmark PLLM/, path);
    assert.match(protocol, /ne suspend pas, à elle seule, le RUN/, path);
  }
  const stats = readFileSync(new URL(
    "../plugins/cab-approval-bridge/skills/coding-session-statistics/SKILL.md",
    import.meta.url
  ), "utf8");
  assert.match(stats, /retentée une seule fois immédiatement/);
  assert.match(stats, /relève manquée NE DOIT PAS être recréée rétroactivement/);
});
