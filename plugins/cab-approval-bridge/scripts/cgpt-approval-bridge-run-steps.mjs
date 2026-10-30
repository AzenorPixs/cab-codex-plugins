export const VERSION = '2.1.15';
export const HISTORY_LIMIT = 100;
export const STEP_STATUSES = Object.freeze(['IN_PROGRESS', 'ALREADY_COVERED', 'NOT_APPLICABLE']);
export const RUN_STEPS = Object.freeze([
  ['INITIALIZATION', 'Initialisation'], ['PREFLIGHT', 'Prévol'], ['ANALYSIS', 'Analyse'],
  ['SCOPING', 'Cadrage'], ['SPECIFICATION', 'Spécification'], ['IMPLEMENTATION', 'Implémentation'],
  ['VERIFICATION', 'Vérifications'], ['REVIEW', 'Revue'], ['ARCHIVING', 'Archivage'],
  ['STATISTICS', 'Statistiques'], ['CLOSURE', 'Clôture'],
].map(([id, name], index) => Object.freeze({ id, name, position: index + 1, total: 11 })));

export const stepDefinition = (id) => RUN_STEPS.find((step) => step.id === id) || null;
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const only = (value, keys) => Object.keys(value).every((key) => keys.includes(key));
const timestamp = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

export function validLifecycle(value) {
  if (!record(value) || !only(value, ['schemaVersion', 'sequence', 'history']) || value.schemaVersion !== 1 ||
      !Number.isSafeInteger(value.sequence) || value.sequence < 1 || !Array.isArray(value.history) ||
      !value.history.length || value.history.length > HISTORY_LIMIT || value.history.length > value.sequence) return false;
  return value.history.every((entry, index) => record(entry) && only(entry, ['sequence', 'id', 'status', 'at']) &&
    entry.sequence === value.sequence - value.history.length + index + 1 && Boolean(stepDefinition(entry.id)) &&
    STEP_STATUSES.includes(entry.status) && timestamp(entry.at));
}

export function nextLifecycle(previous, id, status = 'IN_PROGRESS', expectedSequence, at = new Date().toISOString()) {
  if (!stepDefinition(id) || !STEP_STATUSES.includes(status) || !Number.isSafeInteger(expectedSequence) ||
      expectedSequence < 0 || !timestamp(at) || (previous !== undefined && !validLifecycle(previous))) {
    throw new Error('invalid-lifecycle-step');
  }
  const sequence = previous?.sequence || 0;
  const last = previous?.history.at(-1);
  if (last?.id === id && last.status === status && [sequence, sequence - 1].includes(expectedSequence)) return previous;
  if (expectedSequence !== sequence) throw new Error('lifecycle-step-sequence-stale');
  if (sequence === Number.MAX_SAFE_INTEGER) throw new Error('lifecycle-step-sequence-exhausted');
  return { schemaVersion: 1, sequence: sequence + 1,
    history: [...(previous?.history || []), { sequence: sequence + 1, id, status, at }].slice(-HISTORY_LIMIT) };
}

export function publicLifecycle(value) {
  return validLifecycle(value) ? { schemaVersion: 1, sequence: value.sequence, history: value.history.map((entry) => ({ ...entry })) } : null;
}

export function lifecycleView(value) {
  if (!validLifecycle(value)) return { current: null, history: [], sequence: 0, truncated: false };
  const history = value.history.map((entry) => ({ ...entry, ...stepDefinition(entry.id) }));
  return { current: history.at(-1), history, sequence: value.sequence, truncated: value.sequence > history.length };
}
