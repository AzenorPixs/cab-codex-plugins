import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { readModelCatalog, selectCodingModel, verifyModelPreflight, validCodingModel, reasoningUnavailability } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-policy.mjs';

const now=Date.now(); const date=new Date(now-1000).toISOString();
const catalog=()=>({schema_version:2,evaluated_at:date,published_at:date,selection_status:'selected',selected_mode:'mode1',
 models:Array.from({length:6},(_,i)=>({mode:'mode'+(i+1),priority:i+1,state:'Valide',selected:i===0,
 provider:'provider'+(i+1),model:'Nom commercial '+i,model_id:'model'+(i+1),evaluated_this_run:true,evaluated_at:new Date(now-2000-i).toISOString(),reasoning:'low'}))});
const providers=()=>({connected:Array.from({length:6},(_,i)=>'provider'+(i+1)),all:Array.from({length:6},(_,i)=>({id:'provider'+(i+1),models:{['model'+(i+1)]:{variants:{high:{},xhigh:{},low:{}}}}}))});
const choose=(options={})=>selectCodingModel({catalog:catalog(),providers:providers(),now,...options});

test('PLLM automatique utilise les identifiants API et high au lieu du low du benchmark',()=>{
 const selected=choose(); assert.equal(selected.providerID,'provider1');assert.equal(selected.modelID,'model1');
 assert.equal(selected.reasoning,'high');assert.equal(selected.mode,'mode1');assert.equal(selected.source,'pllm-automatic');
});
test('high absent ou désactivé replie vers xhigh sans changer de politique',()=>{
 const p=providers();p.all[0].models.model1.variants.high.disabled=true;
 assert.equal(choose({providers:p}).reasoning,'xhigh');
 delete p.all[0].models.model1.variants.high;assert.equal(choose({providers:p}).reasoning,'xhigh');
});
test('high et xhigh absents imposent la priorité PLLM suivante',()=>{
 const p=providers();p.all[0].models.model1.variants={low:{}};
 assert.equal(choose({providers:p}).mode,'mode2');
 p.all[1].models.model2.variants={};assert.equal(choose({providers:p}).mode,'mode3');
});
test('un modèle explicite reste prioritaire et bloque sans high ni xhigh',()=>{
 assert.equal(choose({model:'provider4/model4'}).providerID,'provider4');
 const p=providers();p.all[3].models.model4.variants={low:{}};
 assert.throws(()=>choose({model:'provider4/model4',providers:p}),/explicit-model-unavailable/);
 assert.equal(choose({model:'provider4/model4',reasoning:'low',providers:p}).reasoning,'low');
});
test('le raisonnement explicitement demandé reste prioritaire',()=>{
 assert.equal(choose({reasoning:'low'}).reasoning,'low');
 const p=providers();p.all[0].models.model1.variants={high:{}};
 assert.equal(choose({reasoning:'low',providers:p}).mode,'mode2');
});
test('les politiques inférieures seulement historiques ne sont jamais réutilisées',()=>{
 const c=catalog();const p=providers();p.all[0].models.model1.variants={};
 for(const entry of c.models.slice(1))entry.evaluated_this_run=false;
 assert.throws(()=>choose({catalog:c,providers:p}),/pllm-lower-policy-evaluation-required/);
});
test('priorités ambiguës, modèle invalide et faux fournisseur disponible sont refusés',()=>{
 const c=catalog();c.models[1].priority=1;assert.throws(()=>choose({catalog:c}),/pllm-catalog-invalid/);
 const bad=catalog();bad.models[0].state='Invalide';assert.throws(()=>choose({catalog:bad}),/pllm-catalog-invalid/);
 const p=providers();p.connected=[];assert.throws(()=>choose({providers:p}),/model-provider-unavailable/);
});
test('le catalogue public est borné, régulier, sans symlink, et respecte l’alias de configuration',t=>{
 const root=mkdtempSync(join(tmpdir(),'cab-model-policy-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const path=join(root,'pllm-current.json');writeFileSync(path,JSON.stringify(catalog()));
 assert.equal(readModelCatalog({OC_Codex_PLLM_CATALOG:path}).schema_version,2);
 assert.equal(readModelCatalog({OC_CGPT_PLLM_CATALOG:path}).schema_version,2);
 assert.throws(()=>readModelCatalog({OC_Codex_PLLM_CATALOG:'',OC_CGPT_PLLM_CATALOG:path}),/pllm-catalog-unconfigured/);
 const target=join(root,'source.json');writeFileSync(target,'{}');rmSync(path);symlinkSync(target,path);
 assert.throws(()=>readModelCatalog({OC_Codex_PLLM_CATALOG:path}),/pllm-catalog-unavailable/);
 rmSync(path);writeFileSync(path,'x'.repeat(2*1024*1024+1));
 assert.throws(()=>readModelCatalog({OC_Codex_PLLM_CATALOG:path}),/pllm-catalog-unavailable/);
});
test('le prévol exact exige réponse native, variante correspondante et absence d’outil',()=>{
 const selected=choose();const proof={workspace:'/workspace',now,
 session:{id:'ses_probe',directory:'/workspace'},
 parent:{info:{role:'user',id:'msg_user',sessionID:'ses_probe',model:{providerID:selected.providerID,modelID:selected.modelID},variant:'high'}},
 response:{info:{role:'assistant',finish:'stop',id:'msg_response',parentID:'msg_user',sessionID:'ses_probe',providerID:selected.providerID,modelID:selected.modelID,time:{completed:now-10}},parts:[{type:'text',text:'ok'}]}};
 const verified=verifyModelPreflight(selected,proof);assert.equal(validCodingModel(verified),true);
 const low=structuredClone(proof);low.parent.info.variant='low';assert.throws(()=>verifyModelPreflight(selected,low),/model-preflight-not-proved/);
 const tools=structuredClone(proof);tools.response.parts.push({type:'tool'});assert.throws(()=>verifyModelPreflight(selected,tools),/model-preflight-not-proved/);
 const failed=structuredClone(proof);failed.response.info.error={name:'APIError'};assert.throws(()=>verifyModelPreflight(selected,failed),/model-preflight-not-proved/);
 assert.equal(validCodingModel({...verified,privateData:'interdit'}),false);
});


function unavailableProof(reasoning='high',statusCode=400,param='reasoning_effort') {
 return {workspace:'/workspace',now,notBefore:date,session:{id:'ses_probe',directory:'/workspace'},
 parent:{info:{role:'user',id:'msg_user',sessionID:'ses_probe',model:{providerID:'provider1',modelID:'model1'},variant:reasoning}},
 response:{info:{role:'assistant',id:'msg_error',sessionID:'ses_probe',parentID:'msg_user',providerID:'provider1',modelID:'model1',
 time:{completed:now-10},error:{name:'APIError',data:{statusCode,responseBody:JSON.stringify({error:{code:'unsupported_value',param,message:'diagnostic privé fictif'}})}}},parts:[]}};
}
test('une incompatibilité native prouvée permet xhigh puis la politique suivante sans corps brut',()=>{
 const high=reasoningUnavailability(unavailableProof());
 assert.equal(choose({unavailable:[high]}).reasoning,'xhigh');
 const xhigh=reasoningUnavailability(unavailableProof('xhigh'));
 const next=choose({unavailable:[high,xhigh]});assert.equal(next.mode,'mode2');
 assert.equal(JSON.stringify(next).includes('diagnostic privé fictif'),false);
 assert.throws(()=>choose({model:'provider1/model1',unavailable:[high,xhigh]}),/explicit-model-unavailable/);
});
test('authentification, quotas, paramètre étranger et ancien échec ne prouvent pas une incompatibilité',()=>{
 for(const status of [401,403,429,500])assert.throws(()=>reasoningUnavailability(unavailableProof('high',status)),/model-unavailability-not-proved/);
 assert.throws(()=>reasoningUnavailability(unavailableProof('high',400,'temperature')),/model-unavailability-not-proved/);
 const old=unavailableProof();old.response.info.time.completed=now-10000;
 assert.throws(()=>reasoningUnavailability(old),/model-unavailability-not-proved/);
});
