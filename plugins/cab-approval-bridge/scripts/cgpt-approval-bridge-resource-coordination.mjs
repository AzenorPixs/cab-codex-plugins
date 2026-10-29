import { createHash, randomUUID } from 'node:crypto';
import { constants, closeSync, fstatSync, fsyncSync, lstatSync, openSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { RunRegistry, CoordinationError, canonicalResource } from './cgpt-approval-bridge-runs.mjs';

export const VERSION = '2.1.13';
export const COORDINATION_PROTOCOL = 'resource-scoped-v1';
export const TEST_RESOURCE_PROTOCOL = 'test-resources-v1';
export const GLOBAL_CAUSES = ['GLOBAL_RECONCILIATION', 'SHARED_MAINTENANCE', 'GLOBAL_PAUSE', 'GLOBAL_STOP'];
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const onlyKeys = (value, keys) => record(value) && Object.keys(value).every((key) => keys.includes(key));
const id = (value) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(value) &&
  !['constructor', 'prototype', '__proto__'].includes(value);
const digest = (value) => createHash('sha256').update(JSON.stringify(value, (_, item) =>
  record(item) ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]])) : item)).digest('hex');
const hash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const active = (access) => ['HELD', 'EXECUTING', 'UNKNOWN'].includes(access.state);
const now = () => new Date().toISOString();
const copy = (value) => structuredClone(value);
const testResource = (resource) => /^(docker|lxc|browser):/.test(resource.key);
const reservedTest = (entry) => ['WAITING', 'HELD'].includes(entry.state);
export const overlaps = (a, b) => a === 'project:*' || b === 'project:*' || a === b ||
  (a.startsWith('file:') && b.startsWith('file:') && (a.startsWith(`${b}/`) || b.startsWith(`${a}/`)));
const covers = (scope, resource) => (scope.mode === 'write' || resource.mode === 'read') &&
  (scope.key === 'project:*' || scope.key === resource.key ||
    (scope.key.startsWith('file:') && resource.key.startsWith(`${scope.key}/`)));
const conflicts = (left, right) => left.some((a) => right.some((b) =>
  (a.mode === 'write' || b.mode === 'write') && overlaps(a.key, b.key)));
function evidence(value) {
  if (!Array.isArray(value) || !value.length || value.length > 256 ||
      !value.every((item) => typeof item === 'string' && item.length > 0 && item.length <= 500)) {
    throw new CoordinationError('evidence-references-required', 400);
  }
}
function validUnusedNativeProof(proof) {
  return onlyKeys(proof, ['messageCount','toolCount','historyHash']) &&
    Number.isSafeInteger(proof.messageCount) && proof.messageCount >= 0 &&
    Number.isSafeInteger(proof.toolCount) && proof.toolCount >= 0 && hash(proof.historyHash);
}
function emptyState() {
  return { protocol: COORDINATION_PROTOCOL, sequence: 0, revisions: {}, operations: {}, accesses: {},
    publications: {}, global: null, globalHistory: [], legacySources: [], legacyHandoffs: [] };
}

// The old registry remains the reader for historical identities and receipts.
// This profile never exposes its ordinary global integration transitions.
export class ResourceRunRegistry extends RunRegistry {
  acceptsSchema(version) { return [1, 2, 3, 4].includes(version); }
  restore() {
    this.resourceState = undefined;
    super.restore();
    this.migrationRequired = this.schemaVersion < 4 &&
      (this.sequence > 0 || this.runs.size > 0 || this.history.length > 0);
    if (this.schemaVersion === 4) this.validateResourceState(this.resourceState);
    else this.resourceState = emptyState();
    if (!this.migrationRequired) this.schemaVersion = 4;
    // Restored executions keep their protection but cannot issue a fresh once.
    this.restoredAccesses = new Set(Object.values(this.resourceState.accesses).filter(active).map((a) => a.accessId));
    this.restoredTests = new Set(Object.values(this.resourceState.testReservations || {}).filter((r) => r.state === 'HELD').map((r) => r.transactionId));
  }

