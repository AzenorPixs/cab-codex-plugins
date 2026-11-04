import {createHash,randomUUID} from 'node:crypto';
import {homedir} from 'node:os';
import {dirname,isAbsolute,join,relative,resolve} from 'node:path';
import {constants,closeSync,existsSync,fstatSync,fsyncSync,lstatSync,mkdirSync,openSync,readFileSync,readdirSync,realpathSync,renameSync,writeFileSync,chmodSync} from 'node:fs';
export const VERSION='2.2.30';
const fail=code=>{throw Object.assign(new Error(code),{code});};
const hash=b=>createHash('sha256').update(b).digest('hex');
export function legacyStateDirectory(workspace){return join(workspace,'.opencode/state/cgpt-approval-bridge');}
export function runtimeStateDirectory(workspace,{home=homedir(),stateHome=process.env.OC_Codex_RUNTIME_STATE_ROOT||process.env.OC_CGPT_RUNTIME_STATE_ROOT||join(home,'.local/state')}={}) {
 if(!isAbsolute(workspace)||!isAbsolute(stateHome))fail('runtime-state-path-invalid');
 const path=join(resolve(stateHome),'cab-approval-bridge',hash(resolve(workspace)),'cgpt-approval-bridge');
 const within=relative(resolve(workspace),path);
 if(!within||!within.startsWith('..')&&!isAbsolute(within))fail('runtime-state-inside-project');
 return path;
}
export function projectAuthorityPath(workspace) {
 let path=resolve(workspace);
 for(const part of ['.opencode','state','cgpt-approval-bridge']) {
  path=join(path,part);
  if(!existsSync(path)){mkdirSync(path,{mode:0o775});chmodSync(path,0o775);}
  if(realpathSync(path)!==path||!lstatSync(path).isDirectory())fail('runtime-authority-directory-invalid');
 }
 return join(path,'registry.instance.lock');
}
export function ensurePrivateStateDirectory(path) {
 mkdirSync(path,{recursive:true,mode:0o700});
 if(realpathSync(path)!==resolve(path))fail('runtime-state-symlink');
 const s=lstatSync(path);if(!s.isDirectory()||s.uid!==process.getuid()||(s.mode&0o077))fail('runtime-state-directory-unsafe');
}
export function readRuntimeJson(path,{legacy=false,maxBytes=64*1024*1024}={}) {
 let fd;
 try {fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);const s=fstatSync(fd);
  if(!s.isFile()||s.nlink!==1||s.size>maxBytes||!legacy&&(s.uid!==process.getuid()||(s.mode&0o077)))fail('runtime-state-file-unsafe');
  const bytes=readFileSync(fd);if(!Buffer.from(bytes.toString('utf8')).equals(bytes))fail('runtime-state-encoding-invalid');
  return {value:JSON.parse(bytes.toString('utf8')),bytes,sha256:hash(bytes)};
 }finally{if(fd!==undefined)closeSync(fd);}
}
export function writeRuntimeJson(path,value) {
 ensurePrivateStateDirectory(dirname(path));const tmp=path+'.candidate-'+randomUUID();let fd;
 try{fd=openSync(tmp,'wx',0o600);writeFileSync(fd,JSON.stringify(value)+'\n');fsyncSync(fd);closeSync(fd);fd=undefined;renameSync(tmp,path);
  fd=openSync(dirname(path),'r');fsyncSync(fd);
 }finally{if(fd!==undefined)closeSync(fd);}
}
const names=new Set(['controller-runs.json','controller-job.json','controller-communication.json','controller-statistics.json',
 'controller-observations.json','protocol-observations.json','protocol-efficiency.json','recovery-policies.json','manifest-extensions.json',
 'native-instances.json','shell-lifecycle.json','shell-stages.json','supervisor-state.json','model-transitions.json']);
export function legacyRuntimeFiles(workspace) {
 const source=legacyStateDirectory(workspace),files=[];
 const visit=(directory,tail='')=>{
  if(!existsSync(directory))return;
  if(realpathSync(directory)!==directory)fail('legacy-state-symlink');
  for(const entry of readdirSync(directory,{withFileTypes:true})) {
   const part=tail?tail+'/'+entry.name:entry.name,path=join(directory,entry.name);
   if(entry.isSymbolicLink()&&(part==='runs'||part==='permission-replies'||part.startsWith('runs/')))fail('legacy-state-symlink');
   if(entry.isDirectory()) {
    if(part==='runs'||/^runs\/[A-Za-z0-9_.-]{1,100}(?:\/[0-9]+)?$/.test(part)||part==='permission-replies')visit(path,part);
    continue;
   }
   if(entry.name.includes('sync-conflict')||!names.has(entry.name)&&!(tail==='permission-replies'&&/^[a-f0-9]{64}\.json$/.test(entry.name)))continue;
   if(entry.isSymbolicLink())fail('legacy-state-symlink');
   const file=readRuntimeJson(path,{legacy:true});files.push({name:part,sha256:file.sha256,bytes:file.bytes});
  }
 };
 visit(source);return files;
}
export function initializeRuntimeState(workspace,destination=runtimeStateDirectory(workspace)) {
 ensurePrivateStateDirectory(destination);const marker=join(destination,'runtime-layout.json');
 if(existsSync(marker)) {const m=readRuntimeJson(marker).value;if(m.workspace!==workspace||m.schema!==1)fail('runtime-state-owner-divergent');
  if(m.phase==='READY')return m;if(m.phase!=='COPYING')fail('runtime-state-migration-invalid');}
 const source=legacyStateDirectory(workspace),files=legacyRuntimeFiles(workspace);
 const existing=existsSync(marker)?readRuntimeJson(marker).value:null;
 if(!existing&&existsSync(join(destination,'controller-runs.json')))fail('runtime-state-migration-collision');
 const description={schema:1,workspace,layout:'private-user-state-v1',source,phase:'COPYING',migrationId:existing?.migrationId||'migration-'+randomUUID(),
  files:files.map(({name,sha256})=>({name,sha256}))};
 if(existing&&JSON.stringify(existing.files)!==JSON.stringify(description.files))fail('legacy-state-changed');
 writeRuntimeJson(marker,description);
 for(const file of files) {
  const path=join(destination,file.name);ensurePrivateStateDirectory(dirname(path));
  if(existsSync(path)){const old=readRuntimeJson(path);if(old.sha256===file.sha256)continue;
   if(!existing)fail('runtime-state-migration-collision');}
  const tmp=path+'.candidate-'+randomUUID();const fd=openSync(tmp,'wx',0o600);
  try{writeFileSync(fd,file.bytes);fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(tmp,path);const directoryFd=openSync(dirname(path),'r');try{fsyncSync(directoryFd);}finally{closeSync(directoryFd);}
 }
 const complete={...description,phase:'READY',copiedAt:new Date().toISOString()};writeRuntimeJson(marker,complete);return complete;
}
