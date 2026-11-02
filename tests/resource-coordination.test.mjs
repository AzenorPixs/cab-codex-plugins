import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, linkSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ResourceRunRegistry, COORDINATION_PROTOCOL } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs';
import { RunRegistry } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs';

const fingerprint = (value) => createHash('sha256').update(value).digest('hex');
const file = (key, mode = 'write') => ({ key: 'file:' + key, mode });
async function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'cab-resource-'));
  const state = join(directory, 'state');
  let registry = new ResourceRunRegistry(directory, state);
  await registry.acquireAuthority();
  t.after(() => { registry.close(); rmSync(directory, { recursive: true, force: true }); });
  const reserve = (id, resources, exclusiveResources) => registry.reserve({ runId: id, ownerId: 'owner-' + id,
    sessionId: 'ses_' + id, directory, changeId: 'change-' + id, selectionKey: 'key-' + id,
    resources, exclusiveResources, dependsOn: [] });
  const prepare = (run, operationId, resources = run.resources, accessId) => {
    const approval = { coordination_protocol: COORDINATION_PROTOCOL, run_id: run.runId,
      reservation_version: run.version, session_id: run.sessionId, requestId: 'request-' + operationId,
      operation_id: operationId, operation_digest: fingerprint(operationId), expected_revisions: registry.revisions(resources),
      resources, ...(accessId ? { access_id: accessId } : {}) };
    registry.prepareOperation(run.runId, approval);
    return { runId: run.runId, operationId, reservationVersion: run.version, sessionId: run.sessionId,
      operationDigest: approval.operation_digest, expectedRevisions: approval.expected_revisions, resources };
  };
  const acquire = (run, op, overrides = {}) => registry.acquireAccess(run.runId, {
    version: run.version, operationId: op.operationId, operationDigest: op.operationDigest,
    resources: op.resources, expectedRevisions: op.expectedRevisions, ...overrides });
  const start = (run, op, kind = 'bash') => {
    registry.nativeStart(run.runId, { ...op, kind }, 'request-' + op.operationId, { id: 'permission-' + op.operationId,
      tool: { callID: 'call-' + op.operationId } });
    registry.nativeIssued(op.operationId);
  };
  const complete = (run, op, status = 'completed', exit = 0) => {
    const proof={sessionId:run.sessionId,permissionId:'permission-'+op.operationId,callId:'call-'+op.operationId,
      finishedAt:Date.now(),status,exit};
    registry.completeNative(run.runId,op.operationId,proof);
    const stored=registry.resourceState.operations[op.operationId];
    registry.recordNativeOutcome(run.runId,op.operationId,{status,proofStatus:status,exit,
      partDigest:fingerprint(JSON.stringify([op.operationId,status,exit]))},stored.completionDigest);
  };
  const release = (run, access, outcome = 'COMPLETED') => registry.releaseAccess(run.runId, {
    version: run.version, operationId: access.accessId, token: access.token, fencing: access.fencing,
    outcome, evidence: ['native end and effects reviewed'] });
  const restart = async () => {
    registry.close();
    await new Promise((resolve) => setTimeout(resolve, 30));
    registry = new ResourceRunRegistry(directory, state); await registry.acquireAuthority(); return registry;
  };
  return { directory, state, reserve, prepare, acquire, start, complete, release, restart, get r() { return registry; } };
}

test('stopped abandoned RUN can reserve a fresh generation after restart', async (t) => {
  const h = await fixture(t); const a = h.reserve('a', [file('x', 'read')]);
  h.r.suspend('a', { version: a.version, action: 'STOP', evidence: ['targeted stop'] });
  const abandoned = h.r.release('a', a.version, false);
  const restored = await h.restart();
  assert.equal(restored.runs.get('a').version, abandoned.version);
  const next = restored.reserve({ runId: 'a', ownerId: 'owner-a', sessionId: a.sessionId,
    directory: h.directory, changeId: a.changeId, selectionKey: a.selectionKey,
    resources: a.resources, dependsOn: [] });
  assert.equal(next.state, 'RESERVED');
  assert.ok(next.version > abandoned.version); assert.notEqual(next.contextId, a.contextId);
  assert.equal(next.suspension, undefined);
  assert.ok(restored.history.some((run) => run.runId === 'a' && run.contextId === a.contextId &&
    run.state === 'ABANDONED' && run.suspension.action === 'STOP'));
  assert.throws(() => restored.suspend('a', { version: a.version, action: 'RESUME',
    evidence: ['stale generation'] }), /reservation-version-stale/);
  assert.equal(Object.keys(restored.resourceState.operations).length, 0);
});

test('stopped delivered RUN can reserve a different change without inheriting STOP', async (t) => {
  const h = await fixture(t); const a = h.reserve('a', [file('x', 'read')]);
  h.r.suspend('a', { version: a.version, action: 'STOP', evidence: ['targeted stop'] });
  const delivered = h.r.release('a', a.version, true);
  const candidate = { ...a, resources: a.resources, dependsOn: [] };
  assert.throws(() => h.r.reserve(candidate), /change-already-delivered/);
  const next = h.r.reserve({ ...candidate, changeId: 'change-next', selectionKey: 'key-next', sessionId: 'ses_next' });
  assert.ok(next.version > delivered.version); assert.equal(next.suspension, undefined);
  assert.ok(h.r.history.some((run) => run.state === 'DELIVERED' && run.suspension.action === 'STOP'));
});

test('fresh reservation preserves owner, active suspension and global freeze guards', async (t) => {
  const h = await fixture(t); const a = h.reserve('a', [file('x', 'read')]);
  const candidate = { ...a, resources: a.resources, dependsOn: [] };
  for (const action of ['PAUSE', 'STOP']) {
    h.r.suspend('a', { version: a.version, action, evidence: ['active suspension'] });
    assert.throws(() => h.r.reserve(candidate), new RegExp('run-' + action.toLowerCase()));
  }
  const abandoned = h.r.release('a', a.version, false);
  assert.throws(() => h.r.reserve({ ...candidate, ownerId: 'other-owner' }), /run-id-already-used/);
  const global = h.r.requestGlobal({ cause: 'GLOBAL_PAUSE', scope: 'all', transactionId: 'freeze-restart',
    authorization: 'explicit test freeze', evidence: ['global freeze'] });
  assert.throws(() => h.r.reserve(candidate), /global-coordination-suspended/);
  assert.equal(h.r.runs.get('a').version, abandoned.version); assert.equal(h.r.history.length, 0);
  h.r.confirmGlobal({ ...global, evidence: ['no active effects'] });
  h.r.releaseGlobal({ ...global, authorization: 'explicit resume', evidence: ['reconciliation'] });
  assert.equal(h.r.reserve(candidate).state, 'RESERVED');
});

test('rejet natif : les reçus 2.1.67 sont normalisés sans perdre leur empreinte ni l’identité',async t=>{
 const h=await fixture(t);const run=h.reserve('native-reject-migration',[file('rejected.txt')]);
 const op=h.prepare(run,'native-reject-operation');const stored=h.r.resourceState.operations[op.operationId];
 h.r.claimRequest(run.runId,stored.requestId,fingerprint('native-reject-owner'),false);
 const proofDigest=fingerprint('native-reject-transcript');
 h.r.recordRejectedNativeDecision(run.runId,op.operationId,{status:'rejected',requestId:stored.requestId,
  approvalId:'approval-native-reject',changeId:run.changeId,operationId:op.operationId,
  operationDigest:op.operationDigest,identityDigest:stored.identityDigest,runId:run.runId,
  version:run.version,sessionId:run.sessionId},proofDigest);
 const legacy=JSON.parse(readFileSync(h.r.path,'utf8'));
 const legacyOperation=legacy.coordination.operations[op.operationId];
 legacyOperation.nativeRejectionProofDigest=proofDigest;
 legacyOperation.decision.nativeProofDigest=proofDigest;
 delete legacyOperation.completionDigest;
 writeFileSync(h.r.path,JSON.stringify(legacy)+'\n');
 const restored=await h.restart();
 const operation=restored.resourceState.operations[op.operationId];
 assert.equal(operation.state,'CANCELLED');assert.equal(operation.decision.status,'rejected');
 assert.equal(operation.completionDigest,proofDigest);
 assert.equal(operation.nativeRejectionProofDigest,undefined);assert.equal(operation.decision.nativeProofDigest,undefined);
 const persisted=JSON.parse(readFileSync(restored.path,'utf8')).coordination.operations[op.operationId];
 assert.equal(persisted.completionDigest,proofDigest);assert.equal(persisted.nativeRejectionProofDigest,undefined);
});

