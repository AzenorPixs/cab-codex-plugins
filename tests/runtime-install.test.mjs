import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {activateRuntimeServices,VERSION} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runtime-install.mjs';
import {writeRuntimeJson} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-state-layout.mjs';

async function fixture(t) {
  const home=await mkdtemp(join(tmpdir(),'cab-runtime-install-'));
  t.after(()=>rm(home,{recursive:true,force:true}));
  const pluginRoot=join(home,'package'),transactionId='update-12345678-1234-1234-1234-123456789abc';
  await mkdir(join(pluginRoot,'systemd'),{recursive:true});
  await mkdir(join(home,'.config/systemd/user'),{recursive:true});
  for(const name of ['sgs','ccab']) {
    const unit='cgpt-approval-bridge-'+name+'.service';
    await writeFile(join(pluginRoot,'systemd',unit),'fixture-'+name);
    await writeFile(join(home,'.config/systemd/user',unit),'fixture-'+name);
  }
  const directory=join(home,'.local/state/cab-approval-bridge-update',transactionId);
  writeRuntimeJson(join(directory,'receipt.json'),{id:transactionId,phase:'COMPLETED',version:VERSION});
  return {home,pluginRoot,transactionId,directory};
}

test('CABU auxiliaire : reprise du même reçu sans redémarrer SGS déjà vérifié',async t=>{
  const config=await fixture(t),calls=[],state={sgs:false,ccab:false};
  let fail=true;
  const service=async args=>{
    calls.push(args);
    const component=args[1]?.includes('-sgs.')?'sgs':'ccab';
    if(args[0]==='show')return 'ActiveState='+(state[component]?'active':'inactive')+'\nMainPID='+(state[component]?(component==='sgs'?101:102):0)+'\n';
    if(['start','restart'].includes(args[0])) {
      if(component==='ccab'&&fail)throw new Error('fixture-interrupted');
      state[component]=true;
    }
    return '';
  };
  const request=async component=>{
    if(!state[component])throw new Error('fixture-not-ready');
    return {component,status:'READY',version:VERSION,pid:component==='sgs'?101:102};
  };
  await assert.rejects(activateRuntimeServices(config,{service,request}),/runtime-activation-service-failed/);
  assert.equal(JSON.parse(await readFile(join(config.directory,'runtime-services.json'))).phase,'RECOVERY_REQUIRED');
  fail=false;
  const receipt=await activateRuntimeServices(config,{service,request});
  assert.equal(receipt.phase,'COMPLETED');
  assert.equal(receipt.transactionId,config.transactionId);
  assert.equal(calls.filter(args=>['start','restart'].includes(args[0])&&args[1].includes('-sgs.')).length,1);
  assert.equal(receipt.components.ccab.pid,102);
});

test('CABU auxiliaire : aucune action système si une unité installée diverge',async t=>{
  const config=await fixture(t);
  await writeFile(join(config.home,'.config/systemd/user/cgpt-approval-bridge-ccab.service'),'divergent');
  await assert.rejects(activateRuntimeServices(config,{service:async()=>assert.fail('service appelé avant validation')}),/runtime-activation-unit-divergent/);
});

test('CABU direct : aligner uniquement le moniteur actif puis conserver son PID vérifié',async t=>{
  const config=await fixture(t),workspace=join(config.home,'project');
  const key=createHash('sha256').update(workspace).digest('hex'),unit='cgpt-approval-bridge-monitor-direct@'+key+'.service';
  for(const directory of [join(config.pluginRoot,'systemd'),join(config.home,'.config/systemd/user')])
    await writeFile(join(directory,'cgpt-approval-bridge-monitor-direct@.service'),'fixture-direct-template');
  writeRuntimeJson(join(config.home,'.local/state/cab-approval-bridge-direct',key,'monitor.json'),{workspace,unit,url:'http://127.0.0.1:12345'});
  let updated=false,restarts=0;
  const service=async args=>{
    if(args[0]==='restart'){assert.equal(args[1],unit);updated=true;restarts++;}
    return 'ActiveState=active\nMainPID='+(args[1]?.includes('monitor-direct@')?103:args[1]?.includes('-sgs.')?101:102)+'\n';
  };
  const request=async component=>({component,status:'READY',version:VERSION,pid:component==='sgs'?101:102});
  const monitorIdentity=async()=>({version:updated?VERSION:'1.0.0',pid:103,identity:{workspace,mode:'direct'}});
  const first=await activateRuntimeServices(config,{service,request,monitorIdentity});
  assert.equal(first.directMonitors[key].phase,'VERIFIED');
  await activateRuntimeServices(config,{service,request,monitorIdentity});
  assert.equal(restarts,1);
});
