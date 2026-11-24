import assert from 'node:assert/strict'
import {execFileSync, spawn} from 'node:child_process'
import {once} from 'node:events'
import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises'
import {createServer} from 'node:http'
import {join, resolve} from 'node:path'

const root = await mkdtemp(resolve(process.env.TMPDIR||'.cab-tests','project-changes-browser-'))
const web = join(root, 'web')
const projects = [{id:'alpha', identifier:'alpha', name:'Alpha', creation_state:'READY'}]
const row = (identifier, day, archived=false) => ({
  identifier, title:identifier, source:identifier, tasks_done:1, tasks_total:2, archived,
  archived_at:archived?'2026-11-24':null, changed_at:'2026-11-'+day+'T12:00:00Z',
})
const record = change => ({id:change.identifier, catalogue:[change]})
const initial = [row('moins-recent','22'), row('recent','23'), row('archive','21',true)].map(record)
const moved = record(row('recent','24',true))
const preview = `<!doctype html><meta charset="utf-8"><iframe width="1100" height="800" src="/projects/alpha/changes"></iframe>
<script>
const frame=document.querySelector('iframe');
const doc=()=>frame.contentDocument;
const text=selector=>doc().querySelector(selector)?.textContent;
const find=selector=>doc().querySelector(selector);
async function wait(check,label){
  for(let pass=0;pass<300;pass++){
    if(check())return;
    await new Promise(resolve=>setTimeout(resolve,60));
  }
  throw Error(label+' · '+Array.from(doc().querySelectorAll('[role=status],[role=alert]'),element=>element.textContent).join(' · '));
}
async function report(value){
  await fetch('/result',{method:'POST',body:JSON.stringify(value)});
}
(async()=>{
  await wait(()=>text('.table-tabs [aria-current=page]')==='Ouverts','Onglet Ouverts');
  await wait(()=>text('tbody tr:first-child td')==='recent','Tri initial sur PostgreSQL');
  if(text('tbody tr:nth-child(2) td')!=='moins-recent')throw Error('Deuxième change attendu');
  find('button[aria-label="Actualiser recent"]').click();
  await wait(()=>doc().body.innerText.includes('Change actualisé.'),'Actualisation manuelle');
  await fetch('/archive');
  await wait(()=>text('tbody tr:first-child td')==='moins-recent','Mutation Electric dans Ouverts');
  find('.table-tabs a:last-child').click();
  await wait(()=>text('.table-tabs [aria-current=page]')==='Archivés'&&text('tbody tr:first-child td')==='recent','Mutation et tri dans Archivés');
  if(text('tbody tr:nth-child(2) td')!=='archive')throw Error('Archive précédente attendue');
  if(!find('td[data-label="Archivage"] time'))throw Error('Date d’archivage absente');
  await report({ok:true});
})().catch(error=>report({error:error.message}));
</script>`

function json(response, data, headers={}){
  response.writeHead(200,{'Content-Type':'application/json',...headers}).end(JSON.stringify(data))
}

let published = false
let refreshed = []
let result
let server
try {
  execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build','--logLevel','error','--outDir',web],
    {cwd:resolve('frontend'),stdio:'inherit'})
  const index = await readFile(join(web,'index.html'))
  const assets = new Map()
  for(const file of await readdir(join(web,'assets')))assets.set('/assets/'+file, await readFile(join(web,'assets',file)))
  server = createServer(async (request,response)=>{
    const url = new URL(request.url,'http://localhost')
    const path = url.pathname
    if(path==='/preview')return response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(preview)
    if(path==='/archive'){published=true;return response.writeHead(204).end()}
    if(path==='/result'){
      let body=''
      for await(const chunk of request)body+=chunk
      result(JSON.parse(body))
      return response.writeHead(204).end()
    }
    if(assets.has(path))return response.writeHead(200,{'Content-Type':path.endsWith('.css')?'text/css':'text/javascript'}).end(assets.get(path))
    if(path==='/api/v1/health')return json(response,{initialized:true,state:'READY',version:'fixture',csrf_token:'fixture'})
    if(path==='/api/v1/projects')return json(response,{projects})
    if(path==='/api/v1/projects/alpha/changes')return json(response,{changes:initial})
    if(path.endsWith('/refresh')){refreshed.push(path);return json(response,{refreshed:true})}
    if(path.startsWith('/api/v1/sync/')){
      const target=path.endsWith('/project-changes')&&url.searchParams.get('project_id')==='alpha'
      const live=url.searchParams.get('live')==='true'
      const records=target?(live?(published?[moved]:[]):initial):[]
      const send=()=>json(response,[
        ...records.map(value=>({key:value.id,value,headers:{operation:live?'update':'insert'}})),
        {headers:{control:'up-to-date'}},
      ],{'electric-offset':published?'2_0':'1_0','electric-handle':'fixture','electric-cursor':String(Date.now()),
        'electric-schema':'{}'})
      if(!live)return send()
      const timer=setTimeout(send,250)
      response.on('close',()=>clearTimeout(timer))
      return
    }
    if(path.startsWith('/api/v1/'))return json(response,{})
    response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(index)
  }).listen(0,'127.0.0.1')
  await once(server,'listening')
  const url='http://127.0.0.1:'+server.address().port+'/preview'
  for(const [name,command,args] of [
    ['Chromium','/usr/bin/chromium',['--headless','--no-sandbox','--disable-dev-shm-usage','--user-data-dir='+join(root,'chromium')]],
    ['Firefox','/usr/bin/firefox',['--headless','--no-remote','--profile',await mkdtemp(join(root,'firefox-'))]],
  ]){
    published=false
    refreshed=[]
    let timer
    const observation=new Promise(resolve=>{
      result=resolve
      timer=setTimeout(()=>resolve({error:name+' : délai dépassé'}),28000)
    })
    const browser=spawn(command,[...args,url],{stdio:'ignore'})
    const closed=once(browser,'close')
    try{
      assert.deepEqual(await observation,{ok:true})
      assert.deepEqual(refreshed,['/api/v1/projects/alpha/changes/recent/refresh'])
      console.log(name+' : onglets, tri, actualisation ciblée et archivage en direct validés.')
    }finally{
      clearTimeout(timer)
      browser.kill()
      await closed
    }
  }
}finally{
  server?.closeAllConnections()
  server?.close()
  await rm(root,{recursive:true,force:true})
}
