import { ContinuityStore, canonicalContinuityDigest as digest } from './cgpt-approval-bridge-continuity.mjs';

export const VERSION = '2.4.36';
const dimensions=['input','output','reasoning','cacheRead','cacheWrite','nativeTotal','costUsd'];
const identifier=value=>typeof value==='string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,199}$/.test(value);
const count=value=>Number.isSafeInteger(value) && value>=0;
const validMetric=(key,value)=>value===null || (key==='costUsd' ? typeof value==='number' && Number.isFinite(value) && value>=0 : count(value));
const validRow=row=>identifier(row.runId) && count(row.contextId) && row.contextId>0 && identifier(row.sessionId) && identifier(row.messageId) &&
  dimensions.every(key=>validMetric(key,row[key])) &&
  [row.providerId,row.modelId].every(value=>value===null || typeof value==='string' && value.length<=200);
const rowKey=row=>[row.runId,row.contextId,row.sessionId,row.messageId].join('\0');
const valid=value=>Array.isArray(value?.messages) && value.messages.length<=5000 &&
  value.messages.every(validRow) && new Set(value.messages.map(rowKey)).size===value.messages.length;

// Cumulative session.usage.updated events are deliberately not added to per-message usage.
export class EfficiencyLedger {
  constructor(path,{backend=null}={}) {
    this.error=null;this.rows=new Map();
    try {
      this.store=new ContinuityStore(path,'native-efficiency',valid);
      if(backend) {
        const stored=backend.readSync()||this.store.snapshot()||{messages:[]};
        if(!valid(stored))throw new Error('native-efficiency-checkpoint-invalid');
        this.migration=backend.write(stored).catch(()=>{this.error='native-efficiency-sgs-unavailable';});
        this.store={snapshot:()=>stored,write:value=>{void backend.write(value).catch(()=>{this.error='native-efficiency-sgs-unavailable';});}};
      }
      this.rows=new Map((this.store.snapshot()?.messages || []).map(row=>[rowKey(row),row]));
    } catch {this.error='native-efficiency-checkpoint-unavailable';}
  }
  observe(run,sessionId,messages) {
    if (this.error) return false;
    try {
      if (!identifier(run?.runId) || !(count(run?.contextId) && run.contextId>0) || !identifier(sessionId) || !Array.isArray(messages)) throw new Error();
      const next=new Map(this.rows);
      for (const message of messages) {
        const info=message?.info;
        if (info?.role!=='assistant') continue;
        if (info.sessionID!==sessionId || !identifier(info.id)) throw new Error();
        const native=info.usageSource==='opencode-v2', tokens=native ? info.tokens : undefined;
        const row={runId:run.runId,contextId:run.contextId,sessionId,messageId:info.id,
          providerId:info.providerID ?? null,modelId:info.modelID ?? null,
          input:tokens?.input ?? null,output:tokens?.output ?? null,reasoning:tokens?.reasoning ?? null,
          cacheRead:tokens?.cache?.read ?? null,cacheWrite:tokens?.cache?.write ?? null,
          nativeTotal:tokens?.total ?? null,costUsd:native ? info.cost ?? null : null};
        if (!validRow(row)) throw new Error();
        const prior=next.get(rowKey(row));
        if (prior) {
          if (prior.providerId!==null && row.providerId!==null && prior.providerId!==row.providerId ||
              prior.modelId!==null && row.modelId!==null && prior.modelId!==row.modelId) throw new Error();
          for(const key of [...dimensions,'providerId','modelId']) if(row[key]===null) row[key]=prior[key];
        }
        next.set(rowKey(row),row);
      }
      if (next.size>5000) throw new Error();
      const value={messages:[...next.values()]};
      if (digest(value)!==digest({messages:[...this.rows.values()]})) {this.store.write(value);this.rows=next;}
      return true;
    } catch {this.error='native-efficiency-observation-unavailable';return false;}
  }
  view(run) {
    const rows=[...this.rows.values()].filter(row=>row.runId===run.runId && row.contextId===run.contextId);
    const aggregate=items=>Object.fromEntries(dimensions.map(key=>{
      const values=items.map(row=>row[key]).filter(value=>value!==null),sum=values.reduce((a,b)=>a+b,0);
      const safe=key==='costUsd' ? Number.isFinite(sum) : Number.isSafeInteger(sum);
      return [key,{observed:values.length && safe ? sum : null,available:values.length,expected:items.length,
        complete:items.length>0 && values.length===items.length && safe && !this.error,
        reason:this.error || (!safe ? 'native-total-overflow' : values.length===0 ? 'native-metric-not-exposed' :
          values.length<items.length ? 'partial-native-coverage' : null)}];
    }));
    const groups=new Map();
    for(const row of rows){const key=JSON.stringify([row.providerId,row.modelId]);
      if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
    return {source:'opencode-v2-message',currency:'USD',runId:run.runId,contextId:run.contextId,
      error:this.error,messageCount:rows.length,metrics:aggregate(rows),
      groups:[...groups.values()].map(items=>({providerId:items[0].providerId,modelId:items[0].modelId,
        messageCount:items.length,metrics:aggregate(items)})),
      billingSavings:{observed:null,reason:'no-comparable-provider-billing-baseline'},
      coverage:'observed-native-messages-only; compaction or missing history may limit session coverage'};
  }
}

export function differentialMandate({checkpointId,checkpointDigest,objective,permissions,scope,criteria,changes,evidence}) {
  if (!identifier(checkpointId) || !/^[a-f0-9]{64}$/.test(checkpointDigest || '') ||
      typeof objective!=='string' || !objective.trim() || !Array.isArray(permissions) || !permissions.length ||
      !Array.isArray(scope) || !scope.length || !Array.isArray(criteria) || !criteria.length ||
      !Array.isArray(changes) || !Array.isArray(evidence) ||
      [permissions,scope,criteria,changes,evidence].some(items=>items.some(value=>typeof value!=='string' || !value.trim()))) {
    throw Object.assign(new Error('differential-mandate-invalid'),{code:'differential-mandate-invalid'});
  }
  return {protocol:'cab-differential-v1',checkpoint:{id:checkpointId,sha256:checkpointDigest},
    objective,permissions:[...permissions],scope:[...scope],criteria:[...criteria],changes:[...changes],evidence:[...evidence]};
}