test('rejet natif persiste son empreinte dans le schéma compatible et migre les champs 2.1.68',async t=>{
 const h=await fixture(t);const run=h.reserve('native-reject-migration',[file('rejected.txt')]);
 const op=h.prepare(run,'native-reject-operation');const stored=h.r.resourceState.operations[op.operationId];
 h.r.claimRequest(run.runId,stored.requestId,fingerprint('native-reject-owner'),false);
 const proofDigest=fingerprint('native-reject-transcript');
 const decision={status:'rejected',requestId:stored.requestId,approvalId:'approval-native-reject',
  changeId:run.changeId,operationId:op.operationId,operationDigest:op.operationDigest,
  identityDigest:stored.identityDigest,runId:run.runId,version:run.version,sessionId:run.sessionId};
 h.r.recordRejectedNativeDecision(run.runId,op.operationId,decision,proofDigest);
 let snapshot=JSON.parse(readFileSync(h.r.path,'utf8'));
 let record=snapshot.coordination.operations[op.operationId];
 assert.equal(record.state,'CANCELLED');assert.equal(record.completionDigest,proofDigest);
 assert.equal(record.nativeRejectionProofDigest,undefined);assert.equal(record.decision.nativeProofDigest,undefined);
 record.nativeRejectionProofDigest=proofDigest;record.decision.nativeProofDigest=proofDigest;delete record.completionDigest;
 writeFileSync(h.r.path,JSON.stringify(snapshot)+'\n');
 const restored=await h.restart();
 record=restored.resourceState.operations[op.operationId];
 assert.equal(record.state,'CANCELLED');assert.equal(record.completionDigest,proofDigest);
 assert.equal(record.nativeRejectionProofDigest,undefined);assert.equal(record.decision.nativeProofDigest,undefined);
 const persisted=JSON.parse(readFileSync(restored.path,'utf8')).coordination.operations[op.operationId];
 assert.equal(persisted.completionDigest,proofDigest);assert.equal(persisted.nativeRejectionProofDigest,undefined);
});

test('three independent RUNs execute without a cohort or global integration', async (t) => {
  const h = await fixture(t);
  const runs = ['a', 'b', 'c'].map((id) => h.reserve(id, [file('src/' + id)]));
  const operations = runs.map((run) => h.prepare(run, run.runId));
  const accesses = operations.map((op, i) => h.acquire(runs[i], op));
  assert.ok(accesses.every((a) => a.state === 'HELD'));
  operations.forEach((op, i) => h.start(runs[i], op));
  assert.equal(h.r.accesses().filter((a) => a.state === 'EXECUTING').length, 3);
  assert.equal(h.r.snapshot().coordination.global, null);
  assert.throws(() => h.r.integration('a', runs[0].version, true), /coordination-upgrade-required/);
});

test('an entire set waits without partial ownership while independent work advances', async (t) => {
  const h = await fixture(t);
  const a = h.reserve('a', [file('x')]); const b = h.reserve('b', [file('x'), file('y')]);
  const c = h.reserve('c', [file('z')]);
  h.acquire(a, h.prepare(a, 'a'));
  const waiting = h.acquire(b, h.prepare(b, 'b'));
  assert.equal(waiting.state, 'WAITING'); assert.equal(waiting.token, undefined);
  assert.equal(h.r.accesses('b')[0].blockers[0].runId, 'a');
  assert.equal(h.acquire(c, h.prepare(c, 'c')).state, 'HELD');
});

test('readers coexist and later readers do not starve a waiting writer', async (t) => {
  const h = await fixture(t);
  const a = h.reserve('a', [file('x', 'read')]); const b = h.reserve('b', [file('x', 'read')]);
  const w = h.reserve('w', [file('x')]); const c = h.reserve('c', [file('x', 'read')]);
  const read = (run, operationId) => h.r.acquireAccess(run.runId, { version: run.version, operationId,
    operationDigest: fingerprint(operationId), resources: run.resources, expectedRevisions: h.r.revisions(run.resources) });
  const aa = read(a, 'a'); const bb = read(b, 'b');
  assert.equal(aa.state, 'HELD'); assert.equal(bb.state, 'HELD');
  const writer = h.acquire(w, h.prepare(w, 'writer')); assert.equal(writer.state, 'WAITING');
  assert.equal(read(c, 'late-reader').state, 'WAITING');
  h.release(a, aa); h.release(b, bb);
  assert.equal(h.r.accesses('w')[0].state, 'HELD');
  assert.equal(h.r.accesses('c')[0].state, 'WAITING');
});

test('finished writes make queued preparations stale rather than overwriting a new base', async (t) => {
  const h = await fixture(t);
  const a = h.reserve('a', [file('x')]); const b = h.reserve('b', [file('x')]);
  const op = h.prepare(a, 'a'); const held = h.acquire(a, op);
  const old = h.prepare(b, 'old-b'); h.acquire(b, old);
  h.start(a, op); h.complete(a, op); h.release(a, held);
  assert.equal(h.r.accesses('b')[0].state, 'STALE');
  assert.throws(() => h.r.operationAdmission('b', old, 'request-old-b', 'permission'), /resource-revision-stale/);
  assert.equal(h.acquire(b, h.prepare(b, 'new-b')).state, 'HELD');
});

test('private access promotes safely when a peer declares its parent', async (t) => {
  const h = await fixture(t);
  const a = h.reserve('a', [file('src/x')], ['file:src/x']); const op = h.prepare(a, 'private');
  assert.equal(h.r.operationAdmission('a', op, 'request-private', 'permission'), true);
  const access = h.r.accesses('a')[0]; assert.equal(access.protection, 'EXCLUSIVE');
  assert.equal(h.acquire(a, op).token, access.token);
  h.start(a, op);
  const b = h.reserve('b', [file('src', 'read')]);
  const waiting = h.r.acquireAccess('b', { version: b.version, operationId: 'parent-reader',
    operationDigest: fingerprint('parent-reader'), resources: b.resources, expectedRevisions: h.r.revisions(b.resources) });
  assert.equal(waiting.state, 'WAITING');
  assert.equal(h.r.accesses('b')[0].blockers[0].reason, 'resource-promotion-pending');
  assert.equal(h.r.isExclusive(h.r.runs.get('a'), a.resources), false);
  h.complete(a, op); h.release(a, access);
  assert.equal(h.r.accesses('b')[0].state, 'STALE');
});

test('un même RUN peut acquérir des ensembles indépendants, mais pas étendre ni recouvrir un accès', async (t) => {
  const h = await fixture(t); const a = h.reserve('a', [file('x'), file('y')]);
  const first = h.prepare(a, 'first', [file('x')]); assert.equal(h.acquire(a, first).state,'HELD');
  const second = h.prepare(a, 'second', [file('y')]);
  assert.equal(h.acquire(a, second).state,'HELD');
  const overlap=h.prepare(a,'overlap',[file('x')]);
  assert.equal(h.acquire(a,overlap).state,'WAITING');
  assert.throws(() => h.r.extend('a', { version: a.version, resources: [file('z')] }), /run-accesses-unresolved/);
});

test('hardlink aliases are refused and subtree proofs notice new descendants', async (t) => {
  const h = await fixture(t); mkdirSync(join(h.directory, 'src'));
  writeFileSync(join(h.directory, 'src/x'), 'data'); linkSync(join(h.directory, 'src/x'), join(h.directory, 'alias'));
  assert.throws(() => h.reserve('alias', [file('alias')]), /resource-physical-alias-refused/);
  const a = h.reserve('a', [file('src/new')]); const op = h.prepare(a, 'new');
  const before = h.r.revisions([file('src', 'read')]); const access = h.acquire(a, op);
  h.start(a, op); h.complete(a, op); h.release(a, access);
  assert.throws(() => h.r.validateExpected(before, [file('src', 'read')]), /resource-revision-stale/);
  assert.equal(h.r.revision('file:unrelated'), 0);
});

test('unknown effects survive restart, fence old permissions and require native proof', async (t) => {
  const h = await fixture(t); const a = h.reserve('a', [file('x')]); const op = h.prepare(a, 'crash');
  const access = h.acquire(a, op); h.start(a, op); h.r.nativeUnknown(op.operationId);
  assert.throws(() => h.release(a, access), /access-effects-unresolved/);
  await h.restart(); assert.equal(h.r.accesses('a')[0].state, 'UNKNOWN');
  assert.throws(() => h.r.operationAdmission('a', op, 'request-crash', 'permission'), /operation-access-not-held/);
  assert.throws(() => h.r.completeNative('a', op.operationId, { sessionId: a.sessionId }), /native-completion-not-proved/);
  h.complete(a, op, 'error');
  assert.throws(() => h.release(a, access), /access-native-failure/);
  assert.throws(() => h.release(a, access, 'NO_EFFECT'), /access-outcome-invalid/);
  h.release(a, access, 'RECONCILED');
  assert.ok(h.r.revision('file:x') > 0);
  assert.throws(() => h.r.operationAdmission('a', op, 'request-crash', 'permission'), /resource-revision-stale/);
});

