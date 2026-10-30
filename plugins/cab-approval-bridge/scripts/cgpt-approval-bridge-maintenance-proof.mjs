import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { open, lstat, realpath, readlink } from 'node:fs/promises';
import { dirname, join, resolve, isAbsolute } from 'node:path';
import { homedir } from 'node:os';

export const VERSION = '2.1.22';
export const FROZEN_PROFILE = 'frozen-recovery-controller';
export const FROZEN_CAPABILITY = 'frozen-recovery-v1';
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
export const proofHash = (v) => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v,
  (_, entry) => object(entry) ? Object.fromEntries(Object.keys(entry).sort().map((key) => [key, entry[key]])) : entry)).digest('hex');
const toolHash = (parts) => createHash('sha256').update(JSON.stringify(parts)).digest('hex');
export const maintenanceError = (code) => Object.assign(new Error(code), { code, status: 409 });
const fail = (code) => { throw maintenanceError(code); };
export const transactionValid = (v) => typeof v === 'string' && /^maintenance-[a-f0-9-]{36}$/.test(v);

export function maintenanceDirectory() {
  const root = process.env.OC_Codex_MAINTENANCE_STATE_DIR ||
    join(homedir(), '.local/state/cab-approval-bridge-update/frozen-controller');
  if (!isAbsolute(root) || resolve(root) === '/') fail('maintenance-private-path-invalid');
  return resolve(root);
}

export async function regularProofFile(path, privateFile = false) {
  if (await realpath(dirname(path)) !== resolve(dirname(path))) fail('maintenance-symbolic-path');
  let file;
  try { file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); }
  catch (cause) { if (cause.code === 'ELOOP') fail('maintenance-symbolic-entry-refused'); throw cause; }
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > 4 * 1024 * 1024 ||
        (privateFile && (stat.uid !== process.getuid() || (stat.mode & 0o077)))) fail('maintenance-unsafe-file');
    return { data: await file.readFile(), mode: stat.mode & 0o777 };
  } finally { await file.close(); }
}

export async function readBootstrapJournal(root, transactionId) {
  if (!transactionValid(transactionId) || !isAbsolute(root) || await realpath(root) !== resolve(root)) fail('maintenance-journal-invalid');
  const stat = await lstat(root);
  if (!stat.isDirectory() || stat.uid !== process.getuid() || (stat.mode & 0o077)) fail('maintenance-private-state-required');
  let value;
  try { value = JSON.parse((await regularProofFile(join(root, transactionId + '.json'), true)).data); }
  catch { fail('maintenance-journal-invalid'); }
  if (value?.profile !== FROZEN_PROFILE || value.transactionId !== transactionId || !object(value.seal) ||
      proofHash(value.seal) !== value.sealDigest || value.seal.transactionId !== transactionId ||
      proofHash(value.files) !== value.seal.filesHash || proofHash(value.manifest) !== proofHash(value.seal.manifest) ||
      proofHash(value.installation) !== value.seal.installationHash || proofHash(value.deployment) !== value.seal.deploymentHash ||
      !['BOOTSTRAP_HELD','STOPPING','STOPPED','INSTALLED','RESTARTED','ADOPTED','VERIFIED','COMPLETED','ROLLED_BACK_FROZEN','ROLLBACK_FAILED'].includes(value.phase)) {
    fail('maintenance-journal-invalid');
  }
  return value;
}

