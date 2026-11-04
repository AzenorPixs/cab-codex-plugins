import assert from 'node:assert/strict';
import test from 'node:test';
import { chmodSync, linkSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ContinuityStore, TransportHandoff, validHandoffBrokerState } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-continuity.mjs';
import { nativeSnapshotLookup } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs';
import { createObservationJournal } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-events.mjs';
import { ResourceRunRegistry, COORDINATION_PROTOCOL } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'cab-continuity-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const path = join(root, 'protocol.json');
  const valid = value => Array.isArray(value?.requests) && value.requests.every(item =>
    typeof item.id === 'string' && ['PENDING', 'APPROVED', 'REJECTED'].includes(item.state));
  return { root, path, valid, create: () => new ContinuityStore(path, 'communication', valid) };
}

test('communication : demandes, décisions et séquence survivent sans créer de décision', t => {
  const h = fixture(t), first = h.create();
  assert.equal(first.snapshot(), undefined);
  const pending = { requests: [{ id: 'request-1', state: 'PENDING' }] };
  const receipt = first.write(pending), restored = h.create();
  assert.deepEqual(restored.snapshot(), pending);
  assert.equal(restored.instanceId, receipt.instanceId); assert.equal(restored.sequence, 1);
  const value = restored.snapshot(); value.requests[0].state = 'APPROVED';
  assert.equal(restored.snapshot().requests[0].state, 'PENDING');
  restored.write({ requests: [{ id: 'request-1', state: 'REJECTED' }] });
  assert.equal(h.create().sequence, 2);
  assert.equal(h.create().snapshot().requests[0].state, 'REJECTED');
});

test('communication : altération, schéma, droits et alias sont refusés sans effacer la preuve', t => {
  const h = fixture(t), store = h.create(); store.write({ requests: [] });
  const original = readFileSync(h.path, 'utf8'), envelope = JSON.parse(original);
  envelope.value.requests.push({ id: 'forged', state: 'APPROVED' });
  writeFileSync(h.path, JSON.stringify(envelope));
  assert.throws(h.create, /continuity-state-invalid/);
  writeFileSync(h.path, original); chmodSync(h.path, 0o644);
  assert.throws(h.create, /continuity-file-unsafe/); chmodSync(h.path, 0o600);
  linkSync(h.path, join(h.root, 'hardlink'));
  assert.throws(h.create, /continuity-file-unsafe/); unlinkSync(join(h.root, 'hardlink'));
  unlinkSync(h.path); writeFileSync(join(h.root, 'real.json'), original, { mode: 0o600 });
  symlinkSync(join(h.root, 'real.json'), h.path); assert.throws(h.create);
  assert.equal(readFileSync(join(h.root, 'real.json'), 'utf8'), original);
});

test('communication : limite bornée et valeur invalide ne remplacent jamais un checkpoint', t => {
  const h = fixture(t), store = h.create(); store.write({ requests: [] });
  const original = readFileSync(h.path, 'utf8');
  assert.throws(() => store.write({ requests: [{ id: 'x', state: 'EXECUTED' }] }), /continuity-state-invalid/);
  const bounded = new ContinuityStore(h.path, 'communication', h.valid, { maxBytes: 400 });
  assert.throws(() => bounded.write({ requests: [{ id: 'x'.repeat(500), state: 'PENDING' }] }), /continuity-state-too-large/);
  assert.equal(readFileSync(h.path, 'utf8'), original);
});

test('communication : un ancien écrivain ne remplace pas une séquence plus récente', t => {
  const h = fixture(t), first = h.create(); first.write({ requests: [] });
  const second = h.create(); second.write({ requests: [{ id: 'new', state: 'PENDING' }] });
  assert.throws(() => first.write({ requests: [] }), /continuity-state-changed/);
  assert.equal(h.create().snapshot().requests[0].id, 'new');
});

