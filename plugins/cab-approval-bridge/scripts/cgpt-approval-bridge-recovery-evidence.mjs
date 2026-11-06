import {resolve} from 'node:path';
import { createHash } from 'node:crypto';
import { canonicalContinuityDigest as digest } from './cgpt-approval-bridge-continuity.mjs';

export const VERSION = '2.3.6';
export const commandDigest = command => createHash('sha256').update(command).digest('hex');
const id = value => typeof value === 'string' && /^[A-Za-z0-9_.-]{1,200}$/.test(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const fail = code => { throw Object.assign(new Error(code), { code, status: 409 }); };

export function nativeEvidenceView({ run, operation, approval, parts, native, activeSessions, permissions, journal, replies }) {
  const calls = parts.filter(part => part?.type === 'tool' && ['bash','edit','write'].includes(part.tool)).map(part => ({
    tool:part.tool, nativeTool:part.nativeTool || null, inputSha256:part.state?.input&&typeof part.state.input==='object'&&!Array.isArray(part.state.input)?digest(part.state.input):null,
    callId: part.callID || part.callId || null, status: part.state?.status || null,
    executed: typeof part.executed === 'boolean' ? part.executed : null,
    observedExit:Number.isInteger(part.state?.metadata?.exit)?part.state.metadata.exit:null,
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
    untrackedNativeTerminalObserved:!operation.native && relevantCalls.some(call=>call.status==='completed'&&call.nativeFormat==='opencode-v2'),
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

export function notAdmittedWithdrawalProof(view, parts, approval, sameIdentity, now=Date.now()) {
  if(!view || view.sessionIdle!==true || view.pendingPermissionCount!==0 || view.callsTruncated ||
      view.calls.length!==0)fail('not-admitted-withdrawal-boundary-invalid');
  const outputs=parts.filter(part=>part.type==='tool' && part.state?.status==='completed' &&
    ['cgpt-validation_request_validation','cgpt-validation_get_approval','cgpt-validation_poll_approval'].includes(part.tool))
    .flatMap(part=>{try{return[{part,value:JSON.parse(part.state.output)}];}catch{return[];}})
    .filter(({value})=>value?.requestId===approval.requestId || value?.approval_id===approval.approval_id);
  if(outputs.some(({value})=>!sameIdentity(value) || !['PENDING','NOT_ADMITTED'].includes(value.status)))
    fail('not-admitted-withdrawal-result-conflict');
  const reads=outputs.filter(({part,value})=>part.tool==='cgpt-validation_get_approval' &&
    part.state.input?.approval_id===approval.approval_id && part.state.metadata?.truncated!==true &&
    id(part.callID||part.callId) && value.status==='NOT_ADMITTED' && Number.isFinite(part.state.time?.end) && part.state.time.end<=now &&
    now-part.state.time.end<=300000 && Number.isFinite(Date.parse(value.not_admitted_at)) &&
    Date.parse(value.not_admitted_at)<=part.state.time.end);
  if(!reads.length)fail('not-admitted-withdrawal-fresh-read-required');
  const latest=reads.reduce((a,b)=>a.part.state.time.end>b.part.state.time.end?a:b);
  return {kind:'NOT_ADMITTED_UNISSUED',callId:latest.part.callID||latest.part.callId,
    partDigest:digest(latest.part),executionOutcome:'COORDINATION_WITHDRAWN_BEFORE_ISSUANCE',
    evidenceAuthority:'OWNER_NATIVE_BOUNDARY_REVIEW'};
}

export function validateTerminalReview(review, ownerId) {
  if (!review || Object.keys(review).some(key => !['ownerId','effect','commandSha256','sourceFiles','evidenceRefs','callId','partDigest','inlineCommand'].includes(key)) ||
      review.ownerId !== ownerId || review.effect !== 'READ_ONLY' || !hash(review.commandSha256) ||
      !id(review.callId) || !hash(review.partDigest) || !Array.isArray(review.sourceFiles) ||
      (!review.sourceFiles.length&&review.inlineCommand!==true) || review.sourceFiles.length > 20 ||
      (review.inlineCommand!==undefined&&typeof review.inlineCommand!=='boolean') ||
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

// This proof retires coordination only; it never authorizes the refused input.
// A rejected coordination can be retired on its complete native user-turn graph.
// Later turns are retained in the sealed transcript; they are not declared effect-free.
export function rejectedUnissuedTurnProof(messages, operation, approval, requestPart, noEnvironment, sameIdentity) {
  if (!Array.isArray(messages) || operation?.decision?.status !== 'rejected' || operation.native ||
      operation.nativeResult || operation.onceAcknowledged || operation.requestId !== approval?.requestId ||
      operation.sessionId !== approval.session_id || typeof sameIdentity !== 'function') return null;
  const decisionAt = Date.parse(operation.decision.recordedAt);
  if (!Number.isFinite(decisionAt)) return null;
  const at = messages.findIndex(message => message.parts?.includes(requestPart)), first = messages[at];
  const parent = first?.info?.parentID;
  if (at < 0 || first.info.role !== 'assistant' || !id(parent) || first.info.sessionID !== operation.sessionId) return null;
  const users = new Map();
  for (const message of messages.slice(0,at)) if (message.info?.role === 'user') {
    if (users.has(message.info.id)) return null;users.set(message.info.id,message);
  }
  if (!users.has(parent) || users.get(parent).info.sessionID !== operation.sessionId ||
      !Number.isFinite(users.get(parent).info.time?.created) || users.get(parent).info.time.created > first.info.time?.created) return null;
  const parents = new Set(), scope = [];let rejected = null, terminal = null, end = -1;
  for (let index=at; index<messages.length; index++) {
    const message = messages[index], info = message.info;
    if (!info || info.sessionID !== operation.sessionId || !id(info.id) || !Array.isArray(message.parts)) return null;
    scope.push(message);
    if (['idle','system'].includes(info.role)) { if (message.parts.length) return null;continue; }
    if (info.role === 'user') { if(users.has(info.id)||!Number.isFinite(info.time?.created))return null;users.set(info.id,message);continue; }
    if (info.role !== 'assistant' || !users.has(info.parentID) || !['tool-calls','stop'].includes(info.finish) ||
        !Number.isFinite(info.time?.created) || !Number.isFinite(info.time?.completed) ||
        info.time.completed < info.time.created || users.get(info.parentID).info.time.created > info.time.created ||
        message.parts.some(part => part.type === 'tool' && !noEnvironment(part))) return null;
    parents.add(info.parentID);
    for (const part of message.parts.filter(part => part.type === 'tool' && part.state?.status === 'completed')) {
      const direct = ['cgpt-validation_request_validation','cgpt-validation_get_approval','cgpt-validation_poll_approval'].includes(part.tool);
      const wrapped = part.tool === 'execute' && part.state.metadata?.toolCalls?.some(call =>
        ['cgpt-validation.request_validation','cgpt-validation.get_approval','cgpt-validation.poll_approval'].includes(call.tool));
      if (!direct && !wrapped) continue;
      let value;try{value=JSON.parse(part.state.output);}catch{continue;}
      if (value?.status === 'REJECTED' && sameIdentity(value) && info.time.completed >= decisionAt)
        rejected = {messageId:info.id,callId:part.callID || part.callId,partDigest:digest(part)};
    }
    if (rejected && info.finish === 'stop' && info.time.completed >= decisionAt) { terminal=message;end=index;break; }
  }
  if (!terminal || !rejected) return null;
  const next = messages.findIndex((message,index) => index > end && message.info?.role === 'user');
  if (next < 0 || messages[next].info.sessionID !== operation.sessionId ||
      !Number.isFinite(messages[next].info.time?.created) || messages[next].info.time.created < terminal.info.time.completed ||
      messages.slice(end+1,next).some(message => !['idle','system'].includes(message.info?.role) || message.parts?.length || message.info.sessionID !== operation.sessionId) ||
      messages.slice(next).some(message => message.info?.role === 'assistant' && parents.has(message.info.parentID))) return null;
  return {kind:'REJECTED_UNISSUED_TERMINAL_TURN',executionOutcome:'COORDINATION_WITHDRAWN_BEFORE_ISSUANCE',
    evidenceAuthority:'OWNER_NATIVE_BOUNDARY_REVIEW',terminalTurn:{parentMessageId:parent,
      requestMessageId:first.info.id,terminalMessageId:terminal.info.id,nextUserMessageId:messages[next].info.id,
      rejected,decisionAt,scopeDigest:digest(scope),laterMessagesDigest:digest(messages.slice(next)),wholeTranscriptDigest:digest(messages)}};
}

function rejectedReceiptInstance(receipt, view, endedAt) {
  if (receipt.nativePid === view.nativePid && receipt.nativeVersion === view.nativeVersion) return true;
  const epoch = view.nativeKernelEpoch, ack = Date.parse(receipt.acknowledgedAt);
  return Boolean(epoch && epoch.pid === view.nativePid && epoch.version === view.nativeVersion &&
    /^\d+$/.test(epoch.startTime || '') && hash(epoch.bootIdSha256) &&
    Number.isSafeInteger(epoch.kernelBootMs) && epoch.kernelBootMs > endedAt &&
    Number.isFinite(ack) && ack < epoch.kernelBootMs &&
    Number.isSafeInteger(receipt.nativePid) && receipt.nativePid > 0 && typeof receipt.nativeVersion === 'string');
}

// Every excluded environmental call retains a persisted owner and an exact terminal proof.
export function correlateWithdrawalEffects(parts, target, peers, view, noEnvironment) {
  const effects = parts.filter(p => p.type === 'tool' && p.tool !== 'cab_codemode_discovery' && !noEnvironment(p));
  if (!effects.length) return { effects,excluded:[] };
  const markers = parts.map((part,index) => ({part,index})).filter(({part}) =>
    part.tool === 'cgpt-validation_request_validation' || part.tool === 'execute' &&
    part.state?.metadata?.toolCalls?.some(call => call.tool === 'cgpt-validation.request_validation'));
  const records = [target,...peers], groups = new Map();
  for (const part of effects) {
    const index = parts.indexOf(part), marker = markers.findLast(m => m.index <= index);
    const matches = marker ? records.filter(r => r.requestPart === marker.part) : [];
    if (matches.length !== 1) fail('withdraw-call-owner-unverified');
    const record = matches[0], group = groups.get(record) || [];group.push(part);groups.set(record,group);
  }
  const excluded = [];
  for (const [record,calls] of groups) {
    if (record === target) continue;
    const op = record.operation;
    if (!op || op.runId !== target.operation.runId || op.contextId !== target.operation.contextId ||
        op.sessionId !== target.operation.sessionId || calls.length !== 1) fail('withdraw-peer-boundary-unverified');
    const part = calls[0], callId = part.callID || part.callId;
    let proof;
    if (op.decision?.status === 'rejected' && ['PREPARED','CANCELLED'].includes(op.state) && !op.native && !op.nativeResult) {
      proof = part.tool === 'bash' ? rejectedShellWithdrawalProof(view,calls,record.approval) :
        rejectedEditWithdrawalProof(view,calls,record.approval);
    } else if (op.state === 'COMPLETED' && op.decision?.status === 'approved' && op.native?.onceAcknowledged === true && op.native.callId === callId &&
        op.nativeResult?.status === 'completed' && op.nativeResult.partDigest === digest(part) &&
        part.nativeFormat === 'opencode-v2' && part.state?.status === 'completed') {
      proof = {kind:'PERSISTED_NATIVE_TERMINAL',partDigest:digest(part),operationDigest:digest(op)};
    } else if (op.state === 'CANCELLED' && op.native?.onceAcknowledged === true && op.native.callId === callId &&
        op.completionDigest && record.reconciliationReceipt?.action === 'reconcile-quarantined-port' &&
        record.reconciliationReceipt?.state === 'DONE' && record.reconciliationReceipt.httpStatus === 200 &&
        record.reconciliationReceipt.effectDigest === op.completionDigest &&
        record.reconciliationReceipt.targetId === op.operationId && record.reconciliationReceipt.runId === op.runId &&
        record.reconciliationReceipt.contextId === op.contextId && record.reconciliationReceipt.ownerId === target.ownerId &&
        record.access?.state === 'RELEASED' && record.access.outcome === 'RECONCILED' &&
        record.access.releaseDigest === op.completionDigest &&
        record.reconciliationReceipt.result?.evidenceAuthority === 'VERIFIED_NATIVE_PORT_PROBES' &&
        record.reconciliationReceipt.result?.executionOutcome === 'HISTORICAL_OUTCOME_UNOBSERVED_RESOURCE_QUIESCENT') {
      proof = {kind:'RECONCILED_PORT',partDigest:digest(part),receiptDigest:digest(record.reconciliationReceipt)};
    } else fail('withdraw-peer-effect-unresolved');
    excluded.push({operationId:op.operationId,requestId:op.requestId,callId,proof});
  }
  return {effects:groups.get(target) || [],excluded};
}

export function rejectedEditWithdrawalProof(view, candidates, approval) {
  if(!view||view.sessionIdle!==true||view.pendingPermissionCount!==0||view.callsTruncated||
     view.replyReceiptsTruncated||view.replyError||!Array.isArray(candidates)||candidates.length!==1||
     approval?.files?.length!==1||approval.commands?.length!==0)fail('withdraw-rejected-edit-boundary-invalid');
  const part=candidates[0],input=part.state?.input,callId=part.callID||part.callId;
  const write=part.tool==='write' && part.nativeTool==='write';
  const edit=part.tool==='edit' && part.nativeTool==='edit';
  if((!write&&!edit)||part.nativeFormat!=='opencode-v2'||part.executed!==false||
     part.state?.status!=='error'||part.nativeErrorType!=='aborted'||!id(callId)||!input||
     Object.keys(input).some(key=>!(write?['path','content']:['path','oldString','newString','replaceAll']).includes(key))||
     typeof input.path!=='string'||
     (write?typeof input.content!=='string':typeof input.oldString!=='string'||!input.oldString||typeof input.newString!=='string'||
       input.replaceAll!==undefined&&typeof input.replaceAll!=='boolean'))fail('withdraw-rejected-edit-native-invalid');
  const target=resolve(approval.directory,input.path),expected=resolve(approval.directory,approval.files[0]);
  if(target!==expected||!target.startsWith(approval.directory+'/'))fail('withdraw-rejected-edit-target-divergent');
  const inputSha256=digest(input),observed=(view.calls||[]).filter(call=>call.callId===callId);
  if(observed.length!==1||observed[0].tool!==part.tool||observed[0].inputSha256!==inputSha256||
     observed[0].partDigest!==digest(part))fail('withdraw-rejected-edit-input-divergent');
  const receipts=(view.replyReceipts||[]).filter(receipt=>receipt.callId===callId);
  if(receipts.length!==1)fail('withdraw-rejected-edit-receipt-required');
  const receipt=receipts[0],start=part.state.time?.start,end=part.state.time?.end,created=Date.parse(receipt.createdAt),ack=Date.parse(receipt.acknowledgedAt);
  if(receipt.state!=='ACKNOWLEDGED'||receipt.httpStatus!==204||receipt.replyOrigin!=='CAB_CLIENT_PROGRAMMATIC'||
     receipt.decision!=='reject'||receipt.sessionId!==approval.session_id||receipt.directory!==approval.directory||
     !rejectedReceiptInstance(receipt,view,end)||!id(receipt.permissionId)||
     receipt.targetDigest!==commandDigest(JSON.stringify(['edit',target]))||
     !Number.isFinite(start)||!Number.isFinite(end)||end<start||!Number.isFinite(created)||created<start||created>end||
     !Number.isFinite(ack)||ack<created)fail('withdraw-rejected-edit-receipt-divergent');
  return {kind:'REJECTED_UNISSUED_EDIT',executionOutcome:'COORDINATION_WITHDRAWN_BEFORE_ISSUANCE',
    evidenceAuthority:'OWNER_NATIVE_BOUNDARY_REVIEW',
    ...(receipt.nativePid!==view.nativePid||receipt.nativeVersion!==view.nativeVersion?{kernelEpochDigest:digest(view.nativeKernelEpoch)}:{}),rejectedEdit:{callId,nativeTool:part.nativeTool,permissionId:receipt.permissionId,
      nativeInputSha256:inputSha256,approvedInputSha256:approval.tool_input_sha256||null,
      partDigest:digest(part),receiptDigest:digest(receipt)}};
}

// A rejected shell can close coordination, never its shared resource protection.
export function rejectedShellWithdrawalProof(view, candidates, approval) {
  if(!view || view.sessionIdle!==true || view.pendingPermissionCount!==0 || view.callsTruncated ||
      view.replyReceiptsTruncated || view.replyError || !Array.isArray(candidates) || candidates.length!==1 ||
      approval?.files?.length!==0 || approval.commands?.length!==1)
    fail('withdraw-rejected-shell-boundary-invalid');
  const part=candidates[0],input=part.state?.input,callId=part.callID||part.callId;
  if(part.tool!=='bash' || part.nativeTool!=='shell' || part.nativeFormat!=='opencode-v2' ||
      part.executed!==false || part.state?.status!=='error' || part.nativeErrorType!=='aborted' ||
      !id(callId) || typeof input?.command!=='string' || input.command!==approval.commands[0])
    fail('withdraw-rejected-shell-native-invalid');
  const observed=(view.calls||[]).filter(call=>call.callId===callId),inputSha256=digest(input);
  if(observed.length!==1 || observed[0].tool!=='bash' || observed[0].inputSha256!==inputSha256 ||
      observed[0].partDigest!==digest(part)) fail('withdraw-rejected-shell-input-divergent');
  const receipts=(view.replyReceipts||[]).filter(receipt=>receipt.callId===callId);
  if(receipts.length!==1)fail('withdraw-rejected-shell-receipt-required');
  const receipt=receipts[0],start=part.state.time?.start,end=part.state.time?.end,
    created=Date.parse(receipt.createdAt),ack=Date.parse(receipt.acknowledgedAt);
  if(receipt.state!=='ACKNOWLEDGED' || receipt.httpStatus!==204 || receipt.replyOrigin!=='CAB_CLIENT_PROGRAMMATIC' ||
      receipt.decision!=='reject' || receipt.sessionId!==approval.session_id || receipt.directory!==approval.directory ||
      !rejectedReceiptInstance(receipt,view,end) || !id(receipt.permissionId) ||
      receipt.targetDigest!==commandDigest(JSON.stringify(['bash',input.command])) ||
      !Number.isFinite(start) || !Number.isFinite(end) || end<start || !Number.isFinite(created) ||
      created<start || created>end || !Number.isFinite(ack) || ack<created)
    fail('withdraw-rejected-shell-receipt-divergent');
  return {kind:'REJECTED_UNISSUED_SHELL',executionOutcome:'COORDINATION_WITHDRAWN_BEFORE_ISSUANCE',
    evidenceAuthority:'OWNER_NATIVE_BOUNDARY_REVIEW',
    ...(receipt.nativePid!==view.nativePid||receipt.nativeVersion!==view.nativeVersion?{kernelEpochDigest:digest(view.nativeKernelEpoch)}:{}),rejectedShell:{callId,permissionId:receipt.permissionId,
      nativeInputSha256:inputSha256,partDigest:digest(part),receiptDigest:digest(receipt)}};
}
