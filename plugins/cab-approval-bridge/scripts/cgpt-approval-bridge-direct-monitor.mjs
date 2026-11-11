import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:net';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {ensurePrivateStateDirectory,writeRuntimeJson,readRuntimeJson} from './cgpt-approval-bridge-state-layout.mjs';
export const VERSION='2.6.0';
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
  await file.writeFile(join(config,'monitor.env'),'OC_Codex_WORKSPACE='+JSON.stringify(workspace)+'\nOC_Codex_MODE=direct\nOC_Codex_MONITOR_PORT='+port+'\n',{mode:0o600});
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
