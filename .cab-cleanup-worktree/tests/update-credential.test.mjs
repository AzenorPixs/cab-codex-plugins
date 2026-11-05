import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, chmod, lstat, symlink, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { prepareUpdateCredential } from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update-credential.mjs';

async function fixture(t) {
  const root=await mkdtemp(join(tmpdir(),'cab-credential-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const home=join(root,'home'),workspace=join(root,'project');await mkdir(home);await mkdir(workspace);
  return {home,workspace,passwordEnvFile:join(workspace,'project.env'),target:join(home,'.config/cab-approval-bridge/opencode.password')};
}

test('source explicite : seule la variable littérale est consommée et le credential est privé', async t=>{
  const c=await fixture(t);
  await writeFile(c.passwordEnvFile,'OTHER=$(touch ignored-command)\nOPENCODE_PASSWORD="synthetic-test-value"\nANOTHER=ignored\n');
  assert.deepEqual(await prepareUpdateCredential(c),{status:'provisioned'});
  assert.equal(await readFile(c.target,'utf8'),'synthetic-test-value\n');
  const metadata=await lstat(c.target);assert.equal(metadata.mode&0o777,0o600);assert.equal(metadata.uid,process.getuid());
  assert.equal((await lstat(c.target)).isSymbolicLink(),false);
  assert.deepEqual(await prepareUpdateCredential(c),{status:'existing'});
});

test('credential existant : project.env absent ou sans variable ne devient pas obligatoire', async t=>{
  const c=await fixture(t);await mkdir(join(c.home,'.config/cab-approval-bridge'),{recursive:true,mode:0o700});
  await writeFile(c.target,'existing-synthetic\n',{mode:0o600});
  await writeFile(c.passwordEnvFile,'PROJECT_NAME=unrelated\n');
  assert.deepEqual(await prepareUpdateCredential({home:c.home,workspace:c.workspace}),{status:'existing'});
  await assert.rejects(prepareUpdateCredential(c),/source-ambiguous/);
  assert.equal(await readFile(c.target,'utf8'),'existing-synthetic\n');
});

for(const [name,value] of [
  ['doublon','OPENCODE_PASSWORD=first\nOPENCODE_PASSWORD=second\n'],
  ['absence','UNRELATED=value\n'],['vide','OPENCODE_PASSWORD=\n'],
  ['interpolation','OPENCODE_PASSWORD="${VALUE}"\n'],['commande','OPENCODE_PASSWORD=$(command)\n'],
  ['échappement','OPENCODE_PASSWORD="a\\nb"\n'],['guillemets','OPENCODE_PASSWORD="unterminated\n'],
  ['commentaire ambigu','OPENCODE_PASSWORD=value # comment\n'],['nul','OPENCODE_PASSWORD=a\0b\n'],
]) test('source refusée sans divulgation : '+name, async t=>{
  const c=await fixture(t);await writeFile(c.passwordEnvFile,value);
  await assert.rejects(prepareUpdateCredential(c),e=>{
    assert.match(e.code,/update-credential-/);assert.equal(e.message,e.code);return true;
  });
  await assert.rejects(lstat(c.target),{code:'ENOENT'});
});

test('conflit : aucun remplacement d’un credential existant',async t=>{
  const c=await fixture(t);await writeFile(c.passwordEnvFile,"OPENCODE_PASSWORD='first-synthetic'\n");
  await prepareUpdateCredential(c);await writeFile(c.passwordEnvFile,'OPENCODE_PASSWORD=second-synthetic\n');
  await assert.rejects(prepareUpdateCredential(c),/credential-conflict/);
  assert.equal(await readFile(c.target,'utf8'),'first-synthetic\n');
});

test('permissions, liens et chemins externes sont refusés',async t=>{
  const c=await fixture(t);await writeFile(c.passwordEnvFile,'OPENCODE_PASSWORD=synthetic\n');
  await assert.rejects(prepareUpdateCredential({...c,passwordEnvFile:join(c.home,'project.env')}),/source-refused/);
  await prepareUpdateCredential(c);await chmod(c.target,0o644);
  await assert.rejects(prepareUpdateCredential(c),/credential-unsafe/);
  await unlink(c.target);await symlink(c.passwordEnvFile,c.target);
  await assert.rejects(prepareUpdateCredential(c),/credential-unsafe/);
  await unlink(c.target);await unlink(c.passwordEnvFile);
  const outside=join(c.home,'outside');await writeFile(outside,'OPENCODE_PASSWORD=synthetic\n');await symlink(outside,c.passwordEnvFile);
  await assert.rejects(prepareUpdateCredential(c),/credential-unsafe/);
});

test('source du workspace des services : opt-in explicite et provisionnement idempotent',async t=>{
  const c=await fixture(t),serviceWorkspace=join(c.home,'service-project');await mkdir(serviceWorkspace);
  const input={...c,serviceWorkspace,passwordEnvFile:join(serviceWorkspace,'project.env')};
  await writeFile(input.passwordEnvFile,'export OPENCODE_PASSWORD=synthetic-concurrent\n');
  const results=[await prepareUpdateCredential(input),await prepareUpdateCredential(input)];
  assert.ok(results.every(r=>['existing','provisioned'].includes(r.status)));
  assert.equal(await readFile(c.target,'utf8'),'synthetic-concurrent\n');
});
