import { createHash } from 'node:crypto';
import { validCodingModel, validModelSelection, VERSION as MODEL_VERSION } from './cgpt-approval-bridge-model-policy.mjs';
export const VERSION = '2.1.28';
if (MODEL_VERSION !== VERSION) throw new Error('CAB model transition component version mismatch');
export const MODEL_TRANSITION_PROTOCOL = 'model-transition-v1';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(value);
const ref = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 300;
const stamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const copy = value => structuredClone(value);
const canonical = value => JSON.stringify((function sort(v) { return Array.isArray(v) ? v.map(sort) : record(v)
  ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])) : v; })(value));
export const modelContractHash = model => createHash('sha256').update(canonical(model ?? null)).digest('hex');
const selectionHash = model => modelContractHash(Object.fromEntries(['providerID','modelID','reasoning','source','mode','priority','catalogDigest','evaluatedAt','logicalProviderID']
  .filter(k=>model[k]!==undefined).map(k=>[k,model[k]])));
const fail = code => { throw Object.assign(new Error(code), { code }); };
const nativeModel = model => model == null || record(model) && typeof model.providerID === 'string' && typeof model.modelID === 'string' &&
  (model.variant === undefined || typeof model.variant === 'string');
const matches = (native, target) => record(native) && nativeModel(native) && native.providerID === target.providerID && native.modelID === target.modelID && native.variant === target.reasoning;
const proofRef = value => ({ sessionId: value?.sessionId, messageId: value?.messageId });
const validConnection = value => value === null || record(value) &&
  Object.keys(value).every(k=>['providerID','integrationID','credentialId','serverPid','type','method'].includes(k)) &&
  id(value.providerID) && (value.integrationID===null||id(value.integrationID)) &&
  (value.credentialId===null||id(value.credentialId)) && Number.isSafeInteger(value.serverPid) && value.serverPid>0 &&
  ['credential','env','none','unmanaged'].includes(value.type) && (value.method===null||id(value.method));
const inputValid = input => record(input) && Object.keys(input).every(k=>['model','reasoning','providerMaxBytes','unavailablePreflights'].includes(k)) &&
  (input.model === undefined || typeof input.model === 'string' && input.model.length <= 500) &&
  (input.reasoning === undefined || id(input.reasoning)) &&
  (input.providerMaxBytes === undefined || Number.isSafeInteger(input.providerMaxBytes) && input.providerMaxBytes > 0) &&
  (input.unavailablePreflights === undefined || Array.isArray(input.unavailablePreflights) && input.unavailablePreflights.length <= 12 &&
    input.unavailablePreflights.every(p=>record(p)&&Object.keys(p).length===2&&id(p.sessionId)&&id(p.messageId)));
export function validModelTransitionState(job) {
  const pending = job?.modelTransition;
  if (pending !== undefined && pending !== null) {
    if (!record(pending) || pending.protocol !== MODEL_TRANSITION_PROTOCOL || !id(pending.transactionId) ||
        Object.keys(pending).some(k=>!['protocol','transactionId','developerAuthorization','jobId','sessionId','runVersion','contextId','preparedAt',
          'phase','expectedModelHash','before','selection','candidate','verifiedModel','previousNativeModel','retryAuthorizations','connection'].includes(k)) ||
        !ref(pending.developerAuthorization) || pending.jobId !== job.jobId || pending.sessionId !== job.sessionId ||
        !['PREPARED','APPLYING','NATIVE_UNCONFIRMED'].includes(pending.phase) || !stamp(pending.preparedAt) ||
        !/^[a-f0-9]{64}$/.test(pending.expectedModelHash || '') || !inputValid(pending.selection) ||
        !validModelSelection(pending.candidate) || !validConnection(pending.connection) || Object.hasOwn(pending.candidate,'preflight') ||
        (pending.before !== null && !validCodingModel(pending.before)) ||
        modelContractHash(pending.before) !== pending.expectedModelHash || modelContractHash(job.codingModel) !== pending.expectedModelHash ||
        !Number.isSafeInteger(pending.runVersion) || pending.runVersion < 1) return false;
    if (pending.phase !== 'PREPARED' && (!validCodingModel(pending.verifiedModel) ||
        !Object.hasOwn(pending,'previousNativeModel') || !nativeModel(pending.previousNativeModel))) return false;
  }
  if (job?.modelTransitionHistory !== undefined && (!Array.isArray(job.modelTransitionHistory) ||
      job.modelTransitionHistory.some(h=>!record(h) || h.protocol!==MODEL_TRANSITION_PROTOCOL || !id(h.transactionId) ||
        Object.keys(h).some(k=>!['protocol','transactionId','developerAuthorization','preparedAt','completedAt','outcome','before','after','retryAuthorizations','reconciled','connection'].includes(k)) ||
        !validConnection(h.connection) ||
        !ref(h.developerAuthorization) || !stamp(h.preparedAt) || !stamp(h.completedAt) ||
        !['applied','cancelled'].includes(h.outcome) || h.before!==null&&!validCodingModel(h.before) ||
        h.after!==null&&!validCodingModel(h.after)))) return false;
  const history=job?.modelTransitionHistory||[];
  if (new Set(history.map(h=>h.transactionId)).size!==history.length || history.some((h,i)=>i>0&&
      modelContractHash(h.before)!==modelContractHash(history[i-1].after)) || history.length&&
      modelContractHash(history.at(-1).after)!==modelContractHash(job.codingModel)) return false;
  return true;
}

