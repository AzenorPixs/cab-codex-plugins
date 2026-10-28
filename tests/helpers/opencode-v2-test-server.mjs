const fixturePassword = 'synthetic-v2-test-password';
const fixtureAuthorization = `Basic ${Buffer.from(`opencode:${fixturePassword}`).toString('base64')}`;

function v2Message(message) {
  const info = message?.info || {};
  const role = info.role || (Array.isArray(message?.parts) && message.parts.length ? 'assistant' : 'system');
  const id = info.id || 'msg_fixture';
  const model = (info.model || info.providerID || info.modelID) ? { id: info.model?.modelID || info.modelID,
    providerID: info.model?.providerID || info.providerID,
    ...(info.variant || info.model?.variant ? { variant: info.variant || info.model.variant } : {}) } : undefined;
  if (role === 'user') return { id, type: 'user', text: message.parts?.find((part) => part.type === 'text')?.text || '',
    time: { created: info.time?.created || 1 }, metadata: { parentID: info.parentID } };
  if (role === 'assistant') return { id, type: 'assistant', time: { created: info.time?.created || 1,
      ...(Number.isFinite(info.time?.start) ? { streamed: info.time.start } : {}),
      ...(Number.isFinite(info.time?.completed) ? { completed: info.time.completed } : {}) },
    ...(model ? { model } : {}), finish: info.finish || 'stop', ...(info.error ? { error: info.error } : {}),
    metadata: { parentID: info.parentID },
    content: (message.parts || []).map((part) => part.type === 'tool' ? ({ type: 'tool', id: part.callID || 'call_fixture',
      name: part.tool, executed: true, time: { created: part.state?.time?.start || 1,
        ...(Number.isFinite(part.state?.time?.start) ? { ran: part.state.time.start } : {}),
        ...(Number.isFinite(part.state?.time?.end) ? { completed: part.state.time.end } : {}) },
      state: { status: part.state?.status, input: part.state?.input || {},
        content: [{ type: 'text', text: part.state?.output || '' }],
        ...(typeof part.state?.error === 'string' ? { error: { type: 'ToolError', message: part.state.error } } : {}),
        metadata: part.state?.metadata || {} } }) :
      ({ type: part.type === 'reasoning' ? 'reasoning' : 'text', text: part.text || '' })) };
  return { id, type: 'system', text: '', time: { created: 1 } };
}

function v2Permission(permission) {
  return { id: permission.id, sessionID: permission.sessionID, action: permission.permission,
    resources: [permission.metadata?.command || permission.metadata?.filepath].filter(Boolean),
    metadata: permission.metadata || {}, source: { type: 'tool', messageID: 'msg_fixture', id: permission.tool?.callID || 'call_fixture' } };
}

function v2Session(session, directory) {
  return { ...session, ...(session.model ? { model: { providerID: session.model.providerID, id: session.model.modelID,
      ...(session.model.variant ? { variant: session.model.variant } : {}) } } : {}), directory: session.directory || directory,
    permissions: Array.isArray(session.permission) ? session.permission.map((rule) => rule && typeof rule === 'object'
      ? ({ action: rule.permission, resource: rule.pattern, effect: rule.action }) : rule) : session.permission };
}

function v2ProviderData(legacy) {
  const all = Array.isArray(legacy?.all) ? legacy.all : [];
  return all.map((provider, index) => ({ ...(index === 0 && typeof legacy.privatePadding === 'string'
      ? { privatePadding: legacy.privatePadding } : {}), id: provider.id, canonical: provider.id, name: provider.id,
    activation: legacy.connected?.includes(provider.id) ? 'enabled' : 'auto', package: 'fixture' }));
}

export function v2ProviderResponseBytes(legacy, directory) {
  const location = { directory };
  return Buffer.byteLength(JSON.stringify({ location, data: v2ProviderData(legacy) }));
}