  validateResourceState(state) {
    const fail = () => { throw new CoordinationError('registry-restoration-invalid'); };
    if (record(state)) { state.legacySources ??= []; state.legacyHandoffs ??= []; }
    if (!onlyKeys(state, ['protocol','sequence','revisions','operations','accesses','publications','global','globalHistory','legacy','legacySources','legacyHandoffs','testReservations']) || state.protocol !== COORDINATION_PROTOCOL ||
        !Number.isSafeInteger(state.sequence) || state.sequence < 0 ||
        !['revisions', 'operations', 'accesses', 'publications'].every((key) => record(state[key])) ||
        !Array.isArray(state.globalHistory) || (state.global !== null && !record(state.global))) fail();
    if (!Array.isArray(state.legacySources) || state.legacySources.some((source) =>
      !onlyKeys(source,['sessionId','directory']) || typeof source.sessionId !== 'string' || !source.sessionId.startsWith('ses_') ||
      typeof source.directory !== 'string' || !source.directory.startsWith('/')) || !Array.isArray(state.legacyHandoffs) ||
      state.legacyHandoffs.some((receipt) => !onlyKeys(receipt,['transactionId','inputDigest','sourceDigest','globalGeneration','at','authorizationDigest','evidenceDigest']) ||
        !id(receipt.transactionId) || !hash(receipt.inputDigest) || !hash(receipt.sourceDigest) || !hash(receipt.authorizationDigest) ||
        !hash(receipt.evidenceDigest) || !Number.isSafeInteger(receipt.globalGeneration) || !Number.isFinite(Date.parse(receipt.at))) ||
      (state.legacySources.length && [...this.runs.values()].some((run) => run.state === 'RESERVED'))) fail();
    for (const run of this.runs.values()) if (run.pendingWrites !== undefined &&
      (!record(run.pendingWrites) || Object.entries(run.pendingWrites).some(([key, value]) =>
        typeof key !== 'string' || !Number.isSafeInteger(value) || value < 0 || value > state.sequence))) fail();
    for (const run of this.runs.values()) {
      if (run.maintenancePreflightRequired !== undefined && typeof run.maintenancePreflightRequired !== 'boolean') fail();
      if (run.suspension !== undefined && (!record(run.suspension) || !['PAUSE','STOP'].includes(run.suspension.action) ||
          !hash(run.suspension.evidenceDigest) || !Number.isFinite(Date.parse(run.suspension.requestedAt)))) fail();
      if (run.exclusiveResources !== undefined && (!Array.isArray(run.exclusiveResources) ||
          !run.exclusiveResources.every((key) => typeof key === 'string' && key.startsWith('file:') &&
            run.resources.some((r) => r.key === key)))) fail();
    }
    for (const [key, revision] of Object.entries(state.revisions)) {
      try { this.resources([{ key, mode: 'read' }]); } catch { fail(); }
      if (!Number.isSafeInteger(revision) || revision < 0 || revision > state.sequence) fail();
    }
    for (const [key, op] of Object.entries(state.operations)) {
      const owner = [...this.runs.values(), ...this.history].find((r) => r.runId === op?.runId && r.contextId === op?.contextId);
      if (!id(key) || !onlyKeys(op, ['operationId','accessId','runId','contextId','version','sessionId','requestId',
          'operationDigest','identityDigest','resources','expectedRevisions','state','preparedAt','native','finishedAt',
          'completionDigest','maintenancePreflight','preflightSucceeded','rejectionOnly','nativeResult','testReservationId','finishedSequence']) || op.operationId !== key || !id(op.runId) ||
          !owner || !id(op.accessId) || !id(op.requestId) || !hash(op.operationDigest) || !hash(op.identityDigest) ||
          !Number.isSafeInteger(op.contextId) || !Number.isSafeInteger(op.version) ||
          op.version < op.contextId || op.version > owner.version || !Number.isFinite(Date.parse(op.preparedAt)) ||
          (op.maintenancePreflight !== undefined && typeof op.maintenancePreflight !== 'boolean') ||
          (op.preflightSucceeded !== undefined && typeof op.preflightSucceeded !== 'boolean') ||
          (op.rejectionOnly !== undefined && op.rejectionOnly !== true) ||
          typeof op.sessionId !== 'string' || !['PREPARED', 'ISSUING', 'EXECUTING', 'COMPLETED', 'UNKNOWN', 'CANCELLED'].includes(op.state)) fail();
      try { this.resources(op.resources); this.validateExpected(op.expectedRevisions, op.resources, false); } catch { fail(); }
      if (op.nativeResult !== undefined && (!onlyKeys(op.nativeResult, ['status','exit']) ||
          !['completed','error'].includes(op.nativeResult.status) ||
          (op.nativeResult.exit !== null && !Number.isInteger(op.nativeResult.exit)))) fail();
      if (op.testReservationId !== undefined && (!id(op.testReservationId) ||
          state.testReservations?.[op.testReservationId]?.runId !== op.runId ||
          state.testReservations[op.testReservationId].contextId !== op.contextId)) fail();
      if (op.finishedSequence !== undefined && (!Number.isSafeInteger(op.finishedSequence) ||
          op.finishedSequence < 1 || op.finishedSequence > state.sequence)) fail();
      const requestOwner = this.requestOwners[op.requestId];
      if (op.rejectionOnly && (op.state !== 'PREPARED' || op.native !== undefined ||
          requestOwner?.runId !== op.runId || requestOwner.reconciliation?.operationId !== key)) fail();
      if (op.native !== undefined && (!onlyKeys(op.native, ['permissionId','startedAt','callId','kind','targetDigest','onceAcknowledged','startSequence']) ||
          typeof op.native.permissionId !== 'string' || !Number.isFinite(op.native.startedAt) || !hash(op.native.targetDigest) ||
          (op.native.kind !== undefined && !['bash','edit'].includes(op.native.kind)) ||
          (op.native.onceAcknowledged !== undefined && typeof op.native.onceAcknowledged !== 'boolean'))) fail();
      if (op.testReservationId && (!Number.isSafeInteger(op.native?.startSequence) || op.native.startSequence < 1 ||
          op.native.startSequence > state.sequence || (op.state === 'COMPLETED' &&
            (!op.nativeResult || !Number.isSafeInteger(op.finishedSequence) || op.finishedSequence <= op.native.startSequence)))) fail();
    }
    for (const [key, access] of Object.entries(state.accesses)) {
      const owner = [...this.runs.values(), ...this.history].find((run) =>
        run.runId === access?.runId && run.contextId === access?.contextId);
      if (!id(key) || !onlyKeys(access, ['accessId','runId','contextId','version','operationDigest','inputDigest',
          'resources','operationIds','expectedRevisions','protection','state','order','requestedAt','token','fencing',
          'grantedAt','finishedAt','outcome','releaseDigest','reconciliationReceipts']) || access.accessId !== key || !owner ||
          !hash(access.inputDigest) || !hash(access.operationDigest) ||
          !['WAITING', 'HELD', 'EXECUTING', 'UNKNOWN', 'RELEASED', 'CANCELLED', 'STALE'].includes(access.state) ||
          !['SHARED', 'EXCLUSIVE'].includes(access.protection) || !Array.isArray(access.operationIds) ||
          !access.operationIds.every((operationId) => id(operationId) && state.operations[operationId]?.runId === access.runId) ||
          !Number.isSafeInteger(access.order) || access.order < 1 || access.order > state.sequence ||
          (active(access) && (typeof access.token !== 'string' || !Number.isSafeInteger(access.fencing) ||
            access.fencing < access.order || access.fencing > state.sequence || owner.state !== 'RESERVED'))) fail();
      if (access.token !== undefined && !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(access.token)) fail();
      try { this.resources(access.resources); this.validateExpected(access.expectedRevisions, access.resources, false); } catch { fail(); }
      if (access.reconciliationReceipts !== undefined && (!record(access.reconciliationReceipts) ||
          Object.entries(access.reconciliationReceipts).some(([key, value]) => !id(key) ||
            !onlyKeys(value,['inputDigest','fencing']) || !hash(value.inputDigest) ||
            !Number.isSafeInteger(value.fencing) || value.fencing < 1 || value.fencing > state.sequence))) fail();
    }
    for (const [requestId, requestOwner] of Object.entries(this.requestOwners)) {
      const receipt = requestOwner.reconciliation;
      if (!receipt) continue;
      const op = state.operations[receipt.operationId];
      if (!op?.rejectionOnly || op.requestId !== requestId || op.runId !== requestOwner.runId ||
          op.contextId !== receipt.contextId || op.version !== receipt.version || op.sessionId !== receipt.sessionId ||
          Object.values(state.accesses).some((access) => access.accessId === op.accessId ||
            access.operationIds.includes(op.operationId))) fail();
    }
    const held = Object.values(state.accesses).filter(active);
    for (let i = 0; i < held.length; i++) for (let j = i + 1; j < held.length; j++) {
      if (held[i].runId === held[j].runId || conflicts(held[i].resources, held[j].resources)) fail();
    }
    if (state.testReservations !== undefined) {
      if (!record(state.testReservations)) fail();
      for (const [key, entry] of Object.entries(state.testReservations)) {
        const owner = [...this.runs.values(), ...this.history].find((r) => r.runId === entry?.runId && r.contextId === entry?.contextId);
        if (!id(key) || !onlyKeys(entry, ['transactionId','runId','contextId','version','resources','inputDigest','state',
          'order','requestedAt','grantedAt','token','fencing','finishedAt','releaseDigest','proofDigest','reconciliationReceipts','unusedReleaseReceipt']) ||
          entry.transactionId !== key || !owner || !hash(entry.inputDigest) ||
          !Number.isSafeInteger(entry.version) || entry.version < entry.contextId || entry.version > owner.version ||
          !['WAITING','HELD','RELEASED','CANCELLED'].includes(entry.state) ||
          !Number.isSafeInteger(entry.order) || entry.order < 1 || entry.order > state.sequence ||
          !Number.isFinite(Date.parse(entry.requestedAt))) fail();
        try { this.testResources(entry.resources); } catch { fail(); }
        if (reservedTest(entry) && (owner.state !== 'RESERVED' || entry.version !== owner.version)) fail();
        if (entry.state === 'HELD' && (!id(entry.token) || !Number.isSafeInteger(entry.fencing) ||
          entry.fencing < entry.order || entry.fencing > state.sequence)) fail();
        if (entry.releaseDigest !== undefined && !hash(entry.releaseDigest)) fail();
        if (entry.proofDigest !== undefined && !hash(entry.proofDigest)) fail();
        if (entry.unusedReleaseReceipt !== undefined) {
          const receipt = entry.unusedReleaseReceipt;
          if (entry.state !== 'RELEASED' || !hash(entry.releaseDigest) || !hash(entry.proofDigest) ||
              !onlyKeys(receipt, ['mode','authorizationDigest','attestationDigest','boundaryDigest','nativeProof','operationIds','evidenceDigest']) ||
              receipt.mode !== 'unused-no-effect' || entry.proofDigest !== digest(receipt) ||
              !['authorizationDigest','attestationDigest','boundaryDigest','evidenceDigest'].every((key) => hash(receipt[key])) ||
              !validUnusedNativeProof(receipt.nativeProof) || !Array.isArray(receipt.operationIds) ||
              new Set(receipt.operationIds).size !== receipt.operationIds.length ||
              receipt.operationIds.some((key) => !id(key) || state.operations[key]?.runId !== entry.runId ||
                state.operations[key]?.contextId !== entry.contextId)) fail();
        }
        if (entry.reconciliationReceipts !== undefined && (!record(entry.reconciliationReceipts) ||
          Object.entries(entry.reconciliationReceipts).some(([key, value]) => !id(key) ||
            !onlyKeys(value,['inputDigest','fencing']) || !hash(value.inputDigest) ||
            !Number.isSafeInteger(value.fencing) || value.fencing > state.sequence || value.fencing < 1))) fail();
      }
      const tests = Object.values(state.testReservations).filter((r) => r.state === 'HELD');
      for (let i = 0; i < tests.length; i++) for (let j = i + 1; j < tests.length; j++) {
        if (tests[i].runId === tests[j].runId || conflicts(tests[i].resources, tests[j].resources)) fail();
      }
    }
    for (const [key, receipt] of Object.entries(state.publications)) {
      const owner = [...this.runs.values(), ...this.history].find((r) => r.runId === receipt?.runId && r.contextId === receipt?.contextId);
      if (!id(key) || !onlyKeys(receipt,['transactionId','runId','contextId','inputDigest','referenceVersion','version',
          'reportFile','revisions','evidenceDigest']) || !owner || receipt.transactionId !== key || !hash(receipt.inputDigest) ||
          !Number.isSafeInteger(receipt.referenceVersion) || receipt.referenceVersion < 1 ||
          receipt.referenceVersion > this.referenceVersion || !id(receipt.runId) || !Number.isSafeInteger(receipt.version) ||
          receipt.version > owner.version || !hash(receipt.evidenceDigest)) fail();
      if (!record(receipt.revisions) || Object.entries(receipt.revisions).some(([key,value]) =>
        typeof key !== 'string' || !Number.isSafeInteger(value) || value < 0 || value > state.sequence)) fail();
      if (receipt.reportFile !== null) try { this.reportTarget(owner, receipt.reportFile); } catch { fail(); }
    }
    for (const entry of [...state.globalHistory, ...(state.global ? [state.global] : [])]) {
      if (!onlyKeys(entry,['transactionId','cause','scope','authorization','inputDigest','state','generation',
          'requestedAt','confirmedAt','finishedAt','releaseDigest']) || !id(entry.transactionId) || !GLOBAL_CAUSES.includes(entry.cause) ||
          !['DRAINING', 'HELD', 'RELEASED'].includes(entry.state) || !hash(entry.inputDigest) ||
          entry.scope !== 'all' || !Number.isSafeInteger(entry.generation) || entry.generation > state.sequence ||
          !Number.isFinite(Date.parse(entry.requestedAt)) || typeof entry.authorization !== 'string' || !entry.authorization) fail();
    }
  }

