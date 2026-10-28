import { constants, realpathSync } from 'node:fs';
import { link, mkdir, open, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StringDecoder } from 'node:string_decoder';
import { parseArgs } from 'node:util';
import { appendSegment, digest, safeRead, validateBundle } from './cgpt-approval-bridge-observation-statistics.mjs';

export const VERSION = '2.0.0';
const validId = (value) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(value) &&
  !['constructor', 'prototype', '__proto__'].includes(value);
const timestamp = (value) => typeof value === 'number' ? Math.round(value * 1000) : Date.parse(value);
const fail = (code) => { const error = new Error(code); error.code = code; throw error; };
const key = (c) => JSON.stringify([c.runId, c.contextId, c.changeId]);

async function* samples(path, inputHash) {
  const full = resolve(path);
  if (realpathSync(dirname(full)) !== dirname(full)) fail('audit-parent-invalid');
  const source = await open(full, constants.O_RDONLY | constants.O_NOFOLLOW);
  const decoder = new StringDecoder('utf8');
  let buffer = '';
  try {
    const metadata = await source.stat();
    if (!metadata.isFile() || metadata.nlink !== 1 || metadata.size > 512 * 1024 * 1024) fail('audit-input-invalid');
    const bytes = Buffer.alloc(65536);
    for (;;) {
      const { bytesRead } = await source.read(bytes, 0, bytes.length, null);
      if (!bytesRead) break;
      const chunk = bytes.subarray(0, bytesRead);
      inputHash.update(chunk); buffer += decoder.write(chunk);
      let end;
      while ((end = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        if (Buffer.byteLength(line) > 2 * 1024 * 1024) fail('audit-row-too-large');
        if (!line.trim()) continue;
        let value;
        try { value = JSON.parse(line); } catch { fail('audit-json-invalid'); }
        yield value;
      }
      if (Buffer.byteLength(buffer) > 2 * 1024 * 1024) fail('audit-row-too-large');
    }
    buffer += decoder.end();
    if (buffer.trim()) {
      let value;
      try { value = JSON.parse(buffer); } catch { fail('audit-json-invalid'); }
      yield value;
    }
    const after = await source.stat();
    if (after.size !== metadata.size || after.mtimeMs !== metadata.mtimeMs || after.nlink !== 1) fail('audit-source-changed');
  } finally { await source.close(); }
}
async function* auditSamples(paths, inputHash) {
  if (!Array.isArray(paths) || !paths.length || paths.length > 32 || !paths.every((path) => typeof path === 'string')) fail('audit-inputs-invalid');
  for (const path of paths) for await (const sample of samples(path, inputHash)) yield sample;
}

function scopeAt(config, sample, at) {
  const replacements = config.scopeReplacements || [];
  let runs = replacements[0]?.previousRuns || config.runs;
  for (const replacement of replacements) {
    if (at >= timestamp(replacement.firstTrackedSampleAtUtc)) runs = replacement.newRuns;
  }
  if (!Array.isArray(runs)) fail('audit-scope-invalid');
  let ids = runs.filter((r) => !r.trackingRequestedAtUtc || at >= timestamp(r.trackingRequestedAtUtc)).map((r) => r.runId);
  if (sample.trackedRunIds !== undefined) ids = sample.trackedRunIds;
  if (!Array.isArray(ids) || ids.length > 1000 || !ids.every(validId) || new Set(ids).size !== ids.length) fail('audit-scope-invalid');
  return ids.sort();
}
function projectRun(run, at) {
  if (!run || !validId(run.runId) || !validId(run.changeId) || !['RESERVED','DELIVERED','ABANDONED'].includes(run.state)) return null;
  return { runId: run.runId, contextId: Number.isSafeInteger(run.contextId) && run.contextId > 0 ? run.contextId : null,
    changeId: run.changeId, sessionId: validId(run.sessionId) ? run.sessionId : null,
    state: run.state, phase: run.phase === 'REPORT' ? 'REPORT' : 'WORK', firstAt: at, lastAt: at, closedAt: null };
}
function filteredSample(config, sample) {
  const at = timestamp(sample.at ?? sample.timestamp);
  if (!Number.isSafeInteger(at) || at < 0) fail('audit-time-invalid');
  const scopeRunIds = scopeAt(config, sample, at);
  const registryKnown = sample.registry?.ok === true && Array.isArray(sample.runs);
  const nativeAvailable = sample.native?.ok === true;
  const contexts = registryKnown ? sample.runs.filter((r) => scopeRunIds.includes(r.runId) && r.state === 'RESERVED')
    .map((r) => {
      const c = projectRun(r, at); if (!c) fail('audit-context-invalid');
      const native = sample.native?.byRun?.[c.runId];
      const status = sample.statuses?.[c.runId];
      const queue = Array.isArray(sample.registry.integrationQueue) ? sample.registry.integrationQueue.some((q) => q.runId === c.runId)
        : Array.isArray(status?.coordination?.integrationQueue) ? status.coordination.integrationQueue.some((q) => q.runId === c.runId) : null;
      return { runId: c.runId, contextId: c.contextId, changeId: c.changeId, sessionId: c.sessionId,
        nativeType: nativeAvailable && ['idle','busy','retry'].includes(native?.type) ? native.type : null,
        queue, stale: Number.isSafeInteger(r.referenceVersion) && Number.isSafeInteger(sample.registry.referenceVersion)
          ? r.referenceVersion !== sample.registry.referenceVersion && c.phase !== 'REPORT' : null,
        resource: null };
    }) : [];
  return { at, registryKnown, nativeAvailable, scopeRunIds, contexts,
    integrationOwner: validId(sample.registry?.integrationOwner) ? sample.registry.integrationOwner : null };
}

export async function buildAuditBundle({ samplesFile, samplesFiles = samplesFile ? [samplesFile] : [], configFile, monitorFile, quotaFiles = [], proofFiles = [],
  sourceId = 'multirun-audit', datasetId }) {
  let config, monitor;
  try { config = JSON.parse(safeRead(configFile, 1024 * 1024)); monitor = JSON.parse(safeRead(monitorFile, 1024 * 1024)); }
  catch { fail('audit-metadata-invalid'); }
  if (monitor.collectorStoppedByUser !== true || monitor.monitoringStoppedByUser !== true) fail('audit-stopped-proof-required');
  if (typeof config.project !== 'string' || config.project !== resolve(config.project) || !config.project.startsWith('/') ||
      !Number.isFinite(config.sampleSeconds) || config.sampleSeconds <= 0 ||
      !Number.isFinite(config.maximumAcceptedGapSeconds) || config.maximumAcceptedGapSeconds < config.sampleSeconds) fail('audit-config-invalid');
  const intervals = [], events = [], catalog = new Map(), versions = new Map();
  const inputHash = createHash('sha256');
  let previous = null, firstAt = null, lastAt = null, rows = 0;
  for await (const sample of auditSamples(samplesFiles, inputHash)) {
    if (sample.kind !== 'sample') continue;
    const current = filteredSample(config, sample);
    if (lastAt !== null && current.at < lastAt) fail('audit-time-order-invalid');
    if (previous && current.at > previous.at) {
      const sameScope = JSON.stringify(previous.scopeRunIds) === JSON.stringify(current.scopeRunIds);
      const gapKnown = current.at - previous.at <= config.maximumAcceptedGapSeconds * 1000;
      appendSegment(intervals, { from: previous.at, to: current.at,
        registryKnown: previous.registryKnown && current.registryKnown && gapKnown && sameScope,
        nativeAvailable: previous.nativeAvailable && current.nativeAvailable && gapKnown && sameScope,
        scopeRunIds: sameScope ? previous.scopeRunIds : [], integrationOwner: previous.integrationOwner,
        contexts: sameScope ? previous.contexts : [] });
    }
    if (current.registryKnown) for (const raw of [...(sample.history || []), ...sample.runs]) {
      if (!current.scopeRunIds.includes(raw.runId)) continue;
      const c = projectRun(raw, current.at); if (!c) continue;
      const prior = catalog.get(key(c));
      if (prior) {
        c.firstAt = prior.firstAt; c.closedAt = prior.closedAt;
        if (prior.state === 'RESERVED' && c.state === 'DELIVERED') c.closedAt = current.at;
      }
      catalog.set(key(c), c);
      if (Number.isSafeInteger(raw.version) && versions.get(key(c)) !== raw.version) {
        events.push({ id: 'generation-' + raw.version, runId: c.runId, contextId: c.contextId,
          changeId: c.changeId, at: current.at, kind: prior ? 'generation' : 'change-observed',
          status: null, name: null, durationMs: null });
        versions.set(key(c), raw.version);
      }
    }
    firstAt ??= current.at; lastAt = current.at; previous = current; rows++;
    if (intervals.length > 200000 || events.length > 200000 || catalog.size > 200000) fail('audit-output-full');
  }
  if (firstAt === null) fail('audit-no-samples');
  const quota = [];
  const quotaSources = config.quotaAuditStart ? [config.quotaAuditStart] : [];
  for (const path of quotaFiles) {
    try { quotaSources.push(JSON.parse(safeRead(path, 1024 * 1024))); } catch { fail('audit-quota-invalid'); }
  }
  for (const q of quotaSources) {
    if (!/^[a-f0-9]{16}$/.test(q.accountFingerprintFNV1a64 || '')) fail('audit-quota-fingerprint-invalid');
    const filtered = { at: timestamp(q.readByUtc || q.readAfterUtc), accountFingerprint: q.accountFingerprintFNV1a64,
      windowDurationMins: q.windowDurationMins, usedPercent: q.usedPercent, resetsAt: q.resetsAt };
    if (!quota.some((prior) => digest(prior) === digest(filtered))) quota.push(filtered);
  }
  quota.sort((a, b) => a.at - b.at);
  const evidence = proofFiles.map((path) => {
    const text = safeRead(path, 2 * 1024 * 1024);
    const sha256 = createHash('sha256').update(text).digest('hex');
    return { id: 'proof-' + sha256.slice(0, 16), changeId: null, at: lastAt, sha256,
      utf8: !text.includes('\uFFFD'), lf: !text.includes('\r'), sections: (text.match(/^## /gm) || []).length };
  });
  const sourceHash = inputHash.digest('hex');
  const bundle = { schemaVersion: 1, sourceId, datasetId: datasetId || 'audit-' + digest({ sourceHash, config,
    quota, evidence }).slice(0, 32), project: config.project, firstAt, lastAt,
    pollMs: Math.round(config.sampleSeconds * 1000), gapMs: Math.round(config.maximumAcceptedGapSeconds * 1000),
    intervals, events, catalog: [...catalog.values()], quota, evidence };
  validateBundle(bundle, config.project);
  return { bundle, sourceChecks: { rows, inputSha256: sourceHash, stoppedDeclared: true,
    stableDuringRead: true, sourceCount: samplesFiles.length + quotaFiles.length + proofFiles.length } };
}

async function main() {
  const { values } = parseArgs({ options: { samples: { type: 'string', multiple: true }, config: { type: 'string' },
    monitor: { type: 'string' }, output: { type: 'string' }, 'source-id': { type: 'string' },
    'dataset-id': { type: 'string' }, quota: { type: 'string', multiple: true }, proof: { type: 'string', multiple: true } } });
  if (!['samples','config','monitor','output'].every((key) => values[key])) fail('audit-cli-arguments-required');
  const result = await buildAuditBundle({ samplesFiles: values.samples, configFile: values.config, monitorFile: values.monitor,
    quotaFiles: values.quota, proofFiles: values.proof, sourceId: values['source-id'], datasetId: values['dataset-id'] });
  const path = resolve(values.output);
  if ([...values.samples,values.config,values.monitor,...(values.quota || []),...(values.proof || [])].some((p) => resolve(p) === path)) fail('audit-output-is-input');
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  if (realpathSync(dirname(path)) !== dirname(path)) fail('audit-output-parent-invalid');
  try { safeRead(path); fail('audit-output-exists'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const candidate = path + '.candidate-' + randomUUID();
  const fd = await open(candidate, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try { await fd.writeFile(JSON.stringify(result.bundle) + '\n'); await fd.sync(); } finally { await fd.close(); }
  try { await link(candidate, path); } finally { await unlink(candidate); }
  const parent = await open(dirname(path), constants.O_RDONLY);
  try { await parent.sync(); } finally { await parent.close(); }
  process.stdout.write(JSON.stringify({ version: VERSION, datasetId: result.bundle.datasetId,
    sha256: digest(result.bundle), ...result.sourceChecks }) + '\n');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { process.stderr.write((error.code && /^[a-z][a-z0-9-]+$/.test(error.code) ? error.code : 'audit-import-failed') + '\n'); process.exitCode = 1; });
}
