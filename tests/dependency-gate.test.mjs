import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dependencyGate} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-dependency-gate.mjs';

test('pause ciblée et globale attendent la frontière, les autres RUN restent indépendants', async t=>{
  const root=await mkdtemp(join(tmpdir(),'dependency-gate-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const args={stateRoot:root,project:'/fixture-project',run:'run1',mode:'run'};
  const first=await dependencyGate(args);
  const peer=await dependencyGate({...args,run:'run2'});
  const waiting=dependencyGate({...args,run:'',mode:'global'});
  const early=await Promise.race([waiting.then(()=>true),new Promise(resolve=>setTimeout(()=>resolve(false),100))]);
  assert.equal(early,false);
  await first.close();
  await peer.close();
  const global=await waiting;
  await global.close();
});

test('entrée invalide refusée avant création de processus',async()=>{
  await assert.rejects(dependencyGate({stateRoot:'relative',project:'/project',run:'run',mode:'run'}),/input-invalid/);
});

test('la barrière Python et la pause du contrôleur utilisent les mêmes verrous',async t=>{
  const root=await mkdtemp(join(tmpdir(),'dependency-gate-cross-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const project=join(root,'project');await mkdir(project);
  const modulePath=fileURLToPath(new URL('../plugins/cab-approval-bridge/scripts/cab_session_dependencies.py',import.meta.url));
  const source="import importlib.util,sys; p=importlib.util.spec_from_file_location('d',sys.argv[1]); m=importlib.util.module_from_spec(p); p.loader.exec_module(m); s=m.DependencyStore(sys.argv[2]+'/cab-approval-bridge/dependencies'); s.register(sys.argv[3],'sid','run1','direct'); s.set_session_state(sys.argv[3],'sid','run1','active',1); b=s.local_delivery_barrier(sys.argv[3],'sid','run1','turn'); b.__enter__(); print('READY',flush=True); sys.stdin.readline(); b.__exit__(None,None,None); s.close()";
  const child=spawn('python3',['-B','-c',source,modulePath,root,project],{stdio:['pipe','pipe','pipe']});
  t.after(()=>{child.stdin.end();child.kill('SIGTERM');});
  await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>reject(new Error('child exited '+code)));child.stdout.once('data',resolve);});
  const pending=dependencyGate({stateRoot:root,project,run:'run1',mode:'run'});
  const early=await Promise.race([pending.then(()=>true),new Promise(resolve=>setTimeout(()=>resolve(false),100))]);
  assert.equal(early,false);
  child.stdin.end('\n');
  const gate=await pending;
  await gate.close();
});
