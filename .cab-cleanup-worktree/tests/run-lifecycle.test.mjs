import assert from 'node:assert/strict';
import test from 'node:test';
import { RUN_STEPS, nextLifecycle, validLifecycle, publicLifecycle, lifecycleView } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-run-steps.mjs';

test('catalogue unique : onze noms, positions stables et version commune', () => {
  assert.deepEqual(RUN_STEPS.map((step) => step.name), ['Initialisation', 'Prévol', 'Analyse', 'Cadrage', 'Spécification',
    'Implémentation', 'Vérifications', 'Revue', 'Archivage', 'Statistiques', 'Clôture']);
  assert.equal(new Set(RUN_STEPS.map((step) => step.id)).size, 11);
  assert.deepEqual(RUN_STEPS.map((step) => step.position), Array.from({ length: 11 }, (_, i) => i + 1));
  assert.ok(RUN_STEPS.every((step) => step.total === 11));
});

test('retours 7→6 et 8→6, idempotence et séquence concurrente périmée', () => {
  let lifecycle;
  for (const id of ['VERIFICATION', 'IMPLEMENTATION', 'REVIEW', 'IMPLEMENTATION']) {
    lifecycle = nextLifecycle(lifecycle, id, undefined, lifecycle?.sequence || 0);
  }
  assert.equal(lifecycleView(lifecycle).current.position, 6);
  assert.deepEqual(lifecycle.history.map((entry) => entry.id), ['VERIFICATION', 'IMPLEMENTATION', 'REVIEW', 'IMPLEMENTATION']);
  assert.equal(nextLifecycle(lifecycle, 'IMPLEMENTATION', undefined, 3), lifecycle);
  assert.throws(() => nextLifecycle(lifecycle, 'CLOSURE', undefined, 3), /sequence-stale/);
  assert.throws(() => nextLifecycle(lifecycle, 'IMPLEMENTATION', undefined, 0), /sequence-stale/);
});

test('couverture et non applicable conservent les positions et ne valident rien', () => {
  const lifecycle = nextLifecycle(undefined, 'SPECIFICATION', 'ALREADY_COVERED', 0);
  const next = nextLifecycle(lifecycle, 'IMPLEMENTATION', 'NOT_APPLICABLE', 1);
  assert.equal(lifecycleView(next).current.position, 6);
  assert.equal(lifecycleView(next).current.status, 'NOT_APPLICABLE');
  assert.equal(next.history[0].status, 'ALREADY_COVERED');
});

test('historique borné avec séquence durable et projections détachées', () => {
  let value;
  for (let i = 0; i < 120; i++) value = nextLifecycle(value, i % 2 ? 'IMPLEMENTATION' : 'REVIEW', undefined, i);
  assert.equal(value.history.length, 100); assert.equal(value.sequence, 120);
  assert.equal(value.history[0].sequence, 21); assert.equal(validLifecycle(value), true);
  assert.equal(lifecycleView(value).truncated, true);
  const publicValue = publicLifecycle(value); publicValue.history[0].id = 'CLOSURE';
  assert.notEqual(value.history[0].id, publicValue.history[0].id);
  assert.equal(lifecycleView(null).current, null);
});

test('valeurs inconnues, séquences, dates et états persistés invalides refusés', () => {
  for (const [id, status, sequence] of [['invented', undefined, 0], ['REVIEW', 'DONE', 0],
    ['REVIEW', undefined, undefined], ['REVIEW', undefined, -1], ['REVIEW', undefined, 0.5]]) {
    assert.throws(() => nextLifecycle(undefined, id, status, sequence), /invalid-lifecycle-step/);
  }
  const valid = nextLifecycle(undefined, 'REVIEW', undefined, 0);
  for (const value of [null, {}, { ...valid, schemaVersion: 2 }, { ...valid, sequence: -1 },
    { ...valid, history: [] }, { ...valid, arbitrary: 'ignored?' },
    { ...valid, history: [{ ...valid.history[0], at: '2026-02-30T00:00:00.000Z' }] },
    { ...valid, history: [{ ...valid.history[0], sequence: 42 }] }]) assert.equal(validLifecycle(value), false);
});