test('edit natif en erreur peut être libéré sans effet si la révision reste inchangée',async t=>{
 const h=await fixture(t);const a=h.reserve('edit-failure',[file('theme.css')]);const op=h.prepare(a,'edit-failure');
 const access=h.acquire(a,op);const expected=h.r.revision('file:theme.css');h.start(a,op,'edit');h.complete(a,op,'error');
 assert.throws(()=>h.release(a,access),/access-native-failure/);
 assert.equal(h.release(a,access,'NO_EFFECT').state,'RELEASED');
 assert.equal(h.r.revision('file:theme.css'),expected);
 assert.equal(h.r.runs.get('edit-failure').pendingWrites,undefined);
});

test('NO_EFFECT refuse une révision divergente et un edit sans preuve d’erreur',async t=>{
 const h=await fixture(t);const a=h.reserve('edit-stale',[file('theme.css')]);const op=h.prepare(a,'edit-stale');
 const access=h.acquire(a,op);h.start(a,op,'edit');h.complete(a,op,'error');
 h.r.resourceState.revisions['file:theme.css']=1;h.r.resourceState.sequence++;
 assert.throws(()=>h.release(a,access,'NO_EFFECT'),/access-outcome-revision-divergent/);
});

test('OpenSpec read validation does not suspend independent code writes', async (t) => {
  const h = await fixture(t);
  const a = h.reserve('a', [file('openspec', 'read')]); const b = h.reserve('b', [file('src/b')]);
  const c = h.reserve('c', [file('openspec/specs/x')]);
  const read = h.r.acquireAccess('a', { version: a.version, operationId: 'validation',
    operationDigest: fingerprint('validation'), resources: a.resources, expectedRevisions: h.r.revisions(a.resources) });
  assert.equal(read.state, 'HELD'); assert.equal(h.acquire(b, h.prepare(b, 'code')).state, 'HELD');
  assert.equal(h.acquire(c, h.prepare(c, 'spec')).state, 'WAITING');
});

test('scoped publication is idempotent, enters REPORT and does not stale independent proofs', async (t) => {
  const h = await fixture(t); const a = h.reserve('a', [file('x')]); const b = h.reserve('b', [file('y')]);
  const op = h.prepare(a, 'publish'); const access = h.acquire(a, op);
  const other = h.prepare(b, 'other'); h.acquire(b, other); h.start(b, other);
  h.start(a, op); h.complete(a, op);
  const payload = { version: a.version, transactionId: 'publish-a', operationId: access.accessId,
    token: access.token, fencing: access.fencing, outcome: 'COMPLETED', proofRevisions: op.expectedRevisions,
    evidence: ['validated state and archive reviewed'], reportFile: 'openspec/changes/archive/2026-10-16-change-a/STATISTIQUES.md' };
  const receipt = h.r.publish('a', payload);
  assert.equal(h.r.runs.get('a').phase, 'REPORT'); assert.equal(h.r.runs.get('b').version, b.version);
  assert.equal(h.r.resourceState.accesses[other.operationId].state, 'EXECUTING');
  assert.equal(Object.hasOwn(h.r.resourceState.accesses[access.accessId], 'token'), false);
  assert.deepEqual(h.r.publish('a', payload), receipt);
  assert.throws(() => h.r.publish('a', { ...payload, evidence: ['different'] }), /publication-transaction-divergent/);
  await h.restart(); assert.deepEqual(h.r.publish('a', payload), receipt);
});

test('released access removes bearer token but preserves exact replay by digest', async (t) => {
  const h = await fixture(t); const run = h.reserve('released-token', [file('preflight', 'read')]);
  const op = h.prepare(run, 'released-token-op', [file('preflight', 'read')]);
  const access = h.acquire(run, op); h.start(run, op); h.complete(run, op);
  const payload = { version: run.version, operationId: access.accessId, token: access.token,
    fencing: access.fencing, outcome: 'COMPLETED', evidence: ['native result reviewed'] };
  const released = h.r.releaseAccess(run.runId, payload);
  assert.equal(released.state, 'RELEASED'); assert.equal(Object.hasOwn(released, 'token'), false);
  assert.equal(Object.hasOwn(h.r.resourceState.accesses[access.accessId], 'token'), false);
  assert.deepEqual(h.r.releaseAccess(run.runId, payload), released);
  await h.restart();
  assert.equal(Object.hasOwn(h.r.resourceState.accesses[access.accessId], 'token'), false);
  assert.deepEqual(h.r.releaseAccess(run.runId, payload), released);
  assert.throws(() => h.r.releaseAccess(run.runId, { ...payload, evidence: ['different request'] }),
    /access-token-invalid/);
});

test('restoration scrubs a legacy token only from an already RELEASED access', async (t) => {
  const h = await fixture(t); const run = h.reserve('legacy-released-token', [file('preflight', 'read')]);
  const op = h.prepare(run, 'legacy-released-token-op', [file('preflight', 'read')]);
  const access = h.acquire(run, op); h.start(run, op); h.complete(run, op);
  const payload = { version: run.version, operationId: access.accessId, token: access.token,
    fencing: access.fencing, outcome: 'COMPLETED', evidence: ['native result reviewed'] };
  h.r.releaseAccess(run.runId, payload);
  h.r.resourceState.accesses[access.accessId].token = access.token;
  h.r.persist();
  await h.restart();
  const restored = h.r.resourceState.accesses[access.accessId];
  assert.equal(restored.state, 'RELEASED'); assert.equal(Object.hasOwn(restored, 'token'), false);
  assert.equal(Object.hasOwn(JSON.parse(readFileSync(h.r.path, 'utf8')).coordination.accesses[access.accessId], 'token'), false);
  assert.equal(Object.hasOwn(h.r.releaseAccess(run.runId, payload), 'token'), false);
});

test('pause is targeted, global exceptions drain explicitly and timeout never releases', async (t) => {
  const h = await fixture(t); const a = h.reserve('a', [file('x')]); const b = h.reserve('b', [file('y')]);
  h.r.suspend('a', { version: a.version, action: 'PAUSE', evidence: ['developer request'] });
  assert.throws(() => h.prepare(a, 'paused'), /run-pause/);
  const op = h.prepare(b, 'b'); const access = h.acquire(b, op); h.start(b, op);
  assert.throws(() => h.r.requestGlobal({ cause: 'VALIDATION', scope: 'all', transactionId: 'bad',
    authorization: 'test', evidence: ['test'] }), /global-exception-required/);
  const global = h.r.requestGlobal({ cause: 'GLOBAL_PAUSE', scope: 'all', transactionId: 'pause-all',
    authorization: 'explicit developer pause all', evidence: ['authorization reference'] });
  assert.throws(() => h.r.confirmGlobal({ ...global, evidence: ['not done'] }), /global-effects-unresolved/);
  h.complete(b, op); h.release(b, access);
  h.r.confirmGlobal({ ...global, evidence: ['native cohort idle'] });
  assert.throws(() => h.prepare(b, 'frozen'), /global-coordination-suspended/);
  h.r.releaseGlobal({ ...global, authorization: 'explicit resume', evidence: ['reconciliation'] });
  assert.throws(() => h.prepare(a, 'still-paused'), /run-pause/);
  assert.ok(h.prepare(b, 'resumed'));
});

test('legacy migration preserves identities and refuses mutations until maintenance', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'cab-migrate-')); const state = join(directory, 'state');
  const old = new RunRegistry(directory, state); await old.acquireAuthority();
  const a = old.reserve({ runId: 'a', ownerId: 'owner-a', sessionId: 'ses_a', directory,
    changeId: 'change-a', selectionKey: 'key-a', resources: [file('x')], dependsOn: [] });
  old.claimRequest('a', 'already-consumed', fingerprint('request'), false); old.close();
  await new Promise((resolve) => setTimeout(resolve, 30));
  const r = new ResourceRunRegistry(directory, state); await r.acquireAuthority();
  t.after(() => { r.close(); rmSync(directory, { recursive: true, force: true }); });
  const original = readFileSync(r.path);
  assert.equal(r.migrationRequired, true);
  assert.throws(() => r.covers('a', a.version, a.resources), /coordination-upgrade-required/);
  assert.deepEqual(readFileSync(r.path), original);
  const result = r.migrate({ cause: 'SHARED_MAINTENANCE', authorization: 'explicit migration',
    evidence: ['backup and native reconciliation'], quiescent: true });
  assert.equal(result.schemaVersion, 4); assert.equal(result.coordination.global.state, 'HELD');
  assert.equal(result.runs[0].contextId, a.contextId); assert.ok(result.requestOwners['already-consumed']);
});

test('a group retains its complete set but each native operation stays distinct', async (t) => {
  const h = await fixture(t); const a = h.reserve('a', [file('x'), file('y')]);
  const one = h.prepare(a, 'one', [file('x')], 'group'); const two = h.prepare(a, 'two', [file('y')], 'group');
  const access = h.r.acquireAccess('a', { version: a.version, operationId: 'group', operationDigest: fingerprint('group'),
    resources: a.resources, expectedRevisions: h.r.revisions(a.resources), operationIds: ['one', 'two'] });
  h.start(a, one); h.complete(a, one);
  assert.throws(() => h.release(a, access), /access-effects-unresolved/);
  h.start(a, two); h.complete(a, two); h.release(a, access);
  assert.ok(h.r.revision('file:x')); assert.ok(h.r.revision('file:y'));
});

