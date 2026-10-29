import { constants, closeSync, fstatSync, openSync, readSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

export const VERSION = '2.1.10';
export const MODEL_SELECTION_PROTOCOL = 'pllm-auto-v1';
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const identifier = (value) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(value);
const modelId = (value) => typeof value === 'string' && /^[A-Za-z0-9_./:-]{1,300}$/.test(value);
const stamp = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fail(code, status = 409) { throw Object.assign(new Error(code), { code, status }); }

export function readModelCatalog(environment = process.env) {
  const path = Object.hasOwn(environment, 'OC_Codex_PLLM_CATALOG') ? environment.OC_Codex_PLLM_CATALOG : environment.OC_CGPT_PLLM_CATALOG;
  if (typeof path !== 'string' || !isAbsolute(path) || basename(path) !== 'pllm-current.json') fail('pllm-catalog-unconfigured');
  let fd;
  try {
    if (realpathSync(dirname(path)) !== dirname(path)) fail('pllm-catalog-unavailable');
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > 2 * 1024 * 1024) fail('pllm-catalog-unavailable');
    const buffer = Buffer.alloc(2 * 1024 * 1024 + 1);
    const size = readSync(fd, buffer, 0, buffer.length, null);
    if (size > 2 * 1024 * 1024) fail('pllm-catalog-unavailable');
    const value = JSON.parse(buffer.subarray(0,size).toString('utf8'));
    return value;
  } catch { fail('pllm-catalog-unavailable'); }
  finally { if (fd !== undefined) closeSync(fd); }
}

function validateCatalog(catalog, now) {
  const policyCount = catalog?.schema_version === 2 ? 6 : catalog?.schema_version === 3 ? 7 : 0;
  if (!object(catalog) || policyCount === 0 || !stamp(catalog.evaluated_at) || !stamp(catalog.published_at) ||
    !['selected','no_valid_model'].includes(catalog.selection_status) || !Array.isArray(catalog.models) || catalog.models.length !== policyCount ||
    catalog.models.some((entry) => !object(entry) || !Number.isInteger(entry.priority) || entry.priority < 1 || entry.priority > policyCount ||
      entry.mode !== 'mode'+entry.priority || !['Valide','Invalide'].includes(entry.state)) ||
    new Set(catalog.models.map((entry) => entry.priority)).size !== policyCount || Date.parse(catalog.evaluated_at) > now ||
    Date.parse(catalog.published_at) < Date.parse(catalog.evaluated_at) || Date.parse(catalog.published_at) > now) fail('pllm-catalog-invalid');
  const selected = catalog.models.filter((entry) => entry.selected === true);
  if (catalog.selection_status === 'no_valid_model') fail('pllm-no-valid-model');
  if (selected.length !== 1 || selected[0].mode !== catalog.selected_mode || selected[0].state !== 'Valide' ||
    selected[0].evaluated_this_run !== true) fail('pllm-catalog-invalid');
}

export function prepareControllerModelPolicy({ environment = {}, activeSkillRoot, now = Date.now() } = {}) {
  if (!object(environment)) fail('pllm-catalog-unconfigured');
  let path, source;
  if (Object.hasOwn(environment,'OC_Codex_PLLM_CATALOG')) { path=environment.OC_Codex_PLLM_CATALOG;source='configured'; }
  else if (Object.hasOwn(environment,'OC_CGPT_PLLM_CATALOG')) { path=environment.OC_CGPT_PLLM_CATALOG;source='legacy-alias'; }
  else {
    if (typeof activeSkillRoot !== 'string' || !isAbsolute(activeSkillRoot) || resolve(activeSkillRoot)!==activeSkillRoot) fail('pllm-catalog-unconfigured');
    path=join(activeSkillRoot,'data','pllm-current.json');source='active-skill';
  }
  const patch={OC_Codex_PLLM_CATALOG:path};const catalog=readModelCatalog(patch);validateCatalog(catalog,now);
  return { catalogPath:path, source, environment:patch };
}

export function catalogProviderID(logical, providers) {
  if (!identifier(logical)) fail('pllm-model-identity-invalid');
  if (!object(providers) || !Array.isArray(providers.all)) fail('model-provider-observation-invalid');
  const exact=providers.all.filter(item=>item?.id===logical);
  if (exact.length>1) fail('model-provider-ambiguous');
  if (exact.length===1 || logical!=='opencodego') return logical;
  const native=providers.all.filter(item=>item?.id==='opencode-go');
  if (native.length>1) fail('model-provider-ambiguous');
  return native.length===1?'opencode-go':logical;
}

