import assert from 'node:assert/strict';
import test from 'node:test';
import { createModelTransition, modelContractHash, validModelTransitionState } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-transition.mjs';
import { verifyModelPreflight } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-policy.mjs';
function fixture({ historical=false }={}) {
 let clock=Date.parse('2026-10-30T10:00:00Z');const evaluatedAt=new Date(clock-60000).toISOString();
 const selection=(provider='old',model='old-model',reasoning='medium',automatic=false)=>({protocol:'pllm-auto-v1',source:automatic?'pllm-automatic':'prompt',providerID:provider,modelID:model,reasoning,
  mode:automatic?'mode2':null,priority:automatic?2:null,catalogDigest:automatic?'a'.repeat(64):null,evaluatedAt:automatic?evaluatedAt:null,selectedAt:new Date(clock).toISOString()});
 const old={...selection(),preflight:{sessionId:'ses_old_probe',messageId:'msg_old_probe',verifiedAt:new Date(clock-60000).toISOString()}};
 let job={jobId:'job-a',sessionId:'ses_a',directory:'/workspace',criteria:['preserve'],lastProvenMilestone:'known-write-unpublished',armed:true,lifecycle:{preserved:true},...(historical?{}:{codingModel:old})};
 let disk=structuredClone(job);const state={run:{runId:'run-a',state:'RESERVED',version:7,contextId:3,suspension:{action:'PAUSE'}},native:{providerID:'old',modelID:'old-model',variant:'medium'},busy:{},permissions:[],connection:null,calls:0,resolveCalls:[],failNative:null,failFinal:false,afterResolve:null};
 const make=()=>createModelTransition({getJob:()=>job,setJob:v=>job=v,now:()=>new Date(clock).toISOString(),
  persist:async value=>{if(state.failFinal&&value.codingModel?.providerID==='new'&&!value.modelTransition){state.failFinal=false;throw Error('synthetic storage failure')}disk=structuredClone(value)},
  assertBoundary:async()=>state.run,
  client:{session:async()=>({id:'ses_a',directory:'/workspace',model:structuredClone(state.native)}),activeSessions:async()=>state.busy,permissions:async()=>state.permissions,
    switchModel:async(id,model)=>{assert.equal(id,'ses_a');state.calls++;if(state.failNative==='before')throw Error('synthetic');state.native={providerID:model.providerID,modelID:model.modelID,variant:model.reasoning};if(state.failNative==='after')throw Error('synthetic')}},
  observeConnection:async()=>structuredClone(state.connection),
  resolveSelection:async input=>{state.resolveCalls.push(structuredClone(input));const answer=input.model?selection(...input.model.split('/'),input.reasoning||'medium'):selection('new','new-model','medium',true);state.afterResolve?.();return answer},
  proveSelection:async(candidate,proof,notBefore)=>{
    const completed=proof?.messageId==='msg_stale'?clock-60000:clock;const sid=proof?.sessionId;
    return verifyModelPreflight(candidate,{workspace:'/workspace',now:clock,notBefore,
      session:{id:sid,directory:'/workspace',model:{providerID:candidate.providerID,modelID:candidate.modelID,variant:candidate.reasoning}},
      parent:{info:{id:'msg_user',sessionID:sid,role:'user',model:{providerID:candidate.providerID,modelID:candidate.modelID,variant:candidate.reasoning},time:{created:completed}}},
      response:{info:{id:proof?.messageId,sessionID:sid,parentID:'msg_user',role:'assistant',providerID:candidate.providerID,modelID:candidate.modelID,variant:candidate.reasoning,finish:'stop',time:{completed}},parts:[{type:'text',text:'ok'}]}});
  }});
 let api=make();
 const base={transactionId:'tx-a',developerAuthorization:'human-ref',jobId:'job-a',sessionId:'ses_a',runVersion:7};
 const prepare=(extra={})=>api.handle({...base,phase:'prepare',expectedModelHash:modelContractHash(job.codingModel),...extra});
 const commit=(extra={})=>{clock+=10;return api.handle({...base,phase:'commit',preflight:{sessionId:'ses_probe',messageId:'msg_probe'},...extra})};
 return {state,base,old,prepare,commit,call:p=>api.handle({...base,...p}),job:()=>job,disk:()=>disk,restart:()=>{job=structuredClone(disk);api=make()},advance:ms=>clock+=ms};
}