test('publication protects all earlier written resources and keeps their revisions after release', async (t) => {
  const h = await fixture(t); const a = h.reserve('a', [file('x'),file('y')]);
  const op = h.prepare(a, 'write-x', [file('x')]); const access = h.acquire(a, op);
  h.start(a, op); h.complete(a, op); h.release(a, access);
  assert.ok(h.r.runs.get('a').pendingWrites['file:x']);
  const read = h.r.acquireAccess('a', { version: a.version, operationId: 'partial-publication',
    operationDigest: fingerprint('partial'), resources: [file('y','read')], expectedRevisions: { 'file:y': 0 } });
  assert.throws(() => h.r.publish('a', { version: a.version, transactionId: 'partial', operationId: read.accessId,
    token: read.token, fencing: read.fencing, outcome: 'COMPLETED', proofRevisions: { 'file:y': 0 }, evidence: ['partial'] }),
  /publication-written-resources-required/);
});

test('migration backup rolls back only before new effects and is reusable for a fresh maintenance', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'cab-rollback-')); const state = join(directory,'state');
  const old = new RunRegistry(directory,state); await old.acquireAuthority();
  old.reserve({ runId:'a',ownerId:'owner-a',sessionId:'ses_a',directory,changeId:'change-a',selectionKey:'a',
    resources:[file('x')],dependsOn:[] });
  const original = readFileSync(old.path); old.close(); await new Promise((r) => setTimeout(r,30));
  const r = new ResourceRunRegistry(directory,state); await r.acquireAuthority();
  t.after(() => {r.close();rmSync(directory,{recursive:true,force:true});});
  const authorization = {cause:'SHARED_MAINTENANCE',authorization:'explicit migration and backup',quiescent:true,evidence:['reviewed']};
  r.migrate(authorization);
  assert.equal(r.rollbackMigration({authorization:'explicit rollback before use',evidence:['no new effects']}).coordinationProtocol,'migration-required');
  assert.deepEqual(readFileSync(r.path),original);
  r.migrate(authorization);
  const g = r.resourceState.global;
  r.releaseGlobal({...g,authorization:'resume',evidence:['native preflight']});
  const run = r.runs.get('a');
  r.suspend('a',{version:run.version,action:'RESUME',evidence:['preflight only explicitly authorized']});
  assert.throws(()=>r.prepareOperation('a',{reservation_version:run.version,resources:run.resources,files:['x'],commands:[]}),/maintenance-preflight-required/);
  const resources=[file('x','read')];
  r.prepareOperation('a',{coordination_protocol:COORDINATION_PROTOCOL,reservation_version:run.version,session_id:run.sessionId,
    operation_id:'new',operation_digest:fingerprint('new'),requestId:'new-request',resources,expected_revisions:{'file:x':0},
    files:[],commands:['/usr/bin/true']});
  const access=r.acquireAccess('a',{version:run.version,operationId:'new',operationDigest:fingerprint('new'),resources,expectedRevisions:{'file:x':0}});
  const operation={operationId:'new',operationDigest:fingerprint('new'),reservationVersion:run.version,sessionId:run.sessionId,
    resources,expectedRevisions:{'file:x':0},kind:'bash',target:'/usr/bin/true'};
  r.nativeStart('a',operation,'new-request',{id:'preflight-once',tool:{callID:'preflight-call'}});r.nativeIssued('new');
  r.completeNative('a','new',{sessionId:run.sessionId,permissionId:'preflight-once',callId:'preflight-call',finishedAt:Date.now()+1,status:'completed',exit:0});
  r.releaseAccess('a',{version:run.version,operationId:'new',token:access.token,fencing:access.fencing,outcome:'COMPLETED',evidence:['native once exit zero']});
  assert.equal(r.runs.get('a').maintenancePreflightRequired,undefined);
  r.requestGlobal({cause:'SHARED_MAINTENANCE',scope:'all',transactionId:'rollback-after-use',authorization:'maintenance',evidence:['reviewed']});
  r.confirmGlobal({transactionId:'rollback-after-use',generation:r.resourceState.global.generation,evidence:['quiescent']});
  assert.throws(()=>r.rollbackMigration({authorization:'rollback',evidence:['reviewed']}),/migration-rollback-reconciliation-required/);
});

test('a restored group requires a fresh fence before a new corrective permission', async (t) => {
  const h = await fixture(t); const a = h.reserve('a',[file('x')]);
  const first = h.prepare(a,'failed',[file('x')],'group');
  const access = h.r.acquireAccess('a',{version:a.version,operationId:'group',operationDigest:fingerprint('group'),
    resources:a.resources,expectedRevisions:h.r.revisions(a.resources),operationIds:['failed']});
  h.start(a,first); await h.restart(); h.complete(a,first,'error');
  const fresh = h.r.reconcileAccess('a',{version:a.version,operationId:'group',token:access.token,fencing:access.fencing,
    transactionId:'fresh-boundary',evidence:['native end reviewed after restart']});
  assert.notEqual(fresh.token,access.token); assert.ok(fresh.fencing>access.fencing);
  const correction=h.prepare(a,'correction',[file('x')],'group');
  h.r.attachOperations('a',{version:a.version,operationId:'group',token:fresh.token,fencing:fresh.fencing,
    operationIds:['correction'],evidence:['new correction approved']});
  h.start(a,correction);h.complete(a,correction);h.release(a,fresh,'RECONCILED');
  assert.equal(h.r.accesses('a')[0].state,'RELEASED');
});

test('une réponse once tardive conserve la protection inconnue et son acquittement', async (t) => {
  const h=await fixture(t);const a=h.reserve('a',[file('x')]);const op=h.prepare(a,'late-once');const access=h.acquire(a,op);
  h.r.nativeStart('a',op,'request-late-once',{id:'permission-late-once',tool:{callID:'call-late-once'}});
  h.r.nativeUnknown(op.operationId);h.r.nativeIssued(op.operationId);
  assert.equal(h.r.resourceState.operations[op.operationId].state,'UNKNOWN');
  assert.equal(h.r.resourceState.operations[op.operationId].native.onceAcknowledged,true);
  h.complete(a,op);h.release(a,access);assert.equal(h.r.accesses('a')[0].state,'RELEASED');
});

test('un état enrichi ou une identité incohérente refuse la restauration sans réécriture', async (t) => {
  const h=await fixture(t);const a=h.reserve('a',[file('x')]);h.acquire(a,h.prepare(a,'restore'));
  const original=JSON.parse(readFileSync(h.r.path,'utf8'));
  assert.throws(()=>new RunRegistry(h.directory,h.state),/registry-restoration-invalid/);
  for(const mutate of [s=>{s.coordination.operations.restore.secret='DONNEE-INTERDITE';},
    s=>{s.coordination.operations.restore.contextId=999;},s=>{s.coordination.accesses.restore.token='jeton-invalide';}]){
    const value=structuredClone(original);mutate(value);const text=JSON.stringify(value)+'\n';writeFileSync(h.r.path,text);
    assert.throws(()=>new ResourceRunRegistry(h.directory,h.state),/registry-restoration-invalid/);
    assert.equal(readFileSync(h.r.path,'utf8'),text);
  }
});

test('la compatibilité historique reste isolée jusqu’à une réconciliation explicite', async (t) => {
  const h=await fixture(t);h.r.markLegacyUse({sessionId:'ses_legacy',directory:h.directory});
  assert.throws(()=>h.reserve('a',[file('x')]),/legacy-coordination-reconciliation-required/);
  await h.restart();assert.equal(h.r.resourceState.legacySources.length,1);
  const g=h.r.requestGlobal({cause:'GLOBAL_RECONCILIATION',scope:'all',transactionId:'legacy',authorization:'explicit handoff',evidence:['legacy effects reviewed']});
  h.r.confirmGlobal({...g,evidence:['native idle and all effects reviewed']});
  const receipt=h.r.reconcileLegacy({transactionId:'handoff',authorization:'explicit legacy closure',evidence:['no unresolved effect']});
  assert.equal(h.r.resourceState.legacySources.length,0);assert.equal(receipt.transactionId,'handoff');
  h.r.releaseGlobal({...g,authorization:'resume concurrent profile',evidence:['handoff proved']});
  assert.equal(h.reserve('a',[file('x')]).state,'RESERVED');
});

