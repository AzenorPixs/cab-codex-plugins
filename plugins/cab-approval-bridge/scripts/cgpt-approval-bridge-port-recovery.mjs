import { canonicalContinuityDigest as digest } from './cgpt-approval-bridge-continuity.mjs';
import { commandDigest } from './cgpt-approval-bridge-recovery-evidence.mjs';

export const VERSION = '2.2.35';
const fail = code => { throw Object.assign(new Error(code), { code, status: 409 }); };
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const id = value => typeof value === 'string' && /^[A-Za-z0-9_.-]{1,100}$/.test(value);
const relativeDirectory = path => typeof path === 'string' && /^[A-Za-z0-9_./-]{1,200}$/.test(path) &&
  !path.startsWith('/') && !path.split('/').some(part => !part || part === '..');

// This self-contained function also runs under the native account. It reads metadata only.
export async function observePortBoundary(input) {
  const fs = await import('node:fs/promises'), path = await import('node:path'), crypto = await import('node:crypto');
  const canonical = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
  const sha = value => crypto.createHash('sha256').update(typeof value === 'string' ? value : canonical(value)).digest('hex');
  const result = { protocol: 'cab-port-boundary-v1', nonce: input.nonce, nativePid: input.nativePid,
    port: input.port, runtimeDirectories: input.runtimeDirectories, workspace: input.workspace,
    observedAt: Date.now(), instanceObservedAt: input.instanceObservedAt, instanceEvidenceKind: input.instanceEvidenceKind, complete: false, quiescent: false };
  const stop = code => { throw Object.assign(new Error(code), { code }); };
  try {
    if (!Number.isSafeInteger(input.nativePid) || input.nativePid < 1 || !Number.isInteger(input.port) ||
        input.port < 1 || input.port > 65535 || typeof input.workspace !== 'string' || !path.isAbsolute(input.workspace) ||
        !/^[A-Za-z0-9_.-]{1,100}$/.test(input.nonce || '') || !Array.isArray(input.runtimeDirectories) ||
        !input.runtimeDirectories.length || input.runtimeDirectories.length > 10) stop('port-probe-input-invalid');
    const workspace = await fs.realpath(input.workspace), nativePath = '/proc/' + input.nativePid;
    const nativeStat = await fs.stat(nativePath), nativeComm = (await fs.readFile(nativePath + '/comm', 'utf8')).trim();
    if (nativeStat.uid !== process.getuid() || nativeComm !== 'opencode') stop('port-probe-native-account-mismatch');
    const statStart = text => text.slice(text.lastIndexOf(')') + 2).trim().split(/\s+/)[19];
    const startTime = statStart(await fs.readFile(nativePath + '/stat', 'utf8'));
    const child = await import('node:child_process');
    const ticks = await new Promise((resolve, reject) => child.execFile('/usr/bin/getconf',['CLK_TCK'],
      {timeout:5000,maxBuffer:256},(error,stdout)=>error?reject(error):resolve(stdout.trim())));
    if (!/^[1-9][0-9]{0,5}$/.test(ticks)) stop('port-probe-clock-unsupported');
    const boot = /^btime (\d+)$/m.exec(await fs.readFile('/proc/stat','utf8'));
    if (!boot) stop('port-probe-clock-unsupported');
    const nativeStartedAtMs = Number(boot[1])*1000 + Number(startTime)*1000/Number(ticks);
    const nativeStartedAtUpperBound = nativeStartedAtMs + 1000 + 1000/Number(ticks);
    if (!Number.isFinite(input.instanceObservedAt) || startTime !== input.instanceStartTime ||
        !['controller-native-instance','legacy-cabu-native-instance'].includes(input.instanceEvidenceKind) ||
        input.instanceEvidenceKind === 'legacy-cabu-native-instance' && nativeStartedAtUpperBound > input.instanceObservedAt)
      stop('port-probe-native-instance-history-unverified');
    const cgroup = await fs.readFile(nativePath + '/cgroup', 'utf8'), netns = await fs.readlink(nativePath + '/ns/net');
    if (cgroup !== await fs.readFile('/proc/self/cgroup', 'utf8') || netns !== await fs.readlink('/proc/self/ns/net') ||
        await fs.readlink(nativePath + '/ns/time') !== await fs.readlink('/proc/self/ns/time'))
      stop('port-probe-namespace-divergent');
    const directories = [];
    for (const value of input.runtimeDirectories) {
      if (typeof value !== 'string' || !/^[A-Za-z0-9_./-]{1,200}$/.test(value) ||
          value.startsWith('/') || value.split('/').some(part => !part || part === '..')) stop('port-probe-directory-invalid');
      const directory = await fs.realpath(path.join(workspace, value));
      if (directory !== workspace && !directory.startsWith(workspace + path.sep)) stop('port-probe-directory-outside-workspace');
      directories.push(directory);
    }
    const excluded = new Set([process.pid, input.nativePid]);
    if (!Array.isArray(input.excludedInfrastructure || []) || (input.excludedInfrastructure || []).length > 10)
      stop('port-probe-infrastructure-invalid');
    for (const item of input.excludedInfrastructure || []) {
      if (!Number.isSafeInteger(item.pid) || !/^\d+$/.test(item.startTime || '')) stop('port-probe-infrastructure-invalid');
      const base = '/proc/' + item.pid, stat = await fs.readFile(base + '/stat', 'utf8');
      if ((await fs.stat(base)).uid !== nativeStat.uid || await fs.readFile(base + '/cgroup','utf8') !== cgroup) continue;
      if (statStart(stat) !== item.startTime ||
          !/^python[0-9.]*$/.test((await fs.readFile(base + '/comm', 'utf8')).trim()))
        stop('port-probe-infrastructure-divergent');
      excluded.add(item.pid);
    }
    const ancestors = []; let ancestor = process.ppid;
    for (let depth=0; ancestor>1 && depth<100; depth++) {
      if (ancestor === input.nativePid) { for (const pid of ancestors) excluded.add(pid); break; }
      ancestors.push(ancestor);
      const stat = await fs.readFile('/proc/' + ancestor + '/stat', 'utf8');
      ancestor = Number(stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/)[1]);
    }
    let listening = false;
    for (const name of ['tcp', 'tcp6']) {
      const table = await fs.readFile(nativePath + '/net/' + name, 'utf8');
      if (table.trim().split('\n').slice(1).some(line => {
        const columns = line.trim().split(/\s+/); return columns[3] === '0A' && parseInt(columns[1]?.split(':').at(-1), 16) === input.port;
      })) listening = true;
    }
    const names = (await fs.readdir('/proc')).filter(value => /^\d+$/.test(value));
    if (names.length > 20000) stop('port-probe-process-limit');
    const candidates = [];
    for (const name of names) {
      if (excluded.has(Number(name))) continue;
      const entry = '/proc/' + name;
      try {
        if ((await fs.stat(entry)).uid !== nativeStat.uid || await fs.readFile(entry + '/cgroup', 'utf8') !== cgroup) continue;
        const stat = await fs.readFile(entry + '/stat', 'utf8');
        if (stat.slice(stat.lastIndexOf(')') + 2).startsWith('Z ')) continue;
        const cwd = await fs.readlink(entry + '/cwd');
        if (directories.some(directory => cwd === directory || cwd.startsWith(directory + path.sep)))
          candidates.push({ pid: Number(name), startTime: statStart(stat) });
      } catch (cause) {
        if (!['ENOENT', 'ESRCH'].includes(cause.code)) stop('port-probe-process-coverage-incomplete');
      }
    }
    if (startTime !== statStart(await fs.readFile(nativePath + '/stat', 'utf8')) ||
        cgroup !== await fs.readFile(nativePath + '/cgroup', 'utf8') || netns !== await fs.readlink(nativePath + '/ns/net'))
      stop('port-probe-native-identity-changed');
    Object.assign(result, { nativeStartedAtMs, nativeStartedAtUpperBound, nativeUid: nativeStat.uid, nativeStartTime: startTime, cgroupDigest: sha(cgroup),
      netnsDigest: sha(netns), listening, matchingProcessCount: candidates.length,
      matchingProcessesDigest: sha(candidates.sort((a,b) => a.pid-b.pid)), matchingProcesses: candidates.slice(0,100), complete: true, quiescent: !listening && !candidates.length });
  } catch (cause) {
    result.error = /^port-probe-[a-z-]+$/.test(cause.code || '') ? cause.code : 'port-probe-observation-unavailable';
  }
  return { ...result, captureDigest: sha(result) };
}

