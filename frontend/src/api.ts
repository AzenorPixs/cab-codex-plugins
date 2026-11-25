let csrf=''
let csrfBootstrap:Promise<Record<string,unknown>>|undefined
function csrfCookie(){return document.cookie.split(';').map(part=>part.trim()).find(part=>part.startsWith('csrftoken='))?.slice('csrftoken='.length)||''}
async function bootstrapCSRF(){
  if(!csrfBootstrap)csrfBootstrap=fetch('/api/v1/health',{credentials:'same-origin'}).then(async response=>{if(!response.ok)throw new Error('Le serveur CAB est temporairement indisponible.');const value=await response.json();if(typeof value.csrf_token!=='string')throw new Error('Le jeton CSRF de CAB est indisponible.');csrf=value.csrf_token;return value as Record<string,unknown>}).finally(()=>{csrfBootstrap=undefined})
  return csrfBootstrap
}
const messages:Record<string,string>={
  'session-terminal-web-admin-required':'L’ouverture du terminal requiert une session administrateur.',
  'session-terminal-owner-unavailable':'Le compte de l’atelier ne peut pas lancer le terminal.',
  'session-terminal-run-inactive':'Le terminal est disponible lorsque le RUN est actif.',
  'session-terminal-unavailable':'L’atelier n’a pas pu ouvrir le terminal.',
  'session-terminal-capacity':'Le nombre maximal de consoles ouvertes est atteint.',
  'session-terminal-not-found':'Le terminal a été fermé ou a expiré.',
  'session-terminal-closed':'Le terminal est fermé.',
  'session-terminal-close-pending':'La fermeture du terminal est en cours.',
  'session-terminal-input-invalid':'La saisie est vide ou trop longue.',
  'session-terminal-input-interrupted':'La saisie a été interrompue et le terminal va se fermer.',

  'agent-provider-name-invalid':'Saisir un nom de fournisseur valide.',
  'agent-provider-duplicate':'Ce fournisseur existe déjà.',
  'agent-provider-not-found':'Ce fournisseur est introuvable.',
  'agent-provider-keys-linked':'Supprimez les clés API liées avant de supprimer ce fournisseur.',
  'agent-model-policy-not-found':'Cette politique de modèles est introuvable.',
  'agent-model-policy-provider-invalid':'Un fournisseur sélectionné a été supprimé. Actualisez la liste des fournisseurs.',
  'agent-model-policy-filter-invalid':'Saisir un filtre valide de 2 048 caractères au maximum.',
  'agent-model-policy-name-invalid':'Saisir un nom de politique valide. Le nom Tous est réservé.',
  'agent-model-policy-duplicate':'Une politique porte déjà ce nom.',
  'agent-model-policy-slider-invalid':'Choisir un cran valide pour les seuils de tokens.',
  'agent-model-policy-bounds-invalid':'Un minimum de tarif doit être inférieur ou égal au maximum actif.',
  'agent-catalog-file-invalid':'Le fichier de catalogue est absent ou invalide.',
  'agent-catalog-source-unavailable':'Aucune URL de catalogue n’est configurée.',
  'agent-catalog-url-invalid':'Saisir une URL valide. La liste de modèles requiert une URL HTTPS publique.',
  'agent-catalog-format-invalid':'Le catalogue ne contient pas de liste de modèles valide.',
  'agent-catalog-unavailable':'La liste des modèles est indisponible.',
  'agent-api-key-invalid':'Saisir une clé API valide.',
  'agent-api-key-tpm-unavailable':'Le TPM est indisponible. La clé API n’a pas été enregistrée.',
  'agent-api-key-not-found':'Cette clé API est introuvable.',
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
  'project-languages-migration-conflict':'Les déclarations PROJECT_TYPE et PROJECT_LANGUAGES sont ambiguës ou différentes. Corrigez le fichier avant de réessayer.',
  'project-languages-migration-unconfirmed':'Le renommage de PROJECT_TYPE n’a pas pu être vérifié. Revérifiez le fichier avant de modifier le projet.',
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
  'project-git-unavailable':'Le dépôt Git local est indisponible.',
  'project-git-initialization-uncertain':'L’initialisation du dépôt local reste à vérifier.',
  'project-git-clean-unavailable':'CAB ne peut pas accéder au dépôt pour nettoyer les objets Git.',
  'project-git-clean-failed':'Git a échoué lors du nettoyage des objets déjà compactés.',
  'project-git-clean-status-unavailable':'Le nettoyage a été exécuté, mais la relecture du dépôt a échoué.',
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
  'forge-push-tag-conflict':'Un tag du même nom existe sur la forge avec un objet différent. Envoi refusé.',
  'forge-push-tags-changed':'Les tags du commit local ont changé. Préparez un nouvel envoi.',
  'forge-push-remote-changed':'La branche ou les tags distants ont changé. Préparez un nouvel envoi.',
  'forge-push-head-changed':'Le commit local a changé. Fermez et préparez un nouvel envoi.',
  'forge-push-pending':'Un envoi précédent n’a pas de résultat confirmé. Vérifiez la forge avant toute reprise.',
  'forge-push-result-unknown':'Envoi non confirmé : vérifiez la branche distante avant toute reprise.',
  'forge-push-transport-unknown':'Git n’a pas retourné un résultat complet pour les références envoyées.',
  'forge-push-atomic-unsupported':'La forge ne prend pas en charge l’envoi atomique de la branche et des tags.',
  'forge-push-remote-rejected':'La forge a refusé la mise à jour des références Git.',
  'forge-push-protected-branch':'La forge a refusé la mise à jour d’une branche protégée.',
  'forge-sync-gitlab-push-forbidden':'Le compte GitLab utilisé par CAB ne peut pas pousser sur la branche cible.',
  'forge-sync-gitlab-force-push-forbidden':'La tête Git locale ne prolonge pas la branche GitLab. Le remplacement exige un force push, interdit par les règles de cette branche.',
  'forge-push-protected-tag':'La forge a refusé la mise à jour d’un tag protégé.',
  'forge-reconcile-running':'Un envoi est encore en cours. La protection reste active.',
  'forge-reconcile-not-pending':'Aucun résultat incertain à vérifier. Fermez la fenêtre pour ouvrir un nouvel aperçu.',
  'forge-reconcile-ambiguous':'Plusieurs résultats sont incertains pour cette forge. La protection reste active.',
  'forge-reconcile-receipt-invalid':'Le reçu précédent est incomplet. La protection reste active.',
  'forge-reconcile-observation-unavailable':'Les références distantes sont indisponibles. La protection reste active.',
  'forge-reconcile-branch-diverged':'La branche distante diffère de la cible du reçu. La protection reste active.',
  'forge-reconcile-tags-diverged':'Les tags distants diffèrent de la cible du reçu. La protection reste active.',
  'forge-reconcile-receipt-changed':'Le reçu a changé pendant la vérification. Cette lecture ne lève aucune protection.',
  'forge-reconcile-observation-changed':'Les références ou le reçu ont changé. Vérifiez de nouveau avant de clore la tentative.',
  'forge-sync-local-dirty':'Le dépôt local contient des modifications non commitées. Enregistrez-les avant de synchroniser depuis la forge.',
  'forge-sync-local-operation-active':'Une opération Git locale est en cours. Terminez-la avant de synchroniser depuis la forge.',
  'forge-sync-remote-branch-missing':'La branche distante configurée est absente.',
  'forge-sync-local-unconfirmed':'La mise à jour du dépôt local n’a pas de résultat confirmé. Vérifiez les références avant toute reprise.',
  'forge-sync-local-fetch-failed':'Le téléchargement des références nécessaires à la synchronisation locale a échoué.',
  'forge-auth-diagnostic-failed':'La vérification d’authentification est temporairement indisponible.',
  'forge-file-changed':'La configuration a changé. Fermez et rouvrez la fenêtre avant de réessayer.',
  'forge-file-outcome-uncertain':'Résultat incertain. Vérifiez les fichiers avant toute nouvelle modification.',
  'forge-file-unavailable':'La configuration ou les fichiers de la forge sont inaccessibles.',
  'forge-tpm-unavailable':'Le TPM est indisponible : aucun token ne peut être chiffré.',
  'forge-owner-required':'Renseignez le propriétaire avant de modifier le token.',
  'forge-values-invalid':'Une valeur de configuration est invalide.',
  'forge-token-invalid':'Le token est invalide.',
  'artifact-build-active':'Une construction, une livraison ou une publication est en cours ou reste à vérifier.',
  'artifact-local-missing':'Aucun artefact local publiable n’a été trouvé.',
  'artifact-local-docker-version-missing':'L’image Docker locale ne porte pas le tag de la version du projet. Construisez cette version depuis la Fabrique.',
  'artifact-local-changed':'L’artefact local a changé ou n’est plus lisible.',
  'artifact-forge-unconfigured':'Le dépôt ou l’authentification de la forge est indisponible.',
  'artifact-forge-config-changed':'La configuration de la destination a changé depuis la demande.',
  'artifact-forge-tags-absent':'Le registre confirme l’absence du tag Docker de version et de latest. Une nouvelle publication est possible.',
  'artifact-forge-version-unpublished':'Le registre confirme que le tag Docker de la version est absent après l’échec.',
  'artifact-forge-tag-missing':'Le tag Git de la version est absent du dépôt distant.',
  'artifact-forge-registry-invalid':'Le registre Docker de la destination est absent, invalide ou non pris en charge.',
  'artifact-forge-registry-auth-failed':'Le registre Docker a refusé la connexion.',
  'artifact-github-packages-classic-token-required':'GitHub Packages exige un jeton d’accès personnel classique pour cette publication Docker.',
  'artifact-forge-registry-inventory-forbidden':'La forge a refusé la lecture des versions du registre. Vérifiez les droits du jeton et l’accès du compte au paquet.',
  'artifact-forge-registry-inspect-failed':'Le registre Docker n’a pas permis de vérifier si le tag existe.',
  'artifact-forge-version-conflict':'Le registre contient déjà un artefact pour ce tag de version.',
  'artifact-forge-publication-failed':'La publication a échoué avant de pouvoir être confirmée.',
  'artifact-forge-publication-unconfirmed':'Le registre n’a pas confirmé la publication. Vérifiez son état avant toute reprise.',
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
export const apiErrorMessage=(code:string)=>messages[code]||code

export class ApiError extends Error {
  constructor(readonly code:string,message:string,readonly details?:unknown){super(message)}
}

export async function api<T>(path:string,body?:unknown,headers:Record<string,string>={},keepalive=false):Promise<T>{
  // Une seule première requête établit le cookie avant les GET concurrents.
  if(!csrfCookie()&&!csrf){const initial=await bootstrapCSRF();if(path==='health'&&body===undefined)return initial as T}
  const response=await fetch('/api/v1/'+path,{credentials:'same-origin',keepalive,method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-CSRFToken':csrfCookie()||csrf,...headers},body:body===undefined?undefined:JSON.stringify(body)})
  let value
  try{value=await response.json()}catch{throw new Error('Le serveur CAB est temporairement indisponible.')}
  if(!response.ok){
    const code=typeof value?.error==='string'?value.error:''
    throw new ApiError(code,messages[code]||code||'Requête refusée ('+response.status+')',value?.details)
  }
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
