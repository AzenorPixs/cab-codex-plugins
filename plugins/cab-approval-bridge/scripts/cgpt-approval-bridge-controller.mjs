import {migrationRegistryDigest,validateRuntimeMigration,RUNTIME_MIGRATION_PROTOCOL} from './cgpt-approval-bridge-runtime-migration.mjs';
import {runtimeStateDirectory,legacyStateDirectory,projectAuthorityPath,initializeRuntimeState,readRuntimeJson,writeRuntimeJson} from './cgpt-approval-bridge-state-layout.mjs';
import { EfficiencyLedger } from './cgpt-approval-bridge-efficiency.mjs';
import { ShellLifecycle } from './cgpt-approval-bridge-shell-lifecycle.mjs';
import { followOpenCodeLifetime, boundedCleanup, closeHttpServer, processIdentity, SHUTDOWN_INCOMPLETE, VERSION as LIFECYCLE_VERSION } from './cgpt-approval-bridge-process-lifecycle.mjs';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, realpathSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { createJobContext, commandLengthLimit, checkCommandLength, VERSION as JOB_CONTEXT_VERSION } from './cgpt-approval-bridge-job-context.mjs';
import { CoordinationError, VERSION } from './cgpt-approval-bridge-runs.mjs';
import { ResourceRunRegistry, COORDINATION_PROTOCOL, TEST_RESOURCE_PROTOCOL, VERSION as RESOURCE_VERSION } from './cgpt-approval-bridge-resource-coordination.mjs';
import { MODEL_SELECTION_PROTOCOL, readModelCatalog, catalogProviderID, selectCodingModel, verifyModelPreflight, reasoningUnavailability, VERSION as MODEL_VERSION } from './cgpt-approval-bridge-model-policy.mjs';
import { SessionStatistics, VERSION as STATISTICS_VERSION } from './cgpt-approval-bridge-statistics.mjs';
import { createObservationJournal, VERSION as OBSERVATION_VERSION } from './cgpt-approval-bridge-monitor-events.mjs';
import { StatisticsMaintenance, statisticsDashboard, guardStatisticsPost, VERSION as MAINTENANCE_VERSION } from './cgpt-approval-bridge-statistics-maintenance.mjs';
import { guardManagementPost } from './cgpt-approval-bridge-monitor-management.mjs';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { FROZEN_CAPABILITY, moduleManifest, proofHash, maintenanceDirectory, verifyBootstrap, transactionValid } from './cgpt-approval-bridge-maintenance-proof.mjs';
import { createOpenCodeV2ClientFromEnv, normalizeOpenCodeEvent, nativeToolInputDigest } from './cgpt-approval-bridge-opencode-client.mjs';
import {ShellStageStore,assertShellDelivery,VERSION as SHELL_STAGE_VERSION} from './cgpt-approval-bridge-shell-stage.mjs';
import { TransportHandoff, CONTINUITY_PROTOCOL, guardContinuityRequest } from './cgpt-approval-bridge-continuity.mjs';
import { RecoveryCoordinator, unavailableRunContext, projectRecoveryReceipt } from './cgpt-approval-bridge-recovery.mjs';
import { NativeInstances } from './cgpt-approval-bridge-native-instances.mjs';
import { ManifestExtensions } from './cgpt-approval-bridge-manifest-extensions.mjs';
import { nativeEvidenceView, rejectedEditWithdrawalProof, validateReadOnlyReview, reviewedValidationProjection, pendingValidationProof, reviewedTerminalProof, excludeClosedValidationParts } from './cgpt-approval-bridge-recovery-evidence.mjs';
import { portProbeCommand, portProbeDescription, parsePortCapture, validatePortReview } from './cgpt-approval-bridge-port-recovery.mjs';

const version = "2.2.13";
if ([VERSION, STATISTICS_VERSION, JOB_CONTEXT_VERSION, RESOURCE_VERSION, OBSERVATION_VERSION, MAINTENANCE_VERSION, MODEL_VERSION, LIFECYCLE_VERSION,SHELL_STAGE_VERSION].some((value) => value !== version)) throw new Error('CAB component version mismatch');

// Private checkpoints must not inherit a group-writable shell umask.
process.umask(process.umask() | 0o077);
const envValue = (key) => process.env[key] || process.env[key.replace('OC_Codex_', 'OC_CGPT_')];
const workspaceInput = envValue('OC_Codex_WORKSPACE');
if (!workspaceInput || !workspaceInput.startsWith('/')) throw new Error('OC_Codex_WORKSPACE doit désigner une racine de projet absolue.');
if (envValue('OC_Codex_OUTSIDE_SANDBOX') !== '1') throw new Error('OC_Codex_OUTSIDE_SANDBOX=1 est requis.');
if (!['automatic', 'manual'].includes(envValue('OC_Codex_DECISION_MODE') || 'manual')) {
  throw new Error('OC_Codex_DECISION_MODE doit être automatic ou manual.');
}
const host = envValue('OC_Codex_STATUS_HOST') || '127.0.0.1';
if (!['127.0.0.1', '::1'].includes(host)) throw new Error('OC_Codex_STATUS_HOST doit être une adresse loopback autorisée.');
const maxCommandLength = commandLengthLimit();
const controllerEntry = fileURLToPath(import.meta.url);
const loadedBuildDigest = proofHash(await moduleManifest(controllerEntry));
const workspace = realpathSync(workspaceInput);
const transportAbort = new AbortController();
const openCode = createOpenCodeV2ClientFromEnv({ directory: workspace, signal: transportAbort.signal });
const stateDirectory = runtimeStateDirectory(workspace);
const migrationPath=join(stateDirectory,'runtime-migration.json');
let runtimeMigration=null;
let runtimeLayout;
let observations;
const port = Number(envValue('OC_Codex_STATUS_PORT') || 8788);
const reconnectMs = Number(envValue('OC_Codex_RECONNECT_MS') || 1000);
let statistics;
let registryRevision = 0;
let nativeGeneration = 0;
const nativeSessionGenerations = new Map();
const validationCorrelationEvidence = new Map();
let lifecycleLease = null;
let lifecycleMutations = 0;
let observedOperations = new Map();
const nativeCompletionReconciliations = new Set();
function observeStatistics(callback) {
  try { callback(); } catch { if(statistics)statistics.error = 'statistics-observation-unavailable'; }
}
const registry = new ResourceRunRegistry(workspace, stateDirectory, {
  onUnavailable: () => {
    process.stderr.write('CAB registry authority unavailable; restarting from durable state.\n');
    setImmediate(() => process.exit(1));
  },
  observe: (snapshot) => {
    registryRevision++;
    observeStatistics(() => statistics.registry(snapshot));
    const current = new Map();
    for (const operation of Object.values(snapshot.coordination?.operations || {}).slice(-500)) {
      current.set(operation.operationId, operation.state);
      if (observedOperations.get(operation.operationId) !== operation.state) {
        observations?.record('operation-state-observed', { runId: operation.runId, sessionId: operation.sessionId,
          changeId: snapshot.runs?.find((run) => run.runId === operation.runId)?.changeId,
          operationId: operation.operationId, requestId: operation.requestId, operationState: operation.state });
      }
    }
    observedOperations = current;
  },
});
await registry.acquireAuthority({additionalLockPath:projectAuthorityPath(workspace),
 beforeRestore:()=>{
  const legacyRegistry=join(legacyStateDirectory(workspace),'controller-runs.json');
  if(existsSync(legacyRegistry)&&!existsSync(join(stateDirectory,'runtime-layout.json'))&&!existsSync(migrationPath))
    throw new Error('runtime-migration-required');
  if(existsSync(migrationPath)) {
    const proof=readRuntimeJson(migrationPath).value;
    if(proof.phase==='PREPARED'&&migrationRegistryDigest(readRuntimeJson(legacyRegistry,{legacy:true}).value)!==proof.registryDigest)
      throw new Error('runtime-migration-source-divergent');
  }
  runtimeLayout=initializeRuntimeState(workspace,stateDirectory);observations=createObservationJournal({path:join(stateDirectory,'protocol-observations.json')});statistics=new SessionStatistics(stateDirectory,{project:workspace});}});
let broker = null;
let handoffJournal;
let transportAdoption = { adopted: false, reason: 'handoff-not-sealed' };
let handoffIntent = null;
async function transportNativeIdentity() {
  const info = await openCode.info(true);
  return { pid: info.pid, version: info.version, directory: await openCode.sharedMcpDirectory() };
}
async function handoffBrokerState(candidate = broker) {
  if(candidate?.status!=='READY' || candidate.ready!==true || !candidate.broker_process?.pid ||
      !Number.isFinite(Date.parse(candidate.checked_at)) || Date.now()-Date.parse(candidate.checked_at)<0 || Date.now()-Date.parse(candidate.checked_at)>35000) return null;
  const process=await processIdentity(candidate.broker_process.pid);
  if(!process || ['Z','X'].includes(process.state))return null;
  const readiness=Object.fromEntries(['status','ready','server_version','instance_id','root_cause',
    'coordination_protocol','pending_count','checked_at','broker_process'].map(key=>[key,candidate[key]]));
  return {identity:{pid:process.pid,startTime:process.startTime},readiness};
}
try {
  handoffJournal = new TransportHandoff(join(stateDirectory, 'transport-handoff.json'), workspace);
  if (handoffJournal.snapshot()?.state === 'SEALED') {
    transportAdoption = handoffJournal.adopt(registry, await transportNativeIdentity());
    try {
    const sourceBroker=handoffJournal.brokerState();
    if(transportAdoption.adopted && sourceBroker){
      const currentBroker=await handoffBrokerState(sourceBroker.readiness);
      const mcp=await openCode.mcp();
      if(currentBroker && proofHash(currentBroker.identity)===proofHash(sourceBroker.identity) &&
          mcp?.['cgpt-validation']?.status==='connected') {
        broker={...sourceBroker.readiness,restored_from:'certified-handoff'};
      }
    }
    } catch { broker=null; }
  }
} catch { transportAdoption = { adopted: false, reason: 'handoff-storage-or-identity-unavailable' }; }
try {
 runtimeMigration=readRuntimeJson(migrationPath).value;
 validateRuntimeMigration(runtimeMigration,{workspace,registry:registry.snapshot(),nativeIdentity:runtimeMigration.phase==='ACTIVE'?runtimeMigration.nativeIdentity:await transportNativeIdentity()});
} catch(cause) {if(cause.code!=='ENOENT')throw cause;}
function migrationStatus(){return runtimeMigration?{protocol:RUNTIME_MIGRATION_PROTOCOL,transactionId:runtimeMigration.transactionId,phase:runtimeMigration.phase,pendingCount:runtimeMigration.pending.length}:null;}
function transportStatus() {
  return { protocol: CONTINUITY_PROTOCOL, ...transportAdoption, receipt: handoffJournal?.snapshot() ?? null };
}
const shellLifecycle = new ShellLifecycle(join(stateDirectory,'shell-lifecycle.json'));
const backgroundReconciliations = new Set();
const shellStages=new ShellStageStore(join(stateDirectory,'shell-stages.json'));
const efficiency = new EfficiencyLedger(join(stateDirectory,'protocol-efficiency.json'));
const usageRefreshes = new Set();
const recovery = new RecoveryCoordinator(registry, join(stateDirectory, 'recovery-policies.json'));
const manifestExtensions = new ManifestExtensions(registry, join(stateDirectory, 'manifest-extensions.json'));
const nativeInstances = new NativeInstances(workspace, join(stateDirectory, 'native-instances.json'));
statistics.registry(registry.snapshot());
const statisticsMaintenance = new StatisticsMaintenance(statistics, { referenced: () => registry.snapshot().runs });
const contexts = new Map();
recovery.validationBoundaryReplay = (receipt,op) => {
  const run=registry.runs.get(receipt.runId), context=contexts.get(receipt.runId);
  if(!run || !context || run.ownerId!==receipt.ownerId || !receipt.observation ||
      receipt.observation.approval?.reservation_version!==run.version) return false;
  if(receipt.action==='restore-pending-validation')
    return context.pendingRestorationProof?.(op.requestId)===receipt.effectDigest;
  if(receipt.action==='withdraw-unissued-validation') {
    if(op.state!=='CANCELLED'||op.completionDigest!==receipt.effectDigest||op.native||op.nativeResult)return false;
    context.withdrawUnissuedValidation(receipt.observation.approval,receipt.effectDigest);return true;
  }
  if(op.state!=='COMPLETED' || op.completionDigest!==receipt.effectDigest || op.native || op.nativeResult) return false;
  context.completeReviewedTerminal(receipt.observation.approval,receipt.effectDigest);
  return true;
};
const transitions = new Set();
let sseState = 'connecting';
let reconnectTimer;
let closing = false;
let sseGeneration = 0;
function inspectLegacyAdmission(operation) {
  registry.admission();
  if (activeContexts().length) throw new CoordinationError('run-target-required');
  if (operation) registry.markLegacyUse(operation);
  return true;
}
const legacy = createJobContext({ workspace, stateDirectory, maxCommandLength,
  observe: (type, details) => observations.record(type, details),
  inspectOperationAdmission: inspectLegacyAdmission,
  admitOperation: (...args) => { try { return inspectLegacyAdmission(...args); } catch { return false; } },
});

