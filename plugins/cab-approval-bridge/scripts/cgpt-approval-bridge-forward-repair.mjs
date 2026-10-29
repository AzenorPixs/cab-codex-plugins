import { constants } from 'node:fs';
import { lstat, open, writeFile, mkdir, rename, unlink, readlink, symlink } from 'node:fs/promises';
import { join, resolve, dirname, relative, isAbsolute, basename } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { processIdentity, proofHash, maintenanceHttp } from './cgpt-approval-bridge-maintenance-proof.mjs';
import { validateBrokerProof, inspectBrokerArtifacts } from './cgpt-approval-bridge-broker-artifact-proof.mjs';
import { ResourceRunRegistry } from './cgpt-approval-bridge-resource-coordination.mjs';
import { publicLifecycle } from './cgpt-approval-bridge-run-steps.mjs';
import { createOpenCodeV2ClientFromEnv } from './cgpt-approval-bridge-opencode-client.mjs';

export const VERSION = '2.1.10';
const exec = promisify(execFile);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const fail = (code) => { throw Object.assign(new Error(code), { code }); };
const within = (root,path) => { const p=relative(root,path);return !p||(!isAbsolute(p)&&p!=='..'&&!p.startsWith('../')); };
const unit = (name) => 'cgpt-approval-bridge-'+name+'.service';
const codeVersion = (data) => data.toString('utf8').match(/^(?:export )?(?:const )?(?:VERSION|SERVER_VERSION|version)\s*=\s*["']([^"']+)["']/m)?.[1];
async function directory(path, owned=false) {
  if(!isAbsolute(path)||resolve(path)!==path)fail('forward-path-invalid');
  let cursor='/';for(const part of path.split('/').filter(Boolean)){cursor=join(cursor,part);const s=await lstat(cursor);if(!s.isDirectory()||s.isSymbolicLink())fail('forward-path-unsafe');}
  const s=await lstat(path);if(owned&&(s.uid!==process.getuid()||(s.mode&0o022)))fail('forward-owner-invalid');
}
async function regular(path,limit=4*1024*1024,owned=false) {
  await directory(dirname(path));const fd=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
  try {const s=await fd.stat();if(!s.isFile()||s.nlink!==1||s.size>limit||(owned&&(s.uid!==process.getuid()||(s.mode&0o077))))fail('forward-file-unsafe');
    const data=await fd.readFile();if(data.length>limit)fail('forward-file-too-large');return {data,stat:s};
  } finally {await fd.close();}
}
async function atomic(path,data,mode=0o600) {
  await directory(dirname(path),true);const tmp=join(dirname(path),'.forward-'+randomUUID());const fd=await open(tmp,'wx',mode);
  try {await fd.writeFile(data);await fd.sync();}finally{await fd.close();}await rename(tmp,path);
  const parent=await open(dirname(path),'r');try{await parent.sync();}finally{await parent.close();}
}
async function switchLink(path,link) {
  const tmp=join(dirname(path),'.forward-link-'+randomUUID());await symlink(link,tmp);await rename(tmp,path);
  const parent=await open(dirname(path),'r');try{await parent.sync();}finally{await parent.close();}
}
async function lock(path) {
  const child=spawn('python3',[fileURLToPath(new URL('./cgpt-approval-bridge-registry-lock.py',import.meta.url)),path],{stdio:['pipe','pipe','ignore']});child.stdin.on('error',()=>{});
  try {await new Promise((done,reject)=>{let output='';const timer=setTimeout(()=>reject(new Error('forward-lock-timeout')),5000);
    child.once('error',reject);child.once('exit',()=>{clearTimeout(timer);reject(new Error('forward-lock-busy'));});
    child.stdout.on('data',chunk=>{output+=chunk;if(output.trim()==='READY'){clearTimeout(timer);done();}});
  });}catch(error){child.kill('SIGTERM');throw error;}
  return async()=>{if(child.exitCode===null&&child.signalCode===null)await new Promise(done=>{child.once('exit',done);child.stdin.end();});};
}
const registryIdentity = (s) => hash(JSON.stringify({runs:[...s.runs].sort((a,b)=>a.runId.localeCompare(b.runId)).map(r=>
  [r.runId,r.changeId,r.sessionId,r.contextId,r.version,r.state,r.suspension||null,r.resources]),requestOwners:Object.entries(s.requestOwners||{}).sort(([a],[b])=>a.localeCompare(b))}));
