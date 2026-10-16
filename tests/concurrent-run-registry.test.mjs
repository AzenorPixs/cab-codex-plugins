import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { CoordinationError, RunRegistry } from "../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs";

async function setup(t) {
  const directory = mkdtempSync(join(tmpdir(), "cab-registry-"));
  const state = join(directory, "state");
  const registry = new RunRegistry(directory, state);
  await registry.acquireAuthority();
  t.after(async () => {
    if (registry.lock?.exitCode === null) {
      const exited = new Promise((resolve) => registry.lock.once("exit", resolve));
      registry.close();
      await exited;
    }
    rmSync(directory, { recursive: true, force: true });
  });
  const candidate = (runId, resources = [{ key: `file:src/${runId}.py`, mode: "write" }]) => ({
    runId, ownerId: `codex-${runId}`, sessionId: `ses_${runId}`, directory,
    changeId: `change-${runId}`, selectionKey: `requirement-${runId}`, resources, dependsOn: [],
  });
  return { directory, state, registry, candidate };
}

const completion = (run, transactionId = 'publish-a') => ({ version: run.version, referenceVersion: 0,
  acquire: false, published: true, evidence: ['validated current base and own archive'],
  completion: { transactionId, reportFile: `openspec/changes/archive/2026-10-16-${run.changeId}/STATISTIQUES.md` } });

test('publication et REPORT sont observés en une seule transition durable', async (t) => {
  const { registry, candidate, directory, state } = await setup(t);
  const a = registry.reserve(candidate('a')); const b = registry.reserve(candidate('b'));
  registry.requestIntegration('a', a.version); registry.requestIntegration('b', b.version);
  registry.ready('a', a.version); registry.ready('b', b.version);
  registry.integration('a', a.version, true);
  const observed = []; registry.observe = (snapshot) => observed.push(snapshot);
  const request = completion(a); const receipt = registry.completeIntegration('a', request);
  assert.equal(observed.length, 1);
  assert.equal(observed[0].integrationOwner, null);
  assert.equal(observed[0].runs.find((r) => r.runId === 'a').phase, 'REPORT');
  assert.equal(observed[0].schemaVersion, 3);
  assert.deepEqual(registry.integrationQueue.map((r) => r.runId), ['b']);
  const report = registry.owned('a', receipt.version);
  assert.deepEqual(report.resources, [{ key: 'file:' + request.completion.reportFile, mode: 'write' }]);
  assert.throws(() => registry.covers('a', a.version, a.resources), /version-stale/);
  assert.throws(() => registry.covers('a', receipt.version, a.resources), /outside-reservation/);
  assert.deepEqual(registry.completeIntegration('a', request), receipt);
  assert.equal(observed.length, 1);
  const restored = new RunRegistry(directory, state);
  assert.deepEqual(restored.integrationCompletions['publish-a'], receipt);
  const next = registry.reconcile('b', b.version, registry.referenceVersion);
  registry.ready('b', next.version); registry.integration('b', next.version, true);
  assert.deepEqual(registry.completionReceipt('a', request), receipt);
  assert.throws(() => registry.covers('a', receipt.version, report.resources), /integration-suspended/);
});

test('une transaction divergente ou sans garde ne modifie ni barrière ni référence', async (t) => {
  const { registry, candidate } = await setup(t);
  const a = registry.reserve(candidate('a')); const request = completion(a);
  assert.throws(() => registry.completeIntegration('a', request), /integration-not-owned/);
  registry.ready('a', a.version); registry.integration('a', a.version, true);
  const before = registry.snapshot();
  for (const bad of [
    { ...request, version: a.version + 1 }, { ...request, referenceVersion: 5 },
    { ...request, published: false }, { ...request, evidence: [] },
    { ...request, completion: { ...request.completion, reportFile: 'openspec/changes/archive/2026-10-16-change-b/STATISTIQUES.md' } },
  ]) {
    assert.throws(() => registry.completeIntegration('a', bad), CoordinationError);
    assert.deepEqual(registry.snapshot(), before);
  }
  registry.completeIntegration('a', request);
  const after = registry.snapshot();
  for (const bad of [{ ...request, evidence: ['different proof'] }, { ...request, version: a.version + 1 }]) {
    assert.throws(() => registry.completionReceipt('a', bad), /transaction-divergent/);
    assert.deepEqual(registry.snapshot(), after);
  }
  assert.throws(() => registry.completionReceipt('b', request), /transaction-divergent/);
});