test('reprendre un groupe conservé lève la pause sans libérer ses fichiers ni rejouer once', async (t) => {
  const h=await fixture(t);const a=h.reserve('a',[file('x'),file('y')]);
  const one=h.prepare(a,'paused-one',[file('x')],'paused-group');const two=h.prepare(a,'paused-two',[file('y')],'paused-group');
  const access=h.r.acquireAccess('a',{version:a.version,operationId:'paused-group',operationDigest:fingerprint('group'),
    resources:a.resources,expectedRevisions:h.r.revisions(a.resources),operationIds:['paused-one','paused-two']});
  h.start(a,one);h.complete(a,one);
  h.r.suspend('a',{version:a.version,action:'PAUSE',evidence:['pause explicit']});
  assert.throws(()=>h.start(a,two),/run-pause/);
  h.r.suspend('a',{version:a.version,action:'RESUME',evidence:['resume same protected group']});
  assert.equal(h.r.accesses('a')[0].token,access.token);
  assert.throws(()=>h.start(a,one),/operation-access-not-held/);
  h.start(a,two);h.complete(a,two);h.release(a,access);
});


const dockerTest = { key: 'docker:engine-a', mode: 'write' };
const lxcTest = { key: 'lxc:host-a/101', mode: 'write' };
const testLease = (h, run, transactionId, resources = run.resources) => h.r.acquireTests(run.runId, {
  version: run.version, transactionId, resources, evidence: ['canonical environment identity reviewed'] });
const testPayload = (run, entry, extra = {}) => ({ version: run.version, transactionId: entry.transactionId,
  token: entry.token, fencing: entry.fencing, evidence: ['native completion and environment restoration reviewed'], ...extra });
function finishTestCommand(h, run, id, resources = run.resources, exit = 0) {
  const op = { ...h.prepare(run, id, resources), kind: 'bash', target: '/usr/bin/true' }; const access = h.acquire(run, op);
  assert.equal(access.state, 'HELD'); h.start(run, op); h.complete(run, op, 'completed', exit);
  h.release(run, access); return op;
}
function cleanupProof(h, run, prefix, resources = run.resources) {
  const cleanup = finishTestCommand(h, run, prefix + '-cleanup', resources);
  const check = finishTestCommand(h, run, prefix + '-verify', resources);
  return resources.map((r) => ({ resourceKey: r.key, cleanupOperationId: cleanup.operationId,
    verificationOperationId: check.operationId, restored: true }));
}

test('Les réservations Docker/LXC sont atomiques, FIFO et indépendantes des verrous de commandes', async (t) => {
  const h = await fixture(t);
  const a = h.reserve('a', [dockerTest]); const b = h.reserve('b', [dockerTest]);
  const c = h.reserve('c', [lxcTest]); const d = h.reserve('d', [dockerTest, lxcTest]);
  const held = testLease(h,a,'lease-a'); assert.equal(held.state,'HELD');
  assert.equal(testLease(h,b,'lease-b').state,'WAITING');
  assert.equal(testLease(h,c,'lease-c').state,'HELD');
  assert.equal(testLease(h,d,'lease-d').state,'WAITING');
  finishTestCommand(h,a,'failed-test',a.resources,1);
  assert.equal(h.r.testReservations('a')[0].state,'HELD');
  assert.equal(h.r.testReservations('b')[0].state,'WAITING');
  assert.throws(() => h.r.release('a',a.version,true), /run-accesses-unresolved/);
  assert.throws(() => h.r.reduce('a',{version:a.version,resources:[dockerTest]}), /run-accesses-unresolved/);
  assert.throws(() => h.r.publish('a',{version:a.version,transactionId:'publish-a',evidence:['test']}), /run-test-resources-unresolved/);
  const payload = testPayload(a,held,{cleanup:cleanupProof(h,a,'a')});
  assert.equal(h.r.releaseTests('a',payload).state,'RELEASED');
  assert.equal(h.r.releaseTests('a',payload).state,'RELEASED');
  assert.throws(() => h.r.releaseTests('a',{...payload,evidence:['changed']}), /test-token-invalid/);
  assert.equal(h.r.testReservations('b')[0].state,'HELD');
  assert.equal(h.r.testReservations('d')[0].state,'WAITING');
  assert.equal(h.r.resourceState.global,null);
});

test('Le nettoyage exige des opérations natives réussies et ordonnées du cycle exact', async (t) => {
  const h = await fixture(t); const a=h.reserve('a',[dockerTest]); const entry=testLease(h,a,'lease-a');
  const payload=testPayload(a,entry);
  assert.throws(() => h.r.releaseTests('a',{...payload,cleanup:[{resourceKey:dockerTest.key,restored:true}]}),/test-cleanup-proof-required/);
  finishTestCommand(h,a,'test');
  const cleanup=finishTestCommand(h,a,'bad-cleanup',a.resources,1);
  const check=finishTestCommand(h,a,'verify');
  const proof=[{resourceKey:dockerTest.key,cleanupOperationId:cleanup.operationId,verificationOperationId:check.operationId,restored:true}];
  assert.throws(() => h.r.releaseTests('a',{...payload,cleanup:proof}),/test-cleanup-proof-required/);
  const complete=cleanupProof(h,a,'good');
  finishTestCommand(h,a,'test-after-cleanup');
  assert.throws(() => h.r.releaseTests('a',{...payload,cleanup:complete}),/test-cleanup-proof-required/);
  assert.equal(h.r.releaseTests('a',{...payload,cleanup:cleanupProof(h,a,'final')}).state,'RELEASED');
});

test('Le redémarrage conserve la réservation de test et la réconciliation renouvelle le jeton', async (t) => {
  const h=await fixture(t);const a=h.reserve('a',[lxcTest]);
  const acquisition={version:a.version,transactionId:'lease-a',resources:[lxcTest],evidence:['canonical environment identity reviewed']};
  const entry=h.r.acquireTests(a.runId,acquisition);
  finishTestCommand(h,a,'test'); await h.restart();
  assert.equal(h.r.testReservations('a')[0].reconciliationRequired,true);
  const reacquired=h.r.acquireTests(a.runId,acquisition);
  assert.equal(reacquired.state,'HELD');assert.equal(reacquired.token,entry.token);assert.equal(reacquired.fencing,entry.fencing);
  assert.equal(reacquired.reconciliationRequired,true);
  const op=h.prepare(a,'after-crash');
  assert.throws(() => h.acquire(a,op),/test-reconciliation-required/);
  assert.throws(() => h.r.releaseTests('a',testPayload(a,reacquired)),/test-reconciliation-required/);
  assert.throws(() => h.r.acquireTests(a.runId,{...acquisition,evidence:['divergent evidence']}),/test-transaction-divergent/);
  const reconciliation=testPayload(a,reacquired,{reconciliationId:'reconcile-a'});
  const restored=h.r.reconcileTests('a',reconciliation);
  assert.notEqual(restored.token,reacquired.token);assert.ok(restored.fencing>reacquired.fencing);
  assert.equal(h.r.reconcileTests('a',reconciliation).token,restored.token);
  assert.throws(() => h.r.releaseTests('a',testPayload(a,entry)),/test-token-invalid/);
  const cleanup=cleanupProof(h,a,'post-restart');
  const release=testPayload(a,restored,{cleanup});
  h.r.releaseTests('a',release);await h.restart();
  assert.equal(h.r.releaseTests('a',release).state,'RELEASED');
});

test('Les réservations refusent propriétaire divergent, alias invalide et détention préalable de fichiers', async (t) => {
  const h=await fixture(t);const a=h.reserve('a',[dockerTest,file('x')]);const b=h.reserve('b',[dockerTest]);
  assert.throws(() => testLease(h,a,'invalid',[{key:'docker:ENGINE-A',mode:'write'}]), /test-resources-invalid/);
  const op=h.prepare(a,'no-lease',[dockerTest]);assert.throws(() => h.acquire(a,op),/test-resource-not-held/);
  const fileOp=h.prepare(a,'file',[file('x')]);const fileAccess=h.acquire(a,fileOp);
  assert.throws(() => testLease(h,a,'premature',[dockerTest]),/test-acquisition-boundary-required/);
  h.start(a,fileOp);h.complete(a,fileOp);h.release(a,fileAccess);
  const entry=testLease(h,a,'lease-a',[dockerTest]);
  assert.throws(() => h.r.releaseTests('b',testPayload(b,entry)),/test-token-invalid/);
  assert.throws(() => h.r.cancelTests('a',testPayload(a,entry)),/test-cancel-refused/);
  assert.throws(() => h.r.acquireTests('a',{version:a.version,transactionId:'second',resources:[dockerTest],evidence:['x']}),/test-acquisition-boundary-required/);
});

test('Annuler une attente ne libère jamais un environnement détenu', async (t) => {
  const h=await fixture(t);const a=h.reserve('a',[dockerTest]);const b=h.reserve('b',[dockerTest]);
  testLease(h,a,'a');const waiting=testLease(h,b,'b');
  assert.equal(h.r.cancelTests('b',testPayload(b,waiting)).state,'CANCELLED');
  assert.equal(h.r.testReservations('a')[0].state,'HELD');
  assert.throws(() => h.r.cancelTests('b',{...testPayload(b,waiting),version:b.version-1}),/reservation-version-stale/);
});

