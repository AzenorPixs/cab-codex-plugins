import {createHash} from 'node:crypto';
import {lstatSync,readdirSync,readFileSync,realpathSync} from 'node:fs';
import {join,relative,resolve,sep} from 'node:path';

export const VERSION='2.7.4';
export const AUTONOMY_PROTOCOL='autonomous-change-v1';
const fail=code=>{throw Object.assign(new Error(code),{code,status:409});};
const text=value=>typeof value==='string'&&value.trim().length>0&&value.length<=4000;
const id=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(value)&&!['__proto__','constructor','prototype'].includes(value);
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export const mandateDigest=value=>createHash('sha256').update(canonical(value)).digest('hex');
const within=(root,path)=>path===root||path.startsWith(root+sep);
const hidden=part=>/^\.(git|opencode|codex|cab-tests|ssh|gnupg|cache|npmrc|pypirc|netrc)$/.test(part)||/^(project\.env|opencode\.password|.*\.env(?:\..*)?|.*\.(key|pem|p12|pfx|crt|cer|der)|(?:credentials|secrets)\.(json|yaml)|id_(rsa|ed25519))$/.test(part);

// All writable roots are real project paths, never a symlink or shared inode.
export function mandatePaths(directory,paths) {
  if(!Array.isArray(paths)||!paths.length||paths.length>128)fail('autonomy-paths-invalid');
  const roots=paths.map(path=>{
    if(typeof path!=='string'||path.length>1000||path.startsWith('/')||path.split('/').some(p=>!p||p==='.'||p==='..'||hidden(p)))fail('autonomy-paths-invalid');
    const absolute=resolve(directory,path);
    if(!within(directory,absolute)||absolute===directory||realpathSync(absolute)!==absolute)fail('autonomy-path-unsafe');
    return absolute;
  });
  if(new Set(roots).size!==roots.length||roots.some((path,i)=>roots.some((other,j)=>i!==j&&within(other,path))))fail('autonomy-paths-overlap');
  return roots;
}

export function sourceRevision(directory,paths) {
  const entries=[];let bytes=0;
  function visit(path) {
    const info=lstatSync(path);
    if(info.isSymbolicLink()||!info.isFile()&&!info.isDirectory()||info.isFile()&&info.nlink!==1)fail('autonomy-source-unsafe');
    if(entries.length>=100000)fail('autonomy-source-limit');
    const name=relative(directory,path);
    if(info.isDirectory()) {
      entries.push([name,'directory',info.mode&0o777]);
      for(const child of readdirSync(path).sort()) {
        if(hidden(child))fail('autonomy-source-protected');
        visit(join(path,child));
      }
    } else {
      bytes+=info.size;if(bytes>512*1024*1024)fail('autonomy-source-limit');
      entries.push([name,info.mode&0o777,createHash('sha256').update(readFileSync(path)).digest('hex')]);
    }
  }
  for(const root of mandatePaths(directory,paths).sort())visit(root);
  return mandateDigest(entries);
}

