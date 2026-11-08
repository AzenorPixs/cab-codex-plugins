import { pathToFileURL } from 'node:url';
import { realpath } from 'node:fs/promises';

export const VERSION = '2.4.38';
const fail = (code) => { throw Object.assign(new Error(code), { code }); };

function loopback(value) {
  let url;
  try { url = new URL(value); } catch { fail('source-read-controller-url-invalid'); }
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) fail('source-read-controller-url-invalid');
  return url.origin;
}

function parseArguments(argv) {
  const values = {}, accepted = new Set(['--controller-url','--run-id','--operation','--path','--query','--type','--limit','--max-bytes']);
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index];
    if (!accepted.has(key) || Object.hasOwn(values,key) || !argv[index + 1] || argv[index + 1].startsWith('--')) {
      fail('source-read-arguments-invalid');
    }
    values[key] = argv[++index];
  }
  const operation = values['--operation'];
  const runId = values['--run-id'];
  if (!['read','list','find'].includes(operation) ||
      !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(runId || '') ||
      (operation === 'read' && (typeof values['--path'] !== 'string' || values['--query'] !== undefined || values['--type'] !== undefined)) ||
      (operation === 'list' && (values['--query'] !== undefined || values['--type'] !== undefined)) ||
      (operation === 'find' && (typeof values['--query'] !== 'string' || values['--path'] !== undefined ||
        (values['--type'] !== undefined && !['file','directory'].includes(values['--type']))))) fail('source-read-arguments-invalid');
  const limit = values['--limit'] === undefined ? undefined : Number(values['--limit']);
  const maxBytes=values['--max-bytes']===undefined ? undefined : Number(values['--max-bytes']);
  if(maxBytes!==undefined && (operation!=='read' || !Number.isSafeInteger(maxBytes) || maxBytes<1 || maxBytes>2*1024*1024))fail('source-read-arguments-invalid');
  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) ||
      operation !== 'find' && limit !== undefined) fail('source-read-arguments-invalid');
  return { controllerUrl: loopback(values['--controller-url'] || process.env.OC_Codex_CONTROLLER_URL || 'http://127.0.0.1:8788'),
    runId, operation, path: values['--path'], query: values['--query'], type: values['--type'], limit, maxBytes };
}

async function readBounded(response, limit = 16 * 1024 * 1024) {
  if (!response.body) fail('source-read-response-empty');
  const reader = response.body.getReader(), chunks = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); fail('source-read-response-too-large'); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks,size).toString('utf8');
}

export async function readSource(input, fetchImpl = fetch) {
  if (!input || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(input.runId || '') ||
      !['read','list','find'].includes(input.operation)) fail('source-read-arguments-invalid');
  input = { ...input, controllerUrl: loopback(input.controllerUrl) };
  if (input.operation === 'read' && (typeof input.path !== 'string' || !input.path) ||
      input.operation === 'find' && (typeof input.query !== 'string' || !input.query.trim()) ||
      input.operation !== 'find' && input.query !== undefined) fail('source-read-arguments-invalid');
  const url = new URL(`/runs/${encodeURIComponent(input.runId)}/source/${input.operation}`, input.controllerUrl);
  if (input.path !== undefined) url.searchParams.set('path',input.path);
  if (input.query !== undefined) url.searchParams.set('query',input.query);
  if (input.type !== undefined) url.searchParams.set('type',input.type);
  if (input.limit !== undefined) url.searchParams.set('limit',String(input.limit));
  if(input.maxBytes!==undefined) {
    if(input.operation!=='read' || !Number.isSafeInteger(input.maxBytes) || input.maxBytes<1 || input.maxBytes>2*1024*1024)fail('source-read-arguments-invalid');
    url.searchParams.set('maxBytes',String(input.maxBytes));
  }
  let response;
  try { response = await fetchImpl(url,{headers:{accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(10000)}); }
  catch (cause) {
    const causeCode=typeof cause?.code==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(cause.code)?cause.code:
      typeof cause?.name==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(cause.name)?cause.name:'unknown-error';
    throw Object.assign(new Error('source-read-controller-unavailable'),{code:'source-read-controller-unavailable',causeCode});
  }
  if (!(response.headers.get('content-type')||'').toLowerCase().includes('application/json')) {
    await response.body?.cancel(); fail('source-read-response-invalid');
  }
  const text=await readBounded(response);
  let result;
  try { result=JSON.parse(text); } catch { fail('source-read-response-invalid'); }
  if (!response.ok) {
    const errorCode=typeof result?.error==='string'&&/^[a-z0-9-]{1,100}$/.test(result.error)?result.error:'source-read-failed';
    throw Object.assign(new Error(errorCode),{code:errorCode,status:response.status});
  }
  if (!result || result.runId!==input.runId || result.source!==`opencode-v2-fs-${input.operation}` || result.snapshot_only!==true) {
    fail('source-read-response-invalid');
  }
  if (input.operation === 'read' && (result.path !== input.path || typeof result.content !== 'string' ||
      !Number.isSafeInteger(result.byteLength) || !/^[a-f0-9]{64}$/.test(result.sha256 || ''))) {
    fail('source-read-response-invalid');
  }
  if (input.operation !== 'read' && (!Array.isArray(result.entries) || result.entries.some(entry =>
      !entry || typeof entry.path !== 'string' || entry.path.startsWith('/') ||
      entry.path.split('/').some(segment => !segment || segment === '.' || segment === '..') ||
      !['file','directory'].includes(entry.type)))) fail('source-read-response-invalid');
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1])).href) {
  try {
    const result=await readSource(parseArguments(process.argv.slice(2)));
    process.stdout.write(JSON.stringify(result)+'\n');
  } catch (cause) {
    const code=typeof cause?.code==='string'?cause.code:'';
    const causeCode=/^opencode-(?:source|http)-[a-z0-9-]{1,100}$/.test(code)?code:
      (typeof cause?.causeCode==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(cause.causeCode)?cause.causeCode:undefined);
    process.stderr.write(JSON.stringify({error:/^source-read-/.test(code)?code:'source-read-unavailable',
      ...(causeCode?{cause:causeCode}:{})})+'\n');
    process.exitCode=1;
  }
}
