import { ContinuityStore, canonicalContinuityDigest } from './cgpt-approval-bridge-continuity.mjs';
import { validatePortReview } from './cgpt-approval-bridge-port-recovery.mjs';
import { validateReviewStructure, validateTerminalReview } from './cgpt-approval-bridge-recovery-evidence.mjs';

export const VERSION = '2.2.17';
export const RECOVERY_PROTOCOL = 'cab-recovery-v1';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(value);
const fail = (code, status = 409) => { throw Object.assign(new Error(code), { code, status }); };
const validationBoundaryActions = new Set(['restore-pending-validation','reconcile-reviewed-terminal','withdraw-unissued-validation']);
const actions = {
  'withdraw-unissued-validation': '/validation/withdraw-unissued',
  'restore-pending-validation': '/validation/restore-pending',
  'reconcile-reviewed-terminal': '/validation/reconcile-reviewed-terminal',
  'reconcile-quarantined-port': '/locks/reconcile-quiescent-port',
  'cancel-reviewed-validation': '/validation/cancel-reviewed',
  'reconcile-test': '/test-resources/reconcile-restored',
  'reconcile-access': '/locks/reconcile-restored',
  'quarantine-port': '/locks/quarantine-timeout',
  'release-test': '/test-resources/release',
  'cancel-waiting-test': '/test-resources/cancel',
  'cancel-waiting-access': '/locks/cancel',
};
const active = value => ['HELD', 'EXECUTING', 'UNKNOWN', 'WAITING', 'STALE'].includes(value.state);
const covered = (scope, resource) => (scope.mode === 'write' || resource.mode === 'read') &&
  (scope.key === resource.key || scope.key === 'project:*' ||
    scope.key.startsWith('file:') && resource.key.startsWith(scope.key + '/'));

export function projectRecoveryReceipt(value) {
  if (!record(value)) return { snapshot_only: true };
  const result = {};
  if (['HELD', 'WAITING', 'EXECUTING', 'UNKNOWN', 'STALE', 'RELEASED', 'CANCELLED', 'PENDING', 'COMPLETED'].includes(value.state)) result.state = value.state;
  for (const key of ['runId', 'transactionId', 'operationId', 'accessId']) if (id(value[key])) result[key] = value[key];
  for (const key of ['contextId', 'version', 'fencing']) if (Number.isSafeInteger(value[key]) && value[key] >= 0) result[key] = value[key];
  for (const key of ['proofDigest', 'releaseDigest']) if (/^[a-f0-9]{64}$/.test(value[key] || '')) result[key] = value[key];
  if (typeof value.finishedAt === 'string' && Number.isFinite(Date.parse(value.finishedAt))) result.finishedAt = value.finishedAt;
  if (value.error) result.error = /^[a-z][a-z0-9-]{0,99}$/.test(value.error) ? value.error : 'recovery-action-failed';
  if (['CANCELLED','COMPLETED','PREPARED'].includes(value.operationState)) result.operationState = value.operationState;
  if (value.executionOutcome === 'HISTORICAL_OUTCOME_UNOBSERVED_RESOURCE_QUIESCENT') result.executionOutcome = value.executionOutcome;
  if (value.evidenceAuthority === 'VERIFIED_NATIVE_PORT_PROBES') result.evidenceAuthority = value.evidenceAuthority;
  if (value.executionOutcome === 'COORDINATION_WITHDRAWN_BEFORE_ISSUANCE') result.executionOutcome=value.executionOutcome;
  if (value.evidenceAuthority === 'OWNER_NATIVE_BOUNDARY_REVIEW') result.evidenceAuthority=value.evidenceAuthority;
  if (value.executionOutcome === 'NATIVE_TERMINAL_OBSERVED_PERMISSION_UNVERIFIED') result.executionOutcome = value.executionOutcome;
  if (value.executionOutcome === 'UNDETERMINED_READ_ONLY') result.executionOutcome = value.executionOutcome;
  if (value.evidenceAuthority === 'ORCHESTRATOR_AUDIT_REVIEW') result.evidenceAuthority = value.evidenceAuthority;
  if (record(value.timeoutQuarantine)) result.quarantined = true;
  return result;
}
function publicActionResult(value) {
  const result = projectRecoveryReceipt(value);
  for (const key of ['recoveryActionId', 'policyId']) if (id(value?.[key])) result[key] = value[key];
  if (['qualified-receipt', 'authoritative-state-without-causal-attribution'].includes(value?.recoveredFrom)) result.recoveredFrom = value.recoveredFrom;
  if (value?.nextAction === 'inspect-current-authoritative-state') result.nextAction = value.nextAction;
  return result;
}

