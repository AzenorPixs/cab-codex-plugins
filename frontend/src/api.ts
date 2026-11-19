let csrf=''
let csrfBootstrap:Promise<Record<string,unknown>>|undefined
function csrfCookie(){return document.cookie.split(';').map(part=>part.trim()).find(part=>part.startsWith('csrftoken='))?.slice('csrftoken='.length)||''}
async function bootstrapCSRF(){
  if(!csrfBootstrap)csrfBootstrap=fetch('/api/v1/health',{credentials:'same-origin'}).then(async response=>{if(!response.ok)throw new Error('Le serveur CAB est temporairement indisponible.');const value=await response.json();if(typeof value.csrf_token!=='string')throw new Error('Le jeton CSRF de CAB est indisponible.');csrf=value.csrf_token;return value as Record<string,unknown>}).finally(()=>{csrfBootstrap=undefined})
  return csrfBootstrap
}
const messages:Record<string,string>={
  'incident-not-found':'Cette déclaration ne figure plus dans le registre de ce projet.',
  'incident-unresolved':'La déclaration doit être résolue avant de pouvoir être supprimée.',
  'incident-snapshot-stale':'La déclaration a changé. Fermez la fenêtre et vérifiez son état avant de recommencer.',
  'session-archives-page-invalid':'Le numéro de page des archives est invalide.',
  'git-commit-edit-unavailable':'Impossible de lire ou modifier les métadonnées de ce commit.',
  'git-commit-edit-invalid':'La demande d’édition du commit est invalide.',
  'git-commit-edit-changed':'La branche, le commit ou les tags ont changé. Fermez puis rouvrez l’éditeur.',
  'git-commit-edit-signed':'Cette édition invaliderait une signature de commit ou de tag ; CAB la refuse.',
  'git-commit-edit-encoding':'Ce commit utilise un encodage non pris en charge pour l’édition.',
  'git-commit-edit-author-invalid':'Renseignez un auteur et un courriel valides.',
  'git-commit-edit-date-invalid':'Renseignez une date complète avec son fuseau, par exemple 2026-11-18T17:00:00+01:00.',
  'git-commit-edit-message-invalid':'Le message du commit est invalide ou trop long.',
  'git-commit-edit-operation-active':'Une opération Git est en cours dans ce dépôt.',
  'git-commit-edit-request-conflict':'Cette demande a déjà été utilisée avec d’autres valeurs.',
  'git-commit-edit-uncertain':'Résultat incertain : vérifiez l’état Git avant toute nouvelle édition.',

  'project-configuration-fields-invalid':'Une variable ne peut pas être modifiée ici.',
  'project-configuration-value-invalid':'Une valeur du projet est invalide.',
  'project-configuration-id-invalid':'L’identifiant du projet est obligatoire.',
  'project-directory-unavailable':'Ce dossier ne peut pas être parcouru par le compte des projets.',
  'project-identifier-invalid':'Le projet ne possède pas d’identifiant valide.',
  'project-identifier-conflict':'L’identifiant de ce projet est déjà utilisé.',
  'project-path-invalid':'Le chemin doit désigner un dossier existant, absolu et sans lien symbolique.',
  'project-path-conflict':'Ce chemin est déjà associé à un autre projet.',
  'project-path-busy':'Le chemin ne peut pas être modifié pendant une session ou une opération active.',
  'project-path-different':'Le fichier project.env du nouveau chemin ne correspond pas à celui du projet.',
  'project-configuration-id-conflict':'Cet identifiant est déjà utilisé par un autre projet.',
  'project-configuration-changed':'Le fichier a changé. Fermez et rouvrez cette fenêtre avant de réessayer.',
  'project-configuration-file-invalid':'Le fichier de configuration contient une variable ambiguë ou non prise en charge.',
  'project-configuration-uncertain':'Résultat incertain : vérifiez le fichier avant toute nouvelle modification.',
  'project-git-tag-changed':'Le tag a changé depuis votre confirmation. Vérifiez-le et recommencez.',
  'project-git-tag-move-failed':'Le commit a été créé, mais le tag n’a pas pu être déplacé. Vérifiez l’état du dépôt.',
  'git-history-remove-invalid':'La sélection est invalide ou contient le dernier commit.',
  'git-history-remove-unavailable':'Impossible de réécrire cet historique. Aucun changement de branche n’a été effectué.',
  'git-history-remove-signed':'Un commit signé ou une fusion signée devrait être réécrit ; l’opération a été arrêtée.',
  'git-stage-preview-unavailable':'Impossible de lister précisément les fichiers à indexer.',
  'git-stage-preview-changed':'Les fichiers ont changé depuis l’aperçu. Fermez puis recommencez.',
  'git-stage-result-unknown':'L’indexation n’est pas confirmée. Vérifiez l’index avant de recommencer.',
  'git-commit-remove-unavailable':'Impossible de lire le dernier commit ou sa branche.',
  'git-commit-remove-operation-active':'Une opération Git est en cours. Terminez-la avant de retirer le commit.',
  'git-commit-remove-invalid':'La demande de retrait est invalide.',
  'git-commit-remove-changed':'Le dernier commit a changé. Fermez la fenêtre et recommencez.',
  'git-commit-remove-preview-unavailable':'Impossible de lister précisément les fichiers à restaurer.',
  'git-commit-remove-preview-changed':'Les fichiers ont changé depuis l’aperçu. Fermez puis recommencez.',
  'git-commit-remove-dirty':'Des modifications locales sont présentes. Enregistrez-les ou choisissez de conserver les modifications.',
  'git-commit-remove-partial':'Le commit a été retiré, mais la restauration ou l’actualisation a échoué. Vérifiez le dépôt avant toute reprise.',
  'git-commit-remove-uncertain':'Résultat incertain : vérifiez le dépôt avant de recommencer.',
  'git-tag-unavailable':'Le tag local est indisponible ou ne désigne plus le dernier commit.',
  'git-tag-invalid':'Le nom ou la description du tag est invalide.',
  'git-tag-exists':'Un tag porte déjà ce nom.',
  'git-tag-changed':'Le tag ou le commit a changé. Fermez la fenêtre et recommencez.',
  'git-tag-signed':'Ce tag est signé et ne peut pas être modifié depuis cette fenêtre.',
  'git-tag-uncertain':'Résultat incertain : vérifiez les tags locaux avant de recommencer.',
  'project-git-tag-invalid':'Le nom du tag est invalide.',
  'project-git-tag-exists':'Ce tag existe déjà : choisissez un autre nom.',
  'project-git-tag-create-failed':'Le commit a été créé, mais la création du tag a échoué.',
  'project-git-reservations-active':'Des fichiers sont réservés par une session de codage. Utilisez son parcours CAB ou attendez leur libération.',
  'version-without-prefix-required':'Saisissez une version sans préfixe « v ».',
  'version-tag-prefix-forbidden':'Un tag de version doit être écrit sans préfixe « v ».',
  'project-git-commit-input-invalid':'Le tag ou la description est invalide.',
  'project-git-identity-missing':'Renseignez le nom et l’adresse Git du projet avant le commit.',
  'project-git-commit-failed':'Le commit Git a échoué. Vérifiez l’état et les modifications indexées.',
  'project-git-commit-uncertain':'Résultat incertain : vérifiez l’historique Git avant de réessayer.',
  'forge-sync-refs-changed':'La branche ou les tags distants ont changé depuis l’aperçu. Fermez et recommencez.',
  'forge-sync-preview-unavailable':'Impossible de comparer la branche et les tags de cette forge.',
  'forge-push-unavailable':'La forge ou le projet est indisponible.',
  'forge-push-git-unavailable':'Le dépôt Git local est indisponible.',
  'forge-push-local-unavailable':'Impossible de lire la branche et le commit locaux.',
  'forge-push-configuration-missing':'Configurez la forge et son token dans CAB avant l’envoi.',
  'forge-push-credentials-invalid':'Le token de la forge est indisponible ou invalide.',
  'forge-push-preflight-unavailable':'Impossible de lire la branche distante avec les identifiants CAB.',
  'forge-push-configuration-changed':'La configuration de la forge a changé. Fermez et recommencez.',
  'forge-push-git-config-unsafe':'La configuration Git locale contient une règle de redirection ou d’identification incompatible avec cet envoi.',
  'forge-push-preview-invalid':'La préparation a expiré ou a déjà été utilisée. Fermez et recommencez.',
  'forge-push-head-changed':'Le commit local a changé. Fermez et préparez un nouvel envoi.',
  'forge-push-pending':'Un envoi précédent n’a pas de résultat confirmé. Vérifiez la forge avant toute reprise.',
  'forge-push-result-unknown':'Envoi non confirmé : vérifiez la branche distante avant toute reprise.',
  'forge-auth-diagnostic-failed':'La vérification d’authentification est temporairement indisponible.',
  'forge-file-changed':'La configuration a changé. Fermez et rouvrez la fenêtre avant de réessayer.',
  'forge-file-outcome-uncertain':'Résultat incertain. Vérifiez les fichiers avant toute nouvelle modification.',
  'forge-file-unavailable':'La configuration ou les fichiers de la forge sont inaccessibles.',
  'forge-tpm-unavailable':'Le TPM est indisponible : aucun token ne peut être chiffré.',
  'forge-owner-required':'Renseignez le propriétaire avant de modifier le token.',
  'forge-values-invalid':'Une valeur de configuration est invalide.',
  'forge-token-invalid':'Le token est invalide.',
  'agent-config-busy':'La vérification de cet utilisateur doit être terminée avant son retrait.',
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

export async function streamGitCommit<T>(path:string,body:unknown,onOutput:(text:string)=>void):Promise<T>{
  if(!csrfCookie()&&!csrf)await bootstrapCSRF()
  const response=await fetch('/api/v1/'+path,{credentials:'same-origin',method:'POST',headers:{'Content-Type':'application/json','X-CSRFToken':csrfCookie()||csrf},body:JSON.stringify(body)})
  if(!response.ok){let value:{error?:string}={};try{value=await response.json()}catch{}throw new Error(messages[value.error||'']||value.error||'Requête refusée')}
  if(!response.body)throw new Error('Suivi indisponible : vérifiez le résultat avant de réessayer.')
  const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',result:T|undefined,ended=false
  try{
    while(true){const chunk=await reader.read();pending+=decoder.decode(chunk.value,{stream:!chunk.done});const lines=pending.split('\n');pending=lines.pop()||''
      for(const line of lines){if(!line)continue;const event=JSON.parse(line) as {type:string;text?:string;result?:T;error?:string};if(event.type==='output')onOutput(event.text||'');else if(event.type==='result')result=event.result;else if(event.type==='error')throw new Error(messages[event.error||'']||event.error||'Le commit a échoué.');else if(event.type==='end')ended=true}
      if(chunk.done)break
    }
  }finally{reader.releaseLock()}
  if(!ended||result===undefined)throw new Error('Suivi interrompu : vérifiez le résultat avant de réessayer.')
  return result
}