const shellQuote = value => "'" + value.replaceAll("'", "'\"'\"'") + "'";
export function portProbeCommand(input) {
  if (!id(input.nonce) || !Number.isSafeInteger(input.nativePid) || input.nativePid < 1 ||
      !Number.isInteger(input.port) || input.port < 1 || input.port > 65535 ||
      !Array.isArray(input.runtimeDirectories) || !input.runtimeDirectories.length || input.runtimeDirectories.length > 10 ||
      input.runtimeDirectories.some(value => !relativeDirectory(value)) || typeof input.workspace !== 'string')
    fail('port-probe-input-invalid');
  const code = 'const observe=' + observePortBoundary.toString() + ';const result=await observe(' + JSON.stringify(input) +
    ');process.stdout.write("CAB_PORT_BOUNDARY_V1:"+Buffer.from(JSON.stringify(result)).toString("base64")+"\\n");if(!result.complete||!result.quiescent)process.exitCode=2;';
  return '/usr/bin/node --input-type=module --eval ' + shellQuote(code);
}

export function validatePortReview(review, ownerId) {
  if (!review || Object.keys(review).some(key => !['ownerId','serverKind','commandSha256','runtimeDirectories','sourceFiles',
    'noDetachedWorkOutsideDirectories','noProcessIsolationOrCredentialChange','evidenceRefs'].includes(key)) || review.ownerId !== ownerId ||
      review.serverKind !== 'VITE_LOCAL_DEV_SERVER' || !hash(review.commandSha256) ||
      review.noDetachedWorkOutsideDirectories !== true || review.noProcessIsolationOrCredentialChange !== true || !Array.isArray(review.runtimeDirectories) ||
      !review.runtimeDirectories.length || review.runtimeDirectories.length > 10 || !review.runtimeDirectories.includes('.') ||
      review.runtimeDirectories.some(value => !relativeDirectory(value)) ||
      !Array.isArray(review.sourceFiles) || !review.sourceFiles.length || review.sourceFiles.length > 20 ||
      review.sourceFiles.some(value => !value || Object.keys(value).some(key => !['path','sha256'].includes(key)) ||
        value.path === '.' || !relativeDirectory(value.path) || !hash(value.sha256)) ||
      !Array.isArray(review.evidenceRefs) || !review.evidenceRefs.length || review.evidenceRefs.length > 20 ||
      review.evidenceRefs.some(ref => typeof ref !== 'string' || !/^[A-Za-z0-9_.:/@-]{1,240}$/.test(ref)))
    fail('port-recovery-review-invalid');
}