export class RecoveryCoordinator {
  constructor(registry, path) {
    this.registry = registry; this.error = null;
    try {
      this.store = new ContinuityStore(path, 'recovery-policies', value => value?.workspace === registry.directory && Array.isArray(value.policies) &&
        value.policies.length <= 1000 && value.policies.every(policy => id(policy.policyId) && id(policy.runId) &&
          id(policy.ownerId) && Number.isSafeInteger(policy.contextId) && Number.isSafeInteger(policy.version) &&
          typeof policy.authorization === 'string' && policy.authorization.length > 0 && policy.authorization.length <= 500 &&
          Array.isArray(policy.actions) && policy.actions.every(action => Object.hasOwn(actions, action)) &&
          Array.isArray(policy.resources) && policy.resources.every(resource => typeof resource.key === 'string' &&
            ['read', 'write'].includes(resource.mode)) && /^[a-f0-9]{64}$/.test(policy.inputDigest || '')) &&
        (value.receipts === undefined || Array.isArray(value.receipts) && value.receipts.length <= 5000 &&
          value.receipts.every(receipt => id(receipt.actionId) && id(receipt.runId) && id(receipt.ownerId) &&
            id(receipt.policyId) && id(receipt.targetId) && Number.isSafeInteger(receipt.contextId) &&
            ['PREPARED', 'DONE'].includes(receipt.state) && Object.hasOwn(actions, receipt.action) &&
            /^[a-f0-9]{64}$/.test(receipt.inputDigest || '') && /^[a-f0-9]{64}$/.test(receipt.effectDigest || '') &&
            (receipt.state !== 'DONE' || Number.isSafeInteger(receipt.httpStatus) &&
              receipt.httpStatus >= 100 && receipt.httpStatus <= 599 && record(receipt.result)))));
      this.policies = this.store.snapshot()?.policies || [];
      this.receipts = this.store.snapshot()?.receipts || [];
      this.registry.reviewedReadOnlyOperations ||= new Set();
      this.registry.withdrawnUnissuedOperations ||= new Set();
      for(const receipt of this.receipts)if(receipt.action==='withdraw-unissued-validation') {
        const op=registry.resourceState.operations[receipt.entityId];
        if(op?.state==='CANCELLED'&&op.completionDigest===receipt.effectDigest&&!op.native)
          this.registry.withdrawnUnissuedOperations.add(op.operationId);
      }
      for (const receipt of this.receipts) if (receipt.action === 'cancel-reviewed-validation') {
        const op = registry.resourceState.operations[receipt.entityId];
        if (op?.state === 'CANCELLED' && op.completionDigest === receipt.effectDigest)
          this.registry.reviewedReadOnlyOperations.add(op.operationId);
      }
    } catch { this.error = 'recovery-policy-unavailable'; this.policies = []; this.receipts = []; }
  }
  persist(policies, receipts) {
    if (this.error) fail(this.error, 503);
    try { this.store.write({ workspace: this.registry.directory, policies, receipts }); }
    catch (cause) { this.error = 'recovery-policy-unavailable'; throw cause; }
    this.policies = policies; this.receipts = receipts;
  }
  run(runId) {
    const run = this.registry.runs.get(runId);
    if (!run || run.state !== 'RESERVED') fail('recovery-run-not-reserved', 404);
    return run;
  }
  policy(run) {
    return this.policies.findLast(policy => policy.runId === run.runId && policy.ownerId === run.ownerId &&
      policy.contextId === run.contextId && policy.version === run.version);
  }
  grant(runId, input) {
    const run = this.run(runId);
    if (!record(input) || Object.keys(input).some(key =>
        !['policyId', 'ownerId', 'version', 'actions', 'resources', 'authorization'].includes(key)) ||
        input.ownerId !== run.ownerId || input.version !== run.version || !id(input.policyId) ||
        !Array.isArray(input.actions) || !input.actions.length || new Set(input.actions).size !== input.actions.length ||
        input.actions.some(action => !Object.hasOwn(actions, action)) || !Array.isArray(input.resources) ||
        typeof input.authorization !== 'string' || !input.authorization.trim() || input.authorization.length > 500) {
      fail('recovery-policy-invalid', 400);
    }
    if (this.error) fail(this.error, 503);
    const resources = this.registry.scope(runId, run.version, input.resources).resources;
    const inputDigest = canonicalContinuityDigest({ workspace: this.registry.directory, changeId: run.changeId, input });
    const previous = this.policies.find(policy => policy.policyId === input.policyId);
    if (previous) {
      if (previous.inputDigest !== inputDigest || previous.runId !== runId) fail('recovery-policy-id-reused');
      return { protocol: RECOVERY_PROTOCOL, policyId: previous.policyId, inputDigest, unchanged: true };
    }
    const policy = { policyId: input.policyId, runId, ownerId: run.ownerId, contextId: run.contextId,
      version: run.version, actions: [...input.actions], resources, authorization: input.authorization, inputDigest };
    const policies = [...this.policies, policy];
    this.persist(policies, this.receipts);
    return { protocol: RECOVERY_PROTOCOL, policyId: policy.policyId, inputDigest, unchanged: false };
  }
  boundary(run) {
    const state = this.registry.resourceState;
    const own = item => item.runId === run.runId && item.contextId === run.contextId;
    return { runId: run.runId, ownerId: run.ownerId, contextId: run.contextId, version: run.version,
      suspension: run.suspension || null, phase: run.phase, global: state.global,
      operations: Object.values(state.operations).filter(own),
      accesses: Object.values(state.accesses).filter(own),
      tests: Object.values(state.testReservations || {}).filter(own),
      revisions: this.registry.revisions(run.resources), policy: this.policy(run)?.inputDigest || null };
  }
  plan(runId) {
    const run = this.run(runId), boundary = this.boundary(run), policy = this.policy(run);
    const offers = [];
    const offer = (action, targetId, resources, preview = null) => offers.push({ action, targetId, preview,
      authority: policy?.actions.includes(action) && resources.every(resource =>
        policy.resources.some(scope => covered(scope, resource))) ? 'orchestrator' : 'orchestrator-policy-required',
      requiredProof: ['reconcile-test', 'reconcile-access', 'quarantine-port'].includes(action)
        ? 'native-boundary-and-revisions' : 'qualified-route-guards' });
    for (const access of boundary.accesses.filter(active).slice(-200)) {
      if (['WAITING', 'STALE'].includes(access.state)) offer('cancel-waiting-access', access.accessId, access.resources);
      const ops = access.operationIds.map(operationId => this.registry.resourceState.operations[operationId]);
      if (this.registry.restoredAccesses.has(access.accessId) && access.state === 'HELD' &&
          ops.length && ops.every(op => op && (['COMPLETED', 'CANCELLED'].includes(op.state) || op.state === 'PREPARED' && !op.native))) {
        offer('reconcile-access', access.accessId, access.resources,
          '/locks/reconcile-preview?operationId=' + encodeURIComponent(access.accessId));
      }
      for (const op of ops.filter(op => op && ['EXECUTING', 'UNKNOWN'].includes(op.state))) {
        if (!access.timeoutQuarantine && access.resources.every(resource => resource.mode === 'write' && resource.key.startsWith('port:'))) {
          offer('quarantine-port', op.operationId, access.resources,
            '/locks/timeout-quarantine-preview?operationId=' + encodeURIComponent(op.operationId));
        }
        if (access.timeoutQuarantine?.operationId === op.operationId && op.native?.onceAcknowledged === true &&
            access.operationIds.length === 1 && op.resources.length === 1 && op.resources[0].key.startsWith('port:')) {
          offer('reconcile-quarantined-port', op.operationId, op.resources,
            '/recovery/native-evidence?operationId=' + encodeURIComponent(op.operationId));
        }
      }
    }
    for (const lease of boundary.tests.filter(active).slice(-200)) {
      if (lease.state === 'WAITING') offer('cancel-waiting-test', lease.transactionId, lease.resources);
      else if (this.registry.restoredTests.has(lease.transactionId)) offer('reconcile-test', lease.transactionId, lease.resources,
        '/test-resources/reconcile-preview?transactionId=' + encodeURIComponent(lease.transactionId));
      else offer('release-test', lease.transactionId, lease.resources);
    }
    for (const op of boundary.operations) if (op.state === 'PREPARED' && op.decision?.status === 'approved' && !op.native &&
      !boundary.accesses.some(access => access.accessId === op.accessId || access.operationIds.includes(op.operationId)))
      offer('cancel-reviewed-validation', op.operationId, op.resources,
        '/recovery/native-evidence?operationId=' + encodeURIComponent(op.operationId));
    for (const op of boundary.operations) if (op.state === 'PREPARED' && !op.native &&
      !boundary.accesses.some(a=>a.accessId===op.accessId||a.operationIds.includes(op.operationId))) {
      if (!op.decision) offer('restore-pending-validation',op.operationId,op.resources,
        '/recovery/native-evidence?operationId='+encodeURIComponent(op.operationId));
      if (op.decision?.status==='approved') {
        offer('reconcile-reviewed-terminal',op.operationId,op.resources,'/recovery/native-evidence?operationId='+encodeURIComponent(op.operationId));
        offer('withdraw-unissued-validation',op.operationId,op.resources,'/recovery/native-evidence?operationId='+encodeURIComponent(op.operationId));
      }
    }
    const unresolved = boundary.operations.filter(op => !['COMPLETED', 'CANCELLED'].includes(op.state));
    return { protocol: RECOVERY_PROTOCOL, runId, contextId: run.contextId, version: run.version,
      snapshot_only: true, nativeObservation: 'unverified', policyId: policy?.policyId || null,
      decisionOwner: 'orchestrator', humanDecisionRequired: false, policySetupRequired: !policy,
      manifestDigest: this.registry.manifestDigest(runId),
      compatibleExtension: { path: '/extend-compatible', authorization: 'same-approved-change-owner-review', constraints: 'existing-resource-namespace-and-rights', preservesExistingProtections: true },
      policyError: this.error, boundaryDigest: canonicalContinuityDigest(boundary),
      totalUnresolved: unresolved.length, truncated: boundary.accesses.length > 200 || boundary.tests.length > 200 || unresolved.length > 200,
      operations: unresolved.slice(-200).map(op => ({ operationId: op.operationId, state: op.state,
        nextAction: op.state === 'PREPARED' ? 'review-existing-validation' : 'observe-correlated-native-effect',
        diagnostic: '/recovery/native-evidence?operationId=' + encodeURIComponent(op.operationId) })),
      actions: offers, continuation: 'continue-only-proved-compatible-work',
      outsidePolicy: 'orchestrator-reviews-delegation-within-change;developer-only-for-out-of-scope-decision' };
  }
  authorize(runId, input) {
    const run = this.run(runId);
    if (!record(input) || Object.keys(input).some(key =>
        !['actionId', 'ownerId', 'policyId', 'boundaryDigest', 'action', 'targetId', 'input'].includes(key)) ||
        !id(input.actionId) || input.ownerId !== run.ownerId) fail('recovery-owner-or-policy-divergent', 403);
    const inputDigest = canonicalContinuityDigest(input);
    const previous = this.receipts.find(receipt => receipt.actionId === input.actionId);
    if (previous) {
      if (previous.runId !== runId || previous.ownerId !== run.ownerId || previous.contextId !== run.contextId ||
          previous.inputDigest !== inputDigest) fail('recovery-action-id-reused');
      const replay=this.replay(previous);
      if(previous.state==='PREPARED' && validationBoundaryActions.has(previous.action) && replay.status===409) {
        if(!previous.requestBody || !this.policy(run)?.actions.includes(previous.action)) fail('recovery-action-not-authorized',403);
        return {path:actions[previous.action],payload:structuredClone(previous.requestBody),policyId:previous.policyId,actionId:previous.actionId};
      }
      return replay;
    }
    const plan = this.plan(runId), policy = this.policy(run);
    if (!policy || input.policyId !== policy.policyId) fail('recovery-owner-or-policy-divergent', 403);
    if (input.boundaryDigest !== plan.boundaryDigest) fail('recovery-boundary-stale');
    const offered = plan.actions.find(action => action.action === input.action && action.targetId === input.targetId &&
      action.authority === 'orchestrator');
    if (!offered || !record(input.input)) fail('recovery-action-not-authorized', 403);
    const body = { ...input.input };
    const boundaryAction = validationBoundaryActions.has(input.action);
    const terminalAction = input.action === 'reconcile-reviewed-terminal';
    const reviewAction = input.action === 'cancel-reviewed-validation', portAction = input.action === 'reconcile-quarantined-port';
    if (terminalAction) validateTerminalReview(body.review,run.ownerId);
    if (portAction) validatePortReview(body.review, run.ownerId);
    if (reviewAction) validateReviewStructure(body.review, run.ownerId);
    if ((reviewAction || portAction || boundaryAction) && !/^[a-f0-9]{64}$/.test(body.nativeBoundaryDigest || '')) fail('recovery-input-divergent');
    if (portAction && (!Array.isArray(body.probeOperationIds) || body.probeOperationIds.length !== 2 ||
        body.probeOperationIds[0] === body.probeOperationIds[1] || body.probeOperationIds.some(value => !id(value)))) fail('recovery-input-divergent');
    if (Object.keys(body).some(key => !['version', 'fencing', 'transactionId', 'operationId', 'evidence',
      'cleanup', 'reconciliationId', 'quarantineId', 'boundaryDigest', ...(reviewAction || portAction || boundaryAction ? ['review','nativeBoundaryDigest'] : []), ...(portAction ? ['probeOperationIds'] : [])].includes(key))) fail('recovery-input-divergent');
    if (Object.hasOwn(body, 'token') || body.version !== undefined && body.version !== run.version) fail('recovery-input-divergent');
    body.version = run.version;
    const leaseAction = ['reconcile-test', 'release-test', 'cancel-waiting-test'].includes(input.action);
    const entity = reviewAction || portAction || boundaryAction ? this.registry.resourceState.operations[input.targetId] : leaseAction ? this.registry.resourceState.testReservations[input.targetId] :
      this.registry.resourceState.accesses[input.action === 'quarantine-port'
        ? this.registry.resourceState.operations[input.targetId]?.accessId : input.targetId];
    if (!entity || entity.runId !== runId || entity.contextId !== run.contextId) fail('recovery-target-divergent');
    const identityKey = leaseAction ? 'transactionId' : 'operationId';
    if (body[identityKey] !== undefined && body[identityKey] !== input.targetId ||
        body.fencing !== undefined && body.fencing !== entity.fencing) fail('recovery-input-divergent');
    body[identityKey] = input.targetId;
    if (entity.fencing !== undefined) body.fencing = entity.fencing;
    if (['release-test', 'cancel-waiting-test', 'cancel-waiting-access'].includes(input.action) && entity.token) body.token = entity.token;
    const receipt = { actionId: input.actionId, runId, contextId: run.contextId, ownerId: run.ownerId,
      policyId: policy.policyId, action: input.action, targetId: input.targetId,
      entityId: reviewAction || portAction || boundaryAction ? entity.operationId : leaseAction ? entity.transactionId : entity.accessId,
      ...(reviewAction || portAction ? { review: structuredClone(body.review), nativeBoundaryDigest: body.nativeBoundaryDigest } : {}),
      receiptId: body.reconciliationId || body.quarantineId || null,
      ...(boundaryAction ? {requestBody:structuredClone(body)} : {}),
      state: 'PREPARED', inputDigest, effectDigest: canonicalContinuityDigest(body) };
    this.persist(this.policies, [...this.receipts, receipt]);
    return { path: actions[input.action], payload: body, policyId: policy.policyId, actionId: input.actionId };
  }
  complete(actionId, httpStatus, value, recoveredFrom = null) {
    const previous = this.receipts.find(receipt => receipt.actionId === actionId);
    if (!previous) fail('recovery-receipt-unknown');
    if (previous.state === 'DONE') return publicActionResult(previous.result);
    const result = { ...projectRecoveryReceipt(value), ...(validationBoundaryActions.has(previous.action) && httpStatus===200
      ? {state:previous.action==='restore-pending-validation'?'PENDING':previous.action==='withdraw-unissued-validation'?'CANCELLED':'COMPLETED',operationState:previous.action==='restore-pending-validation'?'PREPARED':previous.action==='withdraw-unissued-validation'?'CANCELLED':'COMPLETED',operationId:previous.targetId,proofDigest:previous.effectDigest,
        ...(previous.action==='withdraw-unissued-validation'?{executionOutcome:'COORDINATION_WITHDRAWN_BEFORE_ISSUANCE',evidenceAuthority:'OWNER_NATIVE_BOUNDARY_REVIEW'}:{}),
        ...(previous.action==='reconcile-reviewed-terminal'?{executionOutcome:'NATIVE_TERMINAL_OBSERVED_PERMISSION_UNVERIFIED',evidenceAuthority:'ORCHESTRATOR_AUDIT_REVIEW'}:{})}:{}), ...(previous.action === 'reconcile-quarantined-port' && httpStatus === 200
      ? { state: 'RELEASED', operationState: 'CANCELLED', operationId: previous.targetId, proofDigest: previous.effectDigest } : {}), ...(previous.action === 'reconcile-quarantined-port' && httpStatus === 200
      ? { executionOutcome: 'HISTORICAL_OUTCOME_UNOBSERVED_RESOURCE_QUIESCENT', evidenceAuthority: 'VERIFIED_NATIVE_PORT_PROBES' } : {}), ...(previous.action === 'cancel-reviewed-validation' && httpStatus === 200
      ? { executionOutcome: 'UNDETERMINED_READ_ONLY', evidenceAuthority: 'ORCHESTRATOR_AUDIT_REVIEW' } : {}), recoveryActionId: actionId, policyId: previous.policyId,
      ...(recoveredFrom ? { recoveredFrom } : {}) };
    this.persist(this.policies, this.receipts.map(receipt => receipt === previous
      ? { ...receipt, state: 'DONE', httpStatus, result } : receipt));
    return result;
  }
  replay(receipt) {
    if (receipt.state === 'DONE') return { replay: true, status: receipt.httpStatus, result: publicActionResult(receipt.result) };
    const lease = this.registry.resourceState.testReservations?.[receipt.entityId];
    const access = this.registry.resourceState.accesses[receipt.entityId];
    const entity = ['cancel-reviewed-validation','reconcile-quarantined-port',...validationBoundaryActions].includes(receipt.action) ? this.registry.resourceState.operations[receipt.entityId] :
      ['reconcile-test', 'release-test', 'cancel-waiting-test'].includes(receipt.action) ? lease : access;
    let proof = false, recoveredFrom = 'qualified-receipt';
    if (entity?.runId === receipt.runId && entity.contextId === receipt.contextId) {
      if (validationBoundaryActions.has(receipt.action)) proof=this.validationBoundaryReplay?.(receipt,entity)===true;
      else if (receipt.action === 'reconcile-quarantined-port') proof = entity.state === 'CANCELLED' &&
        entity.native?.onceAcknowledged === true && entity.completionDigest === receipt.effectDigest &&
        this.registry.resourceState.accesses[entity.accessId]?.state === 'RELEASED' &&
        this.registry.resourceState.accesses[entity.accessId].outcome === 'RECONCILED' && !!receipt.observation;
      else if (receipt.action === 'cancel-reviewed-validation') proof = entity.state === 'CANCELLED' &&
        entity.completionDigest === receipt.effectDigest && !entity.native && entity.decision?.status === 'approved';
      else if (receipt.action === 'release-test') proof = entity.state === 'RELEASED' && entity.releaseDigest === receipt.effectDigest;
      else if (receipt.action.startsWith('reconcile-')) proof = entity.reconciliationReceipts?.[receipt.receiptId]?.inputDigest === receipt.effectDigest;
      else if (receipt.action === 'quarantine-port') proof = entity.timeoutQuarantine?.quarantineId === receipt.receiptId &&
        entity.timeoutQuarantine.inputDigest === receipt.effectDigest;
      else if (entity.state === 'CANCELLED') { proof = true; recoveredFrom = 'authoritative-state-without-causal-attribution'; }
    }
    if (!proof) return { replay: true, status: 409, result: { error: 'recovery-action-outcome-unverified',
      recoveryActionId: receipt.actionId, nextAction: 'inspect-current-authoritative-state' } };
    return { replay: true, status: 200, result: this.complete(receipt.actionId, 200, entity, recoveredFrom) };
  }
  observeAction(actionId, observation) {
    const previous = this.receipts.find(receipt => receipt.actionId === actionId);
    if (!previous || !['reconcile-quarantined-port',...validationBoundaryActions].includes(previous.action) || previous.state !== 'PREPARED') fail('recovery-receipt-unknown');
    this.persist(this.policies, this.receipts.map(receipt => receipt === previous ? { ...receipt, observation } : receipt));
  }
  closedValidationReviews(runId) {
    const run=this.run(runId),result=[];
    for(const receipt of this.receipts) {
      const op=this.registry.resourceState.operations[receipt.entityId];
      if(receipt.action!=='cancel-reviewed-validation'||receipt.state!=='DONE'||receipt.httpStatus!==200||
        receipt.ownerId!==run.ownerId||receipt.runId!==runId||receipt.contextId!==run.contextId||
        receipt.result?.executionOutcome!=='UNDETERMINED_READ_ONLY'||
        op?.state!=='CANCELLED'||op.runId!==runId||op.contextId!==run.contextId||op.version!==run.version||
        op.native||op.nativeResult||op.decision?.status!=='approved'||op.completionDigest!==receipt.effectDigest)continue;
      try {validateReviewStructure(receipt.review,run.ownerId);} catch {continue;}
      result.push({actionId:receipt.actionId,proofDigest:receipt.effectDigest,operationId:op.operationId,
        requestId:op.requestId,approvalId:op.decision.approvalId,review:structuredClone(receipt.review)});
    }
    return result;
  }
  operationReview(runId, operationId) {
    const op = this.registry.resourceState.operations[operationId];
    const receipt = this.receipts.findLast(row => row.runId === runId && row.entityId === operationId &&
      ['cancel-reviewed-validation','reconcile-quarantined-port','reconcile-reviewed-terminal','withdraw-unissued-validation'].includes(row.action) && row.effectDigest === op?.completionDigest);
    if(receipt?.action==='withdraw-unissued-validation'&&op.state==='CANCELLED')return {executionOutcome:'COORDINATION_WITHDRAWN_BEFORE_ISSUANCE',evidenceAuthority:'OWNER_NATIVE_BOUNDARY_REVIEW',recoveryActionId:receipt.actionId};
    if(receipt?.action==='reconcile-reviewed-terminal' && op.state==='COMPLETED') return {executionOutcome:'NATIVE_TERMINAL_OBSERVED_PERMISSION_UNVERIFIED',evidenceAuthority:'ORCHESTRATOR_AUDIT_REVIEW',recoveryActionId:receipt.actionId};
    return receipt && op.state === 'CANCELLED' && receipt.action === 'reconcile-quarantined-port'
      ? { executionOutcome: 'HISTORICAL_OUTCOME_UNOBSERVED_RESOURCE_QUIESCENT', evidenceAuthority: 'VERIFIED_NATIVE_PORT_PROBES', recoveryActionId: receipt.actionId }
      : receipt && op.state === 'CANCELLED' ? { executionOutcome: 'UNDETERMINED_READ_ONLY',
      evidenceAuthority: 'ORCHESTRATOR_AUDIT_REVIEW', recoveryActionId: receipt.actionId } : null;
  }
  receiptSnapshot(runId, actionId) {
    const run = this.run(runId);
    const entries = this.receipts.filter(receipt => receipt.runId === runId && receipt.contextId === run.contextId &&
      (actionId === undefined || receipt.actionId === actionId));
    return { protocol: RECOVERY_PROTOCOL, runId, snapshot_only: true, total: entries.length,
      truncated: entries.length > 200, receipts: entries.slice(-200).map(({ actionId, state, result, httpStatus }) =>
        ({ actionId, state, result: result ? publicActionResult(result) : null, httpStatus: httpStatus || null })) };
  }
}

