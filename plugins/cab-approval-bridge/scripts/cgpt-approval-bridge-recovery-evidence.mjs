import { createHash } from 'node:crypto';
import { canonicalContinuityDigest as digest } from './cgpt-approval-bridge-continuity.mjs';

export const VERSION = '2.2.4';
export const commandDigest = command => createHash('sha256').update(command).digest('hex');
const id = value => typeof value === 'string' && /^[A-Za-z0-9_.-]{1,200}$/.test(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const fail = code => { throw Object.assign(new Error(code), { code, status: 409 }); };

export function nativeEvidenceView({ run, operation, approval, parts, native, activeSessions, permissions, journal, replies }) {
  const calls = parts.filter(part => part?.type === 'tool' && part.tool === 'bash').map(part => ({
    callId: part.callID || part.callId || null, status: part.state?.status || null,
    executed: typeof part.executed === 'boolean' ? part.executed : null,
    nativeFormat: part.nativeFormat || null, nativeErrorType: part.nativeErrorType || null,
    commandSha256: typeof part.state?.input?.command === 'string' ? commandDigest(part.state.input.command) : null,
    partDigest: digest(part),
  }));
  const commandSha256 = approval?.commands?.length === 1 && approval.files?.length === 0
    ? commandDigest(approval.commands[0]) : null;
  const relevantCalls = operation.native?.callId ? calls.filter(call => call.callId === operation.native.callId) : calls;
  const covered = new Set((journal?.events || []).map(event => event.callId));
  const missingCalls = relevantCalls.filter(call => !covered.has(call.callId)).map(call => call.callId);
  const value = { protocol: 'cab-native-recovery-evidence-v1', runId: run.runId, ownerId: run.ownerId,
    contextId: run.contextId, version: run.version, operationId: operation.operationId,
    operationDigest: operation.operationDigest, sessionId: operation.sessionId,
    nativePid: native.pid, nativeVersion: native.version, commandSha256,
    sessionIdle: !Object.hasOwn(activeSessions, operation.sessionId), pendingPermissionCount: permissions.length,
    calls: relevantCalls.slice(0, 100), callsTruncated: relevantCalls.length > 100,
    transportWrappers: parts.filter(part => part?.type === 'tool' && part.tool === 'execute').slice(0,50).map(part => ({
      callId: part.callID || part.callId || null, codeSha256: typeof part.state?.input?.code === 'string'
        ? commandDigest(part.state.input.code) : null, partDigest: digest(part),
      tools: Array.isArray(part.state?.metadata?.toolCalls) ? part.state.metadata.toolCalls.map(call => call?.tool).slice(0,20) : [],
    })),
    replyReceipts: (replies?.receipts || []).filter(receipt => relevantCalls.some(call => call.callId === receipt.callId)).slice(0, 100),
    replyReceiptsTruncated: replies?.truncated === true,
    journal: { watermark: journal?.watermark || null, toolEventCount: journal?.events?.length || 0,
      coverage: missingCalls.length ? 'MISSING_RELEVANT_CALLS' : relevantCalls.length ? 'COVERED' : 'NO_RELEVANT_CALLS',
      missingCalls: missingCalls.slice(0, 100) },
    decisionOwner: 'orchestrator', nativeExecutionOutcome: 'UNVERIFIED', snapshot_only: true,
  };
  return value;
}

export function validateReviewStructure(review, ownerId) {
  if (!review || Object.keys(review).some(key => !['ownerId','effect','commandSha256','sourceFiles','rejectedCalls','evidenceRefs','wrapperReviews'].includes(key)) ||
      review.ownerId !== ownerId || review.effect !== 'READ_ONLY' || !hash(review.commandSha256) ||
      !Array.isArray(review.rejectedCalls) || !review.rejectedCalls.length || review.rejectedCalls.length > 100 ||
      !Array.isArray(review.sourceFiles) || review.sourceFiles.length > 20 ||
      !Array.isArray(review.evidenceRefs) || !review.evidenceRefs.length || review.evidenceRefs.length > 20 ||
      review.evidenceRefs.some(ref => typeof ref !== 'string' || !/^[A-Za-z0-9_.:/@-]{1,240}$/.test(ref)))
    fail('recovery-readonly-review-invalid');
  const seen = new Set();
  for (const rejected of review.rejectedCalls) {
    if (!rejected || Object.keys(rejected).some(key => !['callId','permissionId','auditExecutionId','ackStatus'].includes(key)) ||
        !id(rejected.callId) || !id(rejected.permissionId) || !id(rejected.auditExecutionId) || rejected.ackStatus !== 204 ||
        seen.has(rejected.callId)) fail('recovery-readonly-review-invalid');
    seen.add(rejected.callId);
  }
  for (const source of review.sourceFiles) {
    if (!source || Object.keys(source).some(key => !['path','sha256'].includes(key)) || typeof source.path !== 'string' ||
        source.path.startsWith('/') || source.path.split('/').includes('..') || source.path.includes('\\') || !hash(source.sha256))
      fail('recovery-readonly-review-source-invalid');
  }
  if (review.wrapperReviews !== undefined && (!Array.isArray(review.wrapperReviews) || review.wrapperReviews.length > 50 ||
      new Set(review.wrapperReviews.map(item => item?.callId)).size !== review.wrapperReviews.length ||
      review.wrapperReviews.some(item => !item || Object.keys(item).some(key =>
        !['callId','codeSha256','effect','returnsNativeResult'].includes(key)) || !id(item.callId) || !hash(item.codeSha256) ||
        item.effect !== 'VALIDATION_TRANSPORT_ONLY' || item.returnsNativeResult !== true)))
    fail('recovery-transport-review-invalid');
  return seen;
}

export function reviewedValidationProjection(parts, approval, reviews, { run, sameApproval, notAdmitted }) {
  const claims = new Map((reviews || []).map(review => [review.callId, review]));
  const observed = new Set(), result = [];
  const allowed = new Set(['cgpt-validation.get_approval','cgpt-validation.poll_approval',
    'cgpt-validation.broker_readiness','cgpt-validation.cancel_approval','cgpt-validation.request_validation']);
  for (const part of parts) {
    const claim = claims.get(part.callID || part.callId);
    if (!claim) { result.push(part); continue; }
    if (part.tool !== 'execute' || part.executed !== false || part.state?.status !== 'completed' ||
        part.state.metadata?.truncated !== false || !Array.isArray(part.state.metadata.toolCalls) ||
        part.state.metadata.toolCalls.length > 20 || typeof part.state.input?.code !== 'string' ||
        commandDigest(part.state.input.code) !== claim.codeSha256) fail('recovery-transport-review-divergent');
    observed.add(claim.callId);
    const calls = part.state.metadata.toolCalls;
    if (calls.some(call => call?.status !== 'completed' || call.tool === 'search' &&
        (call.input?.namespace !== 'cgpt-validation' ||
          !/^(?:cgpt-validation\.)?(?:cancel_approval|request_validation|get_approval|poll_approval|broker_readiness)$/.test(call.input?.query || '')) ||
        call?.tool !== 'search' && !allowed.has(call?.tool))) fail('recovery-transport-review-unsupported');
    const nativeCalls = calls.filter(call => call.tool !== 'search');
    if (!nativeCalls.length) continue;
    let output; try { output = JSON.parse(part.state.output); } catch { fail('recovery-transport-review-output-invalid'); }
    if (nativeCalls.some(call => call.tool === 'cgpt-validation.request_validation')) {
      const input = nativeCalls[0]?.input;
      if (nativeCalls.length !== 1 || output?.status !== 'NOT_ADMITTED' || input?.requestId === approval.requestId ||
          input?.run_id !== run.runId || input?.change_id !== run.changeId || input?.directory !== run.directory ||
          input?.session_id !== approval.session_id || output.run_id !== run.runId ||
          output.operation_id !== input.operation_id || output.approval_id !== input.approval_id ||
          (output.requestId !== input.requestId && !output.legacy_requestIds?.includes(input.requestId)) ||
          !notAdmitted(output.requestId) || !notAdmitted(input.requestId)) fail('recovery-transport-review-not-admitted-unverified');
      continue;
    }
    if (nativeCalls.some(call => call.tool === 'cgpt-validation.cancel_approval') &&
        (nativeCalls.filter(call => call.tool === 'cgpt-validation.cancel_approval').length !== 1 ||
          nativeCalls.at(-1).tool !== 'cgpt-validation.cancel_approval')) fail('recovery-transport-review-unsupported');
    for (const call of nativeCalls) if (call.tool !== 'cgpt-validation.broker_readiness' &&
        call.input?.approval_id !== approval.approval_id) fail('recovery-transport-review-identity-divergent');
    const last = nativeCalls.at(-1);
    if (last.tool === 'cgpt-validation.broker_readiness') continue;
    if (!sameApproval(output)) fail('recovery-transport-review-identity-divergent');
    const tool = { 'cgpt-validation.cancel_approval': 'cgpt-validation_cancel_approval',
      'cgpt-validation.get_approval': 'cgpt-validation_get_approval',
      'cgpt-validation.poll_approval': 'cgpt-validation_poll_approval' }[last.tool];
    result.push({ type: 'tool', tool, state: { status: 'completed', input: last.input, output: JSON.stringify(output) } });
  }
  if (observed.size !== claims.size) fail('recovery-transport-review-divergent');
  return result;
}

export function validateReadOnlyReview(view, review, run) {
  const seen = validateReviewStructure(review, run.ownerId);
  if (review.commandSha256 !== view.commandSha256 || !view.sessionIdle || view.pendingPermissionCount ||
      view.callsTruncated || review.rejectedCalls.length !== view.calls.length) fail('recovery-readonly-review-invalid');
  for (const rejected of review.rejectedCalls) {
    const call = view.calls.find(item => item.callId === rejected.callId);
    if (!call || call.nativeFormat !== 'opencode-v2' || call.executed !== false || call.status !== 'error' ||
        call.nativeErrorType !== 'aborted' || call.commandSha256 !== review.commandSha256)
      fail('recovery-readonly-review-native-divergent');
  }
  return { evidenceAuthority: 'ORCHESTRATOR_AUDIT_REVIEW', executionOutcome: 'UNDETERMINED_READ_ONLY',
    commandSha256: review.commandSha256, callIds: [...seen], reviewDigest: digest(review) };
}
