import { existsSync,constants,openSync,closeSync,fstatSync,readFileSync,realpathSync } from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import { join } from 'node:path';
import { ErasureTransaction, erasureScope, erasureFiles, extendErasureScope } from './cgpt-approval-bridge-change-erasure.mjs';
import { readRuntimeJson } from './cgpt-approval-bridge-state-layout.mjs';
import { canonicalContinuityDigest } from './cgpt-approval-bridge-continuity.mjs';

export const VERSION='2.2.40';
const fail=code=>{throw Object.assign(new Error(code),{code,status:409})};
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
export function erasureMonitorEndpoint(host='127.0.0.1',port='8790') {
  if(!['127.0.0.1','::1'].includes(host)||!/^\d+$/.test(String(port))||Number(port)<1024||Number(port)>65535)fail('erasure-monitor-address-invalid');
  return `http://${host==='::1'?'[::1]':host}:${Number(port)}/api/maintenance-identity`;
}
export class ChangeErasureManager {
  constructor({workspace,stateDirectory,registry,openCode,monitorIdentity,broker=()=>null,terminalProofs=()=>[]}) {
    Object.assign(this,{workspace,stateDirectory,registry,openCode,monitorIdentity,broker,terminalProofs});
    this.tx=null;
  }
  transaction(){return this.tx||=new ErasureTransaction(this.stateDirectory,{createKey:!existsSync(join(this.stateDirectory,'change-erasure.json'))})}
  pending(){return existsSync(join(this.stateDirectory,'change-erasure.json'))?this.transaction().load():null}
  public(value=this.pending()) {
    return value?{protocol:value.protocol,transactionId:value.transactionId,phase:value.phase,scope:value.scope,
      sessionIds:value.sessionIds,retainedSessionId:value.retainedSessionId,roots:value.roots,
      brokerPrepared:this.broker()?.erasure_prepared===value.transactionId,brokerPid:this.broker()?.broker_process?.pid||null,
      brokerPreparationError:this.broker()?.erasure_prepare_error?.transactionId===value.transactionId?this.broker().erasure_prepare_error.code:
        value.phase==='SEALED'&&Date.now()-value.sealedAt>90000?'erasure-broker-preparation-timeout':null}:null;
  }
  status() {
    const value=this.public();if(!value)return null;
    const {scope,sessionIds,retainedSessionId,roots,...status}=value;return status;
  }
  async prepare(input) {
    if(!exact(input,['changeId','ownerId','branch','retainedSessionId','evidence','dependencyEvidence'])||
      !['TERMINÉ','BLOQUÉ'].includes(input.branch)||!Array.isArray(input.evidence)||!input.evidence.length||
      !input.evidence.every(value=>typeof value==='string'&&value.length>0&&value.length<=500)||
      !(input.retainedSessionId===null||typeof input.retainedSessionId==='string'&&/^ses_[A-Za-z0-9_.-]{1,100}$/.test(input.retainedSessionId))||
      input.branch==='TERMINÉ'&&input.retainedSessionId!==null) fail('erasure-input-invalid');
    if(this.pending())fail('erasure-transaction-in-progress');
    const snapshot=this.registry.snapshot();
    if(snapshot.project!==this.workspace)fail('erasure-workspace-divergent');
    let scope=erasureScope(snapshot,input.changeId,input.ownerId,{terminalProofs:this.terminalProofs()});
    if(input.branch==='TERMINÉ'&&input.dependencyEvidence!==null)fail('erasure-input-invalid');
    if(input.branch==='BLOQUÉ') {
      const proof=input.dependencyEvidence;
      if(!exact(proof,['reason','blockersSha256','statisticsSha256'])||proof.reason!=='UNSATISFIED_DEPENDENCY')fail('erasure-dependency-proof-required');
      for(const [name,key] of [['BLOCKERS.md','blockersSha256'],['STATISTICS.md','statisticsSha256']]) {
        const path=join(this.workspace,'openspec','changes',input.changeId,name);
        if(realpathSync(dirname(path))!==dirname(path))fail('erasure-business-proof-path-unsafe');
        const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
        try{const stat=fstatSync(fd);if(!stat.isFile()||stat.nlink!==1||stat.size>4*1024*1024)fail('erasure-business-proof-invalid');
          const digest=createHash('sha256').update(readFileSync(fd)).digest('hex');
          if(digest!==proof[key])fail('erasure-business-proof-divergent');}finally{closeSync(fd)}
      }
    }
    const documents=[];const jobs=[];
    for(const path of erasureFiles(this.stateDirectory)) {
      if(!path.endsWith('.json')||path.endsWith('/change-erasure.json')||path.endsWith('/broker-erasure.json'))continue;
      const {value}=readRuntimeJson(path);documents.push(value);
      if(path.endsWith('/controller-job.json')&&value.changeId===input.changeId)jobs.push(value);
    }
    if(!jobs.length||jobs.some(job=>job.armed!==false||job.terminalGate?.status!=='VALIDATED'||
      job.terminalGate.declaredState!==input.branch))fail('erasure-terminal-gate-unverified');
    if(input.branch==='BLOQUÉ'&&(!input.retainedSessionId||!jobs.some(job=>job.sessionId===input.retainedSessionId)))
      fail('erasure-retained-business-session-required');
    scope=extendErasureScope(scope,documents);
    const native=await this.openCode.listSessions(this.workspace);
    const sessions=new Set(scope.ids.filter(id=>id.startsWith('ses_')));
    let changed;
    do {changed=false;for(const row of native)if(sessions.has(row.parentID||row.parentId)&&!sessions.has(row.id)){
      if(row.directory!==this.workspace)fail('erasure-session-ownership-ambiguous');sessions.add(row.id);changed=true;
    }}while(changed);
    for(const run of snapshot.runs)if(run.changeId!==input.changeId&&sessions.has(run.sessionId))fail('erasure-session-shared');
    scope={...scope,ids:[...new Set([...scope.ids,...sessions])].sort()};
    const identity=await this.monitorIdentity();
    if(identity.identity?.workspace!==this.workspace||identity.version!==VERSION||typeof identity.stateDirectory!=='string')
      fail('erasure-monitor-identity-unverified');
    const value=this.transaction().prepare({scope,branch:input.branch,evidence:input.evidence,
      sessionIds:[...sessions].sort(),retainedSessionId:input.retainedSessionId,
      roots:[this.stateDirectory,identity.stateDirectory],coverage:['controller','broker','supervisor','monitor'],entries:[]});
    return this.public(value);
  }
  async seal(input) {
    const value=this.pending();
    if(!exact(input,['transactionId'])||!value||input.transactionId!==value.transactionId)fail('erasure-transaction-divergent');
    if(value.phase!=='PREPARED'&&value.phase!=='SEALED')fail('erasure-phase-invalid');
    erasureScope(this.registry.snapshot(),value.scope.changeId,value.scope.ownerId,{terminalProofs:this.terminalProofs()});
    const [sessions,active,permissions,info]=await Promise.all([this.openCode.listSessions(this.workspace),
      this.openCode.sessionStatus(this.workspace),this.openCode.permissions(this.workspace),this.openCode.info(true)]);
    const present=new Set(sessions.map(row=>row.id));
    if(value.sessionIds.some(id=>id!==value.retainedSessionId&&present.has(id))||
      value.retainedSessionId&&!present.has(value.retainedSessionId))fail('erasure-native-cleanup-incomplete');
    if(value.sessionIds.some(id=>active[id])||permissions.some(row=>value.sessionIds.includes(row.sessionID)))fail('erasure-native-permission-or-activity');
    const next={...value,phase:'SEALED',sealedAt:Date.now(),nativeIdentity:{pid:info.pid,version:info.version,
      sessionIdsDigest:canonicalContinuityDigest([...present].sort())}};
    this.transaction().save(next);return this.public(next);
  }
  brokerCommand() {
    const value=this.pending();
    if(value?.phase!=='SEALED')return null;
    return this.transaction().seal({protocol:value.protocol,transactionId:value.transactionId,
      controlRoot:this.stateDirectory,scope:value.scope});
  }
}