test('transition historique : sans choix la PLLM est résolue, même job/session/jalons conservés',async()=>{
 const h=fixture({historical:true});await h.prepare();assert.deepEqual(h.state.resolveCalls,[{}]);assert.equal(h.job().modelTransition.before,null);
 await h.commit();assert.equal(h.job().codingModel.source,'pllm-automatic');assert.equal(h.job().codingModel.mode,'mode2');assert.equal(h.state.calls,1);
 assert.equal(h.job().jobId,'job-a');assert.equal(h.job().sessionId,'ses_a');assert.equal(h.job().lastProvenMilestone,'known-write-unpublished');assert.equal(h.job().armed,true);
 assert.equal(h.job().modelTransitionHistory[0].before,null);assert.equal(h.state.run.suspension.action,'PAUSE');assert.ok(validModelTransitionState(h.disk()));
});

test('transition explicite : autre fournisseur/modèle/raisonnement sans contrainte de l’ancienne politique',async()=>{
 const h=fixture();await h.prepare({selection:{model:'new/new-model',reasoning:'low'}});await h.commit();
 assert.deepEqual(h.state.resolveCalls,[{model:'new/new-model',reasoning:'low'},{model:'new/new-model',reasoning:'low'}]);
 assert.equal(h.job().codingModel.reasoning,'low');assert.equal(h.job().codingModel.source,'prompt');assert.equal(h.job().codingModel.catalogDigest,null);
 assert.deepEqual(h.job().modelTransitionHistory[0].before,h.old);assert.ok(validModelTransitionState(h.job()));
 const calls=h.state.calls;await h.call({phase:'commit'});assert.equal(h.state.calls,calls);
});

test('transition : versions, choix courant, pause et activité empêchent toute préparation',async t=>{
 for(const scenario of ['pause','version','hash','busy','permission'])await t.test(scenario,async()=>{
  const h=fixture();let extra={};if(scenario==='pause')h.state.run.suspension=null;if(scenario==='version')extra.runVersion=6;
  if(scenario==='hash')extra.expectedModelHash='0'.repeat(64);if(scenario==='busy')h.state.busy={ses_a:{type:'busy'}};
  if(scenario==='permission')h.state.permissions=[{id:'permission'}];
  await assert.rejects(h.prepare(extra));assert.equal(h.job().modelTransition,undefined);assert.equal(h.state.calls,0);
 });
});

test('transition : prévol ancien, session métier et sélection divergente refusés sans mutation',async()=>{
 const h=fixture();await h.prepare();await assert.rejects(h.commit({preflight:{sessionId:'ses_probe',messageId:'msg_stale'}}),{code:'model-preflight-not-proved'});
 await assert.rejects(h.commit({preflight:{sessionId:'ses_a',messageId:'msg_probe'}}),{code:'model-transition-preflight-reused'});
 h.state.afterResolve=()=>h.state.run.version++;
 await assert.rejects(h.commit(),{code:'model-transition-context-divergent'});assert.equal(h.state.calls,0);assert.deepEqual(h.job().codingModel,h.old);
});

test('transition : annulation sans effet, identité non réutilisable et ancien choix conservé',async()=>{
 const h=fixture();const p=await h.prepare();assert.equal((await h.prepare()).transition.preparedAt,p.transition.preparedAt);
 assert.equal((await h.call({phase:'cancel'})).status,'cancelled');assert.deepEqual(h.job().codingModel,h.old);
 assert.equal(h.job().modelTransitionHistory[0].outcome,'cancelled');await assert.rejects(h.prepare(),{code:'model-transition-identity-reused'});assert.equal(h.state.calls,0);
});

