import {spawn} from 'node:child_process';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
export const VERSION='2.4.0';
export async function startOwnerProxy(controllerUrl,{spawnImpl=spawn}={}){
 const token=randomBytes(32).toString('hex');
 const child=spawnImpl('python3',['-B',fileURLToPath(new URL('./cgpt-approval-bridge-owner-proxy.py',import.meta.url))],{stdio:['pipe','pipe','pipe']});
 const ready=new Promise((resolve,reject)=>{
  let text='';const timer=setTimeout(()=>reject(new Error('erasure-owner-proxy-timeout')),5000);
  child.once('error',error=>{clearTimeout(timer);reject(error)});
  child.stdout.on('data',bytes=>{text+=bytes.toString('utf8');if(text.length>4096){clearTimeout(timer);reject(new Error('erasure-owner-proxy-invalid'));return;}
   if(text.includes('\n')){clearTimeout(timer);try{resolve(JSON.parse(text.split('\n')[0]))}catch{reject(new Error('erasure-owner-proxy-invalid'))}}});
  child.once('exit',()=>{clearTimeout(timer);reject(new Error('erasure-owner-proxy-exited'))});
 });
 child.stderr.on('data',()=>{});
 child.stdin.end(JSON.stringify({controllerUrl,token})+'\n');
 let identity;
 try{identity=await ready;}catch(error){child.kill('SIGTERM');throw error;}
 if(identity.uid!==process.getuid()||identity.pid!==child.pid||typeof identity.path!=='string'||!identity.path.startsWith('/tmp/cab-owner-ipc-')){child.kill('SIGTERM');throw new Error('erasure-owner-proxy-identity-invalid');}
 return {identity,
  peer(request){const actual=Buffer.from(request.headers['x-cab-owner-proxy']||'');const expected=Buffer.from(token);
   if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw Object.assign(new Error('erasure-owner-proxy-auth-required'),{status:403,code:'erasure-owner-proxy-auth-required'});
   const pid=Number(request.headers['x-cab-peer-pid']),uid=Number(request.headers['x-cab-peer-uid']);
   if(!Number.isSafeInteger(pid)||pid<=0||!Number.isSafeInteger(uid)||uid<0)throw Object.assign(new Error('erasure-owner-peer-invalid'),{status:403});return {pid,uid};},
  async stop(){if(child.exitCode===null&&child.signalCode===null){child.kill('SIGTERM');await Promise.race([once(child,'exit'),new Promise(resolve=>setTimeout(resolve,2000))]);}}};
}