test('observations : reprise durable sans doublon, fenêtre dépassée et curseur étranger explicites', t => {
  const h = fixture(t), path = join(h.root, 'observations.json');
  const first = createObservationJournal({ path, limit: 2 });
  first.record('operation-state-observed', { operationId: 'op-1', operationState: 'EXECUTING' });
  const cursor = first.snapshot().cursor;
  first.record('operation-state-observed', { operationId: 'op-1', operationState: 'COMPLETED' });
  const restored = createObservationJournal({ path, limit: 2 });
  const replay = restored.snapshot(cursor);
  assert.equal(replay.replay, 'complete'); assert.equal(replay.durable, true);
  assert.equal(replay.events.length, 1); assert.equal(replay.events[0].operationState, 'COMPLETED');
  assert.equal(restored.snapshot(replay.cursor).events.length, 0);
  restored.record('validation-answered', { requestId: 'request-3', decision: 'rejected' });
  restored.record('validation-answered', { requestId: 'request-4', decision: 'rejected' });
  assert.equal(restored.snapshot(cursor).replay, 'gap');
  assert.equal(restored.snapshot('00000000-0000-4000-8000-000000000000:1').replay, 'gap');
});

test('observations : une preuve publique corrompue est signalée sans mutation métier ou effacement', t => {
  const h = fixture(t), path = join(h.root, 'observations.json');
  writeFileSync(path, 'invalid history\n', { mode: 0o600 });
  const journal = createObservationJournal({ path });
  journal.record('operation-state-observed', { operationId: 'op-1', operationState: 'UNKNOWN' });
  assert.equal(journal.snapshot().durable, false);
  assert.equal(journal.snapshot().error, 'observation-state-unavailable');
  assert.equal(readFileSync(path, 'utf8'), 'invalid history\n');
});

async function handoffFixture(t) {
  const h = fixture(t), state = join(h.root, 'state');
  let registry = new ResourceRunRegistry(h.root, state); await registry.acquireAuthority();
  t.after(async () => { await registry.close(); });
  const resources = [{ key: 'browser:host-a/chromium', mode: 'write' }];
  const run = registry.reserve({ runId: 'handoff-run', ownerId: 'owner-handoff', sessionId: 'ses_handoff',
    changeId: 'handoff-change', directory: h.root, selectionKey: 'handoff-selection', resources, dependsOn: [] });
  const lease = registry.acquireTests(run.runId, { version: run.version, transactionId: 'handoff-browser', resources, evidence: ['test lease'] });
  const approval = { coordination_protocol: COORDINATION_PROTOCOL, run_id: run.runId, reservation_version: run.version,
    session_id: run.sessionId, requestId: 'handoff-request', operation_id: 'handoff-operation',
    operation_digest: 'a'.repeat(64), expected_revisions: registry.revisions(resources), resources };
  registry.prepareOperation(run.runId, approval);
  const access = registry.acquireAccess(run.runId, { version: run.version, operationId: approval.operation_id,
    operationDigest: approval.operation_digest, resources, expectedRevisions: approval.expected_revisions });
  let clock = Date.now();
  const path = join(state, 'handoff.json'), nativeIdentity = { pid: 12345, version: '2.2.25', directory: h.root };
  const journal = () => new TransportHandoff(path, h.root, { now: () => clock });
  const restart = async () => {
    await registry.close(); registry = new ResourceRunRegistry(h.root, state); await registry.acquireAuthority();
    return registry;
  };
  return { ...h, journal, nativeIdentity, run, access, lease, restart,
    advance: ms => { clock += ms; }, get registry() { return registry; } };
}

test('transfert certifié : les baux sains restent valides et le reçu ne peut servir à un second redémarrage', async t => {
  const h = await handoffFixture(t), journal = h.journal();
  journal.prepare('update-handoff-1', h.nativeIdentity); journal.seal(h.registry);
  const restored = await h.restart();
  assert.ok(restored.restoredAccesses.has(h.access.accessId)); assert.ok(restored.restoredTests.has(h.lease.transactionId));
  assert.equal(h.journal().adopt(restored, h.nativeIdentity).adopted, true);
  assert.equal(restored.restoredAccesses.size, 0); assert.equal(restored.restoredTests.size, 0);
  const again = await h.restart();
  assert.equal(h.journal().adopt(again, h.nativeIdentity).adopted, false);
  assert.ok(again.restoredAccesses.has(h.access.accessId)); assert.ok(again.restoredTests.has(h.lease.transactionId));
});