test('transition : effet natif incertain puis reprise observée, sans deuxième changement natif',async()=>{
 const h=fixture();await h.prepare();h.state.failNative='after';await assert.rejects(h.commit(),{code:'model-transition-native-unconfirmed'});
 assert.equal(h.disk().modelTransition.phase,'NATIVE_UNCONFIRMED');assert.ok(validModelTransitionState(h.disk()));
 await assert.rejects(h.prepare(),{code:'model-transition-reconcile-required'});h.restart();
 await assert.rejects(h.call({phase:'cancel'}),{code:'model-transition-effect-possible'});
 const result=await h.call({phase:'reconcile'});assert.equal(result.status,'completed');assert.equal(h.state.calls,1);assert.equal(h.job().modelTransitionHistory[0].reconciled,true);
});

test('transition : échec avant effet exige un retry explicitement autorisé',async()=>{
 const h=fixture();await h.prepare();h.state.failNative='before';await assert.rejects(h.commit());
 await assert.rejects(h.call({phase:'reconcile'}),{code:'model-transition-native-unconfirmed'});
 await assert.rejects(h.call({phase:'commit'}),{code:'model-transition-reconcile-required'});assert.equal(h.state.calls,1);
 await assert.rejects(h.call({phase:'retry'}),{code:'model-transition-reconcile-required'});
 h.state.failNative=null;await h.call({phase:'retry',retryAuthorization:'fresh-retry-ref'});assert.equal(h.state.calls,2);
 assert.deepEqual(h.job().modelTransitionHistory[0].retryAuthorizations,['fresh-retry-ref']);
});

test('transition : persistance finale échouée reste non terminale et se réconcilie',async()=>{
 const h=fixture();await h.prepare();h.state.failFinal=true;await assert.rejects(h.commit(),{code:'model-transition-native-unconfirmed'});
 assert.deepEqual(h.job().codingModel,h.old);assert.equal(h.disk().modelTransition.phase,'NATIVE_UNCONFIRMED');h.restart();
 await h.call({phase:'reconcile'});assert.equal(h.job().codingModel.providerID,'new');assert.equal(h.state.calls,1);
});

test('transition : données de restauration corrompues refusées',async()=>{
 const h=fixture();await h.prepare();const bad=structuredClone(h.job());bad.modelTransition.expectedModelHash='0'.repeat(64);
 assert.equal(validModelTransitionState(bad),false);bad.modelTransition=null;bad.modelTransitionHistory=[{outcome:'invented'}];assert.equal(validModelTransitionState(bad),false);
});

test('transition historique : absence native de modèle conservée comme absence, puis choix explicite',async()=>{
 const h=fixture({historical:true});h.state.native=null;await h.prepare({selection:{model:'new/new-model'}});await h.commit();
 assert.equal(h.job().modelTransitionHistory[0].before,null);assert.equal(h.job().codingModel.providerID,'new');
});

test('transition : champs hors phase et sélection nulle refusés sans préparation',async()=>{
 const h=fixture();await assert.rejects(h.prepare({selection:null}),{code:'model-transition-input-invalid'});
 await h.prepare();await assert.rejects(h.call({phase:'commit',selection:{model:'new/other'}}),{code:'model-transition-input-invalid'});assert.equal(h.state.calls,0);
});

test('transition : changement de connexion fournisseur détecté avant effet et préparation annulable',async()=>{
 const h=fixture();h.state.connection={providerID:'new',integrationID:'new',credentialId:'credential1',serverPid:42,type:'credential',method:'key'};
 await h.prepare();h.state.connection.credentialId='credential2';await assert.rejects(h.commit(),{code:'model-transition-provider-changed'});assert.equal(h.state.calls,0);
 assert.equal((await h.call({phase:'cancel'})).status,'cancelled');assert.deepEqual(h.job().codingModel,h.old);
});
