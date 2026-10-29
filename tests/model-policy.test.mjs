import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { readModelCatalog, prepareControllerModelPolicy, selectCodingModel, verifyModelPreflight, validCodingModel, reasoningUnavailability } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-policy.mjs';

const now=Date.now(); const date=new Date(now-1000).toISOString();
const catalog=()=>({schema_version:2,evaluated_at:date,published_at:date,selection_status:'selected',selected_mode:'mode1',
 models:Array.from({length:6},(_,i)=>({mode:'mode'+(i+1),priority:i+1,state:'Valide',selected:i===0,
 provider:'provider'+(i+1),model:'Nom commercial '+i,model_id:'model'+(i+1),evaluated_this_run:true,evaluated_at:new Date(now-2000-i).toISOString(),reasoning:'low'}))});
const providers=()=>({connected:Array.from({length:6},(_,i)=>'provider'+(i+1)),all:Array.from({length:6},(_,i)=>({id:'provider'+(i+1),models:{['model'+(i+1)]:{variants:{medium:{},high:{},xhigh:{},low:{}}}}}))});
const choose=(options={})=>selectCodingModel({catalog:catalog(),providers:providers(),now,...options});

test('PLLM automatique choisit medium même lorsque le modèle expose high et xhigh',()=>{
 const selected=choose(); assert.equal(selected.providerID,'provider1');assert.equal(selected.modelID,'model1');
 assert.equal(selected.reasoning,'medium');assert.equal(selected.mode,'mode1');assert.equal(selected.source,'pllm-automatic');
});
test('medium absent ou désactivé choisit high sur la même candidate',()=>{
 const p=providers();p.all[0].models.model1.variants.medium.disabled=true;
 assert.equal(choose({providers:p}).mode,'mode1');assert.equal(choose({providers:p}).reasoning,'high');
 delete p.all[0].models.model1.variants.medium;assert.equal(choose({providers:p}).reasoning,'high');
 p.all[0].models.model1.variants.high.disabled=true;assert.equal(choose({providers:p}).mode,'mode2');
});
test('medium absent impose la priorité PLLM suivante',()=>{
 const p=providers();p.all[0].models.model1.variants={low:{}};
 assert.equal(choose({providers:p}).mode,'mode2');
 p.all[1].models.model2.variants={};assert.equal(choose({providers:p}).mode,'mode3');
});
test('un modèle explicite reste prioritaire et bloque sans medium',()=>{
 assert.equal(choose({model:'provider4/model4'}).providerID,'provider4');
 const p=providers();p.all[3].models.model4.variants={low:{}};
 assert.throws(()=>choose({model:'provider4/model4',providers:p}),/explicit-model-unavailable/);
 assert.equal(choose({model:'provider4/model4',reasoning:'low',providers:p}).reasoning,'low');
});
test('le raisonnement explicitement demandé reste prioritaire',()=>{
 assert.equal(choose({reasoning:'low'}).reasoning,'low');
 const p=providers();p.all[0].models.model1.variants={medium:{}};
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
  parent:{info:{role:'user',id:'msg_user',sessionID:'ses_probe',model:{providerID:selected.providerID,modelID:selected.modelID},variant:'medium'}},
 response:{info:{role:'assistant',finish:'stop',id:'msg_response',parentID:'msg_user',sessionID:'ses_probe',providerID:selected.providerID,modelID:selected.modelID,time:{completed:now-10}},parts:[{type:'text',text:'ok'}]}};
 const verified=verifyModelPreflight(selected,proof);assert.equal(validCodingModel(verified),true);
 const low=structuredClone(proof);low.parent.info.variant='low';assert.throws(()=>verifyModelPreflight(selected,low),/model-preflight-not-proved/);
 const tools=structuredClone(proof);tools.response.parts.push({type:'tool'});assert.throws(()=>verifyModelPreflight(selected,tools),/model-preflight-not-proved/);
 const failed=structuredClone(proof);failed.response.info.error={name:'APIError'};assert.throws(()=>verifyModelPreflight(selected,failed),/model-preflight-not-proved/);
 assert.equal(validCodingModel({...verified,privateData:'interdit'}),false);
});


