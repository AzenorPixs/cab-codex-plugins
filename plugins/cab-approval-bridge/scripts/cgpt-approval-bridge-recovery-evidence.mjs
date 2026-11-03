import { createHash } from 'node:crypto';
import { canonicalContinuityDigest as digest } from './cgpt-approval-bridge-continuity.mjs';

export const VERSION = '2.2.8';
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

export function pendingValidationProof(parts, approval, sameIdentity, now = Date.now()) {
  const outputs = parts.filter(part => part.type === 'tool' &&
    ['cgpt-validation_get_approval','cgpt-validation_poll_approval','cgpt-validation_request_validation'].includes(part.tool) &&
    part.state?.status === 'completed').flatMap(part => {
      try { return [{part,value:JSON.parse(part.state.output)}]; } catch { return []; }
    }).filter(({value}) => value?.requestId === approval.requestId || value?.approval_id === approval.approval_id);
  if (outputs.some(({value}) => value.status !== 'PENDING' || !sameIdentity(value))) fail('pending-validation-result-conflict');
  const reads = outputs.filter(({part,value}) => part.tool === 'cgpt-validation_get_approval' &&
    part.state.input?.approval_id === approval.approval_id && part.state.metadata?.truncated !== true &&
    Number.isFinite(part.state.time?.end) && part.state.time.end <= now && now - part.state.time.end <= 300000 &&
    Number.isFinite(Date.parse(value.expires_at)) && Date.parse(value.expires_at) > now);
  if (!reads.length) fail('pending-validation-fresh-read-required');
  const latest = reads.reduce((a,b) => a.part.state.time.end > b.part.state.time.end ? a : b);
  return {kind:'PENDING_VALIDATION',callId:latest.part.callID || latest.part.callId,
    partDigest:digest(latest.part),observedAt:latest.part.state.time.end,expiresAt:Date.parse(latest.value.expires_at)};
}

export function validateTerminalReview(review, ownerId) {
  if (!review || Object.keys(review).some(key => !['ownerId','effect','commandSha256','sourceFiles','evidenceRefs','callId','partDigest'].includes(key)) ||
      review.ownerId !== ownerId || review.effect !== 'READ_ONLY' || !hash(review.commandSha256) ||
      !id(review.callId) || !hash(review.partDigest) || !Array.isArray(review.sourceFiles) || !review.sourceFiles.length || review.sourceFiles.length > 20 ||
      !Array.isArray(review.evidenceRefs) || !review.evidenceRefs.length || review.evidenceRefs.length > 20 ||
      review.evidenceRefs.some(ref => typeof ref !== 'string' || !/^[A-Za-z0-9_.:/@-]{1,240}$/.test(ref))) fail('terminal-review-invalid');
  const paths = new Set();
  for (const source of review.sourceFiles) {
    if (!source || Object.keys(source).some(key => !['path','sha256'].includes(key)) || typeof source.path !== 'string' ||
        !source.path || source.path.startsWith('/') || source.path.split('/').some(x => !x || x === '.' || x === '..') ||
        source.path.includes('\\') || !hash(source.sha256) || paths.has(source.path)) fail('terminal-review-source-invalid');
    paths.add(source.path);
  }
}

