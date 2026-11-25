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
  const preferences={persistent:true,font_scale:100,theme:'light',component_style:{},profile_styles:{fullhd:{tables:{page_archives:25}}},responsive:{}}
  let revision=1
  const archivedSizes=new Set()
  let completed
  const observation=new Promise(resolve=>{completed=resolve})
  const json=(response,value,headers={})=>response.writeHead(200,{'Content-Type':'application/json',...headers}).end(JSON.stringify(value))
  const preview=`<!doctype html><meta charset="utf-8">
    <iframe width="1920" height="1080" src="/administration/interface"></iframe>
    <iframe width="1920" height="1080" src="/projects/cab/sessions?status=archived"></iframe>
    <iframe width="390" height="844" src="/administration/interface"></iframe>
    <iframe width="1920" height="1080" src="/projects/sessions?status=archived"></iframe>
    <iframe src="/projects/archives"></iframe>
    <iframe src="/projects/cab/archives"></iframe>
    <script>
    const report=result=>fetch('/observation',{method:'POST',body:JSON.stringify(result)});
    function check(test,description){if(!test)throw Error(description)}
    async function wait(read,description){
      for(let i=0;i<90;i++){const value=read();if(value)return value;await new Promise(r=>setTimeout(r,50))}
      throw Error(description)
    }
    async function verifyHelp(doc,trigger,range,choices=0){
      check(trigger?.classList.contains('interface-field-help-trigger')&&trigger.type==='button','Libellé cliquable');
      trigger.focus();
      trigger.click();
      const dialog=await wait(()=>doc.querySelector('.interface-field-help[open]'),'Aide '+trigger.textContent);
      check(dialog.getAttribute('aria-label')===trigger.textContent&&dialog.querySelector('p').textContent.length>15,'Description de '+trigger.textContent);
      const shown=dialog.querySelector('.interface-field-range')?.textContent;
      check(shown===range,'Amplitude de '+trigger.textContent+' : '+shown);
      check(dialog.querySelectorAll('li').length===choices,'Choix de '+trigger.textContent);
      dialog.querySelector('button').click();
      await wait(()=>!doc.querySelector('.interface-field-help[open]'),'Fermeture de l’aide');
    }
    (async()=>{
      const [admin,archive,mobile,globalArchives,oldGlobal,oldProject]=[...document.querySelectorAll('iframe')];
      const archiveTab='nav[aria-label="État des sessions"] [aria-current="page"]';
      const firstRun='a[href="/projects/cab/runs/RUN-1"]';
      for(const [frame,menu] of [[archive,'Projet'],[globalArchives,'Projets']]){
        await wait(()=>frame.contentDocument?.querySelector(firstRun),'Sessions archivées ('+menu+')');
        const doc=frame.contentDocument;
        check(doc.querySelector(archiveTab)?.textContent==='Archivées','Onglet Archivées sélectionné');
        check(![...doc.querySelectorAll('nav[aria-label="'+menu+'"] a')].some(link=>link.textContent==='Archives'),'Entrée Archives retirée ('+menu+')');
      }
      check(globalArchives.contentDocument.querySelector('td[data-label="Projets"] a')?.getAttribute('href')==='/projects/cab','Lien du projet dans les archives globales');
      for(const [frame,message] of [[oldGlobal,'Projet introuvable'],[oldProject,'Not Found']]){
        await wait(()=>frame.contentDocument?.body?.textContent.includes(message),'Ancienne adresse sans page Archives : '+message);
        check(!frame.contentDocument.querySelector('.monitor-table'),'Aucun tableau d’archives à l’ancienne adresse');
      }
      const expected=['Blocs','Colonnes','Général','Menus','Résolutions','Tableaux','Titres','Top barre'];
      for(const frame of [admin,mobile]){
        await wait(()=>frame.contentDocument?.querySelector('[role="tab"][aria-selected="true"]'),'Onglets absents');
        const doc=frame.contentDocument;
        const tabs=[...doc.querySelector('.interface-tabs').querySelectorAll('[role="tab"]')];
        check(JSON.stringify(tabs.map(tab=>tab.textContent))===JSON.stringify(expected),'Ordre alphabétique');
        check(doc.querySelector('[role="tab"][aria-selected="true"]').textContent==='Général','Général par défaut');
        check(doc.querySelector('#interface-panel-general .font-controls'),'Taille des polices');
        await verifyHelp(doc,doc.querySelector('#interface-panel-general .interface-field-help-trigger'),'De 80 à 160 %.');
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
        for(const trigger of doc.querySelectorAll('#interface-panel-resolutions .interface-field-help-trigger'))
          await verifyHelp(doc,trigger,'De 50 à 150 %.');
        if(frame===mobile)check(tabs.every(tab=>tab.getBoundingClientRect().right<=frame.contentWindow.innerWidth),'Onglets trop larges sur mobile');
        for(const [id,index] of [['blocs',0],['columns',1],['menus',3],['tables',5],['titles',6],['top_bar',7]]){
          tabs[index].click();
          await wait(()=>doc.querySelector('#interface-panel-'+id+':not([hidden]) form'),'Formulaire '+id);
          check(selectedProfile().textContent===expectProfile,'La résolution choisie reste sélectionnée');
          const input=name=>doc.querySelector('#interface-panel-'+id+' [name="'+name+'"]');
          const computed=selector=>frame.contentWindow.getComputedStyle(doc.querySelector(selector));
          const fields=[...doc.querySelectorAll('#interface-panel-'+id+' .interface-component-fields :is(input, select)')];
          const help=control=>doc.getElementById(control.getAttribute('aria-labelledby'));
          check(fields.every(control=>help(control)?.classList.contains('interface-field-help-trigger')),'Tous les champs ont une aide dans '+id);
          const numeric=id==='tables'?input('icon_size'):fields.find(control=>control.type==='number');
          const label=help(numeric).textContent;
          const opening=label.lastIndexOf(' (');
          const unit=opening>=0?label.slice(opening+2,-1):'';
          await verifyHelp(doc,help(numeric),'De '+numeric.min+' à '+numeric.max+(unit?' '+unit:'')+'.');
          if(id==='top_bar'){
            await verifyHelp(doc,help(fields.find(control=>control.type==='color')),undefined);
            await verifyHelp(doc,help(input('scroll')||fields.find(control=>control.name==='scroll')),undefined,3);
          }
          if(id==='columns'){
            check(input('content_inline').value+'px'===computed('.administration-content').paddingLeft,
              'Marges de contenu identiques à la référence CSS');
            if(frame===mobile)check(input('sidebar_width').placeholder==='Automatique','Colonne mobile empilée');
          }
          if(id==='menus'){
            check(input('side_font').value+'px'===computed('.administration-sidebar nav a').fontSize,
              'Police du menu identique à la référence CSS');
          }
          if(id==='tables'){
            check(input('cell_padding').value===(frame===mobile?'10':'14'),'Marge compacte du tableau');
            check(input('row_height').placeholder==='Automatique','Hauteur du tableau calculée par le contenu');
            for(const profile of profileTabs()){
              profile.click();
              const icons=await wait(()=>input('icon_size'),'Taille des logos pour '+profile.textContent);
              check(icons.placeholder==='Automatique'&&icons.min==='12'&&icons.max==='48','Référence et bornes des logos');
            }
            profileTabs().find(tab=>tab.textContent===expectProfile).click();
          }
          if(id==='top_bar'){
            check(input('inline_padding').value+'px'===computed('header').paddingLeft,
              'Marge du bandeau identique à la référence CSS');
            check(input('scroll').value===computed('header').position,'Position du bandeau en place');
            check(!doc.documentElement.style.getPropertyValue('--ui-top-bar-inline-padding'),
              'Aucune substitution CSS pour obtenir la valeur affichée');
          }
        }
      }
      const responsiveDoc=mobile.contentDocument;
      for(const [profile,width] of [['tablet',768],['hd',1366],['fullhd',1920],['qhd',2560],['uhd',3840],['mobile',390]]){
        mobile.width=String(width);
        responsiveDoc.querySelector('#interface-top_bar-resolution-tab-'+profile).click();
        const panel=await wait(()=>mobile.contentWindow.innerWidth===width&&
          responsiveDoc.querySelector('#interface-top_bar-resolution-panel-'+profile+':not([hidden]) input[name="brand_gap"]'),
          'Profil '+profile+' à la largeur '+width);
        const header=mobile.contentWindow.getComputedStyle(responsiveDoc.querySelector('.brand-group'));
        check(header.columnGap===panel.value+'px','Espacement de la marque pour '+profile);
      }
      const doc=admin.contentDocument;
      const audit=await wait(()=>archive.contentDocument?.querySelector('.monitor-table'),'Tableau d’archives');
      const cancelled=await wait(()=>audit.querySelector('tbody a[href$="/runs/replacement"]'),'Lien vers le RUN remplaçant');
      check(cancelled.closest('td').textContent.includes('Cancelled before start'),'État d’annulation concis en anglais');
      check(!cancelled.closest('td').textContent.includes('CANCELLED_BEFORE_START'),'Code technique masqué');
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
      check(size.max==='10','Plafond des réglages de pagination');
      const iconSize=field('tables','icon_size');
      const iconStyle=()=>{
        const icon=audit.querySelector('tbody .lifecycle-icon svg');
        return icon?archive.contentWindow.getComputedStyle(icon):null;
      };
      const originalIconWidth=iconStyle().inlineSize;
      const square=()=>audit.querySelector('tbody .lifecycle-icon')?.getBoundingClientRect();
      const originalSquareWidth=square().width;
      edit(size,'5');
      edit(iconSize,'12');
      await wait(()=>!size.form.querySelector('[type="submit"]').disabled,'Édition de la pagination');
      size.form.requestSubmit();
      await wait(()=>size.form.querySelector('[role="status"]').textContent==='Réglages enregistrés.','Sauvegarde des tableaux');
      const pagination=()=>archive.contentDocument.querySelector('nav[aria-label="Pagination des archives"] span')?.textContent;
      await wait(()=>pagination()?.includes('1 / 6'),'Pagination synchronisée');
      await wait(()=>iconStyle()?.inlineSize==='12px'&&iconStyle().blockSize==='12px','Taille appliquée dans un autre onglet par Electric');
      const resized=square();
      check(resized.width<originalSquareWidth&&Math.abs(resized.width-resized.height)<0.1,
        'Le bouton rétrécit et reste carré');
      check(!mobile.contentDocument.documentElement.style.getPropertyValue('--ui-tables-icon-size'),
        'Le profil Mobile conserve sa taille de référence');
      size.form.querySelector('.interface-component-actions [type="button"]').click();
      await wait(()=>size.form.querySelector('[role="status"]').textContent==='Valeurs par défaut rétablies.','Réinitialisation des tableaux');
      await wait(()=>pagination()?.includes('1 / 3'),'Pagination réinitialisée');
      await wait(()=>iconStyle()?.inlineSize===originalIconWidth,'Taille native rétablie avec l’onglet');
      check(size.value==='10'&&referee.style.getPropertyValue('--ui-top-bar-height')==='94px','Réinitialisation indépendante');
      const archiveDoc=archive.contentDocument;
      const navigation=archiveDoc.querySelector('nav[aria-label="Pagination des archives"]');
      const search=navigation.querySelector('input[type="search"]');
      const archiveRows=()=>Array.from(archiveDoc.querySelectorAll('table tbody tr'));
      check(search.previousElementSibling.textContent==='Dernier','Recherche à droite de Dernier');
      check(search.offsetLeft>search.previousElementSibling.offsetLeft,'Position visuelle de la recherche');
      await wait(()=>archiveRows().length===10,'Première page limitée à dix lignes');
      const next=await wait(()=>[...navigation.querySelectorAll('button')].find(button=>button.textContent==='Suivant'&&!button.disabled),'Bouton Suivant disponible');
      next.click();
      await wait(()=>pagination()?.includes('2 / 3'),'Navigation vers la deuxième page');
      edit(search,'RUN-30');
      await wait(()=>pagination()?.includes('1 / 1')&&archiveRows()[0]?.textContent.includes('RUN-30'),'Recherche avant pagination');
      check(archiveRows().length===3,'Un résultat complété par deux lignes');
      edit(search,'introuvable');
      await wait(()=>archiveRows()[0]?.textContent.includes('Aucun résultat'),'Recherche sans résultat');
      check(archiveRows().length===3&&navigation.querySelectorAll('button:disabled').length===4,'Tableau vide avec trois lignes et navigation');
      globalArchives.contentDocument.querySelector(firstRun).click();
      const back=await wait(()=>globalArchives.contentDocument.querySelector('.run-view a.action-link'),'Retour aux archives depuis le RUN remplacé');
      check(back.getAttribute('href')==='/projects/cab/sessions?status=archived','Retour vers l’onglet Archivées du projet');
      back.click();
      await wait(()=>globalArchives.contentDocument.querySelector(archiveTab)?.textContent==='Archivées','Retour effectif dans les archives du projet');
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
      if(path==='/api/v1/run')return json(response,{state:'CANCELLED_BEFORE_START',replacement:{run_id:'replacement'}})
      if(path==='/api/v1/session-archives'){
        const pageSize=Number(url.searchParams.get('page_size'))
        archivedSizes.add(pageSize)
        const search=url.searchParams.get('search')||''
        const available=Array.from({length:30},(_,index)=>({
          project_id:'fixture-cab',run_id:'RUN-'+(index+1),session_id:'fixture',change:'shared-change',
          state:'CANCELLED_BEFORE_START',replacement:{run_id:'replacement'},archived_at:'2026-11-21T08:00:00Z',
        })).filter(row=>row.run_id.includes(search))
        const pages=Math.max(1,Math.ceil(available.length/pageSize))
        const page=Math.min(Number(url.searchParams.get('page')),pages)
        return json(response,{sessions:available.slice((page-1)*pageSize,page*pageSize),
          page,total_pages:pages,total:available.length,has_next:page<pages})
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
  const timer=setTimeout(()=>completed({error:'Délai Chromium dépassé'}),22000)
  const result=await Promise.race([observation,closed.then(([code])=>({error:'Arrêt Chromium '+code}))])
  clearTimeout(timer)
  browser.kill()
  await closed
  assert.equal(result.passed,true,result.error||'Résultat Chromium absent')
  assert.deepEqual(archivedSizes,new Set([10,5]),'Modification de la pagination sans rechargement')
  console.log('Chromium : interface et projection Electric, retrait des pages Archives et navigation des sessions archivées.')
}finally{
  server?.closeAllConnections()
  server?.close()
  await rm(workspace,{recursive:true,force:true,maxRetries:6,retryDelay:100})
}
