import { existsSync,constants,openSync,closeSync,fstatSync,readFileSync,realpathSync } from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {dirname} from 'node:path';
import { join,relative } from 'node:path';
import { ErasureTransaction, erasureScope, erasureFiles, extendErasureScope, erasureInventory,retiredRunScope,retiredJobDigest } from './cgpt-approval-bridge-change-erasure.mjs';
import { readRuntimeJson } from './cgpt-approval-bridge-state-layout.mjs';
import { canonicalContinuityDigest } from './cgpt-approval-bridge-continuity.mjs';

export const VERSION='2.4.28';
const fail=code=>{throw Object.assign(new Error(code),{code,status:409})};
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
export function erasureMonitorEndpoint(host='127.0.0.1',port='8790') {
  if(!['127.0.0.1','::1'].includes(host)||!/^\d+$/.test(String(port))||Number(port)<1024||Number(port)>65535)fail('erasure-monitor-address-invalid');
  return `http://${host==='::1'?'[::1]':host}:${Number(port)}/api/maintenance-identity`;
}
function validateTerminalJobs(jobs,scope,ownerId,branch,retainedSessionId,stateDirectory) {
    if(scope.closureAuthority==='authoritative-retired-run-batch-v1'){
      const seen=new Set();
      for(const {job,path} of jobs){
        const parts=relative(stateDirectory,path).match(/^runs\/([^/]+)\/(\d+)\/controller-job\.json$/);
        if(!parts||!scope.runIds.includes(parts[1])||!scope.changeIds.includes(job.changeId)||job.armed!==false||
          job.terminalGate?.status!=='VALIDATED'||!['TERMINÉ','BLOQUÉ'].includes(job.terminalGate.declaredState))fail('erasure-terminal-gate-unverified');
        seen.add(parts[1]+':'+parts[2]);
      }
      if(scope.runBindings.some(row=>!seen.has(row.runId+':'+row.contextId)))fail('erasure-terminal-gate-unverified');
      return;
    }
    if(!jobs.length||jobs.some(({job})=>job.armed!==false))fail('erasure-terminal-gate-unverified');
    if(scope.ownershipReview){
      const latest=Math.max(...scope.runBindings.map(row=>row.contextId));
      const anchors=scope.runBindings.filter(row=>row.contextId===latest&&row.ownerId===ownerId);
      if(anchors.length!==1)fail('erasure-terminal-owner-unverified');
      const anchor=anchors[0];let finalJob=false;
      for(const {job,path} of jobs){
        const parts=relative(stateDirectory,path).match(/^runs\/([^/]+)\/(\d+)\/controller-job\.json$/);
        const binding=parts&&scope.runBindings.find(row=>row.runId===parts[1]&&row.contextId===Number(parts[2]));
        if(!binding||job.runId!==undefined&&job.runId!==binding.runId||job.contextId!==undefined&&job.contextId!==binding.contextId)fail('erasure-job-owner-unverified');
        if(binding.runId===anchor.runId&&binding.contextId===anchor.contextId){
          if(job.terminalGate?.status!=='VALIDATED'||job.terminalGate.declaredState!==branch)fail('erasure-terminal-gate-unverified');
          finalJob=true;
        }
      }
      if(!finalJob)fail('erasure-terminal-gate-unverified');
    }else if(jobs.some(({job})=>job.terminalGate?.status!=='VALIDATED'||job.terminalGate.declaredState!==branch))fail('erasure-terminal-gate-unverified');
    if(branch==='BLOQUÉ'&&(!retainedSessionId||!jobs.some(({job})=>job.sessionId===retainedSessionId)))
      fail('erasure-retained-business-session-required');
}
export class ChangeErasureManager {
  constructor({workspace,stateDirectory,registry,openCode,monitorIdentity,broker=()=>null,terminalProofs=()=>[],brokerIdentity=async()=>null}) {
    Object.assign(this,{workspace,stateDirectory,registry,openCode,monitorIdentity,broker,terminalProofs,brokerIdentity});
    this.tx=null;this.ownerChecks=new Map();
  }
  transaction(){return this.tx||=new ErasureTransaction(this.stateDirectory,{createKey:!existsSync(join(this.stateDirectory,'change-erasure.json'))})}
  pending(){return existsSync(join(this.stateDirectory,'change-erasure.json'))?this.transaction().load():null}
  public(value=this.pending()) {
    return value?{protocol:value.protocol,transactionId:value.transactionId,phase:value.phase,scope:value.scope,
      sessionIds:value.sessionIds,retainedSessionId:value.retainedSessionId,roots:value.roots,
      brokerTransport:value.brokerTransport||null,brokerInstanceId:this.broker()?.instance_id||null,ownerInstances:Object.fromEntries(Object.entries(value.ownerReceipts||{}).map(([key,receipt])=>[key,receipt.instanceId])),ownerAction:value.ownerAction||'prepare',ownerStates:Object.fromEntries(Object.entries(value.ownerReceipts||{}).map(([key,receipt])=>[key,receipt.state])),
      brokerPrepared:Boolean(value.ownerReceipts?.prepare)||this.broker()?.erasure_prepared===value.transactionId,brokerPid:this.broker()?.broker_process?.pid||null,
      brokerPreparationError:this.broker()?.erasure_prepare_error?.transactionId===value.transactionId?this.broker().erasure_prepare_error.code:
        value.phase==='SEALED'&&!value.ownerReceipts?.prepare&&Date.now()-value.sealedAt>90000?'erasure-broker-preparation-timeout':null}:null;
  }
  status() {
    const value=this.public();if(!value)return null;
    const {scope,sessionIds,retainedSessionId,roots,...status}=value;return status;
  }
  preview(input) {
    if(!exact(input,['changeId','ownerId']))fail('erasure-input-invalid');
    const snapshot=this.registry.snapshot();if(snapshot.project!==this.workspace)fail('erasure-workspace-divergent');
    const inventory=erasureInventory(snapshot,input.changeId,input.ownerId),jobs=[];
    for(const path of erasureFiles(this.stateDirectory)){
      if(!path.endsWith('/controller-job.json'))continue;
      const {value}=readRuntimeJson(path);if(value.changeId!==input.changeId)continue;
      const parts=relative(this.stateDirectory,path).match(/^runs\/([^/]+)\/(\d+)\/controller-job\.json$/);
      jobs.push({runId:parts?.[1]??null,contextId:parts?Number(parts[2]):null,armed:value.armed,
        terminalGate:value.terminalGate?{status:value.terminalGate.status,declaredState:value.terminalGate.declaredState}:null});
    }
    return {...inventory,jobs};
  }
  async prepare(input) {
    if(input?.mode==='retired-runs-v1')return this.prepareRetired(input);
    if(!(exact(input,['changeId','ownerId','branch','retainedSessionId','evidence','dependencyEvidence'])||
      exact(input,['changeId','ownerId','branch','retainedSessionId','evidence','dependencyEvidence','ownershipReview']))||
      !['TERMINÉ','BLOQUÉ'].includes(input.branch)||!Array.isArray(input.evidence)||!input.evidence.length||
      !input.evidence.every(value=>typeof value==='string'&&value.length>0&&value.length<=500)||
      !(input.retainedSessionId===null||typeof input.retainedSessionId==='string'&&/^ses_[A-Za-z0-9_.-]{1,100}$/.test(input.retainedSessionId))||
      input.branch==='TERMINÉ'&&input.retainedSessionId!==null) fail('erasure-input-invalid');
    if(this.pending())fail('erasure-transaction-in-progress');
    const snapshot=this.registry.snapshot();
    if(snapshot.project!==this.workspace)fail('erasure-workspace-divergent');
    let scope=erasureScope(snapshot,input.changeId,input.ownerId,{terminalProofs:this.terminalProofs(),ownershipReview:input.ownershipReview,closedAuthority:true});
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
      if(path.endsWith('/controller-job.json')&&value.changeId===input.changeId)jobs.push({job:value,path});
    }
    validateTerminalJobs(jobs,scope,input.ownerId,input.branch,input.retainedSessionId,this.stateDirectory);
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
  async prepareRetired(input){
    if(!exact(input,['mode','runIds','protectedRunIds','ownerId','evidence']))fail('erasure-input-invalid');
    if(this.pending())fail('erasure-transaction-in-progress');
    const snapshot=this.registry.snapshot();if(snapshot.project!==this.workspace)fail('erasure-workspace-divergent');
    let scope=retiredRunScope(snapshot,input);const documents=[],jobs=[];
    for(const path of erasureFiles(this.stateDirectory)){
      if(!path.endsWith('.json')||path.endsWith('/change-erasure.json')||path.endsWith('/broker-erasure.json'))continue;
      const {value}=readRuntimeJson(path);documents.push(value);
      if(path.endsWith('/controller-job.json')&&scope.runBindings.some(row=>value.changeId===row.changeId)){
        const parts=relative(this.stateDirectory,path).match(/^runs\/([^/]+)\/(\d+)\/controller-job\.json$/);
        if(parts&&scope.runIds.includes(parts[1]))jobs.push({job:value,path});
      }
    }
    validateTerminalJobs(jobs,scope,input.ownerId,'TERMINÉ',null,this.stateDirectory);
    scope={...scope,jobContextDigest:retiredJobDigest(this.stateDirectory,scope.runIds)};
    scope=extendErasureScope(scope,documents);
    const native=await this.openCode.listSessions(this.workspace),sessions=new Set(scope.ids.filter(id=>id.startsWith('ses_')));
    let changed;do{changed=false;for(const row of native)if(sessions.has(row.parentID||row.parentId)&&!sessions.has(row.id)){
      if(row.directory!==this.workspace||scope.sharedIdentityIds.includes(row.id))fail('erasure-session-shared');sessions.add(row.id);changed=true;
    }}while(changed);
    if(snapshot.runs.some(row=>!scope.runIds.includes(row.runId)&&sessions.has(row.sessionId)))fail('erasure-session-shared');
    scope={...scope,ids:[...new Set([...scope.ids,...sessions])].sort()};
    const identity=await this.monitorIdentity();if(identity.identity?.workspace!==this.workspace||identity.version!==VERSION||typeof identity.stateDirectory!=='string')fail('erasure-monitor-identity-unverified');
    return this.public(this.transaction().prepare({scope,branch:'TERMINÉ',evidence:input.evidence,sessionIds:[...sessions].sort(),retainedSessionId:null,
      roots:[this.stateDirectory,identity.stateDirectory],coverage:['controller','broker','supervisor','monitor'],entries:[]}));
  }
  async seal(input) {
    const value=this.pending();
    if(!exact(input,['transactionId'])||!value||input.transactionId!==value.transactionId)fail('erasure-transaction-divergent');
    if(value.phase!=='PREPARED'&&value.phase!=='SEALED')fail('erasure-phase-invalid');
    if(value.scope.closureAuthority==='authoritative-retired-run-batch-v1'){
      const fresh=retiredRunScope(this.registry.snapshot(),{...value.scope,evidence:value.evidence});
      if(fresh.inventoryDigest!==value.scope.inventoryDigest)fail('erasure-retired-inventory-changed');
      if(retiredJobDigest(this.stateDirectory,value.scope.runIds)!==value.scope.jobContextDigest)fail('erasure-retired-jobs-changed');
    }else erasureScope(this.registry.snapshot(),value.scope.changeId,value.scope.ownerId,{terminalProofs:this.terminalProofs(),ownershipReview:value.scope.ownershipReview,
      closedAuthority:value.scope.closureAuthority==='authoritative-run-state-v1'});
    const jobs=[];
    for(const path of erasureFiles(this.stateDirectory))if(path.endsWith('/controller-job.json')){
      const {value:job}=readRuntimeJson(path);const parts=relative(this.stateDirectory,path).match(/^runs\/([^/]+)\/(\d+)\/controller-job\.json$/);
      if(job.changeId===value.scope.changeId||value.scope.closureAuthority==='authoritative-retired-run-batch-v1'&&parts&&value.scope.runIds.includes(parts[1]))jobs.push({job,path});
    }
    validateTerminalJobs(jobs,value.scope,value.scope.ownerId,value.branch,value.retainedSessionId,this.stateDirectory);
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
  async ownerPoll(sender) {
    const broker=this.broker(),identity=await this.brokerIdentity(sender?.pid);
    if(sender?.pid!==broker?.broker_process?.pid||sender?.instanceId!==broker?.instance_id||identity?.uid!==sender?.uid||
      ['Z','X'].includes(identity?.state))fail('erasure-owner-identity-divergent');
    return {command:this.brokerCommand()};
  }
  async ownerExchange(input) {
    if(!exact(input,['command','sender','receipt'])||!input.sender||!Number.isSafeInteger(input.sender.pid)||!Number.isSafeInteger(input.sender.uid))fail('erasure-owner-exchange-invalid');
    const command=this.transaction().verify(input.command),value=this.pending(),broker=this.broker();
    const check=command.checkId?this.ownerChecks.get(command.checkId):null;
    const target=value||check?.certificate;
    if(!target||command.transactionId!==target.transactionId||command.transport!=='owner-local-v1'||
      canonicalContinuityDigest(command.scope)!==canonicalContinuityDigest(target.scope)||command.action!==(check?'verify':value.ownerAction||'prepare')||
      command.brokerPid!==broker?.broker_process?.pid||input.sender.pid!==command.brokerPid||command.brokerInstanceId!==broker?.instance_id||input.sender.instanceId!==broker?.instance_id)fail('erasure-owner-exchange-divergent');
    const identity=await this.brokerIdentity(input.sender.pid);
    if(!identity||identity.uid!==input.sender.uid||['Z','X'].includes(identity.state))fail('erasure-owner-identity-divergent');
    if(input.receipt===null)return {authorized:true,phase:value?.phase||'VERIFY_ONLY'};
    const receipt=input.receipt;
    const expected={prepare:'PREPARED',commit:'APPLIED',verify:'VERIFIED',finalize:'PURGED'}[command.action];
    if(receipt.transactionId!==target.transactionId||receipt.scopeDigest!==canonicalContinuityDigest(target.scope)||
      receipt.uid!==identity.uid||receipt.pid!==input.sender.pid||receipt.instanceId!==broker.instance_id||receipt.state!==expected)fail('erasure-owner-receipt-divergent');
    if(check){this.ownerChecks.delete(command.checkId);check.resolve(receipt);return {accepted:true,transactionId:target.transactionId};}
    const next={...value,brokerTransport:'owner-local-v1',ownerReceipts:{...(value.ownerReceipts||{}),[command.action]:receipt}};
    this.transaction().save(next);return {accepted:true,transactionId:value.transactionId};
  }
  async ownerCheck(input){
    if(!exact(input,['certificate'])||!existsSync(join(this.stateDirectory,'change-erasure.key')))fail('erasure-owner-check-invalid');
    const certificate=this.transaction().verify(input.certificate);
    if(certificate.scope?.workspace!==this.workspace||!certificate.ownerReceipts?.commit)fail('erasure-owner-check-invalid');
    if(this.pending())fail('erasure-transaction-in-progress');
    const checkId='check-'+randomUUID();
    let timer;
    try{return await new Promise((resolve,reject)=>{
      timer=setTimeout(()=>reject(Object.assign(new Error('erasure-owner-check-timeout'),{code:'erasure-owner-check-timeout',status:409})),90000);
      this.ownerChecks.set(checkId,{certificate,resolve});
    });}finally{clearTimeout(timer);this.ownerChecks.delete(checkId)}
  }
  ownerAction(input){
    const value=this.pending();
    if(!exact(input,['transactionId','action'])||!value||input.transactionId!==value.transactionId||
      !['commit','verify','finalize'].includes(input.action)||value.brokerTransport!=='owner-local-v1')fail('erasure-owner-action-invalid');
    if(input.action==='commit'&&value.phase!=='FREEZING')fail('erasure-owner-action-phase-invalid');
    if(input.action==='verify'&&!['VERIFYING','CERTIFIED'].includes(value.phase)||input.action==='finalize'&&value.phase!=='CERTIFIED')fail('erasure-owner-action-phase-invalid');
    this.transaction().save({...value,ownerAction:input.action});return this.status();
  }
  brokerCommand() {
    const value=this.pending();
    if(!value){
      const entry=this.ownerChecks.entries().next().value;if(!entry)return null;
      const [checkId,check]=entry;
      return this.transaction().seal({protocol:check.certificate.protocol,transport:'owner-local-v1',transactionId:check.certificate.transactionId,
        action:'verify',checkId,nodeExecutable:process.execPath,brokerPid:this.broker()?.broker_process?.pid,
        brokerInstanceId:this.broker()?.instance_id,scope:check.certificate.scope,ownerReceipt:check.certificate.ownerReceipts.commit});
    }
    if(this.broker()?.coordination_capabilities?.includes('owner-local-erasure-v1')){
      if(!['SEALED','FREEZING','STOPPING','APPLYING','RESTARTING','VERIFYING','CERTIFIED'].includes(value.phase))return null;
      return this.transaction().seal({protocol:value.protocol,transport:'owner-local-v1',transactionId:value.transactionId,
        action:value.ownerAction||'prepare',nodeExecutable:process.execPath,brokerPid:this.broker().broker_process.pid,brokerInstanceId:this.broker().instance_id,scope:value.scope,
        ...(value.ownerReceipts?.commit?{ownerReceipt:value.ownerReceipts.commit}:{})});
    }
    if(value.phase!=='SEALED')return null;
    return this.transaction().seal({protocol:value.protocol,transactionId:value.transactionId,
      controlRoot:this.stateDirectory,scope:value.scope});
  }
}
