#!/usr/bin/env node
/** Commande locale commune ; les mutations lisent un objet JSON sur stdin. */
import { runtimeRequest } from './cgpt-approval-bridge-runtime-client.mjs';
import { pathToFileURL } from 'node:url';
export const VERSION='2.4.41';
export async function runtimeCommand(argv, input=process.stdin) {
  const [component,action,...rest]=argv;
  const routes={sgs:{status:['GET','/status'],bind:['POST','/bindings'],close:['POST','/bindings/close'],source:['POST','/sources'],event:['POST','/events'],stats:['GET','/stats']},
    ccab:{status:['GET','/status'],list:['GET','/incidents'],report:['POST','/incidents'],claim:['POST','/claim'],renew:['POST','/renew'],resolve:['POST','/resolve'],purge:['POST','/purge-incident'],'purge-batch':['POST','/purge-batch'],'purge-all':['POST','/purge-treated']}};
  const route=routes[component]?.[action];
  if(!route)throw new Error('runtime-command-invalid');
  let path=route[1],body;
  if(route[0]==='GET') {
    if(action==='stats') {
      if(rest.length!==1)throw new Error('runtime-command-project-required');
      path+='?project='+encodeURIComponent(rest[0]);
    }else if(rest.length)throw new Error('runtime-command-invalid');
  }else {
    if(rest.length)throw new Error('runtime-command-invalid');
    let text='';for await(const chunk of input){text+=chunk;if(Buffer.byteLength(text)>1024*1024)throw new Error('runtime-command-input-too-large');}
    body=JSON.parse(text);
  }
  return runtimeRequest(component,path,body);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try{process.stdout.write(JSON.stringify(await runtimeCommand(process.argv.slice(2)))+'\n');}
  catch(error){process.stderr.write(JSON.stringify({error:error.status?error.message:'runtime-command-failed'})+'\n');process.exitCode=1;}
}
