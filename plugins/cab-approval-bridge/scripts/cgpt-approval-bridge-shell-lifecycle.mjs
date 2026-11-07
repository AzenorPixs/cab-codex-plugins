import { resolve } from 'node:path';
import { ContinuityStore, canonicalContinuityDigest as digest } from './cgpt-approval-bridge-continuity.mjs';

export const VERSION = '2.4.4';
const fail = code => { throw Object.assign(new Error(code), {code}); };
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const valid = value => Array.isArray(value?.shells) && value.shells.length <= 5000 &&
  new Set(value.shells.map(row => row.operationId)).size === value.shells.length &&
  value.shells.every(row => typeof row.operationId === 'string' && hash(row.binding) &&
    /^sh_[A-Za-z0-9]{1,100}$/.test(row.shellId || '') && hash(row.partDigest) &&
    Number.isFinite(row.startedAt) && ['running','exited','timeout','killed'].includes(row.status) &&
    (row.status === 'running' || Number.isFinite(row.finishedAt) && row.finishedAt >= row.startedAt));

// A native background start is evidence of a process, never evidence of its end.
export class ShellLifecycle {
  constructor(path) {
    this.error = null; this.verified = new Map();
    try {
      this.store = new ContinuityStore(path, 'shell-lifecycle', valid);
      this.rows = new Map((this.store.snapshot()?.shells || []).map(row => [row.operationId,row]));
    } catch { this.error = 'shell-lifecycle-unavailable'; this.rows = new Map(); }
  }
  available(operation) {
    if (operation?.shellBackground === true && this.error) fail(this.error);
  }
  binding(operation, approved, nativeIdentity) {
    return digest({operationId:operation.operationId,identityDigest:operation.identityDigest,
      runId:operation.runId,contextId:operation.contextId,sessionId:operation.sessionId,
      permissionId:operation.native?.permissionId,callId:operation.native?.callId,
      nativeStartedAt:operation.native?.startedAt,inputDigest:approved.toolInputSha256,nativeIdentity});
  }
  observe(operation, approved, part, info, nativeIdentity, workspace) {
    this.available(approved);
    const input = part?.state?.input;
    if (approved?.shellBackground !== true || approved.kind !== 'bash' || !operation.native ||
        approved.operationId !== operation.operationId || approved.sessionId !== operation.sessionId ||
        !operation.resources.some(r => r.key.startsWith('port:') && r.mode === 'write') ||
        part.nativeTool !== 'shell' || part.nativeFormat !== 'opencode-v2' || part.tool !== 'bash' ||
        part.state?.status !== 'completed' || !operation.native.callId || part.callID !== operation.native.callId ||
        input?.background !== true || !Number.isSafeInteger(input.timeout) || input.timeout <= 0 ||
        input.command !== approved.target || !hash(approved.toolInputSha256) || digest(input) !== approved.toolInputSha256 ||
        input.workdir !== undefined && (typeof input.workdir !== 'string' || resolve(workspace,input.workdir) !== workspace) ||
        part.state.metadata?.shellID !== info.shellId || !/^sh_[A-Za-z0-9]{1,100}$/.test(info.shellId || '') ||
        info.command !== input.command || info.cwd !== workspace ||
        info.sessionId !== null && info.sessionId !== operation.sessionId ||
        !Number.isFinite(part.state.time?.start) || !Number.isFinite(part.state.time?.end) ||
        !Number.isFinite(info.startedAt) || info.startedAt < operation.native.startedAt ||
        info.startedAt < part.state.time.start || info.startedAt > part.state.time.end ||
        !['running','exited','timeout','killed'].includes(info.status) ||
        info.status !== 'running' && (!Number.isFinite(info.finishedAt) || info.finishedAt < info.startedAt) ||
        info.exit !== null && !Number.isInteger(info.exit) || !Number.isSafeInteger(nativeIdentity?.pid) ||
        typeof nativeIdentity.version !== 'string' || typeof nativeIdentity.directory !== 'string') fail('shell-lifecycle-divergent');
    const binding = this.binding(operation,approved,nativeIdentity), prior = this.rows.get(operation.operationId);
    const row = {operationId:operation.operationId,binding,shellId:info.shellId,startedAt:info.startedAt,
      status:info.status,finishedAt:info.finishedAt,exit:info.exit,partDigest:digest(part)};
    if (prior && (prior.binding !== binding || prior.shellId !== row.shellId || prior.startedAt !== row.startedAt ||
        prior.partDigest !== row.partDigest || prior.status !== 'running' && digest(prior) !== digest(row))) {
      fail('shell-lifecycle-divergent');
    }
    if (!prior || digest(prior) !== digest(row)) {
      const rows = new Map(this.rows); rows.set(operation.operationId,row);
      // Persist before exposing a terminal proof; failure never changes the business registry.
      this.store.write({shells:[...rows.values()]}); this.rows = rows;
    }
    this.verified.set(operation.operationId,digest({identity:operation.identityDigest,native:operation.native}));
    return this.proof(operation,part,operation.sessionId);
  }
  proof(operation,part,sessionId) {
    const row = this.rows.get(operation.operationId);
    if (this.error || this.verified.get(operation.operationId) !== digest({identity:operation.identityDigest,native:operation.native}) || !row || row.status === 'running' || sessionId !== operation.sessionId ||
        row.partDigest !== digest(part) || part.callID !== operation.native?.callId ||
        part.state?.metadata?.shellID !== row.shellId) return null;
    return {sessionId,permissionId:operation.native.permissionId,callId:operation.native.callId,
      shellId:row.shellId,startedAt:row.startedAt,finishedAt:row.finishedAt,
      status:row.status === 'exited' ? 'completed' : 'error',shellStatus:row.status,exit:row.exit};
  }
}
