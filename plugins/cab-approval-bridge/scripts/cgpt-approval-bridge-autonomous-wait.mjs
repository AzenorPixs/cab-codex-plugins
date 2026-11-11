/** Wait mechanically for a final submission or exception; no periodic LLM turn. */
import {pathToFileURL} from 'node:url';
export const VERSION='2.6.0';

export async function waitForAutonomousWork({controller,runId,signal,fetchImpl=fetch}) {
  const base=new URL(controller);
  if(!['http:','https:'].includes(base.protocol)||!['127.0.0.1','[::1]','localhost'].includes(base.hostname)||
    base.username||base.password||base.pathname!=='/'||base.search||base.hash||
    !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(runId))throw new Error('autonomy-wait-input-invalid');
  const statusPath=new URL('/runs/'+runId+'/autonomy',base);
  const check=async()=>{
    const response=await fetchImpl(statusPath,{signal});
    if(!response.ok)throw new Error('autonomy-wait-status-unavailable');
    const {autonomy}=await response.json();
    if(!autonomy)throw new Error('autonomy-wait-mandate-missing');
    const exceptions=autonomy.exceptions.filter(e=>!e.decision).map(e=>({requestId:e.request_id,category:e.category}));
    return autonomy.state==='REVIEW_PENDING'||exceptions.length?{runId,state:autonomy.state,
      submissionDigest:autonomy.state==='REVIEW_PENDING'?autonomy.submissions.at(-1)?.digest:null,exceptions}:null;
  };
  const initial=await check();if(initial)return initial;
  const response=await fetchImpl(new URL('/monitor/events',base),{headers:{accept:'text/event-stream'},signal});
  if(!response.ok||!response.body)throw new Error('autonomy-wait-events-unavailable');
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
  try {
    // Recheck after subscribing: a submission between the first GET and SSE cannot be lost.
    const pending=await check();if(pending)return pending;
    for(;;) {
      const {value,done}=await reader.read();if(done)throw new Error('autonomy-wait-events-disconnected');
      buffer+=decoder.decode(value,{stream:true});
      if(buffer.length>2*1024*1024)throw new Error('autonomy-wait-frame-limit');
      const frames=buffer.split(/\r?\n\r?\n/);buffer=frames.pop();
      for(const frame of frames) {
        const data=frame.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5)).join('\n');
        if(!data)continue;
        const event=JSON.parse(data).event;
        if(event?.runId===runId&&['autonomy-review-requested','autonomy-exception-requested'].includes(event.type)) {
          const result=await check();if(result)return result;
        }
      }
    }
  } finally {await reader.cancel();}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const args=process.argv.slice(2);
  try {
    if(args.length!==4||args[0]!=='--controller'||args[2]!=='--run')throw new Error('autonomy-wait-usage');
    const result=await waitForAutonomousWork({controller:args[1],runId:args[3]});
    process.stdout.write(JSON.stringify(result)+'\n');
  } catch(error) {
    process.stderr.write((/^autonomy-wait-/.test(error.message)?error.message:'autonomy-wait-unavailable')+'\n');process.exitCode=1;
  }
}
