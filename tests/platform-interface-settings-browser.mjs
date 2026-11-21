// Rendu produit et contrat Electric sur données fictives, sans mutation de l’instance installée.
import assert from 'node:assert/strict'
import {spawn,execFileSync} from 'node:child_process'
import {once} from 'node:events'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {createServer} from 'node:http'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'

const root=resolve('frontend')
const workspace=await mkdtemp(join(tmpdir(),'cab-interface-'))
const web=join(workspace,'web')
const node=process.execPath
const python='/home/devops/python/current/bin/python3'
let server
try{
  execFileSync(node,['node_modules/typescript/bin/tsc','--noEmit'],{cwd:root,stdio:'inherit'})
  execFileSync(node,['node_modules/vite/bin/vite.js','build','--outDir',web],{cwd:root,stdio:'inherit'})
  const styleFields=JSON.parse(execFileSync(python,['-B','-c',
    'import json,runpy; print(json.dumps(runpy.run_path("src/cab_platform/core/interface_style.py")["FIELDS"]))'],{encoding:'utf-8'}))
  const index=await readFile(join(web,'index.html'))
  const assets=new Map()
  for(const name of index.toString().match(/\/assets\/[\w-]+\.(?:css|js)/g)){
    assets.set(name,await readFile(web+name))
  }
  const preferences={persistent:true,font_scale:100,theme:'light',component_style:{},profile_styles:{},responsive:{}}
  let revision=1
  const archivedSizes=new Set()
  let completed
  const observation=new Promise(resolve=>{completed=resolve})
  const json=(response,value,headers={})=>response.writeHead(200,{'Content-Type':'application/json',...headers}).end(JSON.stringify(value))
  const preview=`<!doctype html><meta charset="utf-8">
    <iframe width="1920" height="1080" src="/administration/interface"></iframe>
    <iframe width="1920" height="1080" src="/projects/cab/archives"></iframe>
    <iframe width="390" height="844" src="/administration/interface"></iframe>
    <script>
    const report=result=>fetch('/observation',{method:'POST',body:JSON.stringify(result)});
    function check(test,description){if(!test)throw Error(description)}
    async function wait(read,description){
      for(let i=0;i<90;i++){const value=read();if(value)return value;await new Promise(r=>setTimeout(r,50))}
      throw Error(description)
    }
    (async()=>{
      const [admin,archive,mobile]=[...document.querySelectorAll('iframe')];
      const expected=['Blocs','Colonnes','Général','Menus','Résolutions','Tableaux','Titres','Top barre'];
      for(const frame of [admin,mobile]){
        await wait(()=>frame.contentDocument?.querySelector('[role="tab"][aria-selected="true"]'),'Onglets absents');
        const doc=frame.contentDocument;
        const tabs=[...doc.querySelector('.interface-tabs').querySelectorAll('[role="tab"]')];
        check(JSON.stringify(tabs.map(tab=>tab.textContent))===JSON.stringify(expected),'Ordre alphabétique');
        check(doc.querySelector('[role="tab"][aria-selected="true"]').textContent==='Général','Général par défaut');
        check(doc.querySelector('#interface-panel-general .font-controls'),'Taille des polices');
        const expectProfile=frame===mobile?'Mobile':'Full HD';
        const profileTabs=()=>[...doc.querySelectorAll('.interface-resolution-tabs [role="tab"]')];
        const selectedProfile=()=>profileTabs().find(tab=>tab.getAttribute('aria-selected')==='true');
        check(selectedProfile().textContent===expectProfile,'Résolution courante sélectionnée');
        check(profileTabs().map(tab=>tab.textContent).join(',')==='Mobile,Tablette,HD,Full HD,QHD,4K','Six résolutions');
        const original=selectedProfile();
        original.focus();
        original.dispatchEvent(new frame.contentWindow.KeyboardEvent('keydown',{key:'End',bubbles:true}));
        await wait(()=>selectedProfile().textContent==='4K','Navigation clavier des résolutions');
        original.click();
        await wait(()=>selectedProfile().textContent===expectProfile,'Retour à la résolution courante');
        tabs[2].focus();
        tabs[2].dispatchEvent(new frame.contentWindow.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
        await wait(()=>tabs[3].getAttribute('aria-selected')==='true','Navigation au clavier');
        check(doc.activeElement===tabs[3],'Focus de l’onglet');
        tabs[4].click();
        await wait(()=>tabs[4].getAttribute('aria-selected')==='true','Onglet Résolutions');
        check(doc.querySelectorAll('#interface-panel-resolutions fieldset').length===1,'Seul le profil sélectionné est affiché');
        if(frame===mobile)check(tabs.every(tab=>tab.getBoundingClientRect().right<=frame.contentWindow.innerWidth),'Onglets trop larges sur mobile');
        for(const [id,index] of [['blocs',0],['columns',1],['menus',3],['tables',5],['titles',6],['top_bar',7]]){
          tabs[index].click();
          await wait(()=>doc.querySelector('#interface-panel-'+id+':not([hidden]) form'),'Formulaire '+id);
          check(selectedProfile().textContent===expectProfile,'La résolution choisie reste sélectionnée');
        }
      }
      const doc=admin.contentDocument;
      const audit=await wait(()=>archive.contentDocument?.querySelector('.monitor-table'),'Tableau d’archives');
      const referee=archive.contentDocument.documentElement;
      check(archive.contentWindow.getComputedStyle(audit.querySelector('th')).backgroundColor==='rgb(33, 94, 84)','Couleur de référence');
      function field(panel,key){return doc.querySelector('#interface-panel-'+panel+' input[name="'+key+'"]')}
      function edit(input,value){
        const win=admin.contentWindow;
        Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype,'value').set.call(input,value);
        input.dispatchEvent(new win.Event('input',{bubbles:true}));
      }
      const height=field('top_bar','height');
      check(height.value==='76','Hauteur de référence');
      edit(height,'94');
      await wait(()=>!height.form.querySelector('[type="submit"]').disabled,'Édition de la hauteur');
      height.form.requestSubmit();
      await wait(()=>referee.style.getPropertyValue('--ui-top-bar-height')==='94px','Projection Electric du bandeau dans une autre fenêtre');
      check(!mobile.contentDocument.documentElement.style.getPropertyValue('--ui-top-bar-height'),'Mobile conserve le défaut');
      doc.querySelector('#interface-top_bar-resolution-tab-uhd').click();
      const uhd=await wait(()=>doc.querySelector('#interface-top_bar-resolution-panel-uhd:not([hidden]) input[name="height"]'),'Réglages 4K');
      check(uhd.value==='76','Le réglage Full HD ne modifie pas le formulaire 4K');
      doc.querySelector('#interface-top_bar-resolution-tab-fullhd').click();
      await wait(()=>doc.querySelector('#interface-top_bar-resolution-panel-fullhd:not([hidden]) input[name="height"]'),'Retour Full HD');
      doc.querySelector('#interface-tab-tables').click();
      const size=await wait(()=>field('tables','page_archives'),'Pagination Full HD');
      check(size.value==='10','Pagination de référence');
      edit(size,'15');
      await wait(()=>!size.form.querySelector('[type="submit"]').disabled,'Édition de la pagination');
      size.form.requestSubmit();
      await wait(()=>size.form.querySelector('[role="status"]').textContent==='Réglages enregistrés.','Sauvegarde des tableaux');
      const pagination=()=>archive.contentDocument.querySelector('nav[aria-label="Pagination des archives"] span')?.textContent;
      await wait(()=>pagination()?.includes('1 / 2'),'Pagination synchronisée');
      size.form.querySelector('[type="button"]').click();
      await wait(()=>size.form.querySelector('[role="status"]').textContent==='Valeurs par défaut rétablies.','Réinitialisation des tableaux');
      await wait(()=>pagination()?.includes('1 / 3'),'Pagination réinitialisée');
      check(size.value==='10'&&referee.style.getPropertyValue('--ui-top-bar-height')==='94px','Réinitialisation indépendante');
      await report({passed:true});
    })().catch(error=>report({error:error.message}));
    </script>`
  server=createServer(async (request,response)=>{
    const url=new URL(request.url,'http://localhost')
    const path=url.pathname
    try{
      if(path==='/verification')return response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(preview)
      if(path==='/observation'&&request.method==='POST'){
        let body=''
        for await(const part of request)body+=part
        completed(JSON.parse(body))
        return response.writeHead(204).end()
      }
      if(path==='/api/v1/health')return json(response,{initialized:true,state:'READY',version:'3.5.0',csrf_token:'fixture'})
      if(path==='/api/v1/interface/preferences')return json(response,{...preferences,style_fields:styleFields})
      if(path==='/api/v1/administration/configuration')return json(response,{configuration:{},revision:'fixture',pending_fields:[],logging_levels:['INFO']})
      if(path==='/api/v1/interface/style'&&request.method==='POST'){
        let body=''
        for await(const part of request)body+=part
        const {group,profile,values,reset}=JSON.parse(body)
        if(group==='resolutions'){
          if(reset)delete preferences.responsive[profile]
          else preferences.responsive[profile]={layout:100,font:100,...preferences.responsive[profile],...values}
        }else{
          const settings=preferences.profile_styles[profile]??={}
          if(reset)delete settings[group]
          else settings[group]={...settings[group],...values}
        }
        revision++
        return json(response,preferences)
      }
      if(path==='/api/v1/sync/interface-preferences'){
        const offset=url.searchParams.get('offset')||'-1'
        const version=Number(offset.split('_')[0])
        if(version===revision)await new Promise(resolve=>setTimeout(resolve,30))
        if(response.destroyed)return
        const messages=version<revision?[{key:'preferences-1',headers:{operation:version<0?'insert':'update'},value:{id:'1',preferences:JSON.stringify(preferences)}}]:[]
        return json(response,[...messages,{headers:{control:'up-to-date'}}],{
          'electric-handle':'fixture-preferences','electric-offset':revision+'_0','electric-cursor':String(revision),
          'electric-schema':JSON.stringify({id:{type:'int4'},preferences:{type:'jsonb'}}),
        })
      }
      if(path==='/api/v1/projects')return json(response,{projects:[{id:'fixture-cab',identifier:'cab',name:'CAB',creation_state:'READY',root:'/fixture/cab',version:'3.5.0'}]})
      if(path==='/api/v1/session-archives'){
        const pageSize=Number(url.searchParams.get('page_size'))
        archivedSizes.add(pageSize)
        return json(response,{sessions:[],page:1,total_pages:Math.ceil(30/pageSize),total:30,has_next:true})
      }
      if(path.startsWith('/api/v1/sync/'))return response.writeHead(403,{'Content-Type':'application/json'}).end('{}')
      if(path.startsWith('/api/v1/'))return json(response,{})
      const asset=assets.get(path)
      if(asset)return response.writeHead(200,{'Content-Type':path.endsWith('.js')?'text/javascript':'text/css'}).end(asset)
      if(path.startsWith('/administration/')||path.startsWith('/projects/')){
        return response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(index)
      }
      return response.writeHead(404).end()
    }catch(error){console.error(error.message);if(!response.headersSent)response.writeHead(500);response.end()}
  }).listen(0,'127.0.0.1')
  await once(server,'listening')
  const browser=spawn('/usr/bin/chromium',['--headless','--disable-gpu','--disable-background-networking',
    '--no-first-run','--no-default-browser-check','--user-data-dir='+join(workspace,'profile'),
    'http://127.0.0.1:'+server.address().port+'/verification'],{stdio:'ignore'})
  const closed=once(browser,'close')
  const timer=setTimeout(()=>completed({error:'Délai Chromium dépassé'}),16000)
  const result=await Promise.race([observation,closed.then(([code])=>({error:'Arrêt Chromium '+code}))])
  clearTimeout(timer)
  browser.kill()
  await closed
  assert.equal(result.passed,true,result.error||'Résultat Chromium absent')
  assert.deepEqual(archivedSizes,new Set([10,15]),'Modification de la pagination sans rechargement')
  console.log('Chromium : huit onglets, six résolutions, navigation au clavier et persistance isolée Full HD/4K/mobile, avec projection Electric.')
}finally{
  server?.closeAllConnections()
  server?.close()
  await rm(workspace,{recursive:true,force:true,maxRetries:6,retryDelay:100})
}