export function grantAutonomy(registry,runId,payload) {
  registry.admission(runId);
  if(Object.values(registry.runs.get(runId)?.externalCalls||{}).some(call=>!['COMPLETED','TIMED_OUT','OUTPUT_LIMIT','FAILED_TO_START','PREFLIGHT_FAILED'].includes(call.state)))fail('external-effects-unresolved');
  const run=registry.owned(runId,payload.version);
  if(payload.protocol!==AUTONOMY_PROTOCOL||!id(payload.mandateId)||payload.sessionId!==run.sessionId||
    payload.decisionsResolved!==true||!Array.isArray(payload.decisions)||!payload.decisions.every(text)||
    !text(payload.objective)||!Array.isArray(payload.criteria)||!payload.criteria.length||!payload.criteria.every(text)||
    !Array.isArray(payload.constraints)||!payload.constraints.every(text))fail('autonomy-mandate-invalid');
  const fingerprint=mandateDigest(payload);
  let replaced;
  if(run.autonomy) {
    if(run.autonomy.inputDigest===fingerprint)return structuredClone(run.autonomy);
    if(payload.replaces!==run.autonomy.inputDigest||Object.values(run.autonomy.calls).some(c=>['INTENT','WAITING'].includes(c.state))||
       (run.autonomy.previousMandates||[]).length>=100)fail('autonomy-mandate-conflict');
    replaced=run.autonomy;
  }
  const roots=mandatePaths(run.directory,payload.paths);
  const resources=roots.map(path=>({key:'file:'+relative(run.directory,path),mode:'write'}));
  registry.scope(runId,run.version,resources);
  for(const other of registry.runs.values())if(other.runId!==runId&&other.state==='RESERVED'&&
    !payload.coordination&&other.resources.some(r=>resources.some(s=>r.key==='project:*'||r.key===s.key||r.key.startsWith(s.key+'/')||s.key.startsWith(r.key+'/'))))fail('autonomy-peer-conflict');
  if(Object.values(registry.resourceState.operations).some(op=>op.runId===runId&&!['COMPLETED','CANCELLED'].includes(op.state)))fail('autonomy-operation-pending');
  const baseline=sourceRevision(run.directory,payload.paths);
  run.autonomy={protocol:AUTONOMY_PROTOCOL,mandateId:payload.mandateId,inputDigest:fingerprint,
    sessionId:run.sessionId,reservationVersion:run.version,contextId:run.contextId,paths:[...payload.paths],
    objective:payload.objective,criteria:payload.criteria,constraints:payload.constraints,decisions:payload.decisions,
    baseline,...(payload.coordination?{resourcePolicy:'operation-scoped-v1'}:{}),state:'WORKING',calls:{},submissions:[],reviews:[],exceptions:[],grantedAt:new Date().toISOString(),
    metrics:{initialMandates:1,intermediateDecisions:0,submissions:0,reviews:0,exceptions:0},
    ...(replaced?{previousMandates:[...(replaced.previousMandates||[]),{...replaced,previousMandates:undefined}]}:{})};
  registry.persist();return structuredClone(run.autonomy);
}

function current(registry,runId) {
  registry.admission(runId);
  const run=registry.runs.get(runId),m=run?.autonomy;
  if(!m||m.protocol!==AUTONOMY_PROTOCOL||run.state!=='RESERVED'||run.phase!=='WORK'||m.sessionId!==run.sessionId||m.reservationVersion!==run.version||m.contextId!==run.contextId)fail('autonomy-mandate-stale');
  return {run,m};
}

export function autonomousGrant(registry,runId,args,grant,{snapshot=false}={}) {
  const {run,m}=current(registry,runId);
  if(args.session_id!==run.sessionId||args.reservation_version!==run.version||args.change_id!==run.changeId||args.directory!==run.directory)fail('autonomy-identity-divergent');
  if(snapshot)return grant;
  const fingerprint=mandateDigest(args),previous=m.calls[args.request_id];
  if(previous&&!['WAITING','INTENT','COMPLETED','TIMED_OUT','FAILED_TO_START','CANCELLED'].includes(previous.state))fail('autonomy-call-state-invalid');
  if(previous&&previous.inputDigest!==fingerprint)fail('autonomy-request-conflict');
  if(!previous||previous.state==='WAITING') {
    if(m.state!=='WORKING'||Object.entries(m.calls).some(([key,call])=>key!==args.request_id&&call.state==='INTENT'))fail('autonomy-not-working');
    if(!previous&&Object.keys(m.calls).length>=10000)fail('autonomy-call-limit');
    if(m.resourcePolicy==='operation-scoped-v1') {
      if(!previous){m.calls[args.request_id]={inputDigest:fingerprint,state:'WAITING',order:++registry.resourceState.sequence};registry.persist();}
      const waiting=m.calls[args.request_id];
      if(autonomousBlockers(registry,runId,args.request_id,waiting.order).length) {
        const error=Object.assign(new Error('autonomy-resources-busy'),{code:'autonomy-resources-busy',status:423});throw error;
      }
    }
    const revision=sourceRevision(run.directory,m.paths);
    if(args.expected_revision!==undefined&&args.expected_revision!==revision) {
      if(m.calls[args.request_id]?.state==='WAITING'){m.calls[args.request_id].state='CANCELLED';registry.persist();}
      fail('autonomy-source-revision-stale');
    }
    m.calls[args.request_id]={...(m.calls[args.request_id]||{}),inputDigest:fingerprint,state:'INTENT'};
    registry.persist();
  } else if(previous.state==='CANCELLED')fail('autonomy-request-cancelled');
  return {...grant,autonomy:{protocol:AUTONOMY_PROTOCOL,mandateId:m.mandateId,paths:mandatePaths(run.directory,m.paths),executionKnown:!!previous&&previous.state!=='WAITING'}};
}