export function createModelTransition({ getJob, setJob, persist, assertBoundary, client, resolveSelection, proveSelection,
  observeConnection = async () => null,
  now = () => new Date().toISOString() }) {
  let inFlight = false;
  const write = async candidate => { await persist(candidate); setJob(candidate); };
  const guard = async (payload, pending = null, checkConnection = true) => {
    const job = getJob();
    if (!job?.armed || job.recovery || job.jobId !== payload.jobId || job.sessionId !== payload.sessionId) fail('model-transition-job-divergent');
    const run = await assertBoundary();
    if (!run || run.state !== 'RESERVED' || run.suspension?.action !== 'PAUSE') fail('model-transition-pause-required');
    if (payload.runVersion !== run.version || pending && (pending.runVersion !== run.version || pending.contextId !== (run.contextId ?? null))) fail('model-transition-context-divergent');
    if (pending && modelContractHash(job.codingModel) !== pending.expectedModelHash) fail('model-transition-choice-divergent');
    if (pending && checkConnection && canonical(await observeConnection(pending.candidate,pending.selection)) !== canonical(pending.connection)) fail('model-transition-provider-changed');
    const [session,busy,permissions] = await Promise.all([client.session(job.sessionId,job.directory),client.activeSessions(),
      client.permissions(job.directory,{sessionIds:[job.sessionId]})]);
    if (session.id!==job.sessionId || session.directory!==job.directory || busy[job.sessionId] || permissions.length || !nativeModel(session.model)) fail('model-transition-native-not-quiescent');
    return { job, run, session };
  };
  const complete = async (pending, selected, reconciled) => {
    const job = getJob();
    const entry = { protocol: MODEL_TRANSITION_PROTOCOL, transactionId: pending.transactionId,
      developerAuthorization: pending.developerAuthorization, preparedAt: pending.preparedAt, completedAt: now(),
      outcome: 'applied', before: pending.before, after: copy(selected),
      connection: pending.connection,
      ...(pending.retryAuthorizations ? { retryAuthorizations: pending.retryAuthorizations } : {}), reconciled };
    await write({ ...job, codingModel: copy(selected), modelTransition: null,
      modelTransitionHistory: [...(job.modelTransitionHistory || []),entry] });
    return { status: 'completed', transactionId: pending.transactionId, modelContractHash: modelContractHash(selected), codingModel: copy(selected),
      historicalContinuity: 'not-verified', requiresHistoricalContinuityCheck: true };
  };
  return {
    get inFlight() { return inFlight; },
    async handle(payload) {
      if (inFlight) fail('model-transition-in-flight');
      if (!record(payload) || !['prepare','commit','cancel','reconcile','retry'].includes(payload.phase) ||
          !id(payload.transactionId) || !id(payload.jobId) || !id(payload.sessionId) || !ref(payload.developerAuthorization) ||
          !Number.isSafeInteger(payload.runVersion) || Object.keys(payload).some(k=>
            !['phase','transactionId','jobId','sessionId','developerAuthorization','runVersion','expectedModelHash','selection','preflight','retryAuthorization'].includes(k))) fail('model-transition-input-invalid');
      const extra = { prepare: ['expectedModelHash','selection'], commit: ['preflight'], cancel: [], reconcile: [], retry: ['retryAuthorization'] }[payload.phase];
      if (Object.keys(payload).some(k=>!['phase','transactionId','jobId','sessionId','developerAuthorization','runVersion',...extra].includes(k)) ||
          payload.phase==='prepare' && payload.selection!==undefined && !inputValid(payload.selection)) fail('model-transition-input-invalid');
      inFlight = true;
      try {
        const initial = getJob();const pending = initial?.modelTransition;
        const previous = initial?.modelTransitionHistory?.find(h=>h.transactionId===payload.transactionId);
        if (!pending && previous) {
          if (initial.jobId!==payload.jobId || initial.sessionId!==payload.sessionId || previous.developerAuthorization!==payload.developerAuthorization ||
              !['commit','reconcile'].includes(payload.phase) || previous.outcome!=='applied') fail('model-transition-identity-reused');
          if (modelContractHash(initial.codingModel)!==modelContractHash(previous.after)) fail('model-transition-choice-divergent');
          return { status:'completed',transactionId:payload.transactionId,modelContractHash:modelContractHash(initial.codingModel),codingModel:copy(initial.codingModel),
            historicalContinuity:'not-verified',requiresHistoricalContinuityCheck:true };
        }
        if (payload.phase==='prepare') {
          if (pending) {
            if (pending.phase!=='PREPARED') fail('model-transition-reconcile-required');
            if (pending.transactionId===payload.transactionId && pending.developerAuthorization===payload.developerAuthorization &&
                pending.expectedModelHash===payload.expectedModelHash && canonical(pending.selection)===canonical(payload.selection??{})) {
              await guard(payload,pending);return { status:'prepared',transition:copy(pending) };
            }
            fail('model-transition-pending');
          }
          const {job,run}=await guard(payload);
          if (payload.expectedModelHash!==modelContractHash(job.codingModel) || !inputValid(payload.selection??{})) fail('model-transition-choice-divergent');
          const selection=copy(payload.selection??{});const candidate=await resolveSelection(selection);
          if (!validModelSelection(candidate) || Object.hasOwn(candidate,'preflight')) fail('model-transition-selection-invalid');
          const connection=await observeConnection(candidate,selection);
          if (!validConnection(connection)) fail('model-transition-provider-unavailable');
          await guard(payload);
          const transition={protocol:MODEL_TRANSITION_PROTOCOL,transactionId:payload.transactionId,developerAuthorization:payload.developerAuthorization,
            jobId:job.jobId,sessionId:job.sessionId,runVersion:run.version,contextId:run.contextId??null,preparedAt:now(),phase:'PREPARED',
            expectedModelHash:payload.expectedModelHash,before:copy(job.codingModel??null),selection,candidate:copy(candidate),connection};
          await write({...getJob(),modelTransition:transition});return {status:'prepared',transition:copy(transition)};
        }
        if (!pending || pending.transactionId!==payload.transactionId || pending.developerAuthorization!==payload.developerAuthorization) fail('model-transition-not-prepared');
        const {job,session}=await guard(payload,pending,payload.phase!=='cancel');
        if (payload.phase==='cancel') {
          if (pending.phase!=='PREPARED') fail('model-transition-effect-possible');
          const entry={protocol:MODEL_TRANSITION_PROTOCOL,transactionId:pending.transactionId,developerAuthorization:pending.developerAuthorization,
            preparedAt:pending.preparedAt,completedAt:now(),outcome:'cancelled',before:pending.before,after:copy(job.codingModel??null),connection:pending.connection};
          await write({...job,modelTransition:null,modelTransitionHistory:[...(job.modelTransitionHistory||[]),entry]});return {status:'cancelled',transactionId:pending.transactionId};
        }
        if (payload.phase==='reconcile') {
          if (pending.phase==='PREPARED' || !matches(session.model,pending.verifiedModel)) fail('model-transition-native-unconfirmed');
          await proveSelection(pending.candidate,proofRef(pending.verifiedModel.preflight),pending.preparedAt);
          await guard(payload,pending);return complete(pending,pending.verifiedModel,true);
        }
        let selected,transition;
        if (pending.phase==='PREPARED') {
          if (payload.phase!=='commit') fail('model-transition-not-applying');
          const resolved=await resolveSelection(pending.selection);
          if (selectionHash(resolved)!==selectionHash(pending.candidate)) fail('model-transition-selection-changed');
          if (payload.preflight?.sessionId===job.sessionId || job.modelTransitionHistory?.some(h=>h.after?.preflight?.sessionId===payload.preflight?.sessionId &&
              h.after?.preflight?.messageId===payload.preflight?.messageId)) fail('model-transition-preflight-reused');
          selected=await proveSelection(resolved,payload.preflight,pending.preparedAt);
          if (!validCodingModel(selected) || selectionHash(selected)!==selectionHash(pending.candidate)) fail('model-transition-preflight-invalid');
          const observed=await guard(payload,pending);
          transition={...pending,phase:'APPLYING',verifiedModel:copy(selected),previousNativeModel:copy(observed.session.model??null)};
          await write({...getJob(),modelTransition:transition});
        } else {
          if (payload.phase!=='retry' || !ref(payload.retryAuthorization)) fail('model-transition-reconcile-required');
          if (payload.retryAuthorization===pending.developerAuthorization || pending.retryAuthorizations?.includes(payload.retryAuthorization)) fail('model-transition-retry-reused');
          if (!matches(session.model,pending.verifiedModel) && modelContractHash(session.model)!==modelContractHash(pending.previousNativeModel)) fail('model-transition-native-divergent');
          selected=pending.verifiedModel;await proveSelection(pending.candidate,proofRef(selected.preflight),pending.preparedAt);
          transition={...pending,phase:'APPLYING',retryAuthorizations:[...(pending.retryAuthorizations||[]),payload.retryAuthorization]};
          await write({...getJob(),modelTransition:transition});
        }
        try {
          const before=await guard(payload,transition);
          if (!matches(before.session.model,selected)) await client.switchModel(job.sessionId,
            {providerID:selected.providerID,modelID:selected.modelID,reasoning:selected.reasoning},job.directory);
          const after=await guard(payload,transition);
          if (!matches(after.session.model,selected)) fail('model-transition-native-unconfirmed');
          return await complete(transition,selected,false);
        } catch {
          const snapshot={...getJob(),modelTransition:{...transition,phase:'NATIVE_UNCONFIRMED'}};
          setJob(snapshot);
          try { await persist(snapshot); } catch { fail('model-transition-persistence-unconfirmed'); }
          fail('model-transition-native-unconfirmed');
        }
      } finally { inFlight=false; }
    },
  };
}
