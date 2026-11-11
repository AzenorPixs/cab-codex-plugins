/** Archives CAB réelles et suppression explicite, sans toucher aux sources projet. */
import {existsSync,lstatSync,readdirSync,readFileSync,realpathSync,unlinkSync,rmdirSync,mkdtempSync,renameSync,rmSync} from 'node:fs';
import {join,dirname,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {homedir} from 'node:os';
import {ensurePrivateStateDirectory,readRuntimeJson,writeRuntimeJson} from './cgpt-approval-bridge-state-layout.mjs';
export const VERSION='2.7.1';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const id=value=>/^archive-[a-f0-9]{64}$/.test(value||'');
const fail=code=>{throw Object.assign(new Error(code),{code,status:409});};
const reports=new Set(['STATISTICS.md','STATISTIQUES.md','VALIDATION.md','BLOCKERS.md']);
export const archiveDirectory=(workspace,{home=homedir(),stateRoot=join(home,'.local/state/cab-approval-bridge-monitor')}={})=>join(stateRoot,'archives',hash(workspace));
export function changeReports(workspace,changeId,branch) {
  if(!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,199}$/.test(changeId))fail('archive-change-invalid');
  const base=join(workspace,'openspec/changes');
  const directories=branch==='BLOQUÉ'?[join(base,changeId)]:
    readdirSync(join(base,'archive')).filter(name=>name===changeId||/^\d{4}-\d{2}-\d{2}-/.test(name)&&name.slice(11)===changeId).map(name=>join(base,'archive',name));
  const paths=[];
  for(const directory of directories)for(const name of reports)if(existsSync(join(directory,name)))paths.push(join(directory,name));
  if(!paths.some(path=>['STATISTICS.md','STATISTIQUES.md'].includes(path.slice(path.lastIndexOf('/')+1))))fail('archive-statistics-required');
  return paths;
}

