import {runtimeStateDirectory} from './cgpt-approval-bridge-state-layout.mjs';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { open } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { hasNativeAsk, nativeAskState, scopedNativeReadRules, VERSION as PERMISSION_VERSION } from './cgpt-approval-bridge-permission-policy.mjs';
import { PermissionReplyJournal } from './cgpt-approval-bridge-permission-replies.mjs';
import { ContinuityStore } from './cgpt-approval-bridge-continuity.mjs';

export const VERSION = '2.4.24';
if (PERMISSION_VERSION !== VERSION) throw new Error('CAB native permission component version mismatch');
const RESPONSE_LIMIT = 2 * 1024 * 1024;
const SESSION_LOG_LIMIT = 8 * 1024 * 1024;
const SESSION_LOG_EVENT_LIMIT = 100_000;
const SOURCE_FILE_DEFAULT_LIMIT = 1024 * 1024;
const SOURCE_FILE_MAX_LIMIT = 2 * 1024 * 1024;
const CREDENTIAL_LIMIT = 4096;
const EXCLUDED_SOURCE_DIRS = new Set(['.git', '.opencode', '.cache', '.idea', '.mypy_cache', '.npm',
  '.pytest_cache', '.ruff_cache', '.venv', '.vscode', '__pycache__', 'env', 'logs', 'node_modules', 'tmp', 'venv']);
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

async function readResponseBytes(response, limit) {
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
  return Buffer.concat(chunks, size);
}

function sourcePath(value, { allowRoot = false } = {}) {
  if (typeof value !== 'string' || value.includes('\\') || value.includes('\0') || value.includes('..') || value.length > 1024 ||
      isAbsolute(value) || (!value && !allowRoot)) fail('opencode-source-path-invalid');
  if (!value && allowRoot) return '';
  const segments = value.split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..')) fail('opencode-source-path-invalid');
  const name = segments.at(-1);
  if (segments.some(segment => EXCLUDED_SOURCE_DIRS.has(segment)) ||
      /(?:^|\/)\.env(?:\..*)?$/i.test(value) || /(?:^|\/)[^/]+\.env(?:\..*)?$/i.test(value) ||
      /(?:^|\/)(?:credentials|secrets)\.(?:json|ya?ml)$/i.test(value) ||
      /(?:^|\/)(?:id_rsa|id_ed25519)$/i.test(value) || /\.(?:crt|cer|der|key|pem|p12|pfx)$/i.test(name)) {
    fail('opencode-source-path-excluded');
  }
  return value;
}

function sourceEntryPath(value, directoryValue, type) {
  if (typeof value !== 'string' || value.includes('\\') || value.includes('\0')) {
    fail('opencode-source-path-invalid');
  }
  if (value === '' || value === '.' || value === './' || value === '..' || value.startsWith('../')) return null;
  if (value.split('/').includes('..')) return null;
  let candidate = value;
  if (isAbsolute(candidate)) {
    candidate = relative(directoryValue, candidate);
    if (!candidate || candidate === '..' || candidate.startsWith('../') || isAbsolute(candidate)) return null;
  }
  if (candidate.startsWith('./')) candidate = candidate.slice(2);
  if (type === 'directory') candidate = candidate.replace(/\/+$/, '');
  if (!candidate) return null;
  return sourcePath(candidate);
}

