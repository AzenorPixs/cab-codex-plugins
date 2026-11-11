/** Suivi Codex réel : opt-in direct explicite, sans créer de session OpenCode. */
import {readdir,readFile,realpath,mkdir} from 'node:fs/promises';
import {homedir,hostname} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {runtimeRequest,registerStatisticsBinding,registerStatisticsSource,flushStatistics,stateRootDirectory} from './cgpt-approval-bridge-runtime-client.mjs';
import {dependencyCloseCheck,dependencyGate} from './cgpt-approval-bridge-dependency-gate.mjs';
import {ensureProjectTestRoot,changeTestArea,cleanTestArea} from './cgpt-approval-bridge-autonomy.mjs';
import {startDirectMonitor} from './cgpt-approval-bridge-direct-monitor.mjs';
import {ArchiveContent,archiveDirectory,changeReports} from './cgpt-approval-bridge-archives.mjs';
import {purgeStatistics,verifyStatisticsAbsence} from './cgpt-approval-bridge-sgs-cleanup.mjs';
export const VERSION='2.7.1';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.-]{0,199}$/.test(value);
const execFileAsync=promisify(execFile);

export async function registerDependencySession({project,run,session,mode,reopen=false},runner=execFileAsync) {
  if(!id(run)||!id(session)||!['direct','piloted'].includes(mode))throw new Error('direct-dependency-identity-invalid');
  const script=fileURLToPath(new URL('./cgpt-approval-bridge-dependencies.py',import.meta.url));
  try {
    const result=await runner('python3',['-B',script,'register','--project',project,'--session',session,'--run',run,'--mode',mode],{timeout:5000,maxBuffer:65536});
    const value=JSON.parse(result.stdout);
    if(value.status!=='registered')throw new Error('invalid');
    return {status:'registered',native_notification:value.native_notification};
  } catch (error) {
    let code;try{code=JSON.parse(error.stderr||'{}').error;}catch{}
    if(reopen&&mode==='direct'&&code==='coordination-session-closed') {
      try {
        const result=await runner('python3',['-B',script,'reopen-direct','--project',project,'--session',session,'--run',run],{timeout:10000,maxBuffer:65536});
        const value=JSON.parse(result.stdout);if(value.status==='reopened')return value;
      } catch {}
    }
    return {status:'unavailable',reason:'direct-dependency-registration-unavailable'};
  }
}

export function dependencySessionMode(action,role) {
  if(action==='start')return 'direct';
  if(action==='track'&&role==='orchestrator')return 'piloted';
  return null;
}

export async function closeDependencySession({project,change,run,session,receiptId,home},runner=execFileAsync) {
  const script=fileURLToPath(new URL('./cgpt-approval-bridge-dependencies.py',import.meta.url));
  const args=['-B',script,'close-direct','--project',project,'--change',change,'--run',run,'--session',session,'--receipt-id',receiptId];
  try {
    const result=await runner('python3',args,{timeout:10000,maxBuffer:65536,
      env:{...process.env,OC_Codex_RUNTIME_STATE_ROOT:stateRootDirectory(home)}});
    const value=JSON.parse(result.stdout);
    if(!['closed','absent','retained-for-peers','cleanup-pending'].includes(value.status))throw new Error('invalid');
    return value;
  } catch { return {status:'unavailable',reason:'direct-dependency-closure-unavailable'}; }
}

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
  const gate=await (options.dependencyGate||dependencyGate)({stateRoot:stateRootDirectory(home),project,run,mode:'run'});
  let result;
  try {
  await (options.dependencyCloseCheck||dependencyCloseCheck)({stateRoot:stateRootDirectory(home),project,run,session});
  const bindingId='codex-'+hash([hostname(),process.getuid(),project,change,run,session,'coder']);
  const scope={workspace:project,changeId:change,runIds:[run],ids:[session],sessionId:session,bindingId,closureAuthority:'direct-session-v1'};
  const repository=new ArchiveContent(options.archiveRoot||archiveDirectory(project,{home}),project);
  const retained=repository.retain(scope,{reportPaths:changeReports(project,change,branch),closed:true,branch});
  const statisticalCleanup=options.statisticsCleanup||{purge:purgeStatistics,verify:verifyStatisticsAbsence};
  // SGS vérifie le rapport durable et son instantané avant toute suppression.
  const statistics=await statisticalCleanup.purge(scope,branch,receiptId,{home});
  await statisticalCleanup.verify(scope,{home});
  const atelier=cleanTestArea(project,change,run,{closed:true,reportsDurable:true});
  result={status:'DIRECT_CLEANUP_VERIFIED',receiptId,scope,statistics,atelier,
    archive:{archiveId:retained.archiveId,fingerprint:retained.fingerprint}};
  } finally { await gate.close(); }
  const dependencies=await (options.dependencyClose||closeDependencySession)({project,change,run,session,receiptId,home});
  return {...result,dependencies,...(dependencies.status==='unavailable'||dependencies.retained===true?{status:'DIRECT_CLEANUP_INCOMPLETE'}:{})};
}

