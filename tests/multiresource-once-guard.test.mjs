import test from 'node:test';
import assert from 'node:assert/strict';
import {shellPermissionMayReceiveOnce} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs';
test('une permission shell décomposée ne reçoit pas once',()=>{
 assert.equal(shellPermissionMayReceiveOnce({permission:'bash',metadata:{nativeShellResourceCount:3}}),false);
 assert.equal(shellPermissionMayReceiveOnce({permission:'bash',metadata:{nativeShellResourceCount:1}}),true);
 assert.equal(shellPermissionMayReceiveOnce({permission:'edit',metadata:{}}),true);
});
