import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createOpenCodeV2Client } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs';

const binary = process.env.CAB_TEST_OPENCODE;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function port() {
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const value = server.address().port; await new Promise(resolve => server.close(resolve)); return value;
}
async function until(check, label, diagnostic) {
  for (let i = 0; i < 150; i++) { if (await check()) return; await delay(100); }
  throw Error('native Code Mode timeout: ' + label + (diagnostic ? ' ' + JSON.stringify(await diagnostic()) : ''));
}

test('OpenCode 2.2 réel : Code Mode MCP, shell ask/once, preuve et recovery complete',
  { skip: !binary, timeout: 45000 }, async t => {
    const root = mkdtempSync(join(tmpdir(), 'cab-native-codemode-')), workspace = join(root, 'workspace');
    const brokerPidFile = join(root, 'broker-pid');
    mkdirSync(workspace); const password = 'synthetic-codemode-test-password';
    const passwordFile = join(root, 'password'); writeFileSync(passwordFile, password, { mode: 0o600 });
    const nativePort = await port(), controllerPort = await port();
    const base = 'http://127.0.0.1:' + nativePort, control = 'http://127.0.0.1:' + controllerPort;
    const queue = []; let dispatched = 0, nativeLog = '', controlLog = '';
    const provider = createServer(async (request, response) => {
      let text = ''; for await (const chunk of request) text += chunk;
      const body = JSON.parse(text), main = body.tools?.some(tool => tool.function?.name === 'execute');
      const action = main ? queue.shift() : null;
      if (action) dispatched++;
      const delta = action ? { role: 'assistant', tool_calls: [{ index: 0, id: 'native_call_' + dispatched,
        type: 'function', function: { name: action.tool, arguments: JSON.stringify(action.input) } }] }
        : { role: 'assistant', content: 'synthetic fixture done' };
      response.writeHead(200, { 'content-type': 'text/event-stream' });
      for (const [value, finish] of [[delta, null], [{}, action ? 'tool_calls' : 'stop']]) {
        response.write('data: ' + JSON.stringify({ id: 'fixture', object: 'chat.completion.chunk', created: 1,
          model: 'fixture', choices: [{ index: 0, delta: value, finish_reason: finish }] }) + '\n\n');
      }
      response.end('data: [DONE]\n\n');
    });
    await new Promise(resolve => provider.listen(0, '127.0.0.1', resolve));
    let native, controller;
    t.after(async () => {
      for (const child of [controller, native]) if (child && child.exitCode === null && child.signalCode === null) {
        const done = new Promise(resolve => child.once('exit', resolve)); child.kill('SIGTERM'); await done;
      }
      await new Promise(resolve => provider.close(resolve));
      if (existsSync(brokerPidFile)) {
        const pid = Number(readFileSync(brokerPidFile, 'utf8'));
        assert.ok(Number.isSafeInteger(pid) && pid > 0);
        await until(async () => !existsSync('/proc/' + pid), 'broker process cleanup');
      }
      rmSync(root, { recursive: true, force: true });
    });
    const source = fileURLToPath(new URL('../src/', import.meta.url));
    const wrapper = join(root, 'broker.py');
    writeFileSync(wrapper, `import sys, os\nopen(${JSON.stringify(brokerPidFile)}, 'w').write(str(os.getpid()))\nsys.path.insert(0, ${JSON.stringify(source)})\nimport cgpt_approval_bridge_server as b\nraise SystemExit(b.main())\n`);
    const config = { autoupdate: false, share: 'disabled', providers: { fixture: {
      package: 'aisdk:@ai-sdk/openai-compatible', settings: { baseURL: 'http://127.0.0.1:' + provider.address().port + '/v1',
        apiKey: 'synthetic-local-key' }, models: { fixture: { name: 'fixture', limit: { context: 32000, output: 4096 },
        capabilities: { tools: true, input: ['text'], output: ['text'] } } } } },
      mcp: { servers: { 'cgpt-validation': { type: 'local', command: ['python3', wrapper], environment: {
        CGPT_CONTROLLER_URL: control, CGPT_APPROVAL_STORE: join(root, 'approvals.json'),
        CGPT_APPROVAL_JOURNAL: join(root, 'journal.ndjson'), CGPT_BROKER_INSTANCE_LOCK: join(root, 'broker.lock'),
        CGPT_JOURNAL_CHECKPOINT_PATH: join(root, 'checkpoint.json'), CGPT_AUTO_REMEDIATION_CB_STATE_PATH: join(root, 'circuit.json') } } } } };
    native = spawn(binary, ['serve', '--hostname', '127.0.0.1', '--port', String(nativePort)], {
      cwd: workspace, stdio: ['ignore', 'ignore', 'pipe'], env: { PATH: process.env.PATH, HOME: root,
        XDG_CONFIG_HOME: join(root, 'config'), XDG_DATA_HOME: join(root, 'data'), XDG_CACHE_HOME: join(root, 'cache'),
        XDG_STATE_HOME: join(root, 'state'), OPENCODE_PASSWORD: password, OPENCODE_CONFIG_CONTENT: JSON.stringify(config),
        OPENCODE_DISABLE_PROJECT_CONFIG: '1', OPENCODE_DISABLE_DEFAULT_PLUGINS: '1', OPENCODE_DISABLE_CLAUDE_CODE: '1',
        OPENCODE_DISABLE_MODELS_FETCH: '1', OPENCODE_DISABLE_AUTOUPDATE: '1', OPENCODE_DISABLE_LSP_DOWNLOAD: '1' } });
    native.stderr.on('data', chunk => nativeLog += chunk);
    const client = createOpenCodeV2Client({ baseUrl: base, directory: workspace, passwordFile });
    await until(async () => { if (native.exitCode !== null) throw Error('native startup: ' + nativeLog.replaceAll(password, '[synthetic]'));
      try { return (await client.info()).version.startsWith('2.2.'); } catch { return false; } }, 'native startup');
    controller = spawn(process.execPath, [fileURLToPath(new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs', import.meta.url))],
      { stdio: ['ignore', 'ignore', 'pipe'], env: { PATH: process.env.PATH, OC_Codex_WORKSPACE: workspace,
        OC_Codex_OUTSIDE_SANDBOX: '1', OC_Codex_OPENCODE_URL: base, OC_Codex_OPENCODE_PASSWORD_FILE: passwordFile,
        OC_Codex_STATUS_PORT: String(controllerPort), OC_Codex_DECISION_MODE: 'manual', CODEX_COMMAND: 'cab-test-unused' } });
    controller.stderr.on('data', chunk => controlLog += chunk);
    async function http(path, body) {
      const r = await fetch(control + path, { method: body ? 'POST' : 'GET',
        headers: { 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(5000) });
      const text = await r.text(); const data = text ? JSON.parse(text) : null;
      assert.ok(r.ok, JSON.stringify({ path, http: r.status, data })); return data;
    }
    const version = readFileSync(new URL('../pyproject.toml', import.meta.url), 'utf8').match(/^version = "([^"]+)"/m)[1];
    await until(async () => { if (controller.exitCode !== null) throw Error('controller startup: ' + controlLog);
      try { return (await http('/status')).brokerReadiness?.server_version === version; } catch { return false; } }, 'broker readiness');
    const makeSession = title => client.createSession({ title, model: { providerID: 'fixture', modelID: 'fixture' },
      permissions: ['shell', 'bash', 'edit'].map(permission => ({ permission, pattern: '*', action: 'ask' })) });
    const discovery = { tool: 'execute', input: { code: 'const r = search({"query":"broker_readiness","namespace":"cgpt-validation"}); return r;' } };
    const warmup = await makeSession('read-only catalog availability');
    let catalogReady = false;
    for (let i = 0; i < 10 && !catalogReady; i++) {
      const expected = dispatched + 1; queue.push(discovery);
      await client.prompt(warmup.id, 'Read-only tool catalog discovery.');
      await until(async () => !(await client.activeSessions())[warmup.id] && dispatched === expected, 'catalog discovery');
      const rows = await client.messages(warmup.id);
      const last = rows.flatMap(m => m.parts.filter(p => p.tool === 'cab_codemode_discovery')).at(-1);
      catalogReady = Boolean(last && JSON.parse(last.state.output).items.some(item => item.path?.endsWith('.broker_readiness')));
      if (!catalogReady) await delay(100);
    }
    assert.equal(catalogReady, true, 'MCP catalog must advertise broker_readiness before preflight');
    const old = await makeSession('old'), candidate = await makeSession('candidate');
    const resource = 'resource:native-preflight';
    const run = await http('/runs/reserve', { runId: 'native-code', ownerId: 'synthetic-owner', sessionId: old.id,
      directory: workspace, changeId: 'synthetic-code', selectionKey: 'synthetic-code', dependsOn: [],
      resources: [{ key: resource, mode: 'read' }, { key: 'file:fixture.txt', mode: 'write' }] });
    await http('/runs/native-code/job/arm', { jobId: 'job-code', sessionId: old.id, directory: workspace,
      changeId: 'synthetic-code', strictCommands: true, criteria: ['native once proof'] });
    const recovery = { jobId: 'job-code', expectedSessionId: old.id, sessionId: candidate.id,
      recoveryId: 'rec-code', preflightRequestId: 'preflight-code' };
    await http('/runs/native-code/job/recover', { ...recovery, phase: 'prepare' });
    const approval = { run_id: run.runId, reservation_version: run.version, coordination_protocol: 'resource-scoped-v1',
      requestId: recovery.preflightRequestId, approval_id: 'approval-code', operation_id: 'operation-code',
      operation_digest: createHash('sha256').update('/usr/bin/true').digest('hex'), resources: [{ key: resource, mode: 'read' }],
      expected_revisions: { [resource]: 0 }, session_id: candidate.id, directory: workspace, change_id: 'synthetic-code',
      files: [], commands: ['/usr/bin/true'], title: 'synthetic native proof', summary: 'local fixture', timeout_seconds: 30, interval_seconds: 1 };
    const mcp = (name, input) => ({ tool: 'execute', input: { code: `return await tools["cgpt-validation"].${name}(${JSON.stringify(input)});` } });
    const expectedDispatched = dispatched + 5;
    queue.push({ tool: 'execute', input: { code: 'search({query: "broker_readiness"}); return "search done";' } },
      mcp('broker_readiness', { run_id: run.runId }), mcp('request_validation', approval),
      { tool: 'shell', input: { command: '/usr/bin/true' } }, mcp('broker_readiness', { run_id: run.runId }));
    await client.prompt(candidate.id, 'Execute only the queued synthetic preflight.');
    await until(async () => (await http('/runs/native-code/status')).undecidedValidationCount === 1, 'native admission', async () => ({
      dispatched, remaining: queue.length, permissions: await client.permissions(), messages: (await client.messages(candidate.id)).slice(-3),
      controller: controlLog.slice(-1000).replaceAll(password, '[synthetic]'), native: nativeLog.slice(-1000).replaceAll(password, '[synthetic]') }));
    await http('/runs/native-code/decision/' + approval.requestId, { decision: 'approved', rationale: 'synthetic orchestrator decision' });
    const access = await http('/runs/native-code/locks/acquire', { version: run.version, operationId: approval.operation_id,
      operationDigest: approval.operation_digest, resources: approval.resources, expectedRevisions: approval.expected_revisions });
    assert.equal(access.state, 'HELD');
    await until(async () => !(await client.activeSessions())[candidate.id] && dispatched === expectedDispatched, 'native completion');
    const parts = (await client.messages(candidate.id)).flatMap(message => message.parts.filter(part => part.type === 'tool'));
    assert.deepEqual(parts.map(part => part.tool), ['cab_codemode_discovery', 'cgpt-validation_broker_readiness', 'cgpt-validation_request_validation', 'bash', 'cgpt-validation_broker_readiness'], JSON.stringify(parts[1]));
    assert.equal(parts[0].state.output, 'search done');
    assert.equal(parts[3].executed, false); assert.equal(parts[3].nativeTool, 'shell'); assert.equal(parts[3].state.metadata.exit, 0);
    const status = await http('/runs/native-code/status'); assert.equal(status.unmatchedNativePermissionCount, 0);
    await http('/runs/native-code/locks/release', { version: run.version, operationId: approval.operation_id,
      token: access.token, fencing: access.fencing, outcome: 'COMPLETED', evidence: ['native shell exited zero after once'] });
    const operations = (await http('/runs')).coordination.operations;
    assert.equal(operations[approval.operation_id].native.onceAcknowledged, true);
    assert.equal(operations[approval.operation_id].state, 'COMPLETED');
    const done = await http('/runs/native-code/job/recover', { ...recovery, phase: 'complete' });
    assert.equal(done.sessionId, candidate.id); assert.equal(done.recovery, null); assert.equal(done.terminalGate.status, 'OPEN');
    assert.equal((await client.permissions()).length, 0);
    const current = (await http('/runs')).runs.find(r => r.runId === run.runId);
    const edit = { ...approval, reservation_version: current.version, requestId: 'edit-native', approval_id: 'approval-edit-native',
      operation_id: 'operation-edit-native', operation_digest: createHash('sha256').update('synthetic file content').digest('hex'),
      resources: [{ key: 'file:fixture.txt', mode: 'write' }], expected_revisions: { 'file:fixture.txt': 0 },
      files: ['fixture.txt'], commands: [], title: 'synthetic native write' };
    const end = dispatched + 2;
    queue.push(mcp('request_validation', edit), { tool: 'write', input: { path: join(workspace, 'fixture.txt'), content: 'synthetic file content' } });
    await client.prompt(candidate.id, 'Execute only the queued synthetic file operation.');
    await until(async () => (await http('/runs/native-code/status')).undecidedValidationCount === 1, 'write admission');
    await http('/runs/native-code/decision/' + edit.requestId, { decision: 'approved', rationale: 'synthetic exact file content reviewed' });
    const writeAccess = await http('/runs/native-code/locks/acquire', { version: current.version, operationId: edit.operation_id,
      operationDigest: edit.operation_digest, resources: edit.resources, expectedRevisions: edit.expected_revisions });
    await until(async () => !(await client.activeSessions())[candidate.id] && dispatched === end, 'write completion');
    assert.equal(readFileSync(join(workspace, 'fixture.txt'), 'utf8'), 'synthetic file content');
    await http('/runs/native-code/locks/release', { version: current.version, operationId: edit.operation_id,
      token: writeAccess.token, fencing: writeAccess.fencing, outcome: 'COMPLETED', evidence: ['native exact file after once'] });
    assert.equal((await http('/runs')).coordination.operations[edit.operation_id].native.onceAcknowledged, true);
    assert.equal((await client.permissions()).length, 0);
  });
