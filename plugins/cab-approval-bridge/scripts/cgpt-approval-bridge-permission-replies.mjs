import { constants, closeSync, existsSync, fstatSync, fsyncSync, mkdirSync, openSync,
  readFileSync, readdirSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { canonicalContinuityDigest as digest } from './cgpt-approval-bridge-continuity.mjs';

export const VERSION = '2.2.39';
const protocol = 'cab-native-permission-reply-v1';
const id = value => typeof value === 'string' && /^[A-Za-z0-9_.-]{1,200}$/.test(value);
const fail = code => { throw Object.assign(new Error(code), { code }); };
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const valid = value => value && Object.keys(value).every(key => ['protocol','sessionId','permissionId','directory','decision',
  'nativePid','nativeVersion','callId','targetDigest','state','createdAt','httpStatus','acknowledgedAt','replyOrigin'].includes(key)) && value.protocol === protocol && value.replyOrigin === 'CAB_CLIENT_PROGRAMMATIC' && id(value.sessionId) && id(value.permissionId) &&
  value.decision === 'reject' && typeof value.directory === 'string' && resolve(value.directory) === value.directory &&
  Number.isSafeInteger(value.nativePid) && value.nativePid > 0 && typeof value.nativeVersion === 'string' &&
  (value.callId === null || id(value.callId)) && (value.targetDigest === null || hash(value.targetDigest)) &&
  ['INTENT', 'ACKNOWLEDGED'].includes(value.state) && Number.isFinite(Date.parse(value.createdAt)) &&
  (value.state !== 'ACKNOWLEDGED' || value.httpStatus === 204 && Number.isFinite(Date.parse(value.acknowledgedAt)));

// Separate immutable identities prevent concurrent clients from overwriting another reply.
export class PermissionReplyJournal {
  constructor(directory) {
    if (typeof directory !== 'string' || resolve(directory) !== directory) fail('permission-reply-directory-invalid');
    this.directory = directory;
  }
  path(identity) {
    return join(this.directory, digest([identity.directory, identity.sessionId, identity.permissionId, identity.decision]) + '.json');
  }
  read(path) {
    if (dirname(path) !== this.directory || existsSync(this.directory) && realpathSync(this.directory) !== this.directory)
      fail('permission-reply-directory-unsafe');
    let fd;
    try {
      fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      const stat = fstatSync(fd);
      if (!stat.isFile() || stat.nlink !== 1 || stat.uid !== process.getuid() || (stat.mode & 0o077) || stat.size > 16384)
        fail('permission-reply-receipt-unsafe');
      const envelope = JSON.parse(readFileSync(fd, 'utf8'));
      if (!valid(envelope.value) || digest(envelope.value) !== envelope.digest) fail('permission-reply-receipt-invalid');
      return envelope.value;
    } catch (cause) {
      if (cause.code === 'ENOENT') return null;
      if (cause instanceof SyntaxError) fail('permission-reply-receipt-invalid');
      throw cause;
    } finally { if (fd !== undefined) closeSync(fd); }
  }
  syncDirectory() {
    const fd = openSync(this.directory, constants.O_RDONLY);
    try { fsyncSync(fd); } finally { closeSync(fd); }
  }
  begin(identity) {
    const value = { ...identity, protocol, replyOrigin: 'CAB_CLIENT_PROGRAMMATIC', state: 'INTENT', createdAt: new Date().toISOString() };
    if (!valid(value)) fail('permission-reply-identity-invalid');
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    if (realpathSync(this.directory) !== this.directory) fail('permission-reply-directory-unsafe');
    const path = this.path(identity);
    const previous = this.read(path);
    if (previous) {
      if (previous.directory !== identity.directory || previous.sessionId !== identity.sessionId ||
          previous.permissionId !== identity.permissionId || previous.decision !== identity.decision ||
          ['nativePid','nativeVersion','callId','targetDigest'].some(key => previous[key] !== identity[key]))
        fail('permission-reply-identity-divergent');
      if (previous.state === 'ACKNOWLEDGED') return { value: previous, replay: true };
      fail('opencode-permission-outcome-unverified');
    }
    let fd;
    try {
      fd = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      writeFileSync(fd, JSON.stringify({ value, digest: digest(value) }) + '\n'); fsyncSync(fd);
    } catch (cause) {
      if (cause.code === 'EEXIST') fail('opencode-permission-outcome-unverified');
      throw cause;
    } finally { if (fd !== undefined) closeSync(fd); }
    this.syncDirectory(); return { value, replay: false };
  }
  acknowledge(identity) {
    const path = this.path(identity), previous = this.read(path);
    if (!previous || previous.state !== 'INTENT' || digest(previous) !== digest(identity)) fail('permission-reply-intent-divergent');
    const value = { ...previous, state: 'ACKNOWLEDGED', httpStatus: 204, acknowledgedAt: new Date().toISOString() };
    const temp = path + '.candidate-' + randomUUID(); let fd;
    try {
      fd = openSync(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      writeFileSync(fd, JSON.stringify({ value, digest: digest(value) }) + '\n'); fsyncSync(fd); closeSync(fd); fd = undefined;
      renameSync(temp, path); this.syncDirectory(); return value;
    } finally {
      if (fd !== undefined) closeSync(fd);
      try { unlinkSync(temp); } catch (cause) { if (cause.code !== 'ENOENT') throw cause; }
    }
  }
  snapshot(sessionId, directory) {
    if (!existsSync(this.directory)) return { receipts: [], truncated: false };
    if (realpathSync(this.directory) !== this.directory) fail('permission-reply-directory-unsafe');
    const paths = readdirSync(this.directory).filter(name => /^[a-f0-9]{64}\.json$/.test(name)).sort();
    const receipts = paths.slice(0, 5000).map(name => this.read(join(this.directory, name)))
      .filter(value => value?.sessionId === sessionId && value.directory === directory);
    return { receipts, truncated: paths.length > 5000 };
  }
}
