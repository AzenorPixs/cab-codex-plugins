export const VERSION = '2.1.30';
export const CONTEXT_PORTABILITY_ID = 'cab-context-portability';
const fail = code => { throw Object.assign(new Error(code), {code}); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(value);

export function validatePortabilityRules(input) {
  if (!object(input) || input.schemaVersion !== 1 || !Number.isSafeInteger(input.expectedPid) || input.expectedPid < 1 ||
      !Array.isArray(input.rules) || !input.rules.length || input.rules.length > 32) fail('cab-context-rules-invalid');
  const sessions = new Set();
  const rules = input.rules.map(rule => {
    if (!object(rule) || !['sessionId','providerID','modelID','connectionId'].every(key => identifier(rule[key])) ||
        !Array.isArray(rule.staleMessageIds) || !rule.staleMessageIds.length || rule.staleMessageIds.length > 8192 ||
        !rule.staleMessageIds.every(identifier) || new Set(rule.staleMessageIds).size !== rule.staleMessageIds.length ||
        sessions.has(rule.sessionId)) fail('cab-context-rule-invalid');
    sessions.add(rule.sessionId);
    return Object.freeze({sessionId:rule.sessionId,providerID:rule.providerID,modelID:rule.modelID,
      connectionId:rule.connectionId,staleMessageIds:Object.freeze([...rule.staleMessageIds])});
  });
  return Object.freeze({schemaVersion:1,expectedPid:input.expectedPid,rules:Object.freeze(rules)});
}

export function projectPortableContext(event, rule) {
  if (event.sessionID !== rule.sessionId || event.model?.providerID !== rule.providerID || event.model?.id !== rule.modelID) return false;
  if (!Array.isArray(event.messages)) fail('cab-context-messages-invalid');
  const stale = new Set(rule.staleMessageIds);
  event.messages = event.messages.map(message => {
    if (message.role !== 'assistant' || !stale.has(message.id)) return message;
    if (!Array.isArray(message.content)) fail('cab-context-message-invalid');
    return {...message,content:message.content.flatMap(part => {
      if (!object(part)) fail('cab-context-part-invalid');
      if (part.type === 'reasoning') return [];
      if (!Object.hasOwn(part,'providerMetadata')) return [part];
      const copy = {...part};
      delete copy.providerMetadata;
      return [copy];
    })};
  });
  return true;
}

export function createContextPortabilityPlugin(configuration) {
  const config = validatePortabilityRules(configuration);
  return {id:CONTEXT_PORTABILITY_ID,async setup(context) {
    if (process.pid !== config.expectedPid) fail('cab-context-process-changed');
    const registrations = [];
    const hook = async event => {
      const rule = config.rules.find(rule => event.sessionID === rule.sessionId &&
        event.model?.providerID === rule.providerID && event.model?.id === rule.modelID);
      if (!rule) return;
      const active = await context.integration.connection.active(rule.providerID);
      if (active?.type !== 'credential' || active.id !== rule.connectionId) fail('cab-context-connection-changed');
      projectPortableContext(event,rule);
    };
    try {
      for (const kind of ['context','generate','compaction']) registrations.push(await context.session.hook(kind,hook));
    } catch (cause) {
      await Promise.all(registrations.map(registration => registration.dispose()));
      throw cause;
    }
    return async () => { await Promise.all(registrations.map(registration => registration.dispose())); };
  }};
}
