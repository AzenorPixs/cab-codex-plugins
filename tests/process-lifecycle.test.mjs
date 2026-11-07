import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { followOpenCodeLifetime, followOpenCodeRestart, processIdentity, processOwnerIdentity, verifiedNativeChild, boundedCleanup } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-process-lifecycle.mjs';

const live = { pid: 123, startTime: '45', state: 'S' };
test('redémarrage : protection puis rattachement seulement après vérification',async t=>{
 const old={pid:123,startTime:'45',state:'S',uid:1000},next={pid:456,startTime:'90',state:'S',uid:1000};
 let api=old.pid, identities=new Map([[old.pid,old]]), verified=false;const events=[];
 const watcher=followOpenCodeRestart({info:async()=>({pid:api})},{intervalMs:60000,
  readIdentity:async pid=>identities.get(pid)||null,onLost:async()=>events.push('protected'),
  onAttach:async(candidate,previous)=>{events.push(previous?'review-restart':'first');return !previous||verified}});
 t.after(()=>watcher.stop());await watcher.check();assert.equal(watcher.snapshot().state,'attached');
 identities.delete(old.pid);api=next.pid;identities.set(next.pid,next);await watcher.check();
 assert.equal(watcher.snapshot().state,'reconnecting');assert.deepEqual(events,['first','protected','review-restart']);
 verified=true;await watcher.check();assert.equal(watcher.snapshot().state,'attached');assert.equal(watcher.snapshot().identity.pid,next.pid);
});
test('redémarrage : identité instable ou validation refusée conserve la protection',async t=>{
 const old={pid:123,startTime:'45',state:'S',uid:1000},next={pid:456,startTime:'90',state:'S',uid:1000};
 let api=old.pid,reads=0, oldAlive=true,allow=false,lost=0;
 const watcher=followOpenCodeRestart({info:async()=>({pid:api})},{intervalMs:60000,
  readIdentity:async pid=>pid===old.pid?(oldAlive?old:null):(reads++%2?{...next,startTime:'91'}:next),
  onLost:async()=>{lost++},onAttach:async(_candidate,previous)=>!previous||allow});
 t.after(()=>watcher.stop());await watcher.check();oldAlive=false;api=next.pid;
 await watcher.check();assert.equal(watcher.snapshot().state,'reconnecting');assert.equal(lost,1);
 await watcher.check();assert.equal(watcher.snapshot().state,'reconnecting');assert.equal(lost,1);
});
test('redémarrage : un autre propriétaire ne peut pas être adopté',async t=>{
 const old={pid:123,startTime:'45',state:'S',uid:1000},foreign={pid:456,startTime:'90',state:'S',uid:1001};
 let api=old.pid, active=old;let approvals=0;
 const watcher=followOpenCodeRestart({info:async()=>({pid:api})},{intervalMs:60000,
  readIdentity:async pid=>pid===active?.pid?active:null,onLost:async()=>{},onAttach:async()=>{approvals++;return true}});
 t.after(()=>watcher.stop());await watcher.check();active=foreign;api=foreign.pid;await watcher.check();
 assert.equal(watcher.snapshot().state,'reconnecting');assert.equal(approvals,1);
});
test('redémarrage : changement pendant la revue empêche la reprise',async t=>{
 const old={pid:123,startTime:'45',state:'S',uid:1000},next={pid:456,startTime:'90',state:'S',uid:1000};
 let api=old.pid,current=old,ready=0;
 const watcher=followOpenCodeRestart({info:async()=>({pid:api})},{intervalMs:60000,
  readIdentity:async pid=>pid===current?.pid?current:null,onLost:async()=>{},
  onAttach:async(_candidate,previous)=>{if(previous)current={...next,startTime:'91'};return true},onReady:()=>ready++});
 t.after(()=>watcher.stop());await watcher.check();assert.equal(ready,1);
 current=next;api=next.pid;await watcher.check();assert.equal(watcher.snapshot().state,'reconnecting');assert.equal(ready,1);
});
test('broker : seul un enfant vivant du processus suivi et du même propriétaire est admis',async t=>{
 const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});
 t.after(()=>{if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL')});
 await once(child,'spawn');const parent=await processOwnerIdentity(process.pid);
 assert.equal(await verifiedNativeChild(parent,child.pid),true);
 assert.equal(await verifiedNativeChild(parent,process.pid),false);
 assert.equal(await verifiedNativeChild({...parent,uid:parent.uid+1},child.pid),false);
});
function fixture(t, options = {}) {
  let identity = live;
  let apiDown = false;
  let exits = 0;
  let calls = 0;
  const diagnostics = [];
  const watcher = followOpenCodeLifetime({ info: async () => {
    calls++; if (apiDown) throw new Error('synthetic transport failure'); return { pid: live.pid };
  } }, { onExit: () => { exits++; }, onDiagnostic: (code) => diagnostics.push(code),
    readIdentity: async () => { if (identity instanceof Error) throw identity; return identity; },
    intervalMs: 60000, ...options });
  t.after(() => watcher.stop());
  return { watcher, diagnostics, identity: (value) => { identity = value; }, down: () => { apiDown = true; },
    counts: () => ({ exits, calls }) };
}

