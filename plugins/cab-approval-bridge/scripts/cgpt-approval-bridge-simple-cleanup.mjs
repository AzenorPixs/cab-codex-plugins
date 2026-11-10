import {createHash} from 'node:crypto';
import {isAbsolute,resolve} from 'node:path';
export const VERSION='2.5.5';

export function cleanupInspector({getRuns,getStatistics}) {
  if(typeof getRuns!=='function'||typeof getStatistics!=='function')throw new Error('cleanup-inspector-invalid');
  const changes=new Map();
  return {
    async inspect(scope){
      const [registry,stats]=await Promise.all([getRuns(scope.project),getStatistics(scope.project)]);
      if(registry?.project!==scope.project||!Array.isArray(registry.runs)||!Array.isArray(stats?.sessions)||!Array.isArray(stats?.archives))
        throw Object.assign(new Error('cleanup-inventory-unavailable'),{code:'cleanup-inventory-unavailable'});
      const result=[];
      for(const runId of scope.runIds){
        if(stats.sessions.some(row=>row.run===runId)){result.push({runId,state:'RESERVED',generation:'active'});continue;}
        const current=registry.runs.filter(row=>row.runId===runId);
        if(current.length>1)throw Object.assign(new Error('cleanup-identity-ambiguous'),{code:'cleanup-identity-ambiguous'});
        if(current.length===1){const run=current[0];changes.set(scope.project+'\0'+runId,run.changeId);result.push({runId,state:run.state,generation:run.contextId});continue;}
        const candidates=stats.archives.flatMap(report=>(report.native_telemetry||[]).flatMap(record=>(record.snapshot?.sessions||[]).filter(row=>
          row.run===runId&&row.project===scope.project&&row.mode==='direct'&&row.cab_direct===true&&row.ended_at&&row.change===report.change)));
        const unique=new Map(candidates.map(row=>[row.binding,row]));
        if(unique.size!==1)throw Object.assign(new Error('cleanup-identity-unverified'),{code:'cleanup-identity-unverified'});
        const session=[...unique.values()][0];changes.set(scope.project+'\0'+runId,session.change);result.push({runId,state:'RELEASED',generation:session.binding});
      }
      return result;
    },
    async changeForRun(project,runId){const value=changes.get(project+'\0'+runId);if(!value)throw Object.assign(new Error('cleanup-change-unverified'),{code:'cleanup-change-unverified'});return value;}
  };
}

// Chaque adaptateur vérifie atomiquement les générations et supprime de façon idempotente.
export async function simpleCleanup(input,{inspect,components}) {
  if(!input||typeof input.project!=='string'||!isAbsolute(input.project)||resolve(input.project)!==input.project||
    !Array.isArray(input.runIds)||!input.runIds.length||!input.runIds.every(id=>typeof id==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.-]{0,199}$/.test(id))||
    new Set(input.runIds).size!==input.runIds.length||typeof inspect!=='function'||!components||typeof components!=='object')
    throw Object.assign(new Error('cleanup-scope-invalid'),{code:'cleanup-scope-invalid'});
  const scope={project:input.project,runIds:[...input.runIds].sort()},states=await inspect(scope);
  if(!Array.isArray(states)||states.length!==scope.runIds.length||scope.runIds.some(id=>states.filter(row=>row.runId===id).length!==1)||
    states.some(row=>!['DELIVERED','ABANDONED','RELEASED'].includes(row.state)||
      !(Number.isSafeInteger(row.generation)&&row.generation>=1||typeof row.generation==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.-]{0,199}$/.test(row.generation))))
    throw Object.assign(new Error('cleanup-target-active-or-unknown'),{code:'cleanup-target-active-or-unknown'});
  const generations=states.map(row=>({runId:row.runId,generation:row.generation})).sort((a,b)=>a.runId.localeCompare(b.runId));
  const digest=createHash('sha256').update(JSON.stringify({scope,generations})).digest('hex'),results=[];
  const required=['controller','broker','supervisor','monitor','sgs','ccab','archives'];
  for(const name of required){
    const adapter=components[name];
    if(adapter===undefined){results.push({component:name,status:'PENDING',code:'cleanup-adapter-unavailable'});continue;}
    if(!/^[a-z][a-z0-9-]{0,49}$/.test(name)||typeof adapter!=='function')throw new Error('cleanup-adapter-invalid');
    try{
      const value=await adapter(scope,{operationId:'cleanup-'+digest+'-'+name,generations});
      if(!value||!['REMOVED','ABSENT'].includes(value.status))throw Object.assign(new Error('cleanup-component-unconfirmed'),{code:'cleanup-component-unconfirmed'});
      results.push({component:name,status:value.status});
    }catch(error){
      const supplied=error?.code||(Number.isInteger(error?.status)?error?.message:undefined);
      const code=['ECONNREFUSED','ECONNRESET','ETIMEDOUT','EPIPE','ENOENT'].includes(supplied)?'cleanup-component-unavailable':supplied;
      if(!/^[a-z][a-z0-9-]{0,99}$/.test(code||''))throw error;
      results.push({component:name,status:'PENDING',code});
    }
  }
  return {status:results.some(row=>row.status==='PENDING')?'PARTIAL':'COMPLETE',scope,components:results};
}

