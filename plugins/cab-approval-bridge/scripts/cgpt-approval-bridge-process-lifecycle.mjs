import { readFile, readdir } from 'node:fs/promises';

export const VERSION = '2.5.3';
export const SHUTDOWN_INCOMPLETE = 78;

// /proc/stat is public process metadata; never inspect cmdline or environ.
export async function processIdentity(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1 || pid > 2147483647) throw new Error('lifecycle-invalid-pid');
  let text;
  try { text = await readFile(`/proc/${pid}/stat`, 'utf8'); }
  catch (cause) { if (cause.code === 'ENOENT' || cause.code === 'ESRCH') return null; throw cause; }
  const end = text.lastIndexOf(')');
  const fields = text.slice(end + 2).trim().split(/\s+/);
  if (end < 0 || Number(text.slice(0, text.indexOf(' '))) !== pid ||
      !/^[A-Za-z]$/.test(fields[0] || '') || !/^\d+$/.test(fields[19] || '')) {
    throw new Error('lifecycle-invalid-process-identity');
  }
  return { pid, startTime: fields[19], state: fields[0] };
}

export async function processOwnerIdentity(pid) {
  const before=await processIdentity(pid);if(!before)return null;
  let status;
  try{status=await readFile(`/proc/${pid}/status`,'utf8');}catch(cause){if(['ENOENT','ESRCH'].includes(cause.code))return null;throw cause;}
  const ids=status.match(/^Uid:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/m);
  const after=await processIdentity(pid);
  if(!ids||!after||before.startTime!==after.startTime||new Set(ids.slice(1)).size!==1)return null;
  return {...after,uid:Number(ids[1])};
}

export async function verifiedNativeChild(parent, childPid) {
  if (!parent || !Number.isSafeInteger(childPid) || childPid <= 0) return false;
  const before = await processOwnerIdentity(parent.pid), child = await processOwnerIdentity(childPid);
  if (!before || !child || before.startTime !== parent.startTime || before.uid !== parent.uid || child.uid !== parent.uid) return false;
  let tids; try { tids = await readdir('/proc/' + parent.pid + '/task'); } catch { return false; }
  let found = false;
  for (const tid of tids.filter(value => /^\d+$/.test(value))) {
    try {
      const text = await readFile('/proc/' + parent.pid + '/task/' + tid + '/children', 'utf8');
      if (text.trim().split(/\s+/).includes(String(childPid))) found = true;
    } catch (cause) { if (!['ENOENT','ESRCH'].includes(cause.code)) return false; }
  }
  const after = await processOwnerIdentity(parent.pid), childAfter = await processOwnerIdentity(childPid);
  return Boolean(found && after && childAfter && after.startTime === before.startTime && after.uid === before.uid &&
    childAfter.startTime === child.startTime && childAfter.uid === child.uid && !['Z','X','x'].includes(childAfter.state));
}

