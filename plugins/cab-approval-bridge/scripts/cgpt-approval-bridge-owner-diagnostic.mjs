import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {runtimeStateDirectory} from './cgpt-approval-bridge-state-layout.mjs';
import {ChangeErasureManager} from './cgpt-approval-bridge-erasure-manager.mjs';
import {processOwnerIdentity} from './cgpt-approval-bridge-process-lifecycle.mjs';
import {startDiagnosticOwnerProxy} from './cgpt-approval-bridge-owner-diagnostic-proxy.mjs';
import {authority} from './cgpt-approval-bridge-update.mjs';
import {homedir} from 'node:os';
export const VERSION='2.5.5';

const exec=promisify(execFile);
const fail=code=>{throw Object.assign(new Error(code),{code})};
export async function diagnoseFrozenOwner({workspace,transactionId}) {
  if(typeof workspace!=='string'||resolve(workspace)!==workspace||!/^erasure-[a-f0-9-]{36}$/.test(transactionId||''))fail('erasure-owner-diagnostic-input-invalid');
  const lock=await authority(join(homedir(),'.local/state/cab-approval-bridge-update/update.lock'));
  let proxy;
  try{
    const manager=new ChangeErasureManager({workspace,stateDirectory:runtimeStateDirectory(workspace),brokerIdentity:processOwnerIdentity});
    const value=manager.pending(),prepared=value?.ownerReceipts?.prepare;
    if(!value||value.transactionId!==transactionId||value.scope?.workspace!==workspace||!['FREEZING','VERIFYING'].includes(value.phase)||!Number.isSafeInteger(prepared?.uid)||!Number.isSafeInteger(prepared?.pid))fail('erasure-owner-diagnostic-input-invalid');
    try{process.kill(prepared.pid,0);fail('erasure-previous-broker-still-present');}catch(error){if(error.code!=='ESRCH')throw error;}
    const passwd=(await exec('/usr/bin/getent',['passwd',String(prepared.uid)],{timeout:5000,maxBuffer:4096})).stdout.trim().split(':');
    if(Number(passwd[2])!==prepared.uid||!passwd[5]?.startsWith('/')||resolve(passwd[5])!==passwd[5])fail('erasure-owner-diagnostic-identity-invalid');
    proxy=await startDiagnosticOwnerProxy(manager);
    const executable=resolve(dirname(fileURLToPath(import.meta.url)),'../broker/cgpt_approval_bridge_owner_diagnostic.py');
    const child=spawn('/usr/bin/sudo',['-n','-u','#'+prepared.uid,'env','HOME='+passwd[5],'/usr/bin/python3','-B',executable],{stdio:['pipe','pipe','pipe']});
    let out='',err='';child.stdout.on('data',b=>{out+=b;if(out.length>8192)child.kill()});child.stderr.on('data',b=>{err+=b;if(err.length>8192)child.kill()});
    child.stdin.end(JSON.stringify(proxy.identity)+'\n');
    const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve)});
    if(code!==0){let diagnostic;try{diagnostic=JSON.parse(err)}catch{}fail(/^erasure-[a-z0-9-]+$/.test(diagnostic?.error||'')?diagnostic.error:'erasure-owner-diagnostic-failed');}
    const result=JSON.parse(out);
    if(result.transactionId!==transactionId||!['PREPARED','APPLYING','APPLIED'].includes(result.ownerPhase)||!result.diagnostic)fail('erasure-owner-diagnostic-result-invalid');
    return {...result,coverage:'owner-default-paths-unverified'};
  }finally{if(proxy)await proxy.stop();await lock.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{if(process.argv.length!==4)fail('erasure-owner-diagnostic-input-invalid');console.log(JSON.stringify(await diagnoseFrozenOwner({workspace:process.argv[2],transactionId:process.argv[3]})));}
  catch(error){console.error(JSON.stringify({error:/^erasure-[a-z0-9-]+$/.test(error.code||'')?error.code:'erasure-owner-diagnostic-failed'}));process.exitCode=1;}
}
