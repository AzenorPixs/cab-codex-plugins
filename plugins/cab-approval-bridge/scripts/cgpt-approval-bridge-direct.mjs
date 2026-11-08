/** Suivi Codex réel : opt-in direct explicite, sans créer de session OpenCode. */
import {readdir,readFile,realpath,mkdir} from 'node:fs/promises';
import {homedir,hostname} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {runtimeRequest,registerStatisticsBinding,registerStatisticsSource,flushStatistics} from './cgpt-approval-bridge-runtime-client.mjs';
import {ensureProjectTestRoot,changeTestArea,cleanTestArea} from './cgpt-approval-bridge-autonomy.mjs';
import {startDirectMonitor} from './cgpt-approval-bridge-direct-monitor.mjs';
import {ArchiveContent,archiveDirectory,changeReports} from './cgpt-approval-bridge-archives.mjs';
import {purgeStatistics,verifyStatisticsAbsence} from './cgpt-approval-bridge-sgs-cleanup.mjs';
export const VERSION='2.4.43';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.-]{0,199}$/.test(value);

async function findNativeSession(home,session) {
  const root=join(home,'.codex/sessions');let result=[];
  async function visit(directory,depth) {
    let entries;try{entries=await readdir(directory,{withFileTypes:true});}catch(error){if(error.code==='ENOENT')return;throw error;}
    for(const entry of entries) {
      if(entry.isFile()&&entry.name.startsWith('rollout-')&&entry.name.endsWith('-'+session+'.jsonl'))result.push(join(directory,entry.name));
      else if(entry.isDirectory()&&depth<3)await visit(join(directory,entry.name),depth+1);
    }
  }
  await visit(root,0);await visit(join(home,'.codex/archived_sessions'),3);
  if(result.length!==1)throw new Error('direct-native-session-source-not-unique');
  return result[0];
}

export async function trackCodex({project,change,run,session=process.env.CODEX_THREAD_ID,role='coder',direct=false,startedAt,home=homedir(),sourcePath},options={}) {
  if(!id(change)||!id(run)||!id(session)||!['coder','orchestrator'].includes(role)||direct&&role!=='coder')throw new Error('direct-tracking-identity-invalid');
  project=await realpath(project);ensureProjectTestRoot(project);
  const binding='codex-'+hash([hostname(),process.getuid(),project,change,run,session,role]);
  const call=options.request||runtimeRequest;
  let existing;
  try{existing=(await call('sgs','/stats?project='+encodeURIComponent(project),undefined,{home})).sessions.find(row=>row.binding===binding);}catch{}
  const start=existing?.started_at||startedAt||new Date().toISOString();
  const body={binding,host:hostname(),instance:'codex-'+session+'-uid'+process.getuid(),project,change,run,session,role,agent:'codex',mode:role==='orchestrator'?'piloted':'direct',started_at:start,
    ...(direct||existing?.cab_direct?{cab_direct:true}:{})};
  const receipt=await registerStatisticsBinding(body,{home});
  sourcePath=sourcePath||await findNativeSession(home,session);
  const source=await registerStatisticsSource({binding,source:'codex-native',location:sourcePath},{home,defer:receipt.status==='queued'});
  await flushStatistics({home});
  if(direct)changeTestArea(project,change,run);
  return {binding,project,change,run,session,role,direct,started_at:start,registration:receipt.status,source:source.status,version:VERSION};
}

export async function finalizeDirect({project,change,run,session=process.env.CODEX_THREAD_ID,branch,receiptId,home=homedir()},options={}) {
  if(!id(change)||!id(run)||!id(session)||!id(receiptId)||!['TERMINÉ','BLOQUÉ'].includes(branch))throw new Error('direct-closure-identity-invalid');
  project=await realpath(project);
  const request=options.request||runtimeRequest;
  const sessions=(await request('sgs','/stats?'+new URLSearchParams({project,change}),undefined,{home,timeout:15000})).sessions;
  const own=sessions.filter(row=>row.run===run&&row.session===session&&row.mode==='direct'&&row.cab_direct===true);
  if(own.length>1)throw new Error('direct-closure-identity-ambiguous');
  if(sessions.some(row=>row.run===run&&!own.includes(row)&&!row.ended_at))throw new Error('direct-closure-active-peer');
  if(sessions.some(row=>row.run===run&&row.mode==='piloted'))throw new Error('direct-closure-pilot-authority-required');
  if(own.some(row=>!row.ended_at))throw new Error('direct-closure-statistical-window-open');
  const bindingId='codex-'+hash([hostname(),process.getuid(),project,change,run,session,'coder']);
  const scope={workspace:project,changeId:change,runIds:[run],ids:[session],sessionId:session,bindingId,closureAuthority:'direct-session-v1'};
  const repository=new ArchiveContent(options.archiveRoot||archiveDirectory(project,{home}),project);
  const retained=repository.retain(scope,{reportPaths:changeReports(project,change,branch),closed:true,branch});
  const statisticalCleanup=options.statisticsCleanup||{purge:purgeStatistics,verify:verifyStatisticsAbsence};
  // SGS vérifie le rapport durable et son instantané avant toute suppression.
  const statistics=await statisticalCleanup.purge(scope,branch,receiptId,{home});
  await statisticalCleanup.verify(scope,{home});
  const atelier=cleanTestArea(project,change,run,{closed:true,reportsDurable:true});
  return {status:'DIRECT_CLEANUP_VERIFIED',receiptId,scope,statistics,atelier,
    archive:{archiveId:retained.archiveId,fingerprint:retained.fingerprint}};
}

async function main(argv) {
  const action=argv.shift();if(!['track','start','freeze','finalize'].includes(action))throw new Error('direct-action-invalid');
  const values={};for(let index=0;index<argv.length;index+=2){const key=argv[index];if(!['--project','--change','--run','--session','--role','--started-at','--source','--binding','--branch','--receipt-id'].includes(key)||!argv[index+1]||Object.hasOwn(values,key))throw new Error('direct-arguments-invalid');values[key]=argv[index+1];}
  if(action==='finalize')return finalizeDirect({project:values['--project']||process.cwd(),change:values['--change'],run:values['--run'],
    session:values['--session']||process.env.CODEX_THREAD_ID,branch:values['--branch'],receiptId:values['--receipt-id']});
  if(action==='freeze') {
    const binding=values['--binding'];if(!binding)throw new Error('direct-binding-required');
    const project=await realpath(values['--project']||process.cwd());
    const session=(await runtimeRequest('sgs','/stats?project='+encodeURIComponent(project))).sessions.find(row=>row.binding===binding);
    if(!session)throw new Error('direct-binding-not-found');
    return runtimeRequest('sgs','/bindings/close',{binding,ended_at:session.ended_at||new Date().toISOString()});
  }
  const result=await trackCodex({project:values['--project']||process.cwd(),change:values['--change'],run:values['--run'],session:values['--session']||process.env.CODEX_THREAD_ID,
    role:values['--role']||'coder',direct:action==='start',startedAt:values['--started-at'],sourcePath:values['--source']});
  if(action==='start') {
    try{result.monitor=await startDirectMonitor(result.project);}
    catch(error){result.monitor={status:'unavailable',reason:/^direct-monitor-[a-z-]+$/.test(error.message)?error.message:'direct-monitor-unavailable'};}
  }
  return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try{process.stdout.write(JSON.stringify(await main(process.argv.slice(2)))+'\n');}
  catch(error){process.stderr.write(JSON.stringify({error:/^(?:direct|sgs|runtime)-[a-z-]+$/.test(error.message)?error.message:'direct-tracking-unavailable'})+'\n');process.exitCode=1;}
}
