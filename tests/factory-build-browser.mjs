import assert from 'node:assert/strict'
import {execFileSync,spawn} from 'node:child_process'
import {once} from 'node:events'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {createServer} from 'node:http'
import {join,resolve} from 'node:path'

const workspace=await mkdtemp(join(process.env.TMPDIR||resolve('.cab-tests'),'cab-factory-'))
const web=join(workspace,'web')
const cwd=resolve('frontend')
const preview=`<!doctype html><meta charset="utf-8">
<iframe width="1100" height="810" src="/projects/fixture/factory"></iframe>
<script>
const frame=document.querySelector('iframe');
const find=selector=>frame.contentDocument.querySelector(selector);
const wait=async(read,label)=>{
  for(let attempt=0;attempt<200;attempt++){
    const value=read();
    if(value)return value;
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  throw Error(label);
};
const check=(condition,label)=>{if(!condition)throw Error(label)};
const send=result=>fetch('/observation',{method:'POST',body:JSON.stringify(result)});
const overview=()=>find('dialog[open][aria-label="Overview de construction Docker"]');
(async()=>{
  const build=await wait(()=>find('[aria-label="Générer l’artefact Docker"]'),'Bouton Docker absent');
  build.click();
  let dialog=await wait(overview,'Refus sans Overview');
  check(dialog.textContent.includes('PROJECT_VERSION')&&dialog.textContent.includes('ligne 2'),'Clé et ligne absentes');
  check(dialog.textContent.includes('Processus démarréNon'),'Refus avant démarrage');
  dialog.querySelector('button').click();
  await wait(()=>!overview(),'Fermeture du refus');
  const details=()=>Array.from(frame.contentDocument.querySelectorAll('button')).find(button=>button.textContent.includes('Détail de la construction Docker'));
  details().click();
  dialog=await wait(overview,'Impossible de rouvrir le refus');
  dialog.querySelector('button').click();
  await wait(()=>!overview()&&!build.disabled,'Demande suivante indisponible');
  build.click();
  dialog=await wait(()=>overview()?.textContent.includes('Code de sortie17')&&overview(),'Échec sans code de sortie');
  check(dialog.textContent.includes('Construction Docker')&&dialog.textContent.includes('artifact-docker-pull-denied'),'Diagnostic Docker absent');
  await send({passed:true});
})().catch(error=>send({error:error.message}));
</script>`

let server
try {
  execFileSync(process.execPath,['node_modules/typescript/bin/tsc','--noEmit'],{cwd,stdio:'inherit'})
  execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build','--logLevel','error','--outDir',web],{cwd,stdio:'inherit'})
  const index=(await readFile(join(web,'index.html'),'utf8')).replace('<head>',`<head><script>
    Object.defineProperty(navigator,'onLine',{get:()=>true});
    addEventListener('offline',event=>event.stopImmediatePropagation(),true);
  </script>`)
  const assets=new Map()
  for(const name of index.match(/\/assets\/[\w-]+\.(?:css|js)/g))assets.set(name,await readFile(web+name))
  const json=(response,value,status=200)=>response.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(value))
  let report, requests, build
  server=createServer(async(request,response)=>{
    const path=new URL(request.url,'http://localhost').pathname
    if(path==='/observation'||path.endsWith('/docker/build')){
      let raw=''
      for await(const chunk of request)raw+=chunk
      if(path==='/observation'){report(JSON.parse(raw));return response.writeHead(204).end()}
      requests++
      if(requests===1)return json(response,{error:'artifact-build-config-changed',details:{
        phase:'configuration',steps:['configuration'],process_started:false,
        configuration:{state:'partial',issues:[{key:'PROJECT_VERSION',line:2,reason:'invalid-version'}]},
      }},409)
      const {request_id}=JSON.parse(raw)
      build={request_id,state:'FAILED',phase:'docker-build',steps:['configuration','sources','docker-build'],
        process_started:true,exit_code:17,diagnostic:{code:'artifact-docker-pull-denied'}}
      return json(response,{request_id,state:'PENDING'})
    }
    if(path==='/verification')return response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(preview)
    if(path==='/api/v1/health')return json(response,{initialized:true,state:'READY',csrf_token:'fixture'})
    if(path==='/api/v1/projects')return json(response,{projects:[{
      id:'fixture',identifier:'fixture',name:'Projet de recette',root:'/projet',creation_state:'READY',public_metadata:{},
    }]})
    if(path==='/api/v1/projects/fixture/artifacts')return json(response,{
      enabled:{docker:true,debian:false},artifacts:[],builds:build?{docker:build}:{},
    })
    if(path.startsWith('/api/v1/sync/'))return response.writeHead(200,{
      'Content-Type':'application/json','electric-offset':'0_0','electric-handle':'fixture','electric-cursor':'1','electric-schema':'{}',
    }).end(JSON.stringify([{headers:{control:'up-to-date'}}]))
    if(path.startsWith('/api/v1/'))return json(response,{})
    if(assets.has(path))return response.writeHead(200,{'Content-Type':path.endsWith('.js')?'text/javascript':'text/css'}).end(assets.get(path))
    if(path==='/projects/fixture/factory')return response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(index)
    response.writeHead(404).end()
  }).listen(0,'127.0.0.1')
  await once(server,'listening')
  for(const [name,binary,args] of [
    ['Chromium','/usr/bin/chromium',['--headless','--no-sandbox','--disable-background-networking','--user-data-dir='+join(workspace,'chromium')]],
    ['Firefox','/usr/bin/firefox',['--headless','--no-remote','--profile',await mkdtemp(join(workspace,'firefox-'))]],
  ]){
    requests=0
    build=undefined
    const observation=new Promise(resolve=>{report=resolve})
    const child=spawn(binary,[...args,'http://127.0.0.1:'+server.address().port+'/verification'],{stdio:'ignore'})
    const closed=once(child,'close')
    const timer=setTimeout(()=>report({error:'Délai dépassé'}),30_000)
    try{
      const result=await Promise.race([observation,closed.then(([code])=>({error:'Arrêt '+code}))])
      assert.equal(result.passed,true,name+' — '+result.error)
      assert.equal(requests,2)
      console.log(name+' — Overview rouvert, refus et échec vérifiés.')
    }finally{
      clearTimeout(timer)
      child.kill()
      await closed
    }
  }
}finally{
  server?.closeAllConnections()
  server?.close()
  await rm(workspace,{recursive:true,force:true,maxRetries:5,retryDelay:100})
}