function json(response, status, payload) {
  const result = response.cabRecoveryActionId ? recovery.complete(response.cabRecoveryActionId, status, payload) : payload;
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  response.end(JSON.stringify(response.cabRecoveryProjection && !response.cabRecoveryActionId ? projectRecoveryReceipt(result) : result));
}
async function readJson(request, maxBytes = 256 * 1024) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBytes) throw new CoordinationError('request-too-large', 413);
  }
  try { return JSON.parse(body || '{}'); }
  catch { throw new CoordinationError('invalid-json', 400); }
}
function contextFor(run) {
  if (contexts.has(run.runId)) return contexts.get(run.runId);
  let context;
  const inspectAdmission = (operation, requestId, stage) => {
    if (transitions.has(run.runId)) throw new CoordinationError('run-transition-in-flight');
    if (!operation || operation.runId !== run.runId || operation.directory !== workspace ||
        !context.sessions().includes(operation.sessionId)) throw new CoordinationError('operation-identity-divergent');
    if (broker?.coordination_protocol !== COORDINATION_PROTOCOL) throw new CoordinationError('coordination-upgrade-required');
    if (['STORE_UNHEALTHY', 'JOURNAL_UNHEALTHY', 'JOURNAL_INTEGRITY_FAILURE', 'STORE_JOURNAL_DIVERGENCE']
      .includes(broker?.root_cause)) throw new CoordinationError('broker-integrity-unavailable');
    return registry.operationAdmission(run.runId, operation, requestId, stage);
  };
  try {
  context = createJobContext({
    workspace, stateDirectory: join(stateDirectory, 'runs', run.runId, String(run.contextId || run.version)), run, maxCommandLength,
    reviewOperation:(operation,requestId)=>{shellLifecycle.available(operation);return shellStages.review(operation,requestId);},
    currentRun: () => registry.runs.get(run.runId),
    restoreCommunication: (validation, decision) => {
      const approval = validation.sourceApproval, operation = validation.operation;
      const owner = registry.requestOwners[validation.requestId];
      const op = registry.resourceState.operations[operation?.operationId];
      const identity = createHash('sha256').update(JSON.stringify(nativeIdentity(approval))).digest('hex');
      if (!op || owner?.runId !== run.runId || owner.digest !== identity || op.contextId !== run.contextId ||
          op.requestId !== validation.requestId || op.sessionId !== operation.sessionId ||
          op.operationDigest !== operation.operationDigest || op.version !== operation.reservationVersion ||
          op.decision && (op.decision.approvalId !== validation.approvalId || op.decision.requestId !== validation.requestId)) {
        throw new CoordinationError('communication-identity-divergent');
      }
      if (op.state === 'CANCELLED' && (!op.decision || op.decision.status === 'approved' && !op.native && op.completionDigest)) return null;
      const ledgerDecision = op.decision ? {
        decision: op.decision.status, requestId: validation.requestId, approval_id: validation.approvalId,
        change_id: validation.changeId, run_id: run.runId, reservation_version: operation.reservationVersion,
        operation_id: operation.operationId, operation_digest: operation.operationDigest,
        expected_revisions: operation.expectedRevisions, coordination_protocol: operation.coordinationProtocol,
        resources: operation.resources, access_id: operation.accessId,
        ...(operation.toolInputSha256 ? { tool_input_sha256: operation.toolInputSha256 } : {}),
        ...(operation.shellBackground === true ? {shell_background:true} : {}),
        ...(op.decision.status === 'rejected' && op.state === 'CANCELLED' && op.completionDigest
          ? { native_proof_digest: op.completionDigest } : {}),
        restored_from: 'operation-ledger',
      } : null;
      const matchesLedger = ledgerDecision && decision && Object.entries(ledgerDecision)
        .filter(([key]) => key !== 'restored_from')
        .every(([key, value]) => JSON.stringify(decision[key]) === JSON.stringify(value));
      const committedDecision = matchesLedger ? decision : ledgerDecision;
      return { validation: { ...validation, restoredOperation: true,
        operationConsumed: validation.operationConsumed === true || op.native?.onceAcknowledged === true ||
          ['COMPLETED', 'CANCELLED'].includes(op.state) }, decision: committedDecision };
    },
    observe: (type, details) => {
      observations.record(type, { runId: run.runId, changeId: run.changeId, sessionId: run.sessionId, ...details });
      observeStatistics(() => statistics.observe(run, type, details));
    },
    ownsSession: (session) => context.sessions().includes(session),
    verifyRestoredPreflight: (approval) => {
      try {
        const owner = registry.requestOwners[approval.requestId];
        const digest = createHash('sha256').update(JSON.stringify(nativeIdentity(approval))).digest('hex');
        return owner?.runId === run.runId && owner.digest === digest &&
          registry.covers(run.runId, approval.reservation_version, approval.resources);
      } catch { return false; }
    },
    nativeLifecycle: {
      begin: (operation, requestId, permission) => registry.nativeStart(run.runId, operation, requestId, permission),
      issued: (operation) => registry.nativeIssued(operation.operationId),
      unknown: (operation) => registry.nativeUnknown(operation?.operationId),
    },
    persistOperationDecision: (validation, decision) => {
      if (!validation?.operation) return;
      const op = registry.resourceState.operations[validation.operation.operationId];
      if (!op) throw new CoordinationError('operation-decision-operation-missing');
      registry.recordDecision(run.runId, op.operationId, { status: decision.decision,
        requestId: validation.requestId, approvalId: validation.approvalId, changeId: validation.changeId,
        operationId: op.operationId, operationDigest: op.operationDigest, identityDigest: op.identityDigest,
        runId: run.runId, version: op.version, sessionId: op.sessionId });
    },
    persistNativeRejectedDecision: (validation, decision, proofDigest) => {
      if (!validation?.operation) throw new CoordinationError('operation-decision-operation-missing');
      const op = registry.resourceState.operations[validation.operation.operationId];
      if (!op) throw new CoordinationError('operation-decision-operation-missing');
      registry.recordRejectedNativeDecision(run.runId, op.operationId, { status: 'rejected',
        requestId: validation.requestId, approvalId: validation.approvalId, changeId: validation.changeId,
        operationId: op.operationId, operationDigest: op.operationDigest, identityDigest: op.identityDigest,
        runId: run.runId, version: op.version, sessionId: op.sessionId }, proofDigest);
    },
    ensureOperationAccess: (operation) => {
      const op = registry.resourceState.operations[operation?.operationId];
      if (!op || op.runId !== run.runId || op.state !== 'PREPARED') throw new CoordinationError('operation-access-recovery-invalid');
      const existing = registry.resourceState.accesses[op.accessId];
      if (existing?.state === 'HELD') return existing;
      return registry.acquireAccess(run.runId, { operationId: op.accessId, version: op.version,
        resources: op.resources, expectedRevisions: op.expectedRevisions, operationDigest: op.operationDigest,
        operationIds: [op.operationId] }, registry.isExclusive(run, op.resources));
    },
    inspectOperationAdmission: inspectAdmission,
    admitOperation: (...args) => { try { return inspectAdmission(...args); } catch { return false; } },
    modelPolicy: {
      resolve: input => resolveCodingModel(input, { explicitUnrestricted: true }),
      prove: async (selection, proof, notBefore) => verifyModelPreflight(selection,
        { ...(await modelPreflightObservation(proof)), workspace, notBefore }),
      connection: async (selection,input = {}) => {
        const providers = await openCode.providerList(workspace,input.providerMaxBytes);
        const provider = providers.all.find(entry => entry.id === selection.providerID);
        if (!provider) throw new CoordinationError('model-transition-provider-unavailable');
        const integrationID = provider?.integrationID;
        const active = typeof integrationID === 'string' ? (await openCode.integrationConnection(integrationID)).active : null;
        return { providerID: selection.providerID, serverPid: (await openCode.info(true)).pid,
          integrationID: integrationID || null, credentialId: active?.id || null,
          type: active?.type || (integrationID ? 'none' : 'unmanaged'), method: active?.method || null };
      },
      assertBoundary: () => {
        const entry = registry.runs.get(run.runId);
        if (context.pendingEffects() || context.publicJob()?.recovery || registry.accesses(run.runId)
          .some(access => ['HELD','WAITING','EXECUTING','UNKNOWN','STALE'].includes(access.state))) {
          throw new CoordinationError('model-transition-not-quiescent');
        }
        return entry;
      },
    },
  });
  } catch (cause) {
    const reason = cause.code || cause.message;
    if (!['communication-identity-divergent', 'continuity-state-invalid', 'continuity-file-unsafe',
      'continuity-directory-unsafe', 'job-state-invalid', 'EACCES', 'EPERM', 'EIO'].includes(reason)) throw cause;
    context = unavailableRunContext(run, reason);
    observations.record('run-recovery-required', { runId: run.runId, sessionId: run.sessionId, changeId: run.changeId });
  }
  if(runtimeMigration?.phase==='PREPARED') {
    for(const item of runtimeMigration.pending.filter(item=>item.runId===run.runId)) {
      if(item.contextId!==run.contextId||item.version!==run.version||item.jobId!==context.publicJob()?.jobId)
        throw new CoordinationError('runtime-migration-pending-owner-divergent');
      if(!context.operation(item.approval.requestId))context.restorePendingValidation(item.approval,proofHash(item));
    }
    context.freezeTransport();
  }
  contexts.set(run.runId, context);
  if (registry.sessionHandoffs(run.runId).some(h => !['DONE','ABORTED'].includes(h.state))) context.freezeTransport();
  context.start();
  if (sseState === 'connected') context.onConnect();
  return context;
}
function activeContexts() {
  return [...contexts.entries()].filter(([id]) => registry.runs.get(id)?.state === 'RESERVED');
}
function admissionSnapshot(runId) {
  return {state:transitions.has(runId) ? 'BUSY' : 'STABLE',snapshot_only:true};
}
function validatedChangeScopeForTestRecovery(runId, context, entry) {
  const run = registry.runs.get(runId);
  const job = context.publicJob();
  const status = context.publicStatus();
  return Boolean(run && run.state === 'RESERVED' && run.version === entry.version &&
    run.contextId === entry.contextId && run.sessionId === job?.sessionId &&
    run.changeId && job?.armed === true && job.changeId === run.changeId &&
    job.directory === run.directory && !job.currentCabMandate && !job.recovery &&
    status.undecidedValidationCount === 0 && !context.pendingEffects());
}
function publicTestReservations(runId) {
  return registry.testReservations(runId).map(({ token, ...reservation }) => reservation);
}
function publicRunSnapshot() {
  const snapshot = registry.snapshot();
  const reservations = snapshot.coordination?.testReservations;
  if (reservations && typeof reservations === 'object' && !Array.isArray(reservations)) {
    for (const reservation of Object.values(reservations)) {
      if (reservation && typeof reservation === 'object') delete reservation.token;
    }
  }
  return snapshot;
}
function statusFor(runId, context) {
  const status = context.publicStatus();
  const run = registry.runs.get(runId);
  const accesses = registry.accesses(runId);
  const testReservations = publicTestReservations(runId);
  const global = registry.resourceState.global;
  const reason = status.recoveryRequired ? status.recoveryRequired : registry.migrationRequired || broker?.coordination_protocol !== COORDINATION_PROTOCOL ? 'coordination-upgrade-required'
    : global && global.state !== 'RELEASED' ? 'global-coordination-suspended'
      : run.suspension ? 'run-' + run.suspension.action.toLowerCase()
        : run.maintenancePreflightRequired ? 'maintenance-preflight-required'
        : testReservations.some((r) => r.reconciliationRequired) ? 'test-reconciliation-required'
        : testReservations.some((r) => r.state === 'WAITING') ? 'test-resource-conflict'
        : accesses.some((a) => a.state === 'WAITING') ? 'resource-conflict'
          : accesses.some((a) => a.state === 'UNKNOWN') ? 'resource-effects-unknown'
            : accesses.some((a) => ['HELD','EXECUTING'].includes(a.state) && registry.restoredAccesses.has(a.accessId))
              ? 'access-reconciliation-required'
              : accesses.some((a) => a.state === 'STALE' && a.version === run.version) ? 'resource-revision-stale' : null;
  const unresolvedOperations = Object.values(registry.resourceState.operations).filter(op =>
    op.runId === runId && op.contextId === run.contextId && !['COMPLETED','CANCELLED'].includes(op.state));
  return { ...status, runtimeStateDirectory:stateDirectory,runtimeMigration:migrationStatus(), admission:admissionSnapshot(runId), frozenRecoveryMaintenance: FROZEN_CAPABILITY, maintenanceBuildDigest: loadedBuildDigest,
    notificationReconciliation: 'rejection-only-v1', hasUnresolvedOperation: context.hasUnresolvedValidation() || unresolvedOperations.length > 0,
    hasUnresolvedValidation: context.hasUnresolvedValidation(), unresolvedOperationCount: unresolvedOperations.length, coordination: { reason, integrationReady: run.integrationReady,
    referenceVersion: registry.referenceVersion, reviewedReferenceVersion: run.referenceVersion,
    phase: run.phase, protocol: registry.snapshot().coordinationProtocol, global, suspension: run.suspension || null,
    accesses, testResourceProtocol: TEST_RESOURCE_PROTOCOL, testReservations,
    blockers: [...accesses.flatMap((a) => a.blockers), ...testReservations.flatMap((r) => r.blockers)],
    integrationQueue: [], integrationBlockers: [] },
    ...(reason ? { brokerReadiness: { ...status.brokerReadiness, status: 'BLOCKED', ready: false, root_cause: reason } } : {}) };
}
function localIntegrationBlockers(runId) {
  const blockers = registry.integrationBlockers(runId);
  for (const [id, context] of activeContexts()) {
    const status = context.publicStatus();
    const entry = (reason) => ({ runId: id, reason });
    if (status.job?.currentCabMandate) blockers.push(entry('current-mandate-not-closed'));
    if (status.undecidedValidationCount) blockers.push(entry('undecided-validation'));
    if (status.unmatchedNativePermissionCount) blockers.push(entry('native-permissions-unresolved'));
    if (status.job?.recovery) blockers.push(entry('session-recovery-pending'));
    if (context.pendingEffects()) blockers.push(entry('run-not-quiescent'));
  }
  return blockers;
}
async function nativeCohort() {
  const entries = activeContexts().flatMap(([runId, context]) =>
    (context.observedSessions?.() || context.sessions()).map(sessionId => ({runId,context,directory:workspace,sessionId})));
  for (const source of registry.resourceState.legacySources) entries.push({ runId: null, context: null, ...source });
  for (const sessionId of legacy.sessions()) if (!entries.some((entry) => entry.sessionId === sessionId)) {
    entries.push({ runId: null, context: legacy, sessionId, directory: legacy.publicJob()?.directory || workspace });
  }
  const revision = registryRevision;
  const generation = nativeGeneration;
  const directories = [...new Set([workspace, ...entries.map((entry) => entry.directory)])];
  let observations;
  let sessions;
  try {
    [observations, sessions] = await Promise.all([
      Promise.all(directories.map(async (directory) => ({ directory, busy: await openCode.sessionStatus(directory),
        permissions: await openCode.permissions(directory) }))),
      Promise.all(entries.map((entry) => openCode.session(entry.sessionId, entry.directory))),
    ]);
  } catch (cause) {
    if (cause.code === 'opencode-session-status-invalid') throw new CoordinationError('native-reconciliation-invalid');
    if (cause.code === 'opencode-session-divergent') throw new CoordinationError('native-session-divergent');
    throw cause;
  }
  if (observations.some(({busy, permissions}) => !busy || typeof busy !== 'object' || Array.isArray(busy) || !Array.isArray(permissions) ||
      Object.values(busy).some((state) => !state || !['idle', 'busy', 'retry'].includes(state.type)) ||
      permissions.some((permission) => !permission || typeof permission.sessionID !== 'string' || typeof permission.id !== 'string'))) {
    throw new CoordinationError('native-reconciliation-invalid');
  }
  const blockers = [];
  entries.forEach((entry, index) => {
    const session = sessions[index];
    const {busy, permissions} = observations.find((observation) => observation.directory === entry.directory);
    if (session?.id !== entry.sessionId || session.directory !== entry.directory) throw new CoordinationError('native-session-divergent');
    if (entry.context && !(entry.context.observedSessions?.() || entry.context.sessions()).includes(entry.sessionId)) throw new CoordinationError('native-observation-changed');
    if (busy[entry.sessionId] && busy[entry.sessionId].type !== 'idle') {
      blockers.push({ runId: entry.runId, sessionId: entry.sessionId, reason: 'native-session-busy' });
    }
    const count = permissions.filter((permission) => permission.sessionID === entry.sessionId).length;
    if (count) blockers.push({ runId: entry.runId, sessionId: entry.sessionId, reason: 'native-permissions-unresolved', count });
  });
  if (registryRevision !== revision || nativeGeneration !== generation) throw new CoordinationError('native-observation-changed');
  observeStatistics(() => statistics.nativeSnapshot(observations.find((o) => o.directory === workspace).busy));
  return blockers;
}
async function checkCohort() {
  const blockers = await nativeCohort();
  if (legacy.pendingEffects() || activeContexts().some(([, context]) => context.pendingEffects() || context.publicJob()?.recovery)) {
    throw new CoordinationError('run-not-quiescent');
  }
  if (blockers.length) throw new CoordinationError('native-session-not-quiescent');
}
async function maintenanceCohort(payload) {
  if (payload.rejectedRecovery !== undefined) {
    const revision = registryRevision, generation = nativeGeneration;
    const global = registry.resourceState.global;
    const target = activeContexts().find(([id]) => id === payload.rejectedRecovery?.runId);
    if (!global || global.cause !== 'GLOBAL_RECONCILIATION' || global.transactionId !== payload.transactionId ||
        !['DRAINING', 'HELD'].includes(global.state) || typeof payload.authorization !== 'string' ||
        !payload.authorization.trim() || payload.authorization.length > 500 || !target || transitions.size ||
        legacy.pendingEffects() || activeContexts().some(([id, c]) => c.pendingEffects() ||
          (id !== target[0] && c.publicJob()?.recovery) || registry.unresolvedAccess(id) ||
          registry.testReservations(id).some(r => ['HELD', 'WAITING'].includes(r.state)))) {
      throw new CoordinationError('rejected-recovery-release-divergent');
    }
    await target[1].verifyRejectedRecoveryRelease(payload);
    if ((await nativeCohort()).length) throw new CoordinationError('native-session-not-quiescent');
    await target[1].verifyRejectedRecoveryRelease(payload);
    if (registryRevision !== revision || nativeGeneration !== generation || transitions.size ||
        activeContexts().some(([id, c]) => c.pendingEffects() || (id !== target[0] && c.publicJob()?.recovery))) {
      throw new CoordinationError('native-observation-changed');
    }
    return;
  }
  if (!activeContexts().some(([, context]) => context.publicJob()?.recovery)) return checkCohort();
  if (!transactionValid(payload.transactionId) ||
      !existsSync(join(maintenanceDirectory(), payload.transactionId + '.json'))) return checkCohort();
  const address = server.address();
  return verifyBootstrap({ root: maintenanceDirectory(), transactionId: payload.transactionId,
    controllerUrl: `http://${host === '::1' ? '[::1]' : host}:${address.port}`, openCode,
    workspace, controllerPid: process.pid, entry: controllerEntry });
}
function proofReferences(payload) {
  if (!Array.isArray(payload.evidence) || !payload.evidence.length ||
      !payload.evidence.every((e) => typeof e === 'string' && e.length > 0 && e.length <= 500)) {
    throw new CoordinationError('evidence-references-required');
  }
}
function scopedReadiness(runId, payload) {
  const scoped = payload.by_run?.[runId] || { pending_count: 0, stalled_count: 0 };
  const commonCauses = new Set(['STORE_UNHEALTHY', 'JOURNAL_UNHEALTHY', 'JOURNAL_INTEGRITY_FAILURE',
    'STORE_JOURNAL_DIVERGENCE', 'WORKER_POOL_SATURATED', 'CONTROLLER_UNREACHABLE']);
  const commonFailure = commonCauses.has(payload.root_cause) || (payload.infrastructure_status && payload.infrastructure_status !== 'READY');
  const state = commonFailure ? payload.status : (scoped.status || (scoped.stalled_count ? 'BLOCKED' : 'READY'));
  return { ...payload, ...scoped, status: state, ready: state === 'READY', run_id: runId,
    root_cause: commonFailure ? payload.root_cause : scoped.root_cause || 'NONE' };
}
async function publishTo(context, readiness) {
  await context.handle({ method: 'POST', cabPayload: readiness },
    { writeHead() { return this; }, end() {} }, new URL('http://localhost/broker/readiness'));
}
async function checkNative(sessionId, idle = false) {
  let session;
  try { session = await openCode.session(sessionId, workspace); }
  catch { throw new CoordinationError('native-session-unavailable'); }
  if (session.id !== sessionId || session.directory !== workspace) throw new CoordinationError('native-session-divergent');
  try { await nativeInstances.observe(await openCode.info(true)); } catch { observations.record('native-instance-observation-unavailable', {}); }
  if (idle) {
    const [busy, permissions] = await Promise.all([openCode.sessionStatus(workspace),
      openCode.permissions(workspace, { sessionIds: [sessionId] })]);
    if (!busy || typeof busy !== 'object' || Array.isArray(busy) ||
        !Array.isArray(permissions) || (busy[sessionId] && busy[sessionId].type !== 'idle') ||
        permissions.some((p) => p.sessionID === sessionId)) throw new CoordinationError('native-session-not-quiescent');
    observeStatistics(() => statistics.nativeSnapshot(busy));
  }
}
function singleContext() {
  const active = activeContexts();
  if (active.length > 1 || (active.length && legacy.publicJob()?.armed)) throw new CoordinationError('run-target-required');
  return active[0]?.[1] || legacy;
}
function nativeIdentity(approval) {
  return Object.fromEntries(['run_id', 'reservation_version', 'requestId', 'approval_id', 'change_id',
    'session_id', 'directory', 'title', 'summary', 'files', 'commands', 'resources',
    'coordination_protocol', 'operation_id', 'operation_digest', 'expected_revisions', 'access_id',
    ...(approval.shell_background === true ? ['shell_background', 'tool_input_sha256'] : [])]
    .map((key) => [key, approval[key] ?? (['resources', 'commands'].includes(key) ? [] : key === 'summary' ? '' : null)]));
}
async function verifyNativeValidation(approval) {
  const expected = nativeIdentity(approval);
  const nativeCalls=part=>Array.isArray(part.state?.metadata?.toolCalls)?part.state.metadata.toolCalls:[];
  const terminalRefusal=part=>{
    if(part?.type!=='tool'||typeof part.state?.output!=='string'||!part.state.output.includes('NOT_ADMITTED'))return false;
    const requestInput=part.tool==='cgpt-validation_request_validation'?part.state.input:
      part.tool==='execute'?nativeCalls(part).find(call=>call.tool==='cgpt-validation.request_validation'&&
        call.input?.requestId===approval.requestId)?.input:null;
    if(!requestInput||!isDeepStrictEqual(nativeIdentity(requestInput),expected))return false;
    let value;try{value=JSON.parse(part.state.output);}catch{return false;}
    return value?.status==='NOT_ADMITTED'&&value.requestId===approval.requestId&&value.approval_id===approval.approval_id;
  };
  const correlated = (part) => {
    if (part?.type !== 'tool') return false;
    if (part.tool === 'cgpt-validation_request_validation' &&
        (['running', 'completed'].includes(part.state?.status) ||
          part.state?.status === 'error' && part.state?.metadata?.cabCodeMode?.nativeMcpError === true) && part.state?.input) {
      return isDeepStrictEqual(nativeIdentity(part.state.input), expected);
    }
    const metadata = part.state?.metadata;
    const calls = metadata?.toolCalls;
    if (part.tool !== 'execute' || part.executed !== false ||
        typeof part.state?.input?.code !== 'string' || !['running','completed', 'error'].includes(part.state?.status) ||
        metadata?.truncated !== false || !Array.isArray(calls) || calls.length < 1 || calls.length > 2) return false;
    const request = calls.at(-1);
    // Both state machines report observation phases, not business authority.
    // Their updates may be asynchronous; only the attested input is correlated.
    const nativeCallObserved = ['running','completed','error'].includes(request?.status) &&
      (metadata.error === undefined || typeof metadata.error === 'boolean');
    if (request?.tool !== 'cgpt-validation.request_validation' || !nativeCallObserved || !request.input ||
        !isDeepStrictEqual(nativeIdentity(request.input), expected)) return false;
    return calls.length === 1 || calls[0]?.tool === 'search' && calls[0]?.status === 'completed';
  };
  const snapshots=[],started=Date.now(),deadline=started+750;
  const key=approval.run_id+'\0'+approval.requestId,prior=validationCorrelationEvidence.get(key);
  const required=['run_id','reservation_version','requestId','approval_id','change_id','session_id','directory',
    'resources','coordination_protocol','operation_id','operation_digest','expected_revisions'];
  const requestInput=part=>part.tool==='cgpt-validation_request_validation'?part.state?.input:
    part.tool==='execute'?nativeCalls(part).find(call=>call.tool==='cgpt-validation.request_validation'&&call.input?.requestId===approval.requestId)?.input:null;
  const record=outcome=>{
    const notification={startedAt:new Date(started).toISOString(),finishedAt:new Date().toISOString(),outcome,snapshots};
    const value={runId:approval.run_id,requestId:approval.requestId,sessionId:approval.session_id,
      contextId:registry.runs.get(approval.run_id)?.contextId??null,version:approval.reservation_version,
      snapshot_only:true,notificationCount:(prior?.notificationCount||0)+1,first:prior?.first||notification,
      ...(prior?{latest:notification}:{})};
    validationCorrelationEvidence.delete(key);validationCorrelationEvidence.set(key,value);
    while(validationCorrelationEvidence.size>500)validationCorrelationEvidence.delete(validationCorrelationEvidence.keys().next().value);
    observeStatistics(()=>observations.record('validation-correlation-observed',{runId:approval.run_id,requestId:approval.requestId,
      outcome,snapshotCount:snapshots.length,identifiedParts:snapshots.at(-1)?.identifiedParts||0}));
  };
  for(const delay of [0,50,100,200]) {
    if(delay){const remaining=deadline-Date.now();if(remaining<=0)break;await new Promise(resolve=>setTimeout(resolve,Math.min(delay,remaining)));}
    const messages=await openCode.messages(approval.session_id,workspace);
    const parts=messages.flatMap(message=>Array.isArray(message.parts)?message.parts:[]).filter(part=>part?.type==='tool');
    const identified=parts.filter(part=>requestInput(part)?.requestId===approval.requestId);
    const candidates=(identified.length?identified:parts.filter(part=>part.tool==='execute'||part.tool==='cgpt-validation_request_validation')).slice(-4);
    snapshots.push({observedAt:new Date().toISOString(),messages:messages.length,toolParts:parts.length,identifiedParts:identified.length,
      candidates:candidates.map(part=>{
        const input=requestInput(part),identity=input?nativeIdentity(input):null;
        return {callId:typeof part.callID==='string'&&/^[A-Za-z0-9_.-]{1,160}$/.test(part.callID)?part.callID:null,
          tool:part.tool==='execute'?'execute':'request_validation',phase:['running','completed','error'].includes(part.state?.status)?part.state.status:'unknown',
          error:typeof part.state?.metadata?.error==='boolean'?part.state.metadata.error:null,
          truncated:part.state?.metadata?.truncated===true,executed:part.executed===true,
          nestedPhases:nativeCalls(part).slice(0,3).map(call=>['running','completed','error'].includes(call?.status)?call.status:'unknown'),
          missingFields:input?required.filter(field=>input[field]===undefined):required,
          mismatchFields:identity?Object.keys(expected).filter(field=>!isDeepStrictEqual(identity[field],expected[field])):[]};
      })});
    if(parts.some(terminalRefusal)){record('TERMINAL_REFUSAL');throw new CoordinationError('native-validation-not-correlated');}
    if(parts.some(correlated)){record('MATCHED');return;}
    if(identified.some(part=>required.every(field=>requestInput(part)[field]!==undefined))) {
      record('DIVERGENT');throw new CoordinationError('native-validation-not-correlated');
    }
    if(Date.now()>=deadline)break;
  }
  record('EVIDENCE_UNAVAILABLE');
  throw new CoordinationError('native-validation-evidence-unavailable',503);
}
const restoringOperations = new Set();
const queuedOperationRestorations = new Set();
function nativePermissionCallId(permission) {
  return permission?.tool?.callID || permission?.metadata?.callID || permission?.callID || null;
}
function pendingOperationPermission(approval, operation, messages, permissions) {
  const kind = operation.kind;
  const matches = permissions.filter((permission) => {
    if (permission.sessionID !== operation.sessionId || !permission.id ||
        permission.permission !== kind || (operation.native?.permissionId && permission.id !== operation.native.permissionId)) return false;
    if (kind === 'edit') {
      const target = permission.metadata?.filepath;
      return typeof target === 'string' && resolve(workspace, target) === resolve(workspace, approval.directory, approval.files[0]);
    }
    return kind === 'bash' && permission.metadata?.command === approval.commands[0];
  });
  if (matches.length !== 1) return null;
  const permission = matches[0], callId = nativePermissionCallId(permission);
  if (!callId || operation.native?.callId && operation.native.callId !== callId) return null;
  const parts = messages.flatMap((message) => Array.isArray(message.parts) ? message.parts : []);
  const tools = parts.filter((part) => part?.type === 'tool' &&
    (part.callID || part.callId) === callId &&
    (kind === 'edit' ? ['edit','write','apply_patch'].includes(part.tool) : part.tool === 'bash'));
  if (tools.length !== 1 || tools[0].state?.status !== 'running' || tools[0].executed !== false) return null;
  if (operation.toolInputSha256 && permission.metadata?.nativeToolInputSha256 !== operation.toolInputSha256) return null;
  const state = tools[0].state;
  const proofDigest = createHash('sha256').update(JSON.stringify({ runId:operation.runId,
    operationId:operation.operationId, permissionId:permission.id, callId, kind,
    targetDigest:createHash('sha256').update(JSON.stringify([kind, operation.target])).digest('hex'),
    toolStatus:state.status, executed:tools[0].executed, startedAt:state.time?.start ?? null })).digest('hex');
  return { permissionId: permission.id, callId, proofDigest, permission, tool: tools[0] };
}
function eventMatchesNativePart(event, part, operation, approval) {
  if (!event || event.sessionId !== operation.sessionId || !event.callId ||
      event.callId !== (part.callID || part.callId) || event.toolName !== part.tool ||
      !['session.tool.success','session.tool.failed'].includes(event.type) ||
      !['completed','error'].includes(part.state?.status) || !part.state?.input ||
      !event.inputDigest || event.inputDigest !== nativeToolInputDigest(part.state.input)) return false;
  if ((event.type === 'session.tool.success') !== (part.state.status === 'completed')) return false;
  if (approval.tool_input_sha256 && event.inputDigest !== approval.tool_input_sha256) return false;
  if (operation.kind === 'bash') return part.tool === 'bash' && part.state.input.command === approval.commands[0];
  if (operation.kind !== 'edit' || !['edit','write','apply_patch'].includes(part.tool)) return false;
  let target = part.state.input.filePath || part.state.input.filepath || part.state.input.path;
  if (part.tool === 'apply_patch') {
    const patch = part.state.input.patchText || part.state.input.patch;
    if (typeof patch !== 'string' || /^\*\*\* Move to:/m.test(patch)) return false;
    const paths = [...new Set([...patch.matchAll(/^\*\*\* (?:Add|Update|Delete) File: ([^\r\n]+)$/gm)].map((m) => m[1]))];
    if (paths.length !== 1) return false;
    target = paths[0];
  }
  if (typeof target !== 'string') return false;
  if (isAbsolute(target)) target = relative(workspace, target);
  return target === approval.files[0];
}
function nativeCancellationCandidate(op) {
  return Boolean(op && ['PREPARED','CANCELLED'].includes(op.state) && !op.native &&
    (!op.decision || op.decision.status === 'approved'));
}
async function restoreApprovedOperations(run, context) {
  if (!run || !context || context.publicStatus().recoveryRequired) return;
  if (restoringOperations.has(run.runId)) { queuedOperationRestorations.add(run.runId); return; }
  const brokerReady=broker?.status==='READY';
  restoringOperations.add(run.runId);
  const nativeSnapshots = new Map();
  try {
    const candidates = Object.values(registry.resourceState.operations).filter((op) => op.runId === run.runId &&
      !context.publicJob()?.revokedSessions?.includes(op.sessionId) &&
      op.contextId === run.contextId && (['PREPARED','ISSUING','UNKNOWN'].includes(op.state) ||
        op.state === 'CANCELLED' && op.completionDigest &&
          (!op.decision || ['approved','rejected'].includes(op.decision.status))) &&
      op.native?.onceAcknowledged !== true && op.rejectionOnly !== true &&
      (brokerReady || terminalTurnNoEffectCandidate(op) || nativeCancellationCandidate(op)));
    for (const stored of candidates) {
      const key = run.runId + ':' + stored.operationId;
      if (restoringOperations.has(key)) continue;
      restoringOperations.add(key);
      try {
        const current = registry.resourceState.operations[stored.operationId];
        if (!current || current.runId !== run.runId || current.state !== stored.state || current.native?.onceAcknowledged === true) continue;
        const cachedPrepared = current.state === 'PREPARED' && current.decision && context.hasRequest(current.requestId) &&
          context.decision(current.requestId)?.decision === current.decision.status &&
          !registry.restoredAccesses.has(current.accessId);
        if (!brokerReady && !terminalTurnNoEffectCandidate(current) && !nativeCancellationCandidate(current)) continue;
        if (context.isOperationReconciling(current.operationId) &&
            !(current.state === 'PREPARED' && !current.native)) continue;
        const operationSnapshot = structuredClone(current);
        const generation = nativeSessionGenerations.get(current.sessionId) || 0;
        const snapshotKey = current.sessionId + ':' + generation;
        if (!nativeSnapshots.has(snapshotKey)) nativeSnapshots.set(snapshotKey, Promise.all([
          openCode.messages(current.sessionId, run.directory),
          openCode.permissions(run.directory, { sessionIds:[current.sessionId], verifyInputs:true }),
        ]));
        const [messages, permissions] = await nativeSnapshots.get(snapshotKey);
        if (!Array.isArray(messages) || !Array.isArray(permissions) ||
            generation !== (nativeSessionGenerations.get(current.sessionId) || 0)) continue;
        const parts = messages.flatMap((message) => Array.isArray(message.parts) ? message.parts : []);
        const requestParts = nativeRequestValidationEntries(parts,current.requestId)
          .filter((entry)=>entry.status==='completed');
        if (requestParts.length !== 1) continue;
        const approval = requestParts[0].input;
        if (approval.operation_id !== current.operationId || approval.operation_digest !== current.operationDigest ||
            approval.run_id !== run.runId || approval.reservation_version !== current.version ||
            approval.session_id !== current.sessionId || approval.directory !== run.directory ||
            approval.change_id !== run.changeId) continue;
        const identityHash = createHash('sha256').update(JSON.stringify(nativeIdentity(approval))).digest('hex');
        const owner = registry.requestOwners[current.requestId];
        if (owner?.runId !== run.runId || owner.digest !== identityHash) continue;
        const cancelledProof = nativeCancelledValidationProof(parts, approval);
        const alreadyRejected = current.state === 'CANCELLED' && current.decision?.status === 'rejected' &&
          typeof current.completionDigest === 'string';
        let candidate;
        try { candidate = registry.operationCandidate(run.runId, approval,
          {terminalTurnNoEffect:terminalTurnNoEffectCandidate(current)}); }
        catch (cause) {
          if (cause.code !== 'resource-revision-stale' ||
              (!nativeRejectedValidationProof(parts, approval) && !cancelledProof)) continue;
          candidate = registry.operationCandidate(run.runId, approval, { checkCurrentRevisions:false });
        }
        if (candidate.identityDigest !== current.identityDigest || candidate.operationDigest !== current.operationDigest) continue;
        const alreadyCancelled = current.state === 'CANCELLED' && !current.native && (!current.decision || current.decision.status === 'approved') &&
          current.completionDigest === cancelledProof;
        if (cancelledProof && (current.state === 'PREPARED' && !current.native &&
            (!current.decision || current.decision.status === 'approved') || alreadyCancelled)) {
          if (alreadyCancelled) {
            context.restoreNativeCancelledValidation(approval, cancelledProof);
            continue;
          }
          const [secondMessages, secondPermissions, activeSessions] = await Promise.all([
            openCode.messages(current.sessionId, run.directory),
            openCode.permissions(run.directory, { sessionIds:[current.sessionId], verifyInputs:true }),
            openCode.sessionStatus(run.directory),
          ]);
          const secondParts = Array.isArray(secondMessages)
            ? secondMessages.flatMap((message) => Array.isArray(message.parts) ? message.parts : []) : [];
          const secondProof = nativeCancelledValidationProof(secondParts, approval);
          const permissionPending = permissions.some((permission) => permission.sessionID === current.sessionId) ||
            secondPermissions.some((permission) => permission.sessionID === current.sessionId);
          const linkedAccess = Object.values(registry.resourceState.accesses).some((access) =>
            access.accessId === current.accessId || access.operationIds.includes(current.operationId));
          if (secondProof && secondProof === cancelledProof && proofHash(messages) === proofHash(secondMessages) &&
              !permissionPending && !linkedAccess && !Object.hasOwn(activeSessions, current.sessionId) &&
              generation === (nativeSessionGenerations.get(current.sessionId) || 0) &&
              proofHash(registry.resourceState.operations[current.operationId]) === proofHash(operationSnapshot)) {
            registry.recordNativeCancelledValidation(run.runId, current.operationId, cancelledProof);
            context.restoreNativeCancelledValidation(approval, cancelledProof);
          }
          continue;
        }
        if (!brokerReady && !terminalTurnNoEffectCandidate(current)) continue;
        if (cachedPrepared) continue;
        if (current.state === 'PREPARED' && !current.decision || alreadyRejected) {
          let reconciled = alreadyRejected && context.decision(current.requestId)?.decision === 'rejected';
          if (!reconciled) {
            const [secondMessages, secondPermissions, activeSessions] = await Promise.all([
              openCode.messages(current.sessionId, run.directory),
              openCode.permissions(run.directory, { sessionIds:[current.sessionId], verifyInputs:true }),
              openCode.sessionStatus(run.directory),
            ]);
            const secondParts = Array.isArray(secondMessages)
              ? secondMessages.flatMap((message) => Array.isArray(message.parts) ? message.parts : []) : [];
            const firstProof = nativeRejectedValidationProof(parts, approval);
            const secondProof = nativeRejectedValidationProof(secondParts, approval);
            const permissionPending = permissions.some((permission) => permission.sessionID === current.sessionId) ||
              secondPermissions.some((permission) => permission.sessionID === current.sessionId);
            if (firstProof && firstProof === secondProof && proofHash(messages) === proofHash(secondMessages) &&
                !permissionPending && !Object.hasOwn(activeSessions, current.sessionId) &&
                generation === (nativeSessionGenerations.get(current.sessionId) || 0) &&
                proofHash(registry.resourceState.operations[current.operationId]) === proofHash(operationSnapshot)) {
              const proofDigest = proofHash({ runId:run.runId, contextId:run.contextId, operationId:current.operationId,
                requestId:current.requestId, approvalId:approval.approval_id, transcriptDigest:firstProof });
              if (alreadyRejected && current.completionDigest !== proofDigest) continue;
              context.restoreNativeRejectedOperation(approval, proofDigest);
              reconciled = true;
            }
          }
          if (reconciled || alreadyRejected) continue;
        }
        const outputs = parts.filter((part) => part?.type === 'tool' &&
          ['cgpt-validation_request_validation','cgpt-validation_get_approval','cgpt-validation_poll_approval'].includes(part.tool) &&
          part.state?.status === 'completed').flatMap((part) => {
            try { return [JSON.parse(part.state.output)]; } catch { return []; }
          }).filter((output) => output?.requestId === current.requestId && output?.approval_id === approval.approval_id);
        const terminal = outputs.filter((output) => output.status !== 'PENDING');
        if (!terminal.length || terminal.some((output) => output.status !== 'APPROVED' || output.reviewer !== 'CGPT') ||
            terminal.some((output) => JSON.stringify(nativeIdentity(output)) !== JSON.stringify(nativeIdentity(approval))) ||
            current.decision && (current.decision.status !== 'approved' || current.decision.approvalId !== approval.approval_id)) continue;
        const decision = terminal[terminal.length - 1];
        const operation = { ...candidate, native:current.native, toolInputSha256:approval.tool_input_sha256, shellBackground:approval.shell_background,
          target: approval.files?.length === 1 ? approval.files[0] : approval.commands?.[0],
          kind: approval.files?.length === 1 ? 'edit' : 'bash' };
        if(terminalTurnNoEffectCandidate(current)){
          if(permissions.some(permission=>permission.sessionID===current.sessionId))continue;
          const activeSessions=await openCode.sessionStatus(run.directory);
          if(!record(activeSessions)||Object.hasOwn(activeSessions,current.sessionId)||
              generation!==(nativeSessionGenerations.get(current.sessionId)||0))continue;
          let firstLog;
          try{firstLog=await openCode.sessionEventLog(current.sessionId,run.directory,{after:'0'});}catch{continue;}
          const proof=await verifyTerminalTurnNoEffectProof(run,context,current,approval,decision,operationSnapshot,
            messages,permissions,firstLog,generation);
          if(!proof)continue;
          await context.invalidateApprovedTerminalOperation(approval,decision);
          registry.reconcileTerminalTurnNoEffect(run.runId,current.operationId,proof);
          continue;
        }
        if(!brokerReady)continue;
        const pending = pendingOperationPermission(approval, operation, messages, permissions);
        if (!pending) {
          let durableLog=null,logFailure='';
          try { durableLog=await openCode.sessionEventLog(current.sessionId,run.directory); }
          catch(cause) { logFailure=/^[a-z][a-z0-9-]{1,90}$/.test(cause?.code||'')?cause.code:'session-log-unavailable'; }
          if (generation !== (nativeSessionGenerations.get(current.sessionId) || 0)) continue;
          const logWatermark=Number.isSafeInteger(durableLog?.watermark?.seq)?durableLog.watermark.seq:null;
          const logEvents=Array.isArray(durableLog?.events)?durableLog.events:[];
          const terminalParts = parts.filter((part) => part?.type === 'tool' &&
            (part.callID || part.callId) && ['edit','write','apply_patch','bash'].includes(part.tool) &&
            ['completed','error'].includes(part.state?.status));
          const matching = terminalParts.filter((part) => {
            const callId = part.callID || part.callId;
            const events = logEvents.filter((event) => event.callId === callId &&
              ['session.tool.success','session.tool.failed'].includes(event.type));
            return callId && events.length === 1 && eventMatchesNativePart(events[0], part, operation, approval);
          });
          const terminalProof = matching.length === 1 ? (() => {
            const part = matching[0], callId = part.callID || part.callId;
            const event = logEvents.find((candidateEvent) => candidateEvent.callId === callId &&
              ['session.tool.success','session.tool.failed'].includes(candidateEvent.type));
            const proofDigest = createHash('sha256').update(JSON.stringify({ runId:run.runId,
              operationId:current.operationId, requestId:current.requestId, approvalId:approval.approval_id,
              sessionId:current.sessionId, operationDigest:current.operationDigest,
              identityDigest:current.identityDigest, callId, eventType:event.type,
              sequence:event.sequence, watermark:logWatermark, inputDigest:event.inputDigest })).digest('hex');
            return { part, event, callId, proofDigest };
          })() : null;
          const access = registry.resourceState.accesses[current.accessId] || registry.acquireAccess(run.runId, {
            operationId:current.accessId, version:current.version, resources:current.resources,
            expectedRevisions:current.expectedRevisions, operationDigest:current.operationDigest,
            operationIds:[current.operationId],
          }, registry.isExclusive(run, current.resources));
          if (!['HELD','EXECUTING','UNKNOWN'].includes(access.state)) continue;
          await context.restoreApprovedTerminalOperation(approval, decision);
          const baseProof = { sessionId:current.sessionId, operationDigest:current.operationDigest,
            identityDigest:current.identityDigest, callId:terminalProof?.callId || current.native?.callId || null,
            toolStatus:terminalProof ? (terminalProof.event.type === 'session.tool.success' ? 'completed' : 'error') : 'absent',
            executed:terminalProof ? terminalProof.part.executed === true : null, logSynced:logWatermark!==null,
            logWatermark,
            proofDigest:terminalProof?.proofDigest || createHash('sha256').update(JSON.stringify({ runId:run.runId,
              operationId:current.operationId, requestId:current.requestId, approvalId:approval.approval_id,
              sessionId:current.sessionId, operationDigest:current.operationDigest,
              identityDigest:current.identityDigest, logWatermark,logFailure,
              terminalEvents:logEvents.filter((event) => ['session.tool.success','session.tool.failed'].includes(event.type))
                .map((event) => [event.callId,event.type,event.sequence]) })).digest('hex') };
          if (terminalProof?.event.type === 'session.tool.success') {
            registry.completeLoggedNative(run.runId,current.operationId,{...baseProof,
              callId:terminalProof.callId,status:'completed',finishedAt:Date.now(),
              partDigest:proofHash(terminalProof.part)});
          } else {
            registry.markTerminalUnknown(run.runId,current.operationId,baseProof);
          }
          continue;
        }
        const stableGeneration = nativeSessionGenerations.get(current.sessionId) || 0;
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));
        const [messagesAgain, permissionsAgain] = await Promise.all([
          openCode.messages(current.sessionId, run.directory),
          openCode.permissions(run.directory, { sessionIds:[current.sessionId], verifyInputs:true }),
        ]);
        if (stableGeneration !== (nativeSessionGenerations.get(current.sessionId) || 0)) continue;
        const pendingAgain = pendingOperationPermission(approval, operation, messagesAgain, permissionsAgain);
        if (!pendingAgain || pendingAgain.permissionId !== pending.permissionId || pendingAgain.callId !== pending.callId ||
            pendingAgain.proofDigest !== pending.proofDigest) continue;
        if (current.native) registry.restorePendingNative(run.runId, current.operationId, {
          permissionId:pending.permissionId, callId:pending.callId, pending:true,
          toolStatus:'running', executed:false, proofDigest:pending.proofDigest,
        });
        await context.restoreApprovedOperation(approval, decision, pending.callId);
      } catch (cause) {
        const code = /^[a-z][a-z0-9-]{1,90}$/.test(cause?.code || '') ? cause.code : 'operation-restore-unavailable';
        process.stderr.write('CAB operation restoration deferred: ' + code + '\n');
      } finally { restoringOperations.delete(key); }
    }
  } finally {
    restoringOperations.delete(run.runId);
    if (queuedOperationRestorations.delete(run.runId) && !closing) {
      void restoreApprovedOperations(registry.runs.get(run.runId), context);
    }
  }
}
function nativePartProof(operation, part, sessionId) {
  if (part?.state?.input?.background === true) return shellLifecycle.proof(operation,part,sessionId);
  if (!operation.native || operation.sessionId !== sessionId || part?.type !== 'tool' ||
      !(part.executed === true || part.executed === false && part.nativeFormat === 'opencode-v2') ||
      !['completed', 'error'].includes(part.state?.status)) return null;
  const state = part.state;
  const callId = part.callID || part.callId || null;
  if (operation.native.callId && operation.native.callId !== callId) return null;
  let kind;
  let target;
  if (part.tool === 'bash') {
    if (part.nativeTool === 'shell' && (state.input?.background === true ||
        (state.input?.workdir !== undefined && (typeof state.input.workdir !== 'string' || resolve(workspace, state.input.workdir) !== workspace)) ||
        (state.status === 'completed' && (state.metadata?.status !== 'completed' ||
          !Number.isInteger(state.metadata?.exit))))) return null;
    kind = 'bash'; target = state.input?.command;
  }
  else if (['edit', 'write', 'apply_patch'].includes(part.tool)) {
    kind = 'edit'; target = state.input?.filePath || state.input?.filepath || state.input?.path;
    if (part.tool === 'apply_patch') {
      const patch = state.input?.patchText || state.input?.patch;
      if (typeof patch !== 'string' || /^\*\*\* Move to:/m.test(patch)) return null;
      const paths = [...new Set([...patch.matchAll(/^\*\*\* (?:Add|Update|Delete) File: ([^\r\n]+)$/gm)].map((m) => m[1]))];
      if (paths.length !== 1) return null;
      target = paths[0];
    }
    if (typeof target === 'string' && isAbsolute(target)) target = relative(workspace, target);
  } else return null;
  if (typeof target !== 'string' || createHash('sha256').update(JSON.stringify([kind, target])).digest('hex') !==
      operation.native.targetDigest || !Number.isFinite(state.time?.start) || !Number.isFinite(state.time?.end) ||
      state.time.end < operation.native.startedAt || state.time.end < state.time.start ||
      (!operation.native.callId && state.time.start < Date.parse(operation.preparedAt))) return null;
  return { sessionId, permissionId: operation.native.permissionId, callId,
    finishedAt: state.time.end, status: state.status,
    exit: Number.isInteger(state.metadata?.exit) ? state.metadata.exit : null };
}
function nativeTimedOutShellPart(operation, part, sessionId) {
  if (!operation?.native || operation.sessionId !== sessionId || part?.type !== 'tool' ||
      part.tool !== 'bash' || part.nativeTool !== 'shell' || part.nativeFormat !== 'opencode-v2' ||
      part.executed !== false || part.state?.status !== 'completed' || part.state?.metadata?.timeout !== true ||
      Number.isInteger(part.state?.metadata?.exit)) return null;
  const callId = part.callID || part.callId || null;
  const command = part.state?.input?.command;
  if (!callId || (operation.native.callId && operation.native.callId !== callId) ||
      typeof command !== 'string' || !Number.isFinite(part.state?.time?.start) ||
      !Number.isFinite(part.state?.time?.end) || part.state.time.end < operation.native.startedAt ||
      part.state.time.end < part.state.time.start ||
      createHash('sha256').update(JSON.stringify([operation.native.kind || 'bash', command])).digest('hex') !==
        operation.native.targetDigest) return null;
  let output;
  try { output = typeof part.state.output === 'string' ? JSON.parse(part.state.output) : part.state.output; }
  catch { output = null; }
  if (output && typeof output === 'object' && (typeof output.shellID === 'string' || typeof output.shellId === 'string')) return null;
  return { sessionId, permissionId: operation.native.permissionId, callId,
    startedAt: part.state.time.start, finishedAt: part.state.time.end,
    timeout: true, partDigest: proofHash(part) };
}
function nativeEffectOutcome(part) {
  const state = part?.state;
  if (!state || !['completed','error'].includes(state.status)) throw new CoordinationError('native-outcome-not-proved');
  const errorFlag = state.metadata?.error === true;
  const status = state.status === 'error' || errorFlag ? 'error' : 'completed';
  return { status, proofStatus: state.status, exit: Number.isInteger(state.metadata?.exit) ? state.metadata.exit : null,
    partDigest: proofHash(part) };
}
function recordNativeEffectOutcome(runId, operation, part, proof) {
  registry.recordNativeOutcome(runId, operation.operationId, proof.shellId ?
    {status:proof.status,proofStatus:proof.status,exit:proof.exit,partDigest:proofHash(part)} : nativeEffectOutcome(part), proofHash(proof));
}
const noEnvironmentMcpTools = new Set(['search', 'cgpt-validation.request_validation', 'cgpt-validation.poll_approval',
  'cgpt-validation.get_approval', 'cgpt-validation.lookup_validation', 'cgpt-validation.reject', 'cgpt-validation.list_pending',
  'cgpt-validation.cancel_approval', 'cgpt-validation.broker_readiness', 'cgpt-validation.broker_health']);
