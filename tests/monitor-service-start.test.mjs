import { fixtureEnvironment } from './helpers/cab-environment.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

const plugin = new URL('../plugins/cab-approval-bridge/', import.meta.url);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function wait(check) {
  for (let attempt = 0; attempt < 100; attempt++) { if (await check()) return; await delay(30); }
  throw new Error('Service de monitoring de test indisponible.');
}
async function availablePort() {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port; await new Promise((resolve) => server.close(resolve)); return port;
}
async function installedFixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'cab-monitor-service-'));
  const home = join(directory, 'profil avec espace');
  const workspace = join(directory, 'projet avec espace');
  const reference = await readFile(new URL('skills/approval-bridge/references/monitor-service.md', plugin), 'utf8');
  const tree = reference.match(/```text\n([\s\S]*?)\n```/)[1];
  const installed = join(home, '.local', 'share', 'cab-approval-bridge-monitor');
  const copied = [];
  let folder;
  for (const line of tree.split('\n')) {
    if (['scripts/', 'web-monitor/'].includes(line)) { folder = line.slice(0, -1); continue; }
    const match = line.match(/^  ([a-z0-9.-]+\.(?:mjs|html|css))$/);
    if (!match) continue;
    const relative = folder + '/' + match[1];
    const destination = join(installed, relative);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(new URL(relative, plugin), destination); copied.push(relative);
  }
  assert.equal(copied.length, 14);
  const unit = await readFile(new URL('systemd/cgpt-approval-bridge-monitor.service', plugin), 'utf8');
  const entry = unit.match(/^ExecStart=\/usr\/bin\/env node (.+)$/m)[1].replace('%h', home);
  await mkdir(workspace, { recursive: true });
  const children = [];
  t.after(async () => {
    for (const child of children) if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited;
    }
    await rm(directory, { recursive: true, force: true });
  });
  function start(port) {
    let stderr = '';
    const child = spawn(process.execPath, [entry], { stdio: ['ignore', 'ignore', 'pipe'], env: {
      ...fixtureEnvironment, OC_Codex_WORKSPACE: workspace, OC_Codex_MONITOR_STATE_DIR: join(directory, 'catalogs'), OC_Codex_MONITOR_PORT: String(port),
      OC_Codex_CONTROLLER_URL: 'http://127.0.0.1:1', OC_Codex_SUPERVISOR_URL: 'http://127.0.0.1:1',
      OC_Codex_OPENCODE_URL: 'http://127.0.0.1:1', OC_Codex_MONITOR_POLL_INTERVAL_MS: '250',
    } });
    child.stderr.on('data', (data) => { stderr += data; }); children.push(child);
    return { child, error: () => stderr };
  }
  return { workspace, reference, unit, copied, start };
}

test('le jeu installé documenté démarre depuis son arborescence isolée sans composants CAB', async (t) => {
  const h = await installedFixture(t); const port = await availablePort(); const base = 'http://127.0.0.1:' + port;
  const process = h.start(port);
  await wait(async () => {
    if (process.child.exitCode !== null) throw new Error(process.error());
    try { return (await fetch(base + '/api/snapshot', { signal: AbortSignal.timeout(250) })).ok; }
    catch { return false; }
  });
  const snapshot = await (await fetch(base + '/api/snapshot')).json();
  assert.equal(snapshot.version, '2.1.34');
  assert.equal(snapshot.identity.workspace, await realpath(h.workspace));
  const identity = await (await fetch(base + '/api/identity')).json();
  assert.deepEqual(identity, { version: '2.1.34', identity: { workspace: await realpath(h.workspace) } });
  assert.equal((await fetch(base)).status, 200);
  for (const route of ['/app.mjs', '/stats.mjs', '/style.css']) assert.equal((await fetch(base + route)).status, 200);
  await wait(async () => (await (await fetch(base + '/api/snapshot')).json()).sources.controller?.available === false);
  assert.equal((await fetch(base)).status, 200); assert.equal(process.child.exitCode, null);
  assert.match(h.unit, /^Restart=on-failure$/m);
  assert.doesNotMatch(h.unit, /^\[Install\]|^(After|Requires|Wants|PartOf|BindsTo|Requisite|PropagatesStopTo)=/m);
});

