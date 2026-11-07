import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,access} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {finalizeDirect} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-direct.mjs';

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

test('Direct : rapport conservé, SGS acquitté avant nettoyage, atelier pair intact',async t=>{
  const value=await fixture(t);let purged=false;
  const options={request:async()=>({sessions:[{run:value.run,session:value.session,mode:'direct',cab_direct:true,ended_at:'2026-11-07T00:00:00Z'}]}),
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
