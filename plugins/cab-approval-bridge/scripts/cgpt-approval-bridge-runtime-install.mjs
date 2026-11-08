/** Activation qualifiée des services SGS/CCAB après le reçu CABU principal. */
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {runtimeRequest} from './cgpt-approval-bridge-runtime-client.mjs';
import {readRuntimeJson,writeRuntimeJson,ensurePrivateStateDirectory} from './cgpt-approval-bridge-state-layout.mjs';
export const VERSION='2.4.33';
const execute=promisify(execFile),components=['sgs','ccab'];
export async function activateRuntimeServices({transactionId,home=homedir(),pluginRoot=new URL('..',import.meta.url).pathname},options={}) {
  if(!/^update-[a-f0-9-]{36}$/.test(transactionId||'')||resolve(home)!==home)throw new Error('runtime-activation-identity-invalid');
  const service=options.service||(async args=>(await execute('systemctl',['--user',...args],{timeout:10000,maxBuffer:16384})).stdout);
  const request=options.request||runtimeRequest;
  const directory=join(home,'.local/state/cab-approval-bridge-update',transactionId);
  ensurePrivateStateDirectory(directory);
  const path=join(directory,'runtime-services.json');
  const main=readRuntimeJson(join(directory,'receipt.json')).value;
  if(main.id!==transactionId||main.phase!=='COMPLETED'||main.version!==VERSION)throw new Error('runtime-main-update-not-verified');
  const verified=async(component,observation)=>{
    if(observation?.version!==VERSION||observation.component!==component||observation.status!=='READY'||!Number.isSafeInteger(observation.pid))return false;
    const metadata=await service(['show','cgpt-approval-bridge-'+component+'.service','--property=ActiveState','--property=MainPID']);
    return /^ActiveState=active$/m.test(metadata)&&Number(metadata.match(/^MainPID=(\d+)$/m)?.[1])===observation.pid;
  };
  let receipt;
  try{receipt=readRuntimeJson(path).value;}catch(error){if(error.code!=='ENOENT')throw error;}
  if(receipt&&(receipt.transactionId!==transactionId||receipt.version!==VERSION))throw new Error('runtime-activation-receipt-conflict');
  // Les fichiers et les unités peuvent avoir changé depuis une tentative interrompue.
  for(const component of components) {
    const unit='cgpt-approval-bridge-'+component+'.service';
    const expected=await readFile(join(pluginRoot,'systemd',unit));
    const installed=await readFile(join(home,'.config/systemd/user',unit));
    if(!expected.equals(installed))throw new Error('runtime-activation-unit-divergent');
  }
  if(!receipt){
    receipt={transactionId,version:VERSION,phase:'PREPARING',components:{},startedAt:new Date().toISOString()};
    for(const component of components) {
      const unit='cgpt-approval-bridge-'+component+'.service';
      const metadata=await service(['show',unit,'--property=ActiveState','--property=MainPID']);
      receipt.components[component]={initialActive:/^ActiveState=active$/m.test(metadata),phase:'PREPARED'};
    }
    writeRuntimeJson(path,receipt);
  }
  await service(['daemon-reload']);
  for(const component of components) {
    const row=receipt.components[component],unit='cgpt-approval-bridge-'+component+'.service';
    let observed=null;
    try{observed=await request(component,'/status',undefined,{home,timeout:1000});}catch{}
    if(await verified(component,observed)) {
      row.phase='VERIFIED';row.pid=observed.pid;writeRuntimeJson(path,receipt);continue;
    }
    row.phase='ACTIVATING';receipt.phase='ACTIVATING';writeRuntimeJson(path,receipt);
    try { await service([row.initialActive?'restart':'start',unit]); }
    catch {
      row.phase='ACTIVATION_UNCONFIRMED';receipt.phase='RECOVERY_REQUIRED';writeRuntimeJson(path,receipt);
      throw new Error('runtime-activation-service-failed');
    }
    for(let attempt=0;attempt<40;attempt++) {
      try{observed=await request(component,'/status',undefined,{home,timeout:500});}catch{observed=null;}
      if(await verified(component,observed))break;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    if(!await verified(component,observed)) {
      row.phase='ACTIVATION_UNCONFIRMED';receipt.phase='RECOVERY_REQUIRED';writeRuntimeJson(path,receipt);
      throw new Error('runtime-activation-unconfirmed');
    }
    row.phase='VERIFIED';row.pid=observed.pid;writeRuntimeJson(path,receipt);
  }
  const directRoot=join(home,'.local/state/cab-approval-bridge-direct');
  if(existsSync(directRoot)) {
    ensurePrivateStateDirectory(directRoot);
    const template='cgpt-approval-bridge-monitor-direct@.service';
    if(!(await readFile(join(pluginRoot,'systemd',template))).equals(await readFile(join(home,'.config/systemd/user',template))))throw new Error('runtime-activation-direct-unit-divergent');
    receipt.directMonitors ||= {};
    const inspect=options.monitorIdentity||(async url=>{
      const response=await fetch(url+'/api/maintenance-identity',{headers:{'x-cab-continuity':'cab-continuity-v1'},signal:AbortSignal.timeout(1000),redirect:'error'});
      if(!response.ok)throw new Error('runtime-direct-monitor-unavailable');return response.json();
    });
    for(const key of await readdir(directRoot)) {
      if(!/^[a-f0-9]{64}$/.test(key))continue;
      ensurePrivateStateDirectory(join(directRoot,key));
      const direct=readRuntimeJson(join(directRoot,key,'monitor.json')).value;
      const unit='cgpt-approval-bridge-monitor-direct@'+key+'.service';
      let url;try{url=new URL(direct.url);}catch{throw new Error('runtime-direct-monitor-receipt-invalid');}
      if(direct.unit!==unit||typeof direct.workspace!=='string'||createHash('sha256').update(direct.workspace).digest('hex')!==key||
        url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('runtime-direct-monitor-receipt-invalid');
      let metadata=await service(['show',unit,'--property=ActiveState','--property=MainPID']);
      if(!/^ActiveState=active$/m.test(metadata)) {
        if(receipt.directMonitors[key]?.phase!=='ACTIVATING')continue;
        try{await service(['start',unit]);}
        catch{receipt.phase='RECOVERY_REQUIRED';writeRuntimeJson(path,receipt);throw new Error('runtime-direct-monitor-restart-failed');}
        metadata=await service(['show',unit,'--property=ActiveState','--property=MainPID']);
      }
      let observed=await inspect(direct.url);
      const matches=()=>observed?.identity?.workspace===direct.workspace&&observed?.identity?.mode==='direct'&&
        observed.pid===Number(metadata.match(/^MainPID=(\d+)$/m)?.[1])&&/^ActiveState=active$/m.test(metadata);
      if(!matches())throw new Error('runtime-direct-monitor-identity-invalid');
      if(observed.version!==VERSION) {
        receipt.directMonitors[key]={phase:'ACTIVATING'};receipt.phase='ACTIVATING';writeRuntimeJson(path,receipt);
        try { await service(['restart',unit]); }
        catch {receipt.phase='RECOVERY_REQUIRED';writeRuntimeJson(path,receipt);throw new Error('runtime-direct-monitor-restart-failed');}
        for(let attempt=0;attempt<40;attempt++) {
          try{observed=await inspect(direct.url);metadata=await service(['show',unit,'--property=ActiveState','--property=MainPID']);}catch{observed=null;}
          if(matches()&&observed.version===VERSION)break;
          await new Promise(resolve=>setTimeout(resolve,100));
        }
        if(!matches()||observed.version!==VERSION) {
          receipt.phase='RECOVERY_REQUIRED';writeRuntimeJson(path,receipt);throw new Error('runtime-direct-monitor-activation-unconfirmed');
        }
      }
      receipt.directMonitors[key]={phase:'VERIFIED',pid:observed.pid};writeRuntimeJson(path,receipt);
    }
  }
  receipt.phase='COMPLETED';receipt.completedAt=new Date().toISOString();writeRuntimeJson(path,receipt);
  return receipt;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try{process.stdout.write(JSON.stringify(await activateRuntimeServices({transactionId:process.argv[2]}))+'\n');}
  catch(error){process.stderr.write(JSON.stringify({error:/^runtime-[a-z-]+$/.test(error.message)?error.message:'runtime-activation-failed'})+'\n');process.exitCode=1;}
}