export function excludeClosedValidationParts(parts, retirements, run, terminalCallId) {
  const terminal=parts.find(p=>(p.callID||p.callId)===terminalCallId);
  const start=terminal?.state?.time?.start;
  if(!Number.isFinite(start))fail('terminal-review-native-divergent');
  const excluded=new Map(),claims=new Set(),byCall=new Map();
  for(const part of parts){const id=part.callID||part.callId;if(id){const matches=byCall.get(id)||[];matches.push(part);byCall.set(id,matches);}}
  const remember=(part,old)=>{
    const callId=part.callID||part.callId;
    if(excluded.has(part)||claims.has(callId))fail('terminal-prior-review-duplicate');
    const end=part.state?.time?.end;
    if(!Number.isFinite(end)||end>=start)fail('terminal-prior-review-not-earlier');
    excluded.set(part,{callId,partDigest:digest(part),actionId:old.actionId,proofDigest:old.proofDigest});claims.add(callId);
  };
  for(const old of retirements) {
    const approval=old.approval;
    if(!approval||approval.run_id!==run.runId||approval.requestId!==old.requestId||approval.approval_id!==old.approvalId||
      approval.operation_id!==old.operationId||old.review?.ownerId!==run.ownerId)fail('terminal-prior-review-identity-divergent');
    const priorCallIds=new Set(old.review.rejectedCalls.map(x=>x.callId));
    for(const callId of priorCallIds) for(const part of byCall.get(callId)||[]) {
      if(part.tool!=='bash'||part.nativeFormat!=='opencode-v2'||part.executed!==false||part.state?.status!=='error'||
        part.nativeErrorType!=='aborted'||typeof part.state.input?.command!=='string'||
        commandDigest(part.state.input.command)!==old.review.commandSha256)fail('terminal-prior-review-native-divergent');
      remember(part,old);
    }
    const source=byCall.get(old.sourceCallId)||[];
    if(source.length!==1)fail('terminal-prior-review-source-unverified');
    const part=source[0];
    if(part.tool==='execute') {
      const calls=part.state?.metadata?.toolCalls;
      if(part.executed!==false||part.state?.status!=='completed'||part.state.metadata.truncated!==false||
        !Array.isArray(calls)||calls.length<1||calls.length>2||calls.at(-1)?.tool!=='cgpt-validation.request_validation'||
        calls.at(-1).status!=='completed'||digest(calls.at(-1).input)!==digest(approval)||
        calls.length===2&&(calls[0]?.tool!=='search'||calls[0]?.status!=='completed'||calls[0].input?.namespace!=='cgpt-validation'||
          !/^(?:cgpt-validation\.)?request_validation$/.test(calls[0].input?.query||'')))fail('terminal-prior-review-source-unverified');
    } else if(part.tool!=='cgpt-validation_request_validation'||part.state?.status!=='completed'||digest(part.state.input)!==digest(approval))
      fail('terminal-prior-review-source-unverified');
    remember(part,old);
    for(const claim of old.review.wrapperReviews||[]) {
      const matches=byCall.get(claim.callId)||[];
      if(matches.length!==1)fail('terminal-prior-review-wrapper-unverified');
      const wrapper=matches[0];
      reviewedValidationProjection([wrapper],approval,[claim],{run,sameApproval:value=>old.sameIdentity(value),notAdmitted:old.notAdmitted});
      remember(wrapper,old);
    }
    for(const claim of old.cancelParts||[]){const matches=byCall.get(claim.callId)||[];
      if(matches.length!==1||digest(matches[0])!==claim.partDigest)fail('terminal-prior-review-wrapper-unverified');
      remember(matches[0],old);
    }
  }
  return {parts:parts.filter(p=>!excluded.has(p)),excluded:[...excluded.values()]};
}