export function completeAutonomousCall(registry,runId,args) {
  const {run,m}=current(registry,runId),call=m.calls[args.request_id];
  if(!call||!['COMPLETED','TIMED_OUT','FAILED_TO_START'].includes(args.status)||!text(args.receiptDigest)||!id(args.request_id))fail('autonomy-completion-invalid');
  const receipt=mandateDigest(args);
  if(call.state!=='INTENT'&&call.receipt!==receipt)fail('autonomy-completion-conflict');
  if(call.state!=='INTENT')return {status:'RECORDED',requestId:args.request_id};
  Object.assign(call,{state:args.status,receipt,receiptDigest:args.receiptDigest,exitCode:args.exitCode,
    sourceRevision:sourceRevision(run.directory,m.paths)});
  if(m.resourcePolicy==='operation-scoped-v1')for(const path of m.paths)registry.resourceState.revisions['file:'+path]=++registry.resourceState.sequence;
  registry.grantWaiting?.();registry.persist();
  return {status:'RECORDED',requestId:args.request_id};
}

export function submitAutonomousWork(registry,runId,payload) {
  const {run,m}=current(registry,runId);
  const revision=sourceRevision(run.directory,m.paths);
  if(Object.values(run.externalCalls||{}).some(call=>!['COMPLETED','TIMED_OUT','OUTPUT_LIMIT','FAILED_TO_START','PREFLIGHT_FAILED'].includes(call.state)))fail('external-effects-unresolved');
  const invalid=(reason,testIndex)=>{throw Object.assign(new Error('autonomy-submission-invalid'),{
    code:'autonomy-submission-invalid',status:409,diagnostic:{error:'autonomy-submission-invalid',reason,...(testIndex===undefined?{}:{testIndex})}});};
  if(!payload||!id(payload.submissionId)||!text(payload.summary)||!Array.isArray(payload.tests)||!payload.tests.length||
     !Array.isArray(payload.limits)||!payload.limits.every(text))invalid('submission-shape-invalid');
  const tests=payload.tests.map((test,index)=>{
    if(!test||!id(test.requestId)||!text(test.criterion)||!m.criteria.includes(test.criterion))invalid('test-identity-or-criterion-invalid',index);
    const call=m.calls[test.requestId];
    if(!call||!['COMPLETED','TIMED_OUT','FAILED_TO_START'].includes(call.state))invalid('test-receipt-not-terminal',index);
    if(test.receiptDigest!==undefined&&test.receiptDigest!==call.receiptDigest)invalid('receipt-digest-mismatch',index);
    if(!['passed','failed','unavailable'].includes(test.outcome))invalid('test-outcome-invalid',index);
    if(test.outcome==='passed'&&(call.state!=='COMPLETED'||call.exitCode!==0))invalid('test-did-not-pass',index);
    if(test.outcome==='passed'&&call.sourceRevision!==revision)invalid('test-source-revision-stale',index);
    return {...test,receiptDigest:call.receiptDigest};
  });
  if(m.criteria.some(c=>!tests.some(t=>t.criterion===c)))invalid('criterion-not-covered');
  payload={...payload,tests};
  const inputDigest=mandateDigest(payload),prior=m.submissions.find(s=>s.submissionId===payload.submissionId);
  if(prior){if(prior.inputDigest!==inputDigest)fail('autonomy-submission-conflict');return structuredClone(prior);}
  if(m.state!=='WORKING'||Object.values(m.calls).some(c=>['INTENT','WAITING'].includes(c.state)))fail('autonomy-execution-pending');
  const submission={...payload,inputDigest,sourceRevision:revision,submittedAt:new Date().toISOString()};
  submission.digest=mandateDigest(submission);m.submissions.push(submission);m.state='REVIEW_PENDING';m.metrics.submissions++;
  registry.persist();return structuredClone(submission);
}

