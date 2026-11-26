// Interface réelle du paquet, Chromium WebDriver et Firefox BiDi, sans dépendance npm.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from "node:net";
import {mkdir,mkdtemp,writeFile,cp,symlink} from "node:fs/promises";
import {resolve,join} from "node:path";
const root=await mkdtemp(resolve(process.env.TMPDIR||'.cab-tests','cycle-summary-browser-'));
const source=join(root,'frontend');
await mkdir(source);
for(const item of ['src','package.json','package-lock.json','tsconfig.json','index.html'])await cp(resolve('frontend',item),join(source,item),{recursive:true});
await symlink('/usr/lib/cab/frontend-dev/node_modules',join(source,'node_modules'),'dir');
const assets=join(root,'web');
const build=spawnSync('/home/devops/node/current/bin/npm',['run','build','--prefix',source,'--','--outDir',assets],{encoding:'utf8'});
if(build.status!==0)throw Error(build.stdout+build.stderr);
console.log('TypeScript et build Vite réussis');
const format=spawnSync(process.execPath,['--test','tests/stage-duration.test.mjs'],{encoding:'utf8'});
if(format.status!==0)throw Error(format.stdout+format.stderr);
console.log(format.stdout);
const children=[];const results=[];
const delay=ms=>new Promise(done=>setTimeout(done,ms));
async function wait(check,label){for(let n=0;n<150;n++){if(await check())return;await delay(100)}throw Error('timeout: '+label)}
async function port(){const s=createServer();await new Promise(done=>s.listen(0,'127.0.0.1',done));const p=s.address().port;await new Promise(done=>s.close(done));return p}
function child(command,args){const p=spawn(command,args,{stdio:'ignore'});children.push(p);return p}
async function wd(base,path,body){const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const v=await r.json();if(v.value?.error)throw Error(v.value.message);return v.value}
async function chromium(){const p=await port();child('/usr/bin/chromedriver',['--port='+p,'--log-level=SEVERE']);const base='http://127.0.0.1:'+p;await wait(async()=>{try{return(await fetch(base+'/status')).ok}catch{return false}},'chromedriver');const s=await wd(base,'/session',{capabilities:{alwaysMatch:{browserName:'chrome','goog:chromeOptions':{binary:'/usr/bin/chromium',args:['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--user-data-dir='+join(root,'chromium')]}}}});const path='/session/'+s.sessionId;return {name:'Chromium',version:s.capabilities.browserVersion,navigate:url=>wd(base,path+'/url',{url}),evaluate:script=>wd(base,path+'/execute/sync',{script:'return ('+script+');',args:[]}),viewport:(width,height)=>wd(base,path+'/window/rect',{width,height}),screenshot:async()=>writeFile(join(root,'chromium.png'),Buffer.from(await wd(base,path+'/screenshot'),'base64')),close:()=>fetch(base+path,{method:'DELETE'})}}
async function firefox(){const p=await port();const profile=join(root,'firefox');await mkdir(profile);child('/usr/bin/firefox',['--headless','--no-remote','--profile',profile,'--remote-debugging-port',String(p)]);let socket;await wait(async()=>{try{const s=new WebSocket('ws://127.0.0.1:'+p+'/session');await new Promise((ok,no)=>{s.addEventListener('open',ok,{once:true});s.addEventListener('error',no,{once:true})});socket=s;return true}catch{return false}},'Firefox');let id=0;const pending=new Map();socket.addEventListener('message',m=>{const v=JSON.parse(m.data);const a=pending.get(v.id);if(!a)return;pending.delete(v.id);v.type==='error'?a.reject(Error(v.message)):a.resolve(v.result)});const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}))});const session=await send('session.new',{capabilities:{}});const context=(await send('browsingContext.create',{type:'tab'})).context;return {name:'Firefox',version:session.capabilities.browserVersion,navigate:url=>send('browsingContext.navigate',{context,url,wait:'complete'}),evaluate:async expression=>{const r=await send('script.evaluate',{expression,target:{context},awaitPromise:false});if(r.type==='exception')throw Error('script exception');return r.result.value},viewport:(width,height)=>send('browsingContext.setViewport',{context,viewport:{width,height}}),screenshot:async()=>writeFile(join(root,'firefox.png'),Buffer.from((await send('browsingContext.captureScreenshot',{context,origin:'viewport'})).data,'base64')),close:async()=>{await send('session.end');socket.close()}}}
const {createServer:httpServer}=await import('node:http');
const {readFile}=await import('node:fs/promises');
const project={id:'fixture',identifier:'fixture',name:'Projet',root:'/fixture',creation_state:'READY'};
const run={mode:'piloted',session_id:'SID-DEMO',run_id:'RUN',change:'change-demo',state:'WORKING',suspension:'',monitor:{stage:12,cycle_steps:12,stages:Array.from({length:12},(_,i)=>'Étape '+(i+1)),phase:'PHASE FIXTURE',blocking_runs:[],terminal_gate:{branch:'TERMINÉ'},change_record:{tasks_total:1,tasks_done:1,tasks:[{id:1,label:'Tâche visible',completed:true}],source_state:'open',source_path:'tasks.md'}}};
const time='2026-11-22T12:00:00Z';
const tokenCounts=(input='1250',write='7654')=>({coder:{input_tokens:input,output_tokens:'1000000',cache_read_tokens:'0',cache_write_tokens:write},orchestrator:{input_tokens:'2345678901',output_tokens:'12',cache_read_tokens:null}});
const iterations=Array.from({length:12},(_,index)=>({
 id:index+1,number:index+1,duration_seconds:[15.8,641.2,3661.2,null][index]??null,
 state:index===11?'RUNNING':index===10?'CANCELLED':index===9?'UNKNOWN':'COMPLETED',started_at:time,ended_at:index===11?null:time,
 cab_seconds:3661.2,agent_seconds:641.2,waiting_seconds:15.8,description:'Passage '+(index+1),tokens:tokenCounts(index===4?'999000000':undefined),
}));
const actions=Array.from({length:12},(_,index)=>({
 ...iterations[index],id:101+index,parent_id:1,description:'Action visible '+(index+1),
}));
const shortAction={...actions[0],id:201,parent_id:2,description:'Action isolée'};
const cycles=Array.from({length:12},(_,index)=>({
 id:index+1,number:index+1,started_at:time,ended_at:time,duration_seconds:index===11?200:100,
 complete:true,tokens:index===11?tokenCounts():tokenCounts('1'),
}));
const metrics={piloted:true,tokens:tokenCounts(),session_tokens:tokenCounts(),cycles,
 cycle_summary:{iteration_count:2,measured_count:2,duration_complete:true,last_started_at:time,last_ended_at:time,last_duration_seconds:200,duration_seconds:300,cab_seconds:40,agent_seconds:200,waiting_seconds:60,tokens:tokenCounts()},
 complete_cycle_duration_seconds:64,
 stages:Array.from({length:12},(_,i)=>({key:'step-'+i,observed:true,iteration_count:12,cab_seconds:0,agent_seconds:26.5,waiting_seconds:0,tokens:tokenCounts('8983622'),
  iterations:[...iterations.slice(0,-1),{...iterations[11],...(i===1
   ?{state:'SKIPPED',duration_seconds:0,ended_at:time,tokens:undefined}
   :{tokens:tokenCounts('4570','9876')})}],children:[{iterations:[...actions,shortAction]}]})),
};
const metricsPath='projects/fixture/change-stage-metrics';
const changeList={changes:[{id:'fixture-change',identifier:'change-demo'}],has_more:false};
const fixtures={health:{initialized:true,state:'READY',version:'3.9.14',csrf_token:'fixture'},projects:{projects:[project]},run,finalization:{phase:'CLOSED',missing:[],evidence:[{id:1,source:'cab-operation',payload:{rule_id:'preuve visible',kind:'verification',result:'passed'}}]}};
let revision=1;
let metricsUnavailable=true;
let terminalRequests=0;
const fullWidthSession=`(()=>{
 const view=document.querySelector('.run-view');
 const block=document.querySelector('.run-session-block');
 const styles=getComputedStyle(view);
 const frame=view.getBoundingClientRect();
 const session=block.getBoundingClientRect();
 const leftInset=parseFloat(styles.paddingLeft)+parseFloat(styles.borderLeftWidth);
 const rightInset=parseFloat(styles.paddingRight)+parseFloat(styles.borderRightWidth);
 return !view.querySelector('.session-terminal')&&styles.maxWidth==='none'
   &&Math.abs(session.left-frame.left-leftInset)<1
   &&Math.abs(frame.right-rightInset-session.right)<1;
})()`;

