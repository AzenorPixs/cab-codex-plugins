import { constants, realpathSync } from 'node:fs';
import { mkdir, open, realpath, rename, rm, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOpenCodeV2Client, VERSION as CLIENT_VERSION } from './cgpt-approval-bridge-opencode-client.mjs';
export const VERSION = '2.1.21';
if (CLIENT_VERSION !== VERSION) throw new Error('CAB provider component version mismatch');
const fail = code => { throw Object.assign(new Error(code), { code }); };
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(value);
const safeCode = value => ['provider-transition-locked','provider-transaction-reused','provider-cohort-not-quiescent',
  'provider-cohort-changed','provider-cohort-unavailable','provider-state-invalid','provider-lock-divergent',
  'opencode-provider-input-invalid','opencode-provider-contract-unavailable','opencode-provider-server-changed',
  'opencode-provider-key-unsupported','opencode-provider-not-quiescent','opencode-provider-secret-invalid',
  'opencode-provider-connection-unconfirmed','opencode-integration-invalid','opencode-auth-required',
  'opencode-session-status-invalid','opencode-permissions-invalid','opencode-v2-response-invalid',
  'opencode-provider-location-divergent',
  'opencode-provider-connect-failed'].includes(value) || /^opencode-http-[45][0-9]{2}$/.test(value || '')
    ? value : 'provider-connect-failed';
