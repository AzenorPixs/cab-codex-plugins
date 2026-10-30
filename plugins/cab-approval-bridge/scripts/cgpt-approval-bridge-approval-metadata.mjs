import { pathToFileURL } from 'node:url';
import { realpath } from 'node:fs/promises';
import { createOpenCodeV2ClientFromEnv } from './cgpt-approval-bridge-opencode-client.mjs';

export const VERSION = '2.1.15';
const fail = (code) => { throw Object.assign(new Error(code),{code}); };
const identity = (value) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(value) ? value : null;
const diagnostic = (value) => typeof value === 'string' && /^[A-Z0-9_:-]{1,80}$/.test(value) ? value : null;
const date = (value) => typeof value === 'string' && value.length <= 64 && Number.isFinite(Date.parse(value)) ? value : null;

export function projectApprovalMetadata(health, approvalId, evidence = {}) {
  if (!identity(approvalId)) fail('metadata-approval-id-invalid');
  const approvals = health?.pending_watchdog?.approvals;
  const item = Array.isArray(approvals) ? approvals.find((a)=>a?.approval_id===approvalId) : approvals?.[approvalId];
  const source = { session_id:identity(evidence.sessionId),part_id:identity(evidence.partId),
    observed_at:date(evidence.observedAt),tool:'broker_health',observation_is_current:false };
  if (!item || typeof item !== 'object') return {status:'NOT_IN_OBSERVATION',approval_id:approvalId,source};
  const metadata = { approval_id:approvalId,approval_status:'PENDING_FROM_WATCHDOG',
    requestId:identity(item.requestId),run_id:identity(item.run_id),session_id:identity(item.session_id),
    change_id:identity(item.change_id),operation_id:identity(item.operation_id),
    directory:typeof item.directory==='string' && item.directory.startsWith('/') && item.directory.length<=500 ? item.directory : null,
    state:diagnostic(item.state),notification_status:diagnostic(item.notification_status),
    age_seconds:Number.isFinite(item.age_seconds)&&item.age_seconds>=0?item.age_seconds:null,
    created_at:date(item.created_at),updated_at:date(item.updated_at) };
  return {status:'OBSERVED',metadata,source,
    broker:{version:typeof health.server?.version==='string'&&/^\d+\.\d+\.\d+$/.test(health.server.version)?health.server.version:null,
      pid:Number.isSafeInteger(health.server?.pid)?health.server.pid:null,instance_id:identity(health.instance?.instance_id)},
    attribution_complete:Boolean(metadata.run_id&&metadata.session_id&&metadata.directory&&metadata.change_id)};
}

export async function readApprovalMetadata({opencodeUrl,directory,sessionId,approvalId,partId,openCodeClient}) {
  let url;
  try { url=new URL(opencodeUrl); } catch { fail('metadata-url-invalid'); }
  if (url.protocol!=='http:' || !['127.0.0.1','localhost','[::1]'].includes(url.hostname) ||
      url.username||url.password||url.search||url.hash||url.pathname!=='/' ||
      typeof directory!=='string'||!directory.startsWith('/')||!identity(sessionId)||!identity(approvalId)||
      (partId!==undefined&&!identity(partId))) fail('metadata-context-invalid');
  const client=openCodeClient||createOpenCodeV2ClientFromEnv({baseUrl:url.origin,directory});
  const session=await client.session(sessionId,directory);
  if (session?.id!==sessionId||session.directory!==directory) fail('metadata-session-divergent');
  const messages=await client.messages(sessionId,directory);
  if (!Array.isArray(messages)) fail('metadata-messages-invalid');
  const parts=messages.flatMap((m)=>Array.isArray(m.parts)?m.parts:[]).filter((p)=>p.type==='tool'&&
    p.tool==='cgpt-validation_broker_health'&&p.state?.status==='completed'&&(!partId||p.id===partId));
  if (parts.length!==1) fail(parts.length?'metadata-observation-ambiguous':'metadata-observation-unavailable');
  let health;
  try { health=JSON.parse(parts[0].state.output); } catch { fail('metadata-observation-invalid'); }
  const time=parts[0].state.time?.end;
  return projectApprovalMetadata(health,approvalId,{sessionId,partId:parts[0].id,
    observedAt:Number.isFinite(time)?new Date(time).toISOString():undefined});
}

if (process.argv[1]&&import.meta.url===pathToFileURL(await realpath(process.argv[1])).href) {
  try {
    const keys={'--opencode-url':'opencodeUrl','--directory':'directory','--session-id':'sessionId','--approval-id':'approvalId','--part-id':'partId'},input={};
    for(let i=2;i<process.argv.length;i++) {
      const key=keys[process.argv[i]];
      if(!key||Object.hasOwn(input,key)||!process.argv[i+1])fail('metadata-arguments-invalid');
      input[key]=process.argv[++i];
    }
    const result=await readApprovalMetadata(input);process.stdout.write(JSON.stringify(result,null,2)+'\n');
    if(result.status!=='OBSERVED')process.exitCode=2;
  } catch(cause) {
    process.stderr.write(JSON.stringify({error:/^(metadata|maintenance)-/.test(cause.code||'')?cause.code:'metadata-unavailable'})+'\n');process.exitCode=1;
  }
}
