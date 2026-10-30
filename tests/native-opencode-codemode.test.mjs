import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createOpenCodeV2Client, nativeToolInputDigest } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs';

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

test('OpenCode 2.2 réel : catalogue natif, édition partielle ask/once, refus et recovery complete',
  { skip: !binary, timeout: 45000 }, async t => {
    const root = mkdtempSync(join(tmpdir(), 'cab-native-codemode-')), workspace = join(root, 'workspace');
    const brokerPidFile = join(root, 'broker-pid');
    mkdirSync(workspace); const password = 'synthetic-codemode-test-password';
    const passwordFile = join(root, 'password'); writeFileSync(passwordFile, password, { mode: 0o600 });
    const nativePort = await port(), controllerPort = await port();
    const base = 'http://127.0.0.1:' + nativePort, control = 'http://127.0.0.1:' + controllerPort;
    const queue = []; let dispatched = 0, nativeLog = '', controlLog = '';
    let nativeTools = [];
    const provider = createServer(async (request, response) => {
      let text = ''; for await (const chunk of request) text += chunk;
      const body = JSON.parse(text), main = body.tools?.some(tool => tool.function?.name === 'execute');
      if (main) nativeTools = body.tools.map(tool => tool.function);
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
    let native, controller, eventReader, eventTask;
    const eventSamples = new Map();
    t.after(async () => {
      if (eventReader) await eventReader.cancel();
      if (eventTask) await eventTask;
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
    writeFileSync(wrapper, `import sys, os\nopen(${JSON.stringify(brokerPidFile)}, 'w').write(str(os.getpid()))\nsys.path.insert(0, ${JSON.stringify(source)})\nimport cgpt_approval_bridge_server as b\n# Reproduire le schema 2.1.9, sans affaiblir son validateur runtime.\nb.APPROVAL_REQUEST_PROPERTIES['access_id'] = {'type': 'string', 'maxLength': 100}\nraise SystemExit(b.main())\n`);
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
    eventReader = (await client.events()).body.getReader();
    eventTask = (async () => {
      const decoder = new TextDecoder(); let buffer = '';
      for (;;) {
        const { done, value } = await eventReader.read(); if (done) return;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split(/\r?\n\r?\n/); buffer = frames.pop();
        for (const frame of frames) {
          const line = frame.split('\n').find(line => line.startsWith('data:'));
          if (!line) continue; const event = JSON.parse(line.slice(5));
          if (!eventSamples.has(event.type)) eventSamples.set(event.type, event);
        }
      }
    })();
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
    // Une session temporaire partage le contexte MCP existant, même depuis un client technique.
    const probeClient = createOpenCodeV2Client({ baseUrl: base, directory: join(root, 'technical-probe'), passwordFile });
    const serverPidBeforeProbe = (await client.info(true)).pid;
    const brokerPidBeforeProbe = readFileSync(brokerPidFile, 'utf8');
    const probe = await probeClient.createProbeSession({ title: 'shared-context text-only probe',
      model: { providerID: 'fixture', modelID: 'fixture' } });
    assert.equal(probe.directory, workspace);
    assert.deepEqual(probe.permission, [{ permission: '*', pattern: '*', action: 'deny' }]);
    await probeClient.prompt(probe.id, 'Répondre par un texte bref, aucun outil.', { directory: probe.directory });
    await until(async () => !(await probeClient.activeSessions(probe.directory))[probe.id], 'shared-context probe');
    const probeRows = await probeClient.messages(probe.id, probe.directory);
    assert.ok(probeRows.some(row => row.info.role === 'assistant'));
    assert.equal(probeRows.flatMap(row => row.parts.filter(part => part.type === 'tool')).length, 0);
    await probeClient.request('/api/session/' + encodeURIComponent(probe.id), { method: 'DELETE', query: { directory: probe.directory } });
    await assert.rejects(probeClient.session(probe.id, probe.directory), { code: 'opencode-http-404' });
    assert.equal((await client.info(true)).pid, serverPidBeforeProbe);
    assert.equal(readFileSync(brokerPidFile, 'utf8'), brokerPidBeforeProbe);
    assert.equal((await client.mcp())['cgpt-validation'].status, 'connected');
    console.log('Sonde native isolée : location partagée, deny global, aucun outil, PID et broker conservés, session supprimée.');
    // Reproduire et réparer un détenteur concurrent seulement sur ce serveur privé.
    const foreignDirectory = join(root, 'foreign-context'); mkdirSync(foreignDirectory);
    const mcpRoute = '/api/experimental/mcp/cgpt-validation/';
    const foreignStatus = async () => {
      const value = await client.request('/api/mcp', { query: { directory: foreignDirectory } });
      assert.equal(value.location.directory, foreignDirectory);
      return value.data.find(server => server.name === 'cgpt-validation').status.status;
    };
    const globalBrokerPid = Number(readFileSync(brokerPidFile, 'utf8'));
    await client.disconnectMcp('cgpt-validation');
    await until(async () => !existsSync('/proc/' + globalBrokerPid), 'initial private broker disconnected');
    const legacyProbe = await client.createSession({ directory: foreignDirectory, title: 'legacy foreign-context probe',
      model: { providerID: 'fixture', modelID: 'fixture' }, permissions: [{ permission: '*', pattern: '*', action: 'deny' }] });
    await client.prompt(legacyProbe.id, 'Texte seulement, aucun outil.', { directory: foreignDirectory });
    await until(async () => !(await client.activeSessions(foreignDirectory))[legacyProbe.id], 'legacy foreign-context probe');
    await until(async () => (await foreignStatus()) === 'connected', 'foreign private broker connected');
    const foreignBrokerPid = Number(readFileSync(brokerPidFile, 'utf8'));
    assert.notEqual(foreignBrokerPid, globalBrokerPid);
    try { await client.connectMcp('cgpt-validation'); }
    catch (cause) { assert.match(cause.code || '', /^opencode-http-5[0-9]{2}$/); }
    assert.equal((await client.mcp())['cgpt-validation'].status, 'failed');
    assert.equal(await foreignStatus(), 'connected');
    await client.request(mcpRoute + 'disconnect', { method: 'POST', query: { directory: foreignDirectory } });
    assert.equal(await foreignStatus(), 'disabled');
    await client.request('/api/session/' + encodeURIComponent(legacyProbe.id), { method: 'DELETE', query: { directory: foreignDirectory } });
    await assert.rejects(client.session(legacyProbe.id, foreignDirectory), { code: 'opencode-http-404' });
    await until(async () => !existsSync('/proc/' + foreignBrokerPid), 'foreign private broker disconnected');
    await client.connectMcp('cgpt-validation');
    assert.equal((await client.mcp())['cgpt-validation'].status, 'connected');
    assert.equal(await foreignStatus(), 'disabled');
    assert.equal((await client.info(true)).pid, serverPidBeforeProbe);
    await until(async () => (await http('/status')).brokerReadiness?.server_version === version, 'fresh private broker readiness');
    console.log('Conflit MCP natif privé reproduit : contexte concurrent connected, partagé failed ; récupération ciblée : concurrent disabled, partagé connected, même PID serveur.');
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
    console.log('Version API privée :', (await client.info()).version);
    const nativeEdit = nativeTools.find(tool => tool.name === 'edit');
    assert.deepEqual(nativeEdit.parameters.required, ['path', 'oldString', 'newString']);
    assert.equal(nativeEdit.parameters.properties.replaceAll.type, 'boolean');
    console.log('Catalogue natif synthétique :', JSON.stringify({ names: nativeTools.map(tool => tool.name), edit: nativeEdit.parameters }));
    const discoveryEnd = dispatched + 1;
    queue.push({ tool: 'execute', input: { code: 'const r = search({query: "edit"}); return r;' } });
    await client.prompt(warmup.id, 'Découverte MCP distincte des outils natifs.');
    await until(async () => !(await client.activeSessions())[warmup.id] && dispatched === discoveryEnd, 'edit catalog discovery');
    const searchRows = (await client.messages(warmup.id)).flatMap(m => m.parts.filter(p => p.tool === 'cab_codemode_discovery'));
    assert.equal(searchRows.at(-1).state.input.query, 'edit');
    const mcpItems = JSON.parse(searchRows.at(-1).state.output).items;
    console.log('Résultat search edit :', JSON.stringify(mcpItems.map(item => item.path)));
    assert.ok(mcpItems.every(item => /^tools(?:\.|\[)/.test(item.path)));
    assert.equal(mcpItems.some(item => item.path === 'edit'), false);
    console.log('Recherche MCP edit :', JSON.stringify(mcpItems.map(item => item.path)));
    const emptyReadyEnd=dispatched+1;
    queue.push({tool:'execute',input:{code:'return await tools["cgpt-validation"].broker_readiness({});'}});
    await client.prompt(warmup.id,'Diagnostic natif readiness vide uniquement, aucune permission.');
    await until(async()=>!(await client.activeSessions())[warmup.id]&&dispatched===emptyReadyEnd,'empty readiness');
    const readinessPart=(await client.messages(warmup.id)).flatMap(m=>m.parts).findLast(p=>p.tool==='cgpt-validation_broker_readiness');
    assert.ok(readinessPart);assert.deepEqual(readinessPart.state.input,{});
    assert.equal(readinessPart.state.metadata.truncated,false);
    assert.equal(readinessPart.state.metadata.toolCalls.length,1);
    assert.equal(readinessPart.state.metadata.toolCalls[0].tool,'cgpt-validation.broker_readiness');
    assert.equal(Object.hasOwn(readinessPart.state.metadata.toolCalls[0],'input'),false);
    assert.match(readinessPart.state.metadata.cabCodeMode.envelopeHash,/^[a-f0-9]{64}$/);
    assert.equal((await client.permissions()).length,0);
    console.log(JSON.stringify({emptyReadinessNative:true,inputOmitted:true,literalEmptyInputProjected:true,rawEnvelopeSealed:true,permissionCount:0}));
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
    let current = (await http('/runs')).runs.find(r => r.runId === run.runId);
    const edit = { ...approval, reservation_version: current.version, requestId: 'edit-native', approval_id: 'approval-edit-native',
      operation_id: 'operation-edit-native', operation_digest: createHash('sha256').update('synthetic file content').digest('hex'),
      resources: [{ key: 'file:fixture.txt', mode: 'write' }], expected_revisions: { 'file:fixture.txt': 0 },
      files: ['fixture.txt'], commands: [], tool_input_sha256:nativeToolInputDigest({path:join(workspace,'fixture.txt'),content:'synthetic file content'}), title: 'synthetic native write' };
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
    current = (await http('/runs')).runs.find(r => r.runId === run.runId);
    const target = join(workspace, 'fixture.txt');
    const partial = { ...edit, reservation_version: current.version, requestId: 'partial-native', approval_id: 'approval-partial-native',
      operation_id: 'operation-partial-native', operation_digest: createHash('sha256').update('synthetic changed content').digest('hex'),
      expected_revisions: { 'file:fixture.txt': (await http('/runs')).coordination.revisions['file:fixture.txt'] }, tool_input_sha256:nativeToolInputDigest({path:target,oldString:'file',newString:'changed'}), title: 'édition native partielle exacte' };
    const partialEnd = dispatched + 2;
    queue.push(mcp('request_validation', partial), { tool: 'edit', input: { path: target,
      oldString: 'file', newString: 'changed' } });
    await client.prompt(candidate.id, 'Exécuter uniquement le remplacement synthétique exact.');
    await until(async () => (await http('/runs/native-code/status')).undecidedValidationCount === 1, 'partial admission', async () => ({ status: await http('/runs/native-code/status'), parts: (await client.messages(candidate.id)).slice(-3), controlLog: controlLog.slice(-1500) }));
    await http('/runs/native-code/decision/' + partial.requestId, { decision: 'approved', rationale: 'remplacement exact examiné' });
    const partialAccess = await http('/runs/native-code/locks/acquire', { version: current.version, operationId: partial.operation_id,
      operationDigest: partial.operation_digest, resources: partial.resources, expectedRevisions: partial.expected_revisions });
    await until(async () => !(await client.activeSessions())[candidate.id] && dispatched === partialEnd, 'partial completion');
    assert.equal(readFileSync(target, 'utf8'), 'synthetic changed content');
    const editParts = (await client.messages(candidate.id)).flatMap(m => m.parts.filter(p => p.tool === 'edit'));
    assert.equal(editParts.at(-1).state.status, 'completed');
    assert.equal(editParts.at(-1).nativeTool, 'edit');
    assert.equal(editParts.at(-1).state.input.path, target);
    await http('/runs/native-code/locks/release', { version: current.version, operationId: partial.operation_id,
      token: partialAccess.token, fencing: partialAccess.fencing, outcome: 'COMPLETED', evidence: ['édition partielle native après once, contenu exact'] });
    assert.equal((await http('/runs')).coordination.operations[partial.operation_id].native.onceAcknowledged, true);

    // Sans décision CAB, une demande native reste sans effet jusqu’au refus explicite.
    const negative = await makeSession('édition refusée et remplacement ambigu');
    let negativeEnd = dispatched + 1;
    queue.push({ tool: 'edit', input: { path: target, oldString: 'changed', newString: 'forbidden' } });
    await client.prompt(negative.id, 'Demande synthétique destinée au refus.');
    let denied;
    await until(async () => { denied = (await client.permissions()).find(p => p.sessionID === negative.id); return Boolean(denied); }, 'partial denied permission');
    assert.equal(denied.permission, 'edit'); assert.equal(denied.metadata.filepath, target);
    assert.equal(denied.metadata.nativeSourceVerified, true);
    assert.equal(readFileSync(target, 'utf8'), 'synthetic changed content');
    await client.replyPermission(negative.id, denied.id, 'reject');
    await until(async () => !(await client.activeSessions())[negative.id] && dispatched === negativeEnd, 'partial rejection');
    assert.equal(readFileSync(target, 'utf8'), 'synthetic changed content');
    writeFileSync(target, 'duplicate duplicate');
    negativeEnd = dispatched + 1;
    queue.push({ tool: 'edit', input: { path: target, oldString: 'duplicate', newString: 'ambiguous' } });
    await client.prompt(negative.id, 'Remplacement ambigu synthétique, aucun replaceAll.');
    let ambiguousPermission;
    await until(async () => { ambiguousPermission = (await client.permissions()).find(p => p.sessionID === negative.id);
      return Boolean(ambiguousPermission); }, 'ambiguous permission');
    assert.equal(readFileSync(target, 'utf8'), 'duplicate duplicate');
    await client.replyPermission(negative.id, ambiguousPermission.id, 'once');
    await until(async () => !(await client.activeSessions())[negative.id] && dispatched === negativeEnd, 'ambiguous replacement');
    assert.equal(readFileSync(target, 'utf8'), 'duplicate duplicate');
    const ambiguous = (await client.messages(negative.id)).flatMap(m => m.parts.filter(p => p.tool === 'edit')).at(-1);
    assert.equal(ambiguous.state.status, 'error');
    assert.match(ambiguous.state.error, /multiple|matches|occurrences/i);
    assert.equal((await client.permissions()).length, 0);
    const retryCandidate = await makeSession('candidate après refus natif historique');
    const retryRecovery = { jobId: 'job-code', expectedSessionId: candidate.id, sessionId: retryCandidate.id,
      recoveryId: 'rec-native-invalid', preflightRequestId: 'invalid-native' };
    await http('/runs/native-code/job/recover', { ...retryRecovery, phase: 'prepare' });
    current = (await http('/runs')).runs.find(r => r.runId === run.runId);
    const invalidEnd = dispatched + 1;
    const invalid = { ...approval, reservation_version: current.version, session_id: retryCandidate.id,
      requestId: 'invalid-native', approval_id: 'approval-invalid-native', operation_id: 'operation-invalid-native', access_id: '' };
    queue.push(mcp('request_validation', invalid));
    await client.prompt(retryCandidate.id, 'Refus synthétique avant enregistrement.');
    await until(async () => !(await client.activeSessions())[retryCandidate.id] && dispatched === invalidEnd, 'MCP invalid request');
    const invalidMessage = (await client.messages(retryCandidate.id)).find(message => message.parts.some(part => part.state?.input?.requestId === invalid.requestId || part.state?.input?.code?.includes('invalid-native')));
    const invalidRows = await client.request('/api/session/' + retryCandidate.id + '/message/' + invalidMessage.info.id);
    const invalidNative = invalidRows.data.content.filter(part => part.type === 'tool').at(-1);
    console.log('Erreur native MCP synthétique :', JSON.stringify(invalidNative));
    assert.deepEqual(invalidMessage.info.tokens, invalidRows.data.tokens);
    assert.equal(invalidMessage.info.cost, invalidRows.data.cost);
    assert.equal(invalidMessage.info.usageSource, 'opencode-v2');
    console.log('Métriques natives synthétiques :', JSON.stringify({ tokens: invalidRows.data.tokens, cost: invalidRows.data.cost, native: invalidRows.data.native }));
    const unknownEnd = dispatched + 1;
    queue.push(mcp('get_approval', { approval_id: invalid.approval_id }));
    await client.prompt(retryCandidate.id, 'Vérifier seulement l’absence de cette approbation synthétique.');
    await until(async () => !(await client.activeSessions())[retryCandidate.id] && dispatched === unknownEnd, 'MCP unknown approval');
    const unknownMessage = (await client.messages(retryCandidate.id)).find(message => message.parts.some(part => part.tool === 'cgpt-validation_get_approval' || part.state?.input?.code?.includes('get_approval')));
    console.log('Lookup natif inconnu synthétique :', JSON.stringify((await client.request('/api/session/' + retryCandidate.id + '/message/' + unknownMessage.info.id)).data.content));
    const retried = await http('/runs/native-code/job/recover', { ...retryRecovery, phase: 'retry',
      previousPreflightRequestId: invalid.requestId, preflightRequestId: 'valid-native-retry' });
    assert.equal(retried.recovery.sessionId, retryCandidate.id);
    assert.equal(retried.recovery.attempts.at(-1).preflightRequestId, invalid.requestId);
    assert.match(retried.recovery.attempts.at(-1).nativeToolHash, /^[a-f0-9]{64}$/);
    const retryApproval = { ...invalid, requestId: 'valid-native-retry', approval_id: 'approval-valid-native-retry',
      operation_id: 'operation-valid-native-retry' };
    delete retryApproval.access_id;
    const retryEnd = dispatched + 3;
    queue.push(mcp('request_validation', retryApproval), { tool: 'shell', input: { command: '/usr/bin/true' } }, mcp('broker_readiness', { run_id: run.runId }));
    await client.prompt(retryCandidate.id, 'Prévol neuf après refus réconcilié.');
    await until(async () => (await http('/runs/native-code/status')).undecidedValidationCount === 1, 'retry admission');
    await http('/runs/native-code/decision/' + retryApproval.requestId, { decision: 'approved', rationale: 'prévol neuf examiné' });
    const retryAccess = await http('/runs/native-code/locks/acquire', { version: current.version, operationId: retryApproval.operation_id,
      operationDigest: retryApproval.operation_digest, resources: retryApproval.resources, expectedRevisions: retryApproval.expected_revisions });
    await until(async () => !(await client.activeSessions())[retryCandidate.id] && dispatched === retryEnd, 'retry native completion');
    await http('/runs/native-code/locks/release', { version: current.version, operationId: retryApproval.operation_id,
      token: retryAccess.token, fencing: retryAccess.fencing, outcome: 'COMPLETED', evidence: ['prévol corrigé, once propre et exit zéro'] });
    const retryDone = await http('/runs/native-code/job/recover', { ...retryRecovery, preflightRequestId: retryApproval.requestId, phase: 'complete' });
    assert.equal(retryDone.sessionId, retryCandidate.id); assert.equal(retryDone.recovery, null);
    const readonly = await client.createSession({ title: 'analyse native protégée', model: { providerID: 'fixture', modelID: 'fixture' },
      permissions: ['shell', 'edit', 'subagent', 'skill'].map(permission => ({ permission, pattern: '*', action: 'deny' })) });
    const readonlyEnd = dispatched + 2, sentinel = join(workspace, 'forbidden.txt');
    queue.push({ tool: 'edit', input: { path: target, oldString: 'duplicate', newString: 'forbidden', replaceAll: true } },
      { tool: 'shell', input: { command: `echo forbidden > '${sentinel}'` } });
    await client.prompt(readonly.id, 'Analyse en lecture seule, aucun outil d’écriture autorisé.');
    await until(async () => !(await client.activeSessions())[readonly.id] && dispatched === readonlyEnd, 'readonly restrictions');
    assert.equal(readFileSync(target, 'utf8'), 'duplicate duplicate'); assert.equal(existsSync(sentinel), false);
    assert.equal((await client.permissions()).length, 0);
    const rules = (await client.session(readonly.id)).permission;
    assert.ok(eventSamples.has('session.execution.started'));
    assert.ok(eventSamples.has('session.usage.updated'));
    assert.ok(eventSamples.has('permission.asked'));
    console.log('SSE natif synthétique :', JSON.stringify([...eventSamples].filter(([type]) => /session\.(execution|usage)|permission\./.test(type))));
    assert.ok(['shell', 'edit'].every(name => rules.some(rule => rule.permission === name && rule.pattern === '*' && rule.action === 'deny')));

    // Même cible et APPROVED, mais arguments divergents : aucune once ni écriture.
    current=(await http('/runs')).runs.find(r=>r.runId===run.runId);
    const mismatch={...partial,reservation_version:current.version,session_id:retryCandidate.id,requestId:'input-mismatch',approval_id:'approval-input-mismatch',operation_id:'operation-input-mismatch',
      operation_digest:createHash('sha256').update('mismatch').digest('hex'),expected_revisions:{'file:fixture.txt':(await http('/runs')).coordination.revisions['file:fixture.txt']},
      tool_input_sha256:nativeToolInputDigest({path:target,content:'approved replacement'})};
    const mismatchEnd=dispatched+2;
    queue.push(mcp('request_validation',mismatch),{tool:'write',input:{path:target,content:'UNAPPROVED replacement'}});
    await client.prompt(retryCandidate.id,'Execute only the queued synthetic mismatch.');
    await until(async()=>(await http('/runs/native-code/status')).undecidedValidationCount===1,'mismatch admission');
    await http('/runs/native-code/decision/'+mismatch.requestId,{decision:'approved'});
    await http('/runs/native-code/locks/acquire',{version:current.version,operationId:mismatch.operation_id,operationDigest:mismatch.operation_digest,resources:mismatch.resources,expectedRevisions:mismatch.expected_revisions});
    await until(async()=>(await http('/runs/native-code/status')).blockedNativeInputs.some(x=>x.requestId===mismatch.requestId),'digest guard');
    const blocked=(await client.permissions(workspace,{verifyInputs:true})).find(p=>p.sessionID===retryCandidate.id);assert.ok(blocked);
    assert.notEqual(blocked.metadata.nativeToolInputSha256,mismatch.tool_input_sha256);
    assert.equal(readFileSync(target,'utf8'),'duplicate duplicate');
    assert.notEqual((await http('/runs')).coordination.operations[mismatch.operation_id].native?.onceAcknowledged,true);
    await client.replyPermission(retryCandidate.id,blocked.id,'reject');
    await until(async()=>!(await client.activeSessions())[retryCandidate.id]&&dispatched===mismatchEnd,'mismatch explicit rejection');
    assert.equal(readFileSync(target,'utf8'),'duplicate duplicate');
    console.log(JSON.stringify({nativeInputGuard:true,exactWrite:true,exactEdit:true,mismatchBeforeOnce:true,filePreserved:true}));


  });
