/** Préparation calculatoire d'une unité neuve, sans admission ni autorisation. */
import {randomUUID} from 'node:crypto';
import {resolve,relative,isAbsolute} from 'node:path';
import {nativeToolInputDigest} from './cgpt-approval-bridge-opencode-client.mjs';
export const VERSION='2.6.0';
const fail=code=>{throw Object.assign(new Error(code),{code,status:400});};
export function prepareValidationData(run,input,resources,revisions) {
  if(!run||run.state!=='RESERVED'||input.run_id!==run.runId||input.reservation_version!==run.version||input.session_id!==run.sessionId||
    input.change_id!==run.changeId||input.directory!==run.directory)fail('validation-preparation-run-divergent');
  if(!['shell','write','edit'].includes(input.native_tool)||!input.native_input||typeof input.native_input!=='object'||Array.isArray(input.native_input)||
    typeof input.title!=='string'||!input.title.trim()||typeof input.summary!=='string'||!input.summary.trim())fail('validation-preparation-input-invalid');
  const files=[],commands=[];
  if(input.native_tool==='shell') {
    if(typeof input.native_input.command!=='string'||!input.native_input.command.trim())fail('validation-preparation-command-invalid');
    commands.push(input.native_input.command);
  }else {
    if(typeof input.native_input.path!=='string'||input.native_tool==='write'&&typeof input.native_input.content!=='string'||
      input.native_tool==='edit'&&(typeof input.native_input.oldString!=='string'||typeof input.native_input.newString!=='string'))fail('validation-preparation-file-invalid');
    const file=relative(run.directory,resolve(run.directory,input.native_input.path));
    if(!file||file==='..'||file.startsWith('../')||isAbsolute(file))fail('validation-preparation-file-outside-project');
    files.push(file);
  }
  const requestId=input.request_id||'req-'+randomUUID();
  if(!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(requestId))fail('validation-preparation-request-invalid');
  const suffix=nativeToolInputDigest({requestId,runId:run.runId}).slice(0,40),operationId='op-'+suffix;
  const validation={requestId,approval_id:'approval-'+suffix,run_id:run.runId,reservation_version:run.version,
    coordination_protocol:'resource-scoped-v1',operation_id:operationId,access_id:operationId,
    expected_revisions:revisions,resources,session_id:run.sessionId,directory:run.directory,change_id:run.changeId,
    files,commands,title:input.title,summary:input.summary,tool_input_sha256:nativeToolInputDigest(input.native_input)};
  validation.operation_digest=nativeToolInputDigest({protocol:'cab-unit-digest-v1',...validation});
  return {snapshot_only:true,authorization:false,admitted:false,preparedAt:new Date().toISOString(),
    revisionMapKind:'effective-per-exact-key',validation};
}
