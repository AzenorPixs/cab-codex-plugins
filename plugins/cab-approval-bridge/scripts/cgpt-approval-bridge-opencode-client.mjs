import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { open } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

export const VERSION = '2.1.22';
const RESPONSE_LIMIT = 2 * 1024 * 1024;
const CREDENTIAL_LIMIT = 4096;
const fail = (code) => { throw Object.assign(new Error(code), { code }); };

function envValue(name) {
  return process.env[name] || process.env[name.replace('OC_Codex_', 'OC_CGPT_')];
}

function loopbackUrl(value) {
  let url;
  try { url = new URL(value); } catch { fail('opencode-url-invalid'); }
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) fail('opencode-url-invalid');
  return url.origin;
}

function readResponse(response, limit = RESPONSE_LIMIT) {
  return (async () => {
    if (!response.body) fail('opencode-response-empty');
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) {
          await reader.cancel();
          fail('opencode-response-too-large');
        }
        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }
    return Buffer.concat(chunks, size).toString('utf8');
  })();
}

async function readPassword(path) {
  let filePath = path;
  if (filePath.startsWith('~/')) filePath = join(homedir(), filePath.slice(2));
  if (!isAbsolute(filePath)) fail('opencode-credential-path-invalid');
  let handle;
  try {
    handle = await open(resolve(filePath), constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
    const metadata = await handle.stat();
    if (!metadata.isFile() || metadata.nlink !== 1 || metadata.size < 1 || metadata.size > CREDENTIAL_LIMIT ||
        metadata.uid !== process.getuid?.() || (metadata.mode & 0o077) !== 0 || (metadata.mode & 0o400) === 0) {
      fail('opencode-credential-unavailable');
    }
    const bytes = await handle.readFile();
    const password = bytes.toString('utf8');
    if (!Buffer.from(password, 'utf8').equals(bytes)) fail('opencode-credential-unavailable');
    const normalized = password.endsWith('\n') ? password.slice(0, -1) : password;
    if (!normalized || /[\r\n\0]/.test(normalized)) fail('opencode-credential-unavailable');
    return normalized;
  } catch (cause) {
    if (cause?.code?.startsWith('opencode-')) throw cause;
    fail('opencode-credential-unavailable');
  } finally {
    await handle?.close().catch(() => {});
  }
}

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function modelReference(model) {
  if (!record(model) || typeof model.providerID !== 'string' || typeof model.modelID !== 'string') fail('opencode-model-invalid');
  if (Object.hasOwn(model, 'variant')) {
    throw Object.assign(new Error('Le champ model.variant est réservé aux lectures natives ; utiliser model.reasoning en entrée.'),
      { code: 'opencode-model-variant-unsupported' });
  }
  return { id: model.modelID, providerID: model.providerID,
    ...(typeof model.reasoning === 'string' ? { variant: model.reasoning } : {}) };
}

function unwrapData(value, code) {
  if (!record(value) || !Object.hasOwn(value, 'data')) fail(code);
  return value.data;
}

function normalizeSession(session) {
  if (!record(session) || typeof session.id !== 'string') fail('opencode-session-invalid');
  const directory = session.directory || session.location?.directory;
  if (typeof directory !== 'string' || !isAbsolute(directory)) fail('opencode-session-invalid');
  const permissions = session.permissions ?? [];
  if (!Array.isArray(permissions)) fail('opencode-session-invalid');
  const normalizedPermissions = permissions.map((rule) => {
    if (!record(rule) || typeof rule.action !== 'string' || typeof rule.resource !== 'string' ||
        !['allow', 'deny', 'ask'].includes(rule.effect)) fail('opencode-session-invalid');
    return { permission: rule.action, pattern: rule.resource, action: rule.effect };
  });
  return { ...session, directory, permission: normalizedPermissions,
    ...(record(session.model) ? { model: { providerID: session.model.providerID, modelID: session.model.id,
      ...(typeof session.model.variant === 'string' ? { variant: session.model.variant } : {}) } } : {}) };
}

function normalizePermission(permission) {
  if (!record(permission) || typeof permission.id !== 'string' || typeof permission.sessionID !== 'string' ||
      typeof permission.action !== 'string' || !Array.isArray(permission.resources) ||
      permission.resources.some(value => typeof value !== 'string')) {
    fail('opencode-permission-invalid');
  }
  const metadata = record(permission.metadata) ? { ...permission.metadata } : {};
  delete metadata.nativeToolInputSha256;
  delete metadata.nativeSourceVerified;
  if (permission.action === 'edit' && typeof metadata.filepath !== 'string' && permission.resources.length === 1) {
    metadata.filepath = permission.resources[0];
  }
  if (['bash', 'shell'].includes(permission.action) && typeof metadata.command !== 'string' && permission.resources.length === 1) {
    metadata.command = permission.resources[0];
  }
  return { id: permission.id, sessionID: permission.sessionID, permission: permission.action === 'shell' ? 'bash' : permission.action, metadata,
    ...(permission.action === 'shell' ? { nativeAction: 'shell' } : {}),
    source: permission.source, message: permission.message,
    ...(record(permission.source) && permission.source.type === 'tool' && typeof permission.source.id === 'string'
      ? { tool: { callID: permission.source.id } } : {}) };
}

function canonical(value) {
  return JSON.stringify((function ordered(v) {
    return Array.isArray(v) ? v.map(ordered) : record(v)
      ? Object.fromEntries(Object.keys(v).sort().map(k => [k, ordered(v[k])])) : v;
  })(value));
}

export function nativeToolInputDigest(input) {
  if (!record(input)) fail('opencode-tool-input-invalid');
  return createHash('sha256').update(canonical(input),'utf8').digest('hex');
}

// Une grammaire de données, jamais un interpréteur JavaScript.
function parseLiteralData(raw) {
  let text = '', quoted = false, escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]; text += c;
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === '{' || c === ',') {
      const match = /^(\s*)([A-Za-z_$][\w$]*)\s*:/.exec(raw.slice(i + 1));
      if (match) { text += match[1] + JSON.stringify(match[2]) + ':'; i += match[0].length; }
    }
  }
  return JSON.parse(text);
}