function repairRuns(before,after) {
  const text=before.toString('utf8');const start=text.indexOf('  if (/^(docker|lxc|browser):/.test(key) &&');
  const end=text.indexOf('  if (key.startsWith("file:"))',start);
  if(start<0||end<0)fail('forward-code-change-not-qualified');
  const block=text.slice(start,end);
  if(block.trim().split('\n').length!==4||!block.includes("'test-resource-identity-invalid'"))fail('forward-code-change-not-qualified');
  if(Buffer.from(text.slice(0,start)+text.slice(end)).compare(after)!==0)fail('forward-code-change-not-qualified');
}

export async function repairForwardRelease(input,options={}) {
  const c={controllerUrl:'http://127.0.0.1:8788',supervisorUrl:'http://127.0.0.1:8789',monitorUrl:'http://127.0.0.1:8790',opencodeUrl:'http://127.0.0.1:4096',...input};
  for(const key of ['home','workspace','pluginRoot','brokerDirectory']){if(typeof c[key]!=='string'||!isAbsolute(c[key])||resolve(c[key])!==c[key]||c[key]==='/')fail('forward-path-invalid');await directory(c[key]);}
  if(!/^update-[a-f0-9-]{36}$/.test(c.transactionId)||typeof c.authorization!=='string'||!c.authorization.trim()||c.authorization.length>500)fail('forward-authorization-required');
  for(const key of ['controllerUrl','supervisorUrl','monitorUrl','opencodeUrl']){const u=new URL(c[key]);if(u.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.username||u.password||u.pathname!=='/'||u.search||u.hash)fail('forward-url-invalid');c[key]=u.origin;}
  const openCode=options.openCodeClient||createOpenCodeV2ClientFromEnv({directory:c.workspace,baseUrl:c.opencodeUrl,
    ...(options.openCodeFetch?{fetchImpl:options.openCodeFetch}:{})});
  const service=options.serviceCommand|| (async args=>(await exec('/usr/bin/systemctl',['--user',...args],{timeout:15000,maxBuffer:16384})).stdout);
  const request=options.http||maintenanceHttp;
  const state=join(c.home,'.local/state/cab-approval-bridge-update');await directory(state,true);
  const unlock=await lock(join(state,'update.lock'));
  try {
    const currentFile=join(state,'current.json'),tx=join(state,c.transactionId);
    const raw=(await regular(currentFile,4*1024*1024,true)).data;const receipt=JSON.parse(raw);
    if(receipt.schema!==1||receipt.id!==c.transactionId||receipt.version!==VERSION||!receipt.externalBroker||!receipt.maintenance||
      receipt.maintenance.transactionId!==receipt.id||!Number.isSafeInteger(receipt.maintenance.generation)||receipt.externalBroker.disconnectIntentAt===null||
      receipt.externalBroker.afterProcess!==null||receipt.externalBroker.afterInstanceId!==null||receipt.phase!=='READONLY_RECOVERY_REQUIRED')fail('forward-phase-refused');
    const proof=c.brokerProof;validateBrokerProof(proof,c.brokerDirectory);
    const expected=hash(JSON.stringify([c.home,c.workspace,c.brokerDirectory,c.controllerUrl,c.supervisorUrl,c.monitorUrl,c.opencodeUrl,'reuse-readonly',proofHash(proof)]));
    if(expected!==receipt.contextKey||proofHash(proof)!==receipt.externalBroker.proofDigest||proof.loadedVersion!==receipt.externalBroker.beforeLoadedVersion||proof.instanceId!==receipt.externalBroker.beforeInstanceId)fail('forward-context-divergent');
    if(proofHash(await processIdentity(proof.opencodeProcess.pid))!==proofHash(proof.opencodeProcess))fail('forward-opencode-changed');
    const artifacts=await inspectBrokerArtifacts(c.brokerDirectory,proof,join(c.pluginRoot,'broker'));
    if(proofHash(artifacts)!==proofHash(receipt.externalBroker.artifacts))fail('forward-broker-artifact-changed');
    const registryPath=join(c.workspace,'.opencode/state/cgpt-approval-bridge/controller-runs.json');
    const registryRaw=(await regular(registryPath,16*1024*1024,true)).data;const registry=JSON.parse(registryRaw),global=registry.coordination?.global;
    if(registry.project!==c.workspace||registry.schemaVersion!==4||registry.coordinationProtocol!=='resource-scoped-v1'||global?.state!=='HELD'||
      global.cause!=='SHARED_MAINTENANCE'||global.transactionId!==receipt.id||global.generation!==receipt.maintenance.generation||
      registryIdentity(registry)!==receipt.runIdentity||registry.runs.some(r=>r.state==='RESERVED'&&r.suspension?.action!=='PAUSE')||
      Object.values(registry.coordination.accesses).some(a=>['HELD','WAITING','EXECUTING','UNKNOWN'].includes(a.state))||
      Object.values(registry.coordination.operations).some(o=>['ISSUING','EXECUTING','UNKNOWN'].includes(o.state)))fail('forward-held-proof-invalid');
    const [health,mcp,permissions,sessions]=await Promise.all([openCode.info(),openCode.mcp(c.workspace),openCode.permissions(c.workspace),openCode.sessionStatus(c.workspace)]);
    if(!health.version.startsWith('2.')||mcp?.['cgpt-validation']?.status!=='disabled'||!Array.isArray(permissions)||permissions.length||
      !sessions||typeof sessions!=='object'||Object.values(sessions).some(s=>s.type!=='idle'))fail('forward-native-not-quiescent');
    for(const run of registry.runs.filter(r=>r.state==='RESERVED')){const s=await openCode.session(run.sessionId,c.workspace);if(s.id!==run.sessionId||s.directory!==c.workspace)fail('forward-native-session-divergent');}
    const jobViews=[];
    for(const run of registry.runs.filter(r=>r.state==='RESERVED').sort((a,b)=>a.runId.localeCompare(b.runId))){
      const path=join(c.workspace,'.opencode/state/cgpt-approval-bridge/runs',run.runId,String(run.contextId||run.version),'controller-job.json');
      const stored=await regular(path);
      if(stored.stat.uid!==process.getuid())fail('forward-job-not-owned');
      const job=JSON.parse(stored.data);
      const view={...job,runId:run.runId,strictCommands:job.strictCommands===true,lifecycle:publicLifecycle(job.lifecycle),recovery:job.recovery||null,recoveryHistory:job.recoveryHistory||[],revokedSessions:job.revokedSessions||[]};
      jobViews.push([run.runId,Object.fromEntries(['runId','jobId','sessionId','directory','changeId','criteria','strictCommands','armed','recovery','recoveryHistory','revokedSessions','currentCabMandate','lifecycle','lastProvenMilestone'].map(key=>[key,view[key]??null]))]);
    }
    if(proofHash(jobViews)!==receipt.jobIdentity)fail('forward-job-identity-changed');
    const roots={scripts:join(c.home,'.local/share/cab-approval-bridge'),monitorScripts:join(c.home,'.local/share/cab-approval-bridge-monitor/scripts'),web:join(c.home,'.local/share/cab-approval-bridge-monitor/web-monitor'),units:join(c.home,'.config/systemd/user')};
    async function metadata(name){const text=await service(['show',unit(name),'--property=ActiveState,MainPID,ExecStart']);const value=Object.fromEntries(text.trim().split('\n').map(line=>{const i=line.indexOf('=');return[line.slice(0,i),line.slice(i+1)];}));
      const entry=join(name==='monitor'?roots.monitorScripts:roots.scripts,'cgpt-approval-bridge-'+name+'.mjs');
      if(!value.ExecStart?.includes(entry))fail('forward-service-entry-divergent');
      if(Number(value.MainPID)>0&&(await processIdentity(Number(value.MainPID))).uid!==process.getuid())fail('forward-service-not-owned');return value;
    }
    for(const name of ['controller','supervisor'])if(Number((await metadata(name)).MainPID)!==0)fail('forward-service-still-active');
    await metadata('monitor');
    if(!Array.isArray(receipt.files)||receipt.files.length>128)fail('forward-files-invalid');
    if(!receipt.managed||receipt.layoutDigest!==proofHash(receipt.managed)||Object.entries(receipt.managed).some(([group,p])=>p.mode!=='links'||p.logical!==roots[group]||p.root!==(group==='scripts'?roots.scripts:dirname(roots[group]))||!within(p.root,p.directory)||!p.directory.includes('/releases/')))fail('forward-layout-refused');
    for(const plan of Object.values(receipt.managed))await directory(plan.root,true);
    const manifest=JSON.parse((await regular(join(c.pluginRoot,'.codex-plugin/plugin.json'))).data);
    if(manifest.version.split('+')[0]!==VERSION)fail('forward-package-version-invalid');
    let pending=null;
    try{
      const pointer=JSON.parse((await regular(join(tx,'forward-current.json'),4*1024*1024,true)).data);
      if(!/^[a-f0-9]{24}$/.test(pointer.id)||pointer.plan!==join(tx,'forward',pointer.id,'plan.json'))fail('forward-plan-invalid');
      const value=JSON.parse((await regular(pointer.plan,4*1024*1024,true)).data);
      if(!receipt.forwardRepair){
        if(value.schema!==1||value.transactionId!==receipt.id||value.id!==pointer.id||value.originalReceiptHash!==hash(raw)||
          value.registryHash!==hash(registryRaw)||value.amended.forwardRepair.authorizationDigest!==hash(c.authorization))fail('forward-plan-divergent');
        pending={value,root:dirname(pointer.plan)};
      }
    }catch(e){if(e.code!=='ENOENT')throw e;}
    const candidate=[];let changes=0;
    for(let i=0;i<receipt.files.length;i++){
      const file=receipt.files[i];if(!roots[file.group]||basename(file.name)!==file.name||file.group==='broker')fail('forward-file-target-invalid');
      const folder=file.group==='web'?'web-monitor':file.group==='units'?'systemd':'scripts';const source=join(c.pluginRoot,folder,file.name);
      const data=(await regular(source)).data;
      if(file.group!=='web'&&(file.name.endsWith('.mjs')||file.name.endsWith('.py'))){if(codeVersion(data)!==VERSION)fail('forward-file-version-invalid');}
      const oldStage=(await regular(join(pending?join(pending.root,'original-stage'):join(tx,'stage'),String(i)),4*1024*1024,true)).data;
      const sha=hash(data);
      const currentStage=(await regular(join(tx,'stage',String(i)),4*1024*1024,true)).data;
      if(![file.afterHash,sha].includes(hash(currentStage)))fail('forward-stage-changed');
      if(sha!==file.afterHash){
        if(file.group!=='scripts'||file.name!=='cgpt-approval-bridge-runs.mjs')fail('forward-code-change-not-qualified');
        repairRuns(oldStage,data);changes++;
      }
      candidate.push({file,index:i,data,sha,oldStage});
    }
    for(const x of candidate){
      const file=x.file,target=join(roots[file.group],file.name),oldPlan=receipt.managed[file.group];let stat;
      try{stat=await lstat(target);}catch(e){if(e.code!=='ENOENT')throw e;}
      if(!stat){if(file.beforeHash!==null&&file.originalKind!=='missing')fail('forward-installed-artifact-missing');continue;}
      if(stat.uid!==process.getuid()||stat.nlink!==1)fail('forward-installed-artifact-unsafe');
      let data;
      if(stat.isSymbolicLink()){
        const link=await readlink(target),expected=oldPlan?relative(dirname(target),join(oldPlan.directory,file.name)):null;
        if(!oldPlan||isAbsolute(link)||![file.originalLink,expected].includes(link))fail('forward-pointer-changed');
        const path=resolve(dirname(target),link);if(!within(oldPlan.root,path)||!relative(oldPlan.root,path).startsWith('releases/'))fail('forward-pointer-changed');data=(await regular(path)).data;
      }else data=(await regular(target)).data;
      if(![file.beforeHash,file.afterHash].includes(hash(data)))fail('forward-installed-artifact-changed');
      if(file.originalKind==='link'){
        const path=resolve(dirname(target),file.originalLink);if(!within(oldPlan.root,path)||hash((await regular(path)).data)!==file.beforeHash)fail('forward-original-release-changed');
      }else if(file.beforeHash&&hash((await regular(join(tx,'backup',String(x.index)),4*1024*1024,true)).data)!==file.beforeHash)fail('forward-backup-changed');
    }
    const existing=receipt.forwardRepair;
    if(existing){if(existing.authorizationDigest!==hash(c.authorization)||existing.registryHash!==hash(registryRaw)||candidate.some(x=>x.sha!==x.file.afterHash||hash(x.oldStage)!==x.file.afterHash))fail('forward-repair-divergent');return {status:'already-prepared',transactionId:receipt.id,repairId:existing.id};}
    if(changes!==1)fail('forward-code-change-not-qualified');
    const repairId=hash(raw+candidate.find(x=>x.sha!==x.file.afterHash).sha+c.authorization).slice(0,24);
    const repairRoot=pending?.root||join(tx,'forward',repairId);
    await mkdir(join(tx,'forward'),{recursive:true,mode:0o700});await mkdir(repairRoot,{recursive:true,mode:0o700});await directory(repairRoot,true);
    await mkdir(join(repairRoot,'original-stage'),{recursive:true,mode:0o700});
    async function preserve(path,data){try{const old=await regular(path,4*1024*1024,true);if(hash(old.data)!==hash(data))fail('forward-preserved-copy-changed');}catch(e){if(e.code!=='ENOENT')throw e;await writeFile(path,data,{flag:'wx',mode:0o600});}}
    await preserve(join(repairRoot,'original-receipt.json'),raw);
    for(const x of candidate){if(hash(x.oldStage)!==x.file.afterHash)fail('forward-original-stage-changed');await preserve(join(repairRoot,'original-stage',String(x.index)),x.oldStage);}
    const check=join(repairRoot,'validation-state');await mkdir(check,{recursive:true,mode:0o700});
    try{const previous=await regular(join(check,'controller-runs.json'),16*1024*1024,true);if(hash(previous.data)!==hash(registryRaw))fail('forward-validation-copy-changed');}
    catch(e){if(e.code!=='ENOENT')throw e;await writeFile(join(check,'controller-runs.json'),registryRaw,{flag:'wx',mode:0o600});}
    const reader=new ResourceRunRegistry(c.workspace,check);reader.close();
    if(!pending){
      try{
        const saved=JSON.parse((await regular(join(repairRoot,'plan.json'),4*1024*1024,true)).data);
        if(saved.schema!==1||saved.transactionId!==receipt.id||saved.id!==repairId||saved.originalReceiptHash!==hash(raw)||
          saved.registryHash!==hash(registryRaw)||saved.amended?.forwardRepair?.authorizationDigest!==hash(c.authorization))fail('forward-plan-divergent');
        pending={value:saved,root:repairRoot};
      }catch(e){if(e.code!=='ENOENT')throw e;}
    }
    let amended,plan;
    if(pending){
      plan=pending.value;amended=plan.amended;
      if(candidate.some((x,i)=>x.sha!==amended.files[i]?.afterHash)||amended.forwardRepair.id!==repairId)fail('forward-candidate-changed');
    }else{
      amended=structuredClone(receipt);
      for(const m of Object.values(amended.managed)){m.directory=join(m.root,'releases',VERSION+'+forward.'+repairId,m.section);try{await lstat(m.directory);fail('forward-release-already-exists');}catch(e){if(e.code!=='ENOENT')throw e;}}
      for(const x of candidate)amended.files[x.index].afterHash=x.sha;
      amended.layoutDigest=proofHash(amended.managed);
      amended.forwardRepair={id:repairId,authorizationDigest:hash(c.authorization),originalReceiptHash:hash(raw),registryHash:hash(registryRaw),sourceRoot:c.pluginRoot,changedFiles:['cgpt-approval-bridge-runs.mjs'],originalPlan:receipt.managed,preparedAt:new Date().toISOString()};
      amended.updatedAt=new Date().toISOString();
      plan={schema:1,id:repairId,transactionId:receipt.id,phase:'PREPARED',originalReceiptHash:hash(raw),amended,registryHash:hash(registryRaw)};
      await writeFile(join(repairRoot,'plan.json'),JSON.stringify(plan,null,2)+'\n',{flag:'wx',mode:0o600});
    }
    await atomic(join(tx,'forward-current.json'),JSON.stringify({id:repairId,plan:join(repairRoot,'plan.json')})+'\n');
    if(options.onPrepared)await options.onPrepared({transactionId:receipt.id,repairId});
    for(const name of ['supervisor','controller','monitor'])await service(['stop',unit(name)]);
    for(const x of candidate){
      const file=x.file,target=join(roots[file.group],file.name),oldPlan=receipt.managed[file.group];let s;
      try{s=await lstat(target);}catch(e){if(e.code!=='ENOENT')throw e;}
      if(!s){if(file.beforeHash!==null&&file.originalKind!=='missing')fail('forward-installed-artifact-missing');continue;}
      if(s.uid!==process.getuid()||s.nlink!==1)fail('forward-installed-artifact-unsafe');
      let actual;
      if(s.isSymbolicLink()){
        const link=await readlink(target);const expected=oldPlan?relative(dirname(target),join(oldPlan.directory,file.name)):null;
        if(!oldPlan||isAbsolute(link)||![file.originalLink,expected].includes(link))fail('forward-pointer-changed');
        const resolved=resolve(dirname(target),link);if(!within(oldPlan.root,resolved)||!relative(oldPlan.root,resolved).startsWith('releases/'))fail('forward-pointer-changed');actual=(await regular(resolved)).data;
      }else actual=(await regular(target)).data;
      if(![file.beforeHash,file.afterHash].includes(hash(actual)))fail('forward-installed-artifact-changed');
      if(file.originalKind==='link'){
        const original=resolve(dirname(target),file.originalLink);if(!within(oldPlan.root,original)||hash((await regular(original)).data)!==file.beforeHash)fail('forward-original-release-changed');await switchLink(target,file.originalLink);
      }else if(file.beforeHash){const saved=(await regular(join(tx,'backup',String(x.index)),4*1024*1024,true)).data;if(hash(saved)!==file.beforeHash)fail('forward-backup-changed');await atomic(target,saved,file.mode);}
      else await unlink(target);
    }
    for(const x of candidate)if(x.sha!==x.file.afterHash)await atomic(join(tx,'stage',String(x.index)),x.data);
    if(hash((await regular(registryPath,16*1024*1024,true)).data)!==plan.registryHash)fail('forward-registry-changed');
    await atomic(join(tx,'receipt.json'),JSON.stringify(amended,null,2)+'\n');await atomic(currentFile,JSON.stringify(amended,null,2)+'\n');
    plan.phase='APPLIED';await atomic(join(repairRoot,'plan.json'),JSON.stringify(plan,null,2)+'\n');
    return {status:'prepared',transactionId:receipt.id,repairId,maintenanceGeneration:receipt.maintenance.generation,originalReceiptPreserved:true,originalStagesPreserved:true,registryUnchanged:true,changedFiles:amended.forwardRepair.changedFiles};
  }finally{await unlock();}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const flags={'--home':'home','--workspace':'workspace','--plugin-root':'pluginRoot','--broker-directory':'brokerDirectory','--transaction-id':'transactionId','--authorization':'authorization','--broker-proof-file':'proofFile','--controller-url':'controllerUrl','--supervisor-url':'supervisorUrl','--monitor-url':'monitorUrl','--opencode-url':'opencodeUrl'};const c={};
    for(let i=2;i<process.argv.length;i+=2){if(!flags[process.argv[i]]||!process.argv[i+1])fail('forward-arguments-invalid');c[flags[process.argv[i]]]=process.argv[i+1];}
    c.brokerProof=JSON.parse((await regular(c.proofFile,4*1024*1024,true)).data);
    console.log(JSON.stringify(await repairForwardRelease(c)));
  }catch(error){console.error(JSON.stringify({error:error.code||error.message}));process.exitCode=1;}
}
