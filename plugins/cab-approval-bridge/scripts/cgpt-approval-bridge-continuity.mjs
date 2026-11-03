import { createHash, randomUUID } from 'node:crypto';
import { constants, closeSync, existsSync, fstatSync, fsyncSync, mkdirSync, openSync,
  readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const VERSION = '2.2.7';
export const CONTINUITY_PROTOCOL = 'cab-continuity-v1';
export const continuityDigest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const canonicalContinuityDigest = value => createHash('sha256').update(JSON.stringify(value, (_, item) =>
  item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item)).digest('hex');
const fail = (code, status) => { throw Object.assign(new Error(code), { code, ...(status ? { status } : {}) }); };
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(value);

export function guardContinuityRequest(request, url, port) {
  let origin;
  try { origin = new URL('http://' + request.headers.host); } catch { fail('handoff-origin-refused', 403); }
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname) ||
      Number(origin.port || 80) !== port || url.search ||
      request.headers['content-type']?.split(';')[0].trim() !== 'application/json' ||
      request.headers['x-cab-continuity'] !== CONTINUITY_PROTOCOL ||
      request.headers.origin && request.headers.origin !== origin.origin) fail('handoff-origin-refused', 403);
}

export function validCommunicationState(value, scope) {
  if (!record(value) || value.runId !== scope.runId || value.contextId !== scope.contextId ||
      !Array.isArray(value.validations) || !Array.isArray(value.decisions) ||
      value.validations.length > 5000 || value.decisions.length > 5000) return false;
  const requests = new Map();
  for (const row of value.validations) {
    if (!Array.isArray(row) || row.length !== 2 || !identifier(row[0]) || requests.has(row[0]) ||
        !record(row[1]) || row[1].requestId !== row[0] || !identifier(row[1].approvalId) ||
        !identifier(row[1].changeId) || !record(row[1].sourceApproval)) return false;
    requests.set(row[0], row[1]);
  }
  const decisions = new Set();
  return value.decisions.every(row => {
    if (!Array.isArray(row) || row.length !== 2 || decisions.has(row[0])) return false;
    const validation = requests.get(row[0]), decision = row[1];
    if (!validation || !record(decision) || decision.requestId !== row[0] ||
        decision.approval_id !== validation.approvalId || decision.change_id !== validation.changeId ||
        !['approved', 'rejected', 'needs_clarification'].includes(decision.decision)) return false;
    decisions.add(row[0]); return true;
  });
}

