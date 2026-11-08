import { constants, closeSync, fstatSync, openSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { ContinuityStore, canonicalContinuityDigest as digest } from './cgpt-approval-bridge-continuity.mjs';
import { processIdentity } from './cgpt-approval-bridge-process-lifecycle.mjs';

export const VERSION = '2.4.27';
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const fail = code => { throw Object.assign(new Error(code), { code, status: 409 }); };
function metadata(path) {
  let fd;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.uid !== process.getuid() || stat.nlink !== 1 || stat.mode & 0o077 || stat.size > 16*1024*1024)
      fail('native-instance-metadata-unsafe');
    return JSON.parse(readFileSync(fd, 'utf8'));
  } finally { if (fd !== undefined) closeSync(fd); }
}

export class NativeInstances {
  constructor(workspace, path, updateRoot = join(homedir(), '.local/state/cab-approval-bridge-update')) {
    this.workspace = workspace; this.updateRoot = updateRoot; this.error = null; this.legacy = new Map();
    try {
      this.store = new ContinuityStore(path, 'native-instances', value => Array.isArray(value) && value.length <= 1000 &&
        value.every(row => row.workspace === workspace && Number.isSafeInteger(row.pid) && row.pid > 0 &&
          typeof row.version === 'string' && /^\d+$/.test(row.startTime || '') && Number.isSafeInteger(row.uid) &&
          hash(row.cgroupDigest) && Number.isFinite(row.observedAt) &&
          (row.kernelBootMs === undefined && row.bootIdSha256 === undefined ||
            Number.isSafeInteger(row.kernelBootMs) && row.kernelBootMs > 0 && hash(row.bootIdSha256) && row.observedAt >= row.kernelBootMs)));
      this.rows = this.store.snapshot() || [];
    } catch (cause) {
      if (!String(cause.code || '').startsWith('continuity-') && !['EACCES','EPERM','EIO'].includes(cause.code)) throw cause;
      this.error = 'native-instance-journal-unavailable'; this.rows = [];
    }
  }
  async identity(native) {
    if (this.error) return null;
    const identity = await processIdentity(native.pid);
    if (!identity) fail('native-instance-process-unavailable');
    const row = { workspace: this.workspace, pid: native.pid, version: native.version,
      startTime: identity.startTime, uid: statSync('/proc/' + native.pid).uid,
      cgroupDigest: createHash('sha256').update(readFileSync('/proc/' + native.pid + '/cgroup')).digest('hex') };
    return row;
  }
  async observe(native) {
    const row = await this.identity(native); if (!row) return null;
    const previous = this.rows.findLast(value => value.pid === row.pid && value.startTime === row.startTime);
    if (previous && Object.entries(row).every(([key,item]) => item === previous[key])) return previous;
    const next = { ...row, observedAt: Date.now() }; this.store.write([...this.rows, next]); this.rows.push(next); return next;
  }
  async kernelEpoch(native) {
    const identity = await this.identity(native);
    if (!identity) return null;
    const boot = readFileSync('/proc/stat','utf8').match(/^btime (\d+)$/m);
    const bootId = readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim();
    const kernelBootMs = boot ? Number(boot[1])*1000 : NaN;
    if (!Number.isSafeInteger(kernelBootMs) || kernelBootMs <= 0 || kernelBootMs > Date.now() ||
        !/^[a-f0-9-]{36}$/.test(bootId)) return null;
    const bootIdSha256 = createHash('sha256').update(bootId).digest('hex');
    const previous = this.rows.findLast(row => row.kernelBootMs === kernelBootMs && row.bootIdSha256 === bootIdSha256 &&
      Object.entries(identity).every(([key,value]) => row[key] === value));
    if (previous) return previous;
    if (this.rows.length >= 1000) return null;
    const observed = { ...identity,kernelBootMs,bootIdSha256,observedAt:Date.now() };
    this.store.write([...this.rows,observed]);this.rows.push(observed);
    return observed;
  }
  async rebootProof(native, historicalEndedAt) {
    if (!Number.isFinite(historicalEndedAt) || historicalEndedAt <= 0) return null;
    const epoch = await this.kernelEpoch(native);
    if (!epoch || epoch.kernelBootMs <= historicalEndedAt) return null;
    return { ...epoch,kind:'kernel-reboot-after-call',historicalEndedAt };
  }
  async proof(native, invocationStartedAt) {
    const identity = await this.identity(native);
    if (!identity || !Number.isFinite(invocationStartedAt)) return null;
    const boot = readFileSync('/proc/stat','utf8').match(/^btime (\d+)$/m);
    const kernelBootMs = boot ? Number(boot[1])*1000 : NaN;
    if (!Number.isSafeInteger(kernelBootMs) || kernelBootMs <= 0 || kernelBootMs > Date.now()) return null;
    const current = this.rows.findLast(row => Object.entries(identity).every(([key,value]) => row[key] === value)) || identity;
    const previous = this.rows.findLast(row => row.pid === current.pid && row.startTime === current.startTime && row.observedAt <= invocationStartedAt);
    if (previous && (previous.cgroupDigest !== current.cgroupDigest || previous.uid !== current.uid || previous.version !== current.version ||
        previous.observedAt < kernelBootMs)) return null;
    if (previous) return { kind:'controller-native-instance',...previous };
    const key = digest([current,invocationStartedAt]);
    if (this.legacy.has(key)) return this.legacy.get(key);
    let context;
    try {
      if (realpathSync(this.updateRoot) !== this.updateRoot) return null;
      context = metadata(join(this.updateRoot,'current.json')).contextKey;
      if (!hash(context)) return null;
    } catch { return null; }
    const names = readdirSync(this.updateRoot).filter(name => /^update-[a-f0-9-]{36}$/.test(name));
    let selected = null;
    for (const name of names.slice(0,2000)) {
      let row; try { row = metadata(join(this.updateRoot,name,'receipt.json')); } catch { continue; }
      const observedAt = Date.parse(row.updatedAt), identity = row.nativeIdentity;
      if (row.phase !== 'COMPLETED' || row.contextKey !== context || identity?.pid !== native.pid ||
          identity.version !== native.version || (identity.sharedDirectory || identity.directory) !== this.workspace ||
          !Number.isFinite(observedAt) || observedAt < kernelBootMs || observedAt > invocationStartedAt) continue;
      if (!selected || observedAt > selected.observedAt) selected = { ...current, observedAt,
        kind: 'legacy-cabu-native-instance', receiptId: name, legacyCgroupUnrecorded: true };
    }
    // The native probe additionally proves that this PID predates the old observation.
    if (selected) this.legacy.set(key,selected);
    return selected;
  }
}