function nativeNoEnvironmentObservation(part) {
  const status = part?.state?.status;
  if (part?.type !== 'tool' || !['completed', 'error'].includes(status)) return false;
  if (['cgpt-validation_request_validation', 'cgpt-validation_poll_approval', 'cgpt-validation_get_approval',
    'cgpt-validation_lookup_validation', 'cgpt-validation_reject', 'cgpt-validation_list_pending', 'cgpt-validation_cancel_approval',
    'cgpt-validation_broker_readiness', 'cgpt-validation_broker_health'].includes(part.tool)) return true;
  if (part.tool !== 'execute' || part.executed !== false || typeof part.state.input?.code !== 'string' ||
      part.state.metadata?.truncated !== false) return false;
  const calls = part.state.metadata.toolCalls;
  if (calls === undefined) return true;
  return Array.isArray(calls) && calls.every((call) => call && noEnvironmentMcpTools.has(call.tool) &&
    ['completed', 'error'].includes(call.status));
}
function rejectedNativeRequests(parts) {
  const approvalRequests = new Map(), rejected = new Set();
  const callsFor = (part) => {
    if (part.tool === 'cgpt-validation_request_validation') return [{ tool: 'cgpt-validation.request_validation',
      status: part.state?.status, input: part.state?.input }];
    if (part.tool === 'cgpt-validation_get_approval') return [{ tool: 'cgpt-validation.get_approval',
      status: part.state?.status, input: part.state?.input, output: part.state?.output }];
    if (part.tool === 'cgpt-validation_reject') return [{ tool: 'cgpt-validation.reject',
      status: part.state?.status, input: part.state?.input }];
    if (part.tool !== 'execute' || part.executed !== false || part.state?.metadata?.truncated !== false ||
        !Array.isArray(part.state.metadata.toolCalls)) return [];
    return part.state.metadata.toolCalls;
  };
  for (const part of parts) for (const call of callsFor(part)) {
    if (!call || !['completed','error'].includes(call.status) || !noEnvironmentMcpTools.has(call.tool)) continue;
    const input = call.input;
    if (call.tool === 'cgpt-validation.request_validation' && input &&
        typeof input.requestId === 'string' && typeof input.approval_id === 'string') {
      approvalRequests.set(input.approval_id, input.requestId);
    }
    if (call.tool === 'cgpt-validation.reject' && call.status === 'completed') {
      if (typeof input?.requestId === 'string') rejected.add(input.requestId);
      if (typeof input?.approval_id === 'string' && approvalRequests.has(input.approval_id)) {
        rejected.add(approvalRequests.get(input.approval_id));
      }
    }
    if (call.tool === 'cgpt-validation.get_approval' && call.status === 'completed' &&
        typeof input?.approval_id === 'string' && typeof call.output === 'string') {
      try {
        const output = JSON.parse(call.output);
        if (output?.status === 'REJECTED' && approvalRequests.has(input.approval_id)) {
          rejected.add(approvalRequests.get(input.approval_id));
        }
      } catch { /* Native history will remain unreviewable when a lookup is malformed. */ }
    }
  }
  return rejected;
}
function nativeRejectedValidationProof(parts, approval) {
  const allowed = new Set(['cgpt-validation.request_validation','cgpt-validation.reject','cgpt-validation.get_approval']);
  const entries = [];
  for (const part of parts) {
    if (part?.type !== 'tool') continue;
    if (part.tool === 'execute') {
      if (part.executed !== false || part.state?.metadata?.truncated !== false ||
          !Array.isArray(part.state?.metadata?.toolCalls) || part.state?.status !== 'completed') {
        entries.push({ tool:'untrusted-wrapper', status:part.state?.status }); continue;
      }
      for (const call of part.state.metadata.toolCalls) {
        entries.push(call && typeof call === 'object' ? call : { tool:'invalid-call', status:'invalid' });
      }
      continue;
    }
    const name = ({ 'cgpt-validation_request_validation':'cgpt-validation.request_validation',
      'cgpt-validation_reject':'cgpt-validation.reject', 'cgpt-validation_get_approval':'cgpt-validation.get_approval' })[part.tool];
    entries.push({ tool:name || 'unknown', status:part.state?.status, input:part.state?.input, output:part.state?.output });
  }
  const requests = entries.map((entry,index) => ({entry,index})).filter(({entry}) =>
    entry.tool === 'cgpt-validation.request_validation' && entry.input?.requestId === approval.requestId);
  if (requests.length !== 1 || requests[0].entry.status !== 'completed' ||
      proofHash(nativeIdentity(requests[0].entry.input)) !== proofHash(nativeIdentity(approval))) return null;
  const suffix = entries.slice(requests[0].index);
  if (suffix.length !== 3 || suffix[0]?.tool !== 'cgpt-validation.request_validation' ||
      suffix[1]?.tool !== 'cgpt-validation.reject' || suffix[2]?.tool !== 'cgpt-validation.get_approval' ||
      suffix.some((entry) => !allowed.has(entry.tool) || entry.status !== 'completed')) return null;
  const rejects = suffix.filter((entry) => entry.tool === 'cgpt-validation.reject' &&
    entry.input?.approval_id === approval.approval_id &&
    (entry.input.requestId === undefined || entry.input.requestId === approval.requestId));
  const lookups = suffix.filter((entry) => entry.tool === 'cgpt-validation.get_approval' &&
    entry.input?.approval_id === approval.approval_id);
  if (rejects.length !== 1 || lookups.length !== 1) return null;
  let result;
  try { result = typeof lookups[0].output === 'string' ? JSON.parse(lookups[0].output) : lookups[0].output; }
  catch { return null; }
  if (result?.status !== 'REJECTED' || result.reviewer !== 'CGPT' ||
      result.requestId !== approval.requestId || result.approval_id !== approval.approval_id ||
      proofHash(nativeIdentity(result)) !== proofHash(nativeIdentity(approval))) return null;
  return proofHash({ approval:nativeIdentity(approval), request:requests[0].entry,
    rejection:rejects[0], terminal:lookups[0], suffix });
}
function nativeRequestValidationEntries(parts, requestId) {
  const entries=[];
  for(const part of parts){
    if(part?.type!=='tool')continue;
    if(part.tool==='cgpt-validation_request_validation'&&part.state?.input?.requestId===requestId){
      entries.push({input:part.state.input,status:part.state.status,part});continue;
    }
    if(part.tool!=='execute'||part.executed!==false||part.state?.status!=='completed'||
        part.state?.metadata?.truncated!==false||!Array.isArray(part.state?.metadata?.toolCalls))continue;
    for(const call of part.state.metadata.toolCalls)if(call?.tool==='cgpt-validation.request_validation'&&
        call.input?.requestId===requestId)entries.push({input:call.input,status:call.status,part,call});
  }
  return entries;
}
function exactCancelApprovalWrapper(wrapper, approval) {
  if(!wrapper||wrapper.tool!=='execute'||wrapper.executed!==false||wrapper.status!=='completed'||
      wrapper.truncated!==false||!Array.isArray(wrapper.toolCalls)||wrapper.toolCalls.length!==2)return false;
  const [search,cancel]=wrapper.toolCalls;
  if(search?.tool!=='search'||search.status!=='completed'||
      JSON.stringify(search.input)!==JSON.stringify({query:'cancel_approval',namespace:'cgpt-validation',limit:20})||
      cancel?.tool!=='cgpt-validation.cancel_approval'||cancel.status!=='completed'||
      JSON.stringify(cancel.input)!==JSON.stringify({approval_id:approval.approval_id}))return false;
  const code=typeof wrapper.code==='string'?wrapper.code:'';
  const expected=`const r = await search({query: "cancel_approval", namespace: "cgpt-validation", limit: 20}); if (r.items[0].path !== 'tools["cgpt-validation"].cancel_approval') throw new Error("UNEXPECTED_PATH"); return await tools["cgpt-validation"].cancel_approval({approval_id: ${JSON.stringify(approval.approval_id)}});`;
  return code===expected;
}
function nativeCancelledValidationProof(parts, approval, { allowApprovedHistory = false } = {}) {
  const allowed = new Set(['cgpt-validation.request_validation','cgpt-validation.cancel_approval',
    'cgpt-validation.get_approval','cgpt-validation.poll_approval','search']);
  const entries = [];
  for (const part of parts) {
    if (part?.type !== 'tool') continue;
    if (part.tool === 'execute') {
      if (part.executed !== false || part.state?.metadata?.truncated !== false ||
          !Array.isArray(part.state?.metadata?.toolCalls) || part.state?.status !== 'completed') {
        entries.push({ tool:'untrusted-wrapper', status:part.state?.status }); continue;
      }
      const wrapper={tool:'execute',callID:part.callID,code:part.state?.input?.code,output:part.state?.output,
        status:part.state.status,executed:part.executed,truncated:part.state.metadata.truncated,
        toolCalls:part.state.metadata.toolCalls};
      for (const call of part.state.metadata.toolCalls) entries.push(call && typeof call === 'object'
        ? {...call,wrapper} : { tool:'invalid-call', status:'invalid',wrapper });
      continue;
    }
    const name = ({ 'cgpt-validation_request_validation':'cgpt-validation.request_validation',
      'cgpt-validation_cancel_approval':'cgpt-validation.cancel_approval',
      'cgpt-validation_get_approval':'cgpt-validation.get_approval',
      'cgpt-validation_poll_approval':'cgpt-validation.poll_approval' })[part.tool];
    entries.push({ tool:name || 'unknown', status:part.state?.status, input:part.state?.input,
      output:part.state?.output });
  }
  const requests = entries.map((entry,index) => ({entry,index})).filter(({entry}) =>
    entry.tool === 'cgpt-validation.request_validation' && entry.input?.requestId === approval.requestId);
  if (requests.length !== 1 || requests[0].entry.status !== 'completed' ||
      proofHash(nativeIdentity(requests[0].entry.input)) !== proofHash(nativeIdentity(approval))) return null;
  const suffix = entries.slice(requests[0].index);
  if (suffix.some((entry) => !allowed.has(entry.tool) || entry.status !== 'completed')) return null;
  const searches=suffix.filter((entry)=>entry.tool==='search');
  if(searches.some((entry)=>!exactCancelApprovalWrapper(entry.wrapper,approval)))return null;
  const cancels = suffix.filter((entry) => entry.tool === 'cgpt-validation.cancel_approval');
  if (cancels.some((entry) => entry.input?.approval_id !== approval.approval_id) || cancels.length > 1) return null;
  const terminal = [];
  for(const entry of cancels){
    let result;
    if(entry.wrapper){
      if(!exactCancelApprovalWrapper(entry.wrapper,approval))return null;
      try{result=typeof entry.wrapper.output==='string'?JSON.parse(entry.wrapper.output):entry.wrapper.output;}catch{return null;}
    }else{
      try{result=typeof entry.output==='string'?JSON.parse(entry.output):entry.output;}catch{return null;}
    }
    if(result?.status!=='CANCELLED'||result.cancelled_by!=='OC'||result.requestId!==approval.requestId||
        result.approval_id!==approval.approval_id||proofHash(nativeIdentity(result))!==proofHash(nativeIdentity(approval)))return null;
    terminal.push(entry);
  }
  const lookups = suffix.filter((entry) => ['cgpt-validation.get_approval','cgpt-validation.poll_approval'].includes(entry.tool));
  for (const entry of lookups) {
    if (entry.input?.approval_id !== approval.approval_id) return null;
    let result;
    try { result = typeof entry.output === 'string' ? JSON.parse(entry.output) : entry.output; }
    catch { return null; }
    if (result?.status === 'PENDING') {
      if(result.requestId!==approval.requestId||result.approval_id!==approval.approval_id||
          proofHash(nativeIdentity(result))!==proofHash(nativeIdentity(approval)))return null;
      continue;
    }
    if (allowApprovedHistory && result?.status === 'APPROVED' && result.reviewer === 'CGPT' &&
        result.requestId === approval.requestId && result.approval_id === approval.approval_id &&
        proofHash(nativeIdentity(result)) === proofHash(nativeIdentity(approval)) &&
        cancels.some(cancel => suffix.indexOf(cancel) > suffix.indexOf(entry))) continue;
    if (result?.status !== 'CANCELLED' || result.cancelled_by !== 'OC' ||
        result.requestId !== approval.requestId || result.approval_id !== approval.approval_id ||
        proofHash(nativeIdentity(result)) !== proofHash(nativeIdentity(approval))) return null;
    terminal.push(entry);
  }
  if (!terminal.length || suffix.some((entry) =>
      entry.tool === 'cgpt-validation.request_validation' && entry !== requests[0].entry)) return null;
  return proofHash({ approval:nativeIdentity(approval), request:requests[0].entry,
    cancellation:terminal.at(-1), suffix });
}
const noEffectToolNames=new Set(['bash','shell','edit','write','apply_patch','delete','move','rename','install','execute_command']);
const noEffectReadOnlyToolNames=new Set(['search','read','glob','grep','list','find','webfetch','web_search','websearch',
  'cgpt-validation.request_validation','cgpt-validation.get_approval','cgpt-validation.poll_approval',
  'cgpt-validation.broker_readiness','cgpt-validation.broker_health','cgpt-validation.cancel_approval',
  'cgpt-validation_request_validation','cgpt-validation_get_approval','cgpt-validation_poll_approval',
  'cgpt-validation_broker_readiness','cgpt-validation_broker_health','cgpt-validation_cancel_approval','cab_codemode_discovery']);