export async function moduleManifest(entry) {
  const root = dirname(resolve(entry)), result = {}, pending = [resolve(entry)];
  while (pending.length) {
    const path = pending.pop(), name = path.slice(root.length + 1);
    if (dirname(path) !== root || !/^[a-zA-Z0-9_-]+\.(mjs|py)$/.test(name)) fail('maintenance-import-outside-package');
    if (Object.hasOwn(result, name)) continue;
    if (Object.keys(result).length >= 64) fail('maintenance-package-too-large');
    const { data } = await regularProofFile(path);
    result[name] = proofHash(data.toString('utf8'));
    if (name.endsWith('.mjs')) {
      for (const match of data.toString('utf8').matchAll(/(?:from\s+|import\s*)['"](\.\/[^'"]+)['"]/g)) {
        pending.push(resolve(root, match[1]));
      }
    }
  }
  const helper = 'cgpt-approval-bridge-registry-lock.py';
  result[helper] = proofHash((await regularProofFile(join(root, helper))).data.toString('utf8'));
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

export async function inspectControllerInstallation(entry, layout = 'flat') {
  entry = resolve(entry);
  if (layout === 'flat') return { layout, entry, realEntry: entry, directory: dirname(entry),
    manifest: await moduleManifest(entry) };
  if (layout !== 'managed-release') fail('maintenance-installation-layout-invalid');
  const root = dirname(entry), rootStat = await lstat(root), leaf = await lstat(entry);
  if (await realpath(root) !== root || rootStat.uid !== process.getuid() || (rootStat.mode & 0o022) ||
      !leaf.isSymbolicLink() || leaf.uid !== process.getuid() || leaf.nlink !== 1) fail('maintenance-managed-layout-invalid');
  const link = await readlink(entry);
  const match = link.match(/^releases\/([A-Za-z0-9][A-Za-z0-9_.+-]{0,99})\/scripts\/cgpt-approval-bridge-controller\.mjs$/);
  if (!match) fail('maintenance-managed-link-refused');
  const realEntry = resolve(root,link), directory = dirname(realEntry);
  if (await realpath(directory) !== directory || await realpath(realEntry) !== realEntry) fail('maintenance-managed-link-refused');
  const manifest = await moduleManifest(realEntry);
  for (const name of Object.keys(manifest)) {
    const s = await lstat(join(directory,name));
    // Une racine privée 0700 protège aussi les modes hérités de la release, sans les normaliser.
    if (s.uid !== process.getuid() || ((rootStat.mode & 0o077) !== 0 && (s.mode & 0o022))) fail('maintenance-managed-owner-divergent');
  }
  return { layout, entry, realEntry, directory, root, link, releaseId:match[1], manifest };
}

export async function checkInstallationJournal(journal, installed) {
  const original = journal.installation;
  if (original?.layout !== 'managed-release') return;
  const current = await inspectControllerInstallation(original.entry,'managed-release');
  const expectedLink = installed ? journal.deployment.link : original.link;
  if (current.root !== original.root || current.link !== expectedLink ||
      proofHash(current.manifest) !== proofHash(installed ? journal.manifest : original.manifest)) fail('maintenance-managed-pointer-changed');
  if (proofHash(await moduleManifest(original.realEntry)) !== proofHash(original.manifest)) fail('maintenance-original-release-changed');
}

export async function processIdentity(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) fail('maintenance-process-invalid');
  let stat;
  try {
    const file = await open('/proc/' + pid + '/stat', 'r');
    try { stat = await file.readFile('utf8'); } finally { await file.close(); }
  } catch { fail('maintenance-process-unavailable'); }
  const fields = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/);
  if (fields[0] === 'Z' || !/^\d+$/.test(fields[19] || '')) fail('maintenance-process-unavailable');
  return { pid, startTime: fields[19], uid: (await lstat('/proc/' + pid)).uid };
}

export async function originalGone(identity) {
  try { return proofHash(await processIdentity(identity.pid)) !== proofHash(identity); }
  catch (cause) { if (cause.code === 'maintenance-process-unavailable') return true; throw cause; }
}

export async function maintenanceHttp(base, path, body) {
  let response;
  try {
    response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', redirect: 'error',
      signal: AbortSignal.timeout(5000), headers: { 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length; if (size > 4 * 1024 * 1024) fail('maintenance-response-too-large'); chunks.push(chunk);
    }
    const text = Buffer.concat(chunks).toString('utf8');
    const value = text ? JSON.parse(text) : null;
    if (!response.ok) throw Object.assign(maintenanceError('maintenance-http-refused'), { httpStatus: response.status, refusal: value?.error });
    return value;
  } catch (cause) {
    if (cause.code?.startsWith('maintenance-')) throw cause;
    fail('maintenance-source-unavailable');
  }
}

