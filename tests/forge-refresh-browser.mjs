import assert from 'node:assert/strict'
import {execFileSync, spawn} from 'node:child_process'
import {once} from 'node:events'
import {mkdtemp, readFile, rm} from 'node:fs/promises'
import {createServer} from 'node:http'
import {join, resolve} from 'node:path'

const workspace=await mkdtemp(join(process.env.TMPDIR||resolve('.cab-tests'),'cab-forge-refresh-'))
const web=join(workspace,'web')
const frontend=resolve('frontend')
const labels=[['GITLAB','GitLab'],['FORGEJO','Forgejo'],['GITHUB','GitHub']]
const project={
  id:'fixture',identifier:'fixture',name:'Projet de recette',root:'/projet',creation_state:'READY',
  public_metadata:{
    revision:1,state:'available',
    values:Object.fromEntries(labels.flatMap(([forge])=>[
      ['REMOTE_'+forge+'_BASE_URL','https://example.org'],
      ['REMOTE_'+forge+'_OWNER','groupe'],
      ['REMOTE_'+forge+'_REPOSITORY','projet'],
    ])),
    forge_repositories:Object.fromEntries(labels.map(([forge])=>[
      forge,{available:false,branch:'derniere-branche-valide',commit:'a'.repeat(40)},
    ])),
  },
}
const preview=`<!doctype html><meta charset="utf-8">
<iframe width="1100" height="810" src="/projects/fixture/forges"></iframe>
<script>
const frame=document.querySelector('iframe');
const find=selector=>frame.contentDocument.querySelector(selector);
const wait=async(read,label)=>{
  for(let attempt=0;attempt<200;attempt++){
    const value=await read();
    if(value)return value;
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  throw Error(label);
};
const check=(condition,label)=>{if(!condition)throw Error(label)};
const control=(dialog,title)=>Array.from(dialog.querySelectorAll('button')).find(button=>button.textContent===title);
const counts=()=>fetch('/counts').then(response=>response.json());
const send=value=>fetch('/observation',{method:'POST',body:JSON.stringify(value)});
(async()=>{
  await wait(async()=>(await counts()).automatic===3,'Les trois vérifications automatiques ont été demandées');
  check(!find('dialog[open]'),'Une vérification automatique a ouvert une fenêtre');
  for(const [forge,label] of ${JSON.stringify(labels)}){
    (await wait(()=>find('button[aria-label="Modifier '+label+'"]'),'Éditeur '+label)).click();
    const editor=await wait(()=>find('dialog[open] form'),'Champs '+label);
    check(editor.textContent.includes('REMOTE_'+forge+'_BASE_URL')&&!editor.textContent.includes('SSL_VERIFY'),'Champs TLS '+label);
    Array.from(editor.querySelectorAll('button')).find(control=>control.textContent==='Fermer').click();
    await wait(()=>!find('dialog[open]'),'Éditeur fermé '+label);
    const button=await wait(()=>find('button[aria-label="Rafraîchir l’état '+label+'"]'),label);
    button.click();
    const dialog=await wait(()=>find('dialog[open][aria-label="Détail du rafraîchissement '+label+'"]'),'Fenêtre '+label);
    check(dialog.querySelector('pre').textContent.includes('Tentative '+forge+' — Réponse HTTP 403.'),'Diagnostic '+label);
    check(find('.forge-card-'+forge.toLowerCase()).textContent.includes('aaaaaaaaaaaa'),'Dernier commit '+label);
    dialog.querySelector('button').click();
    await wait(()=>!find('dialog[open]'),'Fermeture '+label);
    check((await counts()).manual[forge]===1,'La fenêtre a rejoué la tentative '+label);
  }
  const button=find('button[aria-label="Rafraîchir l’état GitLab"]');
  button.click();
  await wait(async()=>(await counts()).manual.GITLAB===2&&button.getAttribute('aria-busy')==='false','Fin du rafraîchissement réussi');
  check(!find('dialog[open]'),'Le succès a ouvert une fenêtre');
  const sync=find('button[aria-label="Synchroniser GitLab"]');
  sync.click();
  let dialog=await wait(()=>find('dialog[open][aria-label="Synchroniser GitLab"]'),'Fenêtre de synchronisation');
  (await wait(()=>control(dialog,'Git local → Forge distante'),'Choix du sens local vers distant')).click();
  (await wait(()=>control(dialog,'Vérifier l’envoi précédent'),'Action de vérification de la synchronisation')).click();
  await wait(()=>dialog.textContent.includes('Les tags distants diffèrent'),'Protection maintenue après écart de tags');
  check(dialog.textContent.includes('Commit attendu')&&dialog.textContent.includes('Commit observé'),'Détail de la divergence');
  check(!control(dialog,'Synchroniser'),'Une divergence a permis la synchronisation');
  control(dialog,'Clore la tentative incertaine').click();
  await wait(()=>dialog.textContent.includes('Son résultat reste incertain'),'Tentative close avec reçu préservé');
  check((await counts()).previews===1,'La clôture a relancé un aperçu');
  control(dialog,'Préparer un nouvel aperçu').click();
  await wait(()=>control(dialog,'Synchroniser'),'Nouvel aperçu après réconciliation');
  check(dialog.textContent.includes('Destination GitLab'),'La forge est la destination');
  control(dialog,'Annuler').click();
  await wait(()=>!find('dialog[open]'),'Fermeture du nouvel aperçu');
  for(const [forge,label] of ${JSON.stringify(labels)}){
    find('button[aria-label="Synchroniser '+label+'"]').click();
    dialog=await wait(()=>find('dialog[open][aria-label="Synchroniser '+label+'"]'),'Choix du sens '+label);
    (await wait(()=>control(dialog,'Forge distante → Git local'),'Sens inverse '+label)).click();
    await wait(()=>control(dialog,'Synchroniser'),'Aperçu inverse '+label);
    check(dialog.textContent.includes('Destination Git local')&&dialog.textContent.includes('modifier-local'),'Le dépôt local est la destination '+label);
    control(dialog,'Annuler').click();
    await wait(()=>!find('dialog[open]'),'Fermeture du sens inverse '+label);
  }
  await send({passed:true});
})().catch(error=>send({error:error.message}));
</script>`

