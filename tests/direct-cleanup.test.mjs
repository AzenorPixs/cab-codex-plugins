import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,access} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {finalizeDirect,freezeDirect} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-direct.mjs';
import {purgeStatistics} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs-cleanup.mjs';

async function fixture(t) {
  const home=await mkdtemp(join(tmpdir(),'cab-direct-close-'));
  t.after(()=>rm(home,{recursive:true,force:true}));
  const project=join(home,'project'),change='fixture-change',run='fixture-run',session='fixture-session';
  const report=join(project,'openspec/changes/archive/2026-11-07-'+change,'STATISTICS.md');
  await mkdir(join(project,'.cab-tests',change,run),{recursive:true});
  await mkdir(join(project,'.cab-tests',change,'peer-run'),{recursive:true});
  await mkdir(join(report,'..'),{recursive:true});await writeFile(report,'# Rapport synthétique\n');
  await writeFile(join(project,'.cab-tests',change,run,'trial.txt'),'own trial');
  return {home,project,change,run,session,branch:'TERMINÉ',receiptId:'erasure-direct-fixture'};
}

test('Direct : clôture active refusée avant toute purge ou suppression',async t=>{
  const value=await fixture(t);
  await assert.rejects(finalizeDirect(value,{request:async()=>({sessions:[{run:value.run,session:value.session,mode:'direct',cab_direct:true,ended_at:null}]}),
    statisticsCleanup:{purge:()=>assert.fail('purge active')}}),/statistical-window-open/);
  await access(join(value.project,'.cab-tests',value.change,value.run,'trial.txt'));
});

test('Direct : gel refusé si une notification est incertaine ou si la liaison a changé',async t=>{
  const value=await fixture(t),binding='fixture-binding';let reads=0,closed=false;
  const row={binding,run:value.run,session:value.session,started_at:'2026-11-07T00:00:00Z'};
  const options={request:async(_component,route)=>{
    if(route.startsWith('/stats?')){reads++;return {sessions:[reads===2?{...row,started_at:'2026-11-08T00:00:00Z'}:row]};}
    closed=true;return {status:'closed'};
  },dependencyGate:async()=>({close:async()=>{}}),dependencyCloseCheck:async()=>{}};
  await assert.rejects(freezeDirect({project:value.project,binding,home:value.home},options),/binding-changed/);
  assert.equal(closed,false);reads=0;
  options.request=async(_component,route)=>route.startsWith('/stats?')?{sessions:[row]}:(closed=true,{status:'closed'});
  options.dependencyCloseCheck=async()=>{throw new Error('dependency-delivery-unresolved');};
  await assert.rejects(freezeDirect({project:value.project,binding,home:value.home},options),/dependency-delivery-unresolved/);
  assert.equal(closed,false);
});

test('Direct : avis natif incertain empêche toute purge et préserve les pairs',async t=>{
  const value=await fixture(t);
  const options={request:async()=>({sessions:[{run:value.run,session:value.session,mode:'direct',cab_direct:true,ended_at:'2026-11-07T00:00:00Z'}]}),
    dependencyClose:async()=>({status:'absent'}),
    dependencyCloseCheck:async()=>{throw new Error('dependency-delivery-unresolved');},
    statisticsCleanup:{purge:()=>assert.fail('purge after uncertain notification')}};
  await assert.rejects(finalizeDirect(value,options),/dependency-delivery-unresolved/);
  await access(join(value.project,'.cab-tests',value.change,value.run,'trial.txt'));
  await access(join(value.project,'.cab-tests',value.change,'peer-run'));
});

test('Direct : rapport conservé, SGS acquitté avant nettoyage, atelier pair intact',async t=>{
  const value=await fixture(t);let purged=false;
  const options={request:async()=>({sessions:[{run:value.run,session:value.session,mode:'direct',cab_direct:true,ended_at:'2026-11-07T00:00:00Z'}]}),
    dependencyClose:async()=>({status:'absent'}),
    statisticsCleanup:{purge:async()=>{purged=true;return {status:'PURGED'};},verify:async()=>assert.equal(purged,true)}};
  const result=await finalizeDirect(value,options);
  assert.equal(result.status,'DIRECT_CLEANUP_VERIFIED');
  await assert.rejects(access(join(value.project,'.cab-tests',value.change,value.run)));
  await access(join(value.project,'.cab-tests',value.change,'peer-run'));
  await access(join(value.project,'openspec/changes/archive/2026-11-07-'+value.change,'STATISTICS.md'));
  // Une reprise après purge SGS conserve exactement le même scope et le reçu.
  options.request=async()=>({sessions:[]});
  const resumed=await finalizeDirect(value,options);
  assert.deepEqual(resumed.scope,result.scope);
  assert.equal(resumed.archive.archiveId,result.archive.archiveId);
});