// Private sidecars never replace the historical business registry on rollback.
export class ContinuityStore {
  constructor(path, kind, validate, { maxBytes = 16 * 1024 * 1024 } = {}) {
    if (resolve(path) !== path || typeof kind !== 'string' || !/^[a-z][a-z-]{1,59}$/.test(kind) ||
        typeof validate !== 'function' || !Number.isSafeInteger(maxBytes) || maxBytes < 1) fail('continuity-contract-invalid');
    this.path = path; this.kind = kind; this.validate = validate; this.maxBytes = maxBytes;
    this.sequence = 0; this.instanceId = randomUUID(); this.value = undefined;
    if (!existsSync(dirname(path))) return;
    this.checkDirectory();
    let fd;
    try {
      fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      const stat = fstatSync(fd);
      if (!stat.isFile() || stat.nlink !== 1 || stat.uid !== process.getuid() || (stat.mode & 0o077) ||
          stat.size > maxBytes) fail('continuity-file-unsafe');
      let envelope;
      try { envelope = JSON.parse(readFileSync(fd, 'utf8')); }
      catch { fail('continuity-state-invalid'); }
      if (envelope?.protocol !== CONTINUITY_PROTOCOL || envelope.kind !== kind ||
          !Number.isSafeInteger(envelope.sequence) || envelope.sequence < 1 ||
          typeof envelope.instanceId !== 'string' || !/^[a-f0-9-]{36}$/.test(envelope.instanceId) ||
          !validate(envelope.value) || continuityDigest(envelope.value) !== envelope.digest) fail('continuity-state-invalid');
      this.sequence = envelope.sequence; this.instanceId = envelope.instanceId; this.value = envelope.value;
    } catch (cause) {
      if (cause.code !== 'ENOENT') throw cause;
    } finally { if (fd !== undefined) closeSync(fd); }
  }
  checkDirectory() {
    if (realpathSync(dirname(this.path)) !== dirname(this.path)) fail('continuity-directory-unsafe');
  }
  write(value) {
    if (!this.validate(value)) fail('continuity-state-invalid');
    const current = new ContinuityStore(this.path, this.kind, this.validate, { maxBytes: this.maxBytes });
    if (current.sequence !== this.sequence || current.value !== undefined &&
        (current.instanceId !== this.instanceId || continuityDigest(current.value) !== continuityDigest(this.value))) {
      fail('continuity-state-changed');
    }
    const envelope = { protocol: CONTINUITY_PROTOCOL, kind: this.kind,
      instanceId: this.instanceId, sequence: this.sequence + 1, digest: continuityDigest(value), value };
    const data = JSON.stringify(envelope) + '\n';
    if (Buffer.byteLength(data) > this.maxBytes) fail('continuity-state-too-large');
    mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 }); this.checkDirectory();
    const candidate = this.path + '.candidate-' + randomUUID();
    let fd;
    try {
      fd = openSync(candidate, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      writeFileSync(fd, data, 'utf8'); fsyncSync(fd); closeSync(fd); fd = undefined;
      renameSync(candidate, this.path);
      fd = openSync(dirname(this.path), constants.O_RDONLY); fsyncSync(fd); closeSync(fd); fd = undefined;
      this.sequence = envelope.sequence; this.value = structuredClone(value);
      return { instanceId: this.instanceId, sequence: this.sequence, digest: envelope.digest };
    } finally {
      if (fd !== undefined) closeSync(fd);
      try { unlinkSync(candidate); } catch (cause) { if (cause.code !== 'ENOENT') throw cause; }
    }
  }
  snapshot() { return this.value === undefined ? undefined : structuredClone(this.value); }
}

const nativeIdentityValid = value => record(value) && Number.isSafeInteger(value.pid) && value.pid > 0 &&
  typeof value.version === 'string' && /^2\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(value.version) &&
  typeof value.directory === 'string' && value.directory.startsWith('/');
export const validHandoffBrokerState = value => record(value) && record(value.identity) &&
  Number.isSafeInteger(value.identity.pid) && value.identity.pid>0 && /^\d+$/.test(value.identity.startTime || '') &&
  record(value.readiness) && value.readiness.status==='READY' && value.readiness.ready===true &&
  typeof value.readiness.instance_id==='string' && value.readiness.instance_id.length>0 &&
  typeof value.readiness.server_version==='string' && value.readiness.coordination_protocol==='resource-scoped-v1' &&
  value.readiness.broker_process?.pid===value.identity.pid &&
  Number.isSafeInteger(value.readiness.pending_count) && value.readiness.pending_count>=0 &&
  Number.isFinite(Date.parse(value.readiness.checked_at));

const handoffValid = value => record(value) && identifier(value.transactionId) &&
  ['PREPARED', 'SEALED', 'CANCELLED', 'ADOPTED'].includes(value.state) && nativeIdentityValid(value.nativeIdentity) &&
  (value.brokerState === undefined || validHandoffBrokerState(value.brokerState)) &&
  typeof value.workspace === 'string' && value.workspace.startsWith('/') &&
  Number.isSafeInteger(value.preparedAt) && Number.isSafeInteger(value.expiresAt) &&
  value.expiresAt > value.preparedAt && value.expiresAt - value.preparedAt <= 30000 &&
  Number.isSafeInteger(value.sourcePid) && value.sourcePid > 0 &&
  (['PREPARED', 'CANCELLED'].includes(value.state) ||
    /^[a-f0-9]{64}$/.test(value.registryDigest || '') && typeof value.registryPath === 'string' && value.registryPath.startsWith('/') &&
    Array.isArray(value.restoredAccesses) && value.restoredAccesses.every(identifier) &&
    Array.isArray(value.restoredTests) && value.restoredTests.every(identifier));

