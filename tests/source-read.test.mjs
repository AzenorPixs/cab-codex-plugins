import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, symlink } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { readSource } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-source-read.mjs';

test('source-read transmet le plafond explicite borné sans changer le périmètre',async()=>{
 let called;
 await assert.rejects(readSource({controllerUrl:'http://127.0.0.1:8788',runId:'fixture',operation:'read',path:'TECHNICAL.md',maxBytes:2097153}),/arguments-invalid/);
 await assert.rejects(readSource({controllerUrl:'http://127.0.0.1:8788',runId:'fixture',operation:'read',path:'TECHNICAL.md',maxBytes:2097152},async url=>{
  called=new URL(url);throw new Error('fixture-network-error');
 }),/controller-unavailable/);
 assert.equal(called.searchParams.get('maxBytes'),'2097152');
 assert.equal(called.pathname,'/runs/fixture/source/read');
});

test('source-read CLI requests only the scoped RUN route and returns a snapshot',async()=>{
 let requested;
 const response={status:200,ok:true,headers:new Headers({'content-type':'application/json'}),body:new ReadableStream({
  start(controller){controller.enqueue(new TextEncoder().encode(JSON.stringify({runId:'run-read',source:'opencode-v2-fs-read',snapshot_only:true,
   sessionId:'ses_read',directory:'/workspace',path:'src/file.py',content:'value=1\n',byteLength:8,sha256:'a'.repeat(64)})));controller.close();}
 })};
 const result=await readSource({controllerUrl:'http://127.0.0.1:8788',runId:'run-read',operation:'read',path:'src/file.py'},async(url,options)=>{
  requested={url:new URL(url),options};return response;
 });
 assert.equal(requested.url.pathname,'/runs/run-read/source/read');assert.equal(requested.url.searchParams.get('path'),'src/file.py');
 assert.equal(requested.options.method,undefined);assert.equal(requested.options.redirect,'error');assert.equal(result.content,'value=1\n');
});

test('source-read CLI rejects non-loopback controller, invalid RUN and unfiltered response',async()=>{
 await assert.rejects(readSource({controllerUrl:'https://remote.example',runId:'run-read',operation:'read',path:'a'},fetch),
  {code:'source-read-controller-url-invalid'});
 await assert.rejects(readSource({controllerUrl:'http://127.0.0.1:8788',runId:'../other',operation:'read',path:'a'},fetch),
  {code:'source-read-arguments-invalid'});
 const response=new Response(JSON.stringify({runId:'other',source:'opencode-v2-fs-read',snapshot_only:true}),
  {status:200,headers:{'content-type':'application/json'}});
 await assert.rejects(readSource({controllerUrl:'http://127.0.0.1:8788',runId:'run-read',operation:'read',path:'a'},async()=>response),
  {code:'source-read-response-invalid'});
});

test('source-read CLI expose uniquement une cause technique filtrée si le contrôleur échoue',async()=>{
 const input={controllerUrl:'http://127.0.0.1:8788',runId:'run-read',operation:'read',path:'src/file.py'};
 await assert.rejects(readSource(input,async()=>{throw Object.assign(new Error('secret body'),{code:'ECONNREFUSED'});}),error=>{
  assert.equal(error.code,'source-read-controller-unavailable');
  assert.equal(error.causeCode,'ECONNREFUSED');
  assert.equal(error.message.includes('secret body'),false);
  return true;
 });
 await assert.rejects(readSource(input,async()=>{throw Object.assign(new Error('private'),{code:'bad code!'});}),error=>{
  assert.equal(error.code,'source-read-controller-unavailable');
  assert.equal(error.causeCode,'Error');
  assert.equal(error.message.includes('private'),false);
  return true;
 });
});

test('source-read CLI démarre depuis le lien stable des scripts distribués',async t=>{
 const root=await mkdtemp(join(tmpdir(),'cab-source-read-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const stable=join(root,'cgpt-approval-bridge-source-read.mjs');
 await symlink(fileURLToPath(new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-source-read.mjs',import.meta.url)),stable);
 const server=createServer((request,response)=>{
  if(request.url==='/runs/run-read/source/read?path=src%2Fexample.py'){
   response.writeHead(200,{'content-type':'application/json'});
   response.end(JSON.stringify({runId:'run-read',source:'opencode-v2-fs-read',snapshot_only:true,
    path:'src/example.py',sessionId:'ses_read',directory:'/workspace',content:'value=42\n',byteLength:9,sha256:'b'.repeat(64)}));
  }else{response.writeHead(404,{'content-type':'application/json'});response.end(JSON.stringify({error:'source-read-failed'}));}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const child=spawn(process.execPath,[stable,'--controller-url',`http://127.0.0.1:${server.address().port}`,
  '--run-id','run-read','--operation','read','--path','src/example.py']);let stdout='',stderr='';
 child.stdout.setEncoding('utf8').on('data',chunk=>stdout+=chunk);child.stderr.setEncoding('utf8').on('data',chunk=>stderr+=chunk);
 const code=await new Promise(resolve=>child.once('close',resolve));
 assert.equal(code,0,stderr);assert.equal(JSON.parse(stdout).content,'value=42\n');
});