const record=(value)=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const hash=(value)=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
function nativeTerminalTurnNoEffectProof(messages,approval,operation,run,log,approvedResult){
  if(!Array.isArray(messages)||!record(log)||log.sessionId!==operation.sessionId||log.after!=='0'||
      !record(log.watermark)||log.watermark.aggregateID!==operation.sessionId||!Number.isSafeInteger(log.watermark.seq)||
      !Array.isArray(log.events)||approvedResult?.status!=='APPROVED'||approvedResult.reviewer!=='CGPT'||
      approvedResult.requestId!==approval.requestId||approvedResult.approval_id!==approval.approval_id||
      proofHash(nativeIdentity(approvedResult))!==proofHash(nativeIdentity(approval)))return null;
  const parts=messages.flatMap(message=>Array.isArray(message.parts)?message.parts:[]);
  const requests=nativeRequestValidationEntries(parts,approval.requestId).filter(entry=>entry.status==='completed');
  if(requests.length!==1||proofHash(requests[0].input)!==proofHash(approval))return null;
  const requestPart=requests[0].part,metadata=requestPart?.state?.metadata,calls=metadata?.toolCalls;
  if(requestPart?.tool!=='cgpt-validation_request_validation'||requestPart.executed!==false||
      requestPart.state?.status!=='completed'||metadata?.truncated!==false||
      !record(metadata?.cabCodeMode)||!hash(metadata.cabCodeMode.envelopeHash)||
      metadata.cabCodeMode.wrapperId!==requestPart.callID||!Array.isArray(calls)||calls.length!==1||
      calls[0]?.tool!=='cgpt-validation.request_validation'||calls[0]?.status!=='completed'||
      proofHash(calls[0].input)!==proofHash(approval))return null;
  let wrapperResult;try{wrapperResult=JSON.parse(requestPart.state.output)}catch{return null;}
  if(wrapperResult?.status!=='APPROVED'||wrapperResult.reviewer!=='CGPT'||
      wrapperResult.requestId!==approval.requestId||wrapperResult.approval_id!==approval.approval_id||
      proofHash(nativeIdentity(wrapperResult))!==proofHash(nativeIdentity(approval))||
      proofHash(wrapperResult)!==proofHash(approvedResult))return null;
  const requestMessageIndex=messages.findIndex(message=>Array.isArray(message.parts)&&message.parts.includes(requestPart));
  if(requestMessageIndex<0)return null;
  const requestMessage=messages[requestMessageIndex],userId=requestMessage.info?.parentID;
  if(requestMessage.info?.role!=='assistant'||requestMessage.info?.finish!=='tool-calls'||
      typeof userId!=='string'||!userId)return null;
  const userIndices=messages.map((message,index)=>message.info?.role==='user'&&message.info.id===userId?index:-1)
    .filter(index=>index>=0);
  const assistantTurns=messages.map((message,index)=>({message,index})).filter(({message})=>
    message.info?.role==='assistant'&&message.info.parentID===userId);
  if(userIndices.length!==1||assistantTurns.length!==2||assistantTurns[0].message!==requestMessage)return null;
  const userIndex=userIndices[0],final=assistantTurns[1].message,finalIndex=assistantTurns[1].index;
  if(userIndex+1!==requestMessageIndex||finalIndex!==requestMessageIndex+1||
      final.info?.finish!=='stop'||!Array.isArray(final.parts)||
      final.parts.some(part=>part?.type==='tool'))return null;
  const turnIds=new Set([userId,requestMessage.info.id,final.info.id]);
  const messageIndexById=new Map(messages.map((message,index)=>[message.info?.id,index]).filter(([id])=>typeof id==='string'));
  const terminalBoundary=operation.nativeRecovery?.logWatermark??0;
  for(let index=userIndex;index<=finalIndex;index++){
    const message=messages[index];
    for(const part of Array.isArray(message.parts)?message.parts:[]){
      if(part?.type!=='tool')continue;
      if(index===requestMessageIndex&&part===requestPart)continue;
      if(noEffectToolNames.has(part.tool))return null;
      if(part.tool==='execute'){
        const nested=part.state?.metadata?.toolCalls;
        if(part.executed!==false||part.state?.status!=='completed'||part.state?.metadata?.truncated!==false||!Array.isArray(nested)||
            nested.some(call=>noEffectToolNames.has(call?.tool)||!noEffectReadOnlyToolNames.has(call?.tool)))return null;
      }else if(!noEffectReadOnlyToolNames.has(part.tool))return null;
    }
  }
  for(const event of log.events){
    const eventIndex=messageIndexById.get(event.messageId);
    if(!turnIds.has(event.messageId)){
      if(typeof event.messageId==='string'&&event.messageId&&eventIndex===undefined)return null;
      if(eventIndex!==undefined&&eventIndex<userIndex)continue;
      if(Number.isSafeInteger(event.sequence)&&event.sequence>terminalBoundary)continue;
      return null;
    }
    if(event.messageId===requestMessage.info.id&&event.callId===requestPart.callID&&
        event.toolName==='execute'&&['session.tool.called','session.tool.success'].includes(event.type))continue;
    return null;
  }
  const proof={runId:run.runId,contextId:run.contextId,operationId:operation.operationId,requestId:approval.requestId,
    approvalId:approval.approval_id,sessionId:operation.sessionId,directory:run.directory,
    operationDigest:operation.operationDigest,identityDigest:operation.identityDigest,
    userMessageId:userId,requestMessageId:requestMessage.info.id,wrapperId:requestPart.callID,
    finalMessageId:final.info.id,finish:'stop',transcriptDigest:proofHash(messages),
    eventLogDigest:proofHash(log),logWatermark:log.watermark.seq,finishedAt:Number.isFinite(final.info.time?.completed)
      ? final.info.time.completed : Number.isFinite(final.info.time?.created) ? final.info.time.created : Date.now()};
  proof.proofDigest=proofHash(proof);return proof;
}
function terminalTurnNoEffectCandidate(operation){
  return operation?.state==='UNKNOWN'&&operation.decision?.status==='approved'&&!operation.native&&
    !operation.nativeResult&&operation.nativeRecovery?.boundary==='TOOL_TERMINAL_UNCLASSIFIED'&&
    operation.nativeRecovery.permissionId===null&&operation.nativeRecovery.callId===null&&
    operation.onceAcknowledged!==true&&!operation.testReservationId;
}
async function collectRecoveryEvidence(run, operation) {
  if (!operation || operation.runId !== run.runId || operation.contextId !== run.contextId)
    throw new CoordinationError('recovery-target-divergent');
  const generation = nativeSessionGenerations.get(operation.sessionId) || 0;
  const native = await openCode.info(true);
  const [session, messages, permissions, activeSessions] = await Promise.all([
    openCode.session(operation.sessionId, run.directory), openCode.messages(operation.sessionId, run.directory),
    openCode.permissions(run.directory, { sessionIds: [operation.sessionId] }), openCode.sessionStatus(run.directory),
  ]);
  if (session.id !== operation.sessionId || session.directory !== run.directory ||
      generation !== (nativeSessionGenerations.get(operation.sessionId) || 0))
    throw new CoordinationError('recovery-native-boundary-changed');
  const allParts = messages.flatMap(message => Array.isArray(message.parts) ? message.parts : []);
  const entries = nativeRequestValidationEntries(allParts, operation.requestId).filter(entry => entry.status === 'completed');
  if (entries.length !== 1) throw new CoordinationError('recovery-native-request-unverified');
  const approval = entries[0].input;
  const owner = registry.requestOwners[operation.requestId];
  const identity = createHash('sha256').update(JSON.stringify(nativeIdentity(approval))).digest('hex');
  if (approval.operation_id !== operation.operationId || approval.operation_digest !== operation.operationDigest ||
      approval.run_id !== run.runId || approval.change_id !== run.changeId || approval.directory !== run.directory ||
      approval.session_id !== operation.sessionId || approval.reservation_version !== operation.version ||
      owner?.runId !== run.runId || owner.digest !== identity) throw new CoordinationError('recovery-native-identity-divergent');
  const parts = allParts.slice(allParts.indexOf(entries[0].part));
  let journal = null, journalError = null, replies = { receipts: [], truncated: false }, replyError = null;
  try { journal = await openCode.sessionEventLog(operation.sessionId, run.directory); }
  catch (cause) { journalError = /^[a-z][a-z0-9-]{1,99}$/.test(cause.code || '') ? cause.code : 'native-journal-unavailable'; }
  try { replies = openCode.permissionReplies(operation.sessionId, run.directory); }
  catch { replyError = 'permission-reply-journal-unavailable'; }
  const view = nativeEvidenceView({ run, operation, approval, parts, native, activeSessions, permissions, journal, replies });
  // Availability errors are part of the boundary, never evidence of an absent effect.
  let nativeInstanceEvidence = null;
  if (operation.native) { try { nativeInstanceEvidence = await nativeInstances.proof(native, operation.native.startedAt); } catch { /* An unavailable instance record never proves a boundary. */ } }
  const publicView = { ...view, journalError, replyError, nativeInstanceEvidence,
    nativeInstanceEvidenceStatus: operation.native ? nativeInstanceEvidence ? 'AVAILABLE' : 'PRIOR_INSTANCE_EVIDENCE_MISSING' : 'NOT_REQUIRED_FOR_UNISSUED_VALIDATION' };
  publicView.nativeBoundaryDigest = proofHash(publicView);
  return { view: publicView, approval, parts, messages, generation };
}

async function reconcileValidationBoundary(run,context,payload,actionId,terminal,withdraw=false) {
  registry.admission(run.runId);
  const op=registry.resourceState.operations[payload.operationId];
  if(!op || op.runId!==run.runId || op.contextId!==run.contextId || op.state!=='PREPARED' || op.native || op.nativeResult ||
      (terminal||withdraw ? op.decision?.status!=='approved' : Boolean(op.decision)) ||
      Object.values(registry.resourceState.accesses).some(a=>a.accessId===op.accessId||a.operationIds.includes(op.operationId)))
    throw new CoordinationError('validation-boundary-recovery-invalid');
  if(context.publicStatus().recoveryRequired || !context.publicJob()?.armed ||
      context.publicJob().sessionId!==op.sessionId || context.publicJob().currentCabMandate &&
      context.publicJob().currentCabMandate!==op.requestId) throw new CoordinationError('validation-boundary-context-divergent');
  const original=proofHash(op),first=await collectRecoveryEvidence(run,op);
  if(first.view.nativeBoundaryDigest!==payload.nativeBoundaryDigest || !first.view.sessionIdle || first.view.pendingPermissionCount)
    throw new CoordinationError('recovery-native-boundary-changed');
  const same=value=>proofHash(nativeIdentity(value))===proofHash(nativeIdentity(first.approval));
  registry.operationCandidate(run.runId,first.approval,{checkCurrentRevisions:!withdraw});
  const closedReviews=terminal?recovery.closedValidationReviews(run.runId).filter(old=>old.operationId!==op.operationId):[];
  const requested=new Set(closedReviews.map(old=>old.requestId)),requestIndex=new Map(),cancelIndex=new Map();
  const addEntry=(id,entry)=>{if(requested.has(id)){const entries=requestIndex.get(id)||[];entries.push(entry);requestIndex.set(id,entries);}};
  for(const part of terminal?first.parts:[]) {
    if(part.tool==='cgpt-validation_cancel_approval'||part.tool==='execute'&&
      part.state?.metadata?.toolCalls?.some(call=>call.tool==='cgpt-validation.cancel_approval')) {
      let output;try{output=JSON.parse(part.state?.output);}catch{}
      if(output?.status==='CANCELLED'&&typeof output.approval_id==='string') {
        const list=cancelIndex.get(output.approval_id)||[];list.push({part,output});cancelIndex.set(output.approval_id,list);
      }
    }
    if(part.tool==='cgpt-validation_request_validation'&&part.state?.status==='completed')addEntry(part.state.input?.requestId,{input:part.state.input,part});
    else if(part.tool==='execute'&&part.executed===false&&part.state?.status==='completed'&&part.state.metadata?.truncated===false)
      for(const call of part.state.metadata.toolCalls||[])if(call?.tool==='cgpt-validation.request_validation'&&call.status==='completed')
        addEntry(call.input?.requestId,{input:call.input,part});
  }
  const priorReviews=closedReviews.flatMap(old=>{
    const entries=requestIndex.get(old.requestId)||[];
    if(entries.length!==1)return [];
    const approval=entries[0].input,owner=registry.requestOwners[old.requestId];
    if(owner?.runId!==run.runId||owner.digest!==createHash('sha256').update(JSON.stringify(nativeIdentity(approval))).digest('hex'))return [];
    const sameOld=value=>proofHash(nativeIdentity(value))===proofHash(nativeIdentity(approval));
    const wrappers=[...(old.review.wrapperReviews||[])],cancelParts=[];
    for(const {part,output} of cancelIndex.get(approval.approval_id)||[]) {
      const wrapper={tool:part.tool,executed:part.executed,status:part.state?.status,code:part.state?.input?.code,
        truncated:part.state?.metadata?.truncated,toolCalls:part.state?.metadata?.toolCalls};
      if(!sameOld(output))continue;
      if(exactCancelApprovalWrapper(wrapper,approval)&&!wrappers.some(w=>w.callId===(part.callID||part.callId)))
        wrappers.push({callId:part.callID||part.callId,codeSha256:createHash('sha256').update(wrapper.code).digest('hex'),effect:'VALIDATION_TRANSPORT_ONLY',returnsNativeResult:true});
      if(part.tool==='cgpt-validation_cancel_approval'&&part.state?.status==='completed'&&part.state.input?.approval_id===approval.approval_id)
        cancelParts.push({callId:part.callID||part.callId,partDigest:proofHash(part)});
    }
    return [{...old,review:{...old.review,wrapperReviews:wrappers},approval,cancelParts,
      sourceCallId:entries[0].part.callID||entries[0].part.callId,sameIdentity:sameOld,notAdmitted:id=>!registry.requestOwners[id]}];
  });
  let observation;
  if(terminal) {
    const history=excludeClosedValidationParts(first.parts,priorReviews,run,payload.review.callId);
    observation={...reviewedTerminalProof(history.parts,first.approval,payload.review,run,same,id=>!registry.requestOwners[id]),
      excludedPriorReviews:history.excluded};
    for(const source of payload.review.sourceFiles) {
      if(!op.resources.some(r=>r.key==='project:*'||r.key==='file:'+source.path||r.key.startsWith('file:')&&('file:'+source.path).startsWith(r.key+'/')))
        throw new CoordinationError('terminal-review-source-outside-operation');
      registry.scope(run.runId,run.version,[{key:'file:'+source.path,mode:'read'}]);
      const file=await openCode.sourceRead(op.sessionId,source.path,{directory:run.directory});
      if(file.sha256!==source.sha256)throw new CoordinationError('terminal-review-source-divergent');
    }
  } else if(withdraw) {
    proofReferences(payload);
    const effects=first.parts.filter(p=>p.type==='tool'&&p.tool!=='cab_codemode_discovery'&&!nativeNoEnvironmentObservation(p));
    observation=effects.length?rejectedEditWithdrawalProof(first.view,effects,first.approval):
      {kind:'UNISSUED_COORDINATION',executionOutcome:'COORDINATION_WITHDRAWN_BEFORE_ISSUANCE',evidenceAuthority:'OWNER_NATIVE_BOUNDARY_REVIEW'};
    context.verifyNativeCancelledValidation(first.approval,proofHash(payload));
  } else {
    if(context.hasRequest(op.requestId) && !context.pendingRestorationProof(op.requestId))throw new CoordinationError('pending-restore-already-present');
    observation=pendingValidationProof(first.parts,first.approval,same);
    if(first.view.calls.some(call=>call.commandSha256===first.view.commandSha256))throw new CoordinationError('pending-restore-native-effect-observed');
  }
  const second=await collectRecoveryEvidence(run,op);
  if(first.view.nativeBoundaryDigest!==second.view.nativeBoundaryDigest || proofHash(first.messages)!==proofHash(second.messages) ||
      generationChanged(op.sessionId,first.generation) || proofHash(op)!==original)
    throw new CoordinationError('recovery-native-boundary-changed');
  if(terminal) {
    const history=excludeClosedValidationParts(second.parts,priorReviews,run,payload.review.callId);
    if(proofHash(history.excluded)!==proofHash(observation.excludedPriorReviews))throw new CoordinationError('terminal-prior-review-boundary-changed');
    reviewedTerminalProof(history.parts,second.approval,payload.review,run,same,id=>!registry.requestOwners[id]);
  }
  else if(withdraw) {
    const effects=second.parts.filter(p=>p.type==='tool'&&p.tool!=='cab_codemode_discovery'&&!nativeNoEnvironmentObservation(p));
    if(effects.length){const repeated=rejectedEditWithdrawalProof(second.view,effects,second.approval);
      if(proofHash(repeated)!==proofHash(observation))throw new CoordinationError('recovery-native-boundary-changed');}
    else if(observation.kind!=='UNISSUED_COORDINATION')throw new CoordinationError('recovery-native-boundary-changed');
  } else pendingValidationProof(second.parts,second.approval,same);
  if(terminal) for(const source of payload.review.sourceFiles) {
    const file=await openCode.sourceRead(op.sessionId,source.path,{directory:run.directory});
    if(file.sha256!==source.sha256)throw new CoordinationError('terminal-review-source-divergent');
  }
  if(generationChanged(op.sessionId,first.generation)||proofHash(op)!==original)throw new CoordinationError('recovery-native-boundary-changed');
  registry.operationCandidate(run.runId,first.approval,{checkCurrentRevisions:!withdraw});
  const proofDigest=proofHash(payload);
  recovery.observeAction(actionId,{...observation,approval:structuredClone(first.approval)});
  if(terminal) {
    // Invalidate the local executable answer before closing coordination.
    context.completeReviewedTerminal(first.approval,proofDigest);
    registry.completeReviewedReadOnly(run.runId,op.operationId,proofDigest);
  } else if(withdraw) {
    context.withdrawUnissuedValidation(first.approval,proofDigest);
    registry.recordNativeCancelledValidation(run.runId,op.operationId,proofDigest);
    registry.withdrawnUnissuedOperations ||= new Set();registry.withdrawnUnissuedOperations.add(op.operationId);
  } else context.restorePendingValidation(first.approval,proofDigest);
  return {state:terminal?'COMPLETED':withdraw?'CANCELLED':'PENDING',operationState:terminal?'COMPLETED':withdraw?'CANCELLED':'PREPARED',
    runId:run.runId,operationId:op.operationId,proofDigest,
    ...(terminal||withdraw?{executionOutcome:observation.executionOutcome,evidenceAuthority:observation.evidenceAuthority}:{})};
}

async function cancelReviewedValidation(run, context, payload) {
  registry.admission(run.runId);
  if (!record(payload) || !payload.review || !/^[a-f0-9]{64}$/.test(payload.nativeBoundaryDigest || '') ||
      typeof payload.operationId !== 'string') throw new CoordinationError('recovery-readonly-review-invalid');
  const operation = registry.resourceState.operations[payload.operationId];
  const linkedAccess = operation && Object.values(registry.resourceState.accesses).some(access =>
    access.accessId === operation.accessId || access.operationIds.includes(operation.operationId));
  if (operation?.runId !== run.runId || operation.contextId !== run.contextId || operation.state !== 'PREPARED' ||
      operation.decision?.status !== 'approved' || operation.native || linkedAccess)
    throw new CoordinationError('recovery-readonly-review-boundary-invalid');
  const operationSnapshot = proofHash(operation);
  const first = await collectRecoveryEvidence(run, operation);
  if (first.view.nativeBoundaryDigest !== payload.nativeBoundaryDigest)
    throw new CoordinationError('recovery-native-boundary-changed');
  const review = validateReadOnlyReview(first.view, payload.review, run);
  for (const source of payload.review.sourceFiles) {
    const resource = { key: 'file:' + source.path, mode: 'read' };
    if (!operation.resources.some(scope => (scope.key === resource.key || scope.key === 'project:*' ||
        scope.key.startsWith('file:') && resource.key.startsWith(scope.key + '/'))))
      throw new CoordinationError('recovery-readonly-review-source-outside-operation');
    registry.scope(run.runId, run.version, [resource]);
    const observed = await openCode.sourceRead(operation.sessionId, source.path, { directory: run.directory });
    if (observed.sha256 !== source.sha256) throw new CoordinationError('recovery-readonly-review-source-divergent');
  }
  const rejected = new Set(review.callIds);
  const filtered = first.parts.filter(part => !rejected.has(part.callID || part.callId));
  const projected = reviewedValidationProjection(filtered, first.approval, payload.review.wrapperReviews, {
    run, sameApproval: value => proofHash(nativeIdentity(value)) === proofHash(nativeIdentity(first.approval)),
    notAdmitted: requestId => !registry.requestOwners[requestId],
  });
  const cancellation = nativeCancelledValidationProof(projected, first.approval, { allowApprovedHistory: true });
  if (!cancellation) throw new CoordinationError('recovery-native-cancellation-unverified');
  const second = await collectRecoveryEvidence(run, operation);
  if (first.view.nativeBoundaryDigest !== second.view.nativeBoundaryDigest ||
      proofHash(first.messages) !== proofHash(second.messages) || first.generation !== second.generation ||
      proofHash(registry.resourceState.operations[operation.operationId]) !== operationSnapshot ||
      generationChanged(operation.sessionId, first.generation))
    throw new CoordinationError('recovery-native-boundary-changed');
  validateReadOnlyReview(second.view, payload.review, run);
  if (typeof context.verifyNativeCancelledValidation !== 'function' || context.publicStatus().recoveryRequired)
    throw new CoordinationError('recovery-context-unavailable');
  context.verifyNativeCancelledValidation(first.approval, cancellation);
  const proofDigest = proofHash(payload);
  registry.recordNativeCancelledValidation(run.runId, operation.operationId, proofDigest);
  registry.reviewedReadOnlyOperations ||= new Set(); registry.reviewedReadOnlyOperations.add(operation.operationId);
  context.restoreNativeCancelledValidation(first.approval, cancellation);
  return { state: 'CANCELLED', operationId: operation.operationId, runId: run.runId, proofDigest,
    evidenceAuthority: review.evidenceAuthority, executionOutcome: review.executionOutcome };
}
function generationChanged(sessionId, generation) {
  return generation !== (nativeSessionGenerations.get(sessionId) || 0);
}
function portRecoveryCandidate(run, operationId) {
  const op = registry.resourceState.operations[operationId], access = op && registry.resourceState.accesses[op.accessId];
  if (!op || op.runId !== run.runId || op.contextId !== run.contextId || !['EXECUTING','UNKNOWN'].includes(op.state) ||
      op.native?.onceAcknowledged !== true || op.nativeResult || op.resources.length !== 1 ||
      op.resources[0].mode !== 'write' || !op.resources[0].key.startsWith('port:') ||
      access?.timeoutQuarantine?.operationId !== operationId || access.operationIds.length !== 1)
    throw new CoordinationError('port-recovery-boundary-invalid');
  const port = Number(op.resources[0].key.split('/').at(-1));
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new CoordinationError('port-recovery-boundary-invalid');
  return { op, access, port, resourceKey: op.resources[0].key };
}
async function portProbeInfrastructure() {
  if (!broker?.broker_process?.pid) return [];
  const identity = await processIdentity(broker.broker_process.pid);
  if (!identity || identity.state === 'Z') throw new CoordinationError('port-recovery-broker-identity-unavailable');
  return [{ pid: identity.pid, startTime: identity.startTime }];
}
async function reconcilePortFromProbes(run, payload, actionId) {
  registry.admission(run.runId); validatePortReview(payload.review, run.ownerId);
  const { op, access, port, resourceKey } = portRecoveryCandidate(run, payload.operationId);
  if (!Array.isArray(payload.probeOperationIds) || payload.probeOperationIds.length !== 2 ||
      payload.probeOperationIds[0] === payload.probeOperationIds[1]) throw new CoordinationError('port-recovery-probes-invalid');
  const operationSnapshot = proofHash({ op, access });
  const first = await collectRecoveryEvidence(run, op);
  if (payload.nativeBoundaryDigest !== first.view.nativeBoundaryDigest || !first.view.sessionIdle ||
      first.view.pendingPermissionCount || payload.review.commandSha256 !== first.view.commandSha256)
    throw new CoordinationError('port-recovery-native-boundary-changed');
  const instance = first.view.nativeInstanceEvidence;
  if (!instance) throw new CoordinationError('port-recovery-native-instance-unverified');
  const originalParts = first.parts.filter(part => (part.callID || part.callId) === op.native.callId);
  if (originalParts.length !== 1 || originalParts[0].state?.input?.background === true || !nativeTimedOutShellPart(op, originalParts[0], op.sessionId))
    throw new CoordinationError('port-recovery-timeout-unverified');
  if (!payload.review.sourceFiles.some(source => source.path === 'package.json' || source.path.endsWith('/package.json')))
    throw new CoordinationError('port-recovery-source-scope-unverified');
  for (const source of payload.review.sourceFiles) {
    registry.scope(run.runId, run.version, [{ key: 'file:' + source.path, mode: 'read' }]);
    const observed = await openCode.sourceRead(op.sessionId, source.path, { directory: run.directory });
    if (observed.sha256 !== source.sha256) throw new CoordinationError('port-recovery-source-divergent');
  }
  const nativeIdentity = await processIdentity(first.view.nativePid);
  if (!nativeIdentity) throw new CoordinationError('port-recovery-native-identity-unavailable');
  const nativeUid = statSync('/proc/' + first.view.nativePid).uid;
  const allParts = first.messages.flatMap(message => Array.isArray(message.parts) ? message.parts : []);
  const captures = [];
  for (const id of payload.probeOperationIds) {
    const probe = registry.resourceState.operations[id], probeAccess = probe && registry.resourceState.accesses[probe.accessId];
    if (!probe || probe.runId !== run.runId || probe.contextId !== run.contextId || probe.sessionId !== op.sessionId ||
        probe.state !== 'COMPLETED' || probe.native?.onceAcknowledged !== true || probe.decision?.status !== 'approved' ||
        probe.nativeResult?.status !== 'completed' || probe.nativeResult.exit !== 0 ||
        probeAccess?.state !== 'RELEASED' || probe.resources.length !== 1 || probe.resources[0].key !== resourceKey ||
        probe.resources[0].mode !== 'read') throw new CoordinationError('port-recovery-probe-operation-unverified');
    const expected = { workspace: run.directory, nativePid: first.view.nativePid, port,
      runtimeDirectories: payload.review.runtimeDirectories, nonce: probe.operationId, resourceKey, excludedInfrastructure: await portProbeInfrastructure(), instanceObservedAt: instance.observedAt,
      instanceStartTime: instance.startTime, instanceEvidenceKind: instance.kind };
    const command = portProbeCommand(expected);
    if (probe.native.targetDigest !== createHash('sha256').update(JSON.stringify(['bash', command])).digest('hex'))
      throw new CoordinationError('port-recovery-probe-command-divergent');
    const matches = allParts.filter(part => (part.callID || part.callId) === probe.native.callId);
    if (matches.length !== 1) throw new CoordinationError('port-recovery-probe-operation-unverified');
    const capture = parsePortCapture(matches[0], expected);
    if (capture.cgroupDigest !== instance.cgroupDigest || capture.nativeStartTime !== nativeIdentity.startTime || capture.nativeUid !== nativeUid ||
        capture.observedAt < Date.parse(access.timeoutQuarantine.observedAt) ||
        Date.now() - capture.observedAt > 120000 || capture.observedAt > Date.now() + 5000)
      throw new CoordinationError('port-recovery-probe-expired-or-divergent');
    captures.push(capture);
  }
  if (captures[0].cgroupDigest !== captures[1].cgroupDigest || captures[0].netnsDigest !== captures[1].netnsDigest)
    throw new CoordinationError('port-recovery-namespace-divergent');
  const second = await collectRecoveryEvidence(run, op), identityAfter = await processIdentity(first.view.nativePid);
  if (first.view.nativeBoundaryDigest !== second.view.nativeBoundaryDigest || proofHash(first.messages) !== proofHash(second.messages) ||
      generationChanged(op.sessionId, first.generation) || proofHash({ op, access }) !== operationSnapshot ||
      identityAfter?.startTime !== nativeIdentity.startTime) throw new CoordinationError('port-recovery-native-boundary-changed');
  recovery.observeAction(actionId, { kind: 'QUIESCENT_PORT', nativeInstanceEvidence: instance, captures });
  const proofDigest = proofHash(payload);
  const result = registry.reconcileQuiescentPort(run.runId, op.operationId, proofDigest);
  return { state: result.access.state, operationState: result.operation.state, operationId: op.operationId,
    accessId: access.accessId, proofDigest, evidenceAuthority: 'VERIFIED_NATIVE_PORT_PROBES',
    executionOutcome: 'HISTORICAL_OUTCOME_UNOBSERVED_RESOURCE_QUIESCENT' };
}
async function verifyTerminalTurnNoEffectProof(run,context,operation,approval,decision,operationSnapshot,
  messages,permissions,log,generation){
  const sibling=Object.values(registry.resourceState.operations).some(other=>other.operationId!==operation.operationId&&
    other.runId===run.runId&&other.sessionId===operation.sessionId&&
    (['ISSUING','EXECUTING','UNKNOWN'].includes(other.state)||
      other.state==='PREPARED'&&other.decision?.status==='approved'&&(
        Boolean(other.native)||other.native?.onceAcknowledged===true||
        ['HELD','WAITING','EXECUTING','UNKNOWN'].includes(registry.resourceState.accesses[other.accessId]?.state))));
  if(!terminalTurnNoEffectCandidate(operation)||!registry.resourceState.accesses[operation.accessId]||
      sibling||context.publicJob()?.currentCabMandate||context.publicJob()?.recovery||
      permissions.some(permission=>permission.sessionID===operation.sessionId))return null;
  const accessSnapshot=structuredClone(registry.resourceState.accesses[operation.accessId]);
  if(accessSnapshot.state!=='UNKNOWN'||accessSnapshot.runId!==run.runId||accessSnapshot.operationIds.length!==1||
      accessSnapshot.operationIds[0]!==operation.operationId)return null;
  const first=nativeTerminalTurnNoEffectProof(messages,approval,operation,run,log,decision);
  if(!first||first.logWatermark<(operation.nativeRecovery?.logWatermark??0))return null;
  const jobDigest=proofHash(context.publicJob());
  const [secondMessages,secondPermissions,activeSessions,secondLog]=await Promise.all([
    openCode.messages(operation.sessionId,run.directory),
    openCode.permissions(run.directory,{sessionIds:[operation.sessionId],verifyInputs:true}),
    openCode.sessionStatus(run.directory),
    openCode.sessionEventLog(operation.sessionId,run.directory,{after:'0'}),
  ]);
  if(!Array.isArray(secondMessages)||!Array.isArray(secondPermissions)||
      secondPermissions.some(permission=>permission.sessionID===operation.sessionId)||
      Object.hasOwn(activeSessions,operation.sessionId)||generation!==(nativeSessionGenerations.get(operation.sessionId)||0)||
      proofHash(messages)!==proofHash(secondMessages)||proofHash(log)!==proofHash(secondLog)||
      proofHash(context.publicJob())!==jobDigest||
      proofHash(registry.resourceState.operations[operation.operationId])!==proofHash(operationSnapshot)||
      proofHash(registry.resourceState.accesses[operation.accessId])!==proofHash(accessSnapshot))return null;
  const second=nativeTerminalTurnNoEffectProof(secondMessages,approval,operation,run,secondLog,decision);
  if(!second||proofHash(first)!==proofHash(second)||second.logWatermark<(operation.nativeRecovery?.logWatermark??0))return null;
  second.proofDigest=proofHash(second);return second;
}
async function refreshNativeUsage(runId,sessionId) {
  const key=runId+'\0'+sessionId,run=registry.runs.get(runId),context=contexts.get(runId);
  if (closing || !run || !context?.sessions().includes(sessionId) || usageRefreshes.has(key)) return;
  usageRefreshes.add(key);
  try {efficiency.observe(run,sessionId,await openCode.messages(sessionId,run.directory));}
  catch { /* Optional usage collection does not change business authority. */ }
  finally {usageRefreshes.delete(key);}
}