const identityKeys = ['run_id','reservation_version','requestId','approval_id','change_id','session_id','directory',
  'title','summary','files','commands','resources','coordination_protocol','operation_id','operation_digest','expected_revisions','access_id'];
export const notificationIdentity = (a) => Object.fromEntries(identityKeys.map((key) => [key, a?.[key] ??
  (['resources','commands'].includes(key) ? [] : key === 'summary' ? '' : null)]));

export function validateFrozenTarget(target) {
  const targetKeys = ['runId','jobId','expectedSessionId','candidateSessionId','recoveryId','preflightRequestId','approvalId'];
  if (!object(target) || Object.keys(target).length !== targetKeys.length + 2 ||
      !Number.isSafeInteger(target.reservationVersion) || target.reservationVersion < 1 ||
      !Number.isSafeInteger(target.contextId) || target.contextId < 1 || targetKeys.some((k) =>
      typeof target[k] !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(target[k]))) fail('maintenance-target-invalid');
}

export async function collectFrozenProof({ controllerUrl, openCode, workspace, target, request = maintenanceHttp }) {
  validateFrozenTarget(target);
  if (!openCode) fail('maintenance-opencode-client-required');
  const registry = await request(controllerUrl, '/runs');
  const status = await request(controllerUrl, '/status');
  const readiness = status.brokerReadiness;
  if (!object(readiness) || readiness.server_version !== '1.7.1' || readiness.coordination_protocol !== 'resource-scoped-v1' ||
      !Number.isFinite(Date.parse(readiness.checked_at)) || Date.now() - Date.parse(readiness.checked_at) > 35000 ||
      Date.parse(readiness.checked_at) > Date.now() + 1000) fail('maintenance-broker-observation-unavailable');
  if (readiness.pending_count !== 1 || readiness.by_run?.[target.runId]?.pending_count !== 1 ||
      readiness.by_session?.[target.candidateSessionId]?.pending_count !== 1 ||
      Object.values(readiness.by_run || {}).reduce((n,v) => n + (v?.pending_count || 0),0) !== 1 ||
      Object.values(readiness.by_session || {}).reduce((n,v) => n + (v?.pending_count || 0),0) !== 1) fail('maintenance-broker-pending-unattributed');
  if (registry.project !== workspace || registry.schemaVersion !== 4 || registry.coordinationProtocol !== 'resource-scoped-v1' ||
      !Array.isArray(registry.runs) || !object(registry.coordination) || registry.coordination.legacySources?.length ||
      status.mode !== 'concurrent' || status.workspace !== workspace) fail('maintenance-runtime-incompatible');
  if (!Object.values(registry.coordination.accesses).every((a) => ['RELEASED','CANCELLED'].includes(a.state))) fail('maintenance-access-unresolved');
  if (Object.values(registry.coordination.operations).some((o) => ['ISSUING','EXECUTING','UNKNOWN'].includes(o.state))) fail('maintenance-effect-uncertain');
  const jobs = {}, sessionIds = new Set();
  for (const run of registry.runs.filter((r) => r.state === 'RESERVED')) {
    const current = status.runs?.[run.runId];
    const job = await request(controllerUrl, '/runs/' + encodeURIComponent(run.runId) + '/job');
    if (!current || !job || current.activeValidationCount || current.undecidedValidationCount || current.pendingReminderCount ||
        current.hasUnresolvedOperation || current.unmatchedNativePermissionCount || job.currentCabMandate ||
        job.directory !== workspace || job.changeId !== run.changeId || job.sessionId !== run.sessionId) fail('maintenance-context-not-quiescent');
    if (run.runId === target.runId) {
      const r = job.recovery;
      if (run.version !== target.reservationVersion || run.contextId !== target.contextId ||
          !job.armed || job.terminalGate?.status !== 'OPEN' || job.jobId !== target.jobId ||
          job.sessionId !== target.expectedSessionId || !r || r.sessionId !== target.candidateSessionId ||
          r.recoveryId !== target.recoveryId || r.preflightRequestId !== target.preflightRequestId ||
          r.expectedSessionId !== target.expectedSessionId || !job.revokedSessions?.includes(target.expectedSessionId)) fail('maintenance-recovery-divergent');
      sessionIds.add(r.sessionId);
    } else {
      if (job.recovery) fail('maintenance-other-recovery');
      if (run.suspension?.action !== 'PAUSE') fail('maintenance-peer-pause-required');
    }
    // La publication de readiness rafraîchit updatedAt sans changer le contrat ni ses preuves.
    jobs[run.runId] = { ...job, updatedAt: null }; sessionIds.add(run.sessionId);
  }
  if (!jobs[target.runId]) fail('maintenance-target-not-reserved');
  const [health, path, mcp, busy, permissions] = await Promise.all([
    openCode.info(), openCode.location(workspace), openCode.mcp(),
    openCode.sessionStatus(workspace), openCode.permissions(workspace)]);
  if (!health.version.startsWith('2.') || path.directory !== workspace || mcp['cgpt-validation']?.status !== 'connected') fail('maintenance-native-context-divergent');
  if (!object(busy) || Object.values(busy).some((s) => s?.type !== 'idle') || !Array.isArray(permissions) || permissions.length) fail('maintenance-native-not-quiescent');
  const sessions = {}, toolParts = []; let candidateMessages;
  for (const id of [...sessionIds].sort()) {
    const [session, messages] = await Promise.all([openCode.session(id, workspace), openCode.messages(id, workspace)]);
    if (session.id !== id || session.directory !== workspace || !Array.isArray(messages) || messages.some((m) => !Array.isArray(m.parts))) fail('maintenance-native-session-divergent');
    const parts = messages.flatMap((m) => m.parts.filter((p) => p.type === 'tool'));
    toolParts.push(...parts);
    if (parts.some((p) => !['completed','error'].includes(p.state?.status))) fail('maintenance-native-tool-in-flight');
    sessions[id] = { count: parts.length, hash: toolHash(parts), permissionHash: proofHash(session.permission) };
    if (id === target.candidateSessionId) {
      const rules = session.permission;
      const applicable = Array.isArray(rules) ? rules.filter((r) => {
        if (typeof r?.permission !== 'string') return true;
        const pattern = r.permission.replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('*','.*').replaceAll('?','.');
        return new RegExp('^' + pattern + '$').test('bash');
      }).at(-1) : null;
      if (applicable?.pattern !== '*' || applicable.action !== 'ask') fail('maintenance-native-ask-required');
      candidateMessages = messages;
    }
  }
  const latest = new Map();
  for (const part of toolParts) if (['cgpt-validation_request_validation','cgpt-validation_poll_approval','cgpt-validation_get_approval'].includes(part.tool) && part.state?.status === 'completed') {
    let output;
    try { output = JSON.parse(part.state.output); } catch { fail('maintenance-peer-proof-invalid'); }
    if (typeof output?.approval_id !== 'string' || typeof output.requestId !== 'string') fail('maintenance-peer-proof-invalid');
    latest.set(output.approval_id, output);
  }
  for (const result of latest.values()) if (result.status === 'PENDING' &&
      (result.requestId !== target.preflightRequestId || result.approval_id !== target.approvalId)) fail('maintenance-other-pending');
  for (const operation of Object.values(registry.coordination.operations)) {
    const activeRun = registry.runs.find((r) => r.runId === operation.runId && r.state === 'RESERVED' && r.contextId === operation.contextId);
    if (!activeRun || operation.state !== 'PREPARED' || operation.requestId === target.preflightRequestId) continue;
    const result = [...latest.values()].find((v) => v.requestId === operation.requestId && v.session_id === operation.sessionId);
    if (!result || !['REJECTED','CANCELLED','EXPIRED'].includes(result.status)) fail('maintenance-other-prepared-operation');
  }
  const parts = candidateMessages.flatMap((m) => m.parts.filter((p) => p.type === 'tool'));
  const recovery = jobs[target.runId].recovery;
  const boundaries = [recovery.preparationHistory, ...(recovery.attempts || [])];
  if (!boundaries[0]) fail('maintenance-recovery-boundary-missing');
  for (const b of boundaries) {
    if (!Number.isSafeInteger(b.nativeToolCount) || b.nativeToolCount < 0 || parts.length < b.nativeToolCount ||
        toolHash(parts.slice(0,b.nativeToolCount)) !== b.nativeToolHash) fail('maintenance-native-prefix-divergent');
    if (b.nativeParentId) {
      const parent = candidateMessages.find((m) => m.info?.id === b.nativeParentId)?.info;
      if (!parent || toolHash({ id: parent.id, role: parent.role, tools: parent.tools }) !== b.nativeParentHash) fail('maintenance-native-prefix-divergent');
    }
  }
  const diagnostics = new Set(['cgpt-validation_broker_readiness','cgpt-validation_broker_health',
    'cgpt-validation_list_pending','cgpt-validation_broker_evaluate_remediation']);
  if (parts.some((p) => !diagnostics.has(p.tool) && !['cgpt-validation_request_validation','cgpt-validation_poll_approval','cgpt-validation_get_approval'].includes(p.tool))) fail('maintenance-native-effect-not-excluded');
  const suffix = parts.slice(boundaries.at(-1).nativeToolCount);
  let approval = null;
  for (const part of suffix) {
    if (part.tool === 'cgpt-validation_broker_readiness') continue;
    const input = part.state.input;
    if (part.tool === 'cgpt-validation_request_validation') {
      if (approval || input?.requestId !== target.preflightRequestId || input.approval_id !== target.approvalId ||
          input.run_id !== target.runId || input.session_id !== target.candidateSessionId || input.directory !== workspace ||
          input.change_id !== jobs[target.runId].changeId || JSON.stringify(input.files) !== '[]' ||
          JSON.stringify(input.commands) !== '["/usr/bin/true"]' || !Array.isArray(input.resources) || !input.resources.length ||
          input.resources.some((r) => r.mode !== 'read')) fail('maintenance-preflight-divergent');
      approval = input;
    } else if (!approval || !['cgpt-validation_poll_approval','cgpt-validation_get_approval'].includes(part.tool) ||
        input?.approval_id !== target.approvalId) fail('maintenance-preflight-divergent');
    let output;
    try { output = JSON.parse(part.state.output); } catch { fail('maintenance-preflight-divergent'); }
    if (part.state.status !== 'completed' || output.status !== 'PENDING' ||
        ['requestId','approval_id','change_id','session_id','directory','files','commands'].some((k) =>
          JSON.stringify(output[k]) !== JSON.stringify(approval[k]))) fail('maintenance-preflight-not-pending');
  }
  if (!approval) fail('maintenance-preflight-missing');
  const owner = registry.requestOwners?.[target.preflightRequestId];
  const op = registry.coordination.operations[approval.operation_id];
  const nativeDigest = createHash('sha256').update(JSON.stringify(notificationIdentity(approval))).digest('hex');
  const operationKeys = ['run_id','reservation_version','requestId','approval_id','change_id','session_id','directory',
    'title','summary','files','commands','resources','operation_id','operation_digest','expected_revisions','access_id','coordination_protocol'];
  if (owner?.runId !== target.runId || owner.digest !== nativeDigest || owner.reconciliation ||
      !op || op.state !== 'PREPARED' || op.native || op.rejectionOnly || op.requestId !== target.preflightRequestId ||
      op.runId !== target.runId || op.contextId !== target.contextId || op.sessionId !== target.candidateSessionId ||
      op.operationDigest !== approval.operation_digest || proofHash(op.expectedRevisions) !== proofHash(approval.expected_revisions) ||
      op.version !== registry.runs.find((r) => r.runId === target.runId).version ||
      op.identityDigest !== proofHash(Object.fromEntries(operationKeys.map((k) => [k,approval[k] ?? null]))) ||
      Object.values(registry.coordination.accesses).some((a) => a.accessId === op.accessId || a.operationIds.includes(op.operationId))) fail('maintenance-orphan-identity-divergent');
  const normalizeResources = (list) => list.map((r) => ({ key:r.key,mode:r.mode })).sort((a,b) => a.key.localeCompare(b.key));
  if (proofHash(normalizeResources(op.resources)) !== proofHash(normalizeResources(approval.resources))) fail('maintenance-orphan-identity-divergent');
  if (registry.testResourceProtocol !== undefined && registry.testResourceProtocol !== 'test-resources-v1') {
    fail('maintenance-runtime-incompatible');
  }
  // Cette annonce publique est ajoutée par les lecteurs récents ; les données
  // de réservation et tous les autres champs du registre restent protégés.
  const { testResourceProtocol, ...registryState } = registry;
  const stable = { ...registryState, version: null, coordination: { ...registry.coordination, global: null } };
  const proof = { target, registryHash: proofHash(stable), jobsHash: proofHash(jobs), sessions,
    requestDigest: nativeDigest, recoveryHash: proofHash(recovery), brokerInstance: readiness.instance_id };
  proof.fingerprint = proofHash(proof);
  return proof;
}

