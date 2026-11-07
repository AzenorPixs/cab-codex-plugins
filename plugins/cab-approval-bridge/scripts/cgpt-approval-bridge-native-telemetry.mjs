/** Projection quantitative OpenCode vers SGS, sans contenu de conversation. */
import { createHash } from 'node:crypto';
import { hostname } from 'node:os';
import { registerStatisticsBinding,registerStatisticsSource, flushStatistics } from './cgpt-approval-bridge-runtime-client.mjs';
export const VERSION = '2.4.10';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const count = value => Number.isSafeInteger(value) && value >= 0;

export function openCodeTelemetry(info, { binding, sequence, at,parts=[] } = {}) {
  if (!['assistant','user'].includes(info?.role) || typeof info.id !== 'string') return null;
  const metrics = {messages:'1',[info.role==='user'?'messages_user':'messages_assistant']:'1'}, tokens = info.usageSource==='opencode-v2'?info.tokens||{}:{};
  for (const [native, key] of [['input','tokens_input'],['output','tokens_output'],['reasoning','tokens_reasoning'],['total','tokens_total']]) {
    if (count(tokens[native])) metrics[key] = String(tokens[native]);
  }
  for (const [native, key] of [['read','tokens_cache_read'],['write','tokens_cache_write']]) {
    if (count(tokens.cache?.[native])) metrics[key] = String(tokens.cache[native]);
  }
  if (typeof info.cost === 'number' && Number.isFinite(info.cost) && info.cost >= 0) metrics.cost_usd = String(info.cost);
  const tools=parts.filter(part=>part?.type==='tool');
  metrics.tools=String(tools.length);metrics.commands=String(tools.filter(part=>['shell','bash'].includes(part.tool)).length);
  metrics.web=String(tools.filter(part=>['webfetch','websearch'].includes(part.tool)).length);
  if(count(info.time?.created)&&count(info.time?.completed)&&info.time.completed>=info.time.created)metrics.message_span_seconds=String((info.time.completed-info.time.created)/1000);
  const value = { binding, source:'opencode-native', stream:'message:'+info.id, sequence, at, semantics:'cumulative', metrics,
    ...(info.role==='assistant'?{model:{name:info.modelID??null,provider:info.providerID??null,reasoning:info.reasoningEffort??info.variant??null}}:{}),
    coverage:Object.fromEntries(Object.keys(metrics).map(key=>[key,'native'])) };
  return {...value,event_id:'oc-'+hash(value)};
}

export class NativeTelemetryPublisher {
  constructor(instance, options={}) { this.instance=instance;this.options=options;this.bindings=new Map();this.pending=0;this.error=null; }
  async binding(run,sessionId) {
    const binding='oc-'+hash([hostname(),this.instance,run.directory,run.changeId,run.runId,run.contextId,sessionId]);
    if(!this.bindings.has(binding)) this.bindings.set(binding,{binding,host:hostname(),instance:this.instance,project:run.directory,
      change:run.changeId,run:run.runId,session:sessionId,role:'coder',agent:'opencode',mode:'piloted',
      started_at:new Date(run.createdAt||run.reservedAt||Date.now()).toISOString()});
    const receipt=await registerStatisticsBinding(this.bindings.get(binding),this.options);
    if(receipt.status==='unavailable')throw new Error(receipt.reason);
    return {binding,defer:receipt.status==='queued'};
  }
  async observe(run,sessionId,infos) {
    if(!this.instance||!run?.changeId||!run.directory||this.pending>=32){this.error='sgs-native-publication-unavailable';return false;}
    this.pending++;
    try {
      const {binding,defer}=await this.binding(run,sessionId);
      const receipt=await registerStatisticsSource({binding,source:'opencode-native',location:sessionId},{...this.options,defer});
      if(receipt.status==='unavailable')throw new Error(receipt.reason);
      await flushStatistics({...this.options,limit:20});this.error=null;return true;
    }catch(error){this.error=error.status?error.message:'sgs-native-service-unavailable';return false;}
    finally{this.pending--;}
  }
}