function origin(value) {
  let url;try { url = new URL(value); } catch { fail('provider-target-invalid'); }
  if (url.protocol !== 'http:' || !['127.0.0.1','localhost','[::1]'].includes(url.hostname) ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) fail('provider-target-invalid');
  return url.origin;
}
async function publicJson(base, path, fetchImpl) {
  const response = await fetchImpl(base + path, { redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!response.ok) fail('provider-cohort-unavailable');
  let size = 0;const chunks = [];
  for await (const chunk of response.body) { size += chunk.length; if (size > 16 * 1024 * 1024) fail('provider-cohort-unavailable'); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export async function providerCohort(controllerUrl, fetchImpl = fetch) {
  const base = origin(controllerUrl);const status = await publicJson(base, '/status', fetchImpl);
  if (status.version !== VERSION || typeof status.workspace !== 'string' || !isAbsolute(status.workspace)) fail('provider-cohort-unavailable');
  const registry = await publicJson(base, '/runs', fetchImpl);const rows = [];
  if (!Array.isArray(registry.runs)) fail('provider-cohort-unavailable');
  for (const run of registry.runs.filter(run => run.state === 'RESERVED')) {
    if (!id(run.runId)) fail('provider-cohort-unavailable');
    const state = await publicJson(base, `/runs/${encodeURIComponent(run.runId)}/status`, fetchImpl);
    if (!state.job?.armed) continue;
    if (state.job.modelTransitionProtocol !== 'model-transition-v1' || state.coordination?.suspension?.action !== 'PAUSE' ||
        state.hasUnresolvedOperation !== false || state.job.currentCabMandate || state.job.recovery || state.job.modelTransition ||
        state.activeValidationCount !== 0 || state.undecidedValidationCount !== 0 || state.unmatchedNativePermissionCount !== 0 ||
        !Array.isArray(state.coordination?.accesses) ||
        state.coordination.accesses.some(a => ['HELD','WAITING','EXECUTING','UNKNOWN','STALE'].includes(a.state))) {
      fail('provider-cohort-not-quiescent');
    }
    rows.push({ runId: run.runId, version: run.version, contextId: run.contextId ?? null,
      jobId: state.job.jobId, sessionId: state.job.sessionId });
  }
  rows.sort((a,b) => a.runId.localeCompare(b.runId));
  return { workspace: status.workspace, runs: rows,
    digest: createHash('sha256').update(JSON.stringify({ workspace: status.workspace, rows })).digest('hex') };
}
async function secureDirectory(directory) {
  if (!isAbsolute(directory)) fail('provider-state-invalid');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const metadata = await stat(directory);
  if (await realpath(directory) !== resolve(directory) || metadata.uid !== process.getuid?.() || (metadata.mode & 0o077)) fail('provider-state-invalid');
}
async function save(path, value) {
  const temporary = path + '.' + randomUUID() + '.tmp';
  const handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try { await handle.writeFile(JSON.stringify(value, null, 2) + '\n'); await handle.sync(); }
  finally { await handle.close(); }
  await rename(temporary, path);
}
async function readState(path) {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile() || metadata.nlink !== 1 || metadata.uid !== process.getuid?.() || metadata.mode & 0o077 || metadata.size > 2 * 1024 * 1024) fail('provider-state-invalid');
    return JSON.parse(await handle.readFile('utf8'));
  } finally { await handle.close(); }
}
export async function connectProviderAccount({ client, controllerUrl, integrationID, transactionId, developerAuthorization,
  expectedPid, secretSource, stateDirectory, fetchImpl = fetch, reconcile = false }) {
  if (!client || !id(integrationID) || !id(transactionId) || typeof developerAuthorization !== 'string' ||
      !developerAuthorization.trim() || developerAuthorization.length > 300 || !Number.isSafeInteger(expectedPid)) fail('provider-input-invalid');
  await secureDirectory(stateDirectory);
  const path = join(stateDirectory, transactionId + '.json');const lock = join(stateDirectory, 'provider.lock');
  const ownerPath = join(lock, 'owner.json');let receipt, requestStarted = false, nativeConfirmed = false;
  const release = async () => {
    const owner = await readState(ownerPath);
    if (owner.transactionId !== transactionId) fail('provider-lock-divergent');
    await rm(lock, { recursive: true });
  };
  if (reconcile) {
    receipt = await readState(path);
    if (!receipt || Object.keys(receipt).some(k=>!['protocol','transactionId','integrationID','developerAuthorization','expectedPid','cohort',
      'phase','startedAt','status','credentialId','serverPid','serverVersion','schemaDigest','requiresPreflight','completedAt','reconciledAt','effectPossible','error'].includes(k))) fail('provider-reconciliation-invalid');
    if (receipt.protocol !== 'provider-connect-v1' || !['CONNECTING','UNCONFIRMED','COMPLETED','REFUSED'].includes(receipt.phase)) fail('provider-reconciliation-invalid');
    if (receipt.transactionId !== transactionId || receipt.integrationID !== integrationID || receipt.expectedPid !== expectedPid ||
        receipt.developerAuthorization !== developerAuthorization) fail('provider-reconciliation-divergent');
    if (receipt.phase === 'COMPLETED') {
      try { await stat(lock); } catch (cause) { if (cause.code === 'ENOENT') return receipt; throw cause; }
      await release();return receipt;
    }
    if (receipt.phase !== 'CONNECTING' && receipt.phase !== 'UNCONFIRMED') fail('provider-reconciliation-invalid');
    if ((await client.info(true)).pid !== expectedPid) fail('provider-reconciliation-server-changed');
    const active = (await client.integrationConnection(integrationID)).active;
    if (active?.type !== 'credential' || active.method !== 'key' || active.label !== `CAB-${transactionId}`) fail('provider-reconciliation-unconfirmed');
    receipt = { ...receipt, phase: 'COMPLETED', credentialId: active.id, reconciledAt: new Date().toISOString(), requiresPreflight: true };
    await save(path, receipt); await release(); return receipt;
  }
  try { await mkdir(lock, { mode: 0o700 }); } catch { fail('provider-transition-locked'); }
  await save(ownerPath, { transactionId });
  try {
    try { await stat(path); fail('provider-transaction-reused'); } catch (cause) { if (cause.code !== 'ENOENT') throw cause; }
    const cohort = await providerCohort(controllerUrl, fetchImpl);
    if (cohort.workspace !== await client.sharedMcpDirectory()) fail('provider-cohort-changed');
    receipt = { protocol: 'provider-connect-v1', transactionId, integrationID, developerAuthorization,
      expectedPid, cohort, phase: 'CONNECTING', startedAt: new Date().toISOString() };
    await save(path, receipt);
    requestStarted = true;
    const result = await client.connectProviderKey(integrationID, { transactionId, expectedPid, secretSource,
      assertBoundary: async () => { if ((await providerCohort(controllerUrl, fetchImpl)).digest !== cohort.digest) fail('provider-cohort-changed'); } });
    nativeConfirmed = true;
    receipt = { ...receipt, ...result, phase: 'COMPLETED', completedAt: new Date().toISOString() };
    await save(path, receipt);await release();return receipt;
  } catch (cause) {
    const effectPossible = nativeConfirmed || requestStarted && cause.effectPossible !== false;
    if (receipt) {
      receipt = { ...receipt, phase: effectPossible ? 'UNCONFIRMED' : 'REFUSED', effectPossible,
        error: safeCode(cause.code) };
      try { await save(path, receipt); } catch { fail('provider-receipt-unconfirmed'); }
    }
    if (!effectPossible) await release();
    throw Object.assign(new Error(receipt?.error || safeCode(cause.code)), { code: receipt?.error || safeCode(cause.code), effectPossible });
  }
}
async function secretFromFd(fd) {
  if (!Number.isSafeInteger(fd) || fd < 0 || fd > 1024 || fd === 0 && process.stdin.isTTY) fail('provider-secret-channel-invalid');
  const chunks = []; let size = 0;
  try {
    for await (const chunk of createReadStream(null, { fd, autoClose: false, signal: AbortSignal.timeout(15000) })) {
      size += chunk.length; if (size > 4096) fail('provider-secret-channel-invalid'); chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch { fail('provider-secret-channel-invalid'); }
  finally { for (const chunk of chunks) chunk.fill(0); }
}
async function main() {
  const values = {};const flags = new Set(['opencode-url','controller-url','directory','integration','transaction','authorization-reference','expected-pid','secret-fd','state-directory']);let reconcile = false;
  for (let i=2;i<process.argv.length;i++) {
    const key = process.argv[i].replace(/^--/, '');if (key === 'reconcile') { reconcile = true;continue; }
    if (!flags.has(key) || values[key] !== undefined || !process.argv[i+1]) fail('provider-cli-invalid');values[key] = process.argv[++i];
  }
  const client = createOpenCodeV2Client({ baseUrl: values['opencode-url'], directory: values.directory });
  const receipt = await connectProviderAccount({ client, controllerUrl: values['controller-url'], integrationID: values.integration,
    transactionId: values.transaction, developerAuthorization: values['authorization-reference'], expectedPid: Number(values['expected-pid']),
    secretSource: () => secretFromFd(Number(values['secret-fd'])),
    stateDirectory: values['state-directory'] || join(homedir(), '.local/state/cab-provider-connect'), reconcile });
  process.stdout.write(JSON.stringify(receipt) + '\n');
}
let directEntry = false;
try { directEntry = Boolean(process.argv[1]) && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
catch (cause) { if (!['ENOENT','ENOTDIR'].includes(cause.code)) throw cause; }
if (directEntry) {
  main().catch(cause => { process.stderr.write(JSON.stringify({ error: /^[a-z][a-z0-9-]{1,90}$/.test(cause.code || '') ? cause.code : 'provider-connect-failed', effectPossible: cause.effectPossible === true }) + '\n');process.exitCode = 1; });
}
