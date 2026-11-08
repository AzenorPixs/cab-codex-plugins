import {runtimeRequest} from './cgpt-approval-bridge-runtime-client.mjs';
import {ArchiveContent,archiveDirectory} from './cgpt-approval-bridge-archives.mjs';
import { followOpenCodeRestart, boundedCleanup, SHUTDOWN_INCOMPLETE, VERSION as LIFECYCLE_VERSION } from './cgpt-approval-bridge-process-lifecycle.mjs';
import {ensureProjectTestRoot} from './cgpt-approval-bridge-autonomy.mjs';
import { readFile, realpath } from 'node:fs/promises';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { MonitorState, monitorConfiguration, VERSION as DATA_VERSION } from './cgpt-approval-bridge-monitor-data.mjs';
import { guardStatisticsPost, statisticsSelection, VERSION as MAINTENANCE_VERSION } from './cgpt-approval-bridge-statistics-maintenance.mjs';
import { MonitorCatalog, MonitorServices, guardManagementPost, managementBody, VERSION as MANAGEMENT_VERSION } from './cgpt-approval-bridge-monitor-management.mjs';

export const VERSION = '2.4.25';
if ([DATA_VERSION, MAINTENANCE_VERSION, MANAGEMENT_VERSION, LIFECYCLE_VERSION].some((value) => value !== VERSION)) throw new Error('CAB monitor component version mismatch');
const assets = new Map([['/', ['index.html', 'text/html; charset=utf-8']],
  ['/stats.mjs', ['stats.mjs', 'text/javascript; charset=utf-8']],
  ['/app.mjs', ['app.mjs', 'text/javascript; charset=utf-8']], ['/style.css', ['style.css', 'text/css; charset=utf-8']]]);