test('le reçu survit à la reprise et au change suivant du même RUN', async (t) => {
  const { registry, candidate, directory, state } = await setup(t);
  const a = registry.reserve(candidate('a')); const request = completion(a);
  registry.ready('a', a.version); registry.integration('a', a.version, true);
  const receipt = registry.completeIntegration('a', request);
  const exited = new Promise((resolve) => registry.lock.once('exit', resolve));
  registry.close(); await exited;
  const restored = new RunRegistry(directory, state); await restored.acquireAuthority();
  try {
    const before = restored.snapshot();
    assert.deepEqual(restored.completeIntegration('a', request), receipt);
    assert.deepEqual(restored.snapshot(), before);
    restored.release('a', receipt.version, true);
    const next = restored.reserve({ ...candidate('a'), changeId: 'next-a', selectionKey: 'next-a', sessionId: 'ses_next' });
    assert.deepEqual(restored.completeIntegration('a', request), receipt);
    assert.equal(restored.owned('a', next.version).phase, 'WORK');
    assert.equal(new RunRegistry(directory, state).schemaVersion, 3);
    restored.requestIntegration('a', next.version);
    assert.equal(new RunRegistry(directory, state).schemaVersion, 3);
  } finally {
    const ended = new Promise((resolve) => restored.lock.once('exit', resolve)); restored.close(); await ended;
  }
});

test('une persistance échouée conserve sur disque la barrière sans publication partielle', async (t) => {
  const { registry, candidate, directory, state } = await setup(t);
  const a = registry.reserve(candidate('a'));
  registry.ready('a', a.version); registry.integration('a', a.version, true);
  const before = readFileSync(registry.path, 'utf8');
  registry.persist = () => { registry.failed = true; throw new CoordinationError('registry-persistence-failed', 503); };
  assert.throws(() => registry.completeIntegration('a', completion(a)), /persistence-failed/);
  assert.equal(readFileSync(registry.path, 'utf8'), before);
  const restored = new RunRegistry(directory, state);
  assert.equal(restored.integrationOwner, 'a'); assert.equal(restored.referenceVersion, 0);
  assert.equal(restored.runs.get('a').phase, 'WORK');
  assert.throws(() => registry.completionReceipt('a', completion(a)), /registry-unavailable/);
});

test('un reçu corrompu est refusé à la restauration sans réécriture', async (t) => {
  const { registry, candidate, directory, state } = await setup(t);
  const a = registry.reserve(candidate('a'));
  registry.ready('a', a.version); registry.integration('a', a.version, true);
  registry.completeIntegration('a', completion(a));
  for (const corrupt of [
    (data) => { data.integrationCompletions['publish-a'].referenceVersion = 99; },
    (data) => { data.runs[0].phase = 'WORK'; },
    (data) => { data.integrationCompletions['publish-a'].contextId += 1; },
  ]) {
    const data = registry.snapshot(); corrupt(data);
    const bytes = JSON.stringify(data); writeFileSync(registry.path, bytes);
    assert.throws(() => new RunRegistry(directory, state), /restoration-invalid/);
    assert.equal(readFileSync(registry.path, 'utf8'), bytes);
  }
});

test('un conflit sur le rapport refuse toute publication atomique', async (t) => {
  const { registry, candidate } = await setup(t);
  const a = registry.reserve(candidate('a')); const payload = completion(a);
  const b = registry.reserve(candidate('b', [{ key: 'file:' + payload.completion.reportFile, mode: 'read' }]));
  registry.ready('a', a.version); registry.ready('b', b.version);
  registry.integration('a', a.version, true);
  const before = registry.snapshot();
  assert.throws(() => registry.completeIntegration('a', payload), /resource-conflict/);
  assert.deepEqual(registry.snapshot(), before);
});

test("une sélection atomique admet un seul propriétaire du change ou de son intention", async (t) => {
  const { registry, candidate } = await setup(t);
  const first = registry.reserve(candidate("a"));
  assert.throws(() => registry.reserve({ ...candidate("b"), changeId: first.changeId }), /change-already-reserved/);
  assert.throws(() => registry.reserve({ ...candidate("c"), selectionKey: first.selectionKey }), /change-already-reserved/);
  assert.equal(registry.snapshot().runs.length, 1);
});

