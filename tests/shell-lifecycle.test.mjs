import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ShellLifecycle } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-shell-lifecycle.mjs';
import { nativeToolInputDigest } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(),'cab-background-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const path=join(root,'shells.json'), input={command:'/usr/bin/sleep 1',background:true,timeout:3000};
  const approved={kind:'bash',operationId:'op',sessionId:'ses_fixture',shellBackground:true,
    target:input.command,toolInputSha256:nativeToolInputDigest(input)};
  const op={operationId:'op',identityDigest:'a'.repeat(64),runId:'run',contextId:'context',sessionId:'ses_fixture',
    resources:[{key:'port:fixture/5173',mode:'write'}],native:{permissionId:'per_fixture',callId:'call_fixture',startedAt:900}};
  const part={type:'tool',tool:'bash',nativeTool:'shell',nativeFormat:'opencode-v2',executed:false,
    callID:'call_fixture',state:{status:'completed',input,metadata:{shellID:'sh_fixture',status:'running'},time:{start:1000,end:1200}}};
  const info={shellId:'sh_fixture',status:'running',command:input.command,cwd:root,
    sessionId:null,startedAt:1100,finishedAt:null,exit:null};
  const identity={pid:123,version:'2.2.8',directory:root};
  return {root,path,approved,op,part,info,identity,create:()=>new ShellLifecycle(path)};
}

test('background : start non terminal, reprise privée, sortie et timeout restent distincts',t=>{
  const h=fixture(t), store=h.create();
  assert.equal(store.observe(h.op,h.approved,h.part,h.info,h.identity,h.root),null);
  const restored=h.create();assert.equal(restored.proof(h.op,h.part,h.op.sessionId),null);
  const terminal={...h.info,status:'exited',finishedAt:2000,exit:1};
  const proof=restored.observe(h.op,h.approved,h.part,terminal,h.identity,h.root);
  assert.equal(proof.status,'completed');assert.equal(proof.exit,1);assert.equal(proof.shellId,'sh_fixture');
  assert.deepEqual(restored.observe(h.op,h.approved,h.part,terminal,h.identity,h.root),proof);
  assert.throws(()=>restored.observe(h.op,h.approved,h.part,h.info,h.identity,h.root),/divergent/);
  const restarted=h.create();assert.equal(restarted.proof(h.op,h.part,h.op.sessionId),null);
  assert.deepEqual(restarted.observe(h.op,h.approved,h.part,terminal,h.identity,h.root),proof);
  assert.throws(()=>restarted.observe(h.op,h.approved,h.part,terminal,{...h.identity,pid:124},h.root),/divergent/);
  h.op.operationId='timeout';h.approved.operationId='timeout';
  const timeout=restarted.observe(h.op,h.approved,h.part,{...terminal,status:'timeout',exit:null},h.identity,h.root);
  assert.equal(timeout.status,'error');assert.equal(timeout.shellStatus,'timeout');assert.equal(timeout.exit,null);
});

test('background : aucune preuve sur une autre commande, session, permission, source ou date',t=>{
  const h=fixture(t), store=h.create(), terminal={...h.info,status:'exited',finishedAt:2000,exit:0};
  for (const change of [
    x=>{x.info.command='/usr/bin/false';}, x=>{x.info.cwd='/elsewhere';},
    x=>{x.info.shellId='sh_foreign';}, x=>{x.info.sessionId='ses_foreign';},
    x=>{x.info.startedAt=500;}, x=>{x.info.finishedAt=1000;}, x=>{x.part.callID='foreign';},
    x=>{x.part.state.input.timeout=0;},x=>{x.part.state.input.background=false;},
    x=>{delete x.part.state.metadata.shellID;}, x=>{delete x.approved.shellBackground;},
    x=>{x.op.resources=[{key:'port:fixture/5173',mode:'read'}];},
  ]) {
    const x=structuredClone({op:h.op,approved:h.approved,part:h.part,info:terminal});change(x);
    assert.throws(()=>store.observe(x.op,x.approved,x.part,x.info,h.identity,h.root),/divergent/);
    assert.equal(store.proof(x.op,x.part,h.op.sessionId),null);
  }
  assert.equal(store.rows.size,0);
  // A historical foreground timeout without shellID cannot be adopted retroactively.
  const old={...h.approved,shellBackground:undefined};
  assert.throws(()=>store.observe(h.op,old,h.part,terminal,h.identity,h.root),/divergent/);
});

test('background : checkpoint altéré isole ce suivi sans inventer de fin ni bloquer le foreground',t=>{
  const h=fixture(t);writeFileSync(h.path,'{invalid',{mode:0o600});const store=h.create();
  assert.equal(store.error,'shell-lifecycle-unavailable');
  assert.throws(()=>store.available(h.approved),/unavailable/);
  assert.doesNotThrow(()=>store.available({...h.approved,shellBackground:undefined}));
  assert.equal(store.proof(h.op,h.part,h.op.sessionId),null);
});