function sourceMimeType(value) {
  const type = value.split(';', 1)[0].trim().toLowerCase();
  return type === 'application/octet-stream' || type.startsWith('text/') ||
    ['application/json', 'application/javascript', 'application/x-javascript', 'application/xml',
      'application/yaml', 'application/x-yaml', 'application/toml', 'application/x-toml',
      'application/typescript', 'application/x-typescript'].includes(type);
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
  delete metadata.nativeShellResourceCount;
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

export function nativeCodingMandate(instruction) {
  if (typeof instruction !== 'string' || !instruction.trim()) fail('opencode-coding-mandate-invalid');
  return 'CAB — outils natifs : write, edit et shell sont distincts du catalogue MCP search/execute. ' +
    'Pour les méthodes MCP CAB broker_readiness, request_validation, lookup_validation, poll_approval, get_approval, cancel_approval et reject, ' +
    'utiliser uniquement Code Mode execute avec le nom exact découvert par search, sous la forme ' +
    'tools["cgpt-validation"].request_validation(...). Ne pas appeler directement une entrée MCP native. ' +
    'Dans le change validé, les lectures et explorations sont autonomes. Pour les essais libres dans votre atelier .cab-tests/<change>/<RUN>/, ' +
    'utiliser atelier_execute via Code Mode après discovery exacte, avec données littérales, sans demande de validation supplémentaire ; ' +
    'atelier_status consulte le même essai sans rejeu. Projet RO, atelier propre RW et réseau isolé ; ne pas remplacer ce profil par un shell hôte libre. ' +
    'Toute écriture projet hors atelier et tout accès web exigent la validation préalable du pilote ; tous les résultats de tests lui sont soumis. ' +
    'Toute action hors change ou allocation supplémentaire non autorisée relève du développeur. ' +
    'Pour request_validation, retourner directement await avec le payload littéral complet ; ne pas utiliser runtimeInput ou transformer le retour. ' +
    'Si execute ou la méthode découverte est indisponible, signaler le blocage sans appel direct ou repli. ' +
    'Une recherche MCP vide ne prouve pas leur absence. Utiliser directement l’outil natif disponible prescrit, ' +
    'avec les arguments exacts approuvés, seulement après les étapes CAB requises. ' +
    'APPROVED et access_id référencé ne prouvent pas le rattachement effectif : exiger HELD et la liaison de cette opération avant l’appel ; le contrôleur seul émet once. ' +
    'Si cet outil est réellement absent, signaler le blocage sans substitution ni opération supplémentaire. ' +
    'Après erreur fournisseur ou arguments incomplets, ne pas compléter un fragment ni relancer un outil : ' +
    'attendre la réconciliation et un nouveau mandat. Une proposition doit être complète ; READY ne prouve aucun test.\n\n' + instruction;
}

// Observation seulement : les permissions et les effets sont vérifiés séparément.
export function diagnoseCodingTurn(messages, { sessionId, promptId, toolInputSha256 } = {}) {
  if (!Array.isArray(messages) || typeof sessionId !== 'string' || !/^ses_[A-Za-z0-9_-]+$/.test(sessionId) ||
      typeof promptId !== 'string' || !/^msg_[A-Za-z0-9_-]+$/.test(promptId) ||
      toolInputSha256 !== undefined && !/^[a-f0-9]{64}$/.test(toolInputSha256)) fail('opencode-coding-diagnostic-invalid');
  const users = messages.filter(m => m?.info?.sessionID === sessionId && m.info.id === promptId && m.info.role === 'user');
  const assistants = messages.filter(m => m?.info?.sessionID === sessionId && m.info.role === 'assistant' && m.info.parentID === promptId);
  const base = { sessionId, promptId, snapshot_only: true, effectStatus: 'unverified' };
  if (users.length !== 1 || !assistants.length) return { ...base, available: false,
    reason: 'native-turn-evidence-unavailable', requiresReconciliation: true };
  const tools = assistants.flatMap(m => Array.isArray(m.parts) ? m.parts.filter(p => p?.type === 'tool') : []);
  const writes = tools.filter(p => ['write', 'edit'].includes(p.tool));
  const invalidWriteInputCount = writes.filter(p => !record(p.state?.input) || typeof p.state.input.path !== 'string' ||
    !p.state.input.path || (p.tool === 'write' ? typeof p.state.input.content !== 'string' :
      typeof p.state.input.oldString !== 'string' || typeof p.state.input.newString !== 'string')).length;
  const inputMismatchCount = toolInputSha256 === undefined ? null : writes.filter(p =>
    !record(p.state?.input) || nativeToolInputDigest(p.state.input) !== toolInputSha256).length;
  const providerFailure = assistants.some(m => /^provider\./.test(m.info.error?.type || ''));
  const nativeTurnFailed = assistants.some(m => m.info.finish === 'error' || Boolean(m.info.error));
  const discoveryOnly = tools.length > 0 && tools.every(p => p.tool === 'cab_codemode_discovery');
  const requiresReconciliation = nativeTurnFailed || invalidWriteInputCount > 0 || inputMismatchCount > 0;
  return { ...base, available: true, assistantCount: assistants.length, nativeWriteCount: writes.length,
    invalidWriteInputCount, inputMismatchCount, providerFailure, nativeTurnFailed, discoveryOnly, requiresReconciliation,
    nextAction: requiresReconciliation ? 'reconcile-before-new-mandate' : discoveryOnly ? 'verify-native-tool-selection' : 'review-native-result' };
}

// Une grammaire de données, jamais un interpréteur JavaScript.
function templateLiteralValue(source, start = 0) {
  if (source[start] !== '`') return null;
  let value = '';
  for (let index = start + 1; index < source.length; index++) {
    const character = source[index];
    if (character === '`') return { value, end: index + 1 };
    if (character === '$' && source[index + 1] === '{') return null;
    if (character !== '\\') { value += character; continue; }
    const escaped = source[++index];
    if (escaped === undefined) return null;
    if (escaped === '\n') continue;
    if (escaped === '\r') { if (source[index + 1] === '\n') index++; continue; }
    if (escaped === 'x') {
      const digits = source.slice(index + 1, index + 3);
      if (!/^[a-f0-9]{2}$/i.test(digits)) return null;
      value += String.fromCharCode(Number.parseInt(digits, 16)); index += 2; continue;
    }
    if (escaped === 'u') {
      if (source[index + 1] === '{') {
        const close = source.indexOf('}', index + 2);
        if (close < 0) return null;
        const digits = source.slice(index + 2, close);
        if (!/^[a-f0-9]{1,6}$/i.test(digits)) return null;
        const codePoint = Number.parseInt(digits, 16);
        if (codePoint > 0x10ffff) return null;
        value += String.fromCodePoint(codePoint); index = close; continue;
      }
      const digits = source.slice(index + 1, index + 5);
      if (!/^[a-f0-9]{4}$/i.test(digits)) return null;
      value += String.fromCharCode(Number.parseInt(digits, 16)); index += 4; continue;
    }
    const escapes = { '\\': '\\', '`': '`', '$': '$', n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0' };
    if (!Object.hasOwn(escapes, escaped)) return null;
    value += escapes[escaped];
  }
  return null;
}

function literalStringAt(source, start) {
  if (source[start] === '`') return templateLiteralValue(source, start);
  if (source[start] !== '"') return null;
  let escaped = false;
  for (let index = start + 1; index < source.length; index++) {
    const character = source[index];
    if (escaped) escaped = false;
    else if (character === '\\') escaped = true;
    else if (character === '"') {
      try { return { value: JSON.parse(source.slice(start, index + 1)), end: index + 1 }; }
      catch { return null; }
    }
  }
  return null;
}

function parseLiteralData(raw) {
  let text = '', quoted = false, escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]; text += c;
    if (!quoted && c === '`') {
      const literal = templateLiteralValue(raw, i);
      if (!literal) throw new Error('Code Mode template literal invalide');
      text = text.slice(0, -1) + JSON.stringify(literal.value);
      i = literal.end - 1;
      continue;
    }
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

function replaceCommandBinding(source, binding) {
  let result = '', braceDepth = 0, matches = 0;
  for (let index = 0; index < source.length;) {
    const character = source[index];
    const previous = source[index - 1];
    if (braceDepth === 1 && (previous === '{' || previous === ',' || previous === undefined || /\s/.test(previous))) {
      const property = /^(?:"commands"|commands)\s*:\s*\[\s*([A-Za-z_$][\w$]*)\s*\]/.exec(source.slice(index));
      if (property) {
        if (property[1] !== binding.name || matches !== 0) return null;
        const identifier = property[0].lastIndexOf(property[1]);
        result += property[0].slice(0, identifier) + JSON.stringify(binding.value) + property[0].slice(identifier + property[1].length);
        index += property[0].length; matches++; continue;
      }
      if (/^(?:"commands"|commands)\s*:/.test(source.slice(index))) return null;
    }
    if (character === '"') {
      let end = index + 1, escaped = false;
      for (; end < source.length; end++) {
        const value = source[end];
        if (escaped) escaped = false;
        else if (value === '\\') escaped = true;
        else if (value === '"') { end++; break; }
      }
      if (end > source.length || source[end - 1] !== '"') return null;
      result += source.slice(index, end); index = end; continue;
    }
    if (character === '`') {
      const literal = templateLiteralValue(source, index);
      if (!literal) return null;
      result += source.slice(index, literal.end); index = literal.end; continue;
    }
    if (character === '{') { braceDepth++; result += character; index++; continue; }
    if (character === '}') { braceDepth--; result += character; index++; continue; }
    result += character; index++;
  }
  return matches === 1 ? result : null;
}

function bindNativeRequestId(source, nativeRequestId) {
  if (typeof nativeRequestId !== 'string') return { source, bound: false };
  let result = '', braceDepth = 0, bracketDepth = 0, bound = false, requestIdProperties = 0;
  for (let index = 0; index < source.length;) {
    const character = source[index];
    if (character === '"') {
      let end = index + 1, escaped = false;
      for (; end < source.length; end++) {
        const value = source[end];
        if (escaped) escaped = false;
        else if (value === '\\') escaped = true;
        else if (value === '"') { end++; break; }
      }
      if (end > source.length || source[end - 1] !== '"') return null;
      result += source.slice(index, end); index = end; continue;
    }
    if (character === '`') {
      const literal = templateLiteralValue(source, index);
      if (!literal) return null;
      result += source.slice(index, literal.end); index = literal.end; continue;
    }
    const propertyStart = bracketDepth === 0 &&
      (character === ',' && braceDepth === 1 || character === '{' && braceDepth === 0);
    if (propertyStart) {
      let cursor = index + 1;
      while (/\s/.test(source[cursor] || '')) cursor++;
      let key, keyEnd = cursor;
      if (source[cursor] === '"') {
        const parsed = literalStringAt(source, cursor);
        if (!parsed) return null;
        key = parsed.value; keyEnd = parsed.end;
      } else {
        const parsed = /^[A-Za-z_$][\w$]*/.exec(source.slice(cursor));
        if (parsed) { key = parsed[0]; keyEnd = cursor + parsed[0].length; }
      }
      if (key === 'requestId') {
        requestIdProperties++;
        if (requestIdProperties > 1) return null;
        let colon = keyEnd;
        while (/\s/.test(source[colon] || '')) colon++;
        if (source[colon] === ':') {
          let valueStart = colon + 1;
          while (/\s/.test(source[valueStart] || '')) valueStart++;
          const identifier = /^[A-Za-z_$][\w$]*/.exec(source.slice(valueStart));
          if (identifier && !['true', 'false', 'null', 'undefined'].includes(identifier[0])) {
            const end = valueStart + identifier[0].length;
            let delimiter = end;
            while (/\s/.test(source[delimiter] || '')) delimiter++;
            if (source[delimiter] !== ',' && source[delimiter] !== '}') return null;
            if (bound) return null;
            result += source.slice(index, valueStart) + JSON.stringify(nativeRequestId);
            index = end; bound = true; continue;
          }
        }
      }
    }
    if (character === '{') { braceDepth++; result += character; index++; continue; }
    if (character === '}') { braceDepth--; result += character; index++; continue; }
    if (character === '[') { bracketDepth++; result += character; index++; continue; }
    if (character === ']') { bracketDepth--; result += character; index++; continue; }
    result += character; index++;
  }
  return { source: result, bound };
}

function literalObject(source, commandBinding = null, nativeRequestId = null) {
  if (source[0] !== '{') return null;
  let depth = 0, quoted = false, escaped = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (!quoted && c === '`') {
      const literal = templateLiteralValue(source, i);
      if (!literal) return null;
      i = literal.end - 1; continue;
    }
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === '{' || c === '[') { if (++depth > 32) return null; }
    else if (c === '}' || c === ']') {
      depth--;
      if (depth === 0) {
        try {
          const object = source.slice(0, i + 1);
          const commandResolved = commandBinding ? replaceCommandBinding(object, commandBinding) : object;
          if (!commandResolved) return null;
          const requestResolved = bindNativeRequestId(commandResolved, nativeRequestId);
          if (!requestResolved) return null;
          return { value: parseLiteralData(requestResolved.source), requestIdBound: requestResolved.bound,
            rest: source.slice(i + 1).trim() };
        }
        catch { return null; }
      }
    }
  }
  return null;
}

