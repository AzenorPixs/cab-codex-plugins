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
const monitorServicePath = new URL('../plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-monitor.service', import.meta.url);

test("les briques distribuées publient la même version de base 1.6.4", () => {
  const version = readFileSync(new URL("../pyproject.toml", import.meta.url), "utf8")
    .match(/^version = "([^"]+)"$/m)[1];
  assert.equal(version, "1.6.4");
  const plugin = JSON.parse(readFileSync(
    new URL("../plugins/cab-approval-bridge/.codex-plugin/plugin.json", import.meta.url), "utf8"));
  assert.match(plugin.version, /^1\.6\.4\+codex\.\d{14}$/);
  assert.match(readFileSync(commandPath, "utf8"), /^version: 1\.6\.4$/m);
  for (const directory of ["../src/", "../plugins/cab-approval-bridge/scripts/"]) {
    const root = new URL(directory, import.meta.url);
    for (const name of readdirSync(root).filter((name) => /\.(py|mjs)$/.test(name))) {
      const source = readFileSync(new URL(name, root), "utf8");
      const versions = [...source.matchAll(/(?:^\s*(?:export\s+)?const\s+(?:VERSION|version)\s*=|^\s*(?:VERSION|SERVER_VERSION)\s*=|^\s*version\s*:)\s*["']([^"']+)["']/gm)];
      assert.ok(versions.length, name);
      for (const match of versions) assert.equal(match[1], version, name);
    }
  }
  for (const path of [servicePath, supervisorServicePath, monitorServicePath]) {
    assert.match(readFileSync(path, "utf8"), /^Description=CAB 1\.6\.4 /m);
  }
});

test('le moniteur web distribue ses ressources locales et reste indépendant des services CAB', () => {
  const service = readFileSync(monitorServicePath, 'utf8');
  assert.match(service, /^EnvironmentFile=%h\/\.config\/cab-approval-bridge\/monitor\.env$/m);
  assert.match(service, /^Restart=on-failure$/m);
  assert.doesNotMatch(service, /^\[Install\]|^(After|Requires|Wants|BindsTo|PartOf|Requisite|PropagatesStopTo)=/m);
  for (const file of ['index.html', 'app.mjs', 'stats.mjs', 'style.css']) {
    assert.ok(readFileSync(new URL('../plugins/cab-approval-bridge/web-monitor/' + file, import.meta.url), 'utf8').length > 0);
  }
  const command = readFileSync(commandPath, 'utf8');
  const start = command.split('## `/cab start`')[1].split('\n## ')[0];
  const stop = command.split('## `/cab stop`')[1].split('\n## ')[0];
  assert.match(start, /systemctl --user start cgpt-approval-bridge-monitor\.service/);
  assert.doesNotMatch(command, /systemctl --user enable cgpt-approval-bridge-monitor/);
  assert.doesNotMatch(stop, /systemctl --user (?:stop|restart) cgpt-approval-bridge-monitor/);
  assert.match(stop, /Préserver explicitement `cgpt-approval-bridge-monitor\.service`/);
  assert.ok(start.indexOf('systemctl --user start cgpt-approval-bridge-monitor.service') <
    start.indexOf('systemctl --user start cgpt-approval-bridge-controller.service'));
  assert.match(start, /identity\.workspace/);
});

test('le catalogue des étapes et son producteur sont distribués en 1.6.4', async () => {
  const { RUN_STEPS, VERSION } = await import('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-run-steps.mjs');
  assert.equal(VERSION, '1.6.4');
  const reference = readFileSync(new URL('../plugins/cab-approval-bridge/skills/approval-bridge/references/run-lifecycle.md', import.meta.url), 'utf8');
  for (const step of RUN_STEPS) {
    assert.ok(reference.includes(step.id), step.id); assert.ok(reference.includes(step.name), step.name);
  }
  for (const path of ['../ORCHESTRATED_CODING.md', '../.codex/commands/cab.md',
    '../plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md']) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.match(source, /run-lifecycle\.md/); assert.match(source, /expectedStepSequence/);
  }
  assert.match(reference, /Revue 8\/11/); assert.match(reference, /Implémentation 6\/11/);
});