function unavailableProof(reasoning='medium',statusCode=400,param='reasoning_effort') {
 return {workspace:'/workspace',now,notBefore:date,session:{id:'ses_probe',directory:'/workspace'},
 parent:{info:{role:'user',id:'msg_user',sessionID:'ses_probe',model:{providerID:'provider1',modelID:'model1'},variant:reasoning}},
 response:{info:{role:'assistant',id:'msg_error',sessionID:'ses_probe',parentID:'msg_user',providerID:'provider1',modelID:'model1',
 time:{completed:now-10},error:{name:'APIError',data:{statusCode,responseBody:JSON.stringify({error:{code:'unsupported_value',param,message:'diagnostic privé fictif'}})}}},parts:[]}};
}
test('une incompatibilité native prouvée de medium permet high avant la politique suivante sans corps brut',()=>{
 const medium=reasoningUnavailability(unavailableProof());
 const next=choose({unavailable:[medium]});assert.equal(next.mode,'mode1');assert.equal(next.reasoning,'high');
 assert.equal(JSON.stringify(next).includes('diagnostic privé fictif'),false);
 assert.equal(choose({model:'provider1/model1',unavailable:[medium]}).reasoning,'high');
 assert.throws(()=>choose({model:'provider1/model1',reasoning:'medium',unavailable:[medium]}),/explicit-model-unavailable/);
});
test('authentification, quotas, paramètre étranger et ancien échec ne prouvent pas une incompatibilité',()=>{
 for(const status of [401,403,429,500])assert.throws(()=>reasoningUnavailability(unavailableProof('medium',status)),/model-unavailability-not-proved/);
 assert.throws(()=>reasoningUnavailability(unavailableProof('medium',400,'temperature')),/model-unavailability-not-proved/);
 const old=unavailableProof();old.response.info.time.completed=now-10000;
 assert.throws(()=>reasoningUnavailability(old),/model-unavailability-not-proved/);
});


test('préparation du catalogue actif : patch non secret, options explicites conservées et CLI sans effet',t=>{
 const root=mkdtempSync(join(tmpdir(),'cab-prepared-policy-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 mkdirSync(join(root,'data'));const path=join(root,'data/pllm-current.json');writeFileSync(path,JSON.stringify(catalog()));
 const environment={CAB_PRIVATE_TEST_VALUE:'NE_PAS_EXPORTER',OC_Codex_WORKSPACE:'/fixture'};const before=structuredClone(environment);
 const prepared=prepareControllerModelPolicy({environment,activeSkillRoot:root,now});
 assert.deepEqual(environment,before);assert.equal(prepared.catalogPath,path);assert.equal(prepared.source,'active-skill');
 assert.deepEqual(prepared.environment,{OC_Codex_PLLM_CATALOG:path});assert.ok(!JSON.stringify(prepared).includes('NE_PAS_EXPORTER'));
 const explicit=prepareControllerModelPolicy({environment:{OC_Codex_PLLM_CATALOG:path},activeSkillRoot:'/missing',now});assert.equal(explicit.source,'configured');
 assert.equal(prepareControllerModelPolicy({environment:{OC_CGPT_PLLM_CATALOG:path},activeSkillRoot:'/missing',now}).source,'legacy-alias');
 const result=spawnSync(process.execPath,[new URL('../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prepare-model-policy.mjs',import.meta.url).pathname,'--pllm-skill-root',root],{encoding:'utf8',env:{PATH:process.env.PATH,CAB_PRIVATE_TEST_VALUE:'NE_PAS_EXPORTER'}});
 assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),prepared);assert.ok(!result.stdout.includes('NE_PAS_EXPORTER'));
 assert.deepEqual(readModelCatalog(prepared.environment),catalog());
});

test('préparation : absence, configuration explicite vide, JSON ou schéma invalide et lien refusés',t=>{
 const root=mkdtempSync(join(tmpdir(),'cab-prepared-refusal-'));t.after(()=>rmSync(root,{recursive:true,force:true}));mkdirSync(join(root,'data'));
 const path=join(root,'data/pllm-current.json');
 assert.throws(()=>prepareControllerModelPolicy({activeSkillRoot:root,now}),/pllm-catalog-unavailable/);
 writeFileSync(path,JSON.stringify(catalog()));
 assert.throws(()=>prepareControllerModelPolicy({environment:{OC_Codex_PLLM_CATALOG:'',OC_CGPT_PLLM_CATALOG:path},activeSkillRoot:root,now}),/pllm-catalog-unconfigured/);
 writeFileSync(path,'not-json');assert.throws(()=>prepareControllerModelPolicy({activeSkillRoot:root,now}),/pllm-catalog-unavailable/);
 writeFileSync(path,JSON.stringify({...catalog(),schema_version:1}));assert.throws(()=>prepareControllerModelPolicy({activeSkillRoot:root,now}),/pllm-catalog-invalid/);
 rmSync(path);writeFileSync(join(root,'source.json'),JSON.stringify(catalog()));symlinkSync(join(root,'source.json'),path);
 assert.throws(()=>prepareControllerModelPolicy({activeSkillRoot:root,now}),/pllm-catalog-unavailable/);
});