export async function verifyBootstrap({ root, transactionId, controllerUrl, openCode, workspace,
  controllerPid, entry, request = maintenanceHttp }) {
  const journal = await readBootstrapJournal(root, transactionId), seal = journal.seal;
  await checkInstallationJournal(journal,true);
  if (!['RESTARTED','ADOPTED','VERIFIED','COMPLETED'].includes(journal.phase) ||
      journal.newController?.pid !== controllerPid || seal.workspace !== workspace ||
      seal.authorization !== journal.authorization || typeof seal.authorization !== 'string' || !seal.authorization.trim() ||
      seal.authorization.length > 500 || seal.authority !== 'BOOTSTRAP_HELD' ||
      seal.originalRefusal?.status !== 409 || seal.originalRefusal.error !== 'run-not-quiescent' ||
      !Number.isFinite(seal.createdAt) || seal.createdAt > Date.now() ||
      !Number.isFinite(seal.expiresAt) || seal.expiresAt - seal.createdAt > 60000 || Date.now() > seal.expiresAt ||
      !await originalGone(seal.originalController)) fail('maintenance-bootstrap-not-admissible');
  if (proofHash(await processIdentity(controllerPid)) !== proofHash(journal.newController)) fail('maintenance-new-controller-divergent');
  for (const identity of Object.values(seal.preservedProcesses || {}).filter(Boolean)) {
    if (proofHash(await processIdentity(identity.pid)) !== proofHash(identity)) fail('maintenance-preserved-process-divergent');
  }
  const manifest = await moduleManifest(entry);
  if (proofHash(manifest) !== seal.buildDigest || proofHash(manifest) !== proofHash(seal.manifest)) fail('maintenance-loaded-code-divergent');
  const registry = await request(controllerUrl, '/runs'), global = registry.coordination?.global;
  if (global?.transactionId !== transactionId || global.generation !== seal.generation ||
      global.inputDigest !== seal.globalInputDigest || global.cause !== 'SHARED_MAINTENANCE' ||
      !['DRAINING','HELD'].includes(global.state)) fail('maintenance-global-divergent');
  const proof = await collectFrozenProof({ controllerUrl, openCode, workspace, target: seal.target, request });
  if (proofHash(proof) !== proofHash(seal.proof)) fail('maintenance-frozen-proof-changed');
  return { journal, proof, manifest, global };
}
