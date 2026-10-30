export const VERSION = '2.1.30';

export function nativeAskState(session, kind) {
  if (!Array.isArray(session?.permission) || session.permission.some(rule =>
      !rule || typeof rule.permission !== 'string' || !rule.permission ||
      typeof rule.pattern !== 'string' || !['ask','allow','deny'].includes(rule.action))) {
    return {valid:false,action:null,universal:false,ruleIndex:null};
  }
  if (kind === 'bash' && session.permission.some(rule => rule.permission === 'shell')) kind = 'shell';
  const matches = pattern => new RegExp(`^${pattern.split('').map(character =>
    character === '*' ? '.*' : character === '?' ? '.' :
      character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("")}$`).test(kind);
  // Une règle finale globale ask couvre aussi les cibles spécifiques antérieures.
  const ruleIndex=session.permission.findLastIndex(rule=>matches(rule.permission));
  const last=session.permission[ruleIndex];
  return {valid:true,action:last?.action ?? null,universal:last?.pattern === '*',ruleIndex:ruleIndex < 0 ? null : ruleIndex};
}

export function hasNativeAsk(session,kind,actions=['ask']) {
  const state=nativeAskState(session,kind);
  return state.valid && state.universal && actions.includes(state.action);
}