test('Un effet natif inconnu et STOP ne libèrent jamais un environnement de test', async (t) => {
  const h=await fixture(t);const a=h.reserve('a',[dockerTest]);const entry=testLease(h,a,'a');
  const op=h.prepare(a,'unknown');h.acquire(a,op);h.start(a,op);h.r.nativeUnknown(op.operationId);
  h.r.suspend('a',{version:a.version,action:'STOP',evidence:['explicit fixture stop']});
  assert.throws(() => h.r.releaseTests('a',testPayload(a,entry)),/test-effects-unresolved/);
  await h.restart();
  assert.equal(h.r.testReservations('a')[0].state,'HELD');
  assert.throws(() => h.r.reconcileTests('a',testPayload(a,entry,{reconciliationId:'unknown'})),/test-reconciliation-boundary-required/);
});


test('navigateurs externes : Chromium exclusif, Firefox indépendant et groupe atomique avec Docker', async (t) => {
  const h=await fixture(t);
  const chromium={key:'browser:host-a/chromium',mode:'write'};
  const firefox={key:'browser:host-a/firefox',mode:'write'};
  const a=h.reserve('chrome-a',[chromium]);const b=h.reserve('chrome-b',[chromium]);
  const c=h.reserve('firefox',[firefox]);const d=h.reserve('docker',[dockerTest]);
  const e=h.reserve('browser-container',[chromium,dockerTest]);
  const entry=testLease(h,a,'chrome-a');
  assert.equal(testLease(h,b,'chrome-b').state,'WAITING');
  assert.equal(testLease(h,c,'firefox').state,'HELD');
  assert.equal(testLease(h,e,'group').state,'WAITING');
  assert.equal(testLease(h,d,'docker').state,'WAITING','la FIFO protège le groupe antérieur incompatible');
  assert.throws(()=>h.r.releaseTests(a.runId,testPayload(a,entry)),/test-cleanup-proof-required/);
  finishTestCommand(h,a,'browser-test');
  assert.equal(h.r.testReservations(b.runId)[0].state,'WAITING');
  h.r.releaseTests(a.runId,testPayload(a,entry,{cleanup:cleanupProof(h,a,'browser') }));
  assert.equal(h.r.testReservations(b.runId)[0].state,'HELD');
  assert.equal(h.r.testReservations(e.runId)[0].state,'WAITING');
  assert.equal(h.r.testReservations(c.runId)[0].state,'HELD');
  assert.throws(()=>h.r.testResources([{key:'browser:host-a/Chromium',mode:'write'}]),/test-resources-invalid/);
});


test('identifiants logiques historiques conservés sans donner de nouvelle réservation',async(t)=>{
  const h=await fixture(t);const a=h.reserve('a',[file('x')]);const op=h.prepare(a,'old');const access=h.acquire(a,op);
  h.start(a,op);h.complete(a,op);h.release(a,access);
  const key='browser:c14-headless-test-profiles';const legacy=[{key,mode:'write'}];
  const storedOp=h.r.resourceState.operations[op.operationId];storedOp.resources=structuredClone(legacy);storedOp.expectedRevisions={[key]:0};
  const storedAccess=h.r.resourceState.accesses[access.accessId];storedAccess.resources=structuredClone(legacy);storedAccess.expectedRevisions={[key]:0};
  h.r.resourceState.revisions[key]=h.r.resourceState.revisions['file:x'];h.r.persist();
  const expected=JSON.parse(JSON.stringify(h.r.resourceState));await h.restart();
  assert.deepEqual(h.r.resourceState,expected);
  assert.throws(()=>h.r.acquireTests(a.runId,{version:a.version,transactionId:'new-old-key',resources:legacy,evidence:['new attempt']}),/test-resources-invalid/);
  const alias=[{key:'browser:host-a/Chromium',mode:'write'}];
  assert.throws(()=>h.r.testResources(alias),/test-resources-invalid/);
});


function unusedPayload(h, run, entry, extra = {}) {
  const operations=h.r.unusedTestOperations(h.r.resourceState.testReservations[entry.transactionId]);
  return testPayload(run, entry, { contextId: run.contextId, sessionId: run.sessionId,
    boundaryDigest: h.r.unusedTestBoundary(h.r.resourceState.testReservations[entry.transactionId]),
    developerAuthorization: 'autorisation humaine ciblée de restitution sans effet',
    attestation: { noEnvironmentMutation: true, noMutatingMandate: true,
      operations: operations.map((op) =>
        ({ operationId: op.operationId, classification: h.r.unusedTestOperationClassification(op) || 'read-only-no-effect' })) },
    nativeProof: { messageCount: 4, toolCount: 2, historyHash: fingerprint('observed full native history'),
      operationClassifications: operations.map((op) => ({ operationId: op.operationId,
        classification: h.r.unusedTestOperationClassification(op) || 'read-only-no-effect' })) }, ...extra });
}

test('restitution sans effet : reçu durable, FIFO, idempotence et reprise des travaux indépendants', async (t) => {
  const h = await fixture(t); const a = h.reserve('a', [lxcTest]); const b = h.reserve('b', [lxcTest]);
  const entry = testLease(h, a, 'unused-a'); testLease(h, b, 'waiting-b');
  const p = unusedPayload(h, a, entry);
  assert.throws(() => h.r.extend('a', { version: a.version, resources: [file('independent')] }), /run-accesses-unresolved/);
  const receipt = h.r.releaseUnusedTests('a', p, p.nativeProof);
  assert.equal(receipt.state, 'RELEASED'); assert.equal(receipt.unusedReleaseReceipt.mode, 'unused-no-effect');
  assert.equal(h.r.testReservations('b')[0].state, 'HELD');
  assert.deepEqual(h.r.releaseUnusedTests('a', p, p.nativeProof), receipt);
  assert.throws(() => h.r.releaseUnusedTests('a', {...p, evidence:['changed']}, p.nativeProof), /test-unused-release-divergent/);
  assert.throws(() => h.r.releaseTests('a', p), /test-token-invalid/);
  assert.equal(h.r.extend('a', { version:a.version, resources:[file('independent')] }).state, 'RESERVED');
  const restored = await h.restart();
  assert.deepEqual(restored.resourceState.testReservations[entry.transactionId], receipt);
  assert.deepEqual(restored.releaseUnusedTests('a', p, p.nativeProof), receipt);
});

test('restitution sans effet après restauration : scope armé, token perdu et reçu sans token', async (t) => {
  const h=await fixture(t);const a=h.reserve('a',[lxcTest]);const entry=testLease(h,a,'lost-token-a');
  await h.restart();
  const p=unusedPayload(h,a,entry);delete p.token;delete p.developerAuthorization;p.recoveryMode='validated-change-unused';
  const receipt=h.r.releaseUnusedTests('a',p,p.nativeProof,{lostTokenRecovery:true,validatedChangeScope:true});
  assert.equal(receipt.state,'RELEASED');
  assert.equal(receipt.unusedReleaseReceipt.mode,'unused-no-effect-lost-token');
  assert.equal(receipt.token,undefined);
  assert.equal(h.r.resourceState.testReservations[entry.transactionId].token,undefined);
  assert.equal(h.r.testReservations('a')[0].reconciliationRequired,false);
  assert.deepEqual(h.r.releaseUnusedTests('a',p,p.nativeProof,{lostTokenRecovery:true,validatedChangeScope:true}),receipt);
  assert.throws(()=>h.r.releaseUnusedTests('a',{...p,evidence:['divergent']},p.nativeProof,
    {lostTokenRecovery:true,validatedChangeScope:true}),/test-unused-release-divergent/);
});

test('restitution sans effet après restauration : une validation REJECTION_ONLY prouvée ne bloque pas le bail', async (t) => {
  const h=await fixture(t);const a=h.reserve('a',[lxcTest]);const entry=testLease(h,a,'rejected-only-a');
  const op=h.prepare(a,'rejected-validation-a');
  const stored=h.r.resourceState.operations[op.operationId];stored.rejectionOnly=true;
  const requestId='request-'+op.operationId;
  h.r.requestOwners[requestId]={runId:a.runId,digest:fingerprint('rejected-validation-identity'),reconciliation:{
    transactionId:'rejection-tx-a',jobId:'job-a',operationId:op.operationId,approvalId:'approval-a',
    recoveryId:null,sessionId:a.sessionId,inputDigest:fingerprint('rejection-input'),
    nativeToolHash:fingerprint('native-rejection-tools'),authorizationDigest:fingerprint('rejection-authorization'),
    contextId:a.contextId,version:a.version,nativeToolCount:1,outcome:'REJECTION_ONLY',at:new Date().toISOString()}};
  h.r.persist();await h.restart();
  const restored=h.r.resourceState.testReservations[entry.transactionId];
  assert.equal(h.r.unusedTestOperationClassification(h.r.resourceState.operations[op.operationId]),
    'rejected-validation-no-native-effect');
  const p=unusedPayload(h,a,restored);delete p.token;delete p.developerAuthorization;
  p.recoveryMode='validated-change-unused';
  const receipt=h.r.releaseUnusedTests(a.runId,p,p.nativeProof,{lostTokenRecovery:true,validatedChangeScope:true});
  assert.equal(receipt.state,'RELEASED');
  assert.equal(receipt.unusedReleaseReceipt.mode,'unused-no-effect-lost-token');
  assert.equal(receipt.unusedReleaseReceipt.operationIds[0],op.operationId);
});

