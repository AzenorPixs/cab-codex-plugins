import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

export const VERSION = '2.1.4';
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
      typeof permission.action !== 'string' || !Array.isArray(permission.resources)) {
    fail('opencode-permission-invalid');
  }
  const metadata = record(permission.metadata) ? { ...permission.metadata } : {};
  if (permission.action === 'edit' && typeof metadata.filepath !== 'string' && permission.resources.length === 1) {
    metadata.filepath = permission.resources[0];
  }
  if (permission.action === 'bash' && typeof metadata.command !== 'string' && permission.resources.length === 1) {
    metadata.command = permission.resources[0];
  }
  return { id: permission.id, sessionID: permission.sessionID, permission: permission.action, metadata,
    source: permission.source, message: permission.message,
    ...(record(permission.source) && permission.source.type === 'tool' && typeof permission.source.id === 'string'
      ? { tool: { callID: permission.source.id } } : {}) };
}

function normalizeMessage(message, sessionId) {
  if (!record(message) || typeof message.id !== 'string' || typeof message.type !== 'string') fail('opencode-message-invalid');
  const model = record(message.model) ? { providerID: message.model.providerID, modelID: message.model.id,
    ...(typeof message.model.variant === 'string' ? { variant: message.model.variant } : {}) } : undefined;
  const metadata = record(message.metadata) ? { ...message.metadata } : {};
  delete metadata.tools;
  const normalized = { info: { ...metadata, id: message.id,
    sessionID: sessionId, role: message.type, parentID: message.metadata?.parentID,
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
    if (content.executed !== undefined && typeof content.executed !== 'boolean') fail('opencode-message-invalid');
    normalized.parts.push({ type: 'tool', id: content.id, tool: content.name, callID: content.id, executed: content.executed,
      state: { status: state.status, input: state.input, output, error,
        metadata: state.metadata, time: { start: content.time?.ran ?? content.time?.created,
          end: content.time?.completed } } });
  }
  return normalized;
}

export function createOpenCodeV2Client({ baseUrl, directory, username, passwordFile, fetchImpl = fetch, timeoutMs = 10000 }) {
  const origin = loopbackUrl(baseUrl);
  const user = username || 'opencode';
  const credentialPath = passwordFile || (process.env.CREDENTIALS_DIRECTORY
    ? join(process.env.CREDENTIALS_DIRECTORY, 'opencode.password')
    : join(homedir(), '.config/cab-approval-bridge/opencode.password'));
  if (user !== 'opencode') fail('opencode-username-invalid');
  let infoPromise;
  let infoCheckedAt = 0;

  async function authorization() {
    const password = await readPassword(credentialPath);
    return `Basic ${Buffer.from(`${user}:${password}`, 'utf8').toString('base64')}`;
  }

  async function request(path, { method = 'GET', query = {}, body, accept = 'application/json', timeout = timeoutMs,
    maxResponseBytes = RESPONSE_LIMIT, scoped = true } = {}) {
    if (!Number.isSafeInteger(maxResponseBytes) || maxResponseBytes <= 0) fail('opencode-response-limit-invalid');
    if (typeof path !== 'string' || !path.startsWith('/api/') || path.startsWith('//') || path.includes('..')) {
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
        redirect: 'error', signal: AbortSignal.timeout(timeout) });
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
    if (!force && infoPromise && (!infoCheckedAt || Date.now() - infoCheckedAt < 10000)) return infoPromise;
    infoPromise = request('/api/info').then(({ data }) => {
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
    });
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
    const server = await info();
    if (sharedMcp?.pid === server.pid) return sharedMcp.directory;
    const { data } = await request('/api/location', { scoped: false });
    if (!record(data) || typeof data.directory !== 'string' || !isAbsolute(data.directory)) fail('opencode-location-invalid');
    sharedMcp = { pid: server.pid, directory: data.directory };
    return data.directory;
  }

  async function mcp(directoryValue = directory) {
    directoryValue = await mcpLocation();
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
      const response = await json('/api/session', { query: { directory: directoryValue, order: 'asc', limit: '200', cursor } });
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
    const seen = new Set();
    for (let page = 0; page < 100; page++) {
      const response = await json(`/api/session/${encodeURIComponent(sessionId)}/message`,
        { query: { order: 'asc', limit: '200', cursor } });
      if (!record(response) || !Array.isArray(response.data) || !record(response.cursor)) fail('opencode-messages-invalid');
      result.push(...response.data.map((item) => normalizeMessage(item, sessionId)));
      const next = response.cursor.next;
      if (next === null) {
        let previousUser = null;
        for (const item of result) {
          if (item.info.role === 'user') previousUser = item.info.id;
          else if (item.info.role === 'assistant' && !item.info.parentID && previousUser) item.info.parentID = previousUser;
        }
        return result;
      }
      if (typeof next !== 'string' || !next || seen.has(next)) fail('opencode-messages-pagination-invalid');
      seen.add(next);
      cursor = next;
    }
    fail('opencode-messages-pagination-limit');
  }

  async function permissions(directoryValue = directory) {
    const response = await json('/api/permission/request', { query: { directory: directoryValue } });
    if (!record(response) || !record(response.location) || response.location.directory !== directoryValue || !Array.isArray(response.data)) {
      fail('opencode-permissions-invalid');
    }
    return response.data.map(normalizePermission);
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
    const locationValue = await location(directoryValue);
    const permissions = permissionRules?.map((rule) => {
      if (!record(rule) || typeof rule.permission !== 'string' || typeof rule.pattern !== 'string' ||
          !['allow', 'deny', 'ask'].includes(rule.action)) fail('opencode-permissions-invalid');
      return { action: rule.permission, resource: rule.pattern, effect: rule.action };
    });
    const body = { location: { directory: locationValue.directory }, ...(id ? { id } : {}), ...(title ? { title } : {}),
      ...(agent ? { agent } : {}), ...(model ? { model: modelReference(model) } : {}), ...(permissions ? { permissions } : {}) };
    const response = await request('/api/session', { method: 'POST', body });
    const sessionValue = normalizeSession(unwrapData(response.data, 'opencode-session-invalid'));
    if (sessionValue.directory !== directoryValue) fail('opencode-session-divergent');
    return sessionValue;
  }

  async function prompt(sessionId, text, { directory: directoryValue = directory, model, resume = true } = {}) {
    if (typeof text !== 'string' || !text || typeof resume !== 'boolean') fail('opencode-prompt-invalid');
    await info();
    const body = { text, resume };
    if (model !== undefined) {
      if (!record(model) || typeof model.providerID !== 'string' || typeof model.modelID !== 'string') fail('opencode-model-invalid');
      await switchModel(sessionId, model, directoryValue);
    }
    const response = await request(`/api/session/${encodeURIComponent(sessionId)}/prompt`, { method: 'POST', body });
    const value = unwrapData(response.data, 'opencode-prompt-invalid');
    if (!record(value) || typeof value.id !== 'string') fail('opencode-prompt-invalid');
    return value;
  }

  async function switchModel(sessionId, model, directoryValue = directory) {
    if (typeof directoryValue !== 'string' || !isAbsolute(directoryValue)) fail('opencode-location-invalid');
    await info();
    return request(`/api/session/${encodeURIComponent(sessionId)}/model`, { method: 'POST',
      body: { model: modelReference(model) } });
  }

  async function replyPermission(sessionId, permissionId, decision, directoryValue = directory) {
    if (typeof directoryValue !== 'string' || !isAbsolute(directoryValue)) fail('opencode-location-invalid');
    if (decision !== 'once' && decision !== 'always' && decision !== 'reject') fail('opencode-permission-decision-invalid');
    await info();
    const response = await request(`/api/session/${encodeURIComponent(sessionId)}/permission/${encodeURIComponent(permissionId)}/reply`,
      { method: 'POST', body: { decision } });
    if (response.status !== 204) fail('opencode-permission-reply-invalid');
  }

  async function connectMcp(serverId, directoryValue = directory) {
    if (typeof serverId !== 'string' || !/^[A-Za-z0-9_.-]{1,100}$/.test(serverId)) fail('opencode-mcp-id-invalid');
    directoryValue = await mcpLocation();
    return request(`/api/experimental/mcp/${encodeURIComponent(serverId)}/connect`,
      { method: 'POST', query: { directory: directoryValue } });
  }

  async function disconnectMcp(serverId, directoryValue = directory) {
    if (typeof serverId !== 'string' || !/^[A-Za-z0-9_.-]{1,100}$/.test(serverId)) fail('opencode-mcp-id-invalid');
    directoryValue = await mcpLocation();
    return request(`/api/experimental/mcp/${encodeURIComponent(serverId)}/disconnect`,
      { method: 'POST', query: { directory: directoryValue } });
  }

  async function events() {
    await info();
    const headers = { accept: 'text/event-stream', authorization: await authorization(),
      ...(directory ? { 'x-opencode-directory': directory } : {}) };
    let response;
    try { response = await fetchImpl(new URL('/api/event', origin), { headers, redirect: 'error' }); }
    catch (cause) { throw Object.assign(new Error('opencode-event-unavailable'), { code: 'opencode-event-unavailable', cause }); }
    if (response.status === 401) { await response.body?.cancel(); fail('opencode-auth-required'); }
    if (!response.ok || !response.body || !(response.headers.get('content-type') || '').toLowerCase().includes('text/event-stream')) {
      await response.body?.cancel(); fail('opencode-event-invalid');
    }
    return response;
  }

  return Object.freeze({ info, location, mcp, listSessions, session, activeSessions, sessionStatus, messages, message, permissions,
    providerList, modelList, createSession, prompt, switchModel, replyPermission, connectMcp, disconnectMcp, events, request: json });
}

export function createOpenCodeV2ClientFromEnv({ directory, baseUrl, fetchImpl = fetch } = {}) {
  return createOpenCodeV2Client({
    baseUrl: baseUrl || envValue('OC_Codex_OPENCODE_URL') || 'http://127.0.0.1:4096',
    directory,
    passwordFile: envValue('OC_Codex_OPENCODE_PASSWORD_FILE'),
    fetchImpl,
  });
}
