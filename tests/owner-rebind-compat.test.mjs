import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyFrozenOwnerRebind,VERSION} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-cleanup.mjs';
import {canonicalContinuityDigest} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-continuity.mjs';

const now=Date.parse('2026-11-08T12:00:00Z');
function fixture(){
 const value={phase:'FREEZING',brokerTransport:'owner-local-v1',brokerPid:111,
  scope:{closureAuthority:'authoritative-retired-run-batch-v1',runIds:['target'],protectedRunIds:['peer']},
  nativeIdentity:{pid:10,version:'2.2.5'},ownerReceipts:{prepare:{state:'PREPARED',uid:1000,pid:111,instanceId:'old'},
    commit:{state:'APPLIED',uid:1000,pid:222,instanceId:'new'}}};
 const evidence={status:{brokerReadiness:{ready:true,server_version:VERSION,broker_process:{pid:222},instance_id:'new',checked_at:new Date(now).toISOString()}},
  nativeIdentity:{pid:10,version:'2.2.5'},oldPidAbsent:true,now};
 value.ownerReceipts.prepare.scopeDigest=canonicalContinuityDigest(value.scope);value.ownerReceipts.commit.scopeDigest=value.ownerReceipts.prepare.scopeDigest;
 return {value,evidence};
}
test('reprise owner : preuve cohérente et PID changé',()=>{const {value,evidence}=fixture();assert.equal(verifyFrozenOwnerRebind(value,evidence).brokerPid,222);});
for(const [name,mutate] of [
 ['ancien PID vivant',(_v,e)=>{e.oldPidAbsent=false;}],['UID différent',(v)=>{v.ownerReceipts.commit.uid=1001;}],
 ['commit non attesté',(v)=>{delete v.ownerReceipts.commit;}],['autre portée',(v)=>{v.scope.closureAuthority='other';}],
 ['RUN pair non protégé',(v)=>{v.scope.protectedRunIds=[];}],['PID inchangé',(v)=>{v.ownerReceipts.commit.pid=111;}],
 ['broker périmé',(_v,e)=>{e.status.brokerReadiness.checked_at='2026-11-08T11:59:00Z';}],
 ['OpenCode changé',(_v,e)=>{e.nativeIdentity.pid=11;}],['version broker divergente',(_v,e)=>{e.status.brokerReadiness.server_version='2.4.35';}],
])test('reprise owner : refus '+name,()=>{const {value,evidence}=fixture();mutate(value,evidence);assert.throws(()=>verifyFrozenOwnerRebind(value,evidence),/erasure-owner-rebind-proof-invalid/);});
