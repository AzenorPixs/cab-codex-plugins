import { constants, closeSync, existsSync, fstatSync, openSync, readFileSync, realpathSync } from 'node:fs';
import { mkdir, open, rename, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';

export const VERSION = "1.6.1";
export const CATEGORIES = ['reservation', 'changes', 'native', 'nativeChanges'];
const DAY = 86400000;
const LIMIT = 64 * 1024 * 1024;
const id = v => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(v) &&
  !['__proto__', 'constructor', 'prototype'].includes(v);
const time = v => Number.isSafeInteger(v) && v >= 0;
const keys = (v, allowed) => v && typeof v === 'object' && !Array.isArray(v) &&
  Object.keys(v).every(k => allowed.includes(k));
const contextId = v => v === null || (Number.isSafeInteger(v) && v > 0);
const preflight = c => /^cismp\d*-preflight(?:-|$)/.test(c);
const business = c => !preflight(c) && !/^(rsmp-|inventory-)/.test(c);
const contextKey = c => JSON.stringify([c.runId, c.contextId, c.changeId]);
const eventKey = e => [e.runId, e.contextId, e.changeId, e.kind, e.id].join('\0');
const fail = code => { const error = new Error(code); error.code = code; error.status = 400; throw error; };
const bucket = () => ({ monoMs: 0, multiMs: 0, zeroMs: 0, unknownMs: 0, exactlyTwoMs: 0, threeOrMoreMs: 0 });
const canonical = v => JSON.stringify(v, (_, x) => x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
export const digest = v => createHash('sha256').update(canonical(v)).digest('hex');
function validContext(c) {
  return keys(c, ['runId', 'contextId', 'changeId', 'sessionId', 'state', 'phase', 'firstAt', 'lastAt', 'closedAt']) &&
    id(c.runId) && contextId(c.contextId) && id(c.changeId) && (c.sessionId === null || id(c.sessionId)) &&
    ['RESERVED', 'DELIVERED', 'ABANDONED'].includes(c.state) && ['WORK', 'REPORT'].includes(c.phase) &&
    time(c.firstAt) && time(c.lastAt) && c.lastAt >= c.firstAt &&
    (c.closedAt === null || (time(c.closedAt) && c.closedAt >= c.firstAt && c.closedAt <= c.lastAt && c.state === 'DELIVERED'));
}
function validInterval(s) {
  return keys(s, ['from', 'to', 'registryKnown', 'nativeAvailable', 'scopeRunIds', 'integrationOwner', 'contexts', 'globalCause']) &&
    time(s.from) && time(s.to) && s.to > s.from && typeof s.registryKnown === 'boolean' &&
    typeof s.nativeAvailable === 'boolean' && Array.isArray(s.scopeRunIds) &&
    s.scopeRunIds.length <= 1000 && s.scopeRunIds.every(id) && new Set(s.scopeRunIds).size === s.scopeRunIds.length &&
    (s.integrationOwner === null || id(s.integrationOwner)) &&
    (s.globalCause === undefined || s.globalCause === null || ['GLOBAL_RECONCILIATION','SHARED_MAINTENANCE','GLOBAL_PAUSE','GLOBAL_STOP'].includes(s.globalCause)) &&
    Array.isArray(s.contexts) && s.contexts.length <= 1000 &&
    new Set(s.contexts.map(contextKey)).size === s.contexts.length &&
    new Set(s.contexts.map(c => c.runId)).size === s.contexts.length &&
    s.contexts.every(c => keys(c, ['runId', 'contextId', 'changeId', 'sessionId', 'nativeType', 'queue', 'stale', 'resource']) &&
      id(c.runId) && s.scopeRunIds.includes(c.runId) && contextId(c.contextId) && id(c.changeId) &&
      (c.sessionId === null || id(c.sessionId)) && [null, 'idle', 'busy', 'retry'].includes(c.nativeType) &&
      (c.queue === null || typeof c.queue === 'boolean') && (c.stale === null || typeof c.stale === 'boolean') &&
      (c.resource === undefined || c.resource === null || (keys(c.resource, ['waiting','held','exclusive','issued','promotion']) &&
        ['waiting','held','exclusive','issued','promotion'].every((key) => typeof c.resource[key] === 'boolean'))));
}
function validEvent(e) {
  return keys(e, ['id', 'runId', 'contextId', 'changeId', 'at', 'kind', 'status', 'name', 'durationMs']) &&
    id(e.id) && id(e.runId) && contextId(e.contextId) && id(e.changeId) && time(e.at) &&
    ['request', 'decision', 'once', 'technical-error', 'http-failure', 'message', 'tool', 'generation', 'change-observed'].includes(e.kind) &&
    [null, 'approved', 'rejected', 'needs_clarification', 'user', 'assistant', 'pending', 'running', 'completed', 'error'].includes(e.status) &&
    (e.name === null || ['bash', 'edit', 'write', 'read', 'apply_patch', 'glob', 'grep', 'webfetch', 'websearch', 'cab-mcp', 'other'].includes(e.name)) &&
    (e.durationMs === null || time(e.durationMs));
}
function validQuota(q) {
  return keys(q, ['at', 'accountFingerprint', 'windowDurationMins', 'usedPercent', 'resetsAt']) &&
    time(q.at) && /^[a-f0-9]{16}$/.test(q.accountFingerprint) && q.windowDurationMins === 10080 &&
    typeof q.usedPercent === 'number' && Number.isFinite(q.usedPercent) && q.usedPercent >= 0 && q.usedPercent <= 100 &&
    Number.isSafeInteger(q.resetsAt) && q.resetsAt > 0;
}
function validEvidence(e) {
  return keys(e, ['id', 'changeId', 'at', 'sha256', 'utf8', 'lf', 'sections']) &&
    id(e.id) && (e.changeId === null || id(e.changeId)) && time(e.at) && /^[a-f0-9]{64}$/.test(e.sha256) &&
    typeof e.utf8 === 'boolean' && typeof e.lf === 'boolean' && Number.isSafeInteger(e.sections) && e.sections >= 0;
}
export function validateBundle(b, project = b?.project) {
  if (!keys(b, ['schemaVersion', 'sourceId', 'datasetId', 'project', 'firstAt', 'lastAt', 'pollMs', 'gapMs', 'intervals', 'events', 'catalog', 'quota', 'evidence']) ||
      b.schemaVersion !== 1 || !id(b.sourceId) || b.sourceId === 'native' || !id(b.datasetId) ||
      typeof b.project !== 'string' || !b.project.startsWith('/') || b.project !== resolve(b.project) || b.project !== project ||
      !time(b.firstAt) || !time(b.lastAt) || b.lastAt < b.firstAt || !time(b.pollMs) || !time(b.gapMs) ||
      b.pollMs < 1 || b.gapMs < b.pollMs ||
      !['intervals', 'events', 'catalog', 'quota', 'evidence'].every(k => Array.isArray(b[k]) && b[k].length <= 200000) ||
      !b.intervals.every(validInterval) || !b.events.every(validEvent) || !b.catalog.every(validContext) ||
      !b.quota.every(validQuota) || !b.evidence.every(validEvidence) || Buffer.byteLength(canonical(b)) > LIMIT) fail('observation-bundle-invalid');
  let end = b.firstAt;
  for (const s of b.intervals) {
    if (s.from < end || s.to > b.lastAt) fail('observation-interval-invalid');
    end = s.to;
  }
  if (b.events.some(e => e.at < b.firstAt || e.at > b.lastAt) ||
      b.catalog.some(c => c.firstAt < b.firstAt || c.lastAt > b.lastAt) ||
      new Set(b.catalog.map(contextKey)).size !== b.catalog.length) fail('observation-bounds-invalid');
  return b;
}
export function safeRead(path, maxBytes = LIMIT) {
  const full = resolve(path);
  if (realpathSync(dirname(full)) !== dirname(full)) fail('observation-parent-invalid');
  const fd = openSync(full, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > maxBytes) fail('observation-file-invalid');
    return readFileSync(fd, 'utf8');
  } finally { closeSync(fd); }
}
function parentSafe(path) {
  let existing = resolve(path);
  while (!existsSync(existing) && dirname(existing) !== existing) existing = dirname(existing);
  if (realpathSync(existing) !== existing) fail('observation-parent-invalid');
}
function appendSegment(list, segment) {
  if (segment.to <= segment.from) return;
  const previous = list.at(-1);
  if (previous && previous.to === segment.from &&
      canonical({ ...previous, from: 0, to: 0 }) === canonical({ ...segment, from: 0, to: 0 })) previous.to = segment.to;
  else list.push(structuredClone(segment));
}
export { appendSegment };
export class ObservationStatistics {
  constructor(directory, { now = Date.now, persist = true, project = null } = {}) {
    this.now = now; this.persist = persist; this.project = project;
    this.path = join(directory, 'controller-observations.json');
    this.error = null; this.dirty = false; this.saving = null;
    this.importing = Promise.resolve();
    this.data = { schemaVersion: 2, project, native: { firstAt: now(), lastAt: now(), intervals: [], events: [], catalog: [] }, datasets: [] };
    if (persist) {
      try {
        parentSafe(directory);
        const data = JSON.parse(safeRead(this.path));
        if (!keys(data, ['schemaVersion', 'project', 'native', 'datasets']) || data.schemaVersion !== 2 ||
            typeof data.project !== 'string' || !data.project.startsWith('/') || data.project !== resolve(data.project) ||
            (project !== null && data.project !== project) ||
            !keys(data.native, ['firstAt', 'lastAt', 'intervals', 'events', 'catalog']) ||
            !time(data.native.firstAt) || !time(data.native.lastAt) || data.native.lastAt < data.native.firstAt ||
            !Array.isArray(data.datasets) || data.datasets.length > 1000) fail('observation-store-invalid');
        const check = { schemaVersion: 1, sourceId: 'native-check', datasetId: 'native-check', project: project || '/unbound',
          pollMs: 5000, gapMs: 15000, quota: [], evidence: [], ...data.native };
        validateBundle(check);
        for (const entry of data.datasets) {
          if (!keys(entry, ['hash', 'bundle']) || !/^[a-f0-9]{64}$/.test(entry.hash) ||
              digest(validateBundle(entry.bundle, project || entry.bundle.project)) !== entry.hash) fail('observation-store-invalid');
        }
        if (new Set(data.datasets.map(e => e.bundle.sourceId + ':' + e.bundle.datasetId)).size !== data.datasets.length) fail('observation-store-invalid');
        this.data = data;
        this.project = data.project;
      } catch (error) { if (error.code !== 'ENOENT') this.error = 'observation-restoration-invalid'; }
    }
    this.eventsById = new Map(this.data.native.events.map((e) => [eventKey(e), e]));
    this.lastTrimAt = 0;
  }
  bind(project) {
    if (this.project && this.project !== project) fail('observation-project-mismatch');
    this.project = project; this.data.project = project;
  }
  recordInterval(segment) {
    if (!validInterval(segment)) fail('observation-interval-invalid');
    const native = this.data.native;
    if (segment.from < (native.intervals.at(-1)?.to ?? native.firstAt)) fail('observation-interval-overlap');
    appendSegment(native.intervals, segment); native.lastAt = segment.to;
    this.trim(); this.dirty = true;
  }
  catalog(run, at = this.now()) {
    if (!id(run.runId) || !id(run.changeId) || !contextId(run.contextId) || !time(at)) return;
    const c = this.data.native.catalog.find(c => contextKey(c) === contextKey(run));
    const update = { runId: run.runId, contextId: run.contextId, changeId: run.changeId,
      sessionId: id(run.sessionId) ? run.sessionId : null, state: run.state, phase: run.phase || 'WORK',
      firstAt: c?.firstAt ?? at, lastAt: at, closedAt: c?.closedAt ?? null };
    if (c?.state === 'RESERVED' && run.state === 'DELIVERED') update.closedAt = at;
    if (!validContext(update)) return;
    if (c) Object.assign(c, update); else this.data.native.catalog.push(update);
    this.data.native.lastAt = Math.max(this.data.native.lastAt, at); this.dirty = true;
  }
  event(event) {
    if (!validEvent(event)) return;
    const events = this.data.native.events;
    const prior = this.eventsById.get(eventKey(event));
    if (prior) {
      if (['completed', 'error'].includes(prior.status) && event.kind === 'tool') return;
      if (canonical(prior) === canonical(event)) return;
      Object.assign(prior, event);
    } else {
      const stored = structuredClone(event); events.push(stored); this.eventsById.set(eventKey(stored), stored);
      if (events.length > 200000) this.eventsById.delete(eventKey(events.shift()));
    }
    this.data.native.lastAt = Math.max(this.data.native.lastAt, event.at);
    this.trim(); this.dirty = true;
  }
  trim(force = false) {
    if (!force && this.now() - this.lastTrimAt < 60000 && this.data.native.intervals.length <= 200000 &&
        this.data.native.catalog.length <= 200000) return;
    this.lastTrimAt = this.now();
    const n = this.data.native, cutoff = this.now() - 30 * DAY;
    n.intervals = n.intervals.filter(s => s.to > cutoff).slice(-200000);
    if (n.intervals[0]?.from < cutoff) n.intervals[0].from = cutoff;
    n.events = n.events.filter(e => e.at >= cutoff).slice(-200000);
    this.eventsById = new Map(n.events.map((e) => [eventKey(e), e]));
    n.catalog = n.catalog.filter(c => c.lastAt >= cutoff).slice(-200000);
    n.firstAt = Math.min(Math.max(n.firstAt, cutoff), n.lastAt);
    // Les segments évincés restent absents : les vues les comptent INCONNU.
  }
  import(bundle) {
    if (this.maintenanceRequested) return Promise.reject(Object.assign(new Error('statistics-maintenance-busy'),
      { code: 'statistics-maintenance-busy', status: 409 }));
    const result = this.importing.then(() => this.importBundle(bundle));
    this.importing = result.catch(() => {});
    return result;
  }
  async importBundle(bundle) {
    if (this.error) fail('observation-store-unavailable');
    validateBundle(bundle, this.project);
    const hash = digest(bundle);
    const prior = this.data.datasets.find(e => e.bundle.sourceId === bundle.sourceId && e.bundle.datasetId === bundle.datasetId);
    if (prior && prior.hash !== hash) fail('observation-dataset-conflict');
    if (prior) return { status: 'already-imported', sourceId: bundle.sourceId, datasetId: bundle.datasetId, sha256: hash };
    const entry = { hash, bundle: structuredClone(bundle) };
    if (this.data.datasets.length >= 1000 || Buffer.byteLength(canonical(this.data)) + Buffer.byteLength(canonical(entry)) > LIMIT)
      fail('observation-store-full');
    this.data.datasets.push(entry); this.dirty = true;
    await this.flush();
    if (this.error) { this.data.datasets = this.data.datasets.filter(e => e !== entry); this.dirty = true; fail('observation-persistence-unavailable'); }
    return { status: 'imported', sourceId: bundle.sourceId, datasetId: bundle.datasetId, sha256: hash };
  }
  overview() {
    return { version: VERSION, persistence: this.error || 'READY', nativeFirstAt: this.data.native.firstAt,
      nativeLastAt: this.data.native.lastAt, retentionDays: 30,
      datasets: this.data.datasets.map(e => ({ sourceId: e.bundle.sourceId, datasetId: e.bundle.datasetId, sha256: e.hash,
        firstAt: e.bundle.firstAt, lastAt: e.bundle.lastAt })) };
  }
  view(selection = 'current', runId, context) {
    if (!['current', 'last', '24h', '7d', '30d'].includes(selection) || (runId !== undefined && !id(runId)) ||
        (context !== undefined && !contextId(context))) fail('observation-selection-invalid');
    this.trim(true);
    const end = this.now();
    const days = { '24h': 1, '7d': 7, '30d': 30 }[selection];
    const sources = [{ sourceId: 'native', datasetId: 'native', ...this.data.native, quota: [], evidence: [] },
      ...this.data.datasets.map(e => e.bundle)];
    const latest = selection === 'last' && context === undefined ? sources.flatMap((s) => s.catalog)
      .filter((c) => c.closedAt !== null && (!runId || c.runId === runId))
      .sort((a, b) => b.closedAt - a.closedAt)[0] : null;
    return { version: VERSION, observedAt: end, selection, runId: runId ?? null, persistence: this.error || 'READY',
      limitations: ['Sources et jeux se recouvrant non additionnables', 'busy ne prouve pas du codage productif',
        'Comptes des seuls événements présents ; une famille absente ne prouve pas un total nul',
        'Import audit : contextes et générations observés ; messages, outils et décisions détaillés non reconstruits',
        'Aucun gain causal sans référence comparable', 'Fenêtres antérieures à la collecte ou hors couverture inconnues',
        'Événements datés à la réception ; rétention native bornée à 30 jours et 200000 éléments par famille',
        'Éviction et indisponibilité ne deviennent jamais ZERO ; compteurs cumulés hérités hors fenêtres'],
      sources: sources.map(source => {
        let catalog = source.catalog.filter(c => (!runId || c.runId === runId) && (context === undefined || c.contextId === context));
        if (!days && context === undefined) catalog = catalog.filter(c => selection === 'current' ? c.state === 'RESERVED' : c.closedAt !== null);
        if (selection === 'last' && context === undefined) catalog = latest ? catalog.filter((c) => contextKey(c) === contextKey(latest)) : [];
        const start = days ? end - days * DAY : catalog.length ? Math.min(...catalog.map(c => c.firstAt)) : end;
        const finish = days ? end : catalog.length ? Math.max(...catalog.map(c => c.closedAt ?? c.lastAt)) : end;
        const matches = c => catalog.some(x => contextKey(x) === contextKey(c));
        const output = summarizeSegments(source.intervals, start, finish, days ? c => !runId || c.runId === runId : matches, runId);
        const events = new Map();
        for (const event of source.events) if (event.at >= start && event.at <= finish && (days ? !runId || event.runId === runId : matches(event)))
          events.set(canonical([contextKey(event), event.kind, event.id]), event);
        const counts = {};
        for (const event of events.values()) {
          const key = event.kind + (event.status ? ':' + event.status : '');
          counts[key] = (counts[key] || 0) + 1;
        }
        const orderedQuota = [...source.quota].sort((a, b) => a.at - b.at);
        return { sourceId: source.sourceId, datasetId: source.datasetId, historical: source.sourceId !== 'native',
          sourceFirstAt: source.firstAt, sourceLastAt: source.lastAt, start, end: finish, contexts: catalog,
          ...output, eventCounts: counts, events: [...events.values()], quota: orderedQuota,
          quotaComparisons: orderedQuota.slice(1).map((after, index) => {
            const before = orderedQuota[index];
            const comparable = before.accountFingerprint === after.accountFingerprint && before.resetsAt === after.resetsAt &&
              before.windowDurationMins === after.windowDurationMins;
            return { beforeAt: before.at, afterAt: after.at, sharedAccount: true, comparable,
              deltaPercentagePoints: comparable ? after.usedPercent - before.usedPercent : null,
              reason: comparable ? null : 'N/A — compte ou fenêtre différents' };
          }), evidence: source.evidence,
          absentSelection: !days && !catalog.length ? 'N/A — aucune identité ou livraison observée' : null };
      }) };
  }
  markdown(selection, runId, context) {
    const view = this.view(selection, runId, context);
    const iso = at => new Date(at).toISOString();
    const sec = ms => (ms / 1000).toFixed(3);
    let out = '# Statistiques CAB — ' + view.selection + '\n\nObservation : ' + iso(view.observedAt) + '. Persistance : ' + view.persistence + '.\n\n';
    for (const s of view.sources) {
      out += '### Source ' + s.sourceId + ' / ' + s.datasetId + (s.historical ? ' — historique importé' : '') + '\n\n';
      out += iso(s.start) + ' → ' + iso(s.end) + '. Source observée jusqu’au ' + iso(s.sourceLastAt) + '.\n\n';
      out += '| RUN | Contexte | Change | État | Livraison observée |\n|---|---:|---|---|---|\n';
      out += s.contexts.map(c => '| ' + c.runId + ' | ' + (c.contextId ?? 'N/A') + ' | ' + c.changeId + ' | ' + c.state +
        ' | ' + (c.closedAt === null ? 'N/A' : iso(c.closedAt)) + ' |').join('\n') + '\n\n';
      if (s.absentSelection) out += s.absentSelection + '\n\n';
      out += '| Catégorie | MONO s | MULTI s | Ratio | Part MONO / MULTI | ZERO s | INCONNU s | Exactement 2 s | ≥3 s | Couverture |\n|---|---:|---:|---:|---|---:|---:|---:|---:|---:|\n';
      for (const [name, b] of Object.entries(s.categories)) out += '| ' + name + ' | ' + sec(b.monoMs) + ' | ' + sec(b.multiMs) +
        ' | ' + (b.ratioMonoMulti ?? 'N/A') + ' | ' + (b.monoShare === null ? 'N/A' : (100*b.monoShare).toFixed(1) + '% / ' + (100*b.multiShare).toFixed(1) + '%') +
        ' | ' + sec(b.zeroMs) + ' | ' + sec(b.unknownMs) + ' | ' + sec(b.exactlyTwoMs) + ' | ' + sec(b.threeOrMoreMs) +
        ' | ' + (b.coverage === null ? 'N/A' : (100*b.coverage).toFixed(1) + '%') + ' |\n';
      out += '\n| RUN / contexte | Réservé hors prévol s | Seul s | Avec pair s | Busy s | Exclusion propre s | Sous exclusion tierce s | File s | Réconciliation s |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|\n';
      out += s.perContext.map(c => '| ' + c.runId + ' / ' + (c.contextId ?? 'N/A') + ' | ' +
        [c.reservedMs,c.aloneMs,c.withPeerMs,c.busyMs,c.integrationMs,c.foreignIntegrationMs,c.queueMs,c.staleMs].map(sec).join(' | ') + ' |').join('\n') + '\n\n';
      out += '| RUN / contexte | Attente ressource connue s | Détention partagée s | Activité exclusive s | Promotion s | Ressources inconnues s | File inconnue s | Réconciliation inconnue s | Gels exceptionnels connus |\n|---|---:|---:|---:|---:|---:|---:|---:|---|\n';
      out += s.perContext.map(c => '| ' + c.runId + ' / ' + (c.contextId ?? 'N/A') + ' | ' +
        [c.resourceWaitMs,c.resourceHeldMs,c.exclusiveActiveMs,c.promotionWaitMs,c.resourceUnknownMs,c.queueUnknownMs,c.staleUnknownMs].map(sec).join(' | ') +
        ' | ' + (Object.keys(c.globalExceptionMs).length ? Object.entries(c.globalExceptionMs).map(([cause,ms]) => cause + ' ' + sec(ms) + ' s').join('; ')
          : c.globalExceptionUnknownMs ? 'N/A — source sans classification' : '0 s observée') + ' |').join('\n') + '\n\n';
      if (s.quota.length) {
        out += '| Quota partagé — borne | Utilisé % | Reset |\n|---|---:|---:|\n' +
          s.quota.map(q => '| ' + iso(q.at) + ' | ' + q.usedPercent + ' | ' + q.resetsAt + ' |').join('\n') + '\n\n';
        out += s.quotaComparisons.map(q => 'Variation globale ' + iso(q.beforeAt) + ' → ' + iso(q.afterAt) + ' : ' +
          (q.comparable ? q.deltaPercentagePoints + ' points de pourcentage (compte partagé)' : q.reason)).join('\n') + '\n\n';
      }
      out += 'Événements filtrés : ' + JSON.stringify(s.eventCounts) + '. Preuves : ' + s.evidence.length +
        '. Relevés quota partagé : ' + s.quota.length + '. Détails numériques et empreintes dans la vue JSON.\n\n';
    }
    return out + view.limitations.join('. ') + '. Conditions d’attente et paires peuvent se recouvrir. Modèles, tokens, coûts et commandes exactes : N/A — non collectés.\n';
  }
  async flush() {
    if (this.maintenance) return;
    if (!this.persist || !this.project || !this.dirty || this.error) return;
    if (this.saving) { await this.saving; if (this.dirty && !this.error) await this.flush(); return; }
    this.dirty = false;
    this.saving = (async () => {
      let candidate;
      try {
        parentSafe(dirname(this.path));
        await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
        const text = canonical(this.data) + '\n';
        if (Buffer.byteLength(text) > LIMIT) fail('observation-store-full');
        try { safeRead(this.path); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
        candidate = this.path + '.candidate-' + randomUUID();
        const fd = await open(candidate, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
        try { await fd.writeFile(text, 'utf8'); await fd.sync(); } finally { await fd.close(); }
        await rename(candidate, this.path); candidate = undefined;
        const parent = await open(dirname(this.path), constants.O_RDONLY);
        try { await parent.sync(); } finally { await parent.close(); }
        this.error = null;
      } catch { this.error = 'observation-persistence-unavailable'; this.dirty = true; }
      finally { if (candidate) { try { await unlink(candidate); } catch { this.error = 'observation-persistence-unavailable'; } } }
    })();
    await this.saving; this.saving = null;
  }
}
export function summarizeSegments(intervals, start, end, select = () => true, runId) {
  const duration = Math.max(0, end - start);
  const categories = Object.fromEntries(CATEGORIES.map(k => [k, bucket()]));
  const contexts = new Map(), scopeCoverage = new Map(), pairs = new Map();
  let covered = 0;
  for (const s of intervals) {
    const from = Math.max(s.from, start), to = Math.min(s.to, end), ms = to - from;
    if (ms <= 0) continue;
    covered += ms;
    const inScope = !runId || s.scopeRunIds.includes(runId);
    const live = s.contexts.filter(c => !preflight(c.changeId));
    const selected = live.filter(select);
    const sets = [selected, selected.filter(c => business(c.changeId)),
      selected.filter(c => c.nativeType === 'busy'), selected.filter(c => business(c.changeId) && c.nativeType === 'busy')];
    CATEGORIES.forEach((key, index) => {
      const relevant = index === 2 ? selected : selected.filter(c => business(c.changeId));
      const known = s.registryKnown && inScope && (index < 2 || (s.nativeAvailable && relevant.every(c => c.nativeType !== null)));
      const b = categories[key], count = sets[index].length;
      b[!known ? 'unknownMs' : count === 0 ? 'zeroMs' : count === 1 ? 'monoMs' : 'multiMs'] += ms;
      if (known && count === 2) b.exactlyTwoMs += ms;
      if (known && count >= 3) b.threeOrMoreMs += ms;
    });
    for (const id of s.scopeRunIds) {
      const v = scopeCoverage.get(id) || { runId: id, firstAt: from, lastAt: to, observedMs: 0 };
      v.lastAt = to; if (s.registryKnown) v.observedMs += ms; scopeCoverage.set(id, v);
    }
    if (!s.registryKnown || !inScope) continue;
    for (const c of selected) {
      const key = contextKey(c), v = contexts.get(key) || { runId: c.runId, contextId: c.contextId, changeId: c.changeId,
        reservedMs: 0, aloneMs: 0, withPeerMs: 0, busyMs: 0, nativeUnknownMs: 0, integrationMs: 0,
        foreignIntegrationMs: 0, queueMs: 0, staleMs: 0, queueUnknownMs: 0, staleUnknownMs: 0,
        resourceWaitMs: 0, resourceHeldMs: 0, exclusiveActiveMs: 0, issuedEffectMs: 0, promotionWaitMs: 0,
        resourceUnknownMs: 0, globalExceptionMs: {}, globalExceptionUnknownMs: 0 };
      v.reservedMs += ms; v[live.length > 1 ? 'withPeerMs' : 'aloneMs'] += ms;
      if (s.nativeAvailable && c.nativeType === 'busy') v.busyMs += ms;
      if (!s.nativeAvailable || c.nativeType === null || c.nativeType === 'retry') v.nativeUnknownMs += ms;
      if (s.integrationOwner === c.runId) v.integrationMs += ms;
      else if (s.integrationOwner !== null) v.foreignIntegrationMs += ms;
      if (c.queue) v.queueMs += ms; if (c.stale) v.staleMs += ms;
      if (c.queue === null) v.queueUnknownMs += ms;
      if (c.stale === null) v.staleUnknownMs += ms;
      if (c.resource) {
        for (const [flag, metric] of [['waiting','resourceWaitMs'],['held','resourceHeldMs'],['exclusive','exclusiveActiveMs'],
          ['issued','issuedEffectMs'],['promotion','promotionWaitMs']]) if (c.resource[flag]) v[metric] += ms;
      } else v.resourceUnknownMs += ms;
      if (s.globalCause) v.globalExceptionMs[s.globalCause] = (v.globalExceptionMs[s.globalCause] || 0) + ms;
      if (s.globalCause === undefined) v.globalExceptionUnknownMs += ms;
      contexts.set(key, v);
    }
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      if (!select(live[i]) && !select(live[j])) continue;
      const ids = [live[i].runId, live[j].runId].sort(), key = ids.join(':');
      const v = pairs.get(key) || { runIds: ids, reservedMs: 0 }; v.reservedMs += ms; pairs.set(key, v);
    }
  }
  for (const b of Object.values(categories)) {
    b.unknownMs += Math.max(0, duration - covered);
    const active = b.monoMs + b.multiMs;
    b.ratioMonoMulti = b.multiMs ? b.monoMs / b.multiMs : null;
    b.monoShare = active ? b.monoMs / active : null; b.multiShare = active ? b.multiMs / active : null;
    b.coverage = duration ? (duration - b.unknownMs) / duration : null;
  }
  return { categories, perContext: [...contexts.values()], perRunCoverage: [...scopeCoverage.values()],
    pairs: [...pairs.values()], pairLimitation: 'Paires recouvrantes en concurrence triple, non additionnables', durationMs: duration };
}
