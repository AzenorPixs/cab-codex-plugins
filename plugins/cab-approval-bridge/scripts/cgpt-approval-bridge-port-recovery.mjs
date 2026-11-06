import { canonicalContinuityDigest as digest } from './cgpt-approval-bridge-continuity.mjs';
import { commandDigest } from './cgpt-approval-bridge-recovery-evidence.mjs';

export const VERSION = '2.3.6';
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
    let reboot = {};
    if (input.instanceEvidenceKind === 'kernel-reboot-after-call') {
      const boot = (await fs.readFile('/proc/stat','utf8')).match(/^btime (\d+)$/m);
      const kernelBootMs = boot ? Number(boot[1])*1000 : NaN;
      const bootIdSha256 = sha((await fs.readFile('/proc/sys/kernel/random/boot_id','utf8')).trim());
      if (!Number.isSafeInteger(kernelBootMs) || kernelBootMs !== input.kernelBootMs ||
          bootIdSha256 !== input.bootIdSha256 || !Number.isFinite(input.historicalEndedAt) ||
          input.historicalEndedAt <= 0 || kernelBootMs <= input.historicalEndedAt || kernelBootMs > Date.now() ||
          !Number.isFinite(input.instanceObservedAt) || input.instanceObservedAt < kernelBootMs ||
          input.instanceObservedAt > Date.now()+5000) stop('port-probe-reboot-unverified');
      reboot = { kernelBootMs,bootIdSha256,historicalEndedAt:input.historicalEndedAt };
    }
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
        !['controller-native-instance','legacy-cabu-native-instance','kernel-reboot-after-call'].includes(input.instanceEvidenceKind) ||
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
    // Only metadata is read. Every identity used to exclude infrastructure is sealed again below.
    const identities = new Map();
    const identity = async pid => {
      const base = '/proc/' + pid, stat = await fs.readFile(base + '/stat','utf8');
      const fields = stat.slice(stat.lastIndexOf(')')+2).trim().split(/\s+/);
      return { pid, startTime: fields[19], ppid: Number(fields[1]), uid:(await fs.stat(base)).uid,
        cgroup:await fs.readFile(base+'/cgroup','utf8'), netns:await fs.readlink(base+'/ns/net') };
    };
    const nativeIdentity = await identity(input.nativePid);
    identities.set(input.nativePid,nativeIdentity);
    const sameBoundary = value => value.uid === nativeStat.uid && value.cgroup === cgroup && value.netns === netns;
    const infrastructure = [];
    let parentPid = nativeIdentity.ppid;
    const nativeAncestors = new Set();
    for (let depth=0; parentPid>1 && depth<100; depth++) {
      if (nativeAncestors.has(parentPid)) stop('port-probe-infrastructure-cycle');
      if ((await fs.stat('/proc/'+parentPid)).uid!==nativeStat.uid) break;
      const value = await identity(parentPid);
      if (!sameBoundary(value)) break;
      nativeAncestors.add(parentPid); identities.set(parentPid,value); excluded.add(parentPid);
      infrastructure.push({pid:parentPid,startTime:value.startTime,ppid:value.ppid,reason:'native-ancestor'});
      parentPid=value.ppid;
    }
    if (nativeAncestors.size===100) stop('port-probe-infrastructure-limit');
    const exe = async pid => { const stat=await fs.stat('/proc/'+pid+'/exe'); return stat.dev+':'+stat.ino; };
    const terminal = async (pid,fd) => { const stat=await fs.stat('/proc/'+pid+'/fd/'+fd);
      return stat.isCharacterDevice() ? stat.rdev+':'+stat.ino : null; };
    const sockets = async pid => {
      const values=new Set();
      const descriptors=await fs.readdir('/proc/'+pid+'/fd');
      if(descriptors.length>4096)stop('port-probe-descriptor-limit');
      for (const fd of descriptors) {
        try { const link=await fs.readlink('/proc/'+pid+'/fd/'+fd); const match=/^socket:\[(\d+)\]$/.exec(link);
          if(match)values.add(match[1]); }
        catch(cause) { if(!['ENOENT','ESRCH'].includes(cause.code))throw cause; }
      }
      return values;
    };
    const tcpRows=[];
    const peerSeals = new Map();
    const peerConnections = new Map();
    const sealPeer = async pid => ({exe:await exe(pid),serverExe:await exe(input.nativePid),
      tty:await Promise.all([terminal(input.nativePid,2),terminal(nativeIdentity.ppid,2),
        ...[0,1,2].map(fd=>terminal(pid,fd))]),
      serverSockets:[...await sockets(input.nativePid)].sort(),peerSockets:[...await sockets(pid)].sort()});
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
      for (const line of table.trim().split('\n').slice(1)) {
        const columns=line.trim().split(/\s+/);
        tcpRows.push({local:columns[1],remote:columns[2],state:columns[3],inode:columns[9]});
      }
      if (table.trim().split('\n').slice(1).some(line => {
        const columns = line.trim().split(/\s+/); return columns[3] === '0A' && parseInt(columns[1]?.split(':').at(-1), 16) === input.port;
      })) listening = true;
    }
    const names = (await fs.readdir('/proc')).filter(value => /^\d+$/.test(value));
    if (names.length > 20000) stop('port-probe-process-limit');
    const candidates = [];
    const apiPort = input.nativeApiPort;
    if (apiPort!==undefined && (!Number.isInteger(apiPort) || apiPort<1 || apiPort>65535)) stop('port-probe-api-port-invalid');
    const loopback = address => /^(0100007F|00000000000000000000000001000000):[A-Fa-f0-9]{4}$/.test(address || '');
    const serverSockets = apiPort ? await sockets(input.nativePid) : new Set();
    const serverListening = tcpRows.some(row => row.state==='0A' && serverSockets.has(row.inode) &&
      (loopback(row.local) || /^(00000000|00000000000000000000000000000000):/.test(row.local)) &&
      parseInt(row.local.split(':').at(-1),16)===apiPort);
    for (const name of names) {
      if (excluded.has(Number(name))) continue;
      const entry = '/proc/' + name;
      try {
        if ((await fs.stat(entry)).uid !== nativeStat.uid || await fs.readFile(entry + '/cgroup', 'utf8') !== cgroup) continue;
        const stat = await fs.readFile(entry + '/stat', 'utf8');
        if (stat.slice(stat.lastIndexOf(')') + 2).startsWith('Z ')) continue;
        const cwd = await fs.readlink(entry + '/cwd');
        if (!directories.some(directory => cwd === directory || cwd.startsWith(directory + path.sep))) continue;
        const value=await identity(Number(name));
        if (value.startTime!==statStart(stat)) stop('port-probe-process-identity-changed');
        let peer=false;
        if (serverListening && sameBoundary(value) && value.ppid===nativeIdentity.ppid &&
            BigInt(value.startTime)>BigInt(startTime) && nativeAncestors.has(value.ppid)) {
          try {
            const seal=await sealPeer(value.pid),tty=seal.tty[0];
            if (tty && seal.exe===seal.serverExe && seal.tty.every(item=>item===tty)) {
              const peerSockets=new Set(seal.peerSockets);
              const pairs=tcpRows.filter(client=>client.state==='01' && peerSockets.has(client.inode) &&
                loopback(client.local) && loopback(client.remote) && parseInt(client.remote.split(':').at(-1),16)===apiPort &&
                tcpRows.some(server=>server.state==='01' && seal.serverSockets.includes(server.inode) &&
                  server.local===client.remote && server.remote===client.local));
              peer=pairs.length>0;
              if(peer){peerSeals.set(value.pid,seal);peerConnections.set(value.pid,pairs);}
            }
          } catch(cause) { if(!['ENOENT','ESRCH','EACCES','EPERM'].includes(cause.code)) throw cause; }
        }
        if (peer) {
          if(infrastructure.length>=200)stop('port-probe-infrastructure-limit');
          excluded.add(value.pid);identities.set(value.pid,value);
          infrastructure.push({pid:value.pid,startTime:value.startTime,ppid:value.ppid,reason:'native-interactive-peer'});
        } else {
          const comm=(await fs.readFile(entry+'/comm','utf8')).trim();
          candidates.push({pid:value.pid,startTime:value.startTime,ppid:value.ppid,
            comm:/^[A-Za-z0-9_.-]{1,32}$/.test(comm)?comm:'unclassified',cwdRelative:path.relative(workspace,cwd)||'.'});
        }
      } catch (cause) {
        if (!['ENOENT', 'ESRCH'].includes(cause.code)) stop('port-probe-process-coverage-incomplete');
      }
    }
    for (const [pid,value] of identities) if (canonical(value)!==canonical(await identity(pid)))
      stop('port-probe-infrastructure-identity-changed');
    for (const [pid,seal] of peerSeals) {
      const after=await sealPeer(pid);
      if(seal.exe!==after.exe||seal.serverExe!==after.serverExe||canonical(seal.tty)!==canonical(after.tty))
        stop('port-probe-infrastructure-peer-identity-changed');
    }
    if(peerConnections.size){
      const rows=[];
      for(const name of ['tcp','tcp6'])for(const line of (await fs.readFile(nativePath+'/net/'+name,'utf8')).trim().split('\n').slice(1)){
        const c=line.trim().split(/\s+/);rows.push({local:c[1],remote:c[2],state:c[3],inode:c[9]});
      }
      const currentServerSockets=await sockets(input.nativePid);
      for(const [pid,pairs] of peerConnections){
        const currentPeerSockets=await sockets(pid),seal=peerSeals.get(pid);
        if(!pairs.some(pair=>currentPeerSockets.has(pair.inode)&&rows.some(row=>canonical(row)===canonical(pair)) &&
          rows.some(row=>row.state==='01' && currentServerSockets.has(row.inode)&&seal.serverSockets.includes(row.inode)&&
            row.local===pair.remote && row.remote===pair.local)))
          stop('port-probe-infrastructure-connection-changed');
      }
    }
    if (startTime !== statStart(await fs.readFile(nativePath + '/stat', 'utf8')) ||
        cgroup !== await fs.readFile(nativePath + '/cgroup', 'utf8') || netns !== await fs.readlink(nativePath + '/ns/net'))
      stop('port-probe-native-identity-changed');
    Object.assign(result, { ...reboot, nativeStartedAtMs, nativeStartedAtUpperBound, nativeUid: nativeStat.uid, nativeStartTime: startTime, cgroupDigest: sha(cgroup),
      netnsDigest: sha(netns), infrastructure, listening, matchingProcessCount: candidates.length,
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
  const code = 'const observe=' + observePortBoundary.toString().split('\n').map(line=>line.trim()).join('\n') + ';const result=await observe(' + JSON.stringify(input) +
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

export function parsePortCapture(part, expected, {command = portProbeCommand(expected)} = {}) {
  if(typeof command!=='string'||!command)fail('port-recovery-probe-unverified');
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
      'infrastructure','matchingProcessesDigest','matchingProcesses','captureDigest','instanceObservedAt','nativeStartedAtMs','nativeStartedAtUpperBound','instanceEvidenceKind','kernelBootMs','bootIdSha256','historicalEndedAt'].includes(key)) ||
      value.infrastructure !== undefined && (!Array.isArray(value.infrastructure) || value.infrastructure.length>200 ||
        value.infrastructure.some(item=>!item || Object.keys(item).some(key=>!['pid','startTime','ppid','reason'].includes(key)) ||
          !Number.isSafeInteger(item.pid) || item.pid<1 || !Number.isSafeInteger(item.ppid) || item.ppid<1 ||
          !/^\d+$/.test(item.startTime||'') || !['native-ancestor','native-interactive-peer'].includes(item.reason))) ||
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
  if (expected.instanceEvidenceKind === 'kernel-reboot-after-call' &&
      (value.kernelBootMs !== expected.kernelBootMs || value.bootIdSha256 !== expected.bootIdSha256 ||
       value.historicalEndedAt !== expected.historicalEndedAt || !hash(value.bootIdSha256) ||
       !Number.isSafeInteger(value.kernelBootMs) || value.kernelBootMs <= value.historicalEndedAt ||
       value.instanceObservedAt < value.kernelBootMs || value.nativeStartedAtMs < value.kernelBootMs))
    fail('port-recovery-reboot-unverified');
  if (expected.instanceEvidenceKind !== 'kernel-reboot-after-call' &&
      ['kernelBootMs','bootIdSha256','historicalEndedAt'].some(key => Object.hasOwn(value,key)))
    fail('port-recovery-reboot-unexpected');
  return value;
}

export function portProbeDescription(input) {
  const command = portProbeCommand(input);
  return { protocol: 'cab-port-probe-command-v1', nonce: input.nonce, parameters: input, command,
    commandSha256: commandDigest(command), resources: [{ key: input.resourceKey, mode: 'read' }],
    nativeInputHint: { workdir: input.workspace, background: false, timeout: 30000 },
    nativeExecution: 'new-read-only-mandate-and-once-required', historicalOperationReplayed: false };
}