test('transfert certifié : un état changé ou une identité native différente conserve les protections', async t => {
  const h = await handoffFixture(t), journal = h.journal();
  journal.prepare('update-handoff-2', h.nativeIdentity); journal.seal(h.registry);
  const restored = await h.restart();
  assert.equal(h.journal().adopt(restored, { ...h.nativeIdentity, pid: 54321 }).reason, 'handoff-boundary-divergent');
  restored.resourceState.sequence++; restored.persist();
  assert.equal(h.journal().adopt(restored, h.nativeIdentity).adopted, false);
  assert.ok(restored.restoredAccesses.has(h.access.accessId)); assert.ok(restored.restoredTests.has(h.lease.transactionId));
});

test('transfert certifié : une préparation seule ou expirée ne vaut jamais une restitution de ressource', async t => {
  const h = await handoffFixture(t), journal = h.journal();
  journal.prepare('update-handoff-3', h.nativeIdentity);
  assert.equal(journal.adopt(h.registry, h.nativeIdentity).adopted, false);
  h.advance(30001);
  assert.throws(() => journal.seal(h.registry), /handoff-boundary-expired/);
  const restored = await h.restart();
  assert.ok(restored.restoredAccesses.has(h.access.accessId)); assert.ok(restored.restoredTests.has(h.lease.transactionId));
});

test('transfert : readiness privée liée au processus, sans exposition ni horodatage renouvelé',async t=>{
  const h=await handoffFixture(t),journal=h.journal();
  const state={identity:{pid:123,startTime:'456'},readiness:{status:'READY',ready:true,instance_id:'inst-fixture',
    server_version:'2.2.25',coordination_protocol:'resource-scoped-v1',pending_count:0,
    broker_process:{pid:123,started_at:'2026-11-02T12:00:00Z'},checked_at:'2026-11-02T12:00:01Z'}};
  assert.equal(validHandoffBrokerState(state),true);
  assert.equal(validHandoffBrokerState({...state,identity:{pid:124,startTime:'456'}}),false);
  assert.equal(validHandoffBrokerState({...state,readiness:{...state.readiness,status:'BLOCKED'}}),false);
  journal.prepare('broker-preserved',h.nativeIdentity,state);journal.seal(h.registry);
  const restored=h.journal();assert.deepEqual(restored.brokerState(),state);
  assert.equal(restored.snapshot().brokerState,undefined);
  const detached=restored.brokerState();detached.readiness.checked_at='changed';
  assert.equal(restored.brokerState().readiness.checked_at,state.readiness.checked_at);
});

test('lookup natif : une consultation sans effet ne devient jamais une preuve de refus métier',()=>{
  const input={requestId:'request',run_id:'run',session_id:'ses_fixture',operation_id:'operation',operation_digest:'a'.repeat(64)};
  const part={tool:'cgpt-validation_lookup_validation',executed:false,state:{status:'completed',input,
    metadata:{cabCodeMode:{envelopeHash:'b'.repeat(64)}},output:JSON.stringify({found:true,snapshot_only:true,...input})}};
  assert.equal(nativeSnapshotLookup(part),true);
  for(const mutate of [p=>{p.executed=true;},p=>{p.tool='execute';},p=>{delete p.state.metadata;},
    p=>{p.state.output='{}';},p=>{p.state.output=JSON.stringify({found:true,snapshot_only:true,...input,run_id:'foreign'});}]) {
    const changed=structuredClone(part);mutate(changed);assert.equal(nativeSnapshotLookup(changed),false);
  }
  part.state.output=JSON.stringify({found:false,snapshot_only:true});
  assert.equal(nativeSnapshotLookup(part),true,'observation pure, pas preuve de NO_EFFECT ou REJECTED');
});
