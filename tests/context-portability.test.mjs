import assert from 'node:assert/strict';
import test from 'node:test';
import {validatePortabilityRules,projectPortableContext,createContextPortabilityPlugin} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-context-portability.mjs';

const configuration=()=>({schemaVersion:1,expectedPid:process.pid,rules:[{sessionId:'ses_old',providerID:'fixture',modelID:'same',connectionId:'cred_B',staleMessageIds:['msg_old']}]});
const event=()=>({sessionID:'ses_old',model:{providerID:'fixture',id:'same',variant:'medium'},messages:[
  {id:'msg_user',role:'user',content:[{type:'text',text:'checkpoint',providerMetadata:{user:'preserved'}}]},
  {id:'msg_old',role:'assistant',content:[{type:'reasoning',text:'old reasoning',providerMetadata:{opaque:'old'}},
    {type:'text',text:'known write',providerMetadata:{itemId:'old'}},
    {type:'tool-call',id:'call_keep',name:'write',input:{path:'one'},providerMetadata:{itemId:'old-call'}},
    {type:'tool-result',id:'call_keep',output:'done',providerMetadata:{itemId:'old-result'}}]},
  {id:'msg_new',role:'assistant',content:[{type:'reasoning',text:'new',providerMetadata:{opaque:'new'}}]}
]});
const freeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);for(const item of Object.values(value))freeze(item)}return value};

test('projection : seules anciennes parties assistant projetées, historique et contrats conservés',()=>{
  const e=event(),old=structuredClone(e.messages);freeze(e.messages);assert.equal(projectPortableContext(e,configuration().rules[0]),true);
  assert.deepEqual(e.messages[0],old[0]);assert.deepEqual(e.messages[2],old[2]);
  assert.deepEqual(e.messages[1].content,[{type:'text',text:'known write'},{type:'tool-call',id:'call_keep',name:'write',input:{path:'one'}},{type:'tool-result',id:'call_keep',output:'done'}]);
  assert.deepEqual(old,event().messages);
});

test('projection : session/fournisseur/modèle étrangers strictement inchangés',()=>{
  for(const field of ['sessionID','providerID','id']){const e=event();if(field==='sessionID')e[field]='foreign';else e.model[field]='foreign';const original=e.messages;
    assert.equal(projectPortableContext(e,configuration().rules[0]),false);assert.equal(e.messages,original);}
});

test('règles : doublons et listes excessives refusés, entrée copiée sans champ secret',()=>{
  for(const edit of [c=>c.expectedPid=0,c=>c.rules.push(c.rules[0]),c=>c.rules[0].staleMessageIds.push('msg_old'),c=>c.rules[0].staleMessageIds=[],c=>c.rules[0].connectionId='bad\n']){
    const c=configuration();edit(c);assert.throws(()=>validatePortabilityRules(c),/cab-context-/);}
  const input=configuration();input.rules[0].unrecognized='ignored';const c=validatePortabilityRules(input);input.rules[0].staleMessageIds.push('msg_later');
  assert.deepEqual(c.rules[0].staleMessageIds,['msg_old']);assert.equal(c.rules[0].unrecognized,undefined);
});

test('plugin : connexion cible vérifiée sans résolution du secret, autre session sans lecture',async()=>{
  const hooks=new Map();let reads=0,connection='cred_B';const plugin=createContextPortabilityPlugin(configuration());
  const dispose=await plugin.setup({session:{hook:async(kind,cb)=>{hooks.set(kind,cb);return{dispose:async()=>hooks.delete(kind)}}},integration:{connection:{active:async()=>{reads++;return{type:'credential',id:connection}}}}});
  assert.deepEqual([...hooks.keys()],['context','generate','compaction']);
  const foreign=event();foreign.sessionID='other';await hooks.get('context')(foreign);assert.equal(reads,0);
  const e=event();await hooks.get('context')(e);assert.equal(e.messages[1].content.length,3);
  connection='cred_C';const refused=event(),before=structuredClone(refused);await assert.rejects(hooks.get('context')(refused),/cab-context-connection-changed/);assert.deepEqual(refused,before);
  await dispose();assert.equal(hooks.size,0);
});

test('plugin : processus différent refusé, inscription partielle nettoyée',async()=>{
  const config=configuration();config.expectedPid++;await assert.rejects(createContextPortabilityPlugin(config).setup({}),/cab-context-process-changed/);
  let disposed=0,calls=0;await assert.rejects(createContextPortabilityPlugin(configuration()).setup({session:{hook:async()=>{if(++calls===2)throw Error('fixture');return{dispose:async()=>disposed++}}}}),/fixture/);assert.equal(disposed,1);
});