async function refreshBackgroundShells(runId, sessionId, suppliedParts) {
  const key = runId + '\0' + sessionId;
  if (backgroundReconciliations.has(key) || closing) return;
  const context = contexts.get(runId), run = registry.runs.get(runId);
  const candidates = Object.values(registry.resourceState.operations).filter(op => op.runId === runId &&
    op.sessionId === sessionId && op.native && ['ISSUING','EXECUTING','UNKNOWN','COMPLETED'].includes(op.state) &&
    context?.operation(op.requestId)?.shellBackground === true).slice(0,100);
  if (!candidates.length || !run) return;
  backgroundReconciliations.add(key);
  try {
    const nativeIdentity = await transportNativeIdentity();
    const parts = suppliedParts || (await openCode.messages(sessionId,run.directory)).flatMap(message => message.parts || []);
    for (const op of candidates) {
      const matching = parts.filter(part => part.callID === op.native.callId && part.state?.input?.background === true);
      if (matching.length !== 1 || !matching[0].state?.metadata?.shellID) continue;
      const info = await openCode.shellInfo(matching[0].state.metadata.shellID,run.directory);
      const identityAgain = await transportNativeIdentity();
      if (proofHash(nativeIdentity) !== proofHash(identityAgain)) throw new CoordinationError('shell-native-identity-divergent');
      const proof = shellLifecycle.observe(op,context.operation(op.requestId),matching[0],info,nativeIdentity,workspace);
      if (proof && op.state !== 'COMPLETED') {
        registry.completeNative(runId,op.operationId,proof);
        recordNativeEffectOutcome(runId,op,matching[0],proof);
      }
    }
  } catch(cause) {
    const code = /^[a-z][a-z0-9-]{1,90}$/.test(cause?.code || '') ? cause.code : 'shell-lifecycle-unavailable';
    process.stderr.write('CAB background observation deferred: ' + code + '\n');
  } finally { backgroundReconciliations.delete(key); }
}

function observeNativeCompletion(runId, part, sessionId) {
  for (const operation of Object.values(registry.resourceState.operations)) {
    if (operation.runId !== runId || !['ISSUING', 'EXECUTING', 'UNKNOWN'].includes(operation.state)) continue;
    const proof = nativePartProof(operation, part, sessionId);
    if (proof) {
      registry.completeNative(runId, operation.operationId, proof);
      recordNativeEffectOutcome(runId, operation, part, proof);
    }
  }
}
async function proveNativeCompletions(runId, access) {
  for (const session of new Set(access.operationIds.map(id => registry.resourceState.operations[id]?.sessionId).filter(Boolean))) {
    await refreshBackgroundShells(runId,session);
  }
  const pending = access.operationIds.map((id) => registry.resourceState.operations[id])
    .filter((op) => ['ISSUING', 'EXECUTING', 'UNKNOWN'].includes(op.state));
  if (!pending.length) return;
  const sessionId = pending[0].sessionId;
  let messages;
  try { messages = await openCode.messages(sessionId, workspace); }
  catch { throw new CoordinationError('native-completion-unavailable'); }
  if (!Array.isArray(messages)) throw new CoordinationError('native-completion-invalid');
  const parts = messages.flatMap((message) => Array.isArray(message.parts) ? message.parts : []);
  for (const op of pending) {
    const matches = parts.map((part) => ({ part, proof: nativePartProof(op, part, op.sessionId) }))
      .filter((item) => item.proof);
    if (matches.length !== 1) throw new CoordinationError('native-completion-not-proved');
    registry.completeNative(runId, op.operationId, matches[0].proof);
    recordNativeEffectOutcome(runId, op, matches[0].part, matches[0].proof);
  }
}

async function reconcileTerminalNativeOutcomes(runId, access) {
  for (const session of new Set(access.operationIds.map(id => registry.resourceState.operations[id]?.sessionId).filter(Boolean))) {
    await refreshBackgroundShells(runId,session);
  }
  const operations = access.operationIds.map((id) => registry.resourceState.operations[id])
    .filter((op) => op.state === 'COMPLETED' && op.native);
  if (!operations.length) return;
  const sessionIds = [...new Set(operations.map((op) => op.sessionId))];
  if (sessionIds.length !== 1) throw new CoordinationError('native-outcome-session-divergent');
  const sessionId = sessionIds[0];
  await checkNative(sessionId, true);
  let messages;
  try { messages = await openCode.messages(sessionId, workspace); }
  catch { throw new CoordinationError('native-outcome-history-unavailable'); }
  if (!Array.isArray(messages)) throw new CoordinationError('native-outcome-history-invalid');
  const parts = messages.flatMap((message) => Array.isArray(message.parts) ? message.parts : []);
  for (const operation of operations) {
    const matches = parts.map((part) => ({ part, proof: nativePartProof(operation, part, sessionId) }))
      .filter((item) => item.proof);
    if (matches.length !== 1 || proofHash(matches[0].proof) !== operation.completionDigest) {
      throw new CoordinationError('native-outcome-history-divergent');
    }
    recordNativeEffectOutcome(runId, operation, matches[0].part, matches[0].proof);
  }
  await checkNative(sessionId, true);
}

async function reconcileNativeCompletionsFromTranscript(runId, sessionId) {
  await refreshBackgroundShells(runId,sessionId);
  const key = runId + '\0' + sessionId;
  if (nativeCompletionReconciliations.has(key)) return;
  const pending = Object.values(registry.resourceState.operations).filter((op) =>
    op.runId === runId && op.sessionId === sessionId && ['ISSUING', 'EXECUTING', 'UNKNOWN'].includes(op.state));
  if (!pending.length) return;
  nativeCompletionReconciliations.add(key);
  try {
    const messages = await openCode.messages(sessionId, workspace);
    if (!Array.isArray(messages)) return;
    const parts = messages.flatMap((message) => Array.isArray(message.parts) ? message.parts : []);
    for (const operation of pending) {
      const current = registry.resourceState.operations[operation.operationId];
      if (!current || !['ISSUING', 'EXECUTING', 'UNKNOWN'].includes(current.state)) continue;
      const matches = parts.map((part) => ({ part, proof: nativePartProof(operation, part, sessionId) }))
        .filter((item) => item.proof);
      if (matches.length === 1) {
        registry.completeNative(runId, operation.operationId, matches[0].proof);
        recordNativeEffectOutcome(runId, operation, matches[0].part, matches[0].proof);
      }
    }
  } catch (cause) {
    const code = /^[a-z][a-z0-9-]{1,90}$/.test(cause?.code || '') ? cause.code : 'native-completion-unavailable';
    process.stderr.write('CAB native completion transcript reconciliation failed: ' + code + '\n');
  } finally {
    nativeCompletionReconciliations.delete(key);
  }
}

// Une décision perdue au redémarrage ne vaut que pour rattacher l'opération
// préparée en vue de son annulation ; aucune permission n'est reconstruite.
async function proveRestoredApprovalForCancellation(runId, context, access, operationId) {
  const op = registry.resourceState.operations[operationId];
  const run = registry.runs.get(runId);
  if (!registry.restoredAccesses.has(access.accessId) || !op || op.runId !== runId ||
      op.accessId !== access.accessId || op.state !== 'PREPARED' || op.native !== undefined ||
      op.sessionId !== run.sessionId || context.publicJob()?.currentCabMandate || context.publicJob()?.recovery) {
    throw new CoordinationError('restored-approval-boundary-invalid');
  }
  const generation = nativeSessionGenerations.get(op.sessionId);
  await checkNative(op.sessionId, true);
  let messages;
  try { messages = await openCode.messages(op.sessionId, workspace); }
  catch { throw new CoordinationError('restored-approval-history-unavailable'); }
  if (!Array.isArray(messages)) throw new CoordinationError('restored-approval-history-invalid');
  const requests = messages.filter((m) => m.info?.role === 'assistant' && Array.isArray(m.parts))
    .flatMap((m) => m.parts).filter((part) => part.type === 'tool' &&
      part.tool === 'cgpt-validation_request_validation' && part.state?.input?.requestId === op.requestId);
  if (requests.length !== 1 || requests[0].state?.status !== 'completed') {
    throw new CoordinationError('restored-approval-not-proved');
  }
  const request = requests[0], input = request.state.input;
  const owner = registry.requestOwners[op.requestId];
  const digest = createHash('sha256').update(JSON.stringify(nativeIdentity(input))).digest('hex');
  const fields = ['run_id','reservation_version','requestId','approval_id','change_id','session_id',
    'directory','title','summary','files','commands','resources','operation_id','operation_digest',
    'expected_revisions','access_id','coordination_protocol',
    ...(Object.hasOwn(input, 'tool_input_sha256') ? ['tool_input_sha256'] : []),
    ...(Object.hasOwn(input, 'shell_background') ? ['shell_background'] : [])];
  const operationIdentity = Object.fromEntries(fields.map((key) => [key, input[key] ?? null]));
  let result;
  try { result = JSON.parse(request.state.output); } catch { throw new CoordinationError('restored-approval-not-proved'); }
  if (owner?.runId !== runId || owner.digest !== digest || input.operation_id !== operationId ||
      input.access_id !== access.accessId || input.session_id !== op.sessionId || input.directory !== workspace ||
      proofHash(operationIdentity) !== op.identityDigest || typeof request.callID !== 'string' || !request.callID ||
      typeof request.executed !== 'boolean' || !Number.isFinite(request.state.time?.start) ||
      !Number.isFinite(request.state.time?.end) || request.state.time.end < request.state.time.start ||
      result?.status !== 'APPROVED' || result.reviewer !== 'CGPT' ||
      result.requestId !== op.requestId || result.approval_id !== input.approval_id ||
      result.change_id !== run.changeId || result.session_id !== op.sessionId || result.directory !== workspace ||
      ['coordination_protocol','run_id','reservation_version','operation_id','operation_digest',
        'expected_revisions','resources','access_id','files','commands',
        ...(Object.hasOwn(input, 'tool_input_sha256') ? ['tool_input_sha256'] : []),
    ...(Object.hasOwn(input, 'shell_background') ? ['shell_background'] : [])].some((key) => !Object.hasOwn(result, key) ||
          !Object.hasOwn(input, key) || proofHash(result[key]) !== proofHash(input[key])) ||
      !Number.isFinite(Date.parse(result.decision_applied_at)) ||
      Date.parse(result.decision_applied_at) < request.state.time.start ||
      Date.parse(result.decision_applied_at) > request.state.time.end) {
    throw new CoordinationError('restored-approval-not-proved');
  }
  await checkNative(op.sessionId, true);
  let again;
  try { again = await openCode.messages(op.sessionId, workspace); }
  catch { throw new CoordinationError('restored-approval-history-unavailable'); }
  if (generation !== nativeSessionGenerations.get(op.sessionId) || proofHash(messages) !== proofHash(again)) {
    throw new CoordinationError('restored-approval-history-changed');
  }
}
// This path verifies provenance and completeness; the orchestrator owns the no-effect review.
async function verifyUnusedTestHistory(runId, context, entry, payload, { previewOnly = false } = {}) {
  const sessionId = registry.runs.get(runId)?.sessionId;
  const quiescent = () => {
    const job = context.publicJob();
    if (payload.sessionId !== sessionId || payload.contextId !== entry.contextId ||
        job?.currentCabMandate || job?.recovery || context.publicStatus().undecidedValidationCount || context.pendingEffects()) {
      throw new CoordinationError('run-not-quiescent');
    }
  };
  quiescent();
  const boundary = registry.unusedTestBoundary(entry);
  if (payload.boundaryDigest !== boundary) throw new CoordinationError('test-unused-boundary-stale');
  const jobDigest = proofHash(context.publicJob());
  const generation = nativeGeneration;
  const sessionGeneration = nativeSessionGenerations.get(sessionId);
  const read = async () => {
    try { return await openCode.messages(sessionId, workspace); }
    catch { throw new CoordinationError('test-unused-history-unavailable'); }
  };
  await checkNative(sessionId, true);
  const messages = await read();
  const parts = messages.flatMap((message) => message.parts.filter((part) => part.type === 'tool'));
  const proof = { messageCount: messages.length, toolCount: parts.length, historyHash: proofHash(messages) };
  const acquiredAt = Date.parse(entry.grantedAt);
  const postGrantCompactions = messages.filter((message) => message.info?.role === 'compaction' &&
    Number.isFinite(message.info?.time?.created) && message.info.time.created >= acquiredAt);
  const ops = registry.unusedTestOperations(entry);
  const rejectedRequests = rejectedNativeRequests(parts);
  proof.operationClassifications = [];
  for (const op of ops) {
    const nativeDecision = context.decision(op.requestId)?.decision;
    const classification = registry.unusedTestOperationClassification(op,
      nativeDecision === 'rejected' || rejectedRequests.has(op.requestId) ? 'rejected' : nativeDecision);
    if (!classification) {
      throw new CoordinationError('test-unused-operation-not-proved');
    }
    proof.operationClassifications.push({ operationId: op.operationId, classification });
    if (classification === 'rejected-validation-no-native-effect' ||
        classification === 'cancelled-validation-no-native-effect' || classification === 'cancelled-without-execution') continue;
    const matches = parts.map((part) => nativePartProof(op, part, sessionId)).filter(Boolean);
    if (matches.length !== 1 || proofHash(matches[0]) !== op.completionDigest) {
      throw new CoordinationError('test-unused-native-completion-divergent');
    }
  }
  const noNativeClassifications = new Set(['rejected-validation-no-native-effect',
    'cancelled-validation-no-native-effect','cancelled-without-execution']);
  const postGrantNativeStart = Object.values(registry.resourceState.operations).some((op) =>
    op.runId === runId && op.contextId === entry.contextId && op.native &&
    Number.isFinite(op.native.startedAt) && op.native.startedAt >= acquiredAt);
  const ledgerOnly = postGrantCompactions.length > 0 && ops.length > 0 && !postGrantNativeStart &&
    !registry.unresolvedAccess(runId,false) && ops.every((op) => !op.native &&
      noNativeClassifications.has(registry.unusedTestOperationClassification(op,
        context.decision(op.requestId)?.decision === 'rejected' || rejectedRequests.has(op.requestId) ? 'rejected' :
          context.decision(op.requestId)?.decision)));
  if (postGrantCompactions.length && !ledgerOnly) throw new CoordinationError('test-unused-history-incomplete');
  proof.coverage = ledgerOnly ? 'operation-ledger-after-compaction' : 'complete-native-transcript';
  if (payload.nativeProof === undefined) {
    if (!previewOnly) throw new CoordinationError('test-unused-history-divergent');
  } else if (!payload.nativeProof || proofHash(proof) !== proofHash(payload.nativeProof)) {
    throw new CoordinationError('test-unused-history-divergent');
  }
  for (const message of messages) {
    if (!Number.isFinite(message.info?.time?.created)) throw new CoordinationError('test-unused-history-invalid');
    if (message.info.role === 'compaction' && message.info.time.created >= acquiredAt && !ledgerOnly) {
      throw new CoordinationError('test-unused-history-incomplete');
    }
    for (const part of message.parts.filter((part) => part.type === 'tool')) {
      const time = part.state?.time;
      if (!Number.isFinite(time?.start)) throw new CoordinationError('test-unused-history-invalid');
      if (time.start < acquiredAt && message.info.time.created < acquiredAt &&
          !ops.some((op) => op.native?.callId === (part.callID || part.callId))) continue;
      if (!['completed','error'].includes(part.state.status) || !Number.isFinite(time.end) || time.end < time.start ||
          part.state.metadata?.truncated === true) throw new CoordinationError('test-unused-history-incomplete');
      const controlled = ops.some((op) => op.state === 'COMPLETED' && nativePartProof(op, part, sessionId));
      const observation = ['read','glob','grep','cab_codemode_discovery',
        'cgpt-validation_request_validation','cgpt-validation_get_approval','cgpt-validation_broker_readiness',
        'cgpt-validation_broker_health','cgpt-validation_poll_approval','cgpt-validation_reject',
        'cgpt-validation_list_pending','cgpt-validation_cancel_approval'].includes(part.tool) ||
        nativeNoEnvironmentObservation(part);
      if (!controlled && !observation) throw new CoordinationError('test-unused-native-tool-unreviewable');
    }
  }
  await checkNative(sessionId, true);
  const finalMessages = await read();
  if (proofHash(finalMessages) !== proof.historyHash || generation !== nativeGeneration ||
      sessionGeneration !== nativeSessionGenerations.get(sessionId) || jobDigest !== proofHash(context.publicJob()) ||
      boundary !== registry.unusedTestBoundary(entry)) throw new CoordinationError('test-unused-boundary-stale');
  quiescent();
  return proof;
}
async function resolveCodingModel(input, { explicitUnrestricted = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some((key) => !['model','reasoning','unavailablePreflights','providerMaxBytes'].includes(key)) ||
      (input.providerMaxBytes !== undefined && (!Number.isSafeInteger(input.providerMaxBytes) || input.providerMaxBytes <= 0))) {
    throw new CoordinationError('model-selection-input-invalid',400);
  }
  const catalog = input.model === undefined ? readModelCatalog() : undefined;
  const providers = await openCode.providerList(workspace, input.providerMaxBytes);
  const refs = input.unavailablePreflights === undefined ? [] : input.unavailablePreflights;
  if (!Array.isArray(refs) || refs.length > 12) throw new CoordinationError('model-selection-input-invalid',400);
  const unavailable = [];
  for (const proof of refs) {
    const observed = await modelPreflightObservation(proof);
    const rejected = reasoningUnavailability({ ...observed, workspace });
    if (input.model === undefined) {
      if (!Array.isArray(catalog.models)) throw new CoordinationError('pllm-catalog-invalid');
      const entry = catalog.models.find((entry) => entry.evaluated_this_run === true && entry.state === 'Valide' &&
        (entry.model_id || entry.model) === rejected.modelID && catalogProviderID(entry.provider,providers) === rejected.providerID);
      if (!entry || !Number.isFinite(Date.parse(entry.evaluated_at)) || Date.parse(rejected.observedAt) < Date.parse(entry.evaluated_at)) {
        throw new CoordinationError('model-unavailability-not-proved');
      }
    } else if (input.model !== rejected.providerID+'/'+rejected.modelID) throw new CoordinationError('model-unavailability-not-proved');
    unavailable.push(rejected);
  }
  return selectCodingModel({ catalog, providers, model: input.model, reasoning: input.reasoning, unavailable, explicitUnrestricted });
}
async function modelPreflightObservation(proof) {
  if (!proof || Object.keys(proof).length !== 2 || !['sessionId','messageId'].every((key) =>
    typeof proof[key] === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(proof[key]))) throw new CoordinationError('model-preflight-not-proved');
  let session;
  let messages;
  try {
    [session, messages] = await Promise.all([openCode.session(proof.sessionId, workspace),
      openCode.messages(proof.sessionId, workspace)]);
  } catch (cause) {
    if (cause.code === 'opencode-response-too-large') throw new CoordinationError('model-observation-too-large');
    throw cause;
  }
  const response = messages.find((entry) => entry.info.id === proof.messageId);
  if (!response?.info?.parentID || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(response.info.parentID)) throw new CoordinationError('model-preflight-not-proved');
  const parent = messages.find((entry) => entry.info.id === response.info.parentID);
  if (parent?.info?.role === 'user' && !parent.info.model && session.model &&
      session.model.providerID === response.info.providerID && session.model.modelID === response.info.modelID &&
      session.model.variant === response.info.variant) {
    parent.info.model = session.model;
    parent.info.variant = session.model.variant;
  }
  if (!parent) throw new CoordinationError('model-preflight-not-proved');
  return { session, response, parent };
}
async function provedCodingModel(input, proof) {
  const selection = await resolveCodingModel(input);
  return verifyModelPreflight(selection,{ ...(await modelPreflightObservation(proof)), workspace });
}
for (const run of registry.runs.values()) if (run.state === 'RESERVED') {
  const context = contextFor(run);
  const pending = registry.sessionHandoffs(run.runId).find(h => h.state === 'COMMITTED');
  if (pending) {
    try {
      await context.applySessionHandoff(pending);
      registry.completeSessionHandoff(run.runId,pending.handoffId);
      if (runtimeMigration?.phase !== 'PREPARED') context.resumeTransport();
    } catch {
      context.freezeTransport();
      observations.record('session-handoff-recovery-required',{runId:run.runId,handoffId:pending.handoffId});
    }
  }
  if(runtimeMigration?.phase!=='PREPARED')void restoreApprovedOperations(run, context);
}
if (contexts.size && legacy.publicJob()?.armed) throw new Error('Legacy job must be reconciled before concurrent RUNs.');
if(runtimeMigration?.phase==='PREPARED')legacy.freezeTransport();
legacy.start();
if(broker){
  await publishTo(legacy,broker);
  for(const [runId,context] of activeContexts())await publishTo(context,scopedReadiness(runId,broker));
}