function discoveryAssertionStringAt(source, start) {
  if (source[start] !== "'") return literalStringAt(source, start);
  const end = source.indexOf("'", start + 1);
  if (end < 0) return null;
  const value = source.slice(start + 1, end);
  if (/[\\\r\n]/.test(value)) return null;
  return { value, end: end + 1 };
}

function codeModePart(content, part) {
  if (typeof part.state.input?.code !== 'string' || content.executed !== false || part.state.metadata?.truncated === true) return null;
  const observed = part.state.metadata?.toolCalls;
  const nativeRequestId = Array.isArray(observed) && observed.length === 1 &&
    observed[0]?.tool === 'cgpt-validation.request_validation' && typeof observed[0]?.input?.requestId === 'string'
    ? observed[0].input.requestId : null;
  let code = part.state.input.code.trim(), discovery;
  let commandBinding = null, assertedDiscoveryPath = null;
  const declaration = /^const\s+([A-Za-z_$][\w$]*)\s*=\s*/.exec(code);
  if (declaration) {
    const literal = literalStringAt(code, declaration[0].length);
    if (literal) {
      const suffix = code.slice(literal.end);
      const terminator = /^\s*;\s*/.exec(suffix);
      if (!terminator) return null;
      commandBinding = { name: declaration[1], value: literal.value };
      code = suffix.slice(terminator[0].length);
    }
  }
  const returnedSearch = /^return\s+await\s+search\s*\(\s*/.exec(code);
  if (returnedSearch) {
    const literal = literalObject(code.slice(returnedSearch[0].length));
    if (!literal || !/^\)\s*;?$/.test(literal.rest)) return null;
    discovery = { tool: 'search', input: literal.value };
    code = '';
  }
  const diagnostic = /^search\s*\(\s*/.exec(code);
  if (!discovery && diagnostic) {
    const literal = literalObject(code.slice(diagnostic[0].length));
    const acknowledgement = literal && /^\)\s*;\s*return\s+("(?:[^"\\]|\\.)*")\s*;?$/.exec(literal.rest);
    if (!acknowledgement) return null;
    try { if (typeof JSON.parse(acknowledgement[1]) !== 'string') return null; } catch { return null; }
    discovery = { tool: 'search', input: literal.value }; code = '';
  }
  const prefix = !discovery && /^const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?search\s*\(\s*/.exec(code);
  if (prefix) {
    if (['tools', 'search'].includes(prefix[1])) return null;
    const literal = literalObject(code.slice(prefix[0].length));
    if (!literal || !/^\)\s*;/.test(literal.rest)) return null;
    code = literal.rest.replace(/^\)\s*;/, '').trim();
    discovery = { tool: 'search', input: literal.value };
    const variable = prefix[1].replace(/[$]/g, '\\$&');
    const assertion = new RegExp('^if\\s*\\(\\s*' + variable +
      '\\.items\\s*\\[\\s*0\\s*\\]\\.path\\s*!==\\s*').exec(code);
    if (assertion) {
      if (prefix[1] === 'Error') return null;
      if (commandBinding && [prefix[1], 'Error', 'tools', 'search'].includes(commandBinding.name)) return null;
      const path = discoveryAssertionStringAt(code, assertion[0].length);
      if (!path) return null;
      const throwing = /^\s*\)\s*throw\s+new\s+Error\s*\(\s*/.exec(code.slice(path.end));
      if (!throwing) return null;
      const message = discoveryAssertionStringAt(code, path.end + throwing[0].length);
      if (!message) return null;
      const end = /^\s*\)\s*;\s*/.exec(code.slice(message.end));
      if (!end) return null;
      assertedDiscoveryPath = path.value;
      code = code.slice(message.end + end[0].length);
    }
    if (new RegExp('^return\\s+' + prefix[1].replace(/[$]/g, '\\$&') + '\\s*;?$').test(code)) code = '';
  }
  const match = /^return\s+await\s+tools\[(["'])cgpt-validation\1\]\.([a-z_]+)\s*\(\s*/.exec(code);
  let call, requestIdBound = false;
  if (match) {
    if (!['broker_readiness', 'request_validation', 'lookup_validation', 'poll_approval', 'get_approval', 'reject','atelier_execute','atelier_status','cab_contract','prepare_validation','ccab_report'].includes(match[2])) return null;
    const literal = literalObject(code.slice(match[0].length), commandBinding,
      match[2] === 'request_validation' ? nativeRequestId : null);
    if (!literal || !/^\)\s*;?$/.test(literal.rest)) return null;
    call = { tool: 'cgpt-validation.' + match[2], input: literal.value };
    requestIdBound = literal.requestIdBound;
  } else if (code || !discovery) return null;
  if (assertedDiscoveryPath !== null && (!call || assertedDiscoveryPath !== 'tools["cgpt-validation"].' + match[2])) return null;
  const expected = [discovery, call].filter(Boolean);
  const failureTool = ['cgpt-validation.request_validation','cgpt-validation.atelier_execute','cgpt-validation.atelier_status'].includes(call?.tool) ||
    (!discovery && call?.tool === 'cgpt-validation.get_approval');
  const nativeFailure = part.state.status === 'completed' && part.state.metadata?.error === true && failureTool &&
    (!discovery || discovery.tool === 'search') && Array.isArray(observed) && observed.length === expected.length &&
    expected.length > 0 && observed.at(-1)?.tool === call?.tool && observed.at(-1)?.status === 'error' &&
    observed.slice(0, -1).every(entry => entry?.status === 'completed');
  if ((observed !== undefined && !Array.isArray(observed)) ||
      (part.state.status === 'completed' && part.state.metadata?.truncated !== false)) return null;
  const omittedEmptyReadinessInput = entry => !discovery && expected.length === 1 &&
    part.state.status === 'completed' && part.executed === false &&
    (part.state.metadata?.error === undefined || part.state.metadata.error === false) &&
    call?.tool === 'cgpt-validation.broker_readiness' && Object.keys(call.input).length === 0 &&
    entry.tool === call.tool && entry.status === 'completed' && !Object.hasOwn(entry,'input');
  if (part.state.status !== 'running' || (Array.isArray(observed) && observed.length)) {
    if (!Array.isArray(observed) || observed.length !== expected.length || observed.some((entry, i) =>
        !record(entry) || entry.tool !== expected[i].tool ||
        (canonical(entry.input) !== canonical(expected[i].input) && !omittedEmptyReadinessInput(entry)) ||
        !(['completed', 'error'].includes(entry.status) || part.state.status === 'running' &&
          ['cgpt-validation.request_validation','cgpt-validation.atelier_execute','cgpt-validation.atelier_status'].includes(entry.tool) && i === expected.length - 1 && entry.status === 'running')) ||
        (part.state.status === 'completed' && observed.some(entry => entry.status !== 'completed') && !nativeFailure)) return null;
  } else if (!call || !['cgpt-validation.request_validation','cgpt-validation.atelier_execute','cgpt-validation.atelier_status'].includes(call.tool)) return null;
  return { ...part, tool: call ? call.tool.replace('cgpt-validation.', 'cgpt-validation_') : 'cab_codemode_discovery',
    state: { ...part.state, input: call?.input || discovery.input,
      ...(nativeFailure ? { status: 'error', error: part.state.output } : {}),
      metadata: { ...part.state.metadata, cabCodeMode: {
        wrapperId: content.id, ...(nativeFailure ? { nativeMcpError: true } : {}),
        ...(requestIdBound ? { requestIdBoundFromNativeCall: true } : {}),
        envelopeHash: createHash('sha256').update(canonical(content)).digest('hex') } } } };
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
      ...((content.name === 'shell' || ['write', 'edit', 'read'].includes(content.name) && content.executed === false)
        ? { nativeFormat: 'opencode-v2', nativeTool: content.name } : {}),
      state: { status: state.status, input: state.input, output, error,
        metadata: directError ? { ...nativeMetadata, cabDirectMcpError: directError } : nativeMetadata, time: { start: content.time?.ran ?? content.time?.created,
          end: content.time?.completed } } };
    if (record(state.error) && typeof state.error.type === 'string')
      Object.defineProperty(part, 'nativeErrorType', { value: state.error.type, enumerable: false });
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

export function createOpenCodeV2Client({ baseUrl, directory, username, passwordFile, permissionReceiptDirectory, permissionRepairDirectory, fetchImpl = fetch, timeoutMs = 10000, signal }) {
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
    maxResponseBytes = RESPONSE_LIMIT, scoped = true, locationDirectory, responseMode = 'json' } = {}, schemaRead = false) {
    if (!Number.isSafeInteger(maxResponseBytes) || maxResponseBytes <= 0) fail('opencode-response-limit-invalid');
    if (!['json', 'binary'].includes(responseMode)) fail('opencode-response-mode-invalid');
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
    const scopedDirectory = locationDirectory ?? query.directory ?? directory;
    if (scoped && scopedDirectory !== undefined) {
      if (typeof scopedDirectory !== 'string' || !isAbsolute(scopedDirectory)) fail('opencode-location-invalid');
      headers['x-opencode-directory'] = scopedDirectory;
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
    if (!response.ok) {
      await response.body?.cancel();
      fail(`opencode-http-${response.status}`);
    }
    if (responseMode === 'binary') {
      if (!sourceMimeType(type)) {
        await response.body?.cancel();
        fail('opencode-source-response-invalid');
      }
      return { status: response.status, data: await readResponseBytes(response, maxResponseBytes) };
    }
    if (!type.toLowerCase().includes('application/json')) {
      await response.body?.cancel();
      fail('opencode-v2-response-invalid');
    }
    const text = await readResponse(response, maxResponseBytes);
    let payload;
    try { payload = JSON.parse(text); } catch { fail('opencode-v2-response-invalid'); }
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
    if (typeof directoryValue !== 'string' || !isAbsolute(directoryValue)) fail('opencode-location-invalid');
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

  async function sourceIdentity(sessionId, directoryValue) {
    if (typeof sessionId !== 'string' || !/^ses_[A-Za-z0-9_.-]{1,100}$/.test(sessionId) ||
        typeof directoryValue !== 'string' || !isAbsolute(directoryValue) || resolve(directoryValue) === '/') {
      fail('opencode-source-scope-invalid');
    }
    const initial = await info(true);
    const sessionResponse = await json(`/api/session/${encodeURIComponent(sessionId)}`, { locationDirectory: directoryValue });
    const observed = normalizeSession(unwrapData(sessionResponse, 'opencode-session-invalid'));
    if (observed.id !== sessionId || observed.directory !== directoryValue) fail('opencode-session-divergent');
    return initial;
  }

  async function verifySourceIdentity(sessionId, directoryValue, initial) {
    const final = await info(true);
    const sessionResponse = await json(`/api/session/${encodeURIComponent(sessionId)}`, { locationDirectory: directoryValue });
    const observed = normalizeSession(unwrapData(sessionResponse, 'opencode-session-invalid'));
    if (initial.pid !== final.pid || initial.version !== final.version ||
        observed.id !== sessionId || observed.directory !== directoryValue) fail('opencode-source-identity-changed');
  }

  function sourceEntries(value, directoryValue) {
    if (!record(value) || !record(value.location) || value.location.directory !== directoryValue || !Array.isArray(value.data)) {
      fail('opencode-source-list-invalid');
    }
    return value.data.flatMap(entry => {
      if (!record(entry) || typeof entry.path !== 'string' || !['file', 'directory'].includes(entry.type)) {
        fail('opencode-source-list-invalid');
      }
      try {
        const path = sourceEntryPath(entry.path, directoryValue, entry.type);
        return path ? [{ path, type: entry.type }] : [];
      } catch (cause) {
        if (cause?.code === 'opencode-source-path-excluded') return [];
        throw cause;
      }
    });
  }

  async function sourceList(sessionId, relativeDirectory = '', { directory: directoryValue = directory } = {}) {
    const path = sourcePath(relativeDirectory, { allowRoot: true });
    const initial = await sourceIdentity(sessionId, directoryValue);
    const result = await json('/api/fs/list', { query: {
      'location[directory]': directoryValue, ...(path ? { path } : {}) },
      locationDirectory: directoryValue, maxResponseBytes: RESPONSE_LIMIT });
    const entries = sourceEntries(result, directoryValue);
    await verifySourceIdentity(sessionId, directoryValue, initial);
    return { sessionId, directory: directoryValue, path, source: 'opencode-v2-fs-list', snapshot_only: true, entries };
  }

  async function sourceFind(sessionId, query, { directory: directoryValue = directory, type, limit = 100 } = {}) {
    if (typeof query !== 'string' || !query.trim() || query.length > 200 ||
        (type !== undefined && !['file', 'directory'].includes(type)) ||
        !Number.isSafeInteger(limit) || limit < 1 || limit > 200) fail('opencode-source-find-invalid');
    const initial = await sourceIdentity(sessionId, directoryValue);
    const result = await json('/api/fs/find', { query: {
      'location[directory]': directoryValue, query: query.trim(), ...(type ? { type } : {}), limit: String(limit) },
      locationDirectory: directoryValue, maxResponseBytes: RESPONSE_LIMIT });
    const entries = sourceEntries(result, directoryValue);
    await verifySourceIdentity(sessionId, directoryValue, initial);
    return { sessionId, directory: directoryValue, query: query.trim(), source: 'opencode-v2-fs-find', snapshot_only: true, entries };
  }

  async function sourceRead(sessionId, relativePath, { directory: directoryValue = directory,
    maxBytes = SOURCE_FILE_DEFAULT_LIMIT } = {}) {
    const path = sourcePath(relativePath);
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > SOURCE_FILE_MAX_LIMIT) fail('opencode-source-size-invalid');
    const initial = await sourceIdentity(sessionId, directoryValue);
    const encoded = path.split('/').map(segment => encodeURIComponent(segment)).join('/');
    const response = await request(`/api/fs/read/${encoded}`, { query: { 'location[directory]': directoryValue },
      locationDirectory: directoryValue, accept: 'application/octet-stream', responseMode: 'binary', maxResponseBytes: maxBytes });
    let content;
    try { content = new TextDecoder('utf-8', { fatal: true }).decode(response.data); }
    catch { fail('opencode-source-encoding-invalid'); }
    await verifySourceIdentity(sessionId, directoryValue, initial);
    return { sessionId, directory: directoryValue, path, content, byteLength: response.data.byteLength,
      sha256: createHash('sha256').update(response.data).digest('hex'), source: 'opencode-v2-fs-read', snapshot_only: true };
  }

  async function messages(sessionId, directoryValue = directory) {
    if (typeof directoryValue !== 'string' || !isAbsolute(directoryValue)) fail('opencode-location-invalid');
    const result = [];
    let cursor;
    let pageSize = 200;
    const seen = new Set();
    for (let page = 0; page < 100; page++) {
      let response;
      for (;;) {
        try {
          response = await json(`/api/session/${encodeURIComponent(sessionId)}/message`,
            { query: { order: cursor === undefined ? 'asc' : undefined, limit: String(pageSize), cursor },
              locationDirectory: directoryValue });
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
      pageSize = 200;
    }
    fail('opencode-messages-pagination-limit');
  }

  function shellResourcesCoverCommand(resources, command) {
    if (!Array.isArray(resources) || !resources.length || typeof command !== 'string') return false;
    if (resources.length === 1) return resources[0] === command;
    let position = 0;
    for (const resource of resources) {
      if (typeof resource !== 'string' || !resource.length) return false;
      const index = command.indexOf(resource, position);
      if (index < 0 || !/^[\s;&|()]*$/.test(command.slice(position, index))) return false;
      position = index + resource.length;
    }
    return /^[\s;&|()]*$/.test(command.slice(position));
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
        if (part.nativeTool !== 'shell' || !shellResourcesCoverCommand(raw.resources, input.command) ||
            (input.workdir !== undefined &&
              (typeof input.workdir !== 'string' || resolve(directoryValue, input.workdir) !== directoryValue))) {
          fail('opencode-permission-target-invalid');
        }
        permission.metadata.command = input.command;
        permission.metadata.nativeShellResourceCount = raw.resources.length;
        permission.metadata.shellBackground = input.background === true;
        permission.metadata.shellTimeout = input.timeout;
        permission.metadata.nativeToolInputSha256 = nativeToolInputDigest(input);
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

  const protectedSavedAction=(action,kinds)=>kinds.some(kind=>
    (kind==='shell'?['shell','bash','*']:['edit','write','*']).includes(action));
  const permissionDigest=value=>createHash('sha256').update(canonical(value)).digest('hex');
  async function savedPermissionRows(sessionId,directoryValue) {
    const observed=await session(sessionId,directoryValue);
    if(observed.id!==sessionId||observed.directory!==directoryValue||typeof observed.projectID!=='string'||!observed.projectID)
      fail('opencode-permission-project-divergent');
    const envelope=await json('/api/permission/saved',{query:{directory:directoryValue}});
    if(!record(envelope)||!Array.isArray(envelope.data)||envelope.data.length>2000||
        envelope.location?.directory!==undefined&&envelope.location.directory!==directoryValue)
      fail('opencode-saved-permission-response-invalid');
    const ids=new Set();
    for(const row of envelope.data){
      if(!record(row)||Object.keys(row).some(key=>!['id','projectID','action','resource','time'].includes(key))||
          !/^psv_[A-Za-z0-9_.-]{1,190}$/.test(row.id||'')||ids.has(row.id)||
          typeof row.projectID!=='string'||!row.projectID||typeof row.action!=='string'||!row.action||
          typeof row.resource!=='string'||!row.resource)fail('opencode-saved-permission-response-invalid');
      ids.add(row.id);
    }
    return {observed,rows:envelope.data.filter(row=>row.projectID===observed.projectID)};
  }
  async function nativePermissionPolicy(sessionId, { directory: directoryValue = directory, requiredNativeAsk = ['shell'] } = {}) {
    if (!Array.isArray(requiredNativeAsk) || !requiredNativeAsk.length || new Set(requiredNativeAsk).size !== requiredNativeAsk.length ||
        requiredNativeAsk.some(kind => !['shell','edit'].includes(kind))) fail('opencode-native-ask-requirement-invalid');
    const observed = await session(sessionId,directoryValue);
    if(observed.id!==sessionId||observed.directory!==directoryValue)fail('opencode-permission-project-divergent');
    const effective = Object.fromEntries(requiredNativeAsk.map(kind=>[kind,nativeAskState(observed,kind)]));
    const missing = requiredNativeAsk.filter(kind=>!hasNativeAsk(observed,kind));
    const base={sessionId,directory:directoryValue,snapshot_only:true,requiredNativeAsk:[...requiredNativeAsk],
      policySha256:Object.values(effective).every(state=>state.valid)?createHash('sha256').update(canonical(observed.permission)).digest('hex'):null,
      effective,missing,nominalReady:missing.length===0};
    if(missing.length)return {...base,ready:false,savedGrantAudit:{available:false,reason:'nominal-policy-not-ask'}};
    try {
      const {observed:checked,rows}=await savedPermissionRows(sessionId,directoryValue);
      if(checked.projectID!==observed.projectID||permissionDigest(checked.permission)!==base.policySha256)fail('opencode-permission-policy-changed');
      const protectedRows=rows.filter(row=>protectedSavedAction(row.action,requiredNativeAsk));
      return {...base,missing:requiredNativeAsk.filter(kind=>rows.some(row=>protectedSavedAction(row.action,[kind]))),
        ready:protectedRows.length===0,savedGrantAudit:{available:true,projectID:checked.projectID,
          count:rows.length,protectedCount:protectedRows.length,truncated:protectedRows.length>20,
          grants:protectedRows.slice(0,20).map(row=>({id:row.id,action:row.action,resourceSha256:permissionDigest(row.resource)}))}};
    } catch(cause) {
      return {...base,missing:[...requiredNativeAsk],ready:false,savedGrantAudit:{available:false,
        reason:/^opencode-[a-z0-9-]+$/.test(cause.code||'')?cause.code:'saved-permission-control-unavailable'}};
    }
  }

  async function permissionRepairBoundary(directoryValue) {
    const before=await info(true);
    const [active,pending]=await Promise.all([
      json('/api/session/active',{scoped:false}),json('/api/permission/request',{query:{directory:directoryValue}})]);
    const running=unwrapData(active,'opencode-permission-repair-boundary-invalid');
    if(!record(running)||!record(pending)||pending.location?.directory!==directoryValue||!Array.isArray(pending.data))
      fail('opencode-permission-repair-boundary-invalid');
    if(Object.keys(running).length||pending.data.length)fail('opencode-permission-repair-not-quiescent');
    const after=await info(true);
    if(before.pid!==after.pid||before.version!==after.version)fail('opencode-permission-repair-native-changed');
    return {nativePid:after.pid,nativeVersion:after.version};
  }
  async function nativePermissionRepairPlan(sessionId,{planId,directory:directoryValue=directory,requiredNativeAsk=['shell','edit']}={}) {
    if(typeof planId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(planId))fail('opencode-permission-repair-plan-invalid');
    const policy=await nativePermissionPolicy(sessionId,{directory:directoryValue,requiredNativeAsk});
    if(!policy.nominalReady||!policy.savedGrantAudit.available)fail('opencode-permission-repair-policy-unavailable');
    const boundary=await permissionRepairBoundary(directoryValue),{observed,rows}=await savedPermissionRows(sessionId,directoryValue);
    if(permissionDigest(observed.permission)!==policy.policySha256)fail('opencode-permission-policy-changed');
    const protectedRows=rows.filter(row=>protectedSavedAction(row.action,requiredNativeAsk));
    const targets=protectedRows.map(row=>({id:row.id,action:row.action,recordSha256:permissionDigest(row),resourceSha256:permissionDigest(row.resource)})).sort((a,b)=>a.id.localeCompare(b.id));
    const retained=rows.filter(row=>!protectedSavedAction(row.action,requiredNativeAsk)).map(row=>({id:row.id,recordSha256:permissionDigest(row)})).sort((a,b)=>a.id.localeCompare(b.id));
    const plan={protocol:'cab-native-permission-repair-v1',planId,sessionId,directory:directoryValue,projectID:observed.projectID,
      ...boundary,requiredNativeAsk:[...requiredNativeAsk],policySha256:policy.policySha256,targets,retained};
    return {...plan,planDigest:permissionDigest(plan)};
  }
  async function revokeSavedNativePermissions(plan,authorization) {
    if(!record(plan)||plan.protocol!=='cab-native-permission-repair-v1'||typeof plan.planDigest!=='string')fail('opencode-permission-repair-plan-invalid');
    const unsigned={...plan};delete unsigned.planDigest;
    if(permissionDigest(unsigned)!==plan.planDigest||!Array.isArray(plan.targets)||!Array.isArray(plan.retained)||
        !Array.isArray(plan.requiredNativeAsk)||!plan.requiredNativeAsk.length||new Set(plan.requiredNativeAsk).size!==plan.requiredNativeAsk.length||
        plan.requiredNativeAsk.some(kind=>!['shell','edit'].includes(kind))||
        [...plan.targets,...plan.retained].some(row=>!record(row)||!/^psv_[A-Za-z0-9_.-]{1,190}$/.test(row.id||'')||!/^[a-f0-9]{64}$/.test(row.recordSha256||'')))fail('opencode-permission-repair-plan-invalid');
    if(!record(authorization)||authorization.kind!=='shared-project-maintenance'||authorization.projectID!==plan.projectID||
        authorization.directory!==plan.directory||authorization.planDigest!==plan.planDigest||
        typeof authorization.reference!=='string'||!/^[A-Za-z0-9_.:/@-]{1,240}$/.test(authorization.reference))
      fail('opencode-permission-repair-authorization-required');
    if(plan.targets.some(row=>!protectedSavedAction(row.action,plan.requiredNativeAsk)))fail('opencode-permission-repair-target-invalid');
    const expected=new Map([...plan.targets,...plan.retained].map(row=>[row.id,row.recordSha256]));
    if(expected.size!==plan.targets.length+plan.retained.length)fail('opencode-permission-repair-plan-invalid');
    const check=async()=>{
      const boundary=await permissionRepairBoundary(plan.directory);
      if(boundary.nativePid!==plan.nativePid||boundary.nativeVersion!==plan.nativeVersion)fail('opencode-permission-repair-native-changed');
      const {observed,rows}=await savedPermissionRows(plan.sessionId,plan.directory);
      if(observed.projectID!==plan.projectID||permissionDigest(observed.permission)!==plan.policySha256)fail('opencode-permission-repair-policy-changed');
      if(rows.some(row=>!expected.has(row.id)||permissionDigest(row)!==expected.get(row.id))||
          plan.retained.some(row=>!rows.some(current=>current.id===row.id)))fail('opencode-permission-repair-boundary-changed');
      return rows;
    };
    await check();
    const root=permissionRepairDirectory||join(runtimeStateDirectory(plan.directory),'permission-grant-repairs');
    if(!isAbsolute(root))fail('opencode-permission-repair-directory-invalid');
    const journal=new ContinuityStore(join(root,permissionDigest(plan.planId)+'.json'),'native-permission-repair',value=>
      record(value)&&value.planDigest===plan.planDigest&&record(value.steps)&&['PREPARED','APPLYING','COMPLETED'].includes(value.state));
    let receipt=journal.snapshot()||{planDigest:plan.planDigest,authorizationSha256:permissionDigest(authorization),state:'PREPARED',steps:{}};
    if(receipt.authorizationSha256!==permissionDigest(authorization))fail('opencode-permission-repair-authorization-divergent');
    if(receipt.state==='COMPLETED')return {...receipt.result,replay:true};
    journal.write(receipt);
    for(const target of plan.targets){
      const rows=await check();
      if(!rows.some(row=>row.id===target.id)){
        if(!receipt.steps[target.id]){receipt.steps[target.id]={state:'OBSERVED_ABSENT',attempts:0};journal.write(receipt);}
        continue;
      }
      const attempts=(receipt.steps[target.id]?.attempts||0)+1;
      if(attempts>2)fail('opencode-permission-repair-retry-budget-exhausted');
      receipt.state='APPLYING';receipt.steps[target.id]={state:'INTENT',attempts};journal.write(receipt);
      let httpStatus=null;
      try {httpStatus=(await request('/api/permission/saved/'+encodeURIComponent(target.id),{method:'DELETE',query:{directory:plan.directory}})).status;}
      catch { /* Only an observed absence below can close a lost DELETE response. */ }
      const after=await check();
      if(after.some(row=>row.id===target.id))fail('opencode-permission-repair-outcome-unverified');
      receipt.steps[target.id]={state:httpStatus===200||httpStatus===204?'REMOVED':'OBSERVED_REMOVED',attempts,httpStatus};journal.write(receipt);
    }
    await check();
    const policy=await nativePermissionPolicy(plan.sessionId,{directory:plan.directory,requiredNativeAsk:plan.requiredNativeAsk});
    if(!policy.ready)fail('opencode-permission-repair-not-ready');
    receipt.state='COMPLETED';receipt.result={state:'COMPLETED',planId:plan.planId,planDigest:plan.planDigest,
      projectID:plan.projectID,nativePid:plan.nativePid,targetCount:plan.targets.length,
      revokedCount:Object.values(receipt.steps).filter(step=>step.state==='REMOVED').length,
      observedRemovedCount:Object.values(receipt.steps).filter(step=>step.state==='OBSERVED_REMOVED').length,
      alreadyAbsentCount:Object.values(receipt.steps).filter(step=>step.state==='OBSERVED_ABSENT').length,retainedCount:plan.retained.length,
      policyReady:true,receiptPath:journal.path};journal.write(receipt);return receipt.result;
  }

  async function configureNativeReads(sessionId,{directory:directoryValue=directory,tools=['read'],paths=[]}={}) {
    const observed=await session(sessionId,directoryValue),native=await info(true);
    const expected=scopedNativeReadRules(observed,directoryValue,{tools,paths});
    const [states,pending]=await Promise.all([sessionStatus(directoryValue),permissions(directoryValue,{sessionIds:[sessionId]})]);
    if(observed.id!==sessionId||observed.directory!==directoryValue||states[sessionId]?.type!==undefined||pending.some(value=>value.sessionID===sessionId))fail('opencode-read-policy-session-busy');
    const before=permissionDigest(observed.permission),snapshot=await session(sessionId,directoryValue);
    if(permissionDigest(snapshot.permission)!==before||(await info(true)).pid!==native.pid)fail('opencode-read-policy-boundary-changed');
    if(permissionDigest(expected)===before)return {sessionId,changed:false,policySha256:before};
    let responseLost=false;
    try {await request('/api/session/'+encodeURIComponent(sessionId),{method:'PATCH',locationDirectory:directoryValue,
      body:{permissions:expected.map(rule=>({action:rule.permission,resource:rule.pattern,effect:rule.action}))}});}
    catch {responseLost=true;}
    const after=await session(sessionId,directoryValue);
    if(permissionDigest(after.permission)!==permissionDigest(expected)||(await info(true)).pid!==native.pid)fail('opencode-read-policy-outcome-unverified');
    return {sessionId,changed:true,responseLost,tools,policySha256:permissionDigest(expected),beforePolicySha256:before,
      scope:directoryValue,nonReadingRulesPreserved:true};
  }

  async function prompt(sessionId, text, { directory: directoryValue = directory, model, resume = true, requiredNativeAsk } = {}) {
    if (typeof text !== 'string' || !text || typeof resume !== 'boolean') fail('opencode-prompt-invalid');
    if(requiredNativeAsk===undefined&&text.startsWith('CAB — outils natifs :'))requiredNativeAsk=['shell','edit'];
    if (model !== undefined) modelReference(model);
    const inspectRequired = async () => {
      const policy = await nativePermissionPolicy(sessionId,{directory:directoryValue,requiredNativeAsk});
      if (!policy.ready) throw Object.assign(new Error('opencode-native-permission-ask-required'),{code:'opencode-native-permission-ask-required',policy});
    };
    if (requiredNativeAsk !== undefined) await inspectRequired();
    await info();
    const body = { text, resume };
    if (model !== undefined) {
      await switchModel(sessionId, model, directoryValue);
      if (requiredNativeAsk !== undefined) await inspectRequired();
    }
    const response = await request(`/api/session/${encodeURIComponent(sessionId)}/prompt`, { method: 'POST', body,
      ...(requiredNativeAsk !== undefined ? {query:{directory:directoryValue}} : {}) });
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

  async function shellPermissionForRejection(sessionId, permissionId, directoryValue) {
    const response = await json('/api/permission/request', { query: { directory: directoryValue } });
    if (!record(response) || response.location?.directory !== directoryValue || !Array.isArray(response.data)) fail('opencode-permissions-invalid');
    const matches = response.data.filter(raw => raw?.id === permissionId);
    if (matches.length !== 1 || matches[0].sessionID !== sessionId) fail('opencode-permission-receipt-pending-required');
    const raw = matches[0], permission = normalizePermission(raw);
    if (raw.action !== 'shell') fail('opencode-permission-target-invalid');
    if (raw.source?.type !== 'tool' || typeof raw.source.id !== 'string' || !raw.source.id ||
        typeof raw.source.messageID !== 'string' || !raw.source.messageID) fail('opencode-permission-source-invalid');
    const observedSession = await session(sessionId, directoryValue);
    if (observedSession.directory !== directoryValue) fail('opencode-permission-source-invalid');
    const envelope = await json(`/api/session/${encodeURIComponent(sessionId)}/message/${encodeURIComponent(raw.source.messageID)}`);
    const message = normalizeMessage(unwrapData(envelope, 'opencode-message-invalid'), sessionId);
    const parts = message.parts.filter(p => p.type === 'tool' && p.callID === raw.source.id);
    if (message.info.id !== raw.source.messageID || parts.length !== 1 || parts[0].nativeTool !== 'shell' ||
        !['running', 'completed'].includes(parts[0].state.status) || !record(parts[0].state.input) ||
        typeof parts[0].state.input.command !== 'string' || !parts[0].state.input.command.trim()) fail('opencode-permission-source-invalid');
    // This observation is private to reject; it must never authorize execution.
    permission.metadata.command = parts[0].state.input.command;
    return permission;
  }

  async function replyPermission(sessionId, permissionId, decision, directoryValue = directory) {
    if (typeof directoryValue !== 'string' || !isAbsolute(directoryValue)) fail('opencode-location-invalid');
    if (decision !== 'once' && decision !== 'always' && decision !== 'reject') fail('opencode-permission-decision-invalid');
    if(decision==='always')fail('opencode-permission-always-forbidden');
    const native = await info(decision === 'reject');
    let journal, intent;
    if (decision === 'reject') {
      journal = new PermissionReplyJournal(permissionReceiptDirectory ||
        join(runtimeStateDirectory(directoryValue),'permission-replies'));
      const identity = { sessionId, permissionId, directory: directoryValue, decision };
      const existing = journal.read(journal.path(identity));
      if (existing) {
        if (existing.nativePid !== native.pid || existing.nativeVersion !== native.version) fail('opencode-permission-receipt-identity-divergent');
        if (existing.state === 'ACKNOWLEDGED') return;
        fail('opencode-permission-outcome-unverified');
      }
      let permission;
      try {
        const pending = (await permissions(directoryValue, { sessionIds: [sessionId] })).filter(item => item.id === permissionId);
        if (pending.length !== 1) fail('opencode-permission-receipt-pending-required');
        permission = pending[0];
      } catch (cause) {
        if (cause.code !== 'opencode-permission-target-invalid') throw cause;
        permission = await shellPermissionForRejection(sessionId, permissionId, directoryValue);
      }
      const checked = await info(true);
      if (checked.pid !== native.pid || checked.version !== native.version) fail('opencode-permission-receipt-identity-divergent');
      const target = permission.permission === 'bash' ? permission.metadata.command : permission.metadata.filepath;
      intent = journal.begin({ ...identity, nativePid: native.pid, nativeVersion: native.version,
        callId: permission.tool?.callID || null, targetDigest: typeof target === 'string'
          ? createHash('sha256').update(JSON.stringify([permission.permission, target])).digest('hex') : null });
      if (intent.replay) return;
    }
    const response = await request(`/api/session/${encodeURIComponent(sessionId)}/permission/${encodeURIComponent(permissionId)}/reply`,
      { method: 'POST', body: { decision }, locationDirectory: directoryValue });
    if (response.status !== 204) fail('opencode-permission-reply-invalid');
    if (journal) {
      let after;
      try { after = await info(true); } catch (cause) {
        throw Object.assign(new Error('opencode-permission-reply-confirmed-identity-unavailable'),
          { code: 'opencode-permission-reply-confirmed-identity-unavailable', replyConfirmed: true, httpStatus: 204, cause });
      }
      if (after.pid !== native.pid || after.version !== native.version) throw Object.assign(new Error('opencode-permission-reply-identity-changed'),
        { code: 'opencode-permission-reply-identity-changed', replyConfirmed: true, httpStatus: 204 });
      try { journal.acknowledge(intent.value); }
      catch (cause) {
        throw Object.assign(new Error('opencode-permission-reply-confirmed-receipt-unavailable'), {
          code: 'opencode-permission-reply-confirmed-receipt-unavailable', replyConfirmed: true, httpStatus: 204, cause });
      }
    }
  }

  function permissionReplies(sessionId, directoryValue = directory, permissionId = undefined) {
    if (typeof directoryValue !== 'string' || !isAbsolute(directoryValue)) fail('opencode-location-invalid');
    const journal = new PermissionReplyJournal(permissionReceiptDirectory ||
      join(runtimeStateDirectory(directoryValue),'permission-replies'));
    return permissionId === undefined ? journal.snapshot(sessionId, directoryValue) : journal.exact(sessionId, directoryValue, permissionId);
  }

  async function mcpRecoverySnapshot() {
    const initial = await info(true), sharedDirectory = await mcpLocation();
    const sessions = [], cursors = new Set(); let cursor;
    for (let page = 0; page < 100; page++) {
      const value = await json('/api/session', { scoped: false, query: { limit: '200', order: cursor === undefined ? 'asc' : undefined, cursor } });
      if (!record(value) || !Array.isArray(value.data) || value.data.length > 200 || !record(value.cursor)) fail('opencode-recovery-observation-invalid');
      for (const item of value.data) {
        if (!record(item) || !/^ses_[A-Za-z0-9_.-]{1,100}$/.test(item.id || '') || sessions.includes(item.id)) fail('opencode-recovery-observation-invalid');
        sessions.push(item.id);
      }
      const next = value.cursor.next;
      if (next === null) break;
      if (page === 99 || typeof next !== 'string' || !next || cursors.has(next)) fail('opencode-recovery-observation-invalid');
      cursors.add(next); cursor = next;
    }
    const active = unwrapData(await json('/api/session/active', { scoped: false }), 'opencode-recovery-observation-invalid');
    const permissions = await json('/api/permission/request', { query: { directory: sharedDirectory } });
    if (!record(active) || Object.entries(active).some(([id, value]) => !/^ses_[A-Za-z0-9_.-]{1,100}$/.test(id) || !record(value) || value.type !== 'running') ||
        !record(permissions) || permissions.location?.directory !== sharedDirectory || !Array.isArray(permissions.data)) fail('opencode-recovery-observation-invalid');
    const final = await info(true);
    if (initial.pid !== final.pid || initial.version !== final.version || await mcpLocation() !== sharedDirectory) fail('opencode-recovery-identity-changed');
    sessions.sort();
    return { pid: initial.pid, version: initial.version, sharedDirectory, sessionCount: sessions.length,
      sessionIdsSha256: createHash('sha256').update(JSON.stringify(sessions)).digest('hex'),
      activeSessionCount: Object.keys(active).length, sharedPermissionCount: permissions.data.length };
  }

  async function connectMcp(serverId, explicitDirectory, { timeout = timeoutMs } = {}) {
    if (!Number.isSafeInteger(timeout) || timeout <= 0) fail('opencode-timeout-invalid');
    if (typeof serverId !== 'string' || !/^[A-Za-z0-9_.-]{1,100}$/.test(serverId)) fail('opencode-mcp-id-invalid');
    const directoryValue = await mcpTarget(explicitDirectory);
    return request(`/api/experimental/mcp/${encodeURIComponent(serverId)}/connect`,
      { method: 'POST', query: { directory: directoryValue }, timeout });
  }

  async function disconnectMcp(serverId, explicitDirectory, { timeout = timeoutMs } = {}) {
    if (!Number.isSafeInteger(timeout) || timeout <= 0) fail('opencode-timeout-invalid');
    if (typeof serverId !== 'string' || !/^[A-Za-z0-9_.-]{1,100}$/.test(serverId)) fail('opencode-mcp-id-invalid');
    const directoryValue = await mcpTarget(explicitDirectory);
    return request(`/api/experimental/mcp/${encodeURIComponent(serverId)}/disconnect`,
      { method: 'POST', query: { directory: directoryValue }, timeout });
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

  async function sessionEventLog(sessionId, directoryValue = directory, { after = '0' } = {}) {
    if (typeof sessionId !== 'string' || !/^ses_[A-Za-z0-9_.-]{1,100}$/.test(sessionId) ||
        typeof directoryValue !== 'string' || !isAbsolute(directoryValue) ||
        typeof after !== 'string' || !/^(?:0|[1-9][0-9]{0,19})$/.test(after)) fail('opencode-session-log-input-invalid');
    await info();
    const url = new URL(`/api/experimental/session/${encodeURIComponent(sessionId)}/log`, origin);
    url.searchParams.set('after', after);url.searchParams.set('follow','false');
    const headers = { accept:'text/event-stream', authorization:await authorization(),
      'x-opencode-directory':directoryValue };
    let response;
    try { response = await fetchImpl(url, { headers, redirect:'error', signal }); }
    catch (cause) { throw Object.assign(new Error('opencode-session-log-unavailable'), { code:'opencode-session-log-unavailable', cause }); }
    if (response.status === 401) { await response.body?.cancel(); fail('opencode-auth-required'); }
    if (!response.ok || !response.body || !(response.headers.get('content-type') || '').toLowerCase().includes('text/event-stream')) {
      await response.body?.cancel(); fail('opencode-session-log-invalid');
    }
    const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',bytes=0;const items=[];let watermark=null,afterSync=false,aggregateID=null;
    const consume=(frame)=>{
      const data=frame.split(/\r?\n/).filter(line=>line.startsWith('data:')).map(line=>line.slice(5).replace(/^ /,'')).join('\n');
      if(!data)return;
      let item;try{item=JSON.parse(data);if(typeof item==='string')item=JSON.parse(item);}catch{fail('opencode-session-log-invalid');}
      if(!record(item)||typeof item.type!=='string')fail('opencode-session-log-invalid');
      if(item.type==='log.synced'){
        if(afterSync||item.aggregateID!==sessionId||!Number.isSafeInteger(item.seq)||item.seq<Number(after)||
            (aggregateID!==null&&aggregateID!==item.aggregateID))fail('opencode-session-log-invalid');
        watermark={aggregateID:item.aggregateID,seq:item.seq};afterSync=true;return;
      }
      if(afterSync)fail('opencode-session-log-invalid');
      if(!record(item.durable)||item.durable.aggregateID!==sessionId||
          !Number.isSafeInteger(item.durable.seq)||item.durable.seq<1||
          item.durable.seq<=Number(after))fail('opencode-session-log-invalid');
      if(aggregateID!==null&&aggregateID!==item.durable.aggregateID)fail('opencode-session-log-invalid');
      aggregateID=item.durable.aggregateID;
      if(items.length>=SESSION_LOG_EVENT_LIMIT)fail('opencode-session-log-limit');
      const dataValue=record(item.data)?item.data:{};
      if(dataValue.sessionID!==undefined&&dataValue.sessionID!==sessionId)fail('opencode-session-log-session-divergent');
      if(!['session.tool.called','session.tool.success','session.tool.failed'].includes(item.type))return;
      let inputDigest=null;
      if(record(dataValue.input)){try{inputDigest=nativeToolInputDigest(dataValue.input);}catch{}}
      const error=record(dataValue.error)?dataValue.error:null,metadata=record(dataValue.metadata)?dataValue.metadata:{};
      const contentDigest=Array.isArray(dataValue.content)?createHash('sha256').update(JSON.stringify(dataValue.content)).digest('hex'):null;
      items.push({type:item.type,sequence:item.durable.seq,sessionId,callId:dataValue.id||null,
        messageId:dataValue.assistantMessageID||null,toolName:dataValue.name||null,inputDigest,
        executed:typeof dataValue.executed==='boolean'?dataValue.executed:null,
        error:error?{type:typeof error.type==='string'?error.type:null,status:Number.isInteger(error.status)?error.status:null}:null,
        metadata:{status:typeof metadata.status==='string'?metadata.status:null,exit:Number.isInteger(metadata.exit)?metadata.exit:null},
        contentDigest});
    };
    try{
      for(;;){
        const next=await reader.read();if(next.done)break;
        bytes+=next.value.byteLength;if(bytes>SESSION_LOG_LIMIT){await reader.cancel();fail('opencode-session-log-too-large');}
        pending+=decoder.decode(next.value,{stream:true});const frames=pending.split(/\r?\n\r?\n/);pending=frames.pop()||'';
        for(const frame of frames)consume(frame);
      }
      pending+=decoder.decode();if(pending.trim())consume(pending);
    }catch(cause){try{await reader.cancel();}catch{};throw cause;}
    if(!watermark)fail('opencode-session-log-watermark-missing');
    const maxSeq=items.reduce((max,item)=>Math.max(max,item.sequence),Number(after));
    if(watermark.aggregateID!==sessionId||watermark.seq<Number(after)||watermark.seq<maxSeq)fail('opencode-session-log-watermark-invalid');
    return {sessionId,after,watermark,events:items};
  }

  async function shellInfo(shellId, directoryValue = directory) {
    if (!/^sh_[A-Za-z0-9]{1,100}$/.test(shellId || '')) fail('opencode-shell-id-invalid');
    const envelope = await json('/api/shell/' + encodeURIComponent(shellId), {query:{directory:directoryValue}});
    const value = envelope?.data;
    if (envelope?.location?.directory !== directoryValue || !record(value) || value.id !== shellId ||
        !['running','exited','timeout','killed'].includes(value.status) || typeof value.command !== 'string' ||
        value.cwd !== directoryValue || !Number.isFinite(value.time?.started) ||
        value.status !== 'running' && (!Number.isFinite(value.time?.completed) || value.time.completed < value.time.started) ||
        value.exit !== undefined && !Number.isInteger(value.exit) ||
        value.metadata?.sessionID !== undefined && typeof value.metadata.sessionID !== 'string') fail('opencode-shell-info-invalid');
    return {shellId:value.id,status:value.status,command:value.command,cwd:value.cwd,
      sessionId:value.metadata?.sessionID ?? null,startedAt:value.time.started,
      finishedAt:value.time.completed ?? null,exit:value.exit ?? null};
  }

  return Object.freeze({ info, location, mcp, shellInfo, listSessions, session, activeSessions, sessionStatus, messages, message, permissions, sessionEventLog,
    sourceRead, sourceList, sourceFind,
    providerList, modelList, createSession, createProbeSession, sharedMcpDirectory: mcpLocation, prompt, switchModel,
    providerKeyContract, integrationConnection, connectProviderKey,
    replyPermission, permissionReplies, connectMcp, disconnectMcp, mcpRecoverySnapshot, nativePermissionPolicy,
    nativePermissionRepairPlan, revokeSavedNativePermissions,configureNativeReads, events, request: json });
}

export function createOpenCodeV2ClientFromEnv({ directory, baseUrl, fetchImpl = fetch, signal } = {}) {
  return createOpenCodeV2Client({
    baseUrl: baseUrl || envValue('OC_Codex_OPENCODE_URL') || 'http://127.0.0.1:4096',
    directory,
    passwordFile: envValue('OC_Codex_OPENCODE_PASSWORD_FILE'),
    fetchImpl, signal,
  });
}
