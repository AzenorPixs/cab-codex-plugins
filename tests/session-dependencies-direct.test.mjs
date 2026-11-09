import test from 'node:test';
import assert from 'node:assert/strict';
import {dependencySessionMode,registerDependencySession} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-direct.mjs';

test('un mode inconnu ne devient pas une session directe fictive', () => {
  assert.equal(dependencySessionMode('start','coder'),'direct');
  assert.equal(dependencySessionMode('track','orchestrator'),'piloted');
  assert.equal(dependencySessionMode('track','coder'),null);
});

test('la session directe et le pilote enregistrent leurs identités sans lancer OpenCode', async () => {
  const observed=[];
  const runner=async (command,args,options)=>{
    observed.push({command,args,options});
    return {stdout:JSON.stringify({status:'registered',native_notification:'unavailable'})};
  };
  for (const mode of ['direct','piloted']) {
    const result=await registerDependencySession({project:'/project path',run:'run1',session:'session1',mode},runner);
    assert.equal(result.status,'registered');
    assert.equal(result.native_notification,'unavailable');
    assert.equal(observed.at(-1).args.at(-1),mode);
    assert.ok(observed.at(-1).args.includes('/project path'));
  }
  assert.equal(observed.length,2);
  assert.ok(observed.every(row=>row.command==='python3' && row.options.timeout===5000));
});

test('une boîte indisponible est signalée sans exposer la sortie privée', async () => {
  const result=await registerDependencySession({project:'/project',run:'run1',session:'session1',mode:'direct'},
    async ()=>{throw new Error('private information');});
  assert.deepEqual(result,{status:'unavailable',reason:'direct-dependency-registration-unavailable'});
});

test('seul un démarrage explicite peut demander une réouverture vérifiée',async()=>{
  const calls=[];
  const runner=async (_command,args)=>{
    calls.push(args[2]);
    if(args[2]==='register')throw Object.assign(new Error('closed'),{stderr:JSON.stringify({error:'coordination-session-closed'})});
    return {stdout:JSON.stringify({status:'reopened',native_notification:'unavailable'})};
  };
  const base={project:'/project',run:'run1',session:'session1',mode:'direct'};
  assert.equal((await registerDependencySession({...base,reopen:true},runner)).status,'reopened');
  assert.deepEqual(calls,['register','reopen-direct']);calls.length=0;
  assert.equal((await registerDependencySession(base,runner)).status,'unavailable');
  assert.deepEqual(calls,['register']);
});
