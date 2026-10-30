import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const commandPath = new URL("../.codex/commands/CAB.md", import.meta.url);
const servicePath = new URL(
  "../plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service",
  import.meta.url
);
const supervisorServicePath = new URL(
  "../plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service",
  import.meta.url
);
const monitorServicePath = new URL('../plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-monitor.service', import.meta.url);

test("les briques distribuées publient la même version de base 2.1.26", () => {
  const version = readFileSync(new URL("../pyproject.toml", import.meta.url), "utf8")
    .match(/^version = "([^"]+)"$/m)[1];
  assert.equal(version, "2.1.26");
  const plugin = JSON.parse(readFileSync(
    new URL("../plugins/cab-approval-bridge/.codex-plugin/plugin.json", import.meta.url), "utf8"));
  assert.match(plugin.version, /^2\.1\.26\+codex\.\d{14}$/);
  assert.equal(plugin.skills, './skills/');
  assert.equal(plugin.name, 'CAB');
  assert.equal(plugin.interface.displayName, 'CAB');
  const marketplace = JSON.parse(readFileSync(new URL('../.agents/plugins/marketplace.json', import.meta.url), 'utf8'));
  assert.equal(marketplace.interface.displayName, 'CAB Codex Plugins');
  assert.ok(marketplace.plugins.some(entry => entry.name === 'CAB'));
  assert.ok(!marketplace.plugins.some(entry => entry.name === 'cab-approval-bridge'));
  assert.match(readFileSync(commandPath, "utf8"), /^version: 2\.1\.26$/m);
  const skill = readFileSync(new URL('../plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md', import.meta.url), 'utf8');
  const updateReference = readFileSync(new URL('../plugins/cab-approval-bridge/skills/approval-bridge/references/component-update.md', import.meta.url), 'utf8');
  const distributedSkills = readdirSync(new URL('../plugins/cab-approval-bridge/skills/', import.meta.url));
  assert.ok(distributedSkills.includes('approval-bridge'));
  assert.ok(distributedSkills.includes('coding-session-statistics'));
  assert.ok(readFileSync(new URL('../plugins/cab-approval-bridge/skills/coding-session-statistics/SKILL.md', import.meta.url), 'utf8').length > 0);
  assert.match(skill, /^name: CAB$/m);
  assert.match(skill, /references\/component-update\.md/);
  assert.match(skill, /cgpt-approval-bridge-update\.mjs/);
  assert.match(updateReference, /INDISPONIBLE/);
  assert.match(updateReference, /cgpt-approval-bridge-monitor\.service/);
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
    assert.match(readFileSync(path, "utf8"), /^Description=CAB 2\.1\.26 /m);
  }
});

test('le plugin CABU expose son skill et partage la version distribuée', () => {
  const root = new URL('../', import.meta.url);
  const marketplace = JSON.parse(readFileSync(new URL('.agents/plugins/marketplace.json', root), 'utf8'));
  const entry = marketplace.plugins.find((plugin) => plugin.name === 'CABU');
  assert.ok(entry);
  assert.equal(entry.source.path, './plugins/cabu');
  const pluginRoot = new URL(`${entry.source.path}/`, root);
  const manifest = JSON.parse(readFileSync(new URL('.codex-plugin/plugin.json', pluginRoot), 'utf8'));
  assert.equal(manifest.name, 'CABU');
  assert.match(manifest.version, /^2\.1\.26\+codex\.\d{14}$/);
  const skill = readFileSync(new URL('skills/cabu/SKILL.md', pluginRoot), 'utf8');
  assert.match(skill, /^name: CABU$/m);
  assert.match(skill, /\$CABU/);
  assert.match(skill, /\/CAB update/);
  assert.match(skill, /conversation/);
  assert.match(readFileSync(new URL('../.codex/commands/CABU.md', import.meta.url), 'utf8'), /^version: 2\.1\.26$/m);
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
  const start = command.split('## `/CAB start`')[1].split('\n## ')[0];
  const stop = command.split('## `/CAB stop`')[1].split('\n## ')[0];
  assert.match(start, /systemctl --user start cgpt-approval-bridge-monitor\.service/);
  assert.doesNotMatch(command, /systemctl --user enable cgpt-approval-bridge-monitor/);
  assert.doesNotMatch(stop, /systemctl --user (?:stop|restart) cgpt-approval-bridge-monitor/);
  assert.match(stop, /Préserver explicitement `cgpt-approval-bridge-monitor\.service`/);
  assert.ok(start.indexOf('systemctl --user start cgpt-approval-bridge-monitor.service') <
    start.indexOf('systemctl --user start cgpt-approval-bridge-controller.service'));
  assert.match(start, /identity\.workspace/);
});