export class ArchiveContent {
  constructor(directory,workspace) {this.directory=directory;this.workspace=workspace;ensurePrivateStateDirectory(directory);}
  load(archiveId) {
    if(!id(archiveId))fail('archive-identity-invalid');
    const directory=join(this.directory,archiveId);
    if(realpathSync(directory)!==directory)fail('archive-path-invalid');
    const manifest=readRuntimeJson(join(directory,'manifest.json')).value;
    if(manifest.archiveId!==archiveId||manifest.workspace!==this.workspace||manifest.closed!==true||!Array.isArray(manifest.runIds)||!Array.isArray(manifest.files))fail('archive-manifest-invalid');
    return manifest;
  }
  retain(scope,{reportPaths,closed,branch}) {
    if(closed!==true||!['TERMINÉ','BLOQUÉ'].includes(branch)||scope.workspace!==this.workspace||!Array.isArray(reportPaths)||!reportPaths.length)fail('archive-closure-proof-required');
    const runs=[...scope.runIds].sort(),baseId='archive-'+hash(JSON.stringify([scope.changeId,runs]));
    const deletedReceipt=archiveId=>join(this.directory,'.delete-'+archiveId+'.json');
    const checkDeleted=archiveId=>{
      const path=deletedReceipt(archiveId);if(!existsSync(path))return null;
      const receipt=readRuntimeJson(path).value;
      if(receipt.state!=='DONE')fail('archive-deletion-in-progress');
      return {archiveId,fingerprint:receipt.fingerprint,retention:'DEVELOPER_DELETED'};
    };
    const baseDeleted=checkDeleted(baseId);
    if(baseDeleted)return baseDeleted;
    const basePath=join(this.directory,baseId,'manifest.json');
    const prior=existsSync(basePath)?this.load(baseId):null;
    if(prior) {
      if(prior.changeId!==scope.changeId||prior.branch!==branch||JSON.stringify(prior.runIds)!==JSON.stringify(runs))fail('archive-manifest-conflict');
      for(const old of prior.files)this.content(baseId,old.sha256);
    }
    const files=[],values=[];
    for(const path of reportPaths) {
      const tail=relative(this.workspace,path);
      if(!/^openspec\/changes\/(?:archive\/)?[^/]+\/[^/]+$/.test(tail)||!reports.has(path.slice(path.lastIndexOf('/')+1))||realpathSync(dirname(path))!==dirname(path))fail('archive-source-invalid');
      const change=tail.split('/').at(-2).replace(/^\d{4}-\d{2}-\d{2}-/,'');
      if(change!==scope.changeId)fail('archive-source-change-divergent');
      const info=lstatSync(path);
      if(!info.isFile()||info.isSymbolicLink()||info.size>4*1024*1024)fail('archive-source-invalid');
      const bytes=readFileSync(path),sha256=hash(bytes),content=bytes.toString('utf8');
      if(!Buffer.from(content).equals(bytes))fail('archive-encoding-invalid');
      const name=sha256+'.json';values.push({name,value:{content,sha256},path,sha256});files.push({origin:tail,sha256,name,bytes:bytes.length});
    }
    const checkSources=()=>{for(const item of values){const info=lstatSync(item.path);if(!info.isFile()||info.isSymbolicLink()||hash(readFileSync(item.path))!==item.sha256)fail('archive-source-changed');}};
    checkSources();
    const equalFiles=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
    if(prior&&equalFiles(prior.files,files))return {...prior,fingerprint:hash(JSON.stringify(prior))};
    const revised=Boolean(prior);
    const archiveId=revised?'archive-'+hash(JSON.stringify([baseId,files])):baseId;
    const deleted=checkDeleted(archiveId);if(deleted)return deleted;
    const directory=join(this.directory,archiveId),manifestPath=join(directory,'manifest.json');
    const manifest={archiveId,workspace:this.workspace,changeId:scope.changeId,runIds:runs,closed:true,branch,files,...(revised?{supersedes:baseId}:{})};
    if(existsSync(manifestPath)) {
      const existing=this.load(archiveId);
      if(JSON.stringify(existing)!==JSON.stringify(manifest))fail('archive-manifest-conflict');
      for(const file of existing.files)this.content(archiveId,file.sha256);
      return {...existing,fingerprint:hash(JSON.stringify(existing))};
    }
    if(existsSync(directory))fail('archive-incomplete');
    const candidate=mkdtempSync(join(this.directory,'.candidate-'));
    try {
      for(const {name,value} of values)writeRuntimeJson(join(candidate,name),value);
      writeRuntimeJson(join(candidate,'manifest.json'),manifest);
      checkSources();
      if(checkDeleted(baseId)||checkDeleted(archiveId))fail('archive-deletion-in-progress');
      try{renameSync(candidate,directory);}catch(error){
        if(!['EEXIST','ENOTEMPTY'].includes(error.code)||!existsSync(manifestPath))throw error;
        const existing=this.load(archiveId);if(JSON.stringify(existing)!==JSON.stringify(manifest))fail('archive-manifest-conflict');
        for(const file of existing.files)this.content(archiveId,file.sha256);
      }
    } finally {if(existsSync(candidate))rmSync(candidate,{recursive:true,force:true});}
    return {...manifest,fingerprint:hash(JSON.stringify(manifest))};
  }
  list() {
    return readdirSync(this.directory).filter(id).sort().map(archiveId=>{const value=this.load(archiveId);return {...value,fingerprint:hash(JSON.stringify(value))};});
  }
  content(archiveId,sha256) {
    if(!/^[a-f0-9]{64}$/.test(sha256||''))fail('archive-content-invalid');
    const manifest=this.load(archiveId),file=manifest.files.find(file=>file.sha256===sha256);
    if(!file||file.name!==sha256+'.json')fail('archive-content-not-found');
    const value=readRuntimeJson(join(this.directory,archiveId,file.name),{maxBytes:32*1024*1024}).value;
    if(value.sha256!==sha256||hash(Buffer.from(value.content))!==sha256)fail('archive-content-divergent');
    return {...value,origin:file.origin};
  }
  remove(archiveId,fingerprint,activeRunIds=[]) {
    if(!id(archiveId)||!/^[a-f0-9]{64}$/.test(fingerprint||''))fail('archive-delete-input-invalid');
    const receipt=join(this.directory,'.delete-'+archiveId+'.json');
    const prior=existsSync(receipt)?readRuntimeJson(receipt).value:null;
    if(prior&&(prior.fingerprint!==fingerprint||prior.archiveId!==archiveId))fail('archive-delete-receipt-conflict');
    if(prior?.state==='DONE')return prior;
    const directory=join(this.directory,archiveId);
    if(prior?.state==='DELETING'&&!existsSync(join(directory,'manifest.json'))) {
      if(existsSync(directory)) {
        if(realpathSync(directory)!==directory||readdirSync(directory).length)fail('archive-delete-inventory-divergent');
        rmdirSync(directory);
      }
      const result={archiveId,fingerprint,state:'DONE'};writeRuntimeJson(receipt,result);return result;
    }
    const manifest=this.load(archiveId);
    if(manifest.runIds.some(runId=>activeRunIds.includes(runId)))fail('archive-run-in-progress');
    if(hash(JSON.stringify(manifest))!==fingerprint)fail('archive-delete-content-changed');
    const names=new Set(manifest.files.map(file=>file.name));
    if([...names].some(name=>!/^[a-f0-9]{64}\.json$/.test(name))||readdirSync(directory).some(name=>name!=='manifest.json'&&!names.has(name)))fail('archive-delete-inventory-divergent');
    writeRuntimeJson(receipt,{archiveId,fingerprint,state:'DELETING'});
    for(const name of names)if(existsSync(join(directory,name)))unlinkSync(join(directory,name));
    unlinkSync(join(directory,'manifest.json'));rmdirSync(directory);
    const result={archiveId,fingerprint,state:'DONE'};writeRuntimeJson(receipt,result);return result;
  }
}
