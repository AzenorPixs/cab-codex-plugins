import test from 'node:test';
import assert from 'node:assert/strict';
import {simpleCleanup,cleanupInspector,sgsCleanupAdapter,ccabCleanupAdapter,archiveCleanupAdapter} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-simple-cleanup.mjs';

const scope={project:'/fixture',runIds:['closed-run']};
test('inventaire simple : retrouve une session directe close et refuse une liaison active',async()=>{
 const session={binding:'codex-binding',project:'/fixture',change:'change-direct',run:'closed-run',mode:'direct',cab_direct:true,ended_at:'2026-11-08T10:00:00Z'};
 let active=[];const inspector=cleanupInspector({getRuns:async()=>({project:'/fixture',runs:[]}),
  getStatistics:async()=>({sessions:active,archives:[{change:'change-direct',native_telemetry:[{snapshot:{sessions:[session]}}]}]})});
 assert.deepEqual(await inspector.inspect(scope),[{runId:'closed-run',state:'RELEASED',generation:'codex-binding'}]);
 assert.equal(await inspector.changeForRun('/fixture','closed-run'),'change-direct');
 active=[{run:'closed-run'}];assert.equal((await inspector.inspect(scope))[0].state,'RESERVED');
});
test('nettoyage simple : poursuite indépendante et reprise de même identité',async()=>{
 let unavailable=true;const calls=[];
 const deps={inspect:async()=>[{runId:'closed-run',state:'ABANDONED',generation:1}],components:{
  controller:async(_s,o)=>{calls.push(o.operationId);return {status:'REMOVED'}},broker:async()=>({status:'ABSENT'}),supervisor:async()=>({status:'ABSENT'}),monitor:async()=>({status:'ABSENT'}),
  sgs:async(_s,o)=>{calls.push(o.operationId);if(unavailable)throw Object.assign(new Error('offline'),{code:'sgs-unavailable'});return {status:'REMOVED'}},
  ccab:async(_s,o)=>{calls.push(o.operationId);return {status:'ABSENT'}},archives:async()=>({status:'ABSENT'})}};
 const first=await simpleCleanup(scope,deps);assert.equal(first.status,'PARTIAL');assert.equal(first.components.find(x=>x.component==='sgs').status,'PENDING');assert.equal(first.components.find(x=>x.component==='ccab').status,'ABSENT');
 unavailable=false;const second=await simpleCleanup(scope,deps);assert.equal(second.status,'COMPLETE');assert.deepEqual(calls.slice(0,3),calls.slice(3));
});
test('nettoyage simple : refus avant tout effet si RUN actif ou inconnu',async()=>{
 let called=false;const components={sgs:async()=>{called=true;return {status:'REMOVED'}}};
 for(const states of [[{runId:'closed-run',state:'RESERVED'}],[]])
  await assert.rejects(simpleCleanup(scope,{inspect:async()=>states,components}),/cleanup-target-active-or-unknown/);
 assert.equal(called,false);
});
test('nettoyage simple : une nouvelle génération ne réutilise pas le reçu antérieur',async()=>{
 let generation=1;const ids=[];
 const deps={inspect:async()=>[{runId:'closed-run',state:'DELIVERED',generation}],components:{sgs:async(_s,o)=>{ids.push(o.operationId);return {status:'REMOVED'}}}};
 await simpleCleanup(scope,deps);generation=2;await simpleCleanup(scope,deps);assert.notEqual(ids[0],ids[1]);
});
test('nettoyage simple : une brique absente ne vaut pas nettoyage complet',async()=>{
 const result=await simpleCleanup(scope,{inspect:async()=>[{runId:'closed-run',state:'DELIVERED',generation:1}],components:{sgs:async()=>({status:'ABSENT'})}});
 assert.equal(result.status,'PARTIAL');assert.equal(result.components.find(row=>row.component==='broker').code,'cleanup-adapter-unavailable');
});
test('nettoyage simple : panne réseau locale ne bloque pas une autre brique',async()=>{
 let reached=false;const result=await simpleCleanup(scope,{inspect:async()=>[{runId:'closed-run',state:'DELIVERED',generation:1}],components:{
  broker:async()=>{throw Object.assign(new Error('offline'),{code:'ECONNREFUSED'})},
  sgs:async()=>{reached=true;return {status:'REMOVED'}}}});
 assert.equal(result.components.find(row=>row.component==='broker').code,'cleanup-component-unavailable');assert.equal(reached,true);
});
test('adaptateur SGS : refuse un RUN piloté nécessitant sa propre voie',async()=>{
 const calls=[];const adapter=sgsCleanupAdapter({changeForRun:async()=> 'fixture-change',
  postController:async(...args)=>{calls.push(args);return {status:'CHANGE_REPORT_FORGOTTEN'}}});
 await assert.rejects(adapter(scope,{generations:[{runId:'closed-run',generation:2}]}),/cleanup-piloted-run-requires-separate-cleanup/);assert.deepEqual(calls,[]);
});
test('adaptateur SGS : session directe sans contexte contrôleur',async()=>{
 let body;const adapter=sgsCleanupAdapter({changeForRun:async()=> 'fixture-change',postController:async(_project,_path,value)=>{body=value;return {status:'ALREADY_ABSENT'}}});
 assert.equal((await adapter(scope,{generations:[{runId:'closed-run',generation:'codex-binding-identity'}]})).status,'ABSENT');assert.equal(body.bindingId,'codex-binding-identity');
});
test('adaptateur CCAB : purge uniquement les entrées résolues de la cible',async()=>{
 const calls=[];const adapter=ccabCleanupAdapter({request:async(component,path,body)=>{
  if(path==='/incidents')return {incidents:[{project:'/fixture',run:'closed-run',state:'RESOLVED',incident_id:'target'},
    {project:'/fixture',run:'peer-run',state:'RESOLVED',incident_id:'peer'},{project:'/other',run:'closed-run',state:'RESOLVED',incident_id:'foreign'}]};
  calls.push(body.incident_id);return {status:'PURGED_TREATED',incident_id:body.incident_id};
 }});
 assert.equal((await adapter(scope)).status,'REMOVED');assert.deepEqual(calls,['target']);
});
test('adaptateur archives : refuse une copie partagée et retire une copie ciblée',async()=>{
 let records=[{archiveId:'target',fingerprint:'fingerprint',runIds:['closed-run','peer-run']}],removed=[];
 const adapter=archiveCleanupAdapter({repository:{list:()=>records,remove:(id)=>{removed.push(id);return {state:'DONE'}}},
  withTargetLease:async(_project,_runs,_generations,fn)=>fn(),activeRunIds:async()=>[]});
 await assert.rejects(adapter(scope,{generations:[]}),/cleanup-archive-shared/);assert.deepEqual(removed,[]);
 records=[{archiveId:'target',fingerprint:'fingerprint',runIds:['closed-run']}];
 assert.equal((await adapter(scope,{generations:[{runId:'closed-run',generation:1}]})).status,'REMOVED');assert.deepEqual(removed,['target']);
});