export function v2NormalizedToolPart(part) {
  const state = part.state || {};
  const start = state.time?.start;
  const error = typeof state.error === 'string' ? state.error : state.error?.message;
  return { type: 'tool', id: part.callID || 'call_fixture', tool: part.tool,
    callID: part.callID || 'call_fixture', executed: true,
    state: { status: state.status, input: state.input || {}, output: state.output || '',
      ...(typeof error === 'string' ? { error } : {}), metadata: state.metadata || {},
      time: { start: Number.isFinite(start) ? start : 1, end: state.time?.end } } };
}

function v2ModelData(legacy) {
  const all = Array.isArray(legacy?.all) ? legacy.all : [];
  return all.flatMap((provider) => Object.entries(provider.models || {}).map(([modelID, item]) => ({
    id: modelID, modelID, providerID: provider.id, name: modelID, enabled: true, status: 'active',
    variants: Object.keys(item.variants || {}).map((id) => ({ id, settings: {} })),
  })));
}

function legacyPath(path) {
  if (path === '/api/mcp') return '/mcp';
  if (path === '/api/session/active') return '/session/status';
  if (path === '/api/permission/request') return '/permission';
  if (path === '/api/provider' || path === '/api/model') return '/provider';
  const mcp = path.match(/^\/api\/experimental\/mcp\/([^/]+)\/(connect|disconnect)$/);
  if (mcp) return `/mcp/${mcp[1]}/${mcp[2]}`;
  let match = path.match(/^\/api\/session\/([^/]+)\/permission\/([^/]+)\/reply$/);
  if (match) return `/session/${match[1]}/permissions/${match[2]}`;
  match = path.match(/^\/api\/session\/([^/]+)\/prompt$/);
  if (match) return `/session/${match[1]}/message`;
  match = path.match(/^\/api\/session\/([^/]+)\/message(?:\/([^/]+))?$/);
  if (match) return `/session/${match[1]}/message${match[2] ? `/${match[2]}` : ''}`;
  match = path.match(/^\/api\/session\/([^/]+)\/permission$/);
  if (match) return `/session/${match[1]}/permission`;
  match = path.match(/^\/api\/session\/([^/]+)$/);
  if (match) return `/session/${match[1]}`;
  if (path === '/api/session') return '/session';
  return null;
}

function transform(path, method, payload, directory) {
  if (path === '/api/location') return { directory, project: { id: 'fixture', directory, canonical: directory } };
  if (path === '/api/mcp') return { location: { directory }, data: Object.entries(payload || {}).map(([name, value]) => ({
    name, status: { status: value?.status || 'failed', ...(value?.status === 'failed' ? { error: 'fixture' } : {}) },
  })) };
  if (path === '/api/session/active') return { data: Object.fromEntries(Object.entries(payload || {})
    .filter(([, value]) => value?.type !== 'idle').map(([id, value]) => [id,
      { type: value?.type === 'busy' ? 'running' : value?.type }])) };
  if (path === '/api/permission/request') return { location: { directory }, data: (payload || []).map(v2Permission) };
  if (path === '/api/provider') return { location: { directory }, data: v2ProviderData(payload) };
  if (path === '/api/model') return { location: { directory }, data: v2ModelData(payload) };
  if (path.startsWith('/api/experimental/mcp/')) return null;
  if (/^\/api\/session\/[^/]+\/permission\/[^/]+\/reply$/.test(path)) return null;
  if (/^\/api\/session\/[^/]+\/model$/.test(path)) return null;
  if (/^\/api\/session\/[^/]+\/prompt$/.test(path)) return { data: { id: 'inbox_fixture', sessionID: path.split('/')[3], type: 'user' } };
  if (/^\/api\/session\/[^/]+\/message\/[^/]+$/.test(path)) return { data: v2Message(payload) };
  if (/^\/api\/session\/[^/]+\/message$/.test(path)) return { data: (payload || []).map(v2Message), cursor: { next: null, previous: null } };
  if (/^\/api\/session\/[^/]+\/permission$/.test(path)) return { data: (payload || []).map(v2Permission) };
  if (/^\/api\/session\/[^/]+$/.test(path)) return { data: v2Session(payload, directory) };
  if (path === '/api/session') return { data: [], cursor: { next: null, previous: null } };
  return payload;
}

