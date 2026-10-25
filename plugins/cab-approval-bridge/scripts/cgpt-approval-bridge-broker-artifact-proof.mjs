import { constants } from 'node:fs';
import { lstat, open, readFile, realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { processIdentity, proofHash } from './cgpt-approval-bridge-maintenance-proof.mjs';

export const VERSION = '1.10.0';
export const BROKER_ARTIFACT_FILES = ['cgpt_approval_bridge_server.py', 'cgpt_approval_bridge_router.py', 'cgpt_approval_bridge_journal.py'];
const fail = (code) => { throw Object.assign(new Error(code), { code }); };
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
const identity = (value) => object(value) && Object.keys(value).sort().join(',') === 'pid,startTime,uid' &&
  Number.isSafeInteger(value.pid) && value.pid > 0 && /^\d+$/.test(value.startTime) &&
  Number.isSafeInteger(value.uid) && value.uid >= 0;
const version = (data) => data.toString('utf8').match(/^(?:SERVER_VERSION|VERSION)\s*=\s*["']([^"']+)["']/m)?.[1];

export function validateBrokerProof(proof, directory) {
  const keys = ['authorization','entry','expectedUid','expectedGid','manifest','loadedVersion','instanceId','opencodeProcess','brokerProcess'];
  if (!object(proof) || Object.keys(proof).sort().join(',') !== keys.sort().join(',') ||
      typeof proof.authorization !== 'string' || !proof.authorization.trim() || proof.authorization.length > 500 ||
      !isAbsolute(directory) || resolve(directory) === '/' || proof.entry !== join(resolve(directory), BROKER_ARTIFACT_FILES[0]) ||
      !Number.isSafeInteger(proof.expectedUid) || proof.expectedUid < 0 ||
      !Number.isSafeInteger(proof.expectedGid) || proof.expectedGid < 0 ||
      !object(proof.manifest) || Object.keys(proof.manifest).sort().join(',') !== [...BROKER_ARTIFACT_FILES].sort().join(',') ||
      Object.values(proof.manifest).some((value) => !/^[a-f0-9]{64}$/.test(value)) ||
      !['1.7.1', '1.8.0', VERSION].includes(proof.loadedVersion) ||
      typeof proof.instanceId !== 'string' || !/^inst-[A-Za-z0-9-]{1,100}$/.test(proof.instanceId) ||
      !identity(proof.opencodeProcess) || !identity(proof.brokerProcess) ||
      proof.brokerProcess.uid !== proof.expectedUid || proof.opencodeProcess.uid !== proof.expectedUid ||
      proof.brokerProcess.pid === proof.opencodeProcess.pid) {
    fail('update-broker-proof-invalid');
  }
  return proof;
}

async function artifact(path, proof) {
  let file;
  try { file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); }
  catch (cause) { if (cause.code === 'ELOOP') fail('update-broker-artifact-unsafe'); throw cause; }
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > 4 * 1024 * 1024 ||
        stat.uid !== proof.expectedUid || stat.gid !== proof.expectedGid || (stat.mode & 0o002)) fail('update-broker-artifact-unsafe');
    const data = await file.readFile();
    const digest = createHash('sha256').update(data).digest('hex');
    if (digest !== proof.manifest[basename(path)] || version(data) !== VERSION) fail('update-broker-artifact-divergent');
    return { sha256: digest, uid: stat.uid, gid: stat.gid, mode: stat.mode & 0o777,
      ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs, ctimeMs: stat.ctimeMs };
  } finally { await file.close(); }
}

export async function inspectBrokerArtifacts(directory, proof, packageDirectory) {
  validateBrokerProof(proof, directory);
  if (await realpath(directory) !== resolve(directory)) fail('update-broker-artifact-unsafe');
  const stat = await lstat(directory);
  if (!stat.isDirectory() || stat.uid !== proof.expectedUid || (stat.mode & 0o002) ||
      ((stat.mode & 0o020) && stat.gid !== proof.expectedGid)) fail('update-broker-artifact-unsafe');
  const files = {};
  for (const name of BROKER_ARTIFACT_FILES) {
    files[name] = await artifact(join(directory, name), proof);
    if (packageDirectory) {
      if (await realpath(dirname(join(packageDirectory,name))) !== resolve(packageDirectory)) fail('update-broker-package-divergent');
      const file = await open(join(packageDirectory,name), constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const packaged = await file.stat();
        if (!packaged.isFile() || packaged.nlink !== 1 || packaged.size > 4 * 1024 * 1024 ||
            createHash('sha256').update(await file.readFile()).digest('hex') !== files[name].sha256) fail('update-broker-package-divergent');
      } finally { await file.close(); }
    }
  }
  return { entry: proof.entry, version: VERSION, directory: resolve(directory),
    root: { uid: stat.uid, gid: stat.gid, mode: stat.mode & 0o777, ino: stat.ino }, files };
}

async function matchingChild(pid, proof) {
  const actual = await processIdentity(pid);
  if (actual.uid !== proof.expectedUid) return null;
  const stat = await readFile('/proc/' + pid + '/stat', 'utf8');
  const parent = Number(stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/)[1]);
  if (parent !== proof.opencodeProcess.pid) return null;
  // Seule la forme de lancement déclarée est acceptée ; aucun argv brut n'est
  // renvoyé, stocké dans le reçu ou utilisé comme diagnostic.
  const argv = (await readFile('/proc/' + pid + '/cmdline')).toString('utf8').split('\0').filter(Boolean);
  if (argv.length !== 2 || !/^python(?:3(?:\.\d+)?)?$/.test(basename(argv[0])) || argv[1] !== proof.entry) return null;
  if (proofHash(await processIdentity(pid)) !== proofHash(actual)) fail('update-broker-process-changed');
  return actual;
}

export async function inspectBrokerProcess(proof, expected = null) {
  if (proofHash(await processIdentity(proof.opencodeProcess.pid)) !== proofHash(proof.opencodeProcess)) fail('update-broker-parent-changed');
  if (expected) {
    const value = await matchingChild(expected.pid, proof);
    if (!value || proofHash(value) !== proofHash(expected)) fail('update-broker-process-changed');
    return value;
  }
  const children = (await readFile('/proc/' + proof.opencodeProcess.pid + '/task/' + proof.opencodeProcess.pid + '/children', 'utf8'))
    .trim().split(/\s+/).filter(Boolean).map(Number);
  const matches = [];
  for (const pid of children) {
    try { const child = await matchingChild(pid, proof); if (child) matches.push(child); }
    catch (cause) { if (!['ENOENT','ESRCH','maintenance-process-unavailable'].includes(cause.code)) throw cause; }
  }
  if (matches.length !== 1) fail('update-broker-process-not-unique');
  return matches[0];
}