export function parsePortCapture(part, expected) {
  const command = portProbeCommand(expected);
  if (part?.type !== 'tool' || part.tool !== 'bash' || part.nativeFormat !== 'opencode-v2' ||
      part.state?.status !== 'completed' || part.state.metadata?.exit !== 0 ||
      part.state.input?.command !== command || part.state.input?.background === true ||
      part.state.input?.workdir !== undefined && part.state.input.workdir !== expected.workspace)
    fail('port-recovery-probe-unverified');
  const markers = (part.state.output || '').split(/\r?\n/).filter(line => line.startsWith('CAB_PORT_BOUNDARY_V1:'));
  if (markers.length !== 1) fail('port-recovery-probe-output-invalid');
  let value; try { value = JSON.parse(Buffer.from(markers[0].slice('CAB_PORT_BOUNDARY_V1:'.length), 'base64').toString('utf8')); }
  catch { fail('port-recovery-probe-output-invalid'); }
  const { captureDigest, ...observation } = value;
  if (Object.keys(value).some(key => !['protocol','nonce','nativePid','port','runtimeDirectories','workspace','observedAt','complete',
      'quiescent','nativeUid','nativeStartTime','cgroupDigest','netnsDigest','listening','matchingProcessCount',
      'matchingProcessesDigest','matchingProcesses','captureDigest','instanceObservedAt','nativeStartedAtMs','nativeStartedAtUpperBound','instanceEvidenceKind'].includes(key)) ||
      !Array.isArray(value.matchingProcesses) || value.matchingProcesses.length || value.matchingProcessesDigest !== digest([]) ||
      captureDigest !== digest(observation) || value.protocol !== 'cab-port-boundary-v1' ||
      value.instanceObservedAt !== expected.instanceObservedAt || value.instanceEvidenceKind !== expected.instanceEvidenceKind ||
      value.nativeStartTime !== expected.instanceStartTime || !Number.isFinite(value.nativeStartedAtMs) ||
      !Number.isFinite(value.nativeStartedAtUpperBound) ||
      expected.instanceEvidenceKind === 'legacy-cabu-native-instance' && value.nativeStartedAtUpperBound > value.instanceObservedAt || value.nonce !== expected.nonce || value.nativePid !== expected.nativePid || value.workspace !== expected.workspace ||
      value.port !== expected.port || JSON.stringify(value.runtimeDirectories) !== JSON.stringify(expected.runtimeDirectories) ||
      value.complete !== true || value.quiescent !== true || value.listening !== false || value.matchingProcessCount !== 0 ||
      !hash(value.cgroupDigest) || !hash(value.netnsDigest) || !/^\d+$/.test(value.nativeStartTime || '') ||
      !Number.isFinite(value.observedAt) || !Number.isSafeInteger(value.nativeUid) || value.nativeUid < 0)
    fail('port-recovery-current-boundary-unverified');
  return value;
}

export function portProbeDescription(input) {
  const command = portProbeCommand(input);
  return { protocol: 'cab-port-probe-command-v1', nonce: input.nonce, parameters: input, command,
    commandSha256: commandDigest(command), resources: [{ key: input.resourceKey, mode: 'read' }],
    nativeInputHint: { workdir: input.workspace, background: false, timeout: 30000 },
    nativeExecution: 'new-read-only-mandate-and-once-required', historicalOperationReplayed: false };
}