test("trois RUN indépendants coexistent et les générations anciennes sont refusées", async (t) => {
  const { registry, candidate } = await setup(t);
  const runs = ["a", "b", "c"].map((id) => registry.reserve(candidate(id)));
  assert.equal(registry.snapshot().runs.length, 3);
  const extended = registry.extend("a", { version: runs[0].version, resources: [{ key: "file:tests/a.py", mode: "write" }] });
  assert.ok(extended.version > runs[0].version);
  assert.throws(() => registry.covers("a", runs[0].version, [{ key: "file:src/a.py", mode: "write" }]), /version-stale/);
  assert.ok(registry.covers("a", extended.version, [{ key: "file:tests/a.py", mode: "write" }]));
});

test("les exclusions couvrent lectures, écritures, répertoires et effets globaux", async (t) => {
  const { registry, candidate } = await setup(t);
  registry.reserve(candidate("a", [{ key: "file:src", mode: "read" }]));
  registry.reserve(candidate("b", [{ key: "file:src/kernel.py", mode: "read" }]));
  assert.throws(() => registry.reserve(candidate("c", [{ key: "file:src/kernel.py", mode: "write" }])), /resource-conflict/);
  assert.throws(() => registry.reserve(candidate("d", [{ key: "project:*", mode: "write" }])), /resource-conflict/);
});

test("l'extension conflictuelle préserve la réservation initiale", async (t) => {
  const { registry, candidate } = await setup(t);
  const a = registry.reserve(candidate("a"));
  registry.reserve(candidate("b"));
  assert.throws(() => registry.extend("a", { version: a.version, resources: [{ key: "file:src/b.py", mode: "write" }] }), /resource-conflict/);
  assert.deepEqual(registry.owned("a", a.version).resources, a.resources);
  assert.throws(() => registry.covers("a", a.version, [{ key: "file:src/b.py", mode: "write" }]), /outside-reservation/);
  assert.throws(() => registry.covers("a", a.version, []), /resources-required/);
});

test("une dépendance attend la livraison et les réservations abandonnées ne la satisfont pas", async (t) => {
  const { registry, candidate } = await setup(t);
  const a = registry.reserve(candidate("a"));
  assert.throws(() => registry.reserve({ ...candidate("b"), dependsOn: [a.changeId] }), /dependency-not-delivered/);
  registry.ready("a", a.version);
  registry.integration("a", a.version, true);
  registry.integration("a", a.version, false, true);
  registry.release("a", a.version, true);
  assert.equal(registry.reserve({ ...candidate("b"), dependsOn: [a.changeId] }).state, "RESERVED");
  assert.throws(() => registry.reserve(candidate("a")), /change-already-delivered/);
  const next = registry.reserve({ ...candidate("a"), changeId: "next-change", sessionId: "ses_next", selectionKey: "next-requirement" });
  assert.ok(next.version > a.version);
  assert.equal(registry.snapshot().history[0].changeId, a.changeId);
});

test("une seule intégration à la fois et aucune libération pendant sa détention", async (t) => {
  const { registry, candidate } = await setup(t);
  const a = registry.reserve(candidate("a"));
  const b = registry.reserve(candidate("b"));
  registry.ready("a", a.version);
  registry.ready("b", b.version);
  registry.integration("a", a.version, true);
  assert.throws(() => registry.integration("b", b.version, true), /integration-already-owned/);
  assert.throws(() => registry.release("a", a.version, true), /integration-still-owned/);
  registry.integration("a", a.version, false);
  const refreshed = registry.reconcile("b", b.version, registry.referenceVersion);
  registry.ready("b", refreshed.version);
  registry.integration("b", refreshed.version, true);
});

test("traversal et liens sortants sont refusés, les alias internes se recouvrent", async (t) => {
  const { registry, candidate, directory } = await setup(t);
  for (const path of ["../outside", "x/../y", "/tmp/x", "x//y", "x\\y"]) {
    assert.throws(() => registry.reserve(candidate("bad", [{ key: `file:${path}`, mode: "write" }])), /resource-/);
  }
  mkdirSync(join(directory, "src"));
  symlinkSync(join(directory, "src"), join(directory, "alias"));
  symlinkSync(tmpdir(), join(directory, "outside"));
  registry.reserve(candidate("a", [{ key: "file:src/x.py", mode: "write" }]));
  assert.throws(() => registry.reserve(candidate("b", [{ key: "file:alias/x.py", mode: "write" }])), /resource-conflict/);
  assert.throws(() => registry.reserve(candidate("c", [{ key: "file:outside/x", mode: "write" }])), /outside-project/);
});

