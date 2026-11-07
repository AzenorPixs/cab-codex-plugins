/** Collecteur OpenCode permanent, enfant SGS ; aucun tour LLM ni contenu conservé. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {runtimeRequest} from './cgpt-approval-bridge-runtime-client.mjs';
import {createOpenCodeV2ClientFromEnv,normalizeOpenCodeEvent} from './cgpt-approval-bridge-opencode-client.mjs';
import {openCodeTelemetry} from './cgpt-approval-bridge-native-telemetry.mjs';
import {processOwnerIdentity} from './cgpt-approval-bridge-process-lifecycle.mjs';
import {proofHash} from './cgpt-approval-bridge-maintenance-proof.mjs';
export const VERSION='2.4.6';
const socketPath=process.argv[2];
if(!socketPath?.startsWith('/'))throw new Error('sgs-collector-socket-required');
let closing=false;
const abort=new AbortController();
process.on('SIGTERM',()=>{closing=true;abort.abort();});process.on('SIGINT',()=>{closing=true;abort.abort();});
const call=(path,body)=>runtimeRequest('sgs',path,body,{socketPath,timeout:5000});
const fingerprints=new Map();
const projects=new Map(),dirty=new Set(),lastRead=new Map();
async function watch(project,client) {
  while(!closing) {
    try {
      const response=await client.events();let buffer='';const decoder=new TextDecoder();
      for await(const chunk of response.body) {
        buffer+=decoder.decode(chunk,{stream:true});if(buffer.length>1024*1024)throw new Error('native-frame-too-large');
        const frames=buffer.split(/\r?\n\r?\n/);buffer=frames.pop()||'';
        for(const frame of frames) {
          const text=frame.match(/^data:\s*(.+)$/m)?.[1];if(!text)continue;
          let event;try{event=normalizeOpenCodeEvent(JSON.parse(text));}catch{continue;}
          if(!event||event.directory&&event.directory!==project)continue;
          const props=event.properties||{};
          if(['session.idle','session.execution.succeeded','session.execution.failed','session.execution.interrupted','session.updated'].includes(event.type)||
            event.type==='message.updated'&&(props.info?.time?.completed||props.message?.time?.completed))dirty.add(project);
        }
      }
    }catch{if(closing)return;dirty.add(project);}
    if(!closing)await new Promise(resolve=>{const timer=setTimeout(done,1000);function done(){clearTimeout(timer);abort.signal.removeEventListener('abort',done);resolve();}abort.signal.addEventListener('abort',done,{once:true});});
  }
}
while(!closing) {
  try {
    const {sources}=await call('/sources');
    const due=new Set();
    for(const source of sources.filter(value=>value.source==='opencode-native')) {
      const project=source.binding.project;
      if(!projects.has(project)) {
        const client=createOpenCodeV2ClientFromEnv({directory:project,signal:abort.signal});
        projects.set(project,{client,watch:watch(project,client)});dirty.add(project);
      }
      if(dirty.has(project)||Date.now()-(lastRead.get(project)||0)>=30000||!lastRead.has(source.binding.binding))due.add(project);
    }
    for(const project of due)dirty.delete(project);
    for(const source of sources.filter(value=>value.source==='opencode-native')) {
      if(closing)break;
      const binding=source.binding;
      if(!due.has(binding.project))continue;
      try {
        const client=projects.get(binding.project).client;
        const native=await client.info(true),owner=await processOwnerIdentity(native.pid);
        if(!owner)throw new Error('native-instance-unavailable');
        const cgroupDigest=createHash('sha256').update(await readFile('/proc/'+native.pid+'/cgroup')).digest('hex');
        const instance='opencode-'+proofHash({workspace:binding.project,pid:native.pid,startTime:owner.startTime,uid:owner.uid,cgroupDigest});
        if(instance!==binding.instance)throw new Error('native-instance-divergent');
        const session=await client.session(binding.session,binding.project);
        if(session.id!==binding.session||session.directory!==binding.project)throw new Error('native-session-divergent');
        const messages=await client.messages(binding.session,binding.project);
        for(const message of messages) {
          const info=message.info;
          const times=[info?.time?.completed??info?.time?.created,...(message.parts||[]).flatMap(p=>[p.time?.created,p.time?.updated,p.time?.start,p.time?.end,p.state?.time?.start,p.state?.time?.end])].filter(Number.isSafeInteger);
          const sequence=times.length?Math.max(...times):null;
          if(!Number.isSafeInteger(sequence)||sequence<Date.parse(binding.started_at))continue;
          const event=openCodeTelemetry(info,{binding:binding.binding,sequence,at:new Date(sequence).toISOString(),parts:message.parts});
          if(!event)continue;
          const identity=binding.binding+'\0'+info.id;
          if(fingerprints.get(identity)===event.event_id)continue;
          await call('/events',event);fingerprints.set(identity,event.event_id);
        }
        await call('/collector/status',{binding:binding.binding,status:'collecting'});
        lastRead.set(binding.binding,Date.now());lastRead.set(binding.project,Date.now());
      }catch(error) {
        if(closing)break;
        const code=error.code||error.message;
        const reason=/^(?:opencode|native|runtime|sgs)-[a-z0-9-]{1,100}$/.test(code)?code:'native-observation-failed';
        try{await call('/collector/status',{binding:binding.binding,status:'native-source-unavailable',reason});}catch{}
      }
    }
    const active=new Set(sources.map(value=>value.binding.binding));
    for(const key of fingerprints.keys())if(!active.has(key.split('\0')[0]))fingerprints.delete(key);
  }catch{ /* Le parent possède les données ; reprise idempotente après IPC perdu. */ }
  if(!closing)await new Promise(resolve=>{const timer=setTimeout(done,5000);function done(){clearTimeout(timer);abort.signal.removeEventListener('abort',done);resolve();}abort.signal.addEventListener('abort',done,{once:true});});
}
