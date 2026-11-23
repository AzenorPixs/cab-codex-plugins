import assert from 'node:assert/strict'
import {execFileSync, spawn} from 'node:child_process'
import {once} from 'node:events'
import {mkdtemp, readFile, rm} from 'node:fs/promises'
import {createServer} from 'node:http'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'

const workspace=await mkdtemp(join(tmpdir(),'cab-agent-web-'))
const web=join(workspace,'web')
const frontend=resolve('frontend')
const preview=`<!doctype html><meta charset="utf-8">
<iframe width="1100" height="800" src="/agents"></iframe>
<script>
const frame=document.querySelector('iframe');
const current=()=>frame.contentDocument;
const find=selector=>current().querySelector(selector);
function check(value,label){if(!value)throw Error(label)}
async function wait(read,label){
  for(let i=0;i<240;i++){const value=read();if(value)return value;await new Promise(r=>setTimeout(r,50))}
  const dialog=find('dialog[open]');
  const invalid=Array.from(dialog?.querySelectorAll('input:invalid,select:invalid')??[],field=>field.name).join(',');
  throw Error(label+' ('+frame.contentWindow.location.pathname+', dialogue '+(dialog?.querySelector('h2')?.textContent||'fermé')+', champs invalides '+invalid+', message '+(dialog?.querySelector('[role=alert]')?.textContent||'aucun')+', lignes '+(find('table tbody')?.rows.length??'absentes')+')');
}
const click=async selector=>(await wait(()=>find(selector),selector)).click();
function fill(selector,value){
  const input=find(selector);
  const win=frame.contentWindow;
  Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype,'value').set.call(input,value);
  input.dispatchEvent(new win.Event('input',{bubbles:true}));
}
const rows=title=>Array.from(find('table[aria-label="'+title+'"] tbody')?.rows??[]);
const search=title=>'input[aria-label="Rechercher dans '+title+'"]';
const readRows=title=>rows(title).map(row=>row.textContent);
async function pagination(title,needle){
  await wait(()=>rows(title).length===10,'Dix entrées '+title);
  const pag='nav[aria-label="Pagination '+title+'"]';
  find(pag).querySelectorAll('button')[2].click();
  await wait(()=>rows(title).length===2,'Deux entrées en seconde page '+title);
  fill(search(title),needle);
  await wait(()=>rows(title).length===1&&readRows(title)[0].includes(needle),'Recherche instantanée sur toutes les pages '+title);
  fill(search(title),'');
  await wait(()=>rows(title).length===10,'Retour première page '+title);
}
const confirm=()=>Array.from(find('dialog[open]').querySelectorAll('button')).find(button=>button.textContent==='Supprimer').click();
const providerField=()=>find('dialog[open] .model-policy-provider-picker summary');
const providerOption=name=>Array.from(find('dialog[open] .model-policy-provider-list')?.querySelectorAll('button')??[])
  .find(button=>button.textContent.trim()===name);
const selectedProvider=name=>providerOption(name)?.getAttribute('aria-pressed')==='true';
const send=value=>fetch('/observation',{method:'POST',body:JSON.stringify(value)});
(async()=>{
  await wait(()=>find('[data-agent="codex"]'),'Carte Codex');
  check(!find('table[aria-label="Rappels d’inactivité"]'),'Rappels absents de l’accueil Agents');
  await click('nav[aria-label="Agents"] a[href="/agents/providers"]');
  await pagination('Fournisseurs','Fournisseur 12');
  const supplierSort='table[aria-label="Fournisseurs"] th:first-child button';
  await click(supplierSort);
  await click(supplierSort);
  check(find(supplierSort).parentElement.getAttribute('aria-sort')==='descending'&&readRows('Fournisseurs')[0].includes('Fournisseur 12'),'Tri des fournisseurs');
  await click('button[aria-label="Ajouter un fournisseur"]');
  fill('dialog[open] [name=name]','Fournisseur témoin');
  fill('dialog[open] [name=models_url]','https://example.org/models');
  fill('dialog[open] [name=api_url]','https://example.org/v1');
  find('dialog[open] form').requestSubmit();
  await wait(()=>!find('dialog[open]'),'Fournisseur enregistré');
  fill(search('Fournisseurs'),'fournisseur temoin');
  await wait(()=>rows('Fournisseurs').length===1&&readRows('Fournisseurs')[0].includes('Fournisseur témoin'),'Recherche sans accent');
  await click('nav[aria-label="Agents"] a[href="/agents/models"]');
  await pagination('Modèles','fixture-12');
  check(find('[role=tab][aria-selected=true]').textContent==='Tous','Onglet initial Tous');
  const headers=()=>Array.from(find('table[aria-label="Modèles"] thead tr').cells);
  check(headers()[0].textContent==='Modèles'&&headers()[1].textContent==='Fournisseurs','En-têtes au pluriel');
  check(headers()[1].classList.contains('model-catalog-provider'),'Largeur fournisseur dédiée');
  check(readRows('Modèles')[0].includes('Modèle 2')&&headers()[6].getAttribute('aria-sort')==='ascending','Tri initial par coût d’entrée, gratuit en premier');
  const modelsPagination='nav[aria-label="Pagination Modèles"]';
  const nextModels=()=>Array.from(find(modelsPagination).querySelectorAll('button')).find(button=>button.textContent==='Suivant');
  nextModels().click();
  await wait(()=>rows('Modèles').length===2,'Dernière page du tri de coût');
  check(readRows('Modèles').at(-1).includes('Modèle 12'),'Coût inconnu en dernier');
  Array.from(find(modelsPagination).querySelectorAll('button')).find(button=>button.textContent==='Premier').click();
  check(find('table[aria-label="Modèles"] thead').textContent.includes('Lecture cache / M'),'Colonne lecture du cache');
  check(readRows('Modèles')[0].includes('30m'),'Durée de cache affichée');
  const contextSort='table[aria-label="Modèles"] th:nth-child(3) button';
  await click(contextSort);
  await click(contextSort);
  check(readRows('Modèles')[0].includes('Modèle 12'),'Tri numérique du contexte');
  await click('button[aria-label="Ajouter une politique de modèles"]');
  const addForm=find('dialog[open] form');
  check(addForm.closest('dialog').getBoundingClientRect().width>650,'Overview élargi');
  const pairs=Array.from(addForm.querySelectorAll('.model-policy-pair'));
  check(pairs.length===3&&pairs.every(row=>row.children[1].getBoundingClientRect().left>row.children[0].getBoundingClientRect().left),'Trois paires de champs côte à côte');
  const checkboxLabels=Array.from(addForm.querySelectorAll('.model-policy-types label'));
  check(checkboxLabels.length===2&&checkboxLabels[0].getBoundingClientRect().top===checkboxLabels[1].getBoundingClientRect().top
    &&checkboxLabels[0].getBoundingClientRect().left<checkboxLabels[1].getBoundingClientRect().left,'Free et Payant sur la même ligne');
  const providerFieldset=addForm.querySelector('.model-policy-providers');
  check(providerFieldset.previousElementSibling.classList.contains('model-policy-switches')
    &&providerFieldset.getBoundingClientRect().top>=checkboxLabels[0].getBoundingClientRect().bottom,'Fournisseurs dans un bloc séparé');
  check(providerFieldset.querySelectorAll('input[type=checkbox]').length===0,'Le filtre n’a pas de cases à cocher');
  const dialogStyle=frame.contentWindow.getComputedStyle(addForm.closest('dialog'));
  check(parseFloat(dialogStyle.maxHeight)>frame.contentWindow.innerHeight*0.9,'Overview rehaussé');
  const labelGaps=['name','model_filter','sort_column'].map(name=>frame.contentWindow.getComputedStyle(addForm.elements.namedItem(name).closest('label')).rowGap);
  check(labelGaps.every(gap=>gap===labelGaps[0])&&Array.from(addForm.querySelectorAll('input[type=range]')).every(input=>frame.contentWindow.getComputedStyle(input.closest('label')).rowGap===labelGaps[0]),'Espacement des labels aligné');
  check(providerField().textContent==='Tous les fournisseurs','Aucun choix signifie Tous');
  check(!providerField().parentElement.open,'Liste fermée par défaut');
  providerField().click();
  await wait(()=>providerOption('Fournisseur témoin'),'Fournisseurs provenant de la table');
  check(!selectedProvider('Fournisseur 11'),'Aucun fournisseur sélectionné par défaut');
  providerField().click();
  const sortColumn=addForm.elements.namedItem('sort_column');
  const sortDirection=addForm.elements.namedItem('sort_direction');
  check(sortColumn.value==='input_cost'&&sortColumn.options.length===4&&sortDirection.value==='ascending','Valeurs par défaut du tri');
  sortColumn.value='cache_read_cost';
  sortDirection.value='descending';
  fill('dialog[open] [name=name]','Rapides');
  find('dialog[open] [name=include_free]').click();
  fill('dialog[open] input[type=range]','2');
  fill('dialog[open] [name=cache_read_max]','0.25');
  find('dialog[open] form').requestSubmit();
  await wait(()=>find('[role=tab][aria-selected=true]')?.textContent==='Rapides'&&rows('Modèles').length===10&&!find('dialog[open]'),'Politique créée et appliquée');
  check(headers()[0].textContent==='N°'&&!headers().some(th=>th.querySelector('button')),'Numérotation et absence de tri manuel dans la politique');
  check(readRows('Modèles')[0].startsWith('1Modèle 12'),'Ordre de politique fourni par le serveur');
  nextModels().click();
  await wait(()=>rows('Modèles').length===2,'Seconde page de la politique');
  check(rows('Modèles')[0].cells[0].textContent==='11'&&rows('Modèles')[1].cells[0].textContent==='12','Numérotation continue');
  Array.from(find(modelsPagination).querySelectorAll('button')).find(button=>button.textContent==='Premier').click();
  const paginationBar=find('nav[aria-label="Pagination Modèles"]');
  const policyActions=paginationBar.querySelector('.model-policy-actions');
  const [last,edit,remove]=policyActions.querySelectorAll(':scope > button');
  check(last.textContent==='Dernier'&&edit.getAttribute('aria-label')==='Éditer la politique de modèles','Éditer après Dernier');
  check(remove.getAttribute('aria-label')==='Supprimer la politique de modèles','Supprimer après Éditer');
  check(edit.getBoundingClientRect().left>=last.getBoundingClientRect().right,'Actions à droite de Dernier');
  await click('button[aria-label="Éditer la politique de modèles"]');
  await wait(()=>find('dialog[open] [name=name]')?.value==='Rapides','Politique préremplie');
  const policyForm=find('dialog[open] form');
  check(policyForm.elements.namedItem('sort_column').value==='cache_read_cost'&&policyForm.elements.namedItem('sort_direction').value==='descending','Tri enregistré prérempli');
  check(policyForm.elements[0].name==='name'&&policyForm.elements[1].name==='model_filter','Filtre après le nom');
  const cacheRows=Array.from(policyForm.querySelectorAll('.model-policy-prices')).slice(-2)
    .map(row=>Array.from(row.querySelectorAll('input'),input=>input.name).join(','));
  check(cacheRows.join(';')==='cache_write_min,cache_write_max;cache_read_min,cache_read_max','Écriture puis lecture, minimum puis maximum');
  check(providerField().textContent==='Tous les fournisseurs','Défaut persisté dans l’édition');
  providerField().click();
  providerOption('Fournisseur 11').click();
  providerOption('Fournisseur 12').click();
  await wait(()=>providerField().textContent==='Fournisseur 11, Fournisseur 12','Le champ affiche les deux choix');
  fill('dialog[open] [name=name]','Rapides renommés');
  fill('dialog[open] [name=model_filter]','modèle 12; bêta');
  fill('dialog[open] [name=cache_write_max]','0.5');
  fill('dialog[open] [name=cache_read_min]','0.1');
  find('dialog[open] form').requestSubmit();
  await wait(()=>find('[role=tab][aria-selected=true]')?.textContent==='Rapides renommés'&&!find('dialog[open]'),'Politique éditée');
  await wait(()=>rows('Modèles').length===1&&readRows('Modèles')[0]?.startsWith('1Modèle 11'),'Filtrage par fournisseurs et nom, tri conservé');
  await click('button[aria-label="Éditer la politique de modèles"]');
  providerField().click();
  check(selectedProvider('Fournisseur 11')&&selectedProvider('Fournisseur 12')
    &&!selectedProvider('Fournisseur 10'),'Sélection multiple persistée');
  providerOption('Fournisseur 11').click();
  providerOption('Fournisseur 12').click();
  await wait(()=>providerField().textContent==='Tous les fournisseurs','Retirer le dernier choix affiche Tous');
  find('dialog[open] form').requestSubmit();
  await wait(()=>rows('Modèles').length===10&&!find('dialog[open]'),'Une sélection vide inclut tous les fournisseurs');
  await click('button[aria-label="Supprimer la politique de modèles"]');
  confirm();
  await wait(()=>find('[role=tab][aria-selected=true]')?.textContent==='Tous'&&current().querySelectorAll('[role=tab]').length===1,'Politique supprimée');
  await click('nav[aria-label="Agents"] a[href="/agents/api-keys"]');
  await pagination('Clés API','Clé 12');
  const keySort='table[aria-label="Clés API"] th:nth-child(2) button';
  await click(keySort);
  await click(keySort);
  check(readRows('Clés API')[0].includes('Clé 12'),'Tri numérique des quotas');
  await click('button[aria-label="Ajouter une clé API"]');
  const provider=await wait(()=>find('dialog[open] [name=provider_id] option[value="1"]')?.parentElement,'Fournisseur de la clé');
  provider.value='1';
  fill('dialog[open] input[name=key]','fixture-key');
  check(find('dialog[open] input[name=key]').type==='password','Masquage initial de la clé');
  await click('button[aria-label="Afficher la clé API"]');
  check(find('dialog[open] input[name=key]').type==='text','Affichage de la saisie');
  await click('button[aria-label="Masquer la clé API"]');
  find('dialog[open] form').requestSubmit();
  await wait(()=>!find('dialog[open]'),'Clé enregistrée');
  fill(search('Clés API'),'témoin');
  await wait(()=>rows('Clés API').length===1&&readRows('Clés API')[0].includes('Fournisseur témoin'),'Clé de test affichée');
  await click('button[aria-label="Supprimer une clé API de Fournisseur témoin"]');
  check(find('table[aria-label="Clés API"] tbody').textContent.includes('—'),'Quota inconnu');
  check(!find('table[aria-label="Clés API"]').textContent.includes('fixture-key'),'Clé absente de la liste');
  confirm();
  await wait(()=>!find('table[aria-label="Clés API"] tbody tr')&&!find('dialog[open]'),'Suppression de la clé');
  await click('nav[aria-label="Agents"] a[href="/agents/providers"]');
  await wait(()=>rows('Fournisseurs').length===10,'Retour fournisseurs');
  fill(search('Fournisseurs'),'témoin');
  await click('button[aria-label="Supprimer le fournisseur Fournisseur témoin"]');
  check(find('dialog[open]').textContent.includes('seront retirés du catalogue'),'Confirmation des modèles liés');
  confirm();
  await wait(()=>rows('Fournisseurs').length===0&&!find('dialog[open]'),'Fournisseur supprimé');
  await click('nav[aria-label="Agents"] a[aria-label="Accueil des agents"]');
  await wait(()=>frame.contentWindow.location.pathname==='/agents','Retour sur Agents');
  frame.src='/administration/agents';
  const reminders=await wait(()=>find('table[aria-label="Rappels d’inactivité"]'),'Rappels en administration');
  check(reminders.rows.length===4&&reminders.classList.contains('monitor-table'),'Trois lignes au style Binaires');
  check(find('.agents-grid').compareDocumentPosition(reminders)&4,'Rappels sous les cartes');
  fill('#agent-reminder-seconds','420');
  const form=reminders.closest('form');
  form.requestSubmit();
  await wait(()=>form.textContent.includes('Délais enregistrés.'),'Délais sauvegardés');
  await send({passed:true});
})().catch(error=>send({error:error.message}));
</script>`
let server
try{
  execFileSync(process.execPath,['node_modules/typescript/bin/tsc','--noEmit'],{cwd:frontend,stdio:'inherit'})
  execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build','--logLevel','error','--outDir',web],{cwd:frontend,stdio:'inherit'})
  // Dans l’atelier réseau isolé, seul le serveur de test en loopback doit compter.
  const index=(await readFile(join(web,'index.html'),'utf8')).replace('<head>', `<head><script>
    Object.defineProperty(navigator,'onLine',{get:()=>true});
    addEventListener('offline',event=>event.stopImmediatePropagation(),true);
  </script>`)
  const assets=new Map()
  for(const name of index.match(/\/assets\/[\w-]+\.(?:css|js)/g))assets.set(name,await readFile(web+name))
  let report
  let providers, keys, reminders, policies
  const fixtureRows=Array.from({length:12},(_,index)=>index+1)
  const json=(response,value,status=200)=>response.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(value))
  const body=async request=>{let data='';for await(const part of request)data+=part;return JSON.parse(data)}
  server=createServer(async(request,response)=>{
    const url=new URL(request.url,'http://localhost')
    const route=url.pathname
    const post=request.method==='POST'
    try{
      if(route==='/observation'&&post){report(await body(request));return response.writeHead(204).end()}
      if(route==='/verification')return response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(preview)
      if(route==='/api/v1/health')return json(response,{initialized:true,state:'READY',csrf_token:'fixture'})
      if(route==='/api/v1/interface/preferences')return json(response,{persistent:true,theme:'light',font_scale:100})
      if(route==='/api/v1/administration/configuration')return json(response,{configuration:{},revision:'fixture'})
      const agent={agent:'codex',id:'codex',label:'Codex CLI',state:'available',runtime:{},release:{},mcp_versions:[]}
      if(route==='/api/v1/administration/agent-status'||route==='/api/v1/administration/agents')return json(response,{agents:[agent]})
      if(route==='/api/v1/administration/agent-reminders'){
        if(post)reminders=await body(request)
        return json(response,reminders)
      }
      if(route==='/api/v1/administration/agent-providers'){
        if(!post)return json(response,{providers})
        const values=await body(request)
        assert.deepEqual(values,{name:'Fournisseur témoin',models_url:'https://example.org/models',api_url:'https://example.org/v1'})
        const provider={id:1,...values}
        providers.push(provider)
        return json(response,provider)
      }
      if(route==='/api/v1/administration/agent-providers/remove'){
        assert.deepEqual(await body(request),{id:1})
        providers=providers.filter(provider=>provider.id!==1)
        return json(response,{removed:true})
      }
      if(route==='/api/v1/administration/agent-model-policies'){
        if(!post)return json(response,{policies})
        const values=await body(request)
        assert.equal(values.name,'Rapides')
        assert.equal(values.context_min,500000)
        assert.equal(values.output_min,0)
        assert.equal(values.include_free,false)
        assert.equal(values.include_paid,true)
        assert.equal(values.cache_read_max,'0.25')
        assert.equal(values.model_filter,'')
        assert.equal(values.sort_column,'cache_read_cost')
        assert.equal(values.sort_descending,true)
        assert.equal(values.provider_ids,null)
        const policy={id:21,...values}
        policies=[policy]
        return json(response,policy)
      }
      if(route==='/api/v1/administration/agent-model-policies/edit'){
        const policy=await body(request)
        assert.equal(policy.id,21)
        assert.equal(policy.name,'Rapides renommés')
        assert.equal(policy.model_filter,'modèle 12; bêta')
        assert.equal(policy.cache_write_max,'0.5')
        assert.equal(policy.cache_read_min,'0.1')
        assert.equal(policy.sort_column,'cache_read_cost')
        assert.equal(policy.sort_descending,true)
        assert.deepEqual(policy.provider_ids,policies[0].provider_ids===null?[21,22]:null)
        assert.equal(policy.context_min,500000)
        policies=[policy]
        return json(response,policy)
      }
      if(route==='/api/v1/administration/agent-model-policies/remove'){
        assert.deepEqual(await body(request),{id:21})
        policies=[]
        return json(response,{removed:true})
      }
      if(route==='/api/v1/administration/agent-models'){
        const models=fixtureRows.map(id=>({
          id,identifier:'fixture-'+id,name:'Modèle '+id,provider:'Fournisseur '+id,context:500000+1000*id,output:64000,
          input_cost:id===2?0:id===12?null:0.1,output_cost:0.3,cache_read_cost:0.1+id/100,cache_write_cost:0.3,cache_write_duration:'30m',
        }))
        if(!url.searchParams.has('policy_id'))return json(response,{models})
        const policy=policies[0]
        const results=models.filter(model=>(!policy?.model_filter||model.id!==12)
          &&(policy?.provider_ids==null||policy.provider_ids.includes(model.id+10)))
        return json(response,{models:results.reverse()})
      }
      if(route==='/api/v1/administration/agent-api-keys'){
        if(!post)return json(response,{keys})
        assert.deepEqual(await body(request),{provider_id:1,key:'fixture-key'})
        const key={id:'key-1',provider:providers.find(provider=>provider.id===1).name,day:null,week:null,month:null,credits:null}
        keys.push(key)
        return json(response,key)
      }
      if(route==='/api/v1/administration/agent-api-keys/remove'){
        assert.deepEqual(await body(request),{id:'key-1'})
        keys=keys.filter(key=>key.id!=='key-1')
        return json(response,{removed:true})
      }
      if(route.startsWith('/api/v1/sync/')){
        await new Promise(resolve=>setTimeout(resolve,100))
        if(response.destroyed)return
        return response.writeHead(200,{'Content-Type':'application/json','electric-offset':'0_0',
          'electric-handle':'fixture','electric-cursor':'1','electric-schema':'{}'})
          .end(JSON.stringify([{headers:{control:'up-to-date'}}]))
      }
      if(route.startsWith('/api/v1/'))return json(response,{})
      const asset=assets.get(route)
      if(asset)return response.writeHead(200,{'Content-Type':route.endsWith('.js')?'text/javascript':'text/css'}).end(asset)
      if(route.startsWith('/agents')||route.startsWith('/administration/agents'))return response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(index)
      response.writeHead(404).end()
    }catch(error){report({error:error.message});if(!response.headersSent)response.writeHead(500);response.end()}
  }).listen(0,'127.0.0.1')
  await once(server,'listening')
  for(const [name,binary,args] of [
    ['Chromium','/usr/bin/chromium',['--headless','--no-sandbox','--disable-background-networking','--user-data-dir='+join(workspace,'chromium')]],
    ['Firefox','/usr/bin/firefox',['--headless','--no-remote','--profile',await mkdtemp(join(workspace,'firefox-'))]],
  ]){
    providers=fixtureRows.map(id=>({id:id+10,name:'Fournisseur '+id,models_url:'',api_url:'https://example.org/'+id}))
    keys=fixtureRows.map(id=>({id:'fixture-'+id,provider:'Clé '+id,day:id,week:null,month:null,credits:null}))
    policies=[]
    reminders={seconds:300,second_seconds:1800,last_seconds:14400}
    const observation=new Promise(resolve=>{report=resolve})
    const child=spawn(binary,[...args,'http://127.0.0.1:'+server.address().port+'/verification'],{stdio:'ignore'})
    const closed=once(child,'close')
    const timer=setTimeout(()=>report({error:'Délai dépassé'}),45_000)
    try{
      const result=await Promise.race([observation,closed.then(([code])=>({error:'Arrêt '+code}))])
      assert.equal(result.passed,true,name+' : '+result.error+' (fournisseurs fixture : '+providers.length+')')
      assert.equal(reminders.seconds,420)
      console.log(name+' : pagination, recherche, tri, suppressions et politiques de modèles vérifiés.')
    }finally{clearTimeout(timer);child.kill();await closed}
  }
}finally{
  server?.closeAllConnections()
  server?.close()
  await rm(workspace,{recursive:true,force:true,maxRetries:5,retryDelay:100})
}