function goFixtures(){const c=catalog(),p=providers();c.models[0].provider='opencodego';p.all[0].id='opencode-go';p.connected[0]='opencode-go';return {c,p};}
test('alias Go connu : identité native connectée, traçabilité logique, modèle et digest conservés',()=>{
 const {c,p}=goFixtures();const selected=choose({catalog:c,providers:p});
 assert.equal(selected.providerID,'opencode-go');assert.equal(selected.logicalProviderID,'opencodego');assert.equal(selected.modelID,'model1');assert.equal(selected.mode,'mode1');
 const exact=structuredClone(p);exact.all[0].id='opencodego';exact.connected[0]='opencodego';
 assert.equal(choose({catalog:c,providers:exact}).providerID,'opencodego');
 const nativeCatalog=structuredClone(c);nativeCatalog.models[0].provider='opencode-go';
 assert.equal(choose({catalog:nativeCatalog,providers:p}).providerID,'opencode-go');
 const duplicateExact=structuredClone(exact);duplicateExact.all.push(structuredClone(exact.all[0]));
 assert.throws(()=>choose({catalog:c,providers:duplicateExact}),/model-provider-ambiguous/);
 assert.equal(choose({catalog:c,providers:exact}).catalogDigest,selected.catalogDigest);
 assert.throws(()=>choose({model:'opencodego/model1',providers:p}),/explicit-model-unavailable/);
});
test('alias ambigu, inconnu, déconnecté ou modèle absent : aucun compte ou modèle de substitution',()=>{
 const {c,p}=goFixtures();const duplicate=structuredClone(p);duplicate.all.push(structuredClone(p.all[0]));assert.throws(()=>choose({catalog:c,providers:duplicate}),/model-provider-ambiguous/);
 const disconnected=structuredClone(p);disconnected.connected=disconnected.connected.slice(1);assert.throws(()=>choose({catalog:c,providers:disconnected}),/model-provider-unavailable/);
 const exact=structuredClone(p);exact.all.push({id:'opencodego',models:p.all[0].models});assert.throws(()=>choose({catalog:c,providers:exact}),/model-provider-unavailable/);
 const missing=structuredClone(p);missing.all[0].models={another:{variants:{medium:{}}}};assert.throws(()=>choose({catalog:c,providers:missing}),/model-capabilities-unavailable/);
 const unknown=structuredClone(c);unknown.models[0].provider='opencode_go';assert.throws(()=>choose({catalog:unknown,providers:p}),/model-provider-unavailable/);
});

function nativeProof(selected){return {workspace:'/workspace',now,session:{id:'ses_probe',directory:'/workspace'},
 parent:{info:{role:'user',id:'msg_user',sessionID:'ses_probe',model:{providerID:selected.providerID,modelID:selected.modelID,variant:selected.reasoning}}},
 response:{info:{role:'assistant',finish:'stop',id:'msg_response',parentID:'msg_user',sessionID:'ses_probe',providerID:selected.providerID,modelID:selected.modelID,variant:selected.reasoning,time:{completed:now-10}},parts:[{type:'text',text:'probe ok'}]}};}
