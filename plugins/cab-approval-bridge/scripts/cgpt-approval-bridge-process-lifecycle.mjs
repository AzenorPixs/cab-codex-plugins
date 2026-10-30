import { readFile } from 'node:fs/promises';

export const VERSION = '2.1.14';
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