test('la collecte native et les transitions optimisées sont distribuées avec le protocole embarqué', () => {
  const reference = readFileSync(new URL('../plugins/cab-approval-bridge/skills/approval-bridge/references/concurrent-runs.md', import.meta.url), 'utf8');
  const protocol = readFileSync(new URL('../ORCHESTRATED_CODING.md', import.meta.url), 'utf8');
  const embedded = reference.replace(/^(#{1,4}) /gm, (_, level) => '#'.repeat(level.length + 2) + ' ').trim();
  assert.ok(protocol.includes(embedded));
  for (const route of ['/statistics', '/locks/acquire', '/locks/release', '/publish', '/resources', '/closing']) assert.ok(reference.includes(route), route);
  assert.match(reference, /Rapport à six sections/);
  const controller = readFileSync(new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs', import.meta.url), 'utf8');
  assert.match(controller, /cgpt-approval-bridge-statistics\.mjs/);
});

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
  assert.match(command, /POST \/runs\/<run_id>\/job\/arm/);
  assert.match(command, /POST \/runs\/<run_id>\/job\/disarm/);
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

  assert.match(command, /^version: 1\.6\.4$/m);
  assert.match(manifest, /"version": "1\.6\.4\+codex\./);
  assert.match(controller, /const version = "1\.6\.4"/);
  assert.match(supervisor, /const version = "1\.6\.4"/);
  assert.match(broker, /SERVER_VERSION = "1\.6\.4"/);
  assert.match(project, /^version = "1\.6\.4"$/m);
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
  for (const endpoint of ["POST /runs/<run_id>/job/arm", "POST /runs/<run_id>/job/progress", "POST /runs/<run_id>/job/recover",
    "POST /runs/<run_id>/job/terminal-gate", "POST /runs/<run_id>/job/disarm", "GET /decision/<requestId>"]) {
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
    assert.match(protocol, /POST \/runs\/<run_id>\/job\/recover/);
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

test("la réactivation sûre est distribuée sans tools true pendant la génération", () => {
  for (const path of [commandPath,
    new URL("../plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md", import.meta.url)]) {
    const protocol = readFileSync(path, "utf8");
    const section = protocol.slice(protocol.indexOf("## Réactivation sûre des outils — CAB 1.0.1"));
    assert.match(section, /noReply: true/);
    assert.match(section, /PATCH/);
    assert.match(section, /Relire la session/);
    assert.match(section, /message de génération sans champ `tools`/);
    assert.match(section, /native-permission-ask-required/);
  }
});

test("le prévol divergent conserve la candidate et le job dans le protocole distribué", () => {
  const sections = [];
  for (const path of [
    "../ORCHESTRATED_CODING.md",
    "../.codex/commands/cab.md",
    "../plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md",
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    const heading = "## Prévol de récupération divergent dans la même session";
    const start = source.indexOf(heading);
    assert.notEqual(start, -1, path);
    const end = source.indexOf("\n## ", start + heading.length);
    const section = source.slice(start, end === -1 ? undefined : end);
    sections.push(section);
    for (const invariant of ["conserver la session candidate", "phase: \"retry\"",
      "previousPreflightRequestId", "Ne pas réarmer, désarmer ou abandonner le job",
      "sans\nrejouer les écritures validées", "Le superviseur reste gelé",
      "Une erreur générique, un timeout seul", "l'ancienne session révoquée"]) {
      assert.ok(section.includes(invariant), `${path}: ${invariant}`);
    }
    assert.equal(source.includes("## Nouvelle session CAB après prévol de récupération divergent"), false);
  }
  assert.equal(sections[0], sections[1]);
  assert.equal(sections[1], sections[2]);
  const reset = readFileSync(new URL(
    "../plugins/cab-approval-bridge/skills/approval-bridge/references/session-reset.md", import.meta.url
  ), "utf8");
  assert.ok(reset.includes("il ne déclenche jamais cette purge"));
  assert.ok(reset.includes("--confirm-new-session --state-dir"));
  assert.ok(reset.includes("[SKILL.md](../SKILL.md)"));
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


test("le refus par polling après timeout est distribué avec une sortie humaine explicite", () => {
  for (const path of ["../ORCHESTRATED_CODING.md", "../.codex/commands/cab.md",
    "../plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md"]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");
    for (const clause of ["Depuis CAB 1.0.2", "`poll_approval` ou `get_approval`",
      "Un `PENDING` corrélé reste non terminal", "toutes les demandes enregistrées doivent être refusées",
      "Ne pas réarmer, désarmer ou abandonner le job pendant retry",
      "arrêt ciblé explicitement demandé par le développeur", "obtenir le gate `BLOQUÉ`",
      "sans purge ni suppression des historiques", "autorisation explicite de reprise"]) {
      assert.ok(source.includes(clause), `${path}: ${clause}`);
    }
  }
});


test("status route directement la consultation avant toute boucle de pilotage", () => {
  const command = readFileSync(commandPath, "utf8");
  const direct = command.indexOf("Pour l'argument `status` ou `status --run <run_id>`");
  assert.ok(direct >= 0 && direct < command.indexOf("## RUN concurrents"));
  assert.match(command.slice(direct, command.indexOf("## RUN concurrents")), /terminer la réponse après le rapport/);
  const section = command.split("## `/cab status`")[1]?.split("## `/cab start`")[0];
  assert.ok(section, "La section status doit être distribuée avant start");
  assert.match(section, /Accepter exactement `status` ou `status --run <run_id>`/);
  assert.match(section, /Refuser argument manquant, dupliqué, option inconnue ou suffixe/);
  assert.match(section, /RUN introuvable dans le périmètre consulté/);
  assert.match(section, /Ne jamais appeler POST, PATCH ou DELETE/);
  assert.doesNotMatch(section, /^\s*(?:\d+\.\s*)?(?:POST|PATCH|DELETE|systemctl)\s/m);
  assert.match(section, /n'exécutent pas broker_readiness/);
});

test("le contrat status conserve le tableau métier, la fraîcheur et les limites des preuves", () => {
  const command = readFileSync(commandPath, "utf8");
  const section = command.split("## `/cab status`")[1].split("## `/cab start`")[0];
  assert.ok(section.includes("| RUN / Nom du change | Actions réalisées | Actions en cours | Actions restant à réaliser |"));
  for (const source of ["GET /runs", "GET /status", "GET /runs/<run_id>/status", "GET /runs/<run_id>/integration-status", "wait_threads avec timeoutMs:0", "GET /session/status", "output/cismp/<run_id>/state.json", "tasks.md"]) {
    assert.ok(section.includes(source), source);
  }
  for (const state of ["ACTIF", "EN ATTENTE DE RUN", "EN ATTENTE —", "BLOQUÉ", "ARRÊTÉ", "TERMINÉ", "INDÉTERMINÉ"]) {
    assert.ok(section.includes(state), state);
  }
  assert.match(section, /une reprise plus récente corrélée/);
  assert.match(section, /Une ancienne prochaine_action ne prime pas/);
  assert.match(section, /Une exclusion actuelle reste affichée même si Codex poursuit/);
  assert.match(section, /Ne pas transformer tous les obstacles d'intégration/);
  assert.match(section, /Une coche seule reste une réalisation déclarée/);
  assert.match(section, /distinguer gate individuel d'un change et état du parent/);
});
