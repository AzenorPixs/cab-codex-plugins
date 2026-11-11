import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:net';
import {readFile} from 'node:fs/promises';
import {constants,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {ensurePrivateStateDirectory,writeRuntimeJson,readRuntimeJson} from './cgpt-approval-bridge-state-layout.mjs';
export const VERSION='2.7.4';
const execute=promisify(execFile);
export async function startDirectMonitor(workspace,{home=homedir(),service=async args=>(await execute('systemctl',['--user',...args],{timeout:10000,maxBuffer:16384})).stdout}={}) {
  if(/[\r\n\0]/.test(workspace))throw new Error('direct-monitor-workspace-invalid');
  const key=createHash('sha256').update(workspace).digest('hex'),unit='cgpt-approval-bridge-monitor-direct@'+key+'.service';
  const root=join(home,'.local/state/cab-approval-bridge-direct',key);ensurePrivateStateDirectory(root);
  const receiptPath=join(root,'monitor.json');let receipt;
  if(existsSync(receiptPath))receipt=readRuntimeJson(receiptPath).value;
  const template=await readFile(join(home,'.config/systemd/user/cgpt-approval-bridge-monitor-direct@.service'),'utf8');
  if(!template.includes('Description=CAB '+VERSION+' '))throw new Error('direct-monitor-template-version-invalid');
  const metadata=await service(['show',unit,'--property=ActiveState','--property=MainPID']);
  if(/^ActiveState=active$/m.test(metadata)) {
    if(!receipt)throw new Error('direct-monitor-receipt-required');
    const response=await fetch(receipt.url+'/api/maintenance-identity',{headers:{'x-cab-continuity':'cab-continuity-v1'},signal:AbortSignal.timeout(2000),redirect:'error'}),identity=await response.json();
    if(!response.ok||identity.version!==VERSION||identity.identity?.workspace!==workspace||identity.identity?.mode!=='direct'||
      identity.pid!==Number(metadata.match(/^MainPID=(\d+)$/m)?.[1]))throw new Error('direct-monitor-active-identity-invalid');
    return {...receipt,status:'active'};
  }
  const reservation=createServer();await new Promise((resolve,reject)=>{reservation.once('error',reject);reservation.listen(0,'127.0.0.1',resolve);});
  const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
  const config=join(home,'.config/cab-approval-bridge/direct',key);ensurePrivateStateDirectory(config);
  const file=await import('node:fs/promises');
  const target=join(config,'monitor.env');let handle,created=false;
  try{handle=await file.open(target,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o770);created=true;}
  catch(error){if(error.code!=='EEXIST')throw error;handle=await file.open(target,constants.O_WRONLY|constants.O_TRUNC|constants.O_NOFOLLOW);}
  try{if(created)await handle.chmod(0o770);await handle.writeFile('OC_Codex_WORKSPACE='+JSON.stringify(workspace)+'\nOC_Codex_MODE=direct\nOC_Codex_MONITOR_PORT='+port+'\n');}finally{await handle.close();}
  receipt={workspace,unit,url:'http://127.0.0.1:'+port,port,version:VERSION};writeRuntimeJson(receiptPath,receipt);
  await service(['daemon-reload']);await service(['start',unit]);
  for(let attempt=0;attempt<50;attempt++) {
    try {
      const response=await fetch(receipt.url+'/api/maintenance-identity',{headers:{'x-cab-continuity':'cab-continuity-v1'},signal:AbortSignal.timeout(300),redirect:'error'}),identity=await response.json();
      const current=await service(['show',unit,'--property=ActiveState','--property=MainPID']);
      if(response.ok&&identity.version===VERSION&&identity.identity?.workspace===workspace&&identity.identity?.mode==='direct'&&
        /^ActiveState=active$/m.test(current)&&identity.pid===Number(current.match(/^MainPID=(\d+)$/m)?.[1]))return {...receipt,status:'active'};
    }catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error('direct-monitor-activation-unconfirmed');
}
