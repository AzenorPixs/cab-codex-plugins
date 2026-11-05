import { createServer } from 'node:http';
import { openCodeV2TestHandler } from './opencode-v2-test-server.mjs';

const directory = process.argv[2];
let outage = false;
let infoRequests = 0;
const streams = new Set();
const legacy = openCodeV2TestHandler((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path === '/global/event') {
    response.writeHead(200, { 'content-type': 'text/event-stream' });
    response.write('data: {"type":"server.connected"}\n\n');
    streams.add(response); response.once('close', () => streams.delete(response)); return;
  }
  let value = {};
  if (path === '/permission') value = [];
  else if (path === '/session') value = [];
  else if (path.endsWith('/message')) value = [];
  else if (path.startsWith('/session/') && path !== '/session/status') value = {
    id: path.split('/')[2], directory, permission: [{ permission: '*', pattern: '*', action: 'ask' }] };
  else if (path === '/provider') value = { all: [], connected: [] };
  response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(value));
}, { directory });
const server = createServer((request, response) => {
  if (request.url === '/api/info') {
    infoRequests++; process.send?.({ infoRequests });
    const authorized = request.headers.authorization === 'Basic ' + Buffer.from('opencode:synthetic-v2-test-password').toString('base64');
    response.writeHead(outage ? 503 : authorized ? 200 : 401, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ version: '2.2.0', pid: process.pid, urls: [], paths: {} })); return;
  }
  if (outage) { response.writeHead(503, { 'content-type': 'application/json' }).end('{}'); return; }
  void legacy(request, response);
});
server.listen(0, '127.0.0.1', () => process.send?.({ port: server.address().port }));
process.on('message', (message) => {
  if (message === 'outage') { outage = true; for (const response of streams) response.destroy(); }
  if (message === 'restore') outage = false;
  if (message === 'exit') { server.closeAllConnections(); server.close(() => process.exit(0)); }
});