function literalObject(source) {
  if (source[0] !== '{') return null;
  let depth = 0, quoted = false, escaped = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === '{' || c === '[') { if (++depth > 32) return null; }
    else if (c === '}' || c === ']') {
      depth--;
      if (depth === 0) {
        try { return { value: parseLiteralData(source.slice(0, i + 1)), rest: source.slice(i + 1).trim() }; }
        catch { return null; }
      }
    }
  }
  return null;
}

function codeModePart(content, part) {
  if (typeof part.state.input?.code !== 'string' || part.state.metadata?.truncated === true) return null;
  let code = part.state.input.code.trim(), discovery;
  const diagnostic = /^search\s*\(\s*/.exec(code);
  if (diagnostic) {
    const literal = literalObject(code.slice(diagnostic[0].length));
    const acknowledgement = literal && /^\)\s*;\s*return\s+("(?:[^"\\]|\\.)*")\s*;?$/.exec(literal.rest);
    if (!acknowledgement) return null;
    try { if (typeof JSON.parse(acknowledgement[1]) !== 'string') return null; } catch { return null; }
    discovery = { tool: 'search', input: literal.value }; code = '';
  }
  const prefix = /^const\s+([A-Za-z_$][\w$]*)\s*=\s*search\s*\(\s*/.exec(code);
  if (prefix) {
    if (['tools', 'search'].includes(prefix[1])) return null;
    const literal = literalObject(code.slice(prefix[0].length));
    if (!literal || !/^\)\s*;/.test(literal.rest)) return null;
    code = literal.rest.replace(/^\)\s*;/, '').trim();
    discovery = { tool: 'search', input: literal.value };
    if (new RegExp('^return\\s+' + prefix[1].replace(/[$]/g, '\\$&') + '\\s*;?$').test(code)) code = '';
  }
  const match = /^return\s+await\s+tools\[(["'])cgpt-validation\1\]\.([a-z_]+)\s*\(\s*/.exec(code);
  let call;
  if (match) {
    if (!['broker_readiness', 'request_validation', 'poll_approval', 'get_approval', 'reject'].includes(match[2])) return null;
    const literal = literalObject(code.slice(match[0].length));
    if (!literal || !/^\)\s*;?$/.test(literal.rest)) return null;
    call = { tool: 'cgpt-validation.' + match[2], input: literal.value };
  } else if (code || !discovery) return null;
  const expected = [discovery, call].filter(Boolean), observed = part.state.metadata?.toolCalls;
  const nativeFailure = part.state.status === 'completed' && part.state.metadata?.error === true &&
    !discovery && ['cgpt-validation.request_validation', 'cgpt-validation.get_approval'].includes(call?.tool) &&
    Array.isArray(observed) && observed.length === 1 && observed[0]?.status === 'error';
  if ((observed !== undefined && !Array.isArray(observed)) ||
      (part.state.status === 'completed' && part.state.metadata?.truncated !== false)) return null;
  if (part.state.status !== 'running' || (Array.isArray(observed) && observed.length)) {
    if (!Array.isArray(observed) || observed.length !== expected.length || observed.some((entry, i) =>
        !record(entry) || entry.tool !== expected[i].tool || canonical(entry.input) !== canonical(expected[i].input) ||
        !(['completed', 'error'].includes(entry.status) || part.state.status === 'running' &&
          entry.tool === 'cgpt-validation.request_validation' && i === expected.length - 1 && entry.status === 'running')) ||
        (part.state.status === 'completed' && observed.some(entry => entry.status !== 'completed') && !nativeFailure)) return null;
  } else if (!call || call.tool !== 'cgpt-validation.request_validation') return null;
  return { ...part, tool: call ? call.tool.replace('cgpt-validation.', 'cgpt-validation_') : 'cab_codemode_discovery',
    state: { ...part.state, input: call?.input || discovery.input,
      ...(nativeFailure ? { status: 'error', error: part.state.output } : {}),
      metadata: { ...part.state.metadata, cabCodeMode: {
        wrapperId: content.id, ...(nativeFailure ? { nativeMcpError: true } : {}), envelopeHash: createHash('sha256').update(canonical(content)).digest('hex') } } } };
}

function nativeUsage(message) {
  const usage = {};
  if (message.tokens != null) {
    const tokens = message.tokens;
    if (!record(tokens)) fail('opencode-message-usage-invalid');
    const count = value => Number.isSafeInteger(value) && value >= 0;
    const selected = {};
    for (const key of ['input', 'output', 'reasoning', 'total']) {
      if (tokens[key] !== undefined) {
        if (!count(tokens[key])) fail('opencode-message-usage-invalid');
        selected[key] = tokens[key];
      }
    }
    if (tokens.cache !== undefined) {
      if (!record(tokens.cache)) fail('opencode-message-usage-invalid');
      selected.cache = {};
      for (const key of ['read', 'write']) if (tokens.cache[key] !== undefined) {
        if (!count(tokens.cache[key])) fail('opencode-message-usage-invalid');
        selected.cache[key] = tokens.cache[key];
      }
    }
    if (!Object.keys(selected).length) fail('opencode-message-usage-invalid');
    usage.tokens = selected;
  }
  if (message.cost != null) {
    if (typeof message.cost !== 'number' || !Number.isFinite(message.cost) || message.cost < 0) fail('opencode-message-usage-invalid');
    usage.cost = message.cost;
  }
  return Object.keys(usage).length ? { ...usage, usageSource: 'opencode-v2' } : usage;
}

function directMcpError(content) {
  if (!['cgpt-validation_request_validation', 'cgpt-validation_get_approval'].includes(content.name) ||
      content.executed !== false || content.state.status !== 'error' ||
      !record(content.state.error) || content.state.error.type !== 'tool.execution' ||
      typeof content.state.error.message !== 'string' || !/^call_[A-Za-z0-9_-]{1,200}$/.test(content.id) ||
      !record(content.native) || content.native.itemId !== 'fc_' + content.id.slice(5)) return null;
  const time = content.time;
  if (!record(time) || ['created', 'ran', 'completed'].some(key => !Number.isSafeInteger(time[key]) || time[key] <= 0) ||
      time.created > time.ran || time.ran > time.completed) return null;
  return { itemId: content.native.itemId, envelopeHash: createHash('sha256').update(canonical(content)).digest('hex') };
}

function normalizeMessage(message, sessionId) {
  if (!record(message) || typeof message.id !== 'string' || typeof message.type !== 'string') fail('opencode-message-invalid');
  const model = record(message.model) ? { providerID: message.model.providerID, modelID: message.model.id,
    ...(typeof message.model.variant === 'string' ? { variant: message.model.variant } : {}) } : undefined;
  const metadata = record(message.metadata) ? { ...message.metadata } : {};
  for (const key of ['tools', 'tokens', 'cost', 'usage', 'usageSource']) delete metadata[key];
  const normalized = { info: { ...metadata, id: message.id,
    ...nativeUsage(message), sessionID: sessionId, role: message.type, nativeSingleExchange: false, parentID: message.metadata?.parentID,
    time: message.time, providerID: model?.providerID, modelID: model?.modelID,
    ...(model ? { model, variant: model.variant } : {}),
    ...(typeof message.finish === 'string' ? { finish: message.finish } : {}),
    ...(message.error ? { error: message.error } : {}) }, parts: [] };
  if (message.type === 'user') {
    if (typeof message.text === 'string') normalized.parts.push({ type: 'text', text: message.text });
    return normalized;
  }
  if (message.type !== 'assistant') return normalized;
  if (!Array.isArray(message.content)) fail('opencode-message-invalid');
  for (const content of message.content) {
    if (!record(content)) fail('opencode-message-invalid');
    if (content.type === 'text' || content.type === 'reasoning') {
      normalized.parts.push({ type: content.type, text: content.text });
      continue;
    }
    if (content.type !== 'tool' || typeof content.name !== 'string' || !record(content.state)) {
      fail('opencode-message-invalid');
    }
    const state = content.state;
    const output = Array.isArray(state.content) ? state.content.filter((part) => part?.type === 'text')
      .map((part) => part.text).join('\n') : '';
    const error = typeof state.error === 'string' ? state.error : record(state.error) && typeof state.error.message === 'string'
      ? state.error.message : undefined;
    const nativeMetadata = record(state.metadata) ? { ...state.metadata } : state.metadata;
    if (record(nativeMetadata)) { delete nativeMetadata.cabCodeMode; delete nativeMetadata.cabDirectMcpError; }
    const directError = directMcpError(content);
    if (content.executed !== undefined && typeof content.executed !== 'boolean') fail('opencode-message-invalid');
    const part = { type: 'tool', id: content.id, tool: content.name === 'shell' ? 'bash' : content.name, callID: content.id, executed: content.executed,
      ...((content.name === 'shell' || ['write', 'edit'].includes(content.name) && content.executed === false)
        ? { nativeFormat: 'opencode-v2', nativeTool: content.name } : {}),
      state: { status: state.status, input: state.input, output, error,
        metadata: directError ? { ...nativeMetadata, cabDirectMcpError: directError } : nativeMetadata, time: { start: content.time?.ran ?? content.time?.created,
          end: content.time?.completed } } };
    normalized.parts.push(content.name === 'execute' ? codeModePart(content, part) || part : part);
  }
  return normalized;
}

export function normalizeOpenCodeEvent(envelope) {
  if (!record(envelope)) return null;
  const event = record(envelope.payload) ? envelope.payload : envelope;
  if (typeof event.type !== 'string') return null;
  const properties = event.data !== undefined ? event.data : event.properties ?? {};
  if (!record(properties)) return null;
  if (event.data !== undefined && event.properties !== undefined && canonical(event.data) !== canonical(event.properties)) return null;
  const directories = [envelope.directory, event.directory, envelope.location?.directory,
    event.location?.directory, properties.directory, properties.info?.directory].filter(value => value !== undefined);
  if (directories.some(value => typeof value !== 'string' || !value || value !== directories[0])) return null;
  const session = properties.sessionID || properties.sessionId || properties.part?.sessionID || properties.info?.sessionID;
  if (event.durable?.aggregateID !== undefined && session && event.durable.aggregateID !== session) return null;
  return { type: event.type, properties, ...(directories.length ? { directory: directories[0] } : {}) };
}

export function createOpenCodeV2Client({ baseUrl, directory, username, passwordFile, fetchImpl = fetch, timeoutMs = 10000, signal }) {
  const origin = loopbackUrl(baseUrl);
  const user = username || 'opencode';
  const credentialPath = passwordFile || (process.env.CREDENTIALS_DIRECTORY
    ? join(process.env.CREDENTIALS_DIRECTORY, 'opencode.password')
    : join(homedir(), '.config/cab-approval-bridge/opencode.password'));
  if (user !== 'opencode') fail('opencode-username-invalid');
  let infoPromise;
  let infoCheckedAt = 0;
  let infoInFlight = false;

  async function authorization() {
    const password = await readPassword(credentialPath);
    return `Basic ${Buffer.from(`${user}:${password}`, 'utf8').toString('base64')}`;
  }

  async function request(path, { method = 'GET', query = {}, body, accept = 'application/json', timeout = timeoutMs,
    maxResponseBytes = RESPONSE_LIMIT, scoped = true } = {}, schemaRead = false) {
    if (!Number.isSafeInteger(maxResponseBytes) || maxResponseBytes <= 0) fail('opencode-response-limit-invalid');
    if (typeof path !== 'string' || (!path.startsWith('/api/') &&
        !(schemaRead && method === 'GET' && path === '/openapi.json')) || path.startsWith('//') || path.includes('..')) {
      fail('opencode-v2-route-invalid');
    }
    const url = new URL(path, origin);
    if (url.origin !== origin) fail('opencode-v2-route-invalid');
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
    const headers = { accept, authorization: await authorization() };
    const locationDirectory = query.directory ?? directory;
    if (scoped && locationDirectory !== undefined) {
      if (typeof locationDirectory !== 'string' || !isAbsolute(locationDirectory)) fail('opencode-location-invalid');
      headers['x-opencode-directory'] = locationDirectory;
    }
    if (body !== undefined) headers['content-type'] = 'application/json';
    let response;
    try {
      response = await fetchImpl(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body),
        redirect: 'error', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout) });
    } catch (cause) {
      throw Object.assign(new Error('opencode-unavailable'), { code: 'opencode-unavailable', cause });
    }
    if (response.status === 401) { await response.body?.cancel(); fail('opencode-auth-required'); }
    if (response.status === 204) return { status: 204, data: null };
    const type = response.headers.get('content-type') || '';
    if (!type.toLowerCase().includes('application/json')) {
      await response.body?.cancel();
      fail('opencode-v2-response-invalid');
    }
    const text = await readResponse(response, maxResponseBytes);
    let payload;
    try { payload = JSON.parse(text); } catch { fail('opencode-v2-response-invalid'); }
    if (!response.ok) fail(`opencode-http-${response.status}`);
    return { status: response.status, data: payload };
  }

  async function info(force = false) {
    if (infoInFlight || (!force && infoPromise && (!infoCheckedAt || Date.now() - infoCheckedAt < 10000))) return infoPromise;
    infoInFlight = true;
    infoPromise = request('/api/info', { scoped: false }).then(({ data }) => {
      if (!record(data) || typeof data.version !== 'string' || !/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(data.version) ||
          !data.version.startsWith('2.') || !Number.isSafeInteger(data.pid) || data.pid <= 0 || !Array.isArray(data.urls) || !record(data.paths)) {
        fail('opencode-v2-required');
      }
      infoCheckedAt = Date.now();
      return data;
    }).catch((cause) => {
      infoPromise = undefined;
      if (cause.code === 'opencode-v2-response-invalid' || cause.code === 'opencode-http-404') {
        fail('opencode-v2-required');
      }
      throw cause;
    }).finally(() => { infoInFlight = false; });
    return infoPromise;
  }

  async function json(path, options) {
    await info();
    return (await request(path, options)).data;
  }

  async function location(directoryValue = directory) {
    if (typeof directoryValue !== 'string' || !isAbsolute(directoryValue)) fail('opencode-location-invalid');
    const value = await json('/api/location', { query: { directory: directoryValue } });
    if (!record(value) || (value.directory && value.directory !== directoryValue)) fail('opencode-location-divergent');
    return value;
  }

  let sharedMcp;
  async function mcpLocation() {
    const server = await info(true);
    const { data } = await request('/api/location', { scoped: false });
    if (!record(data) || typeof data.directory !== 'string' || !isAbsolute(data.directory)) fail('opencode-location-invalid');
    if (sharedMcp?.pid === server.pid && sharedMcp.directory !== data.directory) fail('opencode-mcp-location-changed');
    sharedMcp = { pid: server.pid, directory: data.directory };
    return data.directory;
  }

  async function mcpTarget(explicitDirectory) {
    const target = await mcpLocation();
    if (explicitDirectory !== undefined && explicitDirectory !== target) fail('opencode-mcp-location-override-refused');
    return target;
  }

  async function mcp(explicitDirectory) {
    const directoryValue = await mcpTarget(explicitDirectory);
    const response = await json('/api/mcp', { query: { directory: directoryValue } });
    if (!record(response) || !record(response.location) || response.location.directory !== directoryValue || !Array.isArray(response.data)) {
      fail('opencode-mcp-invalid');
    }
    const servers = {};
    for (const server of response.data) {
      if (!record(server) || typeof server.name !== 'string' || !record(server.status) ||
          !['connected', 'pending', 'disabled', 'failed', 'needs_auth'].includes(server.status.status)) {
        fail('opencode-mcp-invalid');
      }
      servers[server.name] = { ...server, status: server.status.status };
    }
    return servers;
  }

  async function listSessions(directoryValue = directory) {
    if (typeof directoryValue !== 'string' || !isAbsolute(directoryValue)) fail('opencode-location-invalid');
    const result = [];
    let cursor;
    const seen = new Set();
    for (let page = 0; page < 100; page++) {
      const response = await json('/api/session', { query: { directory: directoryValue, order: cursor === undefined ? 'asc' : undefined, limit: '200', cursor } });
      if (!record(response) || !Array.isArray(response.data) || !record(response.cursor)) fail('opencode-sessions-invalid');
      result.push(...response.data.map(normalizeSession));
      const next = response.cursor.next;
      if (next === null) return result;
      if (typeof next !== 'string' || !next || seen.has(next)) fail('opencode-sessions-pagination-invalid');
      seen.add(next);
      cursor = next;
    }
    fail('opencode-sessions-pagination-limit');
  }

  async function session(sessionId, directoryValue = directory) {
    if (typeof sessionId !== 'string' || !sessionId) fail('opencode-session-id-invalid');
    const response = await json(`/api/session/${encodeURIComponent(sessionId)}`);
    const value = unwrapData(response, 'opencode-session-invalid');
    const normalized = normalizeSession(value);
    if (normalized.id !== sessionId || normalized.directory !== directoryValue) fail('opencode-session-divergent');
    return normalized;
  }

  async function activeSessions() {
    const response = await json('/api/session/active');
    const value = unwrapData(response, 'opencode-session-status-invalid');
    if (!record(value) || Object.entries(value).some(([sessionId, status]) =>
      !/^ses_[A-Za-z0-9_.-]{1,100}$/.test(sessionId) || !record(status) || status.type !== 'running')) {
      fail('opencode-session-status-invalid');
    }
    return Object.fromEntries(Object.keys(value).map((sessionId) => [sessionId, { type: 'busy' }]));
  }

  async function sessionStatus(directoryValue = directory) {
    if (typeof directoryValue !== 'string' || !isAbsolute(directoryValue)) fail('opencode-location-invalid');
    return activeSessions();
  }

  async function messages(sessionId, directoryValue = directory) {
    const result = [];
    let cursor;
    let pageSize = 200;
    const seen = new Set();
    for (let page = 0; page < 100; page++) {
      let response;
      for (;;) {
        try {
          response = await json(`/api/session/${encodeURIComponent(sessionId)}/message`,
            { query: { order: cursor === undefined ? 'asc' : undefined, limit: String(pageSize), cursor } });
          break;
        } catch (cause) {
          if (cause.code !== 'opencode-response-too-large' || pageSize === 1) throw cause;
          pageSize = Math.max(1, Math.floor(pageSize / 2));
        }
      }
      if (!record(response) || !Array.isArray(response.data) || !record(response.cursor)) fail('opencode-messages-invalid');
      result.push(...response.data.map((item) => normalizeMessage(item, sessionId)));
      const next = response.cursor.next;
      if (next === null) {
        let previousUser = null;
        for (const item of result) {
          if (item.info.role === 'user') previousUser = item.info.id;
          else if (item.info.role === 'assistant' && !item.info.parentID && previousUser) item.info.parentID = previousUser;
        }
        const users = result.filter(item => item.info.role === 'user');
        const assistants = result.filter(item => item.info.role === 'assistant');
        // Cette provenance vient du transcript complet, jamais de metadata envoyées par un client.
        if (users.length === 1 && assistants.length === 1 &&
            result.indexOf(users[0]) < result.indexOf(assistants[0]) &&
            assistants[0].info.parentID === users[0].info.id) {
          assistants[0].info.nativeSingleExchange = true;
        }
        return result;
      }
      if (typeof next !== 'string' || !next || seen.has(next)) fail('opencode-messages-pagination-invalid');
      seen.add(next);
      cursor = next;
    }
    fail('opencode-messages-pagination-limit');
  }

  async function permissions(directoryValue = directory, { sessionIds, verifyInputs = false } = {}) {
    if (typeof verifyInputs !== 'boolean') fail('opencode-permission-scope-invalid');
    if (sessionIds !== undefined && (!Array.isArray(sessionIds) || !sessionIds.length ||
        sessionIds.some(id => typeof id !== 'string' || !id.trim()))) fail('opencode-permission-scope-invalid');
    const response = await json('/api/permission/request', { query: { directory: directoryValue } });
    if (!record(response) || !record(response.location) || response.location.directory !== directoryValue || !Array.isArray(response.data)) {
      fail('opencode-permissions-invalid');
    }
    const selected = response.data.filter(raw => {
      if (!record(raw) || typeof raw.sessionID !== 'string' || !raw.sessionID.trim()) fail('opencode-permission-invalid');
      return sessionIds === undefined || sessionIds.includes(raw.sessionID);
    });
    return Promise.all(selected.map(async raw => {
      const permission = normalizePermission(raw);
      if (raw.action !== 'shell' && !(raw.action === 'edit' && raw.resources.length === 1 &&
          (!isAbsolute(raw.resources[0]) || verifyInputs && raw.source?.type === 'tool'))) return permission;
      if (raw.source?.type !== 'tool' || typeof raw.source.id !== 'string' || typeof raw.source.messageID !== 'string') {
        fail('opencode-permission-source-invalid');
      }
      const envelope = await json(`/api/session/${encodeURIComponent(raw.sessionID)}/message/${encodeURIComponent(raw.source.messageID)}`);
      const source = normalizeMessage(unwrapData(envelope, 'opencode-message-invalid'), raw.sessionID);
      if (source.info.id !== raw.source.messageID) fail('opencode-permission-source-invalid');
      const matches = source.parts.filter(p => p.type === 'tool' && p.callID === raw.source.id);
      if (matches.length !== 1) fail('opencode-permission-source-invalid');
      const part = matches[0], input = part.state.input;
      if (!record(input) || !['running', 'completed'].includes(part.state.status)) fail('opencode-permission-source-invalid');
      if (raw.action === 'shell') {
        if (part.nativeTool !== 'shell' || raw.resources.length !== 1 || raw.resources[0] !== input.command ||
            input.background === true || (input.workdir !== undefined &&
              (typeof input.workdir !== 'string' || resolve(directoryValue, input.workdir) !== directoryValue))) {
          fail('opencode-permission-target-invalid');
        }
        permission.metadata.command = input.command;
      } else {
        const file = input.path ?? input.filePath ?? input.filepath;
        const target = typeof file === 'string' ? resolve(directoryValue, file) : '';
        if (!['edit', 'write'].includes(part.nativeTool) || !target.startsWith(directoryValue + '/') ||
            resolve(directoryValue, raw.resources[0]) !== target) fail('opencode-permission-target-invalid');
        permission.metadata.filepath = target;
        permission.metadata.nativeToolInputSha256 = nativeToolInputDigest(input);
      }
      permission.metadata.nativeSourceVerified = true;
      return permission;
    }));
  }

  async function providerList(directoryValue = directory, maxBytes = RESPONSE_LIMIT) {
    if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) fail('model-selection-input-invalid');
    let response;
    try { response = await json('/api/provider', { query: { directory: directoryValue }, maxResponseBytes: maxBytes }); }
    catch (cause) {
      if (cause.code === 'opencode-response-too-large') fail('model-observation-too-large');
      throw cause;
    }
    if (!record(response) || !record(response.location) || response.location.directory !== directoryValue || !Array.isArray(response.data)) {
      fail('opencode-providers-invalid');
    }
    const models = await modelList(directoryValue);
    const all = response.data.map((provider) => {
      if (!record(provider) || typeof provider.id !== 'string' || !['auto', 'enabled', 'disabled'].includes(provider.activation)) {
        fail('opencode-providers-invalid');
      }
      const byModel = Object.fromEntries(models.filter((model) => model.providerID === provider.id && model.enabled !== false).map((model) => {
        if (typeof model.modelID !== 'string' || !Array.isArray(model.variants)) fail('opencode-models-invalid');
        return [model.modelID, { variants: Object.fromEntries(model.variants.map((variant) => {
          if (!record(variant) || typeof variant.id !== 'string') fail('opencode-models-invalid');
          return [variant.id, variant];
        })) }];
      }));
      return { ...provider, models: byModel };
    });
    return { all, connected: all.filter((provider) => provider.activation !== 'disabled').map((provider) => provider.id) };
  }

  async function modelList(directoryValue = directory) {
    const response = await json('/api/model', { query: { directory: directoryValue } });
    if (!record(response) || !record(response.location) || response.location.directory !== directoryValue || !Array.isArray(response.data)) {
      fail('opencode-models-invalid');
    }
    return response.data;
  }

  async function message(sessionId, messageId, directoryValue = directory) {
    const messagesForSession = await messages(sessionId, directoryValue);
    const match = messagesForSession.find((item) => item.info.id === messageId);
    if (!match) fail('opencode-message-unavailable');
    return match;
  }

  async function createSession({ directory: directoryValue = directory, id, title, agent, model, permissions: permissionRules } = {}) {
    if (typeof directoryValue !== 'string' || !isAbsolute(directoryValue)) fail('opencode-location-invalid');
    const modelValue = model ? modelReference(model) : undefined;
    const locationValue = await location(directoryValue);
    const permissions = permissionRules?.map((rule) => {
      if (!record(rule) || typeof rule.permission !== 'string' || typeof rule.pattern !== 'string' ||
          !['allow', 'deny', 'ask'].includes(rule.action)) fail('opencode-permissions-invalid');
      return { action: rule.permission, resource: rule.pattern, effect: rule.action };
    });
    const body = { location: { directory: locationValue.directory }, ...(id ? { id } : {}), ...(title ? { title } : {}),
      ...(agent ? { agent } : {}), ...(model ? { model: modelValue } : {}), ...(permissions ? { permissions } : {}) };
    const response = await request('/api/session', { method: 'POST', query: { directory: directoryValue }, body });
    const sessionValue = normalizeSession(unwrapData(response.data, 'opencode-session-invalid'));
    if (sessionValue.directory !== directoryValue) fail('opencode-session-divergent');
    return sessionValue;
  }

  async function createProbeSession(options = {}) {
    if (!record(options) || Object.keys(options).some((key) => !['title','model'].includes(key)) ||
        (options.title !== undefined && (typeof options.title !== 'string' || !options.title.trim()))) {
      fail('opencode-probe-options-invalid');
    }
    modelReference(options.model);
    const directoryValue = await mcpLocation();
    const expectedServer = { ...sharedMcp };
    if ((await mcp())['cgpt-validation']?.status !== 'connected') fail('opencode-probe-mcp-not-ready');
    if (sharedMcp.pid !== expectedServer.pid || sharedMcp.directory !== expectedServer.directory) fail('opencode-probe-server-changed');
    return createSession({ directory: directoryValue, title: options.title || 'CAB model probe', model: options.model,
      permissions: [{ permission: '*', pattern: '*', action: 'deny' }] });
  }

  async function prompt(sessionId, text, { directory: directoryValue = directory, model, resume = true } = {}) {
    if (typeof text !== 'string' || !text || typeof resume !== 'boolean') fail('opencode-prompt-invalid');
    if (model !== undefined) modelReference(model);
    await info();
    const body = { text, resume };
    if (model !== undefined) {
      await switchModel(sessionId, model, directoryValue);
    }
    const response = await request(`/api/session/${encodeURIComponent(sessionId)}/prompt`, { method: 'POST', body });
    const value = unwrapData(response.data, 'opencode-prompt-invalid');
    if (!record(value) || typeof value.id !== 'string') fail('opencode-prompt-invalid');
    return value;
  }

  async function switchModel(sessionId, model, directoryValue = directory) {
    if (typeof directoryValue !== 'string' || !isAbsolute(directoryValue)) fail('opencode-location-invalid');
    const modelValue = modelReference(model);
    await info();
    return request(`/api/session/${encodeURIComponent(sessionId)}/model`, { method: 'POST',
      body: { model: modelValue } });
  }

  async function providerKeyContract() {
    const server = await info(true);
    const { data: schema } = await request('/openapi.json', { scoped: false, maxResponseBytes: 16 * 1024 * 1024 }, true);
    const connect = schema?.paths?.['/api/integration/{integrationID}/connect/key']?.post;
    const read = schema?.paths?.['/api/integration/{integrationID}']?.get;
    if (connect?.operationId !== 'integration.connect.key' ||
        connect.requestBody?.content?.['application/json']?.schema?.properties?.key?.type !== 'string' ||
        !Object.hasOwn(connect.responses || {}, '204') || read?.operationId !== 'integration.get') {
      fail('opencode-provider-contract-unavailable');
    }
    return { version: server.version, pid: server.pid,
      schemaDigest: createHash('sha256').update(JSON.stringify(schema)).digest('hex'),
      operation: connect.operationId, credentialStorage: 'native', scope: 'shared' };
  }

  async function integrationConnection(integrationID) {
    if (typeof integrationID !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(integrationID)) {
      fail('opencode-integration-invalid');
    }
    if (await mcpLocation() !== directory) fail('opencode-provider-location-divergent');
    await location(directory);
    await json('/api/integration');
    const response = await json(`/api/integration/${encodeURIComponent(integrationID)}`);
    const value = unwrapData(response, 'opencode-integration-invalid');
    if (value.id !== integrationID || !Array.isArray(value.connections) || !Array.isArray(value.methods)) {
      fail('opencode-integration-invalid');
    }
    const active = value.connections[0];
    if (active && (typeof active.id !== 'string' && active.type === 'credential')) fail('opencode-integration-invalid');
    return { integrationID, keySupported: value.methods.some(method => method.type === 'key'),
      active: active ? { type: active.type, id: active.id || null, method: active.method || null,
        label: typeof active.label === 'string' ? active.label : null } : null };
  }

  async function connectProviderKey(integrationID, { secretSource, assertBoundary, transactionId, expectedPid } = {}) {
    if (typeof secretSource !== 'function' || typeof assertBoundary !== 'function' ||
        !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(transactionId || '') || !Number.isSafeInteger(expectedPid)) {
      fail('opencode-provider-input-invalid');
    }
    let effectPossible = false, key, source, stage = 'contract';
    try {
      const contract = await providerKeyContract();
      if (contract.pid !== expectedPid) fail('opencode-provider-server-changed');
      stage = 'integration';
      const previous = await integrationConnection(integrationID);
      if (!previous.keySupported) fail('opencode-provider-key-unsupported');
      const boundary = async () => {
        await assertBoundary();
        if ((await info(true)).pid !== expectedPid) fail('opencode-provider-server-changed');
        if (Object.keys(await activeSessions()).length || (await permissions(directory)).length) {
          fail('opencode-provider-not-quiescent');
        }
      };
      stage = 'boundary';
      await boundary();
      stage = 'secret';
      source = await secretSource();
      const bytes = Buffer.isBuffer(source) ? source : typeof source === 'string' ? Buffer.from(source) : null;
      if (!bytes || !bytes.length || bytes.length > CREDENTIAL_LIMIT) fail('opencode-provider-secret-invalid');
      key = bytes.toString('utf8');
      if (!Buffer.from(key).equals(bytes)) fail('opencode-provider-secret-invalid');
      if (key.endsWith('\n')) key = key.slice(0, -1);
      if (!key || /[\r\n\0]/.test(key)) fail('opencode-provider-secret-invalid');
      stage = 'boundary';
      await boundary();
      effectPossible = true;
      stage = 'post';
      const response = await request(`/api/integration/${encodeURIComponent(integrationID)}/connect/key`,
        { method: 'POST', body: { key, label: `CAB-${transactionId}` } });
      if (response.status !== 204) fail('opencode-provider-connection-unconfirmed');
      stage = 'confirmation';
      const active = (await integrationConnection(integrationID)).active;
      if ((await info(true)).pid !== expectedPid || active?.type !== 'credential' || active.method !== 'key' ||
          active.label !== `CAB-${transactionId}` || !active.id || active.id === previous.active?.id) {
        fail('opencode-provider-connection-unconfirmed');
      }
      return { status: 'connected', transactionId, integrationID, credentialId: active.id,
        serverPid: expectedPid, serverVersion: contract.version, schemaDigest: contract.schemaDigest,
        requiresPreflight: true };
    } catch (cause) {
      const allowed = ['opencode-provider-input-invalid','opencode-provider-contract-unavailable',
        'opencode-provider-server-changed','opencode-provider-key-unsupported','opencode-provider-not-quiescent',
        'opencode-provider-secret-invalid','opencode-provider-connection-unconfirmed','opencode-integration-invalid',
        'opencode-auth-required','opencode-session-status-invalid','opencode-permissions-invalid',
        'opencode-v2-response-invalid','opencode-provider-location-divergent','provider-cohort-not-quiescent','provider-cohort-changed'];
      const code = allowed.includes(cause?.code) || /^opencode-http-[45][0-9]{2}$/.test(cause?.code || '')
        ? cause.code : 'opencode-provider-connect-failed';
      throw Object.assign(new Error(code), { code, effectPossible, stage });
    } finally {
      key = null;
      if (Buffer.isBuffer(source)) source.fill(0);
      source = null;
    }
  }

  async function replyPermission(sessionId, permissionId, decision, directoryValue = directory) {
    if (typeof directoryValue !== 'string' || !isAbsolute(directoryValue)) fail('opencode-location-invalid');
    if (decision !== 'once' && decision !== 'always' && decision !== 'reject') fail('opencode-permission-decision-invalid');
    await info();
    const response = await request(`/api/session/${encodeURIComponent(sessionId)}/permission/${encodeURIComponent(permissionId)}/reply`,
      { method: 'POST', body: { decision } });
    if (response.status !== 204) fail('opencode-permission-reply-invalid');
  }

  async function connectMcp(serverId, explicitDirectory) {
    if (typeof serverId !== 'string' || !/^[A-Za-z0-9_.-]{1,100}$/.test(serverId)) fail('opencode-mcp-id-invalid');
    const directoryValue = await mcpTarget(explicitDirectory);
    return request(`/api/experimental/mcp/${encodeURIComponent(serverId)}/connect`,
      { method: 'POST', query: { directory: directoryValue } });
  }

  async function disconnectMcp(serverId, explicitDirectory) {
    if (typeof serverId !== 'string' || !/^[A-Za-z0-9_.-]{1,100}$/.test(serverId)) fail('opencode-mcp-id-invalid');
    const directoryValue = await mcpTarget(explicitDirectory);
    return request(`/api/experimental/mcp/${encodeURIComponent(serverId)}/disconnect`,
      { method: 'POST', query: { directory: directoryValue } });
  }

  async function events() {
    await info();
    const headers = { accept: 'text/event-stream', authorization: await authorization(),
      ...(directory ? { 'x-opencode-directory': directory } : {}) };
    let response;
    try { response = await fetchImpl(new URL('/api/event', origin), { headers, redirect: 'error', signal }); }
    catch (cause) { throw Object.assign(new Error('opencode-event-unavailable'), { code: 'opencode-event-unavailable', cause }); }
    if (response.status === 401) { await response.body?.cancel(); fail('opencode-auth-required'); }
    if (!response.ok || !response.body || !(response.headers.get('content-type') || '').toLowerCase().includes('text/event-stream')) {
      await response.body?.cancel(); fail('opencode-event-invalid');
    }
    return response;
  }

  return Object.freeze({ info, location, mcp, listSessions, session, activeSessions, sessionStatus, messages, message, permissions,
    providerList, modelList, createSession, createProbeSession, sharedMcpDirectory: mcpLocation, prompt, switchModel,
    providerKeyContract, integrationConnection, connectProviderKey,
    replyPermission, connectMcp, disconnectMcp, events, request: json });
}

export function createOpenCodeV2ClientFromEnv({ directory, baseUrl, fetchImpl = fetch, signal } = {}) {
  return createOpenCodeV2Client({
    baseUrl: baseUrl || envValue('OC_Codex_OPENCODE_URL') || 'http://127.0.0.1:4096',
    directory,
    passwordFile: envValue('OC_Codex_OPENCODE_PASSWORD_FILE'),
    fetchImpl, signal,
  });
}
