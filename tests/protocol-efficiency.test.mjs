import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EfficiencyLedger, differentialMandate } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-efficiency.mjs';

test('usage : messages dédupliqués, zéros natifs, couverture partielle et reprise sans double compte',t=>{
  const root=mkdtempSync(join(tmpdir(),'cab-efficiency-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const path=join(root,'usage.json'),ledger=new EfficiencyLedger(path),run={runId:'run',contextId:1};
  const message=(id,usage)=>({info:{id,sessionID:'ses_fixture',role:'assistant',providerID:'fixture',modelID:'synthetic',...usage}});
  const first=message('msg_first',{usageSource:'opencode-v2',tokens:{input:8,output:5,cache:{read:4,write:0}},cost:0});
  const absent=message('msg_missing',{});
  assert.equal(ledger.observe(run,'ses_fixture',[first,absent]),true);
  assert.equal(ledger.observe(run,'ses_fixture',[first,absent]),true);
  const view=ledger.view(run);assert.equal(view.messageCount,2);
  assert.deepEqual(view.metrics.input,{observed:8,available:1,expected:2,complete:false,reason:'partial-native-coverage'});
  assert.equal(view.metrics.cacheWrite.observed,0);assert.equal(view.metrics.costUsd.observed,0);
  assert.equal(view.metrics.nativeTotal.observed,null);assert.equal(view.billingSavings.observed,null);
  const restored=new EfficiencyLedger(path);
  // A compacted transcript cannot erase already observed native usage.
  assert.equal(restored.observe(run,'ses_fixture',[first]),true);
  assert.deepEqual(restored.view(run),view);
  assert.equal(restored.view({...run,contextId:2}).messageCount,0);
  assert.equal(restored.view({...run,runId:'peer'}).messageCount,0);
  const completed=message('msg_missing',{usageSource:'opencode-v2',tokens:{input:0,output:0,cache:{read:0,write:0}},cost:0});
  restored.observe(run,'ses_fixture',[completed]);
  assert.equal(restored.view(run).metrics.input.observed,8);
  assert.equal(restored.view(run).metrics.input.complete,true);
  assert.equal(restored.view(run).metrics.reasoning.complete,false);
});

test('usage : source privée étrangère et métriques invalides restent indisponibles, sans effet métier',t=>{
  const root=mkdtempSync(join(tmpdir(),'cab-usage-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const run={runId:'run',contextId:1};
  for(const info of [
    {id:'msg',sessionID:'ses_other',role:'assistant'},
    {id:'msg',sessionID:'ses_fixture',role:'assistant',usageSource:'opencode-v2',tokens:{input:-1}},
  ]) {
    const ledger=new EfficiencyLedger(join(root,'unused.json'));
    assert.equal(ledger.observe(run,'ses_fixture',[{info}]),false);
    assert.equal(ledger.view(run).metrics.input.observed,null);
    assert.equal(ledger.view(run).error,'native-efficiency-observation-unavailable');
  }
});

test('mandat différentiel : le checkpoint ne remplace ni permissions, périmètre, ni critères',()=>{
  const input={checkpointId:'checkpoint',checkpointDigest:'a'.repeat(64),objective:'Corriger la cible validée',
    permissions:['modifier file:src/cible'],scope:['file:src/cible'],criteria:['test métier réussi'],
    changes:['révision 4'],evidence:['preuve-4']};
  const result=differentialMandate(input);
  assert.deepEqual(result.permissions,input.permissions);assert.deepEqual(result.criteria,input.criteria);
  input.permissions.push('nouveau');assert.equal(result.permissions.length,1);
  assert.throws(()=>differentialMandate({...input,permissions:[]}),/invalid/);
  assert.throws(()=>differentialMandate({...input,checkpointDigest:'unknown'}),/invalid/);
});