const server=httpServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');const path=url.pathname;
 if(path==='/restore-metrics'){
  metricsUnavailable=false;revision++;
  res.end('ok');return;
 }
 if(path==='/mutate'){
  metrics.cycle_summary={...metrics.cycle_summary,iteration_count:3,duration_seconds:400,last_duration_seconds:100,tokens:tokenCounts('4567','9876')};metrics.cycles.at(-1).tokens=tokenCounts('4567','9876');revision++;
  res.end('ok');return;
 }
 if(path==='/api/v1/sync/run-data/run'){
  const version=Number((url.searchParams.get('offset')||'-1').split('_')[0]);
  if(version===revision)await delay(50);
  if(res.destroyed)return;
  const messages=version<revision?[{key:'run-1',headers:{operation:version<0?'insert':'update'},value:{id:'1',cycle_summary:JSON.stringify(metrics.cycle_summary)}}]:[];
  res.writeHead(200,{'content-type':'application/json','electric-handle':'fixture-run','electric-offset':revision+'_0','electric-cursor':String(revision),'electric-schema':JSON.stringify({id:{type:'int4'},cycle_summary:{type:'jsonb'}})});
  res.end(JSON.stringify([...messages,{headers:{control:'up-to-date'}}]));return;
 }
 if(path==='/api/v1/projects/fixture/runs/RUN/terminal'){
  terminalRequests++;
  res.writeHead(404);res.end();return;
 }
 if(path.startsWith('/api/v1/')){
  const key=path.slice(8);
  if(key===metricsPath&&url.searchParams.has('run_id')&&metricsUnavailable){
   res.writeHead(503,{'content-type':'application/json'});
   res.end(JSON.stringify({error:'fixture-detail-unavailable'}));return;
  }
  if(key===metricsPath){
   res.setHeader('content-type','application/json');
   res.end(JSON.stringify(url.searchParams.has('offset')?changeList:metrics));return;
  }
  if(key==='run'){
   res.writeHead(200,{'content-type':'application/json'});
   res.end(JSON.stringify({...run,cycle_summary:metrics.cycle_summary}));return;
  }
  res.writeHead(key.startsWith('sync/')?404:200,{'content-type':'application/json'});
  res.end(JSON.stringify(fixtures[key]??{}));
 }else{
  const asset=path.startsWith('/assets/');
  res.setHeader('content-type',asset?(path.endsWith('.css')?'text/css':'application/javascript'):'text/html');
  res.end(await readFile(assets+(asset?path:'/index.html')));
 }
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const url='http://127.0.0.1:'+server.address().port+'/projects/fixture/runs/RUN';
try{
 for(const factory of [chromium,firefox]){
  run.mode='piloted';metrics.piloted=true;
  metricsUnavailable=true;
  terminalRequests=0;
  metrics.cycle_summary={...metrics.cycle_summary,iteration_count:2,duration_seconds:300,last_duration_seconds:200,tokens:tokenCounts()};metrics.cycles.at(-1).tokens=tokenCounts();revision++;
  const browser=await factory();
  try{
   await browser.viewport(1440,900);
   await browser.navigate(url);
   const ev=browser.evaluate;
   await wait(()=>ev('!!document.querySelector(".run-card-title")'),'titre de session');
   assert(await ev(`(()=>{
    const block=document.querySelector('.run-session-block');
    const title=block.querySelector('h1');
    const header=title.parentElement;
    const card=header.parentElement;
    const info=block.querySelector('[role=tabpanel]:not([hidden])');
    const forge=document.createElement('h2');header.append(forge);
    const style=getComputedStyle(title);
    const same=['fontWeight','fontFamily'].every(k=>style[k]===getComputedStyle(forge)[k]);
    forge.remove();
    return same && header.tagName==='DIV' && getComputedStyle(header).position==='static' &&
      parseFloat(style.borderInlineStartWidth)>0 && parseFloat(getComputedStyle(header).borderBottomWidth)>0 &&
      card.previousElementSibling.getAttribute('role')==='tablist' && !info.querySelector('.badge') && !info.innerText.includes('PHASE FIXTURE');
   })()`),'titre et informations');
   assert(await ev(fullWidthSession),'Bloc de session pleine largeur sans terminal sur ordinateur');

   assert(await ev(`(()=>{const labels=Array.from(document.querySelectorAll('.run-information dt')).map(x=>x.textContent);return labels[0]==='Mandat courant' && labels[1]==='Étape' && labels.length===16 && labels.slice(8,13).join('|')==='Durée totale des cycles « Attente »|Tokens Entrant total des cycles|Tokens Sortant total des cycles|Tokens lus dans le cache total des cycles|Tokens écrits dans le cache total des cycles' && document.querySelector('.run-information').innerText.includes('5\\u202fmin 0\\u202fs')})()`),'informations et cumul des deux cycles');
   assert(await ev(`Array.from(document.querySelectorAll('.forge-card-content .run-information > div')).length===16 &&
     Array.from(document.querySelectorAll('.run-information > div')).every(row=>row.children.length===2 &&
       row.lastElementChild.getBoundingClientRect().left>row.firstElementChild.getBoundingClientRect().left &&
       Math.abs(row.lastElementChild.getBoundingClientRect().top-row.firstElementChild.getBoundingClientRect().top)<1)`),'une ligne libellé/valeur par information');
   assert(await ev('document.querySelector(".run-information").innerText.includes("1,25\u202fK")'),'totaux Informations avec détail des étapes indisponible');
   assert(await ev(`(()=>{const rows=Array.from(document.querySelectorAll('.run-information > div'));const write=rows.find(row=>row.firstElementChild.textContent==='Tokens écrits dans le cache total des cycles');return write.lastElementChild.innerText.includes('7,65')&&write.lastElementChild.innerText.includes('Orchestrateur : —')})()`),'écritures observées et absentes par rôle');
   const click=label=>ev(`Array.from(document.querySelectorAll('[role=tab]')).find(x=>x.textContent===${JSON.stringify(label)}).click() || true`);
   await click('Finalisation');
   assert(await ev('document.body.innerText.includes("preuve visible") && !document.querySelector(".run-session-card details")'));
   await click('Change');
   assert(await ev('document.body.innerText.includes("Tâche visible")'));
   await click('Étapes du cycle');
   assert(await ev('document.querySelectorAll(".run-cycle-tabs [role=tab]").length===13 && document.querySelector(".cycle-total strong").textContent==="Totale de tous les cycles" && !document.body.innerText.includes("Total de la session") && document.body.innerText.includes("Dernier Cycle")'));
   assert(await ev(`parseFloat(getComputedStyle(document.querySelector('.run-cycle-heading p')).borderInlineStartWidth)>0`),'barre verticale');
   await fetch(new URL('/mutate',url));
   await wait(()=>ev(`document.body.innerText.includes('6\\u202fmin 40\\u202fs') && document.body.innerText.includes('1\\u202fmin 40\\u202fs')`),'actualisation Electric sans navigation');
   await click('Informations');
   await wait(()=>ev('document.querySelector(".run-information").innerText.includes("4,57\u202fK")'),'tokens Informations actualisés via Electric sans le détail');
   await click('Étapes du cycle');
   await fetch(new URL('/restore-metrics',url));
   await wait(()=>ev('document.querySelector(".run-cycle-heading").innerText.includes("4,57\u202fK")'),'tokens du dernier cycle actualisés');
   assert(await ev("document.querySelector('.run-cycle-heading').innerText.includes('9,88') && document.querySelector('.cycle-total').innerText.includes('9,88')"),'écritures du dernier cycle et du cumul actualisées');
   assert(await ev('document.querySelector(".run-cycle-heading").innerText.includes("2,35\u202fB")'));
   assert(await ev('document.querySelector(".run-cycle-heading").innerText.includes("1\u202fM")'));
   assert(await ev(`(()=>{
    const table=document.querySelector('table[aria-label="Itérations du cycle"]');
    return table.tBodies[0].rows.length===12 && table.tBodies[0].rows[11].cells[0].textContent==='12'
      && !table.closest('[role=tabpanel]').querySelector('input[type="search"],nav[aria-label^="Pagination"]');
   })()`),'Douze cycles accessibles directement dans le Résumé');
   await browser.viewport(1920,900);
   for(let stage=1;stage<=12;stage++){
    await click(String(stage));
    await wait(()=>ev('document.body.innerText.includes("Action visible 12")'),'actions de l’étape');
    assert(await ev(`(()=>{const frame=document.querySelector('.stage-metadata');const tokens=frame.querySelector('.stage-token-totals');const durations=frame.querySelector('.stage-duration-totals');return tokens.getBoundingClientRect().left>=durations.getBoundingClientRect().right && tokens.innerText.includes('8,98\u202fM') && durations.innerText.includes('Attente')})()`),'cumuls dans le même bloc à droite, étape '+stage);
    assert(await ev(`(()=>{const table=document.querySelector('.stage-overview section table');const headers=Array.from(table.querySelectorAll('th')).map(x=>x.textContent);const durations=Array.from(document.querySelectorAll('.stage-overview section table tbody tr:not(.table-filler)')).map(row=>row.children[4].textContent.replaceAll('\\u202f',' '));return headers[3]==='Retour ou validation' && headers[4]==='Durée' && headers.slice(5,-1).join('|')==='TeCodeur|TsCodeur|TrCodeur|TwCodeur|TeOrchestrateur|TsOrchestrateur|TrOrchestrateur|TwOrchestrateur' && table.tBodies[0].rows[0].cells[8].textContent.includes('7,65') && table.tBodies[0].rows[0].cells[12].textContent==='—' && JSON.stringify(durations.slice(0,4))===JSON.stringify(['15,8 s','10 m 41,2 s','1 h 1 m 1,2 s','Non observée'])})()`),'durées de l’étape '+stage);
    assert(await ev(`(()=>{
     const overview=document.querySelector('.stage-overview');
     const [passages,actionTable,shortTable]=overview.querySelectorAll('table');
     return passages.tBodies[0].rows.length===12 && passages.tBodies[0].rows[11].cells[0].textContent==='12'
       && actionTable.tBodies[0].rows.length===12 && actionTable.tBodies[0].rows[11].cells[0].textContent==='Action visible 12'
       && shortTable.tBodies[0].rows.length===3 && shortTable.querySelectorAll('.table-filler').length===2
       && !overview.querySelector('input[type="search"],nav[aria-label^="Pagination"]');
    })()`),'Itérations et actions sans pagination ni recherche, étape '+stage);
    const compactTable=JSON.parse(await ev(`(()=>{
     const table=document.querySelector('.stage-passages-compact');
     const [head,counts]=table.tHead.rows;
     const headers=Array.from(head.cells,cell=>cell.textContent).join('|');
     const tokenHeaders=Array.from(counts.cells,cell=>cell.textContent).join('|');
     const [first,second]=table.tBodies[0].rows;
     const last=table.tBodies[0].rows[11].cells[22];
     const icon=last.querySelector(${stage}===2?'.stage-cycle-skipped':'.stage-cycle-spinner');
     const cancelled=table.tBodies[0].rows[10].cells[22];
     const warning=cancelled.querySelector('.stage-cycle-warning');
     const unknown=table.tBodies[0].rows[9].cells[22];
     const question=unknown.querySelector('.stage-cycle-unknown');
     const completed=first.cells[22].querySelector('.stage-cycle-completed');
     const tokenWidths=Array.from(first.cells).slice(6,22).map(cell=>cell.getBoundingClientRect().width);
     const wideToken=table.tBodies[0].rows[4].cells[6].querySelector('.stage-cycle-slot>span');
     const fixedExamples=Array.from(first.cells).slice(0,6).map(cell=>cell.querySelector('.stage-cycle-slot').dataset.sizeExample);
     const stageHeading=document.querySelector('.stage-cycle-heading');
     const stageTitle=stageHeading.querySelector('h2');
     const titleIcon=stageTitle.querySelector('[role=img]');
     const lastSummary=stageHeading.querySelector('.cycle-token-summary').textContent;
     const skipped=${stage}===2;
     const date=first.cells[1];
     const padding=parseFloat(getComputedStyle(head.cells[0]).paddingInlineStart)*2;
     const wrapper=table.parentElement;
     const tokens='Te|CTe|Ts|CTs|Tr|CTr|Tw|CTw';
     const overflow=Math.max(0,wrapper.scrollWidth-wrapper.clientWidth);
     return JSON.stringify({
      headers:headers==='Cycle|Début|Fin|CAB|Agents|Attentes|Codeur|Orchestrateur|État' && tokenHeaders===tokens+'|'+tokens,
      widths:fixedExamples[0]==='Cycle\u00a0\u00a0'
        && fixedExamples.slice(1,3).every(example=>example==='00/00/0000 00:00:00\u00a0\u00a0\u00a0')
        && fixedExamples.slice(3).every(example=>example==='9999,9\u202fs\u00a0\u00a0\u00a0')
        && Math.abs(first.cells[1].clientWidth-first.cells[2].clientWidth)<=1
        && Math.abs(first.cells[3].clientWidth-first.cells[5].clientWidth)<=1,
      fixedTokens:Math.max(...tokenWidths)-Math.min(...tokenWidths)<.5
        && Array.from(first.cells).slice(6,22).every(cell=>cell.querySelector('.stage-cycle-slot').dataset.sizeExample==='999\u202fM\u202f')
        && wideToken.textContent==='999\u202fM' && wideToken.scrollWidth<=wideToken.clientWidth,
      durations:Array.from(first.cells).slice(3,6).map(cell=>cell.textContent.replaceAll('\u202f',' ')).join('|')==='1 h 1 m 1,2 s|10 m 41,2 s|15,8 s',
      fillsWidth:Math.abs(table.getBoundingClientRect().right-wrapper.getBoundingClientRect().right)<=1,
      singleLine:first.cells.length===23 && getComputedStyle(date).whiteSpace==='nowrap',
      counters:first.cells[6].textContent.includes('1,25') && second.cells[10].textContent==='0'
        && second.cells[14].textContent.includes('2,35') && second.cells[20].textContent==='—',
      reserved:Array.from(table.tBodies[0].rows).every(row=>[7,9,11,13,15,17,19,21].every(col=>row.cells[col].textContent==='')),
      lastIcon:last.textContent.includes(skipped?'Non exécuté':'En cours') && icon?.getAttribute('aria-hidden')==='true'
        && (skipped?getComputedStyle(icon).color==='rgb(100, 107, 115)':getComputedStyle(icon).animationName==='stage-cycle-spin')
        && titleIcon?.getAttribute('aria-label')===(skipped?'Non exécuté':'En cours')
        && Math.abs(titleIcon.getBoundingClientRect().width-parseFloat(getComputedStyle(stageTitle).fontSize))<=1,
      lastSummary:lastSummary.includes('Dernier Cycle de cette étape')
        && lastSummary.includes(skipped?'Durée : 0\u202fs':'Durée : —')
        && lastSummary.includes(skipped?'Token/Entrant : —':'Token/Entrant : 4,57\u202fK')
        && lastSummary.includes('Token/Sortant') && lastSummary.includes('Tokens lus dans le cache')
        && lastSummary.includes('Tokens écrits dans le cache') && !lastSummary.includes('8,98'),
      cancelled:cancelled.textContent.includes('Annulé') && warning?.getAttribute('aria-hidden')==='true'
        && warning.querySelector('path').getAttribute('fill')==='#f4c542' && !first.querySelector('.stage-cycle-warning'),
      unknown:unknown.textContent.includes('Indéterminé') && question?.getAttribute('aria-hidden')==='true'
        && question.querySelector('circle').getAttribute('fill')==='#1766b1' && !first.querySelector('.stage-cycle-unknown'),
      completed:first.cells[22].textContent.includes('Terminé') && completed?.getAttribute('aria-hidden')==='true'
        && getComputedStyle(completed).color==='rgb(33, 128, 73)' && !last.querySelector('.stage-cycle-completed'),
      overflow:overflow>0?{viewport:innerWidth,available:wrapper.clientWidth,table:wrapper.scrollWidth,
        columns:Array.from(first.cells,cell=>cell.clientWidth),padding,font:getComputedStyle(date).fontSize}:0
     });
    })()`));
    assert.deepEqual(compactTable,{headers:true,widths:true,fixedTokens:true,durations:true,fillsWidth:true,singleLine:true,counters:true,reserved:true,lastIcon:true,lastSummary:true,cancelled:true,unknown:true,completed:true,overflow:0},
      'Tableau piloté et dernier cycle sans défilement à 1 920 px, étape '+stage);
   }
   await browser.viewport(390,844);
   assert(await ev('document.documentElement.scrollWidth<=innerWidth+1'));
   assert(await ev(`(()=>{
    const table=document.querySelector('.stage-passages-compact');
    const wrapper=table.parentElement;
    wrapper.scrollLeft=wrapper.scrollWidth;
    const last=table.tBodies[0].rows[11].lastElementChild;
    return wrapper.scrollLeft>0 && last.getBoundingClientRect().right<=wrapper.getBoundingClientRect().right+1
      && getComputedStyle(last).whiteSpace==='nowrap' && last.innerText.includes('Passage 12');
   })()`),'Défilement horizontal limité au tableau sur mobile, état intégralement accessible');
   assert(await ev(fullWidthSession),'Bloc de session pleine largeur sans terminal sur mobile');
   assert.equal(terminalRequests,0,'Aucune requête de terminal depuis le détail de session');
   assert(await ev(`(()=>{const frame=document.querySelector('.stage-metadata');const tokens=frame.querySelector('.stage-token-totals');const durations=frame.querySelector('.stage-duration-totals');return tokens.getBoundingClientRect().top>=durations.getBoundingClientRect().bottom})()`),'cumuls sous les durées dans le même encadré sur mobile');
   await browser.screenshot();

   await browser.viewport(1440,900);
   run.mode='direct';metrics.piloted=false;
   await browser.navigate(url);
   await wait(()=>ev('!!document.querySelector(".run-card-title")'),'session directe');
   await click('Étapes du cycle');
   await click('1');
   await wait(()=>ev('!!document.querySelector(".stage-passages-compact")'),'tableau de la session directe');
   const directTable=JSON.parse(await ev(`(()=>{
    const table=document.querySelector('.stage-passages-compact');
    const wrapper=table.parentElement;
    const headers=Array.from(table.tHead.rows[0].cells,cell=>cell.textContent).join('|');
    return JSON.stringify({rows:table.tHead.rows.length,headers,overflow:Math.max(0,wrapper.scrollWidth-wrapper.clientWidth)});
   })()`));
   assert.deepEqual(directTable,{rows:1,headers:'Cycle|Début|Fin|CAB|Agents|Attentes|Te|CTe|Ts|CTs|Tr|CTr|Tw|CTw|État',overflow:0},
    'Tableau direct sans défilement à 1 440 px');
   const measureColumns=`JSON.stringify(Array.from(document.querySelector('.stage-passages-compact tbody tr').cells,cell=>cell.getBoundingClientRect().width))`;
   const narrowColumns=JSON.parse(await ev(measureColumns));
   await browser.viewport(1760,900);
   const widerColumns=JSON.parse(await ev(measureColumns));
   assert(widerColumns.at(-1)>narrowColumns.at(-1)
    && widerColumns.slice(0,-1).every((width,i)=>Math.abs(width-narrowColumns[i])<1),
    'Seule la colonne État grandit lorsque la résolution augmente');
   await browser.viewport(1440,900);
   run.mode='piloted';metrics.piloted=true;
   await browser.navigate(new URL('/projects/fixture',url).href);
   await wait(()=>ev(`!!document.querySelector('select option[value="fixture-change"]')`),'sélecteur de change sur l’accueil projet');
   await ev(`(()=>{
    const select=document.querySelector('select option[value="fixture-change"]').parentElement;
    select.value='fixture-change';
    select.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
   })()`);
   await wait(()=>ev(`!!document.querySelector('table[aria-label="Itérations du cycle"]')`),'tableaux de l’accueil projet');
   assert(await ev(`(()=>{
    const cycles=document.querySelector('table[aria-label="Itérations du cycle"]');
    const overview=document.querySelector('.stage-overview');
    overview.closest('details').open=true;
    const [passages,actionTable]=overview.querySelectorAll('table');
    actionTable.closest('details').open=true;
    return [cycles,passages,actionTable].every(table=>{
     const nav=table.parentElement.nextElementSibling;
     return table.tBodies[0].rows.length===10 && nav.innerText.includes('Page 1 / 2')
       && nav.querySelector('input[type="search"]').previousElementSibling.textContent==='Dernier';
    });
   })()`),'Pagination et recherche conservées sur l’accueil projet');
   console.log(browser.name+' '+browser.version+' : Résumé et étapes 1 à 12 sans pagination ni recherche, accueil projet vérifié, actualisation Electric et rendu mobile vérifiés');
  } finally{await browser.close()}
 }
}finally{server.close();for(const p of children)if(p.exitCode===null)p.kill('SIGTERM')}
