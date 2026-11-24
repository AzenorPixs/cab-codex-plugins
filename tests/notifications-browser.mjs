// Chromium et Firefox exercent le composant du produit avec une API de test.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {mkdtemp,rm} from 'node:fs/promises'
import {createServer} from 'node:http'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {createServer as createVite} from '../frontend/node_modules/vite/dist/node/index.js'

const workspace=await mkdtemp(join(tmpdir(),'cab-notifications-'))
const vite=await createVite({root:resolve('frontend'),cacheDir:join(workspace,'vite'),appType:'custom',
  server:{middlewareMode:true,watch:null,ws:false}})
const html=`<!doctype html><meta charset="utf-8"><div id="root"></div>
<script type="module">
import {createElement} from 'react'
import {createRoot} from 'react-dom/client'
import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import {Notifications} from '/src/Notifications.tsx'
import {PublishForgeArtifacts,useForgeArtifacts} from '/src/ForgeArtifacts.tsx'
import '/src/style.css'
function Fixture(){
  const state=useForgeArtifacts('fixture')
  return createElement('div',null,createElement(Notifications),
    createElement(PublishForgeArtifacts,{state,forge:'FORGEJO',label:'Forgejo',values:{PROJECT_DOCKERED:'Yes',PROJECT_DEBIAN_PACKAGE:'Yes'}}))
}
createRoot(document.querySelector('#root')).render(createElement(QueryClientProvider,{client:new QueryClient()},createElement(Fixture)))
</script>`
const suite=`<!doctype html><meta charset="utf-8">
<iframe width="960" height="720" src="/fixture?id=desktop"></iframe>
<iframe width="360" height="600" src="/fixture?id=mobile"></iframe>
<script>
const wait=async(read,label)=>{
  for(let i=0;i<160;i++){
    const value=read()
    if(value)return value
    await new Promise(resolve=>setTimeout(resolve,25))
  }
  throw Error(label)
}
const check=(value,label)=>{if(!value)throw Error(label)}
async function verify(frame){
  const doc=frame.contentDocument
  const get=selector=>doc.querySelector(selector)
  const bell=await wait(()=>get('.notification-bell'),'Cloche absente')
  const size=()=>{
    const {width,height}=get('dialog').getBoundingClientRect()
    return width+'x'+height
  }
  const title=()=>get('.notification-message h3')?.textContent
  bell.click()
  await wait(()=>get('dialog[open]'),'Dialogue fermé')
  const dimensions=size()
  await wait(()=>title()==='Message court','Message court')
  check(get('.publication-results').querySelectorAll('.publication-logo').length===2,'Logos des deux artefacts')
  check(get('.publication-results .publication-completed')?.textContent==='✓','Coche de réussite absente')
  const details=get('.publication-results .publication-failure')
  check(!details.open&&details.querySelector('.publication-unknown')?.textContent==='✕','Croix d’erreur absente')
  details.querySelector('summary').click()
  check(details.open&&details.textContent.includes('Statut HTTP')&&details.textContent.includes('403'),'Diagnostic dans la notification')
  check(size()===dimensions,'Dimensions après chargement')
  const next=get('[aria-label="Notification suivante"]')
  const clear=next.nextElementSibling
  check(clear.textContent==='Effacer les messages','Position ou libellé du bouton')
  next.click()
  await wait(()=>title()==='Message long','Message long')
  check(size()===dimensions,'Dimensions avec message long')
  const content=get('.notification-content')
  check(content.scrollHeight>content.clientHeight,'Défilement interne absent')
  content.scrollTop=content.scrollHeight
  check(content.scrollTop>0&&clear.getBoundingClientRect().bottom<=get('dialog').getBoundingClientRect().bottom,
    'Commandes hors de la popup')
  clear.click()
  await wait(()=>title()==='Question','Question conservée après la purge')
  check(clear.disabled&&size()===dimensions,'État après la purge')
  get('.notification-choices button').click()
  await wait(()=>content.textContent.includes('Réponse enregistrée'),'Question indisponible')
  get('[aria-label="Fermer les notifications"]').click()
  await wait(()=>!get('dialog[open]'),'Fermeture')
  bell.click()
  await wait(()=>content.textContent.includes('Aucune notification.'),'État vide après réouverture')
  check(size()===dimensions&&clear.disabled,'Dimensions ou état vide')
  get('[aria-label="Fermer les notifications"]').click()
  check(!get('.agent-config-link'),'Lien historique présent')
  get('[aria-label="Publier les artefacts vers Forgejo"]').click()
  const overview=await wait(()=>get('[aria-label="Overview de publication Forgejo"][open]'),'Overview immédiat absent')
  check(overview.textContent.includes('Demande de publication en cours'),'Overview ouvert après la demande : '+overview.textContent)
  await wait(()=>overview.querySelector('.publication-running'),'Étape active absente')
  const affected=doc.defaultView.location.search.includes('mobile')
  if(affected){
    const failed=await wait(()=>overview.querySelector('.publication-failure'),'Étape en échec absente')
    failed.querySelector('summary').click()
    check(failed.open&&failed.textContent.includes('403'),'Diagnostic dans l’overview')
    check(overview.querySelector('.publication-completed')?.textContent==='✓','Étapes réussies perdues')
  }else{
    await wait(()=>overview.querySelector('[role="status"]').textContent==='Réussie','Publication réussie non mise à jour')
    check(!overview.querySelector('.publication-failure'),'Erreur d’un autre reçu affichée')
  }
}
Promise.all([...document.querySelectorAll('iframe')].map(async frame=>{
  if(frame.contentDocument.readyState!=='complete'||frame.contentWindow.location.pathname!=='/fixture'){
    await new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}))
  }
  await verify(frame)
})).then(()=>({passed:true}),reason=>({error:reason.message})).then(result=>
  fetch('/observation',{method:'POST',body:JSON.stringify(result)}))
</script>`
const choices=[{id:'yes',label:'Oui'},{id:'no',label:'Non'}]
const makeNotice=(id,title,body,kind='message')=>({
  id,sender:'CAB',title,body,kind,choices:kind==='question'?choices:[],
  read_at:null,created:'2026-11-23T10:00:00Z',updated:'2026-11-23T10:00:00Z',
})
const published=[
  {kind:'debian',forge:'FORGEJO',state:'COMPLETED',at:'2026-11-23T10:00:00Z'},
  {kind:'docker',forge:'FORGEJO',state:'UNKNOWN',error:'artifact-forge-publication-unconfirmed',
    step:'docker-push',details:{http_status:403}},
]
const scenarios=new Map()
let observe
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))
const server=createServer(async(request,response)=>{
  const path=new URL(request.url,'http://127.0.0.1')
  const reply=(value,headers={})=>response.writeHead(200,{'Content-Type':'application/json',...headers}).end(JSON.stringify(value))
  if(path.pathname==='/verification')return response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(suite)
  if(path.pathname==='/fixture')return response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(await vite.transformIndexHtml('/fixture',html))
  if(path.pathname==='/observation'){
    let body=''
    for await(const chunk of request)body+=chunk
    observe(JSON.parse(body))
    return response.writeHead(204).end()
  }
  if(path.pathname==='/api/v1/health')return reply({csrf_token:'fixture'})
  if(['/api/v1/sync/notifications','/api/v1/sync/forge-artifacts'].includes(path.pathname)){
    await delay(100)
    return reply([{headers:{control:'up-to-date'}}],{'electric-handle':'fixture','electric-offset':'0_0',
      'electric-schema':'{}','electric-cursor':'0'})
  }
  if(path.pathname.startsWith('/api/v1/projects/fixture/published-artifacts')){
    const id=new URL(request.headers.referer).searchParams.get('id')
    const state=scenarios.get(id)
    if(request.method==='POST'){
      let body=''
      for await(const chunk of request)body+=chunk
      state.receipt=JSON.parse(body).request_id
      await delay(750)
      return reply({id:state.receipt,forge:'FORGEJO',state:'PENDING'})
    }
    if(path.pathname.endsWith('/receipts/'+state.receipt)){
      state.polls++
      const active=state.polls===1
      const failure=!active&&id==='mobile'
      return reply({id:state.receipt,forge:'FORGEJO',state:active?'RUNNING':failure?'UNKNOWN':'COMPLETED',
        progress:{kinds:['debian','docker'],steps:[
          {key:'debian-release',state:'COMPLETED'},
          {key:'docker-push',state:active?'RUNNING':failure?'FAILED':'COMPLETED',
            ...(failure?{error:'artifact-forge-publication-unconfirmed',details:{http_status:403}}:{})},
        ]}})
    }
    if(path.pathname.includes('/receipts/'))return response.writeHead(404,{'Content-Type':'application/json'}).end(JSON.stringify({error:'artifact-publication-receipt-missing'}))
    return reply({rows:[],jobs:{FORGEJO:{id:'ancien-recu',forge:'FORGEJO',state:'FAILED'}}})
  }
  if(path.pathname.startsWith('/api/v1/notifications')){
    const source=new URL(request.headers.referer)
    const state=scenarios.get(source.searchParams.get('id'))
    if(path.pathname.endsWith('/answer')){
      state.rows=state.rows.filter(row=>row.kind!=='question')
      return reply({})
    }
    if(path.pathname.endsWith('/read')){
      let body=''
      for await(const chunk of request)body+=chunk
      state.rows=state.rows.filter(row=>row.id!==JSON.parse(body).id||row.kind==='question')
      return reply({})
    }
    if(path.pathname.endsWith('/clear-messages')){
      const cleared=state.rows.filter(row=>row.kind==='message')
      state.rows=state.rows.filter(row=>row.kind==='question')
      state.calls++
      assert(cleared.some(row=>row.id==='unseen'),'La purge inclut les messages jamais affichés')
      return reply({cleared_ids:cleared.map(row=>row.id)})
    }
    await delay(120)
    return reply({notifications:state.rows})
  }
  vite.middlewares(request,response)
})
try{
  server.listen(0,'127.0.0.1')
  await once(server,'listening')
  const url='http://127.0.0.1:'+server.address().port+'/verification'
  for(const browser of ['chromium','firefox']){
    for(const id of ['desktop','mobile'])scenarios.set(id,{calls:0,polls:0,rows:[
      {...makeNotice('short','Message court','Texte court'),artifacts:JSON.stringify(published)},
      makeNotice('long','Message long','Ligne longue de notification.\n'.repeat(250)),
      makeNotice('unseen','Message non affiché','À effacer'),
      makeNotice('question','Question','Voulez-vous continuer ?','question'),
    ]})
    const profile=await mkdtemp(join(workspace,browser+'-'))
    const args=browser==='chromium'?['--headless','--no-sandbox','--disable-dev-shm-usage','--user-data-dir='+profile]
      :['--headless','--no-remote','--profile',profile]
    const result=new Promise(resolve=>{observe=resolve})
    const child=spawn('/usr/bin/'+browser,[...args,url],{stdio:'ignore'})
    const exited=once(child,'exit')
    let timeout
    try{
      const proof=await Promise.race([result,exited.then(code=>({error:'Sortie du navigateur '+code})),
        new Promise(resolve=>{timeout=setTimeout(()=>resolve({error:'Aucun résultat navigateur'}),25000)})])
      assert.equal(proof.passed,true,browser+' : '+proof.error)
      assert([...scenarios.values()].every(state=>state.calls===1))
      console.log(browser+' : notifications et suivi de publication vérifiés sur ordinateur et mobile')
    }finally{
      clearTimeout(timeout)
      if(child.exitCode===null){child.kill('SIGTERM');await exited}
    }
  }
}finally{
  server.closeAllConnections()
  server.close()
  await vite.close()
  await rm(workspace,{recursive:true,force:true})
}
