import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { constants, closeSync, existsSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync,
  readFileSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const VERSION = "2.0.0";
const id = (value) => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(value);
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const sha256 = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const validReconciliation = (value) => record(value) &&
  Object.keys(value).length === 14 &&
  ['transactionId', 'jobId', 'operationId', 'approvalId'].every((key) => id(value[key])) &&
  (value.recoveryId === null || id(value.recoveryId)) &&
  typeof value.sessionId === 'string' && value.sessionId.startsWith('ses_') &&
  ['inputDigest', 'nativeToolHash', 'authorizationDigest'].every((key) => sha256(value[key])) &&
  Number.isSafeInteger(value.contextId) && value.contextId > 0 &&
  Number.isSafeInteger(value.version) && value.version >= value.contextId &&
  Number.isSafeInteger(value.nativeToolCount) && value.nativeToolCount > 0 &&
  value.outcome === 'REJECTION_ONLY' && Number.isFinite(Date.parse(value.at));

export class CoordinationError extends Error {
  constructor(code, status = 409) { super(code); this.code = code; this.status = status; }
}

function realTarget(path) {
  const tail = [];
  let ancestor = path;
  while (!existsSync(ancestor)) {
    const parent = dirname(ancestor);
    if (parent === ancestor) throw new CoordinationError("resource-path-invalid", 400);
    tail.unshift(ancestor.slice(parent.length + (parent === sep ? 0 : 1)));
    ancestor = parent;
  }
  return resolve(realpathSync(ancestor), ...tail);
}

export function canonicalResource(resource, directory) {
  if (!record(resource) || !["read", "write"].includes(resource.mode) ||
      typeof resource.key !== "string" || !resource.key || resource.key.length > 500 ||
      /[\x00-\x1f\\]/.test(resource.key)) throw new CoordinationError("resource-invalid", 400);
  let key = resource.key;
  if (key.startsWith("file:")) {
    const path = key.slice(5).replace(/\/$/, "");
    if (!path || isAbsolute(path) || path.split("/").some((part) => !part || [".", ".."].includes(part))) {
      throw new CoordinationError("resource-path-invalid", 400);
    }
    const target = relative(directory, realTarget(resolve(directory, path))).split(sep).join("/");
    if (!target || target === ".." || target.startsWith("../")) {
      throw new CoordinationError("resource-outside-project", 400);
    }
    key = `file:${target}`;
  } else if (key !== "project:*" && !/^[a-z][a-z0-9_-]*:[^*\s]+$/.test(key)) {
    throw new CoordinationError("resource-key-invalid", 400);
  }
  return { key, mode: resource.mode };
}

function overlaps(left, right) {
  if (left === "project:*" || right === "project:*") return true;
  if (left === right) return true;
  return left.startsWith("file:") && right.startsWith("file:") &&
    (left.startsWith(`${right}/`) || right.startsWith(`${left}/`));
}

function readRegistry(path) {
  let descriptor;
  try {
    descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const stat = fstatSync(descriptor);
    if (!stat.isFile() || stat.nlink !== 1) throw new Error('invalid registry file');
    return JSON.parse(readFileSync(descriptor, 'utf8'));
  } catch (cause) {
    if (cause.code === 'ENOENT') return undefined;
    throw new CoordinationError('registry-restoration-invalid');
  } finally { if (descriptor !== undefined) closeSync(descriptor); }
}

export class RunRegistry {
  constructor(directory, stateDirectory, { observe = () => {} } = {}) {
    this.directory = realpathSync(directory);
    this.stateDirectory = stateDirectory;
    if (realTarget(stateDirectory) !== resolve(stateDirectory)) throw new CoordinationError('registry-path-invalid');
    this.path = join(stateDirectory, "controller-runs.json");
    this.runs = new Map();
    this.integrationOwner = null;
    this.failed = false;
    this.lock = null;
    this.sequence = 0;
    this.requestOwners = {};
    this.history = [];
    this.referenceVersion = 0;
    this.integrationQueue = [];
    this.integrationCompletions = {};
    this.schemaVersion = 1;
    this.observe = observe;
    this.restore();
  }
  acceptsSchema(version) { return [1, 2, 3].includes(version); }
  restore() {
    this.runs.clear();
    this.sequence = 0;
    this.integrationOwner = null;
    this.requestOwners = {};
    this.history = [];
    this.referenceVersion = 0;
    this.integrationQueue = [];
    this.integrationCompletions = {};
    this.schemaVersion = 1;
    const data = readRegistry(this.path);
    if (data !== undefined) {
      if (!record(data) || !this.acceptsSchema(data.schemaVersion) || data.project !== this.directory ||
          !Array.isArray(data.runs) || !Number.isSafeInteger(data.sequence) || data.sequence < 0 ||
          (data.integrationOwner !== null && !id(data.integrationOwner))) {
        throw new CoordinationError("registry-restoration-invalid");
      }
      this.sequence = data.sequence;
      this.schemaVersion = data.schemaVersion;
      this.resourceState = data.coordination;
      this.referenceVersion = data.referenceVersion === undefined ? 0 : data.referenceVersion;
      if (!Number.isSafeInteger(this.referenceVersion) || this.referenceVersion < 0) {
        throw new CoordinationError('registry-restoration-invalid');
      }
      if (data.requestOwners !== undefined && (!record(data.requestOwners) ||
          !Object.values(data.requestOwners).every((v) => record(v) && id(v.runId) &&
            typeof v.digest === "string" && /^[a-f0-9]{64}$/.test(v.digest)))) {
        throw new CoordinationError("registry-restoration-invalid");
      }
      this.requestOwners = data.requestOwners || {};
      if (Object.values(this.requestOwners).some((owner) =>
          owner.reconciliation !== undefined && !validReconciliation(owner.reconciliation))) {
        throw new CoordinationError('registry-restoration-invalid');
      }
      if (data.history !== undefined && (!Array.isArray(data.history) || data.history.some((r) =>
          !record(r) || !id(r.runId) || !id(r.changeId) || !['DELIVERED', 'ABANDONED'].includes(r.state)))) {
        throw new CoordinationError("registry-restoration-invalid");
      }
      this.history = data.history || [];
      this.integrationOwner = data.integrationOwner;
      for (const run of data.runs) {
        this.validate(run);
        run.referenceVersion ??= 0;
        run.integrationReady ??= false;
        run.integrationCompleted ??= false;
        run.requiresPublication ??= run.resources.some((r) => r.mode === 'write');
        run.phase ??= 'WORK';
        if (!Number.isSafeInteger(run.version) || run.version < 1 || run.version > this.sequence ||
            !Number.isSafeInteger(run.contextId) || run.contextId < 1 || run.contextId > run.version ||
            !Number.isSafeInteger(run.referenceVersion) || run.referenceVersion < 0 || run.referenceVersion > this.referenceVersion ||
            typeof run.integrationReady !== 'boolean' || typeof run.integrationCompleted !== 'boolean' ||
            typeof run.requiresPublication !== 'boolean' || !['WORK', 'REPORT'].includes(run.phase) ||
            (run.resources.some((r) => r.mode === 'write') && !run.requiresPublication) ||
            (run.publishedReferenceVersion !== undefined && (!Number.isSafeInteger(run.publishedReferenceVersion) ||
              run.publishedReferenceVersion < 1 || run.publishedReferenceVersion > this.referenceVersion)) ||
            !["RESERVED", "DELIVERED", "ABANDONED"].includes(run.state) || this.runs.has(run.runId)) {
          throw new CoordinationError("registry-restoration-invalid");
        }
        this.runs.set(run.runId, structuredClone(run));
      }
      if (data.integrationQueue !== undefined && (!Array.isArray(data.integrationQueue) ||
          data.integrationQueue.some((entry, index, entries) => !record(entry) || !id(entry.runId) ||
            this.runs.get(entry.runId)?.state !== 'RESERVED' || this.runs.get(entry.runId)?.phase !== 'WORK' ||
            entry.contextId !== this.runs.get(entry.runId)?.contextId ||
            typeof entry.requestedAt !== 'string' || !Number.isFinite(Date.parse(entry.requestedAt)) ||
            entries.findIndex((other) => other.runId === entry.runId) !== index))) {
        throw new CoordinationError('registry-restoration-invalid');
      }
      this.integrationQueue = data.integrationQueue || [];
      if ((data.schemaVersion < 3 && data.integrationCompletions !== undefined) ||
          (data.schemaVersion >= 3 && !record(data.integrationCompletions))) {
        throw new CoordinationError('registry-restoration-invalid');
      }
      this.integrationCompletions = data.integrationCompletions || {};
      for (const [transactionId, receipt] of Object.entries(this.integrationCompletions)) {
        const owner = [...this.runs.values(), ...this.history].find((r) =>
          r.runId === receipt?.runId && r.contextId === receipt?.contextId);
        if (!record(receipt) || Object.keys(receipt).length !== 9 || !id(transactionId) ||
            receipt.transactionId !== transactionId || !owner || owner.phase !== 'REPORT' ||
            !owner.integrationCompleted || owner.reportFile !== receipt.reportFile ||
            owner.publishedReferenceVersion !== receipt.referenceVersion || owner.version < receipt.version ||
            !Number.isSafeInteger(receipt.contextId) || receipt.contextId < 1 ||
            !Number.isSafeInteger(receipt.requestVersion) || receipt.requestVersion < receipt.contextId ||
            !Number.isSafeInteger(receipt.version) || receipt.version <= receipt.requestVersion || receipt.version > this.sequence ||
            !Number.isSafeInteger(receipt.previousReferenceVersion) || receipt.previousReferenceVersion < 0 ||
            receipt.referenceVersion !== receipt.previousReferenceVersion + 1 || receipt.referenceVersion > this.referenceVersion ||
            typeof receipt.evidenceDigest !== 'string' || !/^[a-f0-9]{64}$/.test(receipt.evidenceDigest)) {
          throw new CoordinationError('registry-restoration-invalid');
        }
        try { this.reportTarget(owner, receipt.reportFile); }
        catch { throw new CoordinationError('registry-restoration-invalid'); }
      }
      for (const run of this.runs.values()) if (run.phase === 'REPORT') {
        if (!run.integrationCompleted || !Number.isSafeInteger(run.publishedReferenceVersion) ||
            run.publishedReferenceVersion < 1 || run.publishedReferenceVersion > this.referenceVersion ||
            run.resources.length !== 1 || run.resources[0].mode !== 'write' ||
            run.resources[0].key !== `file:${this.reportTarget(run, run.reportFile)}`) {
          throw new CoordinationError('registry-restoration-invalid');
        }
      }
      const active = [...this.runs.values()].filter((run) => run.state === "RESERVED");
      for (const run of active) this.checkConflicts(run, active.filter((other) => other !== run));
      if (this.integrationOwner && this.runs.get(this.integrationOwner)?.state !== "RESERVED") {
        throw new CoordinationError("registry-restoration-invalid");
      }
    }
  }

  async acquireAuthority() {
    if (this.lock) return;
    mkdirSync(this.stateDirectory, { recursive: true, mode: 0o700 });
    const helper = fileURLToPath(new URL("./cgpt-approval-bridge-registry-lock.py", import.meta.url));
    const child = spawn("python3", [helper, join(this.stateDirectory, "registry.instance.lock")],
      { stdio: ["pipe", "pipe", "ignore"] });
    await new Promise((resolveReady, reject) => {
      let ready = false;
      const timer = setTimeout(() => { child.kill(); reject(new CoordinationError("registry-lock-timeout")); }, 5000);
      child.once("error", () => { clearTimeout(timer); reject(new CoordinationError("registry-lock-unavailable")); });
      child.once("exit", () => {
        this.failed = true;
        clearTimeout(timer);
        if (!ready) reject(new CoordinationError("registry-already-owned"));
      });
      child.stdout.once("data", (data) => {
        if (data.toString().trim() !== "READY") return;
        ready = true;
        clearTimeout(timer);
        this.lock = child;
        try { this.restore(); } catch (cause) { this.failed = true; child.stdin.end(); reject(cause); return; }
        resolveReady();
      });
    });
  }

  close() { this.lock?.stdin.end(); }
  assertHealthy() {
    if (this.failed || !this.lock || this.lock.exitCode !== null) throw new CoordinationError("registry-unavailable", 503);
  }
  snapshot() {
    return structuredClone({ schemaVersion: this.schemaVersion, version: VERSION, project: this.directory,
      sequence: this.sequence, integrationOwner: this.integrationOwner,
      referenceVersion: this.referenceVersion,
      integrationQueue: this.integrationQueue,
      ...(this.schemaVersion >= 3 ? { integrationCompletions: this.integrationCompletions } : {}),
      requestOwners: this.requestOwners, history: this.history, runs: [...this.runs.values()] });
  }
  persist() {
    this.assertHealthy();
    let fd;
    try {
      const candidate = `${this.path}.candidate-${randomUUID()}`;
      fd = openSync(candidate, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
      if (lstatSync(candidate).nlink !== 1) throw new Error("invalid candidate");
      writeFileSync(fd, `${JSON.stringify(this.snapshot(), null, 2)}\n`, "utf8");
      fsyncSync(fd);
      closeSync(fd);
      fd = undefined;
      renameSync(candidate, this.path);
      fd = openSync(this.stateDirectory, constants.O_RDONLY);
      fsyncSync(fd);
    } catch {
      this.failed = true;
      throw new CoordinationError("registry-persistence-failed", 503);
    } finally { if (fd !== undefined) closeSync(fd); }
    this.observe(this.snapshot());
  }
  validate(payload) {
    if (!record(payload) || !id(payload.runId) || !id(payload.ownerId) || !id(payload.changeId) ||
        typeof payload.sessionId !== "string" || !/^ses_[A-Za-z0-9_-]+$/.test(payload.sessionId) ||
        payload.directory !== this.directory || typeof payload.selectionKey !== "string" ||
        !payload.selectionKey.trim() || payload.selectionKey.length > 500 ||
        !Array.isArray(payload.resources) || !payload.resources.length || payload.resources.length > 256 ||
        !Array.isArray(payload.dependsOn) || payload.dependsOn.length > 256 || !payload.dependsOn.every(id)) {
      throw new CoordinationError("reservation-invalid", 400);
    }
    return { ...structuredClone(payload), resources: payload.resources.map((r) => canonicalResource(r, this.directory)) };
  }
  checkConflicts(candidate, active = [...this.runs.values()].filter((r) => r.state === "RESERVED")) {
    for (const other of active) {
      if (other.runId === candidate.runId) continue;
      if (other.sessionId === candidate.sessionId) throw new CoordinationError("session-already-reserved");
      if (other.changeId === candidate.changeId || other.selectionKey === candidate.selectionKey) {
        throw new CoordinationError("change-already-reserved");
      }
      if (candidate.resources.some((a) => other.resources.some((b) =>
        (a.mode === "write" || b.mode === "write") && overlaps(a.key, b.key)))) {
        throw new CoordinationError("resource-conflict");
      }
    }
    for (const dependency of candidate.dependsOn) {
      if (![...this.history, ...this.runs.values()].some((r) => r.changeId === dependency && r.state === "DELIVERED")) {
        throw new CoordinationError("dependency-not-delivered");
      }
    }
  }
  reserve(payload) {
    this.assertHealthy();
    if (this.integrationOwner) throw new CoordinationError('integration-in-progress');
    if (this.integrationQueue.length) throw new CoordinationError('integration-queued');
    const candidate = this.validate(payload);
    const prior = this.runs.get(candidate.runId);
    if (prior && (prior.state === "RESERVED" || prior.ownerId !== candidate.ownerId)) {
      throw new CoordinationError("run-id-already-used");
    }
    if ([...this.history, ...this.runs.values()].some((r) => r.changeId === candidate.changeId && r.state === "DELIVERED")) {
      throw new CoordinationError("change-already-delivered");
    }
    this.checkConflicts(candidate);
    if (prior) this.history.push(structuredClone(prior));
    const version = ++this.sequence;
    const run = { runId: candidate.runId, ownerId: candidate.ownerId, sessionId: candidate.sessionId,
      directory: candidate.directory, changeId: candidate.changeId, selectionKey: candidate.selectionKey,
      resources: candidate.resources, dependsOn: candidate.dependsOn, state: "RESERVED",
      version, contextId: version, referenceVersion: this.referenceVersion,
      integrationReady: false, integrationCompleted: false, phase: 'WORK',
      requiresPublication: candidate.resources.some((r) => r.mode === 'write'), reservedAt: new Date().toISOString() };
    this.runs.set(run.runId, run);
    this.persist();
    return structuredClone(run);
  }
  owned(runId, version) {
    this.assertHealthy();
    const run = this.runs.get(runId);
    if (!run || run.state !== "RESERVED") throw new CoordinationError("run-not-reserved");
    if (run.version !== version) throw new CoordinationError("reservation-version-stale");
    return run;
  }
  extend(runId, payload) {
    const run = this.owned(runId, payload.version);
    if (run.phase === 'REPORT') throw new CoordinationError('report-phase-only');
    if (this.integrationOwner && this.integrationOwner !== runId) throw new CoordinationError('integration-suspended');
    if (!this.integrationOwner && this.integrationQueue.length && run.integrationReady) throw new CoordinationError('integration-draining');
    const resources = this.validate({ ...run, resources: [...run.resources, ...(payload.resources || [])] }).resources;
    this.checkConflicts({ ...run, resources });
    run.resources = resources;
    run.requiresPublication ||= resources.some((r) => r.mode === 'write');
    run.integrationReady = false;
    run.version = ++this.sequence;
    this.persist();
    return structuredClone(run);
  }
  reduce(runId, payload) {
    const run = this.owned(runId, payload.version);
    if (run.phase === 'REPORT') throw new CoordinationError('report-phase-only');
    if (this.integrationOwner) throw new CoordinationError('integration-in-progress');
    if (this.integrationQueue.length && run.integrationReady) throw new CoordinationError('integration-draining');
    const resources = this.validate({ ...run, resources: payload.resources }).resources;
    for (const resource of resources) {
      if (!run.resources.some((r) => (r.mode === 'write' || resource.mode === 'read') &&
          (r.key === 'project:*' || r.key === resource.key ||
            (r.key.startsWith('file:') && resource.key.startsWith(`${r.key}/`))))) {
        throw new CoordinationError('resource-reduction-outside-reservation');
      }
    }
    run.resources = resources; run.integrationReady = false; run.version = ++this.sequence;
    this.schemaVersion = Math.max(this.schemaVersion, 2); this.persist(); return structuredClone(run);
  }
  requestIntegration(runId, version, cancel = false) {
    const run = this.owned(runId, version);
    if (run.phase === 'REPORT') throw new CoordinationError('report-phase-only');
    if (this.integrationOwner === runId) throw new CoordinationError('integration-still-owned');
    const queued = this.integrationQueue.some((e) => e.runId === runId);
    if (queued === !cancel) return this.snapshot();
    if (cancel) this.integrationQueue = this.integrationQueue.filter((e) => e.runId !== runId);
    else this.integrationQueue.push({
      runId, contextId: run.contextId, requestedAt: new Date().toISOString() });
    this.schemaVersion = Math.max(this.schemaVersion, 2); this.persist(); return this.snapshot();
  }
  reportTarget(run, file) {
    if (typeof file !== 'string' || !/^openspec\/changes\/archive\/[A-Za-z0-9][A-Za-z0-9_.-]*\/STATISTIQUES\.md$/.test(file) ||
        !/^\d{4}-\d{2}-\d{2}-/.test(file.split('/')[3]) || file.split('/')[3].slice(11) !== run.changeId ||
        canonicalResource({ key: `file:${file}`, mode: 'write' }, this.directory).key !== `file:${file}`) {
      throw new CoordinationError('report-target-invalid');
    }
    return file;
  }
  closing(runId, payload) {
    const run = this.owned(runId, payload.version);
    if (this.integrationOwner) throw new CoordinationError('integration-in-progress');
    if (!run.integrationCompleted) throw new CoordinationError('integration-publication-required');
    const file = this.reportTarget(run, payload.reportFile);
    if (run.phase === 'REPORT') {
      if (run.reportFile !== file) throw new CoordinationError('report-target-invalid');
      return structuredClone(run);
    }
    const resources = [{ key: `file:${file}`, mode: 'write' }];
    this.checkConflicts({ ...run, resources });
    run.resources = resources; run.phase = 'REPORT'; run.reportFile = file;
    run.requiresPublication = true;
    run.publishedReferenceVersion ??= run.referenceVersion;
    run.integrationReady = true; run.version = ++this.sequence;
    this.integrationQueue = this.integrationQueue.filter((e) => e.runId !== runId);
    this.schemaVersion = Math.max(this.schemaVersion, 2); this.persist(); return structuredClone(run);
  }
  completionInput(payload) {
    const completion = payload?.completion;
    if (!record(completion) || Object.keys(completion).length !== 2 ||
        !id(completion.transactionId) || typeof completion.reportFile !== 'string' ||
        payload.acquire !== false || payload.published !== true ||
        !Number.isSafeInteger(payload.version) || payload.version < 1 ||
        !Number.isSafeInteger(payload.referenceVersion) || payload.referenceVersion < 0 ||
        !Array.isArray(payload.evidence) || !payload.evidence.length ||
        !payload.evidence.every((e) => typeof e === 'string' && e.length > 0 && e.length <= 500)) {
      throw new CoordinationError('integration-completion-invalid', 400);
    }
    return { ...completion, evidenceDigest: createHash('sha256').update(JSON.stringify(payload.evidence)).digest('hex') };
  }
  completionReceipt(runId, payload) {
    this.assertHealthy();
    const input = this.completionInput(payload);
    if (!Object.hasOwn(this.integrationCompletions, input.transactionId)) return null;
    const receipt = this.integrationCompletions[input.transactionId];
    if (receipt.runId !== runId || receipt.requestVersion !== payload.version ||
        receipt.previousReferenceVersion !== payload.referenceVersion || receipt.reportFile !== input.reportFile ||
        receipt.evidenceDigest !== input.evidenceDigest) throw new CoordinationError('integration-transaction-divergent');
    return structuredClone(receipt);
  }
  completeIntegration(runId, payload) {
    const previous = this.completionReceipt(runId, payload);
    if (previous) return previous;
    const input = this.completionInput(payload);
    const run = this.owned(runId, payload.version);
    if (this.integrationOwner !== runId) throw new CoordinationError('integration-not-owned');
    if (run.phase !== 'WORK') throw new CoordinationError('report-phase-only');
    if (payload.referenceVersion !== this.referenceVersion || run.referenceVersion !== this.referenceVersion) {
      throw new CoordinationError('reference-version-stale');
    }
    const reportFile = this.reportTarget(run, input.reportFile);
    const resources = [{ key: `file:${reportFile}`, mode: 'write' }];
    this.checkConflicts({ ...run, resources });
    const receipt = { transactionId: input.transactionId, runId, contextId: run.contextId,
      requestVersion: payload.version, previousReferenceVersion: this.referenceVersion,
      referenceVersion: this.referenceVersion + 1, version: this.sequence + 1,
      reportFile, evidenceDigest: input.evidenceDigest };
    this.referenceVersion = receipt.referenceVersion;
    run.referenceVersion = this.referenceVersion; run.publishedReferenceVersion = this.referenceVersion;
    run.integrationCompleted = true; run.integrationReady = true; run.requiresPublication = true;
    run.resources = resources; run.reportFile = reportFile; run.phase = 'REPORT';
    run.version = ++this.sequence;
    this.integrationQueue = this.integrationQueue.filter((e) => e.runId !== runId);
    this.integrationOwner = null;
    this.integrationCompletions[input.transactionId] = receipt;
    this.schemaVersion = 3;
    this.persist();
    return structuredClone(receipt);
  }
  integrationBlockers(runId) {
    const blockers = [];
    if (this.integrationOwner && this.integrationOwner !== runId) {
      blockers.push({ runId: this.integrationOwner, reason: 'integration-already-owned' });
    }
    if (this.integrationQueue.length && this.integrationQueue[0].runId !== runId) {
      blockers.push({ runId: this.integrationQueue[0].runId, reason: 'integration-queue-order' });
    }
    for (const run of this.runs.values()) {
      if (run.state !== 'RESERVED' || run.phase === 'REPORT') continue;
      if (!run.integrationReady) blockers.push({ runId: run.runId, contextId: run.contextId, reason: 'stable-milestone-required' });
      if (run.referenceVersion !== this.referenceVersion) {
        blockers.push({ runId: run.runId, contextId: run.contextId, reason: 'reference-reconciliation-required' });
      }
    }
    return blockers;
  }
  checkRequestOwner(runId, requestId, digest, known) {
    this.assertHealthy();
    if (!id(requestId) || !sha256(digest)) throw new CoordinationError("request-id-invalid", 400);
    const prior = this.requestOwners[requestId];
    if (prior) {
      if (prior.runId !== runId || prior.digest !== digest) throw new CoordinationError("request-id-already-owned");
      if (!known) throw new CoordinationError("request-reconciliation-required");
      return prior;
    }
    return null;
  }
  claimRequest(runId, requestId, digest, known) {
    if (this.checkRequestOwner(runId, requestId, digest, known)) return;
    this.requestOwners[requestId] = { runId, digest };
    this.persist();
  }
  checkRequestReconciliation(runId, requestId, digest, receipt, { allowMissing = false } = {}) {
    this.assertHealthy();
    const owner = this.requestOwners[requestId];
    if (!id(requestId) || (owner ? owner.runId !== runId || owner.digest !== digest : !allowMissing) || !validReconciliation(receipt)) {
      throw new CoordinationError('notification-reconciliation-identity-divergent');
    }
    const prior = owner?.reconciliation;
    if (prior && (prior.transactionId !== receipt.transactionId || prior.inputDigest !== receipt.inputDigest)) {
      throw new CoordinationError('notification-reconciliation-transaction-divergent');
    }
    if (Object.entries(this.requestOwners).some(([key, entry]) => key !== requestId &&
        entry.reconciliation?.transactionId === receipt.transactionId)) {
      throw new CoordinationError('notification-reconciliation-transaction-divergent');
    }
    return prior || null;
  }
  transfer(runId, sessionId) {
    const run = this.runs.get(runId);
    this.owned(runId, run?.version);
    if ([...this.runs.values()].some((r) => r.runId !== runId && r.state === "RESERVED" && r.sessionId === sessionId)) {
      throw new CoordinationError("session-already-reserved");
    }
    run.sessionId = sessionId;
    run.version = ++this.sequence;
    this.persist();
  }
  covers(runId, version, resources) {
    const run = this.owned(runId, version);
    if (this.integrationOwner && this.integrationOwner !== runId) throw new CoordinationError('integration-suspended');
    if (!this.integrationOwner && this.integrationQueue.length && run.integrationReady && run.phase !== 'REPORT') {
      throw new CoordinationError('integration-draining');
    }
    if (run.phase !== 'REPORT' && run.referenceVersion !== this.referenceVersion) throw new CoordinationError('reference-reconciliation-required');
    if (!Array.isArray(resources) || !resources.length) throw new CoordinationError("command-resources-required");
    for (const resource of resources.map((r) => canonicalResource(r, this.directory))) {
      if (this.integrationOwner === runId && resource.key === 'project:*' && resource.mode === 'read') continue;
      if (!run.resources.some((r) => (r.mode === "write" || resource.mode === "read") &&
          (r.key === "project:*" || r.key === resource.key ||
           (r.key.startsWith("file:") && resource.key.startsWith(`${r.key}/`))))) {
        throw new CoordinationError("operation-outside-reservation");
      }
    }
    return true;
  }
  ready(runId, version) {
    const run = this.owned(runId, version);
    if (run.referenceVersion !== this.referenceVersion) throw new CoordinationError('reference-reconciliation-required');
    if (run.integrationReady) return;
    run.integrationReady = true;
    this.persist();
  }
  reconcile(runId, version, referenceVersion) {
    const run = this.owned(runId, version);
    if (this.integrationOwner) throw new CoordinationError('integration-in-progress');
    if (referenceVersion !== this.referenceVersion) throw new CoordinationError('reference-version-stale');
    if (this.integrationQueue.length && run.integrationReady && run.referenceVersion === referenceVersion && run.phase !== 'REPORT') {
      throw new CoordinationError('integration-draining');
    }
    run.referenceVersion = referenceVersion;
    run.integrationReady = false;
    run.version = ++this.sequence;
    this.persist();
    return structuredClone(run);
  }
  modifying(runId) {
    const run = this.runs.get(runId);
    if (run.phase === 'REPORT') return;
    run.integrationReady = false;
    run.integrationCompleted = false;
    this.persist();
  }
  integration(runId, version, acquire, published = false) {
    const run = this.owned(runId, version);
    if (run.phase === 'REPORT') throw new CoordinationError('report-phase-only');
    if (acquire && this.integrationOwner && this.integrationOwner !== runId) {
      throw new CoordinationError("integration-already-owned");
    }
    if (!acquire && this.integrationOwner !== runId) throw new CoordinationError("integration-not-owned");
    if (acquire && this.integrationQueue.length && this.integrationQueue[0].runId !== runId) {
      throw new CoordinationError('integration-queue-order');
    }
    if (acquire && [...this.runs.values()].some((r) => r.state === 'RESERVED' && r.phase !== 'REPORT' &&
        (!r.integrationReady || r.referenceVersion !== this.referenceVersion))) {
      throw new CoordinationError('integration-cohort-not-ready');
    }
    this.integrationOwner = acquire ? runId : null;
    if (!acquire) {
      this.referenceVersion += 1;
      run.referenceVersion = this.referenceVersion;
      run.integrationCompleted = published;
      if (published) run.publishedReferenceVersion = this.referenceVersion;
      this.integrationQueue = this.integrationQueue.filter((e) => e.runId !== runId);
    }
    this.persist();
  }
  cancelAcquisition(runId) {
    this.assertHealthy();
    if (this.integrationOwner !== runId) throw new CoordinationError('integration-not-owned');
    this.integrationOwner = null;
    this.persist();
  }
  release(runId, version, delivered) {
    const run = this.owned(runId, version);
    if (this.integrationOwner === runId) throw new CoordinationError("integration-still-owned");
    if (delivered && run.requiresPublication && !run.integrationCompleted) {
      throw new CoordinationError('integration-publication-required');
    }
    if (delivered && run.phase !== 'REPORT' && run.referenceVersion !== this.referenceVersion) throw new CoordinationError('reference-reconciliation-required');
    this.integrationQueue = this.integrationQueue.filter((e) => e.runId !== runId);
    run.state = delivered ? "DELIVERED" : "ABANDONED";
    run.version = ++this.sequence;
    this.persist();
    return structuredClone(run);
  }
}