test("restauration conserve propriétaire, génération et intégration ; une autre autorité est refusée", async (t) => {
  const { registry, candidate, directory, state } = await setup(t);
  const a = registry.reserve(candidate("a"));
  registry.ready("a", a.version);
  registry.integration("a", a.version, true);
  const competing = new RunRegistry(directory, state);
  await assert.rejects(competing.acquireAuthority(), /registry-already-owned/);
  const exited = new Promise((resolve) => registry.lock.once("exit", resolve));
  registry.close();
  await exited;
  const restored = new RunRegistry(directory, state);
  await restored.acquireAuthority();
  assert.equal(restored.snapshot().integrationOwner, "a");
  assert.deepEqual(restored.owned("a", a.version), { ...a, integrationReady: true });
  const done = new Promise((resolve) => restored.lock.once("exit", resolve));
  restored.close();
  await done;
});

test("un document invalide échoue fermé sans remplacer l'état", async (t) => {
  const { registry, directory, state } = await setup(t);
  writeFileSync(registry.path, "{broken");
  assert.throws(() => new RunRegistry(directory, state), /registry-restoration-invalid/);
  assert.equal(readFileSync(registry.path, "utf8"), "{broken");
});

test("la restauration relit sous verrou et ne perd pas la dernière réservation", async (t) => {
  const { registry, candidate, directory, state } = await setup(t);
  const successor = new RunRegistry(directory, state);
  const a = registry.reserve(candidate("a"));
  const ended = new Promise((resolve) => registry.lock.once("exit", resolve));
  registry.close(); await ended;
  await successor.acquireAuthority();
  assert.equal(successor.owned("a", a.version).changeId, a.changeId);
  const done = new Promise((resolve) => successor.lock.once("exit", resolve));
  successor.close(); await done;
});

test("le registre refuse liens et identités de contexte invalides sans exposer de contenu", async (t) => {
  const { registry, candidate, directory, state } = await setup(t);
  registry.reserve(candidate("a"));
  const data = registry.snapshot();
  data.runs[0].contextId = "../../private";
  writeFileSync(registry.path, JSON.stringify(data));
  assert.throws(() => new RunRegistry(directory, state), /registry-restoration-invalid/);
  const linkState = join(directory, "link-state");
  symlinkSync(state, linkState);
  assert.throws(() => new RunRegistry(directory, linkState), /registry-path-invalid/);
});

test('file FIFO durable, drainage des RUN prêts et ordre conservé après réconciliation', async (t) => {
  const { registry, candidate, directory, state } = await setup(t);
  const a = registry.reserve(candidate('a')); const b = registry.reserve(candidate('b'));
  registry.requestIntegration('a', a.version); registry.requestIntegration('b', b.version);
  registry.requestIntegration('a', a.version);
  assert.deepEqual(registry.integrationQueue.map((e) => e.runId), ['a', 'b']);
  assert.equal(new RunRegistry(directory, state).snapshot().schemaVersion, 2);
  assert.deepEqual(new RunRegistry(directory, state).integrationQueue, registry.integrationQueue);
  assert.throws(() => registry.reserve(candidate('c')), /integration-queued/);
  assert.ok(registry.covers('b', b.version, b.resources));
  registry.ready('a', a.version); registry.ready('b', b.version);
  assert.throws(() => registry.covers('b', b.version, b.resources), /integration-draining/);
  assert.throws(() => registry.extend('b', { version: b.version,
    resources: [{ key: 'file:tests/b.py', mode: 'read' }] }), /integration-draining/);
  assert.throws(() => registry.reconcile('b', b.version, registry.referenceVersion), /integration-draining/);
  assert.throws(() => registry.integration('b', b.version, true), /integration-queue-order/);
  registry.integration('a', a.version, true);
  assert.ok(registry.covers('a', a.version, [{ key: 'project:*', mode: 'read' }]));
  registry.integration('a', a.version, false, true);
  const refreshed = registry.reconcile('b', b.version, registry.referenceVersion);
  assert.deepEqual(registry.integrationQueue.map((e) => e.runId), ['b']);
  registry.ready('b', refreshed.version); registry.integration('b', refreshed.version, true);
  assert.throws(() => registry.requestIntegration('b', refreshed.version, true), /integration-still-owned/);
});

