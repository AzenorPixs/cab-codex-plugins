import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,symlinkSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {changeTestArea,classifyChangeAction,cleanTestArea} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-autonomy.mjs';
import {scopedNativeReadRules} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-permission-policy.mjs';
test('Lecture native bornée : shell/edit inchangés, exclusions et DENY précis conservés',()=>{
 const original=[{permission:'shell',pattern:'*',action:'ask'},{permission:'edit',pattern:'*',action:'ask'},
  {permission:'read',pattern:'*',action:'deny'},{permission:'read',pattern:'src/private.json',action:'deny'}];
 const rules=scopedNativeReadRules({permission:original},'/fixture',{paths:['src/**','README.md']});
 assert.deepEqual(rules.filter(rule=>rule.permission!=='read'),original.filter(rule=>rule.permission!=='read'));
 assert.equal(rules.at(-1).pattern,'src/private.json');
 assert.ok(rules.some(rule=>rule.permission==='read'&&rule.pattern==='project.env'&&rule.action==='deny'));
 assert.equal(rules.some(rule=>rule.action==='allow'&&!['src/**','README.md'].includes(rule.pattern)),false);
 assert.deepEqual(scopedNativeReadRules({permission:rules},'/fixture',{paths:['src/**','README.md']}),rules);
});
test('Ateliers isolés, validation hors atelier/web/tests, nettoyage après clôture',t=>{
 const root=mkdtempSync(join(tmpdir(),'cab-atelier-fixture-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 mkdirSync(join(root,'src'));const own=changeTestArea(root,'change','run-a'),peer=changeTestArea(root,'change','run-b');
 writeFileSync(join(own,'test.txt'),'fixture');writeFileSync(join(peer,'peer.txt'),'peer');
 const base={workspace:root,changeId:'change',runId:'run-a',scope:['src']};
 assert.equal(classifyChangeAction({...base,kind:'write',paths:[join(own,'new.py')]}).validation,'none');
 assert.equal(classifyChangeAction({...base,kind:'read',paths:['src/new.py']}).validation,'none');
 assert.equal(classifyChangeAction({...base,kind:'write',paths:['src/new.py']}).validation,'orchestrator');
 assert.equal(classifyChangeAction({...base,kind:'web'}).validation,'orchestrator');
 assert.equal(classifyChangeAction({...base,kind:'test-result'}).validation,'orchestrator');
 assert.equal(classifyChangeAction({...base,kind:'write',paths:[join(peer,'peer.txt')]}).reason,'peer-atelier-protected');
 assert.equal(classifyChangeAction({...base,kind:'execute',additionalResources:true}).validation,'developer');
 symlinkSync(join(root,'src'),join(own,'escape'));
 assert.equal(classifyChangeAction({...base,kind:'write',paths:[join(own,'escape/new.py')]}).validation,'orchestrator');
 symlinkSync(join(root,'src/not-created.py'),join(own,'dangling'));
 assert.throws(()=>classifyChangeAction({...base,kind:'write',paths:[join(own,'dangling')]}));
 assert.throws(()=>cleanTestArea(root,'change','run-a',{closed:false,reportsDurable:true}),/not-closed/);
 cleanTestArea(root,'change','run-a',{closed:true,reportsDurable:true});
 assert.equal(existsSync(own),false);assert.equal(existsSync(join(peer,'peer.txt')),true);assert.equal(existsSync(join(root,'.cab-tests')),true);
});