let server
try{
  execFileSync(process.execPath,['node_modules/typescript/bin/tsc','--noEmit'],{cwd:frontend,stdio:'inherit'})
  execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build','--logLevel','error','--outDir',web],{cwd:frontend,stdio:'inherit'})
  const index=(await readFile(join(web,'index.html'),'utf8')).replace('<head>',`<head><script>
    Object.defineProperty(navigator,'onLine',{get:()=>true});
    addEventListener('offline',event=>event.stopImmediatePropagation(),true);
  </script>`)
  const assets=new Map()
  for(const name of index.match(/\/assets\/[\w-]+\.(?:css|js)/g))assets.set(name,await readFile(web+name))
  const json=(response,value,status=200)=>response.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(value))
  let counters, report
  server=createServer(async(request,response)=>{
    const url=new URL(request.url,'http://localhost')
    const route=url.pathname
    try{
      if(route==='/observation'){
        let value=''
        for await(const chunk of request)value+=chunk
        report(JSON.parse(value))
        return response.writeHead(204).end()
      }
      if(route==='/counts')return json(response,counters)
      if(route==='/verification')return response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(preview)
      if(route==='/api/v1/health')return json(response,{initialized:true,state:'READY',csrf_token:'fixture'})
      if(route==='/api/v1/projects')return json(response,{projects:[project]})
      const gitRoute=route.match(/^\/api\/v1\/projects\/fixture\/forges\/(GITLAB|FORGEJO|GITHUB)\/(reconcile|sync-prepare|push-prepare|sync|push)$/)
      const gitAction=gitRoute?.[2]
      let body
      if(gitAction){
        let raw=''
        for await(const chunk of request)raw+=chunk
        body=JSON.parse(raw)
      }
      if(gitAction==='reconcile'){
        counters.checks++
        if(body.confirmation==='fixture-observation')return json(response,{reconciled:true,closed_unconfirmed:true,receipt_id:42})
        return json(response,{error:'forge-reconcile-tags-diverged',details:{
          branch:'main',expected:'a'.repeat(40),observed:'b'.repeat(40),tag_count:1,
          tags:[{ref:'refs/tags/ancien',before:'a'.repeat(40),after:''}],confirmation:'fixture-observation',
        }},409)
      }
      if(gitAction==='sync'||gitAction==='push'){
        counters.writes++
        return json(response,{error:'unexpected-write'},409)
      }
      if(gitAction){
        counters.previews++
        return counters.checks<2 ? json(response,{error:'forge-push-pending'},409)
          : json(response,{nonce:'fixture',branch:'main',local_branch:'travail',head:'a'.repeat(40),remote:'b'.repeat(40),dirty:false,
            source:body.source,changes:body.source==='remote'?[{ref:'refs/tags/modifier-local',before:'a',after:'b',action:'modifier'}]:[]})
      }
      if(/^\/api\/v1\/projects\/fixture\/forges\/(GITLAB|FORGEJO|GITHUB)$/.test(route)){
        const forge=route.split('/').at(-1)
        return json(response,{fields:{['REMOTE_'+forge+'_BASE_URL']:'https://example.org',['REMOTE_'+forge+'_SSL_VERIFY']:'1'},token:'',revision:'fixture'})
      }
      const match=route.match(/^\/api\/v1\/projects\/fixture\/forges\/(GITLAB|FORGEJO|GITHUB)\/refresh$/)
      if(match){
        if(url.searchParams.has('automatic')){
          counters.automatic++
          return json(response,{available:false})
        }
        const forge=match[1]
        const count=counters.manual[forge]=(counters.manual[forge]||0)+1
        return json(response,count===1 ? {available:false,diagnostics:'Tentative '+forge+' — Réponse HTTP 403.'} : {available:true})
      }
      if(route.startsWith('/api/v1/sync/')){
        return response.writeHead(200,{'Content-Type':'application/json','electric-offset':'0_0',
          'electric-handle':'fixture','electric-cursor':'1','electric-schema':'{}'})
          .end(JSON.stringify([{headers:{control:'up-to-date'}}]))
      }
      if(route.startsWith('/api/v1/'))return json(response,{})
      if(assets.has(route))return response.writeHead(200,{'Content-Type':route.endsWith('.js')?'text/javascript':'text/css'}).end(assets.get(route))
      if(route==='/projects/fixture/forges')return response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(index)
      response.writeHead(404).end()
    }catch(error){
      report({error:error.message})
      response.end()
    }
  }).listen(0,'127.0.0.1')
  await once(server,'listening')
  for(const [name,binary,args] of [
    ['Chromium','/usr/bin/chromium',['--headless','--no-sandbox','--disable-background-networking','--user-data-dir='+join(workspace,'chromium')]],
    ['Firefox','/usr/bin/firefox',['--headless','--no-remote','--profile',await mkdtemp(join(workspace,'firefox-'))]],
  ]){
    counters={automatic:0,manual:{},checks:0,previews:0,writes:0}
    const observation=new Promise(resolve=>{report=resolve})
    const child=spawn(binary,[...args,'http://127.0.0.1:'+server.address().port+'/verification'],{stdio:'ignore'})
    const closed=once(child,'close')
    const timer=setTimeout(()=>report({error:'Délai dépassé'}),30_000)
    try{
      const result=await Promise.race([observation,closed.then(([code])=>({error:'Arrêt '+code}))])
      assert.equal(result.passed,true,name+' — '+result.error)
      assert.deepEqual(counters,{automatic:3,manual:{GITLAB:2,FORGEJO:1,GITHUB:1},checks:2,previews:5,writes:0})
      console.log(name+' — diagnostic et réconciliation vérifiés, aucun envoi ni rejeu.')
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
