import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { RunRegistry } from "../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs";

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
