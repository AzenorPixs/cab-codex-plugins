/** Archives CAB réelles et suppression explicite, sans toucher aux sources projet. */
import {existsSync,lstatSync,readdirSync,readFileSync,realpathSync,unlinkSync,rmdirSync} from 'node:fs';
import {join,dirname,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {homedir} from 'node:os';
import {ensurePrivateStateDirectory,readRuntimeJson,writeRuntimeJson} from './cgpt-approval-bridge-state-layout.mjs';
export const VERSION='2.4.24';
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
    const archiveId='archive-'+hash(JSON.stringify([scope.changeId,[...scope.runIds].sort()]));
    const deleted=join(this.directory,'.delete-'+archiveId+'.json');
    if(existsSync(deleted)) {
      const receipt=readRuntimeJson(deleted).value;
      if(receipt.state==='DONE')return {archiveId,fingerprint:receipt.fingerprint,retention:'DEVELOPER_DELETED'};
      fail('archive-deletion-in-progress');
    }
    const directory=join(this.directory,archiveId);ensurePrivateStateDirectory(directory);
    const files=[];
    for(const path of reportPaths) {
      const tail=relative(this.workspace,path);
      if(!/^openspec\/changes\/(?:archive\/)?[^/]+\/[^/]+$/.test(tail)||!reports.has(path.slice(path.lastIndexOf('/')+1))||realpathSync(dirname(path))!==dirname(path))fail('archive-source-invalid');
      const change=tail.split('/').at(-2).replace(/^\d{4}-\d{2}-\d{2}-/,'');
      if(change!==scope.changeId)fail('archive-source-change-divergent');
      const info=lstatSync(path);
      if(!info.isFile()||info.isSymbolicLink()||info.size>4*1024*1024)fail('archive-source-invalid');
      const bytes=readFileSync(path),sha256=hash(bytes),content=bytes.toString('utf8');
      if(!Buffer.from(content).equals(bytes))fail('archive-encoding-invalid');
      // Une copie CAB possède son origine et son empreinte ; elle n'est pas le fichier métier.
      const name=sha256+'.json',value={content,sha256};
      if(existsSync(join(directory,name))&&JSON.stringify(readRuntimeJson(join(directory,name)).value)!==JSON.stringify(value))fail('archive-content-conflict');
      writeRuntimeJson(join(directory,name),value);files.push({origin:tail,sha256,name,bytes:bytes.length});
    }
    const manifest={archiveId,workspace:this.workspace,changeId:scope.changeId,runIds:[...scope.runIds].sort(),closed:true,branch,files};
    if(existsSync(join(directory,'manifest.json'))&&JSON.stringify(readRuntimeJson(join(directory,'manifest.json')).value)!==JSON.stringify(manifest))fail('archive-manifest-conflict');
    writeRuntimeJson(join(directory,'manifest.json'),manifest);
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