test('prévol natif imbriqué et historique : lecture cohérente et anciens contrats préservés',()=>{
 const {c,p}=goFixtures();const selected=choose({catalog:c,providers:p});const native=nativeProof(selected);
 const verified=verifyModelPreflight(selected,native);assert.ok(validCodingModel(verified));assert.equal(verified.logicalProviderID,'opencodego');
 const legacy=structuredClone(native);legacy.parent.info.variant='medium';delete legacy.parent.info.model.variant;delete legacy.response.info.variant;
 const prior={...selected};delete prior.logicalProviderID;assert.ok(validCodingModel(verifyModelPreflight(prior,legacy)));
 const both=structuredClone(native);both.parent.info.variant='medium';assert.ok(validCodingModel(verifyModelPreflight(selected,both)));
});
test('prévol natif : contradictions, champs invalides, absence parent, troncature et preuves non corrélées refusés',()=>{
 const selected=choose();const mutations=[
  p=>p.parent.info.variant='low',p=>p.response.info.variant='low',p=>p.parent.info.model.variant=null,
  p=>delete p.parent.info.model.variant,p=>p.response.info.finish='length',p=>p.response.info.error={name:'APIError'},
  p=>p.response.parts.push({type:'tool'}),p=>p.response.info.sessionID='ses_other',p=>p.parent.info.id='msg_other',
  p=>p.session.directory='/other',p=>p.response.info.modelID='other',p=>p.response.info.providerID='other',
  p=>p.response.info.time.completed=now+1,p=>p.response.info.time.completed=now-100000,
 ];
 for(const change of mutations){const p=nativeProof(selected);change(p);assert.throws(()=>verifyModelPreflight(selected,p),/model-preflight-not-proved/);}
});
test('indisponibilité native imbriquée de medium et refus des variantes contradictoires',()=>{
 const {c,p}=goFixtures();const input=unavailableProof();input.parent.info.model={providerID:'opencode-go',modelID:'model1',variant:'medium'};delete input.parent.info.variant;
 input.response.info.providerID='opencode-go';input.response.info.variant='medium';const medium=reasoningUnavailability(input);
 assert.equal(choose({catalog:c,providers:p,unavailable:[medium]}).reasoning,'high');
 for(const change of [q=>q.parent.info.variant='low',q=>q.response.info.variant='low',q=>delete q.parent.info.model.variant]){
  const q=structuredClone(input);change(q);assert.throws(()=>reasoningUnavailability(q),/model-unavailability-not-proved/);
 }
});


function catalog3() {
 const c=catalog();c.schema_version=3;c.models.push({...c.models[5],mode:'mode7',priority:7,provider:'provider7',model_id:'model7',selected:false});return c;
}
function providers7() {
 const p=providers();p.connected.push('provider7');p.all.push({id:'provider7',models:{model7:{variants:{medium:{}}}}});return p;
}
test('formats stricts 2/6 et 3/7 : préparation sans mutation et sélection de mode7',t=>{
 const root=mkdtempSync(join(tmpdir(),'cab-catalog3-'));t.after(()=>rmSync(root,{recursive:true,force:true}));mkdirSync(join(root,'data'));
 const path=join(root,'data/pllm-current.json');
 for(const c of [catalog(),catalog3()]) {
  const source=JSON.stringify(c);writeFileSync(path,source);
  assert.equal(prepareControllerModelPolicy({activeSkillRoot:root,now}).catalogPath,path);
  assert.deepEqual(readModelCatalog({OC_Codex_PLLM_CATALOG:path}),c);
  assert.equal(choose({catalog:c,providers:providers7()}).mode,'mode1');
 }
 const c=catalog3(),p=providers7();for(const row of p.all.slice(0,6))for(const model of Object.values(row.models))model.variants={low:{}};
 const selected=choose({catalog:c,providers:p});assert.equal(selected.mode,'mode7');assert.equal(selected.priority,7);assert.equal(selected.reasoning,'medium');
 const verified=verifyModelPreflight(selected,nativeProof(selected));assert.equal(validCodingModel(verified),true);assert.equal(validCodingModel({...verified,priority:8,mode:'mode8'}),false);
});
test('schémas et cardinalités incohérents, priorités dupliquées et modes ambigus restent refusés',()=>{
 for(const c of [{...catalog(),schema_version:3}, {...catalog3(),schema_version:2}, {...catalog3(),schema_version:4}, {...catalog(),schema_version:'2'}, {...catalog3(),schema_version:null}])
  assert.throws(()=>choose({catalog:c,providers:providers7()}),/pllm-catalog-invalid/);
 for(const change of [c=>c.models[6].priority=6,c=>c.models[6].mode='mode6',c=>c.models[6].priority=8,c=>c.models[6].priority=0]){
  const c=catalog3();change(c);assert.throws(()=>choose({catalog:c,providers:providers7()}),/pllm-catalog-invalid/);
 }
});
test('format 3/7 : dates, sélection unique et preuve courante restent exigées',()=>{
 for(const change of [c=>c.published_at=new Date(now+1000).toISOString(),c=>c.evaluated_at='invalid',c=>c.models[1].selected=true,c=>c.models[0].evaluated_this_run=false,c=>c.models[0].state='Invalide']){
  const c=catalog3();change(c);assert.throws(()=>choose({catalog:c,providers:providers7()}),/pllm-catalog-invalid/);
 }
 const c=catalog3();c.models[0].evaluated_this_run=false;c.models[0].selected=false;c.models[6].selected=true;c.selected_mode='mode7';
 assert.equal(choose({catalog:c,providers:providers7()}).mode,'mode2');
});
