// Interface réelle du paquet, Chromium WebDriver et Firefox BiDi, sans dépendance npm.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const root=await mkdtemp(resolve('output/scm/cab-3.0.0/browser-'));
const children=[];const results=[];
const delay=ms=>new Promise(done=>setTimeout(done,ms));
async function wait(check,label){for(let n=0;n<150;n++){if(await check())return;await delay(100)}throw Error('timeout: '+label)}
async function port(){const s=createServer();await new Promise(done=>s.listen(0,'127.0.0.1',done));const p=s.address().port;await new Promise(done=>s.close(done));return p}
function child(command,args){const p=spawn(command,args,{stdio:'ignore'});children.push(p);return p}
async function wd(base,path,body){const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const v=await r.json();if(v.value?.error)throw Error(v.value.message);return v.value}
async function chromium(){const p=await port();child('/usr/bin/chromedriver',['--port='+p,'--log-level=SEVERE']);const base='http://127.0.0.1:'+p;await wait(async()=>{try{return(await fetch(base+'/status')).ok}catch{return false}},'chromedriver');const s=await wd(base,'/session',{capabilities:{alwaysMatch:{browserName:'chrome','goog:chromeOptions':{binary:'/usr/bin/chromium',args:['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--user-data-dir='+join(root,'chromium')]}}}});const path='/session/'+s.sessionId;return {name:'Chromium',version:s.capabilities.browserVersion,navigate:url=>wd(base,path+'/url',{url}),evaluate:script=>wd(base,path+'/execute/sync',{script:'return ('+script+');',args:[]}),viewport:(width,height)=>wd(base,path+'/window/rect',{width,height}),screenshot:async()=>writeFile(join(root,'chromium.png'),Buffer.from(await wd(base,path+'/screenshot'),'base64')),close:()=>fetch(base+path,{method:'DELETE'})}}
async function firefox(){const p=await port();const profile=join(root,'firefox');await mkdir(profile);child('/usr/bin/firefox',['--headless','--no-remote','--profile',profile,'--remote-debugging-port',String(p)]);let socket;await wait(async()=>{try{const s=new WebSocket('ws://127.0.0.1:'+p+'/session');await new Promise((ok,no)=>{s.addEventListener('open',ok,{once:true});s.addEventListener('error',no,{once:true})});socket=s;return true}catch{return false}},'Firefox');let id=0;const pending=new Map();socket.addEventListener('message',m=>{const v=JSON.parse(m.data);const a=pending.get(v.id);if(!a)return;pending.delete(v.id);v.type==='error'?a.reject(Error(v.message)):a.resolve(v.result)});const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}))});const session=await send('session.new',{capabilities:{}});const context=(await send('browsingContext.create',{type:'tab'})).context;return {name:'Firefox',version:session.capabilities.browserVersion,navigate:url=>send('browsingContext.navigate',{context,url,wait:'complete'}),evaluate:async expression=>{const r=await send('script.evaluate',{expression,target:{context},awaitPromise:false});if(r.type==='exception')throw Error('script exception');return r.result.value},viewport:(width,height)=>send('browsingContext.setViewport',{context,viewport:{width,height}}),screenshot:async()=>writeFile(join(root,'firefox.png'),Buffer.from((await send('browsingContext.captureScreenshot',{context,origin:'viewport'})).data,'base64')),close:async()=>{await send('session.end');socket.close()}}}
try{
  const suffix=Date.now();
  for(const factory of [chromium,firefox]){
    const browser=await factory();try{
      await browser.navigate('http://127.0.0.1:18092/administration/projects');
      await wait(()=>browser.evaluate('Boolean(document.querySelector("input[name=username]"))'),'login');
      await browser.evaluate('(()=>{document.querySelector("input[name=username]").value="fixture-admin";document.querySelector("input[name=password]").value="synthetic-fixture-password";document.querySelector("form").requestSubmit();return true})()');
      await wait(()=>browser.evaluate('Boolean(document.querySelector("input[name=projects_root]"))'),'POSIX settings');
      await browser.evaluate('(()=>{const set=(name,value)=>{const field=document.querySelector(`input[name=${name}]`);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(field,value);field.dispatchEvent(new Event("input",{bubbles:true}))};set("projects_root","/tmp/cab-projects-browser-root");set("projects_user","root");set("projects_group","root");return true})()');
      await browser.evaluate('(()=>{document.querySelector(".settings-form").requestSubmit();return true})()');
      await wait(()=>browser.evaluate('document.body.innerText.includes("Configuration enregistrée.")'),'settings saved');
      await browser.navigate('http://127.0.0.1:18092/projects');
      await wait(()=>browser.evaluate('Boolean(document.querySelector(".project-sidebar .add-project"))'),'sidebar');
      await browser.evaluate('(()=>{document.querySelector(".add-project").click();return true})()');
      await wait(()=>browser.evaluate('location.pathname==="/projects/new" && Boolean(document.querySelector("input[name=project_name]"))'),'creation page');
      const folder='browser-'+browser.name.toLowerCase()+'-'+suffix;
      await browser.evaluate('(()=>{const set=(name,value)=>{const field=document.querySelector(`input[name=${name}]`);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(field,value);field.dispatchEvent(new Event("input",{bubbles:true}))};set("project_name",'+JSON.stringify('Projet '+browser.name+' '+suffix)+');set("project_folder",'+JSON.stringify(folder)+');return true})()');
      await browser.evaluate('(()=>{document.querySelector(".create-project form").requestSubmit();return true})()');
      await wait(()=>browser.evaluate('location.pathname.startsWith("/projects/") && location.pathname!=="/projects/new" && document.querySelector(".project-sidebar .selected")?.innerText.includes('+JSON.stringify('Projet '+browser.name+' '+suffix)+')'),'project created and selected');
      assert(await browser.evaluate('document.querySelector(".project-content .project-path").innerText.endsWith('+JSON.stringify('/'+folder)+')'));
      await browser.viewport(1440,1000);await browser.screenshot();
      await browser.viewport(390,844);assert(await browser.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'));
      results.push({browser:browser.name,version:browser.version,posix_settings_saved:true,sidebar_plus:true,create_url:'/projects/new',project_created:true,selected_in_sidebar:true,mobile:true,folder});
    }catch(error){await browser.screenshot();console.error('DOM',await browser.evaluate('document.body.innerText'));throw error}finally{await browser.close()}
  }
  await writeFile(resolve('output/scm/cab-3.0.0/projects-browser-proof.json'),JSON.stringify({results,screenshots:root},null,2)+'\n');console.log(JSON.stringify(results));
}finally{for(const p of children)if(p.exitCode===null)p.kill('SIGTERM')}