const requests = new Set();
const server = createServer((request, response) => {
  const pending = handleRequest(request, response);
  requests.add(pending);
  void pending.finally(() => requests.delete(pending)).catch(() => response.destroy());
});
async function handleRequest(request, response) {
  if (closing) { json(response, 503, { error: 'cab-stopping' }); return; }
  request.cabReceivedAt = Date.now();
  let transitionRun = null;
  let observedRun = null;
  let attemptedReservation = null;
  let lifecycleMutation = false;
  let httpFailureObserved = false;
  request.cabObserveHttpFailure = (code) => {
    if (httpFailureObserved || !observedRun || !/^[a-z][a-z0-9-]{0,79}$/.test(code || '')) return;
    httpFailureObserved = true;
    observeStatistics(() => statistics.httpFailure(observedRun, code));
  };
  try {
    const url = new URL(request.url, 'http://localhost');
    const transportContexts = () => [legacy, ...contexts.values()];
    if (handoffIntent && Date.now() >= handoffIntent.expiresAt) {
      handoffJournal.cancel(handoffIntent.transactionId);
      handoffIntent = null;
      for (const context of transportContexts()) context.resumeTransport();
    }
    const efficiencyRoute=url.pathname.match(/^\/runs\/([A-Za-z0-9][A-Za-z0-9_.-]{0,99})\/efficiency$/);
    if (request.method==='GET' && efficiencyRoute) {
      const run=registry.runs.get(efficiencyRoute[1]);
      if(!run)throw new CoordinationError('run-not-found',404);
      json(response,200,efficiency.view(run));return;
    }
    if(request.method==='GET'&&url.pathname==='/runtime/migration') {
      json(response,200,{version:VERSION,workspace,runtimeStateDirectory:stateDirectory,runtimeMigration:migrationStatus(),migration:migrationStatus()});return;
    }
    if(request.method==='POST'&&url.pathname==='/runtime/migration/activate') {
      guardContinuityRequest(request,new URL(request.url,'http://'+request.headers.host),server.address().port);
      const payload=await readJson(request,4096);
      if(Object.keys(payload).length!==1||!runtimeMigration||payload.transactionId!==runtimeMigration.transactionId)
        throw new CoordinationError('runtime-migration-transaction-divergent');
      if(proofHash(await transportNativeIdentity())!==proofHash(runtimeMigration.nativeIdentity))
        throw new CoordinationError('runtime-migration-native-divergent');
      if(runtimeMigration.phase!=='ACTIVE') {
        const next={...runtimeMigration,phase:'ACTIVE',activatedAt:new Date().toISOString()};
        writeRuntimeJson(migrationPath,next);runtimeMigration=next;
        for(const context of transportContexts())context.resumeTransport();
        for(const [runId,context] of activeContexts())void restoreApprovedOperations(registry.runs.get(runId),context);
      }
      json(response,200,{migration:migrationStatus()});return;
    }
    if(runtimeMigration?.phase==='PREPARED'&&request.method==='POST'&&url.pathname!=='/broker/readiness') {
      response.setHeader('retry-after','1');json(response,503,{error:'transport-update-in-progress',retry_after_ms:100});return;
    }
    if (request.method === 'GET' && url.pathname === '/transport/status') {
      json(response, 200, { version: VERSION, workspace, pid: process.pid, ...transportStatus(),
        ready: Boolean(handoffIntent && lifecycleMutations === 0 && transitions.size === 0 &&
          nativeCompletionReconciliations.size === 0 && transportContexts().every(context => context.transportHandoffReady())),
        transportContinuity: transportStatus(),
        brokerReadiness: broker ? { server_version: broker.server_version, status: broker.status,
          pending_count: broker.pending_count } : null,
        brokerReadinessReceivedAt: legacy.publicStatus().brokerReadinessReceivedAt }); return;
    }
    if (request.method === 'POST' && ['/transport/prepare', '/transport/cancel'].includes(url.pathname)) {
      const origin = new URL(request.url, 'http://' + request.headers.host);
      guardContinuityRequest(request, origin, server.address().port);
      const payload = await readJson(request, 4096);
      if (Object.keys(payload).length !== 1 || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(payload.transactionId || '') ||
          !handoffJournal) throw new CoordinationError('handoff-contract-invalid', 400);
      if (url.pathname.endsWith('/cancel')) {
        handoffJournal.cancel(payload.transactionId); handoffIntent = null;
        for (const context of transportContexts()) context.resumeTransport();
        json(response, 200, transportStatus()); return;
      }
      if (handoffIntent && handoffIntent.transactionId !== payload.transactionId) throw new CoordinationError('handoff-already-prepared');
      const nativeIdentity = await transportNativeIdentity();
      for (const context of transportContexts()) context.freezeTransport();
      try {
        const prepared = handoffJournal.prepare(payload.transactionId, nativeIdentity, await handoffBrokerState());
        handoffIntent = { transactionId: prepared.transactionId, expiresAt: prepared.expiresAt };
        const deadline = Date.now() + 250;
        const ready = () => lifecycleMutations === 0 && transitions.size === 0 && nativeCompletionReconciliations.size === 0 && backgroundReconciliations.size === 0 &&
          transportContexts().every(context => context.transportHandoffReady());
        while (!ready() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
        if (!ready()) throw new CoordinationError('handoff-critical-operation-in-flight');
        await Promise.all(transportContexts().map(context => context.flushCommunication()));
        json(response, 200, { ...transportStatus(), ready: true }); return;
      } catch (cause) {
        if (handoffIntent?.transactionId === payload.transactionId) {
          handoffJournal.cancel(payload.transactionId); handoffIntent = null;
        }
        for (const context of transportContexts()) context.resumeTransport();
        throw cause;
      }
    }
    if (handoffIntent && request.method === 'POST') {
      response.setHeader('retry-after', '1');
      json(response, 503, { error: 'transport-update-in-progress', retry_after_ms: 100 }); return;
    }
    if (url.pathname.startsWith('/monitor/lifecycle/')) {
      const origin = new URL(request.url, 'http://' + request.headers.host);
      if (request.method !== 'POST' || origin.search || Number(origin.port || 80) !== server.address().port) {
        throw new CoordinationError('monitor-action-invalid', 400);
      }
      guardManagementPost(request, origin, false);
      request.setTimeout(5000, () => request.destroy());
      const payload = await readJson(request, 4096);
      if (url.pathname === '/monitor/lifecycle/release') {
        if (Object.keys(payload).length !== 1 || typeof payload.token !== 'string' || payload.token !== lifecycleLease?.token) {
          throw new CoordinationError('monitor-lease-invalid');
        }
        lifecycleLease = null; json(response, 200, { status: 'released' }); return;
      }
      if (url.pathname !== '/monitor/lifecycle/prepare' || Object.keys(payload).length !== 1 || payload.workspace !== workspace) {
        throw new CoordinationError('monitor-workspace-divergent');
      }
      if (lifecycleLease?.expiresAt > Date.now() || lifecycleMutations ||
          activeContexts().length || legacy.publicJob()?.armed || legacy.unresolved()) {
        throw new CoordinationError('monitor-runs-active');
      }
      const lease = { token: randomUUID(), expiresAt: Date.now() + 30000 };
      lifecycleLease = lease;
      try {
        const revision = registryRevision;
        const [sessions, permissions] = await Promise.all([openCode.sessionStatus(workspace), openCode.permissions(workspace)]);
        if (!sessions || typeof sessions !== 'object' || Array.isArray(sessions) ||
            Object.values(sessions).some((session) => session?.type !== 'idle') ||
            !Array.isArray(permissions) || permissions.length || revision !== registryRevision ||
            activeContexts().length || legacy.publicJob()?.armed || legacy.unresolved()) {
          throw new CoordinationError('monitor-runs-active');
        }
        json(response, 200, { ...lease, workspace, pid: process.pid }); return;
      } catch (error) { if (lifecycleLease === lease) lifecycleLease = null; throw error; }
    }
    if (request.method === 'POST') {
      if (lifecycleLease?.expiresAt > Date.now()) throw new CoordinationError('monitor-maintenance-in-progress');
      lifecycleMutations++; lifecycleMutation = true;
    }
    const maintenanceRoute = ['/statistics/retention/preview', '/statistics/retention/purge'].includes(url.pathname);
    if (maintenanceRoute) {
      if (request.method !== 'POST') { response.writeHead(405, { allow: 'POST' }).end(); return; }
      guardStatisticsPost(request, url, server.address().port);
      request.setTimeout(5000, () => request.destroy());
    }
    if (request.method === 'GET' && url.pathname === '/monitor/events') {
      if (request.headers.accept === 'text/event-stream') observations.stream(request, response);
      else json(response, 200, observations.snapshot(url.searchParams.get('cursor') ?? undefined));
      return;
    }
    let payload = request.method === 'POST' ? await readJson(request,
      url.pathname === '/statistics/import' ? 64 * 1024 * 1024 : maintenanceRoute ? 4096 : 256 * 1024) : null;
    if (['/validation/resource-request','/validation/resource-reminder'].includes(url.pathname)) {
      if (!payload?.approval?.run_id || payload.approval.coordination_protocol !== COORDINATION_PROTOCOL) {
        throw new CoordinationError('coordination-upgrade-required');
      }
      url.pathname = url.pathname === '/validation/resource-request' ? '/validation/request' : '/validation/reminder';
    }
    request.cabPayload = payload;
    if (request.method === 'POST' && /^(?:\/runs\/[A-Za-z0-9][A-Za-z0-9_.-]{0,99})?\/validation\/(request|reminder)$/.test(url.pathname)) {
      checkCommandLength(payload?.approval, maxCommandLength);
    }
    registry.assertHealthy();
    if (request.method === 'POST' && url.pathname === '/model-policy/resolve') {
      json(response,200,{ ...(await resolveCodingModel(payload)), preflightRequired: true }); return;
    }
    if (maintenanceRoute) {
      const result = url.pathname.endsWith('/preview') ? statisticsMaintenance.preview(payload) : await statisticsMaintenance.purge(payload);
      json(response, 200, result); return;
    }
    if (request.method === 'GET' && url.pathname === '/statistics/dashboard') {
      json(response, 200, statisticsDashboard(statistics, url.searchParams)); return;
    }
    if (request.method === 'POST' && url.pathname === '/statistics/import') {
      if (!payload || Object.keys(payload).length !== 1 || !payload.bundle) throw new CoordinationError('observation-import-invalid', 400);
      json(response, 200, await statistics.observations.import(payload.bundle)); return;
    }
    const observationMatch = url.pathname.match(/^\/runs\/([A-Za-z0-9][A-Za-z0-9_.-]{0,99})\/statistics\/view$/);
    if (request.method === 'GET' && (url.pathname === '/statistics/view' || observationMatch)) {
      const selection = url.searchParams.get('selection') || 'current';
      const runId = observationMatch?.[1] || url.searchParams.get('runId') || undefined;
      const contextId = url.searchParams.has('contextId') ? Number(url.searchParams.get('contextId')) : undefined;
      statistics.advance();
      if (url.searchParams.get('format') === 'markdown') {
        response.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'no-store' });
        response.end(statistics.observations.markdown(selection, runId, contextId));
      } else json(response, 200, statistics.observations.view(selection, runId, contextId));
      return;
    }
    if (url.pathname === '/coordination/global' && request.method === 'GET') {
      json(response, 200, { protocol: registry.snapshot().coordinationProtocol,
        global: registry.resourceState.global, blockers: localIntegrationBlockers(),
        accesses: registry.accesses().filter((a) => ['HELD', 'EXECUTING', 'UNKNOWN'].includes(a.state)) }); return;
    }
    if (request.method === 'POST' && url.pathname.startsWith('/coordination/')) {
      if (url.pathname === '/coordination/maintenance/adopt') {
        if (!payload || Object.keys(payload).length !== 2 || typeof payload.sealDigest !== 'string') {
          throw new CoordinationError('maintenance-adoption-contract-invalid', 400);
        }
        const checked = await verifyBootstrap({ root: maintenanceDirectory(), transactionId: payload.transactionId,
          controllerUrl: `http://${host === '::1' ? '[::1]' : host}:${server.address().port}`, openCode,
          workspace, controllerPid: process.pid, entry: controllerEntry });
        if (checked.journal.sealDigest !== payload.sealDigest || loadedBuildDigest !== checked.journal.seal.buildDigest) {
          throw new CoordinationError('maintenance-adoption-digest-divergent');
        }
        const global = checked.global.state === 'HELD' ? checked.global : registry.confirmGlobal({
          transactionId: payload.transactionId, generation: checked.global.generation,
          evidence: [checked.journal.sealDigest] });
        json(response, 200, { transactionId: payload.transactionId, state: global.state,
          generation: global.generation, sealDigest: checked.journal.sealDigest, buildDigest: loadedBuildDigest }); return;
      }
      if (url.pathname === '/coordination/global/request') {
        json(response, 202, registry.requestGlobal(payload)); return;
      }
      if (['/coordination/global/confirm', '/coordination/global/release', '/coordination/migrate', '/coordination/rollback', '/coordination/legacy/reconcile'].includes(url.pathname)) {
        proofReferences(payload);
        if (['/coordination/global/confirm','/coordination/global/release'].includes(url.pathname)) await maintenanceCohort(payload);
        else await checkCohort();
        if (url.pathname.endsWith('/confirm')) json(response, 200, registry.confirmGlobal(payload));
        else if (url.pathname.endsWith('/release')) json(response, 200, registry.releaseGlobal(payload));
        else if (url.pathname === '/coordination/legacy/reconcile') {
          if (legacy.publicJob()?.armed) throw new CoordinationError('legacy-job-active');
          json(response, 200, registry.reconcileLegacy(payload));
        } else if (url.pathname.endsWith('/rollback')) json(response, 200, registry.rollbackMigration(payload));
        else json(response, 200, registry.migrate({ ...payload, quiescent: true }));
        return;
      }
      throw new CoordinationError('coordination-route-not-found', 404);
    }
    const statisticsMatch = url.pathname.match(/^\/runs\/([A-Za-z0-9][A-Za-z0-9_.-]{0,99})\/statistics$/);
    if (request.method === 'GET' && (url.pathname === '/statistics' || statisticsMatch)) {
      const runId = statisticsMatch?.[1];
      const contextId = url.searchParams.has('contextId') ? Number(url.searchParams.get('contextId')) : undefined;
      if (contextId !== undefined && (!Number.isSafeInteger(contextId) || contextId < 1)) {
        throw new CoordinationError('statistics-context-invalid', 400);
      }
      const current = registry.runs.get(runId);
      const selectedContext = contextId ?? current?.contextId;
      const result = statistics.summary(runId, selectedContext);
      if (runId && !result.contexts.length) throw new CoordinationError('statistics-not-found', 404);
      if (url.searchParams.get('format') === 'markdown') {
        if (!runId) throw new CoordinationError('statistics-context-required', 400);
        response.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'no-store' });
        response.end(statistics.markdown(runId, selectedContext));
      } else json(response, 200, result);
      return;
    }
    if (request.method === 'GET' && url.pathname === '/monitor/runs') {
      json(response, 200, registry.monitorRuns()); return;
    }
    if (request.method === 'GET' && url.pathname === '/runs') {
      json(response, 200, publicRunSnapshot()); return;
    }
    if (request.method === 'GET' && url.pathname === '/status' && !url.searchParams.has('runId')) {
      const entries = activeContexts();
      if (!entries.length) { json(response, 200, { ...legacy.publicStatus(), runtimeStateDirectory:stateDirectory,runtimeMigration:migrationStatus(), transportContinuity: transportStatus(), frozenRecoveryMaintenance: FROZEN_CAPABILITY,
        maintenanceBuildDigest: loadedBuildDigest, notificationReconciliation: 'rejection-only-v1', testResourceProtocol: TEST_RESOURCE_PROTOCOL,
        modelSelectionProtocol: MODEL_SELECTION_PROTOCOL, workspace, pid: process.pid }); return; }
      json(response, 200, { version: VERSION, mode: 'concurrent', frozenRecoveryMaintenance: FROZEN_CAPABILITY,
        maintenanceBuildDigest: loadedBuildDigest, notificationReconciliation: 'rejection-only-v1', workspace, pid: process.pid,
        runtimeStateDirectory:stateDirectory,runtimeMigration:migrationStatus(), configuration: { maxCommandLength, commandLengthUnit: 'UTF-16' }, transportContinuity: transportStatus(), coordinationProtocol: registry.snapshot().coordinationProtocol,
        testResourceProtocol: TEST_RESOURCE_PROTOCOL,
        modelSelectionProtocol: MODEL_SELECTION_PROTOCOL,
        globalCoordination: registry.resourceState.global, opencodeSse: sseState,
        brokerReadiness: broker, brokerReadinessReceivedAt: legacy.publicStatus().brokerReadinessReceivedAt, activeRunCount: entries.length,
        runs: Object.fromEntries(entries.map(([id, c]) => [id, statusFor(id, c)])),
        activeValidationCount: entries.reduce((n, [, c]) => n + c.publicStatus().activeValidationCount, 0),
        job: entries.length === 1 ? entries[0][1].publicJob() : null });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/runs/reserve') {
      attemptedReservation = payload;
      if (legacy.publicJob()?.armed || legacy.pendingEffects()) throw new CoordinationError('legacy-job-active');
      await checkNative(payload.sessionId);
      if (legacy.publicJob()?.armed || legacy.pendingEffects()) throw new CoordinationError('legacy-job-active');
      const run = registry.reserve(payload);
      const context = contextFor(run);
      if (broker) await publishTo(context, scopedReadiness(run.runId, broker));
      json(response, 201, run); return;
    }
    if (request.method === 'POST' && url.pathname === '/broker/readiness') {
      if (!payload || !['READY', 'DEGRADED', 'BLOCKED', 'HUMAN_REQUIRED'].includes(payload.status)) {
        throw new CoordinationError('readiness-invalid', 400);
      }
      broker = payload;
      if (!registry.migrationRequired && ['STORE_UNHEALTHY', 'JOURNAL_UNHEALTHY', 'JOURNAL_INTEGRITY_FAILURE', 'STORE_JOURNAL_DIVERGENCE']
        .includes(payload.root_cause) && (!registry.resourceState.global || registry.resourceState.global.state === 'RELEASED')) {
        registry.requestGlobal({ cause: 'GLOBAL_RECONCILIATION', scope: 'all',
          transactionId: 'integrity-' + randomUUID(), authorization: 'technical-integrity-protection',
          evidence: [payload.root_cause] });
      }
      await publishTo(legacy, payload);
      for (const [runId, context] of activeContexts()) {
        await publishTo(context, scopedReadiness(runId, payload));
        void restoreApprovedOperations(registry.runs.get(runId), context);
      }
      json(response, 202, { accepted: true, status: payload.status }); return;
    }
    const match = url.pathname.match(/^\/runs\/([A-Za-z0-9][A-Za-z0-9_.-]{0,99})(\/.*)?$/);
    let runId = match?.[1] || payload?.approval?.run_id || url.searchParams.get('runId');
    const requestId = url.pathname.match(/\/decision\/([^/]+)$/)?.[1];
    if (!runId && requestId && registry.requestOwners[requestId]) runId = registry.requestOwners[requestId].runId;
    if (match?.[2] === '/integration' && request.method === 'POST' && payload?.completion !== undefined) {
      throw new CoordinationError('coordination-upgrade-required');
    }
    if (match?.[2] === '/publish' && request.method === 'POST' &&
        Object.hasOwn(registry.resourceState.publications, payload?.transactionId)) {
      json(response, 200, registry.publish(runId, payload)); return;
    }
    if (match?.[2] === '/locks/release' && request.method === 'POST' &&
        registry.resourceState.accesses[payload?.operationId]?.state === 'RELEASED') {
      json(response, 200, registry.releaseAccess(runId, payload)); return;
    }
    if (match?.[2] === '/test-resources/release-unused' && request.method === 'POST' &&
        registry.resourceState.testReservations?.[payload?.transactionId]?.state === 'RELEASED') {
      json(response, 200, registry.unusedTestReplay(runId, payload)); return;
    }
    if (match?.[2] === '/test-resources/release' && request.method === 'POST' &&
        registry.resourceState.testReservations?.[payload?.transactionId]?.state === 'RELEASED') {
      json(response, 200, registry.releaseTests(runId, payload)); return;
    }
    const context = runId ? contexts.get(runId) : singleContext();
    if (!context) throw new CoordinationError('run-not-found', 404);
    if (match) url.pathname = match[2] || '/status';
    if (request.method === 'POST' && url.pathname === '/job/arm') {
      if (payload.codingModel !== undefined) throw new CoordinationError('model-selection-server-owned',400);
      if (payload.modelSelectionProtocol !== undefined || payload.modelSelection !== undefined) {
        if (payload.modelSelectionProtocol !== MODEL_SELECTION_PROTOCOL) throw new CoordinationError('model-selection-upgrade-required');
        request.cabPayload = { ...payload, codingModel: await provedCodingModel(
          payload.modelSelection === undefined ? {} : payload.modelSelection,payload.modelPreflight) };
      }
    }
    if (runId) {
      const run = registry.runs.get(runId);
      if (!run || run.state !== 'RESERVED') throw new CoordinationError('run-not-reserved');
      observedRun = run;
      if (request.method === 'POST' && registry.sessionHandoffs(runId).some(h => !['DONE','ABORTED'].includes(h.state)) &&
          !['/session-handoff','/session-handoff/abort'].includes(url.pathname)) throw new CoordinationError('session-handoff-pending');
      if (request.method === 'POST' && url.pathname === '/session-handoff/abort') {
        guardContinuityRequest(request,new URL(request.url,'http://' + request.headers.host),server.address().port);
        if (transitions.has(runId)) throw new CoordinationError('run-transition-in-flight');
        const receipt = registry.abortSessionHandoff(runId,payload);
        if (runtimeMigration?.phase !== 'PREPARED') context.resumeTransport();
        json(response,200,receipt); return;
      }
      if (request.method === 'GET' && url.pathname === '/session-handoff/receipts') {
        json(response,200,{runId,receipts:registry.sessionHandoffs(runId)}); return;
      }
      if (['GET','POST'].includes(request.method) && url.pathname === '/session-handoff') {
        if (handoffIntent || runtimeMigration?.phase === 'PREPARED') throw new CoordinationError('transport-update-in-progress');
        if (transitions.has(runId)) throw new CoordinationError('run-transition-in-flight');
        if (request.method === 'POST') guardContinuityRequest(request,
          new URL(request.url,'http://' + request.headers.host),server.address().port);
        transitions.add(runId); transitionRun = runId;
        context.freezeTransport();
        try {
          await context.flushCommunication();
          const replay = request.method === 'POST' ? registry.sessionHandoffReplay(runId,payload) : null;
          if (['DONE','ABORTED'].includes(replay?.state)) { json(response,200,replay); return; }
          if (replay?.state === 'COMMITTED') {
            await context.applySessionHandoff(replay);
            json(response,200,registry.completeSessionHandoff(runId,replay.handoffId)); return;
          }
          const sessionId = request.method === 'GET' ? url.searchParams.get('sessionId') : payload.sessionId;
          if (request.method === 'GET' && (url.searchParams.getAll('sessionId').length !== 1 ||
              [...url.searchParams.keys()].some(k => k !== 'sessionId'))) throw new CoordinationError('session-handoff-query-invalid',400);
          if ([...registry.runs.values(),...registry.history].some(r => r.runId !== runId && r.sessionId === sessionId) ||
              activeContexts().some(([id,c]) => id !== runId && c.sessions().includes(sessionId)))
            throw new CoordinationError('session-handoff-session-reused');
          registry.admission(runId);
          const job = context.publicJob();
          if (!job || job.sessionId !== run.sessionId || request.method === 'POST' && job.jobId !== payload.jobId)
            throw new CoordinationError('session-handoff-job-divergent');
          const inventoryDigest = registry.sessionHandoffInventory(runId);
          const historicalCalls = Object.values(registry.resourceState.operations).filter(o => o.runId === runId &&
            o.contextId === run.contextId && o.native?.onceAcknowledged === true && !['COMPLETED','CANCELLED'].includes(o.state) &&
            registry.accesses(runId).some(a => ['HELD','EXECUTING','UNKNOWN'].includes(a.state) && a.operationIds.includes(o.operationId)))
            .map(o => ({...o.native,sessionId:o.sessionId}));
          const first = await context.inspectSessionHandoff(sessionId,historicalCalls);
          const second = await context.inspectSessionHandoff(sessionId,historicalCalls);
          if (first.boundaryDigest !== second.boundaryDigest || inventoryDigest !== registry.sessionHandoffInventory(runId))
            throw new CoordinationError('session-handoff-boundary-changed');
          if (request.method === 'GET') {
            json(response,200,{runId,jobId:job.jobId,ownerId:run.ownerId,version:run.version,
              expectedSessionId:run.sessionId,sessionId,...second,inventoryDigest,
              protectedAccesses:registry.accesses(runId).filter(a => ['HELD','WAITING','EXECUTING','UNKNOWN','STALE'].includes(a.state))
                .map(a => ({accessId:a.accessId,state:a.state,resources:a.resources,fencing:a.fencing}))}); return;
          }
          if (payload.checkpointDigest !== second.checkpointDigest || payload.boundaryDigest !== second.boundaryDigest)
            throw new CoordinationError('session-handoff-boundary-divergent');
          registry.prepareSessionHandoff(runId,payload);
          const committed = registry.commitSessionHandoff(runId,payload.handoffId);
          await context.applySessionHandoff(committed);
          json(response,201,registry.completeSessionHandoff(runId,payload.handoffId)); return;
        } finally {
          if (!registry.sessionHandoffs(runId).some(h => !['DONE','ABORTED'].includes(h.state)) && runtimeMigration?.phase !== 'PREPARED')
            context.resumeTransport();
        }
      }
      if (request.method === 'GET' && url.pathname === '/recovery/port-probe-command') {
        if ([...url.searchParams.keys()].some(key => !['operationId','nonce','runtimeDirectory'].includes(key)) ||
            url.searchParams.getAll('operationId').length !== 1 || url.searchParams.getAll('nonce').length !== 1)
          throw new CoordinationError('recovery-request-invalid', 400);
        const { op, port, resourceKey } = portRecoveryCandidate(run, url.searchParams.get('operationId'));
        const evidence = await collectRecoveryEvidence(run, op);
        if (!evidence.view.nativeInstanceEvidence) throw new CoordinationError('port-recovery-native-instance-unverified');
        const input = { workspace: run.directory, nativePid: evidence.view.nativePid, port,
          runtimeDirectories: url.searchParams.getAll('runtimeDirectory'), nonce: url.searchParams.get('nonce'), resourceKey,
          excludedInfrastructure: await portProbeInfrastructure(), instanceObservedAt: evidence.view.nativeInstanceEvidence.observedAt,
          instanceStartTime: evidence.view.nativeInstanceEvidence.startTime, instanceEvidenceKind: evidence.view.nativeInstanceEvidence.kind };
        if (!input.runtimeDirectories.includes('.')) throw new CoordinationError('port-recovery-complete-project-scope-required');
        for (const directory of input.runtimeDirectories) if (directory !== '.')
          registry.scope(runId, run.version, [{ key: 'file:' + directory, mode: 'read' }]);
        json(response, 200, portProbeDescription(input)); return;
      }
      if (request.method === 'GET' && url.pathname === '/recovery/native-evidence') {
        if ([...url.searchParams.keys()].some(key => key !== 'operationId') || url.searchParams.getAll('operationId').length !== 1)
          throw new CoordinationError('recovery-request-invalid', 400);
        const operation = registry.resourceState.operations[url.searchParams.get('operationId')];
        const evidence = await collectRecoveryEvidence(run, operation);
        json(response, 200, evidence.view); return;
      }
      if (request.method === 'POST' && url.pathname === '/extend-compatible') {
        guardContinuityRequest(request, new URL(request.url, 'http://' + request.headers.host), server.address().port);
        if (transitions.has(runId)) throw new CoordinationError('run-transition-in-flight');
        transitions.add(runId); transitionRun = runId;
        json(response, 201, manifestExtensions.extend(runId, payload)); return;
      }
      if(request.method==='GET'&&url.pathname==='/validation/correlation') {
        if([...url.searchParams.keys()].some(key=>key!=='requestId')||url.searchParams.getAll('requestId').length!==1||
          !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(url.searchParams.get('requestId')||''))throw new CoordinationError('correlation-query-invalid',400);
        const id=url.searchParams.get('requestId'),value=validationCorrelationEvidence.get(runId+'\0'+id);
        json(response,200,{version:VERSION,runId,requestId:id,snapshot_only:true,
          retention:'current-controller-last-500-requests',absenceMeaning:'no-observation-retained',
          evidence:value?.contextId===run.contextId?value:null});return;
      }
      if (request.method === 'GET' && url.pathname === '/recovery') {
        json(response, 200, recovery.plan(runId)); return;
      }
      if (request.method === 'GET' && url.pathname === '/recovery/receipts') {
        if ([...url.searchParams.keys()].some(key => key !== 'actionId') || url.searchParams.getAll('actionId').length > 1)
          throw new CoordinationError('recovery-request-invalid', 400);
        json(response, 200, recovery.receiptSnapshot(runId, url.searchParams.get('actionId') ?? undefined)); return;
      }
      if (request.method === 'POST' && ['/recovery/policy', '/recovery/action'].includes(url.pathname)) {
        const origin = new URL(request.url, 'http://' + request.headers.host);
        guardContinuityRequest(request, origin, server.address().port);
        if (transitions.has(runId)) throw new CoordinationError('run-transition-in-flight');
        if (url.pathname === '/recovery/policy') {
          json(response, 201, recovery.grant(runId, payload)); return;
        }
        const action = recovery.authorize(runId, payload);
        if (action.replay) { json(response, action.status, action.result); return; }
        url.pathname = action.path; payload = action.payload; request.cabPayload = payload;
        response.cabRecoveryProjection = true;
        response.cabRecoveryActionId = action.actionId;
      }
      if (request.method === 'POST' && transitions.has(runId)) {
        const cause = new CoordinationError('run-transition-in-flight');
        const decisionPath = /^\/decision\/([^/]+)$/.exec(url.pathname);
        if (decisionPath) {
          const id = decisionPath[1], recorded = context.decision(id) !== undefined;
          const known = registry.requestOwners[id]?.runId === runId || context.hasRequest(id) || recorded;
          cause.diagnostic = {error:cause.code,message:'Une transition du RUN est en cours ; cette tentative ne prend aucune nouvelle décision.',
            decision_recorded:known ? recorded : null,admission:admissionSnapshot(runId)};
        }
        throw cause;
      }
      if (request.method === 'POST' && ['/release', '/ready', '/reconcile', '/integration', '/integration-request', '/resources', '/closing', '/job/model-transition', '/job/recover', '/job/terminal-gate', '/job/disarm', '/shell-stage', '/locks/acquire', '/locks/release', '/locks/cancel', '/locks/attach', '/locks/reconcile', '/locks/reconcile-restored', '/locks/quarantine-timeout', '/test-resources/acquire', '/test-resources/release', '/test-resources/release-unused', '/test-resources/release-unused-lost-token', '/test-resources/cancel', '/test-resources/reconcile', '/test-resources/reconcile-restored', '/publish', '/suspend', '/validation/request', '/validation/reminder', '/validation/reconcile', '/validation/cancel-reviewed', '/validation/restore-pending', '/validation/withdraw-unissued', '/validation/reconcile-reviewed-terminal', '/locks/reconcile-quiescent-port'].includes(url.pathname)) {
        transitions.add(runId);
        transitionRun = runId;
      }
      if (request.method === 'GET' && url.pathname === '/status') { json(response, 200, statusFor(runId, context)); return; }
      const sourceReadRoute = request.method === 'GET' && /^\/source\/(read|list|find)$/.exec(url.pathname);
      if (sourceReadRoute) {
        if (transitions.has(runId)) throw new CoordinationError('run-transition-in-flight');
        registry.admission(runId);
        const operation = sourceReadRoute[1], job = context.publicJob();
        if (!job?.armed || job.sessionId !== run.sessionId || job.directory !== run.directory ||
            !context.sessions().includes(run.sessionId) || job.currentCabMandate || job.recovery ||
            job.modelTransition || context.pendingEffects() || context.publicStatus().undecidedValidationCount) {
          throw new CoordinationError('source-read-run-not-quiescent');
        }
        const [activeSessions, permissions] = await Promise.all([
          openCode.sessionStatus(run.directory), openCode.permissions(run.directory, { sessionIds: [run.sessionId] }),
        ]);
        if (activeSessions[run.sessionId]?.type !== undefined || permissions.some(permission => permission.sessionID === run.sessionId)) {
          throw new CoordinationError('source-read-native-session-busy');
        }
        const initialVersion = run.version;
        let result;
        try {
          if (operation === 'read') {
            if (url.searchParams.getAll('path').length !== 1 || [...url.searchParams.keys()].some(key => key !== 'path')) {
              throw new CoordinationError('source-read-request-invalid', 400);
            }
            result = await openCode.sourceRead(run.sessionId, url.searchParams.get('path'), { directory: run.directory });
          } else if (operation === 'list') {
            if (url.searchParams.getAll('path').length > 1 || [...url.searchParams.keys()].some(key => key !== 'path')) {
              throw new CoordinationError('source-read-request-invalid', 400);
            }
            result = await openCode.sourceList(run.sessionId, url.searchParams.get('path') || '', { directory: run.directory });
          } else {
            const queries = url.searchParams.getAll('query'), types = url.searchParams.getAll('type'), limits = url.searchParams.getAll('limit');
            if (queries.length !== 1 || types.length > 1 || limits.length > 1 ||
                [...url.searchParams.keys()].some(key => !['query', 'type', 'limit'].includes(key))) {
              throw new CoordinationError('source-read-request-invalid', 400);
            }
            result = await openCode.sourceFind(run.sessionId, queries[0], { directory: run.directory,
              ...(types.length ? { type: types[0] } : {}), ...(limits.length ? { limit: Number(limits[0]) } : {}) });
          }
        } catch (cause) {
          if (/^opencode-source-(?:path|find|size|scope)-/.test(cause?.code || '')) {
            throw new CoordinationError(cause.code, 400);
          }
          throw cause;
        }
        if (transitions.has(runId)) throw new CoordinationError('run-transition-in-flight');
        registry.admission(runId);
        const current = registry.runs.get(runId), currentJob = context.publicJob();
        if (!current || current.version !== initialVersion || current.sessionId !== run.sessionId ||
            current.directory !== run.directory || currentJob?.sessionId !== run.sessionId ||
            currentJob?.directory !== run.directory) throw new CoordinationError('source-read-run-changed');
        json(response, 200, { ...result, runId, reservationVersion: initialVersion }); return;
      }
      if(request.method==='POST' && url.pathname==='/shell-stage') {
        registry.admission(runId);
        const job=context.publicJob();
        if(!job?.armed || job.strictCommands!==true || job.jobId!==payload.jobId || job.sessionId!==payload.sessionId ||
           job.directory!==run.directory || job.recovery || job.modelTransition || context.hasUnresolvedValidation() || context.pendingEffects())throw new CoordinationError('shell-stage-boundary-invalid');
        registry.owned(runId,payload.reservationVersion);
        checkCommandLength({commands:[payload.payload]},maxCommandLength);
        await checkNative(payload.sessionId,true);
        try{await context.assertNativeShellAsk()}catch(cause){if(cause.code==='NATIVE_PERMISSION_GUARD')throw new CoordinationError(cause.message);throw cause}
        registry.admission(runId);registry.owned(runId,payload.reservationVersion);
        const binding={runId,contextId:run.contextId,directory:run.directory,host,port:server.address().port,opencodePid:(await openCode.info(true)).pid};
        const preview=shellStages.preview(payload,binding);checkCommandLength({commands:[preview.command]},maxCommandLength);
        json(response,201,shellStages.create(payload,binding));return;
      }
      const shellStagePath=/^\/shell-stage\/([A-Za-z0-9][A-Za-z0-9_.-]{0,99})(\/payload)?$/.exec(url.pathname);
      if(request.method==='GET' && shellStagePath) {
        const stage=shellStages.get(shellStagePath[1]);
        if(!stage)throw new CoordinationError('shell-stage-unknown',404);
        if(stage.runId!==runId)throw new CoordinationError('shell-stage-context-divergent');
        if(!shellStagePath[2]){json(response,200,shellStages.describe(stage.stageId));return;}
        // Only an already-issued native call may receive its immutable body.
        const deadline=Date.now()+1000;
        while(registry.resourceState.operations[stage.operationId]?.state==='ISSUING' && Date.now()<deadline && !closing)
          await new Promise(resolve=>setTimeout(resolve,10));
        const pid=(await openCode.info(true)).pid;
        registry.admission(runId);
        const operation=registry.resourceState.operations[stage.operationId],access=registry.resourceState.accesses[operation?.accessId];
        assertShellDelivery(stage,{run:registry.runs.get(runId),job:context.publicJob(),operation:context.operation(stage.requestId),
          decision:context.decision(stage.requestId),registered:operation,access,restored:registry.restoredAccesses.has(access?.accessId),
          pid,host,port:server.address().port});
        registry.testsForOperation(runId,operation.resources);
        if(closing)throw new CoordinationError('cab-stopping',503);
        const bytes=Buffer.from(stage.payload,'utf8');response.writeHead(200,{'content-type':'text/plain; charset=utf-8','content-length':bytes.length,'cache-control':'no-store'});response.end(bytes);return;
      }
      const admissionPath = /^\/decision\/([^/]+)\/admission$/.exec(url.pathname);
      if (request.method === 'GET' && admissionPath) {
        const id = admissionPath[1], owner = registry.requestOwners[id];
        if (owner && owner.runId !== runId) throw new CoordinationError('decision-run-divergent');
        const registered = context.hasRequest(id), recorded = context.decision(id) !== undefined;
        const known = Boolean(owner || registered || recorded);
        json(response,known ? 200 : 404,{...(known ? {} : {error:'decision-validation-unknown'}),runId,requestId:id,
          admission:admissionSnapshot(runId),owner_registered:Boolean(owner),validation_registered:registered,
          decision_recorded:known ? recorded : null});
        return;
      }
      if (request.method === 'GET' && url.pathname === '/test-resources') {
        json(response, 200, { runId, protocol: TEST_RESOURCE_PROTOCOL, reservations: publicTestReservations(runId) }); return;
      }
      if (request.method === 'GET' && url.pathname === '/test-resources/reconcile-preview') {
        const ids=url.searchParams.getAll('transactionId');
        if(ids.length!==1||[...url.searchParams.keys()].some(key=>key!=='transactionId'))
          throw new CoordinationError('test-reconciliation-request-invalid',400);
        const preview=registry.restoredTestReconciliationSnapshot(runId,ids[0]);
        json(response,200,{protocol:TEST_RESOURCE_PROTOCOL,...preview});return;
      }
      if (request.method === 'POST' && url.pathname === '/test-resources/reconcile-restored') {
        const existing=registry.resourceState.testReservations?.[payload?.transactionId]?.reconciliationReceipts?.[payload?.reconciliationId];
        if(existing){json(response,200,registry.reconcileRestoredTests(runId,payload,null));return;}
        const run=registry.runs.get(runId),job=context.publicJob();
        if(!run||run.state!=='RESERVED'||run.phase!=='WORK'||run.suspension)
          throw new CoordinationError('test-reconciliation-run-not-quiescent');
        if(!job?.armed||job.runId!==runId||job.sessionId!==run.sessionId||job.directory!==run.directory||
            job.currentCabMandate||job.recovery||context.publicStatus().undecidedValidationCount)
          throw new CoordinationError('test-reconciliation-job-not-quiescent');
        const leased=registry.resourceState.testReservations[payload?.transactionId];
        if(!leased || context.pendingEffectsFor(leased.resources))throw new CoordinationError('test-reconciliation-effect-pending');
        const preview=registry.restoredTestReconciliationSnapshot(runId,payload?.transactionId);
        if(preview.boundaryDigest!==payload?.boundaryDigest||preview.version!==payload?.version||
            preview.fencing!==payload?.fencing)throw new CoordinationError('test-reconciliation-boundary-changed');
        const entry=registry.resourceState.testReservations[payload.transactionId];
        const linked=registry.operationTests(entry);
        if(linked.some(op=>!['PREPARED','CANCELLED','COMPLETED'].includes(op.state)||
            op.state!=='COMPLETED'&&(op.native||op.nativeRecovery||op.onceAcknowledged===true)||
            op.state==='COMPLETED'&&(!op.nativeResult||!op.completionDigest)))
          throw new CoordinationError('test-reconciliation-boundary-required');
        await reconcileTerminalNativeOutcomes(runId,{operationIds:linked.map(op=>op.operationId)});
        const generation=nativeSessionGenerations.get(run.sessionId)||0;
        const readBoundary=async()=>{
          const [messages,permissions,activeSessions]=await Promise.all([
            openCode.messages(run.sessionId,run.directory),
            openCode.permissions(run.directory,{sessionIds:[run.sessionId],verifyInputs:true}),
            openCode.sessionStatus(run.directory),
          ]);
          if(!Array.isArray(messages)||!Array.isArray(permissions)||!record(activeSessions)||
              permissions.some(permission=>permission.sessionID===run.sessionId)||
              activeSessions[run.sessionId]&&activeSessions[run.sessionId].type!=='idle')
            throw new CoordinationError('native-session-not-quiescent');
          return {messages,session:activeSessions[run.sessionId]??null};
        };
        const revision=registryRevision,first=await readBoundary();
        await new Promise(resolveDelay=>setTimeout(resolveDelay,25));
        const second=await readBoundary();
        if(generation!==(nativeSessionGenerations.get(run.sessionId)||0)||revision!==registryRevision||
            proofHash(first.messages)!==proofHash(second.messages)||proofHash(first.session)!==proofHash(second.session))
          throw new CoordinationError('test-reconciliation-boundary-changed');
        const current=registry.restoredTestReconciliationSnapshot(runId,payload.transactionId);
        if(current.boundaryDigest!==preview.boundaryDigest)throw new CoordinationError('test-reconciliation-boundary-changed');
        const proofBody={runId,contextId:run.contextId,transactionId:entry.transactionId,version:run.version,
          fencing:entry.fencing,boundaryDigest:current.boundaryDigest,sessionId:run.sessionId,
          operationsDigest:proofHash(current.operations),sessionIdle:true,pendingPermissions:0,
          transcriptDigest:proofHash(second.messages),observedAt:new Date().toISOString()};
        const proof={...proofBody,proofDigest:proofHash(proofBody)};
        const reconciled=registry.reconcileRestoredTests(runId,payload,proof);
        json(response,200,reconciled);return;
      }
      if (request.method === 'POST' && url.pathname === '/test-resources/acquire') {
        const result = registry.acquireTests(runId, payload);
        json(response, result.state === 'WAITING' ? 202 : 200, result); return;
      }
      if (request.method === 'POST' && url.pathname === '/test-resources/cancel') {
        json(response, 200, registry.cancelTests(runId, payload)); return;
      }
      if (request.method === 'POST' && url.pathname === '/test-resources/release-unused') {
        registry.admission(runId);
        const entry = registry.testHeld(runId, payload);
        const proof = await verifyUnusedTestHistory(runId, context, entry, payload);
        json(response, 200, registry.releaseUnusedTests(runId, payload, proof)); return;
      }
      if (request.method === 'GET' && url.pathname === '/test-resources/release-unused-preview') {
        const transactionId = url.searchParams.get('transactionId');
        if (!transactionId || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(transactionId)) {
          throw new CoordinationError('test-transaction-invalid', 400);
        }
        const entry = registry.resourceState.testReservations?.[transactionId];
        const reservation = registry.testReservations(runId).find((item) => item.transactionId === transactionId);
        const run = registry.runs.get(runId);
        if (!entry || entry.runId !== runId || !reservation || reservation.state !== 'HELD' ||
            reservation.reconciliationRequired !== true || !run) {
          throw new CoordinationError('test-unused-recovery-required');
        }
        const previewInput = { version: entry.version, transactionId, fencing: entry.fencing,
          contextId: entry.contextId, sessionId: run.sessionId, boundaryDigest: registry.unusedTestBoundary(entry) };
        let nativeProof = null, blockerCode = null;
        try { nativeProof = await verifyUnusedTestHistory(runId, context, entry, previewInput, { previewOnly: true }); }
        catch (cause) {
          blockerCode = /^[a-z0-9-]{1,100}$/.test(cause?.code || '') ? cause.code : 'test-unused-preview-unavailable';
        }
        const provenClassifications = new Map((nativeProof?.operationClassifications || []).map((item) =>
          [item.operationId,item.classification]));
        const operations = registry.unusedTestOperations(entry).map((op) => ({ operationId: op.operationId,
          state: op.state, nativeKind: op.native?.kind ?? null, onceAcknowledged: Boolean(op.native?.onceAcknowledged),
          rejectionOnly: registry.isRejectionOnlyOperation(op),
          classification: provenClassifications.get(op.operationId) ?? null }));
        const approvedChangeScope = validatedChangeScopeForTestRecovery(runId, context, entry);
        json(response, 200, { runId, protocol: TEST_RESOURCE_PROTOCOL, transactionId, state: entry.state,
          reconciliationRequired: true, version: entry.version, contextId: entry.contextId,
          sessionId: run.sessionId, fencing: entry.fencing, boundaryDigest: previewInput.boundaryDigest,
          nativeProof, operations, blockerCode, approvedChangeScope,
          eligibleForLostTokenRelease: approvedChangeScope && nativeProof !== null, snapshot_only: true }); return;
      }
      if (request.method === 'POST' && url.pathname === '/test-resources/release-unused-lost-token') {
        const replay = registry.unusedTestReplay(runId, payload);
        if (replay) { json(response, 200, replay); return; }
        const entry = registry.restoredTestForUnusedRecovery(runId, payload);
        if (!validatedChangeScopeForTestRecovery(runId, context, entry)) {
          throw new CoordinationError('test-unused-approved-change-required');
        }
        const proof = await verifyUnusedTestHistory(runId, context, entry, payload);
        json(response, 200, registry.releaseUnusedTests(runId, payload, proof,
          { lostTokenRecovery: true, validatedChangeScope: true })); return;
      }
      if (request.method === 'POST' && ['/test-resources/release', '/test-resources/reconcile'].includes(url.pathname)) {
        if (url.pathname.endsWith('/reconcile') && registry.resourceState.testReservations?.[payload.transactionId]?.reconciliationReceipts?.[payload.reconciliationId]) {
          json(response, 200, registry.reconcileTests(runId, payload)); return;
        }
        const entry = registry.testHeld(runId, payload, url.pathname.endsWith('/reconcile'));
        if (context.publicJob()?.currentCabMandate || context.publicJob()?.recovery || context.publicStatus().undecidedValidationCount) {
          throw new CoordinationError('run-not-quiescent');
        }
        await proveNativeCompletions(runId, { operationIds: registry.operationTests(entry).map((op) => op.operationId) });
        await checkNative(context.publicJob()?.sessionId || run.sessionId, true);
        json(response, 200, url.pathname.endsWith('/release') ? registry.releaseTests(runId, payload) : registry.reconcileTests(runId, payload));
        return;
      }
      if (request.method === 'GET' && url.pathname === '/locks') {
        json(response, 200, { runId, protocol: COORDINATION_PROTOCOL, accesses: registry.accesses(runId),
          revisions: registry.revisions(run.resources) }); return;
      }
      if (request.method === 'GET' && url.pathname === '/locks/reconcile-preview') {
        if (url.searchParams.getAll('operationId').length !== 1 || [...url.searchParams.keys()].some((key) => key !== 'operationId')) {
          throw new CoordinationError('access-reconciliation-invalid', 400);
        }
        json(response, 200, registry.restoredAccessReconciliationSnapshot(runId, url.searchParams.get('operationId'))); return;
      }
      if (request.method === 'GET' && url.pathname === '/locks/timeout-quarantine-preview') {
        if (url.searchParams.getAll('operationId').length !== 1 || [...url.searchParams.keys()].some((key) => key !== 'operationId')) {
          throw new CoordinationError('timeout-quarantine-request-invalid', 400);
        }
        json(response, 200, registry.timeoutQuarantineSnapshot(runId, url.searchParams.get('operationId'))); return;
      }
      if (request.method === 'GET' && url.pathname === '/operations') {
        const operationId = url.searchParams.get('operationId') ?? undefined;
        const snapshot = registry.operationSnapshot(runId, operationId);
        for (const op of snapshot.operations) Object.assign(op, recovery.operationReview(runId, op.operationId) || {});
        json(response, 200, snapshot); return;
      }
      if (request.method === 'POST' && ['/integration', '/integration-request'].includes(url.pathname)) {
        throw new CoordinationError('coordination-upgrade-required');
      }
      if (request.method === 'POST' && url.pathname === '/locks/acquire') {
        const operationIds = payload.operationIds || (registry.resourceState.operations[payload.operationId] ? [payload.operationId] : []);
        if (!Array.isArray(operationIds) || operationIds.some((id) =>
          context.decision(registry.resourceState.operations[id]?.requestId)?.decision !== 'approved')) {
          throw new CoordinationError('access-operation-not-approved');
        }
        const access = registry.acquireAccess(runId, payload);
        json(response, access.state === 'WAITING' ? 202 : 200, access); return;
      }
      if (request.method === 'POST' && url.pathname === '/locks/attach') {
        if (!Array.isArray(payload.operationIds) || !payload.operationIds.length) {
          throw new CoordinationError('access-operation-not-approved');
        }
        const access = registry.held(runId, payload);
        for (const id of payload.operationIds) {
          const decision = context.decision(registry.resourceState.operations[id]?.requestId);
          if (decision?.decision === 'approved') continue;
          if (decision || payload.restoreApprovedForCancellation !== true) throw new CoordinationError('access-operation-not-approved');
          await proveRestoredApprovalForCancellation(runId, context, access, id);
        }
        await proveNativeCompletions(runId, access);
        json(response, 200, registry.attachOperations(runId, payload)); return;
      }
      if (request.method === 'POST' && url.pathname === '/locks/reconcile') {
        const access = registry.held(runId, payload);
        await proveNativeCompletions(runId, access);
        await checkNative(registry.resourceState.operations[access.operationIds[0]]?.sessionId || run.sessionId, true);
        const result = registry.reconcileAccess(runId, payload);
        for (const id of access.operationIds) if (registry.resourceState.operations[id].state === 'CANCELLED') {
          context.invalidateOperation(registry.resourceState.operations[id].requestId);
        }
        json(response, 200, result); return;
      }
      if (request.method === 'POST' && url.pathname === '/locks/reconcile-restored') {
        const priorAccess=registry.resourceState.accesses[payload?.operationId];
        if(priorAccess?.reconciliationReceipts?.[payload?.reconciliationId]){
          json(response,200,registry.reconcileRestoredAccess(runId,payload,null));return;
        }
        if (context.publicJob()?.currentCabMandate || context.publicJob()?.recovery || context.publicJob()?.modelTransition ||
            context.pendingEffects() || context.publicStatus().undecidedValidationCount) {
          throw new CoordinationError('run-not-quiescent');
        }
        const before = registry.restoredAccessReconciliationSnapshot(runId, payload?.operationId);
        if (payload?.version !== before.version || payload?.fencing !== before.fencing ||
            payload?.boundaryDigest !== before.boundaryDigest) {
          throw new CoordinationError('access-reconciliation-boundary-changed');
        }
        const sessionId = run.sessionId;
        const generation = nativeSessionGenerations.get(sessionId) || 0;
        const readNativeBoundary = async () => {
          let messages, permissions, sessions;
          try {
            [messages, permissions, sessions] = await Promise.all([
              openCode.messages(sessionId, run.directory),
              openCode.permissions(run.directory, { sessionIds: [sessionId], verifyInputs: true }),
              openCode.sessionStatus(run.directory),
            ]);
          } catch { throw new CoordinationError('access-reconciliation-native-unavailable'); }
          if (!Array.isArray(messages) || !Array.isArray(permissions) || !sessions || typeof sessions !== 'object' || Array.isArray(sessions)) {
            throw new CoordinationError('access-reconciliation-native-invalid');
          }
          const sessionIdle = !sessions[sessionId] || sessions[sessionId].type === 'idle';
          if (!sessionIdle || permissions.some((permission) => permission.sessionID === sessionId)) {
            throw new CoordinationError('native-session-not-quiescent');
          }
          return { messages, permissions, sessions };
        };
        await checkNative(sessionId, true);
        await reconcileTerminalNativeOutcomes(runId, { operationIds: before.operations.map((operation) => operation.operationId) });
        const first = await readNativeBoundary();
        const after = registry.restoredAccessReconciliationSnapshot(runId, payload.operationId);
        await checkNative(sessionId, true);
        const second = await readNativeBoundary();
        if (generation !== (nativeSessionGenerations.get(sessionId) || 0) ||
            before.boundaryDigest !== after.boundaryDigest ||
            proofHash(first.messages) !== proofHash(second.messages) ||
            proofHash(first.permissions) !== proofHash(second.permissions) ||
            proofHash(first.sessions) !== proofHash(second.sessions)) {
          throw new CoordinationError('access-reconciliation-boundary-changed');
        }
        const observedAt = new Date().toISOString();
        const proof = { runId, contextId: before.contextId, accessId: before.accessId, version: before.version,
          fencing: before.fencing, boundaryDigest: before.boundaryDigest, sessionId, operationsDigest: proofHash(before.operations),
          sessionIdle: true, pendingPermissions: 0, transcriptDigest: proofHash(second.messages), observedAt };
        proof.proofDigest = proofHash(proof);
        const result = registry.reconcileRestoredAccess(runId, payload, proof);
        for (const id of result.operationIds) if (registry.resourceState.operations[id]?.state === 'CANCELLED') {
          context.invalidateOperation(registry.resourceState.operations[id].requestId);
        }
        json(response, 200, result); return;
      }
      if (request.method === 'POST' && url.pathname === '/locks/quarantine-timeout') {
        const previous=registry.resourceState.accesses[payload?.operationId]?.timeoutQuarantine;
        if(previous?.quarantineId===payload?.quarantineId){
          json(response,200,registry.quarantineTimedOutPortAccess(runId,payload,null));return;
        }
        const run=registry.runs.get(runId),job=context.publicJob();
        if(!run||!job?.armed||job.sessionId!==run.sessionId||job.directory!==run.directory||
            job.currentCabMandate||job.recovery||job.modelTransition||context.publicStatus().undecidedValidationCount){
          throw new CoordinationError('timeout-quarantine-run-not-quiescent');
        }
        const before=registry.timeoutQuarantineSnapshot(runId,payload?.operationId);
        if(payload?.version!==before.version||payload?.fencing!==before.fencing||payload?.boundaryDigest!==before.boundaryDigest){
          throw new CoordinationError('timeout-quarantine-boundary-changed');
        }
        const operation=registry.resourceState.operations[before.operationId],sessionId=operation.sessionId;
        if(Object.values(registry.resourceState.operations).some(other=>other.runId===runId&&
            other.operationId!==operation.operationId&&['ISSUING','EXECUTING','UNKNOWN'].includes(other.state))){
          throw new CoordinationError('timeout-quarantine-other-effect-active');
        }
        const generation=nativeSessionGenerations.get(sessionId)||0;
        const readNativeBoundary=async()=>{
          let messages,permissions,sessions,shellInventory;
          try{
            [messages,permissions,sessions,shellInventory]=await Promise.all([
              openCode.messages(sessionId,run.directory),
              openCode.permissions(run.directory,{sessionIds:[sessionId],verifyInputs:true}),
              openCode.sessionStatus(run.directory),
              openCode.request('/api/shell',{query:{'location[directory]':run.directory},locationDirectory:run.directory}),
            ]);
          }catch{throw new CoordinationError('timeout-quarantine-native-unavailable');}
          if(!Array.isArray(messages)||!Array.isArray(permissions)||!record(sessions)||Array.isArray(sessions)||
              !record(shellInventory)||shellInventory.location?.directory!==run.directory||!Array.isArray(shellInventory.data)){
            throw new CoordinationError('timeout-quarantine-native-invalid');
          }
          const busy=sessions[sessionId],sessionIdle=!busy||busy.type==='idle';
          if(!sessionIdle||permissions.some(permission=>permission.sessionID===sessionId)){
            throw new CoordinationError('native-session-not-quiescent');
          }
          return {messages,permissions,sessions,shellInventory};
        };
        await checkNative(sessionId,true);
        const first=await readNativeBoundary();
        const parts=first.messages.flatMap(message=>Array.isArray(message.parts)?message.parts:[]);
        const requestEntries=nativeRequestValidationEntries(parts,operation.requestId).filter(entry=>entry.status==='completed');
        const timeoutParts=parts.filter(part=>(part.callID||part.callId)===operation.native?.callId);
        if(requestEntries.length!==1||timeoutParts.length!==1){
          throw new CoordinationError('timeout-quarantine-native-correlation-required');
        }
        const approval=requestEntries[0].input,owner=registry.requestOwners[operation.requestId];
        const ownerDigest=createHash('sha256').update(JSON.stringify(nativeIdentity(approval))).digest('hex');
        if(approval.operation_id!==operation.operationId||approval.operation_digest!==operation.operationDigest||
            approval.run_id!==runId||approval.reservation_version!==operation.version||approval.session_id!==sessionId||
            approval.directory!==run.directory||approval.change_id!==run.changeId||
            proofHash(nativeIdentity(approval))!==operation.identityDigest||owner?.runId!==runId||
            owner.digest!==ownerDigest||operation.decision?.status!=='approved'||
            operation.decision.approvalId!==approval.approval_id){
          throw new CoordinationError('timeout-quarantine-approval-divergent');
        }
        const timeoutPart=nativeTimedOutShellPart(operation,timeoutParts[0],sessionId);
        if(!timeoutPart)throw new CoordinationError('timeout-quarantine-timeout-proof-required');
        const firstSnapshot=proofHash({messages:first.messages,permissions:first.permissions,sessions:first.sessions,
          shellInventory:first.shellInventory,operation:registry.resourceState.operations[operation.operationId],
          access:registry.resourceState.accesses[operation.accessId]});
        await checkNative(sessionId,true);
        const second=await readNativeBoundary(),secondParts=second.messages.flatMap(message=>Array.isArray(message.parts)?message.parts:[]);
        const secondTimeoutParts=secondParts.filter(part=>(part.callID||part.callId)===operation.native?.callId);
        const secondTimeoutPart=secondTimeoutParts.length===1?nativeTimedOutShellPart(operation,secondTimeoutParts[0],sessionId):null;
        const secondSnapshot=proofHash({messages:second.messages,permissions:second.permissions,sessions:second.sessions,
          shellInventory:second.shellInventory,operation:registry.resourceState.operations[operation.operationId],
          access:registry.resourceState.accesses[operation.accessId]});
        if(!secondTimeoutPart||timeoutPart.partDigest!==secondTimeoutPart.partDigest||firstSnapshot!==secondSnapshot||
            generation!==(nativeSessionGenerations.get(sessionId)||0)||
            registry.timeoutQuarantineSnapshot(runId,operation.operationId).boundaryDigest!==before.boundaryDigest){
          throw new CoordinationError('timeout-quarantine-boundary-changed');
        }
        const observedAt=new Date().toISOString();
        const proof={runId,contextId:before.contextId,accessId:before.accessId,operationId:operation.operationId,
          version:before.version,fencing:before.fencing,boundaryDigest:before.boundaryDigest,sessionId,
          operationDigest:operation.operationDigest,identityDigest:operation.identityDigest,
          permissionId:operation.native.permissionId,callId:operation.native.callId,
          timeoutPartDigest:timeoutPart.partDigest,transcriptDigest:proofHash(second.messages),
          shellInventoryDigest:proofHash(second.shellInventory),sessionIdle:true,pendingPermissions:0,observedAt};
        proof.proofDigest=proofHash(proof);
        const result=registry.quarantineTimedOutPortAccess(runId,payload,proof);
        context.invalidateOperation(operation.requestId);
        json(response,200,result);return;
      }
      if (request.method === 'POST' && ['/locks/release', '/publish'].includes(url.pathname)) {
        const receipt = url.pathname === '/publish' ? registry.resourceState.publications[payload.transactionId] : null;
        if (receipt) { json(response, 200, registry.publish(runId, payload)); return; }
        const access = registry.held(runId, payload);
        if (context.publicJob()?.currentCabMandate || (url.pathname === '/publish' &&
            (context.publicJob()?.recovery || context.publicStatus().undecidedValidationCount))) {
          throw new CoordinationError('run-not-quiescent');
        }
        await proveNativeCompletions(runId, access);
        await reconcileTerminalNativeOutcomes(runId, access);
        await checkNative(registry.resourceState.operations[access.operationIds[0]]?.sessionId ||
          context.publicJob()?.sessionId || run.sessionId, true);
        const result = url.pathname === '/publish' ? registry.publish(runId, payload) : registry.releaseAccess(runId, payload);
        for (const id of access.operationIds) context.invalidateOperation(registry.resourceState.operations[id].requestId);
        json(response, 200, result); return;
      }
      if (request.method === 'POST' && url.pathname === '/locks/cancel') {
        const result = registry.cancelAccess(runId, payload);
        for (const id of result.operationIds) context.invalidateOperation(registry.resourceState.operations[id].requestId);
        json(response, 200, result); return;
      }
      if (request.method === 'POST' && url.pathname === '/suspend') {
        if (payload.action === 'RESUME' && context.publicJob()?.modelTransition) throw new CoordinationError('model-transition-pending');
        json(response, 200, registry.suspend(runId, payload)); return;
      }
      if (request.method === 'GET' && url.pathname === '/integration-status') {
        json(response, 200, { runId, referenceVersion: registry.referenceVersion,
          protocol: COORDINATION_PROTOCOL, integrationOwner: null, integrationQueue: [],
          blockers: registry.accesses(runId).flatMap((a) => a.blockers),
          observedAt: new Date().toISOString() }); return;
      }
      if (request.method === 'POST' && ['/resources', '/closing'].includes(url.pathname)) {
        if (context.pendingEffects() || context.publicJob()?.recovery) throw new CoordinationError('run-not-quiescent');
        registry.owned(runId, payload.version);
        proofReferences(payload);
        await checkNative(context.publicJob()?.sessionId || run.sessionId, true);
        if (url.pathname === '/resources') json(response, 200, registry.reduce(runId, payload));
        else json(response, 200, registry.closing(runId, payload));
        return;
      }
      if (request.method === 'POST' && ['/ready', '/reconcile'].includes(url.pathname)) {
        if (context.pendingEffects() || context.publicJob()?.recovery) throw new CoordinationError('run-not-quiescent');
        registry.owned(runId, payload.version);
        proofReferences(payload);
        await checkNative(context.publicJob()?.sessionId || run.sessionId, true);
        if (url.pathname === '/ready') {
          registry.ready(runId, payload.version);
          json(response, 200, registry.snapshot());
        } else {
          const reconciled = registry.reconcile(runId, payload.version, payload.expectedRevisions, payload.evidence);
          observeStatistics(() => statistics.observe(run, 'resource-reconciliation-completed',
            { durationMs: Date.now() - request.cabReceivedAt }));
          json(response, 200, reconciled);
        }
        return;
      }
      if (url.pathname === '/extend' && request.method === 'POST') {
        if (context.pendingEffects() || context.publicJob()?.recovery) throw new CoordinationError('run-not-quiescent');
        json(response, 200, registry.extend(runId, payload)); return;
      }
      if (url.pathname === '/release' && request.method === 'POST') {
        if (context.unresolved()) throw new CoordinationError('run-not-quiescent');
        registry.owned(runId, payload.version);
        await checkNative(context.publicJob()?.sessionId || run.sessionId, true);
        const gate = context.publicJob()?.terminalGate;
        if (typeof payload.delivered !== 'boolean' || gate?.status !== 'VALIDATED' ||
            (payload.delivered && gate.declaredState !== 'TERMINÉ')) throw new CoordinationError('release-proof-required');
        // Delivery and archive evidence are reviewed by the orchestrator, never inferred by CAB.
        if (!Array.isArray(payload.evidence) || !payload.evidence.length ||
            !payload.evidence.every((e) => typeof e === 'string' && e.length > 0 && e.length <= 500)) {
          throw new CoordinationError('release-evidence-required');
        }
        const released = registry.release(runId, payload.version, payload.delivered);
        context.close();
        contexts.delete(runId);
        json(response, 200, released); return;
      }
      if (request.method === 'POST' && url.pathname === '/job/arm') {
        if (payload.sessionId !== run.sessionId || payload.directory !== run.directory || payload.changeId !== run.changeId) {
          throw new CoordinationError('job-reservation-divergent');
        }
        await checkNative(payload.sessionId);
      }
      if (request.method === 'POST' && url.pathname === '/validation/reconcile') {
        if (!match || !payload || Object.keys(payload).length !== 5 ||
            !['transactionId','developerAuthorization','jobId','recoveryId','approval'].every((key) => Object.hasOwn(payload, key)) ||
            !payload.approval || typeof payload.approval !== 'object' || Array.isArray(payload.approval) ||
            typeof payload.transactionId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(payload.transactionId) ||
            typeof payload.developerAuthorization !== 'string' || !payload.developerAuthorization.trim() ||
            payload.developerAuthorization.length > 500 || broker?.coordination_protocol !== COORDINATION_PROTOCOL) {
          throw new CoordinationError('notification-reconciliation-contract-invalid', 400);
        }
        const approval = payload.approval;
        if (activeContexts().some(([id, candidate]) => id !== runId && candidate.sessions().includes(approval.session_id))) {
          throw new CoordinationError('notification-reconciliation-session-already-owned');
        }
        const identity = JSON.stringify(nativeIdentity(approval));
        const identityDigest = createHash('sha256').update(identity).digest('hex');
        const inputDigest = createHash('sha256').update(JSON.stringify([payload.transactionId,
          payload.developerAuthorization, payload.jobId, payload.recoveryId, identity])).digest('hex');
        const prior = registry.requestOwners[approval?.requestId]?.reconciliation;
        if (prior) {
          registry.checkRequestReconciliation(runId, approval.requestId, identityDigest, { ...prior, inputDigest,
            transactionId: payload.transactionId });
          if (!context.isRejectionOnly(approval.requestId)) throw new CoordinationError('notification-reconciliation-context-lost');
          json(response, 200, prior); return;
        }
        const inspection = await context.inspectNotificationReconciliation(payload,
          (input) => input && JSON.stringify(nativeIdentity(input)) === identity);
        context.checkReconciledValidation(inspection);
        const receipt = registry.reconcileNotification(runId, approval, identityDigest, {
          transactionId: payload.transactionId, inputDigest, jobId: payload.jobId, recoveryId: payload.recoveryId,
          operationId: approval.operation_id, approvalId: approval.approval_id, sessionId: approval.session_id,
          contextId: run.contextId, version: approval.reservation_version, outcome: 'REJECTION_ONLY',
          nativeToolCount: inspection.nativeToolCount, nativeToolHash: inspection.nativeToolHash,
          authorizationDigest: createHash('sha256').update(payload.developerAuthorization).digest('hex'),
          at: new Date().toISOString(),
        });
        context.installReconciledValidation(inspection);
        json(response, 201, receipt); return;
      }
      if(request.method==='POST' && ['/validation/restore-pending','/validation/withdraw-unissued','/validation/reconcile-reviewed-terminal'].includes(url.pathname)) {
        if(!response.cabRecoveryActionId)throw new CoordinationError('recovery-policy-required',403);
        json(response,200,await reconcileValidationBoundary(run,context,payload,response.cabRecoveryActionId,
          url.pathname==='/validation/reconcile-reviewed-terminal',url.pathname==='/validation/withdraw-unissued'));return;
      }
      if (request.method === 'POST' && url.pathname === '/locks/reconcile-quiescent-port') {
        if (!response.cabRecoveryActionId) throw new CoordinationError('recovery-policy-required', 403);
        json(response, 200, await reconcilePortFromProbes(run, payload, response.cabRecoveryActionId)); return;
      }
      if (request.method === 'POST' && url.pathname === '/validation/cancel-reviewed') {
        if (!response.cabRecoveryActionId) throw new CoordinationError('recovery-policy-required', 403);
        json(response, 200, await cancelReviewedValidation(run, context, payload)); return;
      }
      if (request.method === 'POST' && ['/validation/request', '/validation/reminder'].includes(url.pathname)) {
        if (broker?.coordination_protocol !== COORDINATION_PROTOCOL) throw new CoordinationError('coordination-upgrade-required');
        if (context.publicJob() && !context.publicJob().armed) throw new CoordinationError('job-disarmed');
        const approval = payload.approval;
        if (context.hasUnresolvedValidation() && !context.hasRequest(approval?.requestId)) {
          throw new CoordinationError('run-mandate-already-active');
        }
        if (approval?.run_id !== runId || approval?.change_id !== run.changeId ||
            approval?.directory !== run.directory || !context.sessions().includes(approval.session_id)) {
          throw new CoordinationError('validation-reservation-divergent');
        }
        registry.owned(runId, approval.reservation_version);
        const operationResources = approval.resources;
        if (approval.files?.length === 1 && approval.commands?.length === 0 &&
            !operationResources?.some((r) => r.mode === 'write' &&
              (r.key === 'file:' + approval.files[0] || ('file:' + approval.files[0]).startsWith(r.key + '/')))) {
          throw new CoordinationError('operation-outside-reservation');
        }
        registry.scope(runId, approval.reservation_version, operationResources);
        await checkNative(approval.session_id);
        await verifyNativeValidation(approval);
        if (transitions.has(runId) && transitionRun !== runId) throw new CoordinationError('run-transition-in-flight');
        const digest = createHash('sha256').update(JSON.stringify(nativeIdentity(approval))).digest('hex');
        request.cabCommitAdmission = () => {
          const recovery = context.publicJob()?.recovery;
          registry.admitValidation(runId, approval, digest, context.hasRequest(approval.requestId),
            { candidateSession: recovery?.preflightRequestId === approval.requestId ? recovery.sessionId : null });
        };
      }
      if (request.method === 'POST' && url.pathname.startsWith('/decision/')) {
        if (registry.requestOwners[requestId]?.runId !== runId) throw new CoordinationError('decision-run-divergent');
      }
      if (request.method === 'POST' && url.pathname === '/job/terminal-gate') {
        if (registry.unresolvedAccess(runId)) throw new CoordinationError('run-accesses-unresolved');
        await checkNative(context.publicJob()?.sessionId || run.sessionId, true);
      }
      if (request.method === 'POST' && url.pathname === '/job/recover' &&
          activeContexts().some(([id, c]) => id !== runId && c.sessions().includes(payload.sessionId))) {
        throw new CoordinationError('recovery-session-already-owned');
      }
      if (request.method === 'POST' && url.pathname === '/job/recover' && payload.phase === 'reconcile-rejected') {
        if (registry.requestOwners[payload.preflightRequestId]) throw new CoordinationError('recovery-identity-reused');
        const global = registry.resourceState.global;
        if ((global && global.state !== 'RELEASED' &&
            (global.cause !== 'GLOBAL_RECONCILIATION' || payload.globalTransactionId !== global.transactionId)) ||
            ((!global || global.state === 'RELEASED') && payload.globalTransactionId)) {
          throw new CoordinationError('rejected-recovery-global-divergent');
        }
        if (registry.unresolvedAccess(runId)) throw new CoordinationError('run-accesses-unresolved');
      }
    }
    const oldSession = context.publicJob()?.sessionId;
    await context.handle(request, response, url);
    const newSession = context.publicJob()?.sessionId;
    if (runId && oldSession && newSession !== oldSession) registry.transfer(runId, newSession);
  } catch (cause) {
    if(cause.code==='native-validation-evidence-unavailable')response.setHeader('retry-after','1');
    request.cabObserveHttpFailure(cause.code);
    observeStatistics(() => statistics.admissionFailure(attemptedReservation, cause.code));
    if (!response.headersSent) json(response, cause.status || 409,
      cause.code === 'command-too-long' || cause.code === 'run-transition-in-flight' && cause.diagnostic
        ? cause.diagnostic : { error: cause.code || cause.message });
    else response.destroy();
  } finally {
    if (transitionRun) transitions.delete(transitionRun);
    if (lifecycleMutation) lifecycleMutations--;
  }
}
server.listen(port, host, () => { void consumeEvents(); });

