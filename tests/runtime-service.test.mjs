import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,mkdir,readFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runtimeRequest,emitStatistics,flushStatistics} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runtime-client.mjs';
import {openCodeTelemetry} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-native-telemetry.mjs';
import {StatisticsBackend} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics-backend.mjs';
import {SessionStatistics} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs';
import {access} from 'node:fs/promises';
import {purgeStatistics,verifyStatisticsAbsence} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs-cleanup.mjs';

test('SGS Unix réel : outbox acquittée, déduplication et arrêt propre sans OpenCode',async t=>{
  const home=await mkdtemp(join(tmpdir(),'cab-service-fixture-'));
  let child;
  t.after(async()=>{if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve));}await rm(home,{recursive:true,force:true});});
  const event={binding:'fixture-binding',event_id:'fixture-event',source:'cab-component',stream:'fixture-stream',sequence:1,
    at:'2026-11-06T10:00:00Z',semantics:'delta',metrics:{commands:'1'}};
  assert.equal((await emitStatistics(event,{home})).status,'queued');
  const directory=join(home,'.local/state/cab-approval-bridge/sgs');
  await mkdir(directory,{recursive:true,mode:0o700});
  child=spawn('python3',['-B',fileURLToPath(new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runtime-service.py',import.meta.url)),
    'sgs','--state-directory',directory,'--no-external-collectors'],{stdio:['ignore','pipe','pipe']});
  let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk;});
  let ready=false;
  for(let attempt=0;attempt<60;attempt++){
    try{const result=await runtimeRequest('sgs','/status',undefined,{home,timeout:300});ready=result.status==='READY';if(ready)break;}catch{}
    if(child.exitCode!==null)throw new Error('fixture-service-exit: '+stderr);
    await new Promise(resolve=>setTimeout(resolve,25));
  }
  assert.equal(ready,true,stderr);
  await runtimeRequest('sgs','/bindings',{binding:'fixture-binding',host:'fixture',instance:'fixture',project:home,change:'change',run:'run',session:'session',role:'coder',agent:'codex',mode:'direct',started_at:'2026-11-06T10:00:00Z'},{home});
  assert.equal((await flushStatistics({home})).acknowledged,1);
  assert.deepEqual(await readdir(join(home,'.local/state/cab-approval-bridge/sgs-outbox')),[]);
  assert.equal((await runtimeRequest('sgs','/events',event,{home})).status,'duplicate');
  const stats=await runtimeRequest('sgs','/stats?project='+encodeURIComponent(home),undefined,{home});
  assert.equal(stats.sessions[0].metrics.commands,'1');
  assert.equal(stats.sessions[0].coverage.tokens_input,'unavailable');
  const other=join(home,'other-project');await mkdir(other);
  const binding={host:'fixture',instance:'fixture',change:'change',role:'coder',agent:'codex',mode:'direct',started_at:'2026-11-06T10:00:00Z',cab_direct:true};
  await runtimeRequest('sgs','/bindings',{...binding,binding:'direct-one',project:home,run:'direct-run',session:'direct-session'},{home});
  await runtimeRequest('sgs','/bindings',{...binding,binding:'direct-other',project:other,run:'other-run',session:'other-session'},{home});
  await runtimeRequest('sgs','/bindings/close',{binding:'direct-one',ended_at:'2026-11-06T11:00:00Z'},{home});
  const direct=await runtimeRequest('sgs','/direct-sessions?project='+encodeURIComponent(home),undefined,{home});
  assert.equal(direct.truncated,false);assert.equal(direct.sessions.length,1);
  assert.equal(direct.sessions[0].session,'direct-session');assert.equal(Date.parse(direct.sessions[0].ended_at),Date.parse('2026-11-06T11:00:00Z'));
  assert.equal(Object.hasOwn(direct.sessions[0],'metrics'),false);
  const legacy=join(home,'legacy-controller');await mkdir(legacy,{mode:0o700});
  const before=new SessionStatistics(legacy,{project:home,intervalMs:0});
  before.registry({project:home,runs:[{runId:'runtime-fixture',contextId:1,changeId:'change',sessionId:'ses_fixture',state:'RESERVED',version:1}],referenceVersion:0,integrationOwner:null});
  await before.flush();await before.close();
  const migrated=new SessionStatistics(legacy,{project:home,intervalMs:0,backend:new StatisticsBackend(home,'controller-statistics',{home,legacyPath:join(legacy,'controller-statistics.json')})});
  assert.equal(migrated.error,null);await migrated.flush();
  assert.equal(migrated.error,null);await assert.rejects(access(join(legacy,'controller-statistics.json')));
  const checkpoint=await runtimeRequest('sgs','/component/checkpoint?'+new URLSearchParams({project:home,component:'controller-statistics'}),undefined,{home});
  assert.equal(Object.keys(checkpoint.data.contexts).length,1);
  await migrated.close();
  const reportDir=join(home,'openspec/changes/archive/2026-11-06-change');await mkdir(reportDir,{recursive:true});
  const snapshot=await runtimeRequest('sgs','/stats?project='+encodeURIComponent(home),undefined,{home});
  const script="import sys,json;from pathlib import Path;sys.path.insert(0,sys.argv[1]);import cab_sgs;e={'schema_version':1,'session_id':'fixture-report','scope':'cumulative','contribution':cab_sgs.blank(),'native_telemetry':{'format':'cab-native-sgs-1','sessions':json.load(sys.stdin)['sessions']}};cab_sgs.change_report(Path(sys.argv[2]),'openspec/changes/archive/2026-11-06-change',json.dumps(e).encode(),'archived')";
  const generated=spawnSync('python3',['-B','-c',script,fileURLToPath(new URL('../plugins/cab-approval-bridge/scripts',import.meta.url)),home],{input:JSON.stringify(snapshot),encoding:'utf8'});
  assert.equal(generated.status,0,generated.stderr);
  const beforePurge=await runtimeRequest('sgs','/component/checkpoint?'+new URLSearchParams({project:home,component:'controller-statistics'}),undefined,{home});
  const scope={workspace:home,changeId:'change',runIds:['direct-run'],ids:['direct-session'],sessionId:'direct-session',bindingId:'direct-one',closureAuthority:'direct-session-v1'};
  const result=await purgeStatistics(scope,'TERMINÉ','direct-real-receipt',{home});assert.equal(result.bindingsRemoved,1);
  await verifyStatisticsAbsence(scope,{home});
  const left=await runtimeRequest('sgs','/stats?project='+encodeURIComponent(home),undefined,{home});
  assert.deepEqual(left.sessions.map(row=>row.binding),['fixture-binding']);
  const unchanged=await runtimeRequest('sgs','/component/checkpoint?'+new URLSearchParams({project:home,component:'controller-statistics'}),undefined,{home});
  assert.deepEqual(unchanged,beforePurge);
  assert.equal((await purgeStatistics(scope,'TERMINÉ','direct-real-receipt',{home})).status,'PURGED');
  await assert.rejects(runtimeRequest('sgs','/events',{...event,event_id:'unsafe',prompt:'not-allowed'},{home}),/sgs-event-invalid/);
});

test('OpenCode : totaux natifs et cache distincts, aucun contenu projeté',()=>{
  const event=openCodeTelemetry({id:'msg_fixture',role:'assistant',usageSource:'opencode-v2',modelID:'model',providerID:'provider',
    tokens:{input:100,output:20,reasoning:5,total:120,cache:{read:80,write:0}},cost:0.1,text:'not-exported',reasoningEffort:'high'},
  {binding:'fixture',sequence:1,at:'2026-11-06T10:00:00Z'});
  assert.equal(event.metrics.tokens_total,'120');
  assert.equal(event.metrics.tokens_cache_read,'80');
  assert.equal(event.model.reasoning,'high');
  assert.equal(JSON.stringify(event).includes('not-exported'),false);
});
