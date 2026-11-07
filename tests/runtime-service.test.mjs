import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,readFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runtimeRequest,emitStatistics,flushStatistics} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runtime-client.mjs';
import {openCodeTelemetry} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-native-telemetry.mjs';
import {StatisticsBackend} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics-backend.mjs';
import {SessionStatistics} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs';
import {access} from 'node:fs/promises';

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