async function consumeEvents() {
  if (closing) return;
  try {
    const response = await openCode.events();
    try { await nativeInstances.observe(await openCode.info()); } catch { observations.record('native-instance-observation-unavailable', {}); }
    sseState = 'connected';
    nativeGeneration++;
    const generation = ++sseGeneration;
    statistics.connection(true);
    void openCode.sessionStatus(workspace).then((baseline) => {
      if (sseState === 'connected' && generation === sseGeneration) {
        observeStatistics(() => statistics.nativeSnapshot(baseline, true));
      }
    }).catch(() => { statistics.error = 'statistics-native-baseline-unavailable'; });
    legacy.onConnect();
    for (const [runId, context] of activeContexts()) {
      context.onConnect();
      const run = registry.runs.get(runId);
      if(runtimeMigration?.phase!=='PREPARED')void restoreApprovedOperations(run, context);
      for (const session of (context.observedSessions?.() || context.sessions())) {void refreshBackgroundShells(runId,session);void refreshNativeUsage(runId,session);}
    }
    const decoder = new TextDecoder();
    let buffer = '';
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const frames = buffer.split('\n\n');
      buffer = frames.pop() || '';
      if (buffer.length > 1024 * 1024) throw new Error('SSE frame too large');
      for (const frame of frames) {
        const data = frame.match(/^data:\s*(.+)$/m)?.[1];
        if (!data) continue;
        let event;
        try { event = normalizeOpenCodeEvent(JSON.parse(data)); } catch { continue; }
        if (!event) continue;
        observeStatistics(() => statistics.nativeEvent(event));
        legacy.onEvent(event);
        const props = event.payload?.properties || event.properties || {};
        const session = props.sessionID || props.sessionId || props.part?.sessionID || props.info?.sessionID || props.info?.id;
        const type = event.payload?.type || event.type;
        if (session && activeContexts().some(([, context]) => (context.observedSessions?.() || context.sessions()).includes(session))) {
          nativeSessionGenerations.set(session, (nativeSessionGenerations.get(session) || 0) + 1);
        }
        if (['session.status', 'session.idle', 'session.updated', 'session.deleted', 'session.inbox.enqueued', 'session.execution.started', 'session.execution.succeeded', 'session.execution.failed', 'session.execution.interrupted', 'permission.asked', 'permission.replied'].includes(type) &&
            (legacy.sessions().includes(session) || registry.resourceState.legacySources.some((source) => source.sessionId === session) ||
              activeContexts().some(([, context]) => (context.observedSessions?.() || context.sessions()).includes(session)))) nativeGeneration++;
        for (const [, context] of activeContexts()) {
          if (context.sessions().includes(session)) context.onEvent(event);
        }
        if (props.part) for (const [runId, context] of activeContexts()) {
          if ((context.observedSessions?.() || context.sessions()).includes(session)) observeNativeCompletion(runId, props.part, session);
        }
        if (['shell.exited','session.shell.ended'].includes(type)) {
          for (const [runId,context] of activeContexts()) {
            for (const ownedSession of (context.observedSessions?.() || context.sessions())) void refreshBackgroundShells(runId,ownedSession);
          }
        }
        if (['session.idle', 'session.execution.succeeded', 'session.execution.failed',
          'session.execution.interrupted'].includes(type)) {
          for (const [runId, context] of activeContexts()) {
            if ((context.observedSessions?.() || context.sessions()).includes(session)) {
              void restoreApprovedOperations(registry.runs.get(runId), context);
              void reconcileNativeCompletionsFromTranscript(runId, session);
              void refreshNativeUsage(runId,session);
            }
          }
        }
      }
    }
  } catch { /* Connection state is published below; no event or effect is invented. */ }
  if (closing) return;
  sseState = 'reconnecting';
  nativeGeneration++;
  sseGeneration++;
  statistics.connection(false);
  // Transport loss does not establish a new outcome for an already tracked effect.
  legacy.onDisconnect();
  for (const [, context] of activeContexts()) context.onDisconnect();
  reconnectTimer = setTimeout(() => { void consumeEvents(); }, reconnectMs);
}
async function shutdown() {
  if (closing) return;
  closing = true;
  lifetime.stop();
  clearTimeout(reconnectTimer);
  transportAbort.abort();
  try {
    const closedContexts = [legacy.close(), ...[...contexts.values()].map((context) => context.close())];
    await boundedCleanup(async () => {
      await closeHttpServer(server);
      await Promise.all([...requests, ...closedContexts]);
      await statistics.close();
      if (handoffIntent && backgroundReconciliations.size === 0 && Date.now() < handoffIntent.expiresAt &&
          [legacy, ...contexts.values()].every(context => context.transportHandoffReady())) {
        await Promise.all([legacy, ...contexts.values()].map(context => context.flushCommunication()));
        handoffJournal.seal(registry);
      }
      await registry.close();
      if ((statistics.persistEnabled && statistics.dirty) || statistics.observations.error) {
        throw new Error('statistics-shutdown-incomplete');
      }
    });
    process.exit(0);
  } catch {
    process.stderr.write('CAB contrôleur : arrêt incomplet.\n');
    process.exit(SHUTDOWN_INCOMPLETE);
  }
}
const lifetime = followOpenCodeLifetime(openCode, { onExit: shutdown,
  onDiagnostic: (code) => process.stderr.write(code + '\n') });
lifetime.start();
process.on('SIGTERM', () => { void shutdown(); });
process.on('SIGINT', () => { void shutdown(); });
