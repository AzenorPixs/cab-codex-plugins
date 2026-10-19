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
  const start = (run, op) => {
    registry.nativeStart(run.runId, op, 'request-' + op.operationId, { id: 'permission-' + op.operationId,
      tool: { callID: 'call-' + op.operationId } });
    registry.nativeIssued(op.operationId);
  };
  const complete = (run, op, status = 'completed') => registry.completeNative(run.runId, op.operationId, {
    sessionId: run.sessionId, permissionId: 'permission-' + op.operationId, callId: 'call-' + op.operationId,
    finishedAt: Date.now() + 1, status });
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

test('no lock extensions or upgrades can wait while holding an access', async (t) => {
  const h = await fixture(t); const a = h.reserve('a', [file('x'), file('y')]);
  const first = h.prepare(a, 'first', [file('x')]); h.acquire(a, first);
  const second = h.prepare(a, 'second', [file('y')]);
  assert.throws(() => h.acquire(a, second), /access-extension-while-held/);
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
  h.complete(a, op, 'error'); h.release(a, access);
  assert.ok(h.r.revision('file:x') > 0);
  assert.throws(() => h.r.operationAdmission('a', op, 'request-crash', 'permission'), /resource-revision-stale/);
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
  assert.deepEqual(h.r.publish('a', payload), receipt);
  assert.throws(() => h.r.publish('a', { ...payload, evidence: ['different'] }), /publication-transaction-divergent/);
  await h.restart(); assert.deepEqual(h.r.publish('a', payload), receipt);
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
  h.start(a,correction);h.complete(a,correction);h.release(a,fresh);
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
