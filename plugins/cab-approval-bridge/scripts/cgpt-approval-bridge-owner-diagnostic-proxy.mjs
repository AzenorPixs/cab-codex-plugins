import {createServer} from 'node:http';
import {startOwnerProxy} from './cgpt-approval-bridge-owner-proxy.mjs';
export const VERSION='2.5.1';

// Serveur temporaire exclusivement diagnostique : aucune route de commit.
export async function startDiagnosticOwnerProxy(manager) {
  let proxy,issued=null,completed=false;
  const server=createServer(async(req,res)=>{
    try {
      if(req.method!=='POST'||!['/cleanup/owner/poll','/cleanup/owner/exchange'].includes(req.url))throw new Error('diagnostic-route-invalid');
      const peer=proxy.peer(req);let raw='';
      for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>1024*1024)throw new Error('diagnostic-input-too-large');}
      const input=JSON.parse(raw);
      let result;
      if(req.url.endsWith('/poll')){
        if(issued)throw new Error('diagnostic-already-issued');
        const command=await manager.diagnosticOwnerCommand(input,peer);issued={sender:input,command};result={command};
      }else{
        if(!issued||completed||JSON.stringify(input.sender)!==JSON.stringify(issued.sender)||JSON.stringify(input.command)!==JSON.stringify(issued.command))throw new Error('diagnostic-exchange-divergent');
        result=await manager.verifyDiagnosticOwnerReceipt(input.command,input.sender,peer,input.receipt);
        completed=true;
      }
      res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify(result));
    }catch{res.writeHead(409,{'content-type':'application/json'}).end(JSON.stringify({error:'erasure-owner-diagnostic-refused'}));}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  try{proxy=await startOwnerProxy('http://127.0.0.1:'+server.address().port);}
  catch(error){await new Promise(resolve=>server.close(resolve));throw error;}
  return {identity:proxy.identity,async stop(){await proxy.stop();await new Promise(resolve=>server.close(resolve));}};
}
