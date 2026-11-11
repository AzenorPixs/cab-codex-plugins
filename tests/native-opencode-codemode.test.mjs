import { once } from 'node:events';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, chmodSync, chownSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createOpenCodeV2Client, nativeToolInputDigest, nativeCodingMandate, diagnoseCodingTurn } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs';
import {runtimeStateDirectory} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-state-layout.mjs';
import {runtimeRequest} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runtime-client.mjs';

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
  { skip: !binary, timeout: 90000 }, async t => {
    const root = mkdtempSync(join(tmpdir(), 'cab-native-codemode-')), workspace = join(root, 'workspace');
    const brokerPidFile = join(root, 'broker-pid');
    mkdirSync(workspace);
    const brokerUid=process.env.CAB_TEST_BROKER_UID?Number(process.env.CAB_TEST_BROKER_UID):process.getuid();
    if(brokerUid!==process.getuid()){chownSync(root,process.getuid(),brokerUid);chmodSync(root,0o2770);chownSync(workspace,process.getuid(),brokerUid);chmodSync(workspace,0o2770);}
    const brokerHome=join(root,'broker-home');mkdirSync(brokerHome,{mode:0o770});
    const password = 'synthetic-codemode-test-password';
    const passwordFile = join(root, 'password'); writeFileSync(passwordFile, password, { mode: 0o600 });
    const nativePort = await port(), controllerPort = await port();
    const base = 'http://127.0.0.1:' + nativePort, control = 'http://127.0.0.1:' + controllerPort;
    const queue = []; const providerRequests=[]; let dispatched = 0, nativeLog = '', controlLog = '';
    let nativeTools = [];
    const provider = createServer(async (request, response) => {
      if(request.method!=='POST'){response.writeHead(404).end();return;}
      let text = ''; for await (const chunk of request) text += chunk;
      if(!text){response.writeHead(400).end();return;}
      providerRequests.push(text);const body = JSON.parse(text), main = body.tools?.some(tool => tool.function?.name === 'execute');
      if (main) nativeTools = body.tools.map(tool => tool.function);
      const action = main ? queue.shift() : null;
      if (action) dispatched++;
      if(action?.providerError){response.writeHead(400,{'content-type':'application/json'});response.end(JSON.stringify({error:{type:'invalid_request_error',message:'SYNTHETIC_PROVIDER_FAILURE'}}));return;}
      const delta = action?.text ? { role: 'assistant', content: action.text } : action ? { role: 'assistant', tool_calls: [{ index: 0, id: 'native_call_' + dispatched,
        type: 'function', function: { name: action.tool, arguments: JSON.stringify(action.input) } }] }
        : { role: 'assistant', content: 'synthetic fixture done' };
      response.writeHead(200, { 'content-type': 'text/event-stream' });
      for (const [value, finish] of [[delta, null], [{}, action?.tool ? 'tool_calls' : 'stop']]) {
        response.write('data: ' + JSON.stringify({ id: 'fixture', object: 'chat.completion.chunk', created: 1,
          model: 'fixture', ...(finish && action?.usage ? { usage: action.usage } : {}),
          choices: [{ index: 0, delta: value, finish_reason: finish }] }) + '\n\n');
      }
      response.end('data: [DONE]\n\n');
    });
    await new Promise(resolve => provider.listen(0, '127.0.0.1', resolve));
    let native, controller, sgs, eventReader, eventTask;
    const eventSamples = new Map();
    t.after(async () => {
      if (eventReader) await eventReader.cancel();
      if (eventTask) await eventTask;
      for (const child of [controller, sgs, native]) if (child && child.exitCode === null && child.signalCode === null) {
        const done = new Promise(resolve => child.once('exit', resolve)); child.kill('SIGTERM'); await done;
      }
      await new Promise(resolve => provider.close(resolve));
      if (existsSync(brokerPidFile)) {
        const pid = Number(readFileSync(brokerPidFile, 'utf8'));
        assert.ok(Number.isSafeInteger(pid) && pid > 0);
        await until(async () => !existsSync('/proc/' + pid), 'broker process cleanup');
      }
      if(brokerUid!==process.getuid())execFileSync('sudo',['-n','rm','-rf','--',root]);
      else rmSync(root, { recursive: true, force: true });
    });
    const source = fileURLToPath(new URL('../plugins/cab-approval-bridge/broker/', import.meta.url));
    const wrapper = join(root, 'broker.py');
    writeFileSync(wrapper, `import sys, os\nopen(${JSON.stringify(brokerPidFile)}, 'w').write(str(os.getpid()))\nsys.path.insert(0, ${JSON.stringify(source)})\nimport cgpt_approval_bridge_server as b\n# Reproduire le schema 2.1.9, sans affaiblir son validateur runtime.\nb.APPROVAL_REQUEST_PROPERTIES['access_id'] = {'type': 'string', 'maxLength': 100}\nraise SystemExit(b.main())\n`);
    if(process.env.CAB_TEST_EXTERNAL==='1'&&!process.env.CAB_TEST_EXTERNAL_SSH_PORT) {
      const extra=`
import cgpt_approval_bridge_external as external
import cgpt_approval_bridge_external_runner as runner
from pathlib import Path
remote=Path(${JSON.stringify(join(root,'remote-fixture'))});remote.mkdir(mode=0o700,exist_ok=True)
def fixture_transport(cfg,packet,timeout):
 return runner.handle(packet,state_root=remote,identity={'container':'lxc','fingerprint':'b'*64})
external._call.__kwdefaults__['transport']=fixture_transport
`;
      const original=readFileSync(wrapper,'utf8');writeFileSync(wrapper,original.replace('raise SystemExit(b.main())',extra+'\nraise SystemExit(b.main())'));
    }
    if(process.env.CAB_TEST_PREFLIGHT_FAILURE==='1') {
      const extra=`
import cgpt_approval_bridge_external as external
original_private_root=external.private_root
fail_once=[True]
def preflight_failure_once(*args,**kwargs):
 if fail_once[0]:
  fail_once[0]=False
  raise external.ExternalError('external-state-unsafe')
 return original_private_root(*args,**kwargs)
external.private_root=preflight_failure_once
`;
      const original=readFileSync(wrapper,'utf8');writeFileSync(wrapper,original.replace('raise SystemExit(b.main())',extra+'\nraise SystemExit(b.main())'));
    }
    const config = { autoupdate: false, share: 'disabled', providers: { fixture: {
      package: 'aisdk:@ai-sdk/openai-compatible', settings: { baseURL: 'http://127.0.0.1:' + provider.address().port + '/v1',
        apiKey: 'synthetic-local-key' }, models: { fixture: { name: 'fixture', limit: { context: 262144, output: 4096 },
        capabilities: { tools: true, input: ['text'], output: ['text'] } } } } },
      mcp: { servers: { 'cgpt-validation': { type: 'local', command: ['python3', wrapper], environment: {
        CGPT_CONTROLLER_URL: control, CGPT_APPROVAL_STORE: join(root, 'approvals.json'),
        CGPT_APPROVAL_JOURNAL: join(root, 'journal.ndjson'), CGPT_BROKER_INSTANCE_LOCK: join(root, 'broker.lock'),
        CGPT_JOURNAL_CHECKPOINT_PATH: join(root, 'checkpoint.json'), CGPT_AUTO_REMEDIATION_CB_STATE_PATH: join(root, 'circuit.json') } } } } };
    if(brokerUid!==process.getuid()) {
      const server=config.mcp.servers['cgpt-validation'];
      server.command=['sudo','-n','-u','#'+brokerUid,'/usr/bin/env','HOME='+brokerHome,
        ...Object.entries(server.environment).map(([k,v])=>k+'='+v),'/home/devops/python/current/bin/python3',wrapper];
    }
    native = spawn(binary, ['serve', '--hostname', '127.0.0.1', '--port', String(nativePort)], {
      cwd: workspace, stdio: ['ignore', 'ignore', 'pipe'], env: { PATH: process.env.PATH, HOME: root,
        XDG_CONFIG_HOME: join(root, 'config'), XDG_DATA_HOME: join(root, 'data'), XDG_CACHE_HOME: join(root, 'cache'),
        XDG_STATE_HOME: join(root, 'state'), OPENCODE_PASSWORD: password, OPENCODE_CONFIG_CONTENT: JSON.stringify(config),
        OPENCODE_DISABLE_PROJECT_CONFIG: '1', OPENCODE_DISABLE_DEFAULT_PLUGINS: '1', OPENCODE_DISABLE_CLAUDE_CODE: '1',
        OPENCODE_DISABLE_MODELS_FETCH: '1', OPENCODE_DISABLE_AUTOUPDATE: '1', OPENCODE_DISABLE_LSP_DOWNLOAD: '1' } });
    native.stderr.on('data', chunk => nativeLog += chunk);
    const client = createOpenCodeV2Client({ baseUrl: base, directory: workspace, passwordFile, permissionReceiptDirectory:join(root,'private-replies'),permissionRepairDirectory:join(root,'private-grant-repairs') });
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
    const stateRoot=join(root,'private-state'),sgsDirectory=join(stateRoot,'cab-approval-bridge','sgs'),sgsSocket=join(sgsDirectory,'sgs.sock');
    mkdirSync(sgsDirectory,{recursive:true,mode:0o700});
    const sgsEnvironment={PATH:'/home/devops/node/current/bin:'+process.env.PATH,HOME:root,OC_Codex_RUNTIME_STATE_ROOT:stateRoot,
      OC_Codex_OPENCODE_URL:base,OC_Codex_OPENCODE_PASSWORD_FILE:passwordFile};
    sgs=spawn('/home/devops/python/current/bin/python3',['-B',fileURLToPath(new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runtime-service.py',import.meta.url)),
      'sgs','--state-directory',sgsDirectory],{env:sgsEnvironment,stdio:['ignore','ignore','pipe']});
    let sgsLog='';sgs.stderr.on('data',chunk=>sgsLog+=chunk);
    const sgsCall=(path,body)=>runtimeRequest('sgs',path,body,{socketPath:sgsSocket,timeout:1000});
    await until(async()=>{if(sgs.exitCode!==null)throw Error('SGS fixture: '+sgsLog);try{return (await sgsCall('/status')).status==='READY';}catch{return false;}},'isolated SGS');
    const controllerEntry=fileURLToPath(new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs',import.meta.url));
    const stageEntry=new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-shell-stage.mjs',import.meta.url).href;
    const controllerWrapper=join(root,'controller-wrapper.mjs');
    writeFileSync(controllerWrapper,`import {ShellStageStore} from ${JSON.stringify(stageEntry)};const original=ShellStageStore.prototype.get;ShellStageStore.prototype.get=function(id){const s=original.call(this,id);return id==='stage-corrupt-fixture'&&s?{...s,payload:s.payload.replace('CAB_LONG_EXACT_OK','CAB_LONG_WRONG_OK')}:s};await import(${JSON.stringify(new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs',import.meta.url).href)});`);
    function startController() {
      controller = spawn(process.execPath, [controllerWrapper],
      { stdio: ['ignore', 'ignore', 'pipe'], env: { PATH: process.env.PATH, HOME:root, OC_Codex_WORKSPACE: workspace, OC_Codex_RUNTIME_STATE_ROOT:stateRoot,
        OC_Codex_OUTSIDE_SANDBOX: '1', OC_Codex_OPENCODE_URL: base, OC_Codex_OPENCODE_PASSWORD_FILE: passwordFile,
        OC_Codex_STATUS_PORT: String(controllerPort), OC_Codex_DECISION_MODE: 'manual', CODEX_COMMAND: 'cab-test-unused' } });
      controller.stderr.on('data', chunk => controlLog += chunk);
    }
    startController();
    async function http(path, body) {
      const r = await fetch(control + path, { method: body ? 'POST' : 'GET',
        headers: { 'content-type': 'application/json', 'x-cab-continuity':'cab-continuity-v1' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(5000) });
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

    const systemInstructions = providerRequests.map(raw => JSON.parse(raw)).flatMap(body => body.messages || [])
      .filter(message => message.role === 'system').map(message => typeof message.content === 'string' ? message.content : JSON.stringify(message.content)).join('\n');
    assert.match(systemInstructions, /Les autres clients MCP suivent leur propre contrat/);
    console.log('Version API privée :', (await client.info()).version);
    const nativeEdit = nativeTools.find(tool => tool.name === 'edit');
    assert.deepEqual(nativeEdit.parameters.required, ['path', 'oldString', 'newString']);
    assert.equal(nativeEdit.parameters.properties.replaceAll.type, 'boolean');
    console.log('Catalogue natif synthétique :', JSON.stringify({ names: nativeTools.map(tool => tool.name), edit: nativeEdit.parameters,
      shell: nativeTools.find(tool => tool.name === 'shell')?.parameters }));
    // A new mission uses the existing isolated executor without per-operation decisions.
    const autonomousDirectory=join(workspace,'autonomous-source');mkdirSync(autonomousDirectory,{mode:0o2770});
    writeFileSync(join(autonomousDirectory,'value.py'),'VALUE=0\n',{mode:0o770});
    const autonomousSession=await makeSession('autonomous mission with final review');
    let autonomousRun;await until(async()=>{try{autonomousRun=await http('/runs/reserve',{runId:'native-autonomous',ownerId:'fixture-autonomous-owner',sessionId:autonomousSession.id,
      directory:workspace,changeId:'synthetic-autonomous',selectionKey:'synthetic-autonomous',dependsOn:[],
      resources:[{key:'file:autonomous-source',mode:'write'}],exclusiveResources:[]});return true;}catch(error){if(error.message.includes('opencode-restart-reconciliation-required'))return false;throw error;}},'autonomous initial admission');
    await http('/runs/native-autonomous/job/arm',{jobId:'job-autonomous',sessionId:autonomousSession.id,directory:workspace,
      changeId:'synthetic-autonomous',strictCommands:true,criteria:['VALUE=2']});
    await http('/runs/native-autonomous/autonomy/mandate',{protocol:'autonomous-change-v1',mandateId:'native-autonomous-mandate',
      version:autonomousRun.version,sessionId:autonomousSession.id,objective:'Set VALUE=2',criteria:['VALUE=2'],constraints:['Isolated network'],
      decisionsResolved:true,decisions:['Developer and orchestrator selected VALUE=2 before coding'],paths:['autonomous-source']});
    async function autonomousTool(name,args,{expectedError}={}) {
      const toolSession=args.session_id||autonomousSession.id;
      queue.push({tool:'execute',input:{code:'return await search('+JSON.stringify({query:name,namespace:'cgpt-validation',limit:20})+');'}});
      await client.prompt(toolSession,'Discover only the requested autonomous tool.');
      await until(async()=>!(await client.activeSessions())[toolSession]&&queue.length===0,'autonomous tool discovery');
      queue.push({tool:'execute',input:{code:'return await tools["cgpt-validation"].'+name+'('+JSON.stringify(args)+');'}});
      await client.prompt(toolSession,'Execute only the queued action in the initial mandate.');
      await until(async()=>{const p=(await client.messages(toolSession)).flatMap(m=>m.parts||[]).findLast(p=>p.tool==='cgpt-validation_'+name&&p.state.input?.request_id===args.request_id);return p&&['completed','error'].includes(p.state.status)&&!(await client.activeSessions())[toolSession]&&queue.length===0;},'autonomous action',async()=>({
        status:await http('/runs/native-autonomous/status'),last:(await client.messages(toolSession)).slice(-2)}));
      const part=(await client.messages(toolSession)).flatMap(m=>m.parts||[]).findLast(p=>p.tool==='cgpt-validation_'+name&&p.state.input?.request_id===args.request_id);
      assert.ok(part,'native autonomous MCP part missing');
      if(expectedError){assert.equal(part.state.status,'error');assert.ok(String(part.state.error).includes(expectedError),String(part.state.error));return;}
      assert.equal(part.state.status,'completed',JSON.stringify(part.state));
      return JSON.parse(part.state.output);
    }
    const autonomousIdentity={run_id:autonomousRun.runId,reservation_version:autonomousRun.version,session_id:autonomousSession.id,
      change_id:'synthetic-autonomous',directory:workspace};
    let autonomousLast;
    for(let i=0;i<3;i++) {
      const code=`from pathlib import Path\np=Path(${JSON.stringify(autonomousDirectory)})\n(p/'value.py').write_text('VALUE=${i}\\n')\nexec((p/'value.py').read_text());assert VALUE==2\nprint('AUTONOMOUS_NATIVE_OK')`;
      autonomousLast=await autonomousTool('atelier_execute',{...autonomousIdentity,request_id:'autonomous-native-'+i,argv:['/usr/bin/python3','-c',code]});
      assert.equal(autonomousLast.exitCode,i===2?0:1,JSON.stringify(autonomousLast));
    }
    const nativeSubmission=await autonomousTool('autonomy_submit',{...autonomousIdentity,request_id:'autonomous-final',submission:{
      submissionId:'autonomous-native-final',summary:'Two failed trials then correction and passing test',tests:[{
        criterion:'VALUE=2',requestId:'autonomous-native-2',receiptDigest:autonomousLast.receiptDigest,outcome:'passed'}],limits:[]}});
    const beforeReview=await http('/runs/native-autonomous/autonomy');
    assert.equal(beforeReview.autonomy.state,'REVIEW_PENDING');assert.equal(beforeReview.autonomy.metrics.intermediateDecisions,0);
    await http('/runs/native-autonomous/autonomy/review',{reviewId:'autonomous-native-review',submissionDigest:nativeSubmission.digest,
      decision:'accept',reason:'Reviewed real isolated writes, native test output and source revision'});
    const published=await http('/runs/native-autonomous/publish',{transactionId:'autonomous-native-publication',version:autonomousRun.version,
      submissionDigest:nativeSubmission.digest,evidence:['fixture final review and native executor receipts']});
    assert.ok(published.referenceVersion>0);
    assert.equal(readFileSync(join(autonomousDirectory,'value.py'),'utf8'),'VALUE=2\n');
    console.log(JSON.stringify({autonomousNative:true,realOpenCode:true,initialMandates:1,intermediateDecisions:0,
      failedTests:2,passedTests:1,finalSubmissions:1,finalReviews:1,publicationAccepted:true}));


    const coordinationIdentities={};
    for(const name of ['producer','consumer']) {
      const path='coordination-'+name;mkdirSync(join(workspace,path),{mode:0o2770});
      const actor=await makeSession('coder coordination '+name);
      const current=await http('/runs/reserve',{runId:'coord-'+name,ownerId:'owner-'+name,sessionId:actor.id,directory:workspace,
        changeId:'change-'+name,selectionKey:'change-'+name,dependsOn:[],resources:[{key:'file:'+path,mode:'write'}],exclusiveResources:[]});
      await http('/runs/'+current.runId+'/job/arm',{jobId:'job-'+name,sessionId:actor.id,directory:workspace,changeId:current.changeId,strictCommands:true,criteria:['candidate evidence']});
      await http('/runs/'+current.runId+'/autonomy/mandate',{protocol:'autonomous-change-v1',mandateId:'coord-mandate-'+name,
        version:current.version,sessionId:actor.id,objective:'Coordinate assigned change',criteria:['candidate evidence'],constraints:[],decisionsResolved:true,
        decisions:['Developer selected the interface before coding'],paths:[path],coordination:true});
      coordinationIdentities[name]={request_id:'unused',run_id:current.runId,session_id:actor.id,change_id:current.changeId,directory:workspace,reservation_version:current.version};
    }
    const proofText='Native producer candidate proof\n';writeFileSync(join(workspace,'coordination-producer/proof.md'),proofText,{mode:0o770});
    await autonomousTool('session_coordinate',{...coordinationIdentities.consumer,request_id:'coord-native-subscribe',action:'subscribe',args:{dependency_id:'producer-ready',kind:'change',subject:'change-producer',criterion:'candidate-evidence'}});
    await autonomousTool('session_coordinate',{...coordinationIdentities.producer,request_id:'coord-native-publish',action:'publish',args:{notice_id:'native-producer-ready',kind:'change',subject:'change-producer',stage:'tested',proof:'coordination-producer/proof.md',proof_sha256:createHash('sha256').update(proofText).digest('hex')}});
    await until(async()=>!(await client.activeSessions())[coordinationIdentities.consumer.session_id],'consumer native notification handled');
    const deliveredRows=await client.messages(coordinationIdentities.consumer.session_id);
    const delivered=deliveredRows.filter(m=>m.info.role==='user'&&(m.parts||[]).some(p=>p.type==='text'&&p.text.startsWith('CAB_COORDINATION_AVIS native-producer-ready ')));
    assert.equal(delivered.length,1,'one native notification, no orchestrator relay');
    const received=await autonomousTool('session_coordinate',{...coordinationIdentities.consumer,request_id:'coord-native-inbox',action:'inbox',args:{}});
    assert.equal(received.items[0].proof_state,'fresh');assert.equal(received.items[0].actor_session,coordinationIdentities.producer.session_id);
    const ack=await autonomousTool('session_coordinate',{...coordinationIdentities.consumer,request_id:'coord-native-ack',action:'ack',args:{dependency_id:'producer-ready',notice_id:'native-producer-ready'}});
    assert.equal(ack.dependency_verified,false);
    const producerStatus=await http('/runs/coord-producer/status');assert.equal(producerStatus.autonomy.metrics.intermediateDecisions,0);
    const brokerActualUid=Number(readFileSync('/proc/'+Number(readFileSync(brokerPidFile,'utf8'))+'/status','utf8').match(/^Uid:\s+(\d+)/m)[1]);
    assert.equal(brokerActualUid,brokerUid);
    console.log(JSON.stringify({coderCoordinationNative:true,brokerUid:brokerActualUid,controllerUid:process.getuid(),nativeNotifications:delivered.length,
      producerPublished:true,consumerVerifiedAndAcknowledged:true,orchestratorIntermediateDecisions:0}));

    if(process.env.CAB_TEST_EXTERNAL==='1') {
      const area=join(workspace,'external-source');mkdirSync(area,{mode:0o2770});writeFileSync(join(area,'candidate.txt'),'42',{mode:0o770});
      const realSsh=!!process.env.CAB_TEST_EXTERNAL_SSH_PORT,bankKind=realSsh?'docker':'lxc';
      const bankKey=realSsh?'docker:fixture-100':'lxc:fixture/100';
      writeFileSync(join(workspace,'project.env'),"SSH_FIXTURE_HOST='127.0.0.1'\nSSH_FIXTURE_USER='"+(realSsh?'root':'fixture')+"'\nSSH_FIXTURE_PASSWORD='fixture-private-password'\n"+(realSsh?"SSH_FIXTURE_PORT='"+process.env.CAB_TEST_EXTERNAL_SSH_PORT+"'\n":''),{mode:0o660});
      const known=join(root,'known_hosts_fixture'),alg=Buffer.from('ssh-ed25519'),length=Buffer.alloc(4),publicLength=Buffer.alloc(4);length.writeUInt32BE(alg.length);publicLength.writeUInt32BE(32);
      const key=Buffer.concat([length,alg,publicLength,Buffer.alloc(32)]).toString('base64'),knownData=realSsh?readFileSync(process.env.CAB_TEST_EXTERNAL_KNOWN_HOSTS,'utf8'):'127.0.0.1 ssh-ed25519 '+key+'\n';
      if(brokerUid===process.getuid())writeFileSync(known,knownData,{mode:0o600});
      else execFileSync('sudo',['-n','-u','#'+brokerUid,'/usr/bin/python3','-c','from pathlib import Path;import sys;p=Path(sys.argv[1]);p.write_text(sys.argv[2]);p.chmod(0o600)',known,knownData]);
      const session=await makeSession('external execution candidate');
      const r=await http('/runs/reserve',{runId:'external-native',ownerId:'external-owner',sessionId:session.id,directory:workspace,changeId:'external-change',selectionKey:'external-change',dependsOn:[],resources:[{key:'file:external-source',mode:'write'},{key:bankKey,mode:'write'}],exclusiveResources:[]});
      await http('/runs/external-native/job/arm',{jobId:'external-job',sessionId:session.id,directory:workspace,changeId:r.changeId,strictCommands:true,criteria:['external-native-proof']});
      await http('/runs/external-native/test-resources/acquire',{version:r.version,transactionId:'external-native-bank',resources:[{key:bankKey,mode:'write'}],evidence:['synthetic isolated test bank']});
      const identity={run_id:r.runId,session_id:session.id,change_id:r.changeId,reservation_version:r.version,directory:workspace};
      const described=await autonomousTool('external_describe',{...identity,request_id:'external-describe',profile:{id:'bank',kind:'ssh',resource_key:bankKey,host_key:'SSH_FIXTURE_HOST',user_key:'SSH_FIXTURE_USER',password_key:'SSH_FIXTURE_PASSWORD',container:bankKind,known_hosts:known,...(realSsh?{port_key:'SSH_FIXTURE_PORT'}:{})}});
      assert.equal(described.status,'PROFILE_DESCRIBED');assert.ok(!JSON.stringify(described).includes('fixture-private-password'));
      await http('/runs/external-native/autonomy/mandate',{protocol:'autonomous-change-v1',mandateId:'external-mission',version:r.version,sessionId:session.id,objective:'Qualify external receipt integration',criteria:['external-native-proof'],constraints:[],decisionsResolved:true,decisions:['Dedicated bank selected'],paths:['external-source'],externalAdapters:[described.profile]});
      if(process.env.CAB_TEST_PREFLIGHT_FAILURE==='1') {
        const failed={...identity,request_id:'external-native-preflight',adapter_id:'bank',argv:['/usr/bin/true']};
        await autonomousTool('external_execute',failed,{expectedError:'external-state-unsafe'});
        const status=await http('/runs/external-native/external/status');
        assert.equal(status.calls['external-native-preflight'].state,'PREFLIGHT_FAILED');
        assert.equal(status.calls['external-native-preflight'].receiptDigest,null);
        assert.match(status.calls['external-native-preflight'].preflightProofDigest,/^[a-f0-9]{64}$/);
        const failedStatus=await autonomousTool('external_status',{...identity,request_id:'external-native-preflight',adapter_id:'bank'});
        assert.equal(failedStatus.status,'PREFLIGHT_FAILED');assert.equal(failedStatus.coordinationOnly,true);
        assert.equal(failedStatus.proofDigest,status.calls['external-native-preflight'].preflightProofDigest);
        assert.equal(failedStatus.receiptDigest,undefined);
        await autonomousTool('external_execute',failed,{expectedError:'external-request-terminal'});
      }
      const result=await autonomousTool('external_execute',{...identity,request_id:'external-native-test',adapter_id:'bank',argv:['/usr/bin/python3','-B','-c','from pathlib import Path;assert Path("candidate.txt").read_text()=="42";print("EXTERNAL_NATIVE_OK")'],files:[{path:'external-source/candidate.txt',destination:'candidate.txt'}]});
      assert.equal(result.status,'COMPLETED');assert.equal(result.exitCode,0);assert.match(result.output,/EXTERNAL_NATIVE_OK/);
      const replay=await autonomousTool('external_status',{...identity,request_id:'external-native-test',adapter_id:'bank'});assert.equal(replay.receiptDigest,result.receiptDigest);
      const remoteFile=result.workdir+'/candidate.txt';
      await autonomousTool('external_execute',{...identity,request_id:'external-native-cleanup',adapter_id:'bank',phase:'cleanup',argv:['/usr/bin/python3','-c','from pathlib import Path;Path('+JSON.stringify(remoteFile)+').unlink()']});
      await autonomousTool('external_execute',{...identity,request_id:'external-native-verify',adapter_id:'bank',phase:'verify-cleanup',argv:['/usr/bin/python3','-c','from pathlib import Path;assert not Path('+JSON.stringify(remoteFile)+').exists()']});
      const released=await autonomousTool('external_release',{...identity,request_id:'external-native-release',cleanup_request_id:'external-native-cleanup',verification_request_id:'external-native-verify'});assert.equal(released.status,'RELEASED');assert.equal('token' in released,false);
      const submitted=await autonomousTool('autonomy_submit',{...identity,request_id:'external-native-submit',submission:{submissionId:'external-native-result',summary:'External transport fixture passed',tests:[{requestId:'external-native-test',criterion:'external-native-proof',outcome:'passed'}],limits:realSsh?[]:['SSH transport simulated; native broker/controller and remote runner real']}});
      assert.equal(submitted.tests[0].receiptDigest,result.receiptDigest);
      await http('/runs/external-native/autonomy/review',{reviewId:'external-native-review',submissionDigest:submitted.digest,decision:'accept',reason:'Native receipt, source and cleanup verified on controlled transport fixture'});
      await http('/runs/external-native/publish',{transactionId:'external-native-publication',version:r.version,submissionDigest:submitted.digest,evidence:['native external receipt and released fixture bank']});
      console.log(JSON.stringify({externalExecutionNative:true,brokerUid,controllerUid:process.getuid(),transport:realSsh?'real SSH dedicated container':'controlled fixture',runner:'real process',fullReceiptResolved:true,cleanupAndVerification:true,bankReleased:true,finalReviewAndPublication:true,intermediateDecisions:0}));
    }
    if(process.env.CAB_TEST_AUTONOMY_ONLY==='1')return;
    const usageSession = await makeSession('native usage counters only');
    for (let i = 0; i < 2; i++) {
      const expected = dispatched + 1;
      queue.push({ text: 'synthetic measured answer', usage: { prompt_tokens: 12, completion_tokens: 5,
        total_tokens: 17, prompt_tokens_details: { cached_tokens: 4 } } });
      await client.prompt(usageSession.id, 'Native usage fixture, no tool.');
      await until(async () => !(await client.activeSessions())[usageSession.id] && dispatched === expected, 'native measured usage');
    }
    const measuredUsage = (await client.messages(usageSession.id)).filter(message => message.info.role === 'assistant');
    console.log('Usage native par message contrôlé :', JSON.stringify(measuredUsage.map(message => ({ tokens: message.info.tokens, cost: message.info.cost }))));
    assert.equal(measuredUsage.length, 2);
    assert.ok(measuredUsage.every(message => message.info.tokens.output === 5 && message.info.tokens.cache.read === 4));
    const backgroundProbe = await makeSession('native background runtime contract');
    const backgroundEnd = dispatched + 1;
    queue.push({ tool: 'shell', input: { command: '/usr/bin/sleep 0.2', background: true, timeout: 2000 } });
    await client.prompt(backgroundProbe.id, 'Only the queued bounded synthetic sleep.');
    let backgroundPermission;
    await until(async () => {
      const pending = await client.request('/api/permission/request');
      backgroundPermission = pending.data.find(permission => permission.sessionID === backgroundProbe.id);
      return Boolean(backgroundPermission);
    }, 'native background ask');
    await client.replyPermission(backgroundProbe.id, backgroundPermission.id, 'once');
    await until(async () => !(await client.activeSessions())[backgroundProbe.id] && dispatched === backgroundEnd, 'native background return');
    const backgroundPart = (await client.messages(backgroundProbe.id)).flatMap(message => message.parts)
      .findLast(part => part.nativeTool === 'shell');
    console.log('Contrat background natif :', JSON.stringify({ metadata: backgroundPart.state.metadata, status: backgroundPart.state.status }));
    const nativeShellId = backgroundPart.state.metadata.shellID;
    assert.match(nativeShellId, /^sh_/);
    const nativeShell = await client.request('/api/shell/' + encodeURIComponent(nativeShellId));
    console.log('Shell.Info natif contrôlé :', JSON.stringify({ location: nativeShell.location, info: nativeShell.data }));
    assert.equal(nativeShell.data.id, nativeShellId); assert.equal(nativeShell.data.command, '/usr/bin/sleep 0.2');
    await until(async () => (await client.request('/api/shell/' + encodeURIComponent(nativeShellId))).data.status !== 'running', 'bounded native background exit');
    const reviewed = await client.createSession({title:'lecture deny puis prévol contrôlé',model:{providerID:'fixture',modelID:'fixture'},permissions:['shell','edit','subagent','skill'].map(permission=>({permission,pattern:'*',action:'deny'}))});
    const policyBefore=await client.nativePermissionPolicy(reviewed.id,{requiredNativeAsk:['shell']});assert.equal(policyBefore.ready,false);assert.equal(policyBefore.effective.shell.action,'deny');
    const providerBefore=providerRequests.length,messagesBefore=(await client.messages(reviewed.id)).length;
    await assert.rejects(client.prompt(reviewed.id,'Prévol bloqué avant demande MCP',{requiredNativeAsk:['shell']}),{code:'opencode-native-permission-ask-required'});
    assert.equal(providerRequests.length,providerBefore);assert.equal((await client.messages(reviewed.id)).length,messagesBefore);assert.equal((await client.permissions()).filter(p=>p.sessionID===reviewed.id).length,0);
    // Transition explicite du propriétaire de la fixture : seul shell est rétabli en ask.
    await client.request('/api/session/'+reviewed.id,{method:'PATCH',body:{permissions:['shell','edit','subagent','skill'].map(action=>({action,resource:'*',effect:action==='shell'?'ask':'deny'}))}});
    const afterRules=(await client.session(reviewed.id)).permission;assert.equal(afterRules.find(r=>r.permission==='edit').action,'deny');assert.equal(afterRules.find(r=>r.permission==='subagent').action,'deny');
    assert.equal((await client.nativePermissionPolicy(reviewed.id,{requiredNativeAsk:['shell']})).ready,true);
    await client.prompt(reviewed.id,'Texte de contrôle après transition explicite, sans outil.',{requiredNativeAsk:['shell']});
    await until(async()=>!(await client.activeSessions())[reviewed.id],'guarded prompt completion');
    assert.equal((await client.messages(reviewed.id)).flatMap(m=>m.parts).filter(p=>p.type==='tool').length,0);assert.deepEqual((await client.session(reviewed.id)).permission,afterRules);
    console.log(JSON.stringify({nativeAskPreflight:true,denyBeforePrompt:true,noMcpRequestUnderDeny:true,explicitShellOnlyAsk:true,editStillDeny:true,noAutomaticRuleWrite:true}));
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
    const discoveryMessages=await client.messages(warmup.id),discoveryUser=discoveryMessages.findLast(m=>m.info.role==='user');
    assert.equal(diagnoseCodingTurn(discoveryMessages,{sessionId:warmup.id,promptId:discoveryUser.info.id}).discoveryOnly,true);
    const failureSession=await makeSession('diagnostic erreur fournisseur privé'),failureEnd=dispatched+1;
    queue.push({providerError:true});const failurePrompt=await client.prompt(failureSession.id,nativeCodingMandate('Diagnostic synthétique sans outil.'));
    await until(async()=>!(await client.activeSessions())[failureSession.id]&&dispatched===failureEnd,'provider failure diagnostic');
    const failureMessages=await client.messages(failureSession.id),failureUser=failureMessages.findLast(m=>m.info.role==='user');
    const failureDiagnostic=diagnoseCodingTurn(failureMessages,{sessionId:failureSession.id,promptId:failureUser.info.id});
    assert.equal(failureDiagnostic.available,true);assert.equal(failureDiagnostic.nativeTurnFailed,true);assert.equal(failureDiagnostic.requiresReconciliation,true);assert.equal(failureDiagnostic.effectStatus,'unverified');assert.equal(failureDiagnostic.nativeWriteCount,0);
    assert.equal((await client.permissions()).filter(p=>p.sessionID===failureSession.id).length,0);
    assert.equal(providerRequests.filter(raw=>raw.includes('Diagnostic synthétique sans outil.')).length,1,'aucun retry natif de cette erreur400');
    assert.ok(failurePrompt.id);console.log(JSON.stringify({nativeCodingDiagnostic:true,providerErrorObserved:true,noDiagnosticRetry:true,noPermission:true,discoveryNotAbsence:true}));
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
      resources: [{ key: resource, mode: 'read' }, { key: 'file:fixture.txt', mode: 'write' }, {key:'port:fixture/5173',mode:'write'}] });
    await http('/runs/native-code/job/arm', { jobId: 'job-code', sessionId: old.id, directory: workspace,
      changeId: 'synthetic-code', strictCommands: true, criteria: ['native once proof'] });
    const recovery = { jobId: 'job-code', expectedSessionId: old.id, sessionId: candidate.id,
      recoveryId: 'rec-code', preflightRequestId: 'preflight-code' };
    const requestSchemaQuery = { query: 'request_validation', namespace: 'cgpt-validation', limit: 20 };
    const expectedDiscoveryDispatched = dispatched + 1;
    queue.push({ tool: 'execute', input: { code: 'return await search(' + JSON.stringify(requestSchemaQuery) + ');' } });
    await client.prompt(candidate.id, 'Inspect only the native request_validation signature before recovery.');
    await until(async () => !(await client.activeSessions())[candidate.id] && dispatched === expectedDiscoveryDispatched,
      'request_validation signature discovery');
    const signatureDiscovery = (await client.messages(candidate.id)).flatMap(message => message.parts)
      .findLast(part => part.tool === 'cab_codemode_discovery');
    assert.deepEqual(signatureDiscovery.state.input, requestSchemaQuery);
    assert.equal(signatureDiscovery.state.metadata.toolCalls.length, 1);
    assert.equal(signatureDiscovery.state.metadata.toolCalls[0].tool, 'search');
    assert.equal(signatureDiscovery.state.metadata.truncated, false);
    await http('/runs/native-code/job/recover', { ...recovery, phase: 'prepare' });
    const approval = { run_id: run.runId, reservation_version: run.version, coordination_protocol: 'resource-scoped-v1',
      requestId: recovery.preflightRequestId, approval_id: 'approval-code', operation_id: 'operation-code',
      operation_digest: createHash('sha256').update('/usr/bin/true').digest('hex'), resources: [{ key: resource, mode: 'read' }],
      expected_revisions: { [resource]: 0 }, session_id: candidate.id, directory: workspace, change_id: 'synthetic-code',
      files: [], commands: ['/usr/bin/true'], title: 'synthetic native proof', summary: 'local fixture', timeout_seconds: 30, interval_seconds: 1 };
    const mcp = (name, input) => ({ tool: 'execute', input: { code: `return await tools["cgpt-validation"].${name}(${JSON.stringify(input)});` } });
    const expectedPreflightDispatched = dispatched + 4;
    queue.push(mcp('broker_readiness', { run_id: run.runId }), mcp('request_validation', approval),
      { tool: 'shell', input: { command: '/usr/bin/true' } }, mcp('broker_readiness', { run_id: run.runId }));
    await client.prompt(candidate.id, 'Execute only the queued synthetic preflight.', {requiredNativeAsk:['shell']});
    await until(async () => (await http('/runs/native-code/status')).undecidedValidationCount === 1, 'native admission', async () => ({
      dispatched, remaining: queue.length, permissions: await client.permissions(), messages: (await client.messages(candidate.id)).slice(-3),
      controller: controlLog.slice(-1000).replaceAll(password, '[synthetic]'), native: nativeLog.slice(-1000).replaceAll(password, '[synthetic]') }));
    await http('/runs/native-code/decision/' + approval.requestId, { decision: 'approved', rationale: 'synthetic orchestrator decision' });
    const access = await http('/runs/native-code/locks/acquire', { version: run.version, operationId: approval.operation_id,
      operationDigest: approval.operation_digest, resources: approval.resources, expectedRevisions: approval.expected_revisions });
    assert.equal(access.state, 'HELD');
    await until(async () => !(await client.activeSessions())[candidate.id] && dispatched === expectedPreflightDispatched, 'native completion');
    const parts = (await client.messages(candidate.id)).flatMap(message => message.parts.filter(part => part.type === 'tool'));
    assert.deepEqual(parts.map(part => part.tool), ['cab_codemode_discovery', 'cgpt-validation_broker_readiness', 'cgpt-validation_request_validation', 'bash', 'cgpt-validation_broker_readiness'], JSON.stringify(parts[1]));
    assert.equal(parts[0].state.input.query, 'request_validation');
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
    const failedStatus = await http('/runs/native-code/status');
    const failedRegistry = await http('/runs');
    assert.equal(failedStatus.runId, run.runId);
    const failedRun = failedRegistry.runs.find(entry => entry.runId === run.runId);
    const failedApproval = { ...approval, reservation_version: failedRun.version, requestId: 'ssh-failure-native',
      approval_id: 'approval-ssh-failure', operation_id: 'operation-ssh-failure',
      operation_digest: createHash('sha256').update('/usr/bin/false').digest('hex'),
      expected_revisions: { [resource]: failedRegistry.coordination.revisions[resource] ?? 0 }, commands: ['/usr/bin/false'],
      title: 'synthetic non-zero SSH wrapper' };
    const failedEnd = dispatched + 3;
    queue.push(mcp('request_validation', failedApproval), { tool: 'shell', input: { command: '/usr/bin/false' } },
      mcp('broker_readiness', { run_id: run.runId }));
    await client.prompt(candidate.id, 'Execute synthetic failing wrapper and read readiness.', { requiredNativeAsk: ['shell'] });
    await until(async () => (await http('/runs/native-code/status')).undecidedValidationCount === 1, 'non-zero shell admission', async () => ({
      status: await http('/runs/native-code/status'), dispatched, queuedActions: queue.length,
      recentTools: (await client.messages(candidate.id)).flatMap(message => message.parts.filter(part => part.type === 'tool'))
        .slice(-5).map(part => ({ tool: part.tool, status: part.state?.status,
          error: part.state?.metadata?.error === true, exit: part.state?.metadata?.exit,
          result: (part.state?.content?.[0]?.text || part.state?.output || '').slice(0, 240) })),
      permissionCount: (await client.permissions()).length }));
    await http('/runs/native-code/decision/' + failedApproval.requestId, { decision: 'approved', rationale: 'synthetic wrapper failure only' });
    const failedAccess = await http('/runs/native-code/locks/acquire', { version: failedRun.version,
      operationId: failedApproval.operation_id, operationDigest: failedApproval.operation_digest,
      resources: failedApproval.resources, expectedRevisions: failedApproval.expected_revisions });
    await until(async () => !(await client.activeSessions())[candidate.id] && dispatched === failedEnd, 'non-zero shell completion');
    await until(async () => (await http('/runs')).coordination.operations[failedApproval.operation_id]?.state === 'COMPLETED',
      'non-zero shell transcript reconciliation');
    const failedOperation = (await http('/runs')).coordination.operations[failedApproval.operation_id];
    const failedPart = (await client.messages(candidate.id)).flatMap(m => m.parts.filter(part => part.tool === 'bash')).at(-1);
    assert.equal(failedOperation.state, 'COMPLETED');
    assert.match(failedOperation.completionDigest, /^[a-f0-9]{64}$/);
    assert.equal(failedPart.state.status, 'completed');
    assert.equal(failedPart.state.metadata.exit, 1);
    await http('/runs/native-code/locks/release', { version: failedRun.version, operationId: failedApproval.operation_id,
      token: failedAccess.token, fencing: failedAccess.fencing, outcome: 'COMPLETED', evidence: ['synthetic wrapper completed with exit 1; no success inferred'] });
    console.log('Shell natif exit 1 : operation corrélée COMPLETED, échec métier conservé.');
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
    queue.push({tool:'execute',input:{code:'const schema = await search({query:"request_validation",namespace:"cgpt-validation",limit:20}); if (schema.items[0].path !== \'tools["cgpt-validation"].request_validation\') throw new Error(\'Unexpected method\'); '+mcp('request_validation',partial).input.code}}, { tool: 'edit', input: { path: target,
      oldString: 'file', newString: 'changed' } });
    await client.prompt(candidate.id, 'Exécuter uniquement le remplacement synthétique exact.');
    await until(async () => (await http('/runs/native-code/status')).undecidedValidationCount === 1, 'partial admission', async () => ({ status: await http('/runs/native-code/status'), parts: (await client.messages(candidate.id)).slice(-3), controlLog: controlLog.slice(-1500) }));
    const projectedAwaited=(await client.messages(candidate.id)).flatMap(m=>m.parts).find(p=>p.tool==='cgpt-validation_request_validation'&&p.state?.input?.requestId===partial.requestId);
    assert.ok(projectedAwaited?.state.metadata?.cabCodeMode,'awaited search is projected before the blocking request returns');
    assert.equal(projectedAwaited.state.status,'running');
    console.log(JSON.stringify({awaitedSearchEarlyAdmission:true,literalPathAssertion:true,noTimeoutOrManualPoll:true,exactRequestPreserved:true}));
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
    const retrySignatureEnd = dispatched + 1;
    queue.push({ tool: 'execute', input: { code: 'return await search(' + JSON.stringify(requestSchemaQuery) + ');' } });
    await client.prompt(retryCandidate.id, 'Inspecter la signature native avant de préparer la reprise.');
    await until(async () => !(await client.activeSessions())[retryCandidate.id] && dispatched === retrySignatureEnd,
      'retry candidate signature discovery');
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
    const lookupEnd=dispatched+1;
    const lookupIdentity=Object.fromEntries(['requestId','run_id','session_id','operation_id','operation_digest'].map(key=>[key,approval[key]]));
    queue.push(mcp('lookup_validation',lookupIdentity));
    await client.prompt(retryCandidate.id,'Read only the existing synthetic receipt by its exact identity.');
    await until(async()=>!(await client.activeSessions())[retryCandidate.id]&&dispatched===lookupEnd,'native durable lookup');
    const lookupPart=(await client.messages(retryCandidate.id)).flatMap(m=>m.parts).findLast(p=>p.tool==='cgpt-validation_lookup_validation');
    assert.ok(lookupPart);const lookedUp=JSON.parse(lookupPart.state.output);
    assert.equal(lookedUp.found,true);assert.equal(lookedUp.approval_id,approval.approval_id);assert.equal(lookedUp.snapshot_only,true);
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

    // Le corps long est transmis au contrôleur, jamais recopié dans les appels du modèle.
    const padding='CAB_PAYLOAD_PRIVATE_'+ 'x'.repeat(9600);
    const longPayload='# '+padding+'\n/usr/bin/python3 -I -S - <<\'PY\'\nimport json,pathlib\nx={"inventory":[{"symbol":"é","braces":"{}[]"}]}\nassert x["inventory"][0]["braces"]=="{}[]"\npathlib.Path("fixture.txt").write_text("duplicate duplicate")\nprint("CAB_LONG_EXACT_OK")\nPY\n';
    assert.ok(longPayload.length>9300);
    for(const corrupt of [false,true]){
      current=(await http('/runs')).runs.find(r=>r.runId===run.runId);
      const suffix=corrupt?'corrupt-fixture':'exact-fixture';
      const stageInput={stageId:'stage-'+suffix,jobId:'job-code',sessionId:retryCandidate.id,reservationVersion:current.version,requestId:'request-'+suffix,
        approvalId:'approval-'+suffix,operationId:'operation-'+suffix,payload:longPayload,payloadSha256:createHash('sha256').update(longPayload).digest('hex')};
      const stage=await http('/runs/native-code/shell-stage',stageInput);assert.equal(stage.payload,undefined);assert.ok(stage.command.length<1200);
      const locked=await fetch(control+'/runs/native-code/shell-stage/'+stageInput.stageId+'/payload');assert.equal(locked.status,409);
      const carrierApproval={...approval,reservation_version:current.version,session_id:retryCandidate.id,requestId:stageInput.requestId,approval_id:stageInput.approvalId,
        operation_id:stageInput.operationId,operation_digest:createHash('sha256').update(stage.command).digest('hex'),commands:[stage.command],files:[],
        resources:[{key:'file:fixture.txt',mode:'write'}],expected_revisions:{'file:fixture.txt':(await http('/runs')).coordination.revisions['file:fixture.txt']||0},title:'payload Bash exact revu'};
      const end=dispatched+2;queue.push(mcp('request_validation',carrierApproval),{tool:'shell',input:{command:stage.command}});
      await client.prompt(retryCandidate.id,'Exécuter uniquement le transport court en file, sans recopier le payload.');
      await until(async()=>(await http('/runs/native-code/status')).undecidedValidationCount===1,'carrier admission');
      assert.equal(readFileSync(target,'utf8'),'duplicate duplicate');
      await http('/runs/native-code/decision/'+carrierApproval.requestId,{decision:'approved'});
      assert.equal((await fetch(control+'/runs/native-code/shell-stage/'+stageInput.stageId+'/payload')).status,409);
      assert.notEqual((await http('/runs')).coordination.operations[carrierApproval.operation_id].native?.onceAcknowledged,true);
      const access=await http('/runs/native-code/locks/acquire',{version:current.version,operationId:carrierApproval.operation_id,operationDigest:carrierApproval.operation_digest,
        resources:carrierApproval.resources,expectedRevisions:carrierApproval.expected_revisions});
      await until(async()=>!(await client.activeSessions())[retryCandidate.id]&&dispatched===end,'carrier native completion');
      const shell=(await client.messages(retryCandidate.id)).flatMap(m=>m.parts).findLast(p=>p.tool==='bash');
      assert.equal(shell.state.input.command,stage.command);assert.equal(shell.state.metadata.exit,corrupt?125:0);
      assert.ok(shell.state.output.includes(corrupt?'CAB_SHELL_PAYLOAD_REFUSED':'CAB_LONG_EXACT_OK'));if(corrupt){assert.equal(shell.state.output.includes('CAB_LONG_EXACT_OK'),false);assert.equal(shell.state.output.includes('CAB_LONG_WRONG_OK'),false);}
      assert.equal(readFileSync(target,'utf8'),'duplicate duplicate');
      assert.equal(providerRequests.some(raw=>raw.includes(padding)),false);
      if(!corrupt){
        await until(async()=>(await http('/runs')).coordination.operations[carrierApproval.operation_id].state==='COMPLETED','native delegated release boundary');
        await http('/runs/native-code/recovery/policy',{policyId:'native-owner-release-policy',ownerId:run.ownerId,version:current.version,
          actions:['release-access'],resources:carrierApproval.resources,authorization:'same native fixture mandate; owner reviewed terminal effect'});
        const plan=await http('/runs/native-code/recovery');
        const result=await http('/runs/native-code/recovery/action',{actionId:'native-owner-release-action',ownerId:run.ownerId,
          policyId:'native-owner-release-policy',boundaryDigest:plan.boundaryDigest,action:'release-access',targetId:access.accessId,
          input:{outcome:'COMPLETED',evidence:['native carrier result reviewed without owner token transport']}});
        assert.equal(result.state,'RELEASED');assert.equal(result.token,undefined);assert.equal(JSON.stringify(result).includes(access.token),false);
      }else await http('/runs/native-code/locks/release',{version:current.version,operationId:carrierApproval.operation_id,token:access.token,fencing:access.fencing,outcome:'COMPLETED',evidence:['native carrier result reviewed']});
      assert.equal((await http('/runs')).coordination.operations[carrierApproval.operation_id].native.onceAcknowledged,true);
      assert.equal((await fetch(control+'/runs/native-code/shell-stage/'+stageInput.stageId+'/payload')).status,409);
    }
    console.log(JSON.stringify({exactShellCarrier:true,payloadBytes:Buffer.byteLength(longPayload),modelRecopiedPayload:false,exactNativeOnce:true,alteredBodyRefusedBeforePayload:true,sameLengthCorruption:true}));

    const peerSession=await makeSession('native handoff peer');
    const peerRun=await http('/runs/reserve',{runId:'native-peer',ownerId:'synthetic-peer-owner',sessionId:peerSession.id,
      directory:workspace,changeId:'synthetic-peer',selectionKey:'synthetic-peer',dependsOn:[],
      resources:[{key:'browser:fixture/peer',mode:'write'}]});
    await http('/runs/native-peer/job/arm',{jobId:'job-peer',sessionId:peerSession.id,directory:workspace,
      changeId:'synthetic-peer',strictCommands:true,criteria:['held lease survives cutover']});
    await http('/runs/native-peer/test-resources/acquire',{version:peerRun.version,transactionId:'peer-lease',
      resources:[{key:'browser:fixture/peer',mode:'write'}],evidence:['isolated fixture reservation; no browser effect']});
    const peerBefore=(await http('/runs/native-peer/test-resources')).reservations;
    const singletonSession=await makeSession('dedicated edit withdrawal'),singletonPath=join(workspace,'singleton-withdraw.txt');
    writeFileSync(singletonPath,'old');
    const singletonRun=await http('/runs/reserve',{runId:'native-singleton',ownerId:'native-singleton-owner',sessionId:singletonSession.id,
      directory:workspace,changeId:'synthetic-singleton',selectionKey:'synthetic-singleton',dependsOn:[],resources:[{key:'file:singleton-withdraw.txt',mode:'write'}]});
    await http('/runs/native-singleton/job/arm',{jobId:'job-singleton',sessionId:singletonSession.id,directory:workspace,
      changeId:'synthetic-singleton',strictCommands:true,criteria:['reject divergent edit then withdraw only dedicated member']});

    // Une réponse à compteurs connus est collectée par SGS avant le handoff.
    const measuredEnd=dispatched+1;
    queue.push({text:'synthetic handoff usage',usage:{prompt_tokens:12,completion_tokens:5,total_tokens:17,prompt_tokens_details:{cached_tokens:4}}});
    await client.prompt(retryCandidate.id,'Réponse synthétique mesurée avant handoff, sans outil.');
    await until(async()=>!(await client.activeSessions())[retryCandidate.id]&&dispatched===measuredEnd,'controlled native usage');
    const measuredNative=(await client.messages(retryCandidate.id)).filter(m=>m.info.role==='assistant'&&m.info.tokens?.output===5);
    assert.ok(measuredNative.length>0);assert.equal(measuredNative.at(-1).info.tokens.cache.read,4);
    const sgsSnapshot=async()=>(await sgsCall('/stats?project='+encodeURIComponent(workspace))).sessions.find(s=>s.run==='native-code'&&s.session===retryCandidate.id);
    await until(async()=>{const s=await sgsSnapshot();return s?.collector?.status==='collecting'&&Number(s.metrics.tokens_output)>=5;},'SGS native usage before handoff',async()=>await sgsSnapshot());
    const usageBefore=await sgsSnapshot();
    assert.equal(usageBefore.collector.source,'opencode-native');assert.equal(usageBefore.coverage.tokens_output,'native');
    assert.ok(Number(usageBefore.metrics.tokens_cache_read)>=4);

    // Background sous CAB : le start retourne, le port reste EXECUTING jusqu'à Shell.Info terminal.
    current=(await http('/runs')).runs.find(r=>r.runId===run.runId);
    const backgroundInput={command:'/usr/bin/sleep 2',background:true,timeout:5000};
    const backgroundApproval={...approval,reservation_version:current.version,session_id:retryCandidate.id,
      requestId:'background-approved',approval_id:'approval-background',operation_id:'operation-background',
      operation_digest:createHash('sha256').update(backgroundInput.command).digest('hex'),commands:[backgroundInput.command],
      shell_background:true,tool_input_sha256:nativeToolInputDigest(backgroundInput),
      resources:[{key:'port:fixture/5173',mode:'write'}],expected_revisions:{'port:fixture/5173':0}};
    const backgroundCabEnd=dispatched+2;
    queue.push(mcp('request_validation',backgroundApproval),{tool:'shell',input:backgroundInput});
    await client.prompt(retryCandidate.id,'Only the queued explicitly approved bounded background shell.');
    await until(async()=>(await http('/runs/native-code/status')).undecidedValidationCount===1,'background admission');
    await http('/runs/native-code/decision/'+backgroundApproval.requestId,{decision:'approved'});
    const backgroundAccess=await http('/runs/native-code/locks/acquire',{version:current.version,
      operationId:backgroundApproval.operation_id,operationDigest:backgroundApproval.operation_digest,
      resources:backgroundApproval.resources,expectedRevisions:backgroundApproval.expected_revisions});
    await until(async()=>!(await client.activeSessions())[retryCandidate.id]&&dispatched===backgroundCabEnd,'background start returned');
    const runningBackground=(await http('/runs')).coordination.operations[backgroundApproval.operation_id];
    assert.equal(runningBackground.state,'EXECUTING');assert.equal(runningBackground.native.onceAcknowledged,true);
    const handoffNativePid=(await client.info(true)).pid,handoffBrokerPid=readFileSync(brokerPidFile,'utf8');
    const beforeHandoffReadiness=(await http('/status')).brokerReadiness;
    await http('/transport/prepare',{transactionId:'native-background-handoff'});
    const handoffStartedAt=performance.now();
    const controllerStopped=once(controller,'exit');controller.kill('SIGTERM');await controllerStopped;
    assert.equal(controller.exitCode,0,'old controller sealed its exact state');
    startController();
    await until(async()=>{if(controller.exitCode!==null)throw new Error(controlLog.slice(-1000));
      try{return (await http('/transport/status')).adopted===true;}catch{return false;}},'native compatible handoff');
    const handoffUpperBoundMs=Math.ceil(performance.now()-handoffStartedAt);
    const adopted=await http('/transport/status');assert.equal(adopted.receipt.transactionId,'native-background-handoff');
    const afterHandoffReadiness=(await http('/runs/native-code/status')).brokerReadiness;
    assert.equal(afterHandoffReadiness.restored_from,'certified-handoff');
    assert.equal(afterHandoffReadiness.checked_at,beforeHandoffReadiness.checked_at,'no fabricated fresh timestamp');
    assert.deepEqual((await http('/runs/native-peer/test-resources')).reservations,peerBefore,'disjoint peer lease unchanged');
    const resumed=(await http('/runs')).coordination.operations[backgroundApproval.operation_id];
    assert.equal(resumed.native.onceAcknowledged,true);assert.equal(resumed.native.callId,runningBackground.native.callId);
    assert.equal((await client.info(true)).pid,handoffNativePid);assert.equal(readFileSync(brokerPidFile,'utf8'),handoffBrokerPid);
    assert.equal(dispatched,backgroundCabEnd,'no new model tool or native command during handoff');
    await until(async()=>(await http('/runs')).coordination.operations[backgroundApproval.operation_id].state==='COMPLETED','background terminal native event');
    const finishedBackground=(await http('/runs')).coordination.operations[backgroundApproval.operation_id];
    assert.equal(finishedBackground.nativeResult.exit,0);
    await http('/runs/native-code/locks/release',{version:current.version,operationId:backgroundApproval.operation_id,
      token:backgroundAccess.token,fencing:backgroundAccess.fencing,outcome:'COMPLETED',evidence:['native Shell.Info exact, explicit effects review']});
    console.log(JSON.stringify({backgroundCab:true,startNotCompletion:true,onceAcknowledged:true,terminalNativeShell:true,explicitRelease:true,realCompatibleHandoff:true,nativeAndBrokerPidPreserved:true,peerLeasePreserved:true,handoffUpperBoundMs,measurement:'kill-to-observed-adoption-upper-bound'}));

    await until(async()=>{const s=await sgsSnapshot();return s?.collector?.status==='collecting'&&Number(s.metrics.tokens_output)>=Number(usageBefore.metrics.tokens_output);},'SGS native usage after handoff',async()=>await sgsSnapshot());
    const usageAfter=await sgsSnapshot();
    assert.equal(usageAfter.binding,usageBefore.binding);assert.equal(usageAfter.instance,usageBefore.instance);
    assert.equal(usageAfter.collector.source,'opencode-native');assert.equal(usageAfter.coverage.tokens_output,'native');
    assert.ok(Number(usageAfter.metrics.tokens_cache_read)>=Number(usageBefore.metrics.tokens_cache_read));
    await until(async()=>!(await client.activeSessions())[retryCandidate.id],'native usage settled');
    const finalNative=await client.messages(retryCandidate.id);
    const expectedOutput=finalNative.reduce((sum,m)=>sum+(m.info.role==='assistant'&&Number.isSafeInteger(m.info.tokens?.output)?m.info.tokens.output:0),0);
    const expectedCache=finalNative.reduce((sum,m)=>sum+(m.info.role==='assistant'&&Number.isSafeInteger(m.info.tokens?.cache?.read)?m.info.tokens.cache.read:0),0);
    await until(async()=>{const s=await sgsSnapshot();return Number(s?.metrics.tokens_output)===expectedOutput&&Number(s?.metrics.tokens_cache_read)===expectedCache;},
      'SGS exact native totals',async()=>({expectedOutput,expectedCache,sgs:await sgsSnapshot()}));
    const settled=await sgsSnapshot();assert.equal(Number(settled.metrics.cost_usd),0);assert.equal(settled.coverage.cost_usd,'native');
    const unavailable=Object.keys(settled.coverage).find(key=>settled.coverage[key]==='unavailable'&&!(key in settled.metrics));assert.ok(unavailable);
    await delay(31000); // Dépasse l'intervalle de relecture du collecteur, sans nouveau message.
    const reread=await sgsSnapshot();
    assert.equal(Number(reread.metrics.tokens_output),expectedOutput);assert.equal(Number(reread.metrics.tokens_cache_read),expectedCache);
    assert.equal(Number(reread.metrics.cost_usd),0);assert.equal(reread.coverage[unavailable],'unavailable');
    console.log(JSON.stringify({nativeSgsHandoff:true,binding:usageAfter.binding,before:usageBefore.metrics.tokens_output,after:usageAfter.metrics.tokens_output,collector:usageAfter.collector.status}));

    // Même cible et APPROVED, mais arguments divergents : aucune once ni écriture.
    current=(await http('/runs')).runs.find(r=>r.runId===run.runId);
    const mismatch={...partial,reservation_version:current.version,session_id:retryCandidate.id,requestId:'input-mismatch',approval_id:'approval-input-mismatch',operation_id:'operation-input-mismatch',
      operation_digest:createHash('sha256').update('mismatch').digest('hex'),expected_revisions:{'file:fixture.txt':(await http('/runs')).coordination.revisions['file:fixture.txt']},
      tool_input_sha256:nativeToolInputDigest({path:target,content:'approved replacement'})};
    const mismatchEnd=dispatched+2;
    queue.push(mcp('request_validation',mismatch),{tool:'write',input:{path:target,content:'UNAPPROVED replacement'}});
    await client.prompt(retryCandidate.id,nativeCodingMandate('Execute only the queued synthetic mismatch.'));
    await until(async()=>(await http('/runs/native-code/status')).undecidedValidationCount===1,'mismatch admission',async()=>({status:await http('/runs/native-code/status'),log:controlLog.slice(-1500).replaceAll(password,'[synthetic]'),
      recent:(await client.messages(retryCandidate.id)).flatMap(m=>m.parts).filter(p=>p.type==='tool').slice(-2).map(p=>({tool:p.tool,status:p.state.status,error:p.state.error,output:p.state.output?.slice(0,300)}))}));
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
    const mismatchMessages=await client.messages(retryCandidate.id),mismatchUser=mismatchMessages.findLast(m=>m.info.role==='user');
    const mismatchDiagnostic=diagnoseCodingTurn(mismatchMessages,{sessionId:retryCandidate.id,promptId:mismatchUser.info.id,toolInputSha256:mismatch.tool_input_sha256});
    assert.equal(mismatchDiagnostic.available,true);assert.equal(mismatchDiagnostic.inputMismatchCount,1);assert.equal(mismatchDiagnostic.requiresReconciliation,true);assert.equal(mismatchDiagnostic.effectStatus,'unverified');
    console.log(JSON.stringify({nativeInputGuard:true,exactWrite:true,exactEdit:true,mismatchBeforeOnce:true,filePreserved:true}));

    const splitSession=await makeSession('multipart rejection only'),splitTarget=join(workspace,'split-must-not-exist');
    queue.push({tool:'shell',input:{command:'/usr/bin/touch '+splitTarget+' && /usr/bin/printf CAB_SPLIT_NOT_EXECUTED && /usr/bin/test -f '+splitTarget,workdir:workspace}});
    await client.prompt(splitSession.id,'Execute the queued synthetic shell only.');
    let split;
    await until(async()=>{const data=await client.request('/api/permission/request',{query:{directory:workspace}});split=data.data.find(p=>p.sessionID===splitSession.id);return Boolean(split);},'multipart native permission');
    assert.equal(split.resources.length,3);assert.equal(existsSync(splitTarget),false);
    const splitVerified=await client.permissions(workspace,{sessionIds:[splitSession.id],verifyInputs:true});
    assert.equal(splitVerified.length,1);assert.equal(splitVerified[0].metadata.nativeShellResourceCount,3);
    assert.equal(splitVerified[0].metadata.command,'/usr/bin/touch '+splitTarget+' && /usr/bin/printf CAB_SPLIT_NOT_EXECUTED && /usr/bin/test -f '+splitTarget);
    await client.replyPermission(splitSession.id,split.id,'reject');
    await until(async()=>!(await client.activeSessions())[splitSession.id],'multipart rejection terminal');
    assert.equal(existsSync(splitTarget),false);
    assert.equal(client.permissionReplies(splitSession.id).receipts.find(r=>r.permissionId===split.id).state,'ACKNOWLEDGED');
    console.log(JSON.stringify({multipartShellRejection:true,resources:split.resources.length,noEffect:true,privateAck:true,noOnce:true}));

    // Same-RUN pilot handoff with a real V2 candidate. Historical approved mismatch/access stays protected.
    await http('/runs/native-code/job/progress',{jobId:'job-code',currentCabMandate:'',lastProvenMilestone:'native handoff checkpoint'});
    const pilotCandidate=await makeSession('same RUN handoff candidate'),pilotEnd=dispatched+1;
    queue.push(mcp('broker_readiness',{run_id:run.runId}));
    await client.prompt(pilotCandidate.id,'Only read the CAB readiness for this RUN.');
    await until(async()=>!(await client.activeSessions())[pilotCandidate.id]&&dispatched===pilotEnd,'pilot candidate readiness');
    const handoffBefore=await http('/runs'), historicalOperation=handoffBefore.coordination.operations[mismatch.operation_id];
    let pilotPreview;
    await until(async()=>{try{pilotPreview=await http('/runs/native-code/session-handoff?sessionId='+pilotCandidate.id);return true;}catch{return false;}},
      'pilot handoff preview',async()=>({status:await http('/runs/native-code/status'),controller:controlLog.slice(-1000)}));
    const pilotPayload={handoffId:'native-pilot-handoff',ownerId:run.ownerId,version:pilotPreview.version,jobId:'job-code',
      expectedSessionId:retryCandidate.id,sessionId:pilotCandidate.id,checkpointDigest:pilotPreview.checkpointDigest,
      boundaryDigest:pilotPreview.boundaryDigest,reason:'Synthetic same RUN continuation',evidence:['real V2 native readiness and retained historical access']};
    const pilotReceipt=await http('/runs/native-code/session-handoff',pilotPayload);assert.equal(pilotReceipt.state,'DONE');
    assert.deepEqual(await http('/runs/native-code/session-handoff',pilotPayload),pilotReceipt);
    const handoffAfter=await http('/runs'),pilotJob=await http('/runs/native-code/job');
    assert.equal(pilotJob.sessionId,pilotCandidate.id);assert.equal(pilotJob.lastProvenMilestone,'native handoff checkpoint');
    assert.ok(pilotJob.revokedSessions.includes(retryCandidate.id));
    assert.deepEqual(handoffAfter.coordination.operations[mismatch.operation_id],historicalOperation);
    assert.deepEqual(handoffAfter.coordination.accesses,handoffBefore.coordination.accesses);
    assert.deepEqual(handoffAfter.coordination.testReservations,handoffBefore.coordination.testReservations);
    assert.equal((await client.info(true)).pid,serverPidBeforeProbe);
    await http('/transport/prepare',{transactionId:'native-after-pilot-handoff'});
    const afterPilotStopped=once(controller,'exit');controller.kill('SIGTERM');await afterPilotStopped;startController();
    await until(async()=>{try{return (await http('/transport/status')).adopted===true;}catch{return false;}},'adopt registry containing pilot receipt');
    assert.equal((await http('/runs/native-code/job')).sessionId,pilotCandidate.id);
    assert.deepEqual((await http('/runs/native-code/session-handoff/receipts')).receipts.at(-1),pilotReceipt);
    assert.equal(dispatched,pilotEnd,'restart and replay issue no provider or native effect');
    console.log(JSON.stringify({sameRunPilotHandoff:true,historicalApprovalsAndAccessesPreserved:true,idempotentReceipt:true,noHandoffNativePermission:true,certifiedRestartWithHandoffReceipt:true}));



    // Real dedicated edit rejected before once: two owner actions, no transported token.
    const singletonInput={path:singletonPath,oldString:'old',newString:'approved'};
    const singletonApproval={...approval,run_id:singletonRun.runId,reservation_version:singletonRun.version,
      session_id:singletonSession.id,change_id:'synthetic-singleton',requestId:'native-singleton-request',approval_id:'native-singleton-approval',
      operation_id:'native-singleton-operation',operation_digest:createHash('sha256').update('native-singleton-operation').digest('hex'),
      resources:singletonRun.resources,expected_revisions:{'file:singleton-withdraw.txt':0},files:['singleton-withdraw.txt'],commands:[],
      tool_input_sha256:nativeToolInputDigest(singletonInput)};
    const singletonEnd=dispatched+2;
    queue.push(mcp('request_validation',singletonApproval),{tool:'edit',input:{...singletonInput,newString:'unapproved'}});
    await client.prompt(singletonSession.id,nativeCodingMandate('Run only queued divergent edit; no other action.'));
    await until(async()=>(await http('/runs/native-singleton/status')).undecidedValidationCount===1,'singleton admission');
    await http('/runs/native-singleton/decision/'+singletonApproval.requestId,{decision:'approved'});
    const singletonAccess=await http('/runs/native-singleton/locks/acquire',{version:singletonRun.version,operationId:singletonApproval.operation_id,
      operationDigest:singletonApproval.operation_digest,resources:singletonApproval.resources,expectedRevisions:singletonApproval.expected_revisions});
    await until(async()=>(await http('/runs/native-singleton/status')).blockedNativeInputs.some(x=>x.requestId===singletonApproval.requestId),'singleton input guard');
    const singletonPermission=(await client.permissions(workspace,{sessionIds:[singletonSession.id]})).find(p=>p.sessionID===singletonSession.id);
    assert.ok(singletonPermission);
    const singletonClient=createOpenCodeV2Client({baseUrl:base,directory:workspace,passwordFile,
      permissionReceiptDirectory:join(runtimeStateDirectory(workspace,{stateHome:join(root,'private-state')}),'permission-replies')});
    await singletonClient.replyPermission(singletonSession.id,singletonPermission.id,'reject');
    await until(async()=>!(await client.activeSessions())[singletonSession.id]&&dispatched===singletonEnd,'singleton rejection terminal');
    await http('/runs/native-singleton/recovery/policy',{policyId:'native-singleton-policy',ownerId:singletonRun.ownerId,version:singletonRun.version,
      actions:['withdraw-unissued-validation','release-access'],resources:singletonRun.resources,authorization:'private fixture owner reviewed rejected edit before once'});
    const singletonBefore=(await http('/runs')).coordination.accesses[singletonAccess.accessId];
    const singletonEvidence=await http('/runs/native-singleton/recovery/native-evidence?operationId='+singletonApproval.operation_id),singletonPlan=await http('/runs/native-singleton/recovery');
    const singletonWithdraw=await http('/runs/native-singleton/recovery/action',{actionId:'native-singleton-withdraw',ownerId:singletonRun.ownerId,
      policyId:'native-singleton-policy',boundaryDigest:singletonPlan.boundaryDigest,action:'withdraw-unissued-validation',targetId:singletonApproval.operation_id,
      input:{nativeBoundaryDigest:singletonEvidence.nativeBoundaryDigest,evidence:['exact native edit rejection ACK reviewed']}});
    assert.equal(singletonWithdraw.state,'CANCELLED');assert.deepEqual((await http('/runs')).coordination.accesses[singletonAccess.accessId],singletonBefore);
    const singletonReleasePlan=await http('/runs/native-singleton/recovery');
    const singletonReleased=await http('/runs/native-singleton/recovery/action',{actionId:'native-singleton-release',ownerId:singletonRun.ownerId,
      policyId:'native-singleton-policy',boundaryDigest:singletonReleasePlan.boundaryDigest,action:'release-access',targetId:singletonAccess.accessId,
      input:{outcome:'RECONCILED',evidence:['dedicated member withdrawn before once']}});
    assert.equal(singletonReleased.state,'RELEASED');assert.equal(singletonReleased.token,undefined);assert.equal(readFileSync(singletonPath,'utf8'),'old');
    const singletonFinal=(await http('/runs')).coordination.operations[singletonApproval.operation_id];
    assert.equal(singletonFinal.state,'CANCELLED');assert.equal(singletonFinal.native,undefined);assert.equal(singletonFinal.nativeResult,undefined);assert.equal(singletonFinal.decision.status,'approved');
    console.log(JSON.stringify({dedicatedEditWithdrawal:true,nativeRejectionAck:true,parentPreservedBeforeRelease:true,noOnce:true,noEdit:true,ownerReleaseWithoutToken:true}));

    { // Write shares the edit permission category but keeps its own exact schema.
    const writeApproval={...singletonApproval,requestId:'native-singleton-write-request',approval_id:'native-singleton-write-approval',
      operation_id:'native-singleton-write-operation',operation_digest:createHash('sha256').update('native-singleton-write-operation').digest('hex'),
      tool_input_sha256:nativeToolInputDigest({path:singletonPath,content:'approved write'})};
    const writeEnd=dispatched+2;
    queue.push(mcp('request_validation',writeApproval),{tool:'write',input:{path:singletonPath,content:'unapproved write'}});
    await client.prompt(singletonSession.id,nativeCodingMandate('Only queued write request and input, no other effect.'));
    await until(async()=>(await http('/runs/native-singleton/status')).undecidedValidationCount===1,'write withdrawal admission');
    await http('/runs/native-singleton/decision/'+writeApproval.requestId,{decision:'approved'});
    const writeAccess=await http('/runs/native-singleton/locks/acquire',{version:singletonRun.version,operationId:writeApproval.operation_id,
      operationDigest:writeApproval.operation_digest,resources:writeApproval.resources,expectedRevisions:writeApproval.expected_revisions});
    await until(async()=>(await http('/runs/native-singleton/status')).blockedNativeInputs.some(x=>x.requestId===writeApproval.requestId),'write divergent input guard');
    const writePermission=(await singletonClient.permissions(workspace,{sessionIds:[singletonSession.id],verifyInputs:true})).find(p=>p.sessionID===singletonSession.id);
    assert.ok(writePermission);assert.equal(writePermission.permission,'edit');
    await singletonClient.replyPermission(singletonSession.id,writePermission.id,'reject');
    await until(async()=>!(await client.activeSessions())[singletonSession.id]&&dispatched===writeEnd,'write refusal terminal');
    const writeEvidence=await http('/runs/native-singleton/recovery/native-evidence?operationId='+writeApproval.operation_id),writePlan=await http('/runs/native-singleton/recovery');
    assert.equal(writeEvidence.calls.length,1);assert.equal(writeEvidence.calls[0].tool,'write');assert.equal(writeEvidence.calls[0].nativeTool,'write');
    assert.equal(writeEvidence.replyReceipts.length,1);assert.equal(writeEvidence.replyReceipts[0].httpStatus,204);
    const writeBefore=(await http('/runs')).coordination.accesses[writeAccess.accessId];
    const writeWithdraw=await http('/runs/native-singleton/recovery/action',{actionId:'native-write-withdraw',ownerId:singletonRun.ownerId,
      policyId:'native-singleton-policy',boundaryDigest:writePlan.boundaryDigest,action:'withdraw-unissued-validation',targetId:writeApproval.operation_id,
      input:{nativeBoundaryDigest:writeEvidence.nativeBoundaryDigest,evidence:['write native rejection ACK and exact target reviewed']}});
    assert.equal(writeWithdraw.state,'CANCELLED');assert.deepEqual((await http('/runs')).coordination.accesses[writeAccess.accessId],writeBefore);
    const writeReleasePlan=await http('/runs/native-singleton/recovery');
    const writeReleased=await http('/runs/native-singleton/recovery/action',{actionId:'native-write-release',ownerId:singletonRun.ownerId,
      policyId:'native-singleton-policy',boundaryDigest:writeReleasePlan.boundaryDigest,action:'release-access',targetId:writeAccess.accessId,
      input:{outcome:'RECONCILED',evidence:['write rejected and withdrawn before once']}});
    assert.equal(writeReleased.state,'RELEASED');assert.equal(writeReleased.token,undefined);assert.equal(readFileSync(singletonPath,'utf8'),'old');
    const writeFinal=(await http('/runs')).coordination.operations[writeApproval.operation_id];
    assert.equal(writeFinal.state,'CANCELLED');assert.equal(writeFinal.decision.status,'approved');assert.equal(writeFinal.native,undefined);assert.equal(writeFinal.nativeResult,undefined);
    console.log(JSON.stringify({nativeWriteWithdrawal:true,permissionCategory:'edit',schema:'path/content',exactAck:true,parentUnchangedBeforeRelease:true,noWriteEffect:true,noOnce:true}));
    }


    // Run cache qualification after normal multi-RUN setup: an unowned legacy shell must not bypass its startup gate.
    const effectiveAskProbe=await makeSession('saved grant versus effective ASK');
    const effectiveAskCommand="node -e \"console.log('CAB_PRIVATE_SAVED_GRANT')\"";
    queue.push({tool:'shell',input:{command:effectiveAskCommand,timeout:2000}});
    await client.prompt(effectiveAskProbe.id,'Synthetic isolated native cache qualification.');
    await until(async()=>(await client.permissions()).some(p=>p.sessionID===effectiveAskProbe.id),'private grant initial ASK');
    const effectiveAskRequest=(await client.permissions()).find(p=>p.sessionID===effectiveAskProbe.id);
    // The raw native API simulates a legacy external grant; the CAB client forbids always.
    await client.request('/api/session/'+effectiveAskProbe.id+'/permission/'+effectiveAskRequest.id+'/reply',{method:'POST',body:{decision:'always'}});
    await until(async()=>!(await client.activeSessions())[effectiveAskProbe.id],'private legacy grant done');
    const effectiveAskFirstPart=(await client.messages(effectiveAskProbe.id)).flatMap(m=>m.parts||[]).findLast(p=>p.nativeTool==='shell');
    assert.equal(effectiveAskFirstPart.state.metadata.exit,0);assert.match(effectiveAskFirstPart.state.output,/CAB_PRIVATE_SAVED_GRANT/);
    const effectiveAskPolicy=await client.nativePermissionPolicy(effectiveAskProbe.id,{requiredNativeAsk:['shell','edit']});
    assert.equal(effectiveAskPolicy.nominalReady,true);assert.equal(effectiveAskPolicy.ready,false);assert.ok(effectiveAskPolicy.savedGrantAudit.protectedCount>0);
    const effectiveAskProviderCount=providerRequests.length;
    await assert.rejects(client.prompt(effectiveAskProbe.id,nativeCodingMandate('No new native effect is allowed before maintenance.')),{code:'opencode-native-permission-ask-required'});
    assert.equal(providerRequests.length,effectiveAskProviderCount);
    await until(async()=>Object.keys(await client.activeSessions()).length===0,'private permission maintenance boundary');
    const effectiveAskBoundary=await client.mcpRecoverySnapshot(),effectiveAskBrokerPid=Number(readFileSync(brokerPidFile,'utf8'));
    const effectiveAskPlan=await client.nativePermissionRepairPlan(effectiveAskProbe.id,{planId:'native-effective-ask-qualification'});
    const effectiveAskRepair=await client.revokeSavedNativePermissions(effectiveAskPlan,{kind:'shared-project-maintenance',projectID:effectiveAskPlan.projectID,directory:workspace,planDigest:effectiveAskPlan.planDigest,reference:'fixture:explicit-private-native-maintenance'});
    assert.equal(effectiveAskRepair.state,'COMPLETED');assert.equal((await client.nativePermissionPolicy(effectiveAskProbe.id,{requiredNativeAsk:['shell','edit']})).ready,true);
    assert.deepEqual(await client.mcpRecoverySnapshot(),effectiveAskBoundary);assert.equal(Number(readFileSync(brokerPidFile,'utf8')),effectiveAskBrokerPid);
    queue.push({tool:'shell',input:{command:effectiveAskCommand,timeout:2000}});
    await client.prompt(effectiveAskProbe.id,'Controlled readonly command must wait for ASK.',{requiredNativeAsk:['shell','edit']});
    await until(async()=>(await client.permissions()).some(p=>p.sessionID===effectiveAskProbe.id),'ASK physically restored after revocation');
    const effectiveAskPending=(await client.permissions()).find(p=>p.sessionID===effectiveAskProbe.id);
    const effectiveAskPart=(await client.messages(effectiveAskProbe.id)).flatMap(m=>m.parts||[]).findLast(p=>p.nativeTool==='shell');
    assert.equal(effectiveAskPart.state.status,'running');assert.notEqual(effectiveAskPart.state.metadata?.exit,0);
    await client.replyPermission(effectiveAskProbe.id,effectiveAskPending.id,'reject');
    await until(async()=>!(await client.activeSessions())[effectiveAskProbe.id],'restored ASK rejected without executing');
    console.log('Saved native grant detected behind nominal ASK; scoped API revocation restores an actual pending permission before the second command.');


  });
