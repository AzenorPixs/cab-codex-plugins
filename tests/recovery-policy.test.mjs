import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ResourceRunRegistry } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs';
import { RecoveryCoordinator, projectRecoveryReceipt } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-recovery.mjs';

async function setup(t) {
  const root = mkdtempSync(join(tmpdir(), 'cab-recovery-policy-')), state = join(root, 'state');
  const registry = new ResourceRunRegistry(root, state); await registry.acquireAuthority();
  t.after(async () => { await registry.close(); rmSync(root, { recursive: true, force: true }); });
  const browser = { key: 'browser:host-a/chromium', mode: 'write' };
  const reserve = (name, resources = [browser]) => registry.reserve({ runId: name, ownerId: 'owner-' + name,
    sessionId: 'ses_' + name, directory: root, changeId: 'change-' + name, selectionKey: 'selection-' + name,
    resources, dependsOn: [] });
  const a = reserve('a'), b = reserve('b');
  const lease = run => registry.acquireTests(run.runId, { version: run.version, transactionId: 'lease-' + run.runId,
    resources: [browser], evidence: ['isolated browser'] });
  lease(a); const waiting = lease(b);
  assert.equal(waiting.state, 'WAITING');
  const coordinator = () => new RecoveryCoordinator(registry, join(state, 'recovery-policies.json'));
  const recovery = coordinator();
  const policy = { ownerId: b.ownerId, version: b.version, policyId: 'policy-b',
    actions: ['cancel-waiting-test'], resources: [browser], authorization: 'validated change-b, cleanup waiting reservations' };
  const request = plan => ({ ownerId: b.ownerId, policyId: policy.policyId, actionId: 'action-cancel-b',
    boundaryDigest: plan.boundaryDigest, action: 'cancel-waiting-test', targetId: waiting.transactionId,
    input: { evidence: ['owner cancels unused waiting browser'] } });
  return { registry, a, b, browser, waiting, reserve, recovery, coordinator, policy, request };
}

test('politique propriétaire : portée contrôlée et reçu rejouable sans seconde mutation', async t => {
  const h = await setup(t);
  assert.throws(() => h.recovery.grant('b', { ...h.policy, ownerId: h.a.ownerId }), /recovery-policy-invalid/);
  assert.throws(() => h.recovery.grant('b', { ...h.policy, resources: [{ key: 'project:*', mode: 'write' }] }), /operation-outside-reservation/);
  h.recovery.grant('b', h.policy);
  const plan = h.recovery.plan('b');
  assert.equal(plan.actions[0].authority, 'orchestrator'); assert.equal(plan.snapshot_only, true);
  h.reserve('c', [{ key: 'file:independent.txt', mode: 'write' }]);
  assert.equal(h.recovery.plan('b').boundaryDigest, plan.boundaryDigest, 'un pair disjoint ne périme pas cette frontière');
  const request = h.request(plan), action = h.recovery.authorize('b', request);
  const result = h.registry.cancelTests('b', action.payload);
  const receipt = h.recovery.complete(action.actionId, 200, result);
  const before = h.registry.snapshot();
  const replay = h.coordinator().authorize('b', request);
  assert.equal(replay.replay, true); assert.equal(replay.status, 200); assert.deepEqual(replay.result, receipt);
  assert.deepEqual(h.registry.snapshot(), before);
  assert.equal(receipt.token, undefined); assert.equal(receipt.state, 'CANCELLED');
});

test('reprise après réponse perdue : intention sans effet non rejouée, effet observé sans causalité inventée', async t => {
  const h = await setup(t); h.recovery.grant('b', h.policy);
  const request = h.request(h.recovery.plan('b')), action = h.recovery.authorize('b', request);
  assert.equal(h.coordinator().authorize('b', request).result.error, 'recovery-action-outcome-unverified');
  h.registry.cancelTests('b', action.payload);
  const before = h.registry.snapshot(), replay = h.coordinator().authorize('b', request);
  assert.equal(replay.status, 200); assert.equal(replay.result.state, 'CANCELLED');
  assert.equal(replay.result.recoveredFrom, 'authoritative-state-without-causal-attribution');
  assert.deepEqual(h.registry.snapshot(), before);
});

test('politique : cible étrangère, jeton fourni, identifiant réutilisé et frontière périmée refusés', async t => {
  const h = await setup(t); h.recovery.grant('b', h.policy);
  const plan = h.recovery.plan('b'), request = h.request(plan);
  assert.throws(() => h.recovery.authorize('b', { ...request, targetId: 'lease-a' }), /recovery-action-not-authorized/);
  assert.throws(() => h.recovery.authorize('b', { ...request, input: { token: 'PRIVATE' } }), /recovery-input-divergent/);
  h.recovery.authorize('b', request);
  assert.throws(() => h.recovery.authorize('b', { ...request, action: 'release-test' }), /recovery-action-id-reused/);
  h.registry.suspend('b', { version: h.b.version, action: 'PAUSE', evidence: ['explicit owner pause'] });
  assert.throws(() => h.recovery.authorize('b', { ...request, actionId: 'new-stale-action' }), /recovery-boundary-stale|recovery-owner-or-policy-divergent/);
  assert.equal(h.registry.testReservations('b')[0].state, 'WAITING');
});

test('reçu public : aucun token, commande ou contenu libre ne traverse la projection', () => {
  const value = projectRecoveryReceipt({ state: 'HELD', accessId: 'access-1', token: 'PRIVATE',
    command: 'PRIVATE', resources: [{ key: 'PRIVATE' }], proofDigest: 'a'.repeat(64), fencing: 12 });
  assert.deepEqual(value, { state: 'HELD', accessId: 'access-1', fencing: 12, proofDigest: 'a'.repeat(64) });
});
