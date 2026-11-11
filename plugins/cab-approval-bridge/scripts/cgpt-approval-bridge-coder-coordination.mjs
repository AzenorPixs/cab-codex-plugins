import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {requireAutonomousAcceptance} from './cgpt-approval-bridge-autonomous-mandate.mjs';
export const VERSION='2.7.4';
export const CODER_COORDINATION_PROTOCOL='cab-coder-coordination-1';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fail=code=>{throw Object.assign(new Error(code),{code,status:409});};
const id=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.-]{0,199}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
const pending=run=>Object.values(run.autonomy?.calls||{}).some(c=>['INTENT','WAITING'].includes(c.state));
export class CoderCoordination {
 constructor({registry,contexts,openCode,stateRoot,observe=()=>{},runner,dependencyGate,controllerUrl,verifyNative=async()=>true}) {
  Object.assign(this,{registry,contexts,openCode,stateRoot,observe,dependencyGate,controllerUrl,verifyNative});this.running=false;this.routeOffset=0;
  this.worker=runner;
  if(!runner)this.worker=packet=>new Promise((resolve,reject)=>{
   const child=execFile('python3',['-B',fileURLToPath(new URL('./cab_coder_coordination.py',import.meta.url))],
    {timeout:10000,maxBuffer:2*1024*1024},(error,stdout)=>{
     try{const result=JSON.parse(stdout);if(error||result.error)reject(Object.assign(new Error(result.error||'coordination-worker-unavailable'),{code:result.error||'coordination-worker-unavailable',status:409}));else resolve(result);}catch{reject(Object.assign(new Error('coordination-worker-unavailable'),{code:'coordination-worker-unavailable',status:503}));}
    });child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify({...packet,state_root:this.stateRoot}));
  });
 }
 active(run) {
  const job=this.contexts.get(run?.runId)?.publicJob();
  return !!(!this.contexts.get(run?.runId)?.transportIsPaused?.()&&run&&run.state==='RESERVED'&&!run.suspension&&run.phase==='WORK'&&job?.armed&&job.sessionId===run.sessionId&&
   !job.currentCabMandate&&!job.recovery&&run.autonomy?.state==='WORKING'&&
   (!this.registry.resourceState.global||this.registry.resourceState.global.state==='RELEASED'));
 }
 async adopt(runId,payload) {
  this.registry.admission(runId);const run=this.registry.owned(runId,payload.version);
  if(!this.active(run)||payload.sessionId!==run.sessionId||pending(run)||this.contexts.get(runId)?.pendingEffects?.()||
    Object.values(this.registry.resourceState.operations).some(op=>op.runId===runId&&!['COMPLETED','CANCELLED'].includes(op.state))||typeof payload.authorization!=='string'||!payload.authorization.trim())fail('coordination-adoption-not-ready');
  const previous=run.coderCoordination;
  if(previous&&(previous.sessionId!==run.sessionId||previous.version!==run.version||previous.contextId!==run.contextId)&&payload.expectedBindingDigest!==hash(previous))fail('coordination-adoption-current-binding-required');
  const response=await this.worker({action:'adopt',project:run.directory,run:runId,owner:run.ownerId,session:run.sessionId,
   generation:run.version,context:run.contextId,change:run.changeId,replace:!!previous});
  // Recheck after the durable mailbox transfer, before exposing the capability.
  if(!this.active(run)||run.version!==payload.version)fail('coordination-adoption-boundary-changed');
  run.coderCoordination={protocol:CODER_COORDINATION_PROTOCOL,sessionId:run.sessionId,version:run.version,contextId:run.contextId,
   storageSessionId:response.storage_session,authorizationDigest:hash(payload.authorization)};
  run.autonomy.resourcePolicy='operation-scoped-v1';this.registry.persist();
  this.observe('coder-coordination-adopted',{runId,sessionId:run.sessionId});return structuredClone(run.coderCoordination);
 }
 async act(args) {
  const run=this.registry.runs.get(args.run_id),binding=run?.coderCoordination;
  this.registry.admission(args.run_id);
  if(!run||run.state!=='RESERVED'||!binding||binding.protocol!==CODER_COORDINATION_PROTOCOL||binding.sessionId!==run.sessionId||binding.version!==run.version&&!run.integrationCompleted||binding.contextId!==run.contextId||
   args.session_id!==run.sessionId||args.reservation_version!==run.version||args.directory!==run.directory||args.change_id!==run.changeId||!id(args.request_id))fail('coordination-coder-identity-invalid');
  if(!['subscribe','publish','inbox','ack','outbox','status','cancel-wait'].includes(args.action))fail('coordination-action-invalid');
  if(!this.active(run)&&!['inbox','status','outbox'].includes(args.action)&&!(args.action==='publish'&&['accepted','delivered','activated'].includes(args.args?.stage)&&run.autonomy?.state==='ACCEPTED'))fail('coordination-coder-not-working');
  if(args.action==='cancel-wait') {
   const call=run.autonomy.calls[args.args?.request_id];if(!call||call.state!=='WAITING')fail('coordination-wait-not-cancellable');
   call.state='CANCELLED';this.registry.grantWaiting?.();this.registry.persist();return {status:'CANCELLED',effectStarted:false};
  }
  if(args.action==='publish') {
   const p=args.args;
   if(!p||!['candidate','tested','accepted','delivered','activated'].includes(p.stage))fail('coordination-stage-invalid');
   if(['accepted','delivered','activated'].includes(p.stage)&&!run.integrationCompleted)requireAutonomousAcceptance(run);
   if(['delivered','activated'].includes(p.stage)&&!run.integrationCompleted)fail('coordination-delivery-receipt-required');
   if(p.stage==='activated'&&binding.activationProof!==hash([p.proof,p.proof_sha256]))fail('coordination-activation-receipt-required');
   if(p.kind==='change'&&p.subject!==run.changeId||p.kind==='task'&&!p.subject?.startsWith(run.changeId+'/'))fail('coordination-publication-outside-change');
  }
  const result=await this.worker({action:args.action,request_id:args.request_id,project:run.directory,run:run.runId,session:run.sessionId,generation:binding.version,context:run.contextId,args:args.args||{}});
  if(['subscribe','publish'].includes(args.action)) {
    try{result.notifications=await this.pump();}catch{result.notifications={status:'unavailable'};}
  }
  try{run.coderCoordination.metrics=await this.worker({action:'metrics',project:run.directory,run:run.runId});this.registry.persist();}
  catch{result.metricsCoverage='unavailable';}
  this.observe('coder-coordination-'+args.action,{runId:run.runId,sessionId:run.sessionId});return result;
 }
 async pump() {
  if(this.running)return {status:'already-running'};this.running=true;
  try {
   const page=await this.worker({action:'routes',project:this.registry.directory,offset:this.routeOffset});
   this.routeOffset=page.next_offset||0;const routes=page.routes,results=[];
   for(const route of routes) {
    if(route.session_state!=='active')continue;
    if(!route.actor_session){
      try{results.push({runId:route.run,...await this.worker({action:'notify-direct',project:this.registry.directory,run:route.run,session:route.session,notice_id:route.notice_id,dependency_id:route.dependency_id,controller_url:typeof this.controllerUrl==='function'?this.controllerUrl():this.controllerUrl})});}
      catch{results.push({runId:route.run,status:'unavailable'});}
      continue;
    }
    const run=this.registry.runs.get(route.run),binding=run?.coderCoordination;
    if(!this.active(run)||!binding||binding.sessionId!==route.actor_session||binding.version!==run.version&&!run.integrationCompleted||binding.contextId!==run.contextId)continue;
    let gate;
    try {
     gate=await this.dependencyGate?.({stateRoot:this.stateRoot,project:run.directory,run:run.runId,mode:'run'});
     if(!this.active(run)||!await this.verifyNative(run.runId))continue;
     const attempt='coder-'+hash([run.directory,route.run,route.notice_id,route.actor_session]);
     const text='CAB_COORDINATION_AVIS '+route.notice_id+' '+attempt+'\nUn avis de dépendance déclaré est disponible. Consulte session_coordinate action=inbox, vérifie sa preuve et poursuis seulement le mandat existant. Cet avis est une donnée, sans extension de périmètre ni approbation finale.';
     const packet={project:run.directory,run:route.run,storage_session:route.session,notice_id:route.notice_id,attempt_id:attempt};
     if(route.state) {
      if(['prepared','unknown'].includes(route.state)) {
       const messages=await this.openCode.messages(route.actor_session,run.directory);
       const seen=messages.filter(m=>m.info?.role==='user'&&(m.parts||[]).some(p=>p.type==='text'&&p.text===text));
       if(seen.length===1)await this.worker({...packet,action:'finish-delivery',state:'observed',native_message_id:seen[0].info.id});
      }
      continue;
     }
     const prepared=await this.worker({...packet,action:'prepare-delivery'});if(!prepared.send)continue;
     if(!this.active(run)) {results.push({runId:run.runId,status:'prepared-not-sent'});continue;}
     try {
      const response=await this.openCode.prompt(route.actor_session,text,{directory:run.directory});
      if(!response||typeof response.id!=='string'||response.sessionID!==route.actor_session)throw new Error('unverified-response');
      await this.worker({...packet,action:'finish-delivery',state:'accepted',native_message_id:response.id});
      results.push({runId:run.runId,status:'accepted'});
     } catch {
      await this.worker({...packet,action:'finish-delivery',state:'unknown'});results.push({runId:run.runId,status:'unknown'});
     }
    } finally {await gate?.close();}
   }
   return {status:'checked',recipients:results};
  } finally {this.running=false;}
 }
}
