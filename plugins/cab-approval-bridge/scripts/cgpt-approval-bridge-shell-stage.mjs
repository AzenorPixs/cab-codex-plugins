import {createHash,randomUUID} from 'node:crypto';
import {constants,openSync,closeSync,fstatSync,readFileSync,writeFileSync,fsyncSync,renameSync,unlinkSync} from 'node:fs';
import {dirname} from 'node:path';

export const VERSION = '2.1.26';
export const MAX_SHELL_PAYLOAD_BYTES = 65536;
const MAX_STAGES = 128, MAX_STORE_BYTES = 16*1024*1024;
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(value);
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = code => {throw Object.assign(new Error(code),{code,status:409});};
const quote = value => "'"+String(value).replaceAll("'","'\"'\"'")+"'";

export const SHELL_PAYLOAD_LOADER = `import http.client,hashlib,os,sys
try:
 c=http.client.HTTPConnection(sys.argv[1],int(sys.argv[2]),timeout=15)
 c.request('GET',sys.argv[3])
 r=c.getresponse()
 b=r.read(int(sys.argv[4])+1)
 c.close()
 if r.status!=200 or len(b)!=int(sys.argv[4]) or hashlib.sha256(b).hexdigest()!=sys.argv[5] or os.getcwd()!=os.path.realpath(sys.argv[6]): raise ValueError()
 payload=b.decode('utf-8')
 os.execv('/bin/bash',['bash','-c',payload])
except (OSError,ValueError,UnicodeError,http.client.HTTPException):
 print('CAB_SHELL_PAYLOAD_REFUSED',file=sys.stderr)
 raise SystemExit(125)
`;

export function shellPayloadDigest(payload) {
  if (typeof payload !== 'string' || !payload || payload.includes('\0')) fail('shell-stage-payload-invalid');
  const bytes=Buffer.from(payload,'utf8');
  if (bytes.toString('utf8')!==payload || bytes.length>MAX_SHELL_PAYLOAD_BYTES) fail('shell-stage-payload-invalid');
  return hash(bytes);
}

export function shellPayloadLauncher({host,port,runId,stageId,bytes,sha256,directory}) {
  if (!['127.0.0.1','::1'].includes(host) || !Number.isInteger(port) || port<1 || port>65535 ||
      !id(runId) || !id(stageId) || !Number.isInteger(bytes) || bytes<1 || bytes>MAX_SHELL_PAYLOAD_BYTES ||
      !/^[a-f0-9]{64}$/.test(sha256) || typeof directory!=='string' || !directory.startsWith('/') || directory.includes('\0')) fail('shell-stage-launcher-invalid');
  return ['/usr/bin/python3','-I','-S','-c',quote(SHELL_PAYLOAD_LOADER),quote(host),String(port),
    quote(`/runs/${runId}/shell-stage/${stageId}/payload`),String(bytes),sha256,quote(directory)].join(' ');
}

function persist(path,data) {
  const bytes=Buffer.from(JSON.stringify(data));
  if(bytes.length>MAX_STORE_BYTES)fail('shell-stage-store-limit');
  const temporary=path+'.'+randomUUID()+'.tmp';let fd,created=false;
  try {
    fd=openSync(temporary,'wx',0o600);created=true;writeFileSync(fd,bytes);fsyncSync(fd);closeSync(fd);fd=undefined;
    renameSync(temporary,path);const directory=openSync(dirname(path),'r');try{fsyncSync(directory)}finally{closeSync(directory)}
  }finally{if(fd!==undefined)closeSync(fd);if(created)try{unlinkSync(temporary)}catch(cause){if(cause.code!=='ENOENT')throw cause}}
}

const inputKeys=['stageId','jobId','sessionId','reservationVersion','requestId','approvalId','operationId','payload','payloadSha256'];
function prepare(input,binding) {
  if(!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).length!==inputKeys.length || !inputKeys.every(k=>Object.hasOwn(input,k)) ||
     !inputKeys.filter(k=>!['reservationVersion','payload','payloadSha256'].includes(k)).every(k=>id(input[k])) ||
     !Number.isSafeInteger(input.reservationVersion) || input.reservationVersion<1 || shellPayloadDigest(input.payload)!==input.payloadSha256 ||
     !(typeof binding.contextId==='string' || Number.isSafeInteger(binding.contextId)) ||
     !Number.isSafeInteger(binding.opencodePid) || binding.opencodePid<1)fail('shell-stage-input-invalid');
  const bytes=Buffer.byteLength(input.payload),command=shellPayloadLauncher({...binding,stageId:input.stageId,bytes,sha256:input.payloadSha256});
  return {...Object.fromEntries(inputKeys.map(k=>[k,input[k]])),runId:binding.runId,contextId:binding.contextId,directory:binding.directory,
    host:binding.host,port:binding.port,opencodePid:binding.opencodePid,bytes,command};
}

