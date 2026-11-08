import {verifyDependencies} from './cgpt-approval-bridge-dependency-authority.mjs';
import { createHash, randomUUID } from 'node:crypto';
import { constants, closeSync, fstatSync, fsyncSync, lstatSync, openSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { RunRegistry, CoordinationError, canonicalResource } from './cgpt-approval-bridge-runs.mjs';

export const VERSION = '2.4.31';
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
  if (!onlyKeys(proof, ['messageCount','toolCount','historyHash','operationClassifications','coverage']) ||
      !Number.isSafeInteger(proof.messageCount) || proof.messageCount < 0 ||
      !Number.isSafeInteger(proof.toolCount) || proof.toolCount < 0 || !hash(proof.historyHash)) return false;
  if (proof.coverage !== undefined && !['complete-native-transcript','operation-ledger-after-compaction'].includes(proof.coverage)) return false;
  if (proof.operationClassifications === undefined) return true;
  const allowed = new Set(['cancelled-without-execution','rejected-validation-no-native-effect','cancelled-validation-no-native-effect','read-only-no-effect']);
  return Array.isArray(proof.operationClassifications) &&
    new Set(proof.operationClassifications.map((item) => item?.operationId)).size === proof.operationClassifications.length &&
    proof.operationClassifications.every((item) => onlyKeys(item,['operationId','classification']) &&
      id(item.operationId) && allowed.has(item.classification));
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
    const normalizedNativeRejectionProofs = this.schemaVersion === 4 && this.normalizeNativeRejectionProofs(this.resourceState);
    if (this.schemaVersion === 4) this.validateResourceState(this.resourceState);
    else this.resourceState = emptyState();
    if (!this.migrationRequired) this.schemaVersion = 4;
    let scrubbedReleasedAccessToken = false;
    if (this.lock) for (const access of Object.values(this.resourceState.accesses)) {
      if (access.state === 'RELEASED' && Object.hasOwn(access, 'token')) {
        delete access.token;
        scrubbedReleasedAccessToken = true;
      }
    }
    // Restored executions keep their protection but cannot issue a fresh once.
    this.restoredAccesses = new Set(Object.values(this.resourceState.accesses).filter(active).map((a) => a.accessId));
    this.restoredTests = new Set(Object.values(this.resourceState.testReservations || {}).filter((r) => r.state === 'HELD').map((r) => r.transactionId));
    if (this.lock && (scrubbedReleasedAccessToken || normalizedNativeRejectionProofs)) this.persist();
  }

  normalizeNativeRejectionProofs(state) {
    let changed = false;
    for (const operation of Object.values(state?.operations || {})) {
      const operationProof = operation?.nativeRejectionProofDigest;
      const decisionProof = operation?.decision?.nativeProofDigest;
      if (operationProof === undefined && decisionProof === undefined) continue;
      if (operation?.state !== 'CANCELLED' || operation.decision?.status !== 'rejected' || operation.native !== undefined) {
        throw new CoordinationError('registry-restoration-invalid');
      }
      const proofDigest = hash(operationProof) ? operationProof : decisionProof;
      if (!hash(proofDigest) || operation.completionDigest !== undefined && !hash(operation.completionDigest)) {
        throw new CoordinationError('registry-restoration-invalid');
      }
      operation.completionDigest ||= proofDigest;
      delete operation.nativeRejectionProofDigest;
      delete operation.decision.nativeProofDigest;
      changed = true;
    }
    return changed;
  }

  validateResourceState(state) {
    const fail = () => { throw new CoordinationError('registry-restoration-invalid'); };
    if (record(state)) { state.legacySources ??= []; state.legacyHandoffs ??= []; }
    if (!onlyKeys(state, ['protocol','sequence','revisions','operations','accesses','publications','global','globalHistory','legacy','legacySources','legacyHandoffs','testReservations','sessionHandoffs']) || state.protocol !== COORDINATION_PROTOCOL ||
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
    if (state.sessionHandoffs !== undefined) {
      if (!record(state.sessionHandoffs)) fail();
      for (const [key, receipt] of Object.entries(state.sessionHandoffs)) {
        const owner = [...this.runs.values(), ...this.history].find(r => r.runId === receipt?.runId && r.contextId === receipt?.contextId);
        if (!onlyKeys(receipt, ['handoffId','runId','contextId','version','jobId','sourceSessionId','sessionId',
            'inputDigest','checkpointDigest','boundaryDigest','inventoryDigest','reason','evidenceDigest',
            'state','preparedAt','committedAt','completedAt','abortedAt','abortDigest']) || !id(key) || receipt.handoffId !== key || !owner ||
            !id(receipt.jobId) || !Number.isSafeInteger(receipt.version) || receipt.version < receipt.contextId || receipt.version > owner.version ||
            ![receipt.sourceSessionId, receipt.sessionId].every(s => typeof s === 'string' && /^ses_[A-Za-z0-9_-]+$/.test(s)) ||
            receipt.sourceSessionId === receipt.sessionId ||
            !['inputDigest','checkpointDigest','boundaryDigest','inventoryDigest','evidenceDigest'].every(k => hash(receipt[k])) ||
            typeof receipt.reason !== 'string' || !receipt.reason.length || receipt.reason.length > 500 ||
            !['PREPARED','COMMITTED','DONE','ABORTED'].includes(receipt.state) || !Number.isFinite(Date.parse(receipt.preparedAt)) ||
            (['COMMITTED','DONE'].includes(receipt.state) && !Number.isFinite(Date.parse(receipt.committedAt))) ||
            (receipt.state === 'ABORTED' && (!hash(receipt.abortDigest) || !Number.isFinite(Date.parse(receipt.abortedAt)) || receipt.committedAt !== undefined)) ||
            (receipt.state === 'DONE' && !Number.isFinite(Date.parse(receipt.completedAt)))) fail();
        if (['PREPARED','COMMITTED'].includes(receipt.state) && (owner.state !== 'RESERVED' ||
            owner.sessionId !== (receipt.state === 'PREPARED' ? receipt.sourceSessionId : receipt.sessionId))) fail();
      }
      const pending = Object.values(state.sessionHandoffs).filter(h => ['PREPARED','COMMITTED'].includes(h.state));
      if (pending.some((h,i) => pending.slice(i+1).some(other => h.runId === other.runId && h.contextId === other.contextId))) fail();
    }
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
          'completionDigest','maintenancePreflight','quarantineProbeFor','preflightSucceeded','rejectionOnly','nativeResult','testReservationId','finishedSequence','decision','nativeRecovery']) || op.operationId !== key || !id(op.runId) ||
          !owner || !id(op.accessId) || !id(op.requestId) || !hash(op.operationDigest) || !hash(op.identityDigest) ||
          !Number.isSafeInteger(op.contextId) || !Number.isSafeInteger(op.version) ||
          op.version < op.contextId || op.version > owner.version || !Number.isFinite(Date.parse(op.preparedAt)) ||
          (op.maintenancePreflight !== undefined && typeof op.maintenancePreflight !== 'boolean') ||
          (op.quarantineProbeFor !== undefined && !id(op.quarantineProbeFor)) ||
          (op.preflightSucceeded !== undefined && typeof op.preflightSucceeded !== 'boolean') ||
          (op.rejectionOnly !== undefined && op.rejectionOnly !== true) ||
          typeof op.sessionId !== 'string' || !['PREPARED', 'ISSUING', 'EXECUTING', 'COMPLETED', 'UNKNOWN', 'CANCELLED'].includes(op.state)) fail();
      try { this.resources(op.resources); this.validateExpected(op.expectedRevisions, op.resources, false); } catch { fail(); }
      if (op.nativeResult !== undefined && (!onlyKeys(op.nativeResult, ['status','exit','proofStatus','partDigest']) ||
          !['completed','error'].includes(op.nativeResult.status) ||
          (op.nativeResult.exit !== null && !Number.isInteger(op.nativeResult.exit)) ||
          (op.nativeResult.proofStatus !== undefined && !['completed','error'].includes(op.nativeResult.proofStatus)) ||
          (op.nativeResult.partDigest !== undefined && !hash(op.nativeResult.partDigest)) ||
          (op.nativeResult.status === 'completed' && op.nativeResult.proofStatus === 'error') ||
          (op.nativeResult.status === 'error' && op.nativeResult.proofStatus === 'completed' && !hash(op.nativeResult.partDigest)))) fail();
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
      if (op.completionDigest !== undefined && !hash(op.completionDigest)) fail();
      if (op.decision !== undefined && (!onlyKeys(op.decision, ['status','requestId','approvalId','changeId','runId','version',
          'sessionId','operationDigest','identityDigest','recordedAt']) ||
          !['approved','rejected','needs_clarification'].includes(op.decision.status) ||
          op.decision.requestId !== op.requestId || !id(op.decision.approvalId) || !id(op.decision.changeId) ||
          op.decision.runId !== op.runId || op.decision.version !== op.version || op.decision.sessionId !== op.sessionId ||
          op.decision.operationDigest !== op.operationDigest || op.decision.identityDigest !== op.identityDigest ||
          !Number.isFinite(Date.parse(op.decision.recordedAt)))) fail();
      if (op.nativeRecovery !== undefined && (!onlyKeys(op.nativeRecovery, ['permissionId','callId','proofDigest','observedAt','boundary','logWatermark']) ||
          (op.nativeRecovery.permissionId !== null && typeof op.nativeRecovery.permissionId !== 'string') ||
          (op.nativeRecovery.callId !== null && typeof op.nativeRecovery.callId !== 'string') || !hash(op.nativeRecovery.proofDigest) ||
          !['PERMISSION_PENDING_NO_REPLY','TOOL_TERMINAL_UNCLASSIFIED','TOOL_TERMINAL_SUCCESS','TERMINAL_TURN_NO_EFFECT'].includes(op.nativeRecovery.boundary) ||
          (op.nativeRecovery.logWatermark !== null && (!Number.isSafeInteger(op.nativeRecovery.logWatermark) || op.nativeRecovery.logWatermark < 0)) ||
          !Number.isFinite(Date.parse(op.nativeRecovery.observedAt)))) fail();
      if (op.testReservationId && (!Number.isSafeInteger(op.native?.startSequence) || op.native.startSequence < 1 ||
          op.native.startSequence > state.sequence || (op.state === 'COMPLETED' &&
            (!op.nativeResult || !Number.isSafeInteger(op.finishedSequence) || op.finishedSequence <= op.native.startSequence)))) fail();
    }
    for (const [key, access] of Object.entries(state.accesses)) {
      const owner = [...this.runs.values(), ...this.history].find((run) =>
        run.runId === access?.runId && run.contextId === access?.contextId);
      if (!id(key) || !onlyKeys(access, ['accessId','runId','contextId','version','operationDigest','inputDigest',
          'resources','operationIds','expectedRevisions','protection','state','order','requestedAt','token','fencing',
          'grantedAt','finishedAt','outcome','releaseDigest','reconciliationReceipts','timeoutQuarantine']) || access.accessId !== key || !owner ||
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
      if (access.timeoutQuarantine !== undefined) {
        const quarantine = access.timeoutQuarantine, operation = state.operations[quarantine.operationId];
        if (!onlyKeys(quarantine,['operationId','quarantineId','inputDigest','proofDigest','fencing','observedAt']) ||
            !id(quarantine.operationId) || !id(quarantine.quarantineId) || !hash(quarantine.inputDigest) ||
            !hash(quarantine.proofDigest) || !Number.isSafeInteger(quarantine.fencing) ||
            quarantine.fencing < 1 || quarantine.fencing > state.sequence || !Number.isFinite(Date.parse(quarantine.observedAt)) ||
            !operation || operation.runId !== access.runId || operation.contextId !== access.contextId ||
            !access.operationIds.includes(quarantine.operationId) || !['EXECUTING','UNKNOWN'].includes(operation.state) ||
            operation.native?.onceAcknowledged !== true || !access.resources.some(resource =>
              resource.mode === 'write' && /^port:[a-z0-9][a-z0-9._-]*\/\d+$/.test(resource.key))) fail();
      }
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
    // Active legacy leases remain protected after restore. `restoredAccesses`
    // blocks their native reuse, while `blockers()` keeps conflicts waiting.
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
          const lostTokenRelease = receipt?.mode === 'unused-no-effect-lost-token';
          if (entry.state !== 'RELEASED' || !hash(entry.releaseDigest) || !hash(entry.proofDigest) ||
              !onlyKeys(receipt, ['mode','authorizationDigest','attestationDigest','boundaryDigest','nativeProof','operationIds','evidenceDigest']) ||
              !['unused-no-effect','unused-no-effect-lost-token'].includes(receipt.mode) ||
              (lostTokenRelease && entry.token !== undefined) || entry.proofDigest !== digest(receipt) ||
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

  monitorRuns() {
    const values = [...this.runs.values()].sort((a, b) =>
      Number(b.state === 'RESERVED') - Number(a.state === 'RESERVED') || a.runId.localeCompare(b.runId));
    return { version: VERSION, snapshot_only: true, totalRuns: values.length, truncated: values.length > 200,
      runs: values.slice(0, 200).map(run => Object.fromEntries(
        ['runId', 'changeId', 'sessionId', 'version', 'state', 'phase'].map(key => [key, run[key] ?? null]))) };
  }

  operationSnapshot(runIdValue, operationId = undefined) {
    const run = this.runs.get(runIdValue) || this.history.find((item) => item.runId === runIdValue);
    if (!id(runIdValue) || !run) throw new CoordinationError('run-not-found', 404);
    if (operationId !== undefined && !id(operationId)) throw new CoordinationError('operation-id-invalid', 400);
    const values = Object.values(this.resourceState.operations)
      .filter((op) => op.runId === runIdValue && op.contextId === run.contextId &&
        (operationId === undefined || op.operationId === operationId))
      .sort((a, b) => Date.parse(a.preparedAt) - Date.parse(b.preparedAt) || a.operationId.localeCompare(b.operationId));
    const limit = operationId === undefined ? 200 : 1;
    return { version: VERSION, runId: runIdValue, snapshot_only: true, totalOperations: values.length,
      truncated: values.length > limit, operations: values.slice(-limit).map((op) => {
        const access = this.resourceState.accesses[op.accessId];
        return { operationId: op.operationId, requestId: op.requestId, sessionId: op.sessionId,
          contextId: op.contextId, version: op.version, state: op.state, preparedAt: op.preparedAt,
          decision: op.decision ? { status: op.decision.status, recordedAt: op.decision.recordedAt } : null,
          onceAcknowledged: op.native ? op.native.onceAcknowledged === true : null,
          nativeRecovery: op.nativeRecovery ? { permissionId: op.nativeRecovery.permissionId,
            callId: op.nativeRecovery.callId, boundary: op.nativeRecovery.boundary,
            logWatermark: op.nativeRecovery.logWatermark, observedAt: op.nativeRecovery.observedAt } : null,
          native: op.native ? { permissionId: op.native.permissionId, callId: op.native.callId ?? null,
            kind: op.native.kind ?? null, startedAt: op.native.startedAt,
            targetDigest: op.native.targetDigest, onceAcknowledged: op.native.onceAcknowledged === true } : null,
          access: access ? { accessId: access.accessId, state: access.state, fencing: access.fencing ?? null } : null,
          nativeResult: op.nativeResult ? { status: op.nativeResult.status, exit: op.nativeResult.exit ?? null } : null };
      }) };
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
  restoredTestReconciliationSnapshot(runId,transactionId){
    const entry=this.resourceState.testReservations?.[transactionId],run=this.runs.get(runId);
    if(!entry||!run||entry.runId!==runId||entry.contextId!==run.contextId||entry.version!==run.version||
        entry.state!=='HELD'||!this.restoredTests.has(transactionId))throw new CoordinationError('test-reconciliation-boundary-required');
    const operations=this.operationTests(entry).map(op=>({operationId:op.operationId,state:op.state,
      operationDigest:op.operationDigest,identityDigest:op.identityDigest,
      onceAcknowledged:op.native?.onceAcknowledged??op.onceAcknowledged??null,nativePresent:Boolean(op.native),
      completionDigest:op.completionDigest??null,completionProved:hash(op.completionDigest),nativeResultStatus:op.nativeResult?.status??null,
      nativeProofDigest:op.native?.proofDigest??null})).sort((a,b)=>a.operationId.localeCompare(b.operationId));
    const boundary={runId,contextId:run.contextId,transactionId,version:run.version,fencing:entry.fencing,
      state:entry.state,resources:entry.resources,inputDigest:entry.inputDigest,operations};
    return {runId,contextId:run.contextId,transactionId,version:run.version,state:entry.state,
      reconciliationRequired:true,fencing:entry.fencing,resources:copy(entry.resources),
      operations:operations.map(({operationId,state,onceAcknowledged,nativePresent,completionProved,nativeResultStatus})=>
        ({operationId,state,onceAcknowledged,nativePresent,completionProved,nativeResultStatus})),boundaryDigest:digest(boundary),snapshot_only:true};
  }
  reconcileRestoredTests(runId,payload,proof){
    this.mutable();evidence(payload?.evidence);
    if(!onlyKeys(payload,['version','transactionId','fencing','reconciliationId','boundaryDigest','evidence'])||
        !id(payload.transactionId)||!id(payload.reconciliationId)||!hash(payload.boundaryDigest)||
        !Number.isSafeInteger(payload.version)||!Number.isSafeInteger(payload.fencing))
      throw new CoordinationError('test-reconciliation-invalid',400);
    const entry=this.resourceState.testReservations?.[payload.transactionId];
    const inputDigest=digest(payload),prior=entry?.reconciliationReceipts?.[payload.reconciliationId];
    if(prior){
      if(entry.runId!==runId||prior.inputDigest!==inputDigest)throw new CoordinationError('test-reconciliation-divergent');
      return copy(entry);
    }
    const snapshot=this.restoredTestReconciliationSnapshot(runId,payload.transactionId),run=this.runs.get(runId);
    if(snapshot.version!==payload.version||snapshot.fencing!==payload.fencing||
        snapshot.boundaryDigest!==payload.boundaryDigest||this.unresolvedTestAccess(runId,snapshot.resources))
      throw new CoordinationError('test-reconciliation-boundary-changed');
    if(snapshot.operations.some(op=>!['PREPARED','CANCELLED','COMPLETED'].includes(op.state)||
        op.state!=='COMPLETED'&&(op.onceAcknowledged===true||op.nativePresent)||
        op.state==='COMPLETED'&&(!op.completionProved||
          !['completed','error'].includes(op.nativeResultStatus))))
      throw new CoordinationError('test-reconciliation-boundary-required');
    const proofBody={runId,contextId:run.contextId,transactionId:entry.transactionId,version:entry.version,
      fencing:entry.fencing,boundaryDigest:snapshot.boundaryDigest,sessionId:run.sessionId,
      operationsDigest:digest(snapshot.operations),sessionIdle:true,pendingPermissions:0,
      transcriptDigest:proof?.transcriptDigest,observedAt:proof?.observedAt};
    if(!proof||proof.runId!==runId||proof.contextId!==run.contextId||proof.transactionId!==entry.transactionId||
        proof.version!==entry.version||proof.fencing!==entry.fencing||proof.boundaryDigest!==snapshot.boundaryDigest||
        proof.sessionId!==run.sessionId||proof.sessionIdle!==true||proof.pendingPermissions!==0||
        !hash(proof.transcriptDigest)||proof.proofDigest!==digest(proofBody))
      throw new CoordinationError('test-reconciliation-proof-required');
    entry.token=randomUUID();entry.fencing=++this.resourceState.sequence;
    entry.reconciliationReceipts||={};entry.reconciliationReceipts[payload.reconciliationId]={inputDigest,fencing:entry.fencing};
    this.restoredTests.delete(entry.transactionId);this.persist();return copy(entry);
  }
  testBlockers(entry) {
    return Object.values(this.resourceState.testReservations || {}).filter((other) => other !== entry &&
      reservedTest(other) && (other.state === 'HELD' || other.order < entry.order) &&
      conflicts(entry.resources, other.resources)).map((r) => ({ runId: r.runId,
        transactionId: r.transactionId, reason: 'test-resource-conflict' }));
  }
  unresolvedTestAccess(runId, resources, excludeAccessId = null) {
    return Object.values(this.resourceState.accesses).some((access) => access.runId === runId && access.accessId !== excludeAccessId &&
      (active(access) || access.state === 'WAITING') && conflicts(resources, access.resources));
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
    const unresolvedTestReservation = Object.values(this.resourceState.testReservations || {}).some((entry) =>
      entry.runId === runId && reservedTest(entry));
    if (run.phase !== 'WORK' || unresolvedTestReservation || this.unresolvedTestAccess(runId, resources)) {
      throw new CoordinationError('test-acquisition-boundary-required');
    }
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
  unresolvedReservationAccess(entry) {
    return this.unresolvedTestAccess(entry.runId, entry.resources) ||
      Object.values(this.resourceState.accesses).some((access) => access.runId === entry.runId &&
        access.contextId === entry.contextId && (active(access) || access.state === 'WAITING') &&
        access.operationIds.some((operationId) =>
          this.resourceState.operations[operationId]?.testReservationId === entry.transactionId));
  }
  unusedTestOperations(entry) {
    return Object.values(this.resourceState.operations).filter((op) => op.runId === entry.runId &&
      op.contextId === entry.contextId && (op.testReservationId === entry.transactionId ||
        Date.parse(op.preparedAt) >= Date.parse(entry.grantedAt))).sort((a, b) => a.operationId.localeCompare(b.operationId));
  }
  isRejectionOnlyOperation(op) {
    const owner = this.requestOwners[op?.requestId];
    const receipt = owner?.reconciliation;
    return Boolean(op && op.rejectionOnly === true && op.state === 'PREPARED' && !op.native &&
      owner?.runId === op.runId && receipt?.outcome === 'REJECTION_ONLY' && receipt.recoveryId === null &&
      receipt.operationId === op.operationId && receipt.contextId === op.contextId &&
      receipt.version === op.version && receipt.sessionId === op.sessionId &&
      !Object.values(this.resourceState.accesses).some((access) => access.accessId === op.accessId ||
        access.operationIds.includes(op.operationId)));
  }
  unusedTestOperationClassification(op, decision = null) {
    if(this.withdrawnUnissuedOperations?.has(op.operationId))return null;
    if (op.state === 'CANCELLED' && !op.native) return this.reviewedReadOnlyOperations?.has(op.operationId)
      ? 'read-only-no-effect' : 'cancelled-without-execution';
    if (this.isRejectionOnlyOperation(op)) return 'rejected-validation-no-native-effect';
    if (op.state === 'PREPARED' && !op.native && decision === 'rejected') return 'rejected-validation-no-native-effect';
    if (op.state === 'PREPARED' && !op.native && decision === 'cancelled') return 'cancelled-validation-no-native-effect';
    if (op.state === 'COMPLETED' && op.native?.onceAcknowledged && op.native.kind === 'bash') {
      return 'read-only-no-effect';
    }
    return null;
  }
  unusedTestBoundary(entry) {
    return digest({ entry, run: this.runs.get(entry.runId),
      operations: Object.values(this.resourceState.operations).filter((op) => op.runId === entry.runId),
      accesses: Object.values(this.resourceState.accesses).filter((access) => access.runId === entry.runId),
      owners: Object.fromEntries(Object.entries(this.requestOwners).filter(([, owner]) => owner.runId === entry.runId)) });
  }
  restoredTestForUnusedRecovery(runId, payload) {
    this.mutable();
    const run = this.owned(runId, payload.version);
    const entry = this.resourceState.testReservations?.[payload.transactionId];
    if (payload.recoveryMode !== 'validated-change-unused' || !entry || entry.runId !== runId || entry.version !== run.version || entry.contextId !== run.contextId ||
        entry.state !== 'HELD' || !this.restoredTests.has(entry.transactionId)) {
      throw new CoordinationError('test-unused-recovery-required');
    }
    if (payload.contextId !== entry.contextId || payload.sessionId !== run.sessionId) {
      throw new CoordinationError('test-unused-recovery-identity-divergent');
    }
    if (payload.fencing !== entry.fencing) throw new CoordinationError('test-token-invalid');
    if (!hash(payload.boundaryDigest) || payload.boundaryDigest !== this.unusedTestBoundary(entry)) {
      throw new CoordinationError('test-unused-boundary-stale');
    }
    if (this.unresolvedAccess(runId, false) || this.operationTests(entry).some((op) =>
        !['COMPLETED','CANCELLED'].includes(op.state))) throw new CoordinationError('test-effects-unresolved');
    return entry;
  }
  unusedTestReplay(runId, payload) {
    const prior = this.resourceState.testReservations?.[payload.transactionId];
    if (prior?.state !== 'RELEASED') return null;
    if (prior.runId !== runId || !prior.unusedReleaseReceipt || prior.releaseDigest !== digest(payload)) {
      throw new CoordinationError('test-unused-release-divergent');
    }
    return copy(prior);
  }
  releaseUnusedTests(runId, payload, verifiedNativeProof, { lostTokenRecovery = false, validatedChangeScope = false } = {}) {
    this.mutable();
    const replay = this.unusedTestReplay(runId, payload);
    if (replay) return replay;
    this.admission(runId);
    const entry = lostTokenRecovery ? this.restoredTestForUnusedRecovery(runId, payload) : this.testHeld(runId, payload);
    const run = this.runs.get(runId);
    evidence(payload.evidence);
    const attestation = payload.attestation;
    const allowedKeys = ['version','transactionId',...(lostTokenRecovery ? ['recoveryMode'] : ['token']),
      'fencing','contextId','sessionId','boundaryDigest',...(lostTokenRecovery ? [] : ['developerAuthorization']),
      'evidence','attestation','nativeProof'];
    if (!onlyKeys(payload, allowedKeys) ||
        (lostTokenRecovery && (payload.recoveryMode !== 'validated-change-unused' || validatedChangeScope !== true)) ||
        payload.contextId !== entry.contextId || payload.sessionId !== run.sessionId ||
        (!lostTokenRecovery && (typeof payload.developerAuthorization !== 'string' || !payload.developerAuthorization.trim() ||
        payload.developerAuthorization.length > 500)) ||
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
    const proofClassifications = new Map((payload.nativeProof.operationClassifications || []).map((item) =>
      [item.operationId, item.classification]));
    if (proofClassifications.size !== ops.length || ops.some((op) =>
        !proofClassifications.has(op.operationId))) throw new CoordinationError('test-unused-operations-divergent');
    if (payload.nativeProof.coverage === 'operation-ledger-after-compaction' &&
        (!ops.length || this.unresolvedAccess(runId, false) || ops.some((op) => op.native ||
          !['PREPARED','CANCELLED'].includes(op.state) ||
          !['rejected-validation-no-native-effect','cancelled-validation-no-native-effect','cancelled-without-execution']
            .includes(proofClassifications.get(op.operationId))))) {
      throw new CoordinationError('test-unused-operation-not-proved');
    }
    if (attestation.operations.length !== ops.length || new Set(attestation.operations.map((op) => op?.operationId)).size !== ops.length) {
      throw new CoordinationError('test-unused-operations-divergent');
    }
    for (const op of ops) {
      const review = attestation.operations.find((review) => review?.operationId === op.operationId);
      if (!onlyKeys(review, ['operationId','classification']) ||
          review.classification !== proofClassifications.get(op.operationId) ||
          review.classification !== this.unusedTestOperationClassification(op, proofClassifications.get(op.operationId) === 'rejected-validation-no-native-effect' ? 'rejected' :
            proofClassifications.get(op.operationId) === 'cancelled-validation-no-native-effect' ? 'cancelled' : null)) {
        throw new CoordinationError('test-unused-operation-not-proved');
      }
    }
    entry.unusedReleaseReceipt = { mode: lostTokenRecovery ? 'unused-no-effect-lost-token' : 'unused-no-effect',
      authorizationDigest: lostTokenRecovery ? digest({mode:'validated-change-scope',runId,contextId:entry.contextId,
        version:entry.version,changeId:run.changeId}) : digest(payload.developerAuthorization),
      attestationDigest: digest(attestation), boundaryDigest: payload.boundaryDigest, nativeProof: copy(verifiedNativeProof),
      operationIds: ops.map((op) => op.operationId), evidenceDigest: digest(payload.evidence) };
    entry.state = 'RELEASED'; entry.finishedAt = now(); entry.releaseDigest = digest(payload);
    entry.proofDigest = digest(entry.unusedReleaseReceipt);
    if (lostTokenRecovery) { delete entry.token; this.restoredTests.delete(entry.transactionId); }
    this.grantTests(); this.persist(); return copy(entry);
  }
  releaseTests(runId, payload) {
    this.mutable(); evidence(payload.evidence);
    const prior = this.resourceState.testReservations?.[payload.transactionId];
    if (prior?.state === 'RELEASED' && !prior.unusedReleaseReceipt && prior.runId === runId && prior.releaseDigest === digest(payload)) return copy(prior);
    const entry = this.testHeld(runId, payload);
    const ops = this.operationTests(entry);
    if (this.unresolvedReservationAccess(entry) || ops.some((op) => !['COMPLETED','CANCELLED'].includes(op.state))) {
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
    try{verifyDependencies(this.directory,candidate.dependsOn);}catch(error){throw new CoordinationError(error.code||'dependency-openspec-unavailable');}
  }
  reserve(payload) {
    if (Object.values(this.resourceState.sessionHandoffs || {}).some(h => h.state !== 'ABORTED' &&
        this.runs.get(h.runId)?.state === 'RESERVED' &&
        (h.sourceSessionId === payload?.sessionId || h.state === 'PREPARED' && h.sessionId === payload?.sessionId)))
      throw new CoordinationError('session-handoff-session-reserved');
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
  operationCandidate(runId, approval, { candidateSession = null, rejectionOnly = false, checkCurrentRevisions = true,
    terminalTurnNoEffect = false, retirementOnly = false } = {}) {
    const preflight = Array.isArray(approval.files) && approval.files.length === 0 &&
      approval.commands?.length === 1 && approval.commands[0] === '/usr/bin/true' &&
      Array.isArray(approval.resources) && approval.resources.every((r) => r.mode === 'read');
    if (rejectionOnly) {
      this.mutable();
      if (this.runs.get(runId)?.suspension?.action !== 'PAUSE') throw new CoordinationError('notification-reconciliation-pause-required');
    } else if(terminalTurnNoEffect){
      this.mutable();
      const prior=this.resourceState.operations[approval?.operation_id],access=prior&&this.resourceState.accesses[prior.accessId];
      const run=this.runs.get(runId);
      if(!run||run.state!=='RESERVED'||run.phase!=='WORK'||run.suspension||prior?.runId!==runId||
          prior.contextId!==run.contextId||prior.state!=='UNKNOWN'||prior.decision?.status!=='approved'||
          prior.native||prior.nativeResult||prior.onceAcknowledged===true||prior.testReservationId||
          prior.nativeRecovery?.boundary!=='TOOL_TERMINAL_UNCLASSIFIED'||
          prior.nativeRecovery.permissionId!==null||prior.nativeRecovery.callId!==null||
          !access||access.runId!==runId||access.contextId!==run.contextId||access.state!=='UNKNOWN'||
          access.operationIds.length!==1||access.operationIds[0]!==prior.operationId||
          !this.restoredAccesses.has(access.accessId)||prior.resources.some(resource=>resource.mode!=='write'||
            !resource.key.startsWith('file:'))){
        throw new CoordinationError('terminal-turn-no-effect-candidate-required');
      }
    } else this.admission(runId, preflight);
    const current = this.runs.get(runId), historical = retirementOnly && this.resourceState.operations[approval?.operation_id];
    if (retirementOnly && (!current || !historical || historical.runId !== runId || historical.contextId !== current.contextId ||
        historical.state !== 'PREPARED' || historical.decision?.status !== 'rejected' ||
        historical.version !== approval.reservation_version || historical.version > current.version ||
        historical.sessionId !== approval.session_id || approval.run_id !== runId || approval.change_id !== current.changeId ||
        approval.directory !== current.directory || historical.native || historical.nativeResult || historical.onceAcknowledged ||
        Object.values(this.resourceState.accesses).some(a => a.accessId === historical.accessId || a.operationIds.includes(historical.operationId))))
      throw new CoordinationError('historical-retirement-boundary-invalid');
    const { run, resources } = this.scope(runId, retirementOnly ? current.version : approval.reservation_version, approval.resources);
    if (approval.coordination_protocol !== COORDINATION_PROTOCOL || !id(approval.operation_id) ||
        !hash(approval.operation_digest) || !id(approval.requestId) ||
        (approval.access_id !== undefined && !id(approval.access_id)) ||
        (approval.tool_input_sha256 !== undefined && !hash(approval.tool_input_sha256))) {
      throw new CoordinationError('coordination-upgrade-required');
    }
    this.validateExpected(approval.expected_revisions, resources, checkCurrentRevisions);
    if (!retirementOnly && approval.session_id !== run.sessionId && approval.session_id !== candidateSession) throw new CoordinationError('operation-session-divergent');
    const identityDigest = digest(Object.fromEntries(['run_id', 'reservation_version', 'requestId', 'approval_id',
      'change_id', 'session_id', 'directory', 'title', 'summary', 'files', 'commands', 'resources',
      'operation_id', 'operation_digest', 'expected_revisions', 'access_id', 'coordination_protocol',
      ...(Object.hasOwn(approval,'tool_input_sha256') ? ['tool_input_sha256'] : []),
      ...(Object.hasOwn(approval,'shell_background') ? ['shell_background'] : [])]
      .map((key) => [key, approval[key] ?? null])));
    const prior = this.resourceState.operations[approval.operation_id];
    if (prior) {
      if (prior.identityDigest !== identityDigest || prior.runId !== runId) throw new CoordinationError('operation-identity-divergent');
      return copy(prior);
    }
    const quarantineProbeFor = this.quarantineProbeCandidate?.(run,approval);
    const op = { operationId: approval.operation_id, accessId: approval.access_id || approval.operation_id,
      runId, contextId: run.contextId, version: run.version, sessionId: approval.session_id,
      requestId: approval.requestId, operationDigest: approval.operation_digest, identityDigest,
      resources, expectedRevisions: copy(approval.expected_revisions), state: 'PREPARED', preparedAt: now(),
      maintenancePreflight: Boolean(run.maintenancePreflightRequired && preflight),
      ...(quarantineProbeFor ? {quarantineProbeFor} : {}) };
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
  recordDecision(runId, operationId, decision) {
    this.mutable();
    const op = this.resourceState.operations[operationId];
    const run = this.runs.get(runId);
    if (!op || !run || op.runId !== runId || op.contextId !== run.contextId ||
        !decision || !['approved','rejected','needs_clarification'].includes(decision.status) ||
        decision.requestId !== op.requestId || decision.operationId !== op.operationId ||
        decision.runId !== runId || decision.changeId !== run.changeId || decision.version !== op.version || decision.sessionId !== op.sessionId ||
        decision.operationDigest !== op.operationDigest || decision.identityDigest !== op.identityDigest) {
      throw new CoordinationError('operation-decision-identity-divergent');
    }
    const value = { status: decision.status, requestId: op.requestId, approvalId: decision.approvalId,
      changeId: decision.changeId, runId, version: op.version, sessionId: op.sessionId,
      operationDigest: op.operationDigest, identityDigest: op.identityDigest,
      recordedAt: typeof decision.recordedAt === 'string' ? decision.recordedAt : now() };
    if (!id(value.approvalId) || !id(value.changeId) || !Number.isFinite(Date.parse(value.recordedAt))) {
      throw new CoordinationError('operation-decision-invalid');
    }
    if (op.decision) {
      if (['status','requestId','approvalId','changeId','runId','version','sessionId','operationDigest','identityDigest']
        .some((key) => op.decision[key] !== value[key])) throw new CoordinationError('operation-decision-conflict');
      return copy(op.decision);
    }
    op.decision = value;
    this.persist();
    return copy(value);
  }
  recordRejectedNativeDecision(runId, operationId, decision, proofDigest) {
    this.mutable();
    const op = this.resourceState.operations[operationId];
    const run = this.runs.get(runId);
    if (!hash(proofDigest) || decision?.status !== 'rejected') throw new CoordinationError('native-rejection-decision-invalid');
    if (op && run && op.runId === runId && op.contextId === run.contextId && op.state === 'CANCELLED' &&
        decision.runId === runId && decision.changeId === run.changeId && decision.version === op.version &&
        decision.sessionId === op.sessionId && decision.operationId === op.operationId &&
        op.completionDigest === proofDigest && op.decision?.status === 'rejected' &&
        op.decision.requestId === decision?.requestId && op.decision.approvalId === decision?.approvalId &&
        op.decision.operationDigest === decision?.operationDigest &&
        op.decision.identityDigest === decision?.identityDigest &&
        !Object.values(this.resourceState.accesses).some((access) => access.accessId === op.accessId || access.operationIds.includes(operationId))) {
      return copy(op.decision);
    }
    if (!op || !run || op.runId !== runId || op.contextId !== run.contextId || op.state !== 'PREPARED' || op.native ||
        !hash(proofDigest) || !decision || decision.status !== 'rejected' ||
        decision.requestId !== op.requestId || decision.operationId !== op.operationId || decision.runId !== runId ||
        decision.changeId !== run.changeId || decision.version !== op.version || decision.sessionId !== op.sessionId ||
        decision.operationDigest !== op.operationDigest || decision.identityDigest !== op.identityDigest ||
        Object.values(this.resourceState.accesses).some((access) => access.accessId === op.accessId || access.operationIds.includes(operationId))) {
      throw new CoordinationError('native-rejection-decision-boundary-invalid');
    }
    const requestOwner = this.requestOwners[op.requestId];
    if (!requestOwner || requestOwner.runId !== runId) throw new CoordinationError('native-rejection-owner-missing');
    const value = { status: 'rejected', requestId: op.requestId, approvalId: decision.approvalId,
      changeId: run.changeId, runId, version: op.version, sessionId: op.sessionId,
      operationDigest: op.operationDigest, identityDigest: op.identityDigest,
      recordedAt: typeof decision.recordedAt === 'string' ? decision.recordedAt : now() };
    if (!id(value.approvalId) || !Number.isFinite(Date.parse(value.recordedAt))) {
      throw new CoordinationError('native-rejection-decision-invalid');
    }
    if (op.decision || op.completionDigest) {
      if (op.state === 'CANCELLED' && op.completionDigest === proofDigest &&
          op.decision?.status === 'rejected' && op.decision.approvalId === value.approvalId) return copy(op.decision);
      throw new CoordinationError('native-rejection-decision-conflict');
    }
    op.decision = value;
    op.completionDigest = proofDigest;
    op.state = 'CANCELLED';
    op.finishedAt = value.recordedAt;
    this.persist();
    return copy(value);
  }
  releasedReferenceWithdrawal(runId,operationId) {
    const run=this.runs.get(runId),op=this.resourceState.operations[operationId];
    const linked=op&&Object.values(this.resourceState.accesses).filter(a=>a.accessId===op.accessId||a.operationIds.includes(operationId));
    const parent=linked?.[0];
    if(!run||!op||op.runId!==runId||op.contextId!==run.contextId||op.version!==run.version||op.sessionId!==run.sessionId||
      op.state!=='PREPARED'||op.decision?.status!=='approved'||op.native||op.nativeResult||op.onceAcknowledged===true||
      linked.length!==1||!parent||parent.accessId!==op.accessId||parent.operationIds.includes(operationId)||
      parent.runId!==runId||parent.contextId!==run.contextId||parent.version!==run.version||parent.state!=='RELEASED'||
      !['COMPLETED','NO_EFFECT','RECONCILED'].includes(parent.outcome)||!hash(parent.releaseDigest)||!Number.isFinite(Date.parse(parent.finishedAt))||
      parent.operationIds.some(id=>{const member=this.resourceState.operations[id];return !member||member.runId!==runId||
        member.contextId!==run.contextId||!['COMPLETED','CANCELLED'].includes(member.state)}))
      throw new CoordinationError('released-reference-withdrawal-invalid');
    return copy(parent);
  }
  recordNativeCancelledValidation(runId, operationId, proofDigest, {allowRejected=false,allowReleasedReference=false}={}) {
    this.mutable();
    const op = this.resourceState.operations[operationId];
    const run = this.runs.get(runId);
    let linkedAccess = op && Object.values(this.resourceState.accesses).some((access) =>
      access.accessId === op.accessId || access.operationIds.includes(operationId));
    if(linkedAccess&&allowReleasedReference){this.releasedReferenceWithdrawal(runId,operationId);linkedAccess=false;}
    if (!hash(proofDigest) || !op || !run || op.runId !== runId || op.contextId !== run.contextId ||
        op.native || op.nativeResult || (op.decision && op.decision.status !== 'approved'&&
          !(allowRejected&&op.decision.status==='rejected')) || linkedAccess) {
      throw new CoordinationError('native-cancellation-boundary-invalid');
    }
    const owner = this.requestOwners[op.requestId];
    if (!owner || owner.runId !== runId) throw new CoordinationError('native-cancellation-owner-missing');
    if (op.state === 'CANCELLED' && op.completionDigest === proofDigest) return copy(op);
    if (op.state !== 'PREPARED') throw new CoordinationError('native-cancellation-boundary-invalid');
    op.state = 'CANCELLED'; op.finishedAt = now(); op.completionDigest = proofDigest;
    this.persist();
    return copy(op);
  }
  attachedWithdrawalAccess(runId, operationId, {allowReference=false,allowSingleton=false}={}) {
    const run=this.runs.get(runId),op=this.resourceState.operations[operationId];
    const linked=op && Object.values(this.resourceState.accesses).filter(a=>
      a.accessId===op.accessId || a.operationIds.includes(operationId));
    const access=linked?.[0];
    const singleton=allowSingleton===true && Boolean(access) && access.accessId===operationId &&
      access.operationIds.length===1 && access.operationIds[0]===operationId &&
      !access.timeoutQuarantine && !this.restoredAccesses.has(access.accessId);
    if(!run || !op || op.runId!==runId || op.contextId!==run.contextId || op.version!==run.version ||
        op.sessionId!==run.sessionId || op.state!=='PREPARED' || op.decision?.status!=='approved' ||
        op.native || op.nativeResult || op.onceAcknowledged===true || linked.length!==1 ||
        (access.accessId===operationId && !singleton) || access.accessId!==op.accessId || access.runId!==runId ||
        access.contextId!==run.contextId || access.version!==run.version || access.state!=='HELD' ||
        (!access.operationIds.includes(operationId) && !allowReference) ||
        access.operationIds.length<(singleton?1:access.operationIds.includes(operationId)?2:1) ||
        access.operationIds.some(id=>{const other=this.resourceState.operations[id];return !other ||
          other.runId!==runId || other.contextId!==run.contextId || other.version!==run.version ||
          other.sessionId!==op.sessionId && !(other.state==='CANCELLED' &&
            !other.native && !other.nativeResult && other.onceAcknowledged!==true);}) ||
        op.resources.some(r=>!access.resources.some(held=>covers(held,r))))
      throw new CoordinationError('attached-withdrawal-parent-invalid');
    return copy(access);
  }
  withdrawRejectedAttachedShell(runId, operationId, proofDigest, parentDigest, options={}) {
    this.mutable();
    if(!hash(proofDigest) || !hash(parentDigest))throw new CoordinationError('attached-withdrawal-proof-invalid');
    const access=this.attachedWithdrawalAccess(runId,operationId,options);
    if(digest(access)!==parentDigest)throw new CoordinationError('attached-withdrawal-parent-changed');
    const op=this.resourceState.operations[operationId];
    if(this.requestOwners[op.requestId]?.runId!==runId)throw new CoordinationError('native-cancellation-owner-missing');
    // Keep the historical reference or attachment and every field of its live parent.
    op.state='CANCELLED';op.finishedAt=now();op.completionDigest=proofDigest;
    this.persist();return copy(op);
  }
  terminalReviewAccessBoundary(runId,operationId) {
    const run=this.runs.get(runId),op=this.resourceState.operations[operationId];
    if(!run||!op||op.runId!==runId||op.contextId!==run.contextId||op.version!==run.version||
        op.sessionId!==run.sessionId||op.state!=='PREPARED'||op.decision?.status!=='approved'||op.native||
        op.nativeResult||op.onceAcknowledged===true||Object.values(this.resourceState.accesses)
          .some(access=>access.operationIds.includes(operationId)))throw new CoordinationError('terminal-review-boundary-invalid');
    const parent=this.resourceState.accesses[op.accessId];
    if(op.accessId===operationId){if(parent)throw new CoordinationError('terminal-review-boundary-invalid');return null;}
    if(!parent||parent.runId!==runId||parent.contextId!==run.contextId||parent.version!==run.version||
        parent.state!=='HELD'||op.resources.some(r=>!parent.resources.some(held=>covers(held,r))))
      throw new CoordinationError('terminal-review-parent-invalid');
    return copy(parent);
  }
  completeReviewedReadOnly(runId, operationId, proofDigest, parentDigest=null) {
    this.admission(runId);
    const op=this.resourceState.operations[operationId];
    if (!op || op.runId!==runId || !hash(proofDigest) || op.native || op.nativeResult || op.decision?.status!=='approved')
      throw new CoordinationError('terminal-review-boundary-invalid');
    if(op.state==='COMPLETED'&&op.completionDigest===proofDigest)return copy(op);
    if(op.state!=='PREPARED')throw new CoordinationError('terminal-review-boundary-invalid');
    const parent=this.terminalReviewAccessBoundary(runId,operationId);
    if(parent?digest(parent)!==parentDigest:parentDigest!==null)throw new CoordinationError('terminal-review-parent-changed');
    this.validateExpected(op.expectedRevisions,op.resources);
    op.state='COMPLETED';op.finishedAt=now();op.completionDigest=proofDigest;
    this.persist();return copy(op);
  }
  restorePendingNative(runId, operationId, proof) {
    this.mutable();
    const op = this.resourceState.operations[operationId];
    const access = op && this.resourceState.accesses[op.accessId];
    if (!op || op.runId !== runId || !['ISSUING','UNKNOWN'].includes(op.state) ||
        !op.native || op.native.onceAcknowledged === true || !access || access.runId !== runId ||
        !['EXECUTING','UNKNOWN'].includes(access.state) || !proof ||
        proof.permissionId !== op.native.permissionId || proof.callId !== op.native.callId ||
        proof.pending !== true || proof.toolStatus !== 'running' || proof.executed !== false || !hash(proof.proofDigest)) {
      throw new CoordinationError('native-pending-proof-required');
    }
    op.nativeRecovery = { permissionId: proof.permissionId, callId: proof.callId,
      proofDigest: proof.proofDigest, observedAt: now(), boundary:'PERMISSION_PENDING_NO_REPLY', logWatermark:null };
    delete op.native;
    op.state = 'PREPARED';
    access.state = 'HELD';
    delete access.finishedAt;
    delete access.outcome;
    this.persist();
    return copy(op);
  }
  markTerminalUnknown(runId, operationId, proof) {
    this.mutable();
    const op=this.resourceState.operations[operationId],access=op&&this.resourceState.accesses[op.accessId];
    if(!op||op.runId!==runId||!['PREPARED','ISSUING','EXECUTING','UNKNOWN'].includes(op.state)||op.decision?.status!=='approved'||
       op.nativeResult||!access||access.runId!==runId||!access.operationIds.includes(operationId)||
       !proof||proof.sessionId!==op.sessionId||proof.operationDigest!==op.operationDigest||
       proof.identityDigest!==op.identityDigest||(proof.callId!==null&&typeof proof.callId!=='string')||
       op.native?.callId&&proof.callId!==op.native.callId||!active(access)||
       !['completed','error','absent'].includes(proof.toolStatus)||
       (proof.executed!==null&&typeof proof.executed!=='boolean')||
       typeof proof.logSynced!=='boolean'||(proof.logWatermark!==null&&(!Number.isSafeInteger(proof.logWatermark)||proof.logWatermark<0))||
       !hash(proof.proofDigest))throw new CoordinationError('terminal-native-recovery-proof-required');
    op.state='UNKNOWN';
    if(access.state==='HELD'||access.state==='EXECUTING')access.state='UNKNOWN';
    op.nativeRecovery={permissionId:op.native?.permissionId??null,callId:proof.callId,
      proofDigest:proof.proofDigest,observedAt:now(),boundary:'TOOL_TERMINAL_UNCLASSIFIED',logWatermark:proof.logWatermark};
    this.persist();return copy(op);
  }
  reconcileTerminalTurnNoEffect(runId,operationId,proof){
    this.mutable();
    const op=this.resourceState.operations[operationId],run=this.runs.get(runId),access=op&&this.resourceState.accesses[op.accessId];
    if(op?.state==='CANCELLED'&&op.runId===runId&&op.nativeRecovery?.boundary==='TERMINAL_TURN_NO_EFFECT'&&
        op.completionDigest===proof?.proofDigest&&access?.state==='RELEASED'&&access.outcome==='NO_EFFECT')return copy(op);
    if(!op||!run||op.runId!==runId||op.contextId!==run.contextId||op.state!=='UNKNOWN'||run.state!=='RESERVED'||run.phase!=='WORK'||
        op.decision?.status!=='approved'||op.native||op.nativeResult||op.testReservationId||
        op.nativeRecovery?.boundary!=='TOOL_TERMINAL_UNCLASSIFIED'||
        op.nativeRecovery.permissionId!==null||op.nativeRecovery.callId!==null||
        !access||access.runId!==runId||access.contextId!==run.contextId||access.state!=='UNKNOWN'||
        access.operationIds.length!==1||access.operationIds[0]!==operationId||
        op.resources.some(resource=>resource.mode!=='write'||!resource.key.startsWith('file:'))||
        access.resources.some(resource=>resource.mode!=='write'||!resource.key.startsWith('file:'))||
        !this.restoredAccesses.has(access.accessId)||run.suspension||
        !proof||proof.runId!==runId||proof.contextId!==run.contextId||proof.operationId!==operationId||
        proof.requestId!==op.requestId||proof.sessionId!==op.sessionId||
        proof.operationDigest!==op.operationDigest||proof.identityDigest!==op.identityDigest||
        proof.finish!=='stop'||!id(proof.userMessageId)||!id(proof.requestMessageId)||!id(proof.finalMessageId)||
        !hash(proof.transcriptDigest)||!hash(proof.eventLogDigest)||!hash(proof.proofDigest)||
        !Number.isSafeInteger(proof.logWatermark)||proof.logWatermark<0||
        (op.nativeRecovery.logWatermark!==null&&proof.logWatermark<op.nativeRecovery.logWatermark)){
      throw new CoordinationError('terminal-turn-no-effect-proof-required');
    }
    this.validateExpected(op.expectedRevisions,op.resources);
    op.state='CANCELLED';op.finishedAt=Number.isFinite(proof.finishedAt)?proof.finishedAt:Date.now();
    op.completionDigest=proof.proofDigest;
    op.nativeRecovery={permissionId:null,callId:null,proofDigest:proof.proofDigest,observedAt:now(),
      boundary:'TERMINAL_TURN_NO_EFFECT',logWatermark:proof.logWatermark};
    this.finishAccess(access,'NO_EFFECT');
    access.releaseDigest=digest({operationId,outcome:'NO_EFFECT',proofDigest:proof.proofDigest});
    this.persist();return copy(op);
  }
  completeLoggedNative(runId, operationId, proof) {
    this.mutable();
    const op=this.resourceState.operations[operationId],access=op&&this.resourceState.accesses[op.accessId];
    if(!op||op.runId!==runId||!['UNKNOWN','PREPARED','ISSUING','EXECUTING'].includes(op.state)||op.decision?.status!=='approved'||
       op.nativeResult||!access||access.runId!==runId||!['HELD','EXECUTING','UNKNOWN'].includes(access.state)||!access.operationIds.includes(operationId)||
       !proof||proof.sessionId!==op.sessionId||proof.operationDigest!==op.operationDigest||
       proof.identityDigest!==op.identityDigest||typeof proof.callId!=='string'||
       op.native?.callId&&proof.callId!==op.native.callId||proof.status!=='completed'||
       proof.logSynced!==true||!Number.isSafeInteger(proof.logWatermark)||proof.logWatermark<0||
       !Number.isFinite(proof.finishedAt)||!hash(proof.proofDigest)||!hash(proof.partDigest)) {
      throw new CoordinationError('logged-native-completion-proof-required');
    }
    this.validateExpected(op.expectedRevisions,op.resources);
    op.state='COMPLETED';op.finishedAt=proof.finishedAt;
    op.completionDigest=digest({sessionId:proof.sessionId,callId:proof.callId,finishedAt:proof.finishedAt,
      status:'completed',logWatermark:proof.logWatermark,proofDigest:proof.proofDigest});
    op.nativeResult={status:'completed',proofStatus:'completed',exit:null,partDigest:proof.partDigest};
    op.nativeRecovery={permissionId:op.native?.permissionId??null,callId:proof.callId,
      proofDigest:proof.proofDigest,observedAt:now(),boundary:'TOOL_TERMINAL_SUCCESS',logWatermark:proof.logWatermark};
    access.state='HELD';this.persist();return copy(op);
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
          this.accessConflict(access, other)) result.push({ runId: other.runId,
        accessId: other.accessId, reason: other.protection === 'EXCLUSIVE' ? 'resource-promotion-pending' : 'resource-conflict' });
    }
    return result;
  }
  accessConflict(candidate, existing) {
    for (const requested of candidate.resources) for (const held of existing.resources) {
      if (!(requested.mode === 'write' || held.mode === 'write') || !overlaps(requested.key, held.key)) continue;
      const timeoutQuarantineRead = candidate.runId === existing.runId &&
        candidate.contextId === existing.contextId && requested.mode === 'read' && held.mode === 'write' &&
        candidate.operationIds.every(id => this.resourceState.operations[id]?.sessionId ===
          this.resourceState.operations[existing.timeoutQuarantine?.operationId]?.sessionId ||
          this.resourceState.operations[id]?.sessionId === this.runs.get(candidate.runId)?.sessionId &&
          this.resourceState.operations[id]?.quarantineProbeFor === existing.timeoutQuarantine?.operationId) &&
        requested.key === held.key && /^port:[a-z0-9][a-z0-9._-]*\/\d+$/.test(requested.key) &&
        this.validTimeoutQuarantine(existing);
      if (!timeoutQuarantineRead) return true;
    }
    return false;
  }
  validTimeoutQuarantine(access) {
    const quarantine=access?.timeoutQuarantine,operation=quarantine&&this.resourceState.operations[quarantine.operationId];
    return Boolean(quarantine&&operation&&operation.runId===access.runId&&operation.contextId===access.contextId&&
      access.operationIds.includes(operation.operationId)&&['EXECUTING','UNKNOWN'].includes(operation.state)&&
      operation.native?.onceAcknowledged===true&&access.resources.some(resource=>resource.mode==='write'&&
        /^port:[a-z0-9][a-z0-9._-]*\/\d+$/.test(resource.key)));
  }
  grantWaiting() {
    if (this.migrationRequired || (this.resourceState.global && this.resourceState.global.state !== 'RELEASED')) return;
    this.grantTests();
    for (const access of Object.values(this.resourceState.accesses).sort((a, b) => a.order - b.order)) {
      if (access.state !== 'WAITING' || this.runs.get(access.runId)?.suspension || this.blockers(access).length) continue;
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
    if (Object.values(this.resourceState.sessionHandoffs || {}).some(h => h.runId === runId &&
        h.contextId === this.runs.get(runId)?.contextId &&
        h.state !== 'ABORTED' && (h.state !== 'DONE' || h.sourceSessionId === operation.sessionId))) {
      throw new CoordinationError('session-handoff-permission-revoked');
    }
    this.scope(runId, operation.reservationVersion, operation.resources);
    this.testsForOperation(runId, operation.resources);
    if (!op || op.requestId !== requestId || op.operationDigest !== operation.operationDigest ||
        op.version !== operation.reservationVersion || op.sessionId !== operation.sessionId ||
        digest(op.expectedRevisions) !== digest(operation.expectedRevisions)) throw new CoordinationError('operation-identity-divergent');
    this.validateExpected(op.expectedRevisions, op.resources);
    if (stage === 'prepare') return true;
    if (op.rejectionOnly) throw new CoordinationError('notification-reconciliation-rejection-only');
    let access = this.resourceState.accesses[op.accessId];
    if (access?.operationIds.some(id => this.resourceState.operations[id]?.sessionId !== op.sessionId))
      throw new CoordinationError('session-handoff-historical-access-protected');
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
    op.nativeResult = { status: proof.status, proofStatus: proof.status,
      exit: Number.isInteger(proof.exit) ? proof.exit : null };
    const access = this.resourceState.accesses[op.accessId];
    if (access?.timeoutQuarantine?.operationId === operationId) delete access.timeoutQuarantine;
    if (op.testReservationId) {
      op.finishedSequence = ++this.resourceState.sequence;
    }
    if (op.maintenancePreflight) op.preflightSucceeded = proof.status === 'completed' && proof.exit === 0;
    if (access.operationIds.every((key) => !['ISSUING', 'EXECUTING', 'UNKNOWN'].includes(this.resourceState.operations[key].state))) {
      access.state = 'HELD';
    }
    this.persist();
  }
  recordNativeOutcome(runId, operationId, outcome, completionDigest) {
    this.mutable();
    const op = this.resourceState.operations[operationId];
    if (!op || op.runId !== runId || op.state !== 'COMPLETED' || op.completionDigest !== completionDigest ||
        !record(outcome) || !['completed','error'].includes(outcome.status) ||
        !['completed','error'].includes(outcome.proofStatus) ||
        (outcome.exit !== null && !Number.isInteger(outcome.exit)) ||
        (outcome.partDigest !== undefined && !hash(outcome.partDigest)) ||
        (outcome.status === 'completed' && outcome.proofStatus === 'error') ||
        (outcome.status === 'error' && outcome.proofStatus === 'completed' && !hash(outcome.partDigest))) {
      throw new CoordinationError('native-outcome-not-proved');
    }
    const prior = op.nativeResult;
    if (prior?.partDigest && (prior.status !== outcome.status || prior.proofStatus !== outcome.proofStatus ||
        prior.exit !== outcome.exit || prior.partDigest !== outcome.partDigest)) {
      throw new CoordinationError('native-outcome-divergent');
    }
    op.nativeResult = { status: outcome.status, proofStatus: outcome.proofStatus, exit: outcome.exit,
      ...(outcome.partDigest ? { partDigest: outcome.partDigest } : {}) };
    this.persist(); return copy(op);
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
    const completedWrites = ops.filter((op) => op.state === 'COMPLETED' && op.resources.some((r) => r.mode === 'write'));
    if (completedWrites.some((op) => !op.nativeResult)) throw new CoordinationError('access-native-outcome-unverified');
    const failedEditWithoutEffect = (op) => op.native?.kind === 'edit' && op.nativeResult?.status === 'error' &&
      (op.nativeResult.proofStatus === 'error' || hash(op.nativeResult.partDigest || ''));
    const changed = completedWrites.some((op) => !failedEditWithoutEffect(op));
    if (outcome === 'NO_EFFECT' && access.resources.some((resource) =>
        this.revision(resource.key) !== access.expectedRevisions[resource.key])) {
      throw new CoordinationError('access-outcome-revision-divergent');
    }
    if (outcome === 'COMPLETED' && ops.some((op) => op.nativeResult?.status === 'error')) {
      throw new CoordinationError('access-native-failure');
    }
    if (!['COMPLETED', 'NO_EFFECT', 'RECONCILED'].includes(outcome) || (outcome === 'NO_EFFECT' && changed)) {
      throw new CoordinationError('access-outcome-invalid');
    }
    if (outcome === 'COMPLETED' && ops.some((op) => !['COMPLETED','CANCELLED'].includes(op.state))) throw new CoordinationError('access-effects-unresolved');
    if (changed) {
      const revision = ++this.resourceState.sequence;
      for (const op of completedWrites.filter((op) => !failedEditWithoutEffect(op))) for (const r of op.resources) {
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
    delete access.token;
    delete access.timeoutQuarantine;
    this.restoredAccesses.delete(access.accessId);
  }
  releaseAccess(runId, payload) {
    evidence(payload.evidence);
    const prior = this.resourceState.accesses[payload.operationId];
    if (prior?.state === 'RELEASED' && prior.runId === runId &&
        prior.fencing === payload.fencing && prior.releaseDigest === digest(payload)) return copy(prior);
    const access = this.held(runId, payload);
    this.finishAccess(access, payload.outcome); access.releaseDigest = digest(payload);
    this.grantWaiting(); this.persist(); return copy(access);
  }
  reconcileQuiescentPort(runId, operationId, proofDigest) {
    this.admission(runId);
    const run = this.runs.get(runId), op = this.resourceState.operations[operationId];
    const access = op && this.resourceState.accesses[op.accessId];
    if (!hash(proofDigest) || !run || !op || op.runId !== runId || op.contextId !== run.contextId ||
        !['EXECUTING','UNKNOWN'].includes(op.state) || op.native?.onceAcknowledged !== true || op.nativeResult ||
        op.testReservationId || op.resources.length !== 1 || op.resources[0].mode !== 'write' ||
        !/^port:[A-Za-z0-9_.-]+\/[1-9][0-9]{0,4}$/.test(op.resources[0].key) ||
        !access || access.runId !== runId || access.contextId !== run.contextId ||
        !['HELD','UNKNOWN'].includes(access.state) || access.operationIds.length !== 1 || access.operationIds[0] !== operationId ||
        access.timeoutQuarantine?.operationId !== operationId || access.resources.length !== 1 ||
        access.resources[0].key !== op.resources[0].key || access.resources[0].mode !== 'write')
      throw new CoordinationError('port-recovery-boundary-invalid');
    op.state = 'CANCELLED'; op.finishedAt = now(); op.completionDigest = proofDigest;
    this.resourceState.revisions[op.resources[0].key] = ++this.resourceState.sequence;
    this.finishAccess(access, 'RECONCILED'); access.releaseDigest = proofDigest;
    this.grantWaiting(); this.persist();
    return { operation: copy(op), access: copy(access) };
  }
  accesses(runId) {
    return Object.values(this.resourceState.accesses).filter((a) => !runId || a.runId === runId).map((a) =>
      ({ ...copy(a), blockers: a.state === 'WAITING' ? this.blockers(a) : [] }));
  }
  restoredAccessReconciliationSnapshot(runId,operationId){
    const access=this.resourceState.accesses[operationId],run=this.runs.get(runId);
    if(!access||!run||access.runId!==runId||access.contextId!==run.contextId||
        access.version!==run.version||access.state!=='HELD'||!this.restoredAccesses.has(access.accessId))
      throw new CoordinationError('access-reconciliation-boundary-required');
    const operations=access.operationIds.map(id=>this.resourceState.operations[id]).map(op=>({
      operationId:op.operationId,state:op.state,operationDigest:op.operationDigest,identityDigest:op.identityDigest,
      decisionStatus:op.decision?.status??null,completionDigest:op.completionDigest??null,
      nativeResultStatus:op.nativeResult?.status??null,onceAcknowledged:op.native?.onceAcknowledged??op.onceAcknowledged??null,
      nativePresent:Boolean(op.native)})).sort((a,b)=>a.operationId.localeCompare(b.operationId));
    const boundary={runId,contextId:run.contextId,accessId:access.accessId,version:run.version,fencing:access.fencing,
      state:access.state,resources:access.resources,expectedRevisions:access.expectedRevisions,
      inputDigest:access.inputDigest,operationIds:access.operationIds,operations};
    return {runId,contextId:run.contextId,accessId:access.accessId,version:run.version,state:access.state,
      fencing:access.fencing,resources:copy(access.resources),expectedRevisions:copy(access.expectedRevisions),
      operations:operations.map(({operationId,state,decisionStatus,nativeResultStatus,onceAcknowledged})=>
        ({operationId,state,decisionStatus,nativeResultStatus,onceAcknowledged})),
      boundaryDigest:digest(boundary),snapshot_only:true};
  }
  reconcileRestoredAccess(runId,payload,proof){
    this.mutable();evidence(payload?.evidence);
    if(!onlyKeys(payload,['version','operationId','fencing','reconciliationId','boundaryDigest','evidence'])||
        !id(payload.operationId)||!id(payload.reconciliationId)||!hash(payload.boundaryDigest)||
        !Number.isSafeInteger(payload.version)||!Number.isSafeInteger(payload.fencing))
      throw new CoordinationError('access-reconciliation-invalid',400);
    const access=this.resourceState.accesses[payload.operationId],prior=access?.reconciliationReceipts?.[payload.reconciliationId];
    const inputDigest=digest(payload);
    if(prior){
      if(access.runId!==runId||prior.inputDigest!==inputDigest)throw new CoordinationError('access-reconciliation-divergent');
      return copy(access);
    }
    const snapshot=this.restoredAccessReconciliationSnapshot(runId,payload.operationId),run=this.runs.get(runId);
    if(snapshot.version!==payload.version||snapshot.fencing!==payload.fencing||
        snapshot.boundaryDigest!==payload.boundaryDigest)throw new CoordinationError('access-reconciliation-boundary-changed');
    if(this.blockers(access).length)throw new CoordinationError('access-reconciliation-conflict');
    if(this.unresolvedTestAccess(runId,access.resources,access.accessId))throw new CoordinationError('access-reconciliation-test-resource-active');
    if(this.resourceState.global&&this.resourceState.global.state!=='RELEASED')throw new CoordinationError('global-coordination-suspended');
    if(run.suspension)throw new CoordinationError('run-suspended');
    if(run.phase!=='WORK')throw new CoordinationError('access-reconciliation-phase-invalid');
    const operationDetails=access.operationIds.map(id=>this.resourceState.operations[id]).map(op=>({state:op.state,
      completionDigest:op.completionDigest??null,nativeResultStatus:op.nativeResult?.status??null,
      decisionStatus:op.decision?.status??null,nativePresent:Boolean(op.native),
      onceAcknowledged:op.native?.onceAcknowledged??op.onceAcknowledged??null}));
    if(operationDetails.some(op=>!['PREPARED','CANCELLED','COMPLETED'].includes(op.state)||
        op.state!=='COMPLETED'&&(op.nativePresent||op.onceAcknowledged===true)))
      throw new CoordinationError('access-reconciliation-boundary-required');
    if(operationDetails.some(op=>op.state==='COMPLETED'&&!op.completionDigest))
      throw new CoordinationError('access-reconciliation-completion-unproved');
    if(operationDetails.some(op=>op.state==='COMPLETED'&&!['completed','error'].includes(op.nativeResultStatus)))
      throw new CoordinationError('access-reconciliation-native-result-unproved');
    if(operationDetails.some(op=>op.state==='COMPLETED'&&op.decisionStatus!=='approved'))
      throw new CoordinationError('access-reconciliation-approval-unproved');
    this.validateExpected(access.expectedRevisions,access.resources);
    const proofBody={runId,contextId:run.contextId,accessId:access.accessId,version:run.version,
      fencing:access.fencing,boundaryDigest:snapshot.boundaryDigest,sessionId:run.sessionId,
      operationsDigest:digest(snapshot.operations),sessionIdle:true,pendingPermissions:0,
      transcriptDigest:proof?.transcriptDigest,observedAt:proof?.observedAt};
    if(!proof||proof.runId!==runId||proof.contextId!==run.contextId||proof.accessId!==access.accessId||
        proof.version!==run.version||proof.fencing!==access.fencing||proof.boundaryDigest!==snapshot.boundaryDigest||
        proof.sessionId!==run.sessionId||proof.sessionIdle!==true||proof.pendingPermissions!==0||
        !hash(proof.transcriptDigest)||proof.proofDigest!==digest(proofBody))
      throw new CoordinationError('access-reconciliation-proof-required');
    for(const id of access.operationIds){
      const op=this.resourceState.operations[id];
      if(op.state==='PREPARED')op.state='CANCELLED';
    }
    access.token=randomUUID();access.fencing=++this.resourceState.sequence;
    access.reconciliationReceipts||={};access.reconciliationReceipts[payload.reconciliationId]={inputDigest,fencing:access.fencing};
    this.restoredAccesses.delete(access.accessId);this.persist();return copy(access);
  }
  timeoutQuarantineSnapshot(runId,operationId){
    const access=this.resourceState.accesses[operationId],run=this.runs.get(runId);
    const alreadyQuarantined=Boolean(access?.timeoutQuarantine);
    if(!access||!run||access.runId!==runId||access.contextId!==run.contextId||access.version!==run.version||
        !(alreadyQuarantined?access.state==='HELD':['EXECUTING','UNKNOWN'].includes(access.state))||
        !this.restoredAccesses.has(access.accessId)||
        access.operationIds.length!==1||access.operationIds[0]!==operationId)
      throw new CoordinationError('timeout-quarantine-boundary-required');
    const operation=this.resourceState.operations[operationId];
    if(!operation||operation.runId!==runId||operation.contextId!==run.contextId||
        !['EXECUTING','UNKNOWN'].includes(operation.state)||operation.native?.onceAcknowledged!==true||
        !operation.native?.callId||operation.nativeResult||operation.decision?.status!=='approved'||
        access.resources.length!==1||access.resources[0].mode!=='write'||
        !/^port:[a-z0-9][a-z0-9._-]*\/\d+$/.test(access.resources[0].key))
      throw new CoordinationError('timeout-quarantine-boundary-required');
    const boundary={runId,contextId:run.contextId,accessId:access.accessId,operationId,version:run.version,
      fencing:access.fencing,state:access.state,resources:access.resources,expectedRevisions:access.expectedRevisions,
      inputDigest:access.inputDigest,operationDigest:operation.operationDigest,identityDigest:operation.identityDigest,
      operationState:operation.state,decisionStatus:operation.decision.status,permissionId:operation.native.permissionId,
      callId:operation.native.callId,onceAcknowledged:operation.native.onceAcknowledged,targetDigest:operation.native.targetDigest,
      timeoutQuarantine:access.timeoutQuarantine??null};
    return {runId,contextId:run.contextId,accessId:access.accessId,operationId,version:run.version,
      fencing:access.fencing,state:access.state,resources:copy(access.resources),expectedRevisions:copy(access.expectedRevisions),
      operation:{operationId,state:operation.state,decisionStatus:operation.decision.status,
        onceAcknowledged:operation.native.onceAcknowledged,kind:operation.native.kind||'bash'},
      timeoutQuarantineRequired:!alreadyQuarantined,
      ...(alreadyQuarantined?{timeoutQuarantine:{quarantineId:access.timeoutQuarantine.quarantineId,
        proofDigest:access.timeoutQuarantine.proofDigest}}:{}),
      boundaryDigest:digest(boundary),snapshot_only:true};
  }
  quarantineTimedOutPortAccess(runId,payload,proof){
    this.mutable();evidence(payload?.evidence);
    if(!onlyKeys(payload,['version','operationId','fencing','quarantineId','boundaryDigest','evidence'])||
        !id(payload.operationId)||!id(payload.quarantineId)||!hash(payload.boundaryDigest)||
        !Number.isSafeInteger(payload.version)||!Number.isSafeInteger(payload.fencing))
      throw new CoordinationError('timeout-quarantine-request-invalid',400);
    const access=this.resourceState.accesses[payload.operationId],prior=access?.timeoutQuarantine;
    const inputDigest=digest(payload);
    if(prior){
      if(access.runId!==runId||prior.quarantineId!==payload.quarantineId||prior.inputDigest!==inputDigest)
        throw new CoordinationError('timeout-quarantine-divergent');
      return copy(access);
    }
    const snapshot=this.timeoutQuarantineSnapshot(runId,payload.operationId),run=this.runs.get(runId);
    const operation=this.resourceState.operations[payload.operationId];
    if(snapshot.version!==payload.version||snapshot.fencing!==payload.fencing||snapshot.boundaryDigest!==payload.boundaryDigest)
      throw new CoordinationError('timeout-quarantine-boundary-changed');
    if(this.blockers(access).length)throw new CoordinationError('timeout-quarantine-conflict');
    if(this.resourceState.global&&this.resourceState.global.state!=='RELEASED')
      throw new CoordinationError('global-coordination-suspended');
    if(run.suspension||run.phase!=='WORK')throw new CoordinationError('timeout-quarantine-run-not-quiescent');
    this.validateExpected(access.expectedRevisions,access.resources);
    const proofBody={runId,contextId:run.contextId,accessId:access.accessId,operationId:operation.operationId,
      version:run.version,fencing:access.fencing,boundaryDigest:snapshot.boundaryDigest,sessionId:run.sessionId,
      operationDigest:operation.operationDigest,identityDigest:operation.identityDigest,
      permissionId:operation.native.permissionId,callId:operation.native.callId,
      timeoutPartDigest:proof?.timeoutPartDigest,transcriptDigest:proof?.transcriptDigest,
      shellInventoryDigest:proof?.shellInventoryDigest,sessionIdle:true,pendingPermissions:0,observedAt:proof?.observedAt};
    if(!proof||proof.runId!==runId||proof.contextId!==run.contextId||proof.accessId!==access.accessId||
        proof.operationId!==operation.operationId||proof.version!==run.version||proof.fencing!==access.fencing||
        proof.boundaryDigest!==snapshot.boundaryDigest||proof.sessionId!==run.sessionId||
        proof.operationDigest!==operation.operationDigest||proof.identityDigest!==operation.identityDigest||
        proof.permissionId!==operation.native.permissionId||proof.callId!==operation.native.callId||
        proof.sessionIdle!==true||proof.pendingPermissions!==0||!hash(proof.timeoutPartDigest)||
        !hash(proof.transcriptDigest)||!hash(proof.shellInventoryDigest)||proof.proofDigest!==digest(proofBody))
      throw new CoordinationError('timeout-quarantine-proof-required');
    access.timeoutQuarantine={quarantineId:payload.quarantineId,operationId:operation.operationId,
      inputDigest,proofDigest:proof.proofDigest,fencing:++this.resourceState.sequence,observedAt:now()};
    access.state='HELD';access.fencing=this.resourceState.sequence;access.token=randomUUID();access.grantedAt=now();
    this.restoredAccesses.delete(access.accessId);this.persist();return copy(access);
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
  manifestDigest(runId) {
    const run = this.runs.get(runId);
    if (!run) throw new CoordinationError('run-not-reserved');
    return digest(run.resources);
  }
  compatibleExtension(runId, payload, apply = false) {
    this.admission(runId);
    const run = this.owned(runId, payload.version);
    if (run.phase !== 'WORK' || payload.ownerId !== run.ownerId ||
        typeof payload.authorization !== 'string' || !payload.authorization.trim() || payload.authorization.length > 500 ||
        !hash(payload.expectedManifestDigest) || payload.expectedManifestDigest !== this.manifestDigest(runId))
      throw new CoordinationError('compatible-extension-boundary-invalid');
    if (this.integrationOwner && this.integrationOwner !== runId ||
        !this.integrationOwner && this.integrationQueue.length && run.integrationReady)
      throw new CoordinationError('integration-suspended');
    evidence(payload.evidence);
    const additions = this.resources(payload.resources);
    const namespace = key => key.startsWith('file:') ? 'file:' + key.slice(5).split('/').slice(0,-1).join('/')
      : key.includes('/') ? key.slice(0,key.lastIndexOf('/')) : key;
    const atelier = `file:.cab-tests/${run.changeId}/${run.runId}`;
    const ownAtelierRead = resource => resource.mode === 'read' &&
      (resource.key === atelier || resource.key.startsWith(`${atelier}/`));
    if (additions.some(resource => !ownAtelierRead(resource) && !run.resources.some(existing => namespace(existing.key) === namespace(resource.key) &&
        (existing.mode === 'write' || resource.mode === 'read'))))
      throw new CoordinationError('compatible-extension-outside-namespace');
    if (additions.some(resource => run.resources.some(existing => covers(existing, resource) || overlaps(existing.key, resource.key))))
      throw new CoordinationError('compatible-extension-not-additive');
    const protectedResources = [
      ...Object.values(this.resourceState.accesses).filter(access => active(access) || access.state === 'WAITING' || access.state === 'STALE'),
      ...Object.values(this.resourceState.testReservations || {}).filter(reservedTest),
      ...Object.values(this.resourceState.operations).filter(op => ['ISSUING','EXECUTING','UNKNOWN'].includes(op.state)),
    ].flatMap(item => item.resources);
    if (additions.some(resource => protectedResources.some(existing => overlaps(existing.key, resource.key))))
      throw new CoordinationError('compatible-extension-overlap');
    const resources = this.validate({ ...run, resources: [...run.resources, ...additions] }).resources;
    this.checkConflicts({ ...run, resources });
    const result = { beforeDigest: this.manifestDigest(runId), afterDigest: digest(resources), resources, additions };
    if (apply) {
      run.resources = resources; run.requiresPublication ||= additions.some(resource => resource.mode === 'write');
      run.integrationReady = false;
      // An additive manifest CAS does not invalidate already issued effects or lease tokens.
      this.persist();
    }
    return copy(result);
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
    const reportResources=reportFile ? this.reportResources(run,reportFile) : undefined;
    if (reportResources) this.checkConflicts({...run,resources:reportResources});
    this.finishAccess(access, payload.outcome);
    this.referenceVersion++;
    run.referenceVersion = this.referenceVersion; run.publishedReferenceVersion = this.referenceVersion;
    run.integrationCompleted = true; run.integrationReady = false;
    run.pendingWrites = {};
    if (reportFile) {
      run.phase = 'REPORT'; run.reportFile = reportFile;
      run.resources = reportResources; run.exclusiveResources = reportResources.map(r=>r.key);
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
  sessionHandoffs(runId) {
    const run = this.runs.get(runId);
    return copy(Object.values(this.resourceState.sessionHandoffs || {}).filter(h =>
      h.runId === runId && h.contextId === run?.contextId));
  }
  sessionHandoffInventory(runId) {
    const run = this.runs.get(runId);
    const scoped = entries => Object.values(entries || {}).filter(e => e.runId === runId && e.contextId === run?.contextId);
    return digest({run, operations:scoped(this.resourceState.operations), accesses:scoped(this.resourceState.accesses),
      tests:scoped(this.resourceState.testReservations)});
  }
  prepareSessionHandoff(runId, payload) {
    this.admission(runId);
    const run = this.owned(runId, payload.version);
    if (!onlyKeys(payload,['handoffId','ownerId','version','jobId','expectedSessionId','sessionId','checkpointDigest','boundaryDigest','reason','evidence']) ||
        !id(payload.handoffId) || !id(payload.jobId) || payload.ownerId !== run.ownerId ||
        payload.expectedSessionId !== run.sessionId || !/^ses_[A-Za-z0-9_-]+$/.test(payload.sessionId || '') ||
        payload.sessionId === run.sessionId || !hash(payload.checkpointDigest) || !hash(payload.boundaryDigest) ||
        typeof payload.reason !== 'string' || !payload.reason.length || payload.reason.length > 500) {
      throw new CoordinationError('session-handoff-contract-invalid',400);
    }
    evidence(payload.evidence);
    const prior = this.resourceState.sessionHandoffs?.[payload.handoffId];
    if (prior) {
      if (prior.runId !== runId || prior.contextId !== run.contextId || prior.inputDigest !== digest(payload))
        throw new CoordinationError('session-handoff-replay-divergent');
      return copy(prior);
    }
    if (this.sessionHandoffs(runId).some(h => !['DONE','ABORTED'].includes(h.state))) throw new CoordinationError('session-handoff-pending');
    if ([...this.runs.values(), ...this.history].some(r => r.sessionId === payload.sessionId) ||
        Object.values(this.resourceState.operations).some(o => o.sessionId === payload.sessionId) ||
        Object.values(this.resourceState.sessionHandoffs || {}).some(h =>
          [h.sessionId,h.sourceSessionId].includes(payload.sessionId))) throw new CoordinationError('session-handoff-session-reused');
    for (const op of Object.values(this.resourceState.operations).filter(o => o.runId === runId && o.contextId === run.contextId)) {
      if (op.native && !op.native.onceAcknowledged || ['ISSUING','UNKNOWN'].includes(op.state) && !op.native?.onceAcknowledged)
        throw new CoordinationError('session-handoff-native-intent-unresolved');
      if (op.native?.onceAcknowledged && !['COMPLETED','CANCELLED'].includes(op.state) &&
          !Object.values(this.resourceState.accesses).some(a => active(a) && a.operationIds.includes(op.operationId)))
        throw new CoordinationError('session-handoff-effect-unprotected');
    }
    const receipt = {handoffId:payload.handoffId,runId,contextId:run.contextId,version:run.version,jobId:payload.jobId,
      sourceSessionId:run.sessionId,sessionId:payload.sessionId,inputDigest:digest(payload),checkpointDigest:payload.checkpointDigest,
      boundaryDigest:payload.boundaryDigest,inventoryDigest:this.sessionHandoffInventory(runId),reason:payload.reason,
      evidenceDigest:digest(payload.evidence),state:'PREPARED',preparedAt:now()};
    (this.resourceState.sessionHandoffs ||= {})[receipt.handoffId] = receipt;
    this.persist(); return copy(receipt);
  }
  sessionHandoffReplay(runId, payload) {
    const receipt = this.resourceState.sessionHandoffs?.[payload.handoffId];
    if (!receipt) return null;
    const run = this.runs.get(runId);
    if (receipt.runId !== runId || receipt.contextId !== run?.contextId || receipt.inputDigest !== digest(payload))
      throw new CoordinationError('session-handoff-replay-divergent');
    return copy(receipt);
  }
  commitSessionHandoff(runId, handoffId) {
    this.admission(runId);
    const receipt = this.resourceState.sessionHandoffs?.[handoffId];
    const run = this.runs.get(runId);
    if (!receipt || receipt.runId !== runId || receipt.contextId !== run?.contextId) throw new CoordinationError('session-handoff-not-prepared');
    if (receipt.state !== 'PREPARED') return copy(receipt);
    if (run.sessionId !== receipt.sourceSessionId || this.sessionHandoffInventory(runId) !== receipt.inventoryDigest)
      throw new CoordinationError('session-handoff-inventory-divergent');
    // One registry write commits pilot identity and receipt. Historical identities and fences do not move.
    run.sessionId = receipt.sessionId;
    receipt.state = 'COMMITTED'; receipt.committedAt = now();
    this.persist(); return copy(receipt);
  }
  completeSessionHandoff(runId, handoffId) {
    this.mutable();
    const receipt = this.resourceState.sessionHandoffs?.[handoffId];
    const run = this.runs.get(runId);
    if (!receipt || receipt.runId !== runId || receipt.contextId !== run?.contextId || !['COMMITTED','DONE'].includes(receipt.state) ||
        run.sessionId !== receipt.sessionId) throw new CoordinationError('session-handoff-not-committed');
    if (receipt.state !== 'DONE') { receipt.state = 'DONE'; receipt.completedAt = now(); this.persist(); }
    return copy(receipt);
  }
  abortSessionHandoff(runId, payload) {
    this.mutable(); evidence(payload.evidence);
    const run = this.owned(runId,payload.version), receipt = this.resourceState.sessionHandoffs?.[payload.handoffId];
    if (!onlyKeys(payload,['handoffId','ownerId','version','evidence']) || payload.ownerId !== run.ownerId ||
        !receipt || receipt.runId !== runId || receipt.contextId !== run.contextId ||
        !['PREPARED','ABORTED'].includes(receipt.state) || run.sessionId !== receipt.sourceSessionId)
      throw new CoordinationError('session-handoff-abort-forbidden');
    if (receipt.state === 'ABORTED') {
      if (receipt.abortDigest !== digest(payload)) throw new CoordinationError('session-handoff-replay-divergent');
    } else { receipt.state = 'ABORTED'; receipt.abortedAt = now(); receipt.abortDigest = digest(payload); this.persist(); }
    return copy(receipt);
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