test('attend une identité vérifiable puis se rattache sans fermer', async (t) => {
  const f = fixture(t); f.identity(null); await f.watcher.check();
  assert.equal(f.watcher.snapshot().state, 'waiting'); assert.equal(f.counts().exits, 0);
  f.identity(live); await f.watcher.check(); assert.equal(f.watcher.snapshot().state, 'attached');
  assert.equal(f.counts().exits, 0);
});
test('panne HTTP et client fermé ne ferment pas un serveur vivant', async (t) => {
  const f = fixture(t); await f.watcher.check(); f.down();
  await f.watcher.check(); await f.watcher.check();
  assert.deepEqual(f.counts(), { exits: 0, calls: 1 });
});
for (const [label, state] of [['absence', null], ['zombie', { ...live, state: 'Z' }],
  ['PID réutilisé', { ...live, startTime: '46' }]]) {
  test(`fin prouvée : ${label}, un seul arrêt`, async (t) => {
    const f = fixture(t); await f.watcher.check(); f.identity(state);
    await f.watcher.check(); await f.watcher.check();
    assert.deepEqual(f.counts(), { exits: 1, calls: 1 });
    assert.equal(f.watcher.snapshot().state, 'stopped');
  });
}
test('erreur locale non probante : diagnostic filtré sans arrêt', async (t) => {
  const f = fixture(t); await f.watcher.check(); f.identity(new Error('synthetic private detail'));
  await f.watcher.check(); await f.watcher.check();
  assert.equal(f.counts().exits, 0); assert.deepEqual(f.diagnostics, ['opencode-lifecycle-identity-unverifiable']);
});
test('pas de contrôle recouvrant ni rattachement après arrêt', async () => {
  let resolveInfo; let calls = 0;
  const watcher = followOpenCodeLifetime({ info: () => { calls++; return new Promise((r) => { resolveInfo = r; }); } },
    { onExit() { assert.fail(); }, readIdentity: async () => live });
  const pending = watcher.check(); await watcher.check(); watcher.stop();
  resolveInfo({ pid: 123 }); await pending;
  assert.equal(calls, 1); assert.equal(watcher.snapshot().identity, null);
});
test('identité réelle et disparition brutale d’un processus dédié', async (t) => {
  const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' });
  t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); });
  const identity = await processIdentity(child.pid); assert.equal(identity.pid, child.pid);
  assert.match(identity.startTime, /^\d+$/);
  const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
  assert.equal(await processIdentity(child.pid), null);
  await assert.rejects(processIdentity('../invalid'), /invalid-pid/);
});
test('nettoyage réussi, rejet et délai borné restent distincts', async () => {
  await boundedCleanup(async () => {});
  await assert.rejects(boundedCleanup(async () => { throw new Error('synthetic'); }), /synthetic/);
  await assert.rejects(boundedCleanup(() => new Promise(() => {}), 20), /shutdown-timeout/);
});