// Adaptateur SGS : la brique retrouve le reçu elle-même à partir du RUN.
export function sgsCleanupAdapter({postController,changeForRun}) {
  if(typeof postController!=='function'||typeof changeForRun!=='function')throw new Error('cleanup-adapter-invalid');
  return async(scope,{generations})=>{
    let removed=false;
    for(const run of scope.runIds){
      const generation=generations.find(row=>row.runId===run);
      if(!generation)throw Object.assign(new Error('cleanup-generation-missing'),{code:'cleanup-generation-missing'});
      const change=await changeForRun(scope.project,run,generation.generation);
      if(typeof change!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,199}$/.test(change))throw Object.assign(new Error('cleanup-change-unverified'),{code:'cleanup-change-unverified'});
      if(typeof generation.generation!=='string')throw Object.assign(new Error('cleanup-piloted-run-requires-separate-cleanup'),{code:'cleanup-piloted-run-requires-separate-cleanup'});
      const result=await postController(scope.project,'/cleanup/simple-sgs',{changeId:change,runId:run,bindingId:generation.generation});
      if(result?.status==='CHANGE_REPORT_FORGOTTEN')removed=true;
      else if(!['ABSENT','ALREADY_ABSENT'].includes(result?.status))throw Object.assign(new Error('cleanup-component-unconfirmed'),{code:'cleanup-component-unconfirmed'});
    }
    return {status:removed?'REMOVED':'ABSENT'};
  };
}

// CCAB n'est pas une archive : seules les déclarations déjà résolues sont retirées.
export function ccabCleanupAdapter({request}) {
  if(typeof request!=='function')throw new Error('cleanup-adapter-invalid');
  return async scope=>{
    const result=await request('ccab','/incidents');
    if(!Array.isArray(result?.incidents))throw Object.assign(new Error('cleanup-ccab-unavailable'),{code:'cleanup-ccab-unavailable'});
    const selected=result.incidents.filter(row=>row.project===scope.project&&scope.runIds.includes(row.run));
    let removed=false;
    for(const row of selected.filter(row=>row.state==='RESOLVED')){
      const receipt=await request('ccab','/purge-incident',{incident_id:row.incident_id});
      if(!receipt||!['PURGED_TREATED','ALREADY_ABSENT'].includes(receipt.status)||receipt.incident_id!==row.incident_id)
        throw Object.assign(new Error('cleanup-ccab-unconfirmed'),{code:'cleanup-ccab-unconfirmed'});
      if(receipt.status==='PURGED_TREATED')removed=true;
    }
    if(selected.some(row=>row.state!=='RESOLVED'))throw Object.assign(new Error('cleanup-ccab-unresolved'),{code:'cleanup-ccab-unresolved'});
    return {status:removed?'REMOVED':'ABSENT'};
  };
}

// Une copie partagée reste conservée tant que tous ses RUN ne sont pas ciblés.
export function archiveCleanupAdapter({repository,withTargetLease,activeRunIds}) {
  if(!repository||typeof repository.list!=='function'||typeof repository.remove!=='function'||
    typeof withTargetLease!=='function'||typeof activeRunIds!=='function')throw new Error('cleanup-adapter-invalid');
  return async(scope,{generations})=>{
    const selected=new Set(scope.runIds),records=repository.list().filter(row=>row.runIds.some(id=>selected.has(id)));
    if(records.some(row=>row.runIds.some(id=>!selected.has(id))))
      throw Object.assign(new Error('cleanup-archive-shared'),{code:'cleanup-archive-shared'});
    let removed=false;
    for(const record of records){
      const result=await withTargetLease(scope.project,record.runIds,generations,async()=>{
        const active=await activeRunIds(scope.project);return repository.remove(record.archiveId,record.fingerprint,active);
      });
      if(result?.state!=='DONE')throw Object.assign(new Error('cleanup-archive-unconfirmed'),{code:'cleanup-archive-unconfirmed'});
      removed=true;
    }
    return {status:removed?'REMOVED':'ABSENT'};
  };
}