  snapshot() {
    return { ...super.snapshot(), version: VERSION,
      coordinationProtocol: this.migrationRequired ? 'migration-required' : COORDINATION_PROTOCOL,
      testResourceProtocol: TEST_RESOURCE_PROTOCOL,
      coordination: copy(this.resourceState || emptyState()) };
  }
  mutable() {
    this.assertHealthy();
    if (this.migrationRequired) throw new CoordinationError('coordination-upgrade-required');
  }
  admission(runId, maintenancePreflight = false) {
    this.mutable();
    if (this.resourceState.global && this.resourceState.global.state !== 'RELEASED') {
      throw new CoordinationError('global-coordination-suspended');
    }
    const run = this.runs.get(runId);
    if (run?.suspension) throw new CoordinationError('run-' + run.suspension.action.toLowerCase());
    if (run?.maintenancePreflightRequired && !maintenancePreflight) throw new CoordinationError('maintenance-preflight-required');
  }
  resources(input) {
    if (!Array.isArray(input) || !input.length || input.length > 256) throw new CoordinationError('resources-invalid', 400);
    const result = input.map((resource) => canonicalResource(resource, this.directory));
    for (const resource of result) if (resource.key.startsWith('file:')) {
      try {
        if (lstatSync(resolve(this.directory, resource.key.slice(5))).isFile() &&
            lstatSync(resolve(this.directory, resource.key.slice(5))).nlink !== 1) {
          throw new CoordinationError('resource-physical-alias-refused');
        }
      } catch (cause) { if (cause.code !== 'ENOENT') throw cause; }
    }
    const unique = new Map();
    for (const resource of result) {
      if (unique.get(resource.key)?.mode === 'write') continue;
      unique.set(resource.key, resource);
    }
    return [...unique.values()].sort((a, b) => a.key.localeCompare(b.key));
  }
  testResources(input) {
    const resources = this.resources(input);
    if (resources.length !== input.length || resources.some((r) => r.mode !== 'write' ||
      !/^(docker:[a-z0-9][a-z0-9_.-]{0,99}|(?:lxc|browser):[a-z0-9][a-z0-9_.-]{0,99}\/[a-z0-9][a-z0-9_.-]{0,99})$/.test(r.key))) {
      throw new CoordinationError('test-resources-invalid', 400);
    }
    return resources;
  }
  testReservations(runId) {
    return Object.values(this.resourceState.testReservations || {}).filter((r) => !runId || r.runId === runId).map((r) =>
      ({ ...copy(r), reconciliationRequired: this.restoredTests.has(r.transactionId),
        blockers: r.state === 'WAITING' ? this.testBlockers(r) : [],
        ...(r.state === 'HELD' ? { unusedReleaseBoundary: this.unusedTestBoundary(r) } : {}) }));
  }
  testBlockers(entry) {
    return Object.values(this.resourceState.testReservations || {}).filter((other) => other !== entry &&
      reservedTest(other) && (other.state === 'HELD' || other.order < entry.order) &&
      conflicts(entry.resources, other.resources)).map((r) => ({ runId: r.runId,
        transactionId: r.transactionId, reason: 'test-resource-conflict' }));
  }
  grantTests() {
    if (this.resourceState.global && this.resourceState.global.state !== 'RELEASED') return;
    for (const entry of Object.values(this.resourceState.testReservations || {}).sort((a,b) => a.order - b.order)) {
      if (entry.state !== 'WAITING' || this.testBlockers(entry).length || this.runs.get(entry.runId)?.suspension) continue;
      entry.state = 'HELD'; entry.token = randomUUID(); entry.fencing = ++this.resourceState.sequence; entry.grantedAt = now();
    }
  }
  acquireTests(runId, payload) {
    this.admission(runId); evidence(payload.evidence);
    if (!id(payload.transactionId)) throw new CoordinationError('test-transaction-invalid', 400);
    const resources = this.testResources(payload.resources);
    const inputDigest = digest({ ...payload, resources });
    const prior = this.resourceState.testReservations?.[payload.transactionId];
    if (prior) {
      if (prior.runId !== runId || prior.inputDigest !== inputDigest) throw new CoordinationError('test-transaction-divergent');
      this.grantTests(); this.persist();
      return this.testReservations(runId).find((r) => r.transactionId === prior.transactionId);
    }
    const { run } = this.scope(runId, payload.version, resources);
    if (run.phase !== 'WORK' || this.unresolvedAccess(runId)) throw new CoordinationError('test-acquisition-boundary-required');
    this.resourceState.testReservations ||= {};
    const entry = { transactionId: payload.transactionId, runId, contextId: run.contextId, version: run.version,
      resources, inputDigest, state: 'WAITING', order: ++this.resourceState.sequence, requestedAt: now() };
    this.resourceState.testReservations[entry.transactionId] = entry;
    this.grantTests(); this.persist();
    return this.testReservations(runId).find((r) => r.transactionId === entry.transactionId);
  }
  testHeld(runId, payload, restored = false) {
    this.mutable(); const run = this.owned(runId, payload.version);
    const entry = this.resourceState.testReservations?.[payload.transactionId];
    if (!entry || entry.runId !== runId || entry.contextId !== run.contextId || entry.version !== run.version ||
      entry.state !== 'HELD' || entry.token !== payload.token || entry.fencing !== payload.fencing) {
      throw new CoordinationError('test-token-invalid');
    }
    if (!restored && this.restoredTests.has(entry.transactionId)) throw new CoordinationError('test-reconciliation-required');
    return entry;
  }
  testsForOperation(runId, resources) {
    const keys = resources.filter(testResource);
    if (!keys.length) return null;
    const entry = Object.values(this.resourceState.testReservations || {}).find((r) => r.runId === runId &&
      r.state === 'HELD' && keys.every((key) => r.resources.some((held) => covers(held, key))));
    if (!entry) throw new CoordinationError('test-resource-not-held');
    if (this.restoredTests.has(entry.transactionId)) throw new CoordinationError('test-reconciliation-required');
    return entry;
  }
  cancelTests(runId, payload) {
    this.mutable(); this.owned(runId, payload.version); evidence(payload.evidence);
    const entry = this.resourceState.testReservations?.[payload.transactionId];
    if (!entry || entry.runId !== runId || entry.version !== payload.version || !['WAITING','CANCELLED'].includes(entry.state)) {
      throw new CoordinationError('test-cancel-refused');
    }
    entry.state = 'CANCELLED'; entry.finishedAt = now(); this.grantTests(); this.persist(); return copy(entry);
  }
  reconcileTests(runId, payload) {
    this.mutable(); evidence(payload.evidence);
    if (!id(payload.reconciliationId)) throw new CoordinationError('test-reconciliation-invalid', 400);
    const candidate = this.resourceState.testReservations?.[payload.transactionId];
    const prior = candidate?.reconciliationReceipts?.[payload.reconciliationId];
    if (prior) {
      if (candidate.runId !== runId || prior.inputDigest !== digest(payload)) throw new CoordinationError('test-reconciliation-divergent');
      return copy(candidate);
    }
    const entry = this.testHeld(runId, payload, true);
    if (!this.restoredTests.has(entry.transactionId) || this.operationTests(entry).some((op) =>
      ['ISSUING','EXECUTING','UNKNOWN'].includes(op.state))) throw new CoordinationError('test-reconciliation-boundary-required');
    entry.token = randomUUID(); entry.fencing = ++this.resourceState.sequence;
    entry.reconciliationReceipts ||= {};
    entry.reconciliationReceipts[payload.reconciliationId] = { inputDigest: digest(payload), fencing: entry.fencing };
    this.restoredTests.delete(entry.transactionId); this.persist(); return copy(entry);
  }
  operationTests(entry) {
    return Object.values(this.resourceState.operations).filter((op) => op.testReservationId === entry.transactionId);
  }
  unusedTestOperations(entry) {
    return Object.values(this.resourceState.operations).filter((op) => op.runId === entry.runId &&
      op.contextId === entry.contextId && (op.testReservationId === entry.transactionId ||
        Date.parse(op.preparedAt) >= Date.parse(entry.grantedAt))).sort((a, b) => a.operationId.localeCompare(b.operationId));
  }
  unusedTestBoundary(entry) {
    return digest({ entry, run: this.runs.get(entry.runId),
      operations: Object.values(this.resourceState.operations).filter((op) => op.runId === entry.runId),
      accesses: Object.values(this.resourceState.accesses).filter((access) => access.runId === entry.runId),
      owners: Object.fromEntries(Object.entries(this.requestOwners).filter(([, owner]) => owner.runId === entry.runId)) });
  }
  unusedTestReplay(runId, payload) {
    const prior = this.resourceState.testReservations?.[payload.transactionId];
    if (prior?.state !== 'RELEASED') return null;
    if (prior.runId !== runId || !prior.unusedReleaseReceipt || prior.releaseDigest !== digest(payload)) {
      throw new CoordinationError('test-unused-release-divergent');
    }
    return copy(prior);
  }
  releaseUnusedTests(runId, payload, verifiedNativeProof) {
    this.mutable();
    const replay = this.unusedTestReplay(runId, payload);
    if (replay) return replay;
    this.admission(runId);
    const entry = this.testHeld(runId, payload);
    const run = this.runs.get(runId);
    evidence(payload.evidence);
    const attestation = payload.attestation;
    if (!onlyKeys(payload, ['version','transactionId','token','fencing','contextId','sessionId','boundaryDigest',
        'developerAuthorization','evidence','attestation','nativeProof']) ||
        payload.contextId !== entry.contextId || payload.sessionId !== run.sessionId ||
        typeof payload.developerAuthorization !== 'string' || !payload.developerAuthorization.trim() ||
        payload.developerAuthorization.length > 500 ||
        !onlyKeys(attestation, ['noEnvironmentMutation','noMutatingMandate','operations']) ||
        attestation.noEnvironmentMutation !== true || attestation.noMutatingMandate !== true ||
        !Array.isArray(attestation.operations) || !validUnusedNativeProof(payload.nativeProof) ||
        digest(payload.nativeProof) !== digest(verifiedNativeProof)) {
      throw new CoordinationError('test-unused-attestation-required');
    }
    if (this.unresolvedAccess(runId, false)) throw new CoordinationError('test-effects-unresolved');
    if (!hash(payload.boundaryDigest) || payload.boundaryDigest !== this.unusedTestBoundary(entry)) {
      throw new CoordinationError('test-unused-boundary-stale');
    }
    const ops = this.unusedTestOperations(entry);
    if (attestation.operations.length !== ops.length || new Set(attestation.operations.map((op) => op?.operationId)).size !== ops.length) {
      throw new CoordinationError('test-unused-operations-divergent');
    }
    for (const op of ops) {
      const review = attestation.operations.find((review) => review?.operationId === op.operationId);
      if (!onlyKeys(review, ['operationId','classification']) ||
          (op.state === 'CANCELLED' && !op.native ? review.classification !== 'cancelled-without-execution' :
            op.state !== 'COMPLETED' || op.native?.kind !== 'bash' || !op.native.onceAcknowledged ||
            review.classification !== 'read-only-no-effect')) {
        throw new CoordinationError('test-unused-operation-not-proved');
      }
    }
    entry.unusedReleaseReceipt = { mode: 'unused-no-effect', authorizationDigest: digest(payload.developerAuthorization),
      attestationDigest: digest(attestation), boundaryDigest: payload.boundaryDigest, nativeProof: copy(verifiedNativeProof),
      operationIds: ops.map((op) => op.operationId), evidenceDigest: digest(payload.evidence) };
    entry.state = 'RELEASED'; entry.finishedAt = now(); entry.releaseDigest = digest(payload);
    entry.proofDigest = digest(entry.unusedReleaseReceipt); this.grantTests(); this.persist(); return copy(entry);
  }
  releaseTests(runId, payload) {
    this.mutable(); evidence(payload.evidence);
    const prior = this.resourceState.testReservations?.[payload.transactionId];
    if (prior?.state === 'RELEASED' && !prior.unusedReleaseReceipt && prior.runId === runId && prior.releaseDigest === digest(payload)) return copy(prior);
    const entry = this.testHeld(runId, payload);
    const ops = this.operationTests(entry);
    if (this.unresolvedAccess(runId, false) || ops.some((op) => !['COMPLETED','CANCELLED'].includes(op.state))) {
      throw new CoordinationError('test-effects-unresolved');
    }
    if (!Array.isArray(payload.cleanup) || payload.cleanup.length !== entry.resources.length ||
      new Set(payload.cleanup.map((proof) => proof?.resourceKey)).size !== entry.resources.length) {
      throw new CoordinationError('test-cleanup-proof-required');
    }
    for (const resource of entry.resources) {
      const proof = payload.cleanup.find((p) => p?.resourceKey === resource.key);
      const cleanup = ops.find((op) => op.operationId === proof?.cleanupOperationId);
      const verification = ops.find((op) => op.operationId === proof?.verificationOperationId);
      const valid = (op) => op?.state === 'COMPLETED' && op.native?.kind === 'bash' && op.native.onceAcknowledged &&
        op.nativeResult?.status === 'completed' && op.nativeResult.exit === 0 &&
        op.resources.some((r) => r.key === resource.key);
      if (!onlyKeys(proof, ['resourceKey','cleanupOperationId','verificationOperationId','restored']) || proof.restored !== true ||
        cleanup === verification || !valid(cleanup) || !valid(verification) || verification.native.startSequence <= cleanup.finishedSequence ||
        ops.some((op) => op !== cleanup && op !== verification && op.resources.some((r) => r.key === resource.key) &&
          op.state === 'COMPLETED' && op.finishedSequence >= cleanup.native.startSequence)) {
        throw new CoordinationError('test-cleanup-proof-required');
      }
    }
    entry.state = 'RELEASED'; entry.finishedAt = now(); entry.releaseDigest = digest(payload);
    entry.proofDigest = digest(payload.cleanup); this.grantTests(); this.persist(); return copy(entry);
  }
  checkConflicts(candidate, activeRuns = [...this.runs.values()].filter((run) => run.state === 'RESERVED')) {
    if (this.schemaVersion < 4) return super.checkConflicts(candidate, activeRuns);
    for (const other of activeRuns) {
      if (other.runId === candidate.runId) continue;
      if (other.sessionId === candidate.sessionId) throw new CoordinationError('session-already-reserved');
      if (other.changeId === candidate.changeId || other.selectionKey === candidate.selectionKey) {
        throw new CoordinationError('change-already-reserved');
      }
    }
    for (const dependency of candidate.dependsOn) if (![...this.history, ...this.runs.values()].some((run) =>
      run.changeId === dependency && run.state === 'DELIVERED')) throw new CoordinationError('dependency-not-delivered');
  }
  reserve(payload) {
    const previous = this.runs.get(payload?.runId);
    // A closed generation keeps its suspension as history, not as a new admission guard.
    this.admission(previous?.state === 'RESERVED' ? payload.runId : undefined);
    if (this.resourceState.legacySources.length) throw new CoordinationError('legacy-coordination-reconciliation-required');
    this.resources(payload.resources);
    if (payload.exclusiveResources !== undefined && (!Array.isArray(payload.exclusiveResources) ||
        !payload.exclusiveResources.every((key) => typeof key === 'string' && key.startsWith('file:') &&
          payload.resources.some((r) => r.key === key)))) throw new CoordinationError('exclusive-resources-invalid', 400);
    const result = super.reserve(payload);
    const run = this.runs.get(result.runId);
    run.exclusiveResources = payload.exclusiveResources || [];
    this.persist();
    return copy(run);
  }
  markLegacyUse(operation) {
    this.admission();
    if ([...this.runs.values()].some((run) => run.state === 'RESERVED')) throw new CoordinationError('run-target-required');
    if (!operation?.sessionId?.startsWith('ses_') || typeof operation.directory !== 'string' || !operation.directory.startsWith('/')) {
      throw new CoordinationError('legacy-operation-identity-invalid');
    }
    if (!this.resourceState.legacySources.some((source) => source.sessionId === operation.sessionId && source.directory === operation.directory)) {
      this.resourceState.legacySources.push({ sessionId: operation.sessionId, directory: operation.directory });
      this.persist();
    }
  }
  reconcileLegacy(payload) {
    this.mutable(); evidence(payload.evidence);
    if (!id(payload.transactionId) || typeof payload.authorization !== 'string' || !payload.authorization) {
      throw new CoordinationError('legacy-reconciliation-authority-required');
    }
    const prior = this.resourceState.legacyHandoffs.find((r) => r.transactionId === payload.transactionId);
    if (prior) {
      if (prior.inputDigest !== digest(payload)) throw new CoordinationError('legacy-reconciliation-divergent');
      return copy(prior);
    }
    const global = this.resourceState.global;
    if (global?.state !== 'HELD' || !['GLOBAL_RECONCILIATION','SHARED_MAINTENANCE'].includes(global.cause)) {
      throw new CoordinationError('legacy-reconciliation-global-boundary-required');
    }
    const receipt = { transactionId: payload.transactionId, inputDigest: digest(payload),
      sourceDigest: digest(this.resourceState.legacySources), globalGeneration: global.generation,
      at: now(), authorizationDigest: digest(payload.authorization), evidenceDigest: digest(payload.evidence) };
    this.resourceState.legacySources = []; this.resourceState.legacyHandoffs.push(receipt);
    this.persist(); return copy(receipt);
  }
  scope(runId, version, resources) {
    const run = this.owned(runId, version);
    const normalized = this.resources(resources);
    if (normalized.some((resource) => !run.resources.some((r) => covers(r, resource)))) {
      throw new CoordinationError('operation-outside-reservation');
    }
    return { run, resources: normalized };
  }
  covers(runId, version, resources) {
    this.admission(runId);
    this.scope(runId, version, resources);
    return true;
  }
  revision(key) {
    let value = 0;
    for (const [changed, sequence] of Object.entries(this.resourceState.revisions)) {
      if (overlaps(key, changed)) value = Math.max(value, sequence);
    }
    return value;
  }
  revisions(resources) {
    return Object.fromEntries(this.resources(resources).map((r) => [r.key, this.revision(r.key)]));
  }
  validateExpected(expected, resources, current = true) {
    if (!record(expected) || Object.keys(expected).length !== resources.length ||
        resources.some((resource) => !Object.hasOwn(expected, resource.key) ||
          !Number.isSafeInteger(expected[resource.key]) || expected[resource.key] < 0)) {
      throw new CoordinationError('expected-revisions-invalid', 400);
    }
    if (current && resources.some((r) => this.revision(r.key) !== expected[r.key])) {
      throw new CoordinationError('resource-revision-stale');
    }
  }
  operationCandidate(runId, approval, { candidateSession = null, rejectionOnly = false } = {}) {
    const preflight = Array.isArray(approval.files) && approval.files.length === 0 &&
      approval.commands?.length === 1 && approval.commands[0] === '/usr/bin/true' &&
      Array.isArray(approval.resources) && approval.resources.every((r) => r.mode === 'read');
    if (rejectionOnly) {
      this.mutable();
      if (this.runs.get(runId)?.suspension?.action !== 'PAUSE') throw new CoordinationError('notification-reconciliation-pause-required');
    } else this.admission(runId, preflight);
    const { run, resources } = this.scope(runId, approval.reservation_version, approval.resources);
    if (approval.coordination_protocol !== COORDINATION_PROTOCOL || !id(approval.operation_id) ||
        !hash(approval.operation_digest) || !id(approval.requestId) ||
        (approval.access_id !== undefined && !id(approval.access_id))) {
      throw new CoordinationError('coordination-upgrade-required');
    }
    this.validateExpected(approval.expected_revisions, resources);
    if (approval.session_id !== run.sessionId && approval.session_id !== candidateSession) throw new CoordinationError('operation-session-divergent');
    const identityDigest = digest(Object.fromEntries(['run_id', 'reservation_version', 'requestId', 'approval_id',
      'change_id', 'session_id', 'directory', 'title', 'summary', 'files', 'commands', 'resources',
      'operation_id', 'operation_digest', 'expected_revisions', 'access_id', 'coordination_protocol']
      .map((key) => [key, approval[key] ?? null])));
    const prior = this.resourceState.operations[approval.operation_id];
    if (prior) {
      if (prior.identityDigest !== identityDigest || prior.runId !== runId) throw new CoordinationError('operation-identity-divergent');
      return copy(prior);
    }
    const op = { operationId: approval.operation_id, accessId: approval.access_id || approval.operation_id,
      runId, contextId: run.contextId, version: run.version, sessionId: approval.session_id,
      requestId: approval.requestId, operationDigest: approval.operation_digest, identityDigest,
      resources, expectedRevisions: copy(approval.expected_revisions), state: 'PREPARED', preparedAt: now(),
      maintenancePreflight: Boolean(run.maintenancePreflightRequired && preflight) };
    return copy(op);
  }
  prepareOperation(runId, approval, options) {
    const op = this.operationCandidate(runId, approval, options);
    if (!this.resourceState.operations[op.operationId]) {
      this.resourceState.operations[op.operationId] = op;
      this.persist();
    }
    return copy(op);
  }
  admitValidation(runId, approval, identityDigest, known, options) {
    const prior = this.checkRequestOwner(runId, approval.requestId, identityDigest, known);
    const op = this.operationCandidate(runId, approval, options);
    if (prior) return;
    this.resourceState.operations[op.operationId] = op;
    this.requestOwners[approval.requestId] = { runId, digest: identityDigest };
    const run = this.runs.get(runId);
    if (!known && run.phase !== 'REPORT' && op.resources.some((r) => r.mode === 'write')) {
      run.integrationReady = false;
      run.integrationCompleted = false;
    }
    this.persist();
  }
  reconcileNotification(runId, approval, identityDigest, receipt) {
    const pausedOrphan = receipt.recoveryId === null;
    const op = this.operationCandidate(runId, approval, { candidateSession: receipt.sessionId, rejectionOnly: pausedOrphan });
    const prior = this.checkRequestReconciliation(runId, approval.requestId, identityDigest, receipt, { allowMissing: pausedOrphan });
    if (receipt.operationId !== op.operationId || receipt.approvalId !== approval.approval_id ||
        receipt.contextId !== op.contextId || receipt.version !== op.version || receipt.sessionId !== op.sessionId) {
      throw new CoordinationError('notification-reconciliation-identity-divergent');
    }
    if ((!pausedOrphan && !this.resourceState.operations[op.operationId]) || op.state !== 'PREPARED' || op.native !== undefined ||
        Object.values(this.resourceState.accesses).some((access) => access.accessId === op.accessId ||
          access.operationIds.includes(op.operationId)) || this.unresolvedAccess(runId)) {
      throw new CoordinationError('notification-reconciliation-effect-not-excluded');
    }
    if (prior) return copy(prior);
    this.resourceState.operations[op.operationId] = { ...op, rejectionOnly: true };
    this.requestOwners[approval.requestId] = { runId, digest: identityDigest, reconciliation: copy(receipt) };
    this.persist();
    return copy(receipt);
  }
  isExclusive(run, resources) {
    return resources.every((resource) => resource.key.startsWith('file:') &&
      run.exclusiveResources?.some((key) => covers({ key, mode: 'write' }, resource)) &&
      ![...this.runs.values()].some((other) => other.state === 'RESERVED' && other.runId !== run.runId &&
        other.resources.some((r) => overlaps(r.key, resource.key))));
  }
  blockers(access) {
    const result = [];
    for (const other of Object.values(this.resourceState.accesses)) {
      if (other.accessId === access.accessId) continue;
      if ((active(other) || (other.state === 'WAITING' && other.order < access.order)) &&
          conflicts(access.resources, other.resources)) result.push({ runId: other.runId,
        accessId: other.accessId, reason: other.protection === 'EXCLUSIVE' ? 'resource-promotion-pending' : 'resource-conflict' });
    }
    return result;
  }
  grantWaiting() {
    if (this.migrationRequired || (this.resourceState.global && this.resourceState.global.state !== 'RELEASED')) return;
    this.grantTests();
    for (const access of Object.values(this.resourceState.accesses).sort((a, b) => a.order - b.order)) {
      if (access.state !== 'WAITING' || this.runs.get(access.runId)?.suspension || this.blockers(access).length) continue;
      if (Object.values(this.resourceState.accesses).some((other) => other.runId === access.runId && active(other))) continue;
      if (access.resources.some((r) => this.revision(r.key) !== access.expectedRevisions[r.key])) {
        access.state = 'STALE'; access.finishedAt = now(); continue;
      }
      access.state = 'HELD'; access.token = randomUUID(); access.fencing = ++this.resourceState.sequence;
      access.grantedAt = now();
    }
  }
  acquireAccess(runId, payload, exclusive = false) {
    const operationIds = payload.operationIds || (this.resourceState.operations[payload.operationId] ? [payload.operationId] : []);
    const preflight = Array.isArray(operationIds) && operationIds.length > 0 && operationIds.every((id) =>
      this.resourceState.operations[id]?.maintenancePreflight);
    this.admission(runId, preflight);
    if (!id(payload?.operationId) || !hash(payload.operationDigest)) throw new CoordinationError('access-invalid', 400);
    const previous = this.resourceState.accesses[payload.operationId];
    const inputDigest = digest({ ...payload,
      resources: Array.isArray(payload.resources) ? [...payload.resources].sort((a, b) => String(a?.key).localeCompare(String(b?.key))) : payload.resources,
      operationIds: Array.isArray(operationIds) ? [...operationIds].sort() : operationIds });
    if (previous) {
      if (previous.runId !== runId || previous.inputDigest !== inputDigest) throw new CoordinationError('access-transaction-divergent');
      this.grantWaiting(); this.persist(); return copy(previous);
    }
    const { run, resources } = this.scope(runId, payload.version, payload.resources);
    this.testsForOperation(runId, resources);
    if (resources.some((r) => r.key === 'project:*')) throw new CoordinationError('operation-manifest-required');
    this.validateExpected(payload.expectedRevisions, resources);
    if (!Array.isArray(operationIds) || operationIds.length > 256 || new Set(operationIds).size !== operationIds.length ||
        operationIds.some((key) => {
          const op = this.resourceState.operations[key];
          return !op || op.rejectionOnly || op.runId !== runId || op.contextId !== run.contextId || op.version !== run.version ||
            op.accessId !== payload.operationId || op.state !== 'PREPARED' ||
            op.resources.some((r) => !resources.some((scope) => covers(scope, r)) ||
              payload.expectedRevisions[r.key] !== op.expectedRevisions[r.key]);
        }) || (!operationIds.length && resources.some((r) => r.mode === 'write'))) {
      throw new CoordinationError('access-operation-not-prepared');
    }
    if (Object.values(this.resourceState.accesses).some((a) => a.runId === runId && active(a))) {
      throw new CoordinationError('access-extension-while-held');
    }
    if (Object.values(this.resourceState.accesses).some((a) => a.runId === runId && a.state === 'WAITING')) {
      throw new CoordinationError('access-operation-already-pending');
    }
    if (exclusive && !this.isExclusive(run, resources)) throw new CoordinationError('exclusive-resource-not-proved');
    const access = { accessId: payload.operationId, runId, contextId: run.contextId, version: run.version,
      operationDigest: payload.operationDigest, inputDigest, resources, operationIds,
      expectedRevisions: copy(payload.expectedRevisions), protection: exclusive ? 'EXCLUSIVE' : 'SHARED',
      state: 'WAITING', order: ++this.resourceState.sequence, requestedAt: now() };
    this.resourceState.accesses[access.accessId] = access;
    this.grantWaiting(); this.persist();
    return copy(access);
  }
  operationAdmission(runId, operation, requestId, stage = 'prepare') {
    const op = this.resourceState.operations[operation.operationId];
    this.admission(runId, op?.maintenancePreflight && operation.kind === 'bash' && operation.target === '/usr/bin/true');
    this.scope(runId, operation.reservationVersion, operation.resources);
    this.testsForOperation(runId, operation.resources);
    if (!op || op.requestId !== requestId || op.operationDigest !== operation.operationDigest ||
        op.version !== operation.reservationVersion || op.sessionId !== operation.sessionId ||
        digest(op.expectedRevisions) !== digest(operation.expectedRevisions)) throw new CoordinationError('operation-identity-divergent');
    this.validateExpected(op.expectedRevisions, op.resources);
    if (stage === 'prepare') return true;
    if (op.rejectionOnly) throw new CoordinationError('notification-reconciliation-rejection-only');
    let access = this.resourceState.accesses[op.accessId];
    if (!access && op.accessId === op.operationId && this.isExclusive(this.runs.get(runId), op.resources)) {
      access = this.acquireAccess(runId, { operationId: op.accessId, version: op.version, resources: op.resources,
        expectedRevisions: op.expectedRevisions, operationDigest: op.operationDigest, operationIds: [op.operationId] }, true);
    }
    if (!access || access.state !== 'HELD' || !access.operationIds.includes(op.operationId) ||
        this.restoredAccesses.has(access.accessId) || op.state !== 'PREPARED' ||
        access.resources.some((r) => this.revision(r.key) !== access.expectedRevisions[r.key])) {
      throw new CoordinationError('operation-access-not-held');
    }
    return true;
  }
  nativeStart(runId, operation, requestId, permission) {
    this.operationAdmission(runId, operation, requestId, 'permission');
    const op = this.resourceState.operations[operation.operationId];
    const access = this.resourceState.accesses[op.accessId];
    const test = this.testsForOperation(runId, op.resources);
    if (test) op.testReservationId = test.transactionId;
    op.native = { permissionId: permission.id, startedAt: Date.now(), kind: operation.kind,
      targetDigest: digest([operation.kind, operation.target]),
      callId: permission.tool?.callID || permission.metadata?.callID || permission.callID || null };
    if (test) op.native.startSequence = ++this.resourceState.sequence;
    op.state = 'ISSUING'; access.state = 'EXECUTING'; this.persist();
  }
  nativeIssued(operationId) {
    const op = this.resourceState.operations[operationId];
    if (op?.state === 'UNKNOWN') { op.native.onceAcknowledged = true; this.persist(); return; }
    if (op?.state === 'COMPLETED') {
      op.native.onceAcknowledged = true;
      if (op.maintenancePreflight && op.preflightSucceeded && this.resourceState.accesses[op.accessId]?.state === 'RELEASED') {
        delete this.runs.get(op.runId).maintenancePreflightRequired;
      }
      this.persist(); return;
    }
    if (!op || op.state !== 'ISSUING') throw new CoordinationError('native-operation-not-issuing');
    op.native.onceAcknowledged = true; op.state = 'EXECUTING'; this.persist();
  }
  nativeUnknown(operationId) {
    const op = this.resourceState.operations[operationId];
    if (!op || !['ISSUING', 'EXECUTING'].includes(op.state)) return;
    op.state = 'UNKNOWN'; this.resourceState.accesses[op.accessId].state = 'UNKNOWN'; this.persist();
  }
  completeNative(runId, operationId, proof) {
    this.mutable();
    const op = this.resourceState.operations[operationId];
    if (!op || op.runId !== runId || !['ISSUING', 'EXECUTING', 'UNKNOWN', 'COMPLETED'].includes(op.state) ||
        !record(proof) || proof.permissionId !== op.native?.permissionId || proof.sessionId !== op.sessionId ||
        !Number.isFinite(proof.finishedAt) || proof.finishedAt < op.native.startedAt ||
        (op.native.callId && proof.callId !== op.native.callId) || !['completed', 'error'].includes(proof.status)) {
      throw new CoordinationError('native-completion-not-proved');
    }
    if (op.testReservationId && op.state === 'COMPLETED') {
      if (op.completionDigest !== digest(proof)) throw new CoordinationError('native-completion-divergent');
      return;
    }
    op.state = 'COMPLETED'; op.finishedAt = proof.finishedAt; op.completionDigest = digest(proof);
    if (op.testReservationId) {
      op.nativeResult = { status: proof.status, exit: Number.isInteger(proof.exit) ? proof.exit : null };
      op.finishedSequence = ++this.resourceState.sequence;
    }
    if (op.maintenancePreflight) op.preflightSucceeded = proof.status === 'completed' && proof.exit === 0;
    const access = this.resourceState.accesses[op.accessId];
    if (access.operationIds.every((key) => !['ISSUING', 'EXECUTING', 'UNKNOWN'].includes(this.resourceState.operations[key].state))) {
      access.state = 'HELD';
    }
    this.persist();
  }
  held(runId, payload) {
    this.mutable();
    const access = this.resourceState.accesses[payload.operationId];
    const run = this.owned(runId, payload.version);
    if (!access || access.runId !== runId || access.contextId !== run.contextId ||
        access.version !== run.version || access.token !== payload.token || access.fencing !== payload.fencing || !active(access)) {
      throw new CoordinationError('access-token-invalid');
    }
    return access;
  }
  cancelAccess(runId, payload) {
    this.mutable(); this.owned(runId, payload.version);
    const access = this.resourceState.accesses[payload.operationId];
    if (!access || access.runId !== runId || access.version !== payload.version ||
        !['WAITING', 'STALE', 'CANCELLED'].includes(access.state)) throw new CoordinationError('access-cancel-refused');
    access.state = 'CANCELLED'; access.finishedAt = now(); this.grantWaiting(); this.persist(); return copy(access);
  }
  attachOperations(runId, payload) {
    this.admission(runId); evidence(payload.evidence);
    const access = this.held(runId, payload);
    if (Array.isArray(payload.operationIds) && payload.operationIds.length &&
        payload.operationIds.every((id) => access.operationIds.includes(id))) return copy(access);
    if (access.state !== 'HELD' || !Array.isArray(payload.operationIds) || !payload.operationIds.length ||
        payload.operationIds.length > 256 || payload.operationIds.some((id) => {
          const op = this.resourceState.operations[id];
          return !op || op.rejectionOnly || op.runId !== runId || op.version !== access.version || op.contextId !== access.contextId ||
            op.accessId !== access.accessId || op.state !== 'PREPARED' ||
            op.resources.some((r) => !access.resources.some((held) => covers(held, r)) ||
              this.revision(r.key) !== op.expectedRevisions[r.key]);
        })) throw new CoordinationError('access-correction-outside-held-set');
    const operationIds = [...new Set([...access.operationIds, ...payload.operationIds])];
    if (operationIds.length > 256) throw new CoordinationError('access-operation-limit');
    access.operationIds = operationIds;
    this.persist(); return copy(access);
  }
  reconcileAccess(runId, payload) {
    this.admission(runId); evidence(payload.evidence);
    if (!id(payload.transactionId)) throw new CoordinationError('access-reconciliation-invalid', 400);
    const candidate = this.resourceState.accesses[payload.operationId];
    const prior = candidate?.reconciliationReceipts?.[payload.transactionId];
    if (prior) {
      if (candidate.runId !== runId || prior.inputDigest !== digest(payload)) throw new CoordinationError('access-reconciliation-divergent');
      return copy(candidate);
    }
    const access = this.held(runId, payload);
    if (!this.restoredAccesses.has(access.accessId) || access.state !== 'HELD' ||
        access.operationIds.some((id) => ['ISSUING','EXECUTING','UNKNOWN'].includes(this.resourceState.operations[id].state))) {
      throw new CoordinationError('access-reconciliation-boundary-required');
    }
    for (const id of access.operationIds) if (this.resourceState.operations[id].state === 'PREPARED') {
      this.resourceState.operations[id].state = 'CANCELLED';
    }
    access.token = randomUUID(); access.fencing = ++this.resourceState.sequence;
    access.reconciliationReceipts ||= {};
    access.reconciliationReceipts[payload.transactionId] = { inputDigest: digest(payload), fencing: access.fencing };
    this.restoredAccesses.delete(access.accessId);
    this.persist(); return copy(access);
  }
  finishAccess(access, outcome) {
    const ops = access.operationIds.map((key) => this.resourceState.operations[key]);
    if (ops.some((op) => ['ISSUING', 'EXECUTING', 'UNKNOWN'].includes(op.state))) throw new CoordinationError('access-effects-unresolved');
    const changed = ops.some((op) => op.state === 'COMPLETED' && op.resources.some((r) => r.mode === 'write'));
    if (!['COMPLETED', 'NO_EFFECT', 'RECONCILED'].includes(outcome) || (outcome === 'NO_EFFECT' && changed)) {
      throw new CoordinationError('access-outcome-invalid');
    }
    if (outcome === 'COMPLETED' && ops.some((op) => !['COMPLETED','CANCELLED'].includes(op.state))) throw new CoordinationError('access-effects-unresolved');
    if (changed) {
      const revision = ++this.resourceState.sequence;
      for (const op of ops.filter((op) => op.state === 'COMPLETED')) for (const r of op.resources) {
        if (r.mode === 'write') {
          this.resourceState.revisions[r.key] = revision;
          const run = this.runs.get(access.runId);
          if (run.phase !== 'REPORT' && !testResource(r)) {
            run.pendingWrites ||= {};
            run.pendingWrites[r.key] = revision;
            run.integrationCompleted = false;
          }
        }
      }
    }
    for (const op of ops) if (op.state === 'PREPARED') op.state = 'CANCELLED';
    if (ops.some((op) => op.maintenancePreflight && op.preflightSucceeded && op.native?.onceAcknowledged)) {
      delete this.runs.get(access.runId).maintenancePreflightRequired;
    }
    access.state = 'RELEASED'; access.finishedAt = now(); access.outcome = outcome;
    this.restoredAccesses.delete(access.accessId);
  }
  releaseAccess(runId, payload) {
    evidence(payload.evidence);
    const prior = this.resourceState.accesses[payload.operationId];
    if (prior?.state === 'RELEASED' && prior.runId === runId && prior.token === payload.token &&
        prior.fencing === payload.fencing && prior.releaseDigest === digest(payload)) return copy(prior);
    const access = this.held(runId, payload);
    this.finishAccess(access, payload.outcome); access.releaseDigest = digest(payload);
    this.grantWaiting(); this.persist(); return copy(access);
  }
  accesses(runId) {
    return Object.values(this.resourceState.accesses).filter((a) => !runId || a.runId === runId).map((a) =>
      ({ ...copy(a), blockers: a.state === 'WAITING' ? this.blockers(a) : [] }));
  }
  unresolvedAccess(runId, includeTests = true) {
    return Object.values(this.resourceState.accesses).some((a) => a.runId === runId && (active(a) || a.state === 'WAITING')) ||
      (includeTests && Object.values(this.resourceState.testReservations || {}).some((r) => r.runId === runId && reservedTest(r)));
  }
  extend(runId, payload) {
    this.admission(runId);
    if (this.unresolvedAccess(runId)) throw new CoordinationError('run-accesses-unresolved');
    this.resources(payload.resources); return super.extend(runId, payload);
  }
  reduce(runId, payload) {
    this.admission(runId);
    if (this.unresolvedAccess(runId)) throw new CoordinationError('run-accesses-unresolved');
    return super.reduce(runId, payload);
  }
  ready(runId, version) { this.admission(runId); this.owned(runId, version); }
  reconcile(runId, version, expectedRevisions, proof) {
    this.admission(runId); evidence(proof);
    const run = this.owned(runId, version);
    if (this.unresolvedAccess(runId) || !record(expectedRevisions) || !Object.keys(expectedRevisions).length) {
      throw new CoordinationError('reconciliation-resources-required');
    }
    const resources = Object.keys(expectedRevisions).map((key) => ({ key, mode: 'read' }));
    this.scope(runId, version, resources); this.validateExpected(expectedRevisions, resources);
    run.reviewedRevisions = copy(expectedRevisions); run.version = ++this.sequence;
    run.referenceVersion = this.referenceVersion; this.persist(); return copy(run);
  }
  modifying(runId) { this.admission(runId); super.modifying(runId); }
  publish(runId, payload) {
    this.mutable(); evidence(payload.evidence);
    if (!id(payload.transactionId)) throw new CoordinationError('publication-transaction-invalid', 400);
    const inputDigest = digest(payload);
    const prior = this.resourceState.publications[payload.transactionId];
    if (prior) {
      if (prior.runId !== runId || prior.inputDigest !== inputDigest) throw new CoordinationError('publication-transaction-divergent');
      return copy(prior);
    }
    this.admission(runId);
    if (this.testReservations(runId).some(reservedTest)) throw new CoordinationError('run-test-resources-unresolved');
    const access = this.held(runId, payload);
    const run = this.owned(runId, payload.version);
    if (run.phase !== 'WORK') throw new CoordinationError('report-phase-only');
    if (payload.outcome !== 'COMPLETED') throw new CoordinationError('publication-completed-effects-required');
    const pending = new Set([...Object.keys(run.pendingWrites || {}),
      ...access.operationIds.flatMap((id) => this.resourceState.operations[id].resources.filter((r) =>
        r.mode === 'write' && this.resourceState.operations[id].state === 'COMPLETED').map((r) => r.key))]);
    if ([...pending].some((key) => !access.resources.some((r) => covers(r, { key, mode: 'read' })))) {
      throw new CoordinationError('publication-written-resources-required');
    }
    this.validateExpected(payload.proofRevisions, access.resources);
    const reportFile = payload.reportFile === undefined ? undefined : this.reportTarget(run, payload.reportFile);
    this.finishAccess(access, payload.outcome);
    this.referenceVersion++;
    run.referenceVersion = this.referenceVersion; run.publishedReferenceVersion = this.referenceVersion;
    run.integrationCompleted = true; run.integrationReady = false;
    run.pendingWrites = {};
    if (reportFile) {
      run.phase = 'REPORT'; run.reportFile = reportFile;
      run.resources = [{ key: `file:${reportFile}`, mode: 'write' }]; run.exclusiveResources = [run.resources[0].key];
    }
    run.version = ++this.sequence;
    const receipt = { transactionId: payload.transactionId, runId, contextId: run.contextId, inputDigest,
      referenceVersion: this.referenceVersion, version: run.version, reportFile: reportFile || null,
      revisions: this.revisions(access.resources), evidenceDigest: digest(payload.evidence) };
    this.resourceState.publications[receipt.transactionId] = receipt;
    this.grantWaiting(); this.persist(); return copy(receipt);
  }
  closing(runId, payload) {
    this.admission(runId); evidence(payload.evidence);
    if (this.unresolvedAccess(runId)) throw new CoordinationError('run-accesses-unresolved');
    return super.closing(runId, payload);
  }
  release(runId, version, delivered) {
    this.mutable();
    if (this.unresolvedAccess(runId)) throw new CoordinationError('run-accesses-unresolved');
    const run = this.owned(runId, version);
    if (delivered && run.requiresPublication && !run.integrationCompleted) throw new CoordinationError('integration-publication-required');
    run.state = delivered ? 'DELIVERED' : 'ABANDONED'; run.version = ++this.sequence;
    this.persist(); return copy(run);
  }
  transfer(runId, sessionId) {
    this.mutable();
    if (this.unresolvedAccess(runId)) throw new CoordinationError('run-accesses-unresolved');
    return super.transfer(runId, sessionId);
  }
  suspend(runId, payload) {
    this.mutable(); evidence(payload.evidence);
    const global = this.resourceState.global;
    if (global?.state === 'DRAINING' &&
        (global.cause !== 'SHARED_MAINTENANCE' || payload.action !== 'PAUSE' ||
          payload.maintenanceTransactionId !== global.transactionId || payload.maintenanceGeneration !== global.generation)) {
      throw new CoordinationError('global-coordination-suspended');
    }
    const run = this.owned(runId, payload.version);
    if (!['PAUSE', 'STOP', 'RESUME'].includes(payload.action)) throw new CoordinationError('suspension-action-invalid', 400);
    if (payload.action === 'RESUME') {
      if (!run.suspension) return copy(run);
      delete run.suspension;
    } else {
      if (run.suspension?.action === payload.action && run.suspension.evidenceDigest === digest(payload.evidence)) return copy(run);
      run.suspension = { action: payload.action, requestedAt: now(), evidenceDigest: digest(payload.evidence) };
    }
    this.grantWaiting();
    this.persist(); return copy(run);
  }
  requestGlobal(payload) {
    this.mutable(); evidence(payload.evidence);
    if (!GLOBAL_CAUSES.includes(payload.cause) || payload.scope !== 'all' || !id(payload.transactionId) ||
        typeof payload.authorization !== 'string' || !payload.authorization || payload.authorization.length > 500) {
      throw new CoordinationError('global-exception-required', 400);
    }
    const inputDigest = digest(payload);
    const prior = [this.resourceState.global, ...this.resourceState.globalHistory].find((g) => g?.transactionId === payload.transactionId);
    if (prior) {
      if (prior.inputDigest !== inputDigest) throw new CoordinationError('global-transaction-divergent');
      return copy(prior);
    }
    if (this.resourceState.global?.state !== 'RELEASED' && this.resourceState.global) throw new CoordinationError('global-already-requested');
    if (this.resourceState.global) this.resourceState.globalHistory.push(this.resourceState.global);
    this.resourceState.global = { transactionId: payload.transactionId, cause: payload.cause, scope: 'all',
      authorization: payload.authorization, inputDigest, state: 'DRAINING', generation: ++this.resourceState.sequence, requestedAt: now() };
    this.persist(); return copy(this.resourceState.global);
  }
  confirmGlobal(payload) {
    this.mutable(); evidence(payload.evidence);
    const g = this.resourceState.global;
    if (!g || g.generation !== payload.generation || g.transactionId !== payload.transactionId || g.state === 'RELEASED') {
      throw new CoordinationError('global-generation-stale');
    }
    if (Object.values(this.resourceState.accesses).some(active)) throw new CoordinationError('global-effects-unresolved');
    g.state = 'HELD'; g.confirmedAt = now(); this.persist(); return copy(g);
  }
  releaseGlobal(payload) {
    this.mutable(); evidence(payload.evidence);
    const g = this.resourceState.global;
    if (g?.state === 'RELEASED' && g.releaseDigest === digest(payload)) return copy(g);
    if (!g || g.state !== 'HELD' || g.generation !== payload.generation || g.transactionId !== payload.transactionId ||
        typeof payload.authorization !== 'string' || !payload.authorization) throw new CoordinationError('global-release-refused');
    g.state = 'RELEASED'; g.finishedAt = now(); g.releaseDigest = digest(payload); this.grantWaiting(); this.persist(); return copy(g);
  }
  migrate(payload) {
    this.assertHealthy(); evidence(payload.evidence);
    if (!this.migrationRequired || typeof payload.authorization !== 'string' || !payload.authorization ||
        payload.cause !== 'SHARED_MAINTENANCE' || payload.quiescent !== true) throw new CoordinationError('migration-maintenance-required');
    const descriptor = openSync(this.path, constants.O_RDONLY | constants.O_NOFOLLOW);
    let original;
    try {
      const stat = fstatSync(descriptor);
      if (!stat.isFile() || stat.nlink !== 1) throw new CoordinationError('migration-backup-invalid');
      original = readFileSync(descriptor);
    } finally { closeSync(descriptor); }
    const backupDigest = createHash('sha256').update(original).digest('hex');
    const backupFile = 'controller-runs.pre-resource-' + backupDigest + '.json';
    let backup;
    try {
      backup = openSync(join(this.stateDirectory, backupFile),
        constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      writeFileSync(backup, original); fsyncSync(backup);
    } catch (cause) {
      if (cause.code !== 'EEXIST') throw cause;
      const previous = openSync(join(this.stateDirectory, backupFile), constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const stat = fstatSync(previous);
        if (!stat.isFile() || stat.nlink !== 1 || (stat.mode & 0o777) !== 0o600 ||
            !readFileSync(previous).equals(original)) throw new CoordinationError('migration-backup-divergent');
      } finally { closeSync(previous); }
    } finally { if (backup !== undefined) closeSync(backup); }
    const parent = openSync(this.stateDirectory, constants.O_RDONLY);
    try { fsyncSync(parent); } finally { closeSync(parent); }
    for (const run of this.runs.values()) if (run.state === 'RESERVED' && run.phase !== 'REPORT' && !run.integrationCompleted) {
      run.pendingWrites = Object.fromEntries(run.resources.filter((r) => r.mode === 'write').map((r) => [r.key, 0]));
    }
    for (const run of this.runs.values()) if (run.state === 'RESERVED') {
      run.maintenancePreflightRequired = true;
      run.suspension ||= { action: 'PAUSE', requestedAt: now(), evidenceDigest: digest(payload.evidence), maintenance: true };
    }
    const identityDigest = this.migrationIdentity();
    this.resourceState = emptyState();
    this.resourceState.legacy = { schemaVersion: this.schemaVersion, integrationOwner: this.integrationOwner,
      integrationQueue: copy(this.integrationQueue), authorization: payload.authorization,
      backupFile, backupDigest, identityDigest };
    this.integrationOwner = null; this.integrationQueue = [];
    this.schemaVersion = 4; this.migrationRequired = false;
    this.resourceState.global = { transactionId: 'migration-' + randomUUID(), cause: 'SHARED_MAINTENANCE', scope: 'all',
      authorization: payload.authorization, inputDigest: digest(payload), state: 'HELD', generation: ++this.resourceState.sequence, requestedAt: now() };
    this.persist(); return this.snapshot();
  }
  migrationIdentity() {
    return digest({ runs: [...this.runs.values()], history: this.history, requestOwners: this.requestOwners,
      sequence: this.sequence, referenceVersion: this.referenceVersion });
  }
  rollbackMigration(payload) {
    this.mutable(); evidence(payload.evidence);
    const legacy = this.resourceState.legacy;
    if (!legacy || typeof payload.authorization !== 'string' || !payload.authorization ||
        this.resourceState.global?.cause !== 'SHARED_MAINTENANCE' || this.resourceState.global?.state !== 'HELD' ||
        Object.keys(this.resourceState.operations).length || Object.keys(this.resourceState.accesses).length ||
        Object.keys(this.resourceState.publications).length || Object.keys(this.resourceState.revisions).length ||
        legacy.identityDigest !== this.migrationIdentity() ||
        !/^controller-runs\.pre-resource-[a-f0-9]{64}\.json$/.test(legacy.backupFile || '')) {
      throw new CoordinationError('migration-rollback-reconciliation-required');
    }
    const descriptor = openSync(join(this.stateDirectory, legacy.backupFile), constants.O_RDONLY | constants.O_NOFOLLOW);
    let original;
    try {
      const stat = fstatSync(descriptor);
      if (!stat.isFile() || stat.nlink !== 1) throw new CoordinationError('migration-backup-invalid');
      original = readFileSync(descriptor);
    } finally { closeSync(descriptor); }
    if (createHash('sha256').update(original).digest('hex') !== legacy.backupDigest) {
      throw new CoordinationError('migration-backup-divergent');
    }
    const candidate = this.path + '.rollback-' + randomUUID();
    const output = openSync(candidate, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    try { writeFileSync(output, original); fsyncSync(output); } finally { closeSync(output); }
    renameSync(candidate, this.path);
    const parent = openSync(this.stateDirectory, constants.O_RDONLY);
    try { fsyncSync(parent); } finally { closeSync(parent); }
    this.restore(); this.observe(this.snapshot()); return this.snapshot();
  }
  integrationBlockers() { return []; }
  requestIntegration() { throw new CoordinationError('coordination-upgrade-required'); }
  integration() { throw new CoordinationError('coordination-upgrade-required'); }
  completeIntegration() { throw new CoordinationError('coordination-upgrade-required'); }
  completionReceipt() { throw new CoordinationError('coordination-upgrade-required'); }
  cancelAcquisition() { throw new CoordinationError('coordination-upgrade-required'); }
}
