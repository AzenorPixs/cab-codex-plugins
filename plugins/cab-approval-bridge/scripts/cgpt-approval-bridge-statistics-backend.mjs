/** Persistance statistique détenue par SGS, avec outbox temporaire au producteur. */
import {execFileSync} from 'node:child_process';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFileSync,existsSync,unlinkSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runtimeRequest,queueComponentCheckpoint,stateRootDirectory} from './cgpt-approval-bridge-runtime-client.mjs';
export const VERSION='2.4.28';
export class StatisticsBackend {
  constructor(project,component,{home=homedir(),legacyPath}={}) {this.project=project;this.component=component;this.home=home;this.legacyPath=legacyPath;this.sequence=0;this.pending=Promise.resolve();}
  child(component,legacyPath){return new StatisticsBackend(this.project,component,{home:this.home,legacyPath});}
  readSync() {
    const root=stateRootDirectory(this.home);
    const data=JSON.parse(execFileSync('/usr/bin/python3',['-B',fileURLToPath(new URL('./cgpt-approval-bridge-checkpoint-read.py',import.meta.url)),
      '--state-root',root,'--project',this.project,'--component',this.component],{encoding:'utf8',maxBuffer:64*1024*1024,timeout:5000}));
    const id=createHash('sha256').update(this.project+'\0'+this.component).digest('hex');
    const path=join(root,'cab-approval-bridge/sgs-outbox','checkpoint-'+id+'.json');
    let queued;
    if(existsSync(path)) {
      const info=lstatSync(path);
      if(!info.isFile()||info.uid!==process.getuid()||info.mode&0o077)throw new Error('sgs-checkpoint-outbox-unsafe');
      queued=JSON.parse(readFileSync(path,'utf8'));
    }
    if(queued&&queued.sequence>data.sequence){this.sequence=queued.sequence;return queued.data;}
    this.sequence=data.sequence;return data.data;
  }
  write(data) {
    this.sequence=Math.max(this.sequence+1,Date.now()*1000);
    const body={project:this.project,component:this.component,sequence:this.sequence,at:new Date().toISOString(),data:structuredClone(data)};
    const task=async()=>{
      try {
        const result=await runtimeRequest('sgs','/component/checkpoint',body,{home:this.home,timeout:1000});
        if(this.legacyPath&&existsSync(this.legacyPath)) {
          const info=lstatSync(this.legacyPath);
          if(!info.isFile()||info.uid!==process.getuid())throw new Error('sgs-legacy-checkpoint-owner-mismatch');
          unlinkSync(this.legacyPath);
        }
        return result;
      }catch(error){if(error.status)throw error;return queueComponentCheckpoint(body,{home:this.home});}
    };
    const result=this.pending.then(task,task);this.pending=result.catch(()=>{});return result;
  }
  async flush(){await this.pending;}
}
