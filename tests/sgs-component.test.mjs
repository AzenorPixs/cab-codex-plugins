import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {statisticsComponent,MonitorState,monitorConfiguration,VERSION} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-data.mjs';

async function fixture(t,version=VERSION){
  const directory=await mkdtemp(join(tmpdir(),'cab-sgs-component-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  for(const name of ['cab_sgs.py','cgpt-approval-bridge-sgs.py'])await writeFile(join(directory,name),`VERSION = "${version}"\n`,{mode:0o644});
  return directory;
}

test('statistics component executes only the fixed VERSION probe',async t=>{
  const directory=await fixture(t);let calls=0;
  const state=await statisticsComponent({directory,execute:async(command,args,options)=>{
    calls++;assert.equal(command,'python3');assert.deepEqual(args,['-B',join(directory,'cgpt-approval-bridge-sgs.py'),'VERSION']);
    assert.equal(options.timeout,1500);assert.equal(options.maxBuffer,4096);
    return {stdout:JSON.stringify({version:VERSION,engine_format:'cab-sgs-1'})};
  }});
  assert.equal(calls,1);assert.deepEqual(state,{state:'AVAILABLE',available:true,version:VERSION,reason:null});
  assert.equal(JSON.stringify(state).includes(directory),false);
});

test('statistics component checks the real distributed Python engine without generating files',async()=>{
  const result=await statisticsComponent();assert.equal(result.state,'AVAILABLE');assert.equal(result.version,VERSION);
});

test('statistics component distinguishes divergent versions before any execution',async t=>{
  const directory=await fixture(t,'2.2.0');
  const result=await statisticsComponent({directory,execute:async()=>assert.fail('divergent engine executed')});
  assert.equal(result.state,'VERSION_MISMATCH');assert.equal(result.version,'2.2.0');
});

test('statistics component safely reports missing Python, timeout and bad response',async t=>{
  const directory=await fixture(t);
  for(const execute of [async()=>{throw Object.assign(new Error('PRIVATE_PATH'),{code:'ENOENT'});},
    async()=>{throw Object.assign(new Error('PRIVATE_PATH'),{killed:true});},async()=>({stdout:'not-json PRIVATE_PATH'})]){
    const result=await statisticsComponent({directory,execute});assert.equal(result.state,'UNAVAILABLE');
    assert.equal(JSON.stringify(result).includes('PRIVATE'),false);
  }
});

test('statistics component rejects absent files and symlink without following it',async t=>{
  const directory=await fixture(t),path=join(directory,'cab_sgs.py');await rm(path);
  assert.equal((await statisticsComponent({directory})).state,'UNAVAILABLE');
  await symlink(join(directory,'cgpt-approval-bridge-sgs.py'),path);
  assert.equal((await statisticsComponent({directory})).state,'UNAVAILABLE');
});

test('statistics status is cached briefly and refreshed without a generation job',async t=>{
  const directory=await fixture(t);let now=10000,calls=0;
  const config=monitorConfiguration({OC_Codex_WORKSPACE:directory,OC_Codex_MONITOR_STATE_DIR:directory});
  const state=new MonitorState(config,{now:()=>now,statisticsProbe:async()=>{
    calls++;return {state:'AVAILABLE',available:true,version:VERSION,reason:null};
  }});
  await state.collectStatistics();await state.collectStatistics();assert.equal(calls,1);
  const view=state.snapshot();assert.equal(view.componentVersions.statistics,VERSION);
  assert.equal(view.statisticsEngine.state,'AVAILABLE');assert.equal(view.sources.statistics.stale,false);
  now+=5000;await state.collectStatistics();assert.equal(calls,2);
});
