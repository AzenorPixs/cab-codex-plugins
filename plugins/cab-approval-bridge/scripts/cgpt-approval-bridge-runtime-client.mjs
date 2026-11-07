/** IPC local SGS/CCAB ; aucun secret ni payload métier dans la télémétrie. */
import { request } from 'node:http';
import { mkdir, open, readdir, readFile, unlink, lstat,rename } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join,isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import {randomUUID} from 'node:crypto';

export const VERSION = '2.4.9';
const key = /^[A-Za-z0-9][A-Za-z0-9_.:/+@-]{0,255}$/;
export const stateRootDirectory=home=>{
  const root=process.env.OC_Codex_RUNTIME_STATE_ROOT||process.env.OC_CGPT_RUNTIME_STATE_ROOT||join(home||homedir(),'.local/state');
  if(!isAbsolute(root))throw new Error('runtime-state-root-invalid');return root;
};
export function runtimeRequest(component, path, body, { home = homedir(), timeout = 3000,socketPath,maxResponseBytes=16*1024*1024 } = {}) {
  if (!['sgs', 'ccab'].includes(component) || !path.startsWith('/') || path.includes('\n')) throw new Error('runtime-target-invalid');
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
    const call = request({ socketPath: socketPath||join(stateRootDirectory(home),'cab-approval-bridge', component, component + '.sock'),
      path, method: data ? 'POST' : 'GET', headers: data ? { 'content-type': 'application/json', 'content-length': data.length } : {} }, response => {
      let size = 0; const chunks = [];
      response.on('data', chunk => { size += chunk.length; if (size > maxResponseBytes) call.destroy(new Error('runtime-response-too-large')); else chunks.push(chunk); });
      response.on('error', reject);
      response.on('end', () => { try { const value = JSON.parse(Buffer.concat(chunks));
        if (response.statusCode !== 200) reject(Object.assign(new Error(value.error || 'runtime-request-failed'), { status: response.statusCode }));
        else resolve(value);
      } catch (error) { reject(error); } });
    });
    call.setTimeout(timeout, () => call.destroy(new Error('runtime-request-timeout')));
    call.on('error', reject); call.end(data);
  });
}

async function outboxDirectory(home) {
  const directory = join(stateRootDirectory(home),'cab-approval-bridge/sgs-outbox');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const info = await lstat(directory);
  if (!info.isDirectory() || info.uid !== process.getuid() || (info.mode & 0o077)) throw new Error('sgs-outbox-not-private');
  return directory;
}

async function queueStatistics(route,payload,{home=homedir(),maxBytes=32*1024*1024}={}) {
  const directory=await outboxDirectory(home),bytes=Buffer.from(JSON.stringify(payload));
  const id=createHash('sha256').update(payload.binding+'\0'+(payload.event_id||route)).digest('hex');
  const path=join(directory,(route==='/bindings'?'binding-':route==='/sources'?'source-':'')+id+'.json');
  try {
    const info=await lstat(path);
    if(!info.isFile()||info.uid!==process.getuid()||(info.mode&0o077)||!bytes.equals(await readFile(path)))throw new Error('sgs-outbox-event-conflict');
    return {status:'queued',event_id:payload.event_id};
  }catch(error){if(error.code!=='ENOENT')throw error;}
  let size=0;
  for(const name of await readdir(directory)){const info=await lstat(join(directory,name));if(info.isFile())size+=info.size;}
  if(bytes.length>1024*1024||size+bytes.length>maxBytes)return {status:'unavailable',reason:'sgs-outbox-capacity',event_id:payload.event_id};
  let file;
  try{file=await open(path,'wx',0o600);await file.writeFile(bytes);await file.sync();}
  catch(error){if(error.code!=='EEXIST')throw error;if(!bytes.equals(await readFile(path)))throw new Error('sgs-outbox-event-conflict');}
  finally{await file?.close();}
  return {status:'queued',event_id:payload.event_id};
}

export async function registerStatisticsBinding(binding,options={}) {
  try{return await runtimeRequest('sgs','/bindings',binding,{...options,timeout:500});}
  catch(error){if(error.status)throw error;return queueStatistics('/bindings',binding,options);}
}
export async function registerStatisticsSource(source,options={}) {
  if(options.defer)return queueStatistics('/sources',source,options);
  try{return await runtimeRequest('sgs','/sources',source,{...options,timeout:500});}
  catch(error){if(error.status)throw error;return queueStatistics('/sources',source,options);}
}

export async function emitStatistics(event,options={}) {
  if(!event||!key.test(event.binding)||!key.test(event.event_id))throw new Error('sgs-event-identity-invalid');
  if(options.defer)return queueStatistics('/events',event,options);
  try{return await runtimeRequest('sgs','/events',event,{...options,timeout:500});}
  catch(error){if(error.status)throw error;return queueStatistics('/events',event,options);}
}

export async function queueComponentCheckpoint(body,{home=homedir()}={}) {
  const directory=await outboxDirectory(home),id=createHash('sha256').update(body.project+'\0'+body.component).digest('hex');
  const path=join(directory,'checkpoint-'+id+'.json'),bytes=Buffer.from(JSON.stringify(body));
  if(bytes.length>64*1024*1024)throw new Error('sgs-checkpoint-outbox-capacity');
  if(await lstat(path).catch(error=>{if(error.code==='ENOENT')return null;throw error;})) {
    const info=await lstat(path);if(!info.isFile()||info.uid!==process.getuid()||info.mode&0o077)throw new Error('sgs-checkpoint-outbox-unsafe');
    const old=JSON.parse(await readFile(path,'utf8'));if(old.sequence>body.sequence)return {status:'queued-newer'};
  }
  const candidate=path+'.candidate-'+randomUUID(),file=await open(candidate,'wx',0o600);
  try{await file.writeFile(bytes);await file.sync();}finally{await file.close();}
  await rename(candidate,path);
  const parent=await open(directory,'r');try{await parent.sync();}finally{await parent.close();}
  return {status:'queued'};
}

export async function flushStatistics({ home = homedir(), limit = 100 } = {}) {
  const directory = await outboxDirectory(home); let acknowledged = 0;
  const priority=name=>name.startsWith('binding-')?0:name.startsWith('source-')?1:2;
  for (const name of (await readdir(directory)).filter(name => /^(?:binding-|source-|checkpoint-)?[a-f0-9]{64}\.json$/.test(name)).sort((a,b)=>priority(a)-priority(b)||a.localeCompare(b)).slice(0, limit)) {
    const path = join(directory, name), info = await lstat(path);
    if (!info.isFile() || info.uid !== process.getuid() || (info.mode & 0o077) || info.size > (name.startsWith('checkpoint-')?64:1) * 1024 * 1024) throw new Error('sgs-outbox-file-invalid');
    const event = JSON.parse(await readFile(path, 'utf8'));
    try { await runtimeRequest('sgs', name.startsWith('binding-')?'/bindings':name.startsWith('source-')?'/sources':name.startsWith('checkpoint-')?'/component/checkpoint':'/events', event, { home }); }
    catch (error) { return { acknowledged, remaining: true, error: error.status ? error.message : 'sgs-unavailable' }; }
    await unlink(path); acknowledged++;
  }
  return { acknowledged };
}