export function reviewAutonomousWork(registry,runId,payload) {
  const {run,m}=current(registry,runId),submission=m.submissions.at(-1);
  if(!id(payload.reviewId)||!['accept','changes-requested'].includes(payload.decision)||!text(payload.reason)||
    payload.submissionDigest!==submission?.digest||payload.decision==='accept'&&sourceRevision(run.directory,m.paths)!==submission.sourceRevision)fail('autonomy-review-divergent');
  const prior=m.reviews.find(r=>r.reviewId===payload.reviewId);
  if(prior){if(mandateDigest(prior)!==mandateDigest(payload))fail('autonomy-review-conflict');return structuredClone(prior);}
  if(m.state!=='REVIEW_PENDING'&&!(m.state==='ACCEPTED'&&payload.decision==='changes-requested'))fail('autonomy-review-not-pending');
  if(payload.decision==='accept'&&submission.tests.some(t=>t.outcome!=='passed'))fail('autonomy-tests-not-passed');
  m.reviews.push(payload);m.metrics.reviews++;m.state=payload.decision==='accept'?'ACCEPTED':'WORKING';registry.persist();return structuredClone(payload);
}

export function requireAutonomousAcceptance(run) {
  if(!run?.autonomy)return;
  const m=run.autonomy,submission=m.submissions.at(-1);
  if(Object.values(run.externalCalls||{}).some(call=>!['COMPLETED','TIMED_OUT','OUTPUT_LIMIT','FAILED_TO_START','PREFLIGHT_FAILED'].includes(call.state)))fail('external-effects-unresolved');
  if(run.state!=='RESERVED'||run.phase!=='WORK'||m.sessionId!==run.sessionId||m.contextId!==run.contextId||
     m.reservationVersion!==run.version||m.state!=='ACCEPTED'||sourceRevision(run.directory,m.paths)!==submission?.sourceRevision)fail('autonomy-final-acceptance-required');
}

export function requestAutonomyException(registry,runId,payload) {
  const {m}=current(registry,runId);
  if(!id(payload.request_id)||!['outside-change','outside-framing','missing-tool','web-consultation'].includes(payload.category)||!text(payload.summary))fail('autonomy-exception-invalid');
  const prior=m.exceptions.find(e=>e.request_id===payload.request_id);
  if(prior&&mandateDigest({...prior,decision:undefined})!==mandateDigest({...payload,decision:undefined}))fail('autonomy-exception-conflict');
  if(!prior) {
    if(m.exceptions.length>=1000)fail('autonomy-exception-limit');
    m.exceptions.push(structuredClone(payload));m.metrics.exceptions++;registry.persist();
  }
  return {status:'EXCEPTION_REQUESTED',requestId:payload.request_id,independentWorkMayContinue:true};
}

export function decideAutonomyException(registry,runId,payload) {
  const {m}=current(registry,runId),exception=m.exceptions.find(e=>e.request_id===payload.requestId);
  if(!exception||!['approved','rejected'].includes(payload.decision)||!text(payload.scope))fail('autonomy-exception-decision-invalid');
  if(exception.decision&&mandateDigest(exception.decision)!==mandateDigest(payload))fail('autonomy-exception-decision-conflict');
  exception.decision=structuredClone(payload);registry.persist();return structuredClone(payload);
}


export function autonomousBlockers(registry,runId,requestId,order=Infinity) {
 const run=registry.runs.get(runId),resources=autonomousResources(run),result=[];
 const overlap=(a,b)=>a==='project:*'||b==='project:*'||a===b||a.startsWith(b+'/')||b.startsWith(a+'/');
 const touches=other=>other.some(r=>resources.some(s=>(s.mode==='write'||r.mode==='write')&&overlap(s.key,r.key)));
 for(const other of registry.runs.values()) {
  if(other.state!=='RESERVED'||!other.autonomy)continue;
  const relevant=other.runId===runId||touches(autonomousResources(other));
  if(!relevant)continue;
  for(const [id,call] of Object.entries(other.autonomy.calls))if(!(other.runId===runId&&id===requestId)&&
   (call.state==='INTENT'||call.state==='WAITING'&&call.order<order))result.push({runId:other.runId,requestId:id});
 }
 for(const access of Object.values(registry.resourceState.accesses))if(access.runId!==runId&&
  (['HELD','EXECUTING','UNKNOWN'].includes(access.state)||access.state==='WAITING'&&access.order<order)&&touches(access.resources))result.push({runId:access.runId,accessId:access.accessId});
 return result;
}

export function autonomousResources(run) {
 return [...(run?.resources||[]).filter(r=>r.mode==='read'&&r.key.startsWith('file:')),
   ...(run?.autonomy?.paths||[]).map(path=>({key:'file:'+path,mode:'write'}))];
}