export function assertShellDelivery(stage,{run,job,operation,decision,registered,access,restored,pid,host,port}) {
  if(!stage || !run || !job || !operation || !registered || !access || restored || pid!==stage.opencodePid || host!==stage.host || port!==stage.port ||
     run.state!=='RESERVED' || run.runId!==stage.runId || run.contextId!==stage.contextId || run.version!==stage.reservationVersion || run.suspension ||
     !job.armed || job.strictCommands!==true || job.jobId!==stage.jobId || job.sessionId!==stage.sessionId || job.directory!==stage.directory || job.recovery || job.modelTransition ||
     decision?.decision!=='approved' || decision.approval_id!==stage.approvalId || decision.requestId!==stage.requestId || decision.run_id!==stage.runId || decision.reservation_version!==stage.reservationVersion ||
     operation.kind!=='bash' || operation.target!==stage.command || operation.operationId!==stage.operationId || operation.sessionId!==stage.sessionId || operation.directory!==stage.directory || operation.runId!==stage.runId || operation.reservationVersion!==stage.reservationVersion || operation.operationDigest!==registered.operationDigest ||
     registered.operationId!==stage.operationId || registered.requestId!==stage.requestId || registered.runId!==stage.runId || registered.contextId!==stage.contextId ||
     registered.version!==stage.reservationVersion || registered.sessionId!==stage.sessionId || registered.state!=='EXECUTING' || registered.native?.onceAcknowledged!==true ||
     registered.native.kind!=='bash' || registered.native.targetDigest!==hash(JSON.stringify(['bash',stage.command])) || !registered.native.callId ||
     access.accessId!==registered.accessId || access.runId!==stage.runId || access.contextId!==stage.contextId || access.version!==stage.reservationVersion || access.state!=='EXECUTING' || !Array.isArray(access.operationIds) || !access.operationIds.includes(stage.operationId))fail('shell-stage-delivery-refused');
  return true;
}

export class ShellStageStore {
  constructor(path) {
    this.path=path;this.stages=new Map();let fd;
    try {
      fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
      const stat=fstatSync(fd);
      if(!stat.isFile() || stat.nlink!==1 || stat.uid!==process.getuid() || (stat.mode&0o077)!==0 || stat.size>MAX_STORE_BYTES)fail('shell-stage-store-unsafe');
      const data=JSON.parse(readFileSync(fd,'utf8'));
      if(data.schemaVersion!==1 || !Array.isArray(data.stages) || data.stages.length>MAX_STAGES)fail('shell-stage-store-invalid');
      for(const stage of data.stages){
        const restored=prepare(Object.fromEntries(inputKeys.map(k=>[k,stage[k]])),stage);
        if(JSON.stringify(stage)!==JSON.stringify(restored) || this.stages.has(stage.stageId))fail('shell-stage-store-invalid');
        this.stages.set(stage.stageId,restored);
      }
    }catch(cause){if(cause.code!=='ENOENT')throw cause}
    finally{if(fd!==undefined)closeSync(fd)}
  }
  create(input,binding) {
    const stage=prepare(input,binding);
    const previous=this.stages.get(stage.stageId);
    if(previous){if(JSON.stringify(previous)!==JSON.stringify(stage))fail('shell-stage-identity-divergent');return this.describe(stage.stageId)}
    if(this.stages.size>=MAX_STAGES)fail('shell-stage-store-limit');
    const next=new Map(this.stages);next.set(stage.stageId,stage);persist(this.path,{schemaVersion:1,stages:[...next.values()]});this.stages=next;
    return this.describe(stage.stageId);
  }
  preview(input,binding) {const stage=prepare(input,binding);delete stage.payload;return stage}
  review(operation,requestId) {
    const stage=[...this.stages.values()].find(s=>operation?.kind==='bash' && s.requestId===requestId &&
      s.runId===operation.runId && s.sessionId===operation.sessionId && s.directory===operation.directory &&
      s.reservationVersion===operation.reservationVersion && s.operationId===operation.operationId && s.command===operation.target);
    return stage?{transport:'sealed-bash-v1',stageId:stage.stageId,payloadSha256:stage.payloadSha256,bytes:stage.bytes,payload:stage.payload}:null;
  }
  get(stageId) {const stage=this.stages.get(stageId);return stage?{...stage}:null}
  describe(stageId) {const stage=this.get(stageId);if(!stage)fail('shell-stage-unknown');delete stage.payload;return stage}
}