// Une reconnexion n'accorde aucune permission ; le propriétaire valide la
// nouvelle instance et les sessions avant de lever ses propres protections.
export function followOpenCodeRestart(openCode, { onLost, onAttach, onReady = () => {}, onDiagnostic = () => {},
  readIdentity = processOwnerIdentity, intervalMs = 500 } = {}) {
  if (typeof onLost !== 'function' || typeof onAttach !== 'function' || typeof onReady !== 'function' || !Number.isFinite(intervalMs) || intervalMs < 1)
    throw new Error('lifecycle-invalid-options');
  let identity = null, previous = null, protectedBoundary = true, stopped = false, checking = false, timer, diagnostic = null;
  const warn = code => { if (diagnostic !== code) { diagnostic = code; onDiagnostic(code); } };
  const same = (a,b) => a?.pid === b?.pid && a?.startTime === b?.startTime;
  const alive = value => value && !['Z','X','x'].includes(value.state);
  function stop() { stopped = true; clearTimeout(timer); }
  async function check() {
    if (stopped || checking) return;
    clearTimeout(timer); checking = true;
    try {
      if (identity) {
        const current = await readIdentity(identity.pid);
        if (stopped) return;
        if (alive(current) && same(current,identity) && current.uid === identity.uid) { diagnostic = null; return; }
        previous = identity; identity = null; protectedBoundary = false;
      }
      if (previous && !protectedBoundary) { await onLost(previous); protectedBoundary = true; if (stopped) return; }
      const info = await openCode.info(true), candidate = await readIdentity(info.pid);
      if (stopped) return;
      if (!alive(candidate) || !Number.isSafeInteger(candidate.uid) || previous && (same(candidate,previous) || candidate.uid !== previous.uid)) { warn('opencode-restart-identity-unverifiable'); return; }
      const confirmation = await openCode.info(true), again = await readIdentity(info.pid);
      if (stopped) return;
      if (confirmation.pid !== info.pid || !alive(again) || !same(candidate,again) || candidate.uid !== again.uid) { warn('opencode-restart-identity-unverifiable'); return; }
      if (previous) {
        const old = await readIdentity(previous.pid);
        if (alive(old) && same(old,previous)) { warn('opencode-restart-previous-alive'); return; }
      }
      if (await onAttach(candidate, previous) !== true || stopped) { warn('opencode-restart-boundary-unverified'); return; }
      const finalInfo = await openCode.info(true), finalIdentity = await readIdentity(info.pid);
      if (stopped) return;
      if (finalInfo.pid !== info.pid || !alive(finalIdentity) || !same(candidate, finalIdentity) || candidate.uid !== finalIdentity.uid) { warn('opencode-restart-identity-unverifiable'); return; }
      if (previous) {
        const old = await readIdentity(previous.pid);
        if (alive(old) && same(old,previous)) { warn('opencode-restart-previous-alive'); return; }
      }
      onReady(candidate, previous);
      identity = candidate; previous = null; diagnostic = null;
    } catch (cause) { if (!stopped) warn(/^opencode-restart-[a-z-]+$/.test(cause?.code || '') ? cause.code : 'opencode-restart-identity-unverifiable'); }
    finally { checking = false; if (!stopped) { timer = setTimeout(() => { void check(); }, intervalMs); timer.unref(); } }
  }
  return { start() { void check(); }, stop, check,
    snapshot: () => ({ state: stopped ? 'stopped' : identity ? 'attached' : previous ? 'reconnecting' : 'waiting',
      identity: identity && { ...identity }, diagnostic }) };
}

export function followOpenCodeLifetime(openCode, { onExit, onDiagnostic = () => {},
  readIdentity = processIdentity, intervalMs = 500 } = {}) {
  if (typeof onExit !== 'function' || !Number.isFinite(intervalMs) || intervalMs < 1) {
    throw new Error('lifecycle-invalid-options');
  }
  let identity = null;
  let stopped = false;
  let checking = false;
  let timer;
  let diagnostic = null;
  function warn(code) {
    if (diagnostic !== code) { diagnostic = code; onDiagnostic(code); }
  }
  function stop() { stopped = true; clearTimeout(timer); }
  async function check() {
    if (stopped || checking) return;
    clearTimeout(timer);
    checking = true;
    let exiting = false;
    try {
      if (!identity) {
        const info = await openCode.info(true);
        const candidate = await readIdentity(info.pid);
        if (stopped) return;
        if (!candidate || ['Z', 'X', 'x'].includes(candidate.state)) {
          warn('opencode-lifecycle-identity-unverifiable'); return;
        }
        identity = candidate;
      } else {
        const current = await readIdentity(identity.pid);
        if (stopped) return;
        if (!current || ['Z', 'X', 'x'].includes(current.state) || current.startTime !== identity.startTime) {
          stop(); exiting = true; await onExit(); return;
        }
      }
      diagnostic = null;
    } catch {
      if (exiting) warn('opencode-lifecycle-shutdown-failed');
      else if (!stopped) warn('opencode-lifecycle-identity-unverifiable');
    } finally {
      checking = false;
      if (!stopped) { timer = setTimeout(() => { void check(); }, intervalMs); timer.unref(); }
    }
  }
  return { start() { void check(); }, stop, check,
    snapshot: () => ({ state: stopped ? 'stopped' : identity ? 'attached' : 'waiting',
      identity: identity && { ...identity }, diagnostic }) };
}

export async function boundedCleanup(cleanup, timeoutMs = 4000) {
  let timer;
  try {
    await Promise.race([Promise.resolve().then(cleanup), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('cab-shutdown-timeout')), timeoutMs);
    })]);
  } finally { clearTimeout(timer); }
}

export async function closeHttpServer(server) {
  const closed = new Promise((resolve, reject) => server.close((cause) => {
    if (cause && cause.code !== 'ERR_SERVER_NOT_RUNNING') reject(cause); else resolve();
  }));
  server.closeAllConnections();
  await closed;
}
