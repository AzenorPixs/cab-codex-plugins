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
const send=value=>fetch('/observation',{method:'POST',body:JSON.stringify(value)});
(async()=>{
  await wait(()=>find('[data-agent="codex"]'),'Carte Codex');
  check(!find('table[aria-label="Rappels d’inactivité"]'),'Rappels absents de l’accueil Agents');
  await click('nav[aria-label="Agents"] a[href="/agents/providers"]');
  await click('button[aria-label="Ajouter un fournisseur"]');
  fill('dialog[open] [name=name]','Fournisseur témoin');
  fill('dialog[open] [name=models_url]','https://example.org/models');
  fill('dialog[open] [name=api_url]','https://example.org/v1');
  find('dialog[open] form').requestSubmit();
  await wait(()=>find('table[aria-label="Fournisseurs"] tbody td')?.textContent==='Fournisseur témoin'&&!find('dialog[open]'),'Fournisseur enregistré');
  await click('nav[aria-label="Agents"] a[href="/agents/models"]');
  await wait(()=>find('table[aria-label="Modèles"] tbody')?.textContent.includes('Modèle témoin'),'Modèle affiché');
  await click('nav[aria-label="Agents"] a[href="/agents/api-keys"]');
  await click('button[aria-label="Ajouter une clé API"]');
  const provider=await wait(()=>find('dialog[open] [name=provider_id] option[value="1"]')?.parentElement,'Fournisseur de la clé');
  provider.value='1';
  fill('dialog[open] input[name=key]','fixture-key');
  check(find('dialog[open] input[name=key]').type==='password','Masquage initial de la clé');
  await click('button[aria-label="Afficher la clé API"]');
  check(find('dialog[open] input[name=key]').type==='text','Affichage de la saisie');
  await click('button[aria-label="Masquer la clé API"]');
  find('dialog[open] form').requestSubmit();
  await wait(()=>find('table[aria-label="Clés API"] tbody tr')&&!find('dialog[open]'),'Clé enregistrée');
  await click('button[aria-label^="Supprimer une clé API"]');
  check(find('table[aria-label="Clés API"] tbody').textContent.includes('—'),'Quota inconnu');
  check(!find('table[aria-label="Clés API"]').textContent.includes('fixture-key'),'Clé absente de la liste');
  const remove=Array.from(find('dialog[open]').querySelectorAll('button')).find(button=>button.textContent==='Supprimer');
  remove.click();
  await wait(()=>!find('table[aria-label="Clés API"] tbody tr')&&!find('dialog[open]'),'Suppression de la clé');
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
  const index=await readFile(join(web,'index.html'))
  const assets=new Map()
  for(const name of index.toString().match(/\/assets\/[\w-]+\.(?:css|js)/g))assets.set(name,await readFile(web+name))
  let report
  let providers, keys, reminders
  const json=(response,value,status=200)=>response.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(value))
  const body=async request=>{let data='';for await(const part of request)data+=part;return JSON.parse(data)}
  server=createServer(async(request,response)=>{
    const route=new URL(request.url,'http://localhost').pathname
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
        providers=[{id:1,...values}]
        return json(response,providers[0])
      }
      if(route==='/api/v1/administration/agent-models')return json(response,{models:providers.length?[{
        id:1,identifier:'fixture',name:'Modèle témoin',provider:providers[0].name,context:131072,output:16384,input_cost:0.1,output_cost:0.3,
      }]:[]})
      if(route==='/api/v1/administration/agent-api-keys'){
        if(!post)return json(response,{keys})
        assert.deepEqual(await body(request),{provider_id:1,key:'fixture-key'})
        keys=[{id:'key-1',provider:providers[0].name,day:null,week:null,month:null,credits:null}]
        return json(response,keys[0])
      }
      if(route==='/api/v1/administration/agent-api-keys/remove'){
        assert.deepEqual(await body(request),{id:'key-1'})
        keys=[]
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
    providers=[];keys=[];reminders={seconds:300,second_seconds:1800,last_seconds:14400}
    const observation=new Promise(resolve=>{report=resolve})
    const child=spawn(binary,[...args,'http://127.0.0.1:'+server.address().port+'/verification'],{stdio:'ignore'})
    const closed=once(child,'close')
    const timer=setTimeout(()=>report({error:'Délai dépassé'}),45_000)
    try{
      const result=await Promise.race([observation,closed.then(([code])=>({error:'Arrêt '+code}))])
      assert.equal(result.passed,true,name+' : '+result.error+' (fournisseurs fixture : '+providers.length+')')
      assert.equal(reminders.seconds,420)
      console.log(name+' : navigation, ajout fournisseur et clé, masquage, suppression et changement de délai vérifiés.')
    }finally{clearTimeout(timer);child.kill();await closed}
  }
}finally{
  server?.closeAllConnections()
  server?.close()
  await rm(workspace,{recursive:true,force:true,maxRetries:5,retryDelay:100})
}