test('le catalogue des étapes et son producteur sont distribués en 2.1.26', async () => {
  const { RUN_STEPS, VERSION } = await import('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-run-steps.mjs');
  assert.equal(VERSION, '2.1.26');
  const reference = readFileSync(new URL('../plugins/cab-approval-bridge/skills/approval-bridge/references/run-lifecycle.md', import.meta.url), 'utf8');
  for (const step of RUN_STEPS) {
    assert.ok(reference.includes(step.id), step.id); assert.ok(reference.includes(step.name), step.name);
  }
  for (const path of ['../ORCHESTRATED_CODING.md', '../.codex/commands/CAB.md',
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

  assert.match(command, /^version: 2\.1\.26$/m);
  assert.match(manifest, /"version": "2\.1\.26\+codex\./);
  assert.match(controller, /const version = "2\.1\.26"/);
  assert.match(supervisor, /const version = "2\.1\.26"/);
  assert.match(broker, /SERVER_VERSION = "2\.1\.26"/);
  assert.match(project, /^version = "2\.1\.26"$/m);
});

test("la mise à jour forcée redémarre les trois unités et délègue au skill associé", () => {
  const command = readFileSync(commandPath, "utf8");
  const updateStart = command.indexOf("## `/CAB update`");
  const updateEnd = command.indexOf("## `/CAB stop`");
  const update = command.slice(updateStart, updateEnd);

  assert.match(update, /cgpt-approval-bridge-supervisor\.mjs/);
  assert.match(update, /cgpt-approval-bridge-supervisor\.service/);
  assert.match(update, /systemctl --user\s+daemon-reload/);
  assert.match(update, /cgpt-approval-bridge-update\.mjs/);
  assert.match(update, /arrête systématiquement les trois unités systemd CAB/);
  assert.match(update, /sans consulter les RUN,/);
  assert.match(update, /absence d'OpenCode/);
  assert.match(update, /cgpt-approval-bridge-controller\.service/);
  assert.match(update, /cgpt-approval-bridge-supervisor\.service/);
  assert.match(update, /cgpt-approval-bridge-monitor\.service/);
  assert.match(update, /cgpt-approval-bridge-update\.mjs/);
  assert.match(update, /skills\/approval-bridge\/SKILL\.md/);
  assert.match(update, /POST\s+\/api\/experimental\/mcp\/cgpt-validation\/disconnect/);
  assert.match(update, /POST\s+\/api\/experimental\/mcp\/cgpt-validation\/connect/);
  assert.doesNotMatch(update, /systemctl --user enable/);
  assert.match(update, /CAB_BRIQUES_MISES_À_JOUR/);
  assert.match(update, /INDISPONIBLE/);
  assert.doesNotMatch(update, /CAB_MISE_À_JOUR_EN_ATTENTE/);
  assert.match(update, /--rollback/);
  assert.match(update, /version du superviseur déployé extraite du script/);
});

test('le paquet contient les trois modules broker identiques aux sources et la procédure de mise à jour', () => {
  for (const name of ['server', 'router', 'journal']) {
    const file = 'cgpt_approval_bridge_' + name + '.py';
    assert.deepEqual(readFileSync(new URL('../src/' + file, import.meta.url)),
      readFileSync(new URL('../plugins/cab-approval-bridge/broker/' + file, import.meta.url)));
  }
  const reference = readFileSync(new URL('../plugins/cab-approval-bridge/skills/approval-bridge/references/component-update.md', import.meta.url), 'utf8');
  assert.match(reference, /INDISPONIBLE/); assert.match(reference, /ROLLBACK_FAILED/);
  assert.match(reference, /systemctl --user stop/);
});

test("la marketplace CAB distribue les statistiques avec le plugin existant", () => {
  const root = new URL("../", import.meta.url);
  const marketplace = JSON.parse(readFileSync(new URL(".agents/plugins/marketplace.json", root)));
  const entry = marketplace.plugins.find((plugin) => plugin.name === "CAB");
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
    "../.codex/commands/CAB.md",
    "../plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md",
    "../plugins/cab-approval-bridge/skills/coding-session-statistics/SKILL.md",
  ];
  for (const path of protocolPaths) {
    const protocol = readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");
    assert.match(protocol, /openspec\/changes\/archive\/<archive>\/STATISTICS\.md/, path);
    assert.match(protocol, path === '../ORCHESTRATED_CODING.md'
      ? /mandat unitaire distinct de ceux de `BLOCKERS\.md`, de `tasks\.md` et de l'archivage/
      : /mandat d'édition distinct/, path);
    assert.match(protocol, /six sections/, path);
    if (path === '../ORCHESTRATED_CODING.md') {
      assert.match(protocol, /Archivage OpenSpec autorisé et réussi/, path);
      assert.match(protocol, /Chaque rapport couvre uniquement le change auquel il est rattaché/, path);
    } else assert.match(protocol, /rapport par archive/, path);
    assert.match(protocol, /N\/A/, path);
    assert.match(protocol, path === '../ORCHESTRATED_CODING.md'
      ? /sans doublon, réouverture ni réarchivage/
      : /sans réarchiver|Ne pas réarchiver/, path);
    assert.match(protocol, /TERMINÉ/, path);
  }
  const command = readFileSync(commandPath, "utf8");
  const run = command.slice(command.indexOf("## `/CAB run`"), command.indexOf("## `/CAB test`"));
  assert.match(run, /critères de fin la preuve du rapport/);
  assert.match(run, /Ne demande pas la clôture normale `TERMINÉ` sans preuve du rapport/);
  assert.match(run, /Si l'archivage échoue/);
  assert.match(run, /`BLOQUÉ` ou un arrêt explicite/);
});

test("le protocole distribué protège la lecture seule et décrit la récupération explicite", () => {
  for (const path of [
    new URL("../.codex/commands/CAB.md", import.meta.url),
    new URL("../plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md", import.meta.url),
  ]) {
    const protocol = readFileSync(path, "utf8");
    for (const action of ["shell", "edit", "subagent", "skill"]) {
      assert.ok(protocol.includes(`"action":"${action}","resource":"*","effect":"deny"`));
    }
    assert.match(protocol, /PATCH \/api\/session/);
    assert.match(protocol, /POST \/runs\/<run_id>\/job\/recover/);
    assert.match(protocol, /phase: "prepare"/);
    assert.match(protocol, /phase: "complete"/);
    assert.match(protocol, /permissions natives\n`ask`/);
  }
});

test("le protocole distribue des cadences indépendantes et conserve le choix PLLM sans réessai implicite", () => {
  const selections = [];
  for (const path of [
    "../ORCHESTRATED_CODING.md",
    "../.codex/commands/CAB.md",
    "../plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md",
  ]) {
    const protocol = readFileSync(new URL(path, import.meta.url), "utf8")
      .replace(/\s+/g, " ");
    assert.match(protocol, /SSE OpenCode en temps réel/, path);
    assert.match(protocol, /demandes et les rapports toutes les 3 secondes/, path);
    assert.match(protocol, /pauses fixes de 7 secondes/, path);
    assert.match(protocol, /vérifications de progression/, path);
    assert.match(protocol, /temporisations techniques du superviseur/, path);
    assert.match(protocol, /checkpoint non secret/, path);
    assert.match(protocol, /réconciliation des effets, de la santé OpenCode, de MCP, de la readiness CAB et des permissions/, path);
    assert.match(protocol, /Une reprise ne vaut jamais approbation et ne rejoue aucun mandat consommé/, path);
    assert.doesNotMatch(protocol, /retente[r]? le benchmark toutes les 30 minutes|indéfiniment, sans limite de tentatives/, path);
    const heading = '## PLLM Automatique —';
    const start = protocol.indexOf(heading);
    assert.ok(start >= 0, path);
    const end = protocol.indexOf(' ## ', start + heading.length);
    const selection = protocol.slice(start, end < 0 ? undefined : end).replace(/[*`]/g, '').replace(/’/g, "'");
    const invariants = [
      /28 800 secondes/,
      /ne renouveler aucune date à la lecture|ne renouvelle aucun horodatage/,
      /ne déclenche aucune réévaluation/,
      /Seul l'orchestrateur parent/,
      /Un échec de test métier ou un défaut CAB seul/,
      /prévol natif/,
      /sans évaluation ni benchmark relancé automatiquement|ne relancer ni évaluation ni benchmark automatiquement/,
      /sans réarmement implicite|sans réarmer implicitement un job/,
    ];
    for (const invariant of invariants) assert.match(selection, invariant, path);
    selections.push(selection);
  }
  // Le protocole 0.5 centralise et reformule ses règles ; les invariants ci-dessus restent exigés sur les trois supports.
  assert.equal(selections[1], selections[2]);
  for (const path of ['../PROJECT.md', '../README.md', '../TECHNICAL.md',
    '../plugins/cab-approval-bridge/skills/approval-bridge/references/model-policy.md']) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\s+/g, ' ');
    assert.match(source, /huit heures/, path);
    assert.match(source, /sans benchmark ni réessai automatique/, path);
    assert.doesNotMatch(source, /sans limite de tentatives|retenté toutes les 30 minutes/, path);
  }
});

test('les références OpenSpec PLLM conservent une attente humaine sans réessai automatique', () => {
  const specifications = {};
  for (const name of ['persistent-job-supervision', 'codex-integration-distribution',
    'archive-session-statistics']) {
    const path = `../openspec/specs/${name}/spec.md`;
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    specifications[name] = source;
    assert.doesNotMatch(source.replace(/\s+/g, ' '),
      /retenter toutes les 30 minutes|sans limite de tentatives|nouvelles tentatives illimitées|chaque échec programme une nouvelle tentative|restaure l'échéance conservée/i,
      path);
  }
  const requirement = (name, title) => {
    const source = specifications[name];
    const marker = `### Requirement: ${title}\n`;
    const start = source.indexOf(marker);
    assert.ok(start >= 0, `${name}: ${title}`);
    const end = source.indexOf('\n### Requirement:', start + marker.length);
    return source.slice(start, end < 0 ? undefined : end).replace(/\s+/g, ' ');
  };
  const waiting = requirement('persistent-job-supervision', 'Attente humaine sans réessai PLLM automatique');
  assert.match(waiting, /attendre son instruction sans benchmark ni réessai automatique/);
  assert.match(waiting, /MUST NOT poursuivre de mandat, test, maintenance ou sonde/);
  assert.match(waiting, /une évaluation requise échoue ou ne fournit aucune politique admissible/);
  const checkpoint = requirement('persistent-job-supervision', 'Checkpoint des tentatives PLLM');
  assert.match(checkpoint, /choix PLLM vérifié éventuel et sa provenance/);
  assert.match(checkpoint, /prochaine action MUST être l'attente d'une instruction humaine, sans programmer de nouvelle échéance automatique/);
  assert.match(checkpoint, /MUST NOT dupliquer une tentative d'effet inconnu/);
  const historical = requirement('persistent-job-supervision', 'Échéance PLLM historique sans effet automatique');
  assert.match(historical, /présence, son dépassement ou sa restauration MUST NOT déclencher une évaluation, un benchmark ou un prévol automatique/);
  assert.match(historical, /ancienne échéance dépassée à la reprise/i);
  const supervision = requirement('persistent-job-supervision', "Supervision pendant l'attente PLLM");
  assert.match(supervision, /états de supervision et les preuves MUST être conservés/);
  assert.match(supervision, /MUST NOT déclencher de nouveau mandat, sonde ou benchmark automatique/);
  const recovery = requirement('persistent-job-supervision', 'Réconciliation avant reprise après benchmark');
  assert.match(recovery, /Après une évaluation autorisée réussie/);
  assert.match(recovery, /Tout nouveau choix MUST être qualifié par son prévol natif/);
  assert.match(recovery, /MUST NOT constituer une décision CAB, rejouer un mandat consommé/);
  const policy = requirement('codex-integration-distribution', 'Politique PLLM documentaire sans réessai implicite');
  assert.match(policy, /fraîcheur initiale de huit heures, choix conservé pendant la session/);
  assert.match(policy, /réévaluation sur panne réelle ou instruction explicite/);
  assert.match(policy, /attend l'instruction humaine sans réessai automatique périodique/);
  assert.match(policy, /son âge seul ne provoque ni nouveau benchmark ni bascule du choix du RUN/);
  const statistics = requirement('archive-session-statistics', "Échec statistique distinct d'un échec PLLM");
  assert.match(statistics, /MUST rester distinct de l'indisponibilité PLLM et de son attente d'instruction humaine/);
  assert.match(statistics, /MUST NOT suspendre le RUN au seul motif de cet échec/);
  assert.match(statistics, /Une échéance ou un échec statistique MUST NOT déclencher d'évaluation ou de benchmark PLLM/);
  const control = requirement('codex-integration-distribution', 'Contrôle documentaire croisé des règles PLLM');
  for (const name of Object.keys(specifications)) assert.ok(control.includes(name), name);
  assert.match(control, /Les archives historiques MUST rester hors de ce contrôle courant/);
});

test("la réactivation sûre est distribuée sans tools true pendant la génération", () => {
  for (const path of [commandPath,
    new URL("../plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md", import.meta.url)]) {
    const protocol = readFileSync(path, "utf8");
    const section = protocol.slice(protocol.indexOf("## Réactivation sûre des outils — OpenCode V2"));
    assert.match(section, /sans champ `tools` ni/);
    assert.match(section, /PATCH/);
    assert.match(section, /Relire la session/);
    assert.match(section, /prompt V2/);
    assert.match(section, /native-permission-ask-required/);
  }
});

test("le prévol divergent conserve la candidate et le job dans le protocole distribué", () => {
  const sections = [];
  for (const path of [
    "../ORCHESTRATED_CODING.md",
    "../.codex/commands/CAB.md",
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
      "Un timeout seul ne prouve ni divergence ni refus", "sans lever ce gel existant", "l'ancienne session révoquée"]) {
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
    "../.codex/commands/CAB.md",
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
  for (const path of ["../ORCHESTRATED_CODING.md", "../.codex/commands/CAB.md",
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
  const section = command.split("## `/CAB status`")[1]?.split("## `/CAB start`")[0];
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
  const section = command.split("## `/CAB status`")[1].split("## `/CAB start`")[0];
  assert.ok(section.includes("| RUN / Nom du change | Actions réalisées | Actions en cours | Actions restant à réaliser |"));
  for (const source of ["GET /runs", "GET /status", "GET /runs/<run_id>/status", "GET /runs/<run_id>/integration-status", "wait_threads avec timeoutMs:0", "GET /api/session/active", "output/cismp/<run_id>/state.json", "tasks.md"]) {
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


test('raccord catalogue distribué : préparation sans effet et transmission explicite avant armement',()=>{
 const root=new URL('../plugins/cab-approval-bridge/',import.meta.url);
 const helper=readFileSync(new URL('scripts/cgpt-approval-bridge-prepare-model-policy.mjs',root),'utf8');
 assert.match(helper,/prepareControllerModelPolicy/);assert.doesNotMatch(helper,/writeFile|systemctl|fetch\(/);
 const command=readFileSync(commandPath,'utf8');assert.match(command,/prepare-model-policy\.mjs --pllm-skill-root/);assert.match(command,/Fusionne son patch validé `OC_Codex_PLLM_CATALOG`/);assert.match(command,/résolution réussie du contrôleur avant prévol/);
});


test("les trois noms de commandes sont explicites et leurs versions concordent", () => {
  const root = new URL('../.codex/commands/', import.meta.url);
  const names = readdirSync(root);
  for (const name of ['CAB.md', 'CABU.md', 'cab.md']) {
    assert.ok(names.includes(name), name);
    const source = readFileSync(new URL(name, root), 'utf8');
    assert.match(source, /^version: 2\.1\.26$/m);
  }
  const canonical = readFileSync(commandPath, 'utf8');
  assert.match(canonical, /Commande canonique : `\/CAB`/);
  assert.match(canonical, /^## `\/CAB update`$/m);
  assert.doesNotMatch(canonical, /^## `\/cab(?: |`)/m);
});

test("CABU impose update sans argument et cab transmet ses arguments", () => {
  const root = new URL('../.codex/commands/', import.meta.url);
  for (const name of ['CABU.md', 'cab.md']) {
    const alias = readFileSync(new URL(name, root), 'utf8');
    assert.match(alias, /Charge intégralement le fichier frère `CAB\.md`/);
    assert.match(alias, /version: 2\.1\.26/);
    assert.match(alias, /absent, illisible ou d'une version différente/);
    assert.match(alias, /CAB_COMMANDE_ALIAS_INDISPONIBLE/);
    assert.match(alias, /sans recherche\nglobale ni téléchargement/);
    assert.match(alias, /dans ce même tour/);
    assert.doesNotMatch(alias, /codex plugin|systemctl|curl|^## .*update/m);
  }
  const shortcut = readFileSync(new URL('CABU.md', root), 'utf8');
  assert.match(shortcut, /fixant l'argument de\nla commande canonique à `update`/);
  assert.match(shortcut, /CAB\.md et le skill portent la procédure détaillée/);
  assert.ok(shortcut.indexOf('Syntaxe : /CABU') < shortcut.indexOf('Charge intégralement'));
  assert.match(shortcut, /termine immédiatement, avant toute lecture réseau ou effet de maintenance/);
  assert.match(shortcut, /Ne déclenche ni start,\s*ni run, ni test, ni\s*bootstrap/);
  const legacy = readFileSync(new URL('cab.md', root), 'utf8');
  assert.match(legacy, /transmettant `\$ARGUMENTS` inchangé/);
});

test("update prépare les trois commandes et protège les copies locales et le repli", () => {
  const source = readFileSync(commandPath, 'utf8');
  const update = source.split('## `/CAB update`')[1].split('## `/CAB stop`')[0];
  for (const name of ['CAB.md', 'CABU.md', 'cab.md']) assert.ok(update.includes('.codex/commands/' + name), name);
  assert.match(update,/CAB_ROOT\/plugins\/cab-approval-bridge/);
  assert.match(update,/codex plugin marketplace add <CAB_ROOT>/);
  assert.match(update,/GitHub est\s+antérieur/);
  assert.match(update,/saute les étapes distantes 1 à 7/);
  assert.match(update,/CAB_ROOT\/.codex\/commands/);
  for (const clause of ['trois téléchargements', 'version SemVer valide identique',
    'sans écrire les cibles', 'divergent est préservé', 'les fichiers absents',
    'Revérifie leurs empreintes', 'restaure les seules copies',
    'retire les seuls nouveaux fichiers', 'Un échec de restauration',
    'les trois versions, contenus et références locales']) assert.ok(update.includes(clause), clause);
  assert.ok(update.indexOf('10. Prépare') < update.indexOf('13. Pour'));
});

test('les identités et sélecteurs CAB/CABU restent en majuscules', () => {
  const command = readFileSync(commandPath, 'utf8');
  assert.ok(command.includes('CAB@cab_codex_plugins'));
  assert.ok(command.includes('CABU@cab_codex_plugins'));
  assert.ok(!command.includes('cab-approval-bridge@cab_codex_plugins'));
  assert.ok(!command.includes('cabu@cab_codex_plugins'));
  const updater = readFileSync(new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs', import.meta.url), 'utf8');
  assert.ok(updater.includes("local.name !== 'CAB'"));
});


test('release-unused distribue la procédure distincte et conserve le contrat concurrent embarqué',()=>{
  const doc=readFileSync(new URL('../plugins/cab-approval-bridge/skills/approval-bridge/references/unused-test-reservations.md',import.meta.url),'utf8');
  for(const word of ['release-unused','developerAuthorization','noEnvironmentMutation','noMutatingMandate',
    'unusedReleaseBoundary','historyHash','unused-no-effect','compaction','ancien lecteur strict'])assert.ok(doc.includes(word),word);
  for(const name of ['../plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md','../.codex/commands/CAB.md']){
    const text=readFileSync(new URL(name,import.meta.url),'utf8');
    assert.ok(text.includes('references/unused-test-reservations.md'));assert.ok(text.includes('release-unused'));
  }
});


test('isolation MCP : référence générique, sonde deny et récupération explicite distribuées',()=>{
  const reference=readFileSync(new URL('../plugins/cab-approval-bridge/skills/approval-bridge/references/mcp-location-isolation.md',import.meta.url),'utf8');
  for(const phrase of ['sharedMcpDirectory','createProbeSession','opencode-mcp-location-override-refused','INCOMPLETE',
    'Aucune boucle','disconnect','/workspace/main']){
    if(phrase==='Aucune boucle')assert.match(reference,/jamais exécuté automatiquement/);
    else assert.ok(reference.includes(phrase),phrase);
  }
  for(const path of ['../plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md','../.codex/commands/CAB.md'])
    assert.ok(readFileSync(new URL(path,import.meta.url),'utf8').includes('references/mcp-location-isolation.md'));
  assert.ok(readFileSync(new URL('../plugins/cab-approval-bridge/skills/coding-session-statistics/SKILL.md',import.meta.url),'utf8').includes('createProbeSession'));
});


test('diagnostics de décision : codes fermés et indicateur local documentés dans le jeu distribué',()=>{
 const reference=readFileSync(new URL('../plugins/cab-approval-bridge/skills/approval-bridge/references/decision-http-diagnostics.md',import.meta.url),'utf8');
 for(const name of ['resource-revision-stale','decision-already-recorded','decision-processing-failed','decision_recorded','application/json'])assert.ok(reference.includes(name),name);
 assert.match(reference,/ni de persistance après/);
 for(const path of ['../plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md','../.codex/commands/CAB.md'])assert.ok(readFileSync(new URL(path,import.meta.url),'utf8').includes('references/decision-http-diagnostics.md'));
});