test('un port occupé est signalé sans interrompre son propriétaire', async (t) => {
  const h = await installedFixture(t);
  const owner = createServer((request, response) => response.end('owner-preserved'));
  owner.listen(0, '127.0.0.1'); await once(owner, 'listening');
  t.after(async () => { owner.closeAllConnections(); await new Promise((resolve) => owner.close(resolve)); });
  const process = h.start(owner.address().port);
  await wait(() => process.child.exitCode !== null);
  assert.notEqual(process.child.exitCode, 0);
  assert.match(process.error(), /port indisponibles/);
  assert.equal(await (await fetch('http://127.0.0.1:' + owner.address().port)).text(), 'owner-preserved');
});

test('start, stop et reset documentent la réutilisation et les échecs sans couplage', async () => {
  const reference = await readFile(new URL('skills/approval-bridge/references/monitor-service.md', plugin), 'utf8');
  const skill = await readFile(new URL('skills/approval-bridge/SKILL.md', plugin), 'utf8');
  const reset = await readFile(new URL('skills/approval-bridge/references/session-reset.md', plugin), 'utf8');
  assert.match(skill, /references\/monitor-service\.md/);
  assert.match(reset, /moniteur|monitor\.service/);
  assert.match(reset, /préservés/);
  assert.match(reference, /sans redémarrage, recopie de fichiers ni/);
  assert.match(reference, /identity\.workspace/);
  assert.match(reference, /configuratio[nr] existante/);
  assert.match(reference, /signalé séparément du/);
  assert.match(reference, /systemctl --user daemon-reload/);
  assert.doesNotMatch(reference, /^systemctl --user enable/m);
});

test('le bootstrap précède les prévols dans chaque point d’entrée distribué', async () => {
  const command = await readFile(new URL('../.codex/commands/CAB.md', import.meta.url), 'utf8');
  const start = command.split('## `/CAB start`')[1].split('\n## ')[0];
  const routing = command.split('## RUN concurrents')[0];
  assert.match(routing, /Pour `start`, `run` ou `resume`, commencer par le seul bootstrap du monitoring/);
  assert.match(routing, /avant toute\s+réservation, PLLM ou vérification OpenCode\/CAB/);
  assert.match(routing, /aucune purge ni\s+réinitialisation n'en découle/);
  assert.match(routing, /Les consultations, `pause`, `stop`, `test` et `update` ne déclenchent pas ce bootstrap/);
  const skill = await readFile(new URL('skills/approval-bridge/SKILL.md', plugin), 'utf8');
  for (const [name, source, boundary] of [
    ['commande', start, '1. Vérifie qu’OpenCode répond'],
    ['skill', skill, '## Cadences de pilotage et attente PLLM'],
  ]) {
    const end = source.indexOf(boundary);
    assert.ok(end > 0, name + ' : étapes amont présentes');
    const bootstrap = source.slice(0, end);
    assert.match(bootstrap, /Dès la résolution du workspace absolu canonique/, name);
    assert.match(bootstrap, /references\/monitor-service\.md/, name);
    assert.match(bootstrap, /systemctl --user start cgpt-approval-bridge-monitor\.service/, name);
    assert.match(bootstrap, /avant PLLM, santé\s+OpenCode et prévols modèle\/MCP/, name);
    assert.match(bootstrap, /terminer cette tentative bornée et rapporter son résultat\s+avant les contrôles amont/, name);
    assert.match(bootstrap, /GET \/api\/identity[\s\S]*identity\.workspace[\s\S]*GET \/ ;/, name);
    assert.doesNotMatch(bootstrap, /GET \/api\/snapshot/, name);
    assert.match(bootstrap, /Un échec PLLM ou CAB ultérieur\s+n'arrête pas le moniteur/, name);
  }
});

test('la reprise avec services CAB actifs exige le bootstrap sans modifier une instance conforme', async () => {
  const reference = await readFile(new URL('skills/approval-bridge/references/monitor-service.md', plugin), 'utf8');
  const preamble = reference.split('## 1. Identité')[0];
  assert.match(preamble, /chaque entrée ou\s+reprise de session de codage pilotée autorisée/);
  assert.match(preamble, /même si contrôleur et superviseur sont déjà actifs et réutilisés/);
  assert.match(preamble, /Ne pas se limiter à\s+signaler une unité absente/);
  assert.match(reference, /Si l'unité est inactive ou absente et appartient au périmètre autorisé/);
  assert.match(reference, /Réutiliser une instance conforme \*\*sans redémarrage, recopie de fichiers ni\s+modification de configuration\*\*/);
  assert.match(reference, /identité, version ou unité divergente\s+interdit toute réaffectation ou mise à jour active implicite/);
  assert.match(reference, /au plus cinq tentatives/);
  assert.match(reference, /statut CAB, avec cause constatée et URL attendue/);
});