test('restitution sans effet après restauration : un rejet sans reçu concordant reste bloquant', async (t) => {
  const h=await fixture(t);const a=h.reserve('a',[lxcTest]);const entry=testLease(h,a,'rejected-only-unproved');
  const op=h.prepare(a,'rejected-validation-unproved');
  h.r.persist();await h.restart();
  const p=unusedPayload(h,a,h.r.resourceState.testReservations[entry.transactionId]);delete p.token;delete p.developerAuthorization;
  p.recoveryMode='validated-change-unused';
  assert.equal(h.r.unusedTestOperationClassification(h.r.resourceState.operations[op.operationId]),null);
  assert.throws(()=>h.r.releaseUnusedTests(a.runId,p,p.nativeProof,{lostTokenRecovery:true,validatedChangeScope:true}),/test-unused-operation-not-proved/);
  assert.equal(h.r.testReservations(a.runId)[0].state,'HELD');
});

test('restitution sans effet après restauration refuse l’absence de scope validé ou un token résiduel', async (t) => {
  const h=await fixture(t);const a=h.reserve('a',[lxcTest]);const entry=testLease(h,a,'lost-token-negative');
  await h.restart();
  const p=unusedPayload(h,a,entry);delete p.token;delete p.developerAuthorization;p.recoveryMode='validated-change-unused';
  assert.throws(()=>h.r.releaseUnusedTests('a',p,p.nativeProof,{lostTokenRecovery:true}),/test-unused-attestation-required/);
  assert.throws(()=>h.r.releaseUnusedTests('a',{...p,token:'unexpected'},p.nativeProof,
    {lostTokenRecovery:true,validatedChangeScope:true}),/test-unused-attestation-required/);
  assert.equal(h.r.testReservations('a')[0].state,'HELD');
  assert.equal(h.r.testReservations('a')[0].reconciliationRequired,true);
});

test('restitution sans effet : diagnostic terminé exit1 reste un échec, sans nettoyage fictif', async (t) => {
  const h=await fixture(t); const a=h.reserve('a',[lxcTest]); const entry=testLease(h,a,'diagnostic-a');
  const op=finishTestCommand(h,a,'diagnostic',a.resources,1); const p=unusedPayload(h,a,entry);
  const receipt=h.r.releaseUnusedTests('a',p,p.nativeProof);
  assert.deepEqual(receipt.unusedReleaseReceipt.operationIds,[op.operationId]);
  assert.equal(h.r.resourceState.operations[op.operationId].nativeResult.exit,1);
  assert.equal(receipt.cleanup,undefined);
});

test('restitution sans effet : attestations incomplètes, mutation, identités, preuve et frontière divergentes refusées', async (t) => {
  const h=await fixture(t); const a=h.reserve('a',[lxcTest]); const entry=testLease(h,a,'negative-a');
  finishTestCommand(h,a,'diagnostic',a.resources,1); const p=unusedPayload(h,a,entry);
  for(const change of [x=>delete x.developerAuthorization,x=>x.developerAuthorization=' ',
    x=>x.attestation.noEnvironmentMutation=false,x=>x.attestation.noMutatingMandate=false,
    x=>x.attestation.operations=[],x=>x.attestation.operations.push(x.attestation.operations[0]),
    x=>x.attestation.operations[0].classification='mutation',x=>x.attestation.extra=true,
    x=>x.sessionId='ses_other',x=>x.contextId++,x=>x.version++,x=>x.token='wrong',x=>x.fencing++,
    x=>x.boundaryDigest=fingerprint('old'),x=>x.nativeProof.historyHash=fingerprint('forged'),x=>x.extra=true]){
    const q=structuredClone(p);change(q);assert.throws(()=>h.r.releaseUnusedTests('a',q,p.nativeProof));
    assert.equal(h.r.testReservations('a')[0].state,'HELD');
  }
  finishTestCommand(h,a,'late-command');
  assert.throws(()=>h.r.releaseUnusedTests('a',p,p.nativeProof),/test-unused-boundary-stale/);
});

test('restitution sans effet : opération préparée et restauration restent protégées', async (t) => {
  const h=await fixture(t); const a=h.reserve('a',[lxcTest]); const entry=testLease(h,a,'guards-a');
  h.prepare(a,'not-started'); let p=unusedPayload(h,a,entry);
  assert.throws(()=>h.r.releaseUnusedTests('a',p,p.nativeProof),/test-unused-operation-not-proved/);
  await h.restart();p=unusedPayload(h,a,entry);
  assert.throws(()=>h.r.releaseUnusedTests('a',p,p.nativeProof),/test-reconciliation-required/);
});


test('restitution sans effet : accès actif, STOP et gel global ne sont jamais contournés',async(t)=>{
  const h=await fixture(t);const a=h.reserve('a',[lxcTest]);const entry=testLease(h,a,'active-guard');
  const op=h.prepare(a,'active-command');h.acquire(a,op);let p=unusedPayload(h,a,entry);
  assert.throws(()=>h.r.releaseUnusedTests('a',p,p.nativeProof),/test-effects-unresolved/);
  h.r.suspend('a',{version:a.version,action:'STOP',evidence:['arrêt ciblé']});p=unusedPayload(h,a,entry);
  assert.throws(()=>h.r.releaseUnusedTests('a',p,p.nativeProof),/run-stop/);
  const other=await fixture(t);const b=other.reserve('b',[lxcTest]);const held=testLease(other,b,'frozen-unused');
  other.r.requestGlobal({cause:'GLOBAL_PAUSE',scope:'all',transactionId:'freeze-unused',authorization:'gel humain',evidence:['frontière']});
  const frozen=unusedPayload(other,b,held);
  assert.throws(()=>other.r.releaseUnusedTests('b',frozen,frozen.nativeProof),/global-coordination-suspended/);
});

test('restitution sans effet : opération annulée sans exécution et intégrité du reçu restauré',async(t)=>{
  const h=await fixture(t);const a=h.reserve('a',[lxcTest]);const entry=testLease(h,a,'cancelled-cycle');
  const op=h.prepare(a,'cancelled-operation');
  const access=h.acquire(a,op);h.release(a,access,'NO_EFFECT');
  const p=unusedPayload(h,a,entry);const receipt=h.r.releaseUnusedTests('a',p,p.nativeProof);
  assert.deepEqual(receipt.unusedReleaseReceipt.operationIds,[op.operationId]);
  const state=structuredClone(h.r.resourceState);state.testReservations[entry.transactionId].unusedReleaseReceipt.nativeProof.historyHash='0'.repeat(64);
  assert.throws(()=>h.r.validateResourceState(state),/registry-restoration-invalid/);
  assert.equal(h.r.resourceState.testReservations[entry.transactionId].state,'RELEASED');
});


test('projection moniteur : historique volumineux exclu, actives prioritaires et limite explicite', () => {
 const runs=new Map(Array.from({length:205},(_,i)=>['run-'+i,{runId:'run-'+i,changeId:'change-'+i,sessionId:'ses_'+i,version:i+1,state:i===204?'RESERVED':'DELIVERED',phase:'IMPLEMENTATION',history:'PRIVATE-HISTORY-'+'x'.repeat(16000),resources:[{key:'PRIVATE-RESOURCE'}]}]));
 const source={runs,snapshot(){throw Error('full snapshot forbidden')}};const before=JSON.stringify([...runs]);assert.ok(before.length>2*1024*1024);
 const view=ResourceRunRegistry.prototype.monitorRuns.call(source);assert.equal(view.runs.length,200);assert.equal(view.totalRuns,205);assert.equal(view.truncated,true);assert.equal(view.snapshot_only,true);assert.equal(view.runs[0].runId,'run-204');
 assert.ok(JSON.stringify(view).length<100000);assert.ok(!JSON.stringify(view).includes('PRIVATE-'));assert.equal(JSON.stringify([...runs]),before);
});