export async function createMonitorServer(configuration, options = {}) {
  ensureProjectTestRoot(configuration.workspace);
  const state = new MonitorState(configuration, options);
  const catalog = new MonitorCatalog(configuration.stateDirectory, configuration.workspace);
  const archiveContent=new ArchiveContent(options.archiveDirectory||configuration.archiveDirectory||archiveDirectory(configuration.workspace),configuration.workspace);
  await catalog.load();
  const services = new MonitorServices(configuration, options);
  let serviceError = null;
  const snapshot = () => {
    const value = catalog.project(state.snapshot());
    value.management.serviceError = serviceError;
    return value;
  };
  const files = new Map();
  for (const [route, [name, type]] of assets) files.set(route, { type,
    data: await readFile(new URL('../web-monitor/' + name, import.meta.url)) });
  const clients = new Set();
  const abort = new AbortController();
  let interval;
  let refreshTimer;
  let retryTimer;
  let streamTask;
  let statisticsRequests = 0;
  let managementInFlight = false;
  let webRestartPending = false;
  function emit() {
    const frame = 'event: snapshot\ndata: ' + JSON.stringify(snapshot()) + '\n\n';
    for (const response of clients) if (!response.write(frame)) response.destroy();
  }
  state.listeners.add(emit);
  let closing = false;
  let closePromise;
  const requests = new Set();
  const server = createServer((request, response) => {
    const pending = handleRequest(request, response);
    requests.add(pending);
    void pending.finally(() => requests.delete(pending)).catch(() => response.destroy());
  });
  async function handleRequest(request, response) {
    if (closing) { response.writeHead(503).end(); return; }
    const jsonReply=(status,value)=>{response.writeHead(status,{'content-type':'application/json'});response.end(JSON.stringify(value));};
    response.setHeader('cache-control', 'no-store');
    response.setHeader('x-content-type-options', 'nosniff');
    response.setHeader('referrer-policy', 'no-referrer');
    response.setHeader('content-security-policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    let url;
    try {
      url = new URL(request.url, 'http://' + request.headers.host);
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
          Number(url.port || 80) !== server.address().port ||
          (request.headers.origin && request.headers.origin !== url.origin)) {
        response.writeHead(403).end(); return;
      }
    } catch { response.writeHead(400).end(); return; }
    if(url.pathname==='/api/archives'||url.pathname==='/api/archives/content'||url.pathname==='/api/archives/delete') {
      try {
        if(url.pathname==='/api/archives'&&request.method==='GET'&&!url.search)jsonReply(200,{archives:archiveContent.list()});
        else if(url.pathname==='/api/archives/content'&&request.method==='GET') {
          if(url.searchParams.getAll('archiveId').length!==1||url.searchParams.getAll('sha256').length!==1||[...url.searchParams.keys()].some(key=>!['archiveId','sha256'].includes(key)))throw new Error('archive-query-invalid');
          jsonReply(200,archiveContent.content(url.searchParams.get('archiveId'),url.searchParams.get('sha256')));
        }else if(url.pathname==='/api/archives/delete'&&request.method==='POST'&&!url.search) {
          guardManagementPost(request,url);
          const body=await managementBody(request);
          if(Object.keys(body).sort().join(',')!=='archiveId,fingerprint')throw new Error('archive-delete-input-invalid');
          await state.collect();
          const active=state.runs().filter(run=>run.armed===true||run.state==='RESERVED'||run.mode==='direct').map(run=>run.runId);
          jsonReply(200,archiveContent.remove(body.archiveId,body.fingerprint,active));
        }else response.writeHead(405).end();
      }catch(error){jsonReply(error.status||409,{error:error.code||'archive-operation-unavailable'});}
      return;
    }
    if (url.pathname.startsWith('/api/manage/')) {
      if(configuration.mode==='direct'&&url.pathname==='/api/manage/service'){jsonReply(405,{error:'direct-monitor-service-management-unavailable'});return;}
      let acquired = false;
      try {
        if (!['/api/manage/catalog', '/api/manage/service'].includes(url.pathname) || url.search) {
          response.writeHead(404).end(); return;
        }
        if (request.method !== 'POST') { response.writeHead(405, { allow: 'POST' }).end(); return; }
        guardManagementPost(request, url);
        if (managementInFlight || webRestartPending) throw Object.assign(new Error('monitor-management-busy'), { status: 409 });
        managementInFlight = true; acquired = true;
        const body = await managementBody(request);
        await state.collect();
        const result = url.pathname.endsWith('/catalog') ? await catalog.mutate(body, state.snapshot()) : await services.act(body);
        response.writeHead(result.deferred ? 202 : 200, { 'content-type': 'application/json' });
        if (result.deferred) {
          webRestartPending = true;
          response.once('finish', () => {
            void services.restartWeb().catch(() => {
              webRestartPending = false; serviceError = 'monitor-web-restart-failed'; emit();
            });
          });
        }
        response.end(JSON.stringify({ ...result, startedAt: state.startedAt,
          ...(url.pathname.endsWith('/catalog') ? { snapshot: snapshot() } : {}) }));
        emit(); refresh();
      } catch (error) {
        if (!response.headersSent && !response.destroyed) {
          response.writeHead(error.status || 503, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ error: error.status ? error.message : 'monitor-management-unavailable' }));
        }
      } finally { if (acquired) managementInFlight = false; }
      return;
    }
    if (url.pathname === '/api/statistics' || url.pathname==='/api/statistics/component' ||url.pathname==='/api/statistics/events'|| url.pathname.startsWith('/api/statistics/retention/') || url.pathname === '/api/ccab') {
      if(request.method!=='GET'){response.writeHead(405,{allow:'GET'}).end();return;}
      if(url.pathname.startsWith('/api/statistics/retention/')){jsonReply(409,{error:'sgs-retention-separate-from-runtime'});return;}
      if(statisticsRequests>=20){response.writeHead(503).end();return;}
      statisticsRequests++;
      try {
        const call=options.runtimeRequest||runtimeRequest;
        if(url.pathname==='/api/ccab') {
          let result;try{result=await call('ccab','/incidents');}catch{result={incidents:[],unavailable:true};}
          const pending=state.sources.controller?.value?.brokerReadiness?.ccab_outbox;
          jsonReply(200,{incidents:result.incidents.filter(item=>item.project===configuration.workspace),unavailable:result.unavailable||false,pendingBroker:pending?.entries||[]});
        }else if(url.pathname==='/api/statistics/events') {
          if(url.searchParams.getAll('binding').length!==1||[...url.searchParams.keys()].some(key=>!['binding','after','limit'].includes(key)))throw new Error('sgs-event-query-invalid');
          const params=new URLSearchParams(url.searchParams);params.set('project',configuration.workspace);
          jsonReply(200,await call('sgs','/events?'+params));
        }else if(url.pathname==='/api/statistics/component') {
          if(url.searchParams.getAll('component').length!==1||[...url.searchParams.keys()].some(key=>key!=='component'))throw new Error('sgs-component-query-invalid');
          jsonReply(200,await call('sgs','/component/checkpoint?'+new URLSearchParams({project:configuration.workspace,component:url.searchParams.get('component')}),undefined,{maxResponseBytes:64*1024*1024}));
        }else {
          if([...url.searchParams.keys()].some(key=>!['selection','runId'].includes(key)) ||
            url.searchParams.getAll('runId').length>1)throw new Error('sgs-selection-invalid');
          const result=await call('sgs','/stats?project='+encodeURIComponent(configuration.workspace));
          const runOptions=[...new Set(result.sessions.map(session=>session.run))].sort();
          const runId=url.searchParams.get('runId');
          jsonReply(200,{...result,backend:'sgs',runOptions,observedAt:new Date().toISOString(),
            sessions:runId?result.sessions.filter(session=>session.run===runId):result.sessions,
            archives:runId?[]:result.archives});
        }
      }catch{jsonReply(503,{error:url.pathname==='/api/ccab'?'ccab-unavailable':'sgs-unavailable'});}
      finally{statisticsRequests--;}
      return;
    }
    if (request.method !== 'GET') { response.writeHead(405, { allow: 'GET' }).end(); return; }
    if (url.pathname === '/api/identity'||url.pathname==='/api/maintenance-identity') {
      if (url.search) { response.writeHead(400).end(); return; }
      const maintenance=url.pathname==='/api/maintenance-identity';
      if(maintenance&&request.headers['x-cab-continuity']!=='cab-continuity-v1'){response.writeHead(403).end();return;}
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ version: VERSION,identity: { workspace: configuration.workspace,mode:configuration.mode||'piloted' },
        ...(maintenance?{pid:process.pid,stateDirectory:configuration.stateDirectory}:{}) })); return;
    }
    if (url.pathname === '/api/snapshot') {
      response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify(snapshot())); return;
    }
    if (url.pathname === '/api/events') {
      if (clients.size >= 20) { response.writeHead(503).end(); return; }
      response.writeHead(200, { 'content-type': 'text/event-stream' });
      clients.add(response);
      response.write('event: snapshot\ndata: ' + JSON.stringify(snapshot()) + '\n\n');
      request.on('close', () => clients.delete(response)); return;
    }
    const file = files.get(url.pathname);
    if (!file) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'content-type': file.type }); response.end(file.data);
  }
  function refresh() {
    if (!refreshTimer && !abort.signal.aborted) refreshTimer = setTimeout(() => {
      refreshTimer = null;
      state.publish();
      void state.collect().catch(() => { state.coverage.stream = 'collection-error'; state.publish(); });
    }, 50);
  }
  async function streamController() {
    while (!abort.signal.aborted) {
      const attempt = new AbortController();
      let watchdog = setTimeout(() => attempt.abort(), configuration.timeoutMs);
      try {
        state.coverage.stream = 'connecting';
        const response = await (options.fetcher || fetch)(configuration.controllerUrl + '/monitor/events', {
          signal: AbortSignal.any([abort.signal, attempt.signal]), redirect: 'error', headers: { accept: 'text/event-stream' } });
        if (!response.ok || !response.body || !response.headers.get('content-type')?.startsWith('text/event-stream')) {
          await response.body?.cancel(); throw new Error('observation-stream-unavailable');
        }
        state.coverage.stream = 'connected'; state.publish();
        clearTimeout(watchdog); watchdog = setTimeout(() => attempt.abort(), 30000);
        let buffer = '';
        const decoder = new TextDecoder();
        for await (const chunk of response.body) {
          clearTimeout(watchdog); watchdog = setTimeout(() => attempt.abort(), 30000);
          buffer += decoder.decode(chunk, { stream: true });
          if (buffer.length > 1024 * 1024) throw new Error('observation-frame-too-large');
          const frames = buffer.split(/\r?\n\r?\n/); buffer = frames.pop();
          for (const frame of frames) {
            const payload = frame.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n');
            if (!payload) continue;
            const value = JSON.parse(payload);
            if (value.event) state.ingest({ instanceId: value.instanceId, events: [value.event] });
            else state.ingest(value);
            refresh();
          }
        }
      } catch {
        if (!abort.signal.aborted) { state.coverage.stream = 'disconnected'; state.publish(); }
      } finally { clearTimeout(watchdog); }
      if (!abort.signal.aborted) await new Promise((resolve) => {
        const done = () => { clearTimeout(retryTimer); abort.signal.removeEventListener('abort', done); resolve(); };
        retryTimer = setTimeout(done, 1000); abort.signal.addEventListener('abort', done, { once: true });
      });
    }
  }
  return { server, state,
    async start() {
      await new Promise((resolve, reject) => { server.once('error', reject);
        server.listen(configuration.port, configuration.host, () => { server.off('error', reject); resolve(); }); });
      refresh(); interval = setInterval(refresh, configuration.pollMs);
      streamTask = configuration.mode==='direct'?Promise.resolve():streamController();
      return server.address();
    },
    close() {
      if (closePromise) return closePromise;
      closing = true;
      closePromise = (async () => {
        abort.abort(); clearInterval(interval); clearTimeout(refreshTimer);
        for (const response of clients) response.destroy();
        await streamTask;
        server.closeAllConnections();
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        await Promise.all([...requests]);
      })();
      return closePromise;
    } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1])).href) {
  try {
    const configuration = monitorConfiguration();
    configuration.workspace = await realpath(configuration.workspace);
    const monitor = await createMonitorServer(configuration);
    await monitor.start();
    process.stdout.write('CAB Monitor ' + VERSION + ' : http://' +
      (configuration.host === '::1' ? '[::1]' : configuration.host) + ':' + configuration.port + '\n');
    let closing = false;
    const close = async () => {
      if (closing) return;
      closing = true; lifetime.stop();
      try { await boundedCleanup(() => monitor.close()); process.exit(0); }
      catch { process.stderr.write('Arrêt de CAB Monitor incomplet.\n'); process.exit(SHUTDOWN_INCOMPLETE); }
    };
    let nativeRestartLocation = null;
    const lifetime = configuration.mode==='direct'?{start(){},stop(){}}:followOpenCodeRestart(monitor.state.openCode, {
      onLost: async () => {}, onAttach: async () => {
        const location = await monitor.state.openCode.sharedMcpDirectory();
        if (nativeRestartLocation !== null && location !== nativeRestartLocation) return false;
        nativeRestartLocation = location; return true;
      },
      onDiagnostic: (code) => process.stderr.write(code + '\n') });
    lifetime.start();
    process.on('SIGTERM', () => { void close(); }); process.on('SIGINT', () => { void close(); });
    monitor.server.on('error', () => { void close(); });
  } catch {
    process.stderr.write('CAB Monitor : configuration, ressources ou port indisponibles.\n'); process.exitCode = 1;
  }
}
