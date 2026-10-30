import { constants, closeSync, fsyncSync, openSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { digest, safeRead } from './cgpt-approval-bridge-observation-statistics.mjs';

export const VERSION = '2.1.18';
export const RETENTION_DAYS = [1, 3, 7, 30, 365];
const selections = ['current', 'last', '24h', '7d', '30d'];
const key = (c) => JSON.stringify([c.runId, c.contextId, c.changeId]);
const fail = (code, status = 400) => { throw Object.assign(new Error(code), { code, status }); };
const exact = (value, names) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === names.length && names.every((name) => Object.hasOwn(value, name));
export function statisticsSelection(parameters) {
  if ([...parameters.keys()].some((name) => !['selection', 'runId'].includes(name)) ||
      [...parameters.keys()].some((name) => parameters.getAll(name).length !== 1)) fail('statistics-selection-invalid');
  const selection = parameters.get('selection') ?? 'current';
  const runId = parameters.get('runId') ?? undefined;
  if (!selections.includes(selection) || (runId !== undefined && !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(runId))) {
    fail('statistics-selection-invalid');
  }
  return { selection, runId };
}

export function statisticsDashboard(statistics, parameters) {
  const { selection, runId } = statisticsSelection(parameters);
  const summary = statistics.summary();
  const view = statistics.observations.view(selection, runId);
  const catalog = [...Object.values(statistics.data.contexts), ...statistics.observations.data.native.catalog,
    ...statistics.observations.data.datasets.flatMap((entry) => entry.bundle.catalog)];
  const runs = [...new Set(catalog.map((c) => c.runId))].sort();
  let truncated = view.sources.length > 50 || runs.length > 200;
  const sources = view.sources.slice(0, 50).map((source) => {
    truncated ||= source.contexts.length > 200 || source.perContext.length > 200;
    return { sourceId: source.sourceId, datasetId: source.datasetId, historical: source.historical,
      sourceFirstAt: source.sourceFirstAt, sourceLastAt: source.sourceLastAt, start: source.start, end: source.end,
      absentSelection: source.absentSelection, categories: source.categories, eventCounts: source.eventCounts,
      contexts: source.contexts.slice(0, 200).map(({ runId, contextId, changeId, state, closedAt }) =>
        ({ runId, contextId, changeId, state, closedAt })), perContext: source.perContext.slice(0, 200),
      quotaComparisons: source.quotaComparisons.slice(-20).map(({ beforeAt, afterAt, comparable, deltaPercentagePoints }) =>
        ({ beforeAt, afterAt, comparable, deltaPercentagePoints })) };
  });
  const selected = new Set(view.sources.flatMap((source) => source.contexts.map(key)));
  const contexts = summary.contexts.filter((context) => selected.has(key(context)));
  truncated ||= contexts.length > 200;
  const result = { version: VERSION, observedAt: view.observedAt, selection, runId: runId ?? null,
    persistence: { statistics: summary.persistence.status, observations: view.persistence },
    runOptions: runs.slice(0, 200), sources, truncated,
    cumulative: contexts.slice(0, 200).map(({ runId, contextId, changeId, decisions, tools, messages, latencies, coordination }) =>
      ({ runId, contextId, changeId, decisions, tools, messages, latencies, coordination })),
    limitations: [...view.limitations, 'Latences et compteurs cumulatifs par contexte : hors fenêtre temporelle',
      'Purge limitée aux historiques statistiques ; états opérationnels et agrégats globaux cumulatifs conservés',
      'Broker et superviseur : seules les métriques relayées par le contrôleur sont historisées'], retentionDays: 30 };
  while (Buffer.byteLength(JSON.stringify(result)) > 1800000) {
    result.truncated = true;
    if (result.sources.length > 1) result.sources.pop();
    else if (result.cumulative.length) result.cumulative.pop();
    else {
      const source = result.sources[0];
      if (source.perContext.length) source.perContext.pop();
      else if (source.contexts.length) source.contexts.pop();
      else break;
    }
  }
  return result;
}

// Le chemin vient exclusivement du magasin propriétaire, jamais d'une requête.
export function writeRetentionSnapshot(path, data) {
  try { JSON.parse(safeRead(path)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const candidate = path + '.candidate-' + randomUUID();
  let descriptor;
  let renamed = false;
  try {
    descriptor = openSync(candidate, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    writeFileSync(descriptor, JSON.stringify(data) + '\n', 'utf8'); fsyncSync(descriptor);
    closeSync(descriptor); descriptor = undefined;
    renameSync(candidate, path); renamed = true;
    const parent = openSync(dirname(path), constants.O_RDONLY);
    try { fsyncSync(parent); } finally { closeSync(parent); }
  } catch (error) {
    // Après rename, le nouveau magasin est déjà visible : ne pas restaurer un ancien état en mémoire.
    error.retentionCommitted = renamed;
    throw error;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (!renamed) {
      try { unlinkSync(candidate); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
}

export class StatisticsMaintenance {
  constructor(statistics, { now = Date.now, referenced = () => statistics.runs, writer = writeRetentionSnapshot } = {}) {
    this.statistics = statistics; this.now = now; this.referenced = referenced; this.writer = writer;
    this.previews = new Map(); this.busy = false;
  }
  plan(cutoff) {
    const s = this.statistics, o = s.observations;
    if (s.error || o.error) fail('statistics-maintenance-unavailable', 503);
    const protectedKeys = new Set(this.referenced().map(key));
    const activeRunIds = new Set(this.referenced().filter((c) => c.state === 'RESERVED').map((c) => c.runId));
    const catalogs = [Object.values(s.data.contexts), o.data.native.catalog, ...o.data.datasets.map((e) => e.bundle.catalog)];
    for (const catalog of catalogs) for (const c of catalog) if (c.state === 'RESERVED') {
      protectedKeys.add(key(c)); activeRunIds.add(c.runId);
    }
    const historical = (c) => !protectedKeys.has(key(c));
    const oldContext = (c) => historical(c) && c.state !== 'RESERVED' && c.lastAt < cutoff;
    const candidates = {
      contexts: Object.entries(s.data.contexts).filter(([, c]) => oldContext(c)),
      admissions: Object.entries(s.data.admissions).filter(([, a]) => !activeRunIds.has(a.runId) && a.lastAt < cutoff),
      catalog: o.data.native.catalog.filter(oldContext),
      events: o.data.native.events.filter((e) => e.at < cutoff && historical(e)),
      intervals: o.data.native.intervals.filter((i) => i.to < cutoff && i.contexts.every(historical) &&
        i.scopeRunIds.every((runId) => !activeRunIds.has(runId))),
      datasets: o.data.datasets.filter(({ bundle: b }) => b.lastAt < cutoff && b.quota.every((q) => q.at < cutoff) &&
        b.evidence.every((e) => e.at < cutoff) &&
        b.catalog.every((c) => c.state !== 'RESERVED' && historical(c)) && b.events.every(historical) &&
        b.intervals.every((i) => i.contexts.every(historical) && i.scopeRunIds.every((runId) => !activeRunIds.has(runId)))) };
    return { candidates, signature: digest({ candidates, protected: [...protectedKeys].sort(), active: [...activeRunIds].sort() }), protectedContexts: protectedKeys.size,
      counts: Object.fromEntries(Object.entries(candidates).map(([name, values]) => [name, values.length])) };
  }
  preview(payload) {
    if (!exact(payload, ['days']) || !RETENTION_DAYS.includes(payload.days)) fail('statistics-retention-invalid');
    if (this.busy) fail('statistics-maintenance-busy', 409);
    const now = this.now(), cutoff = now - payload.days * 86400000;
    const plan = this.plan(cutoff);
    for (const [token, entry] of this.previews) if (entry.expiresAt <= now) this.previews.delete(token);
    while (this.previews.size >= 20) this.previews.delete(this.previews.keys().next().value);
    const token = randomUUID(), expiresAt = now + 300000;
    this.previews.set(token, { signature: plan.signature, counts: plan.counts, days: payload.days, cutoff, expiresAt });
    return { token, days: payload.days, cutoff, expiresAt, counts: plan.counts, protectedContexts: plan.protectedContexts,
      protectedStores: ['approvals', 'jobs', 'registry', 'proofs', 'global-cumulative-aggregates'],
      irreversible: true, nativeRetentionDays: 30 };
  }
  async purge(payload) {
    if (!exact(payload, ['token', 'confirm']) || payload.confirm !== true ||
        typeof payload.token !== 'string' || !/^[a-f0-9-]{36}$/.test(payload.token)) fail('statistics-confirmation-invalid');
    const preview = this.previews.get(payload.token);
    if (!preview || preview.expiresAt <= this.now()) fail('statistics-preview-expired', 409);
    if (preview.result) return preview.result;
    if (this.busy) fail('statistics-maintenance-busy', 409);
    const s = this.statistics, o = s.observations;
    this.busy = true; o.maintenanceRequested = true;
    try {
      await o.importing;
      s.maintenance = true; o.maintenance = true;
      await Promise.all([s.saving, o.saving]);
      const plan = this.plan(preview.cutoff);
      if (plan.signature !== preview.signature || this.now() >= preview.expiresAt) fail('statistics-preview-changed', 409);
      const c = plan.candidates;
      const result = { token: payload.token, days: preview.days, cutoff: preview.cutoff,
        at: this.now(), status: 'completed', stores: [] };
      const nextStatistics = { ...s.data, contexts: { ...s.data.contexts }, admissions: { ...s.data.admissions } };
      for (const [id] of c.contexts) delete nextStatistics.contexts[id];
      for (const [id] of c.admissions) delete nextStatistics.admissions[id];
      const removed = (list, entries) => { const set = new Set(entries); return list.filter((value) => !set.has(value)); };
      const nextObservations = { ...o.data, native: { ...o.data.native,
        catalog: removed(o.data.native.catalog, c.catalog), events: removed(o.data.native.events, c.events),
        intervals: removed(o.data.native.intervals, c.intervals) }, datasets: removed(o.data.datasets, c.datasets) };
      for (const [name, store, next, counts] of [
        ['statistics', s, nextStatistics, { contexts: c.contexts.length, admissions: c.admissions.length }],
        ['observations', o, nextObservations, { catalog: c.catalog.length, events: c.events.length,
          intervals: c.intervals.length, datasets: c.datasets.length }]]) {
        let committed = false, error = false;
        if (Object.values(counts).some(Boolean)) {
          try { this.writer(store.path, next); committed = true; }
          catch (cause) { committed = cause.retentionCommitted === true; error = true; }
          if (committed) {
            store.data = next; store.dirty = false;
            if (store === o) o.eventsById = new Map(o.data.native.events.map((e) =>
              [[e.runId, e.contextId, e.changeId, e.kind, e.id].join('\0'), e]));
          }
        }
        result.stores.push({ name, status: error ? committed ? 'durability-uncertain' : 'failed' : 'completed',
          removed: committed ? counts : Object.fromEntries(Object.keys(counts).map((key) => [key, 0])) });
        if (error) result.status = 'partial-failure';
      }
      preview.result = result;
      return result;
    } finally { s.maintenance = false; o.maintenance = false; o.maintenanceRequested = false; this.busy = false; }
  }
}

export function guardStatisticsPost(request, url, port, requireOrigin = false) {
  let origin;
  try { origin = new URL('http://' + request.headers.host); } catch { fail('statistics-origin-refused', 403); }
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname) || Number(origin.port || 80) !== port ||
      (requireOrigin && !request.headers.origin) || (request.headers.origin && request.headers.origin !== origin.origin)) {
    fail('statistics-origin-refused', 403);
  }
  if (url.search || request.headers['content-type']?.split(';')[0].trim() !== 'application/json' ||
      request.headers['x-cab-statistics'] !== '1') fail('statistics-request-invalid', 400);
}