function observedReasoning(user, info) {
  const parent=[user?.variant,user?.model?.variant].filter(value=>value!==undefined);
  if (!parent.length) return null;
  const values=[...parent,...(info?.variant===undefined?[]:[info.variant])];
  return values.every(value=>identifier(value)&&value===parent[0])?parent[0]:null;
}

export function selectCodingModel({ catalog, providers, model, reasoning, unavailable = [], now = Date.now() }) {
  if (!object(providers) || !Array.isArray(providers.all) || !Array.isArray(providers.connected)) fail('model-provider-observation-invalid');
  if (reasoning !== undefined && !identifier(reasoning)) fail('model-reasoning-invalid', 400);
  let candidates;
  if (model !== undefined) {
    if (typeof model !== 'string' || !model.includes('/')) fail('model-selector-invalid', 400);
    const slash = model.indexOf('/'); const providerID = model.slice(0,slash); const modelID = model.slice(slash+1);
    if (!identifier(providerID) || !modelId(modelID)) fail('model-selector-invalid', 400);
    candidates = [{ provider: providerID, model_id: modelID, mode: null, priority: null, evaluated_at: null }];
  } else {
    validateCatalog(catalog,now);
    candidates = [...catalog.models].sort((a,b) => a.priority-b.priority);
  }
  let historical = false;
  for (const entry of candidates) {
    if (model === undefined && (entry.evaluated_this_run !== true || !stamp(entry.evaluated_at) ||
        Date.parse(entry.evaluated_at) > Date.parse(catalog.published_at))) { historical = true; continue; }
    if (model === undefined && entry.state !== 'Valide') continue;
    const logicalProviderID = entry.provider; const providerID = model === undefined ? catalogProviderID(logicalProviderID,providers) : logicalProviderID; const modelID = entry.model_id || entry.model;
    if (!identifier(providerID) || !modelId(modelID)) fail('pllm-model-identity-invalid');
    const matches=providers.all.filter(item=>item?.id===providerID);
    if(matches.length>1) fail('model-provider-ambiguous');
    const provider = matches[0];
    const candidate = object(provider?.models) ? provider.models[modelID] : null;
    if (!providers.connected.includes(providerID)) fail(model === undefined ? 'model-provider-unavailable' : 'explicit-model-unavailable');
    if (!candidate || !object(candidate.variants)) fail(model === undefined ? 'model-capabilities-unavailable' : 'explicit-model-unavailable');
    const variants = candidate?.variants;
    const effort = (reasoning ? [reasoning] : ['medium', 'high']).find((name) => object(variants) &&
      Object.hasOwn(variants,name) && object(variants[name]) && variants[name].disabled !== true &&
      !unavailable.some((proof) => proof.providerID === providerID && proof.modelID === modelID && proof.reasoning === name));
    if (candidate.disabled === true || !effort) {
      if (model !== undefined) fail('explicit-model-unavailable');
      continue;
    }
    return { protocol: MODEL_SELECTION_PROTOCOL, source: model === undefined ? 'pllm-automatic' : 'prompt',
      providerID, modelID, reasoning: effort, mode: entry.mode, priority: entry.priority,
      ...(model === undefined ? { logicalProviderID } : {}),
      evaluatedAt: entry.evaluated_at, selectedAt: new Date(now).toISOString(),
      catalogDigest: model === undefined ? digest(catalog) : null,
      ...(unavailable.length ? { unavailabilityProofs: unavailable.map((proof) => ({ ...proof })) } : {}) };
  }
  fail(historical ? 'pllm-lower-policy-evaluation-required' : 'pllm-no-compatible-model');
}

export function validCodingModel(value) {
  return object(value) && Object.keys(value).every((key) => ['protocol','source','providerID','modelID','reasoning','mode',
    'priority','evaluatedAt','selectedAt','catalogDigest','preflight','unavailabilityProofs','logicalProviderID'].includes(key)) &&
    value.protocol === MODEL_SELECTION_PROTOCOL && ['prompt','pllm-automatic'].includes(value.source) &&
    (value.logicalProviderID === undefined || (value.source === 'pllm-automatic' && identifier(value.logicalProviderID))) &&
    identifier(value.providerID) && modelId(value.modelID) && identifier(value.reasoning) && stamp(value.selectedAt) &&
    (value.source === 'prompt' ? value.mode === null && value.priority === null && value.catalogDigest === null && value.evaluatedAt === null :
      Number.isInteger(value.priority) && value.priority >= 1 && value.priority <= 7 && value.mode === 'mode'+value.priority &&
      stamp(value.evaluatedAt) && /^[a-f0-9]{64}$/.test(value.catalogDigest)) &&
    (value.unavailabilityProofs === undefined || (Array.isArray(value.unavailabilityProofs) && value.unavailabilityProofs.length <= 12 &&
      value.unavailabilityProofs.every((proof) => object(proof) && Object.keys(proof).every((key) =>
        ['providerID','modelID','reasoning','sessionId','messageId','observedAt'].includes(key)) && identifier(proof.providerID) &&
        modelId(proof.modelID) && identifier(proof.reasoning) && identifier(proof.sessionId) && identifier(proof.messageId) && stamp(proof.observedAt)))) &&
    object(value.preflight) && Object.keys(value.preflight).every((key) => ['sessionId','messageId','verifiedAt'].includes(key)) &&
    identifier(value.preflight.sessionId) && identifier(value.preflight.messageId) && stamp(value.preflight.verifiedAt);
}