export function openCodeV2TestHandler(handler, { directory, locationDirectory = () => directory, onModelSwitch,
  allowNonApi = false, allowLegacyTestCalls = false } = {}) {
  return async (request, response) => {
    const incoming = new URL(request.url, 'http://localhost');
    const path = incoming.pathname;
    if (!path.startsWith('/api/')) {
      if (allowLegacyTestCalls) return handler(request, response);
      if (allowNonApi) return handler(request, response);
      response.writeHead(404).end(); return;
    }
    if (request.headers.authorization !== fixtureAuthorization) {
      response.writeHead(401, { 'content-type': 'application/json' }).end(JSON.stringify({ _tag: 'UnauthorizedError', message: 'fixture' }));
      return;
    }
    if (path === '/api/info') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ version: '2.2.0', pid: process.pid, hostname: '127.0.0.1', urls: [], paths: { tmp: '/tmp' } }));
      return;
    }
    if (path === '/api/location') {
      const targetDirectory = await locationDirectory();
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(transform(path, request.method, null, targetDirectory)));
      return;
    }
    if (/^\/api\/session\/[^/]+\/model$/.test(path)) {
      const chunks = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      if (onModelSwitch) {
        let body;
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { body = {}; }
        onModelSwitch({ sessionId: path.split('/')[3], body });
      }
      response.writeHead(204).end();
      return;
    }
    if (path === '/api/event') request.url = '/global/event';
    else {
      const mapped = legacyPath(path);
      if (!mapped) { response.writeHead(404, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'fixture-route-unsupported' })); return; }
      const query = new URLSearchParams(incoming.searchParams);
      if (!query.has('directory')) query.set('directory', directory);
      request.url = mapped + '?' + query.toString();
      if (path.endsWith('/reply') || path.endsWith('/prompt')) {
        const chunks = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));
        let body;
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { body = {}; }
        const legacyBody = path.endsWith('/reply') ? { response: body.decision } :
          { ...(body.model ? { model: { providerID: body.model.providerID, modelID: body.model.id }, variant: body.model.variant } : {}),
            parts: [{ type: 'text', text: body.text || '' }] };
        const bytes = Buffer.from(JSON.stringify(legacyBody));
        request[Symbol.asyncIterator] = async function* () { yield bytes; };
      }
    }
    const originalWriteHead = response.writeHead.bind(response);
    const originalEnd = response.end.bind(response);
    let status = 200;
    let contentType = 'application/json';
    response.writeHead = (code, headers) => {
      status = (path.endsWith('/reply') || path.startsWith('/api/experimental/mcp/')) && code >= 200 && code < 300 ? 204 : code;
      if (headers && typeof headers === 'object') contentType = headers['content-type'] || headers['Content-Type'] || contentType;
      return originalWriteHead(status, headers);
    };
    response.end = (chunk, encoding, callback) => {
      if ((path.endsWith('/reply') || path.startsWith('/api/experimental/mcp/')) && status === 204) {
        return originalEnd(undefined, encoding, callback);
      }
      if (path === '/api/event' || chunk === undefined || !contentType.includes('application/json')) {
        return originalEnd(chunk, encoding, callback);
      }
      let value;
      try { value = JSON.parse(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk)); }
      catch { return originalEnd(chunk, encoding, callback); }
      const targetDirectory = incoming.searchParams.get('directory') || directory;
      const output = transform(path, request.method, value, targetDirectory);
      return originalEnd(output === null ? undefined : JSON.stringify(output), encoding, callback);
    };
    await handler(request, response);
  };
}

export { fixtureAuthorization };