export function reviewedTerminalProof(parts, approval, review, run, sameIdentity, notAdmitted = () => false) {
  validateTerminalReview(review,run.ownerId);
  if (approval.commands?.length !== 1 || approval.files?.length !== 0 ||
      commandDigest(approval.commands[0]) !== review.commandSha256) fail('terminal-review-command-divergent');
  const shells = parts.filter(part => part.type === 'tool' && part.tool === 'bash');
  if (shells.length !== 1) fail('terminal-review-effects-uncovered');
  const part = shells[0], state = part.state;
  if ((part.callID || part.callId) !== review.callId || digest(part) !== review.partDigest ||
      part.nativeFormat !== 'opencode-v2' || state?.status !== 'completed' ||
      state.metadata?.truncated !== false || state.metadata?.timeout === true || state.metadata?.error === true ||
      !Number.isInteger(state.metadata?.exit) || state.input?.command !== approval.commands[0] ||
      state.input?.background === true || state.metadata?.shellID || state.input?.workdir !== run.directory ||
      !Number.isFinite(state.time?.start) || !Number.isFinite(state.time?.end) || state.time.end < state.time.start)
    fail('terminal-review-native-divergent');
  for(const p of parts.filter(p=>p.tool==='cgpt-validation_request_validation'&&p.state?.input?.requestId!==approval.requestId)) {
    let value;try{value=JSON.parse(p.state?.output);}catch{fail('terminal-review-effects-uncovered');}
    if(p.state.status!=='completed'||value?.status!=='NOT_ADMITTED'||value.requestId!==p.state.input.requestId||
      !notAdmitted(value.requestId))fail('terminal-review-effects-uncovered');
  }
  const transportParts=parts.filter(p=>p.type==='tool'&&p.tool==='execute');
  const transportOutputs=[];
  for(const p of transportParts) {
    const calls=p.state?.metadata?.toolCalls;
    if(p.executed===false && ['completed','error'].includes(p.state?.status) && p.state.metadata?.error===true &&
      p.state.metadata.truncated===false && Array.isArray(calls) && calls.length===1 &&
      calls[0]?.tool==='cgpt-validation.request_validation' && calls[0].status==='error' &&
      calls[0].input?.requestId!==approval.requestId && calls[0].input?.run_id===run.runId &&
      calls[0].input?.session_id===approval.session_id && notAdmitted(calls[0].input.requestId)) continue;
    if(p.executed!==false || p.state?.status!=='completed' || p.state.metadata?.truncated!==false ||
      !Array.isArray(calls) || !calls.length || calls.length>2 || calls.some(c=>c.status!=='completed'||
        !['cgpt-validation.request_validation','cgpt-validation.get_approval','cgpt-validation.poll_approval','cgpt-validation.broker_readiness','cgpt-validation.lookup_validation','cgpt-validation.broker_health'].includes(c.tool)))
      fail('terminal-review-effects-uncovered');
    const last=calls.at(-1);
    if(calls.every(c=>['cgpt-validation.get_approval','cgpt-validation.poll_approval','cgpt-validation.lookup_validation',
      'cgpt-validation.broker_health','cgpt-validation.broker_readiness'].includes(c.tool))) {
      // Diagnostic transformations are not authoritative approval results.
      // Their exact known MCP calls have no project execution capability.
      continue;
    }
    if(calls.length!==1)fail('terminal-review-effects-uncovered');
    if(last.tool==='cgpt-validation.broker_readiness')continue;
    let value;try{value=JSON.parse(p.state.output);}catch{fail('terminal-review-effects-uncovered');}
    if(last.tool==='cgpt-validation.request_validation'&&last.input?.requestId!==approval.requestId) {
      if(value?.status!=='NOT_ADMITTED'||value.requestId!==last.input?.requestId||!notAdmitted(value.requestId))fail('terminal-review-effects-uncovered');
      continue;
    }
    if(last.tool==='cgpt-validation.request_validation' ? !sameIdentity(last.input) : last.input?.approval_id!==approval.approval_id)
      fail('terminal-review-effects-uncovered');
    transportOutputs.push(value);
  }
  const allowed = new Set(['cgpt-validation_request_validation','cgpt-validation_get_approval','cgpt-validation_poll_approval',
    'cgpt-validation_broker_readiness','cgpt-validation_broker_health','cgpt-validation_lookup_validation','cab_codemode_discovery']);
  if (parts.some(p => p.type === 'tool' && p !== part && p.tool!=='execute' && !allowed.has(p.tool))) fail('terminal-review-effects-uncovered');
  const outputs = parts.filter(p => ['cgpt-validation_request_validation','cgpt-validation_get_approval','cgpt-validation_poll_approval'].includes(p.tool) &&
    p.state?.status === 'completed').flatMap(p => { try { return [JSON.parse(p.state.output)]; } catch { return []; } })
    .filter(value => value?.requestId === approval.requestId || value?.approval_id === approval.approval_id);
  outputs.push(...transportOutputs);
  if (!outputs.some(value => value.status === 'APPROVED' && value.reviewer === 'CGPT' && sameIdentity(value)) ||
      outputs.some(value => !sameIdentity(value) || !['PENDING','APPROVED'].includes(value.status))) fail('terminal-review-approval-unverified');
  return {kind:'REVIEWED_READ_ONLY_TERMINAL',callId:review.callId,partDigest:review.partDigest,
    observedExit:state.metadata.exit,finishedAt:state.time.end,commandSha256:review.commandSha256,
    executionOutcome:'NATIVE_TERMINAL_OBSERVED_PERMISSION_UNVERIFIED',evidenceAuthority:'ORCHESTRATOR_AUDIT_REVIEW'};
}