test('Direct : fermeture de coordination indisponible reste incomplète',async t=>{
  const value=await fixture(t);
  const options={request:async()=>({sessions:[{run:value.run,session:value.session,mode:'direct',cab_direct:true,ended_at:'2026-11-07T00:00:00Z'}]}),
    dependencyClose:async()=>({status:'unavailable',reason:'direct-dependency-closure-unavailable'}),
    statisticsCleanup:{purge:async()=>({status:'PURGED'}),verify:async()=>{}}};
  const result=await finalizeDirect(value,options);
  assert.equal(result.status,'DIRECT_CLEANUP_INCOMPLETE');
  assert.equal(result.dependencies.status,'unavailable');
  await access(join(value.project,'.cab-tests',value.change,'peer-run'));
});

test('Direct : preuve nécessaire au pair empêche de déclarer le nettoyage complet',async t=>{
  const value=await fixture(t);
  const options={request:async()=>({sessions:[{run:value.run,session:value.session,mode:'direct',cab_direct:true,ended_at:'2026-11-07T00:00:00Z'}]}),
    dependencyClose:async()=>({status:'retained-for-peers',retained:true,peer_references:1}),
    statisticsCleanup:{purge:async()=>({status:'PURGED'}),verify:async()=>{}}};
  const result=await finalizeDirect(value,options);
  assert.equal(result.status,'DIRECT_CLEANUP_INCOMPLETE');
  assert.equal(result.dependencies.peer_references,1);
  await access(join(value.project,'.cab-tests',value.change,'peer-run'));
});

test('Direct : historique piloté conservé et pair actif du même RUN protégé',async t=>{
  const value=await fixture(t);let purged=false;
  const own={run:value.run,session:value.session,mode:'direct',cab_direct:true,ended_at:'2026-11-07T00:00:00Z'};
  const peer={run:value.run,session:'old-pilot',mode:'piloted',ended_at:null};
  const options={request:async()=>({sessions:[own,peer]}),statisticsCleanup:{purge:async(scope)=>{
    assert.equal(scope.closureAuthority,'direct-session-v1');assert.deepEqual(scope.ids,[value.session]);purged=true;return {status:'PURGED'};
  },verify:async()=>assert.equal(purged,true)}};
  await assert.rejects(finalizeDirect(value,options),/direct-closure-active-peer/);
  await access(join(value.project,'.cab-tests',value.change,value.run,'trial.txt'));
  peer.ended_at='2026-11-07T00:00:00Z';
  await assert.rejects(finalizeDirect(value,options),/direct-closure-pilot-authority-required/);
  assert.equal(purged,false);
  await access(join(value.project,'.cab-tests',value.change,'peer-run'));
});

test('Direct : outbox cible conservée et purge interdite tant que non drainée',async t=>{
  const value=await fixture(t),directory=join(value.home,'.local/state/cab-approval-bridge/sgs-outbox');
  await mkdir(directory,{recursive:true,mode:0o700});
  const path=join(directory,'a'.repeat(64)+'.json');
  await writeFile(path,JSON.stringify({binding:'target-binding',project:value.project}),{mode:0o600});
  const scope={workspace:value.project,changeId:value.change,runIds:[value.run],ids:[value.session],sessionId:value.session,bindingId:'target-binding',closureAuthority:'direct-session-v1'};
  let called=false;
  const request=async(_component,route)=>{if(route==='/purge/preview')return {bindings:['target-binding'],components:[]};called=true;};
  await assert.rejects(purgeStatistics(scope,'TERMINÉ','fixture-receipt',{home:value.home,request}),/sgs-direct-outbox-pending/);
  assert.equal(called,false);await access(path);
});