export function reasoningUnavailability({ session, response, parent, workspace, now = Date.now(), notBefore = null }) {
  const info = response?.info; const user = parent?.info;
  const error = info?.error;
  const reasoning=observedReasoning(user,info);
  let detail;
  try {
    if (error?.name !== 'APIError' || error.data?.statusCode !== 400 || typeof error.data.responseBody !== 'string' ||
      Buffer.byteLength(error.data.responseBody) > 65536) fail('model-unavailability-not-proved');
    detail = JSON.parse(error.data.responseBody)?.error;
  } catch { fail('model-unavailability-not-proved'); }
  if (!object(detail) || !['unsupported_value','unsupported_parameter','invalid_reasoning_effort','unsupported_reasoning'].includes(detail.code) ||
    !['reasoning.effort','reasoning_effort','reasoningEffort','variant'].includes(detail.param) ||
    !session || session.directory !== workspace || !identifier(session.id) || info.role !== 'assistant' ||
    !identifier(info.id) || info.sessionID !== session.id || !identifier(info.providerID) || !modelId(info.modelID) ||
    !Number.isFinite(info.time?.completed) || info.time.completed > now ||
    (notBefore && info.time.completed < Date.parse(notBefore)) ||
    !user || user.role !== 'user' || user.id !== info.parentID || user.sessionID !== session.id ||
    user.model?.providerID !== info.providerID || user.model?.modelID !== info.modelID || !reasoning ||
    !Array.isArray(response.parts) || response.parts.some((part) => part.type === 'tool')) fail('model-unavailability-not-proved');
  return { providerID: info.providerID, modelID: info.modelID, reasoning,
    sessionId: session.id, messageId: info.id, observedAt: new Date(info.time.completed).toISOString() };
}

export function verifyModelPreflight(selection, { session, response, parent, workspace, now = Date.now() }) {
  const info = response?.info; const user = parent?.info;
  const legacyParent = user?.model?.providerID === selection.providerID &&
    user.model.modelID === selection.modelID && observedReasoning(user, info) === selection.reasoning;
  const sessionModelMatches = session?.model === undefined || (session.model.providerID === selection.providerID &&
    session.model.modelID === selection.modelID && session.model.variant === selection.reasoning);
  const nativeParent = session?.model !== undefined && sessionModelMatches && user?.model === undefined && user?.variant === undefined &&
    info?.nativeSingleExchange === true && info.model?.providerID === selection.providerID &&
    info.model?.modelID === selection.modelID && info.model?.variant === selection.reasoning &&
    info.variant === selection.reasoning && Number.isFinite(user?.time?.created) &&
    user.time.created >= 0 && user.time.created <= info.time?.completed;
  if (!session || session.directory !== workspace || !identifier(session.id) || !info || info.role !== 'assistant' ||
      !identifier(info.id) || info.sessionID !== session.id || info.providerID !== selection.providerID || info.modelID !== selection.modelID ||
      info.error || info.finish !== 'stop' || !Number.isFinite(info.time?.completed) || info.time.completed < 0 || info.time.completed > now ||
      (selection.evaluatedAt && info.time.completed < Date.parse(selection.evaluatedAt)) ||
      !user || user.role !== 'user' || user.id !== info.parentID || user.sessionID !== session.id ||
      !sessionModelMatches || (!legacyParent && !nativeParent) ||
      !Array.isArray(response.parts) || response.parts.some((part) => part.type === 'tool') ||
      !response.parts.some((part) => part.type === 'text' && typeof part.text === 'string' && part.text.trim())) fail('model-preflight-not-proved');
  return { ...selection, preflight: { sessionId: session.id, messageId: info.id, verifiedAt: new Date(now).toISOString() } };
}