function registryDigest(registry) {
  const { version, ...state } = registry.snapshot();
  return canonicalContinuityDigest(state);
}

export class TransportHandoff {
  constructor(path, workspace, { now = () => Date.now() } = {}) {
    this.workspace = workspace; this.now = now;
    this.store = new ContinuityStore(path, 'transport-handoff', handoffValid);
  }
  prepare(transactionId, nativeIdentity, brokerState = null) {
    if (!identifier(transactionId) || !nativeIdentityValid(nativeIdentity)) fail('handoff-contract-invalid');
    const previous = this.store.snapshot();
    if (['PREPARED', 'SEALED'].includes(previous?.state) && previous.expiresAt > this.now()) {
      if (previous.transactionId === transactionId && previous.sourcePid === process.pid &&
          canonicalContinuityDigest(previous.nativeIdentity) === canonicalContinuityDigest(nativeIdentity)) return previous;
      fail('handoff-already-prepared');
    }
    const preparedAt = this.now();
    const value = { transactionId, state: 'PREPARED', workspace: this.workspace, sourcePid: process.pid,
      nativeIdentity: structuredClone(nativeIdentity), ...(brokerState ? {brokerState:structuredClone(brokerState)} : {}), preparedAt, expiresAt: preparedAt + 30000 };
    this.store.write(value); return value;
  }
  cancel(transactionId) {
    const previous = this.store.snapshot();
    if (previous?.transactionId === transactionId && previous.state === 'CANCELLED') return;
    if (previous?.transactionId !== transactionId || previous.state !== 'PREPARED') fail('handoff-owner-divergent');
    this.store.write({ ...previous, state: 'CANCELLED' });
  }
  seal(registry) {
    const previous = this.store.snapshot();
    if (previous?.state !== 'PREPARED' || previous.sourcePid !== process.pid ||
        previous.workspace !== registry.directory || this.now() >= previous.expiresAt) fail('handoff-boundary-expired');
    registry.assertHealthy();
    const value = { ...previous, state: 'SEALED', registryPath: registry.path, registryDigest: registryDigest(registry),
      restoredAccesses: [...registry.restoredAccesses].sort(), restoredTests: [...registry.restoredTests].sort() };
    this.store.write(value); return value;
  }
  adopt(registry, nativeIdentity) {
    const previous = this.store.snapshot();
    if (!previous || previous.state !== 'SEALED') return { adopted: false, reason: 'handoff-not-sealed' };
    if (previous.workspace !== registry.directory || previous.workspace !== this.workspace || previous.registryPath !== registry.path ||
        this.now() < previous.preparedAt || this.now() >= previous.expiresAt ||
        !nativeIdentityValid(nativeIdentity) ||
        canonicalContinuityDigest(previous.nativeIdentity) !== canonicalContinuityDigest(nativeIdentity) ||
        previous.registryDigest !== registryDigest(registry) ||
        previous.restoredAccesses.some(accessId => !registry.restoredAccesses.has(accessId)) ||
        previous.restoredTests.some(transactionId => !registry.restoredTests.has(transactionId))) {
      return { adopted: false, reason: 'handoff-boundary-divergent' };
    }
    registry.assertHealthy();
    this.store.write({ ...previous, state: 'ADOPTED', targetPid: process.pid });
    registry.restoredAccesses = new Set(previous.restoredAccesses);
    registry.restoredTests = new Set(previous.restoredTests);
    return { adopted: true, transactionId: previous.transactionId, protocol: CONTINUITY_PROTOCOL };
  }
  brokerState() { return this.store.snapshot()?.brokerState ?? null; }
  snapshot() {
    const value = this.store.snapshot();
    return value ? { transactionId: value.transactionId, state: value.state, expiresAt: value.expiresAt } : null;
  }
}