export function unavailableRunContext(run, reason = 'communication-state-unavailable') {
  const error = ['communication-identity-divergent', 'continuity-state-invalid', 'continuity-file-unsafe',
    'continuity-directory-unsafe', 'job-state-invalid'].includes(reason) ? reason : 'communication-state-unavailable';
  const job = () => ({ jobId: null, sessionId: run.sessionId, directory: run.directory, changeId: run.changeId,
    armed: true, terminalGate: { status: 'OPEN', reason: error } });
  const denied = () => fail(error, 503), noop = () => {};
  return { publicJob: job, sessions: () => [run.sessionId], decision: () => undefined, operation: () => undefined,
    publicStatus: () => ({ version: VERSION, job: job(), appServer: 'unavailable', opencodeSse: 'unverified',
      activeValidationCount: 0, undecidedValidationCount: 1, pendingReminderCount: 0, activeValidations: [],
      unmatchedNativePermissionCount: 0, unmatchedNativePermissions: [], recoveryRequired: error,
      terminalGate: job().terminalGate, lastEvent: { type: 'run-state-unavailable' } }),
    hasUnresolvedValidation: () => true, pendingEffects: () => true, pendingEffectsFor: () => true, unresolved: () => true,
    hasRequest: () => false, isOperationReconciling: () => false, isRejectionOnly: () => false,
    start: noop, close: async () => {}, onConnect: noop, onDisconnect: noop, onEvent: noop,
    freezeTransport: noop, resumeTransport: noop, transportHandoffReady: () => true, flushCommunication: async () => {},
    handle: async (_request, response) => { response.writeHead(503, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error, recovery_required: true })); },
    restoreApprovedOperation: denied, restoreApprovedTerminalOperation: denied, invalidateApprovedTerminalOperation: denied,
    restoreNativeRejectedOperation: denied, restoreNativeCancelledValidation: denied,
    inspectNotificationReconciliation: denied, checkReconciledValidation: denied, installReconciledValidation: denied,
    verifyRejectedRecoveryRelease: denied, assertNativeShellAsk: denied, invalidateOperation: denied };
}
