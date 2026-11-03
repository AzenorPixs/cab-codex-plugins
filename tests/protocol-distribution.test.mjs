import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const skill='plugins/cab-approval-bridge/skills/approval-bridge/';
const refs=resolve(root,skill,'references');
const read=path=>readFileSync(resolve(root,path),'utf8');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function migrationManifest() {
  const active='openspec/changes/track-background-shell-lifecycle/migration-coverage.json';
  if(existsSync(resolve(root,active)))return JSON.parse(read(active));
  const archives=readdirSync(resolve(root,'openspec/changes/archive'))
    .filter(name=>name.endsWith('-track-background-shell-lifecycle'));
  assert.equal(archives.length,1,'one archived migration proof must replace the active proof');
  return JSON.parse(read('openspec/changes/archive/'+archives[0]+'/migration-coverage.json'));
}

test('migration : tous les segments historiques ont une destination présente et vérifiée',()=>{
  const manifest=migrationManifest();
  assert.equal(manifest.version,'2.2.0');
  for(const [source,meta] of Object.entries(manifest.sources)) {
    assert.match(meta.sha256,/^[a-f0-9]{64}$/);assert.ok(meta.bytes>0);
    const entries=manifest.entries.filter(row=>row.source===source).sort((a,b)=>a.start-b.start);
    let next=1;
    for(const row of entries){assert.equal(row.start,next);assert.ok(row.end>=row.start);
      assert.match(row.sourceSha256,/^[a-f0-9]{64}$/);assert.ok(row.adaptation);
      assert.ok(existsSync(resolve(root,row.destination)),row.destination);next=row.end+1;}
    assert.equal(next,meta.lines+1,source);
  }
  for(const [file,hash] of Object.entries(manifest.files))assert.equal(digest(readFileSync(resolve(root,file))),hash,file);
});

test('routeurs : status charge sa branche et les détails restent accessibles par liens valides',()=>{
  const command=read('.codex/commands/CAB.md'),entry=read(skill+'SKILL.md');
  assert.ok(Buffer.byteLength(command)<4000);assert.ok(Buffer.byteLength(entry)<4000);
  assert.match(command,/status.*status --run <run_id>/);
  assert.match(command,/references\/command-status\.md/);
  assert.doesNotMatch(command,/POST \/runs\/|systemctl|evaluate\.py/);
  assert.doesNotMatch(entry,/28 800|5 400|phase: "prepare"/);
  for(const file of ['SKILL.md','references/protocol-index.md',...readdirSync(refs)
    .filter(name=>/^(protocol|technical|command)-.*\.md$/.test(name)).map(name=>'references/'+name)]) {
    const source=read(skill+file);
    for(const [,target] of source.matchAll(/\]\(([^)]+)\)/g)){
      if(target.includes('://')||target.startsWith('#'))continue;
      const path=resolve(root,skill,dirname(file),target.split('#')[0]);
      assert.ok(existsSync(path),file+' -> '+target);
    }
  }
  const status=read(skill+'references/command-status.md');
  assert.doesNotMatch(status,/^\s*(?:POST|PATCH|DELETE|systemctl)\s/m);
  assert.ok(Buffer.byteLength(command)+Buffer.byteLength(status)<10000);
});

test('contrat : AGENTS consommateur garde des règles agnostiques et résout le protocole sans fichier imposé',()=>{
  const agents=read('AGENTS.md');
  assert.match(agents,/La propagation des règles générales vers un projet consommateur/);
  assert.doesNotMatch(agents,/Le projet `[^`]+` est le référentiel de ces règles générales/);
  assert.match(agents,/Pour une session pilotée via CAB/);
  assert.match(agents,/Une session de codage directe ne nécessite aucun protocole de pilotage/);
  assert.match(agents,/contrat CAB distribué/);
  assert.match(agents,/les travaux indépendants et\ndéjà autorisés peuvent continuer/i);
  assert.match(read(skill+'references/protocol-core.md'),/aucun fichier local/i);
  assert.match(read(skill+'references/recovery-policy.md'),/ne crée aucune autorisation métier/);
  assert.match(read(skill+'references/shell-background.md'),/ne devient pas rétroactivement/);
});

test('monitoring : version attendue résolue depuis le paquet et non figée dans le bootstrap',()=>{
  const reference=read(skill+'references/monitor-service.md');
  assert.match(reference,/<plugin>\/\.codex-plugin\/plugin\.json/);
  assert.match(reference,/retirer le suffixe/);
  for(const name of ['monitor-service','command-start','technical-startup']){
    const body=read(skill+'references/'+name+'.md');
    assert.doesNotMatch(body,/GET \/api\/identity[^\n]*version 2\.1\.81/);
    assert.doesNotMatch(body,/annoncer version 2\.1\.81/);
  }
  assert.match(read(skill+'references/command-update.md'),/sans arrêt ni redémarrage/);
});