test('annulation explicite de file et réduction de ressources ne transfèrent aucune permission', async (t) => {
  const { registry, candidate } = await setup(t);
  const a = registry.reserve(candidate('a', [{ key: 'project:*', mode: 'read' }]));
  assert.throws(() => registry.reserve(candidate('b')), /resource-conflict/);
  assert.throws(() => registry.reduce('a', { version: a.version,
    resources: [{ key: 'file:src/a.py', mode: 'write' }] }), /reduction-outside/);
  const reduced = registry.reduce('a', { version: a.version, resources: [{ key: 'file:src/a.py', mode: 'read' }] });
  assert.throws(() => registry.covers('a', a.version, a.resources), /version-stale/);
  registry.reserve(candidate('b'));
  registry.requestIntegration('a', reduced.version);
  registry.requestIntegration('a', reduced.version, true);
  assert.equal(registry.integrationQueue.length, 0);
  assert.equal(registry.owned('a', reduced.version).state, 'RESERVED');
});

test('réduire toutes les écritures ne contourne pas l’obligation de publication', async (t) => {
  const { registry, candidate } = await setup(t); const a = registry.reserve(candidate('a'));
  const reduced = registry.reduce('a', { version: a.version, resources: [{ key: 'file:src/a.py', mode: 'read' }] });
  assert.throws(() => registry.release('a', reduced.version, true), /integration-publication-required/);
});

test('closing libère les fichiers métier, conserve la publication et isole son propre rapport', async (t) => {
  const { registry, candidate, directory, state } = await setup(t);
  const a = registry.reserve(candidate('a')); registry.ready('a', a.version);
  assert.throws(() => registry.closing('a', { version: a.version,
    reportFile: 'openspec/changes/archive/2026-10-15-change-a/STATISTIQUES.md' }), /publication-required/);
  registry.integration('a', a.version, true); registry.integration('a', a.version, false, true);
  const reportFile = 'openspec/changes/archive/2026-10-15-change-a/STATISTIQUES.md';
  assert.throws(() => registry.closing('a', { version: a.version,
    reportFile: 'openspec/changes/archive/2026-10-15-change-b/STATISTIQUES.md' }), /report-target-invalid/);
  assert.throws(() => registry.closing('a', { version: a.version,
    reportFile: 'openspec/changes/archive/2026-10-15-another-change-a/STATISTIQUES.md' }), /report-target-invalid/);
  const closing = registry.closing('a', { version: a.version, reportFile });
  assert.throws(() => registry.covers('a', a.version, a.resources), /version-stale/);
  assert.throws(() => registry.covers('a', closing.version, a.resources), /outside-reservation/);
  assert.throws(() => registry.extend('a', { version: closing.version, resources: a.resources }), /report-phase-only/);
  assert.throws(() => registry.integration('a', closing.version, true), /report-phase-only/);
  const b = registry.reserve(candidate('b', a.resources));
  registry.ready('b', b.version); registry.integration('b', b.version, true);
  assert.throws(() => registry.covers('a', closing.version, closing.resources), /integration-suspended/);
  registry.integration('b', b.version, false, true);
  registry.modifying('a');
  assert.ok(registry.covers('a', closing.version, closing.resources));
  const restored = new RunRegistry(directory, state);
  assert.equal(restored.runs.get('a').phase, 'REPORT');
  assert.equal(restored.runs.get('a').integrationCompleted, true);
  assert.equal(registry.release('a', closing.version, true).state, 'DELIVERED');
});

test('file ou phase documentaire corrompue échoue fermée à la restauration', async (t) => {
  const { registry, candidate, directory, state } = await setup(t);
  const a = registry.reserve(candidate('a')); registry.requestIntegration('a', a.version);
  const data = registry.snapshot(); data.integrationQueue.push({ ...data.integrationQueue[0] });
  writeFileSync(registry.path, JSON.stringify(data));
  assert.throws(() => new RunRegistry(directory, state), /registry-restoration-invalid/);
});