export async function freezeDirect({project,binding,home=homedir()},options={}) {
  if(!binding)throw new Error('direct-binding-required');
  project=await realpath(project);
  const request=options.request||runtimeRequest;
  const read=async()=>(await request('sgs','/stats?project='+encodeURIComponent(project),undefined,{home})).sessions.find(row=>row.binding===binding);
  const session=await read();if(!session)throw new Error('direct-binding-not-found');
  const gate=await (options.dependencyGate||dependencyGate)({stateRoot:stateRootDirectory(home),project,run:session.run,mode:'run'});
  try {
    const current=await read();
    if(!current||current.run!==session.run||current.session!==session.session||current.started_at!==session.started_at)
      throw new Error('direct-binding-changed');
    await (options.dependencyCloseCheck||dependencyCloseCheck)({stateRoot:stateRootDirectory(home),project,run:session.run,session:session.session});
    return await request('sgs','/bindings/close',{binding,ended_at:current.ended_at||new Date().toISOString()},{home});
  } finally { await gate.close(); }
}

async function main(argv) {
  const action=argv.shift();if(!['track','start','freeze','finalize'].includes(action))throw new Error('direct-action-invalid');
  const values={};for(let index=0;index<argv.length;index+=2){const key=argv[index];if(!['--project','--change','--run','--session','--role','--started-at','--source','--binding','--branch','--receipt-id'].includes(key)||!argv[index+1]||Object.hasOwn(values,key))throw new Error('direct-arguments-invalid');values[key]=argv[index+1];}
  if(action==='finalize')return finalizeDirect({project:values['--project']||process.cwd(),change:values['--change'],run:values['--run'],
    session:values['--session']||process.env.CODEX_THREAD_ID,branch:values['--branch'],receiptId:values['--receipt-id']});
  if(action==='freeze') {
    return freezeDirect({project:values['--project']||process.cwd(),binding:values['--binding']});
  }
  const targetProject=await realpath(values['--project']||process.cwd());
  const startGate=await dependencyGate({stateRoot:stateRootDirectory(homedir()),project:targetProject,run:values['--run'],mode:'run'});
  let result;
  try {
    result=await trackCodex({project:targetProject,change:values['--change'],run:values['--run'],session:values['--session']||process.env.CODEX_THREAD_ID,
      role:values['--role']||'coder',direct:action==='start',startedAt:values['--started-at'],sourcePath:values['--source']});
  } finally { await startGate.close(); }
  const dependencyMode=dependencySessionMode(action,result.role);
  result.dependencies=dependencyMode
    ? await registerDependencySession({project:result.project,run:result.run,session:result.session,mode:dependencyMode,reopen:action==='start'})
    : {status:'unavailable',reason:'direct-dependency-mode-unknown'};
  if(action==='start') {
    try{result.monitor=await startDirectMonitor(result.project);}
    catch(error){result.monitor={status:'unavailable',reason:/^direct-monitor-[a-z-]+$/.test(error.message)?error.message:'direct-monitor-unavailable'};}
  }
  return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try{const result=await main(process.argv.slice(2));process.stdout.write(JSON.stringify(result)+'\n');
    if(result.status==='DIRECT_CLEANUP_INCOMPLETE')process.exitCode=1;}
  catch(error){process.stderr.write(JSON.stringify({error:/^(?:direct|sgs|runtime)-[a-z-]+$/.test(error.message)?error.message:'direct-tracking-unavailable'})+'\n');process.exitCode=1;}
}
