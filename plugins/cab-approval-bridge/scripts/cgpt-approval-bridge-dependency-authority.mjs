/** Dépendances de changes : référentiel OpenSpec, jamais historique des RUN. */
import {lstatSync,readdirSync,readFileSync,realpathSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
export const VERSION='2.5.3';
const fail=code=>{throw Object.assign(new Error(code),{code})};
function regular(path){const s=lstatSync(path);if(!s.isFile()||s.isSymbolicLink()||s.size>4*1024*1024)fail('dependency-openspec-source-unsafe');return readFileSync(path,'utf8');}
export function dependencyAuthority(project,changeId){
 if(typeof changeId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(changeId)||['.','..'].includes(changeId))fail('dependency-openspec-identity-invalid');
 const root=realpathSync(project),base=join(root,'openspec/changes'),archive=join(base,'archive');
 try{
  for(const p of [join(root,'openspec'),base,archive]){const s=lstatSync(p);if(!s.isDirectory()||s.isSymbolicLink())fail('dependency-openspec-source-unsafe');}
  regular(join(root,'openspec/config.yaml'));
  // An active dossier is never replaced by a same-named historical archive.
  try{lstatSync(join(base,changeId));fail('dependency-openspec-active')}catch(e){if(e.code!=='ENOENT')throw e;}
  const names=readdirSync(archive).filter(name=>/^\d{4}-\d{2}-\d{2}-/.test(name)&&name.slice(11)===changeId);
  if(names.length!==1)fail(names.length?'dependency-openspec-ambiguous':'dependency-openspec-missing');
  const folder=join(archive,names[0]);if(realpathSync(folder)!==resolve(folder)||!lstatSync(folder).isDirectory())fail('dependency-openspec-source-unsafe');
  const proposal=regular(join(folder,'proposal.md')),tasks=regular(join(folder,'tasks.md'));
  const checked=[...tasks.matchAll(/^\s*[-*]\s+\[([ xX])\]\s+/gm)];
  if(!checked.length||checked.some(row=>row[1]===' '))fail('dependency-openspec-incomplete');
  return {changeId,authority:'openspec',criterion:'archived-change-completed',path:'openspec/changes/archive/'+names[0],
   sha256:createHash('sha256').update(proposal+'\0'+tasks).digest('hex'),tasks:checked.length};
 }catch(error){if(error.code==='ENOENT')fail('dependency-openspec-missing');throw error;}
}
export function verifyDependencies(project,dependencies){return dependencies.map(change=>dependencyAuthority(project,change));}
