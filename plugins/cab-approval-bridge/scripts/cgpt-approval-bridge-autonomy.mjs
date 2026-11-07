import {mkdirSync,lstatSync,realpathSync,chmodSync,chownSync,existsSync,rmSync} from 'node:fs';
import {isAbsolute,join,relative,resolve,sep} from 'node:path';
import {createHash} from 'node:crypto';
export const VERSION='2.4.15';
const identity=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.-]{0,199}$/.test(value);
const fail=code=>{throw Object.assign(new Error(code),{code,status:409});};
function sharedDirectory(path,workspace) {
  if(existsSync(path))return;
  const project=lstatSync(workspace),mode=0o775|(project.mode&0o2000);
  mkdirSync(path,{mode});
  if(lstatSync(path).gid!==project.gid)chownSync(path,process.getuid(),project.gid);
  chmodSync(path,mode);
}

export function ensureProjectTestRoot(workspace) {
  if(!isAbsolute(workspace)||realpathSync(workspace)!==resolve(workspace)||!lstatSync(workspace).isDirectory())fail('atelier-project-invalid');
  const root=join(workspace,'.cab-tests');
  sharedDirectory(root,workspace);
  if(!lstatSync(root).isDirectory()||realpathSync(root)!==root)fail('atelier-root-invalid');
  return root;
}

export function changeTestArea(workspace,changeId,runId) {
  if(!identity(changeId)||!identity(runId)||[changeId,runId].some(value=>value==='.'||value==='..'))fail('atelier-identity-invalid');
  let path=ensureProjectTestRoot(workspace);
  for(const part of [changeId,runId]) {
    path=join(path,part);
    sharedDirectory(path,workspace);
    if(!lstatSync(path).isDirectory()||realpathSync(path)!==path)fail('atelier-path-invalid');
  }
  // L'autorité est dans le registre CAB, jamais dans un fichier que le codeur
  // est autorisé à modifier librement dans son atelier.
  return path;
}

function physicalTarget(path) {
  let ancestor=resolve(path),suffix=[];
  for(;;) {
    try{lstatSync(ancestor);break;}catch(error){if(error.code!=='ENOENT')throw error;}
    const parent=resolve(ancestor,'..');if(parent===ancestor)fail('autonomy-target-invalid');
    suffix.unshift(ancestor.slice(parent.length+Number(!parent.endsWith(sep))));ancestor=parent;
  }
  return join(realpathSync(ancestor),...suffix);
}
const within=(root,path)=>{const tail=relative(root,path);return tail===''||!tail.startsWith('..'+sep)&&tail!=='..'&&!isAbsolute(tail);};

export function classifyChangeAction({workspace,changeId,runId,scope,kind,paths=[],additionalResources=false}) {
  if(!Array.isArray(scope)||!scope.length||!['read','write','execute','web','test-result'].includes(kind)||!Array.isArray(paths))fail('autonomy-action-invalid');
  const root=ensureProjectTestRoot(workspace);
  if(!identity(changeId)||!identity(runId)||[changeId,runId].some(value=>value==='.'||value==='..'))fail('atelier-identity-invalid');
  const atelier=join(root,changeId,runId);
  const resolved=paths.map(path=>physicalTarget(isAbsolute(path)?path:join(workspace,path)));
  const allowed=scope.map(path=>physicalTarget(isAbsolute(path)?path:join(workspace,path)));
  if(allowed.some(path=>!within(workspace,path))||(['read','write'].includes(kind)&&!paths.length))fail('autonomy-scope-invalid');
  if(additionalResources)return {validation:'developer',reason:'additional-resources'};
  if(resolved.some(path=>within(root,path)&&!within(atelier,path)))return {validation:'developer',reason:'peer-atelier-protected'};
  if(resolved.some(path=>!within(atelier,path)&&!allowed.some(base=>within(base,path))))return {validation:'developer',reason:'outside-change'};
  if(kind==='web'||kind==='test-result')return {validation:'orchestrator',reason:kind};
  if(kind==='write'&&resolved.some(path=>!within(atelier,path)))return {validation:'orchestrator',reason:'project-write'};
  return {validation:'none',reason:'authorized-change',atelier};
}

export function testResultDigest(result) {
  if(!result||typeof result!=='object'||typeof result.commandId!=='string'||!Array.isArray(result.evidence)||
    !['passed','failed','unavailable'].includes(result.outcome))fail('test-result-invalid');
  return createHash('sha256').update(JSON.stringify(result)).digest('hex');
}

export function authorizeAtelierCall(run,job,args,messages,inputDigest,runtimeRoots=[],method='atelier_execute') {
  if(!['atelier_execute','atelier_status'].includes(method))fail('atelier-method-invalid');
  if(!run||run.state!=='RESERVED'||!job?.armed||job.changeId!==run.changeId||job.sessionId!==run.sessionId||
    args.run_id!==run.runId||args.reservation_version!==run.version||args.session_id!==run.sessionId||
    args.change_id!==run.changeId||args.directory!==run.directory)fail('atelier-run-divergent');
  const calls=messages.flatMap(message=>message.info?.sessionID===run.sessionId?message.parts||[]:[]).filter(part=>
    part.type==='tool'&&part.tool==='cgpt-validation_'+method&&part.state?.status==='running'&&
    part.state?.metadata?.cabCodeMode?.wrapperId===part.callID&&inputDigest(part.state.input)===inputDigest(args));
  if(calls.length!==1)fail('atelier-native-call-unobserved');
  return {status:'AUTHORIZED_ATELIER',directory:run.directory,atelier:changeTestArea(run.directory,run.changeId,run.runId),runtimeRoots};
}

export function cleanTestArea(workspace,changeId,runId,{closed,reportsDurable}={}) {
  if(closed!==true||reportsDurable!==true)fail('atelier-cleanup-run-not-closed');
  const root=ensureProjectTestRoot(workspace);
  if(!identity(changeId)||!identity(runId)||[changeId,runId].some(value=>value==='.'||value==='..'))fail('atelier-identity-invalid');
  if(!existsSync(join(root,changeId,runId)))return {runId,changeId,removed:false,rootRetained:true};
  const area=changeTestArea(workspace,changeId,runId);
  rmSync(area,{recursive:true});
  return {runId,changeId,removed:true,rootRetained:existsSync(join(workspace,'.cab-tests'))};
}
