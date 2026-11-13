let csrf=''
let csrfBootstrap:Promise<Record<string,unknown>>|undefined
function csrfCookie(){return document.cookie.split(';').map(part=>part.trim()).find(part=>part.startsWith('csrftoken='))?.slice('csrftoken='.length)||''}
async function bootstrapCSRF(){
  if(!csrfBootstrap)csrfBootstrap=fetch('/api/v1/health',{credentials:'same-origin'}).then(async response=>{if(!response.ok)throw new Error('Le serveur CAB est temporairement indisponible.');const value=await response.json();if(typeof value.csrf_token!=='string')throw new Error('Le jeton CSRF de CAB est indisponible.');csrf=value.csrf_token;return value as Record<string,unknown>}).finally(()=>{csrfBootstrap=undefined})
  return csrfBootstrap
}
const messages:Record<string,string>={
  'configuration-revision-stale':'La configuration a changé depuis son chargement. Rechargez-la avant de réessayer.',
  'configuration-fields-invalid':'Un paramètre non modifiable a été fourni.',
  'configuration-log-level-invalid':'Le niveau de journalisation est invalide.',
  'configuration-port-invalid':'Les ports doivent être compris entre 1024 et 65535.',
  'configuration-value-invalid':'Une valeur de configuration est invalide.',
  'administrator-required':'Un compte administrateur CAB est nécessaire.',
  'authentication-required':'Connectez-vous à votre compte CAB.',
  'projects-settings-required':'Renseignez le chemin, le compte POSIX et le groupe POSIX dans Administration.',
  'projects-root-invalid':'Le chemin des projets doit être absolu et désigner un dossier existant sans lien symbolique.',
  'projects-user-not-found':'Ce compte POSIX n’existe pas sur la machine.',
  'projects-group-not-found':'Ce groupe POSIX n’existe pas sur la machine.',
  'projects-root-not-accessible':'Le compte POSIX ne peut pas traverser le dossier racine ou un de ses parents. Vérifiez ses droits d’accès.',
  'project-name-invalid':'Le nom du projet doit contenir entre 1 et 120 caractères.',
  'project-folder-invalid':'Le nom du dossier doit utiliser des lettres, chiffres, tirets, points ou traits de soulignement, sans chemin.',
  'project-already-exists':'Un projet utilise déjà ce dossier. Sélectionnez-le dans la liste ou choisissez un autre dossier.',
  'project-folder-exists':'Ce dossier existe déjà. Aucun contenu existant n’a été modifié.',
  'project-directory-creation-failed':'Le dossier n’a pas pu être créé. Vérifiez le chemin et les droits configurés.',
  'project-creation-needs-reconciliation':'Cette création nécessite une vérification avant d’être reprise. Aucun dossier ne sera recréé automatiquement.',
}
export async function api<T>(path:string,body?:unknown,headers:Record<string,string>={}):Promise<T>{
  // Une seule première requête établit le cookie avant les GET concurrents.
  if(!csrfCookie()&&!csrf){const initial=await bootstrapCSRF();if(path==='health'&&body===undefined)return initial as T}
  const response=await fetch('/api/v1/'+path,{credentials:'same-origin',method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-CSRFToken':csrfCookie()||csrf,...headers},body:body===undefined?undefined:JSON.stringify(body)})
  let value
  try{value=await response.json()}catch{throw new Error('Le serveur CAB est temporairement indisponible.')}
  if(!response.ok)throw new Error(messages[value.error]||value.error||'Requête refusée ('+response.status+')')
  if(typeof value.csrf_token==='string')csrf=value.csrf_token
  if(path==='login'||path==='logout')window.dispatchEvent(new Event('cab-auth-changed'))
  return value as T
}
