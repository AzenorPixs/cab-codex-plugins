import assert from 'node:assert/strict';
import test from 'node:test';
import { readSource } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-source-read.mjs';

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
