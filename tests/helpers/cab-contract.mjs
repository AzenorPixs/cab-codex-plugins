import { readFileSync as readRawFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root=new URL('../../',import.meta.url);
const refs=new URL('plugins/cab-approval-bridge/skills/approval-bridge/references/',root);
const protocol=['core','lifecycle','bootstrap','coordination','model','session','interfaces','cadences','recovery','compaction','closure'];
const commands=['overview','stats','pause','status','source','start','run','test','incidents','update','stop','native'];
const technical=['startup','mandates','recovery','native','lifecycle'];
const readRefs=names=>names.map(name=>readRawFileSync(new URL(name+'.md',refs),'utf8')).join('\n');

// Legacy assertions audit the resolved contract. Runtime entrypoints remain short
// and are tested separately; this helper is never shipped as agent instructions.
export function readContractFileSync(path,encoding='utf8') {
  const filename=path instanceof URL ? fileURLToPath(path) : String(path);
  const local=filename.replace(fileURLToPath(root),'');
  if(local==='cab-distributed-protocol')return readRefs(protocol.map(name=>'protocol-'+name));
  if(local==='.codex/commands/CAB.md')return readRawFileSync(path,encoding)+'\n'+
    readRefs(protocol.map(name=>'protocol-'+name))+'\n'+readRefs(commands.map(name=>'command-'+name));
  if(local==='plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md')return readRawFileSync(path,encoding)+'\n'+
    readRefs(protocol.map(name=>'protocol-'+name))+'\n'+readRefs(technical.map(name=>'technical-'+name));
  return readRawFileSync(path,encoding);
}
