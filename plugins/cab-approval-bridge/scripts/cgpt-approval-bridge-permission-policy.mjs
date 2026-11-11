export const VERSION = '2.5.8';

export function nativeAskState(session, kind) {
  if (!Array.isArray(session?.permission) || session.permission.some(rule =>
      !rule || typeof rule.permission !== 'string' || !rule.permission ||
      typeof rule.pattern !== 'string' || !['ask','allow','deny'].includes(rule.action))) {
    return {valid:false,action:null,universal:false,ruleIndex:null};
  }
  if (kind === 'bash' && session.permission.some(rule => rule.permission === 'shell')) kind = 'shell';
  const matches = pattern => new RegExp(`^${pattern.split('').map(character =>
    character === '*' ? '.*' : character === '?' ? '.' :
      character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("")}$`).test(kind);
  // Une règle finale globale ask couvre aussi les cibles spécifiques antérieures.
  const ruleIndex=session.permission.findLastIndex(rule=>matches(rule.permission));
  const last=session.permission[ruleIndex];
  return {valid:true,action:last?.action ?? null,universal:last?.pattern === '*',ruleIndex:ruleIndex < 0 ? null : ruleIndex};
}

export function hasNativeAsk(session,kind,actions=['ask']) {
  const state=nativeAskState(session,kind);
  return state.valid && state.universal && actions.includes(state.action);
}

export function nativeMcpPreflight(session) {
  return ['cgpt-validation_broker_readiness','cgpt-validation_request_validation'].map(tool => ({tool,...nativeAskState(session,tool)}));
}

export function scopedNativeReadRules(session,directory,{tools=['read'],paths=[]}={}) {
  if(typeof directory!=='string'||!directory.startsWith('/')||/[\n\r\0]/.test(directory)||directory.endsWith('/')||
    !Array.isArray(tools)||!tools.length||new Set(tools).size!==tools.length||tools.some(tool=>!['read','glob','grep'].includes(tool))||
    !Array.isArray(paths)||!paths.length||new Set(paths).size!==paths.length||
    paths.some(path=>typeof path!=='string'||!path||path.startsWith('/')||path.split('/').some(part=>part==='.'||part==='..')||
      /[\n\r\0*?\[\]{}]/.test(path.replace(/\/\*\*$/,'')))||
    !Array.isArray(session?.permission)||session.permission.some(rule=>!rule||typeof rule.permission!=='string'||typeof rule.pattern!=='string'||!['ask','allow','deny'].includes(rule.action)))throw new Error('native-read-policy-invalid');
  // OpenCode2.2.5 évalue ici des ressources relatives au workspace.
  const denied=['..','../*','/*','project.env','*.env','*.env.*','**/*.env','**/*.env.*','*.key','*.pem','*.p12','*.pfx','*.crt','*.cer','*.der',
    '**/credentials.json','**/credentials.yaml','**/secrets.json','**/secrets.yaml','credentials.json','credentials.yaml','secrets.json','secrets.yaml',
    'id_rsa','id_ed25519','**/id_rsa','**/id_ed25519','.git/*','.git/**','.opencode/state/*','.opencode/state/**','.opencode/share/*','.opencode/share/**',
    '.opencode/cache/*','.opencode/cache/**','.opencode/config/*','.opencode/config/**','node_modules/*','**/node_modules/*','env/*','env/**','.venv/*','.venv/**','venv/*','venv/**','logs/*','logs/**','tmp/*','tmp/**','.stignore'];
  const additions=tools.flatMap(permission=>[...paths.map(pattern=>({permission,pattern,action:'allow'})),
    ...denied.map(pattern=>({permission,pattern,action:'deny'}))]);
  const managed=new Set(additions.map(rule=>JSON.stringify(rule)));
  const retained=session.permission.filter(rule=>!managed.has(JSON.stringify(rule))).map(rule=>({...rule}));
  const specificDenials=retained.filter(rule=>tools.includes(rule.permission)&&rule.action==='deny'&&rule.pattern!=='*');
  const denialKeys=new Set(specificDenials.map(rule=>JSON.stringify(rule)));
  return [...retained.filter(rule=>!denialKeys.has(JSON.stringify(rule))),...additions,...specificDenials];
}
