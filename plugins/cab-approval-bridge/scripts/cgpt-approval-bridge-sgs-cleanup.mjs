/** Effacement SGS ciblé après arrêt des producteurs, rapports durables conservés. */
import {existsSync} from 'node:fs';
import {readdir,lstat,unlink} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {runtimeRequest,stateRootDirectory} from './cgpt-approval-bridge-runtime-client.mjs';
import {projectErasure,erasureReferences} from './cgpt-approval-bridge-change-erasure.mjs';
import {readRuntimeJson,writeRuntimeJson} from './cgpt-approval-bridge-state-layout.mjs';
export const VERSION='2.4.33';
const fail=code=>{throw Object.assign(new Error(code),{code});};
function removeCurrentErasureMarker(data,component,receiptId) {
  if(component!=='broker-statistics'||!data||typeof data!=='object'||Array.isArray(data)||data.erasure_prepared!==receiptId)return data;
  const {erasure_prepared,...rest}=data;return rest;
}

export async function purgeStatistics(scope,branch,receiptId,{home=homedir(),request=runtimeRequest}={}) {
  const preview=await request('sgs','/purge/preview',{scope,branch},{home});
  const bindingIds=new Set(preview.bindings),files=[],floors=new Map();
  const directory=join(stateRootDirectory(home),'cab-approval-bridge/sgs-outbox');
  if(existsSync(directory))for(const name of await readdir(directory)) {
    if(!/^(?:binding-|source-|checkpoint-)?[a-f0-9]{64}\.json(?:\.candidate-[a-f0-9-]{36})?$/.test(name))continue;
    const path=join(directory,name),info=await lstat(path);
    if(!info.isFile()||info.uid!==process.getuid()||info.mode&0o077)fail('sgs-outbox-owner-divergent');
    const value=readRuntimeJson(path).value;
    if(value.project===scope.workspace&&(scope.closureAuthority==='authoritative-retired-run-batch-v1'?scope.runIds.includes(value.run):value.change===scope.changeId)&&value.binding)bindingIds.add(value.binding);
    files.push({path,value});
  }
  for(const {path,value} of files) {
    if(value.project===scope.workspace&&typeof value.component==='string') {
      const next=projectErasure(removeCurrentErasureMarker(value.data,value.component,receiptId),scope);
      if(erasureReferences(next,scope).length)fail('sgs-outbox-projection-incomplete');
      floors.set(value.component,Math.max(floors.get(value.component)||0,value.sequence+1));
      if(next===undefined)await unlink(path);else writeRuntimeJson(path,{...value,data:next});
    }else if(bindingIds.has(value.binding))await unlink(path);
  }
  const components=[];
  for(const source of preview.components) {
    const result=await request('sgs','/component/checkpoint?'+new URLSearchParams({project:scope.workspace,component:source.component}),undefined,{home,maxResponseBytes:64*1024*1024});
    const data=projectErasure(removeCurrentErasureMarker(result.data,source.component,receiptId),scope);
    if(erasureReferences(data,scope).length)fail('sgs-component-projection-incomplete');
    components.push({component:source.component,expectedFingerprint:source.fingerprint,data:data??null,sequenceFloor:floors.get(source.component)||0});
  }
  const sgs=await request('sgs','/purge',{scope,receipt_id:receiptId,components},{home});
  const ccab=await request('ccab','/purge-resolved',{scope,closed:true},{home});
  return {...sgs,ccab};
}

export async function verifyStatisticsAbsence(scope,{home=homedir(),request=runtimeRequest}={}) {
  const preview=await request('sgs','/purge/preview',{scope,branch:'VERIFY'},{home});
  if(preview.bindings.length)fail('sgs-bindings-still-present');
  for(const component of preview.components) {
    const value=await request('sgs','/component/checkpoint?'+new URLSearchParams({project:scope.workspace,component:component.component}),undefined,{home,maxResponseBytes:64*1024*1024});
    if(erasureReferences(value.data,scope).length)fail('sgs-component-still-present');
  }
  return {status:'VERIFIED',scope_digest:preview.scope_digest};
}
