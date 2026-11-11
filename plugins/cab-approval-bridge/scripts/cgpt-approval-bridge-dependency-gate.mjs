/** Short-lived locks shared with the dependency mailbox. */
import {spawn} from 'node:child_process';
import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {isAbsolute} from 'node:path';
import {promisify} from 'node:util';
export const VERSION = '2.7.3';
const execFileAsync=promisify(execFile);

export async function dependencyCloseCheck({stateRoot,project,run,session},runner=execFileAsync) {
  if(!isAbsolute(stateRoot)||!isAbsolute(project)||!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(run)||
     (session!==undefined&&!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,199}$/.test(session))) throw new Error('dependency-close-input-invalid');
  const script=fileURLToPath(new URL('./cgpt-approval-bridge-dependencies.py',import.meta.url));
  const args=['-B',script,'check-close','--project',project,'--run',run,'--state-root',stateRoot];
  if(session!==undefined)args.push('--session',session);
  let value;
  try { value=JSON.parse((await runner('python3',args,{timeout:5000,maxBuffer:65536})).stdout); }
  catch { throw new Error('dependency-close-check-unavailable'); }
  if(!['absent','clear'].includes(value.status)||value.pending!==0)throw new Error('dependency-delivery-unresolved');
  return value;
}

export async function dependencyGate({stateRoot,project,run,mode}, spawnProcess=spawn) {
  if(!isAbsolute(stateRoot)||!isAbsolute(project)||!['run','global'].includes(mode)||
     typeof run!=='string'||(mode==='run'&&!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(run))) throw new Error('dependency-gate-input-invalid');
  const script=fileURLToPath(new URL('./cgpt-approval-bridge-dependency-gate.py',import.meta.url));
  const child=spawnProcess('python3',['-B',script,stateRoot,project,run,mode],{stdio:['pipe','pipe','ignore']});
  child.stdin.on('error',()=>{});
  try {
    await new Promise((resolve,reject)=>{
      let settled=false, output='';
      const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve();};
      const timer=setTimeout(()=>finish(new Error('dependency-gate-timeout')),30000);
      child.once('error',()=>finish(new Error('dependency-gate-unavailable')));
      child.once('exit',()=>finish(new Error('dependency-gate-unavailable')));
      child.stdout.on('data',chunk=>{output+=chunk;if(output.trim()==='READY')finish();else if(output.length>1024)finish(new Error('dependency-gate-invalid'));});
    });
  } catch(error) {child.stdin.end();child.kill('SIGTERM');throw error;}
  return {async close(){
    if(child.exitCode!==null||child.signalCode!==null)return;
    await new Promise(resolve=>{
      let done=false;
      const finish=()=>{if(done)return;done=true;clearTimeout(timer);resolve();};
      const timer=setTimeout(()=>{child.kill('SIGTERM');finish();},3000);
      child.once('exit',finish);child.stdin.end();
      if(child.exitCode!==null||child.signalCode!==null)finish();
    });
  }};
}
