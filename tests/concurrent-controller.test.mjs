import {migrationPendingValidations,migrationRegistryDigest,RUNTIME_MIGRATION_PROTOCOL} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runtime-migration.mjs';
import {canonicalContinuityDigest} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-continuity.mjs';
import {legacyStateDirectory,initializeRuntimeState,writeRuntimeJson,runtimeStateDirectory} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-state-layout.mjs';
import { fixtureEnvironment } from './helpers/cab-environment.mjs';
import { openCodeV2TestHandler, v2ProviderResponseBytes, v2NormalizedToolPart } from './helpers/opencode-v2-test-server.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, cpSync, chmodSync, mkdirSync, mkdtempSync, readdirSync, rmSync, readFileSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import test from 'node:test';
import { prepareControllerModelPolicy } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-policy.mjs';
import { nativeToolInputDigest, createOpenCodeV2Client } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs';
import { proofHash } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-maintenance-proof.mjs';
import { portProbeCommand } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-port-recovery.mjs';
import { processIdentity } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-process-lifecycle.mjs';
import { ResourceRunRegistry } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs';
import { ContinuityStore } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-continuity.mjs';
import {ErasureTransaction} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-change-erasure.mjs';
import {runtimeRequest} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runtime-client.mjs';

const controllerPath = fileURLToPath(new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs', import.meta.url));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(check, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) { if (await check()) return; await delay(20); }
  throw new Error('condition not reached');
}
async function setup(t, { reconnectMs = 30, environment = {}, codingPolicy = false, prepareCatalog = false,
  sourceFiles = {}, sourceEntries = [] } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'cab-concurrent-'));
  const native = { savedPermissions: [], permissions: [], replies: [], busy: {}, messages: {}, rules: {}, requests: [], sessions: {}, sessionLogs: {}, sessionLogFailure: false };
  if (codingPolicy) {
    const stamp=new Date(Date.now()-60000).toISOString();
    const catalog={schema_version:2,evaluated_at:stamp,published_at:stamp,selection_status:'selected',selected_mode:'mode1',
      models:Array.from({length:6},(_,i)=>({mode:'mode'+(i+1),priority:i+1,state:'Valide',selected:i===0,provider:'provider'+(i+1),
        model_id:'model'+(i+1),evaluated_this_run:true,evaluated_at:stamp,reasoning:'low'}))};
    const activeRoot=join(directory,'active-skill');if(prepareCatalog)mkdirSync(join(activeRoot,'data'),{recursive:true});
    const path=prepareCatalog?join(activeRoot,'data/pllm-current.json'):join(directory,'pllm-current.json');writeFileSync(path,JSON.stringify(catalog));
    native.catalogPath=path;
    if(prepareCatalog){native.preparation=prepareControllerModelPolicy({environment,activeSkillRoot:activeRoot});environment={...environment,...native.preparation.environment};}
    else environment={...environment,OC_Codex_PLLM_CATALOG:path};
    native.providers={connected:catalog.models.map(m=>m.provider),all:catalog.models.map(m=>({id:m.provider,models:{[m.model_id]:{variants:{medium:{},high:{},xhigh:{},low:{}}}}}))};
    native.messages.ses_probe=[{info:{id:'msg_user',sessionID:'ses_probe',role:'user'},parts:[]},
      {info:{id:'msg_response',sessionID:'ses_probe',role:'assistant',finish:'stop',parentID:'msg_user',providerID:'provider1',modelID:'model1',variant:'medium',time:{completed:Date.now()-10}},parts:[{type:'text',text:'probe ok'}]}];
    native.sessions.ses_probe={id:'ses_probe',directory,model:{providerID:'provider1',modelID:'model1',variant:'medium'},permission:[]};
  }
  const eventStreams = new Set();
  native.emit = (event) => { for (const stream of eventStreams) stream.write('data: ' + JSON.stringify(event) + '\n\n'); };
  native.disconnectEvents = () => { for (const stream of eventStreams) stream.end(); };
  const children = [];
  const opencode = createServer(openCodeV2TestHandler(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    native.requests.push(url.pathname);
    if (native.onRequest) await native.onRequest(url.pathname);
    if (url.pathname === '/global/event') {
      response.writeHead(200, { 'content-type': 'text/event-stream' });
      eventStreams.add(response); response.on('close', () => eventStreams.delete(response));
      response.write('data: {"type":"server.connected"}\n\n'); return;
    }
    let payload;
    if (url.pathname === '/provider') payload = native.providers || {all:[],connected:[]};
    else if (url.pathname === '/shell') payload = { location: { directory }, data: native.shells || [] };
    else if (/^\/session\/[^/]+\/message\/[^/]+$/.test(url.pathname)) payload=(native.messages[url.pathname.split('/')[2]] || []).find(m=>m.info?.id===url.pathname.split('/')[4]);
    else if (url.pathname === '/permission') payload = native.permissions;
    else if (/^\/session\/[^/]+\/log$/.test(url.pathname)) {
      if(native.sessionLogFailure){response.writeHead(503).end();return;}
      const sessionId=url.pathname.split('/')[2];
      response.writeHead(200,{'content-type':'text/event-stream','connection':'close'});
      response.end(native.sessionLogs[sessionId] || `data: ${JSON.stringify({type:'log.synced',aggregateID:sessionId,seq:0})}\n\n`);
      return;
    }
    else if (url.pathname === '/global/health') payload = { healthy: true };
    else if (url.pathname === '/path') payload = { directory };
    else if (url.pathname === '/mcp') payload = { 'cgpt-validation': { status: 'connected' } };
    else if (url.pathname === '/session/status') payload = native.busy;
    else if (url.pathname.includes('/permissions/')) {
      let body = ''; for await (const chunk of request) body += chunk;
      native.replies.push({ path: url.pathname, body: JSON.parse(body) });
      native.permissions = native.permissions.filter((p) => !url.pathname.endsWith('/' + p.id)); payload = true;
    } else if (url.pathname.endsWith('/message')) payload = native.messages[url.pathname.split('/')[2]] || [];
    else if (url.pathname.startsWith('/session/')) payload = { id: url.pathname.split('/')[2], directory,
      permission: native.rules[url.pathname.split('/')[2]] || [{ permission: '*', pattern: '*', action: 'ask' },
        {permission:'cgpt-validation_broker_readiness',pattern:'*',action:'allow'},
        {permission:'cgpt-validation_request_validation',pattern:'*',action:'allow'}],
      ...native.sessions[url.pathname.split('/')[2]] };
    else { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'content-type': 'application/json', connection: 'close' }); response.end(JSON.stringify(payload));
  }, { directory, sourceFiles, sourceEntries, savedPermissions:native.savedPermissions, onFsRequest: (path) => native.requests.push(path), onModelSwitch: ({sessionId,body}) => {
    native.sessions[sessionId] = { ...native.sessions[sessionId], model: { providerID: body.model.providerID,
      modelID: body.model.id, ...(body.model.variant ? { variant: body.model.variant } : {}) } };
  } }));
  await new Promise((resolve) => opencode.listen(0, '127.0.0.1', resolve));
  const listener = createServer();
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  const base = 'http://127.0.0.1:' + port;
  let child;
  let stderr = '';
  async function start() {
    child = spawn(process.execPath, [controllerPath], { stdio: ['ignore', 'ignore', 'pipe'], env: {
      ...fixtureEnvironment, OC_Codex_WORKSPACE: directory, OC_Codex_OUTSIDE_SANDBOX: '1',
      OC_Codex_STATUS_PORT: String(port), OC_Codex_OPENCODE_URL: 'http://127.0.0.1:' + opencode.address().port,
      OC_Codex_DECISION_MODE: 'manual', OC_Codex_RECONNECT_MS: String(reconnectMs),
      CODEX_COMMAND: 'cab-test-unused-app-server',
      ...environment,
    } });
    child.stderr.on('data', (data) => { stderr += data; });
    await waitFor(async () => { if (child.exitCode !== null) throw new Error(stderr);
      let status;
      try { const response = await fetch(base + '/status', { headers: { connection: 'close' }, signal: AbortSignal.timeout(500) }); if (!response.ok) return false; status = await response.json(); }
      catch { return false; }
      assert.equal(status.pid, child.pid, 'fixture controller PID mismatch');
      assert.equal(status.workspace, directory, 'fixture controller workspace mismatch');
      return status.opencodeSse === 'connected'; }, 10000);
  }
  async function stop() {
    if (child.exitCode !== null) return;
    const done = new Promise((resolve) => child.once('exit', resolve)); child.kill('SIGTERM'); await done;
    await delay(30);
  }
  t.after(async () => {
    for (const process of children) if (process.exitCode === null && process.signalCode === null) {
      const done = new Promise((resolve) => process.once('exit', resolve)); process.kill('SIGTERM'); await done;
    }
    await stop(); opencode.closeAllConnections();
    await new Promise((resolve) => opencode.close(resolve)); rmSync(directory, { recursive: true, force: true }); });
  const get = async (path) => { const r = await fetch(base + path, { headers: { connection: 'close' } });
    const text = await r.text(); return { status: r.status, body: text ? JSON.parse(text) : null }; };
  const post = async (path, data, { skipRecoveryDiscovery = false } = {}) => {
    if (!skipRecoveryDiscovery && path.endsWith('/job/recover') && data?.phase === 'prepare' && data?.sessionId) {
      native.messages[data.sessionId] ||= [];
      if (!native.messages[data.sessionId].some(message => message.parts?.some(part => part.state?.input?.code?.includes('request_validation')))) {
        const input = { namespace: 'cgpt-validation', query: 'request_validation' };
        native.messages[data.sessionId].push({ parts: [{ type: 'tool', tool: 'execute', callID: 'call-discovery-' + data.sessionId,
          executed: false, state: { status: 'completed', input: { code: 'return await search(' + JSON.stringify(input) + ');' },
            output: JSON.stringify({ items: [{ path: 'tools/request_validation' }] }), time: { start: 10, end: 11 },
            metadata: { truncated: false, toolCalls: [{ tool: 'search', status: 'completed', input }] } } }] });
      }
    }
    const r = await fetch(base + path, { method: 'POST',
    headers: { 'content-type': 'application/json', connection: 'close',
      ...(path.startsWith('/transport/') || path.startsWith('/cleanup/') || path.startsWith('/runtime/migration') || /^\/runs\/[^/]+\/recovery\//.test(path)
        || /^\/runs\/[^/]+\/extend-compatible$/.test(path) || /^\/runs\/[^/]+\/session-handoff$/.test(path)
        ? { 'x-cab-continuity': 'cab-continuity-v1' } : {}) },
    body: JSON.stringify(path === '/broker/readiness' ? { coordination_protocol: 'resource-scoped-v1', ...data } : data) });
    const text = await r.text(); return { status: r.status, body: text ? JSON.parse(text) : null }; };
  const candidate = (id) => ({ runId: id, ownerId: 'codex-' + id, sessionId: 'ses_' + id, directory,
    changeId: 'change-' + id, selectionKey: 'requirement-' + id, dependsOn: [],
    resources: [{ key: 'file:src/' + id + '.py', mode: 'write' }], exclusiveResources: ['file:src/' + id + '.py'] });
  async function reserve(id, override = {}) {
    const r = await post('/runs/reserve', { ...candidate(id),
      ...(override.resources ? { exclusiveResources: [] } : {}), ...override }); assert.equal(r.status, 201, JSON.stringify(r));
    const arm = await post('/runs/' + id + '/job/arm', { jobId: 'job-' + id, sessionId: 'ses_' + id,
      directory, changeId: 'change-' + id, strictCommands: true, criteria: ['delivery', 'statistics'] });
    assert.equal(arm.status, 201, JSON.stringify(arm)); return r.body;
  }
  const approval = (run, requestId, expectedRevisions = null) => {
    const resources = requestId.startsWith('preflight') ? run.resources.map((r) => ({ ...r, mode: 'read' })) : run.resources;
    const value = { run_id: run.runId, reservation_version: run.version,
    coordination_protocol: 'resource-scoped-v1', operation_id: 'op-' + requestId,
    operation_digest: createHash('sha256').update(requestId).digest('hex'),
    expected_revisions: expectedRevisions || Object.fromEntries(resources.map((r) => [r.key, 0])),
    requestId, approval_id: 'approval-' + requestId, session_id: run.sessionId,
    change_id: run.changeId, directory, files: [], commands: ['/usr/bin/true'],
    ...(requestId.startsWith('preflight') ? { timeout_seconds: 120, interval_seconds: 3 } : {}),
    resources, title: 'isolated command', summary: 'synthetic fixture' };
    native.messages[run.sessionId] ||= [];
    native.messages[run.sessionId].push({ parts: [{ type: 'tool', tool: 'cgpt-validation_request_validation',
      state: { status: 'running', input: structuredClone(value) } }] });
    return value;
  };
  await start();
  await post('/broker/readiness', { status: 'READY', pending_count: 0, infrastructure_status: 'READY' });
  async function approvedAccess(run, requestId, expectedRevisions) {
    const value = approval(run, requestId, expectedRevisions);
    assert.equal((await post('/validation/request', { approval: value })).status, 202);
    assert.equal((await post('/runs/' + run.runId + '/decision/' + value.requestId, { decision: 'approved' })).status, 201);
    const acquired = await post('/runs/' + run.runId + '/locks/acquire', { version: run.version,
      operationId: value.operation_id, operationDigest: value.operation_digest,
      resources: value.resources, expectedRevisions: value.expected_revisions });
    assert.equal(acquired.status, 200, JSON.stringify(acquired));
    return { approval: value, access: acquired.body };
  }
  async function execute(value,nativeInput) {
    if(nativeInput){
      const messageID='msg_staged_'+value.requestId,stamp=Date.now();
      native.messages[value.session_id].push({info:{id:messageID,sessionID:value.session_id,role:'assistant'},nativeV2:{id:messageID,type:'assistant',time:{created:stamp},content:[{type:'tool',id:'call-'+value.requestId,name:'shell',executed:false,time:{created:stamp,ran:stamp},state:{status:'running',input:structuredClone(nativeInput),content:[],metadata:{}}}]}});
      native.permissions.push({id:'perm-'+value.requestId,sessionID:value.session_id,permission:'shell',messageID,tool:{callID:'call-'+value.requestId},metadata:{command:value.commands[0]}});
      const checked=await nativeClient.permissions(directory,{sessionIds:[value.session_id],verifyInputs:true});
      if(checked.length)assert.equal(checked[0].metadata.nativeToolInputSha256,value.tool_input_sha256);
      try{await waitFor(()=>native.replies.some(reply=>reply.path.endsWith('/perm-'+value.requestId)))}catch(cause){const state=(await get('/runs/'+value.run_id+'/status')).body;throw new Error(JSON.stringify({reason:cause.message,lastEvent:state.lastEvent,nativeGuard:state.nativePermissionGuard}));}return;
    }
    native.permissions.push({ id: 'perm-' + value.requestId, sessionID: value.session_id,
      permission: value.commands.length ? 'bash' : 'edit', tool: { callID: 'call-' + value.requestId },
      metadata: value.commands.length ? { command: value.commands[0] } : { filepath: directory + '/' + value.files[0] } });
    await waitFor(() => native.replies.some((r) => r.path.endsWith('/perm-' + value.requestId)));
  }
  async function completeTool(value, exit = 0, { error = false, output = 'synthetic native result', nativeShell = false, nativeInput } = {}) {
    const op = (await get('/runs')).body.coordination.operations[value.operation_id];
    const stamp = Math.max(Date.now(), op.native.startedAt) + 1;
    const part = { type: 'tool', id: 'part-' + value.requestId, callID: 'call-' + value.requestId,
      sessionID: value.session_id, tool: value.commands.length ? (nativeShell ? 'shell' : 'bash') : 'edit',
      ...(nativeShell ? { executed: false } : {}), state: { status: 'completed',
        input: nativeInput || (value.commands.length ? { command: value.commands[0] } : { filePath: directory + '/' + value.files[0] }),
        output, time: { start: stamp, end: stamp + 1 }, metadata: { exit, ...(nativeShell ? { status: 'completed' } : {}), ...(error ? { error: true } : {}) } } };
    const prior=nativeInput&&native.messages[value.session_id].find(message=>message.nativeV2?.content?.some(item=>item.id===part.callID));
    if(prior){const item=prior.nativeV2.content.find(item=>item.id===part.callID);item.time.ran=stamp;item.time.completed=stamp+1;item.state={status:'completed',input:structuredClone(nativeInput),content:[{type:'text',text:output}],metadata:{truncated:false,exit,status:'completed'}};}
    else native.messages[value.session_id].push({ parts: [part] });
    native.emit({ type: 'message.part.updated', properties: { part } });
  }
  async function approvedEditAccess(run, requestId, filePath) {
    const value = approval(run, requestId);
    value.commands = []; value.files = [filePath];
    native.messages[run.sessionId].at(-1).parts[0].state.input = structuredClone(value);
    assert.equal((await post('/validation/request', { approval: value })).status, 202);
    assert.equal((await post('/runs/' + run.runId + '/decision/' + value.requestId, { decision: 'approved' })).status, 201);
    const acquired=await post('/runs/' + run.runId + '/locks/acquire', { version:run.version,
      operationId:value.operation_id,operationDigest:value.operation_digest,resources:value.resources,
      expectedRevisions:value.expected_revisions });
    assert.equal(acquired.status,200,JSON.stringify(acquired));
    return { approval:value,access:acquired.body };
  }
  async function releaseOperation(run, value, access, outcome='COMPLETED') {
    const current = access || (await post('/runs/' + run.runId + '/locks/acquire', { version:run.version,operationId:value.operation_id,operationDigest:value.operation_digest,resources:value.resources,expectedRevisions:value.expected_revisions })).body;
    return post('/runs/' + run.runId + '/locks/release', { version: run.version, operationId: current.accessId,
      token: current.token, fencing: current.fencing, outcome, evidence: ['native effects reviewed'] });
  }
  const nativeClient = createOpenCodeV2Client({ baseUrl:'http://127.0.0.1:'+opencode.address().port, directory,
    passwordFile:fixtureEnvironment.OC_Codex_OPENCODE_PASSWORD_FILE });
  return { native, nativeClient, children, directory, base, get, post, candidate, reserve, approval, start, stop,
  approvedAccess, approvedEditAccess, execute, completeTool, releaseOperation, getStderr:()=>stderr };
}

test('continuité HTTP : demandes admises et décisions survivent au redémarrage sans once dupliquée', async t => {
  const h = await setup(t);
  const pendingRun = await h.reserve('communication-pending');
  const pending = h.approval(pendingRun, 'communication-pending-request');
  assert.equal((await h.post('/validation/request', { approval: pending })).status, 202);
  const run = await h.reserve('communication-approved');
  const { approval } = await h.approvedAccess(run, 'communication-approved-request');
  await h.execute(approval);
  const before = (await h.get('/runs/' + run.runId + '/decision/' + approval.requestId)).body;
  const replies = h.native.replies.length;
  await h.stop(); await h.start();
  await h.post('/broker/readiness', { status: 'READY', pending_count: 1, infrastructure_status: 'READY' });
  assert.deepEqual((await h.get('/runs/' + run.runId + '/decision/' + approval.requestId)).body, before);
  assert.equal((await h.get('/runs/' + pendingRun.runId + '/decision/' + pending.requestId)).body, null);
  assert.equal((await h.get('/runs/' + pendingRun.runId + '/status')).body.undecidedValidationCount, 1);
  const duplicate = await h.post('/runs/' + run.runId + '/decision/' + approval.requestId, { decision: 'approved' });
  assert.equal(duplicate.status, 400); assert.equal(duplicate.body.error, 'decision-already-recorded');
  const operation = (await h.get('/runs/' + run.runId + '/operations?operationId=' + approval.operation_id)).body.operations[0];
  assert.equal(operation.onceAcknowledged, true);
  assert.equal(h.native.replies.length, replies);
});

test('frontière de décision : une intention privée non engagée ne devient pas APPROVED', async t => {
  const h = await setup(t), run = await h.reserve('uncommitted-decision');
  const approval = h.approval(run, 'uncommitted-request');
  assert.equal((await h.post('/validation/request', { approval })).status, 202);
  await h.stop();
  const path = join(runtimeStateDirectory(h.directory), 'runs', run.runId, String(run.contextId), 'controller-communication.json');
  const store = new ContinuityStore(path, 'communication', () => true), value = store.snapshot();
  value.decisions.push([approval.requestId, { decision: 'approved', requestId: approval.requestId,
    approval_id: approval.approval_id, change_id: approval.change_id }]);
  store.write(value);
  await h.start(); await h.post('/broker/readiness', { status: 'READY', pending_count: 1, infrastructure_status: 'READY' });
  assert.equal((await h.get('/runs/' + run.runId + '/decision/' + approval.requestId)).body, null);
  assert.equal((await h.post('/runs/' + run.runId + '/decision/' + approval.requestId, { decision: 'rejected' })).status, 201);
  assert.equal(h.native.replies.length, 0);
});

test('frontière de décision : le registre engagé restaure la décision si son acquittement privé manque', async t => {
  const h = await setup(t), run = await h.reserve('committed-decision');
  const { approval } = await h.approvedAccess(run, 'committed-request');
  await h.stop();
  const path = join(runtimeStateDirectory(h.directory), 'runs', run.runId, String(run.contextId), 'controller-communication.json');
  const store = new ContinuityStore(path, 'communication', () => true), value = store.snapshot();
  value.decisions = []; store.write(value);
  await h.start();
  const decision = (await h.get('/runs/' + run.runId + '/decision/' + approval.requestId)).body;
  assert.equal(decision.decision, 'approved'); assert.equal(decision.operation_id, approval.operation_id);
  assert.equal(decision.operation_digest, approval.operation_digest); assert.equal(decision.restored_from, 'operation-ledger');
  assert.equal(h.native.replies.length, 0);
});

test('continuité transport : une coupure SSE conserve une exécution acquittée et les observations reprennent leur séquence', async t => {
  const h = await setup(t);
  const run = await h.reserve('sse-continuity');
  const { approval } = await h.approvedAccess(run, 'sse-continuity-operation');
  await h.execute(approval);
  const operationPath = '/runs/' + run.runId + '/operations?operationId=' + approval.operation_id;
  const before = (await h.get(operationPath)).body.operations[0];
  const observations = (await h.get('/monitor/events')).body;
  assert.equal(observations.durable, true, JSON.stringify({ error: observations.error }));
  h.native.disconnectEvents();
  await waitFor(() => h.native.requests.filter(path => path === '/global/event').length > 1);
  assert.equal((await h.get(operationPath)).body.operations[0].state, before.state);
  assert.equal(h.native.replies.length, 1);
  await h.stop(); await h.start();
  const after = (await h.get('/monitor/events')).body;
  assert.equal(after.durable, true, JSON.stringify({ error: after.error, diagnosticCode: after.diagnosticCode }));
  assert.equal(after.instanceId, observations.instanceId);
  assert.ok(after.sequence >= observations.sequence);
  assert.equal(after.durable, true);
  const replay = (await h.get('/monitor/events?cursor=' + encodeURIComponent(observations.cursor))).body;
  assert.equal(replay.replay, 'complete');
  assert.ok(replay.events.every(event => event.sequence > observations.sequence));
});

test('transfert HTTP certifié : baux et accès sains restent valides, crash suivant protégé', async t => {
  const h = await setup(t), resources = [{ key: 'browser:host-a/chromium', mode: 'write' }];
  const run = await h.reserve('transport-handoff', { resources });
  const leaseResponse = await h.post('/runs/' + run.runId + '/test-resources/acquire', {
    version: run.version, transactionId: 'transport-chromium', resources, evidence: ['isolated lease'] });
  assert.equal(leaseResponse.status, 200, JSON.stringify(leaseResponse));
  const { access } = await h.approvedAccess(run, 'transport-held-access');
  const prepared = await h.post('/transport/prepare', { transactionId: 'update-http-handoff' });
  assert.equal(prepared.status, 200, JSON.stringify(prepared)); assert.equal(prepared.body.ready, true);
  const blocked = await h.post('/runs/' + run.runId + '/job/disarm', { jobId: 'job-' + run.runId });
  assert.equal(blocked.status, 503); assert.equal(blocked.body.error, 'transport-update-in-progress');
  await h.stop(); await h.start();
  const transport = (await h.get('/transport/status')).body;
  assert.equal(transport.adopted, true, JSON.stringify(transport));
  assert.equal(transport.transactionId, 'update-http-handoff');
  const leases = (await h.get('/runs/' + run.runId + '/test-resources')).body;
  assert.equal(leases.reservations[0].reconciliationRequired, false);
  const current = (await h.get('/runs/' + run.runId + '/locks')).body.accesses.find(item => item.accessId === access.accessId);
  assert.equal(current.token, undefined); assert.equal(current.fencing, access.fencing);
  assert.equal(h.native.replies.length, 0);
  await h.stop(); await h.start();
  assert.equal((await h.get('/transport/status')).body.adopted, false);
  const coldLeases = (await h.get('/runs/' + run.runId + '/test-resources')).body;
  assert.equal(coldLeases.reservations[0].reconciliationRequired, true);
});

test('récupération HTTP propriétaire : annulation qualifiée, reçu filtré et répétition sans effet', async t => {
  const h = await setup(t), resources = [{ key: 'browser:host-a/chromium', mode: 'write' }];
  const a = await h.reserve('recovery-a', { resources }), b = await h.reserve('recovery-b', { resources });
  for (const run of [a, b]) {
    const lease = await h.post('/runs/' + run.runId + '/test-resources/acquire', {
      version: run.version, transactionId: 'lease-' + run.runId, resources, evidence: ['isolated lease'] });
    assert.equal(lease.status, run === a ? 200 : 202, JSON.stringify(lease));
  }
  const base = '/runs/' + b.runId;
  assert.equal((await h.post(base + '/recovery/policy', { policyId: 'http-recovery-policy', ownerId: b.ownerId,
    version: b.version, actions: ['cancel-waiting-test'], resources, authorization: 'validated change recovery-b' })).status, 201);
  await h.post('/broker/readiness', { status: 'BLOCKED', pending_count: 0, infrastructure_status: 'READY' });
  const plan = (await h.get(base + '/recovery')).body;
  assert.equal(plan.actions[0].authority, 'orchestrator');
  const payload = { actionId: 'http-recovery-cancel', ownerId: b.ownerId, policyId: plan.policyId,
    boundaryDigest: plan.boundaryDigest, action: 'cancel-waiting-test', targetId: 'lease-' + b.runId,
    input: { evidence: ['owner cancels waiting lease'] } };
  const result = await h.post(base + '/recovery/action', payload);
  assert.equal(result.status, 200, JSON.stringify(result)); assert.equal(result.body.state, 'CANCELLED');
  assert.equal(result.body.token, undefined);
  const repeated = await h.post(base + '/recovery/action', payload);
  assert.deepEqual(repeated, result);
  assert.equal((await h.get(base + '/recovery/receipts?actionId=' + payload.actionId)).body.receipts[0].state, 'DONE');
  assert.equal((await h.get('/runs/' + a.runId + '/test-resources')).body.reservations[0].state, 'HELD');
  assert.equal(h.native.replies.length, 0);
});

test('attente de décision : réveil après engagement durable et consultation ordinaire immédiate', async t => {
  const h = await setup(t), run = await h.reserve('decision-wait');
  const approval = h.approval(run, 'decision-wait-request');
  assert.equal((await h.post('/validation/request', { approval })).status, 202);
  const path = '/runs/' + run.runId + '/decision/' + approval.requestId;
  assert.equal((await h.get(path)).status, 404);
  assert.equal((await h.get(path + '?wait_ms=1001')).body.error, 'decision-wait-invalid');
  const waiting = h.get(path + '?wait_ms=1000');
  await waitFor(async () => (await h.get('/runs/' + run.runId + '/status')).body.decisionWaiterCount === 1);
  assert.equal((await h.post(path, { decision: 'rejected' })).status, 201);
  const response = await waiting;
  assert.equal(response.status, 200); assert.equal(response.body.decision, 'rejected');
  assert.equal((await h.get('/runs/' + run.runId + '/status')).body.decisionWaiterCount, 0);
  assert.equal(h.native.replies.length, 0);
});

test('attente de décision : la préparation CABU libère l’attente sans décision ni perte de demande', async t => {
  const h = await setup(t), run = await h.reserve('decision-wait-handoff');
  const approval = h.approval(run, 'decision-wait-handoff-request');
  assert.equal((await h.post('/validation/request', { approval })).status, 202);
  const path = '/runs/' + run.runId + '/decision/' + approval.requestId;
  const waiting = h.get(path + '?wait_ms=1000');
  await waitFor(async () => (await h.get('/runs/' + run.runId + '/status')).body.decisionWaiterCount === 1);
  assert.equal((await h.post('/transport/prepare', { transactionId: 'update-decision-wait' })).status, 200);
  assert.equal((await waiting).status, 404);
  assert.equal((await h.post('/transport/cancel', { transactionId: 'update-decision-wait' })).status, 200);
  assert.equal((await h.get('/runs/' + run.runId + '/status')).body.undecidedValidationCount, 1);
  assert.equal((await h.get(path)).body, null); assert.equal(h.native.replies.length, 0);
});

test('checkpoint privé corrompu : diagnostic du RUN atteint et communication du pair indépendant conservés', async t => {
  const h = await setup(t), a = await h.reserve('corrupt-private-a'), b = await h.reserve('healthy-private-b');
  const approval = h.approval(a, 'corrupt-private-request');
  assert.equal((await h.post('/validation/request', { approval })).status, 202);
  await h.stop();
  const path = join(runtimeStateDirectory(h.directory), 'runs', a.runId, String(a.contextId), 'controller-communication.json');
  writeFileSync(path, 'invalid private checkpoint\n');
  await h.start(); await h.post('/broker/readiness', { status: 'READY', pending_count: 1, infrastructure_status: 'READY' });
  assert.equal((await h.get('/runs/' + a.runId + '/status')).body.recoveryRequired, 'continuity-state-invalid');
  assert.equal((await h.get('/runs/' + a.runId + '/recovery')).status, 200);
  const next = h.approval(b, 'healthy-private-request');
  assert.equal((await h.post('/validation/request', { approval: next })).status, 202);
  assert.equal((await h.post('/runs/' + b.runId + '/decision/' + next.requestId, { decision: 'rejected' })).status, 201);
  assert.equal(h.native.replies.length, 0);
});

test('source read-only fallback : OpenCode V2, session RUN liée, sans mutation et chemins exclus refusés', async t => {
  const h=await setup(t,{sourceFiles:{'src/example.py':'value = 42\n'},sourceEntries:[
    {path:'src/example.py',type:'file'},{path:'src',type:'directory'},{path:'.env',type:'file'},
  ]});
  const run=await h.reserve('source-read');
  const before=(await h.get('/runs/source-read/status')).body;
  const read=await h.get('/runs/source-read/source/read?path=src%2Fexample.py');
  assert.equal(read.status,200,JSON.stringify(read));assert.equal(read.body.content,'value = 42\n');
  assert.equal(read.body.sessionId,run.sessionId);assert.equal(read.body.directory,h.directory);
  assert.match(read.body.sha256,/^[a-f0-9]{64}$/);assert.equal(read.body.source,'opencode-v2-fs-read');
  const list=await h.get('/runs/source-read/source/list');
  assert.equal(list.status,200);assert.deepEqual(list.body.entries,[{path:'src/example.py',type:'file'},{path:'src',type:'directory'}]);
  const found=await h.get('/runs/source-read/source/find?query=example.py&type=file');
  assert.equal(found.status,200);assert.deepEqual(found.body.entries,[{path:'src/example.py',type:'file'}]);
  const fsReadsBefore=h.native.requests.filter(path=>path.startsWith('/api/fs/')).length;
  assert.equal((await h.get('/runs/source-read/source/read?path=..%2Foutside')).status,400);
  assert.equal((await h.get('/runs/source-read/source/read?path=.env')).status,400);
  assert.equal(h.native.requests.filter(path=>path.startsWith('/api/fs/')).length,fsReadsBefore);
  const after=(await h.get('/runs/source-read/status')).body;
  assert.equal(after.job.jobId,before.job.jobId);assert.equal(after.undecidedValidationCount,0);
  assert.equal(h.native.permissions.length,0);assert.equal(h.native.replies.length,0);
});

test('locks/release accepte NO_EFFECT après erreur native edit vérifiée et restaure outcome hérité',async t=>{
 const h=await setup(t);const run=await h.reserve('edit-no-effect',{resources:[{key:'file:src/theme.css',mode:'write'}]});
 const {approval,access}=await h.approvedEditAccess(run,'edit-no-effect','src/theme.css');
 await h.execute(approval);await h.completeTool(approval,0,{error:true,output:'newString is already in the file'});
 await h.stop();
 const statePath=join(runtimeStateDirectory(h.directory),'controller-runs.json');
 const state=JSON.parse(readFileSync(statePath,'utf8'));delete state.coordination.operations[approval.operation_id].nativeResult;
 writeFileSync(statePath,JSON.stringify(state));
 await h.start();await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});
 const before=(await h.get('/runs/'+run.runId+'/locks')).body.revisions['file:src/theme.css'];
 const released=await h.releaseOperation(run,approval,access,'NO_EFFECT');
 assert.equal(released.status,200,JSON.stringify(released));assert.equal(released.body.state,'RELEASED');
 assert.equal(released.body.outcome,'NO_EFFECT');assert.equal(released.body.token,undefined);
 assert.equal((await h.get('/runs/'+run.runId+'/locks')).body.revisions['file:src/theme.css'],before);
 assert.equal((await h.get('/runs/'+run.runId+'/status')).body.pendingWrites?.['file:src/theme.css'],undefined);
 assert.equal(h.native.replies.length,1);
});

test('locks/release refuse NO_EFFECT after a successful edit and allow its explicit completion',async t=>{
 const h=await setup(t);const run=await h.reserve('edit-success',{resources:[{key:'file:src/theme.css',mode:'write'}]});
 const {approval,access}=await h.approvedEditAccess(run,'edit-success','src/theme.css');
 await h.execute(approval);await h.completeTool(approval);
 const refused=await h.releaseOperation(run,approval,access,'NO_EFFECT');
 assert.equal(refused.status,409);assert.equal(refused.body.error,'access-outcome-invalid');
 assert.equal((await h.get('/runs/'+run.runId+'/locks')).body.accesses[0].state,'HELD');
 const released=await h.releaseOperation(run,approval,access,'COMPLETED');
 assert.equal(released.status,200,JSON.stringify(released));
 assert.ok((await h.get('/runs/'+run.runId+'/locks')).body.revisions['file:src/theme.css']>0);
});

test('locks/release conserve HELD sans preuve native unique et pour une erreur shell',async t=>{
 for(const kind of ['missing-proof','duplicate-proof','shell-error'])await t.test(kind,async t=>{
  const h=await setup(t);const run=await h.reserve('no-effect-'+kind,{resources:[{key:'file:src/theme.css',mode:'write'}]});
  const edit=kind!=='shell-error';
  const pair=edit?await h.approvedEditAccess(run,'no-effect-'+kind,'src/theme.css'):
    await h.approvedAccess(run,'no-effect-'+kind);
  await h.execute(pair.approval);await h.completeTool(pair.approval,0,{error:true,output:'native tool error'});
  if(kind==='missing-proof')h.native.messages[run.sessionId]=[];
  if(kind==='duplicate-proof')h.native.messages[run.sessionId].push(structuredClone(h.native.messages[run.sessionId].at(-1)));
  const response=await h.releaseOperation(run,pair.approval,pair.access,'NO_EFFECT');
  assert.equal(response.status,409,JSON.stringify(response));
  assert.ok(['native-completion-not-proved','native-outcome-history-divergent','access-outcome-invalid'].includes(response.body.error),JSON.stringify(response));
  assert.ok(['HELD','EXECUTING'].includes((await h.get('/runs/'+run.runId+'/locks')).body.accesses[0].state));
  assert.equal((await h.get('/runs/'+run.runId+'/locks')).body.revisions['file:src/theme.css'],0);
 });
});

test('restaure une approbation native exacte après redémarrage et ne répond qu’à la permission encore pendante',async t=>{
 const h=await setup(t);const run=await h.reserve('restore-approved-native',{resources:[{key:'file:src/restore.py',mode:'write'}]});
 const approval=h.approval(run,'restore-approved-native');approval.files=['src/restore.py'];approval.commands=[];
 const requestPart=h.native.messages[run.sessionId].at(-1).parts[0];requestPart.state.input=structuredClone(approval);
 assert.equal((await h.post('/validation/request',{approval})).status,202);
 const stamp=Date.now();
 const editPart={type:'tool',id:'edit-part',callID:'call-restore-native',sessionID:run.sessionId,tool:'edit',executed:false,
  nativeTool:'edit',state:{status:'running',input:{filePath:h.directory+'/src/restore.py',content:'replacement'},
   time:{start:stamp}}};
 requestPart.state.status='completed';requestPart.state.output=JSON.stringify({requestId:approval.requestId,status:'PENDING'});
 requestPart.state.time={start:stamp-3,end:stamp-2};
 h.native.messages[run.sessionId]=[{info:{id:'msg-native-restore',sessionID:run.sessionId,role:'assistant'},parts:[
  requestPart,
  {type:'tool',id:'get-approval',callID:'call-get-approval',sessionID:run.sessionId,tool:'cgpt-validation_get_approval',executed:true,
   state:{status:'completed',input:{approval_id:approval.approval_id},
    output:JSON.stringify({...approval,status:'APPROVED',reviewer:'CGPT'}),time:{start:stamp-1,end:stamp}},
  },editPart]}];
 h.native.permissions.push({id:'permission-restore-native',sessionID:run.sessionId,permission:'edit',
  messageID:'msg-native-restore',tool:{callID:'call-restore-native'},metadata:{filepath:h.directory+'/src/restore.py'}});
 await h.stop();await h.start();
 await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});
 await waitFor(()=>h.native.replies.some(reply=>reply.path.endsWith('/permission-restore-native')));
 const operation=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];
 assert.equal(operation.decision.status,'approved');assert.equal(operation.state,'EXECUTING');
 assert.equal(operation.onceAcknowledged,true);assert.equal(operation.native.callId,'call-restore-native');
 assert.equal(h.native.replies.filter(reply=>reply.path.endsWith('/permission-restore-native')).length,1);
 const finishAt=Math.max(Date.now(),operation.native.startedAt)+1;
 const completePart={type:'tool',id:'restore-native-finished',callID:'call-restore-native',sessionID:run.sessionId,
  tool:'edit',executed:true,nativeTool:'edit',state:{status:'completed',input:{filePath:h.directory+'/src/restore.py'},
   output:'native edit completed',time:{start:finishAt,end:finishAt+1},metadata:{exit:0}}};
 h.native.messages[run.sessionId].push({parts:[completePart]});
 h.native.emit({type:'message.part.updated',properties:{part:completePart}});
 await waitFor(async()=> (await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0].state==='COMPLETED');
 const completed=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];
 assert.equal(completed.nativeResult.status,'completed');assert.equal(h.native.replies.length,1);
});

test('une fin durable exacte restaure la décision et clôt sans rejouer once si la permission a disparu',async t=>{
 const h=await setup(t);const run=await h.reserve('restore-without-pending',{resources:[{key:'file:src/restore.py',mode:'write'}]});
 const approval=h.approval(run,'restore-without-pending');approval.files=['src/restore.py'];approval.commands=[];
 const requestPart=h.native.messages[run.sessionId].at(-1).parts[0];requestPart.state.input=structuredClone(approval);
 assert.equal((await h.post('/validation/request',{approval})).status,202);
 requestPart.state.status='completed';requestPart.state.output=JSON.stringify({requestId:approval.requestId,status:'PENDING'});
 h.native.messages[run.sessionId].push({parts:[{type:'tool',tool:'cgpt-validation_get_approval',state:{status:'completed',
  input:{approval_id:approval.approval_id},output:JSON.stringify({...approval,status:'APPROVED',reviewer:'CGPT'})}}]});
 const callId='call-restored-terminal',stamp=Date.now(),input={filePath:h.directory+'/src/restore.py',content:'replacement'};
 h.native.messages[run.sessionId].push({parts:[{type:'tool',callID:callId,sessionID:run.sessionId,tool:'edit',executed:false,
  state:{status:'completed',input,output:'native edit completed',time:{start:stamp,end:stamp+1},metadata:{}}}]});
 const event={type:'session.tool.success',durable:{aggregateID:run.sessionId,seq:2},data:{sessionID:run.sessionId,
  assistantMessageID:'msg-native-terminal',id:callId,name:'edit',input,content:[],metadata:{},executed:false}};
 h.native.sessionLogs[run.sessionId]=`data: ${JSON.stringify(event)}\n\ndata: ${JSON.stringify({type:'log.synced',aggregateID:run.sessionId,seq:3})}\n\n`;
 await h.stop();await h.start();await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});
 await waitFor(async()=> (await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0].state==='COMPLETED');
 assert.equal(h.native.replies.length,0);
 const operation=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];
 assert.equal(operation.state,'COMPLETED');assert.equal(operation.decision.status,'approved');assert.equal(operation.onceAcknowledged,null);
 assert.equal(operation.nativeRecovery.boundary,'TOOL_TERMINAL_SUCCESS');assert.equal(operation.nativeRecovery.callId,callId);
 assert.equal(operation.nativeRecovery.logWatermark,3);assert.equal(operation.access.state,'HELD');
});

test('un tour assistant terminal exact invalide le mandat et libère NO_EFFECT même si le broker est BLOCKED',async t=>{
 const h=await setup(t);const run=await h.reserve('restore-terminal-turn-no-effect',
  {resources:[{key:'file:src/restore.py',mode:'write'}]});
 const {approval,access}=await h.approvedEditAccess(run,'restore-terminal-turn-no-effect','src/restore.py');
 await h.stop();
 const statePath=join(runtimeStateDirectory(h.directory),'controller-runs.json');
 const state=JSON.parse(readFileSync(statePath,'utf8'));
 const op=state.coordination.operations[approval.operation_id];op.state='UNKNOWN';
 op.nativeRecovery={permissionId:null,callId:null,boundary:'TOOL_TERMINAL_UNCLASSIFIED',logWatermark:0,
  proofDigest:createHash('sha256').update('terminal-turn-unclassified').digest('hex'),observedAt:new Date().toISOString()};
 state.coordination.accesses[access.accessId].state='UNKNOWN';writeFileSync(statePath,JSON.stringify(state));
 const approved={...approval,status:'APPROVED',reviewer:'CGPT'};
 const wrapperId='call-terminal-turn-wrapper',userId='msg-terminal-turn-user',requestId='msg-terminal-turn-request',finalId='msg-terminal-turn-final';
 const stamp=Date.now();
 h.native.messages[run.sessionId]=[
  {info:{id:userId,sessionID:run.sessionId,role:'user'},parts:[{type:'text',text:'mandat'}]},
  {info:{id:requestId,sessionID:run.sessionId,role:'assistant',parentID:userId,finish:'tool-calls'},parts:[{
   type:'tool',tool:'execute',callID:wrapperId,executed:false,state:{status:'completed',input:{code:
    'return await tools["cgpt-validation"].request_validation('+JSON.stringify(approval)+');'},
    output:JSON.stringify(approved),time:{start:stamp-2,end:stamp-1},metadata:{truncated:false,toolCalls:[{
      tool:'cgpt-validation.request_validation',status:'completed',input:approval}]}}}]},
  {info:{id:finalId,sessionID:run.sessionId,role:'assistant',parentID:userId,finish:'stop',time:{completed:stamp}},parts:[
   {type:'text',text:'Validation terminée.'}]},
  {info:{id:'msg-later-readonly-user',sessionID:run.sessionId,role:'user'},parts:[{type:'text',text:'état'}]},
  {info:{id:'msg-later-readonly-assistant',sessionID:run.sessionId,role:'assistant',parentID:'msg-later-readonly-user',
   finish:'tool-calls'},parts:[{type:'tool',tool:'execute',callID:'call-later-readonly',executed:false,state:{status:'completed',
    input:{code:'return await tools["cgpt-validation"].broker_readiness({});'},output:JSON.stringify({status:'BLOCKED'}),
    metadata:{truncated:false,toolCalls:[{tool:'cgpt-validation.broker_readiness',status:'completed',input:{}}]}}}]},
  {info:{id:'msg-later-readonly-final',sessionID:run.sessionId,role:'assistant',parentID:'msg-later-readonly-user',finish:'stop'},
   parts:[{type:'text',text:'État lu.'}]},
 ];
 const callEvent=(type,sequence)=>({type,durable:{aggregateID:run.sessionId,seq:sequence},data:{sessionID:run.sessionId,
  id:'call-later-readonly',name:'execute',input:{code:'return await tools["cgpt-validation"].broker_readiness({});'},
  content:[],metadata:{status:type==='session.tool.called'?'running':'completed'},executed:false}});
 h.native.sessionLogs[run.sessionId]=`data: ${JSON.stringify(callEvent('session.tool.called',1))}\n\ndata: ${JSON.stringify(callEvent('session.tool.success',2))}\n\ndata: ${JSON.stringify({type:'log.synced',aggregateID:run.sessionId,seq:3})}\n\n`;
 await h.start();await h.post('/broker/readiness',{status:'BLOCKED',pending_count:0,infrastructure_status:'BLOCKED'});
 let observed;
 await waitFor(async()=>{
  observed=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];
  return observed.state==='CANCELLED'&&observed.access.state==='RELEASED';
 }).catch(()=>assert.fail('état observé: '+JSON.stringify(observed)+' stderr='+h.getStderr()));
 const result=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];
 assert.equal(result.state,'CANCELLED');assert.equal(result.nativeRecovery.boundary,'TERMINAL_TURN_NO_EFFECT');
 assert.equal(result.access.state,'RELEASED');
 assert.equal(result.onceAcknowledged,null);assert.equal(result.native,null);assert.equal(h.native.replies.length,0);
 assert.equal((await h.get('/runs/'+run.runId+'/locks')).body.revisions['file:src/restore.py'],0);
});

test('le tour terminal sans effet reste UNKNOWN si une permission native est pendante',async t=>{
 const h=await setup(t);const run=await h.reserve('restore-terminal-turn-pending',
  {resources:[{key:'file:src/restore.py',mode:'write'}]});
 const {approval,access}=await h.approvedEditAccess(run,'restore-terminal-turn-pending','src/restore.py');
 await h.stop();
 const statePath=join(runtimeStateDirectory(h.directory),'controller-runs.json');
 const state=JSON.parse(readFileSync(statePath,'utf8'));const op=state.coordination.operations[approval.operation_id];
 op.state='UNKNOWN';op.nativeRecovery={permissionId:null,callId:null,boundary:'TOOL_TERMINAL_UNCLASSIFIED',logWatermark:0,
  proofDigest:createHash('sha256').update('terminal-turn-unclassified').digest('hex'),observedAt:new Date().toISOString()};
 state.coordination.accesses[access.accessId].state='UNKNOWN';writeFileSync(statePath,JSON.stringify(state));
 h.native.permissions.push({id:'pending-terminal-turn',sessionID:run.sessionId,permission:'edit',tool:{callID:'call-effect'}});
 await h.start();await h.post('/broker/readiness',{status:'BLOCKED',pending_count:0,infrastructure_status:'BLOCKED'});await delay(120);
 const result=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];
 assert.equal(result.state,'UNKNOWN');assert.equal(result.access.state,'UNKNOWN');
 assert.equal(result.nativeRecovery.boundary,'TOOL_TERMINAL_UNCLASSIFIED');assert.equal(h.native.replies.length,0);
});

test('NO_EFFECT terminal peut clôturer un accès fichier disjoint d’un bail test restauré',async t=>{
 const h=await setup(t);const fileResource={key:'file:src/restore.py',mode:'write'};
 const lxcResource={key:'lxc:host-a/101',mode:'write'};
 const run=await h.reserve('restore-terminal-turn-disjoint-lease',{resources:[fileResource,lxcResource]});
 const lease=await h.post('/runs/'+run.runId+'/test-resources/acquire',{version:run.version,
  transactionId:'restored-disjoint-lease',resources:[lxcResource],evidence:['LXC identity held']});
 assert.equal(lease.status,200,JSON.stringify(lease));
 const approval=h.approval(run,'restore-terminal-turn-disjoint-lease');approval.commands=[];
 approval.files=['src/restore.py'];approval.resources=[fileResource];approval.expected_revisions={ [fileResource.key]:0 };
 h.native.messages[run.sessionId].at(-1).parts[0].state.input=structuredClone(approval);
 assert.equal((await h.post('/validation/request',{approval})).status,202);
 assert.equal((await h.post('/runs/'+run.runId+'/decision/'+approval.requestId,{decision:'approved'})).status,201);
 const accessResult=await h.post('/runs/'+run.runId+'/locks/acquire',{version:run.version,
  operationId:approval.operation_id,operationDigest:approval.operation_digest,resources:[fileResource],
  expectedRevisions:approval.expected_revisions});
 assert.equal(accessResult.status,200,JSON.stringify(accessResult));
 await h.execute(approval);await h.completeTool(approval);
 await h.stop();
 const statePath=join(runtimeStateDirectory(h.directory),'controller-runs.json');
 const state=JSON.parse(readFileSync(statePath,'utf8'));
 const operation=state.coordination.operations[approval.operation_id];operation.state='UNKNOWN';
 delete operation.native;delete operation.nativeResult;operation.nativeRecovery={permissionId:null,callId:null,
  boundary:'TOOL_TERMINAL_UNCLASSIFIED',logWatermark:0,
  proofDigest:createHash('sha256').update('terminal-turn-unclassified-with-lease').digest('hex'),observedAt:new Date().toISOString()};
 state.coordination.accesses[approval.operation_id].state='UNKNOWN';writeFileSync(statePath,JSON.stringify(state));
 const approved={...approval,status:'APPROVED',reviewer:'CGPT'},wrapperId='call-terminal-turn-disjoint-wrapper';
 const userId='msg-terminal-turn-disjoint-user',requestId='msg-terminal-turn-disjoint-request',finalId='msg-terminal-turn-disjoint-final';
 const stamp=Date.now();h.native.messages[run.sessionId]=[
  {info:{id:userId,sessionID:run.sessionId,role:'user'},parts:[{type:'text',text:'mandat'}]},
  {info:{id:requestId,sessionID:run.sessionId,role:'assistant',parentID:userId,finish:'tool-calls'},parts:[{
   type:'tool',tool:'execute',callID:wrapperId,executed:false,state:{status:'completed',input:{code:
    'return await tools["cgpt-validation"].request_validation('+JSON.stringify(approval)+');'},
    output:JSON.stringify(approved),time:{start:stamp-2,end:stamp-1},metadata:{truncated:false,toolCalls:[{
      tool:'cgpt-validation.request_validation',status:'completed',input:approval}]}}}]},
  {info:{id:finalId,sessionID:run.sessionId,role:'assistant',parentID:userId,finish:'stop',time:{completed:stamp}},parts:[
   {type:'text',text:'Validation terminée.'}]},
 ];
 await h.start();await h.post('/broker/readiness',{status:'BLOCKED',pending_count:1,infrastructure_status:'READY'});
 await waitFor(async()=>{
  const row=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];
  return row.state==='CANCELLED'&&row.access.state==='RELEASED';
 });
 const result=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];
 assert.equal(result.nativeRecovery.boundary,'TERMINAL_TURN_NO_EFFECT');
 const testState=(await h.get('/runs/'+run.runId+'/test-resources')).body.reservations[0];
 assert.equal(testState.state,'HELD');assert.equal(testState.reconciliationRequired,true);
 assert.equal(h.native.replies.length,1);
});

test('réconcilie un bail de test restauré sans token client et conserve HELD',async t=>{
 const h=await setup(t);const lxcResource={key:'lxc:host-a/101',mode:'write'};
 const fileResource={key:'file:src/independent.py',mode:'write'};
 const run=await h.reserve('reconcile-restored-used-controller',{resources:[lxcResource,fileResource]});
 const leaseResult=await h.post('/runs/'+run.runId+'/test-resources/acquire',{version:run.version,
  transactionId:'restored-used-controller-lease',resources:[lxcResource],evidence:['LXC identity checked']});
 assert.equal(leaseResult.status,200,JSON.stringify(leaseResult));const lease=leaseResult.body;
 const fileApproval=h.approval(run,'reconcile-restored-disjoint-file-op');fileApproval.files=['src/independent.py'];
 fileApproval.commands=[];fileApproval.resources=[fileResource];fileApproval.expected_revisions={[fileResource.key]:0};
 h.native.messages[run.sessionId].at(-1).parts[0].state.input=structuredClone(fileApproval);
 assert.equal((await h.post('/validation/request',{approval:fileApproval})).status,202);
 assert.equal((await h.post('/runs/'+run.runId+'/decision/'+fileApproval.requestId,{decision:'approved'})).status,201);
 const fileAccess=await h.post('/runs/'+run.runId+'/locks/acquire',{version:run.version,
  operationId:fileApproval.operation_id,operationDigest:fileApproval.operation_digest,resources:[fileResource],
  expectedRevisions:fileApproval.expected_revisions});
 assert.equal(fileAccess.status,200,JSON.stringify(fileAccess));
 await h.stop();
 const statePath=join(runtimeStateDirectory(h.directory),'controller-runs.json');
 const state=JSON.parse(readFileSync(statePath,'utf8'));
 const unresolved=state.coordination.operations[fileApproval.operation_id];unresolved.state='UNKNOWN';
 unresolved.nativeRecovery={permissionId:null,callId:null,boundary:'TOOL_TERMINAL_UNCLASSIFIED',logWatermark:0,
  proofDigest:createHash('sha256').update('disjoint-file-access-restored').digest('hex'),observedAt:new Date().toISOString()};
 state.coordination.accesses[fileApproval.operation_id].state='UNKNOWN';writeFileSync(statePath,JSON.stringify(state));
 await h.start();
 const preview=await h.get('/runs/'+run.runId+'/test-resources/reconcile-preview?transactionId='+lease.transactionId);
 assert.equal(preview.status,200,JSON.stringify(preview));assert.equal(preview.body.token,undefined);
 assert.equal(preview.body.state,'HELD');assert.equal(preview.body.reconciliationRequired,true);
 assert.equal(preview.body.operations.length,0);
 const payload={version:run.version,transactionId:lease.transactionId,fencing:lease.fencing,
  reconciliationId:'reconcile-restored-used-controller-1',boundaryDigest:preview.body.boundaryDigest,
  evidence:['same owner verified','native history terminal','session idle','no pending permissions']};
 const stale=await h.post('/runs/'+run.runId+'/test-resources/reconcile-restored',{...payload,boundaryDigest:'0'.repeat(64)});
 assert.equal(stale.status,409);assert.equal((await h.get('/runs/'+run.runId+'/test-resources')).body.reservations[0].state,'HELD');
 h.native.busy[run.sessionId]={type:'busy'};
 assert.equal((await h.post('/runs/'+run.runId+'/test-resources/reconcile-restored',payload)).status,409);
 h.native.busy={};h.native.permissions.push({id:'pending-restored-test',sessionID:run.sessionId,permission:'edit',tool:{callID:'call-pending'}});
 assert.equal((await h.post('/runs/'+run.runId+'/test-resources/reconcile-restored',payload)).status,409);
 h.native.permissions=[];
 let result;
 await waitFor(async()=>{
  result=await h.post('/runs/'+run.runId+'/test-resources/reconcile-restored',payload);
  return !(result.status===409&&result.body.error==='test-reconciliation-effect-pending');
 });
 assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.state,'HELD');
 assert.notEqual(result.body.token,lease.token);assert.ok(result.body.fencing>lease.fencing);
 const after=(await h.get('/runs/'+run.runId+'/test-resources')).body.reservations[0];
 assert.equal(after.state,'HELD');assert.equal(after.reconciliationRequired,false);assert.equal(after.token,undefined);
 assert.deepEqual(after.resources,[lxcResource]);
 const unrelated=(await h.get('/runs/'+run.runId+'/locks')).body.accesses.find(item=>item.accessId===fileApproval.operation_id);
 assert.equal(unrelated.state,'UNKNOWN');assert.deepEqual(unrelated.resources,[fileResource]);
 const replay=await h.post('/runs/'+run.runId+'/test-resources/reconcile-restored',payload);
 assert.equal(replay.status,200);assert.equal(replay.body.token,result.body.token);assert.equal(replay.body.fencing,result.body.fencing);
});

test('réconcilie un accès HELD restauré depuis la décision durable sans rejouer once',async t=>{
 const h=await setup(t);const resource={key:'file:src/restored-edit.py',mode:'write'};
 const run=await h.reserve('reconcile-restored-held-access',{resources:[resource]});
 const {approval,access:initialAccess}=await h.approvedAccess(run,'restored-held-terminal');
 await h.execute(approval);await h.completeTool(approval);
 const requestPart=h.native.messages[run.sessionId].flatMap(message=>message.parts||[]).find(part=>part.tool==='cgpt-validation_request_validation');
 requestPart.state.status='completed';requestPart.state.output=JSON.stringify({...approval,status:'APPROVED',reviewer:'CGPT'});
 const access=initialAccess;
 const completed=await h.releaseOperation(run,approval,access,'COMPLETED');
 assert.equal(completed.status,200,JSON.stringify(completed));
 const repliesBefore=h.native.replies.length;
 await h.stop();
 const statePath=join(runtimeStateDirectory(h.directory),'controller-runs.json');
 const state=JSON.parse(readFileSync(statePath,'utf8'));
 const restored=state.coordination.accesses[access.accessId];
 restored.state='HELD';restored.token=access.token;delete restored.finishedAt;delete restored.outcome;delete restored.releaseDigest;
 state.coordination.revisions[resource.key]=0;writeFileSync(statePath,JSON.stringify(state));
 await h.start();
 const route='/runs/'+run.runId+'/locks/reconcile-restored';
 const preview=await h.get('/runs/'+run.runId+'/locks/reconcile-preview?operationId='+access.accessId);
 assert.equal(preview.status,200,JSON.stringify(preview));assert.equal(preview.body.state,'HELD');
 assert.deepEqual(preview.body.operations,[{operationId:approval.operation_id,state:'COMPLETED',decisionStatus:'approved',nativeResultStatus:'completed',onceAcknowledged:true}]);
 assert.equal(preview.body.snapshot_only,true);assert.equal(preview.body.token,undefined);
 const payload={version:run.version,operationId:access.accessId,fencing:access.fencing,
  reconciliationId:'reconcile-restored-held-access-1',boundaryDigest:preview.body.boundaryDigest,
  evidence:['durable approval verified','native terminal history verified','session idle','no pending permissions']};
 assert.equal((await h.post(route,{...payload,boundaryDigest:'0'.repeat(64)})).body.error,'access-reconciliation-boundary-changed');
 assert.equal((await h.get('/runs/'+run.runId+'/locks')).body.accesses[0].state,'HELD');
 h.native.busy[run.sessionId]={type:'busy'};
 assert.equal((await h.post(route,payload)).body.error,'native-session-not-quiescent');h.native.busy={};
 h.native.permissions.push({id:'pending-restored-access',sessionID:run.sessionId,permission:'bash',tool:{callID:'call-pending'}});
 // SSE may already have exposed the permission as a local pending effect.
 // Both quiescence guards deny reconciliation without issuing another once.
 const pendingPermission=await h.post(route,payload);
 assert.equal(pendingPermission.status,409);
 assert.ok(['run-not-quiescent','native-session-not-quiescent'].includes(pendingPermission.body.error));
 h.native.permissions=[];
 await waitFor(async()=>{const status=(await h.get('/runs/'+run.runId+'/status')).body,job=status.job||{};
  return !job.currentCabMandate&&!job.recovery&&!job.modelTransition&&status.undecidedValidationCount===0&&
   status.unmatchedNativePermissionCount===0;});
 assert.equal((await h.get('/runs/'+run.runId+'/locks/reconcile-preview?operationId='+access.accessId)).body.boundaryDigest,payload.boundaryDigest);
 const result=await h.post(route,payload);
 assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.accessId,access.accessId);
 assert.equal(result.body.state,'HELD');assert.notEqual(result.body.token,access.token);assert.ok(result.body.fencing>access.fencing);
 assert.equal(h.native.replies.length,repliesBefore);
 const operation=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];
 assert.equal(operation.state,'COMPLETED');assert.equal(operation.onceAcknowledged,true);
 const current=(await h.get('/runs/'+run.runId+'/locks')).body.accesses[0];
 assert.equal(current.accessId,access.accessId);assert.equal(current.state,'HELD');
 assert.deepEqual(current.resources,[resource]);assert.equal(current.token,undefined);
 const replay=await h.post(route,payload);
 assert.equal(replay.status,200);assert.equal(replay.body.token,result.body.token);assert.equal(replay.body.fencing,result.body.fencing);
});

test('quarantine un timeout port sans libérer le verrou et laisse lire au même RUN',async t=>{
 const h=await setup(t),portWrite={key:'port:host-a/5173',mode:'write'},fileRead={key:'file:frontend/tests/browser-check.mjs',mode:'read'},
  browserWrite={key:'browser:host-a/chromium',mode:'write'};
 const run=await h.reserve('timeout-port-quarantine',{resources:[portWrite,fileRead,browserWrite]});
 const start=h.approval(run,'timeout-port-start');start.files=[];start.commands=['npm run dev'];start.resources=[portWrite];
 start.expected_revisions={[portWrite.key]:0};h.native.messages[run.sessionId].at(-1).parts[0].state.input=structuredClone(start);
 assert.equal((await h.post('/validation/request',{approval:start})).status,202);
 assert.equal((await h.post('/runs/'+run.runId+'/decision/'+start.requestId,{decision:'approved'})).status,201);
 const accessResult=await h.post('/runs/'+run.runId+'/locks/acquire',{version:run.version,operationId:start.operation_id,
  operationDigest:start.operation_digest,resources:[portWrite],expectedRevisions:start.expected_revisions});
 assert.equal(accessResult.status,200,JSON.stringify({status:accessResult.status,error:accessResult.body?.error,state:accessResult.body?.state}));
 await h.execute(start);assert.equal(h.native.replies.length,1);
 const operationState=(await h.get('/runs/'+run.runId+'/operations?operationId='+start.operation_id)).body.operations[0];
 assert.equal(operationState.state,'EXECUTING');assert.equal(operationState.onceAcknowledged,true);
 const requestPart=h.native.messages[run.sessionId].flatMap(message=>message.parts||[])
  .find(part=>part.tool==='cgpt-validation_request_validation'&&part.state?.input?.requestId===start.requestId);
 requestPart.state.status='completed';requestPart.state.output=JSON.stringify({requestId:start.requestId,
  approval_id:start.approval_id,status:'PENDING'});
 const timeoutStarted=Math.max(Date.now(),operationState.native?.startedAt||0)+1;
 h.native.messages[run.sessionId].push({info:{id:'msg-timeout-port',sessionID:run.sessionId,role:'assistant'},parts:[{
  type:'tool',tool:'shell',nativeTool:'shell',nativeFormat:'opencode-v2',id:'call-'+start.requestId,
  callID:'call-'+start.requestId,executed:false,state:{status:'completed',input:{command:start.commands[0]},
   output:'Command timed out',time:{start:timeoutStarted,end:timeoutStarted+120000},metadata:{timeout:true}}}]});
 const repliesBefore=h.native.replies.length;await h.stop();
 await h.start();await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});
 const preview=await h.get('/runs/'+run.runId+'/locks/timeout-quarantine-preview?operationId='+encodeURIComponent(start.operation_id));
 assert.equal(preview.status,200,JSON.stringify(preview));assert.ok(['EXECUTING','UNKNOWN'].includes(preview.body.state));
 assert.equal(preview.body.snapshot_only,true);assert.equal(preview.body.timeoutQuarantineRequired,true);
 const payload={version:run.version,operationId:start.operation_id,fencing:preview.body.fencing,
  quarantineId:'timeout-port-quarantine-1',boundaryDigest:preview.body.boundaryDigest,
  evidence:['native shell call timed out','native callID and command matched','session idle','no pending permissions','port lock retained']};
 assert.equal((await h.post('/runs/'+run.runId+'/locks/quarantine-timeout',{...payload,boundaryDigest:'0'.repeat(64)})).body.error,
  'timeout-quarantine-boundary-changed');
 h.native.busy[run.sessionId]={type:'busy'};
 assert.equal((await h.post('/runs/'+run.runId+'/locks/quarantine-timeout',payload)).body.error,'native-session-not-quiescent');
 h.native.busy={};
 h.native.permissions.push({id:'pending-timeout-port',sessionID:run.sessionId,permission:'bash',tool:{callID:'call-pending'}});
 assert.equal((await h.post('/runs/'+run.runId+'/locks/quarantine-timeout',payload)).body.error,'native-session-not-quiescent');
 h.native.permissions=[];
 const quarantined=await h.post('/runs/'+run.runId+'/locks/quarantine-timeout',payload);
 assert.equal(quarantined.status,200,JSON.stringify({status:quarantined.status,error:quarantined.body?.error,
  accessId:quarantined.body?.accessId,state:quarantined.body?.state}));assert.equal(quarantined.body.accessId,start.operation_id);
 assert.equal(quarantined.body.state,'HELD');assert.notEqual(quarantined.body.fencing,accessResult.body.fencing);
 assert.equal(h.native.replies.length,repliesBefore);
 const parent=(await h.get('/runs/'+run.runId+'/locks')).body.accesses.find(access=>access.accessId===start.operation_id);
 assert.equal(parent.state,'HELD');assert.equal(parent.timeoutQuarantine.operationId,start.operation_id);
 const unchanged=(await h.get('/runs/'+run.runId+'/operations?operationId='+start.operation_id)).body.operations[0];
 assert.equal(unchanged.state,'EXECUTING');assert.equal(unchanged.onceAcknowledged,true);assert.equal(unchanged.nativeResult,null);
 await h.stop();await h.start();await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});
 const locksAfterRestart=await h.get('/runs/'+run.runId+'/locks');
 const afterRestart=await h.get('/runs/'+run.runId+'/locks/timeout-quarantine-preview?operationId='+encodeURIComponent(start.operation_id));
 const safeLocks=(locksAfterRestart.body.accesses||[]).map(access=>({accessId:access.accessId,state:access.state,
  resources:access.resources,timeoutQuarantine:access.timeoutQuarantine}));
 assert.equal(afterRestart.status,200,JSON.stringify({afterRestart:afterRestart.body,locks:safeLocks}));
 assert.equal(afterRestart.body.timeoutQuarantineRequired,false);
 assert.equal(afterRestart.body.timeoutQuarantine.quarantineId,payload.quarantineId);
 const parentAfterRestart=(await h.get('/runs/'+run.runId+'/locks')).body.accesses.find(access=>access.accessId===start.operation_id);
 assert.ok(['HELD','UNKNOWN'].includes(parentAfterRestart.state));
 assert.equal(parentAfterRestart.timeoutQuarantine.quarantineId,payload.quarantineId);

 const lease=await h.post('/runs/'+run.runId+'/test-resources/acquire',{version:run.version,
  transactionId:'timeout-port-browser-lease',resources:[browserWrite],evidence:['same-run browser lease']});
 assert.equal(lease.status,200,JSON.stringify({status:lease.status,error:lease.body?.error,state:lease.body?.state}));
 const browser=h.approval(run,'timeout-port-browser-read');browser.files=[];browser.commands=['node frontend/tests/browser-check.mjs'];
 browser.resources=[fileRead,{key:portWrite.key,mode:'read'},browserWrite];
 browser.expected_revisions={[fileRead.key]:0,[portWrite.key]:0,[browserWrite.key]:0};
 h.native.messages[run.sessionId].at(-1).parts[0].state.input=structuredClone(browser);
 const browserRequest=await h.post('/validation/request',{approval:browser});assert.equal(browserRequest.status,202,
  JSON.stringify({status:browserRequest.status,error:browserRequest.body?.error}));
 const browserDecision=await h.post('/runs/'+run.runId+'/decision/'+browser.requestId,{decision:'approved'});
 assert.equal(browserDecision.status,201,JSON.stringify({status:browserDecision.status,error:browserDecision.body?.error}));
 const readAccess=await h.post('/runs/'+run.runId+'/locks/acquire',{version:run.version,operationId:browser.operation_id,
  operationDigest:browser.operation_digest,resources:browser.resources,expectedRevisions:browser.expected_revisions});
 assert.equal(readAccess.status,200,JSON.stringify({status:readAccess.status,error:readAccess.body?.error,state:readAccess.body?.state}));
 assert.equal(readAccess.body.state,'HELD');
 assert.deepEqual(readAccess.body.resources,[...browser.resources].sort((a,b)=>a.key.localeCompare(b.key)));
 assert.equal(h.native.replies.length,repliesBefore);
 const replay=await h.post('/runs/'+run.runId+'/locks/quarantine-timeout',payload);
 assert.equal(replay.status,200);assert.equal(replay.body.timeoutQuarantine.quarantineId,payload.quarantineId);
});


test('un journal durable indisponible conserve UNKNOWN et protège le manifeste',async t=>{
 const h=await setup(t);const run=await h.reserve('restore-log-unavailable',{resources:[{key:'file:src/restore.py',mode:'write'}]});
 const approval=h.approval(run,'restore-log-unavailable');approval.files=['src/restore.py'];approval.commands=[];
 const requestPart=h.native.messages[run.sessionId].at(-1).parts[0];requestPart.state.input=structuredClone(approval);
 assert.equal((await h.post('/validation/request',{approval})).status,202);
 requestPart.state.status='completed';requestPart.state.output=JSON.stringify({requestId:approval.requestId,status:'PENDING'});
 h.native.messages[run.sessionId].push({parts:[{type:'tool',tool:'cgpt-validation_get_approval',state:{status:'completed',
  input:{approval_id:approval.approval_id},output:JSON.stringify({...approval,status:'APPROVED',reviewer:'CGPT'})}}]});
 h.native.messages[run.sessionId].push({parts:[{type:'tool',callID:'call-log-unavailable',sessionID:run.sessionId,
  tool:'edit',executed:false,state:{status:'running',input:{filePath:h.directory+'/src/restore.py',content:'replacement'}}}]});
 h.native.sessionLogFailure=true;
 await h.stop();await h.start();await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});
 await waitFor(async()=> (await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0].state==='UNKNOWN');
 const operation=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];
 assert.equal(operation.decision.status,'approved');assert.equal(operation.access.state,'UNKNOWN');
 assert.equal(operation.nativeRecovery.boundary,'TOOL_TERMINAL_UNCLASSIFIED');
 assert.equal(operation.nativeRecovery.logWatermark,null);assert.equal(h.native.replies.length,0);
});

test('une réponse perdue sans permission native restante conserve UNKNOWN sans rejeu',async t=>{
 const h=await setup(t);const run=await h.reserve('restore-lost-reply',{resources:[{key:'file:src/restore.py',mode:'write'}]});
 const {approval}=await h.approvedEditAccess(run,'restore-lost-reply','src/restore.py');
 await h.execute(approval);assert.equal(h.native.replies.length,1);assert.equal(h.native.permissions.length,0);
 const stamp=Date.now();
 const requestPart=h.native.messages[run.sessionId].at(-1).parts[0];requestPart.state.status='completed';
 requestPart.state.output=JSON.stringify({requestId:approval.requestId,status:'PENDING'});requestPart.state.time={start:stamp-4,end:stamp-3};
 h.native.messages[run.sessionId].push({parts:[
  {type:'tool',tool:'cgpt-validation_get_approval',state:{status:'completed',input:{approval_id:approval.approval_id},
    output:JSON.stringify({...approval,status:'APPROVED',reviewer:'CGPT'}),time:{start:stamp-2,end:stamp-1}}},
  {type:'tool',callID:'call-'+approval.requestId,sessionID:run.sessionId,tool:'edit',executed:false,nativeTool:'edit',
    state:{status:'running',input:{filePath:h.directory+'/src/restore.py',content:'replacement'},time:{start:stamp}}},
 ]});
 await h.stop();
 const statePath=join(runtimeStateDirectory(h.directory),'controller-runs.json');
 const state=JSON.parse(readFileSync(statePath,'utf8'));
 const operation=state.coordination.operations[approval.operation_id];
 operation.state='UNKNOWN';operation.native.onceAcknowledged=false;
 state.coordination.accesses[approval.operation_id].state='UNKNOWN';writeFileSync(statePath,JSON.stringify(state));
 await h.start();await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});
 await delay(100);
 assert.equal(h.native.replies.length,1);assert.equal(h.native.permissions.length,0);
 const view=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];
 assert.equal(view.state,'UNKNOWN');assert.equal(view.onceAcknowledged,false);assert.equal(view.native.callId,'call-restore-lost-reply');
});

test('refuse une permission pendante dont le callID diverge de l’opération durable',async t=>{
 const h=await setup(t);const run=await h.reserve('restore-callid-mismatch',{resources:[{key:'file:src/restore.py',mode:'write'}]});
 const {approval}=await h.approvedEditAccess(run,'restore-callid-mismatch','src/restore.py');
 await h.execute(approval);assert.equal(h.native.replies.length,1);
 const statePath=join(runtimeStateDirectory(h.directory),'controller-runs.json');
 await h.stop();
 const state=JSON.parse(readFileSync(statePath,'utf8'));const operation=state.coordination.operations[approval.operation_id];
 operation.state='UNKNOWN';operation.native.onceAcknowledged=false;operation.native.callId='call-original';
 state.coordination.accesses[approval.operation_id].state='UNKNOWN';writeFileSync(statePath,JSON.stringify(state));
 const stamp=Date.now();
 h.native.messages[run.sessionId]=[{info:{id:'msg-callid-mismatch',sessionID:run.sessionId,role:'assistant'},parts:[
  {type:'tool',tool:'cgpt-validation_request_validation',state:{status:'completed',input:approval,
   output:JSON.stringify({requestId:approval.requestId,status:'PENDING'}),time:{start:stamp-4,end:stamp-3}}},
  {type:'tool',tool:'cgpt-validation_get_approval',state:{status:'completed',input:{approval_id:approval.approval_id},
   output:JSON.stringify({...approval,status:'APPROVED',reviewer:'CGPT'}),time:{start:stamp-2,end:stamp-1}}},
  {type:'tool',callID:'call-other',sessionID:run.sessionId,tool:'edit',executed:false,nativeTool:'edit',
   state:{status:'running',input:{filePath:h.directory+'/src/restore.py',content:'replacement'},time:{start:stamp}}},
 ]}];
 h.native.permissions.push({id:'perm-'+approval.requestId,sessionID:run.sessionId,permission:'edit',
  messageID:'msg-callid-mismatch',tool:{callID:'call-other'},metadata:{filepath:h.directory+'/src/restore.py'}});
 await h.start();await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});await delay(100);
 assert.equal(h.native.replies.length,1);assert.equal(h.native.permissions.length,1);
 const view=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];
 assert.equal(view.state,'UNKNOWN');assert.equal(view.onceAcknowledged,false);assert.equal(view.native.callId,'call-original');
});

test('source read-only fallback refuse une permission native en attente',async t=>{
  const h=await setup(t,{sourceFiles:{'src/file.py':'x=1\n'}});const run=await h.reserve('source-busy');
  h.native.permissions.push({id:'pending-read-boundary',sessionID:run.sessionId,permission:'edit',tool:{callID:'call-read'}});
  const before=h.native.requests.filter(path=>path.startsWith('/api/fs/')).length;
  const result=await h.get('/runs/source-busy/source/read?path=src%2Ffile.py');
  assert.equal(result.status,409);assert.equal(result.body.error,'source-read-native-session-busy');
  assert.equal(h.native.requests.filter(path=>path.startsWith('/api/fs/')).length,before);
});

test('garde du moniteur : quiescence, origine et exclusion des mutations concurrentes', async (t) => {
  const h = await setup(t);
  const headers = { 'content-type': 'application/json', 'x-cab-monitor': '1' };
  const post = async (path, body, extra = {}) => {
    const response = await fetch(h.base + '/monitor/lifecycle/' + path, { method: 'POST',
      headers: { ...headers, ...extra }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  assert.equal((await post('prepare', { workspace: h.directory }, { origin: 'https://foreign.invalid' })).status, 403);
  h.native.busy = { session: { type: 'busy' } };
  assert.equal((await post('prepare', { workspace: h.directory })).status, 409);
  h.native.busy = {};
  h.native.permissions = [{ id: 'pending', sessionID: 'session' }];
  assert.equal((await post('prepare', { workspace: h.directory })).status, 409);
  h.native.permissions = [];
  const lease = await post('prepare', { workspace: h.directory });
  assert.equal(lease.status, 200, JSON.stringify(lease));
  assert.equal(lease.body.workspace, h.directory); assert.ok(lease.body.pid > 0);
  assert.equal((await h.post('/runs/reserve', h.candidate('blocked'))).status, 409);
  assert.equal((await post('release', { token: 'wrong' })).status, 409);
  assert.equal((await post('release', { token: lease.body.token })).status, 200);
  await h.reserve('active');
  assert.equal((await post('prepare', { workspace: h.directory })).status, 409);
});

test('la garde refuse une mutation déjà en vol sans interrompre sa réservation', async (t) => {
  const h = await setup(t); let resume; let entered;
  const waiting = new Promise((resolve) => { entered = resolve; });
  const paused = new Promise((resolve) => { resume = resolve; });
  h.native.onRequest = async (path) => { if (path === '/session/ses_race') { entered(); await paused; } };
  const reservation = h.post('/runs/reserve', h.candidate('race')); await waiting;
  const response = await fetch(h.base + '/monitor/lifecycle/prepare', { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-cab-monitor': '1' }, body: JSON.stringify({ workspace: h.directory }) });
  assert.equal(response.status, 409); resume();
  assert.equal((await reservation).status, 201);
});

test('API STATS et purge : contrat HTTP, origines et préservation du RUN', async (t) => {
  const h = await setup(t);
  await h.reserve('stats');
  const before = (await h.get('/runs')).body;
  assert.equal((await h.get('/statistics/dashboard?selection=7d&runId=stats')).status, 200);
  assert.equal((await h.get('/statistics/dashboard?selection=invalid')).status, 400);
  const route = h.base + '/statistics/retention/preview';
  const headers = { 'content-type': 'application/json', 'x-cab-statistics': '1' };
  assert.equal((await fetch(route, { method: 'POST', body: '{"days":7}' })).status, 400);
  assert.equal((await fetch(route, { method: 'POST', headers: { ...headers, origin: 'http://foreign.invalid' }, body: '{"days":7}' })).status, 403);
  const response = await fetch(route, { method: 'POST', headers, body: '{"days":7}' });
  assert.equal(response.status, 200); const preview = await response.json();
  assert.ok(preview.protectedContexts >= 1);
  const purge = await fetch(h.base + '/statistics/retention/purge', { method: 'POST', headers,
    body: JSON.stringify({ token: preview.token, confirm: true }) });
  assert.equal(purge.status, 200); assert.equal((await purge.json()).status, 'completed');
  assert.deepEqual((await h.get('/runs')).body, before);
});

for (const [environment, expected] of [[{}, 16384], [{ OC_Codex_MAX_COMMAND_LENGTH: '4096' }, 4096],
  [{ OC_CGPT_MAX_COMMAND_LENGTH: '2000' }, 2000]]) {
  test(`statuts publics et journal de supervision en lecture seule : limite ${expected}`, async (t) => {
    const h = await setup(t, { environment });
    assert.deepEqual((await h.get('/status')).body.configuration, { maxCommandLength: expected, commandLengthUnit: 'UTF-16' });
    const run = await h.reserve('monitor');
    assert.equal((await h.get('/status')).body.configuration.maxCommandLength, expected);
    assert.equal((await h.get('/runs/monitor/status')).body.configuration.maxCommandLength, expected);
    const approval = h.approval(run, 'monitor-request');
    approval.summary = 'PRIVATE-MONITOR-SENTINEL';
    h.native.messages[run.sessionId].at(-1).parts[0].state.input.summary = approval.summary;
    const pending = await h.post('/validation/request', { approval });
    assert.equal(pending.status, 202, JSON.stringify(pending));
    const before = (await h.get('/runs')).body;
    const observed = await h.get('/monitor/events');
    assert.equal(observed.status, 200);
    assert.ok(observed.body.events.some((event) => event.requestId === 'monitor-request' && event.runId === 'monitor'));
    assert.ok(!JSON.stringify(observed.body).includes('PRIVATE-MONITOR-SENTINEL'));
    assert.deepEqual((await h.get('/runs')).body, before);
    assert.equal(h.native.replies.length, 0);
    const abort = new AbortController();
    const stream = await fetch(h.base + '/monitor/events', { headers: { accept: 'text/event-stream' }, signal: abort.signal });
    const reader = stream.body.getReader();
    assert.match(new TextDecoder().decode((await reader.read()).value), /event: snapshot/);
    abort.abort(); await reader.cancel().catch(() => {});
  });
}

test('le chemin historique accepte une étape et la conserve après redémarrage', async (t) => {
  const h = await setup(t);
  assert.equal((await h.post('/job/arm', { jobId: 'legacy-step', sessionId: 'ses_legacy_step',
    directory: h.directory, changeId: 'change-legacy', criteria: [] })).status, 201);
  const declared = await h.post('/job/progress', { jobId: 'legacy-step', stepId: 'ARCHIVING', expectedStepSequence: 0 });
  assert.equal(declared.status, 202);
  assert.equal(declared.body.terminalGate.status, 'OPEN');
  await h.stop(); await h.start();
  assert.deepEqual((await h.get('/job')).body.lifecycle, declared.body.lifecycle);
  assert.equal(h.native.replies.length, 0);
});

test('cycle par RUN : retour 8→6, idempotence, restauration et nouveau job', async (t) => {
  const h = await setup(t); await h.reserve('steps'); await h.reserve('peer');
  const progress = (stepId, expectedStepSequence, extra = {}) => h.post('/runs/steps/job/progress',
    { jobId: 'job-steps', stepId, expectedStepSequence, ...extra });
  assert.equal((await h.get('/runs/steps/job')).body.lifecycle, null);
  assert.equal((await progress('REVIEW', 0)).status, 202);
  const implementation = await progress('IMPLEMENTATION', 1);
  assert.equal(implementation.status, 202);
  const lifecycle = implementation.body.lifecycle;
  assert.deepEqual(lifecycle.history.map((entry) => entry.id), ['REVIEW', 'IMPLEMENTATION']);
  assert.deepEqual((await progress('IMPLEMENTATION', 1)).body.lifecycle, lifecycle);
  assert.equal((await progress('CLOSURE', 1)).status, 400);
  assert.equal((await progress('UNKNOWN', 2)).status, 400);
  assert.equal((await progress('CLOSURE', 2, { stepStatus: 'DONE' })).status, 400);
  const a = (await h.get('/runs/steps/status')).body;
  assert.equal(a.coordination.phase, 'WORK'); assert.equal(a.terminalGate.status, 'OPEN');
  assert.equal((await h.get('/runs/peer/job')).body.lifecycle, null);
  assert.equal(h.native.replies.length, 0);
  assert.ok((await h.get('/monitor/events')).body.events.some((event) => event.runId === 'steps' && event.stepId === 'IMPLEMENTATION'));
  await h.stop(); await h.start();
  assert.deepEqual((await h.get('/runs/steps/job')).body.lifecycle, lifecycle);
  await h.post('/broker/readiness', { status: 'READY', pending_count: 0 });
  assert.equal((await h.post('/runs/steps/job/arm', { jobId: 'job-steps', sessionId: 'ses_steps', directory: h.directory,
    changeId: 'change-steps', criteria: ['delivery', 'statistics'] })).status, 201);
  assert.deepEqual((await h.get('/runs/steps/job')).body.lifecycle, lifecycle);
  assert.equal((await progress('CLOSURE', 2)).body.terminalGate.status, 'OPEN');
  assert.equal((await h.post('/runs/steps/job/terminal-gate', { state: 'TERMINÉ' })).status, 201);
  assert.equal((await progress('IMPLEMENTATION', 3)).status, 400);
  assert.equal((await h.post('/runs/steps/job/disarm', { jobId: 'job-steps' })).status, 202);
  assert.equal((await h.post('/runs/steps/job/arm', { jobId: 'new-job', sessionId: 'ses_steps', directory: h.directory,
    changeId: 'change-steps', criteria: [] })).body.lifecycle, null);
});

test('deux déclarations concurrentes ne perdent aucun passage et une persistance échouée ne publie pas l’étape', async (t) => {
  const h = await setup(t); const run = await h.reserve('steps');
  const progress = (stepId, expectedStepSequence) => h.post('/runs/steps/job/progress',
    { jobId: 'job-steps', stepId, expectedStepSequence });
  const results = await Promise.all([progress('REVIEW', 0), progress('IMPLEMENTATION', 0)]);
  assert.equal(results.filter((result) => result.status === 202).length, 1);
  assert.ok(results.some((result) => [400, 409].includes(result.status)));
  const before = (await h.get('/runs/steps/job')).body.lifecycle;
  assert.equal(before.sequence, 1);
  const target = before.history[0].id === 'REVIEW' ? 'IMPLEMENTATION' : 'REVIEW';
  const temporary = join(runtimeStateDirectory(h.directory), 'runs', 'steps',
    String(run.contextId || run.version), 'controller-job.json.tmp');
  mkdirSync(temporary);
  assert.equal((await progress(target, 1)).status, 400);
  assert.deepEqual((await h.get('/runs/steps/job')).body.lifecycle, before);
  assert.equal((await h.get('/monitor/events')).body.events.filter((event) => event.type === 'lifecycle-step-changed').length, 1);
  rmSync(temporary, { recursive: true });
  assert.equal((await progress(target, 1)).body.lifecycle.sequence, 2);
});

test('publication ciblée HTTP : reçu après reprise, génération, gate et pair indépendant', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); const b = await h.reserve('b');
  const { approval, access } = await h.approvedAccess(a, 'published-a');
  await h.execute(approval); await h.completeTool(approval); h.native.busy.ses_b = { type: 'busy' };
  const payload = { version: a.version, operationId: access.accessId, token: access.token, fencing: access.fencing,
    transactionId: 'publication-a', outcome: 'COMPLETED', proofRevisions: approval.expected_revisions,
    reportFile: 'openspec/changes/archive/2026-10-16-change-a/STATISTIQUES.md', evidence: ['validation and archive reviewed'] };
  const result = await h.post('/runs/a/publish', payload); assert.equal(result.status, 200, JSON.stringify(result));
  assert.ok((await h.get('/monitor/events')).body.events.some((event) =>
    event.operationId === approval.operation_id && event.operationState === 'COMPLETED'));
  assert.equal((await h.get('/runs/b/status')).body.coordination.reason, null);
  assert.equal((await h.get('/runs')).body.runs.find((r) => r.runId === 'b').version, b.version);
  assert.equal((await h.get('/runs/a/status')).body.terminalGate.status, 'OPEN');
  assert.equal((await h.post('/validation/request', { approval: h.approval(a, 'old-version') })).body.error, 'reservation-version-stale');
  await h.stop(); await h.start();
  assert.deepEqual((await h.post('/runs/a/publish', payload)).body, result.body);
  assert.equal((await h.post('/runs/a/publish', { ...payload, evidence: ['different'] })).body.error, 'publication-transaction-divergent');
});

test('le contrôle global exceptionnel regroupe les lectures natives de la cohorte', async (t) => {
  // La mesure vise la requête de cohorte, sans le polling périodique des permissions.
  const h = await setup(t, { reconnectMs: 10000 });
  await waitFor(() => h.native.requests.includes('/session/status'));
  for (const id of ['a', 'b', 'c']) await h.reserve(id);
  const g = await h.post('/coordination/global/request', { cause: 'SHARED_MAINTENANCE', scope: 'all',
    transactionId: 'maintenance', authorization: 'explicit developer maintenance', evidence: ['authorized'] });
  assert.equal(g.status, 202); h.native.requests.length = 0;
  const confirmed = await h.post('/coordination/global/confirm', { ...g.body, evidence: ['native quiescence'] });
  assert.equal(confirmed.status, 200, JSON.stringify(confirmed));
  assert.equal(h.native.requests.filter((p) => p === '/session/status').length, 1);
  assert.equal(h.native.requests.filter((p) => p === '/permission').length, 1);
});

test('les attentes de ressources exposent le pair courant sans contenu natif sensible', async (t) => {
  const h = await setup(t); const resources = [{ key: 'file:common', mode: 'write' }];
  const a = await h.reserve('a', { resources, exclusiveResources: [] });
  const b = await h.reserve('b', { resources, exclusiveResources: [] });
  await h.approvedAccess(a, 'holder');
  const approval = h.approval(b, 'waiting');
  await h.post('/validation/request', { approval }); await h.post('/runs/b/decision/waiting', { decision: 'approved' });
  const waiting = await h.post('/runs/b/locks/acquire', { version: b.version, operationId: approval.operation_id,
    operationDigest: approval.operation_digest, resources, expectedRevisions: approval.expected_revisions });
  assert.equal(waiting.status, 202); assert.equal(waiting.body.token, undefined);
  const status = (await h.get('/runs/b/status')).body;
  assert.equal(status.coordination.blockers[0].runId, 'a');
  assert.equal(status.coordination.reason, 'resource-conflict'); assert.equal(h.native.replies.length, 0);
});

test('une cohorte occupée, invalide ou divergente refuse le gel exceptionnel', async (t) => {
  const h = await setup(t); await h.reserve('a'); await h.reserve('b');
  const g = (await h.post('/coordination/global/request', { cause: 'GLOBAL_PAUSE', scope: 'all',
    transactionId: 'pause', authorization: 'explicit pause all', evidence: ['authorized'] })).body;
  const confirm = () => h.post('/coordination/global/confirm', { ...g, evidence: ['quiescent'] });
  h.native.busy.ses_b = { type: 'busy' }; assert.equal((await confirm()).body.error, 'native-session-not-quiescent');
  h.native.busy = { ses_b: { type: 'invalid' } };
  assert.ok(['native-reconciliation-invalid', 'opencode-session-status-invalid'].includes((await confirm()).body.error));
  h.native.busy = {}; h.native.sessions.ses_b = { directory: '/different' };
  assert.equal((await confirm()).body.error, 'native-session-divergent');
  assert.equal((await h.get('/coordination/global')).body.global.state, 'DRAINING');
});

test('un événement SSE pendant le contrôle exceptionnel impose une observation neuve', async (t) => {
  const h = await setup(t); await h.reserve('a');
  const g = (await h.post('/coordination/global/request', { cause: 'GLOBAL_PAUSE', scope: 'all',
    transactionId: 'pause', authorization: 'explicit pause all', evidence: ['authorized'] })).body;
  let fired = false; h.native.onRequest = async (path) => {
    if (path !== '/session/status' || fired) return; fired = true;
    h.native.emit({ type: 'session.status', properties: { sessionID: 'ses_a', status: { type: 'idle' } } }); await delay(50);
  };
  assert.equal((await h.post('/coordination/global/confirm', { ...g, evidence: ['quiescence'] })).body.error, 'native-observation-changed');
  h.native.onRequest = null;
  assert.equal((await h.post('/coordination/global/confirm', { ...g, evidence: ['quiescence'] })).status, 200);
});

test('une mutation pendant observation exceptionnelle refuse une cohorte périmée', async (t) => {
  const h = await setup(t); await h.reserve('a'); const b = await h.reserve('b');
  const g = (await h.post('/coordination/global/request', { cause: 'SHARED_MAINTENANCE', scope: 'all',
    transactionId: 'maintenance', authorization: 'authorized maintenance', evidence: ['authorized'] })).body;
  let fired = false; h.native.onRequest = async (path) => {
    if (path !== '/session/status' || fired) return; fired = true;
    await h.post('/runs/b/suspend', { version: b.version, action: 'PAUSE', evidence: ['targeted pause'],
      maintenanceTransactionId: g.transactionId, maintenanceGeneration: g.generation });
  };
  assert.equal((await h.post('/coordination/global/confirm', { ...g, evidence: ['quiescence'] })).body.error, 'native-observation-changed');
  assert.equal((await h.get('/coordination/global')).body.global.state, 'DRAINING');
});

test('une pause sous gel global est liée à SHARED_MAINTENANCE et à sa génération', async (t) => {
  const h = await setup(t); const a = await h.reserve('a');
  const g = (await h.post('/coordination/global/request', { cause: 'SHARED_MAINTENANCE', scope: 'all',
    transactionId: 'maintenance-bound-pause', authorization: 'authorized maintenance', evidence: ['authorized'] })).body;
  assert.equal((await h.post('/runs/a/suspend', { version: a.version, action: 'PAUSE', evidence: ['pause'] })).body.error,
    'global-coordination-suspended');
  assert.equal((await h.post('/runs/a/suspend', { version: a.version, action: 'PAUSE', evidence: ['pause'],
    maintenanceTransactionId: 'other', maintenanceGeneration: g.generation })).body.error, 'global-coordination-suspended');
  const paused = await h.post('/runs/a/suspend', { version: a.version, action: 'PAUSE', evidence: ['pause'],
    maintenanceTransactionId: g.transactionId, maintenanceGeneration: g.generation });
  assert.equal(paused.status, 200); assert.equal(paused.body.suspension.action, 'PAUSE');
  assert.equal((await h.get('/coordination/global')).body.global.state, 'DRAINING');
});

test('une progression tardive conserve les effets non résolus pendant le drainage global', async (t) => {
  const h = await setup(t); await h.reserve('a'); await h.reserve('b');
  const g = (await h.post('/coordination/global/request', { cause: 'GLOBAL_STOP', scope: 'all',
    transactionId: 'stop', authorization: 'explicit global stop', evidence: ['authorized'] })).body;
  let fired = false; h.native.onRequest = async (path) => {
    if (path !== '/session/status' || fired) return; fired = true;
    await h.post('/runs/b/job/progress', { jobId: 'job-b', currentCabMandate: 'late-effect' });
  };
  assert.equal((await h.post('/coordination/global/confirm', { ...g, evidence: ['quiescence'] })).body.error, 'run-not-quiescent');
});

test('deux publications simultanées produisent un seul reçu sans nouvelle permission', async (t) => {
  const h = await setup(t); const a = await h.reserve('a');
  const { approval, access } = await h.approvedAccess(a, 'simultaneous'); await h.execute(approval); await h.completeTool(approval);
  const payload = { version: a.version, operationId: access.accessId, token: access.token, fencing: access.fencing,
    transactionId: 'once-publish', outcome: 'COMPLETED', proofRevisions: approval.expected_revisions, evidence: ['reviewed'] };
  const replies = await Promise.all([h.post('/runs/a/publish', payload), h.post('/runs/a/publish', payload)]);
  assert.ok(replies.some((r) => r.status === 200)); assert.ok(replies.every((r) => [200, 409].includes(r.status)));
  assert.equal((await h.post('/runs/a/publish', payload)).body.referenceVersion, 1);
  assert.equal(Object.keys((await h.get('/runs')).body.coordination.publications).length, 1);
  assert.equal(h.native.replies.length, 1);
});

test('une fin native inconnue garde les protections et interdit le gate', async (t) => {
  const h = await setup(t); const a = await h.reserve('a');
  const { approval, access } = await h.approvedAccess(a, 'unknown'); await h.execute(approval);
  const refused = await h.releaseOperation(a, approval, access);
  assert.equal(refused.body.error, 'native-completion-not-proved');
  assert.equal((await h.post('/runs/a/job/terminal-gate', { state: 'TERMINÉ' })).body.error, 'run-accesses-unresolved');
  assert.equal((await h.get('/runs/a/locks')).body.accesses[0].state, 'EXECUTING');
  await h.completeTool(approval);
  const released = await h.releaseOperation(a, approval, access);
  assert.equal(released.status, 200); assert.equal(Object.hasOwn(released.body, 'token'), false);
  assert.equal(Object.hasOwn((await h.get('/runs/a/locks')).body.accesses[0], 'token'), false);
  const replay = await h.releaseOperation(a, approval, access);
  assert.equal(replay.status, 200); assert.equal(Object.hasOwn(replay.body, 'token'), false);
});

test('fin SSE idle sans partie : le transcript corrélé clôt une commande exit 1 sans succès implicite', async (t) => {
  const h = await setup(t); const run = await h.reserve('idle-transcript-fallback');
  const { approval, access } = await h.approvedAccess(run, 'idle-transcript-fallback');
  await h.execute(approval);
  await waitFor(async () => (await h.get('/status')).body.opencodeSse === 'connected');
  const operation = (await h.get('/runs')).body.coordination.operations[approval.operation_id];
  const start = operation.native.startedAt + 1;
  h.native.messages[run.sessionId].push({ parts: [{ type: 'tool', id: 'part-idle-transcript-fallback',
    callID: 'call-' + approval.requestId, sessionID: run.sessionId, tool: 'shell', executed: false,
    state: { status: 'completed',
      input: { command: approval.commands[0] }, time: { start, end: start + 1 },
      metadata: { status: 'completed', exit: 1 } } }] });
  h.native.emit({ type: 'session.idle', location: { directory: h.directory },
    properties: { sessionID: run.sessionId, status: { type: 'idle' } } });
  await waitFor(async () => (await h.get('/runs')).body.coordination.operations[approval.operation_id].state === 'COMPLETED');
  const completed = (await h.get('/runs')).body.coordination.operations[approval.operation_id];
  assert.equal(completed.state, 'COMPLETED');
  assert.match(completed.completionDigest, /^[a-f0-9]{64}$/);
  assert.equal((await h.get('/runs/' + run.runId + '/locks')).body.accesses[0].state, 'HELD');
  assert.equal(h.native.replies.length, 1, 'aucune nouvelle once après relecture du transcript');
  const released = await h.releaseOperation(run, approval, access);
  assert.equal(released.status, 200);
});

test('attach réconcilie la fin native prouvée avant rattachement sans libérer les protections', async (t) => {
  const h = await setup(t); const a = await h.reserve('attach-refresh');
  const { approval, access } = await h.approvedAccess(a, 'attach-parent'); await h.execute(approval);
  const diagnostic = h.approval(a, 'attach-diagnostic'); diagnostic.access_id = access.accessId;
  h.native.messages[a.sessionId].at(-1).parts[0].state.input.access_id = access.accessId;
  assert.equal((await h.post('/validation/request', { approval: diagnostic })).status, 202);
  assert.equal((await h.post('/runs/' + a.runId + '/decision/' + diagnostic.requestId, { decision: 'approved' })).status, 201);
  const payload = { version: a.version, operationId: access.accessId, token: access.token, fencing: access.fencing,
    operationIds: [diagnostic.operation_id], evidence: ['diagnostic exact approuvé'] };
  const route = '/runs/' + a.runId + '/locks/attach';
  assert.equal((await h.post(route, { ...payload, token: 'incorrect' })).body.error, 'access-token-invalid');
  assert.equal((await h.post(route, payload)).body.error, 'native-completion-not-proved');
  const op = (await h.get('/runs')).body.coordination.operations[approval.operation_id];
  const part = { type: 'tool', tool: 'bash', callID: 'incorrect', state: { status: 'completed',
    input: { command: '/usr/bin/true' }, time: { start: op.native.startedAt, end: Date.now() + 10 }, metadata: { exit: 1 } } };
  h.native.messages[a.sessionId].push({ parts: [part] });
  assert.equal((await h.post(route, payload)).body.error, 'native-completion-not-proved');
  assert.equal((await h.get('/runs/' + a.runId + '/locks')).body.accesses[0].state, 'EXECUTING');
  part.callID = 'call-' + approval.requestId;
  const attached = await h.post(route, payload); assert.equal(attached.status, 200, JSON.stringify(attached));
  assert.equal(attached.body.state, 'HELD'); assert.equal(attached.body.token, access.token);
  assert.equal(attached.body.fencing, access.fencing); assert.ok(attached.body.operationIds.includes(diagnostic.operation_id));
  const released = await h.post('/runs/' + a.runId + '/locks/release', { ...payload, operationIds: undefined,
    outcome: 'RECONCILED', evidence: ['fin et absence de diagnostic exécuté vérifiées'] });
  assert.equal(released.status, 200, JSON.stringify(released));
  assert.equal((await h.get('/runs')).body.coordination.operations[diagnostic.operation_id].state, 'CANCELLED');
  assert.equal((await h.get('/runs/' + a.runId + '/status')).body.hasUnresolvedOperation, false);
  assert.equal(h.native.replies.length, 1);
});

test('attach sérialise la libération concurrente pendant la lecture native', async (t) => {
  const h = await setup(t); const a = await h.reserve('attach-race');
  const { approval, access } = await h.approvedAccess(a, 'race-parent'); await h.execute(approval);
  const diagnostic = h.approval(a, 'race-diagnostic'); diagnostic.access_id = access.accessId;
  h.native.messages[a.sessionId].at(-1).parts[0].state.input.access_id = access.accessId;
  assert.equal((await h.post('/validation/request', { approval: diagnostic })).status, 202);
  assert.equal((await h.post('/runs/' + a.runId + '/decision/' + diagnostic.requestId, { decision: 'approved' })).status, 201);
  let resume, entered; const paused = new Promise((resolve) => { resume = resolve; });
  const waiting = new Promise((resolve) => { entered = resolve; }); let first = true;
  h.native.onRequest = async (path) => { if (path === '/session/' + a.sessionId + '/message' && first) {
    first = false; entered(); await paused;
  } };
  const attach = h.post('/runs/' + a.runId + '/locks/attach', { version: a.version, operationId: access.accessId,
    token: access.token, fencing: access.fencing, operationIds: [diagnostic.operation_id], evidence: ['approuvé'] });
  await waiting; await h.completeTool(approval, 1);
  const released = await h.post('/runs/' + a.runId + '/locks/release', { version: a.version, operationId: access.accessId,
    token: access.token, fencing: access.fencing, outcome: 'RECONCILED', evidence: ['fin vérifiée'] });
  assert.equal(released.body.error, 'run-transition-in-flight'); resume();
  assert.equal((await attach).status, 200);
  assert.equal(h.native.replies.length, 1);
});

test('reprise historique sans checkpoint : une décision perdue ne sert qu’au rattachement pour annulation', async (t) => {
  const h = await setup(t); const a = await h.reserve('attach-restart');
  const { approval, access } = await h.approvedAccess(a, 'restart-parent'); await h.execute(approval);
  const diagnostic = h.approval(a, 'restart-diagnostic'); diagnostic.access_id = access.accessId;
  h.native.messages[a.sessionId].at(-1).parts[0].state.input.access_id = access.accessId;
  assert.equal((await h.post('/validation/request', { approval: diagnostic })).status, 202);
  assert.equal((await h.post('/runs/' + a.runId + '/decision/' + diagnostic.requestId, { decision: 'approved' })).status, 201);
  const request = h.native.messages[a.sessionId].at(-1).parts[0];
  request.executed = false;
  request.state.status = 'completed'; request.state.time = { start: Date.now(), end: Date.now() + 1 };
  request.state.output = JSON.stringify({ ...diagnostic, status: 'APPROVED', reviewer: 'CGPT',
    decision_applied_at: new Date().toISOString() });
  await h.stop();
  unlinkSync(join(runtimeStateDirectory(h.directory), 'runs', a.runId, String(a.contextId), 'controller-communication.json'));
  await h.start();
  const decision = await h.get('/runs/' + a.runId + '/decision/' + diagnostic.requestId);
  assert.equal(decision.body, null, JSON.stringify(decision));
  const payload = { version: a.version,
    operationId: access.accessId, token: access.token, fencing: access.fencing,
    operationIds: [diagnostic.operation_id], evidence: ['diagnostic approuvé avant redémarrage'] };
  const route = '/runs/' + a.runId + '/locks/attach';
  assert.equal((await h.post(route, payload)).body.error, 'access-operation-not-approved');
  const original = request.state.output;
  for (const alteration of [
    (out) => { out.status = 'REJECTED'; },
    (out) => { out.operation_digest = '0'.repeat(64); },
    (out) => { out.access_id = 'wrong-access'; },
    (out) => { out.resources = []; },
    (out) => { delete out.decision_applied_at; },
  ]) {
    const out = JSON.parse(original); alteration(out); request.state.output = JSON.stringify(out);
    assert.equal((await h.post(route, { ...payload, restoreApprovedForCancellation: true })).body.error, 'restored-approval-not-proved');
  }
  request.state.output = original;
  h.native.messages[a.sessionId].push({ parts: [structuredClone(request)] });
  assert.equal((await h.post(route, { ...payload, restoreApprovedForCancellation: true })).body.error, 'restored-approval-not-proved');
  h.native.messages[a.sessionId].pop();
  assert.equal((await h.post(route, { ...payload, token: 'stale', restoreApprovedForCancellation: true })).body.error, 'access-token-invalid');
  h.native.permissions.push({ id: 'other', sessionID: a.sessionId, permission: 'bash', metadata: { command: 'synthetic' } });
  assert.equal((await h.post(route, { ...payload, restoreApprovedForCancellation: true })).body.error, 'native-session-not-quiescent');
  h.native.permissions = [];
  request.state.input.operation_digest = '0'.repeat(64);
  assert.equal((await h.post(route, { ...payload, restoreApprovedForCancellation: true })).body.error, 'restored-approval-not-proved');
  request.state.input.operation_digest = diagnostic.operation_digest;
  let reads = 0; h.native.onRequest = async (path) => {
    if (path === '/session/' + a.sessionId + '/message' && ++reads === 2) request.state.output += ' ';
  };
  assert.equal((await h.post(route, { ...payload, restoreApprovedForCancellation: true })).body.error, 'restored-approval-history-changed');
  h.native.onRequest = null; request.state.output = original;
  assert.equal((await h.get('/runs/' + a.runId + '/locks')).body.accesses[0].state, 'EXECUTING');
  await h.completeTool(approval, 1);
  const attach = await h.post(route, { ...payload, restoreApprovedForCancellation: true });
  assert.equal(attach.status, 200, JSON.stringify(attach));
  assert.equal((await h.get('/runs/' + a.runId + '/decision/' + diagnostic.requestId)).body, null);
  const released = await h.post('/runs/' + a.runId + '/locks/release', { version: a.version,
    operationId: access.accessId, token: access.token, fencing: access.fencing,
    outcome: 'RECONCILED', evidence: ['fin et diagnostic non exécuté vérifiés'] });
  assert.equal(released.status, 200, JSON.stringify(released));
  assert.equal((await h.get('/runs')).body.coordination.operations[diagnostic.operation_id].state, 'CANCELLED');
  assert.equal(h.native.replies.length, 1);
});

test('sélection simultanée : un seul propriétaire du change et aucun écrasement', async (t) => {
  const h = await setup(t);
  const results = await Promise.all(['a', 'b'].map((id) => h.post('/runs/reserve',
    { ...h.candidate(id), changeId: 'same-change', selectionKey: 'same-requirement' })));
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal((await h.get('/runs')).body.runs.length, 1);
});

test('prévol refuse request_validation ASK imposé par la session avant armement',async t=>{
 const h=await setup(t),candidate=h.candidate('mcp-ask');
 h.native.rules[candidate.sessionId]=[{permission:'*',pattern:'*',action:'ask'},
  {permission:'cgpt-validation_broker_readiness',pattern:'*',action:'allow'},
  {permission:'cgpt-validation_request_validation',pattern:'*',action:'ask'}];
 assert.equal((await h.post('/runs/reserve',candidate)).status,201);
 const arm=await h.post('/runs/mcp-ask/job/arm',{jobId:'job-mcp-ask',sessionId:candidate.sessionId,
  directory:h.directory,changeId:candidate.changeId,strictCommands:true,criteria:['fixture']});
 assert.equal(arm.status,409);assert.equal(arm.body.error,'native-mcp-request-validation-policy-blocked');
 assert.equal(h.native.replies.length,0);
});
test('trois sessions, permissions once exactes et décisions isolées', async (t) => {
  const h = await setup(t);
  const runs = [];
  for (const id of ['a', 'b', 'c']) runs.push(await h.reserve(id));
  const approvals = runs.map((run) => h.approval(run, 'request-' + run.runId));
  for (const a of approvals) assert.equal((await h.post('/validation/request', { approval: a })).status, 202);
  assert.equal((await h.post('/runs/b/decision/request-a', { decision: 'approved' })).status, 409);
  h.native.permissions = runs.map((run) => ({ id: 'permission-' + run.runId, sessionID: run.sessionId,
    permission: 'bash', metadata: { command: '/usr/bin/true' } }));
  for (const a of approvals) assert.equal((await h.post('/runs/' + a.run_id + '/decision/' + a.requestId,
    { decision: 'approved' })).status, 201);
  await waitFor(() => h.native.replies.length === 3);
  assert.deepEqual(h.native.replies.map((p) => p.path).sort(), runs.map((run) =>
    '/session/' + run.sessionId + '/permissions/permission-' + run.runId).sort());
  assert.ok(h.native.replies.every((p) => p.body.response === 'once'));
  const decision = (await h.get('/runs/a/decision/request-a')).body;
  assert.equal(decision.run_id, 'a'); assert.equal(decision.reservation_version, runs[0].version);
  assert.equal((await h.post('/job/progress', { jobId: 'job-a' })).status, 409);
});

test('un RUN arrêté puis abandonné reprend après redémarrage sans permission héritée', async (t) => {
  const h = await setup(t); const a = await h.reserve('resume', {
    resources: [{ key: 'file:src/resume.py', mode: 'read' }] });
  assert.equal((await h.post('/runs/resume/job/terminal-gate', { state: 'BLOQUÉ',
    reason: 'explicit documentary prerequisite' })).status, 201);
  assert.equal((await h.post('/runs/resume/job/disarm', { jobId: 'job-resume' })).status, 202);
  assert.equal((await h.post('/runs/resume/suspend', { version: a.version, action: 'STOP',
    evidence: ['targeted stop after gate'] })).status, 200);
  const released = await h.post('/runs/resume/release', { version: a.version, delivered: false,
    evidence: ['no pending effects; prerequisite requires decision'] });
  assert.equal(released.status, 200); assert.equal(released.body.state, 'ABANDONED');
  await h.stop(); await h.start();
  const next = await h.post('/runs/reserve', { ...h.candidate('resume'),
    resources: a.resources, exclusiveResources: [] });
  assert.equal(next.status, 201, JSON.stringify(next));
  assert.ok(next.body.version > released.body.version); assert.notEqual(next.body.contextId, a.contextId);
  assert.equal(next.body.suspension, undefined);
  assert.equal((await h.post('/runs/resume/job/arm', { jobId: 'job-resume-new', sessionId: a.sessionId,
    directory: h.directory, changeId: a.changeId, strictCommands: true, criteria: ['resumed delivery'] })).status, 201);
  const job = (await h.get('/runs/resume/job')).body;
  assert.equal(job.jobId, 'job-resume-new'); assert.equal(job.terminalGate.status, 'OPEN');
  const snapshot = (await h.get('/runs')).body;
  assert.ok(snapshot.history.some((run) => run.runId === a.runId && run.contextId === a.contextId &&
    run.state === 'ABANDONED' && run.suspension.action === 'STOP'));
  assert.deepEqual(h.native.replies, []);
  assert.equal(Object.keys(snapshot.coordination.operations).length, 0);
});

test('une session allow est refusée sans bloquer la permission once d’un autre RUN', async (t) => {
  const h = await setup(t);
  const a = await h.reserve('a');
  const b = await h.reserve('b');
  h.native.rules.ses_a = [{ permission: 'bash', pattern: '*', action: 'allow' }];
  const refused = await h.post('/validation/request', { approval: h.approval(a, 'unsafe-a') });
  assert.equal(refused.body.error, 'native-permission-ask-required');
  assert.equal((await h.post('/validation/request', { approval: h.approval(b, 'safe-b') })).status, 202);
  h.native.permissions = [{ id: 'safe-b-permission', sessionID: 'ses_b', permission: 'bash',
    metadata: { command: '/usr/bin/true' } }];
  assert.equal((await h.post('/runs/b/decision/safe-b', { decision: 'approved' })).status, 201);
  await waitFor(() => h.native.replies.length === 1);
  assert.equal(h.native.replies[0].path, '/session/ses_b/permissions/safe-b-permission');
  assert.deepEqual(h.native.replies[0].body, { response: 'once' });
  assert.equal((await h.get('/runs/a/job')).body.sessionId, 'ses_a');
});

test('admission ask refusée puis corrigée : aucun propriétaire ou opération orphelin', async (t) => {
  const h = await setup(t); const a = await h.reserve('a');
  const approval = h.approval(a, 'ask-drift');
  let reads = 0;
  h.native.onRequest = async (path) => {
    if (path === '/session/ses_a' && ++reads === 2) {
      h.native.rules.ses_a = [{ permission: 'bash', pattern: '*', action: 'allow' }];
    }
  };
  const before = (await h.get('/runs')).body;
  assert.equal((await h.post('/validation/resource-request', { approval })).body.error, 'native-permission-ask-required');
  const refused = (await h.get('/runs')).body;
  assert.deepEqual(refused.requestOwners, before.requestOwners);
  assert.deepEqual(refused.coordination.operations, before.coordination.operations);
  assert.equal((await h.get('/runs/a/status')).body.undecidedValidationCount, 0);
  h.native.onRequest = null; h.native.rules.ses_a = [{ permission: '*', pattern: '*', action: 'ask' }];
  assert.equal((await h.post('/validation/resource-request', { approval })).status, 202);
  assert.equal((await h.post('/runs/a/decision/ask-drift', { decision: 'rejected' })).status, 201);
  assert.deepEqual(h.native.replies, []);
});

test('adoption maintenance : corps client et transaction inconnue ne produisent pas HELD',async(t)=>{
  const h=await setup(t);await h.reserve('a');const before=(await h.get('/runs')).body;
  assert.equal((await h.post('/coordination/maintenance/adopt',{transactionId:'../../outside',sealDigest:'0'.repeat(64)})).status,409);
  assert.equal((await h.post('/coordination/maintenance/adopt',{transactionId:'maintenance-00000000-0000-0000-0000-000000000000',sealDigest:'0'.repeat(64),path:'/outside'})).status,400);
  assert.deepEqual((await h.get('/runs')).body,before);assert.deepEqual(h.native.replies,[]);
});

async function orphanedPreflight(t, mutate = () => {}) {
  const h = await setup(t); const a = await h.reserve('a'); const b = await h.reserve('b');
  const recovery = { jobId: 'job-a', expectedSessionId: 'ses_a', sessionId: 'ses_a_new',
    recoveryId: 'recovery-orphan', preflightRequestId: 'preflight-orphan' };
  assert.equal((await h.post('/runs/a/job/recover', { ...recovery, phase: 'prepare' })).status, 200);
  const approval = h.approval({ ...a, sessionId: recovery.sessionId }, recovery.preflightRequestId);
  h.native.messages.ses_a_new.at(-1).parts[0].state = { status: 'completed', input: structuredClone(approval),
    output: JSON.stringify({ ...approval, status: 'PENDING', notification_status: 'FAILED' }) };
  await h.stop();
  // Reproduire l'état durable produit par l'ancienne admission, uniquement dans la fixture arrêtée.
  const registry = new ResourceRunRegistry(h.directory, join(runtimeStateDirectory(h.directory)));
  await registry.acquireAuthority();
  try {
    registry.prepareOperation(a.runId, approval, { candidateSession: recovery.sessionId });
    const keys = ['run_id','reservation_version','requestId','approval_id','change_id','session_id','directory',
      'title','summary','files','commands','resources','coordination_protocol','operation_id','operation_digest','expected_revisions','access_id'];
    const identity = Object.fromEntries(keys.map((key) => [key, approval[key] ??
      (['resources','commands'].includes(key) ? [] : key === 'summary' ? '' : null)]));
    registry.claimRequest('a', approval.requestId, createHash('sha256').update(JSON.stringify(identity)).digest('hex'), false);
    mutate(registry, approval); registry.persist();
  } finally {
    const ended = new Promise((resolve) => registry.lock.once('exit', resolve)); registry.close(); await ended;
  }
  await h.start();
  await h.post('/broker/readiness', { status: 'BLOCKED', pending_count: 1 });
  const payload = { transactionId: 'reconcile-orphan', developerAuthorization: 'accord-humain-fixture-source-runtime-distinct',
    jobId: recovery.jobId, recoveryId: recovery.recoveryId, approval };
  return { h, a, b, approval, recovery, payload };
}

async function pausedOrphan(t, timeout = false) {
  const h=await setup(t),a=await h.reserve('a');
  const approval=h.approval(a,'paused-write');approval.commands=['printf operation-non-executee'];
  const part=h.native.messages.ses_a.at(-1).parts[0];
  part.state={status:timeout?'error':'completed',input:structuredClone(approval),
    ...(timeout?{error:'MCP error -32001: request timed out'}:{output:JSON.stringify({...approval,status:'PENDING'})})};
  if(timeout)h.native.messages.ses_a.push({parts:[{type:'tool',tool:'cgpt-validation_get_approval',state:{status:'completed',input:{approval_id:approval.approval_id},output:JSON.stringify({...approval,status:'PENDING'})}}]});
  await h.post('/runs/a/suspend',{version:a.version,action:'PAUSE',evidence:['human maintenance pause']});
  await h.post('/runs/a/job/progress',{jobId:'job-a',currentCabMandate:approval.requestId});
  return {h,a,approval,payload:{transactionId:'paused-repair',developerAuthorization:'human maintenance authorization',jobId:'job-a',recoveryId:null,approval}};
}

for(const timeout of [false,true])test(`demande orpheline en pause : admission absente et rejet seul, timeout=${timeout}`,async(t)=>{
  const {h,approval,payload}=await pausedOrphan(t,timeout);
  if(timeout)h.native.rules.ses_a=[{permission:'*',pattern:'*',action:'deny'}];
  const before=(await h.get('/runs')).body;
  assert.equal(before.requestOwners[approval.requestId],undefined);
  const receipt=await h.post('/runs/a/validation/reconcile',payload);
  assert.equal(receipt.status,201,JSON.stringify(receipt));assert.equal(receipt.body.recoveryId,null);
  assert.deepEqual((await h.post('/runs/a/validation/reconcile',payload)).body,receipt.body);
  for(const decision of ['approved','needs_clarification'])assert.equal((await h.post('/runs/a/decision/'+approval.requestId,{decision})).status,400);
  const after=(await h.get('/runs')).body;
  assert.equal(after.requestOwners[approval.requestId].reconciliation.outcome,'REJECTION_ONLY');
  const restored=new ResourceRunRegistry(h.directory,join(runtimeStateDirectory(h.directory)));
  assert.equal(restored.resourceState.operations[approval.operation_id].rejectionOnly,true);
  assert.equal((await h.post('/runs/a/decision/'+approval.requestId,{decision:'rejected'})).status,201);
  assert.deepEqual(h.native.replies,[]);
});

for(const variant of ['no-pause','busy','permission','allow','effect','poll-identity','timeout-no-poll','duplicate','history-drift','job','mandate','approval-divergent','stale-version','poll-status'])test(`demande orpheline en pause : refuse ${variant} sans admission partielle`,async(t)=>{
  const {h,a,approval,payload}=await pausedOrphan(t,true);
  if(variant==='no-pause')await h.post('/runs/a/suspend',{version:a.version,action:'RESUME',evidence:['isolated test']});
  if(variant==='busy')h.native.busy.ses_a={type:'busy'};
  if(variant==='permission')h.native.permissions=[{id:'permission-a',sessionID:'ses_a',permission:'bash',patterns:['*']}];
  if(variant==='allow')h.native.rules.ses_a=[{permission:'*',pattern:'*',action:'allow'}];
  if(variant==='effect')h.native.messages.ses_a.push({parts:[{type:'tool',tool:'bash',state:{status:'completed',input:{command:'printf danger'},output:''}}]});
  if(variant==='poll-identity')h.native.messages.ses_a.at(-1).parts[0].state.input.approval_id='approval-other';
  if(variant==='timeout-no-poll')h.native.messages.ses_a.pop();
  if(variant==='duplicate')h.native.messages.ses_a.push(structuredClone(h.native.messages.ses_a[0]));
  if(variant==='job')payload.jobId='other-job';
  if(variant==='mandate')await h.post('/runs/a/job/progress',{jobId:'job-a',currentCabMandate:'other-request'});
  if(variant==='approval-divergent')payload.approval={...approval,commands:['other command']};
  if(variant==='stale-version'){
    approval.reservation_version++;
    h.native.messages.ses_a[0].parts[0].state.input=structuredClone(approval);
    h.native.messages.ses_a.at(-1).parts[0].state.output=JSON.stringify({...approval,status:'PENDING'});
  }
  if(variant==='poll-status')h.native.messages.ses_a.at(-1).parts[0].state.output=JSON.stringify({...approval,status:'APPROVED'});
  if(variant==='history-drift'){
    let reads=0;h.native.onRequest=(path)=>{if(path==='/session/ses_a/message'&&++reads===2)h.native.messages.ses_a.push({parts:[{type:'tool',tool:'bash',state:{status:'completed'}}]});};
  }
  const before=(await h.get('/runs')).body;
  const rejected=await h.post('/runs/a/validation/reconcile',payload);
  assert.ok(rejected.status>=400,JSON.stringify(rejected));
  assert.deepEqual((await h.get('/runs')).body,before);assert.deepEqual(h.native.replies,[]);
});

test('prévol orphelin : rejet seul durable, notifications répétées, pair actif puis retry existant', async (t) => {
  const { h, b, approval, recovery, payload } = await orphanedPreflight(t);
  const before = (await h.get('/runs')).body;
  assert.equal((await h.post('/validation/resource-request', { approval })).body.error, 'preflight-request-not-correlated');
  h.native.busy.ses_b = { type: 'busy' };
  const receipt = await h.post('/runs/a/validation/reconcile', payload);
  assert.equal(receipt.status, 201, JSON.stringify(receipt));
  assert.equal(receipt.body.outcome, 'REJECTION_ONLY');
  assert.equal((await h.get('/runs/a/decision/' + approval.requestId)).status, 404);
  assert.deepEqual((await h.post('/runs/a/validation/reconcile', payload)).body, receipt.body);
  assert.equal((await h.post('/runs/a/validation/reconcile', { ...payload, developerAuthorization: 'autre-accord' })).status, 409);
  for (const route of ['/validation/resource-request', '/validation/resource-reminder']) {
    assert.equal((await h.post(route, { approval })).status, 202);
  }
  for (const decision of ['approved', 'needs_clarification']) {
    assert.equal((await h.post('/runs/a/decision/' + approval.requestId, { decision })).status, 400);
  }
  assert.equal((await h.post('/runs/a/locks/acquire', { version: approval.reservation_version,
    operationId: approval.operation_id, operationDigest: approval.operation_digest, resources: approval.resources,
    expectedRevisions: approval.expected_revisions })).status, 409);
  assert.deepEqual(h.native.replies, []);
  const after = (await h.get('/runs')).body;
  assert.deepEqual(after.runs.find((r) => r.runId === 'b'), before.runs.find((r) => r.runId === 'b'));
  assert.deepEqual(after.coordination.accesses, before.coordination.accesses);
  const restored = new ResourceRunRegistry(h.directory, join(runtimeStateDirectory(h.directory)));
  assert.deepEqual(restored.requestOwners[approval.requestId].reconciliation, receipt.body);
  assert.equal(restored.resourceState.operations[approval.operation_id].rejectionOnly, true);
  assert.equal((await h.post('/runs/a/decision/' + approval.requestId, { decision: 'rejected' })).status, 201);
  const decision = (await h.get('/runs/a/decision/' + approval.requestId)).body;
  assert.equal(decision.approval_id, approval.approval_id); assert.equal(decision.decision, 'rejected');
  h.native.messages.ses_a_new.push({ parts: [{ type: 'tool', tool: 'cgpt-validation_poll_approval',
    state: { status: 'completed', input: { approval_id: approval.approval_id },
      output: JSON.stringify({ ...approval, status: 'REJECTED' }) } }] });
  await h.post('/broker/readiness', { status: 'READY', pending_count: 0 });
  const retry = await h.post('/runs/a/job/recover', { ...recovery, phase: 'retry',
    previousPreflightRequestId: approval.requestId, preflightRequestId: 'preflight-orphan-next' });
  assert.equal(retry.status, 200, JSON.stringify(retry));
  assert.equal(retry.body.jobId, recovery.jobId);
  assert.equal(retry.body.recovery.sessionId, recovery.sessionId);
  assert.equal(retry.body.recovery.recoveryId, recovery.recoveryId);
  assert.equal(retry.body.recovery.preflightRequestId, 'preflight-orphan-next');
  assert.deepEqual(h.native.replies, []);
  assert.equal((await h.get('/runs/b/job')).body.sessionId, b.sessionId);
});

test('réconciliation orpheline : autorisation, identités et preuves divergentes sont refusées sans mutation', async (t) => {
  const { h, approval, payload } = await orphanedPreflight(t);
  const before = (await h.get('/runs')).body;
  const bad = [
    { ...payload, developerAuthorization: '' }, { ...payload, jobId: 'job-autre' },
    { ...payload, recoveryId: 'recovery-autre' },
    ...[{ requestId: 'preflight-autre' }, { approval_id: 'autre' }, { session_id: 'ses_other' },
      { reservation_version: approval.reservation_version + 1 }, { operation_digest: '0'.repeat(64) },
      { commands: ['true'] }, { title: 'autre' }, { summary: 'autre' },
      { resources: approval.resources.map((r) => ({ ...r, mode: 'write' })) },
      { expected_revisions: Object.fromEntries(approval.resources.map((r) => [r.key, 1])) }]
      .map((change) => ({ ...payload, approval: { ...approval, ...change } })),
  ];
  for (const candidate of bad) {
    const response = await h.post('/runs/a/validation/reconcile', candidate);
    assert.ok(response.status >= 400, JSON.stringify(candidate));
    assert.deepEqual((await h.get('/runs')).body, before);
  }
  for (const status of ['APPROVED', 'REJECTED', 'CANCELLED']) {
    h.native.messages.ses_a_new.at(-1).parts[0].state.output = JSON.stringify({ ...approval, status });
    assert.equal((await h.post('/runs/a/validation/reconcile', payload)).status, 409);
  }
  assert.deepEqual(h.native.replies, []);
});

test('réconciliation orpheline : effet natif, permission et candidate allow maintiennent le gel', async (t) => {
  const { h, payload } = await orphanedPreflight(t);
  const before = (await h.get('/runs')).body;
  h.native.permissions = [{ id: 'pending', sessionID: 'ses_a_new', permission: 'bash' }];
  assert.equal((await h.post('/runs/a/validation/reconcile', payload)).status, 409);
  h.native.permissions = []; h.native.rules.ses_a_new = [{ permission: 'bash', pattern: '*', action: 'allow' }];
  assert.equal((await h.post('/runs/a/validation/reconcile', payload)).status, 409);
  h.native.rules.ses_a_new = [{ permission: '*', pattern: '*', action: 'ask' }];
  h.native.messages.ses_a_new.push({ parts: [{ type: 'tool', tool: 'bash',
    state: { status: 'completed', input: { command: '/usr/bin/true' }, metadata: { exit: 0 } } }] });
  assert.equal((await h.post('/runs/a/validation/reconcile', payload)).status, 409);
  assert.deepEqual((await h.get('/runs')).body, before);
  assert.deepEqual(h.native.replies, []);
});

test('réconciliation orpheline : opération durable commencée ou incertaine refusée', async (t) => {
  for (const state of ['ISSUING', 'EXECUTING', 'UNKNOWN', 'COMPLETED']) await t.test(state, async (subtest) => {
    const { h, payload } = await orphanedPreflight(subtest, (registry, approval) => {
      registry.resourceState.operations[approval.operation_id].state = state;
    });
    const before = (await h.get('/runs')).body;
    assert.equal((await h.post('/runs/a/validation/reconcile', payload)).status, 409);
    assert.deepEqual((await h.get('/runs')).body, before);
    assert.deepEqual(h.native.replies, []);
  });
});

test('réconciliation orpheline : propriétaire ou opération absent/divergent ne se reconstruit pas', async (t) => {
  for (const kind of ['owner-absent', 'owner-digest', 'operation-absent', 'operation-digest']) await t.test(kind, async (subtest) => {
    const { h, payload } = await orphanedPreflight(subtest, (registry, approval) => {
      if (kind === 'owner-absent') delete registry.requestOwners[approval.requestId];
      if (kind === 'owner-digest') registry.requestOwners[approval.requestId].digest = '0'.repeat(64);
      if (kind === 'operation-absent') delete registry.resourceState.operations[approval.operation_id];
      if (kind === 'operation-digest') registry.resourceState.operations[approval.operation_id].identityDigest = '0'.repeat(64);
    });
    const before = (await h.get('/runs')).body;
    assert.equal((await h.post('/runs/a/validation/reconcile', payload)).status, 409);
    assert.deepEqual((await h.get('/runs')).body, before);
  });
});

test('réconciliation orpheline : reçu durable après restart, rejet seul sans décision inventée', async (t) => {
  const { h, payload, approval } = await orphanedPreflight(t);
  assert.equal((await h.get('/status')).body.notificationReconciliation, 'rejection-only-v1');
  const result = await h.post('/runs/a/validation/reconcile', payload); assert.equal(result.status, 201);
  await h.stop(); await h.start();
  await h.post('/broker/readiness', { status: 'BLOCKED', pending_count: 1 });
  assert.equal((await h.post('/runs/a/validation/reconcile', payload)).status, 200);
  assert.equal((await h.post('/runs/a/decision/' + approval.requestId, { decision: 'approved' })).status, 400);
  assert.equal((await h.get('/runs/a/decision/' + approval.requestId)).status, 404);
  assert.deepEqual((await h.get('/runs')).body.requestOwners[approval.requestId].reconciliation, result.body);
  assert.deepEqual(h.native.replies, []);
});

test('réconciliation orpheline : historique modifié pendant les contrôles reste refusé', async (t) => {
  const { h, payload } = await orphanedPreflight(t);
  const before = (await h.get('/runs')).body;
  let reads = 0;
  h.native.onRequest = async (path) => {
    if (path === '/session/ses_a_new/message' && ++reads === 2) {
      h.native.messages.ses_a_new.push({ parts: [{ type: 'tool', tool: 'bash',
        state: { status: 'completed', input: { command: '/usr/bin/true' }, metadata: { exit: 0 } } }] });
    }
  };
  assert.equal((await h.post('/runs/a/validation/reconcile', payload)).status, 409);
  assert.deepEqual((await h.get('/runs')).body, before);
  assert.deepEqual(h.native.replies, []);
});

test('réconciliation orpheline : un accès déjà attribué interdit la réparation', async (t) => {
  const { h, payload } = await orphanedPreflight(t, (registry, approval) => {
    registry.acquireAccess('a', { version: approval.reservation_version, operationId: approval.operation_id,
      operationDigest: approval.operation_digest, resources: approval.resources,
      operationIds: [approval.operation_id], expectedRevisions: approval.expected_revisions });
  });
  const before = (await h.get('/runs')).body;
  assert.equal((await h.post('/runs/a/validation/reconcile', payload)).status, 409);
  assert.deepEqual((await h.get('/runs')).body, before);
  assert.deepEqual(h.native.replies, []);
});

test('réconciliation orpheline : une candidate détenue par un pair est refusée', async (t) => {
  const { h, payload } = await orphanedPreflight(t, (registry, approval) => {
    registry.reserve({ runId: 'c', ownerId: 'codex-c', sessionId: approval.session_id, directory: registry.directory,
      changeId: 'change-c', selectionKey: 'intent-c', dependsOn: [], resources: [{ key: 'file:src/c.py', mode: 'read' }] });
  });
  const before = (await h.get('/runs')).body;
  assert.equal((await h.post('/runs/a/validation/reconcile', payload)).body.error,
    'notification-reconciliation-session-already-owned');
  assert.deepEqual((await h.get('/runs')).body, before);
  assert.deepEqual(h.native.replies, []);
});

test('un RUN indécis ne bloque pas le gate d’un autre et sa libération reste contrôlée', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); const b = await h.reserve('b', {
    resources: [{ key: 'file:src/b.py', mode: 'read' }] });
  assert.equal((await h.post('/validation/request', { approval: h.approval(a, 'request-a') })).status, 202);
  await h.post('/broker/readiness', { status: 'BLOCKED', root_cause: 'DECISION_WAIT_WITHOUT_PROGRESS',
    pending_count: 1, by_run: { a: { pending_count: 1, stalled_count: 0 }, b: { pending_count: 0, stalled_count: 0 } } });
  assert.equal((await h.post('/runs/a/job/terminal-gate', { state: 'TERMINÉ' })).status, 409);
  assert.equal((await h.post('/runs/b/job/terminal-gate', { state: 'TERMINÉ' })).status, 201);
  assert.equal((await h.post('/runs/b/release', { version: b.version, delivered: true, evidence: ['delivery', 'archive-report'] })).status, 409);
  assert.equal((await h.post('/runs/b/job/disarm', { jobId: 'job-b' })).status, 202);
  assert.equal((await h.post('/runs/b/release', { version: b.version, delivered: true, evidence: ['delivery', 'archive-report'] })).status, 200);
  assert.equal((await h.get('/runs')).body.runs.find((r) => r.runId === 'a').state, 'RESERVED');
  const next = await h.post('/runs/reserve', { ...h.candidate('b'), changeId: 'change-next',
    selectionKey: 'requirement-next', sessionId: 'ses_next' });
  assert.equal(next.status, 201);
  assert.ok(next.body.version > b.version);
  assert.equal((await h.post('/runs/b/job/arm', { jobId: 'job-next', sessionId: 'ses_next', directory: h.directory,
    changeId: 'change-next', strictCommands: true, criteria: ['delivery'] })).status, 201);
  assert.equal((await h.get('/runs/b/job')).body.sessionId, 'ses_next');
});

test('une identité déclarée ne remplace pas le tool part natif de la session ciblée', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); const b = await h.reserve('b');
  const claimed = { ...h.approval(a, 'forged-request'), run_id: b.runId, change_id: b.changeId,
    session_id: b.sessionId, reservation_version: b.version, resources: b.resources };
  const response = await h.post('/validation/request', { approval: claimed });
  assert.equal(response.status, 503);
  assert.equal(response.body.error, 'native-validation-evidence-unavailable');
  assert.equal(h.native.replies.length, 0);
});

function codeModeValidationFailure(id,input,searchInput) {
 const calls=[];let code='';
 if(searchInput){calls.push({tool:'search',status:'completed',input:structuredClone(searchInput)});
  code='const catalog=search('+JSON.stringify(searchInput)+'); ';}
 code+='return await tools["cgpt-validation"].request_validation('+JSON.stringify(input)+');';
 calls.push({tool:'cgpt-validation.request_validation',status:'error',input:structuredClone(input)});
 return {type:'tool',id:'execute-'+id,name:'execute',tool:'execute',executed:false,time:{created:Date.now()},state:{status:'completed',
  input:{code},
  output:'MCP notification failed after the durable request',time:{start:Date.now(),end:Date.now()+1},
  metadata:{error:true,truncated:false,toolCalls:calls}}};
}

function rawCodeModeValidationFailure(id,input,calls) {
 return {type:'tool',id:'execute-'+id,name:'execute',tool:'execute',executed:false,time:{created:Date.now()},state:{status:'completed',
  input:{code:'const payload=runtimeInput; return await tools["cgpt-validation"].request_validation(payload);'},
  output:'MCP notification failed after the durable request',time:{start:Date.now(),end:Date.now()+1},
  metadata:{error:true,truncated:false,toolCalls:structuredClone(calls)}}};
}

function rawCodeModeValidationCompleted(id,calls) {
 return {type:'tool',id:'execute-'+id,name:'execute',tool:'execute',executed:false,time:{created:Date.now()},state:{status:'completed',
  input:{code:'const payload=runtimeInput; return await tools["cgpt-validation"].request_validation(payload);'},
  output:'NOT_ADMITTED/native-validation-not-correlated',time:{start:Date.now(),end:Date.now()+1},
  metadata:{truncated:false,toolCalls:structuredClone(calls)}}};
}

function rawCodeModeValidationRunning(id,input,calls,overrides={}) {
 return {type:'tool',id:'execute-'+id,name:'execute',tool:'execute',executed:overrides.executed??false,time:{created:Date.now()},state:{status:'running',
  input:{code:'const payload=runtimeInput; return await tools["cgpt-validation"].request_validation(payload);'},
  metadata:{truncated:overrides.truncated??false,toolCalls:structuredClone(calls)}}};
}


test('request_validation Code Mode en erreur native garde la corrélation exacte sans créer de permission',async t=>{
 const h=await setup(t);const run=await h.reserve('codemode-error');const approval=h.approval(run,'codemode-error');
 approval.commands=[];approval.files=['src/codemode-error.py'];
 const message=h.native.messages[run.sessionId].at(-1);
 message.parts=[codeModeValidationFailure(approval.requestId,approval,{query:'request_validation',namespace:'cgpt-validation'})];
 const response=await h.post('/validation/request',{approval});
 assert.equal(response.status,202,JSON.stringify(response));
 assert.equal((await h.get('/runs/'+run.runId+'/status')).body.undecidedValidationCount,1);
 assert.equal(h.native.replies.length,0);
});

test('request_validation Code Mode en erreur refuse une identité d’input divergente',async t=>{
 const h=await setup(t);const run=await h.reserve('codemode-divergent');const approval=h.approval(run,'codemode-divergent');
 const wrong={...approval,files:['src/foreign.py']};
 h.native.messages[run.sessionId].at(-1).parts=[codeModeValidationFailure(approval.requestId,wrong,
  {query:'request_validation',namespace:'cgpt-validation'})];
 const response=await h.post('/validation/request',{approval});
 assert.equal(response.status,409);assert.equal(response.body.error,'native-validation-not-correlated');
 assert.equal((await h.get('/runs/'+run.runId+'/status')).body.undecidedValidationCount,0);
 assert.equal(h.native.replies.length,0);
});

test('request_validation Code Mode brut est corrélé seulement par le transcript natif exact',async t=>{
 const h=await setup(t);const run=await h.reserve('codemode-raw-error');const approval=h.approval(run,'codemode-raw-error');
 approval.commands=[];approval.files=['src/codemode-raw-error.py'];
 h.native.messages[run.sessionId].at(-1).parts=[rawCodeModeValidationFailure(approval.requestId,approval,[
  {tool:'search',status:'completed',input:{query:'request_validation',namespace:'cgpt-validation'}},
  {tool:'cgpt-validation.request_validation',status:'error',input:approval}
 ])];
 const response=await h.post('/validation/request',{approval});
 assert.equal(response.status,202,JSON.stringify(response));
 assert.equal((await h.get('/runs/'+run.runId+'/status')).body.undecidedValidationCount,1);
 assert.equal(h.native.replies.length,0);
});

test('request_validation Code Mode brut refuse les appels supplémentaires et les entrées divergentes',async t=>{
 for (const variant of ['extra-tool','divergent-input','truncated']) {
  const h=await setup(t);const run=await h.reserve('codemode-raw-'+variant);const approval=h.approval(run,'codemode-raw-'+variant);
  let calls=[{tool:'cgpt-validation.request_validation',status:'error',input:approval}];
  let metadata={error:true,truncated:false,toolCalls:calls};
  if(variant==='extra-tool')calls=[{tool:'bash',status:'completed',input:{command:'true'}},...calls];
  if(variant==='divergent-input')calls=[{...calls[0],input:{...approval,files:['src/foreign.py']}}];
  metadata={...metadata,toolCalls:calls};
  if(variant==='truncated')metadata={...metadata,truncated:true};
  h.native.messages[run.sessionId].at(-1).parts=[rawCodeModeValidationFailure(approval.requestId,approval,calls)];
  h.native.messages[run.sessionId].at(-1).parts[0].state.metadata=metadata;
  const response=await h.post('/validation/request',{approval});
  assert.equal(response.status,409,variant+': '+JSON.stringify(response));
  assert.equal(response.body.error,'native-validation-not-correlated');
  assert.equal(h.native.replies.length,0);
 }
});

test('request_validation Code Mode brut terminé est corrélé par l’input exact sans permission',async t=>{
 const h=await setup(t);const run=await h.reserve('codemode-raw-completed');const approval=h.approval(run,'codemode-raw-completed');
 approval.commands=[];approval.files=['src/codemode-raw-completed.py'];
 h.native.messages[run.sessionId].at(-1).parts=[rawCodeModeValidationCompleted(approval.requestId,[
  {tool:'search',status:'completed',input:{query:'request_validation',namespace:'cgpt-validation'}},
  {tool:'cgpt-validation.request_validation',status:'completed',input:approval}
 ])];
 const response=await h.post('/validation/request',{approval});
 assert.equal(response.status,202,JSON.stringify(response));
 assert.equal((await h.get('/runs/'+run.runId+'/status')).body.undecidedValidationCount,1);
 assert.equal(h.native.replies.length,0);
});

test('request_validation Code Mode lie le requestId natif et compare les cartes sans ordre de clés',async t=>{
 const h=await setup(t);const run=await h.reserve('codemode-bound-request-id',{resources:[
  {key:'file:src/protected.md',mode:'write'},{key:'file:src/bound-a.md',mode:'write'},
  {key:'file:src/bound-b.md',mode:'read'}]});
 const held=h.approval(run,'held-before-bound-request-id');held.files=['src/protected.md'];held.commands=[];
 held.resources=[{key:'file:src/protected.md',mode:'write'}];held.expected_revisions={'file:src/protected.md':0};
 await h.stop();
 const registry=new ResourceRunRegistry(h.directory,join(runtimeStateDirectory(h.directory)));
 await registry.acquireAuthority();
 try{
  const prepared=registry.prepareOperation(run.runId,held);
  registry.recordDecision(run.runId,prepared.operationId,{status:'approved',requestId:held.requestId,
   approvalId:held.approval_id,changeId:run.changeId,operationId:held.operation_id,
   operationDigest:held.operation_digest,identityDigest:prepared.identityDigest,runId:run.runId,
   version:run.version,sessionId:run.sessionId});
  const access=registry.acquireAccess(run.runId,{version:run.version,operationId:held.operation_id,
   operationDigest:held.operation_digest,resources:held.resources,expectedRevisions:held.expected_revisions,
   operationIds:[held.operation_id]});
  const native={sessionId:run.sessionId,directory:h.directory,runId:run.runId,operationId:held.operation_id,
   reservationVersion:run.version,resources:held.resources,expectedRevisions:held.expected_revisions,
   operationDigest:held.operation_digest,coordinationProtocol:'resource-scoped-v1',accessId:held.operation_id,
   kind:'edit',target:held.files[0]};
  registry.nativeStart(run.runId,native,held.requestId,{id:'permission-held-bound',tool:{callID:'call-held-bound'}});
  registry.nativeIssued(held.operation_id);
  registry.completeNative(run.runId,held.operation_id,{sessionId:run.sessionId,permissionId:'permission-held-bound',
   callId:'call-held-bound',finishedAt:Date.now()+1,status:'completed'});
  const completed=registry.resourceState.operations[held.operation_id];
  registry.recordNativeOutcome(run.runId,held.operation_id,{status:'completed',proofStatus:'completed',exit:null,
   partDigest:createHash('sha256').update('synthetic-bound-native-part').digest('hex')},completed.completionDigest);
  assert.equal(access.state,'HELD');
 }finally{const ended=new Promise(resolve=>registry.lock.once('exit',resolve));registry.close();await ended;}
 h.native.messages[run.sessionId]=[];
 await h.start();await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});
 const before=(await h.get('/runs/'+run.runId+'/status')).body;
 assert.equal(before.coordination.reason,'access-reconciliation-required');
 assert.equal(before.coordination.accesses.find(a=>a.accessId===held.operation_id).state,'HELD');
 const approval=h.approval(run,'codemode-bound-request-id');approval.commands=[];approval.files=['src/bound-a.md'];
 approval.resources=[{key:'file:src/bound-a.md',mode:'write'},{key:'file:src/bound-b.md',mode:'read'}];
 approval.expected_revisions={'file:src/bound-a.md':0,'file:src/bound-b.md':0};
 const nativeInput=structuredClone(approval);nativeInput.expected_revisions={'file:src/bound-b.md':0,'file:src/bound-a.md':0};
 const codeInput=structuredClone(nativeInput);codeInput.requestId='__request_id_binding__';
 const serialized=JSON.stringify(codeInput).replace('"requestId":"__request_id_binding__"','"requestId":requestId');
 h.native.messages[run.sessionId].at(-1).parts=[{type:'tool',tool:'execute',id:'execute-bound-request-id',callID:'execute-bound-request-id',
  executed:false,state:{status:'completed',input:{code:'return await tools["cgpt-validation"].request_validation('+serialized+');'},
   output:'request_validation terminé',metadata:{truncated:false,toolCalls:[{tool:'cgpt-validation.request_validation',
    status:'completed',input:nativeInput}]}}}];
 const response=await h.post('/validation/request',{approval});
 assert.equal(response.status,202,JSON.stringify(response));
 assert.equal((await h.get('/runs/'+run.runId+'/decision/'+approval.requestId+'/admission')).body.validation_registered,true);
 const after=(await h.get('/runs/'+run.runId+'/status')).body;
 assert.equal(after.coordination.accesses.find(a=>a.accessId===held.operation_id).state,'HELD');
 assert.equal(h.native.permissions.length,0);assert.equal(h.native.replies.length,0);
});

test('request_validation Code Mode lie le requestId mais refuse une identité native divergente',async t=>{
 const h=await setup(t);const run=await h.reserve('codemode-bound-request-id-divergent');const approval=h.approval(run,'codemode-bound-request-id-divergent');
 const nativeInput={...approval,requestId:'different-native-request'};
 h.native.messages[run.sessionId].at(-1).parts=[{type:'tool',tool:'execute',id:'execute-bound-request-id-divergent',callID:'execute-bound-request-id-divergent',
  executed:false,state:{status:'completed',input:{code:'return await tools["cgpt-validation"].request_validation({requestId: requestId});'},
   output:'request_validation terminé',metadata:{truncated:false,toolCalls:[{tool:'cgpt-validation.request_validation',
    status:'completed',input:nativeInput}]}}}];
 const response=await h.post('/validation/request',{approval});
 assert.equal(response.status,503);assert.equal(response.body.error,'native-validation-evidence-unavailable');
 const admission=await h.get('/runs/'+run.runId+'/decision/'+approval.requestId+'/admission');
 assert.equal(admission.status,404);assert.equal(h.native.permissions.length,0);assert.equal(h.native.replies.length,0);
});

test('request_validation Code Mode brut terminé refuse les métadonnées non exactes',async t=>{
 for(const variant of ['extra-tool','divergent-input','truncated','call-status']){
  const h=await setup(t);const run=await h.reserve('codemode-raw-done-'+variant);const approval=h.approval(run,'codemode-raw-done-'+variant);
  let calls=[{tool:'cgpt-validation.request_validation',status:'completed',input:approval}];
  if(variant==='extra-tool')calls=[{tool:'bash',status:'completed',input:{command:'true'}},...calls];
  if(variant==='divergent-input')calls=[{...calls[0],input:{...approval,files:['src/foreign.py']}}];
  if(variant==='truncated'){
   h.native.messages[run.sessionId].at(-1).parts=[rawCodeModeValidationCompleted(approval.requestId,calls)];
   h.native.messages[run.sessionId].at(-1).parts[0].state.metadata.truncated=true;
  }else if(variant==='call-status'){
   calls=[{...calls[0],status:'unknown-phase'}];
   h.native.messages[run.sessionId].at(-1).parts=[rawCodeModeValidationCompleted(approval.requestId,calls)];
  }else h.native.messages[run.sessionId].at(-1).parts=[rawCodeModeValidationCompleted(approval.requestId,calls)];
  const response=await h.post('/validation/request',{approval});
  assert.equal(response.status,409,variant+': '+JSON.stringify(response));
  assert.equal(response.body.error,'native-validation-not-correlated');
  assert.equal(h.native.replies.length,0);
 }
});

test('request_validation Code Mode en cours est admis sur ressource disjointe avec un accès restauré HELD',async t=>{
 const h=await setup(t);const run=await h.reserve('active-codemode-disjoint',{resources:[
  {key:'file:src/protected.md',mode:'write'},{key:'file:src/disjoint.md',mode:'write'}]});
 const held=h.approval(run,'held-before-restart');held.files=['src/protected.md'];held.commands=[];
 held.resources=[{key:'file:src/protected.md',mode:'write'}];held.expected_revisions={'file:src/protected.md':0};
 await h.stop();
 const registry=new ResourceRunRegistry(h.directory,join(runtimeStateDirectory(h.directory)));
 await registry.acquireAuthority();
 try{
  const prepared=registry.prepareOperation(run.runId,held);
  registry.recordDecision(run.runId,prepared.operationId,{status:'approved',requestId:held.requestId,
   approvalId:held.approval_id,changeId:run.changeId,operationId:held.operation_id,
   operationDigest:held.operation_digest,identityDigest:prepared.identityDigest,runId:run.runId,
   version:run.version,sessionId:run.sessionId});
  const access=registry.acquireAccess(run.runId,{version:run.version,operationId:held.operation_id,
   operationDigest:held.operation_digest,resources:held.resources,expectedRevisions:held.expected_revisions,
   operationIds:[held.operation_id]});
  const native={sessionId:run.sessionId,directory:h.directory,runId:run.runId,operationId:held.operation_id,
   reservationVersion:run.version,resources:held.resources,expectedRevisions:held.expected_revisions,
   operationDigest:held.operation_digest,coordinationProtocol:'resource-scoped-v1',accessId:held.operation_id,
   kind:'edit',target:held.files[0]};
  registry.nativeStart(run.runId,native,held.requestId,{id:'permission-held-old',tool:{callID:'call-held-old'}});
  registry.nativeIssued(held.operation_id);
  registry.completeNative(run.runId,held.operation_id,{sessionId:run.sessionId,permissionId:'permission-held-old',
   callId:'call-held-old',finishedAt:Date.now()+1,status:'completed'});
  const completed=registry.resourceState.operations[held.operation_id];
  registry.recordNativeOutcome(run.runId,held.operation_id,{status:'completed',proofStatus:'completed',exit:null,
   partDigest:createHash('sha256').update('synthetic-native-part').digest('hex')},completed.completionDigest);
  assert.equal(access.state,'HELD');
 }finally{const ended=new Promise(resolve=>registry.lock.once('exit',resolve));registry.close();await ended;}
 h.native.messages[run.sessionId]=[];
 await h.start();await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});
 const before=(await h.get('/runs/'+run.runId+'/status')).body;
 assert.equal(before.coordination.reason,'access-reconciliation-required');
 assert.equal(before.coordination.accesses.find(a=>a.accessId===held.operation_id).state,'HELD');

 const approval=h.approval(run,'active-disjoint-request');approval.files=['src/disjoint.md'];approval.commands=[];
 approval.resources=[{key:'file:src/disjoint.md',mode:'write'}];approval.expected_revisions={'file:src/disjoint.md':0};
 h.native.messages[run.sessionId].at(-1).parts=[rawCodeModeValidationRunning(approval.requestId,approval,[
  {tool:'cgpt-validation.request_validation',status:'running',input:structuredClone(approval)},
 ])];
 const accepted=await h.post('/validation/request',{approval});
 assert.equal(accepted.status,202,JSON.stringify(accepted));assert.equal(accepted.body.status,'PENDING');
 const admission=await h.get('/runs/'+run.runId+'/decision/'+approval.requestId+'/admission');
 assert.equal(admission.status,200);assert.equal(admission.body.owner_registered,true);
 assert.equal(admission.body.validation_registered,true);assert.equal(admission.body.decision_recorded,false);
 const registered=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];
 assert.equal(registered.state,'PREPARED');assert.equal(registered.access,null);
 const protectedState=(await h.get('/runs/'+run.runId+'/operations?operationId='+held.operation_id)).body.operations[0];
 assert.equal(protectedState.state,'COMPLETED');assert.equal(protectedState.access.state,'HELD');
 assert.equal(h.native.permissions.length,0);assert.equal(h.native.replies.length,0);
});

test('request_validation Code Mode en cours refuse les métadonnées actives divergentes',async t=>{
 for(const variant of ['divergent-input','extra-tool','truncated','executed','call-status-unknown'])await t.test(variant,async t=>{
  const h=await setup(t);const run=await h.reserve('active-codemode-'+variant);
  const approval=h.approval(run,'active-codemode-'+variant);
  let input=structuredClone(approval),calls=[{tool:'cgpt-validation.request_validation',status:'running',input}];
  const overrides={};
  if(variant==='divergent-input')calls[0].input.files=['src/other.py'];
  if(variant==='extra-tool')calls=[{tool:'bash',status:'completed',input:{command:'true'}},...calls];
  if(variant==='truncated')overrides.truncated=true;
  if(variant==='executed')overrides.executed=true;
  if(variant==='call-status-unknown')calls[0].status='unknown';
  h.native.messages[run.sessionId].at(-1).parts=[rawCodeModeValidationRunning(approval.requestId,input,calls,overrides)];
  const response=await h.post('/validation/request',{approval});
  assert.equal(response.status,409,JSON.stringify(response));assert.equal(response.body.error,'native-validation-not-correlated');
  const admission=await h.get('/runs/'+run.runId+'/decision/'+approval.requestId+'/admission');
  assert.equal(admission.status,404);assert.equal(admission.body.owner_registered,false);
  assert.equal(h.native.permissions.length,0);assert.equal(h.native.replies.length,0);
 });
});

test('une publication indépendante ne suspend pas le pair ni sa génération', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); const b = await h.reserve('b');
  assert.equal((await h.post('/runs/a/integration', { version: a.version, acquire: true })).body.error, 'coordination-upgrade-required');
  const { approval, access } = await h.approvedAccess(a, 'publish-independent');
  await h.execute(approval); await h.completeTool(approval);
  assert.equal((await h.post('/runs/a/publish', { version: a.version, transactionId: 'independent', operationId: access.accessId,
    token: access.token, fencing: access.fencing, outcome: 'COMPLETED', proofRevisions: approval.expected_revisions,
    evidence: ['validated'] })).status, 200);
  assert.equal((await h.get('/runs/b/status')).body.coordination.reason, null);
  assert.equal((await h.post('/validation/request', { approval: h.approval(b, 'still-current') })).status, 202);
});

test('récupération de A avec B actif : réservation conservée et génération renouvelée', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); await h.reserve('b');
  const step = await h.post('/runs/a/job/progress', { jobId: 'job-a', stepId: 'ANALYSIS', expectedStepSequence: 0 });
  assert.equal(step.status, 202);
  h.native.permissions = [{ id: 'permission-b', sessionID: 'ses_b', permission: 'bash', metadata: { command: 'unrelated' } }];
  let stamp;
  const recovery = { jobId: 'job-a', expectedSessionId: 'ses_a', sessionId: 'ses_a_new', recoveryId: 'recovery-a', preflightRequestId: 'preflight-a' };
  assert.equal((await h.post('/runs/a/job/recover', { ...recovery, phase: 'prepare' })).status, 200);
  const runStateDirectory = join(runtimeStateDirectory(h.directory), 'runs', 'a');
  const runContext = readdirSync(runStateDirectory)[0];
  const jobStatePath = join(runStateDirectory, runContext, 'controller-job.json');
  const persistedJob = JSON.parse(readFileSync(jobStatePath, 'utf8'));
  delete persistedJob.recovery.preparationHistory.requestValidationSignatureHash;
  writeFileSync(jobStatePath, JSON.stringify(persistedJob));
  await h.stop(); await h.start();
  await h.post('/broker/readiness', { status: 'READY', pending_count: 0, by_run: { a: { pending_count: 0 }, b: { pending_count: 0 } } });
  const approval = h.approval({ ...a, sessionId: 'ses_a_new' }, 'preflight-a');
  const requested = await h.post('/validation/request', { approval });
  assert.equal(requested.status, 202, JSON.stringify(requested));
  assert.equal((await h.post('/runs/a/decision/preflight-a', { decision: 'approved' })).status, 201);
  h.native.permissions.push({ id: 'permission-a', sessionID: 'ses_a_new', permission: 'bash', metadata: { command: '/usr/bin/true' } });
  await waitFor(() => h.native.replies.length === 1);
  stamp = Date.now() + 1;
  const signatureHistory = h.native.messages.ses_a_new.slice(0, 1);
  const discoveryInput = { namespace: 'cgpt-validation', query: 'request_validation', limit: 20 };
  const discoveryCallId = 'call-legacy-discovery';
  const legacyDiscovery = { type: 'tool', tool: 'execute', callID: discoveryCallId, executed: false,
    state: { status: 'completed', input: { code: 'return await search(' + JSON.stringify(discoveryInput) + ');' },
      output: JSON.stringify({ items: [{ path: 'tools/request_validation' }] }), time: { start: stamp + 1, end: stamp + 2 },
      metadata: { truncated: false, toolCalls: [{ tool: 'search', status: 'completed', input: discoveryInput }] } } };
  h.native.messages.ses_a_new = [...signatureHistory, { parts: [legacyDiscovery,
    { type: 'tool', tool: 'cgpt-validation_request_validation', state: { status: 'completed', input: approval,
      output: JSON.stringify({ ...approval, status: 'APPROVED' }), time: { start: stamp + 3, end: stamp + 4 } } },
    { type: 'tool', tool: 'bash', state: { status: 'completed', input: { command: '/usr/bin/true' },
      metadata: { exit: 0 }, time: { start: stamp + 5, end: stamp + 6 } } },
    { type: 'tool', tool: 'cgpt-validation_broker_readiness', state: { status: 'completed',
      output: JSON.stringify({ status: 'READY', pending_count: 0 }), time: { start: stamp + 7, end: stamp + 8 } } },
  ] }];
  await h.post('/broker/readiness', { status: 'READY', pending_count: 0, by_run: { a: { pending_count: 0 }, b: { pending_count: 0 } } });
  assert.equal((await h.releaseOperation(a, approval)).status, 200);
  const complete = await h.post('/runs/a/job/recover', { ...recovery, phase: 'complete' });
  assert.equal(complete.status, 200, JSON.stringify(complete));
  assert.deepEqual(complete.body.lifecycle, step.body.lifecycle);
  const run = (await h.get('/runs')).body.runs.find((r) => r.runId === 'a');
  assert.equal(run.sessionId, 'ses_a_new'); assert.ok(run.version > a.version);
  assert.equal(h.native.permissions[0].sessionID, 'ses_b');
  assert.equal((await h.post('/validation/request', { approval: h.approval(a, 'old-owner') })).status, 409);
});

for (const invalidDiscovery of ['duplicate', 'truncated', 'untimed', 'divergent']) {
  test('complete legacy sans effet refuse discovery invalide : ' + invalidDiscovery, async t => {
    const h = await setup(t); const run = await h.reserve('legacy-invalid');
    const recovery = { jobId: 'job-legacy-invalid', expectedSessionId: 'ses_legacy-invalid',
      sessionId: 'ses_legacy-invalid_new', recoveryId: 'recovery-legacy-invalid', preflightRequestId: 'preflight-legacy-invalid' };
    assert.equal((await h.post('/runs/legacy-invalid/job/recover', { ...recovery, phase: 'prepare' })).status, 200);
    const runStateDirectory = join(runtimeStateDirectory(h.directory), 'runs', 'legacy-invalid');
    const jobStatePath = join(runStateDirectory, readdirSync(runStateDirectory)[0], 'controller-job.json');
    const persistedJob = JSON.parse(readFileSync(jobStatePath, 'utf8'));
    delete persistedJob.recovery.preparationHistory.requestValidationSignatureHash;
    writeFileSync(jobStatePath, JSON.stringify(persistedJob));
    await h.stop(); await h.start();
    await h.post('/broker/readiness', { status: 'READY', pending_count: 0, by_run: { 'legacy-invalid': { pending_count: 0 } } });
    const approval = h.approval({ ...run, sessionId: recovery.sessionId }, recovery.preflightRequestId);
    assert.equal((await h.post('/validation/request', { approval })).status, 202);
    assert.equal((await h.post('/runs/legacy-invalid/decision/' + recovery.preflightRequestId, { decision: 'approved' })).status, 201);
    h.native.permissions.push({ id: 'permission-legacy-invalid', sessionID: recovery.sessionId,
      permission: 'bash', metadata: { command: '/usr/bin/true' } });
    await waitFor(() => h.native.replies.length === 1);
    const stamp = Date.now() + 10;
    const discovery = (callID) => ({ type: 'tool', tool: 'execute', callID, executed: false,
      state: { status: 'completed', input: { code: 'return await search(' + JSON.stringify({
        namespace: 'cgpt-validation', query: invalidDiscovery === 'divergent' ? 'broker_health' : 'request_validation', limit: 20 }) + ');' },
        output: JSON.stringify({ items: [{ path: 'tools/request_validation' }] }),
        time: { start: stamp, end: stamp + 1 },
        metadata: { truncated: invalidDiscovery === 'truncated', toolCalls: [{ tool: 'search', status: 'completed',
          input: { namespace: 'cgpt-validation', query: invalidDiscovery === 'divergent' ? 'broker_health' : 'request_validation', limit: 20 } }] } } });
    const extraDiscovery = discovery('call-legacy-invalid-discovery');
    const discoveries = invalidDiscovery === 'duplicate' ? [extraDiscovery, discovery('call-legacy-invalid-discovery-2')] : [extraDiscovery];
    if (invalidDiscovery === 'untimed') delete extraDiscovery.state.time;
    h.native.messages[recovery.sessionId] = [...h.native.messages[recovery.sessionId].slice(0, 1), { parts: [
      ...discoveries,
      { type: 'tool', tool: 'cgpt-validation_request_validation', state: { status: 'completed', input: approval,
        output: JSON.stringify({ ...approval, status: 'APPROVED' }), time: { start: stamp + 2, end: stamp + 3 } } },
      { type: 'tool', tool: 'bash', state: { status: 'completed', input: { command: '/usr/bin/true' },
        metadata: { exit: 0 }, time: { start: stamp + 4, end: stamp + 5 } } },
      { type: 'tool', tool: 'cgpt-validation_broker_readiness', state: { status: 'completed',
        output: JSON.stringify({ status: 'READY', pending_count: 0 }), time: { start: stamp + 6, end: stamp + 7 } } },
    ] }];
    await h.post('/broker/readiness', { status: 'READY', pending_count: 0,
      by_run: { 'legacy-invalid': { pending_count: 0 } } });
    assert.equal((await h.releaseOperation(run, approval)).status, 200);
    const before = (await h.get('/runs/legacy-invalid/job')).body;
    const refused = await h.post('/runs/legacy-invalid/job/recover', { ...recovery, phase: 'complete' });
    assert.equal(refused.status, 409, JSON.stringify(refused));
    assert.equal(refused.body.error, 'preflight-unexpected-tool');
    assert.deepEqual((await h.get('/runs/legacy-invalid/job')).body, before);
    assert.equal((await h.get('/runs')).body.runs.find(value => value.runId === 'legacy-invalid').sessionId, run.sessionId);
    assert.equal(h.native.replies.length, 1);
  });
}

test('périmètre, génération, identité native et redémarrage refusent les permissions obsolètes', async (t) => {
  const h = await setup(t); const a = await h.reserve('a');
  const wrong = { ...h.approval(a, 'wrong'), files: ['src/other.py'], commands: [], resources: [] };
  assert.equal((await h.post('/validation/request', { approval: wrong })).status, 409);
  const extended = await h.post('/runs/a/extend', { version: a.version, resources: [{ key: 'file:tests/a.py', mode: 'write' }] });
  assert.equal(extended.status, 200);
  assert.equal((await h.post('/validation/request', { approval: h.approval(a, 'old-generation') })).status, 409);
  const current = extended.body; const approval = h.approval(current, 'request-current');
  assert.equal((await h.post('/validation/request', { approval })).status, 202);
  await h.stop(); await h.start();
  assert.equal((await h.get('/runs')).body.runs[0].version, current.version);
  const notReady=await h.post('/validation/request', { approval });
  assert.equal(notReady.status,503);assert.equal(notReady.body.error,'broker-coordination-not-ready');
  assert.equal(h.native.replies.length, 0);
});

test('un broker MCP réel transporte trois validations parallèles sans confondre les permissions', { timeout: 15000 }, async (t) => {
  const h = await setup(t);
  const runs = [];
  for (const id of ['a', 'b', 'c']) runs.push(await h.reserve(id));
  const source = fileURLToPath(new URL('../src/cgpt_approval_bridge_server.py', import.meta.url));
  const broker = spawn('python3', [source], { stdio: ['pipe', 'pipe', 'pipe'], env: {
    PATH: process.env.PATH, PYTHONUNBUFFERED: '1', CGPT_CONTROLLER_URL: h.base,
    CGPT_APPROVAL_STORE: join(h.directory, 'broker-approvals.json'),
    CGPT_APPROVAL_JOURNAL: join(h.directory, 'broker-events.ndjson'),
    CGPT_JOURNAL_CHECKPOINT_PATH: join(h.directory, 'broker-checkpoint.json'),
    CGPT_BROKER_INSTANCE_LOCK: join(h.directory, 'broker.instance.lock'),
    CGPT_AUTO_REMEDIATION_CB_STATE_PATH: join(h.directory, 'broker-circuit.json'),
  } });
  h.children.push(broker);
  let brokerError = '';
  broker.stderr.on('data', (data) => { brokerError += data; });
  const waiters = new Map();
  t.after(() => { for (const waiter of waiters.values()) clearTimeout(waiter.timer); });
  readline.createInterface({ input: broker.stdout }).on('line', (line) => {
    const message = JSON.parse(line); const waiter = waiters.get(message.id);
    if (waiter) { waiters.delete(message.id); clearTimeout(waiter.timer); waiter.resolve(message); }
  });
  let nextId = 1;
  const call = (method, params) => new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => { waiters.delete(id); reject(new Error('MCP timeout: ' + brokerError)); }, 10000);
    waiters.set(id, { resolve, timer });
    broker.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
  const initialized = await call('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'synthetic-test', version: '1' } });
  assert.equal(initialized.result.serverInfo.version, '2.4.6');
  broker.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  const approvals = runs.map((r) => h.approval(r, 'mcp-' + r.runId));
  const replies = approvals.map((approval) => call('tools/call', { name: 'request_validation',
    arguments: { ...approval, timeout_seconds: 15, interval_seconds: 1 } }));
  const terminalReplies = Promise.all(replies);
  terminalReplies.catch(() => {});
  await waitFor(async () => Object.values((await h.get('/status')).body.runs).every((r) => r.undecidedValidationCount === 1));
  h.native.permissions = runs.map((r) => ({ id: 'mcp-permission-' + r.runId, sessionID: r.sessionId,
    permission: 'bash', metadata: { command: '/usr/bin/true' } }));
  for (const approval of approvals) assert.equal((await h.post('/runs/' + approval.run_id + '/decision/' + approval.requestId,
    { decision: 'approved' })).status, 201);
  const results = await terminalReplies;
  for (let i = 0; i < results.length; i++) {
    assert.notEqual(results[i].result.isError, true);
    const payload = JSON.parse(results[i].result.content[0].text);
    assert.equal(payload.status, 'APPROVED'); assert.equal(payload.run_id, runs[i].runId);
    assert.equal(payload.requestId, approvals[i].requestId);
  }
  await waitFor(() => h.native.replies.length === 3);
  assert.ok(h.native.replies.every((p) => p.body.response === 'once'));
});

test('statistiques automatiques : broker relayé, décision, once, SSE filtré et reprise', async (t) => {
  const h = await setup(t); const a = await h.reserve('a');
  const approval = h.approval(a, 'measured-request');
  assert.equal((await h.post('/validation/request', { approval })).status, 202);
  h.native.permissions.push({ id: 'measured-permission', sessionID: 'ses_a', permission: 'bash', metadata: { command: '/usr/bin/true' } });
  assert.equal((await h.post('/runs/a/decision/measured-request', { decision: 'approved' })).status, 201);
  await waitFor(() => h.native.replies.length === 1);
  const event = { type: 'message.part.updated', properties: { part: { id: 'measured-part', sessionID: 'ses_a',
    type: 'tool', tool: 'bash', state: { status: 'completed', time: { start: 10, end: 20 },
      input: { command: 'SECRET-COMMAND' }, output: 'SECRET-OUTPUT' } } } };
  h.native.emit(event); h.native.emit(event);
  await waitFor(async () => (await h.get('/runs/a/statistics')).body.contexts[0].tools.bash?.completed === 1);
  const measured = (await h.get('/runs/a/statistics')).body;
  assert.equal(measured.contexts[0].decisions.approved, 1);
  assert.equal(measured.contexts[0].decisions.once, 1);
  assert.equal(measured.contexts[0].latencies.requestToDecision.count, 1);
  assert.ok(!JSON.stringify(measured).includes('SECRET'));
  const markdown = await fetch(h.base + '/runs/a/statistics?format=markdown');
  assert.match(markdown.headers.get('content-type'), /text\/markdown/);
  assert.equal(((await markdown.text()).match(/^## /gm) || []).length, 6);
  await h.stop(); await h.start();
  const restored = (await h.get('/runs/a/statistics?contextId=' + a.contextId)).body;
  assert.equal(restored.contexts[0].tools.bash.completed, 1);
  assert.equal(restored.contexts[0].decisions.once, 1);
  assert.ok(restored.restartUnknownMs > 0);
});

test('closing et rapport ciblés : le pair continue et le gate exige la fin native', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); await h.reserve('b');
  const { approval, access } = await h.approvedAccess(a, 'source'); await h.execute(approval); await h.completeTool(approval);
  const reportFile = 'openspec/changes/archive/2026-10-16-change-a/STATISTIQUES.md';
  const publication = await h.post('/runs/a/publish', { version: a.version, transactionId: 'published-source', operationId: access.accessId,
    token: access.token, fencing: access.fencing, outcome: 'COMPLETED', proofRevisions: approval.expected_revisions,
    reportFile, evidence: ['source and archive validated'] }); assert.equal(publication.status, 200);
  const run = (await h.get('/runs')).body.runs.find((r) => r.runId === 'a');
  const report = h.approval(run, 'report'); report.files = [reportFile]; report.commands = [];
  h.native.messages.ses_a.at(-1).parts[0].state.input = structuredClone(report);
  assert.equal((await h.post('/validation/request', { approval: report })).status, 202);
  assert.equal((await h.post('/runs/a/decision/report', { decision: 'approved' })).status, 201);
  await h.execute(report);
  assert.equal((await h.post('/runs/a/job/terminal-gate', { state: 'TERMINÉ' })).body.error, 'run-accesses-unresolved');
  await h.completeTool(report); assert.equal((await h.releaseOperation(run, report)).status, 200);
  assert.equal((await h.get('/runs/b/status')).body.coordination.reason, null);
  assert.equal((await h.post('/runs/a/job/terminal-gate', { state: 'TERMINÉ' })).status, 201);
  assert.equal((await h.post('/runs/a/job/disarm', { jobId: 'job-a' })).status, 202);
  assert.equal((await h.post('/runs/a/release', { version: run.version, delivered: true, evidence: ['report verified'] })).status, 200);
});

test('une réduction quiescente retire project:* sans accepter une génération ancienne', async (t) => {
  const h = await setup(t);
  const a = await h.reserve('a', { resources: [{ key: 'project:*', mode: 'read' }] });
  const reduced = await h.post('/runs/a/resources', { version: a.version,
    resources: [{ key: 'file:src/a.py', mode: 'read' }], evidence: ['global read completed'] });
  assert.equal(reduced.status, 200);
  await h.reserve('b');
  assert.equal((await h.post('/validation/request', { approval: h.approval(a, 'stale-resource') })).status, 409);
  const current = h.approval(reduced.body, 'pending-current');
  assert.equal((await h.post('/validation/request', { approval: current })).status, 202);
  assert.equal((await h.post('/runs/a/resources', { version: reduced.body.version,
    resources: reduced.body.resources, evidence: ['must wait for pending validation'] })).body.error, 'run-not-quiescent');
});


test('rejet réconcilié permet seulement la levée globale liée et quiescente', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); await h.reserve('b');
  const recovery = { jobId: 'job-a', expectedSessionId: 'ses_a', sessionId: 'ses_a_new',
    recoveryId: 'recovery-rejected', preflightRequestId: 'preflight-rejected' };
  assert.equal((await h.post('/runs/a/job/recover', { ...recovery, phase: 'prepare' })).status, 200);
  const approval = h.approval({ ...a, sessionId: 'ses_a_new' }, recovery.preflightRequestId);
  assert.equal((await h.post('/validation/request', { approval })).status, 202);
  assert.equal((await h.post('/runs/a/decision/' + approval.requestId, { decision: 'rejected' })).status, 201);
  h.native.messages.ses_a_new.at(-1).parts[0].state = { status: 'completed', input: approval,
    output: JSON.stringify({ ...approval, status: 'REJECTED' }), time: { start: 1, end: 2 } };
  await h.stop(); await h.start();
  await h.post('/broker/readiness', { status: 'READY', pending_count: 0,
    infrastructure_status: 'READY', coordination_protocol: 'resource-scoped-v1' });
  const global = (await h.post('/coordination/global/request', { transactionId: 'rejected-global',
    cause: 'GLOBAL_RECONCILIATION', scope: 'all', authorization: 'human test', evidence: ['test'] })).body;
  const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
  const parts = (await h.nativeClient.messages('ses_a_new', h.directory)).flatMap(m => m.parts);
  const payload = { ...recovery, phase: 'reconcile-rejected', previousPreflightRequestId: approval.requestId,
    preflightRequestId: 'preflight-next', developerAuthorization: 'human test', globalTransactionId: global.transactionId,
    rejectedPreflightProof: { nativeToolCount: parts.length,
      nativeToolHash: createHash('sha256').update(JSON.stringify(canonical(parts))).digest('hex') } };
  assert.equal((await h.post('/runs/a/job/recover', { ...payload, globalTransactionId: 'other' })).status, 409);
  const reconciled = await h.post('/runs/a/job/recover', payload);
  assert.equal(reconciled.status, 200, JSON.stringify(reconciled.body));
  const attempt = reconciled.body.recovery.attempts.at(-1);
  const release = { transactionId: global.transactionId, generation: global.generation,
    authorization: 'human test', evidence: ['sealed rejection'], rejectedRecovery: { runId: 'a', jobId: 'job-a',
      recoveryId: recovery.recoveryId, preflightRequestId: 'preflight-next', nativeToolHash: attempt.nativeToolHash } };
  assert.equal((await h.post('/coordination/global/confirm', { ...release, authorization: '' })).status, 409);
  h.native.busy.ses_b = { type: 'busy' };
  assert.equal((await h.post('/coordination/global/confirm', release)).status, 409);
  delete h.native.busy.ses_b;
  assert.equal((await h.post('/coordination/global/confirm', release)).status, 200);
  h.native.messages.ses_a_new.at(-1).parts[0].state.output = 'changed';
  assert.equal((await h.post('/coordination/global/release', release)).status, 409);
  h.native.messages.ses_a_new.at(-1).parts[0].state.output = JSON.stringify({ ...approval, status: 'REJECTED' });
  assert.equal((await h.post('/coordination/global/release', release)).status, 200);
  assert.equal((await h.get('/runs/a/job')).body.recovery.preflightRequestId, 'preflight-next');
  assert.deepEqual(h.native.replies, []);
});

test('restauration humaine concurrente conserve propriétaire et digest sans nouvelle once', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); await h.reserve('b');
  const recovery = { jobId: 'job-a', expectedSessionId: 'ses_a', sessionId: 'ses_a_new',
    recoveryId: 'recovery-a-restore', preflightRequestId: 'preflight-a-restore' };
  const prepared = await h.post('/runs/a/job/recover', { ...recovery, phase: 'prepare' });
  assert.equal(prepared.status, 200);
  let stamp = Date.parse(prepared.body.recovery.preparedAt);
  const approval = h.approval({ ...a, sessionId: 'ses_a_new' }, recovery.preflightRequestId);
  assert.equal((await h.post('/validation/request', { approval })).status, 202);
  assert.equal((await h.post('/runs/a/decision/' + approval.requestId, { decision: 'approved' })).status, 201);
  h.native.permissions.push({ id: 'permission-restored-a', sessionID: 'ses_a_new', permission: 'bash',
    metadata: { command: '/usr/bin/true' } });
  await waitFor(() => h.native.replies.length === 1);
  stamp = Date.now() + 1;
  const signatureHistory = h.native.messages.ses_a_new.slice(0, 1);
  h.native.messages.ses_a_new = [...signatureHistory, { parts: [
    { type: 'tool', tool: 'cgpt-validation_request_validation', state: { status: 'completed', input: approval,
      output: JSON.stringify({ ...approval, status: 'APPROVED', reviewer: 'CGPT' }),
      time: { start: stamp + 1, end: stamp + 2 } } },
    { type: 'tool', tool: 'bash', state: { status: 'completed', input: { command: '/usr/bin/true' },
      metadata: { exit: 0 }, time: { start: stamp + 3, end: stamp + 4 } } },
    { type: 'tool', tool: 'cgpt-validation_broker_readiness', state: { status: 'completed',
      output: JSON.stringify({ status: 'READY', pending_count: 0 }), time: { start: stamp + 5, end: stamp + 6 } } },
  ] }];
  await h.post('/broker/readiness', { status: 'READY', pending_count: 0,
    by_run: { a: { pending_count: 0 }, b: { pending_count: 0 } } });
  await delay(10);
  assert.equal((await h.releaseOperation(a, approval)).status, 200);
  const gate = await h.post('/runs/a/job/terminal-gate', { state: 'BLOQUÉ' });
  assert.equal(gate.status, 201);
  assert.equal((await h.post('/runs/a/job/disarm', { jobId: 'job-a' })).status, 202);
  const decision = (await h.get('/runs/a/decision/' + approval.requestId)).body;
  const ordered = (v) => Array.isArray(v) ? v.map(ordered) : v !== null && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, ordered(v[k])])) : v;
  const hash = async () => createHash('sha256').update(JSON.stringify(ordered(
    (await h.nativeClient.messages('ses_a_new', h.directory)).flatMap((m) => m.parts)))).digest('hex');
  for (const message of h.native.messages.ses_a_new) for (const part of message.parts) if (part.type === 'tool') {
    if (part.tool === 'execute' && part.state.input?.code?.includes('request_validation')) continue;
    part.callID ||= 'call_fixture'; part.executed = true; part.state.metadata ||= {};
  }
  const payload = { ...recovery, phase: 'complete', developerAuthorization: 'accord-ciblé-fixture',
    restoredPreflightProof: { nativeToolCount: 4, nativeToolHash: await hash(), decision,
      blockedGateValidatedAt: gate.body.validatedAt } };
  const v2History = structuredClone(h.native.messages.ses_a_new);
  await h.stop(); await h.start();
  await h.post('/broker/readiness', { status: 'READY', pending_count: 0,
    by_run: { a: { pending_count: 0 }, b: { pending_count: 0 } } });
  h.native.messages.ses_a_new.at(-1).parts[0].state.input.resources = [{ key: 'file:src/foreign.py', mode: 'write' }];
  const changed = structuredClone(payload); changed.restoredPreflightProof.nativeToolHash = await hash();
  assert.equal((await h.post('/runs/a/job/recover', changed)).body.error, 'preflight-approval-divergent');
  h.native.messages.ses_a_new = v2History;
  const result = await h.post('/runs/a/job/recover', payload);
  assert.equal(result.status, 200, JSON.stringify(result));
  assert.equal(result.body.sessionId, 'ses_a_new');
  assert.equal(result.body.armed, true);
  const runs = (await h.get('/runs')).body.runs;
  assert.equal(runs.find((run) => run.runId === 'b').sessionId, 'ses_b');
  assert.deepEqual((await h.get('/runs/a/decision/' + approval.requestId)).body, decision);
  assert.equal(h.native.replies.length, 1);
});

test('consultations et import statistique HTTP ne changent ni registre ni permissions', async (t) => {
  const h = await setup(t); await h.reserve('a'); const before = (await h.get('/runs')).body;
  const at = Date.now() - 1000;
  const bundle = { schemaVersion: 1, sourceId: 'synthetic-audit', datasetId: 'one', project: h.directory,
    firstAt: at, lastAt: at + 100, pollMs: 5, gapMs: 15, events: [], quota: [], evidence: [],
    catalog: [{ runId: 'old', contextId: 1, changeId: 'change-old', sessionId: 'ses_old', state: 'DELIVERED',
      phase: 'REPORT', firstAt: at, lastAt: at + 100, closedAt: at + 100 }],
    intervals: [{ from: at, to: at + 100, registryKnown: true, nativeAvailable: false, scopeRunIds: ['old'],
      integrationOwner: null, contexts: [{ runId: 'old', contextId: 1, changeId: 'change-old', sessionId: 'ses_old',
        nativeType: null, queue: null, stale: null }] }] };
  assert.equal((await h.post('/statistics/import', { bundle })).body.status, 'imported');
  assert.equal((await h.post('/statistics/import', { bundle })).body.status, 'already-imported');
  assert.equal((await h.post('/statistics/import', { bundle: { ...bundle, command: 'SECRET' } })).status, 400);
  for (const selection of ['current','last','24h','7d','30d']) {
    const view = await h.get('/statistics/view?selection=' + selection);
    assert.equal(view.status, 200); assert.equal(view.body.selection, selection);
    assert.equal(view.body.sources[1].historical, true);
  }
  assert.deepEqual((await h.get('/runs')).body, before); assert.equal(h.native.replies.length, 0);
  await h.stop(); await h.start();
  assert.equal((await h.post('/statistics/import', { bundle })).body.status, 'already-imported');
});

test('pause ciblée et intégrité commune ferment leurs admissions sans approbation implicite', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); const b = await h.reserve('b');
  assert.equal((await h.post('/runs/a/suspend', { version: a.version, action: 'PAUSE', evidence: ['pause A'] })).status, 200);
  assert.equal((await h.post('/validation/request', { approval: h.approval(a, 'paused') })).body.error, 'run-pause');
  assert.equal((await h.post('/validation/request', { approval: h.approval(b, 'independent') })).status, 202);
  assert.equal((await h.post('/runs/b/decision/independent', { decision: 'rejected' })).status, 201);
  await h.post('/broker/readiness', { status: 'BLOCKED', infrastructure_status: 'BLOCKED', root_cause: 'JOURNAL_INTEGRITY_FAILURE' });
  const global = (await h.get('/coordination/global')).body.global;
  assert.equal(global.cause, 'GLOBAL_RECONCILIATION'); assert.equal(global.state, 'DRAINING');
  assert.equal((await h.post('/validation/request', { approval: h.approval(b, 'integrity-blocked') })).body.error, 'global-coordination-suspended');
  assert.equal(h.native.replies.length, 0);
});

test('ancien broker ou anciens champs refusés sans permission ni gel ordinaire', async (t) => {
  const h = await setup(t); const a = await h.reserve('a');
  await h.post('/broker/readiness', { status: 'READY', coordination_protocol: 'legacy' });
  assert.equal((await h.post('/validation/request', { approval: h.approval(a, 'old-broker') })).body.error, 'coordination-upgrade-required');
  await h.post('/broker/readiness', { status: 'READY' });
  const old = h.approval(a, 'old-fields'); delete old.operation_id;
  h.native.messages.ses_a.at(-1).parts[0].state.input = structuredClone(old);
  assert.equal((await h.post('/validation/request', { approval: old })).body.error, 'coordination-upgrade-required');
  assert.equal((await h.get('/coordination/global')).body.global, null); assert.equal(h.native.replies.length, 0);
});

test('un refus explicite reste possible pendant une pause après préparation', async (t) => {
  const h = await setup(t); const a = await h.reserve('a');
  const approval = h.approval(a, 'pending-pause');
  assert.equal((await h.post('/validation/request', { approval })).status, 202);
  await h.post('/runs/a/suspend', { version: a.version, action: 'PAUSE', evidence: ['pause'] });
  assert.equal((await h.post('/runs/a/decision/pending-pause', { decision: 'rejected' })).status, 201);
  assert.equal((await h.get('/runs/a/decision/pending-pause')).body.decision, 'rejected');
  assert.equal(h.native.replies.length, 0);
});

test('migration HTTP conserve les RUN et exige once exact avant leur reprise métier', async (t) => {
  const h = await setup(t); const a = await h.reserve('a'); await h.reserve('b');
  const legacy = (await h.get('/runs')).body; legacy.schemaVersion = 3;
  delete legacy.coordination; delete legacy.coordinationProtocol;
  await h.stop();
  const state = join(runtimeStateDirectory(h.directory));
  writeFileSync(join(state,'controller-runs.json'),JSON.stringify(legacy)+'\n');
  await h.start();
  // A nominal cohort proof requires the initial SSE connection to be established.
  await waitFor(async () => (await h.get('/status')).body.opencodeSse === 'connected');
  await h.post('/broker/readiness',{status:'READY',pending_count:0});
  assert.equal((await h.get('/runs/a/status')).body.coordination.reason,'coordination-upgrade-required');
  const migrated = await h.post('/coordination/migrate',{cause:'SHARED_MAINTENANCE',authorization:'explicit migration',evidence:['native quiescence and backup']});
  assert.equal(migrated.status,200,JSON.stringify(migrated));
  assert.equal(migrated.body.runs.length,2);
  assert.equal(statSync(join(state,migrated.body.coordination.legacy.backupFile)).mode & 0o777,0o600);
  await h.post('/runs/a/suspend',{version:a.version,action:'RESUME',evidence:['preflight only']});
  const g=migrated.body.coordination.global;
  assert.equal((await h.post('/coordination/global/release',{transactionId:g.transactionId,generation:g.generation,
    authorization:'preflight only while peers paused',evidence:['transport checks passed']})).status,200);
  assert.equal((await h.post('/validation/request',{approval:h.approval(a,'business-before-probe')})).body.error,'maintenance-preflight-required');
  const {approval,access}=await h.approvedAccess(a,'preflight-migration');
  await h.execute(approval);await h.completeTool(approval);
  assert.equal((await h.releaseOperation(a,approval,access)).status,200);
  const runs=(await h.get('/runs')).body.runs;
  assert.equal(runs.find(r=>r.runId==='a').maintenancePreflightRequired,undefined);
  assert.equal(runs.find(r=>r.runId==='b').suspension.action,'PAUSE');
  assert.equal((await h.post('/validation/request',{approval:h.approval(a,'business-after-probe')})).status,202);
  assert.equal(h.native.replies.length,1);
});

test('la fin native accepte un appel commencé avant ask mais refuse un autre callID', async (t) => {
  const h=await setup(t);const a=await h.reserve('a');
  const {approval,access}=await h.approvedAccess(a,'pending-before-ask');await h.execute(approval);
  const op=(await h.get('/runs')).body.coordination.operations[approval.operation_id];
  const part={type:'tool',tool:'bash',callID:'wrong-call',state:{status:'completed',input:{command:'/usr/bin/true'},
    time:{start:op.native.startedAt-1000,end:Date.now()+1},metadata:{exit:0}}};
  h.native.messages.ses_a.push({parts:[part]});
  assert.equal((await h.releaseOperation(a,approval,access)).body.error,'native-completion-not-proved');
  part.callID='call-'+approval.requestId;
  assert.equal((await h.releaseOperation(a,approval,access)).status,200);
  assert.equal((await h.releaseOperation(a,approval,access)).status,200);
});

test('l’usage historique unique garde once et exige une clôture réconciliée avant Multi-RUN', async (t) => {
  const h=await setup(t);
  const approval={requestId:'legacy-request',approval_id:'legacy-approval',change_id:'legacy-change',session_id:'ses_legacy',
    directory:h.directory,files:[],commands:['/usr/bin/true'],summary:'legacy compatibility'};
  assert.equal((await h.post('/validation/request',{approval})).status,202);
  assert.equal((await h.post('/decision/legacy-request',{decision:'approved'})).status,201);
  h.native.permissions.push({id:'legacy-permission',sessionID:'ses_legacy',permission:'bash',metadata:{command:'/usr/bin/true'}});
  await waitFor(()=>h.native.replies.length===1);await delay(30);
  assert.equal((await h.post('/runs/reserve',h.candidate('a'))).body.error,'legacy-coordination-reconciliation-required');
  const g=(await h.post('/coordination/global/request',{cause:'GLOBAL_RECONCILIATION',scope:'all',transactionId:'legacy-global',
    authorization:'explicit handoff',evidence:['legacy review']})).body;
  h.native.busy.ses_legacy={type:'busy'};
  assert.equal((await h.post('/coordination/global/confirm',{...g,evidence:['not quiescent']})).body.error,'native-session-not-quiescent');
  h.native.busy.ses_legacy={type:'idle'};
  assert.equal((await h.post('/coordination/global/confirm',{...g,evidence:['all legacy effects reviewed']})).status,200);
  assert.equal((await h.post('/coordination/legacy/reconcile',{transactionId:'handoff',authorization:'explicit closure',
    evidence:['native history and effects reconciled']})).status,200);
  assert.equal((await h.post('/coordination/global/release',{...g,authorization:'resume concurrent profile',evidence:['handoff proved']})).status,200);
  assert.equal((await h.reserve('a')).state,'RESERVED');assert.equal(h.native.replies[0].body.response,'once');
});


for (const [label, environment, limit] of [
  ['défaut', {}, 16384],
  ['alias historique', { OC_CGPT_MAX_COMMAND_LENGTH: '2000' }, 2000],
  ['priorité principale', { OC_Codex_MAX_COMMAND_LENGTH: '4096', OC_CGPT_MAX_COMMAND_LENGTH: '2000' }, 4096],
]) {
  test(`bornes de commande HTTP : ${label}`, async (t) => {
    const h = await setup(t, { environment });
    for (const length of [limit - 1, limit, limit + 1]) {
      const approval = { requestId: 'length-' + length, approval_id: 'approval-' + length, change_id: 'length-change',
        session_id: 'ses_length', directory: h.directory, files: [], commands: ['x'.repeat(length)] };
      const result = await h.post('/validation/request', { approval });
      if (length <= limit) {
        assert.equal(result.status, 202, JSON.stringify(result));
        assert.equal((await h.post('/validation/reminder', { approval })).status, 202);
      } else {
        assert.equal(result.status, 400);
        assert.deepEqual(result.body, { error: 'command-too-long',
          message: `Commande refusée : longueur ${length}, limite autorisée ${limit}.`,
          maxLength: limit, actualLength: length, unit: 'utf16' });
        assert.equal((await h.get('/decision/' + approval.requestId)).status, 404);
      }
    }
    assert.equal(h.native.replies.length, 0);
  });
}

test('comptage UTF-16 : accents BMP et caractères hors BMP aux bornes', async (t) => {
  const h = await setup(t, { environment: { OC_Codex_MAX_COMMAND_LENGTH: '4' } });
  for (const [index, command] of ['ééé', 'éééé', '😀😀', 'ééééé', '😀😀x'].entries()) {
    const approval = { requestId: 'unicode-' + index, approval_id: 'unicode-approval-' + index,
      change_id: 'unicode-change', session_id: 'ses_unicode', directory: h.directory, files: [], commands: [command] };
    const result = await h.post('/validation/request', { approval });
    assert.equal(result.status, command.length <= 4 ? 202 : 400);
    if (result.status === 400) assert.equal(result.body.actualLength, 5);
  }
});

test('refus de longueur sur demandes et rappels : routes historiques, resource et RUN sans enregistrement', async (t) => {
  const h = await setup(t);
  const legacy = { requestId: 'legacy-too-long', approval_id: 'legacy-approval', change_id: 'legacy-change',
    session_id: 'ses_legacy', directory: h.directory, files: [], commands: ['x'.repeat(16385)] };
  for (const action of ['request', 'reminder']) {
    const result = await h.post('/validation/' + action, { approval: legacy });
    assert.equal(result.status, 400); assert.equal(result.body.error, 'command-too-long');
  }
  assert.equal((await h.get('/status')).body.undecidedValidationCount, 0);
  const run = await h.reserve('a');
  const approval = h.approval(run, 'too-long'); approval.commands = ['x'.repeat(16385)];
  const before = (await h.get('/runs')).body;
  for (const route of ['/validation/request', '/validation/reminder', '/validation/resource-request',
    '/validation/resource-reminder', '/runs/a/validation/request', '/runs/a/validation/reminder']) {
    const result = await h.post(route, { approval });
    assert.equal(result.status, 400, route); assert.equal(result.body.maxLength, 16384);
    assert.equal(result.body.actualLength, 16385); assert.ok(!JSON.stringify(result.body).includes(approval.commands[0]));
  }
  const after = (await h.get('/runs')).body;
  assert.deepEqual(after.coordination.operations, before.coordination.operations);
  assert.deepEqual(after.requestOwners, before.requestOwners);
  assert.equal((await h.get('/runs/a/status')).body.undecidedValidationCount, 0);
  assert.equal((await h.get('/runs/a/decision/too-long')).status, 404);
  assert.equal(h.native.replies.length, 0);
});

test('commande longue stricte : décision corrélée, commande exacte et once consommé une seule fois', async (t) => {
  const h = await setup(t); const run = await h.reserve('a');
  const approval = h.approval(run, 'long-once'); approval.commands = ['x'.repeat(16384)];
  h.native.messages.ses_a.at(-1).parts[0].state.input = structuredClone(approval);
  assert.equal((await h.post('/validation/resource-request', { approval })).status, 202);
  assert.equal((await h.post('/validation/resource-reminder', { approval })).status, 202);
  const permission = { id: 'long-native', sessionID: 'ses_a', permission: 'bash', tool: { callID: 'long-call' },
    metadata: { command: approval.commands[0] } };
  const observePoll = async () => {
    const count = h.native.requests.filter((p) => p === '/permission').length;
    await waitFor(() => h.native.requests.filter((p) => p === '/permission').length >= count + 3);
  };
  h.native.permissions.push(permission); await observePoll(); assert.equal(h.native.replies.length, 0);
  permission.metadata.command = approval.commands[0].slice(0, -1) + 'y';
  assert.equal((await h.post('/runs/a/decision/long-once', { decision: 'approved' })).status, 201);
  const decision = (await h.get('/runs/a/decision/long-once')).body;
  for (const key of ['requestId', 'approval_id', 'change_id', 'run_id', 'reservation_version']) {
    assert.equal(decision[key], approval[key]);
  }
  const acquired = await h.post('/runs/a/locks/acquire', { version: run.version, operationId: approval.operation_id,
    operationDigest: approval.operation_digest, resources: approval.resources, expectedRevisions: approval.expected_revisions });
  assert.equal(acquired.status, 200);
  await observePoll(); assert.equal(h.native.replies.length, 0);
  permission.metadata.command = approval.commands[0];
  await waitFor(() => h.native.replies.length === 1);
  assert.equal(h.native.replies[0].body.response, 'once');
  h.native.permissions.push({ ...permission, id: 'long-native-second' });
  await observePoll(); assert.equal(h.native.replies.length, 1);
  assert.equal((await h.post('/runs/a/decision/long-once', { decision: 'approved' })).status, 400);
  assert.deepEqual((await h.get('/runs/a/decision/long-once')).body, decision);
});


test('une opération consommée ne réinscrit pas sa session après la réconciliation historique', async (t) => {
  const h = await setup(t);
  const approval = { requestId: 'consumed-legacy', approval_id: 'consumed-approval', change_id: 'legacy-change',
    session_id: 'ses_legacy', directory: h.directory, files: [], commands: ['/usr/bin/true'] };
  assert.equal((await h.post('/validation/request', { approval })).status, 202);
  assert.equal((await h.post('/decision/consumed-legacy', { decision: 'approved' })).status, 201);
  h.native.permissions.push({ id: 'consumed-permission', sessionID: 'ses_legacy', permission: 'bash',
    metadata: { command: '/usr/bin/true' } });
  await waitFor(() => h.native.replies.length === 1);
  const global = await h.post('/coordination/global/request', { cause: 'GLOBAL_RECONCILIATION', scope: 'all',
    transactionId: 'consumed-global', authorization: 'explicit closure', evidence: ['effects reviewed'] });
  assert.equal(global.status, 202);
  assert.equal((await h.post('/coordination/global/confirm', { ...global.body, evidence: ['quiescence proved'] })).status, 200);
  assert.equal((await h.post('/coordination/legacy/reconcile', { transactionId: 'consumed-handoff',
    authorization: 'explicit closure', evidence: ['effects reviewed'] })).status, 200);
  assert.equal((await h.post('/coordination/global/release', { ...global.body,
    authorization: 'explicit resume', evidence: ['closure proved'] })).status, 200);
  const count = h.native.requests.filter((p) => p === '/permission').length;
  await waitFor(() => h.native.requests.filter((p) => p === '/permission').length >= count + 3);
  assert.deepEqual((await h.get('/runs')).body.coordination.legacySources, []);
  assert.equal((await h.reserve('a')).state, 'RESERVED');
  assert.equal(h.native.replies.length, 1); assert.equal(h.native.replies[0].body.response, 'once');
});


test('environnement Docker HTTP : conservation entre commandes et restitution prouvée avant le pair', async (t) => {
  const h=await setup(t);const resources=[{key:'docker:engine-a',mode:'write'}];
  const a=await h.reserve('a',{resources});const b=await h.reserve('b',{resources});
  assert.equal((await h.get('/status')).body.testResourceProtocol,'test-resources-v1');
  const acquire={version:a.version,transactionId:'tests-a',resources,evidence:['identité du moteur vérifiée']};
  const lease=(await h.post('/runs/a/test-resources/acquire',acquire)).body;
  assert.equal(lease.state,'HELD');
  assert.equal(typeof lease.token,'string');
  const publicReservations=(await h.get('/runs/a/test-resources')).body;
  const publicStatus=(await h.get('/runs/a/status')).body;
  const publicSnapshot=(await h.get('/runs')).body;
  assert.equal(publicReservations.reservations[0].token,undefined);
  assert.equal(publicStatus.coordination.testReservations[0].token,undefined);
  assert.equal(publicSnapshot.coordination.testReservations[lease.transactionId].token,undefined);
  assert.ok(!JSON.stringify([publicReservations,publicStatus,publicSnapshot]).includes(lease.token));
  assert.equal((await h.post('/runs/b/test-resources/acquire',{...acquire,version:b.version,transactionId:'tests-b'})).status,202);
  assert.equal((await h.get('/runs/b/status')).body.coordination.reason,'test-resource-conflict');
  const payload={version:a.version,transactionId:lease.transactionId,token:lease.token,fencing:lease.fencing,evidence:['restitution examinée']};
  assert.equal((await h.post('/runs/a/test-resources/release',payload)).body.error,'test-cleanup-proof-required');
  const execute=async(id)=>{
    const revisions=(await h.get('/runs/a/locks')).body.revisions;
    const operation=await h.approvedAccess(a,id,revisions);await h.execute(operation.approval);
    await h.completeTool(operation.approval);
    assert.equal((await h.releaseOperation(a,operation.approval,operation.access)).status,200);
    return operation.approval.operation_id;
  };
  await execute('container-tests');
  assert.equal((await h.get('/runs/a/test-resources')).body.reservations[0].state,'HELD');
  assert.equal((await h.post('/runs/a/job/terminal-gate',{state:'TERMINÉ'})).body.error,'run-accesses-unresolved');
  const cleanupOperationId=await execute('cleanup');
  const verificationOperationId=await execute('verify-clean');
  const release={...payload,cleanup:[{resourceKey:resources[0].key,cleanupOperationId,verificationOperationId,restored:true}]};
  const released=await h.post('/runs/a/test-resources/release',release);
  assert.equal(released.status,200);assert.equal(released.body.state,'RELEASED');
  assert.equal((await h.get('/runs/a/test-resources')).body.reservations[0].token,undefined);
  assert.equal((await h.get('/runs')).body.coordination.testReservations[lease.transactionId].token,undefined);
  assert.equal((await h.post('/runs/a/test-resources/release',release)).body.state,'RELEASED');
  assert.equal((await h.get('/runs/b/test-resources')).body.reservations[0].state,'HELD');
  assert.equal((await h.post('/runs/a/test-resources/release',{...release,evidence:['preuve divergente']})).status,409);
});

test('réservation LXC HTTP restaurée : nouvelle frontière native et jeton renouvelé', async (t) => {
  const h=await setup(t);const a=await h.reserve('a',{resources:[{key:'lxc:host-a/101',mode:'write'}]});
  const acquisition={version:a.version,transactionId:'lxc-a',resources:a.resources,evidence:['instance canonique']};
  const lease=(await h.post('/runs/a/test-resources/acquire',acquisition)).body;
  await h.stop();await h.start();
  const restoredView=(await h.get('/runs/a/test-resources')).body;
  assert.equal(restoredView.reservations[0].reconciliationRequired,true);
  assert.equal(restoredView.reservations[0].token,undefined);
  const reacquired=await h.post('/runs/a/test-resources/acquire',acquisition);
  assert.equal(reacquired.status,200,JSON.stringify(reacquired));
  assert.equal(reacquired.body.state,'HELD');assert.equal(reacquired.body.token,lease.token);
  assert.equal(reacquired.body.fencing,lease.fencing);assert.equal(reacquired.body.reconciliationRequired,true);
  const redacted=(await h.get('/runs/a/test-resources')).body;
  assert.equal(redacted.reservations[0].token,undefined);
  assert.ok(!JSON.stringify(redacted).includes(reacquired.body.token));
  assert.equal((await h.post('/runs/a/test-resources/acquire',{...acquisition,evidence:['divergent']})).status,409);
  const payload={version:a.version,transactionId:lease.transactionId,token:reacquired.body.token,fencing:reacquired.body.fencing,evidence:['frontière native sans activité']};
  assert.equal((await h.post('/runs/a/test-resources/release',payload)).body.error,'test-reconciliation-required');
  h.native.busy[a.sessionId]={type:'busy'};
  assert.equal((await h.post('/runs/a/test-resources/reconcile',{...payload,reconciliationId:'reconcile-a'})).status,409);
  h.native.busy={};
  const request={...payload,reconciliationId:'reconcile-a'};
  const restored=await h.post('/runs/a/test-resources/reconcile',request);
  assert.equal(restored.status,200,JSON.stringify(restored));assert.notEqual(restored.body.token,lease.token);
  assert.equal((await h.post('/runs/a/test-resources/reconcile',request)).body.token,restored.body.token);
  assert.equal((await h.post('/runs/a/test-resources/release',payload)).body.error,'test-token-invalid');
});


for (const browser of ['chromium','firefox']) test('verrou HTTP du navigateur externe '+browser+' : fin et restitution distinctes', async (t) => {
  const h=await setup(t);const resources=[{key:'browser:host-a/'+browser,mode:'write'}];
  const a=await h.reserve('a',{resources});const b=await h.reserve('b',{resources});
  const lease=(await h.post('/runs/a/test-resources/acquire',{version:a.version,transactionId:'browser-a',resources,evidence:['navigateur DEVOPS résolu']})).body;
  assert.equal(lease.state,'HELD');
  assert.equal((await h.post('/runs/b/test-resources/acquire',{version:b.version,transactionId:'browser-b',resources,evidence:['même navigateur']})).status,202);
  const execute=async(id)=>{
    const revisions=(await h.get('/runs/a/locks')).body.revisions;
    const op=await h.approvedAccess(a,id,revisions);await h.execute(op.approval);await h.completeTool(op.approval);
    assert.equal((await h.releaseOperation(a,op.approval,op.access)).status,200);return op.approval.operation_id;
  };
  await execute('browser-test');
  const payload={version:a.version,transactionId:lease.transactionId,token:lease.token,fencing:lease.fencing,evidence:['sessions et profil temporaires restitués']};
  assert.equal((await h.post('/runs/a/test-resources/release',payload)).body.error,'test-cleanup-proof-required');
  assert.equal((await h.post('/runs/a/job/terminal-gate',{state:'TERMINÉ'})).status,409);
  const cleanupOperationId=await execute('close-browser');const verificationOperationId=await execute('verify-browser');
  assert.equal((await h.post('/runs/a/test-resources/release',{...payload,cleanup:[{resourceKey:resources[0].key,cleanupOperationId,verificationOperationId,restored:true}]})).status,200);
  assert.equal((await h.get('/runs/b/test-resources')).body.reservations[0].state,'HELD');
});


test('PLLM HTTP : défaut medium, prévol exact, choix persisté et modèle du job immuable', async(t)=>{
 const h=await setup(t,{codingPolicy:true});
 const resolved=await h.post('/model-policy/resolve',{});assert.equal(resolved.status,200,JSON.stringify(resolved));
 assert.equal(resolved.body.reasoning,'medium');assert.equal(resolved.body.preflightRequired,true);
 const run=(await h.post('/runs/reserve',h.candidate('a'))).body;
 const arm={jobId:'job-a',sessionId:run.sessionId,directory:h.directory,changeId:run.changeId,strictCommands:true,criteria:['delivery'],
   modelSelectionProtocol:'pllm-auto-v1',modelSelection:{},modelPreflight:{sessionId:'ses_probe',messageId:'msg_response'}};
 assert.equal((await h.post('/runs/a/job/arm',{...arm,modelSelection:0})).body.error,'model-selection-input-invalid');
 h.native.sessions.ses_probe.model.variant='low';
 assert.equal((await h.post('/runs/a/job/arm',arm)).body.error,'model-preflight-not-proved');
 h.native.sessions.ses_probe.model.variant='medium';
 const armed=await h.post('/runs/a/job/arm',arm);assert.equal(armed.status,201,JSON.stringify(armed));
 assert.equal(armed.body.codingModel.modelID,'model1');assert.equal(armed.body.codingModel.reasoning,'medium');
 const selected=armed.body.codingModel;await h.stop();await h.start();
 assert.deepEqual((await h.get('/runs/a/job')).body.codingModel,selected);
 assert.equal((await h.post('/runs/a/job/arm',{...arm,codingModel:selected})).body.error,'model-selection-server-owned');
 h.native.sessions.ses_probe.model={providerID:'provider2',modelID:'model2',variant:'medium'};
 h.native.messages.ses_probe[1].info.providerID='provider2';h.native.messages.ses_probe[1].info.modelID='model2';
 const changed=await h.post('/runs/a/job/arm',{...arm,modelSelection:{model:'provider2/model2'}});
 assert.equal(changed.status,400);assert.equal(changed.body.error,'job-coding-model-immutable');
 assert.deepEqual((await h.get('/runs/a/job')).body.codingModel,selected);
});

test('PLLM HTTP : medium absent choisit high avant la politique inférieure, modèle incompatible bloqué',async(t)=>{
 const h=await setup(t,{codingPolicy:true});
 h.native.providers.all[0].models.model1.variants={high:{},xhigh:{}};
 const resolved=await h.post('/model-policy/resolve',{});
 assert.equal(resolved.status,200,JSON.stringify(resolved));
 assert.equal(resolved.body.mode,'mode1');assert.equal(resolved.body.reasoning,'high');
 h.native.providers.all[0].models.model1.variants={low:{}};
 assert.equal((await h.post('/model-policy/resolve',{})).body.mode,'mode2');
 assert.equal((await h.post('/model-policy/resolve',{model:'provider1/model1'})).body.error,'explicit-model-unavailable');
 assert.equal((await h.post('/model-policy/resolve',{model:'provider1/model1',reasoning:'low'})).body.reasoning,'low');
});


test('PLLM HTTP : refus natif corrélé de medium autorise high mais 429 bloque',async(t)=>{
 const h=await setup(t,{codingPolicy:true});
 const reject=(reasoning,status=400)=>{
  const name=reasoning+'-'+status;const user=structuredClone(h.native.messages.ses_probe[0]);
  user.info.id='msg_user_'+name;
  const response=structuredClone(h.native.messages.ses_probe[1]);response.info.id='msg_bad_'+name;response.info.parentID=user.info.id;response.info.variant=reasoning;
  response.info.error={name:'APIError',data:{statusCode:status,responseBody:JSON.stringify({error:{code:'unsupported_value',param:'reasoning_effort',message:'diagnostic privé fictif'}})}};
  response.parts=[];h.native.messages.ses_probe.push(user,response);
  return {sessionId:'ses_probe',messageId:response.info.id};
 };
 const medium=reject('medium');
 const next=await h.post('/model-policy/resolve',{unavailablePreflights:[medium]});
 assert.equal(next.body.mode,'mode1',JSON.stringify(next));assert.equal(next.body.reasoning,'high');assert.equal(next.body.unavailabilityProofs.length,1);
 assert.equal(JSON.stringify(next.body).includes('diagnostic privé fictif'),false);
 assert.equal((await h.post('/model-policy/resolve',{model:'provider1/model1',reasoning:'medium',unavailablePreflights:[medium]})).body.error,'explicit-model-unavailable');
 assert.equal((await h.post('/model-policy/resolve',{unavailablePreflights:[reject('medium',429)]})).body.error,'model-unavailability-not-proved');
});


test('Budget /provider fourni par la session : bornes exactes, portée locale et confidentialité',async(t)=>{
 const h=await setup(t,{codingPolicy:true});const marker='DONNEE_PRIVEE_SYNTHETIQUE';
 h.native.providers.privatePadding=marker+'x'.repeat(3*1024*1024);
 const bytes=v2ProviderResponseBytes(h.native.providers,h.directory);
 assert.equal((await h.post('/model-policy/resolve',{})).body.error,'model-observation-too-large');
 for(const value of [0,-1,1.5,'8000000',null,Number.MAX_SAFE_INTEGER+1]){
  const observations=()=>h.native.requests.filter(p=>p==='/provider'||p.startsWith('/session/ses_probe')).length;
  const before=observations();
  const result=await h.post('/model-policy/resolve',{providerMaxBytes:value});
  assert.equal(result.body.error,'model-selection-input-invalid');assert.equal(observations(),before);
 }
 const overLimit=await h.post('/model-policy/resolve',{providerMaxBytes:bytes-1});
 assert.equal(overLimit.body.error,'model-observation-too-large',JSON.stringify({overLimit,bytes}));
 const exact=await h.post('/model-policy/resolve',{providerMaxBytes:bytes});assert.equal(exact.status,200);assert.equal(exact.body.reasoning,'medium');
 assert.ok(!JSON.stringify(exact).includes(marker));
 assert.equal((await h.post('/model-policy/resolve',{})).body.error,'model-observation-too-large');
 const run=(await h.post('/runs/reserve',h.candidate('a'))).body;
 const arm={jobId:'job-a',sessionId:run.sessionId,directory:h.directory,changeId:run.changeId,strictCommands:true,criteria:['budget'],modelSelectionProtocol:'pllm-auto-v1',modelSelection:{providerMaxBytes:bytes},modelPreflight:{sessionId:'ses_probe',messageId:'msg_response'}};
 const probeSession=structuredClone(h.native.sessions.ses_probe);
 h.native.sessions.ses_probe={privatePadding:marker+'x'.repeat(2*1024*1024)};
 assert.equal((await h.post('/runs/a/job/arm',arm)).body.error,'model-observation-too-large');
 h.native.sessions.ses_probe=probeSession;
 h.native.messages.ses_probe[1].parts.push({type:'text',text:marker+'x'.repeat(2*1024*1024)});
 assert.equal((await h.post('/runs/a/job/arm',arm)).body.error,'model-observation-too-large');
 h.native.messages.ses_probe[1].parts.pop();
 const armed=await h.post('/runs/a/job/arm',arm);assert.equal(armed.status,201,JSON.stringify(armed));
 assert.ok(!JSON.stringify(armed).includes(marker));assert.ok(!JSON.stringify((await h.get('/runs/a/job')).body).includes(marker));
 h.native.providers.privatePadding=marker+'x'.repeat(17*1024*1024);
 const larger=v2ProviderResponseBytes(h.native.providers,h.directory);assert.ok(larger>16*1024*1024);
 assert.equal((await h.post('/model-policy/resolve',{model:'provider1/model1',providerMaxBytes:larger})).status,200);
});


test('Raccord HTTP préparé : catalogue transmis, alias natif, variante imbriquée et job conservé',async(t)=>{
 const h=await setup(t,{codingPolicy:true,prepareCatalog:true,environment:{CAB_TEST_PRIVATE_OPTION:'NE_PAS_RESTITUER'}});
 const catalog=JSON.parse(readFileSync(h.native.catalogPath,'utf8'));catalog.models[0].provider='opencodego';writeFileSync(h.native.catalogPath,JSON.stringify(catalog));
 h.native.providers.all[0].id='opencode-go';h.native.providers.connected[0]='opencode-go';
 const parent=h.native.messages.ses_probe[0].info;parent.model={providerID:'opencode-go',modelID:'model1',variant:'medium'};delete parent.variant;
 h.native.sessions.ses_probe.model={providerID:'opencode-go',modelID:'model1',variant:'medium'};
 h.native.messages.ses_probe[1].info.providerID='opencode-go';h.native.messages.ses_probe[1].info.variant='medium';
 const resolved=await h.post('/model-policy/resolve',{});assert.equal(resolved.status,200,JSON.stringify(resolved));
 assert.equal(h.native.preparation.source,'active-skill');assert.equal(resolved.body.source,'pllm-automatic');assert.equal(resolved.body.providerID,'opencode-go');assert.equal(resolved.body.logicalProviderID,'opencodego');
 assert.ok(!JSON.stringify(resolved).includes('NE_PAS_RESTITUER'));
 const run=(await h.post('/runs/reserve',h.candidate('a'))).body;
 const arm={jobId:'job-a',sessionId:run.sessionId,directory:h.directory,changeId:run.changeId,strictCommands:true,criteria:['raccord'],modelSelectionProtocol:'pllm-auto-v1',modelSelection:{},modelPreflight:{sessionId:'ses_probe',messageId:'msg_response'}};
 const bad=structuredClone(arm);h.native.sessions.ses_probe.model.variant='low';assert.equal((await h.post('/runs/a/job/arm',bad)).body.error,'model-preflight-not-proved');h.native.sessions.ses_probe.model.variant='medium';
 const armed=await h.post('/runs/a/job/arm',arm);assert.equal(armed.status,201,JSON.stringify(armed));assert.equal(armed.body.codingModel.providerID,'opencode-go');assert.equal(armed.body.codingModel.logicalProviderID,'opencodego');
 const selected=armed.body.codingModel;await h.stop();await h.start();assert.deepEqual((await h.get('/runs/a/job')).body.codingModel,selected);
});

test('Raccord HTTP : indisponibilités imbriquées rattachées au catalogue logique, auth et contradictions refusées',async(t)=>{
 const h=await setup(t,{codingPolicy:true,prepareCatalog:true});
 const catalog=JSON.parse(readFileSync(h.native.catalogPath,'utf8'));catalog.models[0].provider='opencodego';
 const skipped=catalog.models.pop();skipped.provider=null;skipped.state='Invalide';skipped.evaluated_this_run=false;catalog.models.unshift(skipped);
 writeFileSync(h.native.catalogPath,JSON.stringify(catalog));
 h.native.providers.all[0].id='opencode-go';h.native.providers.connected[0]='opencode-go';
 const reject=(reasoning,status=400,contradiction=false)=>{
  const name=reasoning+'-'+status+'-'+contradiction;const user=structuredClone(h.native.messages.ses_probe[0]);user.info.id='msg_user_'+name;
  h.native.sessions.ses_probe.model={providerID:'opencode-go',modelID:'model1',variant:reasoning};
  user.info.model={providerID:'opencode-go',modelID:'model1',variant:reasoning};delete user.info.variant;
  const response=structuredClone(h.native.messages.ses_probe[1]);Object.assign(response.info,{id:'msg_bad_'+name,parentID:user.info.id,providerID:'opencode-go',variant:contradiction?'low':reasoning});
  response.info.error={name:'APIError',data:{statusCode:status,responseBody:JSON.stringify({error:{code:'unsupported_value',param:'reasoning_effort',message:'PRIVE_SYNTHETIQUE'}})}};
  response.parts=[];h.native.messages.ses_probe.push(user,response);return {sessionId:'ses_probe',messageId:response.info.id};
 };
 const medium=reject('medium');
 const lower=await h.post('/model-policy/resolve',{unavailablePreflights:[medium]});assert.equal(lower.status,200);assert.equal(lower.body.mode,'mode1');assert.equal(lower.body.reasoning,'high');assert.ok(!JSON.stringify(lower).includes('PRIVE_SYNTHETIQUE'));
 for(const reference of [reject('medium',429),reject('medium',401),reject('medium',400,true)])assert.equal((await h.post('/model-policy/resolve',{unavailablePreflights:[reference]})).body.error,'model-unavailability-not-proved');
});

test('recovery du RUN : permission étrangère ignorée avant lecture de cible, permission propre toujours bloquante', async t => {
  const h = await setup(t); await h.reserve('scoped');
  const permission = { id: 'per_foreign_shell', sessionID: 'ses_foreign', permission: 'shell', metadata: { command: '/usr/bin/true' } };
  h.native.permissions.push(permission);
  const recovery = { jobId: 'job-scoped', expectedSessionId: 'ses_scoped', sessionId: 'ses_scoped_new',
    recoveryId: 'recovery-scoped', preflightRequestId: 'preflight-scoped', phase: 'prepare' };
  const prepared = await h.post('/runs/scoped/job/recover', recovery);
  assert.equal(prepared.status, 200, JSON.stringify(prepared));
  assert.equal(prepared.body.recovery.sessionId, recovery.sessionId);
  assert.equal(h.native.permissions[0], permission);
  assert.deepEqual(h.native.replies, []);
  permission.sessionID = recovery.sessionId;
  const retried = await h.post('/runs/scoped/job/recover', { ...recovery, phase: 'retry',
    previousPreflightRequestId: recovery.preflightRequestId, preflightRequestId: 'preflight-scoped-next' });
  assert.equal(retried.status, 409);
  assert.equal(retried.body.error, 'opencode-control-unavailable');
  assert.deepEqual(h.native.replies, []);
});

test('libération run-scoped ignore une permission shell étrangère sans la modifier', async t => {
  const h = await setup(t); const a = await h.reserve('release-foreign-permission');
  const { approval, access } = await h.approvedAccess(a, 'release-foreign-permission-op');
  await h.execute(approval); await h.completeTool(approval);
  const foreign = { id: 'per_foreign_shell', sessionID: 'ses_foreign', permission: 'shell', messageID: 'msg_foreign',
    tool: { callID: 'call_foreign' }, metadata: {} };
  h.native.permissions.push(foreign);
  h.native.messages.ses_foreign = [{ nativeV2: { id: 'msg_foreign', type: 'assistant', time: { created: 1 },
    metadata: { parentID: 'msg_parent' }, content: [{ type: 'tool', id: 'call_foreign', name: 'shell', executed: false,
      time: { created: 1 }, state: { status: 'running', input: { command: '/usr/bin/true', workdir: '/foreign' },
        content: [], metadata: {} } }] } }];
  const released = await h.releaseOperation(a, approval, access);
  assert.equal(released.status, 200, JSON.stringify(released));
  assert.deepEqual(h.native.permissions, [foreign]);
});

test('libération run-scoped reste bloquée par une permission de sa propre session', async t => {
  const h = await setup(t); const a = await h.reserve('release-own-permission');
  const { approval, access } = await h.approvedAccess(a, 'release-own-permission-op');
  await h.execute(approval); await h.completeTool(approval);
  const own = { id: 'per_own_edit', sessionID: a.sessionId, permission: 'edit', messageID: 'msg_own_permission',
    tool: { callID: 'call_own_permission' }, metadata: { filepath: 'pending.txt' } };
  h.native.permissions.push(own);
  h.native.messages[a.sessionId].push({ info: { id: 'msg_own_permission', role: 'assistant' }, parts: [
    { type: 'tool', callID: 'call_own_permission', tool: 'edit', executed: false,
      state: { status: 'running', input: { filePath: h.directory + '/pending.txt' } } },
  ] });
  const released = await h.releaseOperation(a, approval, access);
  assert.equal(released.status, 409);
  assert.equal(released.body.error, 'native-session-not-quiescent');
  assert.deepEqual(h.native.permissions, [own]);
});

test('recovery : prepare exige une discovery exacte avant le gel', async t => {
  const h = await setup(t); await h.reserve('recovery-signature');
  const recovery = { jobId: 'job-recovery-signature', expectedSessionId: 'ses_recovery-signature',
    sessionId: 'ses_recovery-signature_candidate', recoveryId: 'recovery-signature',
    preflightRequestId: 'preflight-signature', phase: 'prepare' };
  const before = (await h.get('/runs/recovery-signature/job')).body;
  const refused = await h.post('/runs/recovery-signature/job/recover', recovery, { skipRecoveryDiscovery: true });
  assert.equal(refused.status, 409);
  assert.equal(refused.body.error, 'preflight-signature-discovery-required');
  const after = (await h.get('/runs/recovery-signature/job')).body;
  assert.equal(after.recovery, null);
  assert.deepEqual(after.revokedSessions, before.revokedSessions);
});

test('recovery : prepare scelle la signature native exacte de request_validation', async t => {
  const h = await setup(t); await h.reserve('recovery-signature-positive');
  const recovery = { jobId: 'job-recovery-signature-positive', expectedSessionId: 'ses_recovery-signature-positive',
    sessionId: 'ses_recovery-signature-positive_candidate', recoveryId: 'recovery-signature-positive',
    preflightRequestId: 'preflight-signature-positive', phase: 'prepare' };
  const input = { namespace: 'cgpt-validation', query: 'request_validation', limit: 20 };
  h.native.messages[recovery.sessionId] = [{ parts: [{ type: 'tool', tool: 'execute', callID: 'call-signature-positive',
    executed: false, state: { status: 'completed', input: { code: 'return await search(' + JSON.stringify(input) + ');' },
      output: JSON.stringify({ items: [{ path: 'tools/request_validation' }] }), time: { start: 10, end: 11 },
      metadata: { truncated: false, toolCalls: [{ tool: 'search', status: 'completed', input }] } } }] }];
  const prepared = await h.post('/runs/recovery-signature-positive/job/recover', recovery);
  assert.equal(prepared.status, 200, JSON.stringify(prepared));
  assert.match(prepared.body.recovery.preparationHistory.requestValidationSignatureHash, /^[a-f0-9]{64}$/);
  assert.equal(prepared.body.recovery.preparationHistory.nativeToolCount, 1);
});

test('recovery : prepare refuse une candidate avec edit deny', async t => {
  const h = await setup(t); await h.reserve('recovery-edit-deny');
  const recovery = { jobId: 'job-recovery-edit-deny', expectedSessionId: 'ses_recovery-edit-deny',
    sessionId: 'ses_recovery-edit-deny_candidate', recoveryId: 'recovery-edit-deny',
    preflightRequestId: 'preflight-edit-deny', phase: 'prepare' };
  const input = { namespace: 'cgpt-validation', query: 'request_validation', limit: 20 };
  h.native.rules[recovery.sessionId] = [
    { permission: 'shell', pattern: '*', action: 'ask' },
    { permission: 'edit', pattern: '*', action: 'deny' },
  ];
  h.native.messages[recovery.sessionId] = [{ parts: [{ type: 'tool', tool: 'execute', callID: 'call-edit-deny',
    executed: false, state: { status: 'completed', input: { code: 'return await search(' + JSON.stringify(input) + ');' },
      output: JSON.stringify({ items: [{ path: 'tools/request_validation' }] }), time: { start: 10, end: 11 },
      metadata: { truncated: false, toolCalls: [{ tool: 'search', status: 'completed', input }] } } }] }];
  const refused = await h.post('/runs/recovery-edit-deny/job/recover', recovery, { skipRecoveryDiscovery: true });
  assert.equal(refused.status, 409);
  assert.equal(refused.body.error, 'preflight-native-ask-required');
  assert.equal((await h.get('/runs/recovery-edit-deny/job')).body.recovery, null);
});

test('recovery : une discovery après prepare bloque la validation avant notification', async t => {
  const h = await setup(t); const run = await h.reserve('recovery-late-discovery');
  const recovery = { jobId: 'job-recovery-late-discovery', expectedSessionId: 'ses_recovery-late-discovery',
    sessionId: 'ses_recovery-late-discovery_candidate', recoveryId: 'recovery-late-discovery',
    preflightRequestId: 'preflight-late-discovery', phase: 'prepare' };
  assert.equal((await h.post('/runs/recovery-late-discovery/job/recover', recovery)).status, 200);
  const input = { namespace: 'cgpt-validation', query: 'request_validation', limit: 20 };
  h.native.messages[recovery.sessionId].push({ parts: [{ type: 'tool', tool: 'execute', callID: 'call-late-discovery',
    executed: false, state: { status: 'completed', input: { code: 'return await search(' + JSON.stringify(input) + ');' },
      output: JSON.stringify({ items: [{ path: 'tools/request_validation' }] }), time: { start: 20, end: 21 },
      metadata: { truncated: false, toolCalls: [{ tool: 'search', status: 'completed', input }] } } }] });
  const approval = h.approval({ ...run, sessionId: recovery.sessionId }, recovery.preflightRequestId);
  const result = await h.post('/validation/request', { approval });
  assert.equal(result.status, 409);
  assert.equal(result.body.error, 'preflight-unexpected-tool');
  assert.equal((await h.get('/runs/recovery-late-discovery/status')).body.undecidedValidationCount, 0);
  assert.deepEqual(h.native.replies, []);
});

async function unregisteredNativeRefusal(t) {
  const h = await setup(t); const run = await h.reserve('refusal');
  const recovery = { jobId: 'job-refusal', expectedSessionId: 'ses_refusal', sessionId: 'ses_refusal_new',
    recoveryId: 'recovery-refusal', preflightRequestId: 'preflight-refusal' };
  assert.equal((await h.post('/runs/refusal/job/recover', { ...recovery, phase: 'prepare' })).status, 200);
  const input = { ...h.approval({ ...run, sessionId: recovery.sessionId }, recovery.preflightRequestId), access_id: '' };
  h.native.messages[recovery.sessionId].pop();
  const envelope = (name, args, output, id) => ({ type: 'tool', id, callID: id, tool: 'execute', executed: false,
    state: { status: 'completed', input: { code: `return await tools["cgpt-validation"].${name}(${JSON.stringify(args)});` },
      output, time: { start: Date.now(), end: Date.now() + 1 }, metadata: { error: true, truncated: false,
        toolCalls: [{ tool: 'cgpt-validation.' + name, status: 'error', input: structuredClone(args) }] } } });
  const refusal = envelope('request_validation', input,
    'MCP tool "request_validation" on server "cgpt-validation" failed: protocole de coordination ou identite d operation invalide', 'call_refusal');
  const lookup = envelope('get_approval', { approval_id: input.approval_id },
    `MCP tool "get_approval" on server "cgpt-validation" failed: approval_id '${input.approval_id}' inconnu`, 'call_lookup');
  h.native.messages[recovery.sessionId].push({ parts: [refusal, lookup] });
  return { h, recovery, input, refusal, lookup };
}

test('retry V2 : refus natif avant enregistrement et lookup inconnu corrélés conservent la candidate', async t => {
  const { h, recovery } = await unregisteredNativeRefusal(t);
  const result = await h.post('/runs/refusal/job/recover', { ...recovery, phase: 'retry',
    previousPreflightRequestId: recovery.preflightRequestId, preflightRequestId: 'preflight-refusal-next' });
  assert.equal(result.status, 200, JSON.stringify(result));
  assert.equal(result.body.recovery.sessionId, recovery.sessionId);
  assert.equal(result.body.recovery.attempts[0].preflightRequestId, recovery.preflightRequestId);
  assert.match(result.body.recovery.attempts[0].nativeToolHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(h.native.replies, []);
});

for (const kind of ['texte-seul', 'lookup-absent', 'lookup-divergent', 'arguments-divergents', 'appel-supplémentaire', 'troncature', 'refus-non-déterministe']) {
  test('retry V2 refuse la preuve ambiguë : ' + kind, async t => {
    const { h, recovery, refusal, lookup, input } = await unregisteredNativeRefusal(t);
    if (kind === 'texte-seul') refusal.state.metadata.error = false;
    if (kind === 'lookup-absent') h.native.messages[recovery.sessionId].at(-1).parts.pop();
    if (kind === 'lookup-divergent') lookup.state.output = 'approval inconnue';
    if (kind === 'arguments-divergents') refusal.state.metadata.toolCalls[0].input.requestId = 'foreign';
    if (kind === 'appel-supplémentaire') h.native.messages[recovery.sessionId].at(-1).parts.push({ type: 'tool', tool: 'bash', state: { status: 'completed', input: { command: '/usr/bin/true' } } });
    if (kind === 'troncature') refusal.state.metadata.truncated = true;
    if (kind === 'refus-non-déterministe') {
      input.access_id = 'valid-access';
      refusal.state.input.code = `return await tools["cgpt-validation"].request_validation(${JSON.stringify(input)});`;
      refusal.state.metadata.toolCalls[0].input = input;
    }
    const before = (await h.get('/runs/refusal/job')).body;
    const result = await h.post('/runs/refusal/job/recover', { ...recovery, phase: 'retry',
      previousPreflightRequestId: recovery.preflightRequestId, preflightRequestId: 'preflight-refusal-next' });
    assert.equal(result.status, 409, JSON.stringify(result));
    assert.deepEqual((await h.get('/runs/refusal/job')).body.recovery, before.recovery);
    assert.deepEqual(h.native.replies, []);
  });
}


for (const type of ['session.execution.started', 'session.execution.succeeded', 'permission.asked']) {
  test('un événement SSE V2 data invalide la cohorte : ' + type, async t => {
    const h = await setup(t); await h.reserve('a');
    const g = (await h.post('/coordination/global/request', { cause: 'GLOBAL_PAUSE', scope: 'all',
      transactionId: 'pause-v2', authorization: 'explicit pause all', evidence: ['authorized'] })).body;
    let fired = false; h.native.onRequest = async path => {
      if (path !== '/session/status' || fired) return; fired = true;
      h.native.emit({ type, location: { directory: h.directory }, data: { sessionID: 'ses_a' } }); await delay(50);
    };
    const result = await h.post('/coordination/global/confirm', { ...g, evidence: ['quiescence'] });
    assert.equal(result.body.error, 'native-observation-changed');
    assert.deepEqual(h.native.replies, []);
  });
}

async function directNativeRefusal(t) {
  const value = await unregisteredNativeRefusal(t);
  const { h, recovery, refusal, lookup } = value;
  const stamp = Date.now();
  const direct = (part, index) => ({ type: 'tool', id: 'call_direct' + index,
    name: part === refusal ? 'cgpt-validation_request_validation' : 'cgpt-validation_get_approval',
    executed: false, native: { itemId: 'fc_direct' + index }, time: { created: stamp, ran: stamp + 1, completed: stamp + 2 },
    state: { status: 'error', input: structuredClone(part.state.metadata.toolCalls[0].input),
      error: { type: 'tool.execution', message: part.state.output } } });
  const parts = [direct(refusal, 1), direct(lookup, 2)];
  const signatureHistory = h.native.messages[recovery.sessionId].slice(0, 1);
  h.native.messages[recovery.sessionId] = [...signatureHistory,
    { nativeV2: { id: 'msg_direct', type: 'assistant', content: parts } }];
  return { ...value, parts };
}

test('retry MCP direct : refus et lookup natifs conservent la candidate, prévol neuf sous once puis complete', async t => {
  const { h, recovery } = await directNativeRefusal(t);
  const result = await h.post('/runs/refusal/job/recover', { ...recovery, phase: 'retry',
    previousPreflightRequestId: recovery.preflightRequestId, preflightRequestId: 'preflight-direct-next' });
  assert.equal(result.status, 200, JSON.stringify(result));
  assert.equal(result.body.recovery.sessionId, recovery.sessionId);
  assert.equal(result.body.recovery.attempts[0].nativeToolCount, 3);
  assert.deepEqual(h.native.replies, []);
  const run = (await h.get('/runs')).body.runs.find(r => r.runId === 'refusal');
  const { approval, access } = await h.approvedAccess({ ...run, sessionId: recovery.sessionId }, 'preflight-direct-next');
  await h.execute(approval); await h.completeTool(approval);
  const messages = h.native.messages[recovery.sessionId], command = messages.at(-1).parts[0];
  const submitted = messages.find(message => message.parts?.[0]?.state?.input?.requestId === approval.requestId).parts[0];
  submitted.state = { ...submitted.state, status: 'completed', output: JSON.stringify({ ...approval, status: 'APPROVED' }),
    time: { start: command.state.time.start - 2, end: command.state.time.start - 1 } };
  messages.push({ parts: [{ type: 'tool', tool: 'cgpt-validation_broker_readiness', state: { status: 'completed',
    input: {}, output: JSON.stringify({ status: 'READY', pending_count: 0 }),
    time: { start: command.state.time.end + 1, end: command.state.time.end + 2 } } }] });
  assert.equal((await h.releaseOperation(run, approval, access)).status, 200);
  const done = await h.post('/runs/refusal/job/recover', { ...recovery, preflightRequestId: 'preflight-direct-next', phase: 'complete' });
  assert.equal(done.status, 200, JSON.stringify(done));
  assert.equal(done.body.sessionId, recovery.sessionId); assert.equal(done.body.recovery, null);
  assert.equal(h.native.replies.length, 1);
});

for (const kind of ['type-libre', 'item-divergent', 'temps-absent', 'temps-inverse', 'execute-vrai', 'session-divergente',
  'generation-divergente', 'lookup-absent', 'lookup-faux', 'effet-supplementaire', 'marqueur-fabrique', 'refus-non-deterministe']) {
  test('retry MCP direct reste fermé : ' + kind, async t => {
    const { h, recovery, parts } = await directNativeRefusal(t);
    if (kind === 'type-libre') parts[0].state.error = parts[0].state.error.message;
    if (kind === 'item-divergent') parts[0].native.itemId = 'fc_other';
    if (kind === 'temps-absent') delete parts[0].time.ran;
    if (kind === 'temps-inverse') parts[0].time.completed = parts[0].time.created - 1;
    if (kind === 'execute-vrai') parts[0].executed = true;
    if (kind === 'session-divergente') parts[0].state.input.session_id = 'ses_other';
    if (kind === 'generation-divergente') parts[0].state.input.reservation_version++;
    if (kind === 'lookup-absent') parts.pop();
    if (kind === 'lookup-faux') parts[1].state.error.message = 'approval inconnue';
    if (kind === 'effet-supplementaire') parts.push({ type: 'tool', id: 'call_shell', name: 'shell', executed: true,
      time: { created: 1, ran: 2, completed: 3 }, state: { status: 'completed', input: { command: '/usr/bin/true' }, metadata: { exit: 0 } } });
    if (kind === 'marqueur-fabrique') {
      delete parts[0].native; parts[0].state.metadata = { cabDirectMcpError: { itemId: 'fc_forged', envelopeHash: '0'.repeat(64) } };
    }
    if (kind === 'refus-non-deterministe') parts[0].state.input.access_id = 'valid-access';
    const before = (await h.get('/runs/refusal/job')).body;
    const result = await h.post('/runs/refusal/job/recover', { ...recovery, phase: 'retry',
      previousPreflightRequestId: recovery.preflightRequestId, preflightRequestId: 'preflight-direct-next' });
    assert.equal(result.status, 409, JSON.stringify(result));
    assert.deepEqual((await h.get('/runs/refusal/job')).body.recovery, before.recovery);
    assert.deepEqual(h.native.replies, []);
  });
}

test('notification stale avant admission : chaque tentative locale est comptée une fois pour son RUN sans décision', async t => {
  const h = await setup(t); const a = await h.reserve('a'); await h.reserve('b');
  const stale = h.approval(a, 'diagnostic-stale', { [a.resources[0].key]: 1 });
  for (let attempt = 1; attempt <= 3; attempt++) {
    const refused = await h.post('/validation/resource-request', { approval: stale });
    assert.equal(refused.status, 409); assert.equal(refused.body.error, 'resource-revision-stale');
    const stats = (await h.get('/runs/a/statistics')).body.contexts[0];
    assert.equal(stats.httpFailures['resource-revision-stale'], attempt);
    assert.equal(stats.decisions.pending, 0); assert.equal(stats.decisions.rejected, 0);
    assert.equal(stats.decisions.approved, 0); assert.equal(stats.decisions.once, 0);
    const status = (await h.get('/runs/a/status')).body;
    assert.equal(status.undecidedValidationCount, 0); assert.equal(status.activeValidationCount, 0);
  }
  assert.equal((await h.get('/runs/b/statistics')).body.contexts[0].httpFailures['resource-revision-stale'], undefined);
  const registry = (await h.get('/runs')).body;
  assert.equal(registry.requestOwners[stale.requestId], undefined);
  assert.equal(registry.coordination.operations[stale.operation_id], undefined);
  assert.deepEqual(h.native.replies, []);
  const valid = h.approval(a, 'diagnostic-valid');
  assert.equal((await h.post('/validation/resource-request', { approval: valid })).status, 202);
  assert.equal((await h.get('/runs/a/statistics')).body.contexts[0].httpFailures['resource-revision-stale'], 3);
  assert.deepEqual(h.native.replies, []);
});



async function unusedHttpPayload(h, run, lease) {
  const current = (await h.get('/runs/'+run.runId+'/test-resources')).body.reservations.find((r)=>r.transactionId===lease.transactionId);
  const all=(await h.get('/runs')).body.coordination.operations;
  const ops=Object.values(all).filter((op)=>op.runId===run.runId && op.contextId===run.contextId &&
    (op.testReservationId===lease.transactionId || Date.parse(op.preparedAt)>=Date.parse(current.grantedAt)));
  const messages=await h.nativeClient.messages(run.sessionId,h.directory);
  return {version:run.version,transactionId:lease.transactionId,token:lease.token,fencing:lease.fencing,
    contextId:run.contextId,sessionId:run.sessionId,boundaryDigest:current.unusedReleaseBoundary,
    developerAuthorization:'autorisation humaine ciblée de cette réservation sans effet',evidence:['mandats et historique natif examinés'],
    attestation:{noEnvironmentMutation:true,noMutatingMandate:true,operations:ops.map((op)=>
      ({operationId:op.operationId,classification:op.state==='CANCELLED'?'cancelled-without-execution':'read-only-no-effect'}))},
    nativeProof:{messageCount:messages.length,toolCount:messages.flatMap(m=>m.parts.filter(p=>p.type==='tool')).length,
      historyHash:proofHash(messages),coverage:'complete-native-transcript',operationClassifications:ops.map((op)=>({operationId:op.operationId,
        classification:op.state==='CANCELLED'?'cancelled-without-execution':'read-only-no-effect'}))}};
}
async function unusedHttpLease(h, run, transactionId='unused-http') {
  const result=await h.post('/runs/'+run.runId+'/test-resources/acquire',{version:run.version,transactionId,
    resources:run.resources.filter(r=>r.key.startsWith('lxc:')),evidence:['instance canonique examinée']});
  assert.equal(result.status,200,JSON.stringify(result)); return result.body;
}

test('release-unused HTTP : frontière sans opération, reçu exact, FIFO et extend débloqué sans effet natif',async(t)=>{
  const h=await setup(t);const resources=[{key:'lxc:host-a/101',mode:'write'}];
  const a=await h.reserve('a',{resources});const b=await h.reserve('b',{resources});const lease=await unusedHttpLease(h,a);
  const waiting=await h.post('/runs/b/test-resources/acquire',{version:b.version,transactionId:'wait-b',resources,evidence:['même instance']});
  assert.equal(waiting.status,202);
  const extension={version:a.version,resources:[{key:'file:independent.py',mode:'write'}]};
  assert.equal((await h.post('/runs/a/extend',extension)).body.error,'run-accesses-unresolved');
  const p=await unusedHttpPayload(h,a,lease);const replies=h.native.replies.length;
  const result=await h.post('/runs/a/test-resources/release-unused',p);
  assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.unusedReleaseReceipt.mode,'unused-no-effect');
  assert.equal((await h.get('/runs/a/test-resources')).body.reservations[0].token,undefined);
  assert.equal((await h.get('/runs')).body.coordination.testReservations[lease.transactionId].token,undefined);
  assert.equal((await h.get('/runs/b/test-resources')).body.reservations[0].state,'HELD');
  assert.deepEqual((await h.post('/runs/a/test-resources/release-unused',p)).body,result.body);
  assert.equal((await h.post('/runs/a/test-resources/release-unused',{...p,evidence:['différent']})).status,409);
  assert.equal((await h.post('/runs/a/test-resources/release',p)).status,409);
  assert.equal((await h.post('/runs/a/extend',extension)).status,200);
  assert.equal(h.native.replies.length,replies);
});

test('release-unused lost-token HTTP : preview filtrée puis restitution sans effet dans le change armé',async(t)=>{
  const h=await setup(t);const resources=[{key:'lxc:host-a/101',mode:'write'}];
  const a=await h.reserve('a',{resources});
  const acquisition={version:a.version,transactionId:'lost-token-a',resources,evidence:['instance canonique']};
  const lease=(await h.post('/runs/a/test-resources/acquire',acquisition)).body;
  await h.stop();await h.start();
  const preview=await h.get('/runs/a/test-resources/release-unused-preview?transactionId='+lease.transactionId);
  assert.equal(preview.status,200,JSON.stringify(preview));
  assert.equal(preview.body.state,'HELD');assert.equal(preview.body.reconciliationRequired,true);
  assert.equal(preview.body.approvedChangeScope,true);assert.equal(preview.body.eligibleForLostTokenRelease,true);
  assert.ok(!JSON.stringify(preview.body).includes(lease.token));
  const payload={version:preview.body.version,transactionId:lease.transactionId,recoveryMode:'validated-change-unused',
    fencing:preview.body.fencing,contextId:preview.body.contextId,sessionId:preview.body.sessionId,
    boundaryDigest:preview.body.boundaryDigest,nativeProof:preview.body.nativeProof,
    evidence:['bail restauré relu sans effet natif'],attestation:{noEnvironmentMutation:true,noMutatingMandate:true,
      operations:preview.body.operations.map(op=>({operationId:op.operationId,classification:op.classification}))}};
  const denied=await h.post('/runs/a/test-resources/release-unused-lost-token',{...payload,attestation:{...payload.attestation,noEnvironmentMutation:false}});
  assert.notEqual(denied.status,200);assert.equal((await h.get('/runs/a/test-resources')).body.reservations[0].state,'HELD');
  const released=await h.post('/runs/a/test-resources/release-unused-lost-token',payload);
  assert.equal(released.status,200,JSON.stringify(released));assert.equal(released.body.state,'RELEASED');
  assert.equal(released.body.token,undefined);assert.equal(released.body.unusedReleaseReceipt.mode,'unused-no-effect-lost-token');
  assert.ok(!JSON.stringify(released.body).includes(lease.token));
  assert.equal((await h.get('/runs/a/test-resources')).body.reservations[0].token,undefined);
  assert.equal(h.native.replies.length,0);
  assert.deepEqual((await h.post('/runs/a/test-resources/release-unused-lost-token',payload)).body,released.body);
});

test('release-unused lost-token HTTP : validation rejetée et wrappers CAB complets ne bloquent pas un bail inutilisé',async(t)=>{
  const h=await setup(t);const resources=[{key:'lxc:host-a/104',mode:'write'}];
  const a=await h.reserve('a',{resources});
  const lease=(await h.post('/runs/a/test-resources/acquire',{version:a.version,transactionId:'lost-token-rejected-a',
    resources,evidence:['instance canonique']})).body;
  const approval=h.approval(a,'rejected-after-lease');
  const request=await h.post('/runs/a/validation/request',{approval});assert.equal(request.status,202,JSON.stringify(request));
  const reject=await h.post('/runs/a/decision/'+approval.requestId,{decision:'rejected'});
  assert.equal(reject.status,201,JSON.stringify(reject));
  const requestPart=h.native.messages[a.sessionId].flatMap(message=>message.parts||[])
    .find(part=>part.tool==='cgpt-validation_request_validation');
  requestPart.state.status='completed';requestPart.state.time={start:Date.now()-5,end:Date.now()-4};
  assert.ok((await h.nativeClient.messages(a.sessionId,h.directory)).length>0,'history after rejected request');
  h.native.messages[a.sessionId].push({info:{id:'msg-native-observations',sessionID:a.sessionId,role:'assistant',
    time:{created:Date.now()}},parts:[
    {type:'tool',tool:'cgpt-validation_reject',state:{status:'completed',input:{requestId:approval.requestId},
      time:{start:Date.now()-3,end:Date.now()-2}}},
  ]});
  assert.ok((await h.nativeClient.messages(a.sessionId,h.directory)).length>0,'history after direct rejection');
  h.native.messages[a.sessionId].push({info:{id:'msg-native-code-observations',sessionID:a.sessionId,role:'assistant',
    time:{created:Date.now()}},parts:[
    {type:'tool',id:'call-observation-batch',callID:'call-observation-batch',tool:'execute',executed:false,
      state:{status:'completed',input:{code:'return await Promise.all([tools["cgpt-validation"].list_pending({}),tools["cgpt-validation"].broker_readiness({})]);'},
        time:{start:Date.now()-2,end:Date.now()-1},metadata:{truncated:false,toolCalls:[
          {tool:'cgpt-validation.list_pending',status:'completed',input:{}},
          {tool:'cgpt-validation.broker_readiness',status:'completed',input:{}}]}}}
  ]});
  assert.ok((await h.nativeClient.messages(a.sessionId,h.directory)).length>0);
  await h.stop();await h.start();
  const preview=await h.get('/runs/a/test-resources/release-unused-preview?transactionId='+lease.transactionId);
  assert.equal(preview.status,200,JSON.stringify(preview));
  assert.equal(preview.body.blockerCode,null);
  assert.equal(preview.body.eligibleForLostTokenRelease,true);
  assert.equal(preview.body.operations.length,1);
  assert.equal(preview.body.operations[0].classification,'rejected-validation-no-native-effect');
  const payload={version:preview.body.version,transactionId:lease.transactionId,recoveryMode:'validated-change-unused',
    fencing:preview.body.fencing,contextId:preview.body.contextId,sessionId:preview.body.sessionId,
    boundaryDigest:preview.body.boundaryDigest,nativeProof:preview.body.nativeProof,evidence:['bail sans effet'],
    attestation:{noEnvironmentMutation:true,noMutatingMandate:true,operations:preview.body.operations.map(op=>
      ({operationId:op.operationId,classification:op.classification}))}};
  const released=await h.post('/runs/a/test-resources/release-unused-lost-token',payload);
  assert.equal(released.status,200,JSON.stringify(released));assert.equal(released.body.state,'RELEASED');
  assert.equal(released.body.token,undefined);assert.equal(released.body.unusedReleaseReceipt.mode,'unused-no-effect-lost-token');
});

test('release-unused lost-token HTTP : registre durable prouve un bail inutilisé après compaction',async(t)=>{
  const h=await setup(t);const resources=[{key:'lxc:host-a/106',mode:'write'}];
  const a=await h.reserve('a',{resources});
  const lease=(await h.post('/runs/a/test-resources/acquire',{version:a.version,transactionId:'lost-token-compacted-a',
    resources,evidence:['instance canonique']})).body;
  const approval=h.approval(a,'rejected-before-compaction');
  assert.equal((await h.post('/runs/a/validation/request',{approval})).status,202);
  assert.equal((await h.post('/runs/a/decision/'+approval.requestId,{decision:'rejected'})).status,201);
  const requestPart=h.native.messages[a.sessionId].flatMap(message=>message.parts||[])
    .find(part=>part.tool==='cgpt-validation_request_validation');
  requestPart.state.status='completed';requestPart.state.time={start:Date.now()-5,end:Date.now()-4};
  h.native.messages[a.sessionId].push({info:{id:'msg-rejection-before-compaction',sessionID:a.sessionId,role:'assistant',
    time:{created:Date.now()}},parts:[{type:'tool',tool:'cgpt-validation_reject',state:{status:'completed',
      input:{approval_id:approval.approval_id},time:{start:Date.now()-3,end:Date.now()-2}}}]});
  h.native.messages[a.sessionId].push({nativeV2:{id:'msg-compaction-after-lease',type:'compaction',
    time:{created:Date.now()},metadata:{},content:[]}});
  await h.stop();await h.start();
  const preview=await h.get('/runs/a/test-resources/release-unused-preview?transactionId='+lease.transactionId);
  assert.equal(preview.status,200,JSON.stringify(preview));assert.equal(preview.body.blockerCode,null);
  assert.equal(preview.body.eligibleForLostTokenRelease,true);
  assert.equal(preview.body.nativeProof.coverage,'operation-ledger-after-compaction');
  const payload={version:preview.body.version,transactionId:lease.transactionId,recoveryMode:'validated-change-unused',
    fencing:preview.body.fencing,contextId:preview.body.contextId,sessionId:preview.body.sessionId,
    boundaryDigest:preview.body.boundaryDigest,nativeProof:preview.body.nativeProof,evidence:['bail sans effet'],
    attestation:{noEnvironmentMutation:true,noMutatingMandate:true,operations:preview.body.operations.map(op=>
      ({operationId:op.operationId,classification:op.classification}))}};
  const result=await h.post('/runs/a/test-resources/release-unused-lost-token',payload);
  assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.state,'RELEASED');
  assert.equal(result.body.token,undefined);assert.equal(result.body.unusedReleaseReceipt.nativeProof.coverage,
    'operation-ledger-after-compaction');
});

test('release-unused lost-token HTTP : compaction ne masque jamais une opération native commencée',async(t)=>{
  const h=await setup(t);const resources=[{key:'lxc:host-a/107',mode:'write'}];
  const a=await h.reserve('a',{resources});
  const lease=(await h.post('/runs/a/test-resources/acquire',{version:a.version,transactionId:'used-token-compacted-a',
    resources,evidence:['instance canonique']})).body;
  const op=await h.approvedAccess(a,'command-under-test');await h.execute(op.approval);await h.completeTool(op.approval,0);
  assert.equal((await h.releaseOperation(a,op.approval,op.access)).status,200);
  h.native.messages[a.sessionId].push({nativeV2:{id:'msg-compaction-after-command',type:'compaction',
    time:{created:Date.now()},metadata:{},content:[]}});
  await h.stop();await h.start();
  const preview=await h.get('/runs/a/test-resources/release-unused-preview?transactionId='+lease.transactionId);
  assert.equal(preview.status,200,JSON.stringify(preview));assert.equal(preview.body.eligibleForLostTokenRelease,false);
  assert.equal(preview.body.nativeProof,null);assert.equal(preview.body.blockerCode,'test-unused-history-incomplete');
  assert.equal((await h.get('/runs/a/test-resources')).body.reservations.find(x=>x.transactionId===lease.transactionId).state,'HELD');
});

test('release-unused lost-token HTTP refuse sans job armé dans le change',async(t)=>{
  const h=await setup(t);const resources=[{key:'lxc:host-a/102',mode:'write'}];
  const candidate={...h.candidate('a'),resources,exclusiveResources:[]};
  const reserved=await h.post('/runs/reserve',candidate);assert.equal(reserved.status,201,JSON.stringify(reserved));
  const a=reserved.body;
  const acquisition={version:a.version,transactionId:'lost-token-unarmed',resources,evidence:['instance canonique']};
  const lease=(await h.post('/runs/a/test-resources/acquire',acquisition)).body;
  await h.stop();await h.start();
  const preview=await h.get('/runs/a/test-resources/release-unused-preview?transactionId='+lease.transactionId);
  assert.equal(preview.status,200,JSON.stringify(preview));assert.equal(preview.body.approvedChangeScope,false);
  const payload={version:preview.body.version,transactionId:lease.transactionId,recoveryMode:'validated-change-unused',
    fencing:preview.body.fencing,contextId:preview.body.contextId,sessionId:preview.body.sessionId,
    boundaryDigest:preview.body.boundaryDigest,nativeProof:preview.body.nativeProof,evidence:['bail restauré'],
    attestation:{noEnvironmentMutation:true,noMutatingMandate:true,operations:[]}};
  const result=await h.post('/runs/a/test-resources/release-unused-lost-token',payload);
  assert.equal(result.status,409);assert.equal(result.body.error,'test-unused-approved-change-required');
  assert.equal((await h.get('/runs/a/test-resources')).body.reservations[0].state,'HELD');
});

test('release-unused lost-token HTTP refuse une preview stale et une session native active',async(t)=>{
  const h=await setup(t);const resources=[{key:'lxc:host-a/103',mode:'write'}];
  const a=await h.reserve('a',{resources});
  const acquisition={version:a.version,transactionId:'lost-token-stale',resources,evidence:['instance canonique']};
  const lease=(await h.post('/runs/a/test-resources/acquire',acquisition)).body;
  await h.stop();await h.start();
  const preview=await h.get('/runs/a/test-resources/release-unused-preview?transactionId='+lease.transactionId);
  assert.equal(preview.status,200,JSON.stringify(preview));
  const payload={version:preview.body.version,transactionId:lease.transactionId,recoveryMode:'validated-change-unused',
    fencing:preview.body.fencing,contextId:preview.body.contextId,sessionId:preview.body.sessionId,
    boundaryDigest:preview.body.boundaryDigest,nativeProof:preview.body.nativeProof,evidence:['bail restauré'],
    attestation:{noEnvironmentMutation:true,noMutatingMandate:true,operations:[]}};
  const stale=await h.post('/runs/a/test-resources/release-unused-lost-token',{...payload,boundaryDigest:'0'.repeat(64)});
  assert.equal(stale.status,409);assert.equal(stale.body.error,'test-unused-boundary-stale');
  h.native.busy[a.sessionId]={type:'busy'};
  const active=await h.post('/runs/a/test-resources/release-unused-lost-token',payload);
  assert.equal(active.status,409);assert.equal(active.body.error,'native-session-not-quiescent');
  assert.equal((await h.get('/runs/a/test-resources')).body.reservations[0].state,'HELD');
});

for(const variant of ['unknown-method','truncated-wrapper'])test('release-unused preview garde HELD un wrapper Code Mode '+variant,async(t)=>{
  const h=await setup(t);const resources=[{key:'lxc:host-a/105',mode:'write'}];
  const a=await h.reserve('a',{resources});
  const lease=(await h.post('/runs/a/test-resources/acquire',{version:a.version,transactionId:'unknown-wrapper-'+variant,
    resources,evidence:['instance canonique']})).body;
  h.native.messages[a.sessionId]=[{info:{id:'msg-unknown-wrapper',sessionID:a.sessionId,role:'assistant',time:{created:Date.now()}},
    parts:[{type:'tool',id:'call-unknown-wrapper',callID:'call-unknown-wrapper',tool:'execute',executed:false,
      state:{status:'completed',input:{code:'return await tools["cgpt-validation"].broker_execute_controlled_remediation({});'},
        time:{start:Date.now()-2,end:Date.now()-1},metadata:{truncated:variant==='truncated-wrapper',toolCalls:[
          {tool:'cgpt-validation.broker_execute_controlled_remediation',status:'completed',input:{}}]}}}]}];
  await h.stop();await h.start();
  const preview=await h.get('/runs/a/test-resources/release-unused-preview?transactionId='+lease.transactionId);
  assert.equal(preview.status,200,JSON.stringify(preview));assert.equal(preview.body.eligibleForLostTokenRelease,false);
  assert.equal(preview.body.nativeProof,null);
  assert.equal(preview.body.blockerCode,variant==='truncated-wrapper'?'test-unused-history-incomplete':'test-unused-native-tool-unreviewable');
  assert.ok(!JSON.stringify(preview.body).includes(lease.token));
  assert.equal((await h.get('/runs/a/test-resources')).body.reservations[0].state,'HELD');
});

test('release-unused HTTP : fin native exit1 relue même COMPLETED et diagnostic non converti en succès',async(t)=>{
  const h=await setup(t);const a=await h.reserve('a',{resources:[{key:'lxc:host-a/101',mode:'write'}]});
  const lease=await unusedHttpLease(h,a);const op=await h.approvedAccess(a,'readonly-diagnostic');
  await h.execute(op.approval);await h.completeTool(op.approval,1);
  assert.equal((await h.releaseOperation(a,op.approval,op.access)).status,200);
  const p=await unusedHttpPayload(h,a,lease);const result=await h.post('/runs/a/test-resources/release-unused',p);
  assert.equal(result.status,200,JSON.stringify(result));
  assert.equal((await h.get('/runs')).body.coordination.operations[op.approval.operation_id].nativeResult.exit,1);
  assert.equal(h.native.replies.length,1); assert.equal(h.native.replies[0].body.response,'once');
});

test('release-unused HTTP : autorisation, attestations, mutation et preuve incomplète refusées sans nouvelle once',async(t)=>{
  const h=await setup(t);const a=await h.reserve('a',{resources:[{key:'lxc:host-a/101',mode:'write'}]});
  const lease=await unusedHttpLease(h,a);const p=await unusedHttpPayload(h,a,lease);
  for(const change of [x=>delete x.developerAuthorization,x=>x.attestation.noMutatingMandate=false,
    x=>x.attestation.noEnvironmentMutation=false,x=>delete x.nativeProof,x=>x.nativeProof.historyHash='0'.repeat(64),
    x=>x.contextId++,x=>x.sessionId='ses_b',x=>x.token='wrong']){
    const q=structuredClone(p);change(q);const result=await h.post('/runs/a/test-resources/release-unused',q);
    assert.equal(result.status,409,JSON.stringify(result));
    assert.equal((await h.get('/runs/a/test-resources')).body.reservations[0].state,'HELD');
  }
  h.native.busy.ses_a={type:'busy'};
  assert.equal((await h.post('/runs/a/test-resources/release-unused',p)).status,409);h.native.busy={};
  h.native.permissions=[{id:'pending',sessionID:a.sessionId,permission:'bash',metadata:{command:'true'}}];
  assert.equal((await h.post('/runs/a/test-resources/release-unused',p)).status,409);h.native.permissions=[];
  assert.equal(h.native.replies.length,0);
});

test('release-unused HTTP : résultat natif déjà enregistré puis altéré ne peut pas être rescellé',async(t)=>{
  const h=await setup(t);const a=await h.reserve('a',{resources:[{key:'lxc:host-a/101',mode:'write'}]});
  const lease=await unusedHttpLease(h,a);const op=await h.approvedAccess(a,'diagnostic-altered');
  await h.execute(op.approval);await h.completeTool(op.approval,1);await h.releaseOperation(a,op.approval,op.access);
  h.native.messages.ses_a.at(-1).parts[0].state.metadata.exit=0;
  const p=await unusedHttpPayload(h,a,lease);const result=await h.post('/runs/a/test-resources/release-unused',p);
  assert.equal(result.body.error,'test-unused-native-completion-divergent');
  assert.equal((await h.get('/runs/a/test-resources')).body.reservations[0].state,'HELD');
});

test('release-unused HTTP : changement du transcript pendant relecture et outil hors CAB bloquent',async(t)=>{
  const h=await setup(t);const a=await h.reserve('a',{resources:[{key:'lxc:host-a/101',mode:'write'}]});
  const lease=await unusedHttpLease(h,a);const p=await unusedHttpPayload(h,a,lease);let reads=0;
  h.native.onRequest=async(path)=>{if(path==='/session/ses_a/message' && ++reads===2)
    h.native.messages.ses_a=[{info:{id:'msg_late',role:'user',time:{created:Date.now()}},parts:[{type:'text',text:'late'}]}];};
  assert.equal((await h.post('/runs/a/test-resources/release-unused',p)).body.error,'test-unused-boundary-stale');
  h.native.onRequest=null;const stamp=Date.now()+1;
  h.native.messages.ses_a.push({info:{id:'msg_untracked',role:'assistant',time:{created:stamp}},parts:[{type:'tool',tool:'bash',callID:'call_untracked',
    state:{status:'completed',input:{command:'/usr/bin/true'},time:{start:stamp,end:stamp+1},metadata:{exit:0}}}]});
  const q=await unusedHttpPayload(h,a,lease);
  assert.equal((await h.post('/runs/a/test-resources/release-unused',q)).body.error,'test-unused-native-tool-unreviewable');
  assert.equal((await h.get('/runs/a/test-resources')).body.reservations[0].state,'HELD');assert.equal(h.native.replies.length,0);
});


test('release-unused HTTP : mandat courant, restauration, compaction et fin absente conservent HELD',async(t)=>{
  const h=await setup(t);const a=await h.reserve('a',{resources:[{key:'lxc:host-a/101',mode:'write'}]});
  const lease=await unusedHttpLease(h,a);let p=await unusedHttpPayload(h,a,lease);
  assert.equal((await h.post('/runs/a/job/progress',{jobId:'job-a',currentCabMandate:'inspection en cours'})).status,202);
  assert.equal((await h.post('/runs/a/test-resources/release-unused',p)).body.error,'run-not-quiescent');
  assert.equal((await h.post('/runs/a/job/progress',{jobId:'job-a',currentCabMandate:''})).status,202);
  const stamp=Date.now()+1;
  h.native.messages.ses_a=[{nativeV2:{id:'msg_compaction',type:'compaction',time:{created:stamp}}}];
  p=await unusedHttpPayload(h,a,lease);
  assert.equal((await h.post('/runs/a/test-resources/release-unused',p)).body.error,'test-unused-history-incomplete');
  h.native.messages.ses_a=[{info:{id:'msg_running',role:'assistant',time:{created:stamp}},parts:[{type:'tool',tool:'read',callID:'call_running',
    state:{status:'running',input:{path:'/test'},time:{start:stamp},metadata:{}}}]}];
  p=await unusedHttpPayload(h,a,lease);
  assert.equal((await h.post('/runs/a/test-resources/release-unused',p)).body.error,'test-unused-history-incomplete');
  h.native.messages.ses_a=[];p=await unusedHttpPayload(h,a,lease);await h.stop();await h.start();
  assert.equal((await h.post('/runs/a/test-resources/release-unused',p)).body.error,'test-reconciliation-required');
  assert.equal((await h.get('/runs/a/test-resources')).body.reservations[0].state,'HELD');
});

test('release-unused HTTP : course de permission et indisponibilité native refusent sans réparation',async(t)=>{
  const h=await setup(t);const a=await h.reserve('a',{resources:[{key:'lxc:host-a/101',mode:'write'}]});
  const lease=await unusedHttpLease(h,a);const p=await unusedHttpPayload(h,a,lease);let reads=0;
  h.native.onRequest=async(path)=>{if(path==='/session/ses_a/message' && ++reads===1)
    h.native.permissions=[{id:'late-native',sessionID:a.sessionId,permission:'bash',metadata:{command:'true'}}];};
  assert.equal((await h.post('/runs/a/test-resources/release-unused',p)).body.error,'native-session-not-quiescent');
  const h2=await setup(t);const b=await h2.reserve('b',{resources:[{key:'lxc:host-b/102',mode:'write'}]});
  const lease2=await unusedHttpLease(h2,b);const p2=await unusedHttpPayload(h2,b,lease2);
  h2.native.onRequest=async(path)=>{if(path==='/session/ses_b/message')h2.native.messages.ses_b=[
    {nativeV2:{id:'msg_bad',type:'assistant',content:'invalid',time:{created:Date.now()}}}];};
  assert.equal((await h2.post('/runs/b/test-resources/release-unused',p2)).body.error,'test-unused-history-unavailable');
  assert.equal((await h.get('/runs/a/test-resources')).body.reservations[0].state,'HELD');
  assert.equal((await h2.get('/runs/b/test-resources')).body.reservations[0].state,'HELD');
  assert.equal(h.native.replies.length,0);assert.equal(h2.native.replies.length,0);
});


test('diagnostic décision HTTP : trois ressources, révision périmée et rejet sans once supplémentaire',async t=>{
 const h=await setup(t);const shared={key:'file:shared.txt',mode:'read'};
 const a=await h.reserve('a',{resources:[shared,{key:'file:config.yaml',mode:'read'},{key:'resource:cli',mode:'read'}]});
 const b=await h.reserve('b',{resources:[{...shared,mode:'write'}]});
 const approval=h.approval(a,'decision-stale');assert.equal((await h.post('/validation/request',{approval})).status,202);
 const writer=await h.approvedAccess(b,'concurrent-writer');await h.execute(writer.approval);await h.completeTool(writer.approval);await h.releaseOperation(b,writer.approval,writer.access);
 const replies=h.native.replies.length;
 assert.equal((await h.get('/runs/a/decision/decision-stale/admission')).body.admission.state,'STABLE');
 const result=await h.post('/runs/a/decision/decision-stale',{decision:'approved'});
 assert.equal(result.status,400);assert.equal(result.body.error,'resource-revision-stale');assert.equal(result.body.decision_recorded,false);
 assert.equal((await h.get('/runs/a/decision/decision-stale')).status,404);
 assert.equal((await h.get('/runs/a/status')).body.undecidedValidationCount,1);assert.equal(h.native.replies.length,replies);
 assert.equal((await h.post('/runs/a/decision/decision-stale',{decision:'rejected'})).status,201);
 assert.equal(h.native.replies.length,replies);
});

test('diagnostic décision HTTP : succès inchangé, doublon explicite et garde native409 préservée',async t=>{
 const h=await setup(t);const a=await h.reserve('a');const approval=h.approval(a,'decision-success');
 await h.post('/validation/request',{approval});
 assert.equal((await h.post('/runs/a/decision/decision-success',{decision:'invalid'})).body.error,'decision-invalid');
 h.native.rules.ses_a=[{permission:'shell',pattern:'*',action:'deny'}];
 const denied=await h.post('/runs/a/decision/decision-success',{decision:'approved'});assert.equal(denied.status,409);assert.equal(denied.body.error,'native-permission-ask-required');
 h.native.rules.ses_a=[{permission:'*',pattern:'*',action:'ask'}];
 assert.equal((await h.post('/runs/a/decision/decision-success',{decision:'approved'})).status,201);
 const first=(await h.get('/runs/a/decision/decision-success')).body;
 const duplicate=await h.post('/runs/a/decision/decision-success',{decision:'rejected'});
 assert.equal(duplicate.status,400);assert.equal(duplicate.body.error,'decision-already-recorded');assert.equal(duplicate.body.decision_recorded,true);
 assert.deepEqual((await h.get('/runs/a/decision/decision-success')).body,first);assert.equal(h.native.replies.length,0);
});

test('diagnostic décision HTTP : révision modifiée pendant la vérification native reste bloquante',async t=>{
 const h=await setup(t);const resource={key:'file:race.txt',mode:'read'};
 const a=await h.reserve('a',{resources:[resource]});const b=await h.reserve('b',{resources:[{...resource,mode:'write'}]});
 const approval=h.approval(a,'decision-race');await h.post('/validation/request',{approval});let changed=false;
 h.native.onRequest=async path=>{if(path==='/session/ses_a'&&!changed){changed=true;const writer=await h.approvedAccess(b,'writer-during-guard');await h.execute(writer.approval);await h.completeTool(writer.approval);await h.releaseOperation(b,writer.approval,writer.access);}};
 const result=await h.post('/runs/a/decision/decision-race',{decision:'approved'});
 assert.equal(result.status,400);assert.equal(result.body.error,'resource-revision-stale');assert.equal(result.body.decision_recorded,false);
 assert.equal((await h.get('/runs/a/decision/decision-race')).status,404);assert.equal(h.native.replies.length,1);
});


test('diagnostic décision HTTP : transition de reminder tardive signalée sans décision',async t=>{
 const h=await setup(t);const a=await h.reserve('a');const approval=h.approval(a,'decision-reminder-race');
 await h.post('/validation/request',{approval});assert.equal((await h.get('/runs/a/decision/'+approval.requestId+'/admission')).body.admission.state,'STABLE');let count=0,release,entered,reminder;
 const parked=new Promise(resolve=>{release=resolve;});const waiting=new Promise(resolve=>{entered=resolve;});
 h.native.onRequest=async path=>{
  if(path!=='/session/ses_a')return;
  if(++count===1){reminder=h.post('/runs/a/validation/reminder',{approval});await waiting;}
  else if(count===2){entered();await parked;}
 };
 let result;
 try{result=await h.post('/runs/a/decision/decision-reminder-race',{decision:'approved'});}
 finally{release();}
 assert.equal(result.status,400);assert.equal(result.body.error,'run-transition-in-flight');assert.equal(result.body.decision_recorded,false);assert.deepEqual(result.body.admission,{state:'BUSY',snapshot_only:true});
 assert.equal((await reminder).status,202);assert.equal((await h.get('/runs/a/decision/decision-reminder-race')).status,404);
 assert.equal(h.native.replies.length,0);
});

test('transition modèle HTTP : choix explicite libre, même job historique et reprise durable',async t=>{
 const h=await setup(t,{codingPolicy:true});const run=await h.reserve('hot');
 h.native.sessions.ses_hot={id:'ses_hot',directory:h.directory,model:{providerID:'provider1',modelID:'model1',variant:'medium'}};
 const paused=await h.post('/runs/hot/suspend',{version:run.version,action:'PAUSE',evidence:['explicit-human-boundary']});assert.equal(paused.status,200,JSON.stringify(paused));
 const before=(await h.get('/runs/hot/job')).body;assert.equal(before.codingModel,undefined);
 const base={transactionId:'hot-switch',developerAuthorization:'human-transition-ref',jobId:before.jobId,sessionId:before.sessionId,runVersion:paused.body.version};
 // Un choix explicite doit fonctionner même sans catalogue PLLM valide.
 writeFileSync(h.native.catalogPath,JSON.stringify({invalid:true}));
 const prepared=await h.post('/runs/hot/job/model-transition',{...base,phase:'prepare',expectedModelHash:before.modelContractHash,
  selection:{model:'provider2/model2',reasoning:'low'}});assert.equal(prepared.status,200,JSON.stringify(prepared));
 assert.equal(prepared.body.transition.before,null);
 const rearm=await h.post('/runs/hot/job/arm',{jobId:before.jobId,sessionId:before.sessionId,directory:h.directory,changeId:before.changeId,criteria:['unrelated']});
 assert.equal(rearm.body.error,'model-transition-pending');
 const stamp=Date.now();h.native.sessions.ses_probe.model={providerID:'provider2',modelID:'model2',variant:'low'};
 h.native.messages.ses_probe=[{info:{id:'msg_hot_user',sessionID:'ses_probe',role:'user',time:{created:stamp}},parts:[{type:'text',text:'probe'}]},
  {info:{id:'msg_hot_reply',sessionID:'ses_probe',role:'assistant',finish:'stop',parentID:'msg_hot_user',providerID:'provider2',modelID:'model2',variant:'low',time:{created:stamp,completed:stamp}},parts:[{type:'text',text:'probe ok'}]}];
 const committed=await h.post('/runs/hot/job/model-transition',{...base,phase:'commit',preflight:{sessionId:'ses_probe',messageId:'msg_hot_reply'}});
 assert.equal(committed.status,200,JSON.stringify(committed));assert.equal(committed.body.codingModel.providerID,'provider2');assert.equal(committed.body.codingModel.reasoning,'low');
 const after=(await h.get('/runs/hot/job')).body;assert.equal(after.jobId,before.jobId);assert.equal(after.sessionId,before.sessionId);
 assert.deepEqual(after.criteria,before.criteria);assert.equal(after.modelTransitionHistory[0].before,null);assert.equal(after.modelTransition,null);
 assert.equal(h.native.replies.length,0);assert.equal((await h.get('/runs/hot/status')).body.coordination.suspension.action,'PAUSE');
 await h.stop();await h.start();assert.deepEqual((await h.get('/runs/hot/job')).body.modelTransitionHistory,after.modelTransitionHistory);
});

test('transition modèle HTTP : sans choix explicite adopte la PLLM actuelle et conserve source prompt antérieure',async t=>{
 const h=await setup(t,{codingPolicy:true});const run=(await h.post('/runs/reserve',h.candidate('hot-auto'))).body;
 h.native.sessions['ses_hot-auto']={id:'ses_hot-auto',directory:h.directory,model:{providerID:'provider1',modelID:'model1',variant:'medium'}};
 const arm=await h.post('/runs/hot-auto/job/arm',{jobId:'job-hot-auto',sessionId:run.sessionId,directory:h.directory,changeId:run.changeId,
  strictCommands:true,criteria:['preserve-known-write'],modelSelectionProtocol:'pllm-auto-v1',modelSelection:{model:'provider1/model1'},
  modelPreflight:{sessionId:'ses_probe',messageId:'msg_response'}});assert.equal(arm.status,201,JSON.stringify(arm));
 const old=arm.body.codingModel;assert.equal(old.source,'prompt');assert.equal(old.mode,null);
 await h.post('/runs/hot-auto/suspend',{version:run.version,action:'PAUSE',evidence:['human-auto-boundary']});
 const catalog=JSON.parse(readFileSync(h.native.catalogPath,'utf8'));catalog.selected_mode='mode2';catalog.models[0].state='Invalide';catalog.models[0].selected=false;catalog.models[1].selected=true;writeFileSync(h.native.catalogPath,JSON.stringify(catalog));
 const before=(await h.get('/runs/hot-auto/job')).body;
 const base={transactionId:'hot-auto-switch',developerAuthorization:'human-auto-ref',jobId:before.jobId,sessionId:before.sessionId,runVersion:run.version};
 const p=await h.post('/runs/hot-auto/job/model-transition',{...base,phase:'prepare',expectedModelHash:before.modelContractHash});assert.equal(p.status,200,JSON.stringify(p));
 assert.equal(p.body.transition.candidate.mode,'mode2');
 const resume=await h.post('/runs/hot-auto/suspend',{version:run.version,action:'RESUME',evidence:['too-early']});assert.equal(resume.body.error,'model-transition-pending');
 const stamp=Date.now();h.native.sessions.ses_probe.model={providerID:'provider2',modelID:'model2',variant:'medium'};
 h.native.messages.ses_probe=[{info:{id:'msg_auto_user',sessionID:'ses_probe',role:'user',time:{created:stamp}},parts:[{type:'text',text:'probe'}]},
  {info:{id:'msg_auto_reply',sessionID:'ses_probe',role:'assistant',finish:'stop',parentID:'msg_auto_user',providerID:'provider2',modelID:'model2',variant:'medium',time:{created:stamp,completed:stamp}},parts:[{type:'text',text:'probe ok'}]}];
 const result=await h.post('/runs/hot-auto/job/model-transition',{...base,phase:'commit',preflight:{sessionId:'ses_probe',messageId:'msg_auto_reply'}});assert.equal(result.status,200,JSON.stringify(result));
 const after=(await h.get('/runs/hot-auto/job')).body;assert.equal(after.codingModel.source,'pllm-automatic');assert.equal(after.codingModel.mode,'mode2');
 assert.deepEqual(after.modelTransitionHistory[0].before,old);assert.deepEqual(after.criteria,before.criteria);assert.equal(h.native.replies.length,0);
});

test('admission observée : BUSY refuse la décision, pair isolé puis même demande STABLE',async t=>{
 const h=await setup(t);const a=await h.reserve('a'),b=await h.reserve('b');
 const approval=h.approval(a,'admission-busy');await h.post('/validation/request',{approval});
 let release,entered;const parked=new Promise(r=>{release=r}),waiting=new Promise(r=>{entered=r});
 h.native.onRequest=async path=>{if(path==='/session/ses_a'){entered();await parked;}};
 const reminder=h.post('/runs/a/validation/reminder',{approval});await waiting;
 try{
  const observed=await h.get('/runs/a/decision/'+approval.requestId+'/admission');
  assert.equal(observed.status,200);assert.deepEqual(observed.body.admission,{state:'BUSY',snapshot_only:true});
  assert.equal(observed.body.owner_registered,true);assert.equal(observed.body.validation_registered,true);assert.equal(observed.body.decision_recorded,false);
  assert.equal((await h.get('/runs/a/status')).body.admission.state,'BUSY');
  assert.equal((await h.get('/runs/b/status')).body.admission.state,'STABLE');
  const refused=await h.post('/runs/a/decision/'+approval.requestId,{decision:'approved'});
  assert.equal(refused.status,409);assert.equal(refused.body.error,'run-transition-in-flight');assert.equal(refused.body.decision_recorded,false);assert.equal(refused.body.admission.state,'BUSY');
  assert.equal((await h.get('/runs/a/decision/'+approval.requestId)).status,404);assert.equal(h.native.replies.length,0);
  const unknown=await h.post('/runs/a/decision/unknown-request',{decision:'approved'});assert.equal(unknown.status,409);assert.equal(unknown.body.decision_recorded,null);
  const peer=h.approval(b,'admission-peer');assert.equal((await h.post('/validation/request',{approval:peer})).status,202);
  assert.equal((await h.post('/runs/b/decision/'+peer.requestId,{decision:'approved'})).status,201);
 }finally{release();}
 assert.equal((await reminder).status,202);h.native.onRequest=undefined;
 const stable=await h.get('/runs/a/decision/'+approval.requestId+'/admission');assert.equal(stable.body.admission.state,'STABLE');assert.equal(stable.body.decision_recorded,false);
 assert.equal((await h.post('/runs/a/decision/'+approval.requestId,{decision:'approved'})).status,201);
 const decided=await h.get('/runs/a/decision/'+approval.requestId+'/admission');assert.equal(decided.body.decision_recorded,true);
 const before=(await h.get('/runs/a/decision/'+approval.requestId)).body;
 assert.equal((await h.post('/runs/a/decision/'+approval.requestId,{decision:'rejected'})).status,400);
 assert.deepEqual((await h.get('/runs/a/decision/'+approval.requestId)).body,before);assert.equal(h.native.replies.length,0);
});

test('admission ciblée : inconnue explicite, propriétaire étranger refusé et lectures sans mutation',async t=>{
 const h=await setup(t);const a=await h.reserve('a');await h.reserve('b');
 const unknown=await h.get('/runs/a/decision/unknown/admission');assert.equal(unknown.status,404);assert.equal(unknown.body.owner_registered,false);
 assert.equal(unknown.body.validation_registered,false);assert.equal(unknown.body.decision_recorded,null);assert.deepEqual(unknown.body.admission,{state:'STABLE',snapshot_only:true});
 const approval=h.approval(a,'admission-owned');await h.post('/validation/request',{approval});
 const before=(await h.get('/runs')).body;
 assert.equal((await h.get('/runs/a/decision/'+approval.requestId+'/admission')).status,200);
 const foreign=await h.get('/runs/b/decision/'+approval.requestId+'/admission');assert.equal(foreign.status,409);assert.equal(foreign.body.error,'decision-run-divergent');
 assert.equal(foreign.body.decision_recorded,undefined);assert.deepEqual((await h.get('/runs')).body,before);assert.equal(h.native.replies.length,0);
});

test('porte-mandat HTTP : staging sans décision/accès, substitution et livraison anticipée refusées',async t=>{
 const h=await setup(t);const a=await h.reserve('a');await h.reserve('b');
 const payload='printf "reviewed\\n"\n';const input={stageId:'stage-http',jobId:'job-a',sessionId:a.sessionId,reservationVersion:a.version,requestId:'request-carrier',approvalId:'approval-carrier',operationId:'op-carrier',payload,payloadSha256:createHash('sha256').update(payload).digest('hex')};
 const before=(await h.get('/runs')).body;const created=await h.post('/runs/a/shell-stage',input);assert.equal(created.status,201,JSON.stringify(created));
 assert.equal(created.body.payload,undefined);assert.ok(created.body.command.includes(input.payloadSha256));assert.deepEqual((await h.get('/runs')).body,before);
 assert.equal((await h.get('/runs/a/shell-stage/stage-http/payload')).status,409);assert.equal((await h.get('/runs/b/shell-stage/stage-http')).status,409);
 assert.deepEqual((await h.post('/runs/a/shell-stage',Object.fromEntries(Object.entries(input).reverse()))).body,created.body);
 const changed={...input,payload:payload+'#different',payloadSha256:createHash('sha256').update(payload+'#different').digest('hex')};
 assert.equal((await h.post('/runs/a/shell-stage',changed)).body.error,'shell-stage-identity-divergent');
 assert.equal((await h.post('/runs/a/shell-stage',{...input,jobId:'foreign'})).status,409);assert.equal(h.native.replies.length,0);
 h.native.rules[a.sessionId]=[{permission:'shell',pattern:'*',action:'allow'}];assert.equal((await h.post('/runs/a/shell-stage',input)).body.error,'native-permission-ask-required');h.native.rules[a.sessionId]=[{permission:'*',pattern:'*',action:'ask'}];
 await h.stop();await h.start();assert.deepEqual((await h.get('/runs/a/shell-stage/stage-http')).body,created.body);
 assert.equal((await h.get('/runs/a/shell-stage/stage-http/payload')).status,409);
});


test('projection moniteur HTTP : navigation exacte sans registre privé ni mutation',async t=>{
 const h=await setup(t);await h.reserve('a');await h.reserve('b');const before=(await h.get('/runs')).body;
 const {status,body}=await h.get('/monitor/runs');assert.equal(status,200);assert.equal(body.snapshot_only,true);assert.equal(body.totalRuns,2);assert.equal(body.truncated,false);
 for(const run of before.runs){const row=body.runs.find(r=>r.runId===run.runId);for(const k of ['runId','changeId','sessionId','version','state','phase'])assert.equal(row[k],run[k]??null);}
 assert.equal(body.coordination,undefined);assert.equal(body.requestOwners,undefined);assert.equal(body.history,undefined);assert.deepEqual((await h.get('/runs')).body,before);assert.equal(h.native.replies.length,0);
});

test('GET opérations par RUN retourne une projection sûre sans bearer ni entrée étrangère',async t=>{
 const h=await setup(t);const a=await h.reserve('operations-a');await h.reserve('operations-b');
 const {approval,access}=await h.approvedAccess(a,'snapshot-operation');
 const first=await h.get('/runs/operations-a/operations');assert.equal(first.status,200);
 assert.equal(first.body.snapshot_only,true);assert.equal(first.body.totalOperations,1);assert.equal(first.body.truncated,false);
 assert.equal(first.body.operations[0].operationId,approval.operation_id);assert.equal(first.body.operations[0].state,'PREPARED');
 assert.equal(first.body.operations[0].native,null);assert.equal(first.body.operations[0].access.state,'HELD');
 assert.ok(!JSON.stringify(first.body).includes(access.token));assert.ok(!JSON.stringify(first.body).includes('isolated command'));
 const filtered=await h.get('/runs/operations-a/operations?operationId='+encodeURIComponent(approval.operation_id));
 assert.equal(filtered.status,200);assert.equal(filtered.body.operations.length,1);
 const foreign=await h.get('/runs/operations-b/operations?operationId='+encodeURIComponent(approval.operation_id));
 assert.equal(foreign.status,200);assert.equal(foreign.body.operations.length,0);
 assert.equal((await h.get('/runs/operations-a/operations?operationId=../foreign')).status,400);
});

function appendNativeRejectedTranscript(h, approval, { status='REJECTED', reviewer='CGPT', extraTool=null,
 rejectApprovalId=approval.approval_id, rejectRequestId=approval.requestId,
 lookupApprovalId=approval.approval_id, resultOverrides={}, duplicateReject=false } = {}) {
 const requestPart=h.native.messages[approval.session_id].flatMap(message=>message.parts||[])
   .find(part=>part.tool==='cgpt-validation_request_validation'&&part.state?.input?.requestId===approval.requestId);
 assert.ok(requestPart,'native request exists');requestPart.state.status='completed';
 requestPart.state.output=JSON.stringify({status:'PENDING',requestId:approval.requestId,approval_id:approval.approval_id});
 const now=Date.now();const result={...structuredClone(approval),...resultOverrides,status,reviewer};
 const parts=[
  {type:'tool',tool:'cgpt-validation_reject',state:{status:'completed',input:{approval_id:rejectApprovalId,requestId:rejectRequestId},output:'{}',time:{start:now-4,end:now-3}}},
  ...(duplicateReject?[{type:'tool',tool:'cgpt-validation_reject',state:{status:'completed',input:{approval_id:approval.approval_id,requestId:approval.requestId},output:'{}',time:{start:now-3,end:now-2}}}]:[]),
  {type:'tool',tool:'cgpt-validation_get_approval',state:{status:'completed',input:{approval_id:lookupApprovalId},output:JSON.stringify(result),time:{start:now-2,end:now-1}}},
 ];
 if(extraTool)parts.push(extraTool);
 h.native.messages[approval.session_id].push({parts});
}

function appendNativeCancelledTranscript(h, approval, { status='CANCELLED', cancelledBy='OC',
  resultOverrides={}, lookupApprovalId=approval.approval_id, extraTool=null } = {}) {
 const requestPart=h.native.messages[approval.session_id].flatMap(message=>message.parts||[])
   .find(part=>part.tool==='cgpt-validation_request_validation'&&part.state?.input?.requestId===approval.requestId);
 assert.ok(requestPart,'native request exists');requestPart.state.status='completed';
 requestPart.state.output=JSON.stringify({requestId:approval.requestId,approval_id:approval.approval_id,status:'PENDING'});
 const result={...structuredClone(approval),status,cancelled_by:cancelledBy,...resultOverrides};
 h.native.messages[approval.session_id].push({parts:[
  {type:'tool',tool:'cgpt-validation_get_approval',state:{status:'completed',input:{approval_id:lookupApprovalId},
   output:JSON.stringify(result),time:{start:Date.now()-2,end:Date.now()-1}}},
  ...(extraTool?[extraTool]:[]),
 ]});
}

function wrapNativeRequestValidationInCodeMode(h,approval) {
 const messages=h.native.messages[approval.session_id];let replaced=0;
 for(const message of messages){
  if(!Array.isArray(message.parts))continue;
  message.parts=message.parts.map(part=>{
   if(part?.tool!=='cgpt-validation_request_validation'||part.state?.input?.requestId!==approval.requestId)return part;
   replaced++;
   return {type:'tool',id:'execute-'+approval.requestId,callID:'call-execute-'+approval.requestId,
    tool:'execute',executed:false,state:{status:'completed',input:{code:'const payload = runtimeInput; return await tools["cgpt-validation"].request_validation(payload);'},
     output:JSON.stringify({...structuredClone(approval),status:'PENDING'}),
     time:{start:Date.now()-3,end:Date.now()-2},metadata:{truncated:false,toolCalls:[
      {tool:'cgpt-validation.request_validation',status:'completed',input:structuredClone(approval)},
     ]}}};
  });
 }
 assert.equal(replaced,1,'exact native request is represented by one Code Mode wrapper');
}

function appendNativeCodeModeCancelledTranscript(h,approval,{variant}={}) {
 const command='const r = await search({query: "cancel_approval", namespace: "cgpt-validation", limit: 20}); if (r.items[0].path !== \'tools["cgpt-validation"].cancel_approval\') throw new Error("UNEXPECTED_PATH"); return await tools["cgpt-validation"].cancel_approval({approval_id: '+JSON.stringify(approval.approval_id)+'});';
 const result={...structuredClone(approval),status:'CANCELLED',cancelled_by:'OC',...(variant==='wrong-result'?{requestId:'other-request'}:{})};
 const toolCalls=[
  {tool:'search',status:'completed',input:{query:'cancel_approval',namespace:'cgpt-validation',limit:20}},
  {tool:'cgpt-validation.cancel_approval',status:'completed',input:{approval_id:approval.approval_id}},
 ];
 if(variant==='extra-tool')toolCalls.push({tool:'bash',status:'completed',input:{command:'/usr/bin/true'}});
 h.native.messages[approval.session_id].push({parts:[{type:'tool',id:'execute-cancel-'+approval.requestId,
  callID:'call-execute-cancel-'+approval.requestId,tool:'execute',executed:false,
  state:{status:'completed',input:{code:variant==='code-divergent'?command+' return 1;':command},output:JSON.stringify(result),
   time:{start:Date.now()-1,end:Date.now()},metadata:{truncated:variant==='truncated',toolCalls}}}]});
}

test('annulation native OC : clôture préparée sans décision, accès, permission ou once',async t=>{
 const h=await setup(t);const run=await h.reserve('native-cancelled');const approval=h.approval(run,'native-cancelled-request');
 assert.equal((await h.post('/runs/native-cancelled/validation/request',{approval})).status,202);
 appendNativeCancelledTranscript(h,approval);
 await h.stop();await h.start();
 assert.equal((await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'})).status,202);
 await waitFor(async()=>{
  const status=(await h.get('/runs/native-cancelled/status')).body;
  const operations=(await h.get('/runs/native-cancelled/operations?operationId='+encodeURIComponent(approval.operation_id))).body;
  return status.undecidedValidationCount===0&&operations.operations?.[0]?.state==='CANCELLED';
 });
 const status=(await h.get('/runs/native-cancelled/status')).body;
 const decision=await h.get('/runs/native-cancelled/decision/'+approval.requestId);
 const operation=(await h.get('/runs/native-cancelled/operations?operationId='+encodeURIComponent(approval.operation_id))).body.operations[0];
 const state=JSON.parse(readFileSync(join(runtimeStateDirectory(h.directory),'controller-runs.json'),'utf8'));
 const durable=state.coordination.operations[approval.operation_id];
 assert.equal(status.undecidedValidationCount,0);assert.equal(decision.status,404);
 assert.equal(operation.state,'CANCELLED');assert.equal(operation.decision,null);
 assert.match(durable.completionDigest,/^[a-f0-9]{64}$/);assert.equal(durable.decision,undefined);assert.equal(durable.native,undefined);
 assert.equal(operation.completionDigest,undefined);
 assert.deepEqual((await h.get('/runs/native-cancelled/locks')).body.accesses,[]);
 assert.equal(h.native.permissions.length,0);assert.deepEqual(h.native.replies,[]);
 const next=h.approval(run,'native-cancelled-next');
 assert.equal((await h.post('/runs/native-cancelled/validation/request',{approval:next})).status,202);
});

test('annulation native OC sous Code Mode : request et cancel imbriqués réconciliés exactement',async t=>{
 const h=await setup(t);const run=await h.reserve('native-cancelled-codemode');
 const approval=h.approval(run,'native-cancelled-codemode-request');
 assert.equal((await h.post('/runs/native-cancelled-codemode/validation/request',{approval})).status,202);
 wrapNativeRequestValidationInCodeMode(h,approval);appendNativeCodeModeCancelledTranscript(h,approval);
 await h.stop();await h.start();
 assert.equal((await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'})).status,202);
 await waitFor(async()=>{
  const status=(await h.get('/runs/native-cancelled-codemode/status')).body;
  const ops=(await h.get('/runs/native-cancelled-codemode/operations?operationId='+encodeURIComponent(approval.operation_id))).body;
  return status.undecidedValidationCount===0&&ops.operations?.[0]?.state==='CANCELLED';
 });
 const op=(await h.get('/runs/native-cancelled-codemode/operations?operationId='+encodeURIComponent(approval.operation_id))).body.operations[0];
 const decision=await h.get('/runs/native-cancelled-codemode/decision/'+approval.requestId);
 assert.equal(op.state,'CANCELLED');assert.equal(op.decision,null);assert.equal(decision.status,404);
 assert.equal(h.native.permissions.length,0);assert.deepEqual(h.native.replies,[]);
});

for (const restart of [false, true]) test(`annulation native OC approuvée non consommée : historique conservé, restart=${restart}`, async t => {
 const h=await setup(t), run=await h.reserve('approved-cancel');
 const approval=h.approval(run,'approved-cancel-request');
 assert.equal((await h.post('/runs/approved-cancel/validation/request',{approval})).status,202);
 assert.equal((await h.post('/runs/approved-cancel/decision/'+approval.requestId,{decision:'approved'})).status,201);
 wrapNativeRequestValidationInCodeMode(h,approval);appendNativeCodeModeCancelledTranscript(h,approval);
 if(restart){await h.stop();await h.start();}
 await delay(60);
 await h.post('/broker/readiness',{status:'BLOCKED',pending_count:1,infrastructure_status:'READY',root_cause:'DECISION_WAIT_WITHOUT_PROGRESS'});
 await delay(60);
 h.native.emit({type:'session.idle',properties:{sessionID:approval.session_id}});
 await waitFor(async()=>{
  const ops=(await h.get('/runs/approved-cancel/operations?operationId='+encodeURIComponent(approval.operation_id))).body;
  return ops.operations?.[0]?.state==='CANCELLED';
 });
 const state=JSON.parse(readFileSync(join(runtimeStateDirectory(h.directory), 'controller-runs.json'),'utf8'));
 const op=state.coordination.operations[approval.operation_id];
 assert.equal(op.decision.status,'approved');assert.equal(op.native,undefined);
 assert.match(op.completionDigest,/^[a-f0-9]{64}$/);
 assert.equal((await h.get('/runs/approved-cancel/decision/'+approval.requestId)).status,404);
 assert.deepEqual(h.native.replies,[]);assert.deepEqual((await h.get('/runs/approved-cancel/locks')).body.accesses,[]);
 await h.stop();await h.start();
 assert.equal((await h.get('/runs/approved-cancel/decision/'+approval.requestId)).status,404);
 await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});
 const next=await h.post('/runs/approved-cancel/validation/request',{approval:h.approval(run,'approved-cancel-next')});
 assert.equal(next.status,202,JSON.stringify(next)+' '+h.getStderr());
});

test('annulation native OC sous Code Mode : wrappers divergents ou avec appels supplémentaires restent protégés',async t=>{
 for(const variant of ['code-divergent','extra-tool','truncated','wrong-result'])await t.test(variant,async subtest=>{
  const h=await setup(subtest);const run=await h.reserve('native-cancelled-codemode-'+variant);
  const approval=h.approval(run,'native-cancelled-codemode-request-'+variant);
  assert.equal((await h.post('/runs/'+run.runId+'/validation/request',{approval})).status,202);
  wrapNativeRequestValidationInCodeMode(h,approval);appendNativeCodeModeCancelledTranscript(h,approval,{variant});
  await h.stop();await h.start();
  await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});await delay(60);
  const operation=(await h.get('/runs/'+run.runId+'/operations?operationId='+encodeURIComponent(approval.operation_id))).body.operations[0];
  assert.equal(operation.state,'PREPARED',variant);assert.equal(operation.completionDigest,undefined,variant);
  assert.equal((await h.get('/runs/'+run.runId+'/decision/'+approval.requestId)).status,404,variant);
  assert.deepEqual(h.native.replies,[],variant);assert.equal(h.native.permissions.length,0,variant);
 });
});

test('annulation native OC : divergence ou activité conserve l’opération PREPARED',async t=>{
 const variants=['pending','wrong-canceller','approval-mismatch','run-mismatch','session-busy','permission','effect'];
 for(const variant of variants)await t.test(variant,async subtest=>{
  const h=await setup(subtest);const run=await h.reserve('native-cancelled-'+variant);
  const approval=h.approval(run,'native-cancelled-request-'+variant);
  assert.equal((await h.post('/runs/'+run.runId+'/validation/request',{approval})).status,202);
  appendNativeCancelledTranscript(h,approval,{status:variant==='pending'?'PENDING':'CANCELLED',
   cancelledBy:variant==='wrong-canceller'?'CGPT':'OC',
   lookupApprovalId:variant==='approval-mismatch'?'other-approval':approval.approval_id,
   resultOverrides:variant==='run-mismatch'?{run_id:'other-run'}:{},
   extraTool:variant==='effect'?{type:'tool',tool:'bash',state:{status:'completed',input:{command:'/usr/bin/true'},
    time:{start:Date.now()-1,end:Date.now()}}}:null});
  if(variant==='session-busy')h.native.busy[approval.session_id]={type:'busy'};
  if(variant==='permission')h.native.permissions.push({id:'native-cancelled-pending',sessionID:approval.session_id,
    permission:'bash',metadata:{command:'/usr/bin/true'}});
  await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});await delay(60);
  const status=(await h.get('/runs/'+run.runId+'/status')).body;
  const operation=(await h.get('/runs/'+run.runId+'/operations?operationId='+encodeURIComponent(approval.operation_id))).body.operations[0];
  assert.equal(status.undecidedValidationCount,1,variant);
  assert.equal((await h.get('/runs/'+run.runId+'/decision/'+approval.requestId)).status,404,variant);
  assert.equal(operation.state,'PREPARED',variant);assert.equal(operation.completionDigest,undefined,variant);
  assert.deepEqual(h.native.replies,[],variant);
 });
});

test('rejet natif : une notification perdue se réconcilie après redémarrage sans rejouer ni créer de permission',async t=>{
 const h=await setup(t);const run=await h.reserve('native-rejection');const approval=h.approval(run,'native-rejection-request');
 assert.equal((await h.post('/runs/native-rejection/validation/request',{approval})).status,202);
 appendNativeRejectedTranscript(h,approval);
 await h.stop();await h.start();
 assert.equal((await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'})).status,202);
 await waitFor(async()=>{
  const decision=await h.get('/runs/native-rejection/decision/'+approval.requestId);
  const operations=(await h.get('/runs/native-rejection/operations?operationId='+encodeURIComponent(approval.operation_id))).body;
  return decision.status===200&&operations.operations?.[0]?.state==='CANCELLED';
 });
 const decision=await h.get('/runs/native-rejection/decision/'+approval.requestId);
 assert.equal(decision.status,200);assert.equal(decision.body.decision,'rejected');
 const duplicate=await h.post('/runs/native-rejection/decision/'+approval.requestId,{decision:'rejected'});
 assert.equal(duplicate.body.error,'decision-already-recorded');
 const operations=(await h.get('/runs')).body.coordination;
 const reconciled=operations.operations[approval.operation_id];
 assert.equal(reconciled.state,'CANCELLED');
 assert.match(reconciled.completionDigest,/^[a-f0-9]{64}$/);
 assert.equal(reconciled.native,undefined);assert.equal(operations.accesses[approval.operation_id],undefined);
 assert.equal(h.native.permissions.length,0);assert.equal(h.native.replies.length,0);
 const before=(await h.get('/runs')).body.coordination.operations[approval.operation_id];
 await h.stop();await h.start();
 await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});
 await waitFor(async()=> (await h.get('/runs/native-rejection/decision/'+approval.requestId)).status===200);
 await delay(40);
 const after=(await h.get('/runs')).body.coordination.operations[approval.operation_id];
 assert.deepEqual(after,before,'repeat reconciliation is idempotent');
 const next=h.approval(run,'native-rejection-next');
 assert.equal((await h.post('/runs/native-rejection/validation/request',{approval:next})).status,202,
  'a fresh request is admitted only after the terminal rejection is reconciled');
});

test('rejet natif : preuve divergente, outil additionnel, session active ou permission empêchent la clôture',async t=>{
 const variants=['pending','extra-tool','busy','permission','request-mismatch','approval-mismatch',
  'lookup-mismatch','reviewer-mismatch','run-mismatch','session-mismatch','change-mismatch','operation-mismatch',
  'request-input-mismatch','duplicate-reject'];
 for(const variant of variants){
  const h=await setup(t);const run=await h.reserve('native-rejection-'+variant);const approval=h.approval(run,'native-rejection-request-'+variant);
  assert.equal((await h.post('/runs/'+run.runId+'/validation/request',{approval})).status,202);
  appendNativeRejectedTranscript(h,approval,{status:variant==='pending'?'PENDING':'REJECTED',
   reviewer:variant==='reviewer-mismatch'?'OTHER':'CGPT',
   extraTool:variant==='extra-tool'?{type:'tool',tool:'bash',state:{status:'completed',input:{command:'/usr/bin/true'},time:{start:Date.now()-1,end:Date.now()}}}:null,
   rejectRequestId:variant==='request-mismatch'?'other-request':approval.requestId,
   rejectApprovalId:variant==='approval-mismatch'?'other-approval':approval.approval_id,
   lookupApprovalId:variant==='lookup-mismatch'?'other-approval':approval.approval_id,
   resultOverrides:variant==='run-mismatch'?{run_id:'other-run'}:
    variant==='session-mismatch'?{session_id:'ses_other'}:
    variant==='change-mismatch'?{change_id:'other-change'}:
    variant==='operation-mismatch'?{operation_id:'other-operation'}:{},
   duplicateReject:variant==='duplicate-reject'});
  if(variant==='request-input-mismatch')h.native.messages[approval.session_id][0].parts[0].state.input.requestId='other-request';
  if(variant==='busy')h.native.busy[approval.session_id]={type:'busy'};
  if(variant==='permission')h.native.permissions.push({id:'native-rejection-pending',sessionID:approval.session_id,permission:'bash',metadata:{command:'/usr/bin/true'}});
  await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});await delay(60);
  const status=(await h.get('/runs/'+run.runId+'/status')).body;
  assert.equal(status.undecidedValidationCount,1,variant);
  assert.equal((await h.get('/runs/'+run.runId+'/decision/'+approval.requestId)).status,404,variant);
  assert.equal((await h.get('/runs/'+run.runId+'/operations?operationId='+encodeURIComponent(approval.operation_id))).body.operations[0].state,'PREPARED',variant);
  assert.equal(h.native.replies.length,0,variant);
 }
});


async function reviewedCancellationFixture(t) {
 const h=await setup(t,{sourceFiles:{'src/reviewed-cancel.py':'# reviewed pure helper\n'}}),run=await h.reserve('reviewed-cancel'),approval=h.approval(run,'reviewed-cancel-request');
 assert.equal((await h.post('/runs/'+run.runId+'/validation/request',{approval})).status,202);
 assert.equal((await h.post('/runs/'+run.runId+'/decision/'+approval.requestId,{decision:'approved'})).status,201);
 wrapNativeRequestValidationInCodeMode(h,approval);
 for(const id of ['review-call-a','review-call-b'])h.native.messages[run.sessionId].push({nativeV2:{
  id:'msg_'+id,type:'assistant',time:{created:Date.now()},finish:'error',content:[{type:'tool',id,name:'shell',executed:false,
   time:{created:Date.now()-3,ran:Date.now()-2,completed:Date.now()-1},state:{status:'error',input:{command:approval.commands[0]},
   error:{type:'aborted',message:'synthetic programmatic rejection'},metadata:{},content:[]}}]}});
 appendNativeCodeModeCancelledTranscript(h,approval);
 const evidence=await h.get('/runs/'+run.runId+'/recovery/native-evidence?operationId='+approval.operation_id);
 assert.equal(evidence.status,200,JSON.stringify(evidence));assert.equal(evidence.body.calls.length,2);
 assert.equal(evidence.body.journal.coverage,'MISSING_RELEVANT_CALLS');
 const policy={policyId:'review-policy',ownerId:run.ownerId,version:run.version,actions:['cancel-reviewed-validation'],
  resources:run.resources,authorization:'developer approved autonomous change; code and audit review by orchestrator'};
 assert.equal((await h.post('/runs/'+run.runId+'/recovery/policy',policy)).status,201);
 const plan=(await h.get('/runs/'+run.runId+'/recovery')).body;
 const payload={actionId:'review-action',ownerId:run.ownerId,policyId:policy.policyId,boundaryDigest:plan.boundaryDigest,
  action:'cancel-reviewed-validation',targetId:approval.operation_id,input:{nativeBoundaryDigest:evidence.body.nativeBoundaryDigest,
  review:{ownerId:run.ownerId,effect:'READ_ONLY',commandSha256:evidence.body.commandSha256,sourceFiles:[{path:'src/reviewed-cancel.py',sha256:createHash('sha256').update('# reviewed pure helper\n').digest('hex')}],evidenceRefs:['audit/code-review'],
  rejectedCalls:evidence.body.calls.map((call,i)=>({callId:call.callId,permissionId:'per_review_'+i,auditExecutionId:'exec-audit-'+i,ackStatus:204}))}}};
 return {h,run,approval,payload};
}
test('revue orchestrateur : annule une validation sans once, conserve approved et issue native indéterminée',async t=>{
 const {h,run,approval,payload}=await reviewedCancellationFixture(t);
 const result=await h.post('/runs/'+run.runId+'/recovery/action',payload);
 assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.state,'CANCELLED');
 assert.equal(result.body.executionOutcome,'UNDETERMINED_READ_ONLY');assert.equal(result.body.evidenceAuthority,'ORCHESTRATOR_AUDIT_REVIEW');
 assert.deepEqual((await h.post('/runs/'+run.runId+'/recovery/action',payload)).body,result.body);
 assert.equal((await h.get('/runs/'+run.runId+'/decision/'+approval.requestId)).status,404);
 let op=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];
 assert.equal(op.state,'CANCELLED');assert.equal(op.decision.status,'approved');assert.equal(op.onceAcknowledged,null);
 assert.equal(op.native,null);assert.equal(op.access,null);assert.equal(op.executionOutcome,'UNDETERMINED_READ_ONLY');
 assert.deepEqual(h.native.replies,[]);assert.ok(!JSON.stringify(result.body).includes('NO_EFFECT'));
 await h.stop();await h.start();
 op=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];
 assert.equal(op.executionOutcome,'UNDETERMINED_READ_ONLY');
});
for(const variant of ['write','digest','stale-native','source-outside','source-hash','uncovered-native','consumed'])test('revue HTTP refuse '+variant,async t=>{
 const {h,run,approval,payload}=await reviewedCancellationFixture(t);
 if(variant==='write')payload.input.review.effect='WRITE';
 if(variant==='digest')payload.input.review.commandSha256='0'.repeat(64);
 if(variant==='stale-native')payload.input.nativeBoundaryDigest='0'.repeat(64);
 if(variant==='source-hash')payload.input.review.sourceFiles[0].sha256='0'.repeat(64);
 if(variant==='consumed'){
  const acquired=await h.post('/runs/'+run.runId+'/locks/acquire',{version:run.version,operationId:approval.operation_id,operationDigest:approval.operation_digest,resources:approval.resources,expectedRevisions:approval.expected_revisions});
  assert.equal(acquired.status,200,JSON.stringify(acquired));await h.execute(approval);
 }
 if(variant==='source-outside')payload.input.review.sourceFiles=[{path:'outside.py',sha256:'0'.repeat(64)}];
 if(variant==='uncovered-native')h.native.messages[run.sessionId].push({parts:[{type:'tool',tool:'bash',executed:true,callID:'unreviewed-effect',state:{status:'completed',input:{command:'/usr/bin/true'},output:''}}]});
 const result=await h.post('/runs/'+run.runId+'/recovery/action',payload);assert.ok([400,403,409].includes(result.status),JSON.stringify(result));
 const op=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];
 assert.equal(op.state,variant==='consumed'?'EXECUTING':'PREPARED');assert.equal(op.decision.status,'approved');
 assert.equal(h.native.replies.length,variant==='consumed'?1:0);
});
test('extension HTTP additive : held conservé, génération stable, scope CAS et aucun effet natif',async t=>{
 const h=await setup(t),run=await h.reserve('extend-compatible',{resources:[{key:'port:host-a/5173',mode:'write'}]}),approval=h.approval(run,'held-before-extension');
 assert.equal((await h.post('/runs/'+run.runId+'/validation/request',{approval})).status,202);
 assert.equal((await h.post('/runs/'+run.runId+'/decision/'+approval.requestId,{decision:'approved'})).status,201);
 const acquired=await h.post('/runs/'+run.runId+'/locks/acquire',{version:run.version,operationId:approval.operation_id,
  operationDigest:approval.operation_digest,resources:approval.resources,expectedRevisions:approval.expected_revisions});
 assert.equal(acquired.status,200,JSON.stringify(acquired));
 const plan=(await h.get('/runs/'+run.runId+'/recovery')).body;
 assert.equal(plan.decisionOwner,'orchestrator');assert.equal(plan.humanDecisionRequired,false);
 const input={extensionId:'http-compatible-extension',ownerId:run.ownerId,version:run.version,
  expectedManifestDigest:plan.manifestDigest,resources:[{key:'port:host-a/5174',mode:'write'}],
  authorization:'same approved change; independent test origin',evidence:['audit/new-port-review']};
 const result=await h.post('/runs/'+run.runId+'/extend-compatible',input);assert.equal(result.status,201,JSON.stringify(result));
 assert.equal(result.body.version,run.version);
 assert.deepEqual((await h.post('/runs/'+run.runId+'/extend-compatible',input)).body,result.body);
 const access=(await h.get('/runs/'+run.runId+'/locks')).body.accesses[0];
 assert.equal(access.token,undefined);assert.equal(access.fencing,acquired.body.fencing);assert.equal(access.state,'HELD');
 assert.deepEqual(h.native.replies,[]);
});


test('revue : transport NOT_ADMITTED audité ignoré sans masquer une admission ou un effet',async t=>{
 const {h,run,approval,payload}=await reviewedCancellationFixture(t);
 const input={...structuredClone(approval),requestId:'unadmitted-retry',approval_id:'approval-unadmitted',operation_id:'op-unadmitted'};
 const wrapper={type:'tool',tool:'execute',callID:'retry-wrapper',executed:false,state:{status:'completed',input:{code:'const result = await tools["cgpt-validation"].request_validation(retry); return result;'},
  output:JSON.stringify({...input,status:'NOT_ADMITTED'}),metadata:{truncated:false,toolCalls:[{tool:'cgpt-validation.request_validation',status:'completed',input}]}}};
 h.native.messages[run.sessionId].splice(-1,0,{parts:[wrapper]});
 const evidence=await h.get('/runs/'+run.runId+'/recovery/native-evidence?operationId='+approval.operation_id);
 payload.input.nativeBoundaryDigest=evidence.body.nativeBoundaryDigest;
 payload.input.review.wrapperReviews=[{callId:wrapper.callID,codeSha256:createHash('sha256').update(wrapper.state.input.code).digest('hex'),effect:'VALIDATION_TRANSPORT_ONLY',returnsNativeResult:true}];
 const result=await h.post('/runs/'+run.runId+'/recovery/action',payload);assert.equal(result.status,200,JSON.stringify(result));
 assert.equal(result.body.state,'CANCELLED');assert.equal(result.body.executionOutcome,'UNDETERMINED_READ_ONLY');
});

async function portReconciliationFixture(t,{reboot=false,handoff=false,sealed=false}={}) {
 const packageContent=JSON.stringify({scripts:{dev:'vite'}}),port={key:'port:host-a/5173',mode:'write'},file={key:'file:frontend',mode:'write'};
 const h=await setup(t,{sourceFiles:{'frontend/package.json':packageContent}}),run=await h.reserve('reconcile-port',{resources:[port,file]});
 const approval=h.approval(run,'reconcile-port-original');approval.resources=[port];approval.expected_revisions={[port.key]:0};
 approval.commands=['cd frontend && npm run dev -- --port 5173'];
 const requestPart=h.native.messages[run.sessionId].at(-1).parts[0];requestPart.state.input=structuredClone(approval);
 assert.equal((await h.post('/validation/request',{approval})).status,202);
 assert.equal((await h.post('/runs/'+run.runId+'/decision/'+approval.requestId,{decision:'approved'})).status,201);
 const acquire=await h.post('/runs/'+run.runId+'/locks/acquire',{version:run.version,operationId:approval.operation_id,operationDigest:approval.operation_digest,resources:[port],expectedRevisions:approval.expected_revisions});
 assert.equal(acquire.status,200,JSON.stringify(acquire));await h.execute(approval);
 requestPart.state.status='completed';requestPart.state.output=JSON.stringify({...approval,status:'APPROVED',reviewer:'CGPT'});
 const kernelBootMs=Number(readFileSync('/proc/stat','utf8').match(/^btime (\d+)$/m)[1])*1000;
 const stamp=reboot?kernelBootMs-10000:Date.now()+1;
 h.native.messages[run.sessionId].push({parts:[{type:'tool',tool:'shell',callID:'call-'+approval.requestId,executed:false,state:{status:'completed',input:{command:approval.commands[0]},output:'Command timed out',time:{start:stamp,end:stamp+100},metadata:{timeout:true}}}]});
 await h.stop();
 if(reboot){const path=join(runtimeStateDirectory(h.directory),'controller-runs.json'),state=JSON.parse(readFileSync(path));state.coordination.operations[approval.operation_id].native.startedAt=stamp;writeFileSync(path,JSON.stringify(state));}
 await h.start();await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});
 const preview=await h.get('/runs/'+run.runId+'/locks/timeout-quarantine-preview?operationId='+approval.operation_id);
 assert.equal(preview.status,200,JSON.stringify(preview));
 assert.equal((await h.post('/runs/'+run.runId+'/locks/quarantine-timeout',{version:run.version,operationId:approval.operation_id,fencing:preview.body.fencing,
  quarantineId:'port-recovery-quarantine',boundaryDigest:preview.body.boundaryDigest,evidence:['native timeout observed']})).status,200);
 if(handoff){
  const old=run.sessionId,next='ses_reboot_current',base='/runs/'+run.runId;
  h.native.sessions[next]={id:next,directory:h.directory,permission:[{permission:'*',pattern:'*',action:'ask'}]};
  h.native.rules[next]=[{permission:'*',pattern:'*',action:'ask'}];
  h.native.messages[next]=[{parts:[{type:'tool',tool:'execute',executed:false,callID:'ready-current',state:{status:'completed',input:{code:'return await tools["cgpt-validation"].broker_readiness('+JSON.stringify({run_id:run.runId})+');'},metadata:{truncated:false,toolCalls:[{tool:'cgpt-validation.broker_readiness',status:'completed',input:{run_id:run.runId}}]},output:JSON.stringify({run_id:run.runId,status:'READY',pending_count:0,server_version:'2.4.6'})}}]}];
  const preview=await h.get(base+'/session-handoff?sessionId='+next);assert.equal(preview.status,200,JSON.stringify(preview));
  const result=await h.post(base+'/session-handoff',{handoffId:'port-reboot-handoff',ownerId:run.ownerId,version:run.version,jobId:preview.body.jobId,expectedSessionId:old,sessionId:next,checkpointDigest:preview.body.checkpointDigest,boundaryDigest:preview.body.boundaryDigest,reason:'continue read-only probes after qualified handoff',evidence:['fixture/native handoff']});
  assert.equal(result.status,201,JSON.stringify(result));run.sessionId=next;
 }
 const probes=[];const native=(await h.nativeClient.info()).pid,identity=await processIdentity(native);
 const initialEvidence=(await h.get('/runs/'+run.runId+'/recovery/native-evidence?operationId='+approval.operation_id)).body;
 assert.ok(initialEvidence.nativeInstanceEvidence);const instance=initialEvidence.nativeInstanceEvidence;
 for(const nonce of ['probe-port-a','probe-port-b']) {
  const descriptor=await h.get('/runs/'+run.runId+'/recovery/port-probe-command?operationId='+approval.operation_id+'&nonce=op-'+nonce+'&runtimeDirectory=.');
  assert.equal(descriptor.status,200,JSON.stringify(descriptor));
  const params=descriptor.body.parameters;
  let nativeInput;const probe=h.approval(run,nonce);probe.commands=[portProbeCommand(params)];probe.resources=[{...port,mode:'read'}];probe.expected_revisions={[port.key]:0};
  if(sealed){
   const staged=await h.post('/runs/'+run.runId+'/recovery/port-probe-stage',{operationId:approval.operation_id,nonce:probe.operation_id,
     stageId:'stage-'+nonce,requestId:probe.requestId,approvalId:probe.approval_id,runtimeDirectories:['.']});
   assert.equal(staged.status,201,JSON.stringify(staged));assert.equal(staged.body.transport,'sealed-bash-v1');assert.equal(staged.body.nativeToolInputSha256,nativeToolInputDigest(staged.body.nativeInput));assert.equal(staged.body.nativeInput.timeout,30000);
   assert.equal(staged.body.payloadSha256,createHash('sha256').update(portProbeCommand(params)).digest('hex'));
   assert.ok(staged.body.command.length<2000);assert.ok(!JSON.stringify(staged.body).includes('async function observePortBoundary'));
   const refreshed=await h.get('/runs/'+run.runId+'/recovery/port-probe-command?operationId='+approval.operation_id+'&nonce='+probe.operation_id+'&runtimeDirectory=.');
   assert.equal(refreshed.status,200,JSON.stringify(refreshed));assert.equal(refreshed.body.command,staged.body.command);
   probe.commands=[staged.body.command];nativeInput=staged.body.nativeInput;probe.tool_input_sha256=staged.body.nativeToolInputSha256;
   const beforeDelivery=await fetch(h.base+'/runs/'+run.runId+'/shell-stage/stage-'+nonce+'/payload');assert.equal(beforeDelivery.status,409);
  }
  h.native.messages[run.sessionId].at(-1).parts[0].state.input=structuredClone(probe);
  assert.equal((await h.post('/validation/request',{approval:probe})).status,202);
  assert.equal((await h.post('/runs/'+run.runId+'/decision/'+probe.requestId,{decision:'approved'})).status,201);
  const acquired=await h.post('/runs/'+run.runId+'/locks/acquire',{version:run.version,operationId:probe.operation_id,operationDigest:probe.operation_digest,resources:probe.resources,expectedRevisions:probe.expected_revisions});
  assert.equal(acquired.status,200,JSON.stringify(acquired));assert.equal(acquired.body.state,'HELD');await h.execute(probe,nativeInput);
  if(sealed){const delivered=await fetch(h.base+'/runs/'+run.runId+'/shell-stage/stage-'+nonce+'/payload');assert.equal(delivered.status,200);assert.equal(await delivered.text(),portProbeCommand(params));}
  const capture={protocol:'cab-port-boundary-v1',nonce:params.nonce,nativePid:native,port:5173,runtimeDirectories:['.'],workspace:h.directory,
   ...(reboot?{kernelBootMs:instance.kernelBootMs,bootIdSha256:instance.bootIdSha256,historicalEndedAt:instance.historicalEndedAt}:{}),
   observedAt:Date.now(),instanceObservedAt:instance.observedAt,instanceEvidenceKind:instance.kind,nativeStartedAtMs:reboot?instance.kernelBootMs+1000:instance.observedAt-1000,nativeStartedAtUpperBound:reboot?instance.kernelBootMs+2000:instance.observedAt,complete:true,quiescent:true,nativeUid:process.getuid(),nativeStartTime:identity.startTime,cgroupDigest:instance.cgroupDigest,netnsDigest:'d'.repeat(64),
   listening:false,matchingProcessCount:0,matchingProcesses:[],matchingProcessesDigest:proofHash([])};
  capture.captureDigest=proofHash(capture);
  await h.completeTool(probe,0,{nativeShell:true,nativeInput,output:'CAB_PORT_BOUNDARY_V1:'+Buffer.from(JSON.stringify(capture)).toString('base64')+'\n'});
  const released=await h.releaseOperation(run,probe,acquired.body,'NO_EFFECT');assert.equal(released.status,200,JSON.stringify(released));
  assert.equal((await h.get('/runs/'+run.runId+'/operations?operationId='+probe.operation_id)).body.operations[0].state,'COMPLETED');probes.push(probe.operation_id);
 }
 const evidence=await h.get('/runs/'+run.runId+'/recovery/native-evidence?operationId='+approval.operation_id);
 assert.equal(evidence.status,200,JSON.stringify(evidence));
 const policy={policyId:'port-recovery-policy',ownerId:run.ownerId,version:run.version,actions:['reconcile-quarantined-port'],resources:[port],authorization:'same change; orchestrator reviewed Vite boundary'};
 assert.equal((await h.post('/runs/'+run.runId+'/recovery/policy',policy)).status,201);
 const plan=(await h.get('/runs/'+run.runId+'/recovery')).body;
 const payload={actionId:'port-recovery-action',ownerId:run.ownerId,policyId:policy.policyId,boundaryDigest:plan.boundaryDigest,action:'reconcile-quarantined-port',targetId:approval.operation_id,
  input:{nativeBoundaryDigest:evidence.body.nativeBoundaryDigest,probeOperationIds:probes,review:{ownerId:run.ownerId,serverKind:'VITE_LOCAL_DEV_SERVER',
   commandSha256:evidence.body.commandSha256,runtimeDirectories:['.'],sourceFiles:[{path:'frontend/package.json',sha256:createHash('sha256').update(packageContent).digest('hex')}],
   noDetachedWorkOutsideDirectories:true,noProcessIsolationOrCredentialChange:true,evidenceRefs:['audit/vite-scope-review']}}};
 return {h,run,approval,payload};
}
test('port quarantiné : deux sondes natives clôturent RECONCILED sans exit historique ni once rejouée',async t=>{
 const {h,run,approval,payload}=await portReconciliationFixture(t),before=h.native.replies.length;
 const result=await h.post('/runs/'+run.runId+'/recovery/action',payload);assert.equal(result.status,200,JSON.stringify(result));
 assert.equal(result.body.state,'RELEASED');assert.equal(result.body.executionOutcome,'HISTORICAL_OUTCOME_UNOBSERVED_RESOURCE_QUIESCENT');
 const op=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];
 assert.equal(op.state,'CANCELLED');assert.equal(op.onceAcknowledged,true);assert.equal(op.nativeResult,null);assert.equal(op.executionOutcome,result.body.executionOutcome);
 assert.equal(h.native.replies.length,before);assert.deepEqual((await h.post('/runs/'+run.runId+'/recovery/action',payload)).body,result.body);
 await h.stop();await h.start();
 const restored=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];assert.equal(restored.executionOutcome,result.body.executionOutcome);
});
for(const variant of ['same-probe','source','command','owner'])test('port quarantiné : refuse '+variant,async t=>{
 const {h,run,approval,payload}=await portReconciliationFixture(t);
 if(variant==='same-probe')payload.input.probeOperationIds[1]=payload.input.probeOperationIds[0];
 if(variant==='source')payload.input.review.sourceFiles[0].sha256='0'.repeat(64);
 if(variant==='command')payload.input.review.commandSha256='0'.repeat(64);
 if(variant==='owner')payload.input.review.ownerId='foreign';
 const result=await h.post('/runs/'+run.runId+'/recovery/action',payload);assert.equal(result.status,409,JSON.stringify(result));
 const op=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];assert.equal(op.state,'EXECUTING');assert.equal(op.onceAcknowledged,true);assert.equal(op.access.state,'HELD');
});

async function boundaryRecoveryFixture(t,{terminal=false}={}) {
 const content='console.log("syntax fixture");\n',file='src/boundary.js';
 const h=await setup(t,{nativeShellFixtures:true,sourceFiles:{[file]:content}});
 const run=await h.reserve('boundary-'+(terminal?'terminal':'pending'),{resources:[{key:'file:src',mode:'write'}]});
 const approval=h.approval(run,'boundary-request');approval.commands=['node --check '+file];
 h.native.messages[run.sessionId].at(-1).parts[0].state.input=structuredClone(approval);
 const base='/runs/'+run.runId;
 assert.equal((await h.post(base+'/validation/request',{approval})).status,202);
 if(terminal)assert.equal((await h.post(base+'/decision/'+approval.requestId,{decision:'approved'})).status,201);
 wrapNativeRequestValidationInCodeMode(h,approval);
 const request=h.native.messages[run.sessionId].at(-1).parts[0];request.state.status='completed';
 request.state.output=JSON.stringify({...approval,status:terminal?'APPROVED':'PENDING',...(terminal?{reviewer:'CGPT'}:{})});
 if(terminal) {
  const stamp=Date.now();h.native.messages[run.sessionId].push({parts:[{type:'tool',tool:'shell',callID:'boundary-terminal-call',executed:false,
   state:{status:'completed',input:{command:approval.commands[0],workdir:h.directory,background:false},output:'(no output)',
    metadata:{truncated:false,exit:0},time:{start:stamp-1,end:stamp}}}]});
 } else {
  await h.stop();
  unlinkSync(join(runtimeStateDirectory(h.directory), 'runs',run.runId,String(run.contextId),'controller-communication.json'));
  await h.start();
  const stamp=Date.now();h.native.messages[run.sessionId].push({parts:[{type:'tool',tool:'cgpt-validation_get_approval',callID:'boundary-pending-read',
   state:{status:'completed',input:{approval_id:approval.approval_id},output:JSON.stringify({...approval,status:'PENDING',expires_at:new Date(stamp+600000).toISOString()}),
    metadata:{truncated:false},time:{start:stamp-1,end:stamp}}}]});
 }
 await h.post('/broker/readiness',{status:'BLOCKED',pending_count:1,infrastructure_status:'READY',by_run:{[run.runId]:{status:'READY',root_cause:'NONE',pending_count:terminal?0:1}}});
 const action=terminal?'reconcile-reviewed-terminal':'restore-pending-validation';
 const policy={policyId:'boundary-policy',ownerId:run.ownerId,version:run.version,actions:[action],resources:run.resources,authorization:'approved change; autonomous orchestrator boundary review'};
 assert.equal((await h.post(base+'/recovery/policy',policy)).status,201);
 const evidence=await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id);assert.equal(evidence.status,200,JSON.stringify(evidence));
 const plan=(await h.get(base+'/recovery')).body;
 const payload={actionId:'boundary-action',ownerId:run.ownerId,policyId:policy.policyId,boundaryDigest:plan.boundaryDigest,
  action,targetId:approval.operation_id,input:{nativeBoundaryDigest:evidence.body.nativeBoundaryDigest}};
 if(terminal)payload.input.review={ownerId:run.ownerId,effect:'READ_ONLY',commandSha256:evidence.body.commandSha256,
  sourceFiles:[{path:file,sha256:createHash('sha256').update(content).digest('hex')}],evidenceRefs:['audit/read-only-node-syntax'],
  callId:evidence.body.calls[0].callId,partDigest:evidence.body.calls[0].partDigest};
 return{h,run,approval,payload,base};
}
test('frontière PENDING : restaure même identité sans décision, permission ou nouvelle demande',async t=>{
 const{h,run,approval,payload,base}=await boundaryRecoveryFixture(t);
 const before=(await h.get('/runs')).body.coordination.operations[approval.operation_id];
 assert.equal((await h.get(base+'/decision/'+approval.requestId)).status,404);
 const result=await h.post(base+'/recovery/action',payload);assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.state,'PENDING');
 assert.deepEqual((await h.get('/runs')).body.coordination.operations[approval.operation_id],before);
 assert.equal((await h.get(base+'/status')).body.undecidedValidationCount,1);assert.equal(h.native.replies.length,0);
 assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
 await h.stop();await h.start();
 assert.equal((await h.get(base+'/status')).body.undecidedValidationCount,1);
 assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
 await h.post('/broker/readiness',{status:'BLOCKED',pending_count:1,infrastructure_status:'READY'});
 const decided=await h.post(base+'/decision/'+approval.requestId,{decision:'approved'});assert.equal(decided.status,201,JSON.stringify(decided));
 assert.equal(h.native.replies.length,0);
});
for(const variant of ['expired','stale-read','identity','busy','permission','conflict','effect','owner','boundary'])test('frontière PENDING : refuse '+variant,async t=>{
 const{h,run,approval,payload,base}=await boundaryRecoveryFixture(t);
 if(variant==='expired'){
  const p=h.native.messages[run.sessionId].at(-1).parts[0];const v=JSON.parse(p.state.output);v.expires_at=new Date(Date.now()-1).toISOString();p.state.output=JSON.stringify(v);
 }if(variant==='conflict'){
  const p=h.native.messages[run.sessionId].at(-1).parts[0],v=JSON.parse(p.state.output);v.status='APPROVED';p.state.output=JSON.stringify(v);
 }if(variant==='effect')h.native.messages[run.sessionId].push({parts:[{type:'tool',tool:'shell',callID:'unexpected-effect',state:{status:'completed',input:{command:approval.commands[0],workdir:h.directory},metadata:{exit:0},time:{start:Date.now()-1,end:Date.now()}}}]});
 if(variant==='stale-read')h.native.messages[run.sessionId].at(-1).parts[0].state.time.end=Date.now()-300001;
 if(variant==='identity'){const p=h.native.messages[run.sessionId].at(-1).parts[0],v=JSON.parse(p.state.output);v.operation_digest='0'.repeat(64);p.state.output=JSON.stringify(v);}
 if(variant==='busy')h.native.busy[run.sessionId]={type:'busy'};
 if(variant==='permission')h.native.permissions.push({id:'unexpected-pending',sessionID:run.sessionId,permission:'bash',metadata:{command:approval.commands[0]}});
 if(variant==='owner')payload.ownerId='foreign-owner';
 if(variant==='boundary')payload.input.nativeBoundaryDigest='0'.repeat(64);
 if(['expired','stale-read','identity','busy','permission','conflict','effect'].includes(variant))payload.input.nativeBoundaryDigest=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body.nativeBoundaryDigest;
 const result=await h.post(base+'/recovery/action',payload);assert.ok([403,409].includes(result.status),JSON.stringify(result));
 assert.equal((await h.get(base+'/status')).body.undecidedValidationCount,0);assert.equal(h.native.replies.length,0);
});
test('terminal revu : clôt coordination sans once/nativeResult et sans rejeu, survit au redémarrage',async t=>{
 const{h,approval,payload,base}=await boundaryRecoveryFixture(t,{terminal:true});
 const result=await h.post(base+'/recovery/action',payload);assert.equal(result.status,200,JSON.stringify(result));
 assert.equal(result.body.state,'COMPLETED');assert.equal(result.body.executionOutcome,'NATIVE_TERMINAL_OBSERVED_PERMISSION_UNVERIFIED');
 const op=(await h.get(base+'/operations?operationId='+approval.operation_id)).body.operations[0];assert.equal(op.state,'COMPLETED');assert.equal(op.native,null);assert.equal(op.nativeResult,null);assert.notEqual(op.onceAcknowledged,true);
 assert.equal((await h.get(base+'/status')).body.hasUnresolvedValidation,false);assert.equal(h.native.replies.length,0);
 assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
 await h.stop();await h.start();
 const after=(await h.get(base+'/operations?operationId='+approval.operation_id)).body.operations[0];assert.equal(after.executionOutcome,result.body.executionOutcome);
 assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);assert.equal(h.native.replies.length,0);
});
for(const variant of ['source','call','part','write','duplicate','extra-effect'])test('terminal revu : refuse '+variant,async t=>{
 const{h,run,approval,payload,base}=await boundaryRecoveryFixture(t,{terminal:true});
 if(variant==='source')payload.input.review.sourceFiles[0].sha256='0'.repeat(64);
 if(variant==='call')payload.input.review.callId='foreign-call';
 if(variant==='part')payload.input.review.partDigest='0'.repeat(64);
 if(variant==='write')payload.input.review.effect='WRITE';
 if(variant==='duplicate')h.native.messages[run.sessionId].push(structuredClone(h.native.messages[run.sessionId].at(-1)));
 if(variant==='extra-effect')h.native.messages[run.sessionId].push({parts:[{type:'tool',tool:'edit',callID:'extra-edit',state:{status:'completed',input:{filePath:'other'},output:''}}]});
 if(['duplicate','extra-effect'].includes(variant))payload.input.nativeBoundaryDigest=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body.nativeBoundaryDigest;
 const result=await h.post(base+'/recovery/action',payload);assert.equal(result.status,409,JSON.stringify(result));
 const op=(await h.get(base+'/operations?operationId='+approval.operation_id)).body.operations[0];assert.equal(op.state,'PREPARED');assert.equal(op.native,null);assert.equal(h.native.replies.length,0);
});
for(const terminal of [false,true])test('frontière validée : reprise causale après réponse perdue '+(terminal?'terminal':'PENDING'),async t=>{
 const{h,approval,payload,base}=await boundaryRecoveryFixture(t,{terminal});
 const result=await h.post(base+'/recovery/action',payload);assert.equal(result.status,200,JSON.stringify(result));
 await h.stop();
 const file=join(runtimeStateDirectory(h.directory), 'recovery-policies.json'),env=JSON.parse(readFileSync(file,'utf8'));
 const row=env.value.receipts.find(r=>r.actionId===payload.actionId);row.state='PREPARED';delete row.result;delete row.httpStatus;
 env.digest=createHash('sha256').update(JSON.stringify(env.value)).digest('hex');writeFileSync(file,JSON.stringify(env)+'\n');
 await h.start();
 const replay=await h.post(base+'/recovery/action',payload);assert.equal(replay.status,200,JSON.stringify(replay));assert.equal(replay.body.recoveredFrom,'qualified-receipt');
 const op=(await h.get(base+'/operations?operationId='+approval.operation_id)).body.operations[0];assert.equal(op.state,terminal?'COMPLETED':'PREPARED');assert.equal(op.native,null);assert.equal(op.nativeResult,null);assert.equal(h.native.replies.length,0);
});
test('frontière PENDING : intention avant écriture reprend la même identité après crash',async t=>{
 const{h,run,approval,payload,base}=await boundaryRecoveryFixture(t);
 assert.equal((await h.post(base+'/recovery/action',payload)).status,200);
 await h.stop();
 const root=join(runtimeStateDirectory(h.directory));
 const file=join(root,'recovery-policies.json'),env=JSON.parse(readFileSync(file,'utf8')),row=env.value.receipts.find(r=>r.actionId===payload.actionId);
 row.state='PREPARED';delete row.result;delete row.httpStatus;delete row.observation;
 env.digest=createHash('sha256').update(JSON.stringify(env.value)).digest('hex');writeFileSync(file,JSON.stringify(env)+'\n');
 unlinkSync(join(root,'runs',run.runId,String(run.contextId),'controller-communication.json'));
 await h.start();await h.post('/broker/readiness',{status:'BLOCKED',pending_count:1,infrastructure_status:'READY'});
 const replay=await h.post(base+'/recovery/action',payload);assert.equal(replay.status,200,JSON.stringify(replay));
 assert.equal((await h.get(base+'/status')).body.undecidedValidationCount,1);assert.equal(h.native.replies.length,0);
 assert.equal((await h.get(base+'/operations?operationId='+approval.operation_id)).body.operations[0].native,null);
});
async function closedHistoryTerminalFixture(t) {
 const {h,run,approval:old,payload:cancel}=await reviewedCancellationFixture(t),base='/runs/'+run.runId;
 assert.equal((await h.post(base+'/recovery/action',cancel)).status,200);
 const approval=h.approval(run,'after-closed-review');approval.commands=['/usr/bin/head src/reviewed-cancel.py'];
 h.native.messages[run.sessionId].at(-1).parts[0].state.input=structuredClone(approval);
 assert.equal((await h.post(base+'/validation/request',{approval})).status,202);
 assert.equal((await h.post(base+'/decision/'+approval.requestId,{decision:'approved'})).status,201);
 wrapNativeRequestValidationInCodeMode(h,approval);
 const source=h.native.messages[run.sessionId].pop();source.parts[0].state.time={start:Date.now()-60000,end:Date.now()-59000};
 h.native.messages[run.sessionId].unshift(source);
 h.native.messages[run.sessionId].push({parts:[{type:'tool',tool:'execute',callID:'closed-failed-coordination',executed:false,state:{status:'completed',input:{code:'const payload=runtimeInput; return await tools["cgpt-validation"].request_validation(payload);'},output:'MCP notification failed',metadata:{error:true,truncated:false,toolCalls:[{tool:'cgpt-validation.request_validation',status:'error',input:{...approval,requestId:'unowned-failed-coordination'}}]},time:{start:Date.now()-2,end:Date.now()-1}}}]});
 for(const tool of ['broker_health','get_approval'])h.native.messages[run.sessionId].push({parts:[{type:'tool',tool:'execute',callID:'closed-diagnostic-'+tool,executed:false,
  state:{status:'completed',input:{code:tool==='get_approval'?'const r=await tools["cgpt-validation"].get_approval(input); return {status:r.status};':'return await tools["cgpt-validation"].broker_health({});'},output:JSON.stringify({status:'APPROVED'}),metadata:{truncated:false,toolCalls:[{tool:'cgpt-validation.'+tool,status:'completed',input:tool==='get_approval'?{approval_id:approval.approval_id}:{}}]},time:{start:Date.now()-2,end:Date.now()-1}}}]});
 const stamp=Date.now();h.native.messages[run.sessionId].push({parts:[{type:'tool',tool:'cgpt-validation_get_approval',callID:'get-after-closed-review',state:{status:'completed',input:{approval_id:approval.approval_id},output:JSON.stringify({...approval,status:'APPROVED',reviewer:'CGPT'}),metadata:{truncated:false},time:{start:stamp-2,end:stamp-1}}}]});
 h.native.messages[run.sessionId].push({nativeV2:{id:'msg_terminal_after_closed',type:'assistant',time:{created:stamp},finish:'stop',content:[{type:'tool',id:'call-terminal-after-closed',name:'shell',executed:false,time:{created:stamp,ran:stamp+1,completed:stamp+2},state:{status:'completed',input:{command:approval.commands[0],workdir:h.directory,background:false},metadata:{exit:0,truncated:false},content:[{type:'text',text:'reviewed pure helper'}]}}]}});
 const policy={policyId:'after-closed-policy',ownerId:run.ownerId,version:run.version,actions:['reconcile-reviewed-terminal'],resources:run.resources,authorization:'same approved change; retain prior closed audit receipts'};
 assert.equal((await h.post(base+'/recovery/policy',policy)).status,201);
 const evidence=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body;
 const call=evidence.calls.find(c=>c.callId==='call-terminal-after-closed');assert.equal(evidence.calls.length,3);
 const plan=(await h.get(base+'/recovery')).body;
 const payload={actionId:'after-closed-action',ownerId:run.ownerId,policyId:policy.policyId,boundaryDigest:plan.boundaryDigest,action:'reconcile-reviewed-terminal',targetId:approval.operation_id,input:{nativeBoundaryDigest:evidence.nativeBoundaryDigest,review:{ownerId:run.ownerId,effect:'READ_ONLY',commandSha256:evidence.commandSha256,callId:call.callId,partDigest:call.partDigest,sourceFiles:[{path:'src/reviewed-cancel.py',sha256:createHash('sha256').update('# reviewed pure helper\n').digest('hex')}],evidenceRefs:['audit/current-read-after-closed-history']}}};
 return {h,run,old,approval,base,payload};
}
test('historique clos : deux aborted déjà réconciliés permettent un terminal unique sans transformer leur issue',async t=>{
 const{h,old,approval,base,payload}=await closedHistoryTerminalFixture(t);
 const result=await h.post(base+'/recovery/action',payload);assert.equal(result.status,200,JSON.stringify(result));
 const ops=(await h.get(base+'/operations')).body.operations;
 assert.equal(ops.find(x=>x.operationId===old.operation_id).state,'CANCELLED');assert.equal(ops.find(x=>x.operationId===old.operation_id).executionOutcome,'UNDETERMINED_READ_ONLY');
 assert.equal(ops.find(x=>x.operationId===approval.operation_id).state,'COMPLETED');assert.equal(h.native.replies.length,0);
 assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
 const store=JSON.parse(readFileSync(join(runtimeStateDirectory(h.directory), 'recovery-policies.json'),'utf8'));
 assert.equal(store.value.receipts.find(r=>r.actionId===payload.actionId).observation.excludedPriorReviews.length,4);
 await h.stop();await h.start();assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
});
for(const variant of ['unknown-call','changed-command','no-aborted','duplicate','changed-wrapper'])test('historique clos : refuse '+variant,async t=>{
 const{h,run,approval,base,payload}=await closedHistoryTerminalFixture(t);
 const oldShell=h.native.messages[run.sessionId].find(m=>m.nativeV2?.content?.[0]?.id==='review-call-a').nativeV2.content[0];
 if(variant==='unknown-call')oldShell.id='unknown-unreviewed-call';
 if(variant==='changed-command')oldShell.state.input.command='/usr/bin/false';
 if(variant==='no-aborted')oldShell.state.error={type:'unknown',message:'not a reviewed aborted boundary'};
 if(variant==='duplicate')h.native.messages[run.sessionId].push({nativeV2:{id:'msg_duplicate_old',type:'assistant',time:{created:Date.now()},content:[structuredClone(oldShell)]}});
 if(variant==='changed-wrapper'){
  const wrapper=h.native.messages[run.sessionId].flatMap(m=>m.parts||[]).find(p=>p.tool==='execute'&&p.state.input.code.includes('cancel_approval'));
  wrapper.state.input.code+=' return "changed";';
 }
 payload.input.nativeBoundaryDigest=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body.nativeBoundaryDigest;
 const result=await h.post(base+'/recovery/action',payload);assert.equal(result.status,409,JSON.stringify(result));
 assert.equal((await h.get(base+'/operations?operationId='+approval.operation_id)).body.operations[0].state,'PREPARED');assert.equal(h.native.replies.length,0);
});
async function unissuedWithdrawalFixture(t,decision='approved') {
 const h=await setup(t),run=await h.reserve('withdraw-unissued'),approval=h.approval(run,'withdraw-future-server'),base='/runs/'+run.runId;
 approval.commands=['node future-server.js'];h.native.messages[run.sessionId].at(-1).parts[0].state.input=structuredClone(approval);
 assert.equal((await h.post(base+'/validation/request',{approval})).status,202);
 assert.equal((await h.post(base+'/decision/'+approval.requestId,{decision})).status,201);
 const source=h.native.messages[run.sessionId].at(-1).parts[0];source.state.status='completed';source.state.output=JSON.stringify({...approval,status:decision.toUpperCase(),reviewer:'CGPT'});
 const policy={policyId:'withdraw-policy',ownerId:run.ownerId,version:run.version,actions:['withdraw-unissued-validation'],resources:run.resources,authorization:'same change; replace future server before issuing any native command'};
 assert.equal((await h.post(base+'/recovery/policy',policy)).status,201);
 const evidence=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body,plan=(await h.get(base+'/recovery')).body;
 assert.deepEqual(evidence.calls,[]);
 const payload={actionId:'withdraw-action',ownerId:run.ownerId,policyId:policy.policyId,boundaryDigest:plan.boundaryDigest,action:'withdraw-unissued-validation',targetId:approval.operation_id,input:{nativeBoundaryDigest:evidence.nativeBoundaryDigest,evidence:['audit/future-server-withdrawal']}};
 return{h,run,approval,base,payload};
}
test('retrait ciblé : reçu absent refuse le retrait sans modifier opération ou accès',async t=>{
 const {h,approval,base,payload}=await unissuedWithdrawalFixture(t,'approved');
 const evidence=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id+'&permissionId=per_missing')).body;
 assert.equal(evidence.replyError,'permission-reply-journal-unavailable');
 payload.input.nativeBoundaryDigest=evidence.nativeBoundaryDigest;payload.input.permissionId='per_missing';
 const result=await h.post(base+'/recovery/action',payload);
 assert.equal(result.status,409,JSON.stringify(result));
 assert.equal((await h.get(base+'/operations?operationId='+approval.operation_id)).body.operations[0].state,'PREPARED');
 assert.equal(h.native.replies.length,0);
});
test('retrait terminal rejeté sans émission : décision historique conservée, reprise sans once',async t=>{
 const{h,approval,base,payload}=await unissuedWithdrawalFixture(t,'rejected');
 const result=await h.post(base+'/recovery/action',payload);assert.equal(result.status,200,JSON.stringify(result));
 const check=async()=>{const op=(await h.get(base+'/operations?operationId='+approval.operation_id)).body.operations[0];
  assert.equal(op.state,'CANCELLED');assert.equal(op.decision.status,'rejected');assert.equal(op.native,null);assert.equal(op.nativeResult,null);
  assert.equal((await h.get(base+'/status')).body.hasUnresolvedValidation,false);assert.equal(h.native.replies.length,0)};
 await check();await h.stop();await h.start();await check();
 assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
});
for(const variant of ['effect','permission','busy','boundary','owner'])test('retrait rejeté sans émission : protège '+variant,async t=>{
 const{h,run,approval,base,payload}=await unissuedWithdrawalFixture(t,'rejected');
 if(variant==='effect')h.native.messages[run.sessionId].push({parts:[{type:'tool',tool:'bash',callID:'rejected-unexpected-effect',state:{status:'completed',input:{command:approval.commands[0]},metadata:{exit:0},output:'started'}}]});
 if(variant==='permission')h.native.permissions.push({id:'rejected-pending-permission',sessionID:run.sessionId,permission:'bash',metadata:{command:'/usr/bin/false'}});
 if(variant==='busy')h.native.busy[run.sessionId]={type:'busy'};
 if(variant==='boundary')payload.input.nativeBoundaryDigest='0'.repeat(64);
 if(variant==='owner')payload.ownerId='foreign-owner';
 assert.notEqual((await h.post(base+'/recovery/action',payload)).status,200);assert.equal(h.native.replies.length,0);
 assert.equal((await h.get(base+'/operations?operationId='+approval.operation_id)).body.operations[0].state,'PREPARED');
});
test('retrait non émis : aucun refus à fabriquer, approved conservé, aucune once/nativeResult/NO_EFFECT',async t=>{
 const{h,approval,base,payload}=await unissuedWithdrawalFixture(t);
 const result=await h.post(base+'/recovery/action',payload);assert.equal(result.status,200,JSON.stringify(result));
 assert.equal(result.body.state,'CANCELLED');assert.equal(result.body.executionOutcome,'COORDINATION_WITHDRAWN_BEFORE_ISSUANCE');
 const op=(await h.get(base+'/operations?operationId='+approval.operation_id)).body.operations[0];assert.equal(op.state,'CANCELLED');assert.equal(op.decision.status,'approved');assert.equal(op.native,null);assert.equal(op.nativeResult,null);assert.notEqual(op.onceAcknowledged,true);
 assert.equal((await h.get(base+'/status')).body.hasUnresolvedValidation,false);assert.equal(h.native.replies.length,0);
 assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
 await h.stop();await h.start();
 assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
 assert.equal((await h.get(base+'/operations?operationId='+approval.operation_id)).body.operations[0].executionOutcome,result.body.executionOutcome);
});
for(const variant of ['effect','permission','busy','access','once','boundary','owner','missing-evidence'])test('retrait non émis : refuse '+variant,async t=>{
 const{h,run,approval,base,payload}=await unissuedWithdrawalFixture(t);
 if(variant==='effect')h.native.messages[run.sessionId].push({parts:[{type:'tool',tool:'bash',callID:'unissued-unexpected-effect',state:{status:'completed',input:{command:approval.commands[0]},metadata:{exit:0},output:'started'}}]});
 if(variant==='permission')h.native.permissions.push({id:'unissued-pending-permission',sessionID:run.sessionId,permission:'bash',metadata:{command:'/usr/bin/false'}});
 if(variant==='busy')h.native.busy[run.sessionId]={type:'busy'};
 if(['access','once'].includes(variant))assert.equal((await h.post(base+'/locks/acquire',{version:run.version,operationId:approval.operation_id,operationDigest:approval.operation_digest,resources:approval.resources,expectedRevisions:approval.expected_revisions})).status,200);
 if(variant==='once')await h.execute(approval);
 if(variant==='boundary')payload.input.nativeBoundaryDigest='0'.repeat(64);
 if(variant==='owner')payload.ownerId='foreign-owner';
 if(variant==='missing-evidence')delete payload.input.evidence;
 if(['effect','permission','busy','access','once'].includes(variant)){
  payload.input.nativeBoundaryDigest=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body.nativeBoundaryDigest;
  payload.boundaryDigest=(await h.get(base+'/recovery')).body.boundaryDigest;
 }
 const result=await h.post(base+'/recovery/action',payload);assert.ok([403,409].includes(result.status),JSON.stringify(result));
 assert.notEqual((await h.get(base+'/operations?operationId='+approval.operation_id)).body.operations[0].state,'CANCELLED');
});

test('Code Mode brut : requête terminée avec erreur externe conserve sa corrélation sans décision',async t=>{
 const h=await setup(t),run=await h.reserve('outer-error-completed'),approval=h.approval(run,'outer-error-completed');
 approval.commands=[];approval.files=['src/outer-error-completed.py'];approval.tool_input_sha256='d'.repeat(64);
 const part=rawCodeModeValidationFailure(approval.requestId,approval,[{tool:'cgpt-validation.request_validation',status:'completed',input:approval}]);
 part.state.output=JSON.stringify({...approval,status:'PENDING'});
 h.native.messages[run.sessionId].at(-1).parts=[part];
 const response=await h.post('/validation/request',{approval});assert.equal(response.status,202,JSON.stringify(response));
 assert.equal((await h.get('/runs/'+run.runId+'/status')).body.undecidedValidationCount,1);
 assert.equal((await h.get('/runs/'+run.runId+'/decision/'+approval.requestId)).status,404);
 assert.equal(h.native.replies.length,0);
});
for(const variant of ['input','extra-tool','truncated','invalid-error-type'])test('Code Mode brut erreur externe : refuse '+variant,async t=>{
 const h=await setup(t),run=await h.reserve('outer-error-'+variant),approval=h.approval(run,'outer-error-'+variant);
 let calls=[{tool:'cgpt-validation.request_validation',status:'completed',input:structuredClone(approval)}];
 if(variant==='input')calls[0].input.operation_digest='0'.repeat(64);
 if(variant==='extra-tool')calls.unshift({tool:'bash',status:'completed',input:{command:'/usr/bin/true'}});
 const part=rawCodeModeValidationFailure(approval.requestId,approval,calls);
 if(variant==='truncated')part.state.metadata.truncated=true;
 if(variant==='invalid-error-type'){part.state.status='error';part.state.metadata.error='invalid';}
 h.native.messages[run.sessionId].at(-1).parts=[part];
 const response=await h.post('/validation/request',{approval});assert.equal(response.status,409,JSON.stringify(response));
 assert.equal((await h.get('/runs/'+run.runId+'/status')).body.undecidedValidationCount,0);assert.equal(h.native.replies.length,0);
});

test('Code Mode : résultat NOT_ADMITTED exact reste terminal malgré une corrélation d’input',async t=>{
 const h=await setup(t),run=await h.reserve('outer-error-terminal'),approval=h.approval(run,'outer-error-terminal');
 const part=rawCodeModeValidationFailure(approval.requestId,approval,[{tool:'cgpt-validation.request_validation',status:'completed',input:approval}]);
 part.state.output=JSON.stringify({...approval,status:'NOT_ADMITTED'});
 h.native.messages[run.sessionId].at(-1).parts=[part];
 const response=await h.post('/validation/request',{approval});assert.equal(response.status,409);
 assert.equal((await h.get('/runs/'+run.runId+'/status')).body.undecidedValidationCount,0);assert.equal(h.native.replies.length,0);
});
test('Code Mode canonique : retour littéral direct reste projeté malgré l’erreur externe',async t=>{
 const h=await setup(t),run=await h.reserve('canonical-outer-error'),approval=h.approval(run,'canonical-outer-error');
 const part=rawCodeModeValidationFailure(approval.requestId,approval,[{tool:'cgpt-validation.request_validation',status:'completed',input:approval}]);
 part.state.input.code='return await tools["cgpt-validation"].request_validation('+JSON.stringify(approval)+');';part.state.output=JSON.stringify({...approval,status:'PENDING'});
 h.native.messages[run.sessionId].at(-1).parts=[part];
 const observed=await h.nativeClient.messages(run.sessionId,h.directory);assert.equal(observed.at(-1).parts[0].tool,'cgpt-validation_request_validation');
 assert.equal((await h.post('/validation/request',{approval})).status,202);assert.equal(h.native.replies.length,0);
});

test('Code Mode brut : matrice des phases observées ne crée aucune autorisation',async t=>{
 for(const outer of ['running','completed','error'])for(const nested of ['running','completed','error'])for(const flag of [undefined,false,true]){
  const h=await setup(t),id='matrix-'+outer+'-'+nested+'-'+String(flag),run=await h.reserve(id),approval=h.approval(run,id);
  const p=rawCodeModeValidationFailure(id,approval,[{tool:'cgpt-validation.request_validation',status:nested,input:approval}]);
  p.state.status=outer;if(flag===undefined)delete p.state.metadata.error;else p.state.metadata.error=flag;
  p.state.output=JSON.stringify({...approval,status:'PENDING'});h.native.messages[run.sessionId].at(-1).parts=[p];
  const result=await h.post('/validation/request',{approval});assert.equal(result.status,202,id+JSON.stringify(result));
  assert.equal((await h.get('/runs/'+run.runId+'/decision/'+approval.requestId)).status,404);assert.equal(h.native.replies.length,0);await h.stop();
 }
});
test('visibilité native : attente bornée sur même notification puis admission sans requête neuve',async t=>{
 const h=await setup(t),run=await h.reserve('visibility'),approval=h.approval(run,'visibility-request'),saved=h.native.messages[run.sessionId];
 h.native.messages[run.sessionId]=[];
 const first=await h.post('/runs/'+run.runId+'/validation/request',{approval});assert.equal(first.status,503,JSON.stringify(first));assert.equal(first.body.error,'native-validation-evidence-unavailable');
 const diagnostic=(await h.get('/runs/'+run.runId+'/validation/correlation?requestId='+approval.requestId)).body.evidence;
 assert.equal(diagnostic.first.outcome,'EVIDENCE_UNAVAILABLE');assert.ok(diagnostic.first.snapshots.length<=4);assert.equal(diagnostic.first.snapshots[0].identifiedParts,0);
 assert.equal((await h.get('/runs/'+run.runId+'/decision/'+approval.requestId+'/admission')).body.owner_registered,false);
 h.native.messages[run.sessionId]=saved;
 const retry=await h.post('/runs/'+run.runId+'/validation/request',{approval});assert.equal(retry.status,202,JSON.stringify(retry));
 const after=(await h.get('/runs/'+run.runId+'/validation/correlation?requestId='+approval.requestId)).body.evidence;
 assert.equal(after.first.outcome,'EVIDENCE_UNAVAILABLE');assert.equal(after.latest.outcome,'MATCHED');assert.equal(after.notificationCount,2);assert.equal(h.native.replies.length,0);
 assert.equal(JSON.stringify(after).includes(approval.commands[0]),false);
});
test('visibilité native : preuve qui apparaît pendant le même POST ne provoque pas de refus terminal',async t=>{
 const h=await setup(t),run=await h.reserve('visibility-delayed'),approval=h.approval(run,'visibility-delayed'),saved=h.native.messages[run.sessionId];h.native.messages[run.sessionId]=[];
 const timer=setTimeout(()=>{h.native.messages[run.sessionId]=saved;},60);t.after(()=>clearTimeout(timer));
 const response=await h.post('/runs/'+run.runId+'/validation/request',{approval});assert.equal(response.status,202,JSON.stringify(response));
 const evidence=(await h.get('/runs/'+run.runId+'/validation/correlation?requestId='+approval.requestId)).body.evidence;
 assert.equal(evidence.first.outcome,'MATCHED');assert.ok(evidence.first.snapshots.length>=2);assert.equal(h.native.replies.length,0);
});
test('persistance : mode privé dérivé expose la cause et permet la même décision après restauration sûre',async t=>{
 const h=await setup(t),run=await h.reserve('communication-mode'),approval=h.approval(run,'communication-mode');
 assert.equal((await h.post('/runs/'+run.runId+'/validation/request',{approval})).status,202);
 const file=join(runtimeStateDirectory(h.directory), 'runs',run.runId,String(run.contextId),'controller-communication.json');
 const {chmodSync}=await import('node:fs');chmodSync(file,0o644);
 const failed=await h.post('/runs/'+run.runId+'/decision/'+approval.requestId,{decision:'approved'});assert.equal(failed.status,400);
 const status=(await h.get('/runs/'+run.runId+'/status')).body;assert.equal(status.communicationPersistence.available,false);assert.equal(status.communicationPersistence.error,'continuity-file-unsafe');
 assert.equal((await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0].decision,null);
 chmodSync(file,0o600);
 const prepared=await h.post('/transport/prepare',{transactionId:'update-communication-repaired'});assert.equal(prepared.status,200,JSON.stringify(prepared));
 assert.equal((await h.post('/transport/cancel',{transactionId:'update-communication-repaired'})).status,200);
 const retry=await h.post('/runs/'+run.runId+'/decision/'+approval.requestId,{decision:'approved'});assert.equal(retry.status,201,JSON.stringify(retry));
 assert.equal((await h.get('/runs/'+run.runId+'/status')).body.communicationPersistence.available,true);assert.equal(h.native.replies.length,0);
});
test('persistance : contenu ou séquence contradictoires ne sont pas écrasés par un réarmement',async t=>{
 const h=await setup(t),run=await h.reserve('communication-drift'),approval=h.approval(run,'communication-drift');
 assert.equal((await h.post('/runs/'+run.runId+'/validation/request',{approval})).status,202);
 const file=join(runtimeStateDirectory(h.directory), 'runs',run.runId,String(run.contextId),'controller-communication.json'),env=JSON.parse(readFileSync(file,'utf8'));env.sequence++;const changed=JSON.stringify(env)+'\n';writeFileSync(file,changed);
 assert.equal((await h.post('/runs/'+run.runId+'/decision/'+approval.requestId,{decision:'approved'})).status,400);
 assert.equal((await h.get('/runs/'+run.runId+'/status')).body.communicationPersistence.error,'continuity-state-changed');
 assert.equal((await h.post('/transport/prepare',{transactionId:'update-communication-drift'})).status,409);assert.equal(readFileSync(file,'utf8'),changed);assert.equal(h.native.replies.length,0);
});

test('migration privée : PENDING absent du checkpoint restauré avant activation, projet0775 inchangé',async t=>{
 const h=await setup(t),run=await h.reserve('private-migration',{resources:[{key:'file:src/private-read.md',mode:'read'}]});
 const directory=runtimeStateDirectory(h.directory),file=join(directory,'runs',run.runId,String(run.contextId),'controller-communication.json');
 await h.post('/transport/prepare',{transactionId:'empty-migration-checkpoint'});await h.post('/transport/cancel',{transactionId:'empty-migration-checkpoint'});
 const previous=readFileSync(file),approval=h.approval(run,'private-pending');
 assert.equal((await h.post('/validation/request',{approval})).status,202);
 const snapshot=(await h.get('/runs')).body,status=(await h.get('/status')).body;
 const pending=migrationPendingValidations(snapshot,status,new Map([[run.sessionId,h.native.messages[run.sessionId]]]));
 assert.equal(pending.length,1);await h.stop();writeFileSync(file,previous);
 const legacy=legacyStateDirectory(h.directory);cpSync(directory,legacy,{recursive:true});
 const files=[];const modes=path=>{chmodSync(path,0o775);for(const item of readdirSync(path,{withFileTypes:true})){const next=join(path,item.name);if(item.isDirectory())modes(next);else {chmodSync(next,0o775);files.push([next,readFileSync(next)]);}}};modes(legacy);
 rmSync(directory,{recursive:true});initializeRuntimeState(h.directory,directory);
 const transactionId='update-11111111-1111-4111-8111-111111111111';
 writeRuntimeJson(join(directory,'runtime-migration.json'),{protocol:RUNTIME_MIGRATION_PROTOCOL,transactionId,workspace:h.directory,
  phase:'PREPARED',registryDigest:migrationRegistryDigest(snapshot),nativeIdentity:{pid:process.pid,version:'2.2.0',directory:h.directory},pending});
 await h.start();
 const restored=(await h.get('/runs/'+run.runId+'/status')).body;
 assert.equal(restored.undecidedValidationCount,1);assert.equal(restored.communicationPersistence.available,true);
 assert.equal((await h.post('/runs/'+run.runId+'/decision/'+approval.requestId,{decision:'approved'})).status,503);
 assert.equal(h.native.replies.length,0);
 assert.equal((await h.post('/runtime/migration/activate',{transactionId:'update-wrong'})).status,409);
 await h.post('/broker/readiness',{status:'READY',pending_count:1,infrastructure_status:'READY',server_version:'2.4.6'});
 assert.equal((await h.post('/runtime/migration/activate',{transactionId})).status,200);
 assert.equal((await h.post('/runtime/migration/activate',{transactionId})).status,200);
 assert.equal((await h.post('/validation/request',{approval})).status,202);
 assert.equal((await h.post('/runs/'+run.runId+'/decision/'+approval.requestId,{decision:'approved'})).status,201);
 await h.execute(approval);
 assert.equal((await h.get('/runs')).body.coordination.operations[approval.operation_id].native.onceAcknowledged,true);
 for(const [path,bytes] of files){assert.equal(statSync(path).mode&0o777,0o775);assert.deepEqual(readFileSync(path),bytes);}
 assert.equal(statSync(file).mode&0o777,0o600);assert.equal(h.native.replies.length,1);
 await h.stop();await h.start();assert.equal((await h.get('/runtime/migration')).body.migration.phase,'ACTIVE');
});

test('création privée : job0600 et verrou public de projet0775 sous umask parent002',async t=>{
 const h=await setup(t),run=await h.reserve('private-create-mode');
 const job=join(runtimeStateDirectory(h.directory),'runs',run.runId,String(run.contextId),'controller-job.json');
 assert.equal(statSync(job).mode&0o777,0o600);
 assert.equal(statSync(join(legacyStateDirectory(h.directory),'registry.instance.lock')).mode&0o777,0o775);
 const approval=h.approval(run,'private-create-mode');assert.equal((await h.post('/validation/request',{approval})).status,202);
 assert.equal((await h.post('/runs/'+run.runId+'/decision/'+approval.requestId,{decision:'approved'})).status,201);
 assert.equal(statSync(job).mode&0o777,0o600);assert.equal(h.native.replies.length,0);
});

async function rejectedEditFixture(t,{attached=false,referenceOnly=false,lineEndingMismatch=false,dedicated=false,nativeWrite=false}={}){
 const h=await setup(t),file='src/refused.md',run=await h.reserve('refused-edit',{resources:[{key:'file:'+file,mode:'write'}]}),base='/runs/'+run.runId;
 let parent=null,access=null;
 if(attached){
  const first=await h.approvedEditAccess(run,'cancelled-edit-parent',file);parent=first.approval;
  await h.stop();await h.start();
  const reconciled=await h.post(base+'/locks/reconcile',{version:run.version,operationId:first.access.accessId,
   token:first.access.token,fencing:first.access.fencing,transactionId:'cancel-unissued-parent',evidence:['old unit was never issued']});
  assert.equal(reconciled.status,200,JSON.stringify(reconciled));access=reconciled.body;
  assert.equal((await h.post(base+'/job/progress',{jobId:'job-'+run.runId,currentCabMandate:''})).status,202);
  await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});
 }
 const approval=h.approval(run,'refused-edit-request'),input=nativeWrite?{path:join(h.directory,file),content:'new'}:{path:join(h.directory,file),oldString:'old',newString:'new'};
 if(attached)approval.access_id=access.accessId;
 approval.commands=[];approval.files=[file];approval.tool_input_sha256=nativeToolInputDigest(attached?{filePath:input.path,oldString:input.oldString,newString:input.newString}:{...input,replaceAll:false});h.native.messages[run.sessionId].at(-1).parts[0].state.input=structuredClone(approval);
 if(nativeWrite)approval.tool_input_sha256=nativeToolInputDigest({...input,content:'approved'});
 if(lineEndingMismatch)approval.tool_input_sha256=nativeToolInputDigest({...input,newString:input.newString+'\n'});
 h.native.messages[run.sessionId].at(-1).parts[0].state.input=structuredClone(approval);
 const admission=await h.post(base+'/validation/request',{approval});assert.equal(admission.status,202,JSON.stringify(admission));assert.equal((await h.post(base+'/decision/'+approval.requestId,{decision:'approved'})).status,201);
 if(dedicated){const acquired=await h.post(base+'/locks/acquire',{version:run.version,operationId:approval.operation_id,operationDigest:approval.operation_digest,resources:approval.resources,expectedRevisions:approval.expected_revisions});assert.equal(acquired.status,200,JSON.stringify(acquired));access=acquired.body;}
 if(attached&&!referenceOnly){const result=await h.post(base+'/locks/attach',{version:run.version,operationId:access.accessId,
  token:access.token,fencing:access.fencing,operationIds:[approval.operation_id],evidence:['new reviewed edit in same held set']});assert.equal(result.status,200,JSON.stringify(result));}
 wrapNativeRequestValidationInCodeMode(h,approval);const request=h.native.messages[run.sessionId].at(-1).parts[0];request.state.status='completed';request.state.output=JSON.stringify({...approval,status:'APPROVED',reviewer:'CGPT'});
 const stamp=Date.now();h.native.messages[run.sessionId].push({nativeV2:{id:'msg_refused_edit',type:'assistant',time:{created:stamp},content:[{type:'tool',id:'call_refused_edit',name:nativeWrite?'write':'edit',executed:false,time:{created:stamp,ran:stamp},state:{status:'running',input,content:[],metadata:{}}}]}});
 h.native.permissions.push({id:'per_refused_edit',sessionID:run.sessionId,permission:'edit',messageID:'msg_refused_edit',tool:{callID:'call_refused_edit'},metadata:{filepath:input.path}});
 await h.nativeClient.replyPermission(run.sessionId,'per_refused_edit','reject',h.directory);
 const part=h.native.messages[run.sessionId].at(-1).nativeV2.content[0];part.state.status='error';part.state.error={type:'aborted',message:'synthetic explicit permission rejection'};part.time.completed=Date.now()+1;
 await h.post(base+'/recovery/policy',{policyId:'refused-edit-policy',ownerId:run.ownerId,version:run.version,actions:['withdraw-unissued-validation'],resources:run.resources,authorization:'approved change; retire rejected edit only'});
 const evidence=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body,plan=(await h.get(base+'/recovery')).body;
 const payload={actionId:'withdraw-refused-edit',ownerId:run.ownerId,policyId:'refused-edit-policy',boundaryDigest:plan.boundaryDigest,action:'withdraw-unissued-validation',targetId:approval.operation_id,input:{nativeBoundaryDigest:evidence.nativeBoundaryDigest,evidence:['audit/rejected-edit']}};
 return{h,run,base,approval,payload,evidence,parent,access};
}
test('retrait write : atelier non vérifié refuse le retrait et conserve accès',async t=>{
 const {h,run,base,approval,payload,access}=await rejectedEditFixture(t,{nativeWrite:true,dedicated:true});
 const input={directory:h.directory,session_id:run.sessionId,run_id:run.runId,change_id:run.changeId,reservation_version:run.version,request_id:'atelier_invalid',argv:['true']};
 const result={requestId:input.request_id,runId:run.runId,sessionId:run.sessionId,changeId:run.changeId,input_sha256:canonicalContinuityDigest(input),status:'COMPLETED',exitCode:0,requires_orchestrator_validation:true,outputPath:join(h.directory,'outside.log')};
 h.native.messages[run.sessionId].push({parts:[{type:'tool',id:'atelier-invalid',name:'execute',tool:'execute',executed:false,time:{created:Date.now()},state:{status:'completed',input:{code:'return await tools["cgpt-validation"].atelier_execute('+JSON.stringify(input)+');'},output:JSON.stringify(result),time:{start:Date.now(),end:Date.now()+1},metadata:{truncated:false,toolCalls:[{tool:'cgpt-validation.atelier_execute',status:'completed',input}]}}}]});
 const evidence=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id+'&permissionId=per_refused_edit')).body;
 payload.input.permissionId='per_refused_edit';payload.input.nativeBoundaryDigest=evidence.nativeBoundaryDigest;
 const before=(await h.get('/runs')).body.coordination.accesses[access.accessId];
 assert.equal((await h.post(base+'/recovery/action',payload)).status,409);
 assert.deepEqual((await h.get('/runs')).body.coordination.accesses[access.accessId],before);
});
test('retrait ciblé : ancien PID encore vivant interdit la preuve de redémarrage',async t=>{
 const {h,base,approval,payload}=await rejectedEditFixture(t,{nativeWrite:true,dedicated:true});
 const old=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});t.after(()=>old.kill('SIGKILL'));
 await new Promise((resolve,reject)=>{old.once('spawn',resolve);old.once('error',reject)});
 const dir=join(runtimeStateDirectory(h.directory),'permission-replies');
 for(const file of readdirSync(dir)){const path=join(dir,file),envelope=JSON.parse(readFileSync(path,'utf8'));
  if(envelope.value?.permissionId==='per_refused_edit'){envelope.value.nativePid=old.pid;envelope.digest=canonicalContinuityDigest(envelope.value);writeFileSync(path,JSON.stringify(envelope)+'\n',{mode:0o600});}}
 const evidence=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id+'&permissionId=per_refused_edit')).body;
 assert.equal(evidence.nativeRestartEvidence,undefined);payload.input.permissionId='per_refused_edit';payload.input.nativeBoundaryDigest=evidence.nativeBoundaryDigest;
 assert.equal((await h.post(base+'/recovery/action',payload)).status,409);
 assert.equal((await h.get('/runs')).body.coordination.operations[approval.operation_id].state,'PREPARED');
});
test('retrait write ciblé : reçu exact valide malgré enveloppe étrangère invalide',async t=>{
 const {h,run,base,approval,payload,access}=await rejectedEditFixture(t,{nativeWrite:true,dedicated:true});
 const dir=join(runtimeStateDirectory(h.directory),'permission-replies'),unknown=join(dir,'a'.repeat(64)+'.json');
 for (const file of readdirSync(dir)) {
  const path=join(dir,file),envelope=JSON.parse(readFileSync(path,'utf8'));
  if(envelope.value?.permissionId==='per_refused_edit') { envelope.value.nativePid=2147483647;
   envelope.digest=canonicalContinuityDigest(envelope.value);writeFileSync(path,JSON.stringify(envelope)+'\n',{mode:0o600}); }
 }
 writeFileSync(unknown,JSON.stringify({digest:'b'.repeat(64)}),{mode:0o600});
 const atelierInput={directory:h.directory,session_id:run.sessionId,run_id:run.runId,change_id:run.changeId,reservation_version:run.version,request_id:'atelier_after_write',argv:['true']};
 const atelierResult={requestId:atelierInput.request_id,runId:run.runId,sessionId:run.sessionId,changeId:run.changeId,input_sha256:canonicalContinuityDigest(atelierInput),status:'COMPLETED',exitCode:0,requires_orchestrator_validation:true};
 atelierResult.outputPath=join(h.directory,'.cab-tests',run.changeId,run.runId,'.cab-result-'+atelierResult.input_sha256+'.log');
 const statusInput={directory:h.directory,session_id:run.sessionId,run_id:run.runId,change_id:run.changeId,reservation_version:run.version,request_id:atelierInput.request_id};
 const wrapper=(id,method,input,output)=>({type:'tool',id,name:'execute',tool:'execute',executed:false,time:{created:Date.now()},state:{status:'completed',input:{code:'return await tools["cgpt-validation"].'+method+'('+JSON.stringify(input)+');'},output:JSON.stringify(output),time:{start:Date.now(),end:Date.now()+1},metadata:{truncated:false,toolCalls:[{tool:'cgpt-validation.'+method,status:'completed',input}]}}});
 h.native.messages[run.sessionId].push({parts:[wrapper('atelier-execute','atelier_execute',atelierInput,atelierResult)]},
  {parts:[wrapper('atelier-status','atelier_status',statusInput,{...atelierResult,found:true})]});
 h.native.messages[run.sessionId].push({nativeV2:{id:'msg-truncated-read',type:'assistant',time:{created:Date.now()},content:[{
  type:'tool',id:'call-truncated-read',name:'read',executed:false,time:{created:Date.now(),ran:Date.now(),completed:Date.now()+1},
  state:{status:'completed',input:{path:join(h.directory,'src/refused.md'),limit:10},output:'partial',metadata:{truncated:true}}}]}});
 const global=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body;
 assert.equal(global.replyError,'permission-reply-journal-unavailable');
 const targeted=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id+'&permissionId=per_refused_edit')).body;
 assert.equal(targeted.replyError,null);assert.equal(targeted.replyScopePermissionId,'per_refused_edit');
 assert.equal(targeted.replyReceipts[0].state,'ACKNOWLEDGED');
 assert.equal(targeted.nativeRestartEvidence?.kind,'previous-process-absent');
 const wrong=structuredClone(payload);wrong.actionId='withdraw-wrong-permission';wrong.input.permissionId='per_other';wrong.input.nativeBoundaryDigest=targeted.nativeBoundaryDigest;
 assert.equal((await h.post(base+'/recovery/action',wrong)).status,409);
 assert.equal((await h.get('/runs')).body.coordination.operations[approval.operation_id].state,'PREPARED');
 payload.input.permissionId='per_refused_edit';payload.input.nativeBoundaryDigest=targeted.nativeBoundaryDigest;
 const before=(await h.get('/runs')).body.coordination.accesses[access.accessId];
 const result=await h.post(base+'/recovery/action',payload);
 assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.state,'CANCELLED');
 assert.deepEqual((await h.get('/runs')).body.coordination.accesses[access.accessId],before);
 assert.equal(h.native.replies.length,1);assert.equal(existsSync(unknown),true);
});
test('retrait edit refusé : CANCELLED coordonnée, APPROVED conservé, reprise idempotente après redémarrage',async t=>{
 const{h,run,base,approval,payload,evidence}=await rejectedEditFixture(t);assert.equal(evidence.calls[0].tool,'edit');assert.equal(evidence.replyReceipts[0].state,'ACKNOWLEDGED');
 const result=await h.post(base+'/recovery/action',payload);assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.state,'CANCELLED');
 const op=(await h.get('/runs')).body.coordination.operations[approval.operation_id];assert.equal(op.state,'CANCELLED');assert.equal(op.decision.status,'approved');assert.equal(op.native,undefined);assert.equal(op.nativeResult,undefined);assert.equal(h.native.replies.length,1);assert.equal(h.native.replies[0].body.response,'reject');
 assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);await h.stop();await h.start();assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
 await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});
 const next=h.approval(run,'after-refused-edit');assert.equal((await h.post(base+'/validation/request',{approval:next})).status,202);
});

for(const kind of ['missing-ack','wrong-native-error','extra-request-effect'])test('retrait edit refusé : garde '+kind+' sans mutation',async t=>{
 const{h,base,approval,payload}=await rejectedEditFixture(t);
 if(kind==='missing-ack'){
  const dir=join(runtimeStateDirectory(h.directory),'permission-replies');for(const file of readdirSync(dir))unlinkSync(join(dir,file));
 }else if(kind==='wrong-native-error')h.native.messages[approval.session_id].at(-1).nativeV2.content[0].state.error.type='ToolError';
 else h.native.messages[approval.session_id][0].parts[0].state.metadata.toolCalls.push({tool:'opencode.shell',status:'completed',input:{command:'unknown extra effect'}});
 payload.input.nativeBoundaryDigest=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body.nativeBoundaryDigest;
 payload.boundaryDigest=(await h.get(base+'/recovery')).body.boundaryDigest;
 const result=await h.post(base+'/recovery/action',payload);assert.equal(result.status,409,JSON.stringify(result));
 const op=(await h.get('/runs')).body.coordination.operations[approval.operation_id];assert.equal(op.state,'PREPARED');assert.equal(op.decision.status,'approved');assert.equal(op.native,undefined);assert.equal(h.native.replies.length,1);
});

test('retrait edit refusé : recherche de catalogue dans le wrapper reste une observation',async t=>{
 const{h,base,approval,payload}=await rejectedEditFixture(t);const request=h.native.messages[approval.session_id][0].parts[0];request.state.metadata.toolCalls.unshift({tool:'search',status:'completed',input:{namespace:'cgpt-validation',query:'request_validation'}});
 request.state.input.code='const schema=search({namespace:"cgpt-validation",query:"request_validation"}); '+request.state.input.code;
 payload.input.nativeBoundaryDigest=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body.nativeBoundaryDigest;payload.boundaryDigest=(await h.get(base+'/recovery')).body.boundaryDigest;
 const result=await h.post(base+'/recovery/action',payload);assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.state,'CANCELLED');assert.equal(h.native.replies.length,1);
});

async function rejectedAttachedShellFixture(t){
 const h=await setup(t),run=await h.reserve('attached-shell'),base='/runs/'+run.runId;
 const {approval:parent,access}=await h.approvedAccess(run,'attached-parent');
 await h.execute(parent);await h.completeTool(parent,124,{nativeShell:true});
 const all=(await h.get('/runs')).body,rev=all.coordination.revisions;
 const approval=h.approval(run,'attached-refused',Object.fromEntries(run.resources.map(r=>[r.key,rev[r.key]||0])));
 approval.access_id=access.accessId;approval.commands=['/usr/bin/true; /usr/bin/true'];
 h.native.messages[run.sessionId].at(-1).parts[0].state.input=structuredClone(approval);
 assert.equal((await h.post(base+'/validation/request',{approval})).status,202);
 assert.equal((await h.post(base+'/decision/'+approval.requestId,{decision:'approved'})).status,201);
 assert.equal((await h.post(base+'/locks/attach',{version:run.version,operationId:access.accessId,token:access.token,fencing:access.fencing,operationIds:[approval.operation_id],evidence:['same held set']})).status,200);
 wrapNativeRequestValidationInCodeMode(h,approval);const request=h.native.messages[run.sessionId].at(-1).parts[0];request.state.status='completed';request.state.output=JSON.stringify({...approval,status:'APPROVED',reviewer:'CGPT'});
 const stamp=Date.now(),input={command:approval.commands[0],workdir:h.directory};
 h.native.messages[run.sessionId].push({info:{id:'msg_attached_refused'},nativeV2:{id:'msg_attached_refused',type:'assistant',time:{created:stamp},content:[{type:'tool',id:'call_attached_refused',name:'shell',executed:false,time:{created:stamp,ran:stamp},state:{status:'running',input,content:[],metadata:{}}}]}});
 h.native.permissions.push({id:'per_attached_refused',sessionID:run.sessionId,permission:'shell',resources:['/usr/bin/true','/usr/bin/true'],messageID:'msg_attached_refused',tool:{callID:'call_attached_refused'},metadata:{command:input.command}});
 await h.nativeClient.replyPermission(run.sessionId,'per_attached_refused','reject',h.directory);
 const part=h.native.messages[run.sessionId].at(-1).nativeV2.content[0];part.state.status='error';part.state.error={type:'aborted',message:'synthetic explicit permission rejection'};part.time.completed=Date.now()+1;
 await h.post(base+'/recovery/policy',{policyId:'attached-policy',ownerId:run.ownerId,version:run.version,actions:['withdraw-unissued-validation'],resources:run.resources,authorization:'same change; only retire refused child, protect parent'});
 const evidence=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body,plan=(await h.get(base+'/recovery')).body;
 const payload={actionId:'withdraw-attached-shell',ownerId:run.ownerId,policyId:'attached-policy',boundaryDigest:plan.boundaryDigest,action:'withdraw-unissued-validation',targetId:approval.operation_id,input:{nativeBoundaryDigest:evidence.nativeBoundaryDigest,evidence:['audit/rejected-attached-shell']}};
 const stageText='printf "new reviewed inspection\\n"\n',stage={stageId:'after-attached-stage',jobId:'job-'+run.runId,sessionId:run.sessionId,reservationVersion:run.version,requestId:'new-inspect-request',approvalId:'new-inspect-approval',operationId:'new-inspect-operation',payload:stageText,payloadSha256:createHash('sha256').update(stageText).digest('hex')};
 return{h,run,base,parent,approval,access,payload,stage};
}
test('shell attaché refusé : retrait ciblé, parent HELD identique, staging débloqué et reçu durable',async t=>{
 const{h,run,base,parent,approval,access,payload,stage}=await rejectedAttachedShellFixture(t);
 assert.equal((await h.post(base+'/shell-stage',stage)).body.error,'shell-stage-boundary-invalid');
 const before=(await h.get('/runs')).body.coordination;
 const result=await h.post(base+'/recovery/action',payload);assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.state,'CANCELLED');
 const after=(await h.get('/runs')).body.coordination,child=after.operations[approval.operation_id];
 assert.deepEqual(after.accesses,before.accesses);assert.deepEqual(after.operations[parent.operation_id],before.operations[parent.operation_id]);assert.deepEqual(after.revisions,before.revisions);assert.deepEqual(after.testReservations,before.testReservations);
 assert.equal(child.state,'CANCELLED');assert.deepEqual(child.decision,before.operations[approval.operation_id].decision);assert.equal(child.native,undefined);assert.equal(child.nativeResult,undefined);
 assert.equal((await h.get(base+'/status')).body.hasUnresolvedValidation,false);
 assert.equal((await h.post(base+'/shell-stage',stage)).status,201);
 assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
 await h.stop();await h.start();assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
 assert.deepEqual((await h.get('/runs')).body.coordination.accesses,before.accesses);
 await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});
 const replies=h.native.replies.length;
 h.native.permissions.push({id:'late-attached-permission',sessionID:run.sessionId,permission:'bash',tool:{callID:'late-attached-call'},metadata:{command:approval.commands[0]}});
 await delay(100);assert.equal(h.native.replies.length,replies,'no once for cancelled child');
 h.native.permissions=[];
 const next=h.approval(run,'new-attached-inspection',approval.expected_revisions);next.access_id=access.accessId;
 h.native.messages[run.sessionId].at(-1).parts[0].state.input=structuredClone(next);
 const nextResult=await h.post(base+'/validation/request',{approval:next});assert.equal(nextResult.status,202,JSON.stringify(nextResult));
 assert.equal((await h.post(base+'/decision/'+next.requestId,{decision:'approved'})).status,201);
});
for(const variant of ['missing-ack','different-command','busy','pending-permission','extra-effect','boundary'])test('shell attaché : refus '+variant+' conserve parent et enfant',async t=>{
 const{h,run,base,approval,payload}=await rejectedAttachedShellFixture(t);
 if(variant==='missing-ack'){const d=join(runtimeStateDirectory(h.directory),'permission-replies');for(const f of readdirSync(d))unlinkSync(join(d,f));}
 if(variant==='different-command')h.native.messages[run.sessionId].at(-1).nativeV2.content[0].state.input.command='different';
 if(variant==='busy')h.native.busy[run.sessionId]={type:'busy'};
 if(variant==='pending-permission')h.native.permissions.push({id:'unrelated-pending',sessionID:run.sessionId,permission:'bash',metadata:{command:'/usr/bin/false'}});
 if(variant==='extra-effect')h.native.messages[run.sessionId].push({parts:[{type:'tool',tool:'bash',state:{status:'completed',input:{command:'/usr/bin/true'},metadata:{exit:0}}}]});
 payload.input.nativeBoundaryDigest=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body.nativeBoundaryDigest;
 if(variant==='boundary')payload.input.nativeBoundaryDigest='0'.repeat(64);
 payload.boundaryDigest=(await h.get(base+'/recovery')).body.boundaryDigest;
 const before=(await h.get('/runs')).body.coordination;
 const result=await h.post(base+'/recovery/action',payload);assert.equal(result.status,409,JSON.stringify(result));
 assert.deepEqual((await h.get('/runs')).body.coordination,before);
});

async function notAdmittedFixture(t){
 const h=await setup(t),run=await h.reserve('not-admitted'),approval=h.approval(run,'not-admitted-request'),base='/runs/'+run.runId;
 assert.equal((await h.post(base+'/validation/request',{approval})).status,202);
 wrapNativeRequestValidationInCodeMode(h,approval);
 const request=h.native.messages[run.sessionId].at(-1).parts[0];request.state.input.code='return await tools["cgpt-validation"].request_validation('+JSON.stringify(approval)+');';request.state.status='completed';request.state.metadata.error=true;request.state.metadata.toolCalls.at(-1).status='error';request.state.output='MCP error APPROVAL_NOT_ADMITTED';
 const stamp=Date.now();h.native.messages[run.sessionId].push({parts:[{type:'tool',tool:'cgpt-validation_get_approval',callID:'not-admitted-get',state:{status:'completed',input:{approval_id:approval.approval_id},output:JSON.stringify({...approval,status:'NOT_ADMITTED',not_admitted_at:new Date(stamp-1000).toISOString(),notification_status:'FAILED',notification_diagnostic:{http_status:409,error_code:'coordination-upgrade-required'}}),metadata:{truncated:false},time:{start:stamp-1,end:stamp}}}]});
 await h.post(base+'/recovery/policy',{policyId:'not-admitted-policy',ownerId:run.ownerId,version:run.version,actions:['withdraw-unissued-validation'],resources:run.resources,authorization:'same change; retire terminal broker preparation without decision'});
 const evidence=await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id);assert.equal(evidence.status,200,JSON.stringify(evidence));
 const plan=(await h.get(base+'/recovery')).body,payload={actionId:'withdraw-not-admitted',ownerId:run.ownerId,policyId:'not-admitted-policy',boundaryDigest:plan.boundaryDigest,action:'withdraw-unissued-validation',targetId:approval.operation_id,input:{nativeBoundaryDigest:evidence.body.nativeBoundaryDigest,evidence:['audit/terminal-not-admitted']}};
 return{h,run,approval,base,payload};
}
test('NOT_ADMITTED : préparation sans décision retirée, reçu durable et nouveau mandat distinct',async t=>{
 const{h,run,approval,base,payload}=await notAdmittedFixture(t),before=(await h.get('/runs')).body.coordination;
 const result=await h.post(base+'/recovery/action',payload);assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.state,'CANCELLED');
 const after=(await h.get('/runs')).body.coordination,op=after.operations[approval.operation_id];assert.equal(op.state,'CANCELLED');assert.equal(op.decision,undefined);assert.equal(op.native,undefined);assert.equal(op.nativeResult,undefined);assert.deepEqual(after.accesses,before.accesses);assert.deepEqual(after.revisions,before.revisions);assert.deepEqual(after.testReservations,before.testReservations);assert.equal((await h.get(base+'/status')).body.hasUnresolvedValidation,false);
 assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);await h.stop();await h.start();assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
 await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});
 h.native.permissions.push({id:'late-not-admitted-permission',sessionID:run.sessionId,permission:'bash',tool:{callID:'late-not-admitted-call'},metadata:{command:approval.commands[0]}});await delay(80);assert.equal(h.native.replies.length,0);h.native.permissions=[];
 const next=h.approval(run,'new-after-not-admitted');const admitted=await h.post(base+'/validation/request',{approval:next});assert.equal(admitted.status,202,JSON.stringify(admitted));assert.equal((await h.post(base+'/decision/'+next.requestId,{decision:'approved'})).status,201);
});
for(const variant of ['pending','foreign','stale','effect','access','decision','boundary'])test('NOT_ADMITTED : retrait refusé '+variant,async t=>{
 const{h,run,approval,base,payload}=await notAdmittedFixture(t),part=h.native.messages[run.sessionId].at(-1).parts[0];
 if(variant==='pending'){const v=JSON.parse(part.state.output);v.status='PENDING';part.state.output=JSON.stringify(v);}
 if(variant==='foreign'){const v=JSON.parse(part.state.output);v.operation_digest='0'.repeat(64);part.state.output=JSON.stringify(v);}
 if(variant==='stale')part.state.time.end=Date.now()-400000;
 if(variant==='effect')h.native.messages[run.sessionId].push({parts:[{type:'tool',tool:'bash',state:{status:'completed',input:{command:'/usr/bin/true'},metadata:{exit:0}}}]});
 if(['access','decision'].includes(variant)){
  assert.equal((await h.post(base+'/decision/'+approval.requestId,{decision:'approved'})).status,201);
  if(variant==='decision'){const request=h.native.messages[run.sessionId].find(m=>m.parts?.some(p=>p.tool==='execute'&&p.state?.input?.code?.includes(approval.requestId))).parts[0];request.state.metadata.error=false;request.state.metadata.toolCalls.at(-1).status='completed';request.state.output=JSON.stringify({...approval,status:'PENDING'});}
  if(variant==='access')assert.equal((await h.post(base+'/locks/acquire',{version:run.version,operationId:approval.operation_id,operationDigest:approval.operation_digest,resources:approval.resources,expectedRevisions:approval.expected_revisions})).status,200);
 }
 const evidence=await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id);
 if(evidence.status===200)payload.input.nativeBoundaryDigest=evidence.body.nativeBoundaryDigest;
 if(variant==='boundary')payload.input.nativeBoundaryDigest='0'.repeat(64);
 payload.boundaryDigest=(await h.get(base+'/recovery')).body.boundaryDigest;
 const before=(await h.get('/runs')).body.coordination,result=await h.post(base+'/recovery/action',payload);assert.ok([403,409].includes(result.status),JSON.stringify(result));assert.deepEqual((await h.get('/runs')).body.coordination,before);assert.equal(h.native.replies.length,0);
});
test('readiness broker absente après redémarrage :503 réessayable, même demande admise après readiness',async t=>{
 const h=await setup(t),run=await h.reserve('broker-transition');await h.stop();await h.start();const approval=h.approval(run,'during-broker-transition');
 const first=await h.post('/validation/resource-request',{approval});assert.equal(first.status,503,JSON.stringify(first));assert.equal(first.body.error,'broker-coordination-not-ready');
 const legacy=await h.post('/validation/resource-request',{approval:{...approval,coordination_protocol:'legacy'}});assert.equal(legacy.status,409);assert.equal(legacy.body.error,'coordination-upgrade-required');
 await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});
 const second=await h.post('/validation/resource-request',{approval});assert.equal(second.status,202,JSON.stringify(second));assert.equal(h.native.replies.length,0);
});
test('readiness absente : notification répétée conserve la préparation déjà admise',async t=>{
 const h=await setup(t),run=await h.reserve('broker-existing'),approval=h.approval(run,'existing-broker-request'),base='/runs/'+run.runId;
 assert.equal((await h.post('/validation/resource-request',{approval})).status,202);
 const before=(await h.get('/runs')).body.coordination.operations[approval.operation_id];
 await h.stop();await h.start();
 const retry=await h.post('/validation/resource-request',{approval});assert.equal(retry.status,503,JSON.stringify(retry));assert.equal(retry.body.error,'broker-coordination-not-ready');
 assert.deepEqual((await h.get('/runs')).body.coordination.operations[approval.operation_id],before);
 const admission=(await h.get(base+'/decision/'+approval.requestId+'/admission')).body;assert.equal(admission.owner_registered,true);assert.equal(admission.validation_registered,true);assert.equal(admission.decision_recorded,false);
 await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});
 const resumed=await h.post('/validation/resource-request',{approval});assert.ok([200,202].includes(resumed.status),JSON.stringify(resumed));assert.equal(h.native.replies.length,0);
 assert.equal((await h.get('/runs')).body.coordination.operations[approval.operation_id].decision,undefined);
});

test('edit attaché refusé : parent annulé, retrait isolé et reçu durable',async t=>{
 const{h,run,base,approval,payload,parent,access}=await rejectedEditFixture(t,{attached:true});
 const plan=(await h.get(base+'/recovery')).body;assert.ok(plan.actions.some(o=>o.action==='withdraw-unissued-validation'&&o.targetId===approval.operation_id),JSON.stringify(plan.actions));
 const before=(await h.get('/runs')).body.coordination;
 const result=await h.post(base+'/recovery/action',payload);assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.state,'CANCELLED');
 const after=(await h.get('/runs')).body.coordination,child=after.operations[approval.operation_id];
 assert.deepEqual(after.accesses,before.accesses);assert.deepEqual(after.operations[parent.operation_id],before.operations[parent.operation_id]);
 assert.deepEqual(after.revisions,before.revisions);assert.deepEqual(after.testReservations,before.testReservations);
 assert.equal(child.state,'CANCELLED');assert.deepEqual(child.decision,before.operations[approval.operation_id].decision);
 assert.equal(child.native,undefined);assert.equal(child.nativeResult,undefined);assert.equal(h.native.replies.length,1);assert.equal(h.native.replies[0].body.response,'reject');
 assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
 await h.stop();await h.start();assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
 assert.deepEqual((await h.get('/runs')).body.coordination.accesses,before.accesses);
 h.native.permissions.push({id:'late-rejected-edit',sessionID:run.sessionId,permission:'edit',tool:{callID:'late-edit'},metadata:{filepath:join(h.directory,'src/refused.md')}});
 await delay(100);assert.equal(h.native.replies.filter(r=>r.body.response==='once').length,0);h.native.permissions=[];
});

for(const kind of ['missing-ack','busy','pending-permission'])test('edit attaché refusé : preuve '+kind+' refusée sans mutation',async t=>{
 const{h,run,base,approval,payload}=await rejectedEditFixture(t,{attached:true});
 if(kind==='missing-ack'){const dir=join(runtimeStateDirectory(h.directory),'permission-replies');for(const f of readdirSync(dir))unlinkSync(join(dir,f));}
 if(kind==='busy')h.native.busy[run.sessionId]={type:'busy'};
 if(kind==='pending-permission')h.native.permissions.push({id:'other-permission',sessionID:run.sessionId,permission:'edit',metadata:{filepath:join(h.directory,'other.md')}});
 payload.input.nativeBoundaryDigest=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body.nativeBoundaryDigest;
 payload.boundaryDigest=(await h.get(base+'/recovery')).body.boundaryDigest;
 const before=(await h.get('/runs')).body.coordination;
 assert.equal((await h.post(base+'/recovery/action',payload)).status,409);
 assert.deepEqual((await h.get('/runs')).body.coordination,before);assert.equal(h.native.replies.filter(r=>r.body.response==='once').length,0);
});

for(const variant of ['native-read','native-read-window','unlinked-read','executed','running','error','extra-input','invalid-window','truncated','spoofed-tool','write','extra-shell'])test('retrait edit et lecture native : '+variant,async t=>{
 const{h,run,base,approval,payload}=await rejectedEditFixture(t,{attached:variant!=='unlinked-read'});
 const stamp=Date.now(),read={type:'tool',id:'read_after_rejected_edit',name:'read',executed:false,time:{created:stamp,ran:stamp,completed:stamp+1},state:{status:'completed',input:{path:join(h.directory,'notes.md')},content:[{type:'text',text:'synthetic observation'}],metadata:{}}};
 if(variant==='native-read-window')Object.assign(read.state.input,{offset:0,limit:20});
 if(variant==='executed')read.executed=true;
 if(variant==='running')read.state.status='running';
 if(variant==='error')read.state.status='error';
 if(variant==='extra-input')read.state.input.command='/usr/bin/true';
 if(variant==='invalid-window')read.state.input.limit=-1;
 if(variant==='truncated')read.state.metadata.truncated=true;
 if(variant==='write'){read.name='write';read.state.metadata.nativeTool='read';read.state.input.content='mutating tool remains an effect';}
 if(variant==='spoofed-tool'){read.name='plugin_read';Object.assign(read.state.metadata,{nativeFormat:'opencode-v2',nativeTool:'read'});}
 h.native.messages[run.sessionId].push({nativeV2:{id:'msg_read_after_edit',type:'assistant',time:{created:stamp},content:[read]}});
 if(variant==='extra-shell')h.native.messages[run.sessionId].push({parts:[{type:'tool',tool:'bash',callID:'extra-effect',state:{status:'completed',input:{command:'/usr/bin/true'},metadata:{exit:0}}}]});
 payload.input.nativeBoundaryDigest=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body.nativeBoundaryDigest;
 payload.boundaryDigest=(await h.get(base+'/recovery')).body.boundaryDigest;
 const before=(await h.get('/runs')).body.coordination,result=await h.post(base+'/recovery/action',payload);
 const accepted=['native-read','native-read-window','unlinked-read'].includes(variant);
 assert.equal(result.status,accepted?200:409,JSON.stringify(result));
 const after=(await h.get('/runs')).body.coordination;
 assert.deepEqual(after.accesses,before.accesses);assert.deepEqual(after.revisions,before.revisions);assert.deepEqual(after.testReservations,before.testReservations);
 if(accepted){assert.equal(after.operations[approval.operation_id].state,'CANCELLED');assert.deepEqual(after.operations[approval.operation_id].decision,before.operations[approval.operation_id].decision);}
 else assert.deepEqual(after,before);
 assert.equal(h.native.replies.filter(r=>r.body.response==='once').length,0);
});

for(const variant of ['reported','trailing-space','tabs','compact','diagnostics','get-only-proof','poll-only-proof','reordered-metadata','extra-argument','executed','second-cancel','diagnostic-effect','diagnostic-truncated','diagnostic-running','diagnostic-empty','string-space','merged-word','comment','extra-code','operator','different-id','return-newline','throw-newline','oversize'])test('annulation native formatée : '+variant,async t=>{
 const h=await setup(t),run=await h.reserve('cancel-format-'+variant),base='/runs/'+run.runId,approval=h.approval(run,'cancel-format-'+variant);
 assert.equal((await h.post(base+'/validation/request',{approval})).status,202);wrapNativeRequestValidationInCodeMode(h,approval);appendNativeCodeModeCancelledTranscript(h,approval);
 const messages=h.native.messages[run.sessionId],cancel=messages.at(-1).parts[0];
 if(['get-only-proof','poll-only-proof'].includes(variant)){
  const tool=variant==='get-only-proof'?'get_approval':'poll_approval';
  cancel.state.metadata.toolCalls=[{tool:'cgpt-validation.'+tool,status:'completed',input:{approval_id:approval.approval_id},output:cancel.state.output}];
  cancel.state.input.code='return await tools["cgpt-validation"].'+tool+'({approval_id:'+JSON.stringify(approval.approval_id)+'});';
 }
 if(variant==='reordered-metadata')cancel.state.metadata.toolCalls[0].input={limit:20,namespace:'cgpt-validation',query:'cancel_approval'};
 if(variant==='extra-argument')cancel.state.metadata.toolCalls[1].input.extra=true;
 if(variant==='executed')cancel.executed=true;
 if(variant==='second-cancel')cancel.state.metadata.toolCalls.push(structuredClone(cancel.state.metadata.toolCalls[1]));
 if(variant==='reported')cancel.state.input.code='const r = await search({ query: "cancel_approval", namespace: "cgpt-validation", limit: 20 });\nif (r.items[0].path !== \'tools["cgpt-validation"].cancel_approval\') throw new Error("UNEXPECTED_PATH");\nreturn await tools["cgpt-validation"].cancel_approval({approval_id:'+JSON.stringify(approval.approval_id)+'});';
 if(variant==='trailing-space')cancel.state.input.code+=' \n\t';
 if(variant==='tabs')cancel.state.input.code=cancel.state.input.code.replaceAll(' ','\t');
 if(variant==='compact')cancel.state.input.code=cancel.state.input.code.replace(/\s*([{}():;,])\s*/g,'$1');
 if(variant.startsWith('diagnostic')){
  const calls=[{tool:'search',status:'completed',input:{query:'broker_health',namespace:'cgpt-validation'}},
   {tool:'cgpt-validation.get_approval',status:'completed',input:{approval_id:approval.approval_id}},
   {tool:'cgpt-validation.lookup_validation',status:'completed',input:{requestId:approval.requestId}},
   {tool:'cgpt-validation.broker_health',status:'completed',input:{}}];
  if(variant==='diagnostic-effect')calls.push({tool:'opencode.shell',status:'completed',input:{command:'/usr/bin/true'}});
  if(variant==='diagnostic-running')calls[1].status='running';
  const part={type:'tool',tool:'execute',callID:'diagnostics-before-cancel',executed:false,state:{status:'completed',input:{code:'return await readonlyDiagnostics();'},output:'{}',metadata:{truncated:variant==='diagnostic-truncated',toolCalls:variant==='diagnostic-empty'?[]:calls}}};
  messages.splice(messages.length-1,0,{parts:[part]});
 }
 if(variant==='string-space')cancel.state.input.code=cancel.state.input.code.replace('UNEXPECTED_PATH','UNEXPECTED PATH');
 if(variant==='merged-word')cancel.state.input.code=cancel.state.input.code.replace('const r','constr');
 if(variant==='comment')cancel.state.input.code='/* observation */ '+cancel.state.input.code;
 if(variant==='extra-code')cancel.state.input.code+=' return 1;';
 if(variant==='operator')cancel.state.input.code=cancel.state.input.code.replace('!==','===');
 if(variant==='different-id')cancel.state.input.code=cancel.state.input.code.replace(approval.approval_id,'other-approval');
 if(variant==='return-newline')cancel.state.input.code=cancel.state.input.code.replace('return await','return\nawait');
 if(variant==='throw-newline')cancel.state.input.code=cancel.state.input.code.replace('throw new','throw\nnew');
 if(variant==='oversize')cancel.state.input.code=' '.repeat(16384)+cancel.state.input.code;
 await h.stop();await h.start();await h.post('/broker/readiness',{status:'READY',pending_count:0,infrastructure_status:'READY'});
 const accepted=['reported','trailing-space','tabs','compact','diagnostics','get-only-proof','poll-only-proof','reordered-metadata'].includes(variant);
 if(accepted)await waitFor(async()=>(await h.get(base+'/operations?operationId='+approval.operation_id)).body.operations[0].state==='CANCELLED');
 else await delay(80);
 const state=(await h.get('/runs')).body.coordination,op=state.operations[approval.operation_id];
 assert.equal(op.state,accepted?'CANCELLED':'PREPARED',variant);assert.equal(op.decision,undefined);assert.equal(op.native,undefined);assert.equal(op.nativeResult,undefined);
 assert.deepEqual(state.accesses,{});assert.deepEqual(h.native.replies,[]);assert.equal(h.native.permissions.length,0);
 if(accepted){assert.equal((await h.get(base+'/status')).body.hasUnresolvedValidation,false);await h.stop();await h.start();assert.equal((await h.get(base+'/operations?operationId='+approval.operation_id)).body.operations[0].state,'CANCELLED');}
});

async function unboundTerminalFixture(t){
 const h=await setup(t),run=await h.reserve('unbound-terminal',{resources:[{key:'file:src',mode:'write'}]}),base='/runs/'+run.runId;
 const parent=await h.approvedAccess(run,'unbound-parent');await h.execute(parent.approval);await h.completeTool(parent.approval,0);
 const deliveredParent=h.native.messages[run.sessionId].at(-1).parts[0];deliveredParent.executed=true;h.native.emit({type:'message.part.updated',properties:{part:deliveredParent}});
 await waitFor(async()=>(await h.get('/runs')).body.coordination.operations[parent.approval.operation_id].state==='COMPLETED');
 const revisions=(await h.get('/runs')).body.coordination.revisions;
 const approval=h.approval(run,'unbound-child',Object.fromEntries(run.resources.map(r=>[r.key,revisions[r.key]||0])));approval.access_id=parent.access.accessId;approval.commands=['node -e "console.log(1)"'];
 approval.tool_input_sha256=nativeToolInputDigest({command:approval.commands[0],timeout:60000,workdir:h.directory});
 h.native.messages[run.sessionId].at(-1).parts[0].state.input=structuredClone(approval);
 assert.equal((await h.post(base+'/validation/request',{approval})).status,202);assert.equal((await h.post(base+'/decision/'+approval.requestId,{decision:'approved'})).status,201);
 wrapNativeRequestValidationInCodeMode(h,approval);const request=h.native.messages[run.sessionId].at(-1).parts[0];request.state.status='completed';request.state.output=JSON.stringify({...approval,status:'APPROVED',reviewer:'CGPT'});
 const stamp=Date.now();h.native.messages[run.sessionId].push({nativeV2:{id:'msg_unbound_terminal',type:'assistant',time:{created:stamp},content:[{type:'tool',id:'call_unbound_terminal',name:'shell',executed:false,time:{created:stamp,ran:stamp,completed:stamp+1},state:{status:'completed',input:{command:approval.commands[0],timeout:60000,workdir:h.directory},content:[{type:'text',text:'1\n'}],metadata:{truncated:false,exit:0}}}]}});
 h.native.savedPermissions.push({id:'psv_legacy_node',projectID:'project-fixture',action:'shell',resource:'node *'});
 await h.post(base+'/recovery/policy',{policyId:'unbound-review',ownerId:run.ownerId,version:run.version,actions:['reconcile-reviewed-terminal'],resources:run.resources,authorization:'approved change; audit readonly observed call, no permission certificate'});
 const evidence=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body,plan=(await h.get(base+'/recovery')).body;
 const payload={actionId:'unbound-review-action',ownerId:run.ownerId,policyId:'unbound-review',boundaryDigest:plan.boundaryDigest,action:'reconcile-reviewed-terminal',targetId:approval.operation_id,input:{nativeBoundaryDigest:evidence.nativeBoundaryDigest,review:{ownerId:run.ownerId,effect:'READ_ONLY',commandSha256:evidence.commandSha256,sourceFiles:[],inlineCommand:true,evidenceRefs:['audit/exact-inline-command'],callId:evidence.calls[0].callId,partDigest:evidence.calls[0].partDigest}}};
 return{h,run,base,parent,approval,payload,evidence,plan};
}

test('terminal non rattaché : revue inline sans faux ACK, parent identique et reçu durable',async t=>{
 const{h,base,parent,approval,payload,evidence,plan}=await unboundTerminalFixture(t);
 assert.equal(evidence.untrackedNativeTerminalObserved,true);assert.equal(evidence.calls[0].observedExit,0);
 assert.ok(plan.actions.some(a=>a.action==='reconcile-reviewed-terminal'&&a.targetId===approval.operation_id));
 const before=(await h.get('/runs')).body.coordination,replies=h.native.replies.length;
 const result=await h.post(base+'/recovery/action',payload);assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.executionOutcome,'NATIVE_TERMINAL_OBSERVED_PERMISSION_UNVERIFIED');
 const after=(await h.get('/runs')).body.coordination,child=after.operations[approval.operation_id];
 assert.equal(child.state,'COMPLETED');assert.equal(child.native,undefined);assert.equal(child.nativeResult,undefined);assert.notEqual(child.onceAcknowledged,true);
 assert.deepEqual(after.accesses,before.accesses);assert.deepEqual(after.operations[parent.approval.operation_id],before.operations[parent.approval.operation_id]);assert.deepEqual(after.revisions,before.revisions);assert.deepEqual(after.testReservations,before.testReservations);assert.deepEqual(child.decision,before.operations[approval.operation_id].decision);
 assert.equal(h.native.replies.length,replies);assert.equal((await h.get(base+'/status')).body.hasUnresolvedValidation,false);
 await h.stop();await h.start();assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
});

for(const variant of ['inline-missing','command','part','effect','parent-state','attached','extra-shell'])test('terminal non rattaché : refus '+variant+' sans mutation',async t=>{
 const{h,run,base,parent,approval,payload}=await unboundTerminalFixture(t);
 if(variant==='inline-missing')delete payload.input.review.inlineCommand;
 if(variant==='command')payload.input.review.commandSha256='0'.repeat(64);
 if(variant==='part')payload.input.review.partDigest='0'.repeat(64);
 if(variant==='effect')payload.input.review.effect='WRITE';
 if(['parent-state','attached'].includes(variant)){
  await h.stop();const path=join(runtimeStateDirectory(h.directory),'controller-runs.json'),state=JSON.parse(readFileSync(path,'utf8')),access=state.coordination.accesses[parent.access.accessId];
  if(variant==='parent-state')access.state='UNKNOWN';
  if(variant==='attached')access.operationIds.push(approval.operation_id);
  writeFileSync(path,JSON.stringify(state));await h.start();
 }
 if(variant==='extra-shell')h.native.messages[run.sessionId].push({parts:[{type:'tool',tool:'shell',executed:false,callID:'extra-terminal',state:{status:'completed',input:{command:'/usr/bin/true',workdir:h.directory},metadata:{truncated:false,exit:0},time:{start:Date.now(),end:Date.now()+1}}}]});
 payload.input.nativeBoundaryDigest=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body.nativeBoundaryDigest;
 payload.boundaryDigest=(await h.get(base+'/recovery')).body.boundaryDigest;
 const before=(await h.get('/runs')).body.coordination,result=await h.post(base+'/recovery/action',payload);
 assert.ok([403,409].includes(result.status),JSON.stringify(result));assert.deepEqual((await h.get('/runs')).body.coordination,before);
});

test('ASK effectif : parent HELD ne vaut pas attach, pending sans once puis attach émet une seule once',async t=>{
 const h=await setup(t),run=await h.reserve('ask-unbound'),base='/runs/'+run.runId;
 const parent=await h.approvedAccess(run,'ask-parent');await h.execute(parent.approval);await h.completeTool(parent.approval,0);
 const deliveredParent=h.native.messages[run.sessionId].at(-1).parts[0];deliveredParent.executed=true;h.native.emit({type:'message.part.updated',properties:{part:deliveredParent}});
 await waitFor(async()=>(await h.get('/runs')).body.coordination.operations[parent.approval.operation_id].state==='COMPLETED');
 const revisions=(await h.get('/runs')).body.coordination.revisions;const approval=h.approval(run,'ask-child',Object.fromEntries(run.resources.map(r=>[r.key,revisions[r.key]||0])));approval.access_id=parent.access.accessId;
 h.native.messages[run.sessionId].at(-1).parts[0].state.input=structuredClone(approval);
 assert.equal((await h.post(base+'/validation/request',{approval})).status,202);assert.equal((await h.post(base+'/decision/'+approval.requestId,{decision:'approved'})).status,201);
 const before=h.native.replies.length;h.native.permissions.push({id:'perm-'+approval.requestId,sessionID:run.sessionId,permission:'bash',tool:{callID:'call-'+approval.requestId},metadata:{command:approval.commands[0]}});
 await delay(100);let op=(await h.get('/runs')).body.coordination.operations[approval.operation_id];assert.equal(op.state,'PREPARED');assert.equal(op.native,undefined);assert.equal(h.native.replies.length,before);
 assert.equal((await h.post(base+'/locks/attach',{version:run.version,operationId:parent.access.accessId,token:parent.access.token,fencing:parent.access.fencing,operationIds:[approval.operation_id],evidence:['reviewed exact child']})).status,200);
 await waitFor(()=>h.native.replies.length===before+1);op=(await h.get('/runs')).body.coordination.operations[approval.operation_id];assert.equal(op.native.onceAcknowledged,true);assert.equal(op.state,'EXECUTING');assert.equal(op.nativeResult,undefined,'a lost result does not become completion');
 await delay(100);assert.equal(h.native.replies.length,before+1);
 await h.completeTool(approval,0);const delivered=h.native.messages[run.sessionId].at(-1).parts[0];delivered.executed=true;h.native.emit({type:'message.part.updated',properties:{part:delivered}});await waitFor(async()=>(await h.get('/runs')).body.coordination.operations[approval.operation_id].state==='COMPLETED');
 assert.equal((await h.get('/runs')).body.coordination.operations[approval.operation_id].nativeResult.exit,0);
});

for(const variant of ['clean','missing-ack','busy','pending','extra-effect','boundary','target'])test('edit parent seulement référencé : '+variant,async t=>{
 const{h,run,base,approval,access,payload,evidence}=await rejectedEditFixture(t,{attached:true,referenceOnly:true,lineEndingMismatch:true});
 let state=(await h.get('/runs')).body.coordination;
 assert.equal(state.accesses[access.accessId].operationIds.includes(approval.operation_id),false);
 assert.ok((await h.get(base+'/recovery')).body.actions.some(a=>a.action==='withdraw-unissued-validation'&&a.targetId===approval.operation_id));
 if(variant==='missing-ack'){const d=join(runtimeStateDirectory(h.directory),'permission-replies');for(const f of readdirSync(d))unlinkSync(join(d,f));}
 if(variant==='busy')h.native.busy[run.sessionId]={type:'busy'};
 if(variant==='pending')h.native.permissions.push({id:'unrelated-pending',sessionID:run.sessionId,permission:'bash',metadata:{command:'/usr/bin/false'}});
 if(variant==='extra-effect')h.native.messages[run.sessionId].push({parts:[{type:'tool',tool:'bash',state:{status:'completed',input:{command:'/usr/bin/true'},metadata:{exit:0}}}]});
 if(variant==='target')h.native.messages[run.sessionId].at(-1).nativeV2.content[0].state.input.path=join(h.directory,'other');
 payload.input.nativeBoundaryDigest=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body.nativeBoundaryDigest;
 if(variant==='boundary')payload.input.nativeBoundaryDigest='0'.repeat(64);
 payload.boundaryDigest=(await h.get(base+'/recovery')).body.boundaryDigest;
 const before=(await h.get('/runs')).body.coordination,replies=h.native.replies.length;
 const result=await h.post(base+'/recovery/action',payload);
 if(variant!=='clean'){assert.equal(result.status,409,JSON.stringify(result));assert.deepEqual((await h.get('/runs')).body.coordination,before);return;}
 assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.state,'CANCELLED');
 const after=(await h.get('/runs')).body.coordination,child=after.operations[approval.operation_id];
 assert.deepEqual(after.accesses,before.accesses);assert.deepEqual(after.revisions,before.revisions);assert.deepEqual(after.testReservations,before.testReservations);
 assert.equal(child.native,undefined);assert.equal(child.nativeResult,undefined);assert.notEqual(child.onceAcknowledged,true);assert.deepEqual(child.decision,before.operations[approval.operation_id].decision);assert.equal(h.native.replies.length,replies);
 assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);await h.stop();await h.start();assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
 assert.deepEqual((await h.get('/runs')).body.coordination.accesses,before.accesses);
});

async function delegatedAccessReleaseFixture(t){
 const h=await setup(t),run=await h.reserve('delegated-release'),base='/runs/'+run.runId;
 const {approval,access}=await h.approvedAccess(run,'delegated-held');
 await h.execute(approval);
 const stamp=Date.now()+1;
 h.native.messages[run.sessionId].push({nativeV2:{id:'msg_delegated_release',type:'assistant',time:{created:stamp},content:[{type:'tool',id:'call-'+approval.requestId,name:'shell',executed:false,time:{created:stamp,ran:stamp,completed:stamp+1},state:{status:'completed',input:{command:approval.commands[0]},content:[{type:'text',text:'completed'}],metadata:{truncated:false,exit:0,status:'completed'}}}]}});
 h.native.emit({type:'session.idle',properties:{sessionID:run.sessionId}});
 await waitFor(async()=>(await h.get('/runs')).body.coordination.operations[approval.operation_id].state==='COMPLETED');
 await h.post(base+'/job/progress',{jobId:'job-'+run.runId,currentCabMandate:''});
 await h.post(base+'/recovery/policy',{policyId:'release-access-policy',ownerId:run.ownerId,version:run.version,actions:['release-access'],resources:run.resources,authorization:'same approved change; owner reviewed all native completions before release'});
 const plan=(await h.get(base+'/recovery')).body;
 const payload={actionId:'delegated-release-action',ownerId:run.ownerId,policyId:'release-access-policy',boundaryDigest:plan.boundaryDigest,action:'release-access',targetId:access.accessId,input:{outcome:'COMPLETED',evidence:['audit/known-terminal-effects']}};
 return {h,run,base,approval,access,payload};
}
for(const variant of ['clean','reconciled','owner','boundary','token','fencing','outcome','busy','permission','current-mandate'])test('libération owner sans token : '+variant,async t=>{
 const {h,run,base,approval,access,payload}=await delegatedAccessReleaseFixture(t);
 assert.ok((await h.get(base+'/recovery')).body.actions.some(a=>a.action==='release-access'&&a.targetId===access.accessId));
 if(variant==='reconciled')payload.input.outcome='RECONCILED';
 if(variant==='owner')payload.ownerId='foreign';if(variant==='boundary')payload.boundaryDigest='0'.repeat(64);if(variant==='token')payload.input.token='FAKE';if(variant==='fencing')payload.input.fencing=access.fencing+1;if(variant==='outcome')payload.input.outcome='NO_EFFECT';
 if(variant==='busy')h.native.busy[run.sessionId]={type:'busy'};
 if(variant==='permission')h.native.permissions.push({id:'pending-owner-release',sessionID:run.sessionId,permission:'bash',metadata:{command:'/usr/bin/false'}});
 if(variant==='current-mandate')await h.post(base+'/job/progress',{jobId:'job-'+run.runId,currentCabMandate:'new-unfinished-mandate'});
 if(!['owner','boundary','token','fencing','outcome'].includes(variant))payload.boundaryDigest=(await h.get(base+'/recovery')).body.boundaryDigest;
 const before=(await h.get('/runs')).body.coordination,replies=h.native.replies.length;
 const result=await h.post(base+'/recovery/action',payload);
 if(!['clean','reconciled'].includes(variant)){assert.ok([403,409].includes(result.status),JSON.stringify(result));assert.deepEqual((await h.get('/runs')).body.coordination,before);return;}
 assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.state,'RELEASED');assert.equal(result.body.token,undefined);assert.equal(JSON.stringify(result.body).includes(access.token),false);
 const after=(await h.get('/runs')).body.coordination;assert.equal(after.accesses[access.accessId].token,undefined);assert.deepEqual(after.operations[approval.operation_id].native,before.operations[approval.operation_id].native);assert.deepEqual(after.operations[approval.operation_id].nativeResult,before.operations[approval.operation_id].nativeResult);assert.equal(h.native.replies.length,replies);
 assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);await h.stop();await h.start();assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
});

test('libération déléguée : empreinte interne périmée refuse avant effet',async t=>{
 const {h,run,base,access}=await delegatedAccessReleaseFixture(t),before=(await h.get('/runs')).body.coordination;
 const result=await h.post(base+'/locks/release',{version:run.version,operationId:access.accessId,token:access.token,fencing:access.fencing,
  outcome:'COMPLETED',evidence:['fixture stale internal boundary'],accessReleaseBoundary:'0'.repeat(64)});
 assert.equal(result.status,409);assert.equal(result.body.error,'recovery-access-boundary-changed');assert.deepEqual((await h.get('/runs')).body.coordination,before);
});

for(const variant of ['clean','missing-ack','busy','permission','extra-effect','boundary','target'])test('retrait dédié monomembre : '+variant,async t=>{
 const{h,run,base,approval,access,payload}=await rejectedEditFixture(t,{dedicated:true,lineEndingMismatch:true});
 await h.post(base+'/recovery/policy',{policyId:'singleton-policy',ownerId:run.ownerId,version:run.version,actions:['withdraw-unissued-validation','release-access'],resources:run.resources,authorization:'same change; reject before once, then owner release'});
 payload.policyId='singleton-policy';payload.boundaryDigest=(await h.get(base+'/recovery')).body.boundaryDigest;
 const plan=(await h.get(base+'/recovery')).body;
 assert.ok(plan.actions.some(a=>a.action==='withdraw-unissued-validation'&&a.targetId===approval.operation_id));assert.equal(plan.actions.some(a=>a.action==='release-access'&&a.targetId===access.accessId),false);
 if(variant==='missing-ack'){const d=join(runtimeStateDirectory(h.directory),'permission-replies');for(const f of readdirSync(d))unlinkSync(join(d,f));}
 if(variant==='busy')h.native.busy[run.sessionId]={type:'busy'};
 if(variant==='permission')h.native.permissions.push({id:'pending-singleton',sessionID:run.sessionId,permission:'bash',metadata:{command:'/usr/bin/false'}});
 if(variant==='extra-effect')h.native.messages[run.sessionId].push({parts:[{type:'tool',tool:'bash',state:{status:'completed',input:{command:'/usr/bin/true'},metadata:{exit:0}}}]});
 if(variant==='target')h.native.messages[run.sessionId].at(-1).nativeV2.content[0].state.input.path=join(h.directory,'other');
 payload.input.nativeBoundaryDigest=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body.nativeBoundaryDigest;
 if(variant==='boundary')payload.input.nativeBoundaryDigest='0'.repeat(64);
 const before=(await h.get('/runs')).body.coordination,replies=h.native.replies.length,result=await h.post(base+'/recovery/action',payload);
 if(variant!=='clean'){assert.equal(result.status,409,JSON.stringify(result));assert.deepEqual((await h.get('/runs')).body.coordination,before);return;}
 assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.state,'CANCELLED');
 const after=(await h.get('/runs')).body.coordination,child=after.operations[approval.operation_id];assert.deepEqual(after.accesses,before.accesses);assert.deepEqual(after.revisions,before.revisions);assert.deepEqual(child.decision,before.operations[approval.operation_id].decision);assert.equal(child.native,undefined);assert.equal(child.nativeResult,undefined);assert.notEqual(child.onceAcknowledged,true);assert.equal(h.native.replies.length,replies);
 assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
 const releasePlan=(await h.get(base+'/recovery')).body;assert.ok(releasePlan.actions.some(a=>a.action==='release-access'&&a.targetId===access.accessId));
 const releaseRequest={actionId:'singleton-release',ownerId:run.ownerId,policyId:'singleton-policy',boundaryDigest:releasePlan.boundaryDigest,action:'release-access',targetId:access.accessId,input:{outcome:'RECONCILED',evidence:['rejected before once; owner reviewed withdrawal receipt']}};
 const release=await h.post(base+'/recovery/action',releaseRequest);
 assert.equal(release.status,200,JSON.stringify(release));assert.equal(release.body.state,'RELEASED');assert.equal(release.body.token,undefined);assert.equal((await h.get('/runs')).body.coordination.operations[approval.operation_id].state,'CANCELLED');
 await h.stop();await h.start();assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);assert.deepEqual((await h.post(base+'/recovery/action',releaseRequest)).body,release.body);
});

for(const variant of ['clean','shared-parent','missing-ack','http200','busy','permission','extra-call','target','boundary','restored'])test('write refusé owner : '+variant,async t=>{
 const shared=variant==='shared-parent';
 const{h,run,base,approval,access,payload,evidence}=await rejectedEditFixture(t,{nativeWrite:true,dedicated:!shared,attached:shared});
 assert.equal(evidence.calls.length,1);assert.equal(evidence.calls[0].tool,'write');assert.equal(evidence.replyReceipts.length,1);
 await h.post(base+'/recovery/policy',{policyId:'write-withdraw-policy',ownerId:run.ownerId,version:run.version,actions:['withdraw-unissued-validation','release-access'],resources:run.resources,authorization:'same change; rejected write, preserve every other effect'});
 payload.policyId='write-withdraw-policy';
 if(variant==='missing-ack'){const d=join(runtimeStateDirectory(h.directory),'permission-replies');for(const f of readdirSync(d))unlinkSync(join(d,f));}
 if(variant==='http200'){const d=join(runtimeStateDirectory(h.directory),'permission-replies');for(const f of readdirSync(d)){const path=join(d,f),e=JSON.parse(readFileSync(path,'utf8'));e.value.httpStatus=200;e.digest=proofHash(e.value);writeFileSync(path,JSON.stringify(e)+'\n');}}
 if(variant==='busy')h.native.busy[run.sessionId]={type:'busy'};
 if(variant==='permission')h.native.permissions.push({id:'pending-write-withdrawal',sessionID:run.sessionId,permission:'edit',metadata:{filepath:join(h.directory,'other')}});
 if(variant==='extra-call')h.native.messages[run.sessionId].push({parts:[{type:'tool',tool:'write',callID:'extra-write',executed:false,state:{status:'error',input:{path:join(h.directory,'other'),content:'other'}}}]});
 if(variant==='target')h.native.messages[run.sessionId].at(-1).nativeV2.content[0].state.input.path=join(h.directory,'other');
 if(variant==='restored'){await h.stop();await h.start();}
 payload.input.nativeBoundaryDigest=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body.nativeBoundaryDigest;
 if(variant==='boundary')payload.input.nativeBoundaryDigest='0'.repeat(64);
 payload.boundaryDigest=(await h.get(base+'/recovery')).body.boundaryDigest;
 const before=(await h.get('/runs')).body.coordination,replies=h.native.replies.length,result=await h.post(base+'/recovery/action',payload);
 if(!['clean','shared-parent'].includes(variant)){assert.ok([403,409].includes(result.status),JSON.stringify(result));assert.deepEqual((await h.get('/runs')).body.coordination,before);return;}
 assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.state,'CANCELLED');
 const after=(await h.get('/runs')).body.coordination,child=after.operations[approval.operation_id];assert.deepEqual(after.accesses,before.accesses);assert.deepEqual(after.revisions,before.revisions);assert.deepEqual(after.testReservations,before.testReservations);assert.deepEqual(child.decision,before.operations[approval.operation_id].decision);assert.equal(child.native,undefined);assert.equal(child.nativeResult,undefined);assert.notEqual(child.onceAcknowledged,true);assert.equal(h.native.replies.length,replies);
 for(const id of before.accesses[access.accessId].operationIds.filter(id=>id!==approval.operation_id))assert.deepEqual(after.operations[id],before.operations[id]);
 assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
 if(!shared){const plan=(await h.get(base+'/recovery')).body;const releaseRequest={actionId:'write-dedicated-release',ownerId:run.ownerId,policyId:'write-withdraw-policy',boundaryDigest:plan.boundaryDigest,action:'release-access',targetId:access.accessId,input:{outcome:'RECONCILED',evidence:['rejected write withdrawn before once']}};
  const released=await h.post(base+'/recovery/action',releaseRequest);assert.equal(released.status,200,JSON.stringify(released));assert.equal(released.body.state,'RELEASED');assert.equal(released.body.token,undefined);
  await h.stop();await h.start();assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);assert.deepEqual((await h.post(base+'/recovery/action',releaseRequest)).body,released.body);
 }
});

async function releasedReferenceFixture(t,outcome='COMPLETED') {
 const h=await setup(t),run=await h.reserve('released-reference',{resources:[{key:'file:one.txt',mode:'write'},{key:'resource:toolchain',mode:'read'}]}),base='/runs/'+run.runId;
 const parent=h.approval(run,'released-parent');parent.resources=[run.resources[0]];parent.expected_revisions={[run.resources[0].key]:0};
 h.native.messages[run.sessionId].at(-1).parts[0].state.input=structuredClone(parent);
 assert.equal((await h.post(base+'/validation/request',{approval:parent})).status,202);
 assert.equal((await h.post(base+'/decision/'+parent.requestId,{decision:'approved'})).status,201);
 const acquired=await h.post(base+'/locks/acquire',{version:run.version,operationId:parent.operation_id,operationDigest:parent.operation_digest,resources:parent.resources,expectedRevisions:parent.expected_revisions});
 assert.equal(acquired.status,200,JSON.stringify(acquired));
 await h.execute(parent);await h.completeTool(parent,0,{nativeShell:true});
 const child=h.approval(run,'released-unattached-child');child.access_id=acquired.body.accessId;
 h.native.messages[run.sessionId].at(-1).parts[0].state.input=structuredClone(child);
 assert.equal((await h.post(base+'/validation/request',{approval:child})).status,202);
 assert.equal((await h.post(base+'/decision/'+child.requestId,{decision:'approved'})).status,201);
 const part=h.native.messages[run.sessionId].at(-1).parts[0];part.state.status='completed';part.state.output=JSON.stringify({...child,status:'APPROVED',reviewer:'CGPT'});
 const attached=await h.post(base+'/locks/attach',{version:run.version,operationId:acquired.body.accessId,token:acquired.body.token,fencing:acquired.body.fencing,operationIds:[child.operation_id],evidence:['fixture attachment refused']});
 assert.equal(attached.status,409);assert.equal(attached.body.error,'access-correction-outside-held-set');
 assert.equal((await h.releaseOperation(run,parent,acquired.body,outcome)).status,200);
 const parentBefore=(await h.get(base+'/locks')).body.accesses.find(a=>a.accessId===acquired.body.accessId);
 assert.equal(parentBefore.state,'RELEASED');assert.equal(parentBefore.operationIds.includes(child.operation_id),false);
 await h.post(base+'/recovery/policy',{policyId:'released-reference-policy',ownerId:run.ownerId,version:run.version,actions:['withdraw-unissued-validation'],resources:run.resources,authorization:'same change; retire only the unattached unissued child of a released parent'});
 const plan=(await h.get(base+'/recovery')).body,evidence=(await h.get(base+'/recovery/native-evidence?operationId='+child.operation_id)).body;
 assert.ok(plan.actions.some(a=>a.action==='withdraw-unissued-validation'&&a.targetId===child.operation_id));
 return {h,run,base,child,parentBefore,replies:h.native.replies.length,payload:{actionId:'withdraw-released-reference',ownerId:run.ownerId,policyId:'released-reference-policy',boundaryDigest:plan.boundaryDigest,action:'withdraw-unissued-validation',targetId:child.operation_id,input:{nativeBoundaryDigest:evidence.nativeBoundaryDigest,evidence:['audit/no-membership-no-once']}}};
}
for(const outcome of ['COMPLETED','RECONCILED'])test('parent seulement référencé puis RELEASED : retrait sans effet, '+outcome,async t=>{
 const f=await releasedReferenceFixture(t,outcome),result=await f.h.post(f.base+'/recovery/action',f.payload);
 assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.state,'CANCELLED');
 const check=async()=>{const op=(await f.h.get(f.base+'/operations?operationId='+f.child.operation_id)).body.operations[0];
  assert.equal(op.state,'CANCELLED');assert.equal(op.decision.status,'approved');assert.equal(op.native,null);assert.equal(op.nativeResult,null);
  assert.deepEqual((await f.h.get(f.base+'/locks')).body.accesses.find(a=>a.accessId===f.parentBefore.accessId),f.parentBefore);
  assert.equal(f.h.native.replies.length,f.replies);};
 await check();await f.h.stop();await f.h.start();await check();
 assert.deepEqual((await f.h.post(f.base+'/recovery/action',f.payload)).body,result.body);
});
for(const variant of ['effect','permission','busy','boundary','owner'])test('parent référencé RELEASED : garde '+variant,async t=>{
 const f=await releasedReferenceFixture(t);
 if(variant==='effect')f.h.native.messages[f.run.sessionId].push({parts:[{type:'tool',tool:'bash',callID:'unexpected-after-released-reference',state:{status:'completed',input:{command:f.child.commands[0]},metadata:{exit:0},output:'unexpected'}}]});
 if(variant==='permission')f.h.native.permissions.push({id:'released-reference-permission',sessionID:f.run.sessionId,permission:'bash',metadata:{command:'/usr/bin/false'}});
 if(variant==='busy')f.h.native.busy[f.run.sessionId]={type:'busy'};
 if(variant==='boundary')f.payload.input.nativeBoundaryDigest='0'.repeat(64);
 if(variant==='owner')f.payload.ownerId='foreign-owner';
 const result=await f.h.post(f.base+'/recovery/action',f.payload);assert.equal(result.status,variant==='owner'?403:409,JSON.stringify(result));
 assert.equal((await f.h.get(f.base+'/operations?operationId='+f.child.operation_id)).body.operations[0].state,'PREPARED');
 assert.deepEqual((await f.h.get(f.base+'/locks')).body.accesses.find(a=>a.accessId===f.parentBefore.accessId),f.parentBefore);
 assert.equal(f.h.native.replies.length,f.replies);
});

test('cleanup APPLYING : redémarrage refusé avant toute réécriture métier',async t=>{
 const h=await setup(t);await h.reserve('cleanup-startup-guard');await h.stop();
 const state=runtimeStateDirectory(h.directory),tx=new ErasureTransaction(state);
 const value=tx.prepare({scope:{workspace:h.directory,changeId:'fixture-change',ownerId:'owner',ids:[],runIds:[]},roots:[state],entries:[],coverage:[]});
 tx.save({...value,phase:'APPLYING'});
 const hashes=()=>Object.fromEntries(readdirSync(state).filter(name=>name.endsWith('.json')).sort().map(name=>[name,createHash('sha256').update(readFileSync(join(state,name))).digest('hex')]));
 const before=hashes();await assert.rejects(h.start(),/erasure-forward-recovery-required/);assert.deepEqual(hashes(),before);
});

test('retraite historique HTTP : extension de génération, rejet conservé et aucune once',async t=>{
 const {h,run,approval,base}=await unissuedWithdrawalFixture(t,'rejected');
 const extended=await h.post(base+'/extend',{version:run.version,resources:[{key:'file:history-extra',mode:'read'}]});
 assert.equal(extended.status,200,JSON.stringify(extended));assert.ok(extended.body.version>approval.reservation_version);
 const current=(await h.get('/runs')).body.runs.find(r=>r.runId===run.runId);
 assert.equal((await h.post(base+'/recovery/policy',{policyId:'historical-policy',ownerId:run.ownerId,version:current.version,
   actions:['withdraw-unissued-validation'],resources:run.resources,authorization:'retire only historical rejected coordination; no effect'})).status,201);
 const evidence=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body,plan=(await h.get(base+'/recovery')).body;
 const payload={actionId:'historical-retirement',ownerId:run.ownerId,policyId:'historical-policy',boundaryDigest:plan.boundaryDigest,
  action:'withdraw-unissued-validation',targetId:approval.operation_id,input:{nativeBoundaryDigest:evidence.nativeBoundaryDigest,evidence:['audit/history']}};
 const result=await h.post(base+'/recovery/action',payload);assert.equal(result.status,200,JSON.stringify(result));
 const op=(await h.get(base+'/operations?operationId='+approval.operation_id)).body.operations[0];
 assert.equal(op.state,'CANCELLED');assert.equal(op.decision.status,'rejected');assert.equal(op.version,approval.reservation_version);
 assert.equal(op.native,null);assert.equal(op.nativeResult,null);assert.equal(h.native.replies.length,0);
 await h.stop();await h.start();assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
 await h.stop();
 const receiptFile=join(runtimeStateDirectory(h.directory),'recovery-policies.json'),store=new ContinuityStore(receiptFile,'recovery-policies',()=>true),state=store.snapshot(),row=state.receipts.find(r=>r.actionId===payload.actionId);
 row.state='PREPARED';delete row.result;delete row.httpStatus;store.write(state);
 await h.start();const recovered=await h.post(base+'/recovery/action',payload);assert.equal(recovered.status,200,JSON.stringify(recovered));
 assert.equal(recovered.body.state,'CANCELLED');assert.equal(recovered.body.operationId,result.body.operationId);
 assert.equal(recovered.body.proofDigest,result.body.proofDigest);assert.equal(recovered.body.recoveredFrom,'qualified-receipt');
 assert.equal(recovered.body.version,approval.reservation_version);assert.equal(h.native.replies.length,0);

});

for(const handoff of [false,true])test('port après reboot : réconciliation HTTP avec SID '+(handoff?'courant distinct':'source'),async t=>{
 const {h,run,approval,payload}=await portReconciliationFixture(t,{reboot:true,handoff});
 const before=h.native.replies.length,result=await h.post('/runs/'+run.runId+'/recovery/action',payload);
 assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.executionOutcome,'HISTORICAL_OUTCOME_UNOBSERVED_RESOURCE_QUIESCENT');
 const op=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];
 assert.equal(op.state,'CANCELLED');assert.equal(op.nativeResult,null);assert.equal(h.native.replies.length,before);
 if(handoff)assert.notEqual(approval.session_id,run.sessionId);
 await h.stop();await h.start();assert.deepEqual((await h.post('/runs/'+run.runId+'/recovery/action',payload)).body,result.body);
});

test('retraite historique HTTP : ancien SID révoqué sans réactiver sa permission',async t=>{
 const {h,run,approval,base}=await unissuedWithdrawalFixture(t,'rejected'),next='ses_retirement_current';
 h.native.sessions[next]={id:next,directory:h.directory,permission:[{permission:'*',pattern:'*',action:'ask'}]};h.native.rules[next]=[{permission:'*',pattern:'*',action:'ask'}];
 h.native.messages[next]=[{parts:[{type:'tool',tool:'execute',executed:false,callID:'ready-historical',state:{status:'completed',input:{code:'return await tools["cgpt-validation"].broker_readiness('+JSON.stringify({run_id:run.runId})+');'},metadata:{truncated:false,toolCalls:[{tool:'cgpt-validation.broker_readiness',status:'completed',input:{run_id:run.runId}}]},output:JSON.stringify({run_id:run.runId,status:'READY',pending_count:0,server_version:'2.4.6'})}}]}];
 const preview=await h.get(base+'/session-handoff?sessionId='+next);assert.equal(preview.status,200,JSON.stringify(preview));
 const handoff=await h.post(base+'/session-handoff',{handoffId:'retirement-handoff',ownerId:run.ownerId,version:run.version,jobId:preview.body.jobId,expectedSessionId:run.sessionId,sessionId:next,checkpointDigest:preview.body.checkpointDigest,boundaryDigest:preview.body.boundaryDigest,reason:'qualified owner handoff',evidence:['audit/handoff']});assert.equal(handoff.status,201,JSON.stringify(handoff));
 const current=(await h.get('/runs')).body.runs.find(r=>r.runId===run.runId);
 assert.equal((await h.post(base+'/recovery/policy',{policyId:'historical-sid-policy',ownerId:run.ownerId,version:current.version,actions:['withdraw-unissued-validation'],resources:run.resources,authorization:'retire historical rejected coordination only'})).status,201);
 const evidence=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body,plan=(await h.get(base+'/recovery')).body;
 const payload={actionId:'historical-sid-retirement',ownerId:run.ownerId,policyId:'historical-sid-policy',boundaryDigest:plan.boundaryDigest,action:'withdraw-unissued-validation',targetId:approval.operation_id,input:{nativeBoundaryDigest:evidence.nativeBoundaryDigest,evidence:['audit/historical-sid']}};
 const result=await h.post(base+'/recovery/action',payload);assert.equal(result.status,200,JSON.stringify(result));
 const op=(await h.get(base+'/operations?operationId='+approval.operation_id)).body.operations[0];assert.equal(op.state,'CANCELLED');assert.equal(op.sessionId,approval.session_id);assert.notEqual(op.sessionId,current.sessionId);assert.equal(h.native.replies.length,0);
 await h.stop();await h.start();assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
});

test('port après reboot : mandat inter-SID non préparé ne traverse pas la quarantaine',async t=>{
 const {h,run,approval}=await portReconciliationFixture(t,{reboot:true,handoff:true}),base='/runs/'+run.runId;
 const before=h.native.replies.length,probe=h.approval(run,'unprepared-port-probe');probe.commands=['/usr/bin/true'];
 probe.resources=[{key:'port:host-a/5173',mode:'read'}];probe.expected_revisions={'port:host-a/5173':0};h.native.messages[run.sessionId].at(-1).parts[0].state.input=structuredClone(probe);
 assert.equal((await h.post(base+'/validation/request',{approval:probe})).status,202);assert.equal((await h.post(base+'/decision/'+probe.requestId,{decision:'approved'})).status,201);
 const acquired=await h.post(base+'/locks/acquire',{version:run.version,operationId:probe.operation_id,operationDigest:probe.operation_digest,resources:probe.resources,expectedRevisions:probe.expected_revisions});
 assert.equal(acquired.body.state,'WAITING',JSON.stringify(acquired));assert.equal(h.native.replies.length,before);
 const original=(await h.get(base+'/operations?operationId='+approval.operation_id)).body.operations[0];assert.equal(original.access.state,'HELD');assert.equal(original.state,'EXECUTING');
});

for(const variant of ['valid','part-changed','unknown-call'])test('retrait HTTP : mandat ultérieur corrélé '+variant,async t=>{
 const {h,run,approval,base}=await unissuedWithdrawalFixture(t,'rejected');
 const peer=await h.approvedAccess(run,'independent-terminal');
 const peerRequest=h.native.messages[run.sessionId].at(-1).parts[0];peerRequest.state.status='completed';peerRequest.state.output=JSON.stringify({...peer.approval,status:'APPROVED',reviewer:'CGPT'});
 await h.execute(peer.approval);await h.completeTool(peer.approval,0,{nativeShell:true});
 const terminal=h.native.messages[run.sessionId].at(-1).parts[0];
 const release=await h.releaseOperation(run,peer.approval,peer.access,'COMPLETED');assert.equal(release.status,200,JSON.stringify(release));
 assert.equal((await h.get('/runs')).body.coordination.operations[peer.approval.operation_id].state,'COMPLETED');
 assert.equal((await h.post(base+'/job/progress',{jobId:'job-'+run.runId,currentCabMandate:''})).status,202);
 if(variant==='part-changed')terminal.state.output='changed-after-terminal';
 if(variant==='unknown-call')h.native.messages[run.sessionId].push({parts:[{...structuredClone(terminal),callID:'unknown-environmental-call'}]});
 const evidence=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body,plan=(await h.get(base+'/recovery')).body,before=h.native.replies.length;
 const payload={actionId:'correlated-retirement',ownerId:run.ownerId,policyId:'withdraw-policy',boundaryDigest:plan.boundaryDigest,action:'withdraw-unissued-validation',targetId:approval.operation_id,input:{nativeBoundaryDigest:evidence.nativeBoundaryDigest,evidence:['audit/correlated-suffix']}};
 const result=await h.post(base+'/recovery/action',payload);assert.equal(result.status,variant==='valid'?200:409,JSON.stringify(result));
 const op=(await h.get(base+'/operations?operationId='+approval.operation_id)).body.operations[0];assert.equal(op.state,variant==='valid'?'CANCELLED':'PREPARED');assert.equal(h.native.replies.length,before);
});

for(const variant of ['valid','delayed','effect-before-rejection','changed-second-boundary'])test('rejet HTTP : séquence native close et suffixe conservé '+variant,async t=>{
 const {h,run,approval,base}=await unissuedWithdrawalFixture(t,'rejected');
 const source=h.native.messages[run.sessionId].at(-1).parts[0],op=(await h.get('/runs')).body.coordination.operations[approval.operation_id],stamp=Date.parse(op.decision.recordedAt);
 const user=(id,created)=>({info:{id,role:'user',sessionID:run.sessionId,time:{created}},parts:[]});
 const assistant=(id,parentID,created,completed,finish,parts)=>({info:{id,role:'assistant',sessionID:run.sessionId,parentID,finish,time:{created,completed}},parts});
 const future={type:'tool',tool:'shell',executed:false,callID:'later-independent-call',state:{status:'completed',input:{command:approval.commands[0]},metadata:{status:'completed',exit:0},output:'later-native-result',time:{start:stamp+7,end:stamp+8}}};
 h.native.messages[run.sessionId]=[user('msg_user_rejected',stamp-100),assistant('msg_request_rejected','msg_user_rejected',stamp-50,stamp+1,'tool-calls',[source]),assistant('msg_stop_rejected','msg_user_rejected',stamp+2,stamp+3,'stop',[]),user('msg_later_user',stamp+4),assistant('msg_later_assistant','msg_later_user',stamp+5,stamp+9,'stop',[future])];
 if(variant==='delayed'){
  source.executed=false;source.state.metadata={truncated:false};source.state.output=JSON.stringify({...approval,status:'PENDING'});
  h.native.messages[run.sessionId]=[user('msg_user_rejected',stamp-100),assistant('msg_request_rejected','msg_user_rejected',stamp-90,stamp-80,'tool-calls',[source]),assistant('msg_stop_rejected','msg_user_rejected',stamp-70,stamp-60,'stop',[]),user('msg_later_user',stamp+4),assistant('msg_later_assistant','msg_later_user',stamp+5,stamp+10,'tool-calls',[future,{type:'tool',tool:'cgpt-validation_poll_approval',executed:false,callID:'later-rejection',state:{status:'completed',input:{approval_id:approval.approval_id},output:JSON.stringify({...approval,status:'REJECTED'}),metadata:{truncated:false}}}])];
 }
 if(variant==='effect-before-rejection')h.native.messages[run.sessionId][1].parts.push({...structuredClone(future),callID:'target-environmental-call'});
 const evidence=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body,plan=(await h.get(base+'/recovery')).body;
 if(variant==='changed-second-boundary'){let reads=0;h.native.onRequest=async path=>{if(path==='/session/'+run.sessionId+'/message'&&++reads===2)future.state.output='changed-later-boundary';};}
 const payload={actionId:'rejected-native-turn',ownerId:run.ownerId,policyId:'withdraw-policy',boundaryDigest:plan.boundaryDigest,action:'withdraw-unissued-validation',targetId:approval.operation_id,input:{nativeBoundaryDigest:evidence.nativeBoundaryDigest,evidence:['audit/native-rejected-turn']}};
 const success=['valid','delayed'].includes(variant),result=await h.post(base+'/recovery/action',payload);assert.equal(result.status,success?200:409,JSON.stringify(result));
 const after=(await h.get(base+'/operations?operationId='+approval.operation_id)).body.operations[0];assert.equal(after.state,success?'CANCELLED':'PREPARED');assert.equal(after.native,null);assert.equal(after.nativeResult,null);assert.equal(h.native.replies.length,0);
 if(variant==='valid'){
  const receipts=JSON.parse(readFileSync(join(runtimeStateDirectory(h.directory),'recovery-policies.json'))).value.receipts;
  const proof=receipts.find(r=>r.actionId===payload.actionId).observation;assert.equal(proof.kind,'REJECTED_UNISSUED_TERMINAL_TURN');assert.ok(proof.terminalTurn.laterMessagesDigest);
  await h.stop();await h.start();assert.deepEqual((await h.post(base+'/recovery/action',payload)).body,result.body);
 }
});

test('frontière PENDING : observation noyau additive conserve le digest compatible antérieur',async t=>{
 const {h,approval,base,payload}=await boundaryRecoveryFixture(t);
 const evidence=(await h.get(base+'/recovery/native-evidence?operationId='+approval.operation_id)).body;
 const {nativeBoundaryDigest,nativeKernelEpoch,...legacy}=evidence;
 assert.ok(nativeKernelEpoch);assert.equal(nativeBoundaryDigest,proofHash(legacy));
 payload.input.nativeBoundaryDigest=proofHash(legacy);
 assert.equal((await h.post(base+'/recovery/action',payload)).status,200);
});

for(const handoff of [false,true])test('port scellé : deux once et corps exacts avec SID '+(handoff?'courant':'source'),async t=>{
 const {h,run,approval,payload}=await portReconciliationFixture(t,{reboot:true,handoff,sealed:true});
 const replies=h.native.replies.length,result=await h.post('/runs/'+run.runId+'/recovery/action',payload);
 assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.evidenceAuthority,'VERIFIED_NATIVE_PORT_PROBES');
 assert.equal(h.native.replies.length,replies);assert.equal(result.body.executionOutcome,'HISTORICAL_OUTCOME_UNOBSERVED_RESOURCE_QUIESCENT');
 await h.stop();await h.start();assert.deepEqual((await h.post('/runs/'+run.runId+'/recovery/action',payload)).body,result.body);
});

for(const variant of ['free-payload','scope','identity-conflict','changed-directories'])test('port scellé refuse un stage non conforme : '+variant,async t=>{
 const {h,run,approval}=await portReconciliationFixture(t,{reboot:true,handoff:true,sealed:true});
 const body={operationId:approval.operation_id,nonce:'op-probe-port-a',stageId:'stage-probe-port-a',requestId:'probe-port-a',approvalId:'probe-port-a',runtimeDirectories:['.']};
 if(variant==='free-payload')body.payload='unreviewed';if(variant==='scope')body.resources=[{key:'file:foreign',mode:'write'}];
 if(variant==='identity-conflict')body.stageId='foreign-stage';if(variant==='changed-directories')body.runtimeDirectories.push('frontend');
 const replies=h.native.replies.length,result=await h.post('/runs/'+run.runId+'/recovery/port-probe-stage',body);
 assert.ok([400,409].includes(result.status),JSON.stringify(result));assert.equal(h.native.replies.length,replies);
 const original=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];assert.equal(original.access.state,'HELD');
});
for(const variant of ['other-launcher','expired'])test('port scellé refuse une capture non qualifiée : '+variant,async t=>{
 const {h,run,approval,payload}=await portReconciliationFixture(t,{reboot:true,handoff:true,sealed:true});
 const op=(await h.get('/runs')).body.coordination.operations[payload.input.probeOperationIds[0]];
 const raw=h.native.messages[run.sessionId].find(message=>message.nativeV2?.content?.some(part=>part.id===op.native.callId));
 const nativePart=raw?.nativeV2.content.find(part=>part.id===op.native.callId);
 const part=nativePart?{state:{...nativePart.state,output:nativePart.state.content[0].text}}:h.native.messages[run.sessionId].flatMap(message=>message.parts||[]).find(part=>part.callID===op.native.callId);
 if(variant==='other-launcher')part.state.input.command='/usr/bin/true';
 else{const value=JSON.parse(Buffer.from(part.state.output.split(':')[1].trim(),'base64').toString());delete value.captureDigest;value.observedAt=Date.now()-120001;value.captureDigest=proofHash(value);part.state.output='CAB_PORT_BOUNDARY_V1:'+Buffer.from(JSON.stringify(value)).toString('base64')+'\n';}
 if(nativePart){nativePart.state.input=part.state.input;nativePart.state.content=[{type:'text',text:part.state.output}];}
 const count=h.native.replies.length,result=await h.post('/runs/'+run.runId+'/recovery/action',payload);
 assert.equal(result.status,409,JSON.stringify(result));assert.equal(h.native.replies.length,count);
 const original=(await h.get('/runs/'+run.runId+'/operations?operationId='+approval.operation_id)).body.operations[0];assert.equal(original.access.state,'HELD');assert.equal(original.onceAcknowledged,true);
});

for(const field of ['requestId','approval_id'])test('port scellé : une identité de validation divergente ne reçoit pas le permit inter-SID '+field,async t=>{
 const {h,run,approval}=await portReconciliationFixture(t,{reboot:true,handoff:true,sealed:true}),base='/runs/'+run.runId;
 const child=h.approval(run,'probe-identity');
 const staged=await h.post(base+'/recovery/port-probe-stage',{operationId:approval.operation_id,nonce:child.operation_id,stageId:'stage-identity',requestId:child.requestId,approvalId:child.approval_id,runtimeDirectories:['.']});assert.equal(staged.status,201,JSON.stringify(staged));
 child.commands=[staged.body.command];child.resources=[{key:'port:host-a/5173',mode:'read'}];child.expected_revisions={'port:host-a/5173':0};child[field]+='-different';
 h.native.messages[run.sessionId].at(-1).parts[0].state.input=structuredClone(child);
 assert.equal((await h.post('/validation/request',{approval:child})).status,202);assert.equal((await h.post(base+'/decision/'+child.requestId,{decision:'approved'})).status,201);
 const result=await h.post(base+'/locks/acquire',{version:run.version,operationId:child.operation_id,operationDigest:child.operation_digest,resources:child.resources,expectedRevisions:child.expected_revisions});
 assert.equal(result.body.state,'WAITING',JSON.stringify(result));
});

for(const restored of [false,true])test('jetons de travail : GET publics sans capacité, POST et stockage intacts'+(restored?' après restauration':''),async t=>{
 const h=await setup(t),run=await h.reserve('redacted-access'),{approval,access}=await h.approvedAccess(run,'redacted-work');
 assert.equal(typeof access.token,'string');assert.ok(access.token.length>20);
 const check=async()=>{
  for(const route of ['/runs','/runs/'+run.runId+'/status','/runs/'+run.runId+'/locks','/coordination/global']){
   const r=await h.get(route);assert.equal(r.status,200);
   assert.equal(JSON.stringify(r.body).includes(access.token),false,route);
   const entries=route==='/runs'?Object.values(r.body.coordination.accesses):route.endsWith('/status')?r.body.coordination.accesses:r.body.accesses;
   for(const item of entries)assert.equal(Object.hasOwn(item,'token'),false,route);
  }
 };
 await check();
 if(restored){await h.stop();await h.start();await check();return;}
 const replay=await h.post('/runs/'+run.runId+'/locks/acquire',{version:run.version,operationId:approval.operation_id,operationDigest:approval.operation_digest,resources:approval.resources,expectedRevisions:approval.expected_revisions});
 assert.equal(replay.status,200);assert.equal(replay.body.token,access.token);assert.equal(replay.body.fencing,access.fencing);
 await h.execute(approval);await check();await h.completeTool(approval);
 const released=await h.releaseOperation(run,approval,access);assert.equal(released.status,200,JSON.stringify(released));
 await check();assert.equal(h.native.replies.length,1);
});

test('cleanup preview HTTP : inventaire exact sans transaction ni effet',async t=>{
 const h=await setup(t),run=await h.reserve('cleanup-preview'),before=(await h.get('/runs')).body;
 const preview=await h.post('/cleanup/preview',{changeId:run.changeId,ownerId:run.ownerId});assert.equal(preview.status,200,JSON.stringify(preview));
 assert.equal(preview.body.snapshotOnly,true);assert.equal(preview.body.requiresOwnershipReview,false);assert.equal(preview.body.runBindings.length,1);
 assert.deepEqual(preview.body.runBindings[0],{runId:run.runId,contextId:run.contextId,version:run.version,ownerId:run.ownerId});
 assert.match(preview.body.inventoryDigest,/^[a-f0-9]{64}$/);assert.equal(existsSync(join(runtimeStateDirectory(h.directory),'change-erasure.json')),false);
 assert.deepEqual((await h.get('/runs')).body,before);assert.equal(h.native.replies.length,0);
 const refused=await h.post('/cleanup/preview',{changeId:run.changeId,ownerId:'foreign-owner'});assert.equal(refused.status,409);
});

test('nettoyage SGS simple : RUN actif refusé sans effet',async t=>{
 const h=await setup(t),run=await h.reserve('cleanup-active'),before=(await h.get('/runs')).body;
 const result=await h.post('/cleanup/simple-sgs',{changeId:run.changeId,runId:run.runId,bindingId:'fixture-binding'});
 assert.equal(result.status,409);assert.match(JSON.stringify(result.body),/cleanup-target-active/);
 assert.deepEqual((await h.get('/runs')).body,before);assert.equal(h.native.replies.length,0);
});
test('nettoyage SGS simple : verrou ciblé et progression des autres changes',async t=>{
 const h=await setup(t),socketDirectory=join(fixtureEnvironment.OC_Codex_RUNTIME_STATE_ROOT,'cab-approval-bridge','sgs');
 mkdirSync(socketDirectory,{recursive:true,mode:0o700});const socketPath=join(socketDirectory,'sgs.sock');
 let release,entered;const waiting=new Promise(resolve=>{entered=resolve});
 const service=createServer(async(req,res)=>{let raw='';for await(const part of req)raw+=part;const body=JSON.parse(raw);
  if(req.url!=='/reports/forget-closed-change'){res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({status:'stored'}));return;}
  assert.equal(req.url,'/reports/forget-closed-change');assert.deepEqual(body,{project:h.directory,change:'change-z',run:'direct-run',binding:'direct-binding'});
  entered();await new Promise(resolve=>{release=resolve});res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({status:'CHANGE_REPORT_FORGOTTEN'}));});
 await new Promise(resolve=>service.listen(socketPath,resolve));t.after(()=>new Promise(resolve=>service.close(resolve)));
 const cleanup=h.post('/cleanup/simple-sgs',{changeId:'change-z',runId:'direct-run',bindingId:'direct-binding'});await waiting;
 assert.equal((await h.post('/runs/reserve',h.candidate('z'))).status,409);
 assert.equal((await h.reserve('other')).state,'RESERVED');
 release();assert.equal((await cleanup).body.status,'CHANGE_REPORT_FORGOTTEN');
 assert.equal((await h.reserve('z')).state,'RESERVED');
});
test('nettoyage SGS simple : reçu figé d’un autre change reste intact',async t=>{
 const h=await setup(t),root=runtimeStateDirectory(h.directory),tx=new ErasureTransaction(root);
 const frozen={protocol:'cab-change-erasure-v1',transactionId:'erasure-11111111-1111-4111-8111-111111111111',phase:'FREEZING',
  scope:{workspace:h.directory,changeId:'frozen-change',changeIds:['frozen-change'],runIds:['frozen-run'],ids:['frozen-run']}};
 tx.save(frozen);const before=readFileSync(tx.path);
 const socketDirectory=join(fixtureEnvironment.OC_Codex_RUNTIME_STATE_ROOT,'cab-approval-bridge','sgs');mkdirSync(socketDirectory,{recursive:true,mode:0o700});
 const service=createServer(async(req,res)=>{for await(const _ of req){}res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({status:req.url==='/reports/forget-closed-change'?'CHANGE_REPORT_FORGOTTEN':'stored'}));});
 await new Promise(resolve=>service.listen(join(socketDirectory,'sgs.sock'),resolve));t.after(()=>new Promise(resolve=>service.close(resolve)));
 const same=await h.post('/cleanup/simple-sgs',{changeId:'frozen-change',runId:'frozen-run',bindingId:'frozen-binding'});assert.equal(same.status,409);assert.match(JSON.stringify(same.body),/cleanup-target-in-progress/);
 const result=await h.post('/cleanup/simple-sgs',{changeId:'other-change',runId:'other-direct-run',bindingId:'other-binding'});
 assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(result.body.status,'CHANGE_REPORT_FORGOTTEN');assert.deepEqual(readFileSync(tx.path),before);
});
test('nettoyage SGS simple : contrôleur et vrai service retirent le rapport sans réimport',async t=>{
 const h=await setup(t),servicePath=fileURLToPath(new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runtime-service.py',import.meta.url));
 const service=spawn('python3',['-B',servicePath,'sgs','--no-external-collectors'],{env:fixtureEnvironment,stdio:['ignore','ignore','pipe']});let stderr='';service.stderr.on('data',b=>stderr+=b);
 t.after(()=>{if(service.exitCode===null)service.kill('SIGTERM')});
 const socketPath=join(fixtureEnvironment.OC_Codex_RUNTIME_STATE_ROOT,'cab-approval-bridge','sgs','sgs.sock');
 await waitFor(()=>{if(service.exitCode!==null)throw new Error(stderr);return existsSync(socketPath)});
 const change='change-direct',run='direct-run',session='direct-session',binding='direct-binding',uid=process.getuid();
 await runtimeRequest('sgs','/bindings',{binding,host:'fixture-host',instance:'codex-'+session+'-uid'+uid,project:h.directory,change,run,session,role:'coder',agent:'codex',mode:'direct',cab_direct:true,started_at:'2026-11-06T10:00:00Z'});
 await runtimeRequest('sgs','/bindings/close',{binding,ended_at:'2026-11-06T10:00:05Z'});
 const snapshot={format:'cab-native-sgs-1',sessions:(await runtimeRequest('sgs','/stats?project='+encodeURIComponent(h.directory))).sessions};
 const directory=join(h.directory,'openspec/changes',change);mkdirSync(directory,{recursive:true});writeFileSync(join(directory,'BLOCKERS.md'),'fixture\n');
 const evidence={schema_version:1,session_id:session,scope:'cumulative',contribution:null,native_telemetry:snapshot};
 const script=`import json,sys;from pathlib import Path;sys.path.insert(0,sys.argv[1]);import cab_sgs;e=json.load(sys.stdin);e['contribution']=cab_sgs.blank();cab_sgs.change_report(Path(sys.argv[2]),sys.argv[3],json.dumps(e).encode(),'blocked')`;
 const builder=spawn('python3',['-B','-c',script,fileURLToPath(new URL('../plugins/cab-approval-bridge/scripts/',import.meta.url)),h.directory,'openspec/changes/'+change],{stdio:['pipe','ignore','pipe']});let buildError='';builder.stderr.on('data',b=>buildError+=b);builder.stdin.end(JSON.stringify(evidence));assert.equal(await new Promise(resolve=>builder.on('exit',resolve)),0,buildError);
 const reportPath=join(directory,'STATISTICS.md'),before=readFileSync(reportPath,'utf8');
 const scope={workspace:h.directory,changeId:change,runIds:[run],ids:[session],sessionId:session,bindingId:binding,closureAuthority:'direct-session-v1'};
 await runtimeRequest('sgs','/purge/preview',{scope,branch:'BLOQUÉ'});
 await runtimeRequest('sgs','/purge',{scope,receipt_id:'fixture-direct-cleanup',components:[]});
 const result=await h.post('/cleanup/simple-sgs',{changeId:change,runId:run,bindingId:binding});assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(result.body.status,'CHANGE_REPORT_FORGOTTEN');
 const retry=await h.post('/cleanup/simple-sgs',{changeId:change,runId:run,bindingId:binding});assert.equal(retry.status,200);assert.equal(retry.body.status,'ALREADY_ABSENT');
 const other=await h.post('/cleanup/simple-sgs',{changeId:change,runId:run,bindingId:'different-binding'});assert.equal(other.status,409);
 assert.equal((await runtimeRequest('sgs','/stats?project='+encodeURIComponent(h.directory))).archives.length,0);
 await runtimeRequest('sgs','/purge/preview',{scope,branch:'BLOQUÉ'});
 assert.equal((await runtimeRequest('sgs','/stats?project='+encodeURIComponent(h.directory))).archives.length,0);assert.equal(readFileSync(reportPath,'utf8'),before);
});