test('projection opération native : once durable faux puis vrai sans jeton ni cible',async t=>{
 const h=await fixture(t);const a=h.reserve('operation-a',[file('a')]);const b=h.reserve('operation-b',[file('b')]);
 const op=h.prepare(a,'native-operation-a');h.prepare(b,'native-operation-b');const access=h.acquire(a,op);
 h.r.nativeStart(a.runId,{...op,kind:'edit',target:'private/path'},'request-'+op.operationId,
  {id:'permission-a',tool:{callID:'call-a'}});
 const before=JSON.stringify(h.r.resourceState),pending=h.r.operationSnapshot(a.runId);
 assert.equal(pending.totalOperations,1);assert.equal(pending.operations[0].state,'ISSUING');
 assert.equal(pending.operations[0].native.onceAcknowledged,false);assert.equal(pending.operations[0].native.permissionId,'permission-a');
 assert.equal(pending.operations[0].native.callId,'call-a');assert.equal(pending.operations[0].access.state,'EXECUTING');
 assert.equal(pending.operations[0].access.fencing,access.fencing);assert.ok(!JSON.stringify(pending).includes(access.token));
 assert.ok(!JSON.stringify(pending).includes('private/path'));assert.deepEqual(h.r.operationSnapshot(a.runId,'native-operation-b').operations,[]);
 assert.equal(h.r.operationSnapshot(b.runId).operations[0].operationId,'native-operation-b');
 assert.equal(JSON.stringify(h.r.resourceState),before);
 h.r.nativeIssued(op.operationId);const issued=h.r.operationSnapshot(a.runId,op.operationId);
 assert.equal(issued.operations[0].state,'EXECUTING');assert.equal(issued.operations[0].native.onceAcknowledged,true);
 assert.throws(()=>h.r.operationSnapshot('missing-run'),/run-not-found/);
 assert.throws(()=>h.r.operationSnapshot(a.runId,'../foreign'),/operation-id-invalid/);
  const operations=Object.fromEntries(Array.from({length:205},(_,i)=>{
    const operationId='bounded-'+String(i).padStart(3,'0');
    return [operationId,{operationId,requestId:'request-'+operationId,runId:'bounded',contextId:1,version:i+1,
      state:'PREPARED',preparedAt:new Date(1000+i).toISOString(),accessId:operationId,sessionId:'ses_bounded'}];
  }));
  const boundedSource={runs:new Map([['bounded',{runId:'bounded',contextId:1}]]),history:[],
    resourceState:{operations,accesses:{}}};
  const bounded=ResourceRunRegistry.prototype.operationSnapshot.call(boundedSource,'bounded');
  assert.equal(bounded.totalOperations,205);assert.equal(bounded.truncated,true);assert.equal(bounded.operations.length,200);
  assert.equal(bounded.operations[0].operationId,'bounded-005');assert.equal(bounded.operations.at(-1).operationId,'bounded-204');
});

test('décision native durable, scoppée et restaurée après redémarrage',async t=>{
 const h=await fixture(t);const a=h.reserve('decision-a',[file('a')]);
 const op=h.prepare(a,'decision-operation');const stored=h.r.resourceState.operations[op.operationId];
 const decision={status:'approved',requestId:'request-decision-operation',approvalId:'approval-decision-operation',
  changeId:a.changeId,operationId:op.operationId,operationDigest:op.operationDigest,identityDigest:stored.identityDigest,
  runId:a.runId,version:a.version,sessionId:a.sessionId};
 h.r.recordDecision(a.runId,op.operationId,decision);
 let view=h.r.operationSnapshot(a.runId,op.operationId).operations[0];
 assert.equal(view.state,'PREPARED');assert.equal(view.decision.status,'approved');assert.equal(view.native,null);
 assert.equal(view.onceAcknowledged,null);
 await h.restart();
 view=h.r.operationSnapshot(a.runId,op.operationId).operations[0];
 assert.equal(view.decision.status,'approved');assert.equal(view.onceAcknowledged,null);
 assert.throws(()=>h.r.recordDecision(a.runId,op.operationId,{...decision,status:'rejected'}),/operation-decision-conflict/);
});

test('une fin native durable exacte termine une opération restaurée sans rejouer once',async t=>{
 const h=await fixture(t);const a=h.reserve('logged-success-a',[file('a')]);
 const op=h.prepare(a,'logged-success-operation');const access=h.acquire(a,op);
 const stored=h.r.resourceState.operations[op.operationId];
 h.r.recordDecision(a.runId,op.operationId,{status:'approved',requestId:stored.requestId,
  approvalId:'approval-logged-success',changeId:a.changeId,operationId:op.operationId,
  operationDigest:op.operationDigest,identityDigest:stored.identityDigest,runId:a.runId,
  version:a.version,sessionId:a.sessionId});
 const completed=h.r.completeLoggedNative(a.runId,op.operationId,{sessionId:a.sessionId,
  operationDigest:op.operationDigest,identityDigest:stored.identityDigest,callId:'call-logged-success',
  status:'completed',logSynced:true,logWatermark:37,finishedAt:Date.now(),
  proofDigest:fingerprint('durable-success'),partDigest:fingerprint('native-part')});
 assert.equal(completed.state,'COMPLETED');assert.equal(completed.native,undefined);
 assert.equal(completed.nativeResult.status,'completed');
 const view=h.r.operationSnapshot(a.runId,op.operationId).operations[0];
 assert.equal(view.onceAcknowledged,null);assert.equal(view.nativeRecovery.boundary,'TOOL_TERMINAL_SUCCESS');
 assert.equal(view.nativeRecovery.logWatermark,37);assert.equal(view.access.state,'HELD');
 assert.equal(h.r.resourceState.accesses[access.accessId].token,access.token);
 await h.restart();
 assert.equal(h.r.operationSnapshot(a.runId,op.operationId).operations[0].state,'COMPLETED');
});

test('une frontière absente reste UNKNOWN protégé même avec permission absente',async t=>{
 const h=await fixture(t);const a=h.reserve('logged-unknown-a',[file('a')]);
 const op=h.prepare(a,'logged-unknown-operation');h.acquire(a,op);
 const stored=h.r.resourceState.operations[op.operationId];
 h.r.recordDecision(a.runId,op.operationId,{status:'approved',requestId:stored.requestId,
  approvalId:'approval-logged-unknown',changeId:a.changeId,operationId:op.operationId,
  operationDigest:op.operationDigest,identityDigest:stored.identityDigest,runId:a.runId,
  version:a.version,sessionId:a.sessionId});
 h.r.markTerminalUnknown(a.runId,op.operationId,{sessionId:a.sessionId,
  operationDigest:op.operationDigest,identityDigest:stored.identityDigest,callId:null,
  toolStatus:'absent',executed:null,logSynced:true,logWatermark:52,
  proofDigest:fingerprint('watermarked-no-terminal-event')});
 const view=h.r.operationSnapshot(a.runId,op.operationId).operations[0];
 assert.equal(view.state,'UNKNOWN');assert.equal(view.access.state,'UNKNOWN');
 assert.equal(view.onceAcknowledged,null);assert.equal(view.nativeRecovery.callId,null);
 assert.equal(view.nativeRecovery.boundary,'TOOL_TERMINAL_UNCLASSIFIED');
 await h.restart();
 assert.equal(h.r.operationSnapshot(a.runId,op.operationId).operations[0].access.state,'UNKNOWN');
});

test('reprise once exige une permission encore pendante prouvée et une opération sans accusé',async t=>{
 const h=await fixture(t);const a=h.reserve('pending-a',[file('a')]);
 const op=h.prepare(a,'pending-operation');h.acquire(a,op);
 h.r.nativeStart(a.runId,{...op,kind:'edit',target:'a'},'request-pending-operation',
  {id:'permission-pending',tool:{callID:'call-pending'}});
 h.r.nativeUnknown(op.operationId);
 const digest=fingerprint(JSON.stringify(['permission-pending','call-pending','running',false]));
 h.r.restorePendingNative(a.runId,op.operationId,{permissionId:'permission-pending',callId:'call-pending',
  pending:true,toolStatus:'running',executed:false,proofDigest:digest});
 let view=h.r.operationSnapshot(a.runId,op.operationId).operations[0];
 assert.equal(view.state,'PREPARED');assert.equal(view.native,null);assert.equal(view.access.state,'HELD');
 assert.equal(view.nativeRecovery.boundary,'PERMISSION_PENDING_NO_REPLY');assert.equal(view.nativeRecovery.permissionId,'permission-pending');
 assert.equal(view.decision,null);
 h.r.nativeStart(a.runId,{...op,kind:'edit',target:'a'},'request-pending-operation',
  {id:'permission-pending',tool:{callID:'call-pending'}});
 h.r.nativeIssued(op.operationId);
 h.r.nativeUnknown(op.operationId);
 assert.throws(()=>h.r.restorePendingNative(a.runId,op.operationId,{permissionId:'permission-pending',
  callId:'call-pending',pending:true,toolStatus:'running',executed:false,proofDigest:digest}),/native-pending-proof-required/);
});

test('UNKNOWN protège les écritures recouvrantes et laisse progresser un RUN indépendant',async t=>{
 const h=await fixture(t);const a=h.reserve('unknown-a',[file('shared')]);
 const b=h.reserve('independent-b',[file('other')]);const c=h.reserve('conflicting-c',[file('shared')]);
 const first=h.prepare(a,'unknown-operation');h.acquire(a,first);h.start(a,first);h.r.nativeUnknown(first.operationId);
 const independent=h.prepare(b,'independent-operation');
 assert.equal(h.acquire(b,independent).state,'HELD');
 const conflicting=h.prepare(c,'conflicting-operation');
 assert.equal(h.acquire(c,conflicting).state,'WAITING');
});
