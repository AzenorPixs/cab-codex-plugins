import { ContinuityStore, canonicalContinuityDigest as digest } from './cgpt-approval-bridge-continuity.mjs';

export const VERSION = '2.7.3';
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const fail = code => { throw Object.assign(new Error(code), { code, status: 409 }); };

export class ManifestExtensions {
  constructor(registry, path) {
    this.registry = registry;
    this.error = null;
    try {
    this.store = new ContinuityStore(path, 'manifest-extensions', value => Array.isArray(value) && value.length <= 5000 &&
      value.every(row => id(row.extensionId) && id(row.runId) && id(row.ownerId) && Number.isSafeInteger(row.contextId) &&
        Number.isSafeInteger(row.version) && hash(row.inputDigest) && hash(row.beforeDigest) && hash(row.afterDigest) &&
        ['PREPARED', 'DONE'].includes(row.state)));
    this.receipts = this.store.snapshot() || [];
    } catch (cause) {
      if (!String(cause.code || '').startsWith('continuity-') && !['EACCES','EPERM','EIO'].includes(cause.code)) throw cause;
      this.error = 'compatible-extension-journal-unavailable'; this.receipts = [];
    }
  }
  write(receipt) {
    const next = [...this.receipts.filter(row => row.extensionId !== receipt.extensionId), receipt];
    this.store.write(next); this.receipts = next;
  }
  extend(runId, input) {
    if (this.error) fail(this.error);
    if (!input || !id(input.extensionId) || Object.keys(input).some(key =>
      !['extensionId','ownerId','version','expectedManifestDigest','authorization','evidence','resources'].includes(key)))
      fail('compatible-extension-input-invalid');
    const run = this.registry.owned(runId, input.version), inputDigest = digest(input);
    if (input.ownerId !== run.ownerId) fail('compatible-extension-owner-divergent');
    const previous = this.receipts.find(row => row.extensionId === input.extensionId);
    if (previous) {
      if (previous.inputDigest !== inputDigest || previous.runId !== runId || previous.contextId !== run.contextId ||
          previous.ownerId !== run.ownerId || previous.version !== run.version) fail('compatible-extension-id-reused');
      if (previous.state === 'DONE') return this.project(previous);
      if (this.registry.manifestDigest(runId) === previous.afterDigest) {
        const observed = { ...previous, state: 'DONE', recoveredFrom: 'observed-manifest-after-intent' };
        this.write(observed); return this.project(observed);
      }
      if (this.registry.manifestDigest(runId) !== previous.beforeDigest) fail('compatible-extension-outcome-unverified');
    }
    const candidate = this.registry.compatibleExtension(runId, input);
    const intent = previous || { extensionId: input.extensionId, runId, ownerId: run.ownerId,
      contextId: run.contextId, version: run.version, inputDigest, beforeDigest: candidate.beforeDigest,
      afterDigest: candidate.afterDigest, additions: candidate.additions,
      authorizationDigest: digest(input.authorization), evidenceDigest: digest(input.evidence), state: 'PREPARED' };
    if (!previous) this.write(intent);
    this.registry.compatibleExtension(runId, input, true);
    const result = { ...intent, state: 'DONE' }; this.write(result); return this.project(result);
  }
  project(receipt) {
    return { protocol: 'compatible-resource-extension-v1', extensionId: receipt.extensionId,
      runId: receipt.runId, version: receipt.version, state: receipt.state,
      manifestDigest: receipt.afterDigest, ...(receipt.recoveredFrom ? { recoveredFrom: receipt.recoveredFrom } : {}) };
  }
}
